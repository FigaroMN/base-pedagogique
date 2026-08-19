(function(){
"use strict";
if(!window.FigaroCloud)return;

function esc(v){
 return String(v==null?"":v).replace(/[&<>"']/g,function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c];
 });
}
function context(){
 var m=(location.pathname||"").match(/(seconde|premiere|terminale)-periode-(\d+)-seance-(\d+)\.html/i);
 if(!m)return null;
 return {level:m[1].toLowerCase(),sequence:Number(m[2]),sessionNo:Number(m[3])};
}
function criteriaOnPage(){
 var out={}, order=[];
 document.querySelectorAll(".track[data-comp]").forEach(function(track){
  var code=track.getAttribute("data-comp");
  if(!code)return;
  if(!out[code]){out[code]=[];order.push(code);}
  track.querySelectorAll("label.criterion").forEach(function(lab){
   var text=(lab.textContent||"").replace(/\s+/g," ").trim();
   if(text && out[code].indexOf(text)===-1)out[code].push(text);
  });
 });
 return {byComp:out,order:order};
}
function mappingForQuestions(total,ctx,cat){
 var map=[];
 if(!cat.order.length)return map;
 for(var i=0;i<total;i++){
  var code=cat.order[(i+ctx.sessionNo-1)%cat.order.length];
  var labels=cat.byComp[code]||[];
  if(!labels.length){map.push(null);continue;}
  var idx=(i+ctx.sequence+ctx.sessionNo-2)%labels.length;
  map.push({competency:code,index:idx+1,label:labels[idx]});
 }
 return map;
}
function levelInfo(pct){
 if(pct>=85)return {level:4,label:"Maîtrisé"};
 if(pct>=70)return {level:3,label:"Acquis"};
 if(pct>=50)return {level:2,label:"En cours d'acquisition"};
 return {level:1,label:"Non acquis"};
}
function ensureStatusBox(box){
 var el=box.querySelector(".fmn-auto-indicators");
 if(el)return el;
 el=document.createElement("div");
 el.className="fmn-auto-indicators";
 el.style.cssText="margin-top:14px;padding:12px;border:1px solid #d9e6ea;border-radius:12px;background:#eef6f8;font-size:13px;line-height:1.5";
 el.innerHTML="<strong>🎯 Indicateurs automatiques</strong><div class='fmn-auto-indicators-body'>Ils seront calculés à la fin de l'exercice.</div>";
 box.appendChild(el);
 return el;
}
async function saveExerciseAttempt(payload){
 var ctx=context(); if(!ctx || !payload || !payload.box)return;
 var box=payload.box, status=ensureStatusBox(box), body=status.querySelector(".fmn-auto-indicators-body");
 try{
  var sess=FigaroCloud.session&&FigaroCloud.session();
  if(!sess||!sess.access_token){body.textContent="Connecte-toi pour synchroniser les indicateurs.";return;}
  var p=await FigaroCloud.profile();
  if(!p||p.role!=="student"||p.archived_at){body.textContent="Suivi automatique réservé au compte élève actif.";return;}
  var rows=await FigaroCloud.table("sessions",
    "level=eq."+ctx.level+"&period=eq."+ctx.sequence+"&session_no=eq."+ctx.sessionNo+"&select=id,title");
  if(!rows||!rows[0]){body.textContent="Séance absente de Supabase.";return;}
  var session=rows[0], total=Number(payload.total)||0, score=Number(payload.score)||0;
  var percent=total?Math.round((score/total)*1000)/10:0;
  var prev=await FigaroCloud.table("activity_attempts",
    "student_id=eq."+p.id+"&session_id=eq."+session.id+"&activity_type=eq.exercise&select=attempt_no&order=attempt_no.desc&limit=1");
  var attemptNo=prev&&prev[0]?Number(prev[0].attempt_no)+1:1;
  var cat=criteriaOnPage(), map=mappingForQuestions(total,ctx,cat);
  var attemptRows=await FigaroCloud.table("activity_attempts","",{
    method:"POST",
    headers:{"Prefer":"return=representation"},
    body:JSON.stringify({
      student_id:p.id,session_id:session.id,activity_type:"exercise",attempt_no:attemptNo,
      score:score,total:total,percent:percent,
      details:{
        source:"FigaroMN HTML",
        level:ctx.level,sequence:ctx.sequence,session_no:ctx.sessionNo,
        answers:(payload.answers||[]).map(function(x){return !!x;}),
        mapping:map
      },
      completed_at:new Date().toISOString()
    })
  });
  var attempt=Array.isArray(attemptRows)?attemptRows[0]:null;
  if(!attempt||!attempt.id){body.textContent="Tentative enregistrée, mais détail indicateurs indisponible.";return;}

  var agg={};
  map.forEach(function(m,i){
    if(!m)return;
    var key=m.competency+"|"+m.index;
    if(!agg[key])agg[key]={m:m,good:0,total:0};
    agg[key].total++;
    if(payload.answers&&payload.answers[i]===true)agg[key].good++;
  });
  var indicatorRows=Object.keys(agg).map(function(k){
    var a=agg[k], pct=a.total?Math.round(a.good/a.total*1000)/10:0;
    return {
      attempt_id:attempt.id,student_id:p.id,session_id:session.id,
      competency_code:a.m.competency,indicator_index:a.m.index,indicator_label:a.m.label,
      correct_count:a.good,question_count:a.total,percent:pct,completed_at:new Date().toISOString()
    };
  });
  if(indicatorRows.length){
    await FigaroCloud.table("indicator_results","",{
      method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify(indicatorRows)
    });
  }

  var comps=[].concat.apply([],map.filter(Boolean).map(function(m){return [m.competency];}))
    .filter(function(v,i,a){return a.indexOf(v)===i;});
  var statuses=[];
  if(comps.length){
    try{
      statuses=await FigaroCloud.table("competency_auto_status",
        "student_id=eq."+p.id+"&competency_code=in.("+comps.join(",")+")&select=competency_code,percent,acquisition_label,indicators_positioned,indicators_required,is_complete");
    }catch(e){}
  }
  var indicatorHtml=indicatorRows.map(function(r){
    return "<div><strong>"+esc(r.competency_code)+"-I"+r.indicator_index+"</strong> · "+esc(r.indicator_label)+" : "+r.percent+" %</div>";
  }).join("");
  var statusHtml=(statuses||[]).map(function(s){
    return "<div style='margin-top:6px'><strong>"+esc(s.competency_code)+"</strong> : "+
      (s.is_complete?(esc(s.acquisition_label)+" · "+s.percent+" %")
       :("À positionner · "+s.indicators_positioned+"/"+s.indicators_required+" indicateurs"))+"</div>";
  }).join("");
  body.innerHTML="<div><strong>Tentative "+attemptNo+" synchronisée · "+score+"/"+total+" ("+percent+" %)</strong></div>"+
    indicatorHtml+statusHtml+
    "<small style='display:block;margin-top:7px;color:#607680'>Le rattachement question → indicateur est pédagogique. Le calcul de compétence n'est finalisé automatiquement que lorsque tous les indicateurs requis ont été positionnés.</small>";
 }catch(e){
  body.textContent="Suivi détaillé indisponible : "+e.message+". Exécute MIGRATION-SUIVI-AUTO-INDICATEURS.sql dans Supabase.";
 }
}
window.FigaroTracking={saveExerciseAttempt:saveExerciseAttempt,context:context};
})();