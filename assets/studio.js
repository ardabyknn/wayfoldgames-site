// Wayfold Games studio pages: the map unfolds when it comes into view, and the passport shows the stamps the visitor
// collected on the game pages (localStorage "wayfold.passport.v1": { <slug>: 1 visited | 2 demo cleared }).
(() => {
  "use strict";
  const map = document.querySelector(".map");
  if (map) {
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) map.classList.remove("closed");
    else new IntersectionObserver((es, o) => {
      if (es.some(e => e.isIntersecting)) { map.classList.remove("closed"); o.disconnect(); }
    }, { threshold: .35 }).observe(map);
  }

  let passport = {};
  try { passport = JSON.parse(localStorage.getItem("wayfold.passport.v1")) || {}; } catch { /* private mode */ }
  let got = 0, total = 0;
  document.querySelectorAll(".stamp[data-game]").forEach(el => {
    const need = Number(el.dataset.level), have = passport[el.dataset.game] || 0;
    total++;
    if (have >= need) {
      got++;
      el.classList.add("got");
      el.querySelector(".ring").innerHTML = el.querySelector("template").innerHTML;
    }
  });
  const totalAll = Number(document.documentElement.dataset.stamps || total);
  document.querySelectorAll("[data-stamp-count]").forEach(el => {
    if (!total) {
      // Text pages have no stamp list: count from the saved passport.
      got = Object.values(passport).reduce((n, v) => n + Math.min(2, v), 0);
    }
    el.textContent = `${got}/${totalAll}`;
  });
})();
