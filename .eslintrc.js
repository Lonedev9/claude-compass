module.exports = {
  extends: ['@microsoft/eslint-config-spfx/lib/profiles/default'],
  parserOptions: { tsconfigRootDir: __dirname },
  env: {
    browser: true
  }
};
