/* ============================================
   OUTREPD — /c/<code>, a challenge by link, for whoever does not have the
   app yet (with it, the phone opens the challenge in the app instead).

   Reads public_challenge_card() in the app repo's supabase/challenge.sql
   with the same public anon key u/card.js uses: who sent it, the number,
   when it closes and how many took it. Nothing about who took it.
   ============================================ */

(function () {
  'use strict';

  var SUPABASE_URL = 'https://pzhdakzjbjyxhspymjhb.supabase.co';
  var SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6aGRha3pqYmp5eGhzcHltamhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMjA5NzIsImV4cCI6MjEwNTU5Njk3Mn0.G5toztBBPfPxiyNxL2yRzWwRjNHiTA8dK8EMFiRwXZI';

  var APP_STORE = 'https://apps.apple.com/app/id6817853725';
  var GOOGLE_PLAY =
    'https://play.google.com/store/apps/details?id=com.outrepd.outrepd';
  var apple = /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
  var android = /Android/i.test(navigator.userAgent);

  // Six letters and digits, without the ones easy to misread.
  function getCode() {
    var match = location.pathname.match(/\/c\/([^/?#]+)/i);
    var code = match ? decodeURIComponent(match[1]).toLowerCase() : '';
    return /^[2-9a-hjkmnp-z]{6}$/.test(code) ? code : null;
  }

  function wireStores(code) {
    var first = apple ? APP_STORE : GOOGLE_PLAY;
    ['nav-download-btn', 'missing-download-btn', 'card-download-btn'].forEach(
      function (id) {
        var el = document.getElementById(id);
        if (el) el.href = first;
      },
    );
    var other = document.getElementById('card-other-store');
    other.href = apple ? GOOGLE_PLAY : APP_STORE;
    other.textContent = apple ? 'Get it on Google Play' : 'Download on the App Store';

    // With the app already there: on Android, straight into it; on an
    // iPhone, Safari's banner at the top carries the link in.
    if (code && android) {
      var open = document.getElementById('challenge-open');
      open.href =
        'intent://www.outrepd.com/c/' + code +
        '#Intent;scheme=https;package=com.outrepd.outrepd;S.browser_fallback_url=' +
        encodeURIComponent(GOOGLE_PLAY) + ';end';
      open.hidden = false;
    }
    if (code) {
      document
        .getElementById('itunes-banner')
        .setAttribute(
          'content',
          'app-id=6817853725, app-argument=https://www.outrepd.com/c/' + code,
        );
    }
  }

  function show(id) {
    ['state-loading', 'state-missing', 'state-card'].forEach(function (s) {
      document.getElementById(s).hidden = s !== id;
    });
  }

  async function fetchChallenge(code) {
    var res = await fetch(SUPABASE_URL + '/rest/v1/rpc/public_challenge_card', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ of_code: code }),
    });
    if (!res.ok) throw new Error('request failed: ' + res.status);
    var rows = await res.json();
    return rows && rows.length ? rows[0] : null;
  }

  function render(card) {
    var face = document.getElementById('challenge-face');
    face.setAttribute('data-initial', (card.username || '?').charAt(0).toUpperCase());
    // The initial stays underneath until the photo has loaded.
    if (card.avatar_url) {
      var photo = document.createElement('img');
      photo.alt = '';
      photo.src = card.avatar_url;
      face.appendChild(photo);
    }
    document.getElementById('challenge-who').textContent =
      card.username + ' challenges you';
    document.getElementById('challenge-reps').textContent = card.reps;

    var meta = [];
    if (card.is_open) {
      var left = Math.ceil((new Date(card.expires_at) - Date.now()) / 86400000);
      meta.push(left <= 1 ? 'Closes within a day' : 'Open ' + left + ' more days');
    } else {
      document.getElementById('challenge-ask').textContent = 'This challenge has closed.';
    }
    if (card.takes > 0) {
      meta.push(card.takes === 1 ? '1 person took it' : card.takes + ' people took it');
    }
    document.getElementById('challenge-meta').textContent = meta.join(' · ');
    document.title = card.username + ' challenges you — OUTREPD';
  }

  async function main() {
    var code = getCode();
    wireStores(code);
    if (!code) {
      show('state-missing');
      return;
    }
    try {
      var card = await fetchChallenge(code);
      if (!card) {
        show('state-missing');
        return;
      }
      render(card);
      show('state-card');
    } catch (error) {
      console.error('Could not load the challenge:', error);
      show('state-missing');
    }
  }

  main();
})();
