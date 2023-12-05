all;// ==UserScript==
// @name           Kinopoisk - download json
// @namespace      kinopoisk
// @version        4.4.0
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
const trashCategory = 'Корзина';

const typeNames = [ 'Film', 'TvSeries' ] as const;

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
	const filmBases = {} as Record<number, FilmBase>;
	const films     = {} as Record<number, Film>;

	type FilmBaseData = {
		name: string;
		originalName: string;
		year: string;
		time: number;
	}

	type FilmData = FilmBaseData & {
		lists: string[];
		genres: string[];
		related: Array<{
			id: number;
			fillName: string;
		}>;
	}

	class FilmBase implements FilmBaseData {
		id: number;
		name: string;
		originalName: string;
		year: string;
		time: number;

		constructor(id: number) {
			this.id = id;
		}

		fill(data: FilmBaseData) {
			this.name         = data.name;
			this.originalName = data.originalName;
			this.year         = data.year;
			this.time         = data.time;
		}
	}

	class Film extends FilmBase implements FilmData {
		lists: string[];
		genres: string[];
		related: Array<{
			id: number;
			fillName: string;
		}>;

		constructor(id: number) {
			super(id);

			this.lists   = [];
			this.genres  = [];
			this.related = [];
		}
	}

	type JSONRoles = '"DIRECTOR"';

	type JSONFilmData<TTypeName extends typeof typeNames[number]> = {
		__typename: TTypeName;
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
		genres: Array<{ _ref: `Genre:${number}`}>;
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
		description : string | null;
	} & {
		[key in `members({"limit":${number},"role":${JSONRoles}})`]: {
			items: Array<{
				__typename: 'FilmCrewMember',
				person: {
					_ref: `Person:${number}`
				}
			}>
		};
	};

	type JSONData = {
		[key in `Film:${number}`]: JSONFilmData<'Film'>;
	} & {
		[key in `Series:${number}`]: JSONFilmData<'TvSeries'>;
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
	} & Record<string, any>;

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
		private buttonPanel: JQuery<HTMLElement>;

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
			const container      = $(`${parentSelector} > ${cssClass}`);

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

		pop(message: string) {
			this.counts.pop();
			this.weights.pop();
			this.values.pop();
			this.bases.pop();
			this.bases[this.counts.length] = this.value;
			console.debug('pop', message, this);
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
			const width    = `${this.value * 100}%`;
			const percents = `${Math.floor(this.value * 100)}%`;
			this.progressBar.css({ width });
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

	let currentUrl: string        = null;
	let listsProgress: Progress   = null;
	let filmsProgress: Progress   = null;
	let currentProgress: Progress = null;

	function shouldSkipFilm(filmId: number): boolean {
		return !debug.enabled || debug.filmIds.length === 0 || debug.filmIds.indexOf(filmId) !== -1;
	}

	function shouldSkipList(listName: string): boolean {
		return !debug.enabled || debug.listNames.length === 0 || debug.listNames.indexOf(listName) !== -1;
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

	async function get(url: string): Promise<string | null> {
		if (typeof url === 'undefined') {
			// eslint-disable-next-line no-debugger
			debugger;
		}
		currentUrl                  = url;
		let response: string | null = null;

		while (!response) {
			await sleep(pageInterval);

			try {
				response = await $.get(url);
			} catch (ex) {
				// eslint-disable-next-line no-debugger
				debugger;
				console.warn(`Не удалось загрузить страницу '${url}', ещё одна попытка через секунду...`);
			}
		}

		return response;
	}

	async function sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	function parseFilmId(li: JQuery<HTMLElement>) {
		const idString = $(li).data('id');
		const id       = parseInt(idString);
		if (isNaN(id)) {
			throw error(`Id не является целым числом: ${idString}`);
		}
		return id;
	}

	function createFilmBase(el: JQuery<HTMLElement>): FilmBase | null {
		const id = parseFilmId(el);

		if (shouldSkipFilm(id)) {
			return null;
		}

		if (!filmBases[id]) {
			const data    = parseFilmBase(el);
			filmBases[id] = new FilmBase(id);
			filmBases[id].fill(data);
		}

		return filmBases[id];
	}

	function parseFilmBase(el: JQuery<HTMLElement>): FilmBaseData {
		const nameEl = select($(el), '.info .name');
		const desc   = nameEl.next().text().split(/\s*\((.*?)\)\s*/);

		const name         = nameEl.text().trim();
		const originalName = desc[0].trim() || '';
		const year         = desc.length >= 2 ? desc[1].trim().replace(/^\-$/, '') : '';
		const time         = desc.length >= 3 && /^\d+$/.test(desc[2]) ? parseInt(desc[2]) : 0;

		return { name, originalName, year, time };
	}

	function createFilm(id: number, html: string): Film | null {
		if (shouldSkipFilm(id)) {
			return null;
		}

		if (!films[id]) {
			const data = parseFilm(html);
			films[id]  = new Film(id);
			films[id].fill(data);
		}

		return films[id];
	}

	function parseFilm(html: string): FilmData {
		if (!html) {
			throw error('Пустое содержимое страницы фильма');
		}

		if (typeof html.match !== 'function') {
			throw error('Некорректное содержимое страницы фильма');
		}

		const htmlMatch = html.match('__NEXT_DATA__.*?>(.*?)<\/script>');

		if (!htmlMatch) {
			throw error('Не удалось найти объект __NEXT_DATA__ на странице фильма');
		}

		const json = JSON.parse(htmlMatch[1]);
		return parseJSONData(json.props.apolloState.data);
	}

	function parseJSONData(data: JSONData): FilmData {
		const related = Object.keys(json.props.apolloState.data)
			.filter((key) => typeNames.filter((typeName) => key.startsWith(typeName)).length > 0)
			.reduce((obj, key) => {
				for (const typeName of typeNames) {
					if (key.startsWith(typeName)) {
						const id = parseInt(key.replace(`${typeName}:`, ''));
						obj[id]  = { id, key, data : json.props.apolloState.data };
					}
				}
				return obj;
			}, {});

		const currentKey = related[film.id].key;

		const data        = json.props.apolloState.data[currentKey];
		film.name         = data.title.russian || '';
		film.originalName = data.title.original || '';

		if (!film.name && film.originalName) {
			film.name         = film.originalName;
			film.originalName = '';
		}

		film.year = getFilmYear(data);

		film.fullName = film.name;

		if (film.originalName.length > 0 && film.originalName !== film.name) {
			film.fullName += ` (${film.originalName})`;
		}

		film.fullName += ` [${film.year ? film.year : '...'}]`;
		film.fullName  = film.fullName.toFilename();

		film.time   = data.totalDuration || data.seriesDuration || data.duration || 0;
		film.genres = data.genres.map((g) => json.props.apolloState.data[g.__ref].name);

		if (data.__typename === 'TvSeries') {
			film.genres.push('сериал');
		}

		film.genres = film.genres.sort();

		film.lists = data.userData.folders.map((folder) => folder.name).sort();

		film.poster = data.poster && (data.poster.avatarsUrl || data.poster.fallbackUrl);

		if (film.poster) {
			if (film.poster.indexOf('//') === 0) {
				film.poster = `https:${film.poster}`;
			}
			if (!film.poster.match(/\d+x\d+$/)) {
				film.poster = `${film.poster}/600x900`;
			}
		}

		film.description = (data.synopsis || data.shortDescription || '').beautify();
		film.note        = data.userData.note && data.userData.note.value;

		const directorKey  = Object.keys(data).filter((key) => key.startsWith('members') && key.includes('DIRECTOR')).pop();
		const directorRefs = data[directorKey].items.map((item) => item.person.__ref);
		film.directors     = directorRefs.map((ref) => json.props.apolloState.data[ref].name || json.props.apolloState.data[ref].originalName);

		if (!film.lists.includes(trashCategory)) {
			for (const id in related) {
				film.related[id]                = related[id];
				createFilm(id).related[film.id] = film;
			}
		}
	}

	function getFilmYear(data: JSONFilmData<typeof typeNames[number]>): string {
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

	const parseJSONData = (data) => Object.keys(json.props.apolloState.data)
		.filter((key) => typeNames.filter((typeName) => key.startsWith(typeName)).length > 0)
		.map((key) => {

		});

	const buildUrl = (list = { id : defaultListID }, currentPage = 1) => `/mykp/folders/${list.id}/?page=${currentPage}&limit=${perPage}`;

	const parseList = async (list, currentPage) => {
		if (shouldSkipList(list.title)) {
			return;
		}

		const url  = buildUrl(list, currentPage);
		const html = currentPage === 1 && list.firstPageHTML ? list.firstPageHTML : await get(url);
		listsProgress.increment(`${list.title} [${currentPage} of ${list.totalPages}]`, url);

		const els = select($(html), '#itemList li');

		for (const el of els) {
			parseFilm({ el });
		}

		if (currentPage < list.totalPages) {
			await parseList(list, currentPage + 1);
		}
	};

	const downloadAll = async () => {
		if (!(await isConsoleOpened())) {
			alert('Нажмите F12 чтобы открыть консоль и попробуйте ещё раз');
			return;
		}

		listsProgress = new Progress('Загрузка списков');
		filmsProgress = new Progress('Загрузка фильмов');

		currentProgress = listsProgress;
		createListsButtons(listsProgress);
	};

	const downloadAllLists = async () => {
		listsProgress.start();
		const startUrl  = buildUrl();
		const startHTML = await get(startUrl);

		const lists = select($(startHTML), '#folderList li')
			.toArray()
			.map((li) => {
				const id            = $(li).data('id');
				const text          = $(li).text().trim();
				const firstPageHTML = $(li).find('a').attr('href') ? null : startHTML;
				const matches       = text.match(/^\s*(.*?)\s+\((\d+)\)\s*$/);
				const title         = matches[1];
				const totalPages    = Math.ceil(parseInt(matches[2]) / perPage);
				return { id, title, firstPageHTML, totalPages };
			});

		const totalPages = lists.reduce((a, list) => a + (!is.listName(list.title) ? 0 : list.totalPages), 0);
		listsProgress.push(totalPages, 1);

		for (const list of lists) {
			await parseList(list, 1);
		}

		listsProgress.pop();
		listsProgress.finish();

		createDownloadButton({ download : 'lists.json', json : films, title : 'Скачать списки' })
			.appendTo(listsProgress.buttons())
			.get(0)
			.click();

		downloadAllFilms();
	};

	const downloadAllFilms = async () => {
		currentProgress = filmsProgress;
		filmsProgress.start();
		filmsProgress.push(debug.enabled ? debug.filmIds.length : Object.keys(films).length, 1);

		for (const id in films) {
			if (is.filmId(id)) {
				const url = `/film/${id}/`;
				filmsProgress.increment(films[id].name, url);
				const filmHtml = await get(url, films[id].name);
				parseFilmDetails(filmHtml, films[id]);
			}
		}

		filmsProgress.pop();
		filmsProgress.finish();

		createDownloadButton({ download : 'films.json', json : films, title : 'Скачать фильмы' })
			.appendTo(filmsProgress.buttons())
			.get(0)
			.click();
	};

	const createListsButtons = (listsProgress) => {
		const loadButton = $('<a></a>')
			.addClass('button')
			.text('Загрузить списки')
			.appendTo(listsProgress.buttons());

		const startButton = $('<a></a>')
			.addClass('button')
			.text('Начать')
			.appendTo(listsProgress.buttons());

		const fileInput = $('<input type="file" />')
			.appendTo(listsProgress.buttons());

		fileInput.on('change', (ev) => {
			const file   = ev.target.files[0];
			const reader = new FileReader();
			reader.readAsText(file);

			reader.onload = function() {
				try {
					const data = JSON.parse(reader.result);

					for (const id in data) {
						parseFilm({ data : data[id] });
					}
				} catch (ex) {
					listsProgress.error(ex.message);
					return;
				}

				loadButton.hide();
				startButton.hide();

				listsProgress.start();
				listsProgress.finish();

				downloadAllFilms();
			};

			reader.onerror = function() {
				listsProgress.error(reader.error);
			};
		});

		loadButton.on('click', () => {
			fileInput.trigger('click');
		});

		startButton.on('click', () => {
			loadButton.hide();
			startButton.hide();

			downloadAllLists();
		});
	};

	const createDownloadButton = ({ download, json, title }) => $('<a></a>')
		.addClass('button')
		.text(title)
		.attr('href', `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(json))}`)
		.attr('download', download);

	const getListsDropdown = () => select($('body'), 'button[title="Добавить в папку"] + div[class^="styles_dropdownMenu"]', false);

	const downloadFilm = () => {
		const film = getCurrentFilm();
		parseFilmDetails(document.body.innerHTML, film);

		setTimeout(() => {
			if (getListsDropdown().length === 0) {
				$('button[title="Добавить в папку"]').click();
			}

			const folders = select(getListsDropdown(), 'input[type="checkbox"][checked] + span', false);
			film.lists    = folders ? folders.map((i, folder) => $(folder).text()).toArray() : [];

			createDownloadButton({ download : `${film.id}.json`, json : film, text : 'Скачать фильм' }).get(0).click();
		}, 1);
	};

	const copyTitle = () => {
		const film = getCurrentFilm();

		setTimeout(() => {
			parseFilmDetails(document.body.innerHTML, film);
			navigator.clipboard.writeText(film.fullName);
		}, 1);
	};
	const getCurrentFilm = () => {
		const id = parseInt(regex(location.pathname, /^\/(film|series)\/(\d+)/)[2]);
		return createFilm(id);
	};

	const test = async () => {
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

		const downloadJSONLink = createDownloadButton({ download : 'films.test.json', json : {}, title : 'Скачать фильмы' });
		filmsProgress.append(downloadJSONLink);
		downloadJSONLink.get(0).click();
	};

	const renderButton = ({ container, icon, title, func, top, fontSize }) => {
		$('<a></a>')
			.text(icon)
			.css({ 'cursor' : 'pointer', 'color' : '#ffffff', 'font-size' : `${fontSize}px`, 'top' : `${top}px`, 'position' : 'relative', 'padding' : '4px' })
			.appendTo(container)
			.attr('title', title)
			.click(func);
	};

	const setCSS = () => {
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
                font-size: 13px;
                background: rgba(0, 0, 0, 0.5);
            }

            .download-container .box {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: stretch;
                gap: 1em;
                padding: 1em;
                background: white;
                border: 1px solid black;
                width: 80vw;
                box-shadow: 0px 0px 8px 0px black;
                pointer-events: all;
            }

            .download-container .progress-box {
                border: 1px solid black;
                border-radius: 4px;
                line-height: 32px;
                position: relative;
            }

            .download-container .progress-bar {
                border-radius: inherit;
                background: #ff8800;
                transition: width 0.2s;
                width: 0;
                height: 32px;
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
                display: block;
                border: 1px solid black;
                border-radius: 4px;
                min-width: 120px;
                padding: 0 1em;
                background: #ff8800;
                color: #000000;
                text-align: center;
                line-height: 32px;
                text-transform: uppercase;
                text-decoration: none;
                box-shadow: 0px 0px 8px 0px black;
            }

            .download-container .button:hover {
                background: #ffa033;
            }

            .download-container input[type="file"] {
                display: none;
            }
        `;

		$('<style></style>')
			.attr('type', 'text/css')
			.html(css)
			.appendTo('head');
	};

	const renderDownload = () => {
		const container = $('<div></div>')
			.css({ 'position' : 'fixed', 'top' : '6px', 'right' : 0, 'z-index' : 65535, 'padding' : '4px' })
			.appendTo($('body'));

		if (location.pathname.indexOf('/film/') !== -1 || location.pathname.indexOf('/series/') !== -1) {
			renderButton({ container, icon : '#', title : 'Copy title', func : copyTitle, top : 7, fontSize : 35 });
			renderButton({ container, icon : '{}', title : 'Download film', func : debug.enabled ? test : downloadFilm, top : 0, fontSize : 24 });
		}

		renderButton({ container, icon : '⇩', title : 'Download all', func : downloadAll, top : 3, fontSize : 32 });

		setCSS();
	};

	if (window === top) {
		renderDownload();
	}
})($.noConflict());
