// ========================================================
// [Photoist Pro v1.0] app.js (1편 / 전반부)
// ========================================================
// 1. 핵심 전역 상수 및 통합 상태 관리 (State Management)
// 2. 고성능 사운드 신디사이저 엔진 (Web Audio API)
// 3. 화면 전환 라우터 & 자이로 방향 감지 엔진 (Gyro Sensor)
// 4. 메인 홈 화면 제어 & 모드/간격 선택 (Home Controller)
// 5. 풀스크린 카메라 스트리밍 & 보존형 전환 엔진 (Camera Pipeline)
// 6. 6컷 고정 연속 촬영 & 15Mbps 비디오 클립 캡처 (Capture Engine)
// 7. 좌측 실제 프레임 슬롯 빌더 (4컷/5컷/6컷 가변 레이아웃)
// 8. 우측 대형 사진 뷰어, 스와이프 & 1:1 슬롯 배치 UX
// 9. 에디터 스튜디오 진입 검증 및 [사진 다시 선택] / [홈으로] 라우팅
// 10. 에디터 스플릿 터치 리사이저 (Split Resizer)
// ========================================================

// ========================================================
// 1. 핵심 전역 상수 및 통합 상태 관리
// ========================================================
const GOOGLE_DB_URL = "https://script.google.com/macros/s/AKfycbw1fjoUYoKQOHNNatPY_8q8X-1ogUV7iaFsIMpYioStlVX1SZK9hYiY32P-bGv7GUVoBw/exec";
const APP_NAME = "photoist Pro";
const APP_VERSION = "v1.0";

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
  "✌️ 볼 옆에 브이하고 상큼하게 윙크!",
  "🫶 양손으로 볼하트 만들기!",
  "🤫 쉿! 손가락을 입술에 대고 비밀스러운 표정",
  "🐱 머리 위에 손을 얹어 고양이 귀 만들기",
  "😎 선글라스를 살짝 내리며 힙한 눈빛 발사",
  "🌸 두 손으로 턱을 받치고 꽃받침 포즈!"
];

const appState = {
  // 1) 촬영 모드 & 레이아웃 규격
  shootingMode: 'strip',       // 'strip' (1x4 가로) | 'grid' (2x2 세로)
  selectedCutLayout: '1x4',    // '1x4' | '1x5' | '1x6' | '2x2' | '2x1x2' | '1x2x2' | '2x2x2'
  selectedCutCount: 4,         // 4 | 5 | 6
  timerSec: 6,                 // 4 | 6 | 8초 (기본 6초)
  
  // 2) 촬영 데이터
  shotImages: [],              // 6컷 원본 Image 객체 배열
  shotVideoBlobs: [],          // 6컷별 2.5초 녹화 Video Blob 배열
  selectedIndices: [null, null, null, null], // 슬롯별 매핑된 shotImages 인덱스
  selectedImages: [null, null, null, null],  // 슬롯별 실제 Image 객체
  activeSlotIndex: 0,          // 현재 선택 포커스된 슬롯 인덱스
  viewerPhotoIndex: 0,         // 우측 대형 뷰어에서 보고 있는 사진 인덱스 (0~5)
  
  // 3) 카메라 장치 제어
  facingMode: 'user',          // 'user' | 'environment'
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
    fontColor: '#FFFFFF',      // 프레임 명도에 따른 자동 반전
    isBold: true,
    date: getFormattedTodayDate()
  },
  activeFilter: 'normal',
  filters: { bright: 100, contrast: 100, saturate: 100 },
  
  // 6) 텍스트 스티커 관리 (이모티콘 팩 삭제, 텍스트 스티커 유지)
  stickers: [],
  selectedStickerIdx: -1,
  dragTarget: null,
  dragStartPos: { x: 0, y: 0 },
  slotRects: []
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

// ========================================================
// 2. 고성능 사운드 신디사이저 엔진 (Web Audio API)
// ========================================================
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
// 3. 화면 전환 라우터 & 자이로 방향 감지 엔진
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
  appState.selectedIndices = Array(appState.selectedCutCount).fill(null);
  appState.selectedImages = Array(appState.selectedCutCount).fill(null);
  appState.stickers = [];
  appState.selectedStickerIdx = -1;
  appState.activeSlotIndex = 0;
  appState.viewerPhotoIndex = 0;
  historyStack = [];
  redoStack = [];
}

// 🌟 자이로 방향 감지: 1x4 세로 파지 경고 / 2x2 가로 파지 경고
function checkGyroOrientation() {
  const captureScreen = document.getElementById('screenCapture');
  if (!captureScreen || captureScreen.classList.contains('hidden')) return;

  const overlay = document.getElementById('gyroOrientationWarning');
  if (!overlay) return;

  const isPortrait = window.innerHeight > window.innerWidth;
  const icon = document.getElementById('gyroIcon');
  const title = document.getElementById('gyroWarningTitle');
  const desc = document.getElementById('gyroWarningDesc');

  if (appState.shootingMode === 'strip') {
    // 1x4 가로 모드 ➔ 세로(Portrait) 상태일 때 경고 오버레이 호출
    if (isPortrait) {
      overlay.classList.remove('hidden');
      if (title) title.textContent = "기기를 가로로 회전해 주세요!";
      if (desc) desc.textContent = "1×4 모드는 가로 촬영 전용입니다. 기기를 가로로 돌리시면 촬영이 자동으로 이어집니다.";
      if (icon) icon.className = "w-10 h-10 rotate-90";
    } else {
      overlay.classList.add('hidden');
    }
  } else if (appState.shootingMode === 'grid') {
    // 2x2 세로 모드 ➔ 가로(Landscape) 상태일 때 경고 오버레이 호출
    if (!isPortrait) {
      overlay.classList.remove('hidden');
      if (title) title.textContent = "기기를 세로로 세워주세요!";
      if (desc) desc.textContent = "2×2 모드는 세로 촬영 전용입니다. 기기를 세로로 세워주시면 촬영이 자동으로 이어집니다.";
      if (icon) icon.className = "w-10 h-10";
    } else {
      overlay.classList.add('hidden');
    }
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
// 4. 메인 홈 화면 제어 & 모드/간격 선택
// ========================================================
function selectShootingMode(mode) {
  appState.shootingMode = mode;
  const btnText = document.getElementById('btnStartText');
  if (btnText) {
    btnText.textContent = (mode === 'strip') ? "1×4 가로 모드로 촬영 시작" : "2×2 세로 모드로 촬영 시작";
  }
  showToast(mode === 'strip' ? "1×4 가로 모드 선택됨" : "2×2 세로 모드 선택됨");
}

function selectInterval(sec, btn) {
  appState.timerSec = parseInt(sec, 10);
  document.querySelectorAll('.interval-chip').forEach(b => {
    b.className = "interval-chip flex-1 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 transition";
  });
  if (btn) {
    btn.className = "interval-chip flex-1 py-1.5 rounded-lg text-xs font-black bg-slate-900 text-white shadow-xs transition";
  }
}

function handleAlbumUpload(event) {
  const files = Array.from(event.target.files);
  if (!files || files.length === 0) return;

  appState.shotImages = [];
  appState.shotVideoBlobs = [];
  let loadedCount = 0;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        appState.shotImages.push(img);
        appState.shotVideoBlobs.push(null);
        loadedCount++;
        if (loadedCount === files.length) {
          proceedToPickScreen();
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ========================================================
// 5. 풀스크린 카메라 스트리밍 & 보존형 전환 엔진
// ========================================================
async function startCameraSession() {
  getAudioContext();
  showScreen('screenCapture');

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
      await videoEl.play();
    }

    checkGyroOrientation();

    // 0.8초 후 6컷 연속 카운트다운 자동 시작
    setTimeout(() => {
      startCountdownSequence();
    }, 800);

  } catch (err) {
    alert("카메라에 접근할 수 없습니다: " + err.message);
    showScreen('screenHome');
  }
}

function stopCameraAndAudio() {
  if (appState.mediaStream) {
    appState.mediaStream.getTracks().forEach(t => t.stop());
    appState.mediaStream = null;
  }
  const videoEl = document.getElementById('cameraVideo');
  if (videoEl) {
    videoEl.srcObject = null;
  }
}

// 🌟 촬영 중 카메라 전/후면 전환 시 회차 리셋 없이 스트림만 교체
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
      await videoEl.play();
    }
    showToast(`카메라 전환: ${appState.facingMode === 'user' ? '전면' : '후면'}`);
  } catch (err) {
    alert("카메라 전환 실패: " + err.message);
  }
}

// ========================================================
// 6. 6컷 고정 연속 촬영 & 15Mbps 비디오 클립 캡처
// ========================================================
let countdownTimer = null;
let currentShotNumber = 0;
const TOTAL_SHOT_COUNT = 6;

async function startCountdownSequence() {
  currentShotNumber = 0;
  appState.shotImages = [];
  appState.shotVideoBlobs = [];
  executeNextShotCycle();
}

function executeNextShotCycle() {
  if (currentShotNumber >= TOTAL_SHOT_COUNT) {
    playSuccessFanfare();
    stopCameraAndAudio();
    proceedToPickScreen();
    return;
  }

  currentShotNumber++;
  const badge = document.getElementById('captureCountBadge');
  if (badge) badge.textContent = `${currentShotNumber} / ${TOTAL_SHOT_COUNT}`;

  const poseBadge = document.getElementById('poseRecommendBadge');
  if (poseBadge) {
    poseBadge.textContent = POSE_SUGGESTIONS[(currentShotNumber - 1) % POSE_SUGGESTIONS.length];
  }

  let sec = appState.timerSec;
  const countBox = document.getElementById('countdownBox');
  const countText = document.getElementById('countdownText');
  if (countBox) countBox.classList.remove('hidden');
  if (countText) countText.textContent = sec;

  playBeepSound(false);

  // 15Mbps 무빙 비디오 합성을 위해 셔터 직전 2.5초 영상 녹화 시작
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
      videoBitsPerSecond: 15000000 // 15Mbps 초고화질 무손실
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

  const img = new Image();
  img.src = capCanvas.toDataURL('image/jpeg', 0.95);
  img.onload = () => {
    appState.shotImages.push(img);
    setTimeout(executeNextShotCycle, 800);
  };
}

// ========================================================
// 7. 좌측 실제 프레임 슬롯 빌더 (4컷/5컷/6컷 가변 레이아웃)
// ========================================================
function proceedToPickScreen() {
  showScreen('screenPick');
  
  // 모드별 기본 레이아웃 지정
  if (appState.shootingMode === 'strip') {
    selectCutLayout('1x4', 4);
  } else {
    selectCutLayout('2x2', 4);
  }
  
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

  const mode = appState.shootingMode;
  let options = [];

  if (mode === 'strip') {
    options = [
      { layout: '1x4', count: 4, label: '4장 (1×4)' },
      { layout: '1x5', count: 5, label: '5장 (1×5)' },
      { layout: '1x6', count: 6, label: '6장 (1×6)' }
    ];
  } else {
    options = [
      { layout: '2x2', count: 4, label: '4장 (2×2)' },
      { layout: '2x1x2', count: 5, label: '5장 (2×1×2)' },
      { layout: '1x2x2', count: 5, label: '5장 (1×2×2)' },
      { layout: '2x2x2', count: 6, label: '6장 (2×2×2)' }
    ];
  }

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
    };
    tabsContainer.appendChild(btn);
  });
}

function selectCutLayout(layoutKey, count) {
  appState.selectedCutLayout = layoutKey;
  appState.selectedCutCount = count;
  appState.selectedIndices = Array(count).fill(null);
  appState.selectedImages = Array(count).fill(null);
  appState.activeSlotIndex = 0;
}

// 🌟 좌측 실제 프레임 슬롯 동적 렌더링
function renderRealFrameSlots() {
  const container = document.getElementById('realFrameSlotContainer');
  if (!container) return;
  container.innerHTML = '';

  const layout = appState.selectedCutLayout;

  if (layout === '1x4' || layout === '1x5' || layout === '1x6') {
    // 1열 스트립 실제 프레임 (세로 긴 비율)
    const frameWrap = document.createElement('div');
    frameWrap.className = "w-full max-w-[170px] h-full flex flex-col gap-1.5 p-2 bg-white rounded-xl border-2 border-slate-300 shadow-md";
    for (let i = 0; i < appState.selectedCutCount; i++) {
      frameWrap.appendChild(createSlotBoxElement(i, "flex-1 w-full"));
    }
    container.appendChild(frameWrap);

  } else if (layout === '2x2') {
    // 2x2 쿼터 엽서형 실제 프레임
    const frameWrap = document.createElement('div');
    frameWrap.className = "w-full max-w-[280px] aspect-[2/3] grid grid-cols-2 gap-2 p-2.5 bg-white rounded-xl border-2 border-slate-300 shadow-md";
    for (let i = 0; i < 4; i++) {
      frameWrap.appendChild(createSlotBoxElement(i, "w-full h-full"));
    }
    container.appendChild(frameWrap);

  } else if (layout === '2x1x2') {
    // 5장 화보형 (상2 - 중1대형와이드 - 하2)
    const frameWrap = document.createElement('div');
    frameWrap.className = "w-full max-w-[280px] aspect-[2/3] flex flex-col gap-1.5 p-2 bg-white rounded-xl border-2 border-slate-300 shadow-md";

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
    // 5장 역화보형 (상1대형와이드 - 중2 - 하2)
    const frameWrap = document.createElement('div');
    frameWrap.className = "w-full max-w-[280px] aspect-[2/3] flex flex-col gap-1.5 p-2 bg-white rounded-xl border-2 border-slate-300 shadow-md";

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
    // 6장 2x3 그리드
    const frameWrap = document.createElement('div');
    frameWrap.className = "w-full max-w-[280px] aspect-[2/3] grid grid-cols-2 grid-rows-3 gap-1.5 p-2.5 bg-white rounded-xl border-2 border-slate-300 shadow-md";
    for (let i = 0; i < 6; i++) {
      frameWrap.appendChild(createSlotBoxElement(i, "w-full h-full"));
    }
    container.appendChild(frameWrap);
  }
}

function createSlotBoxElement(slotIdx, customClasses) {
  const box = document.createElement('div');
  const isFilled = (appState.selectedImages[slotIdx] !== null);
  const isActive = (appState.activeSlotIndex === slotIdx);

  box.className = `slot-real-box ${customClasses} ${isFilled ? 'slot-filled' : ''} ${isActive ? 'slot-active' : ''}`;

  if (isFilled) {
    const img = document.createElement('img');
    img.src = appState.selectedImages[slotIdx].src;
    img.className = "w-full h-full object-cover pointer-events-none";
    box.appendChild(img);

    const badge = document.createElement('span');
    badge.className = "absolute bottom-1 left-1 bg-slate-900/80 text-white text-[9px] font-black px-1.5 py-0.5 rounded";
    badge.textContent = `${slotIdx + 1}`;
    box.appendChild(badge);

    // 슬롯 사진 비우기(X) 버튼
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

// ========================================================
// 8. 우측 대형 사진 뷰어, 스와이프 & 1:1 슬롯 배치 UX
// ========================================================
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

function assignCurrentViewerPhotoToActiveSlot() {
  if (appState.shotImages.length === 0) return;
  const shotIdx = appState.viewerPhotoIndex;
  const currentSlot = appState.activeSlotIndex;

  if (currentSlot === null || currentSlot >= appState.selectedCutCount) return;

  triggerHaptic('light');

  // 다른 슬롯에 이미 배치된 사진이면 이전 슬롯 비우기
  const prevSlot = appState.selectedIndices.indexOf(shotIdx);
  if (prevSlot !== -1 && prevSlot !== currentSlot) {
    appState.selectedIndices[prevSlot] = null;
    appState.selectedImages[prevSlot] = null;
  }

  appState.selectedIndices[currentSlot] = shotIdx;
  appState.selectedImages[currentSlot] = appState.shotImages[shotIdx];

  // 다음 빈 슬롯으로 자동 포커스 이동
  const nextEmptySlot = appState.selectedIndices.findIndex(idx => idx === null);
  if (nextEmptySlot !== -1) {
    appState.activeSlotIndex = nextEmptySlot;
  }

  renderRealFrameSlots();
  renderLargeViewer();
  renderThumbnailsStrip();
  updatePickProgressUI();
  if (window.lucide) lucide.createIcons();
}

function unassignPhotoFromSlot(slotIdx) {
  triggerHaptic('light');
  appState.selectedIndices[slotIdx] = null;
  appState.selectedImages[slotIdx] = null;
  appState.activeSlotIndex = slotIdx;

  renderRealFrameSlots();
  renderLargeViewer();
  renderThumbnailsStrip();
  updatePickProgressUI();
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

    thumb.className = `relative shrink-0 w-12 h-16 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
      isViewing ? 'border-rose-500 scale-105 shadow-md' : 'border-slate-200 hover:border-slate-400 opacity-80'
    }`;

    thumb.innerHTML = `
      <img src="${img.src}" class="w-full h-full object-cover">
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

// 🌟 터치 스와이프로 대형 뷰어 사진 넘기기
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
        navigateLargeViewer(-1); // 우측 스와이프: 이전 사진
      } else {
        navigateLargeViewer(1);  // 좌측 스와이프: 다음 사진
      }
    }
  }, { passive: true });
}

// ========================================================
// 9. 에디터 스튜디오 진입 검증 및 [사진 다시 선택] / [홈으로] 라우팅
// ========================================================
function proceedToEditor() {
  const hasEmptySlot = appState.selectedIndices.some(idx => idx === null);
  if (hasEmptySlot) {
    alert("모든 슬롯에 사진을 배치해 주세요!\n좌측 슬롯을 선택하고 우측 사진을 넣어주시면 됩니다.");
    return;
  }

  triggerHaptic('heavy');
  showScreen('screenEdit');
  initSplitResizer();

  if (typeof renderStrip === 'function') {
    renderStrip();
  }
}

function returnToPickScreen() {
  showScreen('screenPick');
  renderRealFrameSlots();
  renderLargeViewer();
  renderThumbnailsStrip();
  updatePickProgressUI();
}

// ========================================================
// 10. 에디터 스플릿 터치 리사이저
// ========================================================
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
// [1편 전반부 코드 끝]
// 아래로 3단계: app.js (2편 후반부) 코드가 바로 이어집니다.
// ========================================================
// ========================================================
// [Photoist Pro v1.0] app.js (2편 / 후반부)
// ========================================================
// 11. 테마 컨트롤러 & 프레임 스타일 제어 (기본 5종 단일화)
// 12. 감성 필터 및 화질 보정 엔진 (Pixel Filter Math)
// 13. 스마트 텍스트 스티커 관리 (추가/크기/회전/삭제)
// 14. 캔버스 뷰포트 인터랙션 & 무제한 핀치 줌 / 패닝 통합 제스처
// 15. 초고화질 캔버스 렌더링 엔진 (지그재그 & 자동 반전 & 비례 각인)
// 16. 15Mbps 초고화질 무빙 영상 엔진 (프레임 100% 동기화 합성)
// 17. 기기 다운로드 & 구글 클라우드 무소음 자동 백업 파이프라인
// 18. PIXX 스타일 프리미엄 모바일 다운로드 뷰어 엔진 (i18n & 토글 뷰)
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

// 🌟 프레임 색상 변경 및 명도 연산 기반 글자색 자동 반전
function changeFrameColor(color, btn) {
  saveStateForUndo();
  appState.frameColor = color;
  document.querySelectorAll('.color-btn').forEach(b => {
    b.classList.remove('ring-2', 'ring-slate-900', 'scale-110');
  });
  if (btn) btn.classList.add('ring-2', 'ring-slate-900', 'scale-110');

  // 명도 계산 (L = 0.299R + 0.587G + 0.114B)
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;

  // 밝은 프레임(L > 180)이면 딥 차콜(#0F172A), 어두우면 클린 화이트(#FFFFFF)로 자동 전환
  appState.typography.fontColor = (lum > 180) ? '#0F172A' : '#FFFFFF';

  // 캔버스 위의 텍스트 스티커 기본 색상도 프레임 명도에 맞춰 동기화
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
// 13. 스마트 텍스트 스티커 관리 (스티커 팩 삭제, 텍스트 유지)
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
  // 🌟 0.1배 ~ 5.0배 무제한 축소/확대 지원
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

      // 🌟 핀치 줌과 동시에 두 손가락 중심 좌표 이동(Pan)을 손 떼지 않고 부드럽게 통합
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
// 15. 초고화질 캔버스 렌더링 엔진 (지그재그 & 자동 반전 & 비례 각인)
// ========================================================
let finalEmbeddedQrImage = null;

function renderStrip(isFinalExport = false) {
  const canvas = document.getElementById('photoCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const mode = appState.shootingMode;
  const layout = appState.selectedCutLayout || '1x4';
  const cut = appState.selectedCutCount || 4;
  const fStyle = appState.frameStyle || 'basic_middle';
  const pad = (fStyle === 'basic_clean') ? Math.round(appState.frameThickness * 0.7) : (appState.frameThickness || 40);
  const gap = Math.round(pad * 0.45);
  const sigInp = document.getElementById('frameSignatureInput');
  const customTitle = sigInp ? sigInp.value : 'photoist';

  // 측면 각인 활성화 시 너비 확장 (45~75px)
  const sideOffset = appState.sideEngravingEnabled ? Math.max(45, Math.round(pad * 1.25)) : 0;

  // 1. 규격별 캔버스 해상도 결정
  if (mode === 'strip') {
    canvas.width = 1080 + sideOffset;
    if (cut === 4) canvas.height = 3240;
    else if (cut === 5) canvas.height = 3900;
    else if (cut === 6) canvas.height = 4500;
  } else {
    // 2x2 세로 모드 (2열 그리드)
    canvas.width = 1440 + sideOffset;
    canvas.height = 2160;
  }

  // 2. 프레임 배경 채우기
  ctx.fillStyle = appState.frameColor || '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  appState.slotRects = [];
  const baseCanvasW = canvas.width - sideOffset;

  // 3. 레이아웃별 슬롯 렌더링
  if (mode === 'strip') {
    renderStripDynamic(ctx, baseCanvasW, canvas.height, pad, gap, fStyle, customTitle, cut);
  } else {
    renderGridDynamic(ctx, baseCanvasW, canvas.height, pad, gap, fStyle, customTitle, cut, layout);
  }

  // 4. 측면 세로 각인 (테두리 두께 비례 자동 폰트 확대 & 1:1 슬롯 매칭)
  if (appState.sideEngravingEnabled) {
    renderProSideEngraving(ctx, canvas.width, canvas.height, sideOffset);
  }

  // 5. 텍스트 스티커 렌더링
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

    if (!isFinalExport && idx === appState.selectedStickerIdx) {
      ctx.strokeStyle = '#F43F5E';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      const boundW = st.size * 1.1;
      ctx.strokeRect(-boundW, -st.size * 0.6, boundW * 2, st.size * 1.2);
    }
    ctx.restore();
  });

  // 6. 무빙 영상 다운로드 QR이 생성되었을 때 우측 하단 자동 인셋
  if (finalEmbeddedQrImage) {
    drawQrInsetBox(ctx, canvas.width, canvas.height, pad);
  }
}

// 🌟 1줄 스트립 동적 렌더러 (지그재그 Zig-Zag 완벽 지원)
function renderStripDynamic(ctx, cW, cH, pad, gap, fStyle, title, cut) {
  const isZigzag = (fStyle === 'basic_zigzag');
  const isMiddle = (fStyle === 'basic_middle');
  const bannerH = isMiddle ? 180 : 0;
  const topH = (fStyle === 'basic_top') ? 140 : pad;
  const bottomH = (fStyle === 'basic_bottom') ? 220 : pad;

  const totalGaps = (cut - 1) * gap;
  const slotH = (cH - topH - bottomH - bannerH - totalGaps) / cut;

  if (fStyle === 'basic_top') {
    drawProHeader(ctx, cW / 2, topH / 2, title);
  }

  const zigzagShift = isZigzag ? Math.round(pad * 1.2) : 0;
  const slotW = cW - (pad * 2) - zigzagShift;

  for (let i = 0; i < cut; i++) {
    let sy = topH + (i * (slotH + gap));
    if (isMiddle && i >= Math.floor(cut / 2)) sy += bannerH;

    let sx = pad;
    if (isZigzag) {
      // 1번 좌측(0), 2번 우측(+shift), 3번 좌측, 4번 우측... 교차 배치
      sx = (i % 2 === 0) ? pad : pad + zigzagShift;
    }

    appState.slotRects.push({ x: sx, y: sy, w: slotW, h: slotH });
    drawFilteredSlotPhoto(ctx, appState.selectedImages[i], sx, sy, slotW, slotH);
  }

  if (isMiddle) {
    const bannerY = topH + (Math.floor(cut / 2) * (slotH + gap)) - (gap / 2);
    drawProBanner(ctx, cW / 2, bannerY + (bannerH / 2), title);
  } else if (fStyle === 'basic_bottom') {
    const footerY = (cH - bottomH) + (bottomH / 2);
    drawProFooter(ctx, cW / 2, footerY, title);
  }
}

// 🌟 2x2 세로 모드 동적 렌더러 (4컷 / 5컷 화보형 / 5컷 역화보형 / 6컷 2x3)
function renderGridDynamic(ctx, cW, cH, pad, gap, fStyle, title, cut, layout) {
  const topH = (fStyle === 'basic_top') ? 130 : pad;
  const bottomH = (fStyle === 'basic_bottom') ? 210 : pad;

  if (fStyle === 'basic_top') {
    drawProHeader(ctx, cW / 2, topH / 2, title);
  }

  if (layout === '2x2') {
    const isMiddle = (fStyle === 'basic_middle');
    const bannerH = isMiddle ? 160 : 0;
    const slotW = (cW - (pad * 2) - gap) / 2;
    const slotH = (cH - topH - bottomH - bannerH - gap) / 2;

    const coords = [
      { x: pad, y: topH },
      { x: pad + slotW + gap, y: topH },
      { x: pad, y: topH + slotH + gap + bannerH },
      { x: pad + slotW + gap, y: topH + slotH + gap + bannerH }
    ];

    for (let i = 0; i < 4; i++) {
      appState.slotRects.push({ x: coords[i].x, y: coords[i].y, w: slotW, h: slotH });
      drawFilteredSlotPhoto(ctx, appState.selectedImages[i], coords[i].x, coords[i].y, slotW, slotH);
    }

    if (isMiddle) {
      const bannerY = topH + slotH + (gap / 2);
      drawProBanner(ctx, cW / 2, bannerY + (bannerH / 2), title);
    }
  } else if (layout === '2x1x2') {
    // 5장 화보형 (상2 - 중1대형와이드 - 하2)
    const availH = cH - topH - bottomH - (gap * 2);
    const row1H = availH * 0.31;
    const row2H = availH * 0.38;
    const row3H = availH * 0.31;
    const smallW = (cW - (pad * 2) - gap) / 2;
    const heroW = cW - (pad * 2);

    appState.slotRects.push({ x: pad, y: topH, w: smallW, h: row1H });
    appState.slotRects.push({ x: pad + smallW + gap, y: topH, w: smallW, h: row1H });
    drawFilteredSlotPhoto(ctx, appState.selectedImages[0], pad, topH, smallW, row1H);
    drawFilteredSlotPhoto(ctx, appState.selectedImages[1], pad + smallW + gap, topH, smallW, row1H);

    const heroY = topH + row1H + gap;
    appState.slotRects.push({ x: pad, y: heroY, w: heroW, h: row2H });
    drawFilteredSlotPhoto(ctx, appState.selectedImages[2], pad, heroY, heroW, row2H);

    const row3Y = heroY + row2H + gap;
    appState.slotRects.push({ x: pad, y: row3Y, w: smallW, h: row3H });
    appState.slotRects.push({ x: pad + smallW + gap, y: row3Y, w: smallW, h: row3H });
    drawFilteredSlotPhoto(ctx, appState.selectedImages[3], pad, row3Y, smallW, row3H);
    drawFilteredSlotPhoto(ctx, appState.selectedImages[4], pad + smallW + gap, row3Y, smallW, row3H);
  } else if (layout === '1x2x2') {
    // 5장 역화보형 (상1대형와이드 - 중2 - 하2)
    const availH = cH - topH - bottomH - (gap * 2);
    const row1H = availH * 0.38;
    const row2H = availH * 0.31;
    const row3H = availH * 0.31;
    const smallW = (cW - (pad * 2) - gap) / 2;
    const heroW = cW - (pad * 2);

    appState.slotRects.push({ x: pad, y: topH, w: heroW, h: row1H });
    drawFilteredSlotPhoto(ctx, appState.selectedImages[0], pad, topH, heroW, row1H);

    const row2Y = topH + row1H + gap;
    appState.slotRects.push({ x: pad, y: row2Y, w: smallW, h: row2H });
    appState.slotRects.push({ x: pad + smallW + gap, y: row2Y, w: smallW, h: row2H });
    drawFilteredSlotPhoto(ctx, appState.selectedImages[1], pad, row2Y, smallW, row2H);
    drawFilteredSlotPhoto(ctx, appState.selectedImages[2], pad + smallW + gap, row2Y, smallW, row2H);

    const row3Y = row2Y + row2H + gap;
    appState.slotRects.push({ x: pad, y: row3Y, w: smallW, h: row3H });
    appState.slotRects.push({ x: pad + smallW + gap, y: row3Y, w: smallW, h: row3H });
    drawFilteredSlotPhoto(ctx, appState.selectedImages[3], pad, row3Y, smallW, row3H);
    drawFilteredSlotPhoto(ctx, appState.selectedImages[4], pad + smallW + gap, row3Y, smallW, row3H);
  } else if (layout === '2x2x2') {
    // 6장 2x3 그리드
    const slotW = (cW - (pad * 2) - gap) / 2;
    const slotH = (cH - topH - bottomH - (gap * 2)) / 3;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const idx = row * 2 + col;
        const sx = pad + col * (slotW + gap);
        const sy = topH + row * (slotH + gap);
        appState.slotRects.push({ x: sx, y: sy, w: slotW, h: slotH });
        drawFilteredSlotPhoto(ctx, appState.selectedImages[idx], sx, sy, slotW, slotH);
      }
    }
  }

  if (fStyle === 'basic_bottom') {
    const footerY = (cH - bottomH) + (bottomH / 2);
    drawProFooter(ctx, cW / 2, footerY, title);
  }
}

// 🌟 측면 세로 각인 (여백 두께 비례 자동 폰트 확대 & 슬롯별 1:1 매칭)
function renderProSideEngraving(ctx, canvasW, canvasH, sideOffset) {
  if (!appState.slotRects || appState.slotRects.length === 0) return;
  const textColor = appState.typography.fontColor || '#FFFFFF';
  const baseText = appState.sideEngravingText || "#PHOTOIST";

  // 테두리 두께에 비례하여 시원하게 확대 (16px ~ 32px)
  const fontScale = Math.max(16, Math.min(32, Math.round(sideOffset * 0.42)));

  ctx.save();
  ctx.fillStyle = textColor;
  ctx.font = `bold ${fontScale}px monospace`;
  ctx.letterSpacing = "3px";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  appState.slotRects.forEach((rect, sIdx) => {
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

function drawFilteredSlotPhoto(ctx, img, targetX, targetY, targetW, targetH) {
  if (!img) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(targetX, targetY, targetW, targetH);
  ctx.clip();

  const srcRatio = (img.width || 1920) / (img.height || 1080);
  const targetRatio = targetW / targetH;
  let renderW, renderH;

  if (srcRatio > targetRatio) {
    renderH = targetH;
    renderW = targetH * srcRatio;
  } else {
    renderW = targetW;
    renderH = targetW / srcRatio;
  }

  const drawX = targetX + (targetW - renderW) / 2;
  const drawY = targetY + (targetH - renderH) / 2;

  const isNormal = appState.activeFilter === 'normal' &&
    appState.filters.bright === 100 &&
    appState.filters.contrast === 100 &&
    appState.filters.saturate === 100;

  if (isNormal) {
    ctx.drawImage(img, drawX, drawY, renderW, renderH);
  } else {
    try {
      const off = document.createElement('canvas');
      const cw = Math.max(1, Math.round(renderW));
      const ch = Math.max(1, Math.round(renderH));
      off.width = cw;
      off.height = ch;
      const offCtx = off.getContext('2d');
      offCtx.drawImage(img, 0, 0, cw, ch);
      const imgData = offCtx.getImageData(0, 0, cw, ch);
      applyPixelFilterMath(imgData, appState.activeFilter, appState.filters);
      offCtx.putImageData(imgData, 0, 0);
      ctx.drawImage(off, drawX, drawY, renderW, renderH);
    } catch (e) {
      ctx.drawImage(img, drawX, drawY, renderW, renderH);
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
  ctx.fillText('무빙 영상 다운로드', qx + (qrBoxSize / 2), qy + qrBoxSize - 9);
  ctx.restore();
}

// ========================================================
// 16. 15Mbps 초고화질 무빙 영상 엔진 (프레임 100% 동기화 합성)
// ========================================================
let currentGeneratedVideoBlob = null;
let currentGeneratedVideoUrl = "";

async function generateMovingVideoWithQR() {
  const hasValidBlobs = appState.selectedIndices.every(idx => idx !== null && appState.shotVideoBlobs[idx]);
  if (!hasValidBlobs) {
    alert("촬영 영상 클립이 부족합니다.\n부스에서 직접 사진을 연속 촬영했을 때 무빙 영상 생성이 가능합니다.");
    return;
  }

  const btn = document.getElementById('btnAutoVideo');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>15Mbps 비디오 합성 중...</span>`;
    if (window.lucide) lucide.createIcons();
  }

  try {
    const videoElements = await Promise.all(appState.selectedIndices.map(shotIdx => {
      return new Promise((resolve) => {
        const blob = appState.shotVideoBlobs[shotIdx];
        const v = document.createElement('video');
        v.src = URL.createObjectURL(blob);
        v.muted = true;
        v.loop = true;
        v.setAttribute('playsinline', '');
        v.onloadedmetadata = () => {
          v.play().then(() => resolve(v)).catch(() => resolve(v));
        };
      });
    }));

    const vCanvas = document.createElement('canvas');
    if (appState.shootingMode === 'grid') {
      vCanvas.width = 1440;
      vCanvas.height = 2160;
    } else {
      vCanvas.width = 1080;
      vCanvas.height = 3240;
    }
    const vCtx = vCanvas.getContext('2d');

    let mimeType = 'video/mp4';
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9'))
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
    }

    const stream = vCanvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: mimeType,
      videoBitsPerSecond: 15000000 // 15Mbps 초고화질 무손실 보장
    });

    const chunks = [];
    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      currentGeneratedVideoBlob = new Blob(chunks, { type: mimeType });
      currentGeneratedVideoUrl = URL.createObjectURL(currentGeneratedVideoBlob);

      // 클라우드 무소음 백업 및 PIXX 뷰어 연동용 쿼리 URL 생성
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const uploadRes = await fetch(GOOGLE_DB_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              action: 'UPLOAD_MOVING_VIDEO',
              videoBase64: reader.result,
              userId: 'photoist_user',
              cutCount: appState.selectedCutCount
            })
          }).then(r => r.json());

          const directDownloadUrl = (uploadRes && uploadRes.success && uploadRes.downloadUrl)
            ? uploadRes.downloadUrl
            : `${window.location.href.split('?')[0]}?view=pixx&time=${Date.now()}`;

          // QR 생성 후 사진 캔버스 우측 하단 자동 인셋
          await cacheQrImageFromUrl(directDownloadUrl);
          renderStrip(false);

          // 생성 완료 후 PIXX 모바일 웹 뷰어 화면으로 즉시 전환
          openPixxViewer();

        } catch (uploadErr) {
          openPixxViewer();
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="video" class="w-4 h-4"></i><span>🎬 무빙 영상 생성 (프레임 100% 동기화)</span>`;
            if (window.lucide) lucide.createIcons();
          }
        }
      };
      reader.readAsDataURL(currentGeneratedVideoBlob);
    };

    recorder.start();

    // 🌟 실시간 프레임 100% 동기화 렌더링 루프
    const startTime = performance.now();
    const duration = 6500;
    const pad = Math.round(appState.frameThickness * 0.9);
    const gap = Math.round(pad * 0.45);
    const sigInp = document.getElementById('frameSignatureInput');
    const title = sigInp ? sigInp.value : 'photoist';
    const cut = appState.selectedCutCount;
    const layout = appState.selectedCutLayout;

    function renderVideoFrame(now) {
      const elapsed = now - startTime;
      vCtx.fillStyle = appState.frameColor || '#000000';
      vCtx.fillRect(0, 0, vCanvas.width, vCanvas.height);

      if (appState.shootingMode === 'grid') {
        const topH = 130;
        const bottomH = 200;
        const slotW = (vCanvas.width - (pad * 2) - gap) / 2;
        const slotH = (vCanvas.height - topH - bottomH - gap) / 2;
        const coords = [
          { x: pad, y: topH },
          { x: pad + slotW + gap, y: topH },
          { x: pad, y: topH + slotH + gap },
          { x: pad + slotW + gap, y: topH + slotH + gap }
        ];

        drawProHeader(vCtx, vCanvas.width / 2, topH / 2, title);
        for (let i = 0; i < Math.min(videoElements.length, 4); i++) {
          const v = videoElements[i];
          const coord = coords[i];
          vCtx.save();
          vCtx.beginPath();
          vCtx.rect(coord.x, coord.y, slotW, slotH);
          vCtx.clip();

          if (appState.facingMode === 'user') {
            vCtx.translate(coord.x + slotW, coord.y);
            vCtx.scale(-1, 1);
            vCtx.drawImage(v, 0, 0, slotW, slotH);
          } else {
            vCtx.drawImage(v, coord.x, coord.y, slotW, slotH);
          }
          vCtx.restore();
        }
        drawProFooter(vCtx, vCanvas.width / 2, (vCanvas.height - bottomH) + (bottomH / 2), title);
      } else {
        const topH = 130;
        const bottomH = 220;
        const slotW = vCanvas.width - (pad * 2);
        const slotH = (vCanvas.height - topH - bottomH - ((cut - 1) * gap)) / cut;

        drawProHeader(vCtx, vCanvas.width / 2, topH / 2, title);
        for (let i = 0; i < cut; i++) {
          const v = videoElements[i];
          const vy = topH + (i * (slotH + gap));
          vCtx.save();
          vCtx.beginPath();
          vCtx.rect(pad, vy, slotW, slotH);
          vCtx.clip();

          if (appState.facingMode === 'user') {
            vCtx.translate(pad + slotW, vy);
            vCtx.scale(-1, 1);
            vCtx.drawImage(v, 0, 0, slotW, slotH);
          } else {
            vCtx.drawImage(v, pad, vy, slotW, slotH);
          }
          vCtx.restore();
        }
        drawProFooter(vCtx, vCanvas.width / 2, (vCanvas.height - bottomH) + (bottomH / 2), title);
      }

      if (elapsed < duration) {
        requestAnimationFrame(renderVideoFrame);
      } else {
        recorder.stop();
      }
    }

    requestAnimationFrame(renderVideoFrame);
  } catch (err) {
    alert("무빙 영상 렌더링 중 오류: " + err.message);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="video" class="w-4 h-4"></i><span>🎬 무빙 영상 생성 (프레임 100% 동기화)</span>`;
      if (window.lucide) lucide.createIcons();
    }
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
    renderStrip(true);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const fileName = `[Photoist_Pro]_${Date.now()}.png`;

      // 1. 기기 즉시 로컬 다운로드
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast("📷 사진이 기기에 저장되었습니다.");

      // 2. 구글 클라우드 드라이브 무소음 백그라운드 백업
      if (GOOGLE_DB_URL) {
        try {
          fetch(GOOGLE_DB_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              action: 'SAVE_ARCHIVE',
              userId: 'photoist_user',
              date: getFormattedTodayDate(),
              archiveId: Date.now(),
              isFavorite: false
            })
          }).catch(() => {});
        } catch (e) {}
      }
    }, 'image/png');
  } else if (type === 'video') {
    if (!currentGeneratedVideoBlob) {
      // 영상이 아직 생성되지 않았다면 먼저 영상 생성 실행
      alert("무빙 영상을 먼저 생성해 주세요!");
      return;
    }

    const ext = currentGeneratedVideoBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const fileName = `[Photoist_Pro_무빙영상]_${Date.now()}.${ext}`;

    // 1. 기기 즉시 다운로드
    const url = URL.createObjectURL(currentGeneratedVideoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showToast("🎬 무빙 영상이 기기에 저장되었습니다.");
  }
}

// ========================================================
// 18. PIXX 스타일 프리미엄 모바일 다운로드 뷰어 엔진
// ========================================================
let isScreenShotActive = false; // false = video view, true = photo view
let currentPixxLang = "ko";

const pixxI18n = {
  ko: {
    timezone: '한국시간 기준 · KST',
    notice: '촬영 후 <strong>24시간</strong> 동안 다운로드하실 수 있습니다.',
    togglePhoto: '사진 보기',
    togglePhotoSub: '정지 사진으로 보기',
    toggleVideo: '영상 보기',
    toggleVideoSub: '움직이는 영상으로 보기',
    video: '무빙 영상',
    videoSub: '고화질 비디오 저장',
    photo: '촬영 사진',
    photoSub: '사진 파일 저장',
    thanks: 'Photoist Pro Studio를 이용해 주셔서 감사합니다.'
  },
  en: {
    timezone: 'Korea Standard Time · KST',
    notice: 'You can download it for <strong>24 hours</strong> after the shoot.',
    togglePhoto: 'Photo View',
    togglePhotoSub: 'View still photo',
    toggleVideo: 'Video View',
    toggleVideoSub: 'View moving video',
    video: 'Moving Video',
    videoSub: 'Save high-res video',
    photo: 'Photo Image',
    photoSub: 'Save photo file',
    thanks: 'Thank you for using Photoist Pro Studio.'
  },
  ja: {
    timezone: '韓国時間基準 · KST',
    notice: '撮影後 <strong>24時間</strong> ダウンロードできます。',
    togglePhoto: '写真を見る',
    togglePhotoSub: '写真表示に切り替え',
    toggleVideo: '動画を見る',
    toggleVideoSub: '動画表示に切り替え',
    video: 'ムービング動画',
    videoSub: '高画質動画を保存',
    photo: '撮影写真',
    photoSub: '写真を保存',
    thanks: 'Photoist Pro Studio をご利用いただきありがとうございます。'
  },
  zh: {
    timezone: '以韩国时间为准 · KST',
    notice: '拍摄后可在 <strong>24小时</strong> 内下载。',
    togglePhoto: '查看照片',
    togglePhotoSub: '切换为照片查看',
    toggleVideo: '查看视频',
    toggleVideoSub: '切换为视频查看',
    video: '动态视频',
    videoSub: '下载高清视频',
    photo: '拍摄照片',
    photoSub: '下载照片',
    thanks: '感谢您使用 Photoist Pro Studio。'
  },
  th: {
    timezone: 'อ้างอิงเวลาประเทศเกาหลี · KST',
    notice: 'สามารถดาวน์โหลดได้ภายใน <strong>24 ชั่วโมง</strong> หลังถ่ายภาพ',
    togglePhoto: 'ดูรูปภาพ',
    togglePhotoSub: 'สลับเป็นภาพนิ่ง',
    toggleVideo: 'ดูวิดีโอ',
    toggleVideoSub: 'สลับเป็นวิดีโอ',
    video: 'วิดีโอเคลื่อนไหว',
    videoSub: 'ดาวน์โหลดวิดีโอความชัดสูง',
    photo: 'รูปภาพถ่าย',
    photoSub: 'ดาวน์โหลดรูปภาพ',
    thanks: 'ขอบคุณที่ใช้ Photoist Pro Studio'
  }
};

function openPixxViewer() {
  showScreen('screenPixxViewer');

  const mainCanvas = document.getElementById('photoCanvas');
  const jpgView = document.getElementById('pixxJpgView');
  const movieView = document.getElementById('pixxMovieView');

  if (mainCanvas && jpgView) {
    jpgView.src = mainCanvas.toDataURL('image/jpeg', 0.95);
  }

  if (movieView && currentGeneratedVideoUrl) {
    movieView.src = currentGeneratedVideoUrl;
    movieView.load();
    movieView.play().catch(() => {});
    movieView.style.display = 'block';
  }
  if (jpgView) jpgView.style.display = 'none';
  isScreenShotActive = false;

  renderPixxLanguage();
}

function renderPixxLanguage() {
  const text = pixxI18n[currentPixxLang] || pixxI18n.ko;
  const timeEl = document.getElementById('pixxTimeDisplay');
  const tzEl = document.getElementById('pixxTimezoneText');
  const noticeEl = document.getElementById('pixxNoticeText');
  const vTitle = document.getElementById('pixxVideoTitle');
  const vSub = document.getElementById('pixxVideoSubtext');
  const pTitle = document.getElementById('pixxPhotoTitle');
  const pSub = document.getElementById('pixxPhotoSubtext');
  const thanksEl = document.getElementById('pixxThanksText');
  const langSel = document.getElementById('pixxLanguageSelect');

  if (timeEl) timeEl.textContent = formatPixxDateTime(new Date(), currentPixxLang);
  if (tzEl) tzEl.textContent = text.timezone;
  if (noticeEl) noticeEl.innerHTML = text.notice;
  if (vTitle) vTitle.textContent = text.video;
  if (vSub) vSub.textContent = text.videoSub;
  if (pTitle) pTitle.textContent = text.photo;
  if (pSub) pSub.textContent = text.photoSub;
  if (thanksEl) thanksEl.textContent = text.thanks;
  if (langSel) langSel.value = currentPixxLang;

  updatePixxToggleButtonText();
}

function updatePixxToggleButtonText() {
  const text = pixxI18n[currentPixxLang] || pixxI18n.ko;
  const btnTitle = document.getElementById('pixxToggleTitle');
  const btnSub = document.getElementById('pixxToggleSubtext');

  if (isScreenShotActive) {
    if (btnTitle) btnTitle.textContent = text.toggleVideo;
    if (btnSub) btnSub.textContent = text.toggleVideoSub;
  } else {
    if (btnTitle) btnTitle.textContent = text.togglePhoto;
    if (btnSub) btnSub.textContent = text.togglePhotoSub;
  }
}

function changePixxLanguage(lang) {
  currentPixxLang = lang || 'ko';
  renderPixxLanguage();
}

function togglePixxMediaView() {
  const video = document.getElementById('pixxMovieView');
  const jpgView = document.getElementById('pixxJpgView');

  if (isScreenShotActive) {
    if (video) { video.play(); video.style.display = 'block'; }
    if (jpgView) jpgView.style.display = 'none';
    isScreenShotActive = false;
  } else {
    if (video) { video.pause(); video.style.display = 'none'; }
    if (jpgView) jpgView.style.display = 'block';
    isScreenShotActive = true;
  }
  updatePixxToggleButtonText();
}

function downloadPixxMedia(type) {
  if (type === 'video') {
    if (currentGeneratedVideoBlob) {
      const ext = currentGeneratedVideoBlob.type.includes('mp4') ? 'mp4' : 'webm';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(currentGeneratedVideoBlob);
      a.download = `PIXX_Photoist_${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert("다운로드 가능한 비디오 파일이 없습니다.");
    }
  } else if (type === 'photo') {
    const jpgView = document.getElementById('pixxJpgView');
    const mainCanvas = document.getElementById('photoCanvas');
    const imgSrc = (jpgView && jpgView.src) ? jpgView.src : (mainCanvas ? mainCanvas.toDataURL('image/jpeg', 0.95) : '');

    if (imgSrc) {
      const a = document.createElement('a');
      a.href = imgSrc;
      a.download = `PIXX_Photoist_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert("다운로드 가능한 사진 파일이 없습니다.");
    }
  }
}

function formatPixxDateTime(d, lang) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');

  if (lang === 'en') {
    const period = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthsEn[d.getMonth()]} ${day}, ${year} ${h12}:${min} ${period}`;
  }
  if (lang === 'ja' || lang === 'zh') {
    return `${year}/${month}/${day} ${String(hour).padStart(2, '0')}:${min}`;
  }
  return `${year}. ${month}. ${day} ${String(hour).padStart(2, '0')}:${min}`;
}

// ========================================================
// 19. 실행취소(Undo/Redo), 뷰포트 dvh 보정 & 초기 구동 엔트리포인트
// ========================================================
function saveStateForUndo() {
  const snapshot = JSON.stringify({
    stickers: appState.stickers,
    shootingMode: appState.shootingMode,
    selectedCutLayout: appState.selectedCutLayout,
    selectedCutCount: appState.selectedCutCount,
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
    shootingMode: appState.shootingMode,
    selectedCutLayout: appState.selectedCutLayout,
    selectedCutCount: appState.selectedCutCount,
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
    shootingMode: appState.shootingMode,
    selectedCutLayout: appState.selectedCutLayout,
    selectedCutCount: appState.selectedCutCount,
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
  appState.shootingMode = snap.shootingMode || 'strip';
  appState.selectedCutLayout = snap.selectedCutLayout || '1x4';
  appState.selectedCutCount = snap.selectedCutCount || 4;
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

// 🌟 URL 쿼리 파라미터 감지 (QR 스캔 후 모바일 뷰어 직결)
function checkUrlQueryForPixxViewer() {
  const url = location.href;
  if (url.includes('?view=pixx') || url.includes('?id=')) {
    openPixxViewer();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  updateAppVh();
  initCanvasInteractions();
  setupCanvasPinchZoom();
  checkUrlQueryForPixxViewer();

  // 브라우저 언어 감지
  const userLang = (navigator.language || navigator.userLanguage || "ko").toLowerCase();
  if (userLang.startsWith('ja')) currentPixxLang = 'ja';
  else if (userLang.startsWith('zh')) currentPixxLang = 'zh';
  else if (userLang.startsWith('th')) currentPixxLang = 'th';
  else if (userLang.startsWith('en')) currentPixxLang = 'en';
  else currentPixxLang = 'ko';

  if (typeof renderStrip === 'function') {
    renderStrip();
  }
});
