// ========================================================
// [Photoist Pro v1.0] app.js (1편 / 전반부)
// ========================================================
// 1. 핵심 전역 상수 및 통합 상태 관리 (State Management)
// 2. 고성능 사운드 신디사이저 엔진 (Web Audio API Synthesizer)
// 3. 화면 전환 라우터 & 자이로 방향 감지 엔진 (Gyro Sensor)
// 4. 메인 홈 화면 제어 & 모드/셔터 간격 선택 (Home Controller)
// 5. 풀스크린 카메라 스트리밍 & 보존형 전환 엔진 (Camera Pipeline)
// 6. 6컷 고정 연속 촬영 & 15Mbps 비디오 클립 캡처 (Capture Engine)
// 7. 모드 종속형 4·5·6컷 가변 슬롯(Empty Slots) 생성기 (Slot Builder)
// 8. 하단 6컷 캐러셀 & 원터치 슬롯 매핑 UX (Slot Assignment)
// 9. 에디터 스튜디오 진입 검증 및 [사진 다시 선택] 복귀 라우팅
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
  // 1) 촬영 모드 & 컷수
  shootingMode: 'strip', // 'strip' (1x4 가로) | 'grid' (2x2 세로)
  selectedCutCount: 4,   // 4 | 5 | 6
  timerSec: 6,           // 4 | 6 | 8초 (기본 6초)
  
  // 2) 촬영 데이터
  shotImages: [],        // 촬영된 6컷 원본 Image 객체 배열
  shotVideoBlobs: [],    // 각 컷별 2.5초 녹화 Video Blob 배열
  selectedIndices: [null, null, null, null], // 슬롯별 선택된 shotImages 인덱스
  selectedImages: [null, null, null, null],  // 슬롯별 실제 Image 객체
  activeSlotIndex: 0,    // 현재 포커스된 슬롯 번호
  
  // 3) 카메라 장치 상태
  facingMode: 'user',    // 'user' (전면) | 'environment' (후면)
  mediaStream: null,
  
  // 4) 에디터 디자인 테마
  themeCategory: 'basic', // 'basic' | 'simple' | 'premium'
  frameStyle: 'basic_middle',
  frameColor: '#000000',
  frameThickness: 40,
  showDate: true,
  sideEngravingEnabled: false,
  sideEngravingText: "#PHOTOIST",
  
  // 5) 타이포그래피 & 필터
  typography: {
    fontFamily: 'Pretendard',
    fontSize: 42,
    fontColor: '#FFFFFF', // 명도 연산으로 자동 반전
    isBold: true,
    date: getFormattedTodayDate()
  },
  activeFilter: 'normal',
  filters: { bright: 100, contrast: 100, saturate: 100 },
  
  // 6) 스티커/데코레이션
  stickers: [],
  selectedStickerIdx: -1,
  dragTarget: null,
  dragStartPos: { x: 0, y: 0 },
  slotRects: [],
  
  // 7) 회원 & 세션
  currentUser: null,
  isAdmin: false,
  resetInterval: null
};

// 캔버스 줌 & 패닝 상태 (0.1배 ~ 5.0배 무제한)
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
  const screens = ['screenHome', 'screenCapture', 'screenPick', 'screenEdit', 'screenResult'];
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

// 🌟 자이로 방향 실시간 감지 (1x4 세로 파지 시 / 2x2 가로 파지 시 경고창 호출)
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
    // 1x4 가로 모드: 가로(Landscape) 필요 -> 세로(Portrait)면 경고 표출
    if (isPortrait) {
      overlay.classList.remove('hidden');
      if (title) title.textContent = "기기를 가로로 회전해 주세요!";
      if (desc) desc.textContent = "1×4 모드는 가로 촬영 전용입니다. 기기를 가로로 돌리시면 촬영이 자동으로 이어집니다.";
      if (icon) icon.className = "w-10 h-10 rotate-90";
    } else {
      overlay.classList.add('hidden');
    }
  } else if (appState.shootingMode === 'grid') {
    // 2x2 세로 모드: 세로(Portrait) 필요 -> 가로(Landscape)면 경고 표출
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
// 4. 메인 홈 화면 제어 & 모드/셔터 간격 선택
// ========================================================
function selectShootingMode(mode) {
  appState.shootingMode = mode; // 'strip' or 'grid'
  const btnText = document.getElementById('btnStartText');
  if (btnText) {
    btnText.textContent = (mode === 'strip') ? "1×4 가로 모드로 촬영 시작" : "2×2 세로 모드로 촬영 시작";
  }
  showToast(mode === 'strip' ? "1×4 가로 촬영 모드 선택됨" : "2×2 세로 촬영 모드 선택됨");
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
    alert("카메라 장치에 접근할 수 없습니다.\n권한 설정을 확인해 주세요: " + err.message);
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

// 🌟 카메라 전/후면 전환 시 촬영 회차 및 기존 데이터 완벽 보존
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
const TOTAL_SHOT_COUNT = 6; // 6컷 고정 촬영

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

  // 15Mbps 무빙 비디오용 2.5초 클립 녹화 시작
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
// 7. 모드 종속형 4·5·6컷 가변 슬롯 생성기
// ========================================================
function proceedToPickScreen() {
  showScreen('screenPick');
  appState.selectedCutCount = 4; // 기본 4장
  appState.selectedIndices = Array(appState.selectedCutCount).fill(null);
  appState.selectedImages = Array(appState.selectedCutCount).fill(null);
  appState.activeSlotIndex = 0;

  renderPickCutTabs();
  renderPickSlots();
  renderPickCarousel();
  updatePickProgressUI();
}

// 🌟 촬영 모드별(1x4 or 2x2) 상단 컷수 탭 동적 생성
function renderPickCutTabs() {
  const tabsContainer = document.getElementById('pickCutModeTabs');
  if (!tabsContainer) return;
  tabsContainer.innerHTML = '';

  const mode = appState.shootingMode;
  const options = (mode === 'strip')
    ? [
        { count: 4, label: '4장 (1×4)' },
        { count: 5, label: '5장 (1×5)' },
        { count: 6, label: '6장 (1×6)' }
      ]
    : [
        { count: 4, label: '4장 (2×2)' },
        { count: 5, label: '5장 (화보형)' },
        { count: 6, label: '6장 (2×2×2)' }
      ];

  options.forEach(opt => {
    const btn = document.createElement('button');
    const isSelected = (appState.selectedCutCount === opt.count);
    btn.type = 'button';
    btn.className = isSelected
      ? "px-3.5 py-1.5 rounded-xl text-xs font-black bg-slate-900 text-white shadow-xs transition"
      : "px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition";
    btn.textContent = opt.label;
    btn.onclick = () => {
      selectCutCountInPick(opt.count);
    };
    tabsContainer.appendChild(btn);
  });
}

function selectCutCountInPick(count) {
  appState.selectedCutCount = count;
  appState.selectedIndices = Array(count).fill(null);
  appState.selectedImages = Array(count).fill(null);
  appState.activeSlotIndex = 0;

  renderPickCutTabs();
  renderPickSlots();
  renderPickCarousel();
  updatePickProgressUI();
}

function renderPickSlots() {
  const container = document.getElementById('pickSlotsContainer');
  if (!container) return;
  container.innerHTML = '';

  const cut = appState.selectedCutCount;
  const mode = appState.shootingMode;

  if (mode === 'strip') {
    // 1열 스트립 형태 (가로 스크롤 또는 유연한 1열 그리드)
    container.className = `w-full h-full max-h-[440px] grid grid-cols-${cut} gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-200 overflow-y-auto no-scrollbar`;
    for (let i = 0; i < cut; i++) {
      container.appendChild(createSlotCardElement(i));
    }
  } else {
    // 2x2 세로 모드
    if (cut === 4) {
      container.className = "w-full h-full max-h-[440px] grid grid-cols-2 gap-2.5 p-2 bg-slate-50 rounded-2xl border border-slate-200 overflow-y-auto no-scrollbar";
      for (let i = 0; i < 4; i++) container.appendChild(createSlotCardElement(i));
    } else if (cut === 5) {
      // 5컷 화보형: 상2 - 중1(와이드) - 하2
      container.className = "w-full h-full max-h-[440px] flex flex-col gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-200 overflow-y-auto no-scrollbar";
      renderEditorial5Slots(container);
    } else if (cut === 6) {
      container.className = "w-full h-full max-h-[440px] grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-2 bg-slate-50 rounded-2xl border border-slate-200 overflow-y-auto no-scrollbar";
      for (let i = 0; i < 6; i++) container.appendChild(createSlotCardElement(i));
    }
  }
}

function renderEditorial5Slots(container) {
  const rowTop = document.createElement('div');
  rowTop.className = "grid grid-cols-2 gap-2 w-full h-[30%]";
  rowTop.appendChild(createSlotCardElement(0));
  rowTop.appendChild(createSlotCardElement(1));
  container.appendChild(rowTop);

  const rowMid = document.createElement('div');
  rowMid.className = "w-full h-[40%]";
  const heroSlot = createSlotCardElement(2);
  heroSlot.classList.add('w-full', 'h-full');
  rowMid.appendChild(heroSlot);
  container.appendChild(rowMid);

  const rowBottom = document.createElement('div');
  rowBottom.className = "grid grid-cols-2 gap-2 w-full h-[30%]";
  rowBottom.appendChild(createSlotCardElement(3));
  rowBottom.appendChild(createSlotCardElement(4));
  container.appendChild(rowBottom);
}

function createSlotCardElement(slotIdx) {
  const card = document.createElement('div');
  const isFilled = (appState.selectedImages[slotIdx] !== null);
  const isActive = (appState.activeSlotIndex === slotIdx);

  card.className = `slot-pro-card relative flex items-center justify-center cursor-pointer overflow-hidden transition-all ${
    isFilled ? 'slot-filled' : ''
  } ${isActive ? 'slot-active' : ''}`;

  if (isFilled) {
    const img = document.createElement('img');
    img.src = appState.selectedImages[slotIdx].src;
    img.className = "w-full h-full object-cover";
    card.appendChild(img);

    const btnRemove = document.createElement('button');
    btnRemove.className = "absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition shadow-md";
    btnRemove.innerHTML = `<i data-lucide="x" class="w-3.5 h-3.5"></i>`;
    btnRemove.onclick = (e) => {
      e.stopPropagation();
      unassignPhotoFromSlot(slotIdx);
    };
    card.appendChild(btnRemove);

    const badge = document.createElement('span');
    badge.className = "absolute bottom-2 left-2 bg-slate-900/80 text-white text-[10px] font-black px-2 py-0.5 rounded-md backdrop-blur-xs";
    badge.textContent = `${slotIdx + 1}번 컷`;
    card.appendChild(badge);
  } else {
    card.innerHTML = `
      <div class="flex flex-col items-center justify-center p-3 text-center pointer-events-none">
        <span class="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center mb-1">
          ${slotIdx + 1}
        </span>
        <span class="text-[11px] font-bold text-slate-500">터치하여 배치</span>
      </div>
    `;
  }

  card.onclick = () => {
    appState.activeSlotIndex = slotIdx;
    renderPickSlots();
    if (window.lucide) lucide.createIcons();
  };

  return card;
}

// ========================================================
// 8. 하단 6컷 캐러셀 & 원터치 슬롯 매핑 UX
// ========================================================
function renderPickCarousel() {
  const container = document.getElementById('pickCarouselContainer');
  if (!container) return;
  container.innerHTML = '';

  appState.shotImages.forEach((img, shotIdx) => {
    const item = document.createElement('div');
    const isUsed = appState.selectedIndices.includes(shotIdx);
    const assignedSlotNum = appState.selectedIndices.indexOf(shotIdx) + 1;

    item.className = `shrink-0 relative w-20 h-28 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
      isUsed ? 'border-rose-500 opacity-60 scale-95' : 'border-slate-200 hover:border-slate-400 active:scale-95'
    }`;

    item.innerHTML = `
      <img src="${img.src}" class="w-full h-full object-cover">
      ${isUsed ? `<span class="absolute top-1 left-1 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">${assignedSlotNum}번 슬롯</span>` : ''}
    `;

    item.onclick = () => {
      assignPhotoToActiveSlot(shotIdx);
    };

    container.appendChild(item);
  });
}

function assignPhotoToActiveSlot(shotIdx) {
  const currentSlot = appState.activeSlotIndex;
  if (currentSlot === null || currentSlot >= appState.selectedCutCount) return;

  triggerHaptic('light');

  const prevSlot = appState.selectedIndices.indexOf(shotIdx);
  if (prevSlot !== -1 && prevSlot !== currentSlot) {
    appState.selectedIndices[prevSlot] = null;
    appState.selectedImages[prevSlot] = null;
  }

  appState.selectedIndices[currentSlot] = shotIdx;
  appState.selectedImages[currentSlot] = appState.shotImages[shotIdx];

  // 다음 빈 슬롯으로 자동 포커스
  const nextEmptySlot = appState.selectedIndices.findIndex(idx => idx === null);
  if (nextEmptySlot !== -1) {
    appState.activeSlotIndex = nextEmptySlot;
  }

  renderPickSlots();
  renderPickCarousel();
  updatePickProgressUI();
  if (window.lucide) lucide.createIcons();
}

function unassignPhotoFromSlot(slotIdx) {
  triggerHaptic('light');
  appState.selectedIndices[slotIdx] = null;
  appState.selectedImages[slotIdx] = null;
  appState.activeSlotIndex = slotIdx;

  renderPickSlots();
  renderPickCarousel();
  updatePickProgressUI();
  if (window.lucide) lucide.createIcons();
}

function updatePickProgressUI() {
  const filledCount = appState.selectedIndices.filter(idx => idx !== null).length;
  const total = appState.selectedCutCount;
  const progressText = document.getElementById('pickProgressText');
  if (progressText) {
    progressText.textContent = `${filledCount} / ${total} 슬롯 배치 완료`;
  }
}

// ========================================================
// 9. 에디터 스튜디오 진입 검증 및 [사진 다시 선택] 복귀 라우팅
// ========================================================
function proceedToEditor() {
  const hasEmptySlot = appState.selectedIndices.some(idx => idx === null);
  if (hasEmptySlot) {
    alert("모든 슬롯에 사진을 배치해 주세요!\n슬롯을 터치한 후 원하는 사진을 선택하시면 됩니다.");
    return;
  }

  triggerHaptic('heavy');
  showScreen('screenEdit');
  initSplitResizer();

  if (typeof renderStrip === 'function') {
    renderStrip();
  }
}

// 🌟 에디터에서 사진 선택 화면으로 복귀 (꾸미기 설정 유지)
function returnToPickScreen() {
  showScreen('screenPick');
  renderPickCutTabs();
  renderPickSlots();
  renderPickCarousel();
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
// [Photoist Pro v1.0] app.js (2편 / 후반부)
// ========================================================
// 11. 테마 컨트롤러 & 프레임 스타일 제어 (지그재그/심플/프리미엄)
// 12. 감성 필터 및 화질 보정 엔진 (Pixel Filter Math)
// 13. 데코레이션 팩: [이모티콘] & [감성 글자] 탭 컨트롤러
// 14. 캔버스 뷰포트 인터랙션 & 무제한 핀치 줌 / 패닝 통합 제스처
// 15. 초고화질 캔버스 렌더링 엔진 (명도 감지 자동 반전 & 비례 각인)
// 16. 15Mbps 초고화질 무빙 영상 엔진 & 다운로드 QR 사진 자동 합성
// 17. 결과물 내보내기 & 2중 큐 클라우드 아카이빙
// 18. 회원 인증 체계 & 계정 복구 센터 (Gmail 무료 발송)
// 19. 마이페이지 & 보관함 렌더링
// 20. 실행취소(Undo/Redo), 뷰포트 dvh 보정 & 초기 구동 엔트리포인트
// ========================================================

// ========================================================
// 11. 테마 컨트롤러 & 프레임 스타일 제어
// ========================================================
function setFrameThemeCategory(categoryKey, btn) {
  appState.themeCategory = categoryKey;
  document.querySelectorAll('.theme-tab-btn').forEach(b => {
    b.className = "theme-tab-btn flex-1 py-1 text-slate-500 font-bold text-[11px] rounded-lg transition";
  });
  if (btn) btn.className = "theme-tab-btn flex-1 py-1 bg-white text-slate-900 font-black text-[11px] rounded-lg shadow-xs transition";

  const basicPanel = document.getElementById('themeGroupBasic');
  const simplePanel = document.getElementById('themeGroupSimple');
  const premiumPanel = document.getElementById('themeGroupPremium');

  if (basicPanel) basicPanel.classList.toggle('hidden', categoryKey !== 'basic');
  if (simplePanel) simplePanel.classList.toggle('hidden', categoryKey !== 'simple');
  if (premiumPanel) premiumPanel.classList.toggle('hidden', categoryKey !== 'premium');
}

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

  // 1. 기본 테마 계열
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
  // 2. 심플 테마 계열 (보더리스, 아날로그 필름, 슬림 폴라)
  else if (styleKey === 'simple_borderless') {
    if (sigInput) sigInput.value = "";
    if (colorPickerContainer) colorPickerContainer.classList.remove('hidden');
  } else if (styleKey === 'simple_film') {
    if (sigInput) sigInput.value = "KODAK PORTRA 400";
    if (colorPickerContainer) colorPickerContainer.classList.remove('hidden');
  } else if (styleKey === 'simple_polaroid') {
    if (sigInput) sigInput.value = "Our Precious Time";
    if (colorPickerContainer) colorPickerContainer.classList.remove('hidden');
  }
  // 3. 프리미엄 스페셜 테마 계열
  else if (styleKey === 'photoist_signature') {
    if (sigInput) sigInput.value = "photoist";
  } else if (styleKey === 'magazine_issue') {
    if (sigInput) sigInput.value = "PHOTOIST ISSUE #01";
  } else if (styleKey === 'noir_monochrome') {
    if (sigInput) sigInput.value = "NOIR MONOCHROME";
  }

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

function onThicknessChange(val) {
  appState.frameThickness = parseInt(val, 10);
  const valLabel = document.getElementById('valThickness');
  if (valLabel) valLabel.textContent = `${appState.frameThickness}px`;
  renderStrip();
}

// 🌟 프레임 색상 변경 및 명도 기반 글자색 자동 반전 연산
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

  // 밝은 프레임(L > 180)이면 검정 글씨, 어두우면 흰 글씨로 자동 반전
  appState.typography.fontColor = (lum > 180) ? '#0F172A' : '#FFFFFF';

  renderStrip();
}

function toggleShowDate(checked) {
  saveStateForUndo();
  appState.showDate = checked;
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
// 13. 데코레이션 팩: [이모티콘] & [감성 글자] 탭 컨트롤러
// ========================================================
function switchStickerTab(tabKey, btn) {
  document.querySelectorAll('.sticker-tab-btn').forEach(b => {
    b.className = "sticker-tab-btn px-2.5 py-1 text-slate-500 font-bold text-[11px] rounded transition";
  });
  if (btn) btn.className = "sticker-tab-btn px-2.5 py-1 bg-white text-slate-900 font-black text-[11px] rounded shadow-xs transition";

  const panelEmoji = document.getElementById('decoPanelEmoji');
  const panelWord = document.getElementById('decoPanelWord');
  if (panelEmoji) panelEmoji.classList.toggle('hidden', tabKey !== 'emoji');
  if (panelWord) panelWord.classList.toggle('hidden', tabKey !== 'word');
}

function addEmojiSticker(emoji) {
  saveStateForUndo();
  const canvas = document.getElementById('photoCanvas');
  const newSticker = {
    id: Date.now(),
    type: 'emoji',
    text: emoji,
    x: canvas ? canvas.width / 2 : 600,
    y: canvas ? canvas.height / 2 : 1200,
    size: 110,
    rotation: 0
  };
  appState.stickers.push(newSticker);
  appState.selectedStickerIdx = appState.stickers.length - 1;
  showStickerControls(newSticker);
  renderStrip();
}

function addTextSticker(text) {
  saveStateForUndo();
  const canvas = document.getElementById('photoCanvas');
  const newSticker = {
    id: Date.now(),
    type: 'text',
    text: text,
    x: canvas ? canvas.width / 2 : 600,
    y: canvas ? canvas.height / 2 : 1200,
    size: 65,
    rotation: 0,
    color: '#0F172A',
    fontFamily: appState.typography.fontFamily || 'Pretendard'
  };
  appState.stickers.push(newSticker);
  appState.selectedStickerIdx = appState.stickers.length - 1;
  showStickerControls(newSticker);
  renderStrip();
}

function addDirectTextSticker() {
  const input = document.getElementById('directTextInput');
  if (!input) return;
  const val = input.value.trim();
  if (!val) { alert("추가할 텍스트를 입력해주세요!"); return; }
  addTextSticker(val);
  input.value = '';
}

function clearAllStickers() {
  if (appState.stickers.length === 0) return;
  if (!confirm("화면의 모든 스티커와 장식을 삭제하시겠습니까?")) return;
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
      
      // 🌟 0.1배 ~ 5.0배 줌과 동시에 두 손가락 중심 좌표 이동(Pan)을 손 떼지 않고 부드럽게 통합
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

  const mode = appState.shootingMode; // 'strip' or 'grid'
  const cut = appState.selectedCutCount || 4;
  const fStyle = appState.frameStyle || 'basic_middle';
  const pad = (fStyle === 'simple_borderless') ? 6 : (appState.frameThickness || 40);
  const gap = (fStyle === 'simple_borderless') ? 2 : Math.round(pad * 0.45);
  const sigInp = document.getElementById('frameSignatureInput');
  const customTitle = sigInp ? sigInp.value : 'photoist';

  // 측면 각인 활성화 시 너비 확장 (45~70px)
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
  if (fStyle === 'photoist_signature') ctx.fillStyle = '#0F172A';
  else if (fStyle === 'noir_monochrome') ctx.fillStyle = '#18181B';
  else if (fStyle === 'magazine_issue') ctx.fillStyle = '#FDFBF7';
  else ctx.fillStyle = appState.frameColor || '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  appState.slotRects = [];
  const baseCanvasW = canvas.width - sideOffset;

  // 3. 컷수 및 레이아웃 슬롯 렌더링
  if (mode === 'strip') {
    renderStripDynamic(ctx, baseCanvasW, canvas.height, pad, gap, fStyle, customTitle, cut);
  } else {
    renderGridDynamic(ctx, baseCanvasW, canvas.height, pad, gap, fStyle, customTitle, cut);
  }

  // 4. 측면 세로 각인 (테두리 두께 비례 자동 폰트 확대 & 1:1 슬롯 매칭)
  if (appState.sideEngravingEnabled) {
    renderProSideEngraving(ctx, canvas.width, canvas.height, sideOffset);
  }

  // 5. 스티커 및 데코레이션 렌더링
  appState.stickers.forEach((st, idx) => {
    ctx.save();
    ctx.translate(st.x, st.y);
    ctx.rotate(((st.rotation || 0) * Math.PI) / 180);

    if (st.type === 'text') {
      const font = st.fontFamily || 'Pretendard';
      ctx.font = `900 ${st.size}px '${font}', sans-serif`;
      ctx.fillStyle = st.color || '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
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

    if (!isFinalExport && idx === appState.selectedStickerIdx) {
      ctx.strokeStyle = '#F43F5E';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      const boundW = st.type === 'text' ? st.size * 1.1 : st.size * 0.7;
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
  const topH = (fStyle === 'basic_top' || fStyle === 'photoist_signature') ? 140 : pad;
  const bottomH = (fStyle === 'basic_bottom' || fStyle === 'simple_polaroid') ? 220 : pad;

  const totalGaps = (cut - 1) * gap;
  const slotH = (cH - topH - bottomH - bannerH - totalGaps) / cut;

  if (fStyle === 'basic_top' || fStyle === 'photoist_signature') {
    drawProHeader(ctx, cW / 2, topH / 2, title);
  }

  // 지그재그 시 좌우 교차 오프셋 너비
  const zigzagShift = isZigzag ? Math.round(pad * 1.2) : 0;
  const slotW = cW - (pad * 2) - zigzagShift;

  for (let i = 0; i < cut; i++) {
    let sy = topH + (i * (slotH + gap));
    if (isMiddle && i >= Math.floor(cut / 2)) sy += bannerH;

    let sx = pad;
    if (isZigzag) {
      // 1번 좌측(0), 2번 우측(+shift), 3번 좌측, 4번 우측...
      sx = (i % 2 === 0) ? pad : pad + zigzagShift;
    }

    appState.slotRects.push({ x: sx, y: sy, w: slotW, h: slotH });
    drawFilteredSlotPhoto(ctx, appState.selectedImages[i], sx, sy, slotW, slotH);
  }

  if (isMiddle) {
    const bannerY = topH + (Math.floor(cut / 2) * (slotH + gap)) - (gap / 2);
    drawProBanner(ctx, cW / 2, bannerY + (bannerH / 2), title);
  } else if (fStyle === 'basic_bottom' || fStyle === 'simple_polaroid') {
    const footerY = (cH - bottomH) + (bottomH / 2);
    drawProFooter(ctx, cW / 2, footerY, title);
  }
}

// 🌟 2x2 세로 모드 동적 렌더러 (4컷 / 5컷 화보형 / 6컷 2x3)
function renderGridDynamic(ctx, cW, cH, pad, gap, fStyle, title, cut) {
  const topH = (fStyle === 'basic_top' || fStyle === 'magazine_issue') ? 130 : pad;
  const bottomH = (fStyle === 'basic_bottom' || fStyle === 'simple_polaroid') ? 210 : pad;

  if (fStyle === 'basic_top' || fStyle === 'magazine_issue') {
    drawProHeader(ctx, cW / 2, topH / 2, title);
  }

  if (cut === 4) {
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
  } else if (cut === 5) {
    // 5컷 화보형: 상2 - 중1(대형 와이드 히어로) - 하2
    const availH = cH - topH - bottomH - (gap * 2);
    const row1H = availH * 0.31;
    const row2H = availH * 0.38;
    const row3H = availH * 0.31;
    const smallW = (cW - (pad * 2) - gap) / 2;
    const heroW = cW - (pad * 2);

    // 상단 2장
    appState.slotRects.push({ x: pad, y: topH, w: smallW, h: row1H });
    appState.slotRects.push({ x: pad + smallW + gap, y: topH, w: smallW, h: row1H });
    drawFilteredSlotPhoto(ctx, appState.selectedImages[0], pad, topH, smallW, row1H);
    drawFilteredSlotPhoto(ctx, appState.selectedImages[1], pad + smallW + gap, topH, smallW, row1H);

    // 중단 1장 대형 히어로 컷
    const heroY = topH + row1H + gap;
    appState.slotRects.push({ x: pad, y: heroY, w: heroW, h: row2H });
    drawFilteredSlotPhoto(ctx, appState.selectedImages[2], pad, heroY, heroW, row2H);

    // 하단 2장
    const row3Y = heroY + row2H + gap;
    appState.slotRects.push({ x: pad, y: row3Y, w: smallW, h: row3H });
    appState.slotRects.push({ x: pad + smallW + gap, y: row3Y, w: smallW, h: row3H });
    drawFilteredSlotPhoto(ctx, appState.selectedImages[3], pad, row3Y, smallW, row3H);
    drawFilteredSlotPhoto(ctx, appState.selectedImages[4], pad + smallW + gap, row3Y, smallW, row3H);
  } else if (cut === 6) {
    // 6컷: 2x3 그리드
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

  if (fStyle === 'basic_bottom' || fStyle === 'simple_polaroid') {
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

// 🌟 사진 우측 하단 무빙 영상 다운로드 QR 인셋 박스
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
// 16. 15Mbps 초고화질 무빙 영상 엔진 & 다운로드 QR 사진 자동 합성
// ========================================================
let currentMovingVideoBlob = null;
let currentMovingVideoDownloadUrl = "";

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
      vCanvas.width = 1440; vCanvas.height = 2160;
    } else {
      vCanvas.width = 1080; vCanvas.height = 3240;
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
      videoBitsPerSecond: 15000000 // 15Mbps 초고화질 무손실
    });

    const chunks = [];
    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      currentMovingVideoBlob = new Blob(chunks, { type: mimeType });

      // Code.gs 백엔드로 무손실 비디오 업로드 -> 구글 드라이브 다운로드 링크 수신
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const uploadRes = await fetch(GOOGLE_DB_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              action: 'UPLOAD_MOVING_VIDEO',
              videoBase64: reader.result,
              userId: appState.currentUser ? appState.currentUser.userId : 'guest',
              cutCount: appState.selectedCutCount
            })
          }).then(r => r.json());

          if (uploadRes && uploadRes.success && uploadRes.downloadUrl) {
            currentMovingVideoDownloadUrl = uploadRes.downloadUrl;
          } else {
            currentMovingVideoDownloadUrl = window.location.href;
          }

          // 동적 QR 생성 및 캔버스 자동 인셋
          await cacheQrImageFromUrl(currentMovingVideoDownloadUrl);
          renderStrip(false);

          openMovingVideoModal(currentMovingVideoBlob);
        } catch (uploadErr) {
          openMovingVideoModal(currentMovingVideoBlob);
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="video" class="w-4 h-4"></i><span>🎬 무빙 영상 생성 (15Mbps 초고화질)</span>`;
            if (window.lucide) lucide.createIcons();
          }
        }
      };
      reader.readAsDataURL(currentMovingVideoBlob);
    };

    recorder.start();

    const startTime = performance.now();
    const duration = 6500;
    const pad = Math.round(appState.frameThickness * 0.9);
    const gap = Math.round(pad * 0.45);
    const sigInp = document.getElementById('frameSignatureInput');
    const title = sigInp ? sigInp.value : 'photoist';
    const cut = appState.selectedCutCount;

    function renderVideoFrame(now) {
      const elapsed = now - startTime;
      vCtx.fillStyle = appState.frameColor || '#000000';
      vCtx.fillRect(0, 0, vCanvas.width, vCanvas.height);

      if (appState.shootingMode === 'grid') {
        const topH = 130; const bottomH = 200;
        const slotW = (vCanvas.width - (pad * 2) - gap) / 2;
        const slotH = (vCanvas.height - topH - bottomH - gap) / 2;
        const coords = [
          { x: pad, y: topH },
          { x: pad + slotW + gap, y: topH },
          { x: pad, y: topH + slotH + gap },
          { x: pad + slotW + gap, y: topH + slotH + gap }
        ];

        drawProHeader(vCtx, vCanvas.width / 2, topH / 2, title);
        for (let i = 0; i < Math.min(4, cut); i++) {
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
        const topH = 130; const bottomH = 220;
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
      btn.innerHTML = `<i data-lucide="video" class="w-4 h-4"></i><span>🎬 무빙 영상 생성 (15Mbps 초고화질)</span>`;
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

function openMovingVideoModal(videoBlob) {
  const modal = document.getElementById('movingVideoModal');
  const preview = document.getElementById('movingVideoModalPreview');
  if (!modal || !preview) return;

  preview.src = URL.createObjectURL(videoBlob);
  modal.classList.remove('hidden');

  const btnDownVideo = document.getElementById('btnDownloadMovingVideoFile');
  const btnDownPhoto = document.getElementById('btnDownloadQREmbeddedPhoto');

  if (btnDownVideo) {
    btnDownVideo.onclick = () => {
      const ext = videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(videoBlob);
      a.download = `[photoist_Pro_무빙영상]_${Date.now()}.${ext}`;
      a.click();
    };
  }

  if (btnDownPhoto) {
    btnDownPhoto.onclick = () => {
      renderStrip(true);
      const canvas = document.getElementById('photoCanvas');
      if (!canvas) return;
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `[photoist_Pro_QR포함사진]_${Date.now()}.png`;
      a.click();
    };
  }
}

function closeMovingVideoModal() {
  const modal = document.getElementById('movingVideoModal');
  const preview = document.getElementById('movingVideoModalPreview');
  if (preview) preview.pause();
  if (modal) modal.classList.add('hidden');
}

// ========================================================
// 17. 사진 내보내기, QR 전송 & 2중 큐 클라우드 아카이빙
// ========================================================
function sharePhotoDirectly() {
  renderStrip(true);
  const canvas = document.getElementById('photoCanvas');
  if (!canvas) return;

  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], `[photoist_Pro]_${Date.now()}.png`, { type: 'image/png' });
    archivePhotoResult(canvas.toDataURL('image/jpeg', 0.92), false);

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Photoist Pro Studio',
          text: '포토이스트 프로 감성 네컷 사진입니다!'
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, 'image/png');
}

async function saveAndGenerateQR() {
  const btn = document.getElementById('btnSaveQR');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i><span>업로드 중...</span>`;
    if (window.lucide) lucide.createIcons();
  }

  renderStrip(true);
  const canvas = document.getElementById('photoCanvas');
  if (!canvas) return;

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  archivePhotoResult(dataUrl, false);

  canvas.toBlob(async (blob) => {
    try {
      const formData = new FormData();
      formData.append('file', blob, `PhotoistPro_${Date.now()}.png`);
      const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: formData
      }).then(r => r.json());

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>스마트폰 QR 전송</span>`;
      }

      if (uploadRes && uploadRes.status === 'success' && uploadRes.data.url) {
        const directUrl = uploadRes.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
        displayResultWithQR(directUrl);
      } else {
        displayResultWithQR(window.location.href);
      }
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>스마트폰 QR 전송</span>`;
      }
      displayResultWithQR(window.location.href);
    }
  }, 'image/png');
}

function displayResultWithQR(url) {
  const qrBox = document.getElementById('qrcodeArea');
  if (!qrBox || typeof QRCode === 'undefined') return;
  qrBox.innerHTML = '';
  new QRCode(qrBox, {
    text: url,
    width: 170,
    height: 170,
    correctLevel: QRCode.CorrectLevel.M
  });
  showScreen('screenResult');
  startAutoReset();
}

function archivePhotoResult(dataUrl, isFavorite = false) {
  const newArchiveItem = {
    id: Date.now(),
    date: getFormattedTodayDate(),
    time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    dataUrl: dataUrl,
    isFavorite: isFavorite,
    userId: appState.currentUser ? appState.currentUser.userId : 'guest'
  };

  let archives = JSON.parse(localStorage.getItem('photoist_pro_archives') || '[]');
  archives.unshift(newArchiveItem);
  if (archives.length > 50) archives.pop();
  localStorage.setItem('photoist_pro_archives', JSON.stringify(archives));

  if (appState.currentUser && GOOGLE_DB_URL) {
    try {
      fetch(GOOGLE_DB_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'SAVE_ARCHIVE',
          userId: appState.currentUser.userId,
          date: newArchiveItem.date,
          archiveId: newArchiveItem.id,
          isFavorite: isFavorite
        })
      }).catch(() => {});
    } catch (e) {}
  }
}

function toggleFavoriteArchive(archiveId) {
  let archives = JSON.parse(localStorage.getItem('photoist_pro_archives') || '[]');
  const item = archives.find(a => a.id === archiveId);
  if (item) {
    item.isFavorite = !item.isFavorite;
    localStorage.setItem('photoist_pro_archives', JSON.stringify(archives));
    renderMyPageArchives();
  }
}

function returnToEditor() {
  if (appState.resetInterval) {
    clearInterval(appState.resetInterval);
    appState.resetInterval = null;
  }
  showScreen('screenEdit');
  renderStrip();
}

function startAutoReset() {
  if (appState.resetInterval) clearInterval(appState.resetInterval);
  let sec = 120;
  const rText = document.getElementById('resetTimerText');
  if (rText) rText.textContent = `${sec}초`;
  appState.resetInterval = setInterval(() => {
    sec--;
    if (rText) rText.textContent = `${sec}초`;
    if (sec <= 0) {
      clearInterval(appState.resetInterval);
      resetApp();
    }
  }, 1000);
}

function cancelSession() {
  stopCameraAndAudio();
  resetApp();
}

function resetApp() {
  if (appState.resetInterval) {
    clearInterval(appState.resetInterval);
    appState.resetInterval = null;
  }
  stopCameraAndAudio();
  appState.shotImages = [];
  appState.selectedImages = [];
  appState.selectedIndices = Array(appState.selectedCutCount).fill(null);
  appState.stickers = [];
  appState.selectedStickerIdx = -1;
  finalEmbeddedQrImage = null;
  showScreen('screenHome');
}

// ========================================================
// 18. 회원 인증 체계 & 계정 복구 센터 (Gmail 무료 발송)
// ========================================================
async function handleRegister(event) {
  if (event) event.preventDefault();

  const userId = document.getElementById('regUserId').value.trim();
  const pw = document.getElementById('regUserPw').value.trim();
  const pwConfirm = document.getElementById('regUserPwConfirm').value.trim();
  const name = document.getElementById('regUserName').value.trim();
  const birth = document.getElementById('regUserBirth').value.trim();
  const email = document.getElementById('regUserEmail').value.trim();

  if (!userId || !pw || !name || !birth || !email) {
    alert("모든 필수 항목을 입력해주세요.");
    return;
  }

  if (pw !== pwConfirm) {
    alert("비밀번호 확인이 일치하지 않습니다.");
    return;
  }

  if (!/^\d{6}$/.test(birth)) {
    alert("생년월일은 6자리 숫자로 입력해주세요 (예: 050413).");
    return;
  }

  const btn = document.getElementById('btnSubmitRegister');
  if (btn) {
    btn.disabled = true;
    btn.textContent = "가입 처리 중...";
  }

  try {
    const res = await fetch(GOOGLE_DB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'REGISTER',
        userId: userId,
        password: pw,
        name: name,
        birthDate: birth,
        email: email
      })
    });
    const result = await res.json();

    if (result && result.success) {
      alert("회원가입이 완료되었습니다! 로그인해 주세요.");
      closeRegisterModal();
      openLoginModal();
    } else {
      alert(result.message || "가입에 실패했습니다.");
    }
  } catch (err) {
    alert("서버 연결 실패: 오프라인 모드로 저장되었습니다.");
    closeRegisterModal();
    openLoginModal();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "회원가입 완료";
    }
  }
}

async function handleLogin(event) {
  if (event) event.preventDefault();

  const userId = document.getElementById('loginUserId').value.trim();
  const pw = document.getElementById('loginUserPw').value.trim();

  if (!userId || !pw) {
    alert("아이디와 비밀번호를 모두 입력해주세요.");
    return;
  }

  // 🌟 마스터 최고 관리자 계정 직접 승인
  if (userId === 'knsupolo' && pw === '12345678') {
    appState.isAdmin = true;
    appState.currentUser = { userId: 'knsupolo', name: '최고관리자', role: 'master' };
    localStorage.setItem('photoist_pro_auth_user', JSON.stringify(appState.currentUser));
    updateAuthUI();
    closeLoginModal();
    alert("마스터 최고 관리자 계정으로 로그인되었습니다.");
    return;
  }

  const btn = document.getElementById('btnSubmitLogin');
  if (btn) {
    btn.disabled = true;
    btn.textContent = "로그인 중...";
  }

  try {
    const res = await fetch(GOOGLE_DB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'LOGIN', userId: userId, password: pw })
    });
    const result = await res.json();

    if (result && result.success && result.user) {
      appState.currentUser = result.user;
      localStorage.setItem('photoist_pro_auth_user', JSON.stringify(result.user));
      updateAuthUI();
      closeLoginModal();
      alert(`${result.user.name || result.user.userId}님, 환영합니다!`);
    } else {
      alert(result.message || "아이디 또는 비밀번호가 올바르지 않습니다.");
    }
  } catch (err) {
    alert("로그인 처리 중 오류가 발생했습니다.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "로그인";
    }
  }
}

function handleLogout() {
  appState.currentUser = null;
  appState.isAdmin = false;
  localStorage.removeItem('photoist_pro_auth_user');
  updateAuthUI();
  closeMyPageModal();
  alert("로그아웃되었습니다.");
}

function updateAuthUI() {
  const btnLogin = document.getElementById('headerBtnLogin');
  const btnMyPage = document.getElementById('headerBtnMyPage');
  const badge = document.getElementById('headerUserBadge');

  if (appState.currentUser) {
    if (btnLogin) btnLogin.classList.add('hidden');
    if (btnMyPage) btnMyPage.classList.remove('hidden');
    if (badge) {
      badge.textContent = `${appState.currentUser.name || appState.currentUser.userId} 님`;
      badge.classList.remove('hidden');
    }
  } else {
    if (btnLogin) btnLogin.classList.remove('hidden');
    if (btnMyPage) btnMyPage.classList.add('hidden');
    if (badge) badge.classList.add('hidden');
  }
}

async function handleAccountRecovery(event) {
  if (event) event.preventDefault();

  const name = document.getElementById('recovUserName').value.trim();
  const birth = document.getElementById('recovUserBirth').value.trim();
  const email = document.getElementById('recovUserEmail').value.trim();

  if (!name || !birth || !email) {
    alert("이름, 생년월일 6자리, 가입 이메일을 모두 입력해주세요.");
    return;
  }

  const btn = document.getElementById('btnSubmitRecovery');
  if (btn) {
    btn.disabled = true;
    btn.textContent = "계정 확인 및 발송 중...";
  }

  try {
    const res = await fetch(GOOGLE_DB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'RECOVER_ACCOUNT',
        name: name,
        birthDate: birth,
        email: email
      })
    });
    const result = await res.json();

    if (result && result.success) {
      alert(`[계정 확인 완료]\n가입 아이디: ${result.userId}\n\n등록하신 이메일(${email})로 임시 비밀번호가 무료 발송되었습니다.`);
      closeAccountRecoveryModal();
    } else {
      alert(result.message || "일치하는 회원 정보를 찾을 수 없습니다.");
    }
  } catch (err) {
    alert("계정 복구 서버 연결에 실패했습니다.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "계정 확인 및 임시비밀번호 받기";
    }
  }
}

function openLoginModal() { document.getElementById('loginModal')?.classList.remove('hidden'); }
function closeLoginModal() { document.getElementById('loginModal')?.classList.add('hidden'); }
function openRegisterModal() { closeLoginModal(); document.getElementById('registerModal')?.classList.remove('hidden'); }
function closeRegisterModal() { document.getElementById('registerModal')?.classList.add('hidden'); }
function openAccountRecoveryModal() { closeLoginModal(); document.getElementById('accountRecoveryModal')?.classList.remove('hidden'); }
function closeAccountRecoveryModal() { document.getElementById('accountRecoveryModal')?.classList.add('hidden'); }

// ========================================================
// 19. 마이페이지 & 보관함 렌더링
// ========================================================
function openMyPageModal() {
  if (!appState.currentUser) {
    openLoginModal();
    return;
  }
  const m = document.getElementById('myPageModal');
  if (m) m.classList.remove('hidden');

  const nameEl = document.getElementById('myPageUserName');
  const idEl = document.getElementById('myPageUserId');
  if (nameEl) nameEl.textContent = appState.currentUser.name || appState.currentUser.userId;
  if (idEl) idEl.textContent = appState.currentUser.email || appState.currentUser.userId;

  renderMyPageArchives();
}

function closeMyPageModal() { document.getElementById('myPageModal')?.classList.add('hidden'); }

function renderMyPageArchives() {
  const container = document.getElementById('myPageArchivesList');
  if (!container) return;

  const archives = JSON.parse(localStorage.getItem('photoist_pro_archives') || '[]');
  if (archives.length === 0) {
    container.innerHTML = `<p class="col-span-full text-center py-8 text-xs text-slate-400">보관된 추억네컷 사진이 없습니다.</p>`;
    return;
  }

  container.innerHTML = archives.map(item => `
    <div class="relative bg-white border border-slate-200 rounded-2xl overflow-hidden group shadow-xs">
      <img src="${item.dataUrl}" class="w-full aspect-[2/3] object-cover cursor-pointer" onclick="openArchivePreview('${item.dataUrl}')">
      <button onclick="toggleFavoriteArchive(${item.id})" class="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/70 text-sm shadow">
        ${item.isFavorite ? '⭐' : '☆'}
      </button>
      <div class="p-2.5 flex items-center justify-between text-[11px] text-slate-500">
        <span>${item.date}</span>
        <a href="${item.dataUrl}" download="photoist_pro_${item.id}.jpg" class="text-rose-600 font-bold hover:underline">저장</a>
      </div>
    </div>
  `).join('');
}

function openArchivePreview(url) {
  const w = window.open('');
  if (w) {
    w.document.write(`<body style="margin:0;background:#f8fafc;display:flex;justify-content:center;align-items:center;min-height:100vh;"><img src="${url}" style="max-height:92vh;box-shadow:0 20px 40px rgba(0,0,0,0.15);border-radius:12px;"></body>`);
  }
}

function openNoticeBoardModal() {
  alert("[Photoist Pro v1.0 정식 안내]\n\n• 클린 화이트 스튜디오 테마 전면 적용\n• 1×4 가로 모드 & 2×2 세로 모드 자이로 방향 가이드\n• 4/6/8초 가변 간격 & 6컷 고정 연속 촬영\n• 4·5·6컷 가변 슬롯 & 지그재그 테마\n• 0.1배~5.0배 무제한 핀치 줌 & 패닝 통합 엔진\n• 15Mbps 무빙 영상 엔진 & 다운로드 QR 사진 자동 합성");
}

// ========================================================
// 20. 실행취소(Undo/Redo), 뷰포트 dvh 보정 & 초기 구동 엔트리포인트
// ========================================================
function saveStateForUndo() {
  const snapshot = JSON.stringify({
    stickers: appState.stickers,
    shootingMode: appState.shootingMode,
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

window.addEventListener('DOMContentLoaded', () => {
  updateAppVh();
  initCanvasInteractions();
  setupCanvasPinchZoom();

  // 저장된 인증 계정 복원
  const savedUser = localStorage.getItem('photoist_pro_auth_user');
  if (savedUser) {
    try {
      appState.currentUser = JSON.parse(savedUser);
      if (appState.currentUser && appState.currentUser.userId === 'knsupolo') {
        appState.isAdmin = true;
      }
      updateAuthUI();
    } catch (e) {}
  }

  // 초기 렌더링
  if (typeof renderStrip === 'function') {
    renderStrip();
  }
});
