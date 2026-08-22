
(function(){
"use strict";
var DATA=window.FIGAROMN_CERISE_DATA;
if(!DATA||!Array.isArray(DATA.levels))return;

var LS_KEY="figaromn_cerise_exports_v249";
var CAP_KEY="figaromn_cerise_cap_year_v249";
var me=null, cloudOk=true, root=null;

function $(id){return document.getElementById(id);}
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c];});}
function readLS(){try{return JSON.parse(localStorage.getItem(LS_KEY)||"[]");}catch(e){return[];}}
function writeLS(v){try{localStorage.setItem(LS_KEY,JSON.stringify(v));}catch(e){}}
function getCapYear(){try{return localStorage.getItem(CAP_KEY)||"2322";}catch(e){return"2322";}}
function setCapYear(v){try{localStorage.setItem(CAP_KEY,v);}catch(e){}}
function fmtDate(v){try{return new Intl.DateTimeFormat("fr-FR",{dateStyle:"short",timeStyle:"short"}).format(new Date(v));}catch(e){return v||"";}}
function findSession(levelKey,seqNo,sessNo){
 var L=DATA.levels.find(function(x){return x.key===levelKey;});
 if(!L)return null;
 var S=L.sequences.find(function(x){return Number(x.no)===Number(seqNo);});
 if(!S)return null;
 var ss=S.sessions.find(function(x){return Number(x.no)===Number(sessNo);});
 return ss?{level:L,sequence:S,session:ss}:null;
}
function pathFor(rec){
 var f=findSession(rec.level,rec.sequence_no,rec.session_no);
 if(!f)return rec.file_path||"";
 if(f.level.key==="cap" && f.session.capFiles){
   return f.session.capFiles[String(rec.cap_year||getCapYear())] || f.session.scpro;
 }
 return f.session.scpro;
}
function filenameFromPath(p){return String(p||"").split("/").pop()||"scenario.scpro";}
function shortFilename(levelKey,seqNo,sessNo,capYear){
 var codes={cap:"CAP",seconde:"2B",premiere:"1B",terminale:"TB"};
 var c=codes[levelKey]||"SC";
 var s=String(Number(seqNo)||0).padStart(2,"0");
 var n=String(Number(sessNo)||0).padStart(2,"0");
 if(levelKey==="cap")c+=(String(capYear||getCapYear())==="2321"?"1":"2");
 return c+"-S"+s+"-"+n+".scpro";
}
function downloadText(text,filename){
 var blob=new Blob([text],{type:"application/octet-stream"});
 var url=URL.createObjectURL(blob);
 var a=document.createElement("a"); a.href=url;a.download=filename||"scenario.scpro";
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(function(){URL.revokeObjectURL(url);},1000);
}
async function fetchText(path){
 var r=await fetch(path,{cache:"no-store"});
 if(!r.ok)throw new Error("Fichier .SCPRO introuvable ("+r.status+").");
 return await r.text();
}
function localUpsert(rec){
 var rows=readLS(), key=[rec.level,rec.sequence_no,rec.session_no,rec.cap_year||""].join("|");
 var idx=rows.findIndex(function(x){return [x.level,x.sequence_no,x.session_no,x.cap_year||""].join("|")===key;});
 if(idx>=0)rows[idx]=Object.assign({},rows[idx],rec);
 else rows.unshift(rec);
 writeLS(rows.slice(0,500));
}
async function serverUpsert(rec){
 if(!me||!cloudOk)return false;
 try{
   var body={
    teacher_id:me.id,level:rec.level,sequence_no:rec.sequence_no,session_no:rec.session_no,
    cap_year:rec.cap_year||"",title:rec.title,filename:rec.filename,file_path:rec.file_path,
    scpro_data:rec.scpro_data,exported_at:rec.exported_at
   };
   await FigaroCloud.table("cerise_exports",
    "on_conflict=teacher_id,level,sequence_no,session_no,cap_year",
    {method:"POST",headers:{"Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(body)}
   );
   return true;
 }catch(e){
   cloudOk=false;
   console.warn("FigaroMN CERISE : sauvegarde Supabase indisponible, sauvegarde locale utilisée.",e);
   return false;
 }
}
async function loadServer(){
 if(!me||!cloudOk)return[];
 try{
  var q="teacher_id=eq."+encodeURIComponent(me.id)+"&select=id,level,sequence_no,session_no,cap_year,title,filename,file_path,scpro_data,exported_at&order=exported_at.desc&limit=500";
  var rows=await FigaroCloud.table("cerise_exports",q);
  return Array.isArray(rows)?rows:[];
 }catch(e){cloudOk=false;return[];}
}
function mergeRows(server,local){
 var out=[],seen={};
 server.concat(local).forEach(function(r){
   var k=[r.level,r.sequence_no,r.session_no,r.cap_year||""].join("|");
   if(seen[k])return;seen[k]=1;out.push(r);
 });
 out.sort(function(a,b){return String(b.exported_at||"").localeCompare(String(a.exported_at||""));});
 return out;
}
async function refreshBackup(){
 var body=$("fmncer-backup-body"); if(!body)return;
 body.innerHTML='<tr><td colspan="7">Chargement…</td></tr>';
 var server=await loadServer(), rows=mergeRows(server,readLS());
 if(!rows.length){body.innerHTML='<tr><td colspan="7" class="fmncer-empty">Aucun scénario exporté pour le moment.</td></tr>';return;}
 body.innerHTML=rows.map(function(r){
   var f=findSession(r.level,r.sequence_no,r.session_no);
   var lvl=f?f.level.label:r.level;
   var cap=(r.level==="cap"&&r.cap_year)?(String(r.cap_year)==="2321"?" · 1re année":" · 2e année"):"";
   return '<tr>'+
    '<td>'+esc(fmtDate(r.exported_at))+'</td>'+
    '<td><strong>'+esc(lvl+cap)+'</strong></td>'+
    '<td>S'+esc(r.sequence_no)+'.'+esc(r.session_no)+'</td>'+
    '<td>'+esc(r.title||"")+'</td>'+
    '<td>'+esc(shortFilename(r.level,r.sequence_no,r.session_no,r.cap_year))+'</td>'+
    '<td>'+(r.scpro_data?'<span class="fmncer-pill">Sauvegardé</span>':'<span class="fmncer-pill">Lien</span>')+'</td>'+
    '<td><button type="button" class="fmncer-btn secondary" data-redownload="'+esc([r.level,r.sequence_no,r.session_no,r.cap_year||""].join("|"))+'">⬇ Retélécharger</button></td>'+
   '</tr>';
 }).join("");
 body.querySelectorAll("[data-redownload]").forEach(function(btn){
   btn.addEventListener("click",async function(){
     var parts=btn.getAttribute("data-redownload").split("|");
     var key=parts.join("|");
     var all=mergeRows(server,readLS());
     var r=all.find(function(x){return [x.level,String(x.sequence_no),String(x.session_no),String(x.cap_year||"")].join("|")===key;});
     if(!r)return;
     try{
       var text=r.scpro_data||await fetchText(pathFor(r));
       downloadText(text,shortFilename(r.level,r.sequence_no,r.session_no,r.cap_year));
     }catch(e){setMsg("Erreur : "+e.message,true);}
   });
 });
 window.__FMNCER_ROWS=rows;
}
function setMsg(s,bad){
 var el=$("fmncer-msg"); if(!el)return;el.textContent=s||"";el.style.color=bad?"#9a3535":"#315566";
}
async function exportOne(level,seq,sess,button){
 var capYear=level.key==="cap"?getCapYear():null;
 var path=level.key==="cap"&&sess.capFiles?(sess.capFiles[capYear]||sess.scpro):sess.scpro;
 var old=button?button.textContent:"";
 if(button){button.disabled=true;button.textContent="Préparation…";}
 try{
   var text=await fetchText(path);
   var rec={
    level:level.key,sequence_no:seq.no,session_no:sess.no,cap_year:capYear,
    title:sess.title,filename:shortFilename(level.key,seq.no,sess.no,capYear),file_path:path,scpro_data:text,
    exported_at:new Date().toISOString()
   };
   localUpsert(rec);
   await serverUpsert(rec);
   downloadText(text,rec.filename);
   setMsg("✅ Scénario sauvegardé et téléchargé : "+rec.filename,false);
   await refreshBackup();
 }catch(e){setMsg("Erreur d’export : "+e.message,true);}
 finally{if(button){button.disabled=false;button.textContent=old;}}
}
function packPath(levelKey){
 if(levelKey==="cap"){
   return "cerise/packs/"+(getCapYear()==="2321"?"01-CAP1.zip":"02-CAP2.zip");
 }
 var names={seconde:"03-SECONDE.zip",premiere:"04-PREMIERE.zip",terminale:"05-TERMINALE.zip"};
 return "cerise/packs/"+(names[levelKey]||"06-TOUS.zip");
}
function render(){
 root=$("fmncer-root");if(!root)return;
 var levelFilter=$("fmncer-level-filter").value;
 var q=($("fmncer-search").value||"").trim().toLowerCase();
 var host=$("fmncer-levels");
 var html="";
 DATA.levels.forEach(function(level){
  if(levelFilter&&level.key!==levelFilter)return;
  var seqHtml="";
  level.sequences.forEach(function(seq){
   var rows="";
   seq.sessions.forEach(function(sess){
    var hay=(level.label+" "+seq.title+" "+sess.title+" "+sess.objective+" "+sess.comps.join(" ")).toLowerCase();
    if(q&&hay.indexOf(q)<0)return;
    rows+='<div class="fmncer-session">'+
      '<div class="fmncer-session-title">Séance '+sess.no+' · '+esc(sess.title)+'<small>'+esc(sess.type||"")+'</small></div>'+
      '<div class="fmncer-session-objective">'+esc(sess.objective||"")+'</div>'+
      '<div class="fmncer-comps">'+sess.comps.map(function(c){return '<span class="fmncer-pill">'+esc(c)+'</span>';}).join("")+'</div>'+
      '<div class="fmncer-actions">'+
       (sess.url?'<a class="fmncer-btn secondary" href="'+esc(sess.url)+'" target="_blank" rel="noopener">Ouvrir</a>':'')+
       '<button type="button" class="fmncer-btn primary" data-export="'+esc([level.key,seq.no,sess.no].join("|"))+'">📤 Exporter .SCPRO</button>'+
      '</div>'+
    '</div>';
   });
   if(rows){
    seqHtml+='<details class="fmncer-seq" open><summary><span>Séquence '+seq.no+' · '+esc(seq.title)+'</span><span class="fmncer-seq-count">6 séances</span></summary><div class="fmncer-sessions">'+rows+'</div></details>';
   }
  });
  if(!seqHtml)return;
  var capSelect=level.key==="cap"?'<label class="fmncer-capyear">Niveau CAP CERISE <select id="fmncer-cap-year"><option value="2321">1re année</option><option value="2322">2e année</option></select></label>':"";
  html+='<section class="fmncer-level"><div class="fmncer-level-head"><h3>'+esc(level.full)+' · 7 séquences · 42 séances</h3>'+
    '<div class="fmncer-level-actions">'+capSelect+'<a class="fmncer-btn good" href="'+esc(packPath(level.key))+'" download>⬇ Pack '+esc(level.label)+'</a></div></div>'+seqHtml+'</section>';
 });
 host.innerHTML=html||'<div class="fmncer-empty">Aucune séance ne correspond au filtre.</div>';
 var capSel=$("fmncer-cap-year");if(capSel){capSel.value=getCapYear();capSel.addEventListener("change",function(){setCapYear(capSel.value);setMsg("Niveau CAP CERISE mémorisé.",false);render();});}
 host.querySelectorAll("[data-export]").forEach(function(btn){
   btn.addEventListener("click",function(){
    var p=btn.getAttribute("data-export").split("|");
    var f=findSession(p[0],Number(p[1]),Number(p[2]));if(f)exportOne(f.level,f.sequence,f.session,btn);
   });
 });
}
function exportCsv(){
 var rows=window.__FMNCER_ROWS||[];
 var cols=["Date export","Niveau","Séquence","Séance","Titre","Fichier"];
 var lines=[cols];
 rows.forEach(function(r){lines.push([r.exported_at,r.level,r.sequence_no,r.session_no,r.title,r.filename]);});
 var csv=lines.map(function(row){return row.map(function(v){return '"'+String(v==null?"":v).replace(/"/g,'""')+'"';}).join(";");}).join("\r\n");
 downloadText("\ufeff"+csv,"Suivi-CERISE-FigaroMN.csv");
}
async function init(){
 root=$("fmncer-root");if(!root)return;
 try{me=await FigaroCloud.requireRole("teacher");if(!me)return;}catch(e){return;}
 var select=$("fmncer-level-filter");
 DATA.levels.forEach(function(l){var o=document.createElement("option");o.value=l.key;o.textContent=l.label;select.appendChild(o);});
 select.addEventListener("change",render);
 $("fmncer-search").addEventListener("input",render);
 $("fmncer-export-csv").addEventListener("click",exportCsv);
 render();
 await refreshBackup();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
