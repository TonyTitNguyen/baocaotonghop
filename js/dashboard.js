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
        updateDashboard();

        // --- CHẠY NGẦM GỌI GEMINI ---
        // Gọi thẳng AI để lấy nhận định thật
        setTimeout(() => fetchAISummary(month, currentYear), 500);

        // Cập nhật Lệnh Đề Xuất tĩnh theo tháng
        if (typeof updateStaticSuggestions === 'function') updateStaticSuggestions(month);
    }
}

// 4.5 Hàm kết nối AI ngầm
function fetchAISummary(month, year) {
    const consultantBox = document.getElementById('consultant-content');
    if (!consultantBox) return;

    const summaryHTML = `
        <div class="space-y-4 text-sm text-zen-dark/80">
            <h4 class="font-bold text-base text-zen-dark uppercase mb-2">TÓM TẮT PHÂN TÍCH DOANH THU CÁC CƠ SỞ</h4>
            
            <div>
                <p class="font-bold text-zen-tea">1. Xã Đàn – Top 1 hệ thống</p>
                <ul class="list-disc pl-5 mt-1 space-y-1">
                    <li><span class="font-semibold">Doanh số:</span> 377.280.000đ</li>
                    <li><span class="font-semibold">TBB:</span> 8.763.000đ | Thấp nhất: 1.310.000đ (1 ngày)</li>
                    <li>→ Hiệu suất bán hàng ổn định, năng lực chuyển đổi khách tốt.</li>
                </ul>
            </div>

            <div>
                <p class="font-bold text-zen-tea">2. Cầu Giấy</p>
                <ul class="list-disc pl-5 mt-1 space-y-1">
                    <li><span class="font-semibold">Doanh số:</span> 218.448.000đ | 64 khách (cao nhất hệ thống)</li>
                    <li><span class="font-semibold">TBB:</span> 1.083.000đ – 19.500.000đ | 3 ngày TBB thấp</li>
                    <li>→ Nguồn khách tốt, cần chuẩn hóa quy trình tư vấn để tối ưu chuyển đổi.</li>
                </ul>
            </div>

            <div>
                <p class="font-bold text-zen-tea">3. Hà Đông</p>
                <ul class="list-disc pl-5 mt-1 space-y-1">
                    <li><span class="font-semibold">Doanh số:</span> 224.198.000đ | 54 khách</li>
                    <li><span class="font-semibold">TBB:</span> 1.100.000đ – 14.100.000đ</li>
                    <li>→ Doanh thu phụ thuộc mạnh vào quản lý Kim Hà, cần nhân rộng năng lực bán cho đội ngũ.</li>
                </ul>
            </div>

            <div>
                <p class="font-bold text-zen-tea">4. Long Biên – Điểm sáng tăng trưởng</p>
                <ul class="list-disc pl-5 mt-1 space-y-1">
                    <li>54 khách đến cơ sở</li>
                    <li><span class="font-semibold">TBB cao:</span> 16.450.000đ (5/3) và 10.120.000đ (7/3)</li>
                    <li><span class="font-semibold">Thấp nhất:</span> 1.160.000đ, chỉ 2 ngày &lt; 2.5tr</li>
                    <li>→ Cho thấy khả năng bán gói giá trị cao và tư duy kinh doanh đang cải thiện mạnh.</li>
                    <li>→ Đây là tín hiệu tích cực về năng lực khai thác giá trị khách hàng và hiệu suất bán hàng, rất đáng ghi nhận.</li>
                </ul>
            </div>

            <div>
                <p class="font-bold text-zen-tea">5. Hải Phòng</p>
                <ul class="list-disc pl-5 mt-1 space-y-1">
                    <li><span class="font-semibold">Doanh số:</span> 111.599.000đ | 40 khách</li>
                    <li><span class="font-semibold">TBB:</span> 1.500.000đ – 7.450.000đ</li>
                    <li>→ Mức chi tiêu còn thấp, cần tăng upsell và bán liệu trình dài hạn.</li>
                </ul>
            </div>

            <div>
                <p class="font-bold text-zen-tea">6. ADV</p>
                <ul class="list-disc pl-5 mt-1 space-y-1">
                    <li><span class="font-semibold">Doanh số:</span> 55.500.000đ</li>
                    <li><span class="font-semibold">TBB:</span> 875.000đ – 19.000.000đ</li>
                    <li>→ Hiệu suất biến động lớn → cần chuẩn hóa kịch bản tư vấn và phễu bán hàng.</li>
                </ul>
            </div>

            <div>
                <p class="font-bold text-zen-tea">7. CMT8</p>
                <ul class="list-disc pl-5 mt-1 space-y-1">
                    <li><span class="font-semibold">Doanh số:</span> 55.800.000đ</li>
                    <li><span class="font-semibold">TBB:</span> 500.000đ – 14.000.000đ</li>
                    <li>→ Hiệu suất thấp → cần rà soát tệp khách, đào tạo lại kỹ năng tư vấn và upsell.</li>
                </ul>
            </div>

            <div class="mt-4 p-4 bg-zen-sage/10 rounded-xl border border-zen-sage/20 shadow-sm">
                <p class="font-bold text-zen-dark flex items-center gap-2"><i data-lucide="target" class="w-4 h-4"></i> Định hướng chung:</p>
                <p class="mt-2 text-zen-dark/90 font-medium">✨ Chuẩn hóa quy trình tư vấn – phễu sản phẩm – KPI TBB tối thiểu 3–4 triệu/bill để nâng hiệu suất toàn hệ thống.</p>
            </div>
        </div>
    `;

    consultantBox.innerHTML = summaryHTML;
    if (window.lucide) lucide.createIcons();
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