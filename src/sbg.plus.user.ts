// ==UserScript==
// @name           SBG plus
// @namespace      sbg
// @version        0.9.46
// @updateURL      https://anmiles.net/userscripts/sbg.plus.user.js
// @downloadURL    https://anmiles.net/userscripts/sbg.plus.user.js
// @description    Extended functionality for SBG
// @description:ru Расширенная функциональность для SBG
// @author         Anatoliy Oblaukhov
// @match          https://sbg-game.ru/app/*
// @run-at         document-start
// @grant          none
// ==/UserScript==

window.__sbg_plus_version = '0.9.46';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Window {
	ol: Ol;
	turf: Turf;
	Splide: Splide;
	Toastify: Toastify;
	i18next: I18Next;

	Feature: unknown;
	setCSS: (css: string) => void;
	cuiStatus: 'loading' | 'loaded';
	cuiEmbedded: boolean | undefined;

	DeviceOrientationEvent: {
		prototype: DeviceOrientationEvent;
		new(type: string, eventInitDict?: DeviceOrientationEvent): DeviceOrientationEvent;
		requestPermission: () => Promise<'granted'>,
	};

	[key: `__sbg_${string}_original`]: string;
	[key: `__sbg_${string}_modified`]: string;

	__sbg_local: boolean;
	__sbg_preset: unknown;
	__sbg_urls: Urls;
	__sbg_language: Lng;
	__sbg_plus_version: string;
	__sbg_plus_localStorage_watcher: unknown;
	__sbg_plus_modifyFeatures: Function;
	__sbg_plus_animation_duration: number;
	__sbg_onerror_handlers: Array<NonNullable<typeof window.onerror>>;
	__sbg_debug_object: (message: string, obj: Record<string, unknown>) => void;
	__sbg_logs_push: (message: string, error?: boolean) => void;

	__sbg_variable_draw_slider: ReadableVariable<Splide>;
	__sbg_variable_FeatureStyles: ReadableVariable<OlFeatureStyles>;
	__sbg_variable_is_dark: ReadableVariable<boolean>;
	__sbg_variable_ItemTypes: ReadableVariable<string[]>;
	__sbg_variable_map: ReadableVariable<OlMap>;
	__sbg_variable_TeamColors: ReadableVariable<OlTeamColors>;
	__sbg_variable_temp_lines_source: ReadableVariable<OlSource<'temp_lines'>>;
	__sbg_variable_units: ReadableVariable<Array<[RegExp, string]>>;
	__sbg_variable_VERSION: ReadableVariable<string>;

	__sbg_function_apiQuery: ApiQuery;
	__sbg_function_drawLeaderboard: () => Promise<void>;
	__sbg_function_deleteInventoryItem: (parent: JQuery<HTMLElement>) => Promise<void>;
	__sbg_function_jquerypassargs: (container: JQuery<HTMLElement>, template: string, ...elements: Array<JQuery<HTMLElement> | string>) => JQuery<HTMLElement>;
	__sbg_function_manageDrawing: (event: SplideEvent) => void;
	__sbg_function_openProfile: (data: string | OlGuid | JQuery.Event) => Promise<void>;
	__sbg_function_showInfo: (data: string | OlGuid | undefined) => void;
	__sbg_function_takeUnits: (value: number) => [string, string];
	__sbg_function_timeToString: (seconds: number) => string;

	__sbg_cui_variable_USERSCRIPT_VERSION: ReadableVariable<string>;
	__sbg_cui_variable_config: ReadableVariable<CUIConfig>;

	__sbg_cui_function_main: () => Promise<void>;
	__sbg_cui_function_olInjection: () => void;
	__sbg_cui_function_loadMainScript: () => void;
	__sbg_cui_function_clearInventory: (forceClear?: boolean, filteredLoot?: any[]) => Promise<void>;
}

interface EventTarget {
	__events: Record<string, EventListeners>;
	getEventListeners: (type: string) => EventListenerOrEventListenerObject[];
	getEventHandlers: <T = EventListener>(type: string) => T[];
	clearEventListeners: (type: string, sealed: boolean) => void;
	addOnlyEventListener: EventTarget['addEventListener'];
	addRepeatingEventListener: (
		type: string,
		callback: (ev: Event) => void,
		options: {
			repeats: number,
			timeout: number,
			tick?: (ev: Event, iteration: number) => void,
			filter?: (ev: Event) => boolean,
			cancel?: (ev: Event) => boolean,
		},
	) => void;
}

type EventListeners = {
	listeners: EventListenerOrEventListenerObject[],
	sealed: boolean
};

interface CustomTouchEvent {
	(data: { touches: TouchEvent['touches'] }): void;
}

interface DeviceOrientationEvent extends Event {
	webkitCompassHeading: number;
}

type Ol = {
	Map: OlMap,
	View: OlView,
	proj: OlProj;
	source: {
		Vector: new <TLayerName extends LayerName>() => OlSource<TLayerName>;
	};
	layer: {
		Vector: new<TLayerName extends LayerName>({ source, className }: { source: OlSource<TLayerName>, className: `ol-layer__${TLayerName}` }) => OlLayer<TLayerName>;
	};
	Feature: new <TLayerName extends LayerName>({ geometry }: { geometry: OlGeometry }) => OlFeature<TLayerName>;
	geom: {
		LineString: new (flatCoordinates: OlFlatCoordinates[]) => OlGeometry;
		Polygon: new (flatCoordinates: OlFlatCoordinates[][]) => OlGeometry;
		Circle: new (flatCoordinates: OlFlatCoordinates[], radius: number) => OlGeometry;
	}
	format: {
		GeoJSON: new () => OlFormat;
	};
	style: {
		Style: new (styles: OlStyles) => OlStyle;
		Fill: new (fillStyle: { color: string }) => OlFill;
		Stroke: new (strokeStyle: { color: string; width: number }) => OlStroke;
	};
};

type OlMap = {
	addLayer: <TLayerName extends LayerName>(layer: OlLayer<TLayerName>) => void;
	getAllLayers: () => OlLayer<any>[];
	getView: () => OlView;
	forEachFeatureAtPixel: <TLayerName extends LayerName>(pixel: OlPixel, callback: (feature: OlFeature<TLayerName>, layer: OlLayer<TLayerName>) => void) => void;
	getListeners: <TEventType extends OlMapEventType>(eventName: TEventType) => Array<OlMapEventListener<TEventType>>;
	on: <TEventType extends OlMapEventType>(eventName: TEventType, listener: OlMapEventListener<TEventType>) => void;
	un: <TEventType extends OlMapEventType>(eventName: TEventType, listener: OlMapEventListener<TEventType>) => void;
};

type LayerName = 'points' | 'lines' | 'regions' | 'lines_built' | 'regions_built' | 'regions_shared' | 'highlights' | 'temp_lines';

type OlLayer<TLayerName extends LayerName> = OlObject<TLayerName, true> & {
	getSource: () => OlSource<TLayerName>;
	setVisible: (visible: boolean) => void;
};

type OlSource<TLayerName extends LayerName> = {
	addFeature: (feature: OlFeature<TLayerName>) => void;
	removeFeature: (feature: OlFeature<TLayerName>) => void;
	getFeatures: () => OlFeature<TLayerName>[];
	clear: (fast?: boolean) => void;
	on: <T extends OlSourceEventName>(eventName: T, handler: (...args: OlSourceEvents<TLayerName>[T][]) => void) => void;
};

type OlFeature<TLayerName extends LayerName> = OlObject<TLayerName, false> & {
	getGeometry: () => OlGeometry;
	getId: () => OlGuid;
	setId: (id: OlGuid) => void;
	getStyle: () => OlStyle;
	setStyle: (style: OlStyle) => void;
};

type OlFeatureStyles = {
	TEXT: (text: string) => OlStyle;
	POINT: (pos: OlFlatCoordinates, team: Team, energy: number, light: boolean | number) => OlStyle;
};

type OlTeamColors = Array<{
	fill: `#${string}`;
	stroke: `#${string}`;
}>;

type TProperties<TLayerName extends LayerName, TLayer extends boolean> = TLayer extends true
	? OlLayerProperties<TLayerName>
	: OlFeatureProperties<TLayerName>;

type OlObject<TLayerName extends LayerName | never, TLayer extends boolean> = {
	getProperties: () => TProperties<TLayerName, TLayer>;
	setProperties: (properties: TProperties<TLayerName, TLayer>, silent?: true) => void;
}

type OlLayerProperties<TLayerName extends LayerName> = { name: TLayerName, zIndex: number };

type OlFeatureProperties<TLayerName> = TLayerName extends `regions${string}`
? {
	team: Team,
	mine: boolean,
	shared: boolean
} : {
	team: Team,
	mine: boolean
};

type OlGeometry = {
	flatCoordinates: OlFlatCoordinates;
}

type OlFlatCoordinates = number[];
type OlCoords = [number, number];
type OlLineCoords = [OlCoords, OlCoords];
type OlRegionCoords = [OlCoords, OlCoords, OlCoords, OlCoords];

type OlGuid = string;
type Team = 0 | 1 | 2 | 3 | 4;

type OlFill = {};
type OlStroke = {};
type OlStyle = {};
type OlStyles = {
	fill?: OlFill;
	stroke?: OlStroke;
};

type OlPoint = OlFeature<'points'>;
type OlLine = OlFeature<'lines'>;
type OlRegion = OlFeature<'regions'>;

type OlSourceEventName = 'addfeature';
type OlSourceEvents<TLayerName extends LayerName> = {
	addfeature: {
		feature: OlFeature<TLayerName>;
	},
};

type OlView = MapView<OlCoords> & {
	prototype: OlView;
	animate: (...args: Array<Record<'duration', number>>) => void;
};

type OlPixel = {};

type OlMapEventType = 'click' | 'movestart' | 'moveend' | 'pointerdrag';
type OlMapEventListener<TMapEventType extends OlMapEventType> = (ev: OlMapEvents[TMapEventType]) => void;

type OlMapEvents = {
	click: OlMapClickEvent,
	movestart: OlMapEvent,
	moveend: OlMapEvent,
	pointerdrag: OlMapEvent,
}

type OlMapClickEvent = OlMapEvent & {
	pixel: OlPixel;
}

type OlMapEvent = {
	target: OlMap;
}

type OlProj = {
	fromLonLat: (coords: OlCoords) => OlFlatCoordinates;
	toLonLat: (flatCoordinates: OlFlatCoordinates) => OlCoords;
};

type OlFormat = {
	readFeature: (arc: Arc) => OlLine;
};

type Arc = {
	geometry: {
		coordinates: OlLineCoords;
	}
}

type Turf = {
	greatCircle: (coord1: OlCoords, coord2: OlCoords, options: { npoints: number }) => Arc;
}

type MapView<TCoords extends [number, number]> = {
	getZoom: () => number;
	setZoom: (zoom: number) => void;
	getCenter: () => TCoords;
	setCenter: (coords: TCoords) => void;
}

type Splide = {
	defaults: {
		speed: number;
	}
	go: (index: number) => void;
	on: (type: string, handler: (event: SplideEvent) => void) => void;
};

type SplideEvent = { index: number, slide: HTMLElement };

type ToastifyOptions = {
	text: string;
	duration: number;
	forceDuration: boolean;
	gravity: 'top' | 'bottom';
	position: 'left' | 'right' | 'center';
	className: string;
};

type Toastify = {
	(options: ToastifyOptions): Toastify;
	showToast: () => void;
	prototype: {
		init: (options: ToastifyOptions) => void;
	}
}

type I18Next = {
	t: (key: string, data?: any) => string;
	translator: unknown;
}

type UrlType = 'desktop' | 'mobile' | 'script' | 'intel' | 'cui' | 'eui';

type Urls = Record<UrlType, {
	local: string;
	remote: string;
}>;

type Lng = 'ru' | 'en';

type Level = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

type CUIPointHighlighting =
	| 'fav'
	| 'ref'
	| 'uniqc'
	| 'uniqv'
	| 'cores'
	| 'highlevel'
	| 'off';

type CUIConfig = {
	maxAmountInBag: {
		cores: Record<Level, number>,
		catalysers: Record<Level, number>,
		references: { allied: number, hostile: number },
	},
	autoSelect: {
		deploy: 'min' | 'max' | 'off',
		upgrade: 'min' | 'max' | 'off',
		attack: 'max' | 'latest',
	},
	mapFilters: {
		invert: number,
		hueRotate: number,
		brightness: number,
		grayscale: number,
		sepia: number,
		blur: number,
		branding: 'default' | 'custom',
		brandingColor: string,
	},
	tinting: {
		map: 0 | 1,
		point: 'level' | 'team' | 'off',
		profile: 0 | 1,
	},
	vibration: {
		buttons: 0 | 1,
		notifications: 0 | 1,
	},
	ui: {
		doubleClickZoom: 0 | 1,
		pointBgImage: 0 | 1,
		pointBtnsRtl: 0 | 1,
		pointBgImageBlur: 0 | 1,
		pointDischargeTimeout: 0 | 1,
		speedometer: 0 | 1,
	},
	pointHighlighting: {
		inner: CUIPointHighlighting,
		outer: CUIPointHighlighting,
		outerTop: CUIPointHighlighting,
		outerBottom: CUIPointHighlighting,
		text: 'energy' | 'level' | 'lines' | 'refsAmount' | 'off',
		innerColor: string,
		outerColor: string,
		outerTopColor: string,
		outerBottomColor: string,
	},
	drawing: {
		minDistance: number,
		maxDistance: number,
	},
	notifications: {
		status: 'all' | 'fav' | 'off',
		onClick: 'close' | 'jumpto',
		interval: number,
		duration: number,
	},
}

type ReadableVariable<T> = { get: () => T };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type WritableVariable<T> = { set: (value: T) => void } & ReadableVariable<T>;

type ApiQueryType = 'point' | 'profile';

type ApiQuery = <T extends ApiQueryType>(kind: T, data: { guid: OlGuid }) => Promise<ApiResponse<ApiData[T]>>;

type ApiResponse<T> = { response: { data: T }};

type ApiData = {
	point: ApiPointData;
	profile: ApiProfileData;
}

type ApiPointData = { t: string };

type ApiProfileData = {
	name: string;
	team: Team;
	level: number;
} & Record<string, number>;

(function() {
	type EventWatcherListenerOptions = {
		once?: boolean;
		previous?: boolean;
	}

	type EventWatcherListener<TEventData, TListenerOptions extends EventWatcherListenerOptions> = {
		handler: (eventData: TEventData) => void;
		enabled: boolean;
		listenerOptions: TListenerOptions;
	};

	type EventWatcherEvent<TEventData, TEventOptions = void> = {
		eventData: TEventData;
		eventOptions: TEventOptions;
	};

	abstract class EventWatcher<
		TEventTypes extends string,
		TEventDataTypes extends Record<TEventTypes, any>,
		TEventOptions = void,
		TListenerOptions extends EventWatcherListenerOptions & TEventOptions = EventWatcherListenerOptions & TEventOptions
	> {
		protected eventTypes: readonly TEventTypes[];

		protected listeners: {
			[TEventType in TEventTypes]: Array<
				EventWatcherListener<TEventDataTypes[TEventType], TListenerOptions>
			>
		};

		protected events: {
			[TEventType in TEventTypes]: Array<
				EventWatcherEvent<TEventDataTypes[TEventType], TEventOptions>
			>
		};

		constructor(eventTypes: readonly TEventTypes[]) {
			this.init(eventTypes);
			this.watch();
		}

		private init(eventTypes: readonly TEventTypes[]) {
			this.eventTypes = eventTypes;
			this.listeners  = {} as typeof this.listeners;
			this.events     = {} as typeof this.events;

			this.eventTypes.map((eventType) => {
				this.events[eventType]    = [];
				this.listeners[eventType] = [];
			});
		}

		protected abstract watch(): void;

		protected filter<TEventType extends TEventTypes>(
			listeners: typeof this.listeners[TEventType],
			_filterData: {
				eventOptions?: TEventOptions
			},
		): typeof this.listeners[TEventType] {
			return listeners;
		}

		private trigger<TEventType extends TEventTypes>(
			listeners: typeof this.listeners[TEventType],
			{ eventData, eventOptions }: {
				eventData: TEventDataTypes[TEventType],
				eventOptions: TEventOptions
			},
		) {
			this.filter(listeners, { eventOptions }).map((listener) => {
				if (!listener.enabled) {
					return;
				}

				if (listener.listenerOptions.once) {
					listener.enabled = false;
				}

				listener.handler(eventData);
			});
		}

		emit<TEventType extends TEventTypes>(
			eventType: TEventType,
			eventData: TEventDataTypes[TEventType],
			eventOptions: TEventOptions,
		) {
			this.trigger(this.listeners[eventType], { eventData, eventOptions });
			this.events[eventType].push({ eventData, eventOptions });
		}

		on<TEventType extends TEventTypes>(
			eventType: TEventType,
			handler: (eventData: TEventDataTypes[TEventType]) => void,
			listenerOptions: TListenerOptions,
		) {
			const listener = { handler, listenerOptions, enabled : true };
			this.listeners[eventType].push(listener);

			if (listenerOptions.previous) {
				this.events[eventType].map(({ eventData, eventOptions }) => {
					this.trigger([ listener ], { eventData, eventOptions });
				});
			}
		}

		off<TEventType extends TEventTypes>(
			eventType: TEventType,
			eventOptions?: TEventOptions,
		) {
			this.filter(this.listeners[eventType], { eventOptions }).map((listener) => {
				listener.enabled = false;
			});
		}
	}

	const consoleWatcherEventTypes = [ 'log', 'warn', 'error', 'info', 'debug', 'trace' ] as const;

	type ConsoleWatcherEventDataTypes = {
		log: { message: string };
		warn: { message: string };
		error: { message: string };
		info: { message: string };
		debug: { message: string };
		trace: { message: string };
	}

	class ConsoleWatcher extends EventWatcher<
		typeof consoleWatcherEventTypes[number],
		ConsoleWatcherEventDataTypes,
		EventWatcherListenerOptions
	> {
		constructor() {
			super(consoleWatcherEventTypes);
		}

		protected override watch() {
			consoleWatcherEventTypes.map((eventType) => {
				((originalMethod) => {
					console[eventType] = (...args: any[]) => {
						const lines  = args.map((arg) => arg instanceof Error ? [ arg.message, arg.stack ].join('\n') : arg.toString());
						const result = originalMethod.call(console, ...args);
						this.emit(eventType, { message : lines.join('\n') }, {});
						return result;
					};
				})(console[eventType]);
			});
		}
	}

	const logs = [] as string[];

	const consoleWatcher = new ConsoleWatcher();

	consoleWatcherEventTypes.map((eventType) => {
		consoleWatcher.on(eventType, ({ message }) => {

			if (eventType === 'error') {
				message = `!!! ERROR !!! ${message}`;
			}

			logs.push(`${message}`);
		}, {});
	});

	window.__sbg_debug_object = (message: string, obj: Record<string, unknown>) => {
		const lines: Array<string | null | undefined > = [];
		lines.push(message);

		const stack = new Error().stack?.replace(/^Error/, '');

		for (const key in obj) {
			lines.push(`| ${key}:`);
			const arg = obj[key];

			if (arg === null || arg === undefined) {
				lines.push(arg);
			} else {
				lines.push(arg.toString());
				lines.push(typeof arg === 'object'
					? `with keys: [${Object.keys(arg).join(', ')}];`
					: 'is not an object;');
			}
		}

		lines.push(stack);

		console.log(...lines);
	};

	window.__sbg_onerror_handlers = [];

	window.__sbg_onerror_handlers.push((event, _source, lineno, colno, error) => {
		console.error(`${event} on ${lineno}:${colno}`, error);
	});

	window.onerror = function(event, source, lineno, colno, error) {
		window.__sbg_onerror_handlers.map((handler) => handler(event, source, lineno, colno, error));
		return true;
	};

	type Labels = {
		save: Label;
		close: Label;
		ymaps: Label;
		settings: {
			title: Label;
			button: Label;
			version: Label;
			logs: Label;
			advanced: Label;
		},
		toasts: {
			back: Label;
			logs: Label;
			cuiUpdated: Label;
		}
		builder: {
			buttons: Record<BuilderButtons, BuilderButtonLabel>;
			messages: {
				setHome: Label;
				deleteHome: Label;
				copied: Label;
			}
			issues: {
				title: Label;
				list: Label[];
			},
			help: {
				title: Label;
				buttons: Label;
			},
			validationErrors: {
				json: Label;
				empty: Label;
				object: Label;
				objectProperties: Label;
				pointProperties: Label;
				pointCoords: Label;
				lines: Label;
				linesCoords: Label;
			}
		}
	}

	type BuilderButtonLabel = { title: Label; description: Label };

	const builderButtons = [ 'home', 'allLines', 'builder', 'undo', 'clear', 'route', 'copy', 'paste', 'help' ] as const;
	type BuilderButtons = typeof builderButtons[number];
	type BuilderAction = (previousState: boolean) => Promise<boolean | void>;
	type BuilderActions = Record<BuilderButtons, BuilderAction>;
	type BuilderStates = Record<BuilderButtons, boolean>;
	type BuilderFeatures = Record<BuilderButtons, BuilderFeature>;

	type LabelValues = Record<Lng, string>;

	class Label {
		values: LabelValues;

		constructor(values: LabelValues) {
			this.values = values;
		}

		format(data: Record<string, string>): Label {
			const formattedLabel = new Label(this.values);

			Object.entries(formattedLabel.values).forEach(([ lng, value ]: [ Lng, string ]) => {
				formattedLabel.values[lng] = value.replace(/\$\{(.+?)\}/g, (_, key) => data[key]);
			});

			return formattedLabel;
		}

		toString(): string {
			return this.values[window.__sbg_language];
		}
	}

	const labels: Labels = {
		save : new Label({
			ru : 'Сохранить',
			en : 'Save',
		}),
		close : new Label({
			ru : 'Закрыть',
			en : 'Close',
		}),
		ymaps : new Label({
			ru : 'Яндекс Карты',
			en : 'Yandex Maps',
		}),
		settings : {
			title : new Label({
				ru : 'Настройки скриптов',
				en : 'Scripts settings',
			}),
			button : new Label({
				ru : 'Настройки',
				en : 'Settings',
			}),
			version : new Label({
				ru : 'Версия SBG+',
				en : 'SBG+ Version',
			}),
			logs : new Label({
				ru : 'Логи',
				en : 'Logs',
			}),
			advanced : new Label({
				ru : 'Все настройки',
				en : 'All settings',
			}),
		},
		toasts : {
			back : new Label({
				ru : 'Нажмите кнопку "Назад" ещё раз\nдля выхода из игры',
				en : 'Press "Back" button again to exit the game',
			}),
			logs : new Label({
				ru : 'Логи скопированы в буфер обмена',
				en : 'Logs has been copied into the clipboard',
			}),
			cuiUpdated : new Label({
				ru : 'Скрипт Николая обновлён до версии ${currentVersion}',
				en : 'Nicko script has been updated to ${currentVersion}',
			}),
		},
		builder : {
			buttons : {
				home : {
					title : new Label({
						ru : 'Я здесь',
						en : 'Set home',
					}),
					description : new Label({
						ru : 'устанавливает "домашнее местоположение", с которого игра всегда будет открываться в этом браузере',
						en : 'sets "home location", which game will always start with in this browser',
					}),
				},
				allLines : {
					title : new Label({
						ru : 'Все линии',
						en : 'All lines',
					}),
					description : new Label({
						ru : 'включает/отключает показ реально существующих линий и регионов',
						en : 'toggles currently existing lines and regions',
					}),
				},
				builder : {
					title : new Label({
						ru : 'Конструктор',
						en : 'Builder',
					}),
					description : new Label({
						ru : 'включает/отключает режим конструктора: нажатие на точку начинает новую линию, нажатие на другую точку - заканчивает линию',
						en : 'toggles builder mode: click first point to start new line, click another point to finish the line',
					}),
				},
				undo : {
					title : new Label({
						ru : 'Отменить',
						en : 'Undo',
					}),
					description : new Label({
						ru : 'стирает последнюю построенную линию/регион',
						en : 'removes last built line/region',
					}),
				},
				clear : {
					title : new Label({
						ru : 'Отменить всё',
						en : 'Clear',
					}),
					description : new Label({
						ru : 'стирает все построенные линии и регионы',
						en : 'removes all build lines and regions',
					}),
				},
				route : {
					title : new Label({
						ru : 'Маршрут',
						en : 'Print route',
					}),
					description : new Label({
						ru : 'показывает все построенные линии, в виде списка в порядке постройки',
						en : 'shows all built lines as a list in the order of building',
					}),
				},
				copy : {
					title : new Label({
						ru : 'Копировать',
						en : 'Copy',
					}),
					description : new Label({
						ru : '(Ctrl-C) копирует все построенные линии в буфер обмена',
						en : '(Ctrl-C) copies all built lines into the clipboard',
					}),
				},
				paste : {
					title : new Label({
						ru : 'Вставить',
						en : 'Paste',
					}),
					description : new Label({
						ru : '(Ctrl-V) вставляет ранее построенные линии из буфера обмена',
						en : '(Ctrl-V) pastes previously built lines from the clipboard',
					}),
				},
				help : {
					title : new Label({
						ru : 'Помощь',
						en : 'Help',
					}),
					description : new Label({
						ru : 'показывает инструкции',
						en : 'shows instructions',
					}),
				},
			},
			messages : {
				setHome : new Label({
					ru : 'Всегда открывать SBG на текущем местоположении?',
					en : 'Always open SBG using currently opened location?',
				}),
				deleteHome : new Label({
					ru : 'Забыть "домашнее местоположение" SBG?',
					en : 'Forget "home location"?',
				}),
				copied : new Label({
					ru : 'Данные скопированы в буфер обмена',
					en : 'Data has been copied into the clipboard',
				}),
			},
			issues : {
				title : new Label({
					ru : 'Известные ограничения и проблемы',
					en : 'Known limitations and problems',
				}),
				list : [
					new Label({
						ru : 'Не всегда рисуется линия, потому что если при нажатии мышкой сдвинуть карту хоть на миллиметр - карта думает, что её двигают, а не кликают, и никак не реагирует',
						en : 'Lines are not always being drawn, because clicking mouse button when moving map even one pixel ahead will make the map treat this click as a moving action and do not react as expected',
					}),
					new Label({
						ru : 'Если два раза нажать на точку - она остаётся оранжевой, даже если закончить линию',
						en : 'Point leaves orange when clicking twice, even when line has been finished',
					}),
					new Label({
						ru : 'Если нажать на точку, а потом подвинуть карту - она перестаёт быть оранжевой',
						en : 'Orange point stops to be orange if move map',
					}),
				],
			},
			help : {
				title : new Label({
					ru : 'Конструктор',
					en : 'Builder',
				}),
				buttons : new Label({
					ru : 'Кнопки',
					en : 'Buttons',
				}),
			},
			validationErrors : {
				json : new Label({
					ru : 'Текст должен быть валидным JSON-объектом',
					en : 'Text should be a valid JSON object',
				}),
				empty : new Label({
					ru : 'Ничего нет',
					en : 'Nothing found',
				}),
				object : new Label({
					ru : 'Данные должны быть объектом',
					en : 'Data should be an object',
				}),
				objectProperties : new Label({
					ru : "Объект с данными должен содержать два объекта: 'points' и 'lines'",
					en : "Data object should contain two objects: 'points' and 'lines'",
				}),
				pointProperties : new Label({
					ru : "Каждый объект в 'points' должен содержать поля: 'guid' (string), 'title' (string) и 'coords' (object)",
					en : "Each object in 'points' should contain properties: 'guid' (string), 'title' (string) and 'coords' (object)",
				}),
				pointCoords : new Label({
					ru : "Каждый объект в 'points' должен содержать массив 'coords', из двух координат типа (number)",
					en : "Each object in 'points' should contain array 'coords' of two coordinates of type (number)",
				}),
				lines : new Label({
					ru : "Массив 'lines' должен состоять из массивов координат линий",
					en : "Array 'lines' should contain arrays of line coordinates",
				}),
				linesCoords : new Label({
					ru : "Каждый массив в 'lines' должен состоять из двух массивов координат точек",
					en : "Each array in 'lines' should contain two arrays of point coordinates",
				}),
			},
		},
	};

	class Settings {
		private storageKey = 'sbg-plus-settings';
		private features: Record<string, boolean>;

		constructor() {
			try {
				const str     = localStorage[this.storageKey];
				const json    = JSON.parse(str);
				this.features = json.features;
			} catch {
				this.features = {};
			}
		}

		getFeature(featureKey: string): boolean | undefined {
			return this.features[featureKey];
		}

		setFeature(featureKey: string, value: boolean): Settings {
			this.features[featureKey] = value;
			return this;
		}

		cleanupFeatures() {
			const featureKeys = Object.keys(features.keys);

			Object.keys(this.features)
				.filter((key) => !featureKeys.includes(key))
				.forEach((key) => delete this.features[key]);
		}

		save() {
			const json                    = {} as Record<string, any>;
			json.features                 = this.features;
			const str                     = JSON.stringify(json);
			localStorage[this.storageKey] = str;
		}
	}

	const settings = new Settings();

	const featureGroups = {
		scripts     : { ru : 'Скрипты', en : 'Scripts' },
		base        : { ru : 'Основные настройки', en : 'Basic settings' },
		cui         : { ru : 'Скрипт Николая', en : 'Nicko script' },
		eui         : { ru : 'Скрипт Егора', en : 'Egor script' },
		windows     : { ru : 'Окна', en : 'Windows' },
		animations  : { ru : 'Анимации', en : 'Animations' },
		toolbar     : { ru : 'Боковая панель', en : 'Toolbar' },
		fire        : { ru : 'Атака', en : 'Fire' },
		inventory   : { ru : 'Инвентарь', en : 'Inventory' },
		leaderboard : { ru : 'Лидеры', en : 'Leaderboard' },
		info        : { ru : 'Информация о точке', en : 'Point info' },
		draw        : { ru : 'Рисование', en : 'Draw' },
		other       : { ru : 'Прочие настройки', en : 'Other settings' },
		custom      : { ru : 'Мои настройки', en : 'My settings' },
	} as const;

	const featureTriggers = [ '', 'pageLoad', 'cuiTransform', 'mapReady', 'fireClick' ] as const;

	type FeatureGroup = keyof typeof featureGroups;
	type FeatureTrigger = typeof featureTriggers[number];

	interface AnyFeatureOptions {
		group: FeatureGroup;
		trigger: FeatureTrigger;
		public?: boolean;
		simple?: boolean;
		desktop?: boolean;
		unchecked?: boolean;
	}

	abstract class AnyFeatureBase {
		key: string;
		label: Label;
		group: FeatureGroup;
		trigger: FeatureTrigger;
		private public: boolean;
		private simple: boolean;
		private desktop: boolean;
		private unchecked: boolean;
		private toggleValue = false;

		constructor(
			key: string,
			labelValues: LabelValues,
			options : AnyFeatureOptions,
		) {
			this.key     = key;
			this.label   = new Label(labelValues);
			this.group   = options.group;
			this.trigger = options.trigger;

			this.public    = options.public || false;
			this.simple    = options.simple || false;
			this.desktop   = options.desktop || false;
			this.unchecked = options.unchecked || false;

			features.add(this);
		}

		abstract setEnabled(value: boolean): void;

		isEnabled(): boolean {
			return this.isExplicitlyEnabled() ?? this.isImplicitlyEnabled();
		}

		isExplicitlyEnabled(): boolean | undefined {
			return settings.getFeature(this.key);
		}

		isImplicitlyEnabled(): boolean {
			return this.isAvailable() && this.isIncluded(this.getPreset()) && !this.unchecked;
		}

		isAvailable(): boolean {
			return (isMobile() || this.desktop) && (this.public || this.getPreset() === 'full' || localStorage['sbg-plus-test-mode']);
		}

		isSimple(): boolean {
			return this.simple;
		}

		toggle(value: boolean = !this.toggleValue): boolean {
			const attributeKey = `data-feat-${this.key}`;
			this.toggleValue   = value;

			if (value) {
				document.body.setAttribute(attributeKey, '');
			} else {
				document.body.removeAttribute(attributeKey);
			}

			return value;
		}

		private isIncluded(presetName: Presets): boolean {
			const preset = presets[presetName] || presets['base'];
			return preset.length === 0 || preset.includes(this);
		}

		private getPreset(): Presets {
			return window.__sbg_preset as Presets;
		}
	}

	abstract class FeatureBase<TArgument, TData> extends AnyFeatureBase {
		abstract func: ((data: TData) => TArgument);
		parent?: ParentFeature;

		constructor(
			func: ((data: TData) => TArgument),
			labelValues: LabelValues,
			options : AnyFeatureOptions,
		) {
			super(func.name, labelValues, options);
		}

		setEnabled(value: boolean): void {
			settings.setFeature(this.key, value);

			if (this.parent) {
				const uncheckedChildren = this.parent.children.filter((feature) => !feature.isEnabled());
				features.check({ feature : this.parent, value : uncheckedChildren.length === 0 });
			}
		}

		protected abstract getData(argument: TArgument): TData;

		exec(argument: TArgument): TArgument {
			if (!this.isEnabled()) {
				console.log(`skipped ${this.func.name}`);
				return argument;
			}

			try {
				const data   = this.getData(argument);
				const result = this.func(data);
				this.toggle(true);
				console.log(`executed ${this.func.name}`);
				return result;
			} catch (ex) {
				console.error(`failed ${this.func.name}: ${ex.toString()}`);
				return argument;
			}
		}
	}

	class ParentFeature extends AnyFeatureBase {
		children: AnyFeatureBase[] = [];
		parent?: AnyFeatureBase;

		constructor(
			key: string,
			labelValues: LabelValues,
			options : AnyFeatureOptions & {
				children: AnyFeatureBase[]
			},
		) {
			super(key, labelValues, options);

			options.children.forEach((feature) => {
				if (feature.key === this.key) {
					return;
				}

				this.children.push(feature);

				if (feature instanceof FeatureBase) {
					feature.parent = this;
				}
			});

			this.propagate();
		}

		setEnabled(value: boolean): void {
			settings.setFeature(this.key, value);
			this.propagate();
		}

		isEnabled(): boolean {
			return this.isExplicitlyEnabled() ?? this.isImplicitlyEnabled();
		}

		private propagate() {
			const value = settings.getFeature(this.key);

			if (value !== undefined) {
				this.children.map((feature) => features.check({ feature, value }));
			}
		}
	}

	class Feature<TRequiredElement = never> extends FeatureBase<void, TRequiredElement> {
		func: (element: TRequiredElement) => void;
		requires?: (() => TRequiredElement);

		constructor(
			func: (element: TRequiredElement) => void,
			labelValues: LabelValues,
			options : AnyFeatureOptions & {
				requires?: (() => TRequiredElement)
		}) {
			super(func, labelValues, options);
			this.func     = func;
			this.requires = options.requires;
		}

		override getData(): TRequiredElement {
			if (this.requires) {
				const data = this.requires();

				if (!data || typeof data === 'object' && 'length' in data && data.length === 0) {
					throw 'requirement not met';
				}

				return data;
			}

			return undefined as TRequiredElement;
		}
	}

	window.Feature = Feature;

	class Transformer extends FeatureBase<Script, Script> {
		func: (script: Script) => Script;

		constructor(
			func: (script: Script) => Script,
			labelValues: LabelValues,
			options : AnyFeatureOptions,
		) {
			super(func, labelValues, options);
			this.func = func;
		}

		override getData(arg: Script): Script {
			return arg;
		}
	}

	const featuresEventTypes = [
		'add',
		'check',
	] as const;

	// TODO: в других вотчерах должен быть такой же способ объявления типов аргументов для каждого метода
	type FeaturesEventDataTypes = {
		add: AnyFeatureBase,
		check: { feature: AnyFeatureBase, value: boolean },
	};

	class Features extends EventWatcher<
		typeof featuresEventTypes[number],
		FeaturesEventDataTypes,
		EventWatcherListenerOptions
	> {
		keys = {} as Record<string, AnyFeatureBase>;
		groups = {} as Record<FeatureGroup, AnyFeatureBase[]>;
		triggers = {} as Record<FeatureTrigger, AnyFeatureBase[]>;

		constructor() {
			super(featuresEventTypes);
			Object.keys(featureGroups).map((key: FeatureGroup) => this.groups[key] = []);
			featureTriggers.map((key) => this.triggers[key] = []);
		}

		protected override watch() {
		}

		add(feature : FeaturesEventDataTypes['add']) {
			this.keys[feature.key] = feature;
			this.groups[feature.group].push(feature);
			this.triggers[feature.trigger].push(feature);
			this.emit('add', feature, {});
		}

		check({ feature, value } : FeaturesEventDataTypes['check']) {
			this.emit('check', { feature, value }, {});
		}

		get<TFeature extends Transformer | Feature<any>>(func: TFeature['func']) {
			return this.keys[func.name];
		}
	}

	const features          = new Features();
	let group: FeatureGroup = 'base';

	group = 'scripts';

	new Feature(loadCUI,
		{ ru : 'Скрипт Николая', en : 'Nicko script' },
		{ public : true, simple : true, group, trigger : '' });

	new Feature(loadEUI,
		{ ru : 'Скрипт Егора', en : 'Egor script' },
		{ public : true, simple : true, group, trigger : 'mapReady', desktop : true });

	new Feature(showBuilderPanel,
		{ ru : 'Конструктор (draw tools)', en : 'Builder (draw tools)' },
		{ public : true, simple : true, group, trigger : 'mapReady', desktop : true });

	new Feature(showFeatureToggles,
		{ ru : 'Показать кнопки для быстрого переключения между фичами', en : 'Show buttons for quick toggling features' },
		{ group, trigger : 'mapReady' });

	group = 'base';

	new Feature(enableBackButton,
		{ ru : 'Разрешить кнопку Back', en : 'Enable back button' },
		{ public : true, group, trigger : 'mapReady' });

	new Feature(updateLangCacheAutomatically,
		{ ru : 'Автоматически обновлять кэш языка', en : 'Update language cache automatically' },
		{ public : true, group, trigger : 'mapReady', desktop : true });

	new Feature(fixBlurryBackground,
		{ ru : 'Размывать фон за полупрозрачными окнами', en : 'Fix blurry background in popups' },
		{ public : true, group, trigger : 'mapReady', desktop : true });

	new Feature(alignSettingsButtonsVertically,
		{ ru : 'Выровнять кнопки в настройках по ширине', en : 'Align settings buttons vertically' },
		{ public : true, group, trigger : 'mapReady', desktop : true, requires : () => $('.settings') });

	new Feature(fixCompass,
		{ ru : 'Починить компас', en : 'Fix compass' },
		{ public : true, group, trigger : 'mapReady' });

	group = 'cui';

	new Transformer(disableClusters,
		{ ru : 'Отключить ромашку', en : 'Disable clusters' },
		{ public : true, simple : true, group, trigger : 'cuiTransform' });

	new Transformer(disableAttackZoom,
		{ ru : 'Отключить изменение зума при атаке', en : 'Disable changing zoom when attack' },
		{ public : true, simple : true, group, trigger : 'cuiTransform' });

	new Transformer(unlockCompassWhenRotateMap,
		{ ru : 'Разблокировать компас при вращении карты', en : 'Unlock compass when rotate map' },
		{ public : true, group, trigger : 'cuiTransform' });

	new Transformer(alwaysClearInventory,
		{ ru : 'Запускать авточистку инвентаря после каждого дискавера', en : 'Launch inventory cleanup after every discover' },
		{ public : true, group, trigger : 'cuiTransform', unchecked : true });

	new Transformer(waitClearInventory,
		{ ru : 'Дожидаться получения предметов перед запуском авточистки', en : 'Wait for updating inventory before cleanup' },
		{ public : true, group, trigger : 'cuiTransform' });

	new Feature(fixSortButton,
		{ ru : 'Исправить расположение кнопки сортировки', en : 'Fix sort button z-index' },
		{ public : true, group, trigger : 'mapReady', requires : () => $('.sbgcui_refs-sort-button') });

	new Feature(reportCUIUpdates,
		{ ru : 'Сообщать об обновлениях скрипта', en : 'Report script updates' },
		{ public : true, group, trigger : 'mapReady', unchecked : true });

	group = 'eui';

	new Feature(centerIconsInGraphicalButtons,
		{ ru : 'Центрировать значки графических кнопок', en : 'Center icons in graphical buttons' },
		{ public : true, group, trigger : 'mapReady' });

	new Feature(showReloadButtonInCompactMode,
		{ ru : 'Показать кнопку перезагрузки в компактном режиме', en : 'Show reload button in compact mode' },
		{ public : true, group, trigger : 'mapReady' });

	group = 'windows';

	new Feature(hideCloseButton,
		{ ru : 'Спрятать кнопку закрытия, закрывать только по нажатию Back', en : 'Hide close button, close only by pressing Back' },
		{ group, trigger : 'mapReady', requires : () => $('.popup-close, #inventory__close') });

	group = 'animations';

	new Feature(disableCarouselAnimation,
		{ ru : 'Отключить анимацию карусели', en : 'Disable carousel animations' },
		{ public : true, group, trigger : 'pageLoad', requires : () => window.Splide });

	new Feature(disablePopupAnimation,
		{ ru : 'Отключить анимацию открытия и закрытия окон', en : 'Disable open/close windows animation' },
		{ public : true, group, trigger : 'pageLoad', requires : () => $('.popup') });

	new Feature(disableMapAnimation,
		{ ru : 'Отключить анимацию карты', en : 'Disable map animation' },
		{ public : true, group, trigger : 'pageLoad' });

	new Feature(disableAttackButtonAnimation,
		{ ru : 'Отключить анимацию кнопки атаки', en : 'Disable attack button animation' },
		{ public : true, group, trigger : 'pageLoad', requires : () => $('#attack-menu') });

	new Feature(closeToastsAfter1sec,
		{ ru : 'Закрывать всплывающие сообщения через 1 секунду', en : 'Close toasts after 1 second' },
		{ public : true, group, trigger : 'pageLoad', requires : () => window.Toastify });

	new ParentFeature('disableAllAnimations',
		{ ru : 'Отключить все анимации', en : 'Disable all animations' },
		{ public : true, simple : true, group, trigger : 'pageLoad', children : features.groups['animations'] });

	group = 'toolbar';

	new Feature(showQuickAutoSelectButton,
		{ ru : 'Показать кнопку для быстрого переключения автовыбора коров', en : 'Show button for quick change auto-select settings' },
		{ group, trigger : 'mapReady', requires : () => $('.sbgcui_toolbar') });

	new Feature(moveAllSidebarsRight,
		{ ru : 'Показывать все боковые панели справа', en : 'Move all sidebars to the right' },
		{ group, trigger : 'mapReady', requires : () => $('.sbgcui_toolbar-control') });

	new Feature(hideCUIToolbarToggleButton,
		{ ru : 'Скрыть кнопку закрытия панели скрипта Николая', en : 'Hide CUI toolbar toggle button' },
		{ public : true, group, trigger : 'mapReady', requires : () => $('.sbgcui_toolbar') });

	group = 'fire';

	new Feature(alwaysCenterAlignFireItemsCount,
		{ ru : 'Всегда выравнивать количество предметов по центру', en : 'Always center align items count' },
		{ group, trigger : 'fireClick', requires : () => $('#attack-slider') });

	new Feature(replaceHighlevelWarningWithIcon,
		{ ru : 'Заменить предупреждение про недостаточный уровень на значок поверх предмета', en : 'Replace highlevel warning with an icon on top of the item' },
		{ group, trigger : 'fireClick', requires : () => $('#attack-slider') });

	new Feature(joinFireButtons,
		{ ru : 'Объединить кнопку атаки и кнопку открытия панели атаки, закрывать панель кликом снаружи', en : 'Join attack button and attack panel button, close panel by clicking outside' },
		{ group, trigger : 'fireClick', requires : () => $('#attack-menu') });

	group = 'inventory';

	new Feature(increaseItemsFont,
		{ ru : 'Увеличить размер шрифта за счёт сокращения названий предметов', en : 'Increase font size by shortening item names' },
		{ group, trigger : 'mapReady', requires : () => $('.info.popup') });

	new Feature(showAutoDeleteSettingsButton,
		{ ru : 'Показать кнопку перехода к настройкам авто-удаления', en : 'Show auto-delete settings button' },
		{ group, trigger : 'mapReady', requires : () => $('.inventory.popup') });

	new Feature(restoreCUISort,
		{ ru : 'Заменить сортировку Егора на сортировку Николая', en : 'Replace Egor sort with Nicko sort' },
		{ public : true, simple : true, group, trigger : 'mapReady', unchecked : true, requires : () => $('.inventory__content') });

	new Feature(moveRerefenceButtonsDown,
		{ ru : 'Сдвинуть ниже кнопки направления сортировки и закрытия', en : 'Move down sort direction button and close button' },
		{ group, trigger : 'mapReady', requires : () => $('.inventory__content') });

	new Feature(hideManualClearButtons,
		{ ru : 'Спрятать кнопки ручного удаления предметов', en : 'Hide manual clear buttons' },
		{ group, trigger : 'mapReady', requires : () => $('.inventory__content') });

	new Feature(quickRecycleAllRefs,
		{ ru : 'Удалять все имеющиеся рефы от точки при нажатии кнопки удаления', en : 'Recycle all existing refs of the point by clicking recycle button' },
		{ group, trigger : 'mapReady', requires : () => $('.inventory__content') });

	group = 'leaderboard';

	new Feature(alwaysShowSelfStatistics,
		{ ru : 'Всегда показывать собственную статистику', en : 'Always show self statistics' },
		{ group, trigger : 'mapReady', requires : () => window.__sbg_function_drawLeaderboard, desktop : true });

	group = 'info';

	new Feature(makeInfoPopupSemiTransparent,
		{ ru : 'Сделать окно точки полупрозрачным', en : 'Make info popup semi-transparent' },
		{ group, trigger : 'mapReady', requires : () => $('.info.popup') });

	new Feature(alwaysShowSecondsForCoolDowns,
		{ ru : 'Всегда показывать отсчёт в секундах для кулдауна', en : 'Always show seconds for cooldowns' },
		{ group, trigger : 'mapReady', requires : () => $('#discover') });

	new Feature(enlargeCoreSlots,
		{ ru : 'Увеличить размер коров', en : 'Enlarge core slots' },
		{ group, trigger : 'mapReady', requires : () => $('.info.popup') });

	new Feature(alignCloseButtonVertically,
		{ ru : 'Выровнять кнопку закрытия по вертикали', en : 'Align close button vertically' },
		{ group, trigger : 'mapReady', requires : () => $('.info.popup > .popup-close') });

	new Feature(colorizeTimer,
		{ ru : 'Менять цвет таймера в зависимости от количества оставшихся дискаверов', en : 'Change color of timer depending on remaining discovers' },
		{ group, trigger : 'mapReady', requires : () => $('#discover') });

	new Feature(hideRepairButton,
		{ ru : 'Спрятать кнопку зарядки', en : 'Hide repair button' },
		{ group, trigger : 'mapReady', requires : () => $('.info.popup') });

	new Feature(replaceSwipeWithButton,
		{ ru : 'Показать кнопку для переключения между точками', en : 'Show button to swipe between points' },
		{ group, trigger : 'mapReady', requires : () => $('.sbgcui_swipe-cards-arrow') });

	group = 'draw';

	new Feature(selectTargetPointByClick,
		{ ru : 'Разрешить выбирать конечную точку кликом по ней', en : 'Allow select target point by clicking it' },
		{ group, trigger : 'mapReady', requires : () => window.__sbg_function_showInfo });

	new Feature(highlightSelectedTargetPoint,
		{ ru : 'Подсвечивать выбранную конечную точку', en : 'Highlight selected target point' },
		{ group, trigger : 'mapReady', requires : () => window.__sbg_variable_map });

	new Feature(matchDrawSliderButtons,
		{ ru : 'Расположить кнопку рисования ровно под кнопкой карусели рисования', en : 'Place draw button exactly under draw carousel button' },
		{ group, trigger : 'mapReady', requires : () => $('.draw-slider-wrp') });

	group = 'other';

	new Feature(enableOldWebViewCompatibility,
		{ ru : 'Включить совместимость со старыми webview', en : 'Enable old web view compatibility' },
		{ public : true, group, trigger : 'mapReady', unchecked : true, requires : () => $('.popup.pp-center') });

	settings.cleanupFeatures();

	type Presets = 'base' | 'nicoscript' | 'egorscript' | 'allscripts' | 'full';
	const presets = {} as Record<Presets, AnyFeatureBase[]>;

	presets['base'] = [
		...features.groups.base,
	];

	if (window.innerWidth >= 800) {
		presets['base'].push(features.get(showBuilderPanel));
	}

	presets['nicoscript'] = [
		...presets['base'],
		...features.groups.cui,
		features.get(loadCUI),
	];

	presets['egorscript'] = [
		...presets['base'],
		...features.groups.eui,
		features.get(loadEUI),
	];

	presets['allscripts'] = [
		...presets['nicoscript'],
		...presets['egorscript'],
		features.get(restoreCUISort),
	];

	presets['full'] = [];

	class Layers {
		layers = {} as {[ key in LayerName ] : OlLayer<any> };

		get<TLayerName extends LayerName>(layerName: TLayerName): OlLayer<TLayerName> {
			return this.layers[layerName];
		}

		set<TLayerName extends LayerName>(layerName: TLayerName, layer: OlLayer<TLayerName>) {
			this.layers[layerName] = layer;
		}
	}

	const layers = new Layers();

	type ScriptReplacer<TSearchValue extends string | RegExp> = TSearchValue extends string ? string : (string | ((substring: string, ...args: any[]) => string));

	class Script {
		private data: string | undefined;

		constructor(data: string | undefined) {
			this.data = data;
		}

		static async create({ src, prefix, transformer, data }: { src: string, data?: string, prefix: string, transformer: (script: Script) => void }): Promise<Script> {
			if (!data) {
				data = await fetch(src).then((r) => r.text());
			}

			const script = new Script(data);

			const originalScriptName = `${prefix}_original` as `__sbg_${string}_original`;
			const modifiedScriptName = `${prefix}_modified` as `__sbg_${string}_modified`;

			window[originalScriptName] = script.data || '';
			new Script(window[originalScriptName]).log(`started as ${originalScriptName}`, script.transform);

			script.transform(transformer);

			window[modifiedScriptName] = script.data || '';
			new Script(window[modifiedScriptName]).log(`finished as ${modifiedScriptName}`, script.transform);

			return script;
		}

		valueOf(): string | undefined {
			return this.data;
		}

		replace<TSearchValue extends string | RegExp>(searchValue: TSearchValue, replacer: ScriptReplacer<TSearchValue>): Script {
			this.data = Script.replaceData(this.data, searchValue, replacer);
			return this;
		}

		replaceCUIBlock<TSearchValue extends string | RegExp>(block: string, searchValue: TSearchValue, replacer: ScriptReplacer<TSearchValue>): Script {
			this.data = this.data
				?.replace(
					new RegExp(`(\\/\\*\\s*${Script.regexEscape(block)}\\s*\\*\\/\n(\\s+)\\{\\s*\n\\s+)([\\s\\S]*?)(\n\\2\\})`),
					(_data, open, _, block, close) => open + Script.replaceData(block, searchValue, replacer) + close,
				)
			;

			return this;
		}

		removeCUIBlock(block: string) {
			return this.replaceCUIBlock(block, /[\s\S]+/, '');
		}

		private static regexEscape(str: string): string {
			return str.replace(/[.\-$^*?+\\/\\|[\]{}()]/g, '\\$&');
		}

		private static replaceData<TSearchValue extends string | RegExp>(data: string | undefined, searchValue: TSearchValue, replacer: ScriptReplacer<TSearchValue>): typeof data {
			if (typeof data === 'undefined') {
				console.error(`replace ${searchValue}: data is undefined`);
				return data;
			}

			if (searchValue instanceof RegExp ? data.match(searchValue) : data.includes(searchValue)) {
				if (typeof replacer === 'string') {
					console.log(`replace '${searchValue}' with a string: finished`);
					data = data.replace(searchValue, replacer);
				} else {
					console.log(`replace '${searchValue}' with callback: finished`);
					data = data.replace(searchValue, replacer);
				}
			} else {
				console.error(`replace '${searchValue}': not found`);
			}

			return data;
		}

		transform(func: (script: Script) => void) {
			this.log('started', func);
			func(this);
			this.log('finished', func);
			return this;
		}

		expose(prefix: `__sbg${string}`, { variables, functions }: {
			variables?: { readable?: string[], writable?: string[] },
			functions?: { readable?: string[], writable?: string[], disabled?: string[] },
		}): Script {
			if (!this.data) {
				console.error('expose: data is undefined');
				return this;
			}

			this.log('started', this.expose);

			this.replace(/((?:^|\n)\s*)(const|let)\s+(\w+)(?=[\s+,;\n$])/g, (text, before, variableType, variableName) => {
				if (variables?.readable?.includes(variableName)) {
					return `${before}window.${prefix}_variable_${variableName} = { get: () => ${variableName} };\n${before}${variableType} ${variableName}`;
				}

				if (variables?.writable?.includes(variableName)) {
					return `${before}window.${prefix}_variable_${variableName} = { get: () => ${variableName}, set: (value) => ${variableName} = value };\n${before}let ${variableName}`;
				}

				return text;
			});

			this.data = this.data.replace(/(?:^|\n)\s*(async\s+)?function\s+(\w+)\s*\((.*?)\)\s*\{/g, (text, async, functionName, args) => {
				async = async || '';

				if (functions?.disabled?.includes(functionName)) {
					return `${text} return;`;
				}

				if (functions?.readable?.includes(functionName)) {
					return `\nwindow.${prefix}_function_${functionName} = ${functionName};\n${text}`;
				}

				if (functions?.writable?.includes(functionName)) {
					return `${text}\n\treturn window.${prefix}_function_${functionName}(...arguments);\n}\nwindow.${prefix}_function_${functionName} = ${async}function(${args}) {`;
				}

				return text;
			});

			this.log('finished', this.expose);

			return this;
		}

		log(state: string, func: Function) {
			console.log(`${func.name}: ${state}, ${this.describeData()}`);
		}

		embed(): void {
			if (!this.data) {
				console.error('embed failed, data is undefined');
				return;
			}

			this.log('started', this.embed);
			Script.append((el) => el.textContent = this.data || '');
			this.log('finished', this.embed);
		}

		static appendScript(src: string): void {
			console.log(`append: started, src: ${src}`);
			Script.append((el) => el.src = src);
			console.log(`append: finished, src: ${src}`);
		}

		private static append(fill: (el: HTMLScriptElement) => void) {
			const el = document.createElement('script');
			el.type  = 'text/javascript';
			fill(el);
			document.head.appendChild(el);
		}

		private describeData() {
			return `data is ${typeof this.data === 'string' ? `${this.data.length} bytes length` : typeof this.data}`;
		}
	}

	async function resolveOnce(addListener: (resolver: () => any) => void, immediateCondition: () => boolean): Promise<void> {
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

	const versionWatcherEventTypes = [ 'change' ] as const;

	type VersionWatcherEventData = { previousVersion: string, currentVersion: string };

	type VersionWatcherEventDataTypes = Record<
		typeof versionWatcherEventTypes[number],
		VersionWatcherEventData
	>;

	class VersionWatcher extends EventWatcher<
		typeof versionWatcherEventTypes[number],
		VersionWatcherEventDataTypes,
		EventWatcherListenerOptions
	> {
		private storageKey: string;
		private getter: () => ReadableVariable<string>;

		constructor(storageKey: string, getter: () => ReadableVariable<string>) {
			super(versionWatcherEventTypes);
			this.storageKey = storageKey;
			this.getter     = getter;
		}

		protected override watch() {
			const waitForVersion = setInterval(() => {
				const variable = this.getter();
				if (!variable) {
					return;
				}

				const currentVersion = variable.get();
				if (!currentVersion) {
					return;
				}

				clearInterval(waitForVersion);

				const previousVersion         = localStorage[this.storageKey];
				localStorage[this.storageKey] = currentVersion;

				if (previousVersion !== currentVersion) {
					this.emit('change', { previousVersion, currentVersion }, {});
				}
			}, 50);
		}
	}

	const localStorageWatcherEventTypes = [ 'getItem', 'setItem', 'removeItem' ] as const;

	type LocalStorageWatcherEventOptions = {
		key: string;
		when: 'before' | 'after';
	}

	type LocalStorageWatcherListenerOptions = LocalStorageWatcherEventOptions & EventWatcherListenerOptions;

	type LocalStorageWatcherEventDataTypes = {
		getItem: { key: string };
		setItem: { key: string, value: string };
		removeItem: { key: string };
	}

	class LocalStorageWatcher extends EventWatcher<
		typeof localStorageWatcherEventTypes[number],
		LocalStorageWatcherEventDataTypes,
		LocalStorageWatcherEventOptions,
		LocalStorageWatcherListenerOptions
	> {
		constructor() {
			super(localStorageWatcherEventTypes);
		}

		protected override watch() {
			((originalMethod) => {
				localStorage.getItem = (key: string) => {
					this.emit('getItem', { key }, { key, when : 'before' });
					const result = originalMethod.call(localStorage, key);
					this.emit('getItem', { key }, { key, when : 'after' });
					return result;
				};
			})(localStorage.getItem);

			((originalMethod) => {
				localStorage.setItem = (key: string, value: string) => {
					this.emit('setItem', { key, value }, { key, when : 'before' });
					originalMethod.call(localStorage, key, value);
					this.emit('setItem', { key, value }, { key, when : 'after' });
				};
			})(localStorage.setItem);

			((originalMethod) => {
				localStorage.removeItem = (key: string) => {
					this.emit('removeItem', { key }, { key, when : 'before' });
					originalMethod.call(localStorage, key);
					this.emit('removeItem', { key }, { key, when : 'after' });
				};
			})(localStorage.removeItem);
		}

		protected override filter<TEventType extends keyof LocalStorageWatcherEventDataTypes>(
			listeners: typeof this.listeners[TEventType],
			{ eventOptions }: { eventOptions: LocalStorageWatcherEventOptions },
		) {
			return listeners
				.filter((listener) => listener.listenerOptions.key === eventOptions.key && listener.listenerOptions.when === eventOptions.when);
		}
	}

	async function main() {
		if (location.pathname.startsWith('/login')) {
			return;
		}

		console.log('started');

		preventLoadingScript();
		enhanceEventListeners();

		window.__sbg_language = getLanguage();
		initFeedback();
		initUrls();
		fixPermissionsCompatibility();

		await waitHTMLLoaded();
		initCSS();
		initSettings();
		window.__sbg_plus_modifyFeatures && window.__sbg_plus_modifyFeatures(features);
		execFeatures('pageLoad');

		window.__sbg_plus_localStorage_watcher = new LocalStorageWatcher();

		const nativeScript = await getNativeScript();
		await loadCUI(nativeScript);

		console.log('wait map: started');
		await wait(() => window.__sbg_variable_map);
		console.log('wait map: finished');

		initHome();
		initLayers();
		execFeatures('mapReady');
		execFireFeatures();

		console.log('finished');
	}

	async function copyLogs() {
		return navigator.clipboard.writeText(logs.join('\n')).then(() => showToast(labels.toasts.logs, 2000));
	}

	function showToast(label: Label, duration: number): void {
		window.Toastify && window.Toastify({
			text          : label.toString(),
			duration,
			forceDuration : true,
			gravity       : 'top',
			position      : 'right',
			className     : 'interaction-toast',
		}).showToast();
	}

	function addLayer<TLayerName extends LayerName>(layerName: TLayerName, layerLike: LayerName) {
		const source = new window.ol.source.Vector<TLayerName>();
		const layer  = new window.ol.layer.Vector<TLayerName>({ source, className : `ol-layer__${layerName}` });
		layer.setProperties({ name : layerName, zIndex : layers.get(layerLike).getProperties().zIndex }, true);
		window.__sbg_variable_map.get().addLayer(layer);
		return layer;
	}

	function preventLoadingScript() {
		((append) => {
			Element.prototype.append = function() {
				if (arguments.length === 0) {
					return;
				}
				if (arguments[0].src === getNativeScriptSrc()) {
					return;
				}
				append.apply(this, arguments);
			};
		})(Element.prototype.append);

		console.log('prevented loading script');
	}

	function getNativeScriptSrc(): string {
		return window.__sbg_urls[isMobile() ? 'script' : 'intel'].remote;
	}

	function getCUIScriptSrc(): string {
		return window.__sbg_urls['cui'].remote;
	}

	function getEUIScriptSrc(): string {
		return window.__sbg_urls['eui'].remote;
	}

	function enhanceEventListeners() {
		((addEventListener, removeEventListener) => {
			function initEventListeners(target: EventTarget, type: string): EventTarget {
				target.__events       = target.__events || {};
				target.__events[type] = target.__events[type] || { listeners : [] };
				return target;
			}

			EventTarget.prototype.addEventListener = function(type, listener) {
				if (!listener) {
					return;
				}

				const target = initEventListeners(this, type);

				if (target.__events[type].sealed) {
					return;
				}

				target.__events[type].listeners.push(listener);

				addEventListener.apply(this, arguments);
			};

			EventTarget.prototype.removeEventListener = function(type, listener) {
				if (!listener) {
					return;
				}

				const target = initEventListeners(this, type);
				const index  = target.__events[type].listeners.indexOf(listener);

				if (index !== -1) {
					target.__events[type].listeners.splice(index, 1);
				}

				removeEventListener.apply(this, arguments);
			};

			EventTarget.prototype.getEventListeners = function(type: string): EventListenerOrEventListenerObject[] {
				const target = initEventListeners(this, type);

				const listeners = [];

				for (const listener of target.__events[type].listeners) {
					if (!listener) {
						continue;
					}

					listeners.push(listener);
				}

				return listeners;
			};

			EventTarget.prototype.getEventHandlers = function<T = EventListener>(type: string): T[] {
				const target = this as EventTarget;

				return target.getEventListeners(type)
					.map((listener) => 'handleEvent' in listener ? listener.handleEvent : listener)
					.map((handler) => handler as T);
			};

			EventTarget.prototype.clearEventListeners = function(type: string, sealed: boolean) {
				const target = initEventListeners(this, type);

				if (sealed) {
					target.__events[type].sealed = true;
				}

				for (const listener of target.__events[type].listeners) {
					removeEventListener.apply(target, [ type, listener ]);
				}

				target.__events[type].listeners.splice(0);
			};

			EventTarget.prototype.addOnlyEventListener = function(type, listener) {
				if (!listener) {
					return;
				}

				const target = initEventListeners(this, type);

				target.clearEventListeners(type, true);
				target.__events[type].listeners.push(listener);

				addEventListener.apply(this, arguments);
			};

			EventTarget.prototype.addRepeatingEventListener = function(type, callback, { repeats: limit, timeout, tick = () => {}, filter = () => true, cancel = () => true }): void {
				let repeats = 0;

				addEventListener.call(this, type, (ev: Event) => {
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
						callback(ev);
						return;
					}

					tick(ev, repeats);

					setTimeout(() => {
						repeats = 0;
					}, timeout);
				});

			};
		})(EventTarget.prototype.addEventListener, EventTarget.prototype.removeEventListener);

		console.log('enhanced event listeners');
	}

	function getLanguage(): Lng {
		let lang;

		try {
			lang = JSON.parse(localStorage.settings).lang;
		} catch {
			lang = navigator.language;
		}

		const result = [ 'ru', 'uk', 'be', 'kk' ].includes(lang.split('-')[0]) ? 'ru' : 'en';
		console.log(`detected language: ${result}`);
		return result;
	}

	function initFeedback() {
		const feedbackClickTimeout = 1000;
		const feedbackTouches      = 3;
		const feedbackTouchRepeats = 2;

		document.addRepeatingEventListener('touchstart', () => copyLogs(), {
			repeats : feedbackTouchRepeats,
			timeout : feedbackClickTimeout,
			filter  : (ev: TouchEvent) => ev.touches.length === feedbackTouches,
		});
	}

	function initUrls() {
		if (window.__sbg_urls) {
			return;
		}

		window.__sbg_urls = {
			desktop : {
				local  : 'sbg.plus.user.js',
				remote : 'https://anmiles.net/userscripts/sbg.plus.user.js',
			},
			mobile : {
				local  : 'sbg.plus.user.min.js',
				remote : 'https://anmiles.net/userscripts/sbg.plus.user.min.js',
			},
			intel : {
				local  : 'intel.js',
				remote : 'https://sbg-game.ru/app/intel.js',
			},
			script : {
				local  : 'script.js',
				remote : 'https://sbg-game.ru/app/script.js',
			},
			cui : {
				local  : 'nicko.js',
				remote : 'https://raw.githubusercontent.com/nicko-v/sbg-cui/main/index.js',
			},
			eui : {
				local  : 'egor.js',
				remote : 'https://github.com/egorantonov/sbg-enhanced/releases/latest/download/index.js',
			},
		};

	}

	function fixPermissionsCompatibility() {
		console.log(`userAgent: ${navigator.userAgent}`);

		if (typeof navigator.permissions === 'undefined') {
			Object.defineProperty(navigator, 'permissions', {
				value : {
					query : async () => ({ state : 'granted' }),
				},
			});
		}

		if (typeof window.DeviceOrientationEvent.requestPermission !== 'function') {
			window.DeviceOrientationEvent.requestPermission = async () => 'granted';
		}
	}

	async function loadCUI(nativeScript: Script): Promise<void> {
		if (!features.get(loadCUI).isEnabled()) {
			console.log('CUI disabled; loading native script');
			nativeScript.embed();
			return;
		}

		console.log('CUI enabled; loading CUI script');

		const cuiScript = await Script.create({
			src         : getCUIScriptSrc(),
			prefix      : '__sbg_cui_script',
			transformer : transformCUIScript,
		});

		cuiScript.embed();

		console.log('wait cuiStatus: started');
		await wait(() => window.cuiStatus === 'loaded');
		console.log('wait cuiStatus: finished');
	}

	function transformCUIScript(script: Script): Script {
		script.transform(exposeCUI);
		script.transform(fixCompatibility);
		script.transform(fixGotoReference);
		script.transform(fixCUIDefaults);
		script.transform(fixCUIWarnings);
		script.transform(disableCUIPointNavigation);

		features.triggers['cuiTransform'].map((transformer: Transformer) => {
			script = transformer.exec(script);
		});

		return script;
	}

	async function waitHTMLLoaded(): Promise<void> {
		await resolveOnce((resolver) => document.addEventListener('DOMContentLoaded', resolver), () => document.readyState !== 'loading');
		console.log('loaded DOM content');
	}

	async function getNativeScript(): Promise<Script>  {
		return Script.create({
			src         : getNativeScriptSrc(),
			prefix      : '__sbg_script',
			transformer : transformNativeScript,
		});
	}

	function isMobile(): boolean {
		if ('maxTouchPoints' in navigator) {
			return navigator['maxTouchPoints'] > 0;
		} else if ('msMaxTouchPoints' in navigator) {
			return navigator['msMaxTouchPoints'] > 0;
		} else if ('orientation' in window) {
			return true;
		} else {
			return /\b(BlackBerry|webOS|iPhone|IEMobile|Android|Windows Phone|iPad|iPod)\b/i.test(navigator['userAgent']);
		}
	}

	function loadEUI() {
		window.cuiStatus = 'loaded';
		Script.appendScript(getEUIScriptSrc());
	}

	function transformNativeScript(script: Script): Script {
		return script
			.transform(includeYMaps)
			.expose('__sbg', {
				variables : {
					readable : [ 'draw_slider', 'FeatureStyles', 'is_dark', 'ItemTypes', 'LANG', 'map', 'TeamColors', 'temp_lines_source', 'units', 'VERSION' ],
				},
				functions : {
					readable : [ 'apiQuery', 'deleteInventoryItem', 'jquerypassargs', 'openProfile', 'takeUnits' ],
					writable : [ 'drawLeaderboard', 'manageDrawing', 'movePlayer', 'showInfo', 'timeToString' ],
					disabled : !isMobile() && localStorage['homeCoords'] ? [ 'movePlayer' ] : undefined,
				},
			});
	}

	function includeYMaps(script: Script): Script {
		const layerName = 'ymaps';
		let isChecked;

		try {
			JSON.parse(localStorage.settings).base === layerName;
		} catch {
			isChecked = localStorage['sbg-plus-state-ymaps'] === '1';
		}

		const ymapsInput = $('<input type="radio" />').attr('name', 'baselayer').val(layerName).prop('checked', isChecked);
		const ymapsSpan  = $('<span></span>').text(labels.ymaps.toString());
		const ymapsLabel = $('<label></label>').addClass('layers-config__entry').append(ymapsInput).append(' ').append(ymapsSpan);
		$('input[value="osm"]').parent().after(ymapsLabel);

		return script
			.replace(
				'if (type == \'osm\') {',
				`if (type == '${layerName}') { \n  theme = is_dark ? 'dark' : 'light';\n  source = new ol.source.XYZ({ url: \`https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&scale=1&projection=web_mercator&theme=\${theme}&lang=\${window.__sbg_language}\` });\n} else if (type == 'osm') {\n`,
			)
		;
	}

	function setCSS(css: string) {
		$('<style></style>').html(css).appendTo(document.body);
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
				filter: grayscale(1);
			}
		`);

		console.log('initialized CSS');
	}

	function wait<T>(func: (...args: any[]) => T | null | undefined): Promise<T> {
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

	function createPopup(cssClass: string, options: { roundClose: boolean } = { roundClose : true }): JQuery<HTMLElement> {
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

		closeButton.get(0)?.addOnlyEventListener('click', function() {
			popup.addClass('hidden');
		});

		return popup;
	}

	function initHome() {
		if (isMobile() || !('homeCoords' in localStorage)) {
			return;
		}

		const center = JSON.parse(localStorage.homeCoords);
		window.__sbg_variable_map.get().getView().setCenter(center);
		console.log('initialized home location');
	}

	function initLayers() {
		for (const layer of window.__sbg_variable_map.get().getAllLayers()) {
			const layerName = layer.getProperties().name;

			const key = !layerName
				? 'base'
				: layerName === 'lines' && layers.get('lines')
					? 'lines_temp'
					: layerName;

			layers.set(key, layer);
		}

		console.log('initialized layers');
	}

	function execFeatures(trigger: FeatureTrigger) {
		features.triggers[trigger].map((feature) => {
			if (feature instanceof Feature) {
				feature.exec();
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

	function exposeCUI(script: Script): Script {
		return script
			.expose('__sbg_cui', {
				variables : {
					readable : [ 'USERSCRIPT_VERSION', 'config' ],
				},
				functions : {
					readable : [ 'clearInventory' ],
				},
			});
	}

	function fixCompatibility(script: Script): Script {
		(async () => {
			console.log('fix CUI compatibility: wait window.cuiEmbedded');
			await wait(() => window.cuiEmbedded);

			console.log('fix CUI compatibility: wait window.ol');
			await wait(() => window.ol);

			console.log('fix CUI compatibility: set view animation duration');
			setViewAnimationDuration();

			console.log('fix CUI compatibility: subscribe to mapReady');
			window.addEventListener('mapReady', window.__sbg_cui_function_main);

			console.log('fix CUI compatibility: call olInjection');
			window.__sbg_cui_function_olInjection();

			console.log('fix CUI compatibility: call loadMainScript');
			window.__sbg_cui_function_loadMainScript();

			console.log('fix CUI compatibility: loaded');
		})();

		script.log('replace', fixCompatibility);

		// TODO: temporary fix
		script
			.replaceCUIBlock(
				'Стили',
				/^/,
				'window.__sbg_debug_object(\'debug CUI: show config before setting styles\', { config });',
			)
			.replace(
				'function loadTile(tile, src) {',
				`function loadTile(tile, src) {
					if (!database) {
						console.error('debug CUI: loadTile requires undefined database');
					}
				`,
			)
			.replace(
				/database = /g,
				(_match: string, index: number) => `
				window.__sbg_debug_object('debug CUI: assign database on position ${index}', { result: event.target.result });
				database = `,
			)
			.replace(
				'notifs = await getNotifs();',
				'notifs = await getNotifs(); window.__sbg_debug_object(\'debug CUI: notifs\', { notifs, first: notifs[0] });',
			)
		;

		return script
			.replace(
				'fetch(\'/app/script.js\')',
				'(async () => ({ text: async () => window.__sbg_script_modified }))()',
			)
			.replace(
				'window.stop',
				'if (false) window.stop',
			)
			.replace(
				'window.navigator.geolocation.clearWatch',
				'if (false) window.navigator.geolocation.clearWatch',
			)
			.replace(
				'document.open',
				'if (false) document.open',
			)
			.replace(
				'fetch(\'/app\')',
				'if (false) fetch(\'/\')',
			)
			.replace(
				/$/,
				'window.cuiEmbedded = true',
			)
			.replace(
				/window\.onerror = (.*);/,
				(_match: string, func: string) => `window.__sbg_onerror_handlers.push(${func});`,
			)
			.expose('__sbg_cui', {
				functions : {
					readable : [ 'olInjection', 'loadMainScript', 'main' ],
				},
			})
		;
	}

	function setViewAnimationDuration() {
		if (typeof window.__sbg_plus_animation_duration === 'number') {
			((animate) => {
				window.ol.View.prototype.animate = function(...args) {
					const instantArgs = args.map((arg) => typeof arg === 'object' ? { ...arg, duration : window.__sbg_plus_animation_duration } : arg);
					animate.call(this, ...instantArgs);
				};
			})(window.ol.View.prototype.animate);
		}
	}

	function fixGotoReference(script: Script): Script {
		$(document).on('click', 'a[href*="point="]', (ev) => {
			const guid = (ev.currentTarget as HTMLLinkElement).href.split('point=').pop()?.split('&').shift();
			window.__sbg_function_showInfo(guid);
			ev.stopPropagation();
			return false;
		});

		script.log('replace', fixGotoReference);

		return script
			.replace(
				'window.location.href = `/app/?point=${guid}`',
				'window.__sbg_function_showInfo(guid)',
			)
		;
	}

	function fixCUIDefaults(script: Script): Script {
		return script
			.replace(
				'sepia: 1',
				'sepia: 0',
			);
	}

	function fixCUIWarnings(script: Script): Script {
		return script
			.replace(
				'!viewportMeta.content.match(yaRegexp)',
				'!viewportMeta.content.match(yaRegexp) && navigator.userAgent.toLowerCase().includes("yabrowser")',
			)
		;
	}

	function disableCUIPointNavigation(script: Script): Script {
		$('<div></div>').addClass('sbgcui_jumpToButton').appendTo('.info');

		setCSS(`
			.sbgcui_jumpToButton {
				display: none !important;
			}
		`);

		return script.removeCUIBlock('Навигация и переход к точке');
	}

	function disableClusters(script: Script): Script {
		return script
			.replace(
				'function mapClickHandler(event) {',
				'function mapClickHandler(event) { event.isSilent = true;',
			)
		;
	}

	function disableAttackZoom(script: Script): Script {
		setCSS(`
			.sbgcui_lock_rotation[sbgcui_locked="true"]::before {
				transition: none !important;
			}
		`);

		return script
			// .replace(
			// 	'view.fit(',
			// 	'if (false) view.fit(',
			// )
			.replaceCUIBlock(
				'Показ радиуса катализатора',
				/(?<=\n\s+)view\./g,
				(match: string) => `if (false) ${match}`,
			)
			// .replaceCUIBlock(
			// 	'Вращение карты',
			// 	'function resetView() {',
			// 	'function resetView() { view.setRotation(0); return; ',
			// )
		;
	}

	function unlockCompassWhenRotateMap(script: Script): Script {
		return script
			.replaceCUIBlock(
				'Вращение карты',
				'if (latestTouchPoint == null) { return; }',
				'if (latestTouchPoint == null) { if (isRotationLocked) { toggleRotationLock(event); touchStartHandler({...event, target: event.target, touches: [event.touches[0]], targetTouches: [event.targetTouches[0]] }); } return; }',
			)
		;
	}

	function alwaysClearInventory(script: Script): Script {
		return script
			.replace(
				/const MIN_FREE_SPACE = \d+/,
				'const MIN_FREE_SPACE = INVENTORY_LIMIT',
			)
		;
	}

	function waitClearInventory(script: Script): Script {
		$('#discover').on('click', () => {
			(window.__sbg_plus_localStorage_watcher as LocalStorageWatcher).on('getItem', () => {
				window.__sbg_cui_function_clearInventory(false);
			}, { key : 'inventory-cache', when : 'after', once : true });
		});

		return script
			.replace(
				'clearInventory(false, toDelete);',
				'// clearInventory(false, toDelete);',
			)
		;
	}

	function disableCarouselAnimation() {
		window.Splide.defaults       = window.Splide.defaults || {};
		window.Splide.defaults.speed = 0;
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

	function closeToastsAfter1sec() {
		((_init) => {
			window.Toastify.prototype.init = function(options) {
				if (!options.forceDuration) {
					options.duration = Math.min(options.duration || 0, 1000);
				}

				_init.call(this, options);
				return this;
			};
			window.Toastify.prototype.init.prototype = _init.prototype;
		})(window.Toastify.prototype.init);
	}

	function enableBackButton() {
		const backClickTimeout = 1000;

		const popups: Array<{ hiddenClass: string, selectors: string[] }> = [
			{ hiddenClass : 'hidden', selectors : [ '.popup', '.draw-slider-wrp', '.attack-slider-wrp' ] },
			{ hiddenClass : 'sbgcui_hidden', selectors : [ '.sbgcui_settings' ] },
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

		document.addRepeatingEventListener('backbutton', () => location.replace('/window.close'), {
			repeats : 2,
			timeout : backClickTimeout,
			tick    : () => showToast(labels.toasts.back, backClickTimeout),
			cancel  : () => !isPopupClosed(),
		});
	}

	function showBuilderPanel() {
		wait(() => $('.topleft-container')).then((buttonsSection) => new Builder(buttonsSection));
	}

	function updateLangCacheAutomatically() {
		new VersionWatcher('__sbg_current_version', () => window.__sbg_variable_VERSION)
			.on('change', ({ currentVersion }) => {
				console.log(`update lang cache to ${currentVersion} version`);
				$('#lang-cache').trigger('click');
			}, { previous : true });
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
			}

			.popup.pp-center > * {
				position: relative;
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
		const handlers = [ ...window.getEventHandlers<(ev: DeviceOrientationEvent) => void>('deviceorientation') ];

		function triggerHandlers(webkitCompassHeading: number) {
			handlers.map((handler) => handler({ webkitCompassHeading } as DeviceOrientationEvent));
		}

		function deviceOrientationAbsoluteListener(ev: DeviceOrientationEvent) {
			if (!ev.absolute || ev.alpha == null || ev.beta == null || ev.gamma == null) {
				return;
			}

			const totalDegrees = 360;

			const webkitCompassHeading = -(ev.alpha + ev.beta * ev.gamma / 90) % totalDegrees;
			window.removeEventListener('deviceorientation', deviceOrientationListener);
			triggerHandlers(webkitCompassHeading);
		}

		const deviceOrientationListener = (ev: DeviceOrientationEvent) => {
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

		window.DeviceOrientationEvent.requestPermission()
			.then((response) => {
				if (response === 'granted') {
					addListeners();
				} else {
					console.warn('DeviceOrientationEvent permission is not granted');
				}
			});
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

	function replaceHighlevelWarningWithIcon(attackSlider: JQuery<HTMLElement>) {
		const sliderHeight = attackSlider.height();

		setCSS(`
			#attack-slider {
				padding: 4px 0;
			}

			.attack-slider-highlevel {
				pointer-events: none;
				font-size: 36px;
				width: 1px;
				height: ${sliderHeight}px;
				margin: -${sliderHeight}px auto 0 auto;
				background: none;
				backdrop-filter: none;
				-webkit-backdrop-filter: none;
				text-align: center;
				display: block;
				z-index: 1;
			}
		`);

		$('.attack-slider-highlevel').html('&#x20e0');
	}

	function joinFireButtons(attackMenu: JQuery<HTMLElement>) {
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

			#attack-menu.sbgcui_attack-menu-rotate::after {
				background: var(--ingress-selection-color);
			}

			#attack-menu.sbgcui_attack-menu-rotate {
				border-color: var(--ingress-selection-color);
			}
		`);

		$(window).on('click', function(ev) {
			const target = ev.target as unknown as Element;

			if (target.id !== 'attack-menu' && $('.attack-slider-wrp.hidden').length === 0 && $(target).parents('.attack-slider-wrp').length === 0) {
				$('#attack-menu').trigger('click');
			}
		});
	}

	/* toolbar */

	function showQuickAutoSelectButton(toolbar: JQuery<HTMLElement>) {
		const autoSelect = window.__sbg_cui_variable_config.get().autoSelect;
		const cssClass   = autoSelect.deploy === 'max' ? 'fa-rotate-180' : '';

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

	function moveAllSidebarsRight(control: JQuery<HTMLElement>) {
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

	function showAutoDeleteSettingsButton(inventoryPopup: JQuery<HTMLElement>) {
		$('<button></button>')
			.text('Auto-delete')
			.css({ height : '40px' })
			.appendTo(inventoryPopup)
			.on('click', () => {
				$('#inventory__close').trigger('click');
				$('.sbgcui_settings').removeClass('sbgcui_hidden');
				$('.sbgcui_settings-title:contains("Автоудаление")').trigger('click');
			});
	}

	function moveRerefenceButtonsDown() {
		// TODO: split from hideManualClearButtons
		setCSS(`
			[data-feat-moveRerefenceButtonsDown] .inventory__controls {
				height: 0;
				min-height: 0;
				overflow: hidden;
			}

			[data-feat-moveRerefenceButtonsDown] .inventory__content[data-tab="3"] ~ .inventory__controls > select {
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

			[data-feat-moveRerefenceButtonsDown] .inventory__content[data-tab="3"] ~ .inventory__controls > .sbgcui_refs-sort-button {
				border-width: revert;
				border-radius: 0;
				bottom: 51px;
				z-index: 2;
				right: 4px;
				height: 40px;
				width: 40px;
				font-size: 20px;
			}

			[data-feat-moveRerefenceButtonsDown] #inventory__close {
				bottom: 102px;
			}

			[data-feat-moveRerefenceButtonsDown] .inventory__content[data-tab="3"] {
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

	function alwaysShowSelfStatistics(drawLeaderboard: typeof window.__sbg_function_drawLeaderboard) {
		window.__sbg_function_drawLeaderboard = async function() {
			await drawLeaderboard();

			const statMap: Record<string, string> = {
				owned : 'owned_points',
			};

			const stat  = $('#leaderboard__term-select').val()?.toString() || '';
			const data  = (await window.__sbg_function_apiQuery('profile', { guid : $('#self-info__name').data('guid') })).response.data;
			const value = data[statMap[stat] || stat];

			const entry = window.__sbg_function_jquerypassargs(
				$('<li>'),
				'$1$ — $2$; $3$ $4$',
				$('<span>', { class : 'profile-link' }).text(data.name).css('color', `var(--team-${data.team})`).attr('data-name', data.name).on('click', window.__sbg_function_openProfile),
				$('<span>').text(window.i18next.t('leaderboard.level', { count : data.level })).css('color', `var(--level-${data.level})`),
				...window.__sbg_function_takeUnits(value),
			);

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

	function fixSortButton(_button: JQuery<HTMLElement>) {
		setCSS(`
			.sbgcui_refs-sort-button {
				z-index: 100 !important;
			}
		`);
	}

	function reportCUIUpdates() {
		new VersionWatcher('__sbg_cui_current_version', () => window.__sbg_cui_variable_USERSCRIPT_VERSION)
			.on('change', ({ currentVersion }) => {
				const message = labels.toasts.cuiUpdated.format({ currentVersion });
				showToast(message, 2000);

				if (window.__sbg_local) {
					alert(message);
				}
			}, { previous : true });
	}

	function quickRecycleAllRefs(inventoryContent: JQuery<HTMLElement>) {
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

		const inventoryContentEl = inventoryContent.get(0) as Element;
		inventoryContentEl.getEventListeners('click').forEach((listener) => inventoryContentEl.removeEventListener('click', listener));

		$(document).on('click', '.inventory__content', async function(ev) {
			if (!ev.target) {
				return;
			}

			if (!$(ev.target).is('.inventory__ic-manage')) {
				if ($(ev.target).is('.inventory__ic-view')) {
					ev.offsetX = 0;
				}

				inventoryContentEl.getEventHandlers('click').map((func) => ev.originalEvent && func(ev.originalEvent));
				return;
			}

			const el   = $(ev.target).parents('.inventory__item');
			const item = (JSON.parse(localStorage.getItem('inventory-cache') || '[]') || []).find((f: { g: string }) => f.g == el.attr('data-guid'));
			if (!item) {
				return;
			}

			const fakeEl = $('<input />')
				.addClass('inventory__ma-amount')
				.val(item.a)
				.css({ display : 'none' });

			Object.defineProperty(fakeEl.get(0), 'reportValidity', { value : () => true });
			el.append(fakeEl);
			el.attr('data-tab', item.t);

			await window.__sbg_function_deleteInventoryItem(el);
		});
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
		const cooldownSeconds        = 90;
		const visibleSeconds         = 100;
		const visibleSecondsPrevious = 60;

		window.__sbg_function_timeToString = function(seconds) {
			return seconds >= visibleSeconds
				? window.i18next.t('units.min', { count : Math.floor(seconds / 60) })
				: window.i18next.t('units.sec', { count : seconds });
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

	function alignCloseButtonVertically() {
		setCSS(`
			.info.popup > .popup-close {
				margin-top: -0.5em;
				margin-bottom: calc(0.5em - 10px);
			}
		`);
	}

	function rearrangeButtons() {
		setCSS(`
			.i-stat .i-buttons {
				--discover-left: 0/6;
				--discover-right: 0/6;

				--discover-gap: 0.25em;
				--discover-border: 1.9px;
				--discover-parent: calc(0.9 * (100vw - 2 * var(--discover-border)) + 2 * var(--discover-gap));
				--discover-font-size: 1.1em;

				--discover-left-offset: calc(var(--discover-left) * (var(--discover-parent) + var(--discover-gap)));
				--discover-right-offset: calc(var(--discover-right) * (var(--discover-parent) + var(--discover-gap)));

				--discover-width: calc(var(--discover-parent) - var(--discover-left-offset) - var(--discover-right-offset));

				--discover-sibling-left-width: calc(var(--discover-left) * var(--discover-parent) - var(--discover-gap));
				--discover-sibling-right-width: calc(var(--discover-right) * var(--discover-parent) - var(--discover-gap));

				--discover-sibling-left-offset: calc(-1 * var(--discover-left-offset) - var(--discover-border));
				--discover-sibling-right-offset: calc(-1 * var(--discover-right-offset) - var(--discover-border));

				--discover-alt-button-width: calc(1/6 * (var(--discover-parent) - 2 * var(--discover-gap)) - 0.5 * var(--discover-border));
			}

			.i-buttons button {
				border-width: 2px;
			}

			#discover {
				margin-left: var(--discover-left-offset);
				margin-right: var(--discover-right-offset);
				width: var(--discover-width);
			}

			.sbgcui_no_loot,
			.sbgcui_no_refs {
				width: var(--discover-alt-button-width);
				padding: 0 calc(0.5 * var(--discover-gap));
				border-color: currentColor !important;
			}

			.sbgcui_no_loot:before,
			.sbgcui_no_refs:before {
				max-width: 1.5em;
			}
		`);
	}

	function hideCloseButton() {
		$('#draw').on('click', (ev) => $('.draw-slider-buttons button').css({ height : `${$(ev.target).outerHeight()}px` }));

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

			[data-feat-hideCloseButton] .i-stat .i-buttons {
				margin: 0;
			}
		`);
	}

	function colorizeTimer() {
		rearrangeButtons();

		setCSS(`
			[data-feat-colorizeTimer] .i-stat .i-buttons {
				--discover-left: 1/6;
			}

			[data-feat-colorizeTimer] #discover:after {
				transform: none;
				width: var(--discover-sibling-left-width);
				left: var(--discover-sibling-left-offset);
				height: calc(100% + 2 * var(--discover-border));
				top: calc(-1 * var(--discover-border));
				box-sizing: border-box;
				line-height: 40px;
				border: var(--discover-border) solid currentColor;
				color: var(--ingress-btn-border-color);
				border-color: currentColor;
				content: ' ';
			}

			[data-feat-colorizeTimer] #discover[data-time]:after {
				content: attr(data-time);
			}

			[data-feat-colorizeTimer] #discover[data-time][data-remain]:after {
				content: attr(data-time) ' #' attr(data-remain);
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

	function hideRepairButton() {
		rearrangeButtons();

		setCSS(`
			[data-feat-hideRepairButton] #repair,
			[data-feat-hideRepairButton] #eui-repair {
				display: none;
			}

			[data-feat-hideRepairButton] .i-stat .i-buttons > button:not(#discover) {
				width: calc(45% + 0.125em);
			}
		`);
	}

	function replaceSwipeWithButton(arrow: JQuery<HTMLElement>) {
		rearrangeButtons();

		arrow.hide();

		function createTouch(touchData: Partial<Touch> & { target: EventTarget }): { touches: TouchEvent['touches'] } {
			const touches = [ {
				clientX       : touchData.clientX ?? 0,
				clientY       : touchData.clientY ?? 0,
				pageX         : touchData.pageX ?? touchData.clientX ?? 0,
				pageY         : touchData.pageY ?? touchData.clientY ?? 0,
				screenX       : touchData.screenX ?? touchData.clientX ?? 0,
				screenY       : touchData.screenY ?? touchData.clientY ?? 0,
				force         : touchData.force ?? 0,
				identifier    : touchData.identifier ?? 0,
				radiusX       : touchData.radiusX ?? 1,
				radiusY       : touchData.radiusY ?? 1,
				rotationAngle : touchData.rotationAngle ?? 0,
				target        : touchData.target,
			} ];

			const set = new Set(touches);

			return {
				touches : {
					length            : set.size,
					item              : (index: number) => touches[index],
					[Symbol.iterator] : set[Symbol.iterator],
				},
			};
		}

		function swipe(
			target: EventTarget,
			[ startX, startY ]: [ number, number ],
			[ endX, endY ]: [ number, number ],
		) {
			const identifier = Math.random() * Number.MAX_SAFE_INTEGER;
			const startTouch = createTouch({ target, identifier, clientX : startX, clientY : startY });
			const endTouch   = createTouch({ target, identifier, clientX : endX, clientY : endY });

			const touchStartHandlers = target.getEventHandlers<CustomTouchEvent>('touchstart').filter((f) => f.name === 'touchStartHandler');
			const touchMoveHandlers  = target.getEventHandlers<CustomTouchEvent>('touchmove').filter((f) => f.name === 'touchMoveHandler');
			const touchEndHandlers   = target.getEventHandlers<CustomTouchEvent>('touchend').filter((f) => f.name === 'touchEndHandler');

			touchStartHandlers.map((handler) => handler(startTouch));
			touchMoveHandlers.map((handler) => handler(startTouch));
			touchMoveHandlers.map((handler) => handler(endTouch));
			touchEndHandlers.map((handler) => handler(endTouch));
		}

		const button = $('<button></button>')
			.addClass('next')
			.html('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40" focusable="false"><path d="m15.5 0.932-4.3 4.38 14.5 14.6-14.5 14.5 4.3 4.4 14.6-14.6 4.4-4.3-4.4-4.4-14.6-14.6z"></path></svg>')
			.on('click', (ev) => {
				const infoPopup = document.querySelector('.info.popup') as Element;
				swipe(infoPopup, [ 200, 0 ], [ 0, 0 ]);
				ev.stopPropagation();
				return false;
			})
			.appendTo($('#discover'));

		new MutationObserver((mutations) => mutations
			.filter(({ attributeName }) => attributeName === 'class')
			.map(() => {
				button.prop('disabled', arrow.hasClass('sbgcui_hidden'));
			}),
		).observe(arrow.get(0) as HTMLElement, { attributes : true });

		setCSS(`
			.i-stat .i-buttons .next {
				display: none;
			}

			[data-feat-replaceSwipeWithButton] .i-stat .i-buttons {
				--discover-right: 1/6;
			}

			[data-feat-replaceSwipeWithButton] .i-stat .i-buttons .next {
				display: block;
				position: absolute;
				width: var(--discover-sibling-right-width);
				right: var(--discover-sibling-right-offset);
				height: calc(100% + 2 * var(--discover-border));
				top: calc(-1 * var(--discover-border));
				color: var(--ingress-btn-color);
				background: linear-gradient(to top, var(--ingress-btn-glow-color) 0%, var(--ingress-btn-bg-color) 30%, var(--ingress-btn-bg-color) 70%, var(--ingress-btn-glow-color) 100%), var(--ingress-btn-bg-color);
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

	function showFeatureToggles() {
		const containers = {
			info      : $('.info.popup .i-image-box'),
			inventory : $('.inventory.popup'),
		} as const;

		Object.values(containers).forEach((container) => $('<div></div>').addClass('i-buttons i-feature-toggles').appendTo(container));

		const featureToggles: Array<{ container: keyof typeof containers, title: string, feature: AnyFeatureBase }> = [
			{ container : 'info', title : 'CLS', feature : features.get(hideCloseButton) },
			{ container : 'info', title : 'REP', feature : features.get(hideRepairButton) },
			{ container : 'info', title : 'SWP', feature : features.get(replaceSwipeWithButton) },
			{ container : 'info', title : 'TMR', feature : features.get(colorizeTimer) },

			{ container : 'inventory', title : 'CUI', feature : features.get(restoreCUISort) },
			{ container : 'inventory', title : 'BUT', feature : features.get(moveRerefenceButtonsDown) },
			{ container : 'inventory', title : 'CLR', feature : features.get(hideManualClearButtons) },
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

	function selectTargetPointByClick() {
		((showInfo) => {
			window.__sbg_function_showInfo = function(data) {
				if (!$('#draw-slider').is(':visible')) {
					showInfo(data);
				} else {
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
			window.__sbg_variable_temp_lines_source.get().clear = function(fast) {
				clear.call(this, fast);
				highlightsLayer.getSource().clear(fast);
			};
		})(window.__sbg_variable_temp_lines_source.get().clear);

		((manageDrawing) => {
			window.__sbg_function_manageDrawing = function(event: SplideEvent) {
				manageDrawing(event);

				const tempLine       = window.__sbg_variable_temp_lines_source.get().getFeatures()[0];
				const tempLineCoords = tempLine.getGeometry().flatCoordinates;

				const highlightFeature = new window.ol.Feature<'highlights'>({
					geometry : new window.ol.geom.Circle([ tempLineCoords.slice(tempLineCoords.length - 2) ], 16),
				});

				const highlightStyle = new window.ol.style.Style({
					stroke : new window.ol.style.Stroke({ color : '#F80', width : 3 }),
				});

				highlightFeature.setStyle(highlightStyle);
				highlightsLayer.getSource().addFeature(highlightFeature);
			};
		})(window.__sbg_function_manageDrawing);
	}

	function matchDrawSliderButtons(slider: JQuery<HTMLElement>) {
		$('#draw').on('click', (ev) => {
			slider.css({ bottom : `${($(window).height() as number) - ($(ev.target).offset()?.top as number) - ($('#draw').outerHeight() as number)}px` });
			slider.find('.draw-slider-buttons').css({ padding : `0 ${($(ev.target).offset()?.left as number)}px` });
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

	class Builder {
		features = {} as BuilderFeatures;
		points: Record<OlGuid, string> = {};
		pointStyles: Record<OlGuid, OlStyle> = {};
		lines: CoordsMap<OlLineCoords, OlLine> = new CoordsMap();
		regions: CoordsMap<OlRegionCoords, OlRegion> = new CoordsMap();
		linesMap: CoordsMap<OlCoords, { coords: OlCoords; mine: boolean}[]> = new CoordsMap();
		regionsMap: CoordsMap<OlLineCoords, { region: OlRegion, mine: boolean}[]> = new CoordsMap();
		data: BuilderData;
		startPoint?: OlPoint;
		ownTeam: Team;
		drawTeam: Team = 4;
		maxDrawAttempts = 3;

		constructor(buttonsSection: JQuery<HTMLElement>) {
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

			Object.defineProperty(window, 'builder', { value : this });
		}

		private initCSS() {
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

		private initTeam() {
			const style = $('#self-info__name').attr('style');

			if (style) {
				const matches = style.match(/team-(\d+)/);

				if (matches) {
					this.ownTeam = parseInt(matches[1]) as Team;
				}
			}

			window.__sbg_variable_TeamColors.get().push({ fill : '#FF880030', stroke : '#F80' });
		}

		private initLayers() {
			this.addLayer('lines_built', 'lines');
			this.addLayer('regions_built', 'regions');
			this.addLayer('regions_shared', 'regions');

			layers.get('lines').getSource().on('addfeature', (ev) => {
				this.addLine(ev.feature, this.getLineCoords(ev.feature), { mine : false });
			});

			layers.get('regions').getSource().on('addfeature', (ev) => {
				this.addRegion(ev.feature, this.getRegionCoords(ev.feature), { mine : false });
			});

			layers.get('lines').getSource().getFeatures().forEach((line) => {
				this.addLine(line, this.getLineCoords(line), { mine : false });
			});

			layers.get('regions').getSource().getFeatures().forEach((region) => {
				this.addRegion(region, this.getRegionCoords(region), { mine : false });
			});
		}

		private addLayer<TLayerName extends LayerName>(layerName: TLayerName, layerLike: LayerName) {
			const layer = addLayer(layerName, layerLike);
			layers.set(layerName, layer);
		}

		private initButtons(container: JQuery<HTMLElement>): JQuery<HTMLElement> {
			return $('<div></div>')
				.addClass('builder')
				.appendTo(container);
		}

		private initFeatures(buttonContainer: JQuery<HTMLElement>) {
			const initialStates: BuilderStates = {
				home     : false,
				allLines : true,
				builder  : false,
				undo     : false,
				clear    : false,
				route    : false,
				copy     : false,
				paste    : false,
				help     : true,
			};

			const actions: BuilderActions = {
				home     : this.setHome,
				allLines : this.toggleAllLines,
				builder  : this.toggle,
				undo     : this.undo,
				clear    : this.clear,
				route    : this.printRoute,
				copy     : this.copy,
				paste    : this.paste,
				help     : this.showHelp,
			};

			for (const button of builderButtons) {
				this.features[button] = new BuilderFeature({
					name         : button,
					buttonContainer,
					initialState : initialStates[button],
					action       : actions[button],
					label        : labels.builder.buttons[button],
					builder      : this,
				});
			}
		}

		private initData() {
			this.data = new BuilderData(this);
			this.data.load();
		}

		private initMapClick() {
			const originalMapClick = window.__sbg_variable_map.get().getListeners('click')[0];

			const extendedMapClick = (ev: OlMapClickEvent) => {
				if (this.features.builder.getState()) {
					this.mapClick(ev);
				} else {
					originalMapClick(ev);
				}
			};

			window.__sbg_variable_map.get().un('click', originalMapClick);
			window.__sbg_variable_map.get().on('click', extendedMapClick);
		}

		private mapClick(ev: OlMapClickEvent) {
			window.__sbg_variable_map.get().forEachFeatureAtPixel<'points'>(ev.pixel, async (feature, layer) => {
				console.log(`BUILDER click layer: ${layer.getProperties().name}`);

				if (layer.getProperties().name !== 'points') {
					return;
				}

				const point       = feature;
				const pointCoords = this.getPointCoords(point);
				this.setPointDrawing(point, true);

				if (!this.startPoint) {
					console.log(`BUILDER clicked: start coords: ${JSON.stringify(pointCoords)}`);
					this.startPoint = point;
					return;
				}

				const endPoint = point;

				if (endPoint.getId() === this.startPoint.getId()) {
					return;
				}

				console.log(`BUILDER clicked: end coords: ${JSON.stringify(pointCoords)}`);

				const lineData  = await LineData.load([ this.startPoint, endPoint ], this);
				const lineBuilt = this.buildLine(lineData);

				this.setPointDrawing(this.startPoint, false);
				this.setPointDrawing(endPoint, false);

				if (lineBuilt) {
					this.startPoint = undefined;
				}
			});
		}

		private getNPoints(): number {
			const zoom = window.__sbg_variable_map.get().getView().getZoom();
			if (zoom > 10) {
				return 5;
			}
			if (zoom > 7) {
				return 25;
			}
			return 50;
		}

		private setPointDrawing(point: OlPoint, drawing: boolean) {
			if (drawing) {
				this.pointStyles[point.getId()] = point.getStyle();
				point.setStyle(window.__sbg_variable_FeatureStyles.get().POINT(point.getGeometry().flatCoordinates, this.drawTeam, 1, true));
			} else {
				point.setStyle(this.pointStyles[point.getId()]);
			}
		}

		private initStates() {
			this.toggleAllLines(!this.features.allLines.getState());
			this.toggle(!this.features.builder.getState());
			this.data.updateStates();
		}

		private initHelpPopup() {
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

		private initRoutePopup() {
			const routeElement = $('<textarea></textarea>')
				.on('click', (ev) => ev.stopPropagation())
				.on('keydown', (ev) => ev.stopPropagation());

			createPopup('route').prepend(routeElement);
		}

		private initCopyPaste() {
			$(document).on('keydown', (ev) => {
				if (ev.ctrlKey) {
					switch (ev.key) {
						case 'c':
							return this.data.copy(true);
						case 'v':
							return this.data.paste(true);
					}
				}
			});
		}

		getCoords(flatCoordinates: OlFlatCoordinates): OlCoords {
			const coordsList = window.ol.proj.toLonLat(flatCoordinates);
			return coordsList.map((coord) => parseFloat(coord.toFixed(6))) as typeof coordsList;
		}

		getFlatCoordinates(coords: OlCoords): OlFlatCoordinates {
			return window.ol.proj.fromLonLat(coords);
		}

		getArcFlatCoordinates(coordsList: OlCoords[]): OlFlatCoordinates[] {
			const arcCoords: OlLineCoords[] = [];

			for (let i = 1; i < coordsList.length; i++) {
				const arc = window.turf.greatCircle(coordsList[i - 1], coordsList[i], { npoints : this.getNPoints() });
				arcCoords.push(arc.geometry.coordinates);
			}

			return arcCoords.flat().map((coords) => this.getFlatCoordinates(coords));
		}

		getPointCoords(point: OlPoint): OlCoords {
			const { flatCoordinates } = point.getGeometry();
			return this.getCoords(flatCoordinates);
		}

		getLineCoords(line: OlLine): OlLineCoords {
			const { flatCoordinates } = line.getGeometry();

			const startCoords = this.getCoords([ flatCoordinates[0], flatCoordinates[1] ]);
			const endCoords   = this.getCoords([ flatCoordinates[flatCoordinates.length - 2], flatCoordinates[flatCoordinates.length - 1] ]);

			return this.createLineCoords(startCoords, endCoords);
		}

		getRegionCoords(region: OlRegion): OlRegionCoords {
			const { flatCoordinates } = region.getGeometry();

			const startCoords  = this.getCoords([ flatCoordinates[0], flatCoordinates[1] ]);
			const middleCoords = this.getCoords([ flatCoordinates[flatCoordinates.length * 1 / 3], flatCoordinates[flatCoordinates.length * 1 / 3 + 1] ]);
			const endCoords    = this.getCoords([ flatCoordinates[flatCoordinates.length * 2 / 3], flatCoordinates[flatCoordinates.length * 2 / 3 + 1] ]);

			return this.createRegionCoords(startCoords, middleCoords, endCoords);
		}

		createLineCoords(...coordsList: [OlCoords, OlCoords]): OlLineCoords {
			const sortedCoords = coordsList.sort(function(c1, c2) {
				return c1[0] - c2[0] || c1[1] - c2[1];
			});
			return [ sortedCoords[0], sortedCoords[1] ];
		}

		createRegionCoords(...coordsList: [OlCoords, OlCoords, OlCoords]): OlRegionCoords {
			const sortedCoords = coordsList.sort(function(c1, c2) {
				return c1[0] - c2[0] || c1[1] - c2[1];
			});
			return [ sortedCoords[0], sortedCoords[1], sortedCoords[2], sortedCoords[0] ];
		}

		addLine(line: OlLine, lineCoords: OlLineCoords, { mine }: { mine: boolean }) {
			if (![ this.ownTeam, this.drawTeam ].includes(line.getProperties().team)) {
				return;
			}

			this.linesMap.create(lineCoords[0], []).push({ coords : lineCoords[1], mine });
			this.linesMap.create(lineCoords[1], []).push({ coords : lineCoords[0], mine });
			this.lines.set(lineCoords, line);
			this.checkRegions(lineCoords, { mine });
		}

		addRegion(region: OlRegion, regionCoords: OlRegionCoords, { mine }: { mine: boolean }) {
			if (![ this.ownTeam, this.drawTeam ].includes(region.getProperties().team)) {
				return;
			}

			this.regionsMap.create([ regionCoords[0], regionCoords[1] ], []).push({ region, mine });
			this.regionsMap.create([ regionCoords[0], regionCoords[2] ], []).push({ region, mine });
			this.regionsMap.create([ regionCoords[1], regionCoords[2] ], []).push({ region, mine });
			this.regions.set(regionCoords, region);
		}

		buildLine({ linePoints, lineCoords }: LineData, attempt = 0) {
			const id        = `line.built.${new Date().getTime()}`;
			const layerName = 'lines_built';

			const existingLine = this.lines.get(lineCoords);

			if (existingLine) {
				if (this.features.allLines.getState() || existingLine.getProperties().mine) {
					console.log(`BUILDER buildLine cancelled, already exists, coords: ${JSON.stringify(lineCoords)}`);
					return;
				} else {
					console.log(`BUILDER buildLine duplicated, layer: ${layerName}, coords: ${JSON.stringify(lineCoords)}`);
				}
			} else {
				console.log(`BUILDER buildLine, layer: ${layerName}, attempt: ${attempt}, coords: ${JSON.stringify(lineCoords)}`);
			}

			const arcFlatCoordinates = this.getArcFlatCoordinates(lineCoords);
			const feature            = new window.ol.Feature<'lines'>({ geometry : new window.ol.geom.LineString(arcFlatCoordinates) });
			feature.setId(id);
			feature.setProperties({ team : this.drawTeam, mine : true });
			feature.setStyle(new window.ol.style.Style({
				stroke : new window.ol.style.Stroke({ color : window.__sbg_variable_TeamColors.get()[this.drawTeam].stroke, width : 2 }),
			}));

			const source        = layers.get(layerName).getSource();
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

			this.addLine(feature, lineCoords, { mine : true });
			this.data.add({ linePoints, lineCoords });
			return feature;
		}

		buildRegion(coordsList: [OlCoords, OlCoords, OlCoords], shared: boolean, attempt = 0) {
			const id           = `region.built.${new Date().getTime()}`;
			const layerName    = shared ? 'regions_shared' : 'regions_built';
			const regionCoords = this.createRegionCoords(...coordsList);

			const existingRegion = this.regions.get(regionCoords);

			if (existingRegion) {
				if (!this.features.allLines.getState() && !shared && (!existingRegion.getProperties().mine || existingRegion.getProperties().shared)) {
					console.log(`BUILDER buildRegion duplicated, layer: ${layerName}, coords: ${JSON.stringify(regionCoords)}`);
				} else {
					console.log(`BUILDER buildRegion cancelled, already exists, coords: ${JSON.stringify(regionCoords)}`);
					return;
				}
			} else {
				console.log(`BUILDER buildRegion, layer: ${layerName}, coords: ${JSON.stringify(regionCoords)}`);
			}

			const arcFlatCoordinates = this.getArcFlatCoordinates(regionCoords);
			const feature            = new window.ol.Feature<'regions'>({ geometry : new window.ol.geom.Polygon([ arcFlatCoordinates ]) });
			feature.setId(id);
			feature.setProperties({ team : this.drawTeam, mine : true, shared });
			feature.setStyle(new window.ol.style.Style({
				fill : new window.ol.style.Fill({ color : window.__sbg_variable_TeamColors.get()[this.drawTeam].fill }),
			}));

			const layer         = layers.get(layerName);
			const source        = layer.getSource();
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

			this.addRegion(feature, regionCoords, { mine : true });
			return feature;
		}

		checkRegions(lineCoords: OlLineCoords, { mine }: { mine: boolean }) {
			const startSiblings = this.linesMap.get(lineCoords[0]);
			const endSiblings   = this.linesMap.get(lineCoords[1]);
			if (!startSiblings || !endSiblings) {
				return;
			}

			for (const startSibling of startSiblings) {
				for (const endSibling of endSiblings) {
					if (startSibling.coords[0] === endSibling.coords[0] && startSibling.coords[1] === endSibling.coords[1]) {
						if (mine || startSibling.mine || endSibling.mine) {
							const shared = !(mine && startSibling.mine && endSibling.mine);
							this.buildRegion([ ...lineCoords, startSibling.coords ], shared);
						}
					}
				}
			}
		}

		async setHome(previousState: boolean) {
			if (previousState) {
				if (!confirm(labels.builder.messages.deleteHome.toString())) {
					return false;
				}
				delete localStorage.homeCoords;
			} else {
				if (!confirm(labels.builder.messages.setHome.toString())) {
					return false;
				}
				localStorage.homeCoords = JSON.stringify(window.__sbg_variable_map.get().getView().getCenter());
			}

			return true;
		}

		async toggleAllLines(previousState: boolean) {
			layers.get('lines').setVisible(!previousState);
			layers.get('regions').setVisible(!previousState);
			layers.get('regions_shared').setVisible(!previousState && this.features.builder.getState());

			return true;
		}

		async toggle(previousState: boolean) {
			layers.get('lines_built').setVisible(!previousState);
			layers.get('regions_built').setVisible(!previousState);
			layers.get('regions_shared').setVisible(!previousState && this.features.allLines.getState());

			this.features.builder.setState(!previousState);
			this.data.updateStates();
		}

		async undo(previousState: boolean) {
			if (!previousState) {
				return false;
			}

			const { lineCoords } = this.data.pop() || {};

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

		async clear(previousState: boolean) {
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

		async printRoute(previousState: boolean) {
			if (!previousState) {
				return false;
			}

			const route = this.data.getRoute();
			$('.route.popup').find('textarea').val(route).end().removeClass('hidden');
		}

		async copy(previousState: boolean) {
			return this.data.copy(previousState);
		}

		async paste(previousState: boolean) {
			return this.data.paste(previousState);
		}

		async showHelp(_previousState: boolean) {
			$('.help').removeClass('hidden');
		}
	}

	class BuilderFeature {
		name: string;
		action: BuilderAction;
		private state: { value: boolean };
		button: JQuery<HTMLElement>;

		constructor({ name, action, initialState, label, buttonContainer, builder }: { name: BuilderButtons, buttonContainer: JQuery<HTMLElement>, initialState: boolean, label: BuilderButtonLabel, action: BuilderAction, builder: Builder }) {
			this.name   = name;
			this.action = action.bind(builder);
			this.button = this.createButton(label, buttonContainer);
			this.initState(initialState);
		}

		getState(): boolean {
			return this.state.value;
		}

		setState(value: boolean) {
			this.state.value = value;
		}

		setButtonState() {
			this.button.toggleClass('active', this.state.value);
		}

		private initState(initialState: boolean) {
			const value = this.loadState(initialState);

			this.state = new Proxy<typeof this.state>({ value }, {
				get : (data: typeof this.state, property: keyof typeof this.state): boolean => data[property],
				set : (data: typeof this.state, property: keyof typeof this.state, value: typeof this.state[keyof typeof this.state]): boolean => {
					const storageKey         = this.getStorageKey();
					localStorage[storageKey] = value ? '1' : '0';
					data[property]           = value;
					this.setButtonState();
					return true;
				},
			});

			this.setButtonState();
		}

		private loadState(initialState: boolean): boolean {
			const storageKey   = this.getStorageKey();
			const storageValue = localStorage[storageKey];
			return storageValue === undefined || storageValue.length === 0 ? initialState : storageValue === '1';
		}

		private getStorageKey(): string {
			return `sbg-plus-state-${this.name}`;
		}

		private createButton(label: BuilderButtonLabel, buttonContainer: JQuery<HTMLElement>): JQuery<HTMLElement> {
			const element = $('<button></button>')
				.html(label.title.toString().toUpperCase())
				.attr('title', label.description.toString())
				.appendTo(buttonContainer);

			element.on('click', async () => {
				if (await this.action(this.state.value)) {
					this.state.value = !this.state.value;
				}
			});

			return element;
		}
	}

	class BuilderData {
		private data: LineData[];
		private builder: Builder;
		storageKey = 'builderData';

		constructor(builder: Builder) {
			this.builder = builder;
			this.data    = [];
		}

		add(lineData: LineData) {
			this.data.push(lineData);
			this.updateStates();
			this.save();
		}

		pop(): LineData | undefined {
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

		count(): number {
			return this.data.length;
		}

		updateStates() {
			const isActive = this.builder.features.builder.getState();
			const isData   = this.data.length > 0;

			this.builder.features.undo.setState(isActive && isData);
			this.builder.features.clear.setState(isActive && isData);
			this.builder.features.route.setState(isActive && isData);
			this.builder.features.copy.setState(isActive && isData);
			this.builder.features.paste.setState(isActive);
		}

		save() {
			localStorage[this.storageKey] = JSON.stringify(BuilderData.pack(this.data));
			console.log(`BUILDER saved lines: ${this.data.length}`);
		}

		load() {
			const stored = localStorage[this.storageKey];

			if (stored) {
				this.set(stored);
			}
		}

		private set(text: string): LineData[] | undefined {
			const parsed = this.parse(text);

			if ('error' in parsed) {
				alert(parsed.error.toString());
				return;
			}

			const data = BuilderData.unpack(parsed.pack);

			for (const lineCoords of data) {
				this.builder.buildLine(lineCoords);
			}
		}

		private static pack(data: LineData[]): BuilderDataPack {
			const pointsMap             = new CoordsMap<OlCoords, PointData>();
			const lines: OlLineCoords[] = [];

			for (const { lineCoords, linePoints } of data) {
				lines.push(lineCoords);

				linePoints.forEach((linePoint) => {
					pointsMap.set(linePoint.coords, linePoint);
				});
			}

			return { points : pointsMap.getData(), lines };
		}

		private static unpack(pack: BuilderDataPack): LineData[] {
			const data: LineData[] = [];
			const pointsMap        = new CoordsMap<OlCoords, PointData>(pack.points);

			for (const lineCoords of pack.lines) {
				const points   = [ pointsMap.get(lineCoords[0]), pointsMap.get(lineCoords[1]) ] as [PointData, PointData];
				const lineData = new LineData(points, lineCoords);
				data.push(lineData);
			}

			return data;
		}

		private parse(text: string): { pack: BuilderDataPack} | {error: Label } {
			let pack;

			try {
				pack = JSON.parse(text);
			} catch (ex) {
				return { error : labels.builder.validationErrors.json };
			}

			const validator = new BuilderDataPackValidator(labels.builder.validationErrors);

			if (!validator.validate(pack)) {
				return { error : validator.getError() };
			}

			return { pack };
		}

		async copy(previousState: boolean) {
			if (!previousState) {
				return false;
			}

			await navigator.clipboard.writeText(JSON.stringify(BuilderData.pack(this.data)));
			alert(labels.builder.messages.copied.toString());
		}

		async paste(previousState: boolean) {
			if (!previousState) {
				return false;
			}

			const text = await navigator.clipboard.readText();

			if (!text.trim()) {
				alert(labels.builder.validationErrors.empty.toString());
			}

			this.set(text);
		}

		getRoute(): string {
			return this.data.map((line) => line.linePoints.map((point) => point.title).join(' => ')).join('\n');
		}
	}

	class LineData {
		linePoints: [PointData, PointData];
		lineCoords: OlLineCoords;

		constructor(linePoints: [PointData, PointData], lineCoords: OlLineCoords) {
			this.linePoints = linePoints;
			this.lineCoords = lineCoords;
		}

		static async load(points: [OlPoint, OlPoint], builder: Builder) {
			const promises   = points.map((point) => PointData.resolve(point, builder));
			const linePoints = await Promise.all(promises) as [PointData, PointData];
			const lineCoords = builder.createLineCoords(linePoints[0].coords, linePoints[1].coords);
			return new LineData(linePoints, lineCoords);
		}
	}

	class PointData {
		guid: OlGuid;
		title: string;
		coords: OlCoords;

		private constructor() {}

		static async resolve(point: OlPoint, builder: Builder): Promise<PointData> {
			const pointData  = new PointData();
			pointData.guid   = point.getId();
			pointData.title  = await PointData.getPointTitle(pointData.guid, builder.points);
			pointData.coords = builder.getPointCoords(point);
			return pointData;
		}

		private static async getPointTitle(guid: OlGuid, points: Builder['points']): Promise<string> {
			if (!points[guid]) {
				const { response } = await window.__sbg_function_apiQuery('point', { guid });
				points[guid]       = response.data.t;
			}

			return points[guid];
		}
	}

	type BuilderDataPack = {
		points: Record<string, PointData>;
		lines: OlLineCoords[];
	}

	const validTypeOf = typeof {};
	type ValidTypeOf = typeof validTypeOf;

	class BuilderDataPackValidator {
		private validationErrors: Labels['builder']['validationErrors'];
		private validationError: Label;

		constructor(validationErrors: Labels['builder']['validationErrors']) {
			this.validationErrors = validationErrors;
		}

		validate(pack: unknown): pack is BuilderDataPack {
			return this.checkObject(pack)
				&& this.checkObjectProperties(pack)
				&& this.checkPoints(pack.points)
				&& this.checkPointsCoords(pack.points)
				&& this.checkLines(pack.lines)
				&& this.checkLinesCoords(pack.lines)
			;
		}

		private isObject(obj: any, properties: Record<string, ValidTypeOf>): boolean {
			if (Object.keys(obj).length !== Object.keys(properties).length) {
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

		private isArray(array: any, length: number, type: ValidTypeOf): boolean {
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

		private checkObject(pack: unknown) : pack is object {
			if (typeof pack !== 'object') {
				this.validationError = this.validationErrors.object;
				return false;
			}

			return true;
		}

		private checkObjectProperties(pack: object): pack is { points: any, lines: any } {
			if (!this.isObject(pack, { points : 'object', lines : 'object' })) {
				this.validationError = this.validationErrors.objectProperties;
				return false;
			}

			return true;
		}

		private checkPoints(points: any): points is Record<string, { guid: string; title: string; coords: any }> {
			if (Object.values(points).filter((point) => !this.isObject(point, { guid : 'string', title : 'string', coords : 'object' })).length > 0) {
				this.validationError = this.validationErrors.pointProperties;
				return false;
			}

			return true;
		}

		private checkPointsCoords(points: Record<string, { guid: string; title: string; coords: any }>): points is Record<string, { guid: string; title: string; coords: [number, number] }> {
			if (Object.values(points).map((point) => point.coords).filter((coords) => !this.isArray(coords, 2, 'number')).length > 0) {
				this.validationError = this.validationErrors.pointCoords;
				return false;
			}

			return true;
		}

		private checkLines(lines: any): lines is [any, any][] {
			if (!Array.isArray(lines) || lines.filter((lineCoords) => !this.isArray(lineCoords, 2, 'object')).length > 0) {
				this.validationError = this.validationErrors.lines;
				return false;
			}

			return true;
		}

		private checkLinesCoords(lines: [any, any][]): lines is [[number, number], [number, number]][] {
			if (lines.flat().filter((coords) => !this.isArray(coords, 2, 'number')).length > 0) {
				this.validationError = this.validationErrors.linesCoords;
				return false;
			}

			return true;
		}

		getError() {
			return this.validationError;
		}
	}

	class CoordsMap<K extends OlCoords | OlLineCoords | OlRegionCoords, V> {
		private data: Record<string, V>;

		constructor(data: Record<string, V> = {}) {
			this.data = data;
		}

		private stringifyKey(key: K | string): string {
			return typeof key === 'string'
				? key
				: key.map((item) => Array.isArray(item) ? item.join(',') : item).join(',');
		}

		getData(): Record<string, V> {
			return this.data;
		}

		get(key: K | string): V | undefined {
			return this.data[this.stringifyKey(key)];
		}

		set(key: K | string, value: V) {
			this.data[this.stringifyKey(key)] = value;
		}

		create(key: K | string, initialValue: V): V {
			if (!this.has(key)) {
				this.set(key, initialValue);
			}

			return this.get(key) as V;
		}

		has(key: K | string) {
			return this.stringifyKey(key) in this.data;
		}

		forEach(func: (value: V, key: string) => void) {
			for (const key in this.data) {
				func(this.data[key], key);
			}
		}

		deleteMine(key: K | string) {
			const stringKey = this.stringifyKey(key);
			const item      = this.data[stringKey];

			if (item instanceof window.ol.Feature && item.getProperties().mine) {
				delete this.data[stringKey];
			}

			if (Array.isArray(item)) {
				const others = item.filter((subItem) => !subItem.mine) as V & any[];

				if (others.length === 0) {
					delete this.data[stringKey];
				} else {
					this.data[stringKey] = others;
				}
			}
		}

		clearMine() {
			Object.keys(this.data).forEach((key) => {
				this.deleteMine(key);
			});
		}
	}

	class SettingsPopup {
		private container: JQuery<HTMLElement>;
		private sections = {} as Record<FeatureGroup, JQuery<HTMLElement>>;
		private checkboxes = {} as Record<string, JQuery<HTMLElement>>;

		constructor() {
			this.render();

			Object.keys(features.groups).map((group: FeatureGroup) => {
				const groupFeatures = features.groups[group].filter((feature) => feature.isAvailable());

				if (groupFeatures.length === 0 && group !== 'custom') {
					return;
				}

				this.addGroup(group);
				groupFeatures.map((feature) => this.addFeature(feature));
			});

			features.on('add', (feature) => this.addFeature(feature), {});
			features.on('check', ({ feature, value }) => this.check(feature, value), {});
		}

		private render() {
			const parentSettingsPopup = $('.settings');
			const settingsPopup       = createPopup('sbg-plus-settings', { roundClose : false }).appendTo(parentSettingsPopup);
			this.container            = $('<div></div>').addClass('settings-content');

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
					copyLogs();
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

		private addGroup(group: FeatureGroup) {
			const featureGroup   = featureGroups[group];
			const sectionTitle   = $('<h4></h4>').text(new Label(featureGroup).toString());
			const section        = $('<div></div>').addClass('settings-section').append(sectionTitle);
			this.sections[group] = section;
			this.container.append(section);
		}

		addFeature(feature: AnyFeatureBase) {
			const checkbox = this.renderFeatureCheckbox(feature);
			const setting  = this.renderSetting(feature.isSimple(), checkbox, feature.label);
			this.sections[feature.group].find('h4').before(setting);
			this.checkboxes[feature.key] = checkbox;
		}

		check(feature: AnyFeatureBase, value: boolean) {
			settings.setFeature(feature.key, value);
			this.checkboxes[feature.key].prop('checked', value);
		}

		private renderSetting(isSimple: boolean, ...children: Array<Label | JQuery<HTMLElement>>) {
			const settingLabel = $('<label></label>').addClass('settings-section__item').toggleClass('simple', isSimple);

			for (const child of children) {
				const element = child instanceof Label ? $('<span></span>').text(child.toString()) : child;
				settingLabel.append(element);
			}

			return settingLabel;
		}

		private renderFeatureCheckbox(feature: AnyFeatureBase) {
			return ($('<input type="checkbox" />') as JQuery<HTMLInputElement>)
				.prop('checked', feature.isEnabled())
				.on('change', (ev) => {
					feature.setEnabled(ev.target.checked);
				});
		}
	}

	main();
})();
