const fs = require('fs');
require('@anmiles/prototypes');

const EOL          = '\n';
const headerRegex  = /^\s*\/\/\s*@(\S+)\s+(.*?)\s*$/;
const sectionRegex = /<userscript:section lang="(\w+)" namespace="(.*?)" title="(.*?)" \/>/g;

const root      = './public';
const template  = './src/index.template.html';
const indexFile = './public/index.html';
const ext       = '.user.js';

const sections = {};

console.log('Get contents');

fs.recurse(root, { file : (filepath, filename) => {
	if (filepath.endsWith(ext)) {
		// console.log(`    ${filename}`);

		const section = { filename };
		const text    = fs.readFileSync(filepath).toString();

		for (const line of text.split(EOL)) {
			const matches = headerRegex.exec(line);
			if (matches) {
				section[matches[1]] = matches[2];
			}
		}

		sections[section.namespace] = sections[section.namespace] || [];
		sections[section.namespace].push(section);
	}
} }, { depth : 1 });

console.log('Build index');
const output = [];

fs.readFileSync(template)
	.toString()
	.split(EOL)
	.forEach((line) => {
		sectionRegex.lastIndex = 0;
		let isSection          = false;
		let matches;

		while ((matches = sectionRegex.exec(line)) !== null) {
			const [ _all, sectionLanguage, sectionName, sectionTitle ] = matches;
			const section                                              = sections[sectionName];
			isSection                                                  = true;

			if (!section) {
				throw `No section '${sectionName}' found`;
			}

			// console.log(`    ${sectionName}:${sectionLanguage || ''}`);
			output.push(`    <h2>${sectionTitle}</h2>`);
			output.push('    <ul>');

			section.forEach((script) => {
				const filename    = script.filename;
				const version     = script.version;
				const description = script[sectionLanguage === 'en' ? 'description' : `description:${sectionLanguage}`];
				const link        = `<a class="break-word" href="${filename}?version=${version}" title="${description}">${filename}</a>`;
				const listItem    = `<li>${link} - ${description} (version ${version})</li>`;
				output.push(listItem);
			});
			output.push('    </ul>');
			output.push('    <hr />');
		}

		if (!isSection) {
			output.push(line);
		}
	});

fs.writeFileSync(indexFile, output.join(EOL));
