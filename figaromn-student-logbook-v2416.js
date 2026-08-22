
(function(){
"use strict";
if(window.FIGAROMN_STUDENT_LOGBOOK_V2416)return;
window.FIGAROMN_STUDENT_LOGBOOK_V2416=true;

const master=document.getElementById("fmn-level-master")||document.getElementById("capmn26-master");
if(!master)return;

const button=master.querySelector('.nav button[data-view="logbook"]');
const viewEl=document.getElementById("fmn-view-logbook")||document.getElementById("capmn26-logbook");
if(!button||!viewEl)return;

const level=(viewEl.getAttribute("data-level")||
  (window.FIGAROMN_LEVEL_CONFIG&&window.FIGAROMN_LEVEL_CONFIG.level)||
  "cap").toLowerCase();

const labels={cap:"CAP MN",seconde:"Seconde BAC PRO",premiere:"Première BAC PRO",terminale:"Terminale BAC PRO"};
const monthFmt=new Intl.DateTimeFormat("fr-FR",{month:"long",year:"numeric"});
const fullDateFmt=new Intl.DateTimeFormat("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
const shortDateFmt=new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"});

let entries=[];
let classes=[];
let selectedDate="";
let monthCursor=new Date();
let loaded=false;
let loading=false;

function esc(v){
 return String(v==null?"":v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
}
function ymd(d){
 const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
 return y+"-"+m+"-"+day;
}
function parseDate(s){
 if(!s)return new Date();
 const p=String(s).split("-").map(Number);
 return new Date(p[0],(p[1]||1)-1,p[2]||1);
}
function activateView(){
 // BAC PRO : le moteur principal ne connaît pas encore la vue "logbook".
 master.querySelectorAll(".main-view").forEach(s=>s.classList.add("hidden"));
 if(viewEl.classList.contains("main-view"))viewEl.classList.remove("hidden");
 // CAP : les sections n'ont pas la classe main-view ; le gestionnaire CAP les affiche déjà.
 if(viewEl.id==="capmn26-logbook"){
   const ids=["capmn26-home","capmn26-courses","capmn26-course-detail","capmn26-exercises","capmn26-exercise-detail","capmn26-evaluations","capmn26-eval-detail","capmn26-tools","capmn26-games","capmn26-logbook"];
   ids.forEach(id=>{const el=document.getElementById(id);if(el)el.classList.toggle("hidden",id!=="capmn26-logbook");});
 }
 master.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.view==="logbook"));
 window.scrollTo({top:0,behavior:"smooth"});
}

function emptyShell(message){
 viewEl.innerHTML=`<div class="fmn-logbook-wrap">
  <div class="fmn-logbook-hero">
   <div><h2>📅 Mon cahier de texte</h2><p>Retrouve les séances renseignées par ton enseignant, même si tu étais absent.</p></div>
   <span class="fmn-logbook-chip">${esc(labels[level]||level)}</span>
  </div>
  <div class="fmn-logbook-status">${esc(message||"Chargement du cahier de texte…")}</div>
 </div>`;
}

async function table(name,query){
 if(!window.FigaroCloud||typeof FigaroCloud.table!=="function")throw new Error("Connexion FigaroMN indisponible.");
 return await FigaroCloud.table(name,query||"");
}

async function load(){
 if(loading)return;
 loading=true;
 emptyShell("Chargement de ton calendrier et de l’historique…");
 try{
   if(!window.FigaroCloud)throw new Error("Connexion FigaroMN indisponible.");
   const profile=await FigaroCloud.profile();
   if(!profile||profile.role!=="student")throw new Error("Connecte-toi avec ton compte élève pour consulter le cahier de texte.");

   const members=await table("class_members","student_id=eq."+encodeURIComponent(profile.id)+"&select=class_id");
   const ids=[...new Set((members||[]).map(x=>x.class_id).filter(Boolean))];

   if(!ids.length){
     entries=[];classes=[];loaded=true;
     renderNoClass(profile);
     return;
   }

   const inIds="("+ids.map(x=>String(x)).join(",")+")";
   classes=await table("classes","id=in."+encodeURIComponent(inIds)+"&select=id,name,level,teacher_id");
   classes=(classes||[]).filter(c=>!c.level||String(c.level).toLowerCase()===level);

   const validIds=(classes.length?classes.map(c=>c.id):ids);
   const filter="("+validIds.join(",")+")";
   entries=await table("logbook_entries",
     "class_id=in."+encodeURIComponent(filter)+
     "&level=eq."+encodeURIComponent(level)+
     "&select=id,class_id,class_name,level,sequence_no,session_no,entry_date,duration,title,content,homework,created_at"+
     "&order=entry_date.desc,created_at.desc"
   );
   entries=Array.isArray(entries)?entries:[];

   if(entries.length){
     monthCursor=parseDate(entries[0].entry_date);
     selectedDate=entries[0].entry_date;
   }else{
     monthCursor=new Date();
     selectedDate=ymd(new Date());
   }
   loaded=true;
   render();
 }catch(err){
   viewEl.innerHTML=`<div class="fmn-logbook-wrap">
    <div class="fmn-logbook-hero">
     <div><h2>📅 Mon cahier de texte</h2><p>Retrouve les séances renseignées par ton enseignant.</p></div>
     <span class="fmn-logbook-chip">${esc(labels[level]||level)}</span>
    </div>
    <div class="fmn-logbook-status error"><strong>Impossible de charger le cahier de texte.</strong><br>${esc(err&&err.message?err.message:String(err))}<br><br>Si l’enseignant vient d’activer cette fonction, la migration SQL V24.16 doit être exécutée dans Supabase.</div>
   </div>`;
 }finally{
   loading=false;
 }
}

function renderNoClass(profile){
 viewEl.innerHTML=`<div class="fmn-logbook-wrap">
  <div class="fmn-logbook-hero">
   <div><h2>📅 Mon cahier de texte</h2><p>Retrouve les séances renseignées par ton enseignant, même si tu étais absent.</p></div>
   <span class="fmn-logbook-chip">${esc(labels[level]||level)}</span>
  </div>
  <div class="fmn-logbook-alert"><strong>ℹ️ Aucune classe n’est encore rattachée à ton compte.</strong><br>Ton calendrier apparaîtra ici dès que ton enseignant t’aura rattaché à une classe.</div>
 </div>`;
}

function entriesForDate(date){return entries.filter(e=>e.entry_date===date);}
function classText(){
 const names=[...new Set(classes.map(c=>c.name).filter(Boolean))];
 return names.length?names.join(" · "):"Ma classe";
}
function entryHTML(e){
 const date=e.entry_date?shortDateFmt.format(parseDate(e.entry_date)):"";
 const seq=Number(e.sequence_no)||"—",ses=Number(e.session_no)||"—";
 return `<article class="fmn-log-entry">
   <div class="fmn-log-entry-head">
    <div>
     <div class="fmn-log-entry-title">${esc(e.title||("Séquence "+seq+" · Séance "+ses))}</div>
     <div class="fmn-log-entry-meta">📅 ${esc(date)} · Séquence ${esc(seq)} · Séance ${esc(ses)}${e.duration?" · ⏱ "+esc(e.duration):""}</div>
    </div>
   </div>
   ${e.content?`<div class="fmn-log-entry-content">${esc(e.content)}</div>`:""}
   ${e.homework?`<div class="fmn-log-entry-homework"><strong>📝 Travail à faire / suite</strong><br>${esc(e.homework)}</div>`:""}
  </article>`;
}

function renderCalendar(){
 const first=new Date(monthCursor.getFullYear(),monthCursor.getMonth(),1);
 const start=new Date(first);
 const weekday=(first.getDay()+6)%7; // lundi=0
 start.setDate(first.getDate()-weekday);
 const today=ymd(new Date());
 const days=[];
 for(let i=0;i<42;i++){
   const d=new Date(start);d.setDate(start.getDate()+i);
   const key=ymd(d), count=entriesForDate(key).length;
   const outside=d.getMonth()!==monthCursor.getMonth();
   days.push(`<button type="button" class="fmn-cal-day${outside?" is-outside":""}${count?" has-entry":""}${key===selectedDate?" is-selected":""}${key===today?" is-today":""}" data-logbook-date="${key}" ${outside?"tabindex='-1'":""}>
    <span class="fmn-day-num">${d.getDate()}</span>
    ${count?`<span class="fmn-day-count">${count} séance${count>1?"s":""}</span>`:""}
   </button>`);
 }
 return `<div class="fmn-calendar-card">
   <div class="fmn-calendar-toolbar">
    <h3>${esc(monthFmt.format(monthCursor))}</h3>
    <div class="fmn-calendar-actions">
     <button type="button" data-logbook-month="-1">← Mois précédent</button>
     <button type="button" data-logbook-today>Aujourd’hui</button>
     <button type="button" data-logbook-month="1">Mois suivant →</button>
    </div>
   </div>
   <div class="fmn-calendar-grid">
    ${["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(x=>`<div class="fmn-cal-weekday">${x}</div>`).join("")}
    ${days.join("")}
   </div>
   <div class="fmn-day-detail" id="fmn-logbook-day-detail"></div>
  </div>`;
}

function renderDayDetail(){
 const box=viewEl.querySelector("#fmn-logbook-day-detail");
 if(!box)return;
 const rows=entriesForDate(selectedDate);
 const date=fullDateFmt.format(parseDate(selectedDate));
 box.innerHTML=rows.length
   ? `<h3 style="margin:0;color:var(--navy);text-transform:capitalize">${esc(date)}</h3>`+rows.map(entryHTML).join("")
   : `<div class="fmn-day-empty"><strong>${esc(date)}</strong><br>Aucune séance du cahier de texte enregistrée pour cette date.</div>`;
}

function render(){
 const latest=entries.slice(0,20);
 viewEl.innerHTML=`<div class="fmn-logbook-wrap">
  <div class="fmn-logbook-hero">
   <div>
    <h2>📅 Mon cahier de texte</h2>
    <p>Consulte ce qui a été fait en cours et le travail à faire. Les informations proviennent directement de l’historique renseigné par ton enseignant.</p>
   </div>
   <span class="fmn-logbook-chip">${esc(classText())}</span>
  </div>
  <div class="fmn-logbook-alert"><strong>👋 Tu étais absent ?</strong> Clique sur une date en vert pour retrouver le contenu de la séance et le travail à faire. L’historique reste disponible plus bas.</div>
  ${renderCalendar()}
  <div class="fmn-history-card">
   <div class="fmn-history-head">
    <h3>📚 Historique du cahier de texte</h3>
    <span class="fmn-logbook-chip">${entries.length} entrée${entries.length>1?"s":""}</span>
   </div>
   <div class="fmn-history-list">
    ${latest.length?latest.map(entryHTML).join(""):`<div class="fmn-day-empty">Aucune entrée n’a encore été enregistrée par ton enseignant pour cette classe.</div>`}
   </div>
  </div>
 </div>`;
 wire();
 renderDayDetail();
}

function wire(){
 viewEl.querySelectorAll("[data-logbook-date]").forEach(b=>b.addEventListener("click",()=>{
   if(b.classList.contains("is-outside"))return;
   selectedDate=b.dataset.logbookDate;
   viewEl.querySelectorAll(".fmn-cal-day").forEach(x=>x.classList.toggle("is-selected",x.dataset.logbookDate===selectedDate));
   renderDayDetail();
   const detail=viewEl.querySelector("#fmn-logbook-day-detail");
   if(detail)detail.scrollIntoView({behavior:"smooth",block:"nearest"});
 }));
 viewEl.querySelectorAll("[data-logbook-month]").forEach(b=>b.addEventListener("click",()=>{
   monthCursor=new Date(monthCursor.getFullYear(),monthCursor.getMonth()+Number(b.dataset.logbookMonth),1);
   render();
 }));
 const todayBtn=viewEl.querySelector("[data-logbook-today]");
 if(todayBtn)todayBtn.addEventListener("click",()=>{
   monthCursor=new Date();
   selectedDate=ymd(new Date());
   render();
 });
}

button.onclick=function(ev){
 if(ev){ev.preventDefault();ev.stopPropagation();}
 activateView();
 if(!loaded)load(); else render();
};

// En CAP, un ancien listener addEventListener est déjà présent.
// Ce listener en capture garantit que le clic calendrier ne provoque pas d'erreur
// si un navigateur exécute l'ancien gestionnaire avant l'initialisation du nouveau module.
button.addEventListener("click",function(ev){
 activateView();
 if(!loaded)load();
},true);

window.FigaroMNStudentLogbook={open:function(){activateView();return load();},reload:function(){loaded=false;return load();}};
})();
