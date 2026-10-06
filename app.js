// ========================================================
// [Photoist Pro v1.4] app.js (1편 / 전반부)
// ========================================================
// 1. 핵심 전역 상수 및 통합 상태 관리 (State Management)
// 2. v1.4 업데이트 공지 & 테마별 텍스트 시인성 자동 동기화
// 3. 5초 롱프레스 관리자 모드 (비밀번호: 0724, 공지/후기 삭제)
// 4. 이용 후기 목록 열람 & 0.5점 단위 별점 후기 작성 시스템
// 5. 톱니바퀴 설정 센터 & 테마 모드 제어 (Settings & Theme)
// 6. 화면 라우팅 & 무조건 가로 자이로 감지 엔진
// 7. 아이패드 맞춤형 화각 제어 (0.5x 광각 / 1.0x 표준) & 대기실
// 8. 4~8초 전체 시간 클립 통녹화 & 실시간 6구 슬롯 채움 트랙
// 9. 전체 세션 타임랩스 통녹화 마스터 엔진
// 10. 사진 선택 스마트 자동 커서(미사용 사진 자동 점프) & [한번에 다 넣기]
// ========================================================

// ========================================================
// 1. 핵심 전역 상수 및 통합 상태 관리
// ========================================================
const GOOGLE_DB_URL = "https://script.google.com/macros/s/AKfycbw1fjoUYoKQOHNNatPY_8q8X-1ogUV7iaFsIMpYioStlVX1SZK9hYiY32P-bGv7GUVoBw/exec";
const APP_NAME = "photoist Pro";
const APP_VERSION = "v1.4";
const ADMIN_MASTER_PW = "0724";

const FILTER_PRESETS = {
  normal: { name: '원본', bright: 100, contrast: 100, saturate: 100 },
  bright: { name: '뽀샤시', bright: 110, contrast: 95, saturate: 105 },
  radiant: { name: '화사한', bright: 114, contrast: 105, saturate: 115 },
  warm: { name: '따뜻한', bright: 106, contrast: 100, saturate: 110 },
  cool: { name: '차가운', bright: 102, contrast: 104, saturate: 95 },
  mood: { name: '감성무드', bright: 98, contrast: 110, saturate: 90 },
  retro: { name: '레트로', bright: 104, contrast: 92, saturate: 85 },
  mono: { name: '흑백', bright: 100, contrast: 120, saturate: 0 }
};

const POSE_SUGGESTIONS = [
  "거울을 보며 머리와 옷매무새를 가다듬어 보세요!",
  "✌️ 볼 옆에 브이하고 상큼하게 윙크!",
  "🫶 양손으로 볼하트 만들기!",
  "🤫 쉿! 손가락을 입술에 대고 비밀스러운 표정",
  "🐱 머리 위에 손을 얹어 고양이 귀 만들기",
  "😎 턱을 살짝 들고 힙하고 쿨한 눈빛 발사",
  "🌸 두 손으로 턱을 받치고 꽃받침 포즈!"
];

const appState = {
  // 1) 레이아웃 규격
  selectedCutLayout: '1x4',    // '1x4' | '1x5' | '1x6' | '2x2' | '2x1x2' | '1x2x2' | '2x2x2'
  selectedCutCount: 4,         // 4 | 5 | 6
  stripPrintMode: 'single',    // 1x4, 1x5 전용: 'single'(1줄 단독) | 'double'(2줄 나란히 1+1 복제)
  timerSec: 6,                 // 4 | 6 | 8초
  
  // 2) 촬영 데이터
  shotImages: [],              // 6컷 원본 Image 객체 배열
  shotVideoBlobs: [],          // 컷별 4~8초 전체 시간 통녹화 비디오 클립 Blob 배열
  fullSessionVideoBlob: null,  // 대기~촬영 전과정 3.0배속 타임랩스용 마스터 Blob
  selectedIndices: [null, null, null, null], // 슬롯별 선택 인덱스
  selectedImages: [null, null, null, null],  // 슬롯별 실제 Image 객체
  slotPanOffsets: [0, 0, 0, 0, 0, 0],        // 슬롯별 가로 사진 좌/우 패닝 오프셋 (-100 ~ 100%)
  activeSlotIndex: 0,          // 현재 포커스된 슬롯 인덱스
  viewerPhotoIndex: 0,         // 대형 뷰어에서 보고 있는 사진 인덱스 (0~5)
  
  // 3) 카메라 제어
  facingMode: 'user',
  cameraFov: 'wide',           // 'wide'(0.5x 광각) | 'normal'(1.0x 표준)
  mediaStream: null,
  
  // 4) 에디터 프레임 스타일
  frameStyle: 'basic_middle',  // 'basic_middle' | 'basic_top' | 'basic_bottom' | 'basic_zigzag' | 'basic_clean'
  frameColor: '#000000',
  frameThickness: 40,
  showDate: true,
  sideEngravingEnabled: false,
  sideEngravingText: "#PHOTOIST",
  
  // 5) 타이포그래피 & 필터
  typography: {
    fontFamily: 'Pretendard',
    fontSize: 42,
    fontColor: '#FFFFFF',
    isBold: true,
    date: getFormattedTodayDate()
  },
  activeFilter: 'normal',
  filters: { bright: 100, contrast: 100, saturate: 100 },
  
  // 6) 텍스트 스티커 관리
  stickers: [],
  selectedStickerIdx: -1,
  dragTarget: null,
  dragStartPos: { x: 0, y: 0 },
  slotRects: [],

  // 7) 공지 및 후기
  adminNotice: {
    visible: false,
    text: "포토이스트 프로 v1.4 오픈! 1×4 & 1×5 2줄 복제 인화와 풀타임 부메랑 영상을 만나보세요."
  },
  reviews: [],
  currentReviewScore: 5.0
};

// 캔버스 줌 & 패닝 제어 (0.1배 ~ 5.0배)
let canvasZoom = 1.0;
let canvasPanX = 0;
let canvasPanY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;

// 실행취소 / 다시실행 스택
let historyStack = [];
let redoStack = [];

// 오디오 신디사이저 엔진
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playBeepSound(isLast = false) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isLast ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isLast ? 880 : 440, ctx.currentTime);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isLast ? 0.35 : 0.15));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + (isLast ? 0.35 : 0.15));
  } catch (e) {}
}

function playShutterSound() {
  try {
    const ctx = getAudioContext();
    const bufferSize = ctx.sampleRate * 0.12;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  } catch (e) {}
}

function playSuccessFanfare() {
  try {
    const ctx = getAudioContext();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startT = ctx.currentTime + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startT);

      gain.gain.setValueAtTime(0.15, startT);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startT);
      osc.stop(startT + 0.25);
    });
  } catch (e) {}
}

function triggerHaptic(type = 'light') {
  if (navigator.vibrate) {
    if (type === 'light') navigator.vibrate(20);
    else if (type === 'heavy') navigator.vibrate([40, 30, 60]);
  }
}

function showToast(msg) {
  const existing = document.getElementById('appToast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'appToast';
  toast.className = 'fixed top-14 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg z-50 pointer-events-none transition-opacity duration-300';
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 1800);
}

function getFormattedTodayDate() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
}

// ========================================================
// 2. v1.4 업데이트 공지 & 테마별 텍스트 시인성 자동 동기화
// ========================================================
function checkVersionUpdateAutoNotice() {
  const storedVersion = localStorage.getItem('photoist_pro_version');
  if (storedVersion !== APP_VERSION) {
    const modal = document.getElementById('updateNoticeModal');
    if (modal) modal.classList.remove('hidden');
  }
}

function closeUpdateNoticeModal() {
  localStorage.setItem('photoist_pro_version', APP_VERSION);
  document.getElementById('updateNoticeModal')?.classList.add('hidden');
}

// ========================================================
// 3. 5초 롱프레스 관리자 모드 (비밀번호: 0724, 공지/후기 삭제)
// ========================================================
let adminPressTimer = null;

function setupAdminLongPressTrigger() {
  const logo = document.getElementById('adminTriggerLogo');
  if (!logo) return;

  function startPress() {
    logo.classList.add('long-pressing');
    adminPressTimer = setTimeout(() => {
      triggerHaptic('heavy');
      logo.classList.remove('long-pressing');
      openAdminModal();
    }, 5000);
  }

  function cancelPress() {
    if (adminPressTimer) {
      clearTimeout(adminPressTimer);
      adminPressTimer = null;
    }
    logo.classList.remove('long-pressing');
  }

  logo.addEventListener('mousedown', startPress);
  logo.addEventListener('mouseup', cancelPress);
  logo.addEventListener('mouseleave', cancelPress);

  logo.addEventListener('touchstart', startPress, { passive: true });
  logo.addEventListener('touchend', cancelPress);
  logo.addEventListener('touchcancel', cancelPress);
}

function openAdminModal() {
  const modal = document.getElementById('adminModal');
  const gate = document.getElementById('adminAuthGate');
  const panel = document.getElementById('adminDashboardPanel');
  const pwInput = document.getElementById('adminPwInput');

  if (modal) modal.classList.remove('hidden');
  if (gate) gate.classList.remove('hidden');
  if (panel) panel.classList.add('hidden');
  if (pwInput) { pwInput.value = ''; pwInput.focus(); }
}

function closeAdminModal() {
  document.getElementById('adminModal')?.classList.add('hidden');
}

function submitAdminPassword() {
  const input = document.getElementById('adminPwInput');
  if (!input) return;
  const pw = input.value.trim();

  if (pw === ADMIN_MASTER_PW) {
    triggerHaptic('heavy');
    document.getElementById('adminAuthGate')?.classList.add('hidden');
    document.getElementById('adminDashboardPanel')?.classList.remove('hidden');
    initAdminDashboard();
  } else {
    alert("관리자 비밀번호가 일치하지 않습니다.");
    input.value = '';
    input.focus();
  }
}

function initAdminDashboard() {
  const toggle = document.getElementById('adminNoticeToggle');
  const txtInput = document.getElementById('adminNoticeContentInput');

  if (toggle) toggle.checked = appState.adminNotice.visible;
  if (txtInput) txtInput.value = appState.adminNotice.text;

  refreshAdminReviewList();
}

function saveAdminNotice() {
  const toggle = document.getElementById('adminNoticeToggle');
  const txtInput = document.getElementById('adminNoticeContentInput');

  appState.adminNotice.visible = toggle ? toggle.checked : false;
  appState.adminNotice.text = txtInput ? txtInput.value.trim() : "";

  localStorage.setItem('photoist_pro_notice', JSON.stringify(appState.adminNotice));
  applyNoticeToHomeBanner();
  showToast("📢 공지사항이 정상 저장되었습니다.");
}

function applyNoticeToHomeBanner() {
  const banner = document.getElementById('homeNoticeBanner');
  const txt = document.getElementById('homeNoticeText');
  if (!banner || !txt) return;

  if (appState.adminNotice.visible && appState.adminNotice.text) {
    txt.textContent = appState.adminNotice.text;
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

function dismissHomeNotice() {
  document.getElementById('homeNoticeBanner')?.classList.add('hidden');
}

function refreshAdminReviewList() {
  const container = document.getElementById('adminReviewsList');
  const countEl = document.getElementById('adminReviewCount');
  if (!container) return;

  const reviews = getStoredReviews();
  appState.reviews = reviews;
  if (countEl) countEl.textContent = reviews.length;

  if (reviews.length === 0) {
    container.innerHTML = `<p class="text-center py-6 text-xs text-slate-400">등록된 후기가 없습니다.</p>`;
    return;
  }

  container.innerHTML = reviews.map(r => `
    <div class="p-3 bg-white border border-slate-200 rounded-xl flex items-start justify-between gap-2 shadow-xs">
      <div class="space-y-1">
        <div class="flex items-center gap-1.5 text-xs">
          <span class="font-black text-slate-800">${escapeHtml(r.author)}</span>
          <span class="text-amber-500 font-bold">★ ${Number(r.score).toFixed(1)}</span>
          <span class="text-[10px] text-slate-400">${r.date}</span>
        </div>
        <p class="text-xs text-slate-600 font-medium">${escapeHtml(r.text)}</p>
      </div>
      <button type="button" onclick="deleteAdminReview(${r.id})" class="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition" title="삭제">
        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
      </button>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

function deleteAdminReview(id) {
  if (!confirm("이 후기를 영구 삭제하시겠습니까?")) return;
  let reviews = getStoredReviews();
  reviews = reviews.filter(r => r.id !== id);
  localStorage.setItem('photoist_pro_reviews', JSON.stringify(reviews));
  refreshAdminReviewList();
  renderPublicReviewsList();
  showToast("후기가 삭제되었습니다.");
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ========================================================
// 4. 이용 후기 목록 열람 & 0.5점 단위 별점 후기 작성 시스템
// ========================================================
function getStoredReviews() {
  const defaultMock = [
    { id: 1, author: "빛나는순간", score: 5.0, text: "무빙 영상 화질이 정말 대박이에요! 부메랑으로 저장해서 인스타에 바로 올렸어요.", date: "26.10.06" },
    { id: 2, author: "네컷러버", score: 5.0, text: "1x4를 2줄로 인화할 수 있는 기능 생겨서 친구랑 나눠 갖기 너무 좋습니다.", date: "26.10.06" },
    { id: 3, author: "수원스튜디오", score: 4.5, text: "가로 화각이라 여럿이서 찍을 때 얼굴 안 잘리는 게 제일 마음에 들어요.", date: "26.10.05" }
  ];
  const saved = localStorage.getItem('photoist_pro_reviews');
  if (!saved) {
    localStorage.setItem('photoist_pro_reviews', JSON.stringify(defaultMock));
    return defaultMock;
  }
  try {
    return JSON.parse(saved);
  } catch (e) {
    return defaultMock;
  }
}

function openPublicReviewsModal() {
  const modal = document.getElementById('publicReviewsModal');
  if (modal) modal.classList.remove('hidden');
  renderPublicReviewsList();
}

function closePublicReviewsModal() {
  document.getElementById('publicReviewsModal')?.classList.add('hidden');
}

function renderPublicReviewsList() {
  const container = document.getElementById('publicReviewsList');
  const avgEl = document.getElementById('summaryAverageScore');
  const totalEl = document.getElementById('summaryTotalReviews');
  if (!container) return;

  const reviews = getStoredReviews();
  appState.reviews = reviews;

  const total = reviews.length;
  if (totalEl) totalEl.textContent = total;

  if (total > 0) {
    const avg = reviews.reduce((sum, r) => sum + (r.score || 5), 0) / total;
    if (avgEl) avgEl.textContent = avg.toFixed(1);
  } else {
    if (avgEl) avgEl.textContent = "5.0";
  }

  if (reviews.length === 0) {
    container.innerHTML = `<p class="text-center py-10 text-xs text-slate-400">등록된 후기가 없습니다. 첫 후기를 남겨보세요!</p>`;
    return;
  }

  container.innerHTML = reviews.map(r => `
    <div class="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5 shadow-2xs">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xs font-black text-slate-800">${escapeHtml(r.author)}</span>
          <span class="text-[11px] text-amber-500 font-extrabold flex items-center">
            ★ ${Number(r.score).toFixed(1)}
          </span>
        </div>
        <span class="text-[10px] text-slate-400 font-mono">${r.date}</span>
      </div>
      <p class="text-xs text-slate-600 leading-relaxed font-medium">${escapeHtml(r.text)}</p>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

function openReviewWriteModal() {
  document.getElementById('reviewWriteModal')?.classList.remove('hidden');
  appState.currentReviewScore = 5.0;
  renderStarRatingWidget();
}

function closeReviewWriteModal() {
  document.getElementById('reviewWriteModal')?.classList.add('hidden');
}

function renderStarRatingWidget() {
  const container = document.getElementById('starRatingBox');
  const valText = document.getElementById('starRatingValueText');
  if (!container) return;
  container.innerHTML = '';

  const score = appState.currentReviewScore;
  if (valText) valText.textContent = score.toFixed(1);

  for (let i = 1; i <= 5; i++) {
    const unit = document.createElement('div');
    unit.className = 'star-unit';

    let starState = 'empty';
    if (score >= i) {
      starState = 'full';
    } else if (score >= i - 0.5) {
      starState = 'half';
    }
    unit.classList.add(starState);

    unit.innerHTML = `
      <svg viewBox="0 0 24 24">
        <defs>
          <clipPath id="halfClip${i}">
            <rect x="0" y="0" width="12" height="24"/>
          </clipPath>
        </defs>
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
        <path class="half-left" clip-path="url(#halfClip${i})" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
      </svg>
      <div class="hit-left" onclick="setStarScore(${i - 0.5})"></div>
      <div class="hit-right" onclick="setStarScore(${i})"></div>
    `;

    container.appendChild(unit);
  }
}

function setStarScore(score) {
  triggerHaptic('light');
  appState.currentReviewScore = score;
  renderStarRatingWidget();
}

function submitUserReview() {
  const authorInp = document.getElementById('reviewAuthorInput');
  const textInp = document.getElementById('reviewTextInput');

  const author = authorInp ? authorInp.value.trim() : "";
  const text = textInp ? textInp.value.trim() : "";

  if (!author || !text) {
    alert("작성자 닉네임과 후기 내용을 모두 입력해 주세요.");
    return;
  }

  const newReview = {
    id: Date.now(),
    author: author,
    score: appState.currentReviewScore,
    text: text,
    date: getFormattedTodayDate()
  };

  let reviews = getStoredReviews();
  reviews.unshift(newReview);
  localStorage.setItem('photoist_pro_reviews', JSON.stringify(reviews));

  alert("소중한 후기가 성공적으로 등록되었습니다! 감사합니다.");
  if (authorInp) authorInp.value = '';
  if (textInp) textInp.value = '';
  closeReviewWriteModal();
  renderPublicReviewsList();

  if (GOOGLE_DB_URL) {
    fetch(GOOGLE_DB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'SUBMIT_REVIEW',
        author: newReview.author,
        score: newReview.score,
        text: newReview.text,
        date: newReview.date
      })
    }).catch(() => {});
  }
}

// ========================================================
// 5. 톱니바퀴 설정 센터 & 테마 모드 제어 (Settings & Theme)
// ========================================================
function openSettingsModal() {
  document.getElementById('settingsModal')?.classList.remove('hidden');
}

function closeSettingsModal() {
  document.getElementById('settingsModal')?.classList.add('hidden');
}

function applyThemeMode(themeKey, btn) {
  document.body.classList.remove('theme-matte-black', 'theme-deep-slate');

  if (themeKey === 'matte') {
    document.body.classList.add('theme-matte-black');
  } else if (themeKey === 'slate') {
    document.body.classList.add('theme-deep-slate');
  }

  localStorage.setItem('photoist_pro_theme', themeKey);

  document.querySelectorAll('.theme-mode-btn').forEach(b => {
    b.className = "theme-mode-btn py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-100 text-slate-700 transition";
  });
  if (btn) {
    btn.className = "theme-mode-btn py-2 text-xs font-black rounded-xl border border-slate-900 bg-slate-900 text-white shadow-xs transition";
  }

  showToast(`테마 적용: ${themeKey === 'white' ? '클린 화이트' : themeKey === 'matte' ? '매트 블랙' : '딥 슬레이트'}`);
}

// ========================================================
// 6. 화면 라우팅 & 무조건 가로 자이로 감지 엔진
// ========================================================
function showScreen(screenId) {
  const screens = ['screenHome', 'screenCapture', 'screenPick', 'screenEdit', 'screenPixxViewer'];
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === screenId) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  if (window.lucide) lucide.createIcons();
  updateAppVh();

  if (screenId === 'screenCapture') {
    checkGyroOrientation();
  }
}

function returnToHome() {
  if (appState.shotImages.length > 0) {
    if (!confirm("홈으로 돌아가시겠습니까?\n진행 중인 사진과 편집 내용이 초기화됩니다.")) return;
  }
  stopCameraAndAudio();
  resetSessionData();
  showScreen('screenHome');
}

function resetSessionData() {
  appState.shotImages = [];
  appState.shotVideoBlobs = [];
  appState.fullSessionVideoBlob = null;
  appState.selectedIndices = Array(appState.selectedCutCount).fill(null);
  appState.selectedImages = Array(appState.selectedCutCount).fill(null);
  appState.slotPanOffsets = [0, 0, 0, 0, 0, 0];
  appState.stripPrintMode = 'single';
  appState.stickers = [];
  appState.selectedStickerIdx = -1;
  appState.activeSlotIndex = 0;
  appState.viewerPhotoIndex = 0;
  historyStack = [];
  redoStack = [];
}

function checkGyroOrientation() {
  const captureScreen = document.getElementById('screenCapture');
  if (!captureScreen || captureScreen.classList.contains('hidden')) return;

  const overlay = document.getElementById('gyroOrientationWarning');
  if (!overlay) return;

  const isPortrait = window.innerHeight > window.innerWidth;
  if (isPortrait) {
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}

window.addEventListener('resize', () => {
  updateAppVh();
  checkGyroOrientation();
});

window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    updateAppVh();
    checkGyroOrientation();
  }, 150);
});

// ========================================================
// 7. 아이패드 맞춤형 화각 제어 (0.5x 광각 / 1.0x 표준) & 대기실
// ========================================================
function selectInterval(sec, btn) {
  appState.timerSec = parseInt(sec, 10);
  document.querySelectorAll('.interval-chip').forEach(b => {
    b.className = "interval-chip flex-1 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 transition";
  });
  if (btn) {
    btn.className = "interval-chip flex-1 py-2 rounded-xl text-xs font-black bg-slate-900 text-white shadow-xs transition";
  }
}

function setCameraFov(fovMode) {
  appState.cameraFov = fovMode;
  const btnWide = document.getElementById('btnFovWide');
  const btnNormal = document.getElementById('btnFovNormal');
  const videoEl = document.getElementById('cameraVideo');

  if (fovMode === 'wide') {
    if (btnWide) btnWide.className = "text-[11px] bg-white text-black font-black px-2.5 py-1 rounded-full shadow transition";
    if (btnNormal) btnNormal.className = "text-[11px] text-slate-300 font-bold px-2.5 py-1 rounded-full transition";
    if (videoEl) {
      videoEl.classList.remove('fov-normal');
      videoEl.classList.add('fov-wide');
    }
    showToast("0.5x 광각 모드 적용");
  } else {
    if (btnWide) btnWide.className = "text-[11px] text-slate-300 font-bold px-2.5 py-1 rounded-full transition";
    if (btnNormal) btnNormal.className = "text-[11px] bg-white text-black font-black px-2.5 py-1 rounded-full shadow transition";
    if (videoEl) {
      videoEl.classList.remove('fov-wide');
      videoEl.classList.add('fov-normal');
    }
    showToast("1.0x 표준 모드 적용");
  }
}

async function startCameraSession() {
  getAudioContext();
  showScreen('screenCapture');

  const readyOverlay = document.getElementById('captureReadyOverlay');
  const activeOverlay = document.getElementById('captureActiveOverlay');
  if (readyOverlay) readyOverlay.classList.remove('hidden');
  if (activeOverlay) activeOverlay.classList.add('hidden');

  resetLiveCaptureSlotsUI();

  try {
    if (appState.mediaStream) {
      stopCameraAndAudio();
    }

    const constraints = {
      video: {
        facingMode: appState.facingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    appState.mediaStream = stream;

    const videoEl = document.getElementById('cameraVideo');
    if (videoEl) {
      videoEl.srcObject = stream;
      if (appState.facingMode === 'user') {
        videoEl.classList.add('mirror');
      } else {
        videoEl.classList.remove('mirror');
      }
      setCameraFov(appState.cameraFov || 'wide');
      await videoEl.play();
    }

    checkGyroOrientation();

  } catch (err) {
    alert("카메라 장치 접근 권한을 확인해 주세요: " + err.message);
    showScreen('screenHome');
  }
}

function stopCameraAndAudio() {
  if (activeFullSessionRecorder && activeFullSessionRecorder.state === 'recording') {
    activeFullSessionRecorder.stop();
  }
  if (activeClipRecorder && activeClipRecorder.state === 'recording') {
    activeClipRecorder.stop();
  }
  if (appState.mediaStream) {
    appState.mediaStream.getTracks().forEach(t => t.stop());
    appState.mediaStream = null;
  }
  const videoEl = document.getElementById('cameraVideo');
  if (videoEl) {
    videoEl.srcObject = null;
  }
}

async function flipCameraFacingPreserve() {
  appState.facingMode = (appState.facingMode === 'user') ? 'environment' : 'user';

  if (appState.mediaStream) {
    appState.mediaStream.getTracks().forEach(t => t.stop());
    appState.mediaStream = null;
  }

  try {
    const constraints = {
      video: {
        facingMode: appState.facingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    appState.mediaStream = stream;

    const videoEl = document.getElementById('cameraVideo');
    if (videoEl) {
      videoEl.srcObject = stream;
      if (appState.facingMode === 'user') {
        videoEl.classList.add('mirror');
      } else {
        videoEl.classList.remove('mirror');
      }
      setCameraFov(appState.cameraFov || 'wide');
      await videoEl.play();
    }
  } catch (err) {
    alert("카메라 전환 실패: " + err.message);
  }
}

// ========================================================
// 8. 4~8초 전체 시간 클립 통녹화 & 실시간 6구 슬롯 채움 트랙
// ========================================================
let countdownTimer = null;
let currentShotNumber = 0;
const TOTAL_SHOT_COUNT = 6;

function beginShootingCountdown() {
  const readyOverlay = document.getElementById('captureReadyOverlay');
  const activeOverlay = document.getElementById('captureActiveOverlay');
  if (readyOverlay) readyOverlay.classList.add('hidden');
  if (activeOverlay) activeOverlay.classList.remove('hidden');

  startFullSessionRecording();

  currentShotNumber = 0;
  appState.shotImages = [];
  appState.shotVideoBlobs = [];
  resetLiveCaptureSlotsUI();

  executeNextShotCycle();
}

function resetLiveCaptureSlotsUI() {
  for (let i = 0; i < 6; i++) {
    const slot = document.getElementById(`liveSlot${i}`);
    if (slot) {
      slot.className = (i === 0) ? 'live-capture-slot active-target' : 'live-capture-slot';
      slot.innerHTML = `<span class="text-[11px] font-bold text-white/50">${i + 1}</span>`;
    }
  }
}

function executeNextShotCycle() {
  if (currentShotNumber >= TOTAL_SHOT_COUNT) {
    playSuccessFanfare();
    stopFullSessionRecordingAndProceed();
    return;
  }

  for (let i = 0; i < 6; i++) {
    const slot = document.getElementById(`liveSlot${i}`);
    if (slot) {
      if (i === currentShotNumber) {
        slot.classList.add('active-target');
      } else {
        slot.classList.remove('active-target');
      }
    }
  }

  currentShotNumber++;
  const badge = document.getElementById('captureCountBadge');
  if (badge) badge.textContent = `${currentShotNumber} / ${TOTAL_SHOT_COUNT}`;

  const poseBadge = document.getElementById('poseRecommendBadge');
  if (poseBadge) {
    poseBadge.textContent = POSE_SUGGESTIONS[(currentShotNumber) % POSE_SUGGESTIONS.length];
  }

  let sec = appState.timerSec;
  const countBox = document.getElementById('countdownBox');
  const countText = document.getElementById('countdownText');
  if (countBox) countBox.classList.remove('hidden');
  if (countText) countText.textContent = sec;

  playBeepSound(false);

  // 🌟 카운트다운 시작 0초부터 셔터 시점까지 전체 시간(4초/6초/8초) 통녹화 가동
  startPreShotClipRecording();

  countdownTimer = setInterval(() => {
    sec--;
    if (sec > 0) {
      if (countText) countText.textContent = sec;
      playBeepSound(sec === 1);
    } else {
      clearInterval(countdownTimer);
      if (countBox) countBox.classList.add('hidden');
      captureCurrentFrame();
    }
  }, 1000);
}

let activeClipRecorder = null;
let activeClipChunks = [];

function startPreShotClipRecording() {
  if (!appState.mediaStream) return;
  activeClipChunks = [];

  let mimeType = 'video/mp4';
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported('video/mp4')) {
    mimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9'))
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
  }

  try {
    activeClipRecorder = new MediaRecorder(appState.mediaStream, {
      mimeType: mimeType,
      videoBitsPerSecond: 15000000
    });

    activeClipRecorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) activeClipChunks.push(e.data);
    };

    activeClipRecorder.onstop = () => {
      const clipBlob = new Blob(activeClipChunks, { type: mimeType });
      appState.shotVideoBlobs.push(clipBlob);
    };

    activeClipRecorder.start();
  } catch (e) {
    appState.shotVideoBlobs.push(null);
  }
}

function triggerImmediateShot() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
  const countBox = document.getElementById('countdownBox');
  if (countBox) countBox.classList.add('hidden');
  captureCurrentFrame();
}

function captureCurrentFrame() {
  const videoEl = document.getElementById('cameraVideo');
  const flash = document.getElementById('flashEffectLayer');

  playShutterSound();
  triggerHaptic('heavy');
  if (flash) {
    flash.classList.remove('flash-active');
    void flash.offsetWidth;
    flash.classList.add('flash-active');
  }

  // 셔터 시점에 녹화 중지 -> 전체 길이 클립 저장 완료
  if (activeClipRecorder && activeClipRecorder.state === 'recording') {
    activeClipRecorder.stop();
  }

  const capCanvas = document.getElementById('hiddenCaptureCanvas');
  const ctx = capCanvas.getContext('2d');
  capCanvas.width = videoEl.videoWidth || 1920;
  capCanvas.height = videoEl.videoHeight || 1080;

  ctx.save();
  if (appState.facingMode === 'user') {
    ctx.translate(capCanvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(videoEl, 0, 0, capCanvas.width, capCanvas.height);
  ctx.restore();

  const imgDataUrl = capCanvas.toDataURL('image/jpeg', 0.95);
  const img = new Image();
  img.src = imgDataUrl;
  img.onload = () => {
    appState.shotImages.push(img);

    const slotIdx = currentShotNumber - 1;
    const slotEl = document.getElementById(`liveSlot${slotIdx}`);
    if (slotEl) {
      slotEl.className = 'live-capture-slot filled';
      slotEl.innerHTML = `<img src="${imgDataUrl}" alt="컷 ${slotIdx + 1}">`;
    }

    setTimeout(executeNextShotCycle, 800);
  };
}

// ========================================================
// 9. 전체 세션 타임랩스 통녹화 마스터 엔진
// ========================================================
let activeFullSessionRecorder = null;
let activeFullSessionChunks = [];

function startFullSessionRecording() {
  if (!appState.mediaStream) return;
  activeFullSessionChunks = [];

  let mimeType = 'video/mp4';
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported('video/mp4')) {
    mimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9'))
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
  }

  try {
    activeFullSessionRecorder = new MediaRecorder(appState.mediaStream, {
      mimeType: mimeType,
      videoBitsPerSecond: 10000000
    });

    activeFullSessionRecorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) activeFullSessionChunks.push(e.data);
    };

    activeFullSessionRecorder.onstop = () => {
      appState.fullSessionVideoBlob = new Blob(activeFullSessionChunks, { type: mimeType });
    };

    activeFullSessionRecorder.start();
  } catch (err) {}
}

function stopFullSessionRecordingAndProceed() {
  if (activeFullSessionRecorder && activeFullSessionRecorder.state === 'recording') {
    activeFullSessionRecorder.stop();
  }
  stopCameraAndAudio();
  proceedToPickScreen();
}

// ========================================================
// 10. 사진 선택 2분할 뷰어, 스마트 자동 커서 & [한번에 다 넣기]
// ========================================================
function proceedToPickScreen() {
  showScreen('screenPick');
  selectCutLayout('1x4', 4);
  appState.activeSlotIndex = 0;
  appState.viewerPhotoIndex = 0;

  renderPickCutTabs();
  renderRealFrameSlots();
  renderLargeViewer();
  renderThumbnailsStrip();
  updatePickProgressUI();
  setupViewerSwipe();
}

function renderPickCutTabs() {
  const tabsContainer = document.getElementById('pickCutModeTabs');
  if (!tabsContainer) return;
  tabsContainer.innerHTML = '';

  const options = [
    { layout: '1x4', count: 4, label: '1×4 스트립' },
    { layout: '1x5', count: 5, label: '1×5 스트립' },
    { layout: '1x6', count: 6, label: '1×6 스트립' },
    { layout: '2x2', count: 4, label: '2×2 엽서' },
    { layout: '2x1x2', count: 5, label: '2×1×2 화보' },
    { layout: '1x2x2', count: 5, label: '1×2×2 역화보' },
    { layout: '2x2x2', count: 6, label: '2×2×2 그리드' }
  ];

  options.forEach(opt => {
    const btn = document.createElement('button');
    const isSelected = (appState.selectedCutLayout === opt.layout);
    btn.type = 'button';
    btn.className = isSelected
      ? "px-2.5 py-1 rounded-lg text-xs font-black bg-slate-900 text-white shadow-xs transition"
      : "px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition";
    btn.textContent = opt.label;
    btn.onclick = () => {
      selectCutLayout(opt.layout, opt.count);
      renderPickCutTabs();
      renderRealFrameSlots();
      updatePickProgressUI();
      updateSlotPanControlUI();
    };
    tabsContainer.appendChild(btn);
  });
}

function selectCutLayout(layoutKey, count) {
  appState.selectedCutLayout = layoutKey;
  appState.selectedCutCount = count;
  appState.selectedIndices = Array(count).fill(null);
  appState.selectedImages = Array(count).fill(null);
  appState.slotPanOffsets = Array(count).fill(0);
  appState.stripPrintMode = 'single';
  appState.activeSlotIndex = 0;
}

// 🌟 1x4, 1x5 전용: [인화 형태: 1줄 단독 vs 2줄 나란히(1+1)] 제어
function setStripPrintMode(mode) {
  appState.stripPrintMode = mode;
  const btnSingle = document.getElementById('btnStripSingle');
  const btnDouble = document.getElementById('btnStripDouble');

  if (mode === 'single') {
    if (btnSingle) btnSingle.className = "print-strip-mode-btn py-2 rounded-xl text-xs font-black bg-slate-900 text-white shadow-xs";
    if (btnDouble) btnDouble.className = "print-strip-mode-btn py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100";
    showToast("1줄 단독 인화 모드");
  } else {
    if (btnSingle) btnSingle.className = "print-strip-mode-btn py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100";
    if (btnDouble) btnDouble.className = "print-strip-mode-btn py-2 rounded-xl text-xs font-black bg-slate-900 text-white shadow-xs";
    showToast("2줄 나란히 (1+1 복제) 인화 모드");
  }

  if (typeof renderStrip === 'function') {
    renderStrip();
  }
}

// 🌟 [한번에 다 넣기 (원클릭 자동 채우기)]
function autoFillAllSlotsRandom() {
  if (appState.shotImages.length === 0) return;

  triggerHaptic('heavy');
  const count = appState.selectedCutCount;
  
  for (let slot = 0; slot < count; slot++) {
    const shotIdx = slot % appState.shotImages.length;
    appState.selectedIndices[slot] = shotIdx;
    appState.selectedImages[slot] = appState.shotImages[shotIdx];
  }

  appState.activeSlotIndex = 0;

  renderRealFrameSlots();
  renderThumbnailsStrip();
  updatePickProgressUI();
  updateSlotPanControlUI();
  showToast("✨ 슬롯에 사진이 자동으로 모두 배치되었습니다!");
}

function renderRealFrameSlots() {
  const container = document.getElementById('realFrameSlotContainer');
  if (!container) return;
  container.innerHTML = '';

  const layout = appState.selectedCutLayout;

  if (layout === '1x4' || layout === '1x5' || layout === '1x6') {
    const frameWrap = document.createElement('div');
    frameWrap.className = "w-full max-w-[170px] h-full flex flex-col gap-1.5 p-2 bg-white rounded-xl border-2 border-slate-300 shadow-md";
    for (let i = 0; i < appState.selectedCutCount; i++) {
      frameWrap.appendChild(createSlotBoxElement(i, "flex-1 w-full"));
    }
    container.appendChild(frameWrap);

  } else if (layout === '2x2') {
    const frameWrap = document.createElement('div');
    frameWrap.className = "w-full max-w-[270px] aspect-[2/3] grid grid-cols-2 gap-2 p-2.5 bg-white rounded-xl border-2 border-slate-300 shadow-md";
    for (let i = 0; i < 4; i++) {
      frameWrap.appendChild(createSlotBoxElement(i, "w-full h-full"));
    }
    container.appendChild(frameWrap);

  } else if (layout === '2x1x2') {
    const frameWrap = document.createElement('div');
    frameWrap.className = "w-full max-w-[270px] aspect-[2/3] flex flex-col gap-1.5 p-2 bg-white rounded-xl border-2 border-slate-300 shadow-md";

    const row1 = document.createElement('div');
    row1.className = "grid grid-cols-2 gap-1.5 h-[30%]";
    row1.appendChild(createSlotBoxElement(0, "w-full h-full"));
    row1.appendChild(createSlotBoxElement(1, "w-full h-full"));
    frameWrap.appendChild(row1);

    const row2 = document.createElement('div');
    row2.className = "h-[40%]";
    row2.appendChild(createSlotBoxElement(2, "w-full h-full"));
    frameWrap.appendChild(row2);

    const row3 = document.createElement('div');
    row3.className = "grid grid-cols-2 gap-1.5 h-[30%]";
    row3.appendChild(createSlotBoxElement(3, "w-full h-full"));
    row3.appendChild(createSlotBoxElement(4, "w-full h-full"));
    frameWrap.appendChild(row3);

    container.appendChild(frameWrap);

  } else if (layout === '1x2x2') {
    const frameWrap = document.createElement('div');
    frameWrap.className = "w-full max-w-[270px] aspect-[2/3] flex flex-col gap-1.5 p-2 bg-white rounded-xl border-2 border-slate-300 shadow-md";

    const row1 = document.createElement('div');
    row1.className = "h-[40%]";
    row1.appendChild(createSlotBoxElement(0, "w-full h-full"));
    frameWrap.appendChild(row1);

    const row2 = document.createElement('div');
    row2.className = "grid grid-cols-2 gap-1.5 h-[30%]";
    row2.appendChild(createSlotBoxElement(1, "w-full h-full"));
    row2.appendChild(createSlotBoxElement(2, "w-full h-full"));
    frameWrap.appendChild(row2);

    const row3 = document.createElement('div');
    row3.className = "grid grid-cols-2 gap-1.5 h-[30%]";
    row3.appendChild(createSlotBoxElement(3, "w-full h-full"));
    row3.appendChild(createSlotBoxElement(4, "w-full h-full"));
    frameWrap.appendChild(row3);

    container.appendChild(frameWrap);

  } else if (layout === '2x2x2') {
    const frameWrap = document.createElement('div');
    frameWrap.className = "w-full max-w-[270px] aspect-[2/3] grid grid-cols-2 grid-rows-3 gap-1.5 p-2.5 bg-white rounded-xl border-2 border-slate-300 shadow-md";
    for (let i = 0; i < 6; i++) {
      frameWrap.appendChild(createSlotBoxElement(i, "w-full h-full"));
    }
    container.appendChild(frameWrap);
  }

  updateSlotPanControlUI();
}

function createSlotBoxElement(slotIdx, customClasses) {
  const box = document.createElement('div');
  const isFilled = (appState.selectedImages[slotIdx] !== null);
  const isActive = (appState.activeSlotIndex === slotIdx);

  box.className = `slot-real-box ${customClasses} ${isFilled ? 'slot-filled' : ''} ${isActive ? 'slot-active' : ''}`;

  if (isFilled) {
    const panX = appState.slotPanOffsets[slotIdx] || 0;
    const img = document.createElement('img');
    img.src = appState.selectedImages[slotIdx].src;
    img.className = "w-full h-full object-cover pointer-events-none transition-transform duration-75";
    img.style.transform = `scale(1.25) translateX(${panX}%)`;
    box.appendChild(img);

    const badge = document.createElement('span');
    badge.className = "absolute bottom-1 left-1 bg-slate-900/80 text-white text-[9px] font-black px-1.5 py-0.5 rounded";
    badge.textContent = `${slotIdx + 1}`;
    box.appendChild(badge);

    const btnRemove = document.createElement('button');
    btnRemove.className = "absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition shadow";
    btnRemove.innerHTML = `<i data-lucide="x" class="w-3 h-3"></i>`;
    btnRemove.onclick = (e) => {
      e.stopPropagation();
      unassignPhotoFromSlot(slotIdx);
    };
    box.appendChild(btnRemove);
  } else {
    box.innerHTML = `
      <span class="text-[11px] font-extrabold text-slate-400 flex items-center justify-center w-6 h-6 rounded-full bg-slate-200">
        ${slotIdx + 1}
      </span>
    `;
  }

  box.onclick = () => {
    appState.activeSlotIndex = slotIdx;
    renderRealFrameSlots();
    renderLargeViewer();
    if (window.lucide) lucide.createIcons();
  };

  return box;
}

function updateSlotPanControlUI() {
  const panBar = document.getElementById('slotPanControlBar');
  const panRange = document.getElementById('slotPanRange');
  const panLabel = document.getElementById('panSlotLabel');
  if (!panBar || !panRange) return;

  const activeIdx = appState.activeSlotIndex;
  const isFilled = (appState.selectedImages[activeIdx] !== null);

  if (isFilled) {
    panBar.classList.remove('hidden');
    panRange.value = appState.slotPanOffsets[activeIdx] || 0;
    if (panLabel) panLabel.textContent = `${activeIdx + 1}번 슬롯 사진 좌/우 위치 조정`;
  } else {
    panBar.classList.add('hidden');
  }
}

function onActiveSlotPanChange(val) {
  const activeIdx = appState.activeSlotIndex;
  if (activeIdx === null || !appState.selectedImages[activeIdx]) return;

  appState.slotPanOffsets[activeIdx] = parseInt(val, 10);
  
  const container = document.getElementById('realFrameSlotContainer');
  if (container) {
    const activeSlotBox = container.querySelectorAll('.slot-real-box')[activeIdx];
    const img = activeSlotBox?.querySelector('img');
    if (img) {
      img.style.transform = `scale(1.25) translateX(${val}%)`;
    }
  }
}

function resetActiveSlotPan() {
  const range = document.getElementById('slotPanRange');
  if (range) range.value = 0;
  onActiveSlotPanChange(0);
}

function renderLargeViewer() {
  const imgEl = document.getElementById('largePhotoViewerImg');
  const badgeEl = document.getElementById('largeViewerIndexBadge');
  const btnAssignText = document.getElementById('btnAssignSlotText');

  if (!imgEl || appState.shotImages.length === 0) return;

  const curPhoto = appState.shotImages[appState.viewerPhotoIndex];
  if (curPhoto) {
    imgEl.src = curPhoto.src;
  }

  if (badgeEl) {
    badgeEl.textContent = `${appState.viewerPhotoIndex + 1} / ${appState.shotImages.length}`;
  }

  if (btnAssignText) {
    btnAssignText.textContent = `${appState.activeSlotIndex + 1}번 슬롯에 이 사진 넣기`;
  }
}

function navigateLargeViewer(direction) {
  if (appState.shotImages.length === 0) return;
  appState.viewerPhotoIndex = (appState.viewerPhotoIndex + direction + appState.shotImages.length) % appState.shotImages.length;
  renderLargeViewer();
  renderThumbnailsStrip();
}

// 🌟 사진 선택 시: '다음 빈 슬롯' + '미사용 사진' 동시 자동 점프
function assignCurrentViewerPhotoToActiveSlot() {
  if (appState.shotImages.length === 0) return;
  const shotIdx = appState.viewerPhotoIndex;
  const currentSlot = appState.activeSlotIndex;

  if (currentSlot === null || currentSlot >= appState.selectedCutCount) return;

  triggerHaptic('light');

  const prevSlot = appState.selectedIndices.indexOf(shotIdx);
  if (prevSlot !== -1 && prevSlot !== currentSlot) {
    appState.selectedIndices[prevSlot] = null;
    appState.selectedImages[prevSlot] = null;
    appState.slotPanOffsets[prevSlot] = 0;
  }

  appState.selectedIndices[currentSlot] = shotIdx;
  appState.selectedImages[currentSlot] = appState.shotImages[shotIdx];

  // 1. 다음 빈 슬롯으로 포커스 자동 전진
  const nextEmptySlot = appState.selectedIndices.findIndex(idx => idx === null);
  if (nextEmptySlot !== -1) {
    appState.activeSlotIndex = nextEmptySlot;
  } else {
    appState.activeSlotIndex = (currentSlot + 1) % appState.selectedCutCount;
  }

  // 2. 🌟 아직 어느 슬롯에도 배치되지 않은 사진(미사용 컷)을 찾아 뷰어 자동 점프
  const totalShots = appState.shotImages.length;
  let nextUnusedPhotoIdx = -1;
  for (let offset = 1; offset < totalShots; offset++) {
    const candidateIdx = (shotIdx + offset) % totalShots;
    if (!appState.selectedIndices.includes(candidateIdx)) {
      nextUnusedPhotoIdx = candidateIdx;
      break;
    }
  }

  if (nextUnusedPhotoIdx !== -1) {
    appState.viewerPhotoIndex = nextUnusedPhotoIdx;
  } else {
    appState.viewerPhotoIndex = (shotIdx + 1) % totalShots;
  }

  renderRealFrameSlots();
  renderLargeViewer();
  renderThumbnailsStrip();
  updatePickProgressUI();
  updateSlotPanControlUI();
  if (window.lucide) lucide.createIcons();
}

function unassignPhotoFromSlot(slotIdx) {
  triggerHaptic('light');
  appState.selectedIndices[slotIdx] = null;
  appState.selectedImages[slotIdx] = null;
  appState.slotPanOffsets[slotIdx] = 0;
  appState.activeSlotIndex = slotIdx;

  renderRealFrameSlots();
  renderLargeViewer();
  renderThumbnailsStrip();
  updatePickProgressUI();
  updateSlotPanControlUI();
  if (window.lucide) lucide.createIcons();
}

function renderThumbnailsStrip() {
  const container = document.getElementById('pickThumbnailsStrip');
  if (!container) return;
  container.innerHTML = '';

  appState.shotImages.forEach((img, idx) => {
    const thumb = document.createElement('div');
    const isViewing = (appState.viewerPhotoIndex === idx);
    const assignedSlot = appState.selectedIndices.indexOf(idx);

    thumb.className = `pick-thumb-horizontal ${isViewing ? 'viewing' : ''}`;

    thumb.innerHTML = `
      <img src="${img.src}" alt="사진 ${idx + 1}">
      ${assignedSlot !== -1 ? `<span class="absolute top-0.5 left-0.5 bg-rose-600 text-white text-[8px] font-black px-1 rounded shadow">${assignedSlot + 1}번</span>` : ''}
    `;

    thumb.onclick = () => {
      appState.viewerPhotoIndex = idx;
      renderLargeViewer();
      renderThumbnailsStrip();
    };

    container.appendChild(thumb);
  });
}

function updatePickProgressUI() {
  const filledCount = appState.selectedIndices.filter(idx => idx !== null).length;
  const total = appState.selectedCutCount;
  const progressText = document.getElementById('pickProgressText');
  if (progressText) {
    progressText.textContent = `${filledCount} / ${total} 슬롯 배치 완료`;
  }
}

function setupViewerSwipe() {
  const viewerBox = document.getElementById('largePhotoViewerImg')?.parentElement;
  if (!viewerBox) return;

  let startX = 0;
  let startY = 0;

  viewerBox.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  viewerBox.addEventListener('touchend', (e) => {
    const diffX = e.changedTouches[0].clientX - startX;
    const diffY = e.changedTouches[0].clientY - startY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        navigateLargeViewer(-1);
      } else {
        navigateLargeViewer(1);
      }
    }
  }, { passive: true });
}

function proceedToEditor() {
  const hasEmptySlot = appState.selectedIndices.some(idx => idx === null);
  if (hasEmptySlot) {
    alert("모든 슬롯에 사진을 배치해 주세요!\n상단의 [한번에 다 넣기] 버튼을 누르시면 한 번에 채워집니다.");
    return;
  }

  triggerHaptic('heavy');
  showScreen('screenEdit');
  initSplitResizer();

  // 1x4, 1x5 레이아웃일 때만 [인화 형태: 1줄 vs 2줄] 토글 옵션 노출
  const printOpt = document.getElementById('printOptionContainer');
  if (printOpt) {
    const isStrip = (appState.selectedCutLayout === '1x4' || appState.selectedCutLayout === '1x5');
    printOpt.classList.toggle('hidden', !isStrip);
  }

  // 🌟 재편집 시 저장 락 및 QR 인셋 캐시 초기화
  finalEmbeddedQrImage = null;

  if (typeof renderStrip === 'function') {
    renderStrip();
  }
}

// 🌟 사진 다시 선택으로 복귀 시 내보내기 락 및 QR 상태 초기화
function returnToPickScreen() {
  finalEmbeddedQrImage = null;
  showScreen('screenPick');
  renderRealFrameSlots();
  renderLargeViewer();
  renderThumbnailsStrip();
  updatePickProgressUI();
}

function initSplitResizer() {
  const resizer = document.getElementById('editorSplitResizer');
  const canvasPane = document.getElementById('splitCanvasPane');
  if (!resizer || !canvasPane) return;

  let isDragging = false;

  function onPointerDown(e) {
    isDragging = true;
    resizer.setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none';
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const isLandscape = window.innerWidth >= 1024;
    const containerRect = resizer.parentElement.getBoundingClientRect();

    if (isLandscape) {
      const newWidth = e.clientX - containerRect.left;
      const pct = Math.max(30, Math.min(75, (newWidth / containerRect.width) * 100));
      canvasPane.style.flex = `0 0 ${pct}%`;
    } else {
      const newHeight = e.clientY - containerRect.top;
      const pct = Math.max(25, Math.min(75, (newHeight / containerRect.height) * 100));
      canvasPane.style.flex = `0 0 ${pct}%`;
    }

    if (typeof renderStrip === 'function') {
      renderStrip();
    }
  }

  function onPointerUp(e) {
    if (isDragging) {
      isDragging = false;
      try { resizer.releasePointerCapture(e.pointerId); } catch (err) {}
      document.body.style.userSelect = '';
    }
  }

  resizer.addEventListener('pointerdown', onPointerDown);
  resizer.addEventListener('pointermove', onPointerMove);
  resizer.addEventListener('pointerup', onPointerUp);
  resizer.addEventListener('pointercancel', onPointerUp);
}
// ========================================================
// [Photoist Pro v1.4] app.js (2편 / 후반부)
// ========================================================
// 11. 테마 컨트롤러 & 프레임 스타일 제어 (기본 5종 단일화)
// 12. 감성 필터 및 화질 보정 엔진 (Pixel Filter Math)
// 13. 스마트 텍스트 스티커 관리 (추가/크기/회전/삭제)
// 14. 캔버스 뷰포트 인터랙션 & 무제한 핀치 줌 / 패닝 통합 제스처
// 15. 초고화질 통합 프레임 합성 엔진 (2줄 나란히 1+1 복제 & 2×1×2 비대칭 지그재그)
// 16. 3종 비디오 분리 엔진 (2.0배속 부메랑 / 2.0배속 사진영상 / 3.0배속 타임랩스)
// 17. 기기 다운로드 & 스마트폰 QR 사진 직결 클라우드 파이프라인
// 18. PIXX 스타일 다크 그레이/블랙 모바일 다운로드 뷰어 엔진
// 19. 실행취소(Undo/Redo), 뷰포트 dvh 보정 & 초기 구동 엔트리포인트
// ========================================================

// ========================================================
// 11. 테마 컨트롤러 & 프레임 스타일 제어 (기본 5종 단일화)
// ========================================================
function setFrameStyle(styleKey, btn) {
  saveStateForUndo();
  appState.frameStyle = styleKey;

  document.querySelectorAll('.style-btn').forEach(b => {
    b.className = "style-btn bg-slate-100 text-slate-700 font-bold py-2 rounded-xl border border-slate-200 text-xs transition";
  });
  if (btn) {
    btn.className = "style-btn bg-slate-900 text-white font-black py-2 rounded-xl text-xs shadow-xs transition";
  }

  const sigInput = document.getElementById('frameSignatureInput');
  const colorPickerContainer = document.getElementById('frameColorPickerWrapper');

  if (styleKey === 'basic_middle') {
    if (sigInput) sigInput.value = "photoist Studio";
    if (colorPickerContainer) colorPickerContainer.classList.remove('hidden');
  } else if (styleKey === 'basic_top') {
    if (sigInput) sigInput.value = "PHOTOIST PRO";
    if (colorPickerContainer) colorPickerContainer.classList.remove('hidden');
  } else if (styleKey === 'basic_bottom') {
    if (sigInput) sigInput.value = "MEMORIES OF TODAY";
    if (colorPickerContainer) colorPickerContainer.classList.remove('hidden');
  } else if (styleKey === 'basic_zigzag') {
    if (sigInput) sigInput.value = "ZIG-ZAG MOMENT";
    if (colorPickerContainer) colorPickerContainer.classList.remove('hidden');
  } else if (styleKey === 'basic_clean') {
    if (sigInput) sigInput.value = "";
    if (colorPickerContainer) colorPickerContainer.classList.remove('hidden');
  }

  renderStrip();
}

function onThicknessChange(val) {
  appState.frameThickness = parseInt(val, 10);
  const valLabel = document.getElementById('valThickness');
  if (valLabel) valLabel.textContent = `${appState.frameThickness}px`;
  renderStrip();
}

// 프레임 색상 변경 시 명도 연산 기반 글자색 자동 반전
function changeFrameColor(color, btn) {
  saveStateForUndo();
  appState.frameColor = color;
  document.querySelectorAll('.color-btn').forEach(b => {
    b.classList.remove('ring-2', 'ring-slate-900', 'scale-110');
  });
  if (btn) btn.classList.add('ring-2', 'ring-slate-900', 'scale-110');

  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;

  appState.typography.fontColor = (lum > 180) ? '#0F172A' : '#FFFFFF';

  appState.stickers.forEach(st => {
    if (st.type === 'text') {
      st.color = appState.typography.fontColor;
    }
  });

  renderStrip();
}

function toggleShowDate(checked) {
  saveStateForUndo();
  appState.showDate = checked;
  renderStrip();
}

function toggleSideEngraving(enabled) {
  saveStateForUndo();
  appState.sideEngravingEnabled = enabled;
  const panel = document.getElementById('sideEngravingConfigPanel');
  if (panel) panel.classList.toggle('hidden', !enabled);
  renderStrip();
}

function setSideEngravingText(text) {
  saveStateForUndo();
  appState.sideEngravingEnabled = true;
  appState.sideEngravingText = text;
  const inp = document.getElementById('sideEngravingInput');
  if (inp) inp.value = text;
  const toggle = document.getElementById('sideEngravingToggle');
  if (toggle) toggle.checked = true;
  const panel = document.getElementById('sideEngravingConfigPanel');
  if (panel) panel.classList.remove('hidden');
  renderStrip();
}

function applyDefaultSideEngraving() {
  setSideEngravingText("#PHOTOIST");
}

function removeSideEngraving() {
  saveStateForUndo();
  appState.sideEngravingEnabled = false;
  appState.sideEngravingText = "";
  const inp = document.getElementById('sideEngravingInput');
  if (inp) inp.value = "";
  const toggle = document.getElementById('sideEngravingToggle');
  if (toggle) toggle.checked = false;
  const panel = document.getElementById('sideEngravingConfigPanel');
  if (panel) panel.classList.add('hidden');
  renderStrip();
}

// ========================================================
// 12. 감성 필터 및 화질 보정 엔진
// ========================================================
function handleFilterClick(filterKey, btn) {
  saveStateForUndo();
  appState.activeFilter = filterKey;
  const p = FILTER_PRESETS[filterKey] || FILTER_PRESETS.normal;
  appState.filters = { bright: p.bright, contrast: p.contrast, saturate: p.saturate };

  document.querySelectorAll('.filter-btn').forEach(b => {
    b.className = "filter-btn bg-slate-100 text-slate-700 font-bold py-1.5 rounded-xl border border-slate-200 text-xs transition";
  });
  if (btn) {
    btn.className = "filter-btn bg-slate-900 text-white font-black py-1.5 rounded-xl text-xs shadow-xs transition";
  }

  const badge = document.getElementById('filterStateBadge');
  if (badge) badge.textContent = p.name;
  renderStrip();
}

function applyPixelFilterMath(imageData, filterKey, customAdjust) {
  const d = imageData.data;
  const len = d.length;
  const bMul = (customAdjust.bright || 100) / 100;
  const cFactor = (((customAdjust.contrast || 100) - 100) * 2.55) / 255 + 1;
  const sMul = (customAdjust.saturate || 100) / 100;

  for (let i = 0; i < len; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];

    if (filterKey === 'bright') { r = r * 1.1 + 10; g = g * 1.08 + 8; b = b * 1.05 + 6; }
    else if (filterKey === 'radiant') { r = r * 1.14 + 15; g = g * 1.1 + 12; b = b * 1.15 + 15; }
    else if (filterKey === 'warm') { r = r * 1.12 + 12; g = g * 1.05 + 6; b = b * 0.92; }
    else if (filterKey === 'cool') { r = r * 0.92; g = g * 1.02 + 4; b = b * 1.15 + 12; }
    else if (filterKey === 'mood') { r = r * 1.06 + 8; g = g * 0.98; b = b * 0.92 + 5; }
    else if (filterKey === 'retro') { r = r * 1.08 + 15; g = g * 0.95 + 8; b = b * 0.82 + 12; }
    else if (filterKey === 'mono') { const gray = 0.299 * r + 0.587 * g + 0.114 * b; r = g = b = gray; }

    r *= bMul; g *= bMul; b *= bMul;
    r = ((r / 255 - 0.5) * cFactor + 0.5) * 255;
    g = ((g / 255 - 0.5) * cFactor + 0.5) * 255;
    b = ((b / 255 - 0.5) * cFactor + 0.5) * 255;

    if (sMul !== 1 && filterKey !== 'mono') {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      r = lum + (r - lum) * sMul;
      g = lum + (g - lum) * sMul;
      b = lum + (b - lum) * sMul;
    }

    d[i] = Math.min(255, Math.max(0, r));
    d[i + 1] = Math.min(255, Math.max(0, g));
    d[i + 2] = Math.min(255, Math.max(0, b));
  }
}

// ========================================================
// 13. 스마트 텍스트 스티커 관리
// ========================================================
function addDirectTextSticker() {
  const input = document.getElementById('directTextInput');
  if (!input) return;
  const val = input.value.trim();
  if (!val) { alert("추가할 문구를 입력해주세요!"); return; }
  saveStateForUndo();

  const canvas = document.getElementById('photoCanvas');
  const newSticker = {
    id: Date.now(),
    type: 'text',
    text: val,
    x: canvas ? canvas.width / 2 : 540,
    y: canvas ? canvas.height / 2 : 1600,
    size: 65,
    rotation: 0,
    color: appState.typography.fontColor || '#0F172A',
    fontFamily: appState.typography.fontFamily || 'Pretendard'
  };

  appState.stickers.push(newSticker);
  appState.selectedStickerIdx = appState.stickers.length - 1;
  showStickerControls(newSticker);
  renderStrip();
  input.value = '';
}

function clearAllStickers() {
  if (appState.stickers.length === 0) return;
  if (!confirm("모든 텍스트 스티커를 삭제하시겠습니까?")) return;
  saveStateForUndo();
  appState.stickers = [];
  appState.selectedStickerIdx = -1;
  const bar = document.getElementById('stickerControlBar');
  if (bar) bar.classList.add('hidden');
  renderStrip();
}

function showStickerControls(st) {
  const bar = document.getElementById('stickerControlBar');
  if (!bar) return;
  bar.classList.remove('hidden');

  const sizeS = document.getElementById('stickerSizeSlider');
  if (sizeS) sizeS.value = st.size;
  const rotS = document.getElementById('stickerRotateSlider');
  if (rotS) rotS.value = st.rotation || 0;
  const rotText = document.getElementById('stickerRotateValText');
  if (rotText) rotText.textContent = `${st.rotation || 0}°`;
}

function onSelectedStickerResize(size) {
  if (appState.selectedStickerIdx >= 0 && appState.selectedStickerIdx < appState.stickers.length) {
    appState.stickers[appState.selectedStickerIdx].size = parseInt(size, 10);
    renderStrip();
  }
}

function onSelectedStickerRotate(deg) {
  if (appState.selectedStickerIdx >= 0 && appState.selectedStickerIdx < appState.stickers.length) {
    const val = parseInt(deg, 10);
    appState.stickers[appState.selectedStickerIdx].rotation = val;
    const rotText = document.getElementById('stickerRotateValText');
    if (rotText) rotText.textContent = `${val}°`;
    renderStrip();
  }
}

function deleteSelectedSticker() {
  if (appState.selectedStickerIdx >= 0) {
    saveStateForUndo();
    appState.stickers.splice(appState.selectedStickerIdx, 1);
    appState.selectedStickerIdx = -1;
    const bar = document.getElementById('stickerControlBar');
    if (bar) bar.classList.add('hidden');
    renderStrip();
  }
}

// ========================================================
// 14. 캔버스 뷰포트 인터랙션 & 무제한 핀치 줌 / 패닝 통합 제스처
// ========================================================
function zoomCanvas(amount) {
  canvasZoom = Math.max(0.1, Math.min(5.0, canvasZoom + amount));
  applyZoomTransform();
}

function resetCanvasZoom() {
  canvasZoom = 1.0;
  canvasPanX = 0;
  canvasPanY = 0;
  applyZoomTransform();
}

function applyZoomTransform() {
  const wrapper = document.getElementById('canvasScaleWrapper');
  if (wrapper) {
    wrapper.style.transform = `translate(${canvasPanX}px, ${canvasPanY}px) scale(${canvasZoom})`;
  }
  const label = document.getElementById('canvasZoomLabel');
  if (label) label.textContent = `${Math.round(canvasZoom * 100)}%`;
}

function setupCanvasPinchZoom() {
  const viewport = document.getElementById('canvasViewport');
  if (!viewport) return;

  let initialPinchDist = 0;
  let initialZoom = 1.0;
  let pinchCenterStartX = 0;
  let pinchCenterStartY = 0;

  viewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      initialPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialZoom = canvasZoom;
      pinchCenterStartX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - canvasPanX;
      pinchCenterStartY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - canvasPanY;
    }
  }, { passive: false });

  viewport.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && initialPinchDist > 0) {
      e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = currentDist / initialPinchDist;

      canvasZoom = Math.max(0.1, Math.min(5.0, initialZoom * factor));
      const currentCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const currentCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      canvasPanX = currentCenterX - pinchCenterStartX;
      canvasPanY = currentCenterY - pinchCenterStartY;
      applyZoomTransform();
    }
  }, { passive: false });

  viewport.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) initialPinchDist = 0;
  });
}

function initCanvasInteractions() {
  const canvas = document.getElementById('photoCanvas');
  const viewport = document.getElementById('canvasViewport');
  if (!canvas || !viewport) return;

  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      clientX, clientY,
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function onPointerDown(e) {
    if (e.touches && e.touches.length > 1) return;
    const coords = getCanvasCoords(e);
    let hitSticker = false;

    for (let i = appState.stickers.length - 1; i >= 0; i--) {
      const st = appState.stickers[i];
      const hitRadius = Math.max(75, st.size * 0.9);
      const dist = Math.hypot(coords.x - st.x, coords.y - st.y);
      if (dist <= hitRadius) {
        appState.selectedStickerIdx = i;
        appState.dragTarget = i;
        appState.dragStartPos = { x: coords.x - st.x, y: coords.y - st.y };
        showStickerControls(st);
        renderStrip();
        hitSticker = true;
        break;
      }
    }

    if (!hitSticker) {
      isPanning = true;
      panStartX = coords.clientX - canvasPanX;
      panStartY = coords.clientY - canvasPanY;
      appState.selectedStickerIdx = -1;
      appState.dragTarget = null;
      const bar = document.getElementById('stickerControlBar');
      if (bar) bar.classList.add('hidden');
      renderStrip();
    }
  }

  function onPointerMove(e) {
    if (e.touches && e.touches.length > 1) return;
    const coords = getCanvasCoords(e);

    if (appState.dragTarget !== null) {
      if (e.cancelable) e.preventDefault();
      const st = appState.stickers[appState.dragTarget];
      st.x = coords.x - appState.dragStartPos.x;
      st.y = coords.y - appState.dragStartPos.y;
      renderStrip();
    } else if (isPanning) {
      if (e.cancelable) e.preventDefault();
      canvasPanX = coords.clientX - panStartX;
      canvasPanY = coords.clientY - panStartY;
      applyZoomTransform();
    }
  }

  function onPointerUp() {
    if (appState.dragTarget !== null) {
      saveStateForUndo();
      appState.dragTarget = null;
      renderStrip();
    }
    isPanning = false;
  }

  viewport.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);

  viewport.addEventListener('touchstart', onPointerDown, { passive: false });
  window.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('touchend', onPointerUp);
}

// ========================================================
// 15. 초고화질 통합 프레임 합성 엔진 (2줄 나란히 1+1 복제 & 2×1×2 비대칭 지그재그)
// ========================================================
let finalEmbeddedQrImage = null;

function getCanvasDimensions(layout, cut, sideOffset, isVideo = false) {
  const isStrip = (layout === '1x4' || layout === '1x5' || layout === '1x6');
  if (isStrip) {
    const singleW = 1080 + sideOffset;
    const h = (cut === 4) ? 3240 : (cut === 5 ? 3900 : 4500);

    // 🌟 1x4, 1x5에서 2줄 나란히 모드이고 비디오 합성이 아닐 때 가로 2배 확장
    if (!isVideo && appState.stripPrintMode === 'double' && (layout === '1x4' || layout === '1x5')) {
      return { width: singleW * 2, height: h, singleWidth: singleW };
    }
    return { width: singleW, height: h, singleWidth: singleW };
  } else {
    return { width: 1440 + sideOffset, height: 2160, singleWidth: 1440 + sideOffset };
  }
}

// 🌟 단일 1열 스트립을 특정 X 오프셋에 그리는 모듈러 렌더러
function renderSingleStripColumn(ctx, startX, cW, cH, pad, gap, fStyle, title, cut, mediaList, isVideo) {
  const isZigzag = (fStyle === 'basic_zigzag');
  const isMiddle = (fStyle === 'basic_middle');
  const bannerH = isMiddle ? 180 : 0;
  const topH = (fStyle === 'basic_top') ? 140 : pad;
  const bottomH = (fStyle === 'basic_bottom') ? 220 : pad;
  const totalGaps = (cut - 1) * gap;
  const slotH = (cH - topH - bottomH - bannerH - totalGaps) / cut;

  if (fStyle === 'basic_top') {
    drawProHeader(ctx, startX + cW / 2, topH / 2, title);
  }

  const zigzagShift = isZigzag ? Math.round(pad * 1.2) : 0;
  const slotW = cW - (pad * 2) - zigzagShift;
  const bannerAfterIndex = (cut === 4) ? 1 : 0;
  const colSlotRects = [];

  for (let i = 0; i < cut; i++) {
    let sy = topH + (i * (slotH + gap));
    if (isMiddle && i > bannerAfterIndex) sy += bannerH + gap;

    let sx = startX + pad;
    if (isZigzag) sx = startX + ((i % 2 === 0) ? pad : pad + zigzagShift);

    colSlotRects.push({ x: sx, y: sy, w: slotW, h: slotH });
    drawFilteredSlotMedia(ctx, mediaList[i], sx, sy, slotW, slotH, i, isVideo);

    if (isMiddle && i === bannerAfterIndex) {
      const bannerY = sy + slotH + gap;
      drawProBanner(ctx, startX + cW / 2, bannerY + (bannerH / 2), title);
    }
  }

  if (fStyle === 'basic_bottom') {
    const footerY = (cH - bottomH) + (bottomH / 2);
    drawProFooter(ctx, startX + cW / 2, footerY, title);
  }

  return colSlotRects;
}

// 🌟 사진 캔버스와 비디오 렌더러가 100% 동기화하여 공유하는 통합 렌더러
function drawFrameComposite(ctx, canvasW, canvasH, mediaList, isVideo = false, isFinalExport = false) {
  const layout = appState.selectedCutLayout || '1x4';
  const cut = appState.selectedCutCount || 4;
  const fStyle = appState.frameStyle || 'basic_middle';
  const pad = (fStyle === 'basic_clean') ? Math.round(appState.frameThickness * 0.7) : (appState.frameThickness || 40);
  const gap = Math.round(pad * 0.45);
  const sigInp = document.getElementById('frameSignatureInput');
  const customTitle = sigInp ? sigInp.value : 'photoist';
  const sideOffset = appState.sideEngravingEnabled ? Math.max(45, Math.round(pad * 1.25)) : 0;

  // 1. 프레임 배경 채우기
  ctx.fillStyle = appState.frameColor || '#000000';
  ctx.fillRect(0, 0, canvasW, canvasH);

  let localSlotRects = [];

  // 2. 가로 1열 스트립 계열
  if (layout === '1x4' || layout === '1x5' || layout === '1x6') {
    const singleW = 1080 + sideOffset;
    const baseSingleCanvasW = singleW - sideOffset;

    // 🌟 1x4, 1x5에서 2줄 나란히 (1+1 복제) 인화 모드일 때
    if (!isVideo && appState.stripPrintMode === 'double' && (layout === '1x4' || layout === '1x5')) {
      // 1열(좌측) 렌더링
      const leftRects = renderSingleStripColumn(ctx, 0, baseSingleCanvasW, canvasH, pad, gap, fStyle, customTitle, cut, mediaList, isVideo);
      // 2열(우측) 1+1 완벽 복제 렌더링
      const rightRects = renderSingleStripColumn(ctx, singleW, baseSingleCanvasW, canvasH, pad, gap, fStyle, customTitle, cut, mediaList, isVideo);
      localSlotRects = leftRects;

      // 중앙 절취선 점선 가이드 그리기
      ctx.save();
      ctx.strokeStyle = (appState.typography.fontColor === '#FFFFFF') ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.25)';
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 12]);
      ctx.beginPath();
      ctx.moveTo(singleW, 0);
      ctx.lineTo(singleW, canvasH);
      ctx.stroke();
      ctx.restore();

      // 양쪽 열에 측면 각인과 QR코드 동일하게 복제
      if (appState.sideEngravingEnabled) {
        renderProSideEngravingCustom(ctx, singleW, leftRects, sideOffset);
        renderProSideEngravingCustom(ctx, canvasW, rightRects, sideOffset);
      }
      if (finalEmbeddedQrImage) {
        drawQrInsetBox(ctx, singleW, canvasH, pad);
        drawQrInsetBox(ctx, canvasW, canvasH, pad);
      }

    } else {
      // 1줄 단독 렌더링 (영상은 항상 1줄 단독으로 처리)
      localSlotRects = renderSingleStripColumn(ctx, 0, baseSingleCanvasW, canvasH, pad, gap, fStyle, customTitle, cut, mediaList, isVideo);

      if (appState.sideEngravingEnabled) {
        renderProSideEngravingCustom(ctx, canvasW, localSlotRects, sideOffset);
      }
      if (finalEmbeddedQrImage) {
        drawQrInsetBox(ctx, canvasW, canvasH, pad);
      }
    }

  } else {
    // 3. 세로형 2열 엽서/화보/그리드 계열
    const baseCanvasW = canvasW - sideOffset;
    const topH = (fStyle === 'basic_top') ? 130 : pad;
    const bottomH = (fStyle === 'basic_bottom') ? 210 : pad;

    if (fStyle === 'basic_top') {
      drawProHeader(ctx, baseCanvasW / 2, topH / 2, customTitle);
    }

    if (layout === '2x2') {
      const isMiddle = (fStyle === 'basic_middle');
      const bannerH = isMiddle ? 160 : 0;
      const slotW = (baseCanvasW - (pad * 2) - gap) / 2;
      const slotH = (canvasH - topH - bottomH - bannerH - gap) / 2;
      const coords = [
        { x: pad, y: topH },
        { x: pad + slotW + gap, y: topH },
        { x: pad, y: topH + slotH + gap + bannerH },
        { x: pad + slotW + gap, y: topH + slotH + gap + bannerH }
      ];

      for (let i = 0; i < 4; i++) {
        localSlotRects.push({ x: coords[i].x, y: coords[i].y, w: slotW, h: slotH });
        drawFilteredSlotMedia(ctx, mediaList[i], coords[i].x, coords[i].y, slotW, slotH, i, isVideo);
      }

      if (isMiddle) {
        const bannerY = topH + slotH + (gap / 2);
        drawProBanner(ctx, baseCanvasW / 2, bannerY + (bannerH / 2), customTitle);
      }

    } else if (layout === '2x1x2') {
      // 🌟 2×1×2 프레임: 지그재그 테마 시 상단 60:40, 하단 40:60 비대칭 교차 렌더링
      const isMiddle = (fStyle === 'basic_middle');
      const isZigzag = (fStyle === 'basic_zigzag');
      const bannerH = isMiddle ? 140 : 0;
      const availH = canvasH - topH - bottomH - bannerH - (gap * 2);
      const row1H = availH * 0.31;
      const row2H = availH * 0.38;
      const row3H = availH * 0.31;
      const availW = baseCanvasW - (pad * 2) - gap;
      const heroW = baseCanvasW - (pad * 2);

      // 상단 2장 너비 분할 (지그재그 시 62% : 38%)
      const r1LeftW = isZigzag ? Math.round(availW * 0.62) : Math.round(availW * 0.5);
      const r1RightW = availW - r1LeftW;

      localSlotRects.push({ x: pad, y: topH, w: r1LeftW, h: row1H });
      localSlotRects.push({ x: pad + r1LeftW + gap, y: topH, w: r1RightW, h: row1H });
      drawFilteredSlotMedia(ctx, mediaList[0], pad, topH, r1LeftW, row1H, 0, isVideo);
      drawFilteredSlotMedia(ctx, mediaList[1], pad + r1LeftW + gap, topH, r1RightW, row1H, 1, isVideo);

      let heroY = topH + row1H + gap;
      if (isMiddle) {
        drawProBanner(ctx, baseCanvasW / 2, heroY + (bannerH / 2), customTitle);
        heroY += bannerH + gap;
      }

      // 중단 1장 대형 와이드 히어로 컷
      localSlotRects.push({ x: pad, y: heroY, w: heroW, h: row2H });
      drawFilteredSlotMedia(ctx, mediaList[2], pad, heroY, heroW, row2H, 2, isVideo);

      // 하단 2장 너비 분할 (지그재그 시 상단과 반대로 38% : 62% 교차)
      const r3LeftW = isZigzag ? Math.round(availW * 0.38) : Math.round(availW * 0.5);
      const r3RightW = availW - r3LeftW;
      const row3Y = heroY + row2H + gap;

      localSlotRects.push({ x: pad, y: row3Y, w: r3LeftW, h: row3H });
      localSlotRects.push({ x: pad + r3LeftW + gap, y: row3Y, w: r3RightW, h: row3H });
      drawFilteredSlotMedia(ctx, mediaList[3], pad, row3Y, r3LeftW, row3H, 3, isVideo);
      drawFilteredSlotMedia(ctx, mediaList[4], pad + r3LeftW + gap, row3Y, r3RightW, row3H, 4, isVideo);

    } else if (layout === '1x2x2') {
      const isMiddle = (fStyle === 'basic_middle');
      const bannerH = isMiddle ? 140 : 0;
      const availH = canvasH - topH - bottomH - bannerH - (gap * 2);
      const row1H = availH * 0.38;
      const row2H = availH * 0.31;
      const row3H = availH * 0.31;
      const heroW = baseCanvasW - (pad * 2);
      const smallW = (baseCanvasW - (pad * 2) - gap) / 2;

      localSlotRects.push({ x: pad, y: topH, w: heroW, h: row1H });
      drawFilteredSlotMedia(ctx, mediaList[0], pad, topH, heroW, row1H, 0, isVideo);

      let row2Y = topH + row1H + gap;
      if (isMiddle) {
        drawProBanner(ctx, baseCanvasW / 2, row2Y + (bannerH / 2), customTitle);
        row2Y += bannerH + gap;
      }

      localSlotRects.push({ x: pad, y: row2Y, w: smallW, h: row2H });
      localSlotRects.push({ x: pad + smallW + gap, y: row2Y, w: smallW, h: row2H });
      drawFilteredSlotMedia(ctx, mediaList[1], pad, row2Y, smallW, row2H, 1, isVideo);
      drawFilteredSlotMedia(ctx, mediaList[2], pad + smallW + gap, row2Y, smallW, row2H, 2, isVideo);

      const row3Y = row2Y + row2H + gap;
      localSlotRects.push({ x: pad, y: row3Y, w: smallW, h: row3H });
      localSlotRects.push({ x: pad + smallW + gap, y: row3Y, w: smallW, h: row3H });
      drawFilteredSlotMedia(ctx, mediaList[3], pad, row3Y, smallW, row3H, 3, isVideo);
      drawFilteredSlotMedia(ctx, mediaList[4], pad + smallW + gap, row3Y, smallW, row3H, 4, isVideo);

    } else if (layout === '2x2x2') {
      const isMiddle = (fStyle === 'basic_middle');
      const bannerH = isMiddle ? 130 : 0;
      const availH = canvasH - topH - bottomH - bannerH - (gap * 2);
      const slotW = (baseCanvasW - (pad * 2) - gap) / 2;
      const slotH = availH / 3;

      localSlotRects.push({ x: pad, y: topH, w: slotW, h: slotH });
      localSlotRects.push({ x: pad + slotW + gap, y: topH, w: slotW, h: slotH });
      drawFilteredSlotMedia(ctx, mediaList[0], pad, topH, slotW, slotH, 0, isVideo);
      drawFilteredSlotMedia(ctx, mediaList[1], pad + slotW + gap, topH, slotW, slotH, 1, isVideo);

      let row2Y = topH + slotH + gap;
      if (isMiddle) {
        drawProBanner(ctx, baseCanvasW / 2, row2Y + (bannerH / 2), customTitle);
        row2Y += bannerH + gap;
      }

      localSlotRects.push({ x: pad, y: row2Y, w: slotW, h: slotH });
      localSlotRects.push({ x: pad + slotW + gap, y: row2Y, w: slotW, h: slotH });
      drawFilteredSlotMedia(ctx, mediaList[2], pad, row2Y, slotW, slotH, 2, isVideo);
      drawFilteredSlotMedia(ctx, mediaList[3], pad + slotW + gap, row2Y, slotW, slotH, 3, isVideo);

      const row3Y = row2Y + row2H + gap;
      localSlotRects.push({ x: pad, y: row3Y, w: slotW, h: slotH });
      localSlotRects.push({ x: pad + slotW + gap, y: row3Y, w: slotW, h: slotH });
      drawFilteredSlotMedia(ctx, mediaList[4], pad, row3Y, slotW, slotH, 4, isVideo);
      drawFilteredSlotMedia(ctx, mediaList[5], pad + slotW + gap, row3Y, slotW, slotH, 5, isVideo);
    }

    if (fStyle === 'basic_bottom') {
      const footerY = (canvasH - bottomH) + (bottomH / 2);
      drawProFooter(ctx, baseCanvasW / 2, footerY, customTitle);
    }

    if (appState.sideEngravingEnabled) {
      renderProSideEngravingCustom(ctx, canvasW, localSlotRects, sideOffset);
    }
    if (finalEmbeddedQrImage) {
      drawQrInsetBox(ctx, canvasW, canvasH, pad);
    }
  }

  // 4. 텍스트 스티커 렌더링
  appState.stickers.forEach((st, idx) => {
    ctx.save();
    ctx.translate(st.x, st.y);
    ctx.rotate(((st.rotation || 0) * Math.PI) / 180);

    const fontName = st.fontFamily || 'Pretendard';
    ctx.font = `900 ${st.size}px '${fontName}', sans-serif`;
    ctx.fillStyle = st.color || appState.typography.fontColor || '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(st.text, 0, 0);

    if (!isFinalExport && !isVideo && idx === appState.selectedStickerIdx) {
      ctx.strokeStyle = '#F43F5E';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      const boundW = st.size * 1.1;
      ctx.strokeRect(-boundW, -st.size * 0.6, boundW * 2, st.size * 1.2);
    }
    ctx.restore();
  });

  return localSlotRects;
}

function renderStrip(isFinalExport = false) {
  const canvas = document.getElementById('photoCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const layout = appState.selectedCutLayout || '1x4';
  const cut = appState.selectedCutCount || 4;
  const sideOffset = appState.sideEngravingEnabled ? Math.max(45, Math.round(appState.frameThickness * 1.25)) : 0;
  const dims = getCanvasDimensions(layout, cut, sideOffset, false);

  canvas.width = dims.width;
  canvas.height = dims.height;

  appState.slotRects = drawFrameComposite(ctx, canvas.width, canvas.height, appState.selectedImages, false, isFinalExport);
}

function drawFilteredSlotMedia(ctx, media, targetX, targetY, targetW, targetH, slotIdx, isVideo) {
  if (!media) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(targetX, targetY, targetW, targetH);
  ctx.clip();

  const srcW = media.videoWidth || media.width || 1920;
  const srcH = media.videoHeight || media.height || 1080;
  const srcRatio = srcW / srcH;
  const targetRatio = targetW / targetH;
  let renderW, renderH;

  if (srcRatio > targetRatio) {
    renderH = targetH;
    renderW = targetH * srcRatio;
  } else {
    renderW = targetW;
    renderH = targetW / srcRatio;
  }

  const panOffset = (typeof slotIdx === 'number' && appState.slotPanOffsets[slotIdx]) ? appState.slotPanOffsets[slotIdx] : 0;
  const maxPanDiff = Math.max(0, (renderW - targetW) / 2);
  const panShiftX = maxPanDiff * (panOffset / 100);

  const drawX = targetX + (targetW - renderW) / 2 + panShiftX;
  const drawY = targetY + (targetH - renderH) / 2;

  if (isVideo) {
    if (appState.facingMode === 'user') {
      ctx.translate(targetX + targetW, targetY);
      ctx.scale(-1, 1);
      const flippedDrawX = (targetW - renderW) / 2 - panShiftX;
      ctx.drawImage(media, flippedDrawX, 0, renderW, renderH);
    } else {
      ctx.drawImage(media, drawX, drawY, renderW, renderH);
    }
  } else {
    const isNormal = appState.activeFilter === 'normal' &&
      appState.filters.bright === 100 &&
      appState.filters.contrast === 100 &&
      appState.filters.saturate === 100;

    if (isNormal) {
      ctx.drawImage(media, drawX, drawY, renderW, renderH);
    } else {
      try {
        const off = document.createElement('canvas');
        const cw = Math.max(1, Math.round(renderW));
        const ch = Math.max(1, Math.round(renderH));
        off.width = cw;
        off.height = ch;
        const offCtx = off.getContext('2d');
        offCtx.drawImage(media, 0, 0, cw, ch);
        const imgData = offCtx.getImageData(0, 0, cw, ch);
        applyPixelFilterMath(imgData, appState.activeFilter, appState.filters);
        offCtx.putImageData(imgData, 0, 0);
        ctx.drawImage(off, drawX, drawY, renderW, renderH);
      } catch (e) {
        ctx.drawImage(media, drawX, drawY, renderW, renderH);
      }
    }
  }
  ctx.restore();
}

function drawProHeader(ctx, centerX, centerY, title) {
  const textColor = appState.typography.fontColor || '#FFFFFF';
  ctx.save();
  ctx.fillStyle = textColor;
  ctx.font = `900 42px '${appState.typography.fontFamily}', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, centerX, centerY);
  ctx.restore();
}

function drawProBanner(ctx, centerX, centerY, title) {
  const textColor = appState.typography.fontColor || '#FFFFFF';
  const showDate = appState.showDate;
  const size = 38;
  const dateSize = 18;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = textColor;

  if (showDate) {
    ctx.font = `900 ${size}px '${appState.typography.fontFamily}', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(title, centerX, centerY - 12);

    ctx.font = `normal ${dateSize}px '${appState.typography.fontFamily}', sans-serif`;
    ctx.globalAlpha = 0.8;
    ctx.fillText(appState.typography.date, centerX, centerY + 18);
  } else {
    ctx.font = `900 ${size}px '${appState.typography.fontFamily}', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(title, centerX, centerY);
  }
  ctx.restore();
}

function drawProFooter(ctx, centerX, centerY, title) {
  drawProBanner(ctx, centerX, centerY, title);
}

function renderProSideEngravingCustom(ctx, canvasW, slotRects, sideOffset) {
  if (!slotRects || slotRects.length === 0) return;
  const textColor = appState.typography.fontColor || '#FFFFFF';
  const baseText = appState.sideEngravingText || "#PHOTOIST";
  const fontScale = Math.max(16, Math.min(32, Math.round(sideOffset * 0.42)));

  ctx.save();
  ctx.fillStyle = textColor;
  ctx.font = `bold ${fontScale}px monospace`;
  ctx.letterSpacing = "3px";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  slotRects.forEach((rect, sIdx) => {
    const slotCenterY = rect.y + rect.h / 2;
    const textPosX = canvasW - (sideOffset / 2);

    ctx.save();
    ctx.translate(textPosX, slotCenterY);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(`${baseText} • 0${sIdx + 1}`, 0, 0);
    ctx.restore();
  });

  ctx.restore();
}

function drawQrInsetBox(ctx, canvasW, canvasH, pad) {
  const qrBoxSize = 130;
  const margin = Math.round(pad * 0.5);
  const qx = canvasW - qrBoxSize - margin;
  const qy = canvasH - qrBoxSize - margin;

  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 10;
  ctx.fillRect(qx, qy, qrBoxSize, qrBoxSize);

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 0;
  ctx.strokeRect(qx, qy, qrBoxSize, qrBoxSize);

  ctx.drawImage(finalEmbeddedQrImage, qx + 7, qy + 7, qrBoxSize - 14, qrBoxSize - 25);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('사진 다운로드', qx + (qrBoxSize / 2), qy + qrBoxSize - 9);
  ctx.restore();
}

// ========================================================
// 16. 3종 비디오 분리 엔진 (2.0배속 부메랑 / 2.0배속 사진영상 / 3.0배속 타임랩스)
// ========================================================
let currentMediaBlobs = {
  loop: null,        // 2.0배속 왕복 부메랑 비디오
  videoFrame: null,  // 2.0배속 정방향 루프 사진영상
  timelapse: null,   // 3.0배속 전과정 통녹화 타임랩스
  photoUrl: ""
};

// 🌟 촬영된 4~8초 전체 길이 클립을 균등 샘플링하여 프레임 버퍼 추출 (검은 화면 0% 보장)
async function extractSlotFrames(blob, count = 30) {
  return new Promise((resolve) => {
    if (!blob) return resolve([]);
    const v = document.createElement('video');
    v.src = URL.createObjectURL(blob);
    v.muted = true;
    v.playsInline = true;

    v.onloadedmetadata = async () => {
      const frames = [];
      const dur = Math.max(v.duration || 4.0, 1.0);
      const step = dur / count;
      const off = document.createElement('canvas');
      off.width = 480;
      off.height = Math.round(480 / ((v.videoWidth || 1920) / (v.videoHeight || 1080)));
      const offCtx = off.getContext('2d');

      for (let i = 0; i < count; i++) {
        v.currentTime = Math.min(dur - 0.05, i * step);
        await new Promise(r => {
          const onSeek = () => { v.removeEventListener('seeked', onSeek); r(); };
          v.addEventListener('seeked', onSeek);
          setTimeout(r, 120);
        });

        offCtx.drawImage(v, 0, 0, off.width, off.height);
        const copy = document.createElement('canvas');
        copy.width = off.width;
        copy.height = off.height;
        copy.getContext('2d').drawImage(off, 0, 0);
        frames.push(copy);
      }
      resolve(frames);
    };

    v.onerror = () => resolve([]);
  });
}

async function generateMovingVideosAndOpenViewer() {
  const hasValidBlobs = appState.selectedIndices.every(idx => idx !== null && appState.shotVideoBlobs[idx]);
  if (!hasValidBlobs) {
    alert("촬영 비디오 데이터가 부족합니다.\n부스에서 사진을 직접 연속 촬영했을 때 모션 영상 생성이 가능합니다.");
    return;
  }

  const btn = document.getElementById('btnAutoVideo');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>3종 비디오 분리 합성 중...</span>`;
    if (window.lucide) lucide.createIcons();
  }

  try {
    // 1. 메인 사진 데이터 URL 인출
    renderStrip(false);
    const mainCanvas = document.getElementById('photoCanvas');
    if (mainCanvas) {
      currentMediaBlobs.photoUrl = mainCanvas.toDataURL('image/jpeg', 0.95);
    }

    // 2. 🌟 4~8초 전체 클립 기반 30프레임 고해상도 버퍼 추출
    const allSlotFrameBuffers = await Promise.all(
      appState.selectedIndices.map(shotIdx => extractSlotFrames(appState.shotVideoBlobs[shotIdx], 30))
    );

    // 3. 비디오 캔버스 준비 (🌟 비디오는 2줄 인화 모드여도 무조건 1줄 폭으로 단독 렌더링!)
    const layout = appState.selectedCutLayout;
    const cut = appState.selectedCutCount;
    const sideOffset = appState.sideEngravingEnabled ? Math.max(45, Math.round(appState.frameThickness * 1.25)) : 0;
    const videoDims = getCanvasDimensions(layout, cut, sideOffset, true); // isVideo = true

    const vCanvas = document.createElement('canvas');
    vCanvas.width = videoDims.width;
    vCanvas.height = videoDims.height;
    const vCtx = vCanvas.getContext('2d');

    let mimeType = 'video/mp4';
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9'))
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
    }

    // 🌟 A. 2.0배속 왕복 부메랑 비디오 합성 (전진 4초 -> 후진 4초 = 총 8초)
    const streamBoomerang = vCanvas.captureStream(30);
    const recBoomerang = new MediaRecorder(streamBoomerang, { mimeType, videoBitsPerSecond: 15000000 });
    const chunksBoomerang = [];
    recBoomerang.ondataavailable = e => { if (e.data && e.data.size > 0) chunksBoomerang.push(e.data); };

    await new Promise((resolve) => {
      recBoomerang.onstop = () => {
        currentMediaBlobs.loop = new Blob(chunksBoomerang, { type: mimeType });
        resolve();
      };
      recBoomerang.start();

      const boomerangSeq = [];
      for (let f = 0; f < 30; f++) boomerangSeq.push(f);
      for (let f = 28; f >= 1; f--) boomerangSeq.push(f);
      const totalTicks = boomerangSeq.length * 2;
      let tick = 0;

      function stepBoomerang() {
        if (tick < totalTicks) {
          const fIdx = boomerangSeq[tick % boomerangSeq.length];
          const curMedia = allSlotFrameBuffers.map((frames, sIdx) => frames[fIdx] || appState.selectedImages[sIdx]);
          drawFrameComposite(vCtx, vCanvas.width, vCanvas.height, curMedia, true, true);
          tick++;
          requestAnimationFrame(stepBoomerang);
        } else {
          recBoomerang.stop();
        }
      }
      requestAnimationFrame(stepBoomerang);
    });

    // 🌟 B. 2.0배속 정방향 루프 사진영상(Framed Video) 별도 합성
    const streamFramed = vCanvas.captureStream(30);
    const recFramed = new MediaRecorder(streamFramed, { mimeType, videoBitsPerSecond: 15000000 });
    const chunksFramed = [];
    recFramed.ondataavailable = e => { if (e.data && e.data.size > 0) chunksFramed.push(e.data); };

    await new Promise((resolve) => {
      recFramed.onstop = () => {
        currentMediaBlobs.videoFrame = new Blob(chunksFramed, { type: mimeType });
        resolve();
      };
      recFramed.start();

      const totalForwardTicks = 30 * 2;
      let fTick = 0;

      function stepForward() {
        if (fTick < totalForwardTicks) {
          const fIdx = fTick % 30;
          const curMedia = allSlotFrameBuffers.map((frames, sIdx) => frames[fIdx] || appState.selectedImages[sIdx]);
          drawFrameComposite(vCtx, vCanvas.width, vCanvas.height, curMedia, true, true);
          fTick++;
          requestAnimationFrame(stepForward);
        } else {
          recFramed.stop();
        }
      }
      requestAnimationFrame(stepForward);
    });

    // 🌟 C. 3.0배속 전과정 통녹화 타임랩스 비디오 합성
    await buildTimelapseVideo30x();

    // 4. 🌟 스마트폰 QR 사진 직결 파이프라인 가동
    await syncMediaToCloudAndGenerateQR();

    // 5. 촬영 기기 전용 다크 뷰어 모달 호출
    openPixxViewer();

  } catch (err) {
    alert("영상 생성 중 오류가 발생했습니다: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="film" class="w-4 h-4"></i><span>🎬 2.0배속 부메랑 & 3.0배속 타임랩스 생성 (뷰어 열기)</span>`;
      if (window.lucide) lucide.createIcons();
    }
  }
}

// 🌟 3.0배속 전과정 촬영 타임랩스 비디오 빌더
function buildTimelapseVideo30x() {
  return new Promise((resolve) => {
    const rawBlob = appState.fullSessionVideoBlob || appState.shotVideoBlobs[0];
    if (!rawBlob) {
      currentMediaBlobs.timelapse = currentMediaBlobs.loop;
      resolve();
      return;
    }

    const tempV = document.createElement('video');
    tempV.src = URL.createObjectURL(rawBlob);
    tempV.muted = true;
    tempV.playsInline = true;
    tempV.playbackRate = 3.0; // 3.0배속

    tempV.onloadedmetadata = () => {
      const tlCanvas = document.createElement('canvas');
      tlCanvas.width = 1280;
      tlCanvas.height = 720;
      const tlCtx = tlCanvas.getContext('2d');

      let mimeType = 'video/mp4';
      if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9'))
          ? 'video/webm;codecs=vp9'
          : 'video/webm';
      }

      const stream = tlCanvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 10000000 });
      const tlChunks = [];

      recorder.ondataavailable = e => { if (e.data && e.data.size > 0) tlChunks.push(e.data); };
      recorder.onstop = () => {
        currentMediaBlobs.timelapse = new Blob(tlChunks, { type: mimeType });
        resolve();
      };

      recorder.start();
      tempV.play().catch(() => {});

      function stepTl() {
        if (!tempV.ended && !tempV.paused) {
          tlCtx.drawImage(tempV, 0, 0, tlCanvas.width, tlCanvas.height);
          requestAnimationFrame(stepTl);
        } else {
          recorder.stop();
        }
      }
      tempV.onended = () => {
        if (recorder.state === 'recording') recorder.stop();
      };
      requestAnimationFrame(stepTl);
    };

    tempV.onerror = () => {
      currentMediaBlobs.timelapse = currentMediaBlobs.loop;
      resolve();
    };
  });
}

// 🌟 스마트폰 QR 스캔 시 사진만 100% 직결 다운로드되는 클라우드 파이프라인
async function syncMediaToCloudAndGenerateQR() {
  let photoRemoteUrl = "";

  if (GOOGLE_DB_URL && currentMediaBlobs.photoUrl) {
    try {
      const uploadRes = await fetch(GOOGLE_DB_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'UPLOAD_FULL_BUNDLE',
          photoBase64: currentMediaBlobs.photoUrl,
          date: getFormattedTodayDate(),
          archiveId: Date.now()
        })
      }).then(r => r.json());

      if (uploadRes && uploadRes.success) {
        photoRemoteUrl = uploadRes.photoUrl || "";
      }
    } catch (e) {}
  }

  // QR코드에 원본 사진 URL만 파라미터로 실어 스마트폰에서 사진만 즉시 열리도록 구성
  const baseUrl = window.location.href.split('?')[0];
  let qrTargetUrl = `${baseUrl}?view=pixx&id=${Date.now()}`;
  if (photoRemoteUrl) {
    qrTargetUrl += `&img=${encodeURIComponent(photoRemoteUrl)}`;
  }

  await cacheQrImageFromUrl(qrTargetUrl);
  renderStrip(false);

  const mainCanvas = document.getElementById('photoCanvas');
  if (mainCanvas) {
    currentMediaBlobs.photoUrl = mainCanvas.toDataURL('image/jpeg', 0.95);
  }
}

function cacheQrImageFromUrl(url) {
  return new Promise((resolve) => {
    const tempDiv = document.createElement('div');
    new QRCode(tempDiv, {
      text: url,
      width: 140,
      height: 140,
      correctLevel: QRCode.CorrectLevel.M
    });

    setTimeout(() => {
      const qrCanvas = tempDiv.querySelector('canvas');
      if (qrCanvas) {
        const img = new Image();
        img.onload = () => {
          finalEmbeddedQrImage = img;
          resolve();
        };
        img.src = qrCanvas.toDataURL('image/png');
      } else {
        resolve();
      }
    }, 150);
  });
}

// ========================================================
// 17. 기기 다운로드 & 구글 클라우드 무소음 자동 백업 파이프라인
// ========================================================
async function saveMediaWithSilentCloud(type) {
  const canvas = document.getElementById('photoCanvas');
  if (!canvas) return;

  if (type === 'photo') {
    if (!finalEmbeddedQrImage) {
      const directUrl = `${window.location.href.split('?')[0]}?view=pixx&id=${Date.now()}`;
      await cacheQrImageFromUrl(directUrl);
    }

    renderStrip(true);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const isDouble = (appState.stripPrintMode === 'double' && (appState.selectedCutLayout === '1x4' || appState.selectedCutLayout === '1x5'));
      const fileName = `[Photoist_Pro_${isDouble ? '2줄복제인화' : '1줄인화'}]_${Date.now()}.png`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast(`📷 ${isDouble ? '2줄 복제 사진' : '촬영 사진'}이 기기에 저장되었습니다.`);
      silentBackupToGoogleDrive(blob, 'image');
    }, 'image/png');

  } else if (type === 'loop') {
    if (!currentMediaBlobs.loop) {
      alert("부메랑 영상을 먼저 생성해 주세요!");
      return;
    }

    const ext = currentMediaBlobs.loop.type.includes('mp4') ? 'mp4' : 'webm';
    const fileName = `[Photoist_Pro_부메랑영상]_${Date.now()}.${ext}`;

    const url = URL.createObjectURL(currentMediaBlobs.loop);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showToast("🎬 2.0배속 부메랑 영상이 저장되었습니다.");
  }
}

function silentBackupToGoogleDrive(blob, fileType) {
  if (!GOOGLE_DB_URL || !blob) return;
  const reader = new FileReader();
  reader.onloadend = () => {
    try {
      fetch(GOOGLE_DB_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: fileType === 'video' ? 'UPLOAD_MOVING_VIDEO' : 'SAVE_ARCHIVE',
          videoBase64: reader.result,
          userId: 'photoist_user',
          cutCount: appState.selectedCutCount,
          date: getFormattedTodayDate(),
          archiveId: Date.now()
        })
      }).catch(() => {});
    } catch (e) {}
  };
  reader.readAsDataURL(blob);
}

// ========================================================
// 18. PIXX 스타일 다크 그레이/블랙 모바일 다운로드 뷰어 엔진
// ========================================================
let activePixxViewMode = 'loop';

function openPixxViewer() {
  showScreen('screenPixxViewer');

  const jpgView = document.getElementById('pixxJpgView');
  const movieView = document.getElementById('pixxMovieView');
  const tlView = document.getElementById('pixxTimelapseView');
  const framedView = document.getElementById('pixxFramedView');
  const timeEl = document.getElementById('pixxTimeDisplay');

  if (timeEl) timeEl.textContent = formatPixxDateTime(new Date());

  if (jpgView && currentMediaBlobs.photoUrl) {
    jpgView.src = currentMediaBlobs.photoUrl;
  }

  if (movieView && currentMediaBlobs.loop) {
    movieView.src = URL.createObjectURL(currentMediaBlobs.loop);
    movieView.load();
    movieView.play().catch(() => {});
  }

  if (framedView && currentMediaBlobs.videoFrame) {
    framedView.src = URL.createObjectURL(currentMediaBlobs.videoFrame);
    framedView.load();
  }

  if (tlView && currentMediaBlobs.timelapse) {
    tlView.src = URL.createObjectURL(currentMediaBlobs.timelapse);
    tlView.load();
  }

  togglePixxMediaView('loop');
}

function togglePixxMediaView(target) {
  const jpgView = document.getElementById('pixxJpgView');
  const movieView = document.getElementById('pixxMovieView');
  const tlView = document.getElementById('pixxTimelapseView');
  const framedView = document.getElementById('pixxFramedView');

  if (target === 'photo') {
    activePixxViewMode = 'photo';
    if (movieView) { movieView.pause(); movieView.style.display = 'none'; }
    if (tlView) { tlView.pause(); tlView.style.display = 'none'; }
    if (framedView) { framedView.pause(); framedView.style.display = 'none'; }
    if (jpgView) jpgView.style.display = 'block';
  } else if (target === 'timelapse') {
    activePixxViewMode = 'timelapse';
    if (jpgView) jpgView.style.display = 'none';
    if (movieView) { movieView.pause(); movieView.style.display = 'none'; }
    if (framedView) { framedView.pause(); framedView.style.display = 'none'; }
    if (tlView) { tlView.style.display = 'block'; tlView.play().catch(() => {}); }
  } else if (target === 'loop') {
    activePixxViewMode = 'loop';
    if (jpgView) jpgView.style.display = 'none';
    if (tlView) { tlView.pause(); tlView.style.display = 'none'; }
    if (framedView) { framedView.pause(); framedView.style.display = 'none'; }
    if (movieView) { movieView.style.display = 'block'; movieView.play().catch(() => {}); }
  }
}

// 🌟 촬영 기기 전용 4종 다운로드 처리 (타임랩스 / 부메랑 / 사진영상 / 촬영사진)
function downloadPixxMediaItem(type) {
  if (type === 'timelapse') {
    const blob = currentMediaBlobs.timelapse || currentMediaBlobs.loop;
    if (blob) {
      triggerDirectFileDownload(blob, `PIXX_Timelapse_${Date.now()}.mp4`);
    } else {
      alert("다운로드 가능한 타임랩스 영상이 없습니다.");
    }
  } else if (type === 'loop') {
    const blob = currentMediaBlobs.loop;
    if (blob) {
      triggerDirectFileDownload(blob, `PIXX_Boomerang_${Date.now()}.mp4`);
    } else {
      alert("다운로드 가능한 부메랑 영상이 없습니다.");
    }
  } else if (type === 'videoFrame') {
    const blob = currentMediaBlobs.videoFrame || currentMediaBlobs.loop;
    if (blob) {
      triggerDirectFileDownload(blob, `PIXX_FramedVideo_${Date.now()}.mp4`);
    } else {
      alert("다운로드 가능한 사진 영상이 없습니다.");
    }
  } else if (type === 'photo') {
    const mainCanvas = document.getElementById('photoCanvas');
    const dataUrl = currentMediaBlobs.photoUrl || (mainCanvas ? mainCanvas.toDataURL('image/jpeg', 0.95) : '');
    if (dataUrl) {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `PIXX_Photo_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert("다운로드 가능한 사진이 없습니다.");
    }
  }
}

function triggerDirectFileDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function returnFromPixxToEditor() {
  const movieView = document.getElementById('pixxMovieView');
  const tlView = document.getElementById('pixxTimelapseView');
  const framedView = document.getElementById('pixxFramedView');
  if (movieView) movieView.pause();
  if (tlView) tlView.pause();
  if (framedView) framedView.pause();

  showScreen('screenEdit');
  renderStrip();
}

function formatPixxDateTime(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${year}. ${month}. ${day} ${String(hour).padStart(2, '0')}:${min}`;
}

// ========================================================
// 19. 실행취소(Undo/Redo), 뷰포트 dvh 보정 & 초기 구동 엔트리포인트
// ========================================================
function saveStateForUndo() {
  const snapshot = JSON.stringify({
    stickers: appState.stickers,
    selectedCutLayout: appState.selectedCutLayout,
    selectedCutCount: appState.selectedCutCount,
    stripPrintMode: appState.stripPrintMode,
    slotPanOffsets: appState.slotPanOffsets,
    frameStyle: appState.frameStyle,
    frameThickness: appState.frameThickness,
    frameColor: appState.frameColor,
    activeFilter: appState.activeFilter,
    filters: appState.filters,
    showDate: appState.showDate,
    sideEngravingEnabled: appState.sideEngravingEnabled,
    sideEngravingText: appState.sideEngravingText,
    customTitle: document.getElementById('frameSignatureInput') ? document.getElementById('frameSignatureInput').value : ''
  });
  historyStack.push(snapshot);
  if (historyStack.length > 30) historyStack.shift();
  redoStack = [];
}

function undo() {
  if (historyStack.length === 0) return;
  const currentSnap = JSON.stringify({
    stickers: appState.stickers,
    selectedCutLayout: appState.selectedCutLayout,
    selectedCutCount: appState.selectedCutCount,
    stripPrintMode: appState.stripPrintMode,
    slotPanOffsets: appState.slotPanOffsets,
    frameStyle: appState.frameStyle,
    frameThickness: appState.frameThickness,
    frameColor: appState.frameColor,
    activeFilter: appState.activeFilter,
    filters: appState.filters,
    showDate: appState.showDate,
    sideEngravingEnabled: appState.sideEngravingEnabled,
    sideEngravingText: appState.sideEngravingText,
    customTitle: document.getElementById('frameSignatureInput') ? document.getElementById('frameSignatureInput').value : ''
  });
  redoStack.push(currentSnap);
  applySnapshot(JSON.parse(historyStack.pop()));
}

function redo() {
  if (redoStack.length === 0) return;
  const currentSnap = JSON.stringify({
    stickers: appState.stickers,
    selectedCutLayout: appState.selectedCutLayout,
    selectedCutCount: appState.selectedCutCount,
    stripPrintMode: appState.stripPrintMode,
    slotPanOffsets: appState.slotPanOffsets,
    frameStyle: appState.frameStyle,
    frameThickness: appState.frameThickness,
    frameColor: appState.frameColor,
    activeFilter: appState.activeFilter,
    filters: appState.filters,
    showDate: appState.showDate,
    sideEngravingEnabled: appState.sideEngravingEnabled,
    sideEngravingText: appState.sideEngravingText,
    customTitle: document.getElementById('frameSignatureInput') ? document.getElementById('frameSignatureInput').value : ''
  });
  historyStack.push(currentSnap);
  applySnapshot(JSON.parse(redoStack.pop()));
}

function applySnapshot(snap) {
  appState.stickers = snap.stickers || [];
  appState.selectedCutLayout = snap.selectedCutLayout || '1x4';
  appState.selectedCutCount = snap.selectedCutCount || 4;
  appState.stripPrintMode = snap.stripPrintMode || 'single';
  appState.slotPanOffsets = snap.slotPanOffsets || [0, 0, 0, 0, 0, 0];
  appState.frameStyle = snap.frameStyle;
  appState.frameThickness = snap.frameThickness;
  appState.frameColor = snap.frameColor;
  appState.activeFilter = snap.activeFilter;
  appState.filters = snap.filters;
  appState.showDate = snap.showDate;
  appState.sideEngravingEnabled = snap.sideEngravingEnabled || false;
  appState.sideEngravingText = snap.sideEngravingText || "";

  if (document.getElementById('frameSignatureInput')) {
    document.getElementById('frameSignatureInput').value = snap.customTitle || '';
  }
  const sideToggle = document.getElementById('sideEngravingToggle');
  if (sideToggle) sideToggle.checked = appState.sideEngravingEnabled;
  renderStrip();
}

function updateAppVh() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--app-vh', `${vh}px`);
}

// 🌟 URL 쿼리 감지: 스마트폰 QR 스캔 접속 시 사진만 즉시 표출
function checkUrlQueryForPixxViewer() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('view') === 'pixx' || urlParams.get('id')) {
    const remoteImg = urlParams.get('img');

    if (remoteImg) {
      currentMediaBlobs.photoUrl = decodeURIComponent(remoteImg);
    }

    // 스마트폰 접속 환경: 비디오 플레이어 및 복잡한 버튼 숨기고 '사진' 전용 뷰어 자동 활성화
    const phoneArea = document.getElementById('pixxPhoneDownloadArea');
    const deviceStack = document.getElementById('pixxDeviceActionStack');
    const deviceGrid = document.getElementById('pixxDeviceDownloadGrid');
    const returnBtn = document.getElementById('pixxReturnBtnWrapper');

    if (phoneArea) phoneArea.classList.remove('hidden');
    if (deviceStack) deviceStack.classList.add('hidden');
    if (deviceGrid) deviceGrid.classList.add('hidden');
    if (returnBtn) returnBtn.classList.add('hidden');

    openPixxViewer();
    togglePixxMediaView('photo');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  updateAppVh();
  initCanvasInteractions();
  setupCanvasPinchZoom();
  setupAdminLongPressTrigger();
  checkVersionUpdateAutoNotice();
  checkUrlQueryForPixxViewer();

  // 저장된 공지사항 복원
  const savedNotice = localStorage.getItem('photoist_pro_notice');
  if (savedNotice) {
    try {
      appState.adminNotice = JSON.parse(savedNotice);
      applyNoticeToHomeBanner();
    } catch (e) {}
  }

  // 저장된 UI 테마 복원
  const savedTheme = localStorage.getItem('photoist_pro_theme') || 'white';
  applyThemeMode(savedTheme, null);

  if (typeof renderStrip === 'function') {
    renderStrip();
  }
});
