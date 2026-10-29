// Builds a compact accessibility-style tree of the page with stable ref ids.
(function () {
  if (window.__orTreeInstalled) return;
  window.__orTreeInstalled = true;
  window.__orMap = window.__orMap || {};
  window.__orRev = window.__orRev || new WeakMap();
  window.__orCounter = window.__orCounter || 0;

  const ROLE = { a: "link", button: "button", select: "combobox", textarea: "textbox", img: "image", nav: "navigation", main: "main", header: "banner", footer: "contentinfo", section: "region", article: "article", aside: "complementary", form: "form", table: "table", ul: "list", ol: "list", li: "listitem", label: "label", h1: "heading", h2: "heading", h3: "heading", h4: "heading", h5: "heading", h6: "heading" };
  const SKIP = new Set(["script", "style", "meta", "link", "title", "noscript", "head"]);
  const INTERACTIVE = new Set(["a", "button", "input", "select", "textarea", "details", "summary"]);

  const roleOf = (el) => {
    const r = el.getAttribute("role");
    if (r) return r;
    const t = el.tagName.toLowerCase();
    if (t === "input") {
      const ty = el.getAttribute("type");
      return ty === "submit" || ty === "button" ? "button" : ty === "checkbox" ? "checkbox" : ty === "radio" ? "radio" : "textbox";
    }
    return ROLE[t] || "generic";
  };
  const isSecret = (el) => {
    const ty = (el.getAttribute("type") || "").toLowerCase();
    if (ty === "password" || ty === "hidden") return true;
    return /password|one-time-code|cc-/.test((el.getAttribute("autocomplete") || "").toLowerCase());
  };
  const ownText = (el) => Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
  const nameOf = (el) => {
    const t = el.tagName.toLowerCase();
    for (const a of ["aria-label", "placeholder", "title", "alt"]) {
      const v = el.getAttribute(a);
      if (v && v.trim()) return v.trim();
    }
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l && ownText(l)) return ownText(l);
    }
    if (t === "input" || t === "textarea") {
      if (isSecret(el)) return el.value ? "[value redacted]" : "";
      if (el.value && el.value.length < 50) return el.value.trim();
    }
    if (t === "select" && el.selectedOptions[0]) return el.selectedOptions[0].textContent.trim();
    if (/^h[1-6]$/.test(t)) return (el.textContent || "").trim().slice(0, 100);
    const own = ownText(el);
    return own.length >= (["button", "a", "summary"].includes(t) ? 1 : 3) ? own.slice(0, 100) : "";
  };
  const visible = (el) => {
    const s = getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0" && el.offsetWidth > 0 && el.offsetHeight > 0;
  };
  const inViewport = (el) => {
    const r = el.getBoundingClientRect();
    return r.top < innerHeight && r.bottom > 0 && r.left < innerWidth && r.right > 0;
  };
  const isInteractive = (el) =>
    INTERACTIVE.has(el.tagName.toLowerCase()) || el.hasAttribute("onclick") || el.hasAttribute("tabindex") || ["button", "link"].includes(el.getAttribute("role")) || el.getAttribute("contenteditable") === "true";
  const worthShowing = (el, o) => {
    const t = el.tagName.toLowerCase();
    if (SKIP.has(t)) return false;
    if (o.filter !== "all" && el.getAttribute("aria-hidden") === "true") return false;
    if (o.filter !== "all" && !visible(el)) return false;
    if (o.filter !== "all" && !o.refId && !inViewport(el)) return false;
    if (o.filter === "interactive") return isInteractive(el);
    if (isInteractive(el)) return true;
    if (/^h[1-6]$|^(nav|main|header|footer|section|article|aside)$/.test(t) || el.hasAttribute("role")) return true;
    if (nameOf(el)) return true;
    const r = roleOf(el);
    return r !== "generic" && r !== "image";
  };

  window.__orGenerateTree = function (filter, depth, maxChars, refId) {
    const out = [];
    const maxDepth = depth == null ? 15 : depth;
    let count = 0;
    const opts = { filter: filter || "all", refId };
    const walk = (el, d) => {
      if (count >= 10000 || d > maxDepth || !el || !el.tagName) return;
      const show = worthShowing(el, opts) || (refId && d === 0);
      if (show) {
        let id = window.__orRev.get(el);
        if (!id || !(window.__orMap[id] && window.__orMap[id].deref() === el)) {
          id = "ref_" + ++window.__orCounter;
          window.__orMap[id] = new WeakRef(el);
          window.__orRev.set(el, id);
        }
        count++;
        let line = " ".repeat(d) + roleOf(el);
        const nm = nameOf(el).replace(/\s+/g, " ").slice(0, 100);
        if (nm) line += ` "${nm.replace(/"/g, '\\"')}"`;
        line += ` [${id}]`;
        for (const a of ["href", "type", "placeholder"]) if (el.getAttribute(a)) line += ` ${a}="${el.getAttribute(a)}"`;
        out.push(line);
        if (el.tagName.toLowerCase() === "select" && !isSecret(el))
          for (const o of el.options) out.push(" ".repeat(d + 1) + `option "${o.textContent.trim().slice(0, 100)}"${o.selected ? " (selected)" : ""}`);
      }
      if (el.tagName.toLowerCase() === "select") return;
      for (const c of el.children) walk(c, show ? d + 1 : d);
    };
    if (refId) {
      const ref = window.__orMap[refId];
      const el = ref && ref.deref();
      if (!el) return { error: `Element ${refId} not found. Call read_page again.`, pageContent: "", viewport: { width: innerWidth, height: innerHeight } };
      walk(el, 0);
    } else if (document.body) walk(document.body, 0);
    let text = out.join("\n");
    if (count >= 10000) text += "\n[truncated at 10000 elements]";
    if (maxChars && text.length > maxChars) text = text.slice(0, maxChars) + `\n[output truncated at ${maxChars} chars]`;
    return { pageContent: text, viewport: { width: innerWidth, height: innerHeight } };
  };

  // Resolve a ref to on-screen centre coordinates (scrolls into view first).
  window.__orRefPoint = function (refId) {
    const ref = window.__orMap[refId];
    const el = ref && ref.deref();
    if (!el) return { error: `Element ${refId} not found. Call read_page again.` };
    el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  };

  window.__orSetValue = function (refId, value) {
    const ref = window.__orMap[refId];
    const el = ref && ref.deref();
    if (!el) return { error: `Element ${refId} not found. Call read_page again.` };
    el.scrollIntoView({ block: "center", behavior: "instant" });
    const t = el.tagName.toLowerCase();
    const fire = (type) => el.dispatchEvent(new Event(type, { bubbles: true }));
    if (t === "select") {
      const opt = Array.from(el.options).find((o) => o.value === String(value) || o.textContent.trim() === String(value));
      if (!opt) return { error: `Option "${value}" not found` };
      el.value = opt.value; fire("input"); fire("change");
      return { ok: `Selected "${opt.textContent.trim()}"` };
    }
    if (el.type === "checkbox" || el.type === "radio") {
      el.checked = value === true || value === "true";
      fire("input"); fire("change");
      return { ok: `Set ${el.type} to ${el.checked}` };
    }
    if (t === "input" || t === "textarea") {
      const proto = t === "input" ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, String(value));
      fire("input"); fire("change");
      return { ok: "Value set" };
    }
    if (el.isContentEditable) { el.textContent = String(value); fire("input"); return { ok: "Value set" }; }
    return { error: "Element is not a form field" };
  };
})();
