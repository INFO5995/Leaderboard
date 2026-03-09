const els = {
  pageTitle: document.getElementById("page-title"),
  seasonLabel: document.getElementById("season-label"),
  lastUpdated: document.getElementById("last-updated"),
  statStudents: document.getElementById("stat-students"),
  statFindings: document.getElementById("stat-findings"),
  statPoints: document.getElementById("stat-points"),
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

function resolvePoints(finding, scoring) {
  const explicit = Number(finding.points);
  if (Number.isFinite(explicit)) {
    return explicit;
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
      const scoredFindings = findings.map((finding) => ({
        ...finding,
        points: resolvePoints(finding, data.scoring)
      }));

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

function renderStats(students) {
  const findingCount = students.reduce((sum, student) => sum + student.findingCount, 0);
  const totalPoints = students.reduce((sum, student) => sum + student.totalPoints, 0);

  els.statStudents.textContent = String(students.length);
  els.statFindings.textContent = String(findingCount);
  els.statPoints.textContent = String(totalPoints);
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
    row.firstElementChild.colSpan = 5;
    els.leaderboardBody.append(row);
    return;
  }

  findings.forEach((finding) => {
    const row = document.createElement("tr");
    row.classList.add("record-row", rowToneClass(finding));

    const columns = [
      {
        label: "Internal Severity",
        value: severityBadge(finding.internalSeverity, "Internal Severity")
      },
      {
        label: "External Severity",
        value: severityBadge(finding.externalSeverity, "External Severity")
      },
      { label: "Main Student(s)", value: finding.mainStudents || "Unknown" },
      { label: "Group Number", value: finding.groupNumber || "-" },
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
    points.textContent = `+${finding.points} pts`;

    head.append(title, points);

    const meta = document.createElement("p");
    meta.className = "feed-meta";
    meta.textContent = `${finding.mainStudents} • Group ${finding.groupNumber} • ${formatDate(
      finding.date
    )}`;

    const severityMeta = document.createElement("div");
    severityMeta.className = "severity-inline";
    severityMeta.append(
      severityBadge(finding.internalSeverity, "Internal Severity"),
      severityBadge(finding.externalSeverity, "External Severity")
    );

    item.append(head, meta, severityMeta);

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
