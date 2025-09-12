// Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
// Application data
const applicationData = {
  "featured_positions": [
    {
      "id": "pos1",
      "title": "Professor of Computer Science",
      "institution": "Stanford University",
      "location": "Stanford, CA",
      "salary": "$120,000 - $160,000",
      "badge": "Featured",
      "deadline": "2025-12-15",
      "department": "Computer Science",
      "type": "Tenure Track",
      "institution_logo": "🏛️",
      "highlights": ["Research Excellence", "Top Ranking", "Global Impact"]
    },
    {
      "id": "pos2",
      "title": "Associate Professor of Mathematics",
      "institution": "MIT",
      "location": "Cambridge, MA",
      "salary": "$95,000 - $125,000",
      "badge": "Hot",
      "deadline": "2025-11-30",
      "department": "Mathematics",
      "type": "Tenure Track",
      "institution_logo": "🎓",
      "highlights": ["World-Class Research", "Innovation Hub", "Excellent Benefits"]
    },
    {
      "id": "pos3",
      "title": "Assistant Professor of Physics",
      "institution": "Harvard University",
      "location": "Cambridge, MA",
      "salary": "$85,000 - $110,000",
      "badge": "New",
      "deadline": "2026-01-20",
      "department": "Physics & Astronomy",
      "type": "Tenure Track",
      "institution_logo": "🔬",
      "highlights": ["Ivy League", "Research Funding", "Academic Freedom"]
    }
  ],
  "why_choose_benefits": [
    {
      "icon": "🤖",
      "title": "AI-Powered Matching",
      "description": "Advanced algorithms match you with perfect positions"
    },
    {
      "icon": "🌍",
      "title": "Global Network",
      "description": "Connect with 500+ universities worldwide"
    },
    {
      "icon": "👨‍💼",
      "title": "Expert Support",
      "description": "Get personalized career guidance"
    },
    {
      "icon": "🔔",
      "title": "Real-Time Alerts",
      "description": "Never miss the perfect opportunity"
    },
    {
      "icon": "✅",
      "title": "Verified Institutions",
      "description": "All partners are thoroughly vetted"
    },
    {
      "icon": "📈",
      "title": "Success Stories",
      "description": "10,000+ faculty placed successfully"
    }
  ]
};

// Application state
let currentUser = null;
let isAuthenticated = false;

// Page Navigation Function
function showPage(pageId) {
  console.log('Showing page:', pageId);
  
  // Hide all pages
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => {
    page.classList.remove('active');
    page.classList.add('hidden');
  });
  
  // Show target page
  const targetPage = document.getElementById(pageId + 'Page');
  if (targetPage) {
    targetPage.classList.remove('hidden');
    targetPage.classList.add('active');
    
    // Check if page requires authentication
    const protectedPages = ['dashboard', 'post-job', 'admin', 'profile'];
    if (!isAuthenticated && protectedPages.includes(pageId)) {
      showPage('signin');
      return;
    }
    
    // Admin page only for admin users
    if (pageId === 'admin' && currentUser?.role !== 'ADMIN') {
      showPage('dashboard');
      return;
    }
    
    // Load page-specific data
    if (pageId === 'jobs') {
      populateAllPositions();
    } else if (pageId === 'profile') {
      loadProfileData();
    }
  } else {
    console.error('Page not found:', pageId + 'Page');
  }
}

// Session Management
function checkSession() {
  // For demo purposes, we'll use a simple flag instead of sessionStorage
  // since sessionStorage might not be available in sandbox environments
  if (window.demoUser) {
    currentUser = window.demoUser;
    isAuthenticated = true;
  }
}

function saveSession() {
  if (currentUser) {
    window.demoUser = currentUser;
  }
}

function clearSession() {
  window.demoUser = null;
  currentUser = null;
  isAuthenticated = false;
}

// Navigation Updates
function updateNavigation() {
  const anonymousNav = document.getElementById('anonymousNav');
  const authenticatedNav = document.getElementById('authenticatedNav');
  const adminLink = document.querySelector('.nav__admin');
  
  if (isAuthenticated && currentUser) {
    // Show authenticated navigation
    if (anonymousNav) anonymousNav.classList.add('hidden');
    if (authenticatedNav) authenticatedNav.classList.remove('hidden');
    
    // Update user info
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const userPhoto = document.getElementById('userPhoto');
    
    if (userName) userName.textContent = currentUser.name;
    if (userRole) userRole.textContent = currentUser.role;
    if (userPhoto) {
      if (currentUser.photo) {
        userPhoto.src = currentUser.photo;
      } else {
        // Default avatar
        userPhoto.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNmNWY1ZjUiLz4KPHN2ZwpmIGZpbGw9IiM5OTk5OTkiIGQ9Im0yMCAxNmE0IDQgMCAxIDEgMC04IDQgNCAwIDAgMSAwIDh6bTAgMmMtNC40MiAwLTggMS43OS04IDR2MmgxNnYtMmMwLTIuMjEtMy41OC00LTgtNHoiLz4KPC9zdmc+';
      }
    }
    
    // Show admin link for admin users
    if (adminLink) {
      if (currentUser.role === 'ADMIN') {
        adminLink.classList.remove('hidden');
      } else {
        adminLink.classList.add('hidden');
      }
    }
  } else {
    // Show anonymous navigation
    if (anonymousNav) anonymousNav.classList.remove('hidden');
    if (authenticatedNav) authenticatedNav.classList.add('hidden');
    if (adminLink) adminLink.classList.add('hidden');
  }
}

// User Menu Dropdown
function toggleUserDropdown() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
    
    // Close dropdown when clicking outside
    setTimeout(() => {
      document.addEventListener('click', function closeDropdown(e) {
        if (!e.target.closest('.user-menu')) {
          dropdown.classList.add('hidden');
          document.removeEventListener('click', closeDropdown);
        }
      });
    }, 100);
  }
}

// Authentication Functions
function signUp(formData) {
  const email = formData.email;
  const password = formData.password;

  // New Firebase part: Create real user
  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Signed up!
      const user = userCredential.user;

      // New: Save extra info to Firestore
      db.collection('users').doc(user.uid).set({
        name: formData.name,
        email: email,
        role: formData.role,
        institution: formData.institution || '',
        photo: formData.photo || null,
        createdAt: new Date().toISOString()
      })
      .then(() => {
        // All good!
        currentUser = {
          id: user.uid,  // Use Firebase ID
          name: formData.name,
          email: email,
          role: formData.role,
          institution: formData.institution || '',
          photo: formData.photo || null,
          createdAt: new Date().toISOString()
        };
        isAuthenticated = true;
        saveSession();
        updateNavigation();
        alert('Account created successfully! Welcome to FacultyJobs!');
        showPage('dashboard');
      })
      .catch((error) => {
        alert('Oops! Error saving info: ' + error.message);
      });
    })
    .catch((error) => {
      alert('Oops! ' + error.message);  // Show error if something wrong
    });
}

function signIn(email, password) {
  // New Firebase part: Sign in real user
  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Signed in!
      const user = userCredential.user;

      // New: Load extra info from Firestore
      db.collection('users').doc(user.uid).get()
        .then((doc) => {
          if (doc.exists) {
            // Use saved info
            currentUser = doc.data();
            currentUser.id = user.uid;
          } else {
            // If no info, use default
            currentUser = {
              id: user.uid,
              name: 'Dr. Jane Smith',
              email: email,
              role: email.includes('admin') ? 'ADMIN' : 'CANDIDATE',
              institution: 'Stanford University',
              photo: null
            };
          }
          isAuthenticated = true;
          saveSession();
          updateNavigation();
          alert('Welcome back! You have successfully signed in.');
          showPage('dashboard');
        })
        .catch((error) => {
          alert('Oops! Error loading info: ' + error.message);
        });
    })
    .catch((error) => {
      alert('Oops! ' + error.message);
    });
}

function signOut() {
  clearSession();
  updateNavigation();
  alert('You have been signed out successfully.');
  showPage('home');
}

// Handle Post Job Button
function handlePostJob() {
  if (isAuthenticated) {
    showPage('post-job');
  } else {
    alert('Please sign in to post a job.');
    showPage('signin');
  }
}

// Application Functions
function quickApply(positionId) {
  if (!isAuthenticated) {
    alert('Please sign in to apply for positions.');
    showPage('signin');
    return;
  }
  
  const allPositions = [
    ...applicationData.featured_positions,
    {
      "id": "pos4",
      "title": "Professor of Engineering",
      "institution": "UC Berkeley"
    },
    {
      "id": "pos5", 
      "title": "Assistant Professor of Biology",
      "institution": "Yale University"
    }
  ];
  
  const position = allPositions.find(p => p.id === positionId) || { title: 'Selected Position', institution: 'University' };
  
  alert(`Application submitted for ${position.title} at ${position.institution}!\n\nWe'll notify you about the application status.`);
  
  // Visual feedback
  const button = event.target;
  if (button) {
    const originalText = button.textContent;
    button.textContent = 'Applied!';
    button.style.background = 'var(--color-success)';
    button.disabled = true;
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '';
      button.disabled = false;
    }, 2000);
  }
}

function learnMore(positionId) {
  const allPositions = [
    ...applicationData.featured_positions,
    {
      "id": "pos4",
      "title": "Professor of Engineering",
      "institution": "UC Berkeley",
      "location": "Berkeley, CA",
      "department": "Engineering",
      "type": "Tenured",
      "salary": "$110,000 - $140,000",
      "deadline": "2025-12-31",
      "highlights": ["Public Ivy", "Innovation Center", "Industry Connections"]
    },
    {
      "id": "pos5",
      "title": "Assistant Professor of Biology", 
      "institution": "Yale University",
      "location": "New Haven, CT",
      "department": "Biology",
      "type": "Tenure Track",
      "salary": "$75,000 - $95,000",
      "deadline": "2026-02-15",
      "highlights": ["Research Excellence", "Lab Resources", "Collaborative Environment"]
    }
  ];
  
  const position = allPositions.find(p => p.id === positionId);
  if (position) {
    const details = `Position: ${position.title}
Institution: ${position.institution}
Location: ${position.location || 'Location TBD'}
Department: ${position.department || 'Various Departments'}
Type: ${position.type || 'Academic Position'}
Salary: ${position.salary || 'Competitive'}
Deadline: ${position.deadline ? formatDate(position.deadline) : 'Rolling Basis'}
Highlights: ${position.highlights ? position.highlights.join(', ') : 'Excellent opportunity'}

This position offers excellent opportunities for research and teaching in a world-class academic environment.`;
    alert(details);
  }
}

// Content Population Functions
function createPositionCard(position) {
  return `
    <div class="position-card" data-position-id="${position.id}">
      <div class="position-header">
        <div class="institution-info">
          <div class="institution-logo">${position.institution_logo}</div>
          <div class="institution-details">
            <h3>${position.title}</h3>
            <div class="institution-name">${position.institution}</div>
          </div>
        </div>
        <div class="featured-badge">${position.badge}</div>
      </div>
      
      <div class="position-details">
        <div class="detail-row">
          <span class="detail-label">Location:</span>
          <span class="detail-value">${position.location}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Department:</span>
          <span class="detail-value">${position.department}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Position Type:</span>
          <span class="detail-value">${position.type}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Salary Range:</span>
          <span class="detail-value salary">${position.salary}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Application Deadline:</span>
          <span class="detail-value">${formatDate(position.deadline)}</span>
        </div>
      </div>
      
      <div class="position-highlights">
        <div class="highlights-list">
          ${position.highlights.map(highlight => `<span class="highlight-tag">${highlight}</span>`).join('')}
        </div>
      </div>
      
      <div class="position-actions">
        <button class="btn btn--primary btn-quick-apply" onclick="quickApply('${position.id}')">Quick Apply</button>
        <button class="btn btn-learn-more" onclick="learnMore('${position.id}')">Learn More</button>
      </div>
    </div>
  `;
}

function createBenefitCard(benefit) {
  return `
    <div class="benefit-card">
      <span class="benefit-icon">${benefit.icon}</span>
      <h3>${benefit.title}</h3>
      <p class="benefit-description">${benefit.description}</p>
    </div>
  `;
}

function populateFeaturedPositions() {
  const container = document.getElementById('featuredPositions');
  if (container) {
    container.innerHTML = applicationData.featured_positions
      .map(position => createPositionCard(position))
      .join('');
  }
}

function populateAllPositions() {
  const container = document.getElementById('allPositions');
  if (container) {
    const allPositions = [
      ...applicationData.featured_positions,
      {
        "id": "pos4",
        "title": "Professor of Engineering",
        "institution": "UC Berkeley",
        "location": "Berkeley, CA",
        "salary": "$110,000 - $140,000",
        "badge": "Leadership",
        "deadline": "2025-12-31",
        "department": "Engineering",
        "type": "Tenured",
        "institution_logo": "⚡",
        "highlights": ["Public Ivy", "Innovation Center", "Industry Connections"]
      },
      {
        "id": "pos5",
        "title": "Assistant Professor of Biology",
        "institution": "Yale University",
        "location": "New Haven, CT",
        "salary": "$75,000 - $95,000",
        "badge": "Research Focus",
        "deadline": "2026-02-15",
        "department": "Biology",
        "type": "Tenure Track",
        "institution_logo": "🧬",
        "highlights": ["Research Excellence", "Lab Resources", "Collaborative Environment"]
      }
    ];
    
    container.innerHTML = allPositions
      .map(position => createPositionCard(position))
      .join('');
  }
}

function populateBenefits() {
  const container = document.getElementById('benefitsGrid');
  if (container) {
    container.innerHTML = applicationData.why_choose_benefits
      .map(benefit => createBenefitCard(benefit))
      .join('');
  }
}

// Photo Upload Functions
function setupPhotoUpload() {
  const photoUpload = document.getElementById('photoUpload');
  if (photoUpload) {
    photoUpload.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const photoPreview = document.getElementById('photoPreview');
          const photoPlaceholder = document.getElementById('photoPlaceholder');
          if (photoPreview && photoPlaceholder) {
            photoPreview.src = e.target.result;
            photoPreview.classList.remove('hidden');
            photoPlaceholder.classList.add('hidden');
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

function setupProfilePhotoUpload() {
  const profilePhotoUpload = document.getElementById('profilePhotoUpload');
  if (profilePhotoUpload) {
    profilePhotoUpload.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const currentPhoto = document.getElementById('currentPhoto');
          if (currentPhoto) {
            currentPhoto.src = e.target.result;
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

// Form Setup
function setupFormHandlers() {
  // Sign up form
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const name = document.getElementById('signupName')?.value;
      const email = document.getElementById('signupEmail')?.value;
      const password = document.getElementById('signupPassword')?.value;
      const role = document.getElementById('signupRole')?.value;
      const institution = document.getElementById('signupInstitution')?.value;
      const photo = document.getElementById('photoPreview')?.src;
      
      if (name && email && password) {
        signUp({
          name: name,
          email: email,
          password: password,
          role: role,
          institution: institution || '',
          photo: photo && !photo.includes('svg') ? photo : null
        });
      } else {
        alert('Please fill in all required fields.');
      }
    });
  }
  
  // Sign in form
  const signinForm = document.getElementById('signinForm');
  if (signinForm) {
    signinForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const email = document.getElementById('signinEmail')?.value;
      const password = document.getElementById('signinPassword')?.value;
      
      if (email && password) {
        signIn(email, password);
      } else {
        alert('Please enter both email and password.');
      }
    });
  }
  
  // Post job form
  const postJobForm = document.getElementById('postJobForm');
  if (postJobForm) {
    postJobForm.addEventListener('submit', function(e) {
      e.preventDefault();
      alert('Job posted successfully! It will be reviewed and published shortly.');
      showPage('dashboard');
    });
  }
  
  // Profile form
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      if (currentUser) {
        const name = document.getElementById('profileName')?.value;
        const institution = document.getElementById('profileInstitution')?.value;
        const photo = document.getElementById('currentPhoto')?.src;
        
        if (name) currentUser.name = name;
        if (institution) currentUser.institution = institution;
        if (photo && !photo.includes('svg')) currentUser.photo = photo;
        
        saveSession();
        updateNavigation();
        alert('Profile updated successfully!');
      }
    });
  }
}

// Load Profile Data
function loadProfileData() {
  if (currentUser) {
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileInstitution = document.getElementById('profileInstitution');
    const currentPhoto = document.getElementById('currentPhoto');
    
    if (profileName) profileName.value = currentUser.name || '';
    if (profileEmail) profileEmail.value = currentUser.email || '';
    if (profileInstitution) profileInstitution.value = currentUser.institution || '';
    if (currentPhoto) {
      if (currentUser.photo) {
        currentPhoto.src = currentUser.photo;
      } else {
        currentPhoto.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjZjVmNWY1Ii8+CjwvZ2Q+';
      }
    }
  }
}

// Utility Functions
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

// Initialize application
function init() {
  console.log('Initializing FacultyJobs application...');
  
  // Check for existing session
  checkSession();
  
  // Update navigation based on auth status
  updateNavigation();
  
  // Populate content
  populateFeaturedPositions();
  populateBenefits();
  
  // Setup photo upload handlers
  setupPhotoUpload();
  setupProfilePhotoUpload();
  
  // Setup form handlers
  setupFormHandlers();
  
  // Show home page by default
  showPage('home');
  
  console.log('FacultyJobs application initialized successfully!');
}

// Make functions globally available
window.showPage = showPage;
window.toggleUserDropdown = toggleUserDropdown;
window.signOut = signOut;
window.handlePostJob = handlePostJob;
window.quickApply = quickApply;
window.learnMore = learnMore;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
