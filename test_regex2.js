const testCases = [
  "CHAPTER 2 The Chemical Context of Life\n37\nChapter 3 is devoted entirely to its structure and behavior.",
  "Chapter 1 - Introduction\nSomething else.",
  "Unit 3: Two-Dimensional Motion",
  "Concept 2.1 Matter consists of chemical elements in pure form\nand in combinations called compounds\nThis is paragraph text.",
  "CHAPTER 2 The Chemi-\ncal Context of Life",
];

for (const text of testCases) {
  let heading = "";
  let level = 0;
  
  // Chapter regex: stops at double-newline, period, or if the line is very long, maybe just extract the first 2 lines.
  // Actually, let's just grab the line that has "Chapter X", and maybe the next line if it doesn't look like a sentence.
  
  // Simplified: grab "Chapter X" and the rest of the text up to 100 chars, but stop at a period or double newline.
  const chapMatch = text.replace(/-\n/g, "").match(/(?:Chapter|Unit|Part)\s+\d+(?:[\:\-\.\s]+([A-Za-z](?:(?!\n\n|\.).)*))?/i);
  
  if (chapMatch) {
    heading = chapMatch[0].replace(/\n/g, " ").trim();
    level = 0;
  } else {
    const conceptMatch = text.replace(/-\n/g, "").match(/(?:Concept|Section)\s+\d+\.\d+(?:[\:\-\.\s]+([A-Za-z](?:(?!\n\n|\.).)*))?/i);
    if (conceptMatch) {
      heading = conceptMatch[0].replace(/\n/g, " ").trim();
      level = 1;
    }
  }
  
  // Strip trailing numbers
  if (heading) {
    heading = heading.replace(/\s+\d+$/, "").trim();
    // Trim if it's absurdly long (more than 100 chars)
    if (heading.length > 100) heading = heading.substring(0, 100) + "...";
  }
  
  console.log(`Original: "${text.replace(/\n/g, '\\n')}"`);
  console.log(`Extracted: "${heading}" (Level ${level})`);
  console.log('---');
}
