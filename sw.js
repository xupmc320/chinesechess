// 定義要快取的檔案列表
const CACHE_NAME = 'chinese-chess-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json'
  // 注意：圖片檔案我們會在後面動態加入快取
];

// 安裝 Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 攔截網路請求，優先從快取中讀取
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果快取中有對應的資源，就直接回傳
        if (response) {
          return response;
        }
        // 否則，就發出網路請求
        return fetch(event.request);
      }
    )
  );
});