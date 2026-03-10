const CACHE_NAME = 'dashboard-cache-v4';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './styles.css',
    './js/config.min.js',
    './js/data-engine.min.js',
    './js/charts.min.js',
    './js/dashboard.min.js',
    './js/ai-assistant.min.js',
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
                // Cache từng file riêng lẻ: 1 file lỗi không làm hỏng cả batch
                return Promise.allSettled(
                    ASSETS_TO_CACHE.map(url =>
                        cache.add(url).catch(err => console.warn(`[SW] Không cache được ${url}:`, err))
                    )
                );
            })
            .then(() => self.skipWaiting()) // skipWaiting SAU KHI cache xong, không phải trước
    );
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
    // Bỏ qua tất cả các request đến API ngoài (Vercel proxy, Google Script)
    // Các API này có cơ chế cache riêng trong app, SW không nên can thiệp
    const url = event.request.url;
    if (url.includes('script.google.com') || url.includes('vercel.app') || url.includes('/api')) {
        return;
    }

    // Với các file tĩnh (HTML, JS, CSS): Ưu tiên mạng, nếu rớt mạng thì móc từ Cache ra
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Chỉ cache response 200 đầy đủ:
                // - Tránh cache lỗi 404/500 vĩnh viễn
                // - Tránh cache 206 Partial Content (dùng cho audio range request như 1.mp3)
                //   vì Cache API không hỗ trợ lưu partial response
                if (response.status === 200) {
                    const resClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, resClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Rớt mạng -> Trả về bản copy trong Tủ lạnh
                return caches.match(event.request);
            })
    );
});
