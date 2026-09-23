/**
 * 추억의 네컷 Studio Pro v16.0 Pro [1편 / 전반부]
 * 
 * [포함 기능]
 * 1. 시스템 설정 상수 & 15종 필터 & 3대 테마 팔레트
 * 2. 오디오(효과음) & 실감형 햅틱(진동) 엔진
 * 3. 카메라 구도 대기실(화각 3종) & 핫스왑 전환
 * 4. 24종 포즈 가이드, 반투명 카운트다운 & 실감형 플래시 연동
 * 5. 사진 선택: 1번 사진 즉시 노출, 초대형 프레임 슬롯 프리뷰 & 드래그앤드롭
 * 6. 스튜디오 꾸미기(에디터) 100% 즉각 화면 전환 보장
 * 7. 3대 테마(기본/심플/프리미엄) 분류 컨트롤러 & 투명 PNG 프레임 업로더
 * 8. 앨범 사진 4장 선택 수집기
 */

const GOOGLE_DB_URL = "https://script.google.com/macros/s/AKfycbw1fjoUYoKQOHNNatPY_8q8X-1ogUV7iaFsIMpYioStlVX1SZK9hYiY32P-bGv7GUVoBw/exec";
const APP_VERSION = "v16.0 Pro";

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

// 🌟 24종 포즈 가이드 (이모지 & 문구 페어)
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

// 🌟 15종 감성 필터 프리셋
const FILTER_PRESETS = {
  normal:       { bright: 100, contrast: 100, saturate: 100, name: '원본' },
  harublue:     { bright: 110, contrast: 105, saturate: 105, name: '하루블루' },
  deepmono:     { bright: 102, contrast: 138, saturate: 0,   name: '딥모노' },
  y2kcyber:     { bright: 108, contrast: 92,  saturate: 85,  name: 'Y2K사이버' },
  peachglow:    { bright: 114, contrast: 108, saturate: 118, name: '피치글로우' },
  naturalgloss: { bright: 116, contrast: 110, saturate: 108, name: '클리어광택' },
  bright:       { bright: 115, contrast: 105, saturate: 108, name: '뽀샤시' },
  radiant:      { bright: 112, contrast: 115, saturate: 125, name: '화사한' },
  warm:         { bright: 108, contrast: 105, saturate: 120, name: '따뜻한' },
  cool:         { bright: 106, contrast: 112, saturate: 95,  name: '차가운' },
  mood:         { bright: 105, contrast: 95,  saturate: 85,  name: '감성무드' },
  retro:        { bright: 108, contrast: 90,  saturate: 80,  name: '레트로' },
  mono:         { bright: 105, contrast: 130, saturate: 0,   name: '흑백' },
  sunset:       { bright: 110, contrast: 110, saturate: 135, name: '노을빛' },
  pink:         { bright: 112, contrast: 108, saturate: 120, name: '로맨틱핑크' }
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

// 🌟 실행취소/다시실행 스택
let historyStack = [];
let redoStack = [];

// 🌟 애플리케이션 메인 상태 객체
let appState = {
  isAdmin: false,
  stream: null,
  facingMode: 'user',
  timerSec: 6,
  currentCount: 6,
  countdownTimer: null,
  selectedFormat: 'strip', // 'strip' (1x4) | 'grid' (2x2)
  viewfinderRatio: 'full', // 'full' | '3:2' | '4:5'
  currentShotIndex: 0,
  
  shotImages: [],
  selectedImages: [],
  selectedIndices: [null, null, null, null],
  activeSlotIndex: 0,
  shotVideoBlobs: [],
  currentMediaRecorder: null,
  currentShotVideoChunks: [],

  // 테마 시스템 (기본 / 심플 / 프리미엄)
  themeCategory: 'basic',
  frameStyle: 'middle', // basic: top, middle, bottom, dual / simple: zigzag, stair, wideinset / premium: birthday, baseball, comic, photoism, custom_png
  frameColor: '#000000',
  frameThickness: 60,
  layout: 'strip',
  customPngOverlayImage: null,

  activeFilter: 'normal',
  filters: { bright: 100, contrast: 100, saturate: 100 },
  showDate: true,
  typography: {
    fontFamily: 'Pretendard',
    fontSize: 60,
    fontColor: '#FFFFFF',
    isBold: true,
    date: getFormattedTodayDate()
  },

  stickers: [],
  recentStickers: [],
  selectedStickerIdx: -1,
  dragTarget: null,
  dragStartPos: { x: 0, y: 0 },
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

// ========================================================
// 1. 오디오 및 햅틱 엔진
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
// 2. 세션 시작 & 구도 확인 대기실
// ========================================================
function startSession(format) {
  appState.selectedFormat = format || 'strip';
  appState.layout = format || 'strip';
  appState.currentShotIndex = 0;
  appState.shotImages = [];
  appState.selectedImages = [];
  appState.selectedIndices = [null, null, null, null];
  appState.shotVideoBlobs = [];

  const liveBadge = document.getElementById('liveFormatBadge');
  if (liveBadge) liveBadge.textContent = (format === 'strip') ? "1×4 스트립" : "2×2 엽서형";
  const editBadge = document.getElementById('editorFormatBadge');
  if (editBadge) editBadge.textContent = (format === 'strip') ? "1×4 스트립" : "2×2 엽서형";
  const progressBadge = document.getElementById('liveProgressBadge');
  if (progressBadge) progressBadge.textContent = "구도 대기실";

  showScreen('screenLiveShoot');

  // 대기실 UI 활성화
  const waitCtrl = document.getElementById('waitingRoomControls');
  const shootLayer = document.getElementById('activeShootingLayer');
  const bottomBar = document.getElementById('shootingBottomBar');

  if (waitCtrl) waitCtrl.classList.remove('hidden');
  if (shootLayer) shootLayer.classList.add('hidden');
  if (bottomBar) bottomBar.classList.add('hidden');

  startCameraStream();
}

window.startSession = startSession;
window.enterWaitingRoom = startSession;
window.requestSessionWithFormat = startSession;

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
// 3. 6컷 연속 촬영 파이프라인
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
// 4. 사진 선택 화면 (1번 사진 즉시 노출 & 초대형 슬롯)
// ========================================================
function renderPickScreen() {
  showScreen('screenPick');
  appState.selectedIndices = [null, null, null, null]; 
  appState.activeSlotIndex = 0; 
  currentCarouselIdx = 0;

  // 🌟 검은 화면 방지: 1번 컷 이미지 즉시 바인딩
  const imgEl = document.getElementById('carouselCurrentImg');
  if (imgEl && appState.shotImages.length > 0) {
    imgEl.src = appState.shotImages[0].src;
  }

  buildPickMiniPreviewStructure();
  setupCarouselViewer();
  setupSlotDragAndDrop();
  updateCarouselView();
}

function buildPickMiniPreviewStructure() {
  const container = document.getElementById('pickMiniFramePreview');
  if (!container) return;
  const isGrid = (appState.selectedFormat === 'grid');
  
  if (isGrid) {
    // 🌟 화면 가득 채우는 2x2 대형 슬롯 박스
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
    // 🌟 화면 가득 채우는 1x4 대형 스트립 슬롯 박스
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

// ========================================================
// 5. 🌟 스튜디오 꾸미기 100% 즉시 전환 & 에디터 초기화
// ========================================================
function confirmSelectedFour() {
  const missing = appState.selectedIndices.filter(idx => idx === null).length;
  if (missing > 0) { 
    alert(`4장의 사진을 모두 채워주세요!\n(아직 ${missing}개 슬롯이 비어 있습니다)`); 
    return; 
  }

  playBeep(1000);
  triggerHaptic('medium');

  appState.selectedImages = appState.selectedIndices.map(idx => appState.shotImages[idx]);
  resetEditorToDefault();

  showScreen('screenEdit');
  renderStrip();

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
  appState.typography.fontSize = 60;

  const sigInput = document.getElementById('frameSignatureInput'); 
  if (sigInput) sigInput.value = "추억네컷";

  const slThick = document.getElementById('sliderThickness'); if (slThick) slThick.value = 40;
  const fineTune = document.getElementById('filterFineTunePanel'); if (fineTune) fineTune.classList.add('hidden');
  const stBar = document.getElementById('stickerControlBar'); if (stBar) stBar.classList.add('hidden');
  resetCanvasZoom();
  historyStack = []; 
  redoStack = [];
}

// ========================================================
// 6. 🌟 3대 테마 분류 컨트롤러
// ========================================================
function switchThemeCategory(category) {
  appState.themeCategory = category;
  
  ['Basic', 'Simple', 'Premium'].forEach(cat => {
    const tab = document.getElementById('tabTheme' + cat);
    const panel = document.getElementById('themeSubPanel' + cat);
    const isTarget = (cat.toLowerCase() === category);
    if (tab) {
      if (isTarget) {
        tab.className = "px-2.5 py-1 rounded-md bg-white text-theme shadow-2xs font-black";
      } else {
        tab.className = "px-2.5 py-1 rounded-md text-slate-500 font-bold";
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
    setSimpleOffsetLayout('zigzag', null);
  } else if (category === 'premium') {
    setPremiumSubTheme('birthday', null);
  }
}

// 1. 기본 테마: 상단/중간/하단/상·하단 (균등 240px Safe Zone)
function setBasicTextPosition(pos, btn) {
  appState.customPngOverlayImage = null;
  appState.frameStyle = pos; // 'top' | 'middle' | 'bottom' | 'dual'
  document.querySelectorAll('.basic-pos-btn').forEach(b => {
    b.className = "basic-pos-btn p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold";
  });
  if (btn) btn.className = "basic-pos-btn p-1.5 bg-theme text-white border border-theme rounded-lg font-black shadow-2xs text-[10px]";
  renderStrip();
}

// 2. 심플 테마: 사진 위치 오프셋 (지그재그, 계단형 웨이브, 와이드인셋)
function setSimpleOffsetLayout(key, btn) {
  appState.customPngOverlayImage = null;
  appState.frameStyle = key; // 'zigzag' | 'stair' | 'wideinset'
  document.querySelectorAll('.simple-theme-btn').forEach(b => {
    b.className = "simple-theme-btn p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold truncate";
  });
  if (btn) btn.className = "simple-theme-btn p-1.5 bg-theme text-white border border-theme rounded-lg font-black shadow-2xs text-[10px] truncate";
  renderStrip();
}

// 3. 프리미엄 테마: 생일, 야구 2종, 포토이즘
function setPremiumSubTheme(key, btn) {
  appState.customPngOverlayImage = null;
  appState.frameStyle = key; // 'birthday' | 'baseball' | 'comic' | 'photoism'
  document.querySelectorAll('.premium-theme-btn').forEach(b => {
    b.className = "premium-theme-btn p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold truncate";
  });
  if (btn) btn.className = "premium-theme-btn p-1.5 bg-theme text-white border border-theme rounded-lg font-black shadow-2xs text-[10px] truncate";
  renderStrip();
}

// 투명 PNG 프레임 파일 업로드
function triggerCustomFrameUpload() {
  const input = document.getElementById('customFrameInput');
  if (input) { input.value = ''; input.click(); }
}

function handleCustomFrameUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  if (!file.type.includes('png')) {
    alert("사진 구멍이 투명하게 뚫린 'PNG' 파일만 프레임으로 적용 가능합니다!");
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      appState.customPngOverlayImage = img;
      appState.frameStyle = 'custom_png';
      alert("나만의 투명 PNG 프레임이 적용되었습니다! ✨");
      renderStrip();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

// ========================================================
// 7. 앨범 사진 4장 선택 수집기
// ========================================================
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
  if (window.lucide) lucide.createIcons();
}

function cancelGalleryCollect() { galleryAccumulator = []; const m = document.getElementById('galleryCollectModal'); if (m) m.classList.add('hidden'); }

// [1편 끝 - 2편(후반부) 코드를 바로 아래에 이어서 붙여넣어 주세요]
// ========================================================
// 8. 🌟 캔버스 샌드위치 렌더링 엔진 (Safe Zone & 3대 테마)
// ========================================================
function renderStrip(isFinalExport = false) {
  const canvas = document.getElementById('photoCanvas'); 
  if (!canvas) return; 
  const ctx = canvas.getContext('2d');
  if (!appState.selectedImages || appState.selectedImages.length < 4) return;

  const layout = appState.layout || 'strip'; 
  const sigInp = document.getElementById('frameSignatureInput'); 
  const customTitle = sigInp ? sigInp.value : '추억네컷';
  const pad = appState.frameThickness || 60; 
  const gap = Math.round(pad * 0.5);
  const fStyle = appState.frameStyle;
  const isDark = (appState.frameColor === '#000000' || appState.frameColor === '#111827' || appState.frameColor === '#18181B');

  // 해상도 세팅
  if (layout === 'strip') {
    canvas.width = 1200; canvas.height = 3600;
  } else if (layout === 'grid' || layout === 'twin') {
    canvas.width = 1800; canvas.height = 2700;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // ----------------------------------------------------
  // [레이어 1: 바닥 배경색]
  // ----------------------------------------------------
  if (fStyle === 'comic') ctx.fillStyle = '#FFFFFF';
  else if (fStyle === 'birthday') ctx.fillStyle = '#FAF7EE'; // 따뜻한 크림지 질감
  else ctx.fillStyle = appState.frameColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ----------------------------------------------------
  // [레이어 2: 사진 4장 슬롯 렌더링 (Safe Zone & 오프셋)]
  // ----------------------------------------------------
  if (layout === 'strip') {
    renderStripFormatPhotos(ctx, canvas, pad, gap, customTitle, fStyle, isDark);
  } else if (layout === 'grid') {
    renderGridFormatPhotos(ctx, canvas, pad, gap, customTitle, fStyle, isDark);
  } else if (layout === 'twin') {
    renderTwinFormatPhotos(ctx, canvas, pad, gap, customTitle, fStyle, isDark);
  }

  // ----------------------------------------------------
  // [레이어 3: 테마별 오버레이 그래픽 & 각인 문구]
  // ----------------------------------------------------
  renderThemeOverlayDecorations(ctx, canvas, pad, customTitle, fStyle, isDark, layout);

  // ----------------------------------------------------
  // [레이어 4: 스티커 렌더링 (선택 점선 박스 없음)]
  // ----------------------------------------------------
  appState.stickers.forEach(st => {
    ctx.save();
    ctx.translate(st.x, st.y);
    ctx.rotate(((st.rotation || 0) * Math.PI) / 180);
    if (st.type === 'text') {
      const fontName = st.fontFamily || 'Pretendard'; 
      ctx.font = `900 ${st.size}px '${fontName}', sans-serif`; 
      ctx.fillStyle = st.color || '#FFFFFF'; 
      ctx.shadowColor = 'rgba(0,0,0,0.85)'; 
      ctx.shadowBlur = 12; 
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
  });
}

// 1×4 스트립 사진 배치 (균등 240px Safe Zone & 심플 3종 오프셋)
function renderStripFormatPhotos(ctx, canvas, pad, gap, customTitle, fStyle, isDark) {
  const zoneH = 240; // 🌟 상단/중간/하단/상하단 모두 동일한 240px Safe Zone

  if (fStyle === 'middle') {
    const imgW = canvas.width - (pad * 2);
    const imgH = (canvas.height - (pad * 2) - zoneH - (gap * 3)) / 4;
    drawFilteredSlotPhoto(ctx, appState.selectedImages[0], pad, pad, imgW, imgH);
    drawFilteredSlotPhoto(ctx, appState.selectedImages[1], pad, pad + imgH + gap, imgW, imgH);
    
    const bannerY = pad + (imgH * 2) + (gap * 2);
    drawMiddleBanner(ctx, canvas.width / 2, bannerY + (zoneH / 2), customTitle, 56);

    const lowerY = bannerY + zoneH + gap;
    drawFilteredSlotPhoto(ctx, appState.selectedImages[2], pad, lowerY, imgW, imgH);
    drawFilteredSlotPhoto(ctx, appState.selectedImages[3], pad, lowerY + imgH + gap, imgW, imgH);
  } 
  else if (fStyle === 'top') {
    const topH = zoneH; const bottomH = 60;
    const imgW = canvas.width - (pad * 2);
    const imgH = (canvas.height - topH - bottomH - (gap * 3)) / 4;
    drawTopHeaderTitle(ctx, canvas.width - pad - 20, topH / 2, customTitle, isDark);
    for (let i = 0; i < 4; i++) {
      drawFilteredSlotPhoto(ctx, appState.selectedImages[i], pad, topH + (i * (imgH + gap)), imgW, imgH);
    }
  } 
  else if (fStyle === 'bottom') {
    const topH = 60; const bottomH = zoneH;
    const imgW = canvas.width - (pad * 2);
    const imgH = (canvas.height - topH - bottomH - (gap * 3)) / 4;
    for (let i = 0; i < 4; i++) {
      drawFilteredSlotPhoto(ctx, appState.selectedImages[i], pad, topH + (i * (imgH + gap)), imgW, imgH);
    }
    drawBottomFooterTitle(ctx, canvas.width / 2, (canvas.height - bottomH) + (bottomH / 2), customTitle, isDark);
  } 
  else if (fStyle === 'dual') {
    const dualH = 180;
    const imgW = canvas.width - (pad * 2);
    const imgH = (canvas.height - (dualH * 2) - (gap * 3)) / 4;
    drawTopHeaderTitle(ctx, canvas.width / 2, dualH / 2, customTitle, isDark, true);
    for (let i = 0; i < 4; i++) {
      drawFilteredSlotPhoto(ctx, appState.selectedImages[i], pad, dualH + (i * (imgH + gap)), imgW, imgH);
    }
    drawBottomFooterTitle(ctx, canvas.width / 2, (canvas.height - dualH) + (dualH / 2), appState.typography.date, isDark, true);
  }
  // 🌟 심플 테마: 3가지 사진 위치 오프셋
  else if (['zigzag', 'stair', 'wideinset'].includes(fStyle)) {
    const topH = 140; const bottomH = 160;
    const baseW = canvas.width - (pad * 2) - 60;
    const imgH = (canvas.height - topH - bottomH - (gap * 3)) / 4;

    for (let i = 0; i < 4; i++) {
      let offsetX = 0; let slotW = baseW;
      if (fStyle === 'zigzag') {
        offsetX = (i % 2 === 0) ? -28 : 28; // 지그재그
      } else if (fStyle === 'stair') {
        const offsets = [-35, 0, 35, -35]; // 계단형 웨이브
        offsetX = offsets[i];
      } else if (fStyle === 'wideinset') {
        slotW = (i === 1 || i === 2) ? baseW - 90 : baseW + 30; // 와이드인셋
      }
      const x = (canvas.width - slotW) / 2 + offsetX;
      const y = topH + (i * (imgH + gap));
      drawFilteredSlotPhoto(ctx, appState.selectedImages[i], x, y, slotW, imgH);
    }
    drawBottomFooterTitle(ctx, canvas.width / 2, (canvas.height - bottomH) + (bottomH / 2), customTitle, isDark);
  }
  // 프리미엄 테마 슬롯
  else {
    const topH = 180; const bottomH = 260;
    const imgW = canvas.width - (pad * 2);
    const imgH = (canvas.height - topH - bottomH - (gap * 3)) / 4;
    for (let i = 0; i < 4; i++) {
      drawFilteredSlotPhoto(ctx, appState.selectedImages[i], pad, topH + (i * (imgH + gap)), imgW, imgH);
    }
  }
}

// 2×2 엽서형 사진 배치
function renderGridFormatPhotos(ctx, canvas, pad, gap, customTitle, fStyle, isDark) {
  const topH = 160; const bottomH = 200;
  const imgW = (canvas.width - (pad * 2) - gap) / 2;
  const imgH = Math.round(imgW * 1.25);

  const coords = [
    { x: pad, y: topH },
    { x: pad + imgW + gap, y: topH },
    { x: pad, y: topH + imgH + gap },
    { x: pad + imgW + gap, y: topH + imgH + gap }
  ];

  for (let i = 0; i < 4; i++) {
    drawFilteredSlotPhoto(ctx, appState.selectedImages[i], coords[i].x, coords[i].y, imgW, imgH);
  }

  if (fStyle === 'bottom' || fStyle === 'dual' || fStyle === 'middle') {
    drawBottomFooterTitle(ctx, canvas.width / 2, (canvas.height - bottomH) + (bottomH / 2), customTitle, isDark);
  } else if (fStyle === 'top') {
    drawTopHeaderTitle(ctx, canvas.width - pad - 20, topH / 2, customTitle, isDark);
  }
}

// Twin (4x6 인쇄용 2줄) 사진 배치
function renderTwinFormatPhotos(ctx, canvas, pad, gap, customTitle, fStyle, isDark) {
  const stripW = (canvas.width / 2) - 30;
  const padX = pad * 0.65;
  const imgW = stripW - (padX * 2);
  const topH = 140; const bottomH = 200;
  const imgH = (canvas.height - topH - bottomH - (gap * 3)) / 4;

  [15, canvas.width / 2 + 15].forEach(baseX => {
    for (let i = 0; i < 4; i++) {
      drawFilteredSlotPhoto(ctx, appState.selectedImages[i], baseX + padX, topH + (i * (imgH + gap)), imgW, imgH);
    }
    drawBottomFooterTitle(ctx, baseX + (stripW / 2), (canvas.height - bottomH) + (bottomH / 2), customTitle, isDark, true);
  });

  // 가운데 절취선
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
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

// 🌟 테마별 오버레이 그래픽 & 각인 문구 시스템
function renderThemeOverlayDecorations(ctx, canvas, pad, customTitle, fStyle, isDark, layout) {
  ctx.save();

  // 1. 투명 커스텀 PNG 프레임
  if (appState.customPngOverlayImage) {
    ctx.drawImage(appState.customPngOverlayImage, 0, 0, canvas.width, canvas.height);
  }

  // 2. 🌟 포토이즘 테마: 상단 로고, 좌측 ▲ 재생버튼 4개, 우측 각인 슬로건, 컬러 개방
  else if (fStyle === 'photoism') {
    const textColor = isDark ? '#FFFFFF' : '#0F172A';
    
    // 상단 좌측 photoism 볼드 세리프 로고
    ctx.fillStyle = textColor;
    ctx.font = "700 54px 'Playfair Display', serif";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText("photoism", pad, 95);

    // 슬롯 높이 계산
    const topH = 180; const bottomH = 260; const gap = Math.round(pad * 0.5);
    const imgH = (canvas.height - topH - bottomH - (gap * 3)) / 4;

    // 좌측 기둥: 위쪽 향하는 재생 버튼 (▲) 사진 슬롯 옆에 1개씩
    for (let i = 0; i < 4; i++) {
      const centerY = topH + (i * (imgH + gap)) + (imgH / 2);
      ctx.fillStyle = textColor;
      ctx.font = "bold 20px monospace";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("▲", pad / 2, centerY);
    }

    // 우측 기둥: 세로 방향 영문 슬로건 각인
    ctx.save();
    ctx.translate(canvas.width - (pad / 2), canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
    ctx.font = "bold 14px monospace";
    ctx.textAlign = 'center';
    ctx.fillText("KEEP YOUR MEMORY  •  PHOTO.IS  •  KEEP YOURSELF ALIVE", 0, 0);
    ctx.restore();

    // 하단 각인
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)';
    ctx.font = "bold 22px monospace";
    ctx.textAlign = 'center';
    ctx.fillText("52    PHOTOISM    KEEP YOURSELF ALIVE", canvas.width / 2, canvas.height - 110);
  }

  // 3. 🌟 생일 축하 테마 (Birthday): 붓터치 Happy Birthday, 케이크, 리본
  else if (fStyle === 'birthday') {
    ctx.fillStyle = '#E11D48';
    ctx.font = "900 68px 'Playfair Display', serif";
    ctx.textAlign = 'left';
    ctx.fillText("Happy Birthday ♡", pad, 100);

    ctx.fillStyle = '#9F1239';
    ctx.font = "bold 20px 'Pretendard', sans-serif";
    ctx.fillText("오늘은 너라는 기적이 태어난 날! 🎂", pad, 145);

    // 하단 장식 & 손그림 별
    ctx.font = "32px sans-serif";
    ctx.fillText("🎀", canvas.width - pad - 60, 110);
    ctx.fillText("💐", pad + 20, canvas.height - 120);

    ctx.fillStyle = '#E11D48';
    ctx.font = "bold 22px 'Pretendard', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText("More Happy, More Love ♡", canvas.width / 2, canvas.height - 110);
  }

  // 4. 🌟 스포티 야구 테마 (Baseball): 헬멧, 야구공, 페넌트
  else if (fStyle === 'baseball') {
    ctx.fillStyle = '#1E3A8A';
    ctx.font = "900 64px 'Black Han Sans', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText("⚾ PLAY BASEBALL!", pad, 95);

    ctx.fillStyle = '#DC2626';
    ctx.font = "bold 20px 'Pretendard', sans-serif";
    ctx.fillText("오늘도, 우리는 야구를 한다! ★", pad, 145);

    ctx.font = "36px sans-serif";
    ctx.fillText("🧢", pad + 20, canvas.height - 110);
    ctx.fillText("⚾", canvas.width - pad - 60, 105);

    ctx.fillStyle = '#1E3A8A';
    ctx.font = "bold 22px 'Pretendard', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText("Baseball makes life better ⚾ Good Game!", canvas.width / 2, canvas.height - 110);
  }

  // 5. 🌟 야구 코믹 밈 테마 (Comic): 원목 배트, 말풍선 밈, 깡!
  else if (fStyle === 'comic') {
    ctx.fillStyle = '#0F172A';
    ctx.font = "900 52px 'Black Han Sans', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText("🪵 깡! 너네 팀은 몇 등이야?", pad, 90);

    ctx.fillStyle = '#475569';
    ctx.font = "bold 18px 'Pretendard', sans-serif";
    ctx.fillText("여름은 너무 더운데 가을에 야구 가면 안 돼? 💬", pad, 135);

    // 하단 타격 효과음 말풍선
    ctx.fillStyle = '#DC2626';
    ctx.font = "900 32px 'Black Han Sans', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText("💥 깡! 홈런 날려버려!", canvas.width / 2, canvas.height - 110);
  }

  // 6. 🌟 모든 프레임 트렌디 각인: Photography | PhotoBooth | PhotoIs | editor
  if (!['photoism', 'birthday', 'baseball', 'comic'].includes(fStyle)) {
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
    ctx.font = "bold 13px monospace";
    ctx.textAlign = 'center';
    ctx.fillText("Photography | PhotoBooth | PhotoIs | editor", canvas.width / 2, canvas.height - 35);
  }

  ctx.restore();
}

function drawTopHeaderTitle(ctx, x, y, title, isDark, isCenter = false) {
  ctx.save();
  ctx.fillStyle = isDark ? '#FFFFFF' : '#1E293B';
  ctx.font = `900 ${appState.typography.fontSize || 54}px '${appState.typography.fontFamily}', sans-serif`;
  ctx.textAlign = isCenter ? 'center' : 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x, y);
  ctx.restore();
}

function drawBottomFooterTitle(ctx, x, y, title, isDark, isCompact = false) {
  ctx.save();
  ctx.fillStyle = isDark ? '#FFFFFF' : '#1E293B';
  const size = isCompact ? 36 : (appState.typography.fontSize || 54);
  ctx.font = `900 ${size}px '${appState.typography.fontFamily}', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (appState.showDate) {
    ctx.fillText(title, x, y - 24);
    ctx.font = `normal ${Math.round(size * 0.45)}px '${appState.typography.fontFamily}', sans-serif`;
    ctx.globalAlpha = 0.7;
    ctx.fillText(appState.typography.date, x, y + 26);
  } else {
    ctx.fillText(title, x, y);
  }
  ctx.restore();
}

function drawMiddleBanner(ctx, x, centerY, title, size) {
  ctx.save();
  ctx.fillStyle = (appState.frameColor === '#000000' || appState.frameColor === '#111827') ? '#FFFFFF' : '#1E293B';
  ctx.font = `900 ${size}px '${appState.typography.fontFamily}', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (appState.showDate) {
    ctx.fillText(title, x, centerY - 24);
    ctx.font = `normal 24px '${appState.typography.fontFamily}', sans-serif`;
    ctx.globalAlpha = 0.75;
    ctx.fillText(appState.typography.date, x, centerY + 28);
  } else {
    ctx.fillText(title, x, centerY);
  }
  ctx.restore();
}

function drawFilteredSlotPhoto(ctx, img, targetX, targetY, targetW, targetH) {
  if (!img) return;
  ctx.save(); 
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

// ========================================================
// 9. 🌟 스티커 주변 배경 투영 플로팅 돋보기(Loupe)
// ========================================================
function updateFloatingLoupe(touchX, touchY, canvasCoordX, canvasCoordY) {
  const loupe = document.getElementById('floatingLoupe');
  const lCanvas = document.getElementById('loupeCanvas');
  const mainCanvas = document.getElementById('photoCanvas');
  if (!loupe || !lCanvas || !mainCanvas) return;

  loupe.style.left = `${touchX}px`;
  loupe.style.top = `${touchY}px`;
  loupe.classList.remove('hidden');

  lCanvas.width = 140;
  lCanvas.height = 140;
  const lCtx = lCanvas.getContext('2d');
  lCtx.imageSmoothingEnabled = true;
  lCtx.imageSmoothingQuality = 'high';
  lCtx.clearRect(0, 0, 140, 140);

  // 🌟 스티커 주변 80px 배경을 1.8배 확대 복사
  const cropSize = 80;
  lCtx.drawImage(
    mainCanvas,
    canvasCoordX - cropSize / 2,
    canvasCoordY - cropSize / 2,
    cropSize,
    cropSize,
    0,
    0,
    140,
    140
  );

  // 중앙 십자 타겟선
  lCtx.strokeStyle = 'rgba(244, 63, 94, 0.85)';
  lCtx.lineWidth = 1.5;
  lCtx.beginPath();
  lCtx.moveTo(70, 50); lCtx.lineTo(70, 90);
  lCtx.moveTo(50, 70); lCtx.lineTo(90, 70);
  lCtx.stroke();
}

function hideFloatingLoupe() {
  const loupe = document.getElementById('floatingLoupe');
  if (loupe) loupe.classList.add('hidden');
}

// ========================================================
// 10. 🌟 센터 0° 양방향 스크롤러 & 스티커 제어
// ========================================================
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
  pushRecentSticker('text', text); 
  const canvas = document.getElementById('photoCanvas');
  const newSticker = { 
    id: Date.now(), type: 'text', text, 
    x: canvas.width / 2, 
    y: canvas.height / 2, 
    size: 80, rotation: 0, color: '#FFFFFF', 
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
    x: canvas.width / 2, 
    y: canvas.height / 2, 
    size: 95, rotation: 0 
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
  
  // 🌟 센터 0° 회전 슬라이더 동기화
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

// ========================================================
// 11. 스티커 터치 제스처 & 캔버스 줌
// ========================================================
function initCanvasInteractions() {
  const canvas = document.getElementById('photoCanvas');
  const viewport = document.getElementById('canvasViewport');
  if (!canvas || !viewport) return;

  let initialStickerDist = 0;
  let initialStickerAngle = 0;
  let baseStickerSize = 65;
  let baseStickerRotation = 0;

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
        showStickerControls(st);
        renderStrip();
        hitSticker = true;
        updateFloatingLoupe(touch.clientX, touch.clientY, c.x, c.y);
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
      renderStrip();
      updateFloatingLoupe(touch.clientX, touch.clientY, st.x, st.y);
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
    hideFloatingLoupe();
  }

  viewport.addEventListener('mousedown', handleStart); 
  window.addEventListener('mousemove', handleMove); 
  window.addEventListener('mouseup', handleEnd);
  viewport.addEventListener('touchstart', handleStart, { passive: false }); 
  window.addEventListener('touchmove', handleMove, { passive: false }); 
  window.addEventListener('touchend', handleEnd);
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
// 12. 4컷 비디오, 구글 드라이브 QR & PDF/공유
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
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>합성 중...</span>`;
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
      videoBitsPerSecond: 10000000 // 10Mbps 초고화질
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
        btn.innerHTML = `<i data-lucide="video" class="w-4 h-4"></i><span>4컷 비디오</span>`;
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

    const topH = 160; const bottomH = 280; const pad = 50; const gap = 24; 
    const slotW = vCanvas.width - (pad * 2); 
    const slotH = (vCanvas.height - topH - bottomH - (gap * 3)) / 4; 
    const customTitle = (document.getElementById('frameSignatureInput') && document.getElementById('frameSignatureInput').value) || '추억네컷';
    const startTime = performance.now(); 
    const totalDuration = 6000;

    function renderVideoLoop(time) {
      const elapsed = time - startTime; 
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

      if (appState.customPngOverlayImage) {
        vCtx.drawImage(appState.customPngOverlayImage, 0, 0, vCanvas.width, vCanvas.height);
      } else {
        drawTopHeaderTitle(vCtx, vCanvas.width - pad - 20, topH / 2, customTitle, false);
        drawBottomFooterTitle(vCtx, vCanvas.width / 2, (vCanvas.height - bottomH) + (bottomH / 2), customTitle, false, true);
      }

      if (elapsed < totalDuration) requestAnimationFrame(renderVideoLoop); 
      else recorder.stop();
    }
    requestAnimationFrame(renderVideoLoop);
  } catch (err) { 
    alert("비디오 생성 실패: " + err.message); 
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="video" class="w-4 h-4"></i><span>4컷 비디오</span>`; 
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

async function generateImageQRCode() {
  const btn = document.getElementById('btnSaveQR'); 
  if (btn) { 
    btn.disabled = true; 
    btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i><span>클라우드 저장 중</span>`; 
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
      btn.innerHTML = `<i data-lucide="qr-code" class="w-4 h-4"></i><span>QR 다운로드</span>`; 
    }
    if (window.lucide) lucide.createIcons();

    if (res && res.success && res.fileId) {
      const driveDirectUrl = `https://drive.google.com/file/d/${res.fileId}/view?usp=sharing`;
      displayResultWithQR(driveDirectUrl);
    } else {
      alert("구글 드라이브 업로드 지연 중입니다. 로컬 공유하기로 다운로드해주세요!");
    }
  } catch (err) {
    if (btn) { 
      btn.disabled = false; 
      btn.innerHTML = `<i data-lucide="qr-code" class="w-4 h-4"></i><span>QR 다운로드</span>`; 
    }
    if (window.lucide) lucide.createIcons();
    alert("구글 드라이브 통신 중 오류가 발생했습니다: " + err.message);
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
  new QRCode(qrBox, { text: url, width: 140, height: 140, correctLevel: QRCode.CorrectLevel.M });
  showScreen('screenResult'); 
  startAutoReset();
}

function returnToEditor() { 
  if (appState.resetInterval) { clearInterval(appState.resetInterval); appState.resetInterval = null; } 
  showScreen('screenEdit'); 
  renderStrip(); 
}

// ========================================================
// 13. 🌟 이용후기(Board) & 고객소리함(Inquiry) 복구
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

// 🌟 고객소리함 모달 제어
function openCustomerBotModal() {
  const m = document.getElementById('customerBotModal');
  if (m) {
    m.classList.remove('hidden');
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

// ========================================================
// 14. 화면 전환 & 세션 복구 안전망
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
  else if (id === 'screenHome') { checkPreviousSession(); renderMainNotices(); }
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
  appState.customPngOverlayImage = null;
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

// ========================================================
// 15. 에디터 세부 설정 & Undo/Redo
// ========================================================
function changeLayout(mode, btn) {
  saveStateForUndo(); 
  appState.layout = mode;
  document.querySelectorAll('.layout-btn').forEach(b => { 
    b.className = "layout-btn bg-slate-100 text-slate-700 font-bold py-2 rounded-xl text-xs"; 
  });
  if (btn) btn.className = "layout-btn bg-theme text-white font-bold py-2 rounded-xl text-xs";
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
    const p = FILTER_PRESETS[filterKey] || FILTER_PRESETS.normal; 
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
function onFontSizeChange(size) { appState.typography.fontSize = Math.round(parseInt(size) * 1.5); renderStrip(); }
function toggleShowDate(checked) { saveStateForUndo(); appState.showDate = checked; renderStrip(); }

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
// 16. 관리자 설정 센터 & 텔레메트리
// ========================================================
function promptAdminMode() {
  const pw = prompt("관리자 비밀번호를 입력하세요");
  if (pw === "0724" || pw === "1234") {
    appState.isAdmin = true;
    openAdminDashboard();
  } else if (pw !== null) {
    alert("비밀번호가 올바르지 않습니다.");
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
  const content = prompt("새 공지사항 내용을 입력하세요:");
  if (!content || !content.trim()) return;

  const newNotice = { 
    id: Date.now().toString(), 
    date: getFormattedTodayDate(), 
    version: 'v16.0 Pro', 
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
      id: 'v16_0', 
      date: getFormattedTodayDate(), 
      version: 'v16.0 Pro', 
      content: '구도 대기실, 3대 테마 분류 & 스튜디오 에디터 안정화 완료!' 
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
      <span class="bg-theme text-white text-[9px] font-black px-1.5 py-0.5 rounded shrink-0">v16.0 Pro</span>
      <p class="text-[11px] font-bold text-slate-800 truncate ml-2">구도 대기실 & 3대 테마 시스템 적용 완료!</p>
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
    location: "South Korea Suwon",
    referrer: document.referrer || "직접 접속"
  };
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

function pushRecentSticker(type, text) {
  appState.recentStickers = appState.recentStickers.filter(item => item.text !== text);
  appState.recentStickers.unshift({ type, text });
  if (appState.recentStickers.length > 5) appState.recentStickers.pop();
  renderRecentStickers();
}

function renderRecentStickers() {
  const listEl = document.getElementById('recentStickersList');
  if (!listEl) return;
  listEl.innerHTML = `<span class="text-[10px] text-slate-300 italic">없음</span>`;
}

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
    '추억네컷', 'BEST', 'LOVE', 'YOUTH', 'HAPPY', 'VIBE', 'OUR DAY', 'CHILL', 'SMILE', 'FOREVER',
    '인생네컷', '오늘의 우리', '완벽한 하루', '행복만땅', '심쿵주의', '찐친바이브', '영원한 청춘', 'LUCKY DAY', 'MEMORIES', 'SO CUTE'
  ];
  const textStickerGrid = document.getElementById('textStickerGrid');
  if (textStickerGrid) {
    textStickerGrid.innerHTML = texts.map(t => `<button onclick="addTextSticker('${t}')" class="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-[11px] rounded border border-slate-300 shrink-0 cursor-pointer active:scale-95 transition">${t}</button>`).join('');
  }

  // 1. 기본 테마 컬러 팔레트
  const basicColorGrid = document.getElementById('frameColorGridBasic');
  if (basicColorGrid) {
    basicColorGrid.innerHTML = PALETTE_COLORS.map(c => `
      <button onclick="changeFrameColor('${c}', this)" class="color-btn w-5 h-5 rounded-full border border-slate-200 shadow-2xs shrink-0" style="background-color:${c};"></button>
    `).join('') + `<label class="w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center cursor-pointer shadow-2xs shrink-0 relative overflow-hidden"><i data-lucide="pipette" class="w-3 h-3 text-rose-600"></i><input type="color" value="#000000" onchange="changeFrameColor(this.value, null)" class="opacity-0 absolute inset-0 cursor-pointer"></label>`;
  }

  // 2. 심플 테마 어반 컬러 팔레트
  const simpleColorGrid = document.getElementById('frameColorGridSimple');
  if (simpleColorGrid) {
    simpleColorGrid.innerHTML = SIMPLE_PALETTE.map(c => `
      <button onclick="changeFrameColor('${c}', this)" class="color-btn w-5 h-5 rounded-full border border-slate-200 shadow-2xs shrink-0" style="background-color:${c};"></button>
    `).join('');
  }

  // 3. 프리미엄 테마 프레임 색상 팔레트 (포토이즘 색상 개방)
  const premiumColorGrid = document.getElementById('frameColorGridPremium');
  if (premiumColorGrid) {
    premiumColorGrid.innerHTML = ['#000000', '#18181B', '#FFFFFF', '#FECDD3', '#BAE6FD', '#EDE9FE'].map(c => `
      <button onclick="changeFrameColor('${c}', this)" class="color-btn w-5 h-5 rounded-full border border-slate-300 shadow-2xs shrink-0" style="background-color:${c};"></button>
    `).join('') + `<input type="color" value="#000000" onchange="changeFrameColor(this.value, null)" class="w-5 h-5 rounded-full cursor-pointer p-0 border border-slate-300">`;
  }

  renderRecentStickers();

  setTimeout(() => {
    const firstColor = document.querySelector('.color-btn');
    if (firstColor) changeFrameColor('#000000', firstColor);
    const firstFont = document.querySelector('.font-btn');
    if (firstFont) setFontFamily('Pretendard', firstFont);
    if (window.lucide) lucide.createIcons();
  }, 40);
}

function shareWebAppUrl() {
  const shareUrl = window.location.href.split('?')[0];
  if (navigator.share && navigator.canShare && navigator.canShare({ url: shareUrl })) {
    navigator.share({ title: '추억의 네컷', url: shareUrl }).catch(() => {});
  } else {
    navigator.clipboard.writeText(shareUrl).then(() => alert("링크가 복사되었습니다! 📋")).catch(() => {});
  }
}

// ========================================================
// 17. 앱 초기 구동 엔트리포인트
// ========================================================
window.addEventListener('DOMContentLoaded', () => {
  ['screenLiveShoot', 'screenPick', 'screenEdit', 'screenBoard', 'screenResult', 'videoResultModal', 'galleryCollectModal', 'adminDashboardModal', 'customerBotModal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.style.setProperty('display', 'none', 'important');
    }
  });

  const home = document.getElementById('screenHome');
  if (home) {
    home.classList.remove('hidden');
    home.style.setProperty('display', 'flex', 'important');
  }

  // 버전 표시 텍스트 갱신
  const badge = document.getElementById('appVersionBadge');
  if (badge) badge.textContent = APP_VERSION;

  loadSavedTheme();
  initDynamicUI();
  initCanvasInteractions();
  setupCanvasPinchZoom();
  checkPreviousSession();
  renderMainNotices();
  fetchCloudBoardPosts();

  try { if (window.lucide) lucide.createIcons(); } catch (e) {}
});
