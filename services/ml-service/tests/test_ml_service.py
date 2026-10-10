import json
import pickle
import shutil
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app import main as ml_main
from app.main import ARTIFACTS, create_app
from app.model1 import Model1, ModelLoadError

TOKEN = "t0k3n"
H = {"X-Internal-Token": TOKEN}
GOLDEN = json.loads((ARTIFACTS / "golden.json").read_text())


@pytest.fixture()
def enabled():
    with TestClient(create_app(enable_model1=True, internal_token=TOKEN)) as c:
        yield c


@pytest.fixture()
def disabled():
    with TestClient(create_app(enable_model1=False, internal_token=TOKEN)) as c:
        yield c


def test_disabled_by_default_blocks_prediction_and_stays_ready(disabled):
    assert disabled.get("/health").json() == {"status": "UP"}
    assert disabled.get("/ready").json()["model1"] == "DISABLED"
    r = disabled.post("/internal/v1/model1/predict", headers=H, json=GOLDEN[0]["input"])
    assert r.status_code == 403 and r.json()["type"].endswith("model-disabled")
    assert disabled.get("/internal/v1/models", headers=H).json()[0]["enabled"] is False


def test_internal_token_required(enabled):
    assert enabled.post("/internal/v1/model1/predict", json=GOLDEN[0]["input"]).status_code == 401
    assert enabled.post("/internal/v1/model1/predict", headers={"X-Internal-Token": "x"}, json=GOLDEN[0]["input"]).status_code == 401


def test_golden_fixtures_reproduce_exactly(enabled):
    for g in GOLDEN:
        out = enabled.post("/internal/v1/model1/predict", headers=H, json=g["input"]).json()
        got = [{"crop": r["crop"], "score": r["modelScore"]} for r in out["results"]]
        assert [x["crop"] for x in got] == [x["crop"] for x in g["top3"]]
        for a, b in zip(got, g["top3"]):
            assert a["score"] == pytest.approx(b["score"], abs=1e-4)


def test_output_is_never_called_probability_and_has_shap_factors(enabled):
    out = enabled.post("/internal/v1/model1/predict", headers=H, json=GOLDEN[0]["input"]).json()
    assert "not a probability" in out["scoreNote"] and "probab" not in " ".join(out).lower().replace("not a probability", "")
    top = out["results"][0]
    assert top["factors"] and all(f["direction"] in ("supports", "limits") for f in top["factors"])
    assert out["modelVersion"] == "1.0.0" and out["kind"] == "MODEL1_EXPERIMENTAL"


def test_all_seven_required_no_imputation(enabled):
    body = dict(GOLDEN[0]["input"])
    del body["ph"]
    r = enabled.post("/internal/v1/model1/predict", headers=H, json=body)
    assert r.status_code == 422
    assert {e["field"] for e in r.json()["errors"]} == {"ph"}


def test_out_of_range_rejected(enabled):
    body = dict(GOLDEN[0]["input"], rainfall=2000)  # annual-normal-sized value must not reach the model
    r = enabled.post("/internal/v1/model1/predict", headers=H, json=body)
    assert r.status_code == 422 and "outside the range" in r.json()["errors"][0]["message"]


def test_tampered_artifact_fails_to_load(tmp_path):
    for f in ARTIFACTS.iterdir():
        shutil.copy(f, tmp_path / f.name)
    (tmp_path / "model.pkl").write_bytes(b"tampered")
    with pytest.raises(ModelLoadError, match="checksum"):
        Model1(tmp_path)


def test_degenerate_scaler_is_rejected(tmp_path):
    from sklearn.preprocessing import MinMaxScaler
    import hashlib

    for f in ARTIFACTS.iterdir():
        shutil.copy(f, tmp_path / f.name)
    bad = MinMaxScaler().fit(np.array([[10, 10, 10, 15, 80, 4.5, 10.0]]))
    (tmp_path / "scaler.pkl").write_bytes(pickle.dumps(bad))
    meta = json.loads((tmp_path / "METADATA.json").read_text())
    meta["files"]["scaler.pkl"] = hashlib.sha256((tmp_path / "scaler.pkl").read_bytes()).hexdigest()
    (tmp_path / "METADATA.json").write_text(json.dumps(meta))
    with pytest.raises(ModelLoadError, match="degenerate"):
        Model1(tmp_path)


def test_shap_additivity_holds_in_service(enabled):
    m: Model1 = enabled.app.state.model
    x = m.validate(GOLDEN[1]["input"])
    scaled = m.scaler.transform(x)
    sv = m._shap(scaled)
    proba = m.model.predict_proba(scaled)[0]
    base = np.asarray(m._explainer.expected_value)
    for c in range(proba.shape[0]):
        assert base[c] + sv[:, c].sum() == pytest.approx(proba[c], abs=1e-9)
