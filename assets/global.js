/**
 * Texan Timeline — global theme behavior.
 * Vanilla ES6+, no dependencies. Progressive enhancement:
 * everything degrades gracefully if JS fails to load.
 */
(() => {
  "use strict";

  document.documentElement.classList.add("texan_js");

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const routes = window.Shopify?.routes?.root || "/";

  /* -------------------------------------------------- utilities */
  const formatMoney = (cents) => {
    try {
      return new Intl.NumberFormat(document.documentElement.lang || "en", {
        style: "currency",
        currency: window.Shopify?.currency?.active || "USD",
      }).format(cents / 100);
    } catch (_) {
      return "$" + (cents / 100).toFixed(2);
    }
  };

  const trapFocus = (container, event) => {
    const focusable = container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  /* -------------------------------------------------- header: mobile nav + search */
  const header = document.querySelector("[data_texan_header]");
  const menuButton = document.querySelector("[data_texan_menu_button]");
  const navPanel = document.querySelector("[data_texan_nav_panel]");
  const searchButton = document.querySelector("[data_texan_search_button]");
  const searchPanel = document.querySelector("[data_texan_search_panel]");

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
  navPanel?.addEventListener("click", (e) => {
    if (e.target instanceof HTMLAnchorElement) closeMenu();
  });

  searchButton?.addEventListener("click", () => {
    if (!searchPanel) return;
    const isHidden = searchPanel.hasAttribute("hidden");
    searchPanel.toggleAttribute("hidden", !isHidden);
    searchButton.setAttribute("aria-expanded", String(isHidden));
    if (isHidden) searchPanel.querySelector("input")?.focus();
  });

  /* -------------------------------------------------- predictive search */
  const predictiveInput = document.querySelector("[data_texan_predictive_input]");
  const predictiveResults = document.querySelector("[data_texan_predictive_results]");
  if (predictiveInput && predictiveResults) {
    let controller;
    let debounce;
    const runSearch = async (term) => {
      controller?.abort();
      controller = new AbortController();
      const url =
        `${routes}search/suggest?q=${encodeURIComponent(term)}` +
        `&resources[type]=product,article,page&resources[limit]=6&section_id=predictive-search`;
      try {
        const res = await fetch(url, { signal: controller.signal });
        const text = await res.text();
        const html = new DOMParser().parseFromString(text, "text/html");
        const fresh = html.querySelector("[data_texan_predictive_results]");
        if (fresh) predictiveResults.innerHTML = fresh.innerHTML;
        predictiveResults.hidden = false;
      } catch (err) {
        if (err.name !== "AbortError") predictiveResults.hidden = true;
      }
    };
    predictiveInput.addEventListener("input", (e) => {
      const term = e.target.value.trim();
      clearTimeout(debounce);
      if (term.length < 2) {
        predictiveResults.hidden = true;
        return;
      }
      debounce = setTimeout(() => runSearch(term), 220);
    });
  }

  /* -------------------------------------------------- cart drawer + ajax add */
  const cartDrawer = document.querySelector("[data_texan_cart_drawer]");
  const cartCountEls = document.querySelectorAll("[data_texan_cart_count]");
  let lastFocused = null;

  const setCartCount = (count) => {
    cartCountEls.forEach((el) => {
      el.textContent = count;
      el.hidden = count === 0;
    });
  };

  const openCart = () => {
    if (!cartDrawer) return;
    lastFocused = document.activeElement;
    cartDrawer.classList.add("texan_is_open");
    cartDrawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("texan_nav_open");
    cartDrawer.querySelector("[data_texan_cart_close]")?.focus();
  };

  const closeCart = () => {
    if (!cartDrawer) return;
    cartDrawer.classList.remove("texan_is_open");
    cartDrawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("texan_nav_open");
    lastFocused?.focus();
  };

  const refreshCartDrawer = async () => {
    if (!cartDrawer) return;
    try {
      const res = await fetch(`${routes}?section_id=cart-drawer`);
      const text = await res.text();
      const html = new DOMParser().parseFromString(text, "text/html");
      const fresh = html.querySelector("[data_texan_cart_contents]");
      const current = cartDrawer.querySelector("[data_texan_cart_contents]");
      if (fresh && current) current.innerHTML = fresh.innerHTML;
    } catch (_) {}
  };

  const updateCartState = async () => {
    try {
      const res = await fetch(`${routes}cart.js`);
      const cart = await res.json();
      setCartCount(cart.item_count);
    } catch (_) {}
    await refreshCartDrawer();
  };

  document.addEventListener("click", (e) => {
    const openTrigger = e.target.closest("[data_texan_cart_open]");
    if (openTrigger && cartDrawer) {
      e.preventDefault();
      openCart();
    }
    if (e.target.closest("[data_texan_cart_close], [data_texan_cart_overlay]")) {
      closeCart();
    }
    const remove = e.target.closest("[data_texan_cart_remove]");
    if (remove) {
      e.preventDefault();
      changeLine(remove.dataset.line, 0);
    }
    const qtyUp = e.target.closest("[data_texan_qty_up]");
    const qtyDown = e.target.closest("[data_texan_qty_down]");
    if (qtyUp || qtyDown) {
      const btn = qtyUp || qtyDown;
      const input = btn.parentElement.querySelector("[data_texan_qty_input]");
      const next = Math.max(0, Number(input.value) + (qtyUp ? 1 : -1));
      changeLine(btn.dataset.line, next);
    }
  });

  document.addEventListener("change", (e) => {
    const input = e.target.closest("[data_texan_qty_input]");
    if (input) changeLine(input.dataset.line, Math.max(0, Number(input.value)));
  });

  // Debounced cart-note persistence
  let noteTimer;
  document.addEventListener("input", (e) => {
    const note = e.target.closest("[data_texan_cart_note]");
    if (!note) return;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      fetch(`${routes}cart/update.js`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.value }),
      }).catch(() => {});
    }, 500);
  });

  const changeLine = async (line, quantity) => {
    try {
      const res = await fetch(`${routes}cart/change.js`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ line: Number(line), quantity: Number(quantity) }),
      });
      const cart = await res.json();
      setCartCount(cart.item_count);
      await refreshCartDrawer();
    } catch (_) {}
  };

  // AJAX add-to-cart for any product form flagged with data_texan_product_form
  document.addEventListener("submit", async (e) => {
    const form = e.target.closest("[data_texan_product_form]");
    if (!form || !cartDrawer) return;
    e.preventDefault();
    const button = form.querySelector('[type="submit"]');
    button?.setAttribute("aria-busy", "true");
    button?.classList.add("texan_is_loading");
    try {
      const res = await fetch(`${routes}cart/add.js`, {
        method: "POST",
        headers: { Accept: "application/javascript" },
        body: new FormData(form),
      });
      if (!res.ok) throw new Error("add failed");
      await updateCartState();
      openCart();
    } catch (_) {
      form.submit();
    } finally {
      button?.removeAttribute("aria-busy");
      button?.classList.remove("texan_is_loading");
    }
  });

  /* -------------------------------------------------- global escape + focus trap */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu();
      searchPanel?.setAttribute("hidden", "");
      searchButton?.setAttribute("aria-expanded", "false");
      if (cartDrawer?.classList.contains("texan_is_open")) closeCart();
    }
    if (e.key === "Tab" && cartDrawer?.classList.contains("texan_is_open")) {
      trapFocus(cartDrawer, e);
    }
  });

  /* -------------------------------------------------- back to top */
  const backToTop = document.querySelector("[data_texan_back_to_top]");
  if (backToTop) {
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: motionQuery.matches ? "auto" : "smooth" });
    });
    let ticking = false;
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          backToTop.classList.toggle("texan_is_visible", window.scrollY > 600);
          ticking = false;
        });
      },
      { passive: true }
    );
  }

  /* -------------------------------------------------- share (product + article) */
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data_texan_share]");
    if (!btn) return;
    const data = { title: btn.dataset.title, url: btn.dataset.url };
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(data.url);
        btn.classList.add("texan_copied");
        setTimeout(() => btn.classList.remove("texan_copied"), 1600);
      } catch (_) {}
    }
  });

  /* -------------------------------------------------- cookie banner */
  const cookieBanner = document.querySelector("[data_texan_cookie_banner]");
  if (cookieBanner) {
    const KEY = "texan_cookie_ack";
    if (!localStorage.getItem(KEY)) cookieBanner.hidden = false;
    cookieBanner.querySelector("[data_texan_cookie_accept]")?.addEventListener("click", () => {
      localStorage.setItem(KEY, "1");
      cookieBanner.hidden = true;
    });
  }

  /* -------------------------------------------------- scroll reveal */
  const revealItems = document.querySelectorAll("[data_texan_reveal]");
  if (motionQuery.matches) {
    revealItems.forEach((el) => el.classList.add("texan_is_visible"));
  } else if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("texan_is_visible");
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );
    revealItems.forEach((el) => observer.observe(el));
  } else {
    revealItems.forEach((el) => el.classList.add("texan_is_visible"));
  }

  /* expose a tiny API for section scripts (product/collection) */
  window.Texan = { openCart, closeCart, updateCartState, formatMoney };
})();
