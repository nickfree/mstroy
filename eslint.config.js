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

const typesInTypesSegment = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require exported type aliases and interfaces to be declared in a "types" segment',
    },
    schema: [],
    messages: {
      typesInTypesSegment:
        'Declare exported types in the "types" segment of the slice, for example src/shared/ui/TreeTable/types/.',
    },
  },
  create(context) {
    const filename = (context.filename ?? '').replace(/\\/g, '/');

    if (filename.includes('/types/') || filename.endsWith('.d.ts')) {
      return {};
    }

    const report = (node) => {
      context.report({ node, messageId: 'typesInTypesSegment' });
    };

    return {
      'ExportNamedDeclaration > TSTypeAliasDeclaration': report,
      'ExportNamedDeclaration > TSInterfaceDeclaration': report,
      'ExportNamedDeclaration > TSEnumDeclaration': report,
      'ExportDefaultDeclaration > TSInterfaceDeclaration': report,
    };
  },
};

const appPlugin = {
  rules: {
    'prefer-arrow-functions': preferArrowFunctions,
    'types-in-types-segment': typesInTypesSegment,
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
    name: 'app/types-in-types-segment',
    plugins: {
      app: appPlugin,
    },
    rules: {
      'app/types-in-types-segment': 'error',
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
