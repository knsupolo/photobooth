/**
 * 추억의 네컷 Studio Pro v16.0 Pro - 백엔드 엔진
 * 
 * [주요 기능]
 * 1. 구글 드라이브 미디어 저장: 업로드된 네컷 사진(PNG) 및 비디오(MP4/WebM)를 '추억의네컷_클라우드' 폴더에 자동 생성 및 링크 공유 설정
 * 2. 이용 후기(Review) CRUD 및 별점 집계
 * 3. 고객소리함(Inquiry) 접수 및 기기 스펙 텔레메트리 기록
 * 4. 실시간 공지사항(Notices) 관리
 * 5. 방문자 분석 및 접속 기기별/지역별 통계 집계
 */

const FOLDER_NAME = "추억의네컷_클라우드";

// ========================================================
// 1. GET 요청 핸들러 (통계, 공지, 후기 실시간 반환)
// ========================================================
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initAllSheets(ss);

    const todayStr = getTodayString();
    const visits = calculateVisits(ss, todayStr);
    const notices = getNoticesData(ss);
    const reviews = getReviewsData(ss);
    const deviceStats = getDeviceStats(ss);
    const locationStats = getLocationStats(ss);

    const result = {
      success: true,
      visits: visits,
      notices: notices,
      reviews: reviews,
      deviceStats: deviceStats,
      locationStats: locationStats
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ========================================================
// 2. POST 요청 핸들러 (업로드, 후기 등록, 문의 접수)
// ========================================================
function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initAllSheets(ss);

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      data = e.parameter;
    }

    const action = data.action;

    // A. 🌟 구글 드라이브 단독 직결 미디어 업로드 (QR 다운로드용)
    if (action === "UPLOAD_MEDIA") {
      const base64Data = data.base64Data;
      const fileName = data.fileName || ("photo_" + Date.now() + ".png");
      const mimeType = data.mimeType || "image/png";
      const fileType = data.fileType || "image";

      const folder = getOrCreateFolder(FOLDER_NAME);
      const decodedBlob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
      const file = folder.createFile(decodedBlob);
      
      // 누구나 보기 권한 부여 (QR 스캔 직결)
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      const fileId = file.getId();

      // 시트에 업로드 로그 기록
      const uploadSheet = ss.getSheetByName("MediaUploads");
      uploadSheet.appendRow([
        new Date(),
        fileType,
        fileName,
        fileId,
        file.getUrl(),
        file.getSize()
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        fileId: fileId,
        fileUrl: file.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // B. 이용 후기 등록
    else if (action === "ADD_REVIEW") {
      const reviewSheet = ss.getSheetByName("Reviews");
      const newId = Date.now();
      const nickname = data.nickname || "익명";
      const rating = Number(data.rating) || 5.0;
      const content = data.content || "";
      const dateStr = getTodayString();

      reviewSheet.appendRow([newId, dateStr, nickname, rating, content, new Date()]);

      return ContentService.createTextOutput(JSON.stringify({ success: true, id: newId }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // C. 이용 후기 삭제
    else if (action === "DELETE_REVIEW") {
      const reviewSheet = ss.getSheetByName("Reviews");
      const targetId = String(data.id);
      const values = reviewSheet.getDataRange().getValues();

      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === targetId) {
          reviewSheet.deleteRow(i + 1);
          break;
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // D. 고객소리함 문의 접수
    else if (action === "ADD_INQUIRY") {
      const inquirySheet = ss.getSheetByName("Inquiries");
      inquirySheet.appendRow([
        new Date(),
        data.email || "이메일 미입력",
        data.message || "",
        data.deviceInfo || "기기정보 없음"
      ]);

      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // E. 공지사항 추가
    else if (action === "ADD_NOTICE") {
      const noticeSheet = ss.getSheetByName("Notices");
      const noticeId = "notice_" + Date.now();
      noticeSheet.appendRow([
        noticeId,
        getTodayString(),
        data.version || "v16.0",
        data.content || "",
        new Date()
      ]);

      return ContentService.createTextOutput(JSON.stringify({ success: true, id: noticeId }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // F. 공지사항 삭제
    else if (action === "DELETE_NOTICE") {
      const noticeSheet = ss.getSheetByName("Notices");
      const targetId = String(data.id);
      const values = noticeSheet.getDataRange().getValues();

      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === targetId) {
          noticeSheet.deleteRow(i + 1);
          break;
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // G. 방문자 접속 텔레메트리 기록
    else if (action === "VISIT") {
      const visitSheet = ss.getSheetByName("Visits");
      const todayStr = getTodayString();
      const now = new Date();

      visitSheet.appendRow([
        now,
        todayStr,
        now.getHours(),
        data.device || "기타",
        data.os || "기타 OS",
        data.browser || "기타 브라우저",
        data.screen || "",
        data.location || "South Korea Suwon",
        data.referrer || "직접 접속"
      ]);

      const visits = calculateVisits(ss, todayStr);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        visits: visits
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Unknown action" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ========================================================
// 3. 보조 헬퍼 함수군
// ========================================================
function getTodayString() {
  const d = new Date();
  return d.getFullYear() + "." +
    String(d.getMonth() + 1).padStart(2, '0') + "." +
    String(d.getDate()).padStart(2, '0');
}

function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

function initAllSheets(ss) {
  const required = [
    { name: "Visits", headers: ["접속일시", "날짜", "시간대(시)", "기기종류", "운영체제", "브라우저", "해상도", "접속위치", "유입경로"] },
    { name: "Reviews", headers: ["ID", "날짜", "닉네임", "별점", "내용", "생성일시"] },
    { name: "Inquiries", headers: ["접수일시", "이메일", "문의내용", "디바이스정보"] },
    { name: "Notices", headers: ["ID", "날짜", "버전", "공지내용", "생성일시"] },
    { name: "MediaUploads", headers: ["업로드일시", "파일구분", "파일명", "파일ID", "드라이브링크", "파일크기(byte)"] }
  ];

  required.forEach(item => {
    let sheet = ss.getSheetByName(item.name);
    if (!sheet) {
      sheet = ss.insertSheet(item.name);
      sheet.appendRow(item.headers);
      sheet.getRange(1, 1, 1, item.headers.length).setFontWeight("bold").setBackground("#f1f5f9");
      sheet.setFrozenRows(1);
    }
  });
}

function calculateVisits(ss, todayStr) {
  const sheet = ss.getSheetByName("Visits");
  const data = sheet.getDataRange().getValues();
  let todayCount = 0;
  const totalCount = Math.max(0, data.length - 1);

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === todayStr) {
      todayCount++;
    }
  }

  return {
    today: Math.max(1, todayCount),
    total: Math.max(todayCount, totalCount),
    date: todayStr
  };
}

function getNoticesData(ss) {
  const sheet = ss.getSheetByName("Notices");
  const data = sheet.getDataRange().getValues();
  const notices = [];

  for (let i = data.length - 1; i >= 1; i--) {
    notices.push({
      id: data[i][0],
      date: data[i][1],
      version: data[i][2],
      content: data[i][3]
    });
  }
  return notices;
}

function getReviewsData(ss) {
  const sheet = ss.getSheetByName("Reviews");
  const data = sheet.getDataRange().getValues();
  const reviews = [];

  for (let i = data.length - 1; i >= 1; i--) {
    reviews.push({
      id: data[i][0],
      date: data[i][1],
      nickname: data[i][2],
      rating: data[i][3],
      content: data[i][4]
    });
  }
  return reviews;
}

function getDeviceStats(ss) {
  const sheet = ss.getSheetByName("Visits");
  const data = sheet.getDataRange().getValues();
  const stats = { "아이폰": 0, "안드로이드폰": 0, "아이패드": 0, "안드로이드패드": 0, "PC": 0, "기타": 0 };

  for (let i = 1; i < data.length; i++) {
    const dev = String(data[i][3]);
    if (stats.hasOwnProperty(dev)) {
      stats[dev]++;
    } else {
      stats["기타"]++;
    }
  }
  return stats;
}

function getLocationStats(ss) {
  const sheet = ss.getSheetByName("Visits");
  const data = sheet.getDataRange().getValues();
  const locMap = {};

  for (let i = 1; i < data.length; i++) {
    const loc = String(data[i][7] || "South Korea Suwon");
    locMap[loc] = (locMap[loc] || 0) + 1;
  }
  return locMap;
}
