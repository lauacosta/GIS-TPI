import js from "@eslint/js";
import globals from "globals";
import unicorn from "eslint-plugin-unicorn";
import sonarjs from "eslint-plugin-sonarjs";
import promise from "eslint-plugin-promise";
import eslintComments from "eslint-plugin-eslint-comments";
import importPlugin from "eslint-plugin-import";
import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
});

export default [
    js.configs.recommended,
    ...compat.extends("plugin:promise/recommended"),
    ...compat.extends("plugin:eslint-comments/recommended"),
    ...compat.extends("plugin:import/recommended"),
    {
        files: ["**/*.{js,mjs,cjs}"],
        languageOptions: {
            globals: globals.browser,
            ecmaVersion: 2022,
            sourceType: "module",
        },
        plugins: {
            unicorn,
            sonarjs,
        },
        rules: {
            ...unicorn.configs.recommended.rules,
            ...sonarjs.configs.recommended.rules,
            "no-restricted-syntax": [
                "error",
                {
                    selector: "CallExpression[callee.property.name='addEventListener']",
                    message:
                        "Wrap event listeners in stable function references, never inline functions. Inline handlers break removal and leak memory.",
                },
            ],
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "unicorn/consistent-function-scoping": "error",
            "unicorn/no-array-callback-reference": "warn",
            "unicorn/no-unused-properties": "warn",
            "sonarjs/no-identical-functions": "error",
            "sonarjs/no-duplicate-string": "warn",
            "sonarjs/no-unused-collection": "warn",
            "promise/no-nesting": "warn",
            "promise/no-promise-in-callback": "warn",
            "import/no-cycle": "error",
            "import/no-unresolved": "error",
            "eslint-comments/no-unused-disable": "error",
        },
    },
];
