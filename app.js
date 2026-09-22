/**
 * 추억의 네컷 Studio Pro v15.4 (안정화 및 완전 복구 버전)
 * 
 * [주요 구현 기능]
 * 1. 런타임 오류 차단 및 모든 버튼/아이콘/테마/오디오 완벽 복구
 * 2. 1x4 가로 풀화면 & 2x2 세로 풀화면 촬영 (영역 잘림 없는 100% 캡처)
 * 3. 기기 방향 실시간 감지 안내 오버레이 (PC 데스크톱 자동 감지 예외 처리)
 * 4. 사진 선택 시 미선택 사진 자동 스와이프 & 터치 제스처 탐색
 * 5. 대형 4컷 비디오 팝업 (버튼명: '파일의 저장' | '공유')
 * 6. QR코드 스캔 즉시 이미지 파일 직접 다운로드 링크(tmpfiles.org/dl/...) 복원
 * 7. 공지사항 및 이용 후기 실시간 클라우드 동기화
 */

// 🌟 구글 앱스 스크립트 웹앱 배포 URL
const GOOGLE_DB_URL = "https://script.google.com/macros/s/AKfycbybeL46ymy2_hypZb2I4CvSLJTkFAlTd2OR3bncVvwv9-2BsOR3DUi7Fduf6PG0mWWo-Q/exec";

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

const POSE_SUGGESTIONS = [
  "어깨동무하고 찰칵! 🫂", "다같이 브이~ ✌️", "손잡고 빙그르르 💫", "개구쟁이 메롱 😜",
  "서로 얼굴 맞대고 🥰", "볼 옆에 브이 ✌️", "새침한 시크 표정 😎", "하트 뿅뿅 날리기 🫶",
  "자유로운 힙합 포즈 🤙", "꽃받침하고 방긋 🌸", "눈 꼭 감고 윙크 😉", "볼 빵빵 귀요미 🐹"
];

const FILTER_PRESETS = {
  normal:  { bright: 100, contrast: 100, saturate: 100, name: '원본' },
  bright:  { bright: 115, contrast: 105, saturate: 108, name: '뽀샤시' },
  radiant: { bright: 112, contrast: 115, saturate: 125, name: '화사한' },
  warm:    { bright: 108, contrast: 105, saturate: 120, name: '따뜻한' },
  cool:    { bright: 106, contrast: 112, saturate: 95,  name: '차가운' },
  mood:    { bright: 105, contrast: 95,  saturate: 85,  name: '감성무드' },
  retro:   { bright: 108, contrast: 90,  saturate: 80,  name: '레트로' },
  mono:    { bright: 105, contrast: 130, saturate: 0,   name: '흑백' },
  sunset:  { bright: 110, contrast: 110, saturate: 135, name: '노을빛' },
  cyan:    { bright: 108, contrast: 115, saturate: 110, name: '청량블루' },
  green:   { bright: 105, contrast: 100, saturate: 90,  name: '빈티지그린' },
  pink:    { bright: 112, contrast: 108, saturate: 120, name: '로맨틱핑크' }
};

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

let appState = {
  isAdmin: false, stream: null, facingMode: 'user', timerSec: 6, currentCount: 6, countdownTimer: null,
  selectedFormat: 'strip', // 'strip' (1x4 가로) | 'grid' (2x2 세로)
  isOrientationMatched: true,
  shotImages: [], selectedImages: [], selectedIndices: [null, null, null, null], activeSlotIndex: 0,
  stickers: [], recentStickers: [], selectedStickerIdx: -1, dragTarget: null, dragStartPos: { x: 0, y: 0 },
  layout: 'strip', frameStyle: 'simple', frameThickness: 40, frameColor: '#000000',
  activeFilter: 'normal', filters: { bright: 100, contrast: 100, saturate: 100 },
  showDate: true, typography: { fontFamily: 'Playfair Display', fontSize: 40, fontColor: '#FFFFFF', isBold: true, date: getFormattedTodayDate() },
  shotVideoBlobs: [], currentMediaRecorder: null, currentShotVideoChunks: [], resetInterval: null
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

// ========================================================
// 1. 오디오 엔진 (효과음 & 셔터음)
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
    const clickBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.03, audioCtx.sampleRate);
    const clickData = clickBuf.getChannelData(0);
    for (let i = 0; i < clickData.length; i++) clickData[i] = Math.random() * 2 - 1;
    const click = audioCtx.createBufferSource();
    click.buffer = clickBuf;
    const clickGain = audioCtx.createGain();
    clickGain.gain.setValueAtTime(0.35, now);
    clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
    click.connect(clickGain);
    clickGain.connect(audioCtx.destination);
    click.start(now);

    const shutBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.08, audioCtx.sampleRate);
    const shutData = shutBuf.getChannelData(0);
    for (let i = 0; i < shutData.length; i++) shutData[i] = Math.random() * 2 - 1;
    const shut = audioCtx.createBufferSource();
    shut.buffer = shutBuf;
    const shutGain = audioCtx.createGain();
    shutGain.gain.setValueAtTime(0.45, now + 0.05);
    shutGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    shut.connect(shutGain);
    shutGain.connect(audioCtx.destination);
    shut.start(now + 0.05);
  } catch (e) {}
}

// ========================================================
// 2. UI 테마 바인딩
// ========================================================
function applyAppTheme(themeKey) {
  const t = APP_THEMES[themeKey] || APP_THEMES.rose;
  document.documentElement.style.setProperty('--theme-color', t.color);
  document.documentElement.style.setProperty('--theme-primary', t.color);
  document.documentElement.style.setProperty('--theme-primary-hover', t.hover);
  document.documentElement.style.setProperty('--theme-color-hover', t.hover);
  document.documentElement.style.setProperty('--theme-color-light', t.light);
  localStorage.setItem('chueok_ui_theme', themeKey);

  const lbl = document.getElementById('currentThemeLabel');
  if (lbl) lbl.textContent = `현재: ${t.name}`;

  document.querySelectorAll('.theme-choice-btn').forEach(btn => {
    btn.classList.remove('border-theme', 'border-rose-500', 'border-2');
    btn.classList.add('border-slate-200');
  });
  if (window.event && window.event.currentTarget) {
    window.event.currentTarget.classList.remove('border-slate-200');
    window.event.currentTarget.classList.add('border-theme', 'border-2');
  }
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

// ========================================================
// 3. UI 동적 바인딩 & 프리셋 초기화
// ========================================================
function initDynamicUI() {
  const fonts = [
    { name: 'Playfair Display', label: '영문세리프', css: 'font-family:"Playfair Display"; font-weight:700;' },
    { name: 'Pretendard', label: '프리텐다드', css: 'font-family:"Pretendard"; font-weight:700;' },
    { name: 'Do Hyeon', label: '도현체', css: 'font-family:"Do Hyeon";' },
    { name: 'Jua', label: '주아체', css: 'font-family:"Jua";' },
    { name: 'Gowun Batang', label: '고운바탕', css: 'font-family:"Gowun Batang"; font-weight:700;' },
    { name: 'Gaegu', label: '개구쟁이', css: 'font-family:"Gaegu"; font-weight:700;' },
    { name: 'Noto Sans KR', label: '본고딕', css: 'font-family:"Noto Sans KR"; font-weight:700;' },
    { name: 'Dongle', label: '동글체', css: 'font-family:"Dongle"; font-weight:700; font-size: 1.2em;' },
    { name: 'Nanum Pen Script', label: '나눔손글씨', css: 'font-family:"Nanum Pen Script"; font-size: 1.2em;' },
    { name: 'Black Han Sans', label: '검은고딕', css: 'font-family:"Black Han Sans";' }
  ];
  const fontGrid = document.getElementById('fontGrid');
  if (fontGrid) {
    fontGrid.innerHTML = fonts.map(f => `<button onclick="setFontFamily('${f.name}', this)" class="font-btn bg-white border border-slate-200 text-slate-600 py-1 rounded text-[9px] truncate" style="${f.css}">${f.label}</button>`).join('');
  }

  const emojis = [
    '😀','😁','😂','😃','😄','😅','😆','😇','😈','😉','😊','😋','😌','😍','😎',
    '😏','😐','😑','😒','😓','😔','😕','😖','😗','😘','😙','😚','😛','😜','😝',
    '😞','😟','😠','😡','😢','😣','😤','😥','😨','😩','😪','😫','😭','😮','🥹',
    '✌️','💖','🎀','🐱','🐶','🐰','✨','🎂','🌸','🍀','🥳','🧸','🔥','💯','🍿'
  ];
  const emojiGrid = document.getElementById('emojiGrid');
  if (emojiGrid) {
    emojiGrid.innerHTML = emojis.map(e => `<button onclick="addEmojiSticker('${e}')" class="p-1 hover:bg-slate-200 rounded cursor-pointer active:scale-90 transition">${e}</button>`).join('');
  }

  const texts = [
    '추억의 네컷', 'BEST', 'LOVE', 'YOUTH', 'HAPPY', 'VIBE', 'OUR DAY', 'CHILL', 'SMILE', 'FOREVER',
    '인생네컷', '오늘의 우리', '완벽한 하루', '행복만땅', '심쿵주의', '찐친바이브', '영원한 청춘', 'LUCKY DAY', 'MEMORIES', 'SO CUTE'
  ];
  const textStickerGrid = document.getElementById('textStickerGrid');
  if (textStickerGrid) {
    textStickerGrid.innerHTML = texts.map(t => `<button onclick="addTextSticker('${t}')" class="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-[11px] rounded border border-slate-300 shrink-0 cursor-pointer active:scale-95 transition">${t}</button>`).join('');
  }

  const colors = ['#000000','#111827','#FFFFFF','#E2E8F0','#FECDD3','#FFEDD5','#FEF9C3','#D1FAE5','#BAE6FD','#EDE9FE','#881337','#1E1B4B','#064E3B'];
  const frameColorGrid = document.getElementById('frameColorGrid');
  if (frameColorGrid) {
    frameColorGrid.innerHTML = colors.map(c => `<button onclick="changeFrameColor('${c}', this)" class="color-btn w-6 h-6 rounded-full border-2 border-transparent shadow shrink-0" style="background-color:${c};"></button>`).join('') +
      `<label class="w-6 h-6 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center cursor-pointer shadow shrink-0 relative overflow-hidden"><i data-lucide="pipette" class="w-3.5 h-3.5 text-rose-600"></i><input type="color" value="#000000" onchange="changeFrameColor(this.value, null)" class="opacity-0 absolute inset-0 cursor-pointer"></label>`;
  }

  renderRecentStickers();

  setTimeout(() => {
    const firstColor = document.querySelector('.color-btn');
    if (firstColor) changeFrameColor('#000000', firstColor);
    const firstFont = document.querySelector('.font-btn');
    if (firstFont) setFontFamily('Playfair Display', firstFont);
    if (window.lucide) lucide.createIcons();
  }, 40);
}

function pushRecentSticker(type, text) {
  appState.recentStickers = appState.recentStickers.filter(item => item.text !== text);
  appState.recentStickers.unshift({ type, text });
  if (appState.recentStickers.length > 5) appState.recentStickers.pop();
  renderRecentStickers();
}

function renderRecentStickers() {
  const listEl = document.getElementById('recentStickersList');
  if (!listEl) return;
  if (appState.recentStickers.length === 0) {
    listEl.innerHTML = `<span class="text-[10px] text-slate-300 italic">없음</span>`;
    return;
  }
  listEl.innerHTML = appState.recentStickers.map(item => {
    if (item.type === 'emoji') {
      return `<button onclick="addEmojiSticker('${item.text}')" class="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs active:scale-90">${item.text}</button>`;
    } else {
      return `<button onclick="addTextSticker('${item.text}')" class="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold truncate max-w-[75px] active:scale-95">${item.text}</button>`;
    }
  }).join('');
}

function setTimerSec(sec, btn) { 
  appState.timerSec = sec; 
  document.querySelectorAll('.timer-chip').forEach(b => { 
    b.className = "timer-chip bg-white border border-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[10px]"; 
  }); 
  if (btn) btn.className = "timer-chip bg-theme text-white font-bold px-1.5 py-0.5 rounded text-[10px] shadow-xs"; 
}

// ========================================================
// 4. 🌟 가로/세로 촬영 방향 감지 & 제어
// ========================================================
function requestSessionWithFormat(format) {
  appState.selectedFormat = format; 
  appState.layout = format;

  const liveBadge = document.getElementById('liveFormatBadge');
  if (liveBadge) liveBadge.textContent = (format === 'strip') ? "1×4 가로 풀화면" : "2×2 세로 풀화면";
  
  const editBadge = document.getElementById('editorFormatBadge');
  if (editBadge) editBadge.textContent = (format === 'strip') ? "1×4 스트립" : "2×2 엽서형";

  startPhotoSession();
}

function restartSessionWithCurrentFormat() {
  requestSessionWithFormat(appState.selectedFormat || 'strip');
}

function checkOrientationState() {
  // 모바일/태블릿 기기인지 감지 (PC 데스크톱은 회전 강제 제외)
  const isMobileOrTablet = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const overlay = document.getElementById('orientationGuideOverlay');
  const title = document.getElementById('orientationGuideTitle');
  const desc = document.getElementById('orientationGuideDesc');
  const ratioBadge = document.getElementById('viewfinderRatioBadge');

  if (!isMobileOrTablet) {
    appState.isOrientationMatched = true;
    if (overlay) overlay.classList.add('hidden');
    if (ratioBadge) ratioBadge.textContent = (appState.selectedFormat === 'strip') ? "가로 풀 화면 촬영" : "세로 풀 화면 촬영";
    return;
  }

  const isLandscape = window.innerWidth > window.innerHeight;

  if (appState.selectedFormat === 'strip') {
    // 1×4 모드: 가로 화면 필수
    if (!isLandscape) {
      appState.isOrientationMatched = false;
      if (overlay) {
        overlay.classList.remove('hidden');
        if (title) title.textContent = "카메라를 가로로 돌려주세요! 🔄";
        if (desc) desc.textContent = "1×4 스트립 규격은 가로모드 풀 화면으로 촬영됩니다.";
      }
    } else {
      appState.isOrientationMatched = true;
      if (overlay) overlay.classList.add('hidden');
      if (ratioBadge) ratioBadge.textContent = "가로 풀 화면 촬영";
    }
  } else {
    // 2×2 모드: 세로 화면 필수
    if (isLandscape) {
      appState.isOrientationMatched = false;
      if (overlay) {
        overlay.classList.remove('hidden');
        if (title) title.textContent = "카메라를 세로로 돌려주세요! 📱";
        if (desc) desc.textContent = "2×2 엽서형 규격은 세로모드 풀 화면으로 촬영됩니다.";
      }
    } else {
      appState.isOrientationMatched = true;
      if (overlay) overlay.classList.add('hidden');
      if (ratioBadge) ratioBadge.textContent = "세로 풀 화면 촬영";
    }
  }
}

// ========================================================
// 5. 🌟 카메라 촬영 (풀 화면 100% 캡처)
// ========================================================
async function startPhotoSession() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { 
    alert("카메라를 실행할 수 없습니다. 웹 브라우저의 카메라 권한 및 HTTPS 접속 여부를 확인해 주세요!"); 
    return; 
  }
  
  initAudio(); 
  stopCameraAndAudio();
  appState.shotImages = []; 
  appState.selectedImages = []; 
  appState.selectedIndices = [null, null, null, null]; 
  appState.shotVideoBlobs = [];

  showScreen('screenLiveShoot');
  checkOrientationState();

  for (let i = 0; i < 6; i++) { 
    const t = document.getElementById(`liveThumb${i}`); 
    if (t) { 
      t.innerHTML = (i + 1).toString(); 
      t.className = "w-12 h-8 bg-black/50 backdrop-blur border border-white/30 flex items-center justify-center text-[10px] text-white/50 font-bold"; 
    } 
  }

  const videoConstraints = [
    { video: { facingMode: appState.facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
    { video: { facingMode: appState.facingMode }, audio: false },
    { video: true, audio: false }
  ];

  let stream = null;
  for (const constraint of videoConstraints) {
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraint);
      if (stream) break;
    } catch (e) {}
  }

  if (!stream) {
    alert("카메라 장치 접근에 실패했습니다. 다른 앱이 카메라를 사용 중인지 확인해 주세요.");
    showScreen('screenHome');
    return;
  }

  appState.stream = stream;
  const video = document.getElementById('liveWebcamVideo'); 
  if (video) { 
    video.srcObject = stream; 
    video.classList.add('mirror');
    try { await video.play(); } catch (playErr) {}
  }

  runContinuousLiveShoot(0);
}

async function flipCameraFacing() { 
  appState.facingMode = (appState.facingMode === 'user') ? 'environment' : 'user'; 
  startPhotoSession(); 
}

function startSingleCutVideoRecording() {
  if (!appState.stream) return;
  appState.currentShotVideoChunks = [];
  try { 
    appState.currentMediaRecorder = new MediaRecorder(appState.stream, { mimeType: 'video/webm' }); 
  } catch (e) { 
    try { 
      appState.currentMediaRecorder = new MediaRecorder(appState.stream, { mimeType: 'video/mp4' }); 
    } catch (e2) { 
      try { 
        appState.currentMediaRecorder = new MediaRecorder(appState.stream); 
      } catch (e3) { 
        appState.currentMediaRecorder = null; 
      } 
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

function runContinuousLiveShoot(shotIndex) {
  if (shotIndex >= 6) { 
    stopCameraAndAudio(); 
    setTimeout(() => { renderPickScreen(); }, 500); 
    return; 
  }
  const badge = document.getElementById('liveProgressBadge');
  if (badge) badge.textContent = `${shotIndex + 1} / 6 컷`;

  const poseGuide = document.getElementById('poseGuideText');
  if (poseGuide) poseGuide.textContent = POSE_SUGGESTIONS[shotIndex % POSE_SUGGESTIONS.length];

  appState.currentCount = appState.timerSec;
  const countEl = document.getElementById('liveCountdownText'); 
  if (countEl) countEl.textContent = appState.currentCount;
  playBeep(600); 
  startSingleCutVideoRecording();

  if (appState.countdownTimer) clearInterval(appState.countdownTimer);
  appState.countdownTimer = setInterval(() => {
    checkOrientationState();
    
    // 올바른 방향으로 회전할 때까지 대기
    if (!appState.isOrientationMatched) {
      return; 
    }

    appState.currentCount--;
    if (appState.currentCount > 0) { 
      if (countEl) countEl.textContent = appState.currentCount; 
      playBeep(600); 
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
  setTimeout(() => {
    const shotIndex = appState.shotImages.length; 
    stopSingleCutVideoRecording(shotIndex); 
    captureWebcamFrame(shotIndex, () => { 
      setTimeout(() => { runContinuousLiveShoot(shotIndex + 1); }, 1800); 
    }); 
  }, 1000);
}

// 🌟 영역 크롭 없이 카메라 전체 화각(풀 화면) 그대로 캡처
function captureWebcamFrame(shotIndex, onDone) {
  playRealisticShutter(); 
  flashScreen();
  const video = document.getElementById('liveWebcamVideo');
  const canvas = document.getElementById('hiddenSnapCanvas');
  if (!video || !canvas) return;

  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d');

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
      thumb.className = "w-12 h-8 border-2 border-theme overflow-hidden shadow-lg"; 
    }
    if (onDone) onDone();
  };
  img.src = canvas.toDataURL('image/jpeg', 0.92);
}

function flashScreen() { 
  const f = document.getElementById('flashOverlay'); 
  if (f) { f.classList.remove('hidden'); f.classList.add('flash-effect'); setTimeout(() => { f.classList.remove('flash-effect'); f.classList.add('hidden'); }, 350); } 
}

function stopCameraAndAudio() { 
  if (appState.countdownTimer) { clearInterval(appState.countdownTimer); appState.countdownTimer = null; } 
  if (appState.currentMediaRecorder && appState.currentMediaRecorder.state !== 'inactive') { try { appState.currentMediaRecorder.stop(); } catch(e){} } 
  if (appState.stream) { appState.stream.getTracks().forEach(t => t.stop()); appState.stream = null; } 
  if (audioCtx && audioCtx.state !== 'closed') { try { audioCtx.suspend(); } catch (e) {} } 
}

// ========================================================
// 6. 🌟 사진 선택 (미선택 사진 자동 스와이프 포커싱)
// ========================================================
function renderPickScreen() {
  showScreen('screenPick');
  appState.selectedIndices = [null, null, null, null]; 
  appState.activeSlotIndex = 0; 
  currentCarouselIdx = 0;

  buildPickMiniPreviewStructure();
  setPickPreviewTheme(appState.frameStyle || 'simple', null);

  setupCarouselViewer();
  updateCarouselView();
}

function buildPickMiniPreviewStructure() {
  const container = document.getElementById('pickMiniFramePreview');
  if (!container) return;

  const isGrid = (appState.selectedFormat === 'grid');
  
  if (isGrid) {
    container.className = "w-48 sm:w-52 aspect-[2/3] bg-black p-2.5 shadow-2xl flex flex-col justify-between border border-slate-300 rounded-md transition-all";
    container.innerHTML = `
      <div id="pickPreviewHeader" class="text-center text-white text-[10px] font-black font-serif py-0.5">sangsangPhoto</div>
      <div class="grid grid-cols-2 gap-1.5 flex-1 my-1">
        <div onclick="selectSlotForAssignment(0)" id="previewSlot0" class="aspect-[4/5] bg-slate-900 border-2 border-theme flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative">1번 슬롯</div>
        <div onclick="selectSlotForAssignment(1)" id="previewSlot1" class="aspect-[4/5] bg-slate-900 border-2 border-transparent flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative">2번 슬롯</div>
        <div onclick="selectSlotForAssignment(2)" id="previewSlot2" class="aspect-[4/5] bg-slate-900 border-2 border-transparent flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative">3번 슬롯</div>
        <div onclick="selectSlotForAssignment(3)" id="previewSlot3" class="aspect-[4/5] bg-slate-900 border-2 border-transparent flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative">4번 슬롯</div>
      </div>
      <div id="pickPreviewMiddleBanner" class="hidden text-center text-white text-[9px] font-black py-0.5 bg-white/10 rounded my-0.5">추억의 네컷</div>
      <div id="pickPreviewFooter" class="hidden text-center text-white text-[10px] font-black font-serif pt-1 border-t border-white/20">인생4컷</div>
    `;
  } else {
    container.className = "w-40 sm:w-44 bg-black p-2 shadow-2xl flex flex-col space-y-1 border border-slate-300 rounded-md transition-all";
    container.innerHTML = `
      <div id="pickPreviewHeader" class="text-center text-white text-[10px] font-black font-serif py-0.5 border-b border-white/20">sangsangPhoto</div>
      <div onclick="selectSlotForAssignment(0)" id="previewSlot0" class="aspect-[3/2] bg-slate-900 border-2 border-theme flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative">1번 슬롯</div>
      <div onclick="selectSlotForAssignment(1)" id="previewSlot1" class="aspect-[3/2] bg-slate-900 border-2 border-transparent flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative">2번 슬롯</div>
      <div id="pickPreviewMiddleBanner" class="hidden text-center text-white text-[9px] font-black py-0.5 bg-white/10 rounded">추억의 네컷</div>
      <div onclick="selectSlotForAssignment(2)" id="previewSlot2" class="aspect-[3/2] bg-slate-900 border-2 border-transparent flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative">3번 슬롯</div>
      <div onclick="selectSlotForAssignment(3)" id="previewSlot3" class="aspect-[3/2] bg-slate-900 border-2 border-transparent flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative">4번 슬롯</div>
      <div id="pickPreviewFooter" class="hidden text-center text-white text-[10px] font-black font-serif pt-1 border-t border-white/20">인생4컷</div>
    `;
  }
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
  currentCarouselIdx = (currentCarouselIdx - 1 + appState.shotImages.length) % appState.shotImages.length;
  updateCarouselView();
}

function nextCarouselPhoto() {
  if (appState.shotImages.length === 0) return;
  currentCarouselIdx = (currentCarouselIdx + 1) % appState.shotImages.length;
  updateCarouselView();
}

function goToCarouselPhoto(idx) {
  currentCarouselIdx = idx;
  updateCarouselView();
}

function updateCarouselView() {
  if (appState.shotImages.length === 0) return;

  const imgEl = document.getElementById('carouselCurrentImg');
  const badgeEl = document.getElementById('carouselCutBadge');
  const btnText = document.getElementById('btnAssignText');
  const strip = document.getElementById('carouselIndicatorStrip');

  if (imgEl) imgEl.src = appState.shotImages[currentCarouselIdx].src;
  if (badgeEl) badgeEl.textContent = `#${currentCarouselIdx + 1}번 컷`;
  if (btnText) btnText.textContent = `이 사진을 ${appState.activeSlotIndex + 1}번 슬롯에 넣기`;

  if (strip) {
    strip.innerHTML = appState.shotImages.map((img, idx) => {
      const isCurrent = (idx === currentCarouselIdx);
      const isAssigned = appState.selectedIndices.includes(idx);
      const assignedSlot = appState.selectedIndices.indexOf(idx);

      return `
        <button onclick="goToCarouselPhoto(${idx})" class="w-10 h-8 rounded-lg overflow-hidden border-2 relative transition ${isCurrent ? 'border-theme scale-110 shadow-md ring-2 ring-rose-400/50' : 'border-slate-300 opacity-60'}">
          <img src="${img.src}" class="w-full h-full object-cover">
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
  appState.activeSlotIndex = slotIdx;
  const badge = document.getElementById('currentActiveSlotBadge'); 
  if (badge) badge.textContent = `${slotIdx + 1}번 슬롯 채우는 중`;
  
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById(`previewSlot${i}`);
    if (el) { 
      if (i === slotIdx) el.classList.replace('border-transparent', 'border-theme'); 
      else el.classList.replace('border-theme', 'border-transparent'); 
    }
  }
  updateCarouselView();
}

// 🌟 사진 슬롯 배치 후 아직 선택되지 않은 사진으로 자동 스와이프 넘김
function assignPhotoToCurrentSlot(shotIdx) {
  appState.selectedIndices[appState.activeSlotIndex] = shotIdx; 
  updatePreviewSlots();
  
  // 1. 다음 비어있는 슬롯 자동 포커스
  const nextEmpty = appState.selectedIndices.indexOf(null);
  if (nextEmpty !== -1) {
    selectSlotForAssignment(nextEmpty);
  } else {
    selectSlotForAssignment((appState.activeSlotIndex + 1) % 4);
  }

  // 2. 🌟 아직 선택되지 않은 사진 중 첫 번째 사진으로 캐러셀 자동 전환
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
        slotEl.innerHTML = `<img src="${appState.shotImages[shotIdx].src}" class="w-full h-full object-cover">`; 
      } else { 
        slotEl.innerHTML = `<span class="text-slate-400 text-xs font-bold">${i + 1}번 슬롯</span>`; 
      } 
    }
  }
}

function refreshPickUI() {
  const chosenCount = appState.selectedIndices.filter(idx => idx !== null).length;
  const btn = document.getElementById('btnConfirmPick');
  if (btn) btn.textContent = chosenCount === 4 ? "이 4장으로 스튜디오 꾸미기 (선택 완료!)" : `이 4장으로 스튜디오 꾸미기 (${chosenCount}/4장 선택됨)`;
}

function confirmSelectedFour() {
  const missing = appState.selectedIndices.filter(idx => idx === null).length;
  if (missing > 0) { alert(`4장의 사진을 모두 채워주세요!\n(아직 ${missing}개 슬롯이 비어 있습니다)`); return; }
  appState.selectedImages = appState.selectedIndices.map(idx => appState.shotImages[idx]);
  resetEditorToDefault(); 
  showScreen('screenEdit'); 
  renderStrip();

  // 구글 드라이브(추억의네컷_저장소) 백그라운드 백업
  setTimeout(() => {
    const canvas = document.getElementById('photoCanvas');
    if (canvas) {
      const pureBase64 = extractPureBase64(canvas.toDataURL('image/png'));
      const fileName = `[추억의네컷]_${appState.selectedFormat || 'photo'}_${Date.now()}.png`;
      uploadMediaToGoogleDrive(pureBase64, 'image', fileName, 'image/png').catch(() => {});
    }
  }, 800);
}

function resetEditorToDefault() {
  appState.stickers = []; 
  appState.selectedStickerIdx = -1; 
  appState.layout = appState.selectedFormat || 'strip'; 
  appState.frameThickness = 40; 
  appState.frameColor = (appState.frameStyle === 'photoism') ? '#0A0A0A' : ((appState.frameStyle === 'baseball') ? '#FAF7EE' : ((appState.frameStyle === 'birthday') ? '#FDFBF7' : '#000000'));
  appState.activeFilter = 'normal'; 
  appState.filters = { bright: 100, contrast: 100, saturate: 100 }; 
  appState.showDate = true; 
  appState.typography = { fontFamily: 'Playfair Display', fontSize: 40, fontColor: '#FFFFFF', isBold: true, date: getFormattedTodayDate() };

  const sigInput = document.getElementById('frameSignatureInput'); 
  if (sigInput) {
    if (appState.frameStyle === 'middle') sigInput.value = "추억의 네컷";
    else if (appState.frameStyle === 'bottom') sigInput.value = "인생4컷";
    else if (appState.frameStyle === 'photoism') sigInput.value = "photoism";
    else if (appState.frameStyle === 'baseball') sigInput.value = "Play Baseball";
    else if (appState.frameStyle === 'birthday') sigInput.value = "Happy Birthday";
    else sigInput.value = "sangsangPhoto";
  }

  const slThick = document.getElementById('sliderThickness'); if (slThick) slThick.value = 40;
  const fineTune = document.getElementById('filterFineTunePanel'); if (fineTune) fineTune.classList.add('hidden');
  const stBar = document.getElementById('stickerControlBar'); if (stBar) stBar.classList.add('hidden');
  resetCanvasZoom();
  historyStack = []; redoStack = [];
}

// ========================================================
// 7. 앨범 업로드 & 에디터 캔버스 제어
// ========================================================
function triggerGalleryUpload() { const input = document.getElementById('galleryInput'); if (input) { input.value = ''; input.click(); } }

function compressAndLoadImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1280; let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) { if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; } else { w = Math.round((w * maxDim) / h); h = maxDim; } }
        const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
        const downscaledImg = new Image(); downscaledImg.onload = () => resolve(downscaledImg); downscaledImg.src = c.toDataURL('image/jpeg', 0.9);
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
  if (window.lucide) lucide.createIcons();
}

function cancelGalleryCollect() { galleryAccumulator = []; const m = document.getElementById('galleryCollectModal'); if (m) m.classList.add('hidden'); }

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
  let initialMidX = 0;
  let initialMidY = 0;
  let initialPanX = 0;
  let initialPanY = 0;

  viewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      initialPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialZoom = canvasZoom;
      initialMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      initialMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      initialPanX = canvasPanX;
      initialPanY = canvasPanY;
    }
  }, { passive: false });

  viewport.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const currentMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const currentMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

      if (initialPinchDist > 0) {
        const factor = currentDist / initialPinchDist;
        canvasZoom = Math.max(0.4, Math.min(3.0, initialZoom * factor));
        canvasPanX = initialPanX + (currentMidX - initialMidX);
        canvasPanY = initialPanY + (currentMidY - initialMidY);
        applyZoomTransform();
      }
    }
  }, { passive: false });

  viewport.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) initialPinchDist = 0;
  });

  let lastTap = 0;
  viewport.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
      const now = Date.now();
      if (now - lastTap < 280) resetCanvasZoom();
      lastTap = now;
    }
  });
}

function setFrameStyle(styleKey, btn) {
  saveStateForUndo(); 
  appState.frameStyle = styleKey;
  document.querySelectorAll('.style-btn').forEach(b => { 
    b.className = "style-btn bg-slate-100 text-slate-700 font-bold py-1.5 rounded-xl border border-transparent"; 
  });
  btn.className = "style-btn bg-theme text-white font-black py-1.5 rounded-xl border border-theme shadow-sm";
  const label = document.getElementById('labelCustomText'); 
  const sigInput = document.getElementById('frameSignatureInput');

  if (styleKey === 'simple') { if (label) label.textContent = "상단 문구 설정"; if (sigInput) sigInput.value = "sangsangPhoto"; }
  else if (styleKey === 'middle') { if (label) label.textContent = "중간 문구 설정"; if (sigInput) sigInput.value = "추억의 네컷"; }
  else if (styleKey === 'bottom') { if (label) label.textContent = "하단 각인 문구 설정"; if (sigInput) sigInput.value = "인생4컷"; }
  else if (styleKey === 'photoism') { if (label) label.textContent = "포토이즘 로고 문구"; if (sigInput) sigInput.value = "photoism"; }
  else if (styleKey === 'baseball') { if (label) label.textContent = "야구 타이틀 문구"; if (sigInput) sigInput.value = "Play Baseball"; }
  else if (styleKey === 'birthday') { if (label) label.textContent = "생일 축하 문구"; if (sigInput) sigInput.value = "Happy Birthday"; }

  renderStrip();
}

function onThicknessChange(val) {
  appState.frameThickness = parseInt(val);
  renderStrip();
}

function changeFrameColor(color, btn) {
  saveStateForUndo(); 
  appState.frameColor = color;
  document.querySelectorAll('.color-btn').forEach(b => b.classList.replace('border-theme', 'border-transparent'));
  if (btn) btn.classList.replace('border-transparent', 'border-theme');
  if (['#FFFFFF','#E2E8F0','#FECDD3','#BAE6FD','#FAF7EE','#FDFBF7'].includes(color.toUpperCase())) {
    appState.typography.fontColor = '#1E293B'; 
  } else {
    appState.typography.fontColor = '#FFFFFF';
  }
  const picker = document.getElementById('fontColorPicker'); 
  if (picker) picker.value = appState.typography.fontColor;
  renderStrip();
}

function handleFilterClick(filterKey, btn) {
  const isAlreadyActive = (appState.activeFilter === filterKey);
  if (!isAlreadyActive) {
    saveStateForUndo(); 
    appState.activeFilter = filterKey; 
    const p = FILTER_PRESETS[filterKey]; 
    appState.filters = { ...p };
    document.querySelectorAll('.filter-btn').forEach(b => { b.className = "filter-btn bg-slate-100 text-slate-700 font-bold py-1.5 rounded-lg border border-transparent"; });
    btn.className = "filter-btn bg-slate-900 text-white font-bold py-1.5 rounded-lg border border-theme";
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

function setFontFamily(fontName, btn) {
  saveStateForUndo(); 
  appState.typography.fontFamily = fontName;
  document.querySelectorAll('.font-btn').forEach(b => { b.classList.replace('border-theme', 'border-slate-200'); b.classList.replace('text-slate-900', 'text-slate-600'); });
  if (btn) { btn.classList.replace('border-slate-200', 'border-theme'); btn.classList.replace('text-slate-600', 'text-slate-900'); }
  renderStrip();
}

function toggleFontBold() {
  saveStateForUndo(); 
  appState.typography.isBold = !appState.typography.isBold;
  const btn = document.getElementById('btnFontBold');
  if (btn) {
    if (appState.typography.isBold) btn.className = "px-2 py-0.5 rounded text-[10px] font-black border border-theme bg-theme text-white";
    else btn.className = "px-2 py-0.5 rounded text-[10px] font-normal border border-slate-300 bg-white text-slate-700";
  }
  renderStrip();
}

function onFontColorChange(color) { appState.typography.fontColor = color; renderStrip(); }
function onFontSizeChange(size) { appState.typography.fontSize = parseInt(size); renderStrip(); }
function toggleShowDate(checked) { saveStateForUndo(); appState.showDate = checked; renderStrip(); }

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
  pushRecentSticker('text', text); 
  const canvas = document.getElementById('photoCanvas');
  const newSticker = { 
    id: Date.now(), type: 'text', text, 
    x: canvas.width / 2 + (Math.random() * 60 - 30), 
    y: canvas.height / 2 + (Math.random() * 60 - 30), 
    size: 55, rotation: 0, color: '#FFFFFF', 
    fontFamily: appState.typography.fontFamily || 'Pretendard' 
  };
  appState.stickers.push(newSticker); 
  appState.selectedStickerIdx = appState.stickers.length - 1;
  showStickerControls(newSticker); 
  renderStrip();
}

function addEmojiSticker(emoji) {
  saveStateForUndo(); 
  pushRecentSticker('emoji', emoji); 
  const canvas = document.getElementById('photoCanvas');
  const newSticker = { 
    id: Date.now(), type: 'emoji', text: emoji, 
    x: canvas.width / 2 + (Math.random() * 60 - 30), 
    y: canvas.height / 2 + (Math.random() * 60 - 30), 
    size: 65, rotation: 0 
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
  const bar = document.getElementById('stickerControlBar'); 
  if (bar) bar.classList.add('hidden'); 
  renderStrip(); 
}

function showStickerControls(st) {
  const bar = document.getElementById('stickerControlBar'); 
  if (!bar) return;
  bar.classList.remove('hidden');
  const sizeS = document.getElementById('stickerSizeSlider'); if (sizeS) sizeS.value = st.size;
  const rotS = document.getElementById('stickerRotateSlider'); if (rotS) rotS.value = st.rotation || 0;
  const customRow = document.getElementById('stickerTextCustomRow');
  if (st.type === 'text') { 
    if (customRow) customRow.classList.remove('hidden'); 
    const cp = document.getElementById('stickerColorPicker'); if (cp) cp.value = st.color || '#FFFFFF'; 
    const fs = document.getElementById('stickerFontSelect'); if (fs) fs.value = st.fontFamily || 'Pretendard'; 
  } else { 
    if (customRow) customRow.classList.add('hidden'); 
  }
}

function onSelectedStickerResize(size) { if (appState.selectedStickerIdx >= 0 && appState.selectedStickerIdx < appState.stickers.length) { appState.stickers[appState.selectedStickerIdx].size = parseInt(size); renderStrip(); } }
function onSelectedStickerRotate(deg) { if (appState.selectedStickerIdx >= 0 && appState.selectedStickerIdx < appState.stickers.length) { appState.stickers[appState.selectedStickerIdx].rotation = parseInt(deg); renderStrip(); } }
function onSelectedStickerColorChange(color) { if (appState.selectedStickerIdx >= 0 && appState.selectedStickerIdx < appState.stickers.length) { saveStateForUndo(); appState.stickers[appState.selectedStickerIdx].color = color; renderStrip(); } }
function onSelectedStickerFontChange(fontName) { if (appState.selectedStickerIdx >= 0 && appState.selectedStickerIdx < appState.stickers.length) { saveStateForUndo(); appState.stickers[appState.selectedStickerIdx].fontFamily = fontName; renderStrip(); } }
function deleteSelectedSticker() { if (appState.selectedStickerIdx >= 0) { saveStateForUndo(); appState.stickers.splice(appState.selectedStickerIdx, 1); appState.selectedStickerIdx = -1; const bar = document.getElementById('stickerControlBar'); if (bar) bar.classList.add('hidden'); renderStrip(); } }

function setPickPreviewTheme(themeKey, btn) {
  appState.frameStyle = themeKey;
  document.querySelectorAll('.pick-theme-btn').forEach(b => {
    b.className = "pick-theme-btn py-1.5 text-slate-500 rounded-lg font-bold text-center";
  });
  if (btn) {
    btn.className = "pick-theme-btn py-1.5 bg-white text-theme rounded-lg shadow-2xs font-black text-center";
  }

  const miniFrame = document.getElementById('pickMiniFramePreview');
  const headerEl = document.getElementById('pickPreviewHeader');
  const midEl = document.getElementById('pickPreviewMiddleBanner');
  const footerEl = document.getElementById('pickPreviewFooter');

  if (miniFrame) {
    if (themeKey === 'photoism') miniFrame.style.backgroundColor = '#0A0A0A';
    else if (themeKey === 'baseball') miniFrame.style.backgroundColor = '#FAF7EE';
    else if (themeKey === 'birthday') miniFrame.style.backgroundColor = '#FDFBF7';
    else miniFrame.style.backgroundColor = '#000000';
  }

  if (themeKey === 'simple') {
    if (headerEl) { headerEl.classList.remove('hidden'); headerEl.textContent = "sangsangPhoto"; headerEl.style.color = "#FFFFFF"; }
    if (midEl) midEl.classList.add('hidden');
    if (footerEl) footerEl.classList.add('hidden');
  } else if (themeKey === 'middle') {
    if (headerEl) headerEl.classList.add('hidden');
    if (midEl) { midEl.classList.remove('hidden'); midEl.textContent = "추억의 네컷"; midEl.style.color = "#FFFFFF"; }
    if (footerEl) footerEl.classList.add('hidden');
  } else if (themeKey === 'bottom') {
    if (headerEl) headerEl.classList.add('hidden');
    if (midEl) midEl.classList.add('hidden');
    if (footerEl) { footerEl.classList.remove('hidden'); footerEl.textContent = "인생4컷"; footerEl.style.color = "#FFFFFF"; }
  } else if (themeKey === 'photoism') {
    if (headerEl) { headerEl.classList.remove('hidden'); headerEl.textContent = "photoism"; headerEl.style.color = "#FFFFFF"; }
    if (midEl) midEl.classList.add('hidden');
    if (footerEl) { footerEl.classList.remove('hidden'); footerEl.textContent = "KEEP YOURSELF ALIVE"; footerEl.style.color = "#888888"; }
  } else if (themeKey === 'baseball') {
    if (headerEl) { headerEl.classList.remove('hidden'); headerEl.textContent = "⚾ Play Baseball"; headerEl.style.color = "#1D4ED8"; }
    if (midEl) midEl.classList.add('hidden');
    if (footerEl) { footerEl.classList.remove('hidden'); footerEl.textContent = "Baseball makes life better :)"; footerEl.style.color = "#DC2626"; }
  } else if (themeKey === 'birthday') {
    if (headerEl) { headerEl.classList.remove('hidden'); headerEl.textContent = "🎂 Happy Birthday"; headerEl.style.color = "#E11D48"; }
    if (midEl) midEl.classList.add('hidden');
    if (footerEl) { footerEl.classList.remove('hidden'); footerEl.textContent = "More Happy, More Love ♥"; footerEl.style.color = "#E11D48"; }
  }
}

function initCanvasInteractions() {
  const canvas = document.getElementById('photoCanvas');
  const viewport = document.getElementById('canvasViewport');
  if (!canvas || !viewport) return;

  function getCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      clientX, clientY,
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function handleStart(e) {
    if (e.touches && e.touches.length > 1) return;
    const c = getCoords(e);
    let hitSticker = false;

    for (let i = appState.stickers.length - 1; i >= 0; i--) {
      const st = appState.stickers[i];
      const dist = Math.hypot(c.x - st.x, c.y - st.y);
      if (dist <= Math.max(70, st.size * 1.4)) {
        appState.selectedStickerIdx = i;
        appState.dragTarget = i;
        appState.dragStartPos = { x: c.x - st.x, y: c.y - st.y };
        showStickerControls(st);
        renderStrip();
        hitSticker = true;
        break;
      }
    }

    if (!hitSticker) {
      isPanning = true;
      panStartX = c.clientX - canvasPanX;
      panStartY = c.clientY - canvasPanY;
      appState.selectedStickerIdx = -1;
      appState.dragTarget = null;
      const bar = document.getElementById('stickerControlBar'); 
      if (bar) bar.classList.add('hidden');
      renderStrip();
    }
  }

  function handleMove(e) {
    if (e.touches && e.touches.length > 1) return;
    const c = getCoords(e);

    if (appState.dragTarget !== null) {
      if (e.cancelable) e.preventDefault();
      const st = appState.stickers[appState.dragTarget];
      st.x = c.x - appState.dragStartPos.x;
      st.y = c.y - appState.dragStartPos.y;
      renderStrip();
    } else if (isPanning) {
      if (e.cancelable) e.preventDefault();
      canvasPanX = c.clientX - panStartX;
      canvasPanY = c.clientY - panStartY;
      applyZoomTransform();
    }
  }

  function handleEnd() { 
    if (appState.dragTarget !== null) saveStateForUndo(); 
    appState.dragTarget = null; 
    isPanning = false;
  }

  viewport.addEventListener('mousedown', handleStart); 
  window.addEventListener('mousemove', handleMove); 
  window.addEventListener('mouseup', handleEnd);
  viewport.addEventListener('touchstart', handleStart, { passive: false }); 
  window.addEventListener('touchmove', handleMove, { passive: false }); 
  window.addEventListener('touchend', handleEnd);
}

// ========================================================
// 8. 메인 캔버스 렌더링 (1×4 스트립 vs 2×2 엽서형)
// ========================================================
function renderStrip(isFinalExport = false) {
  const canvas = document.getElementById('photoCanvas'); 
  if (!canvas) return; 
  const ctx = canvas.getContext('2d');
  if (!appState.selectedImages || appState.selectedImages.length < 4) return;
  const layout = appState.selectedFormat || 'strip'; 
  const sigInp = document.getElementById('frameSignatureInput'); 
  const customTitle = sigInp ? sigInp.value : 'sangsangPhoto';
  const pad = appState.frameThickness; 
  const gap = Math.round(pad * 0.5);
  const fStyle = appState.frameStyle;

  if (layout === 'strip') {
    canvas.width = 800; canvas.height = 2400;
  } else if (layout === 'grid') {
    canvas.width = 1200; canvas.height = 1800;
  }

  if (fStyle === 'photoism') ctx.fillStyle = '#0A0A0A';
  else if (fStyle === 'baseball') ctx.fillStyle = '#FAF7EE';
  else if (fStyle === 'birthday') ctx.fillStyle = '#FDFBF7';
  else ctx.fillStyle = appState.frameColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (layout === 'strip') {
    if (fStyle === 'middle') {
      const bannerH = 160; 
      const imgW = canvas.width - (pad * 2); 
      const imgH = (canvas.height - (pad * 2) - bannerH - (gap * 3)) / 4;
      drawFilteredSlotPhoto(ctx, appState.selectedImages[0], pad, pad, imgW, imgH); 
      drawFilteredSlotPhoto(ctx, appState.selectedImages[1], pad, pad + imgH + gap, imgW, imgH); 
      const bannerY = pad + (imgH * 2) + (gap * 2); 
      drawMiddleBanner(ctx, canvas.width / 2, bannerY + (bannerH / 2), customTitle); 
      const lowerStartY = bannerY + bannerH + gap; 
      drawFilteredSlotPhoto(ctx, appState.selectedImages[2], pad, lowerStartY, imgW, imgH); 
      drawFilteredSlotPhoto(ctx, appState.selectedImages[3], pad, lowerStartY + imgH + gap, imgW, imgH); 
    } else {
      const isBottom = (fStyle === 'bottom'); 
      const topHeaderH = isBottom ? 45 : 120; 
      const bottomFooterH = isBottom ? 220 : 45; 
      const imgW = canvas.width - (pad * 2); 
      const imgH = (canvas.height - topHeaderH - bottomFooterH - (gap * 3)) / 4;

      renderHeaderOrDecor(ctx, 0, 0, canvas.width, canvas.height, customTitle, topHeaderH, isBottom); 
      for (let i = 0; i < 4; i++) { 
        const y = topHeaderH + (i * (imgH + gap)); 
        drawFilteredSlotPhoto(ctx, appState.selectedImages[i], pad, y, imgW, imgH); 
      }
      if (isBottom || fStyle === 'photoism' || fStyle === 'baseball' || fStyle === 'birthday') {
        const footerCenterY = (canvas.height - bottomFooterH) + (bottomFooterH / 2);
        drawBottomStyleFooter(ctx, canvas.width / 2, footerCenterY, customTitle);
      }
    }
  } 
  else if (layout === 'grid') {
    const isBottom = (fStyle === 'bottom'); 
    const bannerH = (fStyle === 'middle') ? 140 : 0;
    const topHeaderH = (fStyle === 'simple' || fStyle === 'photoism' || fStyle === 'baseball' || fStyle === 'birthday') ? 140 : (isBottom ? 45 : pad + 20);
    const bottomFooterH = (isBottom || fStyle === 'photoism' || fStyle === 'baseball' || fStyle === 'birthday') ? 190 : (fStyle === 'simple' ? 50 : pad + 20);

    const imgW = (canvas.width - (pad * 2) - gap) / 2; 
    const imgH = Math.round(imgW * 1.25);

    if (fStyle === 'middle') {
      const totalContentH = (imgH * 2) + gap + bannerH;
      const startY = Math.max(pad, (canvas.height - totalContentH) / 2);

      drawFilteredSlotPhoto(ctx, appState.selectedImages[0], pad, startY, imgW, imgH); 
      drawFilteredSlotPhoto(ctx, appState.selectedImages[1], pad + imgW + gap, startY, imgW, imgH); 

      const bannerY = startY + imgH + gap; 
      drawMiddleBanner(ctx, canvas.width / 2, bannerY + (bannerH / 2), customTitle, 34); 

      const lowerY = bannerY + bannerH + gap; 
      drawFilteredSlotPhoto(ctx, appState.selectedImages[2], pad, lowerY, imgW, imgH); 
      drawFilteredSlotPhoto(ctx, appState.selectedImages[3], pad + imgW + gap, lowerY, imgW, imgH); 
    } else {
      renderHeaderOrDecor(ctx, 0, 0, canvas.width, canvas.height, customTitle, topHeaderH, isBottom); 
      const coords = [
        { x: pad, y: topHeaderH }, 
        { x: pad + imgW + gap, y: topHeaderH }, 
        { x: pad, y: topHeaderH + imgH + gap }, 
        { x: pad + imgW + gap, y: topHeaderH + imgH + gap }
      ];
      for (let i = 0; i < 4; i++) { 
        drawFilteredSlotPhoto(ctx, appState.selectedImages[i], coords[i].x, coords[i].y, imgW, imgH); 
      }
      if (isBottom || fStyle === 'photoism' || fStyle === 'baseball' || fStyle === 'birthday') {
        const footerCenterY = (canvas.height - bottomFooterH) + (bottomFooterH / 2);
        drawBottomStyleFooter(ctx, canvas.width / 2, footerCenterY, customTitle, 32);
      }
    }
  }

  appState.stickers.forEach((st, idx) => {
    ctx.save();
    ctx.translate(st.x, st.y);
    ctx.rotate(((st.rotation || 0) * Math.PI) / 180);
    if (st.type === 'text') {
      const fontName = st.fontFamily || 'Pretendard'; 
      ctx.font = `900 ${st.size}px '${fontName}', sans-serif`; 
      ctx.fillStyle = st.color || '#FFFFFF'; 
      ctx.shadowColor = 'rgba(0,0,0,0.85)'; 
      ctx.shadowBlur = 8; 
      ctx.textAlign = 'center'; 
      ctx.textBaseline = 'middle'; 
      ctx.fillText(st.text, 0, 0);
    } else {
      ctx.font = `${st.size}px sans-serif`; 
      ctx.textAlign = 'center'; 
      ctx.textBaseline = 'middle'; 
      ctx.fillText(st.text, 0, 0);
    }
    if (!isFinalExport && idx === appState.selectedStickerIdx) {
      ctx.strokeStyle = '#F43F5E'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); const radius = (st.type === 'text') ? st.size * 1.1 : st.size * 0.65; ctx.strokeRect(-radius, -st.size * 0.6, radius * 2, st.size * 1.2);
    }
    ctx.restore();
  });
}

function renderHeaderOrDecor(ctx, bx, by, bw, bh, title, topH, isBottom) {
  const fStyle = appState.frameStyle;
  ctx.save();

  if (fStyle === 'photoism') {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 38px 'Playfair Display', serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText("photoism", bx + bw - 35, by + (topH / 2) + 5);

    ctx.font = `bold 14px monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'left';
    ctx.fillText('▶ 5', bx + 25, by + (topH / 2) + 5);
  }
  else if (fStyle === 'baseball') {
    ctx.fillStyle = '#1E3A8A';
    ctx.font = `900 38px 'Black Han Sans', sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText("⚾ Play Baseball", bx + 25, by + (topH / 2) - 6);

    ctx.fillStyle = '#DC2626';
    ctx.font = `bold 14px 'Pretendard', sans-serif`;
    ctx.fillText("오늘도, 우리는 야구를 한다!", bx + 25, by + (topH / 2) + 20);
  }
  else if (fStyle === 'birthday') {
    ctx.fillStyle = '#E11D48';
    ctx.font = `900 38px 'Playfair Display', serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText("🎂 Happy Birthday", bx + 25, by + (topH / 2) - 6);

    ctx.fillStyle = '#9F1239';
    ctx.font = `bold 14px 'Pretendard', sans-serif`;
    ctx.fillText("오늘은 너라는 기적이 태어난 날! ♡", bx + 25, by + (topH / 2) + 20);
  }
  else if (!isBottom && fStyle === 'simple') {
    const isDark = (appState.frameColor === '#000000' || appState.frameColor === '#111827'); 
    const textColor = isDark ? '#FFFFFF' : '#1E293B'; 
    const weight = appState.typography.isBold ? '900' : 'bold';

    ctx.fillStyle = textColor; 
    ctx.font = `${weight} 38px '${appState.typography.fontFamily}', serif`; 
    ctx.textAlign = 'right'; 
    ctx.textBaseline = 'middle'; 
    ctx.fillText(title, bx + bw - 35, by + (topH / 2) + 5);
    ctx.font = `bold 13px monospace`; 
    ctx.textAlign = 'left'; 
    ctx.fillText('◀◀ A beautiful memory is a picture ▶▶', bx + 25, by + (topH / 2) + 5);
    ctx.font = `bold 14px monospace`; 
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)'; 
    ctx.fillText('▶ 4', bx + 14, by + (bh * 0.28)); 
    ctx.fillText('▶ 5', bx + 14, by + (bh * 0.72));
    ctx.save(); ctx.translate(bx + bw - 14, by + (bh * 0.35)); ctx.rotate(Math.PI / 2); ctx.font = `900 12px monospace`; ctx.letterSpacing = "2px"; ctx.fillText("KEEP YOUR MEMORY", 0, 0); ctx.restore();
    ctx.save(); ctx.translate(bx + bw - 14, by + (bh * 0.78)); ctx.rotate(Math.PI / 2); ctx.font = `900 12px monospace`; ctx.fillText("PHOTO.IS", 0, 0); ctx.restore();
  }
  ctx.restore();
}

function drawMiddleBanner(ctx, x, centerY, title, customSize = null) {
  const size = customSize || appState.typography.fontSize; 
  const weight = appState.typography.isBold ? '900' : 'bold';
  const showDate = appState.showDate;
  const isDark = (appState.frameColor === '#000000' || appState.frameColor === '#111827');
  const textColor = appState.typography.fontColor || (isDark ? '#FFFFFF' : '#1E293B');
  const dateSize = Math.max(13, Math.round(size * 0.45));
  const gap = Math.max(10, Math.round(size * 0.25));

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = textColor;

  if (showDate) {
    const totalHeight = size + gap + dateSize;
    const titleY = centerY - (totalHeight / 2) + (size / 2);
    const dateY = centerY + (totalHeight / 2) - (dateSize / 2);

    ctx.font = `${weight} ${size}px '${appState.typography.fontFamily}', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(title, x, titleY);

    ctx.font = `normal ${dateSize}px '${appState.typography.fontFamily}', sans-serif`;
    ctx.globalAlpha = 0.75;
    ctx.textBaseline = 'middle';
    ctx.fillText(appState.typography.date, x, dateY);
  } else {
    ctx.font = `${weight} ${size}px '${appState.typography.fontFamily}', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(title, x, centerY);
  }
  ctx.restore();
}

function drawBottomStyleFooter(ctx, x, centerY, title, customSize = null) {
  const fStyle = appState.frameStyle;
  const size = customSize || appState.typography.fontSize; 
  const showDate = appState.showDate;
  ctx.save();

  if (fStyle === 'photoism') {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `700 ${Math.max(13, Math.round(size * 0.5))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("52    PHOTOISM    KEEP YOURSELF ALIVE", x, centerY);
  }
  else if (fStyle === 'baseball') {
    ctx.fillStyle = '#1E3A8A';
    ctx.font = `900 ${Math.max(14, Math.round(size * 0.6))}px 'Pretendard', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("Baseball makes life better :)", x, centerY - (showDate ? 10 : 0));
    if (showDate) {
      ctx.fillStyle = '#DC2626';
      ctx.font = `bold 13px monospace`;
      ctx.fillText(appState.typography.date, x, centerY + 16);
    }
  }
  else if (fStyle === 'birthday') {
    ctx.fillStyle = '#E11D48';
    ctx.font = `900 ${Math.max(14, Math.round(size * 0.6))}px 'Playfair Display', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("More Happy, More Love ♥", x, centerY - (showDate ? 10 : 0));
    if (showDate) {
      ctx.fillStyle = '#9F1239';
      ctx.font = `bold 13px monospace`;
      ctx.fillText(appState.typography.date, x, centerY + 16);
    }
  }
  else {
    const weight = appState.typography.isBold ? '900' : 'bold';
    const isDark = (appState.frameColor === '#000000' || appState.frameColor === '#111827');
    const textColor = appState.typography.fontColor || (isDark ? '#FFFFFF' : '#1E293B');
    const dateSize = Math.max(14, Math.round(size * 0.45));
    const gap = Math.max(12, Math.round(size * 0.3));

    ctx.textAlign = 'center';
    ctx.fillStyle = textColor;

    if (showDate) {
      const totalHeight = size + gap + dateSize;
      const titleY = centerY - (totalHeight / 2) + (size / 2);
      const dateY = centerY + (totalHeight / 2) - (dateSize / 2);

      ctx.font = `${weight} ${size}px '${appState.typography.fontFamily}', sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillText(title, x, titleY);

      ctx.font = `normal ${dateSize}px '${appState.typography.fontFamily}', sans-serif`;
      ctx.globalAlpha = 0.75;
      ctx.textBaseline = 'middle';
      ctx.fillText(appState.typography.date, x, dateY);
    } else {
      ctx.font = `${weight} ${size}px '${appState.typography.fontFamily}', sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillText(title, x, centerY);
    }
  }
  ctx.restore();
}

function drawFilteredSlotPhoto(ctx, img, targetX, targetY, targetW, targetH) {
  if (!img) return;
  ctx.save(); 
  ctx.beginPath(); 
  ctx.rect(targetX, targetY, targetW, targetH); 
  ctx.clip();

  const srcRatio = (img.width || 720) / (img.height || 480); 
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
    if (filterKey === 'bright') { r = r*1.1+10; g = g*1.08+8; b = b*1.05+6; }
    else if (filterKey === 'radiant') { r = r*1.12+15; g = g*1.1+12; b = b*1.15+15; }
    else if (filterKey === 'warm') { r = r*1.12+12; g = g*1.05+6; b = b*0.92; }
    else if (filterKey === 'cool') { r = r*0.92; g = g*1.02+4; b = b*1.15+12; }
    else if (filterKey === 'mood') { r = r*1.06+8; g = g*0.98; b = b*0.92+5; }
    else if (filterKey === 'retro') { r = r*1.08+15; g = g*0.95+8; b = b*0.82+12; }
    else if (filterKey === 'mono') { const gray = 0.299*r + 0.587*g + 0.114*b; r = g = b = gray; }
    else if (filterKey === 'sunset') { r = r*1.18+15; g = g*1.02+5; b = b*0.85; }
    else if (filterKey === 'cyan') { r = r*0.88; g = g*1.08+8; b = b*1.2+15; }
    else if (filterKey === 'green') { r = r*0.95; g = g*1.12+10; b = b*0.95; }
    else if (filterKey === 'pink') { r = r*1.15+12; g = g*0.95; b = b*1.1+10; }

    r *= bMul; g *= bMul; b *= bMul; 
    r = ((r / 255 - 0.5) * cFactor + 0.5) * 255; 
    g = ((g / 255 - 0.5) * cFactor + 0.5) * 255; 
    b = ((b / 255 - 0.5) * cFactor + 0.5) * 255;

    if (sMul !== 1 && filterKey !== 'mono') { 
      const lum = 0.299*r + 0.587*g + 0.114*b; 
      r = lum + (r - lum)*sMul; g = lum + (g - lum)*sMul; b = lum + (b - lum)*sMul; 
    }
    d[i] = Math.min(255, Math.max(0, r)); 
    d[i+1] = Math.min(255, Math.max(0, g)); 
    d[i+2] = Math.min(255, Math.max(0, b));
  }
}

// ========================================================
// 9. 🌟 4컷 비디오 생성 & 대형 팝업 (파일의 저장 | 공유)
// ========================================================
async function generateFourCutVideo() {
  const hasValidVideo = appState.selectedIndices.every(idx => idx !== null && appState.shotVideoBlobs[idx]);
  if (!hasValidVideo) {
    alert("촬영 영상 데이터가 부족합니다.\n동영상 합성은 부스에서 4컷을 연속 촬영했을 때 가능합니다.");
    return;
  }

  const btn = document.getElementById('btnAutoVideo'); 
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>4컷 비디오 합성 중...</span>`;
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
    vCanvas.width = 600; vCanvas.height = 1800; 
    const vCtx = vCanvas.getContext('2d');

    let mimeType = 'video/mp4'; 
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported('video/mp4')) { 
      mimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) ? 'video/webm;codecs=vp8' : 'video/webm'; 
    }

    const stream = vCanvas.captureStream(30); 
    const recorder = new MediaRecorder(stream, { mimeType }); 
    const chunks = []; 
    recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

    recorder.onstop = async () => {
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'; 
      const blob = new Blob(chunks, { type: mimeType }); 
      currentGeneratedVideoBlob = blob;
      currentGeneratedVideoFileName = `[추억의네컷]_Video_${Date.now()}.${ext}`;

      openVideoResultModal(blob);

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="video" class="w-4 h-4"></i><span>🎬 4컷 비디오 생성</span>`;
      }
      if (window.lucide) lucide.createIcons();

      // 백그라운드 구글 드라이브 자동 백업
      const reader = new FileReader();
      reader.onloadend = () => {
        const pureBase64 = extractPureBase64(reader.result);
        uploadMediaToGoogleDrive(pureBase64, 'video', currentGeneratedVideoFileName, mimeType).catch(() => {});
      };
      reader.readAsDataURL(blob);
    };
    recorder.start();

    const isBottom = (appState.frameStyle === 'bottom'); 
    const topH = isBottom ? 35 : 90; 
    const bottomH = isBottom ? 160 : 35; 
    const pad = 28; const gap = 14; 
    const slotW = vCanvas.width - (pad * 2); 
    const slotH = (vCanvas.height - topH - bottomH - (gap * 3)) / 4; 
    const customTitle = (document.getElementById('frameSignatureInput') && document.getElementById('frameSignatureInput').value) || 'sangsangPhoto';
    const startTime = performance.now(); 
    const totalDuration = 6000;

    function renderVideoLoop(time) {
      const elapsed = time - startTime; 
      vCtx.fillStyle = appState.frameColor; 
      vCtx.fillRect(0, 0, vCanvas.width, vCanvas.height); 
      renderHeaderOrDecor(vCtx, 0, 0, vCanvas.width, vCanvas.height, customTitle, topH, isBottom);

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

      if (isBottom || appState.frameStyle === 'photoism' || appState.frameStyle === 'baseball' || appState.frameStyle === 'birthday') {
        const fCenterY = (vCanvas.height - bottomH) + (bottomH / 2);
        drawBottomStyleFooter(vCtx, vCanvas.width / 2, fCenterY, customTitle, 26);
      }
      if (elapsed < totalDuration) requestAnimationFrame(renderVideoLoop); 
      else recorder.stop();
    }
    requestAnimationFrame(renderVideoLoop);
  } catch (err) { 
    alert("비디오 생성 실패: " + err.message); 
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="video" class="w-4 h-4"></i><span>🎬 4컷 비디오 생성</span>`; 
    }
    if (window.lucide) lucide.createIcons(); 
  }
}

function openVideoResultModal(blob) {
  const modal = document.getElementById('videoResultModal');
  const player = document.getElementById('videoResultPlayer');
  if (!modal || !player) return;

  player.src = URL.createObjectURL(blob);
  modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeVideoResultModal() {
  const modal = document.getElementById('videoResultModal');
  const player = document.getElementById('videoResultPlayer');
  if (player) player.pause();
  if (modal) modal.classList.add('hidden');
}

// 🌟 [파일의 저장]
function downloadCurrentVideoFile() {
  if (!currentGeneratedVideoBlob) return;
  const url = URL.createObjectURL(currentGeneratedVideoBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = currentGeneratedVideoFileName || `[추억의네컷]_Video_${Date.now()}.mp4`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// 🌟 [공유]
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
// 10. 🌟 QR코드 생성 (이미지 직접 다운로드 직링크 복구 tmpfiles.org/dl/)
// ========================================================
async function generateImageQRCode() {
  const btn = document.getElementById('btnSaveQR'); 
  if (btn) { 
    btn.disabled = true; 
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>다운로드 QR 생성 중...</span>`; 
  }
  if (window.lucide) lucide.createIcons();

  renderStrip(true); 
  const canvas = document.getElementById('photoCanvas'); 
  if (!canvas) return;

  const base64Img = canvas.toDataURL('image/png');
  const fileName = `[추억의네컷]_${appState.selectedFormat || 'photo'}_${Date.now()}.png`;

  // 구글 드라이브(추억의네컷_저장소) 백그라운드 백업
  uploadMediaToGoogleDrive(extractPureBase64(base64Img), 'image', fileName, 'image/png').catch(() => {});

  // 🌟 스캔 즉시 사진 파일이 직접 다운로드되는 직링크(tmpfiles.org/dl/...) 생성
  canvas.toBlob(async (blob) => {
    try {
      const formData = new FormData();
      formData.append('file', blob, fileName);

      const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: formData
      }).then(r => r.json());

      if (btn) { 
        btn.disabled = false; 
        btn.innerHTML = `<span>📱 QR코드 생성 (이미지 다운로드)</span>`; 
      }
      if (window.lucide) lucide.createIcons();

      if (uploadRes && uploadRes.status === 'success' && uploadRes.data && uploadRes.data.url) { 
        const directDownloadUrl = uploadRes.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
        displayResultWithQR(directDownloadUrl); 
      } else { 
        displayResultWithQR(window.location.href); 
      }
    } catch (err) {
      if (btn) { 
        btn.disabled = false; 
        btn.innerHTML = `<span>📱 QR코드 생성 (이미지 다운로드)</span>`; 
      }
      if (window.lucide) lucide.createIcons();
      displayResultWithQR(window.location.href);
    }
  }, 'image/png');
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
  const imgData = canvas.toDataURL('image/jpeg', 0.95); 
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
  pdf.save(`[추억의네컷]_Print_${appState.selectedFormat}_${Date.now()}.pdf`);
}

function sharePhotoDirectly() {
  renderStrip(true); 
  const canvas = document.getElementById('photoCanvas'); 
  if (!canvas) return;
  canvas.toBlob(async (blob) => {
    if (!blob) return; 
    const file = new File([blob], `[추억의네컷]_Photo_${Date.now()}.png`, { type: 'image/png' });
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
  new QRCode(qrBox, { text: url, width: 140, height: 140, correctLevel: QRCode.CorrectLevel.M });
  showScreen('screenResult'); 
  startAutoReset();
}

function returnToEditor() { 
  if (appState.resetInterval) { clearInterval(appState.resetInterval); appState.resetInterval = null; } 
  showScreen('screenEdit'); 
  renderStrip(); 
}

function showScreen(id) {
  const screenIds = ['screenHome', 'screenBoard', 'screenLiveShoot', 'screenPick', 'screenEdit', 'screenResult'];
  screenIds.forEach(s => {
    const el = document.getElementById(s);
    if (el) { 
      if (s === id) { el.classList.remove('hidden'); el.style.display = ''; } 
      else { el.classList.add('hidden'); el.style.display = 'none'; } 
    }
  });
  if (window.lucide) lucide.createIcons();
  if (id === 'screenBoard') { renderBoard(); fetchCloudBoardPosts(); }
  else if (id === 'screenHome') { renderMainNotices(); trackVisitorAccess(); }
}

function cancelSession() { stopCameraAndAudio(); resetApp(); }
function resetApp() {
  if (appState.resetInterval) clearInterval(appState.resetInterval); 
  stopCameraAndAudio();
  appState.shotImages = []; 
  appState.selectedImages = []; 
  appState.selectedIndices = [null, null, null, null]; 
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

// ========================================================
// 11. 관리자 센터, 후기 & 고객소리함
// ========================================================
function promptAdminMode() {
  const now = Date.now();
  const lockoutUntil = parseInt(localStorage.getItem('chueok_admin_lockout_until') || '0', 10);

  if (now < lockoutUntil) {
    const remainingMinutes = Math.ceil((lockoutUntil - now) / 60000);
    alert(`비밀번호 5회 연속 오류로 인해 ${remainingMinutes}분 동안 관리자 설정에 접근할 수 없습니다.`);
    return;
  }

  const pw = prompt("관리자 비밀번호를 입력하세요");
  if (pw === "0724" || pw === "1234") {
    localStorage.removeItem('chueok_admin_fail_count');
    localStorage.removeItem('chueok_admin_lockout_until');
    appState.isAdmin = true;
    openAdminDashboard();
  } else if (pw !== null) {
    let failCount = parseInt(localStorage.getItem('chueok_admin_fail_count') || '0', 10) + 1;
    if (failCount >= 5) {
      const lockTime = now + (5 * 60 * 1000);
      localStorage.setItem('chueok_admin_lockout_until', lockTime.toString());
      localStorage.removeItem('chueok_admin_fail_count');
      alert("비밀번호를 5회 잘못 입력하여 5분간 관리자 설정 진입이 차단됩니다.");
      showScreen('screenHome');
    } else {
      localStorage.setItem('chueok_admin_fail_count', failCount.toString());
      alert(`비밀번호가 올바르지 않습니다. (${failCount}/5회 실패)`);
    }
  }
}

let hourlyChartInstance = null;
let deviceChartInstance = null;

function openAdminDashboard() {
  document.getElementById('adminDashboardModal').classList.remove('hidden');
  updateAdminDashboardStats();
  renderAdminNoticeManageList();
  renderAdminReviewManageList();
  renderAdminLocationStats();
  switchAdminTab('stats');
  if (window.lucide) lucide.createIcons();
}

function closeAdminDashboard() {
  document.getElementById('adminDashboardModal').classList.add('hidden');
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

function handleStarClick(starNum) {
  if (currentRatingValue === starNum - 0.5) currentRatingValue = starNum;
  else if (currentRatingValue === starNum) currentRatingValue = starNum - 0.5;
  else currentRatingValue = starNum - 0.5;
  updateRatingUI(currentRatingValue);
}

function updateRatingUI(val) {
  const num = parseFloat(val);
  currentRatingValue = num;

  const scoreText = document.getElementById('ratingValueText');
  if (scoreText) scoreText.textContent = num.toFixed(1);

  for (let i = 1; i <= 5; i++) {
    const starEl = document.getElementById('star' + i);
    if (!starEl) continue;
    if (num >= i) {
      starEl.textContent = '★';
      starEl.className = 'text-amber-500 transition hover:scale-110 cursor-pointer';
    } else if (num === i - 0.5) {
      starEl.textContent = '★';
      starEl.className = 'text-amber-400 opacity-60 transition hover:scale-110 cursor-pointer';
    } else {
      starEl.textContent = '☆';
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
    if (parseFloat(avgRating) % 1 !== 0) s += '½';
    avgStarsEl.textContent = s;
  }
  if (!container) return;
  if (posts.length === 0) { 
    container.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">등록된 후기가 없습니다. 첫 후기를 남겨보세요!</p>`; 
    return; 
  }

  container.innerHTML = posts.map(p => {
    const ratingNum = Number(p.rating) || 5.0; 
    let starStr = '';
    for (let i = 0; i < Math.floor(ratingNum); i++) starStr += '⭐';
    if (ratingNum % 1 !== 0) starStr += '½';

    return `
      <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative">
        <div class="flex justify-between items-center">
          <div class="flex items-center space-x-1.5">
            <span class="font-bold text-[11px] text-slate-800">${escapeHtml(p.nickname)}</span>
            <span class="text-[10px] text-amber-500 font-black">${starStr} ${ratingNum.toFixed(1)}</span>
          </div>
          <span class="text-[9px] text-slate-400">${p.date}</span>
        </div>
        <p class="text-xs text-slate-700 mt-1 break-words">${escapeHtml(p.content)}</p>
      </div>
    `;
  }).join('');
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
        <div class="flex items-center space-x-2">
          <span class="text-[10px] text-slate-400">${p.date}</span>
          <button onclick="deleteReviewPost(${p.id})" class="text-[10px] bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded font-black hover:bg-rose-100 transition">삭제</button>
        </div>
      </div>
      <p class="text-[11px] text-slate-600 break-words">${escapeHtml(p.content)}</p>
    </div>
  `).join('');
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
  btn.textContent = "업로드 중...";

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
    console.warn("후기 동기화 지연:", err);
  } finally {
    btn.disabled = false;
    btn.textContent = "후기 등록";
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
    setTimeout(fetchCloudBoardPosts, 500);
  } catch (e) {}
}

function openCustomerBotModal() {
  document.getElementById('customerBotModal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeCustomerBotModal() {
  document.getElementById('customerBotModal').classList.add('hidden');
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
    let replyComment = "";
    if (email) {
      replyComment = `소중한 의견이 정상 접수되었습니다! 보내주신 내용을 토대로 서비스 개선에 적극 반영하며, 기재해주신 이메일(<b>${escapeHtml(email)}</b>)로 상세히 답변드리겠습니다. 감사합니다! 💖`;
    } else {
      replyComment = `소중한 의견이 정상 접수되었습니다! 보내주신 피드백을 바탕으로 시스템을 지속적으로 개선하겠습니다. (※ 개별 답변이 필요하신 경우 이메일 주소를 함께 남겨주세요.) 😊`;
    }

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

// ========================================================
// 12. 공지사항 관리 (안전 기본값 & 클라우드 연동)
// ========================================================
function getStoredNotices() {
  const stored = localStorage.getItem('vibe_notices');
  let list = [];
  if (stored) { 
    try { list = JSON.parse(stored); } catch(e) { list = []; } 
  }
  // 🌟 기본 공지사항 보장 (공지창 사라짐 원천 차단)
  if (!list || list.length === 0) {
    list = [{ 
      id: 'v15_4', 
      date: getFormattedTodayDate(), 
      version: 'v15.4', 
      content: '1x4 가로 풀화면 / 2x2 세로 풀화면 맞춤촬영 & 직관적인 뷰어 업데이트 완료!' 
    }];
  }
  return list;
}

function renderMainNotices() {
  const container = document.getElementById('noticeListContainer');
  const area = document.getElementById('mainNoticeArea');
  if (!container || !area) return;
  const allNotices = getStoredNotices();
  const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(new Date().getDate() - 14);

  const validNotices = allNotices.filter(n => {
    if (!n.date) return false;
    const parts = n.date.split('.');
    const nDate = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
    return nDate >= twoWeeksAgo;
  }).slice(0, 1);

  if (validNotices.length === 0) {
    area.classList.add('hidden');
    return;
  }
  container.innerHTML = validNotices.map(n => `
    <div class="bg-white/95 border border-rose-100 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-left">
      <div class="flex items-center space-x-2 min-w-0 mr-2">
        <span class="bg-theme text-white text-[9px] font-black px-1.5 py-0.5 rounded shrink-0">${n.version || '공지'}</span>
        <p class="text-[11px] font-bold text-slate-800 truncate">${n.content}</p>
      </div>
      <span class="text-[10px] text-slate-400 shrink-0">${n.date}</span>
    </div>
  `).join('');
  area.classList.remove('hidden');
}

function renderAdminNoticeManageList() {
  const listEl = document.getElementById('adminNoticeManageList');
  if (!listEl) return;
  const notices = getStoredNotices();
  listEl.innerHTML = notices.map(n => `
    <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
      <div>
        <span class="font-black text-theme text-[10px] mr-1">[${n.version || '공지'}]</span>
        <span class="font-bold text-slate-800">${n.content}</span>
        <p class="text-[9px] text-slate-400 mt-0.5">${n.date}</p>
      </div>
      <button onclick="deleteNotice('${n.id}')" class="text-[10px] text-rose-600 underline font-bold ml-2 shrink-0">삭제</button>
    </div>
  `).join('');
}

async function writeAdminNotice() {
  const content = prompt("새 공지사항 내용을 입력하세요:\n(모든 접속자의 홈 화면에 실시간 노출됩니다)");
  if (!content || !content.trim()) return;

  const newNotice = { 
    id: Date.now().toString(), 
    date: getFormattedTodayDate(), 
    version: 'v15.4', 
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
    alert("새 공지사항이 중앙 DB에 등록되어 전 기기에 실시간 공유됩니다.");
  } catch (e) {}
}

async function deleteNotice(id) {
  if (!confirm("이 공지를 삭제하시겠습니까?")) return;
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

// 🌟 중앙 DB로부터 방문자, 통계, 후기, 공지사항을 일괄 동기화
async function trackVisitorAccess() {
  const todayStr = getFormattedTodayDate();
  let todayVisits = parseInt(localStorage.getItem('chueok_stat_today_' + todayStr) || '1', 10);
  let totalVisits = parseInt(localStorage.getItem('chueok_stat_total') || '2180', 10);

  try {
    const res = await fetch(`${GOOGLE_DB_URL}?api=true&_t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        if (data.visits) {
          totalVisits = data.visits.total;
          todayVisits = (data.visits.date === todayStr) ? data.visits.today : 1;
          localStorage.setItem('chueok_stat_total', totalVisits);
          localStorage.setItem('chueok_stat_today_' + todayStr, todayVisits);
        }
        if (data.deviceStats) {
          localStorage.setItem('chueok_device_stats', JSON.stringify(data.deviceStats));
        }
        if (data.locationStats) {
          localStorage.setItem('chueok_location_stats', JSON.stringify(data.locationStats));
        }
        if (Array.isArray(data.notices) && data.notices.length > 0) {
          localStorage.setItem('vibe_notices', JSON.stringify(data.notices));
          renderMainNotices();
          renderAdminNoticeManageList();
        }
        if (Array.isArray(data.reviews)) {
          localStorage.setItem('vibe_posts', JSON.stringify(data.reviews));
          renderBoard();
          renderAdminReviewManageList();
        }
      }
    }
  } catch (e) {}

  if (!sessionStorage.getItem('chueok_session_logged')) {
    sessionStorage.setItem('chueok_session_logged', 'true');
    const telemetry = await collectDeviceTelemetry();

    try {
      const postRes = await fetch(GOOGLE_DB_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'VISIT', ...telemetry })
      });
      if (postRes.ok) {
        const postData = await postRes.json();
        if (postData.success && postData.visits) {
          todayVisits = postData.visits.today;
          totalVisits = postData.visits.total;
          localStorage.setItem('chueok_stat_total', totalVisits);
          localStorage.setItem('chueok_stat_today_' + todayStr, todayVisits);
        }
      }
    } catch (e) {
      totalVisits++;
      todayVisits++;
    }

    let logs = JSON.parse(localStorage.getItem('chueok_visitor_logs') || '[]');
    logs.unshift({ id: Date.now(), date: todayStr, hour: new Date().getHours(), device: telemetry.device });
    if (logs.length > 500) logs.pop();
    localStorage.setItem('chueok_visitor_logs', JSON.stringify(logs));
  }

  const todayEl = document.getElementById('statTodayCount');
  const totalEl = document.getElementById('statTotalCount');
  if (todayEl) todayEl.textContent = todayVisits;
  if (totalEl) totalEl.textContent = totalVisits.toLocaleString();
}

async function shareWebAppUrl() {
  const shareUrl = window.location.href.split('?')[0];
  const shareData = {
    title: '추억의 네컷 Studio Pro',
    text: '감성 가득한 셀프 네컷 사진을 촬영하고 꾸며보세요! 📸',
    url: shareUrl
  };

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }

  try {
    await navigator.clipboard.writeText(shareUrl);
    alert("스튜디오 링크가 클립보드에 복사되었습니다! 📋");
  } catch (err) {
    prompt("링크를 복사하여 공유하세요:", shareUrl);
  }
}

// ========================================================
// 13. 실행취소 & 다시실행
// ========================================================
let historyStack = []; 
let redoStack = [];

function saveStateForUndo() {
  const snapshot = JSON.stringify({
    stickers: appState.stickers, layout: appState.layout, frameStyle: appState.frameStyle,
    frameThickness: appState.frameThickness, frameColor: appState.frameColor, activeFilter: appState.activeFilter,
    filters: appState.filters, showDate: appState.showDate, typography: appState.typography,
    customTitle: document.getElementById('frameSignatureInput') ? document.getElementById('frameSignatureInput').value : ''
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
    filters: appState.filters, showDate: appState.showDate, typography: appState.typography,
    customTitle: document.getElementById('frameSignatureInput').value
  });
  redoStack.push(currentSnap);
  applySnapshot(JSON.parse(historyStack.pop()));
}

function redo() {
  if (redoStack.length === 0) return;
  const currentSnap = JSON.stringify({
    stickers: appState.stickers, layout: appState.layout, frameStyle: appState.frameStyle,
    frameThickness: appState.frameThickness, frameColor: appState.frameColor, activeFilter: appState.activeFilter,
    filters: appState.filters, showDate: appState.showDate, typography: appState.typography,
    customTitle: document.getElementById('frameSignatureInput').value
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
  appState.showDate = snap.showDate; 
  appState.typography = snap.typography;
  if (document.getElementById('frameSignatureInput')) { 
    document.getElementById('frameSignatureInput').value = snap.customTitle || ''; 
  }
  renderStrip();
}

// ========================================================
// 14. 엔트리포인트 (초기 구동 & 회전 리스너)
// ========================================================
window.addEventListener('DOMContentLoaded', () => {
  loadSavedTheme();
  initDynamicUI();
  initCanvasInteractions();
  setupCanvasPinchZoom();
  renderMainNotices();
  trackVisitorAccess();
  fetchCloudBoardPosts();

  // 화면 로드 즉시 아이콘 강제 렌더링
  setTimeout(() => {
    if (window.lucide) lucide.createIcons();
  }, 100);

  // 화면 회전 감지 리스너
  window.addEventListener('resize', () => {
    if (document.getElementById('screenLiveShoot') && !document.getElementById('screenLiveShoot').classList.contains('hidden')) {
      checkOrientationState();
    }
  });
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      if (document.getElementById('screenLiveShoot') && !document.getElementById('screenLiveShoot').classList.contains('hidden')) {
        checkOrientationState();
      }
    }, 200);
  });
});
