import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import pluginUnusedImports from "eslint-plugin-unused-imports";

export default [
  // Frontend (tylko src/)
  {
    files: ["src/**/*.{js,mjs,cjs,jsx}"],
    plugins: { react: pluginReact, "unused-imports": pluginUnusedImports },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...pluginReact.configs.recommended.rules,
      "no-unused-vars": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-console": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "(^_|^e$|^err$)",
          args: "after-used",
          argsIgnorePattern: "(^_|^e$|^err$)",
        },
      ],
      "prefer-const": "error",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },

  // Backend (server/)
  {
    files: ["server/**/*.{js,mjs,cjs}"],
    plugins: { "unused-imports": pluginUnusedImports },
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-console": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "(^_|^e$|^err$)",
          args: "after-used",
          argsIgnorePattern: "(^_|^e$|^err$)",
        },
      ],
      "prefer-const": "error",
    },
  },
];
