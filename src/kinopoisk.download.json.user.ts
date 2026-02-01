/* eslint-disable no-console */
// ==UserScript==
// @name           Kinopoisk - download json
// @namespace      kinopoisk
// @version        6.1.1
// @updateURL      https://anmiles.net/userscripts/kinopoisk.download.json.user.js
// @downloadURL    https://anmiles.net/userscripts/kinopoisk.download.json.user.js
// @description    Click top right arrow icon to download json with all saved movies
// @description:ru Добавляет в верхний правый угол две иконки для скачивания JSON с информацией по фильму и скачивания JSON со всеми фильмами, добавленными в списки
// @author         Anatoliy Oblaukhov
// @match          https://www.kinopoisk.ru/*
// @require        https://code.jquery.com/jquery-3.4.1.min.js
// @grant          none
// ==/UserScript==

import type JQuery from 'jquery';

const debug = {
	enabled  : false,
	listNames: [ 'Детские' ],
	filmIds  : [ 22400, 299, 30070, 258382, 1047843, 46483 ],
};

const defaultListID = 6; // favorites
const perPage       = 100;
const pageInterval  = 1000;

const boxWidth = 1000;
const boxItem  = 24;

declare global {
	interface Number {
		case(zero: string, one: string, two: string): string;
	}

	interface String {
		beautify(): string;
		toFilename(): string;
	}
}

Number.prototype.case = function(this: number, zero: string, one: string, two: string): string {
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
	let currentProgress: Progress | undefined;

	const filmTypeNames = [ 'Film', 'TvSeries' ] as const;
	type FilmTypeName = typeof filmTypeNames[number];

	interface Data {
		id: number;
		name: string;
		originalName: string;
		fullName: string;
		year: string;
		time: number;
	}

	interface ExtendedData {
		related: number[];
		genres: string[];
		lists: string[];
		poster: string | null;
		description: string;
		note: string | null;
		directors: string[];
	}

	interface ListItemData {
		kind: 'listItem';
		data: Data;
	}

	interface RelatedData {
		kind: 'related';
		key: `${FilmTypeName}:${number}`;
		data: Data;
	}

	interface FilmData {
		kind: 'film';
		key: `${FilmTypeName}:${number}`;
		online: string | undefined;
		data: Data;
		extendedData: ExtendedData;
	}

	abstract class FilmBase {
		protected constructor(
			public data: Data,
		) {}

		protected static parseJSON(jsonFilmData: JSONFilmData<FilmTypeName>): Data {
			const id           = jsonFilmData.id;
			const name         = jsonFilmData.title.russian ?? '';
			const originalName = jsonFilmData.title.original ?? '';
			const year         = FilmBase.getYear(jsonFilmData);
			const time         = jsonFilmData.totalDuration ?? jsonFilmData.seriesDuration ?? jsonFilmData.duration ?? 0;

			return { id, year, time, ...FilmBase.getNames({ name, originalName, year }) };
		}

		protected static getNames({ name, originalName, year }: { name: string; originalName: string; year: string }):
		{ name: string; originalName: string; fullName: string } {

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

		private static getYear(data: JSONFilmData<FilmTypeName>): string {
			if (!data.releaseYears || data.releaseYears.length === 0) {
				return data.productionYear ? data.productionYear.toString() : '';
			}

			const start = data.releaseYears[0]?.start;
			const end   = data.releaseYears.slice(-1)[0]?.end;

			if (start == null) {
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
	}

	class ListItem extends FilmBase implements ListItemData {
		static map: Record<number, ListItem> = {};

		private constructor(
			public kind: 'listItem',
			data: Data,
		) {
			super(data);
		}

		static is(item: unknown): item is ListItem {
			return typeof item === 'object' && item !== null && 'kind' in item && item.kind === 'listItem';
		}

		static fromElement(id: number, li: HTMLElement): ListItem {
			return ListItem.create(id, () => {
				const nameEl = select($(li), '.info .name');
				const desc   = nameEl.next().text().split(/\s*\((.*?)\)\s*/);

				const name         = nameEl.text().trim();
				const originalName = desc[0]!.trim() || '';
				const year         = desc.length >= 2 ? desc[1]!.trim().replace(/^-$/, '') : '';
				const time         = desc.length >= 3 && /^\d+$/.test(desc[2]!) ? parseInt(desc[2]!) : 0;

				return { kind: 'listItem', data: { id, year, time, ...FilmBase.getNames({ name, originalName, year }) } };
			});
		}

		static fromJSON(id: number, film: ListItem): ListItem {
			return ListItem.create(id, () => film);
		}

		private static create(id: number, getData: () => ListItemData): ListItem {
			const listItem = ListItem.map[id];

			if (listItem) {
				return listItem;
			}

			const { kind, data } = getData();
			return ListItem.map[id] = new ListItem(kind, data);
		}
	}

	class Related extends FilmBase implements RelatedData {
		static map: Record<number, Related> = {};

		private constructor(
			public kind: 'related',
			public key: `${FilmTypeName}:${number}`,
			data: Data,
		) {
			super(data);
		}

		static is(item: unknown): item is Related {
			return typeof item === 'object' && item !== null && 'kind' in item && item.kind === 'related';
		}

		static fromJSON(key: `${FilmTypeName}:${number}`, jsonFilmData: JSONFilmData<FilmTypeName>): Related {
			return Related.create(jsonFilmData.id, () => ({
				kind: 'related',
				key,
				data: FilmBase.parseJSON(jsonFilmData),
			}));
		}

		private static create(id: number, getData: () => RelatedData): Related {
			const related = Related.map[id];

			if (related) {
				return related;
			}

			const { kind, key, data } = getData();
			return Related.map[id] = new Related(kind, key, data);
		}
	}

	class Film extends FilmBase implements FilmData {
		static map: Record<number, Film> = {};

		private constructor(
			public kind: 'film',
			public key: `${FilmTypeName}:${number}`,
			public online: string | undefined,
			data: Data,
			public extendedData: ExtendedData,
		) {
			super(data);
		}

		static is(item: unknown): item is Film {
			return typeof item === 'object' && item !== null && 'kind' in item && item.kind === 'film';
		}

		static fromHTML(id: number, html: string): Film {
			return Film.create(id, () => {
				if (!html) {
					error('Пустое содержимое страницы фильма');
				}

				if (typeof html.match !== 'function') {
					error('Некорректное содержимое страницы фильма');
				}

				const htmlMatch = html.match(/__NEXT_DATA__.*?>(.*?)<\/script>/);

				if (!htmlMatch) {
					error('Не удалось найти объект __NEXT_DATA__ на странице фильма');
				}

				function isRecord(obj: unknown): obj is Record<string, unknown> {
					return typeof obj === 'object' && obj !== null;
				}

				function jsonSelect<T>(text: string, keys: string[]): T {
					const json = JSON.parse(text) as unknown;
					let value  = json;

					for (const key of keys) {
						if (!isRecord(value)) {
							error(`Значение не является объектом (попытка получить ${key} из списка ${keys.join(', ')})`);
						}

						if (!(key in value)) {
							error(`Значение не является объектом (попытка получить ${key} из списка ${keys.join(', ')})`);
						}

						value = value[key];
					}

					// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
					return value as T;
				}

				const jsonData = jsonSelect<JSONData>(htmlMatch[1]!, [ 'props', 'apolloState', 'data' ]);

				const related = Film.getRelated(jsonData);

				const relatedFilm = Related.map[id];
				if (!relatedFilm) {
					error('Не удалось найти связанные фильмы');
				}

				const key = relatedFilm.key;

				const watchButton = select($(html), 'span:contains("Смотреть фильм")', false)[0] || select($(html), 'span:contains("Смотреть сериал")', false)[0];
				const online      = watchButton?.closest('a')?.href.split('?')[0];

				const jsonFilmData = jsonData[key];
				if (!jsonFilmData) {
					throw new Error(`Cannot find jsonFilmData by key ${key}`);
				}

				const genres      = Film.getGenres(jsonFilmData, jsonData);
				const lists       = Film.getLists(jsonFilmData);
				const poster      = Film.getPoster(jsonFilmData);
				const description = Film.getDescription(jsonFilmData);
				const note        = Film.getNote(jsonFilmData);
				const directors   = Film.getMembers(jsonFilmData, jsonData, '"DIRECTOR"');

				return {
					kind        : 'film',
					key,
					online,
					data        : FilmBase.parseJSON(jsonFilmData),
					extendedData: { related, genres, lists, poster, description, note, directors },
				};
			});
		}

		private static create(id: number, getData: () => FilmData): FilmData {
			const film = Film.map[id];
			if (film) {
				return film;
			}

			const { kind, key, online, data, extendedData } = getData();
			return Film.map[id] = new Film(kind, key, online, data, extendedData);
		}

		private static getRelated(data: JSONData): number[] {
			return Object.keys(data)
				.filter(Film.isFilmKey)
				.map((key) => {
					const film = data[key]!;
					Related.fromJSON(key, film);
					return film.id;
				});
		}

		private static isFilmKey(key: string): key is `${FilmTypeName}:${number}` {
			const [ typeName, idString ] = key.split(':');

			return Film.isFilmTypeName(typeName!) && !isNaN(Number(idString));
		}

		private static isFilmTypeName(typeName: string): typeName is FilmTypeName {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
			return filmTypeNames.includes(typeName as FilmTypeName);
		}

		private static getGenres(jsonFilmData: JSONFilmData<FilmTypeName>, jsonData: JSONData): string[] {
			const genres = [] as string[];

			for (const { __ref } of jsonFilmData.genres) {
				const genre = jsonData[__ref];

				if (!genre) {
					error(`Не удалось найти связь '${__ref}' в данных #${jsonFilmData.id}`);
				}

				genres.push(genre.name);
			}

			if (jsonFilmData.__typename === 'TvSeries') {
				genres.push('сериал');
			}

			return genres.sort();
		}

		private static getLists(jsonFilmData: JSONFilmData<FilmTypeName>): string[] {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
			const key = Object.keys(jsonFilmData.userData)
				.find((key) => key.startsWith('userFolders')) as `userFolders({"limit":${number},"offset":${number}})`;
			return jsonFilmData.userData[key]!.items.map((folder) => folder.name).sort();
		}

		private static getPoster(jsonFilmData: JSONFilmData<FilmTypeName>): string | null {
			let poster = jsonFilmData.poster && (jsonFilmData.poster.avatarsUrl ?? jsonFilmData.poster.fallbackUrl);

			if (poster) {
				if (poster.startsWith('//')) {
					poster = `https:${poster}`;
				}
				if (!poster.match(/\d+x\d+$/)) {
					poster = `${poster}/600x900`;
				}
			}

			return poster;
		}

		private static getDescription(jsonFilmData: JSONFilmData<FilmTypeName>): string {
			return (jsonFilmData.synopsis ?? jsonFilmData.shortDescription ?? '').beautify();
		}

		private static getNote(jsonFilmData: JSONFilmData<FilmTypeName>): string | null {
			return jsonFilmData.userData.note?.value ?? null;
		}

		private static getMembers<JSONRole extends JSONRoles>(
			jsonFilmData: JSONFilmData<FilmTypeName>,
			jsonData: JSONData,
			jsonRole: JSONRole,
		): string[]  {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
			const key   = Object.keys(jsonFilmData).find((key) => key.startsWith('members') && key.includes(jsonRole)) as `members({"limit":${number},"role":${JSONRole}})`;
			const refs  = jsonFilmData[key]!.items.map((item) => item.person.__ref);
			const names = [];

			for (const ref of refs) {
				const member = jsonData[ref];

				if (!member) {
					error(`Не удалось найти связь '${ref}' в данных #${jsonFilmData.id}`);
				}

				names.push(member.name || member.originalName);
			}

			return names;
		}
	}

	interface List {
		id: number;
		title: string;
		firstPageHTML: string | null;
		totalPages: number;
	}

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
		}>;
		duration: number | null;
		totalDuration: number | null;
		seriesDuration: number | null;
		genres: Array<{ __ref: `Genre:${number}` }>;
		userData: {
			__typename: 'MovieUserData';
			note: {
				__typename: 'UserMovieNote';
				value: string;
			} | null;
		} & {
			[key in `userFolders({"limit":${number},"offset":${number}})`]: {
				items: Array<{
					__typename: 'Folder';
					id: number;
					name: string;
				}>;
			};
		};
		poster: {
			__typename: 'Image';
			avatarsUrl: string | null;
			fallbackUrl: string | null;
		} | null;
		synopsis: string | null;
		shortDescription: string | null;
	} & {
		[key in `members({"limit":${number},"role":${JSONRoles}})`]: {
			items: Array<{
				__typename: 'FilmCrewMember';
				person: {
					__ref: `Person:${number}`;
				};
			}>;
		};
	};

	type JSONData = {
		[key in `Film:${number}`]: JSONFilmData<'Film'>;
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
	} & {
		[key in `TvSeries:${number}`]: JSONFilmData<'TvSeries'>;
	};

	class Progress {
		buttonPanel: JQuery;
		startTime: Date;
		counts: number[];
		weights: number[];
		values: number[];
		bases: number[];
		value: number;
		private readonly container: JQuery;
		private readonly box: JQuery;
		private readonly progressBox: JQuery;
		private readonly progressBar: JQuery;
		private readonly percentLabel: JQuery;
		private readonly remainLabel: JQuery;
		private readonly logPanel: JQuery;
		private readonly logText: JQuery;
		private readonly logLink: JQuery;

		constructor(
			public title: string,
		) {
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

			this.counts    = [];
			this.weights   = [];
			this.values    = [];
			this.bases     = [];
			this.startTime = new Date();
			this.value     = 0;

			console.debug('__construct', title);
			this.print(title);
		}

		private static getContainer(): JQuery {
			const cssClass       = 'download-container';
			const parentSelector = 'body';
			const container      = $(`${parentSelector} > .${cssClass}`);

			return container.length === 0
				? $('<div></div>').addClass(cssClass).appendTo($(parentSelector))
				: container;
		}

		start(): void {
			this.counts    = [];
			this.weights   = [];
			this.values    = [];
			this.bases     = [];
			this.startTime = new Date();
			console.debug('start', this);
			this.render();
		}

		finish(): void {
			this.values[0] = this.counts[0] = this.weights[0] = 1;
			this.bases[0]  = 0;
			console.debug('finish', this);
			this.print(`${this.title} - готово!`);
			this.render();
		}

		close(): void {
			this.container.hide();
		}

		push(count: number, weight: number): void {
			this.counts.push(count);
			this.weights.push(weight);
			this.values.push(0);
			this.bases.push(0);
			console.debug('push', this);
		}

		pop(): void {
			this.counts.pop();
			this.weights.pop();
			this.values.pop();
			this.bases.pop();
			this.bases[this.counts.length] = this.value;
			console.debug('pop', this);
		}

		increment(itemTitle: string, itemLink: string): void {
			if (this.values.length === 0) {
				return;
			}

			this.values[this.values.length - 1]!++;
			console.debug('increment', itemTitle, itemLink, this);
			this.print(`${this.title} [${this.values[this.values.length - 1]} из ${this.counts[this.counts.length - 1]}]`);
			this.link(itemTitle, itemLink);
			this.render();
		}

		print(message: string, isError?: boolean): void {
			(isError ? console.error : console.log)(message);
			this.logPanel.css({ color: isError ? 'red' : 'black' });
			this.logText.text(message);
			this.logLink.html('');
		}

		link(itemTitle: string, itemLink: string): void {
			$('<span></span>').html('&nbsp;-&nbsp;').appendTo(this.logLink);
			$('<a></a>').attr('href', itemLink).attr('target', '_blank').text(itemTitle).appendTo(this.logLink);
		}

		error(message: string): void {
			this.print(message, true);
		}

		render(): void {
			this.value     = this.bases.reduce((a: number, b: number) => a + b, 0);
			let multiplier = 1;

			for (let i = 0; i < this.counts.length; i++) {
				multiplier /= this.counts[i]! / this.weights[i]!;
				this.value += this.values[i]! * multiplier;
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

		private formatTime(ms: number): string {
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
	}

	function error(ex: string): never {
		if (currentProgress) {
			currentProgress.error(`Не удалось обработать страницу ${currentUrl}. Ошибка: ${ex}`);
		}
		// eslint-disable-next-line no-debugger
		debugger;
		throw new Error(ex);
	}

	function select(context: JQuery, selector: string, throwIfNotExists = true): JQuery {
		const obj = context.find(selector);
		if (obj.length === 0 && throwIfNotExists) {
			error(`Не удалось найти элемент по селектору ${selector}`);
		}
		return obj;
	}

	function regex(text: string, pattern: RegExp): RegExpExecArray {
		const match = pattern.exec(text);

		if (!match) {
			error(`Не удалось найти текст по регулярному выражению ${pattern}`);
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
				// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
				response = await $.get(url) as string | null;
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

	async function sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	function parseFilmId(li: HTMLElement): number {
		const idString = String($(li).data('id'));
		const id       = parseInt(idString);
		if (isNaN(id)) {
			error(`Id не является целым числом: ${idString}`);
		}
		return id;
	}

	function shouldSkipFilm(filmId: number): boolean {
		return debug.enabled && debug.filmIds.length > 0 && !debug.filmIds.includes(filmId);
	}

	function shouldSkipList(listName: string): boolean {
		return debug.enabled && debug.listNames.length > 0 && !debug.listNames.includes(listName);
	}

	function downloadAll(): void {
		listsProgress = new Progress('Загрузка списков');
		filmsProgress = new Progress('Загрузка фильмов');

		currentProgress = listsProgress;

		const startButton = $('<a></a>')
			.addClass('button')
			.text('Начать')
			.appendTo(listsProgress.buttonPanel);

		const loadButton = $('<a></a>')
			.addClass('button secondary')
			.text('Добавить уже загруженные списки')
			.appendTo(listsProgress.buttonPanel);

		const fileInput = createFileInput({
			success: (contents: string) => {
				try {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
					const data = JSON.parse(contents) as { lists: Record<number, unknown> };

					if (!('lists' in data)) {
						error('Загруженный файл не является корректным файлом списков');
					}

					for (const item of Object.values(data.lists)) {
						if (!ListItem.is(item)) {
							continue;
						}

						if (shouldSkipFilm(item.data.id)) {
							continue;
						}

						ListItem.fromJSON(item.data.id, item);
					}
				} catch (ex) {
					listsProgress.error(String(ex));
					return;
				}

				loadButton.hide();
				startButton.hide();

				listsProgress.start();
				listsProgress.finish();

				void downloadAllFilms();
			},
			fail: (message: string) => {
				listsProgress.error(message);
			},
		}).appendTo(listsProgress.buttonPanel);

		loadButton.on('click', () => {
			fileInput.trigger('click');
		});

		startButton.on('click', () => {
			loadButton.hide();
			startButton.hide();

			void downloadAllLists();
		});
	}

	function createFileInput({ success, fail }: { success: (contents: string) => void; fail: (message: string) => void }): JQuery {
		const fileInput = $('<input type="file" />');

		fileInput.on('change', (ev) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
			const files = (ev.target as HTMLInputElement).files;
			if (!files) {
				return;
			}

			const reader = new FileReader();
			reader.readAsText(files[0]!);

			reader.onload = function() {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
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

	async function downloadAllLists(): Promise<void> {
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

		createDownloadButton({ download: 'lists.json', json: { lists: ListItem.map }, title: 'Скачать списки' })
			.appendTo(listsProgress.buttonPanel)
			.get(0)
			?.click();

		void downloadAllFilms();
	}

	function createList(li: HTMLElement, startHTML: string): List {
		const id            = parseInt(String($(li).data('id')));
		const text          = $(li).text().trim();
		const firstPageHTML = $(li).find('a').attr('href') ? null : startHTML;
		const matches       = text.match(/^\s*(.*?)(\s+\((\d+)\)\s*)?$/);

		if (!matches) {
			error(`Text '${text}' doesn't match regexp`);
		}

		const title      = matches[1]!;
		const totalPages = matches[3] ? Math.ceil(parseInt(matches[3]) / perPage) : 0;
		return { id, title, firstPageHTML, totalPages };
	}

	async function parseList(list: List, currentPage: number): Promise<void> {
		if (shouldSkipList(list.title)) {
			return;
		}

		const url  = buildUrl(list, currentPage);
		const html = currentPage === 1 && list.firstPageHTML ? list.firstPageHTML : await get(url);
		listsProgress.increment(`${list.title} [${currentPage} of ${list.totalPages}]`, url);

		const listItems = select($(html), '#itemList li', false);

		for (const listItem of listItems) {
			const id = parseFilmId(listItem);

			if (shouldSkipFilm(id)) {
				continue;
			}

			ListItem.fromElement(id, listItem);
		}

		if (currentPage < list.totalPages) {
			await parseList(list, currentPage + 1);
		}
	}

	function buildUrl(list = { id: defaultListID }, currentPage = 1): string {
		return `/mykp/folders/${list.id}/?page=${currentPage}&limit=${perPage}`;
	}

	async function downloadAllFilms(): Promise<void> {
		currentProgress = filmsProgress;
		filmsProgress.start();
		filmsProgress.push(debug.enabled ? debug.filmIds.length : Object.keys(ListItem.map).length, 1);

		for (const listItem of Object.values(ListItem.map)) {
			if (shouldSkipFilm(listItem.data.id)) {
				continue;
			}

			const url = `/film/${listItem.data.id}/`;
			filmsProgress.increment(listItem.data.name, url);
			const html = await get(url);
			Film.fromHTML(listItem.data.id, html);
		}

		filmsProgress.pop();
		filmsProgress.finish();

		createDownloadButton({ download: 'films.json', json: { films: Film.map, related: Related.map }, title: 'Скачать фильмы' })
			.appendTo(filmsProgress.buttonPanel)
			.get(0)
			?.click();
	}

	function downloadFilm(): void {
		const id   = getCurrentFilmId();
		const film = Film.fromHTML(id, document.body.innerHTML);

		setTimeout(() => {
			if (getListsDropdown().length === 0) {
				$('button[title="Добавить в папку"]').trigger('click');
			}

			const folders = select(getListsDropdown(), 'input[type="checkbox"][checked] + span', false);

			film.extendedData.lists = folders.length > 0
				? folders.map((_i, folder) => $(folder).text()).toArray()
				: [];

			createDownloadButton({ download: `${film.data.id}.json`, json: film, title: 'Скачать фильм' })
				.get(0)
				?.click();
		}, 1);
	}

	function createDownloadButton({ download, json, title }: { download: string; json: unknown; title: string }): JQuery {
		return $('<a></a>')
			.addClass('button')
			.text(title)
			.attr('href', `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(json, null, '    '))}`)
			.attr('download', download);
	}

	function getListsDropdown(): JQuery {
		return select($('body'), 'button[title="Добавить в папку"] + div[class^="styles_dropdownMenu"]', false);
	}

	function copyTitle(): void {
		const id = getCurrentFilmId();

		setTimeout(() => {
			const film = Film.fromHTML(id, document.body.innerHTML);
			void navigator.clipboard.writeText(film.data.fullName);
		}, 1);
	}

	function getCurrentFilmId(): number {
		return parseInt(regex(location.pathname, /^\/(film|series)\/(\d+)/)[2]!);
	}

	function createTestFilm(id: number): FilmData {
		return {
			kind  : 'film',
			key   : `Film:${id}`,
			online: `https://hd.kinopoisk.ru/film${id}`,
			data  : {
				id,
				name        : `Test film ${id}`,
				originalName: '',
				fullName    : `Test film ${id} [200${id}]`,
				year        : `200${id}`,
				time        : 90 + id,
			},
			extendedData: {
				related    : [ 100 + id ],
				description: `Test film ${id} description\nNext line\n\nEnd`,
				genres     : [ 'genre1', 'genre2', `genre${id}` ],
				lists      : [ 'First list', 'Second list' ],
				note       : `User note ${id}\nNext line\n\nEnd`,
				poster     : `https://example.com/poster_${id}.jpg`,
				directors  : [ 'Ivan Ivanov', 'John Smith' ],
			},
		};
	}

	async function test(): Promise<void> {
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

		createDownloadButton({
			download: 'films.test.json',
			json    : {
				films: {
					['1']: createTestFilm(1),
					['2']: createTestFilm(2),
				},
			},
			title: 'Скачать фильмы',
		})
			.appendTo(filmsProgress.buttonPanel)
			.get(0)
			?.click();
	}

	interface ButtonOptions {
		container: JQuery;
		icon: string;
		title: string;
		func: () => void;
		top: number;
		fontSize: number;
	}

	function renderButton({ container, icon, title, func, top, fontSize }: ButtonOptions): JQuery {
		return $('<a></a>')
			.text(icon)
			.css({ 'cursor': 'pointer', 'color': '#ffffff', 'font-size': `${fontSize}px`, 'top': `${top}px`, 'position': 'relative', 'padding': '4px' })
			.appendTo(container)
			.attr('title', title)
			.on('click', func);
	}

	function setCSS(): void {
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
				font-family: "Graphik Kinopoisk LC Web", "Arial", sans-serif;
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
				min-width: 200px;
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
				background: linear-gradient(135deg, #eb4e00 69.91%, #c5ac00);
				transition: background .2s ease, transform .2s ease;
			}

			.download-container .button:hover {
				background: linear-gradient(135deg, #f50 69.93%, #d6bb00);
			}

			.download-container .button.secondary {
				background: none;
				color: #eb4e00;
			}

			.download-container .button.secondary:hover {
				filter: brightness(1.5);
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

	function renderDownload(): void {
		const container = $('<div></div>')
			.css({ 'position': 'fixed', 'top': '6px', 'right': 0, 'z-index': 65535, 'padding': '4px' })
			.appendTo($('body'));

		if (location.pathname.includes('/film/') || location.pathname.includes('/series/')) {
			renderButton({ container, icon: '#', title: 'Copy title', func: copyTitle, top: 7, fontSize: 35 });
			renderButton({ container, icon: '{}', title: 'Download film', func: debug.enabled ? test : downloadFilm, top: 0, fontSize: 24 });
		}

		renderButton({ container, icon: '⇩', title: 'Download all', func: downloadAll, top: 3, fontSize: 32 });

		setCSS();
	}

	if (window === top) {
		renderDownload();
	}
})($.noConflict());
