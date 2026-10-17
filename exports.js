/* Geradores offline de PDF real e Word .docx. JSZip é distribuído localmente. */
window.CCBExports = (() => {
  'use strict';
  const labels = { P: 'Presente', F: 'Falta', FJ: 'Falta Justificada', FC: 'Facultativo' };
  const counts = p => p.reduce((sum, x) => { if (x.status in sum) sum[x.status]++; return sum; }, { P:0,F:0,FJ:0,FC:0 });
  const dateLabel = x => /^\d{4}-\d{2}-\d{2}$/.test(x || '') ? x.slice(8,10) + '/' + x.slice(5,7) + '/' + x.slice(0,4) : 'Não informada';
  const info = s => ({ titulo:s.evento || 'Não informado', local:s.local || 'Não informado', data:dateLabel(s.data), anotacoes:s.anotacoes || 'Sem anotações' });
  const xmlEscape = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  function saveableLatin(value) {
    return String(value ?? '').replace(/[\u2013\u2014]/g,'-').replace(/[\u2018\u2019]/g,"'")
      .replace(/[\u201c\u201d]/g,'"').replace(/\u2026/g,'...').replace(/[\u2022\u25a1\u2611\u2715]/g,'-')
      .replace(/[^\x20-\xff]/g, c => c.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\xff]/g,'?'));
  }
  function pdfEscape(text) { return saveableLatin(text).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)'); }
  function wrap(text, maxWidth, fontSize, bold = false) {
    const limit = Math.max(15, Math.floor(maxWidth / (fontSize * (bold ? .54 : .50))));
    const result = [];
    for (const segment of String(text ?? '').split(/\r?\n/)) {
      const words = saveableLatin(segment).split(/\s+/).filter(Boolean);
      if (!words.length) { result.push(''); continue; }
      let line = '';
      for (let word of words) {
        while (word.length > limit) { if (line) { result.push(line); line = ''; } result.push(word.slice(0,limit)); word = word.slice(limit); }
        if ((line + (line ? ' ' : '') + word).length > limit) { result.push(line); line = word; }
        else line += (line ? ' ' : '') + word;
      }
      if (line) result.push(line);
    }
    return result;
  }
  function createPdf(s) {
    const PAGE_W = 595.28, PAGE_H = 841.89, LEFT = 49, RIGHT = 546, BOTTOM = 782;
    const pages = []; let lines = [], y = 49;
    const navy = [0.07,.27,.46], dark = [.15,.2,.24], red = [.84,.18,.23], gray = [.38,.43,.48];
    const rgb = a => a.map(n => n.toFixed(3)).join(' ');
    function text(x, top, content, size = 11, bold = false, color = dark) {
      lines.push(`${rgb(color)} rg BT /${bold?'F2':'F1'} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${(PAGE_H-top).toFixed(2)} Tm (${pdfEscape(content)}) Tj ET`);
    }
    function stroke(x1, top1, x2, top2, color = [.7,.74,.76], width = 1) {
      lines.push(`${rgb(color)} RG ${width} w ${x1} ${(PAGE_H-top1).toFixed(2)} m ${x2} ${(PAGE_H-top2).toFixed(2)} l S`);
    }
    function filledRect(x, top, w, h, color) {
      lines.push(`${rgb(color)} rg ${x} ${(PAGE_H-top-h).toFixed(2)} ${w} ${h} re f`);
    }
    function startPage() {
      lines = []; y = 49;
      text(LEFT,y,'CCB',19,true,navy); text(LEFT+67,y,'LISTA DE PRESENÇA',16,true,navy);
      y+=16;stroke(LEFT,y,RIGHT,y,navy,1.8);y+=23;
      const v = info(s);
      for (const ln of wrap('Evento: '+v.titulo,493,11,true)) { text(LEFT,y,ln,11,true); y+=16; }
      for (const ln of wrap('Local do Evento: '+v.local,493,11)) { text(LEFT,y,ln,11); y+=16; }
      text(LEFT,y,'Data: '+v.data,11); y+=24;
      const n = counts(s.participantes);
      const boxW = 117, gap = 9;
      [['Presentes',n.P,navy],['Faltas',n.F,red],['Justificadas',n.FJ,red],['Facultativos',n.FC,gray]].forEach(([label,total,color],i) => {
        const x = LEFT+i*(boxW+gap);
        lines.push(`${rgb(color)} RG 1.2 w ${x} ${(PAGE_H-y-48).toFixed(2)} ${boxW} 48 re S`);
        text(x+9,y+16,label,9,true,color);text(x+9,y+37,String(total),18,true,color);
      });
      y+=69;
      text(LEFT,y,'PARTICIPANTES',12,true,navy);y+=9;stroke(LEFT,y,RIGHT,y);y+=18;
    }
    function finishPage() {
      stroke(LEFT,800,RIGHT,800,[.75,.79,.83],.6);
      text(LEFT,815,'Controle de Presença CCB - documento gerado no navegador',8,false,gray);
      text(RIGHT-35,815,String(pages.length+1),8,true,gray);
      pages.push(lines.join('\n'));
    }
    function ensureSpace(space) { if (y+space > BOTTOM) { finishPage();startPage(); } }
    startPage();
    if (!s.participantes.length) { text(LEFT,y,'Nenhum participante adicionado.',11,false,gray);y+=25; }
    s.participantes.forEach((p,index) => {
      const str = `${index+1}. [${p.status}] ${p.nome}${p.cargo?' - '+p.cargo:''}${p.comum?' - '+p.comum:''}`;
      const wrapped = wrap(str, 480, 11, true);
      ensureSpace(wrapped.length*15+8);
      for (const row of wrapped) { text(LEFT,y,row,11,true,p.status === 'F' || p.status === 'FJ' ? red : dark); y+=15; }
      y+=6;
    });
    ensureSpace(93);
    stroke(LEFT,y,RIGHT,y);y+=21;
    const c = counts(s.participantes);
    text(LEFT,y,`Presentes: ${c.P}     Faltantes: ${c.F}     Justificadas: ${c.FJ}     Facultativos: ${c.FC}`,10,true);y+=18;
    text(LEFT,y,`Total de participantes: ${s.participantes.length}`,10,true);y+=28;
    const noteRows = wrap('Anotações Gerais: '+ (s.anotacoes || '-'), 493, 10);
    for (const line of noteRows) { ensureSpace(20);text(LEFT,y,line,10);y+=15; }
    ensureSpace(39);y+=20;text(LEFT,y,'Deus Abençoe a todos!',11,true,navy);
    finishPage();
    const objects = [null];
    const add = str => { objects.push(str); return objects.length-1; };
    const catalog = add(''), rootPages = add('');
    const normalFont = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const boldFont = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const pageRefs = [];
    for (const content of pages) {
      const stream = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
      const page = add(`<< /Type /Page /Parent ${rootPages} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${normalFont} 0 R /F2 ${boldFont} 0 R >> >> /Contents ${stream} 0 R >>`);
      pageRefs.push(page);
    }
    objects[catalog] = `<< /Type /Catalog /Pages ${rootPages} 0 R >>`;
    objects[rootPages] = `<< /Type /Pages /Count ${pageRefs.length} /Kids [${pageRefs.map(n=>n+' 0 R').join(' ')}] >>`;
    let file = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets = [0];
    for (let i=1;i<objects.length;i++) {
      offsets[i] = file.length;
      file += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xref = file.length;
    file += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let i=1;i<objects.length;i++) file += String(offsets[i]).padStart(10,'0')+' 00000 n \n';
    file += `trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const bytes = Uint8Array.from(file, c => c.charCodeAt(0) & 255);
    return new Blob([bytes], { type:'application/pdf' });
  }
  function paragraph(content, style = '', bold = false) {
    const props = style ? `<w:pPr><w:pStyle w:val="${xmlEscape(style)}"/></w:pPr>` : '';
    return `<w:p>${props}<w:r>${bold?'<w:rPr><w:b/></w:rPr>':''}<w:t xml:space="preserve">${xmlEscape(content)}</w:t></w:r></w:p>`;
  }
  function tableCell(value) {
    return `<w:tc><w:tcPr><w:tcW w:w="2300" w:type="dxa"/></w:tcPr>${paragraph(value)}</w:tc>`;
  }
  function tableRow(values) { return `<w:tr>${values.map(tableCell).join('')}</w:tr>`; }
  async function createDocx(s) {
    if (typeof JSZip === 'undefined') throw new Error('Biblioteca de Word indisponivel.');
    const data = info(s), totals = counts(s.participantes);
    let body = paragraph('CCB  -  Lista de Presença', 'Title');
    body += paragraph('Evento: '+data.titulo,'Subtitle');
    body += paragraph('Local do Evento: '+data.local);
    body += paragraph('Data: '+data.data);
    body += paragraph('Resumo da Presenca','Heading1');
    body += `<w:tbl><w:tblPr><w:tblW w:w="9200" w:type="dxa"/><w:tblBorders><w:bottom w:val="single" w:sz="6"/><w:top w:val="single" w:sz="6"/></w:tblBorders></w:tblPr>`;
    body += tableRow(['Presentes','Faltantes','Justificadas','Facultativos']);
    body += tableRow([totals.P,totals.F,totals.FJ,totals.FC].map(String));
    body += '</w:tbl>' + paragraph('Total de participantes: '+s.participantes.length,'Normal',true);
    body += paragraph('Participantes','Heading1');
    if (!s.participantes.length) body += paragraph('Nenhum participante adicionado.');
    s.participantes.forEach((p,i) => {
      body += paragraph(`${i+1}. [${p.status}] ${p.nome}${p.cargo?' - '+p.cargo:''}${p.comum?' - '+p.comum:''} (${labels[p.status]})`);
    });
    body += paragraph('Anotações Gerais','Heading1');
    for (const row of data.anotacoes.split(/\r?\n/)) body += paragraph(row || ' ');
    body += paragraph('Deus Abençoe a todos!','Heading2');
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1200" w:right="1100" w:bottom="1200" w:left="1100" w:header="650" w:footer="650"/></w:sectPr></w:body></w:document>`;
    const styleXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:color w:val="104675"/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="240" w:after="110"/></w:pPr><w:rPr><w:b/><w:color w:val="104675"/><w:sz w:val="26"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:spacing w:before="250"/></w:pPr><w:rPr><w:b/><w:color w:val="104675"/><w:sz w:val="22"/></w:rPr></w:style></w:styles>`;
    const now = new Date().toISOString();
    const zip = new JSZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
    zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"><dc:title>Lista de Presença CCB</dc:title><dc:creator>Controle de Presença CCB</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">${now}</dcterms:created></cp:coreProperties>`);
    zip.file('word/styles.xml',styleXml);zip.file('word/document.xml',documentXml);
    return zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:5},mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  }
  return { createPdf, createDocx };
})();
