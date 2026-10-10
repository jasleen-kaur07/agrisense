# ADR 0001: Regional Crop Guide replaces the Model 2 classifier

Status: accepted (2026-10-10)

**Context.** The team's Model 2 artifacts are missing from the repository and its reports contradict each other
(47.9% top-1 in one report; 16.8% in the generated metadata). Temporal back-tests of simple statistics on the
same crop-production data match or beat an ML classifier built on location, season and rainfall normals.

**Decision.** Rank crops with a transparent recency-weighted area-share calculation per district and season
(`services/data-service/app/domain/regional.py`), blended with the state prior. Present it as historical
prevalence. Config frozen from the 2011-12 validation grid (half-life 1 year, shrinkage k 2).

**Evidence.** `docs/ml/regional_backtest.md`: on 2013-14 the engine reached overlap@3 0.811 versus 0.572 for
state popularity (95% CI of the difference +0.227 to +0.249). This measures agreement with historical planting,
not agronomic suitability.

**Consequences.** No suitability claim anywhere in the product. The engine is deterministic, explainable and
unit-tested. Crop records end in 2014; district boundaries predate later splits.
