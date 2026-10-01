import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import prettier from 'eslint-config-prettier'
import { defineConfig } from 'eslint/config'

export default defineConfig([
    { ignores: ['src/**/*.spec.ts'] },
    {
        files: ['src/**/*.{js,ts}'],
        extends: [
            js.configs.recommended,
            tseslint.configs['flat/recommended'],
            prettier,
        ],
        rules: {
            'no-prototype-builtins': 'off',
            '@typescript-eslint/no-empty-object-type': 'off',
        },
    },
])
