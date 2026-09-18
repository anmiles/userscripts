import { configs, globals, patterns } from '@anmiles/eslint-config';
import type { Linter } from 'eslint';

export default [
	...configs.base,
	...configs.ts,

	{
		ignores: [
			'dist/*',
			'ext/*',
			'public/*',
		],
	},

	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.jquery,
				Proxy                             : true,
				EventListener                     : true,
				EventListenerOrEventListenerObject: true,
			},
		},
	},

	{
		rules: {
			'camelcase': [ 'error', { allow: [
				'keep_fnames',
				'keep_classnames',
			] } ],
		},
	},

	{
		files: patterns.ts,

		rules: {
			'@typescript-eslint/no-unused-vars': [ 'error', { args: 'none' } ],
		},
	},

	{
		rules: {
			'n/no-unsupported-features/node-builtins': [ 'off' ],
		},
	},
] as Linter.Config[];

