/**
 * Discount Analysis & Fuzzy Spelling Alignment Engine
 */

export function getLevenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function matchCasing(target, reference) {
  if (reference === reference.toUpperCase()) return target.toUpperCase();
  if (reference === reference.toLowerCase()) return target.toLowerCase();
  if (reference.charAt(0) === reference.charAt(0).toUpperCase()) {
    return target.charAt(0).toUpperCase() + target.slice(1).toLowerCase();
  }
  return target.toLowerCase();
}

export function toTitleCase(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(/\s+/)
    .map(word => {
      if (!word) return "";
      if (word.includes("-")) {
        return word
          .split("-")
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join("-");
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function correctWithRawText(structuredText, rawText) {
  if (!structuredText || !rawText) return structuredText;
  
  const rawWords = rawText
    .toLowerCase()
    .split(/[^a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9'\-]+/)
    .filter(w => w.length > 3);
    
  return structuredText
    .split(/\s+/)
    .map(word => {
      const cleanedWord = word.replace(/[^a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9'\-]+/g, "");
      const normWord = cleanedWord.toLowerCase();
      
      if (normWord.length <= 3) return word;
      if (rawWords.includes(normWord)) return word;
      
      for (const rawWord of rawWords) {
        if (rawWord.startsWith(normWord) && rawWord.length - normWord.length <= 2) {
          const ending = rawWord.slice(normWord.length);
          const restoredCleaned = cleanedWord + ending;
          return word.replace(cleanedWord, matchCasing(restoredCleaned, cleanedWord));
        }
        
        if (getLevenshteinDistance(normWord, rawWord) === 1) {
          return word.replace(cleanedWord, matchCasing(rawWord, cleanedWord));
        }
      }
      return word;
    })
    .join(" ");
}

export function findMatchingItem(targetText, items) {
  if (!targetText || !items || items.length === 0) return null;

  const targetLower = targetText.toLowerCase().trim();
  if (!targetLower) return null;

  // 1. Direct equality
  let match = items.find(item => item.name.toLowerCase() === targetLower);
  if (match) return match;

  // 2. Substring inclusion
  match = items.find(item => {
    const itemNameLower = item.name.toLowerCase();
    return itemNameLower.includes(targetLower) || targetLower.includes(itemNameLower);
  });
  if (match) return match;

  // 3. Token / Word overlap matching
  const genericWords = ["poupança", "imediata", "desconto", "discount", "kupon", "знижка", "скидка", "promo", "promocao"];
  const targetWords = targetLower
    .split(/[^a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9]+/)
    .filter(w => w.length > 2 && !genericWords.includes(w));

  if (targetWords.length > 0) {
    let bestMatch = null;
    let maxOverlap = 0;

    items.forEach(item => {
      const itemWords = item.name.toLowerCase()
        .split(/[^a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9]+/)
        .filter(w => w.length > 2);

      let overlapCount = 0;
      targetWords.forEach(tw => {
        if (itemWords.some(iw => iw.includes(tw) || tw.includes(iw))) {
          overlapCount++;
        }
      });

      if (overlapCount > maxOverlap) {
        maxOverlap = overlapCount;
        bestMatch = item;
      }
    });

    if (bestMatch && maxOverlap > 0) return bestMatch;
  }

  // 4. Levenshtein distance check on item names
  let bestLevMatch = null;
  let minLev = Infinity;

  items.forEach(item => {
    const dist = getLevenshteinDistance(targetLower, item.name.toLowerCase());
    if (dist <= 3 && dist < minLev) {
      minLev = dist;
      bestLevMatch = item;
    }
  });

  return bestLevMatch;
}

export function findPrecedingItemInRawText(disc, items, rawText) {
  if (!disc || !items || items.length === 0 || !rawText) return null;

  const rawLines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const absAmount = Math.abs(disc.amount);
  const amountStrDot = absAmount.toFixed(2);
  const amountStrComma = amountStrDot.replace(".", ",");
  const descLower = (disc.description || "").toLowerCase().trim();

  let discLineIndex = -1;
  for (let i = 0; i < rawLines.length; i++) {
    const lineLower = rawLines[i].toLowerCase();
    
    if (lineLower.includes("total ") || lineLower.includes("resumo") || lineLower.includes("total a pagar") || lineLower.includes("total poupança")) {
      continue;
    }

    const matchesAmount = lineLower.includes(amountStrDot) || lineLower.includes(amountStrComma) || lineLower.includes(`(${amountStrComma})`) || lineLower.includes(`(${amountStrDot})`);
    const matchesDesc = descLower && descLower.length > 2 && lineLower.includes(descLower);

    if (matchesAmount || matchesDesc) {
      discLineIndex = i;
      break;
    }
  }

  if (discLineIndex > 0) {
    for (let lookBack = 1; lookBack <= 3; lookBack++) {
      const prevLineIndex = discLineIndex - lookBack;
      if (prevLineIndex >= 0) {
        const prevLine = rawLines[prevLineIndex];
        const matchedItem = findMatchingItem(prevLine, items);
        if (matchedItem) {
          return matchedItem;
        }
      }
    }
  }

  return null;
}
