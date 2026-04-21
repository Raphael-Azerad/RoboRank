<div align="center">

# 🤖 RoboRank

### Analytics & Scouting for VEX V5 Robotics Teams

[![Live App](https://img.shields.io/badge/Live-roborank.site-DC2626?style=for-the-badge)](https://roborank.site)
[![Built with Lovable](https://img.shields.io/badge/Built%20with-Lovable-1A1D23?style=for-the-badge)](https://lovable.dev)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

**Scouting reports • Team ratings • Match prediction • Tournament analytics**

[Live Site](https://roborank.site) · [Report a Bug](https://roborank.site/contact) · [Request a Feature](https://roborank.site/contact)

</div>

---

## ✨ Features

- 📊 **RoboRank Score** — Proprietary 0-100 rating algorithm for every team
- 🔍 **Auto-Generated Scouting Reports** — One-click CSV/Excel exports for any event
- 🎯 **Match Predictor** — 2v2 alliance simulation with win-probability modeling
- 📅 **Event Browser** — Live search across global VEX competitions
- 🏆 **Tournament Tools** — Elimination brackets, rankings, schedule difficulty
- 📝 **Team Notes** — Tagged, categorized internal strategy notes
- 📈 **Season Progress** — Compare up to 4 teams across multiple seasons
- 🔔 **Notifications** — Real-time alerts for watched events
- 📱 **Mobile App** — Native iOS & Android via Capacitor

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · TypeScript · Vite |
| Styling | Tailwind CSS · shadcn/ui |
| Backend | Supabase (Postgres · Auth · Edge Functions · Storage) |
| Native | Capacitor (iOS + Android) |
| Data Source | [RobotEvents API](https://www.robotevents.com/api/v2) |
| Hosting | Lovable |

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/roborank.git
cd roborank

# Install
npm install

# Run dev server
npm run dev
```

Visit `http://localhost:8080` — you're up.

## 📱 Running on iOS / Android

```bash
# Build the web bundle
npm run build

# Add native platforms (one time)
npx cap add ios
npx cap add android

# Sync web assets into native projects (after every build)
npx cap sync

# Open in Xcode / Android Studio
npx cap open ios
npx cap open android
```

> **Requirements:** Xcode 15+ on macOS for iOS · Android Studio for Android

## 🏗️ Project Structure

```
roborank/
├── src/
│   ├── components/      # Reusable UI (shadcn-based)
│   ├── pages/           # Route-level views
│   ├── contexts/        # Global React contexts (season, subscription)
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities, API clients, native bridge
│   └── integrations/    # Supabase client + generated types
├── supabase/
│   ├── functions/       # Edge Functions (RobotEvents proxy, email, etc.)
│   └── migrations/      # SQL schema migrations
├── public/              # Static assets, PWA manifest
└── capacitor.config.ts  # Native app configuration
```

## 🔐 Environment

This project uses Supabase via Lovable Cloud. Environment variables are auto-managed — `.env` is generated automatically with:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

## 🤝 Contributing

This is primarily a personal project, but bug reports and feature requests are welcome via the [Contact page](https://roborank.site/contact).

## 📄 License

MIT © RoboRank — see [LICENSE](LICENSE)

## 🙏 Acknowledgements

- [RobotEvents](https://www.robotevents.com) for the public competition API
- [VEX Robotics](https://www.vexrobotics.com) for an incredible competitive ecosystem
- The VRC community — this app exists for you

---

<div align="center">

**Built with ❤️ for the VEX Robotics community**

[roborank.site](https://roborank.site)

</div>
