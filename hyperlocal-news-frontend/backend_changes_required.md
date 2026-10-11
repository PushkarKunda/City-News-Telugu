# Backend Changes Required

This document records the backend work that should be implemented for
`PushkarKunda/HyperNews-Backend`. The backend source and tests were left
unchanged in this session.

## 1. Deployment and migration execution

- Point Railway at `PushkarKunda/HyperNews-Backend`, branch `main`.
- Redeploy the current commit and verify `/openapi.json` and the Google auth
  routes after deployment.
- Add a formal Alembic migration for the `users` columns used by provider auth:
  - `google_id VARCHAR(128)` with a unique index
  - `auth_provider VARCHAR(50)`
  - `providers VARCHAR(255)`
  - `email_verified_at TIMESTAMP WITH TIME ZONE`
- Run `alembic upgrade head` as a Railway release step or before starting API
  workers. `init_db()` currently returns early in production, so production
  schema changes must not depend on `init_db()` or `ensure_user_columns()`.
- Confirm Railway environment variables include `DATABASE_URL`, `SECRET_KEY`,
  `SESSION_SECRET_KEY`, `CORS_ALLOW_ORIGINS`, and Firebase credentials.

## 2. Provider account-linking security

Affected code: `routes/user_routes.py` (`firebase_login`, `firebase_login1`,
and `sync_provider`).

- Match an existing account by verified provider identity first:
  `firebase_uid`, then `google_id`.
- Match by email only when the verified Firebase token contains
  `email_verified == True`. Never fall back to an unverified email match.
- If an unverified provider email belongs to an existing account, reject the
  request with a clear `409` response instead of attempting to create or link
  an account.
- Do not treat stored `google_id`, `auth_provider`, or `providers` values by
  themselves as proof of email verification. Use the persisted verified state
  established from a validated provider token.
- Add tests covering an existing account plus an unverified provider email and
  assert that no provider identity is attached.

## 3. CORS headers

In production `main.py`, add these headers to `CORSMiddleware.allow_headers`:

```python
"Idempotency-Key",
"X-Idempotency-Key",
"X-Client-Version",
```

Verify an `OPTIONS` preflight for comments, likes, and creation requests.

## 4. Atomic and idempotent news likes

Affected code: `routes/news_routes.py` like endpoint.

- Keep the database unique constraint for one reaction per user/content/type.
- Replace the check-then-insert-only flow with PostgreSQL
  `INSERT ... ON CONFLICT DO NOTHING`, or catch `IntegrityError` around the
  insert, roll back, and return the current like state.
- Increment `News.likes_count` atomically with a SQL expression to avoid lost
  updates from concurrent users.
- Make repeated likes return a successful idempotent response rather than a
  server error.
- Add endpoint-specific rate limiting for like/unlike operations.
- Add a regression test for two concurrent like attempts.

## 5. Correct `user_liked` feed state

- Update `get_news_data` to accept the current viewer or a precomputed set of
  reaction IDs.
- Include `user_liked` both at the article level and in the engagement object
  for authenticated feed requests; return `False` for guests.
- Replace hardcoded `"user_liked": False` values in update and scheduled-publish
  responses with a real reaction lookup.
- Add a feed test that creates a reaction and verifies the next feed response
  reports `user_liked: true`.

## 6. Bound production database reads

- Change bulk notification delivery to count users and process them with
  bounded batches such as `yield_per(500)`.
- Add explicit maximum limits to admin news/user exports and document that
  large exports should use an asynchronous job or streaming response.
- Review every remaining `.all()` in admin/export/background routes and either
  add pagination or process rows in chunks.
- Keep public feed routes paginated with a hard maximum limit.

## 7. Secret removal and rotation

- Remove the committed JWT fallback from
  `admin-portal/src/api/client.js`.
- Require an explicitly configured admin token through an environment-backed
  login/session flow; do not silently authenticate with a default token.
- Rotate the exposed JWT immediately in the signing/production environment.
- Keep `POSTGRES_PASSWORD` and all database credentials environment-only.
- Check repository history and deployment variables for copies of the exposed
  token before redeploying.

## 8. Gemini SDK migration

- Replace `google.generativeai` with `from google import genai`.
- Use a `genai.Client(api_key=...)` and
  `client.models.generate_content(...)` for all summarization calls.
- Replace `google-generativeai` with `google-genai` in both requirements files.
- Run a smoke test with `GEMINI_API_KEY` configured and confirm the startup
  warning is gone.

## 9. Verification checklist

Run after implementation:

```bash
python -m py_compile main.py routes/user_routes.py routes/news_routes.py
alembic upgrade head
pytest -q
```

Then verify in the deployed environment:

1. `POST /user/auth/google` returns a non-404 response.
2. `POST /user/auth/sync-provider` rejects unverified email linking.
3. Production CORS preflight allows idempotency headers.
4. Concurrent likes do not return HTTP 500.
5. Authenticated feeds preserve liked state.
6. The deployed OpenAPI document matches the current repository routes.
