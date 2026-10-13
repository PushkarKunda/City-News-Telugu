# API audit report

## Executive summary

The runner discovered **190** inventory entries and produced **216** scenario results. Results: **0 PASS**, **0 FAIL**, **216 BLOCKED**. HTTP responses were received for **0** scenarios.
This report was generated with `--dry-run`; no network requests were sent.

## Scope, methodology, and safety

- Every selected inventory entry is represented, including registry-only entries. Registry-only entries are reported as BLOCKED and are never requested.
- GET, HEAD, and OPTIONS checks are sequential. Likely protected reads receive unauthenticated and invalid-token checks; an authenticated GET is added only when `AUDIT_ACCESS_TOKEN` is present in the process environment.
- Non-GET endpoints receive only a malformed/minimal negative request with an invalid audit token. Login/refresh routes use intentionally invalid Firebase/refresh placeholders. No valid create, update, delete, or claim fixture is generated.
- `--allow-writes` is an explicit hard opt-in flag, but this runner remains safe-negative-only because no disposable environment is approved. The access token is never used for mutations.
- Responses are capped, parsed as JSON or text when possible, and redacted before appearing in this report. Authorization, token, password, secret, Firebase, phone, email, and cookie values are not included.

## Environment

| Setting | Value |
| --- | --- |
| Base URL origin | https://hypernews-production.up.railway.app |
| Base URL source | EXPO_PUBLIC_API_BASE_URL |
| Timeout | 10000 ms (capped at 10000 ms) |
| Authenticated read token | not provided |
| Mode | dry-run |

## Counts

| Inventory entries | Scenarios | PASS | FAIL | BLOCKED | HTTP responses |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 190 | 216 | 0 | 0 | 216 | 0 |

## Full result table

| # | Endpoint | Method | Scenario | Expected result | Actual result | Status | HTTP | Response summary | Duration ms | Sources | Implemented | Request/correlation ID |
| ---: | --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- | --- | --- |
| 1 | /user/auth/google | POST | invalid-placeholder POST safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:5, services/api/routes.ts:7, services/api/auth.ts:116 | yes |  |
| 2 | /user/auth/firebase/login | POST | invalid-placeholder POST safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:6, services/api/auth.ts:79, services/api/client.ts:168 | yes |  |
| 3 | /user/auth/refresh | POST | invalid-placeholder POST safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:8, services/api/client.ts:143 | yes |  |
| 4 | /user/auth/logout | POST | invalid-token POST safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:9, services/api/auth.ts:182 | yes |  |
| 5 | /user/auth/switch-to-publisher | POST | invalid-token POST safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:10, services/api/auth.ts:194 | yes |  |
| 6 | /user/device/token/register | POST | invalid-token POST safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:11, services/api/auth.ts:216 | yes |  |
| 7 | /user/device/token/unregister | DELETE | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:12 | no |  |
| 8 | /user/users/me | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:17, services/api/users.ts:228 | yes |  |
| 9 | /user/users/me | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:17, services/api/users.ts:228 | yes |  |
| 10 | /user/users/me | PATCH | invalid-token PATCH safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:17, services/api/users.ts:246 | yes |  |
| 11 | /user/users/me/publisher-eligibility | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:18, services/api/auth.ts:204 | yes |  |
| 12 | /user/users/me/publisher-eligibility | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:18, services/api/auth.ts:204 | yes |  |
| 13 | /user/users/me/suspension-status | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:19, services/api/users.ts:327 | yes |  |
| 14 | /user/users/me/suspension-status | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:19, services/api/users.ts:327 | yes |  |
| 15 | /user/preferences/me | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:20, services/api/users.ts:294 | yes |  |
| 16 | /user/preferences/me | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:20, services/api/users.ts:294 | yes |  |
| 17 | /user/preferences/me | POST | invalid-token POST safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:20, services/api/users.ts:282 | yes |  |
| 18 | /user/preferences/me | PUT | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:20 | no |  |
| 19 | /user/preferences/me | PATCH | invalid-token PATCH safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:20, services/api/users.ts:264 | yes |  |
| 20 | /user/preferences/me | DELETE | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:20 | no |  |
| 21 | /user/dashboardnew | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:21, services/api/users.ts:310 | yes |  |
| 22 | /user/dashboardnew | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:21, services/api/users.ts:310 | yes |  |
| 23 | /user/dashboard/engagement | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:22, services/api/users.ts:338 | yes |  |
| 24 | /user/dashboard/engagement | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:22, services/api/users.ts:338 | yes |  |
| 25 | /news/v1/feed | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:27, services/api/news.ts:234, services/api/news.ts:258 | yes |  |
| 26 | /news/v1/news | POST | invalid-token POST safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:28, services/api/news.ts:447 | yes |  |
| 27 | /news/v1/news/{uid} | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:29, services/api/news.ts:276 | yes |  |
| 28 | /news/v1/news/{uid} | PUT | invalid-token PUT safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:29, services/api/news.ts:462 | yes |  |
| 29 | /news/v1/user/news/{uid} | DELETE | invalid-token DELETE safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:30, services/api/news.ts:474 | yes |  |
| 30 | /news/v1/news/breaking | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:33, services/api/news.ts:290 | yes |  |
| 31 | /news/v1/news/popular | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:34, services/api/news.ts:362 | yes |  |
| 32 | /news/v1/news/analytics/trending | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:35, services/api/news.ts:346 | yes |  |
| 33 | /news/v1/news/location | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:36, services/api/news.ts:301 | yes |  |
| 34 | /news/v1/news/category/{id} | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:37 | no |  |
| 35 | /news/v1/news/{uid}/related | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:38 | no |  |
| 36 | /news/v1/search | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:39, services/api/news.ts:313 | yes |  |
| 37 | /content/news-shorts | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:42, services/api/routes.ts:98, services/api/news.ts:399 | yes |  |
| 38 | /shorts/feed | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:43, services/api/news.ts:379 | yes |  |
| 39 | /news/v1/news/{uid}/engagement | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:46, services/api/news.ts:427 | yes |  |
| 40 | /news/v1/news/{uid}/engagement | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:46, services/api/news.ts:427 | yes |  |
| 41 | /news/v1/user/news/{uid}/like | POST | invalid-token POST safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:47, services/api/engagement.ts:120, services/api/news.ts:486 | yes |  |
| 42 | /news/v1/user/news/{uid}/like | DELETE | invalid-token DELETE safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:47, services/api/engagement.ts:124, services/api/news.ts:493 | yes |  |
| 43 | /news/v1/user/news/{uid}/view | POST | invalid-token POST safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:48, services/api/engagement.ts:130, services/api/news.ts:500 | yes |  |
| 44 | /news/v1/user/news/{uid}/share | POST | invalid-token POST safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:49, services/api/engagement.ts:134, services/api/news.ts:507 | yes |  |
| 45 | /news/v1/news/{uid}/comments | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:52, services/api/news.ts:522 | yes |  |
| 46 | /news/v1/user/news/{uid}/comment | POST | invalid-token POST safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:53, services/api/news.ts:566 | yes |  |
| 47 | /news/v1/user/news/{uid}/comment/{id} | DELETE | invalid-token DELETE safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:54, services/api/news.ts:581 | yes |  |
| 48 | /news/v1/news/analytics/weekly | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:58 | no |  |
| 49 | /news/v1/news/analytics/daily | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:59 | no |  |
| 50 | /news/v1/news/analytics/top | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:60 | no |  |
| 51 | /categories/ | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:65, services/api/categories.ts:60 | yes |  |
| 52 | /categories/menu | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:66, services/api/categories.ts:79 | yes |  |
| 53 | /categories/all | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:67, services/api/categories.ts:41, services/api/news.ts:326 | yes |  |
| 54 | /categories/{id}/news | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:68, services/api/categories.ts:101, services/api/news.ts:336 | yes |  |
| 55 | /content/advertisements/active | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:74, services/api/content.ts:144 | yes |  |
| 56 | /content/advertisements/{id} | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:75, services/api/content.ts:155 | yes |  |
| 57 | /content/advertisements | POST | invalid-token POST safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:76, services/api/content.ts:166 | yes |  |
| 58 | /content/advertisements/{id} | PUT | invalid-token PUT safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:77, services/api/content.ts:181 | yes |  |
| 59 | /content/advertisements/{id}/toggle-status | POST | invalid-token POST safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:78, services/api/content.ts:193 | yes |  |
| 60 | /content/sponsored-posts/active | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:81, services/api/content.ts:209 | yes |  |
| 61 | /content/sponsored-posts | POST | invalid-token POST safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:82, services/api/content.ts:220 | yes |  |
| 62 | /content/sponsored-posts/{id} | PUT | invalid-token PUT safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:83, services/api/content.ts:235 | yes |  |
| 63 | /content/sponsored-posts/pending | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:84, services/api/content.ts:247 | yes |  |
| 64 | /content/events | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:87 | no |  |
| 65 | /content/events | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:87 | no |  |
| 66 | /content/events/{uid} | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:88 | no |  |
| 67 | /content/polls | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:91 | no |  |
| 68 | /content/polls/{uid} | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:92 | no |  |
| 69 | /content/polls/active | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:93, services/api/polls.ts:79 | yes |  |
| 70 | /content/polls/vote | PUT | invalid-token PUT safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:94, services/api/polls.ts:114 | yes |  |
| 71 | /content/polls/{id} | PUT | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:95 | no |  |
| 72 | /content/news-shorts | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:98 | no |  |
| 73 | /content/tags | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:101 | no |  |
| 74 | /content/tags/{name}/content | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:102 | no |  |
| 75 | /content/{type}/{id}/tags | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:103 | no |  |
| 76 | /content/{type}/{id}/flag | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:106 | no |  |
| 77 | /content/search | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:109, services/api/routes.ts:251, services/api/discovery.ts:40 | yes |  |
| 78 | /content/analytics/{type}/{id} | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:110 | no |  |
| 79 | /content/stats | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:111 | no |  |
| 80 | /content/quick-stats | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:112 | no |  |
| 81 | /content/targeting-options | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:113 | no |  |
| 82 | /content/targeting-options | OPTIONS | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:113 | no |  |
| 83 | /content/overview | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:114 | no |  |
| 84 | /engagement/bookmarks | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:120, services/api/engagement.ts:54 | yes |  |
| 85 | /engagement/bookmarks | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:120, services/api/engagement.ts:54 | yes |  |
| 86 | /engagement/bookmarks | POST | invalid-token POST safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:120, services/api/engagement.ts:71 | yes |  |
| 87 | /engagement/bookmarks | DELETE | invalid-token DELETE safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:120, services/api/engagement.ts:89 | yes |  |
| 88 | /engagement/bookmarks/check | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:121, services/api/engagement.ts:107 | yes |  |
| 89 | /engagement/bookmarks/check | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:121, services/api/engagement.ts:107 | yes |  |
| 90 | /engagement/notifications | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:124, services/api/notifications.ts:47 | yes |  |
| 91 | /engagement/notifications | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:124, services/api/notifications.ts:47 | yes |  |
| 92 | /engagement/notifications/unread/count | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:125, services/api/notifications.ts:59 | yes |  |
| 93 | /engagement/notifications/unread/count | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:125, services/api/notifications.ts:59 | yes |  |
| 94 | /engagement/notifications/{id}/read | PATCH | invalid-token PATCH safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:126, services/api/notifications.ts:71 | yes |  |
| 95 | /engagement/notifications/read-all | PATCH | invalid-token PATCH safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:127, services/api/notifications.ts:82 | yes |  |
| 96 | /engagement/notifications/{id} | DELETE | invalid-token DELETE safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:128, services/api/notifications.ts:93 | yes |  |
| 97 | /engagement/notifications/clear | DELETE | invalid-token DELETE safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:129, services/api/notifications.ts:104 | yes |  |
| 98 | /engagement/summary/{uid} | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:132 | no |  |
| 99 | /base/languages | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:138, services/api/location.ts:207 | yes |  |
| 100 | /base/languages/{id} | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:139, services/api/location.ts:221 | yes |  |
| 101 | /base/states | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:142, services/api/location.ts:238 | yes |  |
| 102 | /base/states/{id} | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:143, services/api/location.ts:249 | yes |  |
| 103 | /base/hierarchy/states/{id} | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:144, services/api/location.ts:266 | yes |  |
| 104 | /base/states/{id}/language | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:145, services/api/location.ts:276 | yes |  |
| 105 | /base/districts | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:148, services/api/location.ts:289 | yes |  |
| 106 | /base/districts/{id} | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:149, services/api/location.ts:324 | yes |  |
| 107 | /base/cities | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:152, services/api/location.ts:336 | yes |  |
| 108 | /base/cities/{id} | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:153, services/api/location.ts:366 | yes |  |
| 109 | /base/search | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:156, services/api/location.ts:378 | yes |  |
| 110 | /rewards/me | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:161 | no |  |
| 111 | /rewards/badges | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:162 | no |  |
| 112 | /rewards/referral | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:163 | no |  |
| 113 | /rewards/leaderboard | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:164 | no |  |
| 114 | /rewards/bingo | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:167 | no |  |
| 115 | /rewards/bingo/claim | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:168 | no |  |
| 116 | /rewards/bingo/leaderboard | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:169 | no |  |
| 117 | /rewards/daily-login | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:172 | no |  |
| 118 | /rewards/challenge/today | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:173 | no |  |
| 119 | /rewards/challenge/{id}/claim | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:174 | no |  |
| 120 | /rewards/earn/read | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:177 | no |  |
| 121 | /rewards/earn/share | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:178 | no |  |
| 122 | /rewards/earn/comment | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:179 | no |  |
| 123 | /rewards/earn/like | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:180 | no |  |
| 124 | /rewards/earn/bookmark | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:181 | no |  |
| 125 | /rewards/use-referral | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:184 | no |  |
| 126 | /rewards/ad/rewarded | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:187 | no |  |
| 127 | /rewards/transactions | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:190 | no |  |
| 128 | /api/v1/rewards/info | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:191 | no |  |
| 129 | /insights/ | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:196 | no |  |
| 130 | /insights/ | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:197 | no |  |
| 131 | /insights/create | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:198 | no |  |
| 132 | /insights/uid/{uid} | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:199 | no |  |
| 133 | /insights/uid/{uid} | DELETE | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:199 | no |  |
| 134 | /insights/uid/{uid} | PATCH | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:199 | no |  |
| 135 | /insights/{name} | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:200 | no |  |
| 136 | /insights/stats/popular | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:201 | no |  |
| 137 | /insights/share | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:202 | no |  |
| 138 | /insights/share/{id} | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:203 | no |  |
| 139 | /insights/categories | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:204 | no |  |
| 140 | /posts/ | POST | invalid-token POST safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:209, services/api/posts.ts:93 | yes |  |
| 141 | /posts/feed | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:210, services/api/posts.ts:105 | yes |  |
| 142 | /posts/{uid} | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:211, services/api/posts.ts:120 | yes |  |
| 143 | /posts/{uid} | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:211, services/api/routes.ts:212, services/api/routes.ts:213 | no |  |
| 144 | /posts/{uid} | PUT | invalid-token PUT safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:212, services/api/posts.ts:138 | yes |  |
| 145 | /posts/{uid} | DELETE | invalid-token DELETE safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:213, services/api/posts.ts:150 | yes |  |
| 146 | /posts/user/{uid} | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:214, services/api/posts.ts:161 | yes |  |
| 147 | /posts/user/{uid} | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:214, services/api/posts.ts:161 | yes |  |
| 148 | /posts/{uid}/hashtags | PATCH | invalid-token PATCH safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:215, services/api/posts.ts:175 | yes |  |
| 149 | /posts/{uid}/hashtags | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:215 | no |  |
| 150 | /posts/{uid}/like | POST | invalid-token POST safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:216, services/api/posts.ts:187 | yes |  |
| 151 | /posts/{uid}/comment | POST | invalid-token POST safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:217, services/api/posts.ts:198 | yes |  |
| 152 | /posts/{uid}/comments | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:218, services/api/posts.ts:213 | yes |  |
| 153 | /posts/{uid}/comments | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:218 | no |  |
| 154 | /posts/{uid}/share | POST | invalid-token POST safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:219, services/api/posts.ts:237 | yes |  |
| 155 | /posts/hashtags/trending | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:220, services/api/routes.ts:255, services/api/discovery.ts:101, services/api/posts.ts:251 | yes |  |
| 156 | /posts/hashtags/suggestions | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:221, services/api/routes.ts:256, services/api/discovery.ts:114, services/api/posts.ts:265 | yes |  |
| 157 | /posts/hashtag/{name}/posts | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:222, services/api/routes.ts:257, services/api/discovery.ts:127 | yes |  |
| 158 | /follow/{uid} | POST | invalid-token POST safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:227, services/api/follow.ts:50 | yes |  |
| 159 | /follow/{uid} | DELETE | invalid-token DELETE safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:228, services/api/follow.ts:61 | yes |  |
| 160 | /follow/followers/{uid} | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:229, services/api/follow.ts:72 | yes |  |
| 161 | /follow/followers/{uid} | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:229, services/api/follow.ts:72 | yes |  |
| 162 | /follow/following/{uid} | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:230, services/api/follow.ts:83 | yes |  |
| 163 | /follow/following/{uid} | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:230, services/api/follow.ts:83 | yes |  |
| 164 | /follow/suggestions | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:231, services/api/follow.ts:94 | yes |  |
| 165 | /follow/suggestions | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:231, services/api/follow.ts:94 | yes |  |
| 166 | /follow/status/{uid} | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:232, services/api/follow.ts:105 | yes |  |
| 167 | /follow/status/{uid} | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:232, services/api/follow.ts:105 | yes |  |
| 168 | /follow/counts/{uid} | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:233, services/api/follow.ts:116 | yes |  |
| 169 | /follow/counts/{uid} | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:233, services/api/follow.ts:116 | yes |  |
| 170 | /follow/feed/posts | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:234, services/api/follow.ts:127 | yes |  |
| 171 | /follow/feed/posts | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:234, services/api/follow.ts:127 | yes |  |
| 172 | /user-activity/sessions | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:239 | no |  |
| 173 | /user-activity/sessions/{hash} | DELETE | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:240 | no |  |
| 174 | /user-activity/sessions/kill-all | POST | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:241 | no |  |
| 175 | /user-activity/activities/me | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:242 | no |  |
| 176 | /user-activity/activities/security-events | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:243 | no |  |
| 177 | /user-activity/stats/me | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:244 | no |  |
| 178 | /user-activity/device-limit | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:245 | no |  |
| 179 | /discovery/home | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:250, services/api/discovery.ts:28 | yes |  |
| 180 | /discovery/category/{id} | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:252, services/api/discovery.ts:59 | yes |  |
| 181 | /discovery/related | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:253, services/api/discovery.ts:71 | yes |  |
| 182 | /discovery/trending | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:254, services/api/discovery.ts:83 | yes |  |
| 183 | /notifications/in-app | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:262 | no |  |
| 184 | /notifications/in-app/{id}/read | PATCH | invalid-token PATCH safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:263, services/api/notifications.ts:136 | yes |  |
| 185 | /notifications/in-app/unread/count | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:264 | no |  |
| 186 | / | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:269 | no |  |
| 187 | /health | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:270 | no |  |
| 188 | /news/v1/health | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:271 | no |  |
| 189 | /content/health | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:272 | no |  |
| 190 | /engagement/health | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:273 | no |  |
| 191 | /base/health | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:274 | no |  |
| 192 | /categories/health | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:275 | no |  |
| 193 | /insights/health | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:276 | no |  |
| 194 | /rewards/health | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:277 | no |  |
| 195 | /user-activity/health | GET | registry-only/not exercised | BLOCKED: registry-only endpoint is not exercised. | coverage (Registry-only route; no implementation call was discovered, so it was not exercised.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:278 | no |  |
| 196 | /screens/news/{uid} | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:283, services/api/screens.ts:153 | yes |  |
| 197 | /screens/news/{uid} | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:283, services/api/screens.ts:153 | yes |  |
| 198 | /screens/home | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:284, services/api/screens.ts:166 | yes |  |
| 199 | /screens/home | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:284, services/api/screens.ts:166 | yes |  |
| 200 | /screens/profile | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:285, services/api/screens.ts:204 | yes |  |
| 201 | /screens/profile | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:285, services/api/screens.ts:204 | yes |  |
| 202 | /screens/community | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:286, services/api/screens.ts:264 | yes |  |
| 203 | /screens/community | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:286, services/api/screens.ts:264 | yes |  |
| 204 | /screens/shorts | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:287, services/api/screens.ts:301 | yes |  |
| 205 | /screens/shorts | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:287, services/api/screens.ts:301 | yes |  |
| 206 | /screens/discover | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:288, services/api/screens.ts:312 | yes |  |
| 207 | /screens/discover | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:288, services/api/screens.ts:312 | yes |  |
| 208 | /screens/local | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:289, services/api/screens.ts:329 | yes |  |
| 209 | /screens/local | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:289, services/api/screens.ts:329 | yes |  |
| 210 | /screens/notifications | GET | unauthenticated GET safe read | 401/403 for an unauthenticated protected read. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:290, services/api/screens.ts:340 | yes |  |
| 211 | /screens/notifications | GET | invalid-token GET safe read | 401/403 for a protected read with an invalid token. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | services/api/routes.ts:290, services/api/screens.ts:340 | yes |  |
| 212 | /news/{videoId}/view | POST | invalid-token POST safe negative | Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure. | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | app/(tabs)/shorts.tsx:33 | yes |  |
| 213 | /<unknown> | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | backend/admin-portal/src/api/client.js:42, scripts/api-audit.cjs:693 | yes |  |
| 214 | /docs | HEAD | unauthenticated HEAD safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | backend/admin-portal/src/api/client.js:61 | yes |  |
| 215 | /admin/settings/export/news{q} | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | backend/admin-portal/src/api/client.js:1077 | yes |  |
| 216 | /admin/settings/export/users?format=csv | GET | unauthenticated GET safe read | Reachable 2xx/3xx read response (JSON shape warnings do not fail the check). | config (Dry run requested; network request was not sent.) | **BLOCKED** |  |  | 0 | backend/admin-portal/src/api/client.js:1096 | yes |  |

## Endpoint inventory

| ID | Method | Path | Implemented | Selected | Scenarios | Sources |
| --- | --- | --- | --- | --- | ---: | --- |
| api-001 | POST | /user/auth/google | yes | yes | 1 | services/api/routes.ts:5, services/api/routes.ts:7, services/api/auth.ts:116 |
| api-002 | POST | /user/auth/firebase/login | yes | yes | 1 | services/api/routes.ts:6, services/api/auth.ts:79, services/api/client.ts:168 |
| api-003 | POST | /user/auth/refresh | yes | yes | 1 | services/api/routes.ts:8, services/api/client.ts:143 |
| api-004 | POST | /user/auth/logout | yes | yes | 1 | services/api/routes.ts:9, services/api/auth.ts:182 |
| api-005 | POST | /user/auth/switch-to-publisher | yes | yes | 1 | services/api/routes.ts:10, services/api/auth.ts:194 |
| api-006 | POST | /user/device/token/register | yes | yes | 1 | services/api/routes.ts:11, services/api/auth.ts:216 |
| api-007 | DELETE | /user/device/token/unregister | no | yes | 1 | services/api/routes.ts:12 |
| api-008 | GET | /user/users/me | yes | yes | 2 | services/api/routes.ts:17, services/api/users.ts:228 |
| api-009 | PATCH | /user/users/me | yes | yes | 1 | services/api/routes.ts:17, services/api/users.ts:246 |
| api-010 | GET | /user/users/me/publisher-eligibility | yes | yes | 2 | services/api/routes.ts:18, services/api/auth.ts:204 |
| api-011 | GET | /user/users/me/suspension-status | yes | yes | 2 | services/api/routes.ts:19, services/api/users.ts:327 |
| api-012 | GET | /user/preferences/me | yes | yes | 2 | services/api/routes.ts:20, services/api/users.ts:294 |
| api-013 | POST | /user/preferences/me | yes | yes | 1 | services/api/routes.ts:20, services/api/users.ts:282 |
| api-014 | PUT | /user/preferences/me | no | yes | 1 | services/api/routes.ts:20 |
| api-015 | PATCH | /user/preferences/me | yes | yes | 1 | services/api/routes.ts:20, services/api/users.ts:264 |
| api-016 | DELETE | /user/preferences/me | no | yes | 1 | services/api/routes.ts:20 |
| api-017 | GET | /user/dashboardnew | yes | yes | 2 | services/api/routes.ts:21, services/api/users.ts:310 |
| api-018 | GET | /user/dashboard/engagement | yes | yes | 2 | services/api/routes.ts:22, services/api/users.ts:338 |
| api-019 | GET | /news/v1/feed | yes | yes | 1 | services/api/routes.ts:27, services/api/news.ts:234, services/api/news.ts:258 |
| api-020 | POST | /news/v1/news | yes | yes | 1 | services/api/routes.ts:28, services/api/news.ts:447 |
| api-021 | GET | /news/v1/news/{uid} | yes | yes | 1 | services/api/routes.ts:29, services/api/news.ts:276 |
| api-022 | PUT | /news/v1/news/{uid} | yes | yes | 1 | services/api/routes.ts:29, services/api/news.ts:462 |
| api-023 | DELETE | /news/v1/user/news/{uid} | yes | yes | 1 | services/api/routes.ts:30, services/api/news.ts:474 |
| api-024 | GET | /news/v1/news/breaking | yes | yes | 1 | services/api/routes.ts:33, services/api/news.ts:290 |
| api-025 | GET | /news/v1/news/popular | yes | yes | 1 | services/api/routes.ts:34, services/api/news.ts:362 |
| api-026 | GET | /news/v1/news/analytics/trending | yes | yes | 1 | services/api/routes.ts:35, services/api/news.ts:346 |
| api-027 | GET | /news/v1/news/location | yes | yes | 1 | services/api/routes.ts:36, services/api/news.ts:301 |
| api-028 | GET | /news/v1/news/category/{id} | no | yes | 1 | services/api/routes.ts:37 |
| api-029 | GET | /news/v1/news/{uid}/related | no | yes | 1 | services/api/routes.ts:38 |
| api-030 | GET | /news/v1/search | yes | yes | 1 | services/api/routes.ts:39, services/api/news.ts:313 |
| api-031 | GET | /content/news-shorts | yes | yes | 1 | services/api/routes.ts:42, services/api/routes.ts:98, services/api/news.ts:399 |
| api-032 | GET | /shorts/feed | yes | yes | 1 | services/api/routes.ts:43, services/api/news.ts:379 |
| api-033 | GET | /news/v1/news/{uid}/engagement | yes | yes | 2 | services/api/routes.ts:46, services/api/news.ts:427 |
| api-034 | POST | /news/v1/user/news/{uid}/like | yes | yes | 1 | services/api/routes.ts:47, services/api/engagement.ts:120, services/api/news.ts:486 |
| api-035 | DELETE | /news/v1/user/news/{uid}/like | yes | yes | 1 | services/api/routes.ts:47, services/api/engagement.ts:124, services/api/news.ts:493 |
| api-036 | POST | /news/v1/user/news/{uid}/view | yes | yes | 1 | services/api/routes.ts:48, services/api/engagement.ts:130, services/api/news.ts:500 |
| api-037 | POST | /news/v1/user/news/{uid}/share | yes | yes | 1 | services/api/routes.ts:49, services/api/engagement.ts:134, services/api/news.ts:507 |
| api-038 | GET | /news/v1/news/{uid}/comments | yes | yes | 1 | services/api/routes.ts:52, services/api/news.ts:522 |
| api-039 | POST | /news/v1/user/news/{uid}/comment | yes | yes | 1 | services/api/routes.ts:53, services/api/news.ts:566 |
| api-040 | DELETE | /news/v1/user/news/{uid}/comment/{id} | yes | yes | 1 | services/api/routes.ts:54, services/api/news.ts:581 |
| api-041 | GET | /news/v1/news/analytics/weekly | no | yes | 1 | services/api/routes.ts:58 |
| api-042 | GET | /news/v1/news/analytics/daily | no | yes | 1 | services/api/routes.ts:59 |
| api-043 | GET | /news/v1/news/analytics/top | no | yes | 1 | services/api/routes.ts:60 |
| api-044 | GET | /categories/ | yes | yes | 1 | services/api/routes.ts:65, services/api/categories.ts:60 |
| api-045 | GET | /categories/menu | yes | yes | 1 | services/api/routes.ts:66, services/api/categories.ts:79 |
| api-046 | GET | /categories/all | yes | yes | 1 | services/api/routes.ts:67, services/api/categories.ts:41, services/api/news.ts:326 |
| api-047 | GET | /categories/{id}/news | yes | yes | 1 | services/api/routes.ts:68, services/api/categories.ts:101, services/api/news.ts:336 |
| api-048 | GET | /content/advertisements/active | yes | yes | 1 | services/api/routes.ts:74, services/api/content.ts:144 |
| api-049 | GET | /content/advertisements/{id} | yes | yes | 1 | services/api/routes.ts:75, services/api/content.ts:155 |
| api-050 | POST | /content/advertisements | yes | yes | 1 | services/api/routes.ts:76, services/api/content.ts:166 |
| api-051 | PUT | /content/advertisements/{id} | yes | yes | 1 | services/api/routes.ts:77, services/api/content.ts:181 |
| api-052 | POST | /content/advertisements/{id}/toggle-status | yes | yes | 1 | services/api/routes.ts:78, services/api/content.ts:193 |
| api-053 | GET | /content/sponsored-posts/active | yes | yes | 1 | services/api/routes.ts:81, services/api/content.ts:209 |
| api-054 | POST | /content/sponsored-posts | yes | yes | 1 | services/api/routes.ts:82, services/api/content.ts:220 |
| api-055 | PUT | /content/sponsored-posts/{id} | yes | yes | 1 | services/api/routes.ts:83, services/api/content.ts:235 |
| api-056 | GET | /content/sponsored-posts/pending | yes | yes | 1 | services/api/routes.ts:84, services/api/content.ts:247 |
| api-057 | GET | /content/events | no | yes | 1 | services/api/routes.ts:87 |
| api-058 | POST | /content/events | no | yes | 1 | services/api/routes.ts:87 |
| api-059 | GET | /content/events/{uid} | no | yes | 1 | services/api/routes.ts:88 |
| api-060 | POST | /content/polls | no | yes | 1 | services/api/routes.ts:91 |
| api-061 | GET | /content/polls/{uid} | no | yes | 1 | services/api/routes.ts:92 |
| api-062 | GET | /content/polls/active | yes | yes | 1 | services/api/routes.ts:93, services/api/polls.ts:79 |
| api-063 | PUT | /content/polls/vote | yes | yes | 1 | services/api/routes.ts:94, services/api/polls.ts:114 |
| api-064 | PUT | /content/polls/{id} | no | yes | 1 | services/api/routes.ts:95 |
| api-065 | POST | /content/news-shorts | no | yes | 1 | services/api/routes.ts:98 |
| api-066 | GET | /content/tags | no | yes | 1 | services/api/routes.ts:101 |
| api-067 | GET | /content/tags/{name}/content | no | yes | 1 | services/api/routes.ts:102 |
| api-068 | POST | /content/{type}/{id}/tags | no | yes | 1 | services/api/routes.ts:103 |
| api-069 | POST | /content/{type}/{id}/flag | no | yes | 1 | services/api/routes.ts:106 |
| api-070 | GET | /content/search | yes | yes | 1 | services/api/routes.ts:109, services/api/routes.ts:251, services/api/discovery.ts:40 |
| api-071 | GET | /content/analytics/{type}/{id} | no | yes | 1 | services/api/routes.ts:110 |
| api-072 | GET | /content/stats | no | yes | 1 | services/api/routes.ts:111 |
| api-073 | GET | /content/quick-stats | no | yes | 1 | services/api/routes.ts:112 |
| api-074 | GET | /content/targeting-options | no | yes | 1 | services/api/routes.ts:113 |
| api-075 | OPTIONS | /content/targeting-options | no | yes | 1 | services/api/routes.ts:113 |
| api-076 | GET | /content/overview | no | yes | 1 | services/api/routes.ts:114 |
| api-077 | GET | /engagement/bookmarks | yes | yes | 2 | services/api/routes.ts:120, services/api/engagement.ts:54 |
| api-078 | POST | /engagement/bookmarks | yes | yes | 1 | services/api/routes.ts:120, services/api/engagement.ts:71 |
| api-079 | DELETE | /engagement/bookmarks | yes | yes | 1 | services/api/routes.ts:120, services/api/engagement.ts:89 |
| api-080 | GET | /engagement/bookmarks/check | yes | yes | 2 | services/api/routes.ts:121, services/api/engagement.ts:107 |
| api-081 | GET | /engagement/notifications | yes | yes | 2 | services/api/routes.ts:124, services/api/notifications.ts:47 |
| api-082 | GET | /engagement/notifications/unread/count | yes | yes | 2 | services/api/routes.ts:125, services/api/notifications.ts:59 |
| api-083 | PATCH | /engagement/notifications/{id}/read | yes | yes | 1 | services/api/routes.ts:126, services/api/notifications.ts:71 |
| api-084 | PATCH | /engagement/notifications/read-all | yes | yes | 1 | services/api/routes.ts:127, services/api/notifications.ts:82 |
| api-085 | DELETE | /engagement/notifications/{id} | yes | yes | 1 | services/api/routes.ts:128, services/api/notifications.ts:93 |
| api-086 | DELETE | /engagement/notifications/clear | yes | yes | 1 | services/api/routes.ts:129, services/api/notifications.ts:104 |
| api-087 | GET | /engagement/summary/{uid} | no | yes | 1 | services/api/routes.ts:132 |
| api-088 | GET | /base/languages | yes | yes | 1 | services/api/routes.ts:138, services/api/location.ts:207 |
| api-089 | GET | /base/languages/{id} | yes | yes | 1 | services/api/routes.ts:139, services/api/location.ts:221 |
| api-090 | GET | /base/states | yes | yes | 1 | services/api/routes.ts:142, services/api/location.ts:238 |
| api-091 | GET | /base/states/{id} | yes | yes | 1 | services/api/routes.ts:143, services/api/location.ts:249 |
| api-092 | GET | /base/hierarchy/states/{id} | yes | yes | 1 | services/api/routes.ts:144, services/api/location.ts:266 |
| api-093 | GET | /base/states/{id}/language | yes | yes | 1 | services/api/routes.ts:145, services/api/location.ts:276 |
| api-094 | GET | /base/districts | yes | yes | 1 | services/api/routes.ts:148, services/api/location.ts:289 |
| api-095 | GET | /base/districts/{id} | yes | yes | 1 | services/api/routes.ts:149, services/api/location.ts:324 |
| api-096 | GET | /base/cities | yes | yes | 1 | services/api/routes.ts:152, services/api/location.ts:336 |
| api-097 | GET | /base/cities/{id} | yes | yes | 1 | services/api/routes.ts:153, services/api/location.ts:366 |
| api-098 | GET | /base/search | yes | yes | 1 | services/api/routes.ts:156, services/api/location.ts:378 |
| api-099 | GET | /rewards/me | no | yes | 1 | services/api/routes.ts:161 |
| api-100 | GET | /rewards/badges | no | yes | 1 | services/api/routes.ts:162 |
| api-101 | GET | /rewards/referral | no | yes | 1 | services/api/routes.ts:163 |
| api-102 | GET | /rewards/leaderboard | no | yes | 1 | services/api/routes.ts:164 |
| api-103 | GET | /rewards/bingo | no | yes | 1 | services/api/routes.ts:167 |
| api-104 | POST | /rewards/bingo/claim | no | yes | 1 | services/api/routes.ts:168 |
| api-105 | GET | /rewards/bingo/leaderboard | no | yes | 1 | services/api/routes.ts:169 |
| api-106 | POST | /rewards/daily-login | no | yes | 1 | services/api/routes.ts:172 |
| api-107 | GET | /rewards/challenge/today | no | yes | 1 | services/api/routes.ts:173 |
| api-108 | POST | /rewards/challenge/{id}/claim | no | yes | 1 | services/api/routes.ts:174 |
| api-109 | POST | /rewards/earn/read | no | yes | 1 | services/api/routes.ts:177 |
| api-110 | POST | /rewards/earn/share | no | yes | 1 | services/api/routes.ts:178 |
| api-111 | POST | /rewards/earn/comment | no | yes | 1 | services/api/routes.ts:179 |
| api-112 | POST | /rewards/earn/like | no | yes | 1 | services/api/routes.ts:180 |
| api-113 | POST | /rewards/earn/bookmark | no | yes | 1 | services/api/routes.ts:181 |
| api-114 | POST | /rewards/use-referral | no | yes | 1 | services/api/routes.ts:184 |
| api-115 | POST | /rewards/ad/rewarded | no | yes | 1 | services/api/routes.ts:187 |
| api-116 | GET | /rewards/transactions | no | yes | 1 | services/api/routes.ts:190 |
| api-117 | GET | /api/v1/rewards/info | no | yes | 1 | services/api/routes.ts:191 |
| api-118 | GET | /insights/ | no | yes | 1 | services/api/routes.ts:196 |
| api-119 | POST | /insights/ | no | yes | 1 | services/api/routes.ts:197 |
| api-120 | POST | /insights/create | no | yes | 1 | services/api/routes.ts:198 |
| api-121 | GET | /insights/uid/{uid} | no | yes | 1 | services/api/routes.ts:199 |
| api-122 | DELETE | /insights/uid/{uid} | no | yes | 1 | services/api/routes.ts:199 |
| api-123 | PATCH | /insights/uid/{uid} | no | yes | 1 | services/api/routes.ts:199 |
| api-124 | GET | /insights/{name} | no | yes | 1 | services/api/routes.ts:200 |
| api-125 | GET | /insights/stats/popular | no | yes | 1 | services/api/routes.ts:201 |
| api-126 | POST | /insights/share | no | yes | 1 | services/api/routes.ts:202 |
| api-127 | POST | /insights/share/{id} | no | yes | 1 | services/api/routes.ts:203 |
| api-128 | GET | /insights/categories | no | yes | 1 | services/api/routes.ts:204 |
| api-129 | POST | /posts/ | yes | yes | 1 | services/api/routes.ts:209, services/api/posts.ts:93 |
| api-130 | GET | /posts/feed | yes | yes | 1 | services/api/routes.ts:210, services/api/posts.ts:105 |
| api-131 | GET | /posts/{uid} | yes | yes | 1 | services/api/routes.ts:211, services/api/posts.ts:120 |
| api-132 | POST | /posts/{uid} | no | yes | 1 | services/api/routes.ts:211, services/api/routes.ts:212, services/api/routes.ts:213 |
| api-133 | PUT | /posts/{uid} | yes | yes | 1 | services/api/routes.ts:212, services/api/posts.ts:138 |
| api-134 | DELETE | /posts/{uid} | yes | yes | 1 | services/api/routes.ts:213, services/api/posts.ts:150 |
| api-135 | GET | /posts/user/{uid} | yes | yes | 2 | services/api/routes.ts:214, services/api/posts.ts:161 |
| api-136 | PATCH | /posts/{uid}/hashtags | yes | yes | 1 | services/api/routes.ts:215, services/api/posts.ts:175 |
| api-137 | POST | /posts/{uid}/hashtags | no | yes | 1 | services/api/routes.ts:215 |
| api-138 | POST | /posts/{uid}/like | yes | yes | 1 | services/api/routes.ts:216, services/api/posts.ts:187 |
| api-139 | POST | /posts/{uid}/comment | yes | yes | 1 | services/api/routes.ts:217, services/api/posts.ts:198 |
| api-140 | GET | /posts/{uid}/comments | yes | yes | 1 | services/api/routes.ts:218, services/api/posts.ts:213 |
| api-141 | POST | /posts/{uid}/comments | no | yes | 1 | services/api/routes.ts:218 |
| api-142 | POST | /posts/{uid}/share | yes | yes | 1 | services/api/routes.ts:219, services/api/posts.ts:237 |
| api-143 | GET | /posts/hashtags/trending | yes | yes | 1 | services/api/routes.ts:220, services/api/routes.ts:255, services/api/discovery.ts:101, services/api/posts.ts:251 |
| api-144 | GET | /posts/hashtags/suggestions | yes | yes | 1 | services/api/routes.ts:221, services/api/routes.ts:256, services/api/discovery.ts:114, services/api/posts.ts:265 |
| api-145 | GET | /posts/hashtag/{name}/posts | yes | yes | 1 | services/api/routes.ts:222, services/api/routes.ts:257, services/api/discovery.ts:127 |
| api-146 | POST | /follow/{uid} | yes | yes | 1 | services/api/routes.ts:227, services/api/follow.ts:50 |
| api-147 | DELETE | /follow/{uid} | yes | yes | 1 | services/api/routes.ts:228, services/api/follow.ts:61 |
| api-148 | GET | /follow/followers/{uid} | yes | yes | 2 | services/api/routes.ts:229, services/api/follow.ts:72 |
| api-149 | GET | /follow/following/{uid} | yes | yes | 2 | services/api/routes.ts:230, services/api/follow.ts:83 |
| api-150 | GET | /follow/suggestions | yes | yes | 2 | services/api/routes.ts:231, services/api/follow.ts:94 |
| api-151 | GET | /follow/status/{uid} | yes | yes | 2 | services/api/routes.ts:232, services/api/follow.ts:105 |
| api-152 | GET | /follow/counts/{uid} | yes | yes | 2 | services/api/routes.ts:233, services/api/follow.ts:116 |
| api-153 | GET | /follow/feed/posts | yes | yes | 2 | services/api/routes.ts:234, services/api/follow.ts:127 |
| api-154 | GET | /user-activity/sessions | no | yes | 1 | services/api/routes.ts:239 |
| api-155 | DELETE | /user-activity/sessions/{hash} | no | yes | 1 | services/api/routes.ts:240 |
| api-156 | POST | /user-activity/sessions/kill-all | no | yes | 1 | services/api/routes.ts:241 |
| api-157 | GET | /user-activity/activities/me | no | yes | 1 | services/api/routes.ts:242 |
| api-158 | GET | /user-activity/activities/security-events | no | yes | 1 | services/api/routes.ts:243 |
| api-159 | GET | /user-activity/stats/me | no | yes | 1 | services/api/routes.ts:244 |
| api-160 | GET | /user-activity/device-limit | no | yes | 1 | services/api/routes.ts:245 |
| api-161 | GET | /discovery/home | yes | yes | 1 | services/api/routes.ts:250, services/api/discovery.ts:28 |
| api-162 | GET | /discovery/category/{id} | yes | yes | 1 | services/api/routes.ts:252, services/api/discovery.ts:59 |
| api-163 | GET | /discovery/related | yes | yes | 1 | services/api/routes.ts:253, services/api/discovery.ts:71 |
| api-164 | GET | /discovery/trending | yes | yes | 1 | services/api/routes.ts:254, services/api/discovery.ts:83 |
| api-165 | GET | /notifications/in-app | no | yes | 1 | services/api/routes.ts:262 |
| api-166 | PATCH | /notifications/in-app/{id}/read | yes | yes | 1 | services/api/routes.ts:263, services/api/notifications.ts:136 |
| api-167 | GET | /notifications/in-app/unread/count | no | yes | 1 | services/api/routes.ts:264 |
| api-168 | GET | / | no | yes | 1 | services/api/routes.ts:269 |
| api-169 | GET | /health | no | yes | 1 | services/api/routes.ts:270 |
| api-170 | GET | /news/v1/health | no | yes | 1 | services/api/routes.ts:271 |
| api-171 | GET | /content/health | no | yes | 1 | services/api/routes.ts:272 |
| api-172 | GET | /engagement/health | no | yes | 1 | services/api/routes.ts:273 |
| api-173 | GET | /base/health | no | yes | 1 | services/api/routes.ts:274 |
| api-174 | GET | /categories/health | no | yes | 1 | services/api/routes.ts:275 |
| api-175 | GET | /insights/health | no | yes | 1 | services/api/routes.ts:276 |
| api-176 | GET | /rewards/health | no | yes | 1 | services/api/routes.ts:277 |
| api-177 | GET | /user-activity/health | no | yes | 1 | services/api/routes.ts:278 |
| api-178 | GET | /screens/news/{uid} | yes | yes | 2 | services/api/routes.ts:283, services/api/screens.ts:153 |
| api-179 | GET | /screens/home | yes | yes | 2 | services/api/routes.ts:284, services/api/screens.ts:166 |
| api-180 | GET | /screens/profile | yes | yes | 2 | services/api/routes.ts:285, services/api/screens.ts:204 |
| api-181 | GET | /screens/community | yes | yes | 2 | services/api/routes.ts:286, services/api/screens.ts:264 |
| api-182 | GET | /screens/shorts | yes | yes | 2 | services/api/routes.ts:287, services/api/screens.ts:301 |
| api-183 | GET | /screens/discover | yes | yes | 2 | services/api/routes.ts:288, services/api/screens.ts:312 |
| api-184 | GET | /screens/local | yes | yes | 2 | services/api/routes.ts:289, services/api/screens.ts:329 |
| api-185 | GET | /screens/notifications | yes | yes | 2 | services/api/routes.ts:290, services/api/screens.ts:340 |
| api-186 | POST | /news/{videoId}/view | yes | yes | 1 | app/(tabs)/shorts.tsx:33 |
| api-187 | GET | /<unknown> | yes | yes | 1 | backend/admin-portal/src/api/client.js:42, scripts/api-audit.cjs:693 |
| api-188 | HEAD | /docs | yes | yes | 1 | backend/admin-portal/src/api/client.js:61 |
| api-189 | GET | /admin/settings/export/news{q} | yes | yes | 1 | backend/admin-portal/src/api/client.js:1077 |
| api-190 | GET | /admin/settings/export/users?format=csv | yes | yes | 1 | backend/admin-portal/src/api/client.js:1096 |

## Coverage gaps

- kind=registry-only-route; alias=auth.unregisterDevice; method=DELETE; path=/user/device/token/unregister; source=services/api/routes.ts:12; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=user.preferences; method=PUT; path=/user/preferences/me; source=services/api/routes.ts:20; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=user.preferences; method=DELETE; path=/user/preferences/me; source=services/api/routes.ts:20; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=news.byCategory; method=GET; path=/news/v1/news/category/{id}; source=services/api/routes.ts:37; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=news.related; method=GET; path=/news/v1/news/{uid}/related; source=services/api/routes.ts:38; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=news.weeklyStats; method=GET; path=/news/v1/news/analytics/weekly; source=services/api/routes.ts:58; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=news.dailyStats; method=GET; path=/news/v1/news/analytics/daily; source=services/api/routes.ts:59; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=news.topPerforming; method=GET; path=/news/v1/news/analytics/top; source=services/api/routes.ts:60; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=content.events; method=GET; path=/content/events; source=services/api/routes.ts:87; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=content.events; method=POST; path=/content/events; source=services/api/routes.ts:87; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=content.eventById; method=GET; path=/content/events/{uid}; source=services/api/routes.ts:88; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=content.polls; method=POST; path=/content/polls; source=services/api/routes.ts:91; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=content.pollById; method=GET; path=/content/polls/{uid}; source=services/api/routes.ts:92; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=content.updatePoll; method=PUT; path=/content/polls/{id}; source=services/api/routes.ts:95; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=content.newsShorts; method=POST; path=/content/news-shorts; source=services/api/routes.ts:98; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=content.tags; method=GET; path=/content/tags; source=services/api/routes.ts:101; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=content.tagContent; method=GET; path=/content/tags/{name}/content; source=services/api/routes.ts:102; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=content.assignTags; method=POST; path=/content/{type}/{id}/tags; source=services/api/routes.ts:103; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=content.flagContent; method=POST; path=/content/{type}/{id}/flag; source=services/api/routes.ts:106; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=content.analytics; method=GET; path=/content/analytics/{type}/{id}; source=services/api/routes.ts:110; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=content.stats; method=GET; path=/content/stats; source=services/api/routes.ts:111; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=content.quickStats; method=GET; path=/content/quick-stats; source=services/api/routes.ts:112; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=content.targetingOptions; method=GET; path=/content/targeting-options; source=services/api/routes.ts:113; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=content.targetingOptions; method=OPTIONS; path=/content/targeting-options; source=services/api/routes.ts:113; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=content.overview; method=GET; path=/content/overview; source=services/api/routes.ts:114; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=engagement.summary; method=GET; path=/engagement/summary/{uid}; source=services/api/routes.ts:132; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=rewards.me; method=GET; path=/rewards/me; source=services/api/routes.ts:161; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=rewards.badges; method=GET; path=/rewards/badges; source=services/api/routes.ts:162; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=rewards.referral; method=GET; path=/rewards/referral; source=services/api/routes.ts:163; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=rewards.leaderboard; method=GET; path=/rewards/leaderboard; source=services/api/routes.ts:164; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=rewards.bingo; method=GET; path=/rewards/bingo; source=services/api/routes.ts:167; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=rewards.claimBingo; method=POST; path=/rewards/bingo/claim; source=services/api/routes.ts:168; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=rewards.bingoLeaderboard; method=GET; path=/rewards/bingo/leaderboard; source=services/api/routes.ts:169; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=rewards.dailyLogin; method=POST; path=/rewards/daily-login; source=services/api/routes.ts:172; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=rewards.todayChallenge; method=GET; path=/rewards/challenge/today; source=services/api/routes.ts:173; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=rewards.claimChallenge; method=POST; path=/rewards/challenge/{id}/claim; source=services/api/routes.ts:174; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=rewards.earnRead; method=POST; path=/rewards/earn/read; source=services/api/routes.ts:177; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=rewards.earnShare; method=POST; path=/rewards/earn/share; source=services/api/routes.ts:178; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=rewards.earnComment; method=POST; path=/rewards/earn/comment; source=services/api/routes.ts:179; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=rewards.earnLike; method=POST; path=/rewards/earn/like; source=services/api/routes.ts:180; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=rewards.earnBookmark; method=POST; path=/rewards/earn/bookmark; source=services/api/routes.ts:181; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=rewards.useReferral; method=POST; path=/rewards/use-referral; source=services/api/routes.ts:184; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=rewards.rewardedAd; method=POST; path=/rewards/ad/rewarded; source=services/api/routes.ts:187; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=rewards.transactions; method=GET; path=/rewards/transactions; source=services/api/routes.ts:190; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=rewards.info; method=GET; path=/api/v1/rewards/info; source=services/api/routes.ts:191; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=insights.list; method=GET; path=/insights/; source=services/api/routes.ts:196; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=insights.create; method=POST; path=/insights/; source=services/api/routes.ts:197; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=insights.createWithUrls; method=POST; path=/insights/create; source=services/api/routes.ts:198; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=insights.byUid; method=GET; path=/insights/uid/{uid}; source=services/api/routes.ts:199; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=insights.byUid; method=DELETE; path=/insights/uid/{uid}; source=services/api/routes.ts:199; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=insights.byUid; method=PATCH; path=/insights/uid/{uid}; source=services/api/routes.ts:199; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=insights.byCategory; method=GET; path=/insights/{name}; source=services/api/routes.ts:200; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=insights.popular; method=GET; path=/insights/stats/popular; source=services/api/routes.ts:201; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=insights.share; method=POST; path=/insights/share; source=services/api/routes.ts:202; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=insights.shareById; method=POST; path=/insights/share/{id}; source=services/api/routes.ts:203; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=insights.categories; method=GET; path=/insights/categories; source=services/api/routes.ts:204; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=posts.byId; method=POST; path=/posts/{uid}; source=services/api/routes.ts:211; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=posts.updatePost; method=POST; path=/posts/{uid}; source=services/api/routes.ts:212; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=posts.deletePost; method=POST; path=/posts/{uid}; source=services/api/routes.ts:213; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=posts.editHashtags; method=POST; path=/posts/{uid}/hashtags; source=services/api/routes.ts:215; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=posts.comments; method=POST; path=/posts/{uid}/comments; source=services/api/routes.ts:218; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=userActivity.sessions; method=GET; path=/user-activity/sessions; source=services/api/routes.ts:239; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=userActivity.killSession; method=DELETE; path=/user-activity/sessions/{hash}; source=services/api/routes.ts:240; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=userActivity.killAllSessions; method=POST; path=/user-activity/sessions/kill-all; source=services/api/routes.ts:241; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=userActivity.activities; method=GET; path=/user-activity/activities/me; source=services/api/routes.ts:242; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=userActivity.securityEvents; method=GET; path=/user-activity/activities/security-events; source=services/api/routes.ts:243; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=userActivity.stats; method=GET; path=/user-activity/stats/me; source=services/api/routes.ts:244; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=userActivity.deviceLimit; method=GET; path=/user-activity/device-limit; source=services/api/routes.ts:245; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=inAppNotifications.list; method=GET; path=/notifications/in-app; source=services/api/routes.ts:262; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=inAppNotifications.unreadCount; method=GET; path=/notifications/in-app/unread/count; source=services/api/routes.ts:264; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=health.root; method=GET; path=/; source=services/api/routes.ts:269; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=health.main; method=GET; path=/health; source=services/api/routes.ts:270; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=health.news; method=GET; path=/news/v1/health; source=services/api/routes.ts:271; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=health.content; method=GET; path=/content/health; source=services/api/routes.ts:272; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=health.engagement; method=GET; path=/engagement/health; source=services/api/routes.ts:273; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=health.base; method=GET; path=/base/health; source=services/api/routes.ts:274; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=health.categories; method=GET; path=/categories/health; source=services/api/routes.ts:275; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=health.insights; method=GET; path=/insights/health; source=services/api/routes.ts:276; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=health.rewards; method=GET; path=/rewards/health; source=services/api/routes.ts:277; message=No matching implementation call was discovered.
- kind=registry-only-route; alias=health.userActivity; method=GET; path=/user-activity/health; source=services/api/routes.ts:278; message=No matching implementation call was discovered.
- kind=unmatched-network-call; source=app/(tabs)/shorts.tsx:33; method=POST; path=/news/{videoId}/view; message=Network call has no API_ROUTES registry reference.
- kind=unmatched-network-call; source=backend/admin-portal/src/api/client.js:42; method=GET; path=/<unknown>; message=Network call has no API_ROUTES registry reference.
- kind=unmatched-network-call; source=backend/admin-portal/src/api/client.js:61; method=HEAD; path=/docs; message=Network call has no API_ROUTES registry reference.
- kind=unmatched-network-call; source=backend/admin-portal/src/api/client.js:1077; method=GET; path=/admin/settings/export/news{q}; message=Network call has no API_ROUTES registry reference.
- kind=unmatched-network-call; source=backend/admin-portal/src/api/client.js:1096; method=GET; path=/admin/settings/export/users?format=csv; message=Network call has no API_ROUTES registry reference.
- kind=unmatched-network-call; source=scripts/api-audit.cjs:693; method=GET; path=/<unknown>; message=Network call has no API_ROUTES registry reference.

## Failed and blocked details

### BLOCKED — /user/auth/google — invalid-placeholder POST safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /user/auth/firebase/login — invalid-placeholder POST safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /user/auth/refresh — invalid-placeholder POST safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /user/auth/logout — invalid-token POST safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /user/auth/switch-to-publisher — invalid-token POST safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /user/device/token/register — invalid-token POST safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /user/device/token/unregister — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /user/users/me — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /user/users/me — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /user/users/me — invalid-token PATCH safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /user/users/me/publisher-eligibility — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /user/users/me/publisher-eligibility — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /user/users/me/suspension-status — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /user/users/me/suspension-status — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /user/preferences/me — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /user/preferences/me — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /user/preferences/me — invalid-token POST safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /user/preferences/me — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /user/preferences/me — invalid-token PATCH safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /user/preferences/me — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /user/dashboardnew — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /user/dashboardnew — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /user/dashboard/engagement — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /user/dashboard/engagement — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /news/v1/feed — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /news/v1/news — invalid-token POST safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /news/v1/news/{uid} — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /news/v1/news/{uid} — invalid-token PUT safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /news/v1/user/news/{uid} — invalid-token DELETE safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /news/v1/news/breaking — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /news/v1/news/popular — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /news/v1/news/analytics/trending — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /news/v1/news/location — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /news/v1/news/category/{id} — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /news/v1/news/{uid}/related — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /news/v1/search — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /content/news-shorts — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /shorts/feed — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /news/v1/news/{uid}/engagement — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /news/v1/news/{uid}/engagement — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /news/v1/user/news/{uid}/like — invalid-token POST safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /news/v1/user/news/{uid}/like — invalid-token DELETE safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /news/v1/user/news/{uid}/view — invalid-token POST safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /news/v1/user/news/{uid}/share — invalid-token POST safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /news/v1/news/{uid}/comments — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /news/v1/user/news/{uid}/comment — invalid-token POST safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /news/v1/user/news/{uid}/comment/{id} — invalid-token DELETE safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /news/v1/news/analytics/weekly — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /news/v1/news/analytics/daily — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /news/v1/news/analytics/top — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /categories/ — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /categories/menu — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /categories/all — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /categories/{id}/news — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /content/advertisements/active — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /content/advertisements/{id} — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /content/advertisements — invalid-token POST safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /content/advertisements/{id} — invalid-token PUT safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /content/advertisements/{id}/toggle-status — invalid-token POST safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /content/sponsored-posts/active — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /content/sponsored-posts — invalid-token POST safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /content/sponsored-posts/{id} — invalid-token PUT safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /content/sponsored-posts/pending — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /content/events — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /content/events — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /content/events/{uid} — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /content/polls — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /content/polls/{uid} — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /content/polls/active — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /content/polls/vote — invalid-token PUT safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /content/polls/{id} — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /content/news-shorts — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /content/tags — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /content/tags/{name}/content — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /content/{type}/{id}/tags — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /content/{type}/{id}/flag — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /content/search — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /content/analytics/{type}/{id} — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /content/stats — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /content/quick-stats — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /content/targeting-options — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /content/targeting-options — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /content/overview — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /engagement/bookmarks — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /engagement/bookmarks — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /engagement/bookmarks — invalid-token POST safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /engagement/bookmarks — invalid-token DELETE safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /engagement/bookmarks/check — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /engagement/bookmarks/check — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /engagement/notifications — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /engagement/notifications — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /engagement/notifications/unread/count — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /engagement/notifications/unread/count — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /engagement/notifications/{id}/read — invalid-token PATCH safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /engagement/notifications/read-all — invalid-token PATCH safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /engagement/notifications/{id} — invalid-token DELETE safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /engagement/notifications/clear — invalid-token DELETE safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /engagement/summary/{uid} — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /base/languages — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /base/languages/{id} — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /base/states — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /base/states/{id} — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /base/hierarchy/states/{id} — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /base/states/{id}/language — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /base/districts — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /base/districts/{id} — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /base/cities — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /base/cities/{id} — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /base/search — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /rewards/me — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /rewards/badges — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /rewards/referral — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /rewards/leaderboard — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /rewards/bingo — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /rewards/bingo/claim — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /rewards/bingo/leaderboard — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /rewards/daily-login — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /rewards/challenge/today — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /rewards/challenge/{id}/claim — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /rewards/earn/read — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /rewards/earn/share — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /rewards/earn/comment — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /rewards/earn/like — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /rewards/earn/bookmark — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /rewards/use-referral — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /rewards/ad/rewarded — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /rewards/transactions — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /api/v1/rewards/info — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /insights/ — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /insights/ — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /insights/create — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /insights/uid/{uid} — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /insights/uid/{uid} — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /insights/uid/{uid} — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /insights/{name} — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /insights/stats/popular — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /insights/share — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /insights/share/{id} — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /insights/categories — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /posts/ — invalid-token POST safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /posts/feed — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /posts/{uid} — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /posts/{uid} — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /posts/{uid} — invalid-token PUT safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /posts/{uid} — invalid-token DELETE safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /posts/user/{uid} — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /posts/user/{uid} — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /posts/{uid}/hashtags — invalid-token PATCH safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /posts/{uid}/hashtags — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /posts/{uid}/like — invalid-token POST safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /posts/{uid}/comment — invalid-token POST safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /posts/{uid}/comments — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /posts/{uid}/comments — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /posts/{uid}/share — invalid-token POST safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /posts/hashtags/trending — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /posts/hashtags/suggestions — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /posts/hashtag/{name}/posts — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /follow/{uid} — invalid-token POST safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /follow/{uid} — invalid-token DELETE safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /follow/followers/{uid} — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /follow/followers/{uid} — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /follow/following/{uid} — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /follow/following/{uid} — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /follow/suggestions — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /follow/suggestions — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /follow/status/{uid} — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /follow/status/{uid} — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /follow/counts/{uid} — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /follow/counts/{uid} — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /follow/feed/posts — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /follow/feed/posts — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /user-activity/sessions — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /user-activity/sessions/{hash} — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /user-activity/sessions/kill-all — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /user-activity/activities/me — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /user-activity/activities/security-events — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /user-activity/stats/me — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /user-activity/device-limit — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /discovery/home — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /discovery/category/{id} — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /discovery/related — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /discovery/trending — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /notifications/in-app — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /notifications/in-app/{id}/read — invalid-token PATCH safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /notifications/in-app/unread/count — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — / — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /health — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /news/v1/health — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /content/health — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /engagement/health — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /base/health — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /categories/health — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /insights/health — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /rewards/health — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /user-activity/health — registry-only/not exercised
- Expected: BLOCKED: registry-only endpoint is not exercised.
- Actual: coverage (Registry-only route; no implementation call was discovered, so it was not exercised.)
- Error details: Registry-only route; no implementation call was discovered, so it was not exercised.
- Suggested fix: Implement the route call or document why this registry-only route is intentionally unused.
### BLOCKED — /screens/news/{uid} — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /screens/news/{uid} — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /screens/home — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /screens/home — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /screens/profile — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /screens/profile — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /screens/community — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /screens/community — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /screens/shorts — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /screens/shorts — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /screens/discover — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /screens/discover — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /screens/local — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /screens/local — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /screens/notifications — unauthenticated GET safe read
- Expected: 401/403 for an unauthenticated protected read.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /screens/notifications — invalid-token GET safe read
- Expected: 401/403 for a protected read with an invalid token.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /news/{videoId}/view — invalid-token POST safe negative
- Expected: Safe negative must be rejected with 400/401/403/404/405/409/415/422/429; non-health 5xx is a backend failure.
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /<unknown> — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /docs — unauthenticated HEAD safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /admin/settings/export/news{q} — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.
### BLOCKED — /admin/settings/export/users?format=csv — unauthenticated GET safe read
- Expected: Reachable 2xx/3xx read response (JSON shape warnings do not fail the check).
- Actual: config (Dry run requested; network request was not sent.)
- Error details: Dry run requested; network request was not sent.
- Suggested fix: Rerun without --dry-run only against the intended API environment.

## Suggested backend fixes

- Rerun without --dry-run only against the intended API environment.
- Implement the route call or document why this registry-only route is intentionally unused.

## Commands to reproduce

```sh
npm run api-audit -- --dry-run
API_AUDIT_BASE_URL=https://api.example.test npm run api-audit
API_AUDIT_BASE_URL=https://api.example.test AUDIT_ACCESS_TOKEN="<process-only-token>" npm run api-audit
npm run api-audit -- --limit=5
```

