// Test script for scoring system

const lines = [
  { text: "CHAPTER 3", fontSize: 24, isLargestOnPage: true },
  { text: "The Cell", fontSize: 24, isLargestOnPage: true },
  { text: "Chapter 3 is devoted entirely to its structure and behavior.", fontSize: 12, isLargestOnPage: false },
  { text: "Concept 5.1 explains how", fontSize: 14, isLargestOnPage: false },
  { text: "Preface", fontSize: 22, isLargestOnPage: true },
  { text: "Appendix A", fontSize: 22, isLargestOnPage: true },
  { text: "Introduction", fontSize: 20, isLargestOnPage: false }, // maybe score too low
];

function scoreCandidate(text, fontSize, isLargestOnPage) {
  let score = 0;
  let cleanText = text.trim();
  
  // Positive signals
  if (/^(Chapter|Unit|Part)\s+\d+/i.test(cleanText)) score += 40;
  else if (/^(Concept|Section)\s+\d+\.\d+/i.test(cleanText)) score += 40;
  else if (/^(Appendix|Glossary|Index|Preface|Acknowledgements|About the Authors|Table of Contents)/i.test(cleanText)) score += 40;
  
  if (isLargestOnPage) score += 20;
  
  // Short title
  if (cleanText.split(/\s+/).length < 12) score += 10;
  
  // Negative signals
  if (cleanText.endsWith(".")) score -= 30;
  if (/\b(explains|describes|provides|introduces|discusses|shows|demonstrates|illustrates)\b/i.test(cleanText)) score -= 40;
  
  if (cleanText.length > 80) score -= 25; // Very long sentence
  if (cleanText.includes(",")) score -= 15;
  
  return score;
}

for (const line of lines) {
  const score = scoreCandidate(line.text, line.fontSize, line.isLargestOnPage);
  console.log(`"${line.text}" -> Score: ${score}`);
}
