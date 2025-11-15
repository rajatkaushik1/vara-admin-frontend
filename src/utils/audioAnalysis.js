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
    let sum = 0;
    for (let i = 0; i + lag < n; i++) {
      sum += envelope[i] * envelope[i + lag];
    }
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
      bestLag = lag;
    }
  }

  if (bestLag <= 0 || !isFinite(bestVal) || bestVal <= 0) {
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
    }
  };
}

/**
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
      bestKey
    }
  };
}

/**
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
