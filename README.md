# Public MOGRT library (GitHub-hosted)

Published from the parent plugin repo via:

```bash
npm run publish:library -- --push
```

That syncs `../Mogrts` → `templates/`, rebuilds `thumbnails/` + `previews/*/frames/` (scrub filmstrip), regenerates `manifest.json`, and pushes.

Do not add templates without running that script — scrub previews will break.

## Panel consumers

The Premiere plugin fetches:

`https://raw.githubusercontent.com/<owner>/<repo>/main/manifest.json`

No auth required — keep this repository **public**.
