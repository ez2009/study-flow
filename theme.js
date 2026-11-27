(function(){
  const KEY='study-flow-theme-v2';
  const root=document.documentElement;
  const select=()=>document.getElementById('themeSelect');
  const button=()=>document.getElementById('themeToggle');
  function preferred(){return localStorage.getItem(KEY)||'system'}
  function apply(mode){
    const actual=mode==='system'?(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):mode;
    root.dataset.theme=actual;
    const meta=document.getElementById('metaThemeColor');
    if(meta)meta.setAttribute('content',actual==='dark'?'#111821':'#f7f8fa');
    const b=button();if(b){b.textContent=actual==='dark'?'☀':'☾';b.title=actual==='dark'?'切换到日间模式':'切换到夜间模式';}
    const s=select();if(s&&s.value!==mode)s.value=mode;
  }
  function set(mode){if(!['system','light','dark'].includes(mode))mode='system';localStorage.setItem(KEY,mode);apply(mode)}
  document.addEventListener('DOMContentLoaded',()=>{
    apply(preferred());
    const s=select();if(s){s.value=preferred();s.addEventListener('change',()=>set(s.value));}
    const b=button();if(b)b.addEventListener('click',()=>set(root.dataset.theme==='dark'?'light':'dark'));
    if(window.matchMedia){const mq=window.matchMedia('(prefers-color-scheme: dark)');mq.addEventListener?.('change',()=>{if(preferred()==='system')apply('system')});}
  });
  window.studyFlowSetTheme=set;
})();
