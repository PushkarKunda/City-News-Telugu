`# 📍 Hyperlocal News App (Frontend)

[![Expo](https://img.shields.io/badge/Expo-v52.0-000000?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-v0.76.9-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

A state-of-the-art **Hyperlocal News & Community Engagement** mobile application built with React Native and Expo. The application empowers users to discover relevant community news, interact with local events, participate in neighborly polls, watch short news videos, and receive immediate geo-targeted emergency warnings. It also accommodates a **Publisher Dashboard** for local community journalists to publish verified localized events and stories.

---

## 🎨 Visual Identity & Key Features

- **📍 Geo-Targeted Feed**: Custom localized news grouped by State, District, and specific Localities.
- **🎥 Video Shorts**: A vertical immersive feed of short videos for fast-paced city updates.
- **🗳️ Interactive Polls**: Participate in city-planning decisions and neighborhood preferences.
- **📅 Local Events Finder**: Find nearby music festivals, charity runs, and community meetups sorted by distance.
- **💬 Multilingual & Accessibility**: Supports instant translation between **English, Hindi, Telugu, Tamil, Spanish, and French** with dynamic typography scaling.
- **✍️ Publisher Workspace**: Self-publishing platform for local content creators to submit news/events, view performance stats, and track pending approvals.
- **🌙 Universal Theme Engine**: Rich dark mode support built directly on custom Design Tokens.

---

## 🛠️ Tech Stack & Key Libraries

- **Core Framework**: Expo (Managed Workflow, v52) & React Native (v0.76)
- **Navigation**: Expo Router (v4.0) with typed file-based routes
- **State Management**: Zustand (v5.0) with AsyncStorage persistent middleware
- **Network Layer**: Axios (v1.7) integrated with TanStack React Query (v5.6)
- **Visual Polish**: React Native Reanimated (v3.16), Lottie (v7.1), Expo Linear Gradient, and Blur
- **Performance Assets**: Expo Image for memory-efficient fast caching
- **Utility Tools**: Date-fns (v4.4) for time intervals, React Hook Form, Zod schema validation

---

## 📁 Repository Structure

```filepath
hyperlocal-news-frontend/
├── app/                        # Expo Router - Routing System
│   ├── (auth)/                 # Authentication Routes (Login, OTP verification)
│   ├── (onboarding)/           # Interactive User Setup (Location, Interests, Language)
│   ├── (tabs)/                 # Main Navigation (Index feed, Discover, Shorts, Profile, Bookmarks)
│   ├── (publisher)/            # Community Journalist Portal (Dashboard, Create Article)
│   ├── news/                   # Dynamic News Pages ([id].tsx)
│   └── _layout.tsx             # Root layout wrapping Navigation Context
├── components/                 # UI & Business Components
│   ├── ui/                     # Design System Atoms (Buttons, Skeletons, Inputs, Badges)
│   ├── news/                   # Category Bar, Poll Card, News Card
│   ├── common/                 # Event cards, Notifications
│   └── Header.tsx              # Universal Custom Navigation Header
├── constants/                  # Unified Design Tokens
│   ├── Colors.ts               # Theme Palette (Light, Dark, Accents)
│   ├── Spacing.ts              # Margin/Padding grids
│   └── Typography.ts           # Standard font weights, sizes, and hierarchies
├── hooks/                      # Custom Hooks
│   ├── useApi.ts               # General-purpose Tanstack query fetcher
│   ├── useAppColorScheme.ts    # Reacts to System/App themes
│   ├── useNews.ts              # Custom query handlers for hyperlocal feeds
│   └── usePolls.ts             # Custom hook for voting logic
├── services/                   # Integration & Backend Communication
│   ├── api/                    # API config, route maps, API client instances
│   ├── image.ts                # Image resizing & manipulations
│   └── supabase.ts             # Supabase storage config (commented for mock/local setup)
├── store/                      # Zustand Global Stores (with AsyncStorage persistence)
│   ├── authStore.ts            # Authentication, Profile settings, Theme & Language
│   ├── articleStore.ts         # Local user/publisher published stories list
│   └── useStore.ts             # Bookmarks, active Polls, and Publisher Approvals
├── utils/                      # Helper Utilities
│   ├── apiClient.ts            # Simulates API pipeline using in-memory mock datasets
│   └── responsive.ts           # Grid-scaling calculations for diverse screen sizes
├── app.json                    # Expo Native Configuration metadata
└── package.json                # Project Dependencies & Scripts
```

---

## ⚡ Setup & Installation

Follow these steps to run the project locally on your emulator or physical device.

### 📋 Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Expo Go App](https://expo.dev/go) (for physical device testing) or configured Android Studio / Xcode simulator
- NPM or Yarn

### ⚙️ Installation

1.  **Clone the Repository**:

    ```bash
    git clone https://github.com/Sujana2004/hyperlocal-news-frontend.git
    cd hyperlocal-news-frontend
    ```

2.  **Install Dependencies**:

    ```bash
    npm install
    ```

3.  **Environment Variables Setup**:
    Copy the example template file and populate it:
    ```bash
    cp .env.example .env
    ```
    _Open the `.env` file and set your `EXPO_PUBLIC_API_BASE_URL` or set `EXPO_PUBLIC_USE_MOCKS=true` to test offline with full datasets._

---

## 🚀 Running the App

Run the following commands in the root folder to start development.

| Command              | Action             | Description                                             |
| :------------------- | :----------------- | :------------------------------------------------------ |
| `npm run start`      | `expo start`       | Starts the Expo development server with CLI options.    |
| `npm run android`    | `expo run:android` | Builds and runs the application in an Android emulator. |
| `npm run ios`        | `expo run:ios`     | Builds and runs the application in an iOS simulator.    |
| `npm run web`        | `expo start --web` | Bundles and runs a browser-compatible mock preview.     |
| `npm run type-check` | `tsc --noEmit`     | Validates TypeScript structures compile properly.       |
| `npm run lint`       | `eslint .`         | Runs checks on source code style standardizations.      |
| `npm run clear`      | `expo start -c`    | Starts Expo after wiping cached bundle layers.          |

---

## 🏛️ State Management Architecture

State is cleanly separated across modular **Zustand Stores** to reduce visual re-renders:

- **`useAuthStore`** ([authStore.ts](file:///c:/project/hyperlocal-news-frontend/store/authStore.ts))
  Tracks session authentication state, language translations, active text scale, custom theme preferences (`light`, `dark`, or `system`), and current profile metadata. Persisted across reboots via `AsyncStorage`.
- **`useArticleStore`** ([articleStore.ts](file:///c:/project/hyperlocal-news-frontend/store/articleStore.ts))
  Maintains localized articles created or deleted by the user, seeded initially with high-fidelity local community news samples.
- **`useStore`** ([useStore.ts](file:///c:/project/hyperlocal-news-frontend/store/useStore.ts))
  Operates bookmark collections, updates real-time votes on public polls, and coordinates state triggers for the community publisher application process.

---

## 🎨 Theme & Typography Design System

All visual layouts conform to tokens specified under `constants/`:

- **Colors** ([Colors.ts](file:///c:/project/hyperlocal-news-frontend/constants/Colors.ts)): Contains precise HEX codes mapping light and dark themes. Highlights a premium primary shade (`#4648D4`), dynamic background tints, border contours, and contrasting font shades.
- **Spacing** ([Spacing.ts](file:///c:/project/hyperlocal-news-frontend/constants/Spacing.ts)): Standardized layout system (`xs: 4`, `sm: 8`, `md: 16`, `lg: 24`, etc.) keeping alignment pixel-perfect.
- **Typography** ([Typography.ts](file:///c:/project/hyperlocal-news-frontend/constants/Typography.ts)): Incorporates professional type systems (Inter, Newsreader, and Poppins) specifying explicit scaling hierarchies.

---

## 🤝 Contribution Guidelines

1.  **Branch naming**: Use `feature/feature-name` or `bugfix/issue-name`.
2.  **Code Consistency**: Always run `npm run lint` and `npm run type-check` prior to staging changes.
3.  **Mocks & Real APIs**: If you update the mock data structure, ensure matching schemas exist in `types/` and backend controllers.

---

_Made with ❤️ for the community. For questions, suggestions, or issues, please file a ticket on the project GitHub repository._
