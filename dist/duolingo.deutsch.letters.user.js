// ==UserScript==
// @name           Duolingo deutsch letters
// @namespace      duolingo
// @version        0.1.3
// @updateURL      https://anmiles.net/userscripts/duolingo.deutsch.letters.user.js
// @downloadURL    https://anmiles.net/userscripts/duolingo.deutsch.letters.user.js
// @description    Hold ALT and press one of (A, a, O, o, U, u, S, s) to get one of (Ä, ä, Ö, ö, Ü, ü, ß, ß) typed instead
// @description:ru Удерживая ALT, нажмите одну из клавиш (A, a, O, o, U, u, S, s) чтобы напечатать одну из (Ä, ä, Ö, ö, Ü, ü, ß, ß)
// @author         Anatoliy Oblaukhov
// @match          https://www.duolingo.com/*
// @grant          none
// ==/UserScript==

document.addEventListener("keydown", function(ev){
    var keysMapping = {'a': 'ä', 'o': 'ö', 'u': 'ü', 's': 'ß', 'A': 'Ä', 'O': 'Ö', 'U': 'Ü', 'S': 'ß'};
    if (!ev.altKey) return;
    var newKey = keysMapping[ev.key];
    if (!newKey) return;
    ev.preventDefault();
    var field = document.querySelectorAll('input[type="text"], textarea')[0];
    field.value = field.value + newKey;
});
