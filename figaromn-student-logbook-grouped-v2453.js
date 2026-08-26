/* FigaroMN V24.53 — historique du cahier de texte élève compact et rangé par séquence */
(function(){
  "use strict";
  if(window.FIGAROMN_STUDENT_LOGBOOK_GROUPED_V2453)return;
  window.FIGAROMN_STUDENT_LOGBOOK_GROUPED_V2453=true;

  var view=document.getElementById("fmn-view-logbook")||document.getElementById("capmn26-logbook");
  if(!view)return;

  function esc(v){
    return String(v==null?"":v).replace(/[&<>"']/g,function(m){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];
    });
  }
  function n(v,def){var x=parseInt(v,10);return isFinite(x)?x:(def||0);}
  function getSequenceTitle(seq){
    try{
      var cfg=window.FIGAROMN_LEVEL_CONFIG;
      if(cfg&&Array.isArray(cfg.sequences)){
        var row=cfg.sequences.find(function(s){return n(s&&s.no)===seq;});
        if(row&&row.title)return String(row.title);
      }
    }catch(e){}
    return "";
  }
  function parseEntry(article,index){
    var meta=article.querySelector(".fmn-log-entry-meta");
    var title=article.querySelector(".fmn-log-entry-title");
    var metaText=String(meta&&meta.textContent||"").replace(/\s+/g," ").trim();
    var titleText=String(title&&title.textContent||"").replace(/\s+/g," ").trim();
    var sm=metaText.match(/Séquence\s+(\d+)/i);
    var sem=metaText.match(/Séance\s+(\d+)/i);
    var dm=metaText.match(/(\d{2}\/\d{2}\/\d{4})/);
    var seq=sm?n(sm[1],999):999;
    var ses=sem?n(sem[1],999):999;
    var shortTitle=titleText;
    var tail=titleText.match(/Séance\s+\d+\s*[:\-–—]\s*(.+)$/i);
    if(tail&&tail[1])shortTitle=tail[1].trim();
    if(!shortTitle)shortTitle="Séance "+(ses===999?"":ses);
    return {article:article,index:index,seq:seq,ses:ses,date:dm?dm[1]:"",title:shortTitle,meta:metaText};
  }
  function makeSession(item){
    var d=document.createElement("details");
    d.className="fmn-history-session";
    d.dataset.session=String(item.ses===999?"":item.ses);
    var summary=document.createElement("summary");
    summary.innerHTML='<span class="fmn-history-session-main"><strong>'+esc(item.ses===999?"Séance":"Séance "+item.ses)+'</strong><span>'+esc(item.title)+'</span></span>'+
      '<span class="fmn-history-session-date">'+esc(item.date||"")+'</span>';
    d.appendChild(summary);
    var body=document.createElement("div");
    body.className="fmn-history-session-body";
    item.article.classList.add("fmn-history-original-entry");
    body.appendChild(item.article);
    d.appendChild(body);
    return d;
  }
  function compactHistory(){
    var list=view.querySelector(".fmn-history-list");
    if(!list||list.dataset.fmnGroupedV2453==="1")return;
    var direct=[];
    Array.prototype.forEach.call(list.children,function(el){
      if(el.classList&&el.classList.contains("fmn-log-entry"))direct.push(el);
    });
    if(!direct.length)return;
    list.dataset.fmnGroupedV2453="1";

    var items=direct.map(parseEntry);
    var groups={};
    items.forEach(function(item){
      var key=String(item.seq);
      if(!groups[key])groups[key]=[];
      groups[key].push(item);
    });
    Object.keys(groups).forEach(function(key){
      groups[key].sort(function(a,b){
        if(a.ses!==b.ses)return a.ses-b.ses;
        return a.index-b.index;
      });
    });

    list.innerHTML="";
    list.classList.add("fmn-history-grouped-list");
    Object.keys(groups).map(Number).sort(function(a,b){return a-b;}).forEach(function(seq){
      var rows=groups[String(seq)];
      var d=document.createElement("details");
      d.className="fmn-history-sequence";
      d.dataset.sequence=String(seq);
      var title=getSequenceTitle(seq);
      var summary=document.createElement("summary");
      summary.innerHTML='<span class="fmn-history-seq-left"><span class="fmn-history-seq-num">'+esc(seq===999?"?":seq)+'</span><span><strong>'+esc(seq===999?"Autres séances":"Séquence "+seq)+'</strong>'+
        (title?'<small>'+esc(title)+'</small>':"")+'</span></span>'+
        '<span class="fmn-history-seq-count">'+rows.length+' séance'+(rows.length>1?'s':'')+'</span>';
      d.appendChild(summary);
      var body=document.createElement("div");
      body.className="fmn-history-sequence-body";
      rows.forEach(function(item){body.appendChild(makeSession(item));});
      d.appendChild(body);
      list.appendChild(d);
    });

    var card=list.closest(".fmn-history-card");
    var head=card&&card.querySelector(".fmn-history-head");
    if(head&&!head.querySelector("[data-fmn-history-actions]")){
      var actions=document.createElement("div");
      actions.className="fmn-history-actions";
      actions.setAttribute("data-fmn-history-actions","1");
      actions.innerHTML='<button type="button" data-fmn-history-expand>Tout ouvrir</button><button type="button" data-fmn-history-collapse>Tout réduire</button>';
      head.appendChild(actions);
      var countChip=head.querySelector(".fmn-logbook-chip");
      if(countChip)countChip.classList.add("fmn-history-total-chip");
      actions.querySelector("[data-fmn-history-expand]").addEventListener("click",function(){
        list.querySelectorAll("details.fmn-history-sequence").forEach(function(x){x.open=true;});
      });
      actions.querySelector("[data-fmn-history-collapse]").addEventListener("click",function(){
        list.querySelectorAll("details").forEach(function(x){x.open=false;});
      });
    }
  }
  function installStyle(){
    if(document.getElementById("fmn-history-v2453-style"))return;
    var s=document.createElement("style");
    s.id="fmn-history-v2453-style";
    s.textContent=`
:is(#fmn-level-master,#capmn26-master) .fmn-history-head{align-items:center}
:is(#fmn-level-master,#capmn26-master) .fmn-history-actions{display:flex;gap:7px;flex-wrap:wrap;margin-left:auto}
:is(#fmn-level-master,#capmn26-master) .fmn-history-actions button{border:0;border-radius:9px;padding:8px 10px;background:#e8f2f5;color:var(--navy);font-size:12px;font-weight:900;cursor:pointer}
:is(#fmn-level-master,#capmn26-master) .fmn-history-grouped-list{display:grid;gap:9px}
:is(#fmn-level-master,#capmn26-master) .fmn-history-sequence{border:1px solid var(--border);border-radius:13px;background:#fff;overflow:hidden}
:is(#fmn-level-master,#capmn26-master) .fmn-history-sequence>summary{list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;cursor:pointer;background:#f5f9fa;color:var(--navy)}
:is(#fmn-level-master,#capmn26-master) .fmn-history-sequence>summary::-webkit-details-marker,
:is(#fmn-level-master,#capmn26-master) .fmn-history-session>summary::-webkit-details-marker{display:none}
:is(#fmn-level-master,#capmn26-master) .fmn-history-sequence>summary:after{content:'▾';font-weight:900;transition:transform .15s ease}
:is(#fmn-level-master,#capmn26-master) .fmn-history-sequence[open]>summary:after{transform:rotate(180deg)}
:is(#fmn-level-master,#capmn26-master) .fmn-history-seq-left{display:flex;align-items:center;gap:10px;min-width:0;flex:1}
:is(#fmn-level-master,#capmn26-master) .fmn-history-seq-left small{display:block;margin-top:2px;color:var(--muted);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:620px}
:is(#fmn-level-master,#capmn26-master) .fmn-history-seq-num{display:inline-flex;width:31px;height:31px;border-radius:50%;align-items:center;justify-content:center;background:var(--navy);color:#fff;font-weight:900;flex:0 0 auto}
:is(#fmn-level-master,#capmn26-master) .fmn-history-seq-count{margin-left:auto;padding:5px 8px;border-radius:999px;background:#e9f2f4;color:#355363;font-size:11px;font-weight:900;white-space:nowrap}
:is(#fmn-level-master,#capmn26-master) .fmn-history-sequence-body{padding:8px 10px 10px;display:grid;gap:7px;background:#fff}
:is(#fmn-level-master,#capmn26-master) .fmn-history-session{border:1px solid #dbe5e8;border-radius:10px;overflow:hidden}
:is(#fmn-level-master,#capmn26-master) .fmn-history-session>summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 11px;cursor:pointer;background:#fff}
:is(#fmn-level-master,#capmn26-master) .fmn-history-session>summary:hover{background:#f8fbfc}
:is(#fmn-level-master,#capmn26-master) .fmn-history-session-main{display:flex;align-items:baseline;gap:8px;min-width:0}
:is(#fmn-level-master,#capmn26-master) .fmn-history-session-main>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)}
:is(#fmn-level-master,#capmn26-master) .fmn-history-session-date{font-size:11px;color:var(--muted);font-weight:800;white-space:nowrap}
:is(#fmn-level-master,#capmn26-master) .fmn-history-session-body{padding:0 10px 10px;background:#fff}
:is(#fmn-level-master,#capmn26-master) .fmn-history-original-entry{margin:0!important;border:0!important;border-top:1px dashed #dbe5e8!important;border-radius:0!important;padding:11px 0 0!important}
:is(#fmn-level-master,#capmn26-master) .fmn-history-original-entry .fmn-log-entry-head{display:none!important}
@media(max-width:700px){
 :is(#fmn-level-master,#capmn26-master) .fmn-history-head{align-items:flex-start}
 :is(#fmn-level-master,#capmn26-master) .fmn-history-actions{width:100%;margin-left:0}
 :is(#fmn-level-master,#capmn26-master) .fmn-history-sequence>summary{padding:10px}
 :is(#fmn-level-master,#capmn26-master) .fmn-history-seq-left small{max-width:210px}
 :is(#fmn-level-master,#capmn26-master) .fmn-history-session>summary{align-items:flex-start;flex-direction:column;gap:3px}
 :is(#fmn-level-master,#capmn26-master) .fmn-history-session-main{width:100%;display:block}
 :is(#fmn-level-master,#capmn26-master) .fmn-history-session-main strong{display:block;margin-bottom:2px}
}
`;
    document.head.appendChild(s);
  }
  var timer=0;
  function schedule(){
    clearTimeout(timer);
    timer=setTimeout(compactHistory,70);
  }
  function init(){
    installStyle();
    schedule();
    new MutationObserver(function(mutations){
      var relevant=mutations.some(function(m){
        return Array.prototype.some.call(m.addedNodes||[],function(node){
          return node.nodeType===1 && (node.matches&&node.matches('.fmn-history-list,.fmn-history-card,.fmn-log-entry') || node.querySelector&&node.querySelector('.fmn-history-list'));
        });
      });
      if(relevant)schedule();
    }).observe(view,{childList:true,subtree:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
