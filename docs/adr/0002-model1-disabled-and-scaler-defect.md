# ADR 0002: Model 1 stays unchanged but disabled for users

Status: accepted (2026-10-10)

**Findings** (`docs/ml/model1_validation.md`): the shipped scaler is a MinMaxScaler fitted on one sample
(agreement with labels 7.2%); a scaler reconstructed as in the team notebook restores held-out accuracy 0.9955.
The repo's `requirements.txt` pins scikit-learn 1.2.1 but the pickles were written with 1.9.0. Rainfall averaging
period is unresolved; district annual normals are outside the training range.

**Decision.** Keep `model.pkl` byte-identical. Ship it in `ml-service` with a reconstructed, checksum-verified
scaler, all seven inputs required, ranges enforced, SHAP verified, and `ENABLE_MODEL1=false` by default.
Never combine its output with the regional guide. No API-derived rainfall is ever fed to it.

## Update 2026-10-15

The team chose to expose Model 1 to users as an **experimental** Crop Prediction page. The decision above about the
artifacts is unchanged (model file byte-identical, reconstructed scaler, all inputs required, ranges enforced).
What changed: `ENABLE_MODEL1=true` in `.env.example`; farm-advisory exposes `POST /v1/predictions/crop`; the web app
shows a soil-test form with a prominent "experimental, not validated on real farms" notice, a "model score, not a
probability" label, the 22-crop limit, and the rainfall caveat. Rainfall is typed by the user, never fetched. The
output is still never combined with the Regional Crop Guide. The risks recorded above remain open: the training data
looks synthetic, the rainfall period is unverified, and the scaler is a reconstruction.
