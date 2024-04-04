// ==UserScript==
// @name         Fandom - Copy JSON of Fallout page
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @author       You
// @match        https://fallout.fandom.com/ru/wiki/*
// @grant        none
// ==/UserScript==

setTimeout(async function(){
    const copyLink = document.createElement('a');
    copyLink.className = 'wds-button wds-is-text page-header__action-button has-label';
    copyLink.innerHTML = 'JSON';

    const point = { links: {}, titles: {} };
    point.links.ru = location.href;
    point.titles.ru = $('#firstHeading').text().trim();
    const engLink = $('.wds-list [data-tracking-label="lang-en"]').get(0);

    if (engLink) {
        debugger;
        await $.get(engLink.href).then(html => {
            point.links.en = engLink.href;
            point.titles.en = $.parseHTML(html).filter(el => el.className === 'main-container').pop().querySelector('h1').innerText.trim();
        }).catch(() => {});
    }

    async function copyJSON(){
        try {
            navigator.clipboard.writeText(JSON.stringify(point));
            copyLink.style.background = '#80ff80';
        } catch {
            copyLink.style.background = '#ff8080';
        }

        setTimeout(function(){
            copyLink.style.background = 'none';
        }, 300);
    }

    copyLink.onclick = copyJSON;
    copyLink.style.transition = 'all 0.3s';
    const list = document.querySelector('.page-header__actions');
    list.insertBefore(copyLink, list.childNodes[0]);
}, 300);
