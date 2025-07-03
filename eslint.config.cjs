module.exports = [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        chrome: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'warn'
    }
  }
];
