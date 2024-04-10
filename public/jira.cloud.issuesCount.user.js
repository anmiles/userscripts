// ==UserScript==
// @name           Jira Cloud - Issues count
// @namespace      jira.cloud
// @version        1.0.0
// @updateURL      https://anmiles.net/userscripts/jira.cloud.issuesCount.user.js
// @downloadURL    https://anmiles.net/userscripts/jira.cloud.issuesCount.user.js
// @description    Print count of issues that currently visible on the board
// @description:ru Выводит количество задач, которые отображаются на доске
// @author         Anatoliy Oblaukhov
// @match          https://*.atlassian.net/secure/RapidBoard.jspa*
// @match          https://*.atlassian.net/jira/*/boards/*
// @grant          none
// ==/UserScript==

jQuery('<style type="text/css"></style>').text('#subnav-title {visibility: hidden}').appendTo('head');
var issuesCountWaiter;

GH.WorkController.renderUIWithoutIssueCount = GH.WorkController.renderUI;

GH.WorkController.renderUI = function()
{
    GH.WorkController.renderUIWithoutIssueCount();

    if (issuesCountWaiter) clearInterval(issuesCountWaiter);
    issuesCountWaiter = setInterval(function(){
        var subNavigatorTitle = document.querySelector('.subnavigator-title');
        if (!subNavigatorTitle) return;
        clearInterval(issuesCountWaiter);
        issuesCountWaiter = 0;
        var boardName = document.querySelector('#ghx-board-name');

        var count = 0;
        var cells = GH.GridDataController.getModel().getCells();
        for (var cellId in cells) {
            for (var columnId in cells[cellId]) {
                count += cells[cellId][columnId].length;
            }
        }

        subNavigatorTitle.innerHTML = boardName.innerHTML + ' - ' + count + ' issues';
        document.querySelector('#subnav-title').style.visibility = 'visible';
        boardName.style.display = 'none';
    }, 300);
};

