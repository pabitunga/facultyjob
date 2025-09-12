/* ===========================================
   FacultyJobs – app.js (compat SDK version)
   - Firebase init here (uses compat scripts in index.html)
   - Email verification (signup + sign-in gate)
   - Forgot password (reset email)
   =========================================== */

"use strict";

/* -------- Firebase Init (single source of truth) --------
   Make sure index.html includes:
   firebase-app-compat.js, firebase-auth-compat.js, firebase-firestore-compat.js
*/
(function initFirebase() {
  if (window.firebase && window.firebase.apps && window.firebase.apps.length) {
    console.log("[Firebase] Reusing existing app");
    return;
  }

  // ✅ Your configuration (storageBucket corrected to appspot.com)
  const firebaseConfig = {
    apiKey: "AIzaSyCBQfwpbnDdPPl0LdeXPWAc_o-Nd67EnsY",
    authDomain: "jobs-ff5a9.firebaseapp.com",
    projectId: "jobs-ff5a9",
    storageBucket: "jobs-ff5a9.appspot.com",
    messagingSenderId: "110232650978",
    appId: "1:110232650978:web:ca2187d10b3df0007f8abb",
    measurementId: "G-1S3LY2D6DD" // optional
  };

  try {
    window.firebase.initializeApp(firebaseConfig);
    console.log("[Firebase] Initialized in app.js");
  } catch (e) {
    console.warn("[Firebase] Init error:", e);
  }
})();

/* Shortcuts after init */
const auth = window.firebase?.auth ? window.firebase.auth() : null;
const db   = window.firebase?.firestore ? window.firebase.firestore() : null;

/* ---------------- Global State ---------------- */
let currentUser = null;
let isAuthenticated = false;

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
/* --- Email Verification Helpers --- */
async function sendVerificationEmail(user) {
  try {
    await user.sendEmailVerification(); // compat method on user
  } catch (err) {
    console.warn("sendEmailVerification error:", err);
  }
}

async function handleUnverifiedSignIn(user) {
  await sendVerificationEmail(user); // (re)send on sign-in if still unverified
  showAlert("We sent a verification link to: " + (user.email || "your email") +
            ". Please verify, then sign in again.");
  await auth.signOut();     // block access until verified
  isAuthenticated = false;
  currentUser = null;
  clearSession();
  updateNavigation();
  showPage("signin");
}

/* --- Sign Up --- */
async function signUp(formData) {
  if (!ensureFirebase("Authentication")) return;
  try {
    const cred = await auth.createUserWithEmailAndPassword(formData.email, formData.password);
    const user = cred.user;

    // Save profile in Firestore
    await db.collection("users").doc(user.uid).set({
      name: formData.name || "",
      role: formData.role || "CANDIDATE",
      institution: formData.institution || "",
      photo: formData.photo || null,
      createdAt: new Date().toISOString()
    });

    // Send verification & require verification before using the app
    await sendVerificationEmail(user);
    showAlert("Verification email sent to " + (user.email || "your email") + ". Please verify, then sign in.");
    await auth.signOut();        // block until verified
    isAuthenticated = false;
    currentUser = null;
    clearSession();
    updateNavigation();
    showPage("signin");
  } catch (err) {
    showAlert("Sign up error: " + (err?.message || err));
  }
}

/* --- Sign In --- */
async function signIn(email, password) {
  if (!ensureFirebase("Authentication")) return;
  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    const user = cred.user;

    // Gate: require verified email
    if (!user.emailVerified) {
      await handleUnverifiedSignIn(user);
      return;
    }

    // Load extended profile
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

/* --- Sign Out --- */
async function signOut() {
  if (!ensureFirebase("Authentication")) {
    isAuthenticated = false; currentUser = null; clearSession(); updateNavigation(); showPage("home"); return;
  }
  try { await auth.signOut(); } catch {}
  isAuthenticated = false;
  currentUser = null;
  clearSession();
  updateNavigation();
  showPage("home");
}

/* --- Forgot Password --- */
async function forgotPassword(email) {
  if (!ensureFirebase("Authentication")) return;
  try {
    await auth.sendPasswordResetEmail(email);
    showAlert("Password reset email sent to " + email + ". Check your inbox.");
  } catch (err) {
    showAlert("Reset error: " + (err?.message || err));
  }
}

/* ================== UI Wiring ================== */
/* Photo Upload (Signup & Profile) */
function wirePhotoUpload() {
  const upload = $("photoUpload");
  const previewImg = $("photoPreview");
  const ph = $("photoPlaceholder");

  if (upload) {
    upload.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (previewImg) {
          previewImg.src = reader.result;
          previewImg.classList.remove("hidden");
        }
        ph && ph.classList.add("hidden");
      };
      reader.readAsDataURL(file);
    });
  }

  const profileUpload = $("profilePhotoUpload");
  const currentPhoto = $("currentPhoto");
  if (profileUpload) {
    profileUpload.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        if (currentPhoto) currentPhoto.src = reader.result;
        if (isAuthenticated && currentUser) {
          currentUser.photo = reader.result;
          saveSession();
          updateNavigation();
          if (ensureFirebase("Firestore")) {
            try { await db.collection("users").doc(currentUser.id).update({ photo: reader.result }); } catch {}
          }
        }
      };
      reader.readAsDataURL(file);
    });
  }
}

/* Profile Save */
function wireProfileForm() {
  const form = $("profileForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isAuthenticated || !currentUser) { showAlert("Please sign in."); return; }
    const name = safeGetValue("profileName");
    const institution = safeGetValue("profileInstitution");
    currentUser.name = name || currentUser.name;
    currentUser.institution = institution || currentUser.institution;
    saveSession();
    updateNavigation();
    if (ensureFirebase("Firestore")) {
      try { await db.collection("users").doc(currentUser.id).update({ name: currentUser.name, institution: currentUser.institution }); } catch {}
    }
    showAlert("Profile saved!");
  });
}

/* Post Job Role Gate */
function handlePostJob() {
  if (!isAuthenticated) { showAlert("Please sign in as an Employer to post a job."); showPage("signin"); return; }
  if (currentUser.role === "EMPLOYER" || currentUser.role === "ADMIN") showPage("post-job");
  else showAlert("Posting jobs is for Employers/Admins. You are currently a Candidate.");
}
/* ================== JOBS (Realtime) ================== */
function escapeHtml(str){ 
  return (str||'').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

function jobCardHTML(j){
  const desc = (j.description || "");
  const short = desc.length > 180 ? desc.slice(0,180) + "…" : desc;
  return `
    <div class="card">
      <div class="card__body">
        <h3>${escapeHtml(j.title)}</h3>
        <p>${escapeHtml(j.institution)} • ${escapeHtml(j.location)}</p>
        <div class="text-sm" style="color:var(--text-muted); margin-top:4px;">
          ${escapeHtml(j.department)} • ${escapeHtml(j.level)}
        </div>
        <p style="margin-top:8px">${escapeHtml(short)}</p>
        <div class="mt-8">
          <button class="btn btn--primary btn--sm" onclick="alert('Apply flow coming soon!')">Apply</button>
          <button class="btn btn--outline btn--sm mx-8" onclick="alert('Saved!')">Save</button>
        </div>
      </div>
    </div>`;
}

function renderAllPositions(jobs){
  const el = document.getElementById("allPositions");
  if (!el) return;
  if (!jobs.length){
    el.innerHTML = `<p style="color:var(--text-muted)">No jobs posted yet.</p>`;
    return;
  }
  el.innerHTML = jobs.map(jobCardHTML).join("");
}

function renderFeaturedPositionsFromJobs(jobs){
  const el = document.getElementById("featuredPositions");
  if (!el) return;
  const top3 = jobs.slice(0,3);
  el.innerHTML = top3.map(jobCardHTML).join("");
}

let jobsUnsub = null;
function subscribeToJobs(){
  if (!db) return;
  try { if (jobsUnsub) jobsUnsub(); } catch {}
  jobsUnsub = db.collection("jobs")
    .orderBy("createdAt", "desc")
    .onSnapshot((snap) => {
      const jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(j => j.active !== false); // show all unless explicitly inactive
      renderAllPositions(jobs);
      renderFeaturedPositionsFromJobs(jobs);
    }, (err) => {
      console.warn("Jobs listener error:", err);
    });
}

function wirePostJobForm(){
  const form = document.getElementById("postJobForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      showAlert("Please sign in to post a job.");
      showPage("signin");
      return;
    }

    // Decide approval based on role
    const role = (currentUser?.role || "CANDIDATE").toUpperCase();
    const isPrivileged = role === "EMPLOYER" || role === "ADMIN";

    // Build the job object
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

      // ✅ moderation flags
      approved: isPrivileged,                          // EMPLOYER/ADMIN => live now
      approvedBy: isPrivileged ? currentUser.id : null,
      approvedAt: null
    };

    // Minimal validation
    if (!job.title || !job.department || !job.level || !job.description ||
        !job.institution || !job.location || !job.deadline) {
      showAlert("Please fill all required fields.");
      return;
    }

    try {
      await db.collection("jobs").add(job);
      showAlert(
        isPrivileged
          ? "Job posted and visible to everyone."
          : "Job submitted. It will be visible after admin approval."
      );
      form.reset();
      showPage("jobs");
    } catch (err) {
      showAlert("Error posting job: " + (err?.message || err));
    }
  });
}

let jobsUnsub = null;

function subscribeToJobs(){
  if (!db) return;
  try { if (jobsUnsub) jobsUnsub(); } catch {}

  jobsUnsub = db.collection("jobs")
    .orderBy("createdAt", "desc")
    .onSnapshot((snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const isAdmin = isAuthenticated && currentUser?.role === "ADMIN";

      const visible = all.filter(j => {
        if (j.active === false) return false;
        if (j.approved === true) return true;                       // public
        if (isAdmin) return true;                                   // admin sees all
        if (isAuthenticated && j.postedBy === currentUser?.id) return true; // poster sees pending
        return false;
      });

      renderAllPositions(visible);
      renderFeaturedPositionsFromJobs(visible);
    }, (err) => {
      console.warn("Jobs listener error:", err);
    });
}



/* Demo content */
function renderFeaturedPositions() {
  const el = $("featuredPositions");
  if (!el) return;
  const items = [
    { title: "Assistant Professor – Computer Science", inst: "MIT", loc: "Cambridge, MA", level: "Assistant Professor" },
    { title: "Associate Professor – Mathematics",     inst: "Stanford University", loc: "Stanford, CA", level: "Associate Professor" },
    { title: "Lecturer – Physics",                    inst: "University of Oxford", loc: "Oxford, UK", level: "Lecturer" }
  ];
  el.innerHTML = items.map(i => `
    <div class="card">
      <div class="card__body">
        <h3>${i.title}</h3>
        <p>${i.inst} • ${i.loc}</p>
        <span class="status">${i.level}</span>
        <div class="mt-8">
          <button class="btn btn--primary btn--sm" onclick="alert('Apply flow coming soon!')">Apply</button>
          <button class="btn btn--outline btn--sm mx-8" onclick="alert('Saved!')">Save</button>
        </div>
      </div>
    </div>
  `).join("");
}
function renderBenefits() {
  const el = $("benefitsGrid");
  if (!el) return;
  const items = [
    { h: "AI Matching",  p: "Smart recommendations based on your profile." },
    { h: "Global Reach", p: "Top positions from worldwide institutions." },
    { h: "Simple Flow",  p: "Track applications and alerts easily." }
  ];
  el.innerHTML = items.map(b => `
    <div class="card"><div class="card__body"><h3>${b.h}</h3><p>${b.p}</p></div></div>
  `).join("");
}

/* Forms wiring (Signup / Signin) */
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

    // Add a "Forgot password?" button under the sign-in form (no HTML edits needed)
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

/* Hydrate profile form */
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

/* --------------- On Load --------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadSession();

  if (auth && typeof auth.onAuthStateChanged === "function") {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        // If not verified, do NOT authenticate/allow navigation
        if (!user.emailVerified) {
          // (Optional) Do nothing here; sign-in flow will already handle sending + sign-out.
          // Keep showing anonymous nav.
          isAuthenticated = false;
          currentUser = null;
          updateNavigation();
          return;
        }

        // Verified user → hydrate profile
        let userData = {};
        try {
          const doc = await db.collection("users").doc(user.uid).get();
          userData = doc.exists ? doc.data() : {};
        } catch {}
        currentUser = {
          id: user.uid,
          name: userData.name || currentUser?.name || "User",
          email: user.email || currentUser?.email || "",
          role: userData.role || currentUser?.role || "CANDIDATE",
          institution: userData.institution || currentUser?.institution || "",
          photo: userData.photo || currentUser?.photo || null
        };
        isAuthenticated = true;
        saveSession();
      } else {
        loadSession(); // fall back to any saved session
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

  renderFeaturedPositions();
  renderBenefits();
});

/* Expose for HTML onclick */
window.showPage = showPage;
window.toggleUserDropdown = toggleUserDropdown;
window.signOut = signOut;
window.handlePostJob = handlePostJob;

