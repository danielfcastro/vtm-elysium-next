# Database Schema

## Overview

The database uses PostgreSQL with UUIDs for primary keys and JSONB for flexible character data.

## Tables

### users

Stores user accounts.

| Column        | Type         | Constraints      | Description        |
| ------------- | ------------ | ---------------- | ------------------ |
| id            | uuid         | PRIMARY KEY      | User ID            |
| email         | varchar(255) | UNIQUE, NOT NULL | Email address      |
| name          | varchar(255) | NOT NULL         | Display name       |
| password_hash | varchar(255) | NOT NULL         | Bcrypt hash        |
| created_at    | timestamptz  | DEFAULT now()    | Creation timestamp |

### games

Stores chronicle/game information.

| Column         | Type         | Constraints          | Description        |
| -------------- | ------------ | -------------------- | ------------------ |
| id             | uuid         | PRIMARY KEY          | Game ID            |
| name           | varchar(255) | NOT NULL             | Game name          |
| description    | text         |                      | Game description   |
| storyteller_id | uuid         | REFERENCES users(id) | ST user ID         |
| created_at     | timestamptz  | DEFAULT now()        | Creation timestamp |
| updated_at     | timestamptz  | DEFAULT now()        | Last update        |

### character_status

Lookup table for character statuses.

| Column      | Type        | Description        |
| ----------- | ----------- | ------------------ |
| id          | smallint    | Status ID          |
| type        | varchar(50) | Status key         |
| description | text        | Status description |

**Status Values:**

| ID  | Type         | Description             |
| --- | ------------ | ----------------------- |
| 1   | DRAFT_PHASE1 | Phase 1 draft           |
| 2   | DRAFT_PHASE2 | Phase 2 draft           |
| 3   | SUBMITTED    | Awaiting ST approval    |
| 4   | APPROVED     | Approved by ST          |
| 5   | REJECTED     | Rejected by ST          |
| 6   | ARCHIVED     | Archived (dead/retired) |
| 7   | XP           | In XP spending mode     |

### characters

Main character table.

| Column              | Type        | Constraints                     | Description           |
| ------------------- | ----------- | ------------------------------- | --------------------- |
| id                  | uuid        | PRIMARY KEY                     | Character ID          |
| game_id             | uuid        | REFERENCES games(id)            | Game ID               |
| owner_user_id       | uuid        | REFERENCES users(id)            | Owner user ID         |
| status_id           | smallint    | REFERENCES character_status(id) | Current status        |
| sheet               | jsonb       | DEFAULT '{}'                    | Character data        |
| total_experience    | integer     | DEFAULT 0                       | Total XP              |
| spent_experience    | integer     | DEFAULT 0                       | Spent XP              |
| version             | integer     | DEFAULT 1                       | Optimistic lock       |
| submitted_at        | timestamptz |                                 | Submit timestamp      |
| approved_at         | timestamptz |                                 | Approval timestamp    |
| approved_by_user_id | uuid        | REFERENCES users(id)            | Approver ID           |
| rejected_at         | timestamptz |                                 | Rejection timestamp   |
| rejected_by_user_id | uuid        | REFERENCES users(id)            | Rejecter ID           |
| rejection_reason    | text        |                                 | Rejection reason      |
| deleted_at          | timestamptz |                                 | Soft delete timestamp |
| created_at          | timestamptz | DEFAULT now()                   | Creation timestamp    |
| updated_at          | timestamptz | DEFAULT now()                   | Last update           |

### characters_history

Stores character state snapshots (for revert feature).

| Column             | Type        | Constraints               | Description         |
| ------------------ | ----------- | ------------------------- | ------------------- |
| history_id         | uuid        | PRIMARY KEY               | History ID          |
| character_id       | uuid        | REFERENCES characters(id) | Character ID        |
| game_id            | uuid        |                           | Game ID             |
| owner_user_id      | uuid        |                           | Owner user ID       |
| status_id          | smallint    |                           | Status at snapshot  |
| sheet              | jsonb       |                           | Character data      |
| total_experience   | integer     |                           | Total XP            |
| spent_experience   | integer     |                           | Spent XP            |
| version            | integer     |                           | Version at snapshot |
| history_created_at | timestamptz | DEFAULT now()             | Snapshot time       |

### user_game_roles

Links users to games with roles.

| Column  | Type      | Constraints                       | Description           |
| ------- | --------- | --------------------------------- | --------------------- |
| user_id | uuid      | REFERENCES users(id), PRIMARY KEY | User ID               |
| game_id | uuid      | REFERENCES games(id), PRIMARY KEY | Game ID               |
| role    | game_role | NOT NULL                          | PLAYER or STORYTELLER |

### xp_grants

Stores XP grants from Storytellers.

| Column       | Type        | Constraints               | Description     |
| ------------ | ----------- | ------------------------- | --------------- |
| id           | uuid        | PRIMARY KEY               | Grant ID        |
| character_id | uuid        | REFERENCES characters(id) | Character ID    |
| amount       | integer     | NOT NULL                  | XP amount       |
| reason       | text        |                           | Grant reason    |
| granted_by   | uuid        | REFERENCES users(id)      | ST user ID      |
| created_at   | timestamptz | DEFAULT now()             | Grant timestamp |

### xp_spend_logs

Stores XP spending records.

| Column       | Type         | Constraints               | Description        |
| ------------ | ------------ | ------------------------- | ------------------ |
| id           | uuid         | PRIMARY KEY               | Log ID             |
| character_id | uuid         | REFERENCES characters(id) | Character ID       |
| category     | varchar(50)  | NOT NULL                  | Spending category  |
| item_id      | varchar(100) |                           | Item identifier    |
| old_value    | integer      |                           | Previous value     |
| new_value    | integer      |                           | New value          |
| cost         | integer      | NOT NULL                  | XP cost            |
| status       | varchar(20)  | DEFAULT 'PENDING'         | PENDING/APPROVED   |
| approved_by  | uuid         | REFERENCES users(id)      | Approver ID        |
| created_at   | timestamptz  | DEFAULT now()             | Creation timestamp |

### audit_logs

General audit trail for character changes.

| Column       | Type        | Constraints               | Description          |
| ------------ | ----------- | ------------------------- | -------------------- |
| id           | uuid        | PRIMARY KEY               | Log ID               |
| character_id | uuid        | REFERENCES characters(id) | Character ID         |
| action       | varchar(50) | NOT NULL                  | Action type          |
| details      | text        |                           | Change details       |
| user_id      | uuid        | REFERENCES users(id)      | User who made change |
| created_at   | timestamptz | DEFAULT now()             | Action timestamp     |

## Indexes

```sql
-- Character indexes
CREATE INDEX idx_characters_game_id ON characters(game_id);
CREATE INDEX idx_characters_owner_user_id ON characters(owner_user_id);
CREATE INDEX idx_characters_status_id ON characters(status_id);

-- History indexes
CREATE INDEX idx_characters_history_character_id ON characters_history(character_id);
CREATE INDEX idx_characters_history_created_at ON characters_history(history_created_at);

-- XP indexes
CREATE INDEX idx_xp_grants_character_id ON xp_grants(character_id);
CREATE INDEX idx_xp_spend_logs_character_id ON xp_spend_logs(character_id);

-- Audit indexes
CREATE INDEX idx_audit_logs_character_id ON audit_logs(character_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- User-game roles indexes
CREATE INDEX idx_user_game_roles_game_id ON user_game_roles(game_id);
CREATE INDEX idx_user_game_roles_user_id ON user_game_roles(user_id);
```

## Triggers

### characters_history_before_update

Fires before each UPDATE to characters table. Saves the OLD state to characters_history.

### set_updated_at_and_version

Fires before each UPDATE to characters table. Updates `updated_at` timestamp and increments `version`.

### delete_history_on_archive

Fires before each UPDATE to characters table. When status_id changes to 6 (ARCHIVED), deletes all history records for that character.

## Migrations

Migrations are stored in the `migrations/` directory:

- `000_create_schema.sql` - Initial schema
- `001_update_characters_history_status_id.sql` - Add status_id to history
- `002_delete_history_on_archive.sql` - Add archive trigger

Run migrations manually:

```bash
psql -h localhost -U postgres -d vtm_chargen -f migrations/000_create_schema.sql
```
