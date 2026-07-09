/**
 * Texan Timeline — product page behavior.
 * Gallery switching, variant selection, quantity, sticky ATC, zoom, share.
 */
(() => {
  "use strict";

  const money = (cents) => window.Texan?.formatMoney?.(cents) ?? "$" + (cents / 100).toFixed(2);

  document.querySelectorAll("[data_texan_product_section]").forEach((section) => {
    const variantsEl = section.querySelector("[data_texan_variants]");
    if (!variantsEl) return;

    let variants = [];
    try {
      variants = JSON.parse(variantsEl.textContent);
    } catch (_) {
      return;
    }

    const picker = section.querySelector("[data_texan_variant_picker]");
    const idInput = section.querySelector("[data_texan_variant_id]");
    const priceEl = section.querySelector("[data_texan_price]");
    const atc = section.querySelector("[data_texan_atc]");
    const atcText = section.querySelector("[data_texan_atc_text]");
    const stickyPrice = document.querySelector("[data_texan_sticky_price]");
    const slides = section.querySelectorAll("[data_texan_slide]");
    const thumbs = section.querySelectorAll("[data_texan_thumb]");

    /* ---------- gallery ---------- */
    const showMedia = (mediaId) => {
      slides.forEach((s) => (s.hidden = s.getAttribute("data_texan_slide") !== String(mediaId)));
      thumbs.forEach((t) => {
        const active = t.getAttribute("data_texan_thumb") === String(mediaId);
        t.classList.toggle("texan_is_active", active);
        t.setAttribute("aria-selected", String(active));
      });
    };
    thumbs.forEach((thumb) => {
      thumb.addEventListener("click", () => showMedia(thumb.getAttribute("data_texan_thumb")));
    });

    /* ---------- click-to-zoom ---------- */
    section.querySelectorAll(".texan_zoomable").forEach((img) => {
      img.addEventListener("click", () => img.classList.toggle("texan_zoomed"));
    });

    /* ---------- variant selection ---------- */
    const getSelectedOptions = () => {
      const groups = picker ? picker.querySelectorAll(".texan_option") : [];
      return Array.from(groups).map((g) => g.querySelector("input:checked")?.value);
    };

    const updateVariant = () => {
      if (!picker) return;
      const selected = getSelectedOptions();
      const match = variants.find((v) =>
        v.options.every((opt, i) => opt === selected[i])
      );

      // update the "selected value" labels
      picker.querySelectorAll("[data_texan_option_label]").forEach((label, i) => {
        if (selected[i]) label.textContent = selected[i];
      });

      if (!match) {
        if (atc) {
          atc.disabled = true;
          if (atcText) atcText.textContent = "Unavailable";
        }
        return;
      }

      if (idInput) idInput.value = match.id;

      // price
      if (priceEl) {
        const onSale = match.compare_at_price && match.compare_at_price > match.price;
        priceEl.innerHTML =
          `<div class="texan_price${onSale ? " texan_price_on_sale" : ""}">` +
          `<span class="texan_price_current">${money(match.price)}</span>` +
          (onSale ? `<span class="texan_price_compare"><s>${money(match.compare_at_price)}</s></span>` : "") +
          `</div>`;
      }
      if (stickyPrice) stickyPrice.textContent = money(match.price);

      // availability
      if (atc) {
        atc.disabled = !match.available;
        if (atcText) atcText.textContent = match.available ? atc.dataset.addLabel || "Add to cart" : "Sold out";
      }

      // media
      if (match.featured_media) showMedia(match.featured_media.id);

      // URL
      const url = new URL(window.location.href);
      url.searchParams.set("variant", match.id);
      window.history.replaceState({}, "", url);
    };

    picker?.addEventListener("change", updateVariant);

    /* ---------- quantity stepper ---------- */
    const qty = section.querySelector("[data_texan_pdp_qty]");
    if (qty) {
      const field = qty.querySelector("[data_texan_qty_field]");
      qty.querySelector("[data_texan_qty_minus]")?.addEventListener("click", () => {
        field.value = Math.max(1, Number(field.value) - 1);
      });
      qty.querySelector("[data_texan_qty_plus]")?.addEventListener("click", () => {
        field.value = Number(field.value) + 1;
      });
    }

    /* share is handled globally in global.js (delegated) */
  });

  /* ---------- sticky ATC (global to page) ---------- */
  const sticky = document.querySelector("[data_texan_sticky_atc]");
  const primaryAtc = document.querySelector("[data_texan_buy], .texan_buy");
  if (sticky && primaryAtc && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      ([entry]) => {
        const show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        sticky.classList.toggle("texan_is_visible", show);
        sticky.setAttribute("aria-hidden", String(!show));
      },
      { threshold: 0 }
    );
    io.observe(primaryAtc);
  }
})();
