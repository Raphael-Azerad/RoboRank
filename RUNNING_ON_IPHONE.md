# Running RoboRank on Your iPhone — Two Paths

## Path A: Free, no Apple Developer account (test today, expires after 7 days)

Perfect for showing your team or making sure everything works before paying for the developer account.

### What you need
- A Mac with **Xcode 15+** installed (free from the Mac App Store)
- Your iPhone + Lightning/USB-C cable
- Any Apple ID (your personal one is fine)

### Steps

```bash
# 1. Clone (one time)
git clone https://github.com/YOUR_USERNAME/roborank.git
cd roborank
npm install

# 2. Build + add iOS
npm run build
npx cap add ios
npx cap sync
npx cap open ios       # this opens Xcode
```

In Xcode:

1. Plug in your iPhone. Unlock it. Tap **Trust This Computer**.
2. In Xcode's left sidebar, click the blue **App** project at the very top.
3. Go to the **Signing & Capabilities** tab.
4. Under **Team**, click the dropdown → **Add an Account…** → sign in with your Apple ID.
5. Set **Bundle Identifier** to something unique like `com.yourname.roborank`.
6. At the top of Xcode, click the device picker (next to the play button) → choose **your iPhone**, not a simulator.
7. Press the **▶️ Play button**.
8. First time only: on your iPhone go to **Settings → General → VPN & Device Management → [your Apple ID] → Trust**.

Done — RoboRank is now installed as a real app on your phone.

> ⚠️ **The 7-day catch:** Apps installed with a free Apple ID stop working after 7 days. To re-install, just plug your phone back in and press Play in Xcode again. This limit goes away the moment you upgrade to a paid Apple Developer account.

---

## Path B: Paid Apple Developer account → TestFlight → App Store

This is the real path to publishing.

### Step 1: Enroll as an Individual ($99/yr)

1. Go to **https://developer.apple.com/programs/enroll/**
2. Sign in with the same Apple ID you'll use for distribution
3. Choose **Individual / Sole Proprietor** (your legal name will show in the App Store)
4. Verify identity (Apple may ask for a government ID photo)
5. Pay $99 USD — most individual enrollments are approved **within an hour**, sometimes overnight

### Step 2: Configure Xcode for the paid account

Once Apple emails you "Welcome to the Apple Developer Program":

1. Open Xcode → **Settings → Accounts** → select your Apple ID → **Manage Certificates** → click **+** → **Apple Distribution**.
2. Back in your project's **Signing & Capabilities** tab, the team dropdown will now show your name with `(Personal Team)` removed — that's the paid team. Select it.
3. Bundle ID stays the same (`com.yourname.roborank`).

### Step 3: Archive + upload to TestFlight

1. At the top of Xcode, set the device picker to **Any iOS Device (arm64)** — NOT a simulator.
2. Menu: **Product → Archive**. This takes 2-5 minutes.
3. When the Organizer window opens: **Distribute App → App Store Connect → Upload**.
4. Xcode walks you through signing — accept defaults.

### Step 4: Set up the listing in App Store Connect

1. Go to **https://appstoreconnect.apple.com**
2. **Apps → +** (top left) → **New App**
3. Fill in:
   - **Platform:** iOS
   - **Name:** RoboRank
   - **Primary Language:** English (US)
   - **Bundle ID:** pick the one you used in Xcode
   - **SKU:** anything unique, e.g. `roborank-001`
4. Once the build finishes processing (Apple emails you, ~10-30 min), you can:
   - **TestFlight tab:** invite up to 10,000 beta testers by email — no Apple review for internal testers
   - **App Store tab:** fill in everything from `APP_STORE_LISTING.md`, attach screenshots, hit **Submit for Review**

### Step 5: Wait for review

- **Typical wait:** 24-72 hours
- **First-time submissions:** sometimes 3-7 days
- **If rejected:** Apple sends specific feedback. Fix the issue, increment the build number in Xcode, archive again, re-submit. Most rejections are tiny fixes (missing privacy string, demo account doesn't work, etc.)

---

## Quick Reference

| Task | Command |
|------|---------|
| Pull latest from GitHub | `git pull` |
| Rebuild web bundle | `npm run build` |
| Sync into iOS project | `npx cap sync` |
| Open in Xcode | `npx cap open ios` |
| Run on connected device | ▶️ button in Xcode |
| Archive for App Store | Product → Archive |

**Rule of thumb after every Lovable change:**
```bash
git pull && npm run build && npx cap sync
```
Then hit ▶️ in Xcode.
