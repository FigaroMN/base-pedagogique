/* FIGAROMN V24.15 — Routeur de l'espace Enseignant + accordéon CERISE Pro */
(function(){
  "use strict";
  var modules={
    students:{icon:"👥",title:"Suivi des élèves",description:"Progression, exercices, évaluations, compétences et observations pédagogiques."},
    classes:{icon:"🏫",title:"Classes & appel",description:"Gestion des classes, rattachement des élèves, appel, absences et retards."},
    cahier:{icon:"📘",title:"Cahier de texte",description:"Préparation du contenu ÉcoleDirecte et historique des séances renseignées."},
    cerise:{icon:"🍒",title:"CERISE Pro",description:"Scénarios classés par niveau, puis par séquence déroulante et séance, avec blocs de compétences et export .SCPRO."},
    parcours:{icon:"⚓",title:"Parcours pédagogiques",description:"Accès aux parcours CAP et BAC PRO sans mélanger les outils de suivi."}
  };
  var ceriseBulkUntil=0;
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
    prepareCeriseAccordion();
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

  function searchIsActive(){
    var s=byId("fmncer-search");
    return !!(s&&String(s.value||"").trim());
  }
  function updateAccordionSummary(detail){
    var summary=detail&&detail.querySelector("summary");
    if(!summary)return;
    summary.setAttribute("aria-expanded",detail.open?"true":"false");
    summary.setAttribute("title",detail.open?"Cliquer pour masquer les séances":"Cliquer pour afficher les séances");
  }
  function closeSiblingSequences(detail){
    if(!detail||Date.now()<ceriseBulkUntil||!detail.open)return;
    var level=detail.closest(".fmncer-level");
    if(!level)return;
    Array.prototype.slice.call(level.querySelectorAll(".fmncer-seq")).forEach(function(other){
      if(other!==detail&&other.open){other.open=false;updateAccordionSummary(other);}
    });
  }
  function setAllSequences(open){
    ceriseBulkUntil=Date.now()+650;
    all("#fmncer-levels .fmncer-seq").forEach(function(d){d.open=!!open;updateAccordionSummary(d);});
  }
  function ensureAccordionControls(){
    var host=byId("fmncer-levels");
    if(!host||byId("fmncer-accordion-controls"))return;
    var box=document.createElement("div");
    box.id="fmncer-accordion-controls";
    box.className="fmncer-accordion-controls";
    box.innerHTML='<div class="fmncer-accordion-help"><span aria-hidden="true">▸</span><span><strong>Séquences repliables :</strong> cliquez sur une séquence pour afficher ses 6 séances.</span></div>'+
      '<div class="fmncer-accordion-buttons"><button type="button" class="fmncer-accordion-btn" id="fmncer-collapse-all">Tout replier</button><button type="button" class="fmncer-accordion-btn primary" id="fmncer-expand-all">Tout déplier</button></div>';
    host.parentNode.insertBefore(box,host);
    byId("fmncer-collapse-all").addEventListener("click",function(){setAllSequences(false);});
    byId("fmncer-expand-all").addEventListener("click",function(){setAllSequences(true);});
  }
  function prepareCeriseAccordion(){
    ensureAccordionControls();
    var hasSearch=searchIsActive();
    all("#fmncer-levels .fmncer-seq").forEach(function(detail){
      if(!detail.dataset.fmnAccordionReady){
        detail.dataset.fmnAccordionReady="1";
        /* Sans recherche, toutes les séquences sont repliées pour donner une vue claire des 7 séquences. */
        detail.open=hasSearch;
        detail.addEventListener("toggle",function(){
          updateAccordionSummary(detail);
          if(detail.open&&!searchIsActive())closeSiblingSequences(detail);
        });
      }else if(hasSearch){
        /* Pendant une recherche, ouvrir automatiquement les séquences qui contiennent les résultats. */
        detail.open=true;
      }
      updateAccordionSummary(detail);
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
    prepareCeriseAccordion();
    var search=byId("fmncer-search");
    if(search){search.addEventListener("input",function(){setTimeout(prepareCeriseAccordion,0);});}
    var level=byId("fmncer-level-filter");
    if(level){level.addEventListener("change",function(){setTimeout(prepareCeriseAccordion,0);});}
    var cer=byId("fmncer-levels");
    if(cer&&window.MutationObserver){
      new MutationObserver(function(){decorateBlocks();decorateCeriseOpenLinks();prepareCeriseAccordion();}).observe(cer,{childList:true,subtree:true});
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
