/* ===============================
   FacultyJobs – app.js (vanilla JS)
   Works with Firebase loaded & initialized in index.html
   =============================== */

"use strict";

/* -------- Global State -------- */
let currentUser = null;
let isAuthenticated = false;

/* Try to use Firebase services exposed by index.html */
const auth = (window && window.auth) ? window.auth : (window.firebase && window.firebase.auth ? window.firebase.auth() : null);
const db   = (window && window.db)   ? window.db   : (window.firebase && window.firebase.firestore ? window.firebase.firestore() : null);

/* -------- Helpers -------- */
function $(id) {
  return document.getElementById(id);
}

function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

function safeGetValue(id) {
  const el = $(id);
  return el ? el.value : "";
}

function showAlert(msg) {
  window.alert(msg);
}

function ensureFirebase(serviceName = "Firebase") {
  const hasAuth = !!auth;
  const hasDb   = !!db;
  if (!hasAuth || !hasDb) {
    showAlert(
      serviceName + " is not ready. Please add your Firebase config values in index.html (authDomain, projectId, etc.) along with your API key."
    );
    return false;
  }
  return true;
}

/* -------- Session (localStorage) -------- */
function saveSession() {
  try {
    localStorage.setItem("fj:isAuthenticated", JSON.stringify(isAuthenticated));
    localStorage.setItem("fj:currentUser", JSON.stringify(currentUser));
  } catch (_) {}
}

function loadSession() {
  try {
    isAuthenticated = JSON.parse(localStorage.getItem("fj:isAuthenticated")) || false;
    currentUser = JSON.parse(localStorage.getItem("fj:currentUser")) || null;
  } catch (_) {
    isAuthenticated = false;
    currentUser = null;
  }
}

function clearSession() {
  try {
    localStorage.removeItem("fj:isAuthenticated");
    localStorage.removeItem("fj:currentUser");
  } catch (_) {}
}

/* -------- Navigation & Pages -------- */
function showPage(name) {
  const allPages = qsa(".page");
  allPages.forEach(p => p.classList.add("hidden"));
  const pageIdMap = {
    home: "homePage",
    jobs: "jobsPage",
    about: "aboutPage",
    signup: "signupPage",
    signin: "signinPage",
    dashboard: "dashboardPage",
    "post-job": "postJobPage",
    admin: "adminPage",
    profile: "profilePage"
  };
  const id = pageIdMap[name] || "homePage";
  const page = $(id);
  if (page) page.classList.remove("hidden");
  if (name === "dashboard" && !isAuthenticated) {
    showAlert("Please sign in to access your dashboard.");
    showPage("signin");
  }
}

function updateNavigation() {
  const anon = $("anonymousNav");
  const authd = $("authenticatedNav");
  if (isAuthenticated && currentUser) {
    if (anon) anon.classList.add("hidden");
    if (authd) authd.classList.remove("hidden");

    const userName = $("userName");
    const userRole = $("userRole");
    const userPhoto = $("userPhoto");

    if (userName) userName.textContent = currentUser.name || "User";
    if (userRole) userRole.textContent = currentUser.role || "Candidate";

    if (userPhoto) {
      if (currentUser.photo) {
        userPhoto.src = currentUser.photo;
      } else {
        // keep default avatar
      }
    }

    // Admin menu visibility
    const adminLink = qsa(".nav__admin")[0];
    if (adminLink) {
      if (currentUser.role === "ADMIN") adminLink.classList.remove("hidden");
      else adminLink.classList.add("hidden");
    }
  } else {
    if (authd) authd.classList.add("hidden");
    if (anon) anon.classList.remove("hidden");
  }
}

/* -------- User Dropdown -------- */
function toggleUserDropdown() {
  const dd = $("userDropdown");
  if (!dd) return;
  dd.classList.toggle("hidden");
}

document.addEventListener("click", (e) => {
  const dd = $("userDropdown");
  const trigger = $("userPhoto");
  if (!dd || !trigger) return;
  const clickedInside = dd.contains(e.target) || trigger.contains(e.target);
  if (!clickedInside) dd.classList.add("hidden");
});

/* -------- Auth: Sign Up / Sign In / Sign Out -------- */
async function signUp(formData) {
  if (!ensureFirebase("Authentication")) return;
  try {
    const cred = await auth.createUserWithEmailAndPassword(formData.email, formData.password);
    const user = cred.user;

    // Store profile in Firestore
    await db.collection("users").doc(user.uid).set({
      name: formData.name || "",
      role: formData.role || "CANDIDATE",
      institution: formData.institution || "",
      photo: formData.photo || null,
      createdAt: new Date().toISOString()
    });

    currentUser = {
      id: user.uid,
      name: formData.name || "",
      email: formData.email,
      role: formData.role || "CANDIDATE",
      institution: formData.institution || "",
      photo: formData.photo || null
    };
    isAuthenticated = true;
    saveSession();
    updateNavigation();
    showAlert("Account created successfully!");
    showPage("dashboard");
  } catch (err) {
    showAlert("Sign up error: " + (err && err.message ? err.message : err));
  }
}

async function signIn(email, password) {
  if (!ensureFirebase("Authentication")) return;
  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    const user = cred.user;

    // Get extended profile
    let userData = null;
    try {
      const doc = await db.collection("users").doc(user.uid).get();
      userData = doc.exists ? doc.data() : {};
    } catch (_) {
      userData = {};
    }

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
    showAlert("Sign in error: " + (err && err.message ? err.message : err));
  }
}

async function signOut() {
  if (!ensureFirebase("Authentication")) return;
  try {
    await auth.signOut();
  } catch (_) {
    // ignore
  }
  isAuthenticated = false;
  currentUser = null;
  clearSession();
  updateNavigation();
  showPage("home");
}

/* -------- Photo Upload (Signup & Profile) -------- */
function wirePhotoUpload() {
  const upload = $("photoUpload");
  const previewImg = $("photoPreview");
  const ph = $("photoPlaceholder");

  if (upload) {
    upload.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (previewImg) {
          previewImg.src = reader.result;
          previewImg.classList.remove("hidden");
        }
        if (ph) ph.classList.add("hidden");
      };
      reader.readAsDataURL(file);
    });
  }

  const profileUpload = $("profilePhotoUpload");
  const currentPhoto = $("currentPhoto");
  if (profileUpload) {
    profileUpload.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (currentPhoto) currentPhoto.src = reader.result;
        // Optionally save to profile immediately:
        if (isAuthenticated && currentUser) {
          currentUser.photo = reader.result;
          saveSession();
          updateNavigation();
          if (ensureFirebase("Firestore")) {
            db.collection("users").doc(currentUser.id).update({ photo: reader.result }).catch(() => {});
          }
        }
      };
      reader.readAsDataURL(file);
    });
  }
}

/* -------- Profile Save -------- */
function wireProfileForm() {
  const form = $("profileForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isAuthenticated || !currentUser) {
      showAlert("Please sign in.");
      return;
    }
    const name = safeGetValue("profileName");
    const institution = safeGetValue("profileInstitution");
    currentUser.name = name || currentUser.name;
    currentUser.institution = institution || currentUser.institution;
    saveSession();
    updateNavigation();
    if (ensureFirebase("Firestore")) {
      try {
        await db.collection("users").doc(currentUser.id).update({
          name: currentUser.name,
          institution: currentUser.institution
        });
      } catch (_) {}
    }
    showAlert("Profile saved!");
  });
}

/* -------- Post Job (Gate by role) -------- */
function handlePostJob() {
  if (!isAuthenticated) {
    showAlert("Please sign in as an Employer to post a job.");
    showPage("signin");
    return;
  }
  if (currentUser.role === "EMPLOYER" || currentUser.role === "ADMIN") {
    showPage("post-job");
  } else {
    showAlert("Posting jobs is for Employers/Admins. You are currently a Candidate.");
  }
}

/* -------- Featured content (static demo) -------- */
function renderFeaturedPositions() {
  const el = $("featuredPositions");
  if (!el) return;
  const items = [
    {
      title: "Assistant Professor – Computer Science",
      inst: "MIT",
      loc: "Cambridge, MA",
      level: "Assistant Professor"
    },
    {
      title: "Associate Professor – Mathematics",
      inst: "Stanford University",
      loc: "Stanford, CA",
      level: "Associate Professor"
    },
    {
      title: "Lecturer – Physics",
      inst: "University of Oxford",
      loc: "Oxford, UK",
      level: "Lecturer"
    }
  ];
  el.innerHTML = items
    .map(
      (i) => `
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
      </div>`
    )
    .join("");
}

function renderBenefits() {
  const el = $("benefitsGrid");
  if (!el) return;
  const items = [
    { h: "AI Matching", p: "Smart recommendations based on your profile." },
    { h: "Global Reach", p: "Top positions from worldwide institutions." },
    { h: "Simple Workflow", p: "Track applications and alerts easily." }
  ];
  el.innerHTML = items
    .map(
      (b) => `
      <div class="card">
        <div class="card__body">
          <h3>${b.h}</h3>
          <p>${b.p}</p>
        </div>
      </div>`
    )
    .join("");
}

/* -------- Form Wiring (Signup / Signin) -------- */
function wireAuthForms() {
  const signupForm = $("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const name = safeGetValue("signupName");
      const email = safeGetValue("signupEmail");
      const password = safeGetValue("signupPassword");
      const role = safeGetValue("signupRole") || "CANDIDATE";
      const institution = safeGetValue("signupInstitution") || "";

      let photo = null;
      const preview = $("photoPreview");
      if (preview && preview.src && !preview.classList.contains("hidden")) {
        photo = preview.src;
      }

      if (!email || !password) {
        showAlert("Please enter email and password.");
        return;
      }
      signUp({ name, email, password, role, institution, photo });
    });
  }

  const signinForm = $("signinForm");
  if (signinForm) {
    signinForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const email = safeGetValue("signinEmail");
      const password = safeGetValue("signinPassword");
      if (!email || !password) {
        showAlert("Please enter email and password.");
        return;
      }
      signIn(email, password);
    });
  }
}

/* -------- Admin link guard (optional) -------- */
// You can add more admin-only wiring here if needed.

/* -------- On Load -------- */
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

document.addEventListener("DOMContentLoaded", () => {
  // Load session first
  loadSession();

  // If Firebase auth is available, keep session in sync with real auth state
  if (auth && typeof auth.onAuthStateChanged === "function") {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Try to fetch additional user data
        let userData = {};
        if (db) {
          try {
            const doc = await db.collection("users").doc(user.uid).get();
            userData = doc.exists ? doc.data() : {};
          } catch (_) {}
        }
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
        // fall back to local session (maybe user hasn't fully configured Firebase)
        loadSession();
      }
      updateNavigation();
      hydrateProfileForm();
    });
  } else {
    // No real-time auth: rely on local session
    updateNavigation();
    hydrateProfileForm();
  }

  // Wire UI
  wireAuthForms();
  wirePhotoUpload();
  wireProfileForm();
  renderFeaturedPositions();
  renderBenefits();

  // Default page: keep whatever HTML marked as visible; nothing else to do
});

/* -------- Expose minimal globals used in HTML onclick handlers -------- */
window.showPage = showPage;
window.toggleUserDropdown = toggleUserDropdown;
window.signOut = signOut;
window.handlePostJob = handlePostJob;
