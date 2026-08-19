/**
 * ==========================================================================
 * AUT CMMS - Central LIFF Authentication Service (liff-auth.js)
 * ==========================================================================
 */

const LiffAuth = (function () {
  // Config: กำหนด LIFF ID กลางของระบบ (ตรงกับที่ตั้งค่าใน Rich Menu)
  const DEFAULT_LIFF_ID = "2011050588-FTDVMv4L";
  const STORAGE_KEY = "cmms_user_session";

  let currentUser = null;
  let isInitialized = false;

  /**
   * แสดง Loading Overlay
   */
  function showLoading(text, subText) {
    const overlay = document.getElementById("loadingOverlay");
    const textEl = document.getElementById("loadingText");
    const subTextEl = document.getElementById("loadingSubText");

    if (textEl && text) textEl.textContent = text;
    if (subTextEl && subText) subTextEl.textContent = subText;
    if (overlay) {
      overlay.style.display = "flex";
      overlay.classList.remove("loading-hide");
    }
  }

  /**
   * ซ่อน Loading Overlay
   */
  function hideLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (!overlay) return;
    overlay.classList.add("loading-hide");
    setTimeout(() => {
      if (overlay.classList.contains("loading-hide")) {
        overlay.style.display = "none";
      }
    }, 280);
  }

  /**
   * ดึงข้อมูล User จาก LocalStorage
   */
  function getCachedUser() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("userSession");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to parse cached user:", e);
    }
    return null;
  }

  /**
   * บันทึกข้อมูล User ลง LocalStorage
   */
  function saveUser(user) {
    currentUser = user;
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      // เก็บ backward compatibility ด้วย
      localStorage.setItem("userSession", JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("userSession");
    }
  }

  /**
   * เริ่มต้นระบบ LIFF และดึง User Profile
   * @param {Object} options - { liffId, requiredAuth: true/false, onReady: Function }
   */
  async function init(options = {}) {
    const liffId = options.liffId || DEFAULT_LIFF_ID;
    const requiredAuth = options.requiredAuth !== false; // default true

    showLoading("กำลังเชื่อมต่อระบบ LINE...", "กรุณารอสักครู่");

    try {
      // 1. ตรวจสอบว่า LIFF SDK โหลดเสร็จหรือยัง
      if (typeof liff === "undefined") {
        console.warn("LIFF SDK not found in window");
        throw new Error("ไม่สามารถโหลด LINE LIFF SDK ได้ กรุณาเชื่อมต่ออินเทอร์เน็ต");
      }

      // 2. เรียก liff.init
      await liff.init({ liffId });
      isInitialized = true;

      // 3. ตรวจสอบสถานะการเข้าสู่ระบบ
      if (liff.isLoggedIn()) {
        showLoading("กำลังดึงข้อมูลผู้ใช้งาน...", "กรุณารอสักครู่");
        const profile = await liff.getProfile();
        const idToken = liff.getIDToken ? liff.getIDToken() : null;

        currentUser = {
          userId: profile.userId || "",
          displayName: profile.displayName || "ผู้ใช้งาน LINE",
          pictureUrl: profile.pictureUrl || "",
          statusMessage: profile.statusMessage || "",
          idToken: idToken,
          isLoggedIn: true,
          authSource: "liff"
        };

        saveUser(currentUser);
        hideLoading();

        if (typeof options.onReady === "function") {
          options.onReady(currentUser);
        }
        return currentUser;
      }

      // 4. กรณีเปิดใน LINE App แต่ยังไม่ได้ Login
      if (liff.isInClient()) {
        showLoading("กำลังเข้าสู่ระบบ LINE...", "ระบบจะนำท่านเข้าสู่ระบบ");
        liff.login();
        return null;
      }

      // 5. กรณีเปิดใน External Browser ปกติ
      // ตรวจสอบว่ามี cached session เดิมหรือไม่
      const cached = getCachedUser();
      if (cached) {
        currentUser = cached;
        hideLoading();
        if (typeof options.onReady === "function") {
          options.onReady(currentUser);
        }
        return currentUser;
      }

      // หากจำเป็นต้อง Auth แต่เปิดใน Browser ทั่วไป
      if (requiredAuth) {
        showLoading("กำลังเปลี่ยนหน้าไป LINE Login...", "กรุณารอสักครู่");
        liff.login();
        return null;
      } else {
        // อนุญาต Guest
        currentUser = {
          userId: "",
          displayName: "ผู้เยี่ยมชม (Guest)",
          pictureUrl: "",
          isLoggedIn: false,
          authSource: "guest"
        };
        hideLoading();
        if (typeof options.onReady === "function") {
          options.onReady(currentUser);
        }
        return currentUser;
      }

    } catch (err) {
      console.error("LiffAuth.init Error:", err);
      // Fallback จาก LocalStorage หาก offline หรือมีปัญหา
      const cached = getCachedUser();
      if (cached) {
        currentUser = cached;
        hideLoading();
        if (typeof options.onReady === "function") {
          options.onReady(currentUser);
        }
        return currentUser;
      }

      hideLoading();
      // สร้าง Guest User fallback
      currentUser = {
        userId: "guest",
        displayName: "Guest User",
        pictureUrl: "",
        isLoggedIn: false,
        authSource: "fallback"
      };

      if (typeof options.onReady === "function") {
        options.onReady(currentUser);
      }
      return currentUser;
    }
  }

  /**
   * ดึงข้อมูลผู้ใช้งานปัจจุบัน
   */
  function getUser() {
    return currentUser || getCachedUser();
  }

  /**
   * สแกน QR Code ผ่าน LIFF (สำหรับหน้าสร้าง Ticket)
   */
  async function scanQRCode() {
    if (typeof liff !== "undefined" && liff.isInClient && liff.isInClient() && liff.scanCodeV2) {
      try {
        const res = await liff.scanCodeV2();
        return res ? (res.value || "").trim() : "";
      } catch (err) {
        console.warn("QR Scan error:", err);
        throw err;
      }
    } else {
      throw new Error("การสแกน QR Code รองรับเฉพาะบนแอปพลิเคชัน LINE บนมือถือเท่านั้น");
    }
  }

  /**
   * ออกจากระบบ
   */
  function logout() {
    saveUser(null);
    if (typeof liff !== "undefined" && liff.isLoggedIn && liff.isLoggedIn()) {
      liff.logout();
    }
    location.reload();
  }

  // Public API
  return {
    init,
    getUser,
    saveUser,
    logout,
    scanQRCode,
    showLoading,
    hideLoading,
    DEFAULT_LIFF_ID
  };
})();

// ให้เข้าถึงได้ทั่วโลก
window.LiffAuth = LiffAuth;
