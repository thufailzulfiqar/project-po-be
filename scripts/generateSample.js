// Generates a sample PO Excel file that matches the Delivery Note layout the
// parser expects. Usage: node scripts/generateSample.js
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

// Data taken from the sample Delivery Note (qty written with Indonesian
// thousands separators as strings to exercise the number parser).
const ITEMS = [
  ['1', 'B015MT', 'SAPH440 (2.0 x 286)', 'COIL ADJUSTER LOWER ARM RH/LH', '0', '1.693', '0'],
  ['2', 'B016MT', 'SAPH440 (2.3 x 126)', 'COIL HOOK SPRING LOWER RH/LH', '1', '401', '401'],
  ['3', 'B017MT', 'SAPH440 (2.3 x 363)', 'COIL RELEASE ARM OUTER RH/LH', '0', '1.156', '0'],
  ['4', 'B021MT', 'SPFH590-P (2.6 x 95)', 'COIL CAM RH/LH FINE BLANKING', '0', '353', '0'],
  ['5', 'B022MT', 'S28CB (4.5 x 136)', 'COIL HOOK RH/LH FINE BLANKING', '0', '538', '0'],
  ['6', 'B023MT', 'S28CB (4.5 x 123)', 'COIL PAWL RH/LH FINE BLANKING', '0', '514', '0'],
  ['7', 'B026MT', 'SPFH590-P (2.6 x 254)', 'COIL PLATE INTERLOCK RH3/LH2', '0', '1.749', '0'],
  ['8', 'B027MT', 'SPFH590-P (2.6 x 236)', 'COIL PLATE INTERLOCK RH4', '0', '1.626', '0'],
  ['9', 'B028MT', 'SAPH440-P (2.3 x 514)', 'FR LEG BRKT REAR OUT', '0', '1.546', '0'],
  ['10', 'B030MT', 'SAPH440-P (2.0 x 461)', 'FRONT LEG BKT FRONT OUT & INN RH/LH', '1', '1.696', '1.696'],
  ['11', 'B031MT', 'SPFC590 (1.6 x 250)', 'HANDLE SUPPORT BRKT', '2', '1.244', '2.488'],
  ['12', 'B032MT', 'SPFC980Y (1.4 x 391)', 'FR LOWER RAIL OUTER', '0', '1.857', '0'],
  ['13', 'B034MT', 'SPFC980Y (1.4 x 400)', 'FR UPPER RAIL', '1', '2.154', '2.154'],
  ['14', 'B033MT', 'SPFC980Y (1.4 x 436)', 'FR LOWER RAIL INNER', '1', '1.884', '1.884'],
  ['15', 'B035MT', 'SPFC980Y (2.0 x 134)', 'REINFORCE BRKT FRONT INNER', '1', '324', '324'],
  ['16', 'B037MT', 'SPFC980Y (1.4 x 371)', 'RR UPPER RAIL', '1', '1.961', '1.961'],
  ['17', 'B038MT', 'SPFC980Y (1.6 x 412)', 'RR LOWER RAIL OUT/INN', '1', '2.145', '2.145'],
  ['18', 'B039MT', 'SPFH590-P (2.6 x 171)', 'RR LOWER BRKT INN LH', '0', '572', '0'],
  ['19', 'B042MT', 'SAPH440-P (2.3 x 177)', 'LOWER HOOK RH/LH', '1', '482', '482'],
  ['20', 'B040MT', 'SAPH440-P (2.6 x 378)', 'RELEASE ARM RH/LH', '0', '2.029', '0'],
];

async function run() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Delivery Note');

  // --- Header block (label | ":" | value) ---
  const header = [
    ['DN NO', ':', '01SCI-ID-25-112-7-14-1'],
    ['DELIVERY DATE', ':', 'Monday, 14 July 2025'],
    ['REFER TO PO NO', ':', 'ID-25-112'],
    ['SUPPLIER CODE', ':', '01SCI'],
    ['SUPPLIER NAME', ':', 'STEEL CENTER INDONESIA'],
    ['ARRIVAL TIME', ':', '13.00 WIB'],
    ['CYCLE ISSUE', ':', '1-1-4'],
    ['DELIVERY TO', ':', 'PT Toyota Boshoku Device Indonesia'],
  ];
  header.forEach((row) => ws.addRow(row));

  ws.addRow([]); // spacer

  // --- Items table header + rows ---
  ws.addRow(['NO', 'UNIQ NO', 'PART NO', 'PART NAME', 'KANBAN', 'QTY/KBN', 'TOTAL QTY', 'NOTE']);
  ITEMS.forEach((row) => ws.addRow(row));

  const outDir = path.resolve('samples');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'PO_sample.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log('Sample written to:', outPath);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
