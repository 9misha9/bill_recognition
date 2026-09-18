/**
 * DOM Elements Cache & Notification Utilities
 */

export const dom = {
  // API Key Widget
  btnApiSettings: document.getElementById("btn-api-settings"),
  apiStatusDot: document.getElementById("api-status-dot"),
  apiStatusText: document.getElementById("api-status-text"),
  apiDialog: document.getElementById("api-dialog"),
  inputApiKey: document.getElementById("input-api-key"),
  btnSaveApi: document.getElementById("btn-save-api"),

  // Upload Zone
  dropZone: document.getElementById("drop-zone"),
  fileInput: document.getElementById("file-input"),
  btnBrowse: document.getElementById("btn-browse"),
  btnCamera: document.getElementById("btn-camera"),
  previewZone: document.getElementById("preview-zone"),
  receiptPreview: document.getElementById("receipt-preview"),
  scanLaser: document.getElementById("scan-laser"),
  btnRotate: document.getElementById("btn-rotate"),
  btnChangeImage: document.getElementById("btn-change-image"),
  btnScan: document.getElementById("btn-scan"),

  // Camera Dialog
  cameraDialog: document.getElementById("camera-dialog"),
  cameraStream: document.getElementById("camera-stream"),
  cameraCanvas: document.getElementById("camera-canvas"),
  btnCapturePhoto: document.getElementById("btn-capture-photo"),
  btnCancelCamera: document.getElementById("btn-cancel-camera"),
  btnCloseCamera: document.getElementById("btn-close-camera"),

  // Results State
  resultsEmpty: document.getElementById("results-empty"),
  resultsLoading: document.getElementById("results-loading"),
  resultsContent: document.getElementById("results-content"),

  // Structured Result View
  resStore: document.getElementById("res-store"),
  resDatetime: document.getElementById("res-datetime"),
  resTotal: document.getElementById("res-total"),
  resCountry: document.getElementById("res-country"),
  resAddress: document.getElementById("res-address"),
  resPayment: document.getElementById("res-payment"),
  resTableBody: document.getElementById("res-table-body"),
  btnCopyItems: document.getElementById("btn-copy-items"),
  discountAnalysisPanel: document.getElementById("discount-analysis-panel"),
  discountList: document.getElementById("discount-list"),
  discountAnalysisText: document.getElementById("discount-analysis-text"),

  // Raw / Formatted Previews
  codeMarkdown: document.getElementById("code-markdown"),
  codeCsv: document.getElementById("code-csv"),
  codeRaw: document.getElementById("code-raw"),
  btnCopyMd: document.getElementById("btn-copy-md"),
  btnCopyCsv: document.getElementById("btn-copy-csv"),
  btnCopyRaw: document.getElementById("btn-copy-raw"),

  // History Section
  historyContainer: document.getElementById("history-container"),
  historyEmptyText: document.getElementById("history-empty-text"),
  btnClearHistory: document.getElementById("btn-clear-history"),

  // Toast
  toast: document.getElementById("toast"),
  toastMessage: document.getElementById("toast-message")
};

let toastTimeout;
export function showToast(message, duration = 3000) {
  clearTimeout(toastTimeout);
  dom.toastMessage.textContent = message;
  dom.toast.classList.remove("hidden");
  
  toastTimeout = setTimeout(() => {
    dom.toast.classList.add("hidden");
  }, duration);
}
