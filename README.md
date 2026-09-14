# Digital Legacy Planner

**A complete, fully functional digital continuity & legacy planner.**

Help ordinary people organize what happens to their digital accounts, photos, messages, subscriptions, and online presence.

## Features

- **Landing page** that clearly explains the product
- **User accounts** (email + password) with sign up, log in, and password reset
- **Digital Assets** inventory (accounts, subscriptions, photos, cloud storage, social, financial, etc.)
- **Trusted Contacts** management
- **Wishes & Instructions** in plain language
- **Check-in / Heartbeat** system
- **Export plan** as JSON
- Real-time cloud storage with Firestore
- Clean, calm, mobile-friendly design

## Setup (Required)

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Enable **Authentication** → Sign-in method → **Email/Password**.
3. Create a **Firestore Database** (start in test mode while developing).
4. Project Settings → Your apps → Add web app → copy the config.
5. Open `firebase-config.js` and paste your config.
6. Set these Firestore security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

7. Open the site with a local server or deploy it.

```bash
npx serve .
```

## How it works

1. Visitor lands on the marketing page
2. Clicks “Get Started” or “Create account”
3. Signs up / logs in
4. Uses the full app (Dashboard, Assets, Contacts, Wishes, Settings)
5. Can export their entire plan as a JSON file

## Disclaimer

This is a working application. It is **not legal advice** and does not replace professional estate planning, wills, or legal counsel.

---

Built as a complete mass-market digital continuity tool.
