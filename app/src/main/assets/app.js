'use strict';
/* ================================================================
   VENOLK1 — app.js  (Clean complete build)
   Forms live in the Add Manager page — no popups needed.
   Storage keys: vk_*
================================================================ */

/* Suppress old modal overlay */
(function(){
  var s=document.createElement('style');
  s.textContent='#modal-overlay,#modal-box{display:none!important;pointer-events:none!important}'
    +'.form-row{margin-bottom:13px}'
    +'.form-row label{display:block;font-size:.74rem;font-weight:600;color:var(--txt2,#8888bb);margin-bottom:5px;text-transform:uppercase;letter-spacing:.04em}';
  document.head.appendChild(s);
})();

/* No-op stubs — nothing uses these anymore */
function openModal(){}
function closeModal(){}
function confirmDlg(msg,onYes,yesText,yesClass){if(window.confirm(msg.replace(/<[^>]+>/g,'')))onYes();}

/* ============================================================
   2. CONSTANTS
============================================================ */
var PAGES=['dashboard','calendar','books','routine','srs','flashcards','notes','pomodoro','mindmap','prayer','internet','analytics','settings','addmgr'];
var QUOTES=[
  {t:'Seek knowledge from the cradle to the grave.',s:'Prophet Muhammad \uFDFA'},
  {t:'Read! In the name of your Lord who created.',s:'Quran 96:1'},
  {t:'Whoever follows a path to seek knowledge, Allah will make the path to Paradise easy.',s:'Sahih Muslim'},
  {t:'The ink of the scholar is more sacred than the blood of the martyr.',s:'Ibn Abd al-Barr'},
  {t:'Knowledge is not what is memorised; knowledge is what benefits.',s:"Imam Shafi'i"},
  {t:'The best among you are those who learn the Quran and teach it.',s:'Sahih Bukhari'},
  {t:'Indeed, after hardship comes ease.',s:'Quran 94:6'},
  {t:'The best of deeds are those done consistently, even if small.',s:'Sahih Bukhari'},
  {t:'An investment in knowledge pays the best interest.',s:'Benjamin Franklin'},
  {t:'The beautiful thing about learning is that no one can take it away from you.',s:'B.B. King'},
  {t:'Live as if you were to die tomorrow. Learn as if you were to live forever.',s:'Mahatma Gandhi'},
  {t:'Education is the most powerful weapon which you can use to change the world.',s:'Nelson Mandela'}
];
var EMOJIS=['🎓','📚','🧑‍🎓','👨‍💻','🦅','🌟','🔥','⚡','🎯','🚀','🌙','☀️','🦁','🐉','🌊','🏔️','💎','🌺','🦋','🎭','🤖','🎮','🏆','💡','🔮','🌈','🎨','🎵','🦊','🦄','🌸','🍀','💫','✨','🌀','🔑','⚙️','🎲'];
var ACHIEVEMENT_DEFS=[
  {id:'streak_7',ico:'🔥',name:'7-Day Streak',desc:'Study 7 days in a row',chk:function(s){return(s.streak||0)>=7;}},
  {id:'chaps_50',ico:'📚',name:'Bookworm',desc:'Complete 50 chapters',chk:function(s){return(s.totalChaps||0)>=50;}},
  {id:'cards_500',ico:'🧠',name:'Card Shark',desc:'Review 500 flashcards',chk:function(s){return(s.totalCards||0)>=500;}},
  {id:'marathon',ico:'⏱',name:'Marathon',desc:'Study 2+ hours in one day',chk:function(s){return(s.longestSess||0)>=120;}},
  {id:'prayers_5',ico:'🕌',name:'Devoted',desc:'Complete all 5 prayers today',chk:function(s){return(s.prayersToday||0)>=5;}},
  {id:'notes_10',ico:'📝',name:'Note Taker',desc:'Write 10 notes',chk:function(s){return(s.totalNotes||0)>=10;}},
  {id:'books_5',ico:'🏆',name:'Collector',desc:'Add 5 books',chk:function(s){return(s.totalBooks||0)>=5;}}
];
var POMO={pomodoro:{f:25,s:5,l:15},long:{f:50,s:10,l:20},custom:{f:25,s:5,l:15}};
var LVL_XP=250;

/* ============================================================
   3. STORAGE
============================================================ */
function ld(key,def){try{var r=localStorage.getItem(key);if(r===null)return def!==undefined?def:null;return JSON.parse(r);}catch(e){return def!==undefined?def:null;}}
function sd(key,val){try{localStorage.setItem(key,JSON.stringify(val));}catch(e){showToast('Storage full','error');}}

/* ============================================================
   4. STATE
============================================================ */
var S={
  page:'dashboard',interacted:false,
  pomo:{running:false,paused:false,ts:null,pausedRem:null,dur:25*60000,sb:5*60000,lb:15*60000,phase:'focus',sessCount:0,mode:'pomodoro',raf:null,subj:'',bookId:'',chapId:''},
  mm:{nodes:[],edges:[],mapId:null,selNode:null,connFrom:null,tx:0,ty:0,scale:1,dragging:false,dragId:null,dox:0,doy:0,panning:false,psx:0,psy:0,ptx:0,pty:0,nodeColor:'#7c6fff',nodeShape:'rect'},
  notes:{id:null,timer:null,quill:null,recording:false,mediaRec:null,chunks:[],recSeconds:0,recInterval:null},
  books:{bookId:null,filter:'all',sort:'title'},
  srs:{queue:[],idx:0},
  fc:{deckId:null,queue:[],idx:0,inReview:false},
  prayer:{times:null},
  cal:{date:new Date(),view:'month'},
  alarm:{active:null,wakeupDone:false},
  charts:{},dbt:{}
};

/* ============================================================
   5. UTILITIES
============================================================ */
function genId(){return Date.now().toString(36)+Math.random().toString(36).substr(2,5);}
function cap(s){return s?s[0].toUpperCase()+s.slice(1):'';}
function todayStr(){return new Date().toISOString().split('T')[0];}
function addDays(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x;}
function fmt12(d){if(!d||!(d instanceof Date)||isNaN(d))return '--:--';var h=d.getHours(),m=d.getMinutes(),ap=h>=12?'PM':'AM';h=h%12||12;return h+':'+(m<10?'0':'')+m+' '+ap;}
function fmtDT(d){return d&&!isNaN(d)?d.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' '+fmt12(d):'—';}
function timeAgo(d){if(!d||isNaN(d))return'Never';var s=Math.floor((Date.now()-d)/1000);if(s<60)return'just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago';}
function hex2rgba(hex,a){if(!hex||!hex.startsWith('#'))return'rgba(124,111,255,'+a+')';var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return'rgba('+r+','+g+','+b+','+a+')';}
function deb(fn,ms,k){if(S.dbt[k])clearTimeout(S.dbt[k]);S.dbt[k]=setTimeout(fn,ms);}
function ms2mmss(ms){if(ms<=0)return'00:00';var t=Math.ceil(ms/1000);return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');}
function destroyChart(id){if(S.charts[id]){try{S.charts[id].destroy();}catch(e){}delete S.charts[id];}try{var c=document.getElementById(id);if(c&&typeof Chart!=='undefined'&&Chart.getChart){var x=Chart.getChart(c);if(x)x.destroy();}}catch(e){}}
function setText(id,v){var e=document.getElementById(id);if(e)e.textContent=v;}
function showEl(id,b){var e=document.getElementById(id);if(e)e.style.display=b?'':'none';}
function chartOpts(){return{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8888aa',font:{size:11,family:'DM Sans'}}}},scales:{y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#8888aa',font:{size:10}}},x:{grid:{display:false},ticks:{color:'#8888aa',font:{size:10}}}}};}
function requestNotifPermission(cb){if(!('Notification'in window)){cb(false);return;}if(Notification.permission==='granted'){cb(true);return;}if(Notification.permission==='denied'){cb(false);return;}Notification.requestPermission().then(function(p){cb(p==='granted');});}

/* ============================================================
   6. AUDIO + VIBRATION + NOTIFICATIONS
============================================================ */
var _audioCtx=null;
function getAudioCtx(){try{if(!_audioCtx||_audioCtx.state==='closed')_audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(_audioCtx.state==='suspended')_audioCtx.resume().catch(function(){});return _audioCtx;}catch(e){return null;}}
function playBeep(freq,dur,type,vol){try{var ctx=getAudioCtx();if(!ctx)return;var osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.type=type||'sine';osc.frequency.value=freq||880;var v=vol!==undefined?vol:0.5,d=dur||0.8;gain.gain.setValueAtTime(v,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+d);osc.start();osc.stop(ctx.currentTime+d+0.05);}catch(e){}}
function playPomoCompleteSound(){if(window.AndroidBridge){try{AndroidBridge.playAlarm();}catch(e){}try{AndroidBridge.vibrate(600);}catch(e){}return;}try{var ctx=getAudioCtx();if(!ctx)return;[523,659,784,1047].forEach(function(freq,i){var osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.type='sine';osc.frequency.value=freq;var t=ctx.currentTime+i*0.22;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(0.55,t+0.06);gain.gain.exponentialRampToValueAtTime(0.001,t+0.7);osc.start(t);osc.stop(t+0.75);});}catch(e){}}
function playAlarmSound(){if(window.AndroidBridge){try{AndroidBridge.playAlarm();}catch(e){}try{AndroidBridge.vibrate(1000);}catch(e){}return;}playPomoCompleteSound();setTimeout(function(){playBeep(440,2,'square',0.5);},900);try{navigator.vibrate&&navigator.vibrate([400,150,400,150,600]);}catch(e){}}
function stopAlarmSound(){if(window.AndroidBridge)try{AndroidBridge.stopAlarm();}catch(e){}}
function vibrateDevice(pattern){if(window.AndroidBridge){try{var total=Array.isArray(pattern)?pattern.filter(function(_,i){return i%2===0;}).reduce(function(a,b){return a+b;},0):(pattern|0);AndroidBridge.vibrate(total||500);}catch(e){}return;}try{if(navigator.vibrate)navigator.vibrate(pattern);}catch(e){}}
function sendNotif(title,body){var t=String(title||''),b=String(body||'');if(window.AndroidBridge){try{AndroidBridge.showNotification(t,b);}catch(e){}return;}if(!('Notification'in window))return;if(Notification.permission==='granted'){try{new Notification(t,{body:b,icon:'/favicon.ico'});}catch(e){}}else if(Notification.permission!=='denied'){Notification.requestPermission().then(function(p){if(p==='granted')try{new Notification(t,{body:b});}catch(e){}});}}
['click','touchend','keydown'].forEach(function(ev){document.addEventListener(ev,function _u(){var c=getAudioCtx();if(c&&c.state==='suspended')c.resume().catch(function(){});document.removeEventListener(ev,_u,true);},{once:true,passive:true,capture:true});});

/* ============================================================
   7. TOAST
============================================================ */
function showToast(msg,type){
  type=type||'info';
  try{
    var c=document.getElementById('toast-container');if(!c)return;
    var existing=c.querySelectorAll('.toast');if(existing.length>=4)existing[0].remove();
    var icons={success:'check-circle',error:'times-circle',warning:'exclamation-triangle',info:'info-circle'};
    var t=document.createElement('div');t.className='toast '+type;
    t.innerHTML='<i class="fa fa-'+icons[type]+' toast-ico '+type+'"></i><span>'+msg+'</span><button class="toast-close" onclick="this.parentElement.remove()">✕</button>';
    c.appendChild(t);setTimeout(function(){if(t.parentNode)t.remove();},3500);
  }catch(e){}
}

/* ============================================================
   8. ROUTER
============================================================ */
function showPage(pid){
  try{
    if(!PAGES.includes(pid))return;
    document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');p.style.display='';});
    document.querySelectorAll('.dock-btn').forEach(function(b){b.classList.toggle('active',b.dataset.page===pid);});
    var el=document.getElementById('page-'+pid);
    if(el){el.classList.add('active');if(['notes','mindmap','internet'].includes(pid))el.style.display='flex';try{el.scrollTop=0;}catch(e){}}
    S.page=pid;
    try{var activeBtn=document.querySelector('.dock-btn.active'),ds=document.getElementById('dock-scroll');if(activeBtn&&ds){var tgt=activeBtn.offsetLeft-(ds.offsetWidth/2)+(activeBtn.offsetWidth/2);ds.scrollTo({left:Math.max(0,tgt),behavior:'smooth'});}}catch(e){}
    var map={dashboard:renderDash,calendar:renderCal,books:renderBooks,routine:renderRoutine,srs:renderSRS,flashcards:renderFC,notes:initNotes,pomodoro:renderPomo,mindmap:initMM,prayer:renderPrayer,internet:initInternet,analytics:renderAnalytics,settings:renderSettings,addmgr:renderAddMgr};
    if(map[pid])map[pid]();
  }catch(e){console.error('showPage',pid,e);}
}

/* ============================================================
   9. DASHBOARD
============================================================ */
function renderDash(){
  var books=ld('vk_books',[]),chaps=ld('vk_chapters',[]),notes=ld('vk_notes',[]),sessions=ld('vk_sessions',[]),stats=ld('vk_stats',{xp:0,level:1,streak:0}),profile=ld('vk_user_profile',{name:'Student'});
  try{var hr=new Date().getHours(),greet=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';setText('dash-greeting',greet+', '+(profile.name||'Student')+'!');}catch(e){}
  try{var done=chaps.filter(function(c){return c.stages&&c.stages.reading&&c.stages.mcq&&c.stages.cq&&c.stages.exam;}).length;animNum('stat-books',books.length);animNum('stat-chapters',done);animNum('stat-notes',notes.length);animNum('stat-streak',stats.streak||0);}catch(e){}
  try{renderWeekChart(sessions);}catch(e){console.warn('weekChart',e);}
  try{renderSubjChart(sessions);}catch(e){console.warn('subjChart',e);}
  try{renderDashUpcoming();}catch(e){console.warn('upcoming',e);}
  try{renderDashSRS();}catch(e){console.warn('srs',e);}
  try{renderGoalRings(sessions);}catch(e){console.warn('rings',e);}
  try{renderQuote();}catch(e){console.warn('quote',e);}
  try{updateDashPrayer();}catch(e){console.warn('prayer',e);}
  try{updateXPBar(stats);}catch(e){}
  try{updateExamCd();}catch(e){}
}
function animNum(id,target){var el=document.getElementById(id);if(!el)return;var cur=0;var t=setInterval(function(){cur=Math.min(cur+Math.max(1,Math.ceil(target/20)),target);el.textContent=Math.round(cur);if(cur>=target)clearInterval(t);},15);}
function renderWeekChart(sessions){
  var canvas=document.getElementById('chart-weekly'),empty=document.getElementById('chart-weekly-empty');
  if(!canvas||typeof Chart==='undefined')return;
  var data=[0,0,0,0,0,0,0],now=new Date(),dow=(now.getDay()+6)%7;
  var ws=new Date(now.getTime()-dow*86400000);ws.setHours(0,0,0,0);
  (sessions||[]).filter(function(s){return s.phase==='focus';}).forEach(function(s){try{var d=new Date(s.ts||s.timestamp||0);if(isNaN(d.getTime()))return;var diff=Math.floor((d-ws)/86400000);if(diff>=0&&diff<7)data[diff]+=(s.dur||s.duration||0)/3600000;}catch(e){}});
  var has=data.some(function(v){return v>0;});
  if(empty)empty.style.display=has?'none':'flex';canvas.style.display=has?'block':'none';if(!has)return;
  destroyChart('chart-weekly');
  requestAnimationFrame(function(){try{S.charts['chart-weekly']=new Chart(canvas,{type:'bar',data:{labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],datasets:[{label:'Hours',data:data.map(function(v){return+v.toFixed(2);}),backgroundColor:'rgba(124,111,255,0.5)',borderColor:'#7c6fff',borderWidth:2,borderRadius:6,borderSkipped:false}]},options:Object.assign({},chartOpts(),{plugins:{legend:{display:false}}})});}catch(e){}});
}
function renderSubjChart(sessions){
  var canvas=document.getElementById('chart-subjects'),empty=document.getElementById('chart-subjects-empty');
  if(!canvas||typeof Chart==='undefined')return;
  var map={};(sessions||[]).filter(function(s){return s.phase==='focus'&&(s.subj||s.subject);}).forEach(function(s){try{var k=s.subj||s.subject;if(k)map[k]=(map[k]||0)+(s.dur||s.duration||0)/3600000;}catch(e){}});
  var labels=Object.keys(map),data=labels.map(function(k){return+map[k].toFixed(2);}),has=data.some(function(v){return v>0;});
  if(empty)empty.style.display=has?'none':'flex';canvas.style.display=has?'block':'none';if(!has)return;
  var colors=['#7c6fff','#00e5ff','#ff6b9d','#43e97b','#ffa94d','#f72585'];
  destroyChart('chart-subjects');
  requestAnimationFrame(function(){try{S.charts['chart-subjects']=new Chart(canvas,{type:'doughnut',data:{labels:labels,datasets:[{data:data,backgroundColor:colors.slice(0,labels.length),borderColor:'rgba(0,0,0,0.3)',borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'bottom',labels:{color:'#8888aa',font:{size:10},padding:8}}}}});}catch(e){}});
}
function renderDashUpcoming(){
  var el=document.getElementById('dash-upcoming');if(!el)return;
  var events=ld('vk_calendar',[]),now=new Date();
  var up=events.filter(function(e){return e.dt&&new Date(e.dt)>now;}).sort(function(a,b){return new Date(a.dt)-new Date(b.dt);}).slice(0,3);
  if(!up.length){el.innerHTML='<div class="empty-panel">No events. <span class="link" onclick="showPage(\'calendar\')">Add one</span></div>';return;}
  el.innerHTML=up.map(function(ev){return'<div class="panel-item" onclick="showPage(\'calendar\')"><div class="panel-dot" style="background:'+(ev.color||'#7c6fff')+'"></div><div class="panel-item-text"><div class="panel-item-title">'+(ev.topic||ev.subj||'Event')+'</div><div class="panel-item-sub">'+fmtDT(new Date(ev.dt))+'</div></div>'+(ev.isExam?'<span style="font-size:0.68rem;color:var(--a3)">⚠ Exam</span>':'')+'</div>';}).join('');
}
function renderDashSRS(){
  var el=document.getElementById('dash-srs-due'),badge=document.getElementById('dock-srs-badge');if(!el)return;
  var srs=ld('vk_srs_chapters',[]),today=new Date();today.setHours(23,59,59,999);
  var due=srs.filter(function(r){return!r.dueDate||new Date(r.dueDate)<=today;});
  if(badge){badge.textContent=due.length;badge.style.display=due.length>0?'flex':'none';}
  if(!due.length){el.innerHTML='<div class="empty-panel">No chapters due today 🎉</div>';return;}
  el.innerHTML=due.slice(0,3).map(function(r){return'<div class="panel-item" onclick="showPage(\'srs\')"><div class="panel-dot" style="background:#7c6fff"></div><div class="panel-item-text"><div class="panel-item-title">'+r.chapName+'</div><div class="panel-item-sub">'+r.bookTitle+'</div></div></div>';}).join('');
  if(due.length>3)el.innerHTML+='<div class="panel-item" onclick="showPage(\'srs\')"><span style="font-size:0.78rem;color:var(--txt3)">+'+(due.length-3)+' more →</span></div>';
}
function renderGoalRings(sessions){
  try{
    var goals=ld('vk_goals',{dailyHours:4,dailyChaps:3,dailyPomo:4}),chaps=ld('vk_chapters',[]);
    var tod=new Date();tod.setHours(0,0,0,0);
    var todSess=(sessions||[]).filter(function(s){
      try{var dt=new Date(s.ts||s.timestamp||0);return !isNaN(dt.getTime())&&dt>=tod&&s.phase==='focus';}catch(e){return false;}
    });
    var todH=todSess.reduce(function(a,s){return a+(s.dur||s.duration||0)/3600000;},0),todP=todSess.length;
    var todC=chaps.filter(function(c){return c.completedDate&&new Date(c.completedDate)>=tod;}).length;
    setRing('ring-hours',todH/(goals.dailyHours||4),+todH.toFixed(1),'rv-hours');
    setRing('ring-chaps',todC/(goals.dailyChaps||3),todC,'rv-chaps');
    setRing('ring-pomo',todP/(goals.dailyPomo||4),todP,'rv-pomo');
  }catch(e){console.warn('renderGoalRings:',e);}
}
function setRing(id,ratio,val,vid){var r=document.getElementById(id);if(r)r.style.strokeDashoffset=150.8*(1-Math.min(ratio,1));setText(vid,val);}
function renderQuote(){
  try{
    var today=new Date().toDateString(),saved=ld('vk_quote_date',null);
    var idx=0;
    if(saved&&saved.date===today&&typeof saved.idx==='number'){idx=saved.idx;}
    else{idx=Math.floor(Math.random()*QUOTES.length);sd('vk_quote_date',{date:today,idx:idx});}
    // Guard: if idx out of range, reset it
    if(idx<0||idx>=QUOTES.length)idx=0;
    var q=QUOTES[idx]||QUOTES[0];
    if(!q)return;
    setText('dash-quote','"'+(q.t||'')+ '"');
    setText('dash-cite','— '+(q.s||''));
  }catch(e){console.warn('renderQuote:',e);}
}
function updateDashPrayer(){var pr=ld('vk_prayer',{});if(!pr.times)return;var names=['fajr','sunrise','dhuhr','asr','maghrib','isha'],now=new Date();var next=null;for(var i=0;i<names.length;i++){var n=names[i];if(pr.times[n]){try{var pt=new Date(pr.times[n]);if(!isNaN(pt.getTime())&&pt>now){next={name:n,time:pt};break;}}catch(e){}}}if(!next)return;setText('dash-next-prayer',cap(next.name));setText('dash-prayer-time',fmt12(next.time));var diff=next.time-now,h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000);setText('dash-prayer-cd','in '+(h>0?h+'h ':'')+m+'m');}
function updateXPBar(stats){var fill=document.getElementById('hdr-xp-fill'),lv=document.getElementById('hdr-level');if(fill)fill.style.width=((((stats.xp||0)%LVL_XP)/LVL_XP)*100)+'%';if(lv)lv.textContent='Lv '+(stats.level||1);}
function updateExamCd(){var s=ld('vk_settings',{}),el=document.getElementById('exam-cd'),txt=document.getElementById('exam-cd-txt');if(!el||!txt||!s.examDate){if(el)el.style.display='none';return;}var diff=new Date(s.examDate)-new Date();if(diff<0){el.style.display='none';return;}var days=Math.ceil(diff/86400000);txt.textContent=(s.examName||'Exam')+' in '+days+' day'+(days===1?'':'s');el.style.display='flex';}

/* ============================================================
   10. CALENDAR
============================================================ */
function renderCal(){try{updateCalNav();if(S.cal.view==='month')renderMonthGrid();else if(S.cal.view==='week')renderWeekGrid();else renderDayGrid();renderCalUpcoming();}catch(e){showToast('Calendar: '+e.message,'error');}}
function updateCalNav(){var d=S.cal.date,lbl=document.getElementById('cal-label');if(!lbl)return;if(S.cal.view==='month')lbl.textContent=d.toLocaleDateString('en-US',{month:'long',year:'numeric'});else if(S.cal.view==='week'){var ws=new Date(d);ws.setDate(d.getDate()-((d.getDay()+6)%7));var we=new Date(ws);we.setDate(ws.getDate()+6);lbl.textContent=ws.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' – '+we.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}else lbl.textContent=d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});}
function renderMonthGrid(){var main=document.getElementById('cal-main');if(!main)return;var d=S.cal.date,yr=d.getFullYear(),mo=d.getMonth(),first=new Date(yr,mo,1),last=new Date(yr,mo+1,0),sdow=(first.getDay()+6)%7,events=ld('vk_calendar',[]),today=new Date();today.setHours(0,0,0,0);var h='<div class="cal-grid">';['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(function(n){h+='<div class="cal-day-hdr">'+n+'</div>';});for(var i=0;i<sdow;i++)h+='<div class="cal-cell other-mo"></div>';for(var day=1;day<=last.getDate();day++){var dt=new Date(yr,mo,day),ds=dt.toISOString().split('T')[0],isT=dt.getTime()===today.getTime(),evs=events.filter(function(e){return e.dt&&e.dt.startsWith(ds);});h+='<div class="cal-cell'+(isT?' today':'')+'" onclick="openAddCalModal(\''+ds+'\')"><div class="cal-day-num">'+day+'</div>'+evs.slice(0,2).map(function(ev){return'<div class="cal-ev-dot" style="background:'+hex2rgba(ev.color||'#7c6fff',0.25)+';color:'+(ev.color||'#7c6fff')+';border-radius:2px;padding:1px 3px;font-size:0.58rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(ev.topic||ev.subj||'Event')+'</div>';}).join('')+(evs.length>2?'<div style="font-size:0.58rem;color:var(--txt3)">+'+(evs.length-2)+'</div>':'')+'</div>';}h+='</div>';main.innerHTML=h;}
function renderWeekGrid(){var main=document.getElementById('cal-main');if(!main)return;var d=S.cal.date,ws=new Date(d);ws.setDate(d.getDate()-((d.getDay()+6)%7));ws.setHours(0,0,0,0);var events=ld('vk_calendar',[]),days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];var h='<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:7px">';for(var i=0;i<7;i++){var day=new Date(ws);day.setDate(ws.getDate()+i);var ds=day.toISOString().split('T')[0],isT=day.toDateString()===new Date().toDateString(),evs=events.filter(function(e){return e.dt&&e.dt.startsWith(ds);});h+='<div><div class="routine-day-hdr'+(isT?' today-hdr':'')+'">'+days[i]+' '+day.getDate()+'</div>'+evs.map(function(ev){return'<div onclick="editCalEvt(\''+ev.id+'\')" style="background:'+hex2rgba(ev.color||'#7c6fff',0.18)+';color:'+(ev.color||'#7c6fff')+';border-radius:4px;padding:3px 5px;font-size:0.7rem;margin-top:3px;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(ev.topic||ev.subj||'Event')+'</div>';}).join('')+'<div style="height:40px;border:1px dashed rgba(255,255,255,0.06);border-radius:5px;margin-top:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--txt3);font-size:0.7rem" onclick="openAddCalModal(\''+ds+'\')">+ add</div></div>';}h+='</div>';main.innerHTML=h;}
function renderDayGrid(){var main=document.getElementById('cal-main');if(!main)return;var d=S.cal.date,ds=d.toISOString().split('T')[0],events=ld('vk_calendar',[]).filter(function(e){return e.dt&&e.dt.startsWith(ds);});var h='<div class="glass-card"><div class="card-hdr"><span class="card-title">'+d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})+'</span><button class="btn-sm btn-primary" onclick="openAddCalModal(\''+ds+'\')"><i class="fa fa-plus"></i> Add</button></div>';if(!events.length)h+='<div class="empty-panel">No events today.</div>';events.sort(function(a,b){return new Date(a.dt)-new Date(b.dt);}).forEach(function(ev){h+='<div class="cal-upcoming-item" onclick="editCalEvt(\''+ev.id+'\')"><div style="width:9px;height:9px;border-radius:50%;background:'+(ev.color||'#7c6fff')+';flex-shrink:0"></div><div style="flex:1"><div style="font-weight:600">'+(ev.topic||ev.subj||'Event')+'</div><div style="font-size:0.73rem;color:var(--txt2)">'+fmt12(new Date(ev.dt))+(ev.endTime?' → '+ev.endTime:'')+'</div></div>'+(ev.isExam?'<span class="book-tag p-high">⚠ Exam</span>':'')+'</div>';});h+='</div>';main.innerHTML=h;}
function renderCalUpcoming(){var el=document.getElementById('cal-upcoming');if(!el)return;var now=new Date(),events=ld('vk_calendar',[]).filter(function(e){return e.dt&&new Date(e.dt)>=now;}).sort(function(a,b){return new Date(a.dt)-new Date(b.dt);}).slice(0,7);if(!events.length){el.innerHTML='<div class="empty-panel">No upcoming events</div>';return;}el.innerHTML=events.map(function(ev){return'<div class="cal-upcoming-item" onclick="editCalEvt(\''+ev.id+'\')"><div style="width:7px;height:7px;border-radius:50%;background:'+(ev.color||'#7c6fff')+';flex-shrink:0"></div><div style="flex:1"><div style="font-size:0.83rem;font-weight:500">'+(ev.topic||ev.subj||'Event')+'</div><div style="font-size:0.7rem;color:var(--txt2)">'+fmtDT(new Date(ev.dt))+'</div></div>'+(ev.isExam?'<span style="font-size:0.62rem;color:var(--a3)">⚠ EXAM</span>':'')+'</div>';}).join('');}
function openAddCalModal(ds){showPage('addmgr');amgrSwitch('event');var d=document.getElementById('am-ev-date');if(d&&ds)d.value=ds;}

function pickSwatch(el,gid){document.querySelectorAll('#'+gid+' .swatch').forEach(function(s){s.classList.remove('active');});el.classList.add('active');}
function saveCalEvt(isExam){var subj=(document.getElementById('ev-subj')?.value||'').trim(),topic=(document.getElementById('ev-topic')?.value||'').trim(),date=document.getElementById('ev-date')?.value,time=document.getElementById('ev-time')?.value||'09:00',endTime=document.getElementById('ev-endtime')?.value||'',notes=document.getElementById('ev-notes')?.value||'',colorEl=document.querySelector('#ev-colors .swatch.active'),color=colorEl?colorEl.dataset.color:'#7c6fff';if(!date){showToast('Pick a date','warning');return;}var events=ld('vk_calendar',[]);events.push({id:genId(),subj:subj,topic:topic,dt:date+'T'+time+':00',endTime:endTime,notes:notes,color:isExam?'#ff6b9d':color,isExam:!!isExam,created:new Date().toISOString()});sd('vk_calendar',events);renderCal();showToast('Event saved!','success');}
function openAddExamModal(){showPage('addmgr');amgrSwitch('event');var r=document.querySelector('input[name="ev-type"][value="exam"]');if(r)r.checked=true;}

function editCalEvt(id){
  var evts=ld('vk_calendar',[]),ev=evts.find(function(e){return e.id===id;});if(!ev)return;
  if(confirm('Delete event "' + (ev.topic||ev.subj||'Event') + '"?')){
    deleteCalEvt(id);
  }
}
function updateCalEvt(id){var evts=ld('vk_calendar',[]),i=evts.findIndex(function(e){return e.id===id;});if(i===-1)return;evts[i].topic=document.getElementById('ee-topic')?.value||evts[i].topic;evts[i].dt=document.getElementById('ee-dt')?.value||evts[i].dt;evts[i].notes=document.getElementById('ee-notes')?.value||'';sd('vk_calendar',evts);renderCal();showToast('Updated!','success');}
function deleteCalEvt(id){sd('vk_calendar',ld('vk_calendar',[]).filter(function(e){return e.id!==id;}));renderCal();showToast('Deleted','info');}

/* ============================================================
   11. BOOKS
============================================================ */
function renderBooks(){try{if(S.books.bookId){showEl('books-list-view',false);showEl('book-detail-view',true);renderBookDetail(S.books.bookId);}else{showEl('book-detail-view',false);showEl('books-list-view',true);renderSubjChips();renderBooksGrid();}}catch(e){showToast('Books: '+e.message,'error');}}
function renderSubjChips(){var chips=document.getElementById('subj-chips');if(!chips)return;var subjs=ld('vk_subjects',[]);chips.innerHTML='<button class="chip'+(S.books.filter==='all'?' active':'')+'" onclick="filterBooks(\'all\')" data-filter="all">All</button>';subjs.forEach(function(s){chips.innerHTML+='<button class="chip'+(S.books.filter===s.name?' active':'')+'" onclick="filterBooks(\''+s.name+'\')" data-filter="'+s.name+'">'+s.name+'</button>';});}
function filterBooks(sub){S.books.filter=sub;document.querySelectorAll('#subj-chips .chip').forEach(function(c){c.classList.toggle('active',c.dataset.filter===sub);});renderBooksGrid();}
function renderBooksGrid(){
  var grid=document.getElementById('books-grid'),empty=document.getElementById('books-empty');if(!grid)return;
  var books=ld('vk_books',[]);
  if(S.books.filter!=='all')books=books.filter(function(b){return b.subj===S.books.filter||b.subject===S.books.filter;});
  var sort=document.getElementById('books-sort')?.value||'title';
  books.sort(function(a,b){
    if(sort==='title')return(a.title||'').localeCompare(b.title||'');
    if(sort==='progress')return(b.progress||0)-(a.progress||0);
    if(sort==='date')return new Date(b.created||0)-new Date(a.created||0);
    if(sort==='priority'){var p={High:3,Medium:2,Low:1};return(p[b.priority]||1)-(p[a.priority]||1);}
    return 0;
  });
  if(empty)empty.style.display=books.length?'none':'flex';
  grid.querySelectorAll('.book-card').forEach(function(c){c.remove();});
  var allChaps=ld('vk_chapters',[]);
  books.forEach(function(book){
    var chaps=allChaps.filter(function(c){return c.bookId===book.id;}),
        done=chaps.filter(function(c){return c.stages&&c.stages.reading&&c.stages.mcq&&c.stages.cq&&c.stages.exam;}).length,
        prog=chaps.length?done/chaps.length*100:0;
    var card=document.createElement('div');card.className='book-card';
    card.innerHTML='<div class="book-accent-bar" style="background:'+(book.color||'#7c6fff')+'"></div><div class="book-body"><div class="book-title">'+book.title+'</div><div class="book-author">'+(book.author||'Unknown')+'</div><div class="book-tags"><span class="book-tag" style="background:rgba(124,111,255,0.1);color:#7c6fff;border:1px solid rgba(124,111,255,0.2)">'+(book.subj||book.subject||'General')+'</span><span class="book-tag p-'+(book.priority||'Medium').toLowerCase()+'">'+(book.priority||'Medium')+'</span></div><div class="book-prog-wrap"><div class="book-prog-bar"><div class="book-prog-fill" style="background:'+(book.color||'#7c6fff')+';width:'+prog.toFixed(1)+'%"></div></div><div class="book-prog-txt">'+done+'/'+(book.totalChaps||chaps.length)+' chapters · '+Math.round(prog)+'%</div></div><div class="book-footer"><span class="book-last">'+(book.lastStudied?'Studied '+timeAgo(new Date(book.lastStudied)):'Not started')+'</span><button class="book-menu-btn" onclick="event.stopPropagation();openBookCtx(event,\''+book.id+'\')"><i class="fa fa-ellipsis-vertical"></i></button></div></div>';
    card.addEventListener('click',function(){openBookDetail(book.id);});
    grid.appendChild(card);
  });
}
function openBookCtx(evt,bookId){evt.stopPropagation();closeCtx();var menu=document.createElement('div');menu.className='ctx-menu';menu.id='ctx-menu';menu.innerHTML='<div class="ctx-item" onclick="closeCtx();openBookDetail(\''+bookId+'\')"><i class="fa fa-eye"></i> View</div><div class="ctx-item" onclick="closeCtx();openEditBookModal(\''+bookId+'\')"><i class="fa fa-pen"></i> Edit</div><div class="ctx-item" onclick="closeCtx();exportBookProg(\''+bookId+'\')"><i class="fa fa-download"></i> Export</div><div class="ctx-item danger" onclick="closeCtx();confirmDeleteBook(\''+bookId+'\')"><i class="fa fa-trash"></i> Delete</div>';menu.style.left=Math.min(evt.clientX,window.innerWidth-170)+'px';menu.style.top=Math.min(evt.clientY,window.innerHeight-170)+'px';document.body.appendChild(menu);setTimeout(function(){document.addEventListener('click',closeCtx,{once:true});},10);}
function closeCtx(){var m=document.getElementById('ctx-menu');if(m)m.remove();}
function confirmDeleteBook(bookId){var book=ld('vk_books',[]).find(function(b){return b.id===bookId;}),chaps=ld('vk_chapters',[]).filter(function(c){return c.bookId===bookId;});if(!book)return;if(confirm('Delete "'+book.title+'"?\nThis removes '+chaps.length+' chapters and all SRS records.'))deleteBook(bookId);}
function deleteBook(bookId){sd('vk_books',ld('vk_books',[]).filter(function(b){return b.id!==bookId;}));sd('vk_chapters',ld('vk_chapters',[]).filter(function(c){return c.bookId!==bookId;}));sd('vk_srs_chapters',ld('vk_srs_chapters',[]).filter(function(r){return r.bookId!==bookId;}));sd('vk_notes',ld('vk_notes',[]).filter(function(n){return n.bookId!==bookId;}));showToast('Book deleted','success');S.books.bookId=null;renderBooks();}
function openBookDetail(bookId){S.books.bookId=bookId;showEl('books-list-view',false);showEl('book-detail-view',true);renderBookDetail(bookId);}
function closeBookDetail(){S.books.bookId=null;renderBooks();}
function renderBookDetail(bookId){var book=ld('vk_books',[]).find(function(b){return b.id===bookId;});if(!book){closeBookDetail();return;}var chaps=ld('vk_chapters',[]).filter(function(c){return c.bookId===bookId;}),done=chaps.filter(function(c){return c.stages&&c.stages.reading&&c.stages.mcq&&c.stages.cq&&c.stages.exam;}).length,prog=chaps.length?done/chaps.length*100:0;setText('bd-title',book.title);setText('bd-author',book.author||'—');setText('bd-subj',book.subj||book.subject||'—');setText('bd-chap-count',chaps.length+' chapters');setText('bd-target',book.targetDate?'Due: '+new Date(book.targetDate).toLocaleDateString():'No target');var ring=document.getElementById('bd-prog-ring');if(ring){ring.style.strokeDashoffset=314.16*(1-prog/100);ring.style.stroke=book.color||'#7c6fff';}setText('bd-prog-pct',Math.round(prog)+'%');renderChapList(bookId,chaps);}
function renderChapList(bookId,chaps){
  var list=document.getElementById('chapter-list');if(!list)return;
  if(!chaps.length){list.innerHTML='<div class="empty-state"><div class="empty-ico"><i class="fa fa-list"></i></div><h3>No Chapters</h3><p>Click "+ Chapter" to add one</p></div>';return;}
  var srsAll=ld('vk_srs_chapters',[]);
  list.innerHTML=chaps.sort(function(a,b){return(a.order||0)-(b.order||0);}).map(function(ch,idx){
    var sc=['reading','mcq','cq','exam'].filter(function(k){return ch.stages&&ch.stages[k];}).length;
    var isC=sc===4,lbl=isC?'Completed':sc>0?'In Progress':'Not Started',cls=isC?'s-completed':sc>0?'s-in-progress':'s-not-started';
    var srsRec=srsAll.find(function(r){return r.chapterId===ch.id;}),nextDue=srsRec&&srsRec.dueDate?new Date(srsRec.dueDate).toLocaleDateString():'';
    return '<div class="chap-item" id="chi-'+ch.id+'"><div class="chap-hdr" onclick="toggleChap(\''+ch.id+'\')"><div class="chap-num">'+(idx+1)+'</div><input class="chap-name-inp" value="'+ch.name+'" onclick="event.stopPropagation()" onblur="updateChapName(\''+ch.id+'\',this.value)" onkeydown="if(event.key===\'Enter\')this.blur()"><span class="chap-status '+cls+'">'+lbl+'</span>'+(srsRec?'<span style="font-size:0.63rem;color:var(--a2);background:rgba(0,229,255,0.07);padding:1px 5px;border-radius:99px">📅'+(nextDue?' '+nextDue:'')+'</span>':'')+'<button class="book-menu-btn" onclick="event.stopPropagation();openChapCtx(event,\''+ch.id+'\',\''+bookId+'\')"><i class="fa fa-ellipsis-vertical"></i></button><i class="fa fa-chevron-down chap-arrow" id="ca-'+ch.id+'"></i></div><div class="chap-body" id="cb-'+ch.id+'"><div class="stages">'+['reading','mcq','cq','exam'].map(function(s){return'<label class="stage-lbl'+((ch.stages&&ch.stages[s])?' checked':'')+'" id="sl-'+ch.id+'-'+s+'"><input type="checkbox" '+((ch.stages&&ch.stages[s])?'checked ':'')+' onchange="toggleStage(\''+ch.id+'\',\''+s+'\',this.checked)"><i class="fa fa-'+(ch.stages&&ch.stages[s]?'check-circle':'circle')+'"></i>'+cap(s)+'</label>';}).join('')+'</div><div class="chap-prog-row"><label>Progress:</label><input type="range" min="0" max="100" value="'+(ch.progress||0)+'" class="range-inp" oninput="this.nextElementSibling.textContent=this.value+\'%\'" onchange="updateChapProg(\''+ch.id+'\',+this.value)"><span>'+(ch.progress||0)+'%</span></div><div class="diff-stars">'+[1,2,3].map(function(n){return'<span class="diff-star'+((ch.difficulty||0)>=n?' on':'')+'" onclick="setDiff(\''+ch.id+'\','+n+')">★</span>';}).join('')+'<span style="font-size:0.7rem;color:var(--txt3);margin-left:5px">Difficulty</span></div>'+(ch.lastStudied?'<div style="font-size:0.7rem;color:var(--txt3);margin-top:4px">Last: '+timeAgo(new Date(ch.lastStudied))+'</div>':'')+'<div class="chap-actions"><button class="btn-sm btn-secondary" onclick="openNoteForChap(\''+ch.id+'\',\''+bookId+'\')"><i class="fa fa-sticky-note"></i> Note</button><button class="btn-sm btn-danger" onclick="confirmDeleteChap(\''+ch.id+'\')"><i class="fa fa-trash"></i> Delete</button></div></div></div>';
  }).join('');
}
function toggleChap(id){var b=document.getElementById('cb-'+id),a=document.getElementById('ca-'+id);if(!b)return;var open=b.classList.toggle('open');if(a)a.style.transform=open?'rotate(180deg)':'';}
function updateChapName(id,name){if(!name.trim())return;var chaps=ld('vk_chapters',[]),i=chaps.findIndex(function(c){return c.id===id;});if(i===-1)return;chaps[i].name=name.trim();sd('vk_chapters',chaps);}
function updateChapProg(id,val){var chaps=ld('vk_chapters',[]),i=chaps.findIndex(function(c){return c.id===id;});if(i===-1)return;chaps[i].progress=val;chaps[i].lastStudied=new Date().toISOString();sd('vk_chapters',chaps);var books=ld('vk_books',[]),bi=books.findIndex(function(b){return b.id===chaps[i].bookId;});if(bi!==-1){books[bi].lastStudied=new Date().toISOString();sd('vk_books',books);}awardXP(2,'Progress');}
function toggleStage(chapId,stage,checked){var chaps=ld('vk_chapters',[]),i=chaps.findIndex(function(c){return c.id===chapId;});if(i===-1)return;if(!chaps[i].stages)chaps[i].stages={};chaps[i].stages[stage]=checked;if(checked){chaps[i].lastStudied=new Date().toISOString();awardXP(10,'Stage');}var lbl=document.getElementById('sl-'+chapId+'-'+stage);if(lbl){lbl.classList.toggle('checked',checked);var ico=lbl.querySelector('i');if(ico)ico.className='fa fa-'+(checked?'check-circle':'circle');}var s=chaps[i].stages;if(s.reading&&s.mcq&&s.cq&&s.exam&&!chaps[i].completedDate){chaps[i].completedDate=new Date().toISOString();awardXP(50,'Chapter complete');addChapToSRS(chaps[i]);showToast('Chapter completed! Added to SRS 🎓','success');}sd('vk_chapters',chaps);if(S.books.bookId)renderBookDetail(S.books.bookId);}
function setDiff(id,stars){var chaps=ld('vk_chapters',[]),i=chaps.findIndex(function(c){return c.id===id;});if(i===-1)return;chaps[i].difficulty=stars;sd('vk_chapters',chaps);document.querySelectorAll('#cb-'+id+' .diff-star').forEach(function(s,n){s.classList.toggle('on',(n+1)<=stars);});}
function openChapCtx(evt,chapId,bookId){evt.stopPropagation();closeCtx();var menu=document.createElement('div');menu.className='ctx-menu';menu.id='ctx-menu';menu.innerHTML='<div class="ctx-item" onclick="closeCtx();openNoteForChap(\''+chapId+'\',\''+bookId+'\')"><i class="fa fa-sticky-note"></i> Add Note</div><div class="ctx-item danger" onclick="closeCtx();confirmDeleteChap(\''+chapId+'\')"><i class="fa fa-trash"></i> Delete</div>';menu.style.left=Math.min(evt.clientX,window.innerWidth-170)+'px';menu.style.top=Math.min(evt.clientY,window.innerHeight-100)+'px';document.body.appendChild(menu);setTimeout(function(){document.addEventListener('click',closeCtx,{once:true});},10);}
function confirmDeleteChap(id){var ch=ld('vk_chapters',[]).find(function(c){return c.id===id;});if(!ch)return;if(confirm('Delete "'+ch.name+'"?'))deleteChap(id);}
function deleteChap(id){sd('vk_chapters',ld('vk_chapters',[]).filter(function(c){return c.id!==id;}));sd('vk_srs_chapters',ld('vk_srs_chapters',[]).filter(function(r){return r.chapterId!==id;}));showToast('Chapter deleted','success');if(S.books.bookId)renderBookDetail(S.books.bookId);}
function openAddBookModal(){showPage('addmgr');amgrSwitch('book');}

function saveNewBook(){var title=(document.getElementById('nb-title')?.value||'').trim();if(!title){showToast('Enter a title','warning');return;}var subj=document.getElementById('nb-subj')?.value||'';if(subj==='__new__'){subj=(document.getElementById('nb-newsubj')?.value||'').trim();if(subj){var subs=ld('vk_subjects',[]);if(!subs.find(function(s){return s.name===subj;})){subs.push({id:genId(),name:subj});sd('vk_subjects',subs);}}}var colorEl=document.querySelector('#nb-colors .swatch.active'),totalC=+(document.getElementById('nb-chaps')?.value||10),bookId=genId();var books=ld('vk_books',[]);books.push({id:bookId,title:title,author:(document.getElementById('nb-author')?.value||'').trim(),subj:subj,subject:subj,totalChaps:totalC,startDate:document.getElementById('nb-start')?.value||'',targetDate:document.getElementById('nb-target')?.value||'',priority:document.getElementById('nb-priority')?.value||'Medium',color:colorEl?colorEl.dataset.color:'#7c6fff',created:new Date().toISOString(),progress:0});sd('vk_books',books);var chaps=ld('vk_chapters',[]);for(var i=1;i<=totalC;i++)chaps.push({id:genId(),bookId:bookId,name:'Chapter '+i,progress:0,order:i,stages:{},difficulty:0,created:new Date().toISOString()});sd('vk_chapters',chaps);awardXP(5,'Book');renderBooksGrid();renderSubjChips();showToast('Book added with '+totalC+' chapters!','success');}
function openEditBookModal(bookId){
  var book=ld('vk_books',[]).find(function(b){return b.id===bookId;});if(!book)return;
  // Use Add Manager page with pre-filled fields
  showPage('addmgr');
  setTimeout(function(){
    amgrSwitch('book');
    var ti=document.getElementById('am-book-title');if(ti)ti.value=book.title||'';
    var au=document.getElementById('am-book-author');if(au)au.value=book.author||'';
    var su=document.getElementById('am-book-newsubj');if(su)su.value=book.subj||book.subject||'';
    var pr=document.getElementById('am-book-priority');if(pr)pr.value=book.priority||'Medium';
    var tg=document.getElementById('am-book-target');if(tg)tg.value=book.targetDate||'';
    // Override save to update instead of create
    var saveBtn=document.querySelector('#amgr-book .amgr-save');
    if(saveBtn){
      saveBtn.textContent='💾 Update Book';
      saveBtn.onclick=function(){
        var t=(document.getElementById('am-book-title')?.value||'').trim();if(!t)return;
        var books=ld('vk_books',[]),i=books.findIndex(function(b){return b.id===bookId;});if(i===-1)return;
        books[i].title=t;
        books[i].author=(document.getElementById('am-book-author')?.value||'').trim();
        var ns=(document.getElementById('am-book-newsubj')?.value||'').trim();
        var ss=document.getElementById('am-book-subj')?.value||'';
        books[i].subj=ns||ss;books[i].subject=ns||ss;
        books[i].priority=document.getElementById('am-book-priority')?.value||'Medium';
        books[i].targetDate=document.getElementById('am-book-target')?.value||'';
        sd('vk_books',books);
        saveBtn.textContent='+ Add Book';saveBtn.onclick=amgrSaveBook;
        showToast('Book updated! ✓','success');
        showPage('books');
      };
    }
    showToast('Edit the fields and tap Update Book','info');
  },150);
}

function openEditBookModal_unused(bookId){showPage('addmgr');amgrSwitch('book');}

function saveEditBook(bookId){var books=ld('vk_books',[]),i=books.findIndex(function(b){return b.id===bookId;});if(i===-1)return;var subj=document.getElementById('eb-subj')?.value||books[i].subj;books[i].title=(document.getElementById('eb-title')?.value||'').trim()||books[i].title;books[i].author=(document.getElementById('eb-author')?.value||'').trim();books[i].subj=subj;books[i].subject=subj;books[i].priority=document.getElementById('eb-priority')?.value||books[i].priority;books[i].targetDate=document.getElementById('eb-target')?.value||'';sd('vk_books',books);renderBooksGrid();showToast('Updated!','success');}
function openAddChapModal(bookId){
  var list=document.getElementById('chapter-list');
  if(!list)return;
  var existing=document.getElementById('quick-chap-form');
  if(existing){existing.remove();return;}
  var form=document.createElement('div');
  form.id='quick-chap-form';
  form.dataset.bookId=bookId;
  form.style.cssText='background:var(--bg3);border:2px solid var(--a1);border-radius:12px;padding:12px;margin-bottom:12px;display:flex;gap:8px;align-items:center';
  var inp=document.createElement('input');
  inp.id='qcf-inp';inp.className='inp';inp.placeholder='Chapter name...';
  inp.style.cssText='flex:1;min-height:44px;font-size:0.95rem';
  var addBtn=document.createElement('button');
  addBtn.className='btn-primary';
  addBtn.style.cssText='min-height:44px;padding:0 18px;white-space:nowrap;flex-shrink:0';
  addBtn.innerHTML='<i class="fa fa-plus"></i> Add';
  addBtn.onclick=function(){quickAddChap();};
  var cancelBtn=document.createElement('button');
  cancelBtn.className='btn-secondary';
  cancelBtn.style.cssText='min-height:44px;padding:0 12px;flex-shrink:0';
  cancelBtn.textContent='✕';
  cancelBtn.onclick=function(){form.remove();};
  form.appendChild(inp);form.appendChild(addBtn);form.appendChild(cancelBtn);
  list.insertBefore(form,list.firstChild);
  setTimeout(function(){inp.focus();},80);
}

function quickAddChap(){
  var form=document.getElementById('quick-chap-form');
  var bookId=form?form.dataset.bookId:'';
  if(!bookId){showToast('Error: no book selected','error');return;}
  var inp=document.getElementById('qcf-inp');
  var name=(inp?inp.value:'').trim();
  if(!name){showToast('Enter a chapter name','warning');if(inp)inp.focus();return;}
  var chaps=ld('vk_chapters',[]),existing=chaps.filter(function(c){return c.bookId===bookId;});
  chaps.push({id:genId(),bookId:bookId,name:name,progress:0,order:existing.length+1,stages:{},difficulty:0,created:new Date().toISOString()});
  sd('vk_chapters',chaps);
  if(form)form.remove();
  renderBookDetail(bookId);showToast('"'+name+'" added!','success');
}

function saveNewChap(bookId){var name=(document.getElementById('nc-name')?.value||'').trim();if(!name){showToast('Enter a name','warning');return;}var chaps=ld('vk_chapters',[]),existing=chaps.filter(function(c){return c.bookId===bookId;});chaps.push({id:genId(),bookId:bookId,name:name,progress:0,order:existing.length+1,stages:{},difficulty:0,created:new Date().toISOString()});sd('vk_chapters',chaps);renderBookDetail(bookId);showToast('Chapter added!','success');}
function exportBookProg(bookId){var book=ld('vk_books',[]).find(function(b){return b.id===bookId;}),chaps=ld('vk_chapters',[]).filter(function(c){return c.bookId===bookId;});if(!book)return;var lines=['# Progress: '+book.title,'Author: '+(book.author||'—'),'Subject: '+(book.subj||book.subject||'—'),''].concat(chaps.map(function(ch,i){return(i+1)+'. '+ch.name+' — '+(ch.progress||0)+'% ('+['reading','mcq','cq','exam'].filter(function(k){return ch.stages&&ch.stages[k];}).length+'/4 stages)';}));var blob=new Blob([lines.join('\n')],{type:'text/plain'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='progress-'+book.title+'.txt';a.click();URL.revokeObjectURL(url);showToast('Exported!','success');}
function addChapToSRS(ch){var records=ld('vk_srs_chapters',[]);if(records.find(function(r){return r.chapterId===ch.id;}))return;var book=ld('vk_books',[]).find(function(b){return b.id===ch.bookId;});records.push({chapterId:ch.id,bookId:ch.bookId,chapName:ch.name,bookTitle:book?book.title:'Unknown',subj:book?(book.subj||book.subject||''):'',interval:1,easeFactor:2.5,dueDate:addDays(new Date(),1).toISOString(),repetitions:0,totalReviews:0,againCount:0,lastReview:null,mastered:false,notes:''});sd('vk_srs_chapters',records);}
function openNoteForChap(chapId,bookId){var ch=ld('vk_chapters',[]).find(function(c){return c.id===chapId;}),book=ld('vk_books',[]).find(function(b){return b.id===bookId;});var notes=ld('vk_notes',[]);var note={id:genId(),title:'Note — '+(ch?ch.name:'Chapter'),content:'',chapId:chapId,bookId:bookId,subj:book?(book.subj||book.subject||''):'',tags:[],pinned:false,bgColor:'',textColor:'',audioClips:[],created:new Date().toISOString(),modified:new Date().toISOString()};notes.push(note);sd('vk_notes',notes);S.notes.id=note.id;showPage('notes');showToast('Note created','success');}

/* ============================================================
   12. NOTES
============================================================ */
function initNotes(){try{renderNoteTree();if(S.notes.id)openNote(S.notes.id);else{showEl('note-empty',true);showEl('note-editor-wrap',false);}setTimeout(initQuill,80);}catch(e){showToast('Notes: '+e.message,'error');}}
function renderNoteTree(){var tree=document.getElementById('note-tree');if(!tree)return;var notes=ld('vk_notes',[]);if(!notes.length){tree.innerHTML='<div class="empty-panel">No notes yet</div>';return;}var h='';var pinned=notes.filter(function(n){return n.pinned;});if(pinned.length){h+='<div class="note-tree-subj"><div class="note-tree-subj-hdr"><i class="fa fa-thumbtack" style="color:var(--a5)"></i> Pinned</div>'+pinned.map(noteTreeItem).join('')+'</div>';}var subs=[];notes.forEach(function(n){var sub=n.subj||'General';if(!subs.includes(sub))subs.push(sub);});subs.forEach(function(sub){var subNotes=notes.filter(function(n){return(n.subj||'General')===sub&&!n.pinned;});if(!subNotes.length)return;h+='<div class="note-tree-subj"><div class="note-tree-subj-hdr" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'\':\' none\'"><i class="fa fa-chevron-right" style="font-size:0.6rem"></i> '+sub+'</div><div>'+subNotes.map(noteTreeItem).join('')+'</div></div>';});tree.innerHTML=h;}
function noteTreeItem(n){return'<div class="note-tree-item'+(S.notes.id===n.id?' active':'')+'" onclick="openNote(\''+n.id+'\')" style="'+(n.bgColor?'border-left:3px solid '+n.bgColor:'')+'"><i class="fa fa-file-alt" style="font-size:0.76rem;flex-shrink:0"></i><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(n.title||'Untitled')+'</span>'+(n.pinned?'<i class="fa fa-thumbtack" style="font-size:0.68rem;color:var(--a5);flex-shrink:0"></i>':'')+'</div>';}
function filterNoteTree(q){if(!q.trim()){renderNoteTree();return;}var notes=ld('vk_notes',[]),ql=q.toLowerCase(),found=notes.filter(function(n){return(n.title||'').toLowerCase().includes(ql)||(n.content||'').replace(/<[^>]+>/g,'').toLowerCase().includes(ql);});var tree=document.getElementById('note-tree');if(!tree)return;if(!found.length){tree.innerHTML='<div class="empty-panel">No results</div>';return;}tree.innerHTML=found.map(noteTreeItem).join('');}
function openNote(id){var notes=ld('vk_notes',[]),note=notes.find(function(n){return n.id===id;});if(!note)return;S.notes.id=id;showEl('note-empty',false);showEl('note-editor-wrap',true);var ti=document.getElementById('note-title-inp');if(ti)ti.value=note.title||'';if(S.notes.quill)S.notes.quill.root.innerHTML=note.content||'';else{var fb=document.getElementById('note-fb');if(fb)fb.value=note.content||'';}applyNoteColor(note.bgColor||'',note.textColor||'');document.querySelectorAll('.nc-swatch').forEach(function(s){s.classList.toggle('active',s.dataset.bg===(note.bgColor||''));});updateNoteMeta(note);renderNoteTree();updateNoteWC();renderAudioClipsList(note.audioClips||[]);if(S.notes.timer)clearInterval(S.notes.timer);S.notes.timer=setInterval(autoSaveNote,2000);}
function applyNoteColor(bg,text){var center=document.querySelector('.notes-center');if(!center)return;if(bg){center.style.background=bg;center.style.color=text||'inherit';}else{center.style.background='';center.style.color='';}var editor=document.querySelector('.ql-editor');if(editor&&text&&bg)editor.style.color=text;else if(editor)editor.style.color='';}
function setNoteColor(el){document.querySelectorAll('.nc-swatch').forEach(function(s){s.classList.remove('active');});el.classList.add('active');var bg=el.dataset.bg||'',text=el.dataset.text||'';applyNoteColor(bg,text);if(!S.notes.id)return;var notes=ld('vk_notes',[]),i=notes.findIndex(function(n){return n.id===S.notes.id;});if(i===-1)return;notes[i].bgColor=bg;notes[i].textColor=text;notes[i].modified=new Date().toISOString();sd('vk_notes',notes);renderNoteTree();}
function updateNoteMeta(note){var subjs=ld('vk_subjects',[]);var ss=document.getElementById('note-subj-sel');if(ss){ss.innerHTML='<option value="">None</option>'+subjs.map(function(s){return'<option'+(s.name===note.subj?' selected':'')+'>'+s.name+'</option>';}).join('');ss.onchange=function(){updateNoteField('subj',ss.value);updateNoteBookSel(ss.value,null);};}updateNoteBookSel(note.subj,note.bookId);setText('note-created',note.created?new Date(note.created).toLocaleDateString():'—');setText('note-modified',note.modified?new Date(note.modified).toLocaleDateString():'—');renderTagsUI(note.tags||[]);}
function updateNoteBookSel(subj,currentBookId){var books=ld('vk_books',[]).filter(function(b){return!subj||b.subj===subj||b.subject===subj;});var bs=document.getElementById('note-book-sel');if(!bs)return;bs.innerHTML='<option value="">None</option>'+books.map(function(b){return'<option value="'+b.id+'"'+(b.id===currentBookId?' selected':'')+'>'+b.title+'</option>';}).join('');bs.onchange=function(){updateNoteField('bookId',bs.value);updateNoteChapSel(bs.value,null);};var curNote=ld('vk_notes',[]).find(function(n){return n.id===S.notes.id;});updateNoteChapSel(currentBookId,curNote?curNote.chapId:null);}
function updateNoteChapSel(bookId,currentChapId){var chaps=bookId?ld('vk_chapters',[]).filter(function(c){return c.bookId===bookId;}):[];var cs=document.getElementById('note-chap-sel');if(!cs)return;cs.innerHTML='<option value="">None</option>'+chaps.map(function(c){return'<option value="'+c.id+'"'+(c.id===currentChapId?' selected':'')+'>'+c.name+'</option>';}).join('');cs.onchange=function(){updateNoteField('chapId',cs.value);};}
function updateNoteField(field,value){if(!S.notes.id)return;var notes=ld('vk_notes',[]),i=notes.findIndex(function(n){return n.id===S.notes.id;});if(i===-1)return;notes[i][field]=value;notes[i].modified=new Date().toISOString();sd('vk_notes',notes);}
function renderTagsUI(tags){var wrap=document.getElementById('tags-wrap'),inp=document.getElementById('tag-inp');if(!wrap||!inp)return;wrap.querySelectorAll('.tag-chip').forEach(function(t){t.remove();});tags.forEach(function(tag){var c=document.createElement('span');c.className='tag-chip';c.innerHTML=tag+' <button onclick="removeTag(\''+tag+'\')">×</button>';wrap.insertBefore(c,inp);});}
function addTag(tag){if(!tag.trim()||!S.notes.id)return;var notes=ld('vk_notes',[]),i=notes.findIndex(function(n){return n.id===S.notes.id;});if(i===-1)return;if(!notes[i].tags)notes[i].tags=[];if(!notes[i].tags.includes(tag.trim())){notes[i].tags.push(tag.trim());sd('vk_notes',notes);renderTagsUI(notes[i].tags);}}
function removeTag(tag){var notes=ld('vk_notes',[]),i=notes.findIndex(function(n){return n.id===S.notes.id;});if(i===-1)return;notes[i].tags=(notes[i].tags||[]).filter(function(t){return t!==tag;});sd('vk_notes',notes);renderTagsUI(notes[i].tags);}
function autoSaveNote(){if(!S.notes.id)return;var notes=ld('vk_notes',[]),i=notes.findIndex(function(n){return n.id===S.notes.id;});if(i===-1)return;var ti=document.getElementById('note-title-inp');if(ti)notes[i].title=ti.value||'Untitled';if(S.notes.quill)notes[i].content=S.notes.quill.root.innerHTML;else{var fb=document.getElementById('note-fb');if(fb)notes[i].content=fb.value;}notes[i].modified=new Date().toISOString();sd('vk_notes',notes);setText('save-status','Saved ✓');updateNoteWC();}
function updateNoteWC(){var content='';if(S.notes.quill)content=S.notes.quill.getText()||'';else{var fb=document.getElementById('note-fb');if(fb)content=fb.value;}var wc=content.trim()?content.trim().split(/\s+/).length:0;setText('note-wc',wc+' words');}
function createNewNote(){var notes=ld('vk_notes',[]);var note={id:genId(),title:'New Note',content:'',subj:'',tags:[],pinned:false,bgColor:'',textColor:'',audioClips:[],created:new Date().toISOString(),modified:new Date().toISOString()};notes.unshift(note);sd('vk_notes',notes);S.notes.id=note.id;initNotes();setTimeout(function(){var ti=document.getElementById('note-title-inp');if(ti){ti.value='New Note';ti.select();}},200);}
function initQuill(){
  var edEl=document.getElementById('note-editor');if(!edEl||S.notes.quill)return;
  var fallback=function(){
    edEl.innerHTML='<textarea id="note-fb" class="inp" style="min-height:320px;width:100%;resize:none;border:none;background:none;font-size:1rem;line-height:1.8;padding:12px 16px;-webkit-user-select:text;user-select:text"></textarea>';
    var fb=document.getElementById('note-fb');
    if(fb){
      fb.addEventListener('input',function(){deb(autoSaveNote,800,'nauto');updateNoteWC();});
      fb.addEventListener('focus',function(){fb.style.fontSize='16px';});// prevent iOS zoom
    }
  };
  if(typeof Quill==='undefined'){fallback();return;}
  try{
    S.notes.quill=new Quill('#note-editor',{theme:'snow',modules:{toolbar:[
      [{header:[1,2,3,false]}],
      ['bold','italic','underline','strike'],
      [{color:[]},{background:[]}],
      [{list:'ordered'},{list:'bullet'}],
      ['blockquote','link','image','clean']
    ]}});
    // Auto-save on every change with debounce
    S.notes.quill.on('text-change',function(){
      deb(autoSaveNote,800,'nauto');
      deb(updateNoteWC,200,'wc');
    });
    S.notes.quill.root.addEventListener('paste',handleQuillPaste);
    // Mobile: ensure font size 16px to prevent zoom on focus
    S.notes.quill.root.style.fontSize='16px';
    S.notes.quill.root.style.webkitUserSelect='text';
  }catch(e){fallback();}
}
function handleQuillPaste(e){if(!e.clipboardData||!e.clipboardData.files||!e.clipboardData.files.length)return;var file=e.clipboardData.files[0];if(!file.type.startsWith('image/'))return;e.preventDefault();var reader=new FileReader();reader.onload=function(ev){insertImageToQuill(ev.target.result);};reader.readAsDataURL(file);}
function togglePinNote(){if(!S.notes.id)return;var notes=ld('vk_notes',[]),i=notes.findIndex(function(n){return n.id===S.notes.id;});if(i===-1)return;notes[i].pinned=!notes[i].pinned;sd('vk_notes',notes);var ico=document.getElementById('pin-ico'),lbl=document.getElementById('pin-lbl');if(ico)ico.style.color=notes[i].pinned?'var(--a5)':'';if(lbl)lbl.textContent=notes[i].pinned?'Pinned':'Pin';renderNoteTree();showToast(notes[i].pinned?'Note pinned':'Note unpinned','info');}
function insertMath(latex){if(!S.notes.quill){var fb=document.getElementById('note-fb');if(fb){var pos=fb.selectionStart;fb.value=fb.value.slice(0,pos)+'$$'+latex+'$$'+fb.value.slice(fb.selectionEnd);fb.selectionStart=fb.selectionEnd=pos+latex.length+4;}return;}var range=S.notes.quill.getSelection(true);S.notes.quill.insertText(range?range.index:S.notes.quill.getLength(),'$$'+latex+'$$');}
function openMathDialog(){var dlg=document.getElementById('math-dialog');if(dlg)dlg.style.display='flex';setTimeout(function(){document.getElementById('math-inp')?.focus();},100);}
function closeMathDialog(){var dlg=document.getElementById('math-dialog');if(dlg)dlg.style.display='none';}
function setMathPreset(latex){var inp=document.getElementById('math-inp');if(inp){inp.value=latex;previewMath(latex);}}
function previewMath(latex){var prev=document.getElementById('math-preview');if(!prev||typeof katex==='undefined')return;try{prev.innerHTML=katex.renderToString(latex||'',{throwOnError:false,displayMode:true});}catch(e){prev.textContent=latex;}}
function insertMathFromDialog(){var inp=document.getElementById('math-inp');if(!inp)return;var latex=inp.value.trim();if(!latex)return;insertMath(latex);closeMathDialog();showToast('Equation inserted!','success');}
function toggleVoiceRec(){S.interacted=true;getAudioCtx();if(S.notes.recording)stopVoiceRec();else startVoiceRec();}
function startVoiceRec(){if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){showToast('Microphone not supported','warning');return;}navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){S.notes.chunks=[];S.notes.recSeconds=0;S.notes.mediaRec=new MediaRecorder(stream);S.notes.mediaRec.ondataavailable=function(e){if(e.data.size>0)S.notes.chunks.push(e.data);};S.notes.mediaRec.onstop=function(){var blob=new Blob(S.notes.chunks,{type:'audio/webm'});stream.getTracks().forEach(function(t){t.stop();});var reader=new FileReader();reader.onload=function(ev){if(!S.notes.id)return;var notes=ld('vk_notes',[]),i=notes.findIndex(function(n){return n.id===S.notes.id;});if(i===-1)return;if(!notes[i].audioClips)notes[i].audioClips=[];var clip={id:genId(),data:ev.target.result,duration:S.notes.recSeconds,created:new Date().toISOString()};notes[i].audioClips.push(clip);sd('vk_notes',notes);renderAudioClipsList(notes[i].audioClips);showToast('Audio clip saved!','success');};reader.readAsDataURL(blob);};S.notes.mediaRec.start();S.notes.recording=true;var btn=document.getElementById('btn-voice-rec'),lbl=document.getElementById('voice-rec-label'),vi=document.getElementById('voice-indicator');if(btn)btn.classList.add('recording');if(lbl)lbl.textContent='Stop Recording';if(vi)vi.style.display='flex';S.notes.recInterval=setInterval(function(){S.notes.recSeconds++;var vt=document.getElementById('voice-timer');if(vt)vt.textContent=Math.floor(S.notes.recSeconds/60)+':'+(S.notes.recSeconds%60).toString().padStart(2,'0');},1000);showToast('Recording started…','info');}).catch(function(){showToast('Microphone access denied','warning');});}
function stopVoiceRec(){if(S.notes.mediaRec&&S.notes.recording){S.notes.mediaRec.stop();S.notes.recording=false;}if(S.notes.recInterval){clearInterval(S.notes.recInterval);S.notes.recInterval=null;}var btn=document.getElementById('btn-voice-rec'),lbl=document.getElementById('voice-rec-label'),vi=document.getElementById('voice-indicator');if(btn)btn.classList.remove('recording');if(lbl)lbl.textContent='Record Audio';if(vi)vi.style.display='none';}
function renderAudioClipsList(clips){var el=document.getElementById('audio-clips-list');if(!el)return;if(!clips||!clips.length){el.innerHTML='';return;}el.innerHTML=clips.map(function(clip){return'<div class="audio-clip-item"><i class="fa fa-microphone" style="color:var(--a3);flex-shrink:0"></i><audio controls src="'+clip.data+'" style="flex:1;height:30px"></audio><span style="font-size:0.7rem;color:var(--txt3)">'+(clip.duration?Math.floor(clip.duration/60)+':'+(clip.duration%60).toString().padStart(2,'0'):'Audio')+'</span><button onclick="deleteAudioClip(\''+clip.id+'\')" style="background:none;border:none;color:var(--a3);cursor:pointer;font-size:0.8rem;min-width:22px"><i class="fa fa-times"></i></button></div>';}).join('');}
function deleteAudioClip(clipId){if(!S.notes.id)return;var notes=ld('vk_notes',[]),i=notes.findIndex(function(n){return n.id===S.notes.id;});if(i===-1)return;notes[i].audioClips=(notes[i].audioClips||[]).filter(function(c){return c.id!==clipId;});sd('vk_notes',notes);renderAudioClipsList(notes[i].audioClips);}
function attachImage(){document.getElementById('img-file-inp')?.click();}
function handleImageFile(e){var file=e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(ev){insertImageToQuill(ev.target.result);};reader.readAsDataURL(file);e.target.value='';}
function insertImageToQuill(dataURL){if(S.notes.quill){var range=S.notes.quill.getSelection(true)||{index:S.notes.quill.getLength()};S.notes.quill.insertEmbed(range.index,'image',dataURL);showToast('Image inserted!','success');}else{var fb=document.getElementById('note-fb');if(fb){fb.value+='[IMAGE]';showToast('Image attached','info');}}}
function openCamera(){var inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.capture='environment';inp.onchange=function(e){var file=e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(ev){insertImageToQuill(ev.target.result);};reader.readAsDataURL(file);};inp.click();}
function exportNoteAsPDF(){if(typeof html2pdf==='undefined'){showToast('PDF library loading… try again','warning');return;}autoSaveNote();var notes=ld('vk_notes',[]),note=notes.find(function(n){return n.id===S.notes.id;});if(!note)return;var bgColor=note.bgColor||'#ffffff',textColor=note.textColor||'#1a1a2e';var el=document.createElement('div');el.style.cssText='font-family:Georgia,serif;color:'+textColor+';background:'+bgColor+';padding:0';el.innerHTML='<div style="background:linear-gradient(135deg,#7c6fff,#00e5ff);padding:32px 36px;color:#fff"><h1 style="font-size:28px;margin:0 0 8px;font-family:Syne,sans-serif">'+(note.title||'Untitled')+'</h1><div style="font-size:12px;opacity:0.85">'+new Date(note.created).toLocaleDateString()+(note.subj?' · '+note.subj:'')+'</div></div><div style="padding:32px 36px;font-size:14px;line-height:1.8">'+(note.content||'<em>No content</em>')+'</div>';html2pdf().set({margin:0,filename:(note.title||'note')+'.pdf',html2canvas:{scale:2,useCORS:true},jsPDF:{unit:'mm',format:'a4'}}).from(el).save();showToast('PDF exported!','success');}
function exportAllNotesPDF(){if(typeof html2pdf==='undefined'){showToast('PDF library loading…','warning');return;}var notes=ld('vk_notes',[]);if(!notes.length){showToast('No notes to export','warning');return;}var el=document.createElement('div');el.style.cssText='font-family:Georgia,serif;color:#1a1a2e;background:#fff';notes.forEach(function(n,idx){el.innerHTML+='<div style="page-break-after:'+(idx<notes.length-1?'always':'avoid')+';padding:0"><div style="background:linear-gradient(135deg,#7c6fff,#00e5ff);padding:24px 32px;color:#fff"><h2 style="margin:0;font-size:22px">'+(n.title||'Untitled')+'</h2><div style="font-size:11px;opacity:0.85;margin-top:5px">'+new Date(n.created).toLocaleDateString()+(n.subj?' · '+n.subj:'')+'</div></div><div style="padding:24px 32px;font-size:13px;line-height:1.8">'+(n.content||'<em>No content</em>')+'</div></div>';});html2pdf().set({margin:0,filename:'venolk1-notes.pdf',html2canvas:{scale:2},jsPDF:{unit:'mm',format:'a4'}}).from(el).save();showToast('All notes exported!','success');}

/* ============================================================
   13. POMODORO
============================================================ */
function renderPomo(){try{var settings=ld('vk_settings',{});if(settings.pomoDur)POMO.pomodoro.f=settings.pomoDur;if(settings.pomoShort)POMO.pomodoro.s=settings.pomoShort;if(settings.pomoLong)POMO.pomodoro.l=settings.pomoLong;populatePomoSelects();renderPomoTabs();updatePomoDisplay();renderPomoStats();renderSessLog();renderPomoHeatmap();}catch(e){showToast('Pomodoro: '+e.message,'error');}}
function populatePomoSelects(){var subjs=ld('vk_subjects',[]),ss=document.getElementById('pomo-subj-sel');if(ss){ss.innerHTML='<option value="">Subject (optional)</option>'+subjs.map(function(s){return'<option>'+s.name+'</option>';}).join('');ss.onchange=function(){S.pomo.subj=ss.value;populatePomoBooks(ss.value);};}if(S.pomo.subj&&ss)ss.value=S.pomo.subj;populatePomoBooks(S.pomo.subj);}
function populatePomoBooks(subj){var books=ld('vk_books',[]).filter(function(b){return!subj||b.subj===subj||b.subject===subj;});var bs=document.getElementById('pomo-book-sel');if(!bs)return;bs.innerHTML='<option value="">Book</option>'+books.map(function(b){return'<option value="'+b.id+'">'+b.title+'</option>';}).join('');bs.onchange=function(){S.pomo.bookId=bs.value;populatePomoChaps(bs.value);};var cs=document.getElementById('pomo-chap-sel');if(cs){cs.innerHTML='<option value="">Chapter</option>';cs.onchange=function(){S.pomo.chapId=cs.value;};}}
function populatePomoChaps(bookId){var chaps=bookId?ld('vk_chapters',[]).filter(function(c){return c.bookId===bookId;}):[];var cs=document.getElementById('pomo-chap-sel');if(!cs)return;cs.innerHTML='<option value="">Chapter</option>'+chaps.map(function(c){return'<option value="'+c.id+'">'+c.name+'</option>';}).join('');cs.onchange=function(){S.pomo.chapId=cs.value;};}
function renderPomoTabs(){document.querySelectorAll('.pomo-tab').forEach(function(t){t.classList.toggle('active',t.dataset.mode===S.pomo.mode);});var sl=document.getElementById('custom-sliders');if(sl)sl.style.display=S.pomo.mode==='custom'?'flex':'none';}
function setPomoMode(mode){if(S.pomo.running)return;S.pomo.mode=mode;var cfg=POMO[mode]||POMO.pomodoro;if(mode==='custom'){cfg={f:+(document.getElementById('cs-focus')?.value||25),s:+(document.getElementById('cs-short')?.value||5),l:+(document.getElementById('cs-long')?.value||15)};}S.pomo.dur=cfg.f*60000;S.pomo.sb=cfg.s*60000;S.pomo.lb=cfg.l*60000;S.pomo.phase='focus';S.pomo.paused=false;S.pomo.ts=null;S.pomo.pausedRem=null;renderPomoTabs();updatePomoDisplay();}
function startPomo(){
  if(S.pomo.running)return;S.interacted=true;getAudioCtx();
  if(S.pomo.paused&&S.pomo.pausedRem!==null){
    S.pomo.ts=Date.now()-(S.pomo.dur-S.pomo.pausedRem);
    S.pomo.paused=false;S.pomo.pausedRem=null;
  }else{S.pomo.ts=Date.now();S.pomo.paused=false;}
  S.pomo.running=true;
  var btn=document.getElementById('btn-pomo-start');
  if(btn)btn.innerHTML='<i class="fa fa-pause"></i>';
  document.getElementById('pomo-ring')?.classList.add('running');
  // Schedule native alarm so notification fires even when app is in background
  if(window.AndroidBridge){
    var rem=S.pomo.dur-(S.pomo.ts?Date.now()-S.pomo.ts:0);
    var lbl=S.pomo.phase==='focus'?'Pomodoro Complete!':'Break Over!';
    var body=S.pomo.phase==='focus'?'Great focus! Take a break.':'Time to focus again!';
    try{AndroidBridge.schedulePomodoroNotification(rem,'⏱️ '+lbl,body);}catch(e){}
  }
  savePomoPersist();
  schedPomoFrame();
}
function pausePomo(){
  if(!S.pomo.running)return;
  S.pomo.pausedRem=Math.max(0,S.pomo.dur-(Date.now()-S.pomo.ts));
  S.pomo.running=false;S.pomo.paused=true;
  if(S.pomo.raf)cancelAnimationFrame(S.pomo.raf);
  var btn=document.getElementById('btn-pomo-start');
  if(btn)btn.innerHTML='<i class="fa fa-play"></i>';
  document.getElementById('pomo-ring')?.classList.remove('running');
  if(window.AndroidBridge)try{AndroidBridge.cancelPomodoroNotification();}catch(e){}
  savePomoPersist();
}
function resetPomo(){
  S.pomo.running=false;S.pomo.paused=false;S.pomo.ts=null;S.pomo.pausedRem=null;
  if(S.pomo.raf)cancelAnimationFrame(S.pomo.raf);
  var btn=document.getElementById('btn-pomo-start');
  if(btn)btn.innerHTML='<i class="fa fa-play"></i>';
  document.getElementById('pomo-ring')?.classList.remove('running');
  if(window.AndroidBridge)try{AndroidBridge.cancelPomodoroNotification();}catch(e){}
  localStorage.removeItem('vk_pomo_persist');
  updatePomoDisplay();
}
function skipPomoPhase(){onPomoEnd();}
function schedPomoFrame(){if(!S.pomo.running)return;var rem=S.pomo.dur-(Date.now()-S.pomo.ts);updatePomoRing(rem,S.pomo.dur);var d=document.getElementById('timer-disp');if(d)d.textContent=ms2mmss(Math.max(rem,0));if(rem<=0){onPomoEnd();return;}S.pomo.raf=requestAnimationFrame(schedPomoFrame);}
function updatePomoRing(rem,total){var ring=document.getElementById('pomo-ring');if(!ring)return;var ratio=Math.max(0,rem/total);ring.style.strokeDashoffset=603.19*(1-ratio);ring.style.stroke='hsl('+(ratio*120)+',80%,65%)';}
function updatePomoDisplay(){var pd=S.pomo.phase==='focus'?S.pomo.dur:S.pomo.phase==='short'?S.pomo.sb:S.pomo.lb;var d=document.getElementById('timer-disp');if(d)d.textContent=ms2mmss(pd);var ring=document.getElementById('pomo-ring');if(ring){ring.style.strokeDashoffset=0;ring.style.stroke='var(--a1)';}var lbl=document.getElementById('timer-phase');if(lbl)lbl.textContent=S.pomo.phase==='focus'?'Focus':S.pomo.phase==='short'?'Short Break':'Long Break';var sc=document.getElementById('timer-sess');if(sc)sc.textContent='Session '+(S.pomo.sessCount+1);}
function savePomoPersist(){
  try{
    var state={running:S.pomo.running,ts:S.pomo.ts,dur:S.pomo.dur,sb:S.pomo.sb,lb:S.pomo.lb,
      phase:S.pomo.phase,sessCount:S.pomo.sessCount,mode:S.pomo.mode,
      paused:S.pomo.paused,pausedRem:S.pomo.pausedRem};
    localStorage.setItem('vk_pomo_persist',JSON.stringify(state));
    if(window.AndroidBridge)try{AndroidBridge.saveToFile('pomo_state.json',JSON.stringify(state));}catch(e){}
  }catch(e){}
}
function onPomoEnd(){S.pomo.running=false;if(S.pomo.raf)cancelAnimationFrame(S.pomo.raf);var btn=document.getElementById('btn-pomo-start');if(btn)btn.innerHTML='<i class="fa fa-play"></i>';document.getElementById('pomo-ring')?.classList.remove('running');var wasFocus=S.pomo.phase==='focus';if(wasFocus){S.pomo.sessCount++;logPomoSess();awardXP(25,'Pomodoro');checkBurnout();}S.pomo.phase=wasFocus?(S.pomo.sessCount%4===0?'long':'short'):'focus';var cfg=POMO[S.pomo.mode]||POMO.pomodoro;S.pomo.dur=S.pomo.phase==='focus'?cfg.f*60000:S.pomo.phase==='short'?cfg.s*60000:cfg.l*60000;var msg=wasFocus?'Focus complete! '+(S.pomo.sessCount%4===0?'Take a long break ☕':'Short break time ☕'):'Break over! Time to focus 🎯';playPomoCompleteSound();vibrateDevice([300,100,300,100,300]);sendNotif(wasFocus?'✅ Pomodoro Complete!':'⏱ Break Over!',msg);showToast(msg,'success');var settings=ld('vk_settings',{});if(settings.autoStart)setTimeout(startPomo,2000);else{updatePomoDisplay();renderPomoStats();renderSessLog();}}
function logPomoSess(){var sessions=ld('vk_sessions',[]),cfg=POMO[S.pomo.mode]||POMO.pomodoro,dur=cfg.f*60000;var subj=document.getElementById('pomo-subj-sel')?.value||S.pomo.subj||'';var bookId=document.getElementById('pomo-book-sel')?.value||S.pomo.bookId||'';var chapId=document.getElementById('pomo-chap-sel')?.value||S.pomo.chapId||'';var book=bookId?ld('vk_books',[]).find(function(b){return b.id===bookId;}):null;sessions.push({id:genId(),phase:'focus',dur:dur,duration:dur,subj:subj,subject:subj,bookId:bookId,chapId:chapId,bookTitle:book?book.title:'',ts:new Date().toISOString(),timestamp:new Date().toISOString()});sd('vk_sessions',sessions);updateStreak();var stats=ld('vk_stats',{});if(!stats.longestSess||dur/60000>stats.longestSess){stats.longestSess=dur/60000;sd('vk_stats',stats);}}
function updateStreak(){var stats=ld('vk_stats',{xp:0,level:1,streak:0,lastStudyDate:null}),today=todayStr(),yest=addDays(new Date(),-1).toISOString().split('T')[0];if(stats.lastStudyDate===today){}else if(stats.lastStudyDate===yest){stats.streak=(stats.streak||0)+1;awardXP(20,'Streak');}else stats.streak=1;stats.lastStudyDate=today;sd('vk_stats',stats);}
function renderPomoStats(){var sessions=ld('vk_sessions',[]),stats=ld('vk_stats',{streak:0});var today=new Date();today.setHours(0,0,0,0);var tod=sessions.filter(function(s){return s.phase==='focus'&&new Date(s.ts||s.timestamp)>=today;});var allMs=sessions.filter(function(s){return s.phase==='focus';}).reduce(function(a,s){return a+(s.dur||s.duration||0);},0),todMs=tod.reduce(function(a,s){return a+(s.dur||s.duration||0);},0);setText('pomo-stat-sess',tod.length);setText('pomo-stat-focus',todMs<60000?'0 min':(todMs/60000).toFixed(0)+' min');setText('pomo-stat-all',(allMs/3600000).toFixed(1)+' h');setText('pomo-stat-streak',(stats.streak||0)+' days');}
function renderSessLog(){var el=document.getElementById('sess-log');if(!el)return;var sessions=ld('vk_sessions',[]),today=new Date();today.setHours(0,0,0,0);var tod=sessions.filter(function(s){return new Date(s.ts||s.timestamp)>=today;}).slice(-10).reverse();if(!tod.length){el.innerHTML='<div class="empty-panel">No sessions today</div>';return;}el.innerHTML=tod.map(function(s){return'<div class="sess-log-item"><div class="sess-dot sess-'+(s.phase==='focus'?'focus':'break')+'"></div><span style="flex:1">'+(s.subj||s.subject||'—')+'</span><span style="font-family:var(--fm);font-size:0.71rem;color:var(--txt2)">'+((s.dur||s.duration||0)/60000).toFixed(0)+'min</span></div>';}).join('');}
function renderPomoHeatmap(){var el=document.getElementById('pomo-heatmap');if(!el)return;var sessions=ld('vk_sessions',[]),hm=new Array(168).fill(0);sessions.filter(function(s){return s.phase==='focus';}).forEach(function(s){var d=new Date(s.ts||s.timestamp);hm[d.getDay()*24+d.getHours()]+=(s.dur||s.duration||0)/3600000;});var maxV=Math.max.apply(null,hm.concat([0.1]));el.innerHTML=hm.map(function(v){var lv=v===0?0:v<maxV*0.25?1:v<maxV*0.5?2:v<maxV*0.75?3:4;return'<div class="hm-cell" data-lv="'+lv+'"></div>';}).join('');}
function checkBurnout(){var sessions=ld('vk_sessions',[]),today=new Date();today.setHours(0,0,0,0);var ms=sessions.filter(function(s){return s.phase==='focus'&&new Date(s.ts||s.timestamp)>=today;}).reduce(function(a,s){return a+(s.dur||s.duration||0);},0);if(ms>=3*3600000)showToast('⚠️ 3+ hours today. Take a proper break!','warning');}
function recalcPomoOnResume(){if(!S.pomo.running)return;var rem=S.pomo.dur-(Date.now()-S.pomo.ts);if(rem<=0){onPomoEnd();return;}schedPomoFrame();}

/* ============================================================
   14. SRS
============================================================ */
function renderSRS(){try{var srs=ld('vk_srs_chapters',[]),today=new Date();today.setHours(23,59,59,999);var due=srs.filter(function(r){return!r.dueDate||new Date(r.dueDate)<=today;});setText('srs-due-count',due.length);var badge=document.getElementById('dock-srs-badge');if(badge){badge.textContent=due.length;badge.style.display=due.length>0?'flex':'none';}renderSRSList('srs-due-list',due,true);renderSRSList('srs-all-list',srs,false);renderSRSCharts(srs);renderSRSWeak(srs);}catch(e){showToast('SRS: '+e.message,'error');}}
function renderSRSList(elId,items,isDue){var el=document.getElementById(elId);if(!el)return;if(!items.length){el.innerHTML='<div class="empty-panel">'+(isDue?'No chapters due today 🎉':'No chapters in SRS yet')+'</div>';return;}el.innerHTML=items.map(function(r){return'<div class="srs-item"><div class="srs-item-info"><div class="srs-item-name">'+r.chapName+'</div><div class="srs-item-meta">'+r.bookTitle+' · '+(r.repetitions||0)+' reviews</div></div><span class="srs-interval">'+(r.interval||1)+'d</span></div>';}).join('');}
function renderSRSCharts(srs){var c1=document.getElementById('chart-srs-status');if(c1&&typeof Chart!=='undefined'&&srs.length){var New=srs.filter(function(r){return r.repetitions===0;}).length,Lrn=srs.filter(function(r){return r.repetitions>0&&r.interval<7;}).length,Rev=srs.filter(function(r){return r.interval>=7&&!r.mastered;}).length,Mst=srs.filter(function(r){return r.mastered;}).length;destroyChart('chart-srs-status');requestAnimationFrame(function(){try{S.charts['chart-srs-status']=new Chart(c1,{type:'doughnut',data:{labels:['New','Learning','Review','Mastered'],datasets:[{data:[New,Lrn,Rev,Mst],backgroundColor:['#7c6fff','#ffa94d','#00e5ff','#43e97b'],borderColor:'rgba(0,0,0,0.3)',borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{legend:{position:'bottom',labels:{color:'#8888bb',font:{size:10},padding:6}}}}});}catch(e){}});}var c2=document.getElementById('chart-srs-forecast');if(c2&&typeof Chart!=='undefined'){var fd=new Array(7).fill(0);srs.forEach(function(r){if(!r.dueDate)return;var diff=Math.floor((new Date(r.dueDate)-new Date())/86400000);if(diff>=0&&diff<7)fd[diff]++;});destroyChart('chart-srs-forecast');requestAnimationFrame(function(){try{S.charts['chart-srs-forecast']=new Chart(c2,{type:'bar',data:{labels:['Today','+1d','+2d','+3d','+4d','+5d','+6d'],datasets:[{label:'Due',data:fd,backgroundColor:'rgba(124,111,255,0.5)',borderColor:'#7c6fff',borderWidth:2,borderRadius:5}]},options:Object.assign({},chartOpts(),{plugins:{legend:{display:false}}})});}catch(e){}});}}
function renderSRSWeak(srs){var el=document.getElementById('srs-weak-list');if(!el)return;var weak=srs.filter(function(r){return r.againCount>=3;});if(!weak.length){el.innerHTML='<div class="empty-panel">No difficult chapters 🎉</div>';return;}el.innerHTML=weak.map(function(r){return'<div class="srs-item"><div class="srs-item-info"><div class="srs-item-name">⚠ '+r.chapName+'</div><div class="srs-item-meta">Again ×'+r.againCount+'</div></div><button class="btn-sm btn-secondary" onclick="startSingleSRS(\''+r.chapterId+'\')">Review</button></div>';}).join('');}
function startSRSSession(){var srs=ld('vk_srs_chapters',[]),today=new Date();today.setHours(23,59,59,999);var due=srs.filter(function(r){return!r.dueDate||new Date(r.dueDate)<=today;});if(!due.length){showToast('No chapters due today!','info');return;}S.srs.queue=due;S.srs.idx=0;showSRSModal();}
function startSingleSRS(chapId){var srs=ld('vk_srs_chapters',[]),rec=srs.find(function(r){return r.chapterId===chapId;});if(!rec)return;S.srs.queue=[rec];S.srs.idx=0;showPage('srs');setTimeout(showSRSModal,100);}
function showSRSModal(){
  var q=S.srs.queue;
  if(!q||S.srs.idx>=q.length){
    var rv=document.getElementById('srs-review-panel');
    if(rv)rv.style.display='none';
    showToast('Review complete! '+( S.srs.queue&&S.srs.queue.length||0)+' chapters reviewed','success');
    awardXP(15,'SRS');renderSRS();return;
  }
  var rec=q[S.srs.idx],
      srs=ld('vk_srs_chapters',[]),
      r=srs.find(function(x){return x.chapterId===rec.chapterId;})||rec;
  var ef=r.easeFactor||2.5,iv=r.interval||1;
  var p=[1,Math.round(iv*1.2),Math.round(iv*ef),Math.round(iv*ef*1.3)];
  var pct=Math.round((S.srs.idx/q.length)*100);

  var panel=document.getElementById('srs-review-panel');
  if(!panel){
    panel=document.createElement('div');
    panel.id='srs-review-panel';
    var srsPage=document.getElementById('page-srs');
    if(srsPage)srsPage.appendChild(panel);
  }
  panel.style.cssText='position:fixed;inset:0;z-index:500;background:var(--bg,#07070f);overflow-y:auto;padding:16px';
  panel.style.display='block';

  // Build via DOM to avoid all quoting issues
  panel.innerHTML='';

  // Header row
  var hdr=document.createElement('div');
  hdr.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:16px';
  var exitBtn=document.createElement('button');
  exitBtn.style.cssText='background:var(--glass);border:1px solid var(--border);color:var(--txt);border-radius:10px;padding:8px 14px;cursor:pointer;font-size:0.85rem';
  exitBtn.innerHTML='<i class="fa fa-times"></i> Exit';
  exitBtn.onclick=function(){panel.style.display='none';renderSRS();};
  var prog=document.createElement('span');
  prog.style.cssText='font-size:0.85rem;color:var(--txt2)';
  prog.textContent=(S.srs.idx+1)+' / '+q.length;
  hdr.appendChild(exitBtn);hdr.appendChild(prog);
  panel.appendChild(hdr);

  // Progress bar
  var progBar=document.createElement('div');
  progBar.style.cssText='background:var(--border);border-radius:99px;height:6px;margin-bottom:20px';
  var progFill=document.createElement('div');
  progFill.style.cssText='background:var(--a1);width:'+pct+'%;height:6px;border-radius:99px;transition:.3s';
  progBar.appendChild(progFill);
  panel.appendChild(progBar);

  // Card
  var card=document.createElement('div');
  card.style.cssText='background:var(--bg3);border:1px solid rgba(124,111,255,0.25);border-radius:18px;padding:28px 20px;text-align:center;margin-bottom:20px';
  card.innerHTML='<div style="font-size:0.72rem;font-weight:700;color:var(--a2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">'+rec.bookTitle+(rec.subj?' &middot; '+rec.subj:'')+'</div>'
    +'<div style="font-size:1.3rem;font-weight:700;color:var(--txt);line-height:1.4;margin-bottom:12px">'+rec.chapName+'</div>'
    +'<div style="font-size:0.75rem;color:var(--txt3)">Interval: '+iv+'d &nbsp;&middot;&nbsp; Ease: '+ef.toFixed(1)+' &middot; Reviews: '+(r.totalReviews||0)+'</div>';
  panel.appendChild(card);

  // Rating label
  var lbl=document.createElement('div');
  lbl.style.cssText='text-align:center;font-size:0.8rem;color:var(--txt2);margin-bottom:14px';
  lbl.textContent='How well did you remember this chapter?';
  panel.appendChild(lbl);

  // Rating buttons
  var grid=document.createElement('div');
  grid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px';
  var ratings=[
    {label:'😓 Again',color:'#ff6b9d',bg:'rgba(255,107,157,.12)',border:'rgba(255,107,157,.35)',days:p[0],r:0},
    {label:'😐 Hard', color:'#ffa94d',bg:'rgba(255,169,77,.1)', border:'rgba(255,169,77,.3)', days:p[1],r:2},
    {label:'🙂 Good', color:'#00e5ff',bg:'rgba(0,229,255,.1)',  border:'rgba(0,229,255,.25)', days:p[2],r:3},
    {label:'😄 Easy', color:'#43e97b',bg:'rgba(67,233,123,.1)', border:'rgba(67,233,123,.28)',days:p[3],r:4}
  ];
  ratings.forEach(function(rt){
    var btn=document.createElement('button');
    btn.style.cssText='padding:16px 8px;background:'+rt.bg+';border:1px solid '+rt.border+';color:'+rt.color+';border-radius:14px;cursor:pointer;font-size:0.9rem;font-weight:700';
    btn.innerHTML=rt.label+'<br><small style="font-weight:400;opacity:.8;font-size:0.72rem">'+rt.days+'d</small>';
    (function(rating){btn.onclick=function(){submitSRS(rating);};})(rt.r);
    grid.appendChild(btn);
  });
  panel.appendChild(grid);
}
function submitSRS(rating){var q=S.srs.queue,rec=q[S.srs.idx];if(!rec)return;var notes='';var srs=ld('vk_srs_chapters',[]),i=srs.findIndex(function(x){return x.chapterId===rec.chapterId;});if(i===-1)return;var r=srs[i];if(rating===0){r.interval=1;r.repetitions=0;r.againCount=(r.againCount||0)+1;}else{if(r.repetitions===0)r.interval=1;else if(r.repetitions===1)r.interval=6;else r.interval=Math.round(r.interval*(r.easeFactor||2.5));if(rating===2)r.interval=Math.round(r.interval*1.2);if(rating===4)r.interval=Math.round(r.interval*1.3);r.repetitions++;}r.easeFactor=Math.max(1.3,(r.easeFactor||2.5)+0.1-(4-rating)*0.08);r.dueDate=addDays(new Date(),r.interval).toISOString();r.totalReviews=(r.totalReviews||0)+1;r.lastReview=new Date().toISOString();r.mastered=r.interval>21;r.notes=notes;sd('vk_srs_chapters',srs);awardXP(15,'SRS review');S.srs.idx++;if(S.srs.idx>=S.srs.queue.length){var rv=document.getElementById('srs-review-panel');if(rv)rv.style.display='none';showToast('Complete! '+S.srs.queue.length+' chapters reviewed 🎓','success');awardXP(15,'SRS');renderSRS();}else showSRSModal();}

/* ============================================================
   15. FLASHCARDS
============================================================ */
function renderFC(){try{if(S.fc.inReview){showEl('fc-review-mode',true);showEl('fc-deck-view',false);renderFCCard();}else{showEl('fc-review-mode',false);showEl('fc-deck-view',true);renderDeckList();}}catch(e){showToast('Flashcards: '+e.message,'error');}}
function renderDeckList(){var el=document.getElementById('deck-list'),empty=document.getElementById('deck-empty');if(!el)return;var decks=ld('vk_decks',[]),allCards=ld('vk_flashcards',[]),today=new Date();today.setHours(23,59,59,999);if(!decks.length){el.style.display='none';if(empty)empty.style.display='block';return;}el.style.display='flex';if(empty)empty.style.display='none';el.innerHTML=decks.map(function(d){var cards=allCards.filter(function(c){return c.deckId===d.id;}),due=cards.filter(function(c){return!c.dueDate||new Date(c.dueDate)<=today;}).length;return'<div class="deck-item'+(S.fc.deckId===d.id?' active':'')+'" onclick="selectDeck(\''+d.id+'\')"><div class="deck-ico"><i class="fa fa-layer-group"></i></div><div class="deck-info"><div class="deck-name">'+d.name+'</div><div class="deck-meta">'+cards.length+' cards · '+(d.subj||'General')+'</div></div>'+(due>0?'<span class="deck-due">'+due+' due</span>':'')+'</div>';}).join('');}
function selectDeck(id){S.fc.deckId=id;renderDeckList();var deck=ld('vk_decks',[]).find(function(d){return d.id===id;}),cards=ld('vk_flashcards',[]).filter(function(c){return c.deckId===id;});setText('deck-cards-title',deck?deck.name:'Cards');showEl('btn-add-card',true);showEl('btn-start-fc',true);renderCardsInDeck(cards);}
function renderCardsInDeck(cards){var el=document.getElementById('cards-in-deck');if(!el)return;if(!cards.length){el.innerHTML='<div class="empty-panel">No cards yet. Add your first card!</div>';return;}el.innerHTML=cards.map(function(c){return'<div class="fc-card-mini"><div class="fc-front-lbl">'+(c.front||'—')+'</div><div class="fc-back-lbl">'+(c.back||'—')+'</div><button class="fc-card-del" onclick="event.stopPropagation();deleteFCCard(\''+c.id+'\')"><i class="fa fa-times"></i></button></div>';}).join('');}
function deleteFCCard(id){sd('vk_flashcards',ld('vk_flashcards',[]).filter(function(c){return c.id!==id;}));if(S.fc.deckId)renderCardsInDeck(ld('vk_flashcards',[]).filter(function(c){return c.deckId===S.fc.deckId;}));showToast('Card deleted','info');}
function openNewDeckModal(){showPage('addmgr');amgrSwitch('deck');}

function saveNewDeck(){var name=(document.getElementById('nd-name')?.value||'').trim();if(!name){showToast('Enter a name','warning');return;}var decks=ld('vk_decks',[]);decks.push({id:genId(),name:name,subj:document.getElementById('nd-subj')?.value||'',created:new Date().toISOString()});sd('vk_decks',decks);renderDeckList();showToast('Deck created!','success');}
function openAddCardModal(){showPage('addmgr');amgrSwitch('card');}

function saveNewCard(){var front=(document.getElementById('nc-front')?.value||'').trim();if(!front){showToast('Enter front','warning');return;}var back=(document.getElementById('nc-back')?.value||'').trim(),tags=(document.getElementById('nc-tags')?.value||'').split(',').map(function(t){return t.trim();}).filter(Boolean);var cards=ld('vk_flashcards',[]);cards.push({id:genId(),deckId:S.fc.deckId,front:front,back:back,type:document.getElementById('nc-type')?.value||'basic',tags:tags,interval:0,easeFactor:2.5,dueDate:todayStr(),repetitions:0,totalReviews:0,againCount:0,created:new Date().toISOString(),lastReviewed:null});sd('vk_flashcards',cards);renderCardsInDeck(cards.filter(function(c){return c.deckId===S.fc.deckId;}));renderDeckList();showToast('Card added!','success');}
function doBulkImport(){if(!S.fc.deckId){showToast('Select a deck first','warning');return;}var text=(document.getElementById('bulk-import-txt')?.value||'').trim();if(!text){showToast('Paste some content','warning');return;}var lines=text.split('\n').filter(function(l){return l.trim();}),cards=ld('vk_flashcards',[]);var count=0;lines.forEach(function(line){var parts=line.split('\t');if(parts.length>=2){cards.push({id:genId(),deckId:S.fc.deckId,front:parts[0].trim(),back:parts[1].trim(),type:'basic',tags:[],interval:0,easeFactor:2.5,dueDate:todayStr(),repetitions:0,totalReviews:0,againCount:0,created:new Date().toISOString(),lastReviewed:null});count++;}});sd('vk_flashcards',cards);var ta=document.getElementById('bulk-import-txt');if(ta)ta.value='';renderCardsInDeck(cards.filter(function(c){return c.deckId===S.fc.deckId;}));renderDeckList();showToast(count+' cards imported!','success');}
function startFCReview(){if(!S.fc.deckId){showToast('Select a deck first','warning');return;}var allCards=ld('vk_flashcards',[]).filter(function(c){return c.deckId===S.fc.deckId;}),today=new Date();today.setHours(23,59,59,999);var due=allCards.filter(function(c){return!c.dueDate||new Date(c.dueDate)<=today;});if(!due.length){showToast('No cards due today!','info');return;}S.fc.queue=due;S.fc.idx=0;S.fc.inReview=true;showEl('fc-review-mode',true);showEl('fc-deck-view',false);renderFCCard();updateFCProg();}
function renderFCCard(){var q=S.fc.queue;if(!q||S.fc.idx>=q.length){exitFCReview();showToast('Deck complete! 🎉','success');awardXP(15,'FC session');return;}var card=q[S.fc.idx];var wrapper=document.getElementById('fc-wrapper');if(wrapper)wrapper.classList.remove('flipped');var fe=document.getElementById('fc-front-content'),be=document.getElementById('fc-back-content');var fh=card.type==='cloze'?card.front.replace(/\{\{(.+?)\}\}/g,'<span style="background:rgba(124,111,255,0.28);border-radius:3px;padding:0 5px">?</span>'):card.front;var bh=card.type==='cloze'?card.front.replace(/\{\{(.+?)\}\}/g,'<strong style="color:var(--a2)">$1</strong>')+'<hr style="margin:10px 0;border-color:var(--border)">'+card.back:card.back;if(fe)fe.innerHTML=fh;if(be)be.innerHTML=bh;showEl('btn-show-ans',true);showEl('rating-btns',false);var ef=card.easeFactor||2.5,iv=Math.max(1,card.interval||1),ints=[1,Math.round(iv*1.2),Math.round(iv*ef),Math.round(iv*ef*1.3)];['again','hard','good','easy'].forEach(function(k,i){var e=document.getElementById('ri-'+k);if(e)e.textContent=ints[i]+'d';});}
function showFCAnswer(){var w=document.getElementById('fc-wrapper');if(w)w.classList.add('flipped');showEl('btn-show-ans',false);showEl('rating-btns',true);}
function submitFCRating(rating){var q=S.fc.queue;if(!q||S.fc.idx>=q.length)return;var card=q[S.fc.idx],cards=ld('vk_flashcards',[]),i=cards.findIndex(function(c){return c.id===card.id;});if(i===-1)return;var c=cards[i];if(rating===0){c.interval=1;c.repetitions=0;c.againCount=(c.againCount||0)+1;}else{if(c.repetitions===0)c.interval=1;else if(c.repetitions===1)c.interval=6;else c.interval=Math.round(c.interval*(c.easeFactor||2.5));if(rating===2)c.interval=Math.round(c.interval*1.2);if(rating===4)c.interval=Math.round(c.interval*1.3);c.repetitions++;}c.easeFactor=Math.max(1.3,(c.easeFactor||2.5)+0.1-(4-rating)*0.08);c.dueDate=addDays(new Date(),c.interval).toISOString().split('T')[0];c.totalReviews=(c.totalReviews||0)+1;c.lastReviewed=new Date().toISOString();sd('vk_flashcards',cards);var stats=ld('vk_stats',{});stats.totalCards=(stats.totalCards||0)+1;sd('vk_stats',stats);S.fc.idx++;updateFCProg();renderFCCard();}
function updateFCProg(){var q=S.fc.queue||[],fill=document.getElementById('fc-prog-fill'),txt=document.getElementById('fc-prog-txt');if(fill)fill.style.width=(q.length?(S.fc.idx/q.length*100):0)+'%';if(txt)txt.textContent=S.fc.idx+'/'+q.length;}
function exitFCReview(){S.fc.inReview=false;S.fc.queue=[];S.fc.idx=0;showEl('fc-review-mode',false);showEl('fc-deck-view',true);renderDeckList();if(S.fc.deckId)selectDeck(S.fc.deckId);}

/* ============================================================
   16. ROUTINE
============================================================ */
function renderRoutine(){try{checkRoutineReset();var routine=ld('vk_routine',{items:[],lastReset:todayStr()});renderRoutineOv(routine.items||[]);renderRoutineGrid(routine.items||[]);}catch(e){showToast('Routine: '+e.message,'error');}}
function checkRoutineReset(){var r=ld('vk_routine',{items:[],lastReset:todayStr()});if(r.lastReset!==todayStr()){r.items=(r.items||[]).map(function(it){return Object.assign({},it,{done:false});});r.lastReset=todayStr();sd('vk_routine',r);}}
function renderRoutineOv(items){var el=document.getElementById('routine-overview');if(!el)return;var days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],today=days[(new Date().getDay()+6)%7];el.innerHTML=days.map(function(d){var di=items.filter(function(it){return it.day===d;}),done=di.filter(function(it){return it.done;}).length;return'<div class="day-ov'+(d===today?' today':'')+'" onclick="scrollToRoutineDay(\''+d+'\')"><div class="day-ov-name">'+d+'</div><div class="day-ov-prog">'+done+'/'+di.length+'</div></div>';}).join('');}
function renderRoutineGrid(items){var grid=document.getElementById('routine-grid');if(!grid)return;var days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],today=days[(new Date().getDay()+6)%7];grid.innerHTML=days.map(function(d){var di=items.filter(function(it){return it.day===d;}).sort(function(a,b){return(a.timeSlot||'').localeCompare(b.timeSlot||'');});return'<div class="routine-col" id="rcol-'+d+'"><div class="routine-day-hdr'+(d===today?' today-hdr':'')+'">'+d+'<small style="display:block;font-size:0.6rem;font-weight:400;margin-top:1px">'+di.filter(function(i){return i.done;}).length+'/'+di.length+'</small></div>'+di.map(function(it){return'<div class="routine-task'+(it.done?' done':'')+'" style="border-left-color:'+(it.color||'var(--a1)')+'"><div class="routine-task-name">'+(it.task||'Task')+'</div><div class="routine-task-time">'+(it.timeSlot||'')+(it.dur?' · '+it.dur+'min':'')+'</div><label class="routine-task-chk" onclick="event.stopPropagation()"><input type="checkbox" '+(it.done?'checked ':'')+' onchange="toggleRoutineTask(\''+it.id+'\',this.checked)" style="display:none"><i class="fa fa-'+(it.done?'check-circle':'circle')+'" style="color:'+(it.done?'var(--a4)':'var(--txt3)')+'"></i></label></div>';}).join('')+'<button class="routine-add-btn" onclick="openAddRoutineModal(\''+d+'\')">+ Add</button></div>';}).join('');}
function toggleRoutineTask(id,done){var r=ld('vk_routine',{items:[]}),i=r.items.findIndex(function(it){return it.id===id;});if(i===-1)return;r.items[i].done=done;sd('vk_routine',r);renderRoutineOv(r.items);if(done)awardXP(5,'Routine task');}
function openAddRoutineModal(day){showPage('addmgr');amgrSwitch('task');var d=document.getElementById('am-task-day');if(d&&day)d.value=day;}

function saveRoutineTask(){var task=(document.getElementById('rt-task')?.value||'').trim();if(!task){showToast('Enter a task','warning');return;}var r=ld('vk_routine',{items:[],lastReset:todayStr()}),colorEl=document.querySelector('#rt-colors .swatch.active');r.items.push({id:genId(),task:task,subj:document.getElementById('rt-subj')?.value||'',day:document.getElementById('rt-day')?.value||'Mon',timeSlot:document.getElementById('rt-time')?.value||'',dur:+(document.getElementById('rt-dur')?.value||60),color:colorEl?colorEl.dataset.color:'#7c6fff',done:false,created:new Date().toISOString()});sd('vk_routine',r);renderRoutine();showToast('Task added!','success');}
function scrollToRoutineDay(day){var el=document.getElementById('rcol-'+day);if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'});}

/* ============================================================
   17. MIND MAP
============================================================ */
function initMM(){
  try{
    var canvas=document.getElementById('mm-canvas');if(!canvas)return;
    var wrap=document.querySelector('.mm-canvas-wrap');
    if(wrap){canvas.width=wrap.clientWidth||window.innerWidth;canvas.height=Math.max(wrap.clientHeight||400,window.innerHeight*0.65);}
    else{canvas.width=window.innerWidth;canvas.height=Math.round(window.innerHeight*0.65);}
    loadMMSelector();
    if(S.mm.mapId)drawMM();
    else{
      var ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle='rgba(124,111,255,0.5)';ctx.font='bold 15px DM Sans';ctx.textAlign='center';
      ctx.fillText('Tap anywhere to add a node',canvas.width/2,canvas.height/2-20);
      ctx.font='13px DM Sans';ctx.fillStyle='rgba(124,111,255,0.3)';
      ctx.fillText('or create a map in ➕ Add Manager → Map',canvas.width/2,canvas.height/2+10);
    }
    attachMMEvents(canvas);updateMMminimap();
    // Inject mobile toolbar if not present
    injectMMToolbar();
  }catch(e){showToast('MindMap: '+e.message,'error');}
}

function injectMMToolbar(){
  if(document.getElementById('mm-mobile-toolbar'))return;
  var tb=document.createElement('div');
  tb.id='mm-mobile-toolbar';
  tb.style.cssText='position:absolute;bottom:60px;right:12px;display:flex;flex-direction:column;gap:8px;z-index:100';
  var buttons=[
    {label:'<i class="fa fa-plus"></i>',title:'Add Node',action:'addCenterNode()'},
    {label:'<i class="fa fa-trash"></i>',title:'Delete Selected',action:'deleteSelectedNode()'},
    {label:'<i class="fa fa-link"></i>',title:'Connect Mode',action:'toggleMMConnectMode()'},
    {label:'<i class="fa fa-undo"></i>',title:'Reset View',action:'mmResetView()'},
    {label:'<i class="fa fa-save"></i>',title:'Save Map',action:'saveCurrentMap()'},
  ];
  buttons.forEach(function(b){
    var btn=document.createElement('button');
    btn.innerHTML=b.label;
    btn.title=b.title;
    btn.style.cssText='width:46px;height:46px;border-radius:50%;background:var(--bg3);border:1px solid var(--border);color:var(--txt);font-size:1rem;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center';
    btn.setAttribute('onclick',b.action);
    tb.appendChild(btn);
  });
  var wrap=document.querySelector('.mm-canvas-wrap');
  if(wrap){wrap.style.position='relative';wrap.appendChild(tb);}
}

function toggleMMConnectMode(){
  S.mm.connectMode=!S.mm.connectMode;
  S.mm.connFrom=null;
  showToast(S.mm.connectMode?'Connect mode ON — tap two nodes to connect':'Connect mode OFF','info');
}
function loadMMSelector(){var sel=document.getElementById('mm-selector');if(!sel)return;var maps=ld('vk_mindmaps',[]);sel.innerHTML='<option value="">-- Select Map --</option>'+maps.map(function(m){return'<option value="'+m.id+'"'+(S.mm.mapId===m.id?' selected':'')+'>'+m.name+'</option>';}).join('');sel.onchange=function(){if(sel.value)loadMap(sel.value);};}
function loadMap(id){var maps=ld('vk_mindmaps',[]),map=maps.find(function(m){return m.id===id;});if(!map)return;S.mm.mapId=id;S.mm.nodes=map.nodes||[];S.mm.edges=map.edges||[];S.mm.selNode=null;S.mm.connFrom=null;drawMM();updateMMminimap();}
function saveCurrentMap(){if(!S.mm.mapId){showToast('Create or select a map first','warning');return;}var maps=ld('vk_mindmaps',[]),i=maps.findIndex(function(m){return m.id===S.mm.mapId;});if(i===-1)return;maps[i].nodes=S.mm.nodes;maps[i].edges=S.mm.edges;maps[i].updated=new Date().toISOString();sd('vk_mindmaps',maps);showToast('Map saved!','success');}
function createNewMap(){
  // Redirect to Add Manager - no popup needed
  showPage('addmgr');
  setTimeout(function(){amgrSwitch('deck');},100);
  showToast('Use Add Manager → Deck tab to create a new map deck','info');
}

function createNewMapNamed(name){
  if(!name||!name.trim())return;
  var maps=ld('vk_mindmaps',[]),map={id:genId(),name:name.trim(),nodes:[],edges:[],created:new Date().toISOString()};
  maps.push(map);sd('vk_mindmaps',maps);
  S.mm.mapId=map.id;S.mm.nodes=[];S.mm.edges=[];S.mm.selNode=null;
  loadMMSelector();drawMM();showToast('Map "'+name.trim()+'" created!','success');
}

function doCreateMap(){var name=(document.getElementById('nm-name')?.value||'').trim();if(!name){showToast('Enter a name','warning');return;}var maps=ld('vk_mindmaps',[]),map={id:genId(),name:name,nodes:[],edges:[],created:new Date().toISOString()};maps.push(map);sd('vk_mindmaps',maps);S.mm.mapId=map.id;S.mm.nodes=[];S.mm.edges=[];S.mm.selNode=null;loadMMSelector();drawMM();showToast('Map created!','success');}
function exportMapPNG(){var canvas=document.getElementById('mm-canvas');if(!canvas)return;var a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download='mindmap.png';a.click();showToast('Exported!','success');}
function setMMNodeColor(el){document.querySelectorAll('.nn-swatch').forEach(function(s){s.classList.remove('active');});el.classList.add('active');S.mm.nodeColor=el.dataset.color||'#7c6fff';if(S.mm.selNode){var n=S.mm.nodes.find(function(nd){return nd.id===S.mm.selNode;});if(n){n.color=S.mm.nodeColor;drawMM();}}}
function setMMNodeShape(el,shape){document.querySelectorAll('.mm-shape-btn').forEach(function(b){b.classList.remove('active');});el.classList.add('active');S.mm.nodeShape=shape;if(S.mm.selNode){var n=S.mm.nodes.find(function(nd){return nd.id===S.mm.selNode;});if(n){n.shape=shape;drawMM();}}}
function addCenterNode(){if(!S.mm.mapId){showToast('Create a map first','warning');return;}var canvas=document.getElementById('mm-canvas');S.mm.nodes.push({id:genId(),x:(canvas?canvas.width:400)/2,y:(canvas?canvas.height:300)/2,text:'New Node',color:S.mm.nodeColor,shape:S.mm.nodeShape});drawMM();}
function mmZoom(factor){S.mm.scale=Math.min(4,Math.max(0.15,S.mm.scale*factor));drawMM();updateMMminimap();}
function mmResetView(){S.mm.tx=0;S.mm.ty=0;S.mm.scale=1;drawMM();updateMMminimap();}
function deleteSelectedNode(){if(!S.mm.selNode)return;S.mm.nodes=S.mm.nodes.filter(function(n){return n.id!==S.mm.selNode;});S.mm.edges=S.mm.edges.filter(function(e){return e.from!==S.mm.selNode&&e.to!==S.mm.selNode;});S.mm.selNode=null;drawMM();}
function drawMM(){
  var canvas=document.getElementById('mm-canvas');if(!canvas)return;
  var ctx=canvas.getContext('2d'),mm=S.mm;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();ctx.translate(mm.tx,mm.ty);ctx.scale(mm.scale,mm.scale);
  ctx.strokeStyle='rgba(124,111,255,0.04)';ctx.lineWidth=1;
  var gridSize=50,startX=Math.floor(-mm.tx/mm.scale/gridSize)*gridSize,startY=Math.floor(-mm.ty/mm.scale/gridSize)*gridSize;
  for(var gx=startX;gx<(canvas.width-mm.tx)/mm.scale;gx+=gridSize){ctx.beginPath();ctx.moveTo(gx,-10000);ctx.lineTo(gx,10000);ctx.stroke();}
  for(var gy=startY;gy<(canvas.height-mm.ty)/mm.scale;gy+=gridSize){ctx.beginPath();ctx.moveTo(-10000,gy);ctx.lineTo(10000,gy);ctx.stroke();}
  mm.edges.forEach(function(e){var from=mm.nodes.find(function(n){return n.id===e.from;}),to=mm.nodes.find(function(n){return n.id===e.to;});if(!from||!to)return;var grad=ctx.createLinearGradient(from.x,from.y,to.x,to.y);grad.addColorStop(0,from.color||'rgba(124,111,255,0.6)');grad.addColorStop(1,to.color||'rgba(124,111,255,0.6)');ctx.beginPath();var cpx=(from.x+to.x)/2,cpy=(from.y+to.y)/2-32;ctx.moveTo(from.x,from.y);ctx.quadraticCurveTo(cpx,cpy,to.x,to.y);ctx.strokeStyle=grad;ctx.lineWidth=2.5;ctx.stroke();var angle=Math.atan2(to.y-cpy,to.x-cpx);ctx.fillStyle=to.color||'rgba(124,111,255,0.6)';ctx.beginPath();ctx.moveTo(to.x,to.y);ctx.lineTo(to.x-12*Math.cos(angle-0.4),to.y-12*Math.sin(angle-0.4));ctx.lineTo(to.x-12*Math.cos(angle+0.4),to.y-12*Math.sin(angle+0.4));ctx.closePath();ctx.fill();});
  ctx.font='13px DM Sans';
  mm.nodes.forEach(function(node){var isSel=mm.selNode===node.id,isConn=mm.connFrom===node.id;var w=Math.max(100,ctx.measureText(node.text||'').width+40),h=40,xl=node.x-w/2,yl=node.y-h/2;if(isSel||isConn){ctx.shadowBlur=20;ctx.shadowColor=isSel?'rgba(124,111,255,0.8)':'rgba(0,229,255,0.8)';}ctx.beginPath();var shape=node.shape||'rect';if(shape==='oval'){ctx.ellipse(node.x,node.y,w/2,h/2,0,0,Math.PI*2);}else if(shape==='diamond'){ctx.moveTo(node.x,node.y-h);ctx.lineTo(node.x+w/2,node.y);ctx.lineTo(node.x,node.y+h);ctx.lineTo(node.x-w/2,node.y);ctx.closePath();}else{mmRR(ctx,xl,yl,w,h,10);}var nodeGrad=ctx.createLinearGradient(xl,yl,xl+w,yl+h);nodeGrad.addColorStop(0,hex2rgba(node.color||'#7c6fff',0.9));nodeGrad.addColorStop(1,hex2rgba(node.color||'#7c6fff',0.6));ctx.fillStyle=nodeGrad;ctx.fill();ctx.strokeStyle=isSel?'#fff':isConn?'#00e5ff':hex2rgba(node.color||'#7c6fff',0.5);ctx.lineWidth=isSel||isConn?2.5:1.5;ctx.stroke();ctx.shadowBlur=0;ctx.shadowColor='transparent';ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=(isSel?'bold ':'')+'13px DM Sans';ctx.fillText(node.text||'',node.x,node.y);});
  ctx.restore();
}
function mmRR(ctx,x,y,w,h,r){ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
function mmToWorld(cx,cy){return{x:(cx-S.mm.tx)/S.mm.scale,y:(cy-S.mm.ty)/S.mm.scale};}
function mmHit(wx,wy){var canvas=document.getElementById('mm-canvas');if(!canvas)return null;var ctx=canvas.getContext('2d');ctx.font='13px DM Sans';for(var i=S.mm.nodes.length-1;i>=0;i--){var n=S.mm.nodes[i],w=Math.max(100,ctx.measureText(n.text||'').width+40),h=40;if(wx>=n.x-w/2&&wx<=n.x+w/2&&wy>=n.y-h/2&&wy<=n.y+h/2)return n.id;}return null;}
function mmEditNode(id,canvas){var n=S.mm.nodes.find(function(nd){return nd.id===id;});if(!n)return;var rect=canvas.getBoundingClientRect();var sx=n.x*S.mm.scale+S.mm.tx+rect.left,sy=n.y*S.mm.scale+S.mm.ty+rect.top;var inp=document.createElement('input');inp.value=n.text||'';inp.style.cssText='position:fixed;left:'+(sx-65)+'px;top:'+(sy-18)+'px;width:130px;height:34px;background:var(--bg4);border:2px solid var(--a1);border-radius:8px;color:var(--txt);font-size:12px;padding:0 9px;z-index:500;text-align:center;font-family:DM Sans;box-shadow:0 0 16px rgba(124,111,255,0.5)';document.body.appendChild(inp);inp.focus();inp.select();function commit(){n.text=inp.value.trim()||n.text;inp.remove();drawMM();updateMMminimap();}inp.addEventListener('blur',commit);inp.addEventListener('keydown',function(e){if(e.key==='Enter')commit();if(e.key==='Escape'){inp.remove();drawMM();}});}
function updateMMminimap(){var mini=document.getElementById('mm-mini-canvas');if(!mini)return;var ctx=mini.getContext('2d');ctx.clearRect(0,0,mini.width,mini.height);if(!S.mm.nodes.length)return;var scale=0.12;ctx.save();ctx.scale(scale,scale);S.mm.nodes.forEach(function(n){ctx.beginPath();ctx.arc(n.x,n.y,12,0,Math.PI*2);ctx.fillStyle=n.color||'#7c6fff';ctx.fill();});ctx.restore();}
function attachMMEvents(canvas){
  var newC=canvas.cloneNode(true);canvas.parentNode.replaceChild(newC,canvas);canvas=document.getElementById('mm-canvas');
  canvas.addEventListener('dblclick',function(e){if(!S.mm.mapId){showToast('Create a map first','warning');return;}var rect=canvas.getBoundingClientRect(),pos=mmToWorld(e.clientX-rect.left,e.clientY-rect.top),hit=mmHit(pos.x,pos.y);if(hit)mmEditNode(hit,canvas);else{S.mm.nodes.push({id:genId(),x:pos.x,y:pos.y,text:'New Node',color:S.mm.nodeColor,shape:S.mm.nodeShape});drawMM();updateMMminimap();}});
  canvas.addEventListener('mousedown',function(e){var rect=canvas.getBoundingClientRect(),pos=mmToWorld(e.clientX-rect.left,e.clientY-rect.top),hit=mmHit(pos.x,pos.y);if(hit){if(S.mm.connFrom&&S.mm.connFrom!==hit){if(!S.mm.edges.some(function(ed){return(ed.from===S.mm.connFrom&&ed.to===hit)||(ed.from===hit&&ed.to===S.mm.connFrom);}))S.mm.edges.push({id:genId(),from:S.mm.connFrom,to:hit});S.mm.connFrom=null;}else{S.mm.selNode=hit;S.mm.connFrom=S.mm.connFrom===hit?null:hit;var n=S.mm.nodes.find(function(nd){return nd.id===hit;});S.mm.dragging=true;S.mm.dragId=hit;S.mm.dox=(n?n.x:0)-pos.x;S.mm.doy=(n?n.y:0)-pos.y;}drawMM();}else{S.mm.selNode=null;S.mm.connFrom=null;S.mm.panning=true;S.mm.psx=e.clientX;S.mm.psy=e.clientY;S.mm.ptx=S.mm.tx;S.mm.pty=S.mm.ty;drawMM();}});
  canvas.addEventListener('mousemove',function(e){if(S.mm.dragging&&S.mm.dragId){var rect=canvas.getBoundingClientRect(),pos=mmToWorld(e.clientX-rect.left,e.clientY-rect.top);var n=S.mm.nodes.find(function(nd){return nd.id===S.mm.dragId;});if(n){n.x=pos.x+S.mm.dox;n.y=pos.y+S.mm.doy;}drawMM();}else if(S.mm.panning){S.mm.tx=S.mm.ptx+(e.clientX-S.mm.psx);S.mm.ty=S.mm.pty+(e.clientY-S.mm.psy);drawMM();}});
  canvas.addEventListener('mouseup',function(){S.mm.dragging=false;S.mm.dragId=null;S.mm.panning=false;updateMMminimap();});
  canvas.addEventListener('wheel',function(e){e.preventDefault();var factor=e.deltaY<0?1.1:0.9;var rect=canvas.getBoundingClientRect(),mx=e.clientX-rect.left,my=e.clientY-rect.top;S.mm.tx=mx-(mx-S.mm.tx)*factor;S.mm.ty=my-(my-S.mm.ty)*factor;S.mm.scale=Math.min(4,Math.max(0.15,S.mm.scale*factor));drawMM();updateMMminimap();},{passive:false});
  var tp=null;
  canvas.addEventListener('touchstart',function(e){e.preventDefault();if(e.touches.length===1){var t=e.touches[0],rect=canvas.getBoundingClientRect(),pos=mmToWorld(t.clientX-rect.left,t.clientY-rect.top),hit=mmHit(pos.x,pos.y);if(hit){S.mm.selNode=hit;S.mm.dragging=true;S.mm.dragId=hit;var n=S.mm.nodes.find(function(nd){return nd.id===hit;});S.mm.dox=(n?n.x:0)-pos.x;S.mm.doy=(n?n.y:0)-pos.y;}else{S.mm.panning=true;S.mm.psx=t.clientX;S.mm.psy=t.clientY;S.mm.ptx=S.mm.tx;S.mm.pty=S.mm.ty;}tp={x:t.clientX,y:t.clientY,time:Date.now()};}},{passive:false});
  canvas.addEventListener('touchmove',function(e){e.preventDefault();if(e.touches.length===1){var t=e.touches[0];if(S.mm.dragging&&S.mm.dragId){var rect=canvas.getBoundingClientRect(),pos=mmToWorld(t.clientX-rect.left,t.clientY-rect.top);var n=S.mm.nodes.find(function(nd){return nd.id===S.mm.dragId;});if(n){n.x=pos.x+S.mm.dox;n.y=pos.y+S.mm.doy;}drawMM();}else if(S.mm.panning){S.mm.tx=S.mm.ptx+(t.clientX-S.mm.psx);S.mm.ty=S.mm.pty+(t.clientY-S.mm.psy);drawMM();}}},{passive:false});
  canvas.addEventListener('touchend',function(e){if(tp&&Date.now()-tp.time<300&&e.changedTouches.length===1){var t=e.changedTouches[0];if(Math.abs(t.clientX-tp.x)<10&&Math.abs(t.clientY-tp.y)<10){if(!S.mm.mapId){showToast('Create a map first','warning');}else{var rect=canvas.getBoundingClientRect(),pos=mmToWorld(t.clientX-rect.left,t.clientY-rect.top),hit=mmHit(pos.x,pos.y);if(hit)mmEditNode(hit,canvas);else{S.mm.nodes.push({id:genId(),x:pos.x,y:pos.y,text:'New Node',color:S.mm.nodeColor,shape:S.mm.nodeShape});drawMM();updateMMminimap();}}}}S.mm.dragging=false;S.mm.dragId=null;S.mm.panning=false;tp=null;updateMMminimap();},{passive:false});
}
function aiDescribeNode(){var node=S.mm.nodes.find(function(n){return n.id===S.mm.selNode;});if(!node)return;var panel=document.getElementById('ai-panel'),body=document.getElementById('ai-panel-body');if(!panel||!body)return;panel.style.display='block';body.innerHTML='<div style="color:var(--txt2);font-size:.82rem">AI features require API integration.<br>Node: <strong>'+node.text+'</strong><br><br>Connect your Anthropic API key in Settings to enable AI insights.</div>';}

/* ============================================================
   18. PRAYER
============================================================ */
function renderPrayer(){try{var pr=ld('vk_prayer',{});if(pr.city){var ci=document.getElementById('prayer-city'),co=document.getElementById('prayer-country');if(ci)ci.value=pr.city||'';if(co)co.value=pr.country||'';}if(pr.times)renderPrayerTimes(pr);renderPrayerTracker();}catch(e){showToast('Prayer: '+e.message,'error');}}
function detectLocation(){if(!navigator.geolocation){showToast('Geolocation not supported','warning');return;}showToast('Detecting location…','info');navigator.geolocation.getCurrentPosition(function(pos){var pr=ld('vk_prayer',{});pr.lat=pos.coords.latitude;pr.lng=pos.coords.longitude;sd('vk_prayer',pr);showToast('Location set','success');calcPrayerTimes();},function(){showToast('Could not get location. Enter city manually.','warning');});}
function calcPrayerTimes(){
  var city=(document.getElementById('prayer-city')?.value||'').trim(),country=(document.getElementById('prayer-country')?.value||'').trim();
  var methodKey=document.getElementById('prayer-method')?.value||'MoonsightingCommittee';
  var madhabKey=document.getElementById('prayer-madhab')?.value||'Shafi';
  if(!city){showToast('Enter your city first','warning');return;}
  var pr=ld('vk_prayer',{});pr.city=city;pr.country=country;pr.methodKey=methodKey;pr.madhabKey=madhabKey;
  showToast('Calculating prayer times…','info');
  var url='https://nominatim.openstreetmap.org/search?q='+encodeURIComponent(city+(country?', '+country:''))+'&format=json&limit=1';
  fetch(url).then(function(r){return r.json();}).then(function(data){
    if(!data||!data.length){showToast('City not found. Try a larger city nearby.','warning');return;}
    pr.lat=parseFloat(data[0].lat);pr.lng=parseFloat(data[0].lon);
    if(typeof adhan==='undefined'){showToast('Prayer library loading, try again','warning');return;}
    var coords=new adhan.Coordinates(pr.lat,pr.lng);
    var params=adhan.CalculationMethod[methodKey]?adhan.CalculationMethod[methodKey]():adhan.CalculationMethod.MoonsightingCommittee();
    params.madhab=madhabKey==='Hanafi'?adhan.Madhab.Hanafi:adhan.Madhab.Shafi;
    var prayerTimes=new adhan.PrayerTimes(coords,new Date(),params);
    pr.times={fajr:prayerTimes.fajr.toISOString(),sunrise:prayerTimes.sunrise.toISOString(),dhuhr:prayerTimes.dhuhr.toISOString(),asr:prayerTimes.asr.toISOString(),maghrib:prayerTimes.maghrib.toISOString(),isha:prayerTimes.isha.toISOString()};
    var qibla=adhan.Qibla(coords);pr.qibla=qibla;
    sd('vk_prayer',pr);renderPrayerTimes(pr);
    var needle=document.getElementById('compass-needle');if(needle)needle.style.transform='translate(-50%,-100%) rotate('+qibla+'deg)';
    var qdeg=document.getElementById('qibla-deg');if(qdeg)qdeg.textContent=Math.round(qibla)+'° from North';
    showToast('Prayer times calculated for '+city+'!','success');
    updateDashPrayer();
  }).catch(function(e){showToast('Error: '+e.message,'error');});
}
function renderPrayerTimes(pr){
  var grid=document.getElementById('prayer-times-grid');if(!grid||!pr.times)return;
  var names=['fajr','sunrise','dhuhr','asr','maghrib','isha'],now=new Date(),nextPrayer='';
  for(var i=0;i<names.length;i++){if(pr.times[names[i]]&&new Date(pr.times[names[i]])>now){nextPrayer=names[i];break;}}
  grid.innerHTML=names.map(function(n){var isNext=n===nextPrayer;return'<div class="prayer-card'+(isNext?' next':'')+'"><div class="prayer-name">'+cap(n)+'</div><div class="prayer-time">'+fmt12(new Date(pr.times[n]))+'</div>'+(isNext?'<div class="prayer-cd-badge">Next</div>':'')+'<button class="prayer-notif-tog" onclick="this.classList.toggle(\'on\')">🔔 Notify</button></div>';}).join('');
}
function renderPrayerTracker(){
  var el=document.getElementById('prayer-tracker');if(!el)return;
  var pr=ld('vk_prayer',{}),log=pr.log||{},today=todayStr(),todayLog=log[today]||{};
  var names=['fajr','dhuhr','asr','maghrib','isha'];
  var days=[];for(var i=6;i>=0;i--){days.push(addDays(new Date(),-i).toISOString().split('T')[0]);}
  var h='<table class="tracker-tbl"><thead><tr><th>Prayer</th>'+days.map(function(d){return'<th>'+new Date(d).toLocaleDateString('en-US',{weekday:'short'})+'</th>';}).join('')+'</tr></thead><tbody>';
  names.forEach(function(n){h+='<tr><td style="font-size:0.78rem;font-weight:600;padding:4px 8px">'+cap(n)+'</td>';days.forEach(function(d){var dayLog=log[d]||{},done=dayLog[n]===true,isToday=d===today;h+='<td class="tracker-td"><div class="tracker-cell'+(done?' tc-prayed':isToday?' tc-today':' tc-upcoming')+'" onclick="togglePrayer(\''+n+'\',\''+d+'\')" title="'+(done?'Prayed':'Mark prayed')+'">'+(done?'✓':'')+'</div></td>';});h+='</tr>';});
  h+='</tbody></table>';el.innerHTML=h;
  var prayed=names.filter(function(n){return todayLog[n]===true;}).length;
  setText('prayer-streak','🔥 '+prayed+'/5 today');
  var stats=ld('vk_stats',{});stats.prayersToday=prayed;sd('vk_stats',stats);
}
function togglePrayer(name,day){var pr=ld('vk_prayer',{});if(!pr.log)pr.log={};if(!pr.log[day])pr.log[day]={};pr.log[day][name]=!pr.log[day][name];sd('vk_prayer',pr);renderPrayerTracker();if(pr.log[day][name])awardXP(5,'Prayer');}

/* ============================================================
   19. INTERNET
============================================================ */
function initInternet(){
  var page=document.getElementById('page-internet');if(!page)return;
  if(page.querySelector('.inet-browser-wrap'))return;
  page.innerHTML='';page.style.cssText='display:flex;flex-direction:column;height:100%;overflow:hidden;';
  page.innerHTML='<div class="inet-browser-wrap" style="display:flex;flex-direction:column;height:100%;background:var(--bg2)"><div style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:var(--bg3);border-bottom:1px solid var(--border);flex-shrink:0"><button id="inet-back2" style="background:none;border:none;color:var(--txt2);font-size:18px;cursor:pointer;padding:6px 8px">&#8592;</button><button id="inet-fwd2" style="background:none;border:none;color:var(--txt2);font-size:18px;cursor:pointer;padding:6px 8px">&#8594;</button><button id="inet-reload2" style="background:none;border:none;color:var(--txt2);font-size:16px;cursor:pointer;padding:6px 8px">&#8635;</button><div style="flex:1;position:relative"><input id="inet-addr2" type="url" autocomplete="off" placeholder="Search or enter URL..." style="width:100%;box-sizing:border-box;background:var(--bg);color:var(--txt);border:1px solid var(--border);border-radius:10px;padding:8px 36px 8px 12px;font-size:14px;outline:none;font-family:inherit"><button id="inet-go2" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);background:var(--a1);color:#fff;border:none;border-radius:7px;padding:4px 10px;font-size:12px;cursor:pointer">Go</button></div><button id="inet-bmark2" title="Bookmark" style="background:none;border:none;color:var(--txt2);font-size:18px;cursor:pointer;padding:6px">&#128278;</button><button id="inet-bmarks2" style="background:var(--glass);border:1px solid var(--border);color:var(--txt);border-radius:8px;padding:5px 9px;font-size:12px;cursor:pointer">&#9733; Bmarks</button></div><div id="inet-bmarks-panel2" style="display:none;padding:10px;background:var(--bg3);border-bottom:1px solid var(--border);flex-wrap:wrap;gap:6px;max-height:120px;overflow-y:auto"></div><iframe id="inet-frame2" src="about:blank" style="flex:1;border:none;width:100%" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"></iframe></div>';
  function nav(url){if(!url)return;if(!url.startsWith('http')&&!url.startsWith('about')){url=url.includes('.')?'https://'+url:'https://www.google.com/search?q='+encodeURIComponent(url);}var fr=document.getElementById('inet-frame2'),inp=document.getElementById('inet-addr2');if(fr)fr.src=url;if(inp)inp.value=url;}
  function renderBmarks(){var p=document.getElementById('inet-bmarks-panel2');if(!p)return;var bm=ld('vk_inet_bmarks',[]);p.innerHTML=bm.map(function(b){return'<button onclick="(function(){document.getElementById(\'inet-addr2\').value=\''+b.url+'\';document.getElementById(\'inet-bmarks-panel2\').style.display=\'none\';document.getElementById(\'inet-frame2\').src=\''+b.url+'\';})()" style="background:var(--glass);border:1px solid var(--border);color:var(--txt);border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer">'+b.title+'</button>';}).join('');}
  document.getElementById('inet-go2').onclick=function(){nav(document.getElementById('inet-addr2').value);};
  document.getElementById('inet-addr2').addEventListener('keydown',function(e){if(e.key==='Enter')nav(this.value);});
  document.getElementById('inet-back2').onclick=function(){try{document.getElementById('inet-frame2').contentWindow.history.back();}catch(e){}};
  document.getElementById('inet-fwd2').onclick=function(){try{document.getElementById('inet-frame2').contentWindow.history.forward();}catch(e){}};
  document.getElementById('inet-reload2').onclick=function(){var f=document.getElementById('inet-frame2');if(f&&f.src!=='about:blank')f.src=f.src;};
  document.getElementById('inet-bmark2').onclick=function(){var inp=document.getElementById('inet-addr2');var url=inp?inp.value:'';if(!url||url==='about:blank')return;var bm=ld('vk_inet_bmarks',[]);if(!bm.find(function(b){return b.url===url;})){bm.push({url:url,title:url.replace(/^https?:\/\//,'').slice(0,30)});sd('vk_inet_bmarks',bm);renderBmarks();showToast('Bookmarked!','success');}};
  document.getElementById('inet-bmarks2').onclick=function(){var p=document.getElementById('inet-bmarks-panel2');p.style.display=p.style.display==='none'?'flex':'none';if(p.style.display==='flex')renderBmarks();};
  nav('https://www.google.com');
}

/* ============================================================
   20. ANALYTICS
============================================================ */
function renderAnalytics(){
  try{
    var sessions=ld('vk_sessions',[]),goals=ld('vk_goals',{weeklyHours:20,monthlyChaps:30,dailyHours:4,dailyChaps:3,dailyPomo:4}),chaps=ld('vk_chapters',[]);
    var now=new Date(),weekAgo=new Date(now.getTime()-7*86400000),monthAgo=new Date(now.getTime()-30*86400000);
    var weekSess=sessions.filter(function(s){return s.phase==='focus'&&new Date(s.ts||s.timestamp)>=weekAgo;}),monthChapsDone=chaps.filter(function(c){return c.completedDate&&new Date(c.completedDate)>=monthAgo;}).length;
    var weekHrs=weekSess.reduce(function(a,s){return a+(s.dur||s.duration||0)/3600000;},0);
    var ghFill=document.getElementById('gf-hours'),ghTxt=document.getElementById('gt-hours');
    if(ghFill)ghFill.style.width=Math.min(weekHrs/(goals.weeklyHours||20)*100,100)+'%';
    if(ghTxt)ghTxt.textContent=weekHrs.toFixed(1)+'/'+(goals.weeklyHours||20)+'h';
    var gcFill=document.getElementById('gf-chaps'),gcTxt=document.getElementById('gt-chaps');
    if(gcFill)gcFill.style.width=Math.min(monthChapsDone/(goals.monthlyChaps||30)*100,100)+'%';
    if(gcTxt)gcTxt.textContent=monthChapsDone+'/'+(goals.monthlyChaps||30);
    renderConsistencyChart(sessions);renderAnSubjChart(sessions);renderCompletionChart();renderRetentionChart();renderSRSPerfChart();renderAnalyticsHeatmap(sessions);renderInsights(sessions,chaps);
    var stats=ld('vk_stats',{streak:0,xp:0,level:1});
    var score=Math.min(100,Math.round(Math.min((stats.streak||0)*5,40)+Math.min(weekHrs*5,40)+Math.min(monthChapsDone*2,20)));
    setText('score-val',score);setText('score-lbl',score>=80?'Excellent 🏆':score>=60?'Good 👍':score>=40?'Average 📚':'Keep going! 💪');
  }catch(e){showToast('Analytics: '+e.message,'error');}
}
function renderInsights(sessions,chaps){var el=document.getElementById('insights-list');if(!el)return;var today=new Date();today.setHours(0,0,0,0);var todSess=sessions.filter(function(s){return new Date(s.ts||s.timestamp)>=today&&s.phase==='focus';});var todHrs=todSess.reduce(function(a,s){return a+(s.dur||s.duration||0)/3600000;},0);var stats=ld('vk_stats',{});var insights=['<div class="insight-item"><i class="fa fa-fire"></i><span>Current streak: <strong>'+(stats.streak||0)+' days</strong></span></div>','<div class="insight-item"><i class="fa fa-clock"></i><span>Today: <strong>'+todHrs.toFixed(1)+'h</strong> across '+todSess.length+' sessions</span></div>','<div class="insight-item"><i class="fa fa-book-open"></i><span><strong>'+chaps.filter(function(c){return c.stages&&c.stages.exam;}).length+'</strong> chapters fully completed</span></div>','<div class="insight-item"><i class="fa fa-brain"></i><span><strong>'+ld('vk_srs_chapters',[]).length+'</strong> chapters in spaced repetition</span></div>'];el.innerHTML=insights.join('');}
function renderConsistencyChart(sessions){var canvas=document.getElementById('chart-consistency');if(!canvas||typeof Chart==='undefined')return;var data=[];for(var i=29;i>=0;i--){var ds=addDays(new Date(),-i).toISOString().split('T')[0];data.push(sessions.filter(function(s){return(s.ts||s.timestamp||'').startsWith(ds)&&s.phase==='focus';}).length>0?1:0);}destroyChart('chart-consistency');requestAnimationFrame(function(){try{S.charts['chart-consistency']=new Chart(canvas,{type:'bar',data:{labels:data.map(function(){return'';}),datasets:[{data:data,backgroundColor:data.map(function(v){return v?'rgba(67,233,123,0.7)':'rgba(255,255,255,0.05)';}),borderRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{display:false},y:{display:false}}}});}catch(e){}});}
function renderAnSubjChart(sessions){var canvas=document.getElementById('chart-an-subjects');if(!canvas||typeof Chart==='undefined')return;var map={};sessions.filter(function(s){return s.phase==='focus'&&(s.subj||s.subject);}).forEach(function(s){var k=s.subj||s.subject;map[k]=(map[k]||0)+(s.dur||s.duration||0)/3600000;});var labels=Object.keys(map),data=labels.map(function(k){return+map[k].toFixed(2);});if(!data.length)return;var colors=['#7c6fff','#00e5ff','#ff6b9d','#43e97b','#ffa94d','#f72585'];destroyChart('chart-an-subjects');requestAnimationFrame(function(){try{S.charts['chart-an-subjects']=new Chart(canvas,{type:'doughnut',data:{labels:labels,datasets:[{data:data,backgroundColor:colors.slice(0,labels.length),borderColor:'rgba(0,0,0,0.3)',borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{legend:{position:'bottom',labels:{color:'#8888aa',font:{size:10},padding:8}}}}});}catch(e){}});}
function renderCompletionChart(){var canvas=document.getElementById('chart-completion');if(!canvas||typeof Chart==='undefined')return;var chaps=ld('vk_chapters',[]);var cumul=0,data=Array.from({length:30},function(_,i){var ds=addDays(new Date(),i-29).toISOString().split('T')[0];cumul+=chaps.filter(function(c){return c.completedDate&&c.completedDate.startsWith(ds);}).length;return cumul;});var labels=Array.from({length:30},function(_,i){return addDays(new Date(),i-29).toLocaleDateString('en-US',{month:'short',day:'numeric'});});destroyChart('chart-completion');requestAnimationFrame(function(){try{S.charts['chart-completion']=new Chart(canvas,{type:'line',data:{labels:labels,datasets:[{label:'Chapters',data:data,backgroundColor:'rgba(124,111,255,0.14)',borderColor:'#7c6fff',borderWidth:2,fill:true,tension:0.4,pointRadius:0}]},options:Object.assign({},chartOpts(),{plugins:{legend:{display:false}}})});}catch(e){}});}
function renderRetentionChart(){var canvas=document.getElementById('chart-retention');if(!canvas||typeof Chart==='undefined')return;var cards=ld('vk_flashcards',[]);var data=Array.from({length:30},function(_,i){var ds=addDays(new Date(),-i).toISOString().split('T')[0];var dr=cards.filter(function(c){return c.lastReviewed&&c.lastReviewed.startsWith(ds);});if(!dr.length)return null;var good=dr.filter(function(c){return(c.totalReviews||0)-(c.againCount||0)>0;}).length;return Math.round(good/dr.length*100);}).reverse();var labels=Array.from({length:30},function(_,i){return addDays(new Date(),i-29).toLocaleDateString('en-US',{month:'short',day:'numeric'});});destroyChart('chart-retention');requestAnimationFrame(function(){try{S.charts['chart-retention']=new Chart(canvas,{type:'line',data:{labels:labels,datasets:[{label:'Retention %',data:data,backgroundColor:'rgba(67,233,123,0.1)',borderColor:'#43e97b',borderWidth:2,fill:true,tension:0.4,spanGaps:true,pointRadius:0}]},options:Object.assign({},chartOpts(),{scales:{y:{min:0,max:100,ticks:{callback:function(v){return v+'%';},color:'#8888bb',font:{size:10}},grid:{color:'rgba(255,255,255,0.04)'}},x:{grid:{display:false},ticks:{color:'#8888bb',font:{size:9},maxTicksLimit:7}}}})});}catch(e){}});}
function renderSRSPerfChart(){var canvas=document.getElementById('chart-srs-perf');if(!canvas||typeof Chart==='undefined')return;var srs=ld('vk_srs_chapters',[]);if(!srs.length)return;var today=new Date();today.setHours(23,59,59,999);var due=srs.filter(function(r){return!r.dueDate||new Date(r.dueDate)<=today;}).length,mastered=srs.filter(function(r){return r.mastered;}).length,learning=srs.filter(function(r){return!r.mastered&&(r.repetitions||0)>0;}).length,newI=srs.filter(function(r){return(r.repetitions||0)===0;}).length;destroyChart('chart-srs-perf');requestAnimationFrame(function(){try{S.charts['chart-srs-perf']=new Chart(canvas,{type:'bar',data:{labels:['New','Learning','Due','Mastered'],datasets:[{data:[newI,learning,due,mastered],backgroundColor:['#7c6fff','#ffa94d','#ff6b9d','#43e97b'],borderRadius:6}]},options:Object.assign({},chartOpts(),{plugins:{legend:{display:false}}})});}catch(e){}});}
function renderAnalyticsHeatmap(sessions){var el=document.getElementById('analytics-heatmap');if(!el)return;var cells=[];for(var w=51;w>=0;w--){for(var d=0;d<7;d++){var dt=addDays(new Date(),-(w*7+d)),ds=dt.toISOString().split('T')[0];var mins=sessions.filter(function(s){return(s.ts||s.timestamp||'').startsWith(ds)&&s.phase==='focus';}).reduce(function(a,s){return a+(s.dur||s.duration||0)/60000;},0);var lv=mins===0?0:mins<30?1:mins<60?2:mins<120?3:4;cells.push('<div class="hm-cell" data-lv="'+lv+'" title="'+ds+': '+Math.round(mins)+'min"></div>');}}el.innerHTML='<div class="heatmap-grid">'+cells.join('')+'</div>';}
function openGoalsModal(){showPage('addmgr');setTimeout(function(){amgrSwitch('data');},100);}

function saveGoals(){sd('vk_goals',{weeklyHours:+(document.getElementById('g-wh')?.value||20),monthlyChaps:+(document.getElementById('g-mc')?.value||30),dailyHours:+(document.getElementById('g-dh')?.value||4),dailyChaps:+(document.getElementById('g-dc')?.value||3),dailyPomo:+(document.getElementById('g-dp')?.value||4)});renderAnalytics();showToast('Goals saved!','success');}

/* ============================================================
   21. SETTINGS
============================================================ */
function renderSettings(){try{renderProfileCard();renderAchievements();loadSettingsValues();renderAlarmsList();updateExamCd();}catch(e){showToast('Settings: '+e.message,'error');}}
function renderProfileCard(){var p=ld('vk_user_profile',{name:'Student',avatar:'🎓',studentType:'University Student',institution:'',bio:''}),stats=ld('vk_stats',{xp:0,level:1,streak:0}),sessions=ld('vk_sessions',[]),books=ld('vk_books',[]);var ad=document.getElementById('profile-avatar');if(ad)ad.textContent=p.avatar||'🎓';var ni=document.getElementById('profile-name');if(ni)ni.value=p.name||'Student';var pt=document.getElementById('profile-type');if(pt)pt.value=p.studentType||'University Student';var ii=document.getElementById('profile-institution');if(ii)ii.value=p.institution||'';var bi=document.getElementById('profile-bio');if(bi)bi.value=p.bio||'';var totalH=sessions.filter(function(s){return s.phase==='focus';}).reduce(function(a,s){return a+(s.dur||s.duration||0)/3600000;},0);setText('ps-hours',totalH.toFixed(1));setText('ps-books',books.length);setText('ps-streak',stats.streak||0);setText('ps-level',stats.level||1);}
function saveProfile(){var p={name:(document.getElementById('profile-name')?.value||'Student').trim(),avatar:document.getElementById('profile-avatar')?.textContent||'🎓',studentType:document.getElementById('profile-type')?.value||'',institution:(document.getElementById('profile-institution')?.value||'').trim(),bio:(document.getElementById('profile-bio')?.value||'').trim()};sd('vk_user_profile',p);showToast('Profile saved!','success');}
function renderAchievements(){var el=document.getElementById('achievements-grid');if(!el)return;var stats=ld('vk_stats',{}),chaps=ld('vk_chapters',[]),notes=ld('vk_notes',[]),books=ld('vk_books',[]),pr=ld('vk_prayer',{});var tl=(pr.log||{})[todayStr()]||{};stats.totalChaps=chaps.filter(function(c){return c.stages&&c.stages.exam;}).length;stats.totalNotes=notes.length;stats.totalBooks=books.length;stats.prayersToday=['fajr','dhuhr','asr','maghrib','isha'].filter(function(n){return tl[n]===true;}).length;var saved=stats.achievements||[];el.innerHTML=ACHIEVEMENT_DEFS.map(function(a){var unlocked=a.chk(stats)||saved.includes(a.id);return'<div class="ach-badge'+(unlocked?' unlocked':' locked')+'" title="'+a.desc+'"><span class="ach-ico">'+a.ico+'</span><span class="ach-name">'+a.name+'</span></div>';}).join('');}
function loadSettingsValues(){var s=ld('vk_settings',{});var tog=function(id,val){var e=document.getElementById(id);if(e)e.checked=!!val;};tog('tog-anim',s.reduceMotion);tog('tog-notif',s.notifications);tog('tog-pomo-alerts',s.pomoAlerts!==false);tog('tog-prayer-notif',s.prayerNotif!==false);tog('tog-autostart',s.autoStart);var sl=function(id,vid,val,sfx){var e=document.getElementById(id);if(e){e.value=val;setText(vid,val+' '+sfx);e.oninput=function(){setText(vid,e.value+' '+sfx);saveSettingVal(id,+e.value);};}};sl('set-focus','set-focus-v',s.pomoDur||25,'min');sl('set-short','set-short-v',s.pomoShort||5,'min');sl('set-long','set-long-v',s.pomoLong||15,'min');sl('set-daily-hrs','set-daily-hrs-v',s.dailyHoursGoal||4,'hrs');var av=document.getElementById('set-alarm-vol');if(av){av.value=s.alarmVol||80;setText('set-alarm-vol-v',(s.alarmVol||80)+'%');av.oninput=function(){setText('set-alarm-vol-v',av.value+'%');saveSettingVal('set-alarm-vol',+av.value);};}var en=document.getElementById('set-exam-name'),ed=document.getElementById('set-exam-date');if(en)en.value=s.examName||'';if(ed)ed.value=s.examDate||'';var t=s.theme||'dark';document.getElementById('btn-dark')?.classList.toggle('active',t==='dark');document.getElementById('btn-light')?.classList.toggle('active',t==='light');if(s.accentColor){document.documentElement.style.setProperty('--a1',s.accentColor);document.querySelectorAll('#accent-swatches .swatch').forEach(function(sw){sw.classList.toggle('active',sw.dataset.color===s.accentColor);});}['tog-anim','tog-notif','tog-pomo-alerts','tog-prayer-notif','tog-autostart'].forEach(function(id){var e=document.getElementById(id);if(!e)return;e.onchange=function(){var km={'tog-anim':'reduceMotion','tog-notif':'notifications','tog-pomo-alerts':'pomoAlerts','tog-prayer-notif':'prayerNotif','tog-autostart':'autoStart'};saveSettingToggle(km[id],e.checked);if(id==='tog-anim')document.body.classList.toggle('reduce-motion',e.checked);};});}
function handleNotifToggle(checked){saveSettingToggle('notifications',checked);if(checked){requestNotifPermission(function(ok){if(!ok){showToast('Enable notifications in browser settings','warning');var e=document.getElementById('tog-notif');if(e)e.checked=false;saveSettingToggle('notifications',false);}else showToast('Notifications enabled!','success');});}else showToast('Notifications disabled','info');}
function saveSettingVal(id,val){var s=ld('vk_settings',{}),map={'set-focus':'pomoDur','set-short':'pomoShort','set-long':'pomoLong','set-daily-hrs':'dailyHoursGoal','set-alarm-vol':'alarmVol'};if(map[id]){s[map[id]]=val;sd('vk_settings',s);}}
function saveSettingToggle(key,val){var s=ld('vk_settings',{});s[key]=val;sd('vk_settings',s);}
function saveExamSettings(){var s=ld('vk_settings',{});s.examName=(document.getElementById('set-exam-name')?.value||'').trim();s.examDate=document.getElementById('set-exam-date')?.value||'';sd('vk_settings',s);updateExamCd();showToast('Exam saved!','success');}
function setTheme(t){document.documentElement.setAttribute('data-theme',t);var s=ld('vk_settings',{});s.theme=t;sd('vk_settings',s);document.getElementById('btn-dark')?.classList.toggle('active',t==='dark');document.getElementById('btn-light')?.classList.toggle('active',t==='light');var btn=document.getElementById('theme-toggle');if(btn)btn.innerHTML='<i class="fa fa-'+(t==='dark'?'moon':'sun')+'"></i>';}
function setFontSize(sz){document.body.classList.remove('font-sm','font-md','font-lg');document.body.classList.add('font-'+sz);var s=ld('vk_settings',{});s.fontSize=sz;sd('vk_settings',s);}
function pickAccentColor(el){document.documentElement.style.setProperty('--a1',el.dataset.color);document.querySelectorAll('#accent-swatches .swatch').forEach(function(s){s.classList.toggle('active',s===el);});var s=ld('vk_settings',{});s.accentColor=el.dataset.color;sd('vk_settings',s);}
function openAvatarPicker(){
  var emojis=['🎓','📚','🧑‍🎓','👨‍💻','🦅','🌟','🔥','⚡','🎯','🚀','🌙','☀️','🦁','🐉','🌊','🏔️','💎','🌺','🦋','🎭','🤖','🎮','🏆','💡','🔮','🌈','🎨','🎵','🦊','🦄','🌸','🍀','💫','✨','🌀','🔑'];
  var existing=document.getElementById('avatar-picker-inline');
  if(existing){existing.remove();return;}
  var picker=document.createElement('div');
  picker.id='avatar-picker-inline';
  picker.style.cssText='background:var(--bg3);border:1px solid var(--border);border-radius:14px;padding:12px;margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;max-width:340px';
  emojis.forEach(function(e){
    var btn=document.createElement('button');
    btn.style.cssText='font-size:1.6rem;background:var(--glass);border:1px solid var(--border);border-radius:8px;width:42px;height:42px;cursor:pointer';
    btn.textContent=e;
    btn.onclick=function(){pickAvatar(e);};
    picker.appendChild(btn);
  });
  var avatarWrap=document.querySelector('.avatar-wrap');
  if(avatarWrap)avatarWrap.insertAdjacentElement('afterend',picker);
}
function pickAvatar(emoji){var el=document.getElementById('profile-avatar');if(el)el.textContent=emoji;var p=ld('vk_user_profile',{});p.avatar=emoji;sd('vk_user_profile',p);}
function exportAllData(){try{var data={};Object.keys(localStorage).filter(function(k){return k.startsWith('vk_');}).forEach(function(k){try{data[k]=JSON.parse(localStorage.getItem(k));}catch(e){}});var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='venolk1_backup_'+todayStr()+'.json';a.click();URL.revokeObjectURL(url);showToast('Data exported!','success');}catch(e){showToast('Export failed: '+e.message,'error');}}
function importData(file){if(!file)return;var reader=new FileReader();reader.onload=function(e){try{var data=JSON.parse(e.target.result),count=0;Object.keys(data).forEach(function(k){sd(k,data[k]);count++;});showToast('Restored '+count+' keys. Reloading…','success');setTimeout(function(){location.reload();},1500);}catch(err){showToast('Import failed: invalid JSON','error');}};reader.readAsText(file);}
function clearAllData(){
  if(!confirm('⚠️ DELETE ALL DATA?\n\nThis permanently erases ALL books, chapters, notes, sessions, flashcards, and settings.\n\nThis CANNOT be undone!'))return;
  if(!confirm('Are you absolutely sure? Press OK to delete everything.'))return;
  Object.keys(localStorage).filter(function(k){return k.startsWith('vk_');}).forEach(function(k){localStorage.removeItem(k);});
  showToast('All data cleared. Reloading…','info');
  setTimeout(function(){location.reload();},1000);
}
function doDeleteAll(){Object.keys(localStorage).filter(function(k){return k.startsWith('vk_');}).forEach(function(k){localStorage.removeItem(k);});showToast('All data cleared. Reloading…','info');setTimeout(function(){location.reload();},1000);}

/* ============================================================
   22. ALARMS
============================================================ */
function renderAlarmsList(){var el=document.getElementById('alarms-list');if(!el)return;var alarms=ld('vk_alarms',[]);if(!alarms.length){el.innerHTML='<div class="empty-panel">No alarms set</div>';return;}el.innerHTML=alarms.map(function(a){return'<div class="alarm-item"><div class="alarm-item-info"><div class="alarm-item-title">'+a.title+'</div><div class="alarm-item-time">'+a.time+' · '+(a.repeat||'once')+' · '+(a.type||'study')+'</div></div><div class="alarm-item-actions"><label class="sw"><input type="checkbox" '+(a.enabled?'checked ':'')+' onchange="toggleAlarm(\''+a.id+'\',this.checked)"><span class="sw-slider"></span></label><button class="btn-icon btn-sm" onclick="deleteAlarm(\''+a.id+'\')"><i class="fa fa-trash"></i></button></div></div>';}).join('');}
function openAddAlarmModal(){showPage('addmgr');amgrSwitch('alarm');}

function saveAlarm(){var title=(document.getElementById('al-title')?.value||'Alarm').trim(),time=document.getElementById('al-time')?.value||'08:00',repeat=document.getElementById('al-repeat')?.value||'none',type=document.getElementById('al-type')?.value||'study',snooze=+(document.getElementById('al-snooze')?.value||10);var alarms=ld('vk_alarms',[]);alarms.push({id:genId(),title:title,time:time,repeat:repeat,type:type,snooze:snooze,enabled:true,nextTrigger:computeNextTrigger(time)});sd('vk_alarms',alarms);renderAlarmsList();showToast('Alarm set!','success');}
function computeNextTrigger(timeStr){var p=(timeStr||'08:00').split(':'),h=+p[0],m=+p[1],t=new Date();t.setHours(h,m,0,0);if(t<=new Date())t.setDate(t.getDate()+1);return t.getTime();}
function toggleAlarm(id,enabled){var a=ld('vk_alarms',[]),i=a.findIndex(function(x){return x.id===id;});if(i!==-1){a[i].enabled=enabled;sd('vk_alarms',a);}}
function deleteAlarm(id){sd('vk_alarms',ld('vk_alarms',[]).filter(function(a){return a.id!==id;}));renderAlarmsList();showToast('Alarm deleted','info');}
function checkAlarms(){try{var alarms=ld('vk_alarms',[]),now=Date.now();var changed=false;alarms.forEach(function(alarm){if(!alarm.enabled||!alarm.nextTrigger)return;if(alarm.nextTrigger<=now){fireAlarm(alarm);alarm.nextTrigger=computeAlarmNextTrigger(alarm);changed=true;}});if(changed)sd('vk_alarms',alarms);checkPrayerAlerts();}catch(e){}}
function computeAlarmNextTrigger(alarm){var p=(alarm.time||'08:00').split(':'),h=+p[0],m=+p[1],t=new Date();t.setHours(h,m,0,0);if(alarm.repeat==='daily'){t.setDate(t.getDate()+1);return t.getTime();}if(alarm.repeat==='weekly'){t.setDate(t.getDate()+7);return t.getTime();}return null;}
function fireAlarm(alarm){if(S.alarm.active)return;S.alarm.active=alarm;S.alarm.wakeupDone=false;var modal=document.getElementById('alarm-modal');if(!modal)return;modal.style.display='flex';setText('alarm-title',alarm.title||'Alarm');var msgs={study:'Time to study! 📚',break:'Take a break! ☕',review:'Review time! 🧠',wakeup:'Wake up! 🌅 Good morning!',prayer:'Prayer time 🕌'};setText('alarm-msg',msgs[alarm.type]||alarm.title||'Alarm!');var wu=document.getElementById('wakeup-tasks'),sb=document.getElementById('btn-alarm-stop');if(alarm.type==='wakeup'){if(wu)wu.style.display='block';if(sb)sb.disabled=true;}else{if(wu)wu.style.display='none';if(sb)sb.disabled=false;}var snBtn=document.getElementById('btn-alarm-snooze');if(snBtn)snBtn.textContent='Snooze '+(alarm.snooze||10)+' min';playAlarmSound();vibrateDevice([500,200,500,200,500]);sendNotif('⏰ '+(alarm.title||'Alarm'),msgs[alarm.type]||'');}
function snoozeAlarm(){var alarm=S.alarm.active;if(!alarm)return;var mins=alarm.snooze||10,alarms=ld('vk_alarms',[]),i=alarms.findIndex(function(a){return a.id===alarm.id;});if(i!==-1){alarms[i].nextTrigger=Date.now()+mins*60000;sd('vk_alarms',alarms);}var modal=document.getElementById('alarm-modal');if(modal)modal.style.display='none';S.alarm.active=null;showToast('Snoozed '+mins+' min','info');}
function stopAlarm(){if(S.alarm.active&&S.alarm.active.type==='wakeup'&&!S.alarm.wakeupDone){showToast('Complete a task first!','warning');return;}var modal=document.getElementById('alarm-modal');if(modal)modal.style.display='none';S.alarm.active=null;stopAlarmSound();}
function completeWakeupTask(type){if(type==='srs'){var srs=ld('vk_srs_chapters',[]),today=new Date();today.setHours(23,59,59,999);var due=srs.find(function(r){return!r.dueDate||new Date(r.dueDate)<=today;});if(due){S.alarm.wakeupDone=true;var sb=document.getElementById('btn-alarm-stop');if(sb)sb.disabled=false;stopAlarm();startSingleSRS(due.chapterId);}else showToast('No SRS due — try another','info');}else if(type==='pomo'){S.alarm.wakeupDone=true;var sb2=document.getElementById('btn-alarm-stop');if(sb2)sb2.disabled=false;stopAlarm();showPage('pomodoro');showToast('Start your Pomodoro 🎯','success');}else if(type==='note'){var ni=document.getElementById('wu-note-inp');if(ni){ni.style.display='block';ni.focus();ni.onkeydown=function(e){if(e.key==='Enter'&&ni.value.trim()){var notes=ld('vk_notes',[]);notes.push({id:genId(),title:'Morning Note — '+new Date().toLocaleDateString(),content:ni.value.trim(),tags:['morning'],pinned:false,bgColor:'',textColor:'',audioClips:[],created:new Date().toISOString(),modified:new Date().toISOString()});sd('vk_notes',notes);S.alarm.wakeupDone=true;var sb3=document.getElementById('btn-alarm-stop');if(sb3)sb3.disabled=false;ni.style.display='none';stopAlarm();showToast('Note saved!','success');};};}}}
function checkPrayerAlerts(){var s=ld('vk_settings',{});if(!s.prayerNotif)return;var pr=ld('vk_prayer',{});if(!pr.times)return;var now=new Date(),names=['fajr','dhuhr','asr','maghrib','isha'];names.forEach(function(n){if(!pr.times[n])return;var t=new Date(pr.times[n]),diff=t-now;if(diff>0&&diff<120000){var alerted=ld('vk_prayer_alerted',{});if(!alerted[n+now.toDateString()]){alerted[n+now.toDateString()]=true;sd('vk_prayer_alerted',alerted);sendNotif('🕌 Prayer Time',cap(n)+' in 2 minutes');playBeep(440,1,'sine',0.4);vibrateDevice([500,200,500]);}}});}

/* ============================================================
   23. GAMIFICATION
============================================================ */
function awardXP(amount,reason){try{var stats=ld('vk_stats',{xp:0,level:1,streak:0,achievements:[]});stats.xp=(stats.xp||0)+amount;var newLv=Math.min(99,Math.floor(stats.xp/LVL_XP)+1);if(newLv>(stats.level||1)){stats.level=newLv;showToast('🎉 Level Up! Level '+newLv+'!','success');}stats.level=newLv;sd('vk_stats',stats);updateXPBar(stats);checkAchievements(stats);}catch(e){}}
function checkAchievements(stats){var chaps=ld('vk_chapters',[]),notes=ld('vk_notes',[]),books=ld('vk_books',[]);stats.totalChaps=chaps.filter(function(c){return c.stages&&c.stages.exam;}).length;stats.totalNotes=notes.length;stats.totalBooks=books.length;var saved=stats.achievements||[],changed=false;ACHIEVEMENT_DEFS.forEach(function(a){if(!saved.includes(a.id)&&a.chk(stats)){saved.push(a.id);showToast('🏆 Achievement: '+a.name+' '+a.ico,'success');changed=true;}});if(changed){stats.achievements=saved;sd('vk_stats',stats);}}

/* ============================================================
   24. ONBOARDING
============================================================ */
var _ob=0;
function checkOnboarding(){if(!ld('vk_onboarded',false))showOnboarding();}
function showOnboarding(){var ov=document.getElementById('onboarding-overlay');if(ov)ov.style.display='flex';updateOb(0);}
function updateOb(idx){_ob=idx;document.querySelectorAll('.ob-slide').forEach(function(s,i){s.classList.toggle('active',i===idx);});document.querySelectorAll('#ob-dots .dot').forEach(function(d,i){d.classList.toggle('active',i===idx);});var prev=document.getElementById('ob-prev'),next=document.getElementById('ob-next'),total=document.querySelectorAll('.ob-slide').length;if(prev)prev.style.display=idx>0?'inline-flex':'none';if(next)next.textContent=idx===total-1?'Get Started →':'Next →';}
function nextOb(){var t=document.querySelectorAll('.ob-slide').length;if(_ob<t-1)updateOb(_ob+1);else finishOb();}
function prevOb(){if(_ob>0)updateOb(_ob-1);}
function finishOb(){sd('vk_onboarded',true);var ov=document.getElementById('onboarding-overlay');if(ov)ov.style.display='none';}

/* ============================================================
   25. SEARCH
============================================================ */
function openSearch(){showEl('search-overlay',true);setTimeout(function(){document.getElementById('search-inp')?.focus();},50);}
function closeSearch(){showEl('search-overlay',false);var i=document.getElementById('search-inp');if(i)i.value='';var r=document.getElementById('search-results');if(r)r.innerHTML='';}
function doSearch(q){var res=document.getElementById('search-results');if(!res)return;q=(q||'').toLowerCase().trim();if(!q){res.innerHTML='';return;}var results=[];ld('vk_books',[]).forEach(function(b){if((b.title||'').toLowerCase().includes(q)||(b.author||'').toLowerCase().includes(q))results.push({type:'Book',ico:'fa-book-open',title:b.title,sub:b.author||'',action:'openBookDetail(\''+b.id+'\');showPage(\'books\')'});});ld('vk_chapters',[]).forEach(function(c){if((c.name||'').toLowerCase().includes(q)){var book=ld('vk_books',[]).find(function(b){return b.id===c.bookId;});results.push({type:'Chapter',ico:'fa-list',title:c.name,sub:book?book.title:'',action:'S.books.bookId=\''+c.bookId+'\';showPage(\'books\')'});}});ld('vk_notes',[]).forEach(function(n){if((n.title||'').toLowerCase().includes(q)||(n.content||'').replace(/<[^>]+>/g,'').toLowerCase().includes(q))results.push({type:'Note',ico:'fa-sticky-note',title:n.title||'Untitled',sub:'Note',action:'S.notes.id=\''+n.id+'\';showPage(\'notes\')'});});ld('vk_flashcards',[]).forEach(function(c){if((c.front||'').toLowerCase().includes(q))results.push({type:'Card',ico:'fa-layer-group',title:(c.front||'').slice(0,55),sub:'Flashcard',action:'showPage(\'flashcards\')'});});if(!results.length){res.innerHTML='<div class="search-group-lbl">No results</div>';return;}var grouped={};results.forEach(function(r){if(!grouped[r.type])grouped[r.type]=[];grouped[r.type].push(r);});res.innerHTML=Object.keys(grouped).map(function(type){return'<div class="search-group-lbl">'+type+'s</div>'+grouped[type].slice(0,5).map(function(r){return'<div class="search-result" onclick="'+r.action+';closeSearch()"><i class="fa '+r.ico+' sr-ico"></i><div><div class="sr-title">'+r.title+'</div><div class="sr-sub">'+r.sub+'</div></div></div>';}).join('');}).join('');}

/* ============================================================
   26. KEYBOARD SHORTCUTS
============================================================ */
function handleKeyboard(e){
  if(e.ctrlKey||e.metaKey){
    if(e.key==='k'){e.preventDefault();openSearch();return;}
    if(e.key==='n'){e.preventDefault();showPage('notes');setTimeout(createNewNote,200);return;}
    if(e.key==='s'&&S.page==='notes'){e.preventDefault();autoSaveNote();return;}
    if(e.key==='p'&&S.page==='pomodoro'){e.preventDefault();S.pomo.running?pausePomo():startPomo();return;}
    if(e.shiftKey&&(e.key==='L'||e.key==='l')){e.preventDefault();setTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');return;}
    var num=parseInt(e.key);if(num>=1&&num<=9){e.preventDefault();var pg=['dashboard','calendar','books','routine','srs','flashcards','notes','pomodoro','prayer'];if(pg[num-1])showPage(pg[num-1]);return;}
  }
  if(e.key==='Escape'){closeSearch();var am=document.getElementById('alarm-modal');if(am&&am.style.display==='flex')stopAlarm();var md=document.getElementById('math-dialog');if(md&&md.style.display==='flex')closeMathDialog();return;}
  if(e.key==='Delete'&&S.page==='mindmap'&&S.mm.selNode)deleteSelectedNode();
}

/* ============================================================
   27. CLOCK
============================================================ */
function startClock(){var tick=function(){var el=document.getElementById('live-clock');if(el)el.textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});};tick();setInterval(tick,1000);}

/* ============================================================
   28. INIT
============================================================ */
document.addEventListener('DOMContentLoaded',function(){
  try{
    document.addEventListener('click',function _u(){S.interacted=true;getAudioCtx();document.removeEventListener('click',_u,true);},{once:true,capture:true});
    document.addEventListener('touchend',function _u(){S.interacted=true;getAudioCtx();document.removeEventListener('touchend',_u,true);},{once:true,capture:true});

    var settings=ld('vk_settings',{});
    setTheme(settings.theme||'dark');
    if(settings.fontSize){document.body.classList.add('font-'+(settings.fontSize||'md'));}
    if(settings.accentColor)document.documentElement.style.setProperty('--a1',settings.accentColor);
    if(settings.reduceMotion)document.body.classList.add('reduce-motion');

    updateXPBar(ld('vk_stats',{xp:0,level:1}));
    startClock();
    setInterval(checkAlarms,1000);
    document.addEventListener('visibilitychange',function(){if(!document.hidden)recalcPomoOnResume();});
    document.addEventListener('keydown',handleKeyboard);
    document.getElementById('modal-close')?.addEventListener('click',closeModal);

    // Search
    document.getElementById('search-trigger')?.addEventListener('click',openSearch);
    var sov=document.getElementById('search-overlay');if(sov)sov.addEventListener('click',function(e){if(e.target===sov)closeSearch();});
    var sinp=document.getElementById('search-inp');if(sinp)sinp.addEventListener('input',function(){deb(function(){doSearch(sinp.value);},200,'srch');});

    // Header
    document.getElementById('theme-toggle')?.addEventListener('click',function(){setTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');});
    document.getElementById('notif-btn')?.addEventListener('click',function(){requestNotifPermission(function(ok){showToast(ok?'Notifications enabled!':'Enable notifications in browser settings',ok?'success':'warning');});});

    // Accent swatches
    document.querySelectorAll('#accent-swatches .swatch').forEach(function(sw){sw.addEventListener('click',function(){pickAccentColor(sw);});});

    // Calendar
    document.getElementById('cal-prev')?.addEventListener('click',function(){var d=S.cal.date;if(S.cal.view==='month')d.setMonth(d.getMonth()-1);else if(S.cal.view==='week')d.setDate(d.getDate()-7);else d.setDate(d.getDate()-1);renderCal();});
    document.getElementById('cal-next')?.addEventListener('click',function(){var d=S.cal.date;if(S.cal.view==='month')d.setMonth(d.getMonth()+1);else if(S.cal.view==='week')d.setDate(d.getDate()+7);else d.setDate(d.getDate()+1);renderCal();});
    document.getElementById('cal-today-btn')?.addEventListener('click',function(){S.cal.date=new Date();renderCal();});
    document.querySelectorAll('.cal-tab').forEach(function(tab){tab.addEventListener('click',function(){S.cal.view=tab.dataset.view;document.querySelectorAll('.cal-tab').forEach(function(t){t.classList.remove('active');});tab.classList.add('active');renderCal();});});
    document.getElementById('btn-add-cal')?.addEventListener('click',function(){openAddCalModal(todayStr());});
    document.getElementById('btn-add-exam')?.addEventListener('click',openAddExamModal);

    // Books
    document.getElementById('btn-add-book')?.addEventListener('click',openAddBookModal);
    document.getElementById('btn-back-books')?.addEventListener('click',closeBookDetail);
    document.getElementById('btn-add-chapter')?.addEventListener('click',function(){if(S.books.bookId)openAddChapModal(S.books.bookId);});
    document.getElementById('books-sort')?.addEventListener('change',function(){renderBooksGrid();});

    // Notes
    document.getElementById('btn-new-note')?.addEventListener('click',createNewNote);
    var nsrch=document.getElementById('note-search');if(nsrch)nsrch.addEventListener('input',function(){deb(function(){filterNoteTree(nsrch.value);},200,'nsrch');});
    var tagInp=document.getElementById('tag-inp');if(tagInp)tagInp.addEventListener('keydown',function(e){if(e.key==='Enter'&&tagInp.value.trim()){addTag(tagInp.value.trim());tagInp.value='';}});
    document.getElementById('note-title-inp')?.addEventListener('input',function(){deb(autoSaveNote,500,'nauto');});
    document.getElementById('math-inp')?.addEventListener('input',function(e){previewMath(e.target.value);});

    // Pomodoro
    document.getElementById('btn-pomo-start')?.addEventListener('click',function(){S.pomo.running?pausePomo():startPomo();});
    document.getElementById('btn-pomo-reset')?.addEventListener('click',resetPomo);
    document.getElementById('btn-pomo-skip')?.addEventListener('click',skipPomoPhase);
    document.querySelectorAll('.pomo-tab').forEach(function(tab){tab.addEventListener('click',function(){setPomoMode(tab.dataset.mode);});});
    ['cs-focus','cs-short','cs-long'].forEach(function(id){var el=document.getElementById(id);if(!el)return;el.addEventListener('input',function(){var vid=id+'-v';setText(vid,el.value);if(S.pomo.mode==='custom')setPomoMode('custom');});});

    // SRS
    document.getElementById('btn-start-srs')?.addEventListener('click',startSRSSession);

    // Flashcards
    document.getElementById('btn-new-deck')?.addEventListener('click',openNewDeckModal);
    document.getElementById('btn-add-card')?.addEventListener('click',openAddCardModal);
    document.getElementById('btn-start-fc')?.addEventListener('click',startFCReview);
    document.getElementById('btn-bulk-import')?.addEventListener('click',doBulkImport);
    document.getElementById('btn-exit-review')?.addEventListener('click',exitFCReview);
    document.getElementById('btn-show-ans')?.addEventListener('click',showFCAnswer);
    document.querySelectorAll('.rating-btn').forEach(function(btn){btn.addEventListener('click',function(){submitFCRating(+btn.dataset.r);});});

    // Routine
    document.getElementById('btn-add-routine')?.addEventListener('click',function(){openAddRoutineModal('Mon');});

    // Mind Map
    document.getElementById('btn-mm-new')?.addEventListener('click',createNewMap);
    document.getElementById('btn-mm-save')?.addEventListener('click',saveCurrentMap);
    document.getElementById('btn-mm-export')?.addEventListener('click',exportMapPNG);
    document.getElementById('btn-mm-add-node')?.addEventListener('click',addCenterNode);
    document.getElementById('btn-ai-desc')?.addEventListener('click',aiDescribeNode);

    // Prayer
    document.getElementById('btn-detect-loc')?.addEventListener('click',detectLocation);
    document.getElementById('btn-calc-prayer')?.addEventListener('click',calcPrayerTimes);

    // Analytics
    document.getElementById('btn-edit-goals')?.addEventListener('click',openGoalsModal);

    // Settings
    document.getElementById('btn-change-avatar')?.addEventListener('click',openAvatarPicker);
    document.getElementById('btn-add-alarm')?.addEventListener('click',openAddAlarmModal);
    document.getElementById('set-exam-name')?.addEventListener('change',saveExamSettings);
    document.getElementById('set-exam-date')?.addEventListener('change',saveExamSettings);
    ['profile-name','profile-type','profile-institution','profile-bio'].forEach(function(id){document.getElementById(id)?.addEventListener('change',saveProfile);});
    var importInp=document.getElementById('import-file-inp');if(importInp)importInp.addEventListener('change',function(e){if(e.target.files[0])importData(e.target.files[0]);});
    document.getElementById('btn-export-data')?.addEventListener('click',exportAllData);
    document.getElementById('btn-import-data')?.addEventListener('click',function(){document.getElementById('import-file-inp')?.click();});
    document.getElementById('btn-export-notes-pdf')?.addEventListener('click',exportAllNotesPDF);
    document.getElementById('btn-clear-all')?.addEventListener('click',clearAllData);

    // Alarm modal
    document.getElementById('btn-alarm-snooze')?.addEventListener('click',snoozeAlarm);
    document.getElementById('btn-alarm-stop')?.addEventListener('click',stopAlarm);
    document.getElementById('wu-srs')?.addEventListener('click',function(){completeWakeupTask('srs');});
    document.getElementById('wu-pomo')?.addEventListener('click',function(){completeWakeupTask('pomo');});
    document.getElementById('wu-note')?.addEventListener('click',function(){completeWakeupTask('note');});

    // Onboarding
    document.getElementById('ob-next')?.addEventListener('click',nextOb);
    document.getElementById('ob-prev')?.addEventListener('click',prevOb);

    // Restore Pomodoro state after rotation / app resume
    (function restorePomoOnLoad(){
      try{
        var saved=localStorage.getItem('vk_pomo_persist');
        if(!saved)return;
        var st=JSON.parse(saved);
        if(!st.running||!st.ts)return;
        var elapsed=Date.now()-st.ts;
        var rem=st.dur-elapsed;
        S.pomo.ts=st.ts;S.pomo.dur=st.dur||25*60000;
        S.pomo.sb=st.sb||5*60000;S.pomo.lb=st.lb||15*60000;
        S.pomo.phase=st.phase||'focus';S.pomo.sessCount=st.sessCount||0;
        S.pomo.mode=st.mode||'pomodoro';
        if(rem<=0){setTimeout(onPomoEnd,100);}
        else{S.pomo.running=true;schedPomoFrame();}
      }catch(e){}
    })();

    // Start
    checkOnboarding();
    showPage('dashboard');

  }catch(e){
    console.error('VENOLK1 INIT ERROR',e);
    document.body.innerHTML+='<div style="position:fixed;top:0;left:0;right:0;background:#ff6b9d;color:#fff;padding:14px;z-index:9999;font-family:monospace;font-size:0.85rem">Init Error: '+e.message+'<br>Line: check console</div>';
  }
});



/* ============================================================
   ADD MANAGER — all forms live here
============================================================ */
function renderAddMgr(){
  try{
    amgrSwitch(window._amgrLastTab||'book');
    amgrRefreshAll();
  }catch(e){console.warn('renderAddMgr',e);}
}

function amgrRefreshAll(){
  amgrRefreshSubjectSelects();
  amgrRefreshDeckSelect();
  amgrRenderAlarmsList();
  amgrRenderDecksList();
  amgrRenderSubjectsList();
  amgrRenderStorageInfo();
  var evDate=document.getElementById('am-ev-date');
  if(evDate&&!evDate.value)evDate.value=todayStr();
  var days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var taskDay=document.getElementById('am-task-day');
  if(taskDay&&!taskDay.value)taskDay.value=days[new Date().getDay()];
}

function amgrSwitch(sec){
  window._amgrLastTab=sec;
  document.querySelectorAll('.amgr-tab').forEach(function(t){
    t.classList.toggle('active',t.dataset.sec===sec);
  });
  ['book','alarm','event','task','deck','card','subject','map','data'].forEach(function(s){
    var el=document.getElementById('amgr-'+s);
    if(el)el.style.display=(s===sec)?'block':'none';
  });
  if(sec==='alarm')amgrRenderAlarmsList();
  if(sec==='deck')amgrRenderDecksList();
  if(sec==='subject'){amgrRenderSubjectsList();amgrRefreshSubjectSelects();}
  if(sec==='card'){amgrRefreshDeckSelect();amgrRefreshSubjectSelects();}
  if(sec==='event'||sec==='task')amgrRefreshSubjectSelects();
  if(sec==='data')amgrRenderStorageInfo();
  if(sec==='map')amgrRenderMapsList();
}

function amgrRefreshSubjectSelects(){
  var subjs=ld('vk_subjects',[]);
  var opts='<option value="">None</option>'+subjs.map(function(s){return'<option value="'+s.name+'">'+s.name+'</option>';}).join('');
  ['am-book-subj','am-ev-subj','am-task-subj','am-deck-subj'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.innerHTML=opts;
  });
}

function amgrRefreshDeckSelect(){
  var decks=ld('vk_decks',[]);
  var el=document.getElementById('am-card-deck');
  if(!el)return;
  el.innerHTML='<option value="">Select deck...</option>'+decks.map(function(d){return'<option value="'+d.id+'">'+d.name+'</option>';}).join('');
}

function amgrSaveBook(){
  var titleEl=document.getElementById('am-book-title');
  var title=(titleEl?.value||'').trim();
  if(!title){showToast('Enter a book title','warning');titleEl&&titleEl.focus();return;}
  var subjSel=(document.getElementById('am-book-subj')?.value||'').trim();
  var subjNew=(document.getElementById('am-book-newsubj')?.value||'').trim();
  var subj=subjNew||subjSel;
  if(subjNew){
    var subs=ld('vk_subjects',[]);
    if(!subs.find(function(s){return s.name===subjNew;})){subs.push({id:genId(),name:subjNew});sd('vk_subjects',subs);}
  }
  var totalC=+(document.getElementById('am-book-chaps')?.value||10);
  if(isNaN(totalC)||totalC<1)totalC=10;
  if(totalC>200)totalC=200;
  var priority=document.getElementById('am-book-priority')?.value||'Medium';
  var startDate=document.getElementById('am-book-start')?.value||'';
  var targetDate=document.getElementById('am-book-target')?.value||'';
  var colorEl=document.querySelector('#am-book-colors .amgr-color.active');
  var color=colorEl?colorEl.dataset.color:'#7c6fff';
  var author=(document.getElementById('am-book-author')?.value||'').trim();
  var bookId=genId();
  var books=ld('vk_books',[]);
  books.push({id:bookId,title:title,author:author,subj:subj,subject:subj,totalChaps:totalC,startDate:startDate,targetDate:targetDate,priority:priority,color:color,created:new Date().toISOString(),progress:0});
  sd('vk_books',books);
  var chaps=ld('vk_chapters',[]);
  for(var i=1;i<=totalC;i++)chaps.push({id:genId(),bookId:bookId,name:'Chapter '+i,progress:0,order:i,stages:{},difficulty:0,created:new Date().toISOString()});
  sd('vk_chapters',chaps);
  awardXP(5,'Book');
  titleEl.value='';
  if(document.getElementById('am-book-author'))document.getElementById('am-book-author').value='';
  if(document.getElementById('am-book-newsubj'))document.getElementById('am-book-newsubj').value='';
  if(document.getElementById('am-book-chaps'))document.getElementById('am-book-chaps').value='10';
  if(document.getElementById('am-book-start'))document.getElementById('am-book-start').value='';
  if(document.getElementById('am-book-target'))document.getElementById('am-book-target').value='';
  amgrRenderStorageInfo();
  showToast('"'+title+'" added with '+totalC+' chapters! 📚','success');
}

function amgrSaveAlarm(){
  var title=(document.getElementById('am-alarm-title')?.value||'').trim()||'Alarm';
  var time=document.getElementById('am-alarm-time')?.value||'08:00';
  var repeat=document.getElementById('am-alarm-repeat')?.value||'daily';
  var type=document.getElementById('am-alarm-type')?.value||'study';
  var snooze=+(document.getElementById('am-alarm-snooze')?.value||10);
  var alarms=ld('vk_alarms',[]);
  alarms.push({id:genId(),title:title,time:time,repeat:repeat,type:type,snooze:snooze,enabled:true,nextTrigger:computeNextTrigger(time)});
  sd('vk_alarms',alarms);
  if(document.getElementById('am-alarm-title'))document.getElementById('am-alarm-title').value='';
  amgrRenderAlarmsList();
  showToast('Alarm "'+title+'" set for '+time+' ⏰','success');
}

function amgrRenderAlarmsList(){
  var el=document.getElementById('am-alarms-list');if(!el)return;
  var alarms=ld('vk_alarms',[]);
  if(!alarms.length){el.innerHTML='<div class="empty-panel" style="padding:14px">No alarms yet</div>';return;}
  el.innerHTML=alarms.map(function(a){
    var id=a.id;
    return'<div class="am-list-item">'
      +'<div class="am-list-info"><div class="am-list-title">'+a.title+'</div>'
      +'<div class="am-list-sub">'+a.time+' &middot; '+(a.repeat||'once')+' &middot; '+(a.type||'study')+'</div></div>'
      +'<label class="sw" style="margin-right:8px"><input type="checkbox" '+(a.enabled?'checked ':'')+' onchange="toggleAlarm(this.dataset.id,this.checked)" data-id="'+id+'"><span class="sw-slider"></span></label>'
      +'<button class="am-list-del" data-id="'+id+'" onclick="amgrDeleteAlarm(this.dataset.id)"><i class="fa fa-trash"></i></button></div>';
  }).join('');
}

function amgrDeleteAlarm(id){
  sd('vk_alarms',ld('vk_alarms',[]).filter(function(a){return a.id!==id;}));
  amgrRenderAlarmsList();showToast('Alarm deleted','info');
}

function amgrSaveEvent(){
  var topicEl=document.getElementById('am-ev-topic');
  var topic=(topicEl?.value||'').trim();
  if(!topic){showToast('Enter an event topic','warning');topicEl&&topicEl.focus();return;}
  var date=document.getElementById('am-ev-date')?.value;
  if(!date){showToast('Pick a date','warning');return;}
  var time=document.getElementById('am-ev-time')?.value||'09:00';
  var subj=document.getElementById('am-ev-subj')?.value||'';
  var isExam=document.querySelector('input[name="ev-type"]:checked')?.value==='exam';
  var events=ld('vk_calendar',[]);
  var colors=['#7c6fff','#00e5ff','#ff6b9d','#43e97b','#ffa94d'];
  events.push({id:genId(),subj:subj,topic:topic,dt:date+'T'+time+':00',endTime:'',notes:'',color:isExam?'#ff6b9d':colors[events.length%colors.length],isExam:isExam,created:new Date().toISOString()});
  sd('vk_calendar',events);
  topicEl.value='';
  showToast((isExam?'Exam':'Event')+' "'+topic+'" saved! 📅','success');
}

function amgrSaveTask(){
  var nameEl=document.getElementById('am-task-name');
  var name=(nameEl?.value||'').trim();
  if(!name){showToast('Enter a task name','warning');nameEl&&nameEl.focus();return;}
  var day=document.getElementById('am-task-day')?.value||'Mon';
  var time=document.getElementById('am-task-time')?.value||'08:00';
  var dur=+(document.getElementById('am-task-dur')?.value||60);
  var subj=document.getElementById('am-task-subj')?.value||'';
  var r=ld('vk_routine',{items:[],lastReset:todayStr()});
  var colors=['#7c6fff','#00e5ff','#ff6b9d','#43e97b','#ffa94d','#f72585'];
  r.items.push({id:genId(),task:name,subj:subj,day:day,timeSlot:time,dur:isNaN(dur)?60:dur,color:colors[r.items.length%colors.length],done:false,created:new Date().toISOString()});
  sd('vk_routine',r);
  nameEl.value='';
  showToast('"'+name+'" added to '+day+' 📋','success');
}

function amgrSaveDeck(){
  var nameEl=document.getElementById('am-deck-name');
  var name=(nameEl?.value||'').trim();
  if(!name){showToast('Enter a deck name','warning');nameEl&&nameEl.focus();return;}
  var subj=document.getElementById('am-deck-subj')?.value||'';
  var decks=ld('vk_decks',[]);
  decks.push({id:genId(),name:name,subj:subj,created:new Date().toISOString()});
  sd('vk_decks',decks);
  nameEl.value='';
  amgrRenderDecksList();
  amgrRefreshDeckSelect();
  showToast('Deck "'+name+'" created! 🃏','success');
}

function amgrRenderDecksList(){
  var el=document.getElementById('am-decks-list');if(!el)return;
  var decks=ld('vk_decks',[]),allCards=ld('vk_flashcards',[]);
  if(!decks.length){el.innerHTML='<div class="empty-panel" style="padding:14px">No decks yet</div>';return;}
  el.innerHTML=decks.map(function(d){
    var count=allCards.filter(function(c){return c.deckId===d.id;}).length;
    return'<div class="am-list-item">'
      +'<div class="am-list-info"><div class="am-list-title">'+d.name+'</div>'
      +'<div class="am-list-sub">'+(d.subj||'General')+' &middot; '+count+' cards</div></div>'
      +'<button class="am-list-del" data-id="'+d.id+'" onclick="amgrDeleteDeck(this.dataset.id)"><i class="fa fa-trash"></i></button></div>';
  }).join('');
}

function amgrDeleteDeck(id){
  if(!confirm('Delete this deck and all its cards?'))return;
  sd('vk_decks',ld('vk_decks',[]).filter(function(d){return d.id!==id;}));
  sd('vk_flashcards',ld('vk_flashcards',[]).filter(function(c){return c.deckId!==id;}));
  amgrRenderDecksList();amgrRefreshDeckSelect();showToast('Deck deleted','info');
}

function amgrSaveCard(){
  var deckId=document.getElementById('am-card-deck')?.value;
  if(!deckId){showToast('Select a deck first','warning');return;}
  var frontEl=document.getElementById('am-card-front');
  var front=(frontEl?.value||'').trim();
  if(!front){showToast('Enter the front (question)','warning');frontEl&&frontEl.focus();return;}
  var backEl=document.getElementById('am-card-back');
  var back=(backEl?.value||'').trim();
  if(!back){showToast('Enter the back (answer)','warning');backEl&&backEl.focus();return;}
  var cards=ld('vk_flashcards',[]);
  cards.push({id:genId(),deckId:deckId,front:front,back:back,type:'basic',tags:[],interval:0,easeFactor:2.5,dueDate:todayStr(),repetitions:0,totalReviews:0,againCount:0,created:new Date().toISOString(),lastReviewed:null});
  sd('vk_flashcards',cards);
  frontEl.value='';backEl.value='';
  var deck=ld('vk_decks',[]).find(function(d){return d.id===deckId;});
  showToast('Card added to "'+(deck?deck.name:'deck')+'" 🎴','success');
}

function amgrSaveSubject(){
  var nameEl=document.getElementById('am-subj-name');
  var name=(nameEl?.value||'').trim();
  if(!name){showToast('Enter a subject name','warning');nameEl&&nameEl.focus();return;}
  var subjs=ld('vk_subjects',[]);
  if(subjs.find(function(s){return s.name.toLowerCase()===name.toLowerCase();})){showToast('"'+name+'" already exists','warning');return;}
  subjs.push({id:genId(),name:name,created:new Date().toISOString()});
  sd('vk_subjects',subjs);
  nameEl.value='';
  amgrRenderSubjectsList();amgrRefreshSubjectSelects();
  showToast('Subject "'+name+'" added! 🏷️','success');
}

function amgrRenderSubjectsList(){
  var el=document.getElementById('am-subj-list');if(!el)return;
  var subjs=ld('vk_subjects',[]),books=ld('vk_books',[]);
  if(!subjs.length){el.innerHTML='<div class="empty-panel" style="padding:14px">No subjects yet</div>';return;}
  el.innerHTML=subjs.map(function(s){
    var bc=books.filter(function(b){return b.subj===s.name||b.subject===s.name;}).length;
    return'<div class="am-list-item">'
      +'<div class="am-list-info"><div class="am-list-title">'+s.name+'</div>'
      +'<div class="am-list-sub">'+bc+' book'+(bc!==1?'s':'')+'</div></div>'
      +'<button class="am-list-del" data-id="'+s.id+'" onclick="amgrDeleteSubject(this.dataset.id)"><i class="fa fa-trash"></i></button></div>';
  }).join('');
}

function amgrDeleteSubject(id){
  sd('vk_subjects',ld('vk_subjects',[]).filter(function(s){return s.id!==id;}));
  amgrRenderSubjectsList();amgrRefreshSubjectSelects();showToast('Subject deleted','info');
}

function amgrExportData(){
  try{
    var data={};
    Object.keys(localStorage).filter(function(k){return k.startsWith('vk_');}).forEach(function(k){try{data[k]=JSON.parse(localStorage.getItem(k));}catch(e){}});
    var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    var url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='venolk1_backup_'+todayStr()+'.json';a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported! 💾','success');
  }catch(e){showToast('Export failed: '+e.message,'error');}
}

function amgrImportData(e){
  var file=e.target.files[0];if(!file)return;
  var reader=new FileReader();
  reader.onload=function(ev){
    try{
      var data=JSON.parse(ev.target.result),count=0;
      Object.keys(data).forEach(function(k){sd(k,data[k]);count++;});
      showToast('Restored '+count+' records! Reloading…','success');
      setTimeout(function(){location.reload();},1500);
    }catch(err){showToast('Import failed — invalid file','error');}
  };
  reader.readAsText(file);
  e.target.value='';
}

function amgrClearData(){
  if(!confirm('DELETE ALL DATA?\n\nThis permanently erases ALL books, chapters, notes, sessions, flashcards, alarms, and settings.\n\nThis CANNOT be undone!'))return;
  if(!confirm('Are you sure? Press OK to delete everything.'))return;
  Object.keys(localStorage).filter(function(k){return k.startsWith('vk_');}).forEach(function(k){localStorage.removeItem(k);});
  showToast('All data cleared. Reloading…','info');
  setTimeout(function(){location.reload();},1200);
}

function amgrRenderStorageInfo(){
  var el=document.getElementById('am-storage-info');if(!el)return;
  var items=[
    {label:'Books',key:'vk_books'},{label:'Chapters',key:'vk_chapters'},
    {label:'Notes',key:'vk_notes'},{label:'Sessions',key:'vk_sessions'},
    {label:'Decks',key:'vk_decks'},{label:'Flashcards',key:'vk_flashcards'},
    {label:'Alarms',key:'vk_alarms'},{label:'Calendar Events',key:'vk_calendar'},
    {label:'Routine Tasks',key:'vk_routine'},{label:'SRS Records',key:'vk_srs_chapters'},
  ];
  var totalKB=0;
  el.innerHTML=items.map(function(item){
    var raw=localStorage.getItem(item.key)||'[]';
    var arr;try{arr=JSON.parse(raw);}catch(ex){arr=[];}
    var count=Array.isArray(arr)?arr.length:(arr&&arr.items?arr.items.length:0);
    var kb=(raw.length/1024).toFixed(1);totalKB+=raw.length/1024;
    return'<div class="am-storage-row"><span>'+item.label+'</span><span>'+count+' items · '+kb+' KB</span></div>';
  }).join('')+'<div class="am-storage-row" style="border-top:2px solid var(--border);margin-top:4px;padding-top:8px"><span><strong>Total Used</strong></span><span><strong>'+totalKB.toFixed(1)+' KB</strong></span></div>';
}

/* color chip click handler */
document.addEventListener('click',function(e){
  if(e.target.classList.contains('amgr-color')){
    var parent=e.target.parentElement;
    if(parent)parent.querySelectorAll('.amgr-color').forEach(function(c){c.classList.remove('active');});
    e.target.classList.add('active');
  }
});

window.onerror=function(msg,src,line,col,err){
  console.error('VENOLK1 ERR:',msg,'line:',line);
  try{showToast('JS Error: '+msg,'error');}catch(e){}
  return true;
};
window.addEventListener('unhandledrejection',function(e){
  console.error('VENOLK1 async err:',e.reason);
  e.preventDefault();
});

function amgrCreateMap(){
  var name=(document.getElementById('am-map-name')?document.getElementById('am-map-name').value:'').trim();
  if(!name){showToast('Enter a map name','warning');return;}
  var maps=ld('vk_mindmaps',[]);
  maps.push({id:genId(),name:name,nodes:[],edges:[],created:new Date().toISOString()});
  sd('vk_mindmaps',maps);
  document.getElementById('am-map-name').value='';
  amgrRenderMapsList();
  showToast('Mind Map "'+name+'" created!','success');
}

function amgrRenderMapsList(){
  var el=document.getElementById('am-maps-list');if(!el)return;
  var maps=ld('vk_mindmaps',[]);
  if(!maps.length){el.innerHTML='<div class="empty-panel" style="padding:14px">No maps yet</div>';return;}
  el.innerHTML=maps.map(function(m){
    var nodeCount=m.nodes?m.nodes.length:0;
    return '<div class="am-list-item"><div class="am-list-info"><div class="am-list-title">'+m.name+'</div>'
      +'<div class="am-list-sub">'+nodeCount+' nodes</div></div>'
      +'<button onclick="S.mm.mapId=\''+m.id+'\';showPage(\'mindmap\')" style="background:var(--glass);border:1px solid var(--border);color:var(--txt);border-radius:8px;padding:5px 10px;cursor:pointer;font-size:0.75rem;margin-right:6px">Open</button>'
      +'<button class="am-list-del" onclick="amgrDeleteMap(\''+m.id+'\')"><i class="fa fa-trash"></i></button></div>';
  }).join('');
}

function amgrDeleteMap(id){
  if(!confirm('Delete this mind map?'))return;
  sd('vk_mindmaps',ld('vk_mindmaps',[]).filter(function(m){return m.id!==id;}));
  amgrRenderMapsList();showToast('Map deleted','info');
}

