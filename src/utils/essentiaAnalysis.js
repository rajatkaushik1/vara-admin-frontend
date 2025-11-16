// src/utils/essentiaAnalysis.js
// High-quality BPM + Key estimation using Essentia.js (browser-only).

import { loadEssentia } from './essentiaLoader';
import { extractKeyWithHPCP } from './hpcpKey';

/**
 * Decode an audio File into an AudioBuffer using Web Audio API.
 * This helper wraps decodeAudioData in a Promise for broader compatibility.
 */
async function decodeFileToBuffer(file) {
  if (typeof window === 'undefined') {
    throw new Error('decodeFileToBuffer can only run in a browser');
  }

  const AudioContextImpl = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextImpl) {
    throw new Error('Web Audio API not supported in this browser');
  }

  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new AudioContextImpl();

  try {
    const audioBuffer = await new Promise((resolve, reject) => {
      const onSuccess = (buffer) => resolve(buffer);
      const onError = (err) => reject(err);

      // Some browsers support promise-style decodeAudioData, some only callbacks.
      const result = audioCtx.decodeAudioData(arrayBuffer.slice(0), onSuccess, onError);
      if (result && typeof result.then === 'function') {
        result.then(onSuccess).catch(onError);
      }
    });
    return audioBuffer;
  } finally {
    // Close the AudioContext to free resources.
    try {
      audioCtx.close();
    } catch {
      // ignore
    }
  }
}

/**
 * Convert an AudioBuffer to a mono Float32Array by averaging channels.
 */
function audioBufferToMono(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels || 1;
  const length = audioBuffer.length;
  if (numChannels === 1) {
    return audioBuffer.getChannelData(0).slice(0);
  }

  const tmp = new Float32Array(length);
  for (let ch = 0; ch < numChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      tmp[i] += data[i] / numChannels;
    }
  }
  return tmp;
}

/**
 * Trim a mono Float32Array to at most maxSeconds based on sampleRate.
 */
function trimToMaxSeconds(signal, sampleRate, maxSeconds) {
  if (!maxSeconds || maxSeconds <= 0) return signal;
  const maxSamples = Math.floor(sampleRate * maxSeconds);
  if (signal.length <= maxSamples) return signal;
  return signal.subarray(0, maxSamples);
}

/**
 * Normalize BPM to a sane range and rounding.
 */
function normalizeBpm(rawBpm) {
  if (!rawBpm || !isFinite(rawBpm)) return null;
  let bpm = rawBpm;
  // Normalize overly high/low values into a more typical musical range.
  while (bpm < 60) bpm *= 2;
  while (bpm > 200) bpm /= 2;
  return Math.round(bpm);
}

/**
 * High-quality analysis using Essentia.js.
 *
 * @param {File} file - Audio file from input.
 * @param {object} options
 * @param {number} [options.maxSeconds=75]
 * @returns {Promise<{ bpm: number|null, key: string|null, confidence: number, debug: any }>}
 */
export async function analyzeAudioWithEssentia(file, options = {}) {
  const maxSeconds = typeof options.maxSeconds === 'number' && options.maxSeconds > 0
    ? options.maxSeconds
    : 75;

  if (!file) {
    throw new Error('No file provided to analyzeAudioWithEssentia');
  }

  const audioBuffer = await decodeFileToBuffer(file);
  const sampleRate = audioBuffer.sampleRate;
  const mono = trimToMaxSeconds(audioBufferToMono(audioBuffer), sampleRate, maxSeconds);

  if (!mono || !mono.length) {
    throw new Error('Decoded audio is empty or invalid');
  }

  const { essentia } = await loadEssentia();

  // --- BPM via RhythmExtractor2013 ---
  let bpm = null;
  let rhythmDebug = null;
  try {
    const rhythm = essentia.RhythmExtractor2013(mono);
    bpm = normalizeBpm(rhythm.bpm);
    rhythmDebug = rhythm;
  } catch (e) {
    rhythmDebug = { error: String(e && e.message ? e.message : e) };
  }

  // --- Key via HPCP pipeline ---
  let keyResult = null;
  try {
    keyResult = extractKeyWithHPCP(essentia, mono, sampleRate, {
      frameSize: 4096,
      hopSize: 2048,
      rmsThreshold: 0.005
    });
  } catch (e) {
    keyResult = {
      key: null,
      confidence: 0,
      debug: { error: String(e && e.message ? e.message : e) }
    };
  }

  // Combine confidence: favor key confidence, fall back to rhythm info.
  const keyConfidence = keyResult && typeof keyResult.confidence === 'number'
    ? keyResult.confidence
    : 0;

  const combinedConfidence = keyConfidence;

  return {
    bpm: bpm || null,
    key: (keyResult && keyResult.key) || null,
    confidence: combinedConfidence,
    debug: {
      rhythm: rhythmDebug,
      key: keyResult
    }
  };
}

