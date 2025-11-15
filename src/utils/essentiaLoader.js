let cachedEssentia = null;
let loadingPromise = null;

/**
 * Returns true if Essentia has already been loaded in this session.
 */
export function isEssentiaLoaded() {
  return !!cachedEssentia;
}

/**
 * Lazy-load Essentia.js core + WASM from CDN and return a singleton instance.
 *
 * Usage:
 *   const { essentia, Module } = await loadEssentia();
 *
 * Notes:
 * - Uses jsDelivr CDN for essenta.js-core.es.js and essentia-wasm.es.js.
 * - Does NOT load any MusicExtractor model; we only rely on core algorithms.
 */
export async function loadEssentia() {
  if (cachedEssentia) {
    return cachedEssentia;
  }
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    // Important: fixed versions for stability; adjust version if needed.
    const coreUrl = 'https://cdn.jsdelivr.net/npm/essentia.js/dist/essentia.js-core.es.js';
    const wasmUrl = 'https://cdn.jsdelivr.net/npm/essentia.js/dist/essentia-wasm.es.js';

    let EssentiaCore;
    let Module;

    try {
      const [coreModule, wasmModule] = await Promise.all([
        import(/* @vite-ignore */ coreUrl),
        import(/* @vite-ignore */ wasmUrl),
      ]);

      // coreModule is expected to export Essentia or default Essentia
      EssentiaCore = coreModule.Essentia || coreModule.default || coreModule;
      Module = wasmModule.default || wasmModule;

      if (!EssentiaCore || !Module) {
        throw new Error('Essentia core or WASM module not available from CDN imports');
      }

      const essentia = new EssentiaCore(Module);
      cachedEssentia = { essentia, Module };
      return cachedEssentia;
    } catch (err) {
      console.error('Failed to load Essentia from CDN:', err);
      // Reset cache on failure so future calls can retry
      cachedEssentia = null;
      throw err;
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

// Don’t change any other functions or files. This is a standalone utility.
