// ==UserScript==
// @name           Jira Cloud - Homepage
// @namespace      jira.cloud
// @version        0.1.2
// @updateURL      https://anmiles.net/userscripts/jira.cloud.homepage.user.js
// @downloadURL    https://anmiles.net/userscripts/jira.cloud.homepage.user.js
// @description    Link top left logo to something you often needed
// @description:ru Линкует лого в левом верхнем углу на страницу/доску, которую вы чаще всего посещаете
// @author         Anatoliy Oblaukhov
// @match          https://*.atlassian.net/*
// @grant          none
// ==/UserScript==

var logoWaiter = setInterval(function(){
    var logo = jQuery('header nav a[href="/jira"]');
    if (!logo) return;
    var href = '/secure/RapidBoard.jspa?rapidView=78';
    logo.attr('href', href).off('click').on('click', function(){
        location.href = '/secure/RapidBoard.jspa?rapidView=78';
    });
}, 100);
