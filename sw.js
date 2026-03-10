const CACHE_NAME = 'tonytit-dashboard-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './styles.css',
    './js/config.js',
    './js/data-engine.js',
    './js/charts.js',
    './js/dashboard.js',
    './js/ai-assistant.js',
    './manifest.json',
    './libs/tailwindcss.js',
    './libs/chart.js',
    './libs/chartjs-plugin-datalabels.js',
    './libs/lucide.js'
];

// Install Event - Cache Static Assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
    self.skipWaiting();
});

// Activate Event - Clean Up Old Caches
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event - Network First Strategy with Fallback to Cache
self.addEventListener('fetch', (event) => {
    // Bỏ qua các request lấy dữ liệu Spreadsheet Google (nó đã có cơ chế lưu cache riêng)
    if (event.request.url.includes('script.google.com')) {
        return;
    }

    // Với các file tĩnh (HTML, JS, CSS): Ưu tiên mạng, nếu rớt mạng thì móc từ Cache ra
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cập nhật ngầm lại cache cho lần sau nếu tải thành công
                const resClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, resClone);
                });
                return response;
            })
            .catch(() => {
                // Rớt mạng -> Trả về bản copy trong Tủ lạnh
                return caches.match(event.request);
            })
    );
});
