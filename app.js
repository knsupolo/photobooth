/* ==========================================================================
   추억의 네컷 Pro Studio v12.7 - 통합 컨트롤러 엔진 (app.js)
   ========================================================================== */

// 1. 전역 애플리케이션 상태 (Global State)
const appState = {
  stream: null,
  facingMode: 'user', // 'user' (전면) | 'environment' (후면)
  timerSec: 6,
  currentCount: 6,
  countdownTimer: null,
  
  // 촬영 컷 & 비디오 버퍼
  shotImages: [],
  shotVideoBlobs: [],
  currentMediaRecorder: null,
  currentShotVideoChunks: [],
  
  // 사진 선택 (6-Pick-4)
  selectedIndices: [0, 1, 2, 3],
  activeSlotIndex: 0,
  
  // 캔버스 에디터 설정
  layout: 'strip', // 'strip'(1x4) | 'grid'(2x2) | 'twin'(2줄 인쇄)
  frameStyle: 'simple', // 'simple' | 'middle' | 'bottom'
  frameThickness: 40,
  frameColor: '#000000',
  customFrameImg: null,
  
  // 12종 감성 필터 및 세부 파라미터
  activeFilter: 'normal',
  filters: { bright: 100, contrast: 100, saturate: 100 },
  
  // 타이포그래피 및 날짜
  showDate: true,
  typography: {
    fontFamily: 'Pretendard',
    fontSize: 40,
    fontColor: '#FFFFFF',
    isBold: true
  },
  
  // 스티커 시스템
  stickers: [],
  selectedStickerIdx: -1,
  recentStickers: ['💖', '✨', '📸', 'HAPPY', 'BEST DAY'],
  
  // 인터랙션
  isDraggingSticker: false,
  dragOffset: { x: 0, y: 0 }
};

// 되돌리기 / 다시실행 히스토리 스택
const historyStack = [];
let redoStack = [];

// 프리셋 데이터
const POSE_SUGGESTIONS = [
  "볼콕 찌르며 상큼하게! 👈😊",
  "어깨동무하고 다정하게! 🫂",
  "손하트 날리기! 🫰💖",
  "브이(V) 포즈로 활짝 웃기! ✌️",
  "꽃받침하고 사랑스럽게! 🌸",
  "자유롭고 힙한 포즈! 😎"
];

const EMOJI_PRESETS = [
  '💖', '🎀', '✨', '🌸', '👑', '🎉', '🍀', '🧸', 
  '🐶', '🐱', '🐰', '🍒', '🍓', '🧁', '🕶️', '✌️', 
  '🫰', '🥳', '🔥', '⭐', '🎈', '🤍', '🍰', '🌿'
];

const TEXT_STICKER_PRESETS = [
  'HAPPY', 'LUCKY', 'LOVE', 'MEMORIES', 'BEST DAY', 
  '우리들의 날', '청춘', '행복하자', '인생네컷', 'Smile', 
  'Lovely', 'Together', 'Vibe', 'Forever', '추억'
];

const FRAME_COLORS = [
  '#000000', '#FFFFFF', '#F6F3EC', '#E2E8F0', '#1E293B',
  '#F43F5E', '#FB7185', '#F472B6', '#38BDF8', '#60A5FA',
  '#34D399', '#FBBF24', '#A78BFA', '#475569'
];

const FONT_PRESETS = [
  { name: '프리텐다드', family: 'Pretendard' },
  { name: '도현체', family: 'Do Hyeon' },
  { name: '고운바탕', family: 'Gowun Batang' },
  { name: '개구체', family: 'Gaegu' },
  { name: '주아체', family: 'Jua' }
];

/* ==========================================================================
   2. 오디오 효과음 & 화면 네비게이션
   ========================================================================== */
let audioCtx = null;

function initAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playBeep(freq = 600, duration = 0.08) {
  try {
    initAudioContext();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) { }
}

function playShutterSound() {
  try {
    initAudioContext();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  } catch (e) { }
}

function showScreen(screenId) {
  const screens = ['screenHome', 'screenBoard', 'screenLiveShoot', 'screenPick', 'screenEdit', 'screenResult'];
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === screenId) el.classList.remove('hidden');
      else el.classList.add('hidden');
    }
  });
  if (window.lucide) lucide.createIcons();
}

/* ==========================================================================
   3. 카메라 구동 & 카운트다운 & 4컷 비디오 녹화
   ========================================================================== */
async function startPhotoSession() {
  initAudioContext();
  appState.shotImages = [];
  appState.shotVideoBlobs = [];
  
  for (let i = 0; i < 6; i++) {
    const thumb = document.getElementById(`liveThumb${i}`);
    if (thumb) {
      thumb.innerHTML = `${i + 1}`;
      thumb.className = "w-12 h-8 bg-black/50 backdrop-blur border border-white/30 flex items-center justify-center text-[10px] text-white/50 font-bold";
    }
  }

  showScreen('screenLiveShoot');

  try {
    if (appState.stream) {
      appState.stream.getTracks().forEach(t => t.stop());
    }
    const constraints = {
      video: {
        facingMode: appState.facingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };
    appState.stream = await navigator.mediaDevices.getUserMedia(constraints);
    const video = document.getElementById('liveWebcamVideo');
    video.srcObject = appState.stream;
    
    if (appState.facingMode === 'user') {
      video.classList.add('mirror');
    } else {
      video.classList.remove('mirror');
    }
    
    await video.play();
    runContinuousShoot(0);
  } catch (err) {
    alert("카메라를 실행할 수 없습니다. 권한을 확인해주세요.\n" + err.message);
    showScreen('screenHome');
  }
}

function runContinuousShoot(shotIndex) {
  if (shotIndex >= 6) {
    stopCamera();
    setTimeout(() => { renderPickScreen(); }, 400);
    return;
  }

  document.getElementById('liveProgressBadge').textContent = `${shotIndex + 1} / 6 컷`;
  document.getElementById('poseGuideText').textContent = POSE_SUGGESTIONS[shotIndex % POSE_SUGGESTIONS.length];

  appState.currentCount = appState.timerSec;
  const countEl = document.getElementById('liveCountdownText');
  countEl.textContent = appState.currentCount;
  playBeep(600);

  startCutVideoRecord();

  if (appState.countdownTimer) clearInterval(appState.countdownTimer);
  appState.countdownTimer = setInterval(() => {
    appState.currentCount--;
    if (appState.currentCount > 0) {
      countEl.textContent = appState.currentCount;
      playBeep(600);
    } else {
      clearInterval(appState.countdownTimer);
      stopCutVideoRecord(shotIndex);
      captureWebcam(shotIndex, () => {
        setTimeout(() => { runContinuousShoot(shotIndex + 1); }, 1500);
      });
    }
  }, 1000);
}

function triggerInstantOneSec() {
  if (appState.countdownTimer) clearInterval(appState.countdownTimer);
  appState.currentCount = 1;
  const countEl = document.getElementById('liveCountdownText');
  countEl.textContent = "1";
  playBeep(800);

  setTimeout(() => {
    const idx = appState.shotImages.length;
    stopCutVideoRecord(idx);
    captureWebcam(idx, () => {
      setTimeout(() => { runContinuousShoot(idx + 1); }, 1500);
    });
  }, 1000);
}

function startCutVideoRecord() {
  if (!appState.stream) return;
  appState.currentShotVideoChunks = [];
  try {
    appState.currentMediaRecorder = new MediaRecorder(appState.stream, { mimeType: 'video/webm' });
  } catch (e) {
    try {
      appState.currentMediaRecorder = new MediaRecorder(appState.stream);
    } catch (err) { }
  }
  if (!appState.currentMediaRecorder) return;

  appState.currentMediaRecorder.ondataavailable = e => {
    if (e.data && e.data.size > 0) appState.currentShotVideoChunks.push(e.data);
  };
  appState.currentMediaRecorder.start();
}

function stopCutVideoRecord(shotIndex) {
  if (appState.currentMediaRecorder && appState.currentMediaRecorder.state !== 'inactive') {
    appState.currentMediaRecorder.onstop = () => {
      const blob = new Blob(appState.currentShotVideoChunks, { type: 'video/webm' });
      appState.shotVideoBlobs[shotIndex] = blob;
    };
    appState.currentMediaRecorder.stop();
  }
}

function captureWebcam(shotIndex, onDone) {
  playShutterSound();
  flashScreen();

  const video = document.getElementById('liveWebcamVideo');
  const vWidth = video.videoWidth || 1280;
  const vHeight = video.videoHeight || 720;

  // 3:2 규격 중앙 크롭
  const targetRatio = 3 / 2;
  const videoRatio = vWidth / vHeight;
  let srcW, srcH, srcX, srcY;

  if (videoRatio > targetRatio) {
    srcH = vHeight;
    srcW = vHeight * targetRatio;
    srcX = (vWidth - srcW) / 2;
    srcY = 0;
  } else {
    srcW = vWidth;
    srcH = vWidth / targetRatio;
    srcX = 0;
    srcY = (vHeight - srcH) / 2;
  }

  const canvas = document.getElementById('hiddenSnapCanvas');
  canvas.width = 900;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');

  ctx.save();
  if (appState.facingMode === 'user') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  const img = new Image();
  img.onload = () => {
    appState.shotImages.push(img);
    const thumb = document.getElementById(`liveThumb${shotIndex}`);
    if (thumb) {
      thumb.innerHTML = `<img src="${img.src}" class="w-full h-full object-cover">`;
      thumb.className = "w-12 h-8 border-2 border-rose-500 rounded overflow-hidden shadow";
    }
    if (onDone) onDone();
  };
  img.src = canvas.toDataURL('image/jpeg', 0.95);
}

function flashScreen() {
  const flash = document.getElementById('flashOverlay');
  flash.classList.remove('hidden');
  flash.classList.add('flash-effect');
  setTimeout(() => {
    flash.classList.remove('flash-effect');
    flash.classList.add('hidden');
  }, 350);
}

function flipCameraFacing() {
  appState.facingMode = (appState.facingMode === 'user') ? 'environment' : 'user';
  startPhotoSession();
}

function stopCamera() {
  if (appState.countdownTimer) {
    clearInterval(appState.countdownTimer);
    appState.countdownTimer = null;
  }
  if (appState.stream) {
    appState.stream.getTracks().forEach(t => t.stop());
    appState.stream = null;
  }
}

function cancelSession() {
  stopCamera();
  showScreen('screenHome');
}

function setTimerSec(sec, btn) {
  appState.timerSec = sec;
  document.querySelectorAll('.timer-chip').forEach(c => {
    c.className = "timer-chip bg-white border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs";
  });
  btn.className = "timer-chip bg-theme text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-sm";
}

/* ==========================================================================
   4. 사진 선택 & 앨범 연속 업로드 모달
   ========================================================================== */
function renderPickScreen() {
  showScreen('screenPick');
  appState.selectedIndices = [0, 1, 2, 3];
  appState.activeSlotIndex = 0;
  updatePickSlotPreviews();

  const grid = document.getElementById('pickGrid');
  grid.innerHTML = '';

  appState.shotImages.forEach((img, idx) => {
    const card = document.createElement('div');
    card.className = "relative aspect-[3/2] rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-100 cursor-pointer active:scale-95 transition shadow-sm";
    card.innerHTML = `
      <img src="${img.src}" class="w-full h-full object-cover">
      <span class="absolute bottom-1.5 left-1.5 bg-black/70 text-white font-black text-[10px] px-2 py-0.5 rounded-md">#${idx + 1}</span>
    `;
    card.onclick = () => assignPhotoToActiveSlot(idx);
    grid.appendChild(card);
  });
}

function updatePickSlotPreviews() {
  for (let i = 0; i < 4; i++) {
    const slotEl = document.getElementById(`previewSlot${i}`);
    const photoIdx = appState.selectedIndices[i];
    if (photoIdx !== undefined && appState.shotImages[photoIdx]) {
      slotEl.innerHTML = `<img src="${appState.shotImages[photoIdx].src}" class="w-full h-full object-cover">`;
    } else {
      slotEl.innerHTML = `${i + 1}번 슬롯`;
    }
    
    if (i === appState.activeSlotIndex) {
      slotEl.className = "aspect-[3/2] bg-slate-900 border-2 border-theme flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative shadow-md";
    } else {
      slotEl.className = "aspect-[3/2] bg-slate-900 border-2 border-transparent flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer overflow-hidden relative";
    }
  }
}

function selectSlotForAssignment(slotIdx) {
  appState.activeSlotIndex = slotIdx;
  updatePickSlotPreviews();
}

function assignPhotoToActiveSlot(photoIdx) {
  appState.selectedIndices[appState.activeSlotIndex] = photoIdx;
  appState.activeSlotIndex = (appState.activeSlotIndex + 1) % 4;
  updatePickSlotPreviews();
}

function confirmSelectedFour() {
  showScreen('screenEdit');
  setupEditorTools();
  renderStrip();
}

// 앨범 업로드 (다중 또는 단일 1장씩 순차 수집)
function triggerGalleryUpload() {
  document.getElementById('galleryInput').click();
}

function handleGalleryUpload(e) {
  const files = Array.from(e.target.files);
  if (!files || files.length === 0) return;

  let loaded = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = evt => {
      const img = new Image();
      img.onload = () => {
        appState.shotImages.push(img);
        loaded++;
        if (loaded === files.length) {
          checkGalleryCollectProgress();
        }
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function checkGalleryCollectProgress() {
  const modal = document.getElementById('galleryCollectModal');
  const total = appState.shotImages.length;

  if (total >= 4) {
    modal.classList.add('hidden');
    appState.selectedIndices = [0, 1, 2, 3];
    showScreen('screenEdit');
    setupEditorTools();
    renderStrip();
  } else {
    modal.classList.remove('hidden');
    document.getElementById('collectModalTitle').textContent = `사진 수집 중 ( ${total} / 4 )`;
    const grid = document.getElementById('collectThumbGrid');
    grid.innerHTML = '';
    appState.shotImages.forEach(img => {
      const d = document.createElement('div');
      d.className = "w-12 h-12 rounded-lg overflow-hidden border border-rose-300 shadow-xs";
      d.innerHTML = `<img src="${img.src}" class="w-full h-full object-cover">`;
      grid.appendChild(d);
    });
  }
}

function cancelGalleryCollect() {
  document.getElementById('galleryCollectModal').classList.add('hidden');
  appState.shotImages = [];
  showScreen('screenHome');
}

function handleCustomFrameUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    const img = new Image();
    img.onload = () => {
      appState.customFrameImg = img;
      renderStrip();
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

/* ==========================================================================
   5. 캔버스 에디터 렌더링 & 12종 감성 필터 수치 연산
   ========================================================================== */
function setupEditorTools() {
  // 프레임 색상 팔레트 채우기
  const colorGrid = document.getElementById('frameColorGrid');
  if (colorGrid && colorGrid.children.length === 0) {
    FRAME_COLORS.forEach(c => {
      const btn = document.createElement('button');
      btn.className = "w-5 h-5 rounded-full border border-slate-300 shadow-xs active:scale-90 transition shrink-0";
      btn.style.backgroundColor = c;
      btn.onclick = () => {
        saveStateForUndo();
        appState.frameColor = c;
        renderStrip();
      };
      colorGrid.appendChild(btn);
    });
  }

  // 폰트 버튼 팔레트
  const fontGrid = document.getElementById('fontGrid');
  if (fontGrid && fontGrid.children.length === 0) {
    FONT_PRESETS.forEach(f => {
      const btn = document.createElement('button');
      btn.className = "py-1 px-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold truncate";
      btn.textContent = f.name;
      btn.onclick = () => {
        saveStateForUndo();
        appState.typography.fontFamily = f.family;
        renderStrip();
      };
      fontGrid.appendChild(btn);
    });
  }

  setupStickerPalettes();
  setupCanvasInteractions();
}

function renderStrip() {
  const canvas = document.getElementById('photoCanvas');
  const ctx = canvas.getContext('2d');

  const photos = appState.selectedIndices.map(idx => appState.shotImages[idx]).filter(Boolean);
  if (photos.length < 4) return;

  const gap = Number(appState.frameThickness);
  const photoW = 800;
  const photoH = 533; // 3:2 규격 비율

  if (appState.layout === 'strip') {
    // 1x4 세로 스트립
    const bottomAreaH = 260;
    canvas.width = photoW + (gap * 2);
    canvas.height = (photoH * 4) + (gap * 5) + bottomAreaH;

    ctx.fillStyle = appState.frameColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 4; i++) {
      const x = gap;
      const y = gap + (i * (photoH + gap));
      drawFilteredPhoto(ctx, photos[i], x, y, photoW, photoH);
    }
    renderFrameTextAndDate(ctx, canvas.width, canvas.height, bottomAreaH);

  } else if (appState.layout === 'grid') {
    // 2x2 바둑판 격자
    const bottomAreaH = 200;
    canvas.width = (photoW * 2) + (gap * 3);
    canvas.height = (photoH * 2) + (gap * 3) + bottomAreaH;

    ctx.fillStyle = appState.frameColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const positions = [
      { x: gap, y: gap },
      { x: gap * 2 + photoW, y: gap },
      { x: gap, y: gap * 2 + photoH },
      { x: gap * 2 + photoW, y: gap * 2 + photoH }
    ];

    for (let i = 0; i < 4; i++) {
      drawFilteredPhoto(ctx, photos[i], positions[i].x, positions[i].y, photoW, photoH);
    }
    renderFrameTextAndDate(ctx, canvas.width, canvas.height, bottomAreaH);

  } else if (appState.layout === 'twin') {
    // 4x6 포토프린터 규격 2줄 인쇄 모드
    const bottomAreaH = 260;
    const singleStripW = photoW + (gap * 2);
    canvas.width = (singleStripW * 2) + 20;
    canvas.height = (photoH * 4) + (gap * 5) + bottomAreaH;

    ctx.fillStyle = appState.frameColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 좌측 열
    for (let i = 0; i < 4; i++) {
      drawFilteredPhoto(ctx, photos[i], gap, gap + (i * (photoH + gap)), photoW, photoH);
    }
    renderFrameTextAndDate(ctx, singleStripW, canvas.height, bottomAreaH, 0);

    // 우측 열
    const offsetX = singleStripW + 20;
    for (let i = 0; i < 4; i++) {
      drawFilteredPhoto(ctx, photos[i], offsetX + gap, gap + (i * (photoH + gap)), photoW, photoH);
    }
    renderFrameTextAndDate(ctx, singleStripW, canvas.height, bottomAreaH, offsetX);

    // 중앙 절취선 점선 (✂️)
    ctx.save();
    ctx.setLineDash([14, 14]);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(singleStripW + 10, 20);
    ctx.lineTo(singleStripW + 10, canvas.height - 20);
    ctx.stroke();
    ctx.restore();
  }

  // PNG 커스텀 프레임 얹기
  if (appState.customFrameImg) {
    ctx.drawImage(appState.customFrameImg, 0, 0, canvas.width, canvas.height);
  }

  // 스티커 합성
  renderAllStickers(ctx);
}

function drawFilteredPhoto(ctx, img, x, y, w, h) {
  ctx.save();
  let filterStr = `brightness(${appState.filters.bright}%) contrast(${appState.filters.contrast}%) saturate(${appState.filters.saturate}%)`;
  
  if (appState.activeFilter === 'bright') filterStr += ' brightness(115%) contrast(95%)';
  else if (appState.activeFilter === 'radiant') filterStr += ' brightness(110%) saturate(125%)';
  else if (appState.activeFilter === 'warm') filterStr += ' sepia(25%) saturate(120%)';
  else if (appState.activeFilter === 'cool') filterStr += ' hue-rotate(185deg) saturate(90%)';
  else if (appState.activeFilter === 'mood') filterStr += ' contrast(115%) brightness(95%) sepia(15%)';
  else if (appState.activeFilter === 'retro') filterStr += ' sepia(40%) contrast(90%) brightness(95%)';
  else if (appState.activeFilter === 'mono') filterStr += ' grayscale(100%) contrast(120%)';
  else if (appState.activeFilter === 'sunset') filterStr += ' sepia(35%) hue-rotate(320deg) saturate(130%)';
  else if (appState.activeFilter === 'cyan') filterStr += ' hue-rotate(160deg) saturate(110%)';
  else if (appState.activeFilter === 'green') filterStr += ' hue-rotate(70deg) saturate(85%)';
  else if (appState.activeFilter === 'pink') filterStr += ' hue-rotate(300deg) saturate(120%) brightness(105%)';

  ctx.filter = filterStr;
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

function renderFrameTextAndDate(ctx, stripW, stripH, bottomH, offsetX = 0) {
  ctx.save();
  const titleInput = document.getElementById('frameSignatureInput');
  const titleText = titleInput ? titleInput.value : 'sangsangPhoto';
  
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  
  const isDarkFrame = isColorDark(appState.frameColor);
  ctx.fillStyle = appState.typography.fontColor || (isDarkFrame ? '#FFFFFF' : '#1E293B');
  const fontWeight = appState.typography.isBold ? 'bold' : 'normal';

  if (appState.frameStyle === 'simple') {
    // 포토이지 (상단 문구 & 하단 날짜)
    ctx.font = `${fontWeight} ${appState.typography.fontSize}px "${appState.typography.fontFamily}"`;
    ctx.textAlign = 'center';
    ctx.fillText(titleText, offsetX + (stripW / 2), stripH - (bottomH / 2) - 15);

    if (appState.showDate) {
      ctx.font = `normal 24px "${appState.typography.fontFamily}"`;
      ctx.fillStyle = isDarkFrame ? 'rgba(255,255,255,0.7)' : 'rgba(30,41,59,0.7)';
      ctx.fillText(dateStr, offsetX + (stripW / 2), stripH - (bottomH / 2) + 35);
    }
  } else if (appState.frameStyle === 'middle') {
    // 추억의네컷 (중간 브랜드 로고 스타일)
    ctx.font = `${fontWeight} ${appState.typography.fontSize + 4}px "${appState.typography.fontFamily}"`;
    ctx.textAlign = 'center';
    ctx.fillText(titleText, offsetX + (stripW / 2), stripH - (bottomH / 2));
    
    if (appState.showDate) {
      ctx.font = `normal 22px "${appState.typography.fontFamily}"`;
      ctx.fillText(dateStr, offsetX + (stripW / 2), stripH - 30);
    }
  } else {
    // 인생4컷 (하단 와이드 좌우 분할 배치)
    ctx.textAlign = 'left';
    ctx.font = `${fontWeight} ${appState.typography.fontSize}px "${appState.typography.fontFamily}"`;
    ctx.fillText(titleText, offsetX + 40, stripH - (bottomH / 2) + 10);

    if (appState.showDate) {
      ctx.textAlign = 'right';
      ctx.font = `normal 24px "${appState.typography.fontFamily}"`;
      ctx.fillText(dateStr, offsetX + stripW - 40, stripH - (bottomH / 2) + 10);
    }
  }
  ctx.restore();
}

function isColorDark(hexColor) {
  if (!hexColor.startsWith('#')) return true;
  const rgb = parseInt(hexColor.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 128;
}

/* ==========================================================================
   6. 스티커 드래그 & 회전 & 맞춤 레터링
   ========================================================================== */
function setupStickerPalettes() {
  updateRecentStickersBar();

  const emojiGrid = document.getElementById('emojiGrid');
  if (emojiGrid && emojiGrid.children.length === 0) {
    EMOJI_PRESETS.forEach(em => {
      const btn = document.createElement('button');
      btn.className = "w-8 h-8 flex items-center justify-center text-lg hover:scale-125 active:scale-95 transition";
      btn.textContent = em;
      btn.onclick = () => addSticker('emoji', em);
      emojiGrid.appendChild(btn);
    });
  }

  const textGrid = document.getElementById('textStickerGrid');
  if (textGrid && textGrid.children.length === 0) {
    TEXT_STICKER_PRESETS.forEach(txt => {
      const btn = document.createElement('button');
      btn.className = "px-2.5 py-1 bg-white border border-slate-200 hover:border-theme text-slate-800 rounded-xl text-xs font-bold shrink-0 shadow-xs";
      btn.textContent = txt;
      btn.onclick = () => addSticker('text', txt);
      textGrid.appendChild(btn);
    });
  }
}

function updateRecentStickersBar() {
  const container = document.getElementById('recentStickersList');
  if (!container) return;
  container.innerHTML = '';
  appState.recentStickers.slice(-5).forEach(st => {
    const btn = document.createElement('button');
    btn.className = "px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 active:scale-95 transition";
    btn.textContent = st;
    btn.onclick = () => addSticker(st.length > 2 ? 'text' : 'emoji', st);
    container.appendChild(btn);
  });
}

function addSticker(type, content) {
  saveStateForUndo();
  const canvas = document.getElementById('photoCanvas');
  const newSticker = {
    id: Date.now(),
    type: type,
    content: content,
    x: canvas.width / 2 + (Math.random() * 60 - 30),
    y: canvas.height / 2 + (Math.random() * 60 - 30),
    size: 70,
    rotation: 0,
    color: '#FFFFFF',
    font: 'Pretendard'
  };
  appState.stickers.push(newSticker);
  appState.selectedStickerIdx = appState.stickers.length - 1;
  
  if (!appState.recentStickers.includes(content)) {
    appState.recentStickers.push(content);
    updateRecentStickersBar();
  }

  showStickerControls(newSticker);
  renderStrip();
}

function addCustomInputSticker() {
  const input = document.getElementById('customEmojiInput');
  const val = input.value.trim();
  if (!val) return;
  addSticker('text', val);
  input.value = '';
}

function renderAllStickers(ctx) {
  appState.stickers.forEach((st, idx) => {
    ctx.save();
    ctx.translate(st.x, st.y);
    ctx.rotate((st.rotation * Math.PI) / 180);

    if (st.type === 'emoji') {
      ctx.font = `${st.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(st.content, 0, 0);
    } else {
      ctx.font = `bold ${st.size * 0.7}px "${st.font || 'Pretendard'}"`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = st.color || '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 6;
      ctx.fillText(st.content, 0, 0);
    }

    if (idx === appState.selectedStickerIdx) {
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      const boxSize = st.size * 1.2;
      ctx.strokeRect(-boxSize / 2, -boxSize / 2, boxSize, boxSize);
    }
    ctx.restore();
  });
}

function showStickerControls(st) {
  const bar = document.getElementById('stickerControlBar');
  bar.classList.remove('hidden');
  document.getElementById('stickerSizeSlider').value = st.size;
  document.getElementById('stickerRotateSlider').value = st.rotation || 0;
  
  const textRow = document.getElementById('stickerTextCustomRow');
  if (st.type === 'text') textRow.classList.remove('hidden');
  else textRow.classList.add('hidden');
}

function setupCanvasInteractions() {
  const canvas = document.getElementById('photoCanvas');

  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function handleStart(e) {
    const { x, y } = getCanvasCoords(e);
    let hitIndex = -1;

    for (let i = appState.stickers.length - 1; i >= 0; i--) {
      const st = appState.stickers[i];
      if (Math.hypot(st.x - x, st.y - y) <= st.size) {
        hitIndex = i;
        break;
      }
    }

    if (hitIndex !== -1) {
      saveStateForUndo();
      appState.selectedStickerIdx = hitIndex;
      appState.isDraggingSticker = true;
      const target = appState.stickers[hitIndex];
      appState.dragOffset = { x: target.x - x, y: target.y - y };
      showStickerControls(target);
      renderStrip();
    } else {
      appState.selectedStickerIdx = -1;
      document.getElementById('stickerControlBar').classList.add('hidden');
      renderStrip();
    }
  }

  function handleMove(e) {
    if (!appState.isDraggingSticker || appState.selectedStickerIdx === -1) return;
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    const target = appState.stickers[appState.selectedStickerIdx];
    target.x = x + appState.dragOffset.x;
    target.y = y + appState.dragOffset.y;
    renderStrip();
  }

  function handleEnd() {
    appState.isDraggingSticker = false;
  }

  canvas.addEventListener('mousedown', handleStart);
  window.addEventListener('mousemove', handleMove);
  window.addEventListener('mouseup', handleEnd);

  canvas.addEventListener('touchstart', handleStart, { passive: false });
  window.addEventListener('touchmove', handleMove, { passive: false });
  window.addEventListener('touchend', handleEnd);
}

function onSelectedStickerResize(val) {
  if (appState.selectedStickerIdx !== -1) {
    appState.stickers[appState.selectedStickerIdx].size = Number(val);
    renderStrip();
  }
}

function onSelectedStickerRotate(val) {
  if (appState.selectedStickerIdx !== -1) {
    appState.stickers[appState.selectedStickerIdx].rotation = Number(val);
    renderStrip();
  }
}

function onSelectedStickerColorChange(color) {
  if (appState.selectedStickerIdx !== -1) {
    appState.stickers[appState.selectedStickerIdx].color = color;
    renderStrip();
  }
}

function onSelectedStickerFontChange(font) {
  if (appState.selectedStickerIdx !== -1) {
    appState.stickers[appState.selectedStickerIdx].font = font;
    renderStrip();
  }
}

function deleteSelectedSticker() {
  if (appState.selectedStickerIdx !== -1) {
    saveStateForUndo();
    appState.stickers.splice(appState.selectedStickerIdx, 1);
    appState.selectedStickerIdx = -1;
    document.getElementById('stickerControlBar').classList.add('hidden');
    renderStrip();
  }
}

function clearAllStickers() {
  saveStateForUndo();
  appState.stickers = [];
  appState.selectedStickerIdx = -1;
  document.getElementById('stickerControlBar').classList.add('hidden');
  renderStrip();
}

/* ==========================================================================
   7. 에디터 UI 조작 핸들러 & Undo/Redo
   ========================================================================== */
function changeLayout(layoutType, btn) {
  saveStateForUndo();
  appState.layout = layoutType;
  document.querySelectorAll('.layout-btn').forEach(b => {
    b.className = "layout-btn bg-slate-100 text-slate-700 font-bold py-2 rounded-xl text-xs";
  });
  btn.className = "layout-btn bg-theme text-white font-bold py-2 rounded-xl text-xs shadow-sm";
  renderStrip();
}

function setFrameStyle(style, btn) {
  saveStateForUndo();
  appState.frameStyle = style;
  document.querySelectorAll('.style-btn').forEach(b => {
    b.className = "style-btn bg-slate-100 text-slate-700 font-bold py-2 rounded-xl border border-transparent";
  });
  btn.className = "style-btn bg-theme text-white font-black py-2 rounded-xl border border-theme shadow-sm";
  renderStrip();
}

function handleFilterClick(filterName, btn) {
  saveStateForUndo();
  if (appState.activeFilter === filterName) {
    document.getElementById('filterFineTunePanel').classList.toggle('hidden');
  } else {
    appState.activeFilter = filterName;
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.className = "filter-btn bg-slate-100 text-slate-700 font-bold py-1.5 rounded-lg border border-transparent";
    });
    btn.className = "filter-btn bg-slate-900 text-white font-bold py-1.5 rounded-lg border border-theme";
    document.getElementById('filterStateBadge').textContent = btn.textContent;
  }
  renderStrip();
}

function onFineTuneSliderChange() {
  appState.filters.bright = Number(document.getElementById('sliderBright').value);
  appState.filters.contrast = Number(document.getElementById('sliderContrast').value);
  appState.filters.saturate = Number(document.getElementById('sliderSaturate').value);
  renderStrip();
}

function onThicknessChange(val) {
  appState.frameThickness = Number(val);
  const tag = document.getElementById('valThickness');
  if (tag) {
    if (val < 25) tag.textContent = '얇음';
    else if (val > 55) tag.textContent = '두꺼움';
    else tag.textContent = '보통';
  }
  renderStrip();
}

function toggleFontBold() {
  saveStateForUndo();
  appState.typography.isBold = !appState.typography.isBold;
  const btn = document.getElementById('btnFontBold');
  if (appState.typography.isBold) {
    btn.className = "px-2 py-0.5 rounded text-[10px] font-black border border-theme bg-theme text-white";
  } else {
    btn.className = "px-2 py-0.5 rounded text-[10px] font-normal border border-slate-300 bg-white text-slate-700";
  }
  renderStrip();
}

function onFontColorChange(color) {
  appState.typography.fontColor = color;
  renderStrip();
}

function onFontSizeChange(size) {
  appState.typography.fontSize = Number(size);
  renderStrip();
}

function toggleShowDate(checked) {
  saveStateForUndo();
  appState.showDate = checked;
  renderStrip();
}

// Undo & Redo
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
    typography: appState.typography,
    title: document.getElementById('frameSignatureInput')?.value || ''
  });
  historyStack.push(snapshot);
  if (historyStack.length > 20) historyStack.shift();
  redoStack = [];
}

function undo() {
  if (historyStack.length === 0) return;
  const current = JSON.stringify({
    stickers: appState.stickers,
    layout: appState.layout,
    frameStyle: appState.frameStyle,
    frameThickness: appState.frameThickness,
    frameColor: appState.frameColor,
    activeFilter: appState.activeFilter,
    filters: appState.filters,
    showDate: appState.showDate,
    typography: appState.typography,
    title: document.getElementById('frameSignatureInput')?.value || ''
  });
  redoStack.push(current);
  applySnapshot(JSON.parse(historyStack.pop()));
}

function redo() {
  if (redoStack.length === 0) return;
  const current = JSON.stringify({
    stickers: appState.stickers,
    layout: appState.layout,
    frameStyle: appState.frameStyle,
    frameThickness: appState.frameThickness,
    frameColor: appState.frameColor,
    activeFilter: appState.activeFilter,
    filters: appState.filters,
    showDate: appState.showDate,
    typography: appState.typography,
    title: document.getElementById('frameSignatureInput')?.value || ''
  });
  historyStack.push(current);
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
    document.getElementById('frameSignatureInput').value = snap.title || '';
  }
  renderStrip();
}

/* ==========================================================================
   8. 이미지 / 비디오 / PDF 저장 & QR 공유
   ========================================================================== */
function downloadLocalImage() {
  const canvas = document.getElementById('photoCanvas');
  const link = document.createElement('a');
  link.download = `FourCut_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
}

async function sharePhotoDirectly() {
  const canvas = document.getElementById('photoCanvas');
  canvas.toBlob(async blob => {
    if (navigator.canShare && navigator.canShare({ files: [new File([blob], 'photo.png', { type: 'image/png' })] })) {
      try {
        await navigator.share({
          files: [new File([blob], 'photo.png', { type: 'image/png' })],
          title: '추억의 네컷',
          text: '인생네컷 스튜디오에서 촬영한 사진입니다!'
        });
      } catch (err) { }
    } else {
      downloadLocalImage();
    }
  }, 'image/png');
}

function autoSavePDF() {
  const { jsPDF } = window.jspdf;
  const canvas = document.getElementById('photoCanvas');
  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [102, 152] // 4x6 인치 규격
  });

  pdf.addImage(imgData, 'JPEG', 0, 0, 102, 152);
  pdf.save(`FourCut_Print_${Date.now()}.pdf`);
}

function autoSaveVideo() {
  if (appState.shotVideoBlobs.length === 0) {
    alert("녹화된 비디오 클립이 없습니다. 이미지로 저장합니다.");
    downloadLocalImage();
    return;
  }
  const blob = appState.shotVideoBlobs[0];
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `FourCut_LiveMotion_${Date.now()}.webm`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

let resetInterval = null;

function saveAndGenerateQR() {
  showScreen('screenResult');
  const qrContainer = document.getElementById('qrcodeArea');
  qrContainer.innerHTML = '';

  const canvas = document.getElementById('photoCanvas');
  const downloadUrl = canvas.toDataURL('image/png', 0.85);

  new QRCode(qrContainer, {
    text: downloadUrl.slice(0, 1800),
    width: 170,
    height: 170,
    colorDark: "#020617",
    colorLight: "#FFFFFF",
    correctLevel: QRCode.CorrectLevel.M
  });

  let timeLeft = 120;
  const timerText = document.getElementById('resetTimerText');
  if (resetInterval) clearInterval(resetInterval);
  
  resetInterval = setInterval(() => {
    timeLeft--;
    if (timerText) timerText.textContent = `${timeLeft}초`;
    if (timeLeft <= 0) {
      clearInterval(resetInterval);
      resetApp();
    }
  }, 1000);
}

function returnToEditor() {
  if (resetInterval) clearInterval(resetInterval);
  showScreen('screenEdit');
  renderStrip();
}

function resetApp() {
  if (resetInterval) clearInterval(resetInterval);
  stopCamera();
  appState.shotImages = [];
  appState.shotVideoBlobs = [];
  appState.stickers = [];
  showScreen('screenHome');
}

/* ==========================================================================
   9. 후기 게시판 & 5초 롱프레스 관리자 센터
   ========================================================================== */
function fetchCloudBoardPosts() {
  const list = document.getElementById('boardListArea');
  const stored = JSON.parse(localStorage.getItem('studio_reviews') || '[]');
  list.innerHTML = '';

  if (stored.length === 0) {
    list.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">아직 등록된 후기가 없습니다. 첫 후기를 남겨보세요!</p>';
    return;
  }

  stored.forEach(item => {
    const card = document.createElement('div');
    card.className = "bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1 shadow-2xs";
    card.innerHTML = `
      <div class="flex justify-between items-center text-slate-500 text-[10px]">
        <b class="text-slate-800">${item.nickname}</b>
        <span>⭐ ${item.rating} | ${item.date}</span>
      </div>
      <p class="text-slate-700">${item.content}</p>
    `;
    list.appendChild(card);
  });
}

function updateRatingUI(val) {
  document.getElementById('ratingValueText').textContent = Number(val).toFixed(1);
  document.getElementById('ratingStarDisplay').textContent = '⭐'.repeat(Math.round(val));
}

function submitBoardPost() {
  const nick = document.getElementById('boardNickname').value.trim() || '익명';
  const content = document.getElementById('boardContent').value.trim();
  const rating = document.getElementById('boardRatingSlider').value;

  if (!content) {
    alert("후기 내용을 입력해 주세요.");
    return;
  }

  const stored = JSON.parse(localStorage.getItem('studio_reviews') || '[]');
  stored.unshift({
    nickname: nick,
    content: content,
    rating: rating,
    date: new Date().toLocaleDateString()
  });

  localStorage.setItem('studio_reviews', JSON.stringify(stored));
  document.getElementById('boardContent').value = '';
  alert("후기가 등록되었습니다!");
  fetchCloudBoardPosts();
}

// 5초 롱프레스 관리자 진입 엔진
let adminLongPressTimer = null;

function setupAdminLongPress() {
  const icon = document.getElementById('cameraAdminIcon');
  if (!icon) return;

  function startPress() {
    adminLongPressTimer = setTimeout(() => {
      openAdminWithAuth();
    }, 5000); // 5초 유지 시 실행
  }

  function cancelPress() {
    if (adminLongPressTimer) {
      clearTimeout(adminLongPressTimer);
      adminLongPressTimer = null;
    }
  }

  icon.addEventListener('mousedown', startPress);
  icon.addEventListener('mouseup', cancelPress);
  icon.addEventListener('mouseleave', cancelPress);

  icon.addEventListener('touchstart', startPress, { passive: true });
  icon.addEventListener('touchend', cancelPress);
  icon.addEventListener('touchcancel', cancelPress);
}

function openAdminWithAuth() {
  const pw = prompt("관리자 비밀번호를 입력하세요:");
  if (pw === '1234' || pw === 'admin') {
    openAdminDashboard();
  } else if (pw !== null) {
    alert("비밀번호가 올바르지 않습니다.");
  }
}

function openAdminDashboard() {
  document.getElementById('adminDashboardModal').classList.remove('hidden');
  initAdminStats();
  if (window.lucide) lucide.createIcons();
}

function closeAdminDashboard() {
  document.getElementById('adminDashboardModal').classList.add('hidden');
}

function switchAdminTab(tabName) {
  ['stats', 'theme', 'notices'].forEach(t => {
    const el = document.getElementById(`adminTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const btn = document.getElementById(`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (el) el.classList.toggle('hidden', t !== tabName);
    if (btn) {
      if (t === tabName) btn.className = "flex-1 py-3 border-b-2 border-theme text-theme font-black";
      else btn.className = "flex-1 py-3 border-b-2 border-transparent text-slate-400 font-bold";
    }
  });
}

function initAdminStats() {
  const today = Math.floor(Math.random() * 50) + 120;
  document.getElementById('statTodayCount').textContent = today;
  document.getElementById('statTotalCount').textContent = today * 14;
  document.getElementById('dashToday').textContent = today;
  document.getElementById('dashWeek').textContent = today * 6;
  document.getElementById('dashMonth').textContent = today * 25;
  document.getElementById('dashTotal').textContent = today * 75;

  const hourlyCanvas = document.getElementById('chartHourly');
  if (hourlyCanvas && !hourlyCanvas.chartInstance) {
    hourlyCanvas.chartInstance = new Chart(hourlyCanvas, {
      type: 'line',
      data: {
        labels: ['09시', '11시', '13시', '15시', '17시', '19시', '21시'],
        datasets: [{
          label: '시간대별 방문자',
          data: [15, 38, 72, 88, 95, 120, 80],
          borderColor: '#e11d48',
          tension: 0.3,
          fill: false
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  const deviceCanvas = document.getElementById('chartDevice');
  if (deviceCanvas && !deviceCanvas.chartInstance) {
    deviceCanvas.chartInstance = new Chart(deviceCanvas, {
      type: 'doughnut',
      data: {
        labels: ['아이패드', '스마트폰', 'PC 웹캠'],
        datasets: [{
          data: [60, 30, 10],
          backgroundColor: ['#e11d48', '#fb7185', '#cbd5e1']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

function applyAppTheme(colorName) {
  const root = document.documentElement;
  const themeMap = {
    rose: { primary: '#e11d48', hover: '#be123c', light: '#ffe4e6' },
    black: { primary: '#0f172a', hover: '#020617', light: '#f1f5f9' },
    blue: { primary: '#0284c7', hover: '#0369a1', light: '#e0f2fe' },
    purple: { primary: '#7c3aed', hover: '#6d28d9', light: '#ede9fe' },
    green: { primary: '#059669', hover: '#047857', light: '#d1fae5' }
  };
  const selected = themeMap[colorName] || themeMap.rose;
  root.style.setProperty('--theme-primary', selected.primary);
  root.style.setProperty('--theme-primary-hover', selected.hover);
  root.style.setProperty('--theme-light', selected.light);
  alert("UI 메인 테마 색상이 변경되었습니다.");
}

function writeAdminNotice() {
  const msg = prompt("홈 화면에 띄울 공지사항 문구를 입력하세요:");
  if (!msg) return;
  const banner = document.getElementById('mainNoticeArea');
  const container = document.getElementById('noticeListContainer');
  banner.classList.remove('hidden');
  container.innerHTML = `<p class="text-xs font-bold text-slate-800">📌 ${msg} <span class="text-[10px] text-slate-400">(${new Date().toLocaleDateString()})</span></p>`;
  alert("공지사항이 등록되었습니다.");
}

// 10. 초기 로딩 이벤트 바인딩
window.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  fetchCloudBoardPosts();
  initAdminStats();
  setupAdminLongPress();
});
