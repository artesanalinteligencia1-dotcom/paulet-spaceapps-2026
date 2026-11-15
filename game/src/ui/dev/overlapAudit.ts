// Development check (owner's request: "make sure objects never overlap"): finds panels that overlap each other and
// text that spills out of its panel, on whatever screen is showing. Run `__overlapAudit()` in the browser console.
const BOXES = '.deck-panel, .deck-pip, .deck-bar, .hud-panel, .mc-card, .log-card, [data-box]'
const TEXT = 'h1, h2, h3, p, li, dt, dd, button, label, span, a'

interface Hit {
  a: string
  b: string
  px: number
}

const name = (el: Element) => {
  const h = el.querySelector('h1, h2, h3, .hud-label, .deck-head h2')?.textContent?.trim()
  const cls = (el.getAttribute('class') ?? '').split(' ').find((c) => /deck-|hud-|mc-|log-/.test(c)) ?? el.tagName.toLowerCase()
  return `${cls}${h ? ` "${h.slice(0, 32)}"` : ''}`
}

const shown = (el: Element) => {
  const r = el.getBoundingClientRect()
  if (r.width < 2 || r.height < 2) return false
  const st = getComputedStyle(el)
  return st.visibility !== 'hidden' && st.display !== 'none' && Number(st.opacity) > 0.05
}

/** The part of an element that is really visible: its rect cut by every clipping ancestor. */
function visibleRect(el: Element): DOMRect | null {
  let r = el.getBoundingClientRect()
  let p = el.parentElement
  while (p) {
    const st = getComputedStyle(p)
    if (/(hidden|clip|auto|scroll)/.test(st.overflow + st.overflowX + st.overflowY)) {
      const q = p.getBoundingClientRect()
      const x = Math.max(r.left, q.left)
      const y = Math.max(r.top, q.top)
      const w = Math.min(r.right, q.right) - x
      const h = Math.min(r.bottom, q.bottom) - y
      if (w <= 0 || h <= 0) return null
      r = new DOMRect(x, y, w, h)
    }
    p = p.parentElement
  }
  return r
}

const area = (a: DOMRect, b: DOMRect) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))

export function overlapAudit(root: Element | null = document.getElementById('stage')) {
  if (!root) return { overlaps: [], escapes: [] }
  const boxes = [...root.querySelectorAll(BOXES)].filter(shown)
  const overlaps: Hit[] = []
  // a modal over a dimmed stage covers the screen on purpose: only overlaps on the same layer count
  const modal = root.querySelector('[data-modal], [aria-modal="true"]')
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]
      const b = boxes[j]
      if (a.contains(b) || b.contains(a)) continue
      if (modal && modal.contains(a) !== modal.contains(b)) continue
      const ra = visibleRect(a)
      const rb = visibleRect(b)
      if (!ra || !rb) continue
      const px = Math.round(area(ra, rb))
      if (px > 4) overlaps.push({ a: name(a), b: name(b), px })
    }
  // text that shows outside the panel it belongs to
  const escapes: Hit[] = []
  for (const box of boxes) {
    const rb = box.getBoundingClientRect()
    for (const el of box.querySelectorAll(TEXT)) {
      if (!shown(el) || !el.textContent?.trim()) continue
      const r = visibleRect(el)
      if (!r) continue
      const out = r.width * r.height - area(r, rb)
      if (out > 6) escapes.push({ a: name(box), b: `${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 28)}"`, px: Math.round(out) })
    }
  }
  return { overlaps, escapes }
}
