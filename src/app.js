const missing=Symbol('missing');
function compareValues(a,b,path='$',out=[]){
 const object=x=>x!==null&&typeof x==='object';
 if(a===missing||b===missing){out.push({path,type:a===missing?'added':'removed',left:a,right:b});return out;}
 if(object(a)&&object(b)&&Array.isArray(a)===Array.isArray(b)){
  const keys=Array.isArray(a)?Array.from({length:Math.max(a.length,b.length)},(_,i)=>String(i)):[...new Set([...Object.keys(a),...Object.keys(b)])].sort();
  if(!keys.length)out.push({path,type:'same',left:a,right:b});
  for(const k of keys)compareValues(Object.hasOwn(a,k)?a[k]:missing,Object.hasOwn(b,k)?b[k]:missing,Array.isArray(a)?`${path}[${k}]`:`${path}[${JSON.stringify(k)}]`,out);
 }else out.push({path,type:Object.is(a,b)?'same':'changed',left:a,right:b});
 return out;
}
function highlightPaths(a,b){
 const result={left:[],right:[]};const object=x=>x!==null&&typeof x==='object';
 function visit(x,y,left='$',right='$'){
  if(x===missing||y===missing){if(x!==missing)result.left.push(left);if(y!==missing)result.right.push(right);return;}
  if(object(x)&&object(y)&&Array.isArray(x)===Array.isArray(y)){
   if(Array.isArray(x)){for(let i=0;i<Math.max(x.length,y.length);i++)visit(i<x.length?x[i]:missing,i<y.length?y[i]:missing,`${left}[${i}]`,`${right}[${i}]`);return;}
   const lkeys=Object.keys(x),rkeys=Object.keys(y),removed=lkeys.filter(k=>!Object.hasOwn(y,k)),added=rkeys.filter(k=>!Object.hasOwn(x,k));
   for(const k of lkeys.filter(k=>Object.hasOwn(y,k)))visit(x[k],y[k],left+'['+JSON.stringify(k)+']',right+'['+JSON.stringify(k)+']');
   // A single unmatched object on each side can be inspected as a renamed
   // block. Semantic results still report the distinct keys as removed/added.
   if(removed.length===1&&added.length===1&&object(x[removed[0]])&&object(y[added[0]])&&Array.isArray(x[removed[0]])===Array.isArray(y[added[0]])){
    const l=left+'['+JSON.stringify(removed[0])+']',r=right+'['+JSON.stringify(added[0])+']';result.left.push(l);result.right.push(r);visit(x[removed[0]],y[added[0]],l,r);
   }else{for(const k of removed)visit(x[k],missing,left+'['+JSON.stringify(k)+']',right);for(const k of added)visit(missing,y[k],left,right+'['+JSON.stringify(k)+']');}
  }else if(!Object.is(x,y)){result.left.push(left);result.right.push(right);}
 }
 visit(a,b);return result;
}
function changedLines(text,paths){
 const tokens=[...text.matchAll(/"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}\[\]:,]/g)];let i=0;const lines=new Set();
 const line=pos=>text.slice(0,pos).split('\n').length-1;
 function value(path,keyStart){const start=keyStart??tokens[i]?.index;const token=tokens[i++]?.[0];if(token==='{'||token==='['){let n=0;const close=token==='{'?'}':']';while(tokens[i]?.[0]!==close&&i<tokens.length){let child,childStart;if(token==='{'){childStart=tokens[i].index;const key=JSON.parse(tokens[i++][0]);i++;child=path+'['+JSON.stringify(key)+']';}else child=path+'['+n+++']';value(child,childStart);if(tokens[i]?.[0]===',')i++;}i++;}if(paths.includes(path)){lines.add(line(start));}}
 value('$');return lines;
}
if(typeof module!=='undefined')module.exports={compareValues,missing,changedLines,highlightPaths};
if(typeof document!=='undefined'){
const $=id=>document.getElementById(id);let rows=null,timer;
function editorPaths(id){if(!rows)return [];try{return highlightPaths(JSON.parse($('left').value),JSON.parse($('right').value))[id];}catch{return [];}}
const folded={left:new Set(),right:new Set()};
function renderCode(id){
 const area=$(id),view=$(id+'Code');view.replaceChildren();const text=area.value,lines=text.split('\n');const starts=new Map(),stack=[];
 const lineAt=pos=>text.slice(0,pos).split('\n').length-1;
 for(const t of text.matchAll(/"(?:\\.|[^"\\])*"|[{}\[\]]/g)){if(t[0].startsWith('"'))continue;if(t[0]==='{'||t[0]==='[')stack.push(lineAt(t.index));else{const start=stack.pop(),end=lineAt(t.index);if(start!==undefined&&end>start)starts.set(start,Math.max(starts.get(start)||0,end));}}
 const paths=editorPaths(id);const changed=paths.length?changedLines(text,paths):new Set();
 for(let i=0;i<lines.length;i++){const row=document.createElement('div');row.className='code-line'+(changed.has(i)?' marked':'');const number=document.createElement('span');number.className='line-number';number.textContent=i+1;const toggle=document.createElement('button');toggle.className='fold-toggle';const end=starts.get(i),closed=folded[id].has(i);if(end!==undefined){toggle.textContent=closed?'▸':'▾';toggle.setAttribute('aria-label',`${closed?'Expand':'Collapse'} block at line ${i+1}`);toggle.setAttribute('aria-expanded',String(!closed));const start=i;toggle.onclick=()=>{closed?folded[id].delete(start):folded[id].add(start);renderCode(id);};}else{toggle.disabled=true;toggle.textContent=' ';}const code=document.createElement('span');code.textContent=lines[i];row.append(number,toggle,code);if(closed&&end!==undefined){const hint=document.createElement('span');hint.className='fold-hint';hint.textContent=` … ${end-i} lines`;if([...changed].some(n=>n>i&&n<=end)){hint.textContent+=' · contains differences';hint.style.color='#ffb0ba';}row.append(hint);i=end;}view.append(row);}
}
function showCode(id,on){$(id+'Code').hidden=!on;$(id).parentElement.hidden=on;$(id+'Edit').textContent=on?'Edit JSON':'View / fold';if(on)renderCode(id);}
for(const id of['left','right']){const area=$(id),view=document.createElement('div');view.id=id+'Code';view.className='code-view';view.hidden=true;view.setAttribute('aria-label',id==='left'?'Original JSON with line numbers':'Modified JSON with line numbers');area.parentElement.after(view);const bar=area.closest('.panel').querySelector('.bar');const controls=document.createElement('div');controls.className='actions';for(const [suffix,label,fn]of[['Edit','View / fold',()=>showCode(id,$(id+'Code').hidden)],['Collapse','Collapse all',()=>{showCode(id,true);const text=area.value;const stack=[];for(const t of text.matchAll(/"(?:\\.|[^"\\])*"|[{}\[\]]/g)){if(t[0].startsWith('"'))continue;const n=text.slice(0,t.index).split('\n').length-1;if(t[0]==='{'||t[0]==='[')stack.push(n);else{const start=stack.pop();if(start!==undefined&&n>start)folded[id].add(start);}}renderCode(id);}],['Expand','Expand all',()=>{folded[id].clear();showCode(id,true);}]]){const b=document.createElement('button');b.id=id+suffix;b.textContent=label;b.onclick=fn;controls.append(b);}bar.after(controls);}
function highlight(){for(const [id,side]of[['left','left'],['right','right']]){const area=$(id),layer=$(id+'Highlight');layer.replaceChildren();const paths=editorPaths(id);const changed=paths.length?changedLines(area.value,paths):new Set();area.value.split('\n').forEach((_,i)=>{const el=document.createElement('div');el.className='editor-line'+(changed.has(i)?' marked':'');el.textContent=String(i+1);layer.append(el);});layer.style.transform=`translate(${-area.scrollLeft}px,${-area.scrollTop}px)`;}}
for(const id of['left','right'])$(id).addEventListener('scroll',()=>{$(id+'Highlight').style.transform=`translate(${-$(id).scrollLeft}px,${-$(id).scrollTop}px)`;});
function parse(){let vals=[],valid=true;for(const [id,err]of[['left','errorL'],['right','errorR']]){try{vals.push(JSON.parse($(id).value));$(err).textContent='';}catch(e){$(err).textContent=e.message;valid=false;}}return valid?vals:null;}
function draw(){const target=$('results');target.replaceChildren();if(!rows)return;const counts={added:0,removed:0,changed:0};rows.forEach(r=>{if(r.type!=='same')counts[r.type]++;});const total=counts.added+counts.removed+counts.changed;$('summary').textContent=total?`${total} difference${total===1?'':'s'} · ${counts.changed} changed · ${counts.added} added · ${counts.removed} removed`:'✓ JSON values are identical';const visible=rows.filter(r=>!$('only').checked||r.type!=='same');for(const r of visible){const row=document.createElement('div');row.className='row';for(const side of['left','right']){const cell=document.createElement('div');cell.className='cell '+(r[side]===missing?'empty':r.type);const path=document.createElement('span');path.className='path';path.textContent=r.path+' · '+r.type;cell.append(path,document.createTextNode(r[side]===missing?'— missing —':JSON.stringify(r[side],null,2)));row.append(cell);}target.append(row);}if(!visible.length){const msg=document.createElement('div');msg.className='message';msg.textContent='No differences. Both JSON documents contain the same values.';target.append(msg);}}
function run(){const vals=parse();if(!vals){rows=null;highlight();for(const id of ['left','right']){folded[id].clear();showCode(id,false);}$('results').replaceChildren();$('summary').textContent='Fix the JSON errors above to compare.';return;}rows=compareValues(...vals);highlight();for(const id of['left','right']){if(document.activeElement!==$(id))showCode(id,true);}draw();}
$('compare').onclick=run;$('only').onchange=draw;
for(const id of['left','right'])$(id).addEventListener('input',()=>{folded[id].clear();clearTimeout(timer);timer=setTimeout(()=>{if($('left').value.trim()&&$('right').value.trim())run();else{rows=null;highlight();for(const id of ['left','right']){folded[id].clear();showCode(id,false);}$('results').replaceChildren();$('summary').textContent='Enter JSON on both sides.';}},400);});
$('format').onclick=()=>{const vals=parse();if(vals){folded.left.clear();folded.right.clear();$('left').value=JSON.stringify(vals[0],null,2);$('right').value=JSON.stringify(vals[1],null,2);run();}};
$('swap').onclick=()=>{[$('left').value,$('right').value]=[$('right').value,$('left').value];if($('left').value&&$('right').value)run();};
$('clear').onclick=()=>{clearTimeout(timer);['left','right','errorL','errorR'].forEach(id=>{$(id).value!==undefined?$(id).value='':$(id).textContent='';});rows=null;highlight();for(const id of ['left','right']){folded[id].clear();showCode(id,false);}$('results').replaceChildren();$('summary').textContent='Enter JSON on both sides.';};
for(const [id,target]of[['fileL','left'],['fileR','right']])$(id).onchange=async e=>{const f=e.target.files[0];if(f){$(target).value=await f.text();if($('left').value.trim()&&$('right').value.trim())run();}e.target.value='';};
$('download').onclick=()=>{run();if(!rows)return;const data=rows.filter(r=>r.type!=='same').map(r=>({...r,left:r.left===missing?undefined:r.left,right:r.right===missing?undefined:r.right}));const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='json-differences.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('example').onclick=()=>{folded.left.clear();folded.right.clear();$('left').value=JSON.stringify({name:'checkout-service',version:1,settings:{timeout:3000,retries:2},features:['payments','receipts'],legacyMode:true},null,2);$('right').value=JSON.stringify({name:'checkout-service',version:2,settings:{timeout:5000,retries:2},features:['payments','receipts','refunds'],region:'eu-west'},null,2);run();};
}
