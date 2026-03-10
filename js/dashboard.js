// js/dashboard.js

// 1. Khai báo biến trạng thái toàn cục
const today = new Date();
let currentMonth = today.getMonth() + 1; // JS getMonth() chạy từ 0-11
let currentYear = today.getFullYear();
let currentBrand = 'all';

// 2. Hàm khởi tạo bộ chọn Tháng và Năm
function initMonthSelector() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    if (!monthSelect || !yearSelect) return;

    monthSelect.innerHTML = '';
    yearSelect.innerHTML = '';

    // Tạo Option cho Tháng (1-12)
    for (let i = 1; i <= 12; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.innerText = `Tháng ${i}`;
        if (i === currentMonth) opt.selected = true;
        monthSelect.appendChild(opt);
    }

    // Tạo Option cho Năm (từ 2024 đến 2050)
    for (let y = 2024; y <= 2050; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.innerText = `Năm ${y}`;
        if (y === currentYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }
}

// Hàm lắng nghe sự kiện khi Dropdown thay đổi
function handleDateChange() {
    const m = parseInt(document.getElementById('monthSelect').value);
    const y = parseInt(document.getElementById('yearSelect').value);

    // Nếu có sự thay đổi thực sự
    if (m !== currentMonth || y !== currentYear) {
        currentYear = y;
        setMonth(m);
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

// 4. Hàm chuyển đổi tháng và tải dữ liệu
async function setMonth(month) {
    currentMonth = month;

    // Đồng bộ lại UI Dropdown nếu hàm này được gọi từ nơi khác (ví dụ code cũ)
    const monthSelect = document.getElementById('monthSelect');
    if (monthSelect) monthSelect.value = month;

    const titleEl = document.getElementById('pageTitle');
    titleEl.innerHTML = `Đang tải T${month}... <i data-lucide="loader-2" class="w-4 h-4 inline animate-spin"></i>`;
    if (window.lucide) lucide.createIcons();

    // Gọi API từ data-engine.js
    const success = await loadSpreadsheetData(month, currentYear);
    const cacheKey = `${month}_${currentYear}`;
    const monthPack = DATA_BY_MONTH[cacheKey];

    // Kiểm tra xem có dữ liệu thực tế không (phải đúng tháng)
    let hasData = false;
    if (success && monthPack && monthPack.rawJson && monthPack.rawJson.length > 1) {
        // Lấy thử một vài dòng đầu tiên (bỏ qua dòng 0 là header)
        for (let i = 1; i < Math.min(5, monthPack.rawJson.length); i++) {
            const cols = Object.values(monthPack.rawJson[i]);
            if (cols.length >= 3) {
                const dateStr = String(cols[2]).trim();
                const parts = dateStr.split('/');
                if (parts.length >= 2) {
                    if (parseInt(parts[1]) === month) {
                        hasData = true;
                        break;
                    }
                }
            }
        }
    }

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
        updateDashboard();

        // --- CHẠY NGẦM GỌI GEMINI ---
        // Gọi thẳng AI để lấy nhận định thật
        setTimeout(() => fetchAISummary(month, currentYear), 500);

        // Cập nhật Lệnh Đề Xuất tĩnh theo tháng
        if (typeof updateStaticSuggestions === 'function') updateStaticSuggestions(month);
    }
}

// 4.5 Hàm kết nối AI ngầm - gọi Gemini thực tế
async function fetchAISummary(month, year) {
    const consultantBox = document.getElementById('consultant-content');
    if (!consultantBox) return;

    const summaryKey = `summary_${month}_${year}`;

    // Kiểm tra cache trước
    if (typeof aiMemoryCache !== 'undefined' && aiMemoryCache[summaryKey]) {
        consultantBox.innerHTML = aiMemoryCache[summaryKey];
        if (window.lucide) lucide.createIcons();
        return;
    }

    // Hiện trạng thái loading
    consultantBox.innerHTML = `<span class="text-xs text-gray-400 italic flex items-center gap-2"><i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i> Đang phân tích dữ liệu tháng ${month}/${year}...</span>`;
    if (window.lucide) lucide.createIcons();

    const question = `Phân tích tổng quan kết quả kinh doanh tháng ${month}/${year}: doanh thu, lượng khách, TBB, CIR từng cơ sở. Đưa ra nhận định và đề xuất chiến lược ngắn gọn.`;

    try {
        const response = await fetch(`${APPS_SCRIPT_URL}?action=chat&q=${encodeURIComponent(question)}&month=${month}&monthFrom=${month}&year=${year}`, {
            method: 'GET',
            redirect: 'follow'
        });
        if (!response.ok) throw new Error("Network error");
        const aiData = await response.json();
        const html = typeof formatMarkdown === 'function' ? formatMarkdown(aiData.text || '') : (aiData.text || '');
        consultantBox.innerHTML = `
            <h4 class="font-bold text-base text-zen-dark uppercase mb-3">TÓM TẮT PHÂN TÍCH THÁNG ${month}/${year}</h4>
            <div class="text-zen-dark/80 space-y-1">${html}</div>`;
        if (window.lucide) lucide.createIcons();

        // Lưu cache
        if (typeof aiMemoryCache !== 'undefined' && aiData.text && !aiData.text.includes("Lỗi")) {
            if (typeof setCacheEntry === 'function') setCacheEntry(summaryKey, consultantBox.innerHTML);
            else aiMemoryCache[summaryKey] = consultantBox.innerHTML;
        }
    } catch (e) {
        consultantBox.innerHTML = `<p class="text-gray-400 italic text-sm">Không thể tải phân tích AI. Kiểm tra kết nối mạng.</p>`;
    }
}

// 5. Hàm cập nhật toàn bộ giao diện
function updateDashboard() {
    const cacheKey = `${currentMonth}_${currentYear}`;
    const monthPack = DATA_BY_MONTH[cacheKey];
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

    // Trigger reveal animations via IntersectionObserver
    observeRevealElements();
}

// 6. Hàm hiệu ứng nhảy số và Auto-fit chữ
function animateValue(id, end) {
    const obj = document.getElementById(id);
    if (!obj) return;
    const start = parseInt(obj.innerText.replace(/\D/g, '')) || 0;
    const range = end - start;
    let current = start;
    const steps = 20;
    const stepVal = range / steps;
    let stepCount = 0;

    const timer = setInterval(() => {
        stepCount++;
        current += stepVal;
        if (stepCount >= steps) {
            obj.innerText = new Intl.NumberFormat('vi-VN').format(end);
            autoFitText(obj);
            clearInterval(timer);
        } else {
            obj.innerText = new Intl.NumberFormat('vi-VN').format(Math.round(current));
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

// 7. IntersectionObserver cho hiệu ứng reveal
let revealObserver = null;

function initRevealObserver() {
    revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
}

function observeRevealElements() {
    if (!revealObserver) return;
    document.querySelectorAll('.reveal-on-scroll').forEach(el => {
        el.classList.remove('is-visible');
        revealObserver.observe(el);
    });
}

// 8. Phân tích intent tháng từ câu hỏi (dùng cho AI chat)
function parseIntent(text) {
    const normalized = text.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d").trim();
    const months = [];
    const matches = [...normalized.matchAll(/(?:thang|t)[\s]?(\d{1,2})/g)];
    matches.forEach(m => {
        const month = parseInt(m[1]);
        if (month >= 1 && month <= 12) months.push(month);
    });
    const monthTo = months.length > 0 ? months[months.length - 1] : currentMonth;
    const monthFrom = months.length > 1 ? months[0] : (monthTo === 1 ? 12 : monthTo - 1);
    return { monthFrom, monthTo };
}

// 9. Cuộn tới và highlight thẻ cơ sở
function scrollToAndHighlight(branchName) {
    if (!branchName) return;
    const cards = document.querySelectorAll('#branchContainer > div');
    for (const card of cards) {
        const heading = card.querySelector('h4');
        if (heading && heading.textContent.trim().toUpperCase().includes(branchName.toUpperCase())) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('ring-2', 'ring-zen-tea', 'ring-offset-2');
            setTimeout(() => card.classList.remove('ring-2', 'ring-zen-tea', 'ring-offset-2'), 3000);
            return;
        }
    }
}

// 10. Khởi chạy hệ thống khi trang load xong
window.onload = () => {
    // 1. Khởi tạo UI
    initMonthSelector();
    initRevealObserver();
    setMonth(currentMonth); // Mặc định load tháng hiện tại

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

// 8. Các hàm điều khiển Panel AI
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

// 10. Hàm lưu lịch sử
function logInteractionToSheet(questionText, answerObject) {
    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
            question: questionText,
            answer: answerObject
        })
    }).catch(e => console.error("Lỗi lưu lịch sử:", e));
}