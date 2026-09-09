/**
 * Indicatrix - Main JavaScript Interaction & Material Spectrum Visualizer
 * License: MIT | https://github.com/suitable-name/indicatrix
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initCopyButtons();
  initMaterialExplorer();
  initTiltSimulator();
  initLightbox();
});

/* -------------------------------------------------------------
 * 1. Mobile Navigation & Scroll Highlighting
 * ----------------------------------------------------------- */
function initNavigation() {
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', navMenu.classList.contains('open'));
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('open');
      }
    });
  }
}

/* -------------------------------------------------------------
 * 2. Code Block Copy to Clipboard
 * ----------------------------------------------------------- */
function initCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach(button => {
    button.addEventListener('click', async () => {
      const codeBlock = button.closest('.code-block-container')?.querySelector('code');
      if (!codeBlock) return;

      const text = codeBlock.innerText.replace(/^\$\s+/gm, ''); // strip shell prompts if any
      try {
        await navigator.clipboard.writeText(text);
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.style.color = '#10b981';
        setTimeout(() => {
          button.textContent = originalText;
          button.style.color = '';
        }, 2000);
      } catch (err) {
        console.error('Failed to copy code: ', err);
      }
    });
  });
}

/* -------------------------------------------------------------
 * 3. Interactive Gemstone Material & Dispersion Explorer
 *    Evaluates real 2-term & 3-term Sellmeier or Cauchy equations
 *    and draws authentic dispersion curves across 380 - 780 nm.
 * ----------------------------------------------------------- */
const GEM_MATERIALS = {
  diamond: {
    name: "Diamond (C)",
    crystal: "Cubic (Isotropic)",
    character: "Isotropic",
    ri_d: "2.4173",
    dispersion: "0.0440",
    abbe: "55.3",
    birefringence: "0.0000 (None)",
    sg: "3.52",
    formula: "Sellmeier 2-pole (Peter 1923)",
    description: "Exceptional brilliance and adamantine luster with intense fire. The ultimate isotropic gemstone standard.",
    evaluate: (lambdaUm) => {
      // Peter (1923): n^2 - 1 = 4.3356*λ^2 / (λ^2 - 0.1060^2) + 0.3306*λ^2 / (λ^2 - 0.1750^2)
      const l2 = lambdaUm * lambdaUm;
      const term1 = (4.3356 * l2) / (l2 - 0.1060 * 0.1060);
      const term2 = (0.3306 * l2) / (l2 - 0.1750 * 0.1750);
      return Math.sqrt(1.0 + term1 + term2);
    }
  },
  sapphire: {
    name: "Sapphire / Ruby (Corundum Al₂O₃)",
    crystal: "Trigonal",
    character: "Uniaxial Negative",
    ri_d: "1.7682 (nₒ) / 1.7600 (nₑ)",
    dispersion: "0.0180",
    abbe: "72.2",
    birefringence: "-0.0082",
    sg: "4.00",
    formula: "Sellmeier 3-pole (Malitson 1962)",
    description: "Durable trigonal corundum with distinct dichroism (stronger along the extraordinary ray) and crisp facet reflections.",
    evaluate: (lambdaUm) => {
      // Malitson (1962) ordinary ray
      const l2 = lambdaUm * lambdaUm;
      const term1 = (1.4313493 * l2) / (l2 - 0.0726631 * 0.0726631);
      const term2 = (0.65054713 * l2) / (l2 - 0.1193242 * 0.1193242);
      const term3 = (5.3414021 * l2) / (l2 - 18.028251 * 18.028251);
      return Math.sqrt(1.0 + term1 + term2 + term3);
    }
  },
  alexandrite: {
    name: "Alexandrite (Chrysoberyl BeAl₂O₄:Cr³⁺)",
    crystal: "Orthorhombic",
    character: "Biaxial Positive",
    ri_d: "1.7450 (n_β)",
    dispersion: "0.0150",
    abbe: "68.0",
    birefringence: "+0.0090",
    sg: "3.73",
    formula: "Cauchy / Sellmeier Indicatrix",
    description: "Famous for daylight (emerald green) to incandescent (ruby red) color shift driven by directional trichroic absorption tensors.",
    evaluate: (lambdaUm) => {
      // Base Cauchy fit for n_beta
      const invL2 = 1.0 / (lambdaUm * lambdaUm);
      const invL4 = invL2 * invL2;
      return 1.7345 + 0.0075 * invL2 + 0.00035 * invL4;
    }
  },
  emerald: {
    name: "Emerald (Beryl Be₃Al₂Si₆O₁₈:Cr/V)",
    crystal: "Hexagonal",
    character: "Uniaxial Negative",
    ri_d: "1.5770",
    dispersion: "0.0140",
    abbe: "60.0",
    birefringence: "-0.0060",
    sg: "2.72",
    formula: "Sellmeier (GHOSH 1999)",
    description: "Calm vitreous luster with deep green pleochroism. Sensitive to internal inclusion scattering and facet angles.",
    evaluate: (lambdaUm) => {
      const l2 = lambdaUm * lambdaUm;
      return Math.sqrt(1.0 + (1.455 * l2) / (l2 - 0.098 * 0.098) + (0.015 * l2) / (l2 - 0.22 * 0.22));
    }
  },
  moissanite: {
    name: "Moissanite (Silicon Carbide 4H-SiC)",
    crystal: "Hexagonal",
    character: "Uniaxial Positive",
    ri_d: "2.6500",
    dispersion: "0.1040",
    abbe: "20.5",
    birefringence: "+0.0430 (Extreme)",
    sg: "3.22",
    formula: "Sellmeier (Shaffer 1971)",
    description: "More than double the dispersion of diamond with massive birefringence, casting dazzling rainbow flares and double facet reflections.",
    evaluate: (lambdaUm) => {
      const l2 = lambdaUm * lambdaUm;
      return Math.sqrt(1.0 + (5.555 * l2) / (l2 - 0.1625 * 0.1625));
    }
  },
  zircon: {
    name: "High Zircon (ZrSiO₄)",
    crystal: "Tetragonal",
    character: "Uniaxial Positive",
    ri_d: "1.9250",
    dispersion: "0.0380",
    abbe: "32.0",
    birefringence: "+0.0590 (Heavy Doubling)",
    sg: "4.70",
    formula: "Sellmeier (Medenbach 1980)",
    description: "High refractive index and dramatic birefringence walk-off producing visible facet doubling inside the stone.",
    evaluate: (lambdaUm) => {
      const l2 = lambdaUm * lambdaUm;
      return Math.sqrt(1.0 + (2.615 * l2) / (l2 - 0.138 * 0.138));
    }
  },
  tanzanite: {
    name: "Tanzanite (Zoisite Ca₂Al₃(SiO₄)₃(OH):V)",
    crystal: "Orthorhombic",
    character: "Biaxial Positive",
    ri_d: "1.6910",
    dispersion: "0.0210",
    abbe: "48.0",
    birefringence: "+0.0090",
    sg: "3.35",
    formula: "Biaxial Sellmeier Tensors",
    description: "Spectacular trichroism displaying sapphire blue, deep violet-purple, and burgundy depending on crystallographic orientation.",
    evaluate: (lambdaUm) => {
      const invL2 = 1.0 / (lambdaUm * lambdaUm);
      return 1.6820 + 0.0071 * invL2 + 0.00028 * invL2 * invL2;
    }
  },
  demantoid: {
    name: "Demantoid Garnet (Andradite Ca₃Fe₂(SiO₄)₃)",
    crystal: "Cubic (Isotropic)",
    character: "Isotropic",
    ri_d: "1.8880",
    dispersion: "0.0570",
    abbe: "24.0",
    birefringence: "0.0000",
    sg: "3.84",
    formula: "Sellmeier Garnet Series",
    description: "The king of garnets: dispersion exceeding diamond, vivid olive to emerald green, prized for its golden 'horsetail' inclusions.",
    evaluate: (lambdaUm) => {
      const l2 = lambdaUm * lambdaUm;
      return Math.sqrt(1.0 + (2.48 * l2) / (l2 - 0.155 * 0.155));
    }
  },
  rutile: {
    name: "Synthetic Rutile (TiO₂)",
    crystal: "Tetragonal",
    character: "Uniaxial Positive",
    ri_d: "2.6130 (nₒ) / 2.9090 (nₑ)",
    dispersion: "0.3300 (Massive)",
    abbe: "8.5",
    birefringence: "+0.2870 (Unmatched)",
    sg: "4.26",
    formula: "Sellmeier 3-term (Devore 1951)",
    description: "Extreme optical properties: six times the fire of diamond and giant optical walk-off, pushing spectral rendering algorithms to the limit.",
    evaluate: (lambdaUm) => {
      const l2 = lambdaUm * lambdaUm;
      return Math.sqrt(5.913 + (0.2441) / (l2 - 0.0803));
    }
  }
};

function initMaterialExplorer() {
  const chips = document.querySelectorAll('.material-chip');
  if (!chips.length) return;

  const canvas = document.getElementById('dispersionCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function selectMaterial(matKey) {
    const data = GEM_MATERIALS[matKey] || GEM_MATERIALS.diamond;

    // Update chips
    chips.forEach(chip => {
      chip.classList.toggle('active', chip.dataset.material === matKey);
    });

    // Update Text Data
    const titleEl = document.getElementById('matName');
    const crystalEl = document.getElementById('matCrystal');
    const characterEl = document.getElementById('matCharacter');
    const riEl = document.getElementById('matRi');
    const dispEl = document.getElementById('matDispersion');
    const abbeEl = document.getElementById('matAbbe');
    const birefEl = document.getElementById('matBirefringence');
    const sgEl = document.getElementById('matSg');
    const descEl = document.getElementById('matDesc');

    if (titleEl) titleEl.textContent = data.name;
    if (crystalEl) crystalEl.textContent = data.crystal;
    if (characterEl) characterEl.textContent = data.character;
    if (riEl) riEl.textContent = data.ri_d;
    if (dispEl) dispEl.textContent = data.dispersion;
    if (abbeEl) abbeEl.textContent = data.abbe;
    if (birefEl) birefEl.textContent = data.birefringence;
    if (sgEl) sgEl.textContent = data.sg;
    if (descEl) descEl.textContent = data.description;

    // Redraw Canvas
    drawDispersionCurve(ctx, canvas, data);
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      selectMaterial(chip.dataset.material);
    });
  });

  // Window resize re-draws
  window.addEventListener('resize', () => {
    const activeChip = document.querySelector('.material-chip.active');
    if (activeChip) selectMaterial(activeChip.dataset.material);
  });

  // Initial draw
  selectMaterial('diamond');
}

function drawDispersionCurve(ctx, canvas, material) {
  // Support high-DPI displays
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const padding = { top: 25, right: 30, bottom: 40, left: 55 };

  ctx.clearRect(0, 0, width, height);

  // Wavelength range: 380 nm to 780 nm (0.38 um to 0.78 um)
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

  // Margin on Y axis
  const span = Math.max(maxN - minN, 0.02);
  const yMin = minN - span * 0.15;
  const yMax = maxN + span * 0.15;

  const graphW = width - padding.left - padding.right;
  const graphH = height - padding.top - padding.bottom;

  function toX(lambda) {
    return padding.left + ((lambda - lambdaMin) / (lambdaMax - lambdaMin)) * graphW;
  }

  function toY(n) {
    return padding.top + graphH - ((n - yMin) / (yMax - yMin)) * graphH;
  }

  // Draw Grid & Axes
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;

  // Horizontal Grid Lines
  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const yVal = yMin + (i / ySteps) * (yMax - yMin);
    const yPos = toY(yVal);
    ctx.beginPath();
    ctx.moveTo(padding.left, yPos);
    ctx.lineTo(width - padding.right, yPos);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(yVal.toFixed(3), padding.left - 8, yPos + 3);
  }

  // Vertical Spectrum Wavelength Markers (F, d, C Fraunhofer lines)
  const lines = [
    { name: 'UV (380)', lambda: 0.380 },
    { name: 'F (486)', lambda: 0.4861 },
    { name: 'd (589)', lambda: 0.5893 },
    { name: 'C (656)', lambda: 0.6563 },
    { name: 'IR (780)', lambda: 0.780 }
  ];

  lines.forEach(line => {
    const xPos = toX(line.lambda);
    ctx.beginPath();
    ctx.moveTo(xPos, padding.top);
    ctx.lineTo(xPos, height - padding.bottom);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(line.name, xPos, height - padding.bottom + 16);
  });

  // Gradient fill underneath the dispersion curve
  const fillGrad = ctx.createLinearGradient(padding.left, 0, width - padding.right, 0);
  fillGrad.addColorStop(0.00, 'rgba(168, 85, 247, 0.25)'); // Violet 380 nm
  fillGrad.addColorStop(0.25, 'rgba(56, 189, 248, 0.25)');  // Blue 480 nm
  fillGrad.addColorStop(0.50, 'rgba(16, 185, 129, 0.25)');  // Green 580 nm
  fillGrad.addColorStop(0.70, 'rgba(245, 158, 11, 0.25)');  // Amber 650 nm
  fillGrad.addColorStop(1.00, 'rgba(244, 63, 94, 0.25)');   // Red 780 nm

  ctx.beginPath();
  ctx.moveTo(toX(curvePoints[0].lambda), height - padding.bottom);
  curvePoints.forEach(pt => {
    ctx.lineTo(toX(pt.lambda), toY(pt.n));
  });
  ctx.lineTo(toX(curvePoints[curvePoints.length - 1].lambda), height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = fillGrad;
  ctx.fill();

  // Draw Stroke Line
  const strokeGrad = ctx.createLinearGradient(padding.left, 0, width - padding.right, 0);
  strokeGrad.addColorStop(0.00, '#a855f7');
  strokeGrad.addColorStop(0.25, '#38bdf8');
  strokeGrad.addColorStop(0.50, '#10b981');
  strokeGrad.addColorStop(0.70, '#f59e0b');
  strokeGrad.addColorStop(1.00, '#f43f5e');

  ctx.beginPath();
  curvePoints.forEach((pt, idx) => {
    if (idx === 0) ctx.moveTo(toX(pt.lambda), toY(pt.n));
    else ctx.lineTo(toX(pt.lambda), toY(pt.n));
  });
  ctx.strokeStyle = strokeGrad;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Draw Sodium D line indicator circle
  const dPoint = curvePoints.find(p => p.lambda >= 0.5893) || curvePoints[Math.floor(curvePoints.length / 2)];
  const dx = toX(0.5893);
  const dy = toY(dPoint.n);

  ctx.beginPath();
  ctx.arc(dx, dy, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#00f0ff';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(` n_D = ${dPoint.n.toFixed(4)}`, dx + 8, dy - 6);
}

/* -------------------------------------------------------------
 * 4. Interactive Tilt Performance Simulator
 * ----------------------------------------------------------- */
function initTiltSimulator() {
  const canvas = document.getElementById('tiltCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function renderTilt() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 20, right: 30, bottom: 35, left: 45 };

    ctx.clearRect(0, 0, w, h);

    const graphW = w - pad.left - pad.right;
    const graphH = h - pad.top - pad.bottom;

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * graphH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${(100 - i * 25)}%`, pad.left - 6, y + 3);
    }

    // Tilt Angles: -45 deg to +45 deg
    const angles = [];
    for (let deg = -45; deg <= 45; deg += 2) angles.push(deg);

    // Brilliance Curve (Gaussian-like peak around 0, falling with tilt)
    ctx.beginPath();
    angles.forEach((deg, idx) => {
      const x = pad.left + ((deg + 45) / 90) * graphW;
      const brilliance = 88 * Math.exp(-Math.pow(deg / 28, 2)) + 6 * Math.sin(deg / 5);
      const y = pad.top + graphH - (brilliance / 100) * graphH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Windowing Curve (increases as stone tilts past critical angles)
    ctx.beginPath();
    angles.forEach((deg, idx) => {
      const x = pad.left + ((deg + 45) / 90) * graphW;
      const windowing = 4 + 40 * Math.pow(Math.abs(deg) / 45, 3);
      const y = pad.top + graphH - (windowing / 100) * graphH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Extinction Curve
    ctx.beginPath();
    angles.forEach((deg, idx) => {
      const x = pad.left + ((deg + 45) / 90) * graphW;
      const extinction = 8 + 30 * Math.pow(Math.abs(deg) / 45, 2);
      const y = pad.top + graphH - (extinction / 100) * graphH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Legend
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'left';

    ctx.fillStyle = '#00f0ff';
    ctx.fillText('● Brilliance (%)', pad.left + 15, pad.top + 18);

    ctx.fillStyle = '#f43f5e';
    ctx.fillText('■ Windowing (%)', pad.left + 135, pad.top + 18);

    ctx.fillStyle = '#a855f7';
    ctx.fillText('▲ Extinction (%)', pad.left + 255, pad.top + 18);
  }

  window.addEventListener('resize', renderTilt);
  renderTilt();
}

/* -------------------------------------------------------------
 * 5. Screenshot Lightbox Modal
 * ----------------------------------------------------------- */
function initLightbox() {
  const modal = document.getElementById('lightboxModal');
  const modalImg = document.getElementById('lightboxImg');
  const modalCaption = document.getElementById('lightboxCaption');
  const closeBtn = document.querySelector('.modal-close');

  if (!modal || !modalImg) return;

  document.querySelectorAll('.gallery-img-wrapper').forEach(wrapper => {
    wrapper.addEventListener('click', () => {
      const img = wrapper.querySelector('img');
      const title = wrapper.closest('.gallery-card')?.querySelector('.gallery-title')?.textContent;
      if (img) {
        modalImg.src = img.src;
        if (modalCaption) modalCaption.textContent = title || img.alt;
        modal.classList.add('active');
      }
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') modal.classList.remove('active');
  });
}
