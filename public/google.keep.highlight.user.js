// ==UserScript==
// @name           Google Keep highlight
// @namespace      google.keep
// @version        0.1.3
// @updateURL      https://anmiles.net/userscripts/google.keep.highlight.user.js
// @downloadURL    https://anmiles.net/userscripts/google.keep.highlight.user.js
// @description    Highlight blocks with unchecked items
// @description:ru Подсвечивает блоки, в которых есть незаконченные дела
// @section        Google Keep
// @author         You
// @match          https://keep.google.com/*
// @grant          none
// ==/UserScript==

setInterval(() => {
    document.querySelectorAll('.ma6Yeb-r8s4j-gkA7Yd .IZ65Hb-n0tgWb.RNfche').forEach(block => {
        const hasFinishedTasks = block.querySelectorAll('.NYTeh-tJHJj').length > 0;
        const hasUnfinishedTasks = block.querySelectorAll('div[role="checkbox"][aria-checked="false"]').length > (hasFinishedTasks ? 1 : 0);
        block.style.opacity = hasUnfinishedTasks ? 1 : 0.3;
        block.style.boxShadow = hasUnfinishedTasks ? '0 0 4px 2px #808080' : 'none'
    });
}, 1000);
