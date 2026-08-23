// App-shell service worker: the app opens offline after the first visit.
// Same-origin GET only; sync requests (api.github.com / script.google.com)
// are never touched, so last-write-wins stays intact and sync degrades to
// "offline · local" on its own.
// Strategy: stale-while-revalidate — the cached shell is served instantly
// (no network wait on launch), the network copy refreshes the cache in the
// background and applies on the NEXT open.
var CACHE = "gamelog-shell-v2";
var SHELL = ["./", "manifest.json", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // sync APIs go straight to network
  // stale-while-revalidate: cache answers instantly, network refreshes it
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
      if (hit) {
        e.waitUntil(net.catch(function () {})); // фоновое обновление, офлайн не мешает
        return hit;
      }
      return net.catch(function () { return caches.match("./"); });
    })
  );
});
