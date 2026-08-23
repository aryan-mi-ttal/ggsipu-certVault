/**
 * GGSIPU CertVault Application State & Logic Manager
 * Unified Single Deployment: Public Verifier by Default + Staff Portal Google Authentication
 * 
 * Version: 3.1.0
 */

// Global Configuration & Deployment State
let GAS_API_URL = localStorage.getItem("GGSIPU_GAS_API_URL") || "";
let ADMIN_API_KEY = localStorage.getItem("GGSIPU_ADMIN_API_KEY") || "";
const DEFAULT_SALT = "GGSIPU_SALT_2026_DSW_SECURE_HASH";
// Authenticated Staff Session State (null when in public mode)
let currentStaffSession = null;
const BACKEND_API_BASE = '';

function getAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const token = (currentStaffSession && currentStaffSession.token) || sessionStorage.getItem("GGSIPU_AUTH_TOKEN");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (currentStaffSession && currentStaffSession.email) {
    headers["x-user-email"] = currentStaffSession.email;
    headers["x-user-role"] = currentStaffSession.role || "ADMIN";
    if (currentStaffSession.id) {
      headers["x-user-id"] = String(currentStaffSession.id);
    }
  }
  const apiKey = ADMIN_API_KEY || localStorage.getItem("GGSIPU_ADMIN_API_KEY") || "GGSIPU_SECURE_ADMIN_KEY_2026";
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }
  return headers;
}
// Initial Pre-populated Master Ledger State (Synthetic GGSIPU Test Dataset)
let mockLedger = [
  {
    CertID: "GGSIPU-2026-DSW-1001",
    RollNumber: "01216403221",
    StudentName: "Aarav Sharma",
    Email: "aarav.sharma@ggsipu.edu",
    School: "USICT",
    Course: "B.Tech CSE",
    EventName: "Smart India Hackathon 2026 Internal Round",
    IssueDate: "2026-08-15",
    Status: "Approved",
    SHA256Hash: "6c2e35327ecad8b417ef2f205c0888dfae8e97a389fc781ea32a39281a8f94d0",
    MerkleRoot: "8f2d4e910a11b12c13d14e15f16a17b18c19d20e21f22a23b24c25d26e27f28a",
    DrivePdfUrl: "https://drive.google.com/file/d/mock_1001/view",
    QrVerificationUrl: "https://ggsipu.ac.in/verify?certId=GGSIPU-2026-DSW-1001",
    ApprovedBy: "Prof. Dean Students' Welfare (Dean DSW)",
    ApprovalDate: "2026-08-15"
  },
  {
    CertID: "GGSIPU-2026-DSW-1002",
    RollNumber: "04516403221",
    StudentName: "Ananya Verma",
    Email: "ananya.verma@ggsipu.edu",
    School: "USICT",
    Course: "B.Tech IT",
    EventName: "Annual Cybersecurity & Cryptography Workshop 2026",
    IssueDate: "2026-08-15",
    Status: "Approved",
    SHA256Hash: "e5a7b1c3d9e0f2a4b6c8d0e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1",
    MerkleRoot: "8f2d4e910a11b12c13d14e15f16a17b18c19d20e21f22a23b24c25d26e27f28a",
    DrivePdfUrl: "https://drive.google.com/file/d/mock_1002/view",
    QrVerificationUrl: "https://ggsipu.ac.in/verify?certId=GGSIPU-2026-DSW-1002",
    ApprovedBy: "Prof. Dean Students' Welfare (Dean DSW)",
    ApprovalDate: "2026-08-15"
  },
  {
    CertID: "GGSIPU-2026-DSW-1003",
    RollNumber: "08916403221",
    StudentName: "Rohan Gupta",
    Email: "rohan.gupta@ggsipu.edu",
    School: "USMS",
    Course: "MBA Finance",
    EventName: "Industrial Internship & Leadership Training",
    IssueDate: "2026-08-14",
    Status: "Pending",
    SHA256Hash: "b7c8d9e0f1a234567890abcdef1234567890abcdef1234567890abcdef123456",
    MerkleRoot: "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a234567890abcde",
    DrivePdfUrl: "https://drive.google.com/file/d/mock_1003/view",
    QrVerificationUrl: "https://ggsipu.ac.in/verify?certId=GGSIPU-2026-DSW-1003",
    ApprovedBy: "",
    ApprovalDate: ""
  },
  {
    CertID: "GGSIPU-2026-DSW-1004",
    RollNumber: "11216403221",
    StudentName: "Priya Nair",
    Email: "priya.nair@ggsipu.edu",
    School: "USLLS",
    Course: "BA LLB",
    EventName: "National Moot Court Competition 2026",
    IssueDate: "2026-08-10",
    Status: "Pending",
    SHA256Hash: "c9d0e1f2a3b45678901234567890abcdef1234567890abcdef1234567890abcd",
    MerkleRoot: "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a234567890abcde",
    DrivePdfUrl: "https://drive.google.com/file/d/mock_1004/view",
    QrVerificationUrl: "https://ggsipu.ac.in/verify?certId=GGSIPU-2026-DSW-1004",
    ApprovedBy: "",
    ApprovalDate: ""
  },
  {
    CertID: "GGSIPU-2026-DSW-1005",
    RollNumber: "15016403221",
    StudentName: "Kabir Patel",
    Email: "kabir.patel@ggsipu.edu",
    School: "USCT",
    Course: "B.Tech Chemical",
    EventName: "Green Energy & Tech Symposium",
    IssueDate: "2026-08-10",
    Status: "Revoked",
    SHA256Hash: "d0e1f2a3b4c5678901234567890abcdef1234567890abcdef1234567890abcde",
    MerkleRoot: "6b7c8d9e0f1a234567890abcdef1234567890abcdef1234567890abcdef1234",
    DrivePdfUrl: "https://drive.google.com/file/d/mock_1005/view",
    QrVerificationUrl: "https://ggsipu.ac.in/verify?certId=GGSIPU-2026-DSW-1005",
    ApprovedBy: "Prof. Dean Students' Welfare (Dean DSW)",
    ApprovalDate: "2026-08-10"
  }
];

// Initial Audit Logs State
let mockAuditLogs = [
  { Timestamp: "2026-08-15 14:30:00", EventType: "BATCH_ISSUANCE", Details: "Created batch of 2 certificates with status Pending. Merkle Root: 8f2d4e910a11...", PerformedBy: "dsw.issuer@ggsipu.edu" },
  { Timestamp: "2026-08-15 14:25:00", EventType: "APPROVAL", Details: "Certificate GGSIPU-2026-DSW-1001 transitioned from [Pending] -> [Approved] by Prof. Dean Students' Welfare (Dean DSW)", PerformedBy: "dean.dsw@ipu.ac.in" },
  { Timestamp: "2026-08-12 11:15:00", EventType: "REVOCATION", Details: "Certificate GGSIPU-2026-DSW-1005 transitioned from [Approved] -> [Revoked]. Reason: Duplicate registration entry", PerformedBy: "dean.dsw@ipu.ac.in" }
];

// Authorized Users Ledger State (Loaded directly from NeonDB)
let neonUsers = [];

let parsedCsvRecords = [];
let html5QrCode = null;
let currentRevocationCertId = "";

/**
 * Robust HTML Sanitizer
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Standard WebCrypto SHA-256 Hex Hash
 */
async function computeSha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Canonical SHA-256 hash
 */
async function computeCertificateRecordHash(record) {
  const certId = String(record.CertID || "").trim();
  const rollNo = String(record.RollNumber || record.RollNo || "").trim();
  const name = String(record.StudentName || record.Name || "").trim().toUpperCase();
  const event = String(record.EventName || record.Event || "").trim();
  const date = String(record.IssueDate || "").trim();
  const salt = DEFAULT_SALT;

  const payload = [
    `CERT_ID:${certId}`,
    `ROLL_NO:${rollNo}`,
    `NAME:${name}`,
    `EVENT:${event}`,
    `DATE:${date}`,
    `SALT:${salt}`
  ].join("|");

  return await computeSha256(payload);
}

/**
 * Merkle Tree Root Calculation
 */
async function computeMerkleRoot(hashes) {
  if (!hashes || hashes.length === 0) return "";
  if (hashes.length === 1) return hashes[0];

  let currentLayer = hashes.slice();

  while (currentLayer.length > 1) {
    const nextLayer = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      if (i + 1 < currentLayer.length) {
        const combined = currentLayer[i] + currentLayer[i + 1];
        nextLayer.push(await computeSha256(combined));
      } else {
        const combinedOdd = currentLayer[i] + currentLayer[i];
        nextLayer.push(await computeSha256(combinedOdd));
      }
    }
    currentLayer = nextLayer;
  }

  return currentLayer[0];
}

/**
 * Unique Certificate ID Generator
 */
function generateUniqueCertId(existingSet) {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 100; attempt++) {
    const timeChunk = Date.now().toString(36).toUpperCase().slice(-4);
    const randChunk = Math.random().toString(16).substring(2, 6).toUpperCase();
    const candidate = `GGSIPU-${year}-DSW-${timeChunk}${randChunk}`;
    if (!existingSet || !existingSet.has(candidate.toUpperCase())) {
      return candidate;
    }
  }
  return `GGSIPU-${year}-DSW-${Date.now().toString(36).toUpperCase()}`;
}

// INITIALIZATION
document.addEventListener("DOMContentLoaded", async () => {
  feather.replace();

  setupNavigation();
  setupThemeToggle();
  setupStaffAuthentication();
  setupVerifier();
  setupFilters();
  setupCsvUploader();
  setupApprovalQueue();
  setupSignaturePad();
  setupCertificateCanvas();
  setupRevocationModal();
  setupStaffUserManagement();
  setupApiConfigModal();
  updateConnectionStatusUI();

  // Recompute initial hashes to ensure 100% cryptographic alignment
  for (let c of mockLedger) {
    c.SHA256Hash = await computeCertificateRecordHash(c);
  }

  // Restore saved staff session if any
  const savedSession = sessionStorage.getItem("GGSIPU_STAFF_AUTH");
  if (savedSession) {
    try {
      const auth = JSON.parse(savedSession);
      currentStaffSession = auth;
      applyStaffLoginState(auth);
      if (auth.role === "ADMIN") {
        fetchStaffUsersFromDb();
      }
      fetchRemoteLedger();
    } catch (e) {
      resetToPublicMode();
    }
  } else {
    resetToPublicMode();
  }

  // Check URL parameters for direct certificate verification (e.g. ?certId=...)
  const urlParams = new URLSearchParams(window.location.search);
  const certId = urlParams.get("certId");
  if (certId) {
    document.getElementById("cert-id-input").value = certId;
    switchToTab("verifier-tab");
    executeVerificationById(certId);
  }

  renderMasterLedger();
  renderMetrics();
  renderApprovalQueue();
  renderAuditLogs();
});

// NAVIGATION
function setupNavigation() {
  document.querySelectorAll(".nav-btn[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      switchToTab(tabId);
    });
  });

  const issueBtn = document.getElementById("dashboard-issue-btn");
  if (issueBtn) {
    issueBtn.addEventListener("click", () => switchToTab("issuer-tab"));
  }
}

function switchToTab(tabId) {
  // If attempting to switch to a staff tab while unauthenticated, open login modal
  if (tabId !== "verifier-tab" && !currentStaffSession) {
    openStaffAuthModal();
    return;
  }

  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));

  const targetBtn = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
  const targetPane = document.getElementById(tabId);

  if (targetBtn) targetBtn.classList.add("active");
  if (targetPane) targetPane.classList.add("active");

  if (tabId === "template-tab") {
    renderCertificateCanvas();
  }
}

// STAFF AUTHENTICATION & LOGIN/LOGOUT
function setupStaffAuthentication() {
  const loginBtn = document.getElementById("staff-login-btn");
  const logoutBtn = document.getElementById("staff-logout-btn");
  const closeBtn = document.getElementById("close-auth-modal-btn");
  const cancelBtn = document.getElementById("cancel-auth-modal-btn");
  const loginForm = document.getElementById("staff-login-form");
  const confirmBtn = document.getElementById("confirm-auth-btn");

  setupPasswordToggle("toggle-auth-password", "auth-password-input", "password");

  if (loginBtn) loginBtn.addEventListener("click", openStaffAuthModal);
  if (closeBtn) closeBtn.addEventListener("click", closeStaffAuthModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeStaffAuthModal);

  async function handleLoginSubmission(e) {
    if (e) e.preventDefault();

    const emailInput = document.getElementById("auth-email-input");
    const passwordInput = document.getElementById("auth-password-input");
    const errorMsg = document.getElementById("auth-error-msg");

    if (errorMsg) {
      errorMsg.style.display = "none";
      errorMsg.textContent = "";
    }

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";

    if (!email) {
      const msg = "Please enter your staff email address";
      if (errorMsg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = "block";
      }
      showToast(msg, "danger");
      if (emailInput) emailInput.focus();
      return;
    }

    if (!password) {
      const msg = "Please enter your password";
      if (errorMsg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = "block";
      }
      showToast(msg, "danger");
      if (passwordInput) passwordInput.focus();
      return;
    }

    const originalBtnText = confirmBtn ? confirmBtn.innerHTML : "";
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<i data-feather="loader"></i> Verifying...`;
      if (window.feather) feather.replace();
    }

    showToast("Verifying credentials with NeonDB database...", "info");

    try {
      const response = await fetch(`${BACKEND_API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        const sessionUser = { ...data.user, token: data.token };
        currentStaffSession = sessionUser;
        sessionStorage.setItem("GGSIPU_STAFF_AUTH", JSON.stringify(sessionUser));
        if (data.token) {
          sessionStorage.setItem("GGSIPU_AUTH_TOKEN", data.token);
        }
        applyStaffLoginState(sessionUser);
        closeStaffAuthModal();
        showToast(`Login successful! Welcome, ${data.user.name || data.user.email}`, "success");

        if (data.user.role === "ADMIN") {
          fetchStaffUsersFromDb();
        }

        await fetchRemoteLedger();
        switchToTab("dashboard-tab");
      } else {
        const msg = data.message || "Invalid email or password. Please verify your credentials.";
        if (errorMsg) {
          errorMsg.textContent = msg;
          errorMsg.style.display = "block";
        }
        showToast(msg, "danger");
      }
    } catch (err) {
      console.error("Login backend error:", err);
      const msg = "Backend connection error. Please ensure the Express NeonDB backend is running on http://localhost:5000";
      if (errorMsg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = "block";
      }
      showToast(msg, "danger");
    } finally {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalBtnText || `<i data-feather="log-in"></i> Sign In`;
        if (window.feather) feather.replace();
      }
    }
  }

  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginSubmission);
  }

  if (confirmBtn) {
    confirmBtn.addEventListener("click", handleLoginSubmission);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      currentStaffSession = null;
      sessionStorage.removeItem("GGSIPU_STAFF_AUTH");
      resetToPublicMode();
      showToast("Signed out of Staff Portal. Returned to Public Verifier.", "info");
      switchToTab("verifier-tab");
    });
  }
}

function openStaffAuthModal() {
  const errorMsg = document.getElementById("auth-error-msg");
  if (errorMsg) {
    errorMsg.style.display = "none";
    errorMsg.textContent = "";
  }
  const emailInput = document.getElementById("auth-email-input");
  const passwordInput = document.getElementById("auth-password-input");
  if (emailInput) emailInput.value = "";
  if (passwordInput) passwordInput.value = "";
  resetPasswordVisibility("toggle-auth-password", "auth-password-input", "password");
  const modal = document.getElementById("staff-auth-modal");
  if (modal) {
    modal.style.display = "flex";
  }
  if (emailInput) emailInput.focus();
  if (window.feather) feather.replace();
}

function closeStaffAuthModal() {
  const modal = document.getElementById("staff-auth-modal");
  if (modal) modal.style.display = "none";
}

function applyStaffLoginState(user) {
  currentStaffSession = user;
  const role = (user.role || "VIEWER").toUpperCase();
  const userName = user.name || (role === "ADMIN" ? "Admin" : role === "ISSUER" ? "Issuer" : role === "APPROVER" ? "Approver" : "User");

  const loginBtn = document.getElementById("staff-login-btn");
  const userBadge = document.getElementById("staff-user-badge");
  if (loginBtn) loginBtn.style.display = "none";
  if (userBadge) userBadge.style.display = "flex";

  const emailElem = document.getElementById("active-user-email");
  if (emailElem) {
    emailElem.textContent = `Welcome, ${userName}`;
  }

  const rolePill = document.getElementById("active-user-role");
  if (rolePill) {
    rolePill.textContent = `Role: ${role}`;
    rolePill.className = `role-pill ${role.toLowerCase()}`;
  }

  const dashboardBtn = document.getElementById("nav-btn-dashboard");
  const issuerBtn = document.getElementById("nav-btn-issuer");
  const approvalBtn = document.getElementById("nav-btn-approval");
  const templateBtn = document.getElementById("nav-btn-template");
  const auditBtn = document.getElementById("nav-btn-audit");
  const usersBtn = document.getElementById("nav-btn-users");
  const configBtn = document.getElementById("api-config-btn");

  if (dashboardBtn) dashboardBtn.style.display = "inline-flex";

  if (role === "ADMIN") {
    if (issuerBtn) issuerBtn.style.display = "inline-flex";
    if (approvalBtn) approvalBtn.style.display = "inline-flex";
    if (templateBtn) templateBtn.style.display = "inline-flex";
    if (auditBtn) auditBtn.style.display = "inline-flex";
    if (usersBtn) usersBtn.style.display = "inline-flex";
    if (configBtn) configBtn.style.display = "inline-flex";
  } else if (role === "ISSUER") {
    if (issuerBtn) issuerBtn.style.display = "inline-flex";
    if (templateBtn) templateBtn.style.display = "inline-flex";
    if (approvalBtn) approvalBtn.style.display = "none";
    if (auditBtn) auditBtn.style.display = "none";
    if (usersBtn) usersBtn.style.display = "none";
    if (configBtn) configBtn.style.display = "none";
  } else if (role === "APPROVER") {
    if (approvalBtn) approvalBtn.style.display = "inline-flex";
    if (auditBtn) auditBtn.style.display = "inline-flex";
    if (issuerBtn) issuerBtn.style.display = "none";
    if (templateBtn) templateBtn.style.display = "none";
    if (usersBtn) usersBtn.style.display = "none";
    if (configBtn) configBtn.style.display = "none";
  } else {
    // VIEWER
    if (issuerBtn) issuerBtn.style.display = "none";
    if (approvalBtn) approvalBtn.style.display = "none";
    if (templateBtn) templateBtn.style.display = "none";
    if (auditBtn) auditBtn.style.display = "inline-flex";
    if (usersBtn) usersBtn.style.display = "none";
    if (configBtn) configBtn.style.display = "none";
  }

  if (window.feather) feather.replace();
}

function resetToPublicMode() {
  currentStaffSession = null;
  const loginBtn = document.getElementById("staff-login-btn");
  const userBadge = document.getElementById("staff-user-badge");
  if (loginBtn) loginBtn.style.display = "inline-flex";
  if (userBadge) userBadge.style.display = "none";

  document.querySelectorAll(".staff-tab").forEach(t => t.style.display = "none");
  document.querySelectorAll(".role-perm-admin").forEach(el => el.style.display = "none");

  if (window.feather) feather.replace();
}

async function fetchStaffUsersFromDb() {
  try {
    const res = await fetch(`${BACKEND_API_BASE}/api/auth/users`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        neonUsers = data.users.map(u => ({
          id: u.id,
          Name: u.name || u.email.split('@')[0],
          Email: u.email,
          Role: (u.role || 'VIEWER').toUpperCase(),
          is_active: u.is_active !== false,
          AddedOn: u.created_at ? new Date(u.created_at).toISOString().split('T')[0] : '2026-08-01'
        }));
        renderStaffUsers();
      }
    }
  } catch (err) {
    console.warn("Could not fetch staff users from NeonDB backend:", err);
  }
}

// THEME TOGGLE
function setupThemeToggle() {
  const toggleBtn = document.getElementById("theme-toggle");
  if (!toggleBtn) return;
  toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    document.getElementById("theme-icon").setAttribute("data-feather", isDark ? "sun" : "moon");
    feather.replace();
    showToast(isDark ? "Dark theme enabled" : "Light theme enabled");
  });
}

function setupPasswordToggle(buttonId, inputId, label = "password") {
  const toggleBtn = document.getElementById(buttonId);
  const input = document.getElementById(inputId);
  if (!toggleBtn || !input) return;

  toggleBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isCurrentlyPassword = input.type === "password";
    input.type = isCurrentlyPassword ? "text" : "password";
    const newTitle = isCurrentlyPassword ? `Hide ${label}` : `Show ${label}`;
    const iconName = isCurrentlyPassword ? "eye-off" : "eye";
    toggleBtn.setAttribute("title", newTitle);
    toggleBtn.setAttribute("aria-label", newTitle);
    toggleBtn.innerHTML = `<i data-feather="${iconName}"></i>`;
    if (window.feather) {
      feather.replace();
    }
    input.focus();
  });
}

function resetPasswordVisibility(buttonId, inputId, label = "password") {
  const toggleBtn = document.getElementById(buttonId);
  const input = document.getElementById(inputId);
  if (input) {
    input.type = "password";
  }
  if (toggleBtn) {
    const title = `Show ${label}`;
    toggleBtn.setAttribute("title", title);
    toggleBtn.setAttribute("aria-label", title);
    toggleBtn.innerHTML = '<i data-feather="eye"></i>';
    if (window.feather) {
      feather.replace();
    }
  }
}

// PUBLIC VERIFICATION PORTAL
function setupVerifier() {
  const vtabs = document.querySelectorAll(".vtab-btn");
  vtabs.forEach(btn => {
    btn.addEventListener("click", () => {
      vtabs.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".vtab-content").forEach(c => c.classList.remove("active"));

      btn.classList.add("active");
      const targetId = btn.getAttribute("data-vtab");
      document.getElementById(targetId).classList.add("active");
    });
  });

  document.querySelectorAll(".sample-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const sampleId = chip.getAttribute("data-sample-id");
      document.getElementById("cert-id-input").value = sampleId;
      executeVerificationById(sampleId);
    });
  });

  document.getElementById("verify-id-btn").addEventListener("click", () => {
    const certId = document.getElementById("cert-id-input").value.trim();
    executeVerificationById(certId);
  });

  document.getElementById("cert-id-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const certId = document.getElementById("cert-id-input").value.trim();
      executeVerificationById(certId);
    }
  });

  document.getElementById("start-qr-btn").addEventListener("click", startQrScanner);
  document.getElementById("stop-qr-btn").addEventListener("click", stopQrScanner);

  const dropzone = document.getElementById("pdf-dropzone");
  const fileInput = document.getElementById("pdf-file-input");

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "var(--primary)";
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.style.borderColor = "var(--border-color)";
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "var(--border-color)";
    if (e.dataTransfer.files.length > 0) {
      processPdfFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      processPdfFile(e.target.files[0]);
    }
  });
}

async function executeVerificationById(certId) {
  if (!certId) {
    showToast("Please enter a Certificate ID", "danger");
    return;
  }

  showToast("Verifying Certificate ID: " + certId + "...");

  if (GAS_API_URL) {
    try {
      const response = await fetch(`${GAS_API_URL}?action=verifyId&certId=${encodeURIComponent(certId)}`);
      const data = await response.json();
      if (data.status === "found") {
        renderVerificationResult(data.certificate, certId, data.integrityCheck);
        return;
      } else {
        renderVerificationResult(null, certId, "NOT_FOUND");
        return;
      }
    } catch (err) {
      console.warn("Backend verification error, checking local ledger:", err);
    }
  }

  const found = mockLedger.find(c => (c.CertID || "").trim().toLowerCase() === certId.trim().toLowerCase());
  if (found) {
    const recomputedHash = await computeCertificateRecordHash(found);
    const isUntampered = (recomputedHash.toLowerCase() === (found.SHA256Hash || "").toLowerCase());
    renderVerificationResult(found, certId, isUntampered ? "PASSED" : "FAILED_TAMPERED");
  } else {
    renderVerificationResult(null, certId, "NOT_FOUND");
  }
}

function renderVerificationResult(record, queryId, integrityStatus = "PASSED") {
  const placeholder = document.getElementById("result-placeholder");
  const content = document.getElementById("result-content");
  const header = document.getElementById("result-badge-header");
  const icon = document.getElementById("result-badge-icon");
  const title = document.getElementById("result-status-title");
  const subtitle = document.getElementById("result-status-subtitle");

  placeholder.style.display = "none";
  content.style.display = "block";

  if (!record) {
    header.className = "verification-badge-header revoked";
    icon.setAttribute("data-feather", "alert-circle");
    title.textContent = "CERTIFICATE NOT FOUND / UNVERIFIED";
    subtitle.textContent = `No record found in GGSIPU Ledger matching '${escapeHtml(queryId)}'`;
    
    document.getElementById("res-cert-id").textContent = queryId;
    document.getElementById("res-student-name").textContent = "N/A";
    document.getElementById("res-roll-no").textContent = "N/A";
    document.getElementById("res-school").textContent = "N/A";
    document.getElementById("res-event").textContent = "N/A";
    document.getElementById("res-issue-date").textContent = "N/A";
    document.getElementById("res-approved-by").textContent = "N/A";
    document.getElementById("res-integrity").textContent = "NOT FOUND";
    document.getElementById("res-integrity").className = "d-value text-danger";
    document.getElementById("res-sha256").textContent = "N/A";
    document.getElementById("res-merkle").textContent = "N/A";
  } else if (integrityStatus === "FAILED_TAMPERED") {
    header.className = "verification-badge-header revoked";
    icon.setAttribute("data-feather", "alert-triangle");
    title.textContent = "TAMPER ALERT: INTEGRITY CHECK FAILED";
    subtitle.textContent = "Record metadata in ledger does not match cryptographic SHA-256 seal!";

    document.getElementById("res-cert-id").textContent = record.CertID;
    document.getElementById("res-student-name").textContent = record.StudentName;
    document.getElementById("res-roll-no").textContent = record.RollNumber;
    document.getElementById("res-school").textContent = record.School;
    document.getElementById("res-event").textContent = record.EventName;
    document.getElementById("res-issue-date").textContent = record.IssueDate;
    document.getElementById("res-approved-by").textContent = record.ApprovedBy || "N/A";
    document.getElementById("res-integrity").textContent = "TAMPERED / MISMATCH";
    document.getElementById("res-integrity").className = "d-value text-danger";
    document.getElementById("res-sha256").textContent = record.SHA256Hash;
    document.getElementById("res-merkle").textContent = record.MerkleRoot;
  } else if (record.Status === "Revoked") {
    header.className = "verification-badge-header revoked";
    icon.setAttribute("data-feather", "slash");
    title.textContent = "CERTIFICATE FORMALLY REVOKED";
    subtitle.textContent = "This certificate was formally revoked by GGSIPU Competent Authority";

    document.getElementById("res-cert-id").textContent = record.CertID;
    document.getElementById("res-student-name").textContent = record.StudentName;
    document.getElementById("res-roll-no").textContent = record.RollNumber;
    document.getElementById("res-school").textContent = record.School;
    document.getElementById("res-event").textContent = record.EventName;
    document.getElementById("res-issue-date").textContent = record.IssueDate;
    document.getElementById("res-approved-by").textContent = record.ApprovedBy || "Dean DSW";
    document.getElementById("res-integrity").textContent = "INVALID (REVOKED)";
    document.getElementById("res-integrity").className = "d-value text-danger";
    document.getElementById("res-sha256").textContent = record.SHA256Hash;
    document.getElementById("res-merkle").textContent = record.MerkleRoot;
  } else if (record.Status === "Pending") {
    header.className = "verification-badge-header revoked";
    icon.setAttribute("data-feather", "clock");
    title.textContent = "CERTIFICATE PENDING APPROVAL";
    subtitle.textContent = "This certificate has been generated but is awaiting Competent Authority signature";

    document.getElementById("res-cert-id").textContent = record.CertID;
    document.getElementById("res-student-name").textContent = record.StudentName;
    document.getElementById("res-roll-no").textContent = record.RollNumber;
    document.getElementById("res-school").textContent = record.School;
    document.getElementById("res-event").textContent = record.EventName;
    document.getElementById("res-issue-date").textContent = record.IssueDate;
    document.getElementById("res-approved-by").textContent = "Awaiting Approval";
    document.getElementById("res-integrity").textContent = "PENDING SIGN-OFF";
    document.getElementById("res-integrity").className = "d-value text-warning";
    document.getElementById("res-sha256").textContent = record.SHA256Hash;
    document.getElementById("res-merkle").textContent = record.MerkleRoot;
  } else {
    header.className = "verification-badge-header valid";
    icon.setAttribute("data-feather", "check-circle");
    title.textContent = "CERTIFICATE VERIFIED & AUTHENTIC";
    subtitle.textContent = "Cryptographic SHA-256 Hash Matched Google Workspace Blockchain Ledger";

    document.getElementById("res-cert-id").textContent = record.CertID;
    document.getElementById("res-student-name").textContent = record.StudentName;
    document.getElementById("res-roll-no").textContent = record.RollNumber;
    document.getElementById("res-school").textContent = record.School;
    document.getElementById("res-event").textContent = record.EventName;
    document.getElementById("res-issue-date").textContent = record.IssueDate;
    document.getElementById("res-approved-by").textContent = record.ApprovedBy || "Dean DSW";
    document.getElementById("res-integrity").textContent = "100% UNTAMPERED";
    document.getElementById("res-integrity").className = "d-value text-success";
    document.getElementById("res-sha256").textContent = record.SHA256Hash;
    document.getElementById("res-merkle").textContent = record.MerkleRoot;
    
    const driveLink = document.getElementById("res-drive-link");
    if (driveLink) {
      driveLink.href = record.DrivePdfUrl || "#";
    }
  }

  feather.replace();
}

// QR SCANNER
function startQrScanner() {
  document.getElementById("start-qr-btn").style.display = "none";
  document.getElementById("stop-qr-btn").style.display = "inline-flex";

  html5QrCode = new Html5Qrcode("qr-reader");
  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => {
      showToast(`QR Code Scanned: ${decodedText}`);
      let certId = decodedText;
      if (decodedText.includes("certId=")) {
        try {
          const urlObj = new URL(decodedText);
          certId = urlObj.searchParams.get("certId") || decodedText;
        } catch (e) {
          const parts = decodedText.split("certId=");
          if (parts[1]) certId = parts[1].split("&")[0];
        }
      }
      stopQrScanner();
      document.getElementById("cert-id-input").value = certId;
      executeVerificationById(certId);
    },
    () => {}
  ).catch(err => {
    showToast("Webcam access denied or unavailable", "danger");
    stopQrScanner();
  });
}

function stopQrScanner() {
  if (html5QrCode) {
    html5QrCode.stop().then(() => {
      html5QrCode = null;
      document.getElementById("start-qr-btn").style.display = "inline-flex";
      document.getElementById("stop-qr-btn").style.display = "none";
    }).catch(() => {
      document.getElementById("start-qr-btn").style.display = "inline-flex";
      document.getElementById("stop-qr-btn").style.display = "none";
    });
  }
}

// WEBCRYPTO SHA-256 PDF HASHER
async function processPdfFile(file) {
  const hashBox = document.getElementById("file-hash-output");
  const codeElem = document.getElementById("computed-hash-code");
  hashBox.style.display = "block";
  codeElem.textContent = "Computing WebCrypto SHA-256 hash...";

  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hexHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    codeElem.textContent = hexHash;
    showToast("Document SHA-256 Hash computed successfully!");

    if (GAS_API_URL) {
      try {
        const response = await fetch(`${GAS_API_URL}?action=verifyHash&hash=${encodeURIComponent(hexHash)}`);
        const data = await response.json();
        if (data.status === "found") {
          renderVerificationResult(data.certificate, data.certificate.CertID, data.integrityCheck);
          return;
        }
      } catch (err) {
        console.warn("Backend hash verification failed, falling back to local:", err);
      }
    }

    const found = mockLedger.find(c => (c.SHA256Hash || "").toLowerCase() === hexHash.toLowerCase());
    if (found) {
      renderVerificationResult(found, found.CertID, "PASSED");
    } else {
      renderVerificationResult(null, "Uploaded File", "NOT_FOUND");
    }
  } catch (err) {
    codeElem.textContent = "Error computing hash: " + escapeHtml(err.message);
  }
}

// METRICS & MASTER LEDGER
function renderMetrics() {
  const total = mockLedger.length;
  const verified = mockLedger.filter(c => c.Status === "Approved").length;
  const pending = mockLedger.filter(c => c.Status === "Pending").length;
  const revoked = mockLedger.filter(c => c.Status === "Revoked").length;

  document.getElementById("metric-total-certs").textContent = total.toLocaleString();
  document.getElementById("metric-verified-count").textContent = verified.toLocaleString();
  document.getElementById("metric-pending-count").textContent = pending.toString();
  document.getElementById("metric-revoked-count").textContent = revoked.toString();
  document.getElementById("pending-count-badge").textContent = pending.toString();
  document.getElementById("ledger-total-badge").textContent = `${total} Certificates`;
}

function renderMasterLedger() {
  const tbody = document.getElementById("ledger-table-body");
  if (!tbody) return;

  const searchQuery = (document.getElementById("ledger-search-input").value || "").toLowerCase().trim();
  const schoolFilter = document.getElementById("school-filter-select").value;
  const statusFilter = document.getElementById("status-filter-select").value;

  const filtered = mockLedger.filter(item => {
    const matchesSearch = (item.CertID || "").toLowerCase().includes(searchQuery) ||
                          (item.StudentName || "").toLowerCase().includes(searchQuery) ||
                          (item.RollNumber || "").toLowerCase().includes(searchQuery) ||
                          (item.EventName || "").toLowerCase().includes(searchQuery);
    const matchesSchool = (schoolFilter === "ALL") || (item.School === schoolFilter);
    const matchesStatus = (statusFilter === "ALL") || (item.Status === statusFilter);
    return matchesSearch && matchesSchool && matchesStatus;
  });

  tbody.innerHTML = "";

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-muted);">No matching certificate records found in ledger.</td></tr>`;
    return;
  }

  const canRevoke = true;

  filtered.forEach(rec => {
    const tr = document.createElement("tr");
    
    let statusClass = "badge-approved";
    if (rec.Status === "Pending") statusClass = "badge-pending";
    if (rec.Status === "Revoked") statusClass = "badge-revoked";

    const safeCertId = escapeHtml(rec.CertID);
    const safeStudentName = escapeHtml(rec.StudentName);
    const safeRollNumber = escapeHtml(rec.RollNumber);
    const safeSchool = escapeHtml(rec.School);
    const safeCourse = escapeHtml(rec.Course);
    const safeEventName = escapeHtml(rec.EventName);
    const safeIssueDate = escapeHtml(rec.IssueDate);
    const safeStatus = escapeHtml(rec.Status);
    const safeHash = escapeHtml(rec.SHA256Hash || "");
    const shortHash = safeHash.length > 16 ? safeHash.substring(0, 16) + "..." : safeHash;

    tr.innerHTML = `
      <td><strong>${safeCertId}</strong></td>
      <td>
        <div style="font-weight:700;">${safeStudentName}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">Roll: ${safeRollNumber}</div>
      </td>
      <td>${safeSchool} <span style="font-size:0.75rem; color:var(--text-muted); display:block;">${safeCourse}</span></td>
      <td>${safeEventName}</td>
      <td>${safeIssueDate}</td>
      <td><span class="badge ${statusClass}">${safeStatus}</span></td>
      <td><code>${shortHash}</code></td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-secondary btn-sm verify-row-btn" data-cert-id="${safeCertId}" title="Verify in Public Portal">
            <i data-feather="shield"></i> Verify
          </button>
          ${(canRevoke && rec.Status !== 'Revoked') ? `
            <button class="btn btn-danger btn-sm revoke-row-btn" data-cert-id="${safeCertId}" title="Revoke Certificate">
              <i data-feather="slash"></i> Revoke
            </button>
          ` : ''}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".verify-row-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const certId = btn.getAttribute("data-cert-id");
      switchToTab("verifier-tab");
      document.getElementById("cert-id-input").value = certId;
      executeVerificationById(certId);
    });
  });

  tbody.querySelectorAll(".revoke-row-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const certId = btn.getAttribute("data-cert-id");
      openRevocationModal(certId);
    });
  });

  feather.replace();
}

function setupFilters() {
  document.getElementById("ledger-search-input").addEventListener("input", renderMasterLedger);
  document.getElementById("school-filter-select").addEventListener("change", renderMasterLedger);
  document.getElementById("status-filter-select").addEventListener("change", renderMasterLedger);
  document.getElementById("refresh-data-btn").addEventListener("click", async () => {
    if (GAS_API_URL) {
      await fetchRemoteLedger();
    }
    renderMasterLedger();
    renderMetrics();
    showToast("Master ledger refreshed");
  });
}

// BULK CSV/EXCEL PARSER & ISSUER
let currentUploadedBatchFile = null;

function setupCsvUploader() {
  const dropzone = document.getElementById("csv-dropzone");
  const fileInput = document.getElementById("csv-file-input");

  if (!dropzone) return;

  dropzone.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      currentUploadedBatchFile = e.target.files[0];
      readCsvFile(e.target.files[0]);
    }
  });

  document.getElementById("parse-pasted-csv-btn").addEventListener("click", () => {
    const text = document.getElementById("csv-paste-textarea").value;
    currentUploadedBatchFile = null;
    parseCsvString(text);
  });

  document.getElementById("process-batch-btn").addEventListener("click", processCsvBatchIssuance);
}

function readCsvFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    parseCsvString(e.target.result);
  };
  reader.readAsText(file);
}

async function parseCsvString(csvText) {
  const lines = (csvText || "").trim().split("\n");
  if (lines.length <= 1) {
    showToast("File is empty or missing headers", "danger");
    return;
  }

  const rawHeaders = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
  parsedCsvRecords = [];

  const existingIdsSet = new Set(mockLedger.map(c => (c.CertID || "").toUpperCase()));

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = lines[i].split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
    const obj = {};
    rawHeaders.forEach((h, idx) => {
      obj[h] = values[idx] || "";
    });

    const studentName = obj.StudentName || obj.Name || obj.student_name || obj.name || "Student Recipient";
    const rollNo = obj.RollNumber || obj.RollNo || obj.roll_number || obj.roll_no || obj.CertID || `012164032${i}`;
    const email = obj.Email || obj.email || `${studentName.toLowerCase().replace(/\s+/g, '.')}@ggsipu.edu`;
    const school = obj.School || obj.Department || obj.school || obj.department || "USICT";
    const course = obj.Course || obj.course || obj.Branch || obj.branch || "B.Tech CSE";
    const eventName = obj.EventName || obj.Event || obj.event_name || obj.event || "Smart India Hackathon 2026";
    const certType = obj.CertificateType || obj.cert_type || obj.certificate_type || obj.Status || "Participation";
    const issueDate = obj.IssueDate || obj.issue_date || new Date().toISOString().split("T")[0];

    const certId = obj.CertID && !existingIdsSet.has(obj.CertID.toUpperCase())
      ? obj.CertID.toUpperCase()
      : generateUniqueCertId(existingIdsSet);
    existingIdsSet.add(certId);

    const record = {
      CertID: certId,
      RollNumber: rollNo,
      StudentName: studentName,
      Email: email,
      School: school,
      Course: course,
      EventName: eventName,
      CertificateType: certType,
      IssueDate: issueDate,
      Status: "Pending",
    };

    record.SHA256Hash = await computeCertificateRecordHash(record);
    parsedCsvRecords.push(record);
  }

  document.getElementById("parsed-count-span").textContent = parsedCsvRecords.length;
  document.getElementById("csv-preview-card").style.display = "block";

  const tbody = document.getElementById("csv-preview-tbody");
  tbody.innerHTML = "";

  parsedCsvRecords.forEach((rec, idx) => {
    const tr = document.createElement("tr");
    const safeCertId = escapeHtml(rec.CertID);
    const safeRoll = escapeHtml(rec.RollNumber || rec.RollNo || "N/A");
    const safeName = escapeHtml(rec.StudentName || rec.Name || "N/A");
    const safeEmail = escapeHtml(rec.Email || "N/A");
    const safeSchool = escapeHtml(rec.School || rec.Course || "USICT");
    const safeEvent = escapeHtml(rec.EventName || "Workshop");
    const safeHash = escapeHtml(rec.SHA256Hash || "");
    const shortHash = safeHash.length > 16 ? safeHash.substring(0, 16) + "..." : safeHash;

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><strong>${safeCertId}</strong></td>
      <td>${safeRoll}</td>
      <td>${safeName}</td>
      <td>${safeEmail}</td>
      <td>${safeSchool}</td>
      <td>${safeEvent}</td>
      <td><span class="badge badge-pending">Pending</span></td>
      <td><code>${shortHash}</code></td>
    `;
    tbody.appendChild(tr);
  });

  showToast(`Parsed ${parsedCsvRecords.length} records successfully!`);
}

async function processCsvBatchIssuance() {
  if (parsedCsvRecords.length === 0) {
    showToast("No student records to process. Please upload or paste spreadsheet data first.", "danger");
    return;
  }

  const processBtn = document.getElementById("process-batch-btn");
  if (processBtn) {
    processBtn.disabled = true;
    processBtn.innerHTML = `<i data-feather="loader"></i> Saving to NeonDB...`;
    if (window.feather) feather.replace();
  }

  const hashesList = parsedCsvRecords.map(r => r.SHA256Hash);
  const batchMerkleRoot = await computeMerkleRoot(hashesList);

  const issuer = currentStaffSession ? (currentStaffSession.name || currentStaffSession.email) : "Authorized Staff";
  const userToken = currentStaffSession ? currentStaffSession.token : null;

  // 1. Submit batch to NeonDB Backend API
  let backendInsertedIds = [];
  try {
    const formData = new FormData();

    if (currentUploadedBatchFile) {
      formData.append("file", currentUploadedBatchFile);
    } else {
      // Build a CSV file from parsed records
      const csvHeader = "name,email,course,event_name,certificate_type,issue_date,roll_number,cert_id\n";
      const csvRows = parsedCsvRecords.map(r =>
        `"${r.StudentName}","${r.Email}","${r.Course || r.School}","${r.EventName}","${r.CertificateType || 'Participation'}","${r.IssueDate}","${r.RollNumber}","${r.CertID}"`
      ).join("\n");
      const blob = new Blob([csvHeader + csvRows], { type: "text/csv" });
      formData.append("file", blob, "batch_issuance.csv");
    }

    const headers = getAuthHeaders();

    const res = await fetch(`${BACKEND_API_BASE}/api/certificates/bulk-generate`, {
      method: "POST",
      headers,
      body: formData,
    });

    const resData = await res.json();

    if (res.ok && resData.success) {
      backendInsertedIds = resData.insertedCertIds || [];
      showToast(`NeonDB: ${resData.message || 'Saved records to NeonDB database!'}`, "success");

      // Auto-generate PDFs and upload to Google Drive for newly inserted certificates
      if (backendInsertedIds.length > 0) {
        showToast(`Generating ${backendInsertedIds.length} certificate PDF(s) & uploading to Google Drive...`, "info");
        try {
          const pdfRes = await fetch(`${BACKEND_API_BASE}/api/certificates/generate-pdf`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...headers,
            },
            body: JSON.stringify({ certIds: backendInsertedIds }),
          });
          const pdfData = await pdfRes.json();
          if (pdfData.success && pdfData.generated && pdfData.generated.length > 0) {
            showToast(`Google Drive: ${pdfData.message || 'Uploaded certificates to Google Drive!'}`, "success");
          }
        } catch (pdfErr) {
          console.warn("Auto-PDF generation error:", pdfErr);
        }
      }
    } else {
      console.warn("Backend bulk-generate response:", resData);
      showToast(resData.message || "Could not save to NeonDB backend", "danger");
    }
  } catch (err) {
    console.warn("Could not reach Express NeonDB backend for batch generation:", err);
  }

  // 2. Populate newly parsed records directly into mockLedger with Pending status
  parsedCsvRecords.forEach((rec, idx) => {
    const certId = (backendInsertedIds && backendInsertedIds[idx]) ? backendInsertedIds[idx] : rec.CertID;
    const newRecord = {
      CertID: certId,
      RollNumber: rec.RollNumber || "00000000000",
      StudentName: rec.StudentName || "Student Recipient",
      Email: rec.Email || "",
      School: rec.School || rec.Course || "USICT",
      Course: rec.Course || "B.Tech",
      EventName: rec.EventName || "University Event",
      IssueDate: rec.IssueDate || new Date().toISOString().split("T")[0],
      Status: "Pending",
      SHA256Hash: rec.SHA256Hash,
      MerkleRoot: batchMerkleRoot,
      DrivePdfUrl: `https://drive.google.com/file/d/mock_${certId}/view`,
      QrVerificationUrl: `https://ggsipu.ac.in/verify?certId=${encodeURIComponent(certId)}`,
      ApprovedBy: "",
      ApprovalDate: ""
    };
    mockLedger = mockLedger.filter(c => c.CertID !== certId);
    mockLedger.unshift(newRecord);
  });

  // 3. Refresh live ledger from NeonDB
  await fetchRemoteLedger();

  renderMasterLedger();
  renderMetrics();
  renderApprovalQueue();
  renderAuditLogs();

  showToast(`Successfully added ${parsedCsvRecords.length} certificate(s) to Approval Queue!`, "success");
  parsedCsvRecords = [];
  currentUploadedBatchFile = null;
  document.getElementById("csv-preview-card").style.display = "none";
  document.getElementById("csv-paste-textarea").value = "";

  if (processBtn) {
    processBtn.disabled = false;
    processBtn.innerHTML = `<i data-feather="send"></i> Process Batch Issuance`;
    if (window.feather) feather.replace();
  }

  // Switch to Approval Queue tab immediately
  switchToTab("approval-tab");
}

// APPROVAL QUEUE
function setupApprovalQueue() {
  const approveAllBtn = document.getElementById("approve-all-selected-btn");
  if (approveAllBtn) {
    approveAllBtn.addEventListener("click", approveSelectedBatch);
  }

  const sendEmailsBtn = document.getElementById("send-emails-btn");
  if (sendEmailsBtn) {
    sendEmailsBtn.addEventListener("click", () => sendBatchCertificateEmails());
  }
  
  const selectAllChk = document.getElementById("select-all-pending");
  if (selectAllChk) {
    selectAllChk.addEventListener("change", (e) => {
      document.querySelectorAll(".pending-chk").forEach(chk => {
        chk.checked = e.target.checked;
      });
    });
  }
}

async function sendBatchCertificateEmails(specificCertIds = null) {
  const headers = getAuthHeaders({ "Content-Type": "application/json" });

  const btn = document.getElementById("send-emails-btn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-feather="loader"></i> Sending Emails...`;
    if (window.feather) feather.replace();
  }

  showToast("Dispatching certificate notification emails via Gmail SMTP...", "info");

  try {
    const payload = specificCertIds ? { certIds: specificCertIds } : {};
    const res = await fetch(`${BACKEND_API_BASE}/api/certificates/send-emails`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      if (data.sentCount > 0) {
        showToast(`Email Dispatch: Sent ${data.sentCount} certificate email(s) successfully!`, "success");
      } else {
        showToast(data.message || "No eligible certificates to email.", "info");
      }
      await fetchRemoteLedger();
    } else {
      showToast(data.message || "Failed to send certificate emails", "danger");
    }
  } catch (err) {
    console.error("Email dispatch request error:", err);
    showToast("Network error while triggering email dispatch", "danger");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-feather="mail"></i> Email Approved Certificates`;
      if (window.feather) feather.replace();
    }
  }
}

function renderApprovalQueue() {
  const tbody = document.getElementById("approval-queue-tbody");
  if (!tbody) return;

  const pending = mockLedger.filter(c => c.Status === "Pending");
  tbody.innerHTML = "";

  if (pending.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-muted);">No pending certificate requests in queue. All certificates are processed.</td></tr>`;
    return;
  }

  pending.forEach(rec => {
    const tr = document.createElement("tr");
    const safeCertId = escapeHtml(rec.CertID);
    const safeName = escapeHtml(rec.StudentName);
    const safeRoll = escapeHtml(rec.RollNumber);
    const safeSchool = escapeHtml(rec.School);
    const safeCourse = escapeHtml(rec.Course);
    const safeEvent = escapeHtml(rec.EventName);
    const safeHash = escapeHtml(rec.SHA256Hash || "");
    const shortHash = safeHash.length > 16 ? safeHash.substring(0, 16) + "..." : safeHash;

    tr.innerHTML = `
      <td><input type="checkbox" class="pending-chk" value="${safeCertId}" checked></td>
      <td><strong>${safeCertId}</strong></td>
      <td>${safeName}</td>
      <td>${safeRoll}</td>
      <td>${safeSchool} (${safeCourse})</td>
      <td>${safeEvent}</td>
      <td><code>${shortHash}</code></td>
      <td>
        <button class="btn btn-success btn-sm approve-single-btn" data-cert-id="${safeCertId}">
          <i data-feather="check"></i> Sign & Approve
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".approve-single-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const certId = btn.getAttribute("data-cert-id");
      approveSingleCert(certId);
    });
  });

  feather.replace();
}

async function approveSingleCert(certId) {
  const target = mockLedger.find(c => c.CertID === certId);
  if (!target) {
    showToast(`Certificate ${certId} not found`, "danger");
    return;
  }

  if (target.Status === "Revoked") {
    showToast(`State Violation: Cannot approve certificate ${certId} because it is REVOKED.`, "danger");
    return;
  }

  if (target.Status === "Approved") {
    showToast(`Certificate ${certId} is already approved.`, "info");
    return;
  }

  const approverName = currentStaffSession ? (currentStaffSession.name || currentStaffSession.email) : "Dean DSW";
  target.Status = "Approved";
  target.ApprovedBy = approverName + " (Authorized Approver)";
  target.ApprovalDate = new Date().toISOString().split("T")[0];

  // 1. Sync approval to NeonDB backend
  try {
    const headers = getAuthHeaders({ "Content-Type": "application/json" });

    await fetch(`${BACKEND_API_BASE}/api/certificates/approve`, {
      method: "POST",
      headers,
      body: JSON.stringify({ certId: certId }),
    });

    // Auto-send certificate email to student
    sendBatchCertificateEmails([certId]).catch(e => console.warn("Auto email error:", e));
  } catch (dbErr) {
    console.warn("NeonDB approval sync warning:", dbErr);
  }

  // 2. Sync to GAS if configured
  if (GAS_API_URL) {
    try {
      await fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "approveCertificate",
          apiKey: ADMIN_API_KEY,
          certId: certId,
          approverName: approverName,
          approverRole: "Dean DSW"
        })
      });
    } catch (err) {
      console.warn("Remote approval sync failed:", err);
    }
  }

  mockAuditLogs.unshift({
    Timestamp: new Date().toLocaleString(),
    EventType: "APPROVAL",
    Details: `Certificate ${certId} transitioned from [Pending] -> [Approved] by ${approverName}`,
    PerformedBy: approverName
  });

  renderMasterLedger();
  renderMetrics();
  renderApprovalQueue();
  renderAuditLogs();
  showToast(`Certificate ${certId} signed, approved & email dispatched!`, "success");
}

async function approveSelectedBatch() {
  const checkboxes = document.querySelectorAll(".pending-chk:checked");
  if (checkboxes.length === 0) {
    showToast("No certificates selected for approval", "danger");
    return;
  }

  let approvedCount = 0;
  const approvedIds = [];
  const today = new Date().toISOString().split("T")[0];
  const approverName = currentStaffSession ? (currentStaffSession.name || currentStaffSession.email) : "Dean DSW";

  for (let chk of checkboxes) {
    const certId = chk.value;
    const target = mockLedger.find(c => c.CertID === certId);
    if (target && target.Status === "Pending") {
      target.Status = "Approved";
      target.ApprovedBy = approverName + " (Dean DSW)";
      target.ApprovalDate = today;
      approvedCount++;
      approvedIds.push(certId);

      if (GAS_API_URL) {
        try {
          fetch(GAS_API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({
              action: "approveCertificate",
              apiKey: ADMIN_API_KEY,
              certId: certId,
              approverName: approverName,
              approverRole: "Dean DSW"
            })
          }).catch(e => console.warn(e));
        } catch (err) {}
      }
    }
  }

  // Sync batch approval to NeonDB backend & dispatch emails
  if (approvedIds.length > 0) {
    try {
      const headers = getAuthHeaders({ "Content-Type": "application/json" });

      await fetch(`${BACKEND_API_BASE}/api/certificates/approve`, {
        method: "POST",
        headers,
        body: JSON.stringify({ certIds: approvedIds }),
      });

      // Auto-send emails to approved batch
      sendBatchCertificateEmails(approvedIds).catch(e => console.warn("Batch auto email error:", e));
    } catch (dbErr) {
      console.warn("NeonDB batch approval sync error:", dbErr);
    }
  };

  mockAuditLogs.unshift({
    Timestamp: new Date().toLocaleString(),
    EventType: "APPROVAL",
    Details: `Batch approved ${approvedCount} certificates by ${approverName}`,
    PerformedBy: approverName
  });

  renderMasterLedger();
  renderMetrics();
  renderApprovalQueue();
  renderAuditLogs();
  showToast(`Approved ${approvedCount} certificates and dispatched emails!`, "success");
}

// DIGITAL SIGNATURE PAD
function setupSignaturePad() {
  const canvas = document.getElementById("signature-pad");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let drawing = false;

  ctx.strokeStyle = "#1e3a8a";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";

  canvas.addEventListener("mousedown", (e) => {
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
  });

  canvas.addEventListener("mousemove", (e) => {
    if (drawing) {
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
    }
  });

  canvas.addEventListener("mouseup", () => drawing = false);
  canvas.addEventListener("mouseleave", () => drawing = false);

  const clearBtn = document.getElementById("clear-sig-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
  }
}

// CERTIFICATE CANVAS DESIGNER
function setupCertificateCanvas() {
  const inputs = ["cert-tpl-name", "cert-tpl-roll", "cert-tpl-event", "cert-tpl-school", "cert-tpl-signatory"];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", renderCertificateCanvas);
  });

  const dlBtn = document.getElementById("download-canvas-cert-btn");
  if (dlBtn) {
    dlBtn.addEventListener("click", () => {
      const canvas = document.getElementById("cert-canvas");
      const link = document.createElement("a");
      link.download = "GGSIPU_Certificate_Preview.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  }
}

function renderCertificateCanvas() {
  const canvas = document.getElementById("cert-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const name = document.getElementById("cert-tpl-name").value || "Student Name";
  const roll = document.getElementById("cert-tpl-roll").value || "00000000000";
  const event = document.getElementById("cert-tpl-event").value || "University Event";
  const school = document.getElementById("cert-tpl-school").value || "University School";
  const signatory = document.getElementById("cert-tpl-signatory").value || "Dean DSW";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#1e3a8a";
  ctx.lineWidth = 12;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 3;
  ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

  ctx.fillStyle = "#1e3a8a";
  ctx.font = "bold 24px 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("GURU GOBIND SINGH INDRAPRASTHA UNIVERSITY", canvas.width / 2, 85);

  ctx.fillStyle = "#d97706";
  ctx.font = "600 14px 'Space Grotesk', sans-serif";
  ctx.fillText("DIRECTORATE OF STUDENTS' WELFARE (DSW)", canvas.width / 2, 110);

  ctx.fillStyle = "#64748b";
  ctx.font = "italic 13px sans-serif";
  ctx.fillText("Sector 16-C, Dwarka, New Delhi - 110078", canvas.width / 2, 130);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 32px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("CERTIFICATE OF ACHIEVEMENT", canvas.width / 2, 185);

  ctx.fillStyle = "#64748b";
  ctx.font = "15px sans-serif";
  ctx.fillText("This is proudly presented to", canvas.width / 2, 225);

  ctx.fillStyle = "#800000";
  ctx.font = "bold 36px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(name.toUpperCase(), canvas.width / 2, 275);

  ctx.fillStyle = "#0f172a";
  ctx.font = "14px sans-serif";
  ctx.fillText(`Roll No: ${roll}  |  ${school}`, canvas.width / 2, 305);

  ctx.fillStyle = "#475569";
  ctx.font = "15px sans-serif";
  ctx.fillText("for outstanding performance and active participation in", canvas.width / 2, 350);

  ctx.fillStyle = "#1e3a8a";
  ctx.font = "bold 20px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(`"${event}"`, canvas.width / 2, 390);

  ctx.textAlign = "left";
  ctx.fillStyle = "#64748b";
  ctx.font = "12px 'Space Grotesk', sans-serif";
  ctx.fillText("Cert ID: GGSIPU-2026-DSW-1001", 60, 520);
  ctx.fillText("SHA-256 Hash: 6c2e35327ecad8b417ef2f205c0888df...", 60, 540);

  ctx.textAlign = "right";
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText(signatory, canvas.width - 60, 520);
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("Competent Authority Sign-off", canvas.width - 60, 540);

  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(canvas.width / 2 - 35, 470, 70, 70);
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1;
  ctx.strokeRect(canvas.width / 2 - 35, 470, 70, 70);
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  ctx.fillText("[QR CODE]", canvas.width / 2, 510);
}

// AUDIT LOG RENDER
function renderAuditLogs() {
  const tbody = document.getElementById("audit-log-tbody");
  if (!tbody) return;

  const searchQuery = (document.getElementById("audit-search-input") ? document.getElementById("audit-search-input").value : "").toLowerCase().trim();
  tbody.innerHTML = "";

  const filteredLogs = mockAuditLogs.filter(l => {
    return (l.EventType || "").toLowerCase().includes(searchQuery) ||
           (l.Details || "").toLowerCase().includes(searchQuery) ||
           (l.PerformedBy || "").toLowerCase().includes(searchQuery);
  });

  if (filteredLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:24px; color:var(--text-muted);">No audit log records found.</td></tr>`;
    return;
  }

  filteredLogs.forEach(log => {
    const tr = document.createElement("tr");
    const safeTime = escapeHtml(log.Timestamp);
    const safeType = escapeHtml(log.EventType);
    const safeDetails = escapeHtml(log.Details);
    const safeUser = escapeHtml(log.PerformedBy);

    tr.innerHTML = `
      <td>${safeTime}</td>
      <td><span class="badge badge-valid">${safeType}</span></td>
      <td>${safeDetails}</td>
      <td>${safeUser}</td>
    `;
    tbody.appendChild(tr);
  });
}

// REVOCATION MODAL
function setupRevocationModal() {
  document.getElementById("confirm-revoke-btn").addEventListener("click", executeRevocation);
  document.getElementById("close-revocation-modal-btn").addEventListener("click", closeRevocationModal);
  document.getElementById("cancel-revoke-btn").addEventListener("click", closeRevocationModal);
  
  const searchInput = document.getElementById("audit-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", renderAuditLogs);
  }
}

function openRevocationModal(certId) {
  const target = mockLedger.find(c => c.CertID === certId);
  if (target && target.Status === "Revoked") {
    showToast(`Certificate ${certId} is already REVOKED.`, "danger");
    return;
  }

  currentRevocationCertId = certId;
  document.getElementById("modal-target-cert-id").textContent = certId;
  document.getElementById("revocation-reason-input").value = "";
  document.getElementById("revocation-modal").style.display = "flex";
}

function closeRevocationModal() {
  document.getElementById("revocation-modal").style.display = "none";
}

async function executeRevocation() {
  const reason = document.getElementById("revocation-reason-input").value.trim();
  if (!reason) {
    showToast("Please enter a mandatory revocation reason", "danger");
    return;
  }

  const target = mockLedger.find(c => c.CertID === currentRevocationCertId);
  if (!target) {
    showToast(`Certificate ${currentRevocationCertId} not found`, "danger");
    return;
  }

  if (target.Status === "Revoked") {
    showToast(`Certificate ${currentRevocationCertId} is already REVOKED.`, "danger");
    closeRevocationModal();
    return;
  }

  const prevStatus = target.Status;
  target.Status = "Revoked";
  const revoker = currentStaffSession ? (currentStaffSession.name || currentStaffSession.email) : "Dean DSW";

  if (GAS_API_URL) {
    try {
      await fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "revokeCertificate",
          apiKey: ADMIN_API_KEY,
          certId: currentRevocationCertId,
          reason: reason,
          revokedBy: revoker
        })
      });
    } catch (err) {
      console.warn("Remote revocation sync failed:", err);
    }
  }

  mockAuditLogs.unshift({
    Timestamp: new Date().toLocaleString(),
    EventType: "REVOCATION",
    Details: `Certificate ${currentRevocationCertId} transitioned from [${prevStatus}] -> [Revoked]. Reason: ${reason}`,
    PerformedBy: revoker
  });

  renderMasterLedger();
  renderMetrics();
  renderApprovalQueue();
  renderAuditLogs();
  closeRevocationModal();
  showToast(`Certificate ${currentRevocationCertId} has been REVOKED.`, "danger");
}

// STAFF USERS MANAGEMENT (NeonDB Backend)
function setupStaffUserManagement() {
  const openBtn = document.getElementById("open-add-user-modal-btn");
  const modal = document.getElementById("user-modal");
  const closeBtn = document.getElementById("close-user-modal-btn");
  const cancelBtn = document.getElementById("cancel-user-modal-btn");
  const saveBtn = document.getElementById("save-user-btn");

  setupPasswordToggle("toggle-user-password", "user-password-input", "password");

  if (!openBtn) return;

  openBtn.addEventListener("click", () => {
    document.getElementById("user-modal-title").innerHTML = `<i data-feather="user-plus"></i> Add New Staff Member`;
    document.getElementById("user-edit-id").value = "";
    document.getElementById("user-name-input").value = "";
    document.getElementById("user-email-input").value = "";
    document.getElementById("user-password-input").value = "";
    document.getElementById("user-role-select").value = "ADMIN";
    document.getElementById("user-active-checkbox").checked = true;
    resetPasswordVisibility("toggle-user-password", "user-password-input", "password");
    modal.style.display = "flex";
    if (window.feather) feather.replace();
  });

  const closeModal = () => { modal.style.display = "none"; };
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const name = document.getElementById("user-name-input").value.trim();
      const email = document.getElementById("user-email-input").value.trim().toLowerCase();
      const password = document.getElementById("user-password-input").value;
      const role = document.getElementById("user-role-select").value;
      const isActive = document.getElementById("user-active-checkbox").checked;
      const editId = document.getElementById("user-edit-id").value;

      if (!email) {
        showToast("Please enter an email address", "danger");
        return;
      }

      if (!name) {
        showToast("Please enter the staff member's name", "danger");
        return;
      }

      if (!editId && !password) {
        showToast("Please enter a password for the new staff account", "danger");
        return;
      }

      saveBtn.disabled = true;
      saveBtn.innerHTML = `<i data-feather="loader"></i> Saving to NeonDB...`;
      if (window.feather) feather.replace();

      try {
        const res = await fetch(`${BACKEND_API_BASE}/api/auth/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password: password || undefined,
            role,
            is_active: isActive
          })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          showToast(data.message || `Saved staff user ${email} to NeonDB`, "success");
          mockAuditLogs.unshift({
            Timestamp: new Date().toLocaleString(),
            EventType: editId ? "USER_ROLE_CHANGED" : "USER_ADDED",
            Details: `${editId ? 'Updated' : 'Added'} staff user ${name} (${email}, Role: ${role}) in NeonDB`,
            PerformedBy: currentStaffSession ? currentStaffSession.email : "Admin"
          });
          await fetchStaffUsersFromDb();
          renderAuditLogs();
          closeModal();
        } else {
          showToast(data.message || "Failed to save user in NeonDB", "danger");
        }
      } catch (err) {
        console.error("Backend error saving user to NeonDB:", err);
        showToast("Database connection error. Ensure Express NeonDB backend is running.", "danger");
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i data-feather="save"></i> Save to NeonDB`;
        if (window.feather) feather.replace();
      }
    });
  }
}

function renderStaffUsers() {
  const tbody = document.getElementById("users-table-body");
  const badge = document.getElementById("users-count-badge");
  if (!tbody) return;

  badge.textContent = `${neonUsers.length} Staff Members`;
  tbody.innerHTML = "";

  if (neonUsers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-muted);">No staff members found in NeonDB.</td></tr>`;
    return;
  }

  neonUsers.forEach(u => {
    const tr = document.createElement("tr");
    const safeName = escapeHtml(u.Name || u.name || (u.Email || u.email || "").split('@')[0]);
    const safeEmail = escapeHtml(u.Email || u.email || "");
    const safeRole = escapeHtml((u.Role || u.role || 'VIEWER').toUpperCase());
    const safeAdded = escapeHtml(u.AddedOn || (u.created_at ? new Date(u.created_at).toISOString().split('T')[0] : '2026-08-01'));
    const isActive = (u.is_active !== false);
    const statusPill = isActive
      ? `<span class="badge badge-valid" style="font-size:0.75rem;">Active</span>`
      : `<span class="badge badge-revoked" style="font-size:0.75rem;">Deactivated</span>`;

    tr.innerHTML = `
      <td><strong>${safeName}</strong></td>
      <td><code>${safeEmail}</code></td>
      <td><span class="role-pill ${safeRole.toLowerCase()}">${safeRole}</span></td>
      <td>${statusPill}</td>
      <td>${safeAdded}</td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-secondary btn-sm edit-user-btn" data-id="${u.id || ''}" data-name="${safeName}" data-email="${safeEmail}" data-role="${safeRole}" data-active="${isActive}" title="Edit User">
            <i data-feather="edit-2"></i> Edit
          </button>
          <button class="btn btn-danger btn-sm remove-user-btn" data-id="${u.id || ''}" data-email="${safeEmail}" title="Remove Staff Member">
            <i data-feather="trash-2"></i> Remove
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".edit-user-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const name = btn.getAttribute("data-name");
      const email = btn.getAttribute("data-email");
      const role = btn.getAttribute("data-role");
      const active = btn.getAttribute("data-active") === "true";

      document.getElementById("user-modal-title").innerHTML = `<i data-feather="edit-2"></i> Edit Staff Member`;
      document.getElementById("user-edit-id").value = id;
      document.getElementById("user-name-input").value = name;
      document.getElementById("user-email-input").value = email;
      document.getElementById("user-password-input").value = "";
      document.getElementById("user-role-select").value = role;
      document.getElementById("user-active-checkbox").checked = active;
      resetPasswordVisibility("toggle-user-password", "user-password-input", "password");
      document.getElementById("user-modal").style.display = "flex";
      if (window.feather) feather.replace();
    });
  });

  tbody.querySelectorAll(".remove-user-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const email = btn.getAttribute("data-email");
      if (confirm(`Are you sure you want to remove staff access for ${email}?`)) {
        try {
          const deleteUrl = id ? `${BACKEND_API_BASE}/api/auth/users/${id}` : `${BACKEND_API_BASE}/api/auth/users/${encodeURIComponent(email)}`;
          const res = await fetch(deleteUrl, { method: "DELETE" });
          const data = await res.json();

          if (res.ok && data.success) {
            showToast(data.message || `Removed user ${email} from NeonDB`, "info");
            mockAuditLogs.unshift({
              Timestamp: new Date().toLocaleString(),
              EventType: "USER_REMOVED",
              Details: `Removed staff user ${email} from NeonDB`,
              PerformedBy: currentStaffSession ? currentStaffSession.email : "Admin"
            });
            await fetchStaffUsersFromDb();
            renderAuditLogs();
          } else {
            showToast(data.message || "Failed to remove user", "danger");
          }
        } catch (err) {
          console.error("Backend error deleting user from NeonDB:", err);
          showToast("Failed to delete user from NeonDB", "danger");
        }
      }
    });
  });

  if (window.feather) feather.replace();
}

// API CONFIGURATION MODAL
function setupApiConfigModal() {
  const modal = document.getElementById("api-config-modal");
  const openBtn = document.getElementById("api-config-btn");
  const closeBtn = document.getElementById("close-api-config-modal-btn");
  const cancelBtn = document.getElementById("cancel-api-config-btn");
  const saveBtn = document.getElementById("save-api-config-btn");

  setupPasswordToggle("toggle-api-key", "api-key-input", "API key");

  if (!openBtn) return;

  openBtn.addEventListener("click", () => {
    document.getElementById("gas-url-input").value = GAS_API_URL;
    document.getElementById("api-key-input").value = ADMIN_API_KEY;
    resetPasswordVisibility("toggle-api-key", "api-key-input", "API key");
    modal.style.display = "flex";
  });

  const closeModal = () => { modal.style.display = "none"; };
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      GAS_API_URL = document.getElementById("gas-url-input").value.trim();
      ADMIN_API_KEY = document.getElementById("api-key-input").value.trim();

      localStorage.setItem("GGSIPU_GAS_API_URL", GAS_API_URL);
      localStorage.setItem("GGSIPU_ADMIN_API_KEY", ADMIN_API_KEY);

      updateConnectionStatusUI();
      closeModal();

      if (GAS_API_URL) {
        showToast("Attempting connection to Google Apps Script Web App...");
        await fetchRemoteLedger();
      } else {
        showToast("Running in Local Engine Mode", "info");
      }
    });
  }
}

function updateConnectionStatusUI() {
  const statusText = document.getElementById("status-mode-text");
  const statusDot = document.getElementById("status-dot");
  if (!statusText || !statusDot) return;

  if (GAS_API_URL) {
    statusText.textContent = "Google Cloud Active";
    statusDot.className = "status-dot online";
  } else {
    statusText.textContent = "Local Engine Active";
    statusDot.className = "status-dot online";
  }
}

async function fetchRemoteLedger() {
  const headers = getAuthHeaders();

  // 1. Fetch live certificates from NeonDB Backend
  try {
    const res = await fetch(`${BACKEND_API_BASE}/api/certificates`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.certificates) && data.certificates.length > 0) {
        mockLedger = data.certificates.map(c => ({
          CertID: c.cert_id,
          RollNumber: c.roll_number || "N/A",
          StudentName: c.name,
          Email: c.email,
          School: c.course || "USICT",
          Course: c.course || "GGSIPU",
          EventName: c.event_name,
          CertificateType: c.cert_type || "Participation",
          IssueDate: c.issue_date ? String(c.issue_date).substring(0, 10) : new Date().toISOString().split("T")[0],
          Status: (c.status || "Pending").charAt(0).toUpperCase() + (c.status || "Pending").slice(1).toLowerCase(),
          SHA256Hash: c.hash,
          MerkleRoot: "8f2d4e910a11b12c13d14e15f16a17b18c19d20e21f22a23b24c25d26e27f28a",
          DrivePdfUrl: c.pdf_url || `https://drive.google.com/file/d/mock_${c.cert_id}/view`,
          QrVerificationUrl: `https://ggsipu.ac.in/verify?certId=${encodeURIComponent(c.cert_id)}`,
          ApprovedBy: String(c.status).toLowerCase() === 'approved' ? "Dean DSW (Authorized)" : "",
          ApprovalDate: c.issue_date ? String(c.issue_date).substring(0, 10) : ""
        }));
        renderMasterLedger();
        renderMetrics();
        renderApprovalQueue();
        showToast(`Loaded ${data.certificates.length} certificates from NeonDB!`, "success");
        return;
      }
    }
  } catch (err) {
    console.warn("NeonDB ledger fetch warning, falling back to GAS:", err);
  }

  // 2. Fallback to Google Apps Script
  if (!GAS_API_URL) return;
  try {
    const res = await fetch(`${GAS_API_URL}?action=getAll&apiKey=${encodeURIComponent(ADMIN_API_KEY)}`);
    const data = await res.json();
    if (data.status === "success" && Array.isArray(data.certificates)) {
      mockLedger = data.certificates;
      renderMasterLedger();
      renderMetrics();
      renderApprovalQueue();
      showToast(`Loaded ${data.certificates.length} certificates from Google Sheets!`, "success");
    } else if (data.status === "unauthorized") {
      showToast("Access Denied: Please configure valid Admin API Key in Config", "danger");
    }
  } catch (err) {
    showToast("Failed to fetch remote ledger from Google Apps Script", "danger");
  }
}

// TOAST NOTIFIER SYSTEM
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const iconName = type === 'success' ? 'check-circle' : type === 'danger' ? 'alert-circle' : 'info';
  const safeMsg = escapeHtml(message);

  toast.innerHTML = `
    <i data-feather="${iconName}"></i>
    <span>${safeMsg}</span>
  `;
  container.appendChild(toast);
  feather.replace();

  setTimeout(() => {
    toast.remove();
  }, 4000);
}
