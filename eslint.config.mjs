import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'build/**',
      'examples/**',
      'coverage/**',
      'babel.config.js',
      'rollup.config.mjs',
      'jest-setup.js',
      'jest-jsdom-env.js',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-nested-ternary': 'error',
      'no-irregular-whitespace': 'error',
      'no-param-reassign': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { vars: 'all', args: 'none' }],
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
);
