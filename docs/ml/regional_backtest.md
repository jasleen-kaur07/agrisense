# Regional engine back-test (gate G6)

Protocol: validation 2011-2012 grid search; frozen config; test 2013-2014; history up to Y-1.
Chosen config (picked on validation only): half-life 1.0 y, shrinkage k 2.0.

| Method | Cases | Overlap with top-3 by area | P@3 (grown) | Hit (any main crop) |
|---|---|---|---|---|
| B0 national season popularity | 2191 | 0.391 | 0.601 | 0.819 |
| B1 state-season popularity | 2191 | 0.572 | 0.782 | 0.923 |
| B2 district-season, all history | 2191 | 0.730 | 0.839 | 0.985 |
| Regional engine (frozen config) | 2191 | 0.811 | 0.895 | 0.988 |

Engine minus B1 on overlap3, bootstrap 95% CI: [+0.227, +0.249].
State-fallback rate on test cases: 8.5%.
**Gate G6 (engine >= B1 on every metric): PASS.**

These numbers measure agreement with what was historically planted. They are not
evidence that the listed crops are agronomically best for a farm.
