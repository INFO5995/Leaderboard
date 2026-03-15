const els = {
  pageTitle: document.getElementById("page-title"),
  seasonLabel: document.getElementById("season-label"),
  lastUpdated: document.getElementById("last-updated"),
  statStudents: document.getElementById("stat-students"),
  statFindings: document.getElementById("stat-findings"),
  statPoints: document.getElementById("stat-points"),
  scoringFormula: document.getElementById("scoring-formula"),
  severityScoreList: document.getElementById("severity-score-list"),
  impactScoreList: document.getElementById("impact-score-list"),
  noveltyScoreList: document.getElementById("novelty-score-list"),
  leaderboardBody: document.getElementById("leaderboard-body"),
  recentFeed: document.getElementById("recent-feed")
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

    renderMeta(data);
    renderStats(students);
    renderScoringModel(data);
    renderLeaderboard(findings);
    renderRecentFindings(findings);
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
  els.pageTitle.textContent = data.title || "Security Discovery Leaderboard";
  els.seasonLabel.textContent = data.season || "N/A";
  els.lastUpdated.textContent = formatDate(data.lastUpdated);
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

function renderStats(students) {
  const findingCount = students.reduce((sum, student) => sum + student.findingCount, 0);
  const totalPoints = students.reduce((sum, student) => sum + student.totalPoints, 0);

  els.statStudents.textContent = String(students.length);
  els.statFindings.textContent = String(findingCount);
  els.statPoints.textContent = formatScore(totalPoints);
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

function buildScoreCell(finding) {
  const wrap = document.createElement("div");
  wrap.className = "score-stack";

  const main = document.createElement("p");
  main.className = "score-main";
  main.textContent = `${formatScore(finding.points)}/10`;

  const sub = document.createElement("p");
  sub.className = "score-sub";
  sub.textContent = formatBreakdown(finding.scoreBreakdown);

  wrap.append(main, sub);
  return wrap;
}

function buildBreakdownCell(finding) {
  const wrap = document.createElement("div");
  wrap.className = "breakdown-stack";

  const line = document.createElement("p");
  line.className = "breakdown-line";
  line.textContent = formatBreakdown(finding.scoreBreakdown);

  wrap.append(line);

  if (finding.scoreReason) {
    const note = document.createElement("p");
    note.className = "breakdown-note";
    note.textContent = finding.scoreReason;
    wrap.append(note);
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
    ) || "-"
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
    ) || "-"
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
      student.groupNumber,
      student.group_number,
      student.group,
      student.cohort
    ) || "-"
  );
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
  const internalClass = severityClass(finding.internalSeverity);
  if (internalClass !== "sev-unknown") {
    return internalClass.replace("sev-", "tone-");
  }

  return severityClass(finding.externalSeverity).replace("sev-", "tone-");
}

function severityBadge(value, label) {
  const text = firstNonEmpty(value, "Unknown");
  const badge = document.createElement("span");
  badge.className = `sev-badge ${severityClass(text)}`;
  badge.textContent = text;
  badge.setAttribute("aria-label", `${label}: ${text}`);
  return badge;
}

function renderLeaderboard(findings) {
  els.leaderboardBody.innerHTML = "";

  if (findings.length === 0) {
    const row = document.createElement("tr");
    row.append(makeCell("No vulnerability entries yet.", ""));
    row.firstElementChild.colSpan = 7;
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
        label: "Internal Severity",
        value: severityBadge(finding.internalSeverity, "Internal Severity")
      },
      {
        label: "External Severity",
        value: severityBadge(finding.externalSeverity, "External Severity")
      },
      { label: "Rubric Score", value: buildScoreCell(finding) },
      { label: "Breakdown", value: buildBreakdownCell(finding) },
      { label: "Main Student(s)", value: finding.mainStudents || "Unknown" },
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
        mainStudents: resolveMainStudents(finding, student),
        groupNumber: resolveGroupNumber(finding, student)
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

function renderRecentFindings(findings) {
  els.recentFeed.innerHTML = "";
  const latest = findings.slice(0, 10);

  if (latest.length === 0) {
    const item = document.createElement("li");
    item.className = "feed-item";
    item.textContent = "No findings yet. Add entries in data/entries.json.";
    els.recentFeed.append(item);
    return;
  }

  latest.forEach((finding) => {
    const item = document.createElement("li");
    item.className = `feed-item ${rowToneClass(finding)}`;

    const head = document.createElement("div");
    head.className = "feed-head";

    const title = document.createElement("p");
    title.className = "feed-title";
    title.textContent = `${finding.type || "Finding"} - ${finding.title || "Untitled"}`;

    const points = document.createElement("span");
    points.className = "feed-points";
    points.textContent = `${finding.points}/10`;

    head.append(title, points);

    const meta = document.createElement("p");
    meta.className = "feed-meta";
    meta.textContent = `${finding.mainStudents} • ${finding.program || "Program withheld"} • ${formatDate(
      finding.date
    )}`;

    const severityMeta = document.createElement("div");
    severityMeta.className = "severity-inline";
    severityMeta.append(
      severityBadge(finding.internalSeverity, "Internal Severity"),
      severityBadge(finding.externalSeverity, "External Severity")
    );

    const breakdown = document.createElement("p");
    breakdown.className = "feed-breakdown";
    breakdown.textContent = formatBreakdown(finding.scoreBreakdown);

    item.append(head, meta, severityMeta, breakdown);

    if (finding.url) {
      const link = document.createElement("a");
      link.className = "feed-link";
      link.href = finding.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "View reference";
      item.append(link);
    }

    els.recentFeed.append(item);
  });
}

function showError(error) {
  console.error(error);
  els.leaderboardBody.innerHTML = "";
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 5;
  cell.textContent = "Unable to load leaderboard data. Check data/entries.json.";
  row.append(cell);
  els.leaderboardBody.append(row);

  els.recentFeed.innerHTML = "";
  const item = document.createElement("li");
  item.className = "feed-item";
  item.textContent = "Data load failed.";
  els.recentFeed.append(item);
}
