export default [{
  ignores: ["node_modules/**", "coverage/**", "uploads/**"],
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    globals: {
      process: "readonly", console: "readonly", Buffer: "readonly",
      setTimeout: "readonly", clearTimeout: "readonly", URL: "readonly", fetch: "readonly",
    },
  },
  rules: {
    "no-undef": "error",
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
  },
}];
