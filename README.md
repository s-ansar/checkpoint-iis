# CheckPoint

CheckPoint is a prototype for reviewing AI code suggestions. Instead of letting developers accept generated code and forget about it, it flags lines that likely need a second look, keeps those flags visible after acceptance, and tracks whether the user actually spotted the bugs and how well their confidence lined up with reality.

**Module:** LH/LM Intelligent Interactive Systems, Assignment 2 (builds on the A1 literature review on overreliance on AI coding assistants).

---

## Project Status

| Feature | Status |
| :--- | :--- |
| Five coding tasks with AI suggestions (4 with planted bugs, 1 clean) | **Simulated** — pre-scripted suggestions stand in for a live model |
| Risk highlights with a short reason and "what to check" prompt | **Implemented** — pattern rules in `detectors.js` |
| Flag sensitivity toggle (fewer vs. more flags) | **Implemented** |
| Line-level bug marking (click a line number to flag it as wrong) | **Implemented** |
| Mandatory confidence rating before clicking Accept | **Implemented** |
| "Accepted, not yet checked" queue with *I checked it* and *Undo acceptance* | **Implemented** |
| Results screen (bugs caught + confidence on clean vs. buggy code) | **Implemented** |
| Session log export (JSON) | **Implemented** |
| Live code model generating suggestions | **Planned** |
| Edit-likelihood model to decide which lines to highlight | **Planned** |
| Real editor integration (e.g., a VS Code extension) | **Planned** |
| User study with participants | **Planned** (not yet run) |

**Known limitations:**
* The detector rules only catch patterns they were explicitly written for (for instance, the discount task contains a bug that no rule flags).
* The prototype is currently limited to five tasks.
* Marking a bug counts as "caught" even if the user leaves the broken code in place.

---

## Tech Stack & Structure

Built with plain **HTML, CSS, and JavaScript**—no frameworks, no build steps, and no API keys or servers required. Anyone can inspect the source or run it straight from a single file.

* `cases.js` — The task bank containing simulated AI suggestions and the known buggy line numbers.
* `detectors.js` — Rule-based risk detector returning `{ line, level, reason, check }`. A future ML model would return this exact same object shape, keeping the interface unchanged.
* `app.js` — Core UI interactions, state management, event logging, and results calculation.

**Still undecided:** Which code model to use for live generation, and whether CheckPoint should eventually live as a VS Code extension or remain a browser-based study tool.

---

## Running & Trying It Out

Clone the repository and open `index.html` locally:

```bash
git clone [https://github.com/s-ansar/checkpoint-iis.git](https://github.com/s-ansar/checkpoint-iis.git)
cd checkpoint-iis
open index.html        # or double-click index.html in your file manager
```

Or open the live version directly: [s-ansar.github.io/checkpoint-iis](https://s-ansar.github.io/checkpoint-iis/)

**Quick walkthrough:** On Task 1, click **⚑ why?**, pick a confidence rating, and accept the suggestion. Open the **Accepted, not yet checked** panel to test **Undo acceptance**, then work through the remaining tasks to reach the results screen.

---

## Development Record

* **Stage 1 — Baseline ([`HASH_1`](https://github.com/s-ansar/checkpoint-iis/commit/HASH_1)):** Started with a basic Accept/Reject flow and a short *"writing…"* delay to mimic how standard AI coding assistants work before adding any review features.
* **Stage 2 — Risk highlights ([`HASH_2`](https://github.com/s-ansar/checkpoint-iis/commit/HASH_2)):** Added line-level flags with a brief reason and a specific check so they can be scanned quickly without cluttering the screen. I also included a sensitivity toggle for controlling false alarms and added a warning that unflagged lines can still contain bugs.
* **Stage 3 — Post-acceptance checking ([`HASH_3`](https://github.com/s-ansar/checkpoint-iis/commit/HASH_3)):** Since developers often accept suggestions first and inspect them afterward, I made accepted flags stay visible in an **Accepted, not yet checked** panel instead of disappearing. I also added **Undo acceptance** so choices aren't final, and required a confidence rating before accepting so the prototype measures calibration rather than speed.
* **Stage 4 — Results & logging ([`HASH_4`](https://github.com/s-ansar/checkpoint-iis/commit/HASH_4)):** Built the final summary screen and JSON log export. While testing, I noticed my first version averaged confidence across all accepted code—even buggy lines the user had already marked—which skewed the score, so I changed it to compare clean accepted code against unspotted bugs.

All four stages were built locally first and pushed to GitHub together on 25 Nov 2026. Each commit's author date reflects when I wrote that stage, while the commit date reflects when the repository was uploaded. Each stage was verified in Chrome across a full run with no console errors.

---

## AI Assistance

All core design decisions—such as keeping risk flags visible after acceptance, adding the undo option, requiring a confidence rating before accepting, and choosing which bug patterns to include—came directly from my Assignment 1 literature review on overreliance in AI coding tools.

I used AI assistance in a limited supporting role: helping debug edge cases in the JavaScript logic (such as fixing how confidence calibration was calculated on the results screen when a user marked a buggy line), tidying parts of the layout CSS, and drafting/rewording sections of this README. A command-line tool was also used to help initialize the Git repository and organize the staged commits. I manually tested every task in the browser to verify that each planted bug, line-marking interaction, and results calculation behaved as expected.

---

## Additional Files

* `docs/` — Contains the system diagram and storyboard images referenced in the report (no ZIP archives).
