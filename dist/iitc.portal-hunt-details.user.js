// ==UserScript==
// @id             portal-hunt-details@anmiles
// @name           IITC plugin: Portal Hunt details
// @namespace      ingress
// @version        1.0.1
// @updateURL      https://anmiles.net/userscripts/iitc.portal-hunt-details.user.js
// @downloadURL    https://anmiles.net/userscripts/iitc.portal-hunt-details.user.js
// @description    Output a line with portal details for copying to Portal Hunt spreadsheet
// @description:ru Показывает строку с деталями портала для копирования в таблицу Portal Hunt
// @section        Ingress
// @author         Anatoliy Oblaukhov
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
plugin_info.buildName = 'anmiles';
plugin_info.dateTimeVersion = '20230503.1343';
plugin_info.pluginId = 'portal-hunt-details';
//END PLUGIN AUTHORS NOTE


//PLUGIN START ////////////////////////////////////////////////////////

//use own namespace for plugin
window.plugin.portalHuntDetails = function() {};

window.plugin.portalHuntDetails.getAbsoluteURL = function(relativeURL) {
    var absoluteLink = document.createElement("a");
    absoluteLink.href = relativeURL;
    return absoluteLink.href;
};

window.plugin.portalHuntDetails.onPortalDetailsUpdated = function()
{
    var guid = window.selectedPortal;
    var data =  window.portals[guid].options.data;

    var lat = data.latE6/1E6;
    var lng = data.lngE6/1E6;
    var permalink = '/intel?ll=' + lat + ',' + lng + '&z=17&pll=' + lat + ',' + lng;
    var url = window.plugin.portalHuntDetails.getAbsoluteURL(permalink);

    $('.linkdetails').after($('<input type="text" />').css({width: '100%'}).val(data.title + '\t' + PLAYER.nickname + '\t' + url));
};

var setup = function()
{
    window.addHook('portalDetailsUpdated', window.plugin.portalHuntDetails.onPortalDetailsUpdated);
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
