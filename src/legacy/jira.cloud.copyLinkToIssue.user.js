// ==UserScript==
// @name           Jira Cloud - Copy link for issue
// @namespace      jira.cloud
// @version        1.3.3
// @updateURL      https://anmiles.net/userscripts/jira.cloud.copyLinkToIssue.user.js
// @downloadURL    https://anmiles.net/userscripts/jira.cloud.copyLinkToIssue.user.js
// @description    Add Copy button onto the issue page and small copy icons onto the board page
// @description:ru Кнопка Copy на странице задачи и маленькие кнопки для копирования на доске
// @author         Anatoliy Oblaukhov
// @match          https://*.atlassian.net/*
// @grant          none
// ==/UserScript==

(function($){
    var buttons = [{
        title: 'Copy',
        copyClass: 'copyIssueButton copyIssue',
        iconClass: 'aui-iconfont-copy-clipboard',
        getLink: function(key) { return key },
    }, {
        title: 'Copy link',
        copyClass: 'copyIssueButton copyIssueLink',
        iconClass: 'aui-iconfont-link',
        getLink: function(key) { return $('<a></a>').attr('href', 'https://' + location.hostname + '/browse/' + key).text(key) },
    }];

    var copyButtonLogs = {};

    function getCopyData(prefix, key, summary, button) {
        copyButtonLogs.getCopyData = [prefix, key, summary, button];

        var mrLink = button.getLink(key);
        copyButtonLogs.mrLink = mrLink.prop ? mrLink.prop('outerHTML') : mrLink;

        var mrLinkText = $('<strong></strong>')
            .append(prefix)
            .append(' ')
            .append(mrLink)
            .append(' ')
            .append(summary.trim());

        copyButtonLogs.mrLinkText = mrLinkText.prop('outerHTML');

        copyButtonLogs.result = {
            "text/plain": key + ' ' + summary.trim(),
            "text/html": $('<div></div>').append(mrLinkText).html()
        };

        return {
            "text/plain": key + ' ' + summary.trim(),
            "text/html": $('<div></div>').append(mrLinkText).html()
        };
    }

    $.getScript('//anmiles.net/Scripts/clipboard.min.js', function() {
        if (location.pathname.indexOf('/browse/') === 0) {
            var waitSibling = setInterval(function(){
                var sibling = $('div[data-test-id="issue.views.issue-base.foundation.status.status-field-wrapper"]');
                if (sibling.length === 0) return;

                clearInterval(waitSibling);

                buttons.map(function(button) {
                    sibling = $('<a class="aui-icon aui-icon-small"></a>')
                        .addClass(button.iconClass)
                        .addClass(button.copyClass)
                        .css({cursor: 'pointer'})
                        .insertAfter(sibling);

                    $('body').on('click', '.' + button.copyClass.split(/\s+/).join('.'), function(ev){
                        ev.stopPropagation();

                        copyButtonLogs = {};

                        try {
                            copyButtonLogs.breadcrumbs = jQuery('nav[aria-label="Breadcrumbs"]').eq(0).prop('outerHTML');
                            copyButtonLogs.key = jQuery('nav[aria-label="Breadcrumbs"] li').last().text();
                            copyButtonLogs.h1 = jQuery('h1').eq(0).prop('outerHTML');
                            copyButtonLogs.h1text = jQuery('h1').eq(0).text();

                            var key = jQuery('nav[aria-label="Breadcrumbs"] li').last().text();
                            var summary = jQuery('h1').eq(0).text();
                            clipboard.copy(getCopyData(null, key, summary, button));
                            $(ev.target).fadeOut('fast').fadeIn('fast');
                        } catch(ex) {
                            throw ex;
                        } finally {
                            console.log(copyButtonLogs);
                        }
                    });
                });
            });

            $('<style type="text/css"></style>')
                .text('\
                    .aui-icon.copyIssueButton { background: rgba(9, 30, 66, 0.04); padding: 0 8px; border-radius: 3px; margin-left: 8px; height: 2.28571em; line-height: 2.28571em; color: rgb(66, 82, 110); width: auto; display: flex; align-items: center; }\
                    .aui-icon.copyIssueButton:before { font-size: 20px; position: static; margin: 0; }\
                    .aui-icon.copyIssueButton:after { margin-left: 0.5em; font-size: 14px; line-height: 20px; color: inherit; font-weight: bold; font-style: normal; text-indent: 0; speak: none; white-space: nowrap; }\
                ' + buttons.map(function(button){
                    return '.aui-icon.' + button.copyClass.split(/\s+/).join('.') + ':after { content: "' + button.title + '"; }';
                }).join('\n') + '\
                ').appendTo('head');
        }

        if (location.pathname.match(/^\/secure\/RapidBoard.jspa|\/jira\/.*\/boards\//)) {
            function createButton(button){
                return '<a class="' + button.copyClass + ' ' + button.iconClass + ' aui-icon aui-icon-small"></a>'
            }

            var appendix = '&nbsp;' + buttons.map(createButton).join('');

            if (typeof GH.tpl.rapid.card.cardWithoutCopy === 'undefined') {
                GH.tpl.rapid.card.cardWithoutCopy = GH.tpl.rapid.card.card;
                var sections = $('section.ghx-summary');
                GH.tpl.rapid.card.card = function(opt_data, opt_ignored) {
                    return GH.tpl.rapid.card.cardWithoutCopy(opt_data, opt_ignored)
                        .replace(/(<section[^>]*class=\"ghx\-summary\"[^>]*>)(.*?<\/section>)/, '$1' + appendix + '$2');
                };

                sections.after(appendix);
            }

            buttons.map(function(button) {
                $('body').on('click', '.' + button.copyClass.split(/\s+/).join('.'), function(ev){
                    ev.stopPropagation();

                    copyButtonLogs = {};

                    try {
                        copyButtonLogs.ghx_issue = $(ev.target).parents('.ghx-issue').prop('outerHTML');
                        copyButtonLogs.data_issue_key = $(ev.target).parents('.ghx-issue').attr('data-issue-key');
                        copyButtonLogs.ghx_summary = $(ev.target).parents('.ghx-issue').find('.ghx-summary').prop('outerHTML');
                        copyButtonLogs.ghx_summary_text = $(ev.target).parents('.ghx-issue').find('.ghx-summary').text();

                        var key = $(ev.target).parents('.ghx-issue').attr('data-issue-key');
                        var summary = $(ev.target).parents('.ghx-issue').find('.ghx-summary').text();
                        clipboard.copy(getCopyData(null, key, summary, button));
                        $(ev.target).fadeOut('fast').fadeIn('fast');
                    }
                    catch(ex) {
                        throw ex;
                    } finally {
                        console.log(copyButtonLogs);
                    }
                });
            });

            $('<style type="text/css"></style>')
                .text('\
                    .aui-icon.copyIssueButton { width: 16px; height: auto; margin-right: 4px; vertical-align: super; opacity: 0.7; }\
                ').appendTo('head');
        }
    });

})(jQuery);
