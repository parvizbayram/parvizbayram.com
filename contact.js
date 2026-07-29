(() => {
  const DESIGN_WIDTH = 1920;
  const root = document.documentElement;

  function syncContactScale() {
    const scale = typeof window.PortfolioScale?.sync === "function"
      ? window.PortfolioScale.sync()
      : window.innerWidth < DESIGN_WIDTH
        ? window.innerWidth / DESIGN_WIDTH
        : window.innerWidth / DESIGN_WIDTH;
  }

  function fallbackCopy(text) {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.left = "-9999px";
    field.style.top = "0";
    document.body.appendChild(field);
    field.select();
    document.execCommand("copy");
    document.body.removeChild(field);
  }

  function initCopyEmail() {
    const button = document.querySelector("[data-copy-email]");
    const bubble = document.querySelector("[data-copy-bubble]");
    const shell = document.querySelector(".contact-shell");
    if (!button || !bubble) {
      return;
    }

    const email = button.dataset.copyEmail || button.textContent.trim();
    const supportsHoverCursor = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const setBubblePosition = (event) => {
      const shellRect = (shell || button).getBoundingClientRect();
      const scale = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--page-scale")) || 1;
      if (!shellRect.width || !shellRect.height || !scale) {
        return;
      }

      const x = (event.clientX - shellRect.left) / scale;
      const y = (event.clientY - shellRect.top) / scale;
      bubble.style.setProperty("--bubble-x", `${x.toFixed(2)}px`);
      bubble.style.setProperty("--bubble-y", `${y.toFixed(2)}px`);
      bubble.style.setProperty("--bubble-offset-x", "-22px");
      bubble.style.setProperty("--bubble-offset-y", `${Math.max(-3, Math.min(3, (event.clientY - shellRect.top) / shellRect.height * 6 - 3)).toFixed(2)}px`);
    };
    const setBubbleToButtonCenter = () => {
      const shellRect = (shell || button).getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const scale = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--page-scale")) || 1;
      if (!shellRect.width || !shellRect.height || !buttonRect.width || !scale) {
        return;
      }

      const x = (buttonRect.left + buttonRect.width / 2 - shellRect.left) / scale;
      const y = (buttonRect.top + buttonRect.height / 2 - shellRect.top) / scale;
      bubble.style.setProperty("--bubble-x", `${x.toFixed(2)}px`);
      bubble.style.setProperty("--bubble-y", `${y.toFixed(2)}px`);
      bubble.style.setProperty("--bubble-offset-x", "0px");
      bubble.style.setProperty("--bubble-offset-y", "-76px");
    };
    const show = () => {
      bubble.classList.add("is-visible");
      button.classList.add("is-bubble-active");
    };
    const reset = () => {
      bubble.classList.remove("is-visible");
      bubble.classList.remove("is-copied");
      button.classList.remove("is-bubble-active");
    };
    const copyText = async () => {
      if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
        await Promise.race([
          navigator.clipboard.writeText(email),
          new Promise((_, reject) => {
            window.setTimeout(() => reject(new Error("Clipboard timeout")), 250);
          })
        ]);
        return;
      }
      fallbackCopy(email);
    };

    button.addEventListener("click", async () => {
      let copied = false;
      try {
        await copyText();
        copied = true;
      } catch (error) {
        try {
          fallbackCopy(email);
          copied = true;
        } catch (fallbackError) {
          // Keep the visual feedback responsive even if the browser blocks clipboard access.
        }
      } finally {
        if (copied) {
          window.trackPortfolioEvent?.("contact_email_copy");
        }
        if (!supportsHoverCursor) {
          setBubbleToButtonCenter();
        }
        show();
        bubble.classList.add("is-copied");
        if (!supportsHoverCursor) {
          window.setTimeout(reset, 900);
        }
      }
    });

    if (supportsHoverCursor) {
      button.addEventListener("pointerenter", show);
      button.addEventListener("pointermove", (event) => {
        setBubblePosition(event);
        show();
      });
      button.addEventListener("mouseleave", reset);
      button.addEventListener("blur", reset);
    }
  }

  function initContactLinkTracking() {
    document.querySelector(".contact-linkedin")?.addEventListener("click", () => {
      window.trackPortfolioEvent?.("contact_linkedin_click");
    });

    document.querySelector(".contact-behance")?.addEventListener("click", () => {
      window.trackPortfolioEvent?.("contact_behance_click");
    });
  }

  syncContactScale();
  initCopyEmail();
  initContactLinkTracking();
  window.addEventListener("resize", syncContactScale, { passive: true });
})();
