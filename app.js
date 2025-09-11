// VidyaConnect Application JavaScript - With Firebase Auth for Shared Logins and Firestore for Jobs

// Initialize Firebase (PASTE YOUR CONFIG HERE from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyDeNGpspc-vybW8_6KhlKGRPm58lSZj9K0",
  authDomain: "grok-vidyaconnect.firebaseapp.com",
  projectId: "grok-vidyaconnect",
  storageBucket: "grok-vidyaconnect.firebasestorage.app",
  messagingSenderId: "361400540802",
  appId: "1:361400540802:web:042ad7ff71023dd4d4de9b",
  measurementId: "G-2DEHHW7CXY"
};

// Initialize Firebase, Auth, and Firestore
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Application Data - Jobs loaded from Firestore; users from Auth + Firestore
const appData = {
  subjects: [
    { id: 1, name: "Mathematics", parentDiscipline: "Sciences", synonyms: ["Math", "Pure Mathematics", "Applied Mathematics"] },
    { id: 2, name: "Statistics", parentDiscipline: "Sciences", synonyms: ["Statistical Science", "Applied Statistics"] },
    { id: 3, name: "Computer Science", parentDiscipline: "Engineering", synonyms: ["CS", "Computer Engineering", "Computational Science"] },
    { id: 4, name: "Physics", parentDiscipline: "Sciences", synonyms: ["Physical Sciences", "Applied Physics"] },
    { id: 5, name: "Electronics and Communication", parentDiscipline: "Engineering", synonyms: ["ECE", "Electronics", "Communication Engineering"] },
    { id: 6, name: "Economics", parentDiscipline: "Social Sciences", synonyms: ["Economic Sciences", "Applied Economics"] },
    { id: 7, name: "Management", parentDiscipline: "Business", synonyms: ["Business Administration", "MBA", "Business Management"] },
    { id: 8, name: "English", parentDiscipline: "Languages", synonyms: ["English Literature", "English Language"] },
    { id: 9, name: "Chemistry", parentDiscipline: "Sciences", synonyms: ["Chemical Sciences", "Applied Chemistry"] },
    { id: 10, name: "Biology", parentDiscipline: "Sciences", synonyms: ["Biological Sciences", "Life Sciences"] },
    { id: 11, name: "Mechanical Engineering", parentDiscipline: "Engineering", synonyms: ["Mech Engineering", "Mechanical"] },
    { id: 12, name: "Civil Engineering", parentDiscipline: "Engineering", synonyms: ["Civil", "Construction Engineering"] }
  ],
  jobPosts: [], // Loaded from Firestore
  states: [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", 
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", 
    "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", 
    "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", 
    "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Jammu and Kashmir", 
    "Ladakh", "Lakshadweep", "Puducherry"
  ],
  universityTypes: [
    "Central", "State Public", "State Private", "Deemed", "National Importance", "GFTI", "Autonomous College", "Others"
  ],
  designations: [
    "Professor", "Associate Professor", "Assistant Professor", "Research", "Teaching Assistant", "Non teaching"
  ],
  userRoles: ["admin", "moderator", "member"]
};

// Global Application State
let currentUser = null;
let currentPage = 'home';
let savedJobs = [];
let unsubscribeJobs = null;

// Multi-select management - GLOBAL VARIABLES
let selectedStates = [];
let selectedSubjects = [];
let selectedDesignations = [];

// LOAD JOBS FROM FIRESTORE (REAL-TIME)
function loadJobsFromFirestore() {
  unsubscribeJobs = db.collection('jobPosts').onSnapshot(snapshot => {
    appData.jobPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Loaded/Updated jobs from Firestore:', appData.jobPosts.length);
    
    // Refresh UI
    if (currentPage === 'home') {
      jobManager.renderJobFeed();
    } else if (currentPage === 'saved') {
      renderSavedJobsPage();
    } else if (currentPage === 'my-posts') {
      renderMyPostsPage();
    } else if (currentPage === 'subjects') {
      renderSubjectsPage();
    }
  }, error => {
    console.error('Error loading jobs from Firestore:', error);
    showToast('Failed to load jobs. Check console.', 'error');
  });
}

// Authentication System - USING FIREBASE AUTH
class AuthManager {
  async fetchUserProfile(uid) {
    try {
      const doc = await db.collection('users').doc(uid).get();
      if (doc.exists) {
        return doc.data();
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  async signUp(email, password, firstName, lastName) {
    try {
      const credential = await auth.createUserWithEmailAndPassword(email, password);
      const user = credential.user;
      
      // Store profile in Firestore
      await db.collection('users').doc(user.uid).set({
        email: user.email,
        firstName,
        lastName,
        role: 'member',
        isVerified: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        failedLoginAttempts: 0,
        lockedUntil: null
      });
      
      currentUser = { uid: user.uid, email: user.email, firstName, lastName, role: 'member' };
      this.updateAuthUI();
      
      return { success: true, user: currentUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async signIn(email, password, rememberMe = false) {
    try {
      const credential = await auth.signInWithEmailAndPassword(email, password);
      const user = credential.user;
      
      // Fetch profile from Firestore
      const profile = await this.fetchUserProfile(user.uid);
      if (!profile) throw new Error('User profile not found');
      
      currentUser = { uid: user.uid, email: user.email, ...profile };
      this.updateAuthUI();
      
      // Update lastLoginAt
      await db.collection('users').doc(user.uid).update({ lastLoginAt: new Date().toISOString() });
      
      return { success: true, user: currentUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async signOut() {
    try {
      await auth.signOut();
      currentUser = null;
      this.updateAuthUI();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  loadSession() {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        const profile = await this.fetchUserProfile(user.uid);
        if (profile) {
          currentUser = { uid: user.uid, email: user.email, ...profile };
          console.log('Session loaded, current user:', currentUser);
        } else {
          await this.signOut();
        }
      } else {
        currentUser = null;
      }
      this.updateAuthUI();
    });
  }

  updateAuthUI() {
    const signInBtn = document.getElementById('sign-in-btn');
    const userProfile = document.getElementById('user-profile');
    const postJobBtn = document.querySelector('.post-job-btn');

    if (currentUser) {
      if (signInBtn) signInBtn.style.display = 'none';
      if (userProfile) {
        userProfile.style.display = 'flex';
        const userName = userProfile.querySelector('.user-name');
        if (userName) userName.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
      }
      if (postJobBtn) {
        postJobBtn.disabled = false;
        postJobBtn.title = 'Post a new job';
      }
    } else {
      if (signInBtn) signInBtn.style.display = 'block';
      if (userProfile) userProfile.style.display = 'none';
      if (postJobBtn) {
        postJobBtn.disabled = true;
        postJobBtn.title = 'Sign in to post jobs';
      }
    }
  }

  isAuthenticated() {
    return currentUser !== null;
  }
}

// Job Management System - FIXED WITH FIRESTORE
class JobManager {
  getActiveJobs() {
    const now = new Date();
    const activeJobs = appData.jobPosts.filter(job => {
      const deadlinePlus60Days = new Date(job.deadline); // Extended to 60 days for more grace
      deadlinePlus60Days.setDate(deadlinePlus60Days.getDate() + 60);
      return now <= deadlinePlus60Days && job.status !== 'archived';
    }).sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
    
    console.log('Active jobs:', activeJobs.length); // Debug log
    return activeJobs;
  }
  
  getUserJobs(uid) {
    return appData.jobPosts
      .filter(job => job.postedBy === uid)
      .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
  }
  
  updateJobStatuses() {
    const now = new Date();
    let hasChanges = false;
    
    appData.jobPosts.forEach(job => {
      const deadline = new Date(job.deadline);
      const deadlinePlus60Days = new Date(deadline); // Extended to 60 days
      deadlinePlus60Days.setDate(deadlinePlus60Days.getDate() + 60);
      
      if (job.status === 'active' && now > deadline) {
        job.status = 'expired';
        job.expiredAt = now.toISOString();
        hasChanges = true;
      } else if (now > deadlinePlus60Days && job.status !== 'archived') {
        job.status = 'archived';
        job.archivedAt = now.toISOString();
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      // Since real-time, no need to save - but if needed, update Firestore docs
    }
  }
  
  isJobClosingSoon(deadline) {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const timeDiff = deadlineDate - now;
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    return daysDiff <= 10 && daysDiff > 0;
  }
  
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
  }
  
  getRelativeTime(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }
  
  async createJob(jobData) {
    try {
      if (!authManager.isAuthenticated()) {
        throw new Error('Must be signed in to post jobs');
      }
      
      console.log('Creating job with data:', jobData); // Debug log
      
      // Create new job with immediate active status and multi-select support
      const newJob = {
        ...jobData,
        status: 'active', // IMMEDIATELY ACTIVE
        postedAt: new Date().toISOString(),
        postedBy: currentUser.uid,
        postedByName: `${currentUser.firstName} ${currentUser.lastName}`,
        sourceLabel: 'Community'
      };
      
      console.log('New job created:', newJob); // Debug log
      
      await db.collection('jobPosts').add(newJob);
      
      return { success: true, job: newJob };
    } catch (error) {
      console.error('Error creating job:', error); // Debug log
      return { success: false, error: error.message };
    }
  }
  
  renderJobCard(job) {
    const isClosingSoon = this.isJobClosingSoon(job.deadline);
    const closingSoonBadge = isClosingSoon ? '<span class="badge badge--urgent">Closing soon</span>' : '';
    
    let statusBadge = '';
    if (job.status === 'expired') {
      statusBadge = '<span class="badge badge--expired">Expired</span>';
    }

    // Handle multiple subjects
    let subjectsDisplay = '';
    if (job.subjectIds) {
      subjectsDisplay = job.subjectIds.map(id => {
        const subject = appData.subjects.find(subj => subj.id === id);
        return subject ? `<span class="job-tag job-tag--subject">${subject.name}</span>` : '';
      }).join('');
    }

    // Handle multiple designations
    let designationsDisplay = job.designations ? job.designations.map(des => `<span class="job-tag job-tag--designation">${des}</span>`).join('') : '';

    // Handle multiple states
    let statesDisplay = job.states ? job.states.map(state => `<span class="job-tag">${state}</span>`).join('') : '';

    return `
      <div class="job-card" data-job-id="${job.id}">
        <div class="job-card__header">
          <div class="job-card__title">${job.title}</div>
          ${closingSoonBadge} ${statusBadge}
        </div>
        <div class="job-card__institution">${job.institution || 'Not specified'}</div>
        <div class="job-card__location">${job.city || ''}${job.city && job.states?.length ? ', ' : ''}${statesDisplay}</div>
        <div class="job-card__details">
          ${designationsDisplay}
          ${subjectsDisplay}
          <span class="job-tag job-tag--type">${job.instituteType || 'Not specified'}</span>
        </div>
        <div class="job-card__deadline">Deadline: ${this.formatDate(job.deadline)}</div>
        <div class="job-card__posted">Posted ${this.getRelativeTime(job.postedAt)} by ${job.postedByName}</div>
        <div class="job-card__footer">
          <button class="btn btn--secondary save-job-btn">${savedJobs.includes(job.id) ? 'Unsave' : 'Save'}</button>
          <button class="btn btn--primary view-job-btn">View Details</button>
        </div>
      </div>
    `;
  }
  
  renderJobFeed(jobs = null) {
    const container = document.getElementById('jobs-container');
    if (!container) return;
    
    const jobList = jobs || this.getActiveJobs();
    
    container.innerHTML = jobList.length === 0 ? 
      '<div class="empty-state"><div class="empty-state__content"><h3>No active jobs</h3><p>Post a job or check back later</p></div></div>' :
      jobList.map(job => this.renderJobCard(job)).join('');
    
    this.attachJobEventListeners();
  }
  
  attachJobEventListeners() {
    // Save/unsave buttons
    document.querySelectorAll('.save-job-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const jobId = this.closest('.job-card').dataset.jobId;
        
        const index = savedJobs.indexOf(jobId);
        
        if (index === -1) {
          savedJobs.push(jobId);
          this.textContent = 'Unsave';
          showToast('Job saved', 'success');
        } else {
          savedJobs.splice(index, 1);
          this.textContent = 'Save';
          showToast('Job unsaved', 'info');
        }
        
        localStorage.setItem('vidyaconnect_saved_jobs', JSON.stringify(savedJobs));
        
        if (currentPage === 'saved') {
          renderSavedJobsPage();
        }
      });
    });
    
    // View details buttons
    document.querySelectorAll('.view-job-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const jobId = this.closest('.job-card').dataset.jobId;
        const job = appData.jobPosts.find(j => j.id === jobId);
        if (job) {
          showJobDetailModal(job);
        }
      });
    });
  }
}

// Initialize managers
const authManager = new AuthManager();
const jobManager = new JobManager();

// Page Navigation
function showPage(page) {
  currentPage = page;
  const container = document.getElementById('page-container');
  container.innerHTML = '';
  
  // Update active nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
  
  switch (page) {
    case 'home':
      renderHomePage();
      break;
    case 'post-job':
      if (!authManager.isAuthenticated()) {
        showSignInModal();
        return;
      }
      renderPostJobPage();
      break;
    case 'subjects':
      renderSubjectsPage();
      break;
    case 'saved':
      renderSavedJobsPage();
      break;
    case 'my-posts':
      renderMyPostsPage();
      break;
  }
}

function renderHomePage() {
  const container = document.getElementById('page-container');
  
  container.innerHTML = `
    <div class="page-header">
      <h1>Latest Faculty Positions</h1>
      <p>Discover academic opportunities across India</p>
    </div>
    
    <div class="search-container">
      <input type="text" id="main-search" placeholder="Search jobs, institutions, subjects..." class="search-input">
    </div>
    
    <div class="filters-bar">
      <div class="filter-group">
        <label for="state-filter">State</label>
        <select id="state-filter" class="filter-select">
          <option value="">All States</option>
          ${appData.states.map(state => `<option value="${state}">${state}</option>`).join('')}
        </select>
      </div>
      
      <div class="filter-group">
        <label for="institute-type-filter">Institute Type</label>
        <select id="institute-type-filter" class="filter-select">
          <option value="">All Types</option>
          ${appData.universityTypes.map(type => `<option value="${type}">${type}</option>`).join('')}
        </select>
      </div>
      
      <div class="filter-group">
        <label for="subject-filter">Subject</label>
        <select id="subject-filter" class="filter-select">
          <option value="">All Subjects</option>
          ${appData.subjects.map(subject => `<option value="${subject.name}">${subject.name}</option>`).join('')}
        </select>
      </div>
      
      <div class="filter-group">
        <label for="designation-filter">Designation</label>
        <select id="designation-filter" class="filter-select">
          <option value="">All Designations</option>
          ${appData.designations.map(des => `<option value="${des}">${des}</option>`).join('')}
        </select>
      </div>
    </div>
    
    <div class="quick-filters">
      <button class="quick-filter-chip" data-filter="closing-soon" data-value="true">Closing Soon</button>
      <button class="quick-filter-chip" data-filter="designation" data-value="Professor">Professor</button>
      <button class="quick-filter-chip" data-filter="designation" data-value="Assistant Professor">Assistant Prof</button>
      <button class="quick-filter-chip" data-filter="subject" data-value="Computer Science">Computer Science</button>
      <button class="quick-filter-chip" data-filter="institute-type" data-value="National Importance">National Inst</button>
    </div>
    
    <div id="jobs-container" class="jobs-grid"></div>
  `;
  
  jobManager.updateJobStatuses();
  jobManager.renderJobFeed();
  attachFilterListeners();
}

function renderPostJobPage() {
  const container = document.getElementById('page-container');
  
  container.innerHTML = `
    <div class="page-header">
      <h1>Post a Job</h1>
      <p>Share academic positions with the community</p>
    </div>
    
    <form id="post-job-form" class="job-form">
      <div class="form-section">
        <h3>Job Information</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="title">Job Title *</label>
            <input type="text" id="title" required>
          </div>
          <div class="form-group">
            <label for="institution">Institution Name</label>
            <input type="text" id="institution">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="city">City</label>
            <input type="text" id="city">
          </div>
          <div class="form-group">
            <label for="institute-type">Institute Type *</label>
            <select id="institute-type" required>
              <option value="">Select type</option>
              ${appData.universityTypes.map(type => `<option value="${type}">${type}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>Positions & Subjects</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Designations *</label>
            <div class="multi-select" id="designations-select">
              <div class="multi-select__input">Select designations</div>
              <div class="multi-select__options">
                ${appData.designations.map(des => `
                  <label class="checkbox-label">
                    <input type="checkbox" value="${des}">
                    <span class="checkbox-custom"></span>
                    ${des}
                  </label>
                `).join('')}
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label>Subjects *</label>
            <div class="multi-select" id="subjects-select">
              <div class="multi-select__input">Select subjects</div>
              <div class="multi-select__options">
                ${appData.subjects.map(subject => `
                  <label class="checkbox-label">
                    <input type="checkbox" value="${subject.id}">
                    <span class="checkbox-custom"></span>
                    ${subject.name}
                  </label>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>Location</h3>
        <div class="form-group">
          <label>States *</label>
          <div class="multi-select" id="states-select">
            <div class="multi-select__input">Select states</div>
            <div class="multi-select__options">
              ${appData.states.map(state => `
                <label class="checkbox-label">
                  <input type="checkbox" value="${state}">
                  <span class="checkbox-custom"></span>
                  ${state}
                </label>
              `).join('')}
              </div>
            </div>
          </div>
        </div>
      
        <div class="form-section">
          <h3>Application Details</h3>
          <div class="form-row">
            <div class="form-group">
              <label for="apply-method">Apply Method *</label>
              <select id="apply-method" required>
                <option value="">Select method</option>
                <option value="website">Website</option>
                <option value="email">Email</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label for="apply-url">Application Link/Email *</label>
              <input type="text" id="apply-url" required>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="deadline">Application Deadline *</label>
              <input type="date" id="deadline" required min="${new Date().toISOString().split('T')[0]}">
            </div>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn btn--secondary" onclick="showPage('home')">Cancel</button>
          <button type="submit" class="btn btn--primary">Post Job</button>
        </div>
      </form>
  `;
  
  attachMultiSelectListeners();
  document.getElementById('post-job-form').addEventListener('submit', submitPostJobForm);
}

function attachMultiSelectListeners() {
  document.querySelectorAll('.multi-select').forEach(select => {
    const input = select.querySelector('.multi-select__input');
    const options = select.querySelector('.multi-select__options');
    
    input.addEventListener('click', () => {
      options.style.display = options.style.display === 'block' ? 'none' : 'block';
    });
    
    select.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const selected = Array.from(select.querySelectorAll('input:checked'))
          .map(cb => cb.nextElementSibling.nextSibling.textContent.trim());
        input.textContent = selected.length > 0 ? selected.join(', ') : 'Select options';
      });
    });
  });
  
  // Close on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('.multi-select')) {
      document.querySelectorAll('.multi-select__options').forEach(opts => opts.style.display = 'none');
    }
  });
}

async function submitPostJobForm(e) {
  e.preventDefault();
  
  // Collect multi-select values
  selectedStates = Array.from(document.querySelectorAll('#states-select input:checked')).map(cb => cb.value);
  selectedSubjects = Array.from(document.querySelectorAll('#subjects-select input:checked')).map(cb => parseInt(cb.value));
  selectedDesignations = Array.from(document.querySelectorAll('#designations-select input:checked')).map(cb => cb.value);
  
  const jobData = {
    title: document.getElementById('title').value,
    institution: document.getElementById('institution').value,
    city: document.getElementById('city').value,
    states: [...selectedStates],
    instituteType: document.getElementById('institute-type').value,
    designations: [...selectedDesignations],
    subjectIds: [...selectedSubjects],
    applyMethod: document.getElementById('apply-method').value,
    applyUrl: document.getElementById('apply-url').value,
  };

  // FIXED: Set deadline to end of day (local time) to prevent immediate expiration
  const deadlineValue = document.getElementById('deadline').value;
  if (deadlineValue) {
    const [year, month, day] = deadlineValue.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day, 23, 59, 59, 999); // End of day local
    jobData.deadline = deadlineDate.toISOString();
    console.log('Adjusted deadline:', jobData.deadline); // Debug log
  }
  
  console.log('Job data to submit:', jobData);
  
  // Validate required fields including multi-selects
  if (!jobData.title || selectedDesignations.length === 0 || selectedSubjects.length === 0 || 
      selectedStates.length === 0 || !jobData.instituteType || !jobData.applyMethod || 
      !jobData.applyUrl || !jobData.deadline) {
    showToast('Please fill in all required fields including selections', 'error');
    return;
  }
  
  // Show loading state
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Posting Job...';
  submitBtn.disabled = true;
  
  // Submit job
  const result = await jobManager.createJob(jobData);
  
  // Reset button
  submitBtn.textContent = originalText;
  submitBtn.disabled = false;
  
  if (result.success) {
    showToast('Job posted successfully and is now live!', 'success');
    showPage('home'); // Redirect to home to see the new job
  } else {
    showToast(result.error || 'Failed to post job', 'error');
  }
}

function renderSubjectsPage() {
  const container = document.getElementById('page-container');
  
  // Group subjects by discipline
  const disciplines = {};
  appData.subjects.forEach(subject => {
    if (!disciplines[subject.parentDiscipline]) {
      disciplines[subject.parentDiscipline] = [];
    }
    disciplines[subject.parentDiscipline].push(subject);
  });
  
  container.innerHTML = `
    <div class="page-header">
      <h1>Subjects</h1>
      <p>Browse by academic disciplines</p>
    </div>
    
    <div class="subjects-container">
      ${Object.entries(disciplines).map(([discipline, subjects]) => `
        <div class="discipline-section">
          <h3 class="discipline-title">${discipline}</h3>
          <div class="subjects-grid">
            ${subjects.map(subject => {
              const jobCount = appData.jobPosts.filter(job => {
                const hasSubject = job.subjectIds && job.subjectIds.includes(subject.id);
                const isActive = jobManager.getActiveJobs().find(j => j.id === job.id);
                return hasSubject && isActive;
              }).length;
              return `
                <div class="subject-card">
                  <h4>${subject.name}</h4>
                  <p class="job-count">${jobCount} active positions</p>
                  <div class="subject-synonyms">
                    ${subject.synonyms.slice(0, 2).map(syn => `<span class="synonym-tag">${syn}</span>`).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSavedJobsPage() {
  if (!authManager.isAuthenticated()) {
    showSignInModal();
    return;
  }
  
  const container = document.getElementById('page-container');
  const savedJobPosts = appData.jobPosts.filter(job => savedJobs.includes(job.id) && job.status !== 'archived');
  
  container.innerHTML = `
    <div class="page-header">
      <h1>Saved Jobs</h1>
      <p>Your bookmarked positions</p>
    </div>
    
    <div id="saved-jobs-container" class="jobs-grid">
      ${savedJobPosts.length === 0 ? 
        '<div class="empty-state"><div class="empty-state__content"><h3>No saved jobs</h3><p>Save interesting positions to view them here</p></div></div>' :
        savedJobPosts.map(job => jobManager.renderJobCard(job)).join('')
      }
    </div>
  `;
  
  if (savedJobPosts.length > 0) {
    jobManager.attachJobEventListeners();
  }
}

function renderMyPostsPage() {
  if (!authManager.isAuthenticated()) {
    showSignInModal();
    return;
  }
  
  const container = document.getElementById('page-container');
  const userJobs = jobManager.getUserJobs(currentUser.uid);
  
  const activeJobs = userJobs.filter(job => job.status === 'active');
  const expiredJobs = userJobs.filter(job => job.status === 'expired');
  const archivedJobs = userJobs.filter(job => job.status === 'archived');
  
  container.innerHTML = `
    <div class="page-header">
      <h1>My Posts</h1>
      <p>Manage your job postings</p>
    </div>
    
    <div class="tabs-container">
      <div class="tabs">
        <button class="tab active" data-tab="active">Active (${activeJobs.length})</button>
        <button class="tab" data-tab="expired">Expired (${expiredJobs.length})</button>
        <button class="tab" data-tab="archived">Archived (${archivedJobs.length})</button>
      </div>
      
      <div class="tab-content">
        <div id="active-tab" class="tab-panel active">
          <div class="jobs-grid">
            ${activeJobs.length === 0 ? 
              '<div class="empty-state"><div class="empty-state__content"><h3>No active posts</h3><p>Post a job to see it here</p></div></div>' :
              activeJobs.map(job => jobManager.renderJobCard(job)).join('')
            }
          </div>
        </div>
        
        <div id="expired-tab" class="tab-panel">
          <div class="jobs-grid">
            ${expiredJobs.length === 0 ? 
              '<div class="empty-state"><div class="empty-state__content"><h3>No expired posts</h3></div></div>' :
              expiredJobs.map(job => jobManager.renderJobCard(job)).join('')
            }
          </div>
        </div>
        
        <div id="archived-tab" class="tab-panel">
          <div class="jobs-grid">
            ${archivedJobs.length === 0 ? 
              '<div class="empty-state"><div class="empty-state__content"><h3>No archived posts</h3></div></div>' :
              archivedJobs.map(job => jobManager.renderJobCard(job)).join('')
            }
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Attach tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
      const tabName = this.dataset.tab;
      
      // Update active tab
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      
      this.classList.add('active');  
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });
  
  jobManager.attachJobEventListeners();
}

// Filter and Search Functions
function attachFilterListeners() {
  // Dropdown filters
  document.querySelectorAll('.filter-select').forEach(select => {
    select.addEventListener('change', applyFilters);
  });
  
  // Quick filter chips
  document.querySelectorAll('.quick-filter-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      const filterType = this.dataset.filter;
      const filterValue = this.dataset.value;
      
      if (filterType === 'closing-soon') {
        // Filter for closing soon jobs
        const closingSoonJobs = jobManager.getActiveJobs().filter(job => jobManager.isJobClosingSoon(job.deadline));
        jobManager.renderJobFeed(closingSoonJobs);
      } else {
        // Set the appropriate dropdown and apply filter
        const dropdown = document.getElementById(`${filterType === 'subject' ? 'subject' : filterType === 'designation' ? 'designation' : filterType}-filter`);
        if (dropdown) {
          dropdown.value = filterValue;
          applyFilters();
        }
      }
      
      // Visual feedback
      document.querySelectorAll('.quick-filter-chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
    });
  });
  
  // Search functionality
  const searchInput = document.getElementById('main-search');
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }
}

function applyFilters() {
  const searchInput = document.getElementById('main-search');
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  const stateFilter = document.getElementById('state-filter').value;
  const instituteTypeFilter = document.getElementById('institute-type-filter').value;
  const subjectFilter = document.getElementById('subject-filter').value;
  const designationFilter = document.getElementById('designation-filter').value;
  
  let filteredJobs = jobManager.getActiveJobs();
  
  // Apply search
  if (searchTerm) {
    filteredJobs = filteredJobs.filter(job => {
      // Search in title
      if (job.title.toLowerCase().includes(searchTerm)) return true;
      
      // Search in institution
      if (job.institution && job.institution.toLowerCase().includes(searchTerm)) return true;
      
      // Search in subjects
      if (job.subjectIds) {
        const matchingSubjects = job.subjectIds.some(id => {
          const subject = appData.subjects.find(subj => subj.id === id);
          return subject && subject.name.toLowerCase().includes(searchTerm);
        });
        if (matchingSubjects) return true;
      }
      
      // Search in city
      if (job.city && job.city.toLowerCase().includes(searchTerm)) return true;
      
      // Search in states
      if (job.states) {
        const matchingStates = job.states.some(state => state.toLowerCase().includes(searchTerm));
        if (matchingStates) return true;
      }
      
      return false;
    });
  }
  
  // Apply state filter (check if job has this state in its states array)
  if (stateFilter) {
    filteredJobs = filteredJobs.filter(job => job.states && job.states.includes(stateFilter));
  }
  
  // Apply institute type filter
  if (instituteTypeFilter) {
    filteredJobs = filteredJobs.filter(job => job.instituteType === instituteTypeFilter);
  }
  
  // Apply subject filter (check if job has this subject in its subjectIds array)
  if (subjectFilter) {
    filteredJobs = filteredJobs.filter(job => {
      if (!job.subjectIds) return false;
      return job.subjectIds.some(id => {
        const subject = appData.subjects.find(subj => subj.id === id);
        return subject && subject.name === subjectFilter;
      });
    });
  }
  
  // Apply designation filter (check if job has this designation in its designations array)
  if (designationFilter) {
    filteredJobs = filteredJobs.filter(job => job.designations && job.designations.includes(designationFilter));
  }
  
  jobManager.renderJobFeed(filteredJobs);
}

// Authentication UI Functions
function showSignInModal() {
  document.getElementById('signin-modal').style.display = 'flex';
  document.getElementById('signin-error').style.display = 'none';
  document.getElementById('signin-error').textContent = '';
}

function showSignUpModal() {
  document.getElementById('signin-modal').style.display = 'none';
  document.getElementById('signup-modal').style.display = 'flex';
  document.getElementById('signup-error').style.display = 'none';
  document.getElementById('signup-error').textContent = '';
}

function hideAuthModals() {
  document.getElementById('signin-modal').style.display = 'none';
  document.getElementById('signup-modal').style.display = 'none';
  document.getElementById('signin-form').reset();
  document.getElementById('signup-form').reset();
  document.getElementById('signin-error').style.display = 'none';
  document.getElementById('signup-error').style.display = 'none';
}

// Toast Notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <div class="toast__content">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Show toast
  setTimeout(() => toast.classList.add('show'), 100);
  
  // Hide toast
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 4000);
}

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing app');
  
  // LOAD JOBS FROM FIRESTORE FIRST
  loadJobsFromFirestore();
  
  // Load saved jobs (local)
  const savedJobsData = localStorage.getItem('vidyaconnect_saved_jobs');
  if (savedJobsData) {
    savedJobs = JSON.parse(savedJobsData);
  }
  
  // Update auth UI (Firebase handles loadSession)
  authManager.loadSession();
  
  // Setup navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
      const page = this.dataset.page;
      console.log('Navigation clicked:', page);
      showPage(page);
    });
  });
  
  // Setup post job button
  document.querySelector('.post-job-btn').addEventListener('click', function() {
    console.log('Post job button clicked. Current user:', currentUser);
    if (!authManager.isAuthenticated()) {
      console.log('User not authenticated, showing signin modal');
      showSignInModal();
    } else {
      console.log('User authenticated, navigating to post-job page');
      showPage('post-job');
    }
  });
  
  // Setup sign in button
  document.getElementById('sign-in-btn').addEventListener('click', showSignInModal);
  
  // Setup auth modals
  setupAuthModals();
  
  // Start with home page
  showPage('home');
  
  // Update job statuses periodically
  setInterval(() => {
    jobManager.updateJobStatuses();
    if (currentPage === 'home') {
      jobManager.renderJobFeed();
    }
  }, 60000); // Check every minute
});

function setupAuthModals() {
  // Sign In Form
  const signinForm = document.getElementById('signin-form');
  signinForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Signing in...';
    submitBtn.disabled = true;
    
    const result = await authManager.signIn(email, password, rememberMe);
    
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    
    if (result.success) {
      hideAuthModals();
      authManager.updateAuthUI();
      showToast(`Welcome back, ${result.user.firstName}!`, 'success');
    } else {
      document.getElementById('signin-error').textContent = result.error;
      document.getElementById('signin-error').style.display = 'block';
    }
  });
  
  // Sign Up Form
  const signupForm = document.getElementById('signup-form');
  signupForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const firstName = document.getElementById('first-name').value;
    const lastName = document.getElementById('last-name').value;
    
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating Account...';
    submitBtn.disabled = true;
    
    const result = await authManager.signUp(email, password, firstName, lastName);
    
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    
    if (result.success) {
      hideAuthModals();
      authManager.updateAuthUI();
      showToast(`Welcome to VidyaConnect, ${result.user.firstName}!`, 'success');
      
      // Redirect to post job for new users
      setTimeout(() => showPage('post-job'), 1500);
    } else {
      document.getElementById('signup-error').textContent = result.error;
      document.getElementById('signup-error').style.display = 'block';
    }
  });
  
  // Modal close buttons
  document.querySelectorAll('.modal__close').forEach(btn => {
    btn.addEventListener('click', hideAuthModals);
  });
  
  // Switch between modals
  document.getElementById('show-signup').addEventListener('click', showSignUpModal);
  document.getElementById('show-signin').addEventListener('click', function() {
    document.getElementById('signup-modal').style.display = 'none';
    document.getElementById('signin-modal').style.display = 'flex';
    document.getElementById('signin-error').style.display = 'none';
  });
  
  // User menu (sign out)
  document.getElementById('sign-out-btn').addEventListener('click', function() {
    authManager.signOut();
    showToast('Signed out successfully', 'info');
    showPage('home');
  });
  
  // Close modals when clicking outside
  window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
      hideAuthModals();
    }
  });
}

function showJobDetailModal(job) {
  const modal = document.getElementById('job-detail-modal');
  const content = document.getElementById('job-detail-content');
  
  // Handle multiple fields
  const subjects = job.subjectIds?.map(id => appData.subjects.find(s => s.id === id)?.name || 'Unknown').join(', ') || 'Not specified';
  const designations = job.designations?.join(', ') || 'Not specified';
  const states = job.states?.join(', ') || 'Not specified';
  
  content.innerHTML = `
    <div class="job-detail__header">
      <h2>${job.title}</h2>
      <div class="job-detail__badges">
        ${jobManager.isJobClosingSoon(job.deadline) ? '<span class="badge badge--urgent">Closing soon</span>' : ''}
        ${job.status === 'expired' ? '<span class="badge badge--expired">Expired</span>' : ''}
      </div>
    </div>
    
    <div class="job-detail__info">
      <div class="job-info-item">
        <strong>Institution:</strong> ${job.institution || 'Not specified'}
      </div>
      <div class="job-info-item">
        <strong>Location:</strong> ${job.city ? job.city + ', ' : ''}${states}
      </div>
      <div class="job-info-item">
        <strong>Type:</strong> ${job.instituteType || 'Not specified'}
      </div>
      <div class="job-info-item">
        <strong>Designations:</strong> ${designations}
      </div>
      <div class="job-info-item">
        <strong>Subjects:</strong> ${subjects}
      </div>
      <div class="job-info-item">
        <strong>Deadline:</strong> ${jobManager.formatDate(job.deadline)}
      </div>
      <div class="job-info-item">
        <strong>Apply Via:</strong> ${job.applyMethod.charAt(0).toUpperCase() + job.applyMethod.slice(1)}
      </div>
      <div class="job-info-item">
        <strong>Application:</strong> <a href="${job.applyUrl}" target="_blank">${job.applyUrl}</a>
      </div>
      <div class="job-info-item">
        <strong>Posted:</strong> ${jobManager.getRelativeTime(job.postedAt)} by ${job.postedByName}
      </div>
    </div>
    
    <div class="job-detail__actions">
      <button class="btn btn--secondary" onclick="document.getElementById('job-detail-modal').style.display = 'none'">Close</button>
      <a href="${job.applyUrl}" target="_blank" class="btn btn--primary">Apply Now</a>
    </div>
  `;
  
  modal.style.display = 'flex';
}
