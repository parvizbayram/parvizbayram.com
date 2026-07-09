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

  function syncTalktoCanadaScale() {
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
    const button = document.querySelector("[data-talktocanada-scroll-top]");
    if (!button) {
      return;
    }

    button.addEventListener("click", (event) => {
      event.preventDefault();
      smoothScrollToTop(1000);
    });
  }

  function blockMediaContextMenus() {
    const videoPlayers = new WeakMap();
    const fallbackPlayingStates = new WeakMap();
    let vimeoApiPromise = null;

    function loadVimeoApi() {
      if (window.Vimeo?.Player) {
        return Promise.resolve(window.Vimeo);
      }

      if (vimeoApiPromise) {
        return vimeoApiPromise;
      }

      vimeoApiPromise = new Promise((resolve, reject) => {
        const existingScript = document.querySelector('script[src="https://player.vimeo.com/api/player.js"]');
        const script = existingScript || document.createElement("script");

        script.addEventListener("load", () => resolve(window.Vimeo));
        script.addEventListener("error", reject);

        if (!existingScript) {
          script.src = "https://player.vimeo.com/api/player.js";
          document.head.appendChild(script);
        }
      });

      return vimeoApiPromise;
    }

    function getVideoPlayer(block) {
      if (videoPlayers.has(block)) {
        return Promise.resolve(videoPlayers.get(block));
      }

      const iframe = block.querySelector("iframe");
      if (!iframe) {
        videoPlayers.set(block, null);
        return Promise.resolve(null);
      }

      return loadVimeoApi()
        .then((vimeo) => {
          const player = vimeo?.Player ? new vimeo.Player(iframe) : null;
          videoPlayers.set(block, player);
          return player;
        })
        .catch(() => null);
    }

    function sendVimeoCommand(block, method) {
      const iframe = block.querySelector("iframe");
      if (!iframe?.contentWindow) {
        return;
      }

      iframe.contentWindow.postMessage(JSON.stringify({ method }), "https://player.vimeo.com");
    }

    function togglePrimaryVideo(block) {
      getVideoPlayer(block)
        .then((player) => {
          if (!player) {
            const shouldPlay = !fallbackPlayingStates.get(block);
            sendVimeoCommand(block, shouldPlay ? "play" : "pause");
            fallbackPlayingStates.set(block, shouldPlay);
            return null;
          }

          return player.getPaused()
            .then((isPaused) => (isPaused ? player.play() : player.pause()));
        })
        .catch(() => {});
    }

    const mediaBlocks = document.querySelectorAll(".talktocanada-media");
    mediaBlocks.forEach((block) => {
      block.addEventListener("contextmenu", (event) => {
        event.preventDefault();
      });

      const image = block.querySelector("img");
      if (image) {
        image.draggable = false;
      }
    });

    const videoBlocks = document.querySelectorAll(".talktocanada-media.work-video");
    videoBlocks.forEach((block) => {
      if (block.querySelector(".talktocanada-media-shield")) {
        return;
      }

      const shield = document.createElement("div");
      shield.className = "talktocanada-media-shield";
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
        if (block.classList.contains("talktocanada-primary-video")) {
          togglePrimaryVideo(block);
        }
      });
      block.appendChild(shield);
    });
  }

  syncTalktoCanadaScale();
  initScrollToTop();
  blockMediaContextMenus();
  window.addEventListener("load", syncTalktoCanadaScale, { once: true });
  window.addEventListener("resize", syncTalktoCanadaScale, { passive: true });
})();
