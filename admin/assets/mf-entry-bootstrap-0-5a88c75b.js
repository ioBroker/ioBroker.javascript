
const __mfCacheGlobalKey = "__mf_module_cache__";
globalThis[__mfCacheGlobalKey] ||= { share: {}, remote: {} };
globalThis[__mfCacheGlobalKey].share ||= {};
globalThis[__mfCacheGlobalKey].remote ||= {};
const __mfModuleCache = globalThis[__mfCacheGlobalKey];
const __mfTrackPendingShareLoad = (promise) => {
  const pendingShareLoads = (__mfModuleCache.pendingShareLoads ||= []);
  pendingShareLoads.push(promise);
  const cleanup = () => {
    const index = pendingShareLoads.indexOf(promise);
    if (index !== -1) pendingShareLoads.splice(index, 1);
  };
  void promise.then(cleanup, cleanup);
  return promise;
};
for (const __mfShareKey of Object.keys(__mfModuleCache.share)) {
  if (__mfShareKey.startsWith("default:")) {
    const __mfLegacyShareKey = __mfShareKey.slice("default:".length);
    if (__mfModuleCache.share[__mfLegacyShareKey] === undefined) {
      __mfModuleCache.share[__mfLegacyShareKey] = __mfModuleCache.share[__mfShareKey];
    }
  } else if (!__mfShareKey.includes(":")) {
    const __mfDefaultShareKey = "default:" + __mfShareKey;
    if (__mfModuleCache.share[__mfDefaultShareKey] === undefined) {
      __mfModuleCache.share[__mfDefaultShareKey] = __mfModuleCache.share[__mfShareKey];
    }
  }
}

const __mfImport = (src) =>
  globalThis.System && typeof globalThis.System.import === 'function'
    ? globalThis.System.import(src)
    : import(src);




(async () => {
  const __mfHostInit = await __mfImport("./hostInit-CrHjJGJJ.js");
  await __mfHostInit.__tla;
  const { initHost } = __mfHostInit;
  await initHost();
  const __mfPendingShares = await __mfImport("./pendingShares-mBGPbRwZ.js").catch(() => undefined);
  if (__mfPendingShares && typeof __mfPendingShares.preloadPendingShares === "function") await __mfPendingShares.preloadPendingShares();
  if (__mfModuleCache.pendingShareLoads) {
    await Promise.all(__mfModuleCache.pendingShareLoads);
  }
  const __mfReactServerModuleCache = globalThis["__mf_module_cache_react_server__"];
  if (__mfReactServerModuleCache?.pendingShareLoads) {
    await Promise.all(__mfReactServerModuleCache.pendingShareLoads);
  }
<<<<<<<< HEAD:admin/assets/mf-entry-bootstrap-0-6db6c4fc.js
})().then(() => __mfImport("./index-Bmmscq2G.js"));
========
})().then(() => __mfImport("./index-DQRH-S4P.js"));
>>>>>>>> 3c27bc1b (Working on common ai lib):admin/assets/mf-entry-bootstrap-0-5a88c75b.js
