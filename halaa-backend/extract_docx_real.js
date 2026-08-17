const fs = require('fs');
const path = require('path');
const admZip = require('adm-zip'); // adm-zip might not be installed, let's check or write a pure node solution if not

async function extract(filename) {
  try {
    const zip = new admZip(filename);
    const docXml = zip.readAsText('word/document.xml');
    
    // Simple regex to extract text from <w:t> tags
    const matches = docXml.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
    if (!matches) {
      console.log('No text found in docx');
      return;
    }
    
    const text = matches.map(m => m.replace(/<w:t[^>]*>/, '').replace('</w:t>', '')).join('');
    console.log(`--- Content of ${filename} ---`);
    console.log(text);
  } catch (err) {
    console.error(`Error reading docx ${filename}:`, err.message);
  }
}

const target = process.argv[2] || 'باقات هلا_FINAL.docx';
extract(target);
