(function(){
  const CFG='study-flow-ai-config-v1';
  const CHAT='study-flow-ai-chat-v1';
  const SESSION_KEY='study-flow-ai-session-key';
  const $=id=>document.getElementById(id);
  let messages=[];
  let busy=false;
  const defaults={provider:'deepseek',baseUrl:'https://api.deepseek.com',model:'deepseek-flash'};
  function readConfig(){try{return {...defaults,...JSON.parse(localStorage.getItem(CFG)||'{}')}}catch{return {...defaults}}}
  function getKey(){return sessionStorage.getItem(SESSION_KEY)||localStorage.getItem('study-flow-ai-remembered-key')||''}
  function saveConfig(){
    const cfg={provider:$('aiProvider').value,baseUrl:$('aiBaseUrl').value.trim(),model:$('aiModel').value.trim()};
    if(!cfg.baseUrl||!cfg.model){setStatus('请填写 API 地址和模型 ID。',true);return false;}
    localStorage.setItem(CFG,JSON.stringify(cfg));
    const key=$('aiApiKey').value.trim();
    if(key){
      if($('aiRememberKey').checked){localStorage.setItem('study-flow-ai-remembered-key',key);sessionStorage.removeItem(SESSION_KEY)}
      else{sessionStorage.setItem(SESSION_KEY,key);localStorage.removeItem('study-flow-ai-remembered-key')}
    }
    setStatus('配置已保存。API Key '+(key?($('aiRememberKey').checked?'已保存在本机浏览器':'仅在当前会话中保存'):(getKey()?'继续使用已有 Key':'尚未填写'))+'。');
    updateAIStatus();return true;
  }
  function setStatus(msg,error=false){const el=$('aiConfigStatus');if(el){el.textContent=msg;el.style.color=error?'#c45a52':''}}
  function updateAIStatus(){const cfg=readConfig(),el=$('aiStatus');if(el)el.textContent=(getKey()?'已配置 · ':'未配置 · ')+(cfg.provider==='deepseek'?'DeepSeek':cfg.provider==='openai'?'OpenAI':'自定义接口')+' / '+cfg.model;}
  function loadConfig(){
    const c=readConfig();
    if($('aiProvider'))$('aiProvider').value=c.provider;
    if($('aiBaseUrl'))$('aiBaseUrl').value=c.baseUrl;
    if($('aiModel'))$('aiModel').value=c.model;
    if($('aiRememberKey'))$('aiRememberKey').checked=!!localStorage.getItem('study-flow-ai-remembered-key');
    updateAIStatus();
  }
  function setProviderDefaults(){const p=$('aiProvider').value;if(p==='deepseek'){$('aiBaseUrl').value='https://api.deepseek.com';$('aiModel').value='deepseek-flash'}else if(p==='openai'){$('aiBaseUrl').value='https://api.openai.com/v1';$('aiModel').value='gpt-5.5'}else{$('aiBaseUrl').value='';$('aiModel').value=''}}
  function endpoint(){const c=readConfig();let base=c.baseUrl.trim().replace(/\/+$/,'');return base.endsWith('/chat/completions')?base:base+'/chat/completions'}
  function contextText(){
    if(!$('aiIncludeContext')?.checked)return '';
    try{
      const tasks=(state?.tasks||[]).slice(0,35).map(t=>({title:t.name,subject:t.subject||'',status:t.status==='done'?'已完成':'待完成',importance:!!t.importance,urgent:!!t.urgent,due:t.dueDate||''}));
      const resources=(state?.resources||[]).slice(0,15).map(r=>({name:r.name,subject:r.subject,chapters:(r.chapters||[]).slice(0,12).map(c=>({name:c.name,pages:c.pages,questions:c.questions}))}));
      const plan=(state?.plans||[]).slice(-1)[0];
      const planSummary=plan?{dates:plan.dates,items:(plan.items||[]).slice(0,20).map(x=>({day:x.day,name:x.itemName,start:x.start,end:x.end,status:x.status}))}:null;
      return '\n\n[当前 STUDY FLOW 学习数据摘要]\n'+JSON.stringify({tasks,resources,latestPlan:planSummary,sessionCount:(state?.sessions||[]).length},null,2)+'\n请把这些内容仅作为分析上下文，不要假设数据中未出现的信息。';
    }catch(e){return ''}
  }
  function loadChat(){try{messages=JSON.parse(localStorage.getItem(CHAT)||'[]').slice(-30)}catch{messages=[]}renderChat();}
  function saveChat(){localStorage.setItem(CHAT,JSON.stringify(messages.slice(-30)))}
  function renderChat(){const box=$('aiMessages');if(!box)return;box.innerHTML='';if(!messages.length){const intro=document.createElement('div');intro.className='ai-message assistant';intro.textContent='你好！我是 STUDY FLOW 助手。你可以让我帮你拆分任务、规划周末学习时间，或复盘学习进度。';box.appendChild(intro)}messages.forEach(m=>{const el=document.createElement('div');el.className='ai-message '+(m.role==='user'?'user':'assistant');el.textContent=m.content;box.appendChild(el)});box.scrollTop=box.scrollHeight;}
  async function callAPI(history,maxTokens=1400){
    const c=readConfig(),key=getKey();if(!key)throw new Error('还没有 API Key。请先到「设置与工具 → AI 配置」填写。');
    const body={model:c.model,messages:history,stream:false};
    if(c.provider==='deepseek'){body.max_tokens=maxTokens;body.thinking={type:'disabled'}}else{body.max_completion_tokens=maxTokens;}
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);let res,data;
    try{res=await fetch(endpoint(),{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify(body),signal:controller.signal});const raw=await res.text();try{data=raw?JSON.parse(raw):{}}catch{throw new Error('服务商返回了非 JSON 内容（HTTP '+res.status+'）。请检查 API 地址和模型。')}}
    catch(e){if(e.name==='AbortError')throw new Error('AI 请求超过 45 秒，已自动停止。可以减少所选任务后重试。');if(e instanceof TypeError)throw new Error('无法连接 AI 服务。请检查网络、API 地址和浏览器跨域（CORS）限制。');throw e}
    finally{clearTimeout(timeout)}
    if(!res.ok)throw new Error(data?.error?.message||data?.message||('请求失败，HTTP '+res.status));
    const message=data?.choices?.[0]?.message,content=message?.content;
    if(typeof content==='string'&&content.trim())return content;
    if(Array.isArray(content)){const joined=content.map(x=>x.text||'').join('\\n').trim();if(joined)return joined;}
    if(message?.refusal)throw new Error('模型拒绝了本次请求：'+message.refusal);
    throw new Error('接口返回成功，但没有找到有效回复内容。');
  }
  async function send(text){
    if(busy)return;const input=$('aiInput');const value=(text??input?.value??'').trim();if(!value)return;
    if(!getKey()){alert('请先在「设置与工具 → AI 配置」填写 API Key。');if(typeof navigate==='function')navigate('settings');return}
    if(input)input.value='';messages.push({role:'user',content:value});renderChat();saveChat();busy=true;const btn=$('aiSend');if(btn){btn.disabled=true;btn.textContent='思考中…'}
    try{
      const sys='你是 STUDY FLOW 的学习规划助手。请用简体中文回答，表达清楚、简洁、可执行。你拥有直接配置周末计划的权限：当用户要求制定、调整或落实周末计划时，必须在回复JSON中给出weekendConfig操作，程序会直接设置周末计划页面的可用时间、强度、安排倾向、固定不可用时段和任务选择，并调用现有计划生成器生成时间表。taskIds必须使用上下文中真实存在的任务ID；若用户没有指定任务，选择所有未完成待办任务。不要编造任务ID。配置字段可包含satStart,satEnd,sunStart,sunEnd,breakStart,breakEnd,intensity(light/standard/focused),mode(balanced/weak/urgent/exam),blocked,taskIds,useAI。普通聊天则不需要操作。必须返回JSON对象：{reply:"给用户看的自然语言回复",weekendConfig:null或配置对象}。不要声称计划已生成，除非返回了有效weekendConfig操作。涉及学习计划时保留休息和自由时间。'+contextText();
      const history=[{role:'system',content:sys},...messages.slice(-20).map(m=>({role:m.role,content:m.content}))];
      const answer=await callAPI(history,2600);
      let visible=answer||'模型返回了空内容。';
      try{
        const cleaned=visible.trim().replace(/^\x60\x60\x60(?:json)?\s*/i,'').replace(/\s*\x60\x60\x60$/,'');
        const parsed=JSON.parse(cleaned);
        if(parsed&&typeof parsed==='object'){
          visible=String(parsed.reply||'已收到。');
          if(parsed.weekendConfig&&typeof parsed.weekendConfig==='object'){
            if(typeof window.studyFlowConfigureWeekend!=='function')throw new Error('周末计划配置模块尚未加载');
            const ok=await window.studyFlowConfigureWeekend(parsed.weekendConfig);
            visible+='\\n\\n已根据你的要求配置周末计划并调用生成器。请检查页面中的时间表；若有未安排任务，可继续让我调整。';
          }
        }
      }catch(e){if(e instanceof SyntaxError){/* 兼容模型未按结构化格式回复的普通文本 */}else throw e}
      messages.push({role:'assistant',content:visible});saveChat();renderChat();
    }catch(e){messages.push({role:'assistant',content:'请求失败：'+(e.message||String(e))+'\n\n如果你使用 GitHub Pages，请确认服务商允许浏览器跨域请求（CORS）。如果浏览器报告 CORS 错误，纯静态前端无法绕过，需要改用可信代理服务。'});saveChat();renderChat()}
    finally{busy=false;if(btn){btn.disabled=false;btn.textContent='发送'}updateAIStatus()}
  }
  async function requestForPlanner(systemPrompt,userPrompt){
    if(!getKey())throw new Error('请先到「设置与工具 → AI 配置」填写 API Key。');
    return callAPI([{role:'system',content:systemPrompt},{role:'user',content:userPrompt}],3000);
  }
  async function testConnection(){if(!saveConfig())return;const key=getKey();if(!key){setStatus('请先填写 API Key。',true);return}setStatus('正在测试连接…');try{const answer=await callAPI([{role:'user',content:'请只回复：连接成功'}]);setStatus('连接成功：'+answer.slice(0,80));}catch(e){setStatus('连接失败：'+e.message,true)}}
  function clearChat(){if(!confirm('确定清空 AI 对话历史？'))return;messages=[];saveChat();renderChat()}
  document.addEventListener('DOMContentLoaded',()=>{
    loadConfig();loadChat();
    $('aiProvider')?.addEventListener('change',setProviderDefaults);
    $('aiSave')?.addEventListener('click',saveConfig);
    $('aiTest')?.addEventListener('click',testConnection);
    $('aiForgetKey')?.addEventListener('click',()=>{localStorage.removeItem('study-flow-ai-remembered-key');sessionStorage.removeItem(SESSION_KEY);$('aiApiKey').value='';$('aiRememberKey').checked=false;setStatus('已删除本机保存的 API Key。');updateAIStatus()});
    $('aiSend')?.addEventListener('click',()=>send());
    $('aiInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}});
    document.querySelectorAll('[data-ai-prompt]').forEach(b=>b.addEventListener('click',()=>{if($('aiInput'))$('aiInput').value=b.dataset.aiPrompt;send(b.dataset.aiPrompt)}));
  });
  window.clearAIChat=clearChat;
  window.studyFlowSendAI=send;
  window.studyFlowAIRequest=requestForPlanner;
})();
