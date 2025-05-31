// ESLint Security Configuration - 2025 Best Practices
// Configured for SARIF output and comprehensive security scanning

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    },
    project: './tsconfig.json'
  },
  env: {
    browser: true,
    es2024: true,
    node: true,
    webextensions: true
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:security/recommended-legacy', // Use legacy config for compatibility
    'prettier'
  ],
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'security'
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    // Security-focused rules for 2025
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-non-literal-require': 'error',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-pseudoRandomBytes': 'error',
    'security/detect-bidi-characters': 'error',
    
    // Additional security rules for Chrome extensions
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-unsafe-innerhtml/no-unsafe-innerhtml': 'off', // Disabled for Chrome extensions
    
    // Chrome extension specific security
    'no-restricted-globals': [
      'error',
      {
        name: 'eval',
        message: 'eval() is prohibited in Chrome extensions for security reasons'
      },
      {
        name: 'Function',
        message: 'Function constructor is prohibited in Chrome extensions'
      }
    ],
    
    // TypeScript security rules
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    
    // React security rules
    'react/no-danger': 'error',
    'react/no-danger-with-children': 'error',
    'react/jsx-no-script-url': 'error',
    'react/jsx-no-target-blank': ['error', { 
      allowReferrer: false,
      enforceDynamicLinks: 'always'
    }],
    
    // Data validation and sanitization
    'no-restricted-properties': [
      'error',
      {
        object: 'document',
        property: 'write',
        message: 'document.write() can lead to XSS vulnerabilities'
      },
      {
        object: 'document',
        property: 'writeln',
        message: 'document.writeln() can lead to XSS vulnerabilities'
      },
      {
        property: 'innerHTML',
        message: 'innerHTML can lead to XSS vulnerabilities. Use textContent or secure sanitization'
      },
      {
        property: 'outerHTML',
        message: 'outerHTML can lead to XSS vulnerabilities. Use textContent or secure sanitization'
      }
    ],
    
    // Chrome extension API security
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.object.name='chrome'][callee.property.name='tabs'][callee.property.name='executeScript']",
        message: 'chrome.tabs.executeScript with dynamic code is dangerous. Use static files only'
      },
      {
        selector: "CallExpression[callee.property.name='eval']",
        message: 'eval() and related functions are prohibited'
      }
    ]
  },
  overrides: [
    {
      // Background scripts have additional security constraints
      files: ['src/background/**/*.ts'],
      rules: {
        'security/detect-non-literal-require': 'error',
        'no-restricted-globals': [
          'error',
          {
            name: 'window',
            message: 'Background scripts should not access window object'
          }
        ]
      }
    },
    {
      // Content scripts need special handling for DOM access
      files: ['src/content/**/*.ts'],
      rules: {
        'security/detect-object-injection': 'warn', // More lenient for content scripts
        'no-restricted-properties': [
          'error',
          {
            property: 'innerHTML',
            message: 'Use DOMPurify.sanitize() before setting innerHTML in content scripts'
          }
        ]
      }
    },
    {
      // Test files can be more lenient
      files: ['**/*.test.ts', '**/*.test.tsx', '**/tests/**/*.ts'],
      rules: {
        'security/detect-object-injection': 'off',
        'security/detect-non-literal-fs-filename': 'off',
        '@typescript-eslint/no-explicit-any': 'off'
      }
    },
    {
      // Configuration files
      files: ['*.config.js', '*.config.ts', 'scripts/**/*.js'],
      env: {
        node: true
      },
      rules: {
        'security/detect-non-literal-fs-filename': 'warn',
        'security/detect-child-process': 'warn'
      }
    }
  ],
  // Custom security patterns for Chrome extensions
  globals: {
    chrome: 'readonly',
    browser: 'readonly'
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'coverage/',
    '*.min.js',
    'webpack.*.js'
  ]
};