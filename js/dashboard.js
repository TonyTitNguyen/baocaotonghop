// js/dashboard.js

// 1. Khai báo biến trạng thái toàn cục
let currentMonth = 3;
let currentYear = 2026;
let currentBrand = 'all';

// 2. Hàm khởi tạo bộ chọn tháng (T1 -> T12)
function initMonthSelector() {
    const container = document.getElementById('month-selector');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 1; i <= 12; i++) {
        const btn = document.createElement('button');
        btn.id = `btn-m${i}`;
        // Gán class dựa trên tháng đang chọn
        btn.className = `month-btn px-3 py-1 text-xs font-bold rounded-lg transition-all ${i === currentMonth ? 'bg-zen-tea text-white shadow-sm' : 'text-gray-500 hover:bg-white hover:text-zen-tea'}`;
        btn.innerText = `T${i}`;
        btn.onclick = () => setMonth(i);
        container.appendChild(btn);
    }
}

// 3. Hàm lọc theo thương hiệu (Dùng cho sidebar onclick)
function filterBrand(brand) {
    currentBrand = brand;
    // Cập nhật trạng thái Active trên Sidebar
    document.querySelectorAll('.sidebar-item').forEach(el => {
        if (el.getAttribute('data-brand') === brand) el.classList.add('active');
        else el.classList.remove('active');
    });
    // Render lại Dashboard với Brand mới
    updateDashboard();
}

// 4. Hàm chuyển đổi tháng
async function setMonth(month) {
    currentMonth = month;

    // Cập nhật giao diện nút bấm tháng
    document.querySelectorAll('.month-btn').forEach((btn, idx) => {
        if ((idx + 1) === month) {
            btn.classList.add('bg-zen-tea', 'text-white');
            btn.classList.remove('text-gray-500');
        } else {
            btn.classList.remove('bg-zen-tea', 'text-white');
            btn.classList.add('text-gray-500');
        }
    });

    const titleEl = document.getElementById('pageTitle');
    titleEl.innerHTML = `Đang tải T${month}... <i data-lucide="loader-2" class="w-4 h-4 inline animate-spin"></i>`;
    if (window.lucide) lucide.createIcons();

    // Gọi API từ data-engine.js
    const success = await loadSpreadsheetData(month, currentYear);
    const monthPack = DATA_BY_MONTH[month];

    // Kiểm tra xem có dữ liệu thực tế không (bỏ qua header)
    const hasData = success && monthPack && monthPack.rawJson && monthPack.rawJson.length > 1;

    if (!hasData) {
        // Nếu không có data -> Ẩn các section và báo lỗi
        document.querySelectorAll('.section-to-hide').forEach(el => el.style.display = 'none');
        document.getElementById('consultant-content').innerHTML = `<p class="text-red-500 font-bold">Chưa có dữ liệu cho Tháng ${month}.</p>`;
        titleEl.innerHTML = `Tổng Quan Tháng ${month}/${currentYear}`;

        // Reset các số KPI về 0
        ["kpi-revenue", "kpi-customers", "kpi-ads", "kpi-bill"].forEach(id => {
            document.getElementById(id).innerText = "0";
        });
    } else {
        // Nếu có data -> Hiện lại và Render
        document.querySelectorAll('.section-to-hide').forEach(el => el.style.display = 'block');
        titleEl.innerHTML = `Tổng Quan Tháng <span id="displayMonth">${month}</span>/<span id="displayYear">${currentYear}</span>`;
        document.getElementById('consultant-content').innerHTML = MONTHLY_COMMENTS[month] || "Đang cập nhật nhận định...";
        updateDashboard();
    }
}

// 5. Hàm cập nhật toàn bộ giao diện
function updateDashboard() {
    const monthPack = DATA_BY_MONTH[currentMonth];
    if (!monthPack) return;

    // Lấy data đã lọc từ data-engine.js
    const unified = getUnifiedBranchData(monthPack, currentBrand);
    const raw = parseRawData(monthPack.rawJson);

    // Tính toán KPI Tổng
    const totalRev = unified.reduce((s, b) => s + b.revenue, 0);
    const totalCust = unified.reduce((s, b) => s + b.customers, 0);
    const totalAds = unified.reduce((s, b) => s + b.ads, 0);
    const avgBill = totalCust > 0 ? Math.round(totalRev / totalCust) : 0;

    // Chạy hiệu ứng nhảy số
    animateValue("kpi-revenue", totalRev);
    animateValue("kpi-customers", totalCust);
    animateValue("kpi-ads", totalAds);
    animateValue("kpi-bill", avgBill);

    // Gọi các hàm vẽ từ charts.js
    renderMainChart(raw, currentMonth, currentYear);
    renderMarketingFunnels(parseMarketingData(monthPack.marketingJson));
    renderBranchCards(unified.sort((a, b) => b.revenue - a.revenue));
    renderAdsTable(unified);

    if (window.lucide) lucide.createIcons();

    // Trigger reveal animations
    setTimeout(() => {
        document.querySelectorAll('.reveal-on-scroll').forEach((el, index) => {
            setTimeout(() => el.classList.add('is-visible'), index * 50);
        });
    }, 100);
}

// 6. Hàm hiệu ứng nhảy số và Auto-fit chữ
function animateValue(id, end) {
    const obj = document.getElementById(id);
    if (!obj) return;
    const start = parseInt(obj.innerText.replace(/\D/g, '')) || 0;

    const duration = 800;
    const range = end - start;
    let current = start;
    const steps = 20;
    const stepVal = range / steps;
    let stepCount = 0;

    const timer = setInterval(() => {
        stepCount++;
        current += stepVal;
        obj.innerText = new Intl.NumberFormat('vi-VN').format(Math.round(current));
        autoFitText(obj);

        if (stepCount >= steps) {
            obj.innerText = new Intl.NumberFormat('vi-VN').format(end);
            autoFitText(obj);
            clearInterval(timer);
        }
    }, 30);
}

function autoFitText(element) {
    if (!element) return;
    element.style.fontSize = '';
    let fontSize = parseFloat(window.getComputedStyle(element).fontSize);
    const parentWidth = element.parentElement.clientWidth;
    // Giảm size nếu bề ngang chữ vượt quá 85% khung chứa
    while (element.scrollWidth > parentWidth * 0.85 && fontSize > 14) {
        fontSize -= 1;
        element.style.fontSize = fontSize + 'px';
    }
}

// 7. Khởi chạy hệ thống khi trang load xong
window.onload = () => {
    console.log("🚀 Dashboard Core Loaded");

    // 1. Khởi tạo UI
    initMonthSelector();
    setMonth(3); // Mặc định load tháng 3

    // 2. Gắn sự kiện cho nút mở Panel AI (Sparkles Icon)
    const aiBtn = document.getElementById('aiPanelToggleBtn');
    if (aiBtn) {
        aiBtn.addEventListener('click', toggleAIPanel);
    }

    // 3. Gắn sự kiện cho nút gửi tin nhắn trong Chatbot
    const aiSendBtn = document.getElementById('aiSendBtn');
    const aiInput = document.getElementById('aiInput');

    if (aiSendBtn) {
        aiSendBtn.onclick = () => handleUserSubmit();
    }

    if (aiInput) {
        aiInput.onkeypress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleUserSubmit();
            }
        };
    }
};

// Đảm bảo hàm này nằm ngoài window.onload để HTML có thể gọi được
function toggleAIPanel() {
    const panel = document.getElementById('aiCommandPanel');
    if (panel) {
        panel.classList.toggle('ai-panel-open');
        console.log("Toggle AI Panel");
    }
}

function closeAIPanel() {
    const panel = document.getElementById('aiCommandPanel');
    if (panel) {
        panel.classList.remove('ai-panel-open');
    }
}

// 8. Các hàm điều khiển Panel AI (Cần để không lỗi onclick)
function toggleAIPanel() {
    document.getElementById('aiCommandPanel').classList.toggle('ai-panel-open');
}
function closeAIPanel() {
    document.getElementById('aiCommandPanel').classList.remove('ai-panel-open');
}

// 9. Cầu dao Music
function toggleMusic() {
    const audio = document.getElementById('bgMusic');
    const icon = document.getElementById('musicIcon');
    if (!audio || !icon) return;

    if (audio.paused) {
        audio.play().then(() => {
            icon.setAttribute('data-lucide', 'volume-2');
            lucide.createIcons();
        }).catch(err => console.log('Autoplay bị chặn:', err));
    } else {
        audio.pause();
        icon.setAttribute('data-lucide', 'volume-x');
        lucide.createIcons();
    }
}