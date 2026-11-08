// CheckPoint - stage 1
// Shows a coding task, a simulated AI suggestion, and lets the person
// accept or reject it. Accepted code is added to "Your file".

const state = {
  index: 0,
  phase: "generating", // generating -> reviewing
  decisions: []        // { caseId, decision }
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

function startCase() {
  state.phase = "generating";
  render();
  // Simulated model latency; an acknowledgement is shown straight away.
  setTimeout(() => {
    state.phase = "reviewing";
    render();
  }, 900);
}

function decide(decision) {
  state.decisions.push({ caseId: currentCase().id, decision });
  state.index += 1;
  if (state.index < CASES.length) {
    startCase();
  } else {
    state.phase = "done";
    render();
  }
}

function renderCode(c) {
  return c.code.map((line, i) => `
    <div class="code-line">
      <span class="num">${i + 1}</span>
      <pre>${escapeHtml(line)}</pre>
    </div>`).join("");
}

function render() {
  progress.textContent = state.phase === "done"
    ? "All tasks complete"
    : `Task ${state.index + 1} of ${CASES.length}`;

  if (state.phase === "done") {
    left.innerHTML = `<div class="panel"><h2>Done</h2>
      <p class="muted">You reviewed all ${CASES.length} suggestions.</p></div>`;
    renderFile();
    return;
  }

  const c = currentCase();
  const body = state.phase === "generating"
    ? `<div class="generating">AI assistant is writing a suggestion…</div>`
    : renderCode(c);

  left.innerHTML = `
    <div class="panel">
      <h2>${c.title}</h2>
      <div class="muted">${c.task}</div>
    </div>
    <div class="panel">
      <h2>AI suggestion</h2>
      <div class="code">${body}</div>
      <div class="actions">
        <button class="primary" id="accept" ${state.phase !== "reviewing" ? "disabled" : ""}>Accept</button>
        <button class="secondary" id="reject" ${state.phase !== "reviewing" ? "disabled" : ""}>Reject</button>
      </div>
    </div>`;

  if (state.phase === "reviewing") {
    document.getElementById("accept").onclick = () => decide("accepted");
    document.getElementById("reject").onclick = () => decide("rejected");
  }
  renderFile();
}

function renderFile() {
  const accepted = state.decisions.filter(d => d.decision === "accepted");
  right.innerHTML = `
    <div class="panel">
      <h2>Your file</h2>
      ${accepted.length === 0
        ? `<div class="muted">Accepted suggestions appear here.</div>`
        : accepted.map(d => `<div class="queue-item">${CASES.find(c => c.id === d.caseId).title}</div>`).join("")}
    </div>`;
}

startCase();
