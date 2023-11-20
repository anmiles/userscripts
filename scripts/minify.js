const fs     = require('fs/promises');
const terser = require('terser');
require('@anmiles/prototypes');

fs.recurse('dist', { file : minify }, { ext : '.user.js' });

async function minify(filepath) {
	const minified = filepath.replace('.user.js', '.user.min.js');

	return fs.readFile(filepath)
		.then((buffer) => buffer.toString())
		.then((code) => terser.minify({ ['script.js'] : code }, {
			compress        : false,
			mangle          : false,
			// eslint-disable-next-line camelcase
			keep_fnames     : true,
			// eslint-disable-next-line camelcase
			keep_classnames : true,
		}))
		.then((output) => fs.writeFile(minified, output.code));
}
