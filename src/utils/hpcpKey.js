// src/utils/hpcpKey.js
// High-accuracy musical key estimation using Essentia.js core (HPCP + Key).

/**
 * Estimate the musical key from a mono audio signal using Essentia.js.
 *
 * @param {any} essentia - Essentia instance (from loadEssentia()).
 * @param {Float32Array} signal - Mono audio signal.
 * @param {number} sampleRate - Sample rate in Hz.
 * @param {object} options
 * @param {number} [options.frameSize=4096]
 * @param {number} [options.hopSize=2048]
 * @param {number} [options.rmsThreshold=0.005] - Minimum RMS per frame to be considered.
 * @returns {{ key: string|null, confidence: number, debug: any }}
 */
export function extractKeyWithHPCP(essentia, signal, sampleRate, options = {}) {
  const frameSize = options.frameSize || 4096;
  const hopSize = options.hopSize || 2048;
  const rmsThreshold = options.rmsThreshold || 0.005;

  if (!essentia || !signal || !signal.length || !sampleRate) {
    return {
      key: null,
      confidence: 0,
      debug: { reason: 'missing-input' }
    };
  }

  const totalSamples = signal.length;
  const hpcpSize = 36; // 36-bin HPCP works well for key detection.

  const debug = {
    frameSize,
    hopSize,
    hpcpSize,
    framesProcessed: 0
  };

  try {
    let accumHpcp = new Float32Array(hpcpSize);
    let totalWeight = 0;

    for (let start = 0; start + frameSize <= totalSamples; start += hopSize) {
      const frame = signal.subarray(start, start + frameSize);

      // Compute RMS energy to skip very quiet frames and use it as a weight.
      let sumSquares = 0;
      for (let i = 0; i < frame.length; i++) {
        const v = frame[i];
        sumSquares += v * v;
      }
      const rms = Math.sqrt(sumSquares / frame.length);
      if (rms < rmsThreshold) {
        continue;
      }

      // Windowing → Spectrum → SpectralPeaks → HPCP
      const windowed = essentia.Windowing(frame, { type: 'hann' }).frame;
      const spectrum = essentia.Spectrum(windowed).spectrum;

      const peaks = essentia.SpectralPeaks(spectrum, {
        sampleRate,
        maxPeaks: 60,
        magnitudeThreshold: 0.0005,
        orderBy: 'magnitude'
      });

      const hpcp = essentia.HPCP(peaks.frequencies, peaks.magnitudes, {
        sampleRate,
        size: hpcpSize,
        referenceFrequency: 440
      }).hpcp;

      // Accumulate HPCP values weighted by RMS energy.
      for (let i = 0; i < hpcp.length; i++) {
        accumHpcp[i] += hpcp[i] * rms;
      }

      totalWeight += rms;
      debug.framesProcessed++;
    }

    if (totalWeight === 0) {
      return {
        key: null,
        confidence: 0,
        debug: { ...debug, reason: 'no-loud-frames' }
      };
    }

    // Normalize accumulated HPCP.
    for (let i = 0; i < accumHpcp.length; i++) {
      accumHpcp[i] /= totalWeight;
    }

    // Run Essentia.Key on the final HPCP vector.
    const keyResult = essentia.Key(accumHpcp, {
      profileType: 'edma',
      numHarmonics: 15,
      usePolyphony: true
    });

    const keyName = keyResult.key || null;
    const scale = keyResult.scale || null;
    const strength = typeof keyResult.strength === 'number' ? keyResult.strength : 0;

    const label = keyName && scale ? `${keyName} ${scale}` : keyName;

    return {
      key: label || null,
      confidence: strength,
      debug: { ...debug, raw: keyResult }
    };
  } catch (err) {
    console.warn('extractKeyWithHPCP error:', err);
    return {
      key: null,
      confidence: 0,
      debug: {
        ...debug,
        reason: 'exception',
        error: String(err && err.message ? err.message : err)
      }
    };
  }
}