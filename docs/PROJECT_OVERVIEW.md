# 🏛️ City News Telugu — Project Overview
**Confidential | Internal Engineering Documentation**  
**Product:** City News Telugu (`PushkarKunda/City-News-Telugu`)  
**Date:** October 2026  

---

## Executive Summary: The Big Picture First

**City News Telugu** is a next-generation **Hyperlocal News and Community Engagement mobile platform** built specifically for regional language audiences (with primary focus on Telugu-speaking demographics across Telangana and Andhra Pradesh).

While legacy media platforms focus predominantly on national and state-level headlines, our platform bridges the **hyperlocal information deficit** by delivering real-time, geo-targeted news down to District, City, and neighborhood Locality levels. The application integrates modern media consumption patterns—including vertical video shorts, participatory civic polls, community discussions, and localized event listings—backed by a dedicated **Publisher Workspace** for verified grassroots journalists and stringers.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             CITY NEWS TELUGU ECOSYSTEM                           │
│                                                                                  │
│   ┌─────────────────────┐    ┌─────────────────────┐    ┌────────────────────┐   │
│   │   Mobile Readers    │    │ Community Reporters │    │ Civic Stakeholders │   │
│   │  (Citizens / Youth) │    │(Verified Publishers)│    │(Local Govt & Ads)  │   │
│   └──────────┬──────────┘    └──────────┬──────────┘    └─────────┬──────────┘   │
│              │                          │                         │              │
│   ┌──────────▼──────────────────────────▼─────────────────────────▼───────────┐   │
│   │                       CLIENT LAYER (React Native / Expo 52)               │   │
│   │   Geo-Feeds • Video Shorts • Civic Polls • Community Posts • Bookmarks    │   │
│   └─────────────────────────────────────┬─────────────────────────────────────┘   │
│                                         │ JWT / SecureStore                       │
│   ┌─────────────────────────────────────▼─────────────────────────────────────┐   │
│   │                     BACKEND GATEWAY (FastAPI / Railway)                   │   │
│   │        Auth & Tokens • News Engine • Engagement Services • Analytics      │   │
│   └───────────────┬─────────────────────────────┬─────────────────────────────┘   │
│                   │                             │                                 │
│   ┌───────────────▼──────────────┐   ┌──────────▼──────────────┐   ┌──────────────▼─────┐
│   │ Managed PostgreSQL (Railway) │   │ Firebase Native Auth    │   │ Supabase Storage   │
│   │ (Relational Data & Feeds)    │   │ (SMS OTP + Google Auth) │   │ (`new-images`)     │
│   └──────────────────────────────┘   └─────────────────────────┘   └────────────────────┘
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Current Status Snapshot
- **Frontend Readiness:** **~88%**. Polished UI/UX with custom Design Tokens, light/dark themes, accessibility scaling, and full feature coverage across tabs.
- **Backend Readiness:** **~75%**. Core REST endpoints implemented (~70 routes); immediate priority is resolving production deployment synchronization and schema migrations on Railway.
- **Immediate Milestone:** Complete Phase 3 Security & Stability Hardening to unblock production App Store and Google Play Store submissions.

---

## 1. Project Overview & Strategic Goals

### 1.1 The Core Problem
1. **The Regional Information Gap:** Conventional broadcast news overlooks ward-level infrastructure issues, neighborhood civic polls, and localized emergency alerts.
2. **Grassroots Reporter Disenfranchisement:** Independent local stringers and verified citizen journalists lack a structured, authenticated distribution and monetization pipeline.
3. **Language & Interface Friction:** Regional mobile users are often subjected to clunky web wrappers with subpar typography and slow loading speeds.

### 1.2 Core Value Proposition
- **High-Fidelity Hyperlocal Feeds:** Dynamic filtering by State (Telangana / Andhra Pradesh), District, and City.
- **Snackable Video Shorts:** Full-screen vertical video feed catering to mobile-first content consumption.
- **Direct Civic Participation:** Instant voting in municipal polls, community discussions, and event discovery.
- **Multilingual Architecture:** Dynamic 6-language engine (Telugu, English, Hindi, Tamil, Spanish, French) built directly into the client.
- **Community Journalism Gateway:** Publisher dashboard enabling verified local journalists (Role $\ge$ 2) to draft, geo-tag, upload media, and publish stories.

### 1.3 Key Strategic Goals (FY 2026–2027)
1. **Launch on Google Play & iOS App Store:** Achieve a seamless launch with $\ge 99.5\%$ crash-free sessions.
2. **Establish Tier-1 Regional Presence:** Pilot rollout targeting Hyderabad, Vijayawada, Visakhapatnam, and Warangal.
3. **Onboard 500+ Verified Community Publishers:** Build a self-sustaining network of accredited local correspondents.
4. **Sub-second Feed Latency:** Achieve $<800\text{ms}$ average response time on 4G/5G mobile networks through client-side query caching and optimized media delivery.

---

## 2. Scope & Key Deliverables

| Deliverable | Description | Tech Components | Target State |
| :--- | :--- | :--- | :--- |
| **Cross-Platform Mobile App** | Production Android (.aab) & iOS (.ipa) applications targeting end-users and readers. | React Native 0.76, Expo SDK 52, Expo Router v4, Zustand 5, Reanimated 3 | Release Candidate stage; pending production signing & final audit fixes. |
| **Publisher Dashboard** | Self-publishing portal for verified community reporters to create articles, upload photos, and track metrics. | Expo Router `(publisher)` group, Supabase JS Storage, Zod forms | Functional; requires backend draft status reconciliation. |
| **Backend API Gateway** | Central REST API microservice handling authentication, news curation, engagement, and notifications. | FastAPI, SQLAlchemy, PostgreSQL, Python 3.11, Railway deployment | Functional on staging; requires deployment sync on Railway production. |
| **Media & Asset Pipeline** | Low-latency storage and compression for article imagery, reporter uploads, and short video streams. | Supabase Storage (`new-images`), Expo Image Manipulator, `expo-image` | Base64 uploads functional; direct binary blob optimization queued. |
| **Administrative & Moderation Tools** | Administrative control panel for user verification, reporter vetting, and content moderation. | FastAPI admin endpoints, React/JS admin portal (`admin-portal`) | Initial scaffolding complete; admin secret hardening underway. |
| **Motion Showcase & Marketing Suite** | Automated showcase generator and video teasers for marketing and stakeholder demonstrations. | Node.js, Puppeteer, FFmpeg, Canvas (`motion-showcase`) | Complete with 30-beat showcase video and contact sheets. |

---

## 3. Timeline & Major Milestones

```
  Phase 1: Architecture (Q1-Q2) ──► Phase 2: Feature Complete (Q3) ──► Phase 3: Hardening (NOW) ──► Phase 4: Release (Q4)
  [COMPLETED]                        [COMPLETED]                        [ACTIVE SPRINT]             [UPCOMING]
  • Expo 52 Managed Workflow        • 7-Step Onboarding Wizard        • Oct 8 Technical Audit     • Release signing (Keystore)
  • Design Token System             • Video Shorts Player              • Railway Repo Alignment    • EAS Production Builds
  • Zustand + React Query           • Community Posts & Polls         • DB Column Migrations      • Play Store & App Store Review
  • Geo-Filtering Core              • Publisher Portal Scaffolding    • Auth Security Patching    • Regional Launch (Hyd/VJA)
```

### Detailed Milestone Breakdown
- **Milestone 1: Core Foundation (Completed)**
  - Setup unified design token engine (`Colors`, `Spacing`, `Typography` with Google Poppins).
  - Implemented Expo Router file-based typed routing and Zustand persistent state stores.
- **Milestone 2: Experience & Feature Integration (Completed)**
  - Shipped 7-step onboarding flow (Language $\rightarrow$ Location $\rightarrow$ District $\rightarrow$ City $\rightarrow$ Interests $\rightarrow$ Feed Initialization).
  - Built vertical Video Shorts feed, community neighbor posts, dynamic comments bottom sheet, and bookmarking engine.
- **Milestone 3: Security, Deployments & Audit Remediation (Current Phase — October 2026)**
  - Addressed findings from the **October 8 Full Technical Audit**.
  - Railway deployment branch synchronization (`PushkarKunda/HyperNews-Backend:main`).
  - Account-linking security hardening (`email_verified == True` enforcement).
  - Production Android keystore configuration and CORS preflight fixes.
- **Milestone 4: Store Submission & Production Launch (Target: Next 45–60 Days)**
  - Final EAS production build generation and automated end-to-end smoke testing.
  - Google Play Console and Apple App Store review submission.
  - Phase 1 pilot launch in Hyderabad and Vijayawada.

---

## 4. Current Status & Progress

### 4.1 What Is Complete & Production-Grade
- **User Onboarding & Geolocation:** Smooth location selection hierarchy supporting Telangana & Andhra Pradesh districts down to specific mandals/cities.
- **Feed & Reading Experience:** Geo-targeted home feed with pull-to-refresh, watermark branding, category filtering, bookmarking, and native share sheets.
- **Dynamic Theming & Accessibility:** Automatic Light/Dark mode synchronization with system preferences, alongside in-app text scaling for senior/regional readers.
- **Visual Micro-Interactions:** Hardware-accelerated Reanimated transitions, Lottie celebratory animations, and skeleton loading screens.
- **Authentication Framework:** Client-side Firebase Phone OTP and Google Sign-In with automated token exchange for backend JWT.

### 4.2 In-Flight Engineering Items
- **Backend Deployment Realignment:** Re-pointing Railway deployment source from legacy `RoshithNoorbasha/HyperNews` to `PushkarKunda/HyperNews-Backend:main`.
- **Database Schema Sync:** Applying formal Alembic migrations for `google_id`, `auth_provider`, and `email_verified_at` columns in production PostgreSQL.
- **Like/Engagement Concurrency:** Migrating like counters to atomic SQL statements (`INSERT ... ON CONFLICT DO NOTHING`) to prevent race conditions during traffic spikes.

---

## 5. Team Structure & Roles

```
                              ┌──────────────────────────────────────────┐
                              │    Managing Lead & Project Head          │
                              │  Strategy, Delivery, Governance, Roadmap │
                              └────────────────────┬─────────────────────┘
                                                   │
                 ┌─────────────────────────────────┴─────────────────────────────────┐
                 │                                                                   │
   ┌─────────────▼───────────────┐                                     ┌─────────────▼───────────────┐
   │    Technical Lead           │                                     │ Product & Operations        │
   │    (Pushkar Kunda)          │                                     │ Lead / Content Ops          │
   │ Architecture, Repo Owner,   │                                     │ Regional Editorial, Growth, │
   │ Frontend/Mobile Core        │                                     │ Publisher Vetting           │
   └─────────────┬───────────────┘                                     └─────────────┬───────────────┘
                 │                                                                   │
     ┌───────────┴───────────┐                                           ┌───────────┴───────────┐
     │                       │                                           │                       │
┌────▼──────────────┐ ┌──────▼─────────────┐                       ┌─────▼─────────────┐ ┌───────▼───────────┐
│ Mobile / Frontend │ │ Backend / Cloud    │                       │ Community Ops &   │ │ QA & Test         │
│ Engineers         │ │ Engineers          │                       │ Publisher Lead    │ │ Automation      │
│ React Native/Expo,│ │ FastAPI, DB Schema,│                       │ Journalist        │ │ Device Testing, │
│ UI/UX, Reanimated │ │ Railway, Firebase  │                       │ Relations & Moder.│ │ EAS Builds, Perf  │
└───────────────────┘ └────────────────────┘                       └───────────────────┘ └───────────────────┘
```

### Core Roles & Accountability Matrix (RACI)
- **Managing Lead & Project Head (Accountable):** Overall product delivery, cross-functional schedule adherence, risk management, and stakeholder alignment.
- **Technical Lead (Responsible):** System architecture, pull request governance, performance standards, and security compliance.
- **Mobile Engineering (Responsible):** Expo/RN code quality, UI component modularity, client caching, and native builds.
- **Backend Engineering (Responsible):** API uptime, database integrity, schema migrations, and secure token lifecycle.
- **QA & Release (Consulted/Informed):** Test plan execution, regression verification, and store release checklists.

---

## 6. Key Stakeholders & Clients

```
┌─────────────────────────────────┬──────────────────────────────────┬─────────────────────────────────┐
│ Stakeholder Group               │ Primary Interests & Expectations │ Communication / Touchpoint      │
├─────────────────────────────────┼──────────────────────────────────┼─────────────────────────────────┤
│ **Executive Leadership & Board**│ On-time launch, user acquisition,│ Bi-weekly executive dashboard,  │
│                                 │ budget adherence, product market │ milestone sign-off reviews.     │
│                                 │ fit in Telugu regional markets.  │                                 │
├─────────────────────────────────┼──────────────────────────────────┼─────────────────────────────────┤
│ **Regional Readers & Citizens** │ Ultra-fast load times, relevant  │ App store reviews, in-app       │
│ (End Consumers)                 │ neighborhood news, zero spam,    │ feedback (`help.tsx`), crashlyt.│
│                                 │ high quality video shorts.       │ telemetry.                      │
├─────────────────────────────────┼──────────────────────────────────┼─────────────────────────────────┤
│ **Community Journalists &**     │ Frictionless publishing flow,    │ Publisher onboarding portal,    │
│ **Stringers (Publishers)**      │ transparent verification status, │ editorial guidelines, WhatsApp  │
│                                 │ fair attribution and reach stats.│ community coordinator desk.     │
├─────────────────────────────────┼──────────────────────────────────┼─────────────────────────────────┤
│ **Municipal & Civic Bodies**    │ Accurate public notifications,   │ Formal liaison channels,        │
│ (Civic Partners)                │ emergency alerts, civic feedback.│ verified civic partner badges.  │
├─────────────────────────────────┼──────────────────────────────────┼─────────────────────────────────┤
│ **Commercial Advertisers &**    │ Hyperlocal ad targeting, verified│ Future ad-tech integration,     │
│ **Local Businesses**            │ impressions, high engagement.    │ sponsor media kits (Phase 4).   │
└─────────────────────────────────┴──────────────────────────────────┴─────────────────────────────────┘
```

---

## 7. Budget & Infrastructure Resources

The project follows a lean, modern cloud-native operational profile designed to minimize fixed costs while scaling dynamically with user growth.

| Service / Tool | Purpose | Current Tier / Footprint | Management & Billing |
| :--- | :--- | :--- | :--- |
| **Railway.app** | Microservices hosting (FastAPI) and Managed PostgreSQL database instance. | Pro / Usage-based; single production container + managed Postgres. | Backend Lead / DevOps; auto-deploys from GitHub. |
| **Expo Application Services (EAS)** | Cloud builds for native Android (AAB) and iOS (IPA) packages, remote credentials, OTA updates. | Production Plan (concurrency-based build queues). | Technical Lead / Mobile Team; configured via `eas.json`. |
| **Firebase (Google Cloud)** | Authentication services (Phone SMS OTP, Google Sign-In), Cloud Messaging (FCM). | Blaze Plan (Pay-as-you-go based on SMS OTP verification volume). | Managed via Google Cloud Console & `google-services.json`. |
| **Supabase** | Object storage bucket (`new-images`) for news article photography and avatar uploads. | Growth Plan (usage-based bandwidth and asset storage). | API keys injected via `.env` (`EXPO_PUBLIC_SUPABASE_*`). |
| **Google Gemini API** | Automated article summarization and smart news categorization. | Developer / Pay-as-you-go API key quota. | Managed via backend environment secrets. |
| **GitHub Organization** | Source control, issue tracking, and team repository hosting. | Team Tier (Frontend: `City-News-Telugu`, Backend: `HyperNews-Backend`). | Repository Administrators. |

---

## 8. Critical Risks & Open Issues (Executive Heatmap)

The following priority issues were documented and confirmed in our **Full Technical Audit (October 8, 2026)**. Resolving items R1–R4 represents the critical path to release.

```
       HIGH IMPACT  │   [R4] DB Schema Drift      │   [R1] Railway Repo Drift   
                    │   [R5] Concurrency / 500s   │   [R2] Account Takeover Bug 
                    │                             │   [R3] Debug Keystore Used  
                    ├─────────────────────────────┼─────────────────────────────
        LOW IMPACT  │   [R7] Duplicate Mock Data  │   [R6] Unpaginated Scans    
                    │                             │                             
                    └─────────────────────────────┴─────────────────────────────
                               LOW PROBABILITY                 HIGH PROBABILITY
```

| ID | Severity | Area | Issue Summary | Business & Technical Impact | Remediation Plan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **R1** | **CRITICAL** | Deployment / Backend | Railway is deploying an outdated commit (`39e427d`) from `RoshithNoorbasha/HyperNews`. | Google auth & publisher endpoints return 404 in production; client features fail. | Re-link Railway source to `PushkarKunda/HyperNews-Backend:main` and redeploy. |
| **R2** | **CRITICAL** | Security / Auth | Account linking in `sync_provider` links accounts by email without asserting `email_verified == True`. | Vulnerable to pre-authentication account takeover via unverified email. | Require explicit `email_verified == True` token claim before linking accounts. |
| **R3** | **CRITICAL** | Build / Release | Android `build.gradle` signs release APKs with debug keystore (`signingConfigs.debug`). | Google Play Console rejects release builds; security exposure. | Generate production upload keystore; configure EAS Credentials. |
| **R4** | **HIGH** | Database / Schema | `init_db()` early-returns in production before `ensure_user_columns()` runs; Alembic migration missing. | Auth queries crash with `UndefinedColumn: column "google_id"` 500 error. | Generate formal Alembic migration; execute `alembic upgrade head` in deploy step. |
| **R5** | **HIGH** | Reliability / UX | Rapid double-taps on like trigger unhandled `IntegrityError` 500 crash; CORS blocks idempotency headers. | Degraded user experience during viral reading spikes; preflight failures. | Implement `INSERT ... ON CONFLICT DO NOTHING`; whitelist idempotency headers. |
| **R6** | **MEDIUM** | Performance | Bulk notifications and admin exports perform unpaginated `.all()` table scans. | Memory spikes and high database latency under production user volume. | Enforce pagination (`yield_per(500)`) and background chunking. |

---

## 9. Tools, Tech Stack & Development Processes

### 9.1 Technology Stack Matrix
- **Mobile Client:** React Native (`0.76.9`), Expo SDK (`52.0.23`), Expo Router (`4.0.15`), TypeScript (`5.3`).
- **State & Data Caching:** Zustand (`5.0.2`) with AsyncStorage persistence, TanStack React Query (`5.62.11`), Axios (`1.7.9`).
- **Styling & Assets:** Vanilla React Native StyleSheet conforming to centralized design tokens (`constants/`), `expo-image`, Reanimated (`3.16.4`), Lottie (`7.1.0`).
- **Backend Architecture:** FastAPI, SQLAlchemy 2.0, PostgreSQL, Alembic, Pydantic, Python 3.11.
- **External Integrations:** Firebase Auth SDK, Supabase JS Storage, Google Gemini Generative AI.

### 9.2 Development & Branching Workflow
- **Branch Strategy:**
  - `main`: Production-ready release branch. Deployed to Railway and used for EAS production builds.
  - `feature/<feature-name>`: Scoped feature development branches.
  - `bugfix/<issue-name>`: Targeted defect remediations.
- **Quality Gates:**
  - Mandatory pre-commit validation: `npm run type-check` (`tsc --noEmit`) and `npm run lint` (`eslint .`).
  - Backend validation: `pytest -q` and `alembic upgrade head` verification.
- **Build Pipeline:**
  - Managed via `eas.json` across three defined profiles: `development` (internal dev client), `preview` (staging/QA APK), and `production` (optimized Play Store AAB).

---

## Key Document References

- **Architecture Blueprint:** [`architecture.md`](file:///d:/A/hyperlocal-news-frontend/architecture.md)
- **Living Intelligence & Memory:** [`memory.md`](file:///d:/A/hyperlocal-news-frontend/memory.md)
- **Technical Audit Findings:** [`audit_report.md`](file:///d:/A/hyperlocal-news-frontend/audit_report.md)
- **Required Backend Remediation:** [`backend_changes_required.md`](file:///d:/A/hyperlocal-news-frontend/backend_changes_required.md)
- **API Endpoint Map:** [`api-map.md`](file:///d:/A/hyperlocal-news-frontend/api-map.md)
- **Database Schema Specification:** [`database-map.md`](file:///d:/A/hyperlocal-news-frontend/database-map.md)
