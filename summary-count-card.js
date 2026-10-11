// ===== SUMMARY-COUNT-CARD - mit visuellem Editor (ohne Lit) =====
// Optionen: animate (Animieren), animate_active_only (nur groesser 0)
const CARD_NAME = "summary-count-card";
const EDITOR_TAG = CARD_NAME + "-editor";

// Automatische Labels, zweisprachig. Die Sprache kommt aus Home Assistant
// (hass.locale.language); alles ausser "de" bekommt Englisch.
// Reihenfolge je Typ: [count === 0, count === 1, sonst]
const AUTO_LABELS = {
  de: {
    lights: ["Alle aus", "Licht an", "Lichter an"],
    batteries_critical: ["Alle OK", "kritisch", "kritisch"],
    covers_open: ["Alle zu", "Rollo offen", "Rollos offen"],
    security: ["Alles gesichert", "unsicher", "unsicher"],
    switches_on: ["Alle aus", "Schalter an", "Schalter an"],
    sensors_on: ["Keine aktiv", "Sensor an", "Sensoren an"]
  },
  en: {
    lights: ["All off", "Light on", "Lights on"],
    batteries_critical: ["All OK", "critical", "critical"],
    covers_open: ["All closed", "Cover open", "Covers open"],
    security: ["All secure", "unsafe", "unsafe"],
    switches_on: ["All off", "Switch on", "Switches on"],
    sensors_on: ["None active", "Sensor active", "Sensors active"]
  }
};

function langOf(hass) {
  const raw = (hass && ((hass.locale && hass.locale.language) || hass.language)) || "en";
  return String(raw).toLowerCase().split("-")[0];
}

// ===== Editor =====
class SummaryCountEditor extends HTMLElement {
  constructor() {
    super();
    this._config = null;
    this._hass = null;
    this._shadow = null;
  }

  setConfig(config) {
    this._config = {
      count_type: config.count_type || "batteries_critical",
      target_path: config.target_path || "",
      label: config.label || "",
      icon: config.icon || "",
      show_label: config.show_label !== false,
      show_icon: config.show_icon !== false,
      color_mode: config.color_mode || "auto",
      animate: config.animate === true,
      animate_active_only: config.animate_active_only !== false,
      ...config
    };
    if (!this._shadow) this._shadow = this.attachShadow({ mode: "open" });
    this._render();
  }

  set hass(hass) { this._hass = hass; }
  get hass() { return this._hass; }

  _emit() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true, composed: true
    }));
  }

  _patch(patch) {
    this._config = { ...this._config, ...patch };
    this._emit();
    this._render();
  }

  _render() {
    if (!this._shadow || !this._config) return;
    const c = this._config;
    const types = [
      ["batteries_critical", "Batterien kritisch"],
      ["lights", "Lichter an"],
      ["switches_on", "Schalter an"],
      ["sensors_on", "Sensoren an"],
      ["covers_open", "Rollos offen"],
      ["security", "Unsicher"]
    ];
    let options = "";
    for (const [val, lbl] of types) {
      options += `<option value="${val}" ${c.count_type === val ? "selected" : ""}>${lbl}</option>`;
    }

    this._shadow.innerHTML = `
      <style>
        .editor { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
        .row { display: flex; flex-direction: column; gap: 4px; }
        .row > label { font-size: 13px; font-weight: 500; color: var(--secondary-text-color); }
        .text-input, .select-input {
          padding: 8px; border-radius: 6px; border: 1px solid var(--divider-color);
          background: var(--card-background-color); color: var(--primary-text-color); font-size: 14px; width: 100%;
          box-sizing: border-box;
        }
        .toggle-row { display: flex; align-items: center; gap: 10px; font-size: 13px; cursor: pointer; }
        .section-divider { height: 1px; background: var(--divider-color); margin: 4px 0; }
        .section-head { font-size: 13px; font-weight: 500; color: var(--secondary-text-color); }
      </style>
      <div class="editor">
        <div class="section-head">Allgemein</div>
        <div class="row">
          <label>Zähl-Typ</label>
          <select class="select-input" id="count_type">${options}</select>
        </div>
        <div class="row">
          <label>Ziel (Navigation, z.B. /dashboard-neu/batteries)</label>
          <input type="text" class="text-input" id="target_path" value="${c.target_path || ""}" placeholder="/dashboard-neu/batteries">
        </div>
        <div class="section-divider"></div>
        <div class="section-head">Anzeige</div>
        <div class="row">
          <label>Label (leer = automatisch)</label>
          <input type="text" class="text-input" id="label" value="${c.label || ""}" placeholder="automatisch">
        </div>
        <div class="row">
          <label>Icon (leer = automatisch, z.B. mdi:battery-alert)</label>
          <input type="text" class="text-input" id="icon" value="${c.icon || ""}" placeholder="mdi:battery-alert">
        </div>
        <div class="toggle-row">
          <ha-switch id="show_label" .checked="${c.show_label !== false}"></ha-switch>
          <span>Label anzeigen</span>
        </div>
        <div class="toggle-row">
          <ha-switch id="show_icon" .checked="${c.show_icon !== false}"></ha-switch>
          <span>Icon anzeigen</span>
        </div>
        <div class="toggle-row">
          <ha-switch id="animate" .checked="${c.animate === true}"></ha-switch>
          <span>Animieren</span>
        </div>
        <div class="toggle-row">
          <ha-switch id="animate_active_only" .checked="${c.animate_active_only !== false}"></ha-switch>
          <span>Nur gr&ouml;&szlig;er 0</span>
        </div>
      </div>
    `;

    // Event listeners
    const self = this;
    const ct = this._shadow.querySelector("#count_type");
    if (ct) ct.addEventListener("change", (e) => self._patch({ count_type: e.target.value }));
    const tp = this._shadow.querySelector("#target_path");
    if (tp) tp.addEventListener("input", (e) => self._patch({ target_path: e.target.value }));
    const lb = this._shadow.querySelector("#label");
    if (lb) lb.addEventListener("input", (e) => self._patch({ label: e.target.value }));
    const ic = this._shadow.querySelector("#icon");
    if (ic) ic.addEventListener("input", (e) => self._patch({ icon: e.target.value }));
    const sl = this._shadow.querySelector("#show_label");
    if (sl) sl.addEventListener("change", (e) => self._patch({ show_label: e.target.checked }));
    const si = this._shadow.querySelector("#show_icon");
    if (si) si.addEventListener("change", (e) => self._patch({ show_icon: e.target.checked }));
    const an = this._shadow.querySelector("#animate");
    if (an) {
      an.checked = self._config.animate === true;
      an.addEventListener("change", (e) => self._patch({ animate: e.target.checked }));
    }
    const ao = this._shadow.querySelector("#animate_active_only");
    if (ao) {
      ao.checked = self._config.animate_active_only !== false;
      ao.addEventListener("change", (e) => self._patch({ animate_active_only: e.target.checked }));
    }
  }
}

customElements.define(EDITOR_TAG, SummaryCountEditor);

// ===== Main Card =====
class SummaryCountCard extends HTMLElement {
  constructor() {
    super();
    this._config = null;
    this._hass = null;
    this._shadow = null;
    this._count = 0;
    this._label = "";
    this._rgbSrc = null;
    this._rgbVal = null;
    this._rgbAt = 0;
    this._lang = "en";
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    this._config = {
      count_type: config.count_type || "batteries_critical",
      target_path: config.target_path || "",
      label: config.label || "",
      icon: config.icon || "",
      show_label: config.show_label !== false,
      show_icon: config.show_icon !== false,
      color_mode: config.color_mode || "auto",
      animate: config.animate === true,
      animate_active_only: config.animate_active_only !== false
    };
    this._compute();
    if (!this._shadow) {
      this._shadow = this.attachShadow({ mode: "open" });
    }
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._compute();
    if (this._shadow) this._render();
  }
  get hass() { return this._hass; }

  _compute() {
    if (!this._hass || !this._config) return;
    this._lang = langOf(this._hass);
    this._count = this._countEntities(this._hass, this._config.count_type);
    this._label = this._config.label || this._autoLabel(this._config.count_type, this._count);
  }

  _countEntities(hass, type) {
    let count = 0;
    if (!hass || !hass.states) return 0;
    for (const entityId in hass.states) {
      const state = hass.states[entityId];
      if (!state) continue;
      const reg = hass.entities && hass.entities[entityId];
      if (reg && (reg.hidden === true || reg.hidden_by || reg.disabled_by)) continue;
      if (reg && (reg.entity_category === "config" || reg.entity_category === "diagnostic")) {
        if (type !== "batteries_critical") continue;
      }

      if (type === "lights") {
        if (entityId.startsWith("light.") && state.state === "on") count++;
      } else if (type === "switches_on") {
        if (entityId.startsWith("switch.") && state.state === "on") count++;
      } else if (type === "sensors_on") {
        if (entityId.startsWith("binary_sensor.") && state.state === "on") count++;
      } else if (type === "batteries_critical") {
        const isBattery = state.attributes && state.attributes.device_class === "battery";
        if (!isBattery) continue;
        if (state.state === "unavailable" || state.state === "unknown") { count++; continue; }
        const value = parseFloat(state.state);
        if (!isNaN(value) && value < 20) count++;
      } else if (type === "covers_open") {
        if (entityId.startsWith("cover.") && (state.state === "open" || state.state === "opening")) count++;
      } else if (type === "security") {
        if (entityId.endsWith("_status")) continue;  // Tankstellen-Preissensoren fälschlich als opening
        if (entityId.startsWith("lock.") && state.state === "unlocked") { count++; continue; }
        if (entityId.startsWith("cover.")) {
          const dc = state.attributes && state.attributes.device_class;
          if ((dc === "door" || dc === "garage" || dc === "gate") && (state.state === "open" || state.state === "opening")) { count++; continue; }
        }
        if (entityId.startsWith("binary_sensor.")) {
          const dc = state.attributes && state.attributes.device_class;
          if ((dc === "door" || dc === "window" || dc === "garage_door" || dc === "opening") && state.state === "on") count++;
        }
      }
    }
    return count;
  }

  _autoLabel(type, count) {
    const table = AUTO_LABELS[this._lang] || AUTO_LABELS.en;
    const row = table[type] || AUTO_LABELS.en[type];
    if (!row) return "";
    return row[count === 0 ? 0 : (count === 1 ? 1 : 2)];
  }

  _autoIcon(type) {
    const icons = {
      lights: "mdi:lamps",
      batteries_critical: "mdi:battery-alert",
      covers_open: "mdi:blinds-horizontal",
      security: "mdi:security",
      switches_on: "mdi:toggle-switch",
      sensors_on: "mdi:motion-sensor"
    };
    return icons[type] || "mdi:counter";
  }

  _getColor() {
    if (this._config.color_mode === "none") return "var(--primary-text-color)";
    if (this._config.count_type === "batteries_critical" || this._config.count_type === "security") {
      return this._count > 0 ? "var(--error-color)" : "var(--success-color)";
    }
    return this._count > 0 ? "var(--warning-color)" : "var(--primary-text-color)";
  }

  _navigate(ev) {
    if (ev) ev.stopPropagation();
    const path = this._config.target_path;
    if (path && window.history) {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new Event("location-changed", { detail: { replace: false } }));
    }
  }

  // Loest die Icon-Farbe (Theme-Variablen wie var(--error-color) sind KEIN rgb-Tripel)
  // zu "r,g,b" auf, damit der Glow-Halo exakt die Icon-Farbe hat. Quelle ist die
  // bereits gerenderte Farbe des Icons selbst - kein Extra-Element, keine Layout-Kosten.
  // Fehlschlaege werden NICHT gecacht, und ausserhalb des DOM wird gar nicht aufgeloest.
  _applyGlowRgb(color, iconEl) {
    const now = Date.now();
    if (this._rgbSrc === color && this._rgbVal && (now - this._rgbAt) < 30000) {
      this.style.setProperty("--scc-rgb", this._rgbVal);
      return;
    }
    if (!this.isConnected || !iconEl) return;
    let rgb = null;
    try {
      const resolved = getComputedStyle(iconEl).color || "";
      const m = resolved.match(/([0-9]+)[^0-9]+([0-9]+)[^0-9]+([0-9]+)/);
      if (m) rgb = m[1] + "," + m[2] + "," + m[3];
    } catch (e) { rgb = null; }
    if (!rgb) {
      if (this._rgbVal) this.style.setProperty("--scc-rgb", this._rgbVal);
      return;
    }
    this._rgbSrc = color;
    this._rgbVal = rgb;
    this._rgbAt = now;
    this.style.setProperty("--scc-rgb", rgb);
  }

  _render() {
    if (!this._shadow || !this._config) return;
    const icon = this._config.icon || this._autoIcon(this._config.count_type);
    const color = this._getColor();
    const showIcon = this._config.show_icon !== false;
    const showLabel = this._config.show_label !== false;

    const styles = `
      :host { display: block; }
      ha-card { cursor:pointer; border-radius:12px; overflow:visible; }
      ha-card:hover { background:rgba(255,255,255,0.12); }
      .inner { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; padding:12px; min-height:88px; }
      .row { display:flex; flex-direction:row; align-items:baseline; justify-content:center; gap:4px; }
      .num { font-size:24px; font-weight:700; line-height:1; }
      .label { font-size:14px; font-weight:600; color:var(--primary-text-color); text-align:center; }
      .iconwrap { position:relative; display:flex; align-items:center; justify-content:center; }
      ha-icon { --mdc-icon-size:32px; margin-bottom:2px; }

      /* Glow-Halo hinter dem Icon - gleicher Effekt wie auf der Tuerschloss-Karte */
      .iconwrap::after {
        content:''; position:absolute; left:50%; top:50%; width:46px; height:46px;
        margin:-23px 0 0 -23px; border-radius:50%; pointer-events:none; opacity:0;
        box-shadow: 0 0 16px 6px rgba(var(--scc-rgb,128,128,128), .85),
                    0 0 38px 14px rgba(var(--scc-rgb,128,128,128), .45);
      }
      @keyframes scc-glow {
        0% { opacity:.5; filter:brightness(1); }
        50% { opacity:1; filter:brightness(1.6); }
        100% { opacity:.5; filter:brightness(1); }
      }
      @keyframes scc-alert {
        0% { transform:rotate(8deg); }
        50% { transform:rotate(17deg); }
        100% { transform:rotate(8deg); }
      }
      @keyframes scc-calm {
        0% { transform:rotate(0); }
        15% { transform:rotate(-10deg) scale(1.03); }
        30% { transform:rotate(2deg) scale(1.04); }
        40% { transform:rotate(0); }
        100% { transform:rotate(0); }
      }
      :host([scc-anim="alert"]) ha-icon { animation: scc-alert 1.6s ease-in-out infinite; transform-origin:50% 50%; }
      :host([scc-anim="alert"]) .iconwrap::after { animation: scc-glow 2.2s ease-in-out infinite; }
      :host([scc-anim="calm"]) ha-icon { animation: scc-calm 3.2s ease-in-out infinite; transform-origin:50% 50%; }
      :host([scc-anim="calm"]) .iconwrap::after { animation: scc-glow 2.6s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) {
        ha-icon, .iconwrap::after { animation:none !important; }
      }
    `;

    // Einmalig Struktur aufbauen
    if (!this._built) {
      this._shadow.innerHTML = `
        <style>${styles}</style>
        <ha-card>
          <div class="inner">
            <div class="iconwrap"><ha-icon class="icn"></ha-icon></div>
            <div class="row"><div class="num"></div><div class="label"></div></div>
          </div>
        </ha-card>
      `;
      const cardEl = this._shadow.querySelector("ha-card");
      if (cardEl) {
        cardEl.addEventListener("click", (ev) => this._navigate(ev));
      }
      this._built = true;
      this._iconEl = this._shadow.querySelector(".icn");
      this._iconWrapEl = this._shadow.querySelector(".iconwrap");
      this._numEl = this._shadow.querySelector(".num");
      this._labelEl = this._shadow.querySelector(".label");
    }

    // Werte in-place aktualisieren (kein Neuaufbau → kein Blinken)
    const iconEl = this._iconEl, numEl = this._numEl, labelEl = this._labelEl;
    if (iconEl) {
      iconEl.setAttribute("icon", icon);
      iconEl.style.color = color;
      iconEl.style.display = showIcon ? "" : "none";
    }
    // Animation - gleicher Effekt wie auf der Tuerschloss-Karte (Glow-Halo + Wiegen).
    // "alert" wenn gezaehlt wird, "calm" im Ruhezustand - "calm" nur wenn "Nur groesser 0" aus ist.
    const animOn = this._config.animate === true && showIcon &&
      (this._count > 0 || this._config.animate_active_only === false);
    if (animOn) this._applyGlowRgb(color, iconEl);
    this.setAttribute("scc-anim", animOn ? (this._count > 0 ? "alert" : "calm") : "off");
    if (this._iconWrapEl) this._iconWrapEl.style.display = showIcon ? "" : "none";
    if (numEl) {
      // Zahl ausblenden NUR wenn count=0 UND das Label tatsächlich sichtbar ist (kein "0 Alle aus").
      // Bei show_label:false bleibt die Zahl immer sichtbar.
      const hideNum = (this._count === 0 && this._label && showLabel);
      numEl.textContent = hideNum ? "" : String(this._count);
      numEl.style.color = color;
      numEl.style.display = hideNum ? "none" : "";
    }
    if (labelEl) {
      labelEl.textContent = this._label || "";
      labelEl.style.display = (showLabel && this._label) ? "" : "none";
    }
    // Die Karte selbst wird NIE ausgeblendet — nur das Label reagiert auf show_label
    const cardEl = this._shadow.querySelector("ha-card");
    if (cardEl) {
      cardEl.style.display = "";
    }
  }

  connectedCallback() {
    if (this._shadow && this._config) this._render();
  }

  getCardSize() { return 1; }
  static getConfigElement() { return document.createElement(EDITOR_TAG); }
  static getStubConfig() { return { type: "custom:" + CARD_NAME, count_type: "batteries_critical" }; }
}

customElements.define(CARD_NAME, SummaryCountCard);
export { SummaryCountCard as SummaryCountCard };