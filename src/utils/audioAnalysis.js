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
		let sum = 0;
		for (let i = 0; i + lag < n; i++) {
			sum += envelope[i] * envelope[i + lag];
		}
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
			bestLag = lag;
		}
	}

	if (bestLag <= 0 || !isFinite(bestVal) || bestVal <= 0) {
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
		}
	};
}

/**
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
			bestKey
		}
	};
}

/**
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
		let sum = 0;
		for (let i = 0; i + lag < n; i++) {
			sum += envelope[i] * envelope[i + lag];
		}
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
			bestLag = lag;
		}
	}

	if (bestLag <= 0 || !isFinite(bestVal) || bestVal <= 0) {
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
		}
	};
}

/**
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
			bestKey
		}
	};
}

/**
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
