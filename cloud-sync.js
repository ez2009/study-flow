/* STUDY FLOW · GitHub encrypted cloud sync
 * Cloud data is encrypted with AES-GCM before it is sent to the repository.
 * The GitHub token is stored only in this browser's localStorage.
 */
(() => {
  'use strict';
  const OWNER = 'ez2009';
  const REPO = 'study-flow';
  const BRANCH = 'study-flow-data';
  const FILE_PATH = '.study-flow/cloud-data.enc';
  const API = 'https://api.github.com';
  const STORES = ['resources','tasks','plans','sessions','reviews','settings'];
  const TOKEN_KEY = 'study-flow-github-token';
  const BASELINE_KEY = 'study-flow-cloud-baseline';
  let cryptoKey = null;
  let saltB64 = null;
  let lastLocalFingerprint = '';
  let busy = false;
  let timer = null;
  let autoEnabled = true;

  const el = id => document.getElementById(id);
  const say = (msg, bad=false) => {
    const n = el('cloudSyncStatus');
    if (n) { n.textContent = msg; n.style.color = bad ? 'var(--red)' : 'var(--muted)'; }
  };
  const b64 = bytes => {
    let s=''; for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  };
  const unb64 = str => Uint8Array.from(atob(str), c => c.charCodeAt(0));
  const toB64 = text => b64(new TextEncoder().encode(text));
  const fromB64 = str => new TextDecoder().decode(unb64(str));
  const randomBytes = n => crypto.getRandomValues(new Uint8Array(n));

  async function deriveKey(password, salt) {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      {name:'PBKDF2', salt, iterations:310000, hash:'SHA-256'},
      material, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']
    );
  }
  async function encryptData(data, password) {
    const salt = randomBytes(16), iv = randomBytes(12);
    const key = await deriveKey(password, salt);
    const plain = new TextEncoder().encode(JSON.stringify(data));
    const cipher = await crypto.subtle.encrypt({name:'AES-GCM',iv}, key, plain);
    return {format:'STUDY_FLOW_ENCRYPTED',version:1,kdf:'PBKDF2-SHA256-310000',cipher:'AES-256-GCM',salt:b64(salt),iv:b64(iv),data:b64(new Uint8Array(cipher))};
  }
  async function decryptData(envelope, password) {
    if (!envelope || envelope.format!=='STUDY_FLOW_ENCRYPTED' || envelope.version!==1) throw new Error('云端文件格式不受支持。');
    const salt=unb64(envelope.salt), iv=unb64(envelope.iv);
    const key=await deriveKey(password,salt);
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,unb64(envelope.data));
    return JSON.parse(new TextDecoder().decode(plain));
  }
  async function api(path, options={}, allowNotFound=false) {
    const token = el('cloudToken')?.value.trim() || localStorage.getItem(TOKEN_KEY) || '';
    if (!token) throw new Error('请先填写 GitHub Fine-grained Token。');
    const response = await fetch(API+path, {
      ...options,
      headers: {
        'Accept':'application/vnd.github+json',
        'Authorization':'Bearer '+token,
        'X-GitHub-Api-Version':'2022-11-28',
        ...(options.body ? {'Content-Type':'application/json'} : {}),
        ...(options.headers||{})
      }
    });
    if (response.status===404 && allowNotFound) return null;
    const body=await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(body.message || ('GitHub API 错误：'+response.status));
    return body;
  }
  async function readRemote() {
    const path='/repos/'+OWNER+'/'+REPO+'/contents/'+FILE_PATH.split('/').map(encodeURIComponent).join('/');
    const result=await api(path+'?ref='+encodeURIComponent(BRANCH),{},true);
    if (!result) return null;
    const content=(result.content||'').replace(/\n/g,'');
    return {sha:result.sha,envelope:JSON.parse(fromB64(content))};
  }
  async function writeRemote(envelope, sha) {
    const path='/repos/'+OWNER+'/'+REPO+'/contents/'+FILE_PATH.split('/').map(encodeURIComponent).join('/');
    const payload={message:'chore: update encrypted study data',content:toB64(JSON.stringify(envelope)),branch:BRANCH};
    if (sha) payload.sha=sha;
    return api(path,{method:'PUT',body:JSON.stringify(payload)});
  }
  async function snapshot() {
    const db=await new Promise((resolve,reject)=>{
      const req=indexedDB.open('study-flow-db',1);
      req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
    });
    try {
      const out={app:'STUDY FLOW',version:1,exportedAt:new Date().toISOString()};
      for (const store of STORES) out[store]=await new Promise((resolve,reject)=>{
        const tx=db.transaction(store,'readonly'), req=tx.objectStore(store).getAll();
        req.onsuccess=()=>resolve(req.result||[]); req.onerror=()=>reject(req.error);
      });
      return out;
    } finally { db.close(); }
  }
  async function replaceLocal(data) {
    if (data.app!=='STUDY FLOW' || !Array.isArray(data.resources) || !Array.isArray(data.tasks)) throw new Error('解密后的数据结构不正确。');
    const db=await new Promise((resolve,reject)=>{
      const req=indexedDB.open('study-flow-db',1);
      req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
    });
    try {
      // Replace every store in one IndexedDB transaction: either all stores update, or none do.
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORES,'readwrite');
        for (const store of STORES) {
          const os=tx.objectStore(store);
          os.clear();
          for (const item of (Array.isArray(data[store])?data[store]:[])) os.put(item);
        }
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error || new Error('本地数据写入失败。'));
        tx.onabort=()=>reject(tx.error || new Error('本地数据替换已取消，原数据未完成替换。'));
      });
    } finally { db.close(); }
    location.reload();
  }
  const fingerprint = data => JSON.stringify(STORES.map(k=>data[k]||[]));
  function baseline() { try{return JSON.parse(localStorage.getItem(BASELINE_KEY)||'null')}catch{return null} }
  function setBaseline(sha, fp) { localStorage.setItem(BASELINE_KEY,JSON.stringify({sha,fingerprint:fp,at:Date.now()})); lastLocalFingerprint=fp; }
  function getPassword() { return el('cloudPassword')?.value || ''; }

  async function uploadInitial(password, remote) {
    const data=await snapshot(), fp=fingerprint(data);
    const envelope=await encryptData(data,password);
    const result=await writeRemote(envelope,remote?.sha);
    setBaseline(result.content?.sha || result.commit?.sha || '',fp);
    say('初始化完成 · 数据已加密上传');
  }
  async function downloadRemote(remote,password) {
    const data=await decryptData(remote.envelope,password);
    setBaseline(remote.sha,fingerprint(data));
    await replaceLocal(data);
  }
  async function syncNow(mode='normal') {
    if (busy) return;
    busy=true;
    try {
      const password=getPassword();
      if (password.length<10) throw new Error('请设置至少 10 位的云同步加密密码。请在所有设备使用同一个密码。');
      const token=el('cloudToken')?.value.trim();
      if (!token) throw new Error('请填写 GitHub Token。');
      localStorage.setItem(TOKEN_KEY,token);
      say('正在检查云端数据…');
      const [remote,data]=await Promise.all([readRemote(),snapshot()]);
      const fp=fingerprint(data), base=baseline();
      if (mode==='download') {
        if (!remote) throw new Error('仓库中还没有云端备份。');
        await downloadRemote(remote,password); return;
      }
      if (mode==='upload') {
        if (!confirm('将使用当前设备的本地数据覆盖云端备份。建议先确认本地数据完整。继续吗？')) return;
        await uploadInitial(password,remote); return;
      }
      if (!remote) {
        if (!confirm('云端还没有备份。现在将本机数据加密后上传，作为首次云同步数据。继续吗？')) return;
        await uploadInitial(password,null); return;
      }
      if (!base) {
        const choice=confirm('检测到云端已有备份，但本机尚未建立同步基线。\n\n点击「确定」：下载云端数据并覆盖本机。\n点击「取消」：保留本机数据，不执行同步。若要用本机数据覆盖云端，请点击「上传本机覆盖云端」。');
        if (choice) { await downloadRemote(remote,password); return; }
        say('尚未建立同步关系。可选择下载云端，或明确上传本机数据。'); return;
      }
      if (remote.sha!==base.sha) {
        say('检测到云端版本已变化，自动同步已暂停。请先选择下载云端或上传本机覆盖。',true);
        return;
      }
      if (fp===base.fingerprint) { say('已同步 · 本地与云端一致'); return; }
      say('正在加密并上传本地更改…');
      const envelope=await encryptData(data,password);
      const result=await writeRemote(envelope,remote.sha);
      setBaseline(result.content?.sha || '',fp);
      say('同步完成 · '+new Date().toLocaleTimeString());
    } catch(err) { say(err.message || '同步失败',true); }
    finally { busy=false; }
  }
  function startAuto() {
    if (timer) clearInterval(timer);
    timer=setInterval(async()=>{
      if (!autoEnabled || busy || !cryptoKey && !getPassword()) return;
      try {
        const data=await snapshot(), fp=fingerprint(data), base=baseline();
        if (base && fp!==base.fingerprint) await syncNow('normal');
      } catch(err) { say('自动同步检查失败：'+err.message,true); }
    },20000);
  }
  function init() {
    const token=localStorage.getItem(TOKEN_KEY)||'';
    if (el('cloudToken')) el('cloudToken').value=token;
    el('cloudSaveToken')?.addEventListener('click',()=>{
      const value=el('cloudToken').value.trim();
      if (!value) {localStorage.removeItem(TOKEN_KEY);say('已清除本机保存的 Token');return;}
      localStorage.setItem(TOKEN_KEY,value);say('Token 已保存在本机浏览器');
    });
    el('cloudSyncNow')?.addEventListener('click',()=>syncNow('normal'));
    el('cloudDownload')?.addEventListener('click',()=>syncNow('download'));
    el('cloudUpload')?.addEventListener('click',()=>syncNow('upload'));
    el('cloudAuto')?.addEventListener('change',e=>{autoEnabled=e.target.checked;say(autoEnabled?'自动同步检查已开启':'自动同步检查已暂停')});
    startAuto();
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();