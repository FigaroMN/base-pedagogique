
(function(){
"use strict";

const CFG = window.FIGAROMN_LEVEL_CONFIG;
if(!CFG) return;

const $ = id => document.getElementById(id);
const esc = s => String(s==null?"":s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const compCodes = Object.keys(CFG.competencies).sort((a,b)=>Number(a.slice(1))-Number(b.slice(1)));

let me=null, dbSessions=[], progress=[], evaluations=[], attempts=[], autoStatus=[];
let isTeacher=false;

function view(name){
 document.querySelectorAll("#fmn-level-master .main-view").forEach(s=>s.classList.add("hidden"));
 const target=$("fmn-view-"+name);
 if(target)target.classList.remove("hidden");
 document.querySelectorAll("#fmn-level-master .nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
 window.scrollTo({top:0,behavior:"smooth"});
}

function sessionDb(period,no){
 return dbSessions.find(s=>Number(s.period)===Number(period)&&Number(s.session_no)===Number(no));
}
function pRow(period,no){
 const db=sessionDb(period,no);
 if(!db||!me)return null;
 return progress.find(x=>x.student_id===me.id&&x.session_id===db.id)||null;
}
function sessionStatus(period,no){
 const r=pRow(period,no);
 return r ? (r.status==="completed"?"completed":"started") : "not-started";
}
function statusText(s){
 return s==="completed"?"Terminée":s==="started"?"Commencée":"À faire";
}
function doneCount(period){
 return CFG.sequences.find(x=>x.no===period).sessions.filter(s=>sessionStatus(period,s.no)==="completed").length;
}
function evalRows(period){
 const db=sessionDb(period,6);
 if(!db||!me)return [];
 return evaluations.filter(x=>x.student_id===me.id&&x.session_id===db.id);
}
function attemptCount(period,no){
 const db=sessionDb(period,no);
 if(!db||!me)return 0;
 return attempts.filter(x=>x.student_id===me.id&&x.session_id===db.id).length;
}

function renderIdentity(){
 $("fmn-level-name").value=me ? (me.full_name||me.email||"") : "";
 $("fmn-level-name").readOnly=true;
 $("fmn-level-class").value=CFG.class;
 $("fmn-level-class").readOnly=true;
}

function renderProgress(){
 const grid=$("fmn-progress-grid");
 grid.innerHTML=CFG.sequences.map(seq=>{
   const done=doneCount(seq.no), pct=Math.round(done/6*100);
   return `<button type="button" class="step" data-seq="${seq.no}">
    <span class="num">${seq.no}</span>
    <span>
     <h3>Séquence ${seq.no} – ${esc(seq.title)}</h3>
     <p>Code ${esc(seq.code)} · ${done} / 6 séances terminées</p>
     <div class="sequence-progress"><span style="width:${pct}%"></span></div>
     <span class="open-hint">Ouvrir la séquence →</span>
    </span>
   </button>`;
 }).join("");
 grid.querySelectorAll(".step").forEach(b=>b.onclick=()=>openCourse(Number(b.dataset.seq)));
}

function renderCourses(){
 $("fmn-course-grid").innerHTML=CFG.sequences.map(seq=>`
  <article class="menu-card">
   <div>
    <div class="top-icon">📘</div>
    <span class="pill">SÉQUENCE ${seq.no} · ${esc(seq.code)}</span>
    <h3>${esc(seq.title)}</h3>
    <p>${seq.sessions.map(s=>esc(s.title)).slice(0,3).join(" · ")}…</p>
   </div>
   <div class="actions"><button class="btn blue open-course" data-seq="${seq.no}" type="button">Ouvrir le cours</button></div>
  </article>`).join("");
 document.querySelectorAll(".open-course").forEach(b=>b.onclick=()=>openCourse(Number(b.dataset.seq)));
}

function openCourse(seqNo){
 const seq=CFG.sequences.find(x=>x.no===seqNo);
 if(!seq)return;
 const done=doneCount(seqNo);
 $("fmn-course-detail").innerHTML=`
  <div class="content-head">
   <div>
    <span class="pill">SÉQUENCE ${seq.no} · ${esc(seq.code)}</span>
    <h2>${esc(seq.title)}</h2>
    <p>${done} / 6 séances terminées</p>
   </div>
   <button class="btn light" id="fmn-back-courses" type="button">← Mes cours</button>
  </div>
  <div class="content-box">
   <div class="context"><strong>Contexte de progression :</strong> cette séquence est organisée en 6 séances successives. Chaque séance conserve son cours, son activité, ses exercices, son TP ou son évaluation déjà présents dans FigaroMN.</div>
   <h4>Les 6 séances de la séquence</h4>
   <div class="session-list">
    ${seq.sessions.map(s=>{
      const st=sessionStatus(seq.no,s.no);
      return `<div class="session-row">
       <div class="sicon">${s.icon}</div>
       <div>
        <h4>Séance ${s.no} · ${esc(s.title)}</h4>
        <p>${esc(s.type)}${s.objective?" · "+esc(s.objective):""}</p>
        <span class="status-pill ${st==="completed"?"done":st==="started"?"started":""}">${statusText(st)}</span>
       </div>
       <div class="session-action"><a class="btn blue" href="${esc(s.url)}">Ouvrir</a></div>
      </div>`;
    }).join("")}
   </div>
   <div class="safety"><strong>🛡️ Sécurité / environnement :</strong> avant toute intervention, prendre en compte la mise hors énergie ou la consignation si nécessaire, les EPI, la ventilation, les risques électriques, incendie/explosion, les produits dangereux, la stabilité de l’embarcation, la protection de l’environnement et les prescriptions applicables.</div>
  </div>`;
 view("course-detail");
 $("fmn-back-courses").onclick=()=>view("courses");
}

function renderExercises(){
 $("fmn-exercise-grid").innerHTML=CFG.sequences.map(seq=>`
  <section class="content-box" style="margin-bottom:14px">
   <div class="content-head">
    <div><span class="pill">SÉQUENCE ${seq.no}</span><h2>${esc(seq.title)}</h2></div>
    <div><strong>${seq.sessions.reduce((n,s)=>n+(attemptCount(seq.no,s.no)>0?1:0),0)} / 6 activités enregistrées</strong></div>
   </div>
   <div class="session-list">
    ${seq.sessions.map(s=>{
      const n=attemptCount(seq.no,s.no);
      const st=sessionStatus(seq.no,s.no);
      return `<div class="session-row">
       <div class="sicon">${s.icon}</div>
       <div>
        <h4>Exercice / activité ${s.no} · ${esc(s.title)}</h4>
        <p>${esc(s.type)}${s.objective?" · "+esc(s.objective):""}</p>
        <span class="status-pill ${st==="completed"?"done":st==="started"?"started":""}">${n?`${n} tentative${n>1?"s":""}`:statusText(st)}</span>
       </div>
       <div class="session-action"><a class="btn blue" href="${esc(s.url)}">Travailler</a></div>
      </div>`;
    }).join("")}
   </div>
  </section>`).join("");
 renderSkills("fmn-ex-skill-summary");
}

function renderEvaluations(){
 $("fmn-eval-grid").innerHTML=CFG.sequences.map(seq=>{
   const rows=evalRows(seq.no);
   const latest=rows[0];
   const best=rows.length ? Math.max(...rows.map(r=>Number(r.score)||0)) : null;
   const evalSession=seq.sessions[5];
   return `<article class="evaluation-card">
    <span class="pill">SÉQUENCE ${seq.no}</span>
    <h3>✅ ${esc(evalSession.title)}</h3>
    <p>${esc(seq.title)} · évaluation de synthèse de la séquence.</p>
    <p><strong>Dernière note :</strong> ${latest?esc(latest.score)+" /20":"—"}<br>
       <strong>Meilleure note :</strong> ${best!==null?best+" /20":"—"}<br>
       <strong>Tentatives :</strong> ${rows.length}</p>
    <a class="btn blue" href="${esc(evalSession.url)}">Ouvrir l’évaluation</a>
   </article>`;
 }).join("");
 renderSkills("fmn-eval-skill-summary");
}

function renderSkills(targetId){
 const target=$(targetId);
 if(!target)return;
 const mine=me ? autoStatus.filter(x=>x.student_id===me.id) : [];
 target.innerHTML=`
  <h3>📊 Synthèse des compétences professionnelles</h3>
  <p class="sub" style="text-align:left;margin:0 0 12px">Le positionnement automatique est issu des indicateurs déjà synchronisés dans FigaroMN. Une compétence pratique reste à croiser avec les observations en situation professionnelle.</p>
  <div class="skill-dashboard">
   ${compCodes.map(code=>{
     const s=mine.find(x=>x.competency_code===code);
     let label="À positionner", detail="Aucun indicateur complet";
     if(s){
       label=s.is_complete?(s.acquisition_label||"Positionnée"):"À positionner";
       detail=(s.indicators_positioned||0)+" / "+(s.indicators_required||0)+" indicateurs"+(s.percent!=null?" · "+s.percent+" %":"");
     }
     return `<div class="skill-card"><strong>${code} · ${esc(CFG.competencies[code])}</strong><div>${esc(label)}</div><div class="small">${esc(detail)}</div></div>`;
   }).join("")}
  </div>`;
}

async function safeTable(table,query){
 try{return await FigaroCloud.table(table,query||"");}catch(e){return [];}
}

async function loadCloud(){
 const status=$("fmn-cloud-status");
 try{
   const sess=FigaroCloud.session();
   if(!sess||!sess.access_token){
     location.replace("connexion-eleve.html?level="+encodeURIComponent(CFG.level));
     return;
   }
   me=await FigaroCloud.profile();
   if(!me){
     location.replace("connexion-eleve.html?level="+encodeURIComponent(CFG.level));
     return;
   }
   isTeacher=me.role==="teacher";
   if(!isTeacher){
     if(me.role!=="student" || me.level!==CFG.level || me.archived_at){
       await FigaroCloud.signOut();
       location.replace("connexion-eleve.html?level="+encodeURIComponent(CFG.level));
       return;
     }
   }

   dbSessions=await safeTable("sessions","level=eq."+CFG.level+"&select=id,level,period,session_no,title&order=period.asc,session_no.asc");
   if(!isTeacher){
     progress=await safeTable("session_progress","student_id=eq."+me.id+"&select=student_id,session_id,status,started_at,completed_at,updated_at");
     evaluations=await safeTable("evaluation_results","student_id=eq."+me.id+"&select=student_id,session_id,score,attempt_no,submitted_at&order=submitted_at.desc");
     attempts=await safeTable("activity_attempts","student_id=eq."+me.id+"&select=student_id,session_id,activity_type,attempt_no,score,total,percent,completed_at&order=completed_at.desc");
     autoStatus=await safeTable("competency_auto_status","student_id=eq."+me.id+"&select=student_id,competency_code,percent,acquisition_level,acquisition_label,indicators_positioned,indicators_required,is_complete,updated_at");
   }
   status.textContent=isTeacher
     ?"Mode professeur · consultation de la progression "+CFG.label+"."
     :"Connecté : "+(me.full_name||me.email||"Élève")+" · progression synchronisée.";
   renderIdentity();
   renderProgress();
   renderCourses();
   renderExercises();
   renderEvaluations();
 }catch(e){
   status.textContent="Suivi distant indisponible : "+e.message;
 }
}

document.querySelectorAll("#fmn-level-master .nav button").forEach(b=>b.onclick=()=>view(b.dataset.view));
$("fmn-logout").onclick=async()=>{
 try{await FigaroCloud.signOut();}catch(e){}
 location.href="index.html";
};
$("fmn-prof").onclick=()=>location.href="enseignant.html";

loadCloud();
})();
