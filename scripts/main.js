/* ======================================
   main.js – Theme, Owner, RSS builder
   ====================================== */

const OWNER_PASS_HASH = "2ffb19123989a7a76ef9d8504042c027d39e245aeab3bc5699ecd26078edeaaa";
let owner = false;
const $ = s => document.querySelector(s);

const BLOG = {
  rss: "https://carolyn0515.tistory.com/rss",
  maxPerCategory: 6,
  titleKeywords: {
    "혼자 공부하는 머신러닝 + 딥러닝": ["혼자", "머신러닝", "딥러닝", "ch."],
    "Deep Learning step 1": ["Deep", "신경망", "로지스틱"]
  }
};

/* --- Theme toggle --- */
const root = document.documentElement, themeBtn = $('#themeBtn');
function applyTheme(t){
  root.setAttribute('data-theme', t);
  themeBtn.textContent = (t==='dark') ? '🌙 Dark' : '☀️ Light';
  themeBtn.setAttribute('aria-pressed', t==='dark'?'true':'false');
  localStorage.setItem('theme', t);
}
applyTheme(localStorage.getItem('theme') || 'light');
themeBtn?.addEventListener('click', ()=>{
  const next = (root.getAttribute('data-theme')==='light')?'dark':'light';
  applyTheme(next);
});

/* --- Owner login --- */
async function sha256(txt){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function requestOwner(){
  const m = $('#ownerModal'), inp = $('#ownerPass'), ok = $('#ownerOk'), cancel = $('#ownerCancel');
  return new Promise(resolve=>{
    function close(res){ m.classList.remove('open'); ok.onclick = cancel.onclick = null; resolve(res); }
    ok.onclick = async ()=>{ const h = await sha256(inp.value||''); close(h===OWNER_PASS_HASH); };
    cancel.onclick = ()=>close(false);
    m.classList.add('open'); inp.value=''; inp.focus();
  });
}
function setOwner(on){
  owner = on;
  $('#lockBtn').setAttribute('aria-pressed', on?'true':'false');
  localStorage.setItem('owner', on?'1':'0');
}
$('#lockBtn')?.addEventListener('click', async ()=>{
  if(!owner){ if(await requestOwner()) setOwner(true); else alert('Wrong password'); }
  else setOwner(false);
});
setOwner(localStorage.getItem('owner')==='1');

/* --- RSS fetch (CORS fallback) --- */
async function fetchRSS(url){
  const targets = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    url
  ];
  for(const t of targets){
    try{
      const r = await fetch(t);
      if(!r.ok) continue;
      if(t.includes('allorigins')){ const j=await r.json(); if(j.contents) return j.contents; }
      if(t.includes('codetabs')) return await r.text();
      return await r.text();
    }catch(_){}
  }
  return '';
}
function parseRSS(txt){
  const xml = new DOMParser().parseFromString(txt,"text/xml");
  const items = [...xml.querySelectorAll('item')];
  return items.map(it=>({
    title: it.querySelector('title')?.textContent?.trim() || '(untitled)',
    link: it.querySelector('link')?.textContent?.trim() || '#',
    categories: [...it.querySelectorAll('category')].map(c=>c.textContent.trim())
  }));
}
function norm(s){return (s||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'').trim();}
function attachTopTarget(a){
  a.setAttribute('target','_top'); a.setAttribute('rel','noopener noreferrer');
  a.addEventListener('click', e=>{
    const href=a.getAttribute('href');
    if(href && /^https?:\/\//i.test(href)){ try{window.top.location.href=href;e.preventDefault();}catch(_){ } }
  });
}

/* --- Build blog cards --- */
(async function(){
  const cont = document.getElementById('contents');
  if(!cont) return;
  const text = await fetchRSS(BLOG.rss);
  const posts = parseRSS(text);
  const categories = [
    {name:"혼자 공부하는 머신러닝 + 딥러닝"},
    {name:"Deep Learning step 1"}
  ];

  function isMatch(post, cat){
    const cN = norm(cat);
    const cats = (post.categories||[]).map(norm);
    if(cats.some(x=>x.includes(cN)||cN.includes(x))) return true;
    const title = norm(post.title);
    const keys = BLOG.titleKeywords[cat]||[];
    return keys.some(k=>title.includes(norm(k)));
  }

  categories.forEach((c,idx)=>{
    const card = document.createElement('div'); card.className='q-card';
    const h4=document.createElement('h4'); h4.textContent=c.name;
    const ul=document.createElement('ul'); ul.className='q-list';
    let list = posts.filter(p=>isMatch(p,c.name)).slice(0,BLOG.maxPerCategory);
    if(list.length===0) list = posts.slice(0,Math.min(6,posts.length));
    list.forEach(p=>{
      const li=document.createElement('li'); const a=document.createElement('a');
      a.textContent=p.title; a.href=p.link; attachTopTarget(a);
      li.appendChild(a); ul.appendChild(li);
    });
    card.appendChild(h4); card.appendChild(ul); cont.appendChild(card);
  });
})();
