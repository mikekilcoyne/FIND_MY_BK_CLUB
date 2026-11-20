/* ===========================================================================
   BREAKFAST CLUB INTERNATIONAL — ZANY KIT (behaviour)
   ---------------------------------------------------------------------------
   Three helpers. No dependencies, no framework. Safe to call more than once.

     bcHop(selector)        wrap characters so .bc-hop can bounce them
     bcScribbles(selector)  fire the handwriting reveal when scrolled into view
     bcDoodles(selector)    scatter bobbing line doodles inside a .bc-stage

   Plain HTML:   <script src="zany.js"></script> then bcInit();
   Next.js:      see ZanyLayer.tsx — same code, wrapped in a client component.
   =========================================================================== */

(function (global) {
  "use strict";

  var reduced =
    global.matchMedia &&
    global.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- 1. HOP ------------------------------------------------------------
     Splits text into per-character spans with a staggered index. Marked with
     data-bc-hopped so a re-run (React re-render, SPA nav) is a no-op.
     Spaces become fixed-width spans so the stagger doesn't collapse them. */
  function bcHop(selector) {
    var nodes = document.querySelectorAll(selector || ".bc-hop");
    Array.prototype.forEach.call(nodes, function (el) {
      if (el.dataset.bcHopped === "1") return;
      var text = el.textContent;
      el.setAttribute("aria-label", text);
      el.textContent = "";
      var i = 0;
      Array.prototype.forEach.call(text, function (ch) {
        var s = document.createElement("span");
        s.setAttribute("aria-hidden", "true");
        if (ch === " ") {
          s.className = "bc-ch bc-ch--space";
          s.innerHTML = "&nbsp;";
        } else {
          s.className = "bc-ch";
          s.textContent = ch;
        }
        s.style.setProperty("--i", i++);
        el.appendChild(s);
      });
      el.dataset.bcHopped = "1";
    });
  }

  /* --- 2. SCRIBBLES ------------------------------------------------------
     Adds .bc-in once visible, which starts the clip-path write-on.

     Anything already on screen at load is revealed straight away from its
     rect. IntersectionObserver is only used for what is still below the fold.
     Doing it this way matters: an observer registered on an element that is
     already intersecting does not reliably deliver its first callback in a
     background or freshly-restored tab, which left above-the-fold scribbles
     clipped to nothing. The rect check has no such dependency. */
  function bcScribbles(selector) {
    var nodes = document.querySelectorAll(selector || ".bc-scribble--write");
    var vh = global.innerHeight || document.documentElement.clientHeight;

    function reveal(el) {
      el.classList.add("bc-in");
    }
    function onScreen(el) {
      var r = el.getBoundingClientRect();
      return r.top < vh * 0.92 && r.bottom > 0;
    }

    if (!("IntersectionObserver" in global)) {
      Array.prototype.forEach.call(nodes, reveal);
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          reveal(e.target);
          io.unobserve(e.target);
        });
      },
      { threshold: 0.45 }
    );

    Array.prototype.forEach.call(nodes, function (el) {
      if (el.dataset.bcWatched === "1") return;
      el.dataset.bcWatched = "1";
      if (onScreen(el)) reveal(el);
      else io.observe(el);
    });
  }

  /* --- 3. DOODLES --------------------------------------------------------
     Hand-drawn marks, stroked in currentColor so they inherit the section.
     Deliberately few: the deck runs a dozen a slide, a clean site wants three. */
  /* Every mark has to say breakfast, community, or meeting someone new.
     A generic sparkle or arrow says "a designer was here" -- those were cut
     rather than kept as filler. */
  /* Mike's actual marks, lifted from the "Hey! I'm New in Town" title art
     (Procreate -> hey_im_new_in_town_neon_lineart.svg, <g id="doodles">).

     These replaced a set of literal line drawings -- two cups, a croissant, a
     wave, speech bubbles -- and then replaced my own redrawn approximations of
     these, which was the right call: a generated imitation of hand-drawn marks
     is exactly the uncanny register the site is trying to avoid. These are the
     real gestures, the real wobble, the real pressure.

     Each keeps its own viewBox and its original coordinates -- nothing is
     resampled or normalised, so the linework is bit-for-bit what was drawn.
     Stroke width is 26 in that coordinate space, which is why the viewBoxes
     look large. `ink` names a palette token, not a colour, so the scatter can
     be recoloured from the stylesheet.

     The source had each mark twice: a black stroke-width 26 underlay and a
     white 8 core, which is the neon treatment used on the title card. On the
     site they are single-stroke and coloured, matching how they appear in the
     flat stills. Three of the X marks are two separate strokes, hence `d`
     being a list. */
  var MARKS = {
    "cross-medium": { vb: "3122 712 136 136", ink: "pink", d: ["M3162,752 L3218,808", "M3218,752 L3162,808"] },
    "cross-small": { vb: "429 1849 142 142", ink: "sun", d: ["M469,1889 L531,1951", "M531,1889 L469,1951"] },
    "cross-tiny": { vb: "3317 297 126 126", ink: "sun", d: ["M3357,337 L3403,383", "M3403,337 L3357,383"] },
    "ring": { vb: "470 1110 240 240", ink: "sky", c: [590, 1230, 80] },
    "squiggle-flat": { vb: "340 1415 230 156", ink: "sky", d: ["M380,1520 L383,1521 L387,1523 L390,1524 L393,1526 L397,1527 L400,1528 L403,1529 L406,1529 L409,1530 L412,1530 L415,1531 L418,1531 L421,1530 L423,1530 L426,1529 L428,1528 L431,1527 L433,1525 L435,1523 L437,1521 L439,1519 L441,1517 L443,1514 L445,1511 L447,1508 L448,1505 L450,1502 L452,1499 L454,1496 L455,1493 L457,1489 L458,1486 L460,1483 L462,1480 L464,1477 L465,1474 L467,1471 L469,1469 L471,1466 L473,1464 L475,1462 L477,1460 L480,1459 L482,1457 L485,1456 L487,1456 L490,1455 L492,1455 L495,1455 L498,1455 L501,1455 L504,1456 L507,1457 L510,1457 L514,1459 L517,1460 L520,1461 L524,1462 L527,1464 L530,1465"] },
    "squiggle-tall": { vb: "680 53 177 287", ink: "mint", d: ["M720,300 L727,298 L733,297 L739,295 L745,293 L750,291 L755,289 L759,287 L762,284 L765,281 L766,278 L767,274 L767,270 L766,266 L765,262 L763,257 L760,252 L757,247 L753,242 L749,236 L745,231 L741,226 L737,220 L733,215 L730,210 L727,205 L725,200 L724,196 L723,192 L723,188 L724,184 L725,181 L728,178 L731,175 L735,173 L740,171 L745,169 L751,167 L757,165 L764,164 L770,162 L777,161 L783,159 L789,157 L795,156 L800,154 L805,151 L809,149 L812,146 L815,143 L817,140 L817,136 L817,133 L817,128 L815,124 L813,119 L810,114 L807,109 L803,104 L799,99 L795,93"] },
    "squiggle-wide": { vb: "3080 1129 278 196", ink: "pink", d: ["M3120,1280 L3125,1281 L3131,1282 L3136,1283 L3141,1284 L3146,1285 L3151,1285 L3155,1285 L3160,1285 L3164,1285 L3167,1284 L3171,1283 L3174,1281 L3177,1279 L3180,1276 L3183,1273 L3185,1270 L3187,1266 L3188,1262 L3190,1258 L3191,1253 L3192,1248 L3193,1243 L3194,1238 L3194,1233 L3195,1227 L3196,1222 L3197,1217 L3197,1211 L3198,1206 L3199,1201 L3201,1197 L3202,1193 L3204,1188 L3206,1185 L3208,1181 L3210,1179 L3213,1176 L3216,1174 L3219,1172 L3223,1171 L3227,1170 L3231,1170 L3235,1169 L3240,1170 L3244,1170 L3249,1171 L3254,1172 L3260,1173 L3265,1174 L3270,1175 L3275,1176 L3281,1177 L3286,1178 L3291,1179 L3296,1180 L3301,1180 L3305,1180 L3310,1180 L3314,1180 L3318,1179"] },
    "triangle-large": { vb: "2750 198 260 236", ink: "sun", d: ["M2880,394 L2790,238 L2970,238 Z"] },
    "triangle-small": { vb: "568 650 184 170", ink: "mint", d: ["M660,690 L712,780 L608,780 Z"] },
    "zigzag": { vb: "3190 1635 227 312", ink: "pink", d: ["M3230,1907 L3346,1876 L3261,1791 L3377,1760 L3292,1675"] },
  };

  // Drawn as a circle in the source, so it needs its own element type.
  function markGeometry(doc, m) {
    if (m.c) {
      var c = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", m.c[0]); c.setAttribute("cy", m.c[1]); c.setAttribute("r", m.c[2]);
      return [c];
    }
    return m.d.map(function (dd) {
      var p = doc.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", dd);
      return p;
    });
  }

  /* Placements, as percentages so they hold at any width.

     Rule, unchanged and load-bearing: doodles live in the OUTER MARGINS only.
     Headlines and copy run down the left of the column, so nothing sits left
     of 86% except below the 75% line where the text has ended. An earlier
     placement at x:4%/y:16% put a coffee cup straight through the first line
     of the h1.

     Five marks per stage rather than the old three -- these are smaller and
     simpler, so the same visual weight buys more of them. Colours alternate
     deliberately: no two neighbours share one, or it reads as a pattern
     instead of a scatter. */
  var LAYOUTS = {
    sparse: [
      { k: "squiggle-tall",  x: "90%", y: "13%", s: 40, r0: -6, r1: 4,  d: "7s"   },
      { k: "triangle-large", x: "95%", y: "40%", s: 32, r0: 8,  r1: -5, d: "6.5s" },
      { k: "cross-medium",   x: "91%", y: "62%", s: 26, r0: -4, r1: 7,  d: "5.5s" },
      { k: "zigzag",         x: "94%", y: "83%", s: 30, r0: 5,  r1: -6, d: "5s"   },
      { k: "ring",           x: "4%",  y: "90%", s: 28, r0: -5, r1: 5,  d: "6s"   },
    ],
    corners: [
      { k: "squiggle-wide",  x: "92%", y: "12%", s: 38, r0: 6,  r1: -6, d: "5.5s" },
      { k: "ring",           x: "89%", y: "38%", s: 26, r0: -5, r1: 5,  d: "6s"   },
      { k: "squiggle-flat",  x: "95%", y: "66%", s: 34, r0: 4,  r1: -7, d: "6.5s" },
      { k: "triangle-small", x: "4%",  y: "88%", s: 26, r0: -6, r1: 6,  d: "5s"   },
      { k: "cross-tiny",     x: "7%",  y: "78%", s: 20, r0: 9,  r1: -4, d: "4.5s" },
    ],
  };

  function bcDoodles(selector, mode) {
    var stages = document.querySelectorAll(selector || ".bc-stage");
    Array.prototype.forEach.call(stages, function (stage) {
      if (stage.querySelector(":scope > .bc-doodles")) return; // already done
      var layout = LAYOUTS[mode || stage.dataset.bcDoodles || "sparse"];
      if (!layout) layout = LAYOUTS.sparse;

      var wrap = document.createElement("div");
      wrap.className = "bc-doodles";
      wrap.setAttribute("aria-hidden", "true");

      layout.forEach(function (d, i) {
        var m = MARKS[d.k];
        if (!m) return;

        // Each mark keeps the viewBox it was drawn in, so aspect ratio comes
        // from the artwork rather than being forced into a square.
        var vb = m.vb.split(" ").map(Number);
        var ratio = vb[3] / vb[2];

        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", m.vb);
        svg.setAttribute("width", d.s);
        svg.setAttribute("height", Math.round(d.s * ratio));
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "var(--bc-mark-" + m.ink + ")");
        // 26 is the width these were drawn at, in their own coordinate space.
        svg.setAttribute("stroke-width", "26");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        svg.style.left = d.x;
        svg.style.top = d.y;
        svg.style.setProperty("--bc-r0", d.r0 + "deg");
        svg.style.setProperty("--bc-r1", d.r1 + "deg");
        svg.style.setProperty("--bc-d", d.d);
        svg.style.setProperty("--bc-dl", (i * -0.8) + "s");
        svg.style.setProperty("--bc-dy", "-10px");

        markGeometry(document, m).forEach(function (el) { svg.appendChild(el); });
        wrap.appendChild(svg);
      });

      // First child so it sits behind the content without needing a z-index war.
      stage.insertBefore(wrap, stage.firstChild);
    });
  }

  /* --- 4. CLUBBY IDLE ------------------------------------------------------
     After `ms` with no sign of life he gets bored: half-lidded eyes looking
     away, flat mouth, slow blink. Any activity wakes him.

     Deliberately generous at 25s. Short timeouts make him look impatient with
     you, which is the opposite of the character — he's meant to be the one who
     gives up on waiting, sheepishly, not the one tapping his foot.

     `scroll` is on window with passive:true so it never blocks the scroll, and
     visibilitychange wakes him on tab return — otherwise he'd be bored the
     instant you came back, having "idled" the whole time you were away. */
  function bcClubbyIdle(ms) {
    var buttons = document.querySelectorAll(".bc-clubby");
    if (!buttons.length) return;

    var timer = null;
    var delay = ms || 25000;

    function setBored(on) {
      Array.prototype.forEach.call(buttons, function (b) {
        b.classList.toggle("bc-clubby--bored", on);
      });
    }
    function wake() {
      setBored(false);
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { setBored(true); }, delay);
    }

    ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"].forEach(
      function (ev) { global.addEventListener(ev, wake, { passive: true }); }
    );
    global.addEventListener("scroll", wake, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) wake();
    });

    wake();
  }

  function bcInit(opts) {
    opts = opts || {};
    bcHop(opts.hop);
    bcScribbles(opts.scribble);
    if (!reduced || opts.doodlesWhenReduced) bcDoodles(opts.stage);
    bcClubbyIdle(opts.idleMs);
  }

  global.bcHop = bcHop;
  global.bcScribbles = bcScribbles;
  global.bcDoodles = bcDoodles;
  global.bcClubbyIdle = bcClubbyIdle;
  global.bcInit = bcInit;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { bcInit(); });
  } else {
    bcInit();
  }
})(window);
