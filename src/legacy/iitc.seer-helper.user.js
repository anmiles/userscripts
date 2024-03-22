// ==UserScript==
// @id             SeerHelper
// @name           IITC plugin: Seer helper
// @namespace      ingress
// @version        0.4.5.20210131.0
// @updateURL      https://anmiles.net/userscripts/iitc.seer-helper.user.js
// @downloadURL    https://anmiles.net/userscripts/iitc.seer-helper.user.js
// @description    Add draggable 10m circles to all markers
// @description:ru Добавляет передвижные 10м круги ко всем порталам
// @author         Anatoliy Oblaukhov
// @include        https://*.ingress.com/intel*
// @include        http://*.ingress.com/intel*
// @match          https://*.ingress.com/intel*
// @match          http://*.ingress.com/intel*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

// PLUGIN START ////////////////////////////////////////////////////////

// use own namespace for plugin
window.plugin.seerHelper = function() {};
window.plugin.seerHelper.layerGroups = {};

window.plugin.seerHelper.literals = {
    limiter: {
        distance: 20,
        checkInterval: 50,
    },

    range: 40,
    limitGroup: 'Limits',

    features: {
        load: {type: 'load', label: 'Load local file (GPX, KML, GeoJSON)'},
        draw: {type: 'draw', label: 'Draw new point'},
        save: {type: 'save', label: 'Save to table'},
        clear: {type: 'clear', label: 'Clear all'}
    },

    markerDefaults: {
        name: 'New portal',
        category: 'New portal',
        categoryAlias: 'New portal',
        status: '',
    }
};

window.plugin.seerHelper.styles = {
    marker: {radius: 8, weight: 2, color: '#000000', fillColor: '#ffffff', opacity: 1, fillOpacity: 1},
    limit: {
        default: {weight: 1},
        selected: {
            true: {opacity: 0.4, fillOpacity: 0.4},
            false: {opacity: 0.2, fillOpacity: 0.2},
        },
        overlap: {
            true: {color: '#ff0000', fillColor: '#ff0000'},
            false: {color: '#000000', fillColor: '#ffffff'},
        },
    },
    range: {weight: 2, color: 'orange', fill: false, clickable: false},
};

window.plugin.seerHelper.setup = function() {
    L.SeerHelper = {};
    L.SeerHelper.Util = {};

    L.SeerHelper.Util.GenerateGUID = function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    L.SeerHelper.Util.ParseLatLng = function(text){
        var parts = text.split(',');
        var lat = parseFloat(parts[0]);
        var lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) return L.latLng(lat, lng);
        return null;
    };

    L.SeerHelper.LayerGroup = L.LayerGroup.extend({
        initialize: function (groupName) {
            L.LayerGroup.prototype.initialize.call(this);
            this.groupName = groupName;
        },

        addToList: function() {
            if (map.hasLayer(this)) return;
            window.addLayerGroup(this.groupName, this, true);
            return this;
        },

        enable: function(){
            if (map.hasLayer(this)) return;
            map.addLayer(this);
        },

        disable: function(){
            if (!map.hasLayer(this)) return;
            map.removeLayer(this);
        },
    });

    L.SeerHelper.LayerGroup.create = function(groupName) {
        var layerGroup = window.plugin.seerHelper.layerGroups[groupName] || new L.SeerHelper.LayerGroup(groupName);
        window.plugin.seerHelper.layerGroups[groupName] = layerGroup;
        return layerGroup;
    };

    L.SeerHelper.PortalName = L.Marker.extend({
        initialize: function(marker) {
            L.Marker.prototype.initialize.call(this, marker.getLatLng(), {
                icon: L.divIcon({
                    className: 'plugin-portal-names plugin-seer-helper',
                    iconAnchor: [window.plugin.portalNames.NAME_WIDTH / 2, 0],
                    iconSize: [window.plugin.portalNames.NAME_WIDTH,window.plugin.portalNames.NAME_HEIGHT],
                    html: marker.feature.properties.name
                }),
                guid: marker.options.guid,
            });

            this.marker = marker;
            window.plugin.portalNames.labelLayers[marker.options.guid] = this;
            this.addTo(marker.layerGroup);
            return this;
        }
    });

    L.SeerHelper.Limiter = L.Class.extend({
        initialize: function(options){
            this.options = {};
            this.queue = {};
            this.markers = {};
            this.limits = {};

            L.extend(this.options, options);
            this.start();
        },

        addMarker: function(marker) {
            this.markers[marker.options.guid] = marker;
        },

        removeMarker: function(marker) {
            delete this.markers[marker.options.guid];
        },

        addLimit: function(marker) {
            if (marker.limit) return;
            marker.limit = new L.SeerHelper.Limit(marker);
            this.limits[marker.options.guid] = marker.limit;

            if (map.hasLayer(window.plugin.seerHelper.layerGroups[window.plugin.seerHelper.literals.limitGroup]) && map.hasLayer(marker) && !map.hasLayer(marker.limit)) {
                marker.limit.addTo(map);
            }
        },

        removeLimit: function(marker) {
            if (!marker.limit) return;

            if (map.hasLayer(marker.limit)) {
                map.removeLayer(marker.limit);
            }

            delete this.limits[marker.options.guid];
            delete marker.limit;
        },

        show: function(){
            for (var guid in this.limits) {
                map.addLayer(this.limits[guid]);
            }
        },

        hide: function(){
            for (var guid in this.limits) {
                map.removeLayer(this.limits[guid]);
            }
        },

        checkAll: function(){
            for (var i in this.markers) {
                this.check(this.markers[i]);
            }
        },

        check: function(marker) {
            this.queue[marker.options.guid] = marker;
        },

        checkImmediately: function(marker, marker2) {
            if (marker.options.guid === marker2.options.guid) return;

            if (marker.getLatLng().distanceTo(marker2.getLatLng()) < this.options.distance) {
                marker.limit.overlaps[marker2.options.guid] = marker2;
                marker2.limit.overlaps[marker.options.guid] = marker;
            } else if (marker.limit.overlaps[marker2.options.guid]) {
                delete marker2.limit.overlaps[marker.options.guid];
                delete marker.limit.overlaps[marker2.options.guid];
            }

            marker.limit.updateStyle();
            marker2.limit.updateStyle();
        },

        clear: function(marker){
            for (var i in marker.limit.overlaps) {
                var marker2 = marker.limit.overlaps[i];
                delete marker.limit.overlaps[marker2.options.guid];
                delete marker2.limit.overlaps[marker.options.guid];
                marker.limit.updateStyle();
                marker2.limit.updateStyle();
            }
        },

        clearAll: function(){
            for (var i in this.markers) {
                this.clear(this.markers[i]);
            }
        },

        start: function(){
            var limiter = this;
            if (limiter.started) return;
            limiter.started = true;

            setInterval(function(){
                for (var guid in limiter.queue) {
                    var marker = limiter.queue[guid];
                    delete limiter.queue[guid];

                    for (var i in portals) {
                        limiter.checkImmediately(marker, portals[i]);
                    }

                    for (var l in window.plugin.seerHelper.layerGroups) {
                        window.plugin.seerHelper.layerGroups[l].getLayers().forEach(function(layer){
                            if (!layer.limit) return;
                            limiter.checkImmediately(marker, layer);
                        });
                    }
                }
            }, this.options.checkInterval);
        },
    });

    L.SeerHelper.Marker = L.CircleMarker.extend({
        initialize: function (latlng, options) {
            options = L.extend({}, options);
            L.CircleMarker.prototype.initialize.call(this, latlng, options);
            options.guid = L.SeerHelper.Util.GenerateGUID();
            this.feature = this.feature || {};
            this.setStyle(L.extend({}, window.plugin.seerHelper.styles.marker, options));
        },

        addToLayerGroup: function() {
            this.feature.properties = L.extend({}, window.plugin.seerHelper.literals.markerDefaults, this.feature.properties);
            var groupName = this.feature.properties.categoryAlias + (this.feature.properties.status ? ' - ' + this.feature.properties.status : '');
            this.layerGroup = L.SeerHelper.LayerGroup.create(groupName);
            this.addTo(this.layerGroup);
            return this;
        },

        render: function(){
            if (this.feature && this.feature.properties && !this.feature.properties.submitted) {
                this.setDraggable();
                limiter.check(this);
            }

            if (!window.plugin.portalNames) return;
            this.portalName = new L.SeerHelper.PortalName(this);
        },

        setDraggable: function(){
            var marker = this;
            limiter.addMarker(marker);
            if (map.hasLayer(marker) && map.hasLayer(marker.limit)) marker.limit.bringToFront();

            marker.limit.on('mousedown', function(ev) {
                var diff = L.latLng(marker.getLatLng().lat - ev.latlng.lat, marker.getLatLng().lng - ev.latlng.lng);
                map.dragging.disable();

                map.on('mousemove', function (ev) {
                    marker.limit.isDragging = true;
                    marker.moveTo(L.latLng(ev.latlng.lat + diff.lat, ev.latlng.lng + diff.lng));
                });
            });
        },

        addRange: function() {
            if (this.range) return;
            this.range = new L.SeerHelper.Range(this);
            this.range.addTo(map);
        },

        removeRange: function() {
            if (!this.range) return;
            map.removeLayer(this.range);
            delete this.range;
        },

        moveTo: function(latLng) {
            this.setLatLng(latLng);
            if (this.limit) this.limit.setLatLng(latLng);
            if (this.portalName) this.portalName.setLatLng(latLng);
            if (this.range) this.range.setLatLng(latLng);
            sidebar.show(this);
            limiter.check(this);
        },

        delete: function() {
            if (this.portalName) map.removeLayer(this.portalName);
            if (this.limit) limiter.removeLimit(this);
            if (this.limit && this.limit.overlaps) limiter.clear(this);
            sidebar.hide();
            limiter.removeMarker(this);
            map.removeLayer(this);
        },
    });

    L.SeerHelper.Marker.import = function(data, latlng){
        return new L.SeerHelper.Marker(latlng, data.properties);
    };

    L.SeerHelper.Range = L.Circle.extend({
        initialize: function (marker) {
            L.Circle.prototype.initialize.call(this, marker.getLatLng(), window.plugin.seerHelper.literals.range, window.plugin.seerHelper.styles.range);
            this.marker = marker;
        },
    });

    L.SeerHelper.Limit = L.Circle.extend({
        initialize: function (marker) {
            this.selected = false;
            this.overlaps = {};

            L.Circle.prototype.initialize.call(this, marker.getLatLng(), window.plugin.seerHelper.literals.limiter.distance / 2, window.plugin.seerHelper.styles.limit.default);
            this.updateStyle();
            this.marker = marker;
            this.bind();
        },

        updateStyle: function(){
            this.setStyle(window.plugin.seerHelper.styles.limit.default);
            this.setStyle(window.plugin.seerHelper.styles.limit.overlap[Object.keys(this.overlaps).length > 0]);
            this.setStyle(window.plugin.seerHelper.styles.limit.selected[this.selected]);
        },

        focus: function(){
            if (window.plugin.seerHelper.selectedLimit) {
                window.plugin.seerHelper.selectedLimit.deselect();
            }

            this.select();
            window.plugin.seerHelper.selectedLimit = this;
        },

        select: function(){
            this.selected = true;
            this.updateStyle();
        },

        deselect: function(){
            this.selected = false;
            this.updateStyle();
        },

        bind: function(){
            var limit = this;

            limit.on('click', function(){
                if (limit.marker.layerGroup) {
                    if (limit.isDragging) {
                        limit.isDragging = false;
                        return;
                    }

                    window.renderPortalDetails(null);
                    limit.focus();
                    sidebar.show(limit.marker);
                } else {
                    sidebar.hide();
                    window.renderPortalDetails(limit.marker.options.guid);
                }
            });
        },
    });

    L.SeerHelper.InputGroup = L.Class.extend({
        initialize: function(options){
            this.inputs = [];
        },

        create: function(options) {
            var input = new L.SeerHelper.Input(options);
            this.inputs.push(input);
            return input;
        },

        cancel: function(){
            this.inputs.forEach(function(input){
                input.cancel();
            });
        },

        appendTo: function(container){
            this.inputs.forEach(function(input){
                input.appendTo(container);
            });
        }
    });

    L.SeerHelper.Input = L.Class.extend({
        options: {required: false, regex: '.*'},

        initialize: function(options){
            this.container = $('<div><i></i></div>');
            this.input = $('<a></a>');
            this.options = L.extend({},  L.SeerHelper.Input.prototype.options, options);
            this.options.regex = new RegExp(this.options.regex);
        },

        text: function(val) {
            this.input.text(val);
        },

        bind: function(callback) {
            var that = this;

            this.container.on('click', function(ev) {
                if (ev.target.contentEditable == "true") return;
                ev.target.previousInnerText = ev.target.innerText;
                ev.target.contentEditable = true;
                ev.target.focus();
            });

            this.input.on('keyup', function(ev){
                that.error(that.options.required && ev.target.innerText.trim().length === 0 || !that.options.regex.test(ev.target.innerText));
            });

            this.input.on('keydown', function(ev) {
                if (!(ev.keyCode === 10 || ev.keyCode == 13 || ev.keyCode === 27)) {
                    return true;
                }

                ev.target.contentEditable = false;

                if (ev.keyCode === 27) {
                    ev.target.innerText = ev.target.previousInnerText;
                } else {
                    callback(ev.target.innerText);
                }

                return false;
            });
        },

        error: function(flag){
            this.container.toggleClass('error', flag);
        },

        cancel: function(){
            this.input.contentEditable = false;
        },

        appendTo: function(parent){
            this.container.addClass(this.options.className).addClass('editable').appendTo(parent).append(this.input);
        }
    });

    L.SeerHelper.Sidebar = L.Class.extend({
        initialize: function(){
            this.marker = null;

            this.setup();
            this.bind();
        },

        show: function(marker) {
            if (this.marker !== marker) this.hide();

            this.marker = marker;
            this.elements.name.text(marker.feature.properties.name);
            this.elements.latLng.text(marker.getLatLng().lat.toFixed(6) + ',' + marker.getLatLng().lng.toFixed(6));
            this.elements.category.text(marker.feature.properties.category);

            if (marker.feature.properties.status) {
                if (marker.feature.properties.submitted) this.elements.submitted.text('Submitted: ' + marker.feature.properties.submitted);
                if (marker.feature.properties.reviewed) this.elements.reviewed.text(marker.feature.properties.status + ': ' + marker.feature.properties.reviewed + ' (' + marker.feature.properties.days + ') days');
            }

            this.marker.addRange();
            this.elements.panel.show();
        },

        hide: function() {
            if (!this.marker) return;
            this.marker.removeRange();
            delete this.marker;
            this.elements.panel.hide();
            this.inputGroup.cancel();
        },

        setup: function() {
            this.inputGroup = new L.SeerHelper.InputGroup();

            this.elements = {
                panel: $('<div id="seerHelperPanel"></div>').addClass('none'),
                name: this.inputGroup.create({className: 'name', required: true}),
                latLng: this.inputGroup.create({className: 'latLng', required: true, regex: '^\\-?\\d+\\.\\d+\\,\s*\\-?\\d+\\.\\d+$'}),
                category: $('<div></div>').addClass('category'),
                submitted: $('<div></div>').addClass('submitted'),
                reviewed: $('<div></div>').addClass('reviewed'),
                navigate: $('<a href="javascript:;">Navigate</a>').addClass('navigate'),
                delete: $('<a href="javascript:;">Delete</a>').addClass('delete')
            };

            this.inputGroup.appendTo(this.elements.panel);
            this.elements.panel.append(this.elements.category);
            this.elements.panel.append(this.elements.submitted);
            this.elements.panel.append(this.elements.reviewed);
            this.elements.panel.append(this.elements.navigate);
            this.elements.panel.append(this.elements.delete);
            this.elements.panel.insertBefore($('#portaldetails'));
            this.elements.panel.hide();
        },

        bind: function() {
            var sidebar = this;

            this.elements.name.bind(function(val){
                sidebar.marker.feature.properties.name = val;
                sidebar.marker.portalName._icon.innerText = val;
            });

            this.elements.latLng.bind(function(val){
                var latLng = L.SeerHelper.Util.ParseLatLng(val);
                if (latLng) sidebar.marker.moveTo(latLng);
            });

            this.elements.navigate.on('click', function(){
                map.setView(sidebar.marker.getLatLng());
            });

            this.elements.delete.on('click', function() {
                sidebar.marker.delete();
                sidebar.elements.panel.hide();
            });

            window.addHook('portalSelected', function(data) {
                if (data.selectedPortalGuid) window.portals[data.selectedPortalGuid].limit.focus();
                sidebar.hide();
            });
        },
    });

    L.SeerHelper.FileLayerLoad = L.Control.FileLayerLoad.extend({
        fileInput: null,

        options: {
            fitBounds: false,
            layerOptions: {pointToLayer: L.SeerHelper.Marker.import},
        },

        onAdd: function (map) {
            var container = L.Control.FileLayerLoad.prototype.onAdd.call(this, map);

            this.loader._loadGeoJSON = function (content) {
                if (typeof content == 'string') {
                    content = JSON.parse(content);
                }
                return L.geoJson(content, L.Util.extend({}, this.options.layerOptions, {
                    style: function (feature) {
                        return feature.properties && feature.properties.style;
                    }
                }));
            };

            this.loader.on('data:loaded', function(ev){
                ev.layer.getLayers().forEach(function(marker) {
                    marker.addToLayerGroup();
                });

                Object.keys(window.plugin.seerHelper.layerGroups).sort().map(function(groupName){
                    if (groupName === window.plugin.seerHelper.literals.limitGroup) return;
                    window.plugin.seerHelper.layerGroups[groupName].addToList();
                });
            }, this);
            return container;
        },

        _initContainer: function () {
            var self = this;
            this.fileInput = L.DomUtil.create('input', 'hidden');
            this.fileInput.type = 'file';
            this.fileInput.accept = '.gpx,.kml,.geojson';
            this.fileInput.style.display = 'none';

            this.fileInput.addEventListener("change", function (e) {
                self.loader.load(this.files[0]);
                self.fileInput.value = '';
            }, false);

            return this.fileInput;
        }
    });

    L.SeerHelper.Feature = L.Handler.extend({
        includes: L.Mixin.Events,

        initialize: function (map, options) {
            this.type = options.type;
        },

        enable: function () {
            L.Handler.prototype.disable.call(this);
        },
    });

    L.SeerHelper.Feature.Load = L.SeerHelper.Feature.extend({
        fileLayerLoad: null,

        initialize: function (map, options) {
            L.SeerHelper.Feature.prototype.initialize.call(this, map, options);
            this.fileLayerLoad = new L.SeerHelper.FileLayerLoad().addTo(map);
        },

        enable: function () {
            L.SeerHelper.Feature.prototype.enable.call(this);
            this.fileLayerLoad.fileInput.click();
        }
    });

    L.SeerHelper.Feature.Draw = L.SeerHelper.Feature.extend({
        enable: function () {
            L.SeerHelper.Feature.prototype.enable.call(this);
            var marker = new L.SeerHelper.Marker(map.getCenter());
            marker.addToLayerGroup();
            marker.layerGroup.addToList();
            marker.layerGroup.enable();
            marker.limit.focus();
            sidebar.show(marker);
        }
    });

    L.SeerHelper.Feature.Save = L.SeerHelper.Feature.extend({
        enable: function () {
            L.SeerHelper.Feature.prototype.enable.call(this);
            alert('Under construction');
        }
    });

    L.SeerHelper.Feature.Clear = L.SeerHelper.Feature.extend({
        enable: function () {
            L.SeerHelper.Feature.prototype.enable.call(this);
            limiter.clearAll();

            for (var l in window.plugin.seerHelper.layerGroups) {
                if (l === window.plugin.seerHelper.literals.limitGroup) continue;

                window.plugin.seerHelper.layerGroups[l].getLayers().forEach(function(marker){
                    if (typeof marker.delete === 'function') marker.delete();
                });

                window.plugin.seerHelper.layerGroups[l].clearLayers();
            }
        }
    });

    L.SeerToolbar = L.Toolbar.extend({
        addToolbar: function (map) {
            var container = L.DomUtil.create('div', 'leaflet-bar'),
                buttonIndex = 0,
                buttonClassPrefix = 'leaflet-seer-button leaflet-seer-button';

            this._initModeHandler(
                new L.SeerHelper.Feature.Load(map, {type: window.plugin.seerHelper.literals.features.load.type}),
                container, buttonIndex++, buttonClassPrefix,
                window.plugin.seerHelper.literals.features.load.label
            );

            this._initModeHandler(
                new L.SeerHelper.Feature.Draw(map, {type: window.plugin.seerHelper.literals.features.draw.type}),
                container, buttonIndex++, buttonClassPrefix,
                window.plugin.seerHelper.literals.features.draw.label
            );

            this._initModeHandler(
                new L.SeerHelper.Feature.Save(map, {type: window.plugin.seerHelper.literals.features.save.type}),
                container, buttonIndex++, buttonClassPrefix,
                window.plugin.seerHelper.literals.features.save.label
            );

            this._initModeHandler(
                new L.SeerHelper.Feature.Clear(map, {type: window.plugin.seerHelper.literals.features.clear.type}),
                container, buttonIndex++, buttonClassPrefix,
                window.plugin.seerHelper.literals.features.clear.label
            );

            return container;
        },
    });

    L.SeerHelper.Control = L.Control.extend({
        options: {
            position: 'topleft',
        },

        onAdd: function (map) {
            var container = L.DomUtil.create('div', 'leaflet-draw');
            var seerToolbar = new L.SeerToolbar().addToolbar(map);
            container.appendChild(seerToolbar);
            return container;
        },
    });

    var limiter = new L.SeerHelper.Limiter(window.plugin.seerHelper.literals.limiter);
    var sidebar = new L.SeerHelper.Sidebar();
    map.addControl(new L.SeerHelper.Control());

    L.SeerHelper.LayerGroup.create(window.plugin.seerHelper.literals.limitGroup).addToList();

    map.on('layeradd', function(data){
        if (data.layer.groupName === window.plugin.seerHelper.literals.limitGroup) {
            limiter.show();
        }

        if (data.layer instanceof L.CircleMarker) {
            limiter.addLimit(data.layer);
        }

        if (data.layer instanceof L.SeerHelper.Marker) {
            data.layer.render();
        }
    });

    map.on('layerremove', function(data){
        if (data.layer.groupName === window.plugin.seerHelper.literals.limitGroup) {
            limiter.hide();
        }

        if (data.layer instanceof L.CircleMarker) {
            limiter.removeLimit(data.layer);
        }

        if (data.layer instanceof L.SeerHelper.Marker) {
            if (sidebar.marker && sidebar.marker.options.guid === data.layer.options.guid) sidebar.hide();
        }
    });

    window.addHook('mapDataRefreshEnd', function(data) {
        limiter.checkAll();
    });

    map.on('mouseup', function() {
        map.dragging.enable();
        map.removeEventListener('mousemove');
    });
};

window.plugin.seerHelper.setCSS = function(){
    $('head').append('<style>' +
    '.leaflet-control .leaflet-control { margin-left: 0; }'+
    '.leaflet-bar a.leaflet-seer-button { background: #ffffff url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAABoCAYAAADvoOAEAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyFpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIChXaW5kb3dzKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDoxRUVFQzBDMkRCNzQxMUU4QTA5RTkyMzgyMEVFMDBBNiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDoxRUVFQzBDM0RCNzQxMUU4QTA5RTkyMzgyMEVFMDBBNiI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjFFRUVDMEMwREI3NDExRThBMDlFOTIzODIwRUUwMEE2IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjFFRUVDMEMxREI3NDExRThBMDlFOTIzODIwRUUwMEE2Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+k+zsaQAACf1JREFUeNrsWntwVNUZ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) center top no-repeat; }'+
    '.leaflet-bar a.leaflet-seer-button-load {background-position: center 0px} '+
    '.leaflet-bar a.leaflet-seer-button-draw {background-position: center -26px} '+
    '.leaflet-bar a.leaflet-seer-button-save {background-position: center -52px} '+
    '.leaflet-bar a.leaflet-seer-button-clear {background-position: center -78px} '+
    '#seerHelperPanel input[type="text"] {width: 100%;}' +
    '#seerHelperPanel > * {margin: 2.5px 5px; }' +
    '#seerHelperPanel .name {font-size: 24px;}' +
    '#seerHelperPanel > .editable { line-height: 26px; }' +
    '#seerHelperPanel .editable:after {content: ""; clear: left; display: block;} ' +
    '#seerHelperPanel .editable > * {display: block; cursor: pointer;} ' +
    '#seerHelperPanel .editable i {position: absolute; margin: 2.5px 2.5px 2.5px 0; width: 26px; height: 26px; background-color: rgba(255, 255, 255, 0.5); border-radius: 50%; background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANIAAAAeCAYAAABZs0CNAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAtVJREFUeNrsmlFy2jAQhkWG93CD0hM0PUHhhdfADeAECScInAA4QblBeOYFcoK6Jyg5QdwTtLvp747GhNgmWttx/m/GY42s8Uqy/l1JlnOEEEIIIYQQQgghhBBCCCGEHNNiF5C6MxgMOnIbb7fbpcG7Z3K7S2XPxdasyHvaASv0J0lLJVpGDb6Ra4OGHho+eLpyG8rVQVasbbduNwat2u0i6wC7sbHNq3S+2Nzj2U6fS/qL5E0MqvBfOBhn1UQkNPZJBaSCCi0keedYbt9T2WtLQfmO4TWMnMat3BYnHk8tPDPs6mC+90TkPDGNxG5kICC113vhsX7fKdLaFzoGJlKHtVEUyhSZqZB8j2ExuE6IyFxQVQkpQ0RmYsJ3/AERafRZ4dENoqL279eQkUls7iCiA64EFewc40rp6/jSCFXXGUQ7oIi08f3AHZ0lIgdPNW7Ceg/TuUWOogspG3qa50/n+kn0UTuewIZwXKF4FpHY+pzhnHtSZlPC2uisaPQmIdVERE1jWLBsyKjU9aJs5KflWxyVCcgmQ0STVLQKujYK9aKLOooIFBFR1BAhdYzKnrNWOkoLlwbmfmeIKPKmeLXloqYicgWnEHFDhPSpQtt+H+506oPpjz+IH43rcOuLCBsLQ0unUYmQShRREnbzvvuhIUL6WaHzWKei3R2uzpnO7S0E2Z2rpZBKFpHDQnr1wSLSxqhsnv6OM9YMc8vvjTrMdBf0vYkot5CwFfxUlog8ljlF0og1EpzHNEfRqdH/s+WJhf0h8MaGz3We59jRrC3tAh+5BUGVJaJnLyk2V+71bcrY2e3qVCGmJXbJSv8hi/4eYebhn6gYGX3zvVw9/E96aXr+Dc57X/eTLLn+vVgf/8lh/5f7t/W6h2gekY7KEnUFbe66Co4IwXZywsE5gxMNqeXCqZMNvtiCCzn0fyRCCCGEEEIIIYQQQgghhBBCCCFG/BVgAMuWWtfqVjkMAAAAAElFTkSuQmCC); background-repeat: no-repeat; background-position: -152px -2px;}' +
    '#seerHelperPanel .editable i:hover {background-color: rgba(255, 255, 255, 0.75);}' +
    '#seerHelperPanel .editable a {text-decoration: none; outline: none; padding: 2.5px 5px; margin-left: 29.5px; }' +
    '#seerHelperPanel .editable a[contenteditable="true"] {background: rgba(0, 0, 0, 0.3); outline: 1px solid #20a8b1; cursor: text;}' +
    '#seerHelperPanel .editable.error a {outline: 1px solid red !important;}' +
    '</style>');
};

var setup = function() {
    if (window.plugin.drawTools === undefined) {
        alert("'Seer helper' requires 'Draw tools'");
        return;
    }

    if (window.plugin.overlayKML === undefined) {
        alert("'Seer helper' requires 'Overlay KML'");
        return;
    }

    window.plugin.seerHelper.setup();
    window.plugin.seerHelper.setCSS();
}

// PLUGIN END //////////////////////////////////////////////////////////

setup.info = plugin_info; //add the script info data to the function as a property
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);
