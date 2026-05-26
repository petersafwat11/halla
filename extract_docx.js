const fs = require('fs');
const path = require('path');

const docxPath = process.argv[2];
const xmlPath = 'plans.xml';

const content = fs.readFileSync(xmlPath, 'utf8');

// Simple text extraction from docx XML
const paragraphs = [];
const paraRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
const textRegex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
const tableRegex = /<w:tbl\b[^>]*>([\s\S]*?)<\/w:tbl>/g;

let paraMatch;
let lineNum = 0;
const tables = [];

// First identify table boundaries
const tableMatches = [];
let tblMatch;
const tblRegex = /<w:tbl\b/g;
while ((tblMatch = tblRegex.exec(content)) !== null) {
  tableMatches.push(tblMatch.index);
}

// Walk through document, identify table cells
let i = 0;
while (i < content.length) {
  // Try to find next paragraph
  paraRegex.lastIndex = i;
  const m = paraRegex.exec(content);
  if (!m) break;

  const paraContent = m[1];
  let texts = [];
  let tm;
  textRegex.lastIndex = 0;
  while ((tm = textRegex.exec(paraContent)) !== null) {
    texts.push(tm[1]);
  }

  const text = texts.join('').trim();
  if (text) {
    console.log(text);
  } else {
    // Print blank for paragraph separator
    console.log('');
  }

  i = paraRegex.lastIndex;
}
