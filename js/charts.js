// js/charts.js
var chartInstances = {};
var funnelChartInstances = {};

function renderMainChart(dailyData, month, year) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    const daysInMonth = new Date(year, month, 0).getDate();
    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const revData = new Array(daysInMonth).fill(0);
    const custData = new Array(daysInMonth).fill(0);

    dailyData.forEach(d => {
        if (d.day <= daysInMonth) {
            revData[d.day - 1] += d.revenue;
            custData[d.day - 1] += d.customers;
        }
    });

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(67, 94, 1, 0.3)');
    gradient.addColorStop(1, 'rgba(67, 94, 1, 0)');

    if (chartInstances.main) chartInstances.main.destroy();
    chartInstances.main = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Doanh Thu', data: revData, borderColor: '#435E01',
                    backgroundColor: gradient, fill: true, tension: 0.4, yAxisID: 'y'
                },
                {
                    label: 'Khách', data: custData, type: 'bar',
                    backgroundColor: 'rgba(34, 197, 94, 0.2)', borderRadius: 4, yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', align: 'end' } },
            scales: {
                x: { grid: { display: false } },
                y: { type: 'linear', position: 'left', ticks: { callback: v => v / 1000000 + 'M' } },
                y1: { display: false }
            }
        }
    });
}

function renderMarketingFunnels(data) {
    const container = document.getElementById('marketingContainer');
    if (!container) return;
    container.innerHTML = '';
    Object.values(funnelChartInstances).forEach(c => c.destroy());
    funnelChartInstances = {};

    if (!data || data.length === 0) {
        container.innerHTML = '<div class="col-span-1 md:col-span-2 text-center p-8 bg-white rounded-xl border border-zen-gray shadow-sm"><p class="text-gray-500 italic">Chưa có dữ liệu Marketing cho tháng này.</p></div>';
        return;
    }

    data.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = "bg-white p-5 rounded-xl border border-zen-gray shadow-sm";
        div.innerHTML = `<h4 class="font-bold text-center mb-4">${item.name}</h4><div class="h-40"><canvas id="funnel-${index}"></canvas></div>`;
        container.appendChild(div);
        const ctx = document.getElementById(`funnel-${index}`).getContext('2d');
        funnelChartInstances[index] = new Chart(ctx, {
            type: 'bar',
            data: { labels: ['Lead', 'SĐT', 'Đến'], datasets: [{ data: [item.leads, item.phones, item.arrived], backgroundColor: ['#2A3B00', '#435E01', '#628502'] }] },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    });
}

function renderBranchCards(data) {
    const container = document.getElementById('branchContainer');
    if (!container) return;
    container.innerHTML = '';

    data.forEach((item, idx) => {
        const isTop1 = idx === 0;
        const isProfitable = item.revenue >= item.breakeven;
        const visualRevPercent = Math.min((item.revenue / Math.max(item.target, item.breakeven)) * 100, 100);
        const visualBePercent = (item.breakeven / Math.max(item.target, item.breakeven)) * 100;

        const div = document.createElement('div');
        div.className = `bg-white p-5 rounded-2xl border flex flex-col justify-between reveal-on-scroll ${isTop1 ? 'card-top-1' : 'border-zen-gray shadow-sm'}`;

        div.innerHTML = `
            <div>
                <div class="flex items-center justify-between mb-4">
                    <h4 class="font-bold text-zen-dark text-lg">${item.branch}</h4>
                    <span class="text-[10px] font-bold text-zen-tea bg-zen-tea/10 px-2 py-1 rounded uppercase">${item.brand}</span>
                </div>
                <div class="flex flex-col gap-1 mb-2">
                    <div class="flex justify-between items-baseline">
                        <span class="text-gray-500 text-[11px] font-bold uppercase">Doanh thu</span>
                        <span class="text-xl font-extrabold text-zen-dark">${new Intl.NumberFormat('vi-VN').format(item.revenue)}</span>
                    </div>
                </div>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-100">
                <div class="progress-bar-bg mb-4">
                    <div class="breakeven-marker" style="left: ${visualBePercent}%"></div>
                    <div class="progress-bar-fill ${isProfitable ? 'bg-zen-sage' : 'bg-red-400'}" style="width: ${visualRevPercent}%"></div>
                </div>
                <div class="flex justify-between items-center mb-3">
                    <span class="text-sm font-bold ${item.percentKpi >= 100 ? 'text-zen-tea' : 'text-red-500'}">Đạt ${item.percentKpi.toFixed(1)}% KPI</span>
                    <span class="text-[10px] bg-gray-50 px-2 py-1 rounded border border-gray-200">Mốc: ${new Intl.NumberFormat('vi-VN').format(item.breakeven)}</span>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderAdsTable(data) {
    const tbody = document.getElementById('adsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Sort by CIR highest to lowest
    const sorted = [...data].sort((a, b) => b.cir - a.cir);

    sorted.forEach(item => {
        if (item.ads === 0 && item.revenue === 0) return;

        let cirBadge = item.cir > 30 ?
            '<span class="px-2 py-1 rounded bg-red-100 text-red-700 text-[10px] font-bold">Báo động</span>' :
            '<span class="px-2 py-1 rounded bg-zen-tea/10 text-zen-tea text-[10px] font-bold">Tốt</span>';

        tbody.innerHTML += `
            <tr class="border-b border-zen-gray/50 hover:bg-zen-card transition-colors">
                <td class="py-3 px-2 font-bold text-zen-dark">${item.branch}</td>
                <td class="py-3 px-2 text-right font-mono">${new Intl.NumberFormat('vi-VN').format(item.ads)}</td>
                <td class="py-3 px-2 text-right text-gray-400">${new Intl.NumberFormat('vi-VN').format(item.revenue)}</td>
                <td class="py-3 px-2 text-right font-bold ${item.cir > 30 ? 'text-red-600' : 'text-zen-tea'}">${item.cir.toFixed(1)}%</td>
                <td class="py-3 px-2 text-right">${cirBadge}</td>
            </tr>`;
    });
}