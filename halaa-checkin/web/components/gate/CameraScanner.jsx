'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import { Button } from '../ui/Button.jsx';
import { Notice } from '../ui/Notice.jsx';
import { t } from '../../lib/locale.js';
import styles from './CameraScanner.module.css';

/**
 * User-triggered Camera Scanner using jsqr.
 * Adheres to Technical Contract Section 5 and Product Section 6.
 *
 * - Rear-facing camera with playsInline.
 * - Bounded decode loop (~150ms).
 * - Ignores duplicate frames within 2 seconds.
 * - Auto-stops tracks on unmount, background, stop click.
 * - Graceful permission-denied fallback.
 */
export function CameraScanner({ onScan, disabled = false, dict, stopSignal = 0 }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorNotice, setErrorNotice] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const lastScanRef = useRef({ payload: null, timestamp: 0 });
  // Generation invalidates pending getUserMedia / decode callbacks (F06).
  const generationRef = useRef(0);
  const disabledRef = useRef(disabled);
  const onScanRef = useRef(onScan);
  useEffect(() => { disabledRef.current = disabled; }, [disabled]);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  const stopCamera = useCallback(() => {
    // Invalidate any pending acquisition/decode for this generation.
    generationRef.current += 1;
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track stop error
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try { videoRef.current.pause?.(); } catch { /* ignore */ }
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setIsStarting(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Stop camera when tab/page is backgrounded (do not auto-resume)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopCamera();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stopCamera]);

  // Disabled scanner must not retain running tracks (F06); Stop stays usable.
  useEffect(() => {
    if (disabled && (isStreaming || isStarting)) {
      stopCamera();
    }
  }, [disabled, isStreaming, isStarting, stopCamera]);

  // External stop (event switch / logout / navigation) — parent bumps stopSignal
  useEffect(() => {
    if (stopSignal > 0) stopCamera();
  }, [stopSignal, stopCamera]);

  // Decode frame loop — bounded to ~150ms (spec T09) via timestamp throttle.
  // Guarded by generation + disabled so stale loops cannot dispatch (F06).
  const lastTickRef = useRef(0);
  const tick = useCallback((nowTs, gen) => {
    if (gen !== generationRef.current) return; // stale loop, do not reschedule
    const now = typeof nowTs === 'number' ? nowTs : Date.now();
    if (now - lastTickRef.current < 150) {
      animFrameIdRef.current = requestAnimationFrame((t) => tick(t, gen));
      return;
    }
    lastTickRef.current = now;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameIdRef.current = requestAnimationFrame((t) => tick(t, gen));
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (width > 0 && height > 0) {
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);

        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data && code.data.trim().length > 0) {
          // Do not dispatch while disabled or after invalidation.
          if (gen !== generationRef.current || disabledRef.current) {
            return;
          }
          const at = Date.now();
          const trimmed = code.data.trim();

          // Ignored duplicate frames within 2 seconds
          if (
            lastScanRef.current.payload === trimmed &&
            at - lastScanRef.current.timestamp < 2000
          ) {
            // duplicate frame, continue scanning
          } else {
            lastScanRef.current = { payload: trimmed, timestamp: at };
            // Stop camera on detection and dispatch
            const cb = onScanRef.current;
            stopCamera();
            cb?.(trimmed, 'camera');
            return;
          }
        }
      }
    }

    // Schedule next frame with bounded frequency
    animFrameIdRef.current = requestAnimationFrame((t) => tick(t, gen));
  }, [stopCamera]);

  // Attach pending stream once the video element mounts (F05).
  const attachStreamToVideo = useCallback(async (stream, gen) => {
    const video = videoRef.current;
    if (!video) return false;
    if (gen !== generationRef.current) return false;
    try {
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      await video.play();
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    // After streaming mounts, attach any acquired-but-unattached stream.
    if (isStreaming && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      const s = streamRef.current;
      const gen = generationRef.current;
      attachStreamToVideo(s, gen).then((ok) => {
        if (!ok && gen === generationRef.current) {
          stopCamera();
          setErrorNotice(t(dict, 'gate.cameraUnavailable'));
        }
      });
    }
  }, [isStreaming, attachStreamToVideo, stopCamera, dict]);

  const startCamera = async () => {
    if (disabledRef.current) return;
    setErrorNotice(null);
    setIsStarting(true);
    const gen = generationRef.current + 1;
    generationRef.current = gen;

    if (!navigator?.mediaDevices?.getUserMedia) {
      if (generationRef.current !== gen) return;
      setIsStarting(false);
      setErrorNotice(t(dict, 'gate.cameraUnavailable'));
      return;
    }

    // Mount the video element BEFORE acquisition so attachment can succeed (F05).
    setIsStreaming(true);

    let stream = null;
    try {
      // First attempt rear camera
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (err) {
        if (generationRef.current !== gen || disabledRef.current) return;
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') throw err;
        // Fallback to any available video stream
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
    } catch (err) {
      // If invalidated while permission was pending, ensure nothing leaks (F06).
      if (generationRef.current !== gen) {
        return;
      }
      setIsStarting(false);
      setIsStreaming(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorNotice(t(dict, 'gate.cameraDenied'));
      } else {
        setErrorNotice(t(dict, 'gate.cameraUnavailable'));
      }
      return;
    }

    // If stopped/unmounted/event-switched while permission was pending,
    // dispose of the late stream immediately (F06).
    if (generationRef.current !== gen || disabledRef.current) {
      try { stream.getTracks().forEach((tr) => tr.stop()); } catch { /* ignore */ }
      return;
    }

    streamRef.current = stream;

    // Video is now mounted (isStreaming true); attach and play.
    const attached = await attachStreamToVideo(stream, gen);
    if (generationRef.current !== gen || disabledRef.current) {
      try { stream.getTracks().forEach((tr) => tr.stop()); } catch { /* ignore */ }
      streamRef.current = null;
      return;
    }
    if (!attached) {
      try { stream.getTracks().forEach((tr) => tr.stop()); } catch { /* ignore */ }
      streamRef.current = null;
      if (generationRef.current === gen) {
        setIsStreaming(false);
        setIsStarting(false);
        setErrorNotice(t(dict, 'gate.cameraUnavailable'));
      }
      return;
    }

    if (generationRef.current !== gen) {
      try { stream.getTracks().forEach((tr) => tr.stop()); } catch { /* ignore */ }
      streamRef.current = null;
      return;
    }
    setIsStarting(false);
    // Start decoding only after mount; tick guards on frame readiness (F05).
    animFrameIdRef.current = requestAnimationFrame((t) => tick(t, gen));
  };

  return (
    <div className={styles.container} data-testid="camera-scanner-container">
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span>📷</span>
          <span>{t(dict, 'gate.cameraTitle')}</span>
        </h2>
        <Button
          type="button"
          variant={isStreaming ? 'outline' : 'primary'}
          size="sm"
          onClick={isStreaming ? stopCamera : startCamera}
          disabled={!isStreaming && disabled}
          loading={isStarting && !isStreaming}
          data-testid="toggle-camera-btn"
        >
          {isStreaming ? t(dict, 'gate.stopCamera') : t(dict, 'gate.startCamera')}
        </Button>
      </div>

      {errorNotice && (
        <Notice
          variant="warning"
          data-testid="camera-denied-notice"
          title={t(dict, 'gate.cameraDenied')}
        >
          {errorNotice}
        </Notice>
      )}

      {isStreaming ? (
        <div className={styles.viewfinderContainer}>
          <video
            ref={videoRef}
            className={styles.video}
            autoPlay
            playsInline
            muted
            data-testid="camera-video"
          />
          <canvas ref={canvasRef} className={styles.canvas} />
          <div className={styles.overlay} aria-hidden="true">
            <div className={styles.scanBox}>
              <div className={styles.scanCornerTL} />
              <div className={styles.scanCornerTR} />
              <div className={styles.scanCornerBL} />
              <div className={styles.scanCornerBR} />
              <div className={styles.scanLine} />
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.placeholder} data-testid="camera-placeholder">
          <span className={styles.placeholderIcon}>📷</span>
          <p className={styles.hint}>{t(dict, 'gate.cameraHint')}</p>
        </div>
      )}
    </div>
  );
}
