# INFO5995 Security Discovery Leaderboard

Static, data-driven leaderboard for class findings (bug bounties, CVEs, disclosures, write-ups), ready for GitHub Pages.

## What Is Included

- `index.html`: page structure
- `styles.css`: responsive styling
- `script.js`: loads and renders leaderboard data
- `data/entries.json`: the file you update with student findings
- `.github/workflows/deploy-pages.yml`: automatic GitHub Pages deployment on push to `main`

## First-Time GitHub Setup

1. Push this repository to GitHub.
2. In GitHub, open `Settings -> Pages`.
3. If prompted for source, choose `GitHub Actions`.
4. Pushes to `main` will auto-deploy the page.

After deployment, your site URL will be shown in:

- `Actions -> Deploy GitHub Pages` run summary
- `Settings -> Pages`

## How To Update The Leaderboard

1. Edit `data/entries.json`.
2. Update `lastUpdated` (format: `YYYY-MM-DD`).
3. Add or update student findings.
4. Commit and push to `main`.

The site will refresh automatically when GitHub Pages redeploys.

## Data Format

Each student entry has:

- `name` (string)
- `cohort` (string)
- `notes` (optional string)
- `findings` (array)

Each finding can include:

- `type` (for example: `Bug Bounty`, `CVE`, `Hall of Fame`, `Write Up`)
- `title`
- `program`
- `date` (`YYYY-MM-DD`)
- `points` (optional, number)
- `url` (optional)

If `points` is omitted, default points are pulled from the top-level `scoring` map.

## Optional Local Preview

Run from repository root:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
