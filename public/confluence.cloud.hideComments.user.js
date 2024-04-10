// ==UserScript==
// @name           Confluence Cloud - show/hide comments
// @namespace      confluence.cloud
// @version        0.1.3
// @updateURL      https://anmiles.net/userscripts/confluence.cloud.hideComments.user.js
// @downloadURL    https://anmiles.net/userscripts/confluence.cloud.hideComments.user.js
// @description    Show or hide comments and comment trees on the bottom of Confluence page
// @description:ru Показывать и скрывать комментарии и ветки комментариев внизу страницы Confluence
// @author         Anatoliy Oblaukhov
// @match          https://*.atlassian.net/wiki/*
// @grant          none
// ==/UserScript==

(function($){
    var waitInterval = setInterval(function(){
        if (typeof AJS === 'undefined') return;
        var username = AJS.Data.get('remote-user');
        var pageId = AJS.Data.get('content-id');
        if (typeof username === 'undefined' || typeof pageId === 'undefined') return;
        clearInterval(waitInterval);

        var localStorageKey = 'confluence.' + username + '.confluence-comment-hide';
        var hiddenCommentsString = localStorage[localStorageKey] || '{}';
        var hiddenComments = JSON.parse(hiddenCommentsString);
        var exceptionShown = false;

        setInterval(function(){
            $('.fabric-comment:not(.hidable)').each(function(i, comment) {
                var commentId = comment.id.replace('comment-', '');
                var isHidden = (hiddenComments[pageId] || []).indexOf(commentId) !== -1;
                var toggle = $('<a href></a>').css({color: '#707070'});

                toggle.click(function(){
                    try {
                        if (toggle.parent().length > 0) {
                            isHidden = !isHidden;
                            hiddenComments[pageId] = hiddenComments[pageId] || [];
                            isHidden ? hiddenComments[pageId].push(commentId) : hiddenComments[pageId].splice(hiddenComments[pageId].indexOf(commentId), 1);
                            localStorage[localStorageKey] = JSON.stringify(hiddenComments);
                        }

                        $(toggle).html(isHidden ? 'Show' : 'Hide').blur();

                        $(comment).find('.wiki-content').parent().toggleClass('hidden', isHidden).css('opacity', isHidden ? 0.5 : 1);
                        $(comment).find('.CommentActions_actions_Hnn').parent().toggleClass('hidden', isHidden).css('opacity', isHidden ? 0.5 : 1);
                        $(comment).css('margin-bottom', isHidden ? '12px' : '24px');

                        var marginLeft = parseInt($(comment).css('margin-left'));
                        var nextComment = $(comment);

                        while (true) {
                            nextComment = nextComment.next();
                            if (nextComment.length === 0) break;
                            if (parseInt(nextComment.css('margin-left')) <= marginLeft) break;
                            nextComment.toggle(!isHidden);
                        }

                    } catch (ex) {
                        if (!exceptionShown) {
                            exceptionShown = true;
                            alert('Error when show/hide comment: ' + ex);
                        }

                        console.error(ex);
                    }
                    return false;
                }).click();

                $(comment).addClass('hidable').find('[data-cy="comment-author"]').parent().attr('style', 'flex-grow: 1').after(toggle);
            });
        }, 500);
    }, 500);

    $('<style type="text/css"></style>')
    .text('\
.fabric-comment:hover { background: #f5faff; border-radius: 16px 0 0 0; }\
').appendTo('head');

})(jQuery);
