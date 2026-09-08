import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  // Keep the starter on the flat config export that actually runs under the pinned ESLint/Next toolchain.
  ...nextCoreWebVitals,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    rules: {
      // Interface 100% francophone : les apostrophes typographiques (') et guillemets
      // sont du texte légitime en JSX et n'ont pas besoin d'être échappés.
      "react/no-unescaped-entities": "off"
    }
  }
]);
