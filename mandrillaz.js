(() => {
  const DESIGN_WIDTH = 1920;

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

  function syncMandrillazScale() {
    const scale = typeof window.PortfolioScale?.sync === "function"
      ? window.PortfolioScale.sync()
      : window.innerWidth / DESIGN_WIDTH;
    requestAnimationFrame(() => syncFlowHeight(scale));
  }

  function blockMediaContextMenus() {
    const mediaBlocks = document.querySelectorAll(".mandrillaz-media");
    mediaBlocks.forEach((block) => {
      block.addEventListener("contextmenu", (event) => {
        event.preventDefault();
      });

      const image = block.querySelector("img");
      if (image) {
        image.draggable = false;
      }
    });

    const videoBlocks = document.querySelectorAll(".mandrillaz-media.work-video");
    videoBlocks.forEach((block) => {
      if (block.classList.contains("mandrillaz-video-playable")) {
        const iframe = block.querySelector("iframe");
        if (iframe) {
          iframe.style.pointerEvents = "auto";
        }
        return;
      }

      if (block.querySelector(".mandrillaz-media-shield")) {
        return;
      }

      const shield = document.createElement("div");
      shield.className = "mandrillaz-media-shield";
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

  function initUxAnchor() {
    const anchor = document.querySelector("[data-mandrillaz-ux-anchor]");
    const logoVideo = document.querySelector(".mandrillaz-logo-video");
    const digitalProduct = document.querySelector("#digital-product");
    if (!anchor || !logoVideo || !digitalProduct) {
      return;
    }

    let ticking = false;

    function setAnchorVisibility() {
      const logoRect = logoVideo.getBoundingClientRect();
      const digitalRect = digitalProduct.getBoundingClientRect();
      const logoTriggerTop = -(logoRect.height * 0.3);
      const isPastLogoTrigger = logoRect.top <= logoTriggerTop;
      const isBeforeDigitalMiddle = digitalRect.top > window.innerHeight * 0.5;
      const shouldShow = isPastLogoTrigger && isBeforeDigitalMiddle;

      anchor.classList.toggle("is-visible", shouldShow);
      anchor.setAttribute("aria-hidden", shouldShow ? "false" : "true");
    }

    function requestVisibilityUpdate() {
      if (ticking) {
        return;
      }

      ticking = true;
      requestAnimationFrame(() => {
        setAnchorVisibility();
        ticking = false;
      });
    }

    anchor.addEventListener("click", (event) => {
      event.preventDefault();
      const targetTop = window.scrollY + digitalProduct.getBoundingClientRect().top - (window.innerHeight * 0.2);
      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth"
      });
    });

    setAnchorVisibility();
    window.addEventListener("scroll", requestVisibilityUpdate, { passive: true });
    window.addEventListener("resize", requestVisibilityUpdate, { passive: true });
  }

  syncMandrillazScale();
  blockMediaContextMenus();
  initUxAnchor();
  window.addEventListener("load", syncMandrillazScale, { once: true });
  window.addEventListener("resize", syncMandrillazScale, { passive: true });
})();
