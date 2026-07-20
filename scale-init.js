(() => {
  const DESIGN_WIDTH = 1920;
  const MAX_DESKTOP_SCALE = Number.POSITIVE_INFINITY;
  const TABLET_MAX_WIDTH = 1279;
  const TABLET_PORTRAIT_MAX_WIDTH = 1024;
  const root = document.documentElement;

  function getResponsiveScale() {
    const viewportWidth = window.innerWidth || DESIGN_WIDTH;
    const fitScale = viewportWidth / DESIGN_WIDTH;
    return viewportWidth < DESIGN_WIDTH
      ? fitScale
      : Math.min(fitScale, MAX_DESKTOP_SCALE);
  }

  function syncResponsiveScale() {
    const viewportWidth = window.innerWidth || DESIGN_WIDTH;
    const viewportHeight = window.innerHeight || 1080;
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const isHoverless = window.matchMedia("(hover: none)").matches;
    const hasTouch = navigator.maxTouchPoints > 0;
    const isPortraitTabletSize = viewportWidth <= 1024 && viewportHeight > viewportWidth;
    const isTablet = viewportWidth < 1280 && (isCoarsePointer || (hasTouch && isHoverless) || isPortraitTabletSize);
    const isTabletPortrait = isTablet && viewportWidth <= TABLET_PORTRAIT_MAX_WIDTH;
    const scale = getResponsiveScale();
    const scaledWidth = DESIGN_WIDTH * scale;
    const pageOffsetX = Math.max(0, (viewportWidth - scaledWidth) / 2);
    const viewportHeightDesign = viewportHeight / scale;
    const extraHeightDesign = Math.max(0, viewportHeightDesign - 1080);
    const bioPhotoHeight = isTabletPortrait
      ? Math.min(2200, Math.max(1720, viewportHeightDesign - 620))
      : Math.min(760, Math.max(590, 590 + extraHeightDesign * 0.5));

    root.classList.toggle("is-tablet", isTablet);
    root.classList.toggle("is-tablet-portrait", isTabletPortrait);
    root.classList.toggle("is-tablet-landscape", isTablet && !isTabletPortrait);

    root.style.setProperty("--page-scale", scale.toFixed(5));
    root.style.setProperty("--page-offset-x", `${pageOffsetX.toFixed(2)}px`);
    root.style.setProperty("--desktop-gutter", `${pageOffsetX.toFixed(2)}px`);
    root.style.setProperty("--scaled-page-width", `${scaledWidth.toFixed(2)}px`);
    root.style.setProperty("--viewport-safe-width", `${Math.min(viewportWidth, scaledWidth).toFixed(2)}px`);
    root.style.setProperty("--viewport-height-design", `${viewportHeightDesign.toFixed(2)}px`);
    root.style.setProperty("--bio-photo-height", `${bioPhotoHeight.toFixed(2)}px`);
    root.style.setProperty("--bio-viewport-half", `${viewportHeight / (2 * scale)}px`);
    root.style.setProperty("--bio-footer-gap", "80px");

    return scale;
  }

  window.PortfolioScale = {
    DESIGN_WIDTH,
    MAX_DESKTOP_SCALE,
    TABLET_MAX_WIDTH,
    TABLET_PORTRAIT_MAX_WIDTH,
    getScale: getResponsiveScale,
    sync: syncResponsiveScale
  };

  syncResponsiveScale();
  window.addEventListener("resize", syncResponsiveScale, { passive: true });
})();
