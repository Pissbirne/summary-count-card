// ===== SUMMARY-COUNT-CARD - mit visuellem Editor (ohne Lit) =====
const CARD_NAME = "summary-count-card";
const EDITOR_TAG = CARD_NAME + "-editor";

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
      color_mode: config.color_mode || "auto"
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
    const de = {
      lights: count === 0 ? "Alle aus" : (count === 1 ? "Licht an" : "Lichter an"),
      batteries_critical: count === 0 ? "Alle OK" : "kritisch",
      covers_open: count === 0 ? "Alle zu" : (count === 1 ? "Rollo offen" : "Rollos offen"),
      security: count === 0 ? "Alles gesichert" : "unsicher",
      switches_on: count === 0 ? "Alle aus" : "Schalter an",
      sensors_on: count === 0 ? "Keine aktiv" : (count === 1 ? "Sensor an" : "Sensoren an")
    };
    return de[type] || "";
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

  _render() {
    if (!this._shadow || !this._config) return;
    const icon = this._config.icon || this._autoIcon(this._config.count_type);
    const color = this._getColor();
    const showIcon = this._config.show_icon !== false;
    const showLabel = this._config.show_label !== false;

    const styles = `
      :host { display: block; }
      ha-card { cursor:pointer; border-radius:12px; }
      ha-card:hover { background:rgba(255,255,255,0.12); }
      .inner { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; padding:12px; min-height:88px; }
      .row { display:flex; flex-direction:row; align-items:baseline; justify-content:center; gap:4px; }
      .num { font-size:24px; font-weight:700; line-height:1; }
      .label { font-size:14px; font-weight:600; color:var(--primary-text-color); text-align:center; }
      ha-icon { --mdc-icon-size:32px; margin-bottom:2px; }
    `;

    // Einmalig Struktur aufbauen
    if (!this._built) {
      this._shadow.innerHTML = `
        <style>${styles}</style>
        <ha-card>
          <div class="inner">
            <ha-icon class="icn"></ha-icon>
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
    if (numEl) {
      // Zahl ausblenden, wenn count=0 und ein "Alle ..."-Label steht (kein "0 Alle aus")
      const hideNum = (this._count === 0 && this._label);
      numEl.textContent = hideNum ? "" : String(this._count);
      numEl.style.color = color;
      numEl.style.display = hideNum ? "none" : "";
    }
    if (labelEl) {
      labelEl.textContent = this._label || "";
      labelEl.style.display = (showLabel && this._label) ? "" : "none";
    }
    const cardEl = this._shadow.querySelector("ha-card");
    if (cardEl) {
      cardEl.style.display = (showLabel && this._label) ? "" : "none";
    }
  }

  getCardSize() { return 1; }
  static getConfigElement() { return document.createElement(EDITOR_TAG); }
  static getStubConfig() { return { type: "custom:" + CARD_NAME, count_type: "batteries_critical" }; }
}

customElements.define(CARD_NAME, SummaryCountCard);
export { SummaryCountCard as SummaryCountCard };