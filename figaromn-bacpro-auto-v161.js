(function(){
"use strict";
window.FIGAROMN_BUILD_V161="16.1-v2445";
console.info("FigaroMN Bac Pro moteur V16.1 / V24.48 reprise automatique après autorisation enseignant chargée");

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
  'Pourcentage d’un indicateur = points obtenus / points possibles sur les questions rattachées × 100.<br>'+
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
function shuffleArray(arr){
 var copy=(arr||[]).slice();
 for(var i=copy.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),tmp=copy[i];copy[i]=copy[j];copy[j]=tmp;}
 return copy;
}
function balancedCorrectPositions(questionCount,answerCount){
 answerCount=Math.max(1,Number(answerCount)||1);
 var positions=[],previous=-1;
 while(positions.length<questionCount){
  var cycle=[];for(var i=0;i<answerCount;i++)cycle.push(i);
  cycle=shuffleArray(cycle);
  if(answerCount>1&&previous===cycle[0]){
   var swapIndex=1;while(swapIndex<cycle.length&&cycle[swapIndex]===previous)swapIndex++;
   if(swapIndex<cycle.length){var t=cycle[0];cycle[0]=cycle[swapIndex];cycle[swapIndex]=t;}
  }
  for(var j=0;j<cycle.length&&positions.length<questionCount;j++){positions.push(cycle[j]);previous=cycle[j];}
 }
 return positions;
}
function balancedCorrectPositionsForQuestions(questions){
 var out=new Array((questions||[]).length),groups={};
 (questions||[]).forEach(function(q,index){
  var count=Math.max(1,(q.a||[]).length);
  if(!groups[count])groups[count]=[];groups[count].push(index);
 });
 Object.keys(groups).forEach(function(key){
  var count=Number(key),indices=groups[key],positions=balancedCorrectPositions(indices.length,count);
  indices.forEach(function(qIndex,i){out[qIndex]=positions[i];});
 });
 return out;
}
function mixedOptions(q,targetCorrectPosition){
 var options=(q.a||[]).map(function(label,i){return {label:label,originalIndex:i,correct:i===Number(q.c)};});
 var correct=null,distractors=[];
 options.forEach(function(o){if(o.correct)correct=o;else distractors.push(o);});
 distractors=shuffleArray(distractors);
 if(!correct)return shuffleArray(options);
 var maxPos=Math.max(0,options.length-1),target=Math.max(0,Math.min(Number(targetCorrectPosition)||0,maxPos));
 var mixed=distractors.slice();mixed.splice(target,0,correct);return mixed;
}

function evaluationCreditLabel(percent){
 var p=Number(percent)||0;
 if(p>=100)return "✅ Réponse complète : 100 % des points.";
 if(p>=60)return "🟡 Réponse pertinente mais incomplète : 60 % des points.";
 if(p>=40)return "🟠 Réponse partielle : 40 % des points.";
 return "🔸 Première étape pertinente : 20 % des points.";
}
function evaluationCreditValue(percent){return Math.max(0,Math.min(100,Number(percent)||0))/100;}
function graduatedEvaluationTexts(q){
 var question=String((q&&q.q)||"");
 var best=String((q&&q.a&&q.a[q.c])||"");
 var hay=(question+" "+best).toLowerCase();
 var p60="",p40="",p20="";
 var bestLower=best.trim().toLowerCase();
 if(bestLower==="non"){
  p60="Non, car il faut encore confirmer la situation par les contrôles ou critères prévus.";
  p40="Pas systématiquement : une vérification complémentaire reste nécessaire avant de conclure.";
  p20="Cela dépend des premiers indices, mais une conclusion immédiate serait encore prématurée.";
 }else if(bestLower==="oui"){
  p60="Oui, à condition de confirmer la situation par les vérifications prévues.";
  p40="Oui dans le principe, mais seulement après une vérification partielle.";
  p20="C’est possible dans certains cas, sans que les conditions soient encore toutes vérifiées.";
 }else if(hay.indexOf("conclusion de diagnostic")!==-1){
  p60="Une mesure pertinente ou une observation correctement interprétée, mais sans croiser encore tous les résultats disponibles.";
  p40="Un résultat de contrôle cohérent mais isolé, avec une interprétation encore partielle.";
  p20="Une première observation pertinente, mais pas encore suffisamment confirmée pour conclure.";
 }else if(hay.indexOf("saint-malo")!==-1){
  p60="Un port breton de la Manche, sans préciser encore la ville de départ.";
  p40="Un port du nord-ouest de la France lié au départ de la course.";
  p20="Un port français de départ, sans pouvoir le localiser précisément.";
 }else if(hay.indexOf("pointe-à-pitre")!==-1 || hay.indexOf("pointe a pitre")!==-1){
  p60="La Guadeloupe, sans préciser encore la ville d’arrivée.";
  p40="Les Antilles françaises, sans identifier précisément le port d’arrivée.";
  p20="Une destination française des Caraïbes, sans localisation plus précise.";
 }else if(hay.indexOf("solitaire")!==-1){
  p60="Le bateau est mené par un seul skipper pendant la course, sans détailler les conséquences de cette organisation.";
  p40="L’équipage est réduit à une seule personne, sans préciser son rôle complet à bord.";
  p20="La navigation se fait sans équipage collectif, sans expliquer précisément ce que cela implique.";
 }else if(hay.indexOf("gps")!==-1){
  p60="Un équipement de positionnement et d’aide à la route, sans détailler toutes ses fonctions.";
  p40="Un équipement électronique permettant surtout de se repérer à bord.";
  p20="Un équipement de bord utilisé pour aider la navigation, sans préciser son rôle exact.";
 }else if(hay.indexOf("vhf")!==-1){
  p60="Un moyen radio de communication maritime, sans préciser tous ses usages ni procédures.";
  p40="Un équipement de communication utilisé à bord pour échanger des informations.";
  p20="Un appareil de bord lié aux communications, sans préciser son utilisation maritime.";
 }else if(/sécur|risque|protection|hygi|consign|epi/.test(hay)){
  p60="Identifier les principaux risques et appliquer les précautions essentielles, mais sans vérifier toutes les conditions de sécurité.";
  p40="Prendre les précautions les plus évidentes et utiliser les protections principales, avec une vérification encore partielle.";
  p20="Repérer un risque majeur et prendre une première mesure de protection, sans traiter l’ensemble de la situation.";
 }else if(/document|constructeur|fiche|donnée|information|référence|schema|schéma/.test(hay)){
  p60="Consulter la documentation pertinente et relever les informations principales, mais sans croiser toutes les données utiles.";
  p40="Utiliser une source adaptée et relever une partie des informations nécessaires, sans vérification complète.";
  p20="Rechercher une première information utile dans la documentation, sans exploiter l’ensemble des données nécessaires.";
 }else if(/mesur|contrô|controle|essai|test|valeur|multim|compression|pression/.test(hay)){
  p60="Réaliser le contrôle principal et interpréter le résultat, mais sans effectuer toutes les vérifications complémentaires.";
  p40="Effectuer une mesure ou un contrôle simple et comparer partiellement le résultat aux valeurs attendues.";
  p20="Faire une première observation ou mesure utile, sans aller jusqu’au contrôle complet ni à l’interprétation finale.";
 }else if(/diagnost|dysfonction|sympt|hypoth|cause|conclu|anomal/.test(hay)){
  p60="Exploiter le symptôme et les principaux résultats pour proposer une hypothèse pertinente, mais encore incomplètement validée.";
  p40="Formuler une hypothèse plausible à partir des indices principaux, sans mener toute la démarche de validation.";
  p20="Repérer un premier indice cohérent et proposer une piste, sans disposer d’éléments suffisants pour conclure.";
 }else if(/client|visiteur|communi|restit|compte rendu|expliquer|présent|informer/.test(hay)){
  p60="Présenter clairement les informations et résultats principaux, mais sans détailler tous les éléments utiles au client.";
  p40="Donner une explication générale correcte, avec seulement une partie des informations nécessaires.";
  p20="Transmettre une information essentielle, mais de façon trop brève pour constituer une restitution complète.";
 }else if(/planif|organis|prépar|prepar|ordre|planning|moyen|outillage/.test(hay)){
  p60="Organiser les étapes principales et les moyens nécessaires, mais sans intégrer toutes les contraintes de l’intervention.";
  p40="Prévoir les opérations essentielles et une partie des moyens, avec un ordre ou une préparation encore incomplets.";
  p20="Identifier seulement la première étape et quelques moyens évidents, sans construire l’organisation complète.";
 }else if(/install|remplac|répar|repar|interven|maintenance|démon|demon|remont|régl|regl|conform/.test(hay)){
  p60="Réaliser l’opération principale selon la méthode attendue et vérifier le fonctionnement, mais sans finaliser tous les contrôles ou la traçabilité.";
  p40="Réaliser l’essentiel de l’opération et un contrôle simple, avec une méthode encore partiellement conforme.";
  p20="Engager correctement l’intervention et réaliser une première opération utile, sans aller jusqu’au contrôle final.";
 }else if(/identif|collect|repér|reper|observer|prise en charge/.test(hay)){
  p60="Identifier les éléments et informations principales utiles à la situation, mais sans compléter toutes les vérifications nécessaires.";
  p40="Repérer la demande ou le système concerné et relever quelques informations pertinentes, sans analyse complète.";
  p20="Faire une première observation cohérente et identifier un élément utile, sans traiter l’ensemble de la demande.";
 }else{
  p60=best+" — réponse pertinente, mais justification ou vérification complémentaire encore incomplète.";
  p40="Donner une partie des éléments attendus et une démarche cohérente, sans répondre complètement à la question.";
  p20="Identifier un premier élément pertinent lié à la question, sans développer la démarche nécessaire.";
 }
 return [
  {label:best,percent:100},
  {label:p60,percent:60},
  {label:p40,percent:40},
  {label:p20,percent:20}
 ];
}
function shuffledGraduatedEvaluationOptions(q){
 return shuffleArray(graduatedEvaluationTexts(q).map(function(o,i){return {label:o.label,percent:o.percent,originalIndex:i};}));
}
function mixedWeightedEvaluationOptions(q,targetCorrectPosition){
 var options=graduatedEvaluationTexts(q).map(function(o,i){return {label:o.label,percent:o.percent,originalIndex:i};});
 var full=null,partials=[];
 options.forEach(function(o){if(Number(o.percent)===100)full=o;else partials.push(o);});
 partials=shuffleArray(partials);
 if(!full)return shuffleArray(options);
 var target=Math.max(0,Math.min(Number(targetCorrectPosition)||0,options.length-1));
 partials.splice(target,0,full);return partials;
}

function currentAttemptIndicatorAggregate(questions,responses,weighted){
 var out={};
 (questions||[]).forEach(function(q,qi){
  var r=responses[qi]||{};
  var credit=weighted?(r.credit!=null?Number(r.credit):evaluationCreditValue(r.percent!=null?r.percent:(r.correct?100:0))):(r.correct===true?1:0);
  credit=Math.max(0,Math.min(1,isFinite(credit)?credit:0));
  Object.keys(q.inds||{}).forEach(function(code){
   var idx=Number(q.inds[code]);
   if(!out[code])out[code]={};
   if(!out[code][idx])out[code][idx]={good:0,total:0};
   out[code][idx].total++;
   out[code][idx].good+=credit;
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
  mapping:mapping,
  indicator_scale:5,
  scoring_model:kind==="evaluation"?"progressif_20_40_60_100":"binaire"
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
   agg[key].total+=5;
   var response=responses[qi]||{};
   var earned=kind==="evaluation"?Math.round((response.percent!=null?Number(response.percent):(response.correct?100:20))/20):(response.correct===true?5:0);
   agg[key].good+=Math.max(0,Math.min(5,isFinite(earned)?earned:0));
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
    body:JSON.stringify({student_id:state.profile.id,session_id:session.id,score:n20,attempt_no:attemptNo,details:{source:"FigaroMN BacPro Auto V11",engine:"bacpro_auto_v11",raw_score:score,total:total,scoring_model:"progressif_20_40_60_100",indicator_scale:5}})});
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
   var weighted=r.percent!=null;
   var chosen=r.label||((choice==null||!q.a)?"—":q.a[choice]);
   var expected=(q.c==null||!q.a)?"—":q.a[q.c];
   var pct=weighted?Number(r.percent):(r.correct===true?100:0);
   var status=pct>=60;
   return '<div class="q '+(status?'ok':'ko')+'"><div class="qtitle"><strong>'+(i+1)+'. '+esc(q.q)+'</strong><span>'+(weighted?(fr(pct)+' % des points'):(r.correct?'✅ Correct':'❌ À revoir'))+'</span></div>'+
    '<p><strong>Réponse de l’élève :</strong> '+esc(chosen)+'</p>'+
    '<p><strong>Réponse de référence (100 %) :</strong> '+esc(expected)+'</p>'+
    '<p><strong>Crédit obtenu :</strong> '+fr(pct)+' % des points de la question</p>'+
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
 var printCorrectPositions=balancedCorrectPositionsForQuestions(ex.questions);
 var body='<h1>'+esc(ex.title)+'</h1><p><strong>'+esc(CFG.full)+'</strong> · Séquence '+ex.sequence+' · Situation '+ex.situation+'</p><p>'+esc(ex.objective||"")+'</p>'+
  successIndicatorsPanelHTML(ex.comps)+
  ex.questions.map(function(q,i){var opts=mixedOptions(q,printCorrectPositions[i]);return '<div class="q"><strong>'+(i+1)+'. '+esc(q.q)+'</strong><br>'+opts.map(function(o){return '☐ '+esc(o.label);}).join('<br>')+'</div>';}).join("");
 w.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>body{font-family:Arial;padding:24px}.q{border:1px solid #ddd;padding:10px;margin:10px 0}h1{color:#06283d}.success-panel{border:1px solid #d9e6ea;padding:12px}</style></head><body>'+body+'</body></html>');w.document.close();setTimeout(function(){w.print();},250);
}
function openExercise(ex,forceRedo){
 if(!ex)return;
 var rows=attemptRows("exercise",ex.sequence,ex.situation);
 if(rows.length&&!forceRedo){alert("Cet exercice a déjà été réalisé. Pour le refaire, utilise « Refaire l’exercice » et le code enseignant.");rebuildExercises();show("exercises");return;}
 var detail=$("fmn-view-exercise-detail"),score=0,answered=0,responses=[],liveAgg={};
 var exCorrectPositions=balancedCorrectPositionsForQuestions(ex.questions);
 var qhtml=ex.questions.map(function(q,qi){
  var opts=mixedOptions(q,exCorrectPositions[qi]);
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
  '<div class="exercise-skill-summary-bottom"><h3>📊 Synthèse des compétences</h3><div id="bac-ex-live"></div></div>'+
  '<div class="fmn-bottom-prev"><button type="button" class="btn light" id="bac-bottom-prev-ex">← Précédent</button></div></div>';
 function bacReturnFromExercise(){
  if(window.FIGAROMN_RETURN_SESSION && window.FigaroMNLevelFlow && typeof window.FigaroMNLevelFlow.openCourse==="function"){
   var r=window.FIGAROMN_RETURN_SESSION;
   window.FIGAROMN_RETURN_SESSION=null;
   window.FigaroMNLevelFlow.openCourse(r.sequence,r.session);
   return;
  }
  window.FIGAROMN_CURRENT_SEQUENCE=ex.sequence;
  activeSequence=ex.sequence;
  rebuildExercises();
  show("exercises");
 }
 $("bac-back-ex").onclick=bacReturnFromExercise;
 var bacBottomPrevEx=$("bac-bottom-prev-ex");
 if(bacBottomPrevEx)bacBottomPrevEx.onclick=bacReturnFromExercise;
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
function ensureEvaluationCompactUI(){
 var grid=$("fmn-eval-grid");
 if(!grid)return;

 if(!document.getElementById("fmn-eval-compact-style")){
  var style=document.createElement("style");
  style.id="fmn-eval-compact-style";
  style.textContent=
   '#fmn-level-master .evaluation-competence-details{margin-top:10px;padding-top:10px;border-top:1px dashed #cbd9de}'+
   '#fmn-level-master .evaluation-competence-details.hidden{display:none!important}'+
   '#fmn-level-master .eval-compact-controls{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:flex-end;margin:0 0 12px}'+
   '#fmn-level-master .eval-compact-controls .compact-help{margin-right:auto;color:#607680;font-size:13px}'+
   '#fmn-level-master .eval-competence-toggle{margin-top:9px}'+
   '#fmn-level-master .evaluation-list .menu-card{align-items:flex-start}'+
   '@media(max-width:760px){#fmn-level-master .eval-compact-controls{justify-content:stretch}#fmn-level-master .eval-compact-controls .compact-help{width:100%;margin:0}#fmn-level-master .eval-compact-controls .btn{flex:1 1 auto}}';
  document.head.appendChild(style);
 }

 var controls=$("fmn-eval-compact-controls");
 if(!controls){
  controls=document.createElement("div");
  controls.id="fmn-eval-compact-controls";
  controls.className="eval-compact-controls";
  controls.innerHTML=
   '<span class="compact-help">Affichage compact : les compétences sont réduites pour voir plus facilement les 7 évaluations.</span>'+ 
   '<button type="button" class="btn light" id="fmn-eval-expand-all">▾ Afficher toutes les compétences</button>'+ 
   '<button type="button" class="btn light" id="fmn-eval-collapse-all">▴ Réduire toutes les compétences</button>';
  grid.parentNode.insertBefore(controls,grid);
 }

 var expand=$("fmn-eval-expand-all");
 if(expand)expand.onclick=function(){setAllEvaluationCompetences(true);};
 var collapse=$("fmn-eval-collapse-all");
 if(collapse)collapse.onclick=function(){setAllEvaluationCompetences(false);};
}

function setEvaluationCompetenceVisibility(card,open){
 if(!card)return;
 var details=card.querySelector(".evaluation-competence-details");
 var btn=card.querySelector("[data-toggle-eval-competences]");
 if(!details)return;
 details.classList.toggle("hidden",!open);
 details.setAttribute("aria-hidden",open?"false":"true");
 if(btn){
  btn.setAttribute("aria-expanded",open?"true":"false");
  btn.textContent=open?"▴ Réduire les compétences":"▾ Voir les compétences";
 }
}

function setAllEvaluationCompetences(open){
 var grid=$("fmn-eval-grid");
 if(!grid)return;
 grid.querySelectorAll(".menu-card").forEach(function(card){setEvaluationCompetenceVisibility(card,open);});
}

/* =========================================================
   ANTI-TRICHE ÉVALUATIONS V24.44
   - changement d'onglet / minimisation / navigation = évaluation bloquée
   - la même évaluation ne peut être relancée qu'avec le code enseignant
   - une autre évaluation reste accessible avec son code habituel
========================================================= */
function evaluationGuardKey(ev){
 var who="eleve";
 try{
  if(state&&state.profile){who=String(state.profile.email||state.profile.full_name||state.profile.name||state.profile.id||"eleve");}
 }catch(e){}
 return "figaromn_eval_guard_v2444_"+String(CFG.level||"bacpro")+"_"+String(ev&&ev.sequence||0)+"_"+encodeURIComponent(who.toLowerCase());
}
function evaluationGuardRead(ev){
 try{
  var raw=localStorage.getItem(evaluationGuardKey(ev));
  if(!raw)return null;
  var data=JSON.parse(raw);
  return data&&data.locked?data:null;
 }catch(e){return null;}
}
function evaluationGuardIsLocked(ev){return !!evaluationGuardRead(ev);}

/* V24.45 — signalement anti-triche vers l'espace Enseignant.
   La file locale garantit que le signalement n'est pas perdu si l'élève ferme
   ou actualise la page au moment exact de la détection. */
var evaluationIntegrityFlushBusy=false;
function evaluationIntegrityPendingKey(){return "figaromn_eval_integrity_pending_v2445";}
function evaluationIntegrityReadPending(){
 try{var a=JSON.parse(localStorage.getItem(evaluationIntegrityPendingKey())||"[]");return Array.isArray(a)?a:[];}catch(e){return [];}
}
function evaluationIntegrityWritePending(rows){try{localStorage.setItem(evaluationIntegrityPendingKey(),JSON.stringify(rows||[]));}catch(e){}}
function evaluationIntegrityEventId(){
 try{if(window.crypto&&crypto.randomUUID)return crypto.randomUUID();}catch(e){}
 return "evt-"+Date.now()+"-"+Math.random().toString(36).slice(2,11);
}
function evaluationIntegrityQueue(ev,reason,meta,eventId){
 var p=state&&state.profile;
 if(!p||!p.id)return;
 meta=meta||{};
 var row={
  client_event_id:eventId||evaluationIntegrityEventId(),
  student_id:p.id,
  student_name:String(p.full_name||p.email||"Élève"),
  student_level:String(CFG.level||p.level||"bacpro"),
  evaluation_key:String(CFG.level||"bacpro")+":sequence:"+String(ev&&ev.sequence||0),
  evaluation_title:String(ev&&ev.title||"Évaluation"),
  sequence_no:Number(ev&&ev.sequence||0)||null,
  question_no:Number(meta.question_no||0)||null,
  question_total:Number(meta.question_total||0)||null,
  reason:String(reason||"sortie détectée"),
  detected_at:new Date().toISOString(),
  status:"new"
 };
 var rows=evaluationIntegrityReadPending();
 if(!rows.some(function(x){return x&&x.client_event_id===row.client_event_id;})){rows.push(row);evaluationIntegrityWritePending(rows);}
 evaluationIntegrityFlushPending();
}
async function evaluationIntegrityFlushPending(){
 if(evaluationIntegrityFlushBusy||!window.FigaroCloud||!state||!state.profile||!state.profile.id)return;
 var rows=evaluationIntegrityReadPending();if(!rows.length)return;
 evaluationIntegrityFlushBusy=true;
 try{
  var keep=[];
  for(var i=0;i<rows.length;i++){
   var row=rows[i];
   if(!row||row.student_id!==state.profile.id){keep.push(row);continue;}
   try{
    // V24.47 : insertion simple. L'ancien UPSERT "merge-duplicates" exigeait
    // une politique UPDATE et bloquait les élèves avec la RLS Supabase.
    await FigaroCloud.table("evaluation_integrity_alerts","",{method:"POST",keepalive:true,headers:{"Prefer":"return=minimal"},body:JSON.stringify(row)});
   }catch(e){
    // Si l'événement a déjà été enregistré lors d'un premier envoi mais que
    // le navigateur n'a pas reçu la réponse, le client_event_id unique peut
    // provoquer un 409. Dans ce cas on vérifie son existence et on considère
    // la synchronisation comme réussie.
    var duplicateSynced=false;
    if(e&&Number(e.status)===409){
     try{
      var already=await FigaroCloud.table("evaluation_integrity_alerts","client_event_id=eq."+encodeURIComponent(row.client_event_id)+"&student_id=eq."+encodeURIComponent(state.profile.id)+"&select=id&limit=1");
      duplicateSynced=Array.isArray(already)&&already.length>0;
     }catch(checkErr){}
    }
    if(!duplicateSynced)keep.push(row);
   }
  }
  evaluationIntegrityWritePending(keep);
 }finally{evaluationIntegrityFlushBusy=false;}
}
async function evaluationIntegrityCheckAuthorization(ev){
 var lock=evaluationGuardRead(ev);
 if(!lock||!lock.client_event_id||!state.profile||!window.FigaroCloud)return false;
 try{
  var rows=await FigaroCloud.table("evaluation_integrity_alerts","client_event_id=eq."+encodeURIComponent(lock.client_event_id)+"&student_id=eq."+encodeURIComponent(state.profile.id)+"&select=id,status,authorized_at&limit=1");
  if(Array.isArray(rows)&&rows[0]&&(rows[0].status==="authorized"||(rows[0].status==="handled"&&rows[0].authorized_at))){evaluationGuardClear(ev);return true;}
 }catch(e){}
 return false;
}
async function evaluationIntegrityReconcileLocks(){
 await evaluationIntegrityFlushPending();
 var changed=false;
 for(var i=0;i<DATA.evaluations.length;i++){var ev=DATA.evaluations[i];if(evaluationGuardIsLocked(ev)&&await evaluationIntegrityCheckAuthorization(ev))changed=true;}
 return changed;
}
function evaluationGuardLock(ev,reason,meta){
 var existing=evaluationGuardRead(ev);if(existing)return existing;
 var eventId=evaluationIntegrityEventId();
 var data={locked:true,reason:String(reason||"sortie détectée"),at:new Date().toISOString(),client_event_id:eventId};
 try{localStorage.setItem(evaluationGuardKey(ev),JSON.stringify(data));}catch(e){}
 evaluationIntegrityQueue(ev,reason,meta,eventId);
 return data;
}
function evaluationGuardClear(ev){
 try{localStorage.removeItem(evaluationGuardKey(ev));}catch(e){}
}

function rebuildEvaluations(){
 var grid=$("fmn-eval-grid");if(!grid)return;
 ensureEvaluationCompactUI();
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
  var rows=evalRows(ev.sequence),best=bestAttempt(rows),last=rows.length?rows[rows.length-1]:null,locked=evaluationGuardIsLocked(ev);
  var agg=aggregateIndicators("evaluation",function(a){var db=dbSession(ev.sequence,6);return db&&a.session_id===db.id;});
  return '<article class="menu-card" data-evaluation-index="'+(ev.sequence-1)+'"><div><div class="top-icon">✅</div>'+
   '<span class="pill">SÉQUENCE '+ev.sequence+'</span>'+
   '<h3>'+esc(ev.title)+' – 18 questions notées sur 20</h3><p>'+esc(ev.desc||"")+'</p>'+
   '<span class="pill">18 questions · note /20</span> '+
   '<span class="pill">'+(best?'Meilleure note : '+fr(note20(best.score,best.total))+'/20':'Non réalisée')+'</span> '+
   '<span class="pill">'+(rows.length?'✅ Évaluation terminée':(locked?'⛔ Bloquée · sortie détectée':'Compétences à positionner'))+'</span> '+
   '<span class="pill">Tentatives : '+rows.length+'</span> '+
   (last?'<span class="pill">Dernière note : '+fr(note20(last.score,last.total))+'/20</span>':'')+
   '<div><button type="button" class="btn light eval-competence-toggle" data-toggle-eval-competences="'+ev.sequence+'" aria-expanded="false">▾ Voir les compétences</button></div>'+
   '<div class="evaluation-competence-details hidden" aria-hidden="true">'+indicatorAcquisitionHTML(agg,ev.comps,'')+'</div></div>'+
   (rows.length?
    '<div class="actions"><button type="button" class="btn light" disabled>✅ Évaluation terminée</button>'+
    '<button type="button" class="btn red" data-redo-eval="'+ev.sequence+'">🔁 Refaire l’évaluation</button>'+
    '<button type="button" class="btn blue" data-history-eval="'+ev.sequence+'">📚 Historique complet ('+rows.length+')</button></div>':
    (locked?
     '<div class="actions"><div class="msg badmsg">⛔ Évaluation bloquée : une sortie de l’évaluation a été détectée et signalée à l’enseignant.</div>'+
     '<button type="button" class="btn blue" data-check-eval-auth="'+ev.sequence+'">↻ Vérifier l’autorisation enseignant</button>'+
     '<button type="button" class="btn red" data-redo-eval="'+ev.sequence+'">🔓 Recommencer avec le code enseignant</button></div>':
     '<div><div class="eval-lock"><input type="password" maxlength="20" placeholder="Code enseignant" aria-label="Code pour '+esc(ev.title)+'">'+
     '<button type="button" class="btn orange" data-unlock-eval="'+ev.sequence+'">▶ Faire l’évaluation</button></div>'+
     '<div class="msg" aria-live="polite"></div></div>'))+
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
 grid.querySelectorAll("[data-toggle-eval-competences]").forEach(function(b){b.onclick=function(){
  var card=b.closest(".menu-card");
  var details=card&&card.querySelector(".evaluation-competence-details");
  var open=details&&details.classList.contains("hidden");
  setEvaluationCompetenceVisibility(card,!!open);
 };});
 grid.querySelectorAll("[data-unlock-eval]").forEach(function(b){b.onclick=function(){
  var ev=findEval(b.dataset.unlockEval),card=b.closest(".menu-card"),input=card.querySelector("input"),msg=card.querySelector(".msg");
  if(evaluationGuardIsLocked(ev)){msg.textContent="⛔ Cette évaluation a été bloquée après une sortie. Utilise « Recommencer avec le code enseignant ».";msg.className="msg badmsg";return;}
  if(input.value.trim().toLowerCase()===String(ev.code).toLowerCase()){msg.textContent="✅ Code correct";msg.className="msg ok";setTimeout(function(){openEvaluation(ev,false);},120);}else{msg.textContent="❌ Code incorrect";msg.className="msg badmsg";input.value="";input.focus();}
 };});
 grid.querySelectorAll("[data-check-eval-auth]").forEach(function(b){b.onclick=async function(){var ev=findEval(b.dataset.checkEvalAuth);b.disabled=true;b.textContent="Vérification…";var ok=await evaluationIntegrityCheckAuthorization(ev);if(ok){alert("✅ L’enseignant a autorisé la reprise. L’évaluation redémarre maintenant depuis le début.");openEvaluation(ev,true);}else{alert("Aucune autorisation de reprendre n’a encore été enregistrée par l’enseignant.");b.disabled=false;b.textContent="↻ Vérifier l’autorisation enseignant";}};});
 grid.querySelectorAll("[data-redo-eval]").forEach(function(b){b.onclick=function(){var ev=findEval(b.dataset.redoEval),code=prompt("Code enseignant pour refaire l’évaluation :");if(code===null)return;if(code.trim().toLowerCase()!==String(DATA.redoEvaluationCode||"evaluation").toLowerCase()){alert("Code incorrect.");return;}evaluationGuardClear(ev);openEvaluation(ev,true);};});
 grid.querySelectorAll("[data-history-eval]").forEach(function(b){b.onclick=function(){showHistory("evaluation",findEval(b.dataset.historyEval));};});
}
function openEvaluation(ev,forceRedo){
 if(!ev)return;
 var rows=evalRows(ev.sequence);
 if(evaluationGuardIsLocked(ev)&&!forceRedo){alert("Cette évaluation est bloquée car une sortie a été détectée. Pour la recommencer, utilise le bouton prévu et le code enseignant.");rebuildEvaluations();show("evaluations");return;}
 if(forceRedo)evaluationGuardClear(ev);
 if(rows.length&&!forceRedo){alert("Cette évaluation a déjà été réalisée. Pour la refaire, utilise « Refaire l’évaluation » et le code enseignant.");rebuildEvaluations();show("evaluations");return;}
 var detail=$("fmn-view-evaluation-detail");
 if(!detail){
  detail=document.createElement("section");detail.id="fmn-view-evaluation-detail";detail.className="main-view hidden";
  var host=root.querySelector(".content")||root;host.appendChild(detail);
 }
 var current=0,score=0,answered=false,responses=[],liveAgg={},mixed=[],evalCorrectPositions=balancedCorrectPositions(ev.questions.length,4);
 detail.innerHTML='<style>.answer.partial{border-color:#d29a2e!important;background:#fff8e8!important}.feedback.credit{font-weight:800}</style>'+ 
  '<div class="content-head"><button type="button" class="btn light" id="bac-back-eval">← Retour aux évaluations</button></div>'+ 
  '<div class="content-box"><h2>'+esc(ev.title)+'</h2>'+ 
  '<div class="eval-top"><span id="bac-eval-counter">Question 1 / '+ev.questions.length+'</span><span id="bac-eval-score">Réussite pondérée : 0 % · Note : 0,0 /20</span></div>'+ 
  '<div class="progressbar"><div id="bac-eval-progress" class="progressin"></div></div><div id="bac-eval-question"></div><div class="toolbar"><button type="button" class="btn blue hidden" id="bac-eval-next">Question suivante →</button></div><div id="bac-eval-result" class="result hidden"></div>'+ 
  '<div class="fmn-bottom-prev"><button type="button" class="btn light" id="bac-bottom-prev-eval">← Précédent</button></div></div>';
 function bacReturnFromEvaluation(){if(evaluationGuardActive){renderEvaluationLocked("retour volontaire avant la fin");return;}window.FIGAROMN_CURRENT_SEQUENCE=ev.sequence;activeSequence=ev.sequence;rebuildEvaluations();show("evaluations");}
 $("bac-back-eval").onclick=bacReturnFromEvaluation;var bp=$("bac-bottom-prev-eval");if(bp)bp.onclick=bacReturnFromEvaluation;
 var qbox=$("bac-eval-question"),next=$("bac-eval-next");
 var evaluationGuardActive=true,evaluationGuardTriggered=false;
 function removeEvaluationGuard(){
  document.removeEventListener("visibilitychange",onEvaluationVisibility,true);
  window.removeEventListener("pagehide",onEvaluationPageHide,true);
  root.removeEventListener("click",onEvaluationNavigation,true);
 }
 function renderEvaluationLocked(reason){
  if(evaluationGuardTriggered)return;
  evaluationGuardTriggered=true;evaluationGuardActive=false;
  evaluationGuardLock(ev,reason,{question_no:current+1,question_total:ev.questions.length});
  removeEvaluationGuard();
  detail.innerHTML='<div class="content-box"><h2>⛔ Évaluation bloquée</h2>'+ 
   '<p><strong>Une sortie de l’évaluation a été détectée et un signalement a été envoyé à l’enseignant.</strong></p>'+ 
   '<p>La tentative en cours est annulée.</p>'+ 
   '<p><strong>En attente de l’autorisation de l’enseignant…</strong> Dès qu’il clique sur « Autoriser à recommencer », cette même évaluation redémarrera automatiquement depuis le début, sans ressaisir le code.</p>'+ 
   '<div class="msg" id="bac-integrity-wait" aria-live="polite">Vérification automatique de l’autorisation toutes les 3 secondes.</div>'+ 
   '<div class="toolbar"><button type="button" class="btn blue" id="bac-check-auth-now">↻ Vérifier maintenant</button><button type="button" class="btn red" id="bac-locked-back">← Retour aux évaluations</button></div></div>';
  var authPollStopped=false,authPollBusy=false,authPollTimer=null;
  async function checkTeacherAuthorization(auto){
   if(authPollStopped||authPollBusy)return false;authPollBusy=true;
   var wait=$("bac-integrity-wait"),check=$("bac-check-auth-now");if(check&&!auto){check.disabled=true;check.textContent="Vérification…";}
   try{
    var ok=await evaluationIntegrityCheckAuthorization(ev);
    if(ok){authPollStopped=true;if(authPollTimer)clearInterval(authPollTimer);if(wait){wait.textContent="✅ Reprise autorisée. Redémarrage de l’évaluation…";wait.className="msg ok";}setTimeout(function(){openEvaluation(ev,true);},350);return true;}
    if(wait&&!auto)wait.textContent="⏳ L’enseignant n’a pas encore autorisé la reprise.";
   }finally{authPollBusy=false;if(check&&!authPollStopped){check.disabled=false;check.textContent="↻ Vérifier maintenant";}}
   return false;
  }
  var checkNow=$("bac-check-auth-now");if(checkNow)checkNow.onclick=function(){checkTeacherAuthorization(false);};
  authPollTimer=setInterval(function(){if(document.visibilityState!=="hidden")checkTeacherAuthorization(true);},3000);
  checkTeacherAuthorization(true);
  var back=$("bac-locked-back");if(back)back.onclick=function(){authPollStopped=true;if(authPollTimer)clearInterval(authPollTimer);window.FIGAROMN_CURRENT_SEQUENCE=ev.sequence;activeSequence=ev.sequence;rebuildEvaluations();show("evaluations");};
 }
 function onEvaluationVisibility(){if(evaluationGuardActive&&document.visibilityState==="hidden")renderEvaluationLocked("changement d’onglet ou fenêtre masquée");}
 function onEvaluationPageHide(){if(evaluationGuardActive){evaluationGuardLock(ev,"fermeture, actualisation ou navigation hors de la page",{question_no:current+1,question_total:ev.questions.length});evaluationGuardActive=false;}}
 function onEvaluationNavigation(e){
  if(!evaluationGuardActive)return;
  var t=e.target&&e.target.closest?e.target.closest("button[data-view],a[href]"):null;
  if(!t||detail.contains(t))return;
  e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
  renderEvaluationLocked("navigation vers une autre rubrique");
 }
 document.addEventListener("visibilitychange",onEvaluationVisibility,true);
 window.addEventListener("pagehide",onEvaluationPageHide,true);
 root.addEventListener("click",onEvaluationNavigation,true);
 function update(){
  var pct=Math.round(score/ev.questions.length*1000)/10;
  $("bac-eval-score").textContent="Réussite pondérée : "+fr(pct)+" % · Note : "+fr(note20(score,ev.questions.length))+" /20";
  liveAgg=currentAttemptIndicatorAggregate(ev.questions,responses,true);
 }
 function renderQ(){
  answered=false;var q=ev.questions[current];mixed=mixedWeightedEvaluationOptions(q,evalCorrectPositions[current]);
  $("bac-eval-counter").textContent="Question "+(current+1)+" / "+ev.questions.length;
  $("bac-eval-progress").style.width=Math.round(current/ev.questions.length*100)+"%";
  qbox.innerHTML='<div class="q-card"><span class="question-skill">Compétence évaluée : '+esc((q.comps||[]).join(" · "))+'</span>'+questionIndicatorRefsHTML(q)+'<strong>'+esc(q.q)+'</strong><div class="answers">'+mixed.map(function(o){return '<button type="button" class="answer" data-choice="'+o.originalIndex+'" data-credit="'+o.percent+'">'+esc(o.label)+'</button>';}).join("")+'</div><div class="feedback hidden"></div></div>';
  next.classList.add("hidden");update();
 }
 qbox.onclick=function(e){
  var b=e.target.closest("[data-credit]");if(!b||answered)return;answered=true;
  var q=ev.questions[current],choice=Number(b.dataset.choice),pct=Number(b.dataset.credit)||20,credit=evaluationCreditValue(pct);
  qbox.querySelectorAll(".answer").forEach(function(x){x.disabled=true;if(Number(x.dataset.credit)===100)x.classList.add("good");});
  if(pct<100)b.classList.add("partial");score+=credit;
  responses[current]={qi:current,choice:choice,correct:pct===100,percent:pct,credit:credit,label:b.textContent};
  var fb=qbox.querySelector(".feedback");fb.classList.remove("hidden");fb.classList.add("credit");fb.textContent=evaluationCreditLabel(pct);
  update();next.classList.remove("hidden");next.textContent=current===ev.questions.length-1?"Voir mon résultat":"Question suivante →";
 };
 next.onclick=async function(){
  if(!answered)return;
  if(current<ev.questions.length-1){current++;renderQ();return;}
  evaluationGuardActive=false;removeEvaluationGuard();evaluationGuardClear(ev);
  qbox.innerHTML="";next.classList.add("hidden");$("bac-eval-progress").style.width="100%";
  var resultBox=$("bac-eval-result");resultBox.classList.remove("hidden");resultBox.innerHTML="<h3>Enregistrement automatique…</h3>";
  try{
   var result=await saveAttempt("evaluation",ev,responses,score),agg=currentAttemptIndicatorAggregate(ev.questions,responses,true);
   resultBox.innerHTML='<h3>Évaluation terminée</h3><p>Réussite pondérée : <strong>'+fr(result.percent)+' %</strong></p><p>Note automatique : <span class="note20">'+fr(result.note20)+' / 20</span></p><p class="small">Barème progressif : chaque réponse vaut 20 %, 40 %, 60 % ou 100 % des points selon sa pertinence.</p><p>Tentative enregistrée : <strong>n°'+result.attemptNo+'</strong></p>'+ 
    '<h3>📊 Synthèse des compétences</h3><p class="small">Les compétences et indicateurs sont présentés uniquement après la dernière question. Ils utilisent le même crédit partiel que la note.</p>'+indicatorAcquisitionHTML(agg,ev.comps,'Résultat pondéré de cette évaluation : points obtenus / points possibles par indicateur.')+
    '<div class="toolbar"><button type="button" class="btn light" disabled>✅ Tentative synchronisée</button><button type="button" class="btn green" id="bac-pdf-eval">🖨️ Enregistrer en PDF avec réponses</button><button type="button" class="btn blue" id="bac-history-eval-now">📚 Historique complet</button></div>';
   $("bac-pdf-eval").onclick=function(){printReport(ev.title,ev,result,responses);};$("bac-history-eval-now").onclick=function(){showHistory("evaluation",ev);};rebuildExercises();rebuildEvaluations();
  }catch(e){resultBox.innerHTML='<h3>Évaluation terminée</h3><p class="badmsg">Synchronisation impossible : '+esc(e.message)+'</p>';}
 };
 renderQ();show("evaluation-detail");
}
async function init(){
 try{
  await ensureReady();
  await evaluationIntegrityFlushPending();
  await evaluationIntegrityReconcileLocks();
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

  // S'assurer que l'élève arrive bien au début du détail de l'exercice.
  setTimeout(function(){
   var detail=$("fmn-view-exercise-detail");
   if(detail&&!detail.classList.contains("hidden")){
    detail.scrollIntoView({behavior:"smooth",block:"start"});
   }
  },80);
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