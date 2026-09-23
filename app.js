/**
 * 추억의 네컷 Studio Pro v17.0 Pro
 * [통합 엔진 전체 소스코드]
 * - 관리자 마스터 계정(knsupolo / 12345678) 즉시 로그인 & 대시보드 자동 개방
 * - 회원가입/로그인 모달 display 충돌 해결
 * - 6컷 촬영 직후 1~4번 자동 프리셋 & 검은 화면 완벽 차단
 * - 2단계 지능형 돋보기 (정지 터치: 경계선 투영 / 드래그: 스티커 전체 온전 표시)
 * - 가변 스플릿 리사이저 바 (화면 비율 실시간 조절)
 * - 하단문구(상단 60px / 하단 240px) vs 상하단문구(위아래 180px 균등) 분리
 * - 스마트폰 카메라 스캔용 고화질 QR코드 결과 화면
 */

const GOOGLE_DB_URL = "https://script.google.com/macros/s/AKfycbybeL46ymy2_hypZb2I4CvSLJTkFAlTd2OR3bncVvwv9-2BsOR3DUi7Fduf6PG0mWWo-Q/exec";
const APP_VERSION = "v17.0 Pro";
const MAX_GALLERY_SLOTS = 10;

function getFormattedTodayDate() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function extractPureBase64(dataUrl) {
  if (!dataUrl) return "";
  const commaIdx = dataUrl.indexOf(',');
  return commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;
}

const POSE_SUGGESTIONS_24 = [
  { emoji: "🫂", text: "어깨동무하고 다정하게 찰칵!" },
  { emoji: "✌️", text: "다같이 볼 옆에 브이~" },
  { emoji: "🫶", text: "손하트 뿅뿅 날리기!" },
  { emoji: "😜", text: "장난꾸러기처럼 익살스러운 표정" },
  { emoji: "😎", text: "시크하고 도도한 모델 워킹 포즈" },
  { emoji: "🌸", text: "두 손 모아 꽃받침하고 방긋" },
  { emoji: "🐹", text: "양볼 빵빵 귀요미 볼 찌르기" },
  { emoji: "🤙", text: "스웨그 넘치는 힙합 바이브" },
  { emoji: "🥰", text: "서로 머리 맞대고 꿀 떨어지는 눈빛" },
  { emoji: "🤫", text: "입술에 손가락 대고 쉿!" },
  { emoji: "🙆", text: "머리 위로 커다란 하트 만들기" },
  { emoji: "🥳", text: "환호하며 양손 활짝 벌리기" },
  { emoji: "👀", text: "옆 사람 힐끔 쳐다보며 장난치기" },
  { emoji: "😉", text: "카메라를 향해 치명적인 윙크" },
  { emoji: "🙌", text: "하이파이브 준비하며 활짝 웃기" },
  { emoji: "👓", text: "안경 고쳐 쓰는 척 지적인 무드" },
  { emoji: "💫", text: "손잡고 빙그르르 춤추듯" },
  { emoji: "🐱", text: "손을 오므려 야옹이 고양이 펀치" },
  { emoji: "💖", text: "얼굴 반쪽씩 합쳐서 하트 완성" },
  { emoji: "🤭", text: "입 틀어막고 깜짝 놀란 표정" },
  { emoji: "🕺", text: "자유로운 댄스 멈춤 프리즈 동작" },
  { emoji: "🧸", text: "인형처럼 귀엽게 정면 응시" },
  { emoji: "✨", text: "손가락으로 턱선 받치고 미소" },
  { emoji: "🎉", text: "마지막 컷! 가장 행복한 표정으로!" }
];

const FILTER_PRESETS = {
  normal:       { bright: 100, contrast: 100, saturate: 100, name: '원본' },
  harublue:     { bright: 110, contrast: 105, saturate: 105, name: '하루블루' },
  deepmono:     { bright: 102, contrast: 138, saturate: 0,   name: '딥모노' },
  y2kcyber:     { bright: 108, contrast: 92,  saturate: 85,  name: 'Y2K' },
  peachglow:    { bright: 114, contrast: 108, saturate: 118, name: '피치' },
  naturalgloss: { bright: 116, contrast: 110, saturate: 108, name: '클리어' },
  bright:       { bright: 115, contrast: 105, saturate: 108, name: '뽀샤시' },
  radiant:      { bright: 112, contrast: 115, saturate: 125, name: '화사한' },
  warm:         { bright: 108, contrast: 105, saturate: 120, name: '따뜻한' },
  cool:         { bright: 106, contrast: 112, saturate: 95,  name: '차가운' },
  mood:         { bright: 105, contrast: 95,  saturate: 85,  name: '감성' },
  retro:        { bright: 108, contrast: 90,  saturate: 80,  name: '레트로' },
  mono:         { bright: 105, contrast: 130, saturate: 0,   name: '흑백' },
  sunset:       { bright: 110, contrast: 110, saturate: 135, name: '노을빛' },
  pink:         { bright: 112, contrast: 108, saturate: 120, name: '로맨틱' }
};

const PALETTE_COLORS = [
  '#000000', '#111827', '#FFFFFF', '#E2E8F0', '#FECDD3', 
  '#FFEDD5', '#FEF9C3', '#D1FAE5', '#BAE6FD', '#EDE9FE', 
  '#881337', '#1E1B4B', '#064E3B'
];

const SIMPLE_PALETTE = ['#000000', '#18181B', '#FFFFFF', '#F4F4F5', '#E4E4E7', '#FEF3C7', '#E0F2FE'];

const APP_THEMES = {
  rose:   { color: '#f43f5e', hover: '#e11d48', light: '#fff1f2', name: '로즈 핑크' },
  black:  { color: '#0f172a', hover: '#020617', light: '#f1f5f9', name: '모던 블랙' },
  blue:   { color: '#0284c7', hover: '#0369a1', light: '#e0f2fe', name: '오션 블루' },
  purple: { color: '#9333ea', hover: '#7e22ce', light: '#f3e8ff', name: '라벤더 퍼플' },
  green:  { color: '#059669', hover: '#047857', light: '#d1fae5', name: '포레스트 그린' },
  orange: { color: '#f97316', hover: '#ea580c', light: '#fff7ed', name: '선셋 오렌지' },
  yellow: { color: '#eab308', hover: '#ca8a04', light: '#fefce8', name: '선샤인 옐로우' },
  navy:   { color: '#1e1b4b', hover: '#0f172a', light: '#eef2ff', name: '미드나잇 네이비' },
  coral:  { color: '#fb7185', hover: '#f43f5e', light: '#fff1f2', name: '벚꽃 코랄' },
  mint:   { color: '#14b8a6', hover: '#0d9488', light: '#f0fdfa', name: '민트 브리즈' }
};

let historyStack = [];
let redoStack = [];

let appState = {
  isAdmin: false,
  currentUser: null,
  isRegisteredUser: false,
  
  stream: null,
  facingMode: 'user',
  timerSec: 6,
  currentCount: 6,
  countdownTimer: null,
  isShootingPaused: false,
  selectedFormat: 'strip',
  viewfinderRatio: 'full',
  currentShotIndex: 0,
  
  shotImages: [],
  selectedImages: [],
  selectedIndices: [0, 1, 2, 3],
  activeSlotIndex: 0,
  shotVideoBlobs: [],
  currentMediaRecorder: null,
  currentShotVideoChunks: [],

  themeCategory: 'basic',
  frameStyle: 'middle',
  frameColor: '#000000',
  frameThickness: 60,
  layout: 'strip',

  activeFilter: 'normal',
  filters: { bright: 100, contrast: 100, saturate: 100 },
  showDate: true,
  typography: {
    fontFamily: 'Pretendard',
    fontSize: 54,
    fontColor: '#FFFFFF',
    isBold: true,
    date: getFormattedTodayDate()
  },

  stickers: [],
  selectedStickerIdx: -1,
  dragTarget: null,
  dragStartPos: { x: 0, y: 0 },
  isDraggingSticker: false,
  resetInterval: null
};

let currentCarouselIdx = 0;
let carouselTouchStartX = 0;
let carouselTouchStartY = 0;
let currentGeneratedVideoBlob = null;
let currentGeneratedVideoFileName = "";
let galleryAccumulator = [];
let canvasZoom = 1.0;
let canvasPanX = 0;
let canvasPanY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let currentRatingValue = 5.0;
let enteredPinCode = "";
let userLocationCache = { location: "수원시 (GPS 정밀)", isGps: true };

// ========================================================
// 1. 오디오 & 햅틱 엔진
// ========================================================
let audioCtx = null;
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playBeep(freq = 700) {
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } catch (e) {}
}

function playRealisticShutter() {
  try {
    initAudio();
    const now = audioCtx.currentTime;
    const shutBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.08, audioCtx.sampleRate);
    const shutData = shutBuf.getChannelData(0);
    for (let i = 0; i < shutData.length; i++) shutData[i] = Math.random() * 2 - 1;
    const shut = audioCtx.createBufferSource();
    shut.buffer = shutBuf;
    const shutGain = audioCtx.createGain();
    shutGain.gain.setValueAtTime(0.45, now);
    shutGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    shut.connect(shutGain);
    shutGain.connect(audioCtx.destination);
    shut.start(now);
  } catch (e) {}
}

function triggerHaptic(type = 'light') {
  if (!navigator.vibrate) return;
  try {
    if (type === 'light') navigator.vibrate(25);
    else if (type === 'medium') navigator.vibrate(50);
    else if (type === 'shutter') navigator.vibrate([40, 30, 80]);
  } catch (e) {}
}

// ========================================================
// 2. 위치 수집 텔레메트리
// ========================================================
async function initUserLocationEngine() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLocationCache = {
          location: "수원시 (GPS 정밀)",
          isGps: true,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        };
        sendVisitTelemetry();
      },
      () => {
        userLocationCache = { location: "성남시 (통신사 기지국 IDC)", isGps: false };
        sendVisitTelemetry();
      },
      { timeout: 4000, maximumAge: 60000 }
    );
  } else {
    userLocationCache = { location: "수원시 (기본값)", isGps: false };
    sendVisitTelemetry();
  }
}

async function sendVisitTelemetry() {
  const telemetry = await collectDeviceTelemetry();
  try {
    const res = await fetch(GOOGLE_DB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'VISIT',
        device: telemetry.device,
        os: telemetry.os,
        browser: telemetry.browser,
        screen: telemetry.screen,
        location: userLocationCache.location,
        isGps: userLocationCache.isGps,
        referrer: telemetry.referrer
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.visits) {
        const elToday = document.getElementById('statTodayCount');
        const elTotal = document.getElementById('statTotalCount');
        if (elToday) elToday.textContent = data.visits.today;
        if (elTotal) elTotal.textContent = data.visits.total;
      }
    }
  } catch (e) {}
}

// ========================================================
// 3. 회원 인증 & 마스터 관리자 (knsupolo / 12345678)
// ========================================================
function openAuthModal(tab = 'login') {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.style.removeProperty('display');
  modal.style.setProperty('display', 'flex', 'important');
  switchAuthTab(tab);
  if (window.lucide) lucide.createIcons();
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.setProperty('display', 'none', 'important');
  }
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('authFormLogin');
  const regForm = document.getElementById('authFormRegister');
  const pinForm = document.getElementById('authFormPin');
  const tabLogin = document.getElementById('tabModalLogin');
  const tabReg = document.getElementById('tabModalRegister');

  if (loginForm) loginForm.classList.add('hidden');
  if (regForm) regForm.classList.add('hidden');
  if (pinForm) pinForm.classList.add('hidden');

  if (tab === 'login') {
    if (loginForm) loginForm.classList.remove('hidden');
    if (tabLogin) tabLogin.className = "px-3 py-1 rounded-lg bg-white text-slate-900 shadow-xs";
    if (tabReg) tabReg.className = "px-3 py-1 rounded-lg text-slate-500 hover:text-slate-900";
  } else if (tab === 'register') {
    if (regForm) regForm.classList.remove('hidden');
    if (tabLogin) tabLogin.className = "px-3 py-1 rounded-lg text-slate-500 hover:text-slate-900";
    if (tabReg) tabReg.className = "px-3 py-1 rounded-lg bg-white text-slate-900 shadow-xs";
  } else if (tab === 'pin') {
    if (pinForm) pinForm.classList.remove('hidden');
    if (tabLogin) tabLogin.className = "px-3 py-1 rounded-lg text-slate-500 hover:text-slate-900";
    if (tabReg) tabReg.className = "px-3 py-1 rounded-lg text-slate-500 hover:text-slate-900";
    clearPinInput();
  }
}

async function checkUserIdDuplicate() {
  const idInput = document.getElementById('regUserId');
  const val = (idInput.value || "").trim().toLowerCase();
  if (!val || val.length < 4 || val.length > 12) {
    alert("아이디는 4~12자리 영문/숫자여야 합니다.");
    return;
  }
  if (val === 'knsupolo') {
    alert("이미 사용 중인 최고 관리자 아이디입니다.");
    idInput.setAttribute('data-valid', 'false');
    return;
  }
  try {
    const res = await fetch(`${GOOGLE_DB_URL}?action=CHECK_ID&userId=${encodeURIComponent(val)}&_t=${Date.now()}`);
    const data = await res.json();
    if (data.available) {
      alert("사용 가능한 아이디입니다! ✨");
      idInput.setAttribute('data-valid', 'true');
    } else {
      alert("이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요.");
      idInput.setAttribute('data-valid', 'false');
    }
  } catch (e) {
    alert("중복 확인 통신 오류가 발생했습니다.");
  }
}

async function processRegister() {
  const id = document.getElementById('regUserId').value.trim().toLowerCase();
  const pw = document.getElementById('regUserPw').value;
  const dob = document.getElementById('regUserDob').value.trim();
  const email = document.getElementById('regUserEmail').value.trim();

  if (!id || id.length < 4) { alert("아이디를 올바르게 입력해주세요."); return; }
  if (!pw || pw.length < 6 || !/(?=.*[A-Za-z])(?=.*\d)/.test(pw)) {
    alert("비밀번호는 6자리 이상 영문과 숫자를 혼합해야 합니다.");
    return;
  }
  if (!dob || dob.length !== 8 || isNaN(dob)) {
    alert("생년월일은 8자리 숫자(예: 19980521)로 입력해주세요.");
    return;
  }
  if (!email || !email.includes('@')) {
    alert("올바른 이메일 주소를 입력해주세요.");
    return;
  }

  try {
    const res = await fetch(GOOGLE_DB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'REGISTER', userId: id, userPw: pw, dob: dob, email: email })
    });
    const data = await res.json();
    if (data.success) {
      alert("회원가입이 완료되었습니다! 4자리 간편 PIN을 등록하시면 다음부터 초고속으로 로그인할 수 있습니다.");
      promptPinRegistration(id);
      switchAuthTab('login');
    } else {
      alert("가입 실패: " + data.message);
    }
  } catch (err) {
    alert("회원가입 통신 중 오류가 발생했습니다: " + err.message);
  }
}

// 🌟 로그인 처리 (knsupolo / 12345678 마스터 즉시 인증)
async function processLogin() {
  const idInput = document.getElementById('loginUserId');
  const pwInput = document.getElementById('loginUserPw');
  const id = (idInput ? idInput.value : '').trim().toLowerCase();
  const pw = pwInput ? pwInput.value : '';
  if (!id || !pw) { alert("아이디와 비밀번호를 입력해주세요."); return; }

  // 👑 마스터 관리자 즉시 로그인
  if (id === 'knsupolo' && pw === '12345678') {
    appState.isAdmin = true;
    const adminUser = {
      userId: 'knsupolo',
      dob: '19830413',
      email: 'admin@chueok.com',
      isAdmin: true
    };
    applyUserLoginSuccess(adminUser, 'master-admin-token-' + Date.now());
    closeAuthModal();
    alert("👑 최고 관리자(knsupolo) 계정으로 로그인되었습니다!\n관리자 센터 및 모든 프리미엄 기능이 개방되었습니다.");
    openAdminDashboard();
    return;
  }

  // 일반 회원 로그인 통신
  try {
    const res = await fetch(GOOGLE_DB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'LOGIN', userId: id, userPw: pw })
    });
    const data = await res.json();
    if (data.success) {
      applyUserLoginSuccess(data.user, data.sessionToken);
      closeAuthModal();
      alert(`환영합니다, ${data.user.userId}님! 정회원 전용 프리미엄 혜택이 활성화되었습니다. 💖`);
    } else {
      alert(data.message || "로그인 정보가 일치하지 않습니다.");
    }
  } catch (err) {
    alert("로그인 통신 중 오류가 발생했습니다.");
  }
}

function applyUserLoginSuccess(user, token) {
  appState.currentUser = user;
  appState.isRegisteredUser = true;

  const authPayload = {
    user: user,
    token: token,
    expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000)
  };
  localStorage.setItem('chueok_auth_session', JSON.stringify(authPayload));
  updateUserHeaderUI();
}

function checkAutoLoginSession() {
  const saved = localStorage.getItem('chueok_auth_session');
  if (!saved) return;
  try {
    const payload = JSON.parse(saved);
    if (payload.expiresAt && Date.now() < payload.expiresAt && payload.user) {
      appState.currentUser = payload.user;
      appState.isRegisteredUser = true;
      if (payload.user.userId === 'knsupolo') appState.isAdmin = true;
      updateUserHeaderUI();
    } else {
      localStorage.removeItem('chueok_auth_session');
    }
  } catch (e) {
    localStorage.removeItem('chueok_auth_session');
  }
}

function updateUserHeaderUI() {
  const loginBtn = document.getElementById('btnHeaderLogin');
  const regBtn = document.getElementById('btnHeaderRegister');
  const badge = document.getElementById('userProfileBadge');
  const nameEl = document.getElementById('userProfileName');

  if (appState.isRegisteredUser && appState.currentUser) {
    if (loginBtn) loginBtn.classList.add('hidden');
    if (regBtn) regBtn.classList.add('hidden');
    if (badge) {
      badge.classList.remove('hidden');
      badge.style.display = 'flex';
    }
    if (nameEl) nameEl.textContent = appState.currentUser.userId;
  } else {
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (regBtn) regBtn.classList.remove('hidden');
    if (badge) {
      badge.classList.add('hidden');
      badge.style.display = 'none';
    }
  }
}

function processLogout() {
  if (!confirm("로그아웃 하시겠습니까?")) return;
  appState.currentUser = null;
  appState.isRegisteredUser = false;
  appState.isAdmin = false;
  localStorage.removeItem('chueok_auth_session');
  updateUserHeaderUI();
  alert("정상적으로 로그아웃되었습니다.");
}

function promptPinRegistration(userId) {
  const pin = prompt("현장에서 1초 만에 로그인할 수 있는 숫자 4자리 간편 PIN 번호를 설정하세요 (취소 시 건너뜀):");
  if (pin && pin.length === 4 && !isNaN(pin)) {
    fetch(GOOGLE_DB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'SET_PIN', userId: userId, pin: pin })
    }).then(() => alert("4자리 간편 PIN이 등록되었습니다!"));
  }
}

function pressPinKey(digit) {
  if (enteredPinCode.length < 4) {
    enteredPinCode += digit;
    updatePinDotsUI();
    if (enteredPinCode.length === 4) {
      submitPinLogin(enteredPinCode);
    }
  }
}

function clearPinInput() {
  enteredPinCode = "";
  updatePinDotsUI();
}

function backspacePinKey() {
  if (enteredPinCode.length > 0) {
    enteredPinCode = enteredPinCode.slice(0, -1);
    updatePinDotsUI();
  }
}

function updatePinDotsUI() {
  const dots = document.querySelectorAll('.pin-dot');
  dots.forEach((dot, idx) => {
    if (idx < enteredPinCode.length) dot.classList.add('filled');
    else dot.classList.remove('filled');
  });
}

async function submitPinLogin(pin) {
  playBeep(900);
  try {
    const res = await fetch(GOOGLE_DB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'LOGIN_PIN', pin: pin })
    });
    const data = await res.json();
    if (data.success) {
      applyUserLoginSuccess(data.user, data.sessionToken);
      closeAuthModal();
      alert(`PIN 인증 성공! 환영합니다, ${data.user.userId}님 ✨`);
    } else {
      alert("PIN 번호가 올바르지 않습니다.");
      clearPinInput();
    }
  } catch (e) {
    alert("PIN 인증 통신 실패");
    clearPinInput();
  }
}

async function promptResetPassword() {
  const userId = prompt("가입하신 아이디를 입력하세요:");
  if (!userId) return;
  const email = prompt("가입 시 등록한 이메일 주소를 입력하세요:");
  if (!email) return;
  const dob = prompt("생년월일 8자리(예: 19980521)를 입력하세요:");
  if (!dob) return;

  try {
    const res = await fetch(GOOGLE_DB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'RESET_PW', userId: userId, email: email, dob: dob })
    });
    const data = await res.json();
    alert(data.message);
  } catch (e) {
    alert("비밀번호 재설정 통신 중 오류가 발생했습니다.");
  }
}

// 🌟 마이 갤러리 10장 FIFO 롤링 보관함
async function saveToMyGalleryCloud() {
  if (!appState.isRegisteredUser || !appState.currentUser) {
    alert("마이 갤러리 클라우드 저장은 [정회원 전용] 기능입니다.\n간편 회원가입 또는 로그인 후 이용해 주세요! 🔒");
    openAuthModal('login');
    return;
  }

  const btn = document.getElementById('btnSaveMyGallery');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i><span>저장 중</span>`;
  }
  if (window.lucide) lucide.createIcons();

  renderStrip(true);
  const canvas = document.getElementById('photoCanvas');
  if (!canvas) return;
  const base64Img = canvas.toDataURL('image/png');

  try {
    const res = await fetch(GOOGLE_DB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'SAVE_TO_GALLERY',
        userId: appState.currentUser.userId,
        base64Data: extractPureBase64(base64Img)
      })
    });
    const data = await res.json();
    if (data.success) {
      alert("내 클라우드 보관함에 안전하게 저장되었습니다! ☁️\n(최근 저장 순 최대 10장까지 보관됩니다)");
    } else {
      alert("보관함 저장 실패: " + data.message);
    }
  } catch (err) {
    alert("보관함 저장 통신 오류: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="cloud" class="w-3.5 h-3.5"></i><span>보관함 저장</span>`;
    }
    if (window.lucide) lucide.createIcons();
  }
}

async function openMyGalleryModal() {
  if (!appState.isRegisteredUser || !appState.currentUser) {
    openAuthModal('login');
    return;
  }
  const modal = document.getElementById('myGalleryModal');
  const grid = document.getElementById('myGalleryGrid');
  if (!modal || !grid) return;

  grid.innerHTML = `<div class="py-12 text-center text-xs text-slate-400"><i data-lucide="loader-2" class="w-6 h-6 animate-spin mx-auto mb-2 text-theme"></i>보관함 사진을 불러오는 중...</div>`;
  modal.classList.remove('hidden');
  modal.style.removeProperty('display');
  modal.style.setProperty('display', 'flex', 'important');
  if (window.lucide) lucide.createIcons();

  try {
    const res = await fetch(`${GOOGLE_DB_URL}?action=GET_USER_GALLERY&userId=${encodeURIComponent(appState.currentUser.userId)}&_t=${Date.now()}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.photos)) {
      renderMyGalleryCards(data.photos);
    } else {
      grid.innerHTML = `<p class="text-xs text-slate-400 text-center py-10">보관함에 저장된 사진이 없습니다.</p>`;
    }
  } catch (e) {
    grid.innerHTML = `<p class="text-xs text-rose-500 text-center py-10">보관함 로딩에 실패했습니다.</p>`;
  }
}

function closeMyGalleryModal() {
  const modal = document.getElementById('myGalleryModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.setProperty('display', 'none', 'important');
  }
}

function renderMyGalleryCards(photos) {
  const grid = document.getElementById('myGalleryGrid');
  if (!grid) return;
  if (photos.length === 0) {
    grid.innerHTML = `<p class="text-xs text-slate-400 text-center py-10">보관함에 저장된 네컷 사진이 없습니다.</p>`;
    return;
  }

  grid.innerHTML = `
    <div class="grid grid-cols-2 gap-3">
      ${photos.map((p, idx) => `
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex flex-col justify-between space-y-2 shadow-xs">
          <div class="aspect-[3/4] bg-slate-900 rounded-xl overflow-hidden shadow-inner flex items-center justify-center relative">
            <span class="absolute top-1.5 left-1.5 bg-black/75 text-white text-[9px] font-black px-1.5 py-0.5 rounded">#${idx + 1}</span>
            <img src="https://drive.google.com/thumbnail?id=${p.fileId}&sz=w600" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/400x600?text=Photo';">
          </div>
          <div class="flex items-center justify-between pt-1">
            <span class="text-[9px] text-slate-400">${p.date ? p.date.slice(0, 10) : ''}</span>
            <div class="flex space-x-1">
              <a href="${p.fileUrl}" target="_blank" class="p-1 bg-white border border-slate-200 rounded-lg text-slate-700 hover:text-theme active:scale-90" title="보기/다운"><i data-lucide="external-link" class="w-3.5 h-3.5"></i></a>
              <button onclick="deleteGalleryPhoto('${p.id}')" class="p-1 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 active:scale-90" title="삭제"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

async function deleteGalleryPhoto(photoId) {
  if (!confirm("이 사진을 보관함에서 영구 삭제하시겠습니까?")) return;
  try {
    await fetch(GOOGLE_DB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'DELETE_GALLERY_PHOTO', photoId: photoId, userId: appState.currentUser.userId })
    });
    openMyGalleryModal();
  } catch (e) {
    alert("사진 삭제 실패");
  }
}

// ========================================================
// 4. 가로/세로 방향 감지 센서
// ========================================================
function checkDeviceOrientation() {
  const overlay = document.getElementById('orientationWarningOverlay');
  const title = document.getElementById('orientationTitle');
  const desc = document.getElementById('orientationDesc');
  const icon = document.getElementById('orientationIcon');
  if (!overlay) return;

  const shootScreen = document.getElementById('screenLiveShoot');
  if (!shootScreen || shootScreen.classList.contains('hidden')) {
    overlay.classList.add('hidden');
    return;
  }

  const isPortraitDevice = window.innerHeight > window.innerWidth;

  if (appState.selectedFormat === 'strip') {
    if (isPortraitDevice) {
      overlay.classList.remove('hidden');
      if (title) title.textContent = "카메라를 가로로 돌려주세요!";
      if (desc) desc.textContent = "1×4 스트립 규격은 가로 파지 전용입니다. 기기를 가로로 회전하시면 카운트다운이 재개됩니다.";
      if (icon) icon.className = "w-8 h-8 text-theme rotate-90";
      pauseCountdown();
    } else {
      overlay.classList.add('hidden');
      resumeCountdown();
    }
  } else if (appState.selectedFormat === 'grid') {
    if (!isPortraitDevice) {
      overlay.classList.remove('hidden');
      if (title) title.textContent = "카메라를 세로로 돌려주세요!";
      if (desc) desc.textContent = "2×2 엽서형 규격은 세로 파지 전용입니다. 기기를 세로로 회전하시면 카운트다운이 재개됩니다.";
      if (icon) icon.className = "w-8 h-8 text-theme";
      pauseCountdown();
    } else {
      overlay.classList.add('hidden');
      resumeCountdown();
    }
  }
}

function pauseCountdown() {
  appState.isShootingPaused = true;
}

function resumeCountdown() {
  appState.isShootingPaused = false;
}

// ========================================================
// 5. 카메라 구도 대기실
// ========================================================
function startSession(format) {
  appState.selectedFormat = format || 'strip';
  appState.layout = format || 'strip';
  appState.currentShotIndex = 0;
  appState.shotImages = [];
  appState.selectedImages = [];
  appState.selectedIndices = [0, 1, 2, 3];
  appState.shotVideoBlobs = [];

  const liveBadge = document.getElementById('liveFormatBadge');
  if (liveBadge) liveBadge.textContent = (format === 'strip') ? "1×4 스트립 (가로)" : "2×2 엽서형 (세로)";
  const editBadge = document.getElementById('editorFormatBadge');
  if (editBadge) editBadge.textContent = (format === 'strip') ? "1×4 스트립" : "2×2 엽서형";
  const progressBadge = document.getElementById('liveProgressBadge');
  if (progressBadge) progressBadge.textContent = "구도 대기실";

  showScreen('screenLiveShoot');

  const waitCtrl = document.getElementById('waitingRoomControls');
  const shootLayer = document.getElementById('activeShootingLayer');
  const bottomBar = document.getElementById('shootingBottomBar');

  if (waitCtrl) waitCtrl.classList.remove('hidden');
  if (shootLayer) shootLayer.classList.add('hidden');
  if (bottomBar) bottomBar.classList.add('hidden');

  startCameraStream();
  setTimeout(checkDeviceOrientation, 300);
}

window.startSession = startSession;

async function startCameraStream(preserveState = false) {
  const video = document.getElementById('liveWebcamVideo');
  if (video) {
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("카메라 권한이 없거나 HTTPS 보안 연결이 아닙니다. 앨범 선택 모드로 이동합니다.");
    triggerGalleryUpload();
    return;
  }
  initAudio();

  if (!preserveState) {
    stopCameraAndAudio();
  } else if (appState.stream) {
    appState.stream.getTracks().forEach(t => t.stop());
    appState.stream = null;
  }

  const constraintsList = [
    { video: { facingMode: appState.facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
    { video: { facingMode: appState.facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
    { video: { facingMode: appState.facingMode }, audio: false },
    { video: true, audio: false }
  ];

  let stream = null;
  for (const c of constraintsList) {
    try {
      stream = await navigator.mediaDevices.getUserMedia(c);
      if (stream) break;
    } catch (err) {}
  }

  if (!stream) {
    alert("카메라 장치 연결에 실패했습니다.");
    triggerGalleryUpload();
    return;
  }

  appState.stream = stream;
  if (video) {
    video.srcObject = stream;
    if (appState.facingMode === 'user') video.classList.add('mirror');
    else video.classList.remove('mirror');
    video.play().catch(() => {});
  }
}

async function flipCameraFacing() {
  playBeep(850);
  triggerHaptic('light');
  appState.facingMode = (appState.facingMode === 'user') ? 'environment' : 'user'; 
  await startCameraStream(true); 
}

function setViewfinderRatio(ratio, btn) {
  appState.viewfinderRatio = ratio;
  document.querySelectorAll('.ratio-btn').forEach(b => {
    b.className = "ratio-btn px-2.5 py-1 rounded-lg text-slate-300";
  });
  if (btn) btn.className = "ratio-btn px-2.5 py-1 rounded-lg bg-theme text-white shadow";

  const box = document.getElementById('dynamicViewfinderBox');
  const badge = document.getElementById('viewfinderRatioBadge');
  if (!box) return;

  if (ratio === 'full') {
    box.className = "border-2 border-white/40 w-full h-full relative flex items-center justify-center transition-all duration-300 rounded-2xl";
    if (badge) badge.textContent = "UHD 풀 화면";
  } else if (ratio === '3:2') {
    box.className = "border-2 border-white/70 w-full max-w-2xl aspect-[3/2] relative flex items-center justify-center transition-all duration-300 rounded-2xl shadow-2xl";
    if (badge) badge.textContent = "3:2 단체 가이드";
  } else if (ratio === '4:5') {
    box.className = "border-2 border-white/70 h-[88vh] max-w-[95vw] aspect-[4/5] relative flex items-center justify-center transition-all duration-300 rounded-2xl shadow-2xl";
    if (badge) badge.textContent = "4:5 인물 가이드";
  }
}

// ========================================================
// 6. 6컷 연속 촬영
// ========================================================
function startActualCountdownSession() {
  playBeep(900);
  triggerHaptic('medium');

  const waitCtrl = document.getElementById('waitingRoomControls');
  const shootLayer = document.getElementById('activeShootingLayer');
  const bottomBar = document.getElementById('shootingBottomBar');
  if (waitCtrl) waitCtrl.classList.add('hidden');
  if (shootLayer) shootLayer.classList.remove('hidden');
  if (bottomBar) bottomBar.classList.remove('hidden');

  for (let i = 0; i < 6; i++) { 
    const t = document.getElementById(`liveThumb${i}`); 
    if (t) { 
      t.innerHTML = (i + 1).toString(); 
      t.className = "w-11 h-8 bg-black/50 backdrop-blur border border-white/30 flex items-center justify-center text-[10px] text-white/50 font-bold rounded"; 
    } 
  }

  runContinuousLiveShoot(0);
}

function runContinuousLiveShoot(shotIndex) {
  appState.currentShotIndex = shotIndex;
  if (shotIndex >= 6) { 
    stopCameraAndAudio(); 
    setTimeout(() => { renderPickScreen(); }, 400); 
    return; 
  }

  const badge = document.getElementById('liveProgressBadge');
  if (badge) badge.textContent = `${shotIndex + 1} / 6 컷`;

  const poseItem = POSE_SUGGESTIONS_24[shotIndex % POSE_SUGGESTIONS_24.length];
  const poseGuide = document.getElementById('poseGuideText');
  const poseEmoji = document.getElementById('poseGuideEmoji');
  if (poseGuide) poseGuide.textContent = poseItem.text;
  if (poseEmoji) poseEmoji.textContent = poseItem.emoji;

  appState.currentCount = appState.timerSec;
  const countEl = document.getElementById('liveCountdownText'); 
  if (countEl) countEl.textContent = appState.currentCount;
  
  playBeep(600); 
  startSingleCutVideoRecording();

  if (appState.countdownTimer) clearInterval(appState.countdownTimer);
  appState.countdownTimer = setInterval(() => {
    if (appState.isShootingPaused) return;

    appState.currentCount--;
    if (appState.currentCount > 0) { 
      if (countEl) countEl.textContent = appState.currentCount; 
      playBeep(600);
      if (appState.currentCount <= 3) triggerHaptic('light');
    } else { 
      clearInterval(appState.countdownTimer); 
      stopSingleCutVideoRecording(shotIndex); 
      captureWebcamFrame(shotIndex, () => { 
        setTimeout(() => { runContinuousLiveShoot(shotIndex + 1); }, 1800); 
      }); 
    }
  }, 1000);
}

function triggerInstantOneSec() {
  if (appState.countdownTimer) clearInterval(appState.countdownTimer);
  appState.currentCount = 1; 
  const countEl = document.getElementById('liveCountdownText');
  if (countEl) countEl.textContent = "1";
  playBeep(700);
  triggerHaptic('light');

  setTimeout(() => {
    const shotIndex = appState.shotImages.length; 
    stopSingleCutVideoRecording(shotIndex); 
    captureWebcamFrame(shotIndex, () => { 
      setTimeout(() => { runContinuousLiveShoot(shotIndex + 1); }, 1800); 
    }); 
  }, 1000);
}

function captureWebcamFrame(shotIndex, onDone) {
  playRealisticShutter(); 
  triggerHaptic('shutter');
  flashScreen();

  const video = document.getElementById('liveWebcamVideo');
  const canvas = document.getElementById('hiddenSnapCanvas');
  if (!video || !canvas) return;

  const vw = video.videoWidth || 1920;
  const vh = video.videoHeight || 1080;
  canvas.width = vw;
  canvas.height = vh;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.save();
  if (appState.facingMode === 'user') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  const img = new Image();
  img.onload = () => {
    appState.shotImages.push(img);
    const thumb = document.getElementById(`liveThumb${shotIndex}`);
    if (thumb) { 
      thumb.innerHTML = `<img src="${img.src}" class="w-full h-full object-cover">`; 
      thumb.className = "w-11 h-8 border-2 border-theme overflow-hidden shadow-lg rounded"; 
    }
    if (onDone) onDone();
  };
  img.src = canvas.toDataURL('image/jpeg', 0.99);
}

function flashScreen() { 
  const f = document.getElementById('flashOverlay'); 
  if (f) { 
    f.classList.remove('hidden'); 
    f.classList.add('flash-effect'); 
    setTimeout(() => { 
      f.classList.remove('flash-effect'); 
      f.classList.add('hidden'); 
    }, 350); 
  } 
}

function startSingleCutVideoRecording() {
  if (!appState.stream) return;
  appState.currentShotVideoChunks = [];
  try { 
    appState.currentMediaRecorder = new MediaRecorder(appState.stream, { 
      mimeType: 'video/webm',
      videoBitsPerSecond: 10000000
    }); 
  } catch (e) { 
    try { 
      appState.currentMediaRecorder = new MediaRecorder(appState.stream, { mimeType: 'video/mp4', videoBitsPerSecond: 10000000 }); 
    } catch (e2) { 
      try { appState.currentMediaRecorder = new MediaRecorder(appState.stream); } 
      catch (e3) { appState.currentMediaRecorder = null; } 
    } 
  }
  if (appState.currentMediaRecorder) { 
    appState.currentMediaRecorder.ondataavailable = e => { 
      if (e.data && e.data.size > 0) appState.currentShotVideoChunks.push(e.data); 
    }; 
    appState.currentMediaRecorder.start(); 
  }
}

function stopSingleCutVideoRecording(shotIndex) {
  if (appState.currentMediaRecorder && appState.currentMediaRecorder.state !== 'inactive') {
    appState.currentMediaRecorder.onstop = () => { 
      appState.shotVideoBlobs[shotIndex] = new Blob(appState.currentShotVideoChunks, { type: 'video/webm' }); 
    };
    appState.currentMediaRecorder.stop();
  }
}

function stopCameraAndAudio() { 
  if (appState.countdownTimer) { clearInterval(appState.countdownTimer); appState.countdownTimer = null; } 
  if (appState.currentMediaRecorder && appState.currentMediaRecorder.state !== 'inactive') { try { appState.currentMediaRecorder.stop(); } catch(e){} } 
  if (appState.stream) { appState.stream.getTracks().forEach(t => t.stop()); appState.stream = null; } 
  if (audioCtx && audioCtx.state !== 'closed') { try { audioCtx.suspend(); } catch (e) {} } 
}

// ========================================================
// 7. 사진 선택 & 자동 프리셋
// ========================================================
function renderPickScreen() {
  showScreen('screenPick');
  
  appState.selectedIndices = [0, 1, 2, 3]; 
  appState.activeSlotIndex = 0; 
  currentCarouselIdx = 0;

  const imgEl = document.getElementById('carouselCurrentImg');
  if (imgEl && appState.shotImages.length > 0) {
    imgEl.src = appState.shotImages[0].src;
  }

  buildPickMiniPreviewStructure();
  setupCarouselViewer();
  setupSlotDragAndDrop();
  updatePreviewSlots();
  updateCarouselView();
  refreshPickUI();
}

function buildPickMiniPreviewStructure() {
  const container = document.getElementById('pickMiniFramePreview');
  if (!container) return;
  const isGrid = (appState.selectedFormat === 'grid');
  
  if (isGrid) {
    container.className = "w-72 sm:w-80 aspect-[2/3] bg-black p-4 shadow-2xl flex flex-col justify-between border-2 border-slate-300 rounded-2xl transition-all";
    container.style.backgroundColor = appState.frameColor;
    container.innerHTML = `
      <div id="pickPreviewHeader" class="text-center text-white text-sm font-black font-serif py-1">추억네컷</div>
      <div class="grid grid-cols-2 gap-2.5 flex-1 my-1.5">
        <div onclick="selectSlotForAssignment(0)" data-slot="0" id="previewSlot0" class="drop-slot aspect-[4/5] bg-slate-900 border-2 border-theme ring-2 ring-rose-400 flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative rounded-xl shadow-inner">1번 슬롯</div>
        <div onclick="selectSlotForAssignment(1)" data-slot="1" id="previewSlot1" class="drop-slot aspect-[4/5] bg-slate-900 border-2 border-transparent flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative rounded-xl shadow-inner">2번 슬롯</div>
        <div onclick="selectSlotForAssignment(2)" data-slot="2" id="previewSlot2" class="drop-slot aspect-[4/5] bg-slate-900 border-2 border-transparent flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative rounded-xl shadow-inner">3번 슬롯</div>
        <div onclick="selectSlotForAssignment(3)" data-slot="3" id="previewSlot3" class="drop-slot aspect-[4/5] bg-slate-900 border-2 border-transparent flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative rounded-xl shadow-inner">4번 슬롯</div>
      </div>
      <div id="pickPreviewFooter" class="text-center text-white text-xs font-mono py-1 border-t border-white/20">Photography | PhotoBooth</div>
    `;
  } else {
    container.className = "w-56 sm:w-64 bg-black p-3.5 shadow-2xl flex flex-col space-y-2 border-2 border-slate-300 rounded-2xl transition-all";
    container.style.backgroundColor = appState.frameColor;
    container.innerHTML = `
      <div id="pickPreviewHeader" class="text-center text-white text-sm font-black font-serif py-1 border-b border-white/20">추억네컷</div>
      <div onclick="selectSlotForAssignment(0)" data-slot="0" id="previewSlot0" class="drop-slot aspect-[3/2] bg-slate-900 border-2 border-theme ring-2 ring-rose-400 flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative rounded-xl shadow-inner">1번 슬롯</div>
      <div onclick="selectSlotForAssignment(1)" data-slot="1" id="previewSlot1" class="drop-slot aspect-[3/2] bg-slate-900 border-2 border-transparent flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative rounded-xl shadow-inner">2번 슬롯</div>
      <div onclick="selectSlotForAssignment(2)" data-slot="2" id="previewSlot2" class="drop-slot aspect-[3/2] bg-slate-900 border-2 border-transparent flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative rounded-xl shadow-inner">3번 슬롯</div>
      <div onclick="selectSlotForAssignment(3)" data-slot="3" id="previewSlot3" class="drop-slot aspect-[3/2] bg-slate-900 border-2 border-transparent flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative rounded-xl shadow-inner">4번 슬롯</div>
      <div id="pickPreviewFooter" class="text-center text-white text-xs font-mono py-1 border-t border-white/20">Photography | PhotoBooth</div>
    `;
  }
}

function setupSlotDragAndDrop() {
  const currentImg = document.getElementById('carouselCurrentImg');
  if (currentImg) {
    currentImg.ondragstart = (e) => {
      e.dataTransfer.setData('text/plain', currentCarouselIdx.toString());
    };
  }

  document.querySelectorAll('.drop-slot').forEach(slot => {
    slot.ondragover = (e) => {
      e.preventDefault();
      slot.classList.add('slot-dragover');
    };
    slot.ondragleave = () => {
      slot.classList.remove('slot-dragover');
    };
    slot.ondrop = (e) => {
      e.preventDefault();
      slot.classList.remove('slot-dragover');
      const draggedShotIdx = parseInt(e.dataTransfer.getData('text/plain'));
      const targetSlotIdx = parseInt(slot.getAttribute('data-slot'));
      if (!isNaN(draggedShotIdx) && !isNaN(targetSlotIdx)) {
        appState.activeSlotIndex = targetSlotIdx;
        assignPhotoToCurrentSlot(draggedShotIdx);
      }
    };
  });
}

function setupCarouselViewer() {
  const wrapper = document.getElementById('carouselImageWrapper');
  if (!wrapper) return;

  wrapper.onpointerdown = (e) => {
    carouselTouchStartX = e.clientX;
    carouselTouchStartY = e.clientY;
  };

  wrapper.onpointerup = (e) => {
    const diffX = carouselTouchStartX - e.clientX;
    const diffY = carouselTouchStartY - e.clientY;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 35) {
      if (diffX > 0) nextCarouselPhoto();
      else prevCarouselPhoto();
    }
  };
}

function prevCarouselPhoto() {
  if (appState.shotImages.length === 0) return;
  triggerHaptic('light');
  currentCarouselIdx = (currentCarouselIdx - 1 + appState.shotImages.length) % appState.shotImages.length;
  updateCarouselView();
}

function nextCarouselPhoto() {
  if (appState.shotImages.length === 0) return;
  triggerHaptic('light');
  currentCarouselIdx = (currentCarouselIdx + 1) % appState.shotImages.length;
  updateCarouselView();
}

function goToCarouselPhoto(idx) {
  triggerHaptic('light');
  currentCarouselIdx = idx;
  updateCarouselView();
}

function updateCarouselView() {
  if (appState.shotImages.length === 0) return;

  const imgEl = document.getElementById('carouselCurrentImg');
  const badgeEl = document.getElementById('carouselCutBadge');
  const btnText = document.getElementById('btnAssignText');
  const strip = document.getElementById('carouselIndicatorStrip');

  if (imgEl && appState.shotImages[currentCarouselIdx]) {
    imgEl.src = appState.shotImages[currentCarouselIdx].src;
  }
  if (badgeEl) badgeEl.textContent = `#${currentCarouselIdx + 1}번 컷`;
  if (btnText) btnText.textContent = `${appState.activeSlotIndex + 1}번 슬롯에 넣기`;

  if (strip) {
    strip.innerHTML = appState.shotImages.map((img, idx) => {
      const isCurrent = (idx === currentCarouselIdx);
      const isAssigned = appState.selectedIndices.includes(idx);
      const assignedSlot = appState.selectedIndices.indexOf(idx);

      return `
        <button onclick="goToCarouselPhoto(${idx})" class="w-10 h-8 rounded-lg overflow-hidden border-2 relative transition ${isCurrent ? 'border-theme scale-110 shadow-md ring-2 ring-rose-400' : 'border-slate-300 opacity-60'}">
          <img src="${img.src}" class="w-full h-full object-cover pointer-events-none">
          ${isAssigned ? `<div class="absolute inset-0 bg-theme/85 flex items-center justify-center text-white text-[9px] font-black">${assignedSlot + 1}번</div>` : ''}
        </button>
      `;
    }).join('');
  }
}

function assignCurrentCarouselPhoto() {
  if (appState.shotImages.length === 0) return;
  assignPhotoToCurrentSlot(currentCarouselIdx);
}

function selectSlotForAssignment(slotIdx) {
  playBeep(800);
  triggerHaptic('light');
  appState.activeSlotIndex = slotIdx;
  const badge = document.getElementById('currentActiveSlotBadge'); 
  if (badge) badge.textContent = `${slotIdx + 1}번 슬롯 채우는 중`;
  
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById(`previewSlot${i}`);
    if (el) { 
      if (i === slotIdx) {
        el.className = el.className.replace('border-transparent', 'border-theme ring-2 ring-rose-400');
      } else {
        el.className = el.className.replace('border-theme ring-2 ring-rose-400', 'border-transparent');
      }
    }
  }
  updateCarouselView();
}

function assignPhotoToCurrentSlot(shotIdx) {
  playBeep(950);
  triggerHaptic('medium');
  appState.selectedIndices[appState.activeSlotIndex] = shotIdx; 
  updatePreviewSlots();
  
  const nextEmpty = appState.selectedIndices.indexOf(null);
  if (nextEmpty !== -1) {
    selectSlotForAssignment(nextEmpty);
  } else {
    selectSlotForAssignment((appState.activeSlotIndex + 1) % 4);
  }

  const nextUnselectedIdx = appState.shotImages.findIndex((_, idx) => !appState.selectedIndices.includes(idx));
  if (nextUnselectedIdx !== -1) {
    currentCarouselIdx = nextUnselectedIdx;
  } else {
    currentCarouselIdx = (currentCarouselIdx + 1) % appState.shotImages.length;
  }

  updateCarouselView();
  refreshPickUI();
}

function updatePreviewSlots() {
  for (let i = 0; i < 4; i++) {
    const shotIdx = appState.selectedIndices[i]; 
    const slotEl = document.getElementById(`previewSlot${i}`);
    if (slotEl) { 
      if (shotIdx !== null && appState.shotImages[shotIdx]) { 
        slotEl.innerHTML = `<img src="${appState.shotImages[shotIdx].src}" class="w-full h-full object-cover pointer-events-none">`; 
      } else { 
        slotEl.innerHTML = `<span class="text-slate-400 text-xs font-bold">${i + 1}번 슬롯</span>`; 
      } 
    }
  }
}

function refreshPickUI() {
  const chosenCount = appState.selectedIndices.filter(idx => idx !== null).length;
  const btn = document.getElementById('btnConfirmPick');
  if (btn) btn.textContent = chosenCount === 4 ? "스튜디오 꾸미기 ➔" : `스튜디오 꾸미기 (${chosenCount}/4)`;
}

// 🌟 스튜디오 에디터 전환 & 캔버스 안전 렌더링
function confirmSelectedFour() {
  for (let i = 0; i < 4; i++) {
    if (appState.selectedIndices[i] === null || !appState.shotImages[appState.selectedIndices[i]]) {
      appState.selectedIndices[i] = (i < appState.shotImages.length) ? i : 0;
    }
  }

  playBeep(1000);
  triggerHaptic('medium');

  appState.selectedImages = appState.selectedIndices.map(idx => appState.shotImages[idx]);

  resetEditorToDefault();
  showScreen('screenEdit');

  // DOM 배치 완료 후 캔버스 리페인트
  requestAnimationFrame(() => {
    renderStrip();
  });

  const layoutRow = document.getElementById('layoutSelectionRow');
  if (layoutRow) {
    if (appState.selectedFormat === 'strip') layoutRow.classList.remove('hidden');
    else layoutRow.classList.add('hidden');
  }

  saveSessionStateToStorage();
}

function resetEditorToDefault() {
  appState.stickers = []; 
  appState.selectedStickerIdx = -1; 
  appState.layout = appState.selectedFormat || 'strip'; 
  appState.frameThickness = 60; 
  appState.activeFilter = 'normal';
  appState.filters = { bright: 100, contrast: 100, saturate: 100 };
  appState.typography.fontFamily = 'Pretendard';
  appState.typography.fontColor = (appState.frameColor === '#FFFFFF' || appState.frameColor === '#E2E8F0') ? '#1E293B' : '#FFFFFF';
  appState.typography.fontSize = 54;

  const slThick = document.getElementById('sliderThickness'); if (slThick) slThick.value = 40;
  const fineTune = document.getElementById('filterFineTunePanel'); if (fineTune) fineTune.classList.add('hidden');
  const stBar = document.getElementById('stickerControlBar'); if (stBar) stBar.classList.add('hidden');
  resetCanvasZoom();
  historyStack = []; 
  redoStack = [];

  const dateCheck = document.getElementById('checkShowDate');
  if (dateCheck) {
    dateCheck.checked = true;
    appState.showDate = true;
    initOrUpdateDateSticker(true);
  }
}

// 앨범 업로드
function triggerGalleryUpload() { const input = document.getElementById('galleryInput'); if (input) { input.value = ''; input.click(); } }

function compressAndLoadImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 2560;
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) { 
          if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; } 
          else { w = Math.round((w * maxDim) / h); h = maxDim; } 
        }
        const c = document.createElement('canvas'); 
        c.width = w; c.height = h; 
        const ctx = c.getContext('2d'); 
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        const downscaledImg = new Image(); 
        downscaledImg.onload = () => resolve(downscaledImg); 
        downscaledImg.src = c.toDataURL('image/jpeg', 0.99);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handleGalleryUpload(e) {
  const files = Array.from(e.target.files); if (files.length === 0) return;
  const loadedImages = await Promise.all(files.map(file => compressAndLoadImage(file)));
  galleryAccumulator.push(...loadedImages);
  if (galleryAccumulator.length >= 4) {
    document.getElementById('galleryCollectModal').classList.add('hidden');
    appState.shotImages = [...galleryAccumulator]; 
    galleryAccumulator = []; 
    renderPickScreen();
  } else { 
    updateGalleryCollectModal(); 
  }
}

function updateGalleryCollectModal() {
  const modal = document.getElementById('galleryCollectModal'); 
  const title = document.getElementById('collectModalTitle'); 
  const grid = document.getElementById('collectThumbGrid');
  if (!modal || !title || !grid) return;
  title.textContent = `사진 수집 중 ( ${galleryAccumulator.length} / 4 )`;
  grid.innerHTML = galleryAccumulator.map(img => `<div class="w-12 h-14 rounded-lg overflow-hidden border-2 border-theme shadow-sm"><img src="${img.src}" class="w-full h-full object-cover"></div>`).join('');
  modal.classList.remove('hidden'); 
  modal.style.removeProperty('display');
  modal.style.setProperty('display', 'flex', 'important');
  if (window.lucide) lucide.createIcons();
}

function cancelGalleryCollect() { 
  galleryAccumulator = []; 
  const m = document.getElementById('galleryCollectModal'); 
  if (m) {
    m.classList.add('hidden');
    m.style.setProperty('display', 'none', 'important');
  }
}

// ========================================================
// 8. 3대 테마 분류 컨트롤러
// ========================================================
function switchThemeCategory(category) {
  if (category !== 'basic' && (!appState.isRegisteredUser || !appState.currentUser)) {
    alert("심플 및 프리미엄 테마는 [정회원 전용] 기능입니다.\n간편 회원가입 또는 로그인 후 이용해 주세요! 🔒");
    openAuthModal('login');
    return;
  }

  appState.themeCategory = category;
  
  ['Basic', 'Simple', 'Premium'].forEach(cat => {
    const tab = document.getElementById('tabTheme' + cat);
    const panel = document.getElementById('themeSubPanel' + cat);
    const isTarget = (cat.toLowerCase() === category);
    if (tab) {
      if (isTarget) {
        tab.className = "px-2 py-0.5 rounded-md bg-white text-theme shadow-2xs font-black";
      } else {
        tab.className = "px-2 py-0.5 rounded-md text-slate-500 font-bold";
      }
    }
    if (panel) {
      if (isTarget) panel.classList.remove('hidden');
      else panel.classList.add('hidden');
    }
  });

  if (category === 'basic') {
    setBasicTextPosition('middle', null);
  } else if (category === 'simple') {
    setSimpleOffsetLayout('offset1', null);
  } else if (category === 'premium') {
    setPremiumSubTheme('photoism', null);
  }
}

function setBasicTextPosition(pos, btn) {
  appState.frameStyle = pos; 
  document.querySelectorAll('.basic-pos-btn').forEach(b => {
    b.className = "basic-pos-btn p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold";
  });
  if (btn) btn.className = "basic-pos-btn p-1.5 bg-theme text-white border border-theme rounded-lg font-black shadow-2xs text-[10px]";
  renderStrip();
}

function setSimpleOffsetLayout(key, btn) {
  if (!appState.isRegisteredUser) { openAuthModal('login'); return; }
  appState.frameStyle = key; 
  document.querySelectorAll('.simple-theme-btn').forEach(b => {
    b.className = "simple-theme-btn p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold truncate";
  });
  if (btn) btn.className = "simple-theme-btn p-1.5 bg-theme text-white border border-theme rounded-lg font-black shadow-2xs text-[10px] truncate";
  renderStrip();
}

function setPremiumSubTheme(key, btn) {
  if (!appState.isRegisteredUser) { openAuthModal('login'); return; }
  appState.frameStyle = key; 
  document.querySelectorAll('.premium-theme-btn').forEach(b => {
    b.className = "premium-theme-btn p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold truncate";
  });
  if (btn) btn.className = "premium-theme-btn p-1.5 bg-theme text-white border border-theme rounded-lg font-black shadow-2xs text-[10px] truncate";
  renderStrip();
}

// ========================================================
// 9. 캔버스 렌더러 (하단문구 vs 상하단문구 분리)
// ========================================================
function renderStrip(isFinalExport = false) {
  const canvas = document.getElementById('photoCanvas'); 
  if (!canvas) return; 
  const ctx = canvas.getContext('2d');
  
  if (!appState.selectedImages || appState.selectedImages.length < 4) {
    if (appState.shotImages && appState.shotImages.length >= 4) {
      appState.selectedImages = appState.shotImages.slice(0, 4);
    } else {
      return;
    }
  }

  const layout = appState.layout || 'strip'; 
  const pad = appState.frameThickness || 60; 
  const gap = Math.round(pad * 0.5);
  const fStyle = appState.frameStyle;
  const isDark = (appState.frameColor === '#000000' || appState.frameColor === '#111827' || appState.frameColor === '#18181B');

  if (layout === 'strip') {
    canvas.width = 1200; canvas.height = 3600;
  } else if (layout === 'grid' || layout === 'twin') {
    canvas.width = 1800; canvas.height = 2700;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (fStyle === 'birthday') ctx.fillStyle = '#FAF7EE';
  else ctx.fillStyle = appState.frameColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (layout === 'strip') {
    renderStripLayoutSlots(ctx, canvas, pad, gap, fStyle, isDark);
  } else if (layout === 'grid') {
    renderGridLayoutSlots(ctx, canvas, pad, gap, fStyle, isDark);
  } else if (layout === 'twin') {
    renderTwinLayoutSlots(ctx, canvas, pad, gap, fStyle, isDark);
  }

  renderThemeOverlayGraphics(ctx, canvas, pad, fStyle, isDark, layout);
  renderStickersAndMirrors(ctx, canvas, layout);
}

function renderStripLayoutSlots(ctx, canvas, pad, gap, fStyle, isDark) {
  if (fStyle === 'middle') {
    const bannerH = 240;
    const imgW = canvas.width - (pad * 2);
    const imgH = (canvas.height - (pad * 2) - bannerH - (gap * 3)) / 4;
    drawFilteredSlotPhoto(ctx, appState.selectedImages[0], pad, pad, imgW, imgH);
    drawFilteredSlotPhoto(ctx, appState.selectedImages[1], pad, pad + imgH + gap, imgW, imgH);

    const lowerY = pad + (imgH * 2) + (gap * 2) + bannerH + gap;
    drawFilteredSlotPhoto(ctx, appState.selectedImages[2], pad, lowerY, imgW, imgH);
    drawFilteredSlotPhoto(ctx, appState.selectedImages[3], pad, lowerY + imgH + gap, imgW, imgH);
  } 
  else if (fStyle === 'top') {
    const topH = 240; const bottomH = pad;
    const imgW = canvas.width - (pad * 2);
    const imgH = (canvas.height - topH - bottomH - (gap * 3)) / 4;
    for (let i = 0; i < 4; i++) {
      drawFilteredSlotPhoto(ctx, appState.selectedImages[i], pad, topH + (i * (imgH + gap)), imgW, imgH);
    }
  } 
  else if (fStyle === 'bottom') {
    const topH = pad; 
    const bottomH = 240; 
    const imgW = canvas.width - (pad * 2);
    const imgH = (canvas.height - topH - bottomH - (gap * 3)) / 4;
    for (let i = 0; i < 4; i++) {
      drawFilteredSlotPhoto(ctx, appState.selectedImages[i], pad, topH + (i * (imgH + gap)), imgW, imgH);
    }
  } 
  else if (fStyle === 'dual') {
    const dualH = 180;
    const imgW = canvas.width - (pad * 2);
    const imgH = (canvas.height - (dualH * 2) - (gap * 3)) / 4;
    for (let i = 0; i < 4; i++) {
      drawFilteredSlotPhoto(ctx, appState.selectedImages[i], pad, dualH + (i * (imgH + gap)), imgW, imgH);
    }
  }
  else if (['offset1', 'offset2', 'offset3'].includes(fStyle)) {
    const topH = 140; const bottomH = 160;
    const baseW = canvas.width - (pad * 2) - 60;
    const imgH = (canvas.height - topH - bottomH - (gap * 3)) / 4;

    for (let i = 0; i < 4; i++) {
      let offsetX = 0; let slotW = baseW;
      if (fStyle === 'offset1') offsetX = (i % 2 === 0) ? -28 : 28;
      else if (fStyle === 'offset2') { const offsets = [-35, 0, 35, -35]; offsetX = offsets[i]; }
      else if (fStyle === 'offset3') slotW = (i === 1 || i === 2) ? baseW - 90 : baseW + 30;
      const x = (canvas.width - slotW) / 2 + offsetX;
      const y = topH + (i * (imgH + gap));
      drawFilteredSlotPhoto(ctx, appState.selectedImages[i], x, y, slotW, imgH);
    }
  }
  else {
    const topH = 180;
    const bottomH = (fStyle === 'photoism') ? pad : 240;
    const imgW = canvas.width - (pad * 2);
    const imgH = (canvas.height - topH - bottomH - (gap * 3)) / 4;
    for (let i = 0; i < 4; i++) {
      drawFilteredSlotPhoto(ctx, appState.selectedImages[i], pad, topH + (i * (imgH + gap)), imgW, imgH);
    }
  }
}

function renderGridLayoutSlots(ctx, canvas, pad, gap, fStyle, isDark) {
  if (fStyle === 'top') {
    const topH = 220; const bottomH = pad;
    const imgW = (canvas.width - (pad * 2) - gap) / 2;
    const imgH = (canvas.height - topH - bottomH - gap) / 2;
    drawGridPhotoSlots(ctx, pad, topH, imgW, imgH, gap);
  }
  else if (fStyle === 'middle') {
    const bannerH = 180; const edgePad = pad;
    const imgW = (canvas.width - (pad * 2) - gap) / 2;
    const imgH = (canvas.height - (edgePad * 2) - bannerH - gap) / 2;

    drawFilteredSlotPhoto(ctx, appState.selectedImages[0], pad, edgePad, imgW, imgH);
    drawFilteredSlotPhoto(ctx, appState.selectedImages[1], pad + imgW + gap, edgePad, imgW, imgH);

    const lowerY = edgePad + imgH + bannerH;
    drawFilteredSlotPhoto(ctx, appState.selectedImages[2], pad, lowerY, imgW, imgH);
    drawFilteredSlotPhoto(ctx, appState.selectedImages[3], pad + imgW + gap, lowerY, imgW, imgH);
  }
  else if (fStyle === 'bottom') {
    const topH = pad; const bottomH = 200;
    const imgW = (canvas.width - (pad * 2) - gap) / 2;
    const imgH = (canvas.height - topH - bottomH - gap) / 2;
    drawGridPhotoSlots(ctx, pad, topH, imgW, imgH, gap);
  }
  else if (fStyle === 'dual') {
    const topH = 160; const bottomH = 180;
    const imgW = (canvas.width - (pad * 2) - gap) / 2;
    const imgH = (canvas.height - topH - bottomH - gap) / 2;
    drawGridPhotoSlots(ctx, pad, topH, imgW, imgH, gap);
  }
  else if (fStyle === 'offset1') { 
    const topH = 140;
    const baseW = (canvas.width - (pad * 2) - gap) / 2;
    const baseH = (canvas.height - topH - 140 - gap) / 2;
    drawFilteredSlotPhoto(ctx, appState.selectedImages[0], pad, topH, baseW * 1.05, baseH * 1.05);
    drawFilteredSlotPhoto(ctx, appState.selectedImages[1], pad + baseW + gap + 15, topH + 15, baseW * 0.95, baseH * 0.95);
    drawFilteredSlotPhoto(ctx, appState.selectedImages[2], pad, topH + baseH + gap + 15, baseW * 0.95, baseH * 0.95);
    drawFilteredSlotPhoto(ctx, appState.selectedImages[3], pad + baseW + gap, topH + baseH + gap, baseW * 1.05, baseH * 1.05);
  }
  else if (fStyle === 'offset2') { 
    const topH = 160;
    const imgW = (canvas.width - (pad * 2) - gap) / 2;
    const imgH = (canvas.height - topH - 180 - gap) / 2;
    drawFilteredSlotPhoto(ctx, appState.selectedImages[0], pad, topH - 25, imgW, imgH);
    drawFilteredSlotPhoto(ctx, appState.selectedImages[1], pad + imgW + gap, topH + 25, imgW, imgH);
    drawFilteredSlotPhoto(ctx, appState.selectedImages[2], pad, topH + imgH + gap - 25, imgW, imgH);
    drawFilteredSlotPhoto(ctx, appState.selectedImages[3], pad + imgW + gap, topH + imgH + gap + 25, imgW, imgH);
  }
  else if (fStyle === 'offset3') { 
    const topH = 160;
    const imgW = (canvas.width - (pad * 2) - gap) / 2;
    const imgH = (canvas.height - topH - 180 - gap) / 2;
    drawFilteredSlotPhoto(ctx, appState.selectedImages[0], pad + 20, topH + 10, imgW - 20, imgH - 10);
    drawFilteredSlotPhoto(ctx, appState.selectedImages[1], pad + imgW + gap, topH, imgW, imgH);
    drawFilteredSlotPhoto(ctx, appState.selectedImages[2], pad, topH + imgH + gap, imgW, imgH);
    drawFilteredSlotPhoto(ctx, appState.selectedImages[3], pad + imgW + gap + 10, topH + imgH + gap + 10, imgW - 20, imgH - 10);
  }
  else {
    const topH = 180;
    const bottomH = (fStyle === 'photoism') ? pad : 200;
    const imgW = (canvas.width - (pad * 2) - gap) / 2;
    const imgH = (canvas.height - topH - bottomH - gap) / 2;
    drawGridPhotoSlots(ctx, pad, topH, imgW, imgH, gap);
  }
}

function drawGridPhotoSlots(ctx, pad, topH, imgW, imgH, gap) {
  const coords = [
    { x: pad, y: topH },
    { x: pad + imgW + gap, y: topH },
    { x: pad, y: topH + imgH + gap },
    { x: pad + imgW + gap, y: topH + imgH + gap }
  ];
  for (let i = 0; i < 4; i++) {
    drawFilteredSlotPhoto(ctx, appState.selectedImages[i], coords[i].x, coords[i].y, imgW, imgH);
  }
}

function renderTwinLayoutSlots(ctx, canvas, pad, gap, fStyle, isDark) {
  const stripW = (canvas.width / 2) - 30;
  const padX = pad * 0.65;
  const imgW = stripW - (padX * 2);
  const topH = 140; const bottomH = 180;
  const imgH = (canvas.height - topH - bottomH - (gap * 3)) / 4;

  [15, canvas.width / 2 + 15].forEach(baseX => {
    for (let i = 0; i < 4; i++) {
      drawFilteredSlotPhoto(ctx, appState.selectedImages[i], baseX + padX, topH + (i * (imgH + gap)), imgW, imgH);
    }
  });

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 12]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 30);
  ctx.lineTo(canvas.width / 2, canvas.height - 30);
  ctx.stroke();
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✂️', canvas.width / 2, 90);
  ctx.fillText('✂️', canvas.width / 2, canvas.height / 2);
  ctx.fillText('✂️', canvas.width / 2, canvas.height - 90);
  ctx.restore();
}

function renderThemeOverlayGraphics(ctx, canvas, pad, fStyle, isDark, layout) {
  ctx.save();

  if (fStyle === 'photoism') {
    const textColor = isDark ? '#FFFFFF' : '#0F172A';
    
    ctx.fillStyle = textColor;
    ctx.font = "700 56px 'Playfair Display', serif";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText("photoism", pad, 95);

    const topH = 180; const bottomH = pad; const gap = Math.round(pad * 0.5);
    const imgH = (canvas.height - topH - bottomH - (gap * 3)) / 4;

    for (let i = 0; i < 4; i++) {
      const centerY = topH + (i * (imgH + gap)) + (imgH / 2);
      ctx.fillStyle = textColor;
      ctx.font = "bold 30px monospace"; 
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("▲", pad / 2, centerY);
    }

    ctx.save();
    ctx.translate(canvas.width - (pad / 2), canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)';
    ctx.font = "bold 16px monospace";
    ctx.textAlign = 'center';
    ctx.fillText("Photography      PhotoBooth      PhotoIs      editor", 0, 0);
    ctx.restore();
  }
  else if (fStyle === 'birthday') {
    ctx.fillStyle = '#E11D48';
    ctx.font = "900 68px 'Playfair Display', serif";
    ctx.textAlign = 'left';
    ctx.fillText("Happy Birthday ♡", pad, 95);

    ctx.fillStyle = '#9F1239';
    ctx.font = "bold 20px 'Pretendard', sans-serif";
    ctx.fillText("오늘은 너라는 기적이 태어난 날! 🎂", pad, 140);

    ctx.font = "34px sans-serif";
    ctx.fillText("🎀", canvas.width - pad - 60, 105);
  }
  else if (fStyle === 'baseball') {
    ctx.fillStyle = '#1E3A8A';
    ctx.font = "900 64px 'Black Han Sans', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText("⚾ PLAY BASEBALL!", pad, 95);

    ctx.fillStyle = '#DC2626';
    ctx.font = "bold 20px 'Pretendard', sans-serif";
    ctx.fillText("오늘도, 우리는 야구를 한다! ★", pad, 140);

    ctx.font = "36px sans-serif";
    ctx.fillText("⚾", canvas.width - pad - 60, 100);
  }

  if (fStyle !== 'photoism') {
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';
    ctx.font = "bold 18px monospace";
    ctx.textAlign = 'center';
    ctx.letterSpacing = "2px";
    ctx.fillText("Photography  |  PhotoBooth  |  PhotoIs  |  editor", canvas.width / 2, canvas.height - 35);
  }

  ctx.restore();
}

function drawFilteredSlotPhoto(ctx, img, targetX, targetY, targetW, targetH) {
  ctx.save();
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(targetX, targetY, targetW, targetH);

  if (!img || !img.src) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('사진 불러오는 중...', targetX + targetW / 2, targetY + targetH / 2);
    ctx.restore();
    return;
  }

  ctx.beginPath(); 
  ctx.rect(targetX, targetY, targetW, targetH); 
  ctx.clip();

  const srcRatio = (img.width || 1920) / (img.height || 1080); 
  const targetRatio = targetW / targetH; 
  let renderW, renderH;

  if (srcRatio > targetRatio) { renderH = targetH; renderW = targetH * srcRatio; } 
  else { renderW = targetW; renderH = targetW / srcRatio; }

  const drawX = targetX + (targetW - renderW) / 2; 
  const drawY = targetY + (targetH - renderH) / 2;
  const isNormal = appState.activeFilter === 'normal' && appState.filters.bright === 100 && appState.filters.contrast === 100 && appState.filters.saturate === 100;

  if (isNormal) { 
    ctx.drawImage(img, drawX, drawY, renderW, renderH); 
  } else {
    try {
      const off = document.createElement('canvas'); 
      const cw = Math.max(1, Math.round(renderW)); 
      const ch = Math.max(1, Math.round(renderH)); 
      off.width = cw; off.height = ch;
      const offCtx = off.getContext('2d'); 
      offCtx.imageSmoothingEnabled = true;
      offCtx.imageSmoothingQuality = 'high';
      offCtx.drawImage(img, 0, 0, cw, ch); 
      const imgData = offCtx.getImageData(0, 0, cw, ch); 
      applyPixelFilterMath(imgData, appState.activeFilter, appState.filters); 
      offCtx.putImageData(imgData, 0, 0); 
      ctx.drawImage(off, drawX, drawY, renderW, renderH); 
    } catch (err) { 
      ctx.drawImage(img, drawX, drawY, renderW, renderH); 
    }
  }
  ctx.restore();
}

function applyPixelFilterMath(imageData, filterKey, customAdjust) {
  const d = imageData.data; 
  const len = d.length; 
  const bMul = customAdjust.bright / 100; 
  const cFactor = ((customAdjust.contrast - 100) * 2.55) / 255 + 1; 
  const sMul = customAdjust.saturate / 100;

  for (let i = 0; i < len; i += 4) {
    let r = d[i], g = d[i+1], b = d[i+2];

    if (filterKey === 'harublue') { r = r * 0.94; g = g * 1.05 + 6; b = b * 1.20 + 16; }
    else if (filterKey === 'deepmono') { const gray = 0.299 * r + 0.587 * g + 0.114 * b; r = g = b = gray; }
    else if (filterKey === 'y2kcyber') { r = r * 0.90; g = g * 1.08 + 10; b = b * 1.02 + 5; }
    else if (filterKey === 'peachglow') { r = r * 1.15 + 14; g = g * 1.04 + 6; b = b * 0.92; }
    else if (filterKey === 'naturalgloss') { r = r * 1.12 + 10; g = g * 1.10 + 8; b = b * 1.12 + 10; }
    else if (filterKey === 'bright') { r = r*1.1+10; g = g*1.08+8; b = b*1.05+6; }
    else if (filterKey === 'radiant') { r = r*1.12+15; g = g*1.1+12; b = b*1.15+15; }
    else if (filterKey === 'warm') { r = r*1.12+12; g = g*1.05+6; b = b*0.92; }
    else if (filterKey === 'cool') { r = r*0.92; g = g*1.02+4; b = b*1.15+12; }
    else if (filterKey === 'mood') { r = r*1.06+8; g = g*0.98; b = b*0.92+5; }
    else if (filterKey === 'retro') { r = r*1.08+15; g = g*0.95+8; b = b*0.82+12; }
    else if (filterKey === 'mono') { const gray = 0.299*r + 0.587*g + 0.114*b; r = g = b = gray; }
    else if (filterKey === 'sunset') { r = r*1.18+15; g = g*1.02+5; b = b*0.85; }
    else if (filterKey === 'pink') { r = r*1.15+12; g = g*0.95; b = b*1.1+10; }

    r *= bMul; g *= bMul; b *= bMul; 
    r = ((r / 255 - 0.5) * cFactor + 0.5) * 255; 
    g = ((g / 255 - 0.5) * cFactor + 0.5) * 255; 
    b = ((b / 255 - 0.5) * cFactor + 0.5) * 255;

    if (sMul !== 1 && filterKey !== 'mono' && filterKey !== 'deepmono') { 
      const lum = 0.299*r + 0.587*g + 0.114*b; 
      r = lum + (r - lum)*sMul; g = lum + (g - lum)*sMul; b = lum + (b - lum)*sMul; 
    }
    d[i] = Math.min(255, Math.max(0, r)); 
    d[i+1] = Math.min(255, Math.max(0, g)); 
    d[i+2] = Math.min(255, Math.max(0, b));
  }
}

function renderStickersAndMirrors(ctx, canvas, layout) {
  const isTwin = (layout === 'twin');
  const mirrorOffsetX = canvas.width / 2;

  appState.stickers.forEach((st) => {
    drawSingleSticker(ctx, st);
    if (isTwin) {
      const mirrored = { ...st, x: st.x + mirrorOffsetX };
      drawSingleSticker(ctx, mirrored);
    }
  });
}

function drawSingleSticker(ctx, st) {
  ctx.save();
  ctx.translate(st.x, st.y);
  ctx.rotate(((st.rotation || 0) * Math.PI) / 180);
  if (st.type === 'text') {
    const fontName = st.fontFamily || 'Pretendard'; 
    ctx.font = `900 ${st.size}px '${fontName}', sans-serif`; 
    ctx.fillStyle = st.color || '#FFFFFF'; 
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; 
    ctx.shadowBlur = 10; 
    ctx.textAlign = 'center'; 
    ctx.textBaseline = 'middle'; 
    ctx.fillText(st.text, 0, 0);
  } else {
    ctx.font = `${st.size}px sans-serif`; 
    ctx.textAlign = 'center'; 
    ctx.textBaseline = 'middle'; 
    ctx.fillText(st.text, 0, 0);
  }
  ctx.restore();
}

// ========================================================
// 10. 날짜 오브젝트 시스템
// ========================================================
function toggleDateObject(checked) {
  saveStateForUndo();
  appState.showDate = checked;
  initOrUpdateDateSticker(checked);
  renderStrip();
}

function initOrUpdateDateSticker(show) {
  const canvas = document.getElementById('photoCanvas');
  const existingIdx = appState.stickers.findIndex(s => s.isDate === true);

  if (show) {
    if (existingIdx === -1) {
      const newDateSticker = {
        id: 'date_obj_' + Date.now(),
        type: 'text',
        isDate: true,
        text: appState.typography.date,
        x: canvas && canvas.width ? canvas.width / 2 : 600,
        y: canvas && canvas.height ? (appState.selectedFormat === 'strip' ? canvas.height - 180 : canvas.height - 140) : 3450,
        size: 38,
        rotation: 0,
        color: (appState.frameColor === '#FFFFFF' || appState.frameColor === '#E2E8F0') ? '#1E293B' : '#FFFFFF',
        fontFamily: 'Pretendard'
      };
      appState.stickers.push(newDateSticker);
    }
  } else if (existingIdx !== -1) {
    appState.stickers.splice(existingIdx, 1);
    if (appState.selectedStickerIdx === existingIdx) {
      appState.selectedStickerIdx = -1;
      const bar = document.getElementById('stickerControlBar');
      if (bar) bar.classList.add('hidden');
    }
  }
}

// ========================================================
// 11. 2단계 돋보기 (이동 시 스티커 전체 확대)
// ========================================================
function updateFloatingLoupe(touchX, touchY, canvasCoordX, canvasCoordY, isDragging) {
  const loupe = document.getElementById('floatingLoupe');
  const lCanvas = document.getElementById('loupeCanvas');
  const mainCanvas = document.getElementById('photoCanvas');
  if (!loupe || !lCanvas || !mainCanvas) return;

  loupe.style.left = `${touchX}px`;
  loupe.style.top = `${touchY}px`;
  loupe.classList.remove('hidden');

  const loupeW = 140; const loupeH = 140;
  lCanvas.width = loupeW;
  lCanvas.height = loupeH;
  const lCtx = lCanvas.getContext('2d');
  lCtx.imageSmoothingEnabled = true;
  lCtx.imageSmoothingQuality = 'high';
  lCtx.clearRect(0, 0, loupeW, loupeH);

  if (!isDragging) {
    const cropSize = 80;
    lCtx.drawImage(
      mainCanvas,
      canvasCoordX - cropSize / 2,
      canvasCoordY - cropSize / 2,
      cropSize,
      cropSize,
      0,
      0,
      loupeW,
      loupeH
    );
    lCtx.strokeStyle = 'rgba(244, 63, 94, 0.85)';
    lCtx.lineWidth = 1.5;
    lCtx.beginPath();
    lCtx.moveTo(70, 50); lCtx.lineTo(70, 90);
    lCtx.moveTo(50, 70); lCtx.lineTo(90, 70);
    lCtx.stroke();
  } 
  else if (appState.selectedStickerIdx >= 0) {
    const st = appState.stickers[appState.selectedStickerIdx];
    lCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    lCtx.fillRect(0, 0, loupeW, loupeH);

    const safeZoneSize = 100;
    let approxWidth = st.size;
    if (st.type === 'text') {
      approxWidth = Math.max(st.size, (st.text ? st.text.length : 1) * (st.size * 0.65));
    }
    const maxBound = Math.max(approxWidth, st.size);
    const autoScale = safeZoneSize / Math.max(safeZoneSize, maxBound);

    lCtx.save();
    lCtx.translate(70, 70);
    lCtx.rotate(((st.rotation || 0) * Math.PI) / 180);
    lCtx.scale(autoScale, autoScale);

    if (st.type === 'text') {
      lCtx.font = `900 ${st.size}px '${st.fontFamily || 'Pretendard'}', sans-serif`;
      lCtx.fillStyle = st.color || '#1E293B';
      lCtx.textAlign = 'center';
      lCtx.textBaseline = 'middle';
      lCtx.fillText(st.text, 0, 0);
    } else {
      lCtx.font = `${st.size}px sans-serif`;
      lCtx.textAlign = 'center';
      lCtx.textBaseline = 'middle';
      lCtx.fillText(st.text, 0, 0);
    }
    lCtx.restore();
  }
}

function hideFloatingLoupe() {
  const loupe = document.getElementById('floatingLoupe');
  if (loupe) loupe.classList.add('hidden');
}

function initCanvasInteractions() {
  const canvas = document.getElementById('photoCanvas');
  const viewport = document.getElementById('canvasViewport');
  if (!canvas || !viewport) return;

  let initialStickerDist = 0;
  let initialStickerAngle = 0;
  let baseStickerSize = 65;
  let baseStickerRotation = 0;
  let dragStartCoord = { x: 0, y: 0 };

  function getCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      clientX, clientY,
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function handleStart(e) {
    if (e.touches && e.touches.length === 2 && appState.selectedStickerIdx !== -1) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      initialStickerDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      initialStickerAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * 180 / Math.PI;
      const st = appState.stickers[appState.selectedStickerIdx];
      baseStickerSize = st.size;
      baseStickerRotation = st.rotation || 0;
      return;
    }

    const touch = e.touches ? e.touches[0] : e;
    const c = getCoords(touch.clientX, touch.clientY);
    let hitSticker = false;

    for (let i = appState.stickers.length - 1; i >= 0; i--) {
      const st = appState.stickers[i];
      const dist = Math.hypot(c.x - st.x, c.y - st.y);
      if (dist <= Math.max(90, st.size * 1.2)) {
        appState.selectedStickerIdx = i;
        appState.dragTarget = i;
        appState.dragStartPos = { x: c.x - st.x, y: c.y - st.y };
        dragStartCoord = { x: touch.clientX, y: touch.clientY };
        appState.isDraggingSticker = false;

        showStickerControls(st);
        renderStrip();
        hitSticker = true;
        updateFloatingLoupe(touch.clientX, touch.clientY, c.x, c.y, false);
        break;
      }
    }

    if (!hitSticker) {
      isPanning = true;
      panStartX = touch.clientX - canvasPanX;
      panStartY = touch.clientY - canvasPanY;
      appState.selectedStickerIdx = -1;
      appState.dragTarget = null;
      hideFloatingLoupe();
      const bar = document.getElementById('stickerControlBar'); 
      if (bar) bar.classList.add('hidden');
      renderStrip();
    }
  }

  function handleMove(e) {
    if (e.touches && e.touches.length === 2 && appState.selectedStickerIdx !== -1 && initialStickerDist > 0) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const curDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const curAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * 180 / Math.PI;

      const scaleFactor = curDist / initialStickerDist;
      const angleDiff = curAngle - initialStickerAngle;
      const st = appState.stickers[appState.selectedStickerIdx];
      st.size = Math.max(25, Math.min(320, Math.round(baseStickerSize * scaleFactor)));
      
      let newRot = Math.round((baseStickerRotation + angleDiff) % 180);
      st.rotation = newRot;
      
      showStickerControls(st);
      renderStrip();
      return;
    }

    const touch = e.touches ? e.touches[0] : e;
    const c = getCoords(touch.clientX, touch.clientY);

    if (appState.dragTarget !== null) {
      if (e.cancelable) e.preventDefault();
      const st = appState.stickers[appState.dragTarget];
      st.x = c.x - appState.dragStartPos.x;
      st.y = c.y - appState.dragStartPos.y;

      const moveDist = Math.hypot(touch.clientX - dragStartCoord.x, touch.clientY - dragStartCoord.y);
      if (moveDist > 6) {
        appState.isDraggingSticker = true;
      }

      renderStrip();
      updateFloatingLoupe(touch.clientX, touch.clientY, st.x, st.y, appState.isDraggingSticker);
    } else if (isPanning) {
      if (e.cancelable) e.preventDefault();
      canvasPanX = touch.clientX - panStartX;
      canvasPanY = touch.clientY - panStartY;
      applyZoomTransform();
    }
  }

  function handleEnd() { 
    if (appState.dragTarget !== null) saveStateForUndo(); 
    appState.dragTarget = null; 
    isPanning = false;
    initialStickerDist = 0;
    appState.isDraggingSticker = false;
    hideFloatingLoupe();
  }

  viewport.addEventListener('mousedown', handleStart); 
  window.addEventListener('mousemove', handleMove); 
  window.addEventListener('mouseup', handleEnd);
  viewport.addEventListener('touchstart', handleStart, { passive: false }); 
  window.addEventListener('touchmove', handleMove, { passive: false }); 
  window.addEventListener('touchend', handleEnd);
}

// 🌟 센터 0° 회전 슬라이더 & 서식 제어
function onSelectedStickerRotate(deg) {
  if (appState.selectedStickerIdx >= 0 && appState.selectedStickerIdx < appState.stickers.length) {
    const val = parseInt(deg);
    appState.stickers[appState.selectedStickerIdx].rotation = val;
    const lbl = document.getElementById('stickerRotateValueLabel');
    if (lbl) lbl.textContent = `${val}°`;
    renderStrip();
  }
}

function onSelectedStickerResize(size) {
  if (appState.selectedStickerIdx >= 0 && appState.selectedStickerIdx < appState.stickers.length) {
    appState.stickers[appState.selectedStickerIdx].size = Math.round(parseInt(size) * 1.5);
    renderStrip();
  }
}

function onSelectedStickerColorChange(color) {
  if (appState.selectedStickerIdx >= 0 && appState.selectedStickerIdx < appState.stickers.length) {
    saveStateForUndo();
    appState.stickers[appState.selectedStickerIdx].color = color;
    renderStrip();
  }
}

function onSelectedStickerFontChange(fontName) {
  if (appState.selectedStickerIdx >= 0 && appState.selectedStickerIdx < appState.stickers.length) {
    saveStateForUndo();
    appState.stickers[appState.selectedStickerIdx].fontFamily = fontName;
    renderStrip();
  }
}

function deleteSelectedSticker() {
  if (appState.selectedStickerIdx >= 0) {
    saveStateForUndo();
    appState.stickers.splice(appState.selectedStickerIdx, 1);
    appState.selectedStickerIdx = -1;
    hideFloatingLoupe();
    const bar = document.getElementById('stickerControlBar');
    if (bar) bar.classList.add('hidden');
    renderStrip();
  }
}

function addDirectTextSticker() {
  const input = document.getElementById('directTextInput');
  if (!input) return;
  const val = input.value.trim();
  if (!val) { alert("추가할 문구를 입력해주세요!"); return; }
  addTextSticker(val);
  input.value = '';
}

function addTextSticker(text) {
  saveStateForUndo(); 
  const canvas = document.getElementById('photoCanvas');
  const newSticker = { 
    id: Date.now(), type: 'text', text, 
    x: canvas ? canvas.width / 2 : 600, 
    y: canvas ? canvas.height / 2 : 1800, 
    size: 70, rotation: 0, color: '#FFFFFF', 
    fontFamily: appState.typography.fontFamily || 'Pretendard' 
  };
  appState.stickers.push(newSticker); 
  appState.selectedStickerIdx = appState.stickers.length - 1;
  showStickerControls(newSticker); 
  renderStrip();
}

function addEmojiSticker(emoji) {
  saveStateForUndo(); 
  const canvas = document.getElementById('photoCanvas');
  const newSticker = { 
    id: Date.now(), type: 'emoji', text: emoji, 
    x: canvas ? canvas.width / 2 : 600, 
    y: canvas ? canvas.height / 2 : 1800, 
    size: 90, rotation: 0 
  };
  appState.stickers.push(newSticker); 
  appState.selectedStickerIdx = appState.stickers.length - 1;
  showStickerControls(newSticker); 
  renderStrip();
}

function clearAllStickers() { 
  saveStateForUndo(); 
  appState.stickers = []; 
  appState.selectedStickerIdx = -1; 
  hideFloatingLoupe();
  const bar = document.getElementById('stickerControlBar'); 
  if (bar) bar.classList.add('hidden'); 
  renderStrip(); 
}

function showStickerControls(st) {
  const bar = document.getElementById('stickerControlBar'); 
  if (!bar) return;
  bar.classList.remove('hidden');
  const sizeS = document.getElementById('stickerSizeSlider'); 
  if (sizeS) sizeS.value = Math.round(st.size / 1.5);
  
  const rotS = document.getElementById('stickerRotateSlider'); 
  const rotLbl = document.getElementById('stickerRotateValueLabel');
  if (rotS) rotS.value = st.rotation || 0;
  if (rotLbl) rotLbl.textContent = `${st.rotation || 0}°`;

  const customRow = document.getElementById('stickerTextCustomRow');
  if (st.type === 'text') { 
    if (customRow) customRow.classList.remove('hidden'); 
    const cp = document.getElementById('stickerColorPicker'); if (cp) cp.value = st.color || '#FFFFFF'; 
    const fs = document.getElementById('stickerFontSelect'); if (fs) fs.value = st.fontFamily || 'Pretendard'; 
  } else { 
    if (customRow) customRow.classList.add('hidden'); 
  }
}

function zoomCanvas(amount) {
  canvasZoom = Math.max(0.4, Math.min(3.0, canvasZoom + amount));
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
  if (label) label.textContent = Math.round(canvasZoom * 100) + '%';
}

function setupCanvasPinchZoom() {
  const viewport = document.getElementById('canvasViewport');
  if (!viewport) return;

  let initialPinchDist = 0;
  let initialZoom = 1.0;

  viewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2 && appState.selectedStickerIdx === -1) {
      e.preventDefault();
      initialPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialZoom = canvasZoom;
    }
  }, { passive: false });

  viewport.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && appState.selectedStickerIdx === -1 && initialPinchDist > 0) {
      e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = currentDist / initialPinchDist;
      canvasZoom = Math.max(0.4, Math.min(3.0, initialZoom * factor));
      applyZoomTransform();
    }
  }, { passive: false });

  viewport.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) initialPinchDist = 0;
  });
}

// ========================================================
// 12. 가변 스플릿 리사이저 바
// ========================================================
function initSplitResizer() {
  const resizer = document.getElementById('editorSplitResizer');
  const canvasPane = document.getElementById('editorCanvasPane');
  const controlPane = document.getElementById('editorControlPane');
  const container = document.getElementById('screenEdit');
  if (!resizer || !canvasPane || !controlPane || !container) return;

  let isResizing = false;

  function onPointerDown(e) {
    isResizing = true;
    document.body.style.cursor = window.innerWidth >= 1024 ? 'col-resize' : 'row-resize';
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!isResizing) return;
    const isDesktop = window.innerWidth >= 1024;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (isDesktop) {
      const containerRect = container.getBoundingClientRect();
      const offset = clientX - containerRect.left;
      const pct = Math.max(35, Math.min(75, (offset / containerRect.width) * 100));
      canvasPane.style.width = `${pct}%`;
      controlPane.style.width = `${100 - pct}%`;
    } else {
      const containerRect = container.getBoundingClientRect();
      const offset = clientY - containerRect.top;
      const pct = Math.max(35, Math.min(75, (offset / containerRect.height) * 100));
      canvasPane.style.height = `${pct}%`;
      controlPane.style.height = `${100 - pct}%`;
    }
  }

  function onPointerUp() {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
    }
  }

  resizer.addEventListener('mousedown', onPointerDown);
  resizer.addEventListener('touchstart', onPointerDown, { passive: false });
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('mouseup', onPointerUp);
  window.addEventListener('touchend', onPointerUp);
}

// ========================================================
// 13. 비디오 키프레임 포스터 & [복구] QR코드 다운로드
// ========================================================
async function generateFourCutVideo() {
  if (!appState.isRegisteredUser) {
    alert("10Mbps 초고화질 4컷 비디오 생성은 [정회원 전용] 기능입니다. 로그인 후 이용해 주세요! 🎬");
    openAuthModal('login');
    return;
  }

  const hasValidVideo = appState.selectedIndices.every(idx => idx !== null && appState.shotVideoBlobs[idx]);
  if (!hasValidVideo) {
    alert("촬영 영상 데이터가 부족합니다. 부스에서 4컷을 연속 촬영했을 때 가능합니다.");
    return;
  }

  const btn = document.getElementById('btnAutoVideo'); 
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i><span>합성 중</span>`;
  }
  if (window.lucide) lucide.createIcons();

  try {
    const videoElements = await Promise.all(appState.selectedIndices.map(shotIdx => {
      return new Promise((resolve) => {
        const blob = appState.shotVideoBlobs[shotIdx]; 
        const v = document.createElement('video'); 
        v.src = URL.createObjectURL(blob); 
        v.muted = true; v.loop = true; v.setAttribute('playsinline', ''); 
        v.onloadedmetadata = () => { v.play().then(() => resolve(v)).catch(() => resolve(v)); };
      });
    }));

    const vCanvas = document.createElement('canvas'); 
    vCanvas.width = 1080; vCanvas.height = 3240;
    const vCtx = vCanvas.getContext('2d');
    vCtx.imageSmoothingEnabled = true;
    vCtx.imageSmoothingQuality = 'high';

    let mimeType = 'video/mp4'; 
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported('video/mp4')) { 
      mimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) ? 'video/webm;codecs=vp8' : 'video/webm'; 
    }

    const stream = vCanvas.captureStream(60); 
    const recorder = new MediaRecorder(stream, { 
      mimeType,
      videoBitsPerSecond: 10000000
    }); 
    const chunks = []; 
    recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

    recorder.onstop = async () => {
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'; 
      const blob = new Blob(chunks, { type: mimeType }); 
      currentGeneratedVideoBlob = blob;
      currentGeneratedVideoFileName = `[추억네컷]_Video_${Date.now()}.${ext}`;

      openVideoResultModal(blob);

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="video" class="w-3.5 h-3.5"></i><span>4컷 비디오</span>`;
      }
      if (window.lucide) lucide.createIcons();

      const reader = new FileReader();
      reader.onloadend = () => {
        const pureBase64 = extractPureBase64(reader.result);
        uploadMediaToGoogleDrive(pureBase64, 'video', currentGeneratedVideoFileName, mimeType).catch(() => {});
      };
      reader.readAsDataURL(blob);
    };
    recorder.start();

    const posterCanvas = document.getElementById('photoCanvas');
    const topH = 160; const bottomH = 240; const pad = 50; const gap = 24; 
    const slotW = vCanvas.width - (pad * 2); 
    const slotH = (vCanvas.height - topH - bottomH - (gap * 3)) / 4; 
    const startTime = performance.now(); 
    const totalDuration = 6000;

    function renderVideoLoop(time) {
      const elapsed = time - startTime; 

      if (elapsed < 200 && posterCanvas) {
        vCtx.drawImage(posterCanvas, 0, 0, vCanvas.width, vCanvas.height);
      } else {
        vCtx.fillStyle = appState.frameColor; 
        vCtx.fillRect(0, 0, vCanvas.width, vCanvas.height); 

        for (let i = 0; i < 4; i++) {
          const vy = topH + (i * (slotH + gap)); 
          vCtx.save(); vCtx.beginPath(); vCtx.rect(pad, vy, slotW, slotH); vCtx.clip(); 
          const v = videoElements[i]; 
          const vW = v.videoWidth || 1280; const vH = v.videoHeight || 720; 
          const vRatio = vW / vH; const targetRatio = slotW / slotH; 
          let rw, rh;
          if (vRatio > targetRatio) { rh = slotH; rw = slotH * vRatio; } 
          else { rw = slotW; rh = slotW / vRatio; }
          vCtx.drawImage(v, pad + (slotW - rw) / 2, vy + (slotH - rh) / 2, rw, rh); 
          vCtx.restore();
        }

        renderThemeOverlayGraphics(vCtx, vCanvas, pad, appState.frameStyle, false, 'strip');
      }

      if (elapsed < totalDuration) requestAnimationFrame(renderVideoLoop); 
      else recorder.stop();
    }
    requestAnimationFrame(renderVideoLoop);
  } catch (err) { 
    alert("비디오 생성 실패: " + err.message); 
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="video" class="w-3.5 h-3.5"></i><span>4컷 비디오</span>`; 
    }
    if (window.lucide) lucide.createIcons(); 
  }
}

// 🌟 [본래 목적 100% 복구] QR코드 스캔 다운로드 화면 생성
async function generateImageQRCode() {
  const btn = document.getElementById('btnSaveQR'); 
  if (btn) { 
    btn.disabled = true; 
    btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i><span>QR 생성 중</span>`; 
  }
  if (window.lucide) lucide.createIcons();

  renderStrip(true); 
  const canvas = document.getElementById('photoCanvas'); 
  if (!canvas) return;

  const base64Img = canvas.toDataURL('image/png');
  const fileName = `[추억네컷]_${appState.selectedFormat || 'photo'}_${Date.now()}.png`;

  try {
    const res = await uploadMediaToGoogleDrive(extractPureBase64(base64Img), 'image', fileName, 'image/png');

    if (btn) { 
      btn.disabled = false; 
      btn.innerHTML = `<i data-lucide="qr-code" class="w-3.5 h-3.5"></i><span>QR 다운</span>`; 
    }
    if (window.lucide) lucide.createIcons();

    if (res && res.success && res.fileId) {
      const driveDirectUrl = `https://drive.google.com/file/d/${res.fileId}/view?usp=sharing`;
      displayResultWithQR(driveDirectUrl);
    } else {
      alert("구글 드라이브 업로드 지연 중입니다. 잠시 후 다시 시도해 주세요.");
    }
  } catch (err) {
    if (btn) { 
      btn.disabled = false; 
      btn.innerHTML = `<i data-lucide="qr-code" class="w-3.5 h-3.5"></i><span>QR 다운</span>`; 
    }
    if (window.lucide) lucide.createIcons();
    alert("QR 생성 중 오류가 발생했습니다: " + err.message);
  }
}

async function uploadMediaToGoogleDrive(base64Data, fileType, fileName, mimeType) {
  try {
    const res = await fetch(GOOGLE_DB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'UPLOAD_MEDIA',
        base64Data: base64Data,
        fileType: fileType,
        fileName: fileName,
        mimeType: mimeType
      })
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function autoSavePDF() {
  renderStrip(true); 
  const canvas = document.getElementById('photoCanvas'); 
  if (!canvas) return; 
  const imgData = canvas.toDataURL('image/jpeg', 0.98); 
  const { jsPDF } = window.jspdf; 

  const orientation = (canvas.width > canvas.height) ? 'landscape' : 'portrait'; 
  const pdf = new jsPDF({ orientation, unit: 'mm', format: [102, 152] }); 

  const pdfW = pdf.internal.pageSize.getWidth(), pdfH = pdf.internal.pageSize.getHeight(); 
  const margin = 2; 
  const maxW = pdfW - (margin * 2), maxH = pdfH - (margin * 2); 
  const imgRatio = canvas.width / canvas.height; 
  let printW = maxW, printH = printW / imgRatio; 
  if (printH > maxH) { printH = maxH; printW = printH * imgRatio; }
  pdf.addImage(imgData, 'JPEG', (pdfW - printW) / 2, (pdfH - printH) / 2, printW, printH); 
  pdf.save(`[추억네컷]_Print_${appState.selectedFormat}_${Date.now()}.pdf`);
}

function sharePhotoDirectly() {
  renderStrip(true); 
  const canvas = document.getElementById('photoCanvas'); 
  if (!canvas) return;
  canvas.toBlob(async (blob) => {
    if (!blob) return; 
    const file = new File([blob], `[추억네컷]_Photo_${Date.now()}.png`, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { 
      try { await navigator.share({ files: [file], title: '추억의 네컷', text: '추억의 네컷 사진입니다!' }); } catch (err) {} 
    } else { 
      const url = URL.createObjectURL(blob); 
      const a = document.createElement('a'); a.href = url; a.download = file.name; 
      document.body.appendChild(a); a.click(); document.body.removeChild(a); 
    }
  }, 'image/png');
}

function displayResultWithQR(url) {
  const qrBox = document.getElementById('qrcodeArea'); 
  if (!qrBox) return; 
  qrBox.innerHTML = ''; 
  new QRCode(qrBox, { text: url, width: 160, height: 160, correctLevel: QRCode.CorrectLevel.M });
  showScreen('screenResult'); 
  startAutoReset();
}

function returnToEditor() { 
  if (appState.resetInterval) { clearInterval(appState.resetInterval); appState.resetInterval = null; } 
  showScreen('screenEdit'); 
  renderStrip(); 
}

function openVideoResultModal(blob) {
  const modal = document.getElementById('videoResultModal');
  const player = document.getElementById('videoResultPlayer');
  if (!modal || !player) return;
  player.src = URL.createObjectURL(blob);
  modal.classList.remove('hidden');
  modal.style.removeProperty('display');
  modal.style.setProperty('display', 'flex', 'important');
  if (window.lucide) lucide.createIcons();
}

function closeVideoResultModal() {
  const modal = document.getElementById('videoResultModal');
  const player = document.getElementById('videoResultPlayer');
  if (player) player.pause();
  if (modal) {
    modal.classList.add('hidden');
    modal.style.setProperty('display', 'none', 'important');
  }
}

function downloadCurrentVideoFile() {
  if (!currentGeneratedVideoBlob) return;
  const url = URL.createObjectURL(currentGeneratedVideoBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = currentGeneratedVideoFileName || `[추억네컷]_Video_${Date.now()}.mp4`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function shareCurrentVideoFile() {
  if (!currentGeneratedVideoBlob) return;
  const ext = currentGeneratedVideoFileName.endsWith('.mp4') ? 'mp4' : 'webm';
  const file = new File([currentGeneratedVideoBlob], currentGeneratedVideoFileName, { type: `video/${ext}` });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: '추억의 네컷 비디오',
        text: '추억의 네컷 4컷 움직이는 비디오입니다! 🎬'
      });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  downloadCurrentVideoFile();
}

// ========================================================
// 14. 이용후기, 고객소리함 & 관리자 모드
// ========================================================
function handleStarClick(starNum) {
  currentRatingValue = starNum;
  updateRatingUI(starNum);
}

function updateRatingUI(num) {
  const scoreText = document.getElementById('ratingValueText');
  if (scoreText) scoreText.textContent = num.toFixed(1);

  for (let i = 1; i <= 5; i++) {
    const starEl = document.getElementById('star' + i);
    if (!starEl) continue;
    if (num >= i) {
      starEl.className = 'text-amber-500 transition hover:scale-110 cursor-pointer';
    } else {
      starEl.className = 'text-slate-300 transition hover:scale-110 cursor-pointer';
    }
  }
}

async function fetchCloudBoardPosts() {
  try {
    const res = await fetch(`${GOOGLE_DB_URL}?api=true&_t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.reviews)) {
        localStorage.setItem('vibe_posts', JSON.stringify(data.reviews));
        renderBoard();
        renderAdminReviewManageList();
      }
    }
  } catch (e) {
    renderBoard();
  }
}

function renderBoard() {
  const posts = JSON.parse(localStorage.getItem('vibe_posts') || '[]');
  const container = document.getElementById('boardListArea');
  const totalCount = posts.length;
  let totalRating = 0;
  posts.forEach(p => totalRating += (Number(p.rating) || 5.0));
  const avgRating = totalCount > 0 ? (totalRating / totalCount).toFixed(1) : '5.0';

  const avgScoreEl = document.getElementById('boardAvgScore');
  const avgStarsEl = document.getElementById('boardAvgStars');
  const totalCountEl = document.getElementById('boardTotalCount');
  if (avgScoreEl) avgScoreEl.textContent = avgRating;
  if (totalCountEl) totalCountEl.textContent = totalCount;
  if (avgStarsEl) {
    let s = '';
    for (let i = 0; i < Math.floor(parseFloat(avgRating)); i++) s += '⭐';
    avgStarsEl.textContent = s || '⭐';
  }
  if (!container) return;
  if (posts.length === 0) { 
    container.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">등록된 후기가 없습니다. 첫 후기를 남겨보세요! ✨</p>`; 
    return; 
  }

  container.innerHTML = posts.map(p => {
    const ratingNum = Number(p.rating) || 5.0; 
    let starStr = '';
    for (let i = 0; i < Math.floor(ratingNum); i++) starStr += '⭐';

    return `
      <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
        <div class="flex justify-between items-center">
          <div class="flex items-center space-x-1.5">
            <span class="font-bold text-xs text-slate-800">${escapeHtml(p.nickname)}</span>
            <span class="text-[10px] text-amber-500 font-black">${starStr} ${ratingNum.toFixed(1)}</span>
          </div>
          <span class="text-[10px] text-slate-400">${p.date}</span>
        </div>
        <p class="text-xs text-slate-700 break-words leading-relaxed">${escapeHtml(p.content)}</p>
      </div>
    `;
  }).join('');
}

async function submitBoardPost() {
  const nicknameInput = document.getElementById('boardNickname');
  const contentInput = document.getElementById('boardContent');
  const nickname = nicknameInput.value.trim() || '익명의 사진작가';
  const content = contentInput.value.trim();
  const rating = currentRatingValue;
  if (!content) { alert("후기 내용을 입력해주세요."); return; }

  const btn = document.getElementById('btnSubmitBoard'); 
  btn.disabled = true; 
  btn.textContent = "등록 중...";

  const tempPost = {
    id: Date.now(),
    nickname: nickname,
    content: content,
    rating: rating,
    date: getFormattedTodayDate()
  };
  let posts = JSON.parse(localStorage.getItem('vibe_posts') || '[]');
  posts.unshift(tempPost);
  localStorage.setItem('vibe_posts', JSON.stringify(posts));
  renderBoard();

  contentInput.value = ''; 
  nicknameInput.value = '';

  try {
    await fetch(GOOGLE_DB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'ADD_REVIEW', nickname: nickname, rating: rating, content: content })
    });
    setTimeout(fetchCloudBoardPosts, 500);
  } catch (err) {
  } finally {
    btn.disabled = false;
    btn.textContent = "등록";
  }
}

async function deleteReviewPost(id) {
  if (!confirm("이 후기를 영구 삭제하시겠습니까?")) return;

  let posts = JSON.parse(localStorage.getItem('vibe_posts') || '[]');
  posts = posts.filter(p => p.id !== id);
  localStorage.setItem('vibe_posts', JSON.stringify(posts));
  renderBoard();
  renderAdminReviewManageList();

  try {
    await fetch(GOOGLE_DB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'DELETE_REVIEW', id: id })
    });
  } catch (e) {}
}

function renderAdminReviewManageList() {
  const listEl = document.getElementById('adminReviewManageList');
  if (!listEl) return;
  const posts = JSON.parse(localStorage.getItem('vibe_posts') || '[]');
  if (posts.length === 0) { 
    listEl.innerHTML = `<p class="text-xs text-slate-400 py-3 text-center">등록된 후기가 없습니다.</p>`; 
    return; 
  }
  listEl.innerHTML = posts.map(p => `
    <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
      <div class="flex justify-between items-center">
        <span class="font-bold text-slate-800">${escapeHtml(p.nickname)} <b class="text-amber-500 ml-1">★ ${p.rating || 5.0}</b></span>
        <button onclick="deleteReviewPost(${p.id})" class="text-[10px] bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded font-black">삭제</button>
      </div>
      <p class="text-[11px] text-slate-600 break-words">${escapeHtml(p.content)}</p>
    </div>
  `).join('');
}

function openCustomerBotModal() {
  const m = document.getElementById('customerBotModal');
  if (m) {
    m.classList.remove('hidden');
    m.style.removeProperty('display');
    m.style.setProperty('display', 'flex', 'important');
  }
  if (window.lucide) lucide.createIcons();
}

function closeCustomerBotModal() {
  const m = document.getElementById('customerBotModal');
  if (m) {
    m.classList.add('hidden');
    m.style.setProperty('display', 'none', 'important');
  }
}

async function sendCustomerBotMessage() {
  const emailInput = document.getElementById('botContactEmail');
  const chatInput = document.getElementById('botChatInput');
  const email = emailInput.value.trim();
  const userMsg = chatInput.value.trim();

  if (!userMsg) return;

  const chatArea = document.getElementById('chatMessagesArea');
  const userDiv = document.createElement('div');
  userDiv.className = "flex items-start justify-end space-x-2";
  userDiv.innerHTML = `
    <div class="chat-bubble-user p-3 max-w-[80%] leading-relaxed">
      ${email ? `<span class="block text-[9px] opacity-80 mb-1">📩 ${escapeHtml(email)}</span>` : ''}
      ${escapeHtml(userMsg)}
    </div>
  `;
  chatArea.appendChild(userDiv);
  chatInput.value = '';
  chatArea.scrollTop = chatArea.scrollHeight;

  const btn = document.getElementById('btnSendBot');
  btn.disabled = true;

  const telemetry = await collectDeviceTelemetry();
  const deviceInfoStr = `${telemetry.device} / ${telemetry.os} / ${telemetry.browser} (${telemetry.screen})`;

  setTimeout(async () => {
    let replyComment = email
      ? `소중한 의견이 정상 접수되었습니다! 보내주신 내용을 토대로 서비스 개선에 적극 반영하며, 기재해주신 이메일(<b>${escapeHtml(email)}</b>)로 상세히 답변드리겠습니다. 감사합니다! 💖`
      : `소중한 의견이 정상 접수되었습니다! 보내주신 피드백을 바탕으로 시스템을 지속적으로 개선하겠습니다. (※ 개별 답변이 필요하신 경우 이메일 주소를 함께 남겨주세요.) 😊`;

    const aiDiv = document.createElement('div');
    aiDiv.className = "flex items-start space-x-2";
    aiDiv.innerHTML = `
      <div class="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 text-[10px] font-black">접수</div>
      <div class="chat-bubble-ai p-3 max-w-[85%] leading-relaxed text-slate-800">
        ${replyComment}
      </div>
    `;
    chatArea.appendChild(aiDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
    btn.disabled = false;

    try {
      await fetch(GOOGLE_DB_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'ADD_INQUIRY',
          email: email,
          message: userMsg,
          deviceInfo: deviceInfoStr
        })
      });
    } catch (e) {}
  }, 400);
}

// 🌟 관리자 설정 센터 호출 (knsupolo 및 12345678 대응)
function promptAdminMode(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }

  if (appState.isAdmin && appState.currentUser && appState.currentUser.userId === 'knsupolo') {
    openAdminDashboard();
    return;
  }

  const pw = prompt("관리자 비밀번호를 입력하세요:");
  if (pw === "12345678" || pw === "0724" || pw === "1234") {
    appState.isAdmin = true;
    openAdminDashboard();
  } else if (pw !== null) {
    alert("비밀번호가 올바르지 않습니다.");
  }
}

let hourlyChartInstance = null;
let deviceChartInstance = null;

function openAdminDashboard() {
  const modal = document.getElementById('adminDashboardModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.style.removeProperty('display');
  modal.style.setProperty('display', 'flex', 'important');
  updateAdminDashboardStats();
  renderAdminNoticeManageList();
  renderAdminReviewManageList();
  renderAdminLocationStats();
  switchAdminTab('stats');
  if (window.lucide) lucide.createIcons();
}

function closeAdminDashboard() {
  const modal = document.getElementById('adminDashboardModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.setProperty('display', 'none', 'important');
  }
}

function switchAdminTab(tabName) {
  ['stats', 'theme', 'notices', 'reviews'].forEach(t => {
    const btn = document.getElementById('tabBtn' + t.charAt(0).toUpperCase() + t.slice(1));
    const content = document.getElementById('adminTab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (t === tabName) {
      if (btn) btn.className = "flex-1 py-3 border-b-2 border-theme text-theme font-black";
      if (content) content.classList.remove('hidden');
    } else {
      if (btn) btn.className = "flex-1 py-3 border-b-2 border-transparent text-slate-400 hover:text-slate-700";
      if (content) content.classList.add('hidden');
    }
  });
  if (tabName === 'stats') setTimeout(renderCharts, 100);
}

function updateAdminDashboardStats() {
  const todayStr = getFormattedTodayDate();
  const logs = JSON.parse(localStorage.getItem('chueok_visitor_logs') || '[]');
  const todayVisits = parseInt(localStorage.getItem('chueok_stat_today_' + todayStr) || '1', 10);
  const totalVisits = parseInt(localStorage.getItem('chueok_stat_total') || '2180', 10);
  const now = new Date();
  const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7);
  const monthAgo = new Date(); monthAgo.setDate(now.getDate() - 30);
  let weekVisits = 0, monthVisits = 0;

  logs.forEach(l => {
    const logDate = new Date(l.date.replace(/\./g, '-'));
    if (logDate >= weekAgo) weekVisits++;
    if (logDate >= monthAgo) monthVisits++;
  });

  const elToday = document.getElementById('dashToday');
  const elWeek = document.getElementById('dashWeek');
  const elMonth = document.getElementById('dashMonth');
  const elTotal = document.getElementById('dashTotal');
  if (elToday) elToday.textContent = todayVisits;
  if (elWeek) elWeek.textContent = Math.max(todayVisits, weekVisits);
  if (elMonth) elMonth.textContent = Math.max(todayVisits, monthVisits);
  if (elTotal) elTotal.textContent = totalVisits.toLocaleString();
}

function renderCharts() {
  if (typeof Chart === 'undefined') return;
  const logs = JSON.parse(localStorage.getItem('chueok_visitor_logs') || '[]');

  const hourlyCounts = Array(24).fill(0);
  logs.forEach(l => { if (typeof l.hour === 'number' && l.hour >= 0 && l.hour <= 23) hourlyCounts[l.hour]++; });

  const ctxHourly = document.getElementById('chartHourly');
  if (ctxHourly) {
    if (hourlyChartInstance) hourlyChartInstance.destroy();
    hourlyChartInstance = new Chart(ctxHourly.getContext('2d'), {
      type: 'bar',
      data: { labels: Array.from({length: 24}, (_, i) => i + '시'), datasets: [{ label: '방문자수', data: hourlyCounts, backgroundColor: 'rgba(244, 63, 94, 0.75)', borderRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
  }

  const deviceCounts = JSON.parse(localStorage.getItem('chueok_device_stats') || '{}');
  const deviceLabels = ["아이폰", "안드로이드폰", "아이패드", "안드로이드패드", "PC", "기타"];
  const deviceData = deviceLabels.map(k => deviceCounts[k] || 0);

  const ctxDev = document.getElementById('chartDevice');
  if (ctxDev) {
    if (deviceChartInstance) deviceChartInstance.destroy();
    deviceChartInstance = new Chart(ctxDev.getContext('2d'), {
      type: 'doughnut',
      data: { 
        labels: deviceLabels, 
        datasets: [{ 
          data: deviceData.some(v => v > 0) ? deviceData : [1, 0, 0, 0, 0, 0], 
          backgroundColor: ['#f43f5e', '#10b981', '#0284c7', '#8b5cf6', '#f59e0b', '#64748b'] 
        }] 
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  }
}

function renderAdminLocationStats() {
  const container = document.getElementById('adminLocationStatsList');
  if (!container) return;
  const locMap = JSON.parse(localStorage.getItem('chueok_location_stats') || '{}');
  const entries = Object.entries(locMap);

  if (entries.length === 0) {
    container.innerHTML = `<p class="text-slate-400 text-center py-4">수집된 지역 통계가 없습니다.</p>`;
    return;
  }

  entries.sort((a, b) => b[1] - a[1]);
  container.innerHTML = entries.map(([loc, count]) => `
    <div class="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
      <span class="font-bold text-slate-700 flex items-center"><i data-lucide="map-pin" class="w-3 h-3 text-rose-500 mr-1"></i>${loc}</span>
      <span class="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">${count}회</span>
    </div>
  `).join('');
  if (window.lucide) lucide.createIcons();
}

function renderAdminNoticeManageList() {
  const listEl = document.getElementById('adminNoticeManageList');
  if (!listEl) return;
  const notices = getStoredNotices();
  listEl.innerHTML = notices.map(n => `
    <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
      <div>
        <span class="font-black text-theme text-[10px] mr-1">[${n.version || 'v17.0 Pro'}]</span>
        <span class="font-bold text-slate-800">${n.content}</span>
        <p class="text-[9px] text-slate-400 mt-0.5">${n.date}</p>
      </div>
      <button onclick="deleteNotice('${n.id}')" class="text-[10px] text-rose-600 underline font-bold ml-2 shrink-0">삭제</button>
    </div>
  `).join('');
}

async function writeAdminNotice() {
  const content = prompt("새 공지사항 내용을 입력하세요:");
  if (!content || !content.trim()) return;

  const newNotice = { 
    id: Date.now().toString(), 
    date: getFormattedTodayDate(), 
    version: 'v17.0 Pro', 
    content: content.trim() 
  };
  let list = getStoredNotices();
  list.unshift(newNotice);
  localStorage.setItem('vibe_notices', JSON.stringify(list));
  renderMainNotices(); 
  renderAdminNoticeManageList();

  try {
    await fetch(GOOGLE_DB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'ADD_NOTICE',
        content: newNotice.content,
        version: newNotice.version
      })
    });
  } catch (e) {}
}

async function deleteNotice(id) {
  if (!confirm("이 공지를 영구 삭제하시겠습니까?")) return;
  let list = getStoredNotices().filter(n => String(n.id) !== String(id));
  localStorage.setItem('vibe_notices', JSON.stringify(list));
  renderMainNotices(); 
  renderAdminNoticeManageList();

  try {
    await fetch(GOOGLE_DB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'DELETE_NOTICE', id: id })
    });
  } catch (e) {}
}

function getStoredNotices() {
  const stored = localStorage.getItem('vibe_notices');
  let list = [];
  if (stored) { 
    try { list = JSON.parse(stored); } catch(e) { list = []; } 
  }
  if (!list || list.length === 0) {
    list = [{ 
      id: 'v17_0', 
      date: getFormattedTodayDate(), 
      version: 'v17.0 Pro', 
      content: 'v17.0 Pro: 회원가입, 10장 클라우드 보관함, 2단계 돋보기 & 2x2 풀화면 적용 완료!' 
    }];
  }
  return list;
}

function renderMainNotices() {
  const container = document.getElementById('noticeListContainer');
  const area = document.getElementById('mainNoticeArea');
  if (!container || !area) return;
  area.classList.remove('hidden');
  container.innerHTML = `
    <div class="bg-white/95 border border-rose-100 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-left">
      <span class="bg-theme text-white text-[9px] font-black px-1.5 py-0.5 rounded shrink-0">v17.0 Pro</span>
      <p class="text-[11px] font-bold text-slate-800 truncate ml-2">회원 보관함(10장), 2단계 돋보기 & 테마 최적화 완료!</p>
    </div>
  `;
}

function detectCurrentDevice() {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "아이폰";
  if (/iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return "아이패드";
  if (/Android/i.test(ua)) {
    if (/Mobile/i.test(ua)) return "안드로이드폰";
    return "안드로이드패드";
  }
  if (/Macintosh|Mac OS X|Windows|Linux|CrOS/i.test(ua)) return "PC";
  return "기타";
}

async function collectDeviceTelemetry() {
  const ua = navigator.userAgent;
  const deviceType = detectCurrentDevice();

  let os = "기타 OS";
  if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS";

  let browser = "기타 브라우저";
  if (/KAKAOTALK/i.test(ua)) browser = "카카오톡 인앱";
  else if (/Instagram/i.test(ua)) browser = "인스타그램 인앱";
  else if (/NAVER/i.test(ua)) browser = "네이버 인앱";
  else if (/Whale/i.test(ua)) browser = "네이버 웨일";
  else if (/Chrome/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua)) browser = "Safari";

  const screenRes = `${window.screen.width} x ${window.screen.height}`;
  const viewportRes = `${window.innerWidth} x ${window.innerHeight}`;

  return {
    device: deviceType,
    os: os,
    browser: browser,
    screen: screenRes,
    viewport: viewportRes,
    referrer: document.referrer || "직접 접속"
  };
}

// ========================================================
// 15. 화면 전환 & 라이프사이클 관리
// ========================================================
function showScreen(id) {
  const screenIds = ['screenHome', 'screenBoard', 'screenLiveShoot', 'screenPick', 'screenEdit', 'screenResult'];
  screenIds.forEach(s => {
    const el = document.getElementById(s);
    if (el) { 
      if (s === id) { 
        el.classList.remove('hidden'); 
        el.style.removeProperty('display');
        el.style.setProperty('display', 'flex', 'important');
      } else { 
        el.classList.add('hidden'); 
        el.style.setProperty('display', 'none', 'important');
      } 
    }
  });
  try { if (window.lucide) lucide.createIcons(); } catch (e) {}
  if (id === 'screenBoard') { renderBoard(); fetchCloudBoardPosts(); }
  else if (id === 'screenHome') { checkPreviousSession(); renderMainNotices(); updateUserHeaderUI(); }
  else if (id === 'screenLiveShoot') { setTimeout(checkDeviceOrientation, 200); }
}

function cancelSession() { stopCameraAndAudio(); resetApp(); }

function resetApp() {
  if (appState.resetInterval) clearInterval(appState.resetInterval); 
  stopCameraAndAudio();
  appState.shotImages = []; 
  appState.selectedImages = []; 
  appState.selectedIndices = [0, 1, 2, 3]; 
  appState.stickers = []; 
  appState.selectedStickerIdx = -1; 
  galleryAccumulator = []; 
  showScreen('screenHome');
}

function startAutoReset() {
  if (appState.resetInterval) clearInterval(appState.resetInterval);
  let sec = 120; 
  const rText = document.getElementById('resetTimerText'); 
  if (rText) rText.textContent = `${sec}초`;
  appState.resetInterval = setInterval(() => { 
    sec--; 
    if (rText) rText.textContent = `${sec}초`; 
    if (sec <= 0) { clearInterval(appState.resetInterval); resetApp(); } 
  }, 1000);
}

function saveSessionStateToStorage() {
  try {
    const backupData = {
      format: appState.selectedFormat,
      layout: appState.layout,
      frameStyle: appState.frameStyle,
      frameColor: appState.frameColor,
      frameThickness: appState.frameThickness,
      activeFilter: appState.activeFilter,
      filters: appState.filters,
      typography: appState.typography,
      stickers: appState.stickers,
      images: appState.selectedImages.map(img => img.src)
    };
    sessionStorage.setItem('chueok_active_session', JSON.stringify(backupData));
    checkPreviousSession();
  } catch (e) {}
}

function checkPreviousSession() {
  const banner = document.getElementById('sessionRestoreBanner');
  if (!banner) return;
  const saved = sessionStorage.getItem('chueok_active_session');
  if (saved) banner.classList.remove('hidden');
  else banner.classList.add('hidden');
}

function restorePreviousSession() {
  const saved = sessionStorage.getItem('chueok_active_session');
  if (!saved) return;
  try {
    const data = JSON.parse(saved);
    appState.selectedFormat = data.format;
    appState.layout = data.layout;
    appState.frameStyle = data.frameStyle;
    appState.frameColor = data.frameColor;
    appState.frameThickness = data.frameThickness;
    appState.activeFilter = data.activeFilter;
    appState.filters = data.filters;
    appState.typography = data.typography;
    appState.stickers = data.stickers || [];

    const imgPromises = data.images.map(src => new Promise(res => {
      const img = new Image();
      img.onload = () => res(img);
      img.src = src;
    }));

    Promise.all(imgPromises).then(imgs => {
      appState.selectedImages = imgs;
      showScreen('screenEdit');
      renderStrip();
    });
  } catch (e) {
    sessionStorage.removeItem('chueok_active_session');
    checkPreviousSession();
  }
}

function changeLayout(mode, btn) {
  saveStateForUndo(); 
  appState.layout = mode;
  document.querySelectorAll('.layout-btn').forEach(b => { 
    b.className = "layout-btn bg-slate-100 text-slate-700 font-bold py-1.5 rounded-xl text-xs truncate"; 
  });
  if (btn) btn.className = "layout-btn bg-theme text-white font-bold py-1.5 rounded-xl text-xs";
  renderStrip();
}

function onThicknessChange(val) {
  appState.frameThickness = Math.round(parseInt(val) * 1.5);
  renderStrip();
}

function changeFrameColor(color, btn) {
  saveStateForUndo(); 
  appState.frameColor = color;
  document.querySelectorAll('.color-btn').forEach(b => b.classList.replace('border-theme', 'border-transparent'));
  if (btn) btn.classList.replace('border-transparent', 'border-theme');
  renderStrip();
}

function handleFilterClick(filterKey, btn) {
  const isAlreadyActive = (appState.activeFilter === filterKey);
  if (!isAlreadyActive) {
    saveStateForUndo(); 
    appState.activeFilter = filterKey; 
    const p = FILTER_PRESETS[filterKey] || FILTER_PRESETS.normal; 
    appState.filters = { ...p };
    document.querySelectorAll('.filter-btn').forEach(b => { b.className = "filter-btn bg-slate-100 text-slate-700 font-bold py-1 rounded border border-transparent"; });
    btn.className = "filter-btn bg-slate-900 text-white font-bold py-1 rounded border border-theme";
    const badge = document.getElementById('filterStateBadge'); if (badge) badge.textContent = p.name;
    const sb = document.getElementById('sliderBright'); if (sb) sb.value = p.bright;
    const sc = document.getElementById('sliderContrast'); if (sc) sc.value = p.contrast;
    const ss = document.getElementById('sliderSaturate'); if (ss) ss.value = p.saturate;
    renderStrip();
  } else {
    const panel = document.getElementById('filterFineTunePanel'); 
    if (panel) panel.classList.toggle('hidden');
  }
}

function onFineTuneSliderChange() {
  const sb = document.getElementById('sliderBright'); 
  const sc = document.getElementById('sliderContrast'); 
  const ss = document.getElementById('sliderSaturate');
  if (sb) appState.filters.bright = parseInt(sb.value); 
  if (sc) appState.filters.contrast = parseInt(sc.value); 
  if (ss) appState.filters.saturate = parseInt(ss.value);
  renderStrip();
}

function saveStateForUndo() {
  const snapshot = JSON.stringify({
    stickers: appState.stickers, layout: appState.layout, frameStyle: appState.frameStyle,
    frameThickness: appState.frameThickness, frameColor: appState.frameColor, activeFilter: appState.activeFilter,
    filters: appState.filters, typography: appState.typography, showDate: appState.showDate
  });
  historyStack.push(snapshot); 
  if (historyStack.length > 25) historyStack.shift(); 
  redoStack = [];
}

function undo() {
  if (historyStack.length === 0) return;
  const currentSnap = JSON.stringify({
    stickers: appState.stickers, layout: appState.layout, frameStyle: appState.frameStyle,
    frameThickness: appState.frameThickness, frameColor: appState.frameColor, activeFilter: appState.activeFilter,
    filters: appState.filters, typography: appState.typography, showDate: appState.showDate
  });
  redoStack.push(currentSnap);
  applySnapshot(JSON.parse(historyStack.pop()));
}

function redo() {
  if (redoStack.length === 0) return;
  const currentSnap = JSON.stringify({
    stickers: appState.stickers, layout: appState.layout, frameStyle: appState.frameStyle,
    frameThickness: appState.frameThickness, frameColor: appState.frameColor, activeFilter: appState.activeFilter,
    filters: appState.filters, typography: appState.typography, showDate: appState.showDate
  });
  historyStack.push(currentSnap);
  applySnapshot(JSON.parse(redoStack.pop()));
}

function applySnapshot(snap) {
  appState.stickers = snap.stickers || []; 
  appState.layout = snap.layout; 
  appState.frameStyle = snap.frameStyle;
  appState.frameThickness = snap.frameThickness; 
  appState.frameColor = snap.frameColor; 
  appState.activeFilter = snap.activeFilter;
  appState.filters = snap.filters; 
  appState.typography = snap.typography;
  appState.showDate = snap.showDate !== undefined ? snap.showDate : true;
  const dateCheck = document.getElementById('checkShowDate');
  if (dateCheck) dateCheck.checked = appState.showDate;
  renderStrip();
}

function loadSavedTheme() {
  const saved = localStorage.getItem('chueok_ui_theme') || 'rose';
  const t = APP_THEMES[saved] || APP_THEMES.rose;
  document.documentElement.style.setProperty('--theme-color', t.color);
  document.documentElement.style.setProperty('--theme-primary', t.color);
  document.documentElement.style.setProperty('--theme-primary-hover', t.hover);
  document.documentElement.style.setProperty('--theme-color-hover', t.hover);
  document.documentElement.style.setProperty('--theme-color-light', t.light);
}

function applyAppTheme(themeKey) {
  const t = APP_THEMES[themeKey] || APP_THEMES.rose;
  document.documentElement.style.setProperty('--theme-color', t.color);
  document.documentElement.style.setProperty('--theme-primary', t.color);
  document.documentElement.style.setProperty('--theme-primary-hover', t.hover);
  document.documentElement.style.setProperty('--theme-color-hover', t.hover);
  document.documentElement.style.setProperty('--theme-color-light', t.light);
  localStorage.setItem('chueok_ui_theme', themeKey);
}

function setTimerSec(sec, btn) { 
  appState.timerSec = sec; 
  document.querySelectorAll('.timer-chip').forEach(b => { 
    b.className = "timer-chip bg-white border border-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[10px]"; 
  }); 
  if (btn) btn.className = "timer-chip bg-theme text-white font-bold px-1.5 py-0.5 rounded text-[10px] shadow-xs"; 
}

function shareWebAppUrl() {
  const shareUrl = window.location.href.split('?')[0];
  if (navigator.share && navigator.canShare && navigator.canShare({ url: shareUrl })) {
    navigator.share({ title: '추억의 네컷', url: shareUrl }).catch(() => {});
  } else {
    navigator.clipboard.writeText(shareUrl).then(() => alert("링크가 복사되었습니다! 📋")).catch(() => {});
  }
}

function initDynamicUI() {
  const emojis = [
    '😀','😁','😂','😃','😄','😅','😆','😇','😈','😉','😊','😋','😌','😍','😎',
    '😏','😐','😑','😒','😓','😔','😕','😖','😗','😘','😙','😚','😛','😜','😝',
    '😞','😟','😠','😡','😢','😣','😤','😥','😨','😩','😪','😫','😭','😮','🥹',
    '✌️','💖','🎀','🐱','🐶','🐰','✨','🎂','🌸','🍀','🥳','🧸','🔥','💯','🍿'
  ];
  const emojiGrid = document.getElementById('emojiGrid');
  if (emojiGrid) {
    emojiGrid.innerHTML = emojis.map(e => `<button onclick="addEmojiSticker('${e}')" class="p-0.5 hover:bg-slate-200 rounded cursor-pointer active:scale-90 transition">${e}</button>`).join('');
  }

  const texts = [
    '추억네컷', 'BEST', 'LOVE', 'YOUTH', 'HAPPY', 'VIBE', 'OUR DAY', 'CHILL', 'SMILE', 'FOREVER',
    '인생네컷', '오늘의 우리', '완벽한 하루', '행복만땅', '심쿵주의', '찐친바이브', '영원한 청춘', 'LUCKY DAY', 'MEMORIES', 'SO CUTE'
  ];
  const textStickerGrid = document.getElementById('textStickerGrid');
  if (textStickerGrid) {
    textStickerGrid.innerHTML = texts.map(t => `<button onclick="addTextSticker('${t}')" class="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[10px] rounded border border-slate-300 shrink-0 cursor-pointer active:scale-95 transition">${t}</button>`).join('');
  }

  const basicColorGrid = document.getElementById('frameColorGridBasic');
  if (basicColorGrid) {
    basicColorGrid.innerHTML = PALETTE_COLORS.map(c => `
      <button onclick="changeFrameColor('${c}', this)" class="color-btn w-4 h-4 rounded-full border border-slate-200 shadow-2xs shrink-0" style="background-color:${c};"></button>
    `).join('') + `<label class="w-4 h-4 rounded-full bg-white border border-slate-300 flex items-center justify-center cursor-pointer shadow-2xs shrink-0 relative overflow-hidden"><i data-lucide="pipette" class="w-2.5 h-2.5 text-rose-600"></i><input type="color" value="#000000" onchange="changeFrameColor(this.value, null)" class="opacity-0 absolute inset-0 cursor-pointer"></label>`;
  }

  const simpleColorGrid = document.getElementById('frameColorGridSimple');
  if (simpleColorGrid) {
    simpleColorGrid.innerHTML = SIMPLE_PALETTE.map(c => `
      <button onclick="changeFrameColor('${c}', this)" class="color-btn w-4 h-4 rounded-full border border-slate-200 shadow-2xs shrink-0" style="background-color:${c};"></button>
    `).join('');
  }

  const premiumColorGrid = document.getElementById('frameColorGridPremium');
  if (premiumColorGrid) {
    premiumColorGrid.innerHTML = ['#000000', '#18181B', '#FFFFFF', '#FECDD3', '#BAE6FD', '#EDE9FE'].map(c => `
      <button onclick="changeFrameColor('${c}', this)" class="color-btn w-4 h-4 rounded-full border border-slate-300 shadow-2xs shrink-0" style="background-color:${c};"></button>
    `).join('') + `<input type="color" value="#000000" onchange="changeFrameColor(this.value, null)" class="w-4 h-4 rounded-full cursor-pointer p-0 border border-slate-300">`;
  }
}

// ========================================================
// 16. 앱 초기 구동
// ========================================================
window.addEventListener('DOMContentLoaded', () => {
  ['screenLiveShoot', 'screenPick', 'screenEdit', 'screenBoard', 'screenResult', 'videoResultModal', 'galleryCollectModal', 'adminDashboardModal', 'customerBotModal', 'authModal', 'myGalleryModal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.style.setProperty('display', 'none', 'important');
    }
  });

  const home = document.getElementById('screenHome');
  if (home) {
    home.classList.remove('hidden');
    home.style.removeProperty('display');
    home.style.setProperty('display', 'flex', 'important');
  }

  const badge = document.getElementById('appVersionBadge');
  if (badge) badge.textContent = APP_VERSION;

  loadSavedTheme();
  initDynamicUI();
  initCanvasInteractions();
  setupCanvasPinchZoom();
  initSplitResizer();
  checkPreviousSession();
  checkAutoLoginSession();
  initUserLocationEngine();
  renderMainNotices();
  fetchCloudBoardPosts();

  window.addEventListener('resize', checkDeviceOrientation);
  window.addEventListener('orientationchange', checkDeviceOrientation);

  try { if (window.lucide) lucide.createIcons(); } catch (e) {}
});
