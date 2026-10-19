# 📍 City News Telugu (Frontend)

[![Expo](https://img.shields.io/badge/Expo-v52.0-000000?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-v0.76.9-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

A state-of-the-art **Hyperlocal News & Community Engagement** mobile application built with React Native and Expo for regional language audiences. The platform bridges the hyperlocal information deficit by delivering real-time, geo-targeted news down to District, City, and neighborhood Locality levels across Telangana and Andhra Pradesh. 

The application integrates modern digital media features—including vertical video shorts, participatory civic polls, community discussions, and localized event listings—backed by a dedicated **Publisher Dashboard** for verified local community reporters and stringers.

---

## 🎨 Visual Identity & Key Features

- **📍 Geo-Targeted Feed**: Custom localized news grouped hierarchically by State, District, City, and specific Localities.
- **🎥 Video Shorts**: Full-screen vertical feed of short videos for fast-paced city and breaking news updates.
- **🗳️ Interactive Polls**: Citizen engagement in neighborhood planning decisions, municipal preferences, and civic issues with real-time vote distribution.
- **💬 Community Posts & Discussions**: Neighborhood social feed for citizen posts, hashtag conversations, and nested comment threads.
- **📅 Local Events Finder**: Nearby community meetups, charity drives, and cultural events sorted by proximity.
- **🌐 Multilingual & Accessible**: Instant language switching across **Telugu, English, Hindi, Tamil, Spanish, and French** with dynamic typography accessibility scaling.
- **✍️ Publisher Workspace**: Self-publishing platform for accredited local journalists (Role $\ge$ 2) to draft stories, upload imagery, and monitor reach statistics.
- **🌙 Universal Theme Engine**: Pixel-perfect Dark and Light themes built directly on custom Design Tokens.

---

## 📚 Project Documentation

Detailed technical and architectural documentation is organized in the [`docs/`](docs/) directory:

- 🏛️ **[PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md)**: Comprehensive project overview, technical architecture, timeline, team structure, and audit findings.
- 📐 **[architecture.md](docs/architecture.md)**: Deep dive into the client application system design, data flow, and navigation guards.
- 🔐 **[RELEASE_SIGNING.md](docs/RELEASE_SIGNING.md)**: Android release keystore generation and Google Play App Signing instructions.
- 🔔 **[PUSH_NOTIFICATIONS.md](docs/PUSH_NOTIFICATIONS.md)**: Setup and integration guide for native push notifications.
- 🧠 **[memory.md](docs/memory.md)**: Living intelligence engine documenting entities, routes, and performance considerations.
- 🗺️ **[api-map.md](docs/api-map.md)** & **[routes.md](docs/routes.md)**: Complete registry of API endpoints and navigation routes.
- 🗄️ **[database-map.md](docs/database-map.md)** & **[dependency-graph.md](docs/dependency-graph.md)**: Database schema definitions and dependency mapping.

---

## 🛠️ Tech Stack & Key Libraries

- **Core Framework**: Expo (Managed Workflow, `~52.0.23`) & React Native (`0.76.9`)
- **Navigation**: Expo Router (`~4.0.15`) with typed file-based routing
- **State Management**: Zustand (`^5.0.2`) with `@react-native-async-storage/async-storage` persistence
- **Data Fetching**: TanStack React Query (`^5.62.11`) + Axios (`^1.7.9`) with automatic token refresh
- **Authentication**: Firebase Auth (Phone SMS OTP + Google Sign-In) exchanged for backend JWT
- **Media & Storage**: Supabase Storage (`new-images` bucket) and `expo-image` disk caching
- **Visual Polish**: React Native Reanimated (`~3.16.4`), Lottie (`7.1.0`), Expo Linear Gradient, and Expo Blur
- **Form Validation**: React Hook Form (`^7.54.2`) + Zod (`^3.24.1`) schema validation
- **Build & Release**: Expo Application Services (EAS Build) with profiles in `eas.json`

---

## 📁 Repository Structure

```filepath
City-News-Telugu/
├── app/                        # Expo Router - File-based Routing System
│   ├── (auth)/                 # Authentication Routes (Login, Phone OTP verification)
│   ├── (onboarding)/           # 7-Step User Setup (Language, Location, Interests)
│   ├── (tabs)/                 # Bottom Tabs (Feed, Discover, Shorts, Posts, Profile, Bookmarks)
│   ├── (publisher)/            # Community Journalist Portal (Dashboard, Create Article)
│   ├── news/                   # Dynamic Article Detail Pages ([id].tsx)
│   └── _layout.tsx             # Root layout, font loader, theme sync, network guard
├── components/                 # Modular Component Library
│   ├── ui/                     # Design System Atoms (Buttons, Skeletons, Inputs, Badges)
│   ├── news/                   # News Cards, Poll Cards, Category Bar
│   ├── common/                 # Reusable Business Views (Notifications, Modals)
│   └── Header.tsx              # Universal Custom Navigation Header
├── constants/                  # Unified Design Tokens
│   ├── Colors.ts               # Theme Palette (Light, Dark, `#4648D4` Primary)
│   ├── Spacing.ts              # Margin/Padding grids & layout radiuses
│   └── Typography.ts           # Standard font weights, sizes (Google Poppins)
├── hooks/                      # Custom React Hooks
│   ├── useApi.ts               # Generic TanStack Query fetcher & mutation handler
│   ├── useNews.ts              # Hyperlocal news feeds and category filters
│   ├── usePosts.ts             # Community posts fetching and creation
│   └── usePolls.ts             # Voting logic and local optimistic updates
├── services/                   # Infrastructure & Backend Integration
│   ├── api/                    # Centralized API client, interceptors, SecureStore tokens
│   ├── firebase.ts             # Firebase Phone OTP & Google Sign-In helpers
│   ├── supabase.ts             # Supabase storage client for media uploads
│   └── image.ts                # Image compression and manipulation
├── store/                      # Zustand Modular Stores (AsyncStorage persistent)
│   ├── authStore.ts            # User session, onboarding state, language & theme
│   ├── articleStore.ts         # Locally cached publisher stories
│   └── useStore.ts             # Bookmarks, active polls, and publisher approvals
├── utils/                      # Helper Utilities
│   ├── apiClient.ts            # Mock dataset simulator fallback
│   ├── formatters.ts           # Date (date-fns) & number formatting
│   └── responsive.ts           # Screen dimension calculations & grid scaling
├── app.json                    # Native Expo configuration metadata & plugins
├── eas.json                    # EAS build & release deployment profiles
└── package.json                # Project dependencies & scripts
```

---

## ⚡ Setup & Installation

Follow these steps to run the project locally on an emulator or physical device.

### 📋 Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Expo Go App](https://expo.dev/go) (for quick physical device testing) or configured Android Studio / Xcode emulator
- NPM or Yarn

### ⚙️ Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/PushkarKunda/City-News-Telugu.git
   cd City-News-Telugu
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example template and populate your local variables:
   ```bash
   cp .env.example .env
   ```
   *Set `EXPO_PUBLIC_API_BASE_URL` to your backend gateway or set `EXPO_PUBLIC_USE_MOCKS=true` to test offline with mock datasets.*

---

## 🚀 Running the App

| Command | Action | Description |
| :--- | :--- | :--- |
| `npm run start` | `expo start` | Starts the Expo development server with interactive CLI. |
| `npm run android` | `expo run:android` | Builds and launches the native app on an Android emulator/device. |
| `npm run ios` | `expo run:ios` | Builds and launches the native app on an iOS simulator. |
| `npm run web` | `expo start --web` | Bundles and runs a browser preview. |
| `npm run type-check` | `tsc --noEmit` | Validates TypeScript structures and types. |
| `npm run lint` | `eslint .` | Runs ESLint checks on codebase style and conventions. |
| `npm run clear` | `expo start -c` | Starts Expo after clearing bundle caches. |

---

## 🏛️ State Management Architecture

Global state is cleanly separated across modular **Zustand Stores** to reduce re-renders:

- **[`useAuthStore`](store/authStore.ts)**: Session authentication state, language translations, active text scale, custom theme preferences (`light`, `dark`, `system`), and profile metadata. Persisted via `AsyncStorage`.
- **[`useArticleStore`](store/articleStore.ts)**: Localized publisher articles, seeded initially with high-fidelity local community news samples.
- **[`useStore`](store/useStore.ts)**: Bookmarks collection, real-time poll voting status, and publisher verification state.

---

## 🎨 Theme & Typography Design System

All visual layouts conform to centralized tokens defined in `constants/`:

- **Colors ([`constants/Colors.ts`](constants/Colors.ts))**: Primary brand shade (`#4648D4`), dynamic background tints, border contours, and contrasting font shades for light and dark modes.
- **Spacing ([`constants/Spacing.ts`](constants/Spacing.ts))**: Standardized 4pt/8pt layout grid (`xs: 4`, `sm: 8`, `md: 16`, `lg: 24`, etc.).
- **Typography ([`constants/Typography.ts`](constants/Typography.ts))**: Google Poppins typography with standardized scaling hierarchies.

---

## 📦 Build & Release Pipeline

Native builds are managed through **Expo Application Services (EAS)**:

- **Development (`development`)**: Builds custom native dev client (`expo-dev-client`) for physical device debugging.
- **Preview (`preview`)**: Internal staging APK for QA testing and client review.
- **Production (`production`)**: Optimized production packages (Android `.aab` / iOS `.ipa`) ready for Google Play Store and Apple App Store submission.

> 🔐 **Release builds require a private upload keystore** — release signing is driven by `MYAPP_RELEASE_*` env vars and will not fall back to the debug key. See **[RELEASE_SIGNING.md](RELEASE_SIGNING.md)** for keystore generation, EAS credentials, and the required Firebase SHA-1 registration.

```bash
# Build Android preview APK
eas build --platform android --profile preview

# Build Android production AAB
eas build --platform android --profile production
```

---

## 🤝 Contribution Guidelines

1. **Branch Naming**: Use `feature/feature-name` or `bugfix/issue-name`.
2. **Code Quality**: Always execute `npm run lint` and `npm run type-check` prior to committing.
3. **API & Mock Parity**: If mock datasets are updated, verify matching TypeScript schemas exist in `types/` and API route contracts.

---

_Made with ❤️ for the community. For questions or issues, please file a ticket on the project GitHub repository._
