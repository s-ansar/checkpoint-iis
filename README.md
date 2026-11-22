# CheckPoint

**README prose word count: ~560** (code and commands not counted)

CheckPoint is a prototype for reviewing AI code suggestions. It highlights lines that are likely to need checking, keeps those flags visible **after** a suggestion is accepted, and measures whether the person caught the bugs and how well their confidence matched reality.

Module: LH/LM Intelligent Interactive Systems, Assignment 2. Builds on the A1 literature review on overreliance on AI coding assistants.

## Project status

| Part | Status |
|---|---|
| Five coding tasks with AI suggestions (four with planted bugs, one correct) | **Simulated**: pre-scripted suggestions stand in for a live code model |
| Risk highlights with a short reason and "what to check" | **Implemented**: pattern rules in `detectors.js` |
| Flag sensitivity setting (fewer / more flags) | **Implemented** |
| Mark a line as wrong (click its line number) | **Implemented** |
| Confidence rating required before Accept | **Implemented** |
| "Accepted, not yet checked" queue with *I checked it* and *Undo acceptance* | **Implemented** |
| Results screen: bugs caught, confidence on correct vs buggy code | **Implemented** |
| Session log download (JSON) | **Implemented** |
| Live code model generating suggestions | **Planned** |
| Edit-likelihood model to choose which lines to flag | **Planned** |
| Real editor integration (e.g. VS Code extension) | **Planned** |
| User study with participants | **Planned** (not run) |

Known limits: the rules only catch patterns they were written for (the discount task shows a bug no rule flags); there are only five tasks; a marked bug counts as "caught" even if the code is kept.

## Technology stack

- **HTML, CSS, JavaScript (no framework, no build step)**: so it runs by opening one file and anyone can inspect it.
- **`cases.js`**: task bank with simulated suggestions and the known bug lines.
- **`detectors.js`**: rule-based risk detector returning `{line, level, reason, check}`. A future model would return the same shape, so the interface would not change.
- **`app.js`**: interaction logic, state, event log and results.
- No API key or server is needed.
- Undecided: which code model to use for live suggestions, and whether to deliver CheckPoint as a VS Code extension or keep it as a web study tool.

## Running or inspecting the work

```
git clone https://github.com/<your-username>/checkpoint-iis.git
cd checkpoint-iis
open index.html        # or double-click index.html
```

Or use the live page: `https://<your-username>.github.io/checkpoint-iis/` (if GitHub Pages is enabled).

Try this: on task 1 click **⚑ why?**, set your confidence, accept, then open the **Accepted, not yet checked** panel and use **Undo acceptance**. Finish all tasks to see the results screen.

## Development record

- **Stage 1: baseline** (commit: `<link>`). Task, simulated suggestion with a short "writing…" message, Accept / Reject. This is the plain flow that existing assistants offer, used as the starting point.
- **Stage 2: risk highlights** (commit: `<link>`). Added rule-based flags with a one-line reason and one concrete check. I chose a short explanation rather than a full report so it can be read at a glance. Added a sensitivity setting because more flags also means more false alarms. Added the note "unflagged lines can still be wrong" so the highlights are not read as proof.
- **Stage 3: checking after acceptance** (commit: `<link>`). Research shows people often accept first and check later, so flags now move to an "Accepted, not yet checked" queue instead of disappearing. Added *Undo acceptance* so accepting is reversible. Added a confidence rating before Accept and line marking, so the system can measure detection and calibration rather than speed.
- **Stage 4: results and log** (commit: `<link>`). Added the results screen and JSON export. **Fix:** the first version averaged confidence over all accepted code, including buggy code the person had marked, which made calibration look better than it was. It now compares correct code kept with buggy code kept without spotting the bug.

Checked at each stage by running a full session in the browser (Chrome) and confirming there were no console errors.

## Additional files

- `docs/` contains the system diagram and storyboard images used in the report.
- No ZIP files.
