import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypeScript from "eslint-config-next/typescript"

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "tsconfig.tsbuildinfo",
      "components/ui/**", // generated shadcn primitives
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    // This codebase was bootstrapped by v0 and leans on `catch (e: any)` and
    // similar. Keep these as warnings rather than hard errors so lint is
    // adoptable and stays green, while still flagging them for cleanup.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      // Cosmetic (apostrophes in copy) — warn, don't block.
      "react/no-unescaped-entities": "warn",
      // Pre-existing v0 effect patterns; real but need targeted refactors.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]
