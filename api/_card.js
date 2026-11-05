/* ============================================
   OUTREPD — one lifter's public card, for the server

   Shared by /api/u (the page a shared link opens, with that lifter's own
   title and picture for the link preview) and /api/og (that picture).
   Read the way u/card.js reads it in the browser: public_lifter_card() in
   the app repo's supabase/social.sql, with the same public anon key.
   ============================================ */

'use strict';

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://pzhdakzjbjyxhspymjhb.supabase.co';
// The public anon key, the same one u/card.js ships to every browser.
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6aGRha3pqYmp5eGhzcHltamhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMjA5NzIsImV4cCI6MjEwNTU5Njk3Mn0.G5toztBBPfPxiyNxL2yRzWwRjNHiTA8dK8EMFiRwXZI';

// Same seven tiers and colours as u/card.js and kTiers in the app's
// theme.dart; `text` is the crest's light colour, for the rank line.
const TIERS = [
  { name: 'Iron', color: '#5E5E5B', text: '#B8B8B2' },
  { name: 'Bronze', color: '#A8663A', text: '#E3A272' },
  { name: 'Silver', color: '#8894A0', text: '#D8E2E8' },
  { name: 'Gold', color: '#B8912F', text: '#F7D87F' },
  { name: 'Platinum', color: '#8794A0', text: '#EDF4F8' },
  { name: 'Diamond', color: '#2F8F88', text: '#7FE0D6' },
  { name: 'Master', color: '#CFC3B0', text: '#F6B49F' },
];
const DIVISIONS = ['V', 'IV', 'III', 'II', 'I'];

const clamp = (n, lo, hi) => Math.min(Math.max(n || 0, lo), hi);

// The rating the app shows: ratingOf() in lib/ranking.dart — 1,000 at the
// bottom of the ladder, 100 a division, plus the LP into the division.
function ratingOf(card) {
  const tier = clamp(card.tier_idx, 0, 6);
  const div = clamp(card.div_idx, 0, 4);
  return 1000 + (tier * DIVISIONS.length + div) * 100 + (card.lp || 0);
}

// Everything the page and the picture say about a lifter, worked out once.
function describe(card) {
  const tierIdx = clamp(card.tier_idx, 0, 6);
  const tier = TIERS[tierIdx];
  const division = DIVISIONS[clamp(card.div_idx, 0, 4)];
  const rating = ratingOf(card);
  return {
    username: card.username,
    tierIdx,
    tier,
    division,
    rank: tier.name + ' ' + division,
    rating,
    ratingText: rating.toLocaleString('en-US'),
    record: (card.wins || 0) + '–' + (card.losses || 0),
    bestSet: card.best_set || 0,
    streak: card.win_streak || 0,
    avatarUrl: card.avatar_url || null,
  };
}

async function fetchCard(username) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/public_lifter_card', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ their_username: username }),
  });
  if (!res.ok) throw new Error('public_lifter_card: ' + res.status);
  const rows = await res.json();
  return rows && rows.length ? rows[0] : null;
}

// The site's own crest.js — the app's badge and frame painters, ported —
// run here as it runs in a browser, so the picture wears the same badge.
let crest = null;
function crestPainter() {
  if (crest) return crest;
  const code = fs.readFileSync(path.join(process.cwd(), 'u', 'crest.js'), 'utf8');
  const window = {};
  new Function('window', code)(window);
  crest = window.OutrepdCrest;
  return crest;
}

const escapeXml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

module.exports = { TIERS, DIVISIONS, ratingOf, describe, fetchCard, crestPainter, escapeXml };
