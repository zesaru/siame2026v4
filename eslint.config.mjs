import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      // Override default ignores of eslint-config-next
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
    },
  },
  {
    files: [
      "lib/shared/**/*.ts",
      "components/DocumentUpload.tsx",
      "components/DocumentResults.tsx",
      "components/DocumentHistory.tsx",
      "lib/hooks/useTableSort.ts",
      "lib/hooks/useTablePagination.ts",
      "app/dashboard/documents/DocumentsClient.tsx",
      "app/dashboard/guias-valija/GuiasValijaClient.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];

export default eslintConfig;
