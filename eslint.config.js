import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import securityPlugin from 'eslint-plugin-security';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
      globals: {
        chrome: 'readonly',
        browser: true,
        es2022: true,
        node: true,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      security: securityPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...securityPlugin.configs.recommended.rules,
      
      // TypeScript specific
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      
      // React specific
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      
      // General rules
      'no-console': ['warn', { allow: ['warn', 'error', 'debug'] }],
      'no-unused-vars': 'off', // Use TypeScript version instead
      'prefer-const': 'error',
      'no-var': 'error',
      
      // Security rules
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        node: true,
      },
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '*.min.js',
      'webpack/**',
    ],
  },
];