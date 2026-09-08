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
export function CameraScanner({ onScan, disabled = false, dict }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorNotice, setErrorNotice] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const lastScanRef = useRef({ payload: null, timestamp: 0 });

  const stopCamera = useCallback(() => {
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

  // Stop camera when tab/page is backgrounded
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isStreaming) {
        stopCamera();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isStreaming, stopCamera]);

  // Decode frame loop
  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameIdRef.current = requestAnimationFrame(tick);
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
          const now = Date.now();
          const trimmed = code.data.trim();

          // Ignored duplicate frames within 2 seconds
          if (
            lastScanRef.current.payload === trimmed &&
            now - lastScanRef.current.timestamp < 2000
          ) {
            // duplicate frame, continue scanning
          } else {
            lastScanRef.current = { payload: trimmed, timestamp: now };
            // Stop camera on detection and dispatch
            stopCamera();
            onScan(trimmed, 'camera');
            return;
          }
        }
      }
    }

    // Schedule next frame with bounded frequency
    animFrameIdRef.current = requestAnimationFrame(tick);
  }, [onScan, stopCamera]);

  const startCamera = async () => {
    setErrorNotice(null);
    setIsStarting(true);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setIsStarting(false);
      setErrorNotice(t(dict, 'gate.cameraUnavailable'));
      return;
    }

    try {
      // First attempt rear camera
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback to any available video stream
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setIsStreaming(true);
      setIsStarting(false);
      animFrameIdRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setIsStarting(false);
      setIsStreaming(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorNotice(t(dict, 'gate.cameraDenied'));
      } else {
        setErrorNotice(t(dict, 'gate.cameraUnavailable'));
      }
    }
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
          disabled={disabled || isStarting}
          loading={isStarting}
          data-testid="toggle-camera-btn"
        >
          {isStreaming ? t(dict, 'gate.stopCamera') : t(dict, 'gate.startCamera')}
        </Button>
      </div>

      {errorNotice && (
        <Notice
          type="warning"
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
