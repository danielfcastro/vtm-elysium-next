# API Reference

## Authentication

All protected endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <jwt-token>
```

## Endpoints

---

### Authentication

#### POST `/api/login`

Login with email and password.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### POST `/api/register`

Register a new user.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### GET `/api/me`

Get current user info.

**Response:**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe"
}
```

---

### Games

#### GET `/api/games`

List games the user participates in.

**Response:**

```json
{
  "games": [
    {
      "id": "uuid",
      "name": "Chronicle Name",
      "description": "Description",
      "storytellerId": "uuid"
    }
  ]
}
```

#### POST `/api/games`

Create a new game (Storyteller only).

**Request Body:**

```json
{
  "name": "Chronicle Name",
  "description": "Description"
}
```

#### GET `/api/storyteller/games`

List all games (Storyteller only).

#### GET `/api/storyteller/games/:gameId/players`

Get players in a game (Storyteller only).

**Response:**

```json
{
  "players": [
    {
      "id": "uuid",
      "name": "Player Name",
      "email": "player@example.com",
      "role": "PLAYER",
      "character": {
        "id": "uuid",
        "name": "Character Name",
        "statusId": 4
      }
    }
  ]
}
```

---

### Characters

#### GET `/api/characters/:id`

Get character sheet.

**Response:**

```json
{
  "character": {
    "id": "uuid",
    "gameId": "uuid",
    "ownerUserId": "uuid",
    "status": "APPROVED",
    "statusId": 4,
    "sheet": { ... },
    "totalExperience": 0,
    "spentExperience": 0,
    "version": 1,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### PUT `/api/characters/:id`

Update character (owner only, must be in DRAFT status).

**Request Body:**

```json
{
  "sheet": { ... }
}
```

#### POST `/api/characters/generate`

Generate a new character from seed.

**Request Body:**

```json
{
  "seed": "12345"
}
```

**Response:**

```json
{
  "character": {
    "id": "uuid",
    "sheet": { ... }
  }
}
```

#### POST `/api/characters/:id/submit`

Submit character for approval.

#### DELETE `/api/characters/:id`

Soft delete character (owner only, must be in DRAFT status).

---

### XP Management

#### GET `/api/characters/:id/xp`

Get XP status and spending history.

**Response:**

```json
{
  "totalExperience": 100,
  "spentExperience": 50,
  "remainingExperience": 50,
  "spendDraft": [],
  "xpHistory": []
}
```

#### POST `/api/characters/:id/xp/start`

Start XP spending mode.

#### POST `/api/characters/:id/xp/spend`

Spend XP points.

**Request Body:**

```json
{
  "category": "attributes",
  "itemId": "strength",
  "currentValue": 2,
  "newValue": 3,
  "cost": 4
}
```

#### POST `/api/characters/:id/xp/spend-draft`

Save XP spending draft.

#### GET `/api/characters/:id/xp/history`

Get XP spending history.

---

### Storyteller: Character Management

#### POST `/api/storyteller/characters/:id/approve`

Approve a character.

#### POST `/api/storyteller/characters/:id/reject`

Reject a character.

**Request Body:**

```json
{
  "reason": "Please fix the backstory"
}
```

#### POST `/api/storyteller/characters/:id/archive`

Archive a character (sets status_id = 6).

#### DELETE `/api/storyteller/characters/:id/archive`

Unarchive a character (restores previous status).

#### DELETE `/api/storyteller/characters/:id/delete`

Permanently delete a character (soft delete).

#### POST `/api/storyteller/characters/:id/revert`

Revert character to a previous state.

**Request Body:**

```json
{
  "historyId": "uuid"
}
```

#### POST `/api/storyteller/characters/:id/move`

Move character to another game.

**Request Body:**

```json
{
  "targetGameId": "uuid"
}
```

---

### Storyteller: XP Management

#### POST `/api/storyteller/characters/:id/xp/grant`

Grant XP to a character.

**Request Body:**

```json
{
  "amount": 10,
  "reason": "Good roleplaying"
}
```

#### POST `/api/storyteller/characters/:id/xp/approve`

Approve pending XP spending.

#### POST `/api/storyteller/characters/:id/xp/approve`

Approve all pending XP for a character.

---

### Audit & History

#### GET `/api/characters/:id/audit`

Get character audit trail.

**Query Parameters:**

- `limit`: Number of records (default: 20)
- `offset`: Offset for pagination

**Response:**

```json
{
  "items": [
    {
      "id": "uuid",
      "action": "UPDATE",
      "details": "Changed strength from 2 to 3",
      "userId": "uuid",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### GET `/api/characters/:id/history`

Get character history (snapshots).

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message"
}
```

Common status codes:

- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error
