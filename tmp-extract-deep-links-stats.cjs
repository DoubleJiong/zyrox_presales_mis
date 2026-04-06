const fs = require('fs');
const raw = fs.readFileSync('acceptance-sweep-5004-deep-links-report.json', 'utf16le');
function pick(name) {
  const match = raw.match(new RegExp(`"${name}"\\s*:\\s*([0-9.]+)`));
  return match ? match[1] : null;
}
console.log(JSON.stringify({
  expected: pick('expected'),
  unexpected: pick('unexpected'),
  flaky: pick('flaky'),
  skipped: pick('skipped')
}));
