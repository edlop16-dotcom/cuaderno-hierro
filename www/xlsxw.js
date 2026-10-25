/* ==========================================================================
   Generador mínimo de .xlsx (Office Open XML) sin librerías, para "Mis finanzas" → Exportar a Excel (H3).
   - Zip sin compresión (STORE) con CRC32; texto en línea (inlineStr), fórmulas sin valor guardado: Excel las
     calcula al abrir (`fullCalcOnLoad`). Las funciones van en inglés dentro del archivo (SUMIF); Excel en español
     las muestra como SUMAR.SI.
   - Por hoja: celdas, anchos de columna, celdas combinadas, formato condicional (cellIs y dataBar) y listas
     desplegables (dataValidation). No hace gráficos (necesitan "drawings"): en su lugar, barras dentro de las
     celdas (dataBar).
   Uso: xlsxBuild({ sheets: [{ name, cols: [ancho…], rows: [[celda…]…], merges, cf, dv }], styles }) → Uint8Array.
   Celda: valor simple (texto o número) o { v, f (fórmula sin "="), s (estilo), t: 'd' (fecha AAAA-MM-DD) }.
   ========================================================================== */
const XL_CT = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const xlEsc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const xlCol = n => { let s = ''; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
const xlRef = (r, c) => xlCol(c) + (r + 1);
/* Fecha AAAA-MM-DD → número de serie de Excel (días desde 1899-12-30) */
const xlDate = d => { const [y, m, dd] = d.split('-').map(Number); return Math.round((Date.UTC(y, m - 1, dd) - Date.UTC(1899, 11, 30)) / 864e5); };

/* Estilos fijos: 0 normal · 1 encabezado · 2 soles · 3 fecha · 4 % · 5 título · 6 soles en negrita · 7 negrita · 8 nota */
const XL_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;S/ &quot;#,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts>
<fonts count="5"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="15"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><i/><sz val="10"/><color rgb="FF666666"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF33383E"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="9"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="9" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="3" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
<dxfs count="3"><dxf><font><color rgb="FF0B5D33"/></font><fill><patternFill patternType="solid"><bgColor rgb="FFC8F0D8"/></patternFill></fill></dxf><dxf><font><color rgb="FF7A5300"/></font><fill><patternFill patternType="solid"><bgColor rgb="FFFFE8A3"/></patternFill></fill></dxf><dxf><font><color rgb="FF8A0F24"/></font><fill><patternFill patternType="solid"><bgColor rgb="FFFFC9D2"/></patternFill></fill></dxf></dxfs>
</styleSheet>`;
const XL = { s: { txt: 0, head: 1, money: 2, date: 3, pct: 4, title: 5, moneyB: 6, bold: 7, note: 8 }, dxf: { g: 0, y: 1, r: 2 } };

function xlCell(r, c, x) {
  if (x == null || x === '') return '';
  const o = typeof x === 'object' ? x : { v: x }, ref = xlRef(r, c), s = o.s ? ` s="${o.s}"` : '';
  if (o.f) return `<c r="${ref}"${s}><f>${xlEsc(o.f)}</f></c>`;
  if (o.t === 'd') return `<c r="${ref}"${s || ` s="${XL.s.date}"`}><v>${xlDate(o.v)}</v></c>`;
  if (typeof o.v === 'number' && isFinite(o.v)) return `<c r="${ref}"${s}><v>${o.v}</v></c>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xlEsc(o.v)}</t></is></c>`;
}
function xlSheet(sh) {
  const rows = sh.rows.map((row, r) => { const cs = (row || []).map((x, c) => xlCell(r, c, x)).join(''); return cs ? `<row r="${r + 1}">${cs}</row>` : ''; }).join('');
  const cols = sh.cols && sh.cols.length ? `<cols>${sh.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
  const merges = sh.merges && sh.merges.length ? `<mergeCells count="${sh.merges.length}">${sh.merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '';
  let pr = 1;
  const cf = (sh.cf || []).map(c => `<conditionalFormatting sqref="${c.ref}">${c.rules.map(u => u.type === 'dataBar'
    ? `<cfRule type="dataBar" priority="${pr++}"><dataBar><cfvo type="min"/><cfvo type="max"/><color rgb="${u.color}"/></dataBar></cfRule>`
    : `<cfRule type="cellIs" dxfId="${u.dxf}" priority="${pr++}" operator="${u.op}">${u.f.map(x => `<formula>${xlEsc(x)}</formula>`).join('')}</cfRule>`).join('')}</conditionalFormatting>`).join('');
  const dv = sh.dv && sh.dv.length ? `<dataValidations count="${sh.dv.length}">${sh.dv.map(d => `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="${d.ref}"><formula1>${xlEsc(d.list)}</formula1></dataValidation>`).join('')}</dataValidations>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"${sh.tab ? ' tabSelected="1"' : ''}/></sheetViews><sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${rows}</sheetData>${merges}${cf}${dv}<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;
}
function xlFiles(wb) {
  const n = wb.sheets.length, S = wb.sheets;
  return [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${S.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${S.map((s, i) => `<sheet name="${xlEsc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${S.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', XL_STYLES],
  ].concat(S.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, xlSheet(Object.assign({ tab: i === 0 }, s))]));
}
/* ---------- Zip sin compresión ---------- */
let XL_CRC = null;
function xlCrc(b) {
  if (!XL_CRC) { XL_CRC = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; XL_CRC[n] = c >>> 0; } }
  let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = XL_CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0;
}
function xlUtf8(s) { if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s); const u = unescape(encodeURIComponent(s)), b = new Uint8Array(u.length); for (let i = 0; i < u.length; i++) b[i] = u.charCodeAt(i); return b; }
function xlZip(files) {
  const parts = [], central = []; let off = 0;
  const u16 = v => [v & 255, (v >>> 8) & 255], u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  const dt = u16(0), dd = u16((2026 - 1980) << 9 | 1 << 5 | 1);   // fecha y hora fijas: el archivo no cambia si los datos no cambian
  files.forEach(([name, txt]) => {
    const nm = xlUtf8(name), data = xlUtf8(txt), crc = xlCrc(data);
    const head = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), dt, dd, u32(crc), u32(data.length), u32(data.length), u16(nm.length), u16(0));
    parts.push(new Uint8Array(head), nm, data);
    central.push(new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), dt, dd, u32(crc), u32(data.length), u32(data.length), u16(nm.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off))), nm);
    off += head.length + nm.length + data.length;
  });
  const csize = central.reduce((a, b) => a + b.length, 0);
  const end = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(csize), u32(off), u16(0)));
  const all = parts.concat(central, [end]), out = new Uint8Array(all.reduce((a, b) => a + b.length, 0)); let p = 0;
  all.forEach(b => { out.set(b, p); p += b.length; });
  return out;
}
function xlsxBuild(wb) { return xlZip(xlFiles(wb)); }
function xlB64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
