/**
 * Indicatrix — site script.
 * License: MIT | https://github.com/suitable-name/indicatrix
 *
 * No external resources are loaded. Everything on the site works with this
 * script disabled except the dispersion chart on materials.html, which prints
 * a plain-text note in that case (see the <noscript> below the canvas).
 */

document.addEventListener('DOMContentLoaded', () => {
  initCopyButtons();
  initMaterialExplorer();
});

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
 * directly from crates/indicatrix/src/optics/materials.rs's DispersionModel
 * values for each material (see optics/dispersion.rs for the exact
 * Sellmeier3/Cauchy evaluation form these mirror). The drawing code is
 * restyled to the datasheet palette (read from the page's own CSS custom
 * properties, so it follows the light/dark theme automatically).
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
      // poles (materials.rs: b=[0.78522, 1.21202, 16.81], c=[0.0, 0.01262, 1000.0]).
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
    sg: "2.72",
    formula: "Cauchy fit",
    description: "Vitreous luster with a two-window green transmission band; sensitive to inclusion scattering.",
    evaluate: (lambdaUm) => {
      // No primary Sellmeier fit exists for beryl; materials.rs uses a
      // 2-parameter Cauchy fit (a=1.566794, b=0.004273, c=0).
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
    sg: "3.34",
    formula: "Cauchy fit",
    description: "Olive to lime green from iron; a strong birefringence doubles the back facets.",
    evaluate: (lambdaUm) => {
      // No primary fit exists for olivine; materials.rs uses a 2-parameter
      // Cauchy fit (a=1.636549, b=0.006062, c=0).
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
    sg: "4.70",
    formula: "Cauchy fit",
    description: "High refractive index and heavy birefringence producing visible facet doubling.",
    evaluate: (lambdaUm) => {
      // No primary fit exists for zircon; materials.rs uses a 2-parameter
      // Cauchy fit (a=1.890963, b=0.011820, c=0).
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
      // No primary fit exists for zoisite/tanzanite; materials.rs uses a
      // 2-parameter Cauchy fit (a=1.674589, b=0.009123, c=0).
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
    sg: "3.84",
    formula: "Cauchy fit",
    description: "Dispersion exceeding diamond; vivid green, prized for horsetail inclusions.",
    evaluate: (lambdaUm) => {
      // No primary fit exists for andradite garnet; materials.rs uses a
      // 2-parameter Cauchy fit (a=1.837264, b=0.017276, c=0).
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
      // Wood & Nassau (1982), materials.rs: b=[1.347091, 2.117788, 9.452943],
      // c=[0.003912, 0.027802, 591.489] (the pole wavelengths squared).
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
    sg: "7.05",
    formula: "Cauchy fit",
    description: "A synthetic diamond simulant from before cubic zirconia: a moderate index with more fire than diamond.",
    evaluate: (lambdaUm) => {
      // materials.rs: a lower-confidence 2-parameter Cauchy fit solved from
      // n_d=1.970 and Delta n(F-C)=0.045 (a=1.902186, b=0.023556, c=0).
      const invL2 = 1.0 / (lambdaUm * lambdaUm);
      return 1.902186 + 0.023556 * invL2;
    }
  }
};

function initMaterialExplorer() {
  const chips = document.querySelectorAll('.material-chip');
  const canvas = document.getElementById('dispersionCanvas');
  if (!chips.length || !canvas) return;
  const ctx = canvas.getContext('2d');

  function selectMaterial(matKey) {
    const data = GEM_MATERIALS[matKey] || GEM_MATERIALS.diamond;

    chips.forEach(chip => {
      const active = chip.dataset.material === matKey;
      chip.setAttribute('aria-pressed', String(active));
    });

    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    set('matName', data.name);
    set('matCrystal', data.crystal);
    set('matCharacter', data.character);
    set('matRi', data.ri_d);
    set('matDispersion', data.dispersion);
    set('matAbbe', data.abbe);
    set('matBirefringence', data.birefringence);
    set('matSg', data.sg);
    set('matDesc', data.description);

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

function drawDispersionCurve(ctx, canvas, material) {
  const colors = readPaletteColors();
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const padding = { top: 20, right: 20, bottom: 34, left: 52 };

  ctx.clearRect(0, 0, width, height);

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
