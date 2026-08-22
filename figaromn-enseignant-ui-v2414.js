/* FIGAROMN V24.14 — Routeur de l'espace Enseignant */
(function(){
  "use strict";
  var modules={
    students:{icon:"👥",title:"Suivi des élèves",description:"Progression, exercices, évaluations, compétences et observations pédagogiques."},
    classes:{icon:"🏫",title:"Classes & appel",description:"Gestion des classes, rattachement des élèves, appel, absences et retards."},
    cahier:{icon:"📘",title:"Cahier de texte",description:"Préparation du contenu ÉcoleDirecte et historique des séances renseignées."},
    cerise:{icon:"🍒",title:"CERISE Pro",description:"Scénarios classés par niveau, séquence et séance, blocs de compétences et export .SCPRO."},
    parcours:{icon:"⚓",title:"Parcours pédagogiques",description:"Accès aux parcours CAP et BAC PRO sans mélanger les outils de suivi."}
  };
  function all(sel){return Array.prototype.slice.call(document.querySelectorAll(sel));}
  function byId(id){return document.getElementById(id);}
  function normalizeHash(){
    var h=(location.hash||"").replace(/^#/,"");
    if(h==="ceriseProSection"||h==="cerise")return "cerise";
    if(h==="cahierTexteCard"||h==="cahier")return "cahier";
    if(h==="attendanceCard"||h==="classes")return "classes";
    if(h==="teacherStudentsList"||h==="students")return "students";
    if(h==="teacherParcoursSection"||h==="parcours")return "parcours";
    if(h.indexOf("enseignant-")===0)return h.slice("enseignant-".length);
    return modules[h]?h:"";
  }
  function setHash(key){
    var u=location.pathname+location.search+(key?"#enseignant-"+key:"");
    history.replaceState(null,"",u);
  }
  function openModule(key,opts){
    opts=opts||{};
    if(!modules[key])return showDashboard(opts);
    document.body.classList.add("teacher-module-open");
    var home=byId("teacherHome"),head=byId("teacherModuleHeader");
    if(home)home.hidden=true;
    if(head)head.hidden=false;
    all(".teacher-tool").forEach(function(el){el.classList.toggle("teacher-tool-active",el.getAttribute("data-teacher-module")===key);});
    all("[data-open-module]").forEach(function(el){el.classList.toggle("active",el.getAttribute("data-open-module")===key);});
    var m=modules[key];
    if(byId("teacherCurrentIcon"))byId("teacherCurrentIcon").textContent=m.icon;
    if(byId("teacherCurrentTitle"))byId("teacherCurrentTitle").textContent=m.title;
    if(byId("teacherCurrentDescription"))byId("teacherCurrentDescription").textContent=m.description;
    if(!opts.keepHash)setHash(key);
    decorateBlocks();
    decorateCeriseOpenLinks();
    var target=(key==="cerise")?byId("ceriseProSection"):head;
    if(target&&!opts.noScroll)setTimeout(function(){target.scrollIntoView({behavior:"smooth",block:"start"});},30);
  }
  function showDashboard(opts){
    opts=opts||{};
    document.body.classList.remove("teacher-module-open");
    var home=byId("teacherHome"),head=byId("teacherModuleHeader");
    if(home)home.hidden=false;
    if(head)head.hidden=true;
    all(".teacher-tool").forEach(function(el){el.classList.remove("teacher-tool-active");});
    all("[data-open-module]").forEach(function(el){el.classList.remove("active");});
    if(!opts.keepHash)setHash("");
    if(home&&!opts.noScroll)setTimeout(function(){home.scrollIntoView({behavior:"smooth",block:"start"});},20);
  }
  function decorateBlocks(){
    all(".fmncer-pill").forEach(function(p){
      var t=(p.textContent||"").trim();
      if(/^Bloc\s+[123]\b/i.test(t))p.classList.add("fmncer-block-pill");
    });
  }

  function ceriseAddFrom(url){
    url=String(url||"");
    if(!url)return url;
    if(/(?:\?|&)from=cerise(?:&|$)/.test(url))return url;
    return url+(url.indexOf("?")>=0?"&":"?")+"from=cerise";
  }
  function decorateCeriseOpenLinks(){
    all("#fmncer-levels .fmncer-session").forEach(function(row){
      var a=row.querySelector(".fmncer-actions a.fmncer-btn.secondary");
      if(!a)return;
      var level=row.closest(".fmncer-level");
      var seq=row.closest(".fmncer-seq");
      var levelTitle=level&&level.querySelector(".fmncer-level-head h3")?level.querySelector(".fmncer-level-head h3").textContent:"";
      var seqText=seq&&seq.querySelector("summary")?seq.querySelector("summary").textContent:"";
      var sessText=row.querySelector(".fmncer-session-title")?row.querySelector(".fmncer-session-title").textContent:"";
      var sm=seqText.match(/Séquence\s+(\d+)/i), nm=sessText.match(/Séance\s+(\d+)/i);
      if(!sm||!nm)return;
      var s=String(Number(sm[1])).padStart(2,"0"), n=String(Number(nm[1])).padStart(2,"0");
      if(/CAP\s+Maintenance|CAP\s+MN|^CAP\b/i.test(levelTitle.trim())){
        a.href="cap-cerise-s"+s+"-se"+n+".html?from=cerise";
      }else{
        a.href=ceriseAddFrom(a.getAttribute("href"));
      }
      a.removeAttribute("target");
      a.removeAttribute("rel");
      a.setAttribute("title","Visualiser la fiche pédagogique sans écran d’identification");
    });
  }

  function init(){
    all("[data-open-module]").forEach(function(btn){
      btn.addEventListener("click",function(){openModule(btn.getAttribute("data-open-module"));});
    });
    var back=byId("teacherBackDashboard");if(back)back.addEventListener("click",function(){showDashboard();});
    var first=normalizeHash();
    if(first)openModule(first,{keepHash:true,noScroll:true});else showDashboard({keepHash:true,noScroll:true});
    window.addEventListener("hashchange",function(){var k=normalizeHash();if(k)openModule(k,{keepHash:true});else showDashboard({keepHash:true});});
    decorateBlocks();
    decorateCeriseOpenLinks();
    var cer=byId("fmncer-levels");
    if(cer&&window.MutationObserver){new MutationObserver(function(){decorateBlocks();decorateCeriseOpenLinks();}).observe(cer,{childList:true,subtree:true});}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
