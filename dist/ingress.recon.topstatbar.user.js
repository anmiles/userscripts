// ==UserScript==
// @name           Recon statistics on the top bar
// @namespace      ingress
// @version        0.6.0
// @updateURL      https://anmiles.net/userscripts/ingress.recon.topstatbar.user.js
// @downloadURL    https://anmiles.net/userscripts/ingress.recon.topstatbar.user.js
// @description    Show statistics always on the top bar and alerts about new agreements.
// @description:ru Всегда выводит статистику на верхней панели рекона и показывает уведомления о новых агриментах
// @author         Anatoliy Oblaukhov
// @match          https://wayfarer.nianticlabs.com/*
// @grant          GM_addStyle
// @require        https://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==

(function($) {
    var storageKey = 'topstat';
    var storage = {rating: '', numbers: {}}
    var profile = {rating: '', numbers: {}};
    var numberTypes = {'total': 'Total Nominations Reviewed', 'accepted': 'Nominations Accepted', 'rejected': 'Nominations Rejected', 'duplicated': 'Nominations Duplicated'};

    function run() {
        try {
            getProfile(function(){
                getStorage();
                compareStats();
                setStorage();
                buildCSS();
                buildUI();
                updateUI();
            });
        } catch (ex){
            notify(message('error'), ex);
        }
    }

    function getProfile(callback){
        var url = '/profile';

        $.get(url).done(function(html) {
            if (parseProfile(html)) callback();
        }).fail(function(){
            throw message('noProfile', url);
        });
    }

    function parseProfile(html) {
        var regex1 = /class=\"rating\-bar[^>]*tooltip\-enable=\"true\"\s*>([^<]+)/;
        var match1 = html.match(regex1);
        if (!match1) throw message('noRating', regex1);
        profile.rating = match1[1].toLowerCase();

        for (var i in numberTypes) {
            var regex3 = new RegExp(numberTypes[i] + "((?!</h4>)[\\s\\S])*?>(\\d+)");
            var match3 = html.match(regex3);
            if (!match3) throw message('noNumber', i, numberTypes[i]);
            profile.numbers[i] = parseInt(match3[2]);
        }

        return true;
    }

    function getStorage() {
        if (typeof localStorage === 'undefined') return {};
        var storageValue = localStorage[storageKey];
        if (!storageValue) return {};

        try {
            storage = JSON.parse(storageValue);
        } catch (ex) {
            setStorage({});
            throw message('badJSON', storageValue);
        }
    }

    function setStorage() {
        storage.rating = profile.rating;
        storage.numbers = profile.numbers;
        if (typeof localStorage === 'undefined') return;
        localStorage[storageKey] = JSON.stringify(storage);
    }

    function compareStats(){
        if (profile.rating && storage.rating && profile.rating != storage.rating) {
            notify(message('ratingChangedTitle'), message('ratingChanged', profile.rating.toUpperCase()));
        }

        if (profile.numbers && storage.numbers) {
            var agreements = [];

            for (var i in numberTypes) if (i !== 'total') {
                if (storage.numbers[i] && profile.numbers[i] != storage.numbers[i]) {
                    agreements.push(message('newAgreement', profile.numbers[i] - storage.numbers[i], message(i)));
                }
            }

            if (agreements.length > 0) notify(message('newAgreements'), agreements.join('\r\n'));
        }
    }

    function notify(title, body) {
        if (title) title = message(title);
        if (body) body = message.apply(null, Array.prototype.splice.call(arguments, 1));
        if (storage && storage.notifications === false) return;
        else if (!("Notification" in window)) return;
        else if (Notification.permission === "granted") {
            new Notification(title, {body: body});
        }
        else if (Notification.permission !== 'denied') {
            Notification.requestPermission(function (permission) {
                if (permission === "granted") {
                    new Notification(title, {body: body});
                }
            });
        }
    }

    function buildUI() {
        var container = $('<div class="inner-container topstat-container"></div>');
        var topstat = $('<div class="topstat"></div>').appendTo(container);
        $('<div class="rating"></div>').appendTo(topstat);
        $('<div class="numbers button"></div>').appendTo(topstat);

        $('<div class="percents"></div>').dblclick(function() {
            $('.offset').toggle()
        }).appendTo(topstat);

        $('<input class="offset" type="text">').on('keyup paste change input kyepress', function(ev) {
            storage.offset = ev.target.value;
            setStorage();
            if (ev.keyCode === 10 || ev.keyCode === 13) $(ev.target).hide();
            updateUI();
        }).appendTo(topstat).hide();

        $('<div class="notifications button glyphicon"></div>').on('update', function(){
            $(this).toggleClass('glyphicon-volume-up', storage.notifications !== false);
            $(this).toggleClass('glyphicon-volume-off', storage.notifications === false);
        }).click(function(){
            storage.notifications = typeof storage.notifications === 'undefined' ? false : !storage.notifications;
            setStorage();
            $(this).trigger('update');
        }).appendTo(topstat);

        $('.header .inner-container:last').before(container);
    }

    function updateUI() {
        $('.topstat-container .rating').removeClass().addClass('rating ' + profile.rating).html(profile.rating);
        $('.topstat-container .numbers').attr('title', '{0} {1}'.format(profile.numbers.total, 'total')).html('');

        if (profile.numbers) {
            for (var i in numberTypes) {
                $('<div></div>').addClass(i).css({width: (100 * profile.numbers[i] / profile.numbers.total) + '%'}).attr('title', '{0} {1}'.format(profile.numbers[i], i)).appendTo('.topstat-container .numbers');
            }
        }

        $('.topstat-container .offset').attr('value', storage.offset || 0);

        var offset = (typeof storage.offset === 'undefined') ? 0 : storage.offset;
        var succeeded = (profile.numbers.accepted + profile.numbers.rejected + profile.numbers.duplicated - offset);
        var percent = (succeeded / profile.numbers.total * 100).toFixed(1);

        $('.topstat-container .percents').html('<span>{0}%</span><span>{1}</span>'.format(percent, succeeded)).attr('title', message('setOffset'));

        $('.topstat-container .notifications').trigger('update');
    }

    function buildCSS() {
        GM_addStyle('.topstat { position: relative;}');
        GM_addStyle('.topstat > * { float: left; line-height: 30px; height: 30px;  margin: 0 10px 0 0; padding: 0 6px; text-align: center; text-transform: uppercase; top: 0; border: 1px solid darkgrey !important; box-sizing: border-box; }');
        GM_addStyle('.topstat > input { width: 48px; padding: 0;}');
        GM_addStyle('.topstat > .rating { width: 60px; }');
        GM_addStyle('.topstat > .numbers { width: 80px; padding: 0; }');
        GM_addStyle('.topstat > .numbers > div { height: 100%; float: left; border-right: 1px solid #0ff;}');
        GM_addStyle('.topstat > .numbers > .total { display: none; }');
        GM_addStyle('.topstat > .numbers > .accepted { background: #0095ff; }');
        GM_addStyle('.topstat > .numbers > .rejected { background: #bd3b09; }');
        GM_addStyle('.topstat > .numbers > .duplicated { background: #ffa500; }');
        GM_addStyle('.topstat > .percents span { display: block; float: left; height: 100%;}');
        GM_addStyle('.topstat > .percents span:first-child { border-right: 1px solid darkgrey; padding-right: 6px; margin-right: 6px;}');
        GM_addStyle('.topstat > .notifications { width: 30px;}');
        GM_addStyle('.topstat .poor  { color: hsl(0 100% 90%); background: hsl(0 100% 40%); }');
        GM_addStyle('.topstat .fair  { color: hsl(200 100% 90%); background: hsl(200 100% 40%); }');
        GM_addStyle('.topstat .good  { color: hsl(45 100% 90%); background: hsl(45 100% 40%); }');
        GM_addStyle('.topstat .great { color: hsl(100 100% 90%); background: hsl(100 100% 40%); }');
        GM_addStyle('.header { justify-content: flex-end }');
        GM_addStyle('.niantic-wayfarer-logo {display: none}');
        GM_addStyle('#helpIcon { background-color: #F0F0F0; border: 1px solid buttonface; left: 156px; top: 3px; font-size: 19px; }');
        GM_addStyle('div#agentNameHeader { background-color: #F0F0F0; border: 1px solid buttonface; left: 204px; top: 3px; right: auto; padding: 12px; line-height: 19px; } ');
    }

    function message(text) {
        var lang = $('html').attr('lang');
        if (lang !== 'ru') lang = 'en';
        var msg = messages[text];
        return msg ? msg[lang].format(Array.prototype.splice.call(arguments, 1)) : text;
    }

    String.prototype.format = function() {
        if (arguments.length === 0) return this;

        var data;
        if (arguments.length > 1) data = arguments;
        else if (typeof arguments[0] === 'object') data = arguments[0];
        else data = arguments;

        return this.split('{{').map(function(q) {
            return q.replace(/\{([^\{\}]+)\}/g, function($0, $1) {
                return data[$1] === undefined || data[$1] === null ? '' : data[$1];
            });
        }).join('{').replace(/\}\}/g, '}');
    };

    var messages = {
        noProfile: {en: 'Unable to load profile from {0}', ru: 'Не получилось загрузить профиль по адресу {0}'},
        noRating: {en: 'Unable to find rating in profile\n{0}', ru: 'Не получилось найти рейтинг в профиле\n{0}'},
        unknownRating: {en: 'Unknown rating "{0}"\nScript know only {1}', ru: 'Неизвестный рейтинг: "{0}".\nСкрипт знает только про {1}'},
        noNumber: {en: 'Unable to find "{0}"\nProfile doesn\'t contain "{1}"', ru: 'Не получилось найти "{0}"\nВ профиле нет строки "{1}"'},
        badJSON: {en: 'Bad JSON\n{1}', ru: 'Плохой JSON\n{0}'},
        ratingChangedTitle: {en: 'Rating changed', ru: 'Рейтинг изменился'},
        ratingChanged: {en: 'New rating: {0}!', ru: 'Новый рейтинг: {0}!'},
        newAgreements: {en: 'New agreements', ru: 'Новые соглашения'},
        newAgreement: {en: '+{0} {1}', ru: '+{0} {1}'},
        accepted: {en: 'approved', ru: 'добавлено'},
        rejected: {en: 'rejected', ru: 'отклонено'},
        duplicated: {en: 'duplicated', ru: 'дубликатов'},
        error: {en: 'Error', ru: 'Ошибка'},
        setOffset: {en: 'Double-click to set offset for poor', ru: 'Кликните дважды, чтобы установить разницу для кандидатов, не засчитавшихся в пуре'},
    }

    run();

})(jQuery);
