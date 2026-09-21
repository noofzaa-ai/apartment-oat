"use client";

import { useEffect, useState } from "react";

/**
 * Client-side interactivity for the landing page:
 * - mobile menu toggle
 * - reveal-on-scroll animations (IntersectionObserver)
 * Ported from the original static script.js.
 */
export default function LandingClient() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // The .reveal sections live in page.tsx as SIBLINGS of this component's
    // wrapper, so we must query the whole document, not a local subtree.
    const reveals = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if ("IntersectionObserver" in window && !prefersReduced) {
      const observer = new IntersectionObserver(
        (entries, currentObserver) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              currentObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 },
      );
      reveals.forEach((item) => observer.observe(item));
      return () => observer.disconnect();
    }

    reveals.forEach((item) => item.classList.add("is-visible"));
  }, []);

  return (
    <div style={{ display: "contents" }}>
      <button
        className="menu-toggle"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="mobile-nav"
        aria-label={menuOpen ? "ปิดเมนู" : "เปิดเมนู"}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <span></span>
        <span></span>
      </button>
      <nav className="mobile-nav" id="mobile-nav" aria-label="เมนูมือถือ" hidden={!menuOpen}>
        <a href="#features" onClick={() => setMenuOpen(false)}>ฟีเจอร์</a>
        <a href="#how-it-works" onClick={() => setMenuOpen(false)}>วิธีทำงาน</a>
        <a href="#for-who" onClick={() => setMenuOpen(false)}>สำหรับใคร</a>
      </nav>
    </div>
  );
}
