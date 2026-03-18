import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        console: "readonly",
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["**/*.cjs", "**/*.config.js", "postcss*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["**/*.spec.{ts,tsx}", "**/*.test.{ts,tsx}", "tests/**"],
    languageOptions: {
      globals: {
        test: "readonly",
        expect: "readonly",
        describe: "readonly",
        it: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "__disabled__/**",
    ],
  },
];
