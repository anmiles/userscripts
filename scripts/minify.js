const fs     = require('fs/promises');
const path   = require('path');
const terser = require('terser');
require('@anmiles/prototypes');

fs.recurse('dist', { file : minify }, { ext : '.user.js' });

async function minify(filepath) {
	const minified = filepath.replace('.user.js', '.user.min.js');

	const buffer = await fs.readFile(filepath);
	const code   = buffer.toString();

	const output = await terser.minify({ [path.basename(filepath)] : code }, {
		compress        : false,
		mangle          : false,
		keep_fnames     : true,
		keep_classnames : true,
	});

	fs.writeFile(minified, output.code);
}
