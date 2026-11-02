/* This device's camera and microphone for a call — the part of the LiveKit
   room the browser owns. Asks for permission on mount, falls back to
   audio-only or video-only when one device is missing, exposes mic/camera
   toggles (track.enabled, so permission isn't asked again) and a live mic
   level for the "you're speaking" indicator. Stops every track on unmount. */

import { useCallback, useEffect, useRef, useState } from "react";

export type MediaStatus = "requesting" | "ready" | "denied" | "unavailable" | "error";

export interface LocalMedia {
  status: MediaStatus;
  stream: MediaStream | null;
  hasVideo: boolean;
  hasAudio: boolean;
  micOn: boolean;
  camOn: boolean;
  /** 0–1, smoothed; 0 while muted. */
  level: number;
  toggleMic: () => void;
  toggleCam: () => void;
  retry: () => void;
  /** Device names, for the details panel. */
  cameraLabel: string;
  micLabel: string;
}

async function getStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: { echoCancellation: true, noiseSuppression: true } });
  } catch (err) {
    // One device missing (a desktop with no webcam): take what there is.
    if (err instanceof DOMException && (err.name === "NotFoundError" || err.name === "OverconstrainedError")) {
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        return await navigator.mediaDevices.getUserMedia({ video: true });
      }
    }
    throw err;
  }
}

export function useLocalMedia(enabled = true): LocalMedia {
  const [status, setStatus] = useState<MediaStatus>("requesting");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [level, setLevel] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const micOnRef = useRef(micOn);
  micOnRef.current = micOn;

  // Acquire (again on retry); release on unmount.
  useEffect(() => {
    if (!enabled) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return;
    }
    let cancelled = false;
    let acquired: MediaStream | null = null;
    setStatus("requesting");
    getStream()
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        acquired = s;
        setStream(s);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : "";
        setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" ? "unavailable" : "error");
      });
    return () => {
      cancelled = true;
      acquired?.getTracks().forEach((t) => t.stop());
      setStream(null);
    };
  }, [enabled, attempt]);

  // Mute / camera off without dropping the permission.
  useEffect(() => {
    stream?.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [stream, micOn]);
  useEffect(() => {
    stream?.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [stream, camOn]);

  // Mic level, sampled ~10× a second.
  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) return;
    let ctx: AudioContext;
    try {
      ctx = new AudioContext();
    } catch {
      return;
    }
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    let smooth = 0;
    const timer = window.setInterval(() => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += ((v - 128) / 128) ** 2;
      const rms = Math.sqrt(sum / buf.length);
      smooth = smooth * 0.6 + Math.min(1, rms * 6) * 0.4;
      setLevel(micOnRef.current ? smooth : 0);
    }, 100);
    return () => {
      window.clearInterval(timer);
      source.disconnect();
      void ctx.close();
    };
  }, [stream]);

  const toggleMic = useCallback(() => setMicOn((m) => !m), []);
  const toggleCam = useCallback(() => setCamOn((c) => !c), []);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  const hasVideo = Boolean(stream?.getVideoTracks().length);
  const hasAudio = Boolean(stream?.getAudioTracks().length);
  return {
    status,
    stream,
    hasVideo,
    hasAudio,
    micOn,
    camOn,
    level,
    toggleMic,
    toggleCam,
    retry,
    cameraLabel: stream?.getVideoTracks()[0]?.label ?? "",
    micLabel: stream?.getAudioTracks()[0]?.label ?? "",
  };
}
