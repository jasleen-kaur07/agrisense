"""Validate Model 1 (unchanged) in a clean environment: gates G1-G5.

Run: ml/.venv/bin/python ml/model1/validate_model1.py

The artifacts are NOT modified. This script records evidence into
docs/ml/model1_validation.md and writes ml/model1/input_ranges.json and
ml/model1/golden.json (regression fixtures).

Everything reported here is *dataset-internal*: Model 1's dataset appears to be
synthetic/curated and its rainfall averaging period is unverified.
"""

from __future__ import annotations

import hashlib
import json
import pickle
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import shap
import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import StratifiedKFold, cross_val_predict, train_test_split
from sklearn.preprocessing import MinMaxScaler

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "ml" / "model1" / "artifacts" / "source"
DATA = ROOT / "data" / "raw" / "model1_crop_recommendation.csv"
DOCS = ROOT / "docs" / "ml"
FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]

# Copied verbatim from the team's utils/pred_crop.py (class id -> crop name)
CROP_DICT = {1: "Rice", 2: "Maize", 3: "Jute", 4: "Cotton", 5: "Coconut", 6: "Papaya", 7: "Orange",
             8: "Apple", 9: "Muskmelon", 10: "Watermelon", 11: "Grapes", 12: "Mango", 13: "Banana",
             14: "Pomegranate", 15: "Lentil", 16: "Blackgram", 17: "Mungbean", 18: "Mothbeans",
             19: "Pigeonpeas", 20: "Kidneybeans", 21: "Chickpea", 22: "Coffee"}


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def ece(proba: np.ndarray, y_idx: np.ndarray, bins: int = 10) -> float:
    conf, pred = proba.max(1), proba.argmax(1)
    correct = (pred == y_idx).astype(float)
    edges = np.linspace(0, 1, bins + 1)
    out = 0.0
    for lo, hi in zip(edges[:-1], edges[1:]):
        m = (conf > lo) & (conf <= hi)
        if m.any():
            out += m.mean() * abs(correct[m].mean() - conf[m].mean())
    return float(out)


def main() -> int:
    DOCS.mkdir(parents=True, exist_ok=True)
    res: dict = {"runtime_sklearn": sklearn.__version__, "checks": {}}

    # ---- G1/G2: artifacts load without version warnings -------------------
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        with open(ART / "crop_recommendation_rf_model.pkl", "rb") as fh:
            model = pickle.load(fh)
        with open(ART / "crop_recommendation_scaler.pkl", "rb") as fh:
            shipped_scaler = pickle.load(fh)
    res["artifact_sha256"] = {p.name: sha(p) for p in ART.glob("*.pkl")}
    res["load_warnings"] = [str(w.message)[:160] for w in caught]
    res["model"] = {
        "type": type(model).__name__,
        "n_estimators": model.n_estimators,
        "n_features_in": int(model.n_features_in_),
        "classes": [int(c) for c in model.classes_],
        "scaler": type(shipped_scaler).__name__,
    }
    res["checks"]["G2_loads_cleanly"] = not res["load_warnings"]

    # ---- class-id mapping vs dataset labels --------------------------------
    df = pd.read_csv(DATA)
    labels = set(df["label"].str.lower())
    mapped = {v.lower() for v in CROP_DICT.values()}
    res["checks"]["G2_crop_mapping_matches_dataset_labels"] = labels == mapped and set(model.classes_) == set(CROP_DICT)
    X = df[FEATURES].to_numpy(dtype=float)
    names = df["label"].str.lower().to_numpy()

    def agreement(scaler_obj, Xs, ys) -> float:
        ids = model.predict(scaler_obj.transform(Xs))
        return float((np.array([CROP_DICT[int(i)].lower() for i in ids]) == ys).mean())

    # ---- FINDING: the shipped scaler is degenerate --------------------------
    degenerate = bool(np.allclose(shipped_scaler.data_min_, shipped_scaler.data_max_))
    res["shipped_scaler"] = {
        "data_min": shipped_scaler.data_min_.tolist(),
        "data_max": shipped_scaler.data_max_.tolist(),
        "degenerate_fitted_on_one_sample": degenerate,
        "agreement_with_labels_on_dataset": agreement(shipped_scaler, X, names),
    }
    res["checks"]["G2_shipped_scaler_valid"] = not degenerate  # expected FAIL: documents the defect

    # ---- reconstruct the scaler exactly as the team notebook fitted it ------
    # notebook: train_test_split(X, y, test_size=0.2, random_state=42); ms.fit(X_train)
    Xtr, Xte, ytr, yte = train_test_split(X, names, test_size=0.2, random_state=42)
    scaler = MinMaxScaler().fit(Xtr)
    RECON = ROOT / "ml" / "model1" / "artifacts" / "scaler_reconstructed.pkl"
    with open(RECON, "wb") as fh:
        pickle.dump(scaler, fh)
    res["reconstructed_scaler"] = {
        "file": RECON.name,
        "sha256": sha(RECON),
        "derivation": "MinMaxScaler fitted on X_train of train_test_split(test_size=0.2, random_state=42), as in crop_recommendation.ipynb",
        "heldout_accuracy_notebook_split": agreement(scaler, Xte, yte),
        "train_accuracy_notebook_split": agreement(scaler, Xtr, ytr),
        "notebook_reported_accuracy": 0.990909,
    }
    agree = res["reconstructed_scaler"]["heldout_accuracy_notebook_split"]
    res["checks"]["G2_parity_heldout_accuracy_matches_notebook_0.9909_within_0.005"] = abs(agree - 0.990909) <= 0.005
    res["checks"]["G2_reconstructed_scaler_agreement_ge_0.97"] = agree >= 0.97

    # ---- G3: input ranges ---------------------------------------------------
    ranges = {f: {"min": float(df[f].min()), "max": float(df[f].max())} for f in FEATURES}
    (ROOT / "ml" / "model1" / "input_ranges.json").write_text(json.dumps(
        {"source": "data/raw/model1_crop_recommendation.csv", "n_rows": len(df), "ranges": ranges,
         "units": {"temperature": "degC", "humidity": "% relative", "rainfall": "mm (averaging period UNVERIFIED)",
                   "N": "ratio/index per dataset docs (unit unverified)", "P": "idem", "K": "idem", "ph": "pH"}},
        indent=2))

    # ---- golden fixtures (regression guard) ---------------------------------
    rng = np.random.default_rng(7)
    idx = rng.choice(len(df), 12, replace=False)
    golden = []
    for i in idx:
        x = X[i:i + 1]
        p = model.predict_proba(scaler.transform(x))[0]
        top = np.argsort(p)[::-1][:3]
        golden.append({"input": dict(zip(FEATURES, map(float, x[0]))),
                       "top3": [{"crop": CROP_DICT[int(model.classes_[j])], "score": round(float(p[j]), 6)} for j in top]})
    (ROOT / "ml" / "model1" / "golden.json").write_text(json.dumps(golden, indent=2))

    # ---- G5: SHAP additivity --------------------------------------------------
    expl = shap.TreeExplainer(model)
    sample = scaler.transform(X[idx])
    sv = np.asarray(expl.shap_values(sample))  # (n, features, classes) in recent shap
    base = np.asarray(expl.expected_value)
    if sv.shape[0] != len(sample):  # older layout (classes, n, features)
        sv = np.transpose(sv, (1, 2, 0))
    proba = model.predict_proba(sample)
    errs = []
    for n in range(len(sample)):
        for c in range(proba.shape[1]):
            errs.append(abs(base[c] + sv[n, :, c].sum() - proba[n, c]))
    res["shap"] = {"version": shap.__version__, "max_additivity_error": float(max(errs))}
    res["checks"]["G5_shap_additive_1e-6"] = max(errs) < 1e-6

    # ---- G4: cross-validation, class-wise, noise, calibration ---------------
    cv = StratifiedKFold(5, shuffle=True, random_state=42)
    y = df["label"].str.lower()
    rf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    pred = cross_val_predict(rf, X, y, cv=cv)
    proba = cross_val_predict(rf, X, y, cv=cv, method="predict_proba")
    classes = np.array(sorted(y.unique()))
    y_idx = np.searchsorted(classes, y.to_numpy())
    rep = classification_report(y, pred, output_dict=True)
    worst = sorted(((k, v["f1-score"]) for k, v in rep.items() if k in classes), key=lambda t: t[1])[:5]
    sd = X.std(0)
    noisy = {}
    nrng = np.random.default_rng(0)
    for lvl in (0.1, 0.25, 0.5):
        accs = []
        for tr, te in cv.split(X, y):
            m = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1).fit(X[tr], y.iloc[tr])
            accs.append(accuracy_score(y.iloc[te], m.predict(X[te] + nrng.normal(0, lvl * sd, X[te].shape))))
        noisy[str(lvl)] = round(float(np.mean(accs)), 3)
    res["cv"] = {
        "protocol": "stratified 5-fold, RandomForest(100 trees, seed 42) re-trained per fold; shipped model is NOT used for these numbers",
        "accuracy": round(accuracy_score(y, pred), 4),
        "worst_classes_f1": [(k, round(f, 3)) for k, f in worst],
        "noise_accuracy_by_std_fraction": noisy,
        "ece_uncalibrated": round(ece(proba, y_idx), 4),
        "note": "dataset-internal; dataset looks synthetic (100 rows/class, bounded per-class ranges)",
    }
    res["checks"]["G4_report_produced"] = True

    (DOCS / "model1_validation.json").write_text(json.dumps(res, indent=2, default=str))
    lines = ["# Model 1 validation (gates G1-G5)", "",
             f"Runtime scikit-learn {sklearn.__version__}; pickles were written with 1.9.0 "
             "(the team repo's `requirements.txt` pins 1.2.1, which is **wrong** for these artifacts).", "",
             "| Check | Result |", "|---|---|",
             *[f"| {k} | {'PASS' if v else 'FAIL'} |" for k, v in res["checks"].items()], "",
             f"- Load warnings: {res['load_warnings'] or 'none'}",
             f"- Model: {res['model']['type']}, {res['model']['n_estimators']} trees, {res['model']['n_features_in']} features, 22 classes",
             f"- Shipped scaler: {'DEGENERATE (fitted on a single sample) - agreement ' + str(round(res['shipped_scaler']['agreement_with_labels_on_dataset'],4)) if degenerate else 'valid'}",
             f"- Reconstructed scaler: held-out accuracy {agree:.4f} (notebook reported 0.9909); train {res['reconstructed_scaler']['train_accuracy_notebook_split']:.4f}",
             f"- SHAP max additivity error: {res['shap']['max_additivity_error']:.2e}",
             f"- 5-fold CV accuracy: {res['cv']['accuracy']} (dataset-internal)",
             f"- Weakest classes by F1: {res['cv']['worst_classes_f1']}",
             f"- Accuracy with noisy inputs (fraction of feature std): {noisy}",
             f"- Expected calibration error of raw forest vote fraction: {res['cv']['ece_uncalibrated']}", "",
             "Limitations: dataset provenance and rainfall period unverified; 22 crops only (no wheat, sugarcane, "
             "mustard, soybean, potato); scores are uncalibrated vote fractions, not probabilities.",
             "Soil-test mode stays **disabled for users** until inputs and units are validated."]
    (DOCS / "model1_validation.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
    return 0 if all(res["checks"].values()) else 1


if __name__ == "__main__":
    raise SystemExit(main())
