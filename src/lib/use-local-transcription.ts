"use client";

import { useRef, useState, useCallback } from "react";

/**
 * Local Whisper transcription via Transformers.js (@xenova/transformers).
 *
 * This runs the Whisper model ENTIRELY in the browser using WebAssembly —
 * no cloud API calls, no data leaves the machine. The model is downloaded
 * once from HuggingFace (cached by the browser), then all transcription
 * is local.
 *
 * Inspired by the reference tool's faster-whisper approach, but adapted
 * for the browser using Transformers.js (the JS port of HuggingFace
 * Transformers).
 */

type TranscriptionSegment = {
  start: number;
  end: number;
  text: string;
};

type TranscriptionResult = {
  text: string;
  segments: TranscriptionSegment[];
  duration: number;
};

let pipelineInstance: any = null;
let loadingPromise: Promise<any> | null = null;

async function getPipeline() {
  if (pipelineInstance) return pipelineInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const { pipeline } = await import("@xenova/transformers");
    // Use the tiny model for fast in-browser inference (~40MB download).
    // For better accuracy, switch to "Xenova/whisper-base" (~150MB).
    pipelineInstance = await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny",
      {
        progress_callback: (progress: any) => {
          if (progress.status === "progress") {
            console.log(`[whisper] Model download: ${Math.round(progress.progress)}%`);
          }
        },
      }
    );
    return pipelineInstance;
  })();

  return loadingPromise;
}

export function useLocalTranscription() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const transcribe = useCallback(
    async (audioBlob: Blob): Promise<TranscriptionResult | null> => {
      setLoading(true);
      setError(null);
      setProgress(0);
      cancelRef.current = false;

      try {
        setModelLoading(true);
        const asr = await getPipeline();
        setModelLoading(false);

        // Convert blob to audio data
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = new AudioContext({ sampleRate: 16000 });
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Get mono channel at 16kHz
        const channelData = audioContext.createBuffer(
          1,
          audioBuffer.length,
          16000
        );
        const sourceData = audioBuffer.getChannelData(0);
        channelData.copyToChannel(sourceData, 0);

        // Run transcription with word-level timestamps
        const output = await asr(channelData.getChannelData(0), {
          chunk_length_s: 30,
          stride_length_s: 5,
          language: "english",
          task: "transcribe",
          return_timestamps: true,
          callback_function: (item: any) => {
            if (cancelRef.current) return;
            setProgress(Math.min(0.95, (item?.completed || 0) * 0.9));
          },
        });

        if (cancelRef.current) return null;

        setProgress(1);

        const segments: TranscriptionSegment[] = (output.chunks || []).map(
          (chunk: any) => ({
            start: chunk.timestamp[0] || 0,
            end: chunk.timestamp[1] || 0,
            text: chunk.text.trim(),
          })
        );

        return {
          text: output.text || "",
          segments,
          duration: audioBuffer.duration,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Transcription failed";
        setError(msg);
        return null;
      } finally {
        setLoading(false);
        setModelLoading(false);
      }
    },
    []
  );

  const cancel = useCallback(() => {
    cancelRef.current = true;
    setLoading(false);
  }, []);

  return {
    transcribe,
    cancel,
    loading,
    progress,
    modelLoading,
    modelProgress,
    error,
  };
}
