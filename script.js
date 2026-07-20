function syncPageScale() {
  const designWidth = 1920;
  const viewportWidth = window.innerWidth;
  const scale = typeof window.PortfolioScale?.sync === "function"
    ? window.PortfolioScale.sync()
    : viewportWidth < designWidth
      ? viewportWidth / designWidth
      : viewportWidth / designWidth;
  return scale;
}

const WORKS_REVEAL_KEY = "parviz:works-reveal";
const WORKS_POSITION_KEY = "parviz:works-position";

const WORKS_LAYOUT = {
  revealTop: 120,
  revealDuration: 520,
  cardHeight: 753,
  leftColumn: 0,
  rightColumn: 945,
  centeredColumn: 472,
  rowStep: 1144,
  stagger: 328,
};

function getDesignVar(name, fallback) {
  const value = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(value) ? value : fallback;
}

function getWorksLayout() {
  return {
    revealTop: getDesignVar("--works-reveal-top", WORKS_LAYOUT.revealTop),
    revealDuration: WORKS_LAYOUT.revealDuration,
    cardHeight: getDesignVar("--works-card-height", WORKS_LAYOUT.cardHeight),
    leftColumn: getDesignVar("--works-left-column", WORKS_LAYOUT.leftColumn),
    rightColumn: getDesignVar("--works-right-column", WORKS_LAYOUT.rightColumn),
    centeredColumn: getDesignVar("--works-centered-column", WORKS_LAYOUT.centeredColumn),
    rowStep: getDesignVar("--works-row-step", WORKS_LAYOUT.rowStep),
    stagger: getDesignVar("--works-stagger", WORKS_LAYOUT.stagger),
  };
}

function getWorksSectionTop() {
  const value = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--viewport-height-design"));
  return Number.isFinite(value) && value > 0 ? value : 1080;
}

function getLoopDistance() {
  const value = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--loop-distance"));
  return Number.isFinite(value) && value > 0 ? value : 5385;
}

function updateMainBackgroundScrollOpacity(offset) {
  const viewportHeight = getWorksSectionTop();
  const loopDistance = getLoopDistance();
  const fadeDistance = viewportHeight * MAIN_BACKGROUND_FADE_COVERAGE;
  const distanceFromFold = Math.min(offset, Math.max(0, loopDistance - offset));
  const opacity = fadeDistance > 0
    ? clamp(1 - distanceFromFold / fadeDistance, 0, 1)
    : 1;

  document.documentElement.style.setProperty("--main-bg-scroll-opacity", opacity.toFixed(4));
  return opacity;
}

function syncLoopOffset(offset) {
  const loopDistance = getLoopDistance();
  const normalized = ((offset % loopDistance) + loopDistance) % loopDistance;
  document.documentElement.style.setProperty("--loop-offset", `${normalized}px`);
  updateMainBackgroundScrollOpacity(normalized);
  return normalized;
}

function layoutWorksGrid() {
  const sections = Array.from(document.querySelectorAll(".works"));
  const sourceCards = Array.from(document.querySelectorAll(".works-source > .project-card"));
  const layout = getWorksLayout();

  if (!sourceCards.length) {
    return;
  }

  const lastIndex = sourceCards.length - 1;
  const isOddCount = sourceCards.length % 2 === 1;
  let worksHeight = 0;

  sections.forEach((section) => {
    const cards = Array.from(section.querySelectorAll(":scope > .project-card"));

    cards.forEach((card, index) => {
      const pairIndex = Math.floor(index / 2);
      const isRightColumn = index % 2 === 1;
      const isCenteredFinalCard = isOddCount && index === lastIndex;
      const left = isCenteredFinalCard
        ? layout.centeredColumn
        : isRightColumn
          ? layout.rightColumn
          : layout.leftColumn;
      const top = pairIndex * layout.rowStep + (isRightColumn ? layout.stagger : 0);

      card.style.left = `${left}px`;
      card.style.top = `${top}px`;
      worksHeight = Math.max(worksHeight, top + layout.cardHeight);
    });

    section.style.height = `${worksHeight}px`;
  });

  const sectionTop = getWorksSectionTop();
  document.documentElement.style.setProperty("--works-height", `${worksHeight}px`);
  document.documentElement.style.setProperty("--works-section-top", `${sectionTop}px`);
  document.documentElement.style.setProperty("--loop-distance", `${sectionTop + worksHeight}px`);
}

function buildLoopedWorks() {
  const track = document.querySelector(".works-track");
  const source = document.querySelector(".works-source");

  if (!track || !source || track.querySelector(".works.is-clone")) {
    return;
  }

  const clone = source.cloneNode(true);
  clone.classList.remove("works-source");
  clone.classList.add("is-clone");
  clone.id = "works-loop-clone";
  clone.setAttribute("aria-hidden", "true");

  clone.querySelectorAll("[id]").forEach((node) => {
    node.removeAttribute("id");
  });

  clone.querySelectorAll("a").forEach((link) => {
    link.setAttribute("tabindex", "-1");
    link.setAttribute("aria-hidden", "true");
  });

  track.appendChild(clone);
  layoutWorksGrid();
}

function initWorksPositionMemory() {
  document.addEventListener("click", (event) => {
    const card = event.target.closest(".works-source > .project-card");
    if (
      !card ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const url = new URL(card.href, window.location.href);
    if (url.origin !== window.location.origin || url.pathname === "/" || url.pathname.startsWith("/bio")) {
      return;
    }

    try {
      sessionStorage.setItem(WORKS_POSITION_KEY, JSON.stringify({
        offset: loopOffset,
        casePath: url.pathname,
        savedAt: Date.now(),
      }));
    } catch (error) {
      // The case still opens normally when storage is unavailable.
    }
  }, { capture: true });
}

function initTiltCards() {
  const cards = Array.from(document.querySelectorAll(".project-card"));
  if (!cards.length) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

  if (prefersReducedMotion || coarsePointer) {
    cards.forEach((card) => {
      card.style.setProperty("--tilt-scale", "1");
      card.style.setProperty("--tilt-rotate-x", "0deg");
      card.style.setProperty("--tilt-rotate-y", "0deg");
      card.style.setProperty("--tilt-translate-x", "0px");
      card.style.setProperty("--tilt-translate-y", "0px");
      card.style.setProperty("--tilt-spotlight-opacity", "0");
    });
    return;
  }

  const hoverLimit = 6;
  const hoverScale = 1.015;
  const hoverLift = 4;
  const pendingMoves = new Map();
  let rafId = 0;

  const resetCard = (card) => {
    card.classList.remove("is-tilting");
    card.style.setProperty("--tilt-scale", "1");
    card.style.setProperty("--tilt-rotate-x", "0deg");
    card.style.setProperty("--tilt-rotate-y", "0deg");
    card.style.setProperty("--tilt-translate-x", "0px");
    card.style.setProperty("--tilt-translate-y", "0px");
    card.style.setProperty("--tilt-spotlight-opacity", "0");
    card.style.setProperty("--tilt-spotlight-x", "50%");
    card.style.setProperty("--tilt-spotlight-y", "50%");
    card.style.zIndex = "";
    pendingMoves.delete(card);
  };

  const applyPendingMoves = () => {
    rafId = 0;

    pendingMoves.forEach((point, card) => {
      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }

      const x = (point.x - rect.left) / rect.width;
      const y = (point.y - rect.top) / rect.height;
      const offsetX = (x - 0.5) * 2;
      const offsetY = (y - 0.5) * 2;
      const rotateY = offsetX * hoverLimit;
      const rotateX = offsetY * -hoverLimit;
      const translateX = offsetX * -hoverLift;
      const translateY = offsetY * -hoverLift;
      const thumb = card.querySelector(".project-thumb");
      const thumbRect = thumb?.getBoundingClientRect();
      const isOverThumb =
        thumbRect &&
        point.x >= thumbRect.left &&
        point.x <= thumbRect.right &&
        point.y >= thumbRect.top &&
        point.y <= thumbRect.bottom;

      card.classList.add("is-tilting");
      card.style.zIndex = "40";
      card.style.setProperty("--tilt-scale", hoverScale.toString());
      card.style.setProperty("--tilt-rotate-x", `${rotateX.toFixed(2)}deg`);
      card.style.setProperty("--tilt-rotate-y", `${rotateY.toFixed(2)}deg`);
      card.style.setProperty("--tilt-translate-x", `${translateX.toFixed(2)}px`);
      card.style.setProperty("--tilt-translate-y", `${translateY.toFixed(2)}px`);

      if (isOverThumb) {
        const thumbX = (point.x - thumbRect.left) / thumbRect.width;
        const thumbY = (point.y - thumbRect.top) / thumbRect.height;
        card.style.setProperty("--tilt-spotlight-x", `${(thumbX * 100).toFixed(2)}%`);
        card.style.setProperty("--tilt-spotlight-y", `${(thumbY * 100).toFixed(2)}%`);
        card.style.setProperty("--tilt-spotlight-opacity", "1");
      } else {
        card.style.setProperty("--tilt-spotlight-opacity", "0");
      }
    });
  };

  const queueMove = (card, event) => {
    pendingMoves.set(card, { x: event.clientX, y: event.clientY });
    if (!rafId) {
      rafId = window.requestAnimationFrame(applyPendingMoves);
    }
  };

  cards.forEach((card) => {
    card.addEventListener("pointerenter", (event) => {
      card.classList.add("is-tilting");
      queueMove(card, event);
    });

    card.addEventListener("pointermove", (event) => {
      queueMove(card, event);
    });

    card.addEventListener("pointerleave", () => {
      resetCard(card);
    });
  });
}

function handleWheel(event) {
  if (currentRoute !== ROUTE_MAIN || routeTransitioning || loopResetting) {
    return;
  }

  event.preventDefault();
  const delta = event.deltaY || event.deltaX || 0;
  loopOffset = syncLoopOffset(loopOffset + delta * 1.05);
}

function initWorksTouchScroll() {
  const shell = document.querySelector(".page-shell");
  if (!shell) {
    return;
  }

  let activePointerId = null;
  let lastY = 0;
  let lastX = 0;

  shell.addEventListener("pointerdown", (event) => {
    if (currentRoute !== ROUTE_MAIN || routeTransitioning || loopResetting || event.pointerType === "mouse") {
      return;
    }

    activePointerId = event.pointerId;
    lastY = event.clientY;
    lastX = event.clientX;
    shell.setPointerCapture?.(event.pointerId);
  });

  shell.addEventListener("pointermove", (event) => {
    if (activePointerId !== event.pointerId || currentRoute !== ROUTE_MAIN || routeTransitioning || loopResetting) {
      return;
    }

    event.preventDefault();
    const deltaY = lastY - event.clientY;
    const deltaX = lastX - event.clientX;
    const dominantDelta = Math.abs(deltaY) >= Math.abs(deltaX) ? deltaY : deltaX;
    loopOffset = syncLoopOffset(loopOffset + dominantDelta * 1.05);
    lastY = event.clientY;
    lastX = event.clientX;
  }, { passive: false });

  const endTouchScroll = (event) => {
    if (activePointerId !== event.pointerId) {
      return;
    }
    activePointerId = null;
    shell.releasePointerCapture?.(event.pointerId);
  };

  shell.addEventListener("pointerup", endTouchScroll);
  shell.addEventListener("pointercancel", endTouchScroll);
}

function easeInOutCustom(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function smoothScrollToTop(duration = 1000) {
  const start = window.scrollY || document.documentElement.scrollTop || 0;
  if (!start || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo(0, 0);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    const startTime = performance.now();

    function step(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = easeInOutCustom(progress);
      window.scrollTo(0, Math.round(start * (1 - eased)));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        window.scrollTo(0, 0);
        root.style.scrollBehavior = previousScrollBehavior;
        resolve();
      }
    }

    window.requestAnimationFrame(step);
  });
}

function initBioScrollControls() {
  const controls = Array.from(document.querySelectorAll("[data-scroll-top]"));

  controls.forEach((control) => {
    control.addEventListener("click", (event) => {
      event.preventDefault();
      smoothScrollToTop(1000);
    });
  });
}

function initMainBackgroundVideoFallback() {
  const root = document.documentElement;
  const video = document.querySelector(".main-shell-background video");

  if (!video) {
    root.classList.add("has-main-bg-video-fallback");
    return;
  }

  let fallbackApplied = false;
  let autoplayCheckId = 0;

  const applyFallback = () => {
    if (fallbackApplied) {
      return;
    }

    fallbackApplied = true;
    window.clearTimeout(autoplayCheckId);
    root.classList.add("has-main-bg-video-fallback");
    window.setTimeout(() => {
      video.pause();
      video.removeAttribute("src");
      video.querySelectorAll("source").forEach((source) => source.removeAttribute("src"));
      video.load();
    }, 260);
  };

  const verifyAutoplay = () => {
    window.clearTimeout(autoplayCheckId);
    autoplayCheckId = window.setTimeout(() => {
      if (!fallbackApplied && video.paused && video.currentTime < 0.05) {
        applyFallback();
      }
    }, 1400);
  };

  video.addEventListener("error", applyFallback);
  video.addEventListener("playing", () => {
    window.clearTimeout(autoplayCheckId);
  });

  const playAttempt = video.play();
  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt
      .then(() => {
        window.clearTimeout(autoplayCheckId);
      })
      .catch(applyFallback);
  }

  verifyAutoplay();
}

const ROUTE_MAIN = "main";
const ROUTE_BIO = "bio";
const ROUTE_TRANSITION_MS = 520;
const MAIN_BACKGROUND_FADE_COVERAGE = 0.8;
const MAIN_BACKGROUND_ROUTE_FADE_MS = 500;
const MAIN_TO_BIO_LOOP_RESET_MS = 500;
const BIO_TO_MAIN_SCROLL_TOP_MS = 750;
const LOOP_TOP_TOLERANCE = 1;
const BIO_ENTRY_TRANSITION_KEY = "parviz:bio-entry-transition";
const BIO_ENTRY_TRANSITION_PARAM = "bioEntry";
const SHARED_TRANSITION_SELECTORS = [
  ".intro-mark",
  ".bio-intro-mark",
  ".route-main .back-home",
  ".route-bio-header .bio-back-home",
  ".route-main .hero-title",
  ".route-bio .bio-hero-title",
  ".route-main .hero-copy",
  ".route-bio .bio-hero-copy",
];
let currentRoute = getRouteFromPath(window.location.pathname);
let routeTransitioning = false;
let bioWorksNavigating = false;
let loopResetting = false;
let loopResetRafId = 0;

function consumeBioEntryTransitionIntent() {
  if (currentRoute !== ROUTE_BIO) {
    document.documentElement.classList.remove("has-pending-bio-entry");
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const entryParam = searchParams.get(BIO_ENTRY_TRANSITION_PARAM);
  if (entryParam) {
    searchParams.delete(BIO_ENTRY_TRANSITION_PARAM);
    const nextSearch = searchParams.toString();
    const cleanUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
    history.replaceState({ route: ROUTE_BIO }, "", cleanUrl);
    return {
      from: entryParam,
      to: ROUTE_BIO,
      startedAt: Date.now()
    };
  }

  try {
    const rawIntent = sessionStorage.getItem(BIO_ENTRY_TRANSITION_KEY);
    sessionStorage.removeItem(BIO_ENTRY_TRANSITION_KEY);

    if (!rawIntent) {
      document.documentElement.classList.remove("has-pending-bio-entry");
      return null;
    }

    const intent = JSON.parse(rawIntent);
    if (intent?.to !== ROUTE_BIO || !intent.from || Date.now() - Number(intent.startedAt || 0) > 5000) {
      document.documentElement.classList.remove("has-pending-bio-entry");
      return null;
    }

    return intent;
  } catch (error) {
    document.documentElement.classList.remove("has-pending-bio-entry");
    return null;
  }
}

function consumeWorksRevealIntent() {
  try {
    const rawIntent = sessionStorage.getItem(WORKS_REVEAL_KEY);
    sessionStorage.removeItem(WORKS_REVEAL_KEY);
    if (!rawIntent) {
      return false;
    }

    const intent = JSON.parse(rawIntent);
    return intent?.to === "works" && Date.now() - Number(intent.startedAt || 0) < 5000
      ? intent
      : null;
  } catch (error) {
    return null;
  }
}

function consumeSavedWorksPosition() {
  try {
    const rawPosition = sessionStorage.getItem(WORKS_POSITION_KEY);
    sessionStorage.removeItem(WORKS_POSITION_KEY);
    if (!rawPosition) {
      return null;
    }

    const position = JSON.parse(rawPosition);
    const offset = Number(position?.offset);
    return Number.isFinite(offset) ? offset : null;
  } catch (error) {
    return null;
  }
}

function getRouteFromPath(pathname) {
  return pathname.startsWith("/bio") ? ROUTE_BIO : ROUTE_MAIN;
}

function getRoutePath(route) {
  return route === ROUTE_BIO ? "/bio" : "/";
}

function isMainLoopAtTop() {
  const loopDistance = getLoopDistance();
  return loopOffset <= LOOP_TOP_TOLERANCE || Math.abs(loopOffset - loopDistance) <= LOOP_TOP_TOLERANCE;
}

function animateMainLoopToTop(duration = MAIN_TO_BIO_LOOP_RESET_MS) {
  if (currentRoute !== ROUTE_MAIN || isMainLoopAtTop() || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    loopOffset = syncLoopOffset(0);
    return Promise.resolve();
  }

  if (loopResetRafId) {
    window.cancelAnimationFrame(loopResetRafId);
    loopResetRafId = 0;
  }

  loopResetting = true;
  const loopDistance = getLoopDistance();
  const startOffset = loopOffset;
  const targetOffset = startOffset > (loopDistance / 2) ? loopDistance : 0;
  const startTime = performance.now();

  return new Promise((resolve) => {
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = easeInOutCustom(progress);
      loopOffset = syncLoopOffset(lerp(startOffset, targetOffset, eased));

      if (progress < 1) {
        loopResetRafId = window.requestAnimationFrame(step);
        return;
      }

      loopOffset = syncLoopOffset(0);
      loopResetting = false;
      loopResetRafId = 0;
      resolve();
    };

    loopResetRafId = window.requestAnimationFrame(step);
  });
}

function getNearestLoopTarget(targetOffset) {
  const loopDistance = getLoopDistance();
  const candidates = [targetOffset - loopDistance, targetOffset, targetOffset + loopDistance];
  return candidates.reduce((nearest, candidate) => (
    Math.abs(candidate - loopOffset) < Math.abs(nearest - loopOffset) ? candidate : nearest
  ), targetOffset);
}

function animateMainLoopToWorks(duration = WORKS_LAYOUT.revealDuration) {
  window.scrollTo(0, 0);
  const targetOffset = getWorksSectionTop() - WORKS_LAYOUT.revealTop;

  if (currentRoute !== ROUTE_MAIN || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    loopOffset = syncLoopOffset(targetOffset);
    return Promise.resolve();
  }

  if (loopResetRafId) {
    window.cancelAnimationFrame(loopResetRafId);
    loopResetRafId = 0;
  }

  loopResetting = true;
  const startOffset = loopOffset;
  const target = getNearestLoopTarget(targetOffset);
  const startTime = performance.now();

  return new Promise((resolve) => {
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = easeInOutCustom(progress);
      loopOffset = syncLoopOffset(lerp(startOffset, target, eased));

      if (progress < 1) {
        loopResetRafId = window.requestAnimationFrame(step);
        return;
      }

      loopOffset = syncLoopOffset(targetOffset);
      loopResetting = false;
      loopResetRafId = 0;
      resolve();
    };

    loopResetRafId = window.requestAnimationFrame(step);
  });
}

function updateRouteClasses(route) {
  const isBio = route === ROUTE_BIO;
  document.documentElement.dataset.route = route;
  document.documentElement.classList.toggle("route-bio", isBio);
  document.documentElement.classList.toggle("route-main", !isBio);
  document.body.dataset.route = route;
  document.body.classList.toggle("bio-body", isBio);
  document.body.classList.toggle("main-body", !isBio);

  if (!document.documentElement.classList.contains("is-route-transitioning")) {
    document.documentElement.style.setProperty("--main-bg-route-opacity", isBio ? "0" : "1");
  }

  const mainPanel = document.querySelector('.route-panel[data-route-panel="main"]');
  const bioPanel = document.querySelector('.route-panel[data-route-panel="bio"]');

  if (mainPanel) {
    mainPanel.setAttribute("aria-hidden", String(isBio));
    mainPanel.toggleAttribute("inert", isBio);
  }

  if (bioPanel) {
    bioPanel.setAttribute("aria-hidden", String(!isBio));
    bioPanel.toggleAttribute("inert", !isBio);
  }

  document.body.classList.remove("is-page-entering");

  syncPageScale();
  window.scrollTo(0, 0);
  currentRoute = route;
  requestBioScrollSync();
}

function syncRouteBackgroundOpacity(route = currentRoute) {
  document.documentElement.style.setProperty("--main-bg-route-opacity", route === ROUTE_BIO ? "0" : "1");
}

function applyRoute(route, options = {}) {
  const { pushHistory = false, replaceHistory = false } = options;
  const nextPath = getRoutePath(route);

  if (pushHistory) {
    if (replaceHistory) {
      history.replaceState({ route }, "", nextPath);
    } else {
      history.pushState({ route }, "", nextPath);
    }
  }

  updateRouteClasses(route);
  return Promise.resolve();
}

function getRoutePanel(route) {
  return document.querySelector(`.route-panel[data-route-panel="${route}"]`);
}

function resetRoutePanelStyles(panel) {
  if (!panel) {
    return;
  }

  panel.style.removeProperty("opacity");
  panel.style.removeProperty("transform");
  panel.style.removeProperty("transition");
  panel.style.removeProperty("pointer-events");
  panel.style.removeProperty("z-index");
  panel.style.removeProperty("will-change");
}

function getPageScaleValue() {
  return Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--page-scale")) || 1;
}

function getVisualStyle(element) {
  const style = getComputedStyle(element);
  const scale = getPageScaleValue();
  const lineHeight = Number.parseFloat(style.lineHeight);

  return {
    color: style.color,
    fontFamily: style.fontFamily,
    fontSize: Number.parseFloat(style.fontSize) * scale,
    fontStyle: style.fontStyle,
    fontWeight: style.fontWeight,
    letterSpacing: Number.parseFloat(style.letterSpacing) * scale || 0,
    lineHeight: Number.isFinite(lineHeight) ? lineHeight * scale : Number.parseFloat(style.fontSize) * 1.2 * scale,
    textTransform: style.textTransform,
    textAlign: style.textAlign,
    textShadow: style.textShadow,
    whiteSpace: style.whiteSpace,
    background: style.background,
    backgroundClip: style.backgroundClip,
    webkitBackgroundClip: style.webkitBackgroundClip,
  };
}

function parseRgb(color) {
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) {
    return [255, 255, 255, 1];
  }

  const channels = match[1].split(",").map((value) => Number.parseFloat(value.trim()));
  return [channels[0] || 0, channels[1] || 0, channels[2] || 0, channels[3] ?? 1];
}

function mixColor(fromColor, toColor, progress) {
  const from = parseRgb(fromColor);
  const to = parseRgb(toColor);
  const mixed = from.map((channel, index) => channel + (to[index] - channel) * progress);
  return `rgba(${mixed[0]}, ${mixed[1]}, ${mixed[2]}, ${mixed[3]})`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(from, to, progress) {
  return from + (to - from) * progress;
}

let bioScrollLines = [];
let bioRevealGroups = [];
let bioLogoGroup = null;
let bioLogoItems = [];
let bioLogoPrerequisiteGroup = null;
let bioLogoRevealStartedAt = 0;
let bioLogoRevealCompleted = false;
let bioScrollRafId = 0;
let bioScrollListening = false;
const BIO_LOGO_FADE_MS = 500;
const BIO_LOGO_OVERLAP_MS = 400;
const BIO_LOGOS_PER_ROW = 6;
const BIO_LOGO_SEQUENCE_START_MS = 240;
const BIO_SKILLS_SPEED_MULTIPLIER = 0.6;
const BIO_TEXT_SPEED_MULTIPLIER = 2;
const BIO_ENDING_SEQUENCE_WAIT_MS = 240;

function createBioLineMarkup(group) {
  const blockSelector = ".bio-text p, .bio-skills p, .bio-quote-kicker, .bio-quote blockquote";
  const blocks = group.matches("p, blockquote") ? [group] : Array.from(group.querySelectorAll(blockSelector));

  blocks.forEach((block) => {
    if (block.dataset.bioLinesBuilt === "true") {
      return;
    }

    const fragment = document.createDocumentFragment();
    const nodes = Array.from(block.childNodes);
    let currentLine = [];
    let currentLineText = "";

    const flushLine = () => {
      if (!currentLine.length) {
        return;
      }

      const line = document.createElement("span");
      line.className = "bio-line";
      line.dataset.fullText = currentLineText.trim();

      currentLine.forEach((node) => {
        line.appendChild(node);
      });

      fragment.appendChild(line);
      currentLine = [];
      currentLineText = "";
    };

    nodes.forEach((node) => {
      if (node.nodeName === "BR") {
        flushLine();
        return;
      }

      const clone = node.cloneNode(true);
      currentLine.push(clone);
      currentLineText += clone.textContent || "";
    });

    flushLine();
    block.replaceChildren(fragment);
    block.dataset.bioLinesBuilt = "true";
  });
}

function buildBioScrollLines() {
  const groups = Array.from(document.querySelectorAll("[data-bio-reveal-group]"));
  groups.forEach(createBioLineMarkup);
  bioScrollLines = Array.from(document.querySelectorAll("[data-bio-reveal-group] .bio-line"));
  bioRevealGroups = groups
    .map((group) => ({
      element: group,
      sequence: Number.parseInt(group.dataset.bioRevealSequence || "0", 10),
      isSkillsGroup: group.classList.contains("bio-skills"),
      colorMode: group.dataset.bioRevealColor || "dynamic",
      fullWhitePointRatio: group.classList.contains("bio-skills") ? 0.75 : 0.6,
      progressAnchor: group.classList.contains("bio-skills") ? "last-line" : "group",
      startAfterPreviousFullWhite: group.classList.contains("bio-skills"),
      lines: Array.from(group.querySelectorAll(".bio-line")),
      loaded: false,
      allLinesRevealed: false,
      revealStartedAt: 0,
      revealCompleted: false,
      whiteCompleted: false,
    }))
    .filter((group) => group.lines.length)
    .sort((a, b) => a.sequence - b.sequence);

  bioLogoGroup = document.querySelector("[data-bio-logo-group]");
  bioLogoItems = Array.from(document.querySelectorAll("[data-bio-logo-item]"));
  bioLogoPrerequisiteGroup = bioRevealGroups.find((group) => group.sequence === 6) || null;
  bioLogoRevealStartedAt = bioLogoGroup?.classList.contains("is-revealed") ? performance.now() - getBioLogoRevealDuration() : 0;
  bioLogoRevealCompleted = bioLogoGroup?.classList.contains("is-revealed") || false;
  bioLogoItems.forEach((logo, index) => {
    const step = BIO_LOGO_FADE_MS - BIO_LOGO_OVERLAP_MS;
    const delay = BIO_LOGO_SEQUENCE_START_MS + (index * step);
    logo.style.transitionDelay = `${delay}ms`;
  });
}

function setDynamicLineProgress(line, progress) {
  line.style.setProperty("--bio-line-progress", `${(clamp(progress, 0, 1) * 100).toFixed(2)}%`);
}

function setLineRevealProgress(line, progress) {
  line.style.setProperty("--bio-line-reveal", `${clamp(progress, 0, 1).toFixed(3)}`);
}

function getSequentialGroupProgress(groupMidpoint, viewportHeight, lineCount, fullWhitePointRatio) {
  const startPoint = viewportHeight;
  const fullWhitePoint = viewportHeight * fullWhitePointRatio;
  const normalized = clamp((startPoint - groupMidpoint) / (startPoint - fullWhitePoint), 0, 1);
  return normalized * lineCount;
}

function getAnchoredGroupProgress(groupMidpoint, viewportHeight, lineCount, startPoint, endPoint) {
  if (startPoint <= endPoint) {
    return getSequentialGroupProgress(groupMidpoint, viewportHeight, lineCount, endPoint / viewportHeight);
  }

  const normalized = clamp((startPoint - groupMidpoint) / (startPoint - endPoint), 0, 1);
  return normalized * lineCount;
}

function applyRevealTiming(line, mode, lineIndex, speedMultiplier = 1) {
  let delay = 0;
  let transformDuration = 720;
  let opacityDuration = 560;

  if (mode === "normal") {
    delay = lineIndex * 70;
  } else if (mode === "fast") {
    transformDuration = 280;
    opacityDuration = 220;
  } else if (mode === "instant") {
    transformDuration = 0;
    opacityDuration = 0;
  }

  if (mode !== "instant") {
    delay *= speedMultiplier;
    transformDuration *= speedMultiplier;
    opacityDuration *= speedMultiplier;
  }

  line.style.transitionDelay = `${Math.round(delay)}ms`;
  line.style.transition =
    `transform ${Math.round(transformDuration)}ms cubic-bezier(0.22, 1, 0.36, 1) ${Math.round(delay)}ms, ` +
    `opacity ${Math.round(opacityDuration)}ms cubic-bezier(0.22, 1, 0.36, 1) ${Math.round(delay)}ms`;
  line.dataset.revealDelay = `${Math.round(delay)}`;
}

function revealLine(line, mode, lineIndex = 0, speedMultiplier = 1) {
  if (line.dataset.revealed === "true") {
    return false;
  }

  line.dataset.revealed = "true";
  applyRevealTiming(line, mode, lineIndex, speedMultiplier);
  setLineRevealProgress(line, 1);
  return true;
}

function revealGroup(group, now, mode, speedMultiplier = 1) {
  if (group.loaded) {
    return;
  }

  group.loaded = true;
  group.revealStartedAt = mode === "instant" ? now - 1000 : now;
  group.revealCompleted = mode === "instant";

  group.lines.forEach((line, lineIndex) => {
    revealLine(line, mode, lineIndex, speedMultiplier);
  });
}

function revealBioLogos(mode = "normal") {
  if (!bioLogoGroup) {
    return;
  }

  const now = performance.now();
  const wasRevealed = bioLogoGroup.classList.contains("is-revealed");

  bioLogoGroup.classList.add("is-revealed");
  bioLogoItems.forEach((logo) => {
    logo.classList.add("is-logo-revealed");
    logo.style.transitionDuration = mode === "instant" ? "0ms" : `${BIO_LOGO_FADE_MS}ms`;
  });

  if (!wasRevealed) {
    bioLogoRevealStartedAt = mode === "instant" ? now - getBioLogoRevealDuration() : now;
  }

  if (mode === "instant") {
    bioLogoRevealCompleted = true;
  }
}

function getBioLogoRevealDuration() {
  if (!bioLogoItems.length) {
    return 0;
  }

  const step = BIO_LOGO_FADE_MS - BIO_LOGO_OVERLAP_MS;
  const lastLogoDelay = BIO_LOGO_SEQUENCE_START_MS + ((bioLogoItems.length - 1) * step);
  return Math.max(BIO_ENDING_SEQUENCE_WAIT_MS, lastLogoDelay + (BIO_LOGO_FADE_MS / 3));
}

function updateBioLogoRevealState(now, viewportHeight) {
  if (!bioLogoGroup) {
    bioLogoRevealCompleted = true;
    return;
  }

  const logoRect = bioLogoGroup.getBoundingClientRect();
  const logoIsAboveViewport = logoRect.bottom <= 0;
  const logoIsInViewport = logoRect.top < viewportHeight && logoRect.bottom > 0;

  if (logoIsAboveViewport) {
    revealBioLogos("instant");
  } else if (logoIsInViewport && !bioLogoGroup.classList.contains("is-revealed")) {
    revealBioLogos("normal");
  }

  if (bioLogoRevealStartedAt && !bioLogoRevealCompleted) {
    bioLogoRevealCompleted = now >= bioLogoRevealStartedAt + getBioLogoRevealDuration();
  }
}

function syncBioScrollLines() {
  bioScrollRafId = 0;

  if (currentRoute !== ROUTE_BIO || !bioScrollLines.length) {
    return;
  }

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const now = performance.now();
  let revealStatePending = false;

  bioRevealGroups.forEach((group, groupIndex) => {
    if (group.sequence >= 7) {
      updateBioLogoRevealState(now, viewportHeight);

      if (!bioLogoRevealCompleted) {
        return;
      }
    }

    const triggerLines = group.lines.slice(0, Math.min(3, group.lines.length));
    const triggerVisible = triggerLines.every((line) => {
      const rect = line.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= viewportHeight;
    });
    const groupRect = group.element.getBoundingClientRect();
    const groupMidpoint = groupRect.top + groupRect.height * 0.5;
    const lastLine = group.lines[group.lines.length - 1];
    const lastLineRect = lastLine?.getBoundingClientRect();
    const progressAnchorMidpoint = group.progressAnchor === "last-line" && lastLineRect
      ? lastLineRect.top + lastLineRect.height * 0.5
      : groupMidpoint;
    const previousGroup = bioRevealGroups[groupIndex - 1];
    const isAboveViewport = groupRect.bottom <= 0;
    const isInViewport = groupRect.top < viewportHeight && groupRect.bottom > 0;
    const isDeepInViewport = groupMidpoint <= viewportHeight * 0.6;
    const paragraphReady = groupRect.top <= viewportHeight - 0;
    const revealAreaReady = group.sequence >= 7 ? isInViewport : paragraphReady;

    if (group.isSkillsGroup) {
      let anyLineRevealed = false;

      if (isAboveViewport) {
        group.lines.forEach((line, lineIndex) => {
          anyLineRevealed = revealLine(line, "instant", lineIndex, BIO_SKILLS_SPEED_MULTIPLIER) || anyLineRevealed;
        });
      } else {
        group.lines.forEach((line, lineIndex) => {
          const lineRect = line.getBoundingClientRect();
          const lineMidpoint = lineRect.top + lineRect.height * 0.5;
          const lineAboveViewport = lineRect.bottom <= 0;
          const lineReady = lineRect.top <= viewportHeight - 0;
          const lineDeepInViewport = lineMidpoint <= viewportHeight * 0.6;

          if (lineAboveViewport) {
            anyLineRevealed = revealLine(line, "instant", lineIndex, BIO_SKILLS_SPEED_MULTIPLIER) || anyLineRevealed;
          } else if (lineReady) {
            anyLineRevealed = revealLine(
              line,
              lineDeepInViewport ? "fast" : "normal",
              lineIndex,
              BIO_SKILLS_SPEED_MULTIPLIER
            ) || anyLineRevealed;
          }
        });
      }

      if (anyLineRevealed && !group.loaded) {
        group.loaded = true;
        group.revealStartedAt = now;
      }

      group.allLinesRevealed = group.lines.every((line) => line.dataset.revealed === "true");
    } else if (!group.loaded) {
      const waitingForPreviousText = group.sequence >= 8 && previousGroup && !previousGroup.revealCompleted;

      if (waitingForPreviousText && !isAboveViewport) {
        return;
      }

      if (isAboveViewport) {
        revealGroup(group, now, "instant", BIO_TEXT_SPEED_MULTIPLIER);
      } else if (isInViewport && revealAreaReady) {
        const revealMode = group.colorMode === "static" ? "normal" : isDeepInViewport ? "fast" : "normal";
        revealGroup(group, now, revealMode, BIO_TEXT_SPEED_MULTIPLIER);
      } else if (isInViewport && isDeepInViewport) {
        const revealMode = group.colorMode === "static" ? "normal" : "fast";
        revealGroup(group, now, revealMode, BIO_TEXT_SPEED_MULTIPLIER);
      }
    }

    if (group.revealStartedAt) {
      const maxDelay = group.lines.reduce((value, line) => Math.max(value, Number.parseFloat(line.dataset.revealDelay || "0")), 0);
      const sequenceCompletionMs = group.sequence >= 7 ? BIO_ENDING_SEQUENCE_WAIT_MS : 720;
      group.revealCompleted = now >= group.revealStartedAt + sequenceCompletionMs + maxDelay;
      revealStatePending = revealStatePending || !group.revealCompleted;
    }

    let groupProgress = 0;

    if (group.loaded) {
      const waitsForPreviousWhite = previousGroup && previousGroup.colorMode === "dynamic" && group.colorMode === "dynamic";

      if (waitsForPreviousWhite && !previousGroup.whiteCompleted && !isAboveViewport) {
        groupProgress = 0;
      } else if ((waitsForPreviousWhite || group.startAfterPreviousFullWhite) && previousGroup) {
        const previousRect = previousGroup.element.getBoundingClientRect();
        const previousMidpoint = previousRect.top + previousRect.height * 0.5;
        const startPoint = viewportHeight * previousGroup.fullWhitePointRatio + (progressAnchorMidpoint - previousMidpoint);
        const endPoint = viewportHeight * group.fullWhitePointRatio;
        groupProgress = getAnchoredGroupProgress(progressAnchorMidpoint, viewportHeight, group.lines.length, startPoint, endPoint);
      } else {
        groupProgress = getSequentialGroupProgress(progressAnchorMidpoint, viewportHeight, group.lines.length, group.fullWhitePointRatio);
      }

      if (isAboveViewport) {
        groupProgress = group.lines.length;
      } else if (group.isSkillsGroup && lastLineRect?.bottom <= viewportHeight * group.fullWhitePointRatio) {
        groupProgress = group.lines.length;
      } else if (!waitsForPreviousWhite && !group.isSkillsGroup && groupMidpoint <= viewportHeight * group.fullWhitePointRatio) {
        groupProgress = group.lines.length;
      }
    }

    group.whiteCompleted = group.colorMode !== "dynamic" || groupProgress >= group.lines.length;

    group.lines.forEach((line, lineIndex) => {
      if (group.colorMode !== "dynamic") {
        return;
      }

      const progress = clamp(groupProgress - lineIndex, 0, 1);

      setDynamicLineProgress(line, progress);
    });
  });

  updateBioLogoRevealState(now, viewportHeight);

  if ((bioLogoRevealStartedAt && !bioLogoRevealCompleted) || revealStatePending) {
    requestBioScrollSync();
  }
}

function requestBioScrollSync() {
  if (bioScrollRafId) {
    return;
  }

  bioScrollRafId = window.requestAnimationFrame(syncBioScrollLines);
}

function initBioScrollText() {
  buildBioScrollLines();

  if (!bioScrollLines.length || bioScrollListening) {
    requestBioScrollSync();
    return;
  }

  const handleScroll = () => {
    requestBioScrollSync();
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", handleScroll);
  bioScrollListening = true;
  requestBioScrollSync();
}

function setGhostFrame(ghost, from, to, eased) {
  const scale = getPageScaleValue();
  const left = lerp(from.rect.left, to.rect.left, eased);
  const top = lerp(from.rect.top, to.rect.top, eased);
  const lockedMinWidth = Number.parseFloat(ghost.dataset.lockedMinWidth || "0");
  const width = Math.max(lerp(from.rect.width, to.rect.width, eased), lockedMinWidth);
  const height = lerp(from.rect.height, to.rect.height, eased);
  const fontSize = lerp(from.style.fontSize, to.style.fontSize, eased);
  const lineHeight = lerp(from.style.lineHeight, to.style.lineHeight, eased);
  const letterSpacing = lerp(from.style.letterSpacing, to.style.letterSpacing, eased);
  const fontWeight = lerp(Number.parseFloat(from.style.fontWeight) || 400, Number.parseFloat(to.style.fontWeight) || 400, eased);
  const opacity = lerp(from.opacity, to.opacity, eased);

  ghost.style.left = "0";
  ghost.style.top = "0";
  ghost.style.width = `${width / scale}px`;
  ghost.style.height = `${height / scale}px`;
  ghost.style.transform = `translate3d(${left / scale}px, ${top / scale}px, 0)`;
  ghost.style.fontSize = `${fontSize / scale}px`;
  ghost.style.lineHeight = `${lineHeight / scale}px`;
  ghost.style.letterSpacing = `${letterSpacing / scale}px`;
  ghost.style.fontWeight = `${fontWeight}`;
  ghost.style.color = mixColor(from.style.color, to.style.color, eased);
  ghost.style.textAlign = to.style.textAlign;
  ghost.style.textShadow = to.style.textShadow;
  ghost.style.whiteSpace = to.style.whiteSpace;
  ghost.style.background = to.style.background;
  ghost.style.backgroundClip = to.style.backgroundClip;
  ghost.style.webkitBackgroundClip = to.style.webkitBackgroundClip;
  ghost.style.opacity = String(opacity);
}

function createTransitionLayer() {
  const layer = document.createElement("div");
  layer.className = "page-transition-layer";
  const shell = document.createElement("div");
  shell.className = "page-transition-shell";
  layer.appendChild(shell);
  document.body.appendChild(layer);
  return { layer, shell };
}

function getTransitionEndpoints(fromRoute, toRoute) {
  const heyFrom = fromRoute === ROUTE_MAIN ? ".intro-mark" : ".bio-intro-mark";
  const heyTo = toRoute === ROUTE_MAIN ? ".intro-mark" : ".bio-intro-mark";
  const backFrom = fromRoute === ROUTE_MAIN ? ".route-main .back-home" : ".route-bio-header .bio-back-home";
  const backTo = toRoute === ROUTE_MAIN ? ".route-main .back-home" : ".route-bio-header .bio-back-home";
  const titleFrom = fromRoute === ROUTE_MAIN ? ".route-main .hero-title" : ".route-bio .bio-hero-title";
  const titleTo = toRoute === ROUTE_MAIN ? ".route-main .hero-title" : ".route-bio .bio-hero-title";
  const copyFrom = fromRoute === ROUTE_MAIN ? ".route-main .hero-copy" : ".route-bio .bio-hero-copy";
  const copyTo = toRoute === ROUTE_MAIN ? ".route-main .hero-copy" : ".route-bio .bio-hero-copy";

  return [
    {
      className: "transition-hey",
      fromSelector: heyFrom,
      toSelector: heyTo,
      text: "Hey! I am Parviz",
      fromOpacity: 1,
      toOpacity: 1,
    },
    {
      className: "transition-back",
      fromSelector: backFrom,
      toSelector: backTo,
      text: "BACK TO HOMEPAGE",
      fromOpacity: fromRoute === ROUTE_BIO ? 1 : 0,
      toOpacity: toRoute === ROUTE_BIO ? 1 : 0,
    },
    {
      className: "transition-title",
      fromSelector: titleFrom,
      toSelector: titleTo,
      fromOpacity: 1,
      toOpacity: 1,
    },
    {
      className: "transition-copy",
      fromSelector: copyFrom,
      toSelector: copyTo,
      fromOpacity: 1,
      toOpacity: 1,
    },
  ];
}

function captureTransitionState(selector, opacity) {
  const element = document.querySelector(selector);
  if (!element) {
    return null;
  }

  return {
    rect: element.getBoundingClientRect(),
    style: getVisualStyle(element),
    opacity,
    element,
  };
}

function createSharedRouteTransition(fromRoute, toRoute) {
  const specs = getTransitionEndpoints(fromRoute, toRoute)
    .map((spec) => ({
      ...spec,
      from: captureTransitionState(spec.fromSelector, spec.fromOpacity),
    }))
    .filter((spec) => spec.from);

  if (!specs.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return null;
  }

  const hiddenElements = SHARED_TRANSITION_SELECTORS
    .map((selector) => document.querySelector(selector))
    .filter(Boolean);

  return {
    prepare() {
      // Keep the real shared elements visible until their fixed-position clones exist.
      // Hiding here can create an empty frame after pre-scrolls, especially bio -> main.
    },

    play() {
      const { layer, shell } = createTransitionLayer();
      const ghosts = specs
        .map((spec) => {
          let to = captureTransitionState(spec.toSelector, spec.toOpacity);
          const sourceElement = document.querySelector(spec.fromSelector);
          const targetElement = document.querySelector(spec.toSelector);
          const cloneSource = spec.toOpacity > 0 ? targetElement : sourceElement;

          if (!to || !cloneSource) {
            return null;
          }

          let from = spec.from;

          const ghost = cloneSource.cloneNode(true);
          ghost.classList.add("transition-ghost", spec.className);
          ghost.classList.remove("is-shared-transition-hidden");
          ghost.removeAttribute("id");
          ghost.setAttribute("aria-hidden", "true");
          ghost.style.position = "absolute";
          ghost.style.margin = "0";
          ghost.style.pointerEvents = "none";
          ghost.style.transition = "none";
          ghost.style.transformOrigin = "top left";
          ghost.style.fontFamily = spec.from.style.fontFamily;
          ghost.style.fontStyle = spec.from.style.fontStyle;
          ghost.style.fontWeight = spec.from.style.fontWeight;
          ghost.style.textTransform = spec.from.style.textTransform;

          if (spec.text) {
            ghost.textContent = spec.text;
          }

          if (spec.className === "transition-back") {
            const lockedMinWidth = Math.max(spec.from.rect.width, to.rect.width);
            ghost.dataset.lockedMinWidth = String(lockedMinWidth);

            const yTravel = Math.max(to.rect.height, 40);

            if (spec.fromOpacity === 0 && spec.toOpacity > 0) {
              from = {
                ...spec.from,
                rect: {
                  ...spec.from.rect,
                  left: to.rect.left,
                  top: to.rect.top - yTravel,
                  width: lockedMinWidth,
                  height: to.rect.height,
                },
              };
            }

            if (spec.fromOpacity > 0 && spec.toOpacity === 0) {
              to = {
                ...to,
                rect: {
                  ...to.rect,
                  left: from.rect.left,
                  top: from.rect.top - yTravel,
                  width: lockedMinWidth,
                  height: from.rect.height,
                },
              };
            }
          }

          setGhostFrame(ghost, from, to, 0);
          shell.appendChild(ghost);

          return { ghost, from, to };
        })
        .filter(Boolean);

      hiddenElements.forEach((element) => element.classList.add("is-shared-transition-hidden"));

      const startTime = performance.now();

      return new Promise((resolve) => {
        const step = (now) => {
          const progress = Math.min((now - startTime) / ROUTE_TRANSITION_MS, 1);
          const eased = easeInOutCustom(progress);

          ghosts.forEach(({ ghost, from, to }) => setGhostFrame(ghost, from, to, eased));

          if (progress < 1) {
            window.requestAnimationFrame(step);
            return;
          }

          ghosts.forEach(({ ghost, from, to }) => setGhostFrame(ghost, from, to, 1));

          window.requestAnimationFrame(() => {
            layer.remove();
            hiddenElements.forEach((element) => element.classList.remove("is-shared-transition-hidden"));
            resolve();
          });
        };

        window.requestAnimationFrame(step);
      });
    },
  };
}

function captureBioPhotoState() {
  const photo = document.querySelector(".bio-photo");
  const image = photo?.querySelector("img");
  const scale = getPageScaleValue();

  if (!photo || !image) {
    return null;
  }

  const photoRect = photo.getBoundingClientRect();
  const imageRect = image.getBoundingClientRect();
  const imageStyle = getComputedStyle(image);

  return {
    rect: photoRect,
    imageRect,
    imageOffsetLeft: imageRect.left - photoRect.left,
    imageOffsetTop: imageRect.top - photoRect.top,
    imageObjectFit: imageStyle.objectFit,
    imageObjectPosition: imageStyle.objectPosition,
    src: image.currentSrc || image.src,
    alt: image.alt || "",
    image,
    scale,
  };
}

function createBioPhotoTransition(fromRoute, toRoute) {
  const sourcePhotoState = fromRoute === ROUTE_BIO ? captureBioPhotoState() : null;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return null;
  }

  let preparedPhoto = null;
  let preparedGhost = null;

  function buildGhost(photoState) {
    const ghost = document.createElement("figure");
    const image = photoState.image?.cloneNode(true) || document.createElement("img");

    if (!photoState.image) {
      image.src = photoState.src;
      image.alt = photoState.alt;
    }

    ghost.className = "transition-photo";
    ghost.appendChild(image);
    ghost.style.left = `${photoState.rect.left}px`;
    ghost.style.top = `${photoState.rect.top}px`;
    ghost.style.width = `${photoState.rect.width}px`;
    ghost.style.height = `${photoState.rect.height}px`;
    ghost.style.clipPath = toRoute === ROUTE_BIO ? "inset(0 0 0 100%)" : "inset(0 0 0 0)";
    image.style.left = `${photoState.imageOffsetLeft}px`;
    image.style.top = `${photoState.imageOffsetTop}px`;
    image.style.width = `${photoState.imageRect.width}px`;
    image.style.height = `${photoState.imageRect.height}px`;
    image.style.objectFit = photoState.imageObjectFit;
    image.style.objectPosition = photoState.imageObjectPosition;
    document.body.appendChild(ghost);
    ghost.getBoundingClientRect();
    return ghost;
  }

  return {
    needsPaintHandoff: Boolean(sourcePhotoState),

    prepare() {
      preparedPhoto = document.querySelector(".bio-photo");
      if (sourcePhotoState) {
        preparedGhost = buildGhost(sourcePhotoState);
      }
      if (!sourcePhotoState) {
        preparedPhoto?.classList.add("is-photo-transition-hidden");
      }
    },

    play() {
      const photo = document.querySelector(".bio-photo");
      const photoState = sourcePhotoState || captureBioPhotoState();

      if (!photo || !photoState) {
        preparedGhost?.remove();
        return Promise.resolve();
      }

      const ghost = preparedGhost || buildGhost(photoState);
      const hideRealPhoto = () => {
        photo.classList.add("is-photo-transition-hidden");
      };

      return new Promise((resolve) => {
        const start = () => {
          hideRealPhoto();
          const startTime = performance.now();

          const step = (now) => {
            const progress = Math.min((now - startTime) / ROUTE_TRANSITION_MS, 1);
            const eased = easeInOutCustom(progress);

            if (toRoute === ROUTE_BIO) {
              ghost.style.clipPath = `inset(0 0 0 ${100 * (1 - eased)}%)`;
            } else {
              ghost.style.clipPath = `inset(0 0 0 ${100 * eased}%)`;
            }

            if (progress < 1) {
              window.requestAnimationFrame(step);
              return;
            }

            window.requestAnimationFrame(() => {
              ghost.remove();
              photo.classList.remove("is-photo-transition-hidden");
              resolve();
            });
          };

          window.requestAnimationFrame(step);
        };

        if (sourcePhotoState) {
          window.requestAnimationFrame(start);
          return;
        }

        start();
      });
    },
  };
}

function createMainBackgroundRouteTransition(fromRoute, toRoute) {
  const isMainBioTransition =
    (fromRoute === ROUTE_MAIN && toRoute === ROUTE_BIO) ||
    (fromRoute === ROUTE_BIO && toRoute === ROUTE_MAIN);

  if (!isMainBioTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return null;
  }

  const root = document.documentElement;

  function setRouteOpacity(value) {
    root.style.setProperty("--main-bg-route-opacity", String(clamp(value, 0, 1)));
  }

  function getScrollOpacity() {
    const value = Number.parseFloat(getComputedStyle(root).getPropertyValue("--main-bg-scroll-opacity"));
    return Number.isFinite(value) ? clamp(value, 0, 1) : 1;
  }

  function animateOpacity(from, to, onUpdate, onDone) {
    const startTime = performance.now();

    return new Promise((resolve) => {
      const step = (now) => {
        const progress = Math.min((now - startTime) / MAIN_BACKGROUND_ROUTE_FADE_MS, 1);
        const eased = easeInOutCustom(progress);
        onUpdate(lerp(from, to, eased));

        if (progress < 1) {
          window.requestAnimationFrame(step);
          return;
        }

        onUpdate(to);
        onDone?.();
        resolve();
      };

      window.requestAnimationFrame(step);
    });
  }

  return {
    prepare() {
      if (fromRoute === ROUTE_MAIN && toRoute === ROUTE_BIO) {
        setRouteOpacity(getScrollOpacity());
        root.classList.add("is-main-bg-front");
      }

      if (fromRoute === ROUTE_BIO && toRoute === ROUTE_MAIN) {
        setRouteOpacity(0);
      }
    },

    play() {
      if (fromRoute === ROUTE_MAIN && toRoute === ROUTE_BIO) {
        return animateOpacity(getScrollOpacity(), 0, setRouteOpacity, () => {
          setRouteOpacity(0);
          root.classList.remove("is-main-bg-front");
        });
      }

      if (fromRoute === ROUTE_BIO && toRoute === ROUTE_MAIN) {
        return animateOpacity(0, 1, setRouteOpacity, () => {
          setRouteOpacity(1);
          root.classList.remove("is-main-bg-front");
        });
      }

      return Promise.resolve();
    },
  };
}

function playInitialBioEntryTransition(intent) {
  if (!intent || currentRoute !== ROUTE_BIO) {
    document.documentElement.classList.remove("has-pending-bio-entry");
    return;
  }

  const photoTransition = createBioPhotoTransition(ROUTE_MAIN, ROUTE_BIO);
  if (!photoTransition) {
    document.documentElement.classList.remove("has-pending-bio-entry");
    document.querySelector(".bio-photo")?.classList.remove("is-photo-transition-hidden");
    return;
  }

  document.documentElement.classList.add("is-route-transitioning");
  photoTransition.prepare();

  window.requestAnimationFrame(() => {
    photoTransition.play().finally(() => {
      document.documentElement.classList.remove("has-pending-bio-entry");
      document.documentElement.classList.remove("is-route-transitioning");
    });
  });
}

function animateRouteTransition(fromRoute, toRoute, sharedTransition = null, photoTransition = null, backgroundTransition = null, onComplete = null) {
  const fromPanel = getRoutePanel(fromRoute);
  const toPanel = getRoutePanel(toRoute);

  if (!fromPanel || !toPanel) {
    routeTransitioning = false;
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    resetRoutePanelStyles(fromPanel);
    resetRoutePanelStyles(toPanel);
    routeTransitioning = false;
    onComplete?.();
    return;
  }

  resetRoutePanelStyles(fromPanel);
  resetRoutePanelStyles(toPanel);
  document.documentElement.classList.add("is-route-transitioning");

  const transitionTasks = [sharedTransition?.play(), photoTransition?.play(), backgroundTransition?.play()]
    .filter((task) => task && typeof task.then === "function");

  if (!transitionTasks.length) {
    document.documentElement.classList.remove("is-route-transitioning");
    syncRouteBackgroundOpacity(toRoute);
    routeTransitioning = false;
    onComplete?.();
    return;
  }

  Promise.all(transitionTasks).finally(() => {
    document.documentElement.classList.remove("is-route-transitioning");
    syncRouteBackgroundOpacity(toRoute);
    routeTransitioning = false;
    onComplete?.();
  });
}

function performRouteTransition(route, options = {}) {
  const previousRoute = currentRoute;
  const sharedTransition = createSharedRouteTransition(previousRoute, route);
  const photoTransition = createBioPhotoTransition(previousRoute, route);
  const backgroundTransition = createMainBackgroundRouteTransition(previousRoute, route);

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      sharedTransition?.prepare();
      photoTransition?.prepare();
      backgroundTransition?.prepare();
      const startTransition = () => {
        document.documentElement.classList.add("is-route-transitioning");
        applyRoute(route);
        animateRouteTransition(previousRoute, route, sharedTransition, photoTransition, backgroundTransition, () => {
          if (options.revealWorks && route === ROUTE_MAIN) {
            animateMainLoopToWorks();
          }
        });
      };

      if (photoTransition?.needsPaintHandoff) {
        window.requestAnimationFrame(startTransition);
        return;
      }

      startTransition();
    });
  });
}

function maybeResetMainLoopBeforeBio(fromRoute, toRoute) {
  if (fromRoute === ROUTE_MAIN && toRoute === ROUTE_BIO) {
    return animateMainLoopToTop(MAIN_TO_BIO_LOOP_RESET_MS);
  }

  return Promise.resolve();
}

function navigateToRoute(route, options = {}) {
  if (routeTransitioning || route === currentRoute) {
    if (!routeTransitioning && route === ROUTE_MAIN && options.revealWorks) {
      history.pushState({ route, revealWorks: true }, "", "/");
      animateMainLoopToWorks();
    }
    if (route === ROUTE_BIO && options.scrollTopIfAlreadyHere) {
      smoothScrollToTop(1000);
    }
    return;
  }

  routeTransitioning = true;
  history.pushState({ route, revealWorks: Boolean(options.revealWorks) }, "", getRoutePath(route));
  const previousRoute = currentRoute;

  maybeResetMainLoopBeforeBio(previousRoute, route)
    .then(() => {
      performRouteTransition(route, options);
    })
    .catch(() => {
      loopResetting = false;
      routeTransitioning = false;
    });
}

function initSpaRouting() {
  const handleRouteClick = (event) => {
    const anchor = event.target.closest("a");
    if (!anchor) {
      return;
    }

    if (anchor.hasAttribute("data-bio-works-cta")) {
      event.preventDefault();
      if (bioWorksNavigating || routeTransitioning) {
        return;
      }

      bioWorksNavigating = true;
      smoothScrollToTop(1000)
        .then(() => {
          navigateToRoute(ROUTE_MAIN, { revealWorks: true });
        })
        .finally(() => {
          bioWorksNavigating = false;
        });
      return;
    }

    if (anchor.hasAttribute("data-scroll-top")) {
      event.preventDefault();
      smoothScrollToTop(1000);
      return;
    }

    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
      return;
    }

    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) {
      return;
    }
    if (url.pathname.startsWith("/contact")) {
      return;
    }

    const nextRoute = getRouteFromPath(url.pathname);
    const currentPathRoute = getRouteFromPath(window.location.pathname);
    const shouldRoute = anchor.hasAttribute("data-route-link") || nextRoute !== currentPathRoute || url.pathname === "/" || url.pathname.startsWith("/bio");

    if (!shouldRoute) {
      return;
    }

    event.preventDefault();

    if (nextRoute === currentRoute && nextRoute === ROUTE_BIO) {
      smoothScrollToTop(1000);
      return;
    }

    if (currentRoute === ROUTE_BIO && nextRoute === ROUTE_MAIN && anchor.classList.contains("bio-back-home")) {
      if (routeTransitioning) {
        return;
      }

      routeTransitioning = true;
      smoothScrollToTop(BIO_TO_MAIN_SCROLL_TOP_MS)
        .then(() => {
          routeTransitioning = false;
          navigateToRoute(nextRoute);
        })
        .catch(() => {
          routeTransitioning = false;
        });
      return;
    }

    if (nextRoute === ROUTE_MAIN && url.hash === "#works") {
      navigateToRoute(nextRoute, { revealWorks: true });
      return;
    }

    navigateToRoute(nextRoute);
  };

  document.addEventListener("click", handleRouteClick);

  document.querySelectorAll("[data-route-link]").forEach((anchor) => {
    anchor.addEventListener("click", handleRouteClick);
  });

  window.addEventListener("popstate", () => {
    const nextRoute = getRouteFromPath(window.location.pathname);
    const revealWorks = nextRoute === ROUTE_MAIN && window.location.hash === "#works";
    routeTransitioning = true;
    const previousRoute = currentRoute;

    maybeResetMainLoopBeforeBio(previousRoute, nextRoute)
      .then(() => {
        if (nextRoute === currentRoute) {
          routeTransitioning = false;
          if (revealWorks) {
            animateMainLoopToWorks();
          }
          return;
        }

        performRouteTransition(nextRoute, { revealWorks });
      })
      .catch(() => {
        loopResetting = false;
        routeTransitioning = false;
      });
  });
}

let loopOffset = 0;
const initialBioEntryIntent = consumeBioEntryTransitionIntent();
const worksRevealIntent = consumeWorksRevealIntent();
const navigationEntry = performance.getEntriesByType("navigation")[0];
const isHistoryReturn = navigationEntry?.type === "back_forward";
const shouldRestoreWorksPosition =
  currentRoute === ROUTE_MAIN &&
  (Boolean(worksRevealIntent?.restorePosition) || isHistoryReturn);
const savedWorksPosition = shouldRestoreWorksPosition ? consumeSavedWorksPosition() : null;
const shouldRevealWorksOnLoad =
  currentRoute === ROUTE_MAIN &&
  !Number.isFinite(savedWorksPosition) &&
  (window.location.hash === "#works" || Boolean(worksRevealIntent));

if (Number.isFinite(savedWorksPosition)) {
  loopOffset = savedWorksPosition;
}

syncPageScale();
layoutWorksGrid();
buildLoopedWorks();
syncLoopOffset(loopOffset);
initMainBackgroundVideoFallback();
initWorksPositionMemory();
initTiltCards();
window.addEventListener("wheel", handleWheel, { passive: false });
initWorksTouchScroll();
initBioScrollControls();
initBioScrollText();
initSpaRouting();
applyRoute(currentRoute, { replaceHistory: true });
if (shouldRevealWorksOnLoad) {
  history.replaceState({ route: ROUTE_MAIN, revealWorks: true }, "", "/");
  window.scrollTo(0, 0);
  window.requestAnimationFrame(() => {
    animateMainLoopToWorks();
  });
} else if (Number.isFinite(savedWorksPosition)) {
  history.replaceState({ route: ROUTE_MAIN, restoreWorks: true }, "", "/");
  window.scrollTo(0, 0);
}
playInitialBioEntryTransition(initialBioEntryIntent);
window.addEventListener("resize", () => {
  syncPageScale();
  layoutWorksGrid();
  loopOffset = syncLoopOffset(loopOffset);
  requestBioScrollSync();
});
document.documentElement.classList.add("is-ready");
