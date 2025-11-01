/* =========================================================
   main.js  —  Owner Mode / Theme / Local Data / RSS Sync
   - Timeline(이력) 편집·삭제·추가(➕)
   - 카테고리 카드에 RSS 글 동기화
========================================================= */

/* ------------------ Config ------------------ */
const OWNER_PASS_HASH = "2ffb19123989a7a76ef9d8504042c027d39e245aeab3bc5699ecd26078edeaaa";
const BLOG = {
  rss: "https://carolyn0515.tistory.com/rss",
  maxPerCategory: 6,
  // 카테고리 이름 → 제목 매칭 키워드(보조; RSS category가 없을 때 사용)
  titleKeywords: {
    "혼자 공부하는 머신러닝 + 딥러닝": ["혼자 공부하는", "딥러닝", "머신러닝", "ch."],
    "Deep Learning step 1": ["Deep Learning step 1", "신경망", "로지스틱"]
  }
};

/* ------------------ State & Helpers ------------------ */
let owner = false;
const $  = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];

function saveData() {
  localStorage.setItem("nk_portfolio", JSON.stringify(data));
  renderStatic();     // 이름/역할/칩/카테고리/이력 다시 그림
}

/* 기본 데이터(이름/역할/카테고리/이력) */
const defaults = {
  profile:{ name:"Na-kyung Kim", role:"Data Science · ML/DL" },
  cats:[
    {name:"혼자 공부하는 머신러닝 + 딥러닝", count:null, url:"#"},
    {name:"Deep Learning step 1", count:null, url:"#"}
  ],
  timeline:[
    {title:"DKU CI Lab — Undergraduate Researcher", sub:"PHQ-9 기반 개선확률 예측 · CATE uplift · GRU encoder"},
    {title:"ReFit — NIR 의류 분류 · 순환경제 플랫폼", sub:"spectrum signal → clothing class · citizen incentive loop"},
    {title:"Pulse-based ECG Fitness Game (Mobile)", sub:"Android · real-time bio-signal driven gamification"}
  ]
};

function loadData(){
  try{
    const j = JSON.parse(localStorage.getItem('nk_portfolio')||'null');
    return j?j:JSON.parse(JSON.stringify(defaults));
  }catch(e){return JSON.parse(JSON.stringify(defaults));}
}
let data = loadData();

/* ------------------ Owner Modal / Theme ------------------ */
async function sha256(txt){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

function requestOwner(){
  return new Promise(resolve=>{
    const m = $('#ownerModal');
    const inp = $('#ownerPass');
    const ok = $('#ownerOk');
    const cancel = $('#ownerCancel');
    function close(res){ m.classList.remove('open'); ok.onclick = cancel.onclick = null; resolve(res); }
    ok.onclick = async ()=>{ const h = await sha256(inp.value||''); close(h===OWNER_PASS_HASH); };
    cancel.onclick = ()=> close(false);
    m.classList.add('open'); inp.value=''; inp.focus();
  });
}
function setOwnerMode(on){
  owner = on;
  $('#lockBtn')?.setAttribute('aria-pressed', on?'true':'false');
  localStorage.setItem('nk_owner', on?'1':'0');
  renderStatic(); // owner에 따라 편집 아이콘 표시/숨김
}

function initOwnerAndTheme(){
  // Owner
  setOwnerMode(localStorage.getItem('nk_owner')==='1');
  $('#lockBtn')?.addEventListener('click', async ()=>{
    if(!owner){ if(await requestOwner()) setOwnerMode(true); else alert('Wrong password.'); }
    else setOwnerMode(false);
  });

  // Theme
  const root = document.documentElement;
  const themeBtn = $('#themeBtn');
  function applyTheme(t){
    root.setAttribute('data-theme', t);
    const isDark = t==='dark';
    themeBtn.textContent = isDark ? '🌙 Dark' : '☀️ Light';
    themeBtn.setAttribute('aria-pressed', isDark?'true':'false');
    localStorage.setItem('nk_theme', t);
  }
  applyTheme(localStorage.getItem('nk_theme') || (root.getAttribute('data-theme')||'light'));
  themeBtn?.addEventListener('click', ()=>{
    const next = (root.getAttribute('data-theme')==='light') ? 'dark' : 'light';
    applyTheme(next);
  });
}

/* ------------------ Static Render ------------------ */
function renderStatic(){
  // 프로필
  $('#cfg_name').textContent = data.profile.name;
  $('#cfg_role').textContent = data.profile.role;
  $('#cfg_name_inline').textContent = data.profile.name;

  const initials = (data.profile.name||'')
    .split(/\s+/).map(w=>w[0]||'').slice(0,2).join('').toUpperCase();
  const fb = $('#avatarFallback'); if(fb) fb.textContent = initials || 'NK';

  // 상단 카테고리 칩
  const top = $('#topChips'); top.innerHTML = '';
  // 카테고리 인덱스(카드)
  const cl  = $('#catList');  cl.innerHTML = '';
  data.cats.forEach((c,i)=>{
    const chip = document.createElement('a');
    chip.className='chip'; chip.href=`#cat-${i}`; chip.textContent=c.name;
    top.appendChild(chip);

    const row = document.createElement('div');
    row.className='catrow';
    row.innerHTML =
      `<div><a href="#cat-${i}" style="color:inherit">${c.name}</a></div>
       <span class="badge" id="cat-count-${i}">${c.count ?? 0}</span>`;
    cl.appendChild(row);
  });

  // 이력 타임라인
  renderTimeline();
}

function renderTimeline(){
  const tl = $('#timeline'); tl.innerHTML='';
  data.timeline.forEach((x, idx)=>{
    const d = document.createElement('div');
    d.className = 'tl-row';
    d.style.margin = '10px 0';
    d.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div>
          <strong>${escapeHTML(x.title)}</strong><br/>
          <span class="sub">${escapeHTML(x.sub||'')}</span>
        </div>
        <div class="tiny" style="${owner?'':'display:none'};display:flex;gap:8px">
          <button title="수정" data-act="tl-edit" data-idx="${idx}">✏️</button>
          <button title="삭제" data-act="tl-del"  data-idx="${idx}">🗑️</button>
        </div>
      </div>`;
    tl.appendChild(d);
  });
}

/* ------------------ RSS / Contents ------------------ */
function norm(s){return (s||'').toString().toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'').trim();}

function attachTopTarget(a){
  if(!a) return;
  a.setAttribute('target','_top');
  a.setAttribute('rel','noopener noreferrer');
  a.addEventListener('click',(e)=>{
    const href=a.getAttribute('href');
    if(href && /^https?:\/\//i.test(href)){
      try{ window.top.location.href = href; e.preventDefault(); }catch(_){}
    }
  });
}

async function fetchWithFallback(url){
  const targets = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    url
  ];
  for(const t of targets){
    try{
      const r = await fetch(t, {cache:'no-store'});
      if(!r.ok) continue;
      if(t.includes('allorigins')){ const j=await r.json(); if(j?.contents) return j.contents; }
      else if(t.includes('api.codetabs')){ return await r.text(); }
      else { return await r.text(); }
    }catch(_){/* try next */}
  }
  return '';
}

function parseFeed(text){
  if(!text) return [];
  try{
    const j = JSON.parse(text);
    if(j.items){
      return j.items.map(it=>({
        title: it.title || '(untitled)',
        link:  it.url || it.external_url || '#',
        categories: it.tags || it.categories || []
      }));
    }
  }catch(_){}
  const xml = new DOMParser().parseFromString(text,"text/xml");
  const items = [...xml.querySelectorAll('item')];
  if(items.length){
    return items.map(it=>({
      title: it.querySelector('title')?.textContent?.trim() || '(untitled)',
      link:  it.querySelector('link')?.textContent?.trim() || '#',
      categories: [...it.querySelectorAll('category')].map(c=>c.textContent.trim())
    }));
  }else{
    const entries = [...xml.querySelectorAll('entry')];
    return entries.map(en=>({
      title: en.querySelector('title')?.textContent?.trim() || '(untitled)',
      link:  en.querySelector('link')?.getAttribute('href') || '#',
      categories: [...en.querySelectorAll('category')].map(c=>c.getAttribute('term')||c.textContent.trim())
    }));
  }
}

function isMatchForCategory(post, catName){
  const catN = norm(catName);
  const cats = (post.categories||[]).map(norm);
  if(cats.some(c=>c.includes(catN) || catN.includes(c))) return true;
  const titleN = norm(post.title);
  const kws = BLOG.titleKeywords[catName] || [];
  if(kws.some(k=>titleN.includes(norm(k)))) return true;
  return false;
}

async function buildContents(){
  const cont = $('#contents'); cont.innerHTML='';
  const text  = await fetchWithFallback(BLOG.rss);
  const posts = parseFeed(text);

  data.cats.forEach((c, idx)=>{
    const card = document.createElement('div'); card.className='q-card'; card.id=`cat-${idx}`;
    const h4 = document.createElement('h4'); h4.textContent = c.name;
    const ul = document.createElement('ul'); ul.className = 'q-list';

    let list = posts.filter(p=>isMatchForCategory(p, c.name))
                    .slice(0, BLOG.maxPerCategory);
    if(list.length===0){ list = posts.slice(0, Math.min(BLOG.maxPerCategory, posts.length)); }

    const badge = $(`#cat-count-${idx}`);
    if(badge) badge.textContent = list.length;

    list.forEach(p=>{
      const li = document.createElement('li');
      const a  = document.createElement('a');
      a.textContent = p.title;
      a.href = p.link || '#';
      attachTopTarget(a);
      li.appendChild(a);
      ul.appendChild(li);
    });

    card.appendChild(h4);
    card.appendChild(ul);
    cont.appendChild(card);
  });
}

/* ------------------ Editing (Timeline & Add) ------------------ */
document.addEventListener('click', (e)=>{
  // 이력 수정
  const editBtn = e.target.closest('button[data-act="tl-edit"]');
  if(editBtn){
    if(!owner) return;
    const idx = +editBtn.dataset.idx;
    const cur = data.timeline[idx];
    const t = prompt('이력 제목', cur?.title ?? '');
    if(t==null) return;
    const s = prompt('세부내용(서브텍스트)', cur?.sub ?? '');
    data.timeline[idx] = {title: t, sub: s||''};
    saveData();
    return;
  }
  // 이력 삭제
  const delBtn = e.target.closest('button[data-act="tl-del"]');
  if(delBtn){
    if(!owner) return;
    const idx = +delBtn.dataset.idx;
    if(confirm('이력을 삭제할까요?')){
      data.timeline.splice(idx,1);
      saveData();
    }
    return;
  }
});

/* === 이력 제목 옆 "➕" 버튼 (owner 모드에서만 보임) === */
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-act="add-tl"]');
  if(!btn || !owner) return;
  const t = prompt('이력 제목', 'New Highlight');
  if(!t) return;
  const s = prompt('세부내용(서브텍스트)', '');
  data.timeline.unshift({title:t, sub:s||''});
  saveData();
});

/* ------------------ Utilities ------------------ */
function escapeHTML(str){
  return (str??'').replace(/[&<>"']/g, m=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

/* ------------------ Init ------------------ */
document.addEventListener('DOMContentLoaded', async ()=>{
  initOwnerAndTheme();
  renderStatic();
  await buildContents();
});
