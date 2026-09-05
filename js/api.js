/* =========================================================
   api.js
   واسط ارتباط با Google Apps Script (که به گوگل‌شیت وصل است).
   فقط کافیست مقدار API_URL را بعد از Deploy کردن Apps Script
   با آدرس Web App خودت جایگزین کنی.
   ========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbxhgSgfF4aLT0i-MJs1ZkkA4X5UgGKMcNwN15v3zxDjhX_z0o23KFvBoaTnAOCLbrR-/exec";

async function apiGet(params) {
  const url = new URL(API_URL);
  Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  return res.json();
}

async function apiPost(payload) {
  // توجه: Content-Type را عمداً روی text/plain گذاشته‌ایم تا مرورگر
  // درخواست preflight (OPTIONS) نفرستد — Apps Script به OPTIONS جواب
  // نمی‌دهد و بدون این ترفند درخواست با خطای CORS مواجه می‌شود.
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  return res.json();
}
