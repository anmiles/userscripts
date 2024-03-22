// ==UserScript==
// @name           Pikabu - collapse story with a hotkey
// @namespace      pikabu
// @version        0.1.0
// @updateURL      https://anmiles.net/userscripts/pikabu.collapse.story.r.user.js
// @downloadURL    https://anmiles.net/userscripts/pikabu.collapse.story.r.user.js
// @description    Press 'r' to collapse/expand story on Pikabu.
// @description:ru Клавиша 'r' сворачивает или разворачивает пост на Пикабу
// @author         Anatoliy Oblaukhov
// @match          https://pikabu.ru/*
// ==/UserScript==

window.addEventListener('load', () => {
	let cx, y;

	function getCX() {
		const rect = document.querySelector('.story').getBoundingClientRect();
		return rect.x + rect.width / 2;
	}

	function toggleStory(cx, y) {
		const story = getStory(cx, y);
		if (!story) return;
		story.querySelector('.collapse-button').click();
	}

	function getStory(cx, y) {
		return document.elementFromPoint(cx, y).closest('.story');
	}

	cx = getCX();
	window.addEventListener('resize', () => cx = getCX());
	document.addEventListener('mousemove', e => y = e.clientY);
	document.addEventListener('keydown', ev => ev.keyCode === 82 && toggleStory(cx, y));
});
