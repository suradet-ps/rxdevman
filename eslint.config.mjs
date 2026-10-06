// Run this command to generate base config and vs code settings:
// pnpm dlx @antfu/eslint-config@latest

import antfu from '@antfu/eslint-config';

export default antfu({
  astro: true,
  typescript: true,
  stylistic: {
    indent: 2,
    semi: true,
    quotes: 'single',
  },
}, {
  ignores: ['**/*.md', '**/*.md/**', 'public/sw.js', '.github/**'],
}, {
  files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx', '**/*.astro'],
  rules: {
    'ts/no-redeclare': 'off',
    'ts/consistent-type-definitions': ['error', 'type'],
    'no-console': ['warn'],
    'antfu/no-top-level-await': ['off'],
    'node/prefer-global/process': ['off'],
    'node/no-process-env': ['error'],
    'perfectionist/sort-imports': ['error', {
      tsconfig: {
        rootDir: '.',
        filename: 'tsconfig.json',
      },
    }],
  },
}, {
  rules: {
    'unicorn/filename-case': ['error', {
      cases: {
        kebabCase: true,
        pascalCase: true,
      },
      ignore: ['README.md'],
    }],
  },
});
