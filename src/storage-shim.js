// Adattatore: fornisce window.storage (API usata dall'app) sopra localStorage.
// Nella versione ospitata su Vercel i dati restano nel browser del dispositivo.
(function () {
  if (typeof window === "undefined") return;
  const LS = window.localStorage;
  window.storage = {
    async get(key) {
      const v = LS.getItem(key);
      return v === null ? null : { key, value: v };
    },
    async set(key, value) {
      LS.setItem(key, value);
      return { key, value };
    },
    async delete(key) {
      LS.removeItem(key);
      return { key, deleted: true };
    },
    async list(prefix = "") {
      const keys = [];
      for (let i = 0; i < LS.length; i++) {
        const k = LS.key(i);
        if (k && k.startsWith(prefix)) keys.push(k);
      }
      return { keys, prefix };
    },
  };
})();
