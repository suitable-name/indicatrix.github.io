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
  moissanite: {
    name: "Moissanite (silicon carbide, 4H-SiC)",
    crystal: "Hexagonal",
    character: "Uniaxial positive",
    ri_d: "2.6474",
    dispersion: "0.0635",
    abbe: "25.9",
    birefringence: "+0.0415",
    sg: "3.22",
    formula: "Sellmeier 3-pole (Wang 2013)",
    description: "More than double diamond's dispersion, with strong birefringence and visible facet doubling.",
    evaluate: (lambdaUm) => {
      // 6H-SiC ordinary-ray fit (Wang et al. 2013), encoded as three poles
      // (materials.rs: b=[1.163887, 4.408433, 21.53], c=[0.0, 0.03178, 1000.0]).
      const l2 = lambdaUm * lambdaUm;
      const term0 = 1.163887 * l2 / (l2 - 0.0);
      const term1 = 4.408433 * l2 / (l2 - 0.03178);
      const term2 = 21.53 * l2 / (l2 - 1000.0);
      return Math.sqrt(1.0 + term0 + term1 + term2);
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
  rutile: {
    name: "Synthetic rutile (TiO2)",
    crystal: "Tetragonal",
    character: "Uniaxial positive",
    ri_d: "2.6161 (no) / 2.9030 (ne)",
    dispersion: "≈0.300",
    abbe: "5.4",
    birefringence: "+0.2870",
    sg: "4.26",
    formula: "Cauchy fit (DeVore 1951 figures)",
    description: "Extreme dispersion and the largest birefringence of any built-in material.",
    evaluate: (lambdaUm) => {
      // Curve shown is the ordinary ray. materials.rs fits a per-ray
      // 2-parameter Cauchy independently to DeVore 1951's n_d and Delta n(F-C)
      // figures (o-ray: a=2.1634, b=0.1572); the e-ray (a=2.4354, b=0.1624,
      // n_e(D)=2.903) is not drawn here.
      const invL2 = 1.0 / (lambdaUm * lambdaUm);
      return 2.1634 + 0.1572 * invL2;
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

  let minN = Infinity;
  let maxN = -Infinity;

  for (let i = 0; i <= steps; i++) {
    const lambda = lambdaMin + (i / steps) * (lambdaMax - lambdaMin);
    const n = material.evaluate(lambda);
    curvePoints.push({ lambda, n });
    if (n < minN) minN = n;
    if (n > maxN) maxN = n;
  }

  const span = Math.max(maxN - minN, 0.02);
  const yMin = minN - span * 0.15;
  const yMax = maxN + span * 0.15;

  const graphW = width - padding.left - padding.right;
  const graphH = height - padding.top - padding.bottom;

  const toX = (lambda) => padding.left + ((lambda - lambdaMin) / (lambdaMax - lambdaMin)) * graphW;
  const toY = (n) => padding.top + graphH - ((n - yMin) / (yMax - yMin)) * graphH;

  // Grid
  ctx.strokeStyle = colors.rule;
  ctx.lineWidth = 1;
  const ySteps = 4;
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
    ctx.fillText(yVal.toFixed(3), padding.left - 8, yPos + 3);
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

  // Curve
  ctx.beginPath();
  curvePoints.forEach((pt, idx) => {
    if (idx === 0) ctx.moveTo(toX(pt.lambda), toY(pt.n));
    else ctx.lineTo(toX(pt.lambda), toY(pt.n));
  });
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Sodium D-line marker
  const dPoint = curvePoints.find(p => p.lambda >= 0.5893) || curvePoints[Math.floor(curvePoints.length / 2)];
  const dx = toX(0.5893);
  const dy = toY(dPoint.n);

  ctx.beginPath();
  ctx.arc(dx, dy, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = colors.accent;
  ctx.fill();

  ctx.fillStyle = colors.ink;
  ctx.font = 'bold 11px ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(` n_D = ${dPoint.n.toFixed(4)}`, dx + 8, dy - 6);
}
