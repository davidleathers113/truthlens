import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import securityPlugin from 'eslint-plugin-security';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

/**
 * ESLint Flat Config for TruthLens Chrome Extension
 * Migrated from legacy .eslintrc files - maintains original rule severity
 */
export default tseslint.config(
  // Base configurations
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,

  // Global ignores
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

  // Main TypeScript and React files configuration
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
        chrome: 'readonly',
        browser: 'readonly',
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      security: securityPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // Inherit recommended rules
      ...reactPlugin.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      ...securityPlugin.configs.recommended.rules,

      // Original .eslintrc.js rules preserved
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error', 'debug'] }],

      // Additional modern rules
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'error',
      'no-unused-vars': 'off', // Use TypeScript version instead
      'prefer-const': 'error',
      'no-var': 'error',

      // Security rules (kept at warn level to avoid overwhelming output)
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
    },
  },

  // Test files - More lenient rules
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/tests/**/*.ts', 'src/testing/**/*.ts'],
    rules: {
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off'
    }
  },

  // Safe Unicode regex patterns in utilities
  // These patterns use Unicode property escapes which are safe from ReDoS
  // See: docs/unicode-regex-safety-analysis.md
  {
    files: [
      'src/shared/utils/socialTextParser.ts',
      'src/shared/utils/engagementParser.ts'
    ],
    rules: {
      'security/detect-unsafe-regex': 'off',
      'security/detect-non-literal-regexp': 'off'
    }
  },

  // JavaScript files (configuration files, etc.)
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      'no-console': 'off' // Allow console in JS config files
    }
  }
);
