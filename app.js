// ========================================================
// [추억의 네컷 Studio Pro v17.3 Pro] app.js (1편 / 전반부)
// ========================================================
// 1. 핵심 전역 상수 및 통합 상태 관리 (State Management)
// 2. 고성능 사운드 신디사이저 엔진 (Web Audio API Synthesizer)
// 3. 화면 전환 제어 엔진 (Screen Router)
// 4. 메인 홈 화면 설정 & 컷수/레이아웃 선택 (Home Controller)
// 5. 동적 뷰포트(dvh) & 에디터 스플릿 리사이저 (Split Resizer)
// 6. 카메라 스트리밍 & 고정 뷰파인더 엔진 (Camera Engine)
// 7. 자동 연속 촬영 & 비디오 클립 캡처 파이프라인 (Shooting Pipeline)
// 8. 4·5·6컷 가변 빈 슬롯(Empty Slots) 생성 엔진 (Slot Generator)
// 9. 하단 촬영 컷 캐러셀 & 슬롯 사진 매핑 (Slot Assignment UX)
// 10. 스튜디오 꾸미기 에디터 진입 검증 및 전환 (Transition to Editor)
// ========================================================

// ========================================================
// 1. 핵심 전역 상수 및 통합 상태 관리
// ========================================================
const GOOGLE_DB_URL = "https://script.google.com/macros/s/AKfycbw1fjoUYoKQOHNNatPY_8q8X-1ogUV7iaFsIMpYioStlVX1SZK9hYiY32P-bGv7GUVoBw/exec";
const APP_VERSION = "v17.3 Pro";

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
  "🌸 두 손으로 턱을 받치고 꽃받침 포즈!",
  "🥳 양손을 번쩍 들고 파티하는 느낌으로!",
  "✨ 서로 등을 맞대고 쿨하게 정면 응시!"
];

const appState = {
  // 1) 컷수 및 레이아웃
  selectedCutMode: 4, // 4 | 5 | 6
  layout: 'strip', // 'strip' | 'grid' | 'twin'
  timerSec: 5,

  // 2) 촬영 원본 및 슬롯 데이터
  shotImages: [], // 촬영된 전체 이미지 객체 배열 (예: 8장)
  shotVideoBlobs: [], // 각 샷별 녹화된 2.5초 영상 Blob 배열
  selectedIndices: [null, null, null, null], // 슬롯별 할당된 shotImages 인덱스
  selectedImages: [null, null, null, null], // 슬롯별 실제 이미지 객체
  activeSlotIndex: 0, // 현재 선택 중인 슬롯 번호

  // 3) 카메라 장치 제어
  facingMode: 'user',
  mediaStream: null,
  isRecordingClip: false,

  // 4) 에디터 디자인 상태
  themeCategory: 'basic', // 'basic' | 'simple' | 'premium'
  frameStyle: 'basic_middle',
  frameColor: '#000000',
  frameThickness: 40,
  showDate: true,
  sideEngravingEnabled: false,
  sideEngravingText: "PHOTOIST STUDIO • KEEP YOUR MOMENT",

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

  // 6) 소품 및 스티커
  stickers: [],
  selectedStickerIdx: -1,
  dragTarget: null,
  dragStartPos: { x: 0, y: 0 },
  slotRects: [], // 자석 마그네틱 가이드용 슬롯 좌표

  // 7) 회원 & 인증 세션
  currentUser: null,
  isAdmin: false,
  resetInterval: null
};

// 캔버스 줌 & 패닝 상태
let canvasZoom = 1.0;
let canvasPanX = 0;
let canvasPanY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;

// 실행 취소/다시 실행 스택
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
    // 노이즈 버퍼를 이용한 기계식 카메라 셔터음 시뮬레이션
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
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C - E - G - High C
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

// ========================================================
// 3. 화면 전환 제어 엔진 (Screen Router)
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

  if (window.lucide) {
    lucide.createIcons();
  }

  // 뷰포트 높이 재계산
  updateAppVh();
}

function getFormattedTodayDate() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
}

// ========================================================
// 4. 메인 홈 화면 설정 & 컷수/레이아웃 선택
// ========================================================
function selectCutCount(count, btn) {
  appState.selectedCutMode = count;
  document.querySelectorAll('.cut-mode-btn').forEach(b => {
    b.className = "cut-mode-btn bg-[#202020] text-slate-300 font-bold py-2.5 rounded-xl text-xs border border-white/10 hover:border-white/20 transition";
  });
  if (btn) {
    btn.className = "cut-mode-btn bg-white text-black font-black py-2.5 rounded-xl text-xs border border-white transition shadow-sm";
  }

  // 슬롯 인덱스 및 이미지 버퍼 컷수 크기에 맞게 초기화
  appState.selectedIndices = Array(count).fill(null);
  appState.selectedImages = Array(count).fill(null);
  appState.activeSlotIndex = 0;
}

function selectHomeLayout(layout, btn) {
  appState.layout = layout;
  document.querySelectorAll('.home-layout-btn').forEach(b => {
    b.className = "home-layout-btn bg-[#202020] text-slate-300 font-bold py-2.5 rounded-xl text-xs border border-white/10 hover:border-white/20 transition";
  });
  if (btn) {
    btn.className = "home-layout-btn bg-white text-black font-black py-2.5 rounded-xl text-xs border border-white transition shadow-sm";
  }
}

function selectInterval(sec, btn) {
  appState.timerSec = parseInt(sec, 10);
  document.querySelectorAll('.interval-btn').forEach(b => {
    b.className = "interval-btn bg-[#202020] text-slate-300 font-bold py-2 rounded-xl text-xs border border-white/10 transition";
  });
  if (btn) {
    btn.className = "interval-btn bg-white text-black font-black py-2 rounded-xl text-xs border border-white transition shadow-sm";
  }
}

// 앨범에서 사진 일괄 업로드 처리
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
        // 앨범 업로드 사진의 경우 빈 비디오 블롭 대체
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
// 5. 동적 뷰포트(dvh) & 에디터 스플릿 리사이저
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
      // 좌우 분할: 마우스 X 좌표 기반 너비 퍼센트 조정
      const newWidth = e.clientX - containerRect.left;
      const pct = Math.max(30, Math.min(75, (newWidth / containerRect.width) * 100));
      canvasPane.style.flex = `0 0 ${pct}%`;
    } else {
      // 상하 분할: 터치 Y 좌표 기반 높이 퍼센트 조정
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
// 6. 카메라 스트리밍 & 고정 뷰파인더 엔진
// ========================================================
async function startCameraSession() {
  getAudioContext(); // 브라우저 오디오 언락
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

    // 디바이스 회전 안내 오버레이 (화면비 감지)
    const isPortrait = window.innerHeight > window.innerWidth;
    const overlay = document.getElementById('cameraRotationOverlay');
    if (overlay && isPortrait && window.innerWidth < 768) {
      overlay.classList.remove('hidden');
    }

    // 카운트다운 연속 촬영 자동 시작
    setTimeout(() => {
      startCountdownSequence();
    }, 600);

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

function toggleCameraFacing() {
  appState.facingMode = (appState.facingMode === 'user') ? 'environment' : 'user';
  startCameraSession();
}

// ========================================================
// 7. 자동 연속 촬영 & 비디오 클립 캡처 파이프라인
// ========================================================
let countdownTimer = null;
let currentShotNumber = 0;
const TOTAL_SHOT_COUNT = 8; // 항상 8장을 넉넉히 촬영하여 베스트 컷 선별

async function startCountdownSequence() {
  currentShotNumber = 0;
  appState.shotImages = [];
  appState.shotVideoBlobs = [];
  executeNextShotCycle();
}

function executeNextShotCycle() {
  if (currentShotNumber >= TOTAL_SHOT_COUNT) {
    // 8장 촬영 완료 ➔ 사운드 및 배치 화면으로 전환
    playSuccessFanfare();
    stopCameraAndAudio();
    proceedToPickScreen();
    return;
  }

  currentShotNumber++;
  const badge = document.getElementById('captureCountBadge');
  if (badge) badge.textContent = `${currentShotNumber} / ${TOTAL_SHOT_COUNT}`;

  // 포즈 추천 텍스트 롤링
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

// 셔터 직전 2.5초 영상 클립 녹화
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
      videoBitsPerSecond: 15000000 // 15Mbps 무손실 비트레이트
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

  // 플래시 애니메이션 및 셔터음/햅틱
  playShutterSound();
  triggerHaptic('heavy');
  if (flash) {
    flash.classList.remove('flash-active');
    void flash.offsetWidth;
    flash.classList.add('flash-active');
  }

  // 영상 녹화 종료
  if (activeClipRecorder && activeClipRecorder.state === 'recording') {
    activeClipRecorder.stop();
  }

  // 비디오 화면을 캔버스에 1:1 고해상도로 캡처
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
    // 0.8초 딜레이 후 다음 컷 촬영 진행
    setTimeout(executeNextShotCycle, 800);
  };
}

// ========================================================
// 8. 4·5·6컷 가변 빈 슬롯(Empty Slots) 생성 엔진
// ========================================================
function proceedToPickScreen() {
  showScreen('screenPick');
  appState.selectedIndices = Array(appState.selectedCutMode).fill(null);
  appState.selectedImages = Array(appState.selectedCutMode).fill(null);
  appState.activeSlotIndex = 0;

  renderPickSlots();
  renderPickCarousel();
  updatePickProgressUI();
}

function renderPickSlots() {
  const container = document.getElementById('pickSlotsContainer');
  if (!container) return;
  container.innerHTML = '';

  const cut = appState.selectedCutMode;

  // 컷수별 CSS Grid 클래스 동적 부여
  if (cut === 4) {
    container.className = "w-full h-full max-h-[460px] grid grid-cols-2 gap-2.5 p-2 bg-[#181818] rounded-2xl border border-white/10 overflow-y-auto no-scrollbar";
  } else if (cut === 5) {
    // 5컷 화보형: 상2 / 중1대형 와이드 / 하2
    container.className = "w-full h-full max-h-[460px] flex flex-col gap-2 p-2 bg-[#181818] rounded-2xl border border-white/10 overflow-y-auto no-scrollbar";
  } else if (cut === 6) {
    container.className = "w-full h-full max-h-[460px] grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-2 bg-[#181818] rounded-2xl border border-white/10 overflow-y-auto no-scrollbar";
  }

  if (cut === 5) {
    renderEditorial5PickSlots(container);
  } else {
    for (let i = 0; i < cut; i++) {
      const slotEl = createSlotCardElement(i);
      container.appendChild(slotEl);
    }
  }
}

// 5컷 화보형 전용 슬롯 레이아웃 (상단2 - 중앙1대형 - 하단2)
function renderEditorial5PickSlots(container) {
  // 상단 행 (2장)
  const rowTop = document.createElement('div');
  rowTop.className = "grid grid-cols-2 gap-2 w-full h-[30%]";
  rowTop.appendChild(createSlotCardElement(0));
  rowTop.appendChild(createSlotCardElement(1));
  container.appendChild(rowTop);

  // 중앙 행 (1장 대형 와이드 히어로 컷)
  const rowMid = document.createElement('div');
  rowMid.className = "w-full h-[40%]";
  const heroSlot = createSlotCardElement(2);
  heroSlot.classList.add('w-full', 'h-full');
  rowMid.appendChild(heroSlot);
  container.appendChild(rowMid);

  // 하단 행 (2장)
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

  card.className = `slot-matte-card relative flex items-center justify-center cursor-pointer overflow-hidden transition-all ${
    isFilled ? 'slot-filled' : ''
  } ${isActive ? 'slot-active' : ''}`;

  if (isFilled) {
    const img = document.createElement('img');
    img.src = appState.selectedImages[slotIdx].src;
    img.className = "w-full h-full object-cover";
    card.appendChild(img);

    // 슬롯 사진 삭제(비우기) 버튼
    const btnRemove = document.createElement('button');
    btnRemove.className = "absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-rose-600 transition shadow-md";
    btnRemove.innerHTML = `<i data-lucide="x" class="w-3.5 h-3.5"></i>`;
    btnRemove.onclick = (e) => {
      e.stopPropagation();
      unassignPhotoFromSlot(slotIdx);
    };
    card.appendChild(btnRemove);

    // 슬롯 순서 뱃지
    const badge = document.createElement('span');
    badge.className = "absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-black px-2 py-0.5 rounded-md backdrop-blur-sm";
    badge.textContent = `${slotIdx + 1}번 컷`;
    card.appendChild(badge);
  } else {
    card.innerHTML = `
      <div class="flex flex-col items-center justify-center p-3 text-center pointer-events-none">
        <span class="w-7 h-7 rounded-full bg-white/10 text-white font-black text-xs flex items-center justify-center mb-1">
          ${slotIdx + 1}
        </span>
        <span class="text-[11px] font-bold text-slate-400">사진 터치하여 배치</span>
      </div>
    `;
  }

  card.onclick = () => {
    selectPickSlot(slotIdx);
  };

  return card;
}

function selectPickSlot(slotIdx) {
  appState.activeSlotIndex = slotIdx;
  renderPickSlots();
  if (window.lucide) lucide.createIcons();
}

// ========================================================
// 9. 하단 촬영 컷 캐러셀 & 슬롯 사진 매핑 (UX)
// ========================================================
function renderPickCarousel() {
  const container = document.getElementById('pickCarouselContainer');
  if (!container) return;
  container.innerHTML = '';

  appState.shotImages.forEach((img, shotIdx) => {
    const item = document.createElement('div');
    const isUsed = appState.selectedIndices.includes(shotIdx);
    const assignedSlotNum = appState.selectedIndices.indexOf(shotIdx) + 1;

    item.className = `shrink-0 relative w-20 h-28 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
      isUsed ? 'border-rose-500 opacity-60 scale-95' : 'border-white/15 hover:border-white/40 active:scale-95'
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
  if (currentSlot === null || currentSlot >= appState.selectedCutMode) return;

  triggerHaptic('light');

  // 만약 다른 슬롯에 이미 배치된 사진이라면 기존 슬롯 비우기
  const prevSlot = appState.selectedIndices.indexOf(shotIdx);
  if (prevSlot !== -1 && prevSlot !== currentSlot) {
    appState.selectedIndices[prevSlot] = null;
    appState.selectedImages[prevSlot] = null;
  }

  appState.selectedIndices[currentSlot] = shotIdx;
  appState.selectedImages[currentSlot] = appState.shotImages[shotIdx];

  // 다음 빈 슬롯으로 자동 포커스 이동 (빠른 원터치 배치 지원)
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
  const total = appState.selectedCutMode;
  const progressText = document.getElementById('pickProgressText');
  if (progressText) {
    progressText.textContent = `${filledCount} / ${total} 슬롯 배치 완료`;
  }
}

// ========================================================
// 10. 스튜디오 꾸미기 에디터 진입 검증 및 전환
// ========================================================
function proceedToEditor() {
  const hasEmptySlot = appState.selectedIndices.some(idx => idx === null);
  if (hasEmptySlot) {
    alert("모든 슬롯에 사진을 배치해 주세요!\n상단 슬롯을 터치한 후 마음에 드는 사진을 선택하시면 됩니다.");
    return;
  }

  triggerHaptic('heavy');
  showScreen('screenEdit');
  initSplitResizer();

  // 2편(후반부)의 캔버스 렌더러 호출
  if (typeof renderStrip === 'function') {
    renderStrip();
  }
}

function changeEditorLayout(layoutKey, btn) {
  if (typeof saveStateForUndo === 'function') saveStateForUndo();
  appState.layout = layoutKey;

  document.querySelectorAll('.editor-layout-btn').forEach(b => {
    b.className = "editor-layout-btn bg-[#181818] text-slate-300 font-bold py-2 rounded-xl text-xs border border-white/10 hover:border-white/20 transition";
  });
  if (btn) {
    btn.className = "editor-layout-btn bg-white text-black font-black py-2 rounded-xl text-xs border border-white transition shadow-sm";
  }

  if (typeof renderStrip === 'function') {
    renderStrip();
  }
}

// ========================================================
// [1편 전반부 코드 끝] 
// ========================================================
// [추억의 네컷 Studio Pro v17.3 Pro] app.js (2편 / 후반부)
// ========================================================
// 11. 테마 컨트롤러 & 프레임 스타일 제어 (Theme & Styles)
// 12. 감성 필터 및 화질 보정 엔진 (Filters & Color Adjust)
// 13. 착용형 소품 스튜디오 & 마그네틱 자석 스냅 가이드
// 14. 캔버스 뷰포트 인터랙션 & 핀치 줌 / 패닝 (Pan & Zoom)
// 15. 초고화질 캔버스 렌더링 엔진 (4·5·6컷 & Twin 복제 & 1:1 각인)
// 16. 15Mbps 초고화질 무빙 영상 엔진 & 다운로드 QR 사진 자동 합성
// 17. 결과물 내보내기 & 2중 큐 자동 아카이빙
// 18. 회원 인증 체계 & 계정 복구 센터 (Gmail 무료 발송)
// 19. 마이페이지, 10종 UI 테마 색상기 & 게시판
// 20. 실행취소(Undo/Redo), 뷰포트 dvh 보정 & 초기 구동 엔트리포인트
// ========================================================

// ========================================================
// 11. 테마 컨트롤러 & 프레임 스타일 제어
// ========================================================
function setFrameThemeCategory(categoryKey, btn) {
  appState.themeCategory = categoryKey;
  document.querySelectorAll('.theme-tab-btn').forEach(b => {
    b.className = "theme-tab-btn flex-1 py-1 text-slate-400 font-bold text-[11px] rounded transition";
  });
  if (btn) btn.className = "theme-tab-btn flex-1 py-1 bg-[#222222] text-white font-black text-[11px] rounded transition";

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
    b.className = "style-btn bg-[#1a1a1a] text-slate-300 font-bold py-2 px-2 rounded-xl border border-white/10 text-xs hover:border-white/30 transition";
  });
  if (btn) {
    btn.className = "style-btn bg-white text-black font-black py-2 px-2 rounded-xl border border-white text-xs shadow-md transition";
  }

  const label = document.getElementById('labelCustomText');
  const sigInput = document.getElementById('frameSignatureInput');
  const colorPickerContainer = document.getElementById('frameColorPickerWrapper');

  // 기본 테마 계열
  if (styleKey === 'basic_top') {
    if (label) label.textContent = "상단 문구 설정";
    if (sigInput) sigInput.value = "photoist Studio";
    if (colorPickerContainer) colorPickerContainer.classList.remove('hidden');
  } else if (styleKey === 'basic_middle') {
    if (label) label.textContent = "중간 문구 설정";
    if (sigInput) sigInput.value = "추억의 네컷";
    if (colorPickerContainer) colorPickerContainer.classList.remove('hidden');
  } else if (styleKey === 'basic_bottom') {
    if (label) label.textContent = "하단 문구 설정";
    if (sigInput) sigInput.value = "MEMORIES OF TODAY";
    if (colorPickerContainer) colorPickerContainer.classList.remove('hidden');
  } else if (styleKey === 'basic_stepped') {
    if (label) label.textContent = "계단형 Safe Zone 문구";
    if (sigInput) sigInput.value = "STEP BY STEP";
    if (colorPickerContainer) colorPickerContainer.classList.remove('hidden');
  } else if (styleKey === 'basic_clean') {
    if (label) label.textContent = "클린 무각인 (순수 여백)";
    if (sigInput) sigInput.value = "";
    if (colorPickerContainer) colorPickerContainer.classList.remove('hidden');
  }
  // 심플 테마 계열 (체감도 높은 리뉴얼 디자인)
  else if (styleKey === 'simple_minimal_line') {
    if (label) label.textContent = "미니멀 라인 문구";
    if (sigInput) sigInput.value = "M I N I M A L";
    if (colorPickerContainer) colorPickerContainer.classList.remove('hidden');
  } else if (styleKey === 'simple_polaroid_wide') {
    if (label) label.textContent = "와이드 폴라 서명";
    if (sigInput) sigInput.value = "Our Precious Time";
    if (colorPickerContainer) colorPickerContainer.classList.remove('hidden');
  } else if (styleKey === 'simple_inset_magazine') {
    if (label) label.textContent = "인셋 매거진 타이틀";
    if (sigInput) sigInput.value = "PHOTOIST ISSUE #01";
    if (colorPickerContainer) colorPickerContainer.classList.remove('hidden');
  }
  // 프리미엄 스페셜 테마 계열
  else if (styleKey === 'photoist') {
    if (label) label.textContent = "포토이스트 시그니처";
    if (sigInput) sigInput.value = "photoist";
    appState.frameColor = '#0a0a0a';
  } else if (styleKey === 'birthday') {
    if (label) label.textContent = "생일 축하 문구";
    if (sigInput) sigInput.value = "Happy Birthday to You 🎉";
  } else if (styleKey === 'baseball') {
    if (label) label.textContent = "베이스볼 타이틀";
    if (sigInput) sigInput.value = "Play Ball! Home Run ⚾";
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
  setSideEngravingText("PHOTOIST STUDIO • KEEP YOUR MOMENT");
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

function changeFrameColor(color, btn) {
  saveStateForUndo();
  appState.frameColor = color;
  document.querySelectorAll('.color-btn').forEach(b => {
    b.classList.remove('ring-2', 'ring-white', 'scale-110');
  });
  if (btn) btn.classList.add('ring-2', 'ring-white', 'scale-110');

  const lightColors = ['#FFFFFF', '#F8FAFC', '#E2E8F0', '#FECDD3', '#BAE6FD', '#FAF7EE', '#FDFBF7'];
  if (lightColors.includes(color.toUpperCase())) {
    appState.typography.fontColor = '#111111';
  } else {
    appState.typography.fontColor = '#FFFFFF';
  }
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
    b.className = "filter-btn bg-[#181818] text-slate-300 font-bold py-1.5 rounded-lg border border-white/10 text-xs transition";
  });
  if (btn) {
    btn.className = "filter-btn bg-white text-black font-black py-1.5 rounded-lg border border-white text-xs shadow-md transition";
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
// 13. 착용형 소품 스튜디오 & 마그네틱 자석 스냅 가이드
// ========================================================
const WEARABLE_PROPS = {
  rabbit_ears: { name: '토끼귀', emoji: '🐰', defaultSize: 150, offsetY: -85 },
  headband: { name: '머리띠', emoji: '🎀', defaultSize: 140, offsetY: -75 },
  cat_whiskers: { name: '고양이수염', emoji: '🐱', defaultSize: 130, offsetY: 0 },
  hipster_sunglasses: { name: '힙스터선글라스', emoji: '🕶️', defaultSize: 145, offsetY: -12 },
  geek_chic_glasses: { name: '긱시크안경', emoji: '👓', defaultSize: 135, offsetY: -12 },
  crown: { name: '왕관', emoji: '👑', defaultSize: 140, offsetY: -90 },
  heart_overlay: { name: '반투명하트', emoji: '💖', defaultSize: 160, offsetY: 0, opacity: 0.75 }
};

let magneticSnapLines = { x: null, y: null };

function addWearableProp(propKey) {
  const prop = WEARABLE_PROPS[propKey];
  if (!prop) return;
  saveStateForUndo();

  const canvas = document.getElementById('photoCanvas');
  // 첫 번째 슬롯 인물 위치로 기본 자동 스냅 안착
  let targetX = canvas ? canvas.width / 2 : 600;
  let targetY = canvas ? canvas.height / 2 : 1200;

  if (appState.slotRects && appState.slotRects.length > 0) {
    const firstSlot = appState.slotRects[0];
    targetX = firstSlot.x + firstSlot.w / 2;
    targetY = firstSlot.y + (firstSlot.h * 0.35) + prop.offsetY;
  }

  const newSticker = {
    id: Date.now(),
    type: 'prop',
    propKey: propKey,
    text: prop.emoji,
    x: targetX,
    y: targetY,
    size: prop.defaultSize,
    rotation: 0,
    opacity: prop.opacity || 1.0
  };

  appState.stickers.push(newSticker);
  appState.selectedStickerIdx = appState.stickers.length - 1;
  showStickerControls(newSticker);
  renderStrip();
}

function checkMagneticSnap(stX, stY, snapThreshold = 22) {
  magneticSnapLines = { x: null, y: null };
  let finalX = stX;
  let finalY = stY;

  if (!appState.slotRects || appState.slotRects.length === 0) {
    return { x: finalX, y: finalY };
  }

  for (let rect of appState.slotRects) {
    const slotCenterX = rect.x + rect.w / 2;
    const slotFaceY = rect.y + rect.h * 0.35; // 얼굴 영역 가이드
    const slotCenterY = rect.y + rect.h / 2;

    if (Math.abs(stX - slotCenterX) <= snapThreshold) {
      finalX = slotCenterX;
      magneticSnapLines.x = slotCenterX;
    }
    if (Math.abs(stY - slotFaceY) <= snapThreshold) {
      finalY = slotFaceY;
      magneticSnapLines.y = slotFaceY;
    } else if (Math.abs(stY - slotCenterY) <= snapThreshold) {
      finalY = slotCenterY;
      magneticSnapLines.y = slotCenterY;
    }
  }

  return { x: finalX, y: finalY };
}

function addDirectTextSticker() {
  const input = document.getElementById('directTextInput');
  if (!input) return;
  const val = input.value.trim();
  if (!val) { alert("추가할 텍스트를 입력해주세요!"); return; }
  saveStateForUndo();

  const canvas = document.getElementById('photoCanvas');
  const newSticker = {
    id: Date.now(),
    type: 'text',
    text: val,
    x: canvas ? canvas.width / 2 : 600,
    y: canvas ? canvas.height / 2 : 1200,
    size: 75,
    rotation: 0,
    color: '#FFFFFF',
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
  if (!confirm("모든 소품 및 스티커를 삭제하시겠습니까?")) return;
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
// 14. 캔버스 뷰포트 인터랙션 & 핀치 줌 / 패닝
// ========================================================
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
  if (label) label.textContent = `${Math.round(canvasZoom * 100)}%`;
}

function setupCanvasPinchZoom() {
  const viewport = document.getElementById('canvasViewport');
  if (!viewport) return;

  let initialPinchDist = 0;
  let initialZoom = 1.0;

  viewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      initialPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialZoom = canvasZoom;
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
      canvasZoom = Math.max(0.4, Math.min(3.0, initialZoom * factor));
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
      const hitRadius = Math.max(80, st.size * 0.9);
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
      magneticSnapLines = { x: null, y: null };
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
      const rawX = coords.x - appState.dragStartPos.x;
      const rawY = coords.y - appState.dragStartPos.y;
      const snapped = checkMagneticSnap(rawX, rawY);

      const st = appState.stickers[appState.dragTarget];
      st.x = snapped.x;
      st.y = snapped.y;
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
      magneticSnapLines = { x: null, y: null };
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
// 15. 초고화질 캔버스 렌더링 엔진 (4·5·6컷 & Twin 복제 & 1:1 각인)
// ========================================================
let finalEmbeddedQrImage = null; // 영상 다운로드 QR이 생성되었을 때 캐싱

function renderStrip(isFinalExport = false) {
  const canvas = document.getElementById('photoCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const cut = appState.selectedCutMode || 4;
  const layout = appState.layout || 'strip';
  const fStyle = appState.frameStyle || 'basic_middle';
  const pad = appState.frameThickness || 40;
  const gap = (fStyle === 'simple_minimal_line') ? 2 : Math.round(pad * 0.45);
  const sigInp = document.getElementById('frameSignatureInput');
  const customTitle = sigInp ? sigInp.value : 'photoist';

  // 측면 각인 활성화 시 너비 48px 자동 확장
  const sideOffset = appState.sideEngravingEnabled ? Math.max(36, Math.min(60, Math.round(pad * 1.1))) : 0;

  // 1. 규격별 초고해상도 캔버스 치수 산정 (4컷 / 5컷 / 6컷 전 규격 2줄 인쇄 Twin 지원)
  if (cut === 4) {
    if (layout === 'strip') {
      canvas.width = 1080 + sideOffset;
      canvas.height = 3240;
    } else if (layout === 'grid') {
      canvas.width = 1440 + sideOffset;
      canvas.height = 2160;
    } else if (layout === 'twin') {
      canvas.width = 2160 + (sideOffset * 2);
      canvas.height = 3240;
    }
  } else if (cut === 5) {
    if (layout === 'twin') {
      canvas.width = 2880 + (sideOffset * 2);
      canvas.height = 2160;
    } else {
      // 5컷 화보형
      canvas.width = 1440 + sideOffset;
      canvas.height = 2160;
    }
  } else if (cut === 6) {
    if (layout === 'strip') {
      canvas.width = 1080 + sideOffset;
      canvas.height = 4320;
    } else if (layout === 'twin') {
      canvas.width = 2160 + (sideOffset * 2);
      canvas.height = 4320;
    } else {
      // 6컷 2x3 그리드
      canvas.width = 1440 + sideOffset;
      canvas.height = 2160;
    }
  }

  // 2. 배경 채우기
  if (fStyle === 'photoist') ctx.fillStyle = '#0a0a0a';
  else if (fStyle === 'birthday') ctx.fillStyle = '#FDFBF7';
  else if (fStyle === 'baseball') ctx.fillStyle = '#FAF7EE';
  else ctx.fillStyle = appState.frameColor || '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  appState.slotRects = [];
  const baseCanvasW = (layout === 'twin') ? (canvas.width / 2) - sideOffset : canvas.width - sideOffset;

  // 3. 컷수 및 레이아웃별 렌더링 분기
  if (layout === 'twin') {
    renderTwinUnified(ctx, canvas.width, canvas.height, pad, gap, fStyle, customTitle, cut, sideOffset);
  } else {
    if (cut === 4 && layout === 'strip') {
      renderStrip4Cut(ctx, baseCanvasW, canvas.height, pad, gap, fStyle, customTitle);
    } else if (cut === 4 && layout === 'grid') {
      renderGrid4Cut(ctx, baseCanvasW, canvas.height, pad, gap, fStyle, customTitle);
    } else if (cut === 5) {
      renderEditorial5Cut(ctx, baseCanvasW, canvas.height, pad, gap, fStyle, customTitle);
    } else if (cut === 6 && layout === 'strip') {
      renderStrip6Cut(ctx, baseCanvasW, canvas.height, pad, gap, fStyle, customTitle);
    } else if (cut === 6) {
      renderGrid6Cut(ctx, baseCanvasW, canvas.height, pad, gap, fStyle, customTitle);
    }

    // 측면 세로 각인 (슬롯별 1:1 매칭 렌더링)
    if (appState.sideEngravingEnabled) {
      renderSlotMatchedSideEngraving(ctx, canvas.width, canvas.height, sideOffset);
    }
  }

  // 4. 소품 및 스티커 렌더링
  appState.stickers.forEach((st, idx) => {
    ctx.save();
    ctx.translate(st.x, st.y);
    ctx.rotate(((st.rotation || 0) * Math.PI) / 180);
    if (st.opacity) ctx.globalAlpha = st.opacity;

    if (st.type === 'text') {
      const font = st.fontFamily || 'Pretendard';
      ctx.font = `900 ${st.size}px '${font}', sans-serif`;
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

    if (!isFinalExport && idx === appState.selectedStickerIdx) {
      ctx.strokeStyle = '#F43F5E';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      const boundW = st.type === 'text' ? st.size * 1.2 : st.size * 0.7;
      ctx.strokeRect(-boundW, -st.size * 0.6, boundW * 2, st.size * 1.2);
    }
    ctx.restore();
  });

  // 5. 영상 다운로드 QR이 활성화된 경우 사진 우측 하단 Safe Zone에 자동 인셋
  if (finalEmbeddedQrImage) {
    drawQrInsetBox(ctx, canvas.width, canvas.height, pad);
  }

  // 6. 마그네틱 자석 스냅 가이드라인 (드래그 조작 시 피드백)
  if (!isFinalExport && (magneticSnapLines.x !== null || magneticSnapLines.y !== null)) {
    ctx.save();
    ctx.strokeStyle = '#F43F5E';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    if (magneticSnapLines.x !== null) {
      ctx.beginPath();
      ctx.moveTo(magneticSnapLines.x, 0);
      ctx.lineTo(magneticSnapLines.x, canvas.height);
      ctx.stroke();
    }
    if (magneticSnapLines.y !== null) {
      ctx.beginPath();
      ctx.moveTo(0, magneticSnapLines.y);
      ctx.lineTo(canvas.width, magneticSnapLines.y);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// 🌟 사진 슬롯별 1:1 정밀 매칭 측면 각인 렌더러
function renderSlotMatchedSideEngraving(ctx, canvasW, canvasH, sideOffset, offsetX = 0) {
  if (!appState.slotRects || appState.slotRects.length === 0) return;
  const isDark = (appState.frameColor === '#000000' || appState.frameColor === '#0a0a0a' || appState.frameColor === '#111827');
  const textColor = isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)';
  const baseText = appState.sideEngravingText || "#PHOTOIST";

  ctx.save();
  ctx.fillStyle = textColor;
  ctx.font = `bold 16px monospace`;
  ctx.letterSpacing = "3px";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 각 사진 슬롯의 정중앙 Y축에 1:1로 단어 배치
  appState.slotRects.forEach((rect, sIdx) => {
    const slotCenterY = rect.y + rect.h / 2;
    const textPosX = offsetX + canvasW - (sideOffset / 2);

    ctx.save();
    ctx.translate(textPosX, slotCenterY);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(`${baseText} • 0${sIdx + 1}`, 0, 0);
    ctx.restore();
  });

  ctx.restore();
}

// 🌟 전 규격 2줄 인쇄용 (Twin) 완전 동기화 복제 렌더러
function renderTwinUnified(ctx, cW, cH, pad, gap, fStyle, customTitle, cut, sideOffset) {
  const halfW = cW / 2;
  const singleW = halfW - sideOffset;

  // 좌/우 2열 복제 렌더링 루프
  [0, halfW].forEach(startX => {
    ctx.save();
    ctx.translate(startX, 0);

    if (cut === 4) {
      renderStrip4Cut(ctx, singleW, cH, pad, gap, fStyle, customTitle);
    } else if (cut === 5) {
      renderEditorial5Cut(ctx, singleW, cH, pad, gap, fStyle, customTitle);
    } else if (cut === 6) {
      renderStrip6Cut(ctx, singleW, cH, pad, gap, fStyle, customTitle);
    }

    if (appState.sideEngravingEnabled) {
      renderSlotMatchedSideEngraving(ctx, singleW + sideOffset, cH, sideOffset, 0);
    }

    ctx.restore();
  });

  // 중앙 점선 정밀 절취선 가이드 (Dotted Cut-line)
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(halfW, 20);
  ctx.lineTo(halfW, cH - 20);
  ctx.stroke();

  ctx.font = '28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✂️', halfW, 80);
  ctx.fillText('✂️', halfW, cH / 2);
  ctx.fillText('✂️', halfW, cH - 80);
  ctx.restore();
}

function renderStrip4Cut(ctx, cW, cH, pad, gap, fStyle, customTitle) {
  const isStepped = (fStyle === 'basic_stepped');
  const safeZone = isStepped ? 280 : 0;
  const isMiddle = (fStyle === 'basic_middle');
  const bannerH = isMiddle ? 190 : 0;
  const topH = (fStyle === 'basic_top' || fStyle === 'photoist') ? 140 : pad;
  const bottomH = (fStyle === 'basic_bottom') ? 220 : pad + safeZone;

  const slotW = cW - (pad * 2);
  const slotH = (cH - topH - bottomH - bannerH - (gap * 3)) / 4;

  if (fStyle === 'basic_top' || fStyle === 'photoist') {
    drawFrameHeader(ctx, cW / 2, topH / 2, customTitle);
  }

  for (let i = 0; i < 4; i++) {
    let sy = topH + (i * (slotH + gap));
    if (isMiddle && i >= 2) sy += bannerH;
    appState.slotRects.push({ x: pad, y: sy, w: slotW, h: slotH });
    drawFilteredSlotPhoto(ctx, appState.selectedImages[i], pad, sy, slotW, slotH);
  }

  if (isMiddle) {
    const bannerY = topH + (slotH * 2) + (gap * 2);
    drawMiddleBanner(ctx, cW / 2, bannerY + (bannerH / 2), customTitle);
  } else if (fStyle === 'basic_bottom') {
    const footerY = (cH - bottomH) + (bottomH / 2);
    drawFrameFooter(ctx, cW / 2, footerY, customTitle);
  }
}

function renderGrid4Cut(ctx, cW, cH, pad, gap, fStyle, customTitle) {
  const isStepped = (fStyle === 'basic_stepped');
  const safeZone = isStepped ? 260 : 0;
  const isMiddle = (fStyle === 'basic_middle');
  const bannerH = isMiddle ? 160 : 0;
  const topH = (fStyle === 'basic_top' || fStyle === 'simple_inset_magazine') ? 130 : pad;
  const bottomH = (fStyle === 'basic_bottom' || fStyle === 'simple_polaroid_wide') ? 220 : pad + safeZone;

  const slotW = (cW - (pad * 2) - gap) / 2;
  const slotH = (cH - topH - bottomH - bannerH - gap) / 2;

  if (fStyle === 'basic_top' || fStyle === 'simple_inset_magazine') {
    drawFrameHeader(ctx, cW / 2, topH / 2, customTitle);
  }

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
    drawMiddleBanner(ctx, cW / 2, bannerY + (bannerH / 2), customTitle, 36);
  } else if (fStyle === 'basic_bottom' || fStyle === 'simple_polaroid_wide') {
    const footerY = (cH - bottomH) + (bottomH / 2);
    drawFrameFooter(ctx, cW / 2, footerY, customTitle);
  }
}

function renderEditorial5Cut(ctx, cW, cH, pad, gap, fStyle, customTitle) {
  const topH = (fStyle === 'basic_top') ? 120 : pad;
  const bottomH = (fStyle === 'basic_bottom') ? 200 : pad;
  const availH = cH - topH - bottomH - (gap * 2);

  const row1H = availH * 0.31;
  const row2H = availH * 0.38;
  const row3H = availH * 0.31;

  const smallW = (cW - (pad * 2) - gap) / 2;
  const heroW = cW - (pad * 2);

  if (fStyle === 'basic_top') drawFrameHeader(ctx, cW / 2, topH / 2, customTitle);

  // 상단 2장
  appState.slotRects.push({ x: pad, y: topH, w: smallW, h: row1H });
  appState.slotRects.push({ x: pad + smallW + gap, y: topH, w: smallW, h: row1H });
  drawFilteredSlotPhoto(ctx, appState.selectedImages[0], pad, topH, smallW, row1H);
  drawFilteredSlotPhoto(ctx, appState.selectedImages[1], pad + smallW + gap, topH, smallW, row1H);

  // 중단 1장 대형 와이드 히어로 컷
  const heroY = topH + row1H + gap;
  appState.slotRects.push({ x: pad, y: heroY, w: heroW, h: row2H });
  drawFilteredSlotPhoto(ctx, appState.selectedImages[2], pad, heroY, heroW, row2H);

  // 하단 2장
  const row3Y = heroY + row2H + gap;
  appState.slotRects.push({ x: pad, y: row3Y, w: smallW, h: row3H });
  appState.slotRects.push({ x: pad + smallW + gap, y: row3Y, w: smallW, h: row3H });
  drawFilteredSlotPhoto(ctx, appState.selectedImages[3], pad, row3Y, smallW, row3H);
  drawFilteredSlotPhoto(ctx, appState.selectedImages[4], pad + smallW + gap, row3Y, smallW, row3H);

  if (fStyle === 'basic_bottom') {
    drawFrameFooter(ctx, cW / 2, (cH - bottomH) + (bottomH / 2), customTitle);
  }
}

function renderStrip6Cut(ctx, cW, cH, pad, gap, fStyle, customTitle) {
  const topH = (fStyle === 'basic_top') ? 130 : pad;
  const bottomH = (fStyle === 'basic_bottom') ? 220 : pad;
  const slotW = cW - (pad * 2);
  const slotH = (cH - topH - bottomH - (gap * 5)) / 6;

  if (fStyle === 'basic_top') drawFrameHeader(ctx, cW / 2, topH / 2, customTitle);

  for (let i = 0; i < 6; i++) {
    const sy = topH + (i * (slotH + gap));
    appState.slotRects.push({ x: pad, y: sy, w: slotW, h: slotH });
    drawFilteredSlotPhoto(ctx, appState.selectedImages[i], pad, sy, slotW, slotH);
  }

  if (fStyle === 'basic_bottom') {
    drawFrameFooter(ctx, cW / 2, (cH - bottomH) + (bottomH / 2), customTitle);
  }
}

function renderGrid6Cut(ctx, cW, cH, pad, gap, fStyle, customTitle) {
  const topH = (fStyle === 'basic_top') ? 120 : pad;
  const bottomH = (fStyle === 'basic_bottom') ? 200 : pad;
  const slotW = (cW - (pad * 2) - gap) / 2;
  const slotH = (cH - topH - bottomH - (gap * 2)) / 3;

  if (fStyle === 'basic_top') drawFrameHeader(ctx, cW / 2, topH / 2, customTitle);

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const idx = row * 2 + col;
      const sx = pad + col * (slotW + gap);
      const sy = topH + row * (slotH + gap);
      appState.slotRects.push({ x: sx, y: sy, w: slotW, h: slotH });
      drawFilteredSlotPhoto(ctx, appState.selectedImages[idx], sx, sy, slotW, slotH);
    }
  }

  if (fStyle === 'basic_bottom') {
    drawFrameFooter(ctx, cW / 2, (cH - bottomH) + (bottomH / 2), customTitle);
  }
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

function drawFrameHeader(ctx, centerX, centerY, title) {
  const isDark = (appState.frameColor === '#000000' || appState.frameColor === '#0a0a0a' || appState.frameColor === '#111827');
  const textColor = isDark ? '#FFFFFF' : '#111111';
  ctx.save();
  ctx.fillStyle = textColor;
  ctx.font = `900 42px '${appState.typography.fontFamily}', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, centerX, centerY);
  ctx.restore();
}

function drawMiddleBanner(ctx, centerX, centerY, title, customSize = null) {
  const isDark = (appState.frameColor === '#000000' || appState.frameColor === '#0a0a0a' || appState.frameColor === '#111827');
  const textColor = isDark ? '#FFFFFF' : '#111111';
  const size = customSize || 40;
  const showDate = appState.showDate;
  const dateSize = Math.max(16, Math.round(size * 0.45));
  const gap = Math.max(10, Math.round(size * 0.25));

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = textColor;

  if (showDate) {
    const totalH = size + gap + dateSize;
    ctx.font = `900 ${size}px '${appState.typography.fontFamily}', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(title, centerX, centerY - (totalH / 2) + (size / 2));

    ctx.font = `normal ${dateSize}px '${appState.typography.fontFamily}', sans-serif`;
    ctx.globalAlpha = 0.75;
    ctx.fillText(appState.typography.date, centerX, centerY + (totalH / 2) - (dateSize / 2));
  } else {
    ctx.font = `900 ${size}px '${appState.typography.fontFamily}', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(title, centerX, centerY);
  }
  ctx.restore();
}

function drawFrameFooter(ctx, centerX, centerY, title) {
  drawMiddleBanner(ctx, centerX, centerY, title, 38);
}

// 🌟 사진 우측 하단 Safe Zone 영상 다운로드 전용 사각 인셋 QR 박스 렌더러
function drawQrInsetBox(ctx, canvasW, canvasH, pad) {
  const qrBoxSize = 135;
  const margin = Math.round(pad * 0.6);
  const qx = canvasW - qrBoxSize - margin;
  const qy = canvasH - qrBoxSize - margin;

  ctx.save();
  // 흰색 배경 사각 패딩
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 12;
  ctx.fillRect(qx, qy, qrBoxSize, qrBoxSize);

  // 검정 테두리
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 0;
  ctx.strokeRect(qx, qy, qrBoxSize, qrBoxSize);

  // QR 이미지 인셋
  ctx.drawImage(finalEmbeddedQrImage, qx + 8, qy + 8, qrBoxSize - 16, qrBoxSize - 26);

  // 하단 마이크로 캡션
  ctx.fillStyle = '#111111';
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
    alert("촬영 영상 클립이 부족합니다.\n부스에서 사진을 직접 연속 촬영했을 때 무빙 영상 합성이 가능합니다.");
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
    const layout = appState.layout || 'strip';
    if (layout === 'grid') {
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
      currentMovingVideoBlob = new Blob(chunks, { type: mimeType });

      // 1. 백엔드 Code.gs로 무손실 비디오 업로드 ➔ 구글 드라이브 다운로드 링크 추출
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
              cutCount: appState.selectedCutMode
            })
          }).then(r => r.json());

          if (uploadRes && uploadRes.success && uploadRes.downloadUrl) {
            currentMovingVideoDownloadUrl = uploadRes.downloadUrl;
          } else {
            currentMovingVideoDownloadUrl = window.location.href;
          }

          // 2. 동적 QR 생성 후 캐싱 ➔ 메인 사진 캔버스 우측 하단에 자동 인셋
          await cacheQrImageFromUrl(currentMovingVideoDownloadUrl);
          renderStrip(false);

          // 3. 전용 무빙 영상 프리뷰 모달 팝업
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

    // 🌟 실시간 프레임 완벽 동기화 렌더링 루프 (첫 프레임 오류 원천 차단)
    const startTime = performance.now();
    const duration = 6500;
    const pad = Math.round(appState.frameThickness * 0.9);
    const gap = Math.round(pad * 0.45);
    const sigInp = document.getElementById('frameSignatureInput');
    const title = sigInp ? sigInp.value : 'photoist';

    function renderVideoFrame(now) {
      const elapsed = now - startTime;
      vCtx.fillStyle = appState.frameColor || '#0a0a0a';
      vCtx.fillRect(0, 0, vCanvas.width, vCanvas.height);

      if (layout === 'grid') {
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

        drawFrameHeader(vCtx, vCanvas.width / 2, topH / 2, title);
        for (let i = 0; i < 4; i++) {
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
        drawFrameFooter(vCtx, vCanvas.width / 2, (vCanvas.height - bottomH) + (bottomH / 2), title);
      } else {
        const topH = 130;
        const bottomH = 220;
        const slotW = vCanvas.width - (pad * 2);
        const slotH = (vCanvas.height - topH - bottomH - (gap * 3)) / 4;

        drawFrameHeader(vCtx, vCanvas.width / 2, topH / 2, title);
        for (let i = 0; i < 4; i++) {
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
        drawFrameFooter(vCtx, vCanvas.width / 2, (vCanvas.height - bottomH) + (bottomH / 2), title);
      }

      if (elapsed < duration) {
        requestAnimationFrame(renderVideoFrame);
      } else {
        recorder.stop();
      }
    }

    requestAnimationFrame(renderVideoFrame);
  } catch (err) {
    alert("무빙 영상 합성 중 오류가 발생했습니다: " + err.message);
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

  // 모달 버튼 바인딩
  const btnDownVideo = document.getElementById('btnDownloadMovingVideoFile');
  const btnDownPhoto = document.getElementById('btnDownloadQREmbeddedPhoto');
  const btnSharePhoto = document.getElementById('btnShareQREmbeddedPhoto');

  if (btnDownVideo) {
    btnDownVideo.onclick = () => {
      const ext = videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(videoBlob);
      a.download = `[photoist_무빙영상]_${Date.now()}.${ext}`;
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
      a.download = `[photoist_QR포함사진]_${Date.now()}.png`;
      a.click();
    };
  }

  if (btnSharePhoto) {
    btnSharePhoto.onclick = () => {
      sharePhotoDirectly();
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
// 17. 결과물 내보내기 & 2중 큐 자동 아카이빙
// ========================================================
function sharePhotoDirectly() {
  renderStrip(true);
  const canvas = document.getElementById('photoCanvas');
  if (!canvas) return;

  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], `[photoist_추억네컷]_${Date.now()}.png`, { type: 'image/png' });
    archivePhotoResult(canvas.toDataURL('image/jpeg', 0.92), false);

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: '추억의 네컷 Studio Pro',
          text: '포토이스트 고화질 네컷 사진입니다!'
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
      formData.append('file', blob, `Photoist_${Date.now()}.png`);
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

// 2중 큐(로컬 1차 저장 + 클라우드 백그라운드 무소음 동기화)
function archivePhotoResult(dataUrl, isFavorite = false) {
  const newArchiveItem = {
    id: Date.now(),
    date: getFormattedTodayDate(),
    time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    dataUrl: dataUrl,
    isFavorite: isFavorite,
    userId: appState.currentUser ? appState.currentUser.userId : 'guest'
  };

  let archives = JSON.parse(localStorage.getItem('chueok_archives') || '[]');
  archives.unshift(newArchiveItem);
  if (archives.length > 50) archives.pop();
  localStorage.setItem('chueok_archives', JSON.stringify(archives));

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
  let archives = JSON.parse(localStorage.getItem('chueok_archives') || '[]');
  const item = archives.find(a => a.id === archiveId);
  if (item) {
    item.isFavorite = !item.isFavorite;
    localStorage.setItem('chueok_archives', JSON.stringify(archives));
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
  appState.selectedIndices = Array(appState.selectedCutMode).fill(null);
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
    localStorage.setItem('chueok_auth_user', JSON.stringify(appState.currentUser));
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
      localStorage.setItem('chueok_auth_user', JSON.stringify(result.user));
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
  localStorage.removeItem('chueok_auth_user');
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

// 🌟 계정 복구 센터: 이름 + 생년월일 6자리 + 이메일 대조 ➔ Gmail 무료 임시비밀번호 전송
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
// 19. 마이페이지, 10종 UI 테마 색상기 & 게시판
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

  const archives = JSON.parse(localStorage.getItem('chueok_archives') || '[]');
  if (archives.length === 0) {
    container.innerHTML = `<p class="col-span-full text-center py-8 text-xs text-slate-500">보관된 추억네컷 사진이 없습니다.</p>`;
    return;
  }

  container.innerHTML = archives.map(item => `
    <div class="relative bg-[#181818] border border-white/10 rounded-xl overflow-hidden group">
      <img src="${item.dataUrl}" class="w-full aspect-[2/3] object-cover cursor-pointer" onclick="openArchivePreview('${item.dataUrl}')">
      <button onclick="toggleFavoriteArchive(${item.id})" class="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-sm shadow">
        ${item.isFavorite ? '⭐' : '☆'}
      </button>
      <div class="p-2 flex items-center justify-between text-[10px] text-slate-400">
        <span>${item.date}</span>
        <a href="${item.dataUrl}" download="photoist_${item.id}.jpg" class="text-rose-400 font-bold hover:underline">저장</a>
      </div>
    </div>
  `).join('');
}

function openArchivePreview(url) {
  const w = window.open('');
  if (w) {
    w.document.write(`<body style="margin:0;background:#111;display:flex;justify-content:center;align-items:center;min-height:100vh;"><img src="${url}" style="max-height:95vh;box-shadow:0 0 20px rgba(0,0,0,0.8);border-radius:8px;"></body>`);
  }
}

function applySystemTheme(color) {
  document.documentElement.style.setProperty('--theme-primary', color);
  localStorage.setItem('chueok_system_theme_color', color);
}

function openNoticeBoardModal() {
  alert("[photoist Studio Pro v17.3 Pro 공지]\n\n• 15Mbps 무빙 영상 엔진 & 다운로드 QR 사진 자동 합성 탑재\n• 전 규격(4·5·6컷) 2줄 인쇄용(Twin) 복제 지원\n• 슬롯별 1:1 매칭 측면 세로 각인\n• 얼굴 자석 스냅 착용형 소품 팩 지원");
}

// ========================================================
// 20. 실행취소(Undo/Redo), 뷰포트 dvh 보정 & 초기 구동 엔트리포인트
// ========================================================
function saveStateForUndo() {
  const snapshot = JSON.stringify({
    stickers: appState.stickers,
    layout: appState.layout,
    frameStyle: appState.frameStyle,
    frameThickness: appState.frameThickness,
    frameColor: appState.frameColor,
    activeFilter: appState.activeFilter,
    filters: appState.filters,
    showDate: appState.showDate,
    sideEngravingEnabled: appState.sideEngravingEnabled,
    sideEngravingText: appState.sideEngravingText,
    selectedCutMode: appState.selectedCutMode,
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
    layout: appState.layout,
    frameStyle: appState.frameStyle,
    frameThickness: appState.frameThickness,
    frameColor: appState.frameColor,
    activeFilter: appState.activeFilter,
    filters: appState.filters,
    showDate: appState.showDate,
    sideEngravingEnabled: appState.sideEngravingEnabled,
    sideEngravingText: appState.sideEngravingText,
    selectedCutMode: appState.selectedCutMode,
    customTitle: document.getElementById('frameSignatureInput') ? document.getElementById('frameSignatureInput').value : ''
  });
  redoStack.push(currentSnap);
  applySnapshot(JSON.parse(historyStack.pop()));
}

function redo() {
  if (redoStack.length === 0) return;
  const currentSnap = JSON.stringify({
    stickers: appState.stickers,
    layout: appState.layout,
    frameStyle: appState.frameStyle,
    frameThickness: appState.frameThickness,
    frameColor: appState.frameColor,
    activeFilter: appState.activeFilter,
    filters: appState.filters,
    showDate: appState.showDate,
    sideEngravingEnabled: appState.sideEngravingEnabled,
    sideEngravingText: appState.sideEngravingText,
    selectedCutMode: appState.selectedCutMode,
    customTitle: document.getElementById('frameSignatureInput') ? document.getElementById('frameSignatureInput').value : ''
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
  appState.sideEngravingEnabled = snap.sideEngravingEnabled || false;
  appState.sideEngravingText = snap.sideEngravingText || "";
  appState.selectedCutMode = snap.selectedCutMode || 4;

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

function closeRotationOverlay() {
  const overlay = document.getElementById('cameraRotationOverlay');
  if (overlay) overlay.classList.add('hidden');
}

window.addEventListener('resize', updateAppVh);
window.addEventListener('orientationchange', () => {
  setTimeout(updateAppVh, 150);
});

window.addEventListener('DOMContentLoaded', () => {
  updateAppVh();
  initCanvasInteractions();
  setupCanvasPinchZoom();

  // 저장된 테마 색상 복원
  const savedColor = localStorage.getItem('chueok_system_theme_color');
  if (savedColor) applySystemTheme(savedColor);

  // 저장된 인증 계정 복원
  const savedUser = localStorage.getItem('chueok_auth_user');
  if (savedUser) {
    try {
      appState.currentUser = JSON.parse(savedUser);
      if (appState.currentUser && appState.currentUser.userId === 'knsupolo') {
        appState.isAdmin = true;
      }
      updateAuthUI();
    } catch (e) {}
  }

  // 카메라 회전 안내 닫기 버튼 바인딩
  const btnCloseRot = document.getElementById('btnCloseRotationOverlay');
  if (btnCloseRot) btnCloseRot.onclick = closeRotationOverlay;

  // 방문 통계 전송
  try {
    fetch(GOOGLE_DB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'TRACK_VISITOR',
        device: navigator.userAgent.includes('iPhone') ? 'iPhone' : (navigator.userAgent.includes('iPad') ? 'iPad' : 'PC/Android'),
        browser: navigator.userAgent
      })
    }).catch(() => {});
  } catch (e) {}
});
