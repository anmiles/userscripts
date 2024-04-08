"use strict";
// ==UserScript==
// @name           SBG plus
// @namespace      sbg
// @version        1.0.1
// @updateURL      https://anmiles.net/userscripts/sbg.plus.user.js
// @downloadURL    https://anmiles.net/userscripts/sbg.plus.user.js
// @description    Extended functionality for SBG
// @description:ru Расширенная функциональность для SBG
// @author         Anatoliy Oblaukhov
// @match          https://sbg-game.ru/*
// @run-at         document-start
// @grant          none
// ==/UserScript==
/* eslint-disable camelcase -- allow snake_case for __sbg variables and let @typescript-eslint/naming-convention cover other cases */
window.__sbg_plus_version = '1.0.1';
Object.typedKeys = (obj, allKeys) => {
    function isOwnKey(key) {
        return allKeys.includes(String(key));
    }
    return Object.keys(obj).filter(isOwnKey);
};
Object.typedEntries = (obj, allKeys) => Object
    .typedKeys(obj, allKeys)
    .map((key) => [key, obj[key]]);
const layerNames = ['base', 'highlights', 'lines_built', 'lines_temp', 'lines', 'points', 'regions_built', 'regions_shared', 'regions', 'temp_lines'];
const urlTypes = ['homepage', 'game', 'login', 'desktop', 'mobile', 'script', 'intel', 'cui', 'eui'];
const langs = ['ru', 'en'];
(function () {
    class EventWatcher {
        constructor(eventTypes) {
            this.eventTypes = eventTypes;
            this.listeners = {};
            this.events = {};
            this.eventTypes.map((eventType) => {
                this.events[eventType] = [];
                this.listeners[eventType] = [];
            });
            this.watch();
        }
        emit(eventType, eventData, eventOptions) {
            this.trigger(this.listeners[eventType], { eventData, eventOptions });
            this.events[eventType].push({ eventData, eventOptions });
            return this;
        }
        on(eventType, handler, listenerOptions) {
            const listener = { handler, listenerOptions, enabled: true };
            this.listeners[eventType].push(listener);
            if (listenerOptions.previous) {
                this.events[eventType].map(({ eventData, eventOptions }) => {
                    this.trigger([listener], { eventData, eventOptions });
                });
            }
            return this;
        }
        off(eventType, eventOptions) {
            this.filter(this.listeners[eventType], { eventOptions }).map((listener) => {
                listener.enabled = false;
            });
            return this;
        }
        filter(listeners, _filterData) {
            return listeners;
        }
        isMatchEventOptions(_listener, _eventOptions) {
            return true;
        }
        trigger(listeners, { eventData, eventOptions }) {
            listeners.filter((listener) => this.isMatchEventOptions(listener, eventOptions)).map((listener) => {
                if (!listener.enabled) {
                    return;
                }
                if (listener.listenerOptions.once) {
                    listener.enabled = false;
                }
                listener.handler(eventData);
            });
        }
    }
    const consoleWatcherEventTypes = ['log', 'warn', 'error', 'info', 'debug', 'trace'];
    class ConsoleWatcher extends EventWatcher {
        constructor() {
            super(consoleWatcherEventTypes);
        }
        watch() {
            consoleWatcherEventTypes.map((eventType) => {
                ((originalMethod, originalError) => {
                    console[eventType] = (...args) => {
                        const isError = eventType === 'error' || args.filter((arg) => arg instanceof Error).length > 0;
                        const lines = args.map((arg) => arg instanceof Error
                            ? [arg.message, arg.stack].join('\n')
                            : !arg
                                ? ((arg) => {
                                    console.error('null argument', { arg, args });
                                    return 'null';
                                })(arg)
                                : stringify(arg, 'string'));
                        this.emit(isError ? 'error' : eventType, {
                            message: lines.map((line) => line.trim()).join('\n'),
                            originalMethod: (...data) => {
                                (isError ? originalError : originalMethod).call(console, ...data);
                            },
                        }, {});
                    };
                })(console[eventType], console.error);
            });
        }
    }
    const logs = [];
    const logParts = ['time', 'eventType', 'message'];
    const loggers = ['console', 'alert', 'logs'];
    const loggerOptions = {
        console: ['time', 'message'],
        alert: ['message'],
        logs: ['message'],
    };
    class LogEntry {
        constructor(eventType, message) {
            this.eventType = eventType;
            this.message = message;
        }
        format(logger) {
            return logParts
                .filter((logPart) => loggerOptions[logger].includes(logPart))
                .map((logPart) => this.formatPart(logPart, this.eventType, this.message))
                .join(' ');
        }
        formatPart(logPart, eventType, message) {
            switch (logPart) {
                case 'time':
                    return this.getTimeString();
                case 'eventType':
                    return eventType === 'error' ? 'ERROR' : eventType;
                case 'message':
                    return message;
            }
        }
        getTimeString() {
            const date = new Date();
            const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map((value) => value.toString().padStart(2, '0')).join('.');
            const ms = date.getMilliseconds().toString().padStart(3, '0');
            return `${time}:${ms}`;
        }
    }
    const consoleWatcher = new ConsoleWatcher();
    consoleWatcherEventTypes.map((eventType) => {
        consoleWatcher.on(eventType, ({ message, originalMethod }) => {
            const logEntry = new LogEntry(eventType, message);
            logs.push(logEntry.format('logs'));
            originalMethod(logEntry.format('console'));
            if (eventType === 'error' && window.__sbg_preset === 'full') {
                alert(logEntry.format('alert'));
            }
        }, {});
    });
    const stringifyModes = ['json', 'keys', 'string'];
    function stringify(obj, mode) {
        if (obj === null || obj === undefined) {
            return typeof obj;
        }
        switch (mode) {
            case 'json':
                return JSON.stringify(obj);
            case 'keys':
                return `[${Object.keys(obj).join(', ')}]`;
            case 'string':
                return String(obj);
            default:
                return `unknown mode '${String(mode)}', expected one of [${stringifyModes.join(', ')}]`;
        }
    }
    window.__sbg_debug_object = (message, obj, mode = 'json') => {
        var _a;
        const stack = (_a = new Error().stack) === null || _a === void 0 ? void 0 : _a.replace(/^Error/, '');
        for (const key in obj) {
            console.debug(`${message}: ${key} = ${stringify(obj[key], mode)}`);
            console.debug(stack);
        }
    };
    window.__sbg_onerror_handlers = [];
    window.__sbg_onerror_handlers.push((event, _source, lineno, colno, error) => {
        const eventType = typeof event === 'string' ? event : event.type;
        console.error(`${eventType} on ${lineno}:${colno}`, error);
    });
    window.onerror = function (event, source, lineno, colno, error) {
        window.__sbg_onerror_handlers.forEach((handler) => {
            handler(event, source, lineno, colno, error);
        });
        return true;
    };
    window.__sbg_location = new Proxy(window.location, {
        set: (target, property, newValue) => {
            target[property] = newValue;
            if (property === 'href' && typeof newValue === 'string') {
                const homepage = getHomepageURL();
                const gameUrl = getGameURL();
                const url = new URL(newValue, homepage);
                if (url.href.startsWith(homepage)) {
                    if (url.href !== gameUrl) {
                        const storageKey = 'sbg-plus-homepage-replaced';
                        localStorage.removeItem(storageKey);
                    }
                    location.href = url.href;
                }
            }
            return true;
        },
    });
    console.log(`SBG plus, version ${window.__sbg_plus_version}`);
    console.log(`started at ${new Date().toISOString()}`);
    console.log(`userAgent: ${navigator.userAgent}`);
    const builderButtons = ['home', 'allLines', 'builder', 'undo', 'clear', 'route', 'copy', 'paste', 'help'];
    class Label {
        constructor(values) {
            this.values = values;
        }
        format(data) {
            const formattedLabel = new Label({ ...this.values });
            for (const lang of langs) {
                formattedLabel.values[lang] = formattedLabel.values[lang].replace(/\$\{(.+?)\}/g, (_, key) => {
                    const value = data[key];
                    if (!value) {
                        return '';
                    }
                    if (typeof value === 'string') {
                        return value;
                    }
                    return value.toString();
                });
            }
            return formattedLabel;
        }
        toString() {
            return this.values[window.__sbg_language];
        }
    }
    const labels = {
        save: new Label({
            ru: 'Сохранить',
            en: 'Save',
        }),
        close: new Label({
            ru: 'Закрыть',
            en: 'Close',
        }),
        ymaps: new Label({
            ru: 'Яндекс Карты',
            en: 'Yandex Maps',
        }),
        upgrade: {
            package: {
                supported: new Label({
                    ru: 'Приложение больше не поддерживается. Пожалуйста, скачайте и установите новую версию',
                    en: 'App is no more supported. Please, download and install new version',
                }),
                latest: new Label({
                    ru: 'Хотите скачать и установить новую версию приложения сейчас?',
                    en: 'Do you want to download and install new version of the app now?',
                }),
            },
        },
        settings: {
            title: new Label({
                ru: 'Настройки скриптов',
                en: 'Scripts settings',
            }),
            button: new Label({
                ru: 'Настройки',
                en: 'Settings',
            }),
            version: new Label({
                ru: 'Версия SBG+',
                en: 'SBG+ Version',
            }),
            logs: new Label({
                ru: 'Логи',
                en: 'Logs',
            }),
            advanced: new Label({
                ru: 'Все настройки',
                en: 'All settings',
            }),
        },
        toasts: {
            back: new Label({
                ru: 'Нажмите кнопку "Назад" ещё раз\nдля выхода из игры',
                en: 'Press "Back" button again to exit the game',
            }),
            logs: new Label({
                ru: 'Логи скопированы в буфер обмена',
                en: 'Logs has been copied into the clipboard',
            }),
            cuiUpdated: new Label({
                ru: 'Скрипт Николая обновлён до версии ${currentVersion}',
                en: 'Nicko script has been updated to ${currentVersion}',
            }),
            localWarning: new Label({
                ru: 'ВНИМАНИЕ!\nВы используете тестовую версию.\nВсе обновления скриптов отключены.\nОбратитесь на форум за стабильной версией приложения.',
                en: 'WARNING!\nYou are using a test version.\nAll script updates are off.\nRefer to forums for a stable version.',
            }),
            noGeoApp: new Label({
                ru: 'Не найдено ни одного приложения карт. Координаты скопированы в буфер обмена.',
                en: 'Maps application is not found. Coordinates has been copied to the clipboard.',
            }),
            noLayer: new Label({
                ru: 'Слой ${layerName} не существует',
                en: 'Layer ${layerName} does not exist',
            }),
            featureSwitchedOff: new Label({
                ru: '${label} временно не работает и отключён до исправления его автором',
                en: '${label} is temporarily broken and disabled until fixing by its author',
            }),
        },
        builder: {
            buttons: {
                home: {
                    title: new Label({
                        ru: 'Я здесь',
                        en: 'Set home',
                    }),
                    description: new Label({
                        ru: 'устанавливает "домашнее местоположение", с которого игра всегда будет открываться в этом браузере',
                        en: 'sets "home location", which game will always start with in this browser',
                    }),
                },
                allLines: {
                    title: new Label({
                        ru: 'Все линии',
                        en: 'All lines',
                    }),
                    description: new Label({
                        ru: 'включает/отключает показ реально существующих линий и регионов',
                        en: 'toggles currently existing lines and regions',
                    }),
                },
                builder: {
                    title: new Label({
                        ru: 'Конструктор',
                        en: 'Builder',
                    }),
                    description: new Label({
                        ru: 'включает/отключает режим конструктора: нажатие на точку начинает новую линию, нажатие на другую точку - заканчивает линию',
                        en: 'toggles builder mode: click first point to start new line, click another point to finish the line',
                    }),
                },
                undo: {
                    title: new Label({
                        ru: 'Отменить',
                        en: 'Undo',
                    }),
                    description: new Label({
                        ru: 'стирает последнюю построенную линию/регион',
                        en: 'removes last built line/region',
                    }),
                },
                clear: {
                    title: new Label({
                        ru: 'Отменить всё',
                        en: 'Clear',
                    }),
                    description: new Label({
                        ru: 'стирает все построенные линии и регионы',
                        en: 'removes all build lines and regions',
                    }),
                },
                route: {
                    title: new Label({
                        ru: 'Маршрут',
                        en: 'Print route',
                    }),
                    description: new Label({
                        ru: 'показывает все построенные линии, в виде списка в порядке постройки',
                        en: 'shows all built lines as a list in the order of building',
                    }),
                },
                copy: {
                    title: new Label({
                        ru: 'Копировать',
                        en: 'Copy',
                    }),
                    description: new Label({
                        ru: '(Ctrl-C) копирует все построенные линии в буфер обмена',
                        en: '(Ctrl-C) copies all built lines into the clipboard',
                    }),
                },
                paste: {
                    title: new Label({
                        ru: 'Вставить',
                        en: 'Paste',
                    }),
                    description: new Label({
                        ru: '(Ctrl-V) вставляет ранее построенные линии из буфера обмена',
                        en: '(Ctrl-V) pastes previously built lines from the clipboard',
                    }),
                },
                help: {
                    title: new Label({
                        ru: 'Помощь',
                        en: 'Help',
                    }),
                    description: new Label({
                        ru: 'показывает инструкции',
                        en: 'shows instructions',
                    }),
                },
            },
            messages: {
                setHome: new Label({
                    ru: 'Всегда открывать SBG на текущем местоположении?',
                    en: 'Always open SBG using currently opened location?',
                }),
                deleteHome: new Label({
                    ru: 'Забыть "домашнее местоположение" SBG?',
                    en: 'Forget "home location"?',
                }),
                copied: new Label({
                    ru: 'Данные скопированы в буфер обмена',
                    en: 'Data has been copied into the clipboard',
                }),
            },
            issues: {
                title: new Label({
                    ru: 'Известные ограничения и проблемы',
                    en: 'Known limitations and problems',
                }),
                list: [
                    new Label({
                        ru: 'Не всегда рисуется линия, потому что если при нажатии мышкой сдвинуть карту хоть на миллиметр - карта думает, что её двигают, а не кликают, и никак не реагирует',
                        en: 'Lines are not always being drawn, because clicking mouse button when moving map even one pixel ahead will make the map treat this click as a moving action and do not react as expected',
                    }),
                    new Label({
                        ru: 'Если два раза нажать на точку - она остаётся оранжевой, даже если закончить линию',
                        en: 'Point leaves orange when clicking twice, even when line has been finished',
                    }),
                    new Label({
                        ru: 'Если нажать на точку, а потом подвинуть карту - она перестаёт быть оранжевой',
                        en: 'Orange point stops to be orange if move map',
                    }),
                ],
            },
            help: {
                title: new Label({
                    ru: 'Конструктор',
                    en: 'Builder',
                }),
                buttons: new Label({
                    ru: 'Кнопки',
                    en: 'Buttons',
                }),
            },
            validationErrors: {
                json: new Label({
                    ru: 'Текст должен быть валидным JSON-объектом',
                    en: 'Text should be a valid JSON object',
                }),
                empty: new Label({
                    ru: 'Ничего нет',
                    en: 'Nothing found',
                }),
                object: new Label({
                    ru: 'Данные должны быть объектом',
                    en: 'Data should be an object',
                }),
                objectProperties: new Label({
                    ru: "Объект с данными должен содержать два объекта: 'points' и 'lines'",
                    en: "Data object should contain two objects: 'points' and 'lines'",
                }),
                pointProperties: new Label({
                    ru: "Каждый объект в 'points' должен содержать поля: 'guid' (string), 'title' (string) и 'coords' (object)",
                    en: "Each object in 'points' should contain properties: 'guid' (string), 'title' (string) and 'coords' (object)",
                }),
                pointCoords: new Label({
                    ru: "Каждый объект в 'points' должен содержать массив 'coords', из двух координат типа (number)",
                    en: "Each object in 'points' should contain array 'coords' of two coordinates of type (number)",
                }),
                lines: new Label({
                    ru: "Массив 'lines' должен состоять из массивов координат линий",
                    en: "Array 'lines' should contain arrays of line coordinates",
                }),
                linesCoords: new Label({
                    ru: "Каждый массив в 'lines' должен состоять из двух массивов координат точек",
                    en: "Each array in 'lines' should contain two arrays of point coordinates",
                }),
                unknownError: new Label({
                    ru: 'Причина ошибки неизвестна: ошибка произошла до определения возможных причин',
                    en: 'Error reason is unknown: the error ocurred before defining possible reasons',
                }),
            },
        },
    };
    console.log('created labels');
    const urls = initUrls();
    class Settings {
        constructor() {
            this.storageKey = 'sbg-plus-settings';
            try {
                const str = localStorage.getItem(this.storageKey);
                const savedFeatures = str
                    ? jsonSelect(str, ['features'])
                    : {};
                this.features = new Map(Object.typedEntries(savedFeatures, Object.keys(savedFeatures)));
            }
            catch {
                this.features = new Map();
            }
        }
        getFeature(featureKey) {
            return this.features.get(featureKey);
        }
        setFeature(featureKey, value) {
            this.features.set(featureKey, value);
            return this;
        }
        cleanupFeatures() {
            const featureKeys = Object.keys(features.keys);
            Array.from(this.features.keys())
                .filter((key) => !featureKeys.includes(key))
                .forEach((key) => {
                this.features.delete(key);
            });
        }
        save() {
            const json = {};
            json.features = Object.fromEntries(this.features);
            const str = JSON.stringify(json);
            localStorage.setItem(this.storageKey, str);
        }
    }
    const settings = new Settings();
    console.log('created settings');
    const featureGroupNames = ['scripts', 'base', 'cui', 'eui', 'animations', 'toolbar', 'fire', 'inventory', 'leaderboard', 'info', 'buttons', 'draw', 'other', 'custom', 'tests'];
    const featureGroups = {
        scripts: { ru: 'Скрипты', en: 'Scripts' },
        base: { ru: 'Основные настройки', en: 'Basic settings' },
        cui: { ru: 'Скрипт Николая', en: 'Nicko script' },
        eui: { ru: 'Скрипт Егора', en: 'Egor script' },
        animations: { ru: 'Анимации', en: 'Animations' },
        toolbar: { ru: 'Боковая панель', en: 'Toolbar' },
        fire: { ru: 'Атака', en: 'Fire' },
        inventory: { ru: 'Инвентарь', en: 'Inventory' },
        leaderboard: { ru: 'Лидеры', en: 'Leaderboard' },
        info: { ru: 'Информация о точке', en: 'Point info' },
        buttons: { ru: 'Кнопки', en: 'Buttons' },
        draw: { ru: 'Рисование', en: 'Draw' },
        other: { ru: 'Прочие настройки', en: 'Other settings' },
        custom: { ru: 'Мои настройки', en: 'My settings' },
        tests: { ru: 'Тесты', en: 'Tests' },
    };
    const featureTriggers = ['', 'pageLoad', 'cuiTransform', 'mapReady', 'fireClick'];
    class FeatureBase {
        constructor(kind, key, labelValues, options) {
            var _a, _b, _c, _d, _e;
            this.toggleValue = false;
            this.kind = kind;
            this.key = key;
            this.label = new Label(labelValues);
            this.group = options.group;
            this.trigger = options.trigger;
            this.broken = (_a = options.broken) !== null && _a !== void 0 ? _a : false;
            this.public = (_b = options.public) !== null && _b !== void 0 ? _b : false;
            this.simple = (_c = options.simple) !== null && _c !== void 0 ? _c : false;
            this.desktop = (_d = options.desktop) !== null && _d !== void 0 ? _d : false;
            this.unchecked = (_e = options.unchecked) !== null && _e !== void 0 ? _e : false;
            features.add(this, options);
        }
        setEnabled(value) {
            settings.setFeature(this.key, value);
            features.inherit(this, value);
        }
        isEnabled(allowBroken = false) {
            var _a;
            return (!this.broken || allowBroken) && ((_a = this.isExplicitlyEnabled()) !== null && _a !== void 0 ? _a : this.isImplicitlyEnabled());
        }
        isExplicitlyEnabled() {
            return settings.getFeature(this.key);
        }
        isImplicitlyEnabled() {
            return this.isAvailable() && this.isIncluded(this.getPreset()) && !(typeof this.unchecked === 'function' ? this.unchecked() : this.unchecked);
        }
        isAvailable() {
            var _a, _b;
            const lastUsername = localStorage.getItem('sbg-plus-last-username');
            return (isMobile()
                || this.desktop) && (this.public
                || !!lastUsername && ((_b = (_a = protectedFeatures[lastUsername]) === null || _a === void 0 ? void 0 : _a.includes(this)) !== null && _b !== void 0 ? _b : false)
                || this.getPreset() === 'full'
                || !!localStorage.getItem('sbg-plus-test-mode'));
        }
        isSimple() {
            return this.simple;
        }
        toggle(value = !this.toggleValue) {
            const attributeKey = `data-feat-${this.key}`;
            this.toggleValue = value;
            if (value) {
                document.body.setAttribute(attributeKey, '');
            }
            else {
                document.body.removeAttribute(attributeKey);
            }
            features.emit('toggle', { feature: this, value }, {});
            return value;
        }
        exec(data) {
            if (!this.isEnabled()) {
                console.log(`skipped ${this.key}`);
                return;
            }
            try {
                this.func(data);
                this.toggle(true);
                console.log(`executed ${this.key}`);
            }
            catch (ex) {
                console.error(`failed ${this.key}`, ex);
            }
        }
        isIncluded(presetName) {
            const preset = isPreset(presetName)
                ? presets[presetName]
                : presets.browser;
            return preset.length === 0 || preset.includes(this);
        }
        getPreset() {
            return window.__sbg_preset;
        }
    }
    class Feature extends FeatureBase {
        constructor(func, labelValues, options) {
            const wrapper = () => {
                const el = this.getElement();
                if (el) {
                    func(el);
                }
            };
            super('feature', func.name, labelValues, options);
            this.func = wrapper;
            this.requires = options.requires;
        }
        getElement() {
            if (this.requires) {
                const required = this.requires();
                if (!required || typeof required === 'object' && 'length' in required && required.length === 0) {
                    throw new Error('requirement not met');
                }
                return required;
            }
            return {};
        }
    }
    window.Feature = Feature;
    class Transformer extends FeatureBase {
        constructor(func, labelValues, options) {
            super('transformer', func.name, labelValues, options);
            this.func = func;
        }
    }
    // function isFeature(feature: FeatureBase<never>): feature is Feature {
    // 	return feature.kind === 'feature';
    // }
    function isTransformer(feature) {
        return feature.kind === 'transformer';
    }
    const featuresEventTypes = [
        'add',
        'inherit',
        'toggle',
    ];
    class Features extends EventWatcher {
        constructor() {
            super(featuresEventTypes);
            this.keys = {};
            this.groups = {};
            this.triggers = {};
            this.parents = {};
            Object.typedKeys(featureGroups, featureGroupNames).map((key) => this.groups[key] = []);
            featureTriggers.map((key) => this.triggers[key] = []);
        }
        // eslint-disable-next-line @typescript-eslint/ban-types -- allow any functions to be passed to get according features
        get(func) {
            return this.keys[func.name];
        }
        add(feature, { parent }) {
            this.keys[feature.key] = feature;
            this.groups[feature.group].push(feature);
            this.triggers[feature.trigger].push(feature);
            if (parent) {
                this.parents[feature.group] = {
                    parent: feature,
                    dependency: parent.dependency,
                };
            }
            this.emit('add', feature, {});
        }
        inheritAll() {
            Object.values(this.parents).forEach(({ parent, dependency }) => {
                const children = this.getChildren(parent);
                if (dependency === 'all' && parent.isExplicitlyEnabled()) {
                    children.forEach((child) => this.emit('inherit', { feature: child, value: true }, {}));
                }
                if (dependency === 'any' && !parent.isExplicitlyEnabled() && children.filter((child) => child.isEnabled()).length > 0) {
                    this.emit('inherit', { feature: parent, value: true }, {});
                }
            });
        }
        inherit(feature, value) {
            const featureParent = this.parents[feature.group];
            if (!featureParent) {
                return;
            }
            const { dependency } = featureParent;
            const parent = this.getParent(feature);
            if (parent) {
                const children = this.getChildren(parent);
                if (value === !parent.isEnabled() && (dependency === 'any' === value || children.filter((child) => child.isEnabled() !== value).length === 0)) {
                    this.emit('inherit', { feature: parent, value }, {});
                }
            }
            else {
                const children = this.getChildren(feature);
                if (dependency === 'all' === value) {
                    children.forEach((child) => this.emit('inherit', { feature: child, value }, {}));
                }
            }
        }
        watch() {
            return;
        }
        getParent(feature) {
            const parents = this.parents[feature.group];
            const parent = parents === null || parents === void 0 ? void 0 : parents.parent;
            return parent && parent.func !== feature.func
                ? parent
                : undefined;
        }
        getChildren(feature) {
            const parents = this.parents[feature.group];
            const parent = parents === null || parents === void 0 ? void 0 : parents.parent;
            return parent && parent.func === feature.func
                ? this.groups[feature.group].filter((child) => child.func !== feature.func)
                : [];
        }
    }
    const features = new Features();
    let group = 'base';
    group = 'scripts';
    new Feature(loadCUI, { ru: 'Скрипт Николая', en: 'Nicko script' }, { public: true, simple: true, group, trigger: '' });
    new Feature(loadEUI, { ru: 'Скрипт Егора', en: 'Egor script' }, { public: true, simple: true, group, trigger: 'mapReady', desktop: true });
    new Feature(showBuilderPanel, { ru: 'Конструктор (draw tools)', en: 'Builder (draw tools)' }, { public: true, simple: true, group, trigger: 'mapReady', desktop: true });
    new Feature(showFeatureToggles, { ru: 'Показать кнопки для быстрого переключения между фичами', en: 'Show buttons for quick toggling features' }, { group, trigger: 'mapReady' });
    group = 'base';
    new Feature(enableBackButton, { ru: 'Разрешить кнопку Back', en: 'Enable back button' }, { public: true, group, trigger: 'mapReady' });
    new Feature(updateLangCacheAutomatically, { ru: 'Автоматически обновлять кэш языка', en: 'Update language cache automatically' }, { public: true, group, trigger: 'mapReady', desktop: true });
    new Feature(fixBlurryBackground, { ru: 'Размывать фон за полупрозрачными окнами', en: 'Fix blurry background in popups' }, { public: true, group, trigger: 'mapReady', desktop: true });
    new Feature(alignSettingsButtonsVertically, { ru: 'Выровнять кнопки настроек по ширине', en: 'Align settings buttons vertically' }, { public: true, group, trigger: 'mapReady', desktop: true, requires: () => $('.settings') });
    new Feature(fixCompass, { ru: 'Починить компас', en: 'Fix compass' }, { public: true, group, trigger: 'mapReady' });
    new Feature(showLevelUpCongratulations, { ru: 'Показывать поздравления с новым уровнем', en: 'Show level-up congratulations' }, { public: true, group, trigger: 'mapReady', desktop: true, requires: () => window.__sbg_variable_self_data });
    new Feature(hideInventoryLimit, { ru: 'Не показывать лимит инвентаря', en: 'Hide inventory limit' }, { public: true, group, trigger: 'mapReady', unchecked: true, requires: () => $('#self-info__inv') });
    new Feature(disableCopyingLogsWithThreeFingers, { ru: 'Отключить копирование логов тремя пальцами', en: 'Disable copying logs with three fingers' }, { public: true, group, trigger: 'mapReady', unchecked: true });
    group = 'cui';
    new Transformer(disableClusters, { ru: 'Отключить ромашку', en: 'Disable clusters' }, { public: true, simple: true, group, trigger: 'cuiTransform' });
    new Transformer(disableAttackZoom, { ru: 'Отключить изменение зума при атаке', en: 'Disable changing zoom when attack' }, { public: true, simple: true, group, trigger: 'cuiTransform' });
    new Transformer(unlockCompassWhenRotateMap, { ru: 'Разблокировать компас при вращении карты', en: 'Unlock compass when rotate map' }, { public: true, group, trigger: 'cuiTransform' });
    new Feature(fixSortButton, { ru: 'Исправить расположение кнопки сортировки', en: 'Fix sort button z-index' }, { public: true, group, trigger: 'mapReady', requires: () => $('.sbgcui_refs-sort-button') });
    new Feature(reportCUIUpdates, { ru: 'Сообщать об обновлениях скрипта', en: 'Report script updates' }, { public: true, group, trigger: 'mapReady', unchecked: true });
    new Feature(moveDestroyNotificationsToTop, { ru: 'Переместить оповещения об атаке наверх', en: 'Move destroy notifications to top' }, { public: true, group, trigger: 'mapReady', unchecked: () => { var _a; return !((_a = features.get(loadEUI)) === null || _a === void 0 ? void 0 : _a.isEnabled()); } });
    new Feature(enableConsoleDebuggingOfDatabase, { ru: 'Включить отладку базы данных в консоли', en: 'Enable console debugging of database' }, { public: true, group, trigger: 'cuiTransform', unchecked: true });
    group = 'eui';
    new Feature(centerIconsInGraphicalButtons, { ru: 'Центрировать значки графических кнопок', en: 'Center icons in graphical buttons' }, { public: true, group, trigger: 'mapReady' });
    new Feature(showReloadButtonInCompactMode, { ru: 'Показать кнопку перезагрузки в компактном режиме', en: 'Show reload button in compact mode' }, { public: true, group, trigger: 'mapReady' });
    new Feature(useTeamColorForButtonsInIngressTheme, { ru: 'Использовать цвет команды для кнопок в теме Ingress', en: 'Use team color for buttons in Ingress theme' }, { public: true, group, trigger: 'mapReady', unchecked: true });
    group = 'animations';
    new Feature(disableCarouselAnimation, { ru: 'Отключить анимацию карусели', en: 'Disable carousel animations' }, { public: true, group, trigger: 'pageLoad', requires: () => window.Splide });
    new Feature(disablePopupAnimation, { ru: 'Отключить анимацию открытия и закрытия окон', en: 'Disable open/close windows animation' }, { public: true, group, trigger: 'pageLoad', requires: () => $('.popup') });
    new Feature(disableMapAnimation, { ru: 'Отключить анимацию карты', en: 'Disable map animation' }, { public: true, group, trigger: 'pageLoad' });
    new Feature(disableAttackButtonAnimation, { ru: 'Отключить анимацию кнопки атаки', en: 'Disable attack button animation' }, { public: true, group, trigger: 'pageLoad', requires: () => $('#attack-menu') });
    new Feature(closeToastsAfter1sec, { ru: 'Закрывать всплывающие сообщения через 1 секунду', en: 'Close toasts after 1 second' }, { public: true, group, trigger: 'pageLoad', requires: () => window.Toastify });
    new Feature(disableAllAnimations, { ru: 'Отключить все анимации', en: 'Disable all animations' }, { public: true, simple: true, group, trigger: 'pageLoad', parent: { dependency: 'all' } });
    group = 'toolbar';
    new Feature(showQuickAutoSelectButton, { ru: 'Показать кнопку для быстрого переключения автовыбора коров', en: 'Show button for quick change auto-select settings' }, { group, trigger: 'mapReady', requires: () => $('.sbgcui_toolbar') });
    new Feature(moveAllSidebarsRight, { ru: 'Показывать все боковые панели справа', en: 'Move all sidebars to the right' }, { group, trigger: 'mapReady', requires: () => $('.sbgcui_toolbar-control') });
    new Feature(hideCUIToolbarToggleButton, { ru: 'Скрыть кнопку закрытия панели скрипта Николая', en: 'Hide CUI toolbar toggle button' }, { public: true, group, trigger: 'mapReady', requires: () => $('.sbgcui_toolbar') });
    group = 'fire';
    new Feature(alwaysCenterAlignFireItemsCount, { ru: 'Всегда выравнивать количество предметов по центру', en: 'Always center align items count' }, { group, trigger: 'fireClick', requires: () => $('#attack-slider') });
    new Feature(replaceHighlevelWarningWithIcon, { ru: 'Заменить предупреждение про недостаточный уровень на значок поверх предмета', en: 'Replace highlevel warning with an icon on top of the item' }, { group, trigger: 'fireClick' });
    new Feature(joinFireButtons, { ru: 'Объединить кнопку атаки и кнопку открытия панели атаки, закрывать панель кликом снаружи', en: 'Join attack button and attack panel button, close panel by clicking outside' }, { group, trigger: 'fireClick', requires: () => $('#attack-menu') });
    group = 'inventory';
    new Feature(increaseItemsFont, { ru: 'Увеличить размер шрифта за счёт сокращения названий предметов', en: 'Increase font size by shortening item names' }, { group, trigger: 'mapReady', requires: () => $('.info.popup') });
    new Feature(showAutoDeleteSettingsButton, { ru: 'Показать кнопку перехода к настройкам авто-удаления', en: 'Show auto-delete settings button' }, { group, trigger: 'mapReady', requires: () => $('.inventory.popup') });
    new Feature(restoreCUISort, { ru: 'Заменить сортировку Егора на сортировку Николая', en: 'Replace Egor sort with Nicko sort' }, { public: true, simple: true, group, trigger: 'mapReady', unchecked: true, requires: () => $('.inventory__content') });
    new Feature(moveReferenceButtonsDown, { ru: 'Сдвинуть ниже кнопки направления сортировки и закрытия', en: 'Move down sort direction button and close button' }, { group, trigger: 'mapReady', requires: () => $('.inventory__content') });
    new Feature(hideManualClearButtons, { ru: 'Спрятать кнопки ручного удаления предметов', en: 'Hide manual clear buttons' }, { group, trigger: 'mapReady', requires: () => $('.inventory__content') });
    new Feature(quickRecycleAllRefs, { ru: 'Удалять все имеющиеся рефы от точки при нажатии кнопки удаления', en: 'Recycle all existing refs of the point by clicking recycle button' }, { group, trigger: 'mapReady', requires: () => $('.inventory__content') });
    new Feature(shrinkRefsListUntilMinimumNeededLength, { ru: 'Уменьшать ширину списка рефов до минимально необходимого', en: 'Shrink refs list until minimum needed width' }, { public: true, group, trigger: 'mapReady', desktop: true, requires: () => $('.inventory__content') });
    group = 'leaderboard';
    new Feature(alwaysShowSelfStatistics, { ru: 'Всегда показывать собственную статистику', en: 'Always show self statistics' }, { group, trigger: 'mapReady', requires: () => window.__sbg_function_drawLeaderboard, desktop: true });
    group = 'info';
    new Feature(makeInfoPopupSemiTransparent, { ru: 'Сделать окно точки полупрозрачным', en: 'Make info popup semi-transparent' }, { group, trigger: 'mapReady', requires: () => $('.info.popup') });
    new Feature(alwaysShowSecondsForCoolDowns, { ru: 'Всегда показывать отсчёт в секундах для кулдауна', en: 'Always show seconds for cooldowns' }, { group, trigger: 'mapReady', requires: () => $('#discover') });
    new Feature(enlargeCoreSlots, { ru: 'Увеличить размер коров', en: 'Enlarge core slots' }, { group, trigger: 'mapReady', requires: () => $('.info.popup') });
    group = 'buttons';
    new Feature(arrangeButtons, { ru: 'Привести в порядок кнопки', en: 'Arrange buttons' }, { group, trigger: 'mapReady', parent: { dependency: 'any' } });
    new Feature(colorizeTimer, { ru: 'Менять цвет таймера в зависимости от количества оставшихся дискаверов', en: 'Change color of timer depending on remaining discovers' }, { group, trigger: 'mapReady', requires: () => $('#discover') });
    new Feature(replaceSwipeWithButton, { ru: 'Показать кнопку для переключения между точками', en: 'Show button to swipe between points' }, { group, trigger: 'mapReady', requires: () => $('.sbgcui_swipe-cards-arrow') });
    new Feature(hideCloseButton, { ru: 'Спрятать кнопку закрытия, закрывать только по нажатию Back', en: 'Hide close button, close only by pressing Back' }, { group, trigger: 'mapReady', requires: () => $('.popup-close, #inventory__close') });
    new Feature(hideRepairButton, { ru: 'Спрятать кнопку зарядки', en: 'Hide repair button' }, { group, trigger: 'mapReady', requires: () => $('.info.popup') });
    group = 'draw';
    new Feature(selectTargetPointByClick, { ru: 'Разрешить выбирать конечную точку кликом по ней', en: 'Allow select target point by clicking it' }, { group, trigger: 'mapReady', requires: () => window.__sbg_function_showInfo });
    new Feature(highlightSelectedTargetPoint, { ru: 'Подсвечивать выбранную конечную точку', en: 'Highlight selected target point' }, { group, trigger: 'mapReady', requires: () => window.__sbg_variable_map });
    new Feature(matchDrawSliderButtons, { ru: 'Расположить кнопку рисования ровно под кнопкой карусели рисования', en: 'Place draw button exactly under draw carousel button' }, { group, trigger: 'mapReady', requires: () => $('.draw-slider-wrp') });
    group = 'other';
    new Feature(enableOldWebViewCompatibility, { ru: 'Включить совместимость со старыми webview', en: 'Enable old web view compatibility' }, { public: true, group, trigger: 'mapReady', unchecked: true, requires: () => $('.popup.pp-center') });
    group = 'tests';
    new Feature(testNotifications, { ru: 'Тестовые нотификации', en: 'Test notifications' }, { group, trigger: 'mapReady', unchecked: true });
    settings.cleanupFeatures();
    const presetTypes = ['allscripts', 'browser', 'egorscript', 'full', 'nicoscript'];
    const presets = {};
    function isPreset(preset) {
        return presetTypes.includes(preset);
    }
    presets.nicoscript = [
        ...features.groups.base,
        ...features.groups.cui,
        features.get(loadCUI),
    ];
    presets.egorscript = [
        ...features.groups.base,
        ...features.groups.eui,
        features.get(loadEUI),
    ];
    presets.allscripts = [
        ...presets.nicoscript,
        ...presets.egorscript,
        features.get(restoreCUISort),
    ];
    presets.browser = window.innerWidth < 800
        ? [
            ...presets.nicoscript,
            ...presets.egorscript,
        ]
        : [
            ...presets.egorscript,
            features.get(showBuilderPanel),
            features.get(shrinkRefsListUntilMinimumNeededLength),
        ];
    presets.full = [];
    const protectedFeatures = {
        'MadMaxNsK': [features.get(joinFireButtons)],
    };
    features.inheritAll();
    console.log('created features');
    class Layers {
        constructor() {
            this.layers = new Map();
        }
        get(layerName) {
            const layer = this.layers.get(layerName);
            if (!layer) {
                throw new Error(labels.toasts.noLayer.format({ layerName }).toString());
            }
            return layer;
        }
        set(layerName, layer) {
            this.layers.set(layerName, layer);
        }
        has(layerName) {
            return this.layers.has(layerName);
        }
    }
    const layers = new Layers();
    console.log('created layers');
    class Script {
        constructor(data) {
            this.data = data;
        }
        static async create({ src, prefix, transformer, data }) {
            var _a, _b, _c, _d, _e, _f;
            if (!data) {
                console.log('load script: started');
                data = await fetch(src).then(async (r) => r.text());
                console.log('load script: finished');
            }
            else {
                console.log('used build-in script');
            }
            const script = new Script(data);
            console.log(`before: ${(_b = (_a = script.data) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : '0'} bytes`);
            const originalScriptName = `${prefix}_original`;
            const modifiedScriptName = `${prefix}_modified`;
            window[originalScriptName] = (_c = script.data) !== null && _c !== void 0 ? _c : '';
            script.transform(transformer);
            window[modifiedScriptName] = (_d = script.data) !== null && _d !== void 0 ? _d : '';
            console.log(`after: ${(_f = (_e = script.data) === null || _e === void 0 ? void 0 : _e.length) !== null && _f !== void 0 ? _f : '0'} bytes`);
            return script;
        }
        static appendScript(src) {
            console.log('append script: started');
            Script.append((el) => el.src = src);
            console.log('append script: finished');
        }
        static regexEscape(str) {
            return str.replace(/[.\-$^*?+\\/\\|[\]{}()]/g, '\\$&');
        }
        static replaceData(data, searchValue, replacer, options) {
            if (typeof data === 'undefined') {
                console.error(`replace ${searchValue.toString()}: data is undefined`);
                return data;
            }
            if (searchValue instanceof RegExp ? data.match(searchValue) : data.includes(searchValue)) {
                if (typeof replacer === 'string') {
                    if (options === null || options === void 0 ? void 0 : options.global) {
                        data = data.split(searchValue).join(replacer);
                    }
                    else {
                        data = data.replace(searchValue, replacer);
                    }
                }
                else {
                    data = data.replace(searchValue, replacer);
                }
            }
            else if (!(searchValue instanceof RegExp && searchValue.global)) {
                console.error(`replace '${searchValue.toString()}': not found`);
            }
            return data;
        }
        static append(fill) {
            const el = document.createElement('script');
            el.type = 'text/javascript';
            fill(el);
            document.head.appendChild(el);
        }
        valueOf() {
            return this.data;
        }
        replace(searchValue, replacer) {
            this.data = Script.replaceData(this.data, searchValue, replacer);
            return this;
        }
        replaceAll(searchValue, replacement) {
            this.data = Script.replaceData(this.data, searchValue, replacement, { global: true });
            return this;
        }
        replaceCUIBlock(block, searchValue, replacer) {
            var _a;
            const blockSearchValue = new RegExp(`(\\/\\*\\s*${Script.regexEscape(block)}\\s*\\*\\/\n(\\s+)\\{\\s*\n\\s+)([\\s\\S]*?)(\n\\2\\})`);
            if ((_a = this.data) === null || _a === void 0 ? void 0 : _a.match(blockSearchValue)) {
                this.data = this.data.replace(new RegExp(`(\\/\\*\\s*${Script.regexEscape(block)}\\s*\\*\\/\n(\\s+)\\{\\s*\n\\s+)([\\s\\S]*?)(\n\\2\\})`), (_data, open, _, block, close) => open + Script.replaceData(block, searchValue, replacer) + close);
            }
            else {
                console.error(`replace CUI block '${block}': not found`);
            }
            return this;
        }
        removeCUIBlock(block) {
            return this.replaceCUIBlock(block, /[\s\S]+/, '');
        }
        transform(func) {
            console.log(`transform: ${func.name}`);
            func(this);
        }
        expose(prefix, { variables, functions }) {
            if (!this.data) {
                console.error('expose: data is undefined');
                return this;
            }
            this.replace(/((?:^|\n)\s*)(const|let)\s+(\w+)(?=[\s+,;\n$])/g, (text, before, variableType, variableName) => {
                var _a, _b;
                if ((_a = variables === null || variables === void 0 ? void 0 : variables.readable) === null || _a === void 0 ? void 0 : _a.includes(variableName)) {
                    return `${before}window.${prefix}_variable_${variableName} = { get: () => ${variableName} };\n${before}${variableType} ${variableName}`;
                }
                if ((_b = variables === null || variables === void 0 ? void 0 : variables.writable) === null || _b === void 0 ? void 0 : _b.includes(variableName)) {
                    return `
${before}window.${prefix}_variable_${variableName} = {
	get: () => ${variableName},
	set: (value) => ${variableName} = value
};
${before}let ${variableName}`;
                }
                return text;
            });
            this.data = this.data.replace(/(?:^|\n)\s*(async\s+)?function\s+(\w+)\s*\((.*?)\)\s*\{/g, (text, async, functionName, args) => {
                var _a, _b, _c;
                if ((_a = functions === null || functions === void 0 ? void 0 : functions.disabled) === null || _a === void 0 ? void 0 : _a.includes(functionName)) {
                    return `${text} return;`;
                }
                if ((_b = functions === null || functions === void 0 ? void 0 : functions.readable) === null || _b === void 0 ? void 0 : _b.includes(functionName)) {
                    return `\nwindow.${prefix}_function_${functionName} = ${functionName};\n${text}`;
                }
                if ((_c = functions === null || functions === void 0 ? void 0 : functions.writable) === null || _c === void 0 ? void 0 : _c.includes(functionName)) {
                    return `
${text}
	return window.${prefix}_function_${functionName}(...arguments);
}
window.${prefix}_function_${functionName} = ${async !== null && async !== void 0 ? async : ''}function(${args !== null && args !== void 0 ? args : ''}) {`;
                }
                return text;
            });
            return this;
        }
        embed() {
            if (!this.data) {
                console.error('embed failed, data is undefined');
                return;
            }
            console.log('embed script: started');
            Script.append((el) => { var _a; return el.textContent = (_a = this.data) !== null && _a !== void 0 ? _a : ''; });
            console.log('embed script: finished');
        }
    }
    console.log('created script class');
    const versionWatcherEventTypes = ['init', 'update'];
    class VersionWatcher extends EventWatcher {
        constructor(storageKey, getter) {
            super(versionWatcherEventTypes);
            this.storageKey = storageKey;
            this.getter = getter;
        }
        get() {
            var _a;
            return (_a = this.getter()) === null || _a === void 0 ? void 0 : _a.get();
        }
        watch() {
            const waitForVersion = setInterval(() => {
                var _a;
                const variable = this.getter();
                if (!variable) {
                    return;
                }
                const currentVersion = variable.get();
                if (!currentVersion) {
                    return;
                }
                clearInterval(waitForVersion);
                this.emit('init', { currentVersion }, {});
                const previousVersion = (_a = localStorage.getItem(this.storageKey)) !== null && _a !== void 0 ? _a : '';
                if (previousVersion !== currentVersion) {
                    this.emit('update', { previousVersion, currentVersion }, {});
                }
                localStorage.setItem(this.storageKey, currentVersion);
            }, 50);
        }
    }
    const versionWatchers = {
        native: new VersionWatcher('__sbg_version_native', () => window.__sbg_variable_VERSION),
        cui: new VersionWatcher('__sbg_version_cui', () => window.__sbg_cui_variable_USERSCRIPT_VERSION),
    };
    console.log('created version watchers');
    const localStorageWatcherEventTypes = ['getItem', 'setItem', 'removeItem'];
    class LocalStorageWatcher extends EventWatcher {
        constructor() {
            super(localStorageWatcherEventTypes);
        }
        watch() {
            ((originalMethod) => {
                localStorage.getItem = (key) => {
                    this.emit('getItem', { key }, { key, when: 'before' });
                    const result = originalMethod.call(localStorage, key);
                    this.emit('getItem', { key }, { key, when: 'after' });
                    return result;
                };
                // eslint-disable-next-line @typescript-eslint/unbound-method -- called safely
            })(localStorage.getItem);
            ((originalMethod) => {
                localStorage.setItem = (key, value) => {
                    this.emit('setItem', { key, value }, { key, when: 'before' });
                    originalMethod.call(localStorage, key, value);
                    this.emit('setItem', { key, value }, { key, when: 'after' });
                };
                // eslint-disable-next-line @typescript-eslint/unbound-method -- called safely
            })(localStorage.setItem);
            ((originalMethod) => {
                localStorage.removeItem = (key) => {
                    this.emit('removeItem', { key }, { key, when: 'before' });
                    originalMethod.call(localStorage, key);
                    this.emit('removeItem', { key }, { key, when: 'after' });
                };
                // eslint-disable-next-line @typescript-eslint/unbound-method -- called safely
            })(localStorage.removeItem);
        }
        isMatchEventOptions(listener, eventOptions) {
            return listener.listenerOptions.key === eventOptions.key && listener.listenerOptions.when === eventOptions.when;
        }
    }
    console.log('created storage watcher');
    async function main() {
        var _a;
        if (isUrl('login')) {
            return;
        }
        if (isUrl('game')) {
            // TODO: remove after publishing release
            const isPackagePublished = typeof window.__sbg_package_latest !== 'undefined';
            // TODO: remove when deprecate old package
            if (!isPackageLatest() || !isPackagePublished) {
                preventLoadingScript();
            }
            else {
                await waitHTMLLoaded();
                setHideCSS();
                replacePage(getHomepageURL());
            }
        }
        else {
            await waitHTMLLoaded();
            await waitEntry();
            await loadGame();
        }
        enhanceEventListeners();
        window.__sbg_language = getLanguage();
        detectLocal();
        checkEssentialFeatures(features.get(loadCUI), features.get(loadEUI));
        initFeedback();
        fixPermissionsCompatibility();
        await waitHTMLLoaded();
        setHideCSS();
        initCSS();
        initSettings();
        if (!checkVersions()) {
            return;
        }
        unsetHideCSS();
        (_a = window.__sbg_plus_modifyFeatures) === null || _a === void 0 ? void 0 : _a.call(window, features);
        execFeatures('pageLoad');
        window.__sbg_plus_localStorage_watcher = new LocalStorageWatcher();
        const nativeScript = await getNativeScript();
        await embedCUI(nativeScript);
        console.log('wait map: started');
        await wait(() => window.__sbg_variable_map);
        console.log('wait map: finished');
        initHome();
        initLayers();
        execFeatures('mapReady');
        execFireFeatures();
        saveUsername();
        console.log(`finished at ${new Date().toISOString()}`);
    }
    function initUrls() {
        // which urls should be always loaded from values values below
        // TODO: clear when deprecate old package
        const forcedUrls = !isPackageSupported() ? ['eui'] : [];
        const urls = {
            homepage: {
                local: '',
                remote: 'https://sbg-game.ru/',
            },
            game: {
                local: '',
                remote: 'https://sbg-game.ru/app',
            },
            login: {
                local: '',
                remote: 'https://sbg-game.ru/login',
            },
            desktop: {
                local: 'sbg.plus.user.js',
                remote: 'https://raw.githubusercontent.com/anmiles/userscripts/main/dist/sbg.plus.user.js',
            },
            mobile: {
                local: 'sbg.plus.user.min.js',
                remote: 'https://raw.githubusercontent.com/anmiles/userscripts/main/dist/sbg.plus.user.min.js',
            },
            intel: {
                local: 'intel.js',
                remote: 'https://sbg-game.ru/app/intel.js',
            },
            script: {
                local: 'script.js',
                remote: 'https://sbg-game.ru/app/script.js',
            },
            cui: {
                local: 'nicko.js',
                remote: 'https://raw.githubusercontent.com/nicko-v/sbg-cui/main/index.js',
            },
            eui: {
                local: 'egor.js',
                remote: 'https://github.com/egorantonov/sbg-enhanced/releases/latest/download/eui.user.js',
            },
        };
        if (window.__sbg_urls) {
            for (const urlType of urlTypes) {
                if (urlType in window.__sbg_urls && !forcedUrls.includes(urlType)) {
                    urls[urlType] = window.__sbg_urls[urlType];
                }
            }
        }
        console.log('initialized urls');
        return urls;
    }
    function isUrl(kind, url = location.href) {
        return urls[kind].remote.replace(/\/$/, '') === url.replace(/\/$/, '');
    }
    function setHideCSS() {
        document.body.classList.toggle('hidden', true);
        setCSS(`
			body.hidden > * {
				display: none;
			}

			body.hidden > .toastify {
				display: inline-block;
			}
		`);
    }
    function unsetHideCSS() {
        document.body.classList.remove('hidden');
    }
    async function copyLogs() {
        await navigator.clipboard.writeText(logs.join('\n'));
        showToast(labels.toasts.logs, 2000);
    }
    function showToast(label, duration) {
        window.Toastify && window.Toastify({
            text: label.toString(),
            duration,
            forceDuration: true,
            gravity: 'top',
            position: 'right',
            className: 'interaction-toast',
        }).showToast();
    }
    // function replaceColor(selector: string, propertyName: string, color: string) {
    // 	setCSS(`
    // 		${selector} {
    // 			${propertyName}: ${$(selector).css(propertyName).replace(/((rgb|hsl)a?\(.*?\)|#[0-9a-fA-F]{3,6})/, color).replace(/\s+!important/, '')} !important;
    // 		}
    // 	`);
    // }
    function isRecord(obj) {
        return typeof obj === 'object' && obj !== null;
    }
    function isObjectContaining(obj, properties) {
        if (!isRecord(obj)) {
            return false;
        }
        if (Object.keys(obj).length < Object.keys(properties).length) {
            return false;
        }
        for (const propertyName in properties) {
            const propertyType = properties[propertyName];
            if (!(propertyName in obj && typeof obj[propertyName] === propertyType)) {
                return false;
            }
        }
        return true;
    }
    function jsonSelect(text, keys) {
        const json = JSON.parse(text);
        let value = json;
        for (const key of keys) {
            if (!isRecord(value)) {
                throw new Error(`Значение не является объектом (попытка получить ${key} из списка ${keys.join(', ')})`);
            }
            if (!(key in value)) {
                throw new Error(`Значение не является объектом (попытка получить ${key} из списка ${keys.join(', ')})`);
            }
            value = value[key];
        }
        return value;
    }
    function addLayer(layerName, layerLikeName) {
        const source = new window.ol.source.Vector();
        const layer = new window.ol.layer.Vector({ source, className: `ol-layer__${layerName}` });
        layer.setProperties({ name: layerName }, true);
        layer.setProperties({ zIndex: layers.get(layerLikeName).getProperties().zIndex }, true);
        window.__sbg_variable_map.get().addLayer(layer);
        return layer;
    }
    function preventLoadingScript() {
        ((append) => {
            Element.prototype.append = function (...nodes) {
                if (nodes.length === 0) {
                    return;
                }
                const firstNode = nodes[0];
                if (typeof firstNode === 'object' && 'src' in firstNode && firstNode.src === getGameURL()) {
                    return;
                }
                append.apply(this, nodes);
            };
            // eslint-disable-next-line @typescript-eslint/unbound-method -- called safely
        })(Element.prototype.append);
        console.log('prevented loading script');
    }
    function replacePage(url) {
        console.log(`redirecting to ${url}`);
        window.stop();
        location.href = url;
    }
    async function waitEntry() {
        return new Promise((resolve) => {
            const storageKey = 'sbg-plus-homepage-replaced';
            setHideCSS();
            if (localStorage.getItem(storageKey)) {
                console.log('loading game immediately');
                resolve();
            }
            else {
                [...document.querySelectorAll('a')]
                    .filter((a) => isUrl('game', a.href))
                    .map((a) => {
                    a.href = 'javascript:;';
                    a.addEventListener('click', () => {
                        localStorage.setItem(storageKey, '1');
                        console.log('loading game on click');
                        resolve();
                    });
                });
                unsetHideCSS();
            }
        });
    }
    async function loadGame() {
        const gameUrl = getGameURL();
        const gameHTML = await Script.create({
            src: gameUrl,
            prefix: '__sbg_html',
            transformer: transformGameHTML,
        });
        document.write(gameHTML.valueOf());
        document.close();
    }
    function transformGameHTML(script) {
        script
            .replace(/<script class="mobile-check">.+?<\/script>/, '')
            .replace('<head>', '<head><script>if (!localStorage.getItem(\'auth\')) window.__sbg_goto(\'/login/\');</script>')
            .replace('href="style.css"', 'href="/app/style.css"');
    }
    function detectLocal() {
        if (window.__sbg_local && window.__sbg_preset !== 'full' && !localStorage.getItem('sbg-plus-disable-local-warning')) {
            alert(labels.toasts.localWarning.toString());
        }
    }
    function checkEssentialFeatures(...features) {
        for (const feature of features) {
            const storageKey = `sbg-plus-feature-disabled-${feature.key}`;
            if (!feature.isEnabled() && feature.isEnabled(true)) {
                if (!localStorage.getItem(storageKey)) {
                    localStorage.setItem(storageKey, '1');
                    alert(labels.toasts.featureSwitchedOff.format({ label: feature.label }).toString());
                }
            }
            else {
                localStorage.removeItem(storageKey);
            }
        }
    }
    function getHomepageURL() {
        return urls.homepage.remote;
    }
    function getGameURL() {
        return urls.game.remote;
    }
    function getNativeScriptSrc() {
        return urls[isMobile() ? 'script' : 'intel'].remote;
    }
    function getCUIScriptSrc() {
        return urls.cui.remote;
    }
    function getEUIScriptSrc() {
        return urls.eui.remote;
    }
    function enhanceEventListeners() {
        ((addEventListener, removeEventListener) => {
            function initEventListeners(target, type) {
                var _a, _b;
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- __events might not be initialized in native target
                target.__events = (_a = target.__events) !== null && _a !== void 0 ? _a : {};
                target.__events[type] = (_b = target.__events[type]) !== null && _b !== void 0 ? _b : { listeners: [], sealed: false };
                return target;
            }
            EventTarget.prototype.addEventListener = function (type, listener, options) {
                if (!listener) {
                    return;
                }
                const target = initEventListeners(this, type);
                if (target.__events[type].sealed) {
                    return;
                }
                target.__events[type].listeners.push(listener);
                addEventListener.call(this, type, listener, options);
            };
            EventTarget.prototype.removeEventListener = function (type, listener, options) {
                if (!listener) {
                    return;
                }
                const target = initEventListeners(this, type);
                const index = target.__events[type].listeners.indexOf(listener);
                if (index !== -1) {
                    target.__events[type].listeners.splice(index, 1);
                }
                removeEventListener.call(this, type, listener, options);
            };
            EventTarget.prototype.getEventListeners = function (type) {
                const target = initEventListeners(this, type);
                return target.__events[type].listeners;
            };
            EventTarget.prototype.getEventHandlers = function (type) {
                return this.getEventListeners(type)
                    // eslint-disable-next-line @typescript-eslint/unbound-method -- intentionally unbound listener method to use statically then
                    .map((listener) => 'handleEvent' in listener ? listener.handleEvent : listener)
                    .map((handler) => handler);
            };
            EventTarget.prototype.clearEventListeners = function (type, sealed) {
                const target = initEventListeners(this, type);
                if (sealed) {
                    target.__events[type].sealed = true;
                }
                for (const listener of target.__events[type].listeners) {
                    removeEventListener.apply(target, [type, listener]);
                }
                target.__events[type].listeners.splice(0);
            };
            EventTarget.prototype.addOnlyEventListener = function (type, listener, options) {
                if (!listener) {
                    return;
                }
                const target = initEventListeners(this, type);
                target.clearEventListeners(type, true);
                target.__events[type].listeners.push(listener);
                addEventListener.call(this, type, listener, options);
            };
            EventTarget.prototype.addRepeatingEventListener = function (type, handler, { repeats: limit, timeout, tick = () => { }, filter = () => true, cancel = () => true, }) {
                let repeats = 0;
                this.addEventListener(type, (ev) => {
                    if (!filter(ev)) {
                        return;
                    }
                    if (!cancel(ev)) {
                        repeats = 0;
                        return;
                    }
                    repeats++;
                    if (repeats >= limit) {
                        repeats = 0;
                        handler(ev);
                        return;
                    }
                    tick(ev, repeats);
                    setTimeout(() => {
                        repeats = 0;
                    }, timeout);
                });
            };
            // eslint-disable-next-line @typescript-eslint/unbound-method -- called safely
        })(EventTarget.prototype.addEventListener, EventTarget.prototype.removeEventListener);
        console.log('enhanced event listeners');
    }
    function getLanguage() {
        var _a;
        let lang;
        try {
            lang = jsonSelect((_a = localStorage.getItem('settings')) !== null && _a !== void 0 ? _a : '{}', ['lang']);
        }
        catch {
            lang = navigator.language;
        }
        const result = ['ru', 'uk', 'be', 'kk'].includes(lang.split('-')[0]) ? 'ru' : 'en';
        console.log(`detected language: ${result}`);
        return result;
    }
    function initFeedback() {
        const feedbackClickTimeout = 1000;
        const feedbackTouches = 3;
        const feedbackTouchRepeats = 2;
        document.addRepeatingEventListener('touchstart', () => {
            void copyLogs();
        }, {
            repeats: feedbackTouchRepeats,
            timeout: feedbackClickTimeout,
            filter: (ev) => ev.touches.length === feedbackTouches && !window.__sbg_plus_logs_gesture_disabled,
        });
    }
    function isPackageSupported() {
        return compareVersions(window.__sbg_package_version, window.__sbg_package_supported) >= 0;
    }
    function isPackageLatest() {
        return compareVersions(window.__sbg_package_version, window.__sbg_package_latest) >= 0;
    }
    function compareVersions(version, targetVersion) {
        if (typeof version === 'undefined' && typeof targetVersion === 'undefined') {
            return 0;
        }
        if (typeof targetVersion === 'undefined') {
            return 1;
        }
        if (typeof version === 'undefined') {
            return -1;
        }
        const parts1 = version.split('.').map((part) => parseInt(part));
        const parts2 = targetVersion.split('.').map((part) => parseInt(part));
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const part1 = parts1[i];
            const part2 = parts2[i];
            if (typeof part1 === 'undefined') {
                return -1;
            }
            if (typeof part2 === 'undefined') {
                return 1;
            }
            if (part1 < part2) {
                return -1;
            }
            if (part1 > part2) {
                return 1;
            }
        }
        return 0;
    }
    function fixPermissionsCompatibility() {
        if (typeof navigator.permissions === 'undefined') {
            Object.defineProperty(navigator, 'permissions', {
                value: {
                    query: () => ({ state: 'granted' }),
                },
            });
        }
        if (typeof window.DeviceOrientationEvent.requestPermission !== 'function') {
            // eslint-disable-next-line @typescript-eslint/require-await -- always return 'granted'
            window.DeviceOrientationEvent.requestPermission = async () => 'granted';
        }
    }
    async function embedCUI(nativeScript) {
        if (!features.get(loadCUI).isEnabled()) {
            console.log('skipped embedCUI; loading native script');
            nativeScript.embed();
            return;
        }
        console.log('embedCUI: started');
        const cuiScript = await Script.create({
            src: getCUIScriptSrc(),
            prefix: '__sbg_cui_script',
            transformer: transformCUIScript,
        });
        console.log('embedCUI: wait dbReady');
        window.addEventListener('dbReady', () => {
            console.log('embedCUI: emit olReady');
            window.dispatchEvent(new Event('olReady'));
        });
        cuiScript.embed();
        console.log('embedCUI: wait window.cuiEmbedded');
        await wait(() => window.cuiEmbedded);
        console.log('embedCUI: wait window.ol');
        await wait(() => window.ol);
        console.log('embedCUI: set view animation duration');
        setViewAnimationDuration();
        return new Promise((resolve) => {
            window.addEventListener('mapReady', () => {
                void (async () => {
                    console.log('embedCUI: wait cuiStatus === loaded');
                    await wait(() => window.cuiStatus === 'loaded');
                    console.log('embedCUI: finished');
                    console.log(`SBG Custom UI, version ${versionWatchers.cui.get()}`);
                    resolve();
                })();
            });
        });
    }
    function transformCUIScript(script) {
        script.transform(exposeCUIScript);
        script.transform(fixCompatibility);
        script.transform(fixGotoReference);
        script.transform(fixCUIDefaults);
        script.transform(fixCUIWarnings);
        script.transform(fixPointNavigation);
        script.transform(fixExternalLinks);
        features.triggers.cuiTransform.filter(isTransformer).map((transformer) => {
            transformer.exec(script);
        });
    }
    async function waitHTMLLoaded() {
        await resolveOnce((resolver) => {
            document.addEventListener('DOMContentLoaded', resolver);
        }, () => document.readyState !== 'loading');
        console.log('loaded DOM content');
    }
    async function resolveOnce(addListener, immediateCondition) {
        return new Promise((resolve) => {
            let resolved = false;
            function singleResolver() {
                if (resolved) {
                    return;
                }
                resolved = true;
                resolve();
            }
            addListener(singleResolver);
            if (immediateCondition()) {
                singleResolver();
            }
        });
    }
    async function getNativeScript() {
        return Script.create({
            src: getNativeScriptSrc(),
            prefix: '__sbg_script',
            transformer: transformNativeScript,
        });
    }
    function isMobile() {
        if ('maxTouchPoints' in navigator) {
            return navigator.maxTouchPoints > 0;
        }
        if ('msMaxTouchPoints' in navigator) {
            // @ts-expect-error 2339 -- navigator is narrowed to never because TS assumes navigator always has 'maxTouchPoints' property
            return navigator.msMaxTouchPoints > 0;
        }
        if ('orientation' in window) {
            return true;
        }
        // @ts-expect-error 2339 -- navigator is narrowed to never because TS assumes navigator always has 'maxTouchPoints' property
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        return /\b(BlackBerry|webOS|iPhone|IEMobile|Android|Windows Phone|iPad|iPod)\b/i.test(navigator.userAgent);
    }
    function loadCUI() {
        // stub function. CUI is actually loaded with `embedCUI` function and is called directly from main()
        return;
    }
    function loadEUI() {
        window.cuiStatus = 'loaded';
        Script.appendScript(getEUIScriptSrc());
    }
    function transformNativeScript(script) {
        script.transform(exposeNativeScript);
        script.transform(includeYMaps);
        script.transform(exposeAttackSliderData);
        script.transform(preserveStorage);
        script.transform(fixExternalLinks);
    }
    function exposeNativeScript(script) {
        const disabledLocationFunctions = !isMobile() && localStorage.getItem('homeCoords') ? ['movePlayer'] : [];
        script.expose('__sbg', {
            variables: {
                readable: ['draw_slider', 'FeatureStyles', 'is_dark', 'ItemTypes', 'LANG', 'map', 'TeamColors', 'temp_lines_source', 'units', 'VERSION'],
                writable: ['self_data'],
            },
            functions: {
                readable: ['apiQuery', 'deleteInventoryItem', 'jquerypassargs', 'openProfile', 'takeUnits'],
                writable: ['drawLeaderboard', 'manageDrawing', 'movePlayer', 'showInfo', 'timeToString'],
                disabled: [...disabledLocationFunctions],
            },
        });
    }
    function includeYMaps(script) {
        const layerName = 'ymaps';
        // TODO: make ymaps by default after cleaning up theme logic
        const isChecked = localStorage.getItem('sbg-plus-state-ymaps') === '1';
        const ymapsInput = $('<input type="radio" />').attr('name', 'baselayer').val(layerName).prop('checked', isChecked);
        const ymapsSpan = $('<span></span>').text(labels.ymaps.toString());
        const ymapsLabel = $('<label></label>').addClass('layers-config__entry').append(ymapsInput).append(' ').append(ymapsSpan);
        $('input[value="osm"]').parent().after(ymapsLabel);
        script
            .replace('if (type == \'osm\') {', `if (type == '${layerName}') { \n  theme = is_dark ? 'dark' : 'light';\n  source = new ol.source.XYZ({ url: \`https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&scale=1&projection=web_mercator&theme=\${theme}&lang=\${window.__sbg_language}\` });\n} else if (type == 'osm') {\n`);
    }
    function exposeAttackSliderData(script) {
        if (!isMobile()) {
            return;
        }
        script
            .replace(/\$\('#catalysers-list'\)\.append\(el\)/g, 'if (e.l > self_data.l) el.attr(\'data-disabled\', 1);\n$(\'#catalysers-list\').append(el)');
    }
    function setCSS(css) {
        const style = document.createElement('style');
        style.setAttribute('type', 'text/css');
        style.innerHTML = css;
        document.body.appendChild(style);
    }
    window.setCSS = setCSS;
    function initCSS() {
        setCSS(`
			.topleft-container,
			.bottom-container {
				z-index: 1;
			}

			.popup > .popup.sbg-plus-settings {
				left: 0;
				top: 0;
				width: 100%;
				height: 100%;
				transform: none;
				position: absolute;
				padding: 0.5em 1em;
				color: var(--text);
			}

			.sbg-plus-settings .settings-content {
				width: 100%;
				gap: 0;
			}

			.sbg-plus-settings .settings-section h4 {
				margin: 1em 0 0.5em 0;
				order: -1;
				display: none;
			}

			.sbg-plus-settings .settings-section__item.simple ~ h4,
			.sbg-plus-settings.advanced .settings-section__item ~ h4 {
				display: block;
			}

			.sbg-plus-settings .settings-section__item {
				display: none;
			}

			.sbg-plus-settings .settings-section__item.simple {
				display: flex;
			}

			.sbg-plus-settings.advanced .settings-section__item {
				display: flex;
			}

			.sbg-plus-settings .settings-section__item input[type="checkbox"] {
				padding: 0 1em;
			}

			.sbg-plus-settings .settings-section__item span {
				flex-grow: 1;
			}

			.sbg-plus-popup {
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 0.5em;
			}

			.sbg-plus-popup:before {
				-webkit-backdrop-filter: blur(5px);
				backdrop-filter: blur(5px);
			}

			.sbg-plus-popup textarea {
				display: block;
				width: 90vw;
				max-width: 800px;
				height: 90vh;
				overflow: auto;
				padding: 0.5em;
				box-sizing: border-box;
				font-family: sans-serif;
			}

			.sbg-plus-popup li {
				padding: 0.25em 0;
			}

			.sbg-plus-popup .buttons {
				display: flex;
				gap: 0.5em;
			}

			.sbg-plus-popup button {
				white-space: nowrap;
			}

			.sbg-plus-popup .popup-button-secondary {
				filter: grayscale(0.4);
			}
		`);
        console.log('initialized CSS');
    }
    async function wait(func) {
        return new Promise((resolve) => {
            const waitInterval = setInterval(() => {
                const result = func();
                if (!result) {
                    return;
                }
                clearInterval(waitInterval);
                resolve(result);
            }, 10);
        });
    }
    function initSettings() {
        new SettingsPopup();
        console.log('initialized settings');
    }
    function createPopup(cssClass, options = { roundClose: true }) {
        var _a;
        const closeButton = $('<button></button>')
            .addClass(options.roundClose ? 'popup-close' : 'popup-button-secondary')
            .attr('data-round', options.roundClose ? 'true' : null)
            .html(options.roundClose ? '&nbsp;✕&nbsp;' : labels.close.toString());
        const buttonsBlock = $('<div></div>')
            .addClass('buttons')
            .append(closeButton);
        const popup = $('<div></div>')
            .addClass(`${cssClass} sbg-plus-popup popup pp-center hidden`)
            .append(buttonsBlock)
            .appendTo('body');
        (_a = closeButton.get(0)) === null || _a === void 0 ? void 0 : _a.addOnlyEventListener('click', function () {
            popup.addClass('hidden');
        });
        return popup;
    }
    function checkVersions() {
        const updateUrl = 'https://github.com/anmiles/sbg/releases/latest';
        if (!isPackageSupported()) {
            alert(labels.upgrade.package.supported.toString());
            replacePage(updateUrl);
            return false;
        }
        if (!isPackageLatest()) {
            if (confirm(labels.upgrade.package.latest.toString())) {
                replacePage(updateUrl);
                return false;
            }
        }
        return true;
    }
    function initHome() {
        if (isMobile()) {
            return;
        }
        const homeCoords = localStorage.getItem('homeCoords');
        if (!homeCoords) {
            return;
        }
        const center = JSON.parse(homeCoords);
        window.__sbg_variable_map.get().getView().setCenter(center);
        console.log('initialized home location');
    }
    function initLayers() {
        for (const layer of window.__sbg_variable_map.get().getAllLayers()) {
            const layerName = layer.getProperties().name;
            const key = !layerName
                ? 'base'
                : layerName === 'lines' && layers.has('lines')
                    ? 'lines_temp'
                    : layerName;
            layers.set(key, layer);
        }
        console.log('initialized layers');
    }
    function execFeatures(trigger) {
        features.triggers[trigger].map((feature) => {
            if (feature instanceof Feature) {
                feature.exec(undefined);
            }
        });
        console.log(`executed all features on ${trigger}`);
    }
    function execFireFeatures() {
        let fireClicked = false;
        $('#attack-menu').on('click', () => {
            if (!fireClicked) {
                fireClicked = true;
                execFeatures('fireClick');
            }
        });
    }
    function saveUsername() {
        localStorage.setItem('sbg-plus-last-username', window.__sbg_variable_self_data.get().n);
    }
    function fixExternalLinks(script) {
        script
            .replace(/location.href = /g, 'window.__sbg_location.href = ');
    }
    function preserveStorage(script) {
        script
            .replace('function clearStorage() {', 'function clearStorage() { localStorage.removeItem(\'auth\'); return;');
    }
    function exposeCUIScript(script) {
        script
            .expose('__sbg_cui', {
            variables: {
                readable: ['USERSCRIPT_VERSION', 'config', 'database'],
            },
            functions: {
                readable: [],
                writable: ['createToast', 'getNotifs'],
            },
        });
    }
    function fixCompatibility(script) {
        script
            .replace('fetch(\'/app/script.js\')', '(async () => ({ text: async () => window.__sbg_script_modified }))()')
            .replace('window.stop', 'false && window.stop')
            .replace('window.navigator.geolocation.clearWatch', 'false && window.navigator.geolocation.clearWatch')
            .replace('document.open', 'false && document.open')
            .replace('fetch(\'/app\')', 'false && fetch(\'/app\')')
            .replace(/$/, 'window.cuiEmbedded = true')
            .replace(/\} catch.*\n.*SBG CUI: Ошибка в main/, (match) => `window.cuiStatus = 'loaded';${match}`)
            .replace(/window\.onerror = (.*);/, (_match, func) => `window.__sbg_onerror_handlers.push(${func});`)
            .expose('__sbg_cui', {
            functions: {
                readable: ['olInjection', 'loadMainScript', 'main'],
            },
        });
    }
    function setViewAnimationDuration() {
        if (typeof window.__sbg_plus_animation_duration === 'number') {
            ((animate) => {
                window.ol.View.prototype.animate = function (...args) {
                    const instantArgs = args.map((arg) => typeof arg === 'object' ? { ...arg, duration: window.__sbg_plus_animation_duration } : arg);
                    animate.call(this, ...instantArgs);
                };
            })(window.ol.View.prototype.animate);
        }
    }
    function fixGotoReference(script) {
        $(document).on('click', 'a[href*="point="]', (ev) => {
            var _a;
            const guid = (_a = ev.currentTarget.href.split('point=').pop()) === null || _a === void 0 ? void 0 : _a.split('&').shift();
            window.__sbg_function_showInfo(guid);
            ev.stopPropagation();
            return false;
        });
        script
            .replace('window.location.href = `/app/?point=${guid}`', 'window.__sbg_function_showInfo(guid)');
    }
    function fixCUIDefaults(script) {
        script
            .replace('sepia: 1', 'sepia: 0');
    }
    function fixCUIWarnings(script) {
        script
            .replace('!viewportMeta.content.match(yaRegexp)', '!viewportMeta.content.match(yaRegexp) && navigator.userAgent.toLowerCase().includes("yabrowser")');
    }
    function fixPointNavigation(script) {
        if (!('__sbg_share' in window)) {
            return;
        }
        script
            .replaceCUIBlock('Навигация и переход к точке', 'window.location.href = url', `if (window.__sbg_share.open(url) === false) {
					navigator.clipboard.writeText(lastOpenedPoint.coords);
					createToast('${labels.toasts.noGeoApp.toString()}', 'top left', 3000).showToast();
				}`);
    }
    function enableConsoleDebuggingOfDatabase(script) {
        script
            .replace(/const openRequest = .*/, (line) => [
            'console.log(`IDB: before open',
            '`);',
            line,
            'console.log(`IDB: after open',
            '`);',
        ].join(' '))
            .replace(/openRequest\.addEventListener\('(.*?)', event => \{/, (line, eventName) => [
            line,
            'console.log(`IDB: openRequest',
            `event=${eventName}`,
            '`);',
        ].join(' '))
            .replace(/database\.addEventListener\('(.*?)', event => \{/, (line, eventName) => [
            line,
            'console.log(`IDB: database',
            `event=${eventName}`,
            '`);',
        ].join(' '))
            .replace(/function initializeDB.*/, (line) => [
            line,
            'console.log(`IDB: initializeDB',
            '`);',
        ].join(' '))
            .replace(/function updateDB.*/, (line) => [
            line,
            'console.log(`IDB: updateDB',
            'oldVersion=` + oldVersion + `',
            'newVersion=` + newVersion + `',
            '`);',
        ].join(' '))
            .replace(/\{ (updateToVersion.*?) \}/, (_line, code) => [
            '{',
            'console.log(`IDB: updateToVersion started',
            'v=` + v + `',
            '`);',
            code,
            'console.log(`IDB: updateToVersion finished',
            'v=` + v + `',
            '`);',
            '}',
        ].join(' '))
            .replace(/database = event.target.result;/, (line) => [
            'console.log(`IDB: upgradeneeded',
            'oldVersion=` + oldVersion + `',
            'newVersion=` + newVersion + `',
            '`);',
            line,
        ].join(' '))
            .replace('transaction.addEventListener(\'complete\', () => { window.dispatchEvent(new Event(\'dbReady\')); });', 'transaction.addEventListener(\'complete\', () => { console.log(`IDB: transaction completed`); window.dispatchEvent(new Event(\'dbReady\')); });')
            .replace(/const transaction = database\.transaction\((.*?)\);/, (line, code) => [
            'console.log(`IDB: transaction',
            `args=${JSON.stringify(code)}`,
            '`);',
            line,
            ...['complete', 'error', 'success', 'abort'].map((eventName) => [
                `transaction.addEventListener('${eventName}', (...args) => {`,
                'console.log(`IDB: transaction',
                `event=${eventName}`,
                'args=` + JSON.stringify(args) + `',
                '`);',
                '});',
            ]).flat(),
        ].join(' '))
            .replace(/function getData\(event\) \{/, (line) => [
            line,
            'console.log(`IDB: getData',
            'storeName=` + event.target.source.name + `',
            'result=` + JSON.stringify(event.target.result) + `',
            '`);',
        ].join(' '))
            .replace(/if \(cursor != undefined\) \{/, (line) => [
            line,
            'console.log(`IDB: objectToPopulate',
            'cursor=` + JSON.stringify(cursor) + `',
            'hasKey=` + (\'key\' in cursor) + `',
            '`);',
        ].join(' '))
            .replace(/window.dispatchEvent\(new Event\('(.*?)'\)\)/, (line, eventName) => [
            'console.log(`IDB: dispatch',
            `event=${eventName}`,
            '`);',
            line,
        ].join(' '));
    }
    function disableClusters(script) {
        script
            .replace('function mapClickHandler(event) {', 'function mapClickHandler(event) { event.isSilent = true;');
    }
    function disableAttackZoom(script) {
        setCSS(`
			.sbgcui_lock_rotation[sbgcui_locked="true"]::before {
				transition: none !important;
			}
		`);
        script
            .replace('fitBlastRange(isCompleted) {', 'fitBlastRange(isCompleted) { isCompleted = true;');
    }
    function unlockCompassWhenRotateMap(script) {
        script
            .replaceCUIBlock('Вращение карты', 'if (latestTouchPoint == null) { return; }', 'if (latestTouchPoint == null) { if (isRotationLocked) { toggleRotationLock(event); touchStartHandler({...event, target: event.target, touches: [event.touches[0]], targetTouches: [event.targetTouches[0]] }); } return; }');
    }
    function disableCarouselAnimation(splide) {
        (splide.defaults || (splide.defaults = {})).speed = 0;
    }
    function disablePopupAnimation() {
        setCSS(`
			.popup {
				transition: none !important;
			}
		`);
    }
    function disableMapAnimation() {
        window.__sbg_plus_animation_duration = 0;
    }
    function disableAttackButtonAnimation() {
        setCSS(`
			#attack-menu,
			#attack-menu:after {
				transition: none !important;
			}
		`);
    }
    function closeToastsAfter1sec(toastify) {
        ((_init) => {
            toastify.prototype.init = function (options) {
                if (!options.forceDuration) {
                    if (!options.duration) {
                        options.duration = 0;
                    }
                    else {
                        if (options.duration > 0 && options.duration <= 3000) {
                            options.duration = Math.min(options.duration, 1000);
                        }
                    }
                }
                _init.call(this, options);
                return this;
            };
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- intentional assignment of prototype
            toastify.prototype.init.prototype = _init.prototype;
        })(toastify.prototype.init);
    }
    function disableAllAnimations() {
        return;
    }
    function enableBackButton() {
        var _a;
        const backClickTimeout = 1000;
        const popups = [
            { hiddenClass: 'hidden', selectors: ['.popup', '.draw-slider-wrp', '.attack-slider-wrp'] },
            { hiddenClass: 'sbgcui_hidden', selectors: ['.sbgcui_settings'] },
        ];
        function isPopupClosed() {
            let isClosed = false;
            for (const { hiddenClass, selectors } of popups) {
                for (const selector of selectors) {
                    for (const el of $(selector).toArray()) {
                        if (!el.classList.contains(hiddenClass)) {
                            el.classList.add(hiddenClass);
                            if (selector === '.draw-slider-wrp') {
                                $('#draw-slider-close').trigger('click');
                            }
                            if (selector === '.attack-slider-wrp') {
                                $('#attack-menu').removeClass('sbgcui_attack-menu-rotate');
                            }
                            isClosed = true;
                        }
                    }
                }
            }
            return isClosed;
        }
        (_a = window.__sbg_game) === null || _a === void 0 ? void 0 : _a.enableBackButton();
        document.addRepeatingEventListener('backbutton', () => {
            location.replace('/window.close');
        }, {
            repeats: 2,
            timeout: backClickTimeout,
            tick: () => {
                showToast(labels.toasts.back, backClickTimeout);
            },
            cancel: () => !isPopupClosed(),
        });
    }
    function showBuilderPanel() {
        void (async () => {
            const buttonsSection = await wait(() => $('.topleft-container'));
            new Builder(buttonsSection);
        })();
    }
    function showFeatureToggles() {
        const containers = {
            info: $('.info.popup .i-image-box'),
            inventory: $('.inventory.popup'),
        };
        Object.values(containers).forEach((container) => $('<div></div>').addClass('i-buttons i-feature-toggles').appendTo(container));
        const featureToggles = [
            { container: 'info', title: 'ARR', feature: features.get(arrangeButtons) },
            { container: 'info', title: 'CLS', feature: features.get(hideCloseButton) },
            { container: 'info', title: 'REP', feature: features.get(hideRepairButton) },
            { container: 'info', title: 'TMR', feature: features.get(colorizeTimer) },
            { container: 'info', title: 'SWP', feature: features.get(replaceSwipeWithButton) },
            { container: 'inventory', title: 'CUI', feature: features.get(restoreCUISort) },
            { container: 'inventory', title: 'BUT', feature: features.get(moveReferenceButtonsDown) },
            { container: 'inventory', title: 'CLR', feature: features.get(hideManualClearButtons) },
        ];
        for (const { container, title, feature } of featureToggles) {
            const button = $('<button></button>')
                .html(title)
                .toggleClass('off', !feature.isEnabled())
                .appendTo(containers[container].find('.i-buttons'));
            button.on('click', () => {
                const toggleValue = feature.toggle();
                button.toggleClass('off', !toggleValue);
            });
        }
        setCSS(`
			.i-feature-toggles {
				position: absolute !important;
				left: 0;
				bottom: 0;
				justify-content: flex-start;
				direction: ltr;
			}

			.i-feature-toggles button {
				width: auto;
				position: relative;
				z-index: 1;
				font-size: 0.85em;
				min-height: 0px;
				line-height: 1;
			}

			.i-feature-toggles button.off {
				filter: saturate(0.15);
			}
		`);
    }
    function updateLangCacheAutomatically() {
        versionWatchers.native.on('update', ({ currentVersion }) => {
            console.log(`update lang cache to match ${currentVersion} version`);
            $('#lang-cache').trigger('click');
        }, { previous: true });
    }
    function fixBlurryBackground() {
        setCSS(`
			.popup.pp-center {
				backdrop-filter: none;
				-webkit-backdrop-filter: none;
			}

			.popup.pp-center:before {
				content: '';
				position: absolute;
				left: 0;
				top: 0;
				width: 100%;
				height: 100%;
				-webkit-backdrop-filter: blur(5px);
				backdrop-filter: blur(5px);
				z-index: -1;
			}
		`);
    }
    function alignSettingsButtonsVertically() {
        setCSS(`
			.settings-section__button {
				justify-self: unset !important;
			}

			.settings-section__item {
				grid-template-columns: 5fr 3fr;
			}

			.settings-section__item select {
				text-align: center;
			}
		`);
    }
    function fixCompass() {
        const handlers = [...window.getEventHandlers('deviceorientation')];
        function triggerHandlers(webkitCompassHeading) {
            handlers.map((handler) => {
                handler({ webkitCompassHeading });
            });
        }
        function deviceOrientationAbsoluteListener(ev) {
            if (!ev.absolute || ev.alpha == null || ev.beta == null || ev.gamma == null) {
                return;
            }
            const totalDegrees = 360;
            const webkitCompassHeading = -(ev.alpha + ev.beta * ev.gamma / 90) % totalDegrees;
            window.removeEventListener('deviceorientation', deviceOrientationListener);
            triggerHandlers(webkitCompassHeading);
        }
        const deviceOrientationListener = (ev) => {
            const { webkitCompassHeading } = ev;
            if (webkitCompassHeading !== null && !isNaN(webkitCompassHeading)) {
                triggerHandlers(webkitCompassHeading);
                window.removeEventListener('deviceorientationabsolute', deviceOrientationAbsoluteListener);
            }
        };
        function addListeners() {
            window.addEventListener('deviceorientationabsolute', deviceOrientationAbsoluteListener);
            window.addEventListener('deviceorientation', deviceOrientationListener);
        }
        void (async () => {
            const response = await window.DeviceOrientationEvent.requestPermission();
            if (response === 'granted') {
                addListeners();
            }
            else {
                console.warn('DeviceOrientationEvent permission is not granted');
            }
        })();
    }
    function showLevelUpCongratulations() {
        const storageKey = 'lastUserLevel';
        const selfData = window.__sbg_variable_self_data.get();
        if (!localStorage.getItem(storageKey)) {
            localStorage.setItem(storageKey, selfData.l.toString());
        }
        const congratulation = $(`
			<h3>New access</h3>
			<p>Level&nbsp;<span class="value"></span></p>
			<p>🎉</p>
		`);
        const overlay = $('<div></div>')
            .addClass('levelup-overlay')
            .appendTo('body');
        const popup = $('<div></div>')
            .addClass('levelup')
            .append(congratulation)
            .appendTo(overlay);
        const showPopup = () => {
            popup
                .find('.value')
                .text(localStorage.getItem(storageKey));
            overlay.show();
            setTimeout(() => {
                overlay.addClass('active');
            }, 1);
            setTimeout(() => {
                overlay
                    .on('click.close', () => {
                    overlay
                        .removeClass('active')
                        .off('click.close')
                        .hide();
                });
            }, 1000);
        };
        const checkPopup = (newValue) => {
            if (newValue.toString() !== localStorage.getItem(storageKey)) {
                localStorage.setItem(storageKey, newValue.toString());
                showPopup();
            }
        };
        document.querySelector('#self-info__explv')
            .addRepeatingEventListener('click', () => {
            showPopup();
        }, {
            repeats: 3,
            timeout: 1000,
        });
        window.__sbg_variable_self_data.set(new Proxy(selfData, {
            set: (target, property, newValue) => {
                target[property] = newValue;
                if (property === 'l') {
                    checkPopup(Number(newValue));
                }
                return true;
            },
        }));
        checkPopup(selfData.l);
        setCSS(`
			.levelup-overlay {
				display: none;
				position: fixed;
				left: 0;
				top: 0;
				width: 100%;
				height: 100%;
				z-index: 65534;
				background: rgba(0, 0, 0, 0.8);
				opacity: 0;
			}

			.levelup-overlay.active {
				opacity: 1;
				transition: 1s opacity;
			}

			.levelup {
				width: calc(100% - 120px);
				max-width: 320px;
				border: 2px solid #fdba3e !important;
				background-color: hsl(41deg 54% 7%);
				padding: 20px 0 !important;
				text-transform: uppercase;
				text-align: center;
				position: absolute;
				z-index: 65535;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
			}

			.levelup h3 {
				margin: 0;
				color: #fed647;
			}

			.levelup p {
				font-size: 3em;
				color: #feebb4;
				margin: 0;
			}

			#self-info__explv {
				pointer-events: auto;
			}
		`);
    }
    function hideInventoryLimit() {
        setCSS(`
			#self-info__inv:after {
				display: none;
			}
		`);
    }
    function disableCopyingLogsWithThreeFingers() {
        window.__sbg_plus_logs_gesture_disabled = true;
    }
    /* eui */
    function centerIconsInGraphicalButtons() {
        setCSS(`
			.material-symbols-outlined {
				line-height: 1 !important;
			}
		`);
    }
    function showReloadButtonInCompactMode() {
        setCSS(`
			.game-menu button.fa-solid-rotate:first-child:last-child {
				height: 2em;
				position: absolute;
				top: 0.75em;
				right: 0.75em;
			}
		`);
    }
    function useTeamColorForButtonsInIngressTheme() {
        setCSS(`
			:root {
				--ingress-btn-color: var(--sbgcui-branding-color);
				--ingress-btn-border-color: var(--sbgcui-branding-color);
				--ingress-btn-bg-color: var(--ol-background-color);
				--ingress-btn-glow-color: transparent;

				--ingress-btn-hl-color: var(--sbgcui-branding-color);
				--ingress-btn-hl-border-color: var(--sbgcui-branding-color);
				--ingress-btn-hl-bg-color: var(--ol-background-color);
				--ingress-btn-hl-glow-color: transparent;
			}

			.ol-control button {
				box-shadow: none !important;
				border: none !important;
			}
		`);
    }
    /* fire */
    function alwaysCenterAlignFireItemsCount() {
        setCSS(`
		.splide__slide[data-rarity] .catalysers-list__amount {
			display: block !important;
		}
		.splide__slide[data-rarity] .catalysers-list__amount:before {
			content: '';
			display: inline-block;
			background: currentColor;
			width: 1em;
			height: 1em;
			position: absolute;
			right: 8px;
			font-size: 0.85em;
			bottom: 5px;
		}
		`);
    }
    function replaceHighlevelWarningWithIcon() {
        setCSS(`
			#attack-slider {
				padding: 4px 0;
			}

			.attack-slider-highlevel {
				display: none;
			}

			#catalysers-list > .splide__slide[data-disabled]:after {
				display: block;
				content: "";
				position: absolute;
				left: 0;
				top: 0;
				width: 100%;
				height: 100%;
				background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle r="47" cx="50" cy="50" fill="none" stroke="red" stroke-width="6"></circle><line x1="15" y1="15" x2="85" y2="85" stroke="red" stroke-width="6"></line></svg>') center center no-repeat;
			}
		`);
    }
    function joinFireButtons(attackMenu) {
        const menuHeight = attackMenu.outerHeight();
        setCSS(`
			.attack-slider-wrp {
				transition: none;
				position: relative;
				z-index: 3;
			}

			.attack-slider-buttons {
				position: absolute;
				top: 100%;
				left: 50%;
				padding: 0;
			}

			#attack-slider-fire {
				max-width: ${menuHeight}px;
				height: ${menuHeight}px;
				opacity: 0;
				position: relative;
				left: -50%;
			}

			#attack-menu {
				opacity: 0.7;
			}

			#attack-menu.sbgcui_attack-menu-rotate {
				border-color: var(--sbgcui-branding-color) !important;
				width: 80px !important;
				height: 80px !important;
				opacity: 1;
			}

			#attack-menu.sbgcui_attack-menu-rotate::after {
				background: var(--sbgcui-branding-color) !important;
			}
		`);
        $(window).on('click', function (ev) {
            const target = ev.target;
            if (target.id !== 'attack-menu' && $('.attack-slider-wrp.hidden').length === 0 && $(target).parents('.attack-slider-wrp').length === 0) {
                $('#attack-menu').trigger('click');
            }
        });
    }
    /* toolbar */
    function showQuickAutoSelectButton(toolbar) {
        const autoSelect = window.__sbg_cui_variable_config.get().autoSelect;
        const cssClass = autoSelect.deploy === 'max' ? 'fa-rotate-180' : '';
        const autoSelectButton = $('<button></button>')
            .addClass('fa fa-solid-arrow-down-short-wide')
            .addClass(cssClass)
            .prependTo(toolbar);
        autoSelectButton.on('click', () => {
            autoSelectButton.toggleClass('fa-rotate-180');
            const isMax = autoSelectButton.hasClass('fa-rotate-180');
            $('select[name="autoSelect_deploy"]').val(isMax ? 'max' : 'min');
            $('select[name="autoSelect_upgrade"]').val(isMax ? 'max' : 'min');
            $('form.sbgcui_settings button:contains("Сохранить")').trigger('click');
        });
        setCSS(`
			.fa-rotate-180 {
				transform: scale(-1, 1);
			}
		`);
    }
    function moveAllSidebarsRight(control) {
        $('.ol-control').first()
            .addClass('toolbar')
            .prepend(control.children());
        setCSS(`
			.ol-control.toolbar {
				display: flex;
				flex-direction: column;
			}

			.ol-control.toolbar #settings {
				order: 99;
				margin-bottom: 0;
			}

			.sbgcui_toolbar {
				gap: 0;
			}

			.sbgcui_toolbar + button {
				margin-bottom: 10px;
			}

			#toggle-follow {
				margin-bottom: 10px;
			}

			.sbgcui_lock_rotation {
				margin-top: 10px !important;
			}
		`);
    }
    function hideCUIToolbarToggleButton() {
        setCSS(`
			.sbgcui_toolbar {
				display: flex !important;
				margin-bottom: 10px;
			}

			.sbgcui_toolbar + button {
				display: none !important;
			}
		`);
    }
    /* inventory */
    function showAutoDeleteSettingsButton(inventoryPopup) {
        $('<button></button>')
            .text('Auto-delete')
            .css({ height: '40px' })
            .appendTo(inventoryPopup)
            .on('click', () => {
            $('#inventory__close').trigger('click');
            $('.sbgcui_settings').removeClass('sbgcui_hidden');
            $('.sbgcui_settings-title:contains("Автоудаление")').trigger('click');
        });
    }
    function moveReferenceButtonsDown() {
        setCSS(`
			[data-feat-moveReferenceButtonsDown] .inventory__controls {
				height: 0;
				min-height: 0;
				overflow: hidden;
			}

			[data-feat-moveReferenceButtonsDown] .inventory__content[data-tab="3"] ~ .inventory__controls > select {
				position: fixed;
				right: 0;
				bottom: 51px;
				height: 40px;
				flex-grow: 0;
				flex-shrink: 0;
				margin: 0 4px;
				width: calc(100% - 8px);
				text-align: center;
			}

			[data-feat-moveReferenceButtonsDown] .inventory__content[data-tab="3"] ~ .inventory__controls > .sbgcui_refs-sort-button {
				border-width: revert;
				border-radius: 0;
				bottom: 51px;
				z-index: 2;
				right: 4px;
				height: 40px;
				width: 40px;
				font-size: 20px;
			}

			[data-feat-moveReferenceButtonsDown] #inventory__close {
				bottom: 102px;
			}

			[data-feat-moveReferenceButtonsDown] .inventory__content[data-tab="3"] {
				margin-bottom: 41px;
			}
		`);
    }
    function hideManualClearButtons() {
        setCSS(`
			[data-feat-hideManualClearButtons] .inventory__controls {
				height: 0;
				min-height: 0;
				overflow: hidden;
			}

			[data-feat-hideManualClearButtons] .inventory__content[data-tab="3"] ~ .inventory__controls > select {
				position: fixed;
				right: 0;
				bottom: 51px;
				height: 40px;
				flex-grow: 0;
				flex-shrink: 0;
				margin: 0 4px;
				width: calc(100% - 8px);
				text-align: center;
			}

			[data-feat-hideManualClearButtons] .inventory__content[data-tab="3"] ~ .inventory__controls > .sbgcui_refs-sort-button {
				border-width: revert;
				border-radius: 0;
				bottom: 51px;
				z-index: 2;
				right: 4px;
				height: 40px;
				width: 40px;
				font-size: 20px;
			}

			[data-feat-hideManualClearButtons] #inventory__close {
				bottom: 102px;
			}

			[data-feat-hideManualClearButtons] .inventory__content[data-tab="3"] {
				margin-bottom: 41px;
			}
		`);
    }
    function alwaysShowSelfStatistics(drawLeaderboard) {
        window.__sbg_function_drawLeaderboard = async function () {
            var _a, _b, _c;
            await drawLeaderboard();
            const statMap = {
                owned: 'owned_points',
            };
            const stat = (_b = (_a = $('#leaderboard__term-select').val()) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : '';
            const data = (await window.__sbg_function_apiQuery('profile', { guid: String($('#self-info__name').data('guid')) })).response.data;
            const value = data[(_c = statMap[stat]) !== null && _c !== void 0 ? _c : stat];
            const entry = window.__sbg_function_jquerypassargs($('<li>'), '$1$ — $2$; $3$ $4$', $('<span>', { class: 'profile-link' })
                .text(data.name)
                .css('color', `var(--team-${data.team})`)
                .attr('data-name', data.name)
                .on('click', (el) => void window.__sbg_function_openProfile(el)), $('<span>').text(window.i18next.t('leaderboard.level', { count: data.level })).css('color', `var(--level-${data.level})`), ...window.__sbg_function_takeUnits(value !== null && value !== void 0 ? value : 0));
            const list = $('<ol>')
                .addClass('leaderboard__list_self')
                .attr('start', $('#leaderboard__place-pos').text())
                .append(entry);
            $('.leaderboard__list_self').remove();
            $('.leaderboard__list').after(list);
        };
        setCSS(`
			.leaderboard__list_self {
				flex-shrink: 0;
				border-top: 1px solid white;
				margin: 0;
				overflow-y: auto;
				padding-left: 3em;
			}
		`);
    }
    function restoreCUISort() {
        setCSS(`
			[data-feat-restoreCUISort] .inventory__content[data-tab="3"] ~ .inventory__controls > #eui-sort {
				display: none !important;
			}

			[data-feat-restoreCUISort] .inventory__content[data-tab="3"] ~ .inventory__controls > .sbgcui_refs-sort-button,
			[data-feat-restoreCUISort] .inventory__content[data-tab="3"] ~ .inventory__controls > .sbgcui_refs-sort-select {
				display: block !important;
			}
		`);
    }
    function fixSortButton(_button) {
        setCSS(`
			.sbgcui_refs-sort-button {
				z-index: 100 !important;
			}
		`);
    }
    function reportCUIUpdates() {
        versionWatchers.cui.on('update', ({ currentVersion }) => {
            const message = labels.toasts.cuiUpdated.format({ currentVersion });
            showToast(message, 2000);
            if (window.__sbg_local) {
                alert(message);
            }
        }, { previous: true });
    }
    function moveDestroyNotificationsToTop() {
        ((createToast) => {
            window.__sbg_cui_function_createToast = function (content, position, duration, className, oldestFirst) {
                if (className === 'sbgcui_destroy_notif_toast') {
                    position = 'top left';
                }
                return createToast(content, position, duration, className, oldestFirst);
            };
        })(window.__sbg_cui_function_createToast);
        setCSS(`
			.sbgcui_destroy_notifs>.toastify:nth-child(1) {
				translate: 0 calc(2em - 5px);
			}

			.sbgcui_destroy_notifs>.toastify:nth-child(2) {
				translate: 0 calc(2em - 10px);
			}

			.sbgcui_destroy_notifs>.toastify:nth-child(3) {
				translate: 0 calc(2em - 15px);
			}

			.sbgcui_destroy_notifs {
				bottom: auto;
				top: 5px;
			}
		`);
    }
    function quickRecycleAllRefs(inventoryContent) {
        setCSS(`
			.inventory__content[data-tab="3"] .inventory__item {
				display: flex;
				flex-direction: row;
			}

			.inventory__content[data-tab="3"] .inventory__item-left {
				order: 0;
			}

			.inventory__content[data-tab="3"] .inventory__item-controls {
				flex-direction: row;
			}

			.inventory__content[data-tab="3"] .inventory__item-controls button {
				width: 30px;
				margin-left: 4px;
			}

			.inventory.popup .inventory__manage-amount[data-tab="3"] {
				display: none;
			}
		`);
        const inventoryContentEl = inventoryContent.get(0);
        inventoryContentEl.getEventListeners('click').forEach((listener) => {
            inventoryContentEl.removeEventListener('click', listener);
        });
        $(document).on('click', '.inventory__content', function (ev) {
            var _a;
            if (!ev.target) {
                return;
            }
            if (!$(ev.target).is('.inventory__ic-manage')) {
                if ($(ev.target).is('.inventory__ic-view')) {
                    ev.offsetX = 0;
                }
                inventoryContentEl.getEventHandlers('click').map((func) => {
                    ev.originalEvent && func(ev.originalEvent);
                });
                return;
            }
            const el = $(ev.target).parents('.inventory__item');
            const inventory = (JSON.parse((_a = localStorage.getItem('inventory-cache')) !== null && _a !== void 0 ? _a : '[]') || []);
            const item = inventory.find((item) => item.g == el.attr('data-guid'));
            if (!item) {
                return;
            }
            const fakeEl = $('<input />')
                .addClass('inventory__ma-amount')
                .val(item.a)
                .css({ display: 'none' });
            Object.defineProperty(fakeEl.get(0), 'reportValidity', { value: () => true });
            el.append(fakeEl);
            el.attr('data-tab', item.t);
            void window.__sbg_function_deleteInventoryItem(el);
        });
    }
    function shrinkRefsListUntilMinimumNeededLength() {
        setCSS(`
			.inventory__content[data-tab="3"] {
				align-self: flex-start;
			}
		`);
    }
    /* info popup */
    function makeInfoPopupSemiTransparent() {
        setCSS(`
			.info.popup {
				background-color: transparent;
			}
		`);
    }
    function alwaysShowSecondsForCoolDowns() {
        const cooldownSeconds = 90;
        const visibleSeconds = 100;
        const visibleSecondsPrevious = 60;
        window.__sbg_function_timeToString = function (seconds) {
            return seconds >= visibleSeconds
                ? window.i18next.t('units.min', { count: Math.floor(seconds / 60) })
                : window.i18next.t('units.sec', { count: seconds });
        };
        setCSS(`
			#discover[data-remain] .discover-progress {
				transform: scale(${visibleSecondsPrevious / cooldownSeconds}, 1);
				transform-origin: left;
			}
		`);
    }
    function increaseItemsFont() {
        setCSS(`
			.inventory__content:not([data-tab="3"]) {
				display: flex;
				flex-direction: column;
				flex-wrap: wrap;
				counter-reset: section;
			}

			.inventory__content:not([data-tab="3"]) .inventory__item {
				height: calc((100% - 120px) / 5);
				width: 50%;
				box-sizing: border-box;
			}

			.inventory__content:not([data-tab="3"]) .inventory__item-title {
				height: 2em;
				margin-top: 0.8em;
				font-size: 2em;
			}

			.inventory__content:not([data-tab="3"]) .inventory__item-descr {
				margin-left: 0;
				margin-top: -0.8em;
				font-size: 1.3em !important;
			}

			.inventory__content:not([data-tab="3"]) .inventory__item-descr::first-letter {
				font-size: 0;
			}
		`);
        const itemTypes = window.__sbg_variable_ItemTypes.get();
        itemTypes[1] = 'R';
        itemTypes[2] = 'X';
        itemTypes[3] = 'K';
        itemTypes[4] = 'Br';
    }
    function enlargeCoreSlots() {
        setCSS(`
			.i-stat__cores {
				padding: 4px 0;
			}

			.i-stat__core {
				font-size: 140%;
			}
		`);
    }
    function arrangeButtons() {
        const buttons = [
            $('.sbgcui_jumpToButton'),
            $('.info .popup-close'),
            $('.sbgcui_navbutton'),
        ];
        function toggle(value) {
            buttons.map((button) => button.appendTo(value ? '.i-stat .i-buttons' : '.info.popup'));
        }
        // back compatibility with other scripts' selectors
        buttons.map((button) => button.clone().appendTo('.info.popup').hide());
        features.on('toggle', ({ feature, value }) => {
            if (feature.key === arrangeButtons.name) {
                toggle(value);
            }
        }, {});
        toggle(true);
        setCSS(`
			[data-feat-arrangeButtons] .i-stat .i-buttons {
				--buttons-container: 90vw;
				--buttons-gap: 4px;
				--buttons-border: 1.9px;
				--buttons-cols: 7;

				--buttons-col-width: calc((var(--buttons-container) - (var(--buttons-cols) - 1) * var(--buttons-gap)) / var(--buttons-cols));
				--discover-alt-button-width: calc(var(--buttons-col-width) + 0.5 * var(--buttons-border));
			}

			[data-feat-arrangeButtons] .i-stat .i-buttons {
				gap: var(--buttons-gap) !important;
				direction: rtl !important;
			}

			[data-feat-arrangeButtons] .i-stat .i-buttons button {
				border-width: 2px;
				min-height: var(--buttons-col-width) !important;
			}

			[data-feat-arrangeButtons] #discover {
				width: var(--buttons-container);
			}

			[data-feat-arrangeButtons] #discover:after {
				content: '';
				width: calc(2 * var(--buttons-col-width) + var(--buttons-gap));
				height: var(--buttons-col-width);
				transform: none;
				left: calc(var(--buttons-col-width) + var(--buttons-gap) - var(--buttons-border));
				top: calc(-1 * var(--buttons-border) + var(--buttons-col-width) + var(--buttons-gap));
				box-sizing: border-box;
				line-height: calc(var(--buttons-col-width) - 2 * var(--buttons-border));
			}

			[data-feat-arrangeButtons] #deploy,
			[data-feat-arrangeButtons] #draw {
				width: calc(2 * var(--buttons-col-width) + var(--buttons-gap));
			}

			[data-feat-arrangeButtons] #repair,
			[data-feat-arrangeButtons] #eui-repair {
				width: calc(3 * var(--buttons-col-width) + 2 * var(--buttons-gap));
			}

			[data-feat-arrangeButtons] .sbgcui_no_loot,
			[data-feat-arrangeButtons] .sbgcui_no_refs {
				width: var(--discover-alt-button-width);
				padding: 0 calc(0.5 * var(--buttons-gap));
				border-color: currentColor !important;
			}

			[data-feat-arrangeButtons] .sbgcui_no_loot:before,
			[data-feat-arrangeButtons] .sbgcui_no_refs:before {
				max-width: 1.5em;
			}

			[data-feat-arrangeButtons] .sbgcui_jumpToButton,
			[data-feat-arrangeButtons] .popup-close,
			[data-feat-arrangeButtons] .sbgcui_navbutton {
				position: relative;
				order: 1;
				bottom: auto;
				right: auto;
				left: auto;
				width: var(--buttons-col-width);
				height: var(--buttons-col-width) !important;
			}

			[data-feat-arrangeButtons] .sbgcui_navbutton {
				left: calc(-2 * var(--buttons-col-width) - 2 * var(--buttons-gap));
			}

			[data-feat-arrangeButtons] .sbgcui_jumpToButton {
				right: calc(-2 * var(--buttons-col-width) - 2 * var(--buttons-gap));
			}

			[data-feat-arrangeButtons] .sbgcui_jumpToButton:before,
			[data-feat-arrangeButtons] .sbgcui_navbutton:before {
				bottom: 0;
				right: 0;
				width: 50%;
				height: 50%;
				transform: translate(-50%, -50%);border: none;
				border-radius: 0;
				box-shadow: none;
			}

			[data-feat-arrangeButtons] .popup-close {
				width: var(--buttons-col-width) !important;
				height: var(--buttons-col-width) !important;
			}

			[data-feat-arrangeButtons] .popup-close:before {
				display: none;
			}
		`);
    }
    function colorizeTimer() {
        setCSS(`
			[data-feat-colorizeTimer] #discover:after {
				border: var(--buttons-border) solid currentColor;
				color: var(--ingress-btn-border-color);
				border-color: currentColor;
				line-height: calc(var(--buttons-col-width) - 3 * var(--buttons-border));
			}

			[data-feat-colorizeTimer] #discover[data-time]:after {
				color: var(--ingress-btn-disabled-color);
				border-color: var(--ingress-btn-disabled-accent-color);
			}

			[data-feat-colorizeTimer] #discover[data-time][data-remain]:after {
				background: none;
				border-color: currentColor;
			}

			[data-feat-colorizeTimer] #discover[data-time][data-remain="4"]:after {
				color: var(--ingress-btn-border-color);
			}

			[data-feat-colorizeTimer] #discover[data-time][data-remain="3"]:after {
				color: white;
			}

			[data-feat-colorizeTimer] #discover[data-time][data-remain="2"]:after {
				color: yellow;
			}

			[data-feat-colorizeTimer] #discover[data-time][data-remain="1"]:after {
				color: orange;
			}
		`);
    }
    function replaceSwipeWithButton(arrow) {
        arrow.hide();
        function createTouch(touchData) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
            const touch = {
                clientX: (_a = touchData.clientX) !== null && _a !== void 0 ? _a : 0,
                clientY: (_b = touchData.clientY) !== null && _b !== void 0 ? _b : 0,
                pageX: (_d = (_c = touchData.pageX) !== null && _c !== void 0 ? _c : touchData.clientX) !== null && _d !== void 0 ? _d : 0,
                pageY: (_f = (_e = touchData.pageY) !== null && _e !== void 0 ? _e : touchData.clientY) !== null && _f !== void 0 ? _f : 0,
                screenX: (_h = (_g = touchData.screenX) !== null && _g !== void 0 ? _g : touchData.clientX) !== null && _h !== void 0 ? _h : 0,
                screenY: (_k = (_j = touchData.screenY) !== null && _j !== void 0 ? _j : touchData.clientY) !== null && _k !== void 0 ? _k : 0,
                force: (_l = touchData.force) !== null && _l !== void 0 ? _l : 0,
                identifier: (_m = touchData.identifier) !== null && _m !== void 0 ? _m : 0,
                radiusX: (_o = touchData.radiusX) !== null && _o !== void 0 ? _o : 1,
                radiusY: (_p = touchData.radiusY) !== null && _p !== void 0 ? _p : 1,
                rotationAngle: (_q = touchData.rotationAngle) !== null && _q !== void 0 ? _q : 0,
                target: touchData.target,
            };
            const touches = [touch];
            const set = new Set(touches);
            return {
                touches: {
                    length: set.size,
                    item: (index) => index === 0 ? touch : null,
                    [Symbol.iterator]: set[Symbol.iterator],
                },
            };
        }
        function swipe(target, [startX, startY], [endX, endY]) {
            const identifier = Math.random() * Number.MAX_SAFE_INTEGER;
            const startTouch = createTouch({ target, identifier, clientX: startX, clientY: startY });
            const endTouch = createTouch({ target, identifier, clientX: endX, clientY: endY });
            const touchStartHandlers = target.getEventHandlers('touchstart').filter((f) => f.name === 'touchStartHandler');
            const touchMoveHandlers = target.getEventHandlers('touchmove').filter((f) => f.name === 'touchMoveHandler');
            const touchEndHandlers = target.getEventHandlers('touchend').filter((f) => f.name === 'touchEndHandler');
            touchStartHandlers.map((handler) => {
                handler(startTouch);
            });
            touchMoveHandlers.map((handler) => {
                handler(startTouch);
            });
            touchMoveHandlers.map((handler) => {
                handler(endTouch);
            });
            touchEndHandlers.map((handler) => {
                handler(endTouch);
            });
        }
        const button = $('<button></button>')
            .addClass('next')
            .html('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40" focusable="false"><path d="m15.5 0.932-4.3 4.38 14.5 14.6-14.5 14.5 4.3 4.4 14.6-14.6 4.4-4.3-4.4-4.4-14.6-14.6z"></path></svg>')
            .on('click', (ev) => {
            const infoPopup = document.querySelector('.info.popup');
            swipe(infoPopup, [200, 0], [0, 0]);
            ev.stopPropagation();
            return false;
        })
            .appendTo($('#discover'));
        new MutationObserver((mutations) => mutations
            .filter(({ attributeName }) => attributeName === 'class')
            .map(() => {
            button.prop('disabled', arrow.hasClass('sbgcui_hidden'));
        })).observe(arrow.get(0), { attributes: true });
        setCSS(`
			.i-stat .i-buttons .next {
				display: none;
			}

			[data-feat-replaceSwipeWithButton] .i-stat .i-buttons .next {
				display: block;
				position: absolute;
				width: calc(2 * var(--buttons-col-width) + var(--buttons-gap));
				height: var(--buttons-col-width);
				right: calc(var(--buttons-col-width) + var(--buttons-gap) - var(--buttons-border));
				top: calc(-1 * var(--buttons-border) + var(--buttons-col-width) + var(--buttons-gap));
				color: var(--ingress-btn-color);
				background: linear-gradient(to top,
					var(--ingress-btn-glow-color) 0%,
					var(--ingress-btn-bg-color) 30%,
					var(--ingress-btn-bg-color) 70%,
					var(--ingress-btn-glow-color) 100%), var(--ingress-btn-bg-color);
				border: 2px solid var(--ingress-btn-border-color);
			}

			[data-feat-replaceSwipeWithButton] .i-stat .i-buttons .next:disabled {
				color: var(--ingress-btn-disabled-color);
				background: var(--ingress-btn-disabled-bg-color);
				border-color: var(--ingress-btn-disabled-accent-color);
			}

			[data-feat-replaceSwipeWithButton] .i-stat .i-buttons .next:active {
				filter: saturate(2);
			}

			[data-feat-replaceSwipeWithButton] .i-stat .i-buttons .next svg {
				height: 16px;
				position: relative;
				top: 2px;
			}

			[data-feat-replaceSwipeWithButton] .i-stat .i-buttons .next svg path {
				fill: currentColor;
			}
		`);
    }
    function hideCloseButton() {
        $('#draw').on('click', (ev) => $('.draw-slider-buttons button').css({ height: `${$(ev.target).outerHeight()}px` }));
        setCSS(`
			[data-feat-hideCloseButton] .popup-close,
			[data-feat-hideCloseButton] #inventory__close,
			[data-feat-hideCloseButton] #draw-slider-close {
				display: none !important;
			}

			[data-feat-hideCloseButton] .draw-slider-buttons {
				padding: 0 calc(5%);
				gap: 0.25em;
			}

			[data-feat-hideCloseButton] .draw-slider-buttons button {
				max-width: none !important;
				padding: 6px;
				font-size: 1.1em;
			}

			[data-feat-hideCloseButton] .sbgcui_navbutton {
				left: calc(-2.5 * var(--buttons-col-width) - 2.5 * var(--buttons-gap));
			}

			[data-feat-hideCloseButton] .sbgcui_jumpToButton {
				right: calc(-2.5 * var(--buttons-col-width) - 2.5 * var(--buttons-gap));
			}

			[data-feat-hideCloseButton] .i-stat .i-buttons .next,
			[data-feat-hideCloseButton] #discover:after {
				width: calc(2.5 * var(--buttons-col-width) + 1.5 * var(--buttons-gap));
			}
		`);
    }
    function hideRepairButton() {
        setCSS(`
			[data-feat-hideRepairButton] #repair,
			[data-feat-hideRepairButton] #eui-repair {
				display: none;
			}

			[data-feat-hideRepairButton] #deploy,
			[data-feat-hideRepairButton] #draw {
				width: calc((var(--buttons-container) - var(--buttons-gap)) / 2);
			}

		`);
    }
    function selectTargetPointByClick() {
        ((showInfo) => {
            window.__sbg_function_showInfo = function (data) {
                if (!$('#draw-slider').is(':visible')) {
                    showInfo(data);
                }
                else {
                    const slide = $(`#draw-slider li[data-point="${data}"]`);
                    if (slide.length > 0) {
                        window.__sbg_variable_draw_slider.get().go(slide.index());
                    }
                }
            };
        })(window.__sbg_function_showInfo);
    }
    function highlightSelectedTargetPoint() {
        const highlightsLayer = addLayer('highlights', 'points');
        ((clear) => {
            window.__sbg_variable_temp_lines_source.get().clear = function (fast) {
                clear.call(this, fast);
                highlightsLayer.getSource().clear(fast);
            };
        })(window.__sbg_variable_temp_lines_source.get().clear);
        ((manageDrawing) => {
            window.__sbg_function_manageDrawing = function (event) {
                manageDrawing(event);
                const tempLine = window.__sbg_variable_temp_lines_source.get().getFeatures()[0];
                const tempLineCoords = tempLine.getGeometry().flatCoordinates;
                const highlightFeature = new window.ol.Feature({
                    geometry: new window.ol.geom.Circle([tempLineCoords.slice(tempLineCoords.length - 2)], 16),
                });
                const highlightStyle = new window.ol.style.Style({
                    stroke: new window.ol.style.Stroke({ color: '#F80', width: 3 }),
                });
                highlightFeature.setStyle(highlightStyle);
                highlightsLayer.getSource().addFeature(highlightFeature);
            };
        })(window.__sbg_function_manageDrawing);
    }
    function matchDrawSliderButtons(slider) {
        $('#draw').on('click', (ev) => {
            slider.css({ bottom: `${($(window).height()) - $(ev.target).offset().top - ($('#draw').outerHeight())}px` });
            slider.find('.draw-slider-buttons').css({ padding: `0 ${$(ev.target).offset().left}px` });
        });
        setCSS(`
			.draw-slider-buttons {
				gap: 0.25em;
			}

			[data-feat-matchDrawSliderButtons] .draw-slider-wrp {
				transform: translate(-50%, 0);
				top: auto;
			}

			[data-feat-matchDrawSliderButtons] .draw-slider-buttons {
				display: flex;
			}

			[data-feat-matchDrawSliderButtons] .sbgcui_drawslider_sort {
				position: static;
				top: auto;
				width: auto;
			}

			[data-feat-matchDrawSliderButtons] .sbgcui_drawslider_fit {
				display: none;
			}

			[data-feat-matchDrawSliderButtons] #draw-slider-close {
				order: 1;
			}
		`);
    }
    function enableOldWebViewCompatibility() {
        setCSS(`
			@media (max-width: 425px) {
				.popup.pp-center {
					top: 0 !important;
					left: 0 !important;
					transform: none !important;
				}
			}
		`);
    }
    function testNotifications() {
        window.__sbg_cui_function_getNotifs = function (latest) {
            if (typeof latest === 'number') {
                return 1;
            }
            if (typeof latest === 'undefined') {
                return [
                    {
                        id: 1,
                        g: 'guid',
                        na: 'TestUser',
                        ta: 0,
                        ti: new Date().toISOString(),
                        c: [0, 0],
                        t: 'test point',
                    },
                ];
            }
            throw new Error(`'latest' is not number or undefined: ${latest}`);
        };
    }
    class Builder {
        constructor(buttonsSection) {
            this.features = {};
            this.points = {};
            this.pointStyles = {};
            this.lines = new CoordsMap();
            this.regions = new CoordsMap();
            this.linesMap = new CoordsMap();
            this.regionsMap = new CoordsMap();
            this.data = new BuilderData(this);
            this.ownTeam = 0;
            this.drawTeam = 4;
            this.maxDrawAttempts = 3;
            this.initCSS();
            this.initTeam();
            this.initLayers();
            const buttonContainer = this.initButtons(buttonsSection);
            this.initFeatures(buttonContainer);
            this.initData();
            this.initMapClick();
            this.initStates();
            this.initHelpPopup();
            this.initRoutePopup();
            this.initCopyPaste();
            Object.defineProperty(window, 'builder', { value: this });
        }
        setHome(previousState) {
            if (previousState) {
                if (!confirm(labels.builder.messages.deleteHome.toString())) {
                    return false;
                }
                localStorage.removeItem('homeCoords');
            }
            else {
                if (!confirm(labels.builder.messages.setHome.toString())) {
                    return false;
                }
                localStorage.setItem('homeCoords', JSON.stringify(window.__sbg_variable_map.get().getView().getCenter()));
            }
            return true;
        }
        toggleAllLines(previousState) {
            layers.get('lines').setVisible(!previousState);
            layers.get('regions').setVisible(!previousState);
            layers.get('regions_shared').setVisible(!previousState && this.features.builder.getState());
            return true;
        }
        toggle(previousState) {
            layers.get('lines_built').setVisible(!previousState);
            layers.get('regions_built').setVisible(!previousState);
            layers.get('regions_shared').setVisible(!previousState && this.features.allLines.getState());
            this.features.builder.setState(!previousState);
            this.data.updateStates();
        }
        undo(previousState) {
            var _a;
            if (!previousState) {
                return false;
            }
            const { lineCoords } = (_a = this.data.pop()) !== null && _a !== void 0 ? _a : {};
            if (lineCoords) {
                const lastLine = this.lines.get(lineCoords);
                if (!lastLine) {
                    console.log(`undo: line not found, coords: ${JSON.stringify(lineCoords)}`);
                    return false;
                }
                layers.get('lines_built').getSource().removeFeature(lastLine);
                this.lines.deleteMine(lineCoords);
                const regions = this.regionsMap.get(lineCoords);
                if (regions) {
                    regions.filter(({ mine }) => mine).forEach(({ region }) => {
                        layers.get('regions_built').getSource().removeFeature(region);
                        layers.get('regions_shared').getSource().removeFeature(region);
                        this.regions.deleteMine(this.getRegionCoords(region));
                    });
                }
            }
            return false;
        }
        clear(previousState) {
            if (!previousState) {
                return false;
            }
            layers.get('lines_built').getSource().clear();
            layers.get('regions_built').getSource().clear();
            layers.get('regions_shared').getSource().clear();
            this.data.clear();
            this.lines.clearMine();
            this.regions.clearMine();
            this.linesMap.clearMine();
            this.regionsMap.clearMine();
            this.startPoint = undefined;
            return false;
        }
        printRoute(previousState) {
            if (!previousState) {
                return false;
            }
            const route = this.data.getRoute();
            $('.route.popup').find('textarea').val(route).end().removeClass('hidden');
            return undefined;
        }
        copy(previousState) {
            return this.data.copy(previousState);
        }
        paste(previousState) {
            return this.data.paste(previousState);
        }
        showHelp(_previousState) {
            $('.help').removeClass('hidden');
        }
        getCoords(flatCoordinates) {
            const coordsList = window.ol.proj.toLonLat(flatCoordinates);
            return coordsList.map((coord) => parseFloat(coord.toFixed(6)));
        }
        getFlatCoordinates(coords) {
            return window.ol.proj.fromLonLat(coords);
        }
        getArcFlatCoordinates(coordsList) {
            const arcCoords = [];
            for (let i = 1; i < coordsList.length; i++) {
                const arc = window.turf.greatCircle(coordsList[i - 1], coordsList[i], { npoints: this.getNPoints() });
                arcCoords.push(arc.geometry.coordinates);
            }
            return arcCoords.flat().map((coords) => this.getFlatCoordinates(coords));
        }
        getPointCoords(point) {
            const { flatCoordinates } = point.getGeometry();
            return this.getCoords(flatCoordinates);
        }
        getLineCoords(line) {
            const { flatCoordinates } = line.getGeometry();
            const startCoords = this.getCoords([flatCoordinates[0], flatCoordinates[1]]);
            const endCoords = this.getCoords([flatCoordinates[flatCoordinates.length - 2], flatCoordinates[flatCoordinates.length - 1]]);
            return this.createLineCoords(startCoords, endCoords);
        }
        getRegionCoords(region) {
            const { flatCoordinates } = region.getGeometry();
            const startCoords = this.getCoords([flatCoordinates[0], flatCoordinates[1]]);
            const middleCoords = this.getCoords([flatCoordinates[flatCoordinates.length * 1 / 3], flatCoordinates[flatCoordinates.length * 1 / 3 + 1]]);
            const endCoords = this.getCoords([flatCoordinates[flatCoordinates.length * 2 / 3], flatCoordinates[flatCoordinates.length * 2 / 3 + 1]]);
            return this.createRegionCoords(startCoords, middleCoords, endCoords);
        }
        createLineCoords(...coordsList) {
            const sortedCoords = coordsList.sort(function (c1, c2) {
                return c1[0] - c2[0] || c1[1] - c2[1];
            });
            return [sortedCoords[0], sortedCoords[1]];
        }
        createRegionCoords(...coordsList) {
            const sortedCoords = coordsList.sort(function (c1, c2) {
                return c1[0] - c2[0] || c1[1] - c2[1];
            });
            return [sortedCoords[0], sortedCoords[1], sortedCoords[2], sortedCoords[0]];
        }
        addLine(line, lineCoords, { mine }) {
            if (![this.ownTeam, this.drawTeam].includes(line.getProperties().team)) {
                return;
            }
            this.linesMap.create(lineCoords[0], []).push({ coords: lineCoords[1], mine });
            this.linesMap.create(lineCoords[1], []).push({ coords: lineCoords[0], mine });
            this.lines.set(lineCoords, line);
            this.checkRegions(lineCoords, { mine });
        }
        addRegion(region, regionCoords, { mine }) {
            if (![this.ownTeam, this.drawTeam].includes(region.getProperties().team)) {
                return;
            }
            this.regionsMap.create([regionCoords[0], regionCoords[1]], []).push({ region, mine });
            this.regionsMap.create([regionCoords[0], regionCoords[2]], []).push({ region, mine });
            this.regionsMap.create([regionCoords[1], regionCoords[2]], []).push({ region, mine });
            this.regions.set(regionCoords, region);
        }
        buildLine({ linePoints, lineCoords }, attempt = 0) {
            var _a, _b;
            const id = `line.built.${new Date().getTime()}`;
            const layerName = 'lines_built';
            const existingLine = this.lines.get(lineCoords);
            if (existingLine) {
                if (this.features.allLines.getState() || existingLine.getProperties().mine) {
                    console.log(`BUILDER buildLine cancelled, already exists, coords: ${JSON.stringify(lineCoords)}`);
                    return;
                }
                else {
                    console.log(`BUILDER buildLine duplicated, layer: ${layerName}, coords: ${JSON.stringify(lineCoords)}`);
                }
            }
            else {
                console.log(`BUILDER buildLine, layer: ${layerName}, attempt: ${attempt}, coords: ${JSON.stringify(lineCoords)}`);
            }
            const arcFlatCoordinates = this.getArcFlatCoordinates(lineCoords);
            const feature = new window.ol.Feature({ geometry: new window.ol.geom.LineString(arcFlatCoordinates) });
            feature.setId(id);
            feature.setProperties({ team: this.drawTeam, mine: true });
            feature.setStyle(new window.ol.style.Style({
                stroke: new window.ol.style.Stroke({ color: (_b = (_a = window.__sbg_variable_TeamColors.get()[this.drawTeam]) === null || _a === void 0 ? void 0 : _a.stroke) !== null && _b !== void 0 ? _b : '', width: 2 }),
            }));
            const source = layers.get(layerName).getSource();
            const featuresCount = source.getFeatures().length;
            source.addFeature(feature);
            if (source.getFeatures().length === featuresCount) {
                attempt++;
                console.log(`BUILDER buildLine failed, attempt: ${attempt}, coords: ${JSON.stringify(lineCoords)}`);
                if (attempt >= this.maxDrawAttempts) {
                    return;
                }
                this.buildLine({ linePoints, lineCoords }, attempt);
                return;
            }
            this.addLine(feature, lineCoords, { mine: true });
            this.data.add({ linePoints, lineCoords });
            return feature;
        }
        buildRegion(coordsList, shared, attempt = 0) {
            var _a, _b;
            const id = `region.built.${new Date().getTime()}`;
            const layerName = shared ? 'regions_shared' : 'regions_built';
            const regionCoords = this.createRegionCoords(...coordsList);
            const existingRegion = this.regions.get(regionCoords);
            if (existingRegion) {
                if (!this.features.allLines.getState() && !shared && (!existingRegion.getProperties().mine || existingRegion.getProperties().shared)) {
                    console.log(`BUILDER buildRegion duplicated, layer: ${layerName}, coords: ${JSON.stringify(regionCoords)}`);
                }
                else {
                    console.log(`BUILDER buildRegion cancelled, already exists, coords: ${JSON.stringify(regionCoords)}`);
                    return;
                }
            }
            else {
                console.log(`BUILDER buildRegion, layer: ${layerName}, coords: ${JSON.stringify(regionCoords)}`);
            }
            const arcFlatCoordinates = this.getArcFlatCoordinates(regionCoords);
            const feature = new window.ol.Feature({ geometry: new window.ol.geom.Polygon([arcFlatCoordinates]) });
            feature.setId(id);
            feature.setProperties({ team: this.drawTeam, mine: true, shared });
            feature.setStyle(new window.ol.style.Style({
                fill: new window.ol.style.Fill({ color: (_b = (_a = window.__sbg_variable_TeamColors.get()[this.drawTeam]) === null || _a === void 0 ? void 0 : _a.fill) !== null && _b !== void 0 ? _b : '' }),
            }));
            const layer = layers.get(layerName);
            const source = layer.getSource();
            const featuresCount = source.getFeatures().length;
            source.addFeature(feature);
            if (source.getFeatures().length === featuresCount) {
                attempt++;
                console.error(`BUILDER buildRegion failed, attempt: ${attempt}, coords: ${JSON.stringify(regionCoords)}`);
                if (attempt >= this.maxDrawAttempts) {
                    return;
                }
                this.buildRegion(coordsList, shared, attempt);
                return;
            }
            this.addRegion(feature, regionCoords, { mine: true });
            return feature;
        }
        checkRegions(lineCoords, { mine }) {
            const startSiblings = this.linesMap.get(lineCoords[0]);
            const endSiblings = this.linesMap.get(lineCoords[1]);
            if (!startSiblings || !endSiblings) {
                return;
            }
            for (const startSibling of startSiblings) {
                for (const endSibling of endSiblings) {
                    if (startSibling.coords[0] === endSibling.coords[0] && startSibling.coords[1] === endSibling.coords[1]) {
                        if (mine || startSibling.mine || endSibling.mine) {
                            const shared = !(mine && startSibling.mine && endSibling.mine);
                            this.buildRegion([...lineCoords, startSibling.coords], shared);
                        }
                    }
                }
            }
        }
        initCSS() {
            setCSS(`
				.builder {
					position: relative;
					margin-top: 1em;
					pointer-events: all;
					width: 120px;
				}

				.sbgcui_settings ~ .builder {
					display: none;
				}

				.sbgcui_settings.sbgcui_hidden ~ .builder {
					display: block;
				}

				.builder button {
					display: block;
					margin-bottom: 0.25em;
					width: 100%;
				}

				.builder button.active {
					background: white;
					color: #414141;
					font-weight: bold;
					border-radius: 4px;
				}
			`);
        }
        initTeam() {
            const style = $('#self-info__name').attr('style');
            if (style) {
                const matches = style.match(/team-(\d+)/);
                if (matches) {
                    this.ownTeam = parseInt(matches[1]);
                }
            }
            window.__sbg_variable_TeamColors.get().push({ fill: '#FF880030', stroke: '#F80' });
        }
        initLayers() {
            this.addLayer('lines_built', 'lines');
            this.addLayer('regions_built', 'regions');
            this.addLayer('regions_shared', 'regions');
            layers.get('lines').getSource().on('addfeature', (ev) => {
                this.addLine(ev.feature, this.getLineCoords(ev.feature), { mine: false });
            });
            layers.get('regions').getSource().on('addfeature', (ev) => {
                const feature = ev.feature;
                this.addRegion(feature, this.getRegionCoords(feature), { mine: false });
            });
            layers.get('lines').getSource().getFeatures().forEach((line) => {
                this.addLine(line, this.getLineCoords(line), { mine: false });
            });
            layers.get('regions').getSource().getFeatures().forEach((region) => {
                this.addRegion(region, this.getRegionCoords(region), { mine: false });
            });
        }
        addLayer(layerName, layerLike) {
            const layer = addLayer(layerName, layerLike);
            layers.set(layerName, layer);
        }
        initButtons(container) {
            return $('<div></div>')
                .addClass('builder')
                .appendTo(container);
        }
        initFeatures(buttonContainer) {
            const initialStates = {
                home: false,
                allLines: true,
                builder: false,
                undo: false,
                clear: false,
                route: false,
                copy: false,
                paste: false,
                help: true,
            };
            /* eslint-disable @typescript-eslint/unbound-method -- intended to be bound in BuilderFeature constructor */
            const actions = {
                home: this.setHome,
                allLines: this.toggleAllLines,
                builder: this.toggle,
                undo: this.undo,
                clear: this.clear,
                route: this.printRoute,
                copy: this.copy,
                paste: this.paste,
                help: this.showHelp,
            };
            /* eslint-enable @typescript-eslint/unbound-method */
            for (const button of builderButtons) {
                this.features[button] = new BuilderFeature({
                    name: button,
                    buttonContainer,
                    initialState: initialStates[button],
                    action: actions[button],
                    label: labels.builder.buttons[button],
                    builder: this,
                });
            }
        }
        initData() {
            this.data = new BuilderData(this);
            this.data.load();
        }
        initMapClick() {
            const originalMapClick = window.__sbg_variable_map.get().getListeners('click')[0];
            const extendedMapClick = (ev) => {
                if (this.features.builder.getState()) {
                    this.mapClick(ev);
                }
                else {
                    if (originalMapClick) {
                        originalMapClick(ev);
                    }
                }
            };
            if (originalMapClick) {
                window.__sbg_variable_map.get().un('click', originalMapClick);
            }
            window.__sbg_variable_map.get().on('click', extendedMapClick);
        }
        mapClick(ev) {
            window.__sbg_variable_map.get().forEachFeatureAtPixel(ev.pixel, (feature, layer) => {
                console.log(`BUILDER click layer: ${layer.getProperties().name}`);
                if (layer.getProperties().name !== 'points') {
                    return;
                }
                const point = feature;
                const pointCoords = this.getPointCoords(point);
                this.setPointDrawing(point, true);
                const [startPoint, endPoint] = [this.startPoint, point];
                if (!startPoint) {
                    console.log(`BUILDER clicked: start coords: ${JSON.stringify(pointCoords)}`);
                    this.startPoint = point;
                    return;
                }
                if (endPoint.getId() === startPoint.getId()) {
                    return;
                }
                console.log(`BUILDER clicked: end coords: ${JSON.stringify(pointCoords)}`);
                void (async () => {
                    const lineData = await LineData.load([startPoint, endPoint], this);
                    const lineBuilt = this.buildLine(lineData);
                    this.setPointDrawing(startPoint, false);
                    this.setPointDrawing(endPoint, false);
                    if (lineBuilt) {
                        this.startPoint = undefined;
                    }
                })();
            });
        }
        getNPoints() {
            const zoom = window.__sbg_variable_map.get().getView().getZoom();
            if (zoom > 10) {
                return 5;
            }
            if (zoom > 7) {
                return 25;
            }
            return 50;
        }
        setPointDrawing(point, drawing) {
            if (drawing) {
                this.pointStyles[point.getId()] = point.getStyle();
                point.setStyle(window.__sbg_variable_FeatureStyles.get().POINT(point.getGeometry().flatCoordinates, this.drawTeam, 1, true));
            }
            else {
                const style = this.pointStyles[point.getId()];
                if (style) {
                    point.setStyle(style);
                }
                else {
                    throw new Error(`Attempt to get non-existing style for point id = '${point.getId()}'`);
                }
            }
        }
        initStates() {
            this.toggleAllLines(!this.features.allLines.getState());
            this.toggle(!this.features.builder.getState());
            this.data.updateStates();
        }
        initHelpPopup() {
            const contents = `
				<h3>${labels.builder.help.title.toString()}</h3>
				<b>${labels.builder.help.buttons.toString()}:</b>
				<ul>
				${Object.values(labels.builder.buttons).map((button) => `<li><b>${button.title.toString()}</b> - ${button.description.toString()}</li>`).join('\n')}
				</ul>
				<b>${labels.builder.issues.title.toString()}:</b>
				<ul>
				${labels.builder.issues.list.map((issue) => `<li>${issue.toString()}</li>`).join('\n')}
				</ul>
			`;
            createPopup('help').prepend(contents);
        }
        initRoutePopup() {
            const routeElement = $('<textarea></textarea>')
                .on('click', (ev) => {
                ev.stopPropagation();
            })
                .on('keydown', (ev) => {
                ev.stopPropagation();
            });
            createPopup('route').prepend(routeElement);
        }
        initCopyPaste() {
            $(document).on('keydown', (ev) => {
                if (ev.ctrlKey) {
                    switch (ev.key) {
                        case 'c':
                            return this.data.copy(true);
                        case 'v':
                            return this.data.paste(true);
                    }
                }
                return true;
            });
        }
    }
    class BuilderFeature {
        constructor({ name, action, initialState, label, buttonContainer, builder, }) {
            this.name = name;
            this.action = action.bind(builder);
            this.button = this.createButton(label, buttonContainer);
            const value = this.loadState(initialState);
            this.state = new Proxy({ value }, {
                get: (data, property) => data[property],
                set: (data, property, value) => {
                    const storageKey = this.getStorageKey();
                    localStorage.setItem(storageKey, value ? '1' : '0');
                    data[property] = value;
                    this.setButtonState();
                    return true;
                },
            });
            this.setButtonState();
        }
        getState() {
            return this.state.value;
        }
        setState(value) {
            this.state.value = value;
        }
        setButtonState() {
            this.button.toggleClass('active', this.state.value);
        }
        loadState(initialState) {
            const storageKey = this.getStorageKey();
            const storageValue = localStorage.getItem(storageKey);
            return storageValue ? storageValue === '1' : initialState;
        }
        getStorageKey() {
            return `sbg-plus-state-${this.name}`;
        }
        createButton(label, buttonContainer) {
            const element = $('<button></button>')
                .html(label.title.toString().toUpperCase())
                .attr('title', label.description.toString())
                .appendTo(buttonContainer);
            element.on('click', () => {
                if (this.action(this.state.value)) {
                    this.state.value = !this.state.value;
                }
            });
            return element;
        }
    }
    class BuilderData {
        constructor(builder) {
            this.storageKey = 'builderData';
            this.builder = builder;
            this.data = [];
        }
        static pack(data) {
            const pointsMap = new CoordsMap();
            const lines = [];
            for (const { lineCoords, linePoints } of data) {
                lines.push(lineCoords);
                linePoints.forEach((linePoint) => {
                    pointsMap.set(linePoint.coords, linePoint);
                });
            }
            return { points: pointsMap.getData(), lines };
        }
        static unpack(pack) {
            const data = [];
            const pointsMap = new CoordsMap(new Map(Object.entries(pack.points)));
            for (const lineCoords of pack.lines) {
                const points = [pointsMap.get(lineCoords[0]), pointsMap.get(lineCoords[1])];
                const lineData = new LineData(points, lineCoords);
                data.push(lineData);
            }
            return data;
        }
        add(lineData) {
            this.data.push(lineData);
            this.updateStates();
            this.save();
        }
        pop() {
            const lastLineData = this.data.pop();
            this.updateStates();
            this.save();
            return lastLineData;
        }
        clear() {
            this.data = [];
            this.updateStates();
            this.save();
        }
        count() {
            return this.data.length;
        }
        updateStates() {
            const isActive = this.builder.features.builder.getState();
            const isData = this.data.length > 0;
            this.builder.features.undo.setState(isActive && isData);
            this.builder.features.clear.setState(isActive && isData);
            this.builder.features.route.setState(isActive && isData);
            this.builder.features.copy.setState(isActive && isData);
            this.builder.features.paste.setState(isActive);
        }
        save() {
            localStorage.setItem(this.storageKey, JSON.stringify(BuilderData.pack(this.data)));
            console.log(`BUILDER saved lines: ${this.data.length}`);
        }
        load() {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.set(stored);
            }
        }
        copy(previousState) {
            if (!previousState) {
                return false;
            }
            void (async () => {
                await navigator.clipboard.writeText(JSON.stringify(BuilderData.pack(this.data)));
                alert(labels.builder.messages.copied.toString());
            })();
            return undefined;
        }
        paste(previousState) {
            if (!previousState) {
                return false;
            }
            void (async () => {
                const text = await navigator.clipboard.readText();
                if (!text.trim()) {
                    alert(labels.builder.validationErrors.empty.toString());
                }
                this.set(text);
            })();
            return undefined;
        }
        getRoute() {
            return this.data.map((line) => line.linePoints.map((point) => point.title).join(' => ')).join('\n');
        }
        set(text) {
            const parsed = this.parse(text);
            if ('error' in parsed) {
                if (parsed.error) {
                    alert(parsed.error.toString());
                }
                else {
                    alert(labels.builder.validationErrors.unknownError.toString());
                }
                return;
            }
            const data = BuilderData.unpack(parsed.pack);
            for (const lineCoords of data) {
                this.builder.buildLine(lineCoords);
            }
            return undefined;
        }
        parse(text) {
            let pack;
            try {
                pack = JSON.parse(text);
            }
            catch (ex) {
                return { error: labels.builder.validationErrors.json };
            }
            const validator = new BuilderDataPackValidator(labels.builder.validationErrors);
            if (!validator.validate(pack)) {
                return { error: validator.getError() };
            }
            return { pack };
        }
    }
    class LineData {
        constructor(linePoints, lineCoords) {
            this.linePoints = linePoints;
            this.lineCoords = lineCoords;
            this.linePoints = linePoints;
            this.lineCoords = lineCoords;
        }
        static async load(points, builder) {
            const promises = points.map(async (point) => PointData.resolve(point, builder));
            const linePoints = await Promise.all(promises);
            const lineCoords = builder.createLineCoords(linePoints[0].coords, linePoints[1].coords);
            return new LineData(linePoints, lineCoords);
        }
    }
    class PointData {
        constructor(guid, title, coords) {
            this.guid = guid;
            this.title = title;
            this.coords = coords;
        }
        static async resolve(point, builder) {
            const guid = point.getId();
            const title = await PointData.getPointTitle(guid, builder.points);
            const coords = builder.getPointCoords(point);
            return new PointData(guid, title, coords);
        }
        static async getPointTitle(guid, points) {
            const point = points[guid];
            if (point) {
                return point;
            }
            const { response } = await window.__sbg_function_apiQuery('point', { guid });
            return points[guid] = response.data.t;
        }
    }
    const validTypeOf = typeof {};
    class BuilderDataPackValidator {
        constructor(validationErrors) {
            this.validationErrors = validationErrors;
        }
        validate(pack) {
            return this.checkObject(pack)
                && this.checkObjectProperties(pack)
                && this.checkPoints(pack.points)
                && this.checkPointsCoords(pack.points)
                && this.checkLines(pack.lines)
                && this.checkLinesCoords(pack.lines);
        }
        getError() {
            return this.validationError;
        }
        isArray(array, length, type) {
            if (!Array.isArray(array)) {
                return false;
            }
            if (array.length !== length) {
                return false;
            }
            for (const item of array) {
                if (typeof item !== type) {
                    return false;
                }
            }
            return true;
        }
        checkObject(pack) {
            if (typeof pack !== 'object') {
                this.validationError = this.validationErrors.object;
                return false;
            }
            return true;
        }
        checkObjectProperties(pack) {
            if (!isObjectContaining(pack, { points: 'object', lines: 'object' })) {
                this.validationError = this.validationErrors.objectProperties;
                return false;
            }
            return true;
        }
        checkPoints(points) {
            if (!isRecord(points) || Object.values(points).filter((point) => !isObjectContaining(point, { guid: 'string', title: 'string', coords: 'object' })).length > 0) {
                this.validationError = this.validationErrors.pointProperties;
                return false;
            }
            return true;
        }
        checkPointsCoords(points) {
            if (Object.values(points).map((point) => point.coords).filter((coords) => !this.isArray(coords, 2, 'number')).length > 0) {
                this.validationError = this.validationErrors.pointCoords;
                return false;
            }
            return true;
        }
        checkLines(lines) {
            if (!Array.isArray(lines) || lines.filter((lineCoords) => !this.isArray(lineCoords, 2, 'object')).length > 0) {
                this.validationError = this.validationErrors.lines;
                return false;
            }
            return true;
        }
        checkLinesCoords(lines) {
            if (lines.flat().filter((coords) => !this.isArray(coords, 2, 'number')).length > 0) {
                this.validationError = this.validationErrors.linesCoords;
                return false;
            }
            return true;
        }
    }
    class CoordsMap {
        constructor(data = new Map()) {
            this.data = data;
        }
        getData() {
            return Object.fromEntries(this.data);
        }
        get(key) {
            return this.data.get(this.stringifyKey(key));
        }
        set(key, value) {
            this.data.set(this.stringifyKey(key), value);
        }
        create(key, initialValue) {
            if (!this.has(key)) {
                this.set(key, initialValue);
            }
            return this.get(key);
        }
        has(key) {
            return this.data.has(this.stringifyKey(key));
        }
        forEach(func) {
            this.data.forEach((value, key) => {
                func(value, key);
            });
        }
        deleteMine(key) {
            const stringKey = this.stringifyKey(key);
            const item = this.data.get(stringKey);
            if (item instanceof window.ol.Feature && item.getProperties().mine) {
                this.data.delete(stringKey);
            }
            if (Array.isArray(item)) {
                const others = item.filter((subItem) => !subItem.mine);
                if (others.length === 0) {
                    this.data.delete(stringKey);
                }
                else {
                    this.data.set(stringKey, others);
                }
            }
        }
        clearMine() {
            Array.from(this.data.keys()).forEach((key) => {
                this.deleteMine(key);
            });
        }
        stringifyKey(key) {
            return typeof key === 'string'
                ? key
                : key.map((item) => Array.isArray(item) ? item.join(',') : item).join(',');
        }
    }
    class SettingsPopup {
        constructor() {
            this.sections = {};
            this.checkboxes = {};
            this.render();
            Object.typedKeys(features.groups, featureGroupNames).map((group) => {
                const groupFeatures = features.groups[group].filter((feature) => feature.isAvailable());
                if (groupFeatures.length === 0 && group !== 'custom') {
                    return;
                }
                this.addGroup(group);
                groupFeatures.map((feature) => {
                    this.addFeature(feature);
                });
            });
            features.on('add', (feature) => {
                this.addFeature(feature);
            }, {});
            features.on('inherit', ({ feature, value }) => {
                this.check(feature, value);
            }, {});
        }
        addFeature(feature) {
            const checkbox = this.renderFeatureCheckbox(feature);
            const setting = this.renderSetting(feature.isSimple(), checkbox, feature.label);
            this.sections[feature.group].find('h4').before(setting);
            this.checkboxes[feature.key] = checkbox;
        }
        check(feature, value) {
            var _a;
            settings.setFeature(feature.key, value);
            (_a = this.checkboxes[feature.key]) === null || _a === void 0 ? void 0 : _a.prop('checked', value);
        }
        render() {
            const parentSettingsPopup = $('.settings');
            const settingsPopup = createPopup('sbg-plus-settings', { roundClose: false }).appendTo(parentSettingsPopup);
            this.container = $('<div></div>').addClass('settings-content');
            const settingsTitle = $('<h3></h3>').text(labels.settings.title.toString());
            settingsPopup.prepend(settingsTitle, this.container);
            const saveButton = $('<button></button>')
                .text(labels.save.toString())
                .on('click', () => {
                settings.save();
                window.location.reload();
            });
            const logsButton = $('<button></button>')
                .addClass('popup-button-secondary')
                .text(labels.settings.logs.toString())
                .on('click', () => {
                void copyLogs();
            });
            const advancedButton = $('<button></button>')
                .addClass('popup-button-secondary')
                .text(labels.settings.advanced.toString())
                .on('click', () => {
                advancedButton.toggleClass('popup-button-secondary');
                settingsPopup.toggleClass('advanced');
            });
            settingsPopup.find('.buttons').prepend(saveButton);
            settingsPopup.find('.buttons').append(logsButton);
            settingsPopup.find('.buttons').append(advancedButton);
            const settingsButton = $('<button></button>')
                .addClass('settings-section__button')
                .text(labels.settings.button.toString())
                .on('click', () => settingsPopup.removeClass('hidden'));
            const settingsLabel = this.renderSetting(true, labels.settings.title, settingsButton);
            $('.settings .settings-section:first .settings-section__item:first').before(settingsLabel);
            const versionValue = $('<span></span>').text(`v${window.__sbg_plus_version}`);
            const versionLabel = this.renderSetting(true, labels.settings.version, versionValue);
            $('.settings [data-i18n="settings.about.version"]').parent().after(versionLabel);
        }
        addGroup(group) {
            const featureGroup = featureGroups[group];
            const sectionTitle = $('<h4></h4>').text(new Label(featureGroup).toString());
            const section = $('<div></div>').addClass('settings-section').append(sectionTitle);
            this.sections[group] = section;
            if (this.container) {
                this.container.append(section);
            }
            else {
                throw new Error(`Attempt to render section of group '${group}' to non existing container. Please render this.render() before adding groups`);
            }
        }
        renderSetting(isSimple, ...children) {
            const settingLabel = $('<label></label>').addClass('settings-section__item').toggleClass('simple', isSimple);
            for (const child of children) {
                const element = child instanceof Label ? $('<span></span>').text(child.toString()) : child;
                settingLabel.append(element);
            }
            return settingLabel;
        }
        renderFeatureCheckbox(feature) {
            return $('<input type="checkbox" />')
                .prop('checked', feature.isEnabled())
                .on('change', (ev) => {
                feature.setEnabled(ev.target.checked);
            });
        }
    }
    void main();
})();
