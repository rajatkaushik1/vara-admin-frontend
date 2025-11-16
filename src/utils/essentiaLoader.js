<<<<<<< HEAD
// src/utils/essentiaLoader.js
// Lazy loader for Essentia.js core + WASM from CDN (browser only).

let essentiaInstance = null;
let moduleInstance = null;
let loadPromise = null;
=======
let cachedEssentia = null;
let loadingPromise = null;
>>>>>>> c3c26b8fe40b4a0726798353e00d61262626ae09

/**
 * Returns true if Essentia has already been loaded in this session.
 */
export function isEssentiaLoaded() {
<<<<<<< HEAD
  return !!essentiaInstance;
}

/**
 * Load Essentia.js core + WASM from CDN (jsDelivr) on demand.
 * This function caches the instance so subsequent calls are fast.
 *
 * Returns: { essentia, Module }
 */
export async function loadEssentia() {
  if (essentiaInstance && moduleInstance) {
    return { essentia: essentiaInstance, Module: moduleInstance };
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    const coreUrl = 'https://cdn.jsdelivr.net/npm/essentia.js/dist/essentia.js-core.es.js';
    const wasmUrl = 'https://cdn.jsdelivr.net/npm/essentia.js/dist/essentia-wasm.es.js';

    // NOTE: The "@vite-ignore" comment is important so Vite does not try to pre-bundle this URL.
    const coreModule = await import(/* @vite-ignore */ coreUrl);
    const wasmModule = await import(/* @vite-ignore */ wasmUrl);

    // Different builds of Essentia.js may expose the Essentia class and WASM factory slightly differently.
    // We try a few safe options and throw if we cannot find them.

    const EssentiaClass =
      coreModule.Essentia ||
      (coreModule.default && coreModule.default.Essentia) ||
      coreModule.default;

    if (!EssentiaClass) {
      throw new Error('Essentia class not found in core module');
    }

    const wasmFactory =
      wasmModule.EssentiaWASM ||
      (wasmModule.default && wasmModule.default.EssentiaWASM) ||
      wasmModule.default;

    if (typeof wasmFactory !== 'function') {
      throw new Error('EssentiaWASM factory function not found in wasm module');
    }

    // Initialize the WASM Module and build the Essentia instance.
    const Module = await wasmFactory();
    const essentia = new EssentiaClass(Module);

    essentiaInstance = essentia;
    moduleInstance = Module;

    return { essentia, Module };
  })();

  return loadPromise;
}
=======
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
>>>>>>> c3c26b8fe40b4a0726798353e00d61262626ae09
