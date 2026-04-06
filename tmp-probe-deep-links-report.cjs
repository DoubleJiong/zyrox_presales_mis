const fs = require('fs');
const raw = fs.readFileSync('acceptance-sweep-5004-deep-links-report.json', 'utf16le');
for (const key of ['expected','unexpected','flaky','skipped']) {
  const idx = raw.lastIndexOf(`"${key}"`);
  console.log(key, idx);
  if (idx >= 0) {
    console.log(raw.slice(idx, idx + 80));
  }
}
