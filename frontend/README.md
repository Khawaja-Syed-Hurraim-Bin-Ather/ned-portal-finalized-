# EduCompass frontend

Static single-page app (no build step).

**Easiest:** double-click `index.html`, or in VS Code right-click it and choose *Open with Live Server*.

Or run it with a server:

    cd frontend
    node server.js          # http://localhost:5173
    # or: python3 -m http.server 5173

Deploy by uploading the `frontend/` folder to Vercel, Netlify or GitHub Pages. Routes use `#/hash` links, so no rewrite rules are needed.

## Files
- `index.html`, `styles.css`: shell and design system (NED maroon, navy, gold; Newsreader + Public Sans)
- `engines.js`: JS ports of `core/gpa_engine.py` and `core/prereq_graph.py`, plus data loading
- `app.js`: pages (Home, FYP Portal, Professors, Planner, Prerequisites, Career Hub, Assistant, Sign in)
- `data/*.json` and `data.js`: copies of `/data`. `data.js` is what the page reads; rebuild it from the JSON when the data changes.
- `img/`: optimised CIS and NED photos, NED seal

## Connecting a real API later
There is no REST API in the repository yet, so the app reads the JSON files and keeps user data (account, grades, shortlist, roadmap ticks) in `localStorage`.
Replace three places when the backend exists: `loadData()` in `engines.js` (fetch from the API), the `Session` object in `app.js` (real auth), and the `store.get/set` calls for grades, shortlist and roadmap.

## Known data gaps shown honestly in the UI
- Prerequisite links: 14 arrows traced from the NED Course Dependency Chart image (11 clear, 3 probable). The chart lists few prerequisites, and the team's code uses CS-116 for CS-218 while the chart shows CS-115, so confirm everything against the Scheme of Studies. Edit `candidate_edges` in `data/ned_cse_course_catalog.json`, then rebuild `data.js`.
- 36 FYP records, all from 2022; 13 have no topic tag.
- One faculty record has no name and is hidden until reviewed.
- Passing grade (D) and the credit-hour limit (20) are assumptions, editable in `engines.js` and the Planner.
- Not built yet: Admin Console, FYP compare and idea generator, Google sign-in, dark theme.

## Hero images (themed pages)
`img/art-fyp.webp`, `art-planner.webp`, `art-careers.webp` and `art-professors.webp` are cut from the design screenshots. To use sharper originals, overwrite those files with the full-resolution hero pictures (keep the same names).

## Admin console (demo mode)
Open `#/admin` (also linked in the footer). Roles follow the NED admin design: Data Operator drafts, Department Chairman signs off, Vice Chancellor approves major curriculum changes and handles releases, purges and security.
Demo accounts are filled by the role buttons on the sign-in page; the one-time code is shown on screen. All admin data lives in `localStorage` key `ec:adm` until the real API (NED-ADMIN-BASED-PORTAL, Express on port 4000) is connected. Approved changes are applied to the student pages (prerequisite links, professor and FYP topics, career tracks, removals) and can be rolled back.
Files: `admin.js` (all admin logic and screens), `boot.js` (starts the app), admin styles at the end of `styles.css`.
