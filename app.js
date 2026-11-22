// CheckPoint
// Stage 1: task + simulated AI suggestion + accept/reject.
// Stage 2: rule-based risk highlights, short explanations, sensitivity setting.
// Stage 3: line marking, confidence rating before accepting, and an
//          "Accepted, not yet checked" queue with "I checked it" / "Undo".
// Stage 4: results screen (bugs caught, confidence vs correctness) and a
//          downloadable JSON session log.

const state = {
  index: 0,
  phase: "generating", // generating -> reviewing -> (next case) ... -> done
  sensitivity: "more",
  openFlagLine: null,
  marked: new Set(),   // line numbers the person marked as suspicious
  confidence: null,    // 0-100, null until the person moves the slider
  decisions: [],       // one entry per case
  log: []              // timestamped events
};

const left = document.getElementById("left");
const right = document.getElementById("right");
const progress = document.getElementById("progress");

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function logEvent(type, detail) {
  state.log.push({ t: new Date().toISOString(), type, ...detail });
}

function currentCase() {
  return CASES[state.index];
}

function currentFlags() {
  return detectRisks(currentCase().code, state.sensitivity);
}

function startCase() {
  state.phase = "generating";
  state.openFlagLine = null;
  state.marked = new Set();
  state.confidence = null;
  render();
  setTimeout(() => {
    state.phase = "reviewing";
    logEvent("shown", { caseId: currentCase().id, flags: currentFlags().map(f => f.line) });
    render();
  }, 900);
}

function decide(decision) {
  const c = currentCase();
  const flags = currentFlags();
  state.decisions.push({
    caseId: c.id,
    decision,                         // accepted | rejected | undone
    confidence: state.confidence,
    marked: [...state.marked].sort((a, b) => a - b),
    flags,
    checked: [],                      // flag lines confirmed after acceptance
    sensitivity: state.sensitivity
  });
  logEvent(decision, { caseId: c.id, confidence: state.confidence, marked: [...state.marked] });
  state.index += 1;
  if (state.index < CASES.length) {
    startCase();
  } else {
    state.phase = "done";
    render();
  }
}

function renderCode(c, flags) {
  return c.code.map((line, i) => {
    const n = i + 1;
    const flag = flags.find(f => f.line === n);
    const classes = [flag ? `risk-${flag.level}` : "", state.marked.has(n) ? "user-mark" : ""].join(" ");
    const btn = flag
      ? `<button class="flag-btn" data-line="${n}" title="Why is this flagged?">⚑ why?</button>`
      : "";
    return `
      <div class="code-line ${classes}">
        <span class="num" data-line="${n}" title="Click to mark this line as wrong">${n}</span>
        <pre>${escapeHtml(line)}</pre>
        ${btn}
      </div>`;
  }).join("");
}

function renderExplanation(flags) {
  if (state.openFlagLine === null) return "";
  return flags.filter(f => f.line === state.openFlagLine).map(f => `
    <div class="explain ${f.level}">
      <span class="tag ${f.level}">${f.level === "high" ? "High risk" : "Check"}</span>
      Line ${f.line}: ${f.reason}
      <div class="how">Check: ${f.check}</div>
    </div>`).join("");
}

function render() {
  progress.textContent = state.phase === "done"
    ? "All tasks complete"
    : `Task ${state.index + 1} of ${CASES.length}`;

  if (state.phase === "done") {
    renderDone();
    renderSide();
    return;
  }

  const c = currentCase();
  const flags = currentFlags();
  const reviewing = state.phase === "reviewing";
  const body = reviewing ? renderCode(c, flags)
    : `<div class="generating">AI assistant is writing a suggestion…</div>`;

  const flagSummary = !reviewing ? "" : flags.length
    ? `${flags.length} line${flags.length > 1 ? "s" : ""} flagged for checking. Click a line number to mark a line you think is wrong.`
    : "No lines flagged. Click a line number to mark a line you think is wrong.";

  const conf = state.confidence === null ? "–" : `${state.confidence}%`;

  left.innerHTML = `
    <div class="panel">
      <h2>${c.title}</h2>
      <div class="muted">${c.task}</div>
    </div>
    <div class="panel">
      <h2>AI suggestion</h2>
      <div class="muted">${flagSummary}</div>
      <div class="code">${body}</div>
      ${renderExplanation(flags)}
      <div class="notice">Highlights come from simple checks, not proof. Unflagged lines can still be wrong.</div>
    </div>
    <div class="panel">
      <h2>How sure are you that this code is correct?</h2>
      <div class="slider-row">
        <span class="muted">Not sure</span>
        <input type="range" id="conf" min="0" max="100" step="10" value="${state.confidence ?? 50}" ${reviewing ? "" : "disabled"}>
        <span class="muted">Certain</span>
        <span class="slider-value">${conf}</span>
      </div>
      <div class="actions">
        <button class="primary" id="accept" ${reviewing && state.confidence !== null ? "" : "disabled"}>Accept</button>
        <button class="secondary" id="reject" ${reviewing ? "" : "disabled"}>Reject</button>
      </div>
      ${reviewing && state.confidence === null ? `<div class="muted" style="margin-top:8px">Rate your confidence to enable Accept.</div>` : ""}
    </div>`;

  if (reviewing) {
    document.getElementById("conf").oninput = e => {
      state.confidence = Number(e.target.value);
      render();
    };
    document.getElementById("accept").onclick = () => decide("accepted");
    document.getElementById("reject").onclick = () => decide("rejected");
    left.querySelectorAll(".flag-btn").forEach(b => {
      b.onclick = () => {
        const n = Number(b.dataset.line);
        state.openFlagLine = state.openFlagLine === n ? null : n;
        if (state.openFlagLine !== null) logEvent("explain-opened", { caseId: c.id, line: n });
        render();
      };
    });
    left.querySelectorAll(".code-line .num").forEach(el => {
      el.onclick = () => {
        const n = Number(el.dataset.line);
        state.marked.has(n) ? state.marked.delete(n) : state.marked.add(n);
        logEvent("line-marked", { caseId: c.id, line: n, on: state.marked.has(n) });
        render();
      };
    });
  }
  renderSide();
}

// Outcome of one decision, judged against the planted bugs.
// A buggy suggestion counts as "caught" if it was rejected/undone or if the
// person marked at least one real bug line before accepting.
function outcome(d) {
  const c = CASES.find(x => x.id === d.caseId);
  const buggy = c.bugLines.length > 0;
  const kept = d.decision === "accepted";
  const markedBug = d.marked.some(n => c.bugLines.includes(n));
  if (buggy && (!kept || markedBug)) return { label: "Bug caught", good: true };
  if (buggy && kept) return { label: "Bug missed", good: false };
  if (!buggy && kept) return { label: "Correct code kept", good: true };
  return { label: "Correct code rejected", good: false };
}

function average(values) {
  const v = values.filter(x => x !== null && x !== undefined);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

function renderDone() {
  const rows = state.decisions.map(d => {
    const c = CASES.find(x => x.id === d.caseId);
    const o = outcome(d);
    const flagged = d.flags.map(f => f.line);
    const sysCaught = c.bugLines.filter(n => flagged.includes(n));
    return `<tr>
      <td><strong>${c.title}</strong><div class="muted">${c.bugNote}</div></td>
      <td>${d.decision}</td>
      <td>${d.confidence === null ? "–" : d.confidence + "%"}</td>
      <td>${c.bugLines.length ? c.bugLines.join(", ") : "none"}</td>
      <td>${d.marked.length ? d.marked.join(", ") : "–"}</td>
      <td>${flagged.length ? flagged.join(", ") : "–"}${c.bugLines.length && sysCaught.length < c.bugLines.length ? ` <span class="tag medium">missed ${c.bugLines.length - sysCaught.length}</span>` : ""}</td>
      <td><span class="tag ${o.good ? "ok" : "high"}">${o.label}</span></td>
    </tr>`;
  }).join("");

  const scored = state.decisions.map(d => ({ d, o: outcome(d) }));
  const caught = scored.filter(s => s.o.label === "Bug caught").length;
  const buggyTotal = CASES.filter(c => c.bugLines.length).length;
  // Calibration: compare confidence on correct code the person kept with
  // confidence on buggy code they kept without spotting the bug.
  const confRight = average(scored.filter(s => s.o.label === "Correct code kept").map(s => s.d.confidence));
  const confWrong = average(scored.filter(s => s.o.label === "Bug missed").map(s => s.d.confidence));
  const unchecked = state.decisions.filter(d => d.decision === "accepted" && unresolvedFlags(d).length).length;

  left.innerHTML = `
    <div class="panel">
      <h2>Results</h2>
      <div class="summary-grid">
        <div class="stat"><div class="big">${caught} / ${buggyTotal}</div><div class="label">buggy suggestions caught</div></div>
        <div class="stat"><div class="big">${confRight ?? "–"}${confRight === null ? "" : "%"}</div><div class="label">confidence when you kept correct code</div></div>
        <div class="stat"><div class="big">${confWrong ?? "–"}${confWrong === null ? "" : "%"}</div><div class="label">confidence when you kept buggy code without spotting the bug</div></div>
        <div class="stat"><div class="big">${unchecked}</div><div class="label">accepted suggestions with unchecked flags</div></div>
      </div>
      <div class="muted">Well-calibrated trust means high confidence on correct code and low confidence on buggy code.</div>
    </div>
    <div class="panel">
      <h2>Suggestion by suggestion</h2>
      <table class="results">
        <tr><th>Task</th><th>Decision</th><th>Confidence</th><th>Real bug lines</th><th>You marked</th><th>System flagged</th><th>Outcome</th></tr>
        ${rows}
      </table>
      <div class="actions">
        <button class="secondary" id="export">Download session log (JSON)</button>
        <button class="secondary" id="restart">Start again</button>
      </div>
    </div>`;

  document.getElementById("export").onclick = exportLog;
  document.getElementById("restart").onclick = () => location.reload();
}

function exportLog() {
  const data = { exportedAt: new Date().toISOString(), decisions: state.decisions, log: state.log };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "checkpoint-session.json";
  a.click();
}

function unresolvedFlags(d) {
  return d.flags.filter(f => !d.checked.includes(f.line));
}

function renderSide() {
  const accepted = state.decisions.filter(d => d.decision === "accepted");
  const pending = accepted.filter(d => unresolvedFlags(d).length > 0);

  right.innerHTML = `
    <div class="panel">
      <h2>Flag sensitivity</h2>
      <div class="muted">More flags catch more problems but cause more false alarms.</div>
      <div class="sensitivity">
        <label><input type="radio" name="sens" value="fewer" ${state.sensitivity === "fewer" ? "checked" : ""}> Fewer flags</label>
        <label><input type="radio" name="sens" value="more" ${state.sensitivity === "more" ? "checked" : ""}> More flags</label>
      </div>
    </div>
    <div class="panel">
      <h2>Accepted, not yet checked (${pending.length})</h2>
      ${pending.length === 0
        ? `<div class="muted">Flags on accepted code stay here until you check them.</div>`
        : pending.map(d => renderQueueItem(d)).join("")}
    </div>
    <div class="panel">
      <h2>Your file</h2>
      ${accepted.length === 0
        ? `<div class="muted">Accepted suggestions appear here.</div>`
        : accepted.map(d => {
            const open = unresolvedFlags(d).length;
            return `<div class="queue-item">${CASES.find(c => c.id === d.caseId).title}
              ${open ? `<span class="tag high">${open} unchecked</span>` : `<span class="tag ok">no open flags</span>`}</div>`;
          }).join("")}
    </div>`;

  right.querySelectorAll("input[name=sens]").forEach(r => {
    r.onchange = () => {
      state.sensitivity = r.value;
      state.openFlagLine = null;
      logEvent("sensitivity", { value: r.value });
      render();
    };
  });
  right.querySelectorAll("[data-check]").forEach(b => {
    b.onclick = () => {
      const [caseId, line] = b.dataset.check.split(":");
      const d = state.decisions.find(x => x.caseId === caseId);
      d.checked.push(Number(line));
      logEvent("checked-after-accept", { caseId, line: Number(line) });
      render();
    };
  });
  right.querySelectorAll("[data-undo]").forEach(b => {
    b.onclick = () => {
      const d = state.decisions.find(x => x.caseId === b.dataset.undo);
      d.decision = "undone";
      logEvent("undone", { caseId: d.caseId });
      render();
    };
  });
}

function renderQueueItem(d) {
  const c = CASES.find(x => x.id === d.caseId);
  return `
    <div class="queue-item">
      <div class="q-title">${c.title}</div>
      ${unresolvedFlags(d).map(f => `
        <div class="q-flag">
          <span class="tag ${f.level}">Line ${f.line}</span>${f.reason}
          <div class="muted">Check: ${f.check}</div>
          <button class="ghost" data-check="${d.caseId}:${f.line}">I checked it</button>
        </div>`).join("")}
      <button class="ghost" data-undo="${d.caseId}">Undo acceptance</button>
    </div>`;
}

startCase();
