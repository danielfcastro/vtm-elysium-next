// jest.setup.ts
import { config } from "dotenv";

// Carrega .env.local
config({ path: ".env.local" });

// Defaults caso falte algo no .env
process.env.JWT_SECRET ??= "dev-secret-change-me";
process.env.JWT_EXPIRES_IN ??= "365d";

// Importa o tipo de jest para TS entender (opcional, mas ajuda)
declare const jest: any;

// Registra o mock manual de "jose" (usa __mocks__/jose.ts)
jest.mock("jose");
