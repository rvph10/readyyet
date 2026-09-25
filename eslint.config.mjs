import eslint from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

// The root typescript devDependency (6.0.x) is what the type-aware rules
// run on: typescript-eslint doesn't support TypeScript 7 yet, which
// packages/* build with.
export default defineConfig(
  { ignores: ["**/dist/", "**/generated/", "**/node_modules/", "**/.next/", "**/next-env.d.ts"] },
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        // .railway/railway.ts belongs to no package, the Railway CLI runs it.
        projectService: { allowDefaultProject: [".railway/railway.ts"] },
        tsconfigRootDir: import.meta.dirname,
      },
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
    files: ["web/**/*.{ts,tsx}"],
    extends: [nextPlugin.configs["core-web-vitals"], reactHooks.configs.flat.recommended],
    settings: { next: { rootDir: "web/" } },
  },
  {
    files: ["**/*.mjs"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  // Last, so formatting is left to Prettier alone.
  eslintConfigPrettier,
);
