"use client";

/**
 * ZanyLayer — runs the zany kit's behaviour inside Next.js App Router.
 *
 * Usage, in app/layout.tsx:
 *
 *   import "./zany-kit.css";
 *   import ZanyLayer from "@/components/ZanyLayer";
 *
 *   <body className="bc-grain">
 *     {children}
 *     <ZanyLayer />
 *   </body>
 *
 * Put `zany.js` in /public. This component loads it once and re-runs the
 * helpers on every client navigation, which matters: App Router swaps the DOM
 * without a reload, so a plain <script> would decorate the first page and then
 * silently do nothing on the next one.
 *
 * All three helpers are idempotent — they mark what they have touched with
 * data attributes — so re-running them after a route change only picks up new
 * nodes. Calling it twice on the same element is a no-op, not a double hop.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    bcInit?: (opts?: {
      hop?: string;
      scribble?: string;
      stage?: string;
      doodlesWhenReduced?: boolean;
    }) => void;
  }
}

const SRC = "/zany.js";

function loadOnce(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.bcInit) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${SRC}"]`
  );
  if (existing) {
    // Mounted twice before the first load finished — wait on that same tag
    // rather than injecting a second copy.
    return new Promise((resolve) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => resolve(), { once: true });
    });
  }

  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.addEventListener("load", () => resolve(), { once: true });
    s.addEventListener("error", () => {
      // The page must still render without the decoration.
      console.warn("[zany] could not load", SRC);
      resolve();
    }, { once: true });
    document.body.appendChild(s);
  });
}

export default function ZanyLayer() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    loadOnce().then(() => {
      if (cancelled) return;
      // One frame's grace so the new route's nodes are actually in the DOM —
      // the helpers measure rects, and measuring mid-commit gives zeroes.
      requestAnimationFrame(() => {
        if (!cancelled) window.bcInit?.();
      });
    });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
