/**
 * Scan History Local Storage & UI Management
 */

import { appState, saveHistory } from "./state.js";
import { dom, showToast } from "./dom.js";

export function addToHistory(receiptData) {
  const historyItem = {
    id: Date.now().toString(),
    storeName: receiptData.storeName || "Unknown Store",
    total: receiptData.total || 0,
    date: receiptData.date || new Date().toISOString().split("T")[0],
    itemsCount: receiptData.items ? receiptData.items.length : 0,
    timestamp: Date.now(),
    receiptJson: receiptData
  };

  appState.history.unshift(historyItem);
  
  if (appState.history.length > 10) {
    appState.history.pop();
  }

  saveHistory();
  renderHistory();
}

export function renderHistory(onRestoreCallback) {
  dom.historyContainer.innerHTML = "";
  
  if (appState.history.length === 0) {
    dom.historyEmptyText.classList.remove("hidden");
    dom.btnClearHistory.classList.add("hidden");
    dom.historyContainer.appendChild(dom.historyEmptyText);
    return;
  }

  dom.historyEmptyText.classList.add("hidden");
  dom.btnClearHistory.classList.remove("hidden");

  appState.history.forEach((item) => {
    const card = document.createElement("div");
    card.className = "history-card";
    
    let dateDisp = "Unknown date";
    if (item.date) {
      const dateObj = new Date(item.date);
      dateDisp = isNaN(dateObj) ? item.date : dateObj.toLocaleDateString("en-US");
    }

    const cur = item.receiptJson?.currency || "$";

    card.innerHTML = `
      <div class="history-card-header">
        <span class="history-store" title="${item.storeName}">${item.storeName}</span>
        <span class="history-total">${item.total.toFixed(2)} ${cur}</span>
      </div>
      <div class="history-card-body">
        <span class="history-date">${dateDisp}</span>
        <span class="history-items-count">${item.itemsCount} items</span>
      </div>
      <button class="btn-history-delete" data-id="${item.id}" title="Delete from history">×</button>
    `;

    card.addEventListener("click", (e) => {
      if (e.target.classList.contains("btn-history-delete")) {
        return;
      }
      restoreHistoryItem(item, onRestoreCallback);
    });

    card.querySelector(".btn-history-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteHistoryItem(item.id, onRestoreCallback);
    });

    dom.historyContainer.appendChild(card);
  });
}

export function restoreHistoryItem(item, onRestoreCallback) {
  appState.currentReceiptData = item.receiptJson;
  if (onRestoreCallback) {
    onRestoreCallback(item.receiptJson);
  }
  
  dom.receiptPreview.src = "#";
  dom.previewZone.classList.add("hidden");
  dom.dropZone.classList.remove("hidden");
  dom.btnScan.setAttribute("disabled", "true");
  
  showToast(`Loaded receipt data for "${item.storeName}"`);
}

export function deleteHistoryItem(id, onRestoreCallback) {
  appState.history = appState.history.filter(item => item.id !== id);
  saveHistory();
  renderHistory(onRestoreCallback);
  showToast("Receipt deleted from history");
}
