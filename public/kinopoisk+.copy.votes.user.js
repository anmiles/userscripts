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
        watches = [...watches, ...result.items.filter(watch => ['мультфильм', 'детский'].filter(genre => watch.watchedTitle.genres.includes(genre)).length === 0)];
        console.log(watches.length);
        lastItemId = result.pagingMeta.lastItemId;
        count = result.items.length;
    } while (count > 0);

    return watches;
}

void (async function main(){
	const watches = await getAllWatches();

	watches = watches.reverse().map(watch => watch.watchedTitle.filmType === 'EPISODE'
		? {
			id: watch.watchedTitle.seriesId,
			season: watch.watchedTitle.season,
			episode: watch.watchedTitle.episode,
			episodeHash: Array.from(watch.watchedTitle.title.matchAll(/(\d+)/g)).map((match, i) => parseInt(match[1]) * Math.pow(1000, 1 - i)).reduce((sum, val) => sum + val, 0),
			title: watch.watchedTitle.seriesTitle,
			progressPercent: watch.watchedTitle.watchProgressPercent,
			progressPosition: watch.watchedTitle.watchProgressPosition,
			genres: watch.watchedTitle.genres,
		} : {
			id: watch.watchedTitle.filmId,
			title: watch.watchedTitle.title,
			progressPercent: watch.watchedTitle.watchProgressPercent,
			progressPosition: watch.watchedTitle.watchProgressPosition,
			genres: watch.watchedTitle.genres,
		}
	);

	console.log('watches=' + JSON.stringify(watches));

	const ttimes = {};
	
	watches.map(watch => {
		const id = watch.id;
		const key = watch.episode ? `${id}#${watch.season}#${watch.episode}` : id;
		ttimes[key] = (Math.floor(watch.progressPosition / 60) + watch.progressPosition % 60 / 100).toFixed(2).toString().replace('.', ':');
	});
	
	console.log('ttimes=' + JSON.stringify(ttimes));
	
	const uniqueWatches = {};
	
	watches.filter(watch => watch.episode).map(watch => {
		uniqueWatches[watch.title] = uniqueWatches[watch.title] || { id: watch.id, title: watch.title, series: {} };
	
		if (!uniqueWatches[watch.title].series[watch.episodeHash] || uniqueWatches[watch.title].series[watch.episodeHash].progressPercent < watch.progressPercent) {
			uniqueWatches[watch.title].series[watch.episodeHash] = watch;
		}
	});
	
	Object.values(uniqueWatches).map(uniqueWatch => uniqueWatch.id + '\t' + uniqueWatch.title + '\t' + Object.values(uniqueWatch.series).sort(serie => serie.episodeHash).map(serie => serie.progressPercent).join('\t')).join('\n');
	
	/*************************/
	
	/* insert watches */
	/* insert ttimes */

	localStorage.setItem('ttimes', JSON.stringify(ttimes));

	let index = 0;

	for (const watch of watches) {
		index++;
		const url = watch.episode
			? `https://hd.kinopoisk.ru/film/${watch.id}?episode=${watch.episode}&season=${watch.season}&watch=`
			: `https://hd.kinopoisk.ru/film/${watch.id}?watch=`;

		window.myWaiting = true;
		console.log(`${index} of ${watches.length}: ${url}`);
		window.open(url);

		const button = document.createElement('button');
		button.style.position = 'fixed';
		button.style.width = '100%';
		button.style.height = '100%';
		button.style.top = 0;
		button.style.left = 0;
		button.style.zIndex = 65535;
		button.style.background = 'green';
		button.style.color = 'white';
		button.style.fontSize = '100px';
		button.innerHTML = 'NEXT';
		document.body.appendChild(button);
		button.addEventListener('click', () => {
			delete window.myWaiting;
		})
		button.focus();

		while (window.myWaiting) {
			await sleep(100);
		}

		document.body.removeChild(button);
	}
})();

/*************************/

