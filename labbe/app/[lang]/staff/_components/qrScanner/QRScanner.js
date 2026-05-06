"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import styles from "./QRScanner.module.css";

export default function QRScanner({ isOpen, onClose, onScan, t }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);

  const [hasCamera, setHasCamera] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState("environment"); // 'environment' = back camera

  // Dynamically import jsQR to avoid SSR issues
  const [jsQR, setJsQR] = useState(null);

  useEffect(() => {
    import("jsqr").then((module) => {
      setJsQR(() => module.default);
    });
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsScanning(true);

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", true);
        await videoRef.current.play();
      }
    } catch (err) {
      setHasCamera(false);
      setError(t("qr.cameraError"));
      setIsScanning(false);
    }
  }, [facingMode, t]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
  }, []);

  // Scan for QR codes
  const scanQRCode = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !jsQR || !isScanning) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanQRCode);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code) {
      // QR code found
      setIsScanning(false);
      stopCamera();

      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }

      // Call onScan with the QR data
      onScan(code.data);
    } else {
      // Continue scanning
      animationRef.current = requestAnimationFrame(scanQRCode);
    }
  }, [jsQR, isScanning, stopCamera, onScan]);

  // Start scanning when camera is ready
  useEffect(() => {
    if (isScanning && jsQR) {
      animationRef.current = requestAnimationFrame(scanQRCode);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isScanning, jsQR, scanQRCode]);

  // Handle modal open/close
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Toggle camera (front/back)
  const toggleCamera = () => {
    stopCamera();
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    setTimeout(() => startCamera(), 100);
  };

  // Handle close
  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.closeButton} onClick={handleClose}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <h2 className={styles.title}>{t("qr.scanTitle")}</h2>
          <button className={styles.flipButton} onClick={toggleCamera}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M11 19H4a2 2 0 01-2-2V7a2 2 0 012-2h5" />
              <path d="M13 5h7a2 2 0 012 2v10a2 2 0 01-2 2h-5" />
              <path d="M7 10l3-3 3 3" />
              <path d="M17 14l-3 3-3-3" />
            </svg>
          </button>
        </div>

        {/* Camera View */}
        <div className={styles.cameraContainer}>
          {error ? (
            <div className={styles.errorState}>
              <div className={styles.errorIcon}>📷</div>
              <p>{error}</p>
              <button className={styles.retryButton} onClick={startCamera}>
                {t("qr.retry")}
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className={styles.video}
                playsInline
                muted
              />
              <canvas ref={canvasRef} className={styles.canvas} />

              {/* Scanning overlay */}
              <div className={styles.scanOverlay}>
                <div className={styles.scanFrame}>
                  <div className={`${styles.corner} ${styles.topLeft}`}></div>
                  <div className={`${styles.corner} ${styles.topRight}`}></div>
                  <div
                    className={`${styles.corner} ${styles.bottomLeft}`}
                  ></div>
                  <div
                    className={`${styles.corner} ${styles.bottomRight}`}
                  ></div>
                  <div className={styles.scanLine}></div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Instructions */}
        <div className={styles.instructions}>
          <p>{t("qr.instructions")}</p>
        </div>
      </div>
    </div>
  );
}
