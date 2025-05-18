const fs = require('fs/promises');

require('@anmiles/prototypes');

fs.recurse('dist', { file: prepare }, { ext: '.user.js' });

async function prepare(filepath) {
	const buffer = await fs.readFile(filepath);
	const code   = buffer.toString();

	const fixedCode = code.replace('export {};', '');
	fs.writeFile(filepath, fixedCode);
}
