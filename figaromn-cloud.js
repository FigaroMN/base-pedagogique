
(function(){
"use strict";
var C=window.FIGAROMN_SUPABASE||{};
if(!C.url||!C.key){console.error("Configuration Supabase manquante.");return;}

var STORAGE="figaromn_supabase_session";

function loadSession(){
  try{return JSON.parse(localStorage.getItem(STORAGE)||"null")}catch(e){return null}
}
function saveSession(s){
  try{localStorage.setItem(STORAGE,JSON.stringify(s))}catch(e){}
}
function clearSession(){
  try{localStorage.removeItem(STORAGE)}catch(e){}
}
async function req(path,opt){
  opt=opt||{};
  var session=loadSession();
  var headers=Object.assign({
    "apikey":C.key,
    "Content-Type":"application/json"
  },opt.headers||{});
  if(session&&session.access_token)headers.Authorization="Bearer "+session.access_token;
  var r=await fetch(C.url+path,Object.assign({},opt,{headers:headers}));
  var text=await r.text(),data=null;
  try{data=text?JSON.parse(text):null}catch(e){data=text}
  if(!r.ok){
    var err=new Error((data&&data.msg)||(data&&data.message)||(data&&data.error_description)||("Erreur "+r.status));
    err.status=r.status;err.data=data;throw err;
  }
  return data;
}
async function signIn(email,password){
  var data=await req("/auth/v1/token?grant_type=password",{method:"POST",body:JSON.stringify({email:email,password:password})});
  saveSession(data);return data;
}
async function signUp(email,password,fullName){
  var data=await req("/auth/v1/signup",{method:"POST",body:JSON.stringify({email:email,password:password,data:{full_name:fullName||""}})});
  if(data&&data.access_token)saveSession(data);
  return data;
}
async function signOut(){
  try{await req("/auth/v1/logout",{method:"POST"})}catch(e){}
  clearSession();
}
async function refresh(){
  var s=loadSession();if(!s||!s.refresh_token)return null;
  try{
    var data=await req("/auth/v1/token?grant_type=refresh_token",{method:"POST",body:JSON.stringify({refresh_token:s.refresh_token})});
    saveSession(data);return data;
  }catch(e){clearSession();return null}
}
async function profile(){
  var s=loadSession();if(!s||!s.user)return null;
  var d=await req("/rest/v1/profiles?id=eq."+encodeURIComponent(s.user.id)+"&select=id,full_name,email,role,level");
  return Array.isArray(d)&&d[0]?d[0]:null;
}
async function table(name,query,opt){
  return req("/rest/v1/"+name+(query?("?"+query):""),opt||{});
}
async function requireAuth(role){
  var s=loadSession();
  if(!s||!s.access_token){location.href="connexion.html";return null}
  var p;
  try{p=await profile()}catch(e){
    if(e.status===401){await refresh();p=await profile()}else throw e;
  }
  if(!p){location.href="connexion.html";return null}
  if(role&&p.role!==role){
    location.href=p.role==="teacher"?"enseignant.html":"eleve.html";return null;
  }
  return p;
}
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(m){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[m]})}
function downloadCSV(filename,rows){
  var csv=rows.map(function(r){return r.map(function(v){return '"'+String(v==null?"":v).replace(/"/g,'""')+'"'}).join(";")}).join("\n");
  var blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},500);
}
window.FigaroCloud={req:req,signIn:signIn,signUp:signUp,signOut:signOut,refresh:refresh,profile:profile,table:table,requireAuth:requireAuth,session:loadSession,esc:esc,downloadCSV:downloadCSV};
})();
