# MajlisMate.ai — Complete Project Reference Document

## 1. Project Overview

### Nama Projek
**MajlisMate.ai**

### Tagline
**AI Wedding & Majlis Planner Assistant**

Tagline alternatif yang sesuai:
- **Your 24/7 AI Assistant for Wedding Planning**
- **Rancang majlis kahwin dengan AI, checklist, bajet, vendor dan live chat dalam satu tempat**
- **End-to-end AI wedding planner untuk pasangan dan keluarga**

### Apa MajlisMate.ai Buat

MajlisMate.ai ialah aplikasi web **Next.js 15** yang menggabungkan AI assistant dan planner workspace untuk membantu pengguna merancang majlis kahwin atau majlis berkaitan.

Fungsi utama aplikasi:

- AI chat untuk soalan berkaitan wedding planning dan majlis
- Planner workspace untuk checklist, budget, guests, calendar dan vendors
- Live voice mode menggunakan speech-to-text dan text-to-speech
- PWA support supaya aplikasi boleh dipasang seperti app
- Embeddable website widget melalui `public/widget.js` untuk dipasang pada website luar
- Optional connection kepada OpenAI-compatible AI-nonymauz backend
- Demo fallback mode jika backend environment variables tiada atau masih placeholder

MajlisMate.ai direka sebagai **client-facing assistant**. Pengguna boleh berinteraksi melalui chat, voice, checklist, RSVP, budget dan vendor planning dalam satu workspace.

### Target User

Target user utama:

- Bakal pengantin
- Pasangan yang sedang merancang majlis kahwin
- Keluarga pengantin yang membantu urusan majlis
- Wedding planner kecil atau freelance
- Vendor wedding yang mahu tambah AI support pada website mereka
- Bisnes e-invitation atau wedding service yang mahu letak chatbot assistant pada website mereka

### Status Semasa Projek

Status semasa: **Ongoing / Phase 1**

Projek masih dalam fasa 1 dan sedang dibangunkan secara berperingkat. Banyak ciri utama sudah dibina untuk MVP, tetapi pengesahan production-ready dan pengembangan lanjut masih dalam proses.

Aplikasi sudah mempunyai struktur utama, UI planner, chat streaming, voice mode, PWA support, local storage persistence, retrieval local knowledge dan widget embed. Namun, ia belum lengkap sebagai production SaaS kerana masih belum mempunyai:

- Server-side database
- Authentication
- Admin dashboard
- Multi-tenant model
- Server-side chat history
- Full analytics dashboard

---

## 2. Tech Stack

### Framework & Version

- **Framework:** Next.js App Router
- **Version:** `next@15`
- **UI Library:** React 19
- **Language:** TypeScript

### Validation

- Zod digunakan untuk validate payload API chat melalui `lib/chatSchema.ts`.

### Testing

- Vitest
- happy-dom

Test configuration meliputi:

- `tests/**/*.test.ts`
- `tests/**/*.test.tsx`
- Environment: `happy-dom`

Coverage focus:

- `lib/**/*.ts`
- `components/planner/utils.ts`
- `components/planner/hooks/**/*.ts`

### Linting

- ESLint
- Strict mode menggunakan `--max-warnings=0`

### Key Scripts dari `package.json`

```bash
npm run dev          # Start local development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run lint checks
npm run typecheck    # Run TypeScript checks
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
```

### AI Backend

Aplikasi boleh connect kepada backend OpenAI-compatible AI-nonymauz melalui environment variables:

- `AI_NONYMAUZ_BASE_URL`
- `AI_NONYMAUZ_API_KEY`
- `AI_NONYMAUZ_MODEL`
- `AI_NONYMAUZ_MAX_TOKENS`

Jika variables ini tiada atau placeholder, app akan fallback kepada deterministic demo response mode.

### Hosting / Deployment Platform

Target deployment:

- **Vercel** untuk Next.js App Router
- AI backend optional boleh menggunakan endpoint OpenAI-compatible `/v1`
- Health check melalui `/api/health`

### Tools Digunakan

Tools yang relevan dalam development workflow:

- ChatGPT / CGPT untuk planning, coding guidance dan documentation
- Codex atau coding assistant untuk code generation / refactor
- Next.js App Router
- TypeScript
- Vercel
- AI-nonymauz backend sebagai optional AI layer

---

## 3. Features & Modules

## 3.1 Features Yang Dah Dibina

### 1. AI Chat for Wedding Planning

**Status:** Built / MVP ready

Fungsi:

- User boleh tanya soalan berkaitan wedding planning.
- Chat menggunakan `POST /api/chat`.
- Response dihantar secara streaming melalui SSE.
- Assistant boleh gunakan retrieved knowledge snippets daripada `data/knowledge.json`.
- Assistant difokuskan kepada wedding planning domain.

Komponen berkaitan:

- `components/ChatWidget.tsx`
- `components/PlannerWorkspace.tsx`
- `lib/chatStream.ts`
- `app/api/chat/route.ts`

---

### 2. Planner Workspace

**Status:** Built / MVP ready

Fungsi:

- Main workspace untuk user manage planning.
- Ada beberapa tabs utama:
  - Dashboard
  - Chat
  - Checklist
  - Calendar
  - Budget
  - RSVP
  - Vendors

Komponen utama:

- `components/PlannerWorkspace.tsx`
- `components/planner/*`

Workspace ini bersifat stateful dan menyimpan state melalui `localStorage`.

---

### 3. Checklist Planning

**Status:** Built / MVP ready

Fungsi:

- User boleh track wedding checklist.
- Assistant boleh bantu user faham next step dalam wedding planning.
- Checklist disimpan di browser local storage.

---

### 4. Budget Management

**Status:** Built / MVP ready

Fungsi:

- User boleh simpan budget items.
- App boleh track bajet majlis dalam workspace.
- Budget data disimpan dalam local storage.

---

### 5. Guest / RSVP Management

**Status:** Built / MVP ready

Fungsi:

- User boleh manage guest list.
- RSVP tab tersedia dalam planner workspace.
- Guest data disimpan dalam local storage.

---

### 6. Calendar / Appointments

**Status:** Built / MVP ready

Fungsi:

- User boleh simpan appointment atau calendar planning.
- Appointment/calendar state disimpan dalam local storage.
- Planner context boleh dihantar kepada AI supaya jawapan lebih relevant.

---

### 7. Vendor Planning

**Status:** Built / MVP ready

Fungsi:

- User boleh simpan vendors.
- Vendor tab tersedia dalam workspace.
- Saved vendors disimpan dalam browser local storage.

---

### 8. Live Voice Mode

**Status:** On hold / paused

Fungsi:

- Voice interaction menggunakan SpeechRecognition.
- Text-to-speech menggunakan SpeechSynthesis.
- Ada lifecycle state:
  - `idle`
  - `listening`
  - `thinking`
  - `speaking`
- Support continuous mode dan push-to-talk mode.
- Support language detection.
- Support voice selection.
- Support barge-in, iaitu user boleh interrupt TTS ketika assistant sedang bercakap.
- TTS distrim sentence-by-sentence untuk latency yang lebih rendah.

Catatan:
- Ciri voicechat kini ditangguhkan kerana memerlukan usaha dan kos yang tinggi.
- Fasa ini menumpukan pada pembinaan modul AI chat, planner workspace, checklist, budget, guest/RSVP, calendar dan vendor.
- Voicechat mungkin dibuang jika tidak boleh disokong dalam terma kos dan jadual pembangunan.

Komponen / files:

- `components/planner/hooks/useLiveVoice.ts`
- `lib/voice/stt.ts`
- `lib/voice/tts.ts`
- `lib/voice/*`

---

### 9. PWA Support

**Status:** Built / MVP ready

Fungsi:

- App boleh bertindak seperti installable web app.
- Manifest disediakan.
- Service worker digunakan untuk caching.
- Navigation fallback ke `/chat`.
- Development cleanup untuk stale service worker/cache.

Files:

- `app/manifest.ts`
- `components/PwaRegister.tsx`
- `public/sw.js`

---

### 10. Embeddable Website Widget

**Status:** Built / simple integration ready

Fungsi:

- `public/widget.js` menyediakan floating button dan iframe embed script.
- External website boleh embed chatbot MajlisMate.ai.
- Sesuai untuk client website seperti e-invitation, wedding vendor, wedding planner atau venue listing.

File:

- `public/widget.js`

Limitasi:

- Widget masih simple iframe/button integration.
- Belum ada full tenant-specific configuration.

---

### 11. Local Knowledge Retrieval

**Status:** Built

Fungsi:

- Knowledge base disimpan dalam `data/knowledge.json`.
- Retrieval dibuat menggunakan tokenization, stopword filtering dan lexical frequency/log scoring.
- Relevant documents ranked dan dimasukkan sebagai context dalam prompt.

Files:

- `data/knowledge.json`
- `lib/retrieval.ts`

Limitasi:

- Retrieval masih lexical scoring.
- Belum menggunakan embeddings atau vector search.

---

### 12. SSE Streaming

**Status:** Built

Fungsi:

- API response dihantar sebagai `text/event-stream`.
- Event types:
  - `sources`
  - `delta`
  - `error`
  - `done`
- Client consume response secara incremental.

Files:

- `lib/stream/sse.ts`
- `lib/chatStream.ts`
- `app/api/chat/route.ts`

---

### 13. Demo Fallback Mode

**Status:** Built

Fungsi:

- Jika AI backend env variables missing atau placeholder, `/api/chat` akan gunakan local demo planner response.
- Ini membolehkan app masih boleh demo walaupun AI backend belum ready.

---

### 14. Health Endpoint

**Status:** Built

Endpoint:

```http
GET /api/health
```

Expected response:

```json
{
  "ok": true,
  "app": "MajlisMate.ai",
  "mode": "connected"
}
```

atau:

```json
{
  "ok": true,
  "app": "MajlisMate.ai",
  "mode": "demo-fallback"
}
```

---

## 3.2 Features In Progress

### 1. Full Production AI Backend Connection

**Status:** In progress

Fungsi:

- Connect kepada AI-nonymauz backend menggunakan OpenAI-compatible `/v1` endpoint.
- Backend perlu support `/chat/completions` streaming behavior.

Dependencies:

- `AI_NONYMAUZ_BASE_URL`
- `AI_NONYMAUZ_API_KEY`
- `AI_NONYMAUZ_MODEL`
- `AI_NONYMAUZ_MAX_TOKENS`

---

### Phase 1 Scope

- **In-scope (Phase 1):** AI chat streaming via SSE, Planner workspace (checklist, budget, guests/RSVP, calendar, basic vendor list), PWA support, Embeddable widget, Local knowledge retrieval, Demo fallback mode, Health endpoint, and core test/lint/typecheck verification.
- **Out-of-scope / Deferred (Phase 1):** Server persistence/database, Authentication, Admin dashboard, Multi-tenant support, Semantic retrieval (embeddings/vector DB), Full analytics/telemetry, Advanced widget multi-tenant features, Full vendor marketplace, Marketing/affiliate pages, and Live voicechat (on hold — may be removed due to cost and effort).

Notes:

- The project is focusing on stabilizing the Phase 1 surface area listed above before expanding to platform and growth features.
- Voicechat is explicitly paused given high engineering and operational cost; keep it in backlog but off the critical path for Phase 1.

### Phase 1 — User Feature Summary (requested)

- **User (Phase 1 core):**
  1. Dashboard
  2. Chat (AI streaming)
  3. Checklist
  4. Calendar
  5. Guest / RSVP
  6. Vendor (basic list — treat full vendor marketplace as Phase 2)
  7. User profile

- **Marketing:**
  1. Landing page
  2. Payment page

- **Admin (Phase 1 minimal):**
  1. Dashboard (admin overview)
  2. User profile management
  3. Client details
  4. Knowledge management ("knowledge owl")

- **Vendor (Phase 2):**
  - Full vendor marketplace and advanced vendor management (deferred to Phase 2)

- **Affiliate (Phase 1):**
  - Minimal placeholder / affiliate page (basic tracking and signup)

Quick checklist — possible items to consider adding or confirming:

- Authentication and user accounts (required if you want server persistence or cross-device sync).
- Server-side persistence (database) for planner data and chat history.
- Payment integration details (gateway, plans) if monetizing via payment page.
- Analytics/telemetry to track usage, fallback rates and widget metrics.
- Clear product/feature ownership: which features are MVP vs growth (marketing, affiliate, vendor marketplace).

If you want, I can: (a) fold this summary into the `Priority` roadmap, (b) generate a minimal admin wireframe list, or (c) mark these sections in the doc with TODO anchors for implementation planning.


### 2. External Widget Improvement

**Status:** In progress / basic built

Current state:

- Floating button + iframe sudah tersedia.

Belum lengkap:

- Tenant-specific widget config
- Client-specific branding
- Domain-level access control
- Analytics per widget
- Admin setup for widget script

---

### 3. Voice UX Hardening

**Status:** In progress

Current state:

- Voice lifecycle dan TTS/STT wrapper sudah wujud.
- Continuous mode, push-to-talk, language detection dan barge-in disokong.

Next improvement:

- Better browser compatibility handling
- Better fallback jika SpeechRecognition tidak disokong
- Better voice preference UI
- Error states yang lebih jelas

---

## 3.3 Features Dalam Planning

### 1. Server Persistence

**Status:** Planned

Cadangan:

- Supabase atau Postgres.
- Simpan user profiles, planner entities, chat logs, guests, budget, checklist dan vendors.

---

### 2. Semantic Retrieval

**Status:** Planned

Cadangan:

- Tambah embeddings.
- Guna vector index.
- Improve context relevance berbanding lexical scoring sahaja.

---

### 3. Authentication

**Status:** Planned

Cadangan:

- User login.
- Secure profile.
- Persist data across devices.
- Optional role-based access untuk admin/client.

---

### 4. Multi-Tenant Support

**Status:** Planned

Cadangan:

- Setiap client mempunyai:
  - Client ID
  - Branding
  - Knowledge base sendiri
  - Widget config sendiri
  - API key/config sendiri
  - Usage analytics sendiri

---

### 5. Admin Dashboard

**Status:** Planned

Cadangan:

- Manage clients
- Upload knowledge
- Configure chatbot persona
- View analytics
- Manage widget settings
- View chat logs and prompt outcomes

---

### 6. Analytics / Telemetry

**Status:** Planned

Cadangan:

- Track usage
- Track prompt outcomes
- Track fallback rate
- Track unanswered questions
- Track most common wedding planning topics

---

### 7. Vendor System, Admin, Marketing dan Affiliate

**Status:** Planned

Cadangan:

- Vendor system lengkap dengan pengurusan vendor, kategori, dan status.
- Admin dashboard untuk konfigurasi, pengguna, widget dan pentadbiran client.
- Marketing pages untuk mempromosi MajlisMate.ai, landing pages dan content pemasaran.
- Affiliate page / program untuk sokongan rakan kongsi dan pengendali vendor.

Ini adalah ciri tambahan yang penting untuk skala produk tetapi masih berada di luar skop fasa 1.

### 7. Operational Hardening

**Status:** Planned

Cadangan:

- Stronger abuse controls
- Observability
- Retry strategies
- Rate limit improvements
- Error monitoring
- Better logging

---

## 4. System Architecture

### High-Level Flow

1. User buka MajlisMate.ai.
2. User interact dengan `PlannerWorkspace`.
3. User boleh pilih tab seperti dashboard, chat, checklist, calendar, budget, RSVP atau vendors.
4. Untuk chat, UI hantar messages melalui `lib/chatStream.ts`.
5. Request dihantar ke:

```http
POST /api/chat
```

6. Server validate request dengan `lib/chatSchema.ts`.
7. Server retrieve relevant knowledge daripada `data/knowledge.json` melalui `lib/retrieval.ts`.
8. Server build wedding-focused system prompt.
9. Server inject planner context jika ada.
10. Server check backend env:
    - Jika AI backend configured, request dihantar ke AI-nonymauz backend.
    - Jika tidak configured, server guna demo fallback response.
11. Server stream response balik ke client melalui SSE.
12. Client render assistant response secara incremental.
13. Sources boleh dipaparkan sebagai source chips.

---

### Komponen Utama dan Hubungan

```text
User
  ↓
components/PlannerWorkspace.tsx
  ↓
components/ChatWidget.tsx
  ↓
lib/chatStream.ts
  ↓
POST /api/chat
  ↓
app/api/chat/route.ts
  ├─ lib/chatSchema.ts
  ├─ lib/retrieval.ts
  ├─ data/knowledge.json
  ├─ lib/stream/sse.ts
  └─ AI-nonymauz backend OR demo fallback
  ↓
SSE response: sources / delta / error / done
  ↓
Client UI renders streaming answer
```

---

### API Connections

#### Internal API

```http
POST /api/chat
GET /api/health
```

#### Optional External AI API

OpenAI-compatible backend:

```text
{AI_NONYMAUZ_BASE_URL}/chat/completions
```

Expected base URL should point to compatible `/v1` endpoint.

---

## 5. AI Behaviour & Conversation Flow

### Persona AI

AI persona untuk MajlisMate.ai ialah assistant wedding planning yang mesra, helpful dan practical.

Cadangan nama persona:

- MajlisMate
- Mate
- Aina
- Mira
- Majlis Assistant

Tone:

- Mesra
- Professional
- Ringkas tetapi membantu
- Sesuai untuk pengguna Malaysia
- Boleh jawab dalam Bahasa Malaysia atau English bergantung kepada `language`
- Fokus kepada wedding planning dan majlis

### Cara AI Respond

AI akan:

- Jawab soalan berkaitan wedding planning.
- Beri cadangan checklist.
- Bantu user susun next step.
- Bantu fikirkan budget planning.
- Bantu cadangkan kategori vendor.
- Bantu explain flow majlis.
- Bantu user faham apa yang perlu dibuat berdasarkan planner context.

AI response dibentuk melalui:

- User messages
- Planner context
- Retrieved local knowledge
- Wedding-focused system prompt
- Domain guardrails

### Jenis Soalan Yang AI Boleh Jawab

Contoh soalan yang sesuai:

- “Apa next step untuk majlis saya?”
- “Checklist kahwin apa yang saya perlu buat bulan ni?”
- “Macam mana nak susun bajet RM20,000?”
- “Vendor apa yang saya perlu cari dulu?”
- “Apa perlu prepare untuk majlis nikah?”
- “Boleh tolong buat timeline majlis?”
- “Macam mana nak manage guest list?”
- “Apa beza package full wedding planner dan day coordinator?”
- “Apa soalan penting sebelum booking dewan?”

### Query Guardrails

`app/api/chat/route.ts` mempunyai guardrail untuk block coding/software generation requests.

Jika user minta perkara yang bukan domain wedding planning, contohnya coding atau software generation, assistant akan reject dan redirect kepada topik wedding planning.

Contoh request yang perlu ditolak:

- “Generate React component”
- “Write SQL query”
- “Build me an API”
- “Fix my Python code”

AI patut redirect dengan sopan:

> Saya boleh bantu untuk wedding planning dan majlis. Untuk coding atau software request, saya tak dapat bantu dalam ruang MajlisMate.ai ini. Kalau nak, kita boleh sambung dengan checklist, bajet, vendor atau timeline majlis.

### Fallback Behaviour

Jika AI backend tidak configured:

- App guna deterministic demo planner response.
- Response masih stream sebagai SSE.
- Ini berguna untuk demo dan testing.

Jika AI tidak tahu jawapan:

- AI patut acknowledge limitasi.
- AI patut beri general safe guidance.
- AI patut suggest next practical step.
- AI tidak patut fabricate vendor, harga atau fakta spesifik tanpa data.

---

## 6. Database & Data Structure

### Current Persistence Model

MajlisMate.ai sekarang tiada server database.

Semua planner state disimpan dalam browser `localStorage`.

Data yang disimpan:

- Messages
- Chat sessions
- Planner profile
- Checklist
- Appointments/calendar state
- Budget items
- Guests
- Saved vendors
- Language preference
- Some UI state
- Voice preferences

### Kelebihan Current Model

- Lightweight
- Senang demo
- Tiada server DB diperlukan
- Sesuai untuk MVP
- Boleh deploy mudah di Vercel

### Limitasi Current Model

- Data device-scoped
- Jika user tukar browser/device, data tidak sync
- Jika browser storage cleared, data hilang
- Tiada admin view
- Tiada multi-user support
- Tiada server-side chat history
- Tiada authentication

### Planned Data Structure

Untuk production, perlu database seperti Supabase/Postgres.

Cadangan tables:

```sql
users
- id
- email
- name
- created_at
- updated_at

planner_profiles
- id
- user_id
- partner_name
- wedding_date
- venue
- budget_target
- language
- created_at
- updated_at

checklist_items
- id
- user_id
- title
- description
- status
- due_date
- category
- created_at
- updated_at

budget_items
- id
- user_id
- category
- name
- estimated_amount
- actual_amount
- status
- notes
- created_at
- updated_at

guests
- id
- user_id
- name
- side
- phone
- rsvp_status
- pax
- notes
- created_at
- updated_at

vendors
- id
- user_id
- category
- name
- contact
- price
- status
- notes
- created_at
- updated_at

appointments
- id
- user_id
- title
- date_time
- location
- vendor_id
- notes
- created_at
- updated_at

chat_sessions
- id
- user_id
- title
- created_at
- updated_at

chat_messages
- id
- session_id
- role
- content
- sources
- created_at
```

Untuk multi-tenant SaaS, tambah:

```sql
clients
- id
- name
- slug
- domain
- brand_color
- chatbot_name
- support_email
- created_at
- updated_at

client_knowledge_documents
- id
- client_id
- title
- content
- source
- created_at
- updated_at

client_widget_configs
- id
- client_id
- allowed_domains
- greeting_message
- position
- theme
- created_at
- updated_at
```

---

## 7. Business Logic

### Wedding Planning Logic

Sistem handle wedding planning melalui gabungan:

- Planner profile
- Checklist
- Budget
- Guests
- Calendar
- Vendors
- Chat context
- Knowledge retrieval

AI boleh bantu user berdasarkan planner context.

Contoh:

Jika user sudah set wedding date, AI boleh cadangkan timeline.
Jika user ada budget target, AI boleh bantu pecahkan budget.
Jika checklist belum lengkap, AI boleh cadangkan next action.
Jika guest list belum dibuat, AI boleh remind user untuk start guest management.

### Rules & Logic Yang Dah Di-set

1. AI mesti fokus pada wedding planning / majlis.
2. Coding/software generation requests perlu ditolak.
3. Response perlu ikut language preference: `ms` atau `en`.
4. AI boleh guna planner context untuk jawapan lebih personal.
5. AI boleh guna local knowledge snippets sebagai sources.
6. Jika AI backend tiada, fallback kepada demo response.
7. Data disimpan local storage sahaja untuk MVP.
8. Chat streaming menggunakan SSE event types.
9. Rate limiting digunakan melalui `SimpleRateLimiter`.
10. Widget external menggunakan iframe/button integration.

### Apa User Boleh Buat

User boleh:

- Chat dengan AI tentang wedding planning
- Tanya next step
- Manage checklist
- Manage budget
- Manage guest / RSVP
- Manage vendors
- Manage appointments/calendar
- Guna voice mode
- Install sebagai PWA
- Guna widget jika embed pada website luar

### Apa User Tidak Boleh Buat Dalam Current Scope

User belum boleh:

- Login account
- Sync data across devices
- Share planner dengan pasangan/family
- Save data server-side
- Admin manage multiple clients
- Upload own knowledge through UI
- View analytics
- Use full multi-tenant SaaS capabilities
- Perform coding/software tasks through MajlisMate.ai chat

---

## 8. Decisions & Rationale

### 1. Pilih Next.js 15 App Router

Sebab:

- Sesuai untuk modern React app.
- Senang deploy ke Vercel.
- Support API routes.
- Sesuai untuk PWA, streaming dan embedded widget.
- Satu codebase untuk frontend dan backend API.

### 2. Pilih React 19 + TypeScript

Sebab:

- Strong typing.
- Better maintainability.
- Sesuai untuk complex planner workspace.
- Easier validation dan refactoring.

### 3. Guna Local Storage Untuk MVP

Sebab:

- Cepat untuk demo.
- Tidak perlu database setup.
- Kos rendah.
- Sesuai untuk early MVP validation.

Trade-off:

- Tidak production-ready untuk multi-device.
- Data tidak centralized.
- Tiada admin access.

### 4. Guna SSE Untuk Streaming Chat

Sebab:

- User dapat response secara incremental.
- UX lebih responsive.
- Sesuai untuk AI assistant.
- Lebih ringan daripada WebSocket untuk one-way AI streaming.

### 5. Guna AI-nonymauz Backend Secara Optional

Sebab:

- Boleh connect kepada self-hosted/free AI backend.
- Selari dengan approach AI-nonymauz.
- App masih boleh berjalan walaupun backend belum ready melalui demo fallback.

### 6. Guna Demo Fallback Mode

Sebab:

- App boleh demo tanpa API key.
- Development lebih mudah.
- Deployment tidak fail jika env belum configured.
- Useful untuk client preview.

### 7. Guna Lexical Retrieval Dulu

Sebab:

- Simple.
- Tiada kos embedding.
- Sesuai untuk small knowledge base.
- Senang test.

Alternative yang dipertimbangkan:

- Semantic retrieval dengan embeddings/vector search.

Tidak digunakan lagi kerana:

- Tambah complexity.
- Perlu embedding model atau vector DB.
- Belum critical untuk MVP.

### 8. Guardrails Wedding Domain

Sebab:

- MajlisMate.ai ialah domain-specific assistant.
- Elak user guna untuk coding/software tasks.
- Bantu maintain brand dan purpose.
- Lebih senang kawal quality jawapan.

---

## 9. Issues & Solutions

### Issue 1: Tiada AI Backend Configured

Masalah:

- Jika `AI_NONYMAUZ_BASE_URL`, `AI_NONYMAUZ_API_KEY` atau model tidak diset, chat boleh gagal.

Solution:

- App menggunakan demo fallback mode.
- `/api/health` return mode `demo-fallback`.

---

### Issue 2: Data Tidak Persist Across Devices

Masalah:

- Current state hanya dalam local storage.
- User tukar device/browser, data tidak ada.

Solution semasa:

- Accept as MVP limitation.

Next solution:

- Add Supabase/Postgres.
- Add authentication.
- Sync planner data server-side.

---

### Issue 3: Retrieval Masih Lexical

Masalah:

- Retrieval hanya berdasarkan token frequency/log scoring.
- Tidak faham semantic meaning dengan baik.

Solution semasa:

- Gunakan local knowledge scoring.

Next solution:

- Add embeddings + vector index.

---

### Issue 4: Widget Masih Simple

Masalah:

- `public/widget.js` hanya floating button + iframe.
- Belum ada tenant-specific settings.

Solution semasa:

- Sesuai untuk demo embed.

Next solution:

- Add client config.
- Add domain restrictions.
- Add admin setup.
- Add usage analytics.

---

### Issue 5: Belum Ada Auth/Admin/Tenant Model

Masalah:

- App belum boleh jadi SaaS multi-client sepenuhnya.
- Tiada user account.
- Tiada admin dashboard.
- Tiada client isolation.

Solution semasa:

- MVP single app.

Next solution:

- Build auth.
- Build admin dashboard.
- Build tenant-specific database schema.
- Build client-specific widget.

---

### Issue 6: Voice Browser Compatibility

Masalah:

- SpeechRecognition dan SpeechSynthesis bergantung pada browser support.
- Pengalaman mungkin berbeza antara Chrome, Safari dan mobile browsers.

Solution semasa:

- Capabilities detection.
- Watchdog timeout.
- Voice scoring.
- Preferences storage.

Next solution:

- Better fallback UX.
- Clear browser support messaging.

---

## 10. Next Steps & Roadmap

### Priority 1 — Stabilize MVP

1. Confirm app builds successfully:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

2. Verify chat endpoint:

```http
POST /api/chat
```

3. Verify health endpoint:

```http
GET /api/health
```

4. Confirm fallback mode works when env missing.

5. Confirm connected mode works when AI-nonymauz env configured.

---

### Priority 2 — Production Data Persistence

Add database layer:

- Supabase/Postgres
- Users
- Planner profiles
- Checklist
- Budget
- Guests
- Vendors
- Appointments
- Chat sessions
- Chat messages

Goal:

- Data persists across devices.
- User can login and continue planning anywhere.

---

### Priority 3 — Authentication

Add auth:

- Email/password
- Magic link
- OAuth optional

Goal:

- Secure planner data.
- Enable user accounts.
- Prepare for SaaS.

---

### Priority 4 — Multi-Tenant SaaS Model

Add client support:

- Client account
- Client branding
- Client-specific widget config
- Client-specific knowledge base
- Allowed domains
- Client API settings

Goal:

- MajlisMate.ai can serve multiple wedding vendors / e-invitation businesses.

---

### Priority 5 — Admin Dashboard

Build admin features:

- Manage clients
- Upload knowledge documents
- Configure assistant name/tone
- Configure widget theme
- View conversations
- View analytics
- Manage support email

Goal:

- Owner can sell chatbot/planner service to multiple clients.

---

### Priority 6 — Semantic Retrieval

Upgrade retrieval:

- Generate embeddings
- Store vectors
- Use vector similarity search
- Combine lexical + semantic hybrid retrieval

Goal:

- AI gives more accurate context-based answers.

---

### Priority 7 — Analytics & Observability

Add:

- Chat usage dashboard
- Most asked questions
- Unknown / fallback questions
- Error tracking
- Response latency
- Widget usage by domain
- Conversion tracking for client websites

Goal:

- Improve product quality.
- Prove value to clients.

---

### Priority 8 — Voice Mode Polishing

Improve:

- Browser support fallback
- Voice onboarding
- Microphone permission handling
- Push-to-talk UX
- Continuous conversation UX
- Mobile Safari behavior
- Barge-in reliability

Goal:

- Make voice mode feel closer to Gemini Live style assistant.

---

## 11. Deployment Notes

### Vercel Deployment

MajlisMate.ai targets Vercel.

Deployment checklist:

1. Push code to GitHub.
2. Import project into Vercel.
3. Set environment variables if AI backend is ready.
4. Deploy.
5. Verify `/api/health`.
6. Test `/chat`.
7. Test widget script if used on external website.

### Required Environment Variables

```env
AI_NONYMAUZ_BASE_URL=
AI_NONYMAUZ_API_KEY=
AI_NONYMAUZ_MODEL=
AI_NONYMAUZ_MAX_TOKENS=
CLIENT_NAME=
CHATBOT_NAME=
SUPPORT_EMAIL=
```

### AI Backend URL Requirement

`AI_NONYMAUZ_BASE_URL` should point to an OpenAI-compatible `/v1` endpoint.

Backend must support:

```http
POST /chat/completions
```

with streaming behavior.

---

## 12. Recommended Claude Project Usage

Dokumen ini boleh digunakan sebagai Claude Project reference.

Cara guna:

1. Create Claude Project.
2. Paste dokumen ini sebagai project knowledge.
3. Tambah source code project sebagai files jika perlu.
4. Gunakan prompt seperti:

```text
Use the MajlisMate.ai reference document as the source of truth.
Help me continue development without changing the intended architecture unless clearly justified.
Write production-safe Next.js 15 TypeScript code.
Keep Bahasa Malaysia explanations but preserve English technical terms.
```

---

## 13. Current Strengths

- Clear wedding planning domain.
- Planner workspace sudah ada banyak module.
- Chat streaming architecture sudah ready.
- Voice mode advanced untuk MVP.
- PWA support sudah ada.
- Widget embed sudah ada.
- Demo fallback memudahkan preview.
- Good test coverage untuk retrieval, streaming, voice behavior, hotkeys, language detection dan UI helper logic.
- Deployment target jelas: Vercel.

---

## 14. Current Limitations

- Tiada backend database.
- Tiada auth.
- Tiada admin dashboard.
- Tiada multi-tenant model.
- Tiada server-side chat history.
- Retrieval belum semantic.
- Widget masih simple.
- Data masih local-storage only.
- Voice browser support mungkin inconsistent.

---

## 15. Practical Upgrade Order

Recommended order paling practical:

1. Fix build/lint/typecheck/test.
2. Confirm Vercel deploy.
3. Confirm AI-nonymauz backend connection.
4. Add Supabase/Postgres.
5. Add auth.
6. Move local storage data to server persistence.
7. Add admin dashboard.
8. Add multi-tenant client model.
9. Improve widget config.
10. Add analytics.
11. Upgrade retrieval to semantic/hybrid.
12. Polish voice mode.

---

## 16. Summary

MajlisMate.ai ialah MVP untuk AI wedding planning assistant yang menggabungkan chat, planner workspace, voice mode, PWA dan embeddable widget. Sistem ini dibina menggunakan Next.js 15, React 19 dan TypeScript, dengan API streaming melalui SSE dan optional connection kepada AI-nonymauz backend.

Untuk MVP, data disimpan dalam browser local storage dan retrieval menggunakan lexical scoring daripada local knowledge base. Ini menjadikan app ringan dan mudah deploy, tetapi untuk production perlu upgrade kepada database, auth, multi-tenant support, admin dashboard, semantic retrieval dan analytics.

Dokumen ini boleh dijadikan source of truth untuk sambung development dalam Claude Project, ChatGPT Project, Codex atau coding assistant lain.
