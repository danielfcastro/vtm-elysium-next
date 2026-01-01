/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",

  testMatch: [
    "<rootDir>/tests/**/*.spec.ts",
    "<rootDir>/__tests__/**/*.test.ts",
  ],

  moduleNameMapper: {
    "^@/app/(.*)$": "<rootDir>/app/$1",
    "^@/lib/(.*)$": "<rootDir>/src/lib/$1",
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // Carrega .env.local e registra o mock de jose
  setupFiles: ["<rootDir>/jest.setup.ts"],
};
