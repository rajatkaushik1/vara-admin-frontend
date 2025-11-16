<<<<<<< HEAD
// src/utils/audioAnalysis.js
// Fallback BPM + Key estimator using Web Audio API + Meyda (no Essentia).

import Meyda from 'meyda';

/**
 * Decode an audio File into an AudioBuffer using Web Audio API.
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

      const result = audioCtx.decodeAudioData(arrayBuffer.slice(0), onSuccess, onError);
      if (result && typeof result.then === 'function') {
        result.then(onSuccess).catch(onError);
      }
    });
    return audioBuffer;
  } finally {
    try {
      audioCtx.close();
    } catch {
      // ignore
    }
  }
}

/**
 * Convert AudioBuffer to mono Float32Array (average channels).
 */
function audioBufferToMono(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels || 1;
  const length = audioBuffer.length;
  if (numChannels === 1) {
    return audioBuffer.getChannelData(0).slice(0);
  }
  const mono = new Float32Array(length);
  for (let ch = 0; ch < numChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      mono[i] += data[i] / numChannels;
    }
  }
  return mono;
}

/**
 * Trim mono signal to at most maxSeconds.
 */
function trimToMaxSeconds(signal, sampleRate, maxSeconds) {
  if (!maxSeconds || maxSeconds <= 0) return signal;
  const maxSamples = Math.floor(sampleRate * maxSeconds);
  if (signal.length <= maxSamples) return signal;
  return signal.subarray(0, maxSamples);
}

/**
 * Estimate BPM using a simple energy envelope + autocorrelation.
 */
function estimateBpmFromEnvelope(signal, sampleRate, minBpm = 60, maxBpm = 180) {
  const frameSize = 2048;
  const hopSize = 1024;
  const envelope = [];

  for (let pos = 0; pos + frameSize <= signal.length; pos += hopSize) {
    let sumSquares = 0;
    for (let i = 0; i < frameSize; i++) {
      const v = signal[pos + i];
      sumSquares += v * v;
    }
    const rms = Math.sqrt(sumSquares / frameSize);
    envelope.push(rms);
  }

  const n = envelope.length;
  if (n < 4) return { bpm: null, debug: { reason: 'envelope-too-short' } };

  const acf = new Float32Array(n);
  for (let lag = 0; lag < n; lag++) {
=======
import Meyda from 'meyda';

/**
 * Compute the RMS envelope of a mono signal.
 */
function computeRmsEnvelope(signal, frameSize, hopSize) {
  const envelope = [];
  const len = signal.length;
  for (let i = 0; i + frameSize <= len; i += hopSize) {
    let sumSq = 0;
    for (let j = 0; j < frameSize; j++) {
      const v = signal[i + j];
      sumSq += v * v;
    }
    envelope.push(Math.sqrt(sumSq / frameSize));
  }
  return envelope;
}

/**
 * Simple autocorrelation over a bounded lag range (for tempo).
 */
function boundedAutocorrelation(envelope, minLag, maxLag) {
  const n = envelope.length;
  const result = new Array(maxLag + 1).fill(0);

  for (let lag = minLag; lag <= maxLag; lag++) {
>>>>>>> c3c26b8fe40b4a0726798353e00d61262626ae09
    let sum = 0;
    for (let i = 0; i + lag < n; i++) {
      sum += envelope[i] * envelope[i + lag];
    }
<<<<<<< HEAD
    acf[lag] = sum;
  }

  const dt = hopSize / sampleRate;
  const lagMin = Math.max(1, Math.floor(60 / (maxBpm * dt)));
  const lagMax = Math.min(n - 1, Math.ceil(60 / (minBpm * dt)));

  let bestLag = -1;
  let bestVal = -Infinity;
  for (let lag = lagMin; lag <= lagMax; lag++) {
    const val = acf[lag];
    if (val > bestVal) {
      bestVal = val;
=======
    result[lag] = sum;
  }

  // Normalize by lag 0 energy if available
  let zeroLag = 0;
  for (let i = 0; i < n; i++) {
    zeroLag += envelope[i] * envelope[i];
  }
  if (zeroLag > 0) {
    for (let lag = minLag; lag <= maxLag; lag++) {
      result[lag] /= zeroLag;
    }
  }

  return result;
}

/**
 * Estimate BPM from the RMS envelope via autocorrelation.
 */
function estimateBpmFromEnvelope(envelope, sampleRate, hopSize, minBpm, maxBpm) {
  if (!envelope || envelope.length < 10) {
    return { bpm: null, confidence: 0, debug: { reason: 'envelope too short' } };
  }

  const minLag = Math.floor((60 * sampleRate) / (maxBpm * hopSize));
  const maxLag = Math.floor((60 * sampleRate) / (minBpm * hopSize));
  if (minLag >= maxLag || minLag < 1) {
    return { bpm: null, confidence: 0, debug: { reason: 'invalid lag bounds' } };
  }

  const ac = boundedAutocorrelation(envelope, minLag, maxLag);

  let bestLag = -1;
  let bestVal = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    const v = ac[lag];
    if (v > bestVal) {
      bestVal = v;
>>>>>>> c3c26b8fe40b4a0726798353e00d61262626ae09
      bestLag = lag;
    }
  }

  if (bestLag <= 0 || !isFinite(bestVal) || bestVal <= 0) {
<<<<<<< HEAD
    return { bpm: null, debug: { reason: 'no-acf-peak' } };
  }

  const periodSeconds = bestLag * dt;
  let bpm = 60 / periodSeconds;

  while (bpm < minBpm) bpm *= 2;
  while (bpm > maxBpm) bpm /= 2;

  return {
    bpm: Math.round(bpm),
    debug: {
      frameSize,
      hopSize,
      lag: bestLag,
      acfPeak: bestVal
=======
    return { bpm: null, confidence: 0, debug: { reason: 'no clear autocorrelation peak' } };
  }

  let bpm = (60 * sampleRate) / (bestLag * hopSize);

  // Basic half/double tempo correction: try /2 and *2 within bounds
  const candidates = [bpm];
  if (bpm / 2 >= minBpm) candidates.push(bpm / 2);
  if (bpm * 2 <= maxBpm) candidates.push(bpm * 2);

  // Choose the candidate closest to a "typical" mid-tempo (around 120 bpm)
  const target = 120;
  let finalBpm = bpm;
  let bestDist = Math.abs(bpm - target);
  for (const c of candidates) {
    const d = Math.abs(c - target);
    if (d < bestDist) {
      bestDist = d;
      finalBpm = c;
    }
  }

  const confidence = Math.max(0, Math.min(1, bestVal));

  return {
    bpm: Math.round(finalBpm),
    confidence,
    debug: {
      rawBpm: bpm,
      bestLag,
      acPeak: bestVal,
      minLag,
      maxLag
>>>>>>> c3c26b8fe40b4a0726798353e00d61262626ae09
    }
  };
}

/**
<<<<<<< HEAD
 * Normalize a vector to unit length.
 */
function normalizeVector(vec) {
  const out = new Float32Array(vec.length);
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    sumSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < vec.length; i++) {
    out[i] = vec[i] / norm;
  }
  return out;
}

/**
 * Estimate key from aggregated chroma using Krumhansl profiles.
 */
function estimateKeyFromChroma(chroma) {
  if (!chroma || chroma.length !== 12) {
    return { key: null, confidence: 0, debug: { reason: 'invalid-chroma' } };
  }

  const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  const chromaNorm = normalizeVector(chroma);
  const rotations = 12;
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  let bestScore = -Infinity;
  let secondBest = -Infinity;
  let bestKey = null;

  for (let i = 0; i < rotations; i++) {
    const majorRot = [];
    const minorRot = [];
    for (let j = 0; j < 12; j++) {
      majorRot[j] = majorProfile[(j + i) % 12];
      minorRot[j] = minorProfile[(j + i) % 12];
    }

    let dotMajor = 0;
    let dotMinor = 0;
    for (let j = 0; j < 12; j++) {
      dotMajor += chromaNorm[j] * majorRot[j];
      dotMinor += chromaNorm[j] * minorRot[j];
    }

    const majorKey = `${names[i]} Major`;
    const minorKey = `${names[i]} Minor`;

    if (dotMajor > bestScore) {
      secondBest = bestScore;
      bestScore = dotMajor;
      bestKey = majorKey;
    } else if (dotMajor > secondBest) {
      secondBest = dotMajor;
    }

    if (dotMinor > bestScore) {
      secondBest = bestScore;
      bestScore = dotMinor;
      bestKey = minorKey;
    } else if (dotMinor > secondBest) {
      secondBest = dotMinor;
    }
  }

  if (!bestKey || !isFinite(bestScore) || bestScore <= 0) {
    return { key: null, confidence: 0, debug: { reason: 'no-key-peak' } };
  }

  const diff = bestScore - (secondBest || 0);
  const confidence = Math.max(0, Math.min(1, diff / bestScore));

  return {
    key: bestKey,
    confidence,
    debug: {
      bestScore,
      secondBest,
=======
 * Estimate musical key using Meyda chroma + Krumhansl-Kessler key profiles.
 */
function estimateKeyWithMeyda(signal, sampleRate) {
  if (!Meyda || typeof Meyda.extract !== 'function') {
    return { key: null, confidence: 0, debug: { reason: 'meyda not available' } };
  }

  const bufferSize = 4096;
  const hopSize = 2048;
  if (signal.length < bufferSize) {
    return { key: null, confidence: 0, debug: { reason: 'signal too short for chroma' } };
  }

  const chromaSum = new Array(12).fill(0);
  let frames = 0;

  for (let pos = 0; pos + bufferSize <= signal.length; pos += hopSize) {
    const frame = signal.subarray(pos, pos + bufferSize);
    const chroma = Meyda.extract('chroma', {
      signal: frame,
      sampleRate,
      bufferSize
    });
    if (chroma && Array.isArray(chroma) && chroma.length === 12) {
      for (let i = 0; i < 12; i++) {
        chromaSum[i] += chroma[i];
      }
      frames++;
    }
  }

  if (frames === 0) {
    return { key: null, confidence: 0, debug: { reason: 'no valid chroma frames' } };
  }

  // Normalize chroma
  let chromaNorm = chromaSum.slice();
  const total = chromaNorm.reduce((a, b) => a + b, 0);
  if (total > 0) {
    chromaNorm = chromaNorm.map(v => v / total);
  }

  // Krumhansl-Kessler profiles for major and minor keys (normalized)
  const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  function normalizeProfile(arr) {
    const sum = arr.reduce((a, b) => a + b, 0);
    return arr.map(v => v / (sum || 1));
  }
  const majorNorm = normalizeProfile(majorProfile);
  const minorNorm = normalizeProfile(minorProfile);

  const pitchClasses = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  let bestKey = null;
  let bestMode = null;
  let bestScore = -Infinity;

  const scores = [];

  // Try all 12 rotations for major and minor
  for (let tonic = 0; tonic < 12; tonic++) {
    let scoreMaj = 0;
    let scoreMin = 0;
    for (let i = 0; i < 12; i++) {
      const rotatedIndex = (i + tonic) % 12;
      scoreMaj += chromaNorm[rotatedIndex] * majorNorm[i];
      scoreMin += chromaNorm[rotatedIndex] * minorNorm[i];
    }
    scores.push({ tonic, mode: 'major', score: scoreMaj });
    scores.push({ tonic, mode: 'minor', score: scoreMin });
  }

  for (const s of scores) {
    if (s.score > bestScore) {
      bestScore = s.score;
      bestKey = pitchClasses[s.tonic];
      bestMode = s.mode;
    }
  }

  if (!bestKey || !bestMode || !isFinite(bestScore) || bestScore <= 0) {
    return { key: null, confidence: 0, debug: { reason: 'no strong key correlation' } };
  }

  const sumScores = scores.reduce((acc, s) => acc + Math.max(0, s.score), 0) || 1;
  const confidence = Math.max(0, Math.min(1, bestScore / sumScores));

  return {
    key: `${bestKey} ${bestMode === 'major' ? 'Major' : 'Minor'}`,
    confidence,
    debug: {
      bestScore,
      sumScores,
      bestMode,
>>>>>>> c3c26b8fe40b4a0726798353e00d61262626ae09
      bestKey
    }
  };
}

/**
<<<<<<< HEAD
 * Fallback analysis using Web Audio + Meyda.
 *
 * @param {File} file
 * @param {object} options
 * @param {number} [options.maxSeconds=75]
 * @param {number} [options.minBpm=60]
 * @param {number} [options.maxBpm=180]
 * @returns {Promise<{ bpm: number|null, key: string|null, confidence: number, debug: any }>}
 */
export async function analyzeAudioFile(file, options = {}) {
  const maxSeconds = typeof options.maxSeconds === 'number' && options.maxSeconds > 0
    ? options.maxSeconds
    : 75;
  const minBpm = typeof options.minBpm === 'number' ? options.minBpm : 60;
  const maxBpm = typeof options.maxBpm === 'number' ? options.maxBpm : 180;

  if (!file) {
    throw new Error('No file provided to analyzeAudioFile');
  }

  const audioBuffer = await decodeFileToBuffer(file);
  const sampleRate = audioBuffer.sampleRate;
  const mono = trimToMaxSeconds(audioBufferToMono(audioBuffer), sampleRate, maxSeconds);

  if (!mono || !mono.length) {
    throw new Error('Decoded audio is empty or invalid');
  }

  // --- BPM estimation ---
  const bpmResult = estimateBpmFromEnvelope(mono, sampleRate, minBpm, maxBpm);

  // --- Key estimation via aggregated chroma with Meyda ---
  const frameSize = 4096;
  const hopSize = 2048;
  const chromaSum = new Float32Array(12);
  let chromaFrames = 0;

  if (typeof Meyda === 'undefined' || typeof Meyda.extract !== 'function') {
    return {
      bpm: bpmResult.bpm || null,
      key: null,
      confidence: 0,
      debug: {
        bpmDebug: bpmResult.debug,
        keyDebug: { reason: 'meyda-unavailable' }
      }
    };
  }

  for (let pos = 0; pos + frameSize <= mono.length; pos += hopSize) {
    const frame = mono.subarray(pos, pos + frameSize);
    const chroma = Meyda.extract('chroma', frame, {
      sampleRate,
      bufferSize: frameSize,
      numberOfChannels: 1
    });
    if (chroma && chroma.length === 12) {
      for (let i = 0; i < 12; i++) {
        chromaSum[i] += chroma[i];
      }
      chromaFrames++;
    }
  }

  let keyResult = {
    key: null,
    confidence: 0,
    debug: { reason: 'no-chroma-frames' }
  };

  if (chromaFrames > 0) {
    const avgChroma = new Float32Array(12);
    for (let i = 0; i < 12; i++) {
      avgChroma[i] = chromaSum[i] / chromaFrames;
    }
    keyResult = estimateKeyFromChroma(avgChroma);
  }

  return {
    bpm: bpmResult.bpm || null,
    key: keyResult.key,
    confidence: keyResult.confidence,
    debug: {
      bpmDebug: bpmResult.debug,
      keyDebug: keyResult.debug
    }
  };
}
=======
 * Analyze an audio File/Blob using Web Audio + Meyda.
 * Returns a best-effort estimate of BPM and Key.
 */
export async function analyzeAudioFile(file, options = {}) {
  const {
    maxSeconds = 75,
    minBpm = 60,
    maxBpm = 180
  } = options;

  if (!file) {
    return { bpm: null, key: null, confidence: 0, debug: { reason: 'no file provided' } };
  }

  if (typeof window === 'undefined') {
    return { bpm: null, key: null, confidence: 0, debug: { reason: 'not running in a browser' } };
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return { bpm: null, key: null, confidence: 0, debug: { reason: 'AudioContext unsupported' } };
  }

  let audioCtx;
  try {
    audioCtx = new AudioCtx();

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const sampleRate = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;
    const len = audioBuffer.length;

    // Mixdown to mono
    let mono = new Float32Array(len);
    if (numChannels === 1) {
      mono.set(audioBuffer.getChannelData(0));
    } else {
      for (let ch = 0; ch < numChannels; ch++) {
        const data = audioBuffer.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          mono[i] += data[i] / numChannels;
        }
      }
    }

    // Trim to first maxSeconds for performance
    const maxSamples = Math.min(mono.length, Math.floor(maxSeconds * sampleRate));
    if (maxSamples < 4096) {
      return { bpm: null, key: null, confidence: 0, debug: { reason: 'audio too short' } };
    }
    mono = mono.subarray(0, maxSamples);

    // Compute BPM
    const frameSize = 2048;
    const hopSize = 1024;
    const envelope = computeRmsEnvelope(mono, frameSize, hopSize);
    const bpmResult = estimateBpmFromEnvelope(envelope, sampleRate, hopSize, minBpm, maxBpm);

    // Compute key
    const keyResult = estimateKeyWithMeyda(mono, sampleRate);

    // Combine confidence (simple heuristic: average if both available)
    let combinedConfidence = 0;
    const confidences = [];
    if (bpmResult && typeof bpmResult.confidence === 'number') confidences.push(bpmResult.confidence);
    if (keyResult && typeof keyResult.confidence === 'number') confidences.push(keyResult.confidence);
    if (confidences.length > 0) {
      combinedConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    }

    return {
      bpm: bpmResult.bpm,
      key: keyResult.key,
      confidence: combinedConfidence,
      debug: {
        bpmDebug: bpmResult.debug || {},
        keyDebug: keyResult.debug || {},
        sampleRate,
        frames: envelope.length
      }
    };
  } catch (err) {
    console.error('analyzeAudioFile error:', err);
    return {
      bpm: null,
      key: null,
      confidence: 0,
      debug: {
        error: err && err.message ? err.message : String(err)
      }
    };
  } finally {
    if (audioCtx && typeof audioCtx.close === 'function') {
      try {
        await audioCtx.close();
      } catch {
        // ignore
      }
    }
  }
}

// Don’t change any other functions or files. This is a standalone utility.
>>>>>>> c3c26b8fe40b4a0726798353e00d61262626ae09
