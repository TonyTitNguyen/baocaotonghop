// 0. Khởi tạo UI AI Assistant
document.addEventListener('DOMContentLoaded', () => {
    const chatArea = document.getElementById('aiChatArea');
    if (chatArea && chatArea.children.length === 0) {
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = "flex gap-3 mb-4 w-full";
        welcomeDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-zen-tea/10 flex items-center justify-center shrink-0 border border-zen-tea/20 mt-1"><i data-lucide="bot" class="w-4 h-4 text-zen-tea"></i></div>
            <div class="flex-1">
                <div class="bg-white p-4 rounded-2xl rounded-tl-sm border border-zen-gray/50 text-sm leading-relaxed shadow-sm">
                    <p class="font-bold text-zen-dark mb-2">Kính chào Sếp! Em là Trợ lý Điều hành AI.</p>
                    <p class="mb-3">Khác với chatbot thường, em dùng Query Engine để tính toán Metrics thực tế.</p>
                    <p class="font-semibold mb-1">Sếp hãy hỏi sâu về bất kỳ Metric nào (Doanh thu, Bill, Khách, CIR, Ads):</p>
                    <ul class="list-disc pl-5 space-y-1 text-zen-dark/80">
                        <li>"Cơ sở nào lãng phí ads nhất tháng 2?"</li>
                        <li>"So sánh bill trung bình hệ thống T1 và T2"</li>
                        <li>"Nơi nào đuối KPI nhất?"</li>
                    </ul>
                </div>
            </div>
        `;
        chatArea.appendChild(welcomeDiv);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    const suggestionsArea = document.getElementById('aiSuggestions');
    if (suggestionsArea) {
        suggestionsArea.innerHTML = `<span class="px-3 py-1.5 text-xs text-gray-400 italic flex items-center gap-2"><i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i> Đang tạo lệnh đề xuất...</span>`;
    }
});

// Hàm cập nhật Lệnh đề xuất tĩnh
function updateStaticSuggestions(month) {
    const suggestionsArea = document.getElementById('aiSuggestions');
    if (!suggestionsArea) return;

    const prevMonth = (parseInt(month) === 1) ? 12 : parseInt(month) - 1;

    const suggestions = [
        `Chi phí ads cao nhất T${month}?`,
        `So sánh KPI T${prevMonth} & T${month}`,
        `Cơ sở nào đông khách nhất Tháng ${month}?`
    ];

    suggestionsArea.innerHTML = suggestions.map(s => `
        <button onclick="handleUserSubmit('${s}')" class="shrink-0 px-3 py-1.5 bg-zen-bg border border-zen-gray text-xs rounded-lg hover:border-zen-tea hover:text-zen-tea transition-colors whitespace-nowrap">
            ${s}
        </button>
    `).join('');
}

// 1. Các hàm tiện ích
function normalizeText(text) {
    return text.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d").trim();
}

function formatMetric(val, metric) {
    if (['cir', 'percentKpi'].includes(metric)) return val.toFixed(1) + '%';
    return new Intl.NumberFormat('vi-VN').format(Math.round(val));
}

// [ĐÃ TỐI ƯU] Nâng cấp Markdown để xử lý list gạch đầu dòng từ Gemini
function formatMarkdown(text) {
    if (!text) return "";
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-zen-dark">$1</strong>') // In đậm
        .replace(/(?:^|\n)\* (.*?)(?=\n|$)/g, '<li class="ml-4 list-disc mt-1">$1</li>') // List dùng hoa thị
        .replace(/(?:^|\n)- (.*?)(?=\n|$)/g, '<li class="ml-4 list-disc mt-1">$1</li>') // List dùng gạch ngang
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // In nghiêng
        .replace(/\n/g, '<br>'); // Xuống dòng
}

// 2. Render tin nhắn AI UI
function renderUserMessage(text) {
    const chatArea = document.getElementById('aiChatArea');
    if (!chatArea) return;

    const safeText = document.createTextNode(text).textContent;
    const div = document.createElement('div');
    div.className = "flex gap-2 w-[85%] ml-auto flex-row-reverse mb-4";
    div.innerHTML = `<div class="bg-zen-tea text-white p-3 rounded-2xl rounded-tr-sm shadow-sm text-sm">${safeText}</div>`;
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function renderStructuredResponse(data) {
    const chatArea = document.getElementById('aiChatArea');
    if (!chatArea) return;

    const div = document.createElement('div');
    div.className = "flex gap-3 mb-4 w-full";

    let contentHtml = '';
    if (data.type === 'insight_card') {
        contentHtml = `
            <div class="bg-white rounded-2xl border border-zen-gray shadow-sm p-4 w-full">
                <div class="text-[10px] uppercase text-gray-400 font-bold mb-1">${data.preTitle}</div>
                <h4 class="text-base font-bold text-zen-dark mb-3">${data.title}</h4>
                <div class="grid grid-cols-2 gap-2 mb-3">
                    ${data.metrics.map(m => `<div class="bg-zen-bg p-2 rounded-lg"><div class="text-[9px] text-gray-400 uppercase">${m.label}</div><div class="font-bold text-sm text-zen-dark">${m.value}</div></div>`).join('')}
                </div>
                <div class="text-xs text-zen-dark/80 italic border-t pt-2">${data.insights[0]}</div>
            </div>`;
    } else {
        const formattedText = formatMarkdown(data.text);
        contentHtml = `<div class="bg-white p-3 rounded-2xl border border-zen-gray/50 text-sm leading-relaxed">${formattedText}</div>`;
    }

    div.innerHTML = `<div class="w-8 h-8 rounded-full bg-zen-tea/10 flex items-center justify-center shrink-0 border border-zen-tea/20 mt-1"><i data-lucide="bot" class="w-4 h-4 text-zen-tea"></i></div><div class="flex-1">${contentHtml}</div>`;
    chatArea.appendChild(div);

    if (typeof lucide !== 'undefined') lucide.createIcons();
    chatArea.scrollTop = chatArea.scrollHeight;
}

function renderLoadingState() {
    const chatArea = document.getElementById('aiChatArea');
    if (!chatArea) return null;

    const div = document.createElement('div');
    div.id = 'aiLoading';
    div.className = "flex gap-3 mb-4";
    div.innerHTML = `
        <div class="w-7 h-7 md:w-8 md:h-8 rounded-full bg-zen-tea/10 flex items-center justify-center shrink-0 border border-zen-tea/20"><i data-lucide="bot" class="w-3.5 h-3.5 md:w-4 md:h-4 text-zen-tea"></i></div>
        <div class="bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm border border-zen-gray/50 flex items-center gap-2">
            <span class="text-xs text-gray-500 italic" id="aiLoadingText">Đang phân tích dữ liệu...</span>
            <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
        </div>
    `;
    chatArea.appendChild(div);
    if (typeof lucide !== 'undefined') lucide.createIcons();
    chatArea.scrollTop = chatArea.scrollHeight;
    return div;
}

// 3. Xử lý khi Sếp nhấn gửi
const aiMemoryCache = {};
let isAILoading = false; // [ĐÃ TỐI ƯU] Khóa để chống Spam Click

async function handleUserSubmit(forcedText = null) {
    // Chặn nếu đang xử lý luồng trước đó
    if (isAILoading) return;

    const inputEl = document.getElementById('aiInput');
    const text = forcedText || inputEl.value.trim();
    if (!text) return;

    isAILoading = true; // Bật khóa
    if (inputEl) inputEl.value = '';
    renderUserMessage(text);

    // [ĐÃ TỐI ƯU] Dùng normalizeText để tăng tỷ lệ trúng Cache 
    // (VD: "Doanh thu?" và "doanh thu " giờ sẽ có chung 1 chìa khóa)
    const normalizedKeyInput = normalizeText(text);
    const memoryKey = `${normalizedKeyInput}_${currentMonth}_${currentYear}`;

    // 1. KIỂM TRA TRÍ NHỚ TRƯỚC TIÊN
    if (typeof aiMemoryCache !== 'undefined' && aiMemoryCache[memoryKey]) {
        const cachedAnswer = aiMemoryCache[memoryKey];
        renderStructuredResponse({ type: 'text', text: cachedAnswer });
        isAILoading = false; // Mở khóa
        return;
    }

    // 2. NẾU CHƯA CÓ TRONG TRÍ NHỚ THÌ MỚI ĐI HỎI GEMINI
    const loadingDiv = renderLoadingState();

    try {
        // [FIX Ở ĐÂY] Dùng hàm parseIntent để soi xem Sếp đang hỏi đích danh tháng mấy
        const parsed = parseIntent(text);
        const queryMonth = parsed.monthTo;
        const queryMonthFrom = parsed.monthFrom;

        // Truyền chính xác tháng Sếp muốn hỏi lên cho Apps Script
        const response = await fetch(`${APPS_SCRIPT_URL}?action=chat&q=${encodeURIComponent(text)}&month=${queryMonth}&monthFrom=${queryMonthFrom}&year=${currentYear}`, {
            method: 'GET',
            redirect: 'follow'
        });

        if (!response.ok) throw new Error("Mạng hoặc máy chủ gặp sự cố");

        // SỬA: Nhận dữ liệu dưới dạng JSON thay vì Text
        const aiData = await response.json();
        const aiText = aiData.text;

        if (loadingDiv) loadingDiv.remove();

        // LƯU ĐÁP ÁN MỚI VÀO SỔ TAY ĐỂ DÙNG CHO LẦN SAU
        if (typeof aiMemoryCache !== 'undefined') {
            aiMemoryCache[memoryKey] = aiText;
        }

        renderStructuredResponse({ type: 'text', text: aiText });

        // 👉 SỬA LẠI: Chỉ lưu vào Sheet nếu backend xác nhận đây là kết quả mới hỏi Gemini
        if (typeof logInteractionToSheet === 'function' && aiData.isCached === false) {
            logInteractionToSheet(text, aiText);
        }
    } catch (e) {
        console.error(e);
        if (loadingDiv) loadingDiv.remove();
        renderStructuredResponse({
            type: 'text',
            text: "Lỗi kết nối với trí tuệ nhân tạo Gemini. Sếp kiểm tra lại kết nối mạng hoặc Apps Script nhé!"
        });
    } finally {
        isAILoading = false; // Mở khóa dù có lỗi hay thành công
    }
}

// 4. Global function
window.executeAIAction = function (actionObjRaw) {
    try {
        const action = typeof actionObjRaw === 'string' ? JSON.parse(decodeURIComponent(actionObjRaw)) : actionObjRaw;
        if (!action) return;

        if (action.type === 'ask') {
            handleUserSubmit(action.payload);
        } else if (action.type === 'locate_branch') {
            if (action.month && typeof setMonth === 'function' && action.month !== currentMonth) setMonth(action.month);
            if (action.brand && typeof filterBrand === 'function' && action.brand !== currentBrand) filterBrand(action.brand);
            requestAnimationFrame(() => {
                if (typeof scrollToAndHighlight === 'function') setTimeout(() => scrollToAndHighlight(action.branch), 500);
            });
        }
    } catch (e) {
        console.error("Lỗi khi thực thi lệnh AI:", e);
    }
};