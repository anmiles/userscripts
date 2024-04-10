// ==UserScript==
// @name           Jira Cloud - Quick unwatch issues
// @namespace      jira.cloud
// @version        1.0.1
// @updateURL      https://anmiles.net/userscripts/jira.cloud.quickUnwatchIssues.user.js
// @downloadURL    https://anmiles.net/userscripts/jira.cloud.quickUnwatchIssues.user.js
// @description    Unwatch issues directly from the board page
// @description:ru Отписка от задач прямо на доске
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

var accountId = jQuery('meta[name="ajs-atlassian-account-id"]').attr('content');

GH.WorkController.renderUIWithoutUnwatch = GH.WorkController.renderUI;

GH.WorkController.renderUI = function()
{
    GH.WorkController.renderUIWithoutUnwatch();

    jQuery('[data-issue-assignee-self] .unwatch-link').remove();

    jQuery('[data-issue-assignee-self="false"] .ghx-issue .ghx-stat-1').each(function(i, div)
    {
        var unwatch = jQuery('<a></a>').addClass('unwatch-link');
        var span = jQuery('<span></span>').addClass('ghx-field').append(unwatch);
        jQuery(div).append(span);

        unwatch.click(function(e)
        {
            e.stopPropagation();
            var issueKey = $(e.currentTarget).parents('.ghx-issue').attr('data-issue-key');
            var issueId = $(e.currentTarget).parents('.ghx-issue').attr('data-issue-id');

            jQuery.ajax({
                type: 'DELETE',
                url: '/rest/api/2/issue/' + issueKey + '/watchers?accountId=' + accountId,
                complete: function(resp) {
                    $(div).parents('[data-issue-assignee-self]').remove();
                }
            });
        });
    });
};

jQuery('<style type="text/css"></style>')
.text('\
.ghx-issue .unwatch-link { width: 16px; height: 16px; opacity: 0.25; display: inline-block; margin-left: 4px; background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6OTI3MENDQ0Q0RDc3MTFFNUJCNjA5MThEOUM4QkQ1MjAiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6OTI3MENDQ0U0RDc3MTFFNUJCNjA5MThEOUM4QkQ1MjAiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo5MjcwQ0NDQjRENzcxMUU1QkI2MDkxOEQ5QzhCRDUyMCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo5MjcwQ0NDQzRENzcxMUU1QkI2MDkxOEQ5QzhCRDUyMCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pid8m5AAAAHxSURBVHjapFM9aBRREJ6Z3fMwpAiSwuKKtUkMF46zsLM4y0AKhUBQi5gfCAbyIyIYBE1hc0UKmwhC5OACKSy0M4XoFWmFxNxCSCWaQIKKCQiay743+XYvG/aS5kIezPJm9n0z37xvHqsqnWe5zHwmwFg221pz7SLKembv33U5K3jftR8A7g19z/OCphOM5DqvADyH7Q1W+mhZR2cqlaCB/0yh4H7/vVNgoQG4eVgG1mqNHRRHRiMw8XoQ8M2S729HdxCDh3Nd3T/+7JQBzp8o/iQJtsxFkoM2+FGCiMFgrrNPWMr1hLxApH3YF0lxiCM2dbDYIbb8CX6gJD1vVv1lHs533cLBtwjuInjbcqrq6P5PxK4h2TSx3sW/CuSuCAXzSuluYrsYFrOK1sjS06NWXoYZSysru1D2MTE/SoIh91TmUmZ7/qu/hNhseDdg/ZzvZ7OXXVc/K+lVBF+kAymGUsW0jeqsML0CowdMqSWV2iQpT6C1NfT/LLqDRJIS1TWOwDVj+i8I9yvxFtppAaN7R+p8M9b0lNY21o9lvNPR0d5y0Xl3qnJCKaz/qLyQPpCHc77/91iFeMJisBjpNY6dYlIPUxfg2Caprjop8/71l41fDW8h/ABcbhySaqjxeDMTGo9yO6yanLBmF5/3OR8KMABfVtJV7PUonAAAAABJRU5ErkJggg==) center center no-repeat;}\
.ghx-issue .unwatch-link:hover {opacity: 1;}\
').appendTo('head');
