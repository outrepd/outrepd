/* ============================================
   OUTREPD — /api/og?u=<username>: the picture a shared profile link shows

   1200×630, the size chat apps and social sites show a link with. The
   user's pick (2026-11-05): the tier's crest large on the left — or, for a
   lifter with a photo, the photo in the tier's frame — and beside it the
   name, the rank and rating, the record, best set and streak, and "Duel me
   on OUTREPD". The crest and frame are crest.js, the app's own painters.

   Drawn as SVG and turned into a PNG with resvg. The fonts are the site's
   (Archivo, Manrope), fetched from Google Fonts once per warm instance.
   ============================================ */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { describe, fetchCard, crestPainter, escapeXml } = require('./_card');

const W = 1200;
const H = 630;

let fonts = null;

// Google Fonts hands TrueType to a client that does not ask for WOFF2, and
// TrueType is what resvg reads — from files, so they are kept in the
// instance's temporary folder (the one place a function may write).
async function loadFonts() {
  if (fonts) return fonts;
  const css = await (
    await fetch(
      'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Manrope:wght@700;800',
      { headers: { 'User-Agent': 'Mozilla/4.0' } },
    )
  ).text();
  const urls = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]);
  if (!urls.length) throw new Error('no font files in the Google Fonts CSS');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'outrepd-fonts-'));
  fonts = await Promise.all(
    urls.map(async (u, i) => {
      const file = path.join(dir, i + '.ttf');
      fs.writeFileSync(file, Buffer.from(await (await fetch(u)).arrayBuffer()));
      return file;
    }),
  );
  return fonts;
}

async function photoData(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') || '').split(';')[0];
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > 4 * 1024 * 1024) return null;
    return 'data:' + type + ';base64,' + bytes.toString('base64');
  } catch (_) {
    return null;
  }
}

// An <svg> crest.js drew, placed at x, y in the picture.
function place(svg, x, y) {
  return svg.replace(/^<svg /, '<svg x="' + x + '" y="' + y + '" ');
}

// How wide a run of text comes out, near enough to lay a line out by: the
// share of an em each font's characters take on average.
const width = (text, size, em) => String(text).length * size * em;

function picture(d, photo) {
  const crest = crestPainter();
  const parts = [];
  parts.push('<rect width="' + W + '" height="' + H + '" fill="#121110"/>');
  parts.push(
    '<defs>' +
      '<radialGradient id="glow" cx="330" cy="290" r="450" gradientUnits="userSpaceOnUse">' +
      '<stop offset="0" stop-color="' + d.tier.color + '" stop-opacity=".38"/>' +
      '<stop offset=".62" stop-color="' + d.tier.color + '" stop-opacity="0"/></radialGradient>' +
      '<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="24"/></filter>' +
      '<clipPath id="face"><circle cx="0" cy="0" r="110"/></clipPath>' +
    '</defs>',
  );
  parts.push('<rect width="' + W + '" height="' + H + '" fill="url(#glow)"/>');

  // The hero, centred in the left 440 px: the crest, or the photo framed.
  if (photo) {
    // 220 across: the frame's wings then end short of the column on the right.
    const dia = 220;
    const box = crest.frameBox(dia);
    const x = 40 + (440 - box.width) / 2;
    const y = (H - box.height) / 2;
    parts.push(place(crest.frame(d.tierIdx, dia), x, y));
    const cx = x + box.width / 2;
    const cy = y + box.height / 2;
    parts.push(
      '<g transform="translate(' + cx + ' ' + cy + ')"><g clip-path="url(#face)">' +
        '<image href="' + photo + '" x="-110" y="-110" width="220" height="220" preserveAspectRatio="xMidYMid slice"/>' +
      '</g></g>',
    );
  } else {
    const w = 330;
    const svg = crest.badge(d.tierIdx, w);
    const h = Number((svg.match(/height="([\d.]+)"/) || [])[1]) || w * 0.857;
    const x = 40 + (440 - w) / 2;
    const y = (H - h) / 2;
    parts.push('<g filter="url(#soft)" opacity=".7">' + place(crest.badge(d.tierIdx, w), x, y) + '</g>');
    parts.push(place(svg, x, y));
  }

  // The column on the right, 510 to 1140.
  const left = 510;
  const right = 1140;
  const name = escapeXml(d.username);
  // A long name shrinks to the column rather than being cut.
  let nameSize = 96;
  while (nameSize > 32 && width(d.username, nameSize, 0.68) > right - left) nameSize -= 2;
  // The address beside the brand, when it fits there; the chat app shows the
  // link under the picture anyway.
  const address = 'outrepd.com/u/' + d.username;
  const addressFits = width(address, 22, 0.55) <= right - left - 210;
  parts.push(
    '<text x="' + left + '" y="100" font-family="Manrope" font-weight="800" font-size="22" letter-spacing="9.2" fill="#CFC6B4">OUTREPD</text>',
    addressFits ? '<text x="' + right + '" y="100" text-anchor="end" font-family="Manrope" font-weight="700" font-size="22" fill="#8E877B">' + escapeXml(address) + '</text>' : '',
    '<text x="' + left + '" y="212" font-family="Archivo Black" font-size="' + nameSize + '" fill="#F6F0E4">' + name + '</text>',
    '<text x="' + left + '" y="272" font-family="Archivo Black" font-size="40">' +
      '<tspan fill="' + d.tier.text + '">' + escapeXml(d.rank) + '</tspan>' +
      '<tspan fill="#CFC6B4"> · ' + escapeXml(d.ratingText) + ' rating</tspan></text>',
  );

  let x = left;
  for (const [value, label] of [[d.record, 'RECORD'], [d.bestSet, 'BEST SET'], [d.streak, 'STREAK']]) {
    parts.push(
      '<text x="' + x + '" y="370" font-family="Archivo Black" font-size="52" fill="#F6F0E4">' + escapeXml(value) + '</text>',
      '<text x="' + x + '" y="402" font-family="Manrope" font-weight="700" font-size="19" letter-spacing="2.7" fill="#8E877B">' + label + '</text>',
    );
    x += Math.max(width(value, 52, 0.66), width(label, 19, 0.78)) + 56;
  }

  const cta = 'Duel me on OUTREPD';
  const pillW = width(cta, 30, 0.6) + 64;
  parts.push(
    '<rect x="' + left + '" y="494" width="' + pillW + '" height="74" rx="37" fill="#EDE3CF"/>',
    '<text x="' + (left + pillW / 2) + '" y="541" text-anchor="middle" font-family="Manrope" font-weight="800" font-size="30" fill="#141210">' + cta + '</text>',
  );

  return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' + parts.join('') + '</svg>';
}

async function render(card) {
  const d = describe(card);
  const [fontFiles, photo] = await Promise.all([loadFonts(), photoData(d.avatarUrl)]);
  const svg = picture(d, photo);
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: W },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Manrope' },
  }).render().asPng();
  return png;
}

module.exports = async function handler(req, res) {
  const username = String((req.query && req.query.u) || '').trim();
  try {
    const card = username ? await fetchCard(username) : null;
    if (!card) {
      // Nobody by that name: the site's own picture.
      res.statusCode = 302;
      res.setHeader('Location', '/assets/home/og.jpg');
      res.end();
      return;
    }
    const png = await render(card);
    res.setHeader('Content-Type', 'image/png');
    // The URL carries the rating and record (api/u.js), so a changed card is
    // a new URL; the same one can be kept a day.
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
    res.end(png);
  } catch (error) {
    console.error('og', username, error);
    res.statusCode = 302;
    res.setHeader('Location', '/assets/home/og.jpg');
    res.end();
  }
};

module.exports.render = render;
module.exports.picture = picture;
