// Cổng Vercel Proxy (Sẽ tự định tuyến đến /api/index.js)
window.APPS_SCRIPT_URL = "https://tonytit-dashboard-api.vercel.app/api";

// (Đã xóa biến SECRET_AUTH_TOKEN vì Mật khẩu nay được giấu an toàn tuyệt đối trên Server Vercel)

// Lưu trữ dữ liệu sau khi tải
let DATA_BY_MONTH = {};