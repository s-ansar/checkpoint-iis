// CheckPoint - stage 3
// Adds: line marking (click a line number to say "I think this is wrong"),
// a confidence rating that must be set before accepting, and an
// "Accepted, not yet checked" queue so flags stay visible after acceptance,
// with "I checked it" and "Undo acceptance" controls. All actions are logged.

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

function renderDone() {
  left.innerHTML = `<div class="panel"><h2>Done</h2>
    <p class="muted">You reviewed all ${CASES.length} suggestions. Check any remaining flags in the queue.</p></div>`;
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
