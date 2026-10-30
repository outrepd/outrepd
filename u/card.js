/* ============================================
   OUTREPD — /u/<username> card

   The anon key below is public by design: it is the exact same key the
   Android and iOS builds already ship inside their APK/IPA, and it is
   useless without the row level security policies that live on the server.
   See public_lifter_card() in the app repo's supabase/social.sql for what
   it is actually allowed to read.
   ============================================ */

(function () {
  'use strict';

  var SUPABASE_URL = 'https://pzhdakzjbjyxhspymjhb.supabase.co';
  var SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6aGRha3pqYmp5eGhzcHltamhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMjA5NzIsImV4cCI6MjEwNTU5Njk3Mn0.G5toztBBPfPxiyNxL2yRzWwRjNHiTA8dK8EMFiRwXZI';

  // Same seven tiers, same colours, as kTiers in the app's theme.dart — a
  // rank's colour has to agree wherever it is drawn.
  var TIERS = [
    { name: 'Iron', color: '#5E5E5B' },
    { name: 'Bronze', color: '#A8663A' },
    { name: 'Silver', color: '#8894A0' },
    { name: 'Gold', color: '#B8912F' },
    { name: 'Platinum', color: '#8794A0' },
    { name: 'Diamond', color: '#2F8F88' },
    { name: 'Master', color: '#CFC3B0' },
  ];
  var DIVISIONS = ['V', 'IV', 'III', 'II', 'I'];

  var APP_STORE = 'https://apps.apple.com/app/id6817853725';
  var GOOGLE_PLAY =
    'https://play.google.com/store/apps/details?id=com.outrepd.outrepd';

  // The store this phone uses first, the other one as a plain link under it:
  // a friend on an iPhone should not have to find their button.
  function wireStores() {
    var apple = /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
    var first = apple ? APP_STORE : GOOGLE_PLAY;
    ['nav-download-btn', 'missing-download-btn', 'card-download-btn'].forEach(
      function (id) {
        var el = document.getElementById(id);
        if (el) el.href = first;
      },
    );
    var other = document.getElementById('card-other-store');
    if (other) {
      other.href = apple ? GOOGLE_PLAY : APP_STORE;
      other.textContent = apple ? 'Get it on Google Play' : 'Download on the App Store';
    }
  }

  function getUsername() {
    var params = new URLSearchParams(location.search);
    var fromQuery = params.get('name');
    if (fromQuery) return fromQuery;
    // In case the host routes /u/<name> straight to this file.
    var match = location.pathname.match(/\/u\/([^/?#]+)/i);
    if (match && match[1] && match[1].toLowerCase() !== 'index.html') {
      return decodeURIComponent(match[1]);
    }
    return null;
  }

  function show(id) {
    ['state-loading', 'state-missing', 'state-card'].forEach(function (s) {
      document.getElementById(s).hidden = s !== id;
    });
  }

  async function fetchCard(username) {
    var res = await fetch(
      SUPABASE_URL + '/rest/v1/rpc/public_lifter_card',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ their_username: username }),
      },
    );
    if (!res.ok) throw new Error('request failed: ' + res.status);
    var rows = await res.json();
    return rows && rows.length ? rows[0] : null;
  }

  function render(card, username) {
    var tier = TIERS[Math.min(Math.max(card.tier_idx || 0, 0), 6)];
    var division = DIVISIONS[Math.min(Math.max(card.div_idx || 0, 0), 4)];

    // The card and the light behind the whole page both take the tier's colour.
    document
      .getElementById('rank-card')
      .style.setProperty('--tier-color', tier.color);
    document
      .querySelector('.card-page')
      .style.setProperty('--tier-color', tier.color);

    // The tier's badge, and their picture in the tier's frame: the same two
    // the app draws (crest.js), so the card here matches the one that sent
    // the reader to it.
    var tierIdx = Math.min(Math.max(card.tier_idx || 0, 0), 6);
    // The crest twice: a blurred copy behind it is the glow, so the light
    // follows the crest's own outline rather than a circle.
    var crest = window.OutrepdCrest.badge(tierIdx, 240);
    document.getElementById('rank-crest').innerHTML =
      '<span class="glow" aria-hidden="true">' + crest + '</span>' + crest;
    var picture = 60;
    var box = window.OutrepdCrest.frameBox(picture);
    var avatar = document.getElementById('rank-avatar');
    avatar.style.width = box.width + 'px';
    avatar.style.height = box.height + 'px';
    avatar.innerHTML = window.OutrepdCrest.frame(tierIdx, picture);
    var face = document.createElement('span');
    face.className = 'rank-card__face';
    face.style.width = face.style.height = picture + 'px';
    face.setAttribute('data-initial', username.charAt(0).toUpperCase());
    // The initial stays as the background — covered only once the photo has
    // actually loaded, so a broken or slow image never leaves a blank circle.
    if (card.avatar_url) {
      var photo = document.createElement('img');
      photo.className = 'rank-card__face-photo';
      photo.alt = '';
      photo.src = card.avatar_url;
      face.appendChild(photo);
    }
    avatar.appendChild(face);
    document.getElementById('rank-username').textContent = username;
    document.getElementById('rank-tier').textContent =
      tier.name + ' ' + division + ' · ' + (card.lp || 0) + ' / 100 LP';

    var places = [];
    if (card.global_place) places.push('Global #' + card.global_place);
    if (card.country_place && card.country) {
      places.push(card.country + ' #' + card.country_place);
    }
    document.getElementById('rank-places').textContent = places.join(' · ');

    var stats = [
      { value: (card.wins || 0) + '–' + (card.losses || 0), label: 'Record' },
      { value: card.best_set || 0, label: 'Best set' },
      { value: card.win_streak || 0, label: 'Streak' },
    ];
    var statsEl = document.getElementById('rank-stats');
    statsEl.innerHTML = '';
    stats.forEach(function (s) {
      var el = document.createElement('div');
      el.className = 'rank-card__stat';
      el.innerHTML =
        '<div class="rank-card__stat-value">' + s.value + '</div>' +
        '<div class="rank-card__stat-label">' + s.label + '</div>';
      statsEl.appendChild(el);
    });

    document.getElementById('card-tagline').textContent =
      username + ' is waiting for a challenger on OUTREPD.';
  }

  async function main() {
    wireStores();
    var username = getUsername();
    if (!username) {
      show('state-missing');
      return;
    }
    try {
      var card = await fetchCard(username);
      if (!card) {
        show('state-missing');
        return;
      }
      render(card, username);
      show('state-card');
    } catch (error) {
      console.error('Could not load the card:', error);
      show('state-missing');
    }
  }

  main();
})();
