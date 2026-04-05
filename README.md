# Chaotic Cloud Albums (React + GitHub Pages)

This repository now runs a React/Vite app designed as:

- A playful "bad UX sandbox" inspired by absurd controls.
- A photo-hosting style UI that reads your personal OneDrive folders as albums.
- Nested OneDrive folders as nested albums.
- Click any photo to open full resolution in a new tab.

## Quick start

```bash
npm install
npm run dev
```

## OneDrive setup

1. Create an app registration in Azure Portal.
2. Add a SPA redirect URI for your local and GitHub Pages URLs.
3. Grant delegated Microsoft Graph permissions:
   - `User.Read`
   - `Files.Read`
   - `Files.Read.All` (for broader access patterns)
4. Create `.env`:

```bash
VITE_AZURE_CLIENT_ID=your-client-id
VITE_REDIRECT_URI=http://localhost:5173
```

For GitHub Pages, set `VITE_REDIRECT_URI` to your deployed URL.

## Deploy to GitHub Pages

The project uses `gh-pages` and Vite build output:

```bash
npm run deploy
```

> Note: `vite.config.js` currently uses `base: "/rtsite/"`. If your repo name changes, update this value.
