'use strict';
// Parse quoted fields, doubled quotes, embedded newlines and UTF-8 BOM.
function parseCSV(text){
 text=text.replace(/^\uFEFF/,'');
 const rows=[];let row=[],field='',state='start';
 const endField=()=>{row.push(field);field='';state='start';};
 const endRow=()=>{endField();if(row.some(v=>v!==''))rows.push(row);row=[];};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(state==='quoted'){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else state='closed';}else field+=c;continue;}
  if(c===','){endField();continue;}
  if(c==='\r'||c==='\n'){endRow();if(c==='\r'&&text[i+1]==='\n')i++;continue;}
  if(state==='closed')throw Error('CSV 引号后存在无效字符。');
  if(c==='"'){if(state!=='start')throw Error('CSV 引号格式不正确。');state='quoted';continue;}
  field+=c;state='plain';
 }
 if(state==='quoted')throw Error('CSV 中存在未闭合的引号。');
 if(field!==''||row.length||state==='closed')endRow();
 return rows;
}
function importParameterCSV(text){
 const keys=['a','b1','cre','c1','c2','dre','d1','d2','e1'],noteKeys=[...keys,'b','c','d','e','res'];
 const rows=parseCSV(text);if(rows.length<2)throw Error('CSV 必须包含表头和至少一行参数。');
 const headers=rows.shift().map(s=>s.trim());
 if(new Set(headers).size!==headers.length)throw Error('CSV 存在重复列名。');
 for(const k of keys.filter(k=>!['d1','e1'].includes(k)))if(!headers.includes(k))throw Error('CSV 缺少参数列：'+k+'。');
 // Earlier exports protect formula-like cells with an apostrophe.
 const unescape=s=>/^'[=+@\-\t\r]/.test(s)?s.slice(1):s;
 const notes={},scenarios=[];
 rows.forEach((row,index)=>{
  if(row.length!==headers.length)throw Error('CSV 第 '+(index+2)+' 行的列数与表头不一致。');
  const get=k=>row[headers.indexOf(k)],values={};
  for(const k of keys){if(k==='d1')continue;if(k==='e1'&&!headers.includes(k)){values.e1=1;continue;}const value=unescape(get(k)).trim();if(!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value)||!Number.isFinite(Number(value)))throw Error('CSV 第 '+(index+2)+' 行参数 '+k+' 不是有效数字。');values[k]=Number(value);}
  const name=headers.includes('方案')?unescape(get('方案')):'方案 '+(index+1);
  values.d1=values.c1;
  const rowNotes={};for(const k of noteKeys){if(!headers.includes(k+' 注释'))continue;const value=unescape(get(k+' 注释'));if(value.length>1000)throw Error(k+' 注释超过 1000 字。');rowNotes[k]=value;}
  scenarios.push({name:name||'方案 '+(index+1),values,notes:rowNotes});
  if(index===0)Object.assign(notes,rowNotes);
 });
 // An explicitly present, empty annotation column restores an empty note.
 for(const k of noteKeys)if(headers.includes(k+' 注释')&&notes[k]===undefined)notes[k]='';
 return {values:{...scenarios[0].values},scenarios,notes,missingNotes:noteKeys.filter(k=>!headers.includes(k+' 注释'))};
}
if(typeof module!=='undefined')module.exports={parseCSV,importParameterCSV};
