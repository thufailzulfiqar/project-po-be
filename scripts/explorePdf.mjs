import fs from 'fs';
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
const data = new Uint8Array(fs.readFileSync('uploads/DN_14_JUL_2025_1138072309440400.pdf'));
const doc = await pdfjs.getDocument({ data }).promise;
const page = await doc.getPage(1);
const tc = await page.getTextContent();
// group by rounded y
const rows = new Map();
for (const it of tc.items) {
  if (!it.str || !it.str.trim()) continue;
  const x = it.transform[4], y = Math.round(it.transform[5]);
  if (!rows.has(y)) rows.set(y, []);
  rows.get(y).push({ x: Math.round(x), s: it.str });
}
const ys = [...rows.keys()].sort((a,b)=>b-a); // top to bottom
for (const y of ys) {
  const cells = rows.get(y).sort((a,b)=>a.x-b.x);
  console.log(y, '|', cells.map(c=>`[x${c.x}]${c.s}`).join('  '));
}
