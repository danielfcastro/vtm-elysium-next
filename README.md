# VTM Elysium — Character Management System

A full-stack character creation and management system for **Vampire: The Masquerade** (V20) chronicles. Built with Next.js 16, React 19, PostgreSQL 16, and a pure TypeScript rules engine.

![Version](https://img.shields.io/badge/version-2.3.0-crimson)
![Node.js](https://img.shields.io/badge/node-%3E%3D24.0.0-green)
![Next.js](https://img.shields.io/badge/next-16-black)
![License](https://img.shields.io/badge/license-private-red)

---

## Overview

VTM Elysium provides:

- **Players** — Create, edit, and submit characters through a guided multi-phase wizard; spend XP once approved.
- **Storytellers** — Manage chronicles, approve/reject/archive characters, grant XP, manage their player roster, and revert character state to any historical snapshot.
- **Rules Engine** — A fully deterministic, seeded character generator built on VTM V20 rules (attributes, abilities, disciplines, backgrounds, virtues, merits & flaws, freebie points, and XP costing strategies).
- **Interactive API Docs** — Available at `/api-docs` (Swagger UI, dark theme, try-it-out enabled).

---

## Recent Improvements

### ✨ Character Creation & Rules
- **Deferred Auto-save**: Character records are now created in the database only upon explicit user save, preventing unintended draft fragments (Bug #15).
- **Smart Chronicle Pre-fill**: New characters automatically inherit the current game name in the Chronicle field, which is set to read-only for consistency (Bug #14).
- **Specialty Drawer Refinement**: Enhanced the specialty selection with a high-contrast dark theme, autocomplete-only selection (with custom entry support), and specialized logic for Revenants and Animal Ghouls.

### 🍱 UI/UX & Quality of Life
- **Optimized Shell Layout**: Increased sidebar width to 280px for better readability of character names (Bug #10).
- **Intelligent Tooltips**: Character names in the toolbar now show the full name on hover if truncated (Bug #12).
- **Visual Polish**: Fixed indentation for Ghoul/Revenant items and corrected selection border alignment in the roster (Bugs #11, #13).

---

## TODO

### 🛠️ Administration & Systems
- Add administrative module to manage updates on all data related to the game (Clans, Disciplines, Backgrounds, Merits, Flaws, etc).
- Add a log configuration module that will allow debugging of any screen, drawer, or API call for troubleshooting.

### 📜 Character Rules & Data
- Migrate Specialties to a new database table and update the associated API.
- Add descriptions for Specialties (where present in official material).
- Migrate Disciplines to a new database table and update the associated API.
- Add Equipment management and an Attack tab to character sheets.
- Add detailed descriptions of Disciplines, including Rolls and Effects.
- Add an edition filter on game creation to support different rule sets.

### 🎨 UI/UX & Quality of Life
- Refine the layout of large buttons on the character creation sheet.

### 🧹 Technical Debt & Code Quality
- Reduce the size and complexity of `app/storyteller/page.tsx` and `app/player/page.tsx`.
- Improve componentization and overall code modularity.
- General code cleanup and optimization.

---

## Quick Start

### Prerequisites

| Requirement             | Version  |
| ----------------------- | -------- |
| Node.js                 | ≥ 24.0.0 |
| PostgreSQL              | ≥ 16     |
| Docker & Docker Compose | optional |

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env.local  # then edit values

# 3. Run database migrations
psql -U vtm_app -d vtm_chargen -f migrations/init.sql

# 4. Start dev server
npm run dev
```

Open **http://localhost:3000**

### Docker Compose (Recommended)

```bash
# Start everything (app + postgres)
docker-compose up --build

# Or detached
docker-compose up -d --build
```

Services:

| Service     | URL                            |
| ----------- | ------------------------------ |
| Next.js App | http://localhost:3000          |
| PostgreSQL  | localhost:5432                 |
| API Docs    | http://localhost:3000/api-docs |

---

## Application Pages

### `/login` — Login

Entry point for all users. Authenticates via email + password and stores the JWT token in `localStorage`. Redirects to `/player` after login.

---

### `/player` — Player Dashboard

**URL:** `http://localhost:3000/player`  
**Who:** Authenticated players (role = PLAYER)

The main interface for players. Requires authentication — unauthenticated users are redirected to `/login`.

**Layout:** three-panel (left sidebar / main area / right info panel)

| Panel            | What it shows                                                      |
| ---------------- | ------------------------------------------------------------------ |
| **Top bar**      | Active character name · Chronicle selector · Profile menu · Logout |
| **Left sidebar** | Chronicle dropdown + character list with status indicators         |
| **Main area**    | Character sheet (read-only) or character creation/edit wizard      |
| **Right panel**  | Audit trail or character info (clan weakness, recent changes)      |

**What players can do:**

- **Select a chronicle** from the top bar dropdown — the character list and sheet update automatically.
- **View character sheet** — full read-only VTM sheet (Vampire, Human Ghoul, or Animal Ghoul), switching automatically to the correct sheet type.
- **Create a new character** — click "+ New Character" → wizard opens inline (Phase 1: Starting Points, Phase 2: Freebie Points). Includes type selection (vampire or ghoul).
- **Create a ghoul** tied to one of their own vampire characters — picks ghoul type (human / animal), inherits domitor clan and generation cap.
- **Edit a character** in DRAFT or REJECTED status — click the Edit button next to the character in the sidebar.
- **Spend XP** on APPROVED or XP-status characters — click the "XP" button to open the XP spending drawer. Spends are queued as PENDING and sent to the storyteller for approval.
- **Submit for review** — click "✓" to submit a draft character to the storyteller.
- **View audit trail** — filtered log of all changes (Starting Points, Freebie, XP, Specialty, Merit/Flaw) with pagination.
- **Edit profile** — update name, email, or password from the top bar profile menu.

---

### `/storyteller` — Storyteller Dashboard

**URL:** `http://localhost:3000/storyteller`  
**Who:** Users with STORYTELLER role in at least one game

The main interface for storytellers (Narrators / Game Masters). Requires authentication and at least one game where the user is the STORYTELLER.

**Layout:** three-panel (left sidebar / main area / right info panel)

| Panel            | What it shows                                                            |
| ---------------- | ------------------------------------------------------------------------ |
| **Top bar**      | Selected chronicle name · Create Chronicle button · Profile menu         |
| **Left sidebar** | Chronicle selector + full character roster (all players' characters)     |
| **Main area**    | Character sheet + action buttons (Approve / Reject / Grant XP / Archive) |
| **Right panel**  | Audit trail + pending XP spend requests                                  |

**What storytellers can do:**

- **Create a new chronicle** — click "New Chronicle" in the sidebar header → enter name and optional description.
- **Create a player account** — click "Add Player" → enter name, email, and optional password (if omitted, a one-time generated password is shown and must be saved).
- **View all characters** in the selected chronicle — full roster regardless of status. Status badge shown on each entry.
- **Approve a submitted character** — one-click approve button visible on SUBMITTED characters. Status transitions to APPROVED.
- **Reject a submitted character** — opens a rejection dialog to enter a reason. Status transitions to REJECTED; player can edit and resubmit.
- **Grant XP** to a single character or bulk-grant to all characters — via the Grant XP modal (amount + optional session note).
- **Approve pending XP spends** — when a player submits XP spend drafts, the right panel shows the pending items; one click applies them all to the sheet.
- **Reject (cancel) XP spends** — clears the player's pending spend queue without applying it.
- **Archive a character** — hides it from active lists (reversible).
- **Create a ghoul** linked to one of the roster's vampire characters — same workflow as player-side but full storyteller control.
- **View audit trail** — same paginated, filterable log with access to all characters in the game.
- **Edit profile** — same profile editor as player view.

---

### `/api-docs` — Interactive API Reference

**URL:** `http://localhost:3000/api-docs`  
**Who:** Developers / anyone

Swagger UI rendering the full OpenAPI 3.0 spec (`/api/swagger`). Dark VTM theme with blood-red accents, colour-coded HTTP method badges, and **Try It Out** enabled for live calls against the running server.

Use the **Authorize** button (top right of the Swagger UI) to enter a Bearer token and test protected endpoints directly in the browser.

---

Create `.env.local` (or set via Docker env):

```env
# Required – PostgreSQL connection string
DATABASE_URL=postgres://vtm_app:password@localhost:5432/vtm_chargen

# Required – JWT signing secret (256-bit hex recommended)
JWT_SECRET=your-256-bit-secret-key

# Optional – JWT expiry (default: 365d)
JWT_EXPIRES_IN=365d

# Optional – Public base URL (used in Swagger server list)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Project Structure

```
vtm-elysium-next/
├── app/                        # Next.js App Router
│   ├── api/                    # REST API routes (35 endpoints)
│   ├── api-docs/               # Interactive Swagger UI (dark VTM theme)
│   ├── login/                  # Login page
│   ├── player/                 # Player dashboard (inline creation wizard)
│   ├── storyteller/            # Storyteller dashboard (inline creation wizard)
│   └── character/              # Character sheet view
│
├── components/                 # React UI components
│   ├── app-shell/              # Layout, navigation, LeftToolbar
│   ├── character-creation/     # Inline creation wizard components
│   │   ├── CreationWizard.tsx  # Main wizard orchestrator
│   │   ├── CreateVampire.tsx
│   │   ├── CreateGhoul.tsx
│   │   ├── CreateRevenant.tsx
│   │   └── CreateAnimal.tsx
│   ├── character-sheet/        # Per-type sheet components
│   ├── common/                 # Reusable generic components (Dots, Squares)
│   ├── modals/                 # GrantXpModal and other dialogs
│   ├── xp-drawer/              # XP spending drawer UI
│   └── power-selection-drawer/ # Discipline/power picker
│
├── src/
│   ├── core/                   # Rules engine (pure TS, no DB dependency)
│   │   ├── data/               # Game data access layer
│   │   │   └── raw/            # Static JSON data:
│   │   │       ├── abilities.json, attributes.json
│   │   │       ├── backgrounds.json, clans.json
│   │   │       ├── concepts.json, disciplines.json
│   │   │       ├── disciplines-enhanced.json
│   │   │       ├── merits.json, flaws.json
│   │   │       ├── natures.json, virtues.json
│   │   │       ├── generations.json, tags.json
│   │   │       ├── bestiary/   # Beast templates
│   │   │       ├── disciplines/# Per-discipline data
│   │   │       ├── revenants/  # Revenant family data
│   │   │       └── Names/      # Name generation lists
│   │   ├── services/           # Character generation services:
│   │   │   ├── CharacterGeneratorService.ts   # Entry point
│   │   │   ├── AttributeService.ts
│   │   │   ├── AbilityDistributionService.ts
│   │   │   ├── DisciplineDistributionService.ts
│   │   │   ├── BackgroundDistributionService.ts
│   │   │   ├── VirtueDistributionService.ts
│   │   │   ├── FreebieSpendingService.ts
│   │   │   ├── CoreStatsService.ts
│   │   │   ├── LifeCycleService.ts
│   │   │   ├── NameGeneratorService.ts
│   │   │   ├── PersonaService.ts
│   │   │   ├── TraitManagerService.ts
│   │   │   └── XpSpendingService.ts
│   │   ├── strategies/         # Starting point & cost strategies:
│   │   │   ├── NeophiteStartingPointStrategy.ts
│   │   │   ├── AncillaeStartingPointStrategy.ts
│   │   │   ├── ElderStartingPointStrategy.ts
│   │   │   ├── GhoulStartingPointStrategy.ts
│   │   │   ├── RevenantStartingPointStrategy.ts
│   │   │   ├── HumanStartingPointStrategy.ts
│   │   │   ├── FreebiePointCostStrategy.ts
│   │   │   ├── XpPointCostStrategy.ts
│   │   │   └── StartingPointStrategyResolver.ts
│   │   ├── xpStrategies/       # Per-trait XP spending strategies:
│   │   │   ├── XpAttributeStrategy.ts
│   │   │   ├── XpAbilityStrategy.ts
│   │   │   ├── XpDisciplineStrategy.ts
│   │   │   ├── XpVirtueStrategy.ts
│   │   │   ├── XpHumanityStrategy.ts
│   │   │   └── XpWillpowerStrategy.ts
│   │   ├── affinity/           # Affinity processor (clan trait preferences)
│   │   ├── enums/              # TraitType, etc.
│   │   └── utils/              # RNG (mulberry32, seedFromString)
│   ├── i18n/                   # Internationalisation helpers
│   └── lib/                    # Shared XP ledger, other lib code
│
├── lib/                        # Next.js server utilities
│   ├── db.ts                   # PostgreSQL connection pool (pg)
│   ├── auth.ts                 # JWT auth (jose) – requireAuth, requireUser
│   ├── roles.ts                # requireRoleInGame helper
│   ├── sheet.ts                # buildZeroSheet – blank sheet factory
│   └── xp/
│       ├── xpLedger.ts         # insertPendingXpSpendLog, getXpTotalsForCharacter
│       └── xpSpendService.ts   # spendXpImmediate, getCurrentLevel
│
├── types/                      # Shared TypeScript types
│   └── app.ts                  # CharacterListItem, etc.
│
├── migrations/
│   └── init.sql                # Full database schema (single-file)
│
├── __tests__/api/              # Jest unit tests (23 test files)
├── tests/                      # Smoke / integration tests
├── contracts/                  # API contract definitions
├── docs/
│   ├── api-reference.md        # API reference
│   ├── database-schema.md      # Database schema docs
│   └── development.md          # Development guide
│
├── swagger.config.ts           # OpenAPI 3.0 spec (all 35 routes)
├── docker-compose.yml
├── Dockerfile
├── next.config.mjs
└── tsconfig.json
```

---

## Features

### Character Types

| Type               | Description                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| **Vampire**        | Full character with attributes, abilities, disciplines, virtues, humanity/road, willpower, backgrounds |
| **Human Ghoul**    | Human servant; inherits domitor disciplines up to their generation cap                                 |
| **Revenant Ghoul** | Ghoul from a revenant family; starts with family disciplines (max level 1)                             |
| **Animal Ghoul**   | Ghoul bonded to an animal template; locked trait caps and limited growth                               |

### Character Status Flow

```
DRAFT_PHASE1 ──► DRAFT_PHASE2 ──► SUBMITTED ──► APPROVED ──► XP
      ▲                 ▲              │              │
      └─────────────────┴── REJECTED ◄┘              │
                                                  ARCHIVED
```

| ID  | Status         | Description                                               |
| --- | -------------- | --------------------------------------------------------- |
| 1   | `DRAFT_PHASE1` | Starting points phase — base attribute/ability allocation |
| 2   | `DRAFT_PHASE2` | Freebie points phase — secondary trait spending           |
| 3   | `SUBMITTED`    | Awaiting storyteller review                               |
| 4   | `APPROVED`     | Approved and active                                       |
| 5   | `REJECTED`     | Returned by storyteller; player can edit and resubmit     |
| 6   | `ARCHIVED`     | Retired character; hidden from active lists               |
| 7   | `XP`           | Active character in XP spending mode                      |

### Rules Engine

The `src/core/` package implements VTM V20 rules with no database dependency:

- **Deterministic generation** via seeded `mulberry32` RNG — pass the same seed to get the same character.
- **Affinity system** — clan affinities influence trait distribution probabilities.
- **Starting point strategies** — separate point budgets per vampire age category (Neophyte, Ancillae, Elder, etc.) and ghoul types.
- **Freebie spending** — weighted priority-based allocation across all trait categories.
- **XP cost strategies** — VTM-compliant costs (in-clan vs. out-of-clan, current level multipliers) per trait type.

### Player Features

- Character creation wizard (Phase 1 → Phase 2)
- Live character sheet with type-specific UI (Vampire / Human Ghoul / Animal Ghoul)
- Submit for storyteller approval
- Spend XP on attributes, abilities, disciplines, backgrounds, virtues, willpower, and road
- Draft XP spend requests (pending ST approval workflow)
- View XP history (grants + spends unified timeline)
- Full character version history

### Storyteller Features

- Manage multiple chronicles
- Approve / reject submitted characters (with optional rejection reason)
- Archive / unarchive characters
- Grant XP individually (per-session, with notes)
- Approve pending XP spend drafts submitted by players
- Move a character to a different chronicle
- Revert a character to any historical snapshot (by version or history ID)
- Permanently delete characters (soft delete, cascades to all related records)
- View player roster per game
- Add player accounts directly (auto-generated password returned if not supplied)

---

## API Documentation

The full interactive API reference is available at **`/api-docs`** (Swagger UI with dark VTM theme, try-it-out enabled).

The OpenAPI 3.0 spec is served at **`GET /api/swagger`** (JSON).

### Authentication

All endpoints except `/api/login` and `/api/register` require:

```http
Authorization: Bearer <JWT token>
```

### Endpoint Summary

#### Authentication

| Method  | Endpoint        | Description                             |
| ------- | --------------- | --------------------------------------- |
| `POST`  | `/api/login`    | Authenticate; returns JWT token         |
| `POST`  | `/api/register` | Create account; returns JWT token       |
| `GET`   | `/api/me`       | Current user profile + storyteller flag |
| `PATCH` | `/api/profile`  | Update name, email, or password         |

#### Games

| Method | Endpoint                            | Description                      |
| ------ | ----------------------------------- | -------------------------------- |
| `GET`  | `/api/games`                        | List all chronicles              |
| `POST` | `/api/games`                        | Create a new chronicle           |
| `POST` | `/api/games/{gameId}/characters`    | Create blank character in a game |
| `GET`  | `/api/games/{gameId}/characters/me` | My characters in a game          |

#### Characters

| Method   | Endpoint                           | Description                        |
| -------- | ---------------------------------- | ---------------------------------- |
| `GET`    | `/api/characters/{id}`             | Get character by ID                |
| `PUT`    | `/api/characters/{id}`             | Replace character sheet            |
| `DELETE` | `/api/characters/{id}`             | Soft-delete character (draft only) |
| `PATCH`  | `/api/characters/{id}/sheet-merge` | Partial sheet patch (JSON merge)   |
| `POST`   | `/api/characters/{id}/submit`      | Submit for storyteller review      |
| `GET`    | `/api/characters/{id}/history`     | Paginated version history          |
| `GET`    | `/api/characters/{id}/audit`       | Paginated audit trail              |
| `POST`   | `/api/characters/{id}/audit`       | Add manual audit entry             |

#### Character XP

| Method   | Endpoint                              | Description                             |
| -------- | ------------------------------------- | --------------------------------------- |
| `GET`    | `/api/characters/{id}/xp`             | XP totals (granted / spent / remaining) |
| `POST`   | `/api/characters/{id}/xp/grant`       | Grant XP (requires ST/Admin role)       |
| `POST`   | `/api/characters/{id}/xp/spend`       | Immediate XP spend & apply              |
| `GET`    | `/api/characters/{id}/xp/spend-draft` | Get pending XP spend requests           |
| `POST`   | `/api/characters/{id}/xp/spend-draft` | Create pending XP spend request         |
| `DELETE` | `/api/characters/{id}/xp/spend-draft` | Cancel pending XP spend                 |
| `POST`   | `/api/characters/{id}/xp/approve`     | Player approves own pending spend       |
| `GET`    | `/api/characters/{id}/xp/history`     | XP history (grants + spends)            |
| `POST`   | `/api/characters/{id}/xp/start`       | Transition APPROVED → XP status         |

#### Storyteller — Characters

| Method   | Endpoint                                   | Description                         |
| -------- | ------------------------------------------ | ----------------------------------- |
| `GET`    | `/api/storyteller/characters`              | List all characters in a game       |
| `PATCH`  | `/api/storyteller/characters/{id}/approve` | Approve a SUBMITTED character       |
| `PATCH`  | `/api/storyteller/characters/{id}/reject`  | Reject a SUBMITTED character        |
| `POST`   | `/api/storyteller/characters/{id}/archive` | Archive a character                 |
| `DELETE` | `/api/storyteller/characters/{id}/archive` | Unarchive a character               |
| `DELETE` | `/api/storyteller/characters/{id}/delete`  | Permanently delete a character      |
| `PUT`    | `/api/storyteller/characters/{id}/move`    | Move character to another chronicle |
| `POST`   | `/api/storyteller/characters/{id}/revert`  | Revert to a history snapshot        |

#### Storyteller — XP

| Method | Endpoint                                      | Description               |
| ------ | --------------------------------------------- | ------------------------- |
| `POST` | `/api/storyteller/characters/{id}/xp/grant`   | Grant XP to character     |
| `POST` | `/api/storyteller/characters/{id}/xp/approve` | Approve pending XP spends |

#### Storyteller — Games

| Method   | Endpoint                                             | Description                               |
| -------- | ---------------------------------------------------- | ----------------------------------------- |
| `GET`    | `/api/storyteller/games`                             | List ST's chronicles                      |
| `POST`   | `/api/storyteller/games`                             | Create chronicle                          |
| `GET`    | `/api/storyteller/games/{gameId}`                    | Get game details                          |
| `GET`    | `/api/storyteller/games/{gameId}/characters`         | Characters in game (filterable by status) |
| `GET`    | `/api/storyteller/games/{gameId}/players`            | Player roster                             |
| `POST`   | `/api/storyteller/games/{gameId}/players`            | Create player account                     |
| `DELETE` | `/api/storyteller/games/{gameId}/players/{playerId}` | Remove player from game                   |
| `GET`    | `/api/storyteller/games/{gameId}/settings`           | Game settings (XP purchase rules)         |
| `PATCH`  | `/api/storyteller/games/{gameId}/settings`           | Update game settings                      |

#### Utilities

| Method | Endpoint                   | Description                            |
| ------ | -------------------------- | -------------------------------------- |
| `POST` | `/api/characters/generate` | Generate a random character (seedable) |

---

## Database Schema

See [`docs/database-schema.md`](docs/database-schema.md) for full documentation.
<<<<<<< HEAD

### ER Diagram

![Database Diagram](docs/db/vtm_chargen%20-%20vtm_chargen%20-%20public.png)

### Core Tables

### Core Tables

| Table                | Description                                         |
| -------------------- | --------------------------------------------------- |
| `users`              | User accounts (email, password_hash, is_active)     |
| `games`              | Chronicles / campaigns                              |
| `roles`              | Role definitions (`PLAYER`, `STORYTELLER`) [lookup] |
| `user_game_roles`    | Player ↔ Game ↔ Role association (uses `role_id`)   |
| `characters`         | Character records with status, XP, and JSON sheet   |
| `character_status`   | Status enum lookup (1-7)                            |
| `characters_history` | Full character snapshots captured before every update|
| `xp_grants`          | XP grant ledger (amount, date, note)                |
| `xp_spent_status`    | XP spend status lookup (APPROVED, REJECTED, PENDING)|
| `xp_spend_logs`      | XP spend request ledger (uses `status_id`)          |
| `audit_log_types`    | Audit action type definitions lookup                |
| `audit_logs`         | Free-form audit trail per character                 |

### Database Triggers

| Trigger                                     | Purpose                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| `characters_history_before_update`          | Automatically snapshot the character state before any UPDATE on `characters`.  |
| `trg_characters_set_updated_at_and_version` | Updates `updated_at` timestamp and increments the record `version`.             |
| `trg_delete_history_on_archive`             | Purges history snapshots for a character when status is set to `ARCHIVED` (6). |

---

## Technology Stack

| Layer      | Technology                   |
| ---------- | ---------------------------- |
| Framework  | Next.js 16 (App Router)      |
| UI         | React 19                     |
| Language   | TypeScript 5.7               |
| Database   | PostgreSQL 16                |
| DB Client  | `pg` (raw SQL, no ORM)       |
| Auth       | JWT via `jose` + `bcryptjs`  |
| Validation | Zod                          |
| API Docs   | swagger-jsdoc + Swagger UI   |
| Testing    | Jest 29 + ts-jest            |
| Linting    | ESLint 9 + typescript-eslint |
| Formatting | Prettier 3                   |
| CSS        | CSS Modules + PostCSS        |
| Container  | Docker + Docker Compose      |
| CI Hooks   | Husky + lint-staged          |

---

## Development Scripts

| Command                | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Start dev server on port 3000 (all interfaces) |
| `npm run build`        | Type-check → format-check → lint → next build  |
| `npm run start`        | Start production server                        |
| `npm run lint`         | Run ESLint                                     |
| `npm run lint:fix`     | Auto-fix ESLint issues                         |
| `npm run format`       | Format all files with Prettier                 |
| `npm run format:check` | Check formatting (no write)                    |
| `npm run fix`          | Format + lint:fix in one pass                  |
| `npm run type-check`   | TypeScript `tsc --noEmit`                      |
| `npm run check`        | format:check + lint + type-check               |
| `npm run test`         | Run Jest test suite                            |
| `npm run docs`         | Generate TypeDoc documentation                 |
| `npm run css:sort`     | Sort CSS declarations (SMACSS order)           |

### Versioning

The README version badge is kept in sync with `package.json` automatically.
Use the standard npm version commands — the badge is updated and staged into the
same commit as the version bump:

```bash
# Patch release  e.g. 2.2.0 → 2.2.1
npm version patch

# Minor release  e.g. 2.2.0 → 2.3.0
npm version minor

# Major release  e.g. 2.2.0 → 3.0.0
npm version major

# Specific version
npm version 2.5.0
```

> **How it works:** the `version` lifecycle hook runs `scripts/update-readme-version.cjs`,
> which rewrites the badge in `README.md`. The `postversion` hook then stages `README.md`
> so it is included in the automatically created version commit and tag.

---

## Testing

The test suite covers **23 API test files** in `__tests__/api/`:

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Single file
npm test -- characters.xp.spend.test.ts

# With coverage
npm test -- --coverage
```

**Test files include:**

- `login.test.ts`, `me.test.ts`
- `games.test.ts`, `games.gameId.characters.post.test.ts`
- `characters.get.test.ts`, `characters.put.test.ts`, `characters.delete.test.ts`
- `characters.submit.post.test.ts`, `characters.sheet-merge.patch.test.ts`
- `characters.history.get.test.ts`, `characters.audit.get.test.ts`
- `characters.xp.get.test.ts`, `characters.xp.spend.test.ts`, `characters.xp.history.test.ts`
- `characters.generate.post.test.ts`
- `storyteller.characters.approve.patch.test.ts`, `storyteller.characters.reject.patch.test.ts`
- `storyteller.characters.move.put.test.ts`, `storyteller.characters.revert.post.test.ts`
- `storyteller.characters.xp.grant.test.ts`
- `storyteller.game.characters.get.test.ts`, `storyteller.games.get.test.ts`

---

## Code Quality

```bash
# Full check before committing
npm run check

# Pre-commit hook (husky) automatically runs:
# eslint --fix + prettier --write on staged files
```

---

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run `npm run check` (format + lint + typecheck)
4. Run `npm test` to ensure all tests pass
5. Commit with a descriptive message
6. Open a pull request

---

## Troubleshooting

### Database connection fails

Verify `DATABASE_URL` format:

```
postgres://username:password@host:port/dbname
```

Ensure PostgreSQL is running and the schema has been applied (`migrations/init.sql`).

### JWT errors

Ensure `JWT_SECRET` is set and identical across all environments.  
Tokens expire after `JWT_EXPIRES_IN` (default 365 days).

### Build fails

```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

### Test failures

Ensure the test database is accessible and migrations have been applied. Tests mock the database layer — check `__mocks__/` for mock setup.

---

## Acknowledgments

Built with:

- [Next.js](https://nextjs.org/) ·
  [React](https://react.dev/) ·
  [PostgreSQL](https://www.postgresql.org/) ·
  [TypeScript](https://www.typescriptlang.org/) ·
  [jose](https://github.com/panva/jose) ·
  [Zod](https://zod.dev/) ·
  [Swagger UI](https://swagger.io/tools/swagger-ui/)

---

## License

Private — All rights reserved.
