// ==UserScript==
// @name           Jira - Colorize versions
// @namespace      jira
// @version        1.0.0
// @updateURL      https://anmiles.net/userscripts/jira.versionColors.user.js
// @downloadURL    https://anmiles.net/userscripts/jira.versionColors.user.js
// @description    Colorize versions on the board page and hide empty versions
// @description:ru Цветные кастомные лейблы
// @author         Anatoliy Oblaukhov
// @match          https://*.atlassian.net/*
// @grant          none
// ==/UserScript==

if (location.pathname.match(/^\/secure\/RapidBoard.jspa|\/jira\/.*\/boards\//)) {
    if (typeof GH.tpl.rapid.card.cardWithoutColorize == 'undefined') {
        GH.tpl.rapid.card.cardWithoutColorize = GH.tpl.rapid.card.card;
        GH.tpl.rapid.card.card = function(opt_data, opt_ignored) {
            return GH.tpl.rapid.card.cardWithoutColorize(opt_data, opt_ignored)
                .replace(/class=\"[^\"]*\" data-tooltip=\"WAC Release: (\d+\.)?(\d+)/g, function($0, $1, $2) {return 'class="aui-label ghx-label-colorized ghx-label-wac-' + ($2 % 3) + '" data-tooltip="WAC Release: ' + $1 + $2})
                .replace(/class=\"[^\"]*\" data-tooltip=\"WA Release: (\d+\.)?(\d+)/g, function($0, $1, $2) {return 'class="aui-label ghx-label-colorized ghx-label-wa-' + ($2 % 3) + '" data-tooltip="WA Release: ' + $1 + $2})
                .replace(/class=\"[^\"]*\" data-tooltip=\"Fix version\/s: (\d+\.)?(\d+)/g, function($0, $1, $2) {return !$1 || $1 >= 2000 ? $0 : 'class="aui-label ghx-label-colorized ghx-label-wa-' + ($2 % 3) + '" data-tooltip="WA Release: ' + $1 + $2})
                .replace(/class=\"[^\"]*\" data-tooltip=\"Story Points: ((\d+\.)?(\d+))/g, function($0, $1) {return 'class="aui-label ghx-label-colorized ghx-label-story-points ghx-label-story-points-' + (Math.min(3, Math.max(0, Math.floor(Math.log2($1)) + 1))) + '" data-tooltip="' + $1});
        };
    }

    jQuery('<style type="text/css"></style>')
        .text('\
.ghx-issue .ghx-extra-fields {margin-top: 0;}\
.ghx-issue .ghx-stat-fields>.ghx-row { margin-top: 3px !important; }\
.ghx-issue .ghx-summary {margin-bottom: 3px; }\
.ghx-issue .ghx-extra-fields .ghx-row { max-height: none !important; }\
.ghx-issue .ghx-extra-fields .ghx-extra-field[data-tooltip^="WAC Release"] { display: none;}\
.ghx-issue .ghx-extra-fields .ghx-extra-field[data-tooltip^="WA Release"] { display: none;}\
.ghx-issue .ghx-extra-fields .ghx-extra-field[data-tooltip^="Fix version"] { display: none;}\
.ghx-work [data-tooltip^="WAC Release"] .ghx-extra-field-content:before { content: "WAC ";}\
.ghx-work [data-tooltip^="WA Release"] .ghx-extra-field-content:before { content: "WA ";}\
.ghx-work [data-tooltip^="Fix version"] .ghx-extra-field-content:before { content: "WA ";}\
#jira .aui-label { margin: 3px 0;}\
#jira .ghx-label-colorized { color: #ffffff; }\
#jira .ghx-label-wac-0 { background-color: #cc6600; border-color: #cc6600; }\
#jira .ghx-label-wac-1 { background-color: #8d542e; border-color: #8d542e; }\
#jira .ghx-label-wac-2 { background-color: #ff7f00; border-color: #ff7f00; }\
#jira .ghx-label-wa-0 { background-color: #2684ff; border-color: #2684ff; }\
#jira .ghx-label-wa-1 { background-color: #175acf; border-color: #175acf; }\
#jira .ghx-label-wa-2 { background-color: #5243aa; border-color: #5243aa; }\
#jira .ghx-label-story-points-0 { background-color: #00aaff; border-color: #00aaff; }\
#jira .ghx-label-story-points-1 { background-color: #009900; border-color: #009900; }\
#jira .ghx-label-story-points-2 { background-color: #ff7f00; border-color: #ff7f00; }\
#jira .ghx-label-story-points-3 { background-color: #a32929; border-color: #a32929; }\
').appendTo('head');

}

