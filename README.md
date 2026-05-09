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

## Private Report Files

Keep group evidence files flat in `reports/`. Do not split them into `pending` or `checked` folders.

Use this filename pattern:

```text
T{tutorial}G{group}_{sequence}_{short_slug}.{ext}
```

Examples:

- `T26G05_01_broken_access_control_gatewayburn.pdf`
- `T04G02_03_doordash_cwe601_poc_video.mp4`

Use two digits for the sequence number so files stay sorted. The `dashboard-private/` folder is only for internal unmasked dashboard data, not group evidence files.

For every checked vulnerability, add a review result note next to the evidence file:

```text
T{tutorial}G{group}_{sequence}_NOTES.md
```

The note should record the checked status, leaderboard decision, severity source, rubric breakdown, and the reason for the decision. Keep the note prefix matched to the primary vulnerability evidence file, for example `T26G05_07_NOTES.md` for `T26G05_07_pre_verification_consensus_state_poisoning.pdf`.

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
- `severitySource` (optional source label such as `Course-side assessed`)
- `severityRationale` (optional reason for an internally assessed severity)
- `severityScore` (0--6 rubric severity component)
- `impactEvidenceScore` (0--2 rubric impact-evidence component)
- `noveltyScore` (0--2 rubric novelty component)
- `basePoints` (optional unshared rubric score before credit weighting)
- `creditShare` (optional finding credit share, for example `0.5` for a jointly discovered finding split between two groups)
- `scoreReason` (optional short explanation for the displayed breakdown)
- `reportPlatform` (optional platform name, for example `HackerOne`)
- `studentReportId` (optional external report ID for the student's submission)
- `duplicateReportId` (optional external report ID for the duplicate/original report)
- `reportStatus` (optional status such as `Duplicate`, `Triaged`, or `Resolved`)
- `originalityStatus` (optional incident-level classification such as `Confirmed zero-day` or `Zero-day duplicate`)
- `evidenceNote` (optional short note for the table's Notes column)
- `mainStudents` (string or array of names)
- `tutorialNumber` or `tutorial` (string or number)
- `groupNumber` (string or number)
- `zeroDay` (boolean; use `true` for zero-day and zero-day duplicates; public non-zero-day findings should be excluded from the data file)
- `date` (`YYYY-MM-DD`)
- `points` (optional, number)
- `url` (optional)

If `mainStudents`, `tutorialNumber`, or `groupNumber` is omitted, the page falls back to matching student-level fields.
If `zeroDay` is omitted, the page infers zero-day status from duplicate evidence and `noveltyScore` where possible: confirmed duplicates and `2` are shown as zero-day. Non-zero-day and unknown entries are not displayed on the public leaderboard. `originalityStatus` is shown separately so zero-day duplicates are not mistaken for first disclosures.
For this leaderboard, `points` should normally be set explicitly and should reflect the rubric-aligned finding score rather than any assignment bonus mark.
For jointly discovered findings, set `creditShare` and use `points` for the credited score. For example, a base `S3 + I2 + N1 = 6` finding shared evenly by two groups should use `basePoints: 6`, `creditShare: 0.5`, and `points: 3` for each group.
If `points` is omitted, fallback points are pulled from the top-level `scoring` map, which is intentionally conservative.
If `points` is omitted but the rubric breakdown fields are present, the page will sum `severityScore + impactEvidenceScore + noveltyScore` and multiply by `creditShare` when provided.

## Optional Local Preview

Run from repository root:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
