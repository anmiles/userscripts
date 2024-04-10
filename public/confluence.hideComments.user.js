// ==UserScript==
// @name           Confluence - show/hide comments
// @namespace      confluence
// @version        0.1.6
// @updateURL      https://anmiles.net/userscripts/confluence.hideComments.user.js
// @downloadURL    https://anmiles.net/userscripts/confluence.hideComments.user.js
// @description    Show or hide comments and comment trees on the bottom of Confluence page
// @description:ru Показывать и скрывать комментарии и ветки комментариев внизу страницы Confluence
// @author         Anatoliy Oblaukhov
// @match          https://wiki.wildapricot.com/*
// @grant          none
// ==/UserScript==

(function($){
    var waitInterval = setInterval(function(){
        var username = AJS.Data.get('remote-user');
        var pageId = AJS.Data.get('content-id');
        if (typeof username === 'undefined' || typeof pageId === 'undefined') return;
        clearInterval(waitInterval);

        var localStorageKey = 'confluence.' + username + '.confluence-comment-hide';
        var hiddenCommentsString = localStorage[localStorageKey] || '{}';
        var hiddenComments = JSON.parse(hiddenCommentsString);
        var exceptionShown = false;

        setInterval(function(){
            $('.comment:not(.hidable)').each(function(i, comment) {
                var commentId = comment.id.replace('comment-', '');
                var isHidden = (hiddenComments[pageId] || []).indexOf(commentId) !== -1;
                var toggle = $('<a href></a>').css('float', 'right');

                toggle.click(function(){
                    try {
                        if (toggle.parent().length > 0) {
                            isHidden = !isHidden;
                            hiddenComments[pageId] = hiddenComments[pageId] || [];
                            isHidden ? hiddenComments[pageId].push(commentId) : hiddenComments[pageId].splice(hiddenComments[pageId].indexOf(commentId), 1);
                            localStorage[localStorageKey] = JSON.stringify(hiddenComments);
                        }

                        $(comment).find('.comment-body').toggleClass('hidden', isHidden).css('opacity', isHidden ? 0.5 : 1);
                        $(comment).siblings('ol.comment-threads').toggleClass('hidden', isHidden);
                        $(toggle).html(isHidden ? 'Show' : 'Hide').blur();
                    } catch (ex) {
                        if (!exceptionShown) {
                            exceptionShown = true;
                            alert('Error when show/hide comment: ' + ex);
                        }

                        console.error(ex);
                    }
                    return false;
                }).click();

                $(comment).addClass('hidable').find('.comment-header .author').append(toggle);
            });
        }, 500);
    }, 500);
})(jQuery);
