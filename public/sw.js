self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Activation immédiate
});

self.addEventListener("fetch", (event) => {
  // Pas de cache pour l'instant (safe)
});