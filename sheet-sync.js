/* =========================================================
   MAGLIA — Google Sheets live inventory sync
   Reads the published CSV, renders cards into the grid,
   and populates the category + size filter chips.
   ========================================================= */
(function () {
  "use strict";

  var SHEET_ID = "2PACX-1vQzQis-21l6r7pYl_1cyde5cjdWuPb2lvheCs-6hC4Qk8zKH0SPxrNIh1Rcak8zxBLFlj_ToF3Oj__f";
  var CSV_URL  = "https://docs.google.com/spreadsheets/d/e/" + SHEET_ID + "/pub?output=csv&t=" + Date.now();

  /* ── Emoji per country ─────────────────────────────── */
  var FLAG = {
    ghana:     "🇬🇭", brasil:  "🇧🇷", argentina: "🇦🇷",
    portugal:  "🇵🇹", colombia:"🇨🇴", españa:    "🇪🇸",
    almeria:   "⚽",  almería: "⚽"
  };

  /* ── Image paths (add your files here when ready) ────
     Key = normalized country key (lowercase, no accents)
     Value = path relative to index.html
  ─────────────────────────────────────────────────────── */
  var IMG = {
    espana_local:       "assets/espana_local.jpg",
    espana_visitante:   "assets/espana_visitante.webp",
    colombia_local:     "assets/colombia_local.webp",
    colombia_visitante: "assets/colombia_visitante.jpg",
    portugal_visitante: "assets/Portugal_visitante.webp",
    argentina_local:    "assets/Argentina_local.jpg",
    argentina_visitante:"assets/Argentina_visitante.webp",
    brasil_visitante:   "assets/Brasil_visitante.jpg",
    ghana_local:        "assets/Ghana_local.webp"
  };

  /* ── Normalize accent/case for keys ─────────────────── */
  function normalizeKey(str) {
    return str.toLowerCase()
      .replace(/á/g,"a").replace(/é/g,"e").replace(/í/g,"i")
      .replace(/ó/g,"o").replace(/ú/g,"u").replace(/ñ/g,"n");
  }

  /* ── Normalize size strings ──────────────────────────── */
  var SIZE_ORDER = ["XS","S","M","L","XL","XXL","XXXL","3XL"];
  function normalizeSize(s) {
    s = s.trim().toUpperCase().replace(/\s/g,"");
    if (s === "3XL")  return "XXXL";
    if (s === "XXXL") return "XXXL";
    return s;
  }

  /* ── CSV parser ──────────────────────────────────────── */
  var SKIP = [/^pedido/i, /^camiseta/i, /^selección/i, /^=sum/i];

  function parseCSV(text) {
    var lines = text.split("\n");
    var products = [];

    lines.forEach(function(line) {
      line = line.trim();
      if (!line) return;

      /* Split respecting quoted commas */
      var cols = line.split(",").map(function(c){ return c.replace(/^"|"$/g,"").trim(); });
      var camiseta = cols[0] || "";
      var pventa   = cols[3] || "";
      var disp     = (cols[5] || "").toLowerCase().replace(/\s/g,"");

      if (!camiseta) return;
      if (SKIP.some(function(p){ return p.test(camiseta); })) return;
      if (disp !== "sí" && disp !== "si") return;

      /* Parse "España 2 / L / player" */
      var parts   = camiseta.split("/").map(function(s){ return s.trim(); });
      var rawName = parts[0] || camiseta;
      var talla   = normalizeSize(parts[1] || "");
      var tipo    = (parts[2] || "").toLowerCase().replace(/\s/g,"");

      /* Country = rawName minus trailing digit */
      var country = rawName.replace(/\s*\d+\s*$/, "").trim();
      var catKey  = normalizeKey(country);
      var kit     = normalizeKey(parts[3] || ""); // "local" | "visitante" | ""

      products.push({
        rawName  : rawName,
        country  : country,
        catKey   : catKey,
        talla    : talla,
        tipo     : tipo,
        price    : pventa ? pventa + " €" : "—",
        kit      : kit
      });
    });

    return products;
  }

  /* ── Build one card element ──────────────────────────── */
  function buildCard(p, idx) {
    var imgKey = normalizeKey(p.country) + (p.kit ? "_" + p.kit : "");
    var imgSrc = IMG[imgKey] || IMG[normalizeKey(p.country) + "_local"] || IMG[normalizeKey(p.country) + "_visitante"];
    var emoji  = FLAG[imgKey] || "⚽";

    var mediaHTML = imgSrc
      ? '<img class="card__img" src="' + imgSrc + '" alt="' + p.country + '" loading="lazy" onerror="this.classList.add(\'is-empty\')" />'
      : '<div class="card__img is-empty" aria-label="' + p.country + '" style="display:flex;align-items:center;justify-content:center;font-size:2.8rem">' + emoji + '</div>';

    var card = document.createElement("article");
    card.className = "card reveal";
    card.style.cssText = "--i:" + idx;
    card.dataset.category = p.catKey;
    card.dataset.sizes    = p.talla;
    card.dataset.tipo     = p.tipo || "sin-tipo";
    card.dataset.kit      = p.kit  || "sin-kit";

    card.innerHTML =
      '<div class="card__media">' + mediaHTML + '</div>' +
      '<div class="card__body">' +
        '<div class="card__top">' +
          '<h3 class="card__name">' + p.rawName + '</h3>' +
          '<span class="stock stock--in">Disponible</span>' +
        '</div>' +
        '<div class="sizes">' +
          (p.talla ? '<span class="size">' + p.talla + '</span>' : '') +
          (p.tipo  ? '<span class="size" style="color:var(--muted);font-size:.65rem">' + p.tipo + '</span>' : '') +
        '</div>' +
        '<p class="card__price">' + p.price + '</p>' +
      '</div>';

    return card;
  }

  /* ── Inject filter chips ─────────────────────────────── */
  function buildFilters(products) {
    var catRow  = document.querySelector("[data-filter-categories]");
    var sizeRow = document.querySelector("[data-filter-sizes]");
    if (!catRow || !sizeRow) return;

    /* Unique categories */
    var cats = [];
    products.forEach(function(p) {
      if (cats.indexOf(p.catKey) === -1) cats.push(p.catKey);
    });

    cats.forEach(function(key) {
      var label = products.find(function(p){ return p.catKey === key; }).country;
      var btn   = document.createElement("button");
      btn.type  = "button";
      btn.className   = "chip";
      btn.dataset.cat = key;
      btn.textContent = label;
      catRow.appendChild(btn);
    });

    /* Unique sizes (sorted) */
    var sizes = [];
    products.forEach(function(p) {
      if (p.talla && sizes.indexOf(p.talla) === -1) sizes.push(p.talla);
    });
    sizes.sort(function(a, b) {
      var ai = SIZE_ORDER.indexOf(a), bi = SIZE_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    sizes.forEach(function(s) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className    = "chip";
      btn.dataset.size = s;
      btn.textContent  = s;
      sizeRow.appendChild(btn);
    });
  }

  /* ── Main render ─────────────────────────────────────── */
  function render(products) {
    var grid    = document.querySelector("[data-grid]");
    var loading = document.getElementById("sheet-loading");
    var countEl = document.querySelector("[data-results-count]");
    if (!grid) return;

    /* Remove loading state */
    if (loading) loading.remove();

    if (!products.length) {
      if (countEl) countEl.textContent = "0 piezas";
      return;
    }

    /* Inject chips before cards */
    buildFilters(products);

    /* Inject cards */
    var frag = document.createDocumentFragment();
    products.forEach(function(p, i) { frag.appendChild(buildCard(p, i)); });
    grid.insertBefore(frag, grid.querySelector("[data-grid-empty]"));

    if (countEl) countEl.textContent = products.length + " pieza" + (products.length !== 1 ? "s" : "");

    /* Re-fire init functions from main.js once cards are in the DOM */
    if (typeof window.__magliaInit === "function") window.__magliaInit();
  }

  /* ── Fetch ───────────────────────────────────────────── */
  function load() {
    fetch(CSV_URL)
      .then(function(r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.arrayBuffer();
      })
      .then(function(buffer) {
        var text = new TextDecoder('iso-8859-1').decode(buffer);
        render(parseCSV(text));
      })
      .catch(function(err) {
        console.error("[sheet-sync]", err);
        var loading = document.getElementById("sheet-loading");
        if (loading) loading.textContent = "Error al cargar el inventario.";
      });
  }

  /* Wait for DOM */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
