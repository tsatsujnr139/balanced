const { defineConfig } = require("oxlint");
const core = require("ultracite/oxlint/core").default;
const react = require("ultracite/oxlint/react").default;

module.exports = defineConfig({
  extends: [core, react],
  ignorePatterns: [...core.ignorePatterns, "src/uniwind-types.d.ts"],
  rules: {
    complexity: "allow",
    "func-style": "allow",
    "jsx-a11y/prefer-tag-over-role": "allow",
    "no-await-in-loop": "allow",
    "no-negated-condition": "allow",
    "no-nested-ternary": "allow",
    "no-use-before-define": "allow",
    "node/global-require": "allow",
    "promise/prefer-await-to-then": "allow",
    "require-unicode-regexp": "allow",
    "sort-keys": "allow",
    "typescript/no-non-null-assertion": "allow",
    "unicorn/consistent-function-scoping": "allow",
    "unicorn/no-array-sort": "allow",
    "unicorn/no-array-for-each": "allow",
    "unicorn/no-await-expression-member": "allow",
    "unicorn/no-nested-ternary": "allow",
    "unicorn/no-negated-condition": "allow",
    "unicorn/no-useless-spread": "allow",
    "unicorn/numeric-separators-style": "allow",
    "unicorn/prefer-module": "allow",
    "unicorn/prefer-native-coercion-functions": "allow",
    "unicorn/prefer-ternary": "allow",
  },
});
