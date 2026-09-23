import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

// The root typescript devDependency (6.0.x) is what the type-aware rules
// run on: typescript-eslint doesn't support TypeScript 7 yet, which
// packages/* build with.
export default defineConfig(
  { ignores: ["**/dist/", "**/generated/", "**/node_modules/"] },
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    // supertest types response.body as any, asserting on it is the whole
    // point of an e2e test, not an unsafe use of an untyped value.
    files: ["**/test/**/*.ts", "**/tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
    },
  },
  {
    files: ["**/*.mjs"],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
