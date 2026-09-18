/**
 * Export Formatted Previews & Clipboard Utility Functions
 */

import { showToast } from "./dom.js";

export function generateMarkdown(data) {
  const cur = data.currency || "$";
  let md = `# Receipt: ${data.storeName || "Unknown Store"}\n`;
  if (data.country) {
    md += `**Country:** ${data.country}\n`;
  }
  if (data.date || data.time) {
    md += `**Date:** ${data.date || ""} ${data.time || ""}\n`;
  }
  if (data.storeAddress) {
    md += `**Address:** ${data.storeAddress}\n`;
  }
  if (data.paymentMethod) {
    md += `**Payment:** ${data.paymentMethod}\n`;
  }
  md += `\n## Items\n`;
  md += `| Item | Quantity | Base Price | Discount | Final Total |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: |\n`;
  
  if (data.items && data.items.length > 0) {
    data.items.forEach((item) => {
      const q = item.quantity !== undefined ? item.quantity : 1;
      const bp = item.basePrice !== undefined ? item.basePrice.toFixed(2) : (item.price ? item.price.toFixed(2) : "--");
      const d = (item.discount && item.discount > 0.001) ? `-${item.discount.toFixed(2)} ${cur}` : "--";
      const ft = item.finalTotal !== undefined ? item.finalTotal.toFixed(2) : (item.total ? item.total.toFixed(2) : "--");
      md += `| ${item.name} | ${q} | ${bp} ${cur} | ${d} | ${ft} ${cur} |\n`;
    });
  } else {
    md += `| -- | -- | -- | -- | -- |\n`;
  }
  
  md += `\n`;
  if (data.subtotal) md += `**Subtotal:** ${data.subtotal.toFixed(2)} ${cur}\n`;
  if (data.tax) md += `**Tax:** ${data.tax.toFixed(2)} ${cur}\n`;
  if (data.tips) md += `**Tips:** ${data.tips.toFixed(2)} ${cur}\n`;
  md += `**Total Due:** **${data.total ? data.total.toFixed(2) : "0.00"} ${cur}**\n`;
  
  if (data.discountAnalysisResult) {
    md += `\n### Discount Analysis\n`;
    const res = data.discountAnalysisResult;
    if (res.isIncluded) {
      md += `* **Status:** Discount included in item prices\n`;
      md += `* **Calculation:** Item total sum (${res.sumOfItems.toFixed(2)} ${cur}) matches receipt total. Discount (${res.absDiscountSum.toFixed(2)} ${cur}) was already factored into item costs.\n`;
    } else {
      md += `* **Status:** Discount NOT included in item prices\n`;
      md += `* **Calculation:** Item total sum (${res.sumOfItems.toFixed(2)} ${cur}) - Discount (${res.absDiscountSum.toFixed(2)} ${cur}) = Expected Total (${res.expectedTotal.toFixed(2)} ${cur}).\n`;
    }
  }
  
  return md;
}

export function generateCSV(data) {
  const cur = data.currency || "$";
  let csv = `"Item Name","Quantity","Base Price","Discount","Final Total"\n`;
  if (data.items && data.items.length > 0) {
    data.items.forEach((item) => {
      const name = item.name.replace(/"/g, '""');
      const q = item.quantity !== undefined ? item.quantity : 1;
      const bp = item.basePrice !== undefined ? item.basePrice.toFixed(2) : "0.00";
      const d = (item.discount && item.discount > 0.001) ? `-${item.discount.toFixed(2)}` : "0.00";
      const ft = item.finalTotal !== undefined ? item.finalTotal.toFixed(2) : "0.00";
      csv += `"${name}",${q},${bp},${d},${ft}\n`;
    });
  }
  
  csv += `\n`;
  csv += `"Store","${(data.storeName || "Unknown Store").replace(/"/g, '""')}",,,\n`;
  csv += `"Country","${(data.country || "Unknown").replace(/"/g, '""')}",,,\n`;
  csv += `"Date","${data.date || ""} ${data.time || ""}",,,\n`;
  csv += `"Total Due","${data.total ? data.total.toFixed(2) : "0.00"}","${cur}",,\n`;
  return csv;
}

export function copyTextToClipboard(text) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast("Copied to clipboard! 📋");
  }).catch((err) => {
    console.error("Clipboard copy error:", err);
    showToast("Could not copy. Try selecting and copying manually.");
  });
}

export function copyItemsListText(data) {
  if (!data) return;

  const cur = data.currency || "$";
  let text = `Receipt Items List: ${data.storeName || "Unknown Store"}\n`;
  if (data.country) text += `Country: ${data.country}\n`;
  text += `Date: ${data.date || ""} ${data.time || ""}\n\n`;
  
  if (data.items && data.items.length > 0) {
    data.items.forEach((item, index) => {
      const q = item.quantity !== undefined ? item.quantity : 1;
      const bp = item.basePrice !== undefined ? item.basePrice.toFixed(2) : "0";
      const ft = item.finalTotal !== undefined ? item.finalTotal.toFixed(2) : "0";
      let line = `${index + 1}. ${item.name} (${q} x ${bp} ${cur})`;
      if (item.discount && item.discount > 0.001) {
        line += ` [Discount: -${item.discount.toFixed(2)} ${cur}]`;
      }
      line += ` = ${ft} ${cur}\n`;
      text += line;
    });
  } else {
    text += "No items.\n";
  }

  text += `\nTotal Due: ${data.total ? data.total.toFixed(2) : "0.00"} ${cur}`;
  
  copyTextToClipboard(text);
}
