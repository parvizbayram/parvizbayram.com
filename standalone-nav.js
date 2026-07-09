(() => {
  const BIO_ENTRY_TRANSITION_KEY = "parviz:bio-entry-transition";
  const BIO_ENTRY_TRANSITION_PARAM = "bioEntry";
  const WORKS_REVEAL_KEY = "parviz:works-reveal";
  const WORKS_POSITION_KEY = "parviz:works-position";

  function getSourcePageName() {
    const classList = Array.from(document.documentElement.classList);
    const documentClass = classList.find((className) => className.endsWith("-document"));
    if (documentClass) {
      return documentClass.replace(/-document$/, "");
    }

    const pathname = window.location.pathname.replace(/^\/+|\/+$/g, "");
    return pathname || "standalone";
  }

  function initBioEntryTransitionBridge() {
    document.addEventListener("click", (event) => {
      const clickTarget = event.target instanceof Element ? event.target : event.target?.parentElement;
      const anchor = clickTarget?.closest("a");
      if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = anchor.getAttribute("target");
      if (target && target !== "_self") {
        return;
      }

      const url = new URL(anchor.href, window.location.href);

      if (url.origin === window.location.origin && url.pathname === "/" && url.hash === "#works") {
        event.preventDefault();
        try {
          const savedPosition = JSON.parse(sessionStorage.getItem(WORKS_POSITION_KEY) || "null");
          const canRestorePosition =
            Number.isFinite(Number(savedPosition?.offset)) &&
            savedPosition?.casePath === window.location.pathname;

          sessionStorage.setItem(WORKS_REVEAL_KEY, JSON.stringify({
            to: "works",
            startedAt: Date.now(),
            restorePosition: canRestorePosition
          }));
        } catch (error) {
          // Navigation still works without storage; the main page also handles /#works directly.
        }
        window.location.assign("/");
        return;
      }

      if (url.origin !== window.location.origin || !url.pathname.startsWith("/bio")) {
        return;
      }

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      const sourcePage = getSourcePageName();

      try {
        sessionStorage.setItem(BIO_ENTRY_TRANSITION_KEY, JSON.stringify({
          from: sourcePage,
          to: "bio",
          startedAt: Date.now()
        }));
      } catch (error) {
        event.preventDefault();
        url.searchParams.set(BIO_ENTRY_TRANSITION_PARAM, sourcePage);
        window.location.assign(url.href);
      }
    }, { capture: true });
  }

  initBioEntryTransitionBridge();
})();
