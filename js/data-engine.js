// js/data-engine.js

function cleanNumber(str) {
    if (!str) return 0;
    return parseFloat(String(str).replace(/,/g, '').trim()) || 0;
}

async function loadSpreadsheetData(monthId, yearId) {
    const cacheKey = `${monthId}_${yearId}`;

    // 1. Kiểm tra RAM Cache
    if (DATA_BY_MONTH[cacheKey] && DATA_BY_MONTH[cacheKey].isFetched) return true;

    // 2. Kiểm tra LocalStorage Cache (Nhanh như chớp)
    const localStoreStr = localStorage.getItem(`TonyTit_Data_${cacheKey}`);
    if (localStoreStr) {
        try {
            DATA_BY_MONTH[cacheKey] = JSON.parse(localStoreStr);
            DATA_BY_MONTH[cacheKey].isFetched = true;

            // Background fetch để cập nhật số mới từ GG Sheet (Stale-while-revalidate)
            fetchAndUpdateInBackground(monthId, yearId, cacheKey);
            return true; // Trả về true ngay lập tức để render UI từ cache
        } catch (e) { console.error("Cache parse error", e); }
    }

    // 3. Nếu chưa có bất kỳ Data nào, sẽ phải Fetch (Có thể chờ 2-3s)
    return await fetchAndUpdateInBackground(monthId, yearId, cacheKey);
}

// Phân tách Logic gọi API để tái sử dụng
async function fetchAndUpdateInBackground(monthId, yearId, cacheKey) {
    try {
        const response = await fetch(`${APPS_SCRIPT_URL}?month=${monthId}&year=${yearId}`);
        if (!response.ok) throw new Error("Network error");
        const json = await response.json();

        if (json.raw && json.raw.length > 0) {
            DATA_BY_MONTH[cacheKey] = {
                rawJson: json.raw || [],
                adsJson: json.ads || [],
                marketingJson: json.marketing || [],
                isFetched: true
            };
            // Cất vào tủ lạnh (LocalStorage) — tách try/catch riêng để quota error không ảnh hưởng return value
            try {
                localStorage.setItem(`TonyTit_Data_${cacheKey}`, JSON.stringify(DATA_BY_MONTH[cacheKey]));
            } catch (storageErr) {
                console.warn("LocalStorage quota exceeded, running from RAM only:", storageErr);
            }

            // (Tùy chọn) Bắn ra sự kiện nếu cần Reload nhẹ UI
            window.dispatchEvent(new CustomEvent('dashboardDataRefreshed', { detail: { month: monthId, year: yearId } }));
            return true;
        }
        return false;
    } catch (e) {
        console.error("Background Fetch failed:", e);
        return false;
    }
}

// Hàm tải trước (preload) dữ liệu của tháng trước và tháng sau
function preloadAdjacentMonths(month, year) {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    // Gọi tải ngầm không await để không block UI chính
    loadSpreadsheetData(prevMonth, prevYear).catch(() => { });
    loadSpreadsheetData(nextMonth, nextYear).catch(() => { });
}

function parseRawData(rawArray) {
    const data = [];
    rawArray.forEach(row => {
        const cols = Object.values(row);
        if (cols.length < 5) return;
        const dateStr = String(cols[2]).trim();
        const parts = dateStr.split('/');
        if (parts.length >= 2) {
            data.push({
                brand: String(cols[0]).toUpperCase(),
                branch: String(cols[1]).toUpperCase(),
                day: parseInt(parts[0]),
                revenue: cleanNumber(cols[4]),
                customers: cleanNumber(cols[3])
            });
        }
    });
    return data;
}

function parseMarketingData(mktArray) {
    const data = [];
    if (!mktArray) return data;
    mktArray.forEach(row => {
        const cols = Object.values(row).map(String);
        if (cols.length < 8 || cols[0].toLowerCase().includes('cơ sở')) return;
        data.push({
            brand: cols[0].toUpperCase().trim(),
            branch: cols[1].toUpperCase().trim(),
            name: `${cols[0]} ${cols[1]}`,
            leads: cleanNumber(cols[2]),
            phones: cleanNumber(cols[3]),
            arrived: cleanNumber(cols[4]),
            rate1: cols[6],
            rate2: cols[7]
        });
    });
    return data;
}

function getUnifiedBranchData(monthPack, brandFilter = 'all') {
    if (!monthPack || !monthPack.adsJson) return [];
    const branchMap = {};
    monthPack.adsJson.forEach(row => {
        const cols = Object.values(row);
        if (cols.length < 9) return;
        const brand = String(cols[0]).toUpperCase().trim();
        const branch = String(cols[1]).toUpperCase().trim();
        if (brandFilter !== 'all' && brand !== brandFilter) return;

        branchMap[branch] = {
            brand, branch,
            revenue: cleanNumber(cols[2]),
            target: cleanNumber(cols[3]),
            customers: cleanNumber(cols[5]),
            ads: cleanNumber(cols[7]),
            breakeven: cleanNumber(cols[8]),
            cir: 0, percentKpi: 0
        };
        branchMap[branch].cir = branchMap[branch].revenue > 0 ? (branchMap[branch].ads / branchMap[branch].revenue) * 100 : 0;
        branchMap[branch].percentKpi = branchMap[branch].target > 0 ? (branchMap[branch].revenue / branchMap[branch].target) * 100 : 0;
    });
    return Object.values(branchMap);
}