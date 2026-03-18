import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "VTM Elysium API",
      version: "2.1.0",
      description: `
## VTM Elysium — Character Management API

All endpoints (except \`/api/login\` and \`/api/register\`) require a Bearer token in the \`Authorization\` header.

\`\`\`
Authorization: Bearer <token>
\`\`\`

---

### 🧛 Character Status Flow

\`\`\`
DRAFT_PHASE1 → DRAFT_PHASE2 → SUBMITTED → APPROVED → XP
                                              ↓
                                          REJECTED  →  back to draft
                                              ↓
                                          ARCHIVED
\`\`\`

### 🎭 Character Types
- **Vampire** – Full vampire character
- **Human Ghoul** – Human servant of a vampire
- **Revenant Ghoul** – Ghoul from a revenant family
- **Animal Ghoul** – Ghoul bonded to an animal

### 📋 Tags Overview
| Tag | Description |
|-----|-------------|
| **Authentication** | Login, Register, Profile management |
| **Characters** | CRUD operations on characters |
| **Character XP** | XP spend, grant, history (player-scoped) |
| **Storyteller – Characters** | Approve, reject, archive, revert characters |
| **Storyteller – XP** | Grant and approve XP (ST-scoped) |
| **Storyteller – Games** | Manage chronicles and player rosters |
| **Games** | List and create games (player-scoped) |
| **Utilities** | Character sheet generation |
      `,
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        description: "Development server",
      },
    ],
    tags: [
      { name: "Authentication", description: "Login, register, profile" },
      { name: "Games", description: "Player-facing game endpoints" },
      { name: "Characters", description: "Character CRUD and lifecycle" },
      {
        name: "Character XP",
        description: "XP management (player-scoped)",
      },
      {
        name: "Storyteller – Characters",
        description: "ST actions on characters",
      },
      {
        name: "Storyteller – XP",
        description: "ST XP grant and spend approval",
      },
      {
        name: "Storyteller – Games",
        description: "ST chronicle and roster management",
      },
      { name: "Utilities", description: "Generator and helper endpoints" },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token obtained from /api/login",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
          required: ["error"],
        },
        LoginRequest: {
          type: "object",
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "player@vtm.com",
            },
            password: {
              type: "string",
              format: "password",
              example: "secret123",
            },
          },
          required: ["email", "password"],
        },
        RegisterRequest: {
          type: "object",
          properties: {
            name: { type: "string", example: "Dracula" },
            email: {
              type: "string",
              format: "email",
              example: "dracula@vtm.com",
            },
            password: {
              type: "string",
              format: "password",
              example: "secret123",
            },
            confirmPassword: {
              type: "string",
              format: "password",
              example: "secret123",
            },
          },
          required: ["name", "email", "password", "confirmPassword"],
        },
        AuthResponse: {
          type: "object",
          properties: {
            token: { type: "string", description: "JWT Bearer token" },
            user: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                email: { type: "string" },
                name: { type: "string" },
              },
            },
          },
        },
        UserProfile: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string" },
            name: { type: "string" },
            is_active: { type: "boolean" },
            isStoryteller: { type: "boolean" },
          },
        },
        Character: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            gameId: { type: "string", format: "uuid" },
            ownerUserId: { type: "string", format: "uuid" },
            status: {
              type: "string",
              enum: [
                "DRAFT_PHASE1",
                "DRAFT_PHASE2",
                "SUBMITTED",
                "APPROVED",
                "REJECTED",
                "ARCHIVED",
                "XP",
              ],
            },
            sheet: { type: "object", description: "Full character sheet JSON" },
            totalExperience: { type: "integer" },
            spentExperience: { type: "integer" },
            version: { type: "integer" },
            submittedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            approvedAt: { type: "string", format: "date-time", nullable: true },
            rejectedAt: { type: "string", format: "date-time", nullable: true },
            rejectionReason: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Game: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Elysium de São Paulo" },
            description: { type: "string", nullable: true },
            storytellerId: { type: "string", format: "uuid" },
            allowBackgroundXpPurchase: { type: "boolean" },
            allowMeritFlawsXpPurchase: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        SpendItem: {
          type: "object",
          description: "A single XP spend request",
          properties: {
            type: {
              type: "string",
              enum: [
                "attribute",
                "ability",
                "discipline",
                "background",
                "virtue",
                "willpower",
                "road",
                "combo",
              ],
            },
            key: { type: "string", example: "strength" },
            from: { type: "integer", example: 2 },
            to: { type: "integer", example: 3 },
          },
          required: ["type", "key", "from", "to"],
        },
        XpTotals: {
          type: "object",
          properties: {
            granted: { type: "integer" },
            spent: { type: "integer" },
            remaining: { type: "integer" },
          },
        },
        AuditLogItem: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            characterId: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            actionTypeId: { type: "integer" },
            actionType: { type: "string" },
            payload: { type: "object" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        HistoryItem: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            characterId: { type: "string", format: "uuid" },
            status: { type: "string" },
            sheet: { type: "object" },
            version: { type: "integer" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Player: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            email: { type: "string" },
            role: { type: "string", enum: ["PLAYER", "STORYTELLER"] },
            character: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string" },
                statusId: { type: "integer" },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    paths: {
      // ──────────────────────────────────────────────
      // AUTHENTICATION
      // ──────────────────────────────────────────────
      "/api/login": {
        post: {
          tags: ["Authentication"],
          summary: "User login",
          description:
            "Authenticate with email and password to receive a JWT token.",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Login successful",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuthResponse" },
                },
              },
            },
            400: { description: "Missing email or password" },
            401: { description: "Invalid credentials" },
            403: { description: "Account disabled" },
          },
        },
      },
      "/api/register": {
        post: {
          tags: ["Authentication"],
          summary: "Register new user",
          description:
            "Create a new account and receive a JWT token immediately.",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterRequest" },
              },
            },
          },
          responses: {
            201: {
              description: "Account created",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuthResponse" },
                },
              },
            },
            400: { description: "Validation error" },
            409: { description: "Email already in use" },
          },
        },
      },
      "/api/me": {
        get: {
          tags: ["Authentication"],
          summary: "Get current user",
          description:
            "Returns the authenticated user's profile including their storyteller role status.",
          security: [{ BearerAuth: [] }],
          responses: {
            200: {
              description: "User profile",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/UserProfile" },
                },
              },
            },
            401: { description: "Unauthorized" },
            404: { description: "User not found" },
          },
        },
      },
      "/api/profile": {
        patch: {
          tags: ["Authentication"],
          summary: "Update profile",
          description:
            "Update the authenticated user's name, email, and/or password.",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string", example: "New Name" },
                    email: {
                      type: "string",
                      format: "email",
                      example: "new@vtm.com",
                    },
                    currentPassword: {
                      type: "string",
                      format: "password",
                      description: "Required when changing password",
                    },
                    newPassword: { type: "string", format: "password" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Profile updated" },
            400: {
              description: "Validation error or missing current password",
            },
            401: { description: "Current password incorrect" },
            409: { description: "Email already in use" },
          },
        },
      },

      // ──────────────────────────────────────────────
      // GAMES (Player-facing)
      // ──────────────────────────────────────────────
      "/api/games": {
        get: {
          tags: ["Games"],
          summary: "List all games",
          description:
            "Returns all available games (chronicles) in the system.",
          security: [{ BearerAuth: [] }],
          responses: {
            200: {
              description: "List of games",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      games: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Game" },
                      },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
          },
        },
        post: {
          tags: ["Games"],
          summary: "Create a new game",
          description:
            "Creates a new chronicle. The creator is automatically assigned the STORYTELLER role.",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string", example: "Elysium São Paulo" },
                    description: {
                      type: "string",
                      nullable: true,
                      example: "Crônica ambientada em SP",
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Game created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { game: { $ref: "#/components/schemas/Game" } },
                  },
                },
              },
            },
            400: { description: "Name is required" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/games/{gameId}/characters": {
        post: {
          tags: ["Games"],
          summary: "Create character in game",
          description:
            "Creates a blank DRAFT_PHASE1 character for the authenticated user in the specified game.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "gameId",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            201: {
              description: "Character created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      character: { $ref: "#/components/schemas/Character" },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/games/{gameId}/characters/me": {
        get: {
          tags: ["Games"],
          summary: "My characters in a game",
          description:
            "Returns all non-archived characters owned by the authenticated user in a specific game.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "gameId",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: {
              description: "Character list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      items: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Character" },
                      },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
          },
        },
      },

      // ──────────────────────────────────────────────
      // CHARACTERS
      // ──────────────────────────────────────────────
      "/api/characters/{id}": {
        get: {
          tags: ["Characters"],
          summary: "Get character by ID",
          description:
            "Returns a character by ID. Only accessible by the character owner or the game's storyteller.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: {
              description: "Character found",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      character: { $ref: "#/components/schemas/Character" },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            404: { description: "Character not found" },
          },
        },
        put: {
          tags: ["Characters"],
          summary: "Update character sheet",
          description:
            "Replaces the full character sheet. Only allowed when status is DRAFT_PHASE1, DRAFT_PHASE2, or REJECTED. The new status is derived from `sheet.phase`.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["sheet"],
                  properties: {
                    sheet: {
                      type: "object",
                      description:
                        "Full sheet JSON. Must include `phase` (1 or 2).",
                    },
                    status: {
                      type: "string",
                      enum: ["DRAFT_PHASE1", "DRAFT_PHASE2"],
                      description: "Optional status override",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Character updated" },
            400: { description: "Invalid body or sheet.phase" },
            403: { description: "Forbidden" },
            404: { description: "Character not found" },
            409: { description: "Character not editable in current status" },
          },
        },
        delete: {
          tags: ["Characters"],
          summary: "Delete (soft) character",
          description:
            "Soft-deletes a character. Only allowed for characters in DRAFT_PHASE1, DRAFT_PHASE2, or REJECTED status.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: { description: "Character deleted" },
            403: { description: "Forbidden" },
            404: { description: "Character not found" },
            409: {
              description: "Character is not deletable in current status",
            },
          },
        },
      },
      "/api/characters/{id}/sheet-merge": {
        patch: {
          tags: ["Characters"],
          summary: "Patch (merge) character sheet",
          description:
            "Merges a partial JSON patch into the character sheet at the root level. Only allowed when status is editable (DRAFT_*).",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["patch"],
                  properties: {
                    patch: {
                      type: "object",
                      description: "Partial sheet fields to merge",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Sheet merged" },
            400: { description: "Invalid body" },
            403: { description: "Forbidden" },
            404: { description: "Character not found" },
            409: { description: "Not editable" },
          },
        },
      },
      "/api/characters/{id}/submit": {
        post: {
          tags: ["Characters"],
          summary: "Submit character for review",
          description:
            "Transitions character from DRAFT_PHASE1, DRAFT_PHASE2, or REJECTED to SUBMITTED.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: { description: "Character submitted" },
            403: { description: "Forbidden" },
            404: { description: "Character not found" },
            409: { description: "Cannot submit in current status" },
          },
        },
      },
      "/api/characters/{id}/history": {
        get: {
          tags: ["Characters"],
          summary: "Character version history",
          description: "Returns paginated version snapshots of the character.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              in: "query",
              name: "limit",
              schema: {
                type: "integer",
                default: 50,
                minimum: 1,
                maximum: 200,
              },
            },
            {
              in: "query",
              name: "offset",
              schema: { type: "integer", default: 0 },
            },
          ],
          responses: {
            200: {
              description: "History entries",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      characterId: { type: "string" },
                      limit: { type: "integer" },
                      offset: { type: "integer" },
                      items: {
                        type: "array",
                        items: { $ref: "#/components/schemas/HistoryItem" },
                      },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            404: { description: "Character not found" },
          },
        },
      },
      "/api/characters/{id}/audit": {
        get: {
          tags: ["Characters"],
          summary: "Character audit trail",
          description:
            "Returns paginated audit log entries. Supports filter by actionType and date range.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", default: 50 },
            },
            {
              in: "query",
              name: "offset",
              schema: { type: "integer", default: 0 },
            },
            {
              in: "query",
              name: "actionType",
              schema: { type: "integer" },
              description: "Filter by action_type_id",
            },
            {
              in: "query",
              name: "dateFrom",
              schema: { type: "string", format: "date" },
            },
            {
              in: "query",
              name: "dateTo",
              schema: { type: "string", format: "date" },
            },
          ],
          responses: {
            200: {
              description: "Audit log entries",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      characterId: { type: "string" },
                      limit: { type: "integer" },
                      offset: { type: "integer" },
                      total: { type: "integer" },
                      totalPages: { type: "integer" },
                      hasNext: { type: "boolean" },
                      hasPrev: { type: "boolean" },
                      items: {
                        type: "array",
                        items: { $ref: "#/components/schemas/AuditLogItem" },
                      },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            404: { description: "Character not found" },
          },
        },
        post: {
          tags: ["Characters"],
          summary: "Add audit entry",
          description: "Adds a manual audit log entry to the character.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["actionType"],
                  properties: {
                    actionType: {
                      type: "string",
                      example: "STARTING_POINTS",
                      description:
                        "One of: STARTING_POINTS, FREEBIE, SPECIALTY, MERIT_FLAW",
                    },
                    payload: { type: "object" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Audit entry created" },
            400: { description: "Invalid body" },
            401: { description: "Unauthorized" },
            404: { description: "Character not found" },
          },
        },
      },

      // ──────────────────────────────────────────────
      // CHARACTER XP
      // ──────────────────────────────────────────────
      "/api/characters/{id}/xp": {
        get: {
          tags: ["Character XP"],
          summary: "Get XP totals",
          description:
            "Returns the granted, spent, and remaining XP for a character.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: {
              description: "XP totals",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      characterId: { type: "string" },
                      totals: { $ref: "#/components/schemas/XpTotals" },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden" },
            404: { description: "Character not found" },
          },
        },
      },
      "/api/characters/{id}/xp/grant": {
        post: {
          tags: ["Character XP"],
          summary: "Grant XP (player route)",
          description:
            "Grants XP to a character. Requires STORYTELLER or ADMIN role in the game.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["amount"],
                  properties: {
                    amount: {
                      type: "integer",
                      minimum: 1,
                      example: 3,
                      description: "XP amount to grant",
                    },
                    sessionDate: {
                      type: "string",
                      format: "date",
                      example: "2025-01-10",
                    },
                    note: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "XP granted" },
            400: { description: "Invalid amount" },
            403: { description: "Forbidden – not a storyteller" },
            404: { description: "Character not found" },
          },
        },
      },
      "/api/characters/{id}/xp/spend": {
        post: {
          tags: ["Character XP"],
          summary: "Spend XP (immediate)",
          description:
            "Immediately applies XP spends to the character sheet. Character must be APPROVED or XP status. Each spend must increase by exactly 1 level.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["spends"],
                  properties: {
                    spends: {
                      type: "array",
                      items: { $ref: "#/components/schemas/SpendItem" },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "XP spent and applied" },
            403: { description: "Forbidden" },
            404: { description: "Character not found" },
            409: { description: "Character not in APPROVED or XP status" },
            422: { description: "Insufficient XP or invalid spend" },
          },
        },
      },
      "/api/characters/{id}/xp/spend-draft": {
        get: {
          tags: ["Character XP"],
          summary: "Get pending XP spends",
          description:
            "Returns all pending (draft) XP spend requests for a character.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: {
              description: "Pending spends",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      pendingSpends: {
                        type: "array",
                        items: { type: "object" },
                      },
                      totalPendingXp: { type: "integer" },
                      xp: { $ref: "#/components/schemas/XpTotals" },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Character XP"],
          summary: "Create draft XP spend",
          description:
            "Creates a pending XP spend request for storyteller approval. Replaces any existing pending spend.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["spends"],
                  properties: {
                    spends: {
                      type: "array",
                      items: { $ref: "#/components/schemas/SpendItem" },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Pending spend created" },
            409: { description: "Character not in APPROVED or XP status" },
            422: { description: "Insufficient XP or invalid spend body" },
          },
        },
        delete: {
          tags: ["Character XP"],
          summary: "Cancel pending XP spend",
          description: "Removes all pending XP spend requests for a character.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: {
              description: "Pending spend deleted",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { deleted: { type: "integer" } },
                  },
                },
              },
            },
            403: { description: "Forbidden" },
            404: { description: "Character not found" },
          },
        },
      },
      "/api/characters/{id}/xp/approve": {
        post: {
          tags: ["Character XP"],
          summary: "Approve pending XP spends (player)",
          description:
            "Owner approves all pending XP spend requests, applying them to the sheet.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: { description: "XP spends approved and applied" },
            400: { description: "No pending spends to approve" },
            403: { description: "Forbidden" },
            404: { description: "Character not found" },
          },
        },
      },
      "/api/characters/{id}/xp/history": {
        get: {
          tags: ["Character XP"],
          summary: "XP history (grants + spends)",
          description:
            "Returns a unified paginated list of GRANT and SPEND events for a character, ordered by date descending.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", default: 50 },
            },
            {
              in: "query",
              name: "offset",
              schema: { type: "integer", default: 0 },
            },
          ],
          responses: {
            200: {
              description: "XP history",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      characterId: { type: "string" },
                      limit: { type: "integer" },
                      offset: { type: "integer" },
                      items: { type: "array", items: { type: "object" } },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden" },
            404: { description: "Character not found" },
          },
        },
      },
      "/api/characters/{id}/xp/start": {
        post: {
          tags: ["Character XP"],
          summary: "Start XP mode",
          description:
            "Transitions an APPROVED character to XP status, enabling XP spending.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: {
              description: "Status changed to XP",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      status: { type: "string", example: "XP" },
                    },
                  },
                },
              },
            },
            403: { description: "Forbidden" },
            404: { description: "Character not found" },
            409: { description: "Character is not APPROVED" },
          },
        },
      },

      // ──────────────────────────────────────────────
      // STORYTELLER – CHARACTERS
      // ──────────────────────────────────────────────
      "/api/storyteller/characters": {
        get: {
          tags: ["Storyteller – Characters"],
          summary: "List all characters in a game",
          description:
            "Returns all non-deleted characters in the specified game. Requires STORYTELLER role.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "query",
              name: "gameId",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: {
              description: "Character list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      items: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Character" },
                      },
                    },
                  },
                },
              },
            },
            400: { description: "Missing gameId" },
            403: { description: "Forbidden – not a storyteller" },
          },
        },
      },
      "/api/storyteller/characters/{id}/approve": {
        patch: {
          tags: ["Storyteller – Characters"],
          summary: "Approve character",
          description:
            "Approves a SUBMITTED character. Requires STORYTELLER role in the game.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: { description: "Character approved" },
            403: { description: "Forbidden" },
            404: { description: "Character not found" },
            409: { description: "Character is not SUBMITTED" },
          },
        },
      },
      "/api/storyteller/characters/{id}/reject": {
        patch: {
          tags: ["Storyteller – Characters"],
          summary: "Reject character",
          description:
            "Rejects a SUBMITTED character with an optional reason. Requires STORYTELLER role.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    reason: {
                      type: "string",
                      nullable: true,
                      example: "Attributes over limit",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Character rejected" },
            403: { description: "Forbidden" },
            404: { description: "Character not found" },
            409: { description: "Character is not SUBMITTED" },
          },
        },
      },
      "/api/storyteller/characters/{id}/archive": {
        post: {
          tags: ["Storyteller – Characters"],
          summary: "Archive character",
          description:
            "Archives a character, setting it to ARCHIVED status. Requires STORYTELLER role.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: { description: "Character archived" },
            403: { description: "Forbidden" },
            404: { description: "Character not found" },
          },
        },
        delete: {
          tags: ["Storyteller – Characters"],
          summary: "Unarchive character",
          description:
            "Restores an ARCHIVED character to its previous status. Requires STORYTELLER role.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: { description: "Character unarchived" },
            400: { description: "Character is not archived" },
            403: { description: "Forbidden" },
            404: { description: "Character not found" },
          },
        },
      },
      "/api/storyteller/characters/{id}/delete": {
        delete: {
          tags: ["Storyteller – Characters"],
          summary: "Permanently delete character",
          description:
            "Soft-deletes a character (sets deleted_at). Cascades to XP grants, spend logs, history, and audit logs. Requires STORYTELLER role.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: { description: "Character permanently deleted" },
            400: { description: "Character already deleted" },
            403: { description: "Forbidden" },
            404: { description: "Character not found" },
          },
        },
      },
      "/api/storyteller/characters/{id}/move": {
        put: {
          tags: ["Storyteller – Characters"],
          summary: "Move character to another game",
          description:
            "Transfers a character from one game to another. Requires STORYTELLER role in both games.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["targetGameId"],
                  properties: {
                    targetGameId: {
                      type: "string",
                      format: "uuid",
                      description: "ID of the destination game",
                    },
                    keepStatus: {
                      type: "boolean",
                      default: false,
                      description:
                        "If true, preserves current status; otherwise resets to DRAFT_PHASE1",
                    },
                    reason: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Character moved" },
            403: { description: "Forbidden" },
            404: { description: "Character or target game not found" },
            409: {
              description:
                "Already in target game or target game has existing character for this owner",
            },
            422: { description: "Missing targetGameId" },
          },
        },
      },
      "/api/storyteller/characters/{id}/revert": {
        post: {
          tags: ["Storyteller – Characters"],
          summary: "Revert character to history snapshot",
          description:
            "Reverts a character's full state to a previous version snapshot. Requires STORYTELLER or ADMIN role.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    historyId: {
                      type: "string",
                      format: "uuid",
                      description: "Snapshot ID from characters_history",
                    },
                    version: {
                      type: "integer",
                      description:
                        "Version number to revert to (alternative to historyId)",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Character reverted" },
            403: { description: "Forbidden" },
            404: { description: "Character or history snapshot not found" },
            422: { description: "historyId or version is required" },
          },
        },
      },

      // ──────────────────────────────────────────────
      // STORYTELLER – XP
      // ──────────────────────────────────────────────
      "/api/storyteller/characters/{id}/xp/grant": {
        post: {
          tags: ["Storyteller – XP"],
          summary: "Grant XP to character (ST)",
          description:
            "Grants XP from a storyteller perspective. Updates character XP totals from the ledger.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["amount"],
                  properties: {
                    amount: { type: "integer", minimum: 1, example: 3 },
                    sessionDate: { type: "string", format: "date" },
                    note: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "XP granted",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      grantId: { type: "string" },
                      characterId: { type: "string" },
                      totals: { $ref: "#/components/schemas/XpTotals" },
                    },
                  },
                },
              },
            },
            403: { description: "Forbidden" },
            404: { description: "Character not found" },
            422: { description: "Invalid amount" },
          },
        },
      },
      "/api/storyteller/characters/{id}/xp/approve": {
        post: {
          tags: ["Storyteller – XP"],
          summary: "Approve pending XP spends (ST)",
          description:
            "Storyteller approves all pending XP spends, applying them to the character sheet and updating XP totals.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: {
              description: "XP spends approved",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      approved: { type: "integer" },
                      granted: { type: "integer" },
                      spent: { type: "integer" },
                      remaining: { type: "integer" },
                      sheet: { type: "object" },
                    },
                  },
                },
              },
            },
            400: { description: "No pending spends" },
            403: { description: "Forbidden" },
            404: { description: "Character not found" },
          },
        },
      },

      // ──────────────────────────────────────────────
      // STORYTELLER – GAMES
      // ──────────────────────────────────────────────
      "/api/storyteller/games": {
        get: {
          tags: ["Storyteller – Games"],
          summary: "List ST's games",
          description:
            "Returns all games where the authenticated user has the STORYTELLER role.",
          security: [{ BearerAuth: [] }],
          responses: {
            200: {
              description: "Games list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      games: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Game" },
                      },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
          },
        },
        post: {
          tags: ["Storyteller – Games"],
          summary: "Create game (ST route)",
          description:
            "Creates a new chronicle and assigns the creator as STORYTELLER.",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string" },
                    description: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Game created" },
            400: { description: "Name is required" },
          },
        },
      },
      "/api/storyteller/games/{gameId}": {
        get: {
          tags: ["Storyteller – Games"],
          summary: "Get game details (ST)",
          description:
            "Returns detailed information about a specific game for a storyteller.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "gameId",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: {
              description: "Game details",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { game: { $ref: "#/components/schemas/Game" } },
                  },
                },
              },
            },
            403: { description: "Forbidden" },
            404: { description: "Game not found" },
          },
        },
      },
      "/api/storyteller/games/{gameId}/characters": {
        get: {
          tags: ["Storyteller – Games"],
          summary: "List characters in a game (ST)",
          description:
            "Returns all non-deleted characters in a game. Supports optional status filter.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "gameId",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              in: "query",
              name: "status",
              schema: {
                type: "string",
                enum: [
                  "DRAFT_PHASE1",
                  "DRAFT_PHASE2",
                  "SUBMITTED",
                  "APPROVED",
                  "REJECTED",
                  "ARCHIVED",
                  "XP",
                ],
              },
            },
          ],
          responses: {
            200: {
              description: "Characters list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      characters: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Character" },
                      },
                    },
                  },
                },
              },
            },
            403: { description: "Forbidden" },
          },
        },
      },
      "/api/storyteller/games/{gameId}/players": {
        get: {
          tags: ["Storyteller – Games"],
          summary: "List players in a game",
          description:
            "Returns all players (users with PLAYER role) in a game along with their character.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "gameId",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: {
              description: "Players list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      players: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Player" },
                      },
                    },
                  },
                },
              },
            },
            403: { description: "Forbidden" },
          },
        },
        post: {
          tags: ["Storyteller – Games"],
          summary: "Create player account",
          description:
            "Creates a new user account and assigns them as a PLAYER in the game. If password is omitted, one is auto-generated and returned.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "gameId",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "email"],
                  properties: {
                    name: { type: "string", example: "Player One" },
                    email: {
                      type: "string",
                      format: "email",
                      example: "player@vtm.com",
                    },
                    password: {
                      type: "string",
                      description:
                        "If omitted, a random password is generated and returned in `generatedPassword`",
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Player created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      player: { $ref: "#/components/schemas/Player" },
                    },
                  },
                },
              },
            },
            400: { description: "Validation error" },
            403: { description: "Forbidden" },
            409: { description: "Email already registered" },
          },
        },
      },
      "/api/storyteller/games/{gameId}/players/{playerId}": {
        delete: {
          tags: ["Storyteller – Games"],
          summary: "Remove player from game",
          description:
            "Revokes a player's PLAYER role from the game. Does not delete the user account.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "gameId",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              in: "path",
              name: "playerId",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: { description: "Player removed from game" },
            400: { description: "Missing gameId or playerId" },
            403: { description: "Forbidden" },
          },
        },
      },
      "/api/storyteller/games/{gameId}/settings": {
        get: {
          tags: ["Storyteller – Games"],
          summary: "Get game settings",
          description:
            "Returns settings for a game (e.g., XP purchase rules). Only accessible by the storyteller.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "gameId",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: {
              description: "Game settings",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { game: { $ref: "#/components/schemas/Game" } },
                  },
                },
              },
            },
            403: { description: "Forbidden – not the storyteller" },
          },
        },
        patch: {
          tags: ["Storyteller – Games"],
          summary: "Update game settings",
          description:
            "Updates XP purchase policy flags for a game. Only the storyteller can modify settings.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "gameId",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    allowBackgroundXpPurchase: { type: "boolean" },
                    allowMeritFlawsXpPurchase: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Settings updated" },
            403: { description: "Forbidden" },
          },
        },
      },

      // ──────────────────────────────────────────────
      // UTILITIES
      // ──────────────────────────────────────────────
      "/api/characters/generate": {
        post: {
          tags: ["Utilities"],
          summary: "Generate random character",
          description:
            "Generates a complete random character sheet using the VTM rules engine. Optionally seed for reproducible results.",
          security: [],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    seed: {
                      type: "string",
                      description:
                        "Seed string for reproducible generation. Defaults to current timestamp.",
                      example: "my-seed-42",
                    },
                    concept: { type: "string", nullable: true },
                    clan: { type: "string", nullable: true, example: "Brujah" },
                    nature: { type: "string", nullable: true },
                    demeanor: { type: "string", nullable: true },
                    name: { type: "string", nullable: true },
                    generation: { type: "integer", nullable: true },
                    age: { type: "integer", nullable: true },
                    ageCategory: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Generated character",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      seed: { type: "string" },
                      character: {
                        type: "object",
                        description: "Full generated character sheet",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
