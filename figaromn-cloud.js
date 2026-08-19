
(function(){
"use strict";

var CFG = window.FIGAROMN_SUPABASE || {};
var SESSION_KEY = "figaromn_session_v2";

if(!CFG.url || !CFG.key){
  console.error("FigaroMN : configuration Supabase absente.");
  return;
}

function loadSession(){
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
  catch(e){ return null; }
}
function saveSession(s){
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch(e){}
}
function clearSession(){
  try { localStorage.removeItem(SESSION_KEY); } catch(e){}
}

async function api(path, options){
  options = options || {};
  var session = loadSession();
  var headers = Object.assign({
    "apikey": CFG.key,
    "Content-Type": "application/json"
  }, options.headers || {});

  if(session && session.access_token){
    headers.Authorization = "Bearer " + session.access_token;
  }

  var response = await fetch(CFG.url + path, Object.assign({}, options, {headers: headers}));
  var raw = await response.text();
  var data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch(e){ data = raw; }

  if(!response.ok){
    var msg = (data && (data.message || data.msg || data.error_description || data.error))
      || ("Erreur HTTP " + response.status);
    var err = new Error(msg);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function signUp(email,password,fullName,level){
  var data = await api("/auth/v1/signup",{
    method:"POST",
    body:JSON.stringify({
      email:email,
      password:password,
      data:{full_name:fullName || "", level:level || null}
    })
  });
  if(data && data.access_token) saveSession(data);
  return data;
}

async function signIn(email,password){
  var data = await api("/auth/v1/token?grant_type=password",{
    method:"POST",
    body:JSON.stringify({email:email,password:password})
  });
  saveSession(data);
  return data;
}

async function signOut(){
  try { await api("/auth/v1/logout",{method:"POST"}); } catch(e){}
  clearSession();
}

async function publicAuthApi(path, options){
  options = options || {};
  var headers = Object.assign({
    "apikey": CFG.key,
    "Content-Type": "application/json"
  }, options.headers || {});

  var response = await fetch(CFG.url + path, Object.assign({}, options, {headers: headers}));
  var raw = await response.text();
  var data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch(e){ data = raw; }

  if(!response.ok){
    var msg = (data && (data.message || data.msg || data.error_description || data.error))
      || ("Erreur HTTP " + response.status);
    var err = new Error(msg);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function requestPasswordReset(email, redirectTo){
  email = String(email || "").trim();
  if(!email) throw new Error("Adresse e-mail requise.");
  var path = "/auth/v1/recover";
  if(redirectTo){
    path += "?redirect_to=" + encodeURIComponent(String(redirectTo));
  }
  return publicAuthApi(path,{
    method:"POST",
    body:JSON.stringify({email:email})
  });
}

async function updatePasswordWithRecovery(accessToken, newPassword){
  accessToken = String(accessToken || "").trim();
  newPassword = String(newPassword || "");
  if(!accessToken) throw new Error("Lien de récupération invalide ou expiré.");
  if(newPassword.length < 6) throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
  return publicAuthApi("/auth/v1/user",{
    method:"PUT",
    headers:{Authorization:"Bearer " + accessToken},
    body:JSON.stringify({password:newPassword})
  });
}

async function profile(){
  var s = loadSession();
  if(!s || !s.user) return null;
  var rows = await api(
    "/rest/v1/profiles?id=eq."+encodeURIComponent(s.user.id)+
    "&select=id,full_name,email,role,level,archived_at"
  );
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

async function table(name, query, options){
  return api("/rest/v1/"+name+(query ? "?"+query : ""), options || {});
}

async function requireRole(role){
  var s = loadSession();
  if(!s || !s.access_token){
    location.href = "bac-pro.html";
    return null;
  }
  try{
    var p = await profile();
    if(!p){
      clearSession();
      location.href = "bac-pro.html";
      return null;
    }
    if(role && p.role !== role){
      await signOut();
      location.href = "bac-pro.html";
      return null;
    }
    return p;
  }catch(e){
    clearSession();
    location.href = "bac-pro.html";
    return null;
  }
}

function esc(value){
  return String(value == null ? "" : value).replace(/[&<>"']/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c];
  });
}

window.FigaroCloud = {
  api:api, table:table,
  signUp:signUp, signIn:signIn, signOut:signOut,
  requestPasswordReset:requestPasswordReset,
  updatePasswordWithRecovery:updatePasswordWithRecovery,
  profile:profile, requireRole:requireRole,
  session:loadSession, esc:esc
};
})();
