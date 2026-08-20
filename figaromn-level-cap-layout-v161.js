
(function(){
"use strict";
window.FIGAROMN_LAYOUT_V161="16.1";
console.info("FigaroMN navigation V16.1 chargée");

const CFG = window.FIGAROMN_LEVEL_CONFIG;
if(!CFG) return;

const $ = id => document.getElementById(id);
const esc = s => String(s==null?"":s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const compCodes = Object.keys(CFG.competencies).sort((a,b)=>Number(a.slice(1))-Number(b.slice(1)));
let selectedSequence=Number(window.FIGAROMN_CURRENT_SEQUENCE||1);
if(!Number.isFinite(selectedSequence)||selectedSequence<1||selectedSequence>7)selectedSequence=1;
window.FIGAROMN_CURRENT_SEQUENCE=selectedSequence;

let me=null, dbSessions=[], progress=[], evaluations=[], attempts=[], autoStatus=[], indicatorResults=[];
let isTeacher=false;

function selectSequence(no){
 const n=Number(no);
 selectedSequence=(Number.isFinite(n)&&n>=1&&n<=7)?n:1;
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


async function validateSessionDone(period,no,button,statusBox){
 if(isTeacher){
  if(statusBox)statusBox.textContent="La validation de séance est réservée au compte élève.";
  return;
 }
 if(!me || !me.id){
  if(statusBox)statusBox.textContent="Compte élève non chargé.";
  return;
 }

 const db=sessionDb(period,no);
 if(!db){
  if(statusBox)statusBox.textContent="Séance Supabase introuvable.";
  return;
 }

 if(button){
  button.disabled=true;
  button.textContent="⏳ Enregistrement…";
 }

 const now=new Date().toISOString();
 const existing=pRow(period,no);

 try{
  if(existing){
   await FigaroCloud.table(
    "session_progress",
    "student_id=eq."+encodeURIComponent(me.id)+"&session_id=eq."+encodeURIComponent(db.id),
    {
     method:"PATCH",
     headers:{Prefer:"return=minimal"},
     body:JSON.stringify({
      status:"completed",
      completed_at:now,
      updated_at:now
     })
    }
   );
   existing.status="completed";
   existing.completed_at=now;
   existing.updated_at=now;
  }else{
   await FigaroCloud.table(
    "session_progress",
    "",
    {
     method:"POST",
     headers:{Prefer:"return=minimal"},
     body:JSON.stringify({
      student_id:me.id,
      session_id:db.id,
      status:"completed",
      started_at:now,
      completed_at:now,
      updated_at:now
     })
    }
   );
   progress.push({
    student_id:me.id,
    session_id:db.id,
    status:"completed",
    started_at:now,
    completed_at:now,
    updated_at:now
   });
  }

  if(button){
   button.textContent="✅ Séance validée";
   button.classList.remove("orange");
   button.classList.add("green");
   button.disabled=true;
  }
  if(statusBox){
   statusBox.textContent="Séance terminée · enregistrée dans le suivi";
   statusBox.classList.add("done");
  }

  renderProgress();
 }catch(err){
  if(button){
   button.disabled=false;
   button.textContent="✅ Valider la séance faite";
  }
  if(statusBox){
   statusBox.textContent="Enregistrement impossible : "+(err.message||"erreur inconnue");
  }
 }
}


function sessionAnswerStorageKey(sequenceNo,sessionNo,itemNo){
 const userKey=(me&&me.id)?me.id:"local";
 return "fmn_session_answer|"+userKey+"|"+CFG.level+"|"+sequenceNo+"|"+sessionNo+"|"+itemNo;
}

function sessionConclusionStorageKey(sequenceNo,sessionNo){
 const userKey=(me&&me.id)?me.id:"local";
 return "fmn_session_conclusion|"+userKey+"|"+CFG.level+"|"+sequenceNo+"|"+sessionNo;
}

function readLocalValue(key){
 try{return localStorage.getItem(key)||"";}catch(e){return "";}
}
function writeLocalValue(key,value){
 try{localStorage.setItem(key,value||"");}catch(e){}
}

function guidedPromptsFromHTML(html){
 const holder=document.createElement("div");
 holder.innerHTML=html||"";
 let prompts=Array.from(holder.querySelectorAll("ol li"))
   .map(x=>x.textContent.trim())
   .filter(Boolean);

 if(!prompts.length){
   prompts=Array.from(holder.querySelectorAll("ul li"))
     .map(x=>x.textContent.trim())
     .filter(Boolean);
 }

 // Ne garder que les premières consignes structurantes pour éviter
 // de transformer une longue liste de cours en questionnaire.
 if(prompts.length>10)prompts=prompts.slice(0,10);

 return prompts;
}

function answerFieldsHTML(sequenceNo,session){
 const prompts=guidedPromptsFromHTML(session.html);
 const fields=(prompts.length?prompts:["Réponse / travail réalisé"]).map((prompt,idx)=>{
   const key=sessionAnswerStorageKey(sequenceNo,session.no,idx+1);
   const saved=readLocalValue(key);
   return `
    <label class="session-answer-field">
     <span><strong>${idx+1}. ${esc(prompt)}</strong></span>
     <textarea
      data-session-answer="${sequenceNo}|${session.no}|${idx+1}"
      placeholder="Écris ta réponse ici…">${esc(saved)}</textarea>
    </label>`;
 }).join("");

 const conclusion=readLocalValue(sessionConclusionStorageKey(sequenceNo,session.no));

 return `
  <section class="session-answer-box" data-answer-box="${sequenceNo}|${session.no}">
   <div class="session-answer-head">
    <div>
     <h3>✍️ Mes réponses – séance ${session.no}</h3>
     <p>Complète les réponses demandées pendant l’activité. La sauvegarde est automatique sur cet appareil.</p>
    </div>
    <button type="button" class="btn blue" data-print-session="${sequenceNo}|${session.no}">
     🖨️ Imprimer / PDF la séance et mes réponses
    </button>
   </div>

   <div class="session-answer-grid">
    ${fields}
   </div>

   <label class="session-answer-field session-conclusion-field">
    <span><strong>Conclusion / compte rendu professionnel</strong></span>
    <textarea
     data-session-conclusion="${sequenceNo}|${session.no}"
     placeholder="Formule ici ta conclusion professionnelle, les contrôles réalisés et le résultat obtenu…">${esc(conclusion)}</textarea>
   </label>

   <div class="session-save-state">💾 Sauvegarde automatique sur cet appareil</div>
  </section>`;
}

function collectSessionPrintData(sequenceNo,sessionNo){
 const box=document.querySelector('[data-answer-box="'+sequenceNo+'|'+sessionNo+'"]');
 if(!box)return null;

 const seq=CFG.sequences.find(x=>Number(x.no)===Number(sequenceNo));
 const courseSet=(window.FIGAROMN_BACPRO_COURSE_DATA||{})[CFG.level]||[];
 const course=courseSet.find(x=>Number(x.no)===Number(sequenceNo));
 const session=course&&course.sessions.find(x=>Number(x.no)===Number(sessionNo));
 if(!session)return null;

 const answers=Array.from(box.querySelectorAll("[data-session-answer]")).map((ta,idx)=>{
  const label=ta.closest(".session-answer-field");
  const prompt=label&&label.querySelector("span")?label.querySelector("span").textContent.trim():"Question "+(idx+1);
  return {prompt:prompt,value:ta.value||""};
 });

 const conclusion=box.querySelector("[data-session-conclusion]");

 return {
  sequenceTitle:seq?seq.title:"Séquence "+sequenceNo,
  sequenceNo:sequenceNo,
  sessionNo:sessionNo,
  sessionTitle:session.title||"",
  objective:session.objective||"",
  answers:answers,
  conclusion:conclusion?conclusion.value:""
 };
}

function printSessionAnswers(sequenceNo,sessionNo){
 const data=collectSessionPrintData(sequenceNo,sessionNo);
 if(!data){alert("Impossible de préparer l’impression de cette séance.");return;}

 const w=window.open("","_blank");
 if(!w){alert("Le navigateur a bloqué la fenêtre d’impression.");return;}

 const answerHtml=data.answers.map(a=>`
  <div class="answer">
   <h3>${esc(a.prompt)}</h3>
   <div class="response">${a.value?esc(a.value).replace(/\n/g,"<br>"):"<em>Réponse non renseignée</em>"}</div>
  </div>`).join("");

 w.document.write(`<!doctype html>
 <html lang="fr">
 <head>
  <meta charset="utf-8">
  <title>${esc(data.sequenceTitle)} – séance ${data.sessionNo}</title>
  <style>
   body{font-family:Arial,sans-serif;color:#18323f;padding:28px;line-height:1.5}
   h1,h2,h3{color:#06283d}
   .meta{border:1px solid #d7e4e8;border-radius:12px;padding:14px;margin:14px 0;background:#f5f9fa}
   .answer{border:1px solid #d7e4e8;border-radius:12px;padding:14px;margin:12px 0;page-break-inside:avoid}
   .answer h3{font-size:15px;margin:0 0 8px}
   .response{min-height:70px;border-top:1px dashed #cddce1;padding-top:10px;white-space:normal}
   .conclusion{border-left:5px solid #4b8f64;background:#f2faf5}
   .footer{margin-top:20px;font-size:12px;color:#607680}
   @media print{body{padding:0}}
  </style>
 </head>
 <body>
  <h1>${esc(data.sequenceTitle)}</h1>
  <div class="meta">
   <strong>Séance ${data.sessionNo} – ${esc(data.sessionTitle)}</strong>
   ${data.objective?`<p><strong>Objectif :</strong> ${esc(data.objective)}</p>`:""}
  </div>

  <h2>Mes réponses</h2>
  ${answerHtml}

  <div class="answer conclusion">
   <h3>Conclusion / compte rendu professionnel</h3>
   <div class="response">${data.conclusion?esc(data.conclusion).replace(/\n/g,"<br>"):"<em>Conclusion non renseignée</em>"}</div>
  </div>

  <div class="footer">FigaroMN · document de travail élève · impression / PDF</div>
 </body>
 </html>`);

 w.document.close();
 setTimeout(()=>w.print(),250);
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
    <section class="flow-course-part ${sessionStatus(seq.no,s.no)==="completed"?"flow-session-done":""}">
     <div class="flow-course-head">
      <div class="flow-session-titleline">
       <span class="pill">SÉANCE ${s.no}</span>
       <span class="status-pill ${sessionStatus(seq.no,s.no)==="completed"?"done":""}" data-session-status="${seq.no}|${s.no}">
        ${sessionStatus(seq.no,s.no)==="completed"?"Séance terminée":"À réaliser"}
       </span>
      </div>
      <h3>${esc(s.title)}</h3>
      ${s.objective?`<p><strong>Objectif :</strong> ${esc(s.objective)}</p>`:""}
     </div>

     <div class="flow-course-resource">${s.html}</div>

     ${!isTeacher?answerFieldsHTML(seq.no,s):""}

     ${!isTeacher?`
      <div class="flow-session-validate">
       <div>
        <strong>Suivi de la séance ${s.no}</strong>
        <p>Valide la séance lorsqu’elle a réellement été réalisée.</p>
       </div>
       <button
        type="button"
        class="btn ${sessionStatus(seq.no,s.no)==="completed"?"green":"orange"}"
        data-validate-session="${seq.no}|${s.no}"
        ${sessionStatus(seq.no,s.no)==="completed"?"disabled":""}>
        ${sessionStatus(seq.no,s.no)==="completed"?"✅ Séance validée":"✅ Valider la séance faite"}
       </button>
      </div>
     `:""}
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

 document.querySelectorAll("#fmn-course-detail [data-session-answer]").forEach(ta=>{
  ta.addEventListener("input",()=>{
   const parts=ta.dataset.sessionAnswer.split("|").map(Number);
   writeLocalValue(sessionAnswerStorageKey(parts[0],parts[1],parts[2]),ta.value);
  });
 });

 document.querySelectorAll("#fmn-course-detail [data-session-conclusion]").forEach(ta=>{
  ta.addEventListener("input",()=>{
   const parts=ta.dataset.sessionConclusion.split("|").map(Number);
   writeLocalValue(sessionConclusionStorageKey(parts[0],parts[1]),ta.value);
  });
 });

 document.querySelectorAll("#fmn-course-detail [data-print-session]").forEach(btn=>{
  btn.onclick=()=>{
   const parts=btn.dataset.printSession.split("|").map(Number);
   printSessionAnswers(parts[0],parts[1]);
  };
 });

 document.querySelectorAll("#fmn-course-detail [data-validate-session]").forEach(btn=>{
  btn.onclick=async()=>{
   const parts=btn.dataset.validateSession.split("|").map(Number);
   const status=document.querySelector('#fmn-course-detail [data-session-status="'+parts[0]+'|'+parts[1]+'"]');
   await validateSessionDone(parts[0],parts[1],btn,status);
   const section=btn.closest(".flow-course-part");
   if(section && btn.disabled)section.classList.add("flow-session-done");
  };
 });

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
 if(target==="tools"){view("tools");return;}
 if(target==="games"){view("games");return;}
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
