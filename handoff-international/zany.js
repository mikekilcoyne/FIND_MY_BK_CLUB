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
  var DOODLE_PATHS = {
    // --- breakfast -------------------------------------------------------
    // coffee cup, side on
    cup:
      "M6 10h30v14a12 12 0 0 1-12 12h-6A12 12 0 0 1 6 24zM36 14h5a6 6 0 0 1 0 12h-5M4 44h40",
    // croissant
    croissant:
      "M6 30c6-14 24-22 38-18-2 12-10 22-22 26-8 3-14 0-16-8zM14 28c6-6 14-10 22-11M12 20c4 2 7 6 8 11",
    // steam curling off something hot
    steam:
      "M8 34c0-8 8-8 8-16S8 10 8 2M22 34c0-8 8-8 8-16S22 10 22 2",

    // --- community: two of something, never one ---------------------------
    // two cups side by side -- the whole point of the club in one mark
    // two cups mid-toast, with a clink spark between them. Drawn to echo the
    // Barcelona flyer's line art (three hands clinking cups), which is the best
    // community motif the poster wall owns.
    cups:
      "M5 16h13.2l-1.9 11.8a3.3 3.3 0 0 1-3.3 2.8h-2.8a3.3 3.3 0 0 1-3.3-2.8z" +
      "M18.4 19.2h2.3a3.1 3.1 0 0 1 0 6.2h-2.3" +
      "M28.6 16h13.2l-1.9 11.8a3.3 3.3 0 0 1-3.3 2.8h-2.8a3.3 3.3 0 0 1-3.3-2.8z" +
      "M42 19.2h2.3a3.1 3.1 0 0 1 0 6.2H42" +
      "M23.4 8.6v3.8M20.4 10.4l1.6 2.6M26.4 10.4l-1.6 2.6",
    // two speech bubbles, mid-conversation
    chat:
      "M6 8h20a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H16l-6 5v-5H6a4 4 0 0 1-4-4v-8a4 4 0 0 1 4-4z" +
      "M34 22h8a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-1v4l-5-4h-2a4 4 0 0 1-4-4v-6a4 4 0 0 1 4-4z",

    // --- new in town ------------------------------------------------------
    // a wave hello
    wave:
      "M18 44V15a2.5 2.5 0 0 1 5 0v9M23 24V11a2.5 2.5 0 0 1 5 0v13" +
      "M28 24V14a2.5 2.5 0 0 1 5 0v14M33 28v-5a2.5 2.5 0 0 1 5 0v13" +
      "a12 12 0 0 1-12 12h-2a9 9 0 0 1-9-9" +
      "M9 11c-2.5 3.5-2.5 8.5 0 12M4 7c-3.5 5.5-3.5 15 0 21",
    // a heart, for the warmth of the thing
    heart:
      "M24 42S4 28 4 16A10 10 0 0 1 24 12 10 10 0 0 1 44 16c0 12-20 26-20 26z",
  };

  /* Placements, as percentages so they hold at any width.
     Rule: doodles live in the OUTER MARGINS only. Headlines and copy run down
     the left of the column, so nothing is placed left of 86% except below the
     75% line, where the text has ended. Earlier placements at x:4%/y:16% put a
     coffee cup straight through the first line of the h1.
     Sizes and opacity are deliberately modest -- these are marginalia. */
  var LAYOUTS = {
    // Hero: two cups (the club), then food. Three marks, all in the margin.
    sparse: [
      { k: "cups", x: "90%", y: "16%", s: 42, r0: -5, r1: 3, d: "7s" },
      { k: "croissant", x: "95%", y: "52%", s: 36, r0: -4, r1: 7, d: "6.5s" },
      { k: "heart", x: "92%", y: "86%", s: 22, r0: 8, r1: -4, d: "5s" },
    ],
    // Secondary sections: hello, and a conversation.
    corners: [
      { k: "wave", x: "94%", y: "14%", s: 30, r0: 6, r1: -6, d: "5.5s" },
      { k: "chat", x: "90%", y: "64%", s: 34, r0: -5, r1: 5, d: "6s" },
      { k: "cup", x: "4%", y: "86%", s: 26, r0: 4, r1: -7, d: "4.5s" },
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
        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 48 48");
        svg.setAttribute("width", d.s);
        svg.setAttribute("height", d.s);
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "2.1");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        svg.style.left = d.x;
        svg.style.top = d.y;
        svg.style.setProperty("--bc-r0", d.r0 + "deg");
        svg.style.setProperty("--bc-r1", d.r1 + "deg");
        svg.style.setProperty("--bc-d", d.d);
        svg.style.setProperty("--bc-dl", (i * -0.8) + "s");
        svg.style.setProperty("--bc-dy", "-10px");

        var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute("d", DOODLE_PATHS[d.k]);
        svg.appendChild(p);
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
