# Digital Legacy Planner

**A fully functional digital continuity & legacy planner that requires an account.**

Help ordinary people organize what happens to their digital accounts, photos, messages, subscriptions, and online presence — with real user accounts, cloud storage, and a clean, calm interface.

## Features

- **User accounts** — Sign up / Log in required (email + password)
- **Digital Assets Inventory** — Accounts, subscriptions, photos, cloud storage, social profiles, financial/crypto, etc.
- **Trusted Contacts** — People who should be notified
- **Personal Wishes & Instructions** — Plain-language directives
- **Check-in / Heartbeat system** — Track activity so trusted contacts can be alerted on prolonged inactivity
- **Cloud persistence** — Data saved per user in Firestore
- Clean, accessible, mobile-friendly design

## Tech Stack

- Vanilla HTML / CSS / JavaScript
- Firebase Authentication (email/password)
- Cloud Firestore

## Setup (Required to run)

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Enable **Authentication** → Sign-in method → **Email/Password**.
3. Create a **Firestore Database** (start in test mode for development, then lock it down).
4. Go to Project Settings → Your apps → Add a web app → Copy the `firebaseConfig` object.
5. Open `firebase-config.js` in this repo and paste your config.
6. (Recommended) Update Firestore security rules to:

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

7. Open `index.html` with a local server (or deploy to GitHub Pages / Vercel / Netlify).

> **Important**: Never commit real API keys to a public repo if you plan to keep it public long-term. For production, use environment variables or Firebase App Check.

## Running locally

```bash
# Simple way
npx serve .
# or
python -m http.server 8000
```

Then open http://localhost:8000

## Deploy

You can deploy this static site anywhere (GitHub Pages, Vercel, Netlify, Cloudflare Pages, etc.).

## Disclaimer

This is a working application prototype. It is **not legal advice** and does not replace professional estate planning, wills, or legal counsel. Always consult a qualified professional in your jurisdiction for matters involving inheritance, incapacity, or digital assets.

---

Built as a mass-market digital continuity tool.
