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

  function syncOrkestraScale() {
    const scale = typeof window.PortfolioScale?.sync === "function"
      ? window.PortfolioScale.sync()
      : window.innerWidth < DESIGN_WIDTH
        ? window.innerWidth / DESIGN_WIDTH
        : window.innerWidth / DESIGN_WIDTH;
    requestAnimationFrame(() => syncFlowHeight(scale));
  }

  function blockMediaContextMenus() {
    const mediaBlocks = document.querySelectorAll(".orkestra-media");
    mediaBlocks.forEach((block) => {
      block.addEventListener("contextmenu", (event) => {
        event.preventDefault();
      });

      const image = block.querySelector("img");
      if (image) {
        image.draggable = false;
      }
    });

    const videoBlocks = document.querySelectorAll(".orkestra-media.work-video");
    videoBlocks.forEach((block) => {
      if (block.querySelector(".orkestra-media-shield")) {
        return;
      }

      const shield = document.createElement("div");
      shield.className = "orkestra-media-shield";
      shield.setAttribute("aria-hidden", "true");
      shield.addEventListener("contextmenu", (event) => {
        event.preventDefault();
      });
      shield.addEventListener("mousedown", (event) => {
        if (event.button === 2) {
          event.preventDefault();
        }
      });
      shield.addEventListener("click", (event) => {
        event.preventDefault();
      });
      block.appendChild(shield);
    });
  }

  syncOrkestraScale();
  blockMediaContextMenus();
  window.addEventListener("load", syncOrkestraScale, { once: true });
  window.addEventListener("resize", syncOrkestraScale, { passive: true });
})();
