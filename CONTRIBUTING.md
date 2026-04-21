# Contributing to RoboRank

Thanks for your interest in improving RoboRank! This project is built for the VEX V5 Robotics community, and contributions, bug reports, and feature ideas are all welcome.

## 🐛 Reporting Bugs

The fastest way to get a bug fixed is to **open an issue** with:

1. What you were trying to do
2. What actually happened
3. What you expected to happen
4. Your device + browser (e.g. "iPhone 15, Safari")
5. A screenshot if it's visual

Use the **Bug Report** issue template — it walks you through everything.

## 💡 Suggesting Features

Open an issue using the **Feature Request** template. Helpful context:

- The problem you're trying to solve
- How you currently work around it
- Anything similar in another tool you like

## 🔧 Local Development

```bash
git clone https://github.com/YOUR_USERNAME/roborank.git
cd roborank
npm install
npm run dev
```

The app runs at `http://localhost:8080`.

### Tech stack
- **React 18** + **Vite** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** for styling
- **Supabase** (Postgres + Auth + Edge Functions) for backend
- **Capacitor** for the iOS/Android wrapper
- **TanStack Query** for data fetching
- **Framer Motion** for animations

### Project layout
- `src/pages/` — top-level routes
- `src/components/` — reusable UI
- `src/lib/robotevents.ts` — RobotEvents API client + scoring algorithm
- `src/integrations/supabase/` — auto-generated Supabase client (do not edit)
- `supabase/functions/` — Edge Functions (RobotEvents proxy, email, etc.)

## 🎨 Style Guide

- **Use semantic design tokens** (`text-primary`, `bg-card`, etc.) — never hard-code colors
- **Follow the existing component patterns** in `src/components/ui/`
- **Mobile-first** — the app is primarily used on phones in the pit
- **No em-dashes** in user-facing copy — use standard hyphens

## 📝 Pull Requests

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Make sure `npm run build` succeeds
4. Open a PR with a clear description of what you changed and why
5. Link the issue your PR closes (e.g. "Closes #42")

## 🙏 Code of Conduct

Be kind, be patient, and remember most contributors are students balancing this with school and competition season. Quick wins beat perfect solutions.

## 📬 Questions?

Open a [Discussion](../../discussions) or reach out through the [Contact page](https://roborank.site/contact).
