module.exports = {
	root    : true,
	extends : [
		'./node_modules/@anmiles/eslint-config/.eslintrc.js',
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
	ignorePatterns : [
		'**/node_modules/',
		'dist/',
		'ext/',
	],
	rules : {
		'@typescript-eslint/no-unused-vars' : [ 'error', { args : 'none' } ],
		'camelcase'                         : [ 'error', { allow : [ '^_(_[a-z][A-Za-z]+)+$' ] } ],
	},
};
