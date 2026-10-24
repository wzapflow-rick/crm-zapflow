import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Descartar um campo com `{ campo: _campo, ...resto }` é intencional
      // (ex.: o portal remove o `direcionamento` interno antes de renderizar).
      "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true }],
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "v0_memories/**",
      "user_read_only_context/**",
      "scripts/**/*.sql",
    ],
  },
]

export default config
