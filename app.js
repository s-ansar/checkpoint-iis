// CheckPoint - stage 2
// Adds rule-based risk highlights on the suggestion, a short explanation
// for each flag, and a sensitivity setting (fewer / more flags).

const state = {
  index: 0,
  phase: "generating", // generating -> reviewing
  sensitivity: "more",
  openFlagLine: null,
  decisions: []
};

const left = document.getElementById("left");
const right = document.getElementById("right");
const progress = document.getElementById("progress");

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
  render();
  setTimeout(() => {
    state.phase = "reviewing";
    render();
  }, 900);
}

function decide(decision) {
  state.decisions.push({ caseId: currentCase().id, decision, flags: currentFlags() });
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
    const cls = flag ? `risk-${flag.level}` : "";
    const btn = flag
      ? `<button class="flag-btn" data-line="${n}" title="Why is this flagged?">⚑ why?</button>`
      : "";
    return `
      <div class="code-line ${cls}">
        <span class="num">${n}</span>
        <pre>${escapeHtml(line)}</pre>
        ${btn}
      </div>`;
  }).join("");
}

function renderExplanation(flags) {
  if (state.openFlagLine === null) return "";
  const lineFlags = flags.filter(f => f.line === state.openFlagLine);
  return lineFlags.map(f => `
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
    left.innerHTML = `<div class="panel"><h2>Done</h2>
      <p class="muted">You reviewed all ${CASES.length} suggestions.</p></div>`;
    renderSide();
    return;
  }

  const c = currentCase();
  const flags = currentFlags();
  const body = state.phase === "generating"
    ? `<div class="generating">AI assistant is writing a suggestion…</div>`
    : renderCode(c, flags);

  const flagSummary = state.phase !== "reviewing" ? "" : flags.length
    ? `${flags.length} line${flags.length > 1 ? "s" : ""} flagged for checking.`
    : "No lines flagged.";

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
      <div class="actions">
        <button class="primary" id="accept" ${state.phase !== "reviewing" ? "disabled" : ""}>Accept</button>
        <button class="secondary" id="reject" ${state.phase !== "reviewing" ? "disabled" : ""}>Reject</button>
      </div>
    </div>`;

  if (state.phase === "reviewing") {
    document.getElementById("accept").onclick = () => decide("accepted");
    document.getElementById("reject").onclick = () => decide("rejected");
    left.querySelectorAll(".flag-btn").forEach(b => {
      b.onclick = () => {
        const n = Number(b.dataset.line);
        state.openFlagLine = state.openFlagLine === n ? null : n;
        render();
      };
    });
  }
  renderSide();
}

function renderSide() {
  const accepted = state.decisions.filter(d => d.decision === "accepted");
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
      <h2>Your file</h2>
      ${accepted.length === 0
        ? `<div class="muted">Accepted suggestions appear here.</div>`
        : accepted.map(d => `<div class="queue-item">${CASES.find(c => c.id === d.caseId).title}</div>`).join("")}
    </div>`;

  right.querySelectorAll("input[name=sens]").forEach(r => {
    r.onchange = () => { state.sensitivity = r.value; state.openFlagLine = null; render(); };
  });
}

startCase();
