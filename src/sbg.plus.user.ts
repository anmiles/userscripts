// ==UserScript==
// @name           SBG plus
// @namespace      sbg
// @version        0.9.86
// @updateURL      https://anmiles.net/userscripts/sbg.plus.user.js
// @downloadURL    https://anmiles.net/userscripts/sbg.plus.user.js
// @description    Extended functionality for SBG
// @description:ru Расширенная функциональность для SBG
// @author         Anatoliy Oblaukhov
// @match          https://sbg-game.ru/app/*
// @run-at         document-start
// @grant          none
// ==/UserScript==

/* eslint-disable camelcase -- allow snake_case for __sbg variables and let @typescript-eslint/naming-convention cover other cases */
window.__sbg_plus_version = '0.9.86';

interface Window {
	[key: `__sbg_${string}_original`] : string;
	[key: `__sbg_${string}_modified`] : string;

	ol        : Ol;
	turf      : Turf;
	Splide?   : Splide;
	Toastify? : Toastify;
	i18next   : I18Next;

	Feature     : unknown;
	setCSS      : (css: string) => void;
	cuiStatus   : 'loaded' | 'loading';
	cuiEmbedded : boolean | undefined;

	DeviceOrientationEvent: {
		prototype         : DeviceOrientationEvent;
		requestPermission : () => Promise<'denied' | 'granted'>;
		new(type: string, eventInitDict?: DeviceOrientationEvent): DeviceOrientationEvent;
	};

	__sbg_local                     : boolean;
	__sbg_preset                    : unknown;
	__sbg_urls                      : Urls;
	__sbg_language                  : Lang;
	__sbg_plus_version              : string;
	__sbg_plus_localStorage_watcher : unknown;
	__sbg_plus_modifyFeatures       : ((...args: unknown[]) => void) | undefined;
	__sbg_plus_animation_duration   : number;
	__sbg_onerror_handlers          : Array<NonNullable<typeof window.onerror>>;
	__sbg_debug_object              : (message: string, obj: Record<string, unknown>) => void;

	__sbg_share: {
		open     : (url: string) => boolean;
		navigate : (coords: OlCoordsString) => boolean;
	};

	__sbg_variable_draw_slider       : ReadableVariable<Splide>;
	__sbg_variable_FeatureStyles     : ReadableVariable<OlFeatureStyles>;
	__sbg_variable_is_dark           : ReadableVariable<boolean>;
	__sbg_variable_ItemTypes         : ReadableVariable<string[]>;
	__sbg_variable_map               : ReadableVariable<OlMap>;
	__sbg_variable_self_data         : WritableVariable<SelfData>;
	__sbg_variable_TeamColors        : ReadableVariable<OlTeamColors>;
	__sbg_variable_temp_lines_source : ReadableVariable<OlSource>;
	__sbg_variable_units             : ReadableVariable<Array<[RegExp, string]>>;
	__sbg_variable_VERSION           : ReadableVariable<string>;

	__sbg_function_apiQuery            : ApiQuery;
	__sbg_function_drawLeaderboard     : () => Promise<void>;
	__sbg_function_deleteInventoryItem : (parent: JQuery) => Promise<void>;
	__sbg_function_jquerypassargs      : (container: JQuery, template: string, ...elements: Array<JQuery | string>) => JQuery;
	__sbg_function_manageDrawing       : (event: SplideEvent) => void;
	__sbg_function_openProfile         : (data: JQuery.Event | OlGuid) => Promise<void>;
	__sbg_function_showInfo            : (data: OlGuid   | undefined) => void;
	__sbg_function_takeUnits           : (value: number) => [string, string];
	__sbg_function_timeToString        : (seconds: number) => string;

	__sbg_cui_variable_USERSCRIPT_VERSION : ReadableVariable<string>;
	__sbg_cui_variable_config             : ReadableVariable<CUIConfig>;

	__sbg_cui_function_main           : () => Promise<void>;
	__sbg_cui_function_olInjection    : () => void;
	__sbg_cui_function_loadMainScript : () => void;
	__sbg_cui_function_createToast    : (content?: string, position?: string, duration?: number, className?: string, oldestFirst?: boolean) => Toast;
	__sbg_cui_function_getNotifs      : <TLatest extends number | undefined, TResult = TLatest extends number ? number : Notif[]>(latest: TLatest) => TResult;
}

interface EventTarget {
	__events                  : Record<string, EventListeners>;
	getEventListeners         : (type: string) => EventListenerOrEventListenerObject[];
	getEventHandlers          : <T = EventListener>(type: string) => T[];
	clearEventListeners       : (type: string, sealed: boolean) => void;
	addOnlyEventListener      : EventTarget['addEventListener'];
	addRepeatingEventListener: <TEvent extends Event>(
		type: string,
		callback: (ev: TEvent) => void,
		options: {
			repeats : number;
			timeout : number;
			tick?   : (ev: TEvent, iteration: number) => void;
			filter? : (ev: TEvent) => boolean;
			cancel? : (ev: TEvent) => boolean;
		},
	) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- declaration merging
interface WindowEventMap {
	'deviceorientationabsolute' : DeviceOrientationEvent;
}

interface DeviceOrientationEvent {
	webkitCompassHeading : number | null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- declaration merging
interface Object {
	typedKeys    : <K extends string, V>(obj: Record<K, V>, allKeys: string[] | readonly string[]) => K[];
	typedEntries : <K extends string, V>(obj: Record<K, V>, allKeys: string[] | readonly string[]) => [K, V][];
}

Object.typedKeys = <K extends string, V>(obj: Record<K, V>, allKeys: string[] | readonly string[]): K[] => {
	function isOwnKey(key: number | string | symbol): key is K {
		return allKeys.includes(String(key));
	}

	return Object.keys(obj).filter<K>(isOwnKey);
};

Object.typedEntries = <K extends string, V>(
	obj: Record<K, V>,
	allKeys: string[] | readonly string[],
): [K, V][] => Object
	.typedKeys(obj, allKeys)
	.map((key) => [ key, obj[key] ]);

type EventTargetWithEventType<TEventType extends string> = EventTarget & {
	__events : Record<TEventType, EventListeners>;
};

interface EventListeners {
	listeners : EventListenerOrEventListenerObject[];
	sealed    : boolean;
}

type CustomTouchEvent = (data: { touches : TouchEvent['touches'] }) => void;

interface Ol {
	Map    : OlMap;
	View   : OlView;
	proj   : OlProj;
	source: {
		Vector : new () => OlSource;
	};
	layer: {
		Vector : new<TLayerName extends LayerName>({ source, className }: {
			source    : OlSource;
			className : `ol-layer__${TLayerName}`;
		}) => OlLayer;
	};
	Feature : new ({ geometry }: { geometry : OlGeometry }) => OlFeature;
	geom: {
		LineString : new (flatCoordinates: OlFlatCoordinates[]) => OlGeometry;
		Polygon    : new (flatCoordinates: OlFlatCoordinates[][]) => OlGeometry;
		Circle     : new (flatCoordinates: OlFlatCoordinates[], radius: number) => OlGeometry;
	};
	format: {
		GeoJSON : new () => OlFormat;
	};
	style: {
		Style  : new (styles: OlStyles) => OlStyle;
		Fill   : new (fillStyle: { color : string }) => OlFill;
		Stroke : new (strokeStyle: { color : string; width : number }) => OlStroke;
	};
}

interface OlMap {
	addLayer              : (layer: OlLayer) => void;
	getAllLayers          : () => OlLayer[];
	getView               : () => OlView;
	forEachFeatureAtPixel : (pixel: OlPixel, callback: (feature: OlFeature, layer: OlLayer) => void) => void;
	getListeners          : <TEventType extends OlMapEventType>(eventName: TEventType) => Array<OlMapEventListener<TEventType>>;
	on                    : <TEventType extends OlMapEventType>(eventName: TEventType, listener: OlMapEventListener<TEventType>) => void;
	un                    : <TEventType extends OlMapEventType>(eventName: TEventType, listener: OlMapEventListener<TEventType>) => void;
}

const layerNames = [ 'base', 'highlights', 'lines_built', 'lines_temp', 'lines', 'points', 'regions_built', 'regions_shared', 'regions', 'temp_lines' ] as const;
type LayerName = typeof layerNames[number];

type OlLayer = OlObject<true> & {
	getSource  : () => OlSource;
	setVisible : (visible: boolean) => void;
};

interface OlSource {
	addFeature    : (feature: OlFeature) => void;
	removeFeature : (feature: OlFeature) => void;
	getFeatures   : () => OlFeature[];
	clear         : (fast?: boolean) => void;
	on            : <T extends OlSourceEventName>(eventName: T, handler: (...args: OlSourceEvents[T][]) => void) => void;
}

type OlFeature = OlObject<false> & {
	getGeometry : () => OlGeometry;
	getId       : () => OlGuid;
	setId       : (id: OlGuid) => void;
	getStyle    : () => OlStyle;
	setStyle    : (style: OlStyle) => void;
};

interface OlFeatureStyles {
	TEXT  : (text: string) => OlStyle;
	POINT : (pos: OlFlatCoordinates, team: Team, energy: number, light: boolean | number) => OlStyle;
}

type OlTeamColors = Array<{
	fill   : `#${string}`;
	stroke : `#${string}`;
}>;

type TProperties<TLayer extends boolean> = TLayer extends true
	? OlLayerProperties
	: OlFeatureProperties;

interface OlObject<TLayer extends boolean> {
	getProperties : () => TProperties< TLayer>;
	setProperties : (properties: Partial<TProperties<TLayer>>, silent?: true) => void;
}

interface OlLayerProperties {
	name   : string | undefined;
	zIndex : number;
}

interface OlFeatureProperties {
	team   : Team;
	mine   : boolean;
	shared : boolean;
}

interface OlGeometry {
	flatCoordinates : OlFlatCoordinates;
}

type OlFlatCoordinates = number[];
type OlCoords = [number, number];
type OlLineCoords = [OlCoords, OlCoords];
type OlRegionCoords = [OlCoords, OlCoords, OlCoords, OlCoords];
type OlCoordsString = `${OlCoords[0]},${OlCoords[1]}`;

type OlGuid = string;
type Team = 0 | 1 | 2 | 3 | 4;

/* eslint-disable @typescript-eslint/no-empty-interface -- interfaces for compatibility */
interface OlFill {}
interface OlStroke {}
interface OlStyle {}
interface OlPixel {}
/* eslint-enable @typescript-eslint/no-empty-interface */

interface OlStyles {
	fill?   : OlFill;
	stroke? : OlStroke;
}

type OlSourceEventName = 'addfeature';
interface OlSourceEvents {
	addfeature: {
		feature : OlFeature;
	};
}

type OlView = MapView<OlCoords> & {
	prototype : OlView;
	animate   : (...args: Array<Record<'duration', number>>) => void;
};

type OlMapEventType = 'click' | 'moveend' | 'movestart' | 'pointerdrag';
type OlMapEventListener<TMapEventType extends OlMapEventType> = (ev: OlMapEvents[TMapEventType]) => void;

interface OlMapEvents {
	click       : OlMapClickEvent;
	movestart   : OlMapEvent;
	moveend     : OlMapEvent;
	pointerdrag : OlMapEvent;
}

type OlMapClickEvent = OlMapEvent & {
	pixel : OlPixel;
};

interface OlMapEvent {
	target : OlMap;
}

interface OlProj {
	fromLonLat : (coords: OlCoords) => OlFlatCoordinates;
	toLonLat   : (flatCoordinates: OlFlatCoordinates) => OlCoords;
}

interface OlFormat {
	readFeature : (arc: Arc) => OlFeature;
}

interface Arc {
	geometry: {
		coordinates : OlLineCoords;
	};
}

interface Turf {
	greatCircle : (coord1: OlCoords, coord2: OlCoords, options: { npoints : number }) => Arc;
}

interface MapView<TCoords extends [number, number]> {
	getZoom   : () => number;
	setZoom   : (zoom: number) => void;
	getCenter : () => TCoords;
	setCenter : (coords: TCoords) => void;
}

interface Splide {
	defaults?: {
		speed : number;
	};
	go : (index: number) => void;
	on : (type: string, handler: (event: SplideEvent) => void) => void;
}

interface SplideEvent {
	index : number; slide : HTMLElement;
}

interface ToastifyOptions {
	text          : string;
	duration      : number;
	forceDuration : boolean;
	gravity       : 'bottom' | 'top';
	position      : 'center' | 'left' | 'right';
	className     : string;
}

interface Toastify {
	(options: ToastifyOptions): Toastify;
	showToast : () => void;
	prototype: {
		init : (options: ToastifyOptions) => void;
	};
}

interface I18Next {
	t          : (key: string, data?: unknown) => string;
	translator : unknown;
}

interface Toast {
	options: {
		id           : number;
		selector     : HTMLElement;
		toastElement : HTMLElement;
		close        : boolean;
		callback     : () => void;
		onClick      : () => void;
	};
}

const urlTypes = [ 'desktop', 'mobile', 'script', 'intel', 'cui', 'eui' ] as const;

type UrlType = typeof urlTypes[number];

type Urls = Record<UrlType, {
	local  : string;
	remote : string;
}>;

const langs = [ 'ru', 'en' ] as const;

type Lang = typeof langs[number];

type Level = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

type CUIPointHighlighting =
	'cores' | 'fav' | 'highlevel' | 'off' | 'ref' | 'uniqc' | 'uniqv';

interface CUIConfig {
	maxAmountInBag: {
		cores      : Record<Level, number>;
		catalysers : Record<Level, number>;
		references : { allied : number; hostile : number };
	};
	autoSelect: {
		deploy  : 'max' | 'min' | 'off';
		upgrade : 'max' | 'min' | 'off';
		attack  : 'latest' | 'max';
	};
	mapFilters: {
		invert        : number;
		hueRotate     : number;
		brightness    : number;
		grayscale     : number;
		sepia         : number;
		blur          : number;
		branding      : 'custom' | 'default';
		brandingColor : string;
	};
	tinting: {
		map     : 0 | 1;
		point   : 'level' | 'off' | 'team';
		profile : 0 | 1;
	};
	vibration: {
		buttons       : 0 | 1;
		notifications : 0 | 1;
	};
	ui: {
		doubleClickZoom       : 0 | 1;
		pointBgImage          : 0 | 1;
		pointBtnsRtl          : 0 | 1;
		pointBgImageBlur      : 0 | 1;
		pointDischargeTimeout : 0 | 1;
		speedometer           : 0 | 1;
	};
	pointHighlighting: {
		inner            : CUIPointHighlighting;
		outer            : CUIPointHighlighting;
		outerTop         : CUIPointHighlighting;
		outerBottom      : CUIPointHighlighting;
		text             : 'energy' | 'level' | 'lines' | 'off' | 'refsAmount';
		innerColor       : string;
		outerColor       : string;
		outerTopColor    : string;
		outerBottomColor : string;
	};
	drawing: {
		minDistance : number;
		maxDistance : number;
	};
	notifications: {
		status   : 'all' | 'fav' | 'off';
		onClick  : 'close' | 'jumpto';
		interval : number;
		duration : number;
	};
}

interface SelfData {
	g  : string;
	l  : number;
	n  : string;
	t  : number;
	td : boolean;
	x  : number;
}

interface Notif {
	id : number;
	g  : string;
	na : string;
	ta : number;
	ti : string;
	c  : OlCoords;
	t  : string;
}

interface InventoryItem {
	g : string;
	a : number;
	t : number;
}

interface ReadableVariable<T> {
	get : () => T;
}
type WritableVariable<T> = ReadableVariable<T> & { set : (value: T) => void };

type ApiQueryType = 'point' | 'profile';

type ApiQuery = <T extends ApiQueryType>(kind: T, data: { guid : OlGuid }) => Promise<ApiResponse<ApiData[T]>>;

interface ApiResponse<T> {
	response : { data : T };
}

interface ApiData {
	point   : ApiPointData;
	profile : ApiProfileData;
}

interface ApiPointData {
	t : string;
}

type ApiProfileData = Record<string, number> & {
	name  : string;
	team  : Team;
	level : number;
};

(function() {
	interface EventWatcherListenerOptions {
		once?     : boolean;
		previous? : boolean;
	}

	interface EventWatcherListener<TEventData, TListenerOptions extends EventWatcherListenerOptions> {
		handler         : (eventData: TEventData) => void;
		enabled         : boolean;
		listenerOptions : TListenerOptions;
	}

	interface EventWatcherEvent<TEventData, TEventOptions = void> {
		eventData    : TEventData;
		eventOptions : TEventOptions;
	}

	abstract class EventWatcher<
		TEventTypes extends string,
		TEventDataTypes extends Record<TEventTypes, unknown>,
		TEventOptions = void,
		TListenerOptions extends EventWatcherListenerOptions & TEventOptions = EventWatcherListenerOptions & TEventOptions,
	> {
		protected eventTypes : readonly TEventTypes[];
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
			this.eventTypes = eventTypes;
			this.listeners  = {} as typeof this.listeners;
			this.events     = {} as typeof this.events;

			this.eventTypes.map((eventType) => {
				this.events[eventType]    = [];
				this.listeners[eventType] = [];
			});

			this.watch();
		}

		emit<TEventType extends TEventTypes>(
			eventType: TEventType,
			eventData: TEventDataTypes[TEventType],
			eventOptions: TEventOptions,
		): typeof this {
			this.trigger(this.listeners[eventType], { eventData, eventOptions });
			this.events[eventType].push({ eventData, eventOptions });
			return this;
		}

		on<TEventType extends TEventTypes>(
			eventType: TEventType,
			handler: (eventData: TEventDataTypes[TEventType]) => void,
			listenerOptions: TListenerOptions,
		): typeof this {
			const listener = { handler, listenerOptions, enabled : true };
			this.listeners[eventType].push(listener);

			if (listenerOptions.previous) {
				this.events[eventType].map(({ eventData, eventOptions }) => {
					this.trigger([ listener ], { eventData, eventOptions });
				});
			}

			return this;
		}

		off<TEventType extends TEventTypes>(
			eventType: TEventType,
			eventOptions?: TEventOptions,
		): typeof this {
			this.filter(this.listeners[eventType], { eventOptions }).map((listener) => {
				listener.enabled = false;
			});

			return this;
		}

		protected filter<TEventType extends TEventTypes>(
			listeners: typeof this.listeners[TEventType],
			_filterData: {
				eventOptions? : TEventOptions;
			},
		): typeof this.listeners[TEventType] {
			return listeners;
		}

		protected isMatchEventOptions<TEventType extends TEventTypes>(
			_listener: EventWatcherListener<TEventDataTypes[TEventType], TListenerOptions>,
			_eventOptions: TEventOptions,
		): boolean {
			return true;
		}

		private trigger<TEventType extends TEventTypes>(
			listeners: typeof this.listeners[TEventType],
			{ eventData, eventOptions }: {
				eventData    : TEventDataTypes[TEventType];
				eventOptions : TEventOptions;
			},
		): void {
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

		protected abstract watch(): void;
	}

	const consoleWatcherEventTypes = [ 'log', 'warn', 'error', 'info', 'debug', 'trace' ] as const;

	interface ConsoleWatcherEventDataTypes {
		log   : { message : string };
		warn  : { message : string };
		error : { message : string };
		info  : { message : string };
		debug : { message : string };
		trace : { message : string };
	}

	class ConsoleWatcher extends EventWatcher<
		typeof consoleWatcherEventTypes[number],
		ConsoleWatcherEventDataTypes,
		EventWatcherListenerOptions
	> {
		constructor() {
			super(consoleWatcherEventTypes);
		}

		protected override watch(): void {
			consoleWatcherEventTypes.map((eventType) => {
				((originalMethod, originalError) => {
					console[eventType] = (...args: unknown[]) => {
						const isError = eventType === 'error' || args.filter((arg) => arg instanceof Error).length > 0;
						const lines   = args.map((arg) => arg instanceof Error
							? [ arg.message, arg.stack ].join('\n')
							: !arg
								? ((arg) => {
									console.error('null argument', { arg, args });
									return 'null';
								})(arg)
								: stringify(arg, 'string'));
						(isError ? originalError : originalMethod).call(console, ...args);
						this.emit(isError ? 'error' : eventType, { message : lines.map((line) => line.trim()).join('\n') }, {});
					};
				})(console[eventType], console.error);
			});
		}
	}

	const consoleWatcher = new ConsoleWatcher();
	const logs           = [] as string[];
	const logParts       = [ 'time', 'eventType', 'message' ] as const;

	interface LogBuilderPart {
		enabled : boolean;
		format  : (eventType: typeof consoleWatcherEventTypes[number], message: string) => string;
	}

	const logBuilder: Record<typeof logParts[number], LogBuilderPart> = {
		time : {
			enabled : false,
			format  : () => getLogDate(),
		},
		eventType : {
			enabled : false,
			format  : (eventType, _message) => eventType === 'error' ? 'ERROR' : eventType,
		},
		message : {
			enabled : true,
			format  : (_eventType, message) => message,
		},
	} as const;

	function getLogDate(): string {
		const date = new Date();
		const time = [ date.getHours(), date.getMinutes(), date.getSeconds() ].map((value) => value.toString().padStart(2, '0')).join('.');
		return `${time}:${date.getMilliseconds()}`;
	}

	consoleWatcherEventTypes.map((eventType) => {
		consoleWatcher.on(eventType, ({ message }) => {
			const parts = logParts.filter((logPart) => logBuilder[logPart].enabled).map((logPart) => logBuilder[logPart].format(eventType, message));
			const line  = parts.join(' ');
			logs.push(line);

			if (eventType === 'error' && window.__sbg_preset === 'full') {
				alert(line);
			}
		}, {});
	});

	const stringifyModes = [ 'json', 'keys', 'string' ] as const;

	function stringify(obj: unknown, mode : typeof stringifyModes[number]): string {
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

	window.__sbg_debug_object = (message: string, obj: Record<string, unknown>, mode : 'json' | 'keys' | 'string' = 'json') => {
		const stack = new Error().stack?.replace(/^Error/, '');
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

	window.onerror = function(event, source, lineno, colno, error) {
		window.__sbg_onerror_handlers.forEach((handler) => {
			handler(event, source, lineno, colno, error);
		});

		return true;
	};

	console.log(`SBG plus, version ${window.__sbg_plus_version}`);
	console.log(`started at ${new Date().toISOString()}`);
	console.log(`userAgent: ${navigator.userAgent}`);

	interface Labels {
		save     : Label;
		close    : Label;
		ymaps    : Label;
		settings: {
			title    : Label;
			button   : Label;
			version  : Label;
			logs     : Label;
			advanced : Label;
		};
		toasts: {
			back               : Label;
			logs               : Label;
			cuiUpdated         : Label;
			localWarning       : Label;
			noGeoApp           : Label;
			noLayer            : Label;
			featureSwitchedOff : Label;
		};
		builder: {
			buttons  : Record<BuilderButtons, BuilderButtonLabel>;
			messages: {
				setHome    : Label;
				deleteHome : Label;
				copied     : Label;
			};
			issues: {
				title : Label;
				list  : Label[];
			};
			help: {
				title   : Label;
				buttons : Label;
			};
			validationErrors: {
				json             : Label;
				empty            : Label;
				object           : Label;
				objectProperties : Label;
				pointProperties  : Label;
				pointCoords      : Label;
				lines            : Label;
				linesCoords      : Label;
				unknownError     : Label;
			};
		};
	}

	interface BuilderButtonLabel {
		title : Label; description : Label;
	}

	const builderButtons = [ 'home', 'allLines', 'builder', 'undo', 'clear', 'route', 'copy', 'paste', 'help' ] as const;
	type BuilderButtons = typeof builderButtons[number];
	type BuilderAction = (previousState: boolean) => boolean | undefined;
	type BuilderActions = Record<BuilderButtons, BuilderAction>;
	type BuilderStates = Record<BuilderButtons, boolean>;
	type BuilderFeatures = Record<BuilderButtons, BuilderFeature>;

	type LabelValues = Record<Lang, string>;

	class Label {
		constructor(
			public values: LabelValues,
		) {
		}

		format(data: Record<string, Label | string>): Label {
			const formattedLabel = new Label({ ... this.values });

			for (const lang of langs) {
				formattedLabel.values[lang] = formattedLabel.values[lang].replace(/\$\{(.+?)\}/g, (_, key: string) => {
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
			localWarning : new Label({
				ru : 'ВНИМАНИЕ!\nВы используете тестовую версию.\nВсе обновления скриптов отключены.\nОбратитесь на форум за стабильной версией приложения.',
				en : 'WARNING!\nYou are using a test version.\nAll script updates are off.\nRefer to forums for a stable version.',
			}),
			noGeoApp : new Label({
				ru : 'Не найдено ни одного приложения карт. Координаты скопированы в буфер обмена.',
				en : 'Maps application is not found. Coordinates has been copied to the clipboard.',
			}),
			noLayer : new Label({
				ru : 'Слой ${layerName} не существует',
				en : 'Layer ${layerName} does not exist',
			}),
			featureSwitchedOff : new Label({
				ru : '${label} временно не работает и отключён до исправления его автором',
				en : '${label} is temporarily broken and disabled until fixing by its author',
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
				unknownError : new Label({
					ru : 'Причина ошибки неизвестна: ошибка произошла до определения возможных причин',
					en : 'Error reason is unknown: the error ocurred before defining possible reasons',
				}),
			},
		},
	};

	console.log('created labels');

	class Settings {
		private readonly storageKey = 'sbg-plus-settings';
		private readonly features : Map<string, boolean>;

		constructor() {
			try {
				const str = localStorage.getItem(this.storageKey);

				const savedFeatures = str
					? jsonSelect<Record<string, boolean>>(str, [ 'features' ])
					: {};

				this.features = new Map(Object.typedEntries(savedFeatures, Object.keys(savedFeatures)));
			} catch {
				this.features = new Map();
			}
		}

		getFeature(featureKey: string): boolean | undefined {
			return this.features.get(featureKey);
		}

		setFeature(featureKey: string, value: boolean): this {
			this.features.set(featureKey, value);
			return this;
		}

		cleanupFeatures(): void {
			const featureKeys = Object.keys(features.keys);

			Object.keys(this.features)
				.filter((key) => !featureKeys.includes(key))
				.forEach((key) => {
					this.features.delete(key);
				});
		}

		save(): void {
			const json = {} as Record<string, unknown> & {
				features : Record<string, boolean>;
			};

			json.features = Object.fromEntries(this.features);
			const str     = JSON.stringify(json);
			localStorage.setItem(this.storageKey, str);
		}
	}

	const settings = new Settings();

	console.log('created settings');

	const featureGroupNames = [ 'scripts', 'base', 'cui', 'eui', 'animations', 'toolbar', 'fire', 'inventory', 'leaderboard', 'info', 'buttons', 'draw', 'other', 'custom', 'tests' ] as const;

	const featureGroups: Record<typeof featureGroupNames[number], LabelValues> = {
		scripts     : { ru : 'Скрипты', en : 'Scripts' },
		base        : { ru : 'Основные настройки', en : 'Basic settings' },
		cui         : { ru : 'Скрипт Николая', en : 'Nicko script' },
		eui         : { ru : 'Скрипт Егора', en : 'Egor script' },
		animations  : { ru : 'Анимации', en : 'Animations' },
		toolbar     : { ru : 'Боковая панель', en : 'Toolbar' },
		fire        : { ru : 'Атака', en : 'Fire' },
		inventory   : { ru : 'Инвентарь', en : 'Inventory' },
		leaderboard : { ru : 'Лидеры', en : 'Leaderboard' },
		info        : { ru : 'Информация о точке', en : 'Point info' },
		buttons     : { ru : 'Кнопки', en : 'Buttons' },
		draw        : { ru : 'Рисование', en : 'Draw' },
		other       : { ru : 'Прочие настройки', en : 'Other settings' },
		custom      : { ru : 'Мои настройки', en : 'My settings' },
		tests       : { ru : 'Тесты', en : 'Tests' },
	} as const;

	const featureTriggers = [ '', 'pageLoad', 'cuiTransform', 'mapReady', 'fireClick' ] as const;

	type FeatureGroup = keyof typeof featureGroups;
	type FeatureTrigger = typeof featureTriggers[number];

	interface FeatureParent {
		dependency : 'all' | 'any';
	}

	interface FeatureParents {
		parent     : FeatureBase<never>;
		dependency : 'all' | 'any';
	}

	interface FeatureOptions {
		group      : FeatureGroup;
		trigger    : FeatureTrigger;
		broken?    : boolean;
		public?    : boolean;
		simple?    : boolean;
		desktop?   : boolean;
		unchecked? : boolean | (() => boolean);
		parent?    : FeatureParent;
	}

	abstract class FeatureBase<TData> {
		readonly kind              : 'feature' | 'transformer';
		key                        : string;
		label                      : Label;
		group                      : FeatureGroup;
		trigger                    : FeatureTrigger;
		broken                     : boolean;
		parent?                    : FeatureParent;
		private readonly public    : boolean;
		private readonly simple    : boolean;
		private readonly desktop   : boolean;
		private readonly unchecked : boolean | (() => boolean);
		private toggleValue = false;

		abstract func: ((data: TData) => void);

		constructor(
			kind: 'feature' | 'transformer',
			key: string,
			labelValues: LabelValues,
			options : FeatureOptions,
		) {
			this.kind  = kind;
			this.key   = key;
			this.label = new Label(labelValues);

			this.group   = options.group;
			this.trigger = options.trigger;

			this.broken    = options.broken ?? false;
			this.public    = options.public ?? false;
			this.simple    = options.simple ?? false;
			this.desktop   = options.desktop ?? false;
			this.unchecked = options.unchecked ?? false;

			features.add(this, options);
		}

		setEnabled(value: boolean): void {
			settings.setFeature(this.key, value);
			features.inherit(this, value);
		}

		isEnabled(allowBroken = false): boolean {
			return (!this.broken || allowBroken) && (this.isExplicitlyEnabled() ?? this.isImplicitlyEnabled());
		}

		isExplicitlyEnabled(): boolean | undefined {
			return settings.getFeature(this.key);
		}

		isImplicitlyEnabled(): boolean {
			return this.isAvailable() && this.isIncluded(this.getPreset()) && !(typeof this.unchecked === 'function' ? this.unchecked() : this.unchecked);
		}

		isAvailable(): boolean {
			const lastUsername = localStorage.getItem('sbg-plus-last-username');

			return (
				isMobile()
				|| this.desktop
			) && (
				this.public
				|| !!lastUsername && (protectedFeatures[lastUsername]?.includes(this) ?? false)
				|| this.getPreset() === 'full'
				|| !!localStorage.getItem('sbg-plus-test-mode')
			);
		}

		isSimple(): boolean {
			return this.simple;
		}

		toggle(value = !this.toggleValue): boolean {
			const attributeKey = `data-feat-${this.key}`;
			this.toggleValue   = value;

			if (value) {
				document.body.setAttribute(attributeKey, '');
			} else {
				document.body.removeAttribute(attributeKey);
			}

			features.emit('toggle', { feature : this, value }, {});
			return value;
		}

		exec(data: TData): void {
			if (!this.isEnabled()) {
				console.log(`skipped ${this.key}`);
				return;
			}

			try {
				this.func(data);
				this.toggle(true);
				console.log(`executed ${this.key}`);
			} catch (ex) {
				console.error(`failed ${this.key}`, ex);
			}
		}

		private isIncluded(presetName: unknown): boolean {
			const preset = isPreset(presetName)
				? presets[presetName]
				: presets.browser;

			return preset.length === 0 || preset.includes(this);
		}

		private getPreset(): unknown {
			return window.__sbg_preset;
		}
	}

	class Feature<TRequiredElement = never> extends FeatureBase<TRequiredElement | undefined> {
		override func              : (el: TRequiredElement | undefined) => void;
		private readonly requires? : () => TRequiredElement | undefined;

		constructor(
			func: (required: TRequiredElement) => void,
			labelValues: LabelValues,
			options : FeatureOptions & {
				requires? : () => TRequiredElement | undefined;
			},
		) {
			const wrapper = (): void => {
				const el = this.getElement();

				if (el) {
					func(el);
				}
			};

			super('feature', func.name, labelValues, options);
			this.func     = wrapper;
			this.requires = options.requires;
		}

		private getElement(): TRequiredElement | undefined {
			if (this.requires) {
				const required = this.requires();

				if (!required || typeof required === 'object' && 'length' in required && required.length === 0) {
					throw new Error('requirement not met');
				}

				return required;
			}

			return {} as TRequiredElement;
		}
	}

	window.Feature = Feature;

	class Transformer extends FeatureBase<Script> {
		func : (script: Script) => void;

		constructor(
			func: (script: Script) => void,
			labelValues: LabelValues,
			options : FeatureOptions,
		) {
			super('transformer', func.name, labelValues, options);
			this.func = func;
		}
	}

	// function isFeature(feature: FeatureBase<never>): feature is Feature {
	// 	return feature.kind === 'feature';
	// }

	function isTransformer(feature: FeatureBase<never>): feature is Transformer {
		return feature.kind === 'transformer';
	}

	const featuresEventTypes = [
		'add',
		'inherit',
		'toggle',
	] as const;

	interface FeaturesEventDataTypes {
		add     : FeatureBase<never>;
		inherit : { feature : FeatureBase<never>; value : boolean };
		toggle  : { feature : FeatureBase<never>; value : boolean };
	}

	class Features extends EventWatcher<
		typeof featuresEventTypes[number],
		FeaturesEventDataTypes,
		EventWatcherListenerOptions
	> {
		keys = {} as Record<string, FeatureBase<never>>;
		groups = {} as Record<FeatureGroup, FeatureBase<never>[]>;
		triggers = {} as Record<FeatureTrigger, FeatureBase<never>[]>;
		parents = {} as Partial<Record<FeatureGroup, FeatureParents>>;

		constructor() {
			super(featuresEventTypes);
			Object.typedKeys(featureGroups, featureGroupNames).map((key: FeatureGroup) => this.groups[key] = []);
			featureTriggers.map((key) => this.triggers[key] = []);
		}

		// eslint-disable-next-line @typescript-eslint/ban-types -- allow any functions to be passed to get according features
		get(func: Function): FeatureBase<never> | undefined {
			return this.keys[func.name];
		}

		add(feature : FeaturesEventDataTypes['add'], { parent } : FeatureOptions): void {
			this.keys[feature.key] = feature;
			this.groups[feature.group].push(feature);
			this.triggers[feature.trigger].push(feature);

			if (parent) {
				this.parents[feature.group] = {
					parent     : feature,
					dependency : parent.dependency,
				};
			}

			this.emit('add', feature, {});
		}

		inheritAll(): void {
			Object.values(this.parents).forEach(({ parent, dependency }) => {
				const children = this.getChildren(parent);

				if (dependency === 'all' && parent.isExplicitlyEnabled()) {
					children.forEach((child) => this.emit('inherit', { feature : child, value : true }, {}));
				}

				if (dependency === 'any' && !parent.isExplicitlyEnabled() && children.filter((child) => child.isEnabled()).length > 0) {
					this.emit('inherit', { feature : parent, value : true }, {});
				}
			});
		}

		inherit(feature: FeatureBase<never>, value: boolean): void {
			const featureParent = this.parents[feature.group];

			if (!featureParent) {
				return;
			}

			const { dependency } = featureParent;

			const parent = this.getParent(feature);

			if (parent) {
				const children = this.getChildren(parent);

				if (value === !parent.isEnabled() && (dependency === 'any' === value || children.filter((child) => child.isEnabled() !== value).length === 0)) {
					this.emit('inherit', { feature : parent, value }, {});
				}
			} else {
				const children = this.getChildren(feature);

				if (dependency === 'all' === value) {
					children.forEach((child) =>  this.emit('inherit', { feature : child, value }, {}));
				}
			}
		}

		protected override watch(): void {
			return;
		}

		private getParent(feature: FeatureBase<never>): FeatureBase<never> | undefined {
			const parents = this.parents[feature.group];
			const parent  = parents?.parent;

			return parent && parent.func !== feature.func
				? parent
				: undefined;
		}

		private getChildren(feature: FeatureBase<never>): FeatureBase<never>[] {
			const parents = this.parents[feature.group];
			const parent  = parents?.parent;

			return parent && parent.func === feature.func
				? this.groups[feature.group].filter((child) => child.func !== feature.func)
				: [];
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
		{ ru : 'Выровнять кнопки настроек по ширине', en : 'Align settings buttons vertically' },
		{ public : true, group, trigger : 'mapReady', desktop : true, requires : () => $('.settings') });

	new Feature(fixCompass,
		{ ru : 'Починить компас', en : 'Fix compass' },
		{ public : true, group, trigger : 'mapReady' });

	new Feature(showLevelUpCongratulations,
		{ ru : 'Показывать поздравления с новым уровнем', en : 'Show level-up congratulations' },
		{ public : true, group, trigger : 'mapReady', requires : () => window.__sbg_variable_self_data });

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

	new Feature(fixSortButton,
		{ ru : 'Исправить расположение кнопки сортировки', en : 'Fix sort button z-index' },
		{ public : true, group, trigger : 'mapReady', requires : () => $('.sbgcui_refs-sort-button') });

	new Feature(reportCUIUpdates,
		{ ru : 'Сообщать об обновлениях скрипта', en : 'Report script updates' },
		{ public : true, group, trigger : 'mapReady', unchecked : true });

	new Feature(moveDestroyNotificationsToTop,
		{ ru : 'Переместить оповещения об атаке наверх', en : 'Move destroy notifications to top' },
		{ public : true, group, trigger : 'mapReady', unchecked : () => !features.get(loadEUI)?.isEnabled() });

	new Feature(enableConsoleDebuggingOfDatabase,
		{ ru : 'Включить отладку базы данных в консоли', en : 'Enable console debugging of database' },
		{ public : true, group, trigger : 'cuiTransform', unchecked : true });

	group = 'eui';

	new Feature(centerIconsInGraphicalButtons,
		{ ru : 'Центрировать значки графических кнопок', en : 'Center icons in graphical buttons' },
		{ public : true, group, trigger : 'mapReady' });

	new Feature(showReloadButtonInCompactMode,
		{ ru : 'Показать кнопку перезагрузки в компактном режиме', en : 'Show reload button in compact mode' },
		{ public : true, group, trigger : 'mapReady' });

	new Feature(useTeamColorForButtonsInIngressTheme,
		{ ru : 'Использовать цвет команды для кнопок в теме Ingress', en : 'Use team color for buttons in Ingress theme' },
		{ public : true, group, trigger : 'mapReady', unchecked : true });

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

	new Feature(disableAllAnimations,
		{ ru : 'Отключить все анимации', en : 'Disable all animations' },
		{ public : true, simple : true, group, trigger : 'pageLoad', parent : { dependency : 'all' } });

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
		{ group, trigger : 'fireClick' });

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

	new Feature(moveReferenceButtonsDown,
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

	group = 'buttons';

	new Feature(arrangeButtons,
		{ ru : 'Привести в порядок кнопки', en : 'Arrange buttons' },
		{ group, trigger : 'mapReady', parent : { dependency : 'any' } });

	new Feature(colorizeTimer,
		{ ru : 'Менять цвет таймера в зависимости от количества оставшихся дискаверов', en : 'Change color of timer depending on remaining discovers' },
		{ group, trigger : 'mapReady', requires : () => $('#discover') });

	new Feature(replaceSwipeWithButton,
		{ ru : 'Показать кнопку для переключения между точками', en : 'Show button to swipe between points' },
		{ group, trigger : 'mapReady', requires : () => $('.sbgcui_swipe-cards-arrow') });

	new Feature(hideCloseButton,
		{ ru : 'Спрятать кнопку закрытия, закрывать только по нажатию Back', en : 'Hide close button, close only by pressing Back' },
		{ group, trigger : 'mapReady', requires : () => $('.popup-close, #inventory__close') });

	new Feature(hideRepairButton,
		{ ru : 'Спрятать кнопку зарядки', en : 'Hide repair button' },
		{ group, trigger : 'mapReady', requires : () => $('.info.popup') });

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

	group = 'tests';

	new Feature(testNotifications,
		{ ru : 'Тестовые нотификации', en : 'Test notifications' },
		{ group, trigger : 'mapReady', unchecked : true });

	settings.cleanupFeatures();

	const presetTypes = [ 'allscripts', 'browser', 'egorscript', 'full', 'nicoscript' ] as const;
	type Presets = typeof presetTypes[number];
	const presets = {} as Record<Presets, FeatureBase<never>[]>;

	function isPreset(preset: unknown): preset is Presets {
		return presetTypes.includes(preset as Presets);
	}

	presets.nicoscript = [
		...features.groups.base,
		...features.groups.cui,
		features.get(loadCUI)!,
	];

	presets.egorscript = [
		...features.groups.base,
		...features.groups.eui,
		features.get(loadEUI)!,
	];

	presets.allscripts = [
		...presets.nicoscript,
		...presets.egorscript,
		features.get(restoreCUISort)!,
	];

	presets.browser = window.innerWidth < 800
		? [
			...presets.nicoscript,
			...presets.egorscript,
		]
		: [
			...presets.egorscript,
			features.get(showBuilderPanel)!,
		];

	presets.full = [];

	const protectedFeatures: Record<string, Array<FeatureBase<never>>> = {
		'MadMaxNsK' : [ features.get(joinFireButtons)! ],
	};

	features.inheritAll();

	console.log('created features');

	class Layers {
		private readonly layers : Map<LayerName, OlLayer>;

		constructor() {
			this.layers = new Map();
		}

		get<TLayerName extends LayerName>(layerName: TLayerName): OlLayer {
			const layer = this.layers.get(layerName);

			if (!layer) {
				throw new Error(labels.toasts.noLayer.format({ layerName }).toString());
			}

			return layer;
		}

		set<TLayerName extends LayerName>(layerName: TLayerName, layer: OlLayer): void {
			this.layers.set(layerName, layer);
		}

		has<TLayerName extends LayerName>(layerName: TLayerName): boolean {
			return this.layers.has(layerName);
		}
	}

	const layers = new Layers();

	console.log('created layers');

	type ScriptReplacer<TSearchValue extends RegExp | string> = TSearchValue extends string
		? string
		: (string | ((substring: string, ...args: string[]) => string));

	class Script {
		constructor(private data: string | undefined) {}

		static async create({ src, prefix, transformer, data }: {
			src         : string;
			data?       : string;
			prefix      : `__sbg_${string}`;
			transformer : (script: Script) => void;
		}): Promise<Script> {
			if (!data) {
				console.log('load script: started');
				data = await fetch(src).then(async (r) => r.text());
				console.log('load script: finished');
			} else {
				console.log('used build-in script');
			}

			const script = new Script(data);
			console.log(`before: ${script.data?.length ?? '0'} bytes`);

			const originalScriptName = `${prefix}_original` as const;
			const modifiedScriptName = `${prefix}_modified` as const;

			window[originalScriptName] = script.data ?? '';
			script.transform(transformer);
			window[modifiedScriptName] = script.data ?? '';

			console.log(`after: ${script.data?.length ?? '0'} bytes`);
			return script;
		}

		static appendScript(src: string): void {
			console.log('append script: started');
			Script.append((el) => el.src = src);
			console.log('append script: finished');
		}

		private static regexEscape(str: string): string {
			return str.replace(/[.\-$^*?+\\/\\|[\]{}()]/g, '\\$&');
		}

		private static replaceData<TSearchValue extends RegExp | string>(
			data: string | undefined,
			searchValue: TSearchValue,
			replacer: ScriptReplacer<TSearchValue>,
			options?: TSearchValue extends string ? { global : boolean } : never,
		): typeof data {
			if (typeof data === 'undefined') {
				console.error(`replace ${searchValue.toString()}: data is undefined`);
				return data;
			}

			if (searchValue instanceof RegExp ? data.match(searchValue) : data.includes(searchValue)) {
				if (typeof replacer === 'string') {
					if (options?.global) {
						data = data.split(searchValue).join(replacer);
					} else {
						data = data.replace(searchValue, replacer);
					}
				} else {
					data = data.replace(searchValue, replacer);
				}
			} else {
				console.error(`replace '${searchValue.toString()}': not found`);
			}

			return data;
		}

		private static append(fill: (el: HTMLScriptElement) => void): void {
			const el = document.createElement('script');
			el.type  = 'text/javascript';
			fill(el);
			document.head.appendChild(el);
		}

		valueOf(): string | undefined {
			return this.data;
		}

		replace<TSearchValue extends RegExp | string>(searchValue: TSearchValue, replacer: ScriptReplacer<TSearchValue>): this {
			this.data = Script.replaceData(this.data, searchValue, replacer);
			return this;
		}

		replaceAll(searchValue: string, replacement: string): this {
			this.data = Script.replaceData(this.data, searchValue, replacement, { global : true });
			return this;
		}

		replaceCUIBlock<TSearchValue extends RegExp | string>(block: string, searchValue: TSearchValue, replacer: ScriptReplacer<TSearchValue>): this {
			const blockSearchValue = new RegExp(`(\\/\\*\\s*${Script.regexEscape(block)}\\s*\\*\\/\n(\\s+)\\{\\s*\n\\s+)([\\s\\S]*?)(\n\\2\\})`);

			if (this.data?.match(blockSearchValue)) {
				this.data = this.data.replace(
					new RegExp(`(\\/\\*\\s*${Script.regexEscape(block)}\\s*\\*\\/\n(\\s+)\\{\\s*\n\\s+)([\\s\\S]*?)(\n\\2\\})`),
					(_data: string, open: string, _, block: string, close: string) => open + Script.replaceData(block, searchValue, replacer)! + close,
				);
			} else {
				console.error(`replace CUI block '${block}': not found`);
			}

			return this;
		}

		removeCUIBlock(block: string): this {
			return this.replaceCUIBlock(block, /[\s\S]+/, '');
		}

		transform(func: (script: Script) => void): void {
			console.log(`transform: ${func.name}`);
			func(this);
		}

		expose(prefix: `__sbg${string}`, { variables, functions }: {
			variables? : { readable? : string[]; writable? : string[] };
			functions? : { readable? : string[]; writable? : string[]; disabled? : string[] };
		}): this {
			if (!this.data) {
				console.error('expose: data is undefined');
				return this;
			}

			this.replace(/((?:^|\n)\s*)(const|let)\s+(\w+)(?=[\s+,;\n$])/g, (text, before, variableType, variableName) => {
				if (variables?.readable?.includes(variableName)) {
					return `${before}window.${prefix}_variable_${variableName} = { get: () => ${variableName} };\n${before}${variableType} ${variableName}`;
				}

				if (variables?.writable?.includes(variableName)) {
					return `
${before}window.${prefix}_variable_${variableName} = {
	get: () => ${variableName},
	set: (value) => ${variableName} = value
};
${before}let ${variableName}`;
				}

				return text;
			});

			this.data = this.data.replace(
				/(?:^|\n)\s*(async\s+)?function\s+(\w+)\s*\((.*?)\)\s*\{/g,
				(text: string, async: string | undefined, functionName: string, args: string | undefined) => {
					if (functions?.disabled?.includes(functionName)) {
						return `${text} return;`;
					}

					if (functions?.readable?.includes(functionName)) {
						return `\nwindow.${prefix}_function_${functionName} = ${functionName};\n${text}`;
					}

					if (functions?.writable?.includes(functionName)) {
						return `
${text}
	return window.${prefix}_function_${functionName}(...arguments);
}
window.${prefix}_function_${functionName} = ${async ?? ''}function(${args ?? ''}) {`;
					}

					return text;
				});

			return this;
		}

		embed(): void {
			if (!this.data) {
				console.error('embed failed, data is undefined');
				return;
			}

			console.log('embed script: started');
			Script.append((el) => el.textContent = this.data ?? '');
			console.log('embed script: finished');
		}
	}

	console.log('created script class');

	const versionWatcherEventTypes = [ 'init', 'update' ] as const;

	interface VersionWatcherEventDataTypes {
		init   : { currentVersion : string };
		update : { previousVersion : string; currentVersion : string };
	}

	class VersionWatcher extends EventWatcher<
		typeof versionWatcherEventTypes[number],
		VersionWatcherEventDataTypes,
		EventWatcherListenerOptions
	> {
		constructor(
			private readonly storageKey: string,
			private readonly getter: () => ReadableVariable<string> | undefined,
		) {
			super(versionWatcherEventTypes);
		}

		get(): string | undefined {
			return this.getter()?.get();
		}

		protected override watch(): void {
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
				this.emit('init', { currentVersion }, {});

				const previousVersion = localStorage.getItem(this.storageKey) ?? '';
				localStorage.setItem(this.storageKey, currentVersion);

				if (previousVersion !== currentVersion) {
					this.emit('update', { previousVersion, currentVersion }, {});
				}
			}, 50);
		}
	}

	const versionWatchers: Record<'cui' | 'native', VersionWatcher> = {
		native : new VersionWatcher('__sbg_current_version', () => window.__sbg_variable_VERSION),
		cui    : new VersionWatcher('__sbg_cui_current_version', () => window.__sbg_cui_variable_USERSCRIPT_VERSION),
	};

	console.log('created version watchers');

	const localStorageWatcherEventTypes = [ 'getItem', 'setItem', 'removeItem' ] as const;

	interface LocalStorageWatcherEventOptions {
		key  : string;
		when : 'after' | 'before';
	}

	type LocalStorageWatcherListenerOptions = EventWatcherListenerOptions & LocalStorageWatcherEventOptions;

	interface LocalStorageWatcherEventDataTypes {
		getItem    : { key : string };
		setItem    : { key : string; value : string };
		removeItem : { key : string };
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

		protected override watch(): void {
			((originalMethod) => {
				localStorage.getItem = (key: string) => {
					this.emit('getItem', { key }, { key, when : 'before' });
					const result = originalMethod.call(localStorage, key);
					this.emit('getItem', { key }, { key, when : 'after' });
					return result;
				};
			// eslint-disable-next-line @typescript-eslint/unbound-method -- called safely
			})(localStorage.getItem);

			((originalMethod) => {
				localStorage.setItem = (key: string, value: string) => {
					this.emit('setItem', { key, value }, { key, when : 'before' });
					originalMethod.call(localStorage, key, value);
					this.emit('setItem', { key, value }, { key, when : 'after' });
				};
			// eslint-disable-next-line @typescript-eslint/unbound-method -- called safely
			})(localStorage.setItem);

			((originalMethod) => {
				localStorage.removeItem = (key: string) => {
					this.emit('removeItem', { key }, { key, when : 'before' });
					originalMethod.call(localStorage, key);
					this.emit('removeItem', { key }, { key, when : 'after' });
				};
			// eslint-disable-next-line @typescript-eslint/unbound-method -- called safely
			})(localStorage.removeItem);
		}

		protected override isMatchEventOptions<TEventType extends typeof localStorageWatcherEventTypes[number]>(
			listener: EventWatcherListener<LocalStorageWatcherEventDataTypes[TEventType], LocalStorageWatcherListenerOptions>,
			eventOptions: LocalStorageWatcherEventOptions,
		): boolean {
			return listener.listenerOptions.key === eventOptions.key && listener.listenerOptions.when === eventOptions.when;
		}
	}

	console.log('created storage watcher');

	async function main(): Promise<void> {
		if (location.pathname.startsWith('/login')) {
			return;
		}

		console.log('started main');

		preventLoadingScript();
		enhanceEventListeners();

		window.__sbg_language = getLanguage();
		detectLocal();
		checkEssentialFeatures(features.get(loadCUI)!, features.get(loadEUI)!);
		initFeedback();
		initUrls();
		fixPermissionsCompatibility();

		await waitHTMLLoaded();
		initCSS();
		initSettings();
		window.__sbg_plus_modifyFeatures?.(features);
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

	async function copyLogs(): Promise<void> {
		await navigator.clipboard.writeText(logs.join('\n'));
		showToast(labels.toasts.logs, 2000);
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

	// function replaceColor(selector: string, propertyName: string, color: string) {
	// 	setCSS(`
	// 		${selector} {
	// 			${propertyName}: ${$(selector).css(propertyName).replace(/((rgb|hsl)a?\(.*?\)|#[0-9a-fA-F]{3,6})/, color).replace(/\s+!important/, '')} !important;
	// 		}
	// 	`);
	// }

	function isRecord(obj: unknown): obj is Record<string, unknown> {
		return typeof obj === 'object' && obj !== null;
	}

	function isObjectContaining(obj: unknown, properties: Record<string, ValidTypeOf>): boolean {
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

	function jsonSelect<T>(text: string, keys: string[]): T {
		const json = JSON.parse(text) as unknown;
		let value  = json;

		for (const key of keys) {
			if (!isRecord(value)) {
				throw new Error(`Значение не является объектом (попытка получить ${key} из списка ${keys.join(', ')})`);
			}

			if (!(key in value)) {
				throw new Error(`Значение не является объектом (попытка получить ${key} из списка ${keys.join(', ')})`);
			}

			value = value[key];
		}

		return value as T;
	}

	function addLayer<TLayerName extends LayerName>(layerName: TLayerName, layerLikeName: LayerName): OlLayer {
		const source = new window.ol.source.Vector();
		const layer  = new window.ol.layer.Vector({ source, className : `ol-layer__${layerName}` });
		layer.setProperties({ name : layerName }, true);
		layer.setProperties({ zIndex : layers.get(layerLikeName).getProperties().zIndex }, true);
		window.__sbg_variable_map.get().addLayer(layer);
		return layer;
	}

	function preventLoadingScript(): void {
		((append) => {
			Element.prototype.append = function(...nodes: (Node | string)[]) {
				if (nodes.length === 0) {
					return;
				}

				const firstNode = nodes[0];

				if (typeof firstNode === 'object' && 'src' in firstNode && firstNode.src === getNativeScriptSrc()) {
					return;
				}
				append.apply(this, nodes);
			};
		// eslint-disable-next-line @typescript-eslint/unbound-method -- called safely
		})(Element.prototype.append);

		console.log('prevented loading script');
	}

	function detectLocal(): void {
		if (window.__sbg_local && window.__sbg_preset !== 'full' && !localStorage.getItem('sbg-plus-disable-local-warning')) {
			alert(labels.toasts.localWarning.toString());
		}
	}

	function checkEssentialFeatures(...features: FeatureBase<never>[]): void {
		for (const feature of features) {
			const storageKey = `sbg-plus-feature-disabled-${feature.key}`;

			if (!feature.isEnabled() && feature.isEnabled(true)) {
				if (!localStorage.getItem(storageKey)) {
					localStorage.setItem(storageKey, '1');
					alert(labels.toasts.featureSwitchedOff.format({ label : feature.label }).toString());
				}
			} else {
				localStorage.removeItem(storageKey);
			}
		}
	}

	function getNativeScriptSrc(): string {
		return window.__sbg_urls[isMobile() ? 'script' : 'intel'].remote;
	}

	function getCUIScriptSrc(): string {
		return window.__sbg_urls.cui.remote;
	}

	function getEUIScriptSrc(): string {
		return window.__sbg_urls.eui.remote;
	}

	function enhanceEventListeners(): void {
		((addEventListener, removeEventListener) => {
			function initEventListeners<TEventType extends string>(target: EventTarget, type: TEventType): EventTargetWithEventType<TEventType> {
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- __events might not be initialized in native target
				target.__events       = target.__events ?? {};
				target.__events[type] = target.__events[type] ?? { listeners : [], sealed : false };
				return target;
			}

			EventTarget.prototype.addEventListener = function<T extends string>(
				type: T,
				listener: Parameters<typeof this.addEventListener>[1],
				options?: Parameters<typeof this.addEventListener>[2],
			) {
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

			EventTarget.prototype.removeEventListener = function<T extends string>(
				type: T,
				listener: Parameters<typeof this.addEventListener>[1],
				options?: Parameters<typeof this.addEventListener>[2],
			) {
				if (!listener) {
					return;
				}

				const target = initEventListeners(this, type);
				const index  = target.__events[type].listeners.indexOf(listener);

				if (index !== -1) {
					target.__events[type].listeners.splice(index, 1);
				}

				removeEventListener.call(this, type, listener, options);
			};

			EventTarget.prototype.getEventListeners = function<T extends string>(type: T): EventListenerOrEventListenerObject[] {
				const target = initEventListeners(this, type);
				return target.__events[type].listeners;
			};

			EventTarget.prototype.getEventHandlers = function<T = EventListener>(type: string): T[] {
				return this.getEventListeners(type)
					// eslint-disable-next-line @typescript-eslint/unbound-method -- intentionally unbound listener method to use statically then
					.map((listener) => 'handleEvent' in listener ? listener.handleEvent : listener)
					.map((handler) => handler as T);
			};

			EventTarget.prototype.clearEventListeners = function<T extends string>(type: T, sealed: boolean) {
				const target = initEventListeners(this, type);

				if (sealed) {
					target.__events[type].sealed = true;
				}

				for (const listener of target.__events[type].listeners) {
					removeEventListener.apply(target, [ type, listener ]);
				}

				target.__events[type].listeners.splice(0);
			};

			EventTarget.prototype.addOnlyEventListener = function<T extends string>(
				type: T,
				listener: Parameters<typeof this.addEventListener>[1],
				options?: Parameters<typeof this.addEventListener>[2],
			) {
				if (!listener) {
					return;
				}

				const target = initEventListeners(this, type);

				target.clearEventListeners(type, true);
				target.__events[type].listeners.push(listener);

				addEventListener.call(this, type, listener, options);
			};

			EventTarget.prototype.addRepeatingEventListener = function<TEvent extends Event>(
				type: string,
				handler: (ev: TEvent) => void,
				{
					repeats: limit,
					timeout,
					tick = () => { /* do nothing */ },
					filter = () => true,
					cancel = () => true,
				}: {
					repeats : number;
					timeout : number;
					tick?   : (ev: TEvent, iteration: number) => void;
					filter? : (ev: TEvent) => boolean;
					cancel? : (ev: TEvent) => boolean;
				}): void {
				let repeats = 0;

				this.addEventListener(type, (ev) => {
					if (!filter(ev as TEvent)) {
						return;
					}

					if (!cancel(ev as TEvent)) {
						repeats = 0;
						return;
					}

					repeats++;

					if (repeats >= limit) {
						repeats = 0;
						handler(ev as TEvent);
						return;
					}

					tick(ev as TEvent, repeats);

					setTimeout(() => {
						repeats = 0;
					}, timeout);
				});

			};
		// eslint-disable-next-line @typescript-eslint/unbound-method -- called safely
		})(EventTarget.prototype.addEventListener, EventTarget.prototype.removeEventListener);

		console.log('enhanced event listeners');
	}

	function getLanguage(): Lang {
		let lang: string;

		try {
			lang = jsonSelect<string>(localStorage.getItem('settings') ?? '{}', [ 'lang' ]);
		} catch {
			lang = navigator.language;
		}

		const result = [ 'ru', 'uk', 'be', 'kk' ].includes(lang.split('-')[0]!) ? 'ru' : 'en';
		console.log(`detected language: ${result}`);
		return result;
	}

	function initFeedback(): void {
		const feedbackClickTimeout = 1000;
		const feedbackTouches      = 3;
		const feedbackTouchRepeats = 2;

		document.addRepeatingEventListener<TouchEvent>('touchstart', () => {
			void copyLogs();
		}, {
			repeats : feedbackTouchRepeats,
			timeout : feedbackClickTimeout,
			filter  : (ev: TouchEvent) => ev.touches.length === feedbackTouches,
		});
	}

	function initUrls(): void {
		// which urls should be always loaded by forced values below
		// TODO: remove "eui" in the new version of the APK
		const alwaysForced: UrlType[] = [ 'eui' ];

		const forcedUrls: typeof window.__sbg_urls = {
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
				remote : 'https://github.com/egorantonov/sbg-enhanced/releases/latest/download/eui.user.js',
			},
		};

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- __sbg_urls might not be initialized if didn't come from APK
		window.__sbg_urls = window.__sbg_urls ?? {} as typeof window.__sbg_urls;

		for (const urlType of urlTypes) {
			if (alwaysForced.includes(urlType) || !(urlType in window.__sbg_urls)) {
				window.__sbg_urls[urlType] = forcedUrls[urlType];
			}
		}
	}

	function fixPermissionsCompatibility(): void {
		if (typeof navigator.permissions === 'undefined') {
			Object.defineProperty(navigator, 'permissions', {
				value : {
					query : () => ({ state : 'granted' }),
				},
			});
		}

		if (typeof window.DeviceOrientationEvent.requestPermission !== 'function') {
			// eslint-disable-next-line @typescript-eslint/require-await -- always return 'granted'
			window.DeviceOrientationEvent.requestPermission = async () => 'granted';
		}
	}

	async function embedCUI(nativeScript: Script): Promise<void> {
		if (!features.get(loadCUI)!.isEnabled()) {
			console.log('skipped embedCUI; loading native script');
			nativeScript.embed();
			return;
		}

		console.log('embedCUI: started');

		const cuiScript = await Script.create({
			src         : getCUIScriptSrc(),
			prefix      : '__sbg_cui_script',
			transformer : transformCUIScript,
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

	function transformCUIScript(script: Script): void {
		script.transform(exposeCUIScript);
		script.transform(fixCompatibility);
		script.transform(fixGotoReference);
		script.transform(fixCUIDefaults);
		script.transform(fixCUIWarnings);
		script.transform(fixPointNavigation);

		features.triggers.cuiTransform.filter(isTransformer).map((transformer) => {
			transformer.exec(script);
		});
	}

	async function waitHTMLLoaded(): Promise<void> {
		await resolveOnce((resolver) => {
			document.addEventListener('DOMContentLoaded', resolver);
		}, () => document.readyState !== 'loading');
		console.log('loaded DOM content');
	}

	async function resolveOnce(addListener: (resolver: () => unknown) => void, immediateCondition: () => boolean): Promise<void> {
		return new Promise((resolve) => {
			let resolved = false;

			function singleResolver(): void {
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

	async function getNativeScript(): Promise<Script>  {
		return Script.create({
			src         : getNativeScriptSrc(),
			prefix      : '__sbg_script',
			transformer : transformNativeScript,
		});
	}

	function isMobile(): boolean {
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

	function loadCUI(): void {
		// stub function. CUI is actually loaded with `embedCUI` function and is called directly from main()
		return;
	}

	function loadEUI(): void {
		window.cuiStatus = 'loaded';
		Script.appendScript(getEUIScriptSrc());
	}

	function transformNativeScript(script: Script): void {
		script.transform(exposeNativeScript);
		script.transform(includeYMaps);
		script.transform(exposeAttackSliderData);
	}

	function exposeNativeScript(script: Script): void {
		script.expose('__sbg', {
			variables : {
				readable : [ 'draw_slider', 'FeatureStyles', 'is_dark', 'ItemTypes', 'LANG', 'map', 'TeamColors', 'temp_lines_source', 'units', 'VERSION' ],
				writable : [ 'self_data' ],
			},
			functions : {
				readable : [ 'apiQuery', 'deleteInventoryItem', 'jquerypassargs', 'openProfile', 'takeUnits' ],
				writable : [ 'drawLeaderboard', 'manageDrawing', 'movePlayer', 'showInfo', 'timeToString' ],
				disabled : !isMobile() && localStorage.getItem('homeCoords') ? [ 'movePlayer' ] : undefined,
			},
		});
	}

	function includeYMaps(script: Script): void {
		const layerName = 'ymaps';

		// TODO: make ymaps by default after cleaning up theme logic
		const isChecked = localStorage.getItem('sbg-plus-state-ymaps') === '1';

		const ymapsInput = $('<input type="radio" />').attr('name', 'baselayer').val(layerName).prop('checked', isChecked);
		const ymapsSpan  = $('<span></span>').text(labels.ymaps.toString());
		const ymapsLabel = $('<label></label>').addClass('layers-config__entry').append(ymapsInput).append(' ').append(ymapsSpan);
		$('input[value="osm"]').parent().after(ymapsLabel);

		script
			.replace(
				'if (type == \'osm\') {',
				`if (type == '${layerName}') { \n  theme = is_dark ? 'dark' : 'light';\n  source = new ol.source.XYZ({ url: \`https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&scale=1&projection=web_mercator&theme=\${theme}&lang=\${window.__sbg_language}\` });\n} else if (type == 'osm') {\n`,
			)
		;
	}

	function exposeAttackSliderData(script: Script): void {
		if (!isMobile()) {
			return;
		}

		script
			.replace(
				/\$\('#catalysers-list'\)\.append\(el\)/g,
				'if (e.l > self_data.l) el.attr(\'data-disabled\', 1);\n$(\'#catalysers-list\').append(el)',
			)
		;
	}

	function setCSS(css: string): void {
		$('<style></style>').html(css).appendTo(document.body);
	}

	window.setCSS = setCSS;

	function initCSS(): void {
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

	async function wait<T>(func: () => T | null | undefined): Promise<T> {
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

	function initSettings(): void {
		new SettingsPopup();
		console.log('initialized settings');
	}

	function createPopup(cssClass: string, options: { roundClose : boolean } = { roundClose : true }): JQuery {
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

	function initHome(): void {
		if (isMobile()) {
			return;
		}

		const homeCoords = localStorage.getItem('homeCoords');

		if (!homeCoords) {
			return;
		}

		const center = JSON.parse(homeCoords) as OlCoords;
		window.__sbg_variable_map.get().getView().setCenter(center);
		console.log('initialized home location');
	}

	function initLayers(): void {
		for (const layer of window.__sbg_variable_map.get().getAllLayers()) {
			const layerName = layer.getProperties().name;

			const key = !layerName
				? 'base'
				: layerName === 'lines' && layers.has('lines')
					? 'lines_temp'
					: layerName;

			layers.set(key as LayerName, layer);
		}

		console.log('initialized layers');
	}

	function execFeatures(trigger: FeatureTrigger): void {
		features.triggers[trigger].map((feature) => {
			if (feature instanceof Feature) {
				feature.exec(undefined);
			}
		});

		console.log(`executed all features on ${trigger}`);
	}

	function execFireFeatures(): void {
		let fireClicked = false;

		$('#attack-menu').on('click', () => {
			if (!fireClicked) {
				fireClicked = true;
				execFeatures('fireClick');
			}
		});
	}

	function saveUsername(): void {
		localStorage.setItem('sbg-plus-last-username', window.__sbg_variable_self_data.get().n);
	}

	function exposeCUIScript(script: Script): void {
		script
			.expose('__sbg_cui', {
				variables : {
					readable : [ 'USERSCRIPT_VERSION', 'config', 'database' ],
				},
				functions : {
					readable : [ ],
					writable : [ 'createToast', 'getNotifs' ],
				},
			});
	}

	function fixCompatibility(script: Script): void {
		script
			.replace(
				'fetch(\'/app/script.js\')',
				'(async () => ({ text: async () => window.__sbg_script_modified }))()',
			)
			.replace(
				'window.stop',
				'false && window.stop',
			)
			.replace(
				'window.navigator.geolocation.clearWatch',
				'false && window.navigator.geolocation.clearWatch',
			)
			.replace(
				'document.open',
				'false && document.open',
			)
			.replace(
				'fetch(\'/app\')',
				'false && fetch(\'/app\')',
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

	function setViewAnimationDuration(): void {
		if (typeof window.__sbg_plus_animation_duration === 'number') {
			((animate) => {
				window.ol.View.prototype.animate = function(...args) {
					const instantArgs = args.map((arg) => typeof arg === 'object' ? { ...arg, duration : window.__sbg_plus_animation_duration } : arg);
					animate.call(this, ...instantArgs);
				};
			})(window.ol.View.prototype.animate);
		}
	}

	function fixGotoReference(script: Script): void {
		$(document).on('click', 'a[href*="point="]', (ev) => {
			const guid = (ev.currentTarget as HTMLLinkElement).href.split('point=').pop()?.split('&').shift();
			window.__sbg_function_showInfo(guid);
			ev.stopPropagation();
			return false;
		});

		script
			.replace(
				'window.location.href = `/app/?point=${guid}`',
				'window.__sbg_function_showInfo(guid)',
			)
		;
	}

	function fixCUIDefaults(script: Script): void {
		script
			.replace(
				'sepia: 1',
				'sepia: 0',
			);
	}

	function fixCUIWarnings(script: Script): void {
		script
			.replace(
				'!viewportMeta.content.match(yaRegexp)',
				'!viewportMeta.content.match(yaRegexp) && navigator.userAgent.toLowerCase().includes("yabrowser")',
			)
		;
	}

	function fixPointNavigation(script: Script): void {
		const obj: keyof Window              = '__sbg_share';
		const func: keyof Window[typeof obj] = 'open';

		if (!(obj in window) || !(func in window[obj])) {
			return;
		}

		script
			.replaceCUIBlock(
				'Навигация и переход к точке',
				'window.location.href = url',
				`if (window['${obj}']['${func}'](url) === false) {
					navigator.clipboard.writeText(lastOpenedPoint.coords);
					createToast('${labels.toasts.noGeoApp.toString()}', 'top left', 3000).showToast();
				}`,
			)
		;
	}

	function enableConsoleDebuggingOfDatabase(script: Script): void {
		script
			.replace(
				/const openRequest = .*/,
				(line) => [
					'console.log(`IDB: before open',
					'`);',
					line,
					'console.log(`IDB: after open',
					'`);',
				].join(' '),
			)
			.replace(
				/openRequest\.addEventListener\('(.*?)', event => \{/,
				(line, eventName) => [
					line,
					'console.log(`IDB: openRequest',
					`event=${eventName}`,
					'`);',
				].join(' '),
			)
			.replace(
				/database\.addEventListener\('(.*?)', event => \{/,
				(line, eventName) => [
					line,
					'console.log(`IDB: database',
					`event=${eventName}`,
					'`);',
				].join(' '),
			)
			.replace(
				/function initializeDB.*/,
				(line) => [
					line,
					'console.log(`IDB: initializeDB',
					'`);',
				].join(' '),
			)
			.replace(
				/function updateDB.*/,
				(line) => [
					line,
					'console.log(`IDB: updateDB',
					'oldVersion=` + oldVersion + `',
					'newVersion=` + newVersion + `',
					'`);',
				].join(' '),
			)
			.replace(
				/\{ (updateToVersion.*?) \}/,
				(_line, code) => [
					'{',
					'console.log(`IDB: updateToVersion started',
					'v=` + v + `',
					'`);',
					code,
					'console.log(`IDB: updateToVersion finished',
					'v=` + v + `',
					'`);',
					'}',
				].join(' '),
			)
			.replace(
				/database = event.target.result;/,
				(line) => [
					'console.log(`IDB: upgradeneeded',
					'oldVersion=` + oldVersion + `',
					'newVersion=` + newVersion + `',
					'`);',
					line,
				].join(' '),
			)
			.replace(
				'transaction.addEventListener(\'complete\', () => { window.dispatchEvent(new Event(\'dbReady\')); });',
				'transaction.addEventListener(\'complete\', () => { console.log(`IDB: transaction completed`); window.dispatchEvent(new Event(\'dbReady\')); });',
			)
			.replace(
				/const transaction = database\.transaction\((.*?)\);/,
				(line, code) => [
					'console.log(`IDB: transaction',
					`args=${JSON.stringify(code)}`,
					'`);',
					line,
					...[ 'complete', 'error', 'success', 'abort' ].map((eventName) => [
						`transaction.addEventListener('${eventName}', (...args) => {`,
						'console.log(`IDB: transaction',
						`event=${eventName}`,
						'args=` + JSON.stringify(args) + `',
						'`);',
						'});',
					]).flat(),
				].join(' '),
			)
			.replace(
				/function getData\(event\) \{/,
				(line) => [
					line,
					'console.log(`IDB: getData',
					'storeName=` + event.target.source.name + `',
					'result=` + JSON.stringify(event.target.result) + `',
					'`);',
				].join(' '),
			)
			.replace(
				/if \(cursor != undefined\) \{/,
				(line) => [
					line,
					'console.log(`IDB: objectToPopulate',
					'cursor=` + JSON.stringify(cursor) + `',
					'hasKey=` + (\'key\' in cursor) + `',
					'`);',
				].join(' '),
			)
			.replace(
				/window.dispatchEvent\(new Event\('(.*?)'\)\)/,
				(line, eventName) => [
					'console.log(`IDB: dispatch',
					`event=${eventName}`,
					'`);',
					line,
				].join(' '),
			)
		;
	}

	function disableClusters(script: Script): void {
		script
			.replace(
				'function mapClickHandler(event) {',
				'function mapClickHandler(event) { event.isSilent = true;',
			)
		;
	}

	function disableAttackZoom(script: Script): void {
		setCSS(`
			.sbgcui_lock_rotation[sbgcui_locked="true"]::before {
				transition: none !important;
			}
		`);

		script
			.replace(
				'fitBlastRange(isCompleted) {',
				'fitBlastRange(isCompleted) { isCompleted = true;',
			)
		;
	}

	function unlockCompassWhenRotateMap(script: Script): void {
		script
			.replaceCUIBlock(
				'Вращение карты',
				'if (latestTouchPoint == null) { return; }',
				'if (latestTouchPoint == null) { if (isRotationLocked) { toggleRotationLock(event); touchStartHandler({...event, target: event.target, touches: [event.touches[0]], targetTouches: [event.targetTouches[0]] }); } return; }',
			)
		;
	}

	function disableCarouselAnimation(splide: Splide): void {
		(splide.defaults ||= {} as { speed : number }).speed = 0;
	}

	function disablePopupAnimation(): void {
		setCSS(`
			.popup {
				transition: none !important;
			}
		`);
	}

	function disableMapAnimation(): void {
		window.__sbg_plus_animation_duration = 0;
	}

	function disableAttackButtonAnimation(): void {
		setCSS(`
			#attack-menu,
			#attack-menu:after {
				transition: none !important;
			}
		`);
	}

	function closeToastsAfter1sec(toastify: Toastify): void {
		((_init) => {
			toastify.prototype.init = function(options) {
				if (!options.forceDuration) {
					if (!options.duration) {
						options.duration = 0;
					} else {
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

	function disableAllAnimations(): void {
		return;
	}

	function enableBackButton(): void {
		const backClickTimeout = 1000;

		const popups: Array<{ hiddenClass : string; selectors : string[] }> = [
			{ hiddenClass : 'hidden', selectors : [ '.popup', '.draw-slider-wrp', '.attack-slider-wrp' ] },
			{ hiddenClass : 'sbgcui_hidden', selectors : [ '.sbgcui_settings' ] },
		];

		function isPopupClosed(): boolean {
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

		document.addRepeatingEventListener('backbutton', () => {
			location.replace('/window.close');
		}, {
			repeats : 2,
			timeout : backClickTimeout,
			tick    : () => {
				showToast(labels.toasts.back, backClickTimeout);
			},
			cancel : () => !isPopupClosed(),
		});
	}

	function showBuilderPanel(): void {
		void (async () => {
			const buttonsSection = await wait(() => $('.topleft-container'));
			new Builder(buttonsSection);
		})();
	}

	function showFeatureToggles(): void {
		const containers = {
			info      : $('.info.popup .i-image-box'),
			inventory : $('.inventory.popup'),
		} as const;

		Object.values(containers).forEach((container) => $('<div></div>').addClass('i-buttons i-feature-toggles').appendTo(container));

		const featureToggles: Array<{ container : keyof typeof containers; title : string; feature : FeatureBase<never> }> = [
			{ container : 'info', title : 'ARR', feature : features.get(arrangeButtons)! },
			{ container : 'info', title : 'CLS', feature : features.get(hideCloseButton)! },
			{ container : 'info', title : 'REP', feature : features.get(hideRepairButton)! },
			{ container : 'info', title : 'TMR', feature : features.get(colorizeTimer)! },
			{ container : 'info', title : 'SWP', feature : features.get(replaceSwipeWithButton)! },

			{ container : 'inventory', title : 'CUI', feature : features.get(restoreCUISort)! },
			{ container : 'inventory', title : 'BUT', feature : features.get(moveReferenceButtonsDown)! },
			{ container : 'inventory', title : 'CLR', feature : features.get(hideManualClearButtons)! },
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

	function updateLangCacheAutomatically(): void {
		versionWatchers.native.on('update', ({ currentVersion }) => {
			console.log(`update lang cache to ${currentVersion} version`);
			$('#lang-cache').trigger('click');
		}, { previous : true });
	}

	function fixBlurryBackground(): void {
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

	function alignSettingsButtonsVertically(): void {
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

	function fixCompass(): void {
		const handlers = [ ...window.getEventHandlers<(ev: DeviceOrientationEvent) => void>('deviceorientation') ];

		function triggerHandlers(webkitCompassHeading: number): void {
			handlers.map((handler) => {
				handler({ webkitCompassHeading } as DeviceOrientationEvent);
			});
		}

		function deviceOrientationAbsoluteListener(ev: DeviceOrientationEvent): void {
			if (!ev.absolute || ev.alpha == null || ev.beta == null || ev.gamma == null) {
				return;
			}

			const totalDegrees = 360;

			const webkitCompassHeading = -(ev.alpha + ev.beta * ev.gamma / 90) % totalDegrees;
			window.removeEventListener('deviceorientation', deviceOrientationListener);
			triggerHandlers(webkitCompassHeading);
		}

		const deviceOrientationListener = (ev: DeviceOrientationEvent): void => {
			const { webkitCompassHeading } = ev;

			if (webkitCompassHeading !== null && !isNaN(webkitCompassHeading)) {
				triggerHandlers(webkitCompassHeading);
				window.removeEventListener('deviceorientationabsolute', deviceOrientationAbsoluteListener);
			}
		};

		function addListeners(): void {
			window.addEventListener('deviceorientationabsolute', deviceOrientationAbsoluteListener);
			window.addEventListener('deviceorientation', deviceOrientationListener);
		}

		void (async () => {
			const response = await window.DeviceOrientationEvent.requestPermission();

			if (response === 'granted') {
				addListeners();
			} else {
				console.warn('DeviceOrientationEvent permission is not granted');
			}
		})();
	}

	function showLevelUpCongratulations(): void {
		const storageKey = 'lastUserLevel';
		const selfData   = window.__sbg_variable_self_data.get();

		if (!localStorage.getItem(storageKey)) {
			localStorage.setItem(storageKey, selfData.l.toString());
		}

		const congratulation = $(`
			<h3>New access</h3>
			<p>Level <span class="value"></span></p>
			<p>🎉</p>
		`);

		const overlay = $('<div></div>')
			.addClass('levelup-overlay')
			.appendTo('body');

		const popup = $('<div></div>')
			.addClass('levelup')
			.append(congratulation)
			.appendTo(overlay);

		const showPopup = (): void => {
			popup
				.find('.value')
				.text(localStorage.getItem(storageKey)!);

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

		const checkPopup = (newValue: number): void => {
			if (newValue.toString() !== localStorage.getItem(storageKey)) {
				localStorage.setItem(storageKey, newValue.toString());
				showPopup();
			}
		};

		document.querySelector('#self-info__explv')!
			.addRepeatingEventListener('click', () => {
				showPopup();
			}, {
				repeats : 3,
				timeout : 1000,
			});

		window.__sbg_variable_self_data.set(new Proxy(selfData, {
			set : <K extends keyof SelfData>(target: SelfData, property: K, newValue: SelfData[K]) => {
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
				font-size: 14vw;
				color: #feebb4;
				margin: 0;
			}

			#self-info__explv {
				pointer-events: auto;
			}
		`);
	}

	/* eui */

	function centerIconsInGraphicalButtons(): void {
		setCSS(`
			.material-symbols-outlined {
				line-height: 1 !important;
			}
		`);
	}

	function showReloadButtonInCompactMode(): void {
		setCSS(`
			.game-menu button.fa-solid-rotate:first-child:last-child {
				height: 2em;
				position: absolute;
				top: 0.75em;
				right: 0.75em;
			}
		`);
	}

	function useTeamColorForButtonsInIngressTheme(): void {
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

	function alwaysCenterAlignFireItemsCount(): void {
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

	function replaceHighlevelWarningWithIcon(): void {
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

	function joinFireButtons(attackMenu: JQuery): void {
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

		$(window).on('click', function(ev) {
			const target = ev.target as unknown as Element;

			if (target.id !== 'attack-menu' && $('.attack-slider-wrp.hidden').length === 0 && $(target).parents('.attack-slider-wrp').length === 0) {
				$('#attack-menu').trigger('click');
			}
		});
	}

	/* toolbar */

	function showQuickAutoSelectButton(toolbar: JQuery): void {
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

	function moveAllSidebarsRight(control: JQuery): void {
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

	function hideCUIToolbarToggleButton(): void {
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

	function showAutoDeleteSettingsButton(inventoryPopup: JQuery): void {
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

	function moveReferenceButtonsDown(): void {
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

	function hideManualClearButtons(): void {
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

	function alwaysShowSelfStatistics(drawLeaderboard: typeof window.__sbg_function_drawLeaderboard): void {
		window.__sbg_function_drawLeaderboard = async function() {
			await drawLeaderboard();

			const statMap: Record<string, string> = {
				owned : 'owned_points',
			};

			const stat  = $('#leaderboard__term-select').val()?.toString() ?? '';
			const data  = (await window.__sbg_function_apiQuery('profile', { guid : String($('#self-info__name').data('guid')) })).response.data;
			const value = data[statMap[stat] ?? stat];

			const entry = window.__sbg_function_jquerypassargs(
				$('<li>'),
				'$1$ — $2$; $3$ $4$',
				$('<span>', { class : 'profile-link' })
					.text(data.name)
					.css('color', `var(--team-${data.team})`)
					.attr('data-name', data.name)
					.on('click', (el) => void window.__sbg_function_openProfile(el)),
				$('<span>').text(window.i18next.t('leaderboard.level', { count : data.level })).css('color', `var(--level-${data.level})`),
				...window.__sbg_function_takeUnits(value ?? 0),
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

	function restoreCUISort(): void {
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

	function fixSortButton(_button: JQuery): void {
		setCSS(`
			.sbgcui_refs-sort-button {
				z-index: 100 !important;
			}
		`);
	}

	function reportCUIUpdates(): void {
		versionWatchers.cui.on('update', ({ currentVersion }) => {
			const message = labels.toasts.cuiUpdated.format({ currentVersion });
			showToast(message, 2000);

			if (window.__sbg_local) {
				alert(message);
			}
		}, { previous : true });
	}

	function moveDestroyNotificationsToTop(): void {
		((createToast) => {
			window.__sbg_cui_function_createToast = function(content, position, duration, className, oldestFirst) {
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

	function quickRecycleAllRefs(inventoryContent: JQuery): void {
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
		inventoryContentEl.getEventListeners('click').forEach((listener) => {
			inventoryContentEl.removeEventListener('click', listener);
		});

		$(document).on('click', '.inventory__content', function(ev) {
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

			const el        = $(ev.target).parents('.inventory__item');
			const inventory = (JSON.parse(localStorage.getItem('inventory-cache') ?? '[]') || []) as Array<InventoryItem>;
			const item      = inventory.find((item: { g : string }) => item.g == el.attr('data-guid'));
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

			void window.__sbg_function_deleteInventoryItem(el);
		});
	}

	/* info popup */

	function makeInfoPopupSemiTransparent(): void {
		setCSS(`
			.info.popup {
				background-color: transparent;
			}
		`);
	}

	function alwaysShowSecondsForCoolDowns(): void {
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

	function increaseItemsFont(): void {
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

	function enlargeCoreSlots(): void {
		setCSS(`
			.i-stat__cores {
				padding: 4px 0;
			}

			.i-stat__core {
				font-size: 140%;
			}
		`);
	}

	function arrangeButtons(): void {
		const buttons = [
			$('.sbgcui_jumpToButton'),
			$('.info .popup-close'),
			$('.sbgcui_navbutton'),
		];

		function toggle(value: boolean): void {
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

	function colorizeTimer(): void {
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

	function replaceSwipeWithButton(arrow: JQuery): void {
		arrow.hide();

		function createTouch(touchData: Partial<Touch> & { target : EventTarget }): { touches : TouchEvent['touches'] } {
			const touch = {
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
			};

			const touches = [ touch ];

			const set = new Set(touches);

			return {
				touches : {
					length            : set.size,
					item              : (index: number) => index === 0 ? touch : null,
					[Symbol.iterator] : set[Symbol.iterator],
				},
			};
		}

		function swipe(
			target: EventTarget,
			[ startX, startY ]: [ number, number ],
			[ endX, endY ]: [ number, number ],
		): void {
			const identifier = Math.random() * Number.MAX_SAFE_INTEGER;
			const startTouch = createTouch({ target, identifier, clientX : startX, clientY : startY });
			const endTouch   = createTouch({ target, identifier, clientX : endX, clientY : endY });

			const touchStartHandlers = target.getEventHandlers<CustomTouchEvent>('touchstart').filter((f) => f.name === 'touchStartHandler');
			const touchMoveHandlers  = target.getEventHandlers<CustomTouchEvent>('touchmove').filter((f) => f.name === 'touchMoveHandler');
			const touchEndHandlers   = target.getEventHandlers<CustomTouchEvent>('touchend').filter((f) => f.name === 'touchEndHandler');

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
				const infoPopup = document.querySelector('.info.popup')!;
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
		).observe(arrow.get(0)!, { attributes : true });

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

	function hideCloseButton(): void {
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

	function hideRepairButton(): void {
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

	function selectTargetPointByClick(): void {
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

	function highlightSelectedTargetPoint(): void {
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
				const tempLineCoords = tempLine!.getGeometry().flatCoordinates;

				const highlightFeature = new window.ol.Feature({
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

	function matchDrawSliderButtons(slider: JQuery): void {
		$('#draw').on('click', (ev) => {
			slider.css({ bottom : `${($(window).height()!) - $(ev.target).offset()!.top - ($('#draw').outerHeight()!)}px` });
			slider.find('.draw-slider-buttons').css({ padding : `0 ${$(ev.target).offset()!.left}px` });
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

	function enableOldWebViewCompatibility(): void {
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

	function testNotifications(): void {
		window.__sbg_cui_function_getNotifs = function<TLatest extends number | undefined, TResult = TLatest extends number ? number : Notif[]>(latest: TLatest) {
			if (typeof latest === 'number') {
				return 1 as TResult;
			}

			if (typeof latest === 'undefined') {
				return [
					{
						id : 1,
						g  : 'guid',
						na : 'TestUser',
						ta : 0,
						ti : new Date().toISOString(),
						c  : [ 0, 0 ],
						t  : 'test point',
					} as Notif,
				] as TResult;
			}

			throw new Error(`'latest' is not number or undefined: ${latest}`);
		};
	}

	class Builder {
		features = {} as BuilderFeatures;
		points      : Record<OlGuid, string> = {};
		pointStyles : Record<OlGuid, OlStyle> = {};
		lines        = new CoordsMap<OlLineCoords, OlFeature>();
		regions      = new CoordsMap<OlRegionCoords, OlFeature>();
		linesMap     = new CoordsMap<OlCoords, { coords : OlCoords; mine : boolean }[]>();
		regionsMap   = new CoordsMap<OlLineCoords, { region : OlFeature; mine : boolean }[]>();
		data        : BuilderData = new BuilderData(this);
		startPoint? : OlFeature;
		ownTeam     : Team = 0;
		drawTeam    : Team = 4;
		maxDrawAttempts = 3;

		constructor(buttonsSection: JQuery) {
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

		setHome(previousState: boolean): boolean {
			if (previousState) {
				if (!confirm(labels.builder.messages.deleteHome.toString())) {
					return false;
				}
				localStorage.removeItem('homeCoords');
			} else {
				if (!confirm(labels.builder.messages.setHome.toString())) {
					return false;
				}
				localStorage.setItem('homeCoords', JSON.stringify(window.__sbg_variable_map.get().getView().getCenter()));
			}

			return true;
		}

		toggleAllLines(previousState: boolean): boolean {
			layers.get('lines').setVisible(!previousState);
			layers.get('regions').setVisible(!previousState);
			layers.get('regions_shared').setVisible(!previousState && this.features.builder.getState());

			return true;
		}

		toggle(previousState: boolean): undefined {
			layers.get('lines_built').setVisible(!previousState);
			layers.get('regions_built').setVisible(!previousState);
			layers.get('regions_shared').setVisible(!previousState && this.features.allLines.getState());

			this.features.builder.setState(!previousState);
			this.data.updateStates();
		}

		undo(previousState: boolean): boolean {
			if (!previousState) {
				return false;
			}

			const { lineCoords } = this.data.pop() ?? {};

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

		clear(previousState: boolean): boolean {
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

		printRoute(previousState: boolean): boolean | undefined {
			if (!previousState) {
				return false;
			}

			const route = this.data.getRoute();
			$('.route.popup').find('textarea').val(route).end().removeClass('hidden');
			return undefined;
		}

		copy(previousState: boolean): boolean | undefined {
			return this.data.copy(previousState);
		}

		paste(previousState: boolean): boolean | undefined {
			return this.data.paste(previousState);
		}

		showHelp(_previousState: boolean): undefined {
			$('.help').removeClass('hidden');
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
				const arc = window.turf.greatCircle(coordsList[i - 1]!, coordsList[i]!, { npoints : this.getNPoints() });
				arcCoords.push(arc.geometry.coordinates);
			}

			return arcCoords.flat().map((coords) => this.getFlatCoordinates(coords));
		}

		getPointCoords(point: OlFeature): OlCoords {
			const { flatCoordinates } = point.getGeometry();
			return this.getCoords(flatCoordinates);
		}

		getLineCoords(line: OlFeature): OlLineCoords {
			const { flatCoordinates } = line.getGeometry();

			const startCoords = this.getCoords([ flatCoordinates[0]!, flatCoordinates[1]! ]);
			const endCoords   = this.getCoords([ flatCoordinates[flatCoordinates.length - 2]!, flatCoordinates[flatCoordinates.length - 1]! ]);

			return this.createLineCoords(startCoords, endCoords);
		}

		getRegionCoords(region: OlFeature): OlRegionCoords {
			const { flatCoordinates } = region.getGeometry();

			const startCoords  = this.getCoords([ flatCoordinates[0]!, flatCoordinates[1]! ]);
			const middleCoords = this.getCoords([ flatCoordinates[flatCoordinates.length * 1 / 3]!, flatCoordinates[flatCoordinates.length * 1 / 3 + 1]! ]);
			const endCoords    = this.getCoords([ flatCoordinates[flatCoordinates.length * 2 / 3]!, flatCoordinates[flatCoordinates.length * 2 / 3 + 1]! ]);

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

		addLine(line: OlFeature, lineCoords: OlLineCoords, { mine }: { mine : boolean }): void {
			if (![ this.ownTeam, this.drawTeam ].includes(line.getProperties().team)) {
				return;
			}

			this.linesMap.create(lineCoords[0], []).push({ coords : lineCoords[1], mine });
			this.linesMap.create(lineCoords[1], []).push({ coords : lineCoords[0], mine });
			this.lines.set(lineCoords, line);
			this.checkRegions(lineCoords, { mine });
		}

		addRegion(region: OlFeature, regionCoords: OlRegionCoords, { mine }: { mine : boolean }): void {
			if (![ this.ownTeam, this.drawTeam ].includes(region.getProperties().team)) {
				return;
			}

			this.regionsMap.create([ regionCoords[0], regionCoords[1] ], []).push({ region, mine });
			this.regionsMap.create([ regionCoords[0], regionCoords[2] ], []).push({ region, mine });
			this.regionsMap.create([ regionCoords[1], regionCoords[2] ], []).push({ region, mine });
			this.regions.set(regionCoords, region);
		}

		buildLine({ linePoints, lineCoords }: LineData, attempt = 0): OlFeature | undefined {
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
			const feature            = new window.ol.Feature({ geometry : new window.ol.geom.LineString(arcFlatCoordinates) });
			feature.setId(id);
			feature.setProperties({ team : this.drawTeam, mine : true });
			feature.setStyle(new window.ol.style.Style({
				stroke : new window.ol.style.Stroke({ color : window.__sbg_variable_TeamColors.get()[this.drawTeam]?.stroke ?? '', width : 2 }),
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

		buildRegion(coordsList: [OlCoords, OlCoords, OlCoords], shared: boolean, attempt = 0): OlFeature | undefined {
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
			const feature            = new window.ol.Feature({ geometry : new window.ol.geom.Polygon([ arcFlatCoordinates ]) });
			feature.setId(id);
			feature.setProperties({ team : this.drawTeam, mine : true, shared });
			feature.setStyle(new window.ol.style.Style({
				fill : new window.ol.style.Fill({ color : window.__sbg_variable_TeamColors.get()[this.drawTeam]?.fill ?? '' }),
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

		checkRegions(lineCoords: OlLineCoords, { mine }: { mine : boolean }): void {
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

		private initCSS(): void {
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

		private initTeam(): void {
			const style = $('#self-info__name').attr('style');

			if (style) {
				const matches = style.match(/team-(\d+)/);

				if (matches) {
					this.ownTeam = parseInt(matches[1]!) as Team;
				}
			}

			window.__sbg_variable_TeamColors.get().push({ fill : '#FF880030', stroke : '#F80' });
		}

		private initLayers(): void {
			this.addLayer('lines_built', 'lines');
			this.addLayer('regions_built', 'regions');
			this.addLayer('regions_shared', 'regions');

			layers.get('lines').getSource().on('addfeature', (ev) => {
				this.addLine(ev.feature, this.getLineCoords(ev.feature), { mine : false });
			});

			layers.get('regions').getSource().on('addfeature', (ev) => {
				const feature = ev.feature;
				this.addRegion(feature, this.getRegionCoords(feature), { mine : false });
			});

			layers.get('lines').getSource().getFeatures().forEach((line) => {
				this.addLine(line, this.getLineCoords(line), { mine : false });
			});

			layers.get('regions').getSource().getFeatures().forEach((region) => {
				this.addRegion(region, this.getRegionCoords(region), { mine : false });
			});
		}

		private addLayer<TLayerName extends LayerName>(layerName: TLayerName, layerLike: LayerName): void {
			const layer = addLayer(layerName, layerLike);
			layers.set(layerName, layer);
		}

		private initButtons(container: JQuery): JQuery {
			return $('<div></div>')
				.addClass('builder')
				.appendTo(container);
		}

		private initFeatures(buttonContainer: JQuery): void {
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

			/* eslint-disable @typescript-eslint/unbound-method -- intended to be bound in BuilderFeature constructor */
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
			/* eslint-enable @typescript-eslint/unbound-method */

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

		private initData(): void {
			this.data = new BuilderData(this);
			this.data.load();
		}

		private initMapClick(): void {
			const originalMapClick = window.__sbg_variable_map.get().getListeners('click')[0];

			const extendedMapClick = (ev: OlMapClickEvent): void => {
				if (this.features.builder.getState()) {
					this.mapClick(ev);
				} else {
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

		private mapClick(ev: OlMapClickEvent): void {
			window.__sbg_variable_map.get().forEachFeatureAtPixel(ev.pixel, (feature, layer) => {
				console.log(`BUILDER click layer: ${layer.getProperties().name}`);

				if (layer.getProperties().name !== 'points') {
					return;
				}

				const point       = feature;
				const pointCoords = this.getPointCoords(point);
				this.setPointDrawing(point, true);

				const [ startPoint, endPoint ] = [ this.startPoint, point ];

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
					const lineData  = await LineData.load([ startPoint, endPoint ], this);
					const lineBuilt = this.buildLine(lineData);

					this.setPointDrawing(startPoint, false);
					this.setPointDrawing(endPoint, false);

					if (lineBuilt) {
						this.startPoint = undefined;
					}
				})();
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

		private setPointDrawing(point: OlFeature, drawing: boolean): void {
			if (drawing) {
				this.pointStyles[point.getId()] = point.getStyle();
				point.setStyle(window.__sbg_variable_FeatureStyles.get().POINT(point.getGeometry().flatCoordinates, this.drawTeam, 1, true));
			} else {
				const style = this.pointStyles[point.getId()];

				if (style) {
					point.setStyle(style);
				} else {
					throw new Error(`Attempt to get non-existing style for point id = '${point.getId()}'`);
				}
			}
		}

		private initStates(): void {
			this.toggleAllLines(!this.features.allLines.getState());
			this.toggle(!this.features.builder.getState());
			this.data.updateStates();
		}

		private initHelpPopup(): void {
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

		private initRoutePopup(): void {
			const routeElement = $('<textarea></textarea>')
				.on('click', (ev) => {
					ev.stopPropagation();
				})
				.on('keydown', (ev) => {
					ev.stopPropagation();
				});

			createPopup('route').prepend(routeElement);
		}

		private initCopyPaste(): void {
			$(document).on('keydown', (ev) => {
				if (ev.ctrlKey) {
					switch (ev.key) {
						case 'c':
							return this.data.copy(true);
						case 'v':
							return this.data.paste(true);
					}
				}

				return false;
			});
		}
	}

	class BuilderFeature {
		name                   : string;
		action                 : BuilderAction;
		button                 : JQuery;
		private readonly state : { value : boolean };

		constructor({
			name,
			action,
			initialState,
			label,
			buttonContainer,
			builder,
		}: {
			name            : BuilderButtons;
			buttonContainer : JQuery;
			initialState    : boolean;
			label           : BuilderButtonLabel;
			action          : BuilderAction;
			builder         : Builder;
		}) {
			this.name   = name;
			this.action = action.bind(builder);
			this.button = this.createButton(label, buttonContainer);

			const value = this.loadState(initialState);

			this.state = new Proxy<typeof this.state>({ value }, {
				get : (
					data: typeof this.state,
					property: keyof typeof this.state,
				): boolean => data[property],

				set : (
					data: typeof this.state,
					property: keyof typeof this.state,
					value: typeof this.state[keyof typeof this.state],
				): boolean => {
					const storageKey = this.getStorageKey();
					localStorage.setItem(storageKey, value ? '1' : '0');
					data[property] = value;
					this.setButtonState();
					return true;
				},
			});

			this.setButtonState();
		}

		getState(): boolean {
			return this.state.value;
		}

		setState(value: boolean): void {
			this.state.value = value;
		}

		setButtonState(): void {
			this.button.toggleClass('active', this.state.value);
		}

		private loadState(initialState: boolean): boolean {
			const storageKey   = this.getStorageKey();
			const storageValue = localStorage.getItem(storageKey);
			return storageValue ? storageValue === '1' : initialState;
		}

		private getStorageKey(): string {
			return `sbg-plus-state-${this.name}`;
		}

		private createButton(label: BuilderButtonLabel, buttonContainer: JQuery): JQuery {
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
		storageKey = 'builderData';
		private data             : LineData[];
		private readonly builder : Builder;

		constructor(builder: Builder) {
			this.builder = builder;
			this.data    = [];
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

			return { points : Object.fromEntries(pointsMap.getData()), lines };
		}

		private static unpack(pack: BuilderDataPack): LineData[] {
			const data: LineData[] = [];
			const pointsMap        = new CoordsMap<OlCoords, PointData>(new Map(Object.entries(pack.points)));

			for (const lineCoords of pack.lines) {
				const points   = [ pointsMap.get(lineCoords[0]), pointsMap.get(lineCoords[1]) ] as [PointData, PointData];
				const lineData = new LineData(points, lineCoords);
				data.push(lineData);
			}

			return data;
		}

		add(lineData: LineData): void {
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

		clear(): void {
			this.data = [];
			this.updateStates();
			this.save();
		}

		count(): number {
			return this.data.length;
		}

		updateStates(): void {
			const isActive = this.builder.features.builder.getState();
			const isData   = this.data.length > 0;

			this.builder.features.undo.setState(isActive && isData);
			this.builder.features.clear.setState(isActive && isData);
			this.builder.features.route.setState(isActive && isData);
			this.builder.features.copy.setState(isActive && isData);
			this.builder.features.paste.setState(isActive);
		}

		save(): void {
			localStorage.setItem(this.storageKey, JSON.stringify(BuilderData.pack(this.data)));
			console.log(`BUILDER saved lines: ${this.data.length}`);
		}

		load(): void {
			const stored = localStorage.getItem(this.storageKey);

			if (stored) {
				this.set(stored);
			}
		}

		copy(previousState: boolean) : boolean | undefined {
			if (!previousState) {
				return false;
			}

			void (async () => {
				await navigator.clipboard.writeText(JSON.stringify(BuilderData.pack(this.data)));
				alert(labels.builder.messages.copied.toString());
			})();

			return undefined;
		}

		paste(previousState: boolean) : boolean | undefined {
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

		getRoute(): string {
			return this.data.map((line) => line.linePoints.map((point) => point.title).join(' => ')).join('\n');
		}

		private set(text: string): LineData[] | undefined {
			const parsed = this.parse(text);

			if ('error' in parsed) {
				if (parsed.error) {
					alert(parsed.error.toString());
				} else {
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

		private parse(text: string): { error : Label | undefined } | { pack : BuilderDataPack } {
			let pack: unknown;

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
	}

	class LineData {
		constructor(
			public linePoints: [PointData, PointData],
			public lineCoords: OlLineCoords,
		) {
			this.linePoints = linePoints;
			this.lineCoords = lineCoords;
		}

		static async load(points: [OlFeature, OlFeature], builder: Builder): Promise<LineData> {
			const promises   = points.map(async (point) => PointData.resolve(point, builder));
			const linePoints = await Promise.all(promises) as [PointData, PointData];
			const lineCoords = builder.createLineCoords(linePoints[0].coords, linePoints[1].coords);
			return new LineData(linePoints, lineCoords);
		}
	}

	class PointData {
		private constructor(
			public guid: OlGuid,
			public title: string,
			public coords: OlCoords,
		) {}

		static async resolve(point: OlFeature, builder: Builder): Promise<PointData> {
			const guid   = point.getId();
			const title  = await PointData.getPointTitle(guid, builder.points);
			const coords = builder.getPointCoords(point);
			return new PointData(guid, title, coords);
		}

		private static async getPointTitle(guid: OlGuid, points: Builder['points']): Promise<string> {
			const point = points[guid];

			if (point) {
				return point;
			}

			const { response } = await window.__sbg_function_apiQuery('point', { guid });
			return points[guid] = response.data.t;
		}
	}

	interface BuilderDataPack {
		points : Record<string, PointData>;
		lines  : OlLineCoords[];
	}

	const validTypeOf = typeof {};
	type ValidTypeOf = typeof validTypeOf;

	class BuilderDataPackValidator {
		private readonly validationErrors : Labels['builder']['validationErrors'];
		private validationError           : Label | undefined;

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

		getError(): Label | undefined {
			return this.validationError;
		}

		private isArray(array: unknown, length: number, type: ValidTypeOf): boolean {
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

		private checkObjectProperties(pack: object): pack is { points : unknown; lines : unknown } {
			if (!isObjectContaining(pack, { points : 'object', lines : 'object' })) {
				this.validationError = this.validationErrors.objectProperties;
				return false;
			}

			return true;
		}

		private checkPoints(points: unknown): points is Record<string, { guid : string; title : string; coords : unknown }> {
			if (!isRecord(points) || Object.values(points).filter((point) => !isObjectContaining(point, { guid : 'string', title : 'string', coords : 'object' })).length > 0) {
				this.validationError = this.validationErrors.pointProperties;
				return false;
			}

			return true;
		}

		private checkPointsCoords(points: Record<string, { guid : string; title : string; coords : unknown }>)
			: points is Record<string, { guid : string; title : string; coords : [number, number] }> {
			if (Object.values(points).map((point) => point.coords).filter((coords) => !this.isArray(coords, 2, 'number')).length > 0) {
				this.validationError = this.validationErrors.pointCoords;
				return false;
			}

			return true;
		}

		private checkLines(lines: unknown): lines is Array<[unknown, unknown]> {
			if (!Array.isArray(lines) || lines.filter((lineCoords) => !this.isArray(lineCoords, 2, 'object')).length > 0) {
				this.validationError = this.validationErrors.lines;
				return false;
			}

			return true;
		}

		private checkLinesCoords(lines: Array<[unknown, unknown]>): lines is Array<[[number, number], [number, number]]> {
			if (lines.flat().filter((coords) => !this.isArray(coords, 2, 'number')).length > 0) {
				this.validationError = this.validationErrors.linesCoords;
				return false;
			}

			return true;
		}
	}

	class CoordsMap<K extends OlCoords | OlLineCoords | OlRegionCoords, V> {
		constructor(
			private readonly data: Map<string, V> = new Map(),
		) {
		}

		getData(): Map<string, V> {
			return this.data;
		}

		get(key: K | string): V | undefined {
			return this.data.get(this.stringifyKey(key));
		}

		set(key: K | string, value: V): void {
			this.data.set(this.stringifyKey(key), value);
		}

		create(key: K | string, initialValue: V): V {
			if (!this.has(key)) {
				this.set(key, initialValue);
			}

			return this.get(key) as V;
		}

		has(key: K | string): boolean {
			return this.stringifyKey(key) in this.data;
		}

		forEach(func: (value: V, key: string) => void): void {
			this.data.forEach((value: V, key: string) => {
				func(value, key);
			});
		}

		deleteMine(key: K | string): void {
			const stringKey = this.stringifyKey(key);
			const item      = this.data.get(stringKey) as Array<{ mine : boolean }>;

			if (item instanceof window.ol.Feature && item.getProperties().mine) {
				this.data.delete(stringKey);
			}

			if (Array.isArray(item)) {
				const others = item.filter((subItem) => !subItem.mine) as unknown[] & V;

				if (others.length === 0) {
					this.data.delete(stringKey);
				} else {
					this.data.set(stringKey, others);
				}
			}
		}

		clearMine(): void {
			Object.keys(this.data).forEach((key) => {
				this.deleteMine(key);
			});
		}

		private stringifyKey(key: K | string): string {
			return typeof key === 'string'
				? key
				: key.map((item) => Array.isArray(item) ? item.join(',') : item).join(',');
		}
	}

	class SettingsPopup {
		private container : JQuery | undefined;
		private sections = {} as Record<FeatureGroup, JQuery>;
		private checkboxes = {} as Record<string, JQuery>;

		constructor() {
			this.render();

			Object.typedKeys(features.groups, featureGroupNames).map((group: FeatureGroup) => {
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

		addFeature(feature: FeatureBase<never>): void {
			const checkbox = this.renderFeatureCheckbox(feature);
			const setting  = this.renderSetting(feature.isSimple(), checkbox, feature.label);
			this.sections[feature.group].find('h4').before(setting);
			this.checkboxes[feature.key] = checkbox;
		}

		check(feature: FeatureBase<never>, value: boolean): void {
			settings.setFeature(feature.key, value);
			this.checkboxes[feature.key]?.prop('checked', value);
		}

		private render(): void {
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

		private addGroup(group: FeatureGroup): void {
			const featureGroup   = featureGroups[group];
			const sectionTitle   = $('<h4></h4>').text(new Label(featureGroup).toString());
			const section        = $('<div></div>').addClass('settings-section').append(sectionTitle);
			this.sections[group] = section;

			if (this.container) {
				this.container.append(section);
			} else {
				throw new Error(`Attempt to render section of group '${group}' to non existing container. Please render this.render() before adding groups`);
			}
		}

		private renderSetting(isSimple: boolean, ...children: Array<JQuery | Label>): JQuery {
			const settingLabel = $('<label></label>').addClass('settings-section__item').toggleClass('simple', isSimple);

			for (const child of children) {
				const element = child instanceof Label ? $('<span></span>').text(child.toString()) : child;
				settingLabel.append(element);
			}

			return settingLabel;
		}

		private renderFeatureCheckbox(feature: FeatureBase<never>): JQuery {
			return $('<input type="checkbox" />')
				.prop('checked', feature.isEnabled())
				.on('change', (ev) => {
					feature.setEnabled((ev.target as HTMLInputElement).checked);
				});
		}
	}

	void main();
})();
