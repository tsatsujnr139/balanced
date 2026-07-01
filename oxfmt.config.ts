const { defineConfig } = require("oxfmt");
const ultracite = require("ultracite/oxfmt").default;

module.exports = defineConfig({
  ...ultracite,
  ignorePatterns: ["src/uniwind-types.d.ts", "convex/_generated/**/*"],
});
