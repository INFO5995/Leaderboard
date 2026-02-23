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

    renderMeta(data);
    renderStats(students);
    renderLeaderboard(students);
    renderRecentFindings(students);
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

function renderLeaderboard(students) {
  els.leaderboardBody.innerHTML = "";

  if (students.length === 0) {
    const row = document.createElement("tr");
    row.append(makeCell("No student entries yet.", ""));
    row.firstElementChild.colSpan = 6;
    els.leaderboardBody.append(row);
    return;
  }

  students.forEach((student, index) => {
    const row = document.createElement("tr");
    const rankPill = document.createElement("span");
    rankPill.className = "rank-pill";
    rankPill.textContent = `#${index + 1}`;

    const studentCell = document.createElement("div");
    const studentName = document.createElement("span");
    studentName.className = "student-name";
    studentName.textContent = student.name || "Unknown";
    studentCell.append(studentName);
    if (student.notes) {
      const note = document.createElement("span");
      note.className = "student-note";
      note.textContent = student.notes;
      studentCell.append(note);
    }

    const latestText = student.latestFinding
      ? `${student.latestFinding.type || "Finding"}: ${student.latestFinding.title || "Untitled"}`
      : "No findings";

    row.append(makeCell(rankPill));
    row.append(makeCell(studentCell));
    row.append(makeCell(student.cohort || "-"));
    row.append(makeCell(student.findingCount));
    row.append(makeCell(student.totalPoints, "points"));
    row.append(makeCell(latestText));
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
        cohort: student.cohort || "-"
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

function renderRecentFindings(students) {
  els.recentFeed.innerHTML = "";
  const latest = flattenFindings(students).slice(0, 10);

  if (latest.length === 0) {
    const item = document.createElement("li");
    item.className = "feed-item";
    item.textContent = "No findings yet. Add entries in data/entries.json.";
    els.recentFeed.append(item);
    return;
  }

  latest.forEach((finding) => {
    const item = document.createElement("li");
    item.className = "feed-item";

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
    meta.textContent = `${finding.studentName} (${finding.cohort}) | ${
      finding.program || "Program not set"
    } | ${formatDate(finding.date)}`;

    item.append(head, meta);

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
  cell.colSpan = 6;
  cell.textContent = "Unable to load leaderboard data. Check data/entries.json.";
  row.append(cell);
  els.leaderboardBody.append(row);

  els.recentFeed.innerHTML = "";
  const item = document.createElement("li");
  item.className = "feed-item";
  item.textContent = "Data load failed.";
  els.recentFeed.append(item);
}
