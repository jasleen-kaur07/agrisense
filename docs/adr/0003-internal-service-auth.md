# ADR 0003: Internal calls use a shared secret header

Status: accepted (2026-10-10). Simplifies the earlier "signed service token" idea.

farm-advisory calls data-service and ml-service on a private Docker network with `X-Internal-Token`
(constant-time comparison). Trade-off: a leaked secret grants internal access until rotated; mTLS or short-lived
signed service tokens are the upgrade path. User-facing data-service endpoints still accept a user JWT.
