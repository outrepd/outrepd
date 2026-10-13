/* ============================================
   OUTREPD — the tier badge and the picture frame, drawn as SVG

   A line-for-line port of the app's own painters (lib/tier_badge.dart and
   lib/tier_frame.dart in the app repo), so the card here wears the same
   badge and frame as the card the app shares: same colours, same feathers,
   same glow. If either painter changes there, it changes here too.

   window.OutrepdCrest.badge(tierIdx, width)   the winged crest, as SVG
   window.OutrepdCrest.frame(tierIdx, diameter) the frame for a picture of
                                                that diameter, as SVG
   ============================================ */

(function () {
  'use strict';

  var EDGE = '#121110';
  var MASTER_LIGHT = '#F6B49F';

  // Iron to Master, as _crests in tier_badge.dart.
  var CRESTS = [
    { base: '#5E5E5B', mid: '#82827D', light: '#9A9A94', wing: '#5E5E5B', glow: 0, feathers: [] },
    { base: '#A8663A', mid: '#C9834E', light: '#E3A272', wing: '#7E4A28', glow: 0.3,
      feathers: [[98, 54, 132, 50, 118, 64]] },
    { base: '#8894A0', mid: '#AEBAC2', light: '#D8E2E8', wing: '#68747C', glow: 0.35,
      feathers: [[98, 40, 130, 32, 120, 48], [98, 54, 132, 50, 118, 64]] },
    { base: '#B8912F', mid: '#E0B145', light: '#F7D87F', wing: '#8A6518', glow: 0.5,
      feathers: [[98, 40, 130, 32, 120, 48], [98, 54, 132, 50, 118, 64], [98, 68, 126, 70, 111, 80]] },
    { base: '#8794A0', mid: '#BCC8D0', light: '#EDF4F8', wing: '#6F7C88', glow: 0.55, gem: '#DCE8EF',
      feathers: [[98, 28, 128, 16, 121, 34], [98, 40, 132, 32, 121, 48], [98, 54, 134, 50, 119, 64], [98, 68, 127, 70, 112, 80]] },
    { base: '#2F8F88', mid: '#5FC9C0', light: '#A8EDE7', wing: '#25716C', glow: 0.65,
      chevron: '#CFF7F3', gem: '#A8EDE7', laurel: '#5FC9C0',
      feathers: [[98, 26, 132, 12, 124, 32], [98, 40, 136, 30, 124, 48], [98, 54, 137, 50, 121, 65], [98, 68, 131, 70, 114, 81], [98, 80, 120, 88, 105, 92]] },
    { base: '#CFC3B0', mid: '#F0E9DC', light: '#FFFFFF', wing: '#E8846B', glow: 0.75,
      chevron: '#E8846B', laurel: '#E8846B', crown: true, shieldDy: 2,
      feathers: [],
      fan: [[37, -22, 50], [45, -12, 49], [53, -2, 46], [61, 8, 42], [69, 18, 36]] },
  ];

  // How strongly each tier's frame glows, as _FramePainter._glow.
  var FRAME_GLOW = [0, 0.22, 0.28, 0.42, 0.5, 0.6, 0.7];

  var uid = 0;

  function crestOf(tierIdx) {
    return CRESTS[Math.min(Math.max(tierIdx || 0, 0), CRESTS.length - 1)];
  }

  function f(n) {
    return Math.round(n * 100) / 100;
  }

  function rad(degrees) {
    return (degrees * Math.PI) / 180;
  }

  function mix(a, b, t) {
    var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
    var out = [16, 8, 0].map(function (shift) {
      var p = (x >> shift) & 255, q = (y >> shift) & 255;
      return Math.round(p + (q - p) * t).toString(16).padStart(2, '0');
    });
    return '#' + out.join('');
  }

  function poly(points) {
    return 'M' + points.map(function (p) {
      return f(p[0]) + ' ' + f(p[1]);
    }).join(' L') + ' Z';
  }

  function path(d, attrs) {
    return '<path d="' + d + '" ' + (attrs || '') + '/>';
  }

  /* A gradient along a line, in the drawing's own units. */
  function gradient(id, x1, y1, x2, y2, stops) {
    return '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + f(x1) + '" y1="' + f(y1) +
      '" x2="' + f(x2) + '" y2="' + f(y2) + '">' + stops.map(function (s) {
        return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' +
          (s[2] == null ? '' : ' stop-opacity="' + s[2] + '"') + '/>';
      }).join('') + '</linearGradient>';
  }

  /* Across a shape's own box, left to right. */
  function across(id, from, to) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' +
      from + '"/><stop offset="1" stop-color="' + to + '"/></linearGradient>';
  }

  function blur(id, sigma, x, y, w, h) {
    return '<filter id="' + id + '" filterUnits="userSpaceOnUse" x="' + f(x) + '" y="' + f(y) +
      '" width="' + f(w) + '" height="' + f(h) + '"><feGaussianBlur stdDeviation="' + f(sigma) + '"/></filter>';
  }

  // ─────────────────────────── the wing, as data ───────────────────────────

  /* A crest's right wing, feather by feather, with the roots at x 98. */
  function wingShapes(c) {
    if (c.fan) {
      return c.fan.map(function (fe) {
        return blade(fe[0] + (c.shieldDy || 0), fe[1], fe[2]);
      });
    }
    return c.feathers.map(function (t) {
      return [[98, t[1] - 1], [t[2], t[3]], [t[4], t[5]], [98, t[5] + 1]];
    });
  }

  /* One of Master's feathers. */
  function blade(y, degrees, length) {
    var a = rad(degrees), cos = Math.cos(a), sin = Math.sin(a);
    return [
      [98, y - 8],
      [94 + length * cos, y + length * sin],
      [94 + length * 0.7 * cos - sin * 9, y + length * 0.7 * sin + cos * 9],
      [98, y + 8],
    ];
  }

  // ──────────────────────────────── the badge ───────────────────────────────

  function shield(dy) {
    return 'M70 ' + (22 + dy) + ' L98 ' + (34 + dy) + ' L98 ' + (62 + dy) +
      ' C98 ' + (86 + dy) + ' 70 ' + (102 + dy) + ' 70 ' + (102 + dy) +
      ' C70 ' + (102 + dy) + ' 42 ' + (86 + dy) + ' 42 ' + (62 + dy) + ' L42 ' + (34 + dy) + ' Z';
  }

  function chevron(dy) {
    return poly([[56, 74 + dy], [70, 64 + dy], [84, 74 + dy], [84, 80 + dy], [70, 70 + dy], [56, 80 + dy]]);
  }

  var GEM = poly([[70, 5], [76.5, 14.5], [70, 24], [63.5, 14.5]]);

  function crown(dy) {
    var by = 22 + dy;
    return 'M52 ' + (by - 1) + ' L52 ' + (by - 5) + ' L57 ' + (by - 19) + ' L63 ' + (by - 6) +
      ' L70 ' + (by - 23) + ' L77 ' + (by - 6) + ' L83 ' + (by - 19) + ' L88 ' + (by - 5) +
      ' L88 ' + (by - 1) + ' Q70 ' + (by + 2) + ' 52 ' + (by - 1) + ' Z';
  }

  /* Where the shield's right edge is at height y. */
  function edgeX(y, dy) {
    if (y <= 34 + dy) return 70 + Math.max(0, y - (22 + dy)) * 28 / 12;
    if (y <= 62 + dy) return 98;
    if (y >= 102 + dy) return 70;
    function curve(t, a, b, c, d) {
      var u = 1 - t;
      return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
    }
    var lo = 0, hi = 1;
    for (var i = 0; i < 30; i++) {
      var m = (lo + hi) / 2;
      if (curve(m, 62 + dy, 86 + dy, 102 + dy, 102 + dy) < y) lo = m; else hi = m;
    }
    return curve((lo + hi) / 2, 98, 98, 70, 70);
  }

  /* A right-side wing shape on a side, its roots moved onto the shield. */
  function anchored(shape, dy, side) {
    var points = shape.map(function (p) {
      var x = p[0] === 98 ? edgeX(p[1], dy) - 5 : p[0];
      return [side > 0 ? x : 140 - x, p[1]];
    });
    return { d: poly(points), side: side, root: points[0], end: points[1] };
  }

  /* A leaf: a point at `at`, turned to `angle`, as two curves. */
  function leaf(at, angle, length, width) {
    var cos = Math.cos(angle), sin = Math.sin(angle);
    function p(x, y) {
      return [at[0] + x * cos - y * sin, at[1] + x * sin + y * cos];
    }
    var upper = p(length / 2, -width), lower = p(length / 2, width), point = p(length, 0);
    return 'M' + f(at[0]) + ' ' + f(at[1]) + ' Q' + f(upper[0]) + ' ' + f(upper[1]) + ' ' + f(point[0]) + ' ' +
      f(point[1]) + ' Q' + f(lower[0]) + ' ' + f(lower[1]) + ' ' + f(at[0]) + ' ' + f(at[1]) + ' Z';
  }

  function badgeLeaves(master, dy) {
    var out = [];
    [-1, 1].forEach(function (side) {
      for (var k = 0; k < 5; k++) {
        var u = (master ? 0.1 : 0.12) + k * 0.17;
        var at = [70 + side * ((master ? 25 : 24) * u + 2), 104.5 + dy * 2 - (master ? 9.5 : 9) * u * u - 4 * u];
        var degrees = (side > 0 ? -25 : 205) + (k % 2 ? 1 : -1) * 38 * side - side * k * 9;
        out.push(leaf(at, rad(degrees), (master ? 15 : 13) - k * 0.8, master ? 4.8 : 4.2));
      }
    });
    return out;
  }

  function badge(tierIdx, width) {
    var c = crestOf(tierIdx);
    var id = 'oc' + uid++;
    var dy = c.shieldDy || 0;
    var master = !!c.crown;
    var tip = master ? MASTER_LIGHT : c.light;
    var wings = [];
    wingShapes(c).forEach(function (shape) {
      wings.push(anchored(shape, dy, 1), anchored(shape, dy, -1));
    });
    var leaves = c.laurel ? badgeLeaves(master, dy) : [];
    var defs = [blur(id + 'g', 5, -40, -40, 220, 200), blur(id + 'd', 1.2, 40, 50, 60, 50)];
    var out = '';

    if (c.glow > 0) {
      var glow = 'fill="' + c.mid + '" fill-opacity="' + c.glow + '"';
      out += '<g filter="url(#' + id + 'g)">';
      wings.forEach(function (w) { out += path(w.d, glow); });
      leaves.forEach(function (d) { out += path(d, glow); });
      out += path(shield(dy), glow);
      if (master) out += path(crown(dy), glow);
      if (c.gem && !master) out += path(GEM, glow);
      out += '</g>';
    }

    defs.push(across(id + 'wr', c.wing, tip), across(id + 'wl', tip, c.wing));
    (master ? wings.slice().reverse() : wings).forEach(function (w) {
      out += path(w.d, 'fill="url(#' + id + (w.side > 0 ? 'wr' : 'wl') + ')"');
      if (master) {
        out += path(w.d, 'fill="none" stroke="#9E4733" stroke-opacity="0.45" stroke-width="0.6" stroke-linejoin="round"');
      }
      out += '<line x1="' + f(w.root[0]) + '" y1="' + f(w.root[1]) + '" x2="' + f(w.end[0]) + '" y2="' + f(w.end[1]) +
        '" stroke="' + tip + '" stroke-opacity="' + (master ? 0.8 : 0.7) + '" stroke-width="1"/>';
    });

    if (c.laurel) {
      out += path('M' + (46 - dy) + ' ' + (96 + dy) + ' Q70 ' + (113 + dy * 2) + ' ' + (94 + dy) + ' ' + (96 + dy),
        'fill="none" stroke="' + c.laurel + '" stroke-width="' + (master ? 1.7 : 1.6) + '" stroke-linecap="round"');
      defs.push(gradient(id + 'l', 70, 86 + dy, 70, 112 + dy * 2, [[0, tip], [1, c.laurel]]));
      leaves.forEach(function (d) { out += path(d, 'fill="url(#' + id + 'l)"'); });
    }

    if (c.gem && !master) {
      out += path(GEM, 'fill="' + c.base + '"');
      out += path(poly([[70, 5], [70, 14.5], [63.5, 14.5]]), 'fill="#FFFFFF" fill-opacity="0.9"');
      out += path(poly([[70, 5], [76.5, 14.5], [70, 14.5]]), 'fill="' + c.gem + '"');
      out += path(poly([[63.5, 14.5], [70, 14.5], [70, 24]]), 'fill="' + c.mid + '"');
      out += path(GEM, 'fill="none" stroke="' + EDGE + '" stroke-width="0.7"');
    }

    // The shield: shaded body, a dark edge, the two lit facets, the bevel.
    defs.push(gradient(id + 's', 42 + 0.15 * 56, 22 + dy, 42 + 0.85 * 56, 102 + dy, master
      ? [[0, '#FFFFFF'], [0.5, '#EDE4D4'], [1, '#B3A48B']]
      : [[0, c.mid], [0.5, c.base], [1, mix(c.base, '#000000', 0.28)]]));
    out += path(shield(dy), 'fill="url(#' + id + 's)"');
    out += path(shield(dy), 'fill="none" stroke="#0B0A09" stroke-opacity="' + (master ? 0.65 : 0.6) +
      '" stroke-width="' + (master ? 1.7 : 1.6) + '" stroke-linejoin="round"');
    defs.push(gradient(id + 'fr', 42, 22 + dy, 98, 48 + dy, master
      ? [[0, '#FFFFFF'], [1, '#F0E9DC']]
      : [[0, c.light], [1, c.mid]]));
    defs.push(gradient(id + 'fl', 42, 22 + dy, 98, 48 + dy, master
      ? [[0, '#FFFFFF'], [1, '#FFFFFF', 0.85]]
      : [[0, '#FFFFFF', 0.9], [1, c.light]]));
    out += path(poly([[70, 22 + dy], [98, 34 + dy], [70, 48 + dy]]), 'fill="url(#' + id + 'fr)"');
    out += path(poly([[42, 34 + dy], [70, 22 + dy], [70, 48 + dy]]), 'fill="url(#' + id + 'fl)"');
    out += path(shield(dy), 'fill="none" stroke="' + (master ? c.wing : c.light) + '" stroke-opacity="' +
      (master ? 0.85 : 0.55) + '" stroke-width="' + (master ? 1.3 : 1.1) + '" transform="translate(70 ' + (62 + dy) +
      ') scale(0.9) translate(-70 ' + -(62 + dy) + ')"');

    // The chevron, raised off the shield by its own shadow.
    var chevronColour = c.chevron || c.light;
    defs.push(gradient(id + 'c', 70, 64 + dy, 70, 80 + dy,
      [[0, c.chevron ? mix(chevronColour, '#FFFFFF', 0.25) : '#FFFFFF'], [1, chevronColour]]));
    out += path(chevron(dy), 'fill="#000000" fill-opacity="0.45" transform="translate(0 2)" filter="url(#' + id + 'd)"');
    out += path(chevron(dy), 'fill="url(#' + id + 'c)"');
    out += path('M56 ' + (74 + dy) + ' L70 ' + (64 + dy) + ' L84 ' + (74 + dy),
      'fill="none" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="0.8"');

    if (master) {
      var by = 22 + dy;
      defs.push(gradient(id + 'k', 70, by - 23, 70, by + 0.5, [[0, MASTER_LIGHT], [1, '#C9644B']]));
      out += path(crown(dy), 'fill="url(#' + id + 'k)"');
      out += path(crown(dy), 'fill="none" stroke="' + EDGE + '" stroke-width="0.9" stroke-linejoin="round"');
      out += '<line x1="52" y1="' + (by - 5) + '" x2="88" y2="' + (by - 5) + '" stroke="' + EDGE +
        '" stroke-opacity="0.5" stroke-width="0.7"/>';
      [[57, by - 19], [70, by - 23], [83, by - 19]].forEach(function (o) {
        out += '<circle cx="' + o[0] + '" cy="' + o[1] + '" r="2.1" fill="' + c.mid + '" stroke="' + EDGE +
          '" stroke-width="0.6"/>';
      });
    }

    return '<svg class="crest" width="' + f(width) + '" height="' + f(width * 120 / 140) +
      '" viewBox="0 0 140 120" overflow="visible" aria-hidden="true"><defs>' + defs.join('') + '</defs>' +
      out + '</svg>';
  }

  // ──────────────────────────────── the frame ───────────────────────────────

  /* The box a framed picture of `diameter` takes, as TierFrame's. */
  function frameBox(diameter) {
    return { width: diameter * 2.02, height: diameter * 1.25 };
  }

  function frame(tierIdx, diameter) {
    var c = crestOf(tierIdx);
    var id = 'of' + uid++;
    var box = frameBox(diameter);
    var cx = box.width / 2, cy = box.height / 2;
    var r = diameter / 2;
    var ringR = r * 1.1, ringW = Math.max(3, r * 0.17);
    var tip = c.crown ? MASTER_LIGHT : c.light;
    var strength = FRAME_GLOW[Math.min(Math.max(tierIdx || 0, 0), FRAME_GLOW.length - 1)];
    var defs = [blur(id + 'g', r * 0.13, -r, -r * 2, box.width + r * 2, box.height + r * 4)];
    var out = '';

    // The badge's wing either side of the ring, each root on the ring at
    // its own height.
    var scale = (r * 0.86) / 42;
    var base = ringR + ringW * 0.2, outer = ringR + ringW / 2;
    var feathers = [];
    [-1, 1].forEach(function (side) {
      function at(p) {
        var y = cy + (p[1] - 53) * scale * 1.08;
        if (p[0] !== 98) return [cx + side * (base + (p[0] - 98) * scale), y];
        var rise = Math.abs(y - cy);
        var acrossRing = Math.sqrt(Math.max(0, outer * outer - rise * rise));
        return [cx + side * (acrossRing - ringW * 0.5), y];
      }
      wingShapes(c).forEach(function (shape) {
        var points = shape.map(at);
        feathers.push({ d: poly(points), side: side, root: points[0], end: points[1] });
      });
    });

    var stemR = ringR + ringW * 0.5 + r * 0.1;
    var leaves = [];
    if (c.laurel) {
      [-1, 1].forEach(function (side) {
        for (var k = 0; k < 6; k++) {
          var th = rad(90 + side * (12 + k * 10));
          var point = [cx + stemR * Math.cos(th), cy + stemR * Math.sin(th)];
          var along = Math.atan2(Math.cos(th) * side, -Math.sin(th) * side);
          leaves.push(leaf(point, along + rad((k % 2 ? 42 : -42) * side), r * (0.27 - k * 0.012), r * 0.1));
        }
      });
    }

    var crownD = null, stones = [];
    if (c.crown) {
      var w = r * 0.7, h = r * 0.42, by = cy - ringR + ringW * 0.25;
      var left = cx - w / 2, right = cx + w / 2;
      crownD = poly([[left, by], [left - w * 0.04, by - h * 0.75], [cx - w * 0.24, by - h * 0.38], [cx, by - h],
        [cx + w * 0.24, by - h * 0.38], [right + w * 0.04, by - h * 0.75], [right, by]]);
      stones = [[left - w * 0.04, by - h * 0.75], [cx, by - h], [right + w * 0.04, by - h * 0.75]];
      defs.push(gradient(id + 'k', cx, by - h, cx, by, [[0, MASTER_LIGHT], [1, '#C9644B']]));
    }

    if (strength > 0) {
      var glow = 'fill="' + c.mid + '" fill-opacity="' + strength + '"';
      out += '<g filter="url(#' + id + 'g)">';
      feathers.forEach(function (fe) { out += path(fe.d, glow); });
      leaves.forEach(function (d) { out += path(d, glow); });
      if (crownD) out += path(crownD, glow);
      out += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(ringR) + '" fill="none" stroke="' + c.mid +
        '" stroke-opacity="' + strength + '" stroke-width="' + f(ringW) + '"/>';
      out += '</g>';
    }

    var reach = r * 2.02;
    [-1, 1].forEach(function (side) {
      var inner = cx + side * ringR, end = cx + side * reach;
      defs.push(gradient(id + (side > 0 ? 'wr' : 'wl'), Math.min(inner, end), cy, Math.max(inner, end), cy,
        side > 0 ? [[0, c.wing], [1, tip]] : [[0, tip], [1, c.wing]]));
    });
    (c.crown ? feathers.slice().reverse() : feathers).forEach(function (fe) {
      out += path(fe.d, 'fill="url(#' + id + (fe.side > 0 ? 'wr' : 'wl') + ')"');
      out += '<line x1="' + f(fe.root[0]) + '" y1="' + f(fe.root[1]) + '" x2="' + f(fe.end[0]) + '" y2="' +
        f(fe.end[1]) + '" stroke="' + tip + '" stroke-opacity="0.55" stroke-width="' + f(Math.max(0.6, r * 0.02)) + '"/>';
    });

    if (c.laurel) {
      [-1, 1].forEach(function (side) {
        var a0 = rad(90 + side * 8), a1 = rad(90 + side * 66);
        out += path('M' + f(cx + stemR * Math.cos(a0)) + ' ' + f(cy + stemR * Math.sin(a0)) + ' A' + f(stemR) + ' ' +
          f(stemR) + ' 0 0 ' + (side > 0 ? 1 : 0) + ' ' + f(cx + stemR * Math.cos(a1)) + ' ' + f(cy + stemR * Math.sin(a1)),
          'fill="none" stroke="' + c.laurel + '" stroke-width="' + f(Math.max(0.8, r * 0.03)) + '" stroke-linecap="round"');
      });
      defs.push(gradient(id + 'l', cx, cy, cx, cy + stemR + r * 0.3, [[0, tip], [1, c.laurel]]));
      leaves.forEach(function (d) { out += path(d, 'fill="url(#' + id + 'l)"'); });
    }

    // The ring: metal, light at the top left and dark at the bottom right.
    var ringOuter = ringR + ringW / 2;
    defs.push(gradient(id + 'r', cx - ringOuter, cy - ringOuter, cx + ringOuter, cy + ringOuter,
      [[0, c.light], [0.45, c.mid], [1, c.base]]));
    out += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(ringR) + '" fill="none" stroke="url(#' + id +
      'r)" stroke-width="' + f(ringW) + '"/>';
    out += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(ringOuter - 0.4) + '" fill="none" stroke="' +
      c.light + '" stroke-opacity="0.6" stroke-width="0.8"/>';
    out += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(ringR - ringW / 2 + 0.4) +
      '" fill="none" stroke="#000000" stroke-opacity="0.55" stroke-width="1"/>';

    if (c.gem && !c.crown) {
      var g = r * 0.17, my = cy - ringR;
      var top = [cx, my - g * 1.15], rightP = [cx + g * 0.8, my], bottom = [cx, my + g * 1.15], leftP = [cx - g * 0.8, my];
      var mid = [cx, my];
      out += path(poly([top, rightP, bottom, leftP]), 'fill="' + c.base + '"');
      out += path(poly([top, mid, leftP]), 'fill="#FFFFFF" fill-opacity="0.85"');
      out += path(poly([top, rightP, mid]), 'fill="' + c.gem + '"');
      out += path(poly([leftP, mid, bottom]), 'fill="' + c.mid + '"');
      out += path(poly([top, rightP, bottom, leftP]), 'fill="none" stroke="' + EDGE + '" stroke-width="1.2"');
    }

    if (crownD) {
      out += path(crownD, 'fill="url(#' + id + 'k)"');
      out += path(crownD, 'fill="none" stroke="' + EDGE + '" stroke-width="1.2" stroke-linejoin="round"');
      stones.forEach(function (s) {
        out += '<circle cx="' + f(s[0]) + '" cy="' + f(s[1]) + '" r="' + f(r * 0.045) + '" fill="' + c.mid +
          '" stroke="' + EDGE + '" stroke-width="0.8"/>';
      });
    }

    return '<svg class="frame" width="' + f(box.width) + '" height="' + f(box.height) + '" viewBox="0 0 ' +
      f(box.width) + ' ' + f(box.height) + '" overflow="visible" aria-hidden="true"><defs>' + defs.join('') +
      '</defs>' + out + '</svg>';
  }

  window.OutrepdCrest = { badge: badge, frame: frame, frameBox: frameBox };
})();
