# INFO5995 Security Discovery Leaderboard

Static, data-driven leaderboard for class findings (bug bounties, CVEs, disclosures, write-ups), ready for GitHub Pages.

## What Is Included

- `index.html`: main records table
- `scoring.html`: scoring guide and display notes
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
- `externalSeverity` (optional platform/vendor severity classification)
- `internalSeverity` (optional course-side severity classification, used when there is no platform/vendor severity)
- `severitySource` (optional source label such as `Internally assessed`)
- `severityRationale` (optional reason for an internally assessed severity)
- `severityScore` (0--6 rubric severity component)
- `impactEvidenceScore` (0--2 rubric impact-evidence component)
- `noveltyScore` (0--2 rubric novelty component)
- `scoreReason` (optional short explanation for the displayed breakdown)
- `reportPlatform` (optional platform name, for example `HackerOne`)
- `studentReportId` (optional external report ID for the student's submission)
- `duplicateReportId` (optional external report ID for the duplicate/original report)
- `reportStatus` (optional status such as `Duplicate`, `Triaged`, or `Resolved`)
- `evidenceNote` (optional short note for the table's Notes column)
- `mainStudents` (string or array of names)
- `tutorialNumber` or `tutorial` (string or number)
- `groupNumber` (string or number)
- `zeroDay` (boolean; use `true` for zero-day and `false` for non-zero-day)
- `date` (`YYYY-MM-DD`)
- `points` (optional, number)
- `url` (optional)

If `mainStudents`, `tutorialNumber`, or `groupNumber` is omitted, the page falls back to matching student-level fields.
If `zeroDay` is omitted, the page infers zero-day status from `noveltyScore` where possible: `2` is shown as zero-day, `1` as non-zero-day, and unsupported values as unknown.
For this leaderboard, `points` should normally be set explicitly and should reflect the rubric-aligned finding score rather than any assignment bonus mark.
If `points` is omitted, fallback points are pulled from the top-level `scoring` map, which is intentionally conservative.
If `points` is omitted but the rubric breakdown fields are present, the page will sum `severityScore + impactEvidenceScore + noveltyScore`.

## Optional Local Preview

Run from repository root:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
