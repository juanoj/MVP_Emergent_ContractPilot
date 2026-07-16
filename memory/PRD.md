# ContractPilot — PRD

## Original problem
Build a dashboard for business owners to control their service subscription contracts,
compare current market prices against active contracts, and stay on top of renewals.
The system should read and extract relevant milestones from contracts, accounting data,
or emails — with special focus on AI services, software licences, Internet and
communications subscriptions.

## User choices
- AI: Claude Sonnet 4.5 (via Emergent LLM key)
- Sources: PDF contracts + Gmail (P1) + CSV accounting import
- Auth: Emergent-managed Google Auth
- Market prices: Web-scraping / AI-research (Claude)
- UI language: English
- Design: Swiss/high-contrast dashboard (design_guidelines.json)

## Personas
- Founder / small business owner tracking recurring SaaS + comms + infra spend
- Ops / Finance manager negotiating renewals

## Architecture (MVP)
- FastAPI backend, MongoDB (motor), pypdf for text extraction, emergentintegrations LlmChat with Claude Sonnet 4.5
- React 19 + shadcn/ui + Tailwind + Recharts frontend
- Emergent Google Auth (session cookie), 7-day sessions

## Delivered — 2026-02
- Landing page with Google sign-in
- Sidebar-based app shell with Overview / Subscriptions / Renewals / Contracts
- Contract PDF upload → Claude Sonnet 4.5 extraction → auto-create subscription
- CSV accounting import
- Manual subscription CRUD with category filter
- Per-subscription market price refresh (Claude research)
- Dashboard KPIs: active subs, monthly spend, annual run-rate, potential savings, category pie
- Renewals timeline bucketed by urgency (today / week / month / 60d / later)
- Contracts repository with extracted snapshots

## Backlog
- P1 Gmail integration (billing email parser + OAuth)
- P1 Contract detail page with side-by-side original text vs extraction
- P1 Email/SMS renewal alerts (Resend)
- P2 Team / multi-user workspaces
- P2 OCR for scanned PDFs (currently text-based PDFs only)
- P2 Historical price trend chart
