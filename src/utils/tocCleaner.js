export function isJunkBookmark(title = "") {
  if (!title || typeof title !== 'string') return true;
  const clean = title.trim();
  if (clean.length < 2) return true;

  // 1. Remove obvious math exercises, instructions, problem prompts, and homework words
  const junkKeywords = /\b(solve|estimate|extension|try it now|practice problem|example \d|exercise \d|question \d|check your progress|test yourself|skill check|guided practice|your turn|warm[\-\s]?up)\b/i;
  if (junkKeywords.test(clean) || /^(solve|estimate|extension|try it now|example|exercise|problem)[:\-\.\s]/i.test(clean)) {
    return true;
  }

  // 2. Remove non-structural numerical measurements or quantities (e.g. "332.1 gallons", "4.693 trillion", "$15.50", "14 kg")
  // NOTE: Unlike naïve scripts that strip anything starting with a digit (/^\d/), we explicitly preserve valid standalone section numbering (e.g. "1.1 Standards of Length", "1 Introduction").
  const measurementUnits = /^\$?[\d\,\.]+\s*(gallons?|liters?|meters?|miles?|feet|foot|inches|in\.|cm|mm|kg|lbs?|pounds?|grams?|seconds?|minutes?|hours?|days?|weeks?|months?|years?|trillion|billion|million|thousand|dollars?|cents?|cubic|square|watts?|volts?|joules?|pascals?|newtons?|units?|mph|km|m\/?s)\b/i;
  if (measurementUnits.test(clean)) {
    return true;
  }

  // 3. Remove raw mathematical equations or expression noise (e.g. "2x + 5 = 10" or purely symbols)
  if (/^[\d\s\+\-\*\/\=\<\>\(\)\.\,xy]+$/i.test(clean) || /\b\d+\s*[\+\-\*\/\=\<\>]\s*\d+\b/.test(clean)) {
    if (!/^(chapter|part|section|concept|unit|module|lesson)\b/i.test(clean) && !/^\d+(?:\.\d+)+\s+[A-Za-z]/.test(clean)) {
      return true;
    }
  }

  // 4. Remove unusually long strings (> 90 characters) that represent paragraph text rather than chapter titles
  if (clean.length > 90 && !/^(chapter|unit|part)\b/i.test(clean)) {
    return true;
  }

  return false;
}

export function filterJunkBookmarks(rawOutline = []) {
  if (!Array.isArray(rawOutline)) return [];
  return rawOutline.filter(item => !isJunkBookmark(item.title || ""));
}
