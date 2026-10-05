import { defineConfig } from "vite";

const APP_SHELL = [
  "index.html",
  "manifest.webmanifest",
  "favicon.svg",
  "fonts/noto-sans-khmer-khmer.woff2",
  "fonts/noto-sans-khmer-latin.woff2",
];

function strictBakongGlobals() {
  return {
    name: "strict-bakong-globals",
    enforce: "pre",
    transform(code, id) {
      const path = id.split("?")[0];
      if (!path.includes("bakong-khqr") || !path.endsWith(".js")) return null;
      return `var c, j, sliceTagObject, cutsubstring;\n${code}`;
    },
  };
}

function offlineShell() {
  return {
    name: "offline-shell",
    apply: "build",
    generateBundle(_options, bundle) {
      const files = [
        ...new Set([
          ...APP_SHELL.map((file) => `./${file}`),
          ...Object.keys(bundle).map((file) => `./${file}`),
        ]),
      ];
      const source = `const CACHE = "jomnongdai-v1";
const ASSETS = ${JSON.stringify(files)};
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
`;
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

export default defineConfig({
  server: { host: "0.0.0.0", port: 5173 },
  preview: { host: "0.0.0.0", port: 4173 },
  define: { global: "globalThis" },
  optimizeDeps: {
    include: ["bakong-khqr", "buffer", "qrcode"],
  },
  plugins: [strictBakongGlobals(), offlineShell()],
});
