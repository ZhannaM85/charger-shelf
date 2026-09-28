# Issues Priority List

Active work queue only (open, pending validation, not started). Closed history lives in [`docs/issues-priority-archive/`](./issues-priority-archive/README.md).

Work top-to-bottom. When Zhanna confirms an issue is done, move its row to the archive. Until she validates, leave the GitHub issue open and keep the `validation` label.

## Tier 1 — MVP calculator + shelf

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#9](https://github.com/ZhannaM85/charger-shelf/issues/9) | 🔲 Open | GitHub Pages shows a blank site | Blocking live site; deploy built dist with base `/charger-shelf/`. |
| [#1](https://github.com/ZhannaM85/charger-shelf/issues/1) | 🔲 Open | UI: Russian labels on the charge calculator | First. |
| [#2](https://github.com/ZhannaM85/charger-shelf/issues/2) | 🔲 Open | Persist last calculator inputs in localStorage | Independent of #1. |
| [#4](https://github.com/ZhannaM85/charger-shelf/issues/4) | 🔲 Open | Capacity: Wh ↔ mAh toggle (mAh uses voltage) | Coordinate persistence with #2. |
| [#3](https://github.com/ZhannaM85/charger-shelf/issues/3) | 🔲 Open | Charge estimate: efficiency factor (default ~85%) | Persist with #2. |
| [#7](https://github.com/ZhannaM85/charger-shelf/issues/7) | 🔲 Open | Charger shelf: save named chargers and tap to fill V/A | After #1 for RU labels. |
| [#8](https://github.com/ZhannaM85/charger-shelf/issues/8) | 🔲 Open | Compare two chargers for the same battery | Prefer after #7. |
| [#5](https://github.com/ZhannaM85/charger-shelf/issues/5) | 🔲 Open | CI: GitHub Actions for test + build on main | Anytime. |
| [#6](https://github.com/ZhannaM85/charger-shelf/issues/6) | 🔲 Open | Lint: enforce max 500 lines per source file | Anytime; mention in AGENT_WORKFLOW. |
