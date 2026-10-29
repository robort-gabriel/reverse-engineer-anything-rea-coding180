// Glowing frame shown on a page while the agent is controlling it.
(function () {
  let el = null;
  function show() {
    if (el) return;
    el = document.createElement("div");
    el.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;box-shadow:inset 0 0 0 3px rgba(217,119,87,.85),inset 0 0 36px rgba(217,119,87,.45);animation:orpulse 2s ease-in-out infinite";
    const st = document.createElement("style");
    st.textContent = "@keyframes orpulse{50%{opacity:.55}}";
    el.appendChild(st);
    (document.documentElement || document.body).appendChild(el);
  }
  function hide() { if (el) { el.remove(); el = null; } }
  chrome.runtime.onMessage.addListener((m) => {
    if (m && m.type === "agent-indicator") (m.on ? show : hide)();
  });
})();
