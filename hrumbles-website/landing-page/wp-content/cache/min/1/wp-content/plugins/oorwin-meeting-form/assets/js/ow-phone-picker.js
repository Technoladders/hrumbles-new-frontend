(function () {
  class OwPhonePicker extends HTMLElement {
    constructor() {
      super();
      this._dd = null;
      this._countries = [];
      this._portaled = !1;
      this._els = {};
      this._onPointerCapture = this._onPointerCapture.bind(this);
      this._onEsc = this._onEsc.bind(this);
      this._place = this._place.bind(this);
      this._onResize = () => {
        this._place();
        this._resizeDropdown();
      };
    }
    connectedCallback() {
      const ph = this.getAttribute("input-placeholder") || "Enter phone number";
      this.innerHTML = `
      <div class="ow-phone-wrap">
        <button type="button" class="ow-dial-btn" id="btn" aria-haspopup="listbox" aria-expanded="false">
          <span class="ow-flag" id="flag">ðŸ‡ºðŸ‡¸</span><span class="ow-dial-code" id="dial">+1</span>
          <svg class="ow-caret" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="#7B8698" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <input class="ow-phone-input" id="input" type="tel" autocomplete="tel" inputmode="numeric" pattern="[0-9]*" placeholder="${ph}">
      </div>`;
      this._dd = document.createElement("div");
      this._dd.className = "ow-dial-dropdown";
      this._dd.hidden = !0;
      this._dd.innerHTML = `
      <div class="ow-dd-search"><input id="search" type="text" placeholder="Search country or code"></div>
      <div class="ow-dd-list" id="list" role="listbox" aria-label="Country codes"></div>`;
      this._els.btn = this.querySelector("#btn");
      this._els.flag = this.querySelector("#flag");
      this._els.dial = this.querySelector("#dial");
      this._els.input = this.querySelector("#input");
      this._els.search = this._dd.querySelector("#search");
      this._els.list = this._dd.querySelector("#list");
      const dialName = this.getAttribute("hidden-name-dial") || "dial_code";
      const fullName = this.getAttribute("hidden-name-full") || "phone_full";
      this._hidDial = document.createElement("input");
      this._hidDial.type = "hidden";
      this._hidDial.name = dialName;
      this._hidDial.value = "+1";
      this._hidFull = document.createElement("input");
      this._hidFull.type = "hidden";
      this._hidFull.name = fullName;
      this._hidFull.value = "+1";
      this.appendChild(this._hidDial);
      this.appendChild(this._hidFull);
      this._els.btn.addEventListener("click", () =>
        this._toggle(this._dd.hidden)
      );
      this._els.input.addEventListener("focus", () => this._toggle(!1));
      this._els.input.addEventListener("beforeinput", (e) => {
        if (e.inputType === "insertText" && e.data && /\D/.test(e.data))
          e.preventDefault();
      });
      this._els.input.addEventListener("input", () => this._updateFull());
      this._els.search.addEventListener("input", () =>
        this._renderList(this._els.search.value)
      );
      this._loadCountries().then(async () => {
        this._renderList("");
        const def = this.getAttribute("default-country");
        if (def === "auto" || !def) {
          const iso = await this._detectISO().catch(() => "US");
          this._setByISO(iso || "US");
        } else {
          this._setByISO(def);
        }
      });
    }
    disconnectedCallback() {
      this._detachGuards();
      if (this._portaled && this._dd?.parentNode)
        this._dd.parentNode.removeChild(this._dd);
    }
    async _loadCountries() {
      const src = this.getAttribute("countries-src");
      if (src) {
        try {
          const j = await fetch(src, { credentials: "same-origin" }).then((r) =>
            r.ok ? r.json() : null
          );
          if (j) {
            this._countries = this._normalize(j);
            return;
          }
        } catch {}
      }
      const id = this.getAttribute("countries-json-id");
      if (id) {
        try {
          const raw = document.getElementById(id)?.textContent?.trim();
          if (raw) {
            this._countries = this._normalize(JSON.parse(raw));
            return;
          }
        } catch {}
      }
      try {
        const j = await fetch(
          "https://cdn.jsdelivr.net/npm/country-telephone-data@0.6.5/data/countries.json"
        ).then((r) => (r.ok ? r.json() : null));
        if (j) {
          this._countries = this._normalize(j);
          return;
        }
      } catch {}
      this._countries = [
        { name: "United States", iso2: "US", dialCode: "1" },
        { name: "Canada", iso2: "CA", dialCode: "1" },
        { name: "United Kingdom", iso2: "GB", dialCode: "44" },
        { name: "India", iso2: "IN", dialCode: "91" },
        { name: "Spain", iso2: "ES", dialCode: "34" },
        { name: "Venezuela", iso2: "VE", dialCode: "58" },
      ];
    }
    _normalize(raw) {
      let arr = raw;
      if (raw.countries) arr = raw.countries;
      if (raw.allCountries) arr = raw.allCountries;
      const out = arr.map((x) =>
        Array.isArray(x)
          ? { name: x[0], iso2: x[1], dialCode: String(x[2]) }
          : { name: x.name, iso2: x.iso2, dialCode: String(x.dialCode) }
      );
      out.sort((a, b) => a.name.localeCompare(b.name));
      return out;
    }
    _renderList(filter = "") {
      const q = (filter || "").trim().toLowerCase();
      this._els.list.innerHTML = "";
      this._countries
        .filter(
          (c) =>
            !q ||
            c.name.toLowerCase().includes(q) ||
            c.iso2.toLowerCase().includes(q) ||
            ("+" + c.dialCode).includes(q)
        )
        .forEach((c) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "ow-dd-item";
          btn.innerHTML = `<span class="ow-flag">${this._flag(
            c.iso2
          )}</span><span class="ow-dd-name">${
            c.name
          }</span><span class="ow-dd-code">+${c.dialCode}</span>`;
          btn.addEventListener("click", () => {
            this._applyCountry(c);
            this._toggle(!1);
          });
          this._els.list.appendChild(btn);
        });
    }
    _applyCountry(c) {
      this._els.flag.textContent = this._flag(c.iso2);
      this._els.dial.textContent = `+${c.dialCode}`;
      this._hidDial.value = `+${c.dialCode}`;
      this._updateFull();
      this.dispatchEvent(
        new CustomEvent("change", {
          detail: { type: "country", ...c },
          bubbles: !0,
        })
      );
    }
    _setByISO(iso) {
      const c = this._countries.find(
        (x) => x.iso2.toUpperCase() === String(iso).toUpperCase()
      );
      if (c) this._applyCountry(c);
    }
    _updateFull() {
      const code = this._hidDial.value || "+1";
      const num = (this._els.input.value || "").replace(/\D+/g, "");
      this._els.input.value = num;
      this._hidFull.value = code + num;
      this.dispatchEvent(
        new CustomEvent("change", {
          detail: { type: "input", full: this._hidFull.value },
          bubbles: !0,
        })
      );
    }
    _flag(iso) {
      const up = iso.toUpperCase();
      return String.fromCodePoint(
        ...[...up].map((c) => 127397 + c.charCodeAt())
      );
    }
    _getPortalRoot() {
      return (
        this.closest(".elementor-popup-modal, .dialog-widget") || document.body
      );
    }
    _toggle(show) {
      if (show) {
        if (!this._portaled) {
          this._getPortalRoot().appendChild(this._dd);
          this._portaled = !0;
        }
        this._dd.hidden = !1;
        this._els.btn.setAttribute("aria-expanded", "true");
        this._place();
        this._resizeDropdown();
        this._attachGuards();
        requestAnimationFrame(() => {
          this._els.search.focus();
          this._els.search.select();
        });
      } else {
        this._dd.hidden = !0;
        this._els.btn.setAttribute("aria-expanded", "false");
        this._detachGuards();
      }
    }
    _attachGuards() {
      ["pointerdown", "mousedown", "touchstart"].forEach((type) => {
        document.addEventListener(type, this._onPointerCapture, !0);
      });
      window.addEventListener("scroll", this._place, !0);
      window.addEventListener("resize", this._onResize);
      document.addEventListener("keydown", this._onEsc, !0);
    }
    _detachGuards() {
      ["pointerdown", "mousedown", "touchstart"].forEach((type) => {
        document.removeEventListener(type, this._onPointerCapture, !0);
      });
      window.removeEventListener("scroll", this._place, !0);
      window.removeEventListener("resize", this._onResize);
      document.removeEventListener("keydown", this._onEsc, !0);
    }
    _onPointerCapture(e) {
      if (this._dd.hidden) return;
      const insideHost = this.contains(e.target);
      theInside = this._dd.contains(e.target);
      const insideDD = theInside;
      if (insideHost || insideDD) {
        e.stopPropagation();
      } else {
        this._toggle(!1);
      }
    }
    _onEsc(e) {
      if (e.key === "Escape") {
        this._toggle(!1);
        e.stopPropagation();
      }
    }
    _resizeDropdown() {
      const searchWrap = this._dd.querySelector(".ow-dd-search");
      const list = this._els.list;
      const h = this._dd.clientHeight - (searchWrap?.offsetHeight || 0);
      list.style.height = (h > 0 ? h : 0) + "px";
    }
    _place() {
      if (this._dd.hidden) return;
      const rect = this.getBoundingClientRect();
      const ddW = this._dd.offsetWidth || 320;
      const ddH = this._dd.offsetHeight || 380;
      let left = rect.left + 14;
      left = Math.max(8, Math.min(left, window.innerWidth - ddW - 8));
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      let top =
        spaceBelow >= ddH || spaceBelow >= spaceAbove
          ? rect.bottom + 8
          : rect.top - ddH - 8;
      top = Math.max(8, Math.min(top, window.innerHeight - ddH - 8));
      Object.assign(this._dd.style, { left: left + "px", top: top + "px" });
    }
    async _detectISO() {
      const j1 = await this._fetchT("https://ipapi.co/json/");
      if (j1?.country_code) return j1.country_code;
      const j2 = await this._fetchT("https://ipwho.is/");
      if (j2?.country_code) return j2.country_code;
      const j3 = await this._fetchT("https://get.geojs.io/v1/ip/geo.json");
      if (j3?.country_code || j3?.country) return j3.country_code || j3.country;
      const lang = (navigator.language || "en-US").split("-")[1];
      return lang || "US";
    }
    async _fetchT(url, ms = 3000) {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), ms);
      try {
        const r = await fetch(url, { signal: c.signal });
        clearTimeout(t);
        return r.ok ? r.json() : null;
      } catch {
        clearTimeout(t);
        return null;
      }
    }
  }
  customElements.define("ow-phone-picker", OwPhonePicker);
})();
