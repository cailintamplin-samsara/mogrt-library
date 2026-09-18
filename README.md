# Public MOGRT library (GitHub-hosted)

Drop `.mogrt` files into `templates/` and matching `thumbnails/<slug>.png` files.
On every push, GitHub Actions regenerates `manifest.json`.

## Publish a template

1. Add `templates/My Template V2.mogrt`
2. Add `thumbnails/my-template-v2.png` (slug = lowercase filename without `.mogrt`)
3. Commit and push to `main`
4. Action updates `manifest.json` with version, sha256, and raw download URLs

## Panel consumers

The Premiere plugin fetches:

`https://raw.githubusercontent.com/<owner>/<repo>/main/manifest.json`

No auth required — keep this repository **public**.
