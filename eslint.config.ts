import js from "@eslint/js";
import ts from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default ts.config(
  js.configs.recommended,
  { ignores: ["node_modules/**", "dist/**", "converage/**"] },
  ...ts.configs.recommended,
  prettier,
);
