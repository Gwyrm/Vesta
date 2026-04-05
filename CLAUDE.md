# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server (hot reload)
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
```

No test suite is configured. There is no linter configured beyond what Vite provides.

## Architecture

Vesta is a single-page React + Vite app for scheduling radiology staff (Service de Radiologie). It is entirely client-side — no backend, no API calls. Staff data is persisted in `localStorage` under the key `vesta-staff`.

### Data flow

```
App (state: staff, schedule, workloads, year, month)
  ├── StaffManager   — edit staff list & per-person absences
  ├── ScheduleView   — display/manually edit the generated schedule
  └── Stats          — workload breakdown table (read-only)
```

`App.jsx` owns all state. `generateSchedule()` is called on demand and returns `{ schedule, workloads }` which App stores and passes down as props.

### Core data structures

**Staff person:**
```js
{ id: string, name: string, role: 'intern' | 'extern' | 'socle', absences: string[] }
```
Absences are stored as strings in the format `"YYYY-MM-DD-morning"` or `"YYYY-MM-DD-afternoon"`.

**Schedule (output of `generateSchedule`):**
```js
schedule[dateStr] = {
  avis: staffId | null,          // person on "Avis" duty all day
  avisPeriod: 'morning' | 'afternoon' | null,
  morning:   [{ type, staffId }],
  afternoon: [{ type, staffId }],
}
workloads[staffId] = { scanner, irm, echo, rcp, avis, total }
```

### Scheduling logic (`src/scheduler.js`)

The scheduler assigns posts for each weekday (Mon–Fri, skipping French public holidays):

1. **Day templates** (`DAY_TEMPLATES`): defines which post types exist per day-of-week for morning and afternoon (e.g. Tuesday morning has two Scanners + one IRM).
2. **Avis assignment**: one person per day gets "Avis" (advisory duty). They are posted on one period and locked out of the other (unless Rule 2 applies — RCP post unlocks a second slot on Scanner/IRM in the other period). Avis person cannot be posted on Echo.
3. **Post assignment** (`assignPosts`): slots are filled in priority order Echo → Scanner → RCP → IRM (so IRM goes unassigned first if staff is short). Candidates are sorted by lowest workload for that post type.
4. **Supervision rule (socle)**: a `socle`-role person cannot be assigned a non-Echo post unless an `intern` is already assigned in the same half-day.
5. **Weekly budget**: each person has a max of 8 half-days per ISO week (≥ 2 free half-days guaranteed).

### Post types and roles

Post types: `Scanner`, `IRM`, `Echo`, `RCP` (technical posts) + `Avis` (displayed separately).

Roles: `intern` (Interne), `extern` (Externe), `socle` (Socle). The `socle` role has the supervision constraint above.

### Export (`src/exportXLSX.js`)

Uses the `xlsx` library to generate one Excel sheet per week, with merged cells for day headers and Avis row. Post rows are fixed: Scanner 1, Scanner 2, IRM 1–3, Écho, RCP.

### Styling

Tailwind CSS v3 with PostCSS. Post types have consistent color themes defined in `POST_STYLES` in `scheduler.js` (used by both `ScheduleView` and the legend). Role badge styles are in `StaffManager.jsx` (`ROLE_STYLE`, `ROLE_LABEL`) and re-exported for use in `Stats.jsx`.

### Deployment

Built as a static site, deployed to GitHub Pages (see commit history for workflow).
