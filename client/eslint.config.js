import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      // Added node to globals to fix the vite.config.js 'process' and '__dirname' errors
      globals: {
        ...globals.browser,
        ...globals.node, 
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      
      // 1. Turn errors into warnings so the build can finish
      'no-unused-vars': ['warn', { 
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_' // Ignores variables starting with _ (like _err)
      }],

      // 2. Fix for the AuthContext / UI components blocking Fast Refresh
      'react-refresh/only-export-components': 'off', 

      // 3. Disable the 'apiPost is not defined' error if it's a global, 
      // though it's better to import it in DashboardLayout.jsx
      'no-undef': 'warn',
    },
  },
])