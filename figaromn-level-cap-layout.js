
(function(){
"use strict";

const CFG = window.FIGAROMN_LEVEL_CONFIG;
if(!CFG) return;

const $ = id => document.getElementById(id);
const esc = s => String(s==null?"":s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const compCodes = Object.keys(CFG.competencies).sort((a,b)=>Number(a.slice(1))-Number(b.slice(1)));
let selectedSequence=Number(window.FIGAROMN_CURRENT_SEQUENCE||1);
if(!Number.isFinite(selectedSequence)||selectedSequence<1||selectedSequence>6)selectedSequence=1;
window.FIGAROMN_CURRENT_SEQUENCE=selectedSequence;

let me=null, dbSessions=[], progress=[], evaluations=[], attempts=[], autoStatus=[], indicatorResults=[];
let isTeacher=false;

function selectSequence(no){
 const n=Number(no);
 selectedSequence=(Number.isFinite(n)&&n>=1&&n<=6)?n:1;
 window.FIGAROMN_CURRENT_SEQUENCE=selectedSequence;
 return selectedSequence;
}

function openExercisesSelected(){
 const n=selectSequence(selectedSequence);

 // Toujours changer de vue immédiatement.
 view("exercises");

 try{
  if(window.FigaroBacAuto && typeof window.FigaroBacAuto.openExercisesForSequence==="function"){
    window.FigaroBacAuto.openExercisesForSequence(n);
  }else{
    const box=$("fmn-exercise-grid");
    if(box)box.innerHTML='<div class="content-box"><strong>⏳ Initialisation des exercices…</strong><p>Recharge la page si ce message reste affiché.</p></div>';
  }
 }catch(err){
  const box=$("fmn-exercise-grid");
  if(box)box.innerHTML='<div class="content-box"><strong>⚠️ Erreur d’ouverture des exercices</strong><p>'+esc(err.message)+'</p></div>';
 }
}

function openEvaluationsSelected(){
 const n=selectSequence(selectedSequence);

 view("evaluations");

 try{
  if(window.FigaroBacAuto && typeof window.FigaroBacAuto.openEvaluationsForSequence==="function"){
    window.FigaroBacAuto.openEvaluationsForSequence(n);
  }else{
    const box=$("fmn-eval-grid");
    if(box)box.innerHTML='<div class="content-box"><strong>⏳ Initialisation des évaluations…</strong><p>Recharge la page si ce message reste affiché.</p></div>';
  }
 }catch(err){
  const box=$("fmn-eval-grid");
  if(box)box.innerHTML='<div class="content-box"><strong>⚠️ Erreur d’ouverture de l’évaluation</strong><p>'+esc(err.message)+'</p></div>';
 }
}

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
     <p>${done} / 6 séances terminées</p>
     <div class="sequence-progress"><span style="width:${pct}%"></span></div>
     <span class="open-hint">Ouvrir la séquence →</span>
    </span>
   </button>`;
 }).join("");
 grid.querySelectorAll(".step").forEach(b=>b.onclick=()=>openCourse(selectSequence(b.dataset.seq)));
}

function renderCourses(){
 $("fmn-course-grid").innerHTML=CFG.sequences.map(seq=>`
  <article class="menu-card">
   <div>
    <div class="top-icon">📘</div>
    <span class="pill">SÉQUENCE ${seq.no}</span>
    <h3>${esc(seq.title)}</h3>
    <p>${seq.sessions.map(s=>esc(s.title)).slice(0,3).join(" · ")}…</p>
   </div>
   <div class="actions"><button class="btn blue open-course" data-seq="${seq.no}" type="button">Ouvrir le cours</button></div>
  </article>`).join("");
 document.querySelectorAll(".open-course").forEach(b=>b.onclick=()=>openCourse(selectSequence(b.dataset.seq)));
}

function openCourse(seqNo){
 selectedSequence=selectSequence(seqNo);
 const seq=CFG.sequences.find(x=>Number(x.no)===selectedSequence);
 const courseSet=(window.FIGAROMN_BACPRO_COURSE_DATA||{})[CFG.level]||[];
 const course=courseSet.find(x=>Number(x.no)===selectedSequence);
 if(!seq||!course)return;

 const userKey=(me&&me.id)?me.id:"local";
 const noteKey="fmn_course_note|"+userKey+"|"+CFG.level+"|"+selectedSequence;
 const doneKey="fmn_course_done|"+userKey+"|"+CFG.level+"|"+selectedSequence;
 let savedNote="",courseDone=false;
 try{savedNote=localStorage.getItem(noteKey)||"";courseDone=localStorage.getItem(doneKey)==="1";}catch(e){}

 const comps=[...new Set(course.sessions.flatMap(s=>s.comps||[]))];
 $("fmn-course-detail").innerHTML=`
  <div class="content-head">
   <div>
    <span class="pill">SÉQUENCE ${seq.no}</span>
    <h2>Séquence ${seq.no} – ${esc(seq.title)}</h2>
    <p>Le cours complet de la séquence est affiché dans cette page.</p>
   </div>
   <button class="btn light" id="fmn-back-courses" type="button">← Mes cours</button>
  </div>

  <div class="content-box flow-course">
   <div class="info"><strong>Compétences travaillées :</strong> ${comps.length?comps.join(" · "):"—"}</div>

   ${course.sessions.map(s=>`
    <section class="flow-course-part">
     <div class="flow-course-head">
      <span class="pill">SÉANCE ${s.no}</span>
      <h3>${esc(s.title)}</h3>
      ${s.objective?`<p><strong>Objectif :</strong> ${esc(s.objective)}</p>`:""}
     </div>
     <div class="flow-course-resource">${s.html}</div>
    </section>
   `).join("")}

   <section class="flow-note">
    <h3>✍️ Ma synthèse personnelle</h3>
    <textarea id="fmn-course-note" placeholder="Écris ici ce que tu dois retenir…">${esc(savedNote)}</textarea>
    <div class="small">💾 Sauvegarde automatique sur cet appareil</div>
   </section>

   <div class="actions flow-actions">
    <button type="button" class="btn green" id="fmn-course-done">${courseDone?"✅ Cours terminé":"✅ Marquer le cours terminé"}</button>
    <button type="button" class="btn blue" id="fmn-course-print">🖨️ Imprimer / Enregistrer en PDF</button>
   </div>

   <div class="exercise-to-eval">
    <button type="button" class="btn orange" id="fmn-course-to-ex">📝 Passer aux exercices de cette séquence →</button>
    <small>Les exercices restent dans FigaroMN et alimentent automatiquement les indicateurs et compétences.</small>
   </div>
  </div>`;

 view("course-detail");
 $("fmn-back-courses").onclick=()=>view("courses");
 $("fmn-course-note").addEventListener("input",e=>{try{localStorage.setItem(noteKey,e.target.value);}catch(err){}});
 $("fmn-course-done").onclick=()=>{try{localStorage.setItem(doneKey,"1");}catch(err){};$("fmn-course-done").textContent="✅ Cours terminé";};
 $("fmn-course-print").onclick=()=>window.print();
 $("fmn-course-to-ex").onclick=()=>openExercisesSelected();
}


function sessionAttemptRows(period,no){
 const db=sessionDb(period,no);
 if(!db||!me)return [];
 return attempts.filter(x=>x.student_id===me.id&&x.session_id===db.id)
   .sort((a,b)=>new Date(a.completed_at||0)-new Date(b.completed_at||0));
}

function note20FromAttempt(a){
 if(!a)return null;
 if(a.percent!=null && isFinite(Number(a.percent))) return Math.round((Number(a.percent)/5)*10)/10;
 if(Number(a.total)>0) return Math.round((Number(a.score)/Number(a.total)*20)*10)/10;
 return null;
}

function fr(v){
 if(v==null || !isFinite(Number(v)))return "—";
 return (Math.round(Number(v)*10)/10).toLocaleString("fr-FR");
}

function acquisitionFromPercent(pct){
 if(pct==null || !isFinite(Number(pct)))return {label:"À positionner",cls:"skill-wait"};
 pct=Number(pct);
 if(pct<50)return {label:"Non acquis",cls:"skill-na"};
 if(pct<70)return {label:"En cours d’acquisition",cls:"skill-eca"};
 if(pct<85)return {label:"Acquis",cls:"skill-acq"};
 return {label:"Maîtrisé",cls:"skill-mait"};
}

function sessionCompPercent(period,no,code){
 const db=sessionDb(period,no);
 if(!db||!me)return null;
 const rows=indicatorResults.filter(x=>
   x.student_id===me.id &&
   x.session_id===db.id &&
   x.competency_code===code
 );
 const total=rows.reduce((s,x)=>s+Number(x.question_count||0),0);
 const good=rows.reduce((s,x)=>s+Number(x.correct_count||0),0);
 return total?Math.round(good/total*100):null;
}

function exerciseSkillStatusHTML(seq,session){
 const comps=(session.comps||[]).slice();
 if(!comps.length)return "";
 return `<div class="exercise-skill-status">
  <strong>📊 Niveau d’acquisition</strong>
  ${comps.map(code=>{
    const pct=sessionCompPercent(seq.no,session.no,code);
    const acq=acquisitionFromPercent(pct);
    return `<div class="exercise-skill-line">
      <span><strong style="display:inline">${esc(code)}</strong> – ${esc(CFG.competencies[code]||"")}</span>
      <span class="skill-badge ${acq.cls}">${esc(acq.label)}${pct!=null?" · "+pct+" %":""}</span>
    </div>`;
  }).join("")}
 </div>`;
}

function evaluationSkillStatusHTML(seq,session){
 const comps=(session.comps||[]).slice();
 if(!comps.length)return "";
 return `<div class="exercise-skill-status">
  <strong>📊 Niveau d’acquisition</strong>
  ${comps.map(code=>{
    const s=autoStatus.find(x=>x.student_id===me.id&&x.competency_code===code);
    const label=s?(s.is_complete?(s.acquisition_label||"À positionner"):"À positionner"):"À positionner";
    const pct=s&&s.percent!=null?Number(s.percent):null;
    const acq=pct==null?{cls:"skill-wait"}:acquisitionFromPercent(pct);
    return `<div class="exercise-skill-line">
      <span><strong style="display:inline">${esc(code)}</strong> – ${esc(CFG.competencies[code]||"")}</span>
      <span class="skill-badge ${acq.cls}">${esc(label)}${pct!=null?" · "+fr(pct)+" %":""}</span>
    </div>`;
  }).join("")}
 </div>`;
}

function bestAttempt(rows){
 if(!rows.length)return null;
 return rows.slice().sort((a,b)=>Number(b.percent||0)-Number(a.percent||0))[0];
}

function showBacAttemptHistory(kind,seq,session){
 const rows=kind==="evaluation" ? evalRows(seq.no).slice().sort((a,b)=>new Date(a.submitted_at||0)-new Date(b.submitted_at||0)) : sessionAttemptRows(seq.no,session.no);
 if(!rows.length){alert("Aucune tentative enregistrée.");return;}

 const notes=rows.map(r=>kind==="evaluation"?Number(r.score||0):note20FromAttempt(r)).filter(x=>x!=null);
 const best=notes.length?Math.max(...notes):null;
 const last=notes.length?notes[notes.length-1]:null;

 const overlay=document.createElement("div");
 overlay.className="history-overlay";
 overlay.setAttribute("role","dialog");
 overlay.setAttribute("aria-modal","true");
 overlay.innerHTML=`
  <div class="history-dialog">
   <div class="history-head">
    <div><h2>📚 Historique complet</h2><p>${esc(session.title)}</p></div>
    <button type="button" class="history-close">✕ Fermer</button>
   </div>
   <div class="history-body">
    <div class="history-summary">
     <div class="history-stat">Tentatives<strong>${rows.length}</strong></div>
     <div class="history-stat">Meilleure note<strong>${best!=null?fr(best)+" / 20":"—"}</strong></div>
     <div class="history-stat">Dernière note<strong>${last!=null?fr(last)+" / 20":"—"}</strong></div>
    </div>
    <div class="skill-note"><strong>Suivi :</strong> toutes les tentatives restent conservées dans FigaroMN et dans le suivi professeur.</div>
    <div class="table-wrap"><table class="skill-table">
     <thead><tr><th>Tentative</th><th>Date</th><th>Score</th><th>Réussite</th><th>Note /20</th></tr></thead>
     <tbody>
      ${rows.map((r,i)=>{
        const note=kind==="evaluation"?Number(r.score||0):note20FromAttempt(r);
        const score=kind==="evaluation"?"—":`${fr(r.score)} / ${fr(r.total)}`;
        const pct=kind==="evaluation"?(Number(r.score||0)*5):Number(r.percent||0);
        const date=r.submitted_at||r.completed_at;
        return `<tr><td>${i+1}</td><td>${date?new Date(date).toLocaleString("fr-FR"):"—"}</td><td>${score}</td><td>${fr(pct)} %</td><td><strong>${note!=null?fr(note)+" / 20":"—"}</strong></td></tr>`;
      }).join("")}
     </tbody>
    </table></div>
   </div>
  </div>`;
 document.querySelector("#fmn-level-master").appendChild(overlay);
 const close=()=>overlay.remove();
 overlay.querySelector(".history-close").onclick=close;
 overlay.onclick=e=>{if(e.target===overlay)close();};
}

function printSessionPage(url){
 const w=window.open(url,"_blank");
 if(!w){alert("Le navigateur a bloqué la fenêtre d’impression.");return;}
 try{
   w.addEventListener("load",()=>setTimeout(()=>w.print(),350),{once:true});
 }catch(e){}
}

function openExerciseWithRedo(seq,session){
 const rows=sessionAttemptRows(seq.no,session.no);
 if(rows.length){
   const code=prompt("Code enseignant pour refaire l’exercice :");
   if(code===null)return;
   if(code.trim().toLowerCase()!==String(CFG.redoExerciseCode||"refaire").toLowerCase()){
     alert("Code incorrect.");
     return;
   }
 }
 location.href=session.url+(session.url.includes("?")?"&":"?")+"redo=1";
}

function renderExercises(){
 if(window.FIGAROMN_BACPRO_AUTO_ACTIVE)return;
 $("fmn-exercise-grid").innerHTML=CFG.sequences.map(seq=>{
   const finished=seq.sessions.filter(s=>sessionAttemptRows(seq.no,s.no).length>0).length;
   return `<details class="exercise-course" open data-exercise-course-index="${seq.no-1}">
    <summary>
     <span class="course-icon">⛵</span>
     <span><strong>Séquence ${seq.no} – ${esc(seq.title)}</strong><small>6 exercices dans cette séquence</small></span>
     <span class="course-count">${finished} / 6 terminé${finished>1?"s":""}</span>
    </summary>
    <div class="situation-grid">
     ${seq.sessions.map(session=>{
       const rows=sessionAttemptRows(seq.no,session.no);
       const best=bestAttempt(rows);
       const last=rows.length?rows[rows.length-1]:null;
       const lastNote=note20FromAttempt(last);
       const comps=(session.comps||[]);
       return `<article class="situation-card">
        <div>
         <span class="situation-label">Situation ${session.no}</span>
         <h3>${esc(session.title)}</h3>
         <p class="situation-context">${esc(session.objective||session.type||"Activité formative")}</p>
         <div style="margin-top:9px">
          ${comps.length?`<span class="pill">${esc(comps.join(" · "))}</span> `:""}
          <span class="pill">${best?`Meilleur score : ${fr(best.score)}/${fr(best.total)}`:"Non réalisé"}</span>
          <span class="pill">Tentatives : ${rows.length}</span>
          ${lastNote!=null?`<span class="pill">Dernière note : ${fr(lastNote)}/20</span>`:""}
         </div>
         ${exerciseSkillStatusHTML(seq,session)}
        </div>
        <div class="actions">
         ${rows.length
          ? `<button type="button" class="btn light" disabled>✅ Exercice terminé</button>
             <button type="button" class="btn red" data-bac-redo-ex="${seq.no}|${session.no}">🔁 Refaire l’exercice</button>
             <button type="button" class="btn blue" data-bac-hist-ex="${seq.no}|${session.no}">📚 Historique complet (${rows.length})</button>`
          : `<a class="btn green" href="${esc(session.url)}">Faire l’exercice</a>`}
         <button type="button" class="btn light" data-bac-print-ex="${seq.no}|${session.no}">🖨️ Imprimer l’exercice</button>
         ${rows.length?`<button type="button" class="btn blue" data-bac-print-last="${seq.no}|${session.no}">🖨️ PDF dernière tentative</button>`:""}
        </div>
       </article>`;
     }).join("")}
    </div>
    <div class="exercise-to-eval">
     <button type="button" class="btn orange" data-go-bac-eval="${seq.no}">✅ Aller à l’évaluation de la séquence ${seq.no}</button>
     <small>L’évaluation est protégée par un code enseignant.</small>
    </div>
   </details>`;
 }).join("");

 const root=$("fmn-exercise-grid");
 root.querySelectorAll("[data-bac-redo-ex]").forEach(b=>b.onclick=()=>{
   const [sn,en]=b.dataset.bacRedoEx.split("|").map(Number);
   const seq=CFG.sequences.find(x=>x.no===sn),session=seq.sessions.find(x=>x.no===en);
   openExerciseWithRedo(seq,session);
 });
 root.querySelectorAll("[data-bac-hist-ex]").forEach(b=>b.onclick=()=>{
   const [sn,en]=b.dataset.bacHistEx.split("|").map(Number);
   const seq=CFG.sequences.find(x=>x.no===sn),session=seq.sessions.find(x=>x.no===en);
   showBacAttemptHistory("exercise",seq,session);
 });
 root.querySelectorAll("[data-bac-print-ex],[data-bac-print-last]").forEach(b=>b.onclick=()=>{
   const raw=b.dataset.bacPrintEx||b.dataset.bacPrintLast;
   const [sn,en]=raw.split("|").map(Number);
   const seq=CFG.sequences.find(x=>x.no===sn),session=seq.sessions.find(x=>x.no===en);
   printSessionPage(session.url);
 });
 root.querySelectorAll("[data-go-bac-eval]").forEach(b=>b.onclick=()=>{
   view("evaluations");
   const target=document.querySelector(`[data-bac-eval-card="${b.dataset.goBacEval}"]`);
   if(target)setTimeout(()=>target.scrollIntoView({behavior:"smooth",block:"center"}),120);
 });
 renderSkills("fmn-ex-skill-summary");
}

function evaluationAccessCode(seqNo){
 return String((CFG.evalCodes||[])[seqNo-1]||"").trim().toLowerCase();
}

function openEvaluation(seq,forceRedo){
 const session=seq.sessions[5];
 if(forceRedo){
   const code=prompt("Code enseignant pour refaire l’évaluation :");
   if(code===null)return;
   if(code.trim().toLowerCase()!==String(CFG.redoEvaluationCode||"evaluation").toLowerCase()){
     alert("Code incorrect.");
     return;
   }
   location.href=session.url+(session.url.includes("?")?"&":"?")+"redo=1";
   return;
 }
 const card=document.querySelector(`[data-bac-eval-card="${seq.no}"]`);
 const input=card&&card.querySelector("input");
 const msg=card&&card.querySelector(".msg");
 const expected=evaluationAccessCode(seq.no);
 if(input && input.value.trim().toLowerCase()===expected){
   msg.textContent="✅ Code correct";
   msg.className="msg ok";
   setTimeout(()=>location.href=session.url,150);
 }else{
   if(msg){msg.textContent="❌ Code incorrect";msg.className="msg badmsg";}
   if(input){input.value="";input.focus();}
 }
}

function renderEvaluations(){
 if(window.FIGAROMN_BACPRO_AUTO_ACTIVE)return;
 $("fmn-eval-grid").innerHTML=CFG.sequences.map(seq=>{
   const rows=evalRows(seq.no).slice().sort((a,b)=>new Date(a.submitted_at||0)-new Date(b.submitted_at||0));
   const session=seq.sessions[5];
   const best=rows.length?Math.max(...rows.map(r=>Number(r.score)||0)):null;
   const last=rows.length?Number(rows[rows.length-1].score||0):null;
   const comps=session.comps||[];
   return `<article class="menu-card" data-bac-eval-card="${seq.no}">
    <div>
     <div class="top-icon">✅</div>
     <h3>Évaluation ${seq.no} – ${esc(seq.title)} – notée sur 20</h3>
     <p>${esc(session.objective||"Évaluation de synthèse de la séquence.")}</p>
     <div style="margin-top:9px">
      <span class="pill">Note /20</span>
      <span class="pill">${rows.length?`Meilleure note : ${fr(best)}/20`:"Non réalisée"}</span>
      <span class="pill">${rows.length?"✅ Évaluation terminée":"Compétences à positionner"}</span>
      <span class="pill">Tentatives : ${rows.length}</span>
      ${last!=null?`<span class="pill">Dernière note : ${fr(last)}/20</span>`:""}
     </div>
     ${comps.length?`<p style="margin-top:10px"><strong>Compétences :</strong> ${esc(comps.join(" · "))}</p>`:""}
     ${evaluationSkillStatusHTML(seq,session)}
    </div>
    ${rows.length
      ? `<div class="actions">
          <button type="button" class="btn light" disabled>✅ Évaluation terminée</button>
          <button type="button" class="btn red" data-bac-redo-eval="${seq.no}">🔁 Refaire l’évaluation</button>
          <button type="button" class="btn blue" data-bac-hist-eval="${seq.no}">📚 Historique complet (${rows.length})</button>
          <button type="button" class="btn blue" data-bac-print-eval="${seq.no}">🖨️ PDF dernière tentative</button>
         </div>`
      : `<div>
          <div class="eval-lock">
           <input type="password" maxlength="20" placeholder="Code enseignant" aria-label="Code d’accès à l’évaluation ${seq.no}">
           <button type="button" class="btn orange" data-bac-unlock-eval="${seq.no}">Accéder</button>
          </div>
          <div class="msg" aria-live="polite"></div>
         </div>`}
   </article>`;
 }).join("");

 const root=$("fmn-eval-grid");
 root.querySelectorAll("[data-bac-unlock-eval]").forEach(b=>b.onclick=()=>{
   const seq=CFG.sequences.find(x=>x.no===Number(b.dataset.bacUnlockEval));
   openEvaluation(seq,false);
 });
 root.querySelectorAll("[data-bac-redo-eval]").forEach(b=>b.onclick=()=>{
   const seq=CFG.sequences.find(x=>x.no===Number(b.dataset.bacRedoEval));
   openEvaluation(seq,true);
 });
 root.querySelectorAll("[data-bac-hist-eval]").forEach(b=>b.onclick=()=>{
   const seq=CFG.sequences.find(x=>x.no===Number(b.dataset.bacHistEval));
   showBacAttemptHistory("evaluation",seq,seq.sessions[5]);
 });
 root.querySelectorAll("[data-bac-print-eval]").forEach(b=>b.onclick=()=>{
   const seq=CFG.sequences.find(x=>x.no===Number(b.dataset.bacPrintEval));
   printSessionPage(seq.sessions[5].url);
 });
 root.querySelectorAll(".eval-lock input").forEach(input=>input.addEventListener("keydown",e=>{
   if(e.key==="Enter"){
     e.preventDefault();
     const card=input.closest("[data-bac-eval-card]");
     const seq=CFG.sequences.find(x=>x.no===Number(card.dataset.bacEvalCard));
     openEvaluation(seq,false);
   }
 }));
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
     indicatorResults=await safeTable("indicator_results","student_id=eq."+me.id+"&select=student_id,session_id,competency_code,indicator_index,indicator_label,correct_count,question_count,percent,completed_at&order=completed_at.desc");
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

document.querySelectorAll("#fmn-level-master .nav button").forEach(b=>b.onclick=()=>{
 const target=b.dataset.view;
 if(target==="home"){view("home");return;}
 if(target==="courses"){renderCourses();view("courses");return;}
 if(target==="exercises"){openExercisesSelected();return;}
 if(target==="evaluations"){openEvaluationsSelected();return;}
});
$("fmn-logout").onclick=async()=>{
 try{await FigaroCloud.signOut();}catch(e){}
 location.href="index.html";
};
$("fmn-prof").onclick=()=>location.href="enseignant.html";


/* Délégation de clics : évite qu'un re-rendu des cartes perde ses boutons. */
document.getElementById("fmn-level-master").addEventListener("click",function(e){
 const courseBtn=e.target.closest(".open-course");
 if(courseBtn){
   e.preventDefault();
   openCourse(selectSequence(courseBtn.dataset.seq));
   return;
 }
 const step=e.target.closest("#fmn-progress-grid .step");
 if(step){
   e.preventDefault();
   openCourse(selectSequence(step.dataset.seq));
 }
});


window.FigaroMNLevelFlow={
 openCourse:function(no){openCourse(selectSequence(no));},
 exercises:function(no){if(no)selectSequence(no);openExercisesSelected();},
 evaluations:function(no){if(no)selectSequence(no);openEvaluationsSelected();},
 home:function(){view("home");},
 courses:function(){renderCourses();view("courses");}
};

loadCloud();
})();
