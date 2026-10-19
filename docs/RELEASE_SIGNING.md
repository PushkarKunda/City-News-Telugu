# 🔐 Android Release Signing (Keystore)

> Addresses **Audit Issue #4 (CRITICAL)** — release builds must never be signed with
> the public `debug.keystore`. Google Play Console rejects debug-signed artifacts, and
> a committed debug key lets anyone forge app updates.

---

## Current state of the code (already in place)

`android/app/build.gradle` is hardened:

- A `release` signing config is built from environment variables / gradle properties:
  - `MYAPP_RELEASE_STORE_FILE`
  - `MYAPP_RELEASE_STORE_PASSWORD`
  - `MYAPP_RELEASE_KEY_ALIAS`
  - `MYAPP_RELEASE_KEY_PASSWORD`
- **There is no debug fallback.** If the four values are absent, the release
  `signingConfig` is left unset, so a release build fails/produces an unsigned
  artifact instead of silently shipping debug-signed.
- `.gitignore` already excludes `*.jks` and `*.keystore` (the committed
  `android/app/debug.keystore` is debug-only and fine to keep).

**What's left is manual: generate the key, keep it secret, and register its
fingerprints.** That is this document.

---

## Step 1 — Generate the upload keystore (one-time)

Run this on your own machine (not in the repo folder). Requires a JDK (`keytool`).

```bash
keytool -genkeypair -v \
  -keystore ~/keys/city-news-upload.keystore \
  -alias citynews-upload \
  -keyalg RSA -keysize 4096 -validity 10000
```

- Use a **strong, unique password** and store it in a password manager.
- The file will be **gitignored**, but still keep it **outside the repo** and back
  it up offline (Google Drive/USB). **Losing this key means you can never update
  your app again** (unless you enroll in Play App Signing and still hold the upload key).
- Prefer **Google Play App Signing** (recommended when you first publish): Play
  generates and holds the *app signing key*; you only manage the *upload key*.
  Play Console will offer enrollment during first release.

Record the fingerprints Firebase/Google Cloud will need:

```bash
keytool -list -v \
  -keystore ~/keys/city-news-upload.keystore \
  -alias citynews-upload | grep -E "SHA1|SHA256"
```

## Step 2 — Choose a build path

### Path A — EAS cloud builds (recommended)

EAS stores your credentials remotely (the `production` profile has
`"credentialsSource": "remote"` in `eas.json`) and signs the artifact with them —
`MYAPP_RELEASE_*` do **not** need to exist in the cloud build environment.

```bash
# one-time: upload/generate credentials for the com.hypernews.app application
eas credentials --platform android
# then build
eas build --platform android --profile production
```

### Path B — Local Gradle builds

Point Gradle at your keystore via environment variables (PowerShell example):

```powershell
$env:MYAPP_RELEASE_STORE_FILE  = "C:\keys\city-news-upload.keystore"
$env:MYAPP_RELEASE_KEY_ALIAS   = "citynews-upload"
$env:MYAPP_RELEASE_STORE_PASSWORD = "<password>"
$env:MYAPP_RELEASE_KEY_PASSWORD  = "<password>"

cd android
.\gradlew.bat assembleRelease
```

Alternatively put the four values in `android/gradle.properties` (never commit them)
using the same `MYAPP_RELEASE_*` names — `build.gradle` reads project properties too.

## Step 3 — Register the release SHA-1 (required for Google Sign-In)

Google Sign-In is bound to the **signing certificate**. Your `google-services.json`
currently matches the **debug** SHA-1 (`5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`).
The production build will carry the **release** SHA-1 from Step 1.

1. Firebase Console → Project settings → Your Android app (`com.hypernews.app`)
2. Add the **release SHA-1** (keep the debug SHA-1 too, for dev builds)
3. Re-download `google-services.json` and replace the one in the repo root
   (also update `GoogleService-Info.plist` only if you change iOS config)

> Skipping this causes `DEVELOPER_ERROR` (code 10) on Google Sign-In in release
> builds — the message in `hooks/useGoogleFirebaseAuth.ts` exists precisely for this.

## Step 4 — Verify an artifact before submitting

```bash
# APK
$ANDROID_HOME/build-tools/<version>/apksigner verify --print-certs app-release.apk

# or inspect the keystore you configured
keytool -list -keystore <store> -alias <alias>
```

Confirm the certificate fingerprint equals the **release** one from Step 1 —
not the debug cert (`CN=Android Debug`).

---

## Security rules

- ❌ Never commit the keystore or its passwords (`*.jks`/`*.keystore` are gitignored; keep passwords out of `eas.json` and `gradle.properties` in git)
- ❌ Never fall back to `signingConfigs.debug` for release — the build is designed to fail instead
- ✅ Back up the keystore + password offline; treat loss as a business incident
- ✅ Use Play App Signing so Google holds the app-signing key
