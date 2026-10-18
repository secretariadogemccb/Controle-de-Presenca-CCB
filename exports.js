/* Exportação offline — PDF A4 e Word no padrão visual do modelo enviado. */
window.CCBExports = (() => {
  'use strict';
  const dateLabel = x => /^\d{4}-\d{2}-\d{2}$/.test(x || '') ? x.slice(8,10)+'/'+x.slice(5,7)+'/'+x.slice(0,4) : 'Não informada';
  const info = s => ({evento:s.evento || 'Não informado',local:s.local || 'Não informado',data:dateLabel(s.data),notas:s.anotacoes || '—'});
  const count = list => list.reduce((a,p) => { if(p.status in a)a[p.status]++;return a; },{P:0,F:0,FJ:0,FC:0});
  const isPresent = status => status === 'P' || status === 'FC';
  const xml = val => String(val??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  const personLine = p => [p.nome,p.cargo,p.comum].filter(Boolean).join(' - ');
  const singleByte = txt => String(txt??'').replace(/[\u2013\u2014]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/\u2026/g,'...').replace(/[^\x20-\xff]/g, c => c.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\xff]/g,'?'));
  const safePdf = txt => singleByte(txt).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
  const rgb = arr => arr.map(x=>x.toFixed(3)).join(' ');
  const BLACK=[.10,.12,.13], RED=[1,.19,.28], GREEN=[0,.75,.37],GRAY=[.58,.62,.65],MID=[.36,.36,.36];
  function wrapped(text, maxWidth, size=11, bold=true) {
    const limit = Math.max(16,Math.floor(maxWidth/(size*(bold?.55:.50))));
    const result=[];
    for(const paragraph of String(text??'').split(/\r?\n/)){
      let line='';
      for(let word of singleByte(paragraph).split(/\s+/).filter(Boolean)){
        while(word.length>limit){if(line){result.push(line);line='';}result.push(word.slice(0,limit));word=word.slice(limit);}
        if(line.length+word.length+1>limit){result.push(line);line=word;}else{line+=(line?' ':'')+word;}
      }
      result.push(line);
    }
    return result;
  }
  async function asset(path){
    const result=await fetch(path);
    if(!result.ok)throw new Error('Não foi possível abrir a imagem '+path);
    return new Uint8Array(await result.arrayBuffer());
  }
  async function pdfLogoJpeg(){
    const paths=['assets/logo-ccb.png','assets/clave-sol.png','assets/clave-fa.png'];
    const imgs=await Promise.all(paths.map(path=>new Promise((resolve,reject)=>{
      const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Logo indisponível: '+path));image.src=path;
    })));
    const c=document.createElement('canvas');c.width=564;c.height=170;
    const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);
    // Mesmas proporções e ordem do documento de referência.
    ctx.drawImage(imgs[0],0,6,154,137);ctx.drawImage(imgs[1],210,2,49,149);ctx.drawImage(imgs[2],319,11,127,130);
    const raw=atob(c.toDataURL('image/jpeg',.94).split(',')[1]);
    return {binary:raw,w:c.width,h:c.height};
  }
  async function createPdf(s){
    const logo=await pdfLogoJpeg();
    const W=595.28,H=841.89,L=85,R=510;
    let ops=[],pages=[],y=0;
    const top2y=t=>(H-t).toFixed(2);
    function text(x,top,t,size=11,bold=true,color=BLACK){
      ops.push(`${rgb(color)} rg BT /${bold?'F2':'F1'} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${top2y(top)} Tm (${safePdf(t)}) Tj ET`);
    }
    function rule(at){ops.push(`${rgb([.65,.65,.65])} RG .7 w ${L} ${top2y(at)} m ${R} ${top2y(at)} l S`);}
    function pathStroke(path,color,width=1){ops.push(`${rgb(color)} RG ${width} w ${path} S`);}
    function roundedBox(x,top,w,h,r,color,width=1){
      const yBot=H-top-h, k=.55228475;
      const pt=(a,b)=>`${a.toFixed(2)} ${b.toFixed(2)}`;
      const d=[`${pt(x+r,yBot)} m`,`${pt(x+w-r,yBot)} l`,`${pt(x+w-r*(1-k),yBot)} ${pt(x+w,yBot+r*(1-k))} ${pt(x+w,yBot+r)} c`,`${pt(x+w,yBot+h-r)} l`,`${pt(x+w,yBot+h-r*(1-k))} ${pt(x+w-r*(1-k),yBot+h)} ${pt(x+w-r,yBot+h)} c`,`${pt(x+r,yBot+h)} l`,`${pt(x+r*(1-k),yBot+h)} ${pt(x,yBot+h-r*(1-k))} ${pt(x,yBot+h-r)} c`,`${pt(x,yBot+r)} l`,`${pt(x,yBot+r*(1-k))} ${pt(x+r*(1-k),yBot)} ${pt(x+r,yBot)} c`].join(' ');
      pathStroke(d,color,width);
    }
    function check(x,top,size=11){
      const y0=H-top-size;
      ops.push(`${rgb(GREEN)} rg ${x} ${y0} ${size} ${size} re f`);
      ops.push('1 1 1 RG 1.8 w 1 J '+`${(x+2.0).toFixed(2)} ${(y0+size*.52).toFixed(2)} m ${(x+size*.41).toFixed(2)} ${(y0+size*.25).toFixed(2)} l ${(x+size*.82).toFixed(2)} ${(y0+size*.75).toFixed(2)} l S`);
    }
    function cross(x,top,size=11){
      const y0=H-top-size;
      ops.push(`${rgb(RED)} RG 3 w 1 J ${x+2} ${y0+2} m ${x+size-2} ${y0+size-2} l S`);
      ops.push(`${rgb(RED)} RG 3 w 1 J ${x+size-2} ${y0+2} m ${x+2} ${y0+size-2} l S`);
    }
    function mark(status,x,top,size=11){ (isPresent(status)?check:cross)(x,top,size); }
    function header(){
      ops.push(`q 133 0 0 40 ${L} ${top2y(78)} cm /Im1 Do Q`);
      text(L,107,'Lista de Presença CCB',14,true);
      let t=125;
      const x=info(s);
      for(const row of wrapped('Evento: '+x.evento,425,10.4,true)){text(L,t,row,10.4,true);t+=13;}
      for(const row of wrapped('Local do Evento: '+x.local,425,10.4,true)){text(L,t,row,10.4,true);t+=13;}
      text(L,t,'Data: '+x.data,10.4,true);t+=15;
      rule(t+3);y=t+18;
      const c=count(s.participantes);
      const boxes=[['Presente',c.P,[.09,.34,.56]],['Falta',c.F,RED],['Falta Justificada',c.FJ,RED],['Facultativo',c.FC,MID]];
      boxes.forEach(([label,n,color],i)=>{
        const xx=L+i*76.7;
        roundedBox(xx,y,73,43,9,color,.7);
        text(xx+7,y+13,label,6.0,true,BLACK);
        text(xx+7,y+33,String(n),19,true,color);
      });
      y+=62;
    }
    function nextPage(){
      if(ops.length)pages.push(ops.join('\n'));
      ops=[];header();
    }
    nextPage();
    const participants=s.participantes||[];
    if(!participants.length){text(L,y+10,'Nenhum participante adicionado.',10.5,true);y+=27;}
    for(const p of participants){
      const lines=wrapped(personLine(p),395,10.4,true);
      const height=Math.max(16,lines.length*14+3);
      if(y+height+140>785)nextPage();
      mark(p.status,L+2,y-1,11);
      for(let i=0;i<lines.length;i++)text(L+17,y+9+i*14,lines[i],10.4,true);
      y+=height;
    }
    if(y+185>785)nextPage();
    y+=9;rule(y);y+=35;
    const n=count(participants);
    for(const [status,label,total] of [['P','Presentes',n.P],['F','Faltantes',n.F],['FJ','Falta Justificada',n.FJ],['FC','Facultativo',n.FC]]){
      mark(status,L+2,y-10,10.5);text(L+18,y,label+': '+total,10.5,true);y+=15;
    }
    // Silhueta de duas pessoas substitui o emoji que a fonte Helvetica não possui.
    const headsY=H-y+7;
    ops.push('0.10 0.51 0.82 rg');
    ops.push(`${L+3} ${headsY} 4 4 re f ${L+10} ${headsY+1} 4 4 re f ${L+1} ${headsY-5} 16 4 re f`);
    text(L+19,y,'Total de participantes: '+participants.length,10.5,true);y+=43;
    rule(y);y+=22;
    const notes=wrapped('Anotações Gerais: '+info(s).notas,425,10.4,true);
    for(const line of notes){if(y+75>790)nextPage();text(L,y,line,10.4,true);y+=14;}
    y+=19;rule(y);y+=47;
    if(y>790)nextPage();text(L,y,'Deus Abençoe a todos!',10.5,true);
    pages.push(ops.join('\n'));
    // PDF binary sem depender de CDN; texto pesquisável + logo como imagem JPEG.
    const objects=[null],add=(src)=>{objects.push(src);return objects.length-1;};
    const catalog=add(''),pageRoot=add('');
    const font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const bold=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const pic=add(`<< /Type /XObject /Subtype /Image /Width ${logo.w} /Height ${logo.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.binary.length} >>\nstream\n${logo.binary}\nendstream`);
    const refs=[];
    for(const pageContent of pages){
      const stream=add(`<< /Length ${pageContent.length} >>\nstream\n${pageContent}\nendstream`);
      refs.push(add(`<< /Type /Page /Parent ${pageRoot} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${font} 0 R /F2 ${bold} 0 R >> /XObject << /Im1 ${pic} 0 R >> >> /Contents ${stream} 0 R >>`));
    }
    objects[catalog]=`<< /Type /Catalog /Pages ${pageRoot} 0 R >>`;
    objects[pageRoot]=`<< /Type /Pages /Count ${refs.length} /Kids [${refs.map(r=>r+' 0 R').join(' ')}] >>`;
    let output='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';const offsets=[0];
    for(let i=1;i<objects.length;i++){offsets[i]=output.length;output+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}
    const xref=output.length;
    output+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for(let i=1;i<objects.length;i++)output+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
    output+=`trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([Uint8Array.from(output,x=>x.charCodeAt(0)&255)],{type:'application/pdf'});
  }

  const run=(value,{bold=true,size=21,color='191919',font='Arial'}={})=>`<w:r><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}"/><w:sz w:val="${size}"/>${bold?'<w:b/>':''}<w:color w:val="${color}"/></w:rPr><w:t xml:space="preserve">${xml(value)}</w:t></w:r>`;
  const p=(children,{after=0,before=0,keepNext=false,indent=0}={})=>`<w:p><w:pPr><w:spacing w:before="${before}" w:after="${after}"/>${keepNext?'<w:keepNext/>':''}${indent?`<w:ind w:left="${indent}"/>`:''}</w:pPr>${children}</w:p>`;
  const textPara=(value,opts={},paraOpts={})=>p(run(value,opts),paraOpts);
  function imageRun(id,name,widthPt,heightPt){
    const cx=Math.round(widthPt*12700),cy=Math.round(heightPt*12700);
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="${xml(name)}" descr="${xml(name)}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="${xml(name)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId${id}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  }
  function line(){return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="5" w:color="A0A0A0" w:space="1"/></w:pBdr><w:spacing w:before="115" w:after="100"/></w:pPr></w:p>';}
  function tableBox(label,value,hex){
    return `<w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="7" w:color="${hex}"/><w:left w:val="single" w:sz="7" w:color="${hex}"/><w:bottom w:val="single" w:sz="7" w:color="${hex}"/><w:right w:val="single" w:sz="7" w:color="${hex}"/></w:tcBorders><w:tcMar><w:top w:w="85" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/></w:tcMar></w:tcPr>${textPara(label,{size:12},{after:10})}${textPara(value,{size:36,color:hex})}</w:tc>`;
  }
  async function createDocx(s){
    if(typeof JSZip==='undefined')throw new Error('A biblioteca de criação de Word não está disponível.');
    const assets=await Promise.all(['logo-ccb.png','clave-sol.png','clave-fa.png','emoji-check.png','emoji-cross.png'].map(name=>asset('assets/'+name)));
    const data=info(s),n=count(s.participantes),zip=new JSZip();
    // Desenhos na primeira linha substituem as letras CCB do gerador anterior.
    let body=p(imageRun(2,'Logo CCB',39,35)+run('   ',{bold:false})+imageRun(3,'Clave de sol',14,37)+run('   ',{bold:false})+imageRun(4,'Clave de fá',34,35),{after:135});
    body+=textPara('Lista de Presença CCB',{size:28},{after:35});
    body+=textPara('Evento: '+data.evento,{size:21},{after:0});
    body+=textPara('Local do Evento: '+data.local,{size:21},{after:0});
    body+=textPara('Data: '+data.data,{size:21},{after:45});
    body+=line();
    body+=`<w:tbl><w:tblPr><w:tblW w:w="6300" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${Array.from({length:4},()=>'<w:gridCol w:w="1500"/>').join('')}</w:tblGrid><w:tr>`;
    const gapCell='<w:tc><w:tcPr><w:tcW w:w="100" w:type="dxa"/></w:tcPr><w:p/></w:tc>';
    body+=tableBox('Presente',String(n.P),'14568B')+gapCell+tableBox('Falta',String(n.F),'FF3349')+gapCell;
    body+=tableBox('Falta Justificada',String(n.FJ),'FF3349')+gapCell+tableBox('Facultativo',String(n.FC),'666666');
    body+='</w:tr></w:tbl>';
    body+=p('',{after:180});
    if(!s.participantes.length)body+=textPara('Nenhum participante adicionado.',{size:21},{after:50});
    for(const person of s.participantes){
      const mark=isPresent(person.status)?imageRun(5,'✅ Presença',11,11):imageRun(6,'❌ Falta',11,11);
      body+=p(mark+run(' '+personLine(person),{size:21}),{after:35});
    }
    body+=line();body+=p('',{after:80});
    for(const [code,label,total] of [['P','Presentes',n.P],['F','Faltantes',n.F],['FJ','Falta Justificada',n.FJ],['FC','Facultativo',n.FC]]){
      const ico=isPresent(code)?imageRun(5,'✅',11,11):imageRun(6,'❌',11,11);
      body+=p(ico+run(' '+label+': '+total,{size:21}),{after:0});
    }
    body+=textPara('👥 Total de participantes: '+s.participantes.length,{size:21},{after:150});
    body+=line();
    for(const [i,part] of ('Anotações Gerais: '+data.notas).split(/\r?\n/).entries()){
      body+=textPara(part||' ',{size:21},{after:i===0?0:60});
    }
    body+=line();body+=p('',{after:175});body+=textPara('Deus Abençoe a todos!',{size:21});
    const document=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="780" w:right="1700" w:bottom="960" w:left="1700" w:header="400" w:footer="400"/></w:sectPr></w:body></w:document>`;
    const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="21"/><w:color w:val="191919"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="0"/></w:pPr></w:style></w:styles>`;
    zip.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
    zip.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
    zip.file('word/_rels/document.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${assets.map((v,i)=>`<Relationship Id="rId${i+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${i+2}.png"/>`).join('')}<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    zip.file('docProps/core.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Lista de Presença CCB</dc:title><dc:creator>Controle de Presença CCB</dc:creator></cp:coreProperties>`);
    assets.forEach((bytes,i)=>zip.file(`word/media/image${i+2}.png`,bytes));
    zip.file('word/document.xml',document);zip.file('word/styles.xml',styles);
    return zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:5},mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  }
  return {createPdf,createDocx};
})();
