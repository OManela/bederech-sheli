// Minimal inline-SVG charts. Time runs left → right (dir="ltr").
import { esc } from './ui.js';

const W = 340, H = 180, PAD = { t: 12, r: 10, b: 26, l: 30 };

function frame(max, ticks) {
  const ih = H - PAD.t - PAD.b;
  return ticks.map(v => {
    const y = PAD.t + ih - (v / max) * ih;
    return `<line class="grid" x1="${PAD.l}" x2="${W - PAD.r}" y1="${y}" y2="${y}"/>
            <text x="${PAD.l - 6}" y="${y + 4}" text-anchor="end">${v}</text>`;
  }).join('');
}

function xLabels(labels, xAt) {
  if (!labels.length) return '';
  const every = Math.ceil(labels.length / 6);
  const last = labels.length - 1;
  return labels.map((l, i) => {
    if (!(i % every === 0 || i === last) || !l) return '';
    // Keep the edge labels inside the chart.
    const x = xAt(i);
    const anchor = x < PAD.l + 24 ? 'start' : x > W - PAD.r - 24 ? 'end' : 'middle';
    return `<text x="${x}" y="${H - 8}" text-anchor="${anchor}">${esc(l)}</text>`;
  }).join('');
}

/** Short numeric date for chart axes, e.g. 17.11 */
export function axisDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

/** series: [{ values: [number|null], color, label, dashed? }] */
export function lineChart({ series, labels, max = 10, ticks }) {
  const n = labels.length;
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b;
  const xAt = i => PAD.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const yAt = v => PAD.t + ih - (v / max) * ih;
  ticks = ticks || [0, max / 2, max];
  const paths = series.map(s => {
    const pts = s.values.map((v, i) => (v == null ? null : [xAt(i), yAt(v)])).filter(Boolean);
    if (!pts.length) return '';
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const dots = pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="${s.color}"/>`).join('');
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" ${s.dashed ? 'stroke-dasharray="5 4"' : ''}/>${dots}`;
  }).join('');
  return `<svg class="chart" dir="ltr" viewBox="0 0 ${W} ${H}" role="img">${frame(max, ticks)}${paths}${xLabels(labels, xAt)}</svg>
    <div class="legend">${series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.label)}</span>`).join('')}</div>`;
}

/** Grouped bars: series values aligned with labels. */
export function barChart({ series, labels, max, ticks }) {
  const n = labels.length;
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b;
  max = max || Math.max(1, ...series.flatMap(s => s.values.map(v => v || 0)));
  ticks = ticks || [0, Math.round(max / 2), max];
  const slot = iw / Math.max(1, n);
  const bw = Math.min(18, (slot * 0.75) / series.length);
  const xAt = i => PAD.l + slot * i + slot / 2;
  const bars = labels.map((_, i) => series.map((s, k) => {
    const v = s.values[i];
    if (v == null) return '';
    const h = (v / max) * ih;
    const x = xAt(i) - (bw * series.length) / 2 + k * bw;
    return `<rect x="${x.toFixed(1)}" y="${(PAD.t + ih - h).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${s.color}"/>`;
  }).join('')).join('');
  return `<svg class="chart" dir="ltr" viewBox="0 0 ${W} ${H}" role="img">${frame(max, ticks)}${bars}${xLabels(labels, xAt)}</svg>
    <div class="legend">${series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.label)}</span>`).join('')}</div>`;
}
