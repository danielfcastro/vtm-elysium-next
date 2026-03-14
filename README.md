# VTM Elysium - Character Management System

A comprehensive character creation and management system for Vampire: The Masquerade (VTM) chronicles. Built with Next.js, React, and PostgreSQL.

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![Node.js](https://img.shields.io/badge/node-%3E%3D24.0.0-green)
![License](https://img.shields.io/badge/license-private-red)

## Overview

VTM Elysium is a web application that allows Storytellers to manage their Vampire: The Masquerade chronicles, and players to create and manage their characters. The system supports:

- **Character Creation**: Multi-phase character creation with merits, flaws, disciplines, and more
- **XP Management**: Grant and spend experience points
- **Storyteller Tools**: Approve, reject, archive characters
- **Audit Trail**: Full history of character changes
- **Role-based Access**: Separate interfaces for Players and Storytellers

## Quick Start

### Prerequisites

- Node.js >= 24.0.0
- PostgreSQL >= 16
- Docker & Docker Compose (optional)

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open http://localhost:3000

### Docker Setup

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

This starts:

- **Next.js App**: http://localhost:3000
- **PostgreSQL**: localhost:5432

## Project Structure

```
vtm-elysium-next/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── characters/   # Character CRUD & operations
│   │   ├── games/        # Game management
│   │   ├── storyteller/ # Storyteller tools
│   │   ├── login/        # Authentication
│   │   └── register/     # User registration
│   ├── player/           # Player dashboard
│   ├── storyteller/      # Storyteller dashboard
│   ├── create/           # Character creation wizard
│   └── character-sheet.css
├── components/            # React components
│   ├── app-shell/       # Layout components
│   ├── character-sheet/  # Character sheet components
│   ├── modals/          # Modal dialogs
│   └── xp-drawer/       # XP management drawer
├── core/                 # Core business logic
│   ├── data/            # Static game data
│   └── services/         # Service layer
├── lib/                  # Utilities
│   ├── db.ts           # Database connection
│   ├── auth.ts          # Authentication
│   └── roles.ts         # Role management
├── migrations/           # Database migrations
├── src/                  # Source code
│   ├── i18n/           # Internationalization
│   └── lib/            # Library code
├── types/               # TypeScript types
└── __tests__/          # Test suites
```

## Features

### Player Features

- **Character Creation**: Create characters through multiple phases
  - Phase 1: Starting points
  - Phase 2: Freebie points
- **XP Spending**: Spend experience points on attributes, skills, disciplines...
- **Character Sheet**: View and edit character details
- **Submit for Approval**: Submit completed characters to Storyteller

### Storyteller Features

- **Game Management**: Create and manage chronicles
- **Player Management**: View and manage players
- **Character Approval**: Approve, reject, or request changes
- **XP Grants**: Grant XP to individual or all characters
- **Archive/Delete**: Archive or permanently delete characters
- **Audit Trail**: View full history of character changes

### Character Status Flow

```
DRAFT_PHASE1 → DRAFT_PHASE2 → SUBMITTED → APPROVED → XP
                    ↓              ↓           ↓
                REJECTED      REJECTED   REJECTED
                    ↓              ↓           ↓
                 ARCHIVED     ARCHIVED    ARCHIVED
```

Status IDs:

- 1: DRAFT_PHASE1
- 2: DRAFT_PHASE2
- 3: SUBMITTED
- 4: APPROVED
- 5: REJECTED
- 6: ARCHIVED
- 7: XP

## API Documentation

See [API Reference](docs/api-reference.md) for detailed API documentation.

### Authentication

All protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

### Key Endpoints

| Method | Endpoint                                  | Description         |
| ------ | ----------------------------------------- | ------------------- |
| POST   | `/api/login`                              | User login          |
| POST   | `/api/register`                           | User registration   |
| GET    | `/api/characters/:id`                     | Get character sheet |
| PUT    | `/api/characters/:id`                     | Update character    |
| POST   | `/api/characters/:id/submit`              | Submit for approval |
| POST   | `/api/characters/:id/xp/spend`            | Spend XP            |
| POST   | `/api/storyteller/characters/:id/approve` | Approve character   |
| POST   | `/api/storyteller/characters/:id/reject`  | Reject character    |
| POST   | `/api/storyteller/characters/:id/archive` | Archive character   |
| DELETE | `/api/storyteller/characters/:id/archive` | Unarchive character |
| DELETE | `/api/storyteller/characters/:id/delete`  | Delete character    |

## Database Schema

See [Database Schema](docs/database-schema.md) for detailed schema documentation.

### Core Tables

- `users` - User accounts
- `games` - Chronicles/games
- `characters` - Character records
- `character_status` - Status definitions
- `characters_history` - Character change history
- `xp_grants` - XP grants
- `xp_spend_logs` - XP spending records

### Triggers

- `characters_history_before_update` - Saves character state before updates
- `set_updated_at_and_version` - Updates timestamp and version
- `delete_history_on_archive` - Deletes history when character is archived

## Environment Variables

```env
# Database connection
DATABASE_URL=postgres://user:password@host:port/database

# JWT authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=365d
```

## Development Scripts

| Command              | Description                               |
| -------------------- | ----------------------------------------- |
| `npm run dev`        | Start development server                  |
| `npm run build`      | Build for production                      |
| `npm run start`      | Start production server                   |
| `npm run lint`       | Run ESLint                                |
| `npm run format`     | Format code with Prettier                 |
| `npm run type-check` | TypeScript type check                     |
| `npm run test`       | Run tests                                 |
| `npm run check`      | Run all checks (format, lint, type-check) |

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run `npm run check` to validate
4. Run `npm test` to ensure tests pass
5. Commit with descriptive messages
6. Push and create a pull request

## TODO

- [ ] Revert: Revert character to previous states

## License

Private - All rights reserved

## Acknowledgments

Built with:

- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [PostgreSQL](https://www.postgresql.org/)
- [TypeScript](https://www.typescriptlang.org/)
