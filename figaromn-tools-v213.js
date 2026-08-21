
(function(){
"use strict";
const LINES=10;
const $=(r,s)=>r.querySelector(s);
const $$=(r,s)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function uid(){
 try{
  if(window.FIGAROMN_CAP_USER_ID)return String(window.FIGAROMN_CAP_USER_ID);
  if(window.FigaroCloud&&typeof FigaroCloud.session==="function"){
   const s=FigaroCloud.session();
   if(s&&s.user&&s.user.id)return String(s.user.id);
  }
 }catch(e){}
 return "local";
}
function k(level,doc,field){return "fmn_tools19|"+uid()+"|"+level+"|"+doc+"|"+field}
function get(level,doc,field){try{return localStorage.getItem(k(level,doc,field))||""}catch(e){return""}}
function set(level,doc,field,val){try{localStorage.setItem(k(level,doc,field),val==null?"":String(val))}catch(e){}}
function clear(level,doc){
 try{
  const p="fmn_tools19|"+uid()+"|"+level+"|"+doc+"|";
  Object.keys(localStorage).forEach(x=>{if(x.startsWith(p))localStorage.removeItem(x)});
 }catch(e){}
}
function num(v){const n=Number(String(v||"").replace(",","."));return isFinite(n)?n:0}
function euro(v){return num(v).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" €"}

function companyBlock(){
 return `<div class="ft-company">
  <div class="brand"><div class="mark">⚓</div><div><h3>Blanchet Nautique</h3><p>Maintenance • Diagnostic • Entretien • Équipements</p></div></div>
  <div class="meta">Document atelier / relation client<br>Modèle pédagogique FigaroMN</div>
 </div>`;
}
function common(prefix){
 return `<div class="ft-grid three">
  <label><span>N° document</span><input data-f="numero" placeholder="${prefix}-..."></label>
  <label><span>Date</span><input data-f="date" type="date"></label>
  <label><span>Conseiller / technicien</span><input data-f="auteur" placeholder="Nom"></label>
 </div>
 <div class="ft-section"><h4>Client</h4><div class="ft-grid">
  <label><span>Nom / société</span><input data-f="client"></label>
  <label><span>Téléphone</span><input data-f="telephone"></label>
  <label><span>E-mail</span><input data-f="email"></label>
  <label><span>Adresse</span><input data-f="adresse"></label>
 </div></div>
 <div class="ft-section"><h4>Embarcation</h4><div class="ft-grid three">
  <label><span>Marque / modèle</span><input data-f="bateau"></label>
  <label><span>Immatriculation</span><input data-f="immat"></label>
  <label><span>Année</span><input data-f="annee"></label>
  <label><span>Moteur / équipement</span><input data-f="moteur"></label>
  <label><span>N° série</span><input data-f="serie"></label>
  <label><span>Heures moteur</span><input data-f="heures"></label>
 </div></div>`;
}
function actionButtons(){
 return `<div class="ft-actions">
  <button type="button" class="ft-btn blue" data-print>🖨️ Imprimer / PDF rempli</button>
  <button type="button" class="ft-btn light" data-blank>🖨️ Imprimer vierge</button>
  <button type="button" class="ft-btn red" data-reset>🗑️ Effacer ce document</button>
 </div><div class="ft-save">💾 Sauvegarde automatique sur cet appareil</div>`;
}
function orderDoc(){
 return `<div class="ft-doc">${companyBlock()}<div class="ft-doc-head"><div><h3>Ordre de réparation</h3><div class="sub">Prise en charge et autorisation d’intervention</div></div><span class="ft-badge">ATELIER</span></div>
 ${common("OR")}
 <div class="ft-section"><h4>Demande client / constat initial</h4><div class="ft-grid">
  <label class="ft-full"><span>Symptômes / demande exprimée</span><textarea data-f="demande"></textarea></label>
  <label class="ft-full"><span>Travaux demandés / opérations autorisées</span><textarea data-f="travaux"></textarea></label>
  <label><span>Montant plafond autorisé (€)</span><input data-f="plafond" inputmode="decimal"></label>
  <label><span>Délai souhaité / immobilisation</span><input data-f="delai"></label>
 </div></div>
 <div class="ft-section"><h4>Sécurité / préparation</h4><div class="ft-grid">
  <label class="ft-full"><span>Consignation, EPI, ventilation, stabilité, environnement</span><textarea data-f="qhse"></textarea></label>
 </div></div>
 <div class="ft-section"><h4>Intervention et restitution</h4><div class="ft-grid">
  <label class="ft-full"><span>Opérations réalisées / pièces remplacées / contrôles</span><textarea data-f="operations"></textarea></label>
  <label><span>Temps passé</span><input data-f="temps"></label>
  <label><span>Technicien</span><input data-f="technicien"></label>
  <label class="ft-full"><span>Essais / résultat / réserves / conseils</span><textarea data-f="conclusion"></textarea></label>
 </div></div>
 <div class="ft-section"><h4>Visa</h4><div class="ft-grid"><label><span>Nom client / représentant</span><input data-f="visa_client"></label><label><span>Nom réceptionnaire Blanchet Nautique</span><input data-f="visa_atelier"></label></div></div>
 ${actionButtons()}</div>`;
}
function priceLines(){
 return `<div class="ft-tablewrap"><table><thead><tr><th>#</th><th>Désignation</th><th>Réf.</th><th>Qté</th><th>Unité</th><th>PU HT</th><th>Total HT</th></tr></thead><tbody>
 ${Array.from({length:LINES},(_,i)=>`<tr>
  <td>${i+1}</td>
  <td><input data-line="${i}" data-c="designation"></td>
  <td><input data-line="${i}" data-c="ref"></td>
  <td><input data-line="${i}" data-c="qty" inputmode="decimal"></td>
  <td><input data-line="${i}" data-c="unit"></td>
  <td><input data-line="${i}" data-c="pu" inputmode="decimal"></td>
  <td class="ft-money" data-ltotal="${i}">0,00 €</td>
 </tr>`).join("")}
 </tbody></table></div>
 <div class="ft-grid three" style="margin-top:12px">
  <label><span>Taux TVA (%)</span><input data-f="tva" inputmode="decimal" placeholder="À renseigner"></label>
  <label><span>Remise (€)</span><input data-f="remise" inputmode="decimal" value=""></label>
  <label><span>Frais / forfait (€)</span><input data-f="frais" inputmode="decimal" value=""></label>
 </div>
 <div class="ft-totals"><div><span>Total HT</span><strong data-ht>0,00 €</strong></div><div><span>TVA</span><strong data-tva>0,00 €</strong></div><div class="final"><span>Total TTC</span><strong data-ttc>0,00 €</strong></div></div>`;
}
function quoteDoc(){
 return `<div class="ft-doc">${companyBlock()}<div class="ft-doc-head"><div><h3>Devis</h3><div class="sub">Proposition commerciale – travaux et fournitures</div></div><span class="ft-badge">DEVIS</span></div>
 ${common("DEV")}${priceLines()}
 <div class="ft-section"><h4>Conditions</h4><div class="ft-grid">
  <label><span>Validité du devis</span><input data-f="validite"></label>
  <label><span>Délai prévisionnel</span><input data-f="delai"></label>
  <label class="ft-full"><span>Observations / exclusions / réserves</span><textarea data-f="observations"></textarea></label>
  <label><span>Bon pour accord – nom client</span><input data-f="accord"></label>
  <label><span>Date d’acceptation</span><input data-f="date_accept" type="date"></label>
 </div></div>${actionButtons()}</div>`;
}
function invoiceDoc(){
 return `<div class="ft-doc">${companyBlock()}<div class="ft-doc-head"><div><h3>Facture</h3><div class="sub">Prestations et fournitures réalisées</div></div><span class="ft-badge">FACTURE</span></div>
 ${common("FAC")}
 <div class="ft-grid" style="margin-top:12px"><label><span>Référence ordre de réparation</span><input data-f="ref_or"></label><label><span>Référence devis</span><input data-f="ref_devis"></label></div>
 ${priceLines()}
 <div class="ft-section"><h4>Règlement</h4><div class="ft-grid">
  <label><span>Mode / conditions de règlement</span><input data-f="reglement"></label>
  <label><span>Échéance</span><input data-f="echeance" type="date"></label>
  <label class="ft-full"><span>Observations</span><textarea data-f="observations"></textarea></label>
 </div></div>${actionButtons()}</div>`;
}
const conditionItems=[
 "Coque / flotteurs","Pont / cockpit","Pare-brise / console","Sellerie / aménagements",
 "Moteur / capot","Hélice / embase","Direction / commandes","Batteries / coupe-batterie",
 "Feux / éclairage","Électronique / instruments","Pompe de cale","Mouillage / guindeau",
 "Armement / sécurité","Réservoir / niveau carburant","Remorque / bers / sangles","Documents / clés / accessoires"
];
function conditionDoc(){
 return `<div class="ft-doc">${companyBlock()}<div class="ft-doc-head"><div><h3>État des lieux – réception de l’embarcation</h3><div class="sub">Constat contradictoire à l’entrée en atelier</div></div><span class="ft-badge">RÉCEPTION</span></div>
 ${common("EDL")}
 <div class="ft-section"><h4>Informations de réception</h4><div class="ft-grid three">
  <label><span>Niveau carburant</span><input data-f="carburant"></label>
  <label><span>Niveau / état batterie</span><input data-f="batterie"></label>
  <label><span>Nombre de clés remises</span><input data-f="cles"></label>
  <label><span>Documents remis</span><input data-f="documents"></label>
  <label><span>Accessoires déposés</span><input data-f="accessoires"></label>
  <label><span>Référence photos</span><input data-f="photos" placeholder="Ex. IMG_001 à IMG_006"></label>
 </div></div>
 <div class="ft-section"><h4>Contrôle visuel à la réception</h4><div class="ft-condition-grid">
  ${conditionItems.map((x,i)=>`<div class="ft-condition-item"><strong>${esc(x)}</strong><div class="row">
   <select data-cond="${i}" data-c="etat"><option value="">Choisir…</option><option>Bon état</option><option>À surveiller</option><option>Dégradé</option><option>Non présent</option><option>Non contrôlé</option></select>
   <textarea data-cond="${i}" data-c="obs" placeholder="Observation / localisation / réserve…"></textarea>
  </div></div>`).join("")}
 </div></div>
 <div class="ft-section"><h4>Constats et réserves</h4><div class="ft-grid">
  <label class="ft-full"><span>Dommages / défauts préexistants</span><textarea data-f="dommages"></textarea></label>
  <label class="ft-full"><span>Objets personnels / équipements laissés à bord</span><textarea data-f="objets"></textarea></label>
  <label class="ft-full"><span>Observations complémentaires</span><textarea data-f="observations"></textarea></label>
  <label><span>Nom client / représentant</span><input data-f="visa_client"></label>
  <label><span>Réceptionnaire Blanchet Nautique</span><input data-f="visa_atelier"></label>
 </div></div>${actionButtons()}</div>`;
}

function sciCalc(){
 const keys=[
  ["MC","fn"],["MR","fn"],["M+","fn"],["M−","fn"],["DEG/RAD","fn"],["C","clear"],
  ["sin","fn"],["cos","fn"],["tan","fn"],["asin","fn"],["acos","fn"],["atan","fn"],
  ["ln","fn"],["log","fn"],["√","fn"],["x²","fn"],["xʸ","fn"],["1/x","fn"],
  ["π","fn"],["e","fn"],["(",""],[")",""],["%","fn"],["÷","op"],
  ["7",""],["8",""],["9",""],["⌫",""],["±","fn"],["×","op"],
  ["4",""],["5",""],["6",""],["EXP","fn"],["!","fn"],["−","op"],
  ["1",""],["2",""],["3",""],["Ans","fn"],[".",""],["+","op"],
  ["0",""],["00",""],["=","eq"]
 ];
 const mobileKeys=[
  ["MC","fn"],["MR","fn"],["M+","fn"],["M−","fn"],
  ["DEG/RAD","fn"],["C","clear"],["⌫",""],["Ans","fn"],
  ["sin","fn"],["cos","fn"],["tan","fn"],["π","fn"],
  ["asin","fn"],["acos","fn"],["atan","fn"],["e","fn"],
  ["ln","fn"],["log","fn"],["√","fn"],["x²","fn"],
  ["xʸ","fn"],["1/x","fn"],["!","fn"],["%","fn"],
  ["(",""],[")",""],["EXP","fn"],["÷","op"],
  ["7",""],["8",""],["9",""],["×","op"],
  ["4",""],["5",""],["6",""],["−","op"],
  ["1",""],["2",""],["3",""],["+","op"],
  ["±","fn"],["0",""],["00",""],[".",""],
  ["=","eq"]
 ];
 const keyHtml=list=>list.map(([v,c])=>`<button type="button" class="${c}" data-key="${esc(v)}" aria-label="${esc(v)}">${esc(v)}</button>`).join("");
 return `<div class="ft-doc ft-calc">${companyBlock()}<div class="ft-doc-head"><div><h3>Calculatrice scientifique</h3><div class="sub">Calculs usuels, trigonométrie et fonctions scientifiques</div></div><span class="ft-badge">SCIENTIFIQUE</span></div>
 <div class="ft-calc-top"><input class="ft-calc-display" data-display value="0" readonly aria-label="Affichage calculatrice"><button type="button" class="ft-mode" data-mode aria-label="Basculer degrés radians">DEG</button></div>
 <div class="ft-scikeys ft-scikeys-desktop" aria-label="Clavier scientifique">${keyHtml(keys)}</div>
 <div class="ft-scikeys ft-scikeys-mobile" aria-label="Clavier scientifique mobile">${keyHtml(mobileKeys)}</div>
 <div class="ft-history" data-hist aria-live="polite">Dernier calcul : —</div>
 </div>`;
}

function recalc(panel){
 if(!$(panel,"[data-ht]"))return;
 let ht=0;
 for(let i=0;i<LINES;i++){
  const q=$(panel,`[data-line="${i}"][data-c="qty"]`);
  const pu=$(panel,`[data-line="${i}"][data-c="pu"]`);
  const t=num(q&&q.value)*num(pu&&pu.value);
  ht+=t;
  const cell=$(panel,`[data-ltotal="${i}"]`);
  if(cell)cell.textContent=euro(t);
 }
 const base=Math.max(0,ht-num($(panel,'[data-f="remise"]')?.value)+num($(panel,'[data-f="frais"]')?.value));
 const vat=base*num($(panel,'[data-f="tva"]')?.value)/100;
 $(panel,"[data-ht]").textContent=euro(base);
 $(panel,"[data-tva]").textContent=euro(vat);
 $(panel,"[data-ttc]").textContent=euro(base+vat);
}
function bindDoc(panel,level,doc,title){
 $$(panel,"[data-f]").forEach(el=>{
  el.value=get(level,doc,el.dataset.f);
  el.addEventListener("input",()=>{set(level,doc,el.dataset.f,el.value);recalc(panel)});
 });
 $$(panel,"[data-line]").forEach(el=>{
  const fld=`line.${el.dataset.line}.${el.dataset.c}`;
  el.value=get(level,doc,fld);
  el.addEventListener("input",()=>{set(level,doc,fld,el.value);recalc(panel)});
 });
 $$(panel,"[data-cond]").forEach(el=>{
  const fld=`condition.${el.dataset.cond}.${el.dataset.c}`;
  el.value=get(level,doc,fld);
  el.addEventListener("input",()=>set(level,doc,fld,el.value));
 });
 $(panel,"[data-print]")?.addEventListener("click",()=>printDocument(title,panel,false));
 $(panel,"[data-blank]")?.addEventListener("click",()=>printDocument(title,panel,true));
 $(panel,"[data-reset]")?.addEventListener("click",()=>{
  if(!confirm("Effacer les données enregistrées de ce document ?"))return;
  clear(level,doc);
  $$(panel,"input,textarea,select").forEach(x=>x.value="");
  recalc(panel);
 });
 recalc(panel);
}
function fieldMap(panel,blank){
 const o={};
 $$(panel,"[data-f]").forEach(x=>o[x.dataset.f]=blank?"":x.value);
 return o;
}
function printable(title,panel,blank){
 const f=fieldMap(panel,blank);
 const line=v=>v?esc(v):"&nbsp;";
 const company=`<div class="company"><div><h1>Blanchet Nautique</h1><p>Maintenance • Diagnostic • Entretien • Équipements</p></div><div class="brand">⚓</div></div>`;
 const head=`<div class="dochead"><h2>${esc(title)}</h2><div>N° ${line(f.numero)} &nbsp; • &nbsp; Date ${line(f.date)}</div></div>`;
 const common=`<div class="grid">
  <div><b>Client :</b> ${line(f.client)}</div><div><b>Téléphone :</b> ${line(f.telephone)}</div>
  <div><b>E-mail :</b> ${line(f.email)}</div><div><b>Adresse :</b> ${line(f.adresse)}</div>
  <div><b>Embarcation :</b> ${line(f.bateau)}</div><div><b>Immatriculation :</b> ${line(f.immat)}</div>
  <div><b>Moteur / équipement :</b> ${line(f.moteur)}</div><div><b>N° série :</b> ${line(f.serie)}</div>
 </div>`;
 let body="";
 if(title==="Ordre de réparation"){
  body=`${common}<h3>Demande client / symptômes</h3><div class="box">${line(f.demande)}</div><h3>Travaux autorisés</h3><div class="box">${line(f.travaux)}</div><div class="grid"><div><b>Montant plafond :</b> ${line(f.plafond)}</div><div><b>Délai :</b> ${line(f.delai)}</div></div><h3>Sécurité / QHSE</h3><div class="box">${line(f.qhse)}</div><h3>Intervention</h3><div class="box">${line(f.operations)}</div><h3>Essais / restitution</h3><div class="box">${line(f.conclusion)}</div><div class="sign"><div>Client / représentant<br><br><br>${line(f.visa_client)}</div><div>Blanchet Nautique<br><br><br>${line(f.visa_atelier)}</div></div>`;
 }else if(title==="État des lieux – réception de l’embarcation"){
  const cond=$$(panel,"[data-cond][data-c='etat']").map((sel,i)=>{
   const obs=$(panel,`[data-cond="${i}"][data-c="obs"]`);
   const label=conditionItems[i]||("Point "+(i+1));
   return `<tr><td>${esc(label)}</td><td>${blank?"":esc(sel.value)}</td><td>${blank?"":esc(obs.value)}</td></tr>`;
  }).join("");
  body=`${common}<div class="grid"><div><b>Carburant :</b> ${line(f.carburant)}</div><div><b>Batterie :</b> ${line(f.batterie)}</div><div><b>Clés :</b> ${line(f.cles)}</div><div><b>Documents :</b> ${line(f.documents)}</div><div><b>Accessoires :</b> ${line(f.accessoires)}</div><div><b>Photos :</b> ${line(f.photos)}</div></div><table><thead><tr><th>Point contrôlé</th><th>État</th><th>Observation</th></tr></thead><tbody>${cond}</tbody></table><h3>Dommages / défauts préexistants</h3><div class="box">${line(f.dommages)}</div><h3>Objets / équipements laissés à bord</h3><div class="box">${line(f.objets)}</div><h3>Observations complémentaires</h3><div class="box">${line(f.observations)}</div><div class="sign"><div>Client / représentant<br><br><br>${line(f.visa_client)}</div><div>Réceptionnaire Blanchet Nautique<br><br><br>${line(f.visa_atelier)}</div></div>`;
 }else{
  const rows=$$(panel,"tbody tr").map((tr,i)=>{
   const vals={};$$(tr,"[data-c]").forEach(x=>vals[x.dataset.c]=blank?"":x.value);
   return `<tr><td>${i+1}</td><td>${line(vals.designation)}</td><td>${line(vals.ref)}</td><td>${line(vals.qty)}</td><td>${line(vals.unit)}</td><td>${line(vals.pu)}</td></tr>`;
  }).join("");
  body=`${common}${f.ref_or!==undefined?`<div class="grid"><div><b>Réf. OR :</b> ${line(f.ref_or)}</div><div><b>Réf. devis :</b> ${line(f.ref_devis)}</div></div>`:""}<table><thead><tr><th>#</th><th>Désignation</th><th>Réf.</th><th>Qté</th><th>Unité</th><th>PU HT</th></tr></thead><tbody>${rows}</tbody></table><div class="totals"><div>Total HT <b>${blank?"":$(panel,"[data-ht]")?.textContent}</b></div><div>TVA ${f.tva?esc(f.tva)+" %":""} <b>${blank?"":$(panel,"[data-tva]")?.textContent}</b></div><div>Total TTC <b>${blank?"":$(panel,"[data-ttc]")?.textContent}</b></div></div><h3>Observations</h3><div class="box">${line(f.observations)}</div>`;
 }
 return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
 body{font-family:Arial,sans-serif;color:#1b2c38;padding:26px;line-height:1.4}.company{display:flex;justify-content:space-between;align-items:center;background:#17324a;color:#fff;padding:16px 18px;border-radius:10px}.company h1{margin:0;font-size:24px}.company p{margin:3px 0 0}.brand{font-size:34px}.dochead{display:flex;justify-content:space-between;align-items:end;border-bottom:3px solid #17324a;padding:14px 0}.dochead h2{margin:0;color:#17324a}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.grid>div,.box{border:1px solid #ccdbe1;border-radius:7px;padding:9px;min-height:38px}.box{min-height:76px;white-space:pre-wrap}h3{font-size:15px;color:#17324a;margin:17px 0 7px}table{width:100%;border-collapse:collapse;margin:13px 0}th,td{border:1px solid #ccdbe1;padding:7px;height:30px}th{background:#eef5f7;text-align:left}.totals{margin-left:auto;width:330px}.totals div{display:flex;justify-content:space-between;border-bottom:1px solid #ccdbe1;padding:8px}.totals div:last-child{font-size:18px;border:2px solid #17324a}.sign{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:22px}.sign>div{border:1px solid #ccdbe1;border-radius:7px;padding:10px;min-height:100px}@media print{body{padding:0}}</style></head><body>${company}${head}${body}</body></html>`;
}
function printDocument(title,panel,blank){
 const w=window.open("","_blank");
 if(!w){alert("La fenêtre d’impression a été bloquée.");return}
 w.document.write(printable(title,panel,blank));w.document.close();setTimeout(()=>w.print(),250);
}

function bindCalculator(root){
 let expr="",deg=true,last=0,memory=0;
 const d=$(root,"[data-display]"),h=$(root,"[data-hist]"),mode=$(root,"[data-mode]");
 const render=()=>d.value=expr||"0";
 const toRad=x=>deg?x*Math.PI/180:x;
 const fromRad=x=>deg?x*180/Math.PI:x;
 function fact(x){x=Math.round(x);if(x<0||x>170)return NaN;let r=1;for(let i=2;i<=x;i++)r*=i;return r}
 function currentNumber(){
  try{return evaluate(expr||"0")}catch(e){return 0}
 }
 function evaluate(s){
  if(!s)return 0;
  let t=s
   .replace(/Ans/g,String(last))
   .replace(/π/g,"PI")
   .replace(/×/g,"*").replace(/÷/g,"/")
   .replace(/−/g,"-")
   .replace(/\^/g,"**");
  if(!/^[0-9A-Za-z_+\-*/().,\s%*]+$/.test(t))throw new Error("Expression");
  const sin=x=>Math.sin(toRad(x)),cos=x=>Math.cos(toRad(x)),tan=x=>Math.tan(toRad(x));
  const asin=x=>fromRad(Math.asin(x)),acos=x=>fromRad(Math.acos(x)),atan=x=>fromRad(Math.atan(x));
  const sqrt=Math.sqrt,ln=Math.log,log=x=>Math.log10(x),exp=Math.exp,pow=Math.pow,PI=Math.PI,E=Math.E,abs=Math.abs;
  return Function("sin","cos","tan","asin","acos","atan","sqrt","ln","log","exp","pow","PI","E","abs","fact",
    '"use strict";return ('+t+')')(sin,cos,tan,asin,acos,atan,sqrt,ln,log,exp,pow,PI,E,abs,fact);
 }
 function unary(name){
  const x=currentNumber();let r=0;
  if(name==="sin")r=Math.sin(toRad(x));
  else if(name==="cos")r=Math.cos(toRad(x));
  else if(name==="tan")r=Math.tan(toRad(x));
  else if(name==="asin")r=fromRad(Math.asin(x));
  else if(name==="acos")r=fromRad(Math.acos(x));
  else if(name==="atan")r=fromRad(Math.atan(x));
  else if(name==="ln")r=Math.log(x);
  else if(name==="log")r=Math.log10(x);
  else if(name==="√")r=Math.sqrt(x);
  else if(name==="x²")r=x*x;
  else if(name==="1/x")r=1/x;
  else if(name==="%")r=x/100;
  else if(name==="!")r=fact(x);
  else if(name==="±")r=-x;
  else if(name==="EXP")r=Math.exp(x);
  if(!isFinite(r))throw new Error("Résultat");
  h.textContent=`${name}(${String(x).replace(".",",")}) = ${String(r).replace(".",",")}`;
  last=r;expr=String(r);render();
 }
 $$(root,"[data-key]").forEach(b=>b.onclick=()=>{
  const v=b.dataset.key;
  try{
   if(v==="C"){expr="";render();return}
   if(v==="⌫"){expr=expr.slice(0,-1);render();return}
   if(v==="DEG/RAD"){deg=!deg;mode.textContent=deg?"DEG":"RAD";return}
   if(v==="MC"){memory=0;return}
   if(v==="MR"){expr+=String(memory);render();return}
   if(v==="M+"){memory+=currentNumber();return}
   if(v==="M−"){memory-=currentNumber();return}
   if(["sin","cos","tan","asin","acos","atan","ln","log","√","x²","1/x","%","!","±","EXP"].includes(v)){unary(v);return}
   if(v==="xʸ"){expr+="^";render();return}
   if(v==="π"){expr+="π";render();return}
   if(v==="e"){expr+="E";render();return}
   if(v==="Ans"){expr+="Ans";render();return}
   if(v==="="){
    const r=evaluate(expr);
    if(!isFinite(r))throw new Error("Résultat");
    h.textContent=`${expr||0} = ${String(r).replace(".",",")}`;
    last=r;expr=String(r);render();return;
   }
   expr+=v;render();
  }catch(e){h.textContent="Calcul impossible ou domaine non valide."}
 });
 mode.onclick=()=>{deg=!deg;mode.textContent=deg?"DEG":"RAD"};
}

function mount(root){
 const level=root.dataset.level||"general";
 root.innerHTML=`<div class="ft-shell"><div class="ft-title"><h2>🧰 Outils professionnels</h2><p>Documents atelier et relation client de Blanchet Nautique, imprimables remplis ou vierges.</p></div>
 <div class="ft-warning"><strong>Support pédagogique :</strong> les mentions légales, fiscales et comptables doivent être validées par l’entreprise avant utilisation réelle.</div>
 <div class="ft-tabs" role="tablist">
  <button type="button" class="active" data-tool="condition">🚤 État des lieux</button>
  <button type="button" data-tool="order">🛠️ Ordre de réparation</button>
  <button type="button" data-tool="quote">📋 Devis</button>
  <button type="button" data-tool="invoice">🧾 Facture</button>
  <button type="button" data-tool="calc">🧮 Calculatrice scientifique</button>
 </div>
 <section class="ft-panel active" data-panel="condition">${conditionDoc()}</section>
 <section class="ft-panel" data-panel="order">${orderDoc()}</section>
 <section class="ft-panel" data-panel="quote">${quoteDoc()}</section>
 <section class="ft-panel" data-panel="invoice">${invoiceDoc()}</section>
 <section class="ft-panel" data-panel="calc">${sciCalc()}</section></div>`;
 $$(root,"[data-tool]").forEach(btn=>btn.onclick=()=>{
  $$(root,"[data-tool]").forEach(x=>x.classList.toggle("active",x===btn));
  $$(root,"[data-panel]").forEach(p=>p.classList.toggle("active",p.dataset.panel===btn.dataset.tool));
 });
 bindDoc($(root,'[data-panel="order"]'),level,"order","Ordre de réparation");
 bindDoc($(root,'[data-panel="condition"]'),level,"condition","État des lieux – réception de l’embarcation");
 bindDoc($(root,'[data-panel="quote"]'),level,"quote","Devis");
 bindDoc($(root,'[data-panel="invoice"]'),level,"invoice","Facture");
 bindCalculator($(root,'[data-panel="calc"]'));
}
document.addEventListener("DOMContentLoaded",()=>document.querySelectorAll("#figaromn-tools").forEach(mount));
})();
