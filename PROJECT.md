# Your Orbit

A personalized digital newspaper, built with Next.js (App Router) and Tailwind CSS. Tagline: **"A little more informed, every morning."**

Built for **NaSCon'26: "Build a personal morning paper"**. This file has two parts:

- **Part A: Current state** (what already exists).
- **Part B: Roadmap** (everything still to build, split into self-contained modules so each can be handed to a separate AI agent).

**Project philosophy:** this is a hackathon demo that runs locally. Keep the database, login, and infrastructure as simple as possible (SQLite file, cookie sessions, npm scripts). Spend effort on the product: personalization, the PDF, story connections, personal impact, and visible learning.

---

## How to use this file with an AI agent

Paste the whole file (or tell the agent to read `PROJECT.md`), then add one line such as:

> "Implement **Module M5 (Ranking and edition builder)** from PROJECT.md. Follow the Global Rules and the shared types in `lib/types.ts`. Do not touch files outside the module's listed scope."

Every module lists: **Goal, Depends on, Files, Spec, Acceptance criteria**. An agent should be able to finish a module without reading the others, as long as the shared contracts (Section B1) are respected.

---

# PART A: Current state

## A1. Tech stack (existing)

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| UI | React 19 |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| Icons | `lucide-react` |
| Fonts | Newsreader (serif), Inter (sans) via `next/font/google` |
| Animation | CSS keyframes in the Tailwind `@theme` block, plus `tw-animate-css` |
| Analytics | `@vercel/analytics` (production only) |
| Package manager | **npm** |
| Language | TypeScript |

shadcn tooling is installed from the starter but unused.

## A2. Running

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm start
```

## A3. Existing files

```
app/
  layout.tsx            Root layout: fonts, metadata, viewport, analytics
  page.tsx              Home: SiteNav, Masthead, FeaturedStory
  globals.css           Tailwind import, theme tokens, keyframes
components/
  site-nav.tsx          Top nav
  masthead.tsx          "Your Orbit" title, date line, tagline
  featured-story.tsx    Lead story (text + image), currently hardcoded
public/images/featured-story.png
lib/                    Starter utilities
```

## A4. Design system (must be reused everywhere)

**Direction:** editorial, print-inspired. Warm paper background, near-black ink, hairline rules, serif for headlines and body, sans for small UI labels, one burgundy accent.

| Token | Value | Tailwind | Use |
| --- | --- | --- | --- |
| `--paper` | `#f7f3ec` | `bg-paper` | Background |
| `--ink` | `#17140f` | `text-ink` | Primary text, strong rules |
| `--ink-muted` | `#6b655b` | `text-ink-muted` | Secondary text |
| `--rule` | `#d9d3c7` | `border-rule`, `bg-rule` | Hairlines |
| `--burgundy` | `#6d1f2e` | `text-burgundy`, `bg-burgundy` | Accent, hover, selection |

- `font-serif` = Newsreader, `font-sans` = Inter.
- Content width `max-w-6xl`, padding `px-5` mobile, `px-8` from `md`.
- Locked to light color scheme.
- Registered animations: `animate-fade-up`, `fade-in`, `fade-down`, `draw-line`, `image-reveal`, `ken-burns`. Always prefix with `motion-safe:`.
- Accessibility: semantic landmarks, `<time>` for dates, `aria-hidden` on decoration, visible burgundy `focus-visible` outlines, reduced-motion respected.

## A5. Known gaps in current code

- `/archive` and `/story/folding-code` links 404.
- Masthead date is hardcoded to `America/New_York`. It must use the reader's time zone (default `Asia/Karachi`).
- Featured story is hardcoded. It must come from an edition.
- Profile button does nothing.

---

# PART B: Roadmap

## B0. Product requirements (from the NaSCon'26 problem statement)

| # | Requirement | Where it is covered |
| --- | --- | --- |
| 1 | Onboarding that captures interests with great UX | M2 |
| 2 | Daily newspaper-style **PDF**, fresh every day, personalized | M7 |
| 3 | Web reading experience, same edition as PDF, **archive of previous papers** | M5, M6, M8 |
| 4 | **Learning**: paper improves with use | M9 |
| 5 | Room to explore (our differentiators) | M10 (story connections), M11 (personal impact), M12 (extras) |

**Submission:** public GitHub repo (commits are monitored, so commit often), Loom video (max 5 min), architecture diagram. See M14.

## B1. Shared contracts (do this first: Module M0)

All modules code against these types so agents can work in parallel using mock data.

**`lib/types.ts`**

```ts
export type Topic =
  | "world" | "politics" | "business" | "economy" | "energy" | "technology"
  | "science" | "health" | "sports" | "entertainment" | "culture"
  | "education" | "environment" | "crime" | "lifestyle" | "travel" | "opinion";

export interface UserProfile {
  id: string;
  name: string;
  country: string;           // ISO code, e.g. "PK"
  city: string;              // e.g. "Islamabad"
  timezone: string;          // IANA, e.g. "Asia/Karachi"
  profession: string;        // free text or preset
  industry?: string;
  situation_tags: string[];  // e.g. ["commutes by car","small business owner","student","renter"]
  languages: string[];
  delivery_hour: number;     // 0-23 local time, default 6
  reading_depth: "brief" | "standard" | "deep";
  created_at: string;
}

export interface InterestWeight {
  user_id: string;
  key: string;               // topic or custom keyword/entity, e.g. "energy", "Tesla"
  kind: "topic" | "keyword" | "entity";
  weight: number;            // 0..1
  source: "onboarding" | "learned";
  updated_at: string;
}

export interface Article {
  id: string;
  url: string;
  canonical_url: string;
  title: string;
  source_name: string;
  source_domain: string;
  author?: string;
  published_at: string;
  image_url?: string;
  raw_text?: string;
  summary: string;           // LLM, 2-3 sentences
  topics: Topic[];
  entities: { name: string; type: "org" | "person" | "place" | "commodity" | "currency" | "event" }[];
  region_tags: string[];     // e.g. ["PK","global"]
  importance: number;        // 0..1, global importance estimate
  cluster_id?: string;       // same-story dedupe cluster
  created_at: string;
}

export interface EditionItem {
  article_id: string;
  section: string;           // "Front Page","Your World","Business", etc.
  position: number;
  size: "lead" | "major" | "standard" | "brief";
  score: number;
  why_shown: string;         // one line: "Because you follow energy"
  impact_note?: string;      // M11
}

export interface StoryConnection {
  id: string;
  title: string;             // "Why oil prices matter at your pump"
  article_ids: string[];
  chain: { step: string; article_id?: string }[];  // ordered causal chain
  explanation: string;
}

export interface Edition {
  id: string;
  user_id: string;
  edition_date: string;      // YYYY-MM-DD in user's timezone
  headline_of_the_day: string;
  items: EditionItem[];
  connections: StoryConnection[];
  pdf_url?: string;
  generated_at: string;
}

export type EventType =
  | "open" | "click_through" | "read_time" | "skip" | "save"
  | "more_like_this" | "less_like_this" | "hide_topic" | "hide_source";

export interface InteractionEvent {
  id: string;
  user_id: string;
  article_id: string;
  edition_id: string;
  type: EventType;
  value?: number;            // e.g. seconds for read_time
  created_at: string;
}
```

**Mock data:** `lib/mock/` must export `mockProfile`, `mockArticles` (15+), `mockEdition`. UI modules (M5, M6, M8) build against these until the real pipeline is ready.

## B2. Target architecture

```
        ┌─────────────────────────┐
        │  npm run daily          │  (manual or OS scheduler; also "Refresh my paper" button)
        └───────────┬─────────────┘
                    ▼
  ┌────────────────────────┐   M3
  │ Ingestion: RSS + APIs  │───► dedupe ───► articles table (SQLite)
  └──────────┬─────────────┘
             ▼
  ┌────────────────────────┐   M4
  │ LLM enrichment (batch) │   topics, entities, summary, importance
  └──────────┬─────────────┘
             ▼
  ┌────────────────────────┐   M5, M10, M11
  │ Per-user edition build │   rank → sections → connections → impact notes
  └──────────┬─────────────┘
             ▼
        editions table
        │            │
        ▼            ▼
   Web reader   PDF renderer (M7)
   (M6, M8)     HTML/CSS → Puppeteer → data/pdfs/
        │
        ▼
  Interaction events ──► Learning loop (M9) ──► updated interest weights ──┐
        ▲                                                                   │
        └───────────────────────── next day's ranking ◄────────────────────┘
```

**Stack additions**

| Area | Choice | Notes |
| --- | --- | --- |
| Database | **SQLite** via `better-sqlite3` | File at `data/orbit.db`, raw SQL, no ORM, no external service |
| Passwords | `bcryptjs` | Pure JS, no native build |
| Sessions | `jose` signed JWT in an httpOnly cookie | Secret in `SESSION_SECRET` |
| LLM | **Gemini free tier** (`@google/genai`) | Batch calls, cache outputs, JSON mode |
| News sources | RSS (`rss-parser`), Guardian API, GNews | Pakistan and global feeds |
| Article text | `@mozilla/readability` + `jsdom` | Only when feed lacks content |
| PDF | `puppeteer` (local Chromium) | Reuse the same HTML template; PDFs saved to `data/pdfs/` |
| Daily job | npm script `npm run daily` (via `tsx`) | Runs ingest, enrich, build editions in order |
| Validation | `zod` | Validate all request bodies and LLM JSON output |
| Graph | Simple SVG (or `d3`) | For connection graphs |

**Note on `better-sqlite3`:** it is a native module. Add `serverExternalPackages: ["better-sqlite3"]` to `next.config`. If `npm install` fails to compile it (common on Windows), install the build tools it names, or switch to `@libsql/client` with a `file:data/orbit.db` URL, which needs no compiling.

**Hosting:** run locally (`npm run dev` or `npm run build && npm start`) for the demo and Loom video. SQLite and local PDF files do not persist on Vercel's serverless filesystem. If a public link is wanted, use a host with a persistent volume (Railway, Render, Fly.io).

**Environment variables** (`.env.local`, never commit; provide `.env.example`)

```
SESSION_SECRET=            # long random string
GEMINI_API_KEY=
GUARDIAN_API_KEY=
GNEWS_API_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**`.gitignore` must include:** `.env*`, `node_modules`, `.next`, `data/`.

## B3. Global rules for every agent

1. Follow the design system in A4. No new colors, no new fonts. Reuse existing tokens and animations.
2. Server components by default. Use `"use client"` only where interactivity is needed.
3. TypeScript strict. No `any`. Use types from `lib/types.ts`. Validate external and LLM data with `zod`.
4. **Package manager is npm.** Use `npm install <pkg>` and `npx`, never pnpm or yarn. Do not create or commit any lockfile other than `package-lock.json`.
5. **Database:** use SQLite only, through `lib/db.ts`. Store arrays and objects as JSON text. No external database services.
6. **Auth:** get the user id from the session cookie on the server (`getSessionUser()`), never from the request body or query string. Every API route that touches user data must check the session.
7. Never expose secrets to the client. LLM calls happen only in route handlers, server actions, or scripts.
8. **LLM calls must be batched, cached, and failure-tolerant.** Free tiers are the bottleneck. On failure, fall back to a rule-based result (do not crash the edition build).
9. Anything AI-generated that the reader sees must be labeled (small "AI analysis" tag) and grounded in the article text, never invented facts.
10. Every new page needs: a loading state, an empty state, an error state, mobile layout, keyboard focus styles, and `motion-safe:` animations.
11. Small, frequent commits with clear messages (commits are monitored by judges). Example: `feat(ranking): add recency decay and source diversity penalty`.
12. Do not edit files outside your module's scope unless fixing a type error. If a shared contract must change, update `lib/types.ts` and list the change in your final summary.
13. Each module ends with a short summary: what was built, files touched, how to test, known gaps.

---

## B4. Modules

Recommended order: **M0 → M1 → (M2, M3 in parallel) → M4 → M5 → (M6, M7, M8 in parallel) → M9 → M10 → M11 → M12 → M13 → M14.**
Priority tags: 🔴 required by problem statement, 🟡 differentiator, 🟢 nice to have.

---

### M0. Foundations and shared contracts 🔴

**Goal:** Make parallel work possible.
**Depends on:** nothing.
**Files:** `lib/types.ts`, `lib/mock/*`, `lib/utils/date.ts`, `.env.example`, `.gitignore`, `README.md` skeleton.

**Spec**
- Add `lib/types.ts` exactly as in B1 (extend if needed).
- Add mock data (15+ realistic articles across topics including Pakistan-specific and global business/energy stories, a mock profile, a mock edition).
- Add `lib/utils/date.ts` with `formatEditionDate(date, timezone)` and `todayInTimezone(timezone)`.
- Fix masthead date to accept a `timezone` prop, default `Asia/Karachi`.
- Remove unused shadcn dependencies only if nothing imports them.
- Add `.env.example`, confirm `.env*` and `data/` are gitignored.
- Remove any `packageManager` field for pnpm in `package.json` and any `pnpm-workspace.yaml`; keep only `package-lock.json`.

**Acceptance:** `npm run build` passes; mock imports compile; masthead shows correct local date.

---

### M1. Local database and simple auth 🔴

**Goal:** Persistence and user accounts, kept as simple as possible for a local demo.
**Depends on:** M0.
**Files:** `lib/db.ts`, `lib/schema.sql`, `lib/auth/{session,password}.ts`, `proxy.ts` (Next.js 16 name for middleware; use `middleware.ts` only if the installed version requires it), `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `app/api/auth/{signup,login,logout}/route.ts`.

**Spec**
- SQLite via `better-sqlite3` at `data/orbit.db`. `lib/db.ts` creates the `data/` folder if missing, opens the DB once, runs `schema.sql` (`CREATE TABLE IF NOT EXISTS`) on startup, and exports a singleton. Enable WAL mode.
- Tables:
  - `users` (`id`, `email` unique, `password_hash`, `created_at`)
  - `profiles` (fields as `UserProfile`; `id` = `users.id`; `situation_tags` and `languages` as JSON text)
  - `interest_weights` (`user_id`, `key`, `kind`, `weight`, `source`, `updated_at`; PK on `user_id, key`)
  - `sources` (`id`, `name`, `domain`, `feed_url`, `region`, `topics` JSON, `reliability`, `active`)
  - `articles` (fields as `Article`; unique on `canonical_url`; arrays and objects as JSON text)
  - `editions` (`id`, `user_id`, `edition_date`, `headline_of_the_day`, `items` JSON, `connections` JSON, `pdf_path`, `generated_at`; unique on `user_id, edition_date`)
  - `interaction_events` (fields as `InteractionEvent`)
  - `saved_articles` (`user_id`, `article_id`, `created_at`)
  - `impact_cache` (`article_id`, `profile_signature`, `note_json`, `created_at`) for M11
- Auth: email + password. `bcryptjs` for hashing. On signup and login, set an httpOnly, `sameSite=lax`, `secure` in production cookie containing a `jose`-signed JWT `{ userId }` using `SESSION_SECRET`, 7-day expiry. Helper `getSessionUser()` reads it in server components and route handlers and returns the user (or null).
- The proxy only checks that the cookie exists and the JWT is valid (use `jose`, which works in the edge runtime), and redirects signed-out users away from protected routes (everything except `/`, `/login`, `/signup`, `/api/auth/*`). It must not import the DB.
- Users with no profile row are redirected to `/onboarding` (check in a server component or layout, not in the proxy).
- **"Try demo user" button** on the login page signs in as a seeded demo account (seeded by `scripts/seed-demo.ts`, see M14).
- Nav profile button: menu with Profile, Interests, Sign out (signed in), or a "Sign in" link (signed out).
- Validate all request bodies with `zod`. Return generic error messages for bad credentials. Basic rate limit on login (in-memory is fine).
- Build `/login` and `/signup` in the existing design system: paper background, serif headings, hairline rules, burgundy accent, accessible labels and error messages.

**Acceptance:** signup, login, logout work; data survives a server restart; protected routes redirect; deleting `data/orbit.db` and restarting recreates a clean DB.

---

### M2. Onboarding experience 🔴

**Goal:** Capture enough to personalize, with a delightful, quick flow (under 90 seconds).
**Depends on:** M0, M1.
**Files:** `app/onboarding/page.tsx`, `components/onboarding/*`, `app/api/profile/route.ts`, `lib/onboarding/topics.ts`.

**Spec**
Multi-step, one question per screen, animated transitions, progress indicator, back button, every step skippable except the topic step, state persisted between steps (draft in `localStorage`). Newspaper-themed copy ("Let's set your front page").

1. **Welcome + name.**
2. **Topics:** tappable chips grouped by category (about 17 topics from `Topic`), pick at least 3. Each chip shows a short descriptor. Selected chips get burgundy styling.
3. **Go deeper (optional):** free-text "anything specific?" (e.g. "Tesla", "cricket", "PSX", "AI regulation") turned into keyword interests. Add suggestion chips based on chosen topics (a static map is fine).
4. **About you (powers personal impact):** city (text with a few suggestions, default from browser locale, user can edit), profession (presets plus free text), industry, and situation tags (multi-select: student, commutes by car, uses public transport, small business owner, investor, renter, homeowner, parent, freelancer, farmer, exporter/importer, remote worker). Explain why: "This lets us tell you how stories affect *you*."
5. **Reading style:** brief / standard / deep, delivery time, language.
6. **Live preview:** show a mini front page assembled from their picks (mock or real articles) so they see the value before finishing.
7. **Finish:** `POST /api/profile` saves the profile and initial `interest_weights` (topic chips = 0.8, keywords = 0.9, unselected topics = 0.1 baseline, source `onboarding`), triggers first edition generation, and redirects to `/` with a "Printing your first edition…" loading animation.

Validate the payload with `zod`. The route reads the user id from the session. Also provide `/settings/interests` later, reusing the same components, so users can edit their interests.

**Acceptance:** completes on mobile and desktop; keyboard accessible; refresh mid-flow keeps state; saved profile matches `UserProfile`.

---

### M3. News ingestion pipeline 🔴

**Goal:** Collect fresh articles from many sources.
**Depends on:** M1.
**Files:** `lib/ingest/{rss,guardian,gnews,normalize,dedupe,extract}.ts`, `lib/ingest/sources.ts`, `scripts/ingest.ts`, `scripts/daily.ts`, `app/api/admin/ingest/route.ts` (optional, dev only).

**Spec**
- Seed `sources` with 30+ feeds: Pakistan (Dawn, The News, Express Tribune, Geo, ARY, Business Recorder, Profit by Pakistan Today), global (BBC, Al Jazeera, Guardian, NPR, Ars Technica, The Verge, TechCrunch, Nature News, ESPN/Cricinfo, etc.), plus the Guardian and GNews APIs.
- Normalize to `Article` fields. Canonicalize URLs (strip `utm_*`, fragments).
- **Dedupe:** exact canonical URL, then near-duplicate by normalized title similarity (token Jaccard > 0.7 within 48h) and assign a `cluster_id`. Keep the best representative (richest content, most reliable source).
- Fetch full text with Readability only for top candidate articles, with a timeout and a polite User-Agent. Never block the run on failures.
- Keep only articles from the last 48h. Store `image_url` from `og:image` or feed media tags.
- Idempotent: running twice creates no duplicates. One bad feed must not stop the run.
- `npm run ingest` runs ingestion. **`npm run daily`** (`scripts/daily.ts`) runs ingest, then enrichment (M4), then edition build for all users (M5), logging counts and timings. Add both scripts to `package.json` (use `tsx`).
- Log counts: fetched, new, duplicates, failed sources.

**Acceptance:** running twice does not duplicate; 200+ fresh articles after a run; `npm run daily` works end to end.

---

### M4. LLM enrichment 🔴

**Goal:** Turn raw articles into structured, rankable data.
**Depends on:** M3.
**Files:** `lib/llm/{client,schemas}.ts`, `lib/enrich/{enrich,prompts}.ts`, `scripts/enrich.ts`.

**Spec**
- Batch 10 to 20 articles per Gemini call, JSON mode, validated with `zod`. Retry with backoff and respect rate limits. Skip already-enriched articles.
- Output per article: `summary` (2 to 3 neutral sentences), `topics` (from the `Topic` enum, max 3), `entities` (name and type, max 8, normalized names like "Brent crude" not "oil prices"), `region_tags`, `importance` (0 to 1: scale of impact, breadth of audience, novelty).
- Rule-based fallback if the LLM fails: use the feed category for topics, first 2 sentences for summary, importance by source reliability.
- No embeddings. Connections (M10) use entity overlap and the causal domain map.

**Prompt (enrichment)**

```
You are a news editor's assistant. For each article below, return JSON only.
Use ONLY information in the text. Do not speculate.
Schema: [{ "id": string, "summary": string (2-3 neutral sentences),
  "topics": Topic[] (max 3, from: <enum list>),
  "entities": [{ "name": string, "type": "org|person|place|commodity|currency|event" }],
  "region_tags": string[] (ISO country codes or "global"),
  "importance": number 0..1 }]
Importance guide: 0.9+ affects millions or major global event; 0.5 notable regional news; 0.2 niche or soft news.
Articles: <JSON array of {id,title,source,published_at,text(truncated to 1500 chars)}>
```

**Acceptance:** 95%+ of new articles enriched per run; invalid JSON never reaches the DB; fallback path tested.

---

### M5. Ranking and edition builder 🔴

**Goal:** Build each user's personal edition.
**Depends on:** M1, M4 (develop against mocks first).
**Files:** `lib/rank/{score,select,sections}.ts`, `lib/edition/build.ts`, `app/api/edition/generate/route.ts`, `scripts/build-editions.ts`.

**Spec**

Score per article for a user:

```
score = 0.40 * interestMatch
      + 0.20 * importance
      + 0.15 * recency            // exp decay, half-life ~12h
      + 0.10 * localRelevance     // region/city/profession match
      + 0.10 * exploration        // small boost for adjacent topics user has not seen
      + 0.05 * sourceReliability
      - diversityPenalty          // penalize 3rd+ story from same source or topic
      - seenPenalty               // already shown in last 3 editions
```

- `interestMatch` = max/weighted sum over matching topics, keywords (title/summary substring), and entities, using `interest_weights`.
- Hard filters: hidden topics and sources, already shown in last 3 editions, cluster duplicates (show one per cluster).
- Selection: story count by `reading_depth` (brief 8, standard 14, deep 22). Sizes: 1 `lead`, 2 to 3 `major`, rest `standard`, a few `brief` in an "In Brief" strip.
- Sections: "Front Page", "Your World" (local and national), "Your Interests" (grouped by top topics, section names personalized like "Energy & Markets"), "Beyond Your Bubble" (2 to 3 exploration picks), "In Brief".
- `why_shown` for every item (e.g. "Because you follow energy and live in Islamabad").
- `headline_of_the_day`: LLM or rule-based one-liner for the lead.
- Save to `editions` (upsert on `user_id, edition_date`). Calls the M10 and M11 hooks after selection (no-ops if not built yet).
- Cold start: for users with few signals, lean on onboarding weights and `importance`.
- `scripts/build-editions.ts` builds today's edition for every user. `POST /api/edition/generate` builds on demand for the signed-in user (first edition after onboarding, "Refresh my paper").

**Acceptance:** two different mock users get visibly different editions from the same article pool; unit tests for scoring and diversity; build time under 3 seconds per user excluding LLM calls.

---

### M6. Web edition reader (home page) 🔴

**Goal:** The daily paper as a full reading experience.
**Depends on:** M0 mocks (M5 for real data).
**Files:** `app/page.tsx`, `app/edition/[date]/page.tsx`, `components/edition/*` (`lead-story`, `story-card`, `section-header`, `in-brief-strip`, `connection-box`, `impact-callout`, `edition-toolbar`), `app/story/[id]/page.tsx`, `app/api/events/route.ts` (event intake; learning logic is M9).

**Spec**
- `/` shows today's edition for the signed-in user; signed-out visitors see a landing state with a sample edition (mock) and a "Start your paper" call to action.
- Keep the existing masthead, nav, and animation style. Replace the hardcoded featured story with the edition's lead.
- Newspaper layout: lead story with image, 2 to 3 major stories in a multi-column grid with vertical rules, section headers with double rules, an "In Brief" strip, responsive (single column on mobile).
- Each story card: category, headline, summary, source and time, read time, "why shown" in small muted text, actions: **Read original** (opens source in a new tab, logs `click_through`), **Skip** (dismiss with undo, logs `skip`), **Save**, **More like this**, **Less like this**.
- `/story/[id]` is an in-app reading page: summary, source link, related stories, connection box, impact callout, and feedback buttons.
- Toolbar: **Download PDF**, date picker for past editions, "Refresh my paper".
- Show impact callouts (M11) and connection boxes (M10) inline when present.
- Track `open` and `read_time` (client component using IntersectionObserver and the visibility API, batched `navigator.sendBeacon` to `/api/events`). The events route takes the user from the session.
- Loading skeletons in paper style; empty state ("Your paper is being printed") with a generation trigger.

**Acceptance:** works with mock data and real data; all actions keyboard operable; skip is undoable; events are stored.

---

### M7. PDF edition 🔴

**Goal:** A newspaper-style PDF of the same edition.
**Depends on:** M5 (or mock edition).
**Files:** `lib/pdf/{template,render,styles}.ts`, `app/api/edition/[id]/pdf/route.ts`, `app/print/edition/[id]/page.tsx` (print-only HTML page).

**Spec**
- Build a print-optimized HTML/CSS template and render with `puppeteer` (`page.pdf`, A3 or A4, `printBackground: true`, proper margins). Reuse the web tokens (paper, ink, burgundy, Newsreader).
- Layout inspired by a traditional broadsheet:
  - Page 1: masthead with "Your Orbit", date, edition number, a "Prepared for {name}" line, headline of the day, lead story with image in a wide column, 2 to 3 secondary stories in columns, "Inside this edition" index.
  - Inner pages: CSS multi-column text (`column-count`, `column-rule`), section headers with rules, drop caps on lead paragraphs, photo captions, pull quotes.
  - Boxed callouts: **"How it connects"** (compact causal chain) and **"What this means for you"** (impact note), each labeled as AI analysis.
  - Back page: "In Brief", a QR code per featured story linking to the original (`qrcode` package), and a reading summary ("You read 6 stories last week, mostly energy").
  - Footer with page numbers and date. Use `page-break-inside: avoid` on story blocks.
- Layout adapts to the reader: lead selection, section order by interest weight, story count by reading depth, bigger photos for visual topics.
- Ensure images are loaded before render (or embed as data URIs). Handle missing images with typographic placeholders.
- Cache: write the PDF to `data/pdfs/{editionId}.pdf`, serve the cached file, regenerate when the edition changes.
- The route requires a session and ownership of the edition.

**Acceptance:** PDF for mock and real editions looks like a newspaper (not a webpage printout); no cut-off text; under 10 seconds to generate; downloads from the web toolbar.

---

### M8. Archive and history 🔴

**Goal:** Access previous papers.
**Depends on:** M1, M5/M6.
**Files:** `app/archive/page.tsx`, `components/archive/*`.

**Spec**
- Replace the 404 on `/archive`: a calendar or grouped list (by month) of past editions, each tile showing date, headline of the day, lead image thumbnail, story count, and quick links to Read and Download PDF.
- Search within the archive (by keyword across headlines and summaries) and filter by topic (SQL `LIKE` is fine).
- A "Saved stories" tab listing saved articles.
- Pagination or "load more". Empty state for new users.
- Past editions are immutable, so `/edition/[date]` reads the stored edition (do not regenerate).

**Acceptance:** past edition opens exactly as it was; PDF works for any past date; search returns relevant results.

---

### M9. Learning loop 🔴

**Goal:** The paper gets better the more it is used, visibly.
**Depends on:** M5, M6 (events).
**Files:** `lib/learn/{update,decay,profile-summary}.ts`, `scripts/learn.ts`, `app/settings/interests/page.tsx` ("Your interest profile").

**Spec**
- **Signals:** `click_through`, `read_time`, `save`, `skip`, `more_like_this`, `less_like_this`, `hide_topic`, `hide_source`, and implicit "ignored" (shown but untouched across several editions).
- **Weight updates** applied to the article's topics, entities, and keywords (exponential moving average, clamp 0 to 1). Apply updates immediately when an event arrives, so the next refresh reflects them:

| Event | Delta |
| --- | --- |
| click_through | +0.08 |
| read_time ≥ 30s | +0.10 (scaled by read-time vs expected) |
| save | +0.15 |
| more_like_this | +0.25 |
| skip | −0.04 |
| ignored 3+ times | −0.03 |
| less_like_this | −0.25 |
| hide_topic | set to 0 and add hard filter |

- **Time decay:** multiply learned weights by about 0.98 per day (run inside `npm run daily`), so interests drift with the user. Onboarding weights decay slower.
- **Discover new interests:** if an entity or keyword appears in 3+ engaged articles, add it as a learned `entity` or `keyword` interest.
- **Exploration:** keep about 10% of stories as exploration so the system can learn new things. A positive response to an exploration story is a strong signal.
- **Make learning visible (important for judges):** "Your interest profile" page showing topic bars that change over time, "Newly noticed" interests, "Fading" interests, and a weekly note ("You've been reading more about energy and less about sports"). Each interest has a slider and a remove button so the user can correct the system. Show a small "Your paper learned from your reading" line on the edition.
- Optional: have the LLM write the weekly reading summary from aggregated stats (not raw clicks).

**Acceptance:** simulated event sequences change next-day rankings in the expected direction (test with a script); users can see and edit what was learned.

---

### M10. Story connections ("How it connects") 🟡

**Goal:** Show how stories relate, e.g. oil price changes linked to transport, inflation, currency, and shipping.
**Depends on:** M4 (entities), M5.
**Files:** `lib/connect/{candidates,chain,prompts,causal-map}.ts`, `components/edition/connection-box.tsx`, `components/edition/connection-graph.tsx`.

**Spec**
- **Find candidates:** among the edition's selected stories plus the last 48h pool, link articles that share entities, commodities, or currencies, or sit in known causal domains. Maintain a small hand-written **causal domain map** (oil → transport costs → food prices → inflation → interest rates → currency → imports; weather → crops → prices; policy → markets; etc.).
- Pick the top 2 to 3 clusters per edition, preferring ones that relate to the user's interests and situation.
- **LLM chain generation:** pass the 3 to 6 article summaries and ask for an ordered causal chain, where each step cites an `article_id`. Reject chains that cite ids not provided.
- **UI:** "How it connects" box on the edition with a horizontal chain of nodes (Oil ↑ → Freight costs ↑ → Food prices ↑) and a 2 to 3 sentence explanation, each node linking to its story. Optional interactive SVG graph on the story page showing related stories.
- In the PDF, render a compact boxed version.
- Label as AI analysis and show cited stories.

**Prompt (connections)**

```
You are an analyst explaining how news stories relate. Using ONLY the stories provided,
build a causal or thematic chain. Do not add facts not in the stories.
Return JSON: { "title": string, "chain": [{ "step": string (max 8 words), "article_id": string|null }],
"explanation": string (2-3 sentences, plain language) }
If the stories are not meaningfully connected, return { "title": null }.
Stories: <array of {id,title,summary,entities}>
```

**Acceptance:** at least one meaningful connection appears in a typical edition; no chain references a non-provided article; "not connected" case handled.

---

### M11. Personal impact ("What this means for you") 🟡

**Goal:** Explain how a story may affect this specific reader (area, profession, situation).
**Depends on:** M2 (profile), M4, M5.
**Files:** `lib/impact/{select,generate,prompts}.ts`, `components/edition/impact-callout.tsx`.

**Spec**
- Choose the top 3 to 5 stories with the strongest relevance to the profile (region match, industry match, situation tags).
- LLM writes a 1 to 3 sentence **concrete** impact note given the article summary and the profile (city, country, profession, industry, situation tags). Notes must hedge honestly ("may", "could") and avoid financial, legal, or medical directives.
- Include a confidence tag (High / Medium / Low) and the profile attributes used ("Because you commute by car in Islamabad").
- Skip stories with no real relevance rather than forcing a generic note. Quality over quantity.
- Cache in `impact_cache` by `(article_id, profile_signature)`.
- Reader feedback on notes: "Helpful / Not relevant" (feeds M9).
- UI: boxed callout under the story with burgundy left border and an "AI analysis" label. Same box in the PDF.

**Prompt (impact)**

```
You help a reader understand how a news story may affect them personally.
Reader: city={city}, country={country}, profession={profession}, industry={industry}, situation={tags}.
Story summary: {summary}
Write 1-3 sentences describing a plausible, concrete effect on THIS reader. Use hedged language.
Do not invent facts beyond the summary. No financial, medical, or legal advice.
If there is no meaningful effect, return { "relevant": false }.
Return JSON: { "relevant": boolean, "note": string, "confidence": "high|medium|low", "because": string[] }
```

**Acceptance:** two different profiles get different notes for the same story; irrelevant stories get none.

---

### M12. Room to explore (extras) 🟢

Pick 2 to 3 based on time. Each is independent.

- **Ask the paper:** chat box on the edition ("What does the fuel price rise mean for my business?") that answers using today's edition articles plus the user profile, with citations.
- **Explain like I'm new:** "Context" button on any story giving a short background and timeline (LLM from the article plus related older articles).
- **Morning briefing audio:** 2-minute text-to-speech summary of the edition (browser SpeechSynthesis, no cost).
- **Local utility strip:** weather (Open-Meteo, free), prayer times (Aladhan API, free), and exchange rate or fuel price for the user's city.
- **Perspective compare:** same event as covered by 2 to 3 sources with differences summarized.
- **Crossword or "Quiz of the day"** generated from today's stories.
- **Weekly digest page:** "Your week in review" built from reading history.

---

### M13. Polish, performance, and quality 🔴

**Depends on:** all.

- Loading skeletons, empty and error states on every page; toast feedback for actions.
- Image optimization with `next/image`, remote patterns configured for news image domains, fallbacks for broken images.
- Caching: enrichment and impact notes cached, LLM call counts logged.
- Update metadata, add Open Graph image and favicon.
- Responsive pass at 360, 768, 1280 widths. Reduced-motion check.
- Security basics: auth checks on every API route, never trust client-sent user ids, basic in-memory rate limit on event and generate endpoints.
- Tests for the riskiest logic: scoring, dedupe, weight updates, schema validation of LLM outputs.

---

### M14. Demo data and submission 🔴

**Files:** `README.md`, `docs/architecture.md`, `docs/demo-script.md`, `scripts/seed-demo.ts`.

- **`npm run seed`** (`scripts/seed-demo.ts`) rebuilds demo data: 2 to 3 demo users with distinct profiles (e.g. "Karachi trader", "Islamabad CS student", "Lahore school teacher"; known demo password), 7 to 14 days of past editions, and interaction history, so the archive and learning pages look alive. The login page's "Try demo user" button uses one of these accounts.
- **Run for the demo:** locally with `npm run build && npm start`. Run `npm run daily` shortly before recording so the pool is fresh. Optionally deploy to a host with a persistent volume for a public link.
- **Architecture diagram** (Mermaid in `docs/architecture.md`, also exported as PNG): ingestion → enrichment → ranking → edition → web and PDF → events → learning loop, plus connection and impact generators.
- **README:** what it is, features, stack, setup (`npm install`, env vars, `npm run seed`, `npm run daily`, `npm run dev`), how the pipeline runs, how learning works, screenshots, limitations.
- **Loom script (≤5 min):** 0:00 problem and idea (30s) → onboarding (60s) → today's paper and personalization difference between two users (60s) → story connection and "what this means for you" (60s) → PDF download (30s) → archive and learning profile showing the paper adapting (60s) → architecture recap (20s).
- **Submission checklist:** public repo link, Loom link, architecture diagram, submission form at https://forms.gle/4i4Gf8vNv3Vu8ZLJ7.

---

## B5. Scope control

If time runs short, ship in this order of value:

1. M0, M1, M2 (onboarding and accounts)
2. M3, M4, M5, M6 (real personalized web paper)
3. M7, M8 (PDF and archive, required by the problem statement)
4. M9 (visible learning, required)
5. M11 then M10 (personal impact is the most impressive for judges, then connections)
6. M14 (demo data and submission assets), then M12 and M13 as time allows

A complete end-to-end flow with simple ranking beats polished parts that don't connect.

## B6. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Free LLM rate limits | Batch, cache, fall back to rules, generate each edition once per day, pre-generate for demo users |
| `better-sqlite3` fails to install | Install build tools, or switch to `@libsql/client` with a local `file:` URL |
| Puppeteer PDF issues | Test early with the mock edition; wait for fonts and images before `page.pdf` |
| News sites block full-text fetch | Use feed summaries; only extract text for top candidates; never block on a failure |
| Hallucinated impact or connections | Ground in provided text, validate cited ids, hedge language, label as AI analysis |
| Cold start (no signals) | Strong onboarding weights plus `importance` ranking plus exploration |
| Data lost between runs | `data/` is gitignored, so keep `npm run seed` working to rebuild demo state anytime |
| Copyright | Show summaries and link to originals; do not republish full article text |
