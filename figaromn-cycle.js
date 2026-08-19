
(function(){
"use strict";
var root=document.getElementById("fmn-cycle-master");
if(!root || !window.FIGAROMN_CYCLE_DATA)return;

var DATA=window.FIGAROMN_CYCLE_DATA;
var currentYear="cycle";
var currentView="home";
var viewEls={
 home:root.querySelector("#fmn-view-home"),
 courses:root.querySelector("#fmn-view-courses"),
 exercises:root.querySelector("#fmn-view-exercises"),
 evaluations:root.querySelector("#fmn-view-evaluations"),
 skills:root.querySelector("#fmn-view-skills")
};

function esc(v){
 return String(v==null?"":v).replace(/[&<>"']/g,function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
 });
}
function jget(key,def){
 try{
  var x=localStorage.getItem(key);
  return x?JSON.parse(x):def;
 }catch(e){return def;}
}
function jset(key,val){
 try{localStorage.setItem(key,JSON.stringify(val));}catch(e){}
}
function student(){
 return jget("fmn_student",{})||{};
}
function studentName(){
 return (student().name||"sans_nom").trim()||"sans_nom";
}
function years(){
 if(currentYear==="cycle")return ["seconde","premiere","terminale"];
 return [currentYear];
}
function yearLabel(y){return DATA.years[y].label;}
function notesFor(y){
 return jget("fmn_notes|"+y+"|"+studentName(),{})||{};
}
function agendaFor(y){
 return jget("fmn_agenda_log_"+y,[])||[];
}
function periodState(y,pn){
 var notes=notesFor(y);
 var note=notes["p"+pn];
 var agenda=agendaFor(y).filter(function(x){return Number(x.period)===pn;});
 if(typeof note==="number")return {cls:"done",text:"✅ Évaluation enregistrée",note:note,activity:agenda.length};
 if(agenda.length)return {cls:"work",text:"🟠 En cours · "+agenda.length+" séance"+(agenda.length>1?"s":""),note:null,activity:agenda.length};
 return {cls:"todo",text:"À commencer",note:null,activity:0};
}
function periodCards(mode){
 var html="";
 years().forEach(function(y){
  DATA.years[y].periods.forEach(function(p,i){
   var st=periodState(y,i+1);
   var icon=mode==="courses"?"📘":mode==="exercises"?"📝":mode==="evaluations"?"✅":"⚓";
   var helper=mode==="courses"
    ?"Ouvrir la séquence : cours, TP, ressources et séances."
    :mode==="exercises"
     ?"Ouvrir la séquence pour accéder aux TP, exercices et widgets présents dans les séances."
     :"Ouvrir la séquence pour accéder aux évaluations protégées et aux résultats.";
   html+='<article class="menu-card">'+
    '<div><div class="top-icon">'+icon+'</div>'+
    '<span class="pill">'+esc(yearLabel(y))+'</span> <span class="pill">'+esc(p[0])+'</span>'+
    '<h3>'+esc(p[1])+'</h3><p>'+esc(helper)+'</p>'+
    '<span class="status '+st.cls+'">'+esc(st.text)+'</span>'+
    (st.note!==null?'<span class="pill">Note : '+esc(st.note)+' /20</span>':'')+
    '</div><div class="toolbar">'+
    '<a class="btn blue" href="'+esc(p[3])+'">Ouvrir la séquence</a>'+
    '<a class="btn light" href="'+esc(DATA.years[y].page)+'">Vue annuelle</a>'+
    '</div></article>';
  });
 });
 return html || '<div class="empty">Aucun contenu pour cette sélection.</div>';
}
function summaryStats(){
 var total=0,active=0,evaluated=0,sessions=0;
 years().forEach(function(y){
  DATA.years[y].periods.forEach(function(p,i){
   total++;
   var st=periodState(y,i+1);
   if(st.cls!=="todo")active++;
   if(st.note!==null)evaluated++;
   sessions+=st.activity;
  });
 });
 return {total:total,active:active,evaluated:evaluated,sessions:sessions};
}
function renderHome(){
 var s=summaryStats();
 root.querySelector("#fmn-stats").innerHTML=
  '<div class="stat"><span>Séquences affichées</span><strong>'+s.total+'</strong></div>'+
  '<div class="stat"><span>Séquences commencées</span><strong>'+s.active+'</strong></div>'+
  '<div class="stat"><span>Évaluations enregistrées</span><strong>'+s.evaluated+'</strong></div>'+
  '<div class="stat"><span>Séances tracées</span><strong>'+s.sessions+'</strong></div>';

 var html="";
 years().forEach(function(y){
  DATA.years[y].periods.forEach(function(p,i){
   var st=periodState(y,i+1);
   html+='<article class="step"><div class="num">'+(i+1)+'</div><div>'+
    '<span class="pill">'+esc(yearLabel(y))+'</span>'+
    '<h3>'+esc(p[0])+' – '+esc(p[1])+'</h3>'+
    '<p>6 séances · cours · TP · exercices · widgets · évaluation protégée.</p>'+
    '<span class="status '+st.cls+'">'+esc(st.text)+'</span>'+
    '<div class="toolbar"><a class="btn blue" href="'+esc(p[3])+'">Ouvrir</a>'+
    '<a class="btn light" href="'+esc(DATA.years[y].page)+'">Vue '+esc(yearLabel(y))+'</a></div>'+
    '</div></article>';
  });
 });
 root.querySelector("#fmn-progress-grid").innerHTML=html;
}
function renderMenuViews(){
 root.querySelector("#fmn-course-grid").innerHTML=periodCards("courses");
 root.querySelector("#fmn-exercise-grid").innerHTML=periodCards("exercises");
 root.querySelector("#fmn-eval-grid").innerHTML=periodCards("evaluations");
}
function latestTracks(){
 var name=studentName(),found={};
 for(var i=0;i<localStorage.length;i++){
  var k=localStorage.key(i);
  if(!k || k.indexOf("fmn_track|")!==0)continue;
  var parts=k.split("|");
  if(parts.length<6)continue;
  var y=parts[1],n=parts[2],code=parts[parts.length-1];
  if(n!==name)continue;
  if(currentYear!=="cycle" && y!==currentYear)continue;
  var d=jget(k,{});
  if(!d || (!d.level && !d.evidence))continue;
  var stamp=d.date||"";
  if(!found[code] || stamp>=found[code].date){
   found[code]={level:d.level||"",evidence:d.evidence||"",comment:d.comment||"",date:stamp,year:y};
  }
 }
 return found;
}
function renderSkills(){
 var latest=latestTracks();
 var rows=Object.keys(DATA.competencies).map(function(code){
  var d=latest[code];
  var evidence=d&&d.evidence?esc(d.evidence):"—";
  var level=d&&d.level?esc(d.level):"À positionner";
  return '<tr><td>'+esc(code)+'</td><td>'+esc(DATA.competencies[code])+'</td>'+
   '<td><span class="skill-badge '+(d?"ok":"")+'">'+level+'</span></td>'+
   '<td>'+evidence+'</td><td>'+(d?esc(yearLabel(d.year)):"—")+'</td></tr>';
 }).join("");
 root.querySelector("#fmn-skill-table-body").innerHTML=rows;
}
function renderIdentity(){
 var s=student();
 var inp=root.querySelector("#fmn-student");
 inp.value=s.name||"";
 root.querySelector("#fmn-class").textContent=s.class?("Classe enregistrée : "+s.class):"Aucune identité locale enregistrée.";
}
function saveIdentity(){
 var old=student();
 var name=root.querySelector("#fmn-student").value.trim();
 jset("fmn_student",{name:name,class:old.class||"",date:old.date||new Date().toISOString().slice(0,10)});
 renderAll();
 root.querySelector("#fmn-name-msg").textContent="✅ Enregistré";
 setTimeout(function(){root.querySelector("#fmn-name-msg").textContent="";},1600);
}
function showView(view){
 currentView=view;
 Object.keys(viewEls).forEach(function(k){viewEls[k].classList.add("hidden");});
 viewEls[view].classList.remove("hidden");
 root.querySelectorAll(".nav button").forEach(function(b){
  b.classList.toggle("active",b.getAttribute("data-view")===view);
 });
}
function setYear(y){
 currentYear=y;
 root.querySelectorAll(".year-nav button").forEach(function(b){
  b.classList.toggle("active",b.getAttribute("data-year")===y);
 });
 renderAll();
}
function renderAll(){
 renderIdentity();
 renderHome();
 renderMenuViews();
 renderSkills();
}

root.querySelectorAll(".nav button").forEach(function(b){
 b.addEventListener("click",function(){showView(b.getAttribute("data-view"));});
});
root.querySelectorAll(".year-nav button").forEach(function(b){
 b.addEventListener("click",function(){setYear(b.getAttribute("data-year"));});
});
root.querySelector("#fmn-save-name").addEventListener("click",saveIdentity);

renderAll();
showView("home");
})();
