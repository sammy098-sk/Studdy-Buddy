const crypto = require('crypto');

function buildTreeAndCategorize(flatChapters) {
  // We assume flatChapters are sorted by page_number
  
  let finalChapters = [];
  
  let frontMatterId = crypto.randomUUID();
  let hasFrontMatter = false;
  
  let backMatterId = crypto.randomUUID();
  let hasBackMatter = false;
  
  let currentChapterId = null;
  let currentChapterPage = 0;
  
  // We need to identify when Main Chapters start.
  // Usually, the first Chapter 1 is the start of main content.
  let mainContentStarted = false;
  
  let orderIdx = 0;
  
  for (const ch of flatChapters) {
     const titleLower = ch.title.toLowerCase();
     const isFrontType = /^(preface|foreword|acknowledgements|about the authors?|copyright|table of contents|dedication)/i.test(ch.title);
     const isBackType = /^(appendix|glossary|credits|references|bibliography|index|solutions|answers)/i.test(ch.title);
     const isChapter = /^(chapter|unit|part)\s+\d+/i.test(ch.title);
     const isSection = /^(concept|section)\s+\d+\.\d+/i.test(ch.title);
     
     if (isChapter) {
        mainContentStarted = true;
     }
     
     if (!mainContentStarted && isFrontType) {
        if (!hasFrontMatter) {
           finalChapters.push({ id: frontMatterId, title: "Front Matter", page_number: ch.page_number, level: 0, parent_id: null, order_index: orderIdx++ });
           hasFrontMatter = true;
        }
        ch.parent_id = frontMatterId;
        ch.level = 1;
        ch.order_index = orderIdx++;
        finalChapters.push(ch);
     } 
     else if (mainContentStarted && isBackType) {
        if (!hasBackMatter) {
           finalChapters.push({ id: backMatterId, title: "Back Matter", page_number: ch.page_number, level: 0, parent_id: null, order_index: orderIdx++ });
           hasBackMatter = true;
        }
        ch.parent_id = backMatterId;
        ch.level = 1;
        ch.order_index = orderIdx++;
        finalChapters.push(ch);
     }
     else if (isChapter) {
        ch.parent_id = null;
        ch.level = 0;
        ch.order_index = orderIdx++;
        currentChapterId = ch.id;
        currentChapterPage = ch.page_number;
        finalChapters.push(ch);
     }
     else if (isSection && currentChapterId) {
        ch.parent_id = currentChapterId;
        ch.level = 1;
        ch.order_index = orderIdx++;
        finalChapters.push(ch);
     }
     else {
        // Unknown, just keep it at root or under current chapter
        if (currentChapterId) {
           ch.parent_id = currentChapterId;
           ch.level = 1;
        } else {
           ch.parent_id = null;
           ch.level = 0;
        }
        ch.order_index = orderIdx++;
        finalChapters.push(ch);
     }
  }
  
  return finalChapters;
}

const input = [
  { id: "1", title: "Preface", page_number: 1 },
  { id: "2", title: "Chapter 1 Intro", page_number: 10 },
  { id: "3", title: "Concept 1.1", page_number: 12 },
  { id: "4", title: "Glossary", page_number: 50 },
];
console.log(buildTreeAndCategorize(input));
