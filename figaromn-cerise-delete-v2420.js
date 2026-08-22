(function(){
"use strict";

var LS_KEY="figaromn_cerise_exports_v249";
var STYLE_ID="fmncer-delete-v2420-style";

function norm(v){
  return String(v==null?"":v)
    .normalize ? String(v==null?"":v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim()
               : String(v==null?"":v).toLowerCase().replace(/\s+/g," ").trim();
}
function compact(v){return norm(v).replace(/[^a-z0-9]+/g,"");}
function esc(v){return encodeURIComponent(String(v==null?"":v));}
function basename(v){
  var s=String(v==null?"":v).replace(/\\/g,"/");
  return s.split("/").pop().replace(/\s+/g,"").toLowerCase();
}
function parseRepere(v){
  var m=String(v||"").match(/S\s*(\d+)\s*[.\-]\s*(\d+)/i);
  return m?{sequence:Number(m[1]),session:Number(m[2])}:null;
}
function levelInfo(label){
  var n=norm(label);
  if(n.indexOf("seconde")>=0)return {level:"seconde",capYear:null};
  if(n.indexOf("premiere")>=0 || n.indexOf("1re bac")>=0)return {level:"premiere",capYear:null};
  if(n.indexOf("terminale")>=0 || n.indexOf("tle")>=0)return {level:"terminale",capYear:null};
  if(n.indexOf("cap")>=0){
    var y=null;
    if(/1re|1ere|1e annee|1 annee/.test(n))y=1;
    if(/2e|2eme|2e annee|2 annee/.test(n))y=2;
    return {level:"cap",capYear:y};
  }
  return {level:n,capYear:null};
}
function ensureStyles(){
  if(document.getElementById(STYLE_ID))return;
  var s=document.createElement("style");
  s.id=STYLE_ID;
  s.textContent=[
    ".fmncer-action-stack-v2420{display:flex;gap:8px;align-items:center;flex-wrap:wrap}",
    ".fmncer-delete-v2420{appearance:none;border:1px solid #d58b8b;background:#fff1f1;color:#9b2f2f;border-radius:10px;padding:10px 12px;font-weight:800;cursor:pointer;line-height:1.15}",
    ".fmncer-delete-v2420:hover{background:#ffe0e0}",
    ".fmncer-delete-v2420:disabled{opacity:.6;cursor:wait}",
    "@media(max-width:760px){.fmncer-action-stack-v2420{align-items:stretch;flex-direction:column}.fmncer-action-stack-v2420>*{width:100%!important}}"
  ].join("");
  document.head.appendChild(s);
}
function setMsg(text,bad){
  var el=document.getElementById("fmncer-msg");
  if(el){el.textContent=text||"";el.style.color=bad?"#9a3535":"#315566";return;}
  if(text)window.alert(text);
}
function findCeriseTable(){
  var tables=[].slice.call(document.querySelectorAll("table"));
  return tables.find(function(t){
    var hs=[].slice.call(t.querySelectorAll("thead th, th")).map(function(x){return norm(x.textContent);}).join("|");
    return hs.indexOf("scenario")>=0 && hs.indexOf("sauvegarde")>=0 && hs.indexOf("action")>=0;
  }) || null;
}
function getMeta(tr){
  var td=tr.querySelectorAll("td");
  if(td.length<7)return null;
  return {
    tr:tr,
    date:td[0].textContent.trim(),
    levelLabel:td[1].textContent.trim(),
    repere:td[2].textContent.trim(),
    scenario:td[3].textContent.trim(),
    filename:td[4].textContent.trim(),
    saveLabel:td[5].textContent.trim(),
    actionCell:td[td.length-1]
  };
}
function valueLooksLikeFilename(v,target){
  if(typeof v!=="string")return false;
  var b=basename(v),t=basename(target);
  return !!b && !!t && b===t;
}
function candidateLevelMatches(record,info){
  var rv=norm(record.level || record.niveau || record.level_key || "");
  if(!rv)return true;
  if(info.level==="cap")return rv.indexOf("cap")>=0;
  return rv.indexOf(info.level)>=0;
}
function recordMatches(record,meta){
  if(!record||!meta)return false;
  var fileMatch=false;
  Object.keys(record).some(function(k){
    if(valueLooksLikeFilename(record[k],meta.filename)){fileMatch=true;return true;}
    return false;
  });
  if(fileMatch)return true;

  var rp=parseRepere(meta.repere);
  var seq=Number(record.sequence_no!=null?record.sequence_no:(record.sequence!=null?record.sequence:record.sequenceNo));
  var ses=Number(record.session_no!=null?record.session_no:(record.session!=null?record.session:(record.seance_no!=null?record.seance_no:record.sessionNo)));
  if(rp && seq===rp.sequence && ses===rp.session){
    var info=levelInfo(meta.levelLabel);
    if(!candidateLevelMatches(record,info))return false;
    if(info.level==="cap" && info.capYear!=null){
      var cy=record.cap_year!=null?Number(record.cap_year):(record.capYear!=null?Number(record.capYear):null);
      if(cy!=null && cy!==info.capYear)return false;
    }
    return true;
  }

  var title=norm(record.title || record.scenario || record.scenario_title || "");
  return !!title && title===norm(meta.scenario);
}
function loadLocal(){
  try{
    var rows=JSON.parse(localStorage.getItem(LS_KEY)||"[]");
    return Array.isArray(rows)?rows:[];
  }catch(e){return [];}
}
function saveLocal(rows){
  try{localStorage.setItem(LS_KEY,JSON.stringify(rows||[]));}catch(e){}
}
function removeLocal(meta){
  var rows=loadLocal();
  var next=rows.filter(function(r){return !recordMatches(r,meta);});
  saveLocal(next);
  if(Array.isArray(window.__FMNCER_ROWS)){
    window.__FMNCER_ROWS=window.__FMNCER_ROWS.filter(function(r){return !recordMatches(r,meta);});
  }
}
async function serverRowsForTeacher(){
  if(!window.FigaroCloud)return null;
  var me=await FigaroCloud.requireRole("teacher");
  if(!me||!me.id)throw new Error("Session enseignant introuvable.");
  var q="select=*&teacher_id=eq."+esc(me.id);
  var rows=await FigaroCloud.table("cerise_exports",q);
  return {me:me,rows:Array.isArray(rows)?rows:[]};
}
async function deleteServerRecord(meta){
  if(!window.FigaroCloud)return {deleted:false,reason:"no-cloud"};
  var pack=await serverRowsForTeacher();
  var rows=pack.rows;
  if(!rows.length)return {deleted:false,reason:"none"};
  var rec=rows.find(function(r){return recordMatches(r,meta);});
  if(!rec)throw new Error("La sauvegarde correspondante n'a pas été retrouvée dans Supabase.");

  if(rec.id!=null && String(rec.id)!==""){
    await FigaroCloud.table("cerise_exports","id=eq."+esc(rec.id),{method:"DELETE",headers:{Prefer:"return=minimal"}});
    return {deleted:true,record:rec};
  }

  var filters=["teacher_id=eq."+esc(pack.me.id)];
  ["level","sequence_no","session_no","cap_year"].forEach(function(k){
    if(rec[k]!==undefined && rec[k]!==null && String(rec[k])!=="")filters.push(k+"=eq."+esc(rec[k]));
  });
  if(filters.length<3)throw new Error("Impossible d'identifier précisément cette sauvegarde dans Supabase.");
  await FigaroCloud.table("cerise_exports",filters.join("&"),{method:"DELETE",headers:{Prefer:"return=minimal"}});
  return {deleted:true,record:rec};
}
function emptyState(table){
  var body=table&&table.tBodies&&table.tBodies[0];
  if(!body)return;
  if(body.querySelector("tr"))return;
  var cols=(table.querySelectorAll("thead th").length||7);
  body.innerHTML='<tr><td colspan="'+cols+'" style="text-align:center;padding:18px;color:#61727c">Aucun scénario exporté pour le moment.</td></tr>';
}
async function handleDelete(btn,meta,table){
  if(!window.confirm("Supprimer définitivement cette sauvegarde CERISE Pro ?\n\n"+meta.repere+" — "+meta.scenario+"\n"+meta.filename+"\n\nLe fichier .SCPRO déjà téléchargé sur ton ordinateur ne sera pas supprimé."))return;
  var old=btn.textContent;
  btn.disabled=true;
  btn.textContent="Suppression…";
  try{
    var serverResult={deleted:false,reason:"no-cloud"};
    if(window.FigaroCloud){serverResult=await deleteServerRecord(meta);}
    removeLocal(meta);
    meta.tr.remove();
    emptyState(table);
    if(serverResult.deleted){setMsg("✅ Sauvegarde CERISE Pro supprimée de Supabase et du navigateur.",false);}
    else{setMsg("✅ Sauvegarde locale supprimée. Aucune ligne Supabase correspondante n'était présente.",false);}
  }catch(e){
    btn.disabled=false;
    btn.textContent=old;
    setMsg("Erreur de suppression : "+(e&&e.message?e.message:String(e)),true);
  }
}
function enhance(){
  ensureStyles();
  var table=findCeriseTable();
  if(!table)return false;
  [].slice.call(table.querySelectorAll("tbody tr")).forEach(function(tr){
    var meta=getMeta(tr);
    if(!meta)return;
    var cell=meta.actionCell;
    if(cell.querySelector(".fmncer-delete-v2420"))return;

    var wrap=cell.querySelector(".fmncer-action-stack-v2420");
    if(!wrap){
      wrap=document.createElement("div");
      wrap.className="fmncer-action-stack-v2420";
      while(cell.firstChild)wrap.appendChild(cell.firstChild);
      cell.appendChild(wrap);
    }
    var btn=document.createElement("button");
    btn.type="button";
    btn.className="fmncer-delete-v2420";
    btn.textContent="🗑 Supprimer";
    btn.title="Supprimer cette sauvegarde CERISE Pro";
    btn.addEventListener("click",function(){handleDelete(btn,meta,table);});
    wrap.appendChild(btn);
  });
  return true;
}
function init(){
  ensureStyles();
  enhance();
  var obs=new MutationObserver(function(){enhance();});
  obs.observe(document.body,{childList:true,subtree:true});
  var tries=0;
  var timer=setInterval(function(){enhance();tries++;if(tries>40)clearInterval(timer);},250);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
