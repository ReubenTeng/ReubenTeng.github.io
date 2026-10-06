# Reuben Teng — A little museum

A walkable, Pokémon-inspired personal museum. The lobby tells Reuben’s engineering story; the photography wing turns each album directory into a room. Booklets, a full-size photo viewer, and a direct résumé view make all content available without walking.

The site builds from the repository root. The old Angular application has been removed; album originals live in `photos/`.

The museum fills a wider desktop layout with a close view of the room, a compact introduction, and narrow outer margins. On phones, the camera follows the visitor. The lobby’s **Internet shelf** opens a collection of favourite sites, and **@reu.shoots** links to Reuben’s photography Instagram.

## Run locally

Requires Node.js 24 and pnpm 11.19.0 (declared in `package.json`).

```sh
pnpm install
pnpm dev
```

Open http://localhost:4173/rtsite/. `pnpm dev` builds optimized images, then starts the local server. After editing source or photos, run `pnpm build` and reload the browser. `pnpm preview` serves an existing build. Override `PORT` to use a different port.

```sh
pnpm test
pnpm build
```

There are no browser runtime dependencies. Native JavaScript modules and Canvas render the world; HTML dialogs provide accessible content. Sharp is a build-only dependency for image resizing, rotation, and WebP conversion.

## Add or edit an album

Put each collection in its own immediate subdirectory of `photos/`:

```text
photos/
  Europe/
    museum.jpg
    sunset.JPG
    album.json       # optional
  A new adventure/
    01.jpg
    02.png
```

JPG/JPEG, PNG, WebP, and AVIF files are discovered automatically, including uppercase extensions. Other files and nested directories are ignored. An empty directory becomes an empty room (include `album.json` or `.gitkeep` to retain it in Git). Natural filename order is the default. Rebuild after adding files.

PNG originals are tracked with Git LFS through `.gitattributes`. After cloning, run `git lfs install` and `git lfs pull` if your checkout contains pointer files instead of images. The GitHub Actions checkout uses `lfs: true` to download the original image data before building. Ensure new LFS objects are pushed with your commits. The build reports the affected photo path and recovery instructions if a pointer was not downloaded; it also identifies corrupt or unsupported input files rather than silently dropping photos.

Optional `album.json` example:

```json
{
  "title": "A new adventure",
  "description": "A few moments from the road.",
  "cover": "02.png",
  "color": "#8996a0",
  "order": ["02.png", "01.jpg"],
  "photos": {
    "02.png": {
      "title": "Morning light",
      "alt": "Sunlight crossing a quiet street between apartment buildings.",
      "caption": "An early start."
    }
  }
}
```

Names in metadata are case-sensitive. Files omitted from `order` follow in natural order. IDs derive from directory and file names, so editing display titles preserves shared links; renaming directories or photos changes those links. Use descriptive alt text for every photo when possible.

The build creates 480px thumbnails and display images up to 2400px and strips embedded metadata from generated WebP files. Originals are never changed or included in the deployed artifact. Photos committed to a public repository remain accessible through GitHub itself.

Rooms show six photographs per section, with previous/next sections for larger albums. Gallery frames follow each photo’s aspect ratio with consistent matting, showing the complete photograph without cropping. The album hall shows three entrances per section and provides a directory of every album.

## Update content and design

- `src/content.js`: introduction, career/education timeline, skills, certification, interests, favourite sites, and photography Instagram link.
- `index.html`: page introduction, navigation, metadata, and surrounding UI.
- `src/style.css`: responsive layout and visual design.
- `src/game.js`: artwork, controls, room layouts, and exhibit interactions.
- `src/geometry.js`: collision, nearby exhibits, pathfinding, and gallery sections.
- `src/app.js`: panels, booklets, hash navigation, and visited-photo state.
- `scripts/images.mjs`: image conversion and actionable errors for missing LFS data or invalid images.

## Controls and accessibility

Focus or click the museum, then use WASD / arrow keys to walk and E / Enter to interact. Click the floor to walk there, or click an exhibit directly. On phones, use the directional pad and A button. The guide opens every exhibit without game controls. Photos support previous/next buttons and left/right keys. Escape returns from a photo to its booklet, then to the room. Native dialogs contain keyboard focus. Reduced-motion preferences disable character bobbing and animated prompts.

Photo discovery progress stays in the visitor’s browser; the site works if storage is unavailable. Hash routes support shared album and photo links without a server-side router or a Pages 404 workaround.

The Internet shelf is accessible from its postcard stand in the lobby, the room guide, and the main navigation. Its links open in new tabs, keeping the museum visit in place. Edit `favouriteSites` in `src/content.js` to change the collection. The Instagram link also appears in the photo museum guide and site footer.

The lobby telephone opens a “Say hello” panel with LinkedIn and GitHub links. Click the telephone, walk up and press E / Enter, or use “Say hello” in the room guide. “Contact me” in the main navigation opens LinkedIn directly. Profile links live in `contactLinks` in `src/content.js`; the navigation also includes a fallback LinkedIn URL in `index.html` for visitors without JavaScript.

## Git hygiene

Commit source, `photos/` (including optional album metadata), and `pnpm-lock.yaml`. `.gitignore` excludes dependencies, generated `dist/`, scratch files, test output, logs, and local environment files. An `.env.example` can be committed if needed; this static site currently requires no environment variables.

## GitHub Pages

`.github/workflows/pages.yml` downloads Git LFS images, tests, and builds pull requests. Pushes to `main`, or a manual workflow run, also deploy `dist/` with the official GitHub Pages actions. Relative asset paths support both a `/rtsite/` project address and a user site such as `ReubenTeng.github.io` at the domain root.

In **Settings → Pages → Build and deployment**, select **GitHub Actions** as the publishing source. The previous Angular site used `angular-cli-ghpages`; that branch-based deploy command is replaced by the root workflow. No secrets or third-party hosting are needed. See [GitHub’s custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Local changes do not publish themselves. Commit and push to `main` to trigger deployment after configuring the publishing source.
