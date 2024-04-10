// ==UserScript==
// @name           Kinopoisk - migrate votes from one profile to another
// @namespace      kinopoisk
// @version        3.3.1
// @updateURL      https://anmiles.net/userscripts/kinopoisk.migrate.votes.user.js
// @downloadURL    https://anmiles.net/userscripts/kinopoisk.migrate.votes.user.js
// @description    One button is for copying all votes from existing profile, another is for pasting to another profile. Need to have console opened (Ctrl + Shift + J).
// @description:ru Одна кнопка для копирования всех оценок из профиля, другая - для вставки в новый профиль. Нужно держать консоль открытой (Ctrl + Shift + J).
// @author         Anatoliy Oblaukhov
// @match          https://www.kinopoisk.ru/*
// @require        https://code.jquery.com/jquery-3.6.0.min.js
// @grant          none
// ==/UserScript==

($ => {
	const copyVotes = () => {
		const votes = [];
		
		Array.from($('.profileFilmsList .item')).map((el) => 
			votes.push({
				movieId: $(el).find('[mid]').attr('mid'),
				rate: $(el).find('.myVote').text()
			})
		);
		
		console.log('votes=' + JSON.stringify(votes));
	};
	
	const pasteVotes = () => {
		if (typeof votes === 'undefined') {
			console.error('Please insert votes that you generate in another profile by clicking "copy votes" button');
		}

		votes.reverse().forEach(({movieId, rate}, i) => {
			setTimeout(async () => {
				console.log(`${i + 1} from ${votes.length}...`);
				
				await fetch("https://graphql.kinopoisk.ru/graphql/?operationName=MovieSetVote", {
					"method": "POST",
					"headers": {
						"content-type": "application/json",
						"service-id": "25",
						"source-id": "1"
					},
					"body":  JSON.stringify({
						"operationName": "MovieSetVote",
						"variables": { movieId, rate },
						"query": "mutation MovieSetVote($movieId: Long!, $rate: Int!) { movie { vote { set(input: {movieId: $movieId, rate: $rate}) { error { message __typename } status __typename } __typename } __typename } } "
					}),
					"credentials": "include"
				});
				
				await fetch("https://graphql.kinopoisk.ru/graphql/?operationName=MovieSetWatched", {
					"method": "POST",
					"headers": {
						"content-type": "application/json",
						"service-id": "25",
						"source-id": "1"
					},
					"body":  JSON.stringify({
                        "operationName": "MovieSetWatched",
                        "variables": {
                            movieId
                        },
                        "query": "mutation MovieSetWatched($movieId: Long!) { movie { watched { set(input: {movieId: $movieId}) { error { message __typename } status __typename } __typename } __typename } } "
                    }),
					"credentials": "include"
				});
		
			}, i * 1000);
		})
	};
	
	/* MOVIES - WORK IN PROGRESS */
	
	const copyMovies = () => {   
		const movieIds = Array.from($('#itemList .item')).map((el) => el.getAttribute('data-id'));
		console.log('movieIds=' + JSON.stringify(movieIds));
	};
	
	const pasteMovies = () => {
		if (typeof movieIds === 'undefined') {
			console.error('Please insert movieIds that you generate in another profile by clicking "copy movieIds" button');
		}
		
		const listId = prompt('listId');
		const token = prompt('token');

		movieIds.reverse().forEach((movieId, i) => {
			setTimeout(async () => {
				console.log(`${i + 1} from ${movieIds.length}...`);
				
				await fetch(`https://www.kinopoisk.ru/handler_mustsee_ajax.php?mode=add_film&id_film=${movieId}&recount=1&rnd=26323290&to_folder=${listId}&token=${token}`);
			}, i * 1000);
		});
	};

	/* if need to set watched */
	movieIds.reverse().forEach((movieId, i) => {
		setTimeout(async () => {
			console.log(`${i + 1} from ${movieIds.length}...`);
			
			await fetch("https://graphql.kinopoisk.ru/graphql/?operationName=MovieSetWatched", {
				"method": "POST",
				"headers": {
					"content-type": "application/json",
					"service-id": "25",
					"source-id": "1"
				},
				"body":  JSON.stringify({
					"operationName": "MovieSetWatched",
					"variables": {
						movieId
					},
					"query": "mutation MovieSetWatched($movieId: Long!) { movie { watched { set(input: {movieId: $movieId}) { error { message __typename } status __typename } __typename } __typename } } "
				}),
				"credentials": "include"
			});

		}, i * 1000);
	})
	
	/* WATCHING HISTORY - WORK IN PROGRESS */
	
	async function sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	async function getWatches(lastItemId){
		const params = [];
		if (lastItemId) params.push(`lastItemId=${lastItemId}`);
		params.push('limit=500');
		params.push('serviceId=25');
		const url = 'https://api.ott.kinopoisk.ru/v12/watching-history?' + params.join('&');
		const response = await fetch(url, {"credentials": "include"});
		await sleep(300);
		const json = await response.json();
		return json;
	}

	async function getAllWatches() {
		let watches = [];
		let lastItemId = undefined;
		let count = 0;
		
		do {
			const result = await getWatches(lastItemId);
			watches = [...watches, ...result.items];
			console.log(watches.length);
			lastItemId = result.pagingMeta.lastItemId;
			count = result.items.length;
		} while (count > 0);
	}

	getAllWatches().then(watches => console.log(JSON.stringify(watches)));
	
	/* */
		
	const render = () => {
		$(document.createElement('a')).text('copy votes').css({cursor: 'pointer', position: 'fixed', top: '10px', right: '110px', color: '#ffffff', 'z-index': 65535, 'font-size': '12px'})
			.appendTo($('body')).click(copyVotes);

		$(document.createElement('a')).text('paste votes').css({cursor: 'pointer', position: 'fixed', top: '26px', right: '110px', color: '#ffffff', 'z-index': 65535, 'font-size': '12px'})
		.appendTo($('body')).click(pasteVotes);
	};

	if (window === top) render();
})(jQuery.noConflict());
