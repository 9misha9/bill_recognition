import { analyzeReceipt } from "./gemini.js";
import { appState, saveApiKey, saveHistory } from "./src/state.js";
import { dom, showToast } from "./src/dom.js";
import {
  correctWithRawText,
  findMatchingItem,
  findPrecedingItemInRawText,
  toTitleCase
} from "./src/discountAnalyzer.js";
import {
  generateMarkdown,
  generateCSV,
  copyTextToClipboard,
  copyItemsListText
} from "./src/exporters.js";
import { openCamera, capturePhoto, stopCameraStream } from "./src/camera.js";
import { addToHistory, renderHistory } from "./src/history.js";

// ==========================================================================
// INITIALIZATION
// ==========================================================================
function init() {
  updateApiStatusUI();
  setupEventListeners();
  renderHistory(displayReceiptData);
}

function updateApiStatusUI() {
  if (appState.apiKey) {
    dom.apiStatusDot.className = "status-indicator status-on";
    dom.apiStatusText.textContent = "API Key Active";
  } else {
    dom.apiStatusDot.className = "status-indicator status-off";
    dom.apiStatusText.textContent = "Enter API Key";
  }
}

// ==========================================================================
// EVENT LISTENERS SETUP
// ==========================================================================
function setupEventListeners() {
  // API Dialog Events
  dom.btnApiSettings.addEventListener("click", () => {
    dom.inputApiKey.value = appState.apiKey;
    dom.apiDialog.showModal();
  });

  dom.btnSaveApi.addEventListener("click", () => {
    const key = dom.inputApiKey.value.trim();
    saveApiKey(key);
    showToast(key ? "API Key saved successfully!" : "API Key removed.");
    updateApiStatusUI();
    dom.apiDialog.close();
  });

  // File Upload Handling
  dom.btnBrowse.addEventListener("click", (e) => {
    e.stopPropagation();
    dom.fileInput.click();
  });

  dom.dropZone.addEventListener("click", () => {
    dom.fileInput.click();
  });

  dom.fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });

  // Drag and Drop Events
  ["dragenter", "dragover"].forEach((eventName) => {
    dom.dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dom.dropZone.classList.add("dragover");
    }, false);
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dom.dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dom.dropZone.classList.remove("dragover");
    }, false);
  });

  dom.dropZone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    if (dt.files.length > 0) {
      handleFileSelected(dt.files[0]);
    }
  });

  // Paste from Clipboard
  window.addEventListener("paste", (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        handleFileSelected(items[i].getAsFile());
        showToast("Image pasted from clipboard!");
        break;
      }
    }
  });

  // Image manipulation buttons
  dom.btnRotate.addEventListener("click", () => {
    appState.rotationAngle = (appState.rotationAngle + 90) % 360;
    dom.receiptPreview.style.transform = `rotate(${appState.rotationAngle}deg)`;
  });

  dom.btnChangeImage.addEventListener("click", () => {
    resetImagePreview();
  });

  // Scan trigger
  dom.btnScan.addEventListener("click", () => {
    triggerReceiptScan();
  });

  // Camera Live Capture Actions
  dom.btnCamera.addEventListener("click", (e) => {
    e.stopPropagation();
    openCamera();
  });

  dom.btnCapturePhoto.addEventListener("click", () => {
    capturePhoto();
  });

  dom.btnCancelCamera.addEventListener("click", () => {
    stopCameraStream();
    dom.cameraDialog.close();
  });

  dom.btnCloseCamera.addEventListener("click", () => {
    stopCameraStream();
    dom.cameraDialog.close();
  });

  // Copy Buttons for Fields
  document.querySelectorAll(".btn-copy-small").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-copy-target");
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        copyTextToClipboard(targetEl.textContent);
      }
    });
  });

  // Main Copy actions for formats
  dom.btnCopyMd.addEventListener("click", () => {
    copyTextToClipboard(dom.codeMarkdown.textContent);
  });

  dom.btnCopyCsv.addEventListener("click", () => {
    copyTextToClipboard(dom.codeCsv.textContent);
  });

  dom.btnCopyRaw.addEventListener("click", () => {
    copyTextToClipboard(dom.codeRaw.textContent);
  });

  dom.btnCopyItems.addEventListener("click", () => {
    copyItemsListText(appState.currentReceiptData);
  });

  // Tab switching
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const targetPane = tab.getAttribute("data-tab");
      document.querySelectorAll(".tab-pane").forEach((pane) => {
        pane.classList.remove("active");
      });
      document.getElementById(targetPane).classList.add("active");
    });
  });

  // Clear history
  dom.btnClearHistory.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all scan history?")) {
      appState.history = [];
      saveHistory();
      renderHistory(displayReceiptData);
      showToast("History cleared");
    }
  });
}

// ==========================================================================
// FILE & PREVIEW LOGIC
// ==========================================================================
function handleFileSelected(file) {
  if (!file.type.match("image.*")) {
    showToast("Please select an image file.");
    return;
  }

  appState.currentMimeType = file.type;
  appState.rotationAngle = 0;
  dom.receiptPreview.style.transform = "rotate(0deg)";

  const reader = new FileReader();
  reader.onload = (e) => {
    dom.receiptPreview.src = e.target.result;
    appState.currentImageBase64 = e.target.result.split(",")[1];
    
    dom.dropZone.classList.add("hidden");
    dom.previewZone.classList.remove("hidden");
    dom.btnScan.removeAttribute("disabled");
  };
  reader.readAsDataURL(file);
}

function resetImagePreview() {
  appState.currentImageBase64 = "";
  appState.currentMimeType = "";
  appState.rotationAngle = 0;
  
  dom.receiptPreview.src = "#";
  dom.dropZone.classList.remove("hidden");
  dom.previewZone.classList.add("hidden");
  dom.btnScan.setAttribute("disabled", "true");
  dom.fileInput.value = "";
}

// Helper to bake CSS rotation into image base64 before API upload
function getRotatedImageBase64() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      const angleRad = (appState.rotationAngle * Math.PI) / 180;
      
      if (appState.rotationAngle % 180 === 90) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }
      
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(angleRad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      
      resolve(canvas.toDataURL(appState.currentMimeType).split(",")[1]);
    };
    img.src = dom.receiptPreview.src;
  });
}

// ==========================================================================
// SCANNING LOGIC (GEMINI CALL & PROCESSING)
// ==========================================================================
async function triggerReceiptScan() {
  if (!appState.apiKey) {
    dom.apiDialog.showModal();
    showToast("Please enter your Gemini API key before scanning.");
    return;
  }

  setLoadingState(true);

  try {
    let base64ToSend = appState.currentImageBase64;
    if (appState.rotationAngle !== 0) {
      base64ToSend = await getRotatedImageBase64();
    }

    const receiptResult = await analyzeReceipt(
      appState.apiKey,
      base64ToSend,
      appState.currentMimeType,
      (attempt, maxAttempts, delayMs) => {
        const loadingHeading = dom.resultsLoading.querySelector("h3");
        const loadingSub = dom.resultsLoading.querySelector("p");
        if (loadingHeading) {
          loadingHeading.textContent = "Server busy. Retrying...";
        }
        if (loadingSub) {
          loadingSub.textContent = `Server experiencing high demand. Retrying in ${(delayMs / 1000).toFixed(1)}s (Attempt ${attempt}/${maxAttempts})...`;
        }
      }
    );

    appState.currentReceiptData = receiptResult;
    displayReceiptData(receiptResult);
    addToHistory(receiptResult);
    
    showToast("Receipt scanned successfully! 🎉");
  } catch (err) {
    showToast(`Error: ${err.message}`, 6000);
  } finally {
    setLoadingState(false);
  }
}

function setLoadingState(isLoading) {
  const loadingHeading = dom.resultsLoading.querySelector("h3");
  const loadingSub = dom.resultsLoading.querySelector("p");
  if (loadingHeading) {
    loadingHeading.textContent = "AI is analyzing receipt...";
  }
  if (loadingSub) {
    loadingSub.textContent = "Please wait. Gemini is recognizing items, prices, and receipt structure.";
  }

  if (isLoading) {
    dom.resultsEmpty.classList.add("hidden");
    dom.resultsContent.classList.add("hidden");
    dom.resultsLoading.classList.remove("hidden");
    dom.scanLaser.classList.remove("hidden");
    dom.btnScan.setAttribute("disabled", "true");
    dom.btnChangeImage.setAttribute("disabled", "true");
    dom.btnRotate.setAttribute("disabled", "true");
  } else {
    dom.resultsLoading.classList.add("hidden");
    dom.scanLaser.classList.add("hidden");
    dom.btnScan.removeAttribute("disabled");
    dom.btnChangeImage.removeAttribute("disabled");
    dom.btnRotate.removeAttribute("disabled");
  }
}

// ==========================================================================
// RESULTS DISPLAY & FORMATTING
// ==========================================================================
function displayReceiptData(data) {
  // 0. Apply spelling correction using raw text words before capitalization
  if (data.rawText) {
    if (data.storeName) data.storeName = correctWithRawText(data.storeName, data.rawText);
    if (data.storeAddress) data.storeAddress = correctWithRawText(data.storeAddress, data.rawText);
    if (data.items && data.items.length > 0) {
      data.items.forEach(item => {
        if (item.name) item.name = correctWithRawText(item.name, data.rawText);
      });
    }
    if (data.discounts && data.discounts.length > 0) {
      data.discounts.forEach(disc => {
        if (disc.appliedToItem) disc.appliedToItem = correctWithRawText(disc.appliedToItem, data.rawText);
        if (disc.description) disc.description = correctWithRawText(disc.description, data.rawText);
      });
    }
  }

  if (data.storeName) data.storeName = toTitleCase(data.storeName);
  if (data.storeAddress) data.storeAddress = toTitleCase(data.storeAddress);
  if (data.country) data.country = toTitleCase(data.country);
  if (data.paymentMethod) data.paymentMethod = toTitleCase(data.paymentMethod);
  
  if (data.items && data.items.length > 0) {
    data.items.forEach(item => {
      if (item.name) item.name = toTitleCase(item.name);
    });
  }

  if (data.discounts && data.discounts.length > 0) {
    data.discounts.forEach(disc => {
      if (disc.appliedToItem) disc.appliedToItem = toTitleCase(disc.appliedToItem);
      if (disc.description) disc.description = toTitleCase(disc.description);
    });
  }

  // 1. Fill basic metadata
  dom.resStore.textContent = data.storeName || "Unknown Store";
  
  let dateTimeStr = "";
  if (data.date) {
    const dateObj = new Date(data.date);
    dateTimeStr = isNaN(dateObj) ? data.date : dateObj.toLocaleDateString("en-US");
    if (data.time) dateTimeStr += ` ${data.time}`;
  } else {
    dateTimeStr = "Unknown date";
  }
  dom.resDatetime.textContent = dateTimeStr;
  
  const cur = data.currency || "$";
  dom.resTotal.textContent = data.total ? `${data.total.toFixed(2)} ${cur}` : `0.00 ${cur}`;
  dom.resCountry.textContent = data.country || "Not specified";
  dom.resAddress.textContent = data.storeAddress || "Not specified";
  dom.resPayment.textContent = data.paymentMethod || "Not specified";

  // Initialize per-item base prices, totals, and discount accumulators
  if (data.items && data.items.length > 0) {
    data.items.forEach(item => {
      item.quantity = item.quantity !== undefined ? item.quantity : 1;
      item.basePrice = item.price !== undefined ? item.price : (item.total || 0);
      item.baseTotal = item.total !== undefined ? item.total : (item.price || 0);
      item.discount = 0;
      item.finalTotal = item.baseTotal;
      item.finalPrice = item.basePrice;
    });
  }

  // 2. Perform Discount Analysis & Price Corrections
  dom.discountList.innerHTML = "";

  if (data.discounts && data.discounts.length > 0) {
    dom.discountAnalysisPanel.classList.remove("hidden");
    
    let sumOfItems = 0;
    if (data.items && data.items.length > 0) {
      sumOfItems = data.items.reduce((sum, item) => sum + (item.baseTotal || 0), 0);
    }
    const sumOfDiscounts = data.discounts.reduce((sum, disc) => sum + (disc.amount || 0), 0);
    const absDiscountSum = Math.abs(sumOfDiscounts);
    const actualTotal = data.total || 0;
    
    data.discounts.forEach((disc) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="discount-desc">${disc.description || 'Discount'}</span><span class="discount-val">${disc.amount.toFixed(2)} ${cur}</span>`;
      dom.discountList.appendChild(li);
    });
    
    const targetPaidSum = actualTotal - (data.tips || 0);

    const expectedTotalA = sumOfItems;
    const diffA = Math.abs(expectedTotalA - targetPaidSum);
    
    const expectedTotalB = sumOfItems - absDiscountSum;
    const diffB = Math.abs(expectedTotalB - targetPaidSum);
    
    const isIncluded = diffA < diffB;
    
    if (isIncluded) {
      data.discounts.forEach(disc => {
        const absAmount = Math.abs(disc.amount);
        let targetItem = null;
        if (disc.appliedToItem) {
          targetItem = findMatchingItem(disc.appliedToItem, data.items);
        }
        if (!targetItem && disc.description) {
          targetItem = findMatchingItem(disc.description, data.items);
        }
        if (!targetItem && data.rawText) {
          targetItem = findPrecedingItemInRawText(disc, data.items, data.rawText);
        }
        if (targetItem) {
          targetItem.discount += absAmount;
          disc.appliedToItem = targetItem.name;
        }
      });
      dom.discountAnalysisText.className = "analysis-result-box included";
      dom.discountAnalysisText.innerHTML = `<strong>Discount already included in item prices:</strong> The sum of items (${sumOfItems.toFixed(2)} ${cur}) matches the final receipt total (${actualTotal.toFixed(2)} ${cur}). Individual discounts (${absDiscountSum.toFixed(2)} ${cur}) were already factored in by the store.`;
      data.discountAnalysisResult = { isIncluded: true, sumOfItems, absDiscountSum, expectedTotal: expectedTotalA };
    } else {
      if (data.items && data.items.length > 0) {
        let totalGlobalDiscount = 0;

        data.discounts.forEach(disc => {
          const absAmount = Math.abs(disc.amount);
          let targetItem = null;

          if (disc.appliedToItem) {
            targetItem = findMatchingItem(disc.appliedToItem, data.items);
          }

          if (!targetItem && disc.description) {
            targetItem = findMatchingItem(disc.description, data.items);
          }

          if (!targetItem && data.rawText) {
            targetItem = findPrecedingItemInRawText(disc, data.items, data.rawText);
          }

          if (!targetItem && data.items.length === 1) {
            targetItem = data.items[0];
          }

          if (targetItem) {
            targetItem.discount += absAmount;
            targetItem.finalTotal = Math.max(0, targetItem.baseTotal - targetItem.discount);
            targetItem.finalPrice = targetItem.quantity > 0 ? targetItem.finalTotal / targetItem.quantity : 0;
            disc.appliedToItem = targetItem.name;
          } else {
            totalGlobalDiscount += absAmount;
          }
        });

        if (totalGlobalDiscount > 0) {
          const sumOfRemainingItems = data.items.reduce((sum, item) => sum + (item.baseTotal || 0), 0);
          
          if (sumOfRemainingItems > 0) {
            data.items.forEach(item => {
              const proportion = item.baseTotal / sumOfRemainingItems;
              const itemDisc = proportion * totalGlobalDiscount;
              item.discount += itemDisc;
              item.finalTotal = Math.max(0, item.baseTotal - item.discount);
              item.finalPrice = item.quantity > 0 ? item.finalTotal / item.quantity : 0;
            });
          }
        }
      }

      dom.discountAnalysisText.className = "analysis-result-box not-included";
      dom.discountAnalysisText.innerHTML = `<strong>Discount NOT included in item prices (deducted automatically):</strong> The sum of items before discount was ${sumOfItems.toFixed(2)} ${cur}. Since the discount (${absDiscountSum.toFixed(2)} ${cur}) was not deducted from individual item prices, it was **automatically subtracted from item prices** to reach the final total of ${actualTotal.toFixed(2)} ${cur}. Updated adjusted prices are shown in the table and export files.`;
      data.discountAnalysisResult = { isIncluded: false, sumOfItems, absDiscountSum, expectedTotal: expectedTotalB };
    }
  } else {
    dom.discountAnalysisPanel.classList.add("hidden");
  }

  // 2.2. Fill 5-Column Table Rows
  dom.resTableBody.innerHTML = "";
  if (data.items && data.items.length > 0) {
    data.items.forEach((item) => {
      const tr = document.createElement("tr");
      
      const tdName = document.createElement("td");
      tdName.textContent = item.name;
      
      const tdQty = document.createElement("td");
      tdQty.className = "text-right";
      tdQty.textContent = item.quantity !== undefined ? item.quantity : 1;
      
      const tdBasePrice = document.createElement("td");
      tdBasePrice.className = "text-right";
      const bp = item.basePrice !== undefined ? item.basePrice : (item.price || 0);
      tdBasePrice.textContent = `${bp.toFixed(2)} ${cur}`;
      
      const tdDiscount = document.createElement("td");
      tdDiscount.className = "text-right";
      if (item.discount && item.discount > 0.001) {
        tdDiscount.innerHTML = `<span class="discount-text-green">-${item.discount.toFixed(2)} ${cur}</span>`;
      } else {
        tdDiscount.textContent = "--";
      }

      const tdTotal = document.createElement("td");
      tdTotal.className = "text-right";
      const ft = item.finalTotal !== undefined ? item.finalTotal : (item.total || 0);
      tdTotal.textContent = `${ft.toFixed(2)} ${cur}`;
      
      tr.appendChild(tdName);
      tr.appendChild(tdQty);
      tr.appendChild(tdBasePrice);
      tr.appendChild(tdDiscount);
      tr.appendChild(tdTotal);
      dom.resTableBody.appendChild(tr);
    });
  } else {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5" class="text-center" style="color: var(--text-muted); text-align: center; padding: 2rem;">No items recognized</td>`;
    dom.resTableBody.appendChild(tr);
  }

  dom.codeMarkdown.textContent = generateMarkdown(data);
  dom.codeCsv.textContent = generateCSV(data);
  dom.codeRaw.textContent = data.rawText || "Receipt raw text is empty.";

  dom.resultsContent.classList.remove("hidden");
}

// Start Application
window.addEventListener("DOMContentLoaded", init);
