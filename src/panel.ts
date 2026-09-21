/** Browser-only custom elements. Import from `reachy-jev/panel`, not the Node-safe root. */
export type GaugeType = "noul" | "choice" | "score";
export interface GaugeDatum {
  key: string;
  label: string;
  p: number | null;
  confidence?: number;
  type?: GaugeType;
}
export interface PanelFrame {
  gauges: readonly GaugeDatum[];
  model?: string;
  latencyMs?: number;
  stale?: boolean;
  skipped?: boolean;
  source?: "live" | "fixture";
}

const gaugeMarkup = `<style>
  :host { display:block; color:var(--jev-text,#edf2fa); font:500 13px/1.35 system-ui,sans-serif; }
  .top { display:flex; align-items:baseline; justify-content:space-between; gap:12px; margin-bottom:7px; }
  .label { overflow-wrap:anywhere; }
  .value { font-variant-numeric:tabular-nums; font-weight:750; }
  .track { height:10px; border-radius:999px; background:var(--jev-track,#344158); overflow:hidden; }
  .fill { height:100%; width:0; border-radius:inherit; background:var(--jev-fill,#f4c95d); transition:width 160ms ease; }
  :host([uncertain]) .fill, :host([stale]) .fill { background:repeating-linear-gradient(125deg,var(--jev-fill,#f4c95d) 0 6px,var(--jev-track,#344158) 6px 10px); }
  :host([uncertain]) .label, :host([stale]) .label { opacity:.68; }
  .type { color:var(--jev-muted,#a8b4ca); font-size:10px; text-transform:uppercase; letter-spacing:.08em; }
  @media (prefers-reduced-motion:reduce) { .fill { transition:none; } }
</style><div class="top"><span class="label"></span><span class="value"></span></div><div class="track" role="progressbar" aria-valuemin="0" aria-valuemax="100"><div class="fill"></div></div><span class="type"></span>`;

export class JevGaugeElement extends HTMLElement {
  static observedAttributes = ["label", "p", "confidence", "type", "stale"];
  private readonly labelNode: HTMLElement;
  private readonly valueNode: HTMLElement;
  private readonly fillNode: HTMLElement;
  private readonly trackNode: HTMLElement;
  private readonly typeNode: HTMLElement;

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = gaugeMarkup;
    this.labelNode = root.querySelector(".label")!;
    this.valueNode = root.querySelector(".value")!;
    this.fillNode = root.querySelector(".fill")!;
    this.trackNode = root.querySelector(".track")!;
    this.typeNode = root.querySelector(".type")!;
  }

  connectedCallback(): void { this.render(); }
  attributeChangedCallback(): void { this.render(); }

  private render(): void {
    const label = this.getAttribute("label") || "Signal";
    const rawP = this.getAttribute("p");
    const p = rawP === null ? null : Number(rawP);
    const validP = p !== null && Number.isFinite(p) && p >= 0 && p <= 1;
    const confidenceRaw = this.getAttribute("confidence");
    const confidence = confidenceRaw === null ? null : Number(confidenceRaw);
    const uncertain = confidence !== null && Number.isFinite(confidence) && confidence < 0.5;
    this.toggleAttribute("uncertain", uncertain);
    this.labelNode.textContent = label;
    this.valueNode.textContent = validP ? `${Math.round(p * 100)}%` : "—";
    this.fillNode.style.width = validP ? `${Math.round(p * 100)}%` : "0%";
    this.trackNode.setAttribute("aria-label", label);
    if (validP) this.trackNode.setAttribute("aria-valuenow", String(Math.round(p * 100)));
    else this.trackNode.removeAttribute("aria-valuenow");
    this.typeNode.textContent = this.getAttribute("type") || "";
  }
}

const panelMarkup = `<style>
  :host { display:block; color:var(--jev-text,#edf2fa); background:var(--jev-panel,#172031); border:1px solid var(--jev-border,#354359); border-radius:16px; padding:18px; font:500 13px/1.35 system-ui,sans-serif; }
  header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:16px; }
  h2 { margin:0; font-size:15px; }
  .status { padding:4px 8px; border-radius:999px; background:#24543b; color:#d0ffe0; font-size:11px; font-weight:750; text-transform:uppercase; }
  .status[data-state=stale] { background:#75571b; color:#ffe9ae; }
  .status[data-state=fixture] { background:#4b3e7b; color:#eee5ff; }
  .status[data-state=idle] { background:#424c5f; color:#e5e9ef; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:16px 22px; }
  .meta { color:var(--jev-muted,#a8b4ca); margin-top:14px; font-variant-numeric:tabular-nums; }
  :host(:not([data-has-gauges])) .grid::before { content:"No judgments yet"; color:var(--jev-muted,#a8b4ca); }
</style><header><h2>Jev signals</h2><span class="status" data-state="idle" role="status" aria-live="polite">idle</span></header><div class="grid"></div><div class="meta"></div>`;

export class JevPanelElement extends HTMLElement {
  private readonly grid: HTMLElement;
  private readonly statusNode: HTMLElement;
  private readonly metaNode: HTMLElement;
  private readonly gauges = new Map<string, JevGaugeElement>();
  private keys = "";

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = panelMarkup;
    this.grid = root.querySelector(".grid")!;
    this.statusNode = root.querySelector(".status")!;
    this.metaNode = root.querySelector(".meta")!;
  }

  update(frame: PanelFrame): void {
    const seen = new Set<string>();
    for (const gauge of frame.gauges) {
      if (!/^[a-z][a-z0-9_]*$/.test(gauge.key) || seen.has(gauge.key) || !gauge.label.trim() || gauge.label.length > 80) throw new TypeError("invalid gauge key or label");
      if (gauge.p !== null && (!Number.isFinite(gauge.p) || gauge.p < 0 || gauge.p > 1)) throw new RangeError("gauge p must be in [0,1]");
      if (gauge.confidence !== undefined && (!Number.isFinite(gauge.confidence) || gauge.confidence < 0 || gauge.confidence > 1)) throw new RangeError("gauge confidence must be in [0,1]");
      seen.add(gauge.key);
    }
    if (frame.latencyMs !== undefined && (!Number.isFinite(frame.latencyMs) || frame.latencyMs < 0)) throw new RangeError("invalid latency");
    const nextKeys = frame.gauges.map((gauge) => gauge.key).join("|");
    for (const key of this.gauges.keys()) if (!seen.has(key)) this.gauges.delete(key);
    const elements = frame.gauges.map((datum) => {
      let gauge = this.gauges.get(datum.key);
      if (!gauge) {
        gauge = document.createElement("jev-gauge") as JevGaugeElement;
        this.gauges.set(datum.key, gauge);
      }
      gauge.setAttribute("label", datum.label);
      if (datum.p === null) gauge.removeAttribute("p");
      else gauge.setAttribute("p", String(datum.p));
      if (datum.confidence === undefined) gauge.removeAttribute("confidence");
      else gauge.setAttribute("confidence", String(datum.confidence));
      if (datum.type === undefined) gauge.removeAttribute("type");
      else gauge.setAttribute("type", datum.type);
      gauge.toggleAttribute("stale", Boolean(frame.stale));
      return gauge;
    });
    if (nextKeys !== this.keys) {
      this.grid.replaceChildren(...elements);
      this.keys = nextKeys;
    }
    this.toggleAttribute("data-has-gauges", elements.length > 0);
    const state = frame.stale ? "stale" : frame.source === "fixture" ? "fixture" : elements.length ? "live" : "idle";
    this.statusNode.dataset.state = state;
    this.statusNode.textContent = state;
    this.metaNode.textContent = [frame.model, frame.latencyMs === undefined ? undefined : `${Math.round(frame.latencyMs)} ms`, frame.skipped ? "cached" : undefined].filter(Boolean).join(" · ");
  }
}

export function registerJevElements(): void {
  if (!customElements.get("jev-gauge")) customElements.define("jev-gauge", JevGaugeElement);
  if (!customElements.get("jev-panel")) customElements.define("jev-panel", JevPanelElement);
}

registerJevElements();
