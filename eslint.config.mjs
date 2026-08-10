import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      '.vercel/**',
      'docs/.vitepress/dist/**',
      'docs/.vitepress/cache/**',
      '.resource/**',
      'next-env.d.ts',
      '*.tsbuildinfo',
    ],
  },
];

export default eslintConfig;
