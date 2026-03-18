import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "VTM Elysium API",
      version: "2.1.0",
      description: `
## Character Management API

Authentication: All endpoints (except login/register) require a Bearer token in the Authorization header:
\`Authorization: Bearer <token>\`

### Character Status Flow
- DRAFT_PHASE1 → DRAFT_PHASE2 → SUBMITTED → APPROVED → XP
- Characters can be REJECTED at any stage
- Characters can be ARCHIVED after approval

### Available Character Types
- **Vampire**: Full vampire character
- **Human Ghoul**: Human servant of a vampire
- **Revenant Ghoul**: Ghoul from a revenant family  
- **Animal Ghoul**: Ghoul bonded to an animal

### Endpoints Overview
- **Auth**: Login, Register, Profile
- **Characters**: CRUD, Submit, History, Audit
- **XP**: Spend, Grant, History
- **Games**: List, Create, Join
- **Storyteller**: Approve, Reject, Archive, Grant XP
      `,
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        description: "Development server",
      },
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
            email: { type: "string", format: "email" },
            password: { type: "string", format: "password" },
          },
          required: ["email", "password"],
        },
        LoginResponse: {
          type: "object",
          properties: {
            token: { type: "string" },
            user: { type: "object" },
          },
        },
        Character: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            status: { type: "string" },
            sheet: { type: "object", description: "Character sheet data" },
            totalExperience: { type: "number" },
            spentExperience: { type: "number" },
          },
        },
        Game: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            chronicle: { type: "string" },
            description: { type: "string" },
          },
        },
        XpSpend: {
          type: "object",
          properties: {
            changes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  key: { type: "string" },
                  value: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ["./app/api/**/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
