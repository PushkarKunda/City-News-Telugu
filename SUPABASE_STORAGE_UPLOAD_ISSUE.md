# Supabase Storage: Image Uploads Failing (403 RLS) — Action Required

**Date:** 2026-10-21
**Severity:** High — mobile app users cannot upload post/article images
**Owner:** Backend / Infrastructure team
**Project ref:** `ntjscrupxpsbodnlgjzp` (restored from paused/deleted state)
**Bucket:** `new-images`

---

## 1. Summary

The mobile app uploads post images, news-article covers, and profile avatars to
Supabase Storage using the **anon/publishable key** (the app uses its own JWT
auth and never signs in to Supabase Auth, so every upload runs as the `anon`
role).

After the project was **restored**, the `new-images` bucket was recreated
(public), but every upload from the app fails with:

```
📤 Uploading to: new-images/posts/1792572418335-9f402gkl.jpg
ERROR  ❌ Upload error: [StorageUnknownError: Network request failed]
ERROR  [Supabase] Upload failed: [Error: Upload failed: Network request failed]
WARN   [posts] Image upload failed: [Error: Upload failed: Network request failed]
```

Server-side, the same upload returns:

```json
HTTP 400
{
  "statusCode": "403",
  "error": "Unauthorized",
  "message": "new row violates row-level security policy",
  "code": "AccessDenied"
}
```

## 2. Root cause (verified)

**The `new-images` bucket has no `INSERT` policy for the `anon` role on
`storage.objects`.**

Turning on the **"Public bucket"** toggle only grants **read** access — it does
**not** grant insert/update/delete. With no permissive INSERT policy, Postgres
RLS denies every anon upload.

Evidence from live probes (2026-10-21):

| Probe | `ntjscrupxpsbodnlgjzp` (restored) | `aiordhlumxnifdzmgirw` (test project, working) |
|---|---|---|
| `GET /storage/v1/version` | 200 | 200 |
| Anon auth (storage API) | OK — reaches RLS check | OK |
| `POST /storage/v1/object/new-images/<file>` | **403 RLS violation** | **200 OK** |
| Public read of an object | 404 `NoSuchKey` (bucket exists) | 200 |

Both the classic anon JWT key and the new `sb_publishable_` key behave the
same — this is **not a key problem**.

## 3. Fix (run in project `ntjscrupxpsbodnlgjzp`)

**SQL Editor → New query → Run:**

```sql
create policy "anon can upload images"
on storage.objects for insert to anon, authenticated
with check (bucket_id = 'new-images');
```

Expected result: `Success. No rows returned`

> If it errors with `policy "anon can upload images" already exists`, an old
> policy exists but doesn't match the bucket name — see §5.

## 4. Verification

Run after applying the fix:

```sql
-- Should return exactly one INSERT policy for anon/authenticated
select policyname, roles, cmd, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and cmd = 'INSERT';
```

Or via API (replace `<ANON_KEY>` with the anon key from the app `.env`):

```bash
curl -X POST \
  "https://ntjscrupxpsbodnlgjzp.supabase.co/storage/v1/object/new-images/__healthcheck.txt" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: text/plain" \
  --data "ok"
# Expect: HTTP 200 {"Key":"new-images/__healthcheck.txt", ...}
```

## 5. Troubleshooting

| Symptom | Cause |
|---|---|
| `403 new row violates row-level security policy` | No INSERT policy, or policy targets the wrong role (`authenticated` only — app also uploads while logged out → needs `anon` too) |
| `404 Bucket not found` | Bucket name mismatch — must be exactly `new-images` (no spaces/case differences) |
| Policy "already exists" error | A similarly named policy exists; check `select * from pg_policies where schemaname='storage';` and either drop it or adjust |
| SQL ran but 403 persists | SQL was executed in a **different project** (check dashboard URL contains `/project/ntjscrupxpsbodnlgjzp/`) |

## 6. Context notes for the team

- **App config** lives in the mobile repo `D:\A\.env`:
  ```
  EXPO_PUBLIC_SUPABASE_URL=https://ntjscrupxpsbodnlgjzp.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key — same value as Supabase dashboard>
  EXPO_PUBLIC_SUPABASE_BUCKET=new-images
  ```
- The app uploads via `@supabase/supabase-js` v2.107 with the anon key only —
  **no Supabase Auth session exists**, so RLS sees role `anon` on every upload.
- Upload paths used by the app: `new-images/posts/…`, `new-images/news/…`,
  `new-images/profile/…`
- After upload, images are served as **public URLs**:
  `https://ntjscrupxpsbodnlgjzp.supabase.co/storage/v1/object/public/new-images/<path>`
  and these URLs are stored in the app database (`news.image_url`,
  `posts.image_url`, `users.profile_picture`) — **the bucket must stay public**
  or all previously stored images will break.
- **Old files survived the restore** (`news/`, `profile/` folders are present).
  Once the INSERT policy is added, both new uploads and old image URLs work.
- The `anon` role has no `DELETE` permission — intentional; cleanup is done from
  the dashboard.

## 7. Related incident (already fixed, for context)

Earlier the app pointed at project ref `ntjscrupxpsbodnlgjzp` while it was
paused/deleted → DNS returned `NXDOMAIN` → React Native surfaced
`Network request failed`. The project has since been restored (DNS resolves
again). A temporary project (`aiordhlumxnifdzmgirw`) was used meanwhile and can
be deleted once this fix is verified.

---

**Ask:** apply §3, verify with §4, and reply so the mobile side can re-test the
image upload flow end-to-end.
