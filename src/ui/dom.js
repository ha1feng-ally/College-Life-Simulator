// DOM 工具

export function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

export function button(cls, text, onClick, opts = {}) {
  const b = el("button", cls, text);
  b.addEventListener("click", onClick);
  if (opts.disabled) b.disabled = true;
  return b;
}

export function clear(el2) {
  while (el2.firstChild) el2.removeChild(el2.firstChild);
  return el2;
}
