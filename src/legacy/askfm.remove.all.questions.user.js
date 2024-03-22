// ==UserScript==
// @name           AskFM remove all questions except just recieved ones
// @namespace      ask.fm
// @version        1.0.4
// @updateURL      https://anmiles.net/userscripts/askfm.remove.all.questions.user.js
// @downloadURL    https://anmiles.net/userscripts/askfm.remove.all.questions.user.js
// @description    Remove all questions except just received but still not shown until next page refresh
// @description:ru Удаляет все вопросы, которые в данный момент на экране
// @author         Anatoliy Oblaukhov
// @match          https://ask.fm/account/inbox
// @grant          none
// ==/UserScript==

setInterval(function() {
    if ($('.icon-delete-except').length > 0) return;

    $('#questions-delete').removeAttr('data-action').removeAttr('href').css({'cursor': 'not-allowed'});

    $('<a class="btn-primary-icon icon-delete-except icon-delete util-float-right rsp-gte-tablet"></a>')
        .css({
            'padding-right': 0,
            'margin-left': '10px',
            'background': 'grey'
        })
        .insertBefore($('.icon-random'))
        .click(() => {
            $('.item .icon-delete').click();
            return false;
        });
}, 500);
