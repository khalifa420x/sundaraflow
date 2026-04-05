'use client';

import { useEffect } from 'react';

/**
 * Initialise les animations globales :
 * - .reveal : fade-in au scroll via IntersectionObserver
 * - [data-w] : largeur des barres de progression au scroll
 */
export default function AnimationInit() {
  useEffect(() => {
    // Reveal
    const revealEls = document.querySelectorAll<HTMLElement>('.reveal');
    revealEls.forEach((el) => {
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) { el.classList.add('visible'); obs.disconnect(); } },
        { threshold: 0.1 }
      );
      obs.observe(el);
    });

    // Barres data-w (hors Dashboard qui gère les siennes)
    const barEls = document.querySelectorAll<HTMLElement>('[data-w]');
    barEls.forEach((el) => {
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) { el.style.width = el.dataset.w + '%'; obs.disconnect(); } },
        { threshold: 0.35 }
      );
      obs.observe(el);
    });
  }, []);

  return null;
}
