// ==UserScript==
// @id             fsguesshelper@anmiles
// @name           IITC Plugin: FS Guess Helper
// @namespace      ingress
// @version        2.1.1
// @updateURL      https://anmiles.net/userscripts/iitc.fs-guess-helper.user.js
// @downloadURL    https://anmiles.net/userscripts/iitc.fs-guess-helper.user.js
// @description    Tool for guessing FS portals
// @description:ru Инструмент для разгадывания порталов FS
// @author         Anatoliy Oblauhov
// @include        https://intel.ingress.com/*
// @include        http://intel.ingress.com/intel*
// @include        https://*.ingress.com/mission/*
// @include        http://*.ingress.com/mission/*
// @match          https://*.ingress.com/mission/*
// @match          http://*.ingress.com/mission/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'iitc';
plugin_info.dateTimeVersion = '20230503.1343';
plugin_info.pluginId = 'fsguesshelper';
//END PLUGIN AUTHORS NOTE


//PLUGIN START ////////////////////////////////////////////////////////

//use own namespace for plugin

window.plugin.fsguesshelper = function() {};
window.plugin.fsguesshelper.fsRadiusMeters = 2000;
window.plugin.fsguesshelper.zoom = 15;
window.plugin.fsguesshelper.maxTilesPerRequest = 25;
window.plugin.fsguesshelper.searchThreshold = 200;

window.plugin.fsguesshelper.langs = {
    en: {
        loadingPortals: `Loading all portals in ${window.plugin.fsguesshelper.fsRadiusMeters} meters around registration portal "<span id="plugin-fsguesshelper-portal"></span>" (<span id="plugin-fsguesshelper-tiles"></span> tiles remaining)`,
        copyPaste: 'Copy the line above and insert into "IngressFS Portal Hunt" table right into "Portal name" cell. Multiple cells will be automatically spanned.',
        allPortals: 'Here are all the portals inside specified circle. Click any photo to get the line of text for "IngressFS Portal Hunt" table',
        gotit: 'Got it',
    },
    ru: {
        loadingPortals: `Загрузка всех порталов в ${window.plugin.fsguesshelper.fsRadiusMeters} метрах вокруг регистрационного портала "<span id="plugin-fsguesshelper-portal"></span>" (осталось <span id="plugin-fsguesshelper-tiles"></span> тайлов)`,
        copyPaste: 'Скопируйте текст выше и вставьте в таблицу "IngressFS Portal Hunt" прямо в ячейку Portal name. Несколько значений будут автоматически распределены по остальным ячейкам.',
        allPortals: 'Это все порталы внутри радиуса. Кликните на любое фото, чтобы показать строку для в гугл таблицу "IngressFS Portal Hunt"',
        gotit: 'Понятно',
    }
}

window.plugin.fsguesshelper.lang = window.plugin.fsguesshelper.langs[['ru', 'uk', 'be', 'kk'].indexOf(navigator.language) === -1 ? 'en' : 'ru'];

window.plugin.fsguesshelper.getDistance = function(portal1, portal2) {
    const latLng1 = portal1.getLatLng();
    const latLng2 = portal2.getLatLng();
    const cat1 = (latLng2.lat - latLng1.lat) * 40100 / 360;
    const cat2 = (latLng2.lng - latLng1.lng) * 40100 * Math.cos(latLng2.lat * Math.PI / 180) / 360;
    return Math.sqrt(cat1 * cat1 + cat2 * cat2);
};

window.plugin.fsguesshelper.tryAddFSPortal = function(data){
    const distance = window.plugin.fsguesshelper.getDistance(window.plugin.fsguesshelper.registrationPortal, data.portal);

    if(distance <= window.plugin.fsguesshelper.fsRadiusMeters / 1000) {
        window.plugin.fsguesshelper.fsPortals[data.portal.options.guid] = window.plugin.fsguesshelper.fsPortals[data.portal.options.guid] || data.portal;
    }
};

window.plugin.fsguesshelper.loadPortals = async function(){
    window.addHook('portalAdded', window.plugin.fsguesshelper.tryAddFSPortal);

    window.plugin.fsguesshelper.fsPortals = {};
    window.plugin.fsguesshelper.registrationPortal = window.portals[window.selectedPortal];

    const tileParams = getMapZoomTileParameters(window.plugin.fsguesshelper.zoom);
    const circle = L.circle(window.plugin.fsguesshelper.registrationPortal.getLatLng(), window.plugin.fsguesshelper.fsRadiusMeters);
    const bounds = circle.getBounds();

    const x1 = window.lngToTile(bounds.getWest(), tileParams);
    const x2 = window.lngToTile(bounds.getEast(), tileParams);
    const y1 = window.latToTile(bounds.getNorth(), tileParams);
    const y2 = window.latToTile(bounds.getSouth(), tileParams);

    const tiles = [];
    const tileGroups = [];

    for (var y = y1; y <= y2; y++) {
        for (var x = x1; x <= x2; x++) {
            const tile_id = window.pointToTileId(tileParams, x, y);
            tiles.push(tile_id);
        }
    }

    window.plugin.fsguesshelper.dialog = dialog({
        html: window.plugin.fsguesshelper.lang.loadingPortals,
        id: 'plugin-fsguesshelper-loading',
        dialogClass: 'ui-dialog-fsguesshelperLoading',
        title: 'FS Guess Helper',
        buttons: [],
    });

    $('#plugin-fsguesshelper-portal').text(window.plugin.fsguesshelper.registrationPortal.options.data.title);
    $('#plugin-fsguesshelper-tiles').text(tiles.length);

    await window.plugin.fsguesshelper.requestTiles(tiles, ent => {
        if (ent[2][0] !== 'p') {
            return;
        }

        if (ent[0] in window.portals) {
            window.plugin.fsguesshelper.tryAddFSPortal({ portal: window.portals[ent[0]] });
            return;
        }

        window.mapDataRequest.render.createPortalEntity(ent);
    });

    window.plugin.fsguesshelper.done();
};

window.plugin.fsguesshelper.requestTiles = async function(tiles, callback) {
    return new Promise((resolve, reject) => {
        const tileKeys = tiles.slice(0, window.plugin.fsguesshelper.maxTilesPerRequest);

        window.postAjax('getEntities', { tileKeys }, async data => {
            for (const tile_id in data.result.map) {
                if (data.result.map[tile_id].gameEntities) {
                    for (const ent of data.result.map[tile_id].gameEntities) {
                        callback(ent);
                    }

                    tiles.splice(tiles.indexOf(tile_id), 1);
                    $('#plugin-fsguesshelper-tiles').text(tiles.length);
                }
            }

            if (tiles.length > 0) {
                await window.plugin.fsguesshelper.requestTiles(tiles, callback);
            }

            resolve();
        }, err => reject(err));
    });
}

window.plugin.fsguesshelper.getAbsoluteURL = function(relativeURL) {
    var absoluteLink = document.createElement("a");
    absoluteLink.href = relativeURL;
    return absoluteLink.href;
};

window.plugin.fsguesshelper.showPortalDetails = function(guid) {
    var data = window.plugin.fsguesshelper.fsPortals[guid].options.data;
    var lat = (data.latE6/1E6).toFixed(6);
    var lng = (data.lngE6/1E6).toFixed(6);
    var permalink = '/intel?ll=' + lat + ',' + lng + '&z=17&pll=' + lat + ',' + lng;
    var url = window.plugin.fsguesshelper.getAbsoluteURL(permalink);

    if (window.plugin.fsguesshelper.detailsDialog) window.plugin.fsguesshelper.detailsDialog.dialog('close');

    window.plugin.fsguesshelper.detailsDialog = dialog({
        html: '<input type="text" /><br /><span class="description"></span>',
        id: 'plugin-fsguesshelper-details',
        dialogClass: 'ui-dialog-fsguesshelperDetails',
        title: 'FS Guess Helper',
        closeCallback: function(){ delete window.plugin.fsguesshelper.detailsDialog; }
    });

    window.plugin.fsguesshelper.detailsDialog.find('input').val(data.title + '\t' + PLAYER.nickname + '\t' + url).focus();
    window.plugin.fsguesshelper.detailsDialog.find('.description').text(window.plugin.fsguesshelper.lang.copyPaste);
};

window.plugin.fsguesshelper.normalizeTitle = function(title) {
    return title.toLowerCase().replace(/ё/g, 'е');
}

window.plugin.fsguesshelper.done = function(){
    $(window.plugin.fsguesshelper.dialog).dialog('close');
    const overlay = $('<div></div>').addClass('fsguesshelper-overlay');
    const imgs = $('<div></div>').addClass('fsguesshelper-imgs');

    for (const guid in window.plugin.fsguesshelper.fsPortals) {
        const img = $('<img></img>').attr('src', window.plugin.fsguesshelper.fsPortals[guid].options.data.image);
        const latLng = window.plugin.fsguesshelper.fsPortals[guid].getLatLng();
        $('<a></a>')
            .attr('data-guid', guid)
            .attr('data-title', window.plugin.fsguesshelper.normalizeTitle(window.plugin.fsguesshelper.fsPortals[guid].options.data.title))
            .attr('href', 'javascript:window.plugin.fsguesshelper.showPortalDetails("' + guid + '")').append(img).appendTo(imgs);
    }

    imgs.appendTo(overlay);
    overlay.appendTo('body');

    const searchBox = $('<input type="text" placeholder="Search..." />').addClass('fsguesshelper-search').appendTo('.fsguesshelper-overlay');

    searchBox.off('keyup').on('keyup', function(ev){
        if (window.plugin.fsguesshelper.searchTimeout) clearTimeout(window.plugin.fsguesshelper.searchTimeout);
        window.plugin.fsguesshelper.searchTimeout = setTimeout(function(){
            const searchTerm = ev.target.value.trim();

            if (!searchTerm) {
                $('.fsguesshelper-imgs a').show();
                return;
            }

            const searchTerms = searchTerm.split(/\s+/).map(term => window.plugin.fsguesshelper.normalizeTitle(term));

            $('.fsguesshelper-imgs a').map(function(i, a) {
                const title = a.getAttribute('data-title').replace(/ё/g, 'е');
                $(a).toggle(searchTerms.filter(term => !title.includes(term)).length === 0);
            });

        }, window.plugin.fsguesshelper.searchThreshold);
    });

    window.plugin.fsguesshelper.allPortalsDialog = dialog({
        html: '<p>' + window.plugin.fsguesshelper.lang.allPortals + '</p><a onclick="window.plugin.fsguesshelper.allPortalsDialog.dialog(\'close\');return false;" tabindex="0">' + window.plugin.fsguesshelper.lang.gotit + '</a>',
        id: 'plugin-fsguesshelper-done',
        dialogClass: 'ui-dialog-fsguesshelperDone',
        title: 'FS Guess Helper',
        buttons: [],
    });
}

window.plugin.fsguesshelper.setStyle = function(){
    $("<style>")
        .prop("type", "text/css")
        .html("\
.fsguesshelper-overlay {\
    position: fixed;\
    top: 0;\
    left: 0;\
    width: 100%;\
    height: 100%;\
    z-index: 65534;\
    overflow-y: scroll;\
    background: white;\
    padding-top: 32px;\
    border-left: 1px solid #cccccc;\
    box-sizing: border-box;\
}\
.fsguesshelper-overlay ~ .ui-dialog {\
    z-index: 65535;\
}\
.fsguesshelper-imgs {\
    width: 100%;\
    display: flex;\
    flex-wrap: wrap;\
    overflow-y: scroll;\
    background: white;\
    border-left: 1px solid #cccccc;\
    box-sizing: border-box;\
}\
input[type=\"text\"].fsguesshelper-search {\
    position: fixed;\
    top: 0;\
    left: 0;\
    width: 100%;\
    height: 2em;\
    line-height: 2em;\
    font-size: 16px;\
    padding: 0 0.5em;\
    border: 1px solid #cccccc;\
    outline: none;\
    box-sizing: border-box;\
    background: #eeeeee;\
    color: #333333;\
}\
input[type=\"text\"].fsguesshelper-search:focus {\
    background: #ffffff;\
}\
.fsguesshelper-imgs a {\
    width: 10%;\
    height: 10vw;\
    border: 1px solid #cccccc;\
    border-width: 0 1px 1px 0;\
    box-sizing: border-box;\
    display: flex;\
    justify-content: center;\
    align-items: center;\
}\
.fsguesshelper-imgs a img {\
    max-width: 100%;\
    max-height: 100%;\
}\
.fsguesshelper-details {\
    width: 100%;\
    border: 1px solid red;\
}\
#dialog-plugin-fsguesshelper-done {\
    min-height: 0 !important;\
}\
#dialog-plugin-fsguesshelper-done a {\
    display: block;\
    color: #ffce00;\
    border: 1px solid #ffce00;\
    padding: 12px;\
    margin: 12px;\
    width: 80%;\
    text-align: center;\
    background: rgba(8,48,78,.9);\
}\
#dialog-plugin-fsguesshelper-details {\
    min-height: 0 !important;\
    max-width: none !important;\
}\
#dialog-plugin-fsguesshelper-details input {\
    width: 100%;\
    border: 1px solid #20a8b1;\
    font-size: 16px;\
    padding: 12px;\
    height: auto;\
}\
#dialog-plugin-fsguesshelper-details .description {\
    display: block;\
    padding: 12px;\
}\
.ui-dialog-fsguesshelperDetails {\
    width: 1100px !important;\
    margin-left: -400px;\
}\
").appendTo("head");
};

var setup = function() {
    window.addHook('portalDetailsUpdated', () => {
        $('.linkdetails').append('<aside><a id="fsguesshelperlink" onclick="window.plugin.fsguesshelper.loadPortals()" href="javascript:;">FS Portals</a></aside>');
    });
    window.plugin.fsguesshelper.setStyle();
};

//PLUGIN END //////////////////////////////////////////////////////////


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
    