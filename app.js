"use strict";
const STORAGE_KEY="KANJI9_SAVE_V2", BACKUP_KEY="KANJI9_BACKUP", FACES={"normal": "assets/images/omochi-01-3b54909ac76c.png", "happy": "assets/images/omochi-02-262385e34177.png", "smile": "assets/images/omochi-03-1a5323ab4b4e.png", "sad": "assets/images/omochi-04-debbe8228792.png", "think": "assets/images/omochi-01-3b54909ac76c.png"}, MASCOT="assets/images/omochi-01-3b54909ac76c.png";
const CURRICULUM=[["山", "川", "空", "石", "田"], ["春", "夏", "秋", "冬", "雪"], ["東", "西", "南", "北", "前"], ["父", "母", "兄", "姉", "弟"], ["朝", "昼", "夜", "時", "分"], ["友", "話", "聞", "読", "書"], ["食", "飲", "米", "魚", "茶"], ["歩", "走", "止", "道", "近"], ["学", "校", "教", "室", "算"], ["春", "南", "母", "夜", "書"], ["数", "半", "足", "引", "同"], ["長", "短", "丸", "角", "線"], ["色", "明", "暗", "光", "白"], ["鳥", "鳴", "馬", "牛", "羽"], ["花", "葉", "草", "根", "実"], ["町", "店", "駅", "公", "園"], ["仕", "事", "作", "働", "売"], ["楽", "元", "強", "弱", "心"], ["立", "座", "開", "閉", "待"], ["計", "短", "明", "鳥", "駅"]];
const READINGS={"山": "やま", "川": "かわ", "空": "そら", "石": "いし", "田": "た", "春": "はる", "夏": "なつ", "秋": "あき", "冬": "ふゆ", "雪": "ゆき", "東": "ひがし", "西": "にし", "南": "みなみ", "北": "きた", "前": "まえ", "父": "ちち", "母": "はは", "兄": "あに", "姉": "あね", "弟": "おとうと", "朝": "あさ", "昼": "ひる", "夜": "よる", "時": "とき", "分": "ふん", "友": "とも", "話": "はなす", "聞": "きく", "読": "よむ", "書": "かく", "食": "たべる", "飲": "のむ", "米": "こめ", "魚": "さかな", "茶": "ちゃ", "歩": "あるく", "走": "はしる", "止": "とまる", "道": "みち", "近": "ちかい", "学": "がく", "校": "こう", "教": "おしえる", "室": "しつ", "算": "さん", "数": "かず", "半": "はん", "足": "たす", "引": "ひく", "同": "おなじ", "長": "ながい", "短": "みじかい", "丸": "まる", "角": "かど", "線": "せん", "色": "いろ", "明": "あかるい", "暗": "くらい", "光": "ひかり", "白": "しろ", "鳥": "とり", "鳴": "なく", "馬": "うま", "牛": "うし", "羽": "はね", "花": "はな", "葉": "は", "草": "くさ", "根": "ね", "実": "み", "町": "まち", "店": "みせ", "駅": "えき", "公": "こう", "園": "えん", "仕": "し", "事": "ごと", "作": "つくる", "働": "はたらく", "売": "うる", "楽": "たのしい", "元": "げん", "強": "つよい", "弱": "よわい", "心": "こころ", "立": "たつ", "座": "すわる", "開": "あける", "閉": "しめる", "待": "まつ", "計": "けい"};
const AREA_BG={"forest": "assets/images/omochi-05-75614288795c.webp", "flower": "assets/images/omochi-06-6e1e1ce060c3.webp", "town": "assets/images/omochi-07-bad5b467551a.webp", "sea": "assets/images/omochi-08-89a3b9fdf6dc.webp", "snow": "assets/images/omochi-09-dac41058cf4b.webp", "castle": "assets/images/omochi-10-21d09e72ffae.webp"};
const $=id=>document.getElementById(id);
function defaults(){return{version:"2.0",profile:{name:""},progress:{currentDay:1,completedDays:[],totalStars:0,streak:0,lastStudyDate:""},statistics:{totalCorrect:0,totalWrong:0,sessions:[]},review:{queue:[],history:{},weakIds:[]},stickers:{owned:[]},
gacha:{tickets:0,owned:[],history:[]},
daily:{lastLogin:"",loginStreak:0,totalDays:0},
rewards:{catalog:[
{id:"r1",icon:"🍦",name:"アイス",cost:20},
{id:"r2",icon:"📺",name:"動画15分",cost:15},
{id:"r3",icon:"🥤",name:"コーラ",cost:25},
{id:"r4",icon:"🍩",name:"好きなおやつ",cost:20}
],earned:[]},
ui:{mood:"normal"},parent:{pinHash:"",pinEnabled:false},meta:{updatedAt:new Date().toISOString()}}}
function merge(a,b){if(!b||typeof b!=="object")return JSON.parse(JSON.stringify(a));const r=Array.isArray(a)?[]:{};Object.keys(a).forEach(k=>r[k]=a[k]&&typeof a[k]==="object"&&!Array.isArray(a[k])?merge(a[k],b[k]):(b[k]!==undefined?b[k]:a[k]));Object.keys(b).forEach(k=>{if(r[k]===undefined)r[k]=b[k]});return r}
function load(){try{return merge(defaults(),JSON.parse(localStorage.getItem(STORAGE_KEY)||"null"))}catch(e){return defaults()}} let data=load();
function save(){data.meta.updatedAt=new Date().toISOString();try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));renderAll()}catch(e){toast("保存できませんでした")}}
function show(id){document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id===id));scrollTo({top:0,behavior:"smooth"});if(id==="map")renderMap();if(id==="stickers")renderStickers();if(id==="gacha")renderGacha();if(id==="rewards")renderRewards();if(id==="parent")renderParent()}
function toast(t){const e=$("toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2000)}
function hash(pin){let h=2166136261;for(const c of "omochi|"+pin){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16)}
function generateQuestions(day){const arr=CURRICULUM[day-1]||CURRICULUM[0];const qs=[];for(let i=0;i<5;i++){const k=arr[i],r=READINGS[k]||k;let others=arr.filter(x=>x!==k).map(x=>READINGS[x]||x).slice(0,2);qs.push({id:`d${day}r${i}`,day,type:"読み",prompt:`「${k}」の読みを選ぼう`,main:k,choices:[r,...others],answer:0,explain:`${k}は「${r}」と読みます。`})}for(let i=0;i<5;i++){const k=arr[i],r=READINGS[k]||k;let others=arr.filter(x=>x!==k).slice(0,2);qs.push({id:`d${day}w${i}`,day,type:i===4?"まとめ":"書き",prompt:`「${r}」に合う漢字を選ぼう`,main:r,choices:[k,...others],answer:0,explain:`「${r}」は${k}と書きます。`})}return qs}
function getQ(id){for(let d=1;d<=20;d++){const q=generateQuestions(d).find(x=>x.id===id);if(q)return q}}
let session=null;
function startStudy(day,custom){day=Math.max(1,Math.min(20,day||1));let base=custom||generateQuestions(day);if(!custom){const due=(data.review.queue||[]).filter(x=>x.dueDay<=day).map(x=>getQ(x.id)).filter(Boolean).slice(0,3);base=base.concat(due)}session={day,questions:base,index:0,correct:0,wrong:[],combo:0,maxCombo:0,stars:0,answered:false};$("studyDay").textContent="Day "+day;show("study");renderQuestion()}
function renderQuestion(){if(session.index>=session.questions.length)return finishStudy();setMood("think");const q=session.questions[session.index];session.answered=false;$("studyBar").style.width=Math.round(session.index/session.questions.length*100)+"%";$("qtype").textContent=q.type;$("qprompt").textContent=q.prompt;$("qmain").textContent=q.main;$("feedback").className="feedback";$("nextBtn").classList.add("hidden");$("combo").textContent=session.combo>=2?"🔥 "+session.combo+"コンボ！":"";const box=$("choices");box.innerHTML="";q.choices.forEach((c,i)=>{const b=document.createElement("button");b.className="choice";b.textContent=c;b.onclick=()=>answer(i,b);box.appendChild(b)})}
function answer(i,b){if(session.answered)return;session.answered=true;const q=session.questions[session.index],ok=i===q.answer;[...$("choices").children].forEach((x,j)=>{x.disabled=true;if(j===q.answer)x.classList.add("ok")});if(!ok)b.classList.add("ng");const f=$("feedback");if(ok){setMood(session.combo>=4?"happy":"smile");session.correct++;session.combo++;session.maxCombo=Math.max(session.maxCombo,session.combo);session.stars++;f.className="feedback show ok";f.textContent="せいかい！ "+q.explain;if([5,10].includes(session.combo))burst(25)}else{setMood("sad");session.combo=0;session.wrong.push(q);f.className="feedback show ng";f.textContent="おしい！ "+q.explain}$("sessionStars").textContent=session.stars;$("combo").textContent=session.combo>=2?"🔥 "+session.combo+"コンボ！":"";$("nextBtn").classList.remove("hidden")}
function updateReview(){const q=(data.review.queue||[]).filter(x=>!session.questions.some(y=>y.id===x.id));session.questions.forEach(x=>{const wrong=session.wrong.some(w=>w.id===x.id),h=data.review.history[x.id]||{wrongCount:0,correctCount:0,level:0};if(wrong){h.wrongCount++;h.level=1;q.push({id:x.id,dueDay:Math.min(20,session.day+1),level:1})}else{h.correctCount++;if(h.wrongCount>0&&h.correctCount<h.wrongCount+3){h.level=Math.min(4,(h.level||1)+1);const gap=[0,1,3,5,7][h.level];q.push({id:x.id,dueDay:Math.min(20,session.day+gap),level:h.level})}}data.review.history[x.id]=h});data.review.queue=q;data.review.weakIds=Object.entries(data.review.history).map(([id,h])=>({id,score:h.wrongCount*2-h.correctCount})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,20).map(x=>x.id)}
function finishStudy(){updateReview();data.statistics.totalCorrect+=session.correct;data.statistics.totalWrong+=session.wrong.length;data.statistics.sessions.push({day:session.day,date:new Date().toISOString(),correct:session.correct,total:session.questions.length});data.progress.totalStars+=session.stars;data.gacha.tickets=(data.gacha.tickets||0)+1;setMood(session.correct===session.questions.length?"happy":"smile");if(!data.progress.completedDays.includes(session.day))data.progress.completedDays.push(session.day);data.progress.completedDays.sort((a,b)=>a-b);data.progress.currentDay=Math.min(20,Math.max(data.progress.currentDay,session.day+1));const today=new Date().toISOString().slice(0,10),y=new Date(Date.now()-86400000).toISOString().slice(0,10);if(data.progress.lastStudyDate!==today){data.progress.streak=data.progress.lastStudyDate===y?data.progress.streak+1:1;data.progress.lastStudyDate=today}save();renderResult();show("result");toast("🎫 ガチャ券を1枚もらったよ！");if([5,10,15,20].includes(session.day)&&!data.stickers.owned.includes("area"+session.day))setTimeout(()=>openTreasure(session.day),450)}
function renderResult(){const acc=Math.round(session.correct/session.questions.length*100);$("resultStars").textContent=acc===100?"⭐⭐⭐":acc>=80?"⭐⭐☆":acc>=60?"⭐☆☆":"☆☆☆";$("correctNum").textContent=session.correct;$("totalNum").textContent=session.questions.length;$("resultMsg").textContent=acc===100?"全問正解！すごい！":acc>=80?"とてもよくできました！":"まちがいは成長のたねだよ！";const box=$("wrongList");box.innerHTML=session.wrong.length?"":"<div class='notice'>全問正解です！</div>";session.wrong.forEach(q=>{const d=document.createElement("div");d.className="list-item";d.innerHTML=`<b>${q.main}</b><br><small>正解：${q.choices[q.answer]}</small>`;box.appendChild(d)});$("retryBtn").classList.toggle("hidden",!session.wrong.length)}
const areas=[{name:"はじめの森",key:"forest",start:1,end:5},{name:"花の丘",key:"flower",start:6,end:10},{name:"青空の町",key:"town",start:11,end:15},{name:"海辺の道",key:"sea",start:16,end:20}];
const coords=[[8,72],[25,60],[45,68],[65,49],[88,38]];
function renderMap(){const done=new Set(data.progress.completedDays),now=Math.min(20,data.progress.currentDay);$("mapProgress").textContent=done.size+" / 20日";$("mapPlace").textContent=(areas.find(a=>now>=a.start&&now<=a.end)||areas[3]).name;const box=$("mapContainer");box.innerHTML="";areas.forEach(a=>{const el=document.createElement("article");el.className="map-area";el.style.backgroundImage=`url("${AREA_BG[a.key]}")`;el.innerHTML=`<div class="map-label">${a.name}　Day${a.start}〜${a.end}</div><div class="map-route"></div>`;const route=el.querySelector(".map-route");const land=document.createElement("div");land.className="landmark chest";land.style.setProperty("--x","91%");land.style.setProperty("--y","68%");land.textContent="🎁";route.appendChild(land);for(let d=a.start;d<=a.end;d++){const n=document.createElement("div"),[x,y]=coords[d-a.start];n.className="node"+(done.has(d)?" done":d===now&&!done.has(d)?" now":" lock");n.style.setProperty("--x",x+"%");n.style.setProperty("--y",y+"%");let content=done.has(d)?"✓":d===now&&!done.has(d)?`<img src="${MASCOT}">`:"🔒";n.innerHTML=`<div class="step">${content}</div><small>Day ${d}</small>`;route.appendChild(n)}box.appendChild(el)})}
const catalog=[{id:"area5",icon:"🌳",name:"森の宝箱シール"},{id:"area10",icon:"🌸",name:"花の丘シール"},{id:"area15",icon:"🏘️",name:"青空の町シール"},{id:"area20",icon:"🌊",name:"海辺の宝箱シール"},{id:"bonus1",icon:"⭐",name:"がんばり星"},{id:"bonus2",icon:"📚",name:"読書のおもち先生"}];
function renderStickers(){const box=$("stickerGrid");box.innerHTML="";catalog.forEach(s=>{const got=data.stickers.owned.includes(s.id),d=document.createElement("div");d.className="sticker"+(got?" got":"");d.innerHTML=`<div class="big">${got?s.icon:"？"}</div><b>${got?s.name:"まだ見つけていないシール"}</b><small>${got?"獲得済み":"未獲得"}</small>`;box.appendChild(d)})}
function openTreasure(day){const s=catalog.find(x=>x.id==="area"+day);if(!s)return;data.stickers.owned.push(s.id);save();$("treasureText").textContent=`Day${day}をクリアして宝箱を開けたよ！`;$("treasureIcon").textContent=s.icon;$("treasureName").textContent=s.name;$("treasureModal").classList.add("show");burst(45)}

const GACHA_ITEMS=[
{id:"g1",icon:"🎩",name:"シルクハット",rarity:"N",weight:26},
{id:"g2",icon:"👓",name:"まるメガネ",rarity:"N",weight:25},
{id:"g3",icon:"🎀",name:"赤いリボン",rarity:"N",weight:22},
{id:"g4",icon:"🧢",name:"冒険キャップ",rarity:"R",weight:13},
{id:"g5",icon:"🦸",name:"ヒーローマント",rarity:"R",weight:8},
{id:"g6",icon:"👑",name:"きらきら王冠",rarity:"SR",weight:5},
{id:"g7",icon:"🌈",name:"虹のおもちオーラ",rarity:"SSR",weight:1}
];
function setMood(mood){
  data.ui=data.ui||{};data.ui.mood=mood;
  const img=$("homeMascot"),mark=$("homeMood");
  const marks={normal:"😊",think:"🤔",smile:"😄",happy:"🥳",sad:"💪"};
  if(img)img.src=FACES[mood]||FACES.normal;
  if(mark)mark.textContent=marks[mood]||"😊";
}
function weightedItem(){
  const total=GACHA_ITEMS.reduce((s,x)=>s+x.weight,0);let n=Math.random()*total;
  for(const x of GACHA_ITEMS){n-=x.weight;if(n<=0)return x}
  return GACHA_ITEMS[0];
}
function renderGacha(){
  $("gachaTickets").textContent=data.gacha.tickets||0;
  $("drawGacha").disabled=(data.gacha.tickets||0)<1;
  $("drawGacha").textContent=(data.gacha.tickets||0)<1?"ガチャ券がありません":"ガチャを回す（1枚）";
  const box=$("gachaCollection");box.innerHTML="";
  GACHA_ITEMS.forEach(x=>{
    const got=(data.gacha.owned||[]).includes(x.id),d=document.createElement("div");
    d.className="collect-item"+(got?" got":"");
    d.innerHTML=`<span class="emoji">${got?x.icon:"？"}</span><b>${got?x.name:"未発見"}</b><small>${got?x.rarity:""}</small>`;
    box.appendChild(d);
  });
}
function drawGacha(){
  if((data.gacha.tickets||0)<1)return toast("ガチャ券がありません");
  data.gacha.tickets--;const item=weightedItem(),isNew=!data.gacha.owned.includes(item.id);
  if(isNew)data.gacha.owned.push(item.id);
  data.gacha.history.push({id:item.id,date:new Date().toISOString(),isNew});
  save();$("gachaMachine").classList.add("spin");$("drawGacha").disabled=true;$("gachaTitle").textContent="ガラガラ…";
  setTimeout(()=>{
    $("gachaMachine").classList.remove("spin");$("gachaTitle").textContent="おもちガチャ";
    $("gachaRarity").className="rarity "+item.rarity;$("gachaRarity").textContent=item.rarity;
    $("gachaIcon").textContent=item.icon;$("gachaName").textContent=item.name;
    $("gachaResultText").textContent=isNew?"新しいアイテムです！":"持っているアイテムなので、⭐3個に交換しました。";
    if(!isNew)data.progress.totalStars+=3;
    $("gachaMascot").src=FACES.happy;save();$("gachaModal").classList.add("show");burst(item.rarity==="SSR"?70:item.rarity==="SR"?50:30);renderGacha();
  },1200);
}
function renderRewards(){
  const box=$("rewardWallet");box.innerHTML="";
  const earned=data.rewards.earned||[];
  if(!earned.length){box.innerHTML="<div class='notice'>獲得したごほうびはまだありません。</div>";return}
  earned.slice().reverse().forEach(e=>{
    const item=data.rewards.catalog.find(x=>x.id===e.rewardId);if(!item)return;
    const d=document.createElement("div");d.className="reward-row"+(e.used?" used":"");
    d.innerHTML=`<span class="reward-icon">${item.icon}</span><div><b>${item.name}</b><small>${e.used?"使用済み":"未使用"}</small></div><span>${e.used?"✓":"🎁"}</span>`;
    box.appendChild(d);
  });
}
function renderRewardManage(){
  const box=$("rewardManage");if(!box)return;box.innerHTML="";
  data.rewards.catalog.forEach(item=>{
    const d=document.createElement("div");d.className="list-item";
    d.innerHTML=`<div class="row"><b>${item.icon} ${item.name}</b><span>⭐${item.cost}</span></div><div class="row" style="margin-top:8px"><button class="mini-btn use">星と交換</button><button class="mini-btn delete">削除</button></div>`;
    d.querySelector(".use").onclick=()=>{
      if(data.progress.totalStars<item.cost)return toast("星が足りません");
      data.progress.totalStars-=item.cost;data.rewards.earned.push({id:"e"+Date.now(),rewardId:item.id,used:false,date:new Date().toISOString()});save();renderRewardManage();toast("ごほうびを獲得しました");
    };
    d.querySelector(".delete").onclick=()=>{if(confirm("このごほうびを削除しますか？")){data.rewards.catalog=data.rewards.catalog.filter(x=>x.id!==item.id);save();renderRewardManage()}};
    box.appendChild(d);
  });
  const unused=(data.rewards.earned||[]).filter(x=>!x.used);
  if(unused.length){
    const h=document.createElement("div");h.innerHTML="<br><b>獲得済みのごほうび</b>";box.appendChild(h);
    unused.forEach(e=>{const item=data.rewards.catalog.find(x=>x.id===e.rewardId);if(!item)return;const d=document.createElement("div");d.className="reward-row";d.innerHTML=`<span class="reward-icon">${item.icon}</span><b>${item.name}</b><button class="mini-btn use">使用済みにする</button>`;d.querySelector("button").onclick=()=>{e.used=true;save();renderRewardManage()};box.appendChild(d)});
  }
}
function dateKey(d=new Date()){return d.toISOString().slice(0,10)}
function handleDailyLogin(){
  const today=dateKey(),yesterday=dateKey(new Date(Date.now()-86400000));
  if(data.daily.lastLogin===today)return;
  data.daily.loginStreak=data.daily.lastLogin===yesterday?Math.min(7,(data.daily.loginStreak||0)+1):1;
  data.daily.totalDays=(data.daily.totalDays||0)+1;data.daily.lastLogin=today;
  const day=data.daily.loginStreak,rewardStars=day===7?10:day;
  data.progress.totalStars+=rewardStars;if(day===7)data.gacha.tickets+=1;
  save();
  const grid=$("dailyGrid");grid.innerHTML="";
  for(let i=1;i<=7;i++){const d=document.createElement("div");d.className="daily-day"+(i<day?" got":i===day?" today":"");d.innerHTML=`${i}日<br>${i===7?"🎫":"⭐"+i}`;grid.appendChild(d)}
  $("dailyText").textContent=day===7?"7日連続！星10個とガチャ券1枚を獲得！":`${day}日目のボーナス：星${rewardStars}個`;
  $("dailyReward").textContent=day===7?"⭐×10 ＋ 🎫":"⭐×"+rewardStars;$("dailyMascot").src=FACES.happy;
  $("dailyModal").classList.add("show");burst(40);
}

function renderParent(){renderRewardManage();$("pDay").textContent=data.progress.currentDay;$("pCorrect").textContent=data.statistics.totalCorrect;$("pWrong").textContent=data.statistics.totalWrong;const box=$("weakList");box.innerHTML="";const ids=data.review.weakIds||[];if(!ids.length)box.innerHTML="<div class='notice'>苦手な問題はまだありません。</div>";ids.slice(0,8).forEach(id=>{const q=getQ(id);if(!q)return;const d=document.createElement("div");d.className="list-item";d.innerHTML=`<b>${q.main}</b><br><small>正解：${q.choices[q.answer]}</small>`;box.appendChild(d)})}
function renderAll(){const done=data.progress.completedDays.length,pct=Math.round(done/60*100),total=data.statistics.totalCorrect+data.statistics.totalWrong;$("homeDay").textContent=data.progress.currentDay;$("homeBar").style.width=pct+"%";$("homePct").textContent=pct+"%";$("leftDays").textContent="あと"+(60-done)+"日";$("stars").textContent=data.progress.totalStars;$("streak").textContent=data.progress.streak+"日";$("accuracy").textContent=total?Math.round(data.statistics.totalCorrect/total*100)+"%":"--";$("nameInput").value=data.profile.name||"";$("greeting").textContent=(data.profile.name?data.profile.name+"さん、":"")+"今日もいっしょにがんばろう！";$("homeTickets").textContent=data.gacha.tickets||0;setMood((data.ui&&data.ui.mood)||"normal")}
function burst(n){const b=$("confetti");b.innerHTML="";for(let i=0;i<n;i++){const p=document.createElement("i");p.style.left=Math.random()*100+"%";p.style.animationDelay=Math.random()*.3+"s";p.style.background=["#ffd977","#77b99c","#efaaa9","#7bb6d9"][i%4];b.appendChild(p)}setTimeout(()=>b.innerHTML="",1700)}
let pinMode="unlock",pin="",first="",after=null;function openPin(mode,cb){pinMode=mode;pin="";first="";after=cb;$("pinTitle").textContent=mode==="setup"?"暗証番号を設定":mode==="change"?"現在の暗証番号":"保護者用暗証番号";$("pinDesc").textContent=mode==="setup"?"4桁を入力し、もう一度確認します。":"4桁を入力してください。";$("pinModal").classList.add("show");dots()}function dots(){document.querySelectorAll(".dot").forEach((d,i)=>d.classList.toggle("on",i<pin.length))}function processPin(){const p=pin;pin="";dots();if(pinMode==="setup"){first=p;pinMode="setup2";$("pinTitle").textContent="もう一度入力";return}if(pinMode==="setup2"){if(p!==first){pinMode="setup";$("pinError").textContent="一致しません。最初から入力してください。";return}data.parent.pinHash=hash(p);data.parent.pinEnabled=true;save();$("pinModal").classList.remove("show");show("parent");return}if(hash(p)!==data.parent.pinHash){$("pinError").textContent="暗証番号が違います";return}$("pinModal").classList.remove("show");if(pinMode==="change")setTimeout(()=>openPin("setup",()=>show("parent")),100);else show("parent")}
document.querySelectorAll("#keypad .key").forEach(b=>b.onclick=()=>{$("pinError").textContent="";if(b.dataset.n!==undefined&&pin.length<4)pin+=b.dataset.n;if(b.dataset.a==="back")pin=pin.slice(0,-1);if(b.dataset.a==="clear")pin="";dots();if(pin.length===4)setTimeout(processPin,100)});$("pinClose").onclick=()=> $("pinModal").classList.remove("show");
$("startBtn").onclick=()=>startStudy(data.progress.currentDay);$("nextBtn").onclick=()=>{session.index++;renderQuestion()};$("studyBack").onclick=()=>show("home");$("resultBack").onclick=$("resultHome").onclick=()=>show("home");$("retryBtn").onclick=()=>startStudy(session.day,session.wrong);

$("gachaBtn").onclick=()=>show("gacha");$("gachaBack").onclick=()=>show("home");$("drawGacha").onclick=drawGacha;
$("gachaClose").onclick=()=>{$("gachaModal").classList.remove("show");show("gacha")};
$("rewardBtn").onclick=()=>show("rewards");$("rewardBack").onclick=()=>show("home");
$("dailyClose").onclick=()=>{$("dailyModal").classList.remove("show");toast("ボーナスを受け取りました")};
$("addReward").onclick=()=>{const name=$("rewardNameInput").value.trim(),icon=$("rewardIconInput").value.trim()||"🎁";if(!name)return toast("ごほうび名を入力してください");data.rewards.catalog.push({id:"r"+Date.now(),icon,name,cost:20});$("rewardNameInput").value="";save();renderRewardManage()};

$("mapBtn").onclick=()=>show("map");$("mapBack").onclick=()=>show("home");$("stickerBtn").onclick=()=>show("stickers");$("stickerBack").onclick=()=>show("home");$("parentBtn").onclick=()=>data.parent.pinEnabled?openPin("unlock"):openPin("setup");$("parentBack").onclick=()=>show("home");$("changePin").onclick=()=>openPin("change");$("settingsBtn").onclick=$("settingsBtn2").onclick=()=>show("settings");$("settingsBack").onclick=()=>show("home");$("saveSettings").onclick=()=>{data.profile.name=$("nameInput").value.trim();save();toast("保存しました");show("home")};$("treasureClose").onclick=()=>{$("treasureModal").classList.remove("show");show("stickers")};$("resetBtn").onclick=()=>{if(confirm("すべての学習データを初期化しますか？")){localStorage.setItem(BACKUP_KEY,JSON.stringify(data));data=defaults();save();show("home")}};
renderAll();setTimeout(handleDailyLogin,450);

function renderDress(){const b=document.getElementById('dressList');if(!b)return;const o=(data.gacha&&data.gacha.owned)||[];b.innerHTML=o.length?o.map(x=>'<div class="list-item">'+x+'</div>').join(''):'<div class="notice">アイテムなし</div>';}
function renderDict(){const b=document.getElementById('dictList');if(!b)return;let s='';for(let d=1;d<=Math.min(20,data.progress.currentDay);d++){generateQuestions(d).slice(0,5).forEach(q=>s+='<div class="list-item"><b>'+q.main+'</b><br><small>'+q.prompt+'</small></div>')}b.innerHTML=s||'<div class="notice">まだありません</div>';}
document.getElementById('dressBtn').onclick=()=>{show('dress');renderDress();};
document.getElementById('dressBack').onclick=()=>show('home');
document.getElementById('dictBtn').onclick=()=>{show('dict');renderDict();};
document.getElementById('dictBack').onclick=()=>show('home');
