// ==UserScript==
// @name           Jira - Homepage
// @namespace      jira
// @version        0.1.2
// @updateURL      https://anmiles.net/userscripts/jira.homepage.user.js
// @downloadURL    https://anmiles.net/userscripts/jira.homepage.user.js
// @description    Link top left logo to something you often needed
// @description:ru Линкует лого в левом верхнем углу на страницу/доску, которую вы чаще всего посещаете
// @author         Anatoliy Oblaukhov
// @match          https://jira.wildapricot.com/*
// @grant          none
// ==/UserScript==

jQuery('h1 a').attr('href', '/secure/RapidBoard.jspa?rapidView=212&quickFilter=1213');
