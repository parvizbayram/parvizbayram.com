(() => {
  const DEFAULT_ACTIVE_TITLE = "Parviz Bayramguliyev - Visual Designer";
  const INITIAL_ACTIVE_TITLE = document.title || DEFAULT_ACTIVE_TITLE;
  const ROUTE_TITLES = new Map([
    ["/", DEFAULT_ACTIVE_TITLE],
    ["/bio", "Parviz's Bio"],
    ["/contact", "Let's Talk"],
  ]);
  const CASE_PAGE_PATHS = new Set([
    "/unibank",
    "/talktocanada",
    "/pedalchi",
    "/straudo",
    "/aerosure",
    "/manaw",
    "/orkestra",
    "/bmmb",
    "/mandrillaz",
  ]);
  const INACTIVE_TITLE_PREFIX = "(1) ";
  const ACTIVE_FAVICON = "/assets/favicon-active.svg";
  const INACTIVE_FAVICON = "/assets/favicon-inactive.svg";
  const VIEWED_CASES_STORAGE_KEY = "portfolio_viewed_cases";
  const DISTINCT_CASE_READER_STORAGE_KEY = "portfolio_case_reader_2_distinct_sent";

  function syncFavicon(isInactive) {
    let icon = document.querySelector('link[rel="icon"]');

    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      icon.type = "image/svg+xml";
      document.head.appendChild(icon);
    }

    icon.href = isInactive ? INACTIVE_FAVICON : ACTIVE_FAVICON;
  }

  function getActiveTitle() {
    const pathname = window.location.pathname.replace(/\/$/, "") || "/";
    return ROUTE_TITLES.get(pathname) || INITIAL_ACTIVE_TITLE;
  }

  function getNormalizedPath() {
    return window.location.pathname.replace(/\/$/, "") || "/";
  }

  function syncTitle() {
    const isInactive = document.visibilityState === "hidden";
    const activeTitle = getActiveTitle();
    document.title = isInactive ? `${INACTIVE_TITLE_PREFIX}${activeTitle}` : activeTitle;
    syncFavicon(isInactive);
  }

  function trackPortfolioEvent(eventName, parameters = {}) {
    if (!eventName) {
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...parameters
    });
  }

  function trackCasePageView() {
    const pagePath = getNormalizedPath();

    if (!CASE_PAGE_PATHS.has(pagePath)) {
      return;
    }

    const caseSlug = pagePath.slice(1);

    trackPortfolioEvent("case_page_view", {
      case_slug: caseSlug,
      page_path: pagePath,
      page_location: window.location.href,
      page_title: getActiveTitle()
    });

    trackDistinctCaseReader(caseSlug);
  }

  function readViewedCases() {
    try {
      const storedCases = JSON.parse(localStorage.getItem(VIEWED_CASES_STORAGE_KEY) || "[]");
      return Array.isArray(storedCases) ? storedCases.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  function trackDistinctCaseReader(caseSlug) {
    try {
      const viewedCases = new Set(readViewedCases());
      viewedCases.add(caseSlug);

      const caseSlugs = Array.from(viewedCases);
      localStorage.setItem(VIEWED_CASES_STORAGE_KEY, JSON.stringify(caseSlugs));

      if (caseSlugs.length < 2 || localStorage.getItem(DISTINCT_CASE_READER_STORAGE_KEY)) {
        return;
      }

      trackPortfolioEvent("case_reader_2_distinct", {
        case_count: caseSlugs.length,
        case_slugs: caseSlugs.join(","),
        latest_case_slug: caseSlug
      });

      localStorage.setItem(DISTINCT_CASE_READER_STORAGE_KEY, "1");
    } catch {
      // Storage can be unavailable in strict privacy modes; basic page tracking still works.
    }
  }

  function wrapHistoryMethod(methodName) {
    const original = history[methodName];

    history[methodName] = function wrappedHistoryMethod(...args) {
      const result = original.apply(this, args);
      syncTitle();
      return result;
    };
  }

  wrapHistoryMethod("pushState");
  wrapHistoryMethod("replaceState");
  document.addEventListener("visibilitychange", syncTitle);
  window.addEventListener("focus", syncTitle);
  window.addEventListener("blur", syncTitle);
  window.addEventListener("popstate", syncTitle);
  window.addEventListener("pageshow", syncTitle);
  window.trackPortfolioEvent = trackPortfolioEvent;
  syncTitle();
  trackCasePageView();
})();
