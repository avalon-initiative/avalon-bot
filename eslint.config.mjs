import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const forbid = (patterns, message) => ({
  'no-restricted-imports': ['error', { patterns: patterns.map((group) => ({ group: [group], message })) }],
});

// Layering: the inner layers never depend on Discord, GitHub or the outer wiring.
const PURE = [
  'discord.js',
  '@octokit/*',
  '**/discord/**',
  '**/github/**',
  '**/composition.js',
  '**/index.js',
];

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: { allowDefaultProject: ['eslint.config.mjs'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: ['src/domain/**', 'src/render/**', 'src/services/**', 'src/config/**', 'src/util/**'],
    rules: forbid(PURE, 'Inner layers must not import Discord, GitHub or the composition root.'),
  },
  {
    files: ['src/github/**'],
    rules: forbid(['discord.js', '**/discord/**'], 'The GitHub layer must not depend on Discord.'),
  },
  {
    files: ['src/discord/**'],
    rules: forbid(['@octokit/*', '**/github/**'], 'The Discord layer must not depend on GitHub.'),
  },
  {
    files: ['**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    files: ['tests/**'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
);
