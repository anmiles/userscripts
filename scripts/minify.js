const fs     = require('fs/promises');
const terser = require('terser');
require('@anmiles/prototypes');

fs.recurse('dist', { file : minify }, { ext : '.user.js' });

async function minify(filepath) {
	const minified = filepath.replace('.user.js', '.user.min.js');

	return fs.readFile(filepath)
		.then((buffer) => buffer.toString())
		.then((code) => terser.minify({ ['script.js'] : code }, {
			// eslint-disable-next-line camelcase
			compress : false, keep_classnames : true, keep_fnames : true,
		}))
		.then((output) => fs.writeFile(minified, output.code));
}
