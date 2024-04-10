// ==UserScript==
// @name           Teamcity shrink space
// @namespace      teamcity
// @version        0.2.1
// @updateURL      https://anmiles.net/userscripts/teamcity.shrink.space.user.js
// @downloadURL    https://anmiles.net/userscripts/teamcity.shrink.space.user.js
// @description    Save a lot of vertical space on teamcity projects
// @description:ru Экономит пространство по вертикали
// @author         Anatoliy Oblaukhov
// @match          https://tc.bonasource.com/project.html?*
// @grant          none
// ==/UserScript==

(function() {
    var maxLeftWidth = 0;
    var maxRightWidth = 0;

    function updateButtonText(){
        jQuery('.tableCaption > span.pc.btPopup .pc__label').each(function(i, label) {
            var button = jQuery(label).parents('.tableCaption').find('.btn_mini:not(.btn_append)');
            var buttonText = jQuery(label).text();
            if (button.text() !== 'Run') return;
            if (jQuery(label).parents('.build').length > 2) buttonText += ' ' + jQuery(label).parents('.build').eq(0).find('.projectHeader .pc__label a').text();
            button.text(buttonText);
            maxLeftWidth = Math.max(maxLeftWidth, jQuery(label).width());
            maxRightWidth = Math.max(maxRightWidth, button.width());
        });
    }

    setInterval(function() {
        jQuery('.stopBuild .actionLink:not(.btn)').addClass('btn btn_mini');
    }, 100);

    updateButtonText();
    setInterval(updateButtonText, 100);

    jQuery('<style type="text/css"></style>')
    .text('\
    div.fixedWidth {max-width: 1800px;}\
    .chuck_div { display: none; }\
    #projectContainer .projectContent #toolbar { display: none; }\
    .bt-separator { border: none; height: 1px; margin-top: -1px; }\
    table.overviewTypeTable { margin-top: -26px; margin-bottom: 0;}\
    .project-page div.overviewTypeTableContainer {padding: 0 ' + (maxRightWidth + 120) + 'px 0 ' + (maxLeftWidth + 60) + 'px; box-sizing: border-box; }\
    .build .build .overviewTypeTableContainer:last-child { margin-bottom: -0.4em; }\
    .runningStatus {display: none; }\
    .tableCaption {margin-right: 0 }\
    .tableCaption table.runTable { position: relative; top: -2px; }\
    .tableCaption table.runTable td.runButton {padding-left: 20px; }\
    .stopBuild .actionLink {position: relative; left: 135px; padding-right: 7px; top: -2px; border-radius: 3px 0 0 3px; box-shadow: none;}\
    .runButton .btn_mini:not(.btn_append) {width: ' + (maxRightWidth + 20) + 'px;}\
    .tableCaption > span.pc.btPopup { min-width: 360px; }\
    table.overviewTypeTable td.buildNumber { width: 3em !important; }\
    ').appendTo('head');
})();
