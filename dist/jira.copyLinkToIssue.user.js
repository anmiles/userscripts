// ==UserScript==
// @name           Jira - Copy link for issue
// @namespace      jira
// @version        1.0.0
// @updateURL      https://anmiles.net/userscripts/jira.copyLinkToIssue.user.js
// @downloadURL    https://anmiles.net/userscripts/jira.copyLinkToIssue.user.js
// @description    Add Copy button onto the issue page and small copy icons onto the board page
// @description:ru Кнопка Copy на странице задачи и маленькие кнопки для копирования на доске
// @author         Anatoliy Oblaukhov
// @match          https://jira.wildapricot.com/*
// @grant          none
// ==/UserScript==

$.getScript('//s.wildapricot.net/Scripts/v0.3.5.0/clipboard.min.js', function() {

    function copyIssueLink(key, summary) {
        clipboard.copy({
                "text/plain": key + ' ' + summary.trim(),
                "text/html": '<b><a href="https://jira.wildapricot.com/browse/' + key + '">' + key + '</a> ' + summary.trim() + '</b>'
            });
    }

    if (location.pathname.indexOf('/browse/') === 0) {

        setInterval(function(){
            if ($('.copyIssueLink').length > 0) return;

            var link = $('<a class="aui-button toolbar-trigger copyIssueLink"><span>Copy</span></a>').css({cursor: 'pointer'})
            .appendTo('[id="opsbar-jira.issue.tools"]');
        }, 100);

        $('body').on('click', '.copyIssueLink', function(ev){
            ev.stopPropagation();
            var key = $('#key-val').text();
            var summary = $('#summary-val').text();

            copyIssueLink(key, summary);

            $(ev.target).text('Copied!');
        });
    }

    if (location.pathname.match(/^\/secure\/RapidBoard.jspa|\/jira\/.*\/boards\//)) {
        if (typeof GH.tpl.rapid.swimlane.renderIssueWithoutCopy == 'undefined') {
            GH.tpl.rapid.swimlane.renderIssueWithoutCopy = GH.tpl.rapid.swimlane.renderIssue;
            GH.tpl.rapid.swimlane.renderIssue = function(opt_data, opt_ignored) {
                return GH.tpl.rapid.swimlane.renderIssueWithoutCopy(opt_data, opt_ignored).replace(/(<a([^>]*)js\-key\-link(.*?)<\/a>)/, '$1&nbsp;<a class="copyIssueLink aui-icon aui-icon-small aui-iconfont-copy-clipboard"></a>');
            };
        }

        $('a.js-key-link').after('&nbsp;<a class="copyIssueLink aui-icon aui-icon-small aui-iconfont-copy-clipboard"></a>');

        $('body').on('click', '.copyIssueLink', function(ev){
            ev.stopPropagation();
            var key = $(ev.target).parents('.ghx-issue').find('.ghx-issue-key-link').text();
            var summary = $(ev.target).parents('.ghx-issue').find('.ghx-summary .ghx-inner').text();

            copyIssueLink(key, summary);

            $(ev.target).fadeOut('fast').fadeIn('fast');
        });
    }

});
