function syncPageScale() {
  const designWidth = 1920;
  const viewportWidth = window.innerWidth;
  const scale = viewportWidth < designWidth ? viewportWidth / designWidth : 1;
  document.documentElement.style.setProperty("--page-scale", scale.toString());
}

function syncLoopOffset(offset) {
  const loopDistance = 5385;
  const normalized = ((offset % loopDistance) + loopDistance) % loopDistance;
  document.documentElement.style.setProperty("--loop-offset", `${normalized}px`);
  return normalized;
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

      card.classList.add("is-tilting");
      card.style.zIndex = "40";
      card.style.setProperty("--tilt-scale", hoverScale.toString());
      card.style.setProperty("--tilt-rotate-x", `${rotateX.toFixed(2)}deg`);
      card.style.setProperty("--tilt-rotate-y", `${rotateY.toFixed(2)}deg`);
      card.style.setProperty("--tilt-translate-x", `${translateX.toFixed(2)}px`);
      card.style.setProperty("--tilt-translate-y", `${translateY.toFixed(2)}px`);
      card.style.setProperty("--tilt-spotlight-x", `${(x * 100).toFixed(2)}%`);
      card.style.setProperty("--tilt-spotlight-y", `${(y * 100).toFixed(2)}%`);
      card.style.setProperty("--tilt-spotlight-opacity", "0.54");
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

let loopOffset = 0;

function handleWheel(event) {
  event.preventDefault();
  const delta = event.deltaY || event.deltaX || 0;
  loopOffset = syncLoopOffset(loopOffset + delta * 0.85);
}

buildLoopedWorks();
syncPageScale();
syncLoopOffset(loopOffset);
initTiltCards();
window.addEventListener("wheel", handleWheel, { passive: false });
window.addEventListener("resize", syncPageScale);
document.documentElement.classList.add("is-ready");
