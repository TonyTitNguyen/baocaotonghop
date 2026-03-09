// URL Web App của Google Apps Script
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwrESmHffRNZvxjkqDpOlOMPvM-CjyLvzhfHOzNGpVheN4eWlBvhUbLKLVGw59pCNk/exec";

// Dữ liệu mô tả tĩnh cho từng tháng
const MONTHLY_COMMENTS = {
    1: "Chiến lược T1: Tập trung đẩy mạnh doanh thu đầu năm.",
    2: "Chiến lược T2: Tối ưu hóa phễu Marketing sau Tết.",
    3: "Chiến lược T3: Ưu tiên tăng số khách tại các cơ sở có bill tốt."
};

// Lưu trữ dữ liệu sau khi tải
let DATA_BY_MONTH = {};