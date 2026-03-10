// Tự động chọn API: Local Dev (localhost:3001) hoặc Production (Vercel)
const _isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
window.APPS_SCRIPT_URL = _isLocal
    ? 'http://localhost:3001/api'       // node api/local-server.js — đọc .env
    : 'https://tonytit-dashboard-api.vercel.app/api';  // Vercel proxy (bí mật ẩn server-side)

// Lưu trữ dữ liệu sau khi tải
let DATA_BY_MONTH = {};