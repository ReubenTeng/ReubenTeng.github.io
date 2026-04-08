# Chaotic Cloud Albums (React + GitHub Pages)

This repository runs a React/Vite app with:

- A playful "bad UX sandbox" inspired by absurd controls.
- A photo-hosting UI that reads from **your own OneDrive folder share link**.
- Nested OneDrive folders rendered as nested albums.
- Click any photo to open full resolution in a new tab.

## Quick start

```bash
npm install
npm run dev
```

## Use your own OneDrive (owner-controlled, not visitor-controlled)

1. In your OneDrive, choose the root folder you want to publish as albums.
2. Create a share link for that folder.
3. Ensure link permissions allow anonymous/read access if you want GitHub Pages visitors to browse without auth.
4. Create `.env`:

```bash
VITE_ONEDRIVE_SHARE_URL="https://1drv.ms/f/s!your-share-link"
```

The app resolves this single owner share link through Microsoft Graph `/shares/...` endpoints and never asks site visitors to sign in.

## Deploy to GitHub Pages

```bash
npm run deploy
```

> Note: `vite.config.js` currently uses `base: "/rtsite/"`. If your repo name changes, update this value.
