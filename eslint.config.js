import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import globals from 'globals';

const preferArrowFunctions = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require component methods and helper functions to be declared as const arrow functions',
    },
    schema: [],
    messages: {
      useArrowFunction:
        'Declare "{{name}}" as a const arrow function unless a regular function is required.',
    },
  },
  create(context) {
    const report = (node, name) => {
      context.report({
        node,
        messageId: 'useArrowFunction',
        data: { name: name ?? 'this helper' },
      });
    };

    return {
      FunctionDeclaration(node) {
        if (node.generator) return;
        report(node, node.id?.name);
      },
      VariableDeclarator(node) {
        if (node.init?.type !== 'FunctionExpression' || node.init.generator) return;
        report(node.init, node.id.type === 'Identifier' ? node.id.name : undefined);
      },
    };
  },
};

const appPlugin = {
  rules: {
    'prefer-arrow-functions': preferArrowFunctions,
  },
};

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },
  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  },
  js.configs.recommended,
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    name: 'app/browser-globals',
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    name: 'app/arrow-functions',
    plugins: {
      app: appPlugin,
    },
    rules: {
      'app/prefer-arrow-functions': 'error',
    },
  },
  {
    name: 'app/semicolons',
    rules: {
      semi: ['error', 'always'],
    },
  },
  {
    name: 'app/const-naming',
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          modifiers: ['const'],
          format: ['camelCase'],
        },
      ],
    },
  },
);
