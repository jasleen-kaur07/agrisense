# Model 1 card: crop suitability classifier (experimental, not user-facing)

- **Task:** classify 1 of 22 crops from N, P, K, temperature, humidity, pH, rainfall.
- **Artifacts:** `ml/model1/artifacts/source/crop_recommendation_rf_model.pkl` (RandomForest, 100 trees, scikit-learn 1.9.0).
- **Scaler:** the shipped `crop_recommendation_scaler.pkl` is **defective**: a MinMaxScaler fitted on one
  sample (`data_min == data_max`); with it, predictions agree with labels only 7.2% of the time. A scaler
  reconstructed as in the team notebook (`ml/model1/artifacts/scaler_reconstructed.pkl`) restores held-out
  accuracy 0.9955 on the notebook's split. The model file itself is unchanged.
- **Data:** 2,200 rows, 100 per crop; looks synthetic/curated; provenance and license unverified.
- **Crops:** rice, maize, jute, cotton, coconut, papaya, orange, apple, muskmelon, watermelon, grapes, mango,
  banana, pomegranate, lentil, blackgram, mungbean, mothbeans, pigeonpeas, kidneybeans, chickpea, coffee.
  No wheat, sugarcane, mustard, soybean or potato.
- **Metrics (dataset-internal):** see `model1_validation.md`. Not real-world accuracy.
- **Output:** forest vote fraction. Uncalibrated (ECE 0.039 on CV). Called "model score", never "probability".
- **Explainability:** SHAP TreeExplainer; additivity verified to ~1e-16.
- **Status:** available to tests and validation only. Never combined with the Regional Crop Guide.
