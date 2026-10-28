// Markdown -> sanitized HTML with ChatGPT-style code blocks.
import { icon } from './icons.js';

const { marked, DOMPurify, hljs } = window;

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const renderer = new marked.Renderer();
renderer.code = (code, lang) => {
  // marked v12 passes (code, infostring)
  const text = typeof code === 'object' ? code.text : code;
  const language = ((typeof code === 'object' ? code.lang : lang) || '').split(/\s/)[0];
  let html;
  try {
    html = language && hljs.getLanguage(language) ? hljs.highlight(text, { language }).value : hljs.highlightAuto(text).value;
  } catch {
    html = esc(text);
  }
  return `<div class="codeblock"><div class="cb-head"><span>${esc(language || 'code')}</span><button data-copy-code>${icon('copy', 'sm')}<span>Copy code</span></button></div><pre><code class="hljs">${html}</code></pre></div>`;
};
renderer.link = (href, title, text) => {
  const h = typeof href === 'object' ? href.href : href;
  const t = typeof href === 'object' ? href.text : text;
  return `<a href="${esc(h || '')}" target="_blank" rel="noopener noreferrer">${t}</a>`;
};

marked.setOptions({ gfm: true, breaks: false, renderer });

export function renderMarkdown(src) {
  // Close an unterminated fence while streaming so highlighting stays stable.
  const fences = (src.match(/^```/gm) || []).length;
  if (fences % 2) src += '\n```';
  return DOMPurify.sanitize(marked.parse(src), { ADD_ATTR: ['target', 'data-copy-code'] });
}

export { esc };
