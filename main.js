/* =========================================================
   MAGLIA — interactions (vanilla JS, IIFE, no libraries)
   ========================================================= */
(function () {
  "use strict";

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function initHeroScrub() {
    var hero = document.querySelector(".hero");
    var video = document.querySelector(".hero__video");
    var media = document.querySelector(".hero__media");
    var overlay = document.querySelector("[data-hero-overlay]");
    var scrollHint = document.querySelector("[data-hero-scroll]");
    var progressBar = document.querySelector("[data-hero-progress]");
    if (!hero || !video) return;

    var duration = 0;
    function readDuration() {
      if (isFinite(video.duration) && video.duration > 0) duration = video.duration;
    }
    video.addEventListener("loadedmetadata", readDuration);
    video.addEventListener("durationchange", readDuration);
    readDuration();
    video.pause();

    var target = 0, current = 0, rafId = null;

    function tick() {
      current += (target - current) * 0.14;
      if (Math.abs(target - current) < 0.0004) current = target;
      if (duration) {
        try { video.currentTime = clamp(current, 0, 1) * duration; } catch (e) {}
      }
      rafId = current !== target ? requestAnimationFrame(tick) : null;
    }

    function onScroll() {
      var rect = hero.getBoundingClientRect();
      var progress = clamp(-rect.top / window.innerHeight, 0, 1);
      target = progress;
      if (overlay) {
        overlay.style.opacity = String(clamp(1 - progress * 1.7, 0, 1));
        overlay.style.transform = "translateY(" + (-progress * 70) + "px)";
      }
      if (media) {
        media.style.transform = "scale(" + (1 + progress * 0.07) + ")";
      }
      if (progressBar) {
        progressBar.style.transform = "scaleX(" + progress + ")";
      }
      if (scrollHint) {
        scrollHint.style.opacity = String(clamp(1 - progress * 5, 0, 1));
      }
      if (!rafId) rafId = requestAnimationFrame(tick);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
  }

  function initReveal() {
    var items = document.querySelectorAll(".reveal:not(.io-bound)");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: "0px 0px -8% 0px" });

    items.forEach(function (el) {
      el.classList.add("io-bound");
      io.observe(el);
    });

    setTimeout(function () {
      document.querySelectorAll(".reveal:not(.is-visible)").forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add("is-visible");
        }
      });
    }, 6000);
  }

  function initFilters() {
    var catRow   = document.querySelector("[data-filter-categories]");
    var tipoRow  = document.querySelector("[data-filter-tipos]");
    var kitRow   = document.querySelector("[data-filter-kits]");
    var sizeRow  = document.querySelector("[data-filter-sizes]");
    var emptyEl  = document.querySelector("[data-grid-empty]");
    var countEl  = document.querySelector("[data-results-count]");
    if (!catRow || !sizeRow) return;

    var cards = Array.prototype.slice.call(document.querySelectorAll(".card"));
    if (!cards.length) return;

    var state = { cat: "todos", tipo: "todos", kit: "todos", size: "todas" };

    function apply() {
      var visible = 0;
      cards.forEach(function (card) {
        var matchCat  = state.cat  === "todos" || card.dataset.category === state.cat;
        var matchTipo = state.tipo === "todos" || card.dataset.tipo     === state.tipo;
        var matchKit  = state.kit  === "todos" || card.dataset.kit      === state.kit;
        var sizes     = (card.dataset.sizes || "").split(/\s+/);
        var matchSize = state.size === "todas" || sizes.indexOf(state.size) > -1;
        var show = matchCat && matchTipo && matchKit && matchSize;
        card.classList.toggle("is-filtered", !show);
        if (show) { card.classList.add("is-visible"); visible++; }
      });
      if (emptyEl) emptyEl.hidden = visible > 0;
      if (countEl) countEl.textContent = visible + (visible === 1 ? " pieza" : " piezas");
    }

    function setActive(row, btn) {
      row.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("is-active"); });
      btn.classList.add("is-active");
    }
    function resetSizeChips() {
      sizeRow.querySelectorAll(".chip").forEach(function (c) {
        c.classList.toggle("is-active", c.dataset.size === "todas");
      });
    }

    function updateSizeChips() {
      var sizeChips = sizeRow.querySelectorAll("[data-size]");
      sizeChips.forEach(function (chip) {
        var s = chip.dataset.size;
        if (s === "todas") return;
        var hasMatch = cards.some(function (card) {
          var matchCat  = state.cat  === "todos" || card.dataset.category === state.cat;
          var matchTipo = state.tipo === "todos" || card.dataset.tipo     === state.tipo;
          var sizes     = (card.dataset.sizes || "").split(/\s+/);
          return matchCat && matchTipo && sizes.indexOf(s) > -1;
        });
        chip.style.display = hasMatch ? "" : "none";
      });
      if (state.size !== "todas") {
        var activeChip = sizeRow.querySelector("[data-size='" + state.size + "']");
        if (!activeChip || activeChip.style.display === "none") {
          state.size = "todas";
          resetSizeChips();
        }
      }
    }

    catRow.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-cat]");
      if (!btn) return;
      state.cat = btn.dataset.cat;
      setActive(catRow, btn);
      if (state.cat === "todos") {
        sizeRow.classList.remove("is-open");
        state.size = "todas";
        resetSizeChips();
      } else {
        sizeRow.classList.add("is-open");
      }
      updateSizeChips();
      apply();
    });

    if (tipoRow) {
      tipoRow.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-tipo]");
        if (!btn) return;
        state.tipo = btn.dataset.tipo;
        setActive(tipoRow, btn);
        updateSizeChips();
        apply();
      });
    }

    if (kitRow) {
      kitRow.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-kit]");
        if (!btn) return;
        state.kit = btn.dataset.kit;
        setActive(kitRow, btn);
        updateSizeChips();
        apply();
      });
    }

    sizeRow.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-size]");
      if (!btn) return;
      state.size = btn.dataset.size;
      setActive(sizeRow, btn);
      apply();
    });

    apply();
  }

  function initSizeSelect() {
    document.querySelectorAll("[data-size-select]").forEach(function (group) {
      group.addEventListener("click", function (e) {
        var btn = e.target.closest(".size-btn");
        if (!btn) return;
        group.querySelectorAll(".size-btn").forEach(function (b) {
          b.classList.remove("is-active");
        });
        btn.classList.add("is-active");
      });
    });
  }

  function initNav() {
    var nav = document.querySelector("[data-nav]");
    if (!nav) return;
    function onScroll() {
      nav.classList.toggle("is-scrolled", (window.scrollY || 0) > 40);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function initAnchors() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({
        top: el.getBoundingClientRect().top + (window.scrollY || 0) - 70,
        behavior: reduced ? "auto" : "smooth"
      });
    });
  }

  /* Exposed so sheet-sync.js can call it after cards land in DOM */
  window.__magliaInit = function () {
    safe(initFilters, "initFilters");
    safe(initReveal,  "initReveal");
  };

  function boot() {
    safe(initHeroScrub, "initHeroScrub");
    safe(initReveal,    "initReveal");
    safe(initSizeSelect,"initSizeSelect");
    safe(initNav,       "initNav");
    safe(initAnchors,   "initAnchors");
    /* initFilters called by sheet-sync after cards are injected */
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
