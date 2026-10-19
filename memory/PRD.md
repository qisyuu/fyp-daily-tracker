# Daily Tracker — PRD

## Original Problem Statement
User (final year student) has a previous internship project "Daily Tracker" (https://daily-tracker-evm.web.app/) — a web scheduling and attendance system. For their FYP they want to develop a similar but improved version. They provided an FYP proposal PDF and UI mockups. They want a prototype showing flow of authorization page, scheduling module, and more, connected to MongoDB. Easy to transfer to local VS Code. Has zero MongoDB knowledge.

## Tech Stack
- Frontend: React + Tailwind + shadcn/ui + Plus Jakarta Sans / Playfair Display
- Backend: FastAPI + Motor (async MongoDB)
- Database: MongoDB
- Auth: JWT (Bearer header in localStorage)

## User Personas
1. **Admin (Team Leader)** — full access, manages staff, holidays, attendance
2. **User (Staff/Agent)** — log in, view schedule, mark attendance
3. **Guest** — view-only

## Core Requirements (from PDF)
- Authentication & RBAC (3 roles)
- Calendar module (daily/monthly/yearly view + attendance status)
- Staff management (active + resigned)
- Holiday management
- Leave management
- Reports + AI analytics
- History / audit log
- Notifications

## Implemented (Phase 1 — Feb 2026)
- [x] JWT auth: register, login, logout, /me, admin seeding
- [x] Role-based access (admin/user/guest)
- [x] Welcome split-screen landing page (burgundy hero + feature card)
- [x] Login & Signup pages
- [x] Dashboard shell: blush sidebar + maroon header + main content
- [x] Calendar module — monthly grid with day cells, prev/next/today, holiday badges, attendance status (present/absent/leave/standby/off), agent selector, click-to-mark modal
- [x] Staffs module — Active/Resigned tabs, add/edit/delete (admin only), CRUD table
- [x] Holidays module — year switcher, CRUD table (admin only)
- [x] Sample data seeded on first run (5 staff, 6 Malaysian holidays)
- [x] Each module has its own .jsx + .css file (for easy editing)
- [x] SETUP_GUIDE.md with step-by-step local install / MongoDB instructions

## Deferred (Phase 2+)
- [ ] Leave management module
- [ ] Reports + analytics dashboard
- [ ] AI anomaly detection (scikit-learn Isolation Forest)
- [ ] AI attendance summary (Gemini/OpenAI via Emergent LLM key)
- [ ] Daily/Yearly calendar views (only Monthly is built)
- [ ] History / audit trail
- [ ] Notifications system
- [ ] MFA for admin
- [ ] Forgot password flow
- [ ] CSV export of attendance

## Next Tasks (Priority Order)
1. P0 — Leave application + approval flow
2. P0 — Daily and Yearly calendar views
3. P1 — Reports module (CSV export + simple charts)
4. P1 — AI attendance summary (Gemini Flash)
5. P2 — History audit log
6. P2 — Notifications
