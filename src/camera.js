/**
 * Webcam Capture Logic
 */

import { appState } from "./state.js";
import { dom, showToast } from "./dom.js";

export async function openCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    
    appState.activeCameraStream = stream;
    dom.cameraStream.srcObject = stream;
    dom.cameraDialog.showModal();
  } catch (err) {
    console.error("Camera access error:", err);
    showToast("Could not access camera. Please check permissions.");
  }
}

export function capturePhoto() {
  if (!appState.activeCameraStream) return;

  const video = dom.cameraStream;
  const canvas = dom.cameraCanvas;
  const context = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  stopCameraStream();
  dom.cameraDialog.close();

  const dataUrl = canvas.toDataURL("image/jpeg");
  appState.currentImageBase64 = dataUrl.split(",")[1];
  appState.currentMimeType = "image/jpeg";
  appState.rotationAngle = 0;
  dom.receiptPreview.style.transform = "rotate(0deg)";

  dom.receiptPreview.src = dataUrl;
  dom.dropZone.classList.add("hidden");
  dom.previewZone.classList.remove("hidden");
  dom.btnScan.removeAttribute("disabled");

  showToast("Photo captured successfully!");
}

export function stopCameraStream() {
  if (appState.activeCameraStream) {
    appState.activeCameraStream.getTracks().forEach(track => track.stop());
    appState.activeCameraStream = null;
  }
}
