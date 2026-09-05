/* =========================================================
   admin.js
   ورود مدیر و مدیریت محصولات از طریق Google Apps Script.
   توکن ورود در sessionStorage نگه‌داری می‌شود (فقط تا وقتی
   تب مرورگر باز است و بعد از ۲ ساعت توسط سرور منقضی می‌شود).
   ========================================================= */

const TOKEN_KEY = "amirshop_admin_token";

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[m]));
}

function formatPrice(value) {
  return (Number(value) || 0).toLocaleString("fa-IR") + " تومان";
}

/* ---------------- ورود ---------------- */
function initLogin() {
  const form = document.getElementById("login-form");
  if (!form) return;

  if (sessionStorage.getItem(TOKEN_KEY)) {
    window.location.href = "admin-panel.html";
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("login-name").value.trim();
    const password = document.getElementById("login-pass").value;
    const errorEl = document.getElementById("login-error");
    const submitBtn = form.querySelector("button[type=submit]");

    errorEl.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "در حال ورود...";

    try {
      const result = await apiPost({ action: "login", username, password });
      if (result.ok) {
        sessionStorage.setItem(TOKEN_KEY, result.token);
        window.location.href = "admin-panel.html";
      } else {
        errorEl.textContent = result.error || "نام کاربری یا رمز عبور اشتباه است.";
      }
    } catch (err) {
      errorEl.textContent = "خطا در ارتباط با سرور. اتصال اینترنت یا آدرس API را بررسی کن.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "ورود";
    }
  });
}

/* ---------------- پنل مدیریت ---------------- */
async function initPanel() {
  const tableBody = document.getElementById("product-table-body");
  if (!tableBody) return;

  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) {
    window.location.href = "admin.html";
    return;
  }

  document.getElementById("logout-btn").addEventListener("click", async () => {
    try { await apiPost({ action: "logout", token }); } catch (e) { /* ignore */ }
    sessionStorage.removeItem(TOKEN_KEY);
    window.location.href = "admin.html";
  });

  let products = [];
  let editingId = null;

  const form = document.getElementById("product-form");
  const formTitle = document.getElementById("form-title");
  const nameEl = document.getElementById("f-name");
  const catEl = document.getElementById("f-category");
  const priceEl = document.getElementById("f-price");
  const descEl = document.getElementById("f-description");
  const imageEl = document.getElementById("f-image");
  const stockEl = document.getElementById("f-instock");
  const cancelBtn = document.getElementById("cancel-edit");
  const statusEl = document.getElementById("panel-status");

  async function loadProducts() {
    statusEl.textContent = "در حال بارگذاری...";
    try {
      const result = await apiGet({ action: "list" });
      products = result && result.ok ? result.products : [];
      statusEl.textContent = "";
      renderTable();
    } catch (e) {
      statusEl.textContent = "خطا در دریافت محصولات از گوگل‌شیت.";
    }
  }

  function handleUnauthorized(result) {
    if (result && result.ok === false && /دسترسی غیرمجاز/.test(result.error || "")) {
      sessionStorage.removeItem(TOKEN_KEY);
      window.location.href = "admin.html";
      return true;
    }
    return false;
  }

  function renderTable() {
    if (!products.length) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);padding:24px 0;">هنوز محصولی اضافه نشده است.</td></tr>`;
      return;
    }
    tableBody.innerHTML = products.map((p) => `
      <tr>
        <td>${escapeHtml(p.name)}<br><span style="color:var(--ink-soft);font-size:.78rem">${escapeHtml(p.category || "")}</span></td>
        <td>${formatPrice(p.price)}</td>
        <td>${p.inStock === false ? '<span class="stock-badge out">ناموجود</span>' : '<span class="stock-badge">موجود</span>'}</td>
        <td style="max-width:220px">${escapeHtml((p.description || "").slice(0, 60))}${(p.description || "").length > 60 ? "…" : ""}</td>
        <td>
          <div class="row-actions">
            <button class="edit" data-id="${p.id}">ویرایش</button>
            <button class="del" data-id="${p.id}">حذف</button>
          </div>
        </td>
      </tr>
    `).join("");

    tableBody.querySelectorAll(".edit").forEach((btn) => btn.addEventListener("click", () => startEdit(btn.dataset.id)));
    tableBody.querySelectorAll(".del").forEach((btn) => btn.addEventListener("click", () => deleteProduct(btn.dataset.id)));
  }

  function startEdit(id) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    editingId = id;
    formTitle.textContent = "ویرایش محصول";
    nameEl.value = p.name || "";
    catEl.value = p.category || "";
    priceEl.value = p.price || 0;
    descEl.value = p.description || "";
    imageEl.value = p.image || "";
    stockEl.checked = p.inStock !== false;
    cancelBtn.style.display = "inline-flex";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetForm() {
    editingId = null;
    formTitle.textContent = "افزودن محصول جدید";
    form.reset();
    stockEl.checked = true;
    cancelBtn.style.display = "none";
  }

  async function deleteProduct(id) {
    if (!confirm("این محصول حذف شود؟")) return;
    statusEl.textContent = "در حال حذف...";
    const result = await apiPost({ action: "delete", token, id });
    if (handleUnauthorized(result)) return;
    if (result.ok) {
      await loadProducts();
    } else {
      statusEl.textContent = result.error || "خطا در حذف محصول.";
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      token,
      name: nameEl.value.trim(),
      category: catEl.value.trim(),
      price: Number(priceEl.value) || 0,
      description: descEl.value.trim(),
      image: imageEl.value.trim(),
      inStock: stockEl.checked,
    };
    if (!payload.name) return;

    statusEl.textContent = "در حال ذخیره...";
    const result = editingId
      ? await apiPost({ action: "edit", id: editingId, ...payload })
      : await apiPost({ action: "add", ...payload });

    if (handleUnauthorized(result)) return;
    if (result.ok) {
      await loadProducts();
      resetForm();
      statusEl.textContent = "";
    } else {
      statusEl.textContent = result.error || "خطا در ذخیره محصول.";
    }
  });

  cancelBtn.addEventListener("click", resetForm);

  await loadProducts();
}

initLogin();
initPanel();
