/**
 * Texan Timeline — collection filtering & sorting.
 * Facet changes update the grid via the Section Rendering API (no full reload).
 */
(() => {
  "use strict";

  const root = document.querySelector("[data_texan_collection]");
  if (!root) return;

  const sectionId = root.dataset.sectionId;
  const form = root.querySelector("[data_texan_facet_form]");
  const sort = root.querySelector("[data_texan_sort]");
  const results = root.querySelector("[data_texan_collection_results]");
  const facets = root.querySelector("[data_texan_facets]");
  const countEl = root.querySelector("[data_texan_product_count]");
  const filterToggle = root.querySelector("[data_texan_filter_toggle]");
  let controller;

  const render = async (searchParams, updateUrl = true) => {
    controller?.abort();
    controller = new AbortController();
    results.setAttribute("aria-busy", "true");
    const url = `${window.location.pathname}?${searchParams}`;
    try {
      const res = await fetch(`${url}${searchParams ? "&" : ""}section_id=${sectionId}`, {
        signal: controller.signal,
      });
      const text = await res.text();
      const html = new DOMParser().parseFromString(text, "text/html");

      const freshResults = html.querySelector("[data_texan_collection_results]");
      if (freshResults) results.innerHTML = freshResults.innerHTML;

      const freshFacets = html.querySelector("[data_texan_facets]");
      if (freshFacets && facets) facets.innerHTML = freshFacets.innerHTML;

      const freshCount = html.querySelector("[data_texan_product_count]");
      if (freshCount && countEl) countEl.innerHTML = freshCount.innerHTML;

      if (updateUrl) window.history.pushState({ searchParams }, "", url);
    } catch (err) {
      if (err.name !== "AbortError") window.location.search = searchParams;
    } finally {
      results.removeAttribute("aria-busy");
    }
  };

  const buildParams = () => {
    const params = new URLSearchParams(new FormData(form));
    // strip empty values
    for (const [k, v] of [...params.entries()]) {
      if (v === "") params.delete(k);
    }
    if (sort) params.set("sort_by", sort.value);
    return params.toString();
  };

  // Delegate facet changes (facets get replaced, so listen on the container)
  root.addEventListener("change", (e) => {
    if (e.target.closest("[data_texan_facet_form]") || e.target === sort) {
      if (!form) {
        if (sort) render(`sort_by=${sort.value}`);
        return;
      }
      render(buildParams());
    }
  });

  root.addEventListener("input", (e) => {
    if (e.target.matches('.texan_price_range input')) {
      clearTimeout(root._priceTimer);
      root._priceTimer = setTimeout(() => render(buildParams()), 500);
    }
  });

  // Clear all
  root.addEventListener("click", (e) => {
    const clear = e.target.closest("[data_texan_facet_clear]");
    if (clear) {
      e.preventDefault();
      render(sort ? `sort_by=${sort.value}` : "");
    }
  });

  filterToggle?.addEventListener("click", () => {
    const open = facets?.classList.toggle("texan_is_open");
    filterToggle.setAttribute("aria-expanded", String(open));
  });

  window.addEventListener("popstate", () => {
    render(window.location.search.replace(/^\?/, ""), false);
  });
})();
