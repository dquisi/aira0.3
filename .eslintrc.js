module.exports = {
  parser: '@typescript-eslint/parser', // Agrega el parser de TypeScript
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'plugin:@typescript-eslint/recommended'
  ]
};