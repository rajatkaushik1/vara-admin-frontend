import { loadEssentia } from './essentiaLoader';
import { analyzeAudioFile } from './audioAnalysis';

/**
 * Analyze audio using Essentia (for BPM) plus the fallback analyzer (for BPM+Key).
 *
 * Strategy:
 * - First call analyzeAudioFile(file) to ensure we always have a fallback BPM/Key.
 * - Then, if possible, decode audio again and run Essentia's RhythmExtractor2013 for BPM.
 * - Combine the results, preferring Essentia's BPM when it looks reasonable.
 * - Key is taken from the fallback analyzer.
 */
export async function analyzeAudioWithEssentia(file, options = {}) {
  const {
    maxSeconds = 75,
    minBpm = 60,
    maxBpm = 180,
  } = options;

  if (!file) {
    return {
      bpm: null,
      key: null,
      confidence: 0,
      debug: { reason: 'no file provided' },
    };
  }

  // 1) Always compute fallback result first so we have something even if Essentia fails.
  let fallback = null;
  try {
    fallback = await analyzeAudioFile(file, { maxSeconds, minBpm, maxBpm });
  } catch (err) {
    console.warn('Fallback analyzeAudioFile failed:', err);
    fallback = null;
  }

  // Early return if we can't use Web Audio (e.g., SSR)
  if (typeof window === 'undefined') {
    return (
      fallback || {
        bpm: null,
        key: null,
        confidence: 0,
        debug: { reason: 'not running in a browser' },
      }
    );
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return (
      fallback || {
        bpm: null,
        key: null,
        confidence: 0,
        debug: { reason: 'AudioContext unsupported' },
      }
    );
  }

  let audioCtx;
  let bpmFromEssentia = null;
  let bpmDebug = {};

  try {
    const { essentia } = await loadEssentia();
    if (!essentia) {
      throw new Error('Essentia instance missing');
    }

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
      bpmDebug.reason = 'audio too short for Essentia BPM';
    } else {
      mono = mono.subarray(0, maxSamples);

      // Convert to Essentia vector
      const vec = essentia.arrayToVector(mono);

      let result = null;

      try {
        // Preferred pattern: constructor + compute
        const rhythmExtractor = new essentia.RhythmExtractor2013('multifeature');
        if (rhythmExtractor && typeof rhythmExtractor.compute === 'function') {
          result = rhythmExtractor.compute(vec);
        } else if (typeof rhythmExtractor === 'function') {
          // Some builds expose callable functors
          result = rhythmExtractor(vec);
        }
      } catch (innerErr) {
        // Fallback: try direct function call if available
        try {
          const fn = essentia.RhythmExtractor2013;
          if (typeof fn === 'function') {
            result = fn('multifeature', vec);
          }
        } catch (innerErr2) {
          bpmDebug.error = (innerErr2 && innerErr2.message) || String(innerErr2);
        }
      }

      // Try to extract BPM from result in a robust way
      if (result != null) {
        if (typeof result === 'object') {
          // Common case: object with bpm property
          if (typeof result.bpm === 'number') {
            bpmFromEssentia = result.bpm;
          } else if (Array.isArray(result) && typeof result[0] === 'number') {
            bpmFromEssentia = result[0];
          }
        } else if (typeof result === 'number') {
          bpmFromEssentia = result;
        }
      }

      if (bpmFromEssentia != null && isFinite(bpmFromEssentia)) {
        // If BPM is wildly out of range, discard
        if (bpmFromEssentia < minBpm / 2 || bpmFromEssentia > maxBpm * 2) {
          bpmDebug.discarded = bpmFromEssentia;
          bpmFromEssentia = null;
        } else {
          // Simple half/double correction into [minBpm, maxBpm]
          while (bpmFromEssentia < minBpm) bpmFromEssentia *= 2;
          while (bpmFromEssentia > maxBpm) bpmFromEssentia /= 2;
          bpmFromEssentia = Math.round(bpmFromEssentia);
        }
      } else {
        bpmDebug.reason =
          bpmDebug.reason || 'Essentia did not return a usable BPM value';
        bpmFromEssentia = null;
      }
    }
  } catch (err) {
    console.warn('Essentia analysis failed, using fallback only:', err);
    bpmDebug.error = (err && err.message) || String(err);
  } finally {
    if (audioCtx && typeof audioCtx.close === 'function') {
      try {
        await audioCtx.close();
      } catch {
        // ignore
      }
    }
  }

  // Combine Essentia BPM and fallback result
  const bpm =
    bpmFromEssentia != null
      ? bpmFromEssentia
      : fallback && fallback.bpm != null
      ? fallback.bpm
      : null;

  const key = fallback ? fallback.key : null;

  const confidences = [];
  if (bpmFromEssentia != null) {
    // Treat Essentia BPM as a reasonably strong signal
    confidences.push(0.7);
  }
  if (fallback && typeof fallback.confidence === 'number') {
    confidences.push(fallback.confidence);
  }

  const combinedConfidence = confidences.length
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 0;

  return {
    bpm,
    key,
    confidence: combinedConfidence,
    debug: {
      fallbackDebug: fallback && fallback.debug ? fallback.debug : {},
      bpmFromEssentia,
      bpmDebug,
    },
  };
}

// Don’t change any other functions or files. This is a standalone utility.
