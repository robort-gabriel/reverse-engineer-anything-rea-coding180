// Shared UI primitives: toast, popover menus, modals, confirm dialog.
import { icon } from './icons.js';
import { esc } from './markdown.js';

const root = () => document.getElementById('overlay-root');

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

let activeMenu = null;
export function closeMenu() {
  if (!activeMenu) return;
  activeMenu.el.remove();
  document.removeEventListener('mousedown', activeMenu.outside, true);
  document.removeEventListener('keydown', activeMenu.key, true);
  activeMenu.onClose?.();
  activeMenu = null;
}

/**
 * Opens a popover next to `anchor`.
 * items: [{ icon, label, desc, danger, check, toggle, onClick } | 'sep' | { header }] or a pre-built element.
 */
export function openMenu(anchor, items, { align = 'start', side = 'bottom', className = '', onClose } = {}) {
  closeMenu();
  const el = document.createElement('div');
  el.className = `menu ${className}`;
  if (items instanceof HTMLElement) el.append(items);
  else {
    el.innerHTML = items.map((it, i) => {
      if (it === 'sep') return '<div class="sep"></div>';
      if (it.header) return `<div class="mh">${esc(it.header)}</div>`;
      return `<button class="mi ${it.danger ? 'danger' : ''}" data-i="${i}">${it.icon ? icon(it.icon) : ''}<span>${esc(it.label)}${it.desc ? `<span class="desc">${esc(it.desc)}</span>` : ''}</span>${it.toggle != null ? `<span class="switch ${it.toggle ? 'on' : ''}"></span>` : ''}${it.check ? `<span class="check">${icon('check', 'sm')}</span>` : ''}</button>`;
    }).join('');
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]');
      if (!b) return;
      const it = items[+b.dataset.i];
      if (it.toggle == null) closeMenu();
      it.onClick?.(e, b);
    });
  }
  root().append(el);
  position(el, anchor, align, side);
  const outside = (e) => { if (!el.contains(e.target) && !anchor.contains(e.target)) closeMenu(); };
  const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); } };
  document.addEventListener('mousedown', outside, true);
  document.addEventListener('keydown', key, true);
  activeMenu = { el, outside, key, onClose };
  return el;
}

function position(el, anchor, align, side) {
  const r = anchor.getBoundingClientRect();
  const m = el.getBoundingClientRect();
  const vw = innerWidth, vh = innerHeight;
  let top = side === 'top' ? r.top - m.height - 6 : r.bottom + 6;
  if (top + m.height > vh - 8) top = Math.max(8, r.top - m.height - 6);
  if (top < 8) top = 8;
  let left = align === 'end' ? r.right - m.width : r.left;
  left = Math.min(Math.max(8, left), vw - m.width - 8);
  el.style.top = `${top}px`;
  el.style.left = `${left}px`;
}

/** Opens a modal. Returns { el, close }. */
export function openModal(html, { className = '', onClose, dismissable = true } = {}) {
  const bd = document.createElement('div');
  bd.className = 'modal-backdrop';
  bd.innerHTML = `<div class="modal ${className}" role="dialog" aria-modal="true">${html}</div>`;
  root().append(bd);
  const close = () => {
    bd.remove();
    document.removeEventListener('keydown', onKey, true);
    onClose?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape' && dismissable && !document.querySelector('.menu')) { e.stopPropagation(); close(); }
  };
  document.addEventListener('keydown', onKey, true);
  bd.addEventListener('mousedown', (e) => { if (e.target === bd && dismissable) close(); });
  bd.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  return { el: bd.firstElementChild, close };
}

export function confirmDialog({ title, body, confirm = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    let ok = false;
    const { el, close } = openModal(
      `<div class="modal-head"><h2>${esc(title)}</h2></div>
       <div class="modal-body"><p>${body}</p></div>
       <div class="modal-foot"><button class="btn secondary" data-close>Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(confirm)}</button></div>`,
      { className: '', onClose: () => resolve(ok) },
    );
    el.parentElement.classList.add('confirm');
    el.querySelector('[data-ok]').addEventListener('click', () => { ok = true; close(); });
    el.querySelector('[data-ok]').focus();
  });
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const t = document.createElement('textarea');
    t.value = text;
    document.body.append(t);
    t.select();
    document.execCommand('copy');
    t.remove();
  }
}
