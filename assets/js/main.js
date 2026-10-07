/**
 * Indicatrix — site script.
 * License: MIT | https://github.com/suitable-name/indicatrix
 *
 * No external resources are loaded. Everything on the site works with this
 * script disabled except the dispersion chart on materials.html, which prints
 * a plain-text note in that case (see the <noscript> below the canvas).
 */

document.addEventListener('DOMContentLoaded', () => {
  initPageToc();
  initCopyButtons();
  initMaterialExplorer();
});

/* -------------------------------------------------------------
 * "On this page": navigation within a long page.
 *
 * Built from the page's own numbered sections (`main > section[id]` with an
 * <h2>), so it never drifts from the headings. Wide screens get a sticky
 * sidebar beside the text, with the section in view highlighted; narrower
 * screens get a collapsible list under the page title and a small
 * "Contents" button that returns to it. Without the script the page reads
 * as before, top to bottom.
 * ----------------------------------------------------------- */

const TOC_MIN_SECTIONS = 5;

function tocEntries(main) {
  return [...main.querySelectorAll(':scope > section[id]')]
    .map((section) => {
      const h2 = section.querySelector(':scope > h2');
      if (!h2) return null;
      const num = h2.querySelector('.sec-num');
      const label = [...h2.childNodes]
        .filter((n) => !(n.nodeType === 1 && (n.classList.contains('sec-num') || n.classList.contains('tag'))))
        .map((n) => n.textContent)
        .join('')
        .trim();
      return { id: section.id, num: num ? num.textContent.trim() : '', label, section };
    })
    .filter(Boolean);
}

function tocList(entries) {
  const ol = document.createElement('ol');
  for (const e of entries) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + e.id;
    a.dataset.target = e.id;
    if (e.num) {
      const n = document.createElement('span');
      n.className = 'toc-num';
      n.textContent = e.num;
      a.append(n);
    }
    const text = document.createElement('span');
    text.textContent = e.label;
    a.append(text);
    li.append(a);
    ol.append(li);
  }
  return ol;
}

function initPageToc() {
  const main = document.querySelector('main.container');
  if (!main) return;
  const entries = tocEntries(main);
  if (entries.length < TOC_MIN_SECTIONS) return;

  // Sidebar (wide screens).
  const side = document.createElement('nav');
  side.className = 'toc-side';
  side.setAttribute('aria-label', 'On this page');
  const sideHead = document.createElement('p');
  sideHead.className = 'toc-head';
  sideHead.textContent = 'On this page';
  side.append(sideHead, tocList(entries));

  // Collapsible list (narrow screens), placed after the page title block.
  const inline = document.createElement('details');
  inline.className = 'toc-inline';
  inline.id = 'contents';
  const summary = document.createElement('summary');
  summary.textContent = 'On this page \u00b7 ' + entries.length + ' sections';
  const inlineNav = document.createElement('nav');
  inlineNav.setAttribute('aria-label', 'On this page');
  inlineNav.append(tocList(entries));
  inline.append(summary, inlineNav);
  const head = main.querySelector(':scope > .page-head');
  if (head) head.after(inline); else main.prepend(inline);

  // "Contents" button (narrow screens), shown once the list is out of view.
  const back = document.createElement('a');
  back.className = 'toc-back';
  back.href = '#contents';
  back.textContent = 'Contents';
  back.addEventListener('click', () => { inline.open = true; });
  document.body.append(back);

  main.prepend(side);
  main.classList.add('with-toc');
  document.body.classList.add('has-toc');
  side.style.gridRow = '1 / span ' + main.children.length;

  // Picking a section on a phone closes the list again.
  inlineNav.addEventListener('click', (ev) => {
    if (ev.target.closest('a')) inline.open = false;
  });

  if (!('IntersectionObserver' in window)) return;

  new IntersectionObserver((records) => {
    for (const r of records) {
      back.classList.toggle('is-visible', !r.isIntersecting && r.boundingClientRect.top < 0);
    }
  }).observe(inline);

  // Highlight the last section whose top has passed the upper third of the window.
  const links = [...side.querySelectorAll('a')];
  const setCurrent = () => {
    let current = entries[0].id;
    const line = window.innerHeight / 3;
    for (const e of entries) {
      if (e.section.getBoundingClientRect().top <= line) current = e.id;
    }
    for (const a of links) {
      if (a.dataset.target === current) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    }
  };
  let pending = false;
  window.addEventListener('scroll', () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; setCurrent(); });
  }, { passive: true });
  window.addEventListener('resize', setCurrent);
  setCurrent();
}

/* -------------------------------------------------------------
 * Copy-to-clipboard for code blocks.
 * ----------------------------------------------------------- */
function initCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach(button => {
    button.addEventListener('click', async () => {
      const codeBlock = button.closest('.code-block')?.querySelector('code');
      if (!codeBlock) return;

      const text = codeBlock.innerText.replace(/^\$\s+/gm, '');
      try {
        await navigator.clipboard.writeText(text);
        const originalText = button.textContent;
        button.textContent = 'Copied';
        setTimeout(() => {
          button.textContent = originalText;
        }, 1500);
      } catch (err) {
        console.error('Failed to copy code: ', err);
      }
    });
  });
}

/* -------------------------------------------------------------
 * Interactive gemstone dispersion explorer.
 *
 * Sellmeier/Cauchy coefficients and evaluate() functions are transcribed
 * directly from the DispersionModel values of the built-in materials in
 * crates/indicatrix/src/optics/materials/ (one file per group of species;
 * see optics/dispersion.rs for the exact Sellmeier3/Cauchy evaluation form
 * these mirror). For a uniaxial material the curve drawn is the ordinary
 * ray. Specific gravity is the figure in
 * crates/indicatrix-cut-core/src/material/specific_gravity.rs where that
 * table has a row; a value with no row there is labelled as a reference
 * value. The drawing code is restyled to the datasheet palette (read from
 * the page's own CSS custom properties, so it follows the light/dark theme
 * automatically).
 * ----------------------------------------------------------- */
const GEM_MATERIALS = {
  diamond: {
    name: "Diamond (C)",
    crystal: "Cubic (Isotropic)",
    character: "Isotropic",
    ri_d: "2.4173",
    dispersion: "0.0256",
    abbe: "55.3",
    birefringence: "0.0000 (none)",
    sg: "3.52",
    formula: "Sellmeier 2-pole (Peter 1923)",
    description: "Exceptional brilliance and adamantine luster with intense fire. The reference isotropic gemstone.",
    evaluate: (lambdaUm) => {
      // Peter (1923): n^2 - 1 = 4.3356*l^2/(l^2 - 0.1060^2) + 0.3306*l^2/(l^2 - 0.1750^2)
      const l2 = lambdaUm * lambdaUm;
      const term1 = (4.3356 * l2) / (l2 - 0.1060 * 0.1060);
      const term2 = (0.3306 * l2) / (l2 - 0.1750 * 0.1750);
      return Math.sqrt(1.0 + term1 + term2);
    }
  },
  sapphire: {
    name: "Sapphire / Ruby (Corundum, Al2O3)",
    crystal: "Trigonal",
    character: "Uniaxial negative",
    ri_d: "1.7681 (no) / 1.7600 (ne)",
    dispersion: "0.0106",
    abbe: "72.3",
    birefringence: "-0.0081",
    sg: "4.00",
    formula: "Sellmeier 3-pole (Malitson & Dodge 1972)",
    description: "Durable trigonal corundum with dichroism and crisp facet reflections.",
    evaluate: (lambdaUm) => {
      const l2 = lambdaUm * lambdaUm;
      const term1 = (1.4313493 * l2) / (l2 - 0.0726631 * 0.0726631);
      const term2 = (0.65054713 * l2) / (l2 - 0.1193242 * 0.1193242);
      const term3 = (5.3414021 * l2) / (l2 - 18.028251 * 18.028251);
      return Math.sqrt(1.0 + term1 + term2 + term3);
    }
  },
  alexandrite: {
    name: "Alexandrite (Chrysoberyl, BeAl2O4:Cr)",
    crystal: "Orthorhombic",
    character: "Biaxial positive",
    ri_d: "1.7427",
    dispersion: "0.0101",
    abbe: "73.9",
    birefringence: "+0.0076",
    sg: "3.73",
    formula: "Sellmeier 3-pole (Walling 1980)",
    description: "Daylight (green) to incandescent (red) colour shift from directional absorption.",
    evaluate: (lambdaUm) => {
      // Walling et al. 1980, n(alpha)-direction Sellmeier, encoded as three
      // poles (materials/zircon_through_topaz.rs: b=[0.78522, 1.21202, 16.81],
      // c=[0.0, 0.01262, 1000.0]).
      const l2 = lambdaUm * lambdaUm;
      const term0 = 0.78522 * l2 / (l2 - 0.0);
      const term1 = 1.21202 * l2 / (l2 - 0.01262);
      const term2 = 16.81 * l2 / (l2 - 1000.0);
      return Math.sqrt(1.0 + term0 + term1 + term2);
    }
  },
  emerald: {
    name: "Emerald (Beryl, Be3Al2Si6O18:Cr/V)",
    crystal: "Hexagonal",
    character: "Uniaxial negative",
    ri_d: "1.5791",
    dispersion: "0.0082",
    abbe: "70.9",
    birefringence: "-0.0060",
    sg: "2.76",
    formula: "Cauchy fit",
    description: "Vitreous luster with a two-window green transmission band; sensitive to inclusion scattering.",
    evaluate: (lambdaUm) => {
      // No primary Sellmeier fit exists for beryl; materials/diamond_through_emerald.rs
      // uses a 2-parameter Cauchy fit (a=1.566794, b=0.004273, c=0).
      const invL2 = 1.0 / (lambdaUm * lambdaUm);
      return 1.566794 + 0.004273 * invL2;
    }
  },
  peridot: {
    name: "Peridot (forsterite-rich olivine, (Mg,Fe)2SiO4)",
    crystal: "Orthorhombic",
    character: "Biaxial positive",
    ri_d: "1.6540",
    dispersion: "0.0116",
    abbe: "56.5",
    birefringence: "+0.0360",
    sg: "3.34 (reference value, not in the app)",
    formula: "Cauchy fit",
    description: "Olive to lime green from iron; a strong birefringence doubles the back facets.",
    evaluate: (lambdaUm) => {
      // No primary fit exists for olivine; materials/peridot_through_benitoite.rs
      // uses a 2-parameter Cauchy fit (a=1.636549, b=0.006062, c=0).
      const invL2 = 1.0 / (lambdaUm * lambdaUm);
      return 1.636549 + 0.006062 * invL2;
    }
  },
  zircon: {
    name: "High zircon (ZrSiO4)",
    crystal: "Tetragonal",
    character: "Uniaxial positive",
    ri_d: "1.9250",
    dispersion: "0.0226",
    abbe: "41.0",
    birefringence: "+0.0590",
    sg: "4.65",
    formula: "Cauchy fit",
    description: "High refractive index and heavy birefringence producing visible facet doubling.",
    evaluate: (lambdaUm) => {
      // No primary fit exists for zircon; materials/zircon_through_topaz.rs uses
      // a 2-parameter Cauchy fit (a=1.890963, b=0.011820, c=0).
      const invL2 = 1.0 / (lambdaUm * lambdaUm);
      return 1.890963 + 0.011820 * invL2;
    }
  },
  tanzanite: {
    name: "Tanzanite (Zoisite, Ca2Al3(SiO4)3(OH):V)",
    crystal: "Orthorhombic",
    character: "Biaxial positive",
    ri_d: "1.7009",
    dispersion: "0.0174",
    abbe: "40.2",
    birefringence: "+0.0130",
    sg: "3.35",
    formula: "Cauchy fit",
    description: "Unheated trichroism spanning red, blue, and yellow-green by orientation.",
    evaluate: (lambdaUm) => {
      // No primary fit exists for zoisite/tanzanite;
      // materials/tanzanite_through_cubic_zirconia.rs uses a 2-parameter Cauchy
      // fit (a=1.674589, b=0.009123, c=0).
      const invL2 = 1.0 / (lambdaUm * lambdaUm);
      return 1.674589 + 0.009123 * invL2;
    }
  },
  demantoid: {
    name: "Demantoid garnet (Andradite, Ca3Fe2(SiO4)3)",
    crystal: "Cubic (isotropic)",
    character: "Isotropic",
    ri_d: "1.8870",
    dispersion: "0.0330",
    abbe: "26.9",
    birefringence: "0.0000",
    sg: "3.84 (reference value, not in the app)",
    formula: "Cauchy fit",
    description: "Dispersion exceeding diamond; vivid green, prized for horsetail inclusions.",
    evaluate: (lambdaUm) => {
      // No primary fit exists for andradite garnet;
      // materials/garnets_grossular_and_andradite.rs uses a 2-parameter Cauchy
      // fit (a=1.837264, b=0.017276, c=0).
      const invL2 = 1.0 / (lambdaUm * lambdaUm);
      return 1.837264 + 0.017276 * invL2;
    }
  },
  cubicZirconia: {
    name: "Cubic zirconia (ZrO2, yttria-stabilized)",
    crystal: "Cubic (isotropic)",
    character: "Isotropic",
    ri_d: "2.1585",
    dispersion: "0.0346",
    abbe: "33.5",
    birefringence: "0.0000 (none)",
    sg: "5.80",
    formula: "Sellmeier 3-pole (Wood & Nassau 1982)",
    description: "The common diamond simulant: an index between the garnets and diamond, with more fire than diamond.",
    evaluate: (lambdaUm) => {
      // Wood & Nassau (1982), materials/tanzanite_through_cubic_zirconia.rs:
      // b=[1.347091, 2.117788, 9.452943], c=[0.003912, 0.027802, 591.489] (the
      // pole wavelengths squared).
      const l2 = lambdaUm * lambdaUm;
      const term0 = 1.347091 * l2 / (l2 - 0.003912);
      const term1 = 2.117788 * l2 / (l2 - 0.027802);
      const term2 = 9.452943 * l2 / (l2 - 591.489);
      return Math.sqrt(1.0 + term0 + term1 + term2);
    }
  },
  ggg: {
    name: "GGG (gadolinium gallium garnet, Gd3Ga5O12)",
    crystal: "Cubic (isotropic)",
    character: "Isotropic",
    ri_d: "1.9700",
    dispersion: "0.0450",
    abbe: "21.6",
    birefringence: "0.0000 (none)",
    sg: "7.05 (reference value, not in the app)",
    formula: "Cauchy fit",
    description: "A synthetic diamond simulant from before cubic zirconia: a moderate index with more fire than diamond.",
    evaluate: (lambdaUm) => {
      // materials/peridot_through_benitoite.rs: a lower-confidence 2-parameter
      // Cauchy fit solved from n_d=1.970 and Delta n(F-C)=0.045 (a=1.902186,
      // b=0.023556, c=0).
      const invL2 = 1.0 / (lambdaUm * lambdaUm);
      return 1.902186 + 0.023556 * invL2;
    }
  },
  moissanite: {
    name: "Synthetic moissanite (SiC, 6H)",
    crystal: "Hexagonal",
    character: "Uniaxial positive",
    ri_d: "2.6474 (no)",
    dispersion: "0.0635",
    abbe: "25.9",
    birefringence: "+0.0415",
    sg: "3.22",
    formula: "Sellmeier 3-pole (Wang et al. 2013, 6H-SiC ordinary ray)",
    description: "More than twice diamond's dispersion at a higher index, and colourless. The curve is the ordinary ray; the extraordinary ray sits about 0.04 higher.",
    evaluate: (lambdaUm) => {
      // Wang et al. (2013), 6H-SiC ordinary ray, n^2 = 6.57232 + 0.1401/(l^2 - 0.03178)
      // - 0.02153*l^2, encoded as three poles in
      // materials/tanzanite_through_cubic_zirconia.rs: b=[1.163887, 4.408433, 21.53],
      // c=[0.0, 0.03178, 1000.0] (the constant is a pole at c=0).
      const l2 = lambdaUm * lambdaUm;
      const term0 = 1.163887 * l2 / (l2 - 0.0);
      const term1 = 4.408433 * l2 / (l2 - 0.03178);
      const term2 = 21.53 * l2 / (l2 - 1000.0);
      return Math.sqrt(1.0 + term0 + term1 + term2);
    }
  },
  rutile: {
    name: "Rutile (TiO2)",
    crystal: "Tetragonal",
    character: "Uniaxial positive",
    ri_d: "2.6129 (no) / 2.9086 (ne)",
    dispersion: "0.1636 (o) / 0.2072 (e)",
    abbe: "9.9 (o) / 9.2 (e)",
    birefringence: "+0.2957",
    sg: "4.25 (reference value, not in the app)",
    formula: "Sellmeier 3-pole with a constant term (DeVore 1951, ordinary ray)",
    description: "The strongest birefringence and dispersion of any built-in material. The curve is the ordinary ray; the extraordinary ray sits about 0.30 higher.",
    evaluate: (lambdaUm) => {
      // DeVore (1951), ordinary ray, n^2 = 5.913 + 0.2441/(l^2 - 0.0803), encoded as
      // Sellmeier3 in materials/rutile.rs: b=[3.039851, 1.873149, 0], c=[0.0803, 0, 0]
      // (the constant is a pole at c=0).
      const l2 = lambdaUm * lambdaUm;
      const term0 = 3.039851 * l2 / (l2 - 0.0803);
      const term1 = 1.873149 * l2 / (l2 - 0.0);
      return Math.sqrt(1.0 + term0 + term1);
    }
  }
};

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function initMaterialExplorer() {
  const chips = document.querySelectorAll('.material-chip');
  const canvas = document.getElementById('dispersionCanvas');
  if (!chips.length || !canvas) return;
  const ctx = canvas.getContext('2d');

  // A chip whose material has no entry in GEM_MATERIALS stays pressed, but the
  // readout and the plot say plainly that there is no data rather than showing
  // another material's numbers and curve.
  function showNoData(matKey) {
    const chip = Array.from(chips).find(c => c.dataset.material === matKey);
    const label = (chip && chip.textContent.trim()) || matKey;
    setText('matName', `${label} (no data)`);
    ['matCrystal', 'matCharacter', 'matRi', 'matDispersion', 'matAbbe',
      'matBirefringence', 'matSg'].forEach(id => setText(id, 'no data'));
    setText('matDesc', `This chart has no dispersion data for ${label}, so no curve is drawn.`);
    drawNoData(ctx, canvas, `no dispersion data for ${label}`);
  }

  function selectMaterial(matKey) {
    chips.forEach(chip => {
      const active = chip.dataset.material === matKey;
      chip.setAttribute('aria-pressed', String(active));
    });

    const data = GEM_MATERIALS[matKey];
    if (!data) {
      showNoData(matKey);
      return;
    }

    setText('matName', data.name);
    setText('matCrystal', data.crystal);
    setText('matCharacter', data.character);
    setText('matRi', data.ri_d);
    setText('matDispersion', data.dispersion);
    setText('matAbbe', data.abbe);
    setText('matBirefringence', data.birefringence);
    setText('matSg', data.sg);
    setText('matDesc', data.description);

    drawDispersionCurve(ctx, canvas, data);
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => selectMaterial(chip.dataset.material));
  });

  window.addEventListener('resize', () => {
    const activeChip = document.querySelector('.material-chip[aria-pressed="true"]');
    if (activeChip) selectMaterial(activeChip.dataset.material);
  });

  selectMaterial('diamond');
}

function readPaletteColors() {
  const style = getComputedStyle(document.documentElement);
  const get = (name, fallback) => (style.getPropertyValue(name) || fallback).trim();
  return {
    ink: get('--ink', '#191919'),
    ink2: get('--ink-2', '#4a4740'),
    rule: get('--rule', '#c7c1b4'),
    accent: get('--accent', '#6b1f2a'),
    paper2: get('--paper-2', '#ebe7df')
  };
}

// One vertical range for every material, so switching materials shows where each one
// actually sits instead of rescaling every curve to fill the plot. The plot runs
// exactly from the highest index any material reaches (the top) to the lowest (the
// bottom), with no padding.
let sharedIndexRange = null;
function dispersionIndexRange() {
  if (sharedIndexRange) return sharedIndexRange;
  let lo = Infinity;
  let hi = -Infinity;
  Object.values(GEM_MATERIALS).forEach(material => {
    for (let i = 0; i <= 150; i++) {
      const n = material.evaluate(0.38 + (i / 150) * 0.40);
      if (Number.isFinite(n)) {
        lo = Math.min(lo, n);
        hi = Math.max(hi, n);
      }
    }
  });
  sharedIndexRange = { yMin: lo, yMax: hi, ySteps: 5 };
  return sharedIndexRange;
}

// An approximate display colour for a visible wavelength in nm (the usual piecewise-
// linear hue ramp), dimmed toward both ends of the spectrum where the eye's response
// falls off, but never below 45 % so the ends of the curve stay visible.
function spectralColor(nm) {
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm < 440) { r = (440 - nm) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = (645 - nm) / 65; }
  else { r = 1; }
  let level = 1;
  if (nm < 420) level = 0.45 + 0.55 * (nm - 380) / 40;
  else if (nm > 700) level = 0.45 + 0.55 * (780 - nm) / 80;
  const channel = (v) => Math.round(255 * Math.min(1, Math.max(0, v * level)));
  return `rgb(${channel(r)}, ${channel(g)}, ${channel(b)})`;
}

// Sizes the canvas backing store to its CSS box at the device pixel ratio, resets the
// transform to CSS pixels and clears it; returns the CSS-pixel width and height.
function prepareCanvas(ctx, canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);
  return { width: rect.width, height: rect.height };
}

// An empty plot with one centred line of text, for a material without dispersion data.
function drawNoData(ctx, canvas, message) {
  const colors = readPaletteColors();
  const { width, height } = prepareCanvas(ctx, canvas);
  ctx.fillStyle = colors.ink2;
  ctx.font = '12px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(message, width / 2, height / 2);
}

function drawDispersionCurve(ctx, canvas, material) {
  const colors = readPaletteColors();
  const { width, height } = prepareCanvas(ctx, canvas);
  const padding = { top: 20, right: 20, bottom: 34, left: 52 };

  const lambdaMin = 0.38;
  const lambdaMax = 0.78;
  const steps = 150;
  const curvePoints = [];

  for (let i = 0; i <= steps; i++) {
    const lambda = lambdaMin + (i / steps) * (lambdaMax - lambdaMin);
    curvePoints.push({ lambda, n: material.evaluate(lambda) });
  }

  const { yMin, yMax, ySteps } = dispersionIndexRange();

  const graphW = width - padding.left - padding.right;
  const graphH = height - padding.top - padding.bottom;

  const toX = (lambda) => padding.left + ((lambda - lambdaMin) / (lambdaMax - lambdaMin)) * graphW;
  const toY = (n) => padding.top + graphH - ((n - yMin) / (yMax - yMin)) * graphH;

  // Grid
  ctx.strokeStyle = colors.rule;
  ctx.lineWidth = 1;
  for (let i = 0; i <= ySteps; i++) {
    const yVal = yMin + (i / ySteps) * (yMax - yMin);
    const yPos = toY(yVal);
    ctx.beginPath();
    ctx.moveTo(padding.left, yPos);
    ctx.lineTo(width - padding.right, yPos);
    ctx.stroke();

    ctx.fillStyle = colors.ink2;
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(yVal.toFixed(2), padding.left - 8, yPos + 3);
  }

  // Fraunhofer wavelength markers
  const lines = [
    { name: '380', lambda: 0.380 },
    { name: 'F 486', lambda: 0.4861 },
    { name: 'd 589', lambda: 0.5893 },
    { name: 'C 656', lambda: 0.6563 },
    { name: '780', lambda: 0.780 }
  ];

  lines.forEach(line => {
    const xPos = toX(line.lambda);
    ctx.beginPath();
    ctx.moveTo(xPos, padding.top);
    ctx.lineTo(xPos, height - padding.bottom);
    ctx.stroke();

    ctx.fillStyle = colors.ink2;
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(line.name, xPos, height - padding.bottom + 16);
  });

  // Curve, each segment in the colour of its own wavelength. On a light page a dark
  // outline goes under it first, or the yellow part would vanish into the paper.
  ctx.fillStyle = colors.paper2;
  const paper = ctx.fillStyle;
  const lightPage = paper.startsWith('#')
    && (parseInt(paper.slice(1, 3), 16) + parseInt(paper.slice(3, 5), 16)
      + parseInt(paper.slice(5, 7), 16)) / 3 > 128;
  ctx.lineCap = 'round';
  if (lightPage) {
    ctx.beginPath();
    curvePoints.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(toX(pt.lambda), toY(pt.n));
      else ctx.lineTo(toX(pt.lambda), toY(pt.n));
    });
    ctx.strokeStyle = 'rgba(40, 36, 30, 0.6)';
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  ctx.lineWidth = 3;
  for (let i = 1; i < curvePoints.length; i++) {
    const a = curvePoints[i - 1];
    const b = curvePoints[i];
    ctx.beginPath();
    ctx.moveTo(toX(a.lambda), toY(a.n));
    ctx.lineTo(toX(b.lambda), toY(b.n));
    ctx.strokeStyle = spectralColor((a.lambda + b.lambda) * 500);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // Sodium D-line marker
  const dPoint = { lambda: 0.5893, n: material.evaluate(0.5893) };
  const dx = toX(0.5893);
  const dy = toY(dPoint.n);

  ctx.beginPath();
  ctx.arc(dx, dy, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = spectralColor(589.3);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = colors.ink;
  ctx.stroke();

  ctx.fillStyle = colors.ink;
  ctx.font = 'bold 11px ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(` n_D = ${dPoint.n.toFixed(4)}`, dx + 8, dy - 6);
}
