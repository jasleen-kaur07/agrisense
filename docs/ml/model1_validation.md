# Model 1 validation (gates G1-G5)

Runtime scikit-learn 1.9.0; pickles were written with 1.9.0 (the team repo's `requirements.txt` pins 1.2.1, which is **wrong** for these artifacts).

| Check | Result |
|---|---|
| G2_loads_cleanly | PASS |
| G2_crop_mapping_matches_dataset_labels | PASS |
| G2_shipped_scaler_valid | FAIL |
| G2_parity_heldout_accuracy_matches_notebook_0.9909_within_0.005 | PASS |
| G2_reconstructed_scaler_agreement_ge_0.97 | PASS |
| G5_shap_additive_1e-6 | PASS |
| G4_report_produced | PASS |

- Load warnings: none
- Model: RandomForestClassifier, 100 trees, 7 features, 22 classes
- Shipped scaler: DEGENERATE (fitted on a single sample) - agreement 0.0718
- Reconstructed scaler: held-out accuracy 0.9955 (notebook reported 0.9909); train 1.0000
- SHAP max additivity error: 4.44e-16
- 5-fold CV accuracy: 0.9955 (dataset-internal)
- Weakest classes by F1: [('rice', 0.959), ('jute', 0.961), ('blackgram', 0.995), ('mothbeans', 0.995), ('lentil', 0.995)]
- Accuracy with noisy inputs (fraction of feature std): {'0.1': 0.962, '0.25': 0.811, '0.5': 0.528}
- Expected calibration error of raw forest vote fraction: 0.039

Limitations: dataset provenance and rainfall period unverified; 22 crops only (no wheat, sugarcane, mustard, soybean, potato); scores are uncalibrated vote fractions, not probabilities.
Soil-test mode stays **disabled for users** until inputs and units are validated.
