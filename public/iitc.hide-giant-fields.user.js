// ==UserScript==
// @id             iitc.hide-giant-fields@anmiles
// @name           IITC Plugin: Hide giant fields
// @namespace      ingress
// @version        0.1.3.20210131.0
// @updateURL      https://anmiles.net/userscripts/iitc.hide-giant-fields.user.js
// @downloadURL    https://anmiles.net/userscripts/iitc.hide-giant-fields.user.js
// @description    Hide fields, every side of which are longer than the diagonal of the screen
// @description:ru Скрывает поля, которые не влезают в диагональ экрана
// @author         Anatoliy Oblaukhov
// @include        https://*.ingress.com/intel*
// @include        http://*.ingress.com/intel*
// @match          https://*.ingress.com/intel*
// @match          http://*.ingress.com/intel*
// @include        https://*.ingress.com/mission/*
// @include        http://*.ingress.com/mission/*
// @match          https://*.ingress.com/mission/*
// @match          http://*.ingress.com/mission/*
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'iitc';
plugin_info.dateTimeVersion = '20180701.5';
plugin_info.pluginId = 'hide-giant-fields';
//END PLUGIN AUTHORS NOTE


//PLUGIN START ////////////////////////////////////////////////////////

//use own namespace for plugin
window.plugin.hideGiantFields = function() {};

window.plugin.hideGiantFields.addHideGiantFieldsButton = function()
{
    setTimeout(function(){$('#toolbox').append($('<a onclick="window.plugin.hideGiantFields.run();">Hide giant fields</a>'));}, 0);
};

window.plugin.hideGiantFields.run = function()
{
    try {
        var mapDiagonal = map.getBounds().getNorthEast().distanceTo(map.getBounds().getSouthWest());
        var hidden = 0;

        field:
        for (var guid in fields) {
            var latLngs = fields[guid].getLatLngs();

            for (var i = 0; i < latLngs.length - 1; i ++) {
                for (var j = i + 1; j < latLngs.length; j ++) {
                    if (latLngs[i].distanceTo(latLngs[j]) < mapDiagonal) {
                        continue field;
                    }
                }
            }

            map.removeLayer(fields[guid]);
            delete fields[guid];
            hidden++;
        }

        alert(hidden + ' giant fields hidden!');
    } catch (ex) {
        alert(ex.message);
    }
};

var setup = function()
{
    window.plugin.hideGiantFields.addHideGiantFieldsButton();
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
