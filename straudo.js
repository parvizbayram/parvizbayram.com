(() => {
  const DESIGN_WIDTH = 1920;
  const root = document.documentElement;

  function syncFlowHeight(scale) {
    const stage = document.querySelector("[data-flow-stage]");
    const shell = document.querySelector("[data-flow-shell]");
    if (!stage || !shell) {
      return;
    }

    if (scale >= 1) {
      stage.style.height = "";
      return;
    }

    stage.style.height = `${shell.getBoundingClientRect().height}px`;
  }

  function syncStraudoScale() {
    const scale = window.innerWidth < DESIGN_WIDTH ? window.innerWidth / DESIGN_WIDTH : 1;
    root.style.setProperty("--page-scale", scale.toFixed(5));
    requestAnimationFrame(() => syncFlowHeight(scale));
  }

  function easeInOutFigma(progress) {
    return progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  }

  function smoothScrollToTop(duration = 1000) {
    const start = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (start <= 0) {
      window.scrollTo(0, 0);
      return;
    }

    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutFigma(progress);
      window.scrollTo(0, Math.round(start * (1 - eased)));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        window.scrollTo(0, 0);
      }
    }

    requestAnimationFrame(step);
  }

  function initScrollToTop() {
    const button = document.querySelector("[data-straudo-scroll-top]");
    if (!button) {
      return;
    }

    button.addEventListener("click", (event) => {
      event.preventDefault();
      smoothScrollToTop(1000);
    });
  }

  function blockMediaContextMenus() {
    const mediaBlocks = document.querySelectorAll(".straudo-media");
    mediaBlocks.forEach((block) => {
      block.addEventListener("contextmenu", (event) => {
        event.preventDefault();
      });

      const image = block.querySelector("img");
      if (image) {
        image.draggable = false;
      }
    });
  }

  syncStraudoScale();
  initScrollToTop();
  blockMediaContextMenus();
  window.addEventListener("load", syncStraudoScale, { once: true });
  window.addEventListener("resize", syncStraudoScale, { passive: true });
})();
