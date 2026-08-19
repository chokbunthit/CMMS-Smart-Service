/**
 * ==========================================================================
 * AUT CMMS - Centralized Google Apps Script (GAS) API Client (api.js)
 * ==========================================================================
 */

const CmmsApi = (function () {
  // Google Apps Script Web App Endpoint URL
  const DEFAULT_GAS_URL =
    "https://script.google.com/macros/s/AKfycbwITn08Mocvo_Q0DUbFB_5oatnTRfKx7sD9GVMNi3PKK7K4LW-gyphO7doS080U841Q0g/exec";

  let baseUrl = DEFAULT_GAS_URL;

  /**
   * กำหนด Web App URL หากต้องการเปลี่ยน
   */
  function setBaseUrl(url) {
    if (url) baseUrl = url;
  }

  /**
   * ฟังก์ชันเรียก API กลางไปยัง Google Apps Script
   * รองรับ CORS POST แบบ text/plain ตามมาตรฐานของ GAS Web App
   */
  async function request(action, payload = {}, method = "POST") {
    try {
      let url = baseUrl;
      let options = {};

      if (method.toUpperCase() === "GET") {
        const params = new URLSearchParams({ action, ...payload });
        url = `${baseUrl}?${params.toString()}`;
        options = { method: "GET" };
      } else {
        const bodyData = {
          action: action,
          ...payload
        };
        options = {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify(bodyData)
        };
      }

      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`CmmsApi.${action} Error:`, error);
      throw error;
    }
  }

  /* ==========================================================================
     API METHODS
     ========================================================================== */

  /**
   * 1. ดึงข้อมูลเครื่องจักรและแผนก (Assets, Components, Departments, Locations)
   */
  async function getMachines() {
    return await request("getMachines", {}, "GET");
  }

  /**
   * 2. ส่งข้อมูลแจ้งซ่อมใหม่ (Create Repair Request)
   */
  async function createRepairRequest(data) {
    return await request("createRepairRequest", data, "POST");
  }

  /**
   * 3. ดึงรายการแจ้งซ่อม (Tickets) สำหรับหน้าติดตามงาน หรือ Dashboard
   */
  async function getTickets(userId = "", status = "") {
    try {
      const res = await request("getTickets", { userId, status }, "POST");
      return res;
    } catch (e) {
      // Fallback call via GET
      return await request("getTickets", { userId, status }, "GET");
    }
  }

  /**
   * 4. ดึงรายละเอียดใบแจ้งซ่อมเดี่ยว (Ticket Detail)
   */
  async function getTicketDetail(ticketNo) {
    return await request("getTicketDetail", { ticketNo }, "POST");
  }

  /**
   * 5. ดึงข้อมูลสถิติภาพรวมสำหรับหน้า Dashboard (Stats)
   */
  async function getDashboardStats(userId = "") {
    try {
      return await request("getDashboardStats", { userId }, "POST");
    } catch (e) {
      // Return default stats structure if not implemented in GAS yet
      return {
        status: "success",
        data: {
          total: 0,
          pending: 0,
          inProgress: 0,
          waitingParts: 0,
          completed: 0
        }
      };
    }
  }

  /**
   * 6. ดึงข้อมูลโปรไฟล์ผู้ใช้งาน
   */
  async function getUserProfile(userId) {
    return await request("getUserProfile", { userId }, "POST");
  }

  /**
   * 7. บันทึกข้อมูลแก้ไขโปรไฟล์ผู้ใช้งาน
   */
  async function updateUserProfile(userId, profileData) {
    return await request("updateUserProfile", { userId, ...profileData }, "POST");
  }

  /**
   * 8. ตรวจสอบ Verify LIFF ID Token
   */
  async function verifyLiffToken(idToken) {
    return await request("verifyLiffToken", { idToken }, "POST");
  }

  /**
   * 9. ตรวจสอบ Login ผู้ใช้ระบบ (Username / Password)
   */
  async function checkUserLogin(username, password) {
    return await request("checkUserLogin", { username, password }, "POST");
  }

  /**
   * Helper Utility: แปลงไฟล์รูปภาพเป็น Base64 Data URL
   */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve("");
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  }

  // Public Interface
  return {
    setBaseUrl,
    getMachines,
    createRepairRequest,
    getTickets,
    getTicketDetail,
    getDashboardStats,
    getUserProfile,
    updateUserProfile,
    verifyLiffToken,
    checkUserLogin,
    fileToBase64,
    request,
    DEFAULT_GAS_URL
  };
})();

// ให้เข้าถึงได้ทั่วโลก
window.CmmsApi = CmmsApi;
