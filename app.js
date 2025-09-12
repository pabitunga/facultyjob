/* ===========================================
   FacultyJobs – app.js (compat SDK)
   - Email verification + Forgot password
   - Realtime Jobs (with moderation)
   - Home shows "Closing Soon" (near deadline, top 6)
   - Archive page shows expired jobs (with "Expired")
   - Auto-archive (ADMIN or poster) when deadline passes
   =========================================== */

"use strict";

/* -------- Firebase Init (compat) -------- */
(function initFirebase() {
  if (window.firebase && window.firebase.apps && window.firebase.apps.length) return;
  const firebaseConfig = {
    apiKey: "AIzaSyCBQfwpbnDdPPl0LdeXPWAc_o-Nd67EnsY",
    authDomain: "jobs-ff5a9.firebaseapp.com",
    projectId: "jobs-ff5a9",
    storageBucket: "jobs-ff5a9.appspot.com",
    messagingSenderId: "110232650978",
    appId: "1:110232650978:web:ca2187d10b3df0007f8abb",
    measurementId: "G-1S3LY2D6DD"
  };
  try { window.firebase.initializeApp(firebaseConfig); }
  catch(e){ console.warn("[Firebase] init error:", e); }
})();
const auth = window.firebase?.auth ? window.firebase.auth() : null;
const db   = window.firebase?.firestore ? window.firebase.firestore() : null;

/* ---------------- Global State ---------------- */
let currentUser = null;
let isAuthenticated = false;

/* Config: near-expiry window (days) */
const NEAR_EXPIRY_DAYS = 7;

/* ---------------- Helpers ---------------- */
function $(id) { return document.getElementById(id); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function safeGetValue(id) { const el = $(id); return el ? el.value : ""; }
function showAlert(msg) { window.alert(msg); }
function ensureFirebase(service = "Firebase") {
  const ok = !!(window.firebase && auth && db);
  if (!ok) showAlert(service + " isn’t ready. Check Firebase config & enable Email/Password in Firebase Console.");
  return ok;
}

/* Date helpers */
function parseDeadline(dstr){
  if (!dstr) return null;
  const d = new Date(dstr);
  if (isNaN(d.getTime())) return null;
  // consider deadline inclusive until end of the day
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
function escapeHtml(str){
  return (str||'').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

/* ---------------- Session ---------------- */
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

/* ---------------- Navigation ---------------- */
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
    showAlert("Please sign in to access your dashboard.");
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

/* ---------------- User Dropdown ---------------- */
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
  showAlert("We sent a verification link to: " + (user.email || "your email") + ". Please verify, then sign in again.");
  try { await auth.signOut(); } catch {}
  isAuthenticated = false; currentUser = null; clearSession(); updateNavigation(); showPage("signin");
}
async function signUp(formData) {
  if (!ensureFirebase("Authentication")) return;
  try {
    const cred = await auth.createUserWithEmailAndPassword(formData.email, formData.password);
    const user = cred.user;
    await db.collection("users").doc(user.uid).set({
      name: formData.name || "",
      role: formData.role || "CANDIDATE",
      institution: formData.institution || "",
      photo: formData.photo || null,
      createdAt: new Date().toISOString()
    });
    await sendVerificationEmail(user);
    showAlert("Verification email sent to " + (user.email || "your email") + ". Please verify, then sign in.");
    try { await auth.signOut(); } catch {}
    isAuthenticated = false; currentUser = null; clearSession(); updateNavigation(); showPage("signin");
  } catch (err) {
    showAlert("Sign up error: " + (err?.message || err));
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
    showAlert("Welcome back!");
    showPage("dashboard");
  } catch (err) {
    showAlert("Sign in error: " + (err?.message || err));
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
  try { await auth.sendPasswordResetEmail(email); showAlert("Password reset email sent to " + email + "."); }
  catch (err) { showAlert("Reset error: " + (err?.message || err)); }
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
    if (!isAuthenticated || !currentUser) { showAlert("Please sign in."); return; }
    const name = safeGetValue("profileName");
    const institution = safeGetValue("profileInstitution");
    currentUser.name = name || currentUser.name;
    currentUser.institution = institution || currentUser.institution;
    saveSession(); updateNavigation();
    if (ensureFirebase("Firestore")) { try { await db.collection("users").doc(currentUser.id).update({ name: currentUser.name, institution: currentUser.institution }); } catch {} }
    showAlert("Profile saved!");
  });
}
function handlePostJob() {
  if (!isAuthenticated) { showAlert("Please sign in as an Employer to post a job."); showPage("signin"); return; }
  if (currentUser.role === "EMPLOYER" || currentUser.role === "ADMIN") showPage("post-job");
  else showAlert("Posting jobs is for Employers/Admins. You are currently a Candidate.");
}

/* ================== JOBS (Realtime + Moderation + Archive) ================== */

/* Card UI */
function jobCardHTML(j, opts = {}){
  const desc = (j.description || "");
  const short = desc.length > 180 ? desc.slice(0,180) + "…" : desc;
  const expireDays = daysLeft(j);
  const expired = opts.expired || isExpired(j);
  const near = !expired && expireDays != null && expireDays >= 0 && expireDays <= NEAR_EXPIRY_DAYS;

  // badges
  let badge = "";
  if (expired) {
    badge = `<span class="status" style="background:#fee2e2;color:#991b1b">Expired</span>`;
  } else if (near) {
    const text = expireDays === 0 ? "Deadline: Today" : `Deadline: ${expireDays} day${expireDays===1?"":"s"} left`;
    badge = `<span class="status">${escapeHtml(text)}</span>`;
  }

  const deadlineLine = j.deadline ? `<div class="text-sm" style="color:var(--text-muted);margin-top:6px;">Deadline: ${escapeHtml(j.deadline)}</div>` : "";

  return `
    <div class="card">
      <div class="card__body">
        <h3>${escapeHtml(j.title)}</h3>
        <p>${escapeHtml(j.institution)} • ${escapeHtml(j.location)}</p>
        <div class="text-sm" style="color:var(--text-muted); margin-top:4px;">
          ${escapeHtml(j.department)} • ${escapeHtml(j.level)}
        </div>
        ${deadlineLine}
        <div style="margin-top:8px">${badge}</div>
        <p style="margin-top:8px">${escapeHtml(short)}</p>
        <div class="mt-8">
          <button class="btn btn--primary btn--sm" onclick="alert('Apply flow coming soon!')">Apply</button>
          <button class="btn btn--outline btn--sm mx-8" onclick="alert('Saved!')">Save</button>
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

/* Moderation: post job */
function wirePostJobForm(){
  const form = $("postJobForm"); if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isAuthenticated) { showAlert("Please sign in to post a job."); showPage("signin"); return; }

    const role = (currentUser?.role || "CANDIDATE").toUpperCase();
    const isPrivileged = role === "EMPLOYER" || role === "ADMIN";

    const job = {
      title: safeGetValue("postTitle").trim(),
      department: safeGetValue("postDepartment").trim(),
      level: safeGetValue("postLevel"),
      description: safeGetValue("postDescription").trim(),
      institution: safeGetValue("postInstitution").trim(),
      location: safeGetValue("postLocation").trim(),
      salaryRange: safeGetValue("postSalary").trim(),
      deadline: safeGetValue("postDeadline"),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      postedBy: currentUser.id,
      postedByName: currentUser.name || "",
      postedByInstitution: currentUser.institution || "",
      active: true,
      archived: false,
      approved: isPrivileged,
      approvedBy: isPrivileged ? currentUser.id : null,
      approvedAt: null
    };

    if (!job.title || !job.department || !job.level || !job.description || !job.institution || !job.location || !job.deadline) {
      showAlert("Please fill all required fields.");
      return;
    }

    try {
      await db.collection("jobs").add(job);
      showAlert(isPrivileged ? "Job posted and visible to everyone." : "Job submitted. It will be visible after admin approval.");
      form.reset();
      showPage("jobs");
    } catch (err) {
      showAlert("Error posting job: " + (err?.message || err));
    }
  });
}

/* Realtime feed + Auto-archive */
let jobsUnsub = null;
async function maybeAutoArchiveExpired(all){
  if (!db || !isAuthenticated) return;
  const canTouch = (j) => (currentUser?.role === "ADMIN") || (currentUser?.id && j.postedBy === currentUser.id);
  const batch = db.batch();
  let changes = 0;

  all.forEach(doc => {
    const j = doc; // {id, ...data}
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

      // Auto-archive expired (ADMIN or poster)
      await maybeAutoArchiveExpired(all);

      // Public-approved active (for Home "Closing Soon")
      const publicApprovedActive = all.filter(j =>
        j.approved === true && j.active !== false && j.archived !== true && !isExpired(j)
      );

      // Near-expiry list (0..NEAR_EXPIRY_DAYS days left)
      const near = publicApprovedActive
        .map(j => ({ j, left: daysLeft(j) }))
        .filter(x => x.left != null && x.left >= 0 && x.left <= NEAR_EXPIRY_DAYS)
        .sort((a,b) => a.left - b.left)
        .map(x => x.j);

      renderNearExpiryPositions(near);

      // Visible list for Jobs page:
      // - Admin sees everything not archived and not expired (including pending)
      // - Poster sees their own pending
      // - Public sees approved active non-expired
      const isAdmin = isAuthenticated && currentUser?.role === "ADMIN";
      const visible = all.filter(j => {
        if (j.archived === true) return false;
        if (isExpired(j)) return false;
        if (isAdmin) return true;
        if (j.approved === true && j.active !== false) return true;
        if (isAuthenticated && j.postedBy === currentUser?.id) return true; // poster sees pending
        return false;
      });
      renderAllPositions(visible);

      // Archive page: everything expired OR explicitly archived
      const archivedList = all.filter(j => j.archived === true || isExpired(j));
      renderArchivePositions(archivedList);

    }, (err) => { console.warn("Jobs listener error:", err); });
}

/* ----- Admin Pending (optional UI if you added it to Admin page) ----- */
let pendingUnsub = null;
function pendingJobCardHTML(j){
  const short = (j.description || "").slice(0,140) + ((j.description||"").length>140 ? "…" : "");
  return `
    <div class="card">
      <div class="card__body">
        <h3>${escapeHtml(j.title)}</h3>
        <p>${escapeHtml(j.institution)} • ${escapeHtml(j.location)}</p>
        <div style="color:var(--text-muted);margin:6px 0;">
          ${escapeHtml(j.department)} • ${escapeHtml(j.level)}
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
  if (!(isAuthenticated && currentUser?.role === "ADMIN")) { showAlert("Only admins can approve."); return; }
  try {
    await db.collection("jobs").doc(id).update({
      approved: true,
      approvedBy: currentUser.id,
      approvedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) { showAlert("Approve failed: " + (e?.message || e)); }
}
async function rejectJob(id){
  if (!(isAuthenticated && currentUser?.role === "ADMIN")) { showAlert("Only admins can reject."); return; }
  try {
    await db.collection("jobs").doc(id).update({ active: false, approved: false });
  } catch (e) { showAlert("Reject failed: " + (e?.message || e)); }
}

/* ---------- Demo benefits removed; only dynamic lists used ---------- */

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
      if (!email || !password) { showAlert("Please enter email and password."); return; }
      signUp({ name, email, password, role, institution, photo });
    });
  }
  const signinForm = $("signinForm");
  if (signinForm) {
    signinForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = safeGetValue("signinEmail");
      const password = safeGetValue("signinPassword");
      if (!email || !password) { showAlert("Please enter email and password."); return; }
      signIn(email, password);
    });
    // Forgot password button (created by JS)
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

      // Admin pending feed hook
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
