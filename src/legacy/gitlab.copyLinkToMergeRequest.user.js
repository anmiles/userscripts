// ==UserScript==
// @name           Gitlab - Copy link to merge request
// @namespace      gitlab
// @version        6.0.1
// @updateURL      https://anmiles.net/userscripts/gitlab.copyLinkToMergeRequest.user.js
// @downloadURL    https://anmiles.net/userscripts/gitlab.copyLinkToMergeRequest.user.js
// @description    Add Copy button onto the MR page
// @description:ru Кнопка Copy на странице мёрж реквеста
// @section        Gitlab
// @author         Anatoliy Oblaukhov
// @match          https://gitlab.com/*/merge_requests/*
// @require        https://code.jquery.com/jquery-3.3.1.min.js
// @grant          none
// ==/UserScript==

(function($){
    var buttons = [{
        title: 'Copy',
        copyClass: 'copyMergeRequest',
        getLink: function(key) { return key },
    }, {
        title: 'Copy link',
        copyClass: 'copyMergeRequestLink',
        getLink: function(key) { return $('<a></a>').attr('href', location.href).text(key) },
    }];

    var copyButtonLogs = {};

    function createCopyElement(prefix, key, summary, button) {
        copyButtonLogs.createCopyElement = [prefix, key, summary, button];

        var mrLink = button.getLink(key);

        copyButtonLogs.mrLink = mrLink.prop ? mrLink.prop('outerHTML') : mrLink;

        var mrLinkText = $('<strong></strong>')
            .append(prefix)
            .append(' ')
            .append(mrLink)
            .append(' ')
            .append(summary.trim());

        copyButtonLogs.mrLinkText = mrLinkText.prop('outerHTML');

        return $('<div></div>')
            .addClass(button.copyClass)
            .append(mrLinkText)
            .css({'font-size': 0})
            .appendTo($('<div style="color: #000000"></div>').appendTo('body'));
    }

    var mergeRequestId = location.pathname.match(/\/merge_requests\/(\d+)/)[1];
    var issueLink = $('h1.title a').get(0);

    var prefix = issueLink.previousSibling
        && issueLink.previousSibling.textContent
        && issueLink.previousSibling.textContent.indexOf('Draft') !== -1 ? 'Draft: MR ' : 'MR ';

    var key = '!' + mergeRequestId;

    buttons.map(function(button) {
        copyButtonLogs = {};

        try {
            copyButtonLogs.issueLink = issueLink.outerHTML;
            copyButtonLogs.issueLinknextSibling = issueLink.nextSibling;
            copyButtonLogs.issueLinkParent = issueLink.parentNode.outerHTML;
            copyButtonLogs.args = [prefix, key, issueLink.nextSibling.nodeValue, button];
            createCopyElement(prefix, key, issueLink.nextSibling.nodeValue, button);
            copyButtonLogs.js_issuable_edit =  $('.js-issuable-edit').prop('outerHTML');
            $('.js-issuable-edit')
                .clone()
                .insertBefore($('.js-issuable-edit'))
                .removeClass('js-issuable-edit')
                .removeAttr('data-qa-selector')
                .attr('href', '#')
                .attr('data-clipboard-target', '.' + button.copyClass.split(/\s+/).join('.'))
                .html(button.title);
        } catch(ex) {
            throw ex;
        } finally {
            console.log(copyButtonLogs);
        }
    });
})(jQuery);
