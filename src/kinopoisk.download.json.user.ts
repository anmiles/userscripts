// ==UserScript==
// @name           Kinopoisk - download json
// @namespace      kinopoisk
// @version        5.1.1
// @updateURL      https://anmiles.net/userscripts/kinopoisk.download.json.user.js
// @downloadURL    https://anmiles.net/userscripts/kinopoisk.download.json.user.js
// @description    Click top right arrow icon to download json with all saved movies
// @description:ru Добавляет в верхний правый угол две иконки для скачивания JSON с информацией по фильму и скачивания JSON со всеми фильмами, добавленными в списки
// @author         Anatoliy Oblaukhov
// @match          https://www.kinopoisk.ru/*
// @require        https://code.jquery.com/jquery-3.4.1.min.js
// @grant          none
// ==/UserScript==

const debug = {
	enabled   : false,
	listNames : [ 'Детские' ],
	filmIds   : [ 22400, 299, 30070, 258382, 1047843, 46483 ],
};

const defaultListID = 6; // favorites
const perPage       = 100;
const pageInterval  = parseInt(localStorage.pageInterval) || 1000;

const boxWidth = 1000;
const boxItem  = 24;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Number {
	case(zero: string, one: string, two: string): string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface String {
	beautify(): string;
	toFilename(): string;
}

Number.prototype.case = function(zero: string, one: string, two: string): string {
	let num = Math.abs(this);
	num    %= 100;

	if (num >= 5 && num <= 20) {
		return zero;
	}

	num %= 10;

	if (num === 1) {
		return one;
	}

	if (num >= 2 && num <= 4) {
		return two;
	}

	return zero;
};

String.prototype.beautify = function() {
	return this
		.replace(/([\s\u200b\u200c\xa0]|&nbsp;)+/g, ' ') // unify spaces
		.replace(/[\u2024\u3002]/g, '.') // unify dots
		.replace(/[\u2026]/g, '...') // unify ellipsis
		.replace(/[\xb7\xad\u2010-\u2015\u2022\u2212\u2e3a-\u2e3b\u30fb-\u30fc]/g, '-') // unify hyphens
		.replace(/[`’]/g, '\'') // unify apostrophes
		.replace(/[«»“”＂]/g, '"') // unify quotes
		.replace(/[\uff1a]/g, ':') // unify colons
		.replace(/\uff1f/g, '?') // unify question marks
		.replace(/\uff0a/g, '*') // unify asterisks
		.replace(/\u29f8/g, '/') // unify slashes
		.replace(/\u29f9/g, '\\') // unify backslashes
		.replace(/\uff5c/g, '|') // unify vertical slashes
		.replace(/[「【]/g, '[').replace(/[」】]/g, ']') // unify square brackets
		.replace('²', '2') // unify 2
		.replace('³', '3') // unify 3
		.replace('¼', '.25') // unify 1/4
		.replace('½', '.5') // unify 1/2
		.replace('¾', '.75') // unify 3/4
		.replace('ß', 'ss') // unify double S
		.replace(/\u0406/g, 'I') // unify I
		.replace(/\u0456/g, 'i') // unify i
	;
};

String.prototype.toFilename = function() {
	return this.beautify()
		.replace(/[/\\|]/g, '-') // replace slashes with hyphen
		.replace(/: /g, ' - ') // replace colon as word edge with hyphen
		.replace(/:/g, '-') // replace colon as not a word edge with hyphen
		.normalize('NFD').replace(/(?<![ИиЕе])[\u0300-\u036f]/g, '') // unify accents from latin characters
		.replace(/И\u0306/g, 'Й').replace(/и\u0306/g, 'й').replace(/Е\u0308/g, 'Ё').replace(/е\u0308/g, 'ё') // undo normalizing russian accents
		// remove \ufe0f
		.replace(/["*?<>]/g, ' ') // remove other forbidden symbols
		.replace(/[^\d\p{L}'\u0020-\u007e\u00a1-\u00ff\u2100-\u214f]/gu, '') // remove any other symbols
		.replace(/[-]+/g, '-') // collapse multiple hyphens
		.replace(/\s+/g, ' ') // collapse multiple spaces
		.replace(/\.\.\.[.]+/g, '...') // collapse dots after ellipsis
		.replace(/\.\.\./g, '\u2026').replace(/[.]+/g, '.').replace(/\u2026/g, '...') // collapse double dots
		.trim() // remove leading and trailing spaces
		.replace(/^\.+/g, '').replace(/\.+$/g, '') // remove leading and trailing dots
	;
};

(($) => {
	let currentUrl: string;
	let listsProgress: Progress;
	let filmsProgress: Progress;
	let currentProgress: Progress;

	const filmTypeNames = [ 'Film', 'TvSeries' ] as const;
	type FilmTypeName = typeof filmTypeNames[number];

	type FilmDataBase = {
		id: number;
		name: string;
		originalName: string;
		fullName: string;
		year: string;
		time: number;
	};

	type ListItemData = FilmDataBase & {
		kind: 'listItem';
	};

	type RelatedData = FilmDataBase & {
		kind: 'related';
		key: `${FilmTypeName}:${number}`;
	};

	type FilmData = FilmDataBase & {
		kind: 'film';
		key: `${FilmTypeName}:${number}`;
		related: number[];
		genres: string[];
		lists: string[];
		poster: string | null;
		description: string;
		note: string | null;
		directors: string[];
	};

	abstract class FilmBase {
		id: number;
		name: string;
		originalName: string;
		fullName: string;
		year: string;
		time: number;

		protected constructor(data: FilmDataBase) {
			this.id           = data.id;
			this.name         = data.name;
			this.originalName = data.originalName;
			this.fullName     = data.fullName;
			this.year         = data.year;
			this.time         = data.time;
		}

		protected static parseJSON(jsonFilmData: JSONFilmData<FilmTypeName>): FilmDataBase {
			const id           = jsonFilmData.id;
			const name         = jsonFilmData.title.russian || '';
			const originalName = jsonFilmData.title.original || '';
			const year         = FilmBase.getYear(jsonFilmData);
			const time         = jsonFilmData.totalDuration || jsonFilmData.seriesDuration || jsonFilmData.duration || 0;

			return { id, year, time, ...FilmBase.getNames({ name, originalName, year }) };
		}

		private static getYear(data: JSONFilmData<FilmTypeName>): string {
			if (!data.releaseYears || data.releaseYears.length === 0) {
				return data.productionYear ? data.productionYear.toString() : '';
			}

			const start = data.releaseYears[0].start;
			const end   = data.releaseYears.slice(-1)[0].end;

			if (start === null) {
				return '...';
			}

			if (start === end) {
				return start.toString();
			}

			if (end) {
				return `${start} - ${end}`;
			}

			if (data.__typename === 'TvSeries') {
				return `${start} - ...`;
			}

			return start.toString();
		}

		protected static getNames({ name, originalName, year } : { name: string, originalName: string, year: string }): { name: string, originalName: string, fullName: string } {
			if (!name && originalName) {
				name         = originalName;
				originalName = '';
			}

			const fullNameParts: string[] = [];
			fullNameParts.push(name);

			if (originalName.length > 0 && originalName !== name) {
				fullNameParts.push(`(${originalName})`);
			}

			fullNameParts.push(`[${year ? year : '...'}]`);
			const fullName = fullNameParts.join(' ').toFilename();

			return { name, originalName, fullName };
		}
	}

	class ListItem extends FilmBase implements ListItemData {
		kind: 'listItem';
		static map: Record<number, ListItem> = {};

		private constructor(data: ListItemData) {
			super(data);
			this.kind = data.kind;
		}

		private static create(id: number, getData: () => ListItemData) {
			if (!ListItem.map[id]) {
				ListItem.map[id] = new ListItem(getData());
			}

			return ListItem.map[id];
		}

		static is(item: unknown): item is ListItem {
			return typeof item === 'object' && item !== null && 'kind' in item && item.kind === 'listItem';
		}

		static fromElement(id: number, li: HTMLElement): ListItem {
			return ListItem.create(id, () => {
				const nameEl = select($(li), '.info .name');
				const desc   = nameEl.next().text().split(/\s*\((.*?)\)\s*/);

				const name         = nameEl.text().trim();
				const originalName = desc[0].trim() || '';
				const year         = desc.length >= 2 ? desc[1].trim().replace(/^-$/, '') : '';
				const time         = desc.length >= 3 && /^\d+$/.test(desc[2]) ? parseInt(desc[2]) : 0;

				return { id, year, time, kind : 'listItem', ...FilmBase.getNames({ name, originalName, year }) };
			});
		}

		static fromListItem(id: number, film: ListItem) {
			return ListItem.create(id, () => film);
		}
	}

	class Related extends FilmBase implements RelatedData {
		kind: 'related';
		key: `${FilmTypeName}:${number}`;
		static map: Record<number, Related> = {};

		private constructor(data: RelatedData) {
			super(data);
			this.kind = data.kind;
			this.key  = data.key;
		}

		private static create(id: number, getData: () => RelatedData) {
			if (!Related.map[id]) {
				Related.map[id] = new Related(getData());
			}

			return Related.map[id];
		}

		static is(item: unknown): item is Related {
			return typeof item === 'object' && item !== null && 'kind' in item && item.kind === 'related';
		}

		static fromJSON(key: `${FilmTypeName}:${number}`, jsonFilmData: JSONFilmData<FilmTypeName>): Related {
			return Related.create(jsonFilmData.id, () => ({ kind : 'related', key, ...FilmBase.parseJSON(jsonFilmData) }));
		}
	}

	class Film extends FilmBase implements FilmData {
		kind: 'film';
		key: `${FilmTypeName}:${number}`;
		static map: Record<number, Film> = {};

		related: number[];
		genres: string[];
		lists: string[];
		poster: string | null;
		description: string;
		note: string | null;
		directors: string[];

		private constructor(data: FilmData) {
			super(data);
			this.kind = data.kind;
			this.key  = data.key;

			this.related     = data.related;
			this.genres      = data.genres;
			this.lists       = data.lists;
			this.poster      = data.poster;
			this.description = data.description;
			this.note        = data.note;
			this.directors   = data.directors;
		}

		private static create(id: number, getData: () => FilmData) {
			if (!Film.map[id]) {
				Film.map[id] = new Film(getData());
			}

			return Film.map[id];
		}

		static is(item: unknown): item is Film {
			return typeof item === 'object' && item !== null && 'kind' in item && item.kind === 'film';
		}

		static fromHTML(id: number, html: string): Film {
			return Film.create(id, () => {
				if (!html) {
					throw error('Пустое содержимое страницы фильма');
				}

				if (typeof html.match !== 'function') {
					throw error('Некорректное содержимое страницы фильма');
				}

				const htmlMatch = html.match(/__NEXT_DATA__.*?>(.*?)<\/script>/);

				if (!htmlMatch) {
					throw error('Не удалось найти объект __NEXT_DATA__ на странице фильма');
				}

				const json     = JSON.parse(htmlMatch[1]);
				const jsonData = json.props.apolloState.data as JSONData;

				const related      = Film.getRelated(jsonData);
				const key          = Related.map[id].key;
				const jsonFilmData = jsonData[key];
				const genres       = Film.getGenres(jsonFilmData, jsonData);
				const lists        = Film.getLists(jsonFilmData);
				const poster       = Film.getPoster(jsonFilmData);
				const description  = Film.getDescription(jsonFilmData);
				const note         = Film.getNote(jsonFilmData);
				const directors    = Film.getMembers(jsonFilmData, jsonData, '"DIRECTOR"');
				const kind         = 'film';

				return { related, genres, lists, poster, description, note, directors, kind, key, ...FilmBase.parseJSON(jsonFilmData) };
			});
		}

		private static getRelated(data: JSONData): number[] {
			return Object.keys(data)
				.filter(Film.isFilmKey)
				.map((key) => {
					const film = data[key];
					Related.fromJSON(key, film);
					return film.id;
				});
		}

		private static isFilmKey(key: string): key is `${FilmTypeName}:${number}` {
			const [ typeName, idString ] = key.split(':');

			return Film.isFilmTypeName(typeName) && !isNaN(Number(idString));
		}

		private static isFilmTypeName(typeName: string): typeName is FilmTypeName {
			return filmTypeNames.includes(typeName as any);
		}

		private static getGenres(jsonFilmData: JSONFilmData<FilmTypeName>, jsonData: JSONData): string[] {
			const genres = jsonFilmData.genres.map(({ __ref }) => jsonData[__ref].name);

			if (jsonFilmData.__typename === 'TvSeries') {
				genres.push('сериал');
			}

			return genres.sort();
		}

		private static getLists(jsonFilmData: JSONFilmData<FilmTypeName>): string[] {
			return jsonFilmData.userData.folders.map((folder) => folder.name).sort();
		}

		private static getPoster(jsonFilmData: JSONFilmData<FilmTypeName>): string | null {
			let poster = jsonFilmData.poster && (jsonFilmData.poster.avatarsUrl || jsonFilmData.poster.fallbackUrl);

			if (poster) {
				if (poster.indexOf('//') === 0) {
					poster = `https:${poster}`;
				}
				if (!poster.match(/\d+x\d+$/)) {
					poster = `${poster}/600x900`;
				}
			}

			return poster;
		}

		private static getDescription(jsonFilmData: JSONFilmData<FilmTypeName>): string {
			return (jsonFilmData.synopsis || jsonFilmData.shortDescription || '').beautify();
		}

		private static getNote(jsonFilmData: JSONFilmData<FilmTypeName>): string | null {
			return jsonFilmData.userData.note && jsonFilmData.userData.note.value;
		}

		private static getMembers<JSONRole extends JSONRoles>(
			jsonFilmData: JSONFilmData<FilmTypeName>,
			jsonData: JSONData,
			jsonRole: JSONRole,
		): string[]  {
			const key   = Object.keys(jsonFilmData).find((key) => key.startsWith('members') && key.includes(jsonRole)) as `members({"limit":${number},"role":${JSONRole}})`;
			const refs  = jsonFilmData[key].items.map((item) => item.person.__ref);
			const names = refs.map((ref) => jsonData[ref].name || jsonData[ref].originalName);
			return names;
		}
	}

	type List = {
		id: number;
		title: string;
		firstPageHTML: string | null;
		totalPages: number
	};

	type JSONRoles = '"DIRECTOR"';

	type JSONFilmData<TFilmTypeName extends FilmTypeName> = {
		__typename: TFilmTypeName;
		id: number;
		title: {
			__typename: 'Title';
			original: string | null;
			russian: string | null;
		};
		productionYear: number | null;
		releaseYears?: Array<{
			__typename: 'YearsRange';
			start: number | null;
			end: number | null;
		}>
		duration: number | null;
		totalDuration: number | null;
		seriesDuration: number | null;
		genres: Array<{ __ref: `Genre:${number}`}>;
		userData: {
			__typename: 'MovieUserData';
			folders: Array<{
				__typename: 'Folder';
				id: number;
				name: string;
			}>;
			note: null | {
				__typename: 'UserMovieNote';
				value: string
			};
		};
		poster: null | {
			__typename: 'Image';
			avatarsUrl: string | null;
			fallbackUrl: string | null;
		};
		synopsis : string | null;
		shortDescription : string | null;
	} & {
		[key in `members({"limit":${number},"role":${JSONRoles}})`]: {
			items: Array<{
				__typename: 'FilmCrewMember',
				person: {
					__ref: `Person:${number}`
				}
			}>
		};
	};

	type JSONData = {
		[key in `Film:${number}`]: JSONFilmData<'Film'>;
	} & {
		[key in `TvSeries:${number}`]: JSONFilmData<'TvSeries'>;
	} & {
		[key in `Genre:${number}`]: {
			__typename: 'Genre';
			id: number;
			name: string;
			slug: string;
		};
	} & {
		[key in `Person:${number}`]: {
			__typename: 'Person';
			id: number;
			name: string;
			originalName: string;
		};
	};

	class Progress {
		title: string;

		private container: JQuery<HTMLElement>;
		private box: JQuery<HTMLElement>;
		private progressBox: JQuery<HTMLElement>;
		private progressBar: JQuery<HTMLElement>;
		private percentLabel: JQuery<HTMLElement>;
		private remainLabel: JQuery<HTMLElement>;
		private logPanel: JQuery<HTMLElement>;
		private logText: JQuery<HTMLElement>;
		private logLink: JQuery<HTMLElement>;

		buttonPanel: JQuery<HTMLElement>;

		startTime: Date;
		counts: number[];
		weights: number[];
		values: number[];
		bases: number[];
		value: number;

		constructor(title: string) {
			this.title        = title;
			this.container    = Progress.getContainer();
			this.box          = $('<div></div>').addClass('box').appendTo(this.container);
			this.progressBox  = $('<div></div>').addClass('progress-box').appendTo(this.box);
			this.progressBar  = $('<div></div>').addClass('progress-bar').appendTo(this.progressBox);
			this.percentLabel = $('<span></span>').addClass('percent-label').appendTo(this.progressBox);
			this.remainLabel  = $('<span></span>').addClass('remain-label').appendTo(this.progressBox);
			this.logPanel     = $('<div></div>').addClass('logs').appendTo(this.box);
			this.logText      = $('<span></span>').appendTo(this.logPanel);
			this.logLink      = $('<span></span>').appendTo(this.logPanel);
			this.buttonPanel  = $('<div></div>').addClass('buttons').appendTo(this.box);

			console.debug('__construct', title);
			this.print(title);
		}

		private static getContainer(): JQuery<HTMLElement> {
			const cssClass       = 'download-container';
			const parentSelector = 'body';
			const container      = $(`${parentSelector} > .${cssClass}`);

			return container.length === 0
				? $('<div></div>').addClass(cssClass).appendTo($(parentSelector))
				: container;
		}

		private formatTime(ms: number) {
			if (isNaN(ms) || ms === 0) {
				return '';
			}

			const seconds = Math.ceil(ms / 1000);

			if (seconds < 100) {
				return `~ ${seconds} ${seconds.case('секунд', 'секунда', 'секунды')}`;
			}

			const minutes = Math.ceil(seconds / 60);
			return `~ ${minutes} ${minutes.case('минут', 'минута', 'минуты')}`;
		}

		start() {
			this.counts    = [];
			this.weights   = [];
			this.values    = [];
			this.bases     = [];
			this.startTime = new Date();
			console.debug('start', this);
			this.render();
		}

		finish() {
			this.values[0] = this.counts[0] = this.weights[0] = 1;
			this.bases[0]  = 0;
			console.debug('finish', this);
			this.print(`${this.title} - готово!`);
			this.render();
		}

		close() {
			this.container.hide();
		}

		push(count: number, weight: number) {
			this.counts.push(count);
			this.weights.push(weight);
			this.values.push(0);
			this.bases.push(0);
			console.debug('push', this);
		}

		pop() {
			this.counts.pop();
			this.weights.pop();
			this.values.pop();
			this.bases.pop();
			this.bases[this.counts.length] = this.value;
			console.debug('pop', this);
		}

		increment(itemTitle: string, itemLink: string) {
			if (this.values.length === 0) {
				return;
			}
			this.values[this.values.length - 1]++;
			console.debug('increment', itemTitle, itemLink, this);
			this.print(`${this.title} [${this.values[this.values.length - 1]} из ${this.counts[this.counts.length - 1]}]`);
			this.link(itemTitle, itemLink);
			this.render();
		}

		print(message: string, isError?: boolean) {
			(isError ? console.error : console.log)(message);
			this.logPanel.css({ color : (isError ? 'red' : 'black') });
			this.logText.text(message);
			this.logLink.html('');
		}

		link(itemTitle: string, itemLink: string) {
			$('<span></span>').html('&nbsp;-&nbsp;').appendTo(this.logLink);
			$('<a></a>').attr('href', itemLink).attr('target', '_blank').text(itemTitle).appendTo(this.logLink);
		}

		error(message: string) {
			this.print(message, true);
		}

		render() {
			this.value     = this.bases.reduce((a: number, b: number) => a + b, 0);
			let multiplier = 1;

			for (let i = 0; i < this.counts.length; i++) {
				multiplier /= (this.counts[i] / this.weights[i]);
				this.value += this.values[i] * multiplier;
			}

			console.debug('render', this);
			const left     = `-${(1 - this.value) * 100}%`;
			const percents = `${Math.floor(this.value * 100)}%`;
			this.progressBar.css({ left });
			this.percentLabel.html(percents);

			if (this.value !== 0 && this.value !== 1) {
				const elapsed = new Date().getTime() - this.startTime.getTime();
				const remain  = elapsed / this.value - elapsed;
				this.remainLabel.html(this.formatTime(remain));
			} else {
				this.remainLabel.html('');
			}
		}
	}

	function isConsoleOpened() {
		const startTime = new Date();
		console.warn('Нажмите F8 для продолжения');
		// eslint-disable-next-line no-debugger
		debugger;
		const endTime = new Date();
		return (endTime.getTime() - startTime.getTime()) > 200;
	}

	function error(ex: Error | string) {
		if (currentProgress) {
			currentProgress.error(`Не удалось распарсить страницу ${currentUrl}. Ошибка: ${ex}`);
		}
		// eslint-disable-next-line no-debugger
		debugger;
		throw ex;
	}

	function select(context: JQuery<HTMLElement>, selector: string, skipError?: boolean) {
		const obj = context.find(selector);
		if (obj.length === 0 && skipError !== false) {
			throw error(`Не удалось найти элемент по селектору ${selector}`);
		}
		return obj;
	}

	function regex(text: string, pattern: RegExp) {
		const match = pattern.exec(text);
		if (!match) {
			throw error(`Не удалось найти текст по регулярному выражению ${pattern}`);
		}
		return match;
	}

	async function get(url: string): Promise<string> {
		if (typeof url === 'undefined') {
			// eslint-disable-next-line no-debugger
			debugger;
		}
		currentUrl                  = url;
		let response: string | null = null;

		let attempt = 1;

		while (!response) {
			await sleep(pageInterval);

			try {
				response = await $.get(url);
			} catch (ex) {
				console.warn(`Не удалось загрузить страницу '${url}', попытка #${attempt++} через секунду...`);

				if (attempt > 3) {
					// eslint-disable-next-line no-debugger
					debugger;
				}
			}
		}

		return response;
	}

	async function sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	function parseFilmId(li: HTMLElement): number {
		const idString = $(li).data('id');
		const id       = parseInt(idString);
		if (isNaN(id)) {
			throw error(`Id не является целым числом: ${idString}`);
		}
		return id;
	}

	function shouldSkipFilm(filmId: number): boolean {
		return debug.enabled && debug.filmIds.length > 0 && debug.filmIds.includes(filmId);
	}

	function shouldSkipList(listName: string): boolean {
		return debug.enabled && debug.listNames.length > 0 && debug.listNames.includes(listName);
	}

	function downloadAll() {
		if (!(isConsoleOpened())) {
			alert('Нажмите F12 чтобы открыть консоль и попробуйте ещё раз');
			return;
		}

		listsProgress = new Progress('Загрузка списков');
		filmsProgress = new Progress('Загрузка фильмов');

		currentProgress = listsProgress;

		const loadButton = $('<a></a>')
			.addClass('button')
			.text('Загрузить списки')
			.appendTo(listsProgress.buttonPanel);

		const startButton = $('<a></a>')
			.addClass('button')
			.text('Начать')
			.appendTo(listsProgress.buttonPanel);

		const fileInput = createFileInput({
			success : (contents: string) => {
				try {
					const data = JSON.parse(contents) as Record<number, unknown>;

					for (const item of Object.values(data)) {
						if (!ListItem.is(item)) {
							return;
						}

						if (shouldSkipFilm(item.id)) {
							return;
						}

						ListItem.fromListItem(item.id, item);
					}
				} catch (ex) {
					listsProgress.error(ex.toString());
					return;
				}

				loadButton.hide();
				startButton.hide();

				listsProgress.start();
				listsProgress.finish();

				downloadAllFilms();
			},
			fail : (message: string) => {
				listsProgress.error(message);
			},
		}).appendTo(listsProgress.buttonPanel);

		loadButton.on('click', () => {
			fileInput.trigger('click');
		});

		startButton.on('click', () => {
			loadButton.hide();
			startButton.hide();

			downloadAllLists();
		});
	}

	function createFileInput({ success, fail } : { success: (contents: string) => void, fail: (message: string) => void}): JQuery<HTMLElement> {
		const fileInput = $('<input type="file" />');

		fileInput.on('change', (ev) => {
			const files = (ev.target as HTMLInputElement).files;
			if (!files) {
				return;
			}

			const reader = new FileReader();
			reader.readAsText(files[0]);

			reader.onload = function() {
				success(reader.result as string);
			};

			reader.onerror = function() {
				if (reader.error) {
					fail(reader.error.message);
				}
			};
		});

		return fileInput;
	}

	async function downloadAllLists() {
		listsProgress.start();
		const startUrl  = buildUrl();
		const startHTML = await get(startUrl);

		const lists = select($(startHTML), '#folderList li')
			.toArray()
			.map((li) => createList(li, startHTML));

		const totalPages = lists.reduce((a, list) => a + (shouldSkipList(list.title) ? 0 : list.totalPages), 0);
		listsProgress.push(totalPages, 1);

		for (const list of lists) {
			await parseList(list, 1);
		}

		listsProgress.pop();
		listsProgress.finish();

		createDownloadButton({ download : 'lists.json', json : ListItem.map, title : 'Скачать списки' })
			.appendTo(listsProgress.buttonPanel)
			.get(0)
			?.click();

		downloadAllFilms();
	}

	function createList(li: HTMLElement, startHTML: string): List {
		const id            = $(li).data('id');
		const text          = $(li).text().trim();
		const firstPageHTML = $(li).find('a').attr('href') ? null : startHTML;
		const matches       = text.match(/^\s*(.*?)\s+\((\d+)\)\s*$/);

		if (!matches) {
			throw error(`Text '${text}' doesn't match regexp`);
		}

		const title      = matches[1];
		const totalPages = Math.ceil(parseInt(matches[2]) / perPage);
		return { id, title, firstPageHTML, totalPages };
	}

	async function parseList(list: List, currentPage: number) {
		if (shouldSkipList(list.title)) {
			return;
		}

		const url  = buildUrl(list, currentPage);
		const html = currentPage === 1 && list.firstPageHTML ? list.firstPageHTML : await get(url);
		listsProgress.increment(`${list.title} [${currentPage} of ${list.totalPages}]`, url);

		const listItems = select($(html), '#itemList li');

		for (const listItem of listItems) {
			const id = parseFilmId(listItem);

			if (shouldSkipFilm(id)) {
				return null;
			}

			ListItem.fromElement(id, listItem);
		}

		if (currentPage < list.totalPages) {
			await parseList(list, currentPage + 1);
		}
	}

	function buildUrl(list = { id : defaultListID }, currentPage = 1) {
		return `/mykp/folders/${list.id}/?page=${currentPage}&limit=${perPage}`;
	}

	async function downloadAllFilms() {
		currentProgress = filmsProgress;
		filmsProgress.start();
		filmsProgress.push(debug.enabled ? debug.filmIds.length : Object.keys(ListItem.map).length, 1);

		for (const listItem of Object.values(ListItem.map)) {
			if (shouldSkipFilm(listItem.id)) {
				continue;
			}

			const url = `/film/${listItem.id}/`;
			filmsProgress.increment(listItem.name, url);
			const html = await get(url);
			Film.fromHTML(listItem.id, html);
		}

		filmsProgress.pop();
		filmsProgress.finish();

		createDownloadButton({ download : 'films.json', json : { ...Related.map, ...Film.map }, title : 'Скачать фильмы' })
			.appendTo(filmsProgress.buttonPanel)
			.get(0)
			?.click();
	}

	function downloadFilm() {
		const id   = getCurrentFilmId();
		const film = Film.fromHTML(id, document.body.innerHTML);

		setTimeout(() => {
			if (getListsDropdown().length === 0) {
				$('button[title="Добавить в папку"]').trigger('click');
			}

			const folders = select(getListsDropdown(), 'input[type="checkbox"][checked] + span', false);
			film.lists    = folders ? folders.map((_i, folder) => $(folder).text()).toArray() : [];

			createDownloadButton({ download : `${film.id}.json`, json : film, title : 'Скачать фильм' })
				.get(0)
				?.click();
		}, 1);
	}

	function createDownloadButton({ download, json, title }: { download: string, json: any, title: string }) {
		return $('<a></a>')
			.addClass('button')
			.text(title)
			.attr('href', `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(json))}`)
			.attr('download', download);
	}

	function getListsDropdown() {
		return select($('body'), 'button[title="Добавить в папку"] + div[class^="styles_dropdownMenu"]', false);
	}

	function copyTitle() {
		const id = getCurrentFilmId();

		setTimeout(() => {
			const film = Film.fromHTML(id, document.body.innerHTML);
			navigator.clipboard.writeText(film.fullName);
		}, 1);
	}

	function getCurrentFilmId(): number {
		return parseInt(regex(location.pathname, /^\/(film|series)\/(\d+)/)[2]);
	}

	async function test() {
		const intervalMs = 200;

		listsProgress = new Progress('Загрузка списков');
		filmsProgress = new Progress('Загрузка фильмов');

		currentProgress = listsProgress;
		listsProgress.start();
		const countLists = 10;
		listsProgress.push(countLists, 1);

		for (let i = 0; i < countLists; i++) {
			listsProgress.increment(`Список #${i}`, `/lists/${i}`);
			await sleep(intervalMs);
		}

		listsProgress.pop();
		listsProgress.finish();

		currentProgress = filmsProgress;
		filmsProgress.start();
		const countFilms = 40;
		filmsProgress.push(countFilms, 1);

		for (let i = 0; i < countFilms; i++) {
			filmsProgress.increment(`Фильм #${i}`, `/films/${i}`);
			await sleep(intervalMs);
		}

		filmsProgress.pop();
		filmsProgress.finish();

		createDownloadButton({ download : 'films.test.json', json : {}, title : 'Скачать фильмы' })
			.appendTo(filmsProgress.buttonPanel)
			.get(0)
			?.click();
	}

	type ButtonOptions = {
		container: JQuery<HTMLElement>;
		icon: string;
		title: string;
		func: () => void;
		top: number;
		fontSize: number;
	}

	function renderButton({ container, icon, title, func, top, fontSize }: ButtonOptions) {
		return $('<a></a>')
			.text(icon)
			.css({ 'cursor' : 'pointer', 'color' : '#ffffff', 'font-size' : `${fontSize}px`, 'top' : `${top}px`, 'position' : 'relative', 'padding' : '4px' })
			.appendTo(container)
			.attr('title', title)
			.on('click', func);
	}

	function setCSS() {
		const css = `
			.download-container {
				position: fixed;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				display: flex;
				flex-direction: column;
				justify-content: center;
				align-items: center;
				z-index: 65535;
				pointer-events: none;
				gap: 1em;
				font-family: 'Graphik Kinopoisk LC Web', Arial, sans-serif;
				font-size: 15px;
				background: rgba(0, 0, 0, 0.5);
			}

			.download-container .box {
				display: flex;
				flex-direction: column;
				justify-content: center;
				align-items: stretch;
				gap: ${boxItem}px;
				padding: ${boxItem}px;
				background: white;
				border: 1px solid black;
				width: ${boxWidth}px;
				box-shadow: 0px 0px 8px 0px black;
				pointer-events: all;
				border-radius: ${boxItem}px;
			}

			.download-container .progress-box {
				border: 1px solid black;
				border-radius: ${boxItem}px;
				height: 48px;
				line-height: 48px;
				position: relative;
				overflow: hidden;
			}

			.download-container .progress-bar {
				background: #ff8800;
				transition: left 0.3s;
				width: 100%;
				height: 100%;
				position: absolute;
				left: -100%;
			}

			.download-container .percent-label {
				position: absolute;
				left: 10px;
				top: 0;
			}

			.download-container .remain-label {
				position: absolute;
				right: 10px;
				top: 0;
			}

			.download-container .logs {
			}

			.download-container .buttons {
				display: flex;
				justify-content: center;
				align-items: center;
				gap: 1em;
			}

			.download-container .button {
				position: relative;
				display: flex;
				justify-content: center;
				align-items: center;
				box-sizing: border-box;
				font-family: inherit;
				font-style: normal;
				text-decoration: none;
				border: none;
				outline: none;
				width: 200px;
				color: #ffffff;
				text-align: center;
				box-shadow: 0px 0px 8px 0px black;
				cursor: pointer;
				height: 48px;
				margin-right: 8px;
				padding: 14px 28px;
				font-size: 15px;
				font-weight: 500;
				line-height: 20px;
				border-radius: ${boxItem}px;
				background: linear-gradient(135deg, #f50 69.93%, #d6bb00);
				transition: background .2s ease, transform .2s ease;
			}

			.download-container .button:hover {
				background: linear-gradient(135deg, #eb4e00 69.91%, #c5ac00);
			}

			.download-container input[type="file"] {
				display: none;
			}
		`;

		$('<style></style>')
			.attr('type', 'text/css')
			.html(css)
			.appendTo('head');
	}

	function renderDownload() {
		const container = $('<div></div>')
			.css({ 'position' : 'fixed', 'top' : '6px', 'right' : 0, 'z-index' : 65535, 'padding' : '4px' })
			.appendTo($('body'));

		if (location.pathname.indexOf('/film/') !== -1 || location.pathname.indexOf('/series/') !== -1) {
			renderButton({ container, icon : '#', title : 'Copy title', func : copyTitle, top : 7, fontSize : 35 });
			renderButton({ container, icon : '{}', title : 'Download film', func : debug.enabled ? test : downloadFilm, top : 0, fontSize : 24 });
		}

		renderButton({ container, icon : '⇩', title : 'Download all', func : downloadAll, top : 3, fontSize : 32 });

		setCSS();
	}

	if (window === top) {
		renderDownload();
	}
})($.noConflict());
