import airbnbBase from 'eslint-config-airbnb-base';

export default [
  {
    files: ['*.js', '*.jsx'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
    },
    plugins: ['import'],
    rules: {
      ...airbnbBase.rules,
      'no-console': 'off',
    },
  },
];
