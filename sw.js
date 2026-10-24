// 수목푸드 직원 앱 서비스워커
// - 화면(index.html)은 항상 서버에서 최신본을 먼저 받는다(새 기능 배포가 바로 반영되도록).
//   인터넷이 끊겼을 때만 마지막으로 받아 둔 화면을 보여준다.
// - 아이콘·매니페스트처럼 거의 안 바뀌는 파일만 캐시에서 먼저 꺼낸다.
// - Firebase(로그인·데이터)와 외부 CDN 요청은 건드리지 않는다. 데이터는 항상 실시간 클라우드에서 온다.
const CACHE = 'sumok-app-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase·CDN 등 외부 요청은 그대로 통과
  if (url.pathname.endsWith('.mp4')) return; // 시작 영상은 구간(Range) 요청이라 브라우저 기본 캐시에 맡긴다

  if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
