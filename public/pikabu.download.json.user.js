// ==UserScript==
// @name           Pikabu - download saved stories
// @namespace      pikabu
// @version        0.1.0
// @updateURL      https://anmiles.net/userscripts/pikabu.download.json.user.js
// @downloadURL    https://anmiles.net/userscripts/pikabu.download.json.user.js
// @description    Downloads JSON file with all saved stories
// @description:ru Скачивает JSON файл со всеми сохранёнными статьями
// @author         anmiles
// @match          https://pikabu.ru/*
// @require        https://code.jquery.com/jquery-3.4.1.min.js
// @grant          none
// ==/UserScript==

String.prototype.regexEscape = function() {
	return this.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
};

($ => {
    const fetchInterval = 500;

    async function save() {
        const saved = $('<div></div>').html('<style>* { font-family: "Segoe UI", "Roboto", "Helvetica", sans-serif; } li { padding: 0.5em 0; }</style><h1>Пикабу</h1>');
        const nickname = $('.avatar img').attr('alt');
        const html = await get('https://pikabu.ru/saved-stories');
        const regex = new RegExp(`pikabu\\.ru\\/@${nickname.regexEscape()}\\/saved\\/(\\d+)`, 'g');
        const allIds = [...html.matchAll(regex)].map(m => parseInt(m[1]));
        const ids = [... new Set(allIds)].sort();

        for (const id of ids) {
            const json = JSON.parse(await get(`https://pikabu.ru/ajax/saved-stories/${id}`));

            const sectionTitle = json.data.title.replace(/ - Сохранённое$/, '');
            const heading = $('<h2></h2>').text(sectionTitle);
            saved.append(heading);

            const section = $('<ul></ul>');

            for (const story of json.data.stories) {
                const storyTitleHTML = story.html.match(/story__title-link.*?>(.*?)</)[1];
                const storyLinkMatch = story.html.match(/story__title.*?><a href="(.*?)"/);
                if (!storyLinkMatch) continue;
                const storyLink = storyLinkMatch[1];

                const item = $('<li></li>');
                const link = $('<a></a>').attr('href', storyLink).html(storyTitleHTML);
                item.append(link);
                section.append(item);
            }

            saved.append(section);
        }

        $('<a></a>').attr("href", "data:text/json;charset=utf-8," + encodeURIComponent(saved.html())).attr("download", "pikabu.html").get(0).click();
    }

    async function sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    async function get(url) {
        console.log('FETCH', url);
        sleep(fetchInterval);
        return fetch(url).then(t => t.text());
    }

    $('<a></a>')
        .html('<svg xmlns="http://www.w3.org/2000/svg" class="icon icon--ui__save"><use xlink:href="#icon--ui__save"></use></svg>')
        .addClass('header-right-menu__item header-right-menu__notification')
        .appendTo('.header-right-menu')
        .attr('href', 'javascript:;')
        .click(save);

})(jQuery.noConflict());
