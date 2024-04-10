// ==UserScript==
// @name           Jira - Issues count
// @namespace      jira
// @version        1.0.0
// @updateURL      https://anmiles.net/userscripts/jira.issuesCount.user.js
// @downloadURL    https://anmiles.net/userscripts/jira.issuesCount.user.js
// @description    Print count of issues that are currently visible on the board
// @description:ru Выводит количество задач, которые отображаются на доске
// @author         Anatoliy Oblaukhov
// @match          https://jira.wildapricot.com/secure/RapidBoard.jspa*
// @grant          none
// ==/UserScript==

GH.WorkController.oldRenderUI2 = GH.WorkController.renderUI;
GH.WorkController.renderUI = function()
{
    GH.WorkController.oldRenderUI2();

    jQuery('.subnavigator-title').text(jQuery('#ghx-board-name').text()).append(' - ' + Object.keys(GH.GridDataController.getModel().data.issues).length + ' issues');
    jQuery('#ghx-board-name').css({visibility: 'hidden'});
};

