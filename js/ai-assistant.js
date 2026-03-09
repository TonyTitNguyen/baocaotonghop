// js/ai-assistant.js

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

// Chuyển đổi Markdown của Gemini (như **in đậm**, *in nghiêng*) thành HTML để hiển thị đẹp hơn
function formatMarkdown(text) {
    if (!text) return "";
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-zen-dark">$1</strong>') // In đậm
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // In nghiêng
        .replace(/\n/g, '<br>'); // Xuống dòng
}

/* // Note: Vì backend (Apps Script + Gemini) hiện đang xử lý NLP, 
// hàm parseIntent nội bộ này tạm thời không cần dùng đến nữa.
function parseIntent(q) { ... } 
*/

// 2. Render tin nhắn AI UI
function renderUserMessage(text) {
    const chatArea = document.getElementById('aiChatArea');
    if (!chatArea) return;

    // Bảo mật: Dùng createTextNode để tránh lỗi XSS (mã độc HTML) khi render text của user
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
        // Áp dụng format markdown cho tin nhắn văn bản thông thường từ Gemini
        const formattedText = formatMarkdown(data.text);
        contentHtml = `<div class="bg-white p-3 rounded-2xl border border-zen-gray/50 text-sm leading-relaxed">${formattedText}</div>`;
    }

    div.innerHTML = `<div class="w-8 h-8 rounded-full bg-zen-tea/10 flex items-center justify-center shrink-0 border border-zen-tea/20 mt-1"><i data-lucide="bot" class="w-4 h-4 text-zen-tea"></i></div><div class="flex-1">${contentHtml}</div>`;
    chatArea.appendChild(div);

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
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

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    chatArea.scrollTop = chatArea.scrollHeight;
    return div;
}

// 3. Xử lý khi Sếp nhấn gửi
async function handleUserSubmit(forcedText = null) {
    const inputEl = document.getElementById('aiInput');
    const text = forcedText || inputEl.value.trim();
    if (!text) return;

    if (inputEl) inputEl.value = '';
    renderUserMessage(text);

    const loadingDiv = renderLoadingState();

    try {
        // Gọi Apps Script với method GET
        const response = await fetch(`${APPS_SCRIPT_URL}?action=chat&q=${encodeURIComponent(text)}&month=${currentMonth}&year=${currentYear}`, {
            method: 'GET',
            redirect: 'follow' // Quan trọng để tránh lỗi CORS do chuyển hướng
        });

        if (!response.ok) throw new Error("Mạng hoặc máy chủ gặp sự cố");

        const aiText = await response.text();

        loadingDiv.remove();

        renderStructuredResponse({
            type: 'text',
            text: aiText
        });

    } catch (e) {
        console.error(e);
        if (loadingDiv) loadingDiv.remove();
        renderStructuredResponse({
            type: 'text',
            text: "Lỗi kết nối với trí tuệ nhân tạo Gemini. Sếp kiểm tra lại kết nối mạng hoặc Apps Script nhé!"
        });
    }
}

// 4. Global function để gọi từ quick-chips trên Dashboard HTML
window.executeAIAction = function (actionObjRaw) {
    try {
        // Đảm bảo parse đúng object được truyền từ HTML attribute onclick
        const action = typeof actionObjRaw === 'string' ? JSON.parse(decodeURIComponent(actionObjRaw)) : actionObjRaw;
        if (!action) return;

        if (action.type === 'ask') {
            handleUserSubmit(action.payload);
        } else if (action.type === 'locate_branch') {
            // (Giữ lại logic này nếu dashboard của bạn vẫn có tính năng bấm nút để cuộn tới nhánh)
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