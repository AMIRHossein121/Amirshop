/* =========================================================
   store.js — نمایش محصولات در صفحه اصلی
   ========================================================= */

const TELEGRAM_BOT = "https://t.me/Amir1shoping2bot";

function formatPrice(value) {
  const n = Number(value) || 0;
  return n.toLocaleString("fa-IR") + " تومان";
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[m]));
}

function renderProducts(products, gridEl, activeCategory) {
  const list = activeCategory && activeCategory !== "همه"
    ? products.filter((p) => p.category === activeCategory)
    : products;

  if (!list.length) {
    gridEl.innerHTML = `<div class="empty-state">فعلاً محصولی برای نمایش ثبت نشده است.</div>`;
    return;
  }

  gridEl.innerHTML = list.map((p) => {
    const media = p.image
      ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">`
      : `📦`;
    const oos = p.inStock === false ? `<div class="card-oos">ناموجود</div>` : "";
    const buyBtn = p.inStock === false
      ? `<button class="btn btn-dark btn-block" disabled style="opacity:.5;cursor:not-allowed">فعلاً ناموجود</button>`
      : `<a class="btn btn-dark btn-block" href="${TELEGRAM_BOT}" target="_blank" rel="noopener">سفارش از طریق تلگرام</a>`;

    return `
      <article class="card">
        <div class="card-media">${media}</div>
        <div class="card-body">
          <div class="card-cat">${escapeHtml(p.category || "")}</div>
          <h3 class="card-title">${escapeHtml(p.name)}</h3>
          <p class="card-desc">${escapeHtml(p.description || "")}</p>
          <div class="card-price">${formatPrice(p.price)}</div>
          ${oos}
        </div>
        <div class="card-actions">${buyBtn}</div>
      </article>
    `;
  }).join("");
}

function buildCategoryFilters(products, filterEl, gridEl) {
  const categories = ["همه", ...new Set(products.map((p) => p.category).filter(Boolean))];
  filterEl.innerHTML = categories
    .map((c, i) => `<button data-cat="${escapeHtml(c)}" class="${i === 0 ? "active" : ""}">${escapeHtml(c)}</button>`)
    .join("");

  filterEl.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      filterEl.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderProducts(products, gridEl, btn.dataset.cat);
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const gridEl = document.getElementById("product-grid");
  const filterEl = document.getElementById("category-filters");
  if (!gridEl) return;

  try {
    const result = await apiGet({ action: "list" });
    const products = result && result.ok ? result.products : [];
    buildCategoryFilters(products, filterEl, gridEl);
    renderProducts(products, gridEl, "همه");
  } catch (e) {
    gridEl.innerHTML = `<div class="empty-state">در حال حاضر امکان دریافت محصولات نیست. لطفاً بعداً دوباره سر بزن.</div>`;
  }

  document.querySelectorAll("[data-telegram-link]").forEach((el) => {
    el.href = TELEGRAM_BOT;
  });
});
