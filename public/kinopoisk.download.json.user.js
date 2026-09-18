/* eslint-disable no-console */
// ==UserScript==
// @name           Kinopoisk - download json
// @namespace      kinopoisk
// @version        6.2.0
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
    enabled: false,
    listNames: ['Детские'],
    filmIds: [22400, 299, 30070, 258382, 1047843, 46483],
};
const defaultListID = 6; // favorites
const perPage = 100;
const pageInterval = 1000;
const boxWidth = 1000;
const boxItem = 24;
const systemFolders = {
    watched: 'Любимые фильмы',
    planned: 'Буду смотреть',
    notes: 'Примечания',
};
Number.prototype.case = function (zero, one, two) {
    let num = Math.abs(this);
    num %= 100;
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
String.prototype.beautify = function () {
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
String.prototype.toFilename = function () {
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
    let currentUrl;
    let listsProgress;
    let filmsProgress;
    let watchedProgress;
    let plannedProgress;
    let currentProgress;
    const filmTypeNames = ['Film', 'TvSeries'];
    class KPError extends Error {
        constructor(message) {
            super(message);
            if (currentProgress) {
                currentProgress.error(`Не удалось обработать страницу ${currentUrl}. Ошибка: ${message}`);
            }
            // eslint-disable-next-line no-debugger
            debugger;
        }
    }
    class HTMLParser {
        constructor(state) {
            this.state = state;
        }
        static parse(html, url) {
            if (!html) {
                throw new KPError(`Пустое содержимое html-страницы ${url}`);
            }
            if (typeof html.match !== 'function') {
                throw new KPError(`Некорректное содержимое html-страницы ${url}`);
            }
            const htmlMatch = html.match(/__ssr_initial_data\s*=\s*(.*?);?<\/script>/);
            if (!htmlMatch) {
                throw new KPError(`Не удалось найти объект __ssr_initial_data на html-странице ${url}`);
            }
            const state = this.jsonSelect(htmlMatch[1], ['apolloState']);
            return new HTMLParser(state);
        }
        static isRecord(obj) {
            return typeof obj === 'object' && obj !== null;
        }
        static jsonSelect(text, keys) {
            const json = JSON.parse(text);
            let value = json;
            for (const key of keys) {
                if (!this.isRecord(value)) {
                    throw new KPError(`Значение является null (попытка получить ${key} из списка ${keys.join(', ')})`);
                }
                if (!(key in value)) {
                    throw new KPError(`Значение не является объектом (попытка получить ${key} из списка ${keys.join(', ')})`);
                }
                value = value[key];
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
            return value;
        }
        getData(filmKey) {
            var _a, _b, _c, _d, _e;
            const jsonFilmData = this.getFilm(filmKey);
            const id = jsonFilmData.id;
            const name = (_a = jsonFilmData.title.russian) !== null && _a !== void 0 ? _a : '';
            const originalName = (_b = jsonFilmData.title.original) !== null && _b !== void 0 ? _b : '';
            const year = getYear(jsonFilmData);
            const time = (_e = (_d = (_c = jsonFilmData.totalDuration) !== null && _c !== void 0 ? _c : jsonFilmData.seriesDuration) !== null && _d !== void 0 ? _d : jsonFilmData.duration) !== null && _e !== void 0 ? _e : 0;
            return { id, year, time, ...getNames({ name, originalName, year }) };
        }
        getDescription(filmKey) {
            var _a, _b;
            const jsonFilmData = this.getFilm(filmKey);
            return ((_b = (_a = jsonFilmData.synopsis) !== null && _a !== void 0 ? _a : jsonFilmData.shortDescription) !== null && _b !== void 0 ? _b : '').beautify();
        }
        getGenres(filmKey) {
            const jsonFilmData = this.getFilm(filmKey);
            const genres = this.dereference(jsonFilmData.genres).map(({ name }) => name);
            if (jsonFilmData.__typename === 'TvSeries') {
                genres.push('сериал');
            }
            return genres.sort();
        }
        getLists(filmKey) {
            const jsonFilmData = this.getFilm(filmKey);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
            const key = Object.keys(jsonFilmData.userData)
                .find((key) => key.startsWith('userFolders'));
            const links = jsonFilmData.userData[key].items;
            const lists = this.dereference(links).map(({ name }) => name);
            if (jsonFilmData.userData.isFavorite !== jsonFilmData.userData.watchStatuses.watched.value && !lists.includes('Корзина')) {
                console.warn(`[KP DEBUG] #${jsonFilmData.id} не в корзине, но isFavorite: ${jsonFilmData.userData.isFavorite}, a watched: ${jsonFilmData.userData.watchStatuses.watched.value}`);
            }
            if (jsonFilmData.userData.isPlannedToWatch === jsonFilmData.userData.watchStatuses.watched.value && !lists.includes('Корзина')) {
                console.warn(`[KP DEBUG] #${jsonFilmData.id} не в корзине, но isPlannedToWatch: ${jsonFilmData.userData.isPlannedToWatch} и watched: ${jsonFilmData.userData.watchStatuses.watched.value}`);
            }
            if (jsonFilmData.userData.isFavorite) {
                lists.push(systemFolders.watched);
            }
            if (jsonFilmData.userData.isPlannedToWatch) {
                lists.push(systemFolders.planned);
            }
            if (jsonFilmData.userData.note) {
                lists.push(systemFolders.notes);
            }
            return lists;
        }
        getMembers(filmKey, jsonRole) {
            const jsonFilmData = this.getFilm(filmKey);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
            const key = Object.keys(jsonFilmData).find((key) => key.startsWith('members') && key.includes(jsonRole));
            const links = jsonFilmData[key].items.map((item) => item.person);
            return this.dereference(links).map((member) => member.name || member.originalName);
        }
        getNote(filmKey) {
            var _a, _b;
            const jsonFilmData = this.getFilm(filmKey);
            return (_b = (_a = jsonFilmData.userData.note) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : null;
        }
        getPoster(filmKey) {
            var _a;
            const jsonFilmData = this.getFilm(filmKey);
            let poster = jsonFilmData.poster && ((_a = jsonFilmData.poster.avatarsUrl) !== null && _a !== void 0 ? _a : jsonFilmData.poster.fallbackUrl);
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
        getProfileAlias() {
            const userProfile = this.dereference([this.state.ROOT_QUERY.userProfile])[0];
            return userProfile.social.alias.defaultValue.value;
        }
        getRelatedFilms() {
            return Object.keys(this.state)
                .filter((key) => this.isFilmKey(key))
                .map((filmKey) => {
                const jsonFilmData = this.getFilm(filmKey);
                return [filmKey, jsonFilmData];
            });
        }
        getFilm(filmKey) {
            const jsonFilmData = this.state[filmKey];
            if (!jsonFilmData) {
                throw new KPError(`Не удалось найти jsonFilmData по ключу ${filmKey}`);
            }
            return jsonFilmData;
        }
        isFilmKey(key) {
            const [typeName, idString] = key.split(':');
            return this.isFilmTypeName(typeName) && !isNaN(Number(idString));
        }
        isFilmTypeName(typeName) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
            return filmTypeNames.includes(typeName);
        }
        dereference(links) {
            const result = [];
            for (const { __ref } of links) {
                const data = this.state[__ref];
                if (!data) {
                    throw new KPError(`Не удалось найти связь '${__ref}'`);
                }
                result.push(data);
            }
            return result;
        }
    }
    class ListItem {
        constructor(kind, data) {
            this.kind = kind;
            this.data = data;
        }
        static is(item) {
            return typeof item === 'object' && item !== null && 'kind' in item && item.kind === 'listItem';
        }
        static fromElement(id, li) {
            return ListItem.create(id, () => {
                const nameEl = select($(li), '.info .name');
                const desc = nameEl.next().text().split(/\s*\((.*?)\)\s*/);
                const name = nameEl.text().trim();
                const originalName = desc[0].trim() || '';
                const year = desc.length >= 2 ? desc[1].trim().replace(/^-$/, '') : '';
                const time = desc.length >= 3 && /^\d+$/.test(desc[2]) ? parseInt(desc[2]) : 0;
                return { kind: 'listItem', data: { id, year, time, ...getNames({ name, originalName, year }) } };
            });
        }
        static fromJSON(id, film) {
            return ListItem.create(id, () => film);
        }
        static create(id, getData) {
            const listItem = ListItem.map[id];
            if (listItem) {
                return listItem;
            }
            const { kind, data } = getData();
            return ListItem.map[id] = new ListItem(kind, data);
        }
    }
    ListItem.map = {};
    class Watched {
        constructor(kind, id, name, href, rate) {
            this.kind = kind;
            this.id = id;
            this.name = name;
            this.href = href;
            this.rate = rate;
        }
        static is(item) {
            return typeof item === 'object' && item !== null && 'kind' in item && item.kind === 'watched';
        }
        static create(data) {
            this.map[data.id] = { ...data, kind: 'watched' };
            return this.map[data.id];
        }
    }
    Watched.map = {};
    class Planned {
        constructor(kind, id, name, href) {
            this.kind = kind;
            this.id = id;
            this.name = name;
            this.href = href;
        }
        static is(item) {
            return typeof item === 'object' && item !== null && 'kind' in item && item.kind === 'planned';
        }
        static create(data) {
            this.map[data.id] = { ...data, kind: 'planned' };
            return this.map[data.id];
        }
    }
    Planned.map = {};
    class Related {
        constructor(kind, key, data) {
            this.kind = kind;
            this.key = key;
            this.data = data;
        }
        static is(item) {
            return typeof item === 'object' && item !== null && 'kind' in item && item.kind === 'related';
        }
        static create(id, getData) {
            const related = Related.map[id];
            if (related) {
                return related;
            }
            const { kind, key, data } = getData();
            return Related.map[id] = new Related(kind, key, data);
        }
    }
    Related.map = {};
    class Film {
        constructor(kind, key, online, data, extendedData) {
            this.kind = kind;
            this.key = key;
            this.online = online;
            this.data = data;
            this.extendedData = extendedData;
        }
        static is(item) {
            return typeof item === 'object' && item !== null && 'kind' in item && item.kind === 'film';
        }
        static fromHTML(id, html, url) {
            return Film.create(id, () => {
                var _a;
                const htmlParser = HTMLParser.parse(html, url);
                const allFilms = htmlParser.getRelatedFilms();
                for (const [filmKey, jsonFilmData] of allFilms) {
                    Related.create(jsonFilmData.id, () => ({
                        kind: 'related',
                        key: filmKey,
                        data: htmlParser.getData(filmKey),
                    }));
                }
                const relatedFilm = Related.map[id];
                if (!relatedFilm) {
                    throw new KPError('Не удалось найти связанные фильмы');
                }
                const key = relatedFilm.key;
                const related = allFilms.map(([, { id }]) => id);
                const watchButton = select($(html), 'span:contains("Смотреть фильм")', false)[0]
                    || select($(html), 'span:contains("Продолжить просмотр")', false)[0]
                    || select($(html), 'span:contains("Смотреть сериал")', false)[0];
                const online = (_a = watchButton === null || watchButton === void 0 ? void 0 : watchButton.closest('a')) === null || _a === void 0 ? void 0 : _a.href.split('?')[0];
                const genres = htmlParser.getGenres(key);
                const lists = htmlParser.getLists(key);
                const poster = htmlParser.getPoster(key);
                const description = htmlParser.getDescription(key);
                const note = htmlParser.getNote(key);
                const directors = htmlParser.getMembers(key, '"DIRECTOR"');
                const data = htmlParser.getData(key);
                return {
                    kind: 'film',
                    key,
                    online,
                    data,
                    extendedData: { related, genres, lists, poster, description, note, directors },
                };
            });
        }
        static create(id, getData) {
            const film = Film.map[id];
            if (film) {
                return film;
            }
            const { kind, key, online, data, extendedData } = getData();
            return Film.map[id] = new Film(kind, key, online, data, extendedData);
        }
    }
    Film.map = {};
    class Progress {
        constructor(title) {
            this.title = title;
            this.container = Progress.getContainer();
            this.box = $('<div></div>').addClass('box').appendTo(this.container);
            this.progressBox = $('<div></div>').addClass('progress-box').appendTo(this.box);
            this.progressBar = $('<div></div>').addClass('progress-bar').appendTo(this.progressBox);
            this.percentLabel = $('<span></span>').addClass('percent-label').appendTo(this.progressBox);
            this.remainLabel = $('<span></span>').addClass('remain-label').appendTo(this.progressBox);
            this.logPanel = $('<div></div>').addClass('logs').appendTo(this.box);
            this.logText = $('<span></span>').appendTo(this.logPanel);
            this.logLink = $('<span></span>').appendTo(this.logPanel);
            this.buttonPanel = $('<div></div>').addClass('buttons').appendTo(this.box);
            this.counts = [];
            this.weights = [];
            this.values = [];
            this.bases = [];
            this.startTime = new Date();
            this.value = 0;
            console.debug('__construct', title);
            this.print(title);
        }
        static getContainer() {
            const cssClass = 'download-container';
            const parentSelector = 'body';
            const container = $(`${parentSelector} > .${cssClass}`);
            return container.length === 0
                ? $('<div></div>').addClass(cssClass).appendTo($(parentSelector))
                : container;
        }
        start() {
            this.counts = [];
            this.weights = [];
            this.values = [];
            this.bases = [];
            this.startTime = new Date();
            console.debug('start', this);
            this.render();
        }
        finish() {
            this.values[0] = this.counts[0] = this.weights[0] = 1;
            this.bases[0] = 0;
            console.debug('finish', this);
            this.print(`${this.title} - готово!`);
            this.render();
        }
        close() {
            this.container.hide();
        }
        push(count, weight) {
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
        increment(itemTitle, itemLink) {
            if (this.values.length === 0) {
                return;
            }
            this.values[this.values.length - 1]++;
            console.debug('increment', itemTitle, itemLink, this);
            this.print(`${this.title} [${this.values[this.values.length - 1]} из ${this.counts[this.counts.length - 1]}]`);
            this.link(itemTitle, itemLink);
            this.render();
        }
        print(message, isError) {
            (isError ? console.error : console.log)(message);
            this.logPanel.css({ color: isError ? 'red' : 'black' });
            this.logText.text(message);
            this.logLink.html('');
        }
        link(itemTitle, itemLink) {
            $('<span></span>').html('&nbsp;-&nbsp;').appendTo(this.logLink);
            $('<a></a>').attr('href', itemLink).attr('target', '_blank').text(itemTitle).appendTo(this.logLink);
        }
        error(message) {
            this.print(message, true);
        }
        render() {
            this.value = this.bases.reduce((a, b) => a + b, 0);
            let multiplier = 1;
            for (let i = 0; i < this.counts.length; i++) {
                multiplier /= this.counts[i] / this.weights[i];
                this.value += this.values[i] * multiplier;
            }
            console.debug('render', this);
            const left = `-${(1 - this.value) * 100}%`;
            const percents = `${Math.floor(this.value * 100)}%`;
            this.progressBar.css({ left });
            this.percentLabel.html(percents);
            if (this.value !== 0 && this.value !== 1) {
                const elapsed = new Date().getTime() - this.startTime.getTime();
                const remain = elapsed / this.value - elapsed;
                this.remainLabel.html(this.formatTime(remain));
            }
            else {
                this.remainLabel.html('');
            }
        }
        formatTime(ms) {
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
    function select(context, selector, throwIfNotExists = true) {
        const obj = context.find(selector);
        if (obj.length === 0 && throwIfNotExists) {
            throw new KPError(`Не удалось найти элемент по селектору ${selector}`);
        }
        return obj;
    }
    function regex(text, pattern) {
        const match = pattern.exec(text);
        if (!match) {
            throw new KPError(`Не удалось найти текст по регулярному выражению ${pattern}`);
        }
        return match;
    }
    async function get(url) {
        if (typeof url === 'undefined') {
            // eslint-disable-next-line no-debugger
            debugger;
        }
        currentUrl = url;
        let response = null;
        let attempt = 1;
        while (!response) {
            await sleep(pageInterval);
            try {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
                response = await $.get(url);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            }
            catch (ex) {
                console.warn(`Не удалось загрузить страницу '${url}', попытка #${++attempt} через секунду...`);
                if (attempt > 3) {
                    // eslint-disable-next-line no-debugger
                    debugger;
                }
            }
        }
        return response;
    }
    async function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    function parseFilmId(li) {
        const idString = String($(li).data('id'));
        const id = parseInt(idString);
        if (isNaN(id)) {
            throw new KPError(`Id не является целым числом: ${idString}`);
        }
        return id;
    }
    function shouldSkipFilm(filmId) {
        return debug.enabled && debug.filmIds.length > 0 && !debug.filmIds.includes(filmId);
    }
    function shouldSkipList(listName) {
        return debug.enabled && debug.listNames.length > 0 && !debug.listNames.includes(listName);
    }
    function getNames({ name, originalName, year }) {
        if (!name && originalName) {
            name = originalName;
            originalName = '';
        }
        const fullNameParts = [];
        fullNameParts.push(name);
        if (originalName.length > 0 && originalName !== name) {
            fullNameParts.push(`(${originalName})`);
        }
        fullNameParts.push(`[${year ? year : '...'}]`);
        const fullName = fullNameParts.join(' ').toFilename();
        return { name, originalName, fullName };
    }
    function getYear(data) {
        var _a, _b;
        if (!data.releaseYears || data.releaseYears.length === 0) {
            return data.productionYear ? data.productionYear.toString() : '';
        }
        const start = (_a = data.releaseYears[0]) === null || _a === void 0 ? void 0 : _a.start;
        const end = (_b = data.releaseYears.slice(-1)[0]) === null || _b === void 0 ? void 0 : _b.end;
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
    function showDownloadAll() {
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
            success: (contents) => {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
                    const data = JSON.parse(contents);
                    if (!('lists' in data)) {
                        throw new KPError('Загруженный файл не является корректным файлом списков');
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
                }
                catch (ex) {
                    listsProgress.error(String(ex));
                    return;
                }
                loadButton.hide();
                startButton.hide();
                listsProgress.start();
                listsProgress.finish();
                void downloadAllFilms();
            },
            fail: (message) => {
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
    function showDownloadSelectedItems() {
        watchedProgress = new Progress('Загрузка списков просмотренного');
        plannedProgress = new Progress('Загрузка списков запланированного');
        const startButton = $('<a></a>')
            .addClass('button')
            .text('Начать')
            .appendTo(watchedProgress.buttonPanel)
            .on('click', () => {
            startButton.hide();
            void downloadSelectedItems();
        });
    }
    function createFileInput({ success, fail }) {
        const fileInput = $('<input type="file" />');
        fileInput.on('change', (ev) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
            const files = ev.target.files;
            if (!files) {
                return;
            }
            const reader = new FileReader();
            reader.readAsText(files[0]);
            reader.onload = function () {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
                success(reader.result);
            };
            reader.onerror = function () {
                if (reader.error) {
                    fail(reader.error.message);
                }
            };
        });
        return fileInput;
    }
    async function downloadAllLists() {
        var _a;
        listsProgress.start();
        const startURL = buildFoldersUrl();
        const startHTML = await get(startURL);
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
        (_a = createDownloadButton({ download: 'lists.json', json: { lists: ListItem.map }, title: 'Скачать списки' })
            .appendTo(listsProgress.buttonPanel)
            .get(0)) === null || _a === void 0 ? void 0 : _a.click();
        void downloadAllFilms();
    }
    function createList(li, startHTML) {
        const id = parseInt(String($(li).data('id')));
        const text = $(li).text().trim();
        const firstPageHTML = $(li).find('a').attr('href') ? null : startHTML;
        const matches = text.match(/^\s*(.*?)(\s+\((\d+)\)\s*)?$/);
        if (!matches) {
            throw new KPError(`Text '${text}' doesn't match regexp`);
        }
        const title = matches[1];
        const totalPages = matches[3] ? Math.ceil(parseInt(matches[3]) / perPage) : 0;
        return { id, title, firstPageHTML, totalPages };
    }
    async function parseList(list, currentPage) {
        if (shouldSkipList(list.title)) {
            return;
        }
        const url = buildFoldersUrl(list, currentPage);
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
    async function downloadSelectedItems() {
        var _a;
        const htmlParser = HTMLParser.parse(document.body.innerHTML, location.href);
        const profileAlias = htmlParser.getProfileAlias();
        const actions = [
            { progress: watchedProgress, Class: Watched, buildUrl: buildWatchedUrl },
            { progress: plannedProgress, Class: Planned, buildUrl: buildPlannedUrl },
        ];
        for (const { progress, Class, buildUrl } of actions) {
            currentProgress = progress;
            progress.start();
            const startURL = buildUrl(profileAlias);
            const startHTML = await get(startURL);
            const countBlock = select($(startHTML), `a[data-test-id="next-link"][href="${buildUrl(profileAlias, null)}"]`);
            const count = Number(select(countBlock, '[class*="styles_subtitle__"').text());
            if (isNaN(count)) {
                throw new KPError(`Total pages count is invalid: ${countBlock.text()}`);
            }
            const pager = select($(startHTML), 'ul.styles_list__N_W_1', false);
            const totalPagesString = select($(pager), 'li:last-child', false).text();
            const totalPages = totalPagesString.length ? Number(totalPagesString) : 1;
            if (isNaN(totalPages)) {
                throw new KPError(`Total pages marker is invalid: ${totalPagesString}`);
            }
            progress.push(totalPages, 1);
            parseSelectedItems(Class, progress, startHTML, startURL);
            for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
                const url = buildUrl(profileAlias, currentPage);
                const html = await get(url);
                parseSelectedItems(Class, progress, html, url);
            }
            progress.pop();
            progress.finish();
        }
        (_a = createDownloadButton({ download: 'selected.json', json: { watched: Watched.map, planned: Planned.map }, title: 'Скачать списки' })
            .appendTo(plannedProgress.buttonPanel)
            .get(0)) === null || _a === void 0 ? void 0 : _a.click();
    }
    function parseSelectedItems(Class, progress, html, url) {
        const selectedItems = select($(html), 'main [class*="styles_item__"][class*="styles_poster__"]', false)
            .toArray()
            .map(createSelectedItem);
        for (const selectedItem of selectedItems) {
            Class.create(selectedItem);
        }
        progress.increment('ссылка на страницу списка', url);
    }
    function createSelectedItem(div) {
        const link = select($(div), '[class*="styles_captions__"][href]');
        const href = link.get(0).href;
        const id = Number(regex(href, /\/(\d+)\//)[1]);
        const name = select(link, '[class*="styles_title__"]').text();
        const rateEl = select($(div), '[class*="styles_rating__"] [class*="styles_value__"]', false);
        const rate = rateEl.length > 0 ? Number(rateEl.text()) : undefined;
        return { id, href, name, rate };
    }
    function buildFoldersUrl(list = { id: defaultListID }, currentPage = 1) {
        const baseUrl = `/mykp/folders/${list.id}/`;
        return currentPage === null
            ? baseUrl
            : `${baseUrl}?page=${currentPage}&limit=${perPage}`;
    }
    function buildWatchedUrl(profileAlias, currentPage = 1) {
        const baseUrl = `/user/${profileAlias}/movies/voted-watched/`;
        return currentPage === null
            ? baseUrl
            : `${baseUrl}?page=${currentPage}`;
    }
    function buildPlannedUrl(profileAlias, currentPage = 1) {
        const baseUrl = `/user/${profileAlias}/movies/planned-to-watch/`;
        return currentPage === null
            ? baseUrl
            : `${baseUrl}?page=${currentPage}`;
    }
    async function downloadAllFilms() {
        var _a;
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
            Film.fromHTML(listItem.data.id, html, url);
        }
        filmsProgress.pop();
        filmsProgress.finish();
        (_a = createDownloadButton({ download: 'films.json', json: { films: Film.map, related: Related.map }, title: 'Скачать фильмы' })
            .appendTo(filmsProgress.buttonPanel)
            .get(0)) === null || _a === void 0 ? void 0 : _a.click();
    }
    function downloadFilm() {
        const id = getCurrentFilmId();
        const film = Film.fromHTML(id, document.body.innerHTML, location.href);
        setTimeout(() => {
            var _a;
            if (getListsDropdown().length === 0) {
                $('button[title="Добавить в папку"]').trigger('click');
            }
            const folders = select(getListsDropdown(), 'input[type="checkbox"][checked] + span', false);
            film.extendedData.lists = folders.length > 0
                ? folders.map((_i, folder) => $(folder).text()).toArray()
                : [];
            (_a = createDownloadButton({ download: `${film.data.id}.json`, json: film, title: 'Скачать фильм' })
                .get(0)) === null || _a === void 0 ? void 0 : _a.click();
        }, 1);
    }
    function createDownloadButton({ download, json, title }) {
        return $('<a></a>')
            .addClass('button')
            .text(title)
            .attr('href', `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(json, null, '    '))}`)
            .attr('download', download);
    }
    function getListsDropdown() {
        return select($('body'), 'button[title="Добавить в папку"] + div[class^="styles_dropdownMenu"]', false);
    }
    function copyTitle() {
        const id = getCurrentFilmId();
        setTimeout(() => {
            const film = Film.fromHTML(id, document.body.innerHTML, location.href);
            void navigator.clipboard.writeText(film.data.fullName);
        }, 1);
    }
    function getCurrentFilmId() {
        return parseInt(regex(location.pathname, /^\/(film|series)\/(\d+)/)[2]);
    }
    function createTestFilm(id) {
        return {
            kind: 'film',
            key: `Film:${id}`,
            online: `https://hd.kinopoisk.ru/film${id}`,
            data: {
                id,
                name: `Test film ${id}`,
                originalName: '',
                fullName: `Test film ${id} [200${id}]`,
                year: `200${id}`,
                time: 90 + id,
            },
            extendedData: {
                related: [100 + id],
                description: `Test film ${id} description\nNext line\n\nEnd`,
                genres: ['genre1', 'genre2', `genre${id}`],
                lists: ['First list', 'Second list'],
                note: `User note ${id}\nNext line\n\nEnd`,
                poster: `https://example.com/poster_${id}.jpg`,
                directors: ['Ivan Ivanov', 'John Smith'],
            },
        };
    }
    async function test() {
        var _a;
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
        (_a = createDownloadButton({
            download: 'films.test.json',
            json: {
                films: {
                    ['1']: createTestFilm(1),
                    ['2']: createTestFilm(2),
                },
            },
            title: 'Скачать фильмы',
        })
            .appendTo(filmsProgress.buttonPanel)
            .get(0)) === null || _a === void 0 ? void 0 : _a.click();
    }
    function renderButton({ container, icon, title, func, top, fontSize }) {
        return $('<a></a>')
            .text(icon)
            .css({ 'cursor': 'pointer', 'color': '#ffffff', 'font-size': `${fontSize}px`, 'top': `${top}px`, 'position': 'relative', 'padding': '4px' })
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
    function renderDownload() {
        const container = $('<div></div>')
            .css({ 'position': 'fixed', 'top': '6px', 'right': 0, 'z-index': 65535, 'padding': '4px' })
            .appendTo($('body'));
        if (location.pathname.includes('/film/') || location.pathname.includes('/series/')) {
            renderButton({ container, icon: '#', title: 'Copy title', func: copyTitle, top: 7, fontSize: 35 });
            renderButton({ container, icon: '{}', title: 'Download film', func: debug.enabled ? test : downloadFilm, top: 0, fontSize: 24 });
        }
        renderButton({ container, icon: '⇩', title: 'Download all', func: showDownloadAll, top: 3, fontSize: 32 });
        renderButton({ container, icon: '👁', title: 'Download selected items', func: showDownloadSelectedItems, top: 3, fontSize: 32 });
        setCSS();
    }
    if (window === top) {
        renderDownload();
    }
})($.noConflict());

