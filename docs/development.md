# Development Guide

## Prerequisites

- Node.js >= 24.0.0
- PostgreSQL >= 16
- Docker (optional)

## Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd vtm-elysium-next
npm install
```

### 2. Database Setup

#### Option A: Local PostgreSQL

1. Create a PostgreSQL database:

```bash
createdb vtm_chargen
```

2. Create a user (or use existing):

```sql
CREATE USER vtm_app WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE vtm_chargen TO vtm_app;
```

3. Run migrations:

```bash
psql -h localhost -U vtm_app -d vtm_chargen -f migrations/000_create_schema.sql
psql -h localhost -U vtm_app -d vtm_chargen -f migrations/001_update_characters_history_status_id.sql
psql -h localhost -U vtm_app -d vtm_chargen -f migrations/002_delete_history_on_archive.sql
```

#### Option B: Docker

```bash
docker-compose up -d db
```

### 3. Environment Variables

Create `.env.local`:

```env
# Database connection
DATABASE_URL=postgres://vtm_app:password@localhost:5432/vtm_chargen

# JWT authentication
JWT_SECRET=your-256-bit-secret-key
JWT_EXPIRES_IN=365d
```

### 4. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Project Architecture

### Technology Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19
- **Database**: PostgreSQL 16
- **ORM**: Raw SQL (pg library)
- **Authentication**: JWT (jose library)
- **Validation**: Zod
- **Testing**: Jest
- **Styling**: CSS Modules + PostCSS

### Code Organization

```
src/
├── core/              # Business logic
│   ├── data/         # Static game data (JSON)
│   └── services/     # Service classes
├── lib/              # Utilities
│   ├── db.ts        # Database connection pool
│   ├── auth.ts      # JWT authentication
│   └── roles.ts     # Role checking
└── i18n/            # Internationalization

app/                  # Next.js pages
├── api/             # API routes
│   ├── characters/  # Character CRUD
│   ├── games/       # Game management
│   ├── storyteller/ # ST tools
│   └── ...
├── player/          # Player dashboard
├── storyteller/    # ST dashboard
└── create/          # Character creation

components/          # React components
├── app-shell/       # Layout
├── character-sheet/# Sheet components
├── modals/          # Dialogs
└── xp-drawer/      # XP UI
```

### Key Patterns

#### API Routes

API routes follow Next.js App Router conventions:

```typescript
// app/api/characters/[id]/route.ts
export async function GET(req: NextRequest, ctx: RouteContext) {
  // Handle GET
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  // Handle PUT
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  // Handle DELETE
}
```

#### Database Queries

Use the query helper for simple queries:

```typescript
import { query } from "@/lib/db";

const result = await query<RowType>("SELECT * FROM table WHERE id = $1", [id]);
```

Use the pool directly for transactions:

```typescript
import { getPool } from "@/lib/db";

const client = await getPool().connect();
try {
  await client.query("BEGIN");
  // ... operations
  await client.query("COMMIT");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
}
```

#### React Components

Use the CharacterSheet component for displaying character data:

```typescript
import CharacterSheet from "@/components/character-sheet/CharacterSheet";

<CharacterSheet
  mode="readonly"
  sheet={sheetData}
  onSubmit={handleSubmit}
  characterStatus="APPROVED"
/>
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm test -- --watch

# Run specific test file
npm test -- characters.get.test.ts
```

### Writing Tests

Tests are in `__tests__/api/` directory:

```typescript
import { GET, PUT, POST, DELETE } from "@/app/api/characters/[id]/route";

describe("GET /api/characters/:id", () => {
  it("returns character by id", async () => {
    // Test implementation
  });
});
```

## Code Quality

### Formatting

```bash
# Format all files
npm run format

# Check formatting
npm run format:check
```

### Linting

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

### Type Checking

```bash
# TypeScript type check
npm run type-check
```

### Full Check

```bash
# Run all checks
npm run check
```

## Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Docker Production

```bash
# Build and start all services
docker-compose up --build

# Start only the app (if db is local)
docker-compose up -d app
```

## Common Tasks

### Adding a New API Endpoint

1. Create route file: `app/api/feature/[id]/route.ts`
2. Implement handlers (GET, POST, PUT, DELETE)
3. Add authentication check
4. Add tests in `__tests__/api/`

### Adding a New Character Field

1. Update database schema (migration if needed)
2. Update CharacterSheet component
3. Update API responses
4. Update types in `types/app.ts`

### Adding a Database Migration

1. Create file: `migrations/XXX_description.sql`
2. Write SQL statements
3. Test on development database
4. Commit and document

## Troubleshooting

### Database Connection Issues

Check DATABASE_URL format:

```
postgres://username:password@host:port/database
```

### Authentication Errors

Ensure JWT_SECRET is set and consistent across environments.

### Build Errors

Clear Next.js cache:

```bash
rm -rf .next
npm run build
```

### Test Failures

Check test database is running and migrations applied.
