const testCases = [
  "CHAPTER 2 The Chemical Context of Life  37  Chapter 3 is devoted entirely to its structure and behavior.",
  "Chapter 1 - Introduction  Something else.",
  "Unit 3: Two-Dimensional Motion",
  "Concept 2.1 Matter consists of chemical elements in pure form and in combinations called compounds",
  "CHAPTER 2 The Chemi...",
  "Section 4.1"
];

for (const text of testCases) {
  let heading = "";
  let level = 0;
  
  // Chapter regex: Chapter/Unit/Part [Number] [Separator] [Title until double-space or period]
  const chapMatch = text.match(/(?:Chapter|Unit|Part)\s+\d+(?:[\:\-\.\s]+([A-Za-z](?:(?!\s\s|\.).)*))?/i);
  
  if (chapMatch) {
    heading = chapMatch[0].trim();
    level = 0;
  } else {
    const conceptMatch = text.match(/(?:Concept|Section)\s+\d+\.\d+(?:[\:\-\.\s]+([A-Za-z](?:(?!\s\s|\.).)*))?/i);
    if (conceptMatch) {
      heading = conceptMatch[0].trim();
      level = 1;
    }
  }
  
  if (heading) {
    heading = heading.replace(/\s+\d+$/, "").trim();
  }
  
  console.log(`Original: "${text}"`);
  console.log(`Extracted: "${heading}" (Level ${level})`);
  console.log('---');
}
