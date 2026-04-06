const fs = require('fs');
const raw = fs.readFileSync('acceptance-sweep-5004-report.json', 'utf16le');
const match = raw.match(/\r?\n\{\r?\n\s+"config"/);
if (!match || typeof match.index !== 'number') {
  throw new Error('REPORT_JSON_MARKER_NOT_FOUND');
}
const start = match.index + match[0].indexOf('{');
const report = JSON.parse(raw.slice(start));
console.log(JSON.stringify(report.stats));
