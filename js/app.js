
/* =========================================
   RICHSEA — Global Interactivity & Chatbot
   ========================================= */

/* ====== CONFIG ====== */
const RICHSEA_CONTRACT = "0xb93d116A1CB1AEE03A64053542Ec966368652873";

/* ====== Helpers ====== */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const el = (tag, cls) => { const n = document.createElement(tag); if(cls) n.className = cls; return n; };
const fmt = (n, d=2) => n==null ? "—" : Number(n).toLocaleString(undefined, {maximumFractionDigits:d});
async function fetchJson(url, timeout=10000){
  const ctrl = new AbortController();
  const id = setTimeout(()=>ctrl.abort(), timeout);
  try{
    const res = await fetch(url, { signal: ctrl.signal });
    if(!res.ok) throw new Error(res.statusText);
    return await res.json();
  } finally { clearTimeout(id); }
}

/* =========================================
   OCEAN: Bubbles on scroll + Turbulence Pulse
   ========================================= */
const ocean = $("#ocean");
let lastBubble = 0;

function spawnBubble(x, y){
  const b = el("span");
  b.style.position="fixed";
  b.style.left = (x|| (Math.random()*window.innerWidth)) + "px";
  b.style.top  = (y|| (window.innerHeight-20)) + "px";
  const size = 6 + Math.random()*10;
  b.style.width = b.style.height = size + "px";
  b.style.borderRadius="50%";
  b.style.background="rgba(186, 244, 255, .85)";
  b.style.boxShadow="0 0 8px rgba(186,244,255,.6)";
  b.style.pointerEvents="none";
  b.style.zIndex=1;
  b.style.animation = "bubbleUp 1.6s linear forwards";
  document.body.appendChild(b);
  setTimeout(()=>b.remove(), 1700);
}
// bubble keyframes (inject once)
(function ensureBubbleCSS(){
  if(document.getElementById("bubbleCSS")) return;
  const style = document.createElement("style");
  style.id="bubbleCSS";
  style.textContent = `
  @keyframes bubbleUp {
    from { transform: translateY(0); opacity:.95; }
    to   { transform: translateY(-160px); opacity:0; }
  }`;
  document.head.appendChild(style);
})();

function turbulencePulse(){
  if(!ocean) return;
  ocean.classList.add("pulse");
  clearTimeout(turbulencePulse._t);
  turbulencePulse._t = setTimeout(()=> ocean.classList.remove("pulse"), 420);
}

window.addEventListener("scroll", ()=>{
  const now = performance.now();
  if(now - lastBubble > 120){
    spawnBubble();
    lastBubble = now;
  }
  turbulencePulse();
});



/* =========================================
   TICKER + TOKEN WIDGET (CoinGecko)
   ========================================= */
async function loadTicker(){
  const ticker = $("#ticker");
  if(!ticker) return;
  try{
    const [rs, bnb] = await Promise.all([
      fetchJson(CG_RICHSEA).catch(()=>null),
      fetchJson(CG_BNB).catch(()=>null),
    ]);

    ticker.innerHTML = "";

    // RICHSEA
    if(rs && rs[RICHSEA_CONTRACT.toLowerCase()]){
      const t = rs[RICHSEA_CONTRACT.toLowerCase()];
      const price = t.usd, chg = t.usd_24h_change, mcap = t.usd_market_cap, vol = t.usd_24h_vol;
      ticker.append(
        tickerItem("$RICHSEA", price, chg),
        tickerItem("MCAP", mcap, null),
        tickerItem("VOL 24h", vol, null),
      );
      // Fill widget if present
      $("#rsPrice") && ($("#rsPrice").textContent = '$ ${fmt(price, 6)}');
      if($("#rsChange")){
        $("#rsChange").textContent = '${chg>=0?"+":""}${fmt(chg,2)}%';
        $("#rsChange").className = "stat-value " + (chg>=0 ? "t-up" : "t-down");
      }
      $("#rsMcap") && ($("#rsMcap").textContent = '$ ${fmt(mcap, 0)}');
      $("#rsVol")  && ($("#rsVol").textContent  = '$ ${fmt(vol, 0)}');
    } else {
      ticker.append(tickerItem("$RICHSEA", "N/A", null));
    }

    // BNB
    if(bnb && bnb.binancecoin){
      const p = bnb.binancecoin.usd;
      const c = bnb.binancecoin.usd_24h_change;
      ticker.append(tickerItem("BNB", null));
    }
  } catch(e){
    console.warn("Ticker failed:", e);
  } finally {
    // trailing spinner (hidden by default)
    const sp = el("div","spinner"); sp.style.display="none"; ticker.append(sp);
  }
}
function tickerItem(label, value, change){
  const item = el("div","ticker-item");
  const name = el("span"); name.textContent = label;
  const val = el("strong"); val.textContent = (typeof value === "number") ? '$${fmt(value)}' : value;
  item.append(name, val);
  if(typeof change === "number"){
    const ch = el("span");
    ch.textContent = '${change>=0?"+":""}${fmt(change,2)}%';
    ch.className = change>=0 ? "t-up" : "t-down";
    item.append(ch);
  }
  return item;
}
if($("#refreshPrices")){
  $("#refreshPrices").addEventListener("click", loadTicker);
}
if($("#contractCopy")){
  $("#contractCopy").addEventListener("click", async (e)=>{
    try{
      await navigator.clipboard.writeText(e.target.textContent.trim());
      e.target.classList.add("copied");
      e.target.title = "Copied!";
      setTimeout(()=>{ e.target.classList.remove("copied"); e.target.title="Click to copy" }, 1200);
    }catch{}
  });
}

/* =========================================
   NEWS Auto Slider (4 per row desktop, 2 per row mobile)
   ========================================= */
function autoSlideRail(trackSel, opts={}) {
  const track = $(trackSel);
  if(!track) return;
  const speed = opts.speed || 0.6; // px per frame
  let rafId, dir = 1;

  function step(){
    track.scrollLeft += speed * dir;
    // bounce at ends
    if(track.scrollLeft + track.clientWidth >= track.scrollWidth - 2) dir = -1;
    else if(track.scrollLeft <= 2) dir = 1;
    rafId = requestAnimationFrame(step);
  }

  // pause on hover / focus
  track.addEventListener("mouseenter", ()=> cancelAnimationFrame(rafId));
  track.addEventListener("mouseleave", ()=> { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(step); });

  // start
  rafId = requestAnimationFrame(step);
}
document.addEventListener("DOMContentLoaded", ()=>{
  autoSlideRail(".news-track", { speed: 0.9 });
  autoSlideRail(".videos-track", { speed: 0.8 });
});

/* =========================================
   VIDEOS — Basic YouTube embed enhancer (optional)
   ========================================= */
function enhanceVideoCards(){
  $$(".video-card[data-yt]").forEach(card=>{
    const id = card.getAttribute("data-yt");
    card.innerHTML = `
      <div class="yt-wrap" style="position:relative;padding-top:56.25%;border-radius:12px;overflow:hidden">
        <iframe loading="lazy" src="https://www.youtube.com/embed/${id}" title="RichSea Video"
          style="position:absolute;inset:0;width:100%;height:100%;border:0" allowfullscreen></iframe>
      </div>
      <div class="small muted" style="margin-top:.4rem">${card.getAttribute("data-title")||""}</div>
    `;
  });
}
document.addEventListener("DOMContentLoaded", enhanceVideoCards);

/* =========================================
   TOKENOMICS — 3D-ish glowing pie (Canvas)
   ========================================= */
function drawTokenPie(){
  const canvas = $("#tokenPie");
  const wrap = $("#tokenPieWrap");
  if(!canvas || !wrap) return;

  const ctx = canvas.getContext("2d");
  const DPR = window.devicePixelRatio || 1;
  const W = Math.min(760, wrap.clientWidth - 20);
  const H = Math.round(W * 0.6);
  canvas.width = W * DPR; canvas.height = H * DPR;
  canvas.style.width = W+"px"; canvas.style.height = H+"px";
  ctx.scale(DPR, DPR);

  // example segments (must match your HTML legend & percentages)
  const segments = [
    { label:"Liquidity Pool", pct:40, color:"#00ccff" },
    { label:"Farming Rewards", pct:30, color:"#6af3ff" },
    { label:"Treasury & Growth", pct:20, color:"#7efff5" },
    { label:"Team (Vested)", pct:10, color:"#9ad5ff" },
  ];

  const cx = W/2, cy = H*0.55, r = Math.min(W, H*1.5)/3.3;
  const depth = 18; // “3D” thickness
  const startAngle = -Math.PI/2;

  // draw depth (darkened)
  segments.reduce((ang, s)=>{
    const a0 = ang;
    const a1 = ang + (Math.PI*2) * (s.pct/100);
    // side wall
    ctx.beginPath();
    ctx.moveTo(cx + r*Math.cos(a0), cy + r*Math.sin(a0));
    ctx.arc(cx, cy, r, a0, a1);
    ctx.lineTo(cx + r*Math.cos(a1), cy + depth + r*Math.sin(a1));
    ctx.arc(cx, cy+depth, r, a1, a0, true);
    ctx.closePath();
    ctx.fillStyle = shade(s.color, -25);
    ctx.fill();
    return a1;
  }, startAngle);

  // top surface
  ctx.save();
  ctx.shadowColor = "rgba(0,204,255,.35)";
  ctx.shadowBlur = 28;
  segments.reduce((ang, s)=>{
    const a0 = ang;
    const a1 = ang + (Math.PI*2) * (s.pct/100);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a0, a1);
    ctx.closePath();
    const grad = ctx.createRadialGradient(cx-r*0.2, cy-r*0.2, r*0.1, cx, cy, r);
    grad.addColorStop(0, s.color);
    grad.addColorStop(1, shade(s.color, -10));
    ctx.fillStyle = grad;
    ctx.fill();
    return a1;
  }, startAngle);
  ctx.restore();

  // hover tooltip
  const tip = $("#pieTip") || (function(){
    const t = el("div","pie-tip"); t.id="pieTip"; wrap.appendChild(t); return t;
  })();

  canvas.onmousemove = (e)=>{
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    const px = x - cx, py = y - cy;
    const dist = Math.hypot(px, py);
    const ang = Math.atan2(py, px);
    let theta = ang;
    if(theta < startAngle) theta += Math.PI*2;
    if(dist <= r && dist >= 0){
      let acc = startAngle;
      for(const s of segments){
        const a1 = acc + (Math.PI*2)*(s.pct/100);
        if(theta >= acc && theta <= a1){
          tip.style.display="block";
          tip.style.left = e.clientX + "px";
          tip.style.top  = e.clientY + "px";
          tip.textContent = '${s.label} — ${s.pct}%';
          return;
        }
        acc = a1;
      }
    }
    tip.style.display="none";
  };
}
function shade(hex, amt){
  // simple hex shade
  let c = hex.replace('#','');
  if(c.length===3) c = c.split('').map(x=>x+x).join('');
  const num = parseInt(c, 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0x00FF) + amt;
  let b = (num & 0x0000FF) + amt;
  r = Math.max(Math.min(255,r),0); g = Math.max(Math.min(255,g),0); b = Math.max(Math.min(255,b),0);
  return "#" + (b | (g << 8) | (r << 16)).toString(16).padStart(6,'0');
}
window.addEventListener("resize", drawTokenPie);

/* ============ Mobile Nav ============ */
(function(){
  const toggle = document.querySelector('.nav-toggle');
  const list = document.querySelector('.nav-list');
  if(toggle && list){
    toggle.addEventListener('click', ()=> list.classList.toggle('open'));
    document.addEventListener('click', (e)=>{
      if(!list.contains(e.target) && e.target!==toggle) list.classList.remove('open');
    });
  }
})();
// ...existing code...

// Chatbot launcher logic
document.addEventListener("DOMContentLoaded", () => {
  const launcher = document.getElementById("rs-chat-launcher");
  const chatbot = document.getElementById("rs-chatbot");
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const chatBody = document.getElementById("chatBody");

  if (launcher && chatbot) {
    launcher.onclick = () => {
      chatbot.classList.remove("hidden");
      chatInput && chatInput.focus();
    };
  }

  // Optional: close button logic
  // Add a button with id="chatClose" inside your chat-panel for this to work
  const chatClose = document.getElementById("chatClose");
  if (chatClose && chatbot) {
    chatClose.onclick = () => {
      chatbot.classList.add("hidden");
    };
  }

  // Basic bot reply logic
  if (chatForm && chatInput && chatBody) {
    chatForm.onsubmit = (e) => {
      e.preventDefault();
      const userMsg = chatInput.value.trim();
      if (!userMsg) return;
      // Show user message
      const userDiv = document.createElement("div");
      userDiv.className = "chat-msg user";
      userDiv.textContent = userMsg;
      chatBody.appendChild(userDiv);

      // Bot reply (simple echo, replace with your AI logic)
      setTimeout(() => {
        const botDiv = document.createElement("div");
        botDiv.className = "chat-msg bot";
        botDiv.textContent = "You said: " + userMsg;
        chatBody.appendChild(botDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
      }, 600);

      chatInput.value = "";
      chatBody.scrollTop = chatBody.scrollHeight;
    };
  }
});

// ...existing code...

/* ---------------- Utilities ---------------- */
function delay(ms){ return new Promise(res => setTimeout(res, ms)); }
/* =========================================
   FIRST LOAD + INIT
   ========================================= */
document.addEventListener("DOMContentLoaded", ()=>{
  // Ocean init doesn’t need anything further (handled by listeners)
  loadTicker();
  setInterval(loadTicker, 30000);

  // Token Pie (draw only if present)
  drawTokenPie();

  // Voice chips
  if (typeof initVoiceChips !== 'undefined') {
    initVoiceChips();
  }

  // Optional: auto-open chat on very first visit
  if(!localStorage.getItem("rs_seen") && RS.launcher){
    setTimeout(()=> RS.launcher.click(), 800);
  }
});






function copyAddress() {
  const address = document.getElementById("contract-address").innerText;
  const btn = document.getElementById("copy-btn");

  navigator.clipboard.writeText(address).then(() => {
    btn.innerText = "✔ Copied!";
    btn.classList.add("copied");

    setTimeout(() => {
      btn.innerText = "📋 Copy";
      btn.classList.remove("copied");
    }, 2000);
  });
}






<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://unpkg.com/lucide@latest"></script>
<script>
const tokenAddress = "0xb93d116A1CB1AEE03A64053542Ec966368652873";

// === Render icons ===
lucide.createIcons();

// === Animate Numbers ===
function animateValue(elementId, start, end, duration, suffix = "") {
  const element = document.getElementById(elementId);
  if (!element) return;

  const range = end - start;
  if (range === 0) {
    element.innerText = end.toLocaleString() + suffix;
    return;
  }
  const stepTime = Math.max(Math.floor(duration / Math.abs(range)), 20);
  let current = start;
  const increment = end > start ? 1 : -1;

  const timer = setInterval(() => {
    current += increment;
    element.innerText = current.toLocaleString() + suffix;
    if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
      element.innerText = end.toLocaleString() + suffix;
      clearInterval(timer);
    }
  }, stepTime);
}

// === Chart.js Pie Chart ===
const ctx = document.getElementById('chartCanvas').getContext('2d');
const gradient1 = ctx.createLinearGradient(0, 0, 0, 400);
gradient1.addColorStop(0, '#34d399'); gradient1.addColorStop(1, '#059669');
const gradient2 = ctx.createLinearGradient(0, 0, 0, 400);
gradient2.addColorStop(0, '#facc15'); gradient2.addColorStop(1, '#ca8a04');
const gradient3 = ctx.createLinearGradient(0, 0, 0, 400);
gradient3.addColorStop(0, '#60a5fa'); gradient3.addColorStop(1, '#1d4ed8');
const gradient4 = ctx.createLinearGradient(0, 0, 0, 400);
gradient4.addColorStop(0, '#f472b6'); gradient4.addColorStop(1, '#be185d');

new Chart(ctx, {
  type: 'pie',
  data: {
    labels: [
      'Liquidity (40%)',
      'Farming Rewards (30%)',
      'Treasury & Growth (20%)',
      'Team (10%)'
    ],
    datasets: [{
      data: [40, 30, 20, 10],
      backgroundColor: [gradient1, gradient2, gradient3, gradient4],
      borderWidth: 3,
      borderColor: '#0f172a'
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#e2e8f0', font: { size: 14 } }
      }
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 2000,
      easing: "easeOutElastic"
    }
  }
});

// === Fetch Live Stats from DexScreener ===
async function fetchLiveStats() {
  try {
    const psRes = await fetch("https://api.dexscreener.com/latest/dex/tokens/" + tokenAddress);
    const psData = await psRes.json();
    const marketData = psData.pairs && psData.pairs[0] ? psData.pairs[0] : null;

    const priceUsd = marketData ? marketData.priceUsd : "N/A";
    const liquidityUsd = marketData ? marketData.liquidity.usd : "N/A";
    const marketCap = marketData ? marketData.fdv : "N/A";

    // ==== Update UI ====
    document.getElementById("price").innerText = priceUsd !== "N/A"
      ? `$${Number(priceUsd).toFixed(6)}`
      : "N/A";

    if (marketCap !== "N/A") {
      animateValue("marketCap", 0, Math.floor(Number(marketCap)), 1500, " USD");
    } else {
      document.getElementById("marketCap").innerText = "N/A";
    }

    if (liquidityUsd !== "N/A") {
      animateValue("liquidity", 0, Math.floor(Number(liquidityUsd)), 1500, " USD");
    } else {
      document.getElementById("liquidity").innerText = "N/A";
    }

    // Last updated
    document.getElementById("lastUpdated").innerText = new Date().toLocaleTimeString();
  } catch (err) {
    console.error("Error fetching token stats:", err);
  }
}

fetchLiveStats();
setInterval(fetchLiveStats, 60000); // refresh every 60s
</script>





<script>
document.addEventListener("DOMContentLoaded", function () {
  const track = document.getElementById("videoCarousel");
  let scrollAmount = 0;

  function autoScroll() {
    if (!track) return;
    const card = track.querySelector(".video-card");
    if (!card) return;

    const cardWidth = card.offsetWidth + 16; // card + gap
    const maxScroll = track.scrollWidth - track.clientWidth;

    scrollAmount += cardWidth;

    if (scrollAmount > maxScroll) {
      scrollAmount = 0; // loop back
    }

    track.scrollTo({
      left: scrollAmount,
      behavior: "smooth"
    });
  }

  // Autoplay every 5 seconds
  setInterval(autoScroll, 5000);
});
</script>



(function initNewsCarousel(rootId = "newsCarousel") {
  const root = document.getElementById(rootId);
  if (!root) return;

  const viewport = root.querySelector(".nc-viewport");
  const track = root.querySelector(".nc-track");
  const cards = Array.from(track.querySelectorAll(".nc-card"));
  const prevBtn = root.querySelector(".nc-prev");
  const nextBtn = root.querySelector(".nc-next");
  const dotsWrap = root.querySelector("#ncDots");

  // helpers
  const getCardsPerView = () => {
    if (window.innerWidth >= 900) return 3;
    if (window.innerWidth >= 600) return 2;
    return 1;
  };

  let pageOffsets = [];  // left positions for each page start
  let currentPage = 0;
  let autoplayTimer = null;

  function computePageOffsets() {
    const cpv = getCardsPerView();
    pageOffsets = [];
    const totalPages = Math.ceil(cards.length / cpv);
    for (let i = 0; i < totalPages; i++) {
      const firstCardIndex = i * cpv;
      const el = cards[firstCardIndex];
      pageOffsets.push(el ? el.offsetLeft - track.offsetLeft : 0);
    }
    // Correct current page after layout change
    currentPage = clampPage(currentPage);
  }

  function clampPage(i) {
    const last = Math.max(0, pageOffsets.length - 1);
    if (i < 0) return 0;
    if (i > last) return last;
    return i;
  }

  function scrollToPage(i) {
    currentPage = clampPage(i);
    viewport.scrollTo({ left: pageOffsets[currentPage], behavior: "smooth" });
    updateDots();
  }

  function nearestPage() {
    const x = viewport.scrollLeft;
    let best = 0;
    let bestDist = Infinity;
    pageOffsets.forEach((off, idx) => {
      const d = Math.abs(x - off);
      if (d < bestDist) { best = idx; bestDist = d; }
    });
    return best;
  }

  // dots
  function renderDots() {
    dotsWrap.innerHTML = "";
    pageOffsets.forEach((_, idx) => {
      const dot = document.createElement("span");
      dot.className = "nc-dot" + (idx === currentPage ? " active" : "");
      dot.addEventListener("click", () => scrollToPage(idx));
      dotsWrap.appendChild(dot);
    });
  }
  function updateDots() {
    const dots = dotsWrap.querySelectorAll(".nc-dot");
    dots.forEach((d, i) => d.classList.toggle("active", i === currentPage));
  }

  // arrows
  prevBtn.addEventListener("click", () => {
    stopAutoplay();
    scrollToPage(currentPage - 1);
    startAutoplay();
  });
  nextBtn.addEventListener("click", () => {
    stopAutoplay();
    scrollToPage(currentPage + 1 >= pageOffsets.length ? 0 : currentPage + 1);
    startAutoplay();
  });

  // autoplay
  function startAutoplay() {
    if (autoplayTimer) return;
    autoplayTimer = setInterval(() => {
      scrollToPage(currentPage + 1 >= pageOffsets.length ? 0 : currentPage + 1);
    }, 4000);
  }
  function stopAutoplay() {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }

  // pause on hover / touch
  root.addEventListener("mouseenter", stopAutoplay);
  root.addEventListener("mouseleave", startAutoplay);
  viewport.addEventListener("touchstart", stopAutoplay, { passive: true });
  viewport.addEventListener("touchend", startAutoplay);

  // update current page after scrolling ends (debounced)
  let scrollDebounce;
  viewport.addEventListener("scroll", () => {
    window.clearTimeout(scrollDebounce);
    scrollDebounce = window.setTimeout(() => {
      currentPage = nearestPage();
      updateDots();
    }, 120);
  });

  // recompute on resize / font load
  const recompute = () => {
    computePageOffsets();
    renderDots();
    scrollToPage(currentPage); // maintain position
  };
  window.addEventListener("resize", () => {
    // wait a tick for layout to settle
    requestAnimationFrame(recompute);
  });
  // initial
  requestAnimationFrame(() => {
    computePageOffsets();
    renderDots();
    scrollToPage(0);
    startAutoplay();
  });
})();



  
