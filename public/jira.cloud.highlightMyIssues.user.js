// ==UserScript==
// @name           Jira Cloud - Highlight my issues
// @namespace      jira.cloud
// @version        1.0.0
// @updateURL      https://anmiles.net/userscripts/jira.cloud.highlightMyIssues.user.js
// @downloadURL    https://anmiles.net/userscripts/jira.cloud.highlightMyIssues.user.js
// @description    Highlights your issues on the board
// @description:ru Подсвечивает ваши задачи на доске
// @author         Anatoliy Oblaukhov
// @match          https://*.atlassian.net/secure/RapidBoard.jspa*
// @match          https://*.atlassian.net/jira/*/boards/*
// @grant          none
// ==/UserScript==

if (typeof GH.tpl.rapid.card.cardWithoutAssignee == 'undefined')
{
    GH.tpl.rapid.card.cardWithoutAssignee = GH.tpl.rapid.card.card;
    GH.tpl.rapid.card.card = function(opt_data, opt_ignored)
    {
        var output = '<div data-issue-assignee="' + opt_data.issue.assignee + '" data-issue-assignee-self="' + (opt_data.issue.assignee == GH.UserData.userConfig.name) + '">';
        output += GH.tpl.rapid.card.cardWithoutAssignee(opt_data, opt_ignored);
        output += '</div>';
        return output;
    };
}

jQuery('<style type="text/css"></style>')
.text('\
.aui-layout .ghx-issue, .aui-layout .ghx-issue.ghx-selected { border-radius: 4px !important; padding: 6px 14px; overflow: hidden; }\
.aui-layout .ghx-issue .ghx-key {font-size: 16px;}\
.aui-layout .ghx-issue .ghx-issue-content {min-height: auto}\
.aui-layout .ghx-issue .ghx-grabber {width: 6px; left: 0; top: 0; bottom: 0; }\
.aui-layout [data-issue-assignee-self="false"] .ghx-issue {background: linear-gradient(to top, #ffffff, #ffffff);border-color: #b0b0b0; color: #666666; opacity: 0.8;}\
.aui-layout [data-issue-assignee-self="false"] .ghx-issue:hover {background: linear-gradient(to top, #ffffff, #f0f0f0);}\
.aui-layout [data-issue-assignee-self="true"] .ghx-issue {background: linear-gradient(to top, #b6b6b6, #f2f2f2);border-color: #888888; box-shadow: 2px -2px 4px 0px #b0b0b0;}\
.aui-layout [data-issue-assignee-self="true"] .ghx-issue:hover {background: linear-gradient(to top, #f2f2f2, #b6b6b6); box-shadow: none;}\
.aui-layout [data-issue-assignee-self="true"] .ghx-issue .ghx-key {color: #0067d5;}\
.aui-layout [data-issue-assignee-self="true"] .ghx-issue .ghx-summary {color: #000000;}\
').appendTo('head');
