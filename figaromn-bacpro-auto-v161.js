(function(){
"use strict";
window.FIGAROMN_BUILD_V161="16.1";
console.info("FigaroMN Bac Pro moteur V16.1 chargé");

var root=document.getElementById("fmn-level-master");
if(!root || !window.FIGAROMN_LEVEL_CONFIG || !window.FIGAROMN_BACPRO_AUTO_DATA || !window.FigaroCloud)return;

var CFG=window.FIGAROMN_LEVEL_CONFIG;
var ALL=window.FIGAROMN_BACPRO_AUTO_DATA;
var DATA=ALL.levels[CFG.level];
if(!DATA)return;

/* Séquence actuellement sélectionnée dans le parcours Bac Pro.
   Cette variable doit exister avant le premier rendu Exercices/Évaluations. */
var activeSequence=Number(window.FIGAROMN_CURRENT_SEQUENCE||1);
if(!isFinite(activeSequence) || activeSequence<1 || activeSequence>7)activeSequence=1;
window.FIGAROMN_CURRENT_SEQUENCE=activeSequence;

var state={
 profile:null,
 sessions:[],
 attempts:[],
 indicators:[],
 auto:[],
 evalResults:[]
};

function $(id){return document.getElementById(id);}
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c];});}
function fr(v){if(v==null||!isFinite(Number(v)))return "—";return (Math.round(Number(v)*10)/10).toLocaleString("fr-FR");}
function note20(score,total){
 score=Number(score||0);
 total=Number(total||0);
 if(total<=0)return 0;
 return Math.round((score/total*20)*10)/10;
}

function levelInfo(pct){
 if(pct==null || !isFinite(Number(pct))){
  return {level:0,label:"À positionner",cls:"skill-wait"};
 }
 pct=Number(pct);
 if(pct<50)return {level:1,label:"Non acquis",cls:"skill-na"};
 if(pct<70)return {level:2,label:"En cours d’acquisition",cls:"skill-eca"};
 if(pct<85)return {level:3,label:"Acquis",cls:"skill-acq"};
 return {level:4,label:"Maîtrisé",cls:"skill-mait"};
}
function show(name){
 document.querySelectorAll("#fmn-level-master .main-view").forEach(function(s){s.classList.add("hidden");});
 var el=$("fmn-view-"+name);if(el)el.classList.remove("hidden");
 document.querySelectorAll("#fmn-level-master .nav button").forEach(function(b){b.classList.toggle("active",b.dataset.view===name);});
 window.scrollTo({top:0,behavior:"smooth"});
}
function dbSession(seq,no){
 return state.sessions.find(function(s){return Number(s.period)===Number(seq)&&Number(s.session_no)===Number(no);});
}
function sessionIds(){return state.sessions.map(function(s){return s.id;});}
function attemptRows(kind,seq,no){
 var db=dbSession(seq,no);if(!db||!state.profile)return [];
 return state.attempts.filter(function(a){
  return a.student_id===state.profile.id &&
    a.session_id===db.id &&
    a.activity_type===kind &&
    a.details && a.details.engine==="bacpro_auto_v11";
 }).sort(function(a,b){return new Date(a.completed_at||0)-new Date(b.completed_at||0);});
}
function evalRows(seq){
 return attemptRows("evaluation",seq,6);
}
function bestAttempt(rows){
 if(!rows.length)return null;
 return rows.slice().sort(function(a,b){return Number(b.percent||0)-Number(a.percent||0);})[0];
}
function indicatorRowsForAttemptIds(ids){
 var set={};ids.forEach(function(id){set[id]=true;});
 return state.indicators.filter(function(r){return set[r.attempt_id];});
}
function aggregateIndicators(kind,filterFn){
 if(!state.profile)return {};
 var attempts=state.attempts.filter(function(a){
  return a.student_id===state.profile.id &&
    a.activity_type===kind &&
    a.details && a.details.engine==="bacpro_auto_v11" &&
    (!filterFn || filterFn(a));
 });
 var ids=attempts.map(function(a){return a.id;});
 var rows=indicatorRowsForAttemptIds(ids);
 var out={};
 rows.forEach(function(r){
  var c=r.competency_code, idx=Number(r.indicator_index)-1;
  if(!out[c])out[c]={};
  if(!out[c][idx])out[c][idx]={good:0,total:0};
  out[c][idx].good+=Number(r.correct_count)||0;
  out[c][idx].total+=Number(r.question_count)||0;
 });
 return out;
}
function competenceFromAggregate(agg,code){
 var criteria=ALL.criteria[code]||[], pcts=[], positioned=0;
 for(var i=0;i<criteria.length;i++){
  var r=agg[code]&&agg[code][i];
  if(r&&r.total>0){pcts.push(Math.round(r.good/r.total*1000)/10);positioned++;}
 }
 if(!pcts.length)return {pct:null,positioned:0,required:criteria.length,complete:false,level:levelInfo(null)};
 var avg=Math.round((pcts.reduce(function(a,b){return a+b;},0)/pcts.length)*10)/10;
 var complete=positioned>=criteria.length&&criteria.length>0;
 return {pct:avg,positioned:positioned,required:criteria.length,complete:complete,level:complete?levelInfo(avg):{level:0,label:"À positionner",cls:"skill-wait"}};
}
function indicatorAcquisitionHTML(agg,codes,caption){
 var unique=[];
 (codes||[]).forEach(function(c){if(unique.indexOf(c)===-1)unique.push(c);});
 if(!unique.length)return "";
 return '<div class="indicator-acquisition">'+
  (caption?'<p class="skill-note">'+esc(caption)+'</p>':'')+
  unique.map(function(code){
   var comp=competenceFromAggregate(agg,code);
   var criteria=ALL.criteria[code]||[];
   return '<div class="indicator-comp">'+
    '<div class="indicator-comp-head"><strong>'+esc(code)+' – '+esc(ALL.competencies[code]||"")+'</strong>'+
     '<span class="skill-badge '+comp.level.cls+'">'+esc(comp.level.label)+(comp.pct!==null?' · '+fr(comp.pct)+' %':'')+'</span></div>'+
    '<div class="indicator-list">'+criteria.map(function(label,idx){
      var r=agg[code]&&agg[code][idx],pct=r&&r.total?Math.round(r.good/r.total*1000)/10:null,li=levelInfo(pct);
      return '<div class="indicator-row"><div><strong>'+esc(code)+'-I'+(idx+1)+'</strong> · '+esc(label)+'</div>'+
       '<div>'+(pct===null?'—':(fr(pct)+' % · '+r.good+'/'+r.total))+'</div>'+
       '<span class="skill-badge '+(pct===null?'skill-wait':li.cls)+'">'+esc(pct===null?'À positionner':li.label)+'</span></div>';
    }).join("")+'</div>'+
    '<div class="indicator-synthesis">Synthèse '+esc(code)+' : '+comp.positioned+' / '+comp.required+' indicateurs positionnés'+
      (comp.complete?' · <strong>'+esc(comp.level.label)+' · '+fr(comp.pct)+' %</strong>':' · <strong>À positionner</strong>')+'</div>'+
   '</div>';
  }).join("")+
  '</div>';
}
function activityCounts(kind){
 var list=kind==="exercise"?DATA.exercises:DATA.evaluations;
 var completed=0,attempts=0;
 list.forEach(function(item){
  var rows=kind==="exercise"?attemptRows("exercise",item.sequence,item.situation):evalRows(item.sequence);
  if(rows.length)completed++;
  attempts+=rows.length;
 });
 return {completed:completed,total:list.length,attempts:attempts};
}
function allCodes(){
 var out=[];
 DATA.exercises.forEach(function(e){(e.comps||[]).forEach(function(c){if(out.indexOf(c)===-1)out.push(c);});});
 DATA.evaluations.forEach(function(e){(e.comps||[]).forEach(function(c){if(out.indexOf(c)===-1)out.push(c);});});
 return out.sort(function(a,b){return Number(a.slice(1))-Number(b.slice(1));});
}

function codesForSequence(kind,seq){
 var list=kind==="exercise"
  ? DATA.exercises.filter(function(x){return Number(x.sequence)===Number(seq);})
  : DATA.evaluations.filter(function(x){return Number(x.sequence)===Number(seq);});
 var out=[];
 list.forEach(function(item){
  (item.comps||[]).forEach(function(c){if(out.indexOf(c)===-1)out.push(c);});
 });
 return out.sort(function(a,b){return Number(a.slice(1))-Number(b.slice(1));});
}

function sequenceAttemptFilter(kind,seq){
 return function(a){
  if(kind==="exercise"){
   var ok=false;
   DATA.exercises.filter(function(x){return Number(x.sequence)===Number(seq);}).forEach(function(ex){
    var db=dbSession(ex.sequence,ex.situation);
    if(db && a.session_id===db.id)ok=true;
   });
   return ok;
  }
  var db=dbSession(seq,6);
  return !!(db && a.session_id===db.id);
 };
}

function sequenceActivityCounts(kind,seq){
 var list=kind==="exercise"
  ? DATA.exercises.filter(function(x){return Number(x.sequence)===Number(seq);})
  : DATA.evaluations.filter(function(x){return Number(x.sequence)===Number(seq);});
 var completed=0,attempts=0;
 list.forEach(function(item){
  var rows=kind==="exercise"
   ? attemptRows("exercise",item.sequence,item.situation)
   : evalRows(item.sequence);
  if(rows.length)completed++;
  attempts+=rows.length;
 });
 return {completed:completed,total:list.length,attempts:attempts};
}

function skillCounters(agg,codes){
 var r={mastered:0,acquired:0,progress:0,notAcquired:0,pending:0};
 (codes||[]).forEach(function(code){
  var c=competenceFromAggregate(agg,code);
  if(!c.complete){r.pending++;return;}
  if(c.level.level>=4)r.mastered++;
  else if(c.level.level>=3)r.acquired++;
  else if(c.level.level>=2)r.progress++;
  else r.notAcquired++;
 });
 return r;
}

function kpiSkillsHTML(c){
 return '<div class="summary-kpis">'+
  '<div><span>Maîtrisé</span><strong>'+c.mastered+'</strong></div>'+
  '<div><span>Acquis</span><strong>'+c.acquired+'</strong></div>'+
  '<div><span>En cours</span><strong>'+c.progress+'</strong></div>'+
  '<div><span>Non acquis</span><strong>'+c.notAcquired+'</strong></div>'+
  '<div><span>À positionner</span><strong>'+c.pending+'</strong></div>'+
 '</div>';
}

function printSummaryBlock(targetId,title){
 var el=$(targetId);if(!el)return;
 var w=window.open("","_blank");
 if(!w){alert("Le navigateur a bloqué la fenêtre d’impression.");return;}
 w.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>'+esc(title)+'</title>'+
  '<style>body{font-family:Arial,sans-serif;padding:24px;color:#18323f}h1,h2,h3{color:#06283d}.summary-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.summary-kpis div{border:1px solid #d9e6ea;border-radius:10px;padding:10px;text-align:center}.summary-kpis span{display:block;color:#607680}.summary-kpis strong{font-size:1.4rem}.indicator-comp{border:1px solid #d9e6ea;border-radius:12px;padding:12px;margin:10px 0}.indicator-row{padding:7px 0;border-bottom:1px dashed #d9e6ea}.skill-badge,.pill{display:inline-block;padding:5px 8px;border-radius:999px;background:#eef1f2}</style>'+
  '</head><body><h1>'+esc(title)+'</h1>'+el.innerHTML+'</body></html>');
 w.document.close();
 setTimeout(function(){w.print();},250);
}

function renderSequenceExerciseSummary(seq,targetId){
 var target=$(targetId);if(!target)return;
 var codes=codesForSequence("exercise",seq);
 var agg=aggregateIndicators("exercise",sequenceAttemptFilter("exercise",seq));
 var counts=sequenceActivityCounts("exercise",seq);
 var counters=skillCounters(agg,codes);
 var title=(CFG.sequences.find(function(s){return Number(s.no)===Number(seq);})||{}).title||("Séquence "+seq);

 target.className="skill-dashboard sequence-summary";
 target.innerHTML=
  '<h3>📊 Bilan de la séquence '+seq+' – exercices</h3>'+
  '<p><strong>'+counts.completed+' / '+counts.total+' exercices réalisés · '+counts.attempts+' tentative'+(counts.attempts>1?"s":"")+' enregistrée'+(counts.attempts>1?"s":"")+'.</strong></p>'+
  '<p>Cette synthèse utilise uniquement les exercices de la séquence <strong>'+esc(title)+'</strong>.</p>'+
  '<div class="method-box"><strong>🧮 Calcul automatique</strong><br>'+
   'Question → indicateur → pourcentage de l’indicateur → compétence.<br>'+
   'Toutes les tentatives des exercices de cette séquence sont prises en compte.</div>'+
  '<button type="button" class="btn blue summary-print" id="print-seq-ex-summary">🖨️ Imprimer / PDF – bilan de la séquence</button>'+
  kpiSkillsHTML(counters)+
  indicatorAcquisitionHTML(agg,codes,
   'Synthèse des exercices de la séquence '+seq+' uniquement. Un indicateur sans résultat reste « À positionner ».')+
  '<div class="exercise-to-eval">'+
   '<button type="button" class="btn orange" id="summary-go-eval">✅ Passer à l’évaluation de la séquence '+seq+' →</button>'+
   '<small>L’évaluation complétera les mêmes indicateurs et calculera en parallèle une note sur 20.</small>'+
  '</div>';

 $("print-seq-ex-summary").onclick=function(){printSummaryBlock(targetId,"Bilan exercices – Séquence "+seq+" – "+title);};
 $("summary-go-eval").onclick=function(){openEvaluationsForSequence(seq);};
}

function evaluationNoteStats(seq){
 var rows=evalRows(seq);
 if(!rows.length)return {attempts:0,last:null,best:null};
 var notes=rows.map(function(r){return note20(r.score,r.total);});
 return {attempts:rows.length,last:notes[notes.length-1],best:Math.max.apply(null,notes)};
}

function globalEvaluationNoteStats(){
 var latestPerEval=[],allNotes=[],attempts=0,completed=0;
 DATA.evaluations.forEach(function(ev){
  var rows=evalRows(ev.sequence);
  if(rows.length){
   completed++;
   attempts+=rows.length;
   var notes=rows.map(function(r){return note20(r.score,r.total);});
   allNotes=allNotes.concat(notes);
   latestPerEval.push(notes[notes.length-1]);
  }
 });
 var avg=latestPerEval.length
  ? Math.round((latestPerEval.reduce(function(a,b){return a+b;},0)/latestPerEval.length)*10)/10
  : null;
 return {
  completed:completed,total:DATA.evaluations.length,attempts:attempts,
  averageLatest:avg,
  best:allNotes.length?Math.max.apply(null,allNotes):null
 };
}

function renderEvaluationSummaries(seq,targetId){
 var target=$(targetId);if(!target)return;
 var ev=DATA.evaluations.find(function(x){return Number(x.sequence)===Number(seq);});
 if(!ev){target.innerHTML="";return;}

 var seqCodes=codesForSequence("evaluation",seq);
 var seqAgg=aggregateIndicators("evaluation",sequenceAttemptFilter("evaluation",seq));
 var seqCount=skillCounters(seqAgg,seqCodes);
 var note=evaluationNoteStats(seq);

 var globalAgg=aggregateIndicators("evaluation");
 var globalCodes=allCodes();
 var globalCount=skillCounters(globalAgg,globalCodes);
 var gs=globalEvaluationNoteStats();

 target.className="evaluation-summaries";
 target.innerHTML=
  '<section class="skill-dashboard sequence-summary" id="eval-sequence-summary">'+
   '<h3>📊 Bilan de l’évaluation – Séquence '+seq+'</h3>'+
   '<p><strong>'+esc(ev.title)+'</strong></p>'+
   '<div class="note-kpis">'+
    '<div><span>Tentatives</span><strong>'+note.attempts+'</strong></div>'+
    '<div><span>Dernière note</span><strong>'+(note.last!==null?fr(note.last)+' /20':'—')+'</strong></div>'+
    '<div><span>Meilleure note</span><strong>'+(note.best!==null?fr(note.best)+' /20':'—')+'</strong></div>'+
   '</div>'+
   '<div class="method-box"><strong>🧮 Deux calculs en parallèle</strong><br>'+
    '1. Note /20 = réponses correctes ÷ nombre total de questions × 20.<br>'+
    '2. Question → indicateur → pourcentage → niveau de compétence.</div>'+
   '<button type="button" class="btn blue" id="print-seq-eval-summary">🖨️ Imprimer / PDF – bilan de cette évaluation</button>'+
   kpiSkillsHTML(seqCount)+
   indicatorAcquisitionHTML(seqAgg,seqCodes,
    'Résultats cumulés de toutes les tentatives de cette évaluation uniquement.')+
  '</section>'+

  '<section class="skill-dashboard global-eval-summary" id="eval-global-summary">'+
   '<h3>📈 Synthèse générale – toutes les évaluations du niveau</h3>'+
   '<p><strong>'+gs.completed+' / '+gs.total+' évaluations réalisées · '+gs.attempts+' tentative'+(gs.attempts>1?"s":"")+' enregistrée'+(gs.attempts>1?"s":"")+'.</strong></p>'+
   '<p>Toutes les anciennes et nouvelles tentatives enregistrées sont prises en compte pour les indicateurs.</p>'+
   '<div class="note-kpis">'+
    '<div><span>Évaluations réalisées</span><strong>'+gs.completed+' / '+gs.total+'</strong></div>'+
    '<div><span>Moyenne des dernières notes</span><strong>'+(gs.averageLatest!==null?fr(gs.averageLatest)+' /20':'—')+'</strong></div>'+
    '<div><span>Meilleure note obtenue</span><strong>'+(gs.best!==null?fr(gs.best)+' /20':'—')+'</strong></div>'+
   '</div>'+
   '<div class="method-box"><strong>📊 Méthode de calcul</strong><br>'+
    'Chaque indicateur reçoit son propre pourcentage. Le pourcentage de la compétence est la moyenne des indicateurs positionnés. '+
    'Une compétence reste « À positionner » tant que tous ses indicateurs requis n’ont pas été travaillés.</div>'+
   '<button type="button" class="btn blue" id="print-global-eval-summary">🖨️ Imprimer / PDF – synthèse générale</button>'+
   kpiSkillsHTML(globalCount)+
   indicatorAcquisitionHTML(globalAgg,globalCodes,
    'Synthèse cumulative de toutes les évaluations déjà réalisées dans ce niveau.')+
  '</section>';

 $("print-seq-eval-summary").onclick=function(){printSummaryBlock("eval-sequence-summary","Bilan évaluation – Séquence "+seq);};
 $("print-global-eval-summary").onclick=function(){printSummaryBlock("eval-global-summary","Synthèse générale des évaluations – "+CFG.label);};
}
function renderGlobalSummary(kind,targetId,extraAgg){
 var target=$(targetId);if(!target)return;
 var agg=extraAgg||aggregateIndicators(kind);
 var counts=activityCounts(kind);
 var label=kind==="exercise"?"exercices":"évaluations";
 target.className="skill-dashboard";
 target.innerHTML=
  '<h3>📊 Synthèse du suivi – indicateurs puis compétences – '+counts.total+' '+label+'</h3>'+
  '<p><strong>'+counts.completed+' / '+counts.total+' '+label+' réalisés · '+counts.attempts+' tentative'+(counts.attempts>1?"s":"")+' enregistrée'+(counts.attempts>1?"s":"")+'.</strong><br>'+
  'Toutes les tentatives enregistrées sont prises en compte automatiquement.</p>'+
  '<div class="method-box"><strong>🧮 Méthode de calcul</strong><br>'+
  'Pourcentage d’un indicateur = bonnes réponses / questions rattachées à cet indicateur × 100.<br>'+
  'Pourcentage de la compétence = moyenne des indicateurs positionnés. La compétence affiche un niveau seulement lorsque tous ses indicateurs requis ont été travaillés.</div>'+
  indicatorAcquisitionHTML(agg,allCodes(),
   'Calcul 100 % automatique à partir des réponses aux '+label+'. Les critères affichés sont ceux du référentiel Bac Pro Maintenance Nautique.')+
  '<div class="teacher-note"><strong>Important :</strong> ce positionnement numérique est automatique. Pour les compétences pratiques, il constitue une preuve de suivi à croiser avec les observations en situation professionnelle avant une validation certificative.</div>';
}
function successIndicatorsPanelHTML(codes){
 var unique=[];(codes||[]).forEach(function(c){if(unique.indexOf(c)===-1)unique.push(c);});
 return '<div class="success-panel"><strong>🎯 Indicateurs de réussite – critères officiels du référentiel Bac Pro</strong>'+
  unique.map(function(code){
   return '<div class="success-comp"><strong>'+esc(code)+' – '+esc(ALL.competencies[code]||"")+'</strong><ul>'+
    (ALL.criteria[code]||[]).map(function(x){return '<li>'+esc(x)+'</li>';}).join("")+
    '</ul><small>Référentiel Bac Pro Maintenance Nautique · page '+esc(ALL.criteriaPages[code]||"")+'</small></div>';
  }).join("")+
  '</div>';
}
function questionIndicatorRefsHTML(q){
 var bits=[];
 Object.keys(q.inds||{}).forEach(function(c){bits.push(c+'-I'+(Number(q.inds[c])+1));});
 return bits.length?'<span class="question-indicator">Indicateur : '+esc(bits.join(" · "))+'</span>':'';
}
function mixedOptions(q){
 var arr=(q.a||[]).map(function(label,i){return {label:label,originalIndex:i};});
 for(var i=arr.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;}
 return arr;
}
function currentAttemptIndicatorAggregate(questions,responses){
 var out={};
 (questions||[]).forEach(function(q,qi){
  var correct=responses[qi]&&responses[qi].correct===true;
  Object.keys(q.inds||{}).forEach(function(code){
   var idx=Number(q.inds[code]);
   if(!out[code])out[code]={};
   if(!out[code][idx])out[code][idx]={good:0,total:0};
   out[code][idx].total++;
   if(correct)out[code][idx].good++;
  });
 });
 return out;
}
async function safeTable(table,query,opts){
 try{return await FigaroCloud.table(table,query||"",opts);}catch(e){return [];}
}

var readyPromise=null;

async function ensureReady(){
 if(state.profile && state.profile.id)return true;
 if(readyPromise)return readyPromise;

 readyPromise=(async function(){
  var p=await FigaroCloud.profile();
  if(!p)throw new Error("Compte élève introuvable.");
  if(p.role!=="student")throw new Error("Ce compte n’est pas un compte élève.");
  if(p.level!==CFG.level)throw new Error("Ce compte n’appartient pas à ce niveau.");
  if(p.archived_at)throw new Error("Ce compte est archivé.");
  state.profile=p;
  await reload();
  var v21Session=state.sessions.find(function(s){
   return Number(s.period)===1 && Number(s.session_no)===1 &&
     String(s.title||"").toLowerCase().indexOf("route du rhum")!==-1;
  });
  if(!v21Session){
   throw new Error("Migration Supabase V21 requise avant d’utiliser les exercices et évaluations.");
  }
  return true;
 })();

 try{
  return await readyPromise;
 }finally{
  readyPromise=null;
 }
}
async function reload(){
 var id=state.profile.id;
 state.sessions=await safeTable("sessions","level=eq."+CFG.level+"&select=id,level,period,session_no,title&order=period.asc,session_no.asc");
 state.attempts=await safeTable("activity_attempts","student_id=eq."+id+"&select=id,student_id,session_id,activity_type,attempt_no,score,total,percent,details,completed_at&order=completed_at.asc");
 state.indicators=await safeTable("indicator_results","student_id=eq."+id+"&select=attempt_id,student_id,session_id,competency_code,indicator_index,indicator_label,correct_count,question_count,percent,completed_at&order=completed_at.asc");
 state.auto=await safeTable("competency_auto_status","student_id=eq."+id+"&select=student_id,competency_code,percent,acquisition_level,acquisition_label,indicators_positioned,indicators_required,is_complete,updated_at");
 state.evalResults=await safeTable("evaluation_results","student_id=eq."+id+"&select=student_id,session_id,score,attempt_no,submitted_at,details&order=submitted_at.asc");
}
async function markSessionCompleted(session){
 try{
  var existing=await FigaroCloud.table("session_progress","student_id=eq."+state.profile.id+"&session_id=eq."+session.id+"&select=student_id,session_id,status");
  var body={status:"completed",completed_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  if(existing&&existing[0]){
   await FigaroCloud.table("session_progress","student_id=eq."+state.profile.id+"&session_id=eq."+session.id,{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify(body)});
  }else{
   body.student_id=state.profile.id;body.session_id=session.id;body.started_at=new Date().toISOString();
   await FigaroCloud.table("session_progress","",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify(body)});
  }
 }catch(e){}
}
async function saveAttempt(kind,item,responses,score){
 var seq=item.sequence,no=kind==="exercise"?item.situation:6;
 var session=dbSession(seq,no);
 if(!session)throw new Error("Séance Supabase introuvable.");
 var rows=kind==="exercise"?attemptRows("exercise",seq,no):evalRows(seq);
 var attemptNo=rows.length?Math.max.apply(null,rows.map(function(x){return Number(x.attempt_no)||0;}))+1:1;
 var total=item.questions.length,percent=Math.round(score/total*1000)/10;
 var mapping=item.questions.map(function(q){return {comps:q.comps||[],inds:q.inds||{}};});
 var details={
  engine:"bacpro_auto_v11",
  level:CFG.level,sequence:seq,session_no:no,title:item.title,
  responses:responses,
  mapping:mapping
 };
 var inserted=await FigaroCloud.table("activity_attempts","",{
  method:"POST",headers:{"Prefer":"return=representation"},
  body:JSON.stringify({
   student_id:state.profile.id,session_id:session.id,activity_type:kind,attempt_no:attemptNo,
   score:score,total:total,percent:percent,details:details,completed_at:new Date().toISOString()
  })
 });
 var attempt=Array.isArray(inserted)?inserted[0]:null;
 if(!attempt||!attempt.id)throw new Error("Tentative non enregistrée.");

 var agg={};
 item.questions.forEach(function(q,qi){
  Object.keys(q.inds||{}).forEach(function(code){
   var idx=Number(q.inds[code]);
   var key=code+"|"+idx;
   if(!agg[key])agg[key]={code:code,idx:idx,good:0,total:0};
   agg[key].total++;
   if(responses[qi]&&responses[qi].correct===true)agg[key].good++;
  });
 });
 var indicatorRows=Object.keys(agg).map(function(k){
  var a=agg[k],pct=a.total?Math.round(a.good/a.total*1000)/10:0;
  return {
   attempt_id:attempt.id,student_id:state.profile.id,session_id:session.id,
   competency_code:a.code,indicator_index:a.idx+1,
   indicator_label:(ALL.criteria[a.code]||[])[a.idx]||("Indicateur "+(a.idx+1)),
   correct_count:a.good,question_count:a.total,percent:pct,completed_at:new Date().toISOString()
  };
 });
 if(indicatorRows.length){
  await FigaroCloud.table("indicator_results","",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify(indicatorRows)});
 }
 if(kind==="evaluation"){
  var n20=note20(score,total);
  try{
   await FigaroCloud.table("evaluation_results","",{method:"POST",headers:{"Prefer":"return=minimal"},
    body:JSON.stringify({student_id:state.profile.id,session_id:session.id,score:n20,attempt_no:attemptNo,details:{source:"FigaroMN BacPro Auto V11",engine:"bacpro_auto_v11",raw_score:score,total:total}})});
  }catch(e){}
 }
 await markSessionCompleted(session);
 await reload();
 return {attemptNo:attemptNo,score:score,total:total,percent:percent,note20:note20(score,total)};
}
function printReport(title,item,result,responses){
 var w=window.open("","_blank");if(!w){alert("Le navigateur a bloqué la fenêtre d’impression.");return;}
 var dateTxt=result.completedAt?new Date(result.completedAt).toLocaleString("fr-FR"):"";
 var body='<div class="head"><div><h1>'+esc(title)+'</h1>'+
  '<p><strong>'+esc(CFG.full)+'</strong> · Séquence '+item.sequence+' · Séance '+(item.situation||6)+'</p></div>'+
  '<div class="score">'+fr(result.note20)+' / 20</div></div>'+
  '<div class="info"><p><strong>Élève :</strong> '+esc(state.profile.full_name||state.profile.email||"")+'</p>'+
  (result.attemptNo?'<p><strong>Tentative :</strong> '+esc(result.attemptNo)+'</p>':'')+
  (dateTxt?'<p><strong>Réalisé le :</strong> '+esc(dateTxt)+'</p>':'')+
  '<p><strong>Résultat :</strong> '+fr(result.score)+' / '+fr(result.total)+' · '+fr(result.percent)+' %</p></div>'+
  '<h2>Questions et réponses</h2>'+
  item.questions.map(function(q,i){
   var r=responses[i]||{},choice=r.choice;
   var chosen=(choice==null||!q.a)?"—":q.a[choice];
   var expected=(q.c==null||!q.a)?"—":q.a[q.c];
   var status=r.correct===true;
   return '<div class="q '+(status?'ok':'ko')+'"><div class="qtitle"><strong>'+(i+1)+'. '+esc(q.q)+'</strong><span>'+(status?'✅ Correct':'❌ À revoir')+'</span></div>'+
    '<p><strong>Réponse de l’élève :</strong> '+esc(chosen)+'</p>'+
    '<p><strong>Réponse attendue :</strong> '+esc(expected)+'</p>'+
    '<p class="indicator"><strong>Indicateur :</strong> '+esc(Object.keys(q.inds||{}).map(function(c){return c+"-I"+(Number(q.inds[c])+1);}).join(" · ")||"—")+'</p></div>';
  }).join("")+
  '<p class="foot">Document généré depuis FigaroMN – exercice réalisé et réponses enregistrées.</p>';
 w.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title>'+
  '<style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#18323f;margin:0;font-size:12px}.head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;border-bottom:3px solid #0b4f6c;padding-bottom:10px;margin-bottom:12px}h1{font-size:21px;margin:0 0 5px;color:#06283d}h2{font-size:16px;color:#06283d;margin:18px 0 8px}.head p,.info p{margin:3px 0}.score{white-space:nowrap;background:#0b4f6c;color:#fff;border-radius:10px;padding:10px 14px;font-weight:700;font-size:17px}.info{background:#eef5f7;border-radius:9px;padding:9px 11px;margin-bottom:12px}.q{border:1px solid #d9e6ea;border-left:5px solid #93a7b1;border-radius:9px;padding:9px 11px;margin:8px 0;break-inside:avoid}.q.ok{border-left-color:#2e8b57}.q.ko{border-left-color:#c44}.qtitle{display:flex;justify-content:space-between;gap:12px}.qtitle span{white-space:nowrap;font-weight:700}.q p{margin:6px 0}.indicator{color:#536a76}.foot{margin-top:18px;padding-top:8px;border-top:1px solid #ccd9de;color:#687f89;font-size:10px}@media print{button{display:none}}</style>'+
  '</head><body>'+body+'</body></html>');
 w.document.close();setTimeout(function(){w.focus();w.print();},300);
}
function showHistory(kind,item){
 var rows=kind==="exercise"?attemptRows("exercise",item.sequence,item.situation):evalRows(item.sequence);
 if(!rows.length){alert("Aucune tentative enregistrée.");return;}
 var overlay=document.createElement("div");overlay.className="history-overlay";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");
 var notes=rows.map(function(r){return note20(r.score,r.total);});
 var best=Math.max.apply(null,notes),last=notes[notes.length-1];
 overlay.innerHTML='<div class="history-dialog"><div class="history-head"><div><h2>📚 Historique complet</h2><p>'+esc(item.title)+'</p></div><button type="button" class="history-close">✕ Fermer</button></div>'+
  '<div class="history-body"><div class="history-summary"><div class="history-stat">Tentatives<strong>'+rows.length+'</strong></div><div class="history-stat">Meilleure note<strong>'+fr(best)+' / 20</strong></div><div class="history-stat">Dernière note<strong>'+fr(last)+' / 20</strong></div></div>'+
  rows.map(function(r,i){
   var ids=[r.id],ind=indicatorRowsForAttemptIds(ids),agg={};
   ind.forEach(function(x){var c=x.competency_code,idx=Number(x.indicator_index)-1;if(!agg[c])agg[c]={};agg[c][idx]={good:Number(x.correct_count)||0,total:Number(x.question_count)||0};});
   return '<details class="history-attempt" '+(i===rows.length-1?"open":"")+'><summary>Tentative '+(i+1)+' · '+new Date(r.completed_at).toLocaleString("fr-FR")+' · '+fr(note20(r.score,r.total))+'/20</summary><div class="history-attempt-body">'+
    '<p>Score : <strong>'+fr(r.score)+' / '+fr(r.total)+'</strong> · Réussite : <strong>'+fr(r.percent)+' %</strong></p>'+
    '<button type="button" class="btn blue" data-print-attempt="'+esc(r.id)+'">🖨️ Imprimer cette tentative avec réponses</button>'+
    indicatorAcquisitionHTML(agg,Object.keys(agg),'Résultat de cette tentative.')+'</div></details>';
  }).join("")+'</div></div>';
 root.appendChild(overlay);
 overlay.querySelectorAll("[data-print-attempt]").forEach(function(btn){
  btn.onclick=function(){
   var attemptId=btn.dataset.printAttempt;
   var r=rows.find(function(x){return String(x.id)===String(attemptId);});
   if(!r)return;
   var responses=r.details&&Array.isArray(r.details.responses)?r.details.responses:[];
   printReport("Exercice réalisé – "+item.title,item,{
    attemptNo:Number(r.attempt_no)||1,
    score:Number(r.score)||0,
    total:Number(r.total)||item.questions.length,
    percent:Number(r.percent)||0,
    note20:note20(r.score,r.total),
    completedAt:r.completed_at||""
   },responses);
  };
 });
 function close(){overlay.remove();}
 overlay.querySelector(".history-close").onclick=close;
 overlay.onclick=function(e){if(e.target===overlay)close();};
}
function rebuildExercises(){
 var grid=$("fmn-exercise-grid");if(!grid)return;
 activeSequence=Number(window.FIGAROMN_CURRENT_SEQUENCE);
 if(!isFinite(activeSequence))activeSequence=0;

 if(!state.profile){
  grid.innerHTML='<div class="content-box"><strong>⏳ Chargement des exercices…</strong><p>Connexion au suivi de l’élève en cours.</p></div>';
  return;
 }

 var seqNos=activeSequence===0
  ? CFG.sequences.map(function(s){return Number(s.no);})
  : [activeSequence];

 grid.className="exercise-course-list";
 grid.innerHTML=seqNos.map(function(seqNo){
  var items=DATA.exercises.filter(function(e){return Number(e.sequence)===seqNo;});
  var done=items.filter(function(e){return attemptRows("exercise",e.sequence,e.situation).length>0;}).length;
  var title=(CFG.sequences.find(function(s){return Number(s.no)===seqNo;})||{}).title||("Séquence "+seqNo);

  return '<details class="exercise-course"'+(activeSequence===0?'':' open')+' data-exercise-course-index="'+(seqNo-1)+'">'+
   '<summary><span class="course-icon">⛵</span><span><strong>Séquence '+seqNo+' – '+esc(title)+'</strong>'+
   '<small>6 séances · 1 exercice formatif par séance</small></span>'+
   '<span class="course-count">'+done+' / '+items.length+' terminé'+(done>1?"s":"")+'</span></summary>'+
   '<div class="fmn22-ex-session-list">'+items.map(function(ex){
    var rows=attemptRows("exercise",ex.sequence,ex.situation),best=bestAttempt(rows),last=rows.length?rows[rows.length-1]:null;
    var agg=aggregateIndicators("exercise",function(a){var db=dbSession(ex.sequence,ex.situation);return db&&a.session_id===db.id;});
    return '<details class="fmn22-ex-session-group"><summary class="fmn22-ex-session-head">'+
     '<h4>Séance '+ex.situation+' – '+esc(ex.title)+'</h4>'+
     '<span class="pill">'+(rows.length?'✅ Exercice terminé':'À réaliser')+'</span></summary>'+
     '<div class="fmn22-ex-session-body"><p class="situation-context">'+esc(ex.objective||"")+'</p>'+
     '<span class="pill">'+esc((ex.comps||[]).join(" · "))+'</span> '+
     '<span class="pill">'+(best?'Meilleur score : '+fr(best.score)+'/'+fr(best.total):'Non réalisé')+'</span> '+
     '<span class="pill">Tentatives : '+rows.length+'</span> '+
     (last?'<span class="pill">Dernière note : '+fr(note20(last.score,last.total))+'/20</span>':'')+
     indicatorAcquisitionHTML(agg,ex.comps,'')+
     '<div class="actions">'+
      (rows.length?
       '<button type="button" class="btn light" disabled>✅ Exercice terminé</button>'+
       '<button type="button" class="btn red" data-redo-ex="'+ex.sequence+'|'+ex.situation+'">🔁 Refaire l’exercice</button>'+
       '<button type="button" class="btn blue" data-history-ex="'+ex.sequence+'|'+ex.situation+'">📚 Historique ('+rows.length+')</button>'+
       '<button type="button" class="btn blue" data-print-done-ex="'+ex.sequence+'|'+ex.situation+'">🖨️ Imprimer avec mes réponses</button>':
       '<button type="button" class="btn green" data-open-ex="'+ex.sequence+'|'+ex.situation+'">Faire l’exercice de la séance</button>'+
       '<button type="button" class="btn light" data-print-ex="'+ex.sequence+'|'+ex.situation+'">🖨️ Imprimer l’exercice</button>')+
     '</div></div></details>';
   }).join("")+'</div>'+
  '</details>';
 }).join("");

 bindExerciseButtons();

 // Accordéon des séquences :
 // - entrée par l'onglet Exercices : toutes les séquences sont fermées ;
 // - clic sur une séquence : elle seule s'ouvre ;
 // - arrivée depuis un cours : seule la séquence concernée peut être ouverte.
 var exerciseGroups=grid.querySelectorAll(".exercise-course");
 exerciseGroups.forEach(function(group){
  group.addEventListener("toggle",function(){
   if(!group.open)return;

   // À chaque ouverture d'une séquence, toutes les séances sont fermées.
   group.querySelectorAll(".fmn22-ex-session-group").forEach(function(session){
    session.open=false;
   });

   // Une seule séquence ouverte à la fois.
   exerciseGroups.forEach(function(other){
    if(other!==group)other.open=false;
   });
  });
 });

 if(activeSequence===0){
  renderGlobalSummary("exercise","fmn-ex-skill-summary",null);
 }else{
  renderSequenceExerciseSummary(activeSequence,"fmn-ex-skill-summary");
 }
}
function findExercise(seq,sit){return DATA.exercises.find(function(e){return e.sequence===Number(seq)&&e.situation===Number(sit);});}
function findEval(seq){return DATA.evaluations.find(function(e){return e.sequence===Number(seq);});}
function bindExerciseButtons(){
 var grid=$("fmn-exercise-grid");if(!grid)return;
 grid.querySelectorAll("[data-open-ex]").forEach(function(b){b.onclick=function(){var x=b.dataset.openEx.split("|");openExercise(findExercise(x[0],x[1]),false);};});
 grid.querySelectorAll("[data-redo-ex]").forEach(function(b){b.onclick=function(){var code=prompt("Code enseignant pour refaire l’exercice :");if(code===null)return;if(code.trim().toLowerCase()!==String(DATA.redoExerciseCode||"refaire").toLowerCase()){alert("Code incorrect.");return;}var x=b.dataset.redoEx.split("|");openExercise(findExercise(x[0],x[1]),true);};});
 grid.querySelectorAll("[data-history-ex]").forEach(function(b){b.onclick=function(){var x=b.dataset.historyEx.split("|");showHistory("exercise",findExercise(x[0],x[1]));};});
 grid.querySelectorAll("[data-print-ex]").forEach(function(b){b.onclick=function(){var x=b.dataset.printEx.split("|"),ex=findExercise(x[0],x[1]);printBlankExercise(ex);};});
 grid.querySelectorAll("[data-print-done-ex]").forEach(function(b){b.onclick=function(){var x=b.dataset.printDoneEx.split("|"),ex=findExercise(x[0],x[1]);printCompletedExercise(ex);};});
}
function printCompletedExercise(ex){
 var rows=attemptRows("exercise",ex.sequence,ex.situation);
 if(!rows.length){printBlankExercise(ex);return;}
 var attempt=rows[rows.length-1];
 var responses=attempt.details&&Array.isArray(attempt.details.responses)?attempt.details.responses:[];
 var result={
  attemptNo:Number(attempt.attempt_no)||rows.length,
  score:Number(attempt.score)||0,
  total:Number(attempt.total)||ex.questions.length,
  percent:Number(attempt.percent)||0,
  note20:note20(attempt.score,attempt.total),
  completedAt:attempt.completed_at||""
 };
 printReport("Exercice réalisé – "+ex.title,ex,result,responses);
}

function printBlankExercise(ex){
 var w=window.open("","_blank");if(!w){alert("Le navigateur a bloqué la fenêtre d’impression.");return;}
 var body='<h1>'+esc(ex.title)+'</h1><p><strong>'+esc(CFG.full)+'</strong> · Séquence '+ex.sequence+' · Situation '+ex.situation+'</p><p>'+esc(ex.objective||"")+'</p>'+
  successIndicatorsPanelHTML(ex.comps)+
  ex.questions.map(function(q,i){return '<div class="q"><strong>'+(i+1)+'. '+esc(q.q)+'</strong><br>'+q.a.map(function(a,j){return '☐ '+esc(a);}).join('<br>')+'</div>';}).join("");
 w.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>body{font-family:Arial;padding:24px}.q{border:1px solid #ddd;padding:10px;margin:10px 0}h1{color:#06283d}.success-panel{border:1px solid #d9e6ea;padding:12px}</style></head><body>'+body+'</body></html>');w.document.close();setTimeout(function(){w.print();},250);
}
function openExercise(ex,forceRedo){
 if(!ex)return;
 var rows=attemptRows("exercise",ex.sequence,ex.situation);
 if(rows.length&&!forceRedo){alert("Cet exercice a déjà été réalisé. Pour le refaire, utilise « Refaire l’exercice » et le code enseignant.");rebuildExercises();show("exercises");return;}
 var detail=$("fmn-view-exercise-detail"),score=0,answered=0,responses=[],liveAgg={};
 var qhtml=ex.questions.map(function(q,qi){
  var opts=mixedOptions(q);
  return '<div class="q-card" data-q="'+qi+'"><span class="question-skill">Compétence : '+esc((q.comps||[]).join(" · "))+'</span>'+questionIndicatorRefsHTML(q)+
   '<strong>'+(qi+1)+'. '+esc(q.q)+'</strong><div class="answers">'+opts.map(function(o){return '<button type="button" class="answer" data-a="'+o.originalIndex+'">'+esc(o.label)+'</button>';}).join("")+'</div><div class="feedback hidden"></div></div>';
 }).join("");
 detail.innerHTML='<div class="content-head"><button type="button" class="btn light" id="bac-back-ex">← Retour aux situations</button><span class="pill">Séquence '+ex.sequence+' · Situation '+ex.situation+'</span></div>'+
  '<div class="content-box"><h2>'+esc(ex.title)+'</h2><div class="exercise-intro-box"><strong>Situation professionnelle :</strong> '+esc(ex.objective||ex.title)+'</div>'+
  '<div class="competences"><strong>Compétences travaillées :</strong><br>'+esc((ex.comps||[]).map(function(c){return c+" – "+(ALL.competencies[c]||"");}).join(" · "))+'</div>'+
  successIndicatorsPanelHTML(ex.comps)+
  '<div class="skill-calc-box"><strong>📈 Acquisition 100 % automatique</strong><p>Chaque réponse alimente automatiquement l’indicateur officiel auquel la question est rattachée. Le niveau de compétence est recalculé sans saisie manuelle.</p></div>'+
  '<div class="score">Score : <strong id="bac-ex-score">0 / '+ex.questions.length+'</strong></div>'+
  qhtml+
  '<div id="bac-ex-end" class="result hidden"></div>'+
  '<div class="exercise-skill-summary-bottom"><h3>📊 Synthèse des compétences</h3><div id="bac-ex-live"></div></div></div>';
 $("bac-back-ex").onclick=function(){
  if(window.FIGAROMN_RETURN_SESSION && window.FigaroMNLevelFlow && typeof window.FigaroMNLevelFlow.openCourse==="function"){
    var r=window.FIGAROMN_RETURN_SESSION;
    window.FIGAROMN_RETURN_SESSION=null;
    window.FigaroMNLevelFlow.openCourse(r.sequence,r.session);
    return;
  }
  window.FIGAROMN_CURRENT_SEQUENCE=ex.sequence;activeSequence=ex.sequence;rebuildExercises();show("exercises");
 };
 function updateLive(){
  liveAgg=currentAttemptIndicatorAggregate(ex.questions,responses);
  $("bac-ex-live").innerHTML=indicatorAcquisitionHTML(liveAgg,ex.comps,answered===ex.questions.length?'Résultat final de la tentative.':'Résultat provisoire : les indicateurs évoluent après chaque réponse.');
  renderGlobalSummary("exercise","fmn-ex-skill-summary",null);
 }
 updateLive();
 detail.querySelectorAll(".q-card").forEach(function(card){
  card.onclick=async function(ev){
   var b=ev.target.closest(".answer");if(!b||card.dataset.done==="1")return;
   card.dataset.done="1";
   var qi=Number(card.dataset.q),q=ex.questions[qi],choice=Number(b.dataset.a),correct=choice===q.c;
   card.querySelectorAll(".answer").forEach(function(x){x.disabled=true;if(Number(x.dataset.a)===q.c)x.classList.add("good");});
   if(correct)score++;else b.classList.add("bad");
   responses[qi]={qi:qi,choice:choice,correct:correct};
   answered++;
   var fb=card.querySelector(".feedback");fb.classList.remove("hidden");fb.textContent=correct?"✅ Bonne réponse.":"❌ À revoir. La bonne réponse est indiquée.";
   $("bac-ex-score").textContent=score+" / "+ex.questions.length;
   updateLive();
   if(answered===ex.questions.length){
    var end=$("bac-ex-end");end.classList.remove("hidden");end.innerHTML='<h3>Enregistrement automatique…</h3>';
    try{
     var result=await saveAttempt("exercise",ex,responses,score);
     var agg=currentAttemptIndicatorAggregate(ex.questions,responses);
     end.innerHTML='<h3>Exercice terminé</h3><p>Résultat : <strong>'+score+' / '+ex.questions.length+'</strong> · Note calculée : <span class="note20">'+fr(result.note20)+' / 20</span></p><p>Tentative enregistrée : <strong>n°'+result.attemptNo+'</strong></p>'+
      '<div class="toolbar"><button type="button" class="btn light" disabled>✅ Tentative synchronisée</button><button type="button" class="btn blue" id="bac-pdf-ex">🖨️ Enregistrer en PDF</button><button type="button" class="btn blue" id="bac-history-now">📚 Historique complet</button></div>';
     $("bac-pdf-ex").onclick=function(){printReport("Exercice – "+ex.title,ex,result,responses);};
     $("bac-history-now").onclick=function(){showHistory("exercise",ex);};
     rebuildExercises();rebuildEvaluations();
    }catch(e){end.innerHTML='<h3>Exercice terminé</h3><p class="badmsg">Synchronisation impossible : '+esc(e.message)+'</p>';}
   }
  };
 });
 show("exercise-detail");
}
function rebuildEvaluations(){
 var grid=$("fmn-eval-grid");if(!grid)return;
 activeSequence=Number(window.FIGAROMN_CURRENT_SEQUENCE);
 if(!isFinite(activeSequence))activeSequence=0;

 if(!state.profile){
  grid.innerHTML='<div class="content-box"><strong>⏳ Chargement des évaluations…</strong><p>Connexion au suivi de l’élève en cours.</p></div>';
  return;
 }

 var evals=activeSequence===0
  ? DATA.evaluations.slice().sort(function(a,b){return Number(a.sequence)-Number(b.sequence);})
  : DATA.evaluations.filter(function(x){return Number(x.sequence)===activeSequence;});

 grid.className="evaluation-list";
 if(!evals.length){grid.innerHTML="<p>Aucune évaluation disponible.</p>";return;}

 grid.innerHTML=evals.map(function(ev){
  var rows=evalRows(ev.sequence),best=bestAttempt(rows),last=rows.length?rows[rows.length-1]:null;
  var agg=aggregateIndicators("evaluation",function(a){var db=dbSession(ev.sequence,6);return db&&a.session_id===db.id;});
  return '<article class="menu-card" data-evaluation-index="'+(ev.sequence-1)+'"><div><div class="top-icon">✅</div>'+
   '<span class="pill">SÉQUENCE '+ev.sequence+'</span>'+
   '<h3>'+esc(ev.title)+' – 18 questions notées sur 20</h3><p>'+esc(ev.desc||"")+'</p>'+
   '<span class="pill">18 questions · note /20</span> '+
   '<span class="pill">'+(best?'Meilleure note : '+fr(note20(best.score,best.total))+'/20':'Non réalisée')+'</span> '+
   '<span class="pill">'+(rows.length?'✅ Évaluation terminée':'Compétences à positionner')+'</span> '+
   '<span class="pill">Tentatives : '+rows.length+'</span> '+
   (last?'<span class="pill">Dernière note : '+fr(note20(last.score,last.total))+'/20</span>':'')+
   indicatorAcquisitionHTML(agg,ev.comps,'')+'</div>'+
   (rows.length?
    '<div class="actions"><button type="button" class="btn light" disabled>✅ Évaluation terminée</button>'+
    '<button type="button" class="btn red" data-redo-eval="'+ev.sequence+'">🔁 Refaire l’évaluation</button>'+
    '<button type="button" class="btn blue" data-history-eval="'+ev.sequence+'">📚 Historique complet ('+rows.length+')</button></div>':
    '<div><div class="eval-lock"><input type="password" maxlength="20" placeholder="Code enseignant" aria-label="Code pour '+esc(ev.title)+'">'+
    '<button type="button" class="btn orange" data-unlock-eval="'+ev.sequence+'">Accéder</button></div>'+
    '<div class="msg" aria-live="polite"></div></div>')+
   '</article>';
 }).join("");

 bindEvalButtons();

 if(activeSequence===0){
  var target=$("fmn-eval-skill-summary");
  if(target){
   var globalAgg=aggregateIndicators("evaluation");
   var globalCodes=allCodes();
   var globalCount=skillCounters(globalAgg,globalCodes);
   var gs=globalEvaluationNoteStats();
   target.className="skill-dashboard global-eval-summary";
   target.innerHTML='<h3>📈 Synthèse générale – toutes les évaluations du niveau</h3>'+
    '<p><strong>'+gs.completed+' / '+gs.total+' évaluations réalisées · '+gs.attempts+' tentative'+(gs.attempts>1?"s":"")+'.</strong></p>'+
    '<div class="note-kpis"><div><span>Évaluations réalisées</span><strong>'+gs.completed+' / '+gs.total+'</strong></div>'+
    '<div><span>Moyenne des dernières notes</span><strong>'+(gs.averageLatest!==null?fr(gs.averageLatest)+' /20':'—')+'</strong></div>'+
    '<div><span>Meilleure note</span><strong>'+(gs.best!==null?fr(gs.best)+' /20':'—')+'</strong></div></div>'+
    kpiSkillsHTML(globalCount)+indicatorAcquisitionHTML(globalAgg,globalCodes,'Synthèse cumulative de toutes les évaluations du niveau.');
  }
 }else{
  renderEvaluationSummaries(activeSequence,"fmn-eval-skill-summary");
 }
}
function bindEvalButtons(){
 var grid=$("fmn-eval-grid");if(!grid)return;
 grid.querySelectorAll("[data-unlock-eval]").forEach(function(b){b.onclick=function(){
  var ev=findEval(b.dataset.unlockEval),card=b.closest(".menu-card"),input=card.querySelector("input"),msg=card.querySelector(".msg");
  if(input.value.trim().toLowerCase()===String(ev.code).toLowerCase()){msg.textContent="✅ Code correct";msg.className="msg ok";setTimeout(function(){openEvaluation(ev,false);},120);}else{msg.textContent="❌ Code incorrect";msg.className="msg badmsg";input.value="";input.focus();}
 };});
 grid.querySelectorAll("[data-redo-eval]").forEach(function(b){b.onclick=function(){var code=prompt("Code enseignant pour refaire l’évaluation :");if(code===null)return;if(code.trim().toLowerCase()!==String(DATA.redoEvaluationCode||"evaluation").toLowerCase()){alert("Code incorrect.");return;}openEvaluation(findEval(b.dataset.redoEval),true);};});
 grid.querySelectorAll("[data-history-eval]").forEach(function(b){b.onclick=function(){showHistory("evaluation",findEval(b.dataset.historyEval));};});
}
function openEvaluation(ev,forceRedo){
 if(!ev)return;
 var rows=evalRows(ev.sequence);
 if(rows.length&&!forceRedo){alert("Cette évaluation a déjà été réalisée. Pour la refaire, utilise « Refaire l’évaluation » et le code enseignant.");rebuildEvaluations();show("evaluations");return;}
 var detail=$("fmn-view-evaluation-detail"),current=0,score=0,answered=false,responses=[],liveAgg={},mixed=[];
 detail.innerHTML='<div class="content-head"><button type="button" class="btn light" id="bac-back-eval">← Retour aux évaluations</button><span class="pill">'+esc((ev.comps||[]).join(" · "))+'</span></div>'+
  '<div class="content-box"><h2>'+esc(ev.title)+'</h2><div class="competences"><strong>Compétences évaluées :</strong><br>'+esc((ev.comps||[]).map(function(c){return c+" – "+(ALL.competencies[c]||"");}).join(" · "))+'</div>'+
  successIndicatorsPanelHTML(ev.comps)+
  '<div class="skill-calc-box"><strong>📈 Calcul 100 % automatique</strong><p>Chaque réponse produit deux résultats en parallèle : 1) elle alimente l’indicateur associé pour calculer le pourcentage puis le niveau de compétence ; 2) elle entre dans le calcul de la note de l’évaluation sur 20.</p><p><strong>Note /20 = réponses correctes ÷ nombre total de questions × 20.</strong></p></div>'+
  '<div class="eval-top"><span id="bac-eval-counter">Question 1 / '+ev.questions.length+'</span><span id="bac-eval-score">Score : 0 / '+ev.questions.length+' · Note : 0,0 /20</span></div>'+
  '<div class="progressbar"><div id="bac-eval-progress" class="progressin"></div></div><div id="bac-eval-live"></div><div id="bac-eval-question"></div><div class="toolbar"><button type="button" class="btn blue hidden" id="bac-eval-next">Question suivante →</button></div><div id="bac-eval-result" class="result hidden"></div></div>';
 $("bac-back-eval").onclick=function(){window.FIGAROMN_CURRENT_SEQUENCE=ev.sequence;activeSequence=ev.sequence;rebuildEvaluations();show("evaluations");};
 var qbox=$("bac-eval-question"),next=$("bac-eval-next");
 function update(){
  $("bac-eval-score").textContent="Score : "+score+" / "+ev.questions.length+" · Note : "+fr(note20(score,ev.questions.length))+" /20";
  liveAgg=currentAttemptIndicatorAggregate(ev.questions,responses);
  $("bac-eval-live").innerHTML=indicatorAcquisitionHTML(liveAgg,ev.comps,'Évaluation en cours : calcul automatique par indicateur.');
 }
 function renderQ(){
  answered=false;var q=ev.questions[current];mixed=mixedOptions(q);
  $("bac-eval-counter").textContent="Question "+(current+1)+" / "+ev.questions.length;
  $("bac-eval-progress").style.width=Math.round(current/ev.questions.length*100)+"%";
  qbox.innerHTML='<div class="q-card"><span class="question-skill">Compétence évaluée : '+esc((q.comps||[]).join(" · "))+'</span>'+questionIndicatorRefsHTML(q)+'<strong>'+esc(q.q)+'</strong><div class="answers">'+mixed.map(function(o){return '<button type="button" class="answer" data-choice="'+o.originalIndex+'">'+esc(o.label)+'</button>';}).join("")+'</div><div class="feedback hidden"></div></div>';
  next.classList.add("hidden");update();
 }
 qbox.onclick=function(e){
  var b=e.target.closest("[data-choice]");if(!b||answered)return;answered=true;
  var q=ev.questions[current],choice=Number(b.dataset.choice),correct=choice===q.c;
  qbox.querySelectorAll(".answer").forEach(function(x){x.disabled=true;if(Number(x.dataset.choice)===q.c)x.classList.add("good");});
  if(correct)score++;else b.classList.add("bad");
  responses[current]={qi:current,choice:choice,correct:correct};
  var fb=qbox.querySelector(".feedback");fb.classList.remove("hidden");fb.textContent=correct?"✅ Bonne réponse.":"❌ Réponse incorrecte.";
  update();next.classList.remove("hidden");next.textContent=current===ev.questions.length-1?"Voir mon résultat":"Question suivante →";
 };
 next.onclick=async function(){
  if(!answered)return;
  if(current<ev.questions.length-1){current++;renderQ();return;}
  qbox.innerHTML="";next.classList.add("hidden");$("bac-eval-progress").style.width="100%";
  var resultBox=$("bac-eval-result");resultBox.classList.remove("hidden");resultBox.innerHTML="<h3>Enregistrement automatique…</h3>";
  try{
   var result=await saveAttempt("evaluation",ev,responses,score),agg=currentAttemptIndicatorAggregate(ev.questions,responses);
   resultBox.innerHTML='<h3>Évaluation terminée</h3><p>Réponses correctes : <strong>'+score+' / '+ev.questions.length+'</strong></p><p>Note automatique : <span class="note20">'+fr(result.note20)+' / 20</span></p><p>Réussite globale : <strong>'+fr(result.percent)+' %</strong></p><p class="small">Calcul de la note : réponses correctes ÷ '+ev.questions.length+' × 20.</p><p>Tentative enregistrée : <strong>n°'+result.attemptNo+'</strong></p>'+
    '<h3>📊 Pourcentage par indicateur puis niveau de compétence</h3>'+indicatorAcquisitionHTML(agg,ev.comps,'Résultat automatique de cette évaluation.')+
    '<div class="toolbar"><button type="button" class="btn light" disabled>✅ Tentative synchronisée</button><button type="button" class="btn green" id="bac-pdf-eval">🖨️ Enregistrer en PDF avec réponses</button><button type="button" class="btn blue" id="bac-history-eval-now">📚 Historique complet</button></div>';
   $("bac-pdf-eval").onclick=function(){printReport(ev.title,ev,result,responses);};
   $("bac-history-eval-now").onclick=function(){showHistory("evaluation",ev);};
   rebuildExercises();rebuildEvaluations();
  }catch(e){resultBox.innerHTML='<h3>Évaluation terminée</h3><p class="badmsg">Synchronisation impossible : '+esc(e.message)+'</p>';}
 };
 renderQ();show("evaluation-detail");
}
async function init(){
 try{
  await ensureReady();
  rebuildExercises();
  rebuildEvaluations();
 }catch(e){
  var s=$("fmn-cloud-status");
  if(s)s.textContent="Suivi automatique indisponible : "+e.message;
 }
}
window.FIGAROMN_BACPRO_AUTO_ACTIVE=true;
function normalizeSequence(no){
 var n=Number(no||1);
 if(!isFinite(n)||n<1||n>7)n=1;
 return n;
}
async function openExercisesForSequence(no){
 activeSequence=normalizeSequence(no);
 window.FIGAROMN_CURRENT_SEQUENCE=activeSequence;

 // Affichage immédiat : le bouton répond même si Supabase charge encore.
 show("exercises");
 var grid=$("fmn-exercise-grid");
 if(grid)grid.innerHTML='<div class="content-box"><strong>⏳ Chargement des exercices de la séquence '+activeSequence+'…</strong></div>';

 try{
  await ensureReady();
  rebuildExercises();
 }catch(e){
  if(grid)grid.innerHTML='<div class="content-box"><strong>⚠️ Exercices indisponibles</strong><p>'+esc(e.message)+'</p></div>';
 }
}

async function openEvaluationsForSequence(no){
 activeSequence=normalizeSequence(no);
 window.FIGAROMN_CURRENT_SEQUENCE=activeSequence;

 show("evaluations");
 var grid=$("fmn-eval-grid");
 if(grid)grid.innerHTML='<div class="content-box"><strong>⏳ Chargement de l’évaluation de la séquence '+activeSequence+'…</strong></div>';

 try{
  await ensureReady();
  rebuildEvaluations();
 }catch(e){
  if(grid)grid.innerHTML='<div class="content-box"><strong>⚠️ Évaluation indisponible</strong><p>'+esc(e.message)+'</p></div>';
 }
}

async function openExerciseForSession(seq,no){
 activeSequence=normalizeSequence(seq);
 window.FIGAROMN_CURRENT_SEQUENCE=activeSequence;
 try{
  await ensureReady();
  var ex=findExercise(activeSequence,Number(no));
  if(!ex)throw new Error("Exercice de la séance introuvable.");
  window.FIGAROMN_RETURN_SESSION={sequence:activeSequence,session:Number(no)};
  openExercise(ex,false);
 }catch(e){
  var grid=$("fmn-exercise-grid");
  show("exercises");
  if(grid)grid.innerHTML='<div class="content-box"><strong>⚠️ Exercice indisponible</strong><p>'+esc(e.message)+'</p></div>';
 }
}
async function openAllExercises(){
 activeSequence=0;
 window.FIGAROMN_CURRENT_SEQUENCE=0;
 show("exercises");
 try{await ensureReady();rebuildExercises();}
 catch(e){var grid=$("fmn-exercise-grid");if(grid)grid.innerHTML='<div class="content-box"><strong>⚠️ Exercices indisponibles</strong><p>'+esc(e.message)+'</p></div>';}
}
async function openAllEvaluations(){
 activeSequence=0;
 window.FIGAROMN_CURRENT_SEQUENCE=0;
 show("evaluations");
 try{await ensureReady();rebuildEvaluations();}
 catch(e){var grid=$("fmn-eval-grid");if(grid)grid.innerHTML='<div class="content-box"><strong>⚠️ Évaluations indisponibles</strong><p>'+esc(e.message)+'</p></div>';}
}

window.FigaroBacAuto={
 init:init,reload:reload,rebuildExercises:rebuildExercises,rebuildEvaluations:rebuildEvaluations,
 openExercisesForSequence:openExercisesForSequence,
 openEvaluationsForSequence:openEvaluationsForSequence,
 openExerciseForSession:openExerciseForSession,
 openAllExercises:openAllExercises,
 openAllEvaluations:openAllEvaluations
};
setTimeout(init,150);
})();