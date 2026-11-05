/* ============================================
   OUTREPD — /u/<username>, with that lifter's own link preview

   The page itself is u/index.html, unchanged: its JS draws the card in the
   browser. A chat app making a link preview never runs that JS, so it read
   the page's static title and picture — the site's, not the lifter's — and a
   shared profile looked like a link to the website (the user, 2026-11-05).
   Here the same page is served with the lifter's name, rank and record in
   its title and description, and /api/og's picture of their card.

   Nobody by that name, or the server not answering: the page as it is.
   ============================================ */

'use strict';

const fs = require('fs');
const path = require('path');
const { describe, fetchCard } = require('./_card');

const SITE = 'https://www.outrepd.com';

let page = null;
function staticPage() {
  if (!page) page = fs.readFileSync(path.join(process.cwd(), 'u', 'index.html'), 'utf8');
  return page;
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function withMeta(html, d) {
  const title = escapeHtml(d.username + ' on OUTREPD — ' + d.rank);
  const description = escapeHtml(
    d.ratingText + ' rating · ' + d.record + ' · Duel me in a live 1v1 push-up showdown, counted by the camera.',
  );
  const url = SITE + '/u/' + encodeURIComponent(d.username);
  // The rating and record in the picture's URL: a card that changes is a new
  // picture to a chat app, not an old one it kept.
  const image =
    SITE + '/api/og?u=' + encodeURIComponent(d.username) +
    '&v=' + d.rating + '-' + d.record.replace('–', '-') + '-' + d.bestSet + '-' + d.streak + (d.avatarUrl ? '-p' : '');
  const swap = (pattern, replacement) => {
    html = html.replace(pattern, () => replacement);
  };
  swap(/<title>[^<]*<\/title>/, '<title>' + title + '</title>');
  swap(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + description + '">');
  swap(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + title + '">');
  swap(
    /<meta property="og:description" content="[^"]*">/,
    '<meta property="og:description" content="' + description + '">\n  <meta property="og:url" content="' + escapeHtml(url) + '">',
  );
  swap(/<meta property="og:image" content="[^"]*">/, '<meta property="og:image" content="' + escapeHtml(image) + '">');
  swap(/<meta name="twitter:image" content="[^"]*">/, '<meta name="twitter:image" content="' + escapeHtml(image) + '">');
  return html;
}

module.exports = async function handler(req, res) {
  const username = String((req.query && req.query.username) || '').trim();
  let html = staticPage();
  try {
    const card = username ? await fetchCard(username) : null;
    if (card) html = withMeta(html, describe(card));
  } catch (error) {
    console.error('u', username, error);
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // A few minutes at the edge: a rank changes after a match, not by the second.
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
  res.end(html);
};

module.exports.withMeta = withMeta;
