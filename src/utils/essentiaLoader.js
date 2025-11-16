// src/utils/essentiaLoader.js
// Lazy loader for Essentia.js core + WASM from CDN (browser only).

let essentiaInstance = null;
let moduleInstance = null;
let loadPromise = null;

/**
 * Returns true if Essentia has already been loaded in this session.
 */
export function isEssentiaLoaded() {
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