const fs = require('fs');
const raw = fs.readFileSync('acceptance-sweep-5004-report.json', 'utf16le');
function pick(name) {
  const match = raw.match(new RegExp(`"${name}"\\s*:\\s*([0-9.]+)`));
  return match ? match[1] : null;
}
const stats = {
  duration: pick('duration'),
  expected: pick('expected'),
  skipped: pick('skipped'),
  unexpected: pick('unexpected'),
  flaky: pick('flaky'),
};
console.log(JSON.stringify(stats));
