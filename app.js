/* ===========================================
FacultyJobs – Enhanced JavaScript with Fixed Job Visibility
Modern, production-ready application
=========================================== */

"use strict";

/* -------- Firebase Configuration -------- */
const firebaseConfig = {
  apiKey: "AIzaSyCBQfwpbnDdPPl0LdeXPWAc_o-Nd67EnsY",
  authDomain: "jobs-ff5a9.firebaseapp.com",
  projectId: "jobs-ff5a9",
  storageBucket: "jobs-ff5a9.firebasestorage.app",
  messagingSenderId: "110232650978",
  appId: "1:110232650978:web:64c20408089e75487f8abb",
  measurementId: "G-WW68CSEMM6"
};

/* -------- Global State -------- */
let app, db, auth, storage;
let currentUser = null;
let userRole = 'candidate';
let allJobs = [];
let isInitialized = false;

/* -------- Firebase Initialization -------- */
function initializeFirebase() {
  try {
    if (!window.firebase) {
      console.error('❌ Firebase SDK not loaded');
      showToast('Error: Firebase not available', 'error');
      return false;
    }

    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    storage = firebase.storage();
    
    console.log('✅ Firebase initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    showToast('Failed to initialize application', 'error');
    return false;
  }
}

/* -------- Enhanced Authentication -------- */
function setupAuthStateListener() {
  auth.onAuthStateChanged(async (user) => {
    console.log(`🔄 Auth state: ${user ? 'Signed in' : 'Signed out'}`);
    currentUser = user;
    
    if (user) {
      try {
        await loadUserProfile();
        updateUIForAuthenticated();
        console.log(`✅ User loaded: ${user.email} (${userRole})`);
      } catch (error) {
        console.error('❌ Error loading user:', error);
        userRole = 'candidate';
        updateUIForAuthenticated();
      }
    } else {
      userRole = 'candidate';
      updateUIForUnauthenticated();
    }
    
    // Load jobs for current page
    if (isCurrentPage('jobs') || isCurrentPage('home')) {
      await loadJobs();
    }
  });
}

async function loadUserProfile() {
  if (!currentUser || !db) return;
  
  try {
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      userRole = userData.role || 'candidate';
      updateUserDisplay(userData);
    } else {
      // Create new user profile
      await createUserProfile();
    }
  } catch (error) {
    console.error('❌ Error loading user profile:', error);
    throw error;
  }
}

async function createUserProfile() {
  if (!currentUser || !db) return;
  
  try {
    const userData = {
      displayName: currentUser.displayName || currentUser.email.split('@')[0],
      email: currentUser.email,
      role: 'candidate',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      isActive: true
    };
    
    await db.collection('users').doc(currentUser.uid).set(userData);
    userRole = 'candidate';
    console.log('✅ User profile created');
  } catch (error) {
    console.error('❌ Error creating user profile:', error);
    throw error;
  }
}

/* -------- FIXED: Enhanced Job Management -------- */
async function loadJobs() {
  try {
    console.log('📋 Loading jobs...');
    
    if (!db) {
      console.warn('⚠️ Database not initialized');
      return;
    }

    // FIXED: Query for approved jobs only
    const jobsQuery = db.collection('jobs')
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .limit(50);

    const snapshot = await jobsQuery.get();
    
    allJobs = [];
    snapshot.forEach(doc => {
      const jobData = doc.data();
      allJobs.push({
        id: doc.id,
        ...jobData,
        createdAt: jobData.createdAt?.toDate() || new Date()
      });
    });

    console.log(`✅ Loaded ${allJobs.length} jobs`);
    displayJobs(allJobs);
    
  } catch (error) {
    console.error('❌ Error loading jobs:', error);
    showToast('Failed to load jobs', 'error');
    displayNoJobs();
  }
}

async function submitJob(jobData) {
  try {
    if (!currentUser || !db) {
      throw new Error('Authentication required');
    }

    console.log('📝 Submitting job...');

    // FIXED: Role-based status assignment
    let status = 'pending'; // Default for candidates
    if (userRole === 'employer' || userRole === 'admin') {
      status = 'approved'; // Auto-approve for employers/admins
    }

    const jobDoc = {
      ...jobData,
      status: status,
      postedBy: currentUser.uid,
      posterEmail: currentUser.email,
      posterRole: userRole,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      viewCount: 0,
      applicationCount: 0
    };

    const docRef = await db.collection('jobs').add(jobDoc);
    
    console.log(`✅ Job submitted: ${docRef.id} (${status})`);
    
    if (status === 'approved') {
      showToast('Job posted successfully! 🎉', 'success');
      // Refresh jobs if on jobs page
      if (isCurrentPage('jobs')) {
        setTimeout(loadJobs, 1000);
      }
    } else {
      showToast('Job submitted for review', 'info');
    }

    return docRef.id;

  } catch (error) {
    console.error('❌ Error submitting job:', error);
    showToast('Failed to submit job', 'error');
    throw error;
  }
}

/* -------- Enhanced UI Functions -------- */
function displayJobs(jobs) {
  const containers = [
    document.getElementById('jobsList'),
    document.getElementById('featuredJobs'),
    document.querySelector('.positions-grid')
  ].filter(Boolean);

  if (containers.length === 0) {
    console.warn('⚠️ No job containers found');
    return;
  }

  if (!jobs || jobs.length === 0) {
    containers.forEach(container => {
      container.innerHTML = `
        <div class="no-jobs-message">
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <h3>No positions available</h3>
            <p>Check back soon for new opportunities!</p>
            ${userRole !== 'candidate' ? 
              '<button class="btn btn--primary" onclick="showPage(\'post-job\')">Post a Position</button>' : ''
            }
          </div>
        </div>
      `;
    });
    return;
  }

  const jobsHTML = jobs.map(createJobCard).join('');
  containers.forEach(container => {
    container.innerHTML = jobsHTML;
  });

  // Update results count
  updateResultsCount(jobs.length);
}

function createJobCard(job) {
  const timeAgo = getTimeAgo(job.createdAt);
  const imageHTML = job.imageUrl ? 
    `<img src="${job.imageUrl}" alt="${escapeHtml(job.title)}" class="job-image">` : '';
  
  const statusHTML = userRole === 'admin' ? 
    `<span class="status status--${job.status}">${job.status.toUpperCase()}</span>` : '';

  const departments = Array.isArray(job.department) ? 
    job.department.join(', ') : (job.department || 'Not specified');
  
  const levels = Array.isArray(job.level) ? 
    job.level.join(', ') : (job.level || 'Not specified');

  return `
    <div class="card job-card" data-job-id="${job.id}">
      <div class="card__body">
        ${imageHTML}
        <div class="job-header">
          <h3 class="job-title">${escapeHtml(job.title)}</h3>
          ${statusHTML}
        </div>
        
        <div class="job-institution">
          <strong>${escapeHtml(job.institution || '')}</strong>
        </div>
        
        <div class="job-location">
          📍 ${escapeHtml(job.location || '')}
        </div>
        
        <div class="job-details">
          <div class="job-detail">
            <span class="detail-label">Department:</span>
            <span class="detail-value">${escapeHtml(departments)}</span>
          </div>
          
          <div class="job-detail">
            <span class="detail-label">Level:</span>
            <span class="detail-value">${escapeHtml(levels)}</span>
          </div>
          
          ${job.deadline ? `
            <div class="job-detail">
              <span class="detail-label">Deadline:</span>
              <span class="detail-value deadline">${escapeHtml(job.deadline)}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="job-meta">
          <span class="posted-time">Posted ${timeAgo}</span>
          ${job.viewCount ? `<span class="view-count">${job.viewCount} views</span>` : ''}
        </div>
        
        <div class="job-actions">
          <button class="btn btn--primary" onclick="viewJobDetails('${job.id}')">
            View Details
          </button>
          ${userRole === 'admin' && job.status === 'pending' ? `
            <button class="btn btn--success btn--sm" onclick="approveJob('${job.id}')">
              Approve
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function displayNoJobs() {
  const containers = [
    document.getElementById('jobsList'),
    document.getElementById('featuredJobs')
  ].filter(Boolean);

  containers.forEach(container => {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No positions available</h3>
        <p>Be the first to know when new opportunities are posted!</p>
        ${userRole !== 'candidate' ? 
          '<button class="btn btn--primary" onclick="showPage(\'post-job\')">Post a Position</button>' : ''
        }
      </div>
    `;
  });
}

/* -------- Authentication Handlers -------- */
async function handleSignup(event) {
  event.preventDefault();
  
  try {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const role = document.getElementById('signupRole').value;
    
    if (!name || !email || !password || !role) {
      showToast('Please fill in all required fields', 'warning');
      return;
    }

    console.log('📝 Creating user account...');
    showToast('Creating your account...', 'info');

    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    
    // Update profile
    await userCredential.user.updateProfile({
      displayName: name
    });

    // Create user document
    await db.collection('users').doc(userCredential.user.uid).set({
      displayName: name,
      email: email,
      role: role,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      isActive: true
    });

    userRole = role;
    showToast('Account created successfully! 🎉', 'success');
    showPage('dashboard');

  } catch (error) {
    console.error('❌ Signup error:', error);
    
    let message = 'Failed to create account';
    if (error.code === 'auth/email-already-in-use') {
      message = 'Email address is already registered';
    } else if (error.code === 'auth/weak-password') {
      message = 'Password should be at least 6 characters';
    }
    
    showToast(message, 'error');
  }
}

async function handleLogin(event) {
  event.preventDefault();
  
  try {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
      showToast('Please enter email and password', 'warning');
      return;
    }

    console.log('🔐 Signing in...');
    showToast('Signing you in...', 'info');

    await auth.signInWithEmailAndPassword(email, password);
    
    showToast('Welcome back! 🎉', 'success');
    showPage('dashboard');

  } catch (error) {
    console.error('❌ Login error:', error);
    
    let message = 'Failed to sign in';
    if (error.code === 'auth/user-not-found') {
      message = 'No account found with this email';
    } else if (error.code === 'auth/wrong-password') {
      message = 'Incorrect password';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Invalid email address';
    }
    
    showToast(message, 'error');
  }
}

async function logout() {
  try {
    await auth.signOut();
    showToast('Signed out successfully', 'success');
    showPage('home');
  } catch (error) {
    console.error('❌ Logout error:', error);
    showToast('Error signing out', 'error');
  }
}

/* -------- Job Form Handler -------- */
async function handlePostJob(event) {
  event.preventDefault();
  
  try {
    const formData = {
      title: document.getElementById('jobTitle').value.trim(),
      institution: document.getElementById('jobInstitution').value.trim(),
      location: document.getElementById('jobLocation').value.trim(),
      description: document.getElementById('jobDescription').value.trim(),
      requirements: document.getElementById('jobRequirements').value.trim(),
      deadline: document.getElementById('jobDeadline').value
    };

    // Get selected departments and levels
    const deptSelect = document.getElementById('jobDepartment');
    const levelSelect = document.getElementById('jobLevel');
    
    formData.department = Array.from(deptSelect.selectedOptions).map(opt => opt.value);
    formData.level = Array.from(levelSelect.selectedOptions).map(opt => opt.value);

    // Validation
    if (!formData.title || !formData.institution || !formData.location || 
        !formData.description || !formData.department.length || !formData.level.length) {
      showToast('Please fill in all required fields', 'warning');
      return;
    }

    showToast('Posting your job...', 'info');
    
    const jobId = await submitJob(formData);
    
    if (jobId) {
      document.getElementById('postJobForm').reset();
      showPage('jobs');
    }

  } catch (error) {
    console.error('❌ Post job error:', error);
    showToast('Failed to post job', 'error');
  }
}

/* -------- Enhanced Utility Functions -------- */
function showPage(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });

  // Show target page
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add('active');
    
    // Update navigation active state
    updateNavigation(pageId);
    
    // Load page-specific data
    if (pageId === 'jobs' || pageId === 'home') {
      loadJobs();
    }
  }
}

function updateNavigation(activePageId) {
  document.querySelectorAll('.nav__link').forEach(link => {
    link.classList.remove('active');
  });
  
  const activeLink = document.querySelector(`[onclick="showPage('${activePageId}')"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }
}

function isCurrentPage(pageId) {
  const page = document.getElementById(pageId);
  return page && page.classList.contains('active');
}

function updateUIForAuthenticated() {
  document.querySelectorAll('.auth-required').forEach(el => {
    el.style.display = 'block';
  });
  
  document.querySelectorAll('.unauth-required').forEach(el => {
    el.style.display = 'none';
  });
  
  updateRoleBasedUI();
}

function updateUIForUnauthenticated() {
  document.querySelectorAll('.auth-required').forEach(el => {
    el.style.display = 'none';
  });
  
  document.querySelectorAll('.unauth-required').forEach(el => {
    el.style.display = 'block';
  });
  
  // Hide all role-specific elements
  document.querySelectorAll('[class*="role-"]').forEach(el => {
    el.style.display = 'none';
  });
}

function updateRoleBasedUI() {
  // Hide all role elements first
  document.querySelectorAll('[class*="role-"]').forEach(el => {
    el.style.display = 'none';
  });
  
  // Show elements for current role
  document.querySelectorAll(`.role-${userRole}`).forEach(el => {
    el.style.display = 'block';
  });
}

function updateUserDisplay(userData) {
  const userNameEl = document.getElementById('userName');
  const userRoleEl = document.querySelector('.user-role');
  
  if (userNameEl) {
    userNameEl.textContent = userData.displayName || currentUser.email;
  }
  
  if (userRoleEl) {
    userRoleEl.textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);
  }
}

function updateResultsCount(count) {
  const resultsCountEl = document.getElementById('resultsCount');
  if (resultsCountEl) {
    resultsCountEl.textContent = `${count} position${count !== 1 ? 's' : ''} found`;
  }
}

/* -------- Enhanced Toast System -------- */
function showToast(message, type = 'info', duration = 4000) {
  console.log(`🍞 Toast: ${message} (${type})`);
  
  // Remove existing toasts
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(toast => toast.remove());
  
  // Create toast container if needed
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  // Create toast
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  // Auto remove
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('toast--hide');
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

/* -------- Utility Functions -------- */
function getTimeAgo(date) {
  if (!date) return 'Unknown';
  
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (minutes > 5) return `${minutes} minutes ago`;
  return 'Just now';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function toggleUserDropdown() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) {
    dropdown.classList.toggle('show');
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', (event) => {
  const dropdown = document.getElementById('userDropdown');
  const userPhoto = document.querySelector('.user-photo');
  
  if (dropdown && !dropdown.contains(event.target) && event.target !== userPhoto) {
    dropdown.classList.remove('show');
  }
});

/* -------- Job Actions -------- */
function viewJobDetails(jobId) {
  const job = allJobs.find(j => j.id === jobId);
  if (job) {
    // For now, just show an alert with job details
    // In a real app, this would open a detailed view
    alert(`Job Details:\n\nTitle: ${job.title}\nInstitution: ${job.institution}\nLocation: ${job.location}\n\nDescription: ${job.description}`);
  }
}

async function approveJob(jobId) {
  try {
    if (userRole !== 'admin') {
      showToast('Only admins can approve jobs', 'warning');
      return;
    }

    await db.collection('jobs').doc(jobId).update({
      status: 'approved',
      approvedBy: currentUser.uid,
      approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    showToast('Job approved successfully! 🎉', 'success');
    await loadJobs(); // Refresh jobs

  } catch (error) {
    console.error('❌ Error approving job:', error);
    showToast('Failed to approve job', 'error');
  }
}

/* -------- Search and Filter Functions -------- */
function searchJobs() {
  const searchTerm = document.getElementById('jobSearch')?.value.toLowerCase() || '';
  const department = document.getElementById('departmentFilter')?.value || '';
  const level = document.getElementById('levelFilter')?.value || '';
  const location = document.getElementById('locationFilter')?.value || '';

  let filteredJobs = allJobs.filter(job => {
    const matchesSearch = !searchTerm || 
      job.title.toLowerCase().includes(searchTerm) ||
      job.institution.toLowerCase().includes(searchTerm) ||
      job.description.toLowerCase().includes(searchTerm);

    const matchesDept = !department || 
      (Array.isArray(job.department) ? job.department.includes(department) : job.department === department);

    const matchesLevel = !level ||
      (Array.isArray(job.level) ? job.level.includes(level) : job.level === level);

    const matchesLocation = !location ||
      job.location.toLowerCase().includes(location.toLowerCase());

    return matchesSearch && matchesDept && matchesLevel && matchesLocation;
  });

  displayJobs(filteredJobs);
}

/* -------- Application Initialization -------- */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 FacultyJobs starting...');
  
  try {
    // Initialize Firebase
    if (!initializeFirebase()) {
      return;
    }
    
    // Setup authentication listener
    setupAuthStateListener();
    
    isInitialized = true;
    console.log('✅ Application initialized successfully');
    
    // Load initial jobs for home page
    if (isCurrentPage('home')) {
      setTimeout(loadJobs, 1000);
    }
    
  } catch (error) {
    console.error('❌ Application initialization failed:', error);
    showToast('Failed to initialize application', 'error');
  }
});

/* -------- Global Exports -------- */
window.FacultyJobs = {
  // Auth functions
  handleSignup,
  handleLogin,
  logout,
  toggleUserDropdown,
  
  // Navigation
  showPage,
  
  // Job functions
  loadJobs,
  submitJob,
  handlePostJob,
  viewJobDetails,
  approveJob,
  searchJobs,
  
  // Utility
  showToast
};

console.log('✅ Enhanced FacultyJobs application loaded');
