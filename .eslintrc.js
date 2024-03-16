module.exports = {
	root : true,

	extends : [
		'./node_modules/@anmiles/eslint-config/src/base.preset.js',
		'./node_modules/@anmiles/eslint-config/src/ts.preset.js',
	],

	env : {
		browser : true,
	},

	globals : {
		$                                  : true,
		JQuery                             : true,
		Proxy                              : true,
		EventListener                      : true,
		EventListenerOrEventListenerObject : true,
	},

	rules : {
		'@typescript-eslint/no-unused-vars' : [ 'error', { args : 'none' } ],
		'camelcase'                         : [ 'error', { allow : [
			'keep_fnames',
			'keep_classnames',
		] } ],
	},
};
