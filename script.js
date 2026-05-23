const els = {
  pageTitle: document.getElementById("page-title"),
  seasonLabel: document.getElementById("season-label"),
  lastUpdated: document.getElementById("last-updated"),
  scoringFormula: document.getElementById("scoring-formula"),
  severityScoreList: document.getElementById("severity-score-list"),
  impactScoreList: document.getElementById("impact-score-list"),
  noveltyScoreList: document.getElementById("novelty-score-list"),
  leaderboardBody: document.getElementById("leaderboard-body"),
  severityRanking: document.getElementById("severity-ranking"),
  countRanking: document.getElementById("count-ranking"),
  filterTabs: Array.from(document.querySelectorAll("[data-filter]"))
};

const state = {
  activeFilter: "all",
  findings: [],
  studentProfiles: {}
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const response = await fetch("data/entries.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load leaderboard data.");
    }

    const data = await response.json();
    state.studentProfiles = normalizeStudentProfiles(data.studentProfiles);
    const students = buildStudents(data);
    const findings = flattenFindings(students);

    state.findings = findings;
    setupFilterTabs();
    renderMeta(data);
    renderScoringModel(data);
    renderBonusRankings(students);
    if (els.leaderboardBody) {
      updateFilterTabs();
      renderLeaderboard(getFilteredFindings());
    }
  } catch (error) {
    showError(error);
  }
}

function normalizeType(type) {
  return String(type || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const parsed = parseDate(value);
  if (!parsed) {
    return "Unknown date";
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatCompactDate(value) {
  const parsed = parseDate(value);
  if (!parsed) {
    return "--/--/--";
  }

  return parsed.toLocaleDateString("en-GB", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit"
  });
}

function formatScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }

  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2).replace(/\.?0+$/, "");
}

function resolveScorePart(finding, ...keys) {
  for (const key of keys) {
    const value = Number(finding?.[key]);
    if (Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function resolveScoreBreakdown(finding) {
  const severity = resolveScorePart(
    finding,
    "severityScore",
    "severity_score",
    "severityPoints",
    "severity_points"
  );
  const impact = resolveScorePart(
    finding,
    "impactEvidenceScore",
    "impact_evidence_score",
    "impactScore",
    "impact_score"
  );
  const novelty = resolveScorePart(
    finding,
    "noveltyScore",
    "novelty_score",
    "noveltyPoints",
    "novelty_points"
  );

  return { severity, impact, novelty };
}

function scoreBreakdownTotal(breakdown) {
  const total =
    Number(breakdown?.severity ?? NaN) +
    Number(breakdown?.impact ?? NaN) +
    Number(breakdown?.novelty ?? NaN);
  return Number.isFinite(total) ? total : null;
}

function resolveCreditShare(finding) {
  const explicit = Number(
    finding.creditShare ?? finding.credit_share ?? finding.findingShare ?? finding.finding_share ?? finding.share
  );
  return Number.isFinite(explicit) && explicit > 0 ? explicit : 1;
}

function resolveProvisionalCredit(finding) {
  const explicit = Number(
    finding.provisionalCredit ??
      finding.provisional_credit ??
      finding.validationCredit ??
      finding.validation_credit
  );
  return Number.isFinite(explicit) && explicit > 0 ? Math.min(explicit, 1) : 1;
}

function isProvisionalFinding(finding) {
  return (
    Number(finding.provisionalCredit) < 1 ||
    Boolean(firstNonEmpty(finding.provisionalStatus, finding.provisional_status))
  );
}

function resolveBasePoints(finding, scoring, breakdown) {
  const explicit = Number(finding.basePoints ?? finding.base_points ?? finding.baseScore ?? finding.base_score);
  if (Number.isFinite(explicit)) {
    return explicit;
  }

  const breakdownTotal = scoreBreakdownTotal(breakdown);
  if (Number.isFinite(breakdownTotal)) {
    return breakdownTotal;
  }

  const key = normalizeType(finding.type);
  const fallback = Number(scoring?.[key]);
  return Number.isFinite(fallback) ? fallback : 1;
}

function resolvePoints(finding, scoring, breakdown) {
  const explicit = Number(finding.points);
  if (Number.isFinite(explicit)) {
    return explicit;
  }

  return resolveBasePoints(finding, scoring, breakdown) * resolveCreditShare(finding) * resolveProvisionalCredit(finding);
}

function findingTimestamp(finding) {
  return parseDate(finding.date)?.getTime() ?? 0;
}

function buildStudents(data) {
  const rawStudents = Array.isArray(data.students) ? data.students : [];

  return rawStudents
    .map((student) => {
      const findings = Array.isArray(student.findings) ? student.findings : [];
      const scoredFindings = findings.map((finding) => {
        const breakdown = resolveScoreBreakdown(finding);
        const creditShare = resolveCreditShare(finding);
        const provisionalCredit = resolveProvisionalCredit(finding);
        const findingCredit = creditShare * provisionalCredit;

        return {
          ...finding,
          scoreBreakdown: breakdown,
          basePoints: resolveBasePoints(finding, data.scoring, breakdown),
          creditShare,
          provisionalCredit,
          findingCredit,
          points: resolvePoints(finding, data.scoring, breakdown)
        };
      });

      const totalPoints = scoredFindings.reduce((sum, finding) => sum + finding.points, 0);
      const findingCount = scoredFindings.reduce((sum, finding) => sum + finding.findingCredit, 0);
      const latestFinding =
        scoredFindings
          .slice()
          .sort((a, b) => findingTimestamp(b) - findingTimestamp(a))[0] ?? null;

      return {
        ...student,
        findings: scoredFindings,
        findingCount,
        totalPoints,
        latestFinding
      };
    })
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }

      if (b.findingCount !== a.findingCount) {
        return b.findingCount - a.findingCount;
      }

      return String(a.name || "").localeCompare(String(b.name || ""));
    });
}

function renderMeta(data) {
  if (els.pageTitle) {
    els.pageTitle.textContent = data.title || "Security Discovery Leaderboard";
  }

  if (els.seasonLabel) {
    els.seasonLabel.textContent = data.season || "N/A";
  }

  if (els.lastUpdated) {
    els.lastUpdated.textContent = formatDate(data.lastUpdated);
  }
}

function renderScoringList(element, items) {
  if (!element) {
    return;
  }

  element.innerHTML = "";
  if (!Array.isArray(items) || items.length === 0) {
    const item = document.createElement("li");
    item.textContent = "Not configured.";
    element.append(item);
    return;
  }

  items.forEach((entry) => {
    const item = document.createElement("li");

    const score = document.createElement("span");
    score.className = "score-chip";
    score.textContent = `${formatScore(entry.score)} pts`;

    const text = document.createElement("span");
    text.textContent = entry.label
      ? `${entry.label}: ${entry.detail || ""}`.trim()
      : entry.detail || "";

    item.append(score, text);
    element.append(item);
  });
}

function renderScoringModel(data) {
  const model = data.scoringModel || {};
  if (els.scoringFormula) {
    els.scoringFormula.textContent =
      model.formula ||
      "Final finding score = Severity (0-6) + Impact Evidence (0-2) + Novelty (0-2), capped at 10.";
  }

  renderScoringList(els.severityScoreList, model.severityTiers);
  renderScoringList(els.impactScoreList, model.impactEvidence);
  renderScoringList(els.noveltyScoreList, model.novelty);
}

function resolveTeamLabel(student) {
  const tutorial = firstNonEmpty(student.tutorialNumber, student.tutorial_number, student.tutorial, student.tut);
  const group = firstNonEmpty(student.groupNumber, student.group_number, student.group, student.teamNumber, student.team);

  if (tutorial && group) {
    return `Tutorial ${tutorial} / Group ${group}`;
  }

  if (group) {
    return `Group ${group}`;
  }

  return firstNonEmpty(student.name, "Unknown team");
}

function numericSeverityScore(finding) {
  const explicit = Number(finding?.scoreBreakdown?.severity);
  if (Number.isFinite(explicit)) {
    return explicit;
  }

  return Number(resolveScorePart(finding, "severityScore", "severity_score", "severityPoints", "severity_points"));
}

function topSeverityFinding(student) {
  return (
    student.findings
      .slice()
      .sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }

        return findingTimestamp(b) - findingTimestamp(a);
      })[0] ?? null
  );
}

function bonusRankRows(students) {
  const rankedTeams = students.map((student) => ({
    student,
    team: resolveTeamLabel(student),
    findingCount: student.findingCount,
    topFinding: topSeverityFinding(student)
  }));

  const severity = rankedTeams
    .filter((row) => row.topFinding)
    .sort((a, b) => {
      if (b.topFinding.points !== a.topFinding.points) {
        return b.topFinding.points - a.topFinding.points;
      }

      return findingTimestamp(b.topFinding) - findingTimestamp(a.topFinding);
    });

  const count = rankedTeams
    .filter((row) => row.findingCount > 0)
    .sort((a, b) => {
      if (b.findingCount !== a.findingCount) {
        return b.findingCount - a.findingCount;
      }

      const severityDelta = numericSeverityScore(b.topFinding) - numericSeverityScore(a.topFinding);
      if (severityDelta !== 0) {
        return severityDelta;
      }

      return b.topFinding.points - a.topFinding.points;
    });

  return { severity, count };
}

function renderRankingList(element, rows, mode) {
  if (!element) {
    return;
  }

  element.innerHTML = "";
  if (rows.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No ranked teams yet.";
    element.append(item);
    return;
  }

  rows.forEach((row, index) => {
    const item = document.createElement("li");
    item.className = "ranking-item";

    const rank = document.createElement("span");
    rank.className = "ranking-rank";
    rank.textContent = rankingLabel(rows, index, mode);

    const body = document.createElement("div");
    body.className = "ranking-body";

    const title = document.createElement("p");
    title.className = "ranking-title";
    title.textContent = row.team;

    const detail = document.createElement("p");
    detail.className = "ranking-detail";
    if (mode === "severity") {
      const creditShare = Number(row.topFinding.creditShare);
      const shareNote = Number.isFinite(creditShare) && creditShare !== 1 ? ` (shared x${formatScore(creditShare)})` : "";
      const provisionalCredit = Number(row.topFinding.provisionalCredit);
      const provisionalNote =
        Number.isFinite(provisionalCredit) && provisionalCredit !== 1 ? ` (triage x${formatScore(provisionalCredit)})` : "";
      detail.textContent = `Rubric ${formatScore(row.topFinding.points)}${
        isProvisionalFinding(row.topFinding) ? "*" : ""
      }/10${shareNote}${provisionalNote}`;
    } else {
      detail.textContent = `${formatScore(row.findingCount)} credited finding${row.findingCount === 1 ? "" : "s"}`;
    }

    const heading = document.createElement("div");
    heading.className = "ranking-heading";
    heading.append(title, detail);

    const students = document.createElement("p");
    students.className = "ranking-students";
    const rankingStudents =
      mode === "severity" ? firstNonEmpty(row.topFinding?.mainStudents, resolveTeamStudents(row.student)) : resolveTeamStudents(row.student);
    appendLinkedStudentNames(students, rankingStudents);

    body.append(heading, students);
    item.append(rank, body);
    element.append(item);
  });
}

function rankingMetric(row, mode) {
  if (mode === "severity") {
    return Number(row.topFinding?.points ?? 0);
  }

  return Number(row.findingCount ?? 0);
}

function rankingLabel(rows, index, mode) {
  const metric = rankingMetric(rows[index], mode);
  const rank = rows.filter((row) => rankingMetric(row, mode) > metric).length + 1;
  const tied = rows.filter((row) => rankingMetric(row, mode) === metric).length > 1;
  return `${tied ? "=" : "#"}${rank}`;
}

function renderBonusRankings(students) {
  const rankings = bonusRankRows(students);
  renderRankingList(els.severityRanking, rankings.severity, "severity");
  renderRankingList(els.countRanking, rankings.count, "count");
}

function makeCell(content, className) {
  const td = document.createElement("td");
  if (className) {
    td.className = className;
  }

  if (content instanceof Node) {
    td.append(content);
  } else {
    td.textContent = String(content ?? "");
  }

  return td;
}

function buildFindingCell(finding) {
  const wrap = document.createElement("div");
  wrap.className = "finding-stack";

  const title = document.createElement("p");
  title.className = "finding-title";
  title.textContent = finding.title || "Untitled finding";

  const meta = document.createElement("p");
  meta.className = "finding-meta";
  meta.textContent = `${finding.type || "Finding"} • Added ${formatCompactDate(finding.date)} • ${
    finding.program || "Program withheld"
  }`;

  wrap.append(title, meta);
  return wrap;
}

function buildLeadStudentsCell(finding) {
  const wrap = document.createElement("div");
  wrap.className = "students-stack";

  const main = document.createElement("p");
  main.className = "students-main";
  appendLinkedStudentNames(main, finding.mainStudents);
  main.title = finding.mainStudents || "";

  wrap.append(main);
  return wrap;
}

function formatBreakdown(finding) {
  const breakdown = finding.scoreBreakdown;
  if (
    !Number.isFinite(breakdown?.severity) ||
    !Number.isFinite(breakdown?.impact) ||
    !Number.isFinite(breakdown?.novelty)
  ) {
    return "Breakdown not provided";
  }

  const total = scoreBreakdownTotal(breakdown);
  const creditShare = Number(finding.creditShare);
  const provisionalCredit = Number(finding.provisionalCredit);
  const adjustments = [];
  if (Number.isFinite(creditShare) && creditShare !== 1) {
    adjustments.push(`credit share ${formatScore(creditShare)}`);
  }
  if (Number.isFinite(provisionalCredit) && provisionalCredit !== 1) {
    adjustments.push(`provisional triage credit ${formatScore(provisionalCredit)}`);
  }
  const adjustmentNote = adjustments.length ? ` = base ${formatScore(total)}; ${adjustments.join("; ")}` : "";

  return `Severity ${formatScore(breakdown.severity)} + Impact ${formatScore(
    breakdown.impact
  )} + Novelty ${formatScore(breakdown.novelty)}${adjustmentNote}`;
}

function formatCompactBreakdown(finding) {
  const breakdown = finding.scoreBreakdown;
  if (
    !Number.isFinite(breakdown?.severity) ||
    !Number.isFinite(breakdown?.impact) ||
    !Number.isFinite(breakdown?.novelty)
  ) {
    return "No breakdown";
  }

  const base = `S ${formatScore(breakdown.severity)} / I ${formatScore(breakdown.impact)} / N ${formatScore(
    breakdown.novelty
  )}`;
  const creditShare = Number(finding.creditShare);
  const provisionalCredit = Number(finding.provisionalCredit);
  const adjustments = [];
  if (Number.isFinite(creditShare) && creditShare !== 1) {
    adjustments.push(`shared x${formatScore(creditShare)}`);
  }
  if (Number.isFinite(provisionalCredit) && provisionalCredit !== 1) {
    adjustments.push(`triage x${formatScore(provisionalCredit)}`);
  }
  return adjustments.length ? `${base} (${adjustments.join(", ")})` : base;
}

function buildScoreCell(finding) {
  const wrap = document.createElement("div");
  wrap.className = "score-stack";

  const main = document.createElement("p");
  main.className = "score-main";
  main.textContent = `${formatScore(finding.points)}${isProvisionalFinding(finding) ? "*" : ""}/10`;

  const sub = document.createElement("p");
  sub.className = "score-sub";
  sub.textContent = formatCompactBreakdown(finding);
  sub.title = formatBreakdown(finding);

  wrap.append(main, sub);

  if (isProvisionalFinding(finding)) {
    const provisional = document.createElement("p");
    provisional.className = "score-provisional";
    provisional.textContent = "Triage 50%";
    wrap.append(provisional);
  }

  return wrap;
}

function severitySourceKind(finding) {
  const source = normalizeType(firstNonEmpty(finding.severitySource));
  const hasExternalSeverity = firstNonEmpty(
    finding.externalSeverity,
    finding.external_severity,
    finding.severityExternal,
    finding.severity_external
  );

  if (
    hasExternalSeverity ||
    source.includes("external") ||
    source.includes("platform") ||
    source.includes("vendor")
  ) {
    return "vendor";
  }

  if (
    source.includes("course") ||
    source.includes("internal") ||
    source.includes("assessed")
  ) {
    return "course";
  }

  return "unknown";
}

function severitySourceLabel(kind) {
  if (kind === "vendor") {
    return "Platform";
  }

  if (kind === "course") {
    return "Course";
  }

  return "Unknown";
}

function buildScoreSourceCell(finding) {
  const wrap = document.createElement("div");
  wrap.className = "score-source-stack";

  const kind = severitySourceKind(finding);
  const source = firstNonEmpty(finding.severitySource);
  const rationale = firstNonEmpty(finding.severityRationale);
  const pill = document.createElement("span");
  pill.className = `source-pill source-${kind}`;
  pill.textContent = severitySourceLabel(kind);

  const details = [source, rationale].filter(Boolean).join(": ");
  if (details) {
    pill.title = details;
  }

  const note = document.createElement("span");
  note.className = "source-note";
  if (kind === "vendor") {
    note.textContent = "Original severity";
  } else if (kind === "course") {
    note.textContent = "May adjust";
  } else {
    note.textContent = "Not documented";
  }

  wrap.append(pill, note);
  return wrap;
}

function buildTeamCell(finding) {
  const wrap = document.createElement("div");
  wrap.className = "team-stack";

  const tutorial = document.createElement("span");
  tutorial.className = "team-main";
  tutorial.textContent = firstNonEmpty(finding.tutorialNumber) ? `Tut ${finding.tutorialNumber}` : "-";

  const group = document.createElement("span");
  group.className = "team-sub";
  group.textContent = firstNonEmpty(finding.groupNumber) ? `Group ${finding.groupNumber}` : "-";

  wrap.append(tutorial, group);
  return wrap;
}

function formatReportId(value) {
  const text = firstNonEmpty(value);
  return text.replace(/^#/, "");
}

function reportUrlForId(finding, id, kind) {
  const explicitUrl =
    kind === "student"
      ? firstNonEmpty(finding.studentReportUrl, finding.student_report_url, finding.hackerOneStudentUrl)
      : firstNonEmpty(finding.duplicateReportUrl, finding.duplicate_report_url, finding.hackerOneDuplicateUrl);

  if (explicitUrl) {
    return explicitUrl;
  }

  const normalizedId = formatReportId(id);
  if (!normalizedId) {
    return "";
  }

  const platform = normalizeType(
    firstNonEmpty(
      finding.reportPlatform,
      finding.report_platform,
      finding.platform,
      finding.hackerOneStudentId || finding.hackerOneDuplicateId ? "HackerOne" : ""
    )
  );

  if (["hackerone", "hacker_one", "h1"].includes(platform)) {
    return `https://hackerone.com/reports/${encodeURIComponent(normalizedId)}`;
  }

  const baseUrl = firstNonEmpty(finding.reportBaseUrl, finding.report_base_url);
  if (baseUrl) {
    return `${baseUrl.replace(/\/+$/, "")}/${encodeURIComponent(normalizedId)}`;
  }

  return "";
}

function buildReportLink(finding, id, label, kind) {
  const normalizedId = formatReportId(id);
  if (!normalizedId) {
    return null;
  }

  const url = reportUrlForId(finding, normalizedId, kind);
  if (!url) {
    const span = document.createElement("span");
    span.className = "notes-link notes-text";
    span.textContent = `${label} #${normalizedId}`;
    return span;
  }

  const link = document.createElement("a");
  link.className = "notes-link";
  link.href = url;
  link.textContent = `${label} #${normalizedId}`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function buildNotesCell(finding) {
  const wrap = document.createElement("div");
  wrap.className = "notes-stack";

  const student = buildReportLink(finding, finding.studentReportId, "Student", "student");
  const duplicate = buildReportLink(finding, finding.duplicateReportId, "Duplicate", "duplicate");

  if (student) {
    wrap.append(student);
  }

  if (duplicate) {
    wrap.append(duplicate);
  }

  const status = firstNonEmpty(finding.reportStatus, finding.hackerOneStatus, finding.status);
  if (status) {
    const statusLine = document.createElement("span");
    statusLine.className = "notes-muted";
    statusLine.textContent = status;
    wrap.append(statusLine);
  }

  if (isProvisionalFinding(finding)) {
    const provisionalCredit = Number(finding.provisionalCredit);
    const statusText = firstNonEmpty(finding.provisionalStatus, finding.provisional_status, "official triage");
    const creditText =
      Number.isFinite(provisionalCredit) && provisionalCredit !== 1
        ? `${formatScore(provisionalCredit * 100)}% credit`
        : "provisional credit";
    const provisional = document.createElement("span");
    provisional.className = "notes-provisional";
    provisional.textContent = `Provisional: ${creditText}`;
    provisional.title = statusText;
    wrap.append(provisional);
  }

  const evidenceNote = firstNonEmpty(finding.evidenceNote, finding.evidence_note, finding.reportNote, finding.report_note);
  if (evidenceNote) {
    const note = document.createElement("span");
    note.className = "notes-muted notes-evidence";
    note.textContent = "Evidence reviewed";
    note.title = evidenceNote;
    wrap.append(note);
  }

  if (!student && !duplicate && !status && !evidenceNote) {
    const empty = document.createElement("span");
    empty.className = "notes-muted";
    empty.textContent = "-";
    wrap.append(empty);
  }

  return wrap;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }

    const text = String(value).trim();
    if (text) {
      return text;
    }
  }

  return "";
}

function normalizeNameList(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) {
      return [];
    }

    if (text.includes(",")) {
      return text
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    }

    return [text];
  }

  return [];
}

function normalizeStudentProfiles(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([name, url]) => [String(name).trim(), String(url).trim()])
      .filter(([name, url]) => name && /^https?:\/\//i.test(url))
  );
}

function resolveTeamStudents(student) {
  const names = normalizeNameList(student.mainStudents ?? student.main_students ?? student.students);
  if (names.length > 0) {
    return names.join(", ");
  }

  return firstNonEmpty(student.studentName, student.student_name, student.name, "Unknown");
}

function leadStudentLabel(value) {
  const names = normalizeNameList(value);
  if (names.length > 0) {
    return names.join(", ");
  }

  const text = firstNonEmpty(value);
  return text || "Not listed";
}

function appendLinkedStudentNames(element, value) {
  const names = normalizeNameList(value);
  if (names.length === 0) {
    element.textContent = leadStudentLabel(value);
    return;
  }

  names.forEach((name, index) => {
    if (index > 0) {
      element.append(document.createTextNode(", "));
    }

    const url = state.studentProfiles[name];
    if (!url) {
      element.append(document.createTextNode(name));
      return;
    }

    const link = document.createElement("a");
    link.className = "student-link";
    link.href = url;
    link.textContent = name;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    element.append(link);
  });
}

function resolveInternalSeverity(finding) {
  return (
    firstNonEmpty(
      finding.internalSeverity,
      finding.internal_severity,
      finding.severityInternal,
      finding.severity_internal,
      finding.internalSeverityClassification,
      finding.internal_classification
    ) || ""
  );
}

function resolveExternalSeverity(finding) {
  return (
    firstNonEmpty(
      finding.externalSeverity,
      finding.external_severity,
      finding.severityExternal,
      finding.severity_external,
      finding.externalSeverityClassification,
      finding.external_classification
    ) || ""
  );
}

function resolveSeveritySource(finding) {
  return (
    firstNonEmpty(
      finding.severitySource,
      finding.severity_source,
      finding.externalSeverity ? "External platform" : "",
      finding.external_severity ? "External platform" : "",
      finding.severityExternal ? "External platform" : "",
      finding.severity_external ? "External platform" : "",
      finding.internalSeverity ? "Course-side assessed" : "",
      finding.internal_severity ? "Course-side assessed" : ""
    ) || "Unknown"
  );
}

function resolveSeverityRationale(finding) {
  return firstNonEmpty(
    finding.severityRationale,
    finding.severity_rationale,
    finding.scoreReason,
    finding.evidenceNote,
    finding.evidence_note
  );
}

function resolveMainStudents(finding, student) {
  const fromFinding = normalizeNameList(
    finding.mainStudents ??
      finding.main_students ??
      finding.studentNames ??
      finding.student_names ??
      finding.students
  );

  if (fromFinding.length > 0) {
    return fromFinding.join(", ");
  }

  const singleStudent = firstNonEmpty(
    finding.mainStudent,
    finding.main_student,
    finding.studentName,
    finding.student_name
  );

  if (singleStudent) {
    return singleStudent;
  }

  const fromStudent = normalizeNameList(student.mainStudents ?? student.students);
  if (fromStudent.length > 0) {
    return fromStudent.join(", ");
  }

  return firstNonEmpty(student.name, "Unknown");
}

function resolveGroupNumber(finding, student) {
  return (
    firstNonEmpty(
      finding.groupNumber,
      finding.group_number,
      finding.group,
      finding.teamNumber,
      finding.team_number,
      finding.team,
      student.groupNumber,
      student.group_number,
      student.group,
      student.teamNumber,
      student.team_number,
      student.team
    ) || "-"
  );
}

function resolveTutorialNumber(finding, student) {
  return (
    firstNonEmpty(
      finding.tutorialNumber,
      finding.tutorial_number,
      finding.tutorial,
      finding.tut,
      student.tutorialNumber,
      student.tutorial_number,
      student.tutorial,
      student.tut
    ) || "-"
  );
}

function resolveStudentReportId(finding) {
  return formatReportId(
    firstNonEmpty(
      finding.studentReportId,
      finding.student_report_id,
      finding.hackerOneStudentId,
      finding.hackeroneStudentId,
      finding.hackerone_student_id,
      finding.h1StudentId,
      finding.h1_student_id,
      finding.studentHackerOneId,
      finding.student_hackerone_id,
      finding.studentReportId,
      finding.student_report_id
    )
  );
}

function resolveDuplicateReportId(finding) {
  return formatReportId(
    firstNonEmpty(
      finding.duplicateReportId,
      finding.duplicate_report_id,
      finding.hackerOneDuplicateId,
      finding.hackeroneDuplicateId,
      finding.hackerone_duplicate_id,
      finding.h1DuplicateId,
      finding.h1_duplicate_id,
      finding.duplicateHackerOneId,
      finding.duplicate_hackerone_id,
      finding.duplicateReportId,
      finding.duplicate_report_id,
      finding.duplicateOf,
      finding.duplicate_of
    )
  );
}

function formatLabelNumber(label, value) {
  const text = firstNonEmpty(value);
  if (!text || text === "-") {
    return "-";
  }

  const normalized = text.toLowerCase();
  if (normalized.startsWith(label.toLowerCase())) {
    return text;
  }

  return `${label} ${text}`;
}

function normalizeZeroDayValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "zero-day" : "non-zero-day";
  }

  const normalized = normalizeType(value);
  if (
    [
      "true",
      "yes",
      "y",
      "zero_day",
      "zeroday",
      "0_day",
      "0day",
      "day_0",
      "day0"
    ].includes(normalized)
  ) {
    return "zero-day";
  }

  if (
    [
      "false",
      "no",
      "n",
      "non_zero_day",
      "nonzeroday",
      "not_zero_day",
      "known",
      "one_day",
      "1_day",
      "1day"
    ].includes(normalized)
  ) {
    return "non-zero-day";
  }

  if (
    normalized.includes("non_zero_day") ||
    normalized.includes("not_zero_day") ||
    normalized.includes("one_day")
  ) {
    return "non-zero-day";
  }

  if (normalized.includes("zero_day") || normalized.includes("zeroday")) {
    return "zero-day";
  }

  return "";
}

function isDuplicateStatus(value) {
  const normalized = normalizeType(value);
  if (!normalized) {
    return false;
  }

  if (["duplicate", "dupe", "duplicated", "zero_day_duplicate", "zeroday_duplicate"].includes(normalized)) {
    return true;
  }

  if (
    normalized.includes("not_duplicate") ||
    normalized.includes("non_duplicate") ||
    normalized.includes("not_a_duplicate")
  ) {
    return false;
  }

  return normalized.split("_").includes("duplicate") || normalized.split("_").includes("duplicated");
}

function hasDuplicateSignal(finding) {
  return (
    Boolean(resolveDuplicateReportId(finding)) ||
    [
      finding.reportStatus,
      finding.hackerOneStatus,
      finding.status,
      finding.originalityStatus,
      finding.originality_status,
      finding.zeroDayStatus,
      finding.zero_day_status,
      finding.novelty,
      finding.noveltyLabel,
      finding.novelty_label
    ].some(isDuplicateStatus)
  );
}

function resolveZeroDayStatus(finding) {
  if (hasDuplicateSignal(finding)) {
    return "zero-day";
  }

  const explicitValues = [
    finding.zeroDay,
    finding.zero_day,
    finding.zeroday,
    finding.isZeroDay,
    finding.is_zero_day,
    finding.zeroDayStatus,
    finding.zero_day_status,
    finding.novelty,
    finding.noveltyLabel,
    finding.novelty_label
  ];

  for (const value of explicitValues) {
    const status = normalizeZeroDayValue(value);
    if (status) {
      return status;
    }
  }

  const noveltyScore = resolveScorePart(
    finding,
    "noveltyScore",
    "novelty_score",
    "noveltyPoints",
    "novelty_points"
  );
  if (Number.isFinite(noveltyScore)) {
    if (noveltyScore >= 2) {
      return "zero-day";
    }

    if (noveltyScore === 1) {
      return "non-zero-day";
    }
  }

  return "unknown";
}

function normalizeSeverity(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function severityClass(value) {
  const normalized = normalizeSeverity(value);

  if (["critical", "severe", "urgent", "p0", "p1"].includes(normalized)) {
    return "sev-critical";
  }

  if (["high", "major", "important", "p2"].includes(normalized)) {
    return "sev-high";
  }

  if (["medium", "moderate", "p3"].includes(normalized)) {
    return "sev-medium";
  }

  if (["low", "minor", "p4"].includes(normalized)) {
    return "sev-low";
  }

  return "sev-unknown";
}

function rowToneClass(finding) {
  return severityClass(finding.severity).replace("sev-", "tone-");
}

function buildTagsCell(finding) {
  const wrap = document.createElement("div");
  wrap.className = "tag-stack";

  const value = firstNonEmpty(finding.severity, "Unknown");
  const text = firstNonEmpty(value, "Unknown");
  const severity = document.createElement("span");
  severity.className = `sev-badge ${severityClass(text)}`;
  severity.textContent = text;
  severity.setAttribute("aria-label", `Severity: ${text}`);
  wrap.append(severity);

  const source = firstNonEmpty(finding.severitySource);
  const rationale = firstNonEmpty(finding.severityRationale);
  if (source) {
    const kind = severitySourceKind(finding);
    const sourceTag = document.createElement("span");
    sourceTag.className = `source-pill source-${kind}`;
    sourceTag.textContent = severitySourceLabel(kind);
    sourceTag.title = [source, rationale].filter(Boolean).join(": ");
    wrap.append(sourceTag);
  }

  wrap.append(originalityBadge(finding.originalityStatus));
  return wrap;
}

function zeroDayBadge(status) {
  const normalized = ["zero-day", "non-zero-day"].includes(status) ? status : "unknown";
  const badge = document.createElement("span");
  badge.className = `zero-badge zero-${normalized.replace(/[^a-z0-9]+/g, "-")}`;
  badge.textContent =
    normalized === "zero-day" ? "Zero-day" : normalized === "non-zero-day" ? "Non-zero-day" : "Unknown";
  badge.setAttribute("aria-label", `Zero-day status: ${badge.textContent}`);
  return badge;
}

function resolveOriginalityStatus(finding, zeroDayStatus) {
  const explicit = firstNonEmpty(
    finding.originalityStatus,
    finding.originality_status,
    finding.discoveryStatus,
    finding.discovery_status,
    finding.disclosureStatus,
    finding.disclosure_status,
    finding.novelty,
    finding.noveltyLabel,
    finding.novelty_label
  );
  const normalized = normalizeType(explicit);

  if (hasDuplicateSignal(finding)) {
    return {
      kind: "duplicate",
      label: "Zero-day duplicate",
      detail: explicit || "Confirmed duplicate of a non-public report."
    };
  }

  if (
    normalized.includes("candidate") ||
    normalized.includes("under_review") ||
    normalized.includes("unconfirmed")
  ) {
    return {
      kind: "candidate",
      label: "Candidate",
      detail: explicit || "Course-side zero-day candidate; vendor confirmation not visible."
    };
  }

  if (
    normalized.includes("public") ||
    normalized.includes("known") ||
    normalized.includes("one_day") ||
    normalized.includes("non_zero_day") ||
    normalized.includes("not_zero_day")
  ) {
    return {
      kind: "known",
      label: "Known/public",
      detail: explicit || "Already publicly disclosed or otherwise not treated as first disclosure."
    };
  }

  const noveltyScore = resolveScorePart(
    finding,
    "noveltyScore",
    "novelty_score",
    "noveltyPoints",
    "novelty_points"
  );
  if (Number.isFinite(noveltyScore) && noveltyScore >= 2 && zeroDayStatus === "zero-day") {
    return {
      kind: "first",
      label: "First disclosure",
      detail: explicit || "Non-public issue with full novelty credit."
    };
  }

  if (zeroDayStatus === "non-zero-day") {
    return {
      kind: "known",
      label: "Known/public",
      detail: explicit || "Not treated as a zero-day."
    };
  }

  return {
    kind: "unknown",
    label: explicit || "Unknown",
    detail: explicit || "Originality is not documented yet."
  };
}

function originalityBadge(originality) {
  const kind = originality?.kind || "unknown";
  const badge = document.createElement("span");
  badge.className = `originality-badge originality-${kind}`;
  const fullLabel = originality?.label || "Unknown";
  if (kind === "duplicate") {
    badge.textContent = "Duplicate";
  } else if (kind === "first") {
    badge.textContent = "First";
  } else {
    badge.textContent = fullLabel;
  }
  badge.title = [fullLabel, originality?.detail].filter(Boolean).join(": ");
  badge.setAttribute("aria-label", `Originality: ${fullLabel}`);
  return badge;
}

function setupFilterTabs() {
  els.filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.activeFilter = tab.dataset.filter || "all";

      els.filterTabs.forEach((item) => {
        const isActive = item === tab;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-selected", String(isActive));
      });

      updateFilterTabs();
      renderLeaderboard(getFilteredFindings());
    });
  });
}

function updateFilterTabs() {
  const counts = {
    all: state.findings.length,
    first: state.findings.filter((finding) => finding.originalityStatus.kind === "first").length,
    duplicate: state.findings.filter((finding) => finding.originalityStatus.kind === "duplicate").length
  };
  const labels = {
    all: "All",
    first: "First disclosure",
    duplicate: "Duplicates"
  };

  els.filterTabs.forEach((tab) => {
    const filter = tab.dataset.filter || "all";
    tab.textContent = `${labels[filter] || labels.all} (${counts[filter] ?? counts.all})`;
  });
}

function getFilteredFindings() {
  if (state.activeFilter === "all") {
    return state.findings;
  }

  return state.findings.filter((finding) => finding.originalityStatus.kind === state.activeFilter);
}

function emptyFilterMessage() {
  if (state.activeFilter === "first") {
    return "No first-disclosure zero-day entries yet.";
  }

  if (state.activeFilter === "duplicate") {
    return "No zero-day duplicate entries yet.";
  }

  return "No vulnerability entries yet.";
}

function renderLeaderboard(findings) {
  els.leaderboardBody.innerHTML = "";

  if (findings.length === 0) {
    const row = document.createElement("tr");
    row.append(makeCell(emptyFilterMessage(), ""));
    row.firstElementChild.colSpan = 6;
    els.leaderboardBody.append(row);
    return;
  }

  findings.forEach((finding) => {
    const row = document.createElement("tr");
    row.classList.add("record-row", rowToneClass(finding));

    const columns = [
      {
        label: "Finding",
        value: buildFindingCell(finding)
      },
      {
        label: "Lead Students",
        value: buildLeadStudentsCell(finding)
      },
      {
        label: "Status",
        value: buildNotesCell(finding)
      },
      {
        label: "Tags",
        value: buildTagsCell(finding)
      },
      { label: "Team", value: buildTeamCell(finding) },
      { label: "Rubric Score", value: buildScoreCell(finding) }
    ];

    columns.forEach((column) => {
      const cell = makeCell(column.value);
      cell.setAttribute("data-label", column.label);
      row.append(cell);
    });

    els.leaderboardBody.append(row);
  });
}

function flattenFindings(students) {
  const findings = [];

  students.forEach((student) => {
    student.findings.forEach((finding) => {
      const zeroDayStatus = resolveZeroDayStatus(finding);
      if (zeroDayStatus !== "zero-day") {
        return;
      }
      const originalityStatus = resolveOriginalityStatus(finding, zeroDayStatus);
      if (originalityStatus.kind === "known") {
        return;
      }

      findings.push({
        ...finding,
        studentName: student.name || "Unknown",
        cohort: student.cohort || "-",
        internalSeverity: resolveInternalSeverity(finding),
        externalSeverity: resolveExternalSeverity(finding),
        severity: firstNonEmpty(resolveExternalSeverity(finding), resolveInternalSeverity(finding)),
        severitySource: resolveSeveritySource(finding),
        severityRationale: resolveSeverityRationale(finding),
        mainStudents: resolveMainStudents(finding, student),
        groupNumber: resolveGroupNumber(finding, student),
        tutorialNumber: resolveTutorialNumber(finding, student),
        studentReportId: resolveStudentReportId(finding),
        duplicateReportId: resolveDuplicateReportId(finding),
        zeroDayStatus,
        originalityStatus
      });
    });
  });

  return findings.sort((a, b) => {
    if (findingTimestamp(b) !== findingTimestamp(a)) {
      return findingTimestamp(b) - findingTimestamp(a);
    }
    return b.points - a.points;
  });
}

function showError(error) {
  console.error(error);
  if (!els.leaderboardBody) {
    return;
  }

  els.leaderboardBody.innerHTML = "";
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 6;
  cell.textContent = "Unable to load leaderboard data. Check data/entries.json.";
  row.append(cell);
  els.leaderboardBody.append(row);
}
