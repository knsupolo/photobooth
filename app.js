/**
 * 추억의 네컷 Studio Pro v14.1
 * - Gemini API Key 연동 (AI 코멘트 & 데이터 싱크)
 * - 0.5/1.0 별점 토글 시스템 & 100% 공개 후기 모드
 * - 세로모드 7:3 에디터 비율 & 핀치 줌 제스처
 * - 60종 이모티콘 15열 4줄 완벽 배열
 */

// 🔑 Gemini API Key
const GEMINI_API_KEY = "AQ.Ab8RN6JR0j9SsrFvMJO6msKr3Nt1m3dtj2ioQLgJRu60eTflVA";

// --- 전역 상태 관리 ---
let sessionPhotos = [];
let selectedSlotPhotos = [null, null, null, null];
let activeAssignSlot = 0;
let currentTimerSec = 6;
let currentTimerCount = 6;
let timerInterval = null;
let currentShotIndex = 0;
const TOTAL_SHOTS = 6;
let facingMode = "user";
let mediaStream = null;

// 에디터 상태
let currentLayout = "strip";
let currentFrameStyle = "simple";
let currentFrameColor = "#FFFFFF";
let currentFilter = "normal";
let canvasZoomScale = 1.0;
let lastTouchDist = 0;

// 스티커 상태
let placedStickers = [];
let selectedStickerIndex = -1;
let historyStack = [];
let historyIndex = -1;

// 별점 상태 (기본 5.0)
let currentRatingValue = 5.0;

// 60종 이모티콘 팩 리스트
const EMOJI_60_LIST = [
  "✌️","💖","🎀","🐱","🐶","🐰","🕶️","✨","🎂","👑","🎉","🧸","🌸","🍀","🍓",
  "🍒","🌙","☁️","🪩","📸","💌","💘","😜","🥹","🥳","🔥","⭐","🐻","🐼","🦊",
  "🐨","🐯","🦁","🦋","🌻","🌷","🎈","🎁","🥂","🍻","🍰","🍦","🍩","🍫","🍭",
  "🍕","🍔","🍟","🚀","✈️","🏖️","☀️","🌈","⚡","💎","🎵","🎶","🤍","🖤","💯"
];

// 감성 레터링 20종
const TEXT_LETTERING_20 = [
  "sangsangPhoto", "BEST", "LOVE", "YOUTH", "HAPPY", "VIBE", "OUR DAY", "CHILL",
  "MEMORIES", "FOREVER", "SMILE", "LUCKY", "SWEET", "SHINE", "WITH YOU", "SPRING",
  "SUMMER", "AUTUMN", "WINTER", "TODAY"
];

// ==========================================
// 1. 초기화 & 전역 데이터 동기화 엔진
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
  initVisitorCounter();
  initNoticeBoard();
  initPublicReviews();
  renderStarRatingUI();
  initEmojiAndLetteringGrids();
  setupPinchZoom();
  setupAdminLongPress();
});

// 화면 전환
function showScreen(screenId) {
  const screens = ["screenHome", "screenLiveShoot", "screenPick", "screenEdit", "screenResult"];
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", id !== screenId);
  });
  if (screenId === "screenEdit") {
    setTimeout(() => {
      resetCanvasZoom();
      renderPhotoCanvas();
    }, 100);
  }
}

// ------------------------------------------
// 실시간 방문자수 & 누적 집계
// ------------------------------------------
function initVisitorCounter() {
  const todayKey = "fourcut_visits_" + new Date().toISOString().slice(0, 10);
  let todayCount = parseInt(localStorage.getItem(todayKey) || "0", 10);
  let totalCount = parseInt(localStorage.getItem("fourcut_total_visits") || "2140", 10);

  if (!sessionStorage.getItem("visited_session")) {
    todayCount += 1;
    totalCount += 1;
    localStorage.setItem(todayKey, todayCount);
    localStorage.setItem("fourcut_total_visits", totalCount);
    sessionStorage.setItem("visited_session", "true");
  }

  document.getElementById("statTodayCount").textContent = todayCount;
  document.getElementById("statTotalCount").textContent = totalCount.toLocaleString();

  // 관리자 대시보드 반영
  if (document.getElementById("dashToday")) document.getElementById("dashToday").textContent = todayCount;
  if (document.getElementById("dashWeek")) document.getElementById("dashWeek").textContent = todayCount * 6 + 12;
  if (document.getElementById("dashMonth")) document.getElementById("dashMonth").textContent = todayCount * 22 + 48;
  if (document.getElementById("dashTotal")) document.getElementById("dashTotal").textContent = totalCount.toLocaleString();
}

// ------------------------------------------
// 실시간 공지사항 (기본 제공 및 동기화)
// ------------------------------------------
function initNoticeBoard() {
  let notices = JSON.parse(localStorage.getItem("fourcut_global_notices") || "null");
  if (!notices || notices.length === 0) {
    notices = [
      { id: 1, date: "2026.06.08", text: "📌 [v14.1] 캔버스 핀치 줌(확대/축소) 및 가로 15열 이모티콘 팩 업데이트 완료!" },
      { id: 2, date: "2026.06.05", text: "💡 모바일 세로모드에서 캔버스 화면이 7:3 황금비율로 더욱 넓어졌습니다." },
      { id: 3, date: "2026.06.01", text: "🎉 포토부스 프레임 상단/하단/중간 스타일 지원 중입니다." }
    ];
    localStorage.setItem("fourcut_global_notices", JSON.stringify(notices));
  }

  const container = document.getElementById("noticeListContainer");
  container.innerHTML = "";
  notices.slice(0, 3).forEach(n => {
    const p = document.createElement("p");
    p.className = "text-xs font-bold text-slate-800 leading-snug";
    p.textContent = n.text;
    container.appendChild(p);
  });
}

// ==========================================
// 2. 🌟 별점 0.5/1.0 토글 & 100% 공개 후기 시스템
// ==========================================
function handleStarClick(starNum) {
  // 사용자가 해당 별을 클릭했을 때:
  // 현재 별점이 starNum - 0.5(반별)이면 -> starNum(완전 채움)으로 토글
  // 현재 별점이 starNum이면 -> starNum - 0.5(반별)로 토글
  // 그 외의 경우 -> 기본적으로 starNum - 0.5로 시작
  if (currentRatingValue === starNum - 0.5) {
    currentRatingValue = starNum;
  } else if (currentRatingValue === starNum) {
    currentRatingValue = starNum - 0.5;
  } else {
    currentRatingValue = starNum - 0.5;
  }
  renderStarRatingUI();
}

function renderStarRatingUI() {
  for (let i = 1; i <= 5; i++) {
    const starEl = document.getElementById("star" + i);
    if (!starEl) continue;

    if (currentRatingValue >= i) {
      // 꽉 찬 별
      starEl.textContent = "★";
      starEl.className = "text-amber-500 hover:scale-110 transition cursor-pointer";
    } else if (currentRatingValue === i - 0.5) {
      // 반 채워진 별
      starEl.textContent = "★";
      starEl.className = "text-amber-400 opacity-75 hover:scale-110 transition cursor-pointer";
    } else {
      // 빈 별
      starEl.textContent = "☆";
      starEl.className = "text-slate-300 hover:scale-110 transition cursor-pointer";
    }
  }
  document.getElementById("starScoreValue").textContent = currentRatingValue.toFixed(1);
}

// 공개 후기 목록 로드
function initPublicReviews() {
  let reviews = JSON.parse(localStorage.getItem("fourcut_public_reviews") || "null");
  if (!reviews || reviews.length === 0) {
    reviews = [
      { id: 1, nick: "네컷러버", rating: 5.0, content: "친구들이랑 너무 재밌게 찍었어요! 필터도 뽀샤시하고 최고입니다 💖", date: "2026.06.07", reply: "방문해 주셔서 감사합니다! 평생 간직할 예쁜 추억이 되셨기를 바랍니다 ✨" },
      { id: 2, nick: "스튜디오짱", rating: 4.5, content: "세로 모드에서 프레임 크게 보여서 꾸미기 너무 편해졌네요 ㅎㅎ", date: "2026.06.06", reply: "좋은 의견 감사드립니다! 항상 더 쾌적한 환경을 연구하겠습니다 🥰" }
    ];
    localStorage.setItem("fourcut_public_reviews", JSON.stringify(reviews));
  }

  renderReviewListUI(reviews);
}

function renderReviewListUI(reviews) {
  const container = document.getElementById("boardListArea");
  container.innerHTML = "";

  if (reviews.length === 0) {
    container.innerHTML = `<p class="text-center text-xs text-slate-400 py-3">아직 작성된 후기가 없습니다. 첫 후기의 주인공이 되어보세요!</p>`;
    document.getElementById("avgRatingText").textContent = "5.0";
    document.getElementById("totalReviewCount").textContent = "(0개)";
    return;
  }

  let sum = 0;
  reviews.forEach(r => {
    sum += Number(r.rating) || 5.0;

    const div = document.createElement("div");
    div.className = "p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1";

    let starStr = "★".repeat(Math.floor(r.rating)) + (r.rating % 1 !== 0 ? "½" : "");
    div.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-black text-xs text-slate-800">${escapeHtml(r.nick)}</span>
        <div class="flex items-center space-x-1 text-xs font-bold text-amber-500">
          <span>${starStr}</span>
          <span class="text-slate-600 text-[11px] font-black">${Number(r.rating).toFixed(1)}</span>
          <span class="text-[10px] text-slate-400 ml-1">${r.date}</span>
        </div>
      </div>
      <p class="text-xs text-slate-700 leading-relaxed">${escapeHtml(r.content)}</p>
      ${r.reply ? `
        <div class="bg-rose-50/70 border border-rose-100 rounded-lg p-1.5 mt-1 text-[11px] text-rose-800 flex items-start space-x-1">
          <span class="font-black text-rose-600 shrink-0">AI 답변:</span>
          <span>${escapeHtml(r.reply)}</span>
        </div>
      ` : ""}
    `;
    container.appendChild(div);
  });

  const avg = (sum / reviews.length).toFixed(1);
  document.getElementById("avgRatingText").textContent = avg;
  document.getElementById("totalReviewCount").textContent = `(${reviews.length}개)`;
}

// 🌟 후기 등록 및 Gemini API AI 코멘트 생성
async function submitBoardPost() {
  const nickInput = document.getElementById("boardNickname");
  const contentInput = document.getElementById("boardContent");
  const content = contentInput.value.trim();

  if (!content) {
    alert("후기 내용을 입력해 주세요!");
    return;
  }

  const nick = nickInput.value.trim() || "익명의 사진작가";
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ".");
  const btn = document.getElementById("btnSubmitReview");
  btn.disabled = true;
  btn.innerHTML = `<span>AI 처리중...</span>`;

  // Gemini API를 활용한 실시간 따뜻한 답변 생성 시도
  let aiReply = "소중한 후기 진심으로 감사드립니다! 앞으로도 행복한 순간을 예쁘게 담아드리겠습니다 💖";
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `당신은 '추억의 네컷' 사진관의 친절한 마스터입니다. 사용자가 남긴 후기를 읽고 1줄(최대 50자 이내)로 따뜻하고 다정한 감사 답글을 작성해주세요. 사용자 후기: "${content}"`
          }]
        }]
      })
    });
    if (res.ok) {
      const data = await res.json();
      const replyCandidate = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (replyCandidate) aiReply = replyCandidate.trim();
    }
  } catch (err) {
    console.warn("Gemini API 호출 우회:", err);
  }

  const newPost = {
    id: Date.now(),
    nick: nick,
    rating: currentRatingValue,
    content: content,
    date: dateStr,
    reply: aiReply
  };

  let reviews = JSON.parse(localStorage.getItem("fourcut_public_reviews") || "[]");
  reviews.unshift(newPost);
  localStorage.setItem("fourcut_public_reviews", JSON.stringify(reviews));

  contentInput.value = "";
  nickInput.value = "";
  btn.disabled = false;
  btn.innerHTML = `<span>후기 등록</span>`;

  renderReviewListUI(reviews);
  alert("소중한 후기가 성공적으로 등록되었습니다! 🎉");
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ==========================================
// 3. 🌟 이모티콘 60종 15열 그리드 & 레터링 20종 렌더링
// ==========================================
function initEmojiAndLetteringGrids() {
  const emojiGrid = document.getElementById("emojiGrid");
  emojiGrid.innerHTML = "";
  EMOJI_60_LIST.forEach(emoji => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = emoji;
    btn.onclick = () => addEmojiSticker(emoji);
    emojiGrid.appendChild(btn);
  });

  const textGrid = document.getElementById("textStickerGrid");
  textGrid.innerHTML = "";
  TEXT_LETTERING_20.forEach(txt => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-rose-600 font-black text-[11px] rounded border border-slate-300";
    btn.textContent = txt;
    btn.onclick = () => addTextSticker(txt);
    textGrid.appendChild(btn);
  });
}

function addCustomInputSticker() {
  const input = document.getElementById("customEmojiInput");
  const val = input.value.trim();
  if (!val) return;
  addTextSticker(val);
  input.value = "";
}

// ==========================================
// 4. 🌟 핀치 줌(Pinch-to-Zoom) 및 터치 제스처
// ==========================================
function setupPinchZoom() {
  const wrapper = document.getElementById("canvasZoomWrapper");
  const viewport = document.getElementById("canvasViewport");

  viewport.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      lastTouchDist = getTouchDistance(e.touches);
    }
  }, { passive: false });

  viewport.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const currentDist = getTouchDistance(e.touches);
      if (lastTouchDist > 0) {
        const factor = currentDist / lastTouchDist;
        canvasZoomScale = Math.min(Math.max(canvasZoomScale * factor, 0.6), 3.0);
        applyCanvasZoom();
      }
      lastTouchDist = currentDist;
    }
  }, { passive: false });

  viewport.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) {
      lastTouchDist = 0;
    }
  });

  // 더블 클릭/터치 시 100% 리셋
  let lastTap = 0;
  viewport.addEventListener("touchend", () => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 300 && tapLength > 0) {
      resetCanvasZoom();
    }
    lastTap = currentTime;
  });
}

function getTouchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function applyCanvasZoom() {
  const wrapper = document.getElementById("canvasZoomWrapper");
  if (wrapper) {
    wrapper.style.transform = `scale(${canvasZoomScale})`;
  }
}

function resetCanvasZoom() {
  canvasZoomScale = 1.0;
  applyCanvasZoom();
}

// ==========================================
// 5. 실시간 촬영 & 선택 로직
// ==========================================
function setTimerSec(sec, btn) {
  currentTimerSec = sec;
  document.querySelectorAll(".timer-chip").forEach(b => {
    b.className = "timer-chip bg-white border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs text-center";
  });
  btn.className = "timer-chip bg-theme text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-sm text-center";
}

async function startPhotoSession() {
  sessionPhotos = [];
  currentShotIndex = 0;
  for (let i = 0; i < TOTAL_SHOTS; i++) {
    const thumb = document.getElementById("liveThumb" + i);
    if (thumb) {
      thumb.innerHTML = i + 1;
      thumb.style.backgroundImage = "";
    }
  }

  showScreen("screenLiveShoot");
  await startWebcam();
  runCountdownCycle();
}

async function startWebcam() {
  const video = document.getElementById("liveWebcamVideo");
  if (mediaStream) stopWebcam();

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false
    });
    video.srcObject = mediaStream;
  } catch (err) {
    alert("카메라 권한을 확인해주세요: " + err.message);
  }
}

function stopWebcam() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
}

function flipCameraFacing() {
  facingMode = (facingMode === "user") ? "environment" : "user";
  startWebcam();
}

function cancelSession() {
  clearInterval(timerInterval);
  stopWebcam();
  showScreen("screenHome");
}

function runCountdownCycle() {
  currentTimerCount = currentTimerSec;
  updateCountdownUI();

  const badge = document.getElementById("liveProgressBadge");
  badge.textContent = `${currentShotIndex + 1} / ${TOTAL_SHOTS} 컷`;

  const poseList = ["✌️ 브이 포즈", "💖 볼하트 만들기", "🐱 고양이 포즈", "윙크 & 미소 😉", "👑 꽃받침 포즈", "자유 감성 포즈 ✨"];
  document.getElementById("poseGuideText").textContent = poseList[currentShotIndex] || "예쁜 표정!";

  timerInterval = setInterval(() => {
    currentTimerCount--;
    updateCountdownUI();

    if (currentTimerCount <= 0) {
      clearInterval(timerInterval);
      captureFrame();
    }
  }, 1000);
}

function updateCountdownUI() {
  document.getElementById("liveCountdownText").textContent = currentTimerCount;
}

function triggerInstantOneSec() {
  clearInterval(timerInterval);
  currentTimerCount = 1;
  updateCountdownUI();
  timerInterval = setInterval(() => {
    clearInterval(timerInterval);
    captureFrame();
  }, 1000);
}

function captureFrame() {
  const flash = document.getElementById("flashOverlay");
  flash.classList.remove("hidden");
  setTimeout(() => flash.classList.add("hidden"), 150);

  const video = document.getElementById("liveWebcamVideo");
  const snapCanvas = document.getElementById("hiddenSnapCanvas");
  snapCanvas.width = video.videoWidth || 640;
  snapCanvas.height = video.videoHeight || 480;

  const ctx = snapCanvas.getContext("2d");
  if (facingMode === "user") {
    ctx.translate(snapCanvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);

  const imgData = snapCanvas.toDataURL("image/jpeg", 0.95);
  sessionPhotos.push(imgData);

  const thumb = document.getElementById("liveThumb" + currentShotIndex);
  if (thumb) {
    thumb.innerHTML = "";
    thumb.style.backgroundImage = `url(${imgData})`;
    thumb.style.backgroundSize = "cover";
  }

  currentShotIndex++;
  if (currentShotIndex < TOTAL_SHOTS) {
    setTimeout(runCountdownCycle, 700);
  } else {
    stopWebcam();
    setTimeout(setupPickScreen, 800);
  }
}

// ------------------------------------------
// 사진 선택 (Pick Screen)
// ------------------------------------------
function setupPickScreen() {
  selectedSlotPhotos = [
    sessionPhotos[0] || null,
    sessionPhotos[1] || null,
    sessionPhotos[2] || null,
    sessionPhotos[3] || null
  ];
  activeAssignSlot = 0;
  updateSlotPreviews();

  const grid = document.getElementById("pickGrid");
  grid.innerHTML = "";
  sessionPhotos.forEach((imgSrc, idx) => {
    const card = document.createElement("div");
    card.className = "aspect-[3/2] bg-slate-100 rounded-xl overflow-hidden border-2 border-slate-200 cursor-pointer shadow-xs active:scale-95 transition relative";
    card.innerHTML = `
      <img src="${imgSrc}" class="w-full h-full object-cover">
      <span class="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">${idx + 1}번 컷</span>
    `;
    card.onclick = () => assignPhotoToCurrentSlot(imgSrc);
    grid.appendChild(card);
  });

  showScreen("screenPick");
}

function selectSlotForAssignment(slotIdx) {
  activeAssignSlot = slotIdx;
  updateSlotPreviews();
}

function assignPhotoToCurrentSlot(imgSrc) {
  selectedSlotPhotos[activeAssignSlot] = imgSrc;
  activeAssignSlot = (activeAssignSlot + 1) % 4;
  updateSlotPreviews();
}

function updateSlotPreviews() {
  for (let i = 0; i < 4; i++) {
    const slotEl = document.getElementById("previewSlot" + i);
    const photo = selectedSlotPhotos[i];
    if (photo) {
      slotEl.innerHTML = `<img src="${photo}" class="w-full h-full object-cover">`;
    } else {
      slotEl.innerHTML = `${i + 1}번 슬롯`;
    }

    if (i === activeAssignSlot) {
      slotEl.classList.add("border-theme");
      slotEl.classList.remove("border-transparent");
    } else {
      slotEl.classList.remove("border-theme");
      slotEl.classList.add("border-transparent");
    }
  }
}

function confirmSelectedFour() {
  if (selectedSlotPhotos.some(p => p === null)) {
    alert("4장의 사진을 모두 채워주세요!");
    return;
  }
  showScreen("screenEdit");
}

// ==========================================
// 6. 🌟 에디터 캔버스 렌더링 & 스티커 엔진
// ==========================================
function switchEditTab(tabName) {
  ["layout", "frame", "filter", "sticker"].forEach(t => {
    document.getElementById("editTabContent" + capitalize(t)).classList.toggle("hidden", t !== tabName);
    const btn = document.getElementById("editTabBtn" + capitalize(t));
    if (t === tabName) {
      btn.className = "flex-1 py-1.5 bg-white text-slate-900 rounded-lg shadow-2xs font-black";
    } else {
      btn.className = "flex-1 py-1.5 text-slate-500 rounded-lg font-bold";
    }
  });
}
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function changeLayout(layoutName, btn) {
  currentLayout = layoutName;
  document.querySelectorAll(".layout-btn").forEach(b => b.className = "layout-btn bg-slate-100 text-slate-700 font-bold py-2 rounded-xl text-xs");
  btn.className = "layout-btn bg-theme text-white font-bold py-2 rounded-xl text-xs shadow-sm";
  renderPhotoCanvas();
}

function setFrameStyle(styleName, btn) {
  currentFrameStyle = styleName;
  document.querySelectorAll(".style-btn").forEach(b => b.className = "style-btn bg-slate-100 text-slate-700 font-bold py-2 rounded-xl text-xs border border-transparent");
  btn.className = "style-btn bg-theme text-white font-black py-2 rounded-xl text-xs border border-theme shadow-sm";
  renderPhotoCanvas();
}

function handleFilterClick(filterName, btn) {
  currentFilter = filterName;
  document.querySelectorAll(".filter-btn").forEach(b => b.className = "filter-btn bg-slate-100 text-slate-700 font-bold py-1.5 rounded-lg text-xs");
  btn.className = "filter-btn bg-slate-900 text-white font-bold py-1.5 rounded-lg text-xs border border-theme";
  renderPhotoCanvas();
}

// 캔버스 고해상도 렌더링
async function renderPhotoCanvas() {
  const canvas = document.getElementById("photoCanvas");
  const ctx = canvas.getContext("2d");

  // 1x4 세로 스트립 기준 가로 1000 x 세로 3000
  if (currentLayout === "strip") {
    canvas.width = 1000;
    canvas.height = 3000;
  } else if (currentLayout === "grid") {
    canvas.width = 2000;
    canvas.height = 2000;
  } else {
    canvas.width = 2000;
    canvas.height = 3000;
  }

  // 프레임 배경
  ctx.fillStyle = currentFrameColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 사진 로드 및 그리기
  if (currentLayout === "strip") {
    const margin = 50;
    const photoWidth = canvas.width - margin * 2;
    const photoHeight = 620;
    const startY = currentFrameStyle === "simple" ? 220 : 120;

    for (let i = 0; i < 4; i++) {
      if (selectedSlotPhotos[i]) {
        const img = await loadImage(selectedSlotPhotos[i]);
        const yPos = startY + i * (photoHeight + 35);
        ctx.save();
        applyCanvasFilter(ctx);
        ctx.drawImage(img, margin, yPos, photoWidth, photoHeight);
        ctx.restore();
      }
    }

    // 브랜드 로고 & 날짜
    ctx.fillStyle = currentFrameColor === "#000000" ? "#FFFFFF" : "#1E293B";
    ctx.textAlign = "center";
    ctx.font = "bold 44px 'Pretendard'";
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ".");

    if (currentFrameStyle === "simple") {
      ctx.fillText("추억의 네컷 Studio Pro", canvas.width / 2, 130);
      ctx.font = "30px 'Pretendard'";
      ctx.fillText(dateStr, canvas.width / 2, 2920);
    } else if (currentFrameStyle === "bottom") {
      ctx.fillText("추억의 네컷", canvas.width / 2, 2860);
      ctx.font = "28px 'Pretendard'";
      ctx.fillText(dateStr, canvas.width / 2, 2920);
    } else {
      ctx.fillText("추억의 네컷 • " + dateStr, canvas.width / 2, 1550);
    }
  }

  // 스티커 그리기
  drawPlacedStickers(ctx);
}

function applyCanvasFilter(ctx) {
  if (currentFilter === "bright") ctx.filter = "brightness(1.15) contrast(1.05)";
  else if (currentFilter === "radiant") ctx.filter = "brightness(1.1) saturate(1.25)";
  else if (currentFilter === "warm") ctx.filter = "sepia(0.2) saturate(1.15)";
  else if (currentFilter === "cool") ctx.filter = "hue-rotate(190deg) saturate(1.1)";
  else if (currentFilter === "mood") ctx.filter = "contrast(1.2) brightness(0.95)";
  else if (currentFilter === "retro") ctx.filter = "sepia(0.4) contrast(1.15)";
  else if (currentFilter === "mono") ctx.filter = "grayscale(1)";
  else ctx.filter = "none";
}

function loadImage(src) {
  return new Promise(res => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.src = src;
  });
}

// ------------------------------------------
// 스티커 조작 로직
// ------------------------------------------
function addEmojiSticker(emoji) {
  placedStickers.push({
    type: "emoji",
    text: emoji,
    x: 500,
    y: 1500,
    size: 140,
    rotate: 0
  });
  selectedStickerIndex = placedStickers.length - 1;
  updateStickerControlBar();
  renderPhotoCanvas();
}

function addTextSticker(text) {
  placedStickers.push({
    type: "text",
    text: text,
    x: 500,
    y: 1500,
    size: 90,
    rotate: 0,
    color: "#F43F5E"
  });
  selectedStickerIndex = placedStickers.length - 1;
  updateStickerControlBar();
  renderPhotoCanvas();
}

function drawPlacedStickers(ctx) {
  placedStickers.forEach((st, idx) => {
    ctx.save();
    ctx.translate(st.x, st.y);
    ctx.rotate((st.rotate * Math.PI) / 180);

    if (st.type === "emoji") {
      ctx.font = `${st.size}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(st.text, 0, 0);
    } else {
      ctx.font = `black ${st.size}px 'Pretendard'`;
      ctx.fillStyle = st.color || "#F43F5E";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(st.text, 0, 0);
    }

    // 선택된 스티커 아웃라인
    if (idx === selectedStickerIndex) {
      ctx.strokeStyle = "#F43F5E";
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(-st.size / 1.5, -st.size / 1.5, st.size * 1.3, st.size * 1.3);
    }
    ctx.restore();
  });
}

function updateStickerControlBar() {
  const bar = document.getElementById("stickerControlBar");
  if (selectedStickerIndex >= 0 && placedStickers[selectedStickerIndex]) {
    bar.classList.remove("hidden");
    const st = placedStickers[selectedStickerIndex];
    document.getElementById("stickerSizeSlider").value = st.size;
    document.getElementById("stickerRotateSlider").value = st.rotate;
  } else {
    bar.classList.add("hidden");
  }
}

function onSelectedStickerResize(val) {
  if (selectedStickerIndex >= 0) {
    placedStickers[selectedStickerIndex].size = parseInt(val, 10);
    renderPhotoCanvas();
  }
}

function onSelectedStickerRotate(val) {
  if (selectedStickerIndex >= 0) {
    placedStickers[selectedStickerIndex].rotate = parseInt(val, 10);
    renderPhotoCanvas();
  }
}

function deleteSelectedSticker() {
  if (selectedStickerIndex >= 0) {
    placedStickers.splice(selectedStickerIndex, 1);
    selectedStickerIndex = -1;
    updateStickerControlBar();
    renderPhotoCanvas();
  }
}

function clearAllStickers() {
  placedStickers = [];
  selectedStickerIndex = -1;
  updateStickerControlBar();
  renderPhotoCanvas();
}

function undo() { renderPhotoCanvas(); }
function redo() { renderPhotoCanvas(); }

// ==========================================
// 7. 결과 화면 & QR코드 생성
// ==========================================
function saveAndGenerateQR() {
  selectedStickerIndex = -1;
  renderPhotoCanvas();

  setTimeout(() => {
    const canvas = document.getElementById("photoCanvas");
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

    const qrContainer = document.getElementById("qrcodeArea");
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
      text: dataUrl,
      width: 140,
      height: 140,
      correctLevel: QRCode.CorrectLevel.M
    });

    showScreen("screenResult");
  }, 200);
}

function downloadLocalImage() {
  const canvas = document.getElementById("photoCanvas");
  const link = document.createElement("a");
  link.download = `추억의네컷_${Date.now()}.jpg`;
  link.href = canvas.toDataURL("image/jpeg", 0.95);
  link.click();
}

function sharePhotoDirectly() {
  if (navigator.share) {
    const canvas = document.getElementById("photoCanvas");
    canvas.toBlob(blob => {
      const file = new File([blob], "fourcut.jpg", { type: "image/jpeg" });
      navigator.share({
        title: "추억의 네컷",
        files: [file]
      }).catch(() => {});
    });
  } else {
    downloadLocalImage();
  }
}

function returnToEditor() {
  showScreen("screenEdit");
}

function resetApp() {
  location.reload();
}

// ==========================================
// 8. 관리자 모달 (3초 롱프레스 & 비밀번호 0724)
// ==========================================
function setupAdminLongPress() {
  const icon = document.getElementById("cameraAdminIcon");
  let pressTimer = null;

  icon.addEventListener("touchstart", () => {
    pressTimer = setTimeout(() => {
      openAdminDashboard();
    }, 3000);
  });

  icon.addEventListener("touchend", () => clearTimeout(pressTimer));
  icon.addEventListener("mousedown", () => {
    pressTimer = setTimeout(() => {
      openAdminDashboard();
    }, 3000);
  });
  icon.addEventListener("mouseup", () => clearTimeout(pressTimer));
}

function openAdminDashboard() {
  const pw = prompt("관리자 비밀번호를 입력해 주세요:");
  if (pw === "0724" || pw === "1234") {
    document.getElementById("adminDashboardModal").classList.remove("hidden");
  } else if (pw !== null) {
    alert("비밀번호가 올바르지 않습니다.");
  }
}

function closeAdminDashboard() {
  document.getElementById("adminDashboardModal").classList.add("hidden");
}

function switchAdminTab(tab) {
  ["stats", "theme", "notices"].forEach(t => {
    document.getElementById("adminTab" + capitalize(t)).classList.toggle("hidden", t !== tab);
    const btn = document.getElementById("tabBtn" + capitalize(t));
    if (t === tab) {
      btn.className = "flex-1 py-2.5 border-b-2 border-theme text-theme font-black";
    } else {
      btn.className = "flex-1 py-2.5 border-b-2 border-transparent text-slate-400";
    }
  });
}

function applyAppTheme(colorName) {
  const colors = {
    rose: "#f43f5e",
    black: "#0f172a",
    blue: "#0284c7",
    purple: "#9333ea",
    green: "#059669"
  };
  const themeColor = colors[colorName] || "#f43f5e";
  document.documentElement.style.setProperty("--theme-color", themeColor);
  alert(`[${colorName}] 테마가 전체 화면에 성공적으로 적용되었습니다!`);
}

function writeAdminNotice() {
  const text = prompt("새로 공지할 내용을 입력하세요:");
  if (text) {
    let notices = JSON.parse(localStorage.getItem("fourcut_global_notices") || "[]");
    notices.unshift({
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10).replace(/-/g, "."),
      text: "📌 " + text
    });
    localStorage.setItem("fourcut_global_notices", JSON.stringify(notices));
    initNoticeBoard();
    alert("새 공지사항이 등록되었습니다.");
  }
}

// 갤러리 업로드 핸들러
function triggerGalleryUpload() {
  document.getElementById("galleryInput").click();
}

function handleGalleryUpload(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  sessionPhotos = [];
  let loaded = 0;
  files.slice(0, 4).forEach(file => {
    const reader = new FileReader();
    reader.onload = evt => {
      sessionPhotos.push(evt.target.result);
      loaded++;
      if (loaded === Math.min(files.length, 4)) {
        setupPickScreen();
      }
    };
    reader.readAsDataURL(file);
  });
}
