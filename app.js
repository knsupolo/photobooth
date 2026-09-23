/**
 * 추억의 네컷 Studio Pro v16.0 - 안정화 통합본
 */

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
  isAdmin: false,
  stream: null,
  facingMode: 'user',
  timerSec: 6,
  currentCount: 6,
  countdownTimer: null,
  selectedFormat: 'strip',
  viewfinderRatio: 'full',
  currentShotIndex: 0,
  shotImages: [],
  selectedImages: [],
  selectedIndices: [null, null, null, null],
  activeSlotIndex: 0,
  shotVideoBlobs: [],
  currentMediaRecorder: null,
  currentShotVideoChunks: [],
  themeCategory: 'basic',
  frameStyle: 'middle',
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
  dragStartPos: { x: 0, y: 0 }
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
    else if (type === 'shutter') navigator.vibrate([40, 30, 80]);
  } catch (e) {}
}

// 🌟 모든 형태의 버튼 호출을 100% 수용하는 단일 진입점
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
  const progressBadge = document.getElementById('liveProgressBadge');
  if (progressBadge) progressBadge.textContent = "구도 대기실";

  // 화면 즉시 전환
  showScreen('screenLiveShoot');

  const waitCtrl = document.getElementById('waitingRoomControls');
  const shootLayer = document.getElementById('activeShootingLayer');
  const bottomBar = document.getElementById('shootingBottomBar');
  if (waitCtrl) waitCtrl.classList.remove('hidden');
  if (shootLayer) shootLayer.classList.add('hidden');
  if (bottomBar) bottomBar.classList.add('hidden');

  startCameraStream();
}

// 전역 별칭 매핑
window.enterWaitingRoom = startSession;
window.requestSessionWithFormat = startSession;
window.startSessionWithFormat = startSession;
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
    alert("브라우저의 카메라 권한이 차단되었거나 HTTPS 환경이 아닙니다.\n앨범 사진 선택 모드로 이동합니다.");
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
    alert("카메라 장치를 켤 수 없습니다. 앨범에서 사진을 선택해 주세요!");
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

function renderPickScreen() {
  showScreen('screenPick');
  appState.selectedIndices = [null, null, null, null]; 
  appState.activeSlotIndex = 0; 
  currentCarouselIdx = 0;

  buildPickMiniPreviewStructure();
  switchThemeCategory(appState.themeCategory || 'basic');
  renderPickColorChips();
  setupCarouselViewer();
  setupSlotDragAndDrop();
  updateCarouselView();
}

function buildPickMiniPreviewStructure() {
  const container = document.getElementById('pickMiniFramePreview');
  if (!container) return;
  const isGrid = (appState.selectedFormat === 'grid');
  
  if (isGrid) {
    container.className = "w-48 sm:w-52 aspect-[2/3] bg-black p-2.5 shadow-2xl flex flex-col justify-between border border-slate-300 rounded-md transition-all";
    container.innerHTML = `
      <div id="pickPreviewHeader" class="text-center text-white text-[10px] font-black font-serif py-0.5">추억네컷</div>
      <div class="grid grid-cols-2 gap-1.5 flex-1 my-1">
        <div onclick="selectSlotForAssignment(0)" data-slot="0" id="previewSlot0" class="drop-slot aspect-[4/5] bg-slate-900 border-2 border-theme ring-2 ring-rose-400 flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative rounded">1번 슬롯</div>
        <div onclick="selectSlotForAssignment(1)" data-slot="1" id="previewSlot1" class="drop-slot aspect-[4/5] bg-slate-900 border-2 border-transparent flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative rounded">2번 슬롯</div>
        <div onclick="selectSlotForAssignment(2)" data-slot="2" id="previewSlot2" class="drop-slot aspect-[4/5] bg-slate-900 border-2 border-transparent flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative rounded">3번 슬롯</div>
        <div onclick="selectSlotForAssignment(3)" data-slot="3" id="previewSlot3" class="drop-slot aspect-[4/5] bg-slate-900 border-2 border-transparent flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative rounded">4번 슬롯</div>
      </div>
      <div id="pickPreviewMiddleBanner" class="hidden text-center text-white text-[9px] font-black py-0.5 bg-white/10 rounded my-0.5">추억네컷</div>
      <div id="pickPreviewFooter" class="hidden text-center text-white text-[10px] font-black font-serif pt-1 border-t border-white/20">추억네컷</div>
    `;
  } else {
    container.className = "w-40 sm:w-44 bg-black p-2 shadow-2xl flex flex-col space-y-1 border border-slate-300 rounded-md transition-all";
    container.innerHTML = `
      <div id="pickPreviewHeader" class="text-center text-white text-[10px] font-black font-serif py-0.5 border-b border-white/20">추억네컷</div>
      <div onclick="selectSlotForAssignment(0)" data-slot="0" id="previewSlot0" class="drop-slot aspect-[3/2] bg-slate-900 border-2 border-theme ring-2 ring-rose-400 flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative rounded">1번 슬롯</div>
      <div onclick="selectSlotForAssignment(1)" data-slot="1" id="previewSlot1" class="drop-slot aspect-[3/2] bg-slate-900 border-2 border-transparent flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative rounded">2번 슬롯</div>
      <div id="pickPreviewMiddleBanner" class="hidden text-center text-white text-[9px] font-black py-0.5 bg-white/10 rounded">추억네컷</div>
      <div onclick="selectSlotForAssignment(2)" data-slot="2" id="previewSlot2" class="drop-slot aspect-[3/2] bg-slate-900 border-2 border-transparent flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative rounded">3번 슬롯</div>
      <div onclick="selectSlotForAssignment(3)" data-slot="3" id="previewSlot3" class="drop-slot aspect-[3/2] bg-slate-900 border-2 border-transparent flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative rounded">4번 슬롯</div>
      <div id="pickPreviewFooter" class="hidden text-center text-white text-[10px] font-black font-serif pt-1 border-t border-white/20">추억네컷</div>
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

  if (imgEl) imgEl.src = appState.shotImages[currentCarouselIdx].src;
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
  if (btn) btn.textContent = chosenCount === 4 ? "스튜디오 꾸미기 (완료!)" : `스튜디오 꾸미기 (${chosenCount}/4)`;
}

function confirmSelectedFour() {
  const missing = appState.selectedIndices.filter(idx => idx === null).length;
  if (missing > 0) { 
    alert(`4장의 사진을 모두 채워주세요!\n(아직 ${missing}개 슬롯이 비어 있습니다)`); 
    return; 
  }
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

function switchThemeCategory(category) {
  appState.themeCategory = category;
  
  ['Basic', 'Simple', 'Premium'].forEach(cat => {
    const tab = document.getElementById('tabTheme' + cat);
    const panel = document.getElementById('themeSubPanel' + cat);
    const isTarget = (cat.toLowerCase() === category);
    if (tab) {
      if (isTarget) tab.className = "flex-1 py-1.5 rounded-lg bg-white text-theme shadow-2xs font-black";
      else tab.className = "flex-1 py-1.5 rounded-lg text-slate-500 font-bold";
    }
    if (panel) {
      if (isTarget) panel.classList.remove('hidden');
      else panel.classList.add('hidden');
    }
  });

  if (category === 'basic') setBasicTextPosition('middle');
  else if (category === 'simple') setSimpleSubTheme('classicmono');
  else if (category === 'premium') setPremiumSubTheme('photoism');
}

function setBasicTextPosition(pos) {
  appState.customPngOverlayImage = null;
  appState.frameStyle = pos;
  updatePreviewHeaderFooter(pos);
  renderStrip();
}

function setSimpleSubTheme(styleKey) {
  appState.customPngOverlayImage = null;
  appState.frameStyle = styleKey;
  updatePreviewHeaderFooter(styleKey);
  renderStrip();
}

function setPremiumSubTheme(styleKey) {
  appState.customPngOverlayImage = null;
  appState.frameStyle = styleKey;
  updatePreviewHeaderFooter(styleKey);
  renderStrip();
}

function updatePreviewHeaderFooter(styleKey) {
  const miniFrame = document.getElementById('pickMiniFramePreview');
  const headerEl = document.getElementById('pickPreviewHeader');
  const midEl = document.getElementById('pickPreviewMiddleBanner');
  const footerEl = document.getElementById('pickPreviewFooter');

  if (miniFrame) miniFrame.style.backgroundColor = appState.frameColor;
  if (headerEl) headerEl.classList.add('hidden');
  if (midEl) midEl.classList.add('hidden');
  if (footerEl) footerEl.classList.add('hidden');

  if (styleKey === 'middle') {
    if (midEl) { midEl.classList.remove('hidden'); midEl.textContent = "추억네컷"; }
  } else if (styleKey === 'top' || styleKey === 'simple') {
    if (headerEl) { headerEl.classList.remove('hidden'); headerEl.textContent = "추억네컷"; }
  } else if (styleKey === 'bottom' || styleKey === 'classicmono') {
    if (footerEl) { footerEl.classList.remove('hidden'); footerEl.textContent = "추억네컷"; }
  } else if (styleKey === 'photoism') {
    if (miniFrame) miniFrame.style.backgroundColor = '#0A0A0A';
    if (headerEl) { headerEl.classList.remove('hidden'); headerEl.textContent = "photoism"; }
    if (footerEl) { footerEl.classList.remove('hidden'); footerEl.textContent = "52 PHOTOISM"; }
  } else if (styleKey === 'y2k') {
    if (miniFrame) miniFrame.style.backgroundColor = '#18181B';
    if (headerEl) { headerEl.classList.remove('hidden'); headerEl.textContent = "🛸 Y2K VIBE"; }
  }
}

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

// 🌟 화면 전환 관리 및 강제 display 속성 보정
function showScreen(id) {
  const screenIds = ['screenHome', 'screenBoard', 'screenLiveShoot', 'screenPick', 'screenEdit', 'screenResult'];
  screenIds.forEach(s => {
    const el = document.getElementById(s);
    if (el) { 
      if (s === id) { 
        el.classList.remove('hidden'); 
        el.style.setProperty('display', 'flex', 'important'); 
      } else { 
        el.classList.add('hidden'); 
        el.style.setProperty('display', 'none', 'important'); 
      } 
    }
  });
  try { if (window.lucide) lucide.createIcons(); } catch (e) {}
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

// ========================================================
// 초기 구동 엔트리포인트
// ========================================================
window.addEventListener('DOMContentLoaded', () => {
  // 모달 및 서브 화면 인라인 숨김 보장
  ['screenLiveShoot', 'screenPick', 'screenEdit', 'screenResult', 'videoResultModal', 'galleryCollectModal', 'adminDashboardModal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.setProperty('display', 'none', 'important');
  });

  const home = document.getElementById('screenHome');
  if (home) home.style.setProperty('display', 'flex', 'important');

  loadSavedTheme();
  initDynamicUI();
  initCanvasInteractions();
  setupCanvasPinchZoom();
  checkPreviousSession();
  renderMainNotices();

  try { if (window.lucide) lucide.createIcons(); } catch (e) {}
});

function loadSavedTheme() {
  const saved = localStorage.getItem('chueok_ui_theme') || 'rose';
  const t = APP_THEMES[saved] || APP_THEMES.rose;
  document.documentElement.style.setProperty('--theme-color', t.color);
  document.documentElement.style.setProperty('--theme-primary', t.color);
  document.documentElement.style.setProperty('--theme-primary-hover', t.hover);
  document.documentElement.style.setProperty('--theme-color-hover', t.hover);
  document.documentElement.style.setProperty('--theme-color-light', t.light);
}

function initDynamicUI() {
  renderPickColorChips();
  renderRecentStickers();
}

function renderPickColorChips() {
  const container = document.getElementById('pickColorChipBar');
  if (!container) return;
  container.innerHTML = PALETTE_COLORS.slice(0, 8).map(c => `
    <button onclick="changeFrameColor('${c}', null)" class="w-5 h-5 rounded-full border-2 ${appState.frameColor === c ? 'border-theme scale-110 shadow' : 'border-white'} shrink-0 shadow-2xs" style="background-color:${c};"></button>
  `).join('');
}

function renderRecentStickers() {
  const listEl = document.getElementById('recentStickersList');
  if (!listEl) return;
  listEl.innerHTML = `<span class="text-[10px] text-slate-300 italic">없음</span>`;
}

function setTimerSec(sec, btn) { 
  appState.timerSec = sec; 
  document.querySelectorAll('.timer-chip').forEach(b => { 
    b.className = "timer-chip bg-white border border-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[10px]"; 
  }); 
  if (btn) btn.className = "timer-chip bg-theme text-white font-bold px-1.5 py-0.5 rounded text-[10px] shadow-xs"; 
}

function checkPreviousSession() {
  const banner = document.getElementById('sessionRestoreBanner');
  if (!banner) return;
  const saved = sessionStorage.getItem('chueok_active_session');
  if (saved) banner.classList.remove('hidden');
  else banner.classList.add('hidden');
}

function renderMainNotices() {
  const container = document.getElementById('noticeListContainer');
  const area = document.getElementById('mainNoticeArea');
  if (!container || !area) return;
  area.classList.remove('hidden');
  container.innerHTML = `
    <div class="bg-white/95 border border-rose-100 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-left">
      <span class="bg-theme text-white text-[9px] font-black px-1.5 py-0.5 rounded shrink-0">v16.0</span>
      <p class="text-[11px] font-bold text-slate-800 truncate ml-2">구도 대기실, 투명 PNG 프레임 & 구글 드라이브 직결 QR 적용 완료!</p>
    </div>
  `;
}
