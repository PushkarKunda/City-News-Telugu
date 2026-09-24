# ⚡ HyperNews Admin Portal

> Modern, responsive administration and content moderation dashboard for HyperNews, built with **React 19**, **Vite**, and **Tailwind / Vanilla CSS Design Tokens**.

---

## 🚀 Features

- **📊 Executive Dashboard**: High-level platform KPIs, live active readers, moderation queues, and revenue statistics.
- **📰 News Management**: Article authoring, scheduled publication, category filters, and moderation workflows.
- **🛡️ Enterprise Moderation**: Comprehensive content review tools, user strike/suspension systems, and audit logging.
- **👥 User & RBAC Management**: Manage roles (`super_admin`, `admin`, `moderator`, `editor`, `creator`, `reader`), inspect user profiles, and review coin earnings.
- **📢 Ads & Monetization**: Campaign monitoring, impression & click counters, CPC/CPM metrics, and sponsor placements.
- **🎁 Rewards & Withdrawals**: Review and approve/reject user reward point-to-cash withdrawal requests.
- **📍 Geographic Taxonomy**: Country, State, District, and City management for hyper-local news targeting.
- **⚙️ Dynamic Platform Settings**: Configure platform navigation, category order, quick links, footer columns, and social links.

---

## 🛠️ Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite
- **Icons**: Lucide Icons
- **Styling**: Modern CSS Design System with dark mode support
- **API Client**: Native `fetch` wrapper with Bearer JWT token support
- **State & Context**: React Context API (`AuthContext`, `ToastContext`)

---

## 🏃 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

The portal will launch at [http://localhost:5173](http://localhost:5173).

### 3. Build for Production
```bash
npm run build
```

The compiled static assets will be output to the `dist/` directory.

---

## 🔗 Backend Connectivity

The Admin Portal connects to the FastAPI backend at `http://127.0.0.1:8000` by default. Ensure the FastAPI backend is running:

```bash
# In the root project directory:
python main.py
# or using the root start script:
start.bat run
```
