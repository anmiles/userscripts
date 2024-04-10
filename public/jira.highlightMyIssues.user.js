// ==UserScript==
// @name           Jira - Highlight my issues
// @namespace      jira
// @version        1.0.0
// @updateURL      https://anmiles.net/userscripts/jira.highlightMyIssues.user.js
// @downloadURL    https://anmiles.net/userscripts/jira.highlightMyIssues.user.js
// @description    Highlights your issues on the board
// @description:ru Подсвечивает ваши задачи на доске
// @author         Anatoliy Oblaukhov
// @match          https://jira.wildapricot.com/secure/RapidBoard.jspa*
// @grant          none
// ==/UserScript==

if (typeof GH.tpl.rapid.swimlane.renderIssueWithoutAssignee == 'undefined')
{
    GH.tpl.rapid.swimlane.renderIssueWithoutAssignee = GH.tpl.rapid.swimlane.renderIssue;
    GH.tpl.rapid.swimlane.renderIssue = function(opt_data, opt_ignored)
    {
        var output = '<div data-issue-assignee="' + opt_data.issue.assignee + '" data-issue-assignee-self="' + (opt_data.issue.assignee == GH.UserData.userConfig.name) + '">';
        output += GH.tpl.rapid.swimlane.renderIssueWithoutAssignee(opt_data, opt_ignored);
        output += '</div>';
        return output;
    };
}

jQuery('<style type="text/css"></style>')
.text('\
.ghx-issue{ border-radius: 2px; padding: 6px 14px;}\
.ghx-issue a.js-key-link {font-size: 16px;}\
.ghx-issue .ghx-type { position: absolute; top: 10px; left: 14px; }\
.ghx-issue .ghx-issue-content {min-height: auto}\
.ghx-grabber {width: 6px;}\
.ghx-issue .ghx-flags { width: auto; height: auto; }\
.ghx-issue .ghx-priority { display: none; }\
.ghx-issue .ghx-summary { margin-top: 8px; }\
.ghx-issue-fields .ghx-key { margin: 4px 0 4px 20px; display: flex; }\
.ghx-issue-fields .ghx-key a { font-size: 16px; line-height: 16px; }\
[data-issue-assignee-self="false"] .ghx-issue {background: linear-gradient(to top, #ffffff, #ffffff);border-color: #b0b0b0; color: #666666; opacity: 0.8;}\
[data-issue-assignee-self="false"] .ghx-issue:hover {background: linear-gradient(to top, #ffffff, #f0f0f0);}\
[data-issue-assignee-self="true"] .ghx-issue {background: linear-gradient(to top, #b6b6b6, #f2f2f2);border-color: #888888; box-shadow: 2px -2px 4px 0px #b0b0b0;}\
[data-issue-assignee-self="true"] .ghx-issue:hover {background: linear-gradient(to top, #f2f2f2, #b6b6b6); box-shadow: none;}\
[data-issue-assignee-self="true"] .ghx-issue a.js-key-link {color: #0067d5;}\
[data-issue-assignee-self="true"] .ghx-issue .ghx-summary {color: #000000;}\
').appendTo('head');
