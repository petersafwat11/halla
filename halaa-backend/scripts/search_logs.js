const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\B\\.gemini\\antigravity\\brain\\a8a62159-9add-40da-96f3-d64490b7751d\\.system_generated\\logs\\transcript.jsonl';

function search() {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.trim() === '') continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed.step_index === 409) {
        console.log("FOUND STEP 409!");
        const code = parsed.tool_calls[0].args.CodeContent;
        console.log("--- CODE CONTENT ---");
        console.log(code);
        console.log("--------------------");
        // Write the recovered code directly to a file
        fs.writeFileSync('D:\\halla\\halaa-backend\\scripts\\verify_visual_alignment.js', code, 'utf8');
        console.log("Successfully wrote verify_visual_alignment.js!");
        break;
      }
    } catch (e) {
      // Ignore parse errors on truncated lines if any
    }
  }
}

search();
