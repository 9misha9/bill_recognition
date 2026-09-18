/**
 * Application State Management & Storage Utilities
 */

export const appState = {
  apiKey: localStorage.getItem("gemini_api_key") || "",
  currentImageBase64: "",
  currentMimeType: "",
  rotationAngle: 0,
  activeCameraStream: null,
  history: JSON.parse(localStorage.getItem("receipt_history") || "[]"),
  currentReceiptData: null
};

export function saveApiKey(key) {
  if (key) {
    appState.apiKey = key;
    localStorage.setItem("gemini_api_key", key);
  } else {
    appState.apiKey = "";
    localStorage.removeItem("gemini_api_key");
  }
}

export function saveHistory() {
  localStorage.setItem("receipt_history", JSON.stringify(appState.history));
}
