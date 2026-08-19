
(function(){
"use strict";
const LINES=8;
const $=(r,s)=>r.querySelector(s), $$=(r,s)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function uid(){try{if(window.FIGAROMN_CAP_USER_ID)return String(window.FIGAROMN_CAP_USER_ID);if(window.FigaroCloud&&FigaroCloud.session){const s=FigaroCloud.session();if(s&&s.user&&s.user.id)return String(s.user.id)}}catch(e){}return"local"}
function key(level,doc,k){return"fmn_tools|"+uid()+"|"+level+"|"+doc+"|"+k}
function get(level,doc,k){try{return localStorage.getItem(key(level,doc,k))||""}catch(e){return""}}
function set(level,doc,k,v){try{localStorage.setItem(key(level,doc,k),v||"")}catch(e){}}
function clear(level,doc){try{const p="fmn_tools|"+uid()+"|"+level+"|"+doc+"|";Object.keys(localStorage).forEach(k=>{if(k.startsWith(p))localStorage.removeItem(k)})}catch(e){}}
function n(v){const x=Number(String(v||"").replace(",","."));return isFinite(x)?x:0}
function euro(v){return n(v).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" €"}

function header(prefix){return`
<div class="t-grid three">
<label><span>N° du document</span><input data-f="numero" placeholder="${prefix}-..."></label>
<label><span>Date</span><input data-f="date" type="date"></label>
<label><span>Établi par</span><input data-f="auteur" placeholder="Nom / atelier"></label>
</div>
<div class="t-grid" style="margin-top:11px">
<label><span>Client</span><input data-f="client" placeholder="Nom / société"></label>
<label><span>Téléphone / e-mail</span><input data-f="contact" placeholder="Coordonnées"></label>
<label><span>Embarcation</span><input data-f="bateau" placeholder="Marque / modèle"></label>
<label><span>Immatriculation / identification</span><input data-f="immat" placeholder="Identification"></label>
</div>`}

function actions(){return`<div class="actions"><button type="button" class="btnx blue" data-print>🖨️ Imprimer / PDF rempli</button><button type="button" class="btnx light" data-blank>🖨️ Imprimer vierge</button><button type="button" class="btnx red" data-reset>🗑️ Effacer</button></div><div class="save">💾 Sauvegarde automatique sur cet appareil</div>`}

function order(){return`<div class="t-card"><h3>🛠️ Ordre de réparation</h3>${header("OR")}
<div class="t-grid" style="margin-top:11px">
<label class="full"><span>Demande du client / symptômes</span><textarea data-f="demande"></textarea></label>
<label class="full"><span>Travaux demandés / intervention prévue</span><textarea data-f="travaux"></textarea></label>
<label><span>Équipement / moteur concerné</span><input data-f="equipement"></label>
<label><span>Compteur horaire / information utile</span><input data-f="heures"></label>
<label class="full"><span>Sécurité / QHSE / environnement</span><textarea data-f="qhse"></textarea></label>
<label class="full"><span>Opérations réalisées / pièces / contrôles</span><textarea data-f="operations"></textarea></label>
<label><span>Temps passé</span><input data-f="temps"></label><label><span>Technicien / élève</span><input data-f="technicien"></label>
<label class="full"><span>Conclusion / restitution</span><textarea data-f="conclusion"></textarea></label>
</div>${actions()}</div>`}

function lines(){return`<div class="tablewrap"><table><thead><tr><th>#</th><th>Désignation</th><th>Qté</th><th>Unité</th><th>Prix unitaire HT</th><th>Total HT</th></tr></thead><tbody>
${Array.from({length:LINES},(_,i)=>`<tr><td>${i+1}</td><td><input data-line="${i}" data-c="designation"></td><td><input data-line="${i}" data-c="qty" inputmode="decimal"></td><td><input data-line="${i}" data-c="unit"></td><td><input data-line="${i}" data-c="pu" inputmode="decimal"></td><td class="money" data-ltotal="${i}">0,00 €</td></tr>`).join("")}
</tbody></table></div>
<div class="t-grid three" style="margin-top:11px"><label><span>Taux TVA (%)</span><input data-f="tva" inputmode="decimal" placeholder="À renseigner"></label><label><span>Remise (€)</span><input data-f="remise" inputmode="decimal"></label><label><span>Frais (€)</span><input data-f="frais" inputmode="decimal"></label></div>
<div class="totals"><div><span>Total HT</span><b data-ht>0,00 €</b></div><div><span>TVA</span><b data-tva>0,00 €</b></div><div class="final"><span>Total TTC</span><b data-ttc>0,00 €</b></div></div>`}

function quote(){return`<div class="t-card"><h3>📋 Devis</h3>${header("DEV")}${lines()}
<div class="t-grid" style="margin-top:11px"><label><span>Validité</span><input data-f="validite"></label><label><span>Délai prévisionnel</span><input data-f="delai"></label><label class="full"><span>Observations / conditions</span><textarea data-f="observations"></textarea></label></div>${actions()}</div>`}
function invoice(){return`<div class="t-card"><h3>🧾 Facture</h3>${header("FAC")}
<div class="t-grid" style="margin:11px 0"><label><span>Référence ordre de réparation</span><input data-f="ref_or"></label><label><span>Référence devis</span><input data-f="ref_devis"></label></div>${lines()}
<div class="t-grid" style="margin-top:11px"><label><span>Mode / conditions de règlement</span><input data-f="reglement"></label><label><span>Échéance</span><input data-f="echeance" type="date"></label><label class="full"><span>Observations</span><textarea data-f="observations"></textarea></label></div>${actions()}</div>`}
function calc(){return`<div class="t-card calc"><h3>🧮 Calculatrice</h3><input class="display" data-display value="0" readonly>
<div class="keys">${["C","(",")","/","7","8","9","*","4","5","6","-","1","2","3","+","0",".","BACK","="].map(x=>`<button type="button" class="${x==="C"?"clear":x==="="?"eq":""}" data-k="${x}">${x==="*"?"×":x==="/"?"÷":x==="BACK"?"⌫":x}</button>`).join("")}</div><div class="history" data-hist>Dernier calcul : —</div></div>`}

function recalc(panel){
 if(!$(panel,"[data-ht]"))return;
 let ht=0;
 for(let i=0;i<LINES;i++){const q=$(panel,`[data-line="${i}"][data-c="qty"]`),pu=$(panel,`[data-line="${i}"][data-c="pu"]`);const t=n(q&&q.value)*n(pu&&pu.value);ht+=t;const cell=$(panel,`[data-ltotal="${i}"]`);if(cell)cell.textContent=euro(t)}
 const base=Math.max(0,ht-n($(panel,'[data-f="remise"]')?.value)+n($(panel,'[data-f="frais"]')?.value));const tv=base*n($(panel,'[data-f="tva"]')?.value)/100;
 $(panel,"[data-ht]").textContent=euro(base);$(panel,"[data-tva]").textContent=euro(tv);$(panel,"[data-ttc]").textContent=euro(base+tv)
}
function bind(panel,level,doc,title){
 $$(panel,"[data-f]").forEach(el=>{el.value=get(level,doc,el.dataset.f);el.addEventListener("input",()=>{set(level,doc,el.dataset.f,el.value);recalc(panel)})});
 $$(panel,"[data-line]").forEach(el=>{const k=`line.${el.dataset.line}.${el.dataset.c}`;el.value=get(level,doc,k);el.addEventListener("input",()=>{set(level,doc,k,el.value);recalc(panel)})});
 $(panel,"[data-print]")?.addEventListener("click",()=>printDoc(title,panel,false));
 $(panel,"[data-blank]")?.addEventListener("click",()=>printDoc(title,panel,true));
 $(panel,"[data-reset]")?.addEventListener("click",()=>{if(confirm("Effacer les données de ce document ?")){clear(level,doc);$$(panel,"input,textarea").forEach(x=>x.value="");recalc(panel)}});
 recalc(panel)
}
function printable(title,panel,blank){
 const f={};$$(panel,"[data-f]").forEach(x=>f[x.dataset.f]=blank?"":x.value);
 const rows=$$(panel,"tbody tr").map(tr=>{const o={};$$(tr,"[data-c]").forEach(x=>o[x.dataset.c]=blank?"":x.value);return o});
 const line=v=>v?esc(v):"&nbsp;";
 let body="";
 if(title==="Ordre de réparation"){body=`<div class="grid"><div><b>N° :</b> ${line(f.numero)}</div><div><b>Date :</b> ${line(f.date)}</div><div><b>Client :</b> ${line(f.client)}</div><div><b>Contact :</b> ${line(f.contact)}</div><div><b>Embarcation :</b> ${line(f.bateau)}</div><div><b>Identification :</b> ${line(f.immat)}</div><div><b>Équipement :</b> ${line(f.equipement)}</div><div><b>Établi par :</b> ${line(f.auteur)}</div></div>
<h2>Demande / symptômes</h2><div class="box">${line(f.demande)}</div><h2>Travaux demandés</h2><div class="box">${line(f.travaux)}</div><h2>Sécurité / QHSE / environnement</h2><div class="box">${line(f.qhse)}</div><h2>Opérations réalisées</h2><div class="box">${line(f.operations)}</div><div class="grid"><div><b>Temps :</b> ${line(f.temps)}</div><div><b>Technicien / élève :</b> ${line(f.technicien)}</div></div><h2>Conclusion / restitution</h2><div class="box">${line(f.conclusion)}</div>`}
 else{const rr=rows.map((r,i)=>`<tr><td>${i+1}</td><td>${line(r.designation)}</td><td>${line(r.qty)}</td><td>${line(r.unit)}</td><td>${line(r.pu)}</td></tr>`).join("");body=`<div class="grid"><div><b>N° :</b> ${line(f.numero)}</div><div><b>Date :</b> ${line(f.date)}</div><div><b>Client :</b> ${line(f.client)}</div><div><b>Contact :</b> ${line(f.contact)}</div><div><b>Embarcation :</b> ${line(f.bateau)}</div><div><b>Identification :</b> ${line(f.immat)}</div></div>${f.ref_or!==undefined?`<div class="grid"><div><b>Réf. OR :</b> ${line(f.ref_or)}</div><div><b>Réf. devis :</b> ${line(f.ref_devis)}</div></div>`:""}<table><thead><tr><th>#</th><th>Désignation</th><th>Qté</th><th>Unité</th><th>Prix unitaire HT</th></tr></thead><tbody>${rr}</tbody></table><div class="total"><div>Total HT : <b>${blank?"":$(panel,"[data-ht]")?.textContent}</b></div><div>TVA ${f.tva?esc(f.tva)+" %":""} : <b>${blank?"":$(panel,"[data-tva]")?.textContent}</b></div><div>Total TTC : <b>${blank?"":$(panel,"[data-ttc]")?.textContent}</b></div></div><h2>Observations</h2><div class="box">${line(f.observations)}</div>`}
 return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Arial;padding:26px;color:#18323f}h1{color:#06283d;border-bottom:3px solid #06283d}h2{font-size:15px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:12px 0}.grid div,.box{border:1px solid #cddce1;border-radius:8px;padding:9px;min-height:38px}.box{min-height:75px;white-space:pre-wrap}table{width:100%;border-collapse:collapse;margin:14px 0}th,td{border:1px solid #cddce1;padding:7px;height:32px}th{background:#eef5f7}.total{margin-left:auto;width:330px}.total div{padding:8px;border-bottom:1px solid #cddce1}.foot{margin-top:18px;font-size:11px;color:#607680}@media print{body{padding:0}}</style></head><body><h1>${esc(title)}</h1>${body}<div class="foot">Modèle pédagogique FigaroMN – à adapter aux procédures et mentions de l’entreprise.</div></body></html>`
}
function printDoc(title,panel,blank){const w=window.open("","_blank");if(!w){alert("Fenêtre d’impression bloquée.");return}w.document.write(printable(title,panel,blank));w.document.close();setTimeout(()=>w.print(),250)}
function bindCalc(root){let expr="";const d=$(root,"[data-display]"),h=$(root,"[data-hist]");const render=()=>d.value=expr||"0";$$(root,"[data-k]").forEach(b=>b.onclick=()=>{const v=b.dataset.k;if(v==="C"){expr="";render();return}if(v==="BACK"){expr=expr.slice(0,-1);render();return}if(v==="="){if(!expr)return;if(!/^[0-9+\-*/().\s]+$/.test(expr)){h.textContent="Expression non valide.";return}try{const r=Function('"use strict";return ('+expr+')')();if(!isFinite(r))throw 0;h.textContent="Dernier calcul : "+expr.replace(/\*/g," × ").replace(/\//g," ÷ ")+" = "+String(r).replace(".",",");expr=String(r);render()}catch(e){h.textContent="Calcul impossible."}return}expr+=v;render()})}
function mount(root){const level=root.dataset.level||"general";root.innerHTML=`<div class="t-head"><h2>🧰 Outils professionnels</h2><p>Documents de travail à compléter et imprimer, plus une calculatrice intégrée.</p></div><div class="t-warn"><b>Usage pédagogique :</b> les modèles doivent être adaptés aux procédures, mentions légales et règles comptables de l’entreprise.</div><div class="t-tabs"><button class="active" data-tool="or">🛠️ Ordre de réparation</button><button data-tool="dev">📋 Devis</button><button data-tool="fac">🧾 Facture</button><button data-tool="calc">🧮 Calculatrice</button></div><section class="t-panel active" data-p="or">${order()}</section><section class="t-panel" data-p="dev">${quote()}</section><section class="t-panel" data-p="fac">${invoice()}</section><section class="t-panel" data-p="calc">${calc()}</section>`;
 $$(root,"[data-tool]").forEach(b=>b.onclick=()=>{$$(root,"[data-tool]").forEach(x=>x.classList.toggle("active",x===b));$$(root,"[data-p]").forEach(x=>x.classList.toggle("active",x.dataset.p===b.dataset.tool))});
 bind($(root,'[data-p="or"]'),level,"or","Ordre de réparation");bind($(root,'[data-p="dev"]'),level,"dev","Devis");bind($(root,'[data-p="fac"]'),level,"fac","Facture");bindCalc($(root,'[data-p="calc"]'))
}
document.addEventListener("DOMContentLoaded",()=>document.querySelectorAll("#figaromn-tools").forEach(mount));
})();
