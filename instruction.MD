# Leaderboard Review Instructions

These rules capture the grading/review taste for INFO5995 leaderboard evidence. Apply them before adding or changing any finding in `data/entries.json`.

## Review Disclaimer

The leaderboard is the unit coordinator's best-effort judgment from the private and public evidence available at review time. Some severity, novelty, and confirmation calls are necessarily subjective, especially when platforms hide report details or use different status vocabularies. Scores may change when new vendor/platform evidence, public disclosure evidence, or remediation evidence becomes available.

## Core Principle

The leaderboard is only for validated zero-days and valid zero-day duplicates. A duplicate can still be a zero-day if the earlier vendor/platform report is non-public. A vulnerability that already has a clear public disclosure, public advisory, public audit finding, public write-up, or public report does not count for this leaderboard and should not be added to `data/entries.json`.

## Required Review Order

1. Check whether the vulnerability is already public.
   - Search by exact title, affected project, function names, file paths, CWE, report ID, and distinctive exploit terms.
   - If a clear public disclosure/report exists, exclude the finding from the leaderboard.
   - Record the public disclosure link in the matching `TxxGyy_nn_NOTES.md`.
   - Public non-zero-day findings stay in private notes only; they are not displayed on the website.

2. Check vendor/platform confirmation.
   - Prefer vendor-confirmed or platform-confirmed status over student-written claims.
   - `Duplicate` status is useful for zero-day duplicate eligibility, but it does not automatically prove severity.
   - Official platform/vendor `Triaged` or `Triage` status can count only as provisional evidence unless the vendor/platform also shows final confirmation such as fixed, resolved, closed as valid, retesting after acceptance, or an equivalent accepted outcome.
   - Do not treat generic submission intake, pending review, risk verification pending, or status-hidden reports as official triage.

3. For duplicate reports, verify severity from the duplicate/original ticket when possible.
   - Do not rely on the student's current report card if it may be auto-scored or AI-scored.
   - If the current report is marked duplicate, the important severity is the duplicated/original ticket's severity.
   - If the original ticket's severity is visible and vendor/platform-confirmed, use that platform duplicate/original severity for the severity component.
   - If the duplicate/original status is officially Triaged, count it provisionally at 0.5 credit, mark it with `*` on the website, and revisit when final status is visible.
   - If only the student's visible card, AI-generated score, or no severity is available, estimate severity conservatively course-side and label the severity source as `Course-side assessed`.
   - If the platform marks the report or duplicate/original as Informative or Informational, do not count it unless later evidence shows a countable duplicate/original status.
   - If the duplicate/original status is New, Pending program review, needs more info, under review, or not visible, do not count it yet. Duplicate status alone is not enough for the public leaderboard.
   - If a duplicate/original card shows both an uncountable status and a severity value, the uncountable status wins. Do not count it.

4. If severity is not vendor-confirmed, use conservative course-side scoring.
   - Err slightly lower, not higher.
   - This is a fairness rule: students with vendor-confirmed severity usually face external severity compression, so internally assessed findings should not be inflated above externally confirmed findings.
   - Vendors are generally strict and often down-rank severity. Our course-side scores should align with that external strictness, or be stricter when evidence is incomplete.
   - AI-generated severity is not an authority. Treat it as a lead for review, not as a score.
   - Use Critical only when there is clear evidence for broad, easily repeatable, high-impact compromise, or a vendor/platform-confirmed Critical severity.
   - Otherwise, High is usually the ceiling for strong but internally assessed authorization, consensus, or smart-contract logic findings.
   - As more reports arrive, re-balance the whole set. Do not let early AI/course-side grades become a permanent high-water mark.

Score source has only two public categories:

- Platform duplicate/original score: use this when visible platform/vendor severity, especially the duplicate/original ticket severity, is available.
- Course-side score: use this when platform duplicate/original severity is absent or unclear. This is our own score and should be at least as strict as platform scoring.

## Provisional Triage Credit

- Officially triaged but not finally confirmed findings count at 0.5 provisional credit.
- Display provisional entries with an asterisk after the public score, for example `3*/10`.
- Store the unweighted rubric score in `basePoints`, set `provisionalCredit: 0.5`, set `provisionalStatus`, and set `points` to the credited half score.
- Provisional credit affects both total points and credited finding count. Keep this separate from `creditShare`, which is only for jointly discovered findings.
- If a triaged entry later becomes Resolved, Closed as valid, fixed, Retesting after acceptance, or otherwise finally confirmed, remove the provisional credit and restore full points.
- Retesting, Resolved, Closed as valid, fixed, or affected-organization confirmed reports count at full credit unless the evidence says the status is only intake triage.
- New, Pending program review, needs more info, under review, generic pending review, risk verification pending, Informative, Informational, status-hidden, or severity-only cards remain uncounted.

5. Record the decision in a private note.
   - Every checked vulnerability must have `reports/TxxGyy_nn_NOTES.md`.
   - Keep notes compact and consistent. Use the template below.
   - Include public disclosure links only when they affect the decision.

## Data Hygiene

- Keep group evidence files flat in `reports/`.
- Use `TxxGyy_nn_short_slug.ext` for evidence and `TxxGyy_nn_NOTES.md` for review notes.
- Do not reintroduce `pending/` or `checked/` folders.
- Do not copy sensitive target names, report IDs, exploit details, or private screenshots into public `data/entries.json` unless release is approved.
- If a private note and public data disagree, update one immediately. The note is the audit trail; `data/entries.json` is the public projection.

## Review Note Template

```md
# TxxGyy_nn Notes

- Evidence: `TxxGyy_nn_short_slug.ext`
- Status: checked
- Public: none found on YYYY-MM-DD / public, excluded: <link>
- Vendor: duplicate of `#id`; duplicate/original status <status/unknown>; original severity <severity/unknown>; current card <severity/unknown>
- Decision: counted as `<public title>` / excluded
- Score: Sx + Ix + Nx = base; provisional x0.5 = credited total / N/A
- Reason: one short sentence.
```

## Current Scoring Snapshot

Last reviewed: 2026-05-20.

Scoring formula: Severity (0-6) + Impact Evidence (0-2) + Novelty (0-2), capped at 10. Officially triaged but not finally confirmed findings receive 0.5 provisional credit and are shown with `*`.

Severity anchors:

- Critical: 6 severity points. Use for vendor/platform-confirmed Critical, CVSS 9.0+, or exceptionally strong course-side evidence of broad and repeatable critical impact.
- High: 4.5 severity points. Default ceiling for strong course-side assessed authorization, consensus, smart-contract logic, or data exposure findings when vendor severity is absent or not directly visible.
- Medium: 3 severity points. Use for vendor/platform Medium, privacy metadata disclosure, policy-hardening gaps, or findings with substantial prerequisites and limited direct impact.
- Novelty for zero-day duplicate: 1 point. Duplicates can be zero-day when the earlier report is non-public, but they do not receive full novelty.
- Novelty for confirmed zero-day / non-public original finding: 2 points when no public disclosure is found and the finding is vendor-confirmed or strongly supported.

Current public leaderboard entries:

| Team | Finding | Severity Source | Severity | Breakdown | Total |
| --- | --- | --- | --- | --- | --- |
| T14G01 | Sensitive data storage disclosure case A | Course-side assessed | Critical | S6 + I2 + N2 | 10 |
| T14G01 | Sensitive data storage disclosure case B | Course-side assessed | Critical | S6 + I2 + N2 | 10 |
| T14G01 | Private bug bounty authentication duplicate case C | Platform duplicate/original | Critical | S6 + I2 + N1 | 9 |
| T14G01 | Private bug bounty session expiration duplicate case D | Platform duplicate/original | Critical | S6 + I2 + N1 | 9 |
| T14G01 | Private mobile application cryptographic-key issue confirmed duplicate | Platform duplicate/original | Critical | S6 + I2 + N1 | 9 |
| T14G01 | Member-profile API access-control issue confirmed by affected organization | Course-side assessed | High | S4.5 + I2 + N2 | 8.5 |
| T14G02 | Access control disclosure confirmed and fixed | Course-side assessed | High | S4.5 + I2 + N2 | 8.5 |
| T18G01 | WordPress plugin private-content disclosure confirmed and patched | Course-side assessed | High | S4.5 + I2 + N2 | 8.5 |
| T18G01 | WordPress plugin user and visitor PII disclosure confirmed | Course-side assessed | High | S4.5 + I2 + N2 | 8.5 |
| T04G02 | Mobile URL handling confirmed duplicate | Platform duplicate/original | High | S4.5 + I2 + N1 | 7.5 |
| T12G05 | NFT bid payout recipient mismatch confirmed duplicate | Platform duplicate/original | High | S4.5 + I2 + N1 | 7.5 |
| T16G01 | Mobile app session fixation issue confirmed duplicate | Platform duplicate/original | High | S4.5 + I2 + N1 | 7.5 |
| T05G03 | Remote signing webhook policy-enforcement issue confirmed duplicate | Course-side assessed | High | S4.5 + I2 + N1 | 7.5 |
| T01G05 | Mobile AI app deep-link JS bridge trust bypass confirmed by vendor | Platform/vendor | Medium | S3 + I2 + N2 | 7 |
| T01G05 | Music app deep-link JS bridge exposure confirmed by vendor | Platform/vendor | Medium | S3 + I2 + N2 | 7 |
| T18G01 | WordPress checkout file-upload authorization issue confirmed and fixed | Course-side assessed | Medium | S3 + I2 + N2 | 7 |
| T18G01 | WordPress image-upload plugin unauthenticated upload issue fixed by vendor | Course-side assessed | Medium | S3 + I2 + N2 | 7 |
| T18G01 | WordPress payment plugin file-upload authorization issue confirmed and fixed | Course-side assessed | Medium | S3 + I2 + N2 | 7 |
| T18G01 | WordPress plugin REST registration bypass confirmed and fixed | Course-side assessed | Medium | S3 + I2 + N2 | 7 |
| T18G01 | WordPress plugin empty-key user-creation bypass confirmed and patched | Course-side assessed | Medium | S3 + I2 + N2 | 7 |
| T18G01 | WordPress plugin user-registration bypass acknowledged for fix | Course-side assessed | Medium | S3 + I2 + N2 | 7 |
| T26G05 | Invoice-download authorization bypass confirmed and fixed | Platform/vendor | Medium | S3 + I2 + N2 | 7 |
| T03G01 | Cloud console clickjacking issue confirmed duplicate | Course-side assessed | Medium | S3 + I2 + N1 | 6 |
| T23G02 | Smart-contract third-party deposit griefing issue confirmed duplicate | Platform duplicate/original | Medium | S3 + I2 + N1 | 6 |
| T26G05 | File-download authorization bypass confirmed duplicate | Platform duplicate/original | Medium | S3 + I2 + N1 | 6 |
| T28G01 | Mobile notes TLS hostname verification bypass confirmed duplicate | Platform duplicate/original | Medium | S3 + I2 + N1 | 6 |
| T31G05 | Reflected XSS route-parameter injection confirmed duplicate | Platform/vendor | Medium | S3 + I2 + N1 | 6 |
| T05G03 | Wallet light-client coin-state validation issue confirmed duplicate | Platform duplicate/original | Medium | S3 + I2 + N1 | 6 |
| T05G03 | Public data mirror DoS and enumeration issue confirmed duplicate | Platform duplicate/original | Medium | S3 + I2 + N1 | 6 |
| T03G01 | Map console token breadcrumb disclosure confirmed duplicate | Platform duplicate/original | Low | S1.5 + I2 + N1 | 4.5 |
| T05G03 | WalletConnect address-enumeration issue confirmed duplicate | Platform duplicate/original | Low | S1.5 + I2 + N1 | 4.5 |
| T05G03 | WalletConnect DID-recovery issue confirmed duplicate | Platform duplicate/original | Low | S1.5 + I2 + N1 | 4.5 |
| T05G03 | WalletConnect method-scope enforcement issue confirmed duplicate | Platform duplicate/original | Low | S1.5 + I2 + N1 | 4.5 |
| T21G01 | Open-source configuration endpoint exposure confirmed duplicate | Platform duplicate/original | Low | S1.5 + I2 + N1 | 4.5 |
| T21G01 | Open-source registry CI label authorization bypass confirmed duplicate | Platform/vendor | Low | S1.5 + I2 + N1 | 4.5 |
| T21G01 | Open-source registry patch path escape confirmed duplicate | Platform/vendor | Low | S1.5 + I2 + N1 | 4.5 |
| T21G01 | Anonymous form-submission rate-limit bypass confirmed duplicate | Platform/vendor | Low | S1.5 + I2 + N1 | 4.5 |
| T33G08 | Smart-contract withdrawal restriction issue confirmed duplicate | Platform duplicate/original | Low | S1.5 + I2 + N1 | 4.5 |
| T29G05 | Backup credential directory listing confirmed duplicate | Platform duplicate/original | High | (S4.5 + I2 + N1) x 0.5 provisional | 3.75* |
| T21G01 | Production source-map credential exposure confirmed duplicate | Platform duplicate/original | High | (S4.5 + I2 + N1) x 0.5 provisional | 3.75* |
| T33G08 | Project-scoped MCP branch operation bypass confirmed duplicate | Platform duplicate/original | High | (S4.5 + I2 + N1) x 0.5 provisional | 3.75* |
| T27G04 | Open-source library zip-bomb DoS confirmed duplicate | Platform duplicate/original | High | (S4.5 + I2 + N1) x 0.5 provisional | 3.75* |
| T02G01 | Cloud indexing extension persistent-state deserialization issue officially triaged | Platform/vendor | Medium | (S3 + I2 + N2) x 0.5 provisional | 3.5* |
| T04G04 | Android authentication callback custom-scheme issue officially triaged | Platform/vendor | Medium | (S3 + I2 + N2) x 0.5 provisional | 3.5* |
| T02G01 | Healthcare SOAP UsernameToken authentication path officially triaged | Platform/vendor | Medium | (S3 + I1 + N2) x 0.5 provisional | 3* |
| T04G03 | Client-side CMS draft-token exposure confirmed duplicate | Course-side assessed | Medium | (S3 + I2 + N1) x 0.5 provisional | 3* |
| T08G01 | Partner portal Firebase configuration exposure confirmed duplicate | Platform duplicate/original | Medium | (S3 + I2 + N1) x 0.5 provisional | 3* |
| T08G01 | Webhook verification fail-open issue confirmed duplicate | Platform duplicate/original | Medium | (S3 + I2 + N1) x 0.5 provisional | 3* |
| T14G01 | Mobile VoIP credential storage issue confirmed non-first report | Course-side assessed | Medium | (S3 + I2 + N1) x 0.5 | 3 |
| T14G02 | Client-side CMS token exposure confirmed duplicate | Course-side assessed | Medium | (S3 + I2 + N1) x 0.5 provisional | 3* |
| T19G03 | Mobile TLS hostname verification bypass confirmed duplicate | Platform duplicate/original | Medium | (S3 + I2 + N1) x 0.5 provisional | 3* |
| T28G01 | Mobile wallet JavaScript bridge data exposure confirmed duplicate | Course-side assessed | Medium | (S3 + I2 + N1) x 0.5 provisional | 3* |
| T29G01 | Mobile VoIP credential storage issue confirmed non-first report | Course-side assessed | Medium | (S3 + I2 + N1) x 0.5 | 3 |
| T33G08 | Read-only MCP export write bypass confirmed duplicate | Platform duplicate/original | Medium | (S3 + I2 + N1) x 0.5 provisional | 3* |
| T34G01 | Guest-access Salesforce record-read issue confirmed duplicate | Platform duplicate/original | Medium | (S3 + I2 + N1) x 0.5 provisional | 3* |
| T28G01 | Mobile push-tracking activity intent-injection issue officially triaged | Platform/vendor | Low | (S1.5 + I2 + N2) x 0.5 provisional | 2.75* |
| T21G01 | Android broadcast receiver intent-injection issue confirmed duplicate | Platform duplicate/original | Low | (S1.5 + I2 + N1) x 0.5 provisional | 2.25* |
| T21G01 | Authentication portal postMessage token exposure confirmed duplicate | Platform duplicate/original | Low | (S1.5 + I2 + N1) x 0.5 provisional | 2.25* |
| T33G08 | Chat plugin private-channel post reference issue confirmed duplicate | Platform duplicate/original | Low | (S1.5 + I2 + N1) x 0.5 provisional | 2.25* |

Current team totals:

| Team | Counted Findings | Total Points | Highest Single Finding |
| --- | ---: | ---: | ---: |
| T18G01 | 8 | 59 | 8.5 |
| T14G01 | 6.5 | 58.5 | 10 |
| T05G03 | 6 | 33 | 7.5 |
| T21G01 | 5.5 | 26.25 | 4.5 |
| T01G05 | 2 | 14 | 7 |
| T33G08 | 2.5 | 13.5 | 4.5 |
| T26G05 | 2 | 13 | 7 |
| T28G01 | 2 | 11.75 | 6 |
| T14G02 | 1.5 | 11.5 | 8.5 |
| T03G01 | 2 | 10.5 | 6 |
| T04G02 | 1 | 7.5 | 7.5 |
| T12G05 | 1 | 7.5 | 7.5 |
| T16G01 | 1 | 7.5 | 7.5 |
| T02G01 | 1 | 6.5 | 3.5 |
| T23G02 | 1 | 6 | 6 |
| T31G05 | 1 | 6 | 6 |
| T08G01 | 1 | 6 | 3 |
| T27G04 | 0.5 | 3.75 | 3.75 |
| T29G05 | 0.5 | 3.75 | 3.75 |
| T04G04 | 0.5 | 3.5 | 3.5 |
| T04G03 | 0.5 | 3 | 3 |
| T19G03 | 0.5 | 3 | 3 |
| T29G01 | 0.5 | 3 | 3 |
| T34G01 | 0.5 | 3 | 3 |

Current exclusions:

| Evidence | Decision | Public Disclosure |
| --- | --- | --- |
| `T05G02_01_ip_limits_connection_count_leak_duplicate.png` | Excluded for now; duplicate/original status is New | None found |
| `T05G02_02_thresholdparam_integer_overflow_duplicate.png` | Excluded for now; duplicate/original status is New | None found |
| `T05G02_03_votekeeper_unbounded_memory_growth_duplicate.png` | Excluded for now; duplicate/original status needs more info | None found |
| `T02G02_01_finality_threshold_validation_duplicate_email.pdf` | Excluded for now; duplicate/original status is New | None found |
| `T04G04_02_gojek_sso_provider_under_review_ywh.pdf` | Excluded for now; platform status is Under Review and triage is In progress | None found |
| `T10G03_01_phpbb_secure_downloads_hackerone.pdf` | Excluded; final platform classification is Informational/None | None found |
| `T20G01_01_03_bug_bounty_submissions.pdf` vulnerability 2 | Excluded for now; duplicate/original status is New | None found |
| `T26G05_01_broken_access_control_gatewayburn.pdf` | Excluded; already publicly disclosed | ChainSecurity Circle Gateway audit, section 8.6 |
| `T26G05_02_authorization_bypass_cold_storage_allowlist.pdf` | Excluded; duplicate/original status is Informative | None found |
| `T26G05_03_governance_bypass_toctou_controller_multisig.pdf` | Excluded; duplicate/original status is Informative | None found |
| `T26G05_04_privilege_management_stale_minters.pdf` | Excluded; duplicate/original status is Informative | None found |
| `T26G05_05_cryptoeconomic_integrity_sybil_leader_capture.pdf` | Excluded; duplicate/original status is Informative | None found |
| `T26G05_06_missing_authorization_withdrawal_hooks.pdf` | Excluded; duplicate/original status is Informative | None found |
| `T26G05_07_pre_verification_consensus_state_poisoning.pdf` | Excluded; already publicly disclosed | Medium write-up naming HackerOne report `#3578199` |
| `T26G05_08_hashvalidator_psbt_bypass.pdf` | Excluded for now; duplicate/original status is under review and severity is not confirmed | None found |
| `T26G05_09_static_deposit_privacy_bypass.pdf` | Excluded for now; duplicate/original status is Pending program review | None found |
| `T26G05_10_zuul_cswsh_origin_bypass.pdf` | Excluded for now; duplicate confirmed but duplicate/original severity not visible | None found |
| `T26G05_11_address_denylist_block_inclusion.pdf` | Excluded for now; duplicate/original status is Pending program review | None found |
| `T26G05_12_consensus_chain_split_wall_clock_timestamp.pdf` | Excluded for now; duplicate/original status is New | None found |
| `T26G05_13_roundcertificate_vote_forgery.pdf` | Excluded for now; duplicate/original status is Pending program review | None found |
| `T26G05_14_consensus_db_bloat_invalid_payloads.pdf` | Excluded; duplicate/original status is Informative | None found |
| `T26G05_15_malformed_ed25519_validatorproof_crash.pdf` | Excluded for now; duplicate/original status is Pending program review | None found |
| `T26G05_16_httpigeon_logger_sensitive_data_exposure.pdf` | Excluded; duplicate/original status is Informative | None found |
| `T26G05_17_stale_signature_reuse_consensus_metadata.pdf` | Excluded for now; duplicate/original status is Pending program review | None found |
| `T26G05_18_consensus_rest_api_p2p_peer_takeover.pdf` | Excluded for now; duplicate/original status needs more info | None found |
| `T26G02_01_monitoring_endpoint_information_disclosure.pdf` | Excluded; platform status is Informational duplicate | None found |
| `T20G01_01_03_bug_bounty_submissions.pdf` vulnerability 1 | Excluded; duplicate/original status is Informative | None found |
| `T20G01_01_03_bug_bounty_submissions.pdf` vulnerability 3 | Excluded; duplicate/original status is Informative | None found |
| `T32G03_01_mlflow_trace_access_public_cve.pdf` | Excluded; already publicly disclosed as CVE-2025-15381 / GHSA-g6pg-52vf-843h | OSV, GitHub Advisory, NVD, public huntr bounty |
| `T15G03_01_circle_untrusted_allow_asset_hackerone.docx` | Excluded for now; duplicate/original status is New | None found |
| `T15G03_02_circle_duplicate_attesters_hackerone.docx` | Excluded for now; current platform status is New and preliminary analyst review is not validation | None found |
| `T15G03_03_circle_consensus_rest_peer_management_hackerone.docx` | Excluded for now; duplicate/original status needs more info | None found |
| `T15G03_04_circle_starknet_controller_removal_hackerone.docx` | Excluded for now; duplicate/original status is New | None found |
| `T15G03_05_gala_bingo_csp.docx` | Excluded; no vendor/platform confirmation and student classified it as non-zero-day | None found |
| `T15G03_06_oppo_secondary_token.docx` | Excluded for now; no vendor/platform confirmation or official triage visible | None found |
| `T21G01_02_circle_client_version_disclosure_hackerone.pdf` | Excluded; duplicate/original status is N/A/not-applicable under program policy | None found |
| `T18G01_05_cf7cdb_data_deletion_*` | Excluded for now; no clear vendor/platform validation | None found |
| `T18G01_10_forms_by_madeit_upload_rce_*` | Excluded; already publicly disclosed before the student report | Wordfence/NVD CVE-2024-51791 |
| `T18G01_11_bakkbone_florist_order_creation_*` | Excluded; vendor says behavior is working as intended and not patchable on their side | None found |

Rebalancing note:

- Countable duplicate/original statuses include Triaged, Retesting, Resolved, or Closed. Official Triaged/Triage status is provisional at 0.5 credit until final confirmation. Retesting, Resolved, and Closed count at full credit when the evidence indicates acceptance or validation. Do not count New, Pending program review, needs more info, under review, generic pending review, risk verification pending, Informative, Informational, or status-not-visible duplicates.
- Existing counted Triaged entries audited on 2026-05-20: `T08G01_01` and `T14G02_02`; both now use `provisionalCredit: 0.5` and display `*`. Generic prose saying "triage confirmed" is not treated as provisional unless the actual report or duplicate/original status is official `Triaged` or `Triage`.
- T26G05 now uses duplicate/original severity when it is visible in the platform metadata, but only if duplicate/original status is countable.
- T26G05 duplicate/original screenshots must be OCR/read manually because the Informative status is often embedded in images rather than extractable PDF text.
- T26G05_02, T26G05_03, T26G05_04, T26G05_05, T26G05_06, T26G05_14, and T26G05_16 are excluded because their duplicate/original ticket status is Informative, even though some screenshots also show a severity value.
- T26G05_08, T26G05_09, T26G05_11, T26G05_12, T26G05_13, T26G05_15, T26G05_17, and T26G05_18 are excluded for now because the duplicate/original ticket is New, Pending program review, needs more info, under review, or otherwise not confirmed enough.
- T26G05's Zuul origin-validation report is confirmed Duplicate by a HackerOne email screenshot, but duplicate/original severity is not visible. Do not count it unless the original ticket severity becomes visible and is countable; if the original is Informative, it stays excluded.
- Non-T26 HackerOne duplicate evidence was OCR/manually checked on 2026-05-09 and refreshed on 2026-05-20 where new screenshots were provided. T02G02 and T20G01 vulnerability 2 are excluded for New duplicate/original status. T20G01 vulnerabilities 1 and 3 are already excluded for Informative duplicate/original status.
- T03G01_01 is now counted because the later screenshot includes an analyst comment that the original report was previously assessed. Use course-side Medium because original severity is not directly visible.
- T16G01_01 is counted from visible HackerOne duplicate/original High severity metadata. Keep target/app details withheld publicly.
- T19G03_01 is counted provisionally only: the duplicate/original severity is Medium, but the original report status is Triaged rather than finally confirmed.
- T18G01 has eight counted coordinated-disclosure WordPress plugin findings. Use course-side severity because vendor emails validate/fix the issues but generally do not assign severity; the vendor-disputed user-creation finding is downgraded to Medium. Exclude the data-deletion item for insufficient validation, the Forms by Made IT item because CVE-2024-51791 was already public, and the florist companion item because the vendor says the behavior is working as intended rather than confirming a vulnerability.
- T05G02 submissions from Jiayu Zhang are excluded for now. All three are HackerOne duplicates, but the duplicate/original tickets are New, New, and Needs more info respectively. Visible severity values do not override those uncountable statuses.
- T14G01_05 / T29G01_01 is a confirmed zero-day but not first to report. Count it under zero-day duplicate/non-first-report novelty N1, not first-disclosure novelty N2. It was jointly found by Maurice Ng and Yuchen Wu, so each group receives 0.5 finding credit and 0.5 of the base score: 6 x 0.5 = 3.
- T02G02 is not a duplicate of another currently reviewed INFO5995 group finding, but it is excluded for now because the duplicate/original status is New.
- T33G08's email subject mentions an earlier different submission, but the countable evidence in the latest thread is the platform original-report screenshot with Low severity. Use Low, not the student's High/Critical self-assessment.
- T33G08 attribution order is Haoyang Li first, then Hangyi Li, based on the team's correction that Haoyang found the issue first and Hangyi assisted.
- T02G01 has two official Intigriti Triage reports. Count them provisionally only: the deserialization item has full impact evidence, while the healthcare SOAP UsernameToken item has partial impact evidence because successful credentialed access was not demonstrated.
- T04G03 mirrors the earlier client-side CMS token duplicate pattern. The current report card shows High, but duplicate/original severity is not visible, so course-side Medium is the conservative score and Triaged duplicate/original status makes it provisional.
- T26G05_20 has a public vendor fix PR, but that PR was created and merged as remediation after the HackerOne report. Count it as a vendor-confirmed fixed zero-day unless earlier public disclosure evidence appears.
- T34G01 uses the visible duplicate/original Medium severity. Because the original report status is Triaged rather than finally resolved, keep provisional credit until final status changes.
- T15G03 Circle evidence was manually checked on 2026-05-20. Do not count visible High/Medium severities when duplicate/original status is New or Needs more info, and do not treat preliminary analyst review as official triage.
- T21G01 Google Issue Tracker evidence was checked on 2026-05-20. Google `P4` / `S4` is treated as Low severity for the course leaderboard; do not confuse it with the course `S4 Critical` rubric label.
- T05G03 evidence was manually checked on 2026-05-20. Count six closed HackerOne duplicates. Use duplicate/original severity where visible: three WalletConnect items are Low and two Chia items are Medium. The remote-signing policy-enforcement duplicate has current High severity but duplicate/original severity is not visible, so use course-side High from the visible current severity and policy-enforcement impact; revisit if the duplicate/original severity becomes visible.
- T27G04 evidence was manually checked on 2026-05-20. Count the closed duplicate provisionally because the duplicate/original severity is High but the visible original status is Triaged. Apply 0.5 provisional credit and keep the `*` until final status or other final validation is visible.
- If future vendor-confirmed High findings look similar in impact to a current course-side Critical, revisit the course-side Critical. Fairness favors aligning with vendor compression.
- If future evidence shows a counted T26G05 finding is publicly disclosed, remove it from the leaderboard and add the disclosure link to its notes.
