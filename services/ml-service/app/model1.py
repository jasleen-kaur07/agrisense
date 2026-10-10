"""Model 1 loader and inference. Artifacts are verified by SHA-256 before unpickling.

Output is a *model score* (random-forest vote fraction), never a probability.
"""

from __future__ import annotations

import hashlib
import json
import pickle
import warnings
from pathlib import Path

import numpy as np
import sklearn

FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]


class ModelLoadError(RuntimeError):
    pass


class ValidationFailure(ValueError):
    def __init__(self, errors: list[dict]):
        super().__init__("invalid input")
        self.errors = errors


class Model1:
    def __init__(self, directory: Path):
        meta = json.loads((directory / "METADATA.json").read_text())
        for name, expected in meta["files"].items():
            actual = hashlib.sha256((directory / name).read_bytes()).hexdigest()
            if actual != expected:
                raise ModelLoadError(f"checksum mismatch for {name}")
        with warnings.catch_warnings():
            warnings.simplefilter("error")  # any version/serialization warning is a load failure
            try:
                with open(directory / "model.pkl", "rb") as fh:
                    self.model = pickle.load(fh)  # noqa: S301 - checksum verified above
                with open(directory / "scaler.pkl", "rb") as fh:
                    self.scaler = pickle.load(fh)  # noqa: S301
            except Warning as w:
                raise ModelLoadError(f"artifact load warning: {w}") from w
        if np.allclose(self.scaler.data_min_, self.scaler.data_max_):
            raise ModelLoadError("scaler is degenerate (fitted on a single sample)")
        self.meta = meta
        self.version = meta["version"]
        self.ranges = json.loads((directory / "input_ranges.json").read_text())["ranges"]
        self.classes = {int(k): v for k, v in meta["classes"].items()}
        self._explainer = None
        self.sklearn_runtime = sklearn.__version__

    def info(self) -> dict:
        return {
            "name": self.meta["name"],
            "version": self.version,
            "status": self.meta["status"],
            "framework": self.meta["framework"],
            "provenance": self.meta["provenance"],
            "limitations": self.meta["limitations"],
            "featureOrder": FEATURES,
            "inputRanges": self.ranges,
        }

    def validate(self, values: dict) -> np.ndarray:
        errors = []
        for f in FEATURES:
            v = values.get(f)
            if v is None:
                errors.append({"field": f, "message": "required; no value is ever imputed"})
                continue
            lo, hi = self.ranges[f]["min"], self.ranges[f]["max"]
            if not (lo <= v <= hi):
                errors.append({"field": f, "message": f"outside the range the model was trained on ({lo:g} to {hi:g})"})
        if errors:
            raise ValidationFailure(errors)
        return np.array([[values[f] for f in FEATURES]], dtype=float)

    def predict(self, values: dict, top_k: int = 3) -> dict:
        x = self.validate(values)
        scaled = self.scaler.transform(x)
        proba = self.model.predict_proba(scaled)[0]
        order = np.argsort(proba)[::-1][:top_k]
        shap_values = self._shap(scaled)  # (features, classes)
        results = []
        for rank, idx in enumerate(order, start=1):
            cls = int(self.model.classes_[idx])
            contrib = shap_values[:, idx]
            results.append(
                {
                    "rank": rank,
                    "crop": self.classes[cls],
                    "modelScore": round(float(proba[idx]), 4),
                    "factors": sorted(
                        (
                            {"feature": f, "shap": round(float(c), 4), "direction": "supports" if c > 0 else "limits"}
                            for f, c in zip(FEATURES, contrib)
                            if abs(c) > 1e-9
                        ),
                        key=lambda d: -abs(d["shap"]),
                    ),
                }
            )
        return {
            "modelName": self.meta["name"],
            "modelVersion": self.version,
            "kind": "MODEL1_EXPERIMENTAL",
            "scoreNote": "Uncalibrated random-forest vote fraction, not a probability. Dataset-internal model; not validated on real farms.",
            "results": results,
            "limitations": self.meta["limitations"],
        }

    def _shap(self, scaled: np.ndarray) -> np.ndarray:
        import shap  # imported lazily: heavy

        if self._explainer is None:
            self._explainer = shap.TreeExplainer(self.model)
        sv = np.asarray(self._explainer.shap_values(scaled))
        return sv[0] if sv.shape[0] == 1 else np.transpose(sv, (1, 2, 0))[0]
