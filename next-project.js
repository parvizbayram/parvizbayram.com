(() => {
  window.__nextProjectScriptVersion = "next-project-pilot-5";

  const DESIGN_WIDTH = 1920;
  const PREVIEW_HEIGHT = 1080;
  const REVEAL_GUARD = 220;
  const TRANSITION_MS = 1000;
  const REVEAL_MS = 780;
  const TRANSITION_EASING = "cubic-bezier(0.5, 0, 0.5, 1)";
  const RETURN_TOP_STATE = "nextProjectReturnTop";
  const RETURN_TOP_STORAGE_KEY = "parviz:next-project-return-top";

  const panel = document.querySelector("[data-next-project]");
  const link = panel?.querySelector("[data-next-project-link]");
  const host = panel?.querySelector("[data-next-project-preview-host]");
  const bubble = panel?.querySelector("[data-next-project-cursor]");

  if (!panel || !link || !host || !bubble) {
    return;
  }

  let nextProject = null;
  let isTransitioning = false;

  function ensureBubbleLayer() {
    if (bubble.parentElement !== document.body) {
      document.body.appendChild(bubble);
    }
  }

  function normalizePath(value) {
    const url = new URL(value, window.location.origin);
    const pathname = url.pathname.replace(/\/+$/, "");
    return pathname || "/";
  }

  function getPageScale() {
    const value = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--page-scale")
    );
    return Number.isFinite(value) && value > 0
      ? value
      : Math.min(1, window.innerWidth / DESIGN_WIDTH);
  }

  function restoreTopAfterBrowserBack() {
    const state = window.history.state;
    let storedReturn = null;

    try {
      storedReturn = JSON.parse(
        window.sessionStorage.getItem(RETURN_TOP_STORAGE_KEY) || "null"
      );
    } catch (error) {
      storedReturn = null;
    }

    const shouldRestoreFromStorage =
      storedReturn?.path === normalizePath(window.location.pathname);
    const shouldRestoreFromState = Boolean(state?.[RETURN_TOP_STATE]);

    if (!shouldRestoreFromStorage && !shouldRestoreFromState) {
      return;
    }

    if (shouldRestoreFromState) {
      const nextState = { ...state };
      delete nextState[RETURN_TOP_STATE];
      window.history.replaceState(nextState, "", window.location.href);
    }

    try {
      window.sessionStorage.removeItem(RETURN_TOP_STORAGE_KEY);
    } catch (error) {
      // History state still provides a fallback when storage is unavailable.
    }

    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        window.history.scrollRestoration = "auto";
      });
    });
  }

  function markCurrentEntryForTopRestore() {
    const currentState =
      window.history.state && typeof window.history.state === "object"
        ? window.history.state
        : {};

    window.history.replaceState(
      { ...currentState, [RETURN_TOP_STATE]: true },
      "",
      window.location.href
    );

    try {
      window.sessionStorage.setItem(
        RETURN_TOP_STORAGE_KEY,
        JSON.stringify({
          path: normalizePath(window.location.pathname),
          startedAt: Date.now()
        })
      );
    } catch (error) {
      // The history-state fallback still works when storage is unavailable.
    }

    window.history.scrollRestoration = "manual";
  }

  function parseDocument(markup) {
    return new DOMParser().parseFromString(markup, "text/html");
  }

  async function fetchDocument(pathname) {
    const response = await fetch(pathname, {
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error(`Unable to load ${pathname}`);
    }

    return parseDocument(await response.text());
  }

  function getProjectOrder(indexDocument) {
    return Array.from(
      indexDocument.querySelectorAll(".works-source > .project-card[href]")
    ).map((card) => {
      const url = new URL(card.getAttribute("href"), window.location.origin);
      return {
        href: `${normalizePath(url.pathname)}${url.search}${url.hash}`,
        path: normalizePath(url.pathname)
      };
    });
  }

  function getNextProject(projects) {
    const currentPath = normalizePath(window.location.pathname);
    const currentIndex = projects.findIndex((project) => project.path === currentPath);

    if (currentIndex < 0 || projects.length < 2) {
      return null;
    }

    return projects[(currentIndex + 1) % projects.length];
  }

  function copyPreviewStructure(destinationDocument) {
    const contract = destinationDocument.querySelector("template[data-next-project-preview]");
    if (!contract) {
      throw new Error("Destination does not expose a next-project preview");
    }

    const introSelector = contract.dataset.introSelector;
    const mediaSelector = contract.dataset.mediaSelector;
    const sourceIntro = introSelector
      ? destinationDocument.querySelector(introSelector)
      : null;
    const sourceMedia = mediaSelector
      ? destinationDocument.querySelector(mediaSelector)
      : null;
    const sourceFlow = sourceMedia?.closest(".case-flow");

    if (!sourceIntro || !sourceMedia) {
      throw new Error("Destination preview selectors did not resolve");
    }

    const previewPage = document.createElement("div");
    previewPage.className = "next-project-preview-page";
    if (contract.dataset.previewClass) {
      previewPage.classList.add(contract.dataset.previewClass);
    }

    const intro = document.importNode(sourceIntro, true);
    intro.removeAttribute("id");
    intro.classList.remove("next-project-template-source");
    intro.classList.add("next-project-preview-intro");

    const flow = sourceFlow
      ? document.importNode(sourceFlow.cloneNode(false), true)
      : document.createElement("section");
    flow.removeAttribute("id");
    flow.removeAttribute("aria-label");
    flow.classList.add("case-flow");
    flow.classList.add("next-project-preview-flow");

    const media = document.importNode(sourceMedia, true);
    media.removeAttribute("id");
    media.classList.remove("next-project-template-source");
    media.classList.add("next-project-preview-media");

    media.querySelectorAll("img").forEach((image) => {
      image.loading = "eager";
      image.decoding = "async";
      image.fetchPriority = "high";
      image.draggable = false;
    });

    flow.appendChild(media);
    previewPage.append(intro, flow);

    const titleElement = intro.querySelector(".work-project-title");
    const title = titleElement
      ? Array.from(titleElement.childNodes)
          .map((node) => (node.nodeName === "BR" ? " " : node.textContent))
          .join("")
          .trim()
          .replace(/\s+/g, " ")
      : "next project";

    return { previewPage, title };
  }

  async function waitForPreviewImages(container) {
    const images = Array.from(container.querySelectorAll("img"));
    if (!images.length) {
      return;
    }

    const imageLoads = images.map((image) => {
      if (image.complete) {
        return typeof image.decode === "function"
          ? image.decode().catch(() => undefined)
          : Promise.resolve();
      }

      return new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    });

    await Promise.race([
      Promise.all(imageLoads),
      new Promise((resolve) => window.setTimeout(resolve, 3000))
    ]);
  }

  function positionBubble(event) {
    const rect = panel.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const y = event.clientY - rect.top;
    bubble.style.setProperty("--next-cursor-x", `${event.clientX.toFixed(2)}px`);
    bubble.style.setProperty("--next-cursor-y", `${event.clientY.toFixed(2)}px`);
    const scale = getPageScale();
    bubble.style.setProperty("--next-cursor-offset-x", `${(-22 * scale).toFixed(2)}px`);
    bubble.style.setProperty(
      "--next-cursor-offset-y",
      `${(Math.max(-3, Math.min(3, (y / rect.height) * 6 - 3)) * scale).toFixed(2)}px`
    );
  }

  function showBubble(event) {
    ensureBubbleLayer();
    if (event) {
      positionBubble(event);
    }
    bubble.classList.add("is-visible");
    link.classList.add("is-cursor-active");
  }

  function hideBubble() {
    bubble.classList.remove("is-visible");
    link.classList.remove("is-cursor-active");
  }

  function preventTransitionScroll(event) {
    event.preventDefault();
  }

  function preventTransitionKeys(event) {
    if (
      ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(
        event.key
      )
    ) {
      event.preventDefault();
    }
  }

  function lockTransitionInput() {
    window.addEventListener("wheel", preventTransitionScroll, { passive: false });
    window.addEventListener("touchmove", preventTransitionScroll, { passive: false });
    window.addEventListener("keydown", preventTransitionKeys, { passive: false });
  }

  function unlockTransitionInput() {
    window.removeEventListener("wheel", preventTransitionScroll);
    window.removeEventListener("touchmove", preventTransitionScroll);
    window.removeEventListener("keydown", preventTransitionKeys);
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function getRevealHeight(scale) {
    return Math.max(PREVIEW_HEIGHT, window.innerHeight / scale + REVEAL_GUARD);
  }

  function createTransitionOverlay() {
    const rect = panel.getBoundingClientRect();
    const scale = getPageScale();
    const startHeight = rect.height / scale;
    const revealHeight = getRevealHeight(scale);
    const overlay = document.createElement("div");
    const clone = panel.cloneNode(true);

    overlay.className = "next-project-transition-overlay";
    overlay.style.left = `${rect.left}px`;
    overlay.style.top = `${rect.top}px`;
    overlay.style.width = `${DESIGN_WIDTH * scale}px`;
    overlay.style.height = `${revealHeight * scale}px`;

    clone.hidden = false;
    clone.removeAttribute("data-next-project");
    clone.classList.add("is-transition-clone");
    clone.querySelector("[data-next-project-cursor]")?.remove();
    clone.querySelector("[data-next-project-link]")?.removeAttribute("href");
    clone.style.position = "relative";
    clone.style.left = "0";
    clone.style.top = "0";
    clone.style.marginTop = "0";
    clone.style.height = `${startHeight}px`;
    clone.style.transform = `scale(${scale})`;
    clone.style.transformOrigin = "top left";

    overlay.appendChild(clone);
    document.body.appendChild(overlay);

    return { overlay, clone, rect, startHeight, revealHeight };
  }

  async function animateToNextProject() {
    if (!nextProject || isTransitioning) {
      return;
    }

    isTransitioning = true;
    window.trackPortfolioEvent?.("case_next_project_click", {
      from_path: normalizePath(window.location.pathname),
      to_path: nextProject.path
    });
    hideBubble();
    markCurrentEntryForTopRestore();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.location.assign(nextProject.href);
      return;
    }

    lockTransitionInput();
    const { overlay, clone, rect, startHeight, revealHeight } = createTransitionOverlay();
    const eyebrow = overlay.querySelector("[data-next-project-eyebrow]");
    panel.classList.add("is-transition-source-hidden");

    try {
      const lift = overlay.animate(
        [
          { transform: "translate3d(0, 0, 0)" },
          { transform: `translate3d(0, ${-Math.max(0, rect.top)}px, 0)` }
        ],
        {
          duration: TRANSITION_MS,
          easing: TRANSITION_EASING,
          fill: "forwards"
        }
      );

      const eyebrowFade = eyebrow?.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        {
          duration: 360,
          delay: 540,
          easing: "ease-out",
          fill: "forwards"
        }
      );
      const revealMedia = clone.animate(
        [
          { height: `${startHeight}px` },
          { height: `${revealHeight}px` }
        ],
        {
          duration: REVEAL_MS,
          easing: TRANSITION_EASING,
          fill: "forwards"
        }
      );

      await wait(TRANSITION_MS);
      lift.finish?.();
      revealMedia.finish?.();
      clone.style.height = `${revealHeight}px`;
      eyebrowFade?.finish?.();

      window.location.assign(nextProject.href);
    } catch (error) {
      unlockTransitionInput();
      overlay.remove();
      panel.classList.remove("is-transition-source-hidden");
      window.location.assign(nextProject.href);
    }
  }

  async function initNextProject() {
    function syncPageHeightAfterReveal() {
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event("resize"));
        });
      });
    }

    try {
      const indexDocument = await fetchDocument("/");
      const projects = getProjectOrder(indexDocument);
      const resolvedProject = getNextProject(projects);
      if (!resolvedProject) {
        return;
      }

      const destinationDocument = await fetchDocument(resolvedProject.path);
      const { previewPage, title } = copyPreviewStructure(destinationDocument);

      host.replaceChildren(previewPage);
      link.dataset.nextProjectHref = resolvedProject.href;
      link.removeAttribute("href");
      link.setAttribute("role", "link");
      link.tabIndex = 0;
      link.setAttribute("aria-label", `Next project: ${title}`);
      panel.dataset.nextProjectPath = resolvedProject.path;
      nextProject = resolvedProject;

      await waitForPreviewImages(host);
      panel.hidden = false;
      panel.classList.add("is-ready");
      syncPageHeightAfterReveal();
    } catch (error) {
      panel.hidden = false;
      panel.classList.add("is-ready");
      syncPageHeightAfterReveal();
    }
  }

  restoreTopAfterBrowserBack();
  window.addEventListener("pageshow", restoreTopAfterBrowserBack);

  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    link.addEventListener("pointerenter", showBubble);
    link.addEventListener("pointermove", showBubble);
    link.addEventListener("pointerleave", hideBubble);
    link.addEventListener("mouseleave", hideBubble);
    link.addEventListener("blur", hideBubble);
  }

  function handleNextProjectClick(event) {
    if (
      event.defaultPrevented ||
      (event.button != null && event.button !== 0) ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    animateToNextProject();
  }

  panel.addEventListener("click", handleNextProjectClick, { capture: true });
  panel.onclick = handleNextProjectClick;
  link.onclick = handleNextProjectClick;
  panel.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || !["Enter", " "].includes(event.key)) {
      return;
    }

    event.preventDefault();
    animateToNextProject();
  });

  initNextProject();
})();
