/* ===========================================
   FacultyJobs – app.js (Firebase COMPAT SDK)
   - Candidate posts allowed (pending)
   - Employer/Admin posts live immediately
   - Backward-compat: infer approval if missing
   - Non-blocking center toasts (no OK)
   - Realtime lists: Closing Soon / All / Archive
   - Multi-select Dept/Level + image upload
   =========================================== */

"use strict";

/* -------- Firebase Init (compat) -------- */
(function initFirebase() {
  if (window.firebase && window.firebase.apps && window.firebase.apps.length) return;
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCBQfwpbnDdPPl0LdeXPWAc_o-Nd67EnsY",
  authDomain: "jobs-ff5a9.firebaseapp.com",
  projectId: "jobs-ff5a9",
  storageBucket: "jobs-ff5a9.firebasestorage.app",
  messagingSenderId: "110232650978",
  appId: "1:110232650978:web:64c20408089e75487f8abb",
  measurementId: "G-WW68CSEMM6"
};
  try { window.firebase.initializeApp(firebaseConfig); }
  catch(e){ console.warn("[Firebase] init error:", e); }
})();
const auth = window.firebase?.auth ? window.firebase.auth() : null;
const db   = window.firebase?.firestore ? window.firebase.firestore() : null;

/* ---------------- Global State ---------------- */
let currentUser = null;
let isAuthenticated = false;

/* Config */
const NEAR_EXPIRY_DAYS = 7;

/* ---------------- Helpers ---------------- */
function $(id) { return document.getElementById(id); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function safeGetValue(id) { const el = $(id); return el ? el.value : ""; }
function ensureFirebase(service = "Firebase") {
  const ok = !!(window.firebase && auth && db);
  if (!ok) showToast(service + " isn’t ready. Check Firebase config & enable Email/Password.", "error", 3000);
  return ok;
}
function escapeHtml(str){
  return (str||'').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]);
}

/* --- Toasts (center, non-blocking) --- */
function ensureToastContainer() {
  let c = document.getElementById("toastContainer");
  if (!c) {
    c = document.createElement("div");
    c.id = "toastContainer";
    c.className = "toast-container";
    document.body.appendChild(c);
  }
  return c;
}
function showToast(message, type = "info", duration = 2000) {
  const container = ensureToastContainer();
  const el = document.createElement("div");
  el.className = "toast " + (type === "success" ? "toast--success" : type === "error" ? "toast--error" : "toast--info");
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add("toast--hide");
    setTimeout(() => el.remove(), 300);
  }, duration);
}
function showAlert(msg, type = "info") { showToast(msg, type, 2000); }
try { window.alert = (m) => showToast(String(m), "info", 2000); } catch {}
window.showToast = showToast;

/* --- Date helpers --- */
function parseDeadline(dstr){
  if (!dstr) return null;
  const d = new Date(dstr);
  if (isNaN(d.getTime())) return null;
  d.setHours(23,59,59,999);
  return d;
}
function now(){ return new Date(); }
function isExpired(job){
  const d = parseDeadline(job?.deadline);
  return !!(d && d.getTime() < now().getTime());
}
function daysLeft(job){
  const d = parseDeadline(job?.deadline);
  if (!d) return null;
  const ms = d.getTime() - now().getTime();
  return Math.ceil(ms / (1000*60*60*24));
}
function formatDateDisplay(iso){
  if (!iso) return "";
  const [y,m,d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/* --- Session --- */
function saveSession() {
  try {
    localStorage.setItem("fj:isAuthenticated", JSON.stringify(isAuthenticated));
    localStorage.setItem("fj:currentUser", JSON.stringify(currentUser));
  } catch {}
}
function loadSession() {
  try {
    isAuthenticated = JSON.parse(localStorage.getItem("fj:isAuthenticated")) || false;
    currentUser = JSON.parse(localStorage.getItem("fj:currentUser")) || null;
  } catch { isAuthenticated = false; currentUser = null; }
}
function clearSession() {
  try {
    localStorage.removeItem("fj:isAuthenticated");
    localStorage.removeItem("fj:currentUser");
  } catch {}
}

/* --- Navigation --- */
function showPage(name) {
  qsa(".page").forEach(p => p.classList.add("hidden"));
  const map = {
    home: "homePage", jobs: "jobsPage", about: "aboutPage",
    archive: "archivePage",
    signup: "signupPage", signin: "signinPage",
    dashboard: "dashboardPage", "post-job": "postJobPage",
    admin: "adminPage", profile: "profilePage"
  };
  const id = map[name] || "homePage";
  const el = $(id);
  if (el) el.classList.remove("hidden");
  if (name === "dashboard" && !isAuthenticated) {
    showToast("Please sign in to access your dashboard.", "info", 2500);
    showPage("signin");
  }
}
function updateNavigation() {
  const anon = $("anonymousNav");
  const authd = $("authenticatedNav");
  if (isAuthenticated && currentUser) {
    anon && anon.classList.add("hidden");
    authd && authd.classList.remove("hidden");
    const userName = $("userName");
    const userRole = $("userRole");
    const userPhoto = $("userPhoto");
    if (userName) userName.textContent = currentUser.name || "User";
    if (userRole) userRole.textContent = currentUser.role || "Candidate";
    if (userPhoto && currentUser.photo) userPhoto.src = currentUser.photo;
    const adminLink = qsa(".nav__admin")[0];
    if (adminLink) {
      (currentUser.role === "ADMIN") ? adminLink.classList.remove("hidden")
                                     : adminLink.classList.add("hidden");
    }
  } else {
    authd && authd.classList.add("hidden");
    anon && anon.classList.remove("hidden");
  }
}

/* --- User Dropdown --- */
function toggleUserDropdown() {
  const dd = $("userDropdown");
  if (dd) dd.classList.toggle("hidden");
}
document.addEventListener("click", (e) => {
  const dd = $("userDropdown"), trigger = $("userPhoto");
  if (dd && trigger && !dd.contains(e.target) && !trigger.contains(e.target)) dd.classList.add("hidden");
});

/* ================== AUTH ================== */
async function sendVerificationEmail(user) {
  try { await user.sendEmailVerification(); } catch (err) { console.warn("sendEmailVerification error:", err); }
}
async function handleUnverifiedSignIn(user) {
  await sendVerificationEmail(user);
  showToast("We sent a verification link. Please verify, then sign in again.", "info", 3000);
  try { await auth.signOut(); } catch {}
  isAuthenticated = false; currentUser = null; clearSession(); updateNavigation(); showPage("signin");
}
async function signUp(formData) {
  if (!ensureFirebase("Authentication")) return;
  try {
    const cred = await auth.createUserWithEmailAndPassword(formData.email, formData.password);
    const user = cred.user;

    // If they pick EMPLOYER, grant EMPLOYER immediately (as requested).
    const selected = (formData.role || "CANDIDATE").toUpperCase();
    const initialRole = selected === "EMPLOYER" ? "EMPLOYER" : "CANDIDATE";

    await db.collection("users").doc(user.uid).set({
      name: formData.name || "",
      role: initialRole,
      institution: formData.institution || "",
      photo: formData.photo || null,
      email: user.email || null,
      createdAt: new Date().toISOString()
    });

    await sendVerificationEmail(user);
    showToast("Verification email sent. Please verify, then sign in.", "success", 2500);
    try { await auth.signOut(); } catch {}
    isAuthenticated = false; currentUser = null; clearSession(); updateNavigation(); showPage("signin");
  } catch (err) {
    showToast("Sign up error: " + (err?.message || err), "error", 3000);
  }
}
async function signIn(email, password) {
  if (!ensureFirebase("Authentication")) return;
  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    const user = cred.user;
    if (!user.emailVerified) { await handleUnverifiedSignIn(user); return; }
    let userData = {};
    try {
      const doc = await db.collection("users").doc(user.uid).get();
      userData = doc.exists ? doc.data() : {};
    } catch {}
    currentUser = {
      id: user.uid,
      name: userData.name || "User",
      email: user.email,
      role: userData.role || "CANDIDATE",
      institution: userData.institution || "",
      photo: userData.photo || null
    };
    isAuthenticated = true;
    saveSession();
    updateNavigation();
    showToast("Welcome back!", "success", 2000); // center toast (no OK)
    showPage("dashboard");
  } catch (err) {
    showToast("Sign in error: " + (err?.message || err), "error", 3000);
  }
}
async function signOut() {
  if (!ensureFirebase("Authentication")) {
    isAuthenticated = false; currentUser = null; clearSession(); updateNavigation(); showPage("home"); return;
  }
  try { await auth.signOut(); } catch {}
  isAuthenticated = false; currentUser = null; clearSession(); updateNavigation(); showPage("home");
}
async function forgotPassword(email) {
  if (!ensureFirebase("Authentication")) return;
  try { await auth.sendPasswordResetEmail(email); showToast("Password reset email sent to " + email + ".", "success", 2500); }
  catch (err) { showToast("Reset error: " + (err?.message || err), "error", 3000); }
}

/* ---------- Photo Upload & Profile ---------- */
function wirePhotoUpload() {
  const upload = $("photoUpload");
  const previewImg = $("photoPreview");
  const ph = $("photoPlaceholder");
  if (upload) {
    upload.addEventListener("change", (e) => {
      const file = e.target.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (previewImg) { previewImg.src = reader.result; previewImg.classList.remove("hidden"); }
        ph && ph.classList.add("hidden");
      };
      reader.readAsDataURL(file);
    });
  }
  const profileUpload = $("profilePhotoUpload");
  const currentPhoto = $("currentPhoto");
  if (profileUpload) {
    profileUpload.addEventListener("change", (e) => {
      const file = e.target.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        if (currentPhoto) currentPhoto.src = reader.result;
        if (isAuthenticated && currentUser) {
          currentUser.photo = reader.result; saveSession(); updateNavigation();
          if (ensureFirebase("Firestore")) { try { await db.collection("users").doc(currentUser.id).update({ photo: reader.result }); } catch {} }
        }
      };
      reader.readAsDataURL(file);
    });
  }
}
function wireProfileForm() {
  const form = $("profileForm"); if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isAuthenticated || !currentUser) { showToast("Please sign in.", "info", 2000); return; }
    const name = safeGetValue("profileName");
    const institution = safeGetValue("profileInstitution");
    currentUser.name = name || currentUser.name;
    currentUser.institution = institution || currentUser.institution;
    saveSession(); updateNavigation();
    if (ensureFirebase("Firestore")) { try { await db.collection("users").doc(currentUser.id).update({ name: currentUser.name, institution: currentUser.institution }); } catch {} }
    showToast("Profile saved!", "success", 1800);
  });
}
function handlePostJob() {
  if (!isAuthenticated) {
    showToast("Please sign in to post a job.", "info", 2500);
    showPage("signin");
    return;
  }
  // Everyone signed in can open the page (Candidate posts become pending)
  showPage("post-job");
  const r = (currentUser?.role || "").toUpperCase();
  if (!["EMPLOYER", "EMPLOYER_PENDING", "ADMIN"].includes(r)) {
    showToast("Note: your job will go live after admin approval.", "info", 3000);
  }
}

/* ================== JOBS (Realtime + Moderation + Archive) ================== */

/* Multi-select helper + image utilities */
function getMultiSelectValues(id){
  const el = document.getElementById(id);
  if (!el) return [];
  return Array.from(el.options).filter(o => o.selected).map(o => o.value);
}
async function compressImageToDataURL(file, maxW = 1280, maxH = 1280, quality = 0.8){
  if (!file) return null;
  const bitmap = await createImageBitmap(file);
  const w = bitmap.width, h = bitmap.height;
  let targetW = w, targetH = h;
  if (w > maxW || h > maxH) {
    const ratio = Math.min(maxW / w, maxH / h);
    targetW = Math.round(w * ratio);
    targetH = Math.round(h * ratio);
  }
  const canvas = document.createElement("canvas");
  canvas.width = targetW; canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  return canvas.toDataURL("image/jpeg", quality);
}
function wirePostImage(){
  const input = $("postJobImage");
  const preview = $("postJobImagePreview");
  if (!input) return;
  input.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await compressImageToDataURL(file, 1280, 1280, 0.8);
    if (preview) { preview.src = dataUrl; preview.classList.remove("hidden"); }
    input.dataset.dataUrl = dataUrl || "";
  });
}

/* Card UI (handles arrays or single strings; shows image & pretty date) */
function jobCardHTML(j, opts = {}){
  const desc = (j.description || "");
  const short = desc.length > 180 ? desc.slice(0,180) + "…" : desc;

  const depts = Array.isArray(j.departments) ? j.departments
                : (j.department ? [j.department] : []);
  const levels = Array.isArray(j.levels) ? j.levels
                : (j.level ? [j.level] : []);

  const deptText  = depts.length ? depts.join(", ") : "—";
  const levelText = levels.length ? levels.join(", ") : "—";

  const expireDays = daysLeft(j);
  const expired = opts.expired || isExpired(j);
  const near = !expired && expireDays != null && expireDays >= 0 && expireDays <= NEAR_EXPIRY_DAYS;

  let badge = "";
  if (expired) {
    badge = `<span class="status" style="background:#fee2e2;color:#991b1b">Expired</span>`;
  } else if (near) {
    const text = expireDays === 0 ? "Deadline: Today" : `Deadline: ${expireDays} day${expireDays===1?"":"s"} left`;
    badge = `<span class="status">${escapeHtml(text)}</span>`;
  }

  const deadlineText = j.deadline ? formatDateDisplay(j.deadline) : null;
  const deadlineLine = deadlineText
    ? `<div class="text-sm" style="color:var(--text-muted);margin-top:6px;">Deadline: ${escapeHtml(deadlineText)}</div>`
    : "";

  const img = j.image ? `<img src="${j.image}" alt="Job image" class="job-image">` : "";

  const applyBtn = j.applicationLink
    ? `<a class="btn btn--primary btn--sm" href="${escapeHtml(j.applicationLink)}" target="_blank" rel="noopener">Apply</a>`
    : `<button class="btn btn--primary btn--sm" onclick="showToast('Apply flow coming soon!', 'info', 1500)">Apply</button>`;

  return `
    <div class="card">
      <div class="card__body">
        ${img}
        <h3>${escapeHtml(j.title)}</h3>
        <p>${escapeHtml(j.institution)} • ${escapeHtml(j.location)}</p>
        <div class="text-sm" style="color:var(--text-muted); margin-top:4px;">
          ${escapeHtml(deptText)} • ${escapeHtml(levelText)}
        </div>
        ${deadlineLine}
        <div style="margin-top:8px">${badge}</div>
        <p style="margin-top:8px">${escapeHtml(short)}</p>
        <div class="mt-8">
          ${applyBtn}
          <button class="btn btn--outline btn--sm mx-8" onclick="showToast('Saved!', 'success', 1200)">Save</button>
        </div>
      </div>
    </div>`;
}

/* Renderers */
function renderAllPositions(jobs){
  const el = $("allPositions");
  if (!el) return;
  el.innerHTML = jobs.length ? jobs.map(j => jobCardHTML(j)).join("") : `<p style="color:var(--text-muted)">No jobs posted yet.</p>`;
}
function renderNearExpiryPositions(jobs){
  const el = $("nearExpiryPositions");
  if (!el) return;
  const top6 = jobs.slice(0,6);
  el.innerHTML = top6.length ? top6.map(j => jobCardHTML(j, {near:true})).join("") : `<p style="color:var(--text-muted)">No closing-soon jobs.</p>`;
}
function renderArchivePositions(jobs){
  const el = $("archivePositions");
  if (!el) return;
  el.innerHTML = jobs.length ? jobs.map(j => jobCardHTML(j, {expired:true})).join("") : `<p style="color:var(--text-muted)">Nothing in archive yet.</p>`;
}

/* Post form (Candidate allowed; approved flag always set) */
function wirePostJobForm(){
  const form = $("postJobForm"); if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isAuthenticated) { showToast("Please sign in to post a job.", "info", 2500); showPage("signin"); return; }

    const role = (currentUser?.role || "CANDIDATE").toUpperCase();
    const isPrivileged = ["EMPLOYER", "EMPLOYER_PENDING", "ADMIN"].includes(role);

    const departments = getMultiSelectValues("postDepartments");
    const levels = getMultiSelectValues("postLevels");
    const deadlineISO = (document.getElementById("postDeadline")?.value || "").trim();

    const applyLink = (document.getElementById("postApplyLink")?.value || "").trim();
    const institutionType = (document.getElementById("postInstitutionType")?.value || "").trim();
    const imageDataUrl = (document.getElementById("postJobImage")?.dataset?.dataUrl) || null;

    const job = {
      title: safeGetValue("postTitle").trim(),
      departments: departments,                  // ARRAY
      levels: levels,                            // ARRAY
      description: safeGetValue("postDescription").trim(),
      institutionType,
      institution: safeGetValue("postInstitution").trim(),
      location: safeGetValue("postLocation").trim(),
      applicationLink: applyLink || null,
      salaryRange: safeGetValue("postSalary").trim(),
      deadline: deadlineISO,
      image: imageDataUrl || null,

      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      postedBy: currentUser.id,
      postedByName: currentUser.name || "",
      postedByInstitution: currentUser.institution || "",
      active: true,
      archived: false,
      approved: isPrivileged,                   // <-- ALWAYS set
      approvedBy: isPrivileged ? currentUser.id : null,
      approvedAt: null
    };

    // Validation
    if (!job.title) { showToast("Please enter a Position Title.", "error", 1800); return; }
    if (!departments.length) { showToast("Select at least one Department.", "error", 1800); return; }
    if (!levels.length) { showToast("Select at least one Position Level.", "error", 1800); return; }
    if (!job.description) { showToast("Please write the Description.", "error", 1800); return; }
    if (!job.institution) { showToast("Please enter Institution Name.", "error", 1800); return; }
    if (!job.location) { showToast("Please enter Location.", "error", 1800); return; }
    if (!deadlineISO) { showToast("Please select Application Deadline.", "error", 1800); return; }

    try {
      await db.collection("jobs").add(job);
      showToast(isPrivileged ? "Job posted and visible to everyone." : "Job submitted; visible after admin approval.", "success", 2500);
      form.reset();
      const preview = $("postJobImagePreview"); if (preview) { preview.src = ""; preview.classList.add("hidden"); }
      const inputImg = $("postJobImage"); if (inputImg) { delete inputImg.dataset.dataUrl; }
      showPage("jobs");
    } catch (err) {
      showToast("Error posting job: " + (err?.message || err), "error", 3000);
    }
  });
}

/* ----- Infer poster roles for jobs missing 'approved' (backward-compat) ----- */
const _roleCache = new Map(); // uid -> role
async function fetchPosterRolesFor(jobs){
  if (!db) return {};
  const pending = [];
  const need = new Set();
  jobs.forEach(j => { if (j.postedBy && !_roleCache.has(j.postedBy)) need.add(j.postedBy); });
  for (const uid of need) {
    pending.push(
      db.collection("users").doc(uid).get().then(doc => {
        const role = doc.exists ? (doc.data()?.role || "CANDIDATE") : "CANDIDATE";
        _roleCache.set(uid, role);
      }).catch(()=>{})
    );
  }
  await Promise.all(pending);
  const out = {};
  jobs.forEach(j => { if (j.postedBy) out[j.id] = _roleCache.get(j.postedBy) || "CANDIDATE"; });
  return out;
}

/* Realtime feed + Auto-archive */
let jobsUnsub = null;
async function maybeAutoArchiveExpired(all){
  if (!db || !isAuthenticated) return;
  const canTouch = (j) => (currentUser?.role === "ADMIN") || (currentUser?.id && j.postedBy === currentUser.id);
  const batch = db.batch();
  let changes = 0;

  all.forEach(doc => {
    const j = doc;
    if (!j) return;
    if (isExpired(j) && (j.archived !== true || j.active !== false)) {
      if (canTouch(j)) {
        const ref = db.collection("jobs").doc(j.id);
        batch.update(ref, {
          archived: true,
          active: false,
          expiredAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        changes++;
      }
    }
  });

  if (changes > 0) {
    try { await batch.commit(); } catch (e) { console.warn("Auto-archive failed:", e); }
  }
}

function subscribeToJobs(){
  if (!db) return;
  try { if (jobsUnsub) jobsUnsub(); } catch {}

  jobsUnsub = db.collection("jobs")
    .orderBy("createdAt", "desc")
    .onSnapshot(async (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Backward-compat: fetch poster roles so we can infer approval where it's missing
      const posterRoleMap = await fetchPosterRolesFor(all);

      // Auto-archive expired (ADMIN or poster)
      await maybeAutoArchiveExpired(all);

      // Helper: compute effective approval
      const isEffectivelyApproved = (j) => {
        if (j.approved === true) return true;
        if (j.approved === false) return false;
        // Missing 'approved' -> infer from poster role (EMPLOYER/ADMIN => approved)
        const r = posterRoleMap[j.postedBy] || "CANDIDATE";
        return r === "EMPLOYER" || r === "ADMIN";
      };

      // Public-approved active (for Home "Closing Soon")
      const publicApprovedActive = all.filter(j =>
        isEffectivelyApproved(j) && j.active !== false && j.archived !== true && !isExpired(j)
      );

      // Near-expiry list
      const near = publicApprovedActive
        .map(j => ({ j, left: daysLeft(j) }))
        .filter(x => x.left != null && x.left >= 0 && x.left <= NEAR_EXPIRY_DAYS)
        .sort((a,b) => a.left - b.left)
        .map(x => x.j);

      renderNearExpiryPositions(near);

      // Visible list for Jobs page:
      const isAdmin = isAuthenticated && currentUser?.role === "ADMIN";
      const visible = all.filter(j => {
        if (j.archived === true) return false;
        if (isExpired(j)) return false;
        if (isAdmin) return true;                                  // admin sees all
        if (isEffectivelyApproved(j) && j.active !== false) return true;   // public
        if (isAuthenticated && j.postedBy === currentUser?.id) return true; // poster sees pending
        return false;
      });
      renderAllPositions(visible);

      // Archive page: everything expired OR explicitly archived
      const archivedList = all.filter(j => j.archived === true || isExpired(j));
      renderArchivePositions(archivedList);

    }, (err) => { console.warn("Jobs listener error:", err); });
}

/* ----- Admin Pending (if you show it on Admin page) ----- */
let pendingUnsub = null;
function pendingJobCardHTML(j){
  const short = (j.description || "").slice(0,140) + ((j.description||"").length>140 ? "…" : "");
  return `
    <div class="card">
      <div class="card__body">
        <h3>${escapeHtml(j.title)}</h3>
        <p>${escapeHtml(j.institution)} • ${escapeHtml(j.location)}</p>
        <div style="color:var(--text-muted);margin:6px 0;">
          ${escapeHtml((Array.isArray(j.departments)?j.departments.join(", "):j.department||"—"))}
          • ${escapeHtml((Array.isArray(j.levels)?j.levels.join(", "):j.level||"—"))}
        </div>
        <div class="text-sm" style="color:var(--text-muted);margin-top:6px;">Deadline: ${escapeHtml(j.deadline || "—")}</div>
        <p>${escapeHtml(short)}</p>
        <div class="mt-8">
          <button class="btn btn--primary btn--sm" onclick="approveJob('${j.id}')">Approve</button>
          <button class="btn btn--outline btn--sm mx-8" onclick="rejectJob('${j.id}')">Reject</button>
        </div>
      </div>
    </div>`;
}
function renderPendingJobs(jobs){
  const host = $("pendingJobsList"); if (!host) return;
  host.innerHTML = jobs.length
    ? jobs.map(pendingJobCardHTML).join("")
    : `<p style="color:var(--text-muted)">No jobs waiting for approval.</p>`;
}
function subscribePendingJobs(){
  if (!db) return;
  try { if (pendingUnsub) pendingUnsub(); } catch {}
  pendingUnsub = db.collection("jobs")
    .orderBy("createdAt", "desc")
    .onSnapshot((snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const pending = all.filter(j => j.active !== false && j.approved !== true);
      renderPendingJobs(pending);
    }, (err) => console.warn("Pending listener error:", err));
}
async function approveJob(id){
  if (!(isAuthenticated && currentUser?.role === "ADMIN")) { showToast("Only admins can approve.", "error", 1800); return; }
  try {
    await db.collection("jobs").doc(id).update({
      approved: true,
      approvedBy: currentUser.id,
      approvedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) { showToast("Approve failed: " + (e?.message || e), "error", 2800); }
}
async function rejectJob(id){
  if (!(isAuthenticated && currentUser?.role === "ADMIN")) { showToast("Only admins can reject.", "error", 1800); return; }
  try {
    await db.collection("jobs").doc(id).update({ active: false, approved: false });
  } catch (e) { showToast("Reject failed: " + (e?.message || e), "error", 2800); }
}

/* ---------- Profile hydrate ---------- */
function hydrateProfileForm() {
  if (!currentUser) return;
  const profileName = $("profileName");
  const profileEmail = $("profileEmail");
  const profileInstitution = $("profileInstitution");
  const currentPhoto = $("currentPhoto");
  if (profileName) profileName.value = currentUser.name || "";
  if (profileEmail) profileEmail.value = currentUser.email || "";
  if (profileInstitution) profileInstitution.value = currentUser.institution || "";
  if (currentPhoto && currentUser.photo) currentPhoto.src = currentUser.photo;
}

/* Forms (auth) */
function wireAuthForms() {
  const signupForm = $("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = safeGetValue("signupName");
      const email = safeGetValue("signupEmail");
      const password = safeGetValue("signupPassword");
      const role = safeGetValue("signupRole") || "CANDIDATE";
      const institution = safeGetValue("signupInstitution") || "";
      let photo = null;
      const preview = $("photoPreview");
      if (preview && preview.src && !preview.classList.contains("hidden")) photo = preview.src;
      if (!email || !password) { showToast("Please enter email and password.", "error", 1800); return; }
      signUp({ name, email, password, role, institution, photo });
    });
  }
  const signinForm = $("signinForm");
  if (signinForm) {
    signinForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = safeGetValue("signinEmail");
      const password = safeGetValue("signinPassword");
      if (!email || !password) { showToast("Please enter email and password.", "error", 1800); return; }
      signIn(email, password);
    });
    // Forgot password button (JS-added)
    const card = document.querySelector("#signinPage .auth-card");
    if (card && !document.getElementById("forgotPasswordBtn")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = "forgotPasswordBtn";
      btn.className = "btn btn--secondary btn--full-width";
      btn.style.marginTop = "10px";
      btn.textContent = "Forgot password? Email me a reset link";
      btn.onclick = () => {
        const email = prompt("Enter your account email:");
        if (email) forgotPassword(email.trim());
      };
      card.appendChild(btn);
    }
  }
}

/* --------------- On Load --------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadSession();

  if (auth && typeof auth.onAuthStateChanged === "function") {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        if (!user.emailVerified) {
          isAuthenticated = false; currentUser = null; saveSession();
        } else {
          let userData = {};
          try { const doc = await db.collection("users").doc(user.uid).get(); userData = doc.exists ? doc.data() : {}; } catch {}
          currentUser = {
            id: user.uid,
            name: userData.name || currentUser?.name || "User",
            email: user.email || currentUser?.email || "",
            role: userData.role || currentUser?.role || "CANDIDATE",
            institution: userData.institution || currentUser?.institution || "",
            photo: userData.photo || currentUser?.photo || null
          };
          isAuthenticated = true; saveSession();
        }
      } else {
        loadSession();
      }

      if (isAuthenticated && currentUser?.role === "ADMIN") {
        subscribePendingJobs();
      } else if (pendingUnsub) {
        try { pendingUnsub(); } catch {} pendingUnsub = null;
        const host = $("pendingJobsList"); if (host) host.innerHTML = "";
      }

      updateNavigation();
      hydrateProfileForm();
    });
  } else {
    updateNavigation();
    hydrateProfileForm();
  }

  wireAuthForms();
  wirePhotoUpload();
  wireProfileForm();
  wirePostImage();
  wirePostJobForm();
  subscribeToJobs();
});

/* ---------- Expose for HTML onclick ---------- */
window.showPage = showPage;
window.toggleUserDropdown = toggleUserDropdown;
window.signOut = signOut;
window.handlePostJob = handlePostJob;
window.approveJob = approveJob;
window.rejectJob = rejectJob;
