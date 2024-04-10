// ==UserScript==
// @name           Teams - Saved button on the sidebar
// @namespace      teams
// @version        0.2.2
// @updateURL      https://anmiles.net/userscripts/teams.sidebar.saved.user.js
// @downloadURL    https://anmiles.net/userscripts/teams.sidebar.saved.user.js
// @description    Saved button on the sidebar
// @description:ru Кнопка Saved на сайдбаре
// @author         Anatoliy Oblaukhov
// @match          https://teams.microsoft.com/_
// @grant          none
// ==/UserScript==

(function() {
    var isInstalled = false;
    var isSelected = false;

    setInterval(function(){
        var teamsLi = $('nav#teams-app-bar ul>li');
        if (teamsLi.length > 0) {
            if (!isInstalled) {
                isInstalled = true;
                var li = $('<li></li>');
                teamsLi.eq(2).after(li);
                var button = $('<button id="savedButton"></button>').addClass('app-bar-link app-bar-button').appendTo(li);
                var svg = $('<svg viewBox="0 0 32 32"></svg>').addClass('app-svg icons-bookmark').html('<path class="icons-default-fill" d="M12,23.3c-0.1,0-0.3,0-0.4-0.1c-0.4-0.2-0.6-0.5-0.6-0.9V9.9c0-0.7,0.5-1.3,1.2-1.5c2.4-0.6,5.2-0.6,7.7,0\
C20.5,8.6,21,9.2,21,9.9v12.4c0,0.4-0.2,0.8-0.6,0.9c-0.4,0.2-0.8,0.1-1.1-0.2L16,19.7L12.7,23C12.5,23.2,12.3,23.3,12,23.3z\
M16,18.7c0.3,0,0.5,0.1,0.7,0.3l3.3,3.3V9.9c0-0.2-0.2-0.4-0.4-0.5c-2.3-0.5-4.9-0.5-7.2,0C12.2,9.4,12,9.6,12,9.9v12.4l3.3-3.3\
C15.5,18.8,15.7,18.7,16,18.7z"></path>').appendTo(button);
                var span = $('<span></span>').addClass('app-bar-text').text('Saved').appendTo(button);

                button.click(function(){
                    angular.element(document.body).injector().get('bridgeNavigationService').navigationService.navigateToDefaultMySavedState();
                });
            }

            // TODO: rewrite this. Need to find a way to detect whether we are on the Saved messages screen
            var isSelectedNew = ['Saved', 'Сохранено'].indexOf($('.left-rail-header-title').text()) !== -1;

            if (isSelectedNew !== isSelected) {
                isSelected = isSelectedNew;
                $('#savedButton').toggleClass('app-bar-selected', isSelected);
            }
        }
    }, 100);
})();
