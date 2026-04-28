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
  findings: []
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const response = await fetch("data/entries.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load leaderboard data.");
    }

    const data = await response.json();
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

function formatScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }

  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
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

function resolvePoints(finding, scoring, breakdown) {
  const explicit = Number(finding.points);
  if (Number.isFinite(explicit)) {
    return explicit;
  }

  const breakdownTotal =
    Number(breakdown?.severity ?? NaN) +
    Number(breakdown?.impact ?? NaN) +
    Number(breakdown?.novelty ?? NaN);
  if (Number.isFinite(breakdownTotal)) {
    return breakdownTotal;
  }

  const key = normalizeType(finding.type);
  const fallback = Number(scoring?.[key]);
  return Number.isFinite(fallback) ? fallback : 1;
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

        return {
          ...finding,
          scoreBreakdown: breakdown,
          points: resolvePoints(finding, data.scoring, breakdown)
        };
      });

      const totalPoints = scoredFindings.reduce((sum, finding) => sum + finding.points, 0);
      const latestFinding =
        scoredFindings
          .slice()
          .sort((a, b) => findingTimestamp(b) - findingTimestamp(a))[0] ?? null;

      return {
        ...student,
        findings: scoredFindings,
        findingCount: scoredFindings.length,
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
        const severityDelta = numericSeverityScore(b) - numericSeverityScore(a);
        if (severityDelta !== 0) {
          return severityDelta;
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
      const severityDelta = numericSeverityScore(b.topFinding) - numericSeverityScore(a.topFinding);
      if (severityDelta !== 0) {
        return severityDelta;
      }

      return findingTimestamp(b.topFinding) - findingTimestamp(a.topFinding);
    })
    .slice(0, 3);

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

      return findingTimestamp(b.topFinding) - findingTimestamp(a.topFinding);
    })
    .slice(0, 3);

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

  rows.forEach((row) => {
    const item = document.createElement("li");
    item.className = "ranking-item";

    const rank = document.createElement("span");
    rank.className = "ranking-rank";
    rank.textContent = `#${rows.indexOf(row) + 1}`;

    const body = document.createElement("div");
    body.className = "ranking-body";

    const title = document.createElement("p");
    title.className = "ranking-title";
    title.textContent = row.team;

    const detail = document.createElement("p");
    detail.className = "ranking-detail";
    if (mode === "severity") {
      detail.textContent = `Severity ${formatScore(numericSeverityScore(row.topFinding))}/6: ${
        row.topFinding.title
      }`;
    } else {
      detail.textContent = `${row.findingCount} validated finding${row.findingCount === 1 ? "" : "s"}`;
    }

    body.append(title, detail);
    item.append(rank, body);
    element.append(item);
  });
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
  meta.textContent = `${finding.type || "Finding"} • ${finding.program || "Program withheld"}`;

  wrap.append(title, meta);
  return wrap;
}

function formatBreakdown(breakdown) {
  if (
    !Number.isFinite(breakdown?.severity) ||
    !Number.isFinite(breakdown?.impact) ||
    !Number.isFinite(breakdown?.novelty)
  ) {
    return "Breakdown not provided";
  }

  return `Severity ${formatScore(breakdown.severity)} + Impact ${formatScore(
    breakdown.impact
  )} + Novelty ${formatScore(breakdown.novelty)}`;
}

function formatCompactBreakdown(breakdown) {
  if (
    !Number.isFinite(breakdown?.severity) ||
    !Number.isFinite(breakdown?.impact) ||
    !Number.isFinite(breakdown?.novelty)
  ) {
    return "No breakdown";
  }

  return `S ${formatScore(breakdown.severity)} / I ${formatScore(breakdown.impact)} / N ${formatScore(
    breakdown.novelty
  )}`;
}

function buildSeverityScoreCell(finding) {
  const wrap = document.createElement("div");
  wrap.className = "score-stack";

  const main = document.createElement("p");
  main.className = "score-main";
  main.textContent = `${formatScore(numericSeverityScore(finding))}/6`;

  const sub = document.createElement("p");
  sub.className = "score-sub";
  sub.textContent = "Severity only";
  sub.title = formatBreakdown(finding.scoreBreakdown);

  wrap.append(main, sub);
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
    statusLine.textContent = `Status: ${status}`;
    wrap.append(statusLine);
  }

  const evidenceNote = firstNonEmpty(finding.evidenceNote, finding.evidence_note, finding.reportNote, finding.report_note);
  if (evidenceNote) {
    const note = document.createElement("span");
    note.className = "notes-muted";
    note.textContent = evidenceNote;
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
      finding.internalSeverity ? "Internally assessed" : "",
      finding.internal_severity ? "Internally assessed" : ""
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

function resolveZeroDayStatus(finding) {
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

function buildSeverityCell(finding) {
  const wrap = document.createElement("div");
  wrap.className = "severity-stack";

  const value = firstNonEmpty(finding.severity, "Unknown");
  const text = firstNonEmpty(value, "Unknown");
  const badge = document.createElement("span");
  badge.className = `sev-badge ${severityClass(text)}`;
  badge.textContent = text;
  badge.setAttribute("aria-label", `Severity: ${text}`);

  const source = firstNonEmpty(finding.severitySource);
  const rationale = firstNonEmpty(finding.severityRationale);
  if (source) {
    const sourceLine = document.createElement("span");
    sourceLine.className = "severity-source";
    sourceLine.textContent = source;
    if (rationale) {
      sourceLine.title = rationale;
    }
    wrap.append(badge, sourceLine);
  } else {
    wrap.append(badge);
  }

  if (rationale && normalizeType(source).includes("internally")) {
    const reason = document.createElement("span");
    reason.className = "severity-reason";
    reason.textContent = rationale;
    wrap.append(reason);
  }

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
    "zero-day": state.findings.filter((finding) => finding.zeroDayStatus === "zero-day").length,
    "non-zero-day": state.findings.filter((finding) => finding.zeroDayStatus === "non-zero-day").length
  };
  const labels = {
    all: "All",
    "zero-day": "Zero-day",
    "non-zero-day": "Non-zero-day"
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

  return state.findings.filter((finding) => finding.zeroDayStatus === state.activeFilter);
}

function emptyFilterMessage() {
  if (state.activeFilter === "zero-day") {
    return "No zero-day vulnerability entries yet.";
  }

  if (state.activeFilter === "non-zero-day") {
    return "No non-zero-day vulnerability entries yet.";
  }

  return "No vulnerability entries yet.";
}

function renderLeaderboard(findings) {
  els.leaderboardBody.innerHTML = "";

  if (findings.length === 0) {
    const row = document.createElement("tr");
    row.append(makeCell(emptyFilterMessage(), ""));
    row.firstElementChild.colSpan = 8;
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
        label: "Notes",
        value: buildNotesCell(finding)
      },
      {
        label: "Severity",
        value: buildSeverityCell(finding)
      },
      { label: "Tutorial", value: formatLabelNumber("Tutorial", finding.tutorialNumber) },
      { label: "Group", value: formatLabelNumber("Group", finding.groupNumber) },
      { label: "Zero-day", value: zeroDayBadge(finding.zeroDayStatus) },
      { label: "Severity Score", value: buildSeverityScoreCell(finding) },
      { label: "Date", value: formatDate(finding.date) }
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
        zeroDayStatus: resolveZeroDayStatus(finding)
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
  cell.colSpan = 8;
  cell.textContent = "Unable to load leaderboard data. Check data/entries.json.";
  row.append(cell);
  els.leaderboardBody.append(row);
}
