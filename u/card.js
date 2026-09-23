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

    document
      .getElementById('rank-card')
      .style.setProperty('--tier-color', tier.color);
    document.getElementById('rank-badge').setAttribute(
      'data-initial',
      username.charAt(0).toUpperCase(),
    );
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
      username + ' is waiting for a challenger on outrepd.';
  }

  async function main() {
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
