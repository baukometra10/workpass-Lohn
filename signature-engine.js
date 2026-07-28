/**
 * WorkPass – stilvolle Signaturen (gezeichnet / Firmen-Auto / ohne)
 */
(function (root) {
  const STYLES = [
    {
      id: "elegant",
      label: "Elegant",
      font: '"Great Vibes", "Segoe Script", cursive',
      size: 58,
      italic: false,
      weight: 400,
      flourish: "wave",
    },
    {
      id: "formal",
      label: "Formal",
      font: '"Pinyon Script", "Segoe Script", cursive',
      size: 52,
      italic: false,
      weight: 400,
      flourish: "underline",
    },
    {
      id: "fluid",
      label: "Fließend",
      font: '"Allura", "Segoe Script", cursive',
      size: 56,
      italic: false,
      weight: 400,
      flourish: "loop",
    },
    {
      id: "classic",
      label: "Klassisch",
      font: '"Dancing Script", "Segoe Script", cursive',
      size: 48,
      italic: false,
      weight: 600,
      flourish: "dot",
    },
    {
      id: "bold",
      label: "Ausdrucksstark",
      font: '"Pacifico", "Segoe Script", cursive',
      size: 44,
      italic: false,
      weight: 400,
      flourish: "slash",
    },
    {
      id: "executive",
      label: "Executive",
      font: '"Satisfy", "Segoe Script", cursive',
      size: 50,
      italic: false,
      weight: 400,
      flourish: "double",
    },
  ];

  const COLORS = [
    { id: "ink", label: "Tinte", value: "#111827" },
    { id: "navy", label: "Nachtblau", value: "#1e3a5f" },
    { id: "royal", label: "Königsblau", value: "#1d4ed8" },
    { id: "forest", label: "Waldgrün", value: "#14532d" },
    { id: "bordeaux", label: "Bordeaux", value: "#7f1d1d" },
    { id: "graphite", label: "Graphit", value: "#374151" },
  ];

  const MODES = [
    { id: "auto", label: "Firma automatisch", hint: "Unterschreibt mit dem Firmennamen" },
    { id: "styled", label: "Namens-Stil", hint: "Stil & Farbe für den eingegebenen Namen" },
    { id: "draw", label: "Selbst zeichnen", hint: "Mit Maus oder Finger unterschreiben" },
    { id: "none", label: "Ohne Signatur", hint: "Kein Unterschriftsfeld auf dem Beleg" },
  ];

  function hashStr(s) {
    let h = 2166136261;
    const str = String(s || "");
    for (let i = 0; i < str.length; i += 1) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function isPlatformName(name) {
    return /work\s*pass|suppix|platform/i.test(String(name || ""));
  }

  /** Firmenname – nie Plattform-/Produktname */
  function resolveCompanyName(opts = {}) {
    const candidates = [
      opts.companyProfileName,
      opts.companyName,
      String(opts.seller || "").split(/\r?\n/).map((l) => l.trim()).find(Boolean),
      opts.managingDirector,
    ];
    for (const c of candidates) {
      const n = String(c || "").trim();
      if (n && !isPlatformName(n)) return n;
    }
    return "";
  }

  function getStyle(id) {
    return STYLES.find((s) => s.id === id) || STYLES[0];
  }

  function getColor(idOrHex) {
    const byId = COLORS.find((c) => c.id === idOrHex);
    if (byId) return byId.value;
    if (/^#[0-9a-fA-F]{3,8}$/.test(String(idOrHex || ""))) return String(idOrHex);
    return COLORS[0].value;
  }

  function drawFlourish(ctx, kind, x0, y0, x1, color, seed) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const wobble = ((seed % 7) - 3) * 0.6;
    if (kind === "underline" || kind === "double") {
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) / 2, y0 + 8 + wobble, x1, y0 - 1);
      ctx.stroke();
      if (kind === "double") {
        ctx.beginPath();
        ctx.moveTo(x0 + 6, y0 + 5);
        ctx.quadraticCurveTo((x0 + x1) / 2, y0 + 12 + wobble, x1 - 4, y0 + 3);
        ctx.stroke();
      }
    } else if (kind === "wave") {
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x0 - 8, y0);
      const mid = (x0 + x1) / 2;
      ctx.bezierCurveTo(x0 + 20, y0 + 14, mid - 10, y0 - 10, mid, y0 + 2);
      ctx.bezierCurveTo(mid + 18, y0 + 12, x1 - 18, y0 - 8, x1 + 10, y0 + 1);
      ctx.stroke();
    } else if (kind === "loop") {
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x0 - 4, y0);
      ctx.bezierCurveTo(x0 - 30, y0 + 28, x0 + 10, y0 + 36, x0 + 8, y0 + 8);
      ctx.bezierCurveTo(x0 + 40, y0 - 6, x1 - 20, y0 + 18, x1 + 6, y0);
      ctx.stroke();
    } else if (kind === "slash") {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0 - 12, y0 + 10);
      ctx.quadraticCurveTo((x0 + x1) / 2, y0 - 6, x1 + 14, y0 + 8);
      ctx.stroke();
    } else if (kind === "dot") {
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) / 2, y0 + 10, x1, y0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x1 + 10, y0 - 2, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function ensureFontsCss() {
    if (typeof document === "undefined") return;
    if (document.getElementById("wp-signature-fonts")) return;
    const link = document.createElement("link");
    link.id = "wp-signature-fonts";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Allura&family=Dancing+Script:wght@500;600&family=Great+Vibes&family=Pacifico&family=Pinyon+Script&family=Satisfy&display=swap";
    document.head.appendChild(link);
  }

  async function waitFonts(style) {
    ensureFontsCss();
    if (typeof document === "undefined" || !document.fonts?.load) return;
    try {
      await document.fonts.load(`${style.weight || 400} ${style.size}px ${style.font}`);
      await document.fonts.ready;
    } catch (_) {
      /* Fallback-Schrift nutzen */
    }
  }

  /**
   * Zeichnet eine hochwertige Signatur als PNG-Data-URL.
   */
  async function renderSignatureDataUrl(text, options = {}) {
    const name = String(text || "").trim();
    if (!name) return "";
    const style = getStyle(options.styleId || options.style || "elegant");
    const color = getColor(options.colorId || options.color || "ink");
    const width = options.width || 700;
    const height = options.height || 220;
    await waitFonts(style);

    if (typeof document === "undefined") {
      return buildSvgDataUrl(name, style, color, width, height);
    }

    const canvas = document.createElement("canvas");
    const ratio = Math.max(options.pixelRatio || (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1), 1);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const seed = hashStr(name + style.id + color);
    const tilt = ((seed % 9) - 4) * 0.012;
    ctx.save();
    ctx.translate(width * 0.08, height * 0.58);
    ctx.rotate(tilt);
    ctx.fillStyle = color;
    ctx.textBaseline = "alphabetic";
    ctx.font = `${style.weight || 400} ${style.size}px ${style.font}`;
    // leichte „Feder“-Schattenkante
    ctx.globalAlpha = 0.18;
    ctx.fillText(name, 1.5, 1.5);
    ctx.globalAlpha = 1;
    ctx.fillText(name, 0, 0);
    const metrics = ctx.measureText(name);
    const textW = metrics.width || name.length * style.size * 0.45;
    drawFlourish(ctx, style.flourish, 0, 10, textW, color, seed);
    // Initialen-Schnörkel links
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(-6, -style.size * 0.55);
    ctx.bezierCurveTo(-28, -style.size * 0.2, -18, 18, 4, 6);
    ctx.stroke();
    ctx.restore();

    return canvas.toDataURL("image/png");
  }

  function buildSvgDataUrl(name, style, color, width, height) {
    const esc = String(name)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <text x="40" y="${Math.round(height * 0.58)}" fill="${color}" font-family="${style.font.replace(/"/g, "'")}" font-size="${style.size}" font-weight="${style.weight || 400}">${esc}</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  /** Schnelle SVG-Vorschau für Stil-Karten (ohne async Canvas) */
  function previewSvgMarkup(name, styleId, colorId) {
    const style = getStyle(styleId);
    const color = getColor(colorId);
    const label = String(name || "Alex").trim() || "Alex";
    const esc = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 72" width="100%" height="56" aria-hidden="true">
      <text x="12" y="46" fill="${color}" font-family="${style.font.replace(/"/g, "'")}" font-size="36">${esc}</text>
      <path d="M16 54 Q140 66 260 52" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.7"/>
    </svg>`;
  }

  /**
   * Löst die aktive Signatur nach Modus auf.
   * @returns {{ mode, displayName, dataUrlPromise?, dataUrl?, showBlock }}
   */
  function resolveSignaturePlan(state = {}) {
    const mode = MODES.some((m) => m.id === state.mode) ? state.mode : "auto";
    if (mode === "none") {
      return { mode, displayName: "", dataUrl: "", showBlock: false };
    }
    if (mode === "draw") {
      return {
        mode,
        displayName: String(state.signatureName || "").trim(),
        dataUrl: state.signatureDataUrl || "",
        showBlock: Boolean(state.signatureDataUrl),
      };
    }
    if (mode === "styled") {
      const displayName = String(state.signatureName || "").trim();
      return {
        mode,
        displayName,
        styleId: state.styleId || "elegant",
        colorId: state.colorId || "ink",
        showBlock: Boolean(displayName),
        needsRender: Boolean(displayName),
      };
    }
    // auto
    const displayName = resolveCompanyName(state);
    return {
      mode: "auto",
      displayName,
      styleId: state.styleId || "formal",
      colorId: state.colorId || "navy",
      showBlock: Boolean(displayName),
      needsRender: Boolean(displayName),
    };
  }

  function defaultLayout() {
    return {
      xPct: 55,
      yPct: 82,
      wPct: 36,
      rotation: -1.5,
      opacity: 1,
      showCaption: false,
      captionText: null,
      captionCustom: false,
      showLine: true,
      locked: false,
    };
  }

  function clamp(n, min, max) {
    const v = Number(n);
    if (Number.isNaN(v)) return min;
    return Math.min(max, Math.max(min, v));
  }

  function normalizeLayout(raw) {
    const d = defaultLayout();
    const src = raw && typeof raw === "object" ? raw : {};
    return {
      xPct: clamp(src.xPct ?? d.xPct, 0, 92),
      yPct: clamp(src.yPct ?? d.yPct, 0, 94),
      wPct: clamp(src.wPct ?? d.wPct, 12, 70),
      rotation: clamp(src.rotation ?? d.rotation, -25, 25),
      opacity: clamp(src.opacity ?? d.opacity, 0.35, 1),
      showCaption: src.showCaption == null ? d.showCaption : Boolean(src.showCaption),
      captionText: src.captionText == null ? null : String(src.captionText),
      captionCustom: Boolean(src.captionCustom),
      showLine: src.showLine == null ? d.showLine : Boolean(src.showLine),
      locked: Boolean(src.locked),
    };
  }

  function resolveCaption(layout, displayName) {
    const lay = normalizeLayout(layout);
    if (!lay.showCaption) return "";
    if (lay.captionCustom) return String(lay.captionText ?? "");
    return String(displayName || "").trim();
  }

  async function sha256Hex(text) {
    const payload = String(text || "");
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return `fnv:${hashStr(payload).toString(16)}`;
    const buf = await subtle.digest("SHA-256", new TextEncoder().encode(payload));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function buildDocumentCanonical(doc = {}) {
    return JSON.stringify({
      type: doc.type || "invoice",
      number: String(doc.number || "").trim(),
      date: String(doc.date || "").trim(),
      seller: String(doc.seller || "").trim(),
      customer: String(doc.customer || "").trim(),
      total: String(doc.total ?? ""),
      items: doc.items || [],
      note: String(doc.note || "").trim(),
    });
  }

  /**
   * Technisches Siegel: Dokumenten-Fingerprint + Signatur-Metadaten (prüfbar).
   * Kein Plattformname – nur Firmen-/Belegdaten.
   */
  async function buildAttestation(input = {}) {
    const layout = normalizeLayout(input.layout);
    const displayName = String(input.displayName || "").trim();
    const caption = resolveCaption(layout, displayName);
    const companyName = resolveCompanyName(input) || "";
    const image = String(input.signatureDataUrl || "");
    const docCanon = buildDocumentCanonical(input.document || {});
    const documentFingerprint = await sha256Hex(docCanon);
    const imageFingerprint = image ? await sha256Hex(image) : "";
    const body = {
      v: 1,
      kind: "workpass.signature.attestation.v1",
      sealedAt: input.sealedAt || new Date().toISOString(),
      mode: input.mode || "auto",
      styleId: input.styleId || "formal",
      colorId: input.colorId || "navy",
      layout,
      displayName,
      caption,
      companyName,
      documentFingerprint,
      imageFingerprint,
      status: input.status || "sealed",
    };
    const proof = await sha256Hex(JSON.stringify(body));
    return { ...body, proof };
  }

  async function verifyAttestation(attestation, live = {}) {
    if (!attestation || attestation.kind !== "workpass.signature.attestation.v1") {
      return { ok: false, reason: "missing" };
    }
    const { proof, ...body } = attestation;
    const expectedProof = await sha256Hex(JSON.stringify(body));
    if (proof !== expectedProof) return { ok: false, reason: "tampered_attestation" };

    if (live.document) {
      const liveFp = await sha256Hex(buildDocumentCanonical(live.document));
      if (liveFp !== body.documentFingerprint) return { ok: false, reason: "document_changed" };
    }
    if (live.signatureDataUrl != null) {
      const imgFp = live.signatureDataUrl ? await sha256Hex(live.signatureDataUrl) : "";
      if (imgFp !== body.imageFingerprint) return { ok: false, reason: "signature_changed" };
    }
    return { ok: true, reason: "valid", attestation: body };
  }

  function shortProof(proof) {
    const p = String(proof || "");
    return p ? `${p.slice(0, 8)}…${p.slice(-6)}` : "";
  }

  root.WorkPassSignature = {
    STYLES,
    COLORS,
    MODES,
    hashStr,
    isPlatformName,
    resolveCompanyName,
    getStyle,
    getColor,
    ensureFontsCss,
    renderSignatureDataUrl,
    previewSvgMarkup,
    resolveSignaturePlan,
    defaultLayout,
    normalizeLayout,
    resolveCaption,
    clamp,
    sha256Hex,
    buildDocumentCanonical,
    buildAttestation,
    verifyAttestation,
    shortProof,
  };
})(typeof window !== "undefined" ? window : globalThis);
