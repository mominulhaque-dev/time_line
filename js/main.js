(() => {
  const header = document.querySelector("[data_texan_header]");
  const menuButton = document.querySelector("[data_texan_menu_button]");
  const navPanel = document.querySelector("[data_texan_nav_panel]");
  const searchButton = document.querySelector("[data_texan_search_button]");
  const searchPanel = document.querySelector("[data_texan_search_panel]");
  const revealItems = document.querySelectorAll("[data_texan_reveal]");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const closeMenu = () => {
    if (!header || !menuButton) return;

    header.classList.remove("texan_is_open");
    document.body.classList.remove("texan_nav_open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation menu");
  };

  const toggleMenu = () => {
    if (!header || !menuButton) return;

    const isOpen = header.classList.toggle("texan_is_open");
    document.body.classList.toggle("texan_nav_open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
  };

  menuButton?.addEventListener("click", toggleMenu);

  navPanel?.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      searchPanel?.setAttribute("hidden", "");
    }
  });

  searchButton?.addEventListener("click", () => {
    if (!searchPanel) return;

    const isHidden = searchPanel.hasAttribute("hidden");
    searchPanel.toggleAttribute("hidden", !isHidden);

    if (isHidden) {
      searchPanel.querySelector("input")?.focus();
    }
  });

  if (motionQuery.matches) {
    revealItems.forEach((item) => item.classList.add("texan_is_visible"));
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("texan_is_visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
})();
