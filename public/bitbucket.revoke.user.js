// ==UserScript==
// @name           Bitbucket revoke
// @namespace      bitbucket
// @version        0.1.1
// @updateURL      https://anmiles.net/userscripts/bitbucket.revoke.user.js
// @downloadURL    https://anmiles.net/userscripts/bitbucket.revoke.user.js
// @description    Revoke link for bitbucket repositories
// @description:ru Ссылка Revoke для репозитория bitbucket
// @author         Anatoliy Oblaukhov
// @match          https://bitbucket.org/dashboard/repositories
// @grant          none
// ==/UserScript==

$('.repo-list--repo-name').each(function(i, link){
    var a = $('<a></a>');
    a.html('[revoke]');
    a.attr('href', 'https://bitbucket.org/xhr' + $(link).attr('href') + '/revoke');
    a.attr('target', '_blank');
    $(link).before(a).before('&nbsp;');    
});
