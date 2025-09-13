// Faculty Jobs Application JavaScript
class FacultyJobsApp {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'home';
        this.jobs = [];
        this.userProfiles = {};
        this.dashboardStats = {};
        this.recentActivity = [];
        this.adminStats = {};
        
        this.initializeData();
        this.initializeApp();
    }

    initializeApp() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
                this.initializeTheme();
                this.updateUI();
                this.loadFeaturedJobs(); // Load featured jobs immediately
            });
        } else {
            this.setupEventListeners();
            this.initializeTheme();
            this.updateUI();
            this.loadFeaturedJobs(); // Load featured jobs immediately
        }
    }

    initializeData() {
        // Sample data from the provided JSON
        this.jobs = [
            {
                id: "1",
                title: "Assistant Professor of Computer Science",
                institution: "Stanford University", 
                location: "Stanford, CA, USA",
                departments: ["Computer Science"],
                levels: ["Assistant Professor"],
                description: "We are seeking an exceptional Assistant Professor to join our Computer Science department. The successful candidate will contribute to research in artificial intelligence, machine learning, or related fields. Responsibilities include teaching undergraduate and graduate courses, conducting cutting-edge research, and mentoring students.",
                deadline: "2025-10-15",
                salaryRange: "$120,000 - $160,000",
                applicationLink: "https://stanford.edu/apply",
                approved: true,
                active: true,
                postedBy: "employer1",
                postedByName: "Stanford HR",
                createdAt: "2025-09-01",
                institutionType: "Research University",
                image: null
            },
            {
                id: "2", 
                title: "Professor of Mathematics",
                institution: "MIT",
                location: "Cambridge, MA, USA",
                departments: ["Mathematics"],
                levels: ["Full Professor"],
                description: "MIT Mathematics Department invites applications for a tenured Professor position. We seek candidates with outstanding research records in pure or applied mathematics. The position includes teaching graduate and undergraduate courses and leading research initiatives.",
                deadline: "2025-09-20",
                salaryRange: "$180,000 - $220,000", 
                applicationLink: "https://mit.edu/faculty-search",
                approved: true,
                active: true,
                postedBy: "employer2",
                postedByName: "MIT Faculty Search",
                createdAt: "2025-08-28",
                institutionType: "Research University",
                image: null
            },
            {
                id: "3",
                title: "Associate Professor of Physics",
                institution: "Harvard University",
                location: "Cambridge, MA, USA", 
                departments: ["Physics"],
                levels: ["Associate Professor"],
                description: "Harvard Physics Department seeks an Associate Professor specializing in condensed matter physics or quantum materials. The position offers excellent research facilities, competitive salary, and opportunities for collaboration with leading scientists worldwide.",
                deadline: "2025-09-25",
                salaryRange: "$140,000 - $180,000",
                applicationLink: "https://harvard.edu/physics-jobs",
                approved: true,
                active: true,
                postedBy: "employer3", 
                postedByName: "Harvard Physics Dept",
                createdAt: "2025-09-05",
                institutionType: "Research University",
                image: null
            },
            {
                id: "4",
                title: "Postdoctoral Research Fellow in Biology",
                institution: "UC Berkeley",
                location: "Berkeley, CA, USA",
                departments: ["Biology"],
                levels: ["Postdoctoral Researcher"],
                description: "Seeking a motivated postdoctoral researcher to work on computational biology and genomics projects. The fellow will work with large-scale genomic datasets and develop novel algorithms for biological data analysis.",
                deadline: "2025-10-30",
                salaryRange: "$60,000 - $70,000",
                applicationLink: "https://berkeley.edu/postdoc",
                approved: true,
                active: true,
                postedBy: "employer4",
                postedByName: "UC Berkeley Bio Dept",
                createdAt: "2025-09-10",
                institutionType: "Public Institution",
                image: null
            },
            {
                id: "5",
                title: "Lecturer in Engineering", 
                institution: "Caltech",
                location: "Pasadena, CA, USA",
                departments: ["Engineering"],
                levels: ["Lecturer"],
                description: "Caltech Engineering Division invites applications for a Lecturer position focusing on undergraduate education in mechanical or electrical engineering. Strong teaching skills and industry experience preferred.",
                deadline: "2025-11-15",
                salaryRange: "$80,000 - $100,000",
                applicationLink: "https://caltech.edu/jobs",
                approved: null,
                active: true,
                postedBy: "candidate1",
                postedByName: "Dr. Jane Smith", 
                createdAt: "2025-09-12",
                institutionType: "Private Institution",
                image: null
            },
            {
                id: "6",
                title: "Assistant Professor of Psychology",
                institution: "Yale University",
                location: "New Haven, CT, USA",
                departments: ["Psychology"], 
                levels: ["Assistant Professor"],
                description: "Yale Psychology Department seeks candidates specializing in cognitive neuroscience or social psychology. The position includes teaching responsibilities and opportunities to establish an independent research program.",
                deadline: "2025-12-01",
                salaryRange: "$100,000 - $130,000",
                applicationLink: "https://yale.edu/psychology",
                approved: true,
                active: true,
                postedBy: "employer5",
                postedByName: "Yale Psychology",
                createdAt: "2025-09-08",
                institutionType: "Private Institution", 
                image: null
            },
            {
                id: "7",
                title: "Professor of Economics (Expired)",
                institution: "Princeton University", 
                location: "Princeton, NJ, USA",
                departments: ["Economics"],
                levels: ["Full Professor"],
                description: "Princeton Economics Department was seeking a tenured Professor with expertise in macroeconomics or econometrics. This position has now closed.",
                deadline: "2025-08-30",
                salaryRange: "$160,000 - $200,000",
                applicationLink: "https://princeton.edu/econ",
                approved: true,
                active: false,
                archived: true,
                postedBy: "employer6",
                postedByName: "Princeton Economics",
                createdAt: "2025-07-15",
                institutionType: "Private Institution",
                image: null
            }
        ];

        this.userProfiles = {
            candidate1: {
                id: "candidate1",
                name: "Dr. Jane Smith",
                email: "jane.smith@email.com",
                role: "CANDIDATE", 
                institution: "Research Institute",
                verified: true,
                photo: null
            },
            employer1: {
                id: "employer1",
                name: "Stanford HR",
                email: "hr@stanford.edu",
                role: "EMPLOYER",
                institution: "Stanford University", 
                verified: true,
                photo: null
            },
            admin1: {
                id: "admin1",
                name: "Admin User",
                email: "admin@facultyjobs.com",
                role: "ADMIN",
                institution: "Faculty Jobs Platform",
                verified: true, 
                photo: null
            }
        };

        // Start with candidate user logged in by default to show all functionality
        this.currentUser = this.userProfiles.candidate1;

        this.dashboardStats = {
            profileCompletion: 75,
            activeApplications: 3,
            savedPositions: 12, 
            activeAlerts: 5
        };

        this.recentActivity = [
            {
                action: "Applied to Professor of Computer Science at Stanford University",
                time: "2 hours ago",
                icon: "📝"
            },
            {
                action: "Saved Associate Professor of Mathematics at MIT", 
                time: "1 day ago",
                icon: "💾"
            },
            {
                action: "Updated profile information",
                time: "3 days ago",
                icon: "👤"
            }
        ];

        this.adminStats = {
            totalUsers: 1247,
            activePositions: 89,
            totalApplications: 3456,
            newUsersToday: 23
        };
    }

    setupEventListeners() {
        // Navigation - Use event delegation for better reliability
        document.body.addEventListener('click', (e) => {
            // Handle page navigation
            if (e.target.matches('[data-page]') || e.target.closest('[data-page]')) {
                e.preventDefault();
                const element = e.target.matches('[data-page]') ? e.target : e.target.closest('[data-page]');
                const page = element.getAttribute('data-page');
                this.navigateToPage(page);
                return;
            }

            // Handle theme toggle
            if (e.target.matches('#theme-toggle') || e.target.closest('#theme-toggle')) {
                e.preventDefault();
                this.toggleTheme();
                return;
            }

            // Handle logout
            if (e.target.matches('#logout-btn') || e.target.closest('#logout-btn')) {
                e.preventDefault();
                this.logout();
                return;
            }

            // Handle job posting
            if (e.target.matches('#post-job-btn') || e.target.closest('#post-job-btn')) {
                e.preventDefault();
                this.openJobModal();
                return;
            }

            // Handle modal close
            if (e.target.matches('#modal-close-btn, #cancel-job-btn') || e.target.closest('#modal-close-btn, #cancel-job-btn')) {
                e.preventDefault();
                this.closeJobModal();
                return;
            }

            // Handle photo upload
            if (e.target.matches('#upload-photo-btn') || e.target.closest('#upload-photo-btn')) {
                e.preventDefault();
                const photoInput = document.getElementById('photo-input');
                if (photoInput) photoInput.click();
                return;
            }

            // Handle auth switch
            if (e.target.matches('#auth-switch') || e.target.closest('#auth-switch')) {
                e.preventDefault();
                this.toggleAuthMode();
                return;
            }
        });

        // Form submissions
        const authForm = document.getElementById('auth-form');
        if (authForm) {
            authForm.addEventListener('submit', (e) => this.handleAuth(e));
        }

        const jobForm = document.getElementById('job-form');
        if (jobForm) {
            jobForm.addEventListener('submit', (e) => this.handleJobPost(e));
        }

        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));
        }

        // Photo upload
        const photoInput = document.getElementById('photo-input');
        if (photoInput) {
            photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
        }

        // Search and filters - Use event delegation
        document.body.addEventListener('input', (e) => {
            if (e.target.matches('#job-search')) {
                this.filterJobs();
            }
        });

        document.body.addEventListener('change', (e) => {
            if (e.target.matches('#department-filter, #level-filter, #location-filter')) {
                this.filterJobs();
            }
        });
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-color-scheme', savedTheme);
        this.updateThemeToggle();
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-color-scheme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-color-scheme', newTheme);
        try {
            localStorage.setItem('theme', newTheme);
        } catch (e) {
            // Handle localStorage not available
            console.log('Theme preference cannot be saved');
        }
        this.updateThemeToggle();
        this.showToast(`Switched to ${newTheme} mode`, 'success');
    }

    updateThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        const isDark = document.documentElement.getAttribute('data-color-scheme') === 'dark';
        if (themeToggle) {
            themeToggle.textContent = isDark ? '☀️' : '🌙';
            themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
        }
    }

    navigateToPage(page) {
        if (!page) return;
        
        console.log('Navigating to:', page);
        
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = page;
        } else {
            console.error('Page not found:', `${page}-page`);
            return;
        }

        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`[data-page="${page}"].nav-link`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Load page-specific data
        switch (page) {
            case 'home':
                this.loadFeaturedJobs();
                break;
            case 'jobs':
                this.loadAllJobs();
                this.populateFilters();
                break;
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'admin':
                this.loadAdmin();
                break;
            case 'profile':
                this.loadProfile();
                break;
        }
    }

    updateUI() {
        // Update body class based on user state
        document.body.className = ''; // Reset classes
        
        if (!this.currentUser) {
            document.body.classList.add('no-user');
        } else if (this.currentUser.role === 'ADMIN') {
            document.body.classList.add('admin-user');
        }

        // Update user name displays
        const userNameElement = document.getElementById('user-name');
        if (userNameElement && this.currentUser) {
            userNameElement.textContent = this.currentUser.name;
        }
    }

    loadFeaturedJobs() {
        const container = document.getElementById('featured-jobs-list');
        if (!container) {
            console.error('Featured jobs container not found');
            return;
        }

        // Get jobs closing soon (within 30 days)
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        const featuredJobs = this.jobs.filter(job => {
            if (!job.active || !job.approved) return false;
            const deadline = new Date(job.deadline);
            return deadline >= today && deadline <= thirtyDaysFromNow;
        }).slice(0, 3);

        if (featuredJobs.length === 0) {
            container.innerHTML = '<p class="text-center">No featured jobs available at the moment.</p>';
            return;
        }

        container.innerHTML = featuredJobs.map(job => this.createJobCard(job, true)).join('');
        console.log('Featured jobs loaded:', featuredJobs.length);
    }

    loadAllJobs() {
        this.filterJobs();
    }

    filterJobs() {
        const container = document.getElementById('jobs-list');
        const resultsCount = document.getElementById('results-count');
        if (!container || !resultsCount) return;

        const searchTerm = document.getElementById('job-search')?.value.toLowerCase() || '';
        const departmentFilter = document.getElementById('department-filter')?.value || '';
        const levelFilter = document.getElementById('level-filter')?.value || '';
        const locationFilter = document.getElementById('location-filter')?.value || '';

        let filteredJobs = this.jobs.filter(job => {
            if (!job.active) return false;
            
            // Only show approved jobs to regular users
            if (this.currentUser?.role !== 'ADMIN' && !job.approved) return false;

            if (searchTerm && !job.title.toLowerCase().includes(searchTerm) && 
                !job.institution.toLowerCase().includes(searchTerm)) return false;
            if (departmentFilter && !job.departments.includes(departmentFilter)) return false;
            if (levelFilter && !job.levels.includes(levelFilter)) return false;
            if (locationFilter && !job.location.toLowerCase().includes(locationFilter.toLowerCase())) return false;

            return true;
        });

        resultsCount.textContent = `${filteredJobs.length} position${filteredJobs.length !== 1 ? 's' : ''} found`;
        container.innerHTML = filteredJobs.map(job => this.createJobCard(job)).join('');
    }

    populateFilters() {
        const departments = [...new Set(this.jobs.flatMap(job => job.departments))];
        const levels = [...new Set(this.jobs.flatMap(job => job.levels))];
        const locations = [...new Set(this.jobs.map(job => job.location.split(',')[1]?.trim()).filter(Boolean))];

        this.populateSelect('department-filter', departments);
        this.populateSelect('level-filter', levels);
        this.populateSelect('location-filter', locations);
    }

    populateSelect(selectId, options) {
        const select = document.getElementById(selectId);
        if (!select) return;

        const currentOptions = Array.from(select.options).slice(1).map(opt => opt.value);
        const newOptions = options.filter(opt => !currentOptions.includes(opt));

        newOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });
    }

    createJobCard(job, featured = false) {
        const today = new Date();
        const deadline = new Date(job.deadline);
        const daysUntilDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        
        let deadlineText = '';
        let deadlineClass = '';
        
        if (daysUntilDeadline < 0) {
            deadlineText = 'Expired';
            deadlineClass = 'expired';
        } else if (daysUntilDeadline <= 7) {
            deadlineText = `${daysUntilDeadline} day${daysUntilDeadline !== 1 ? 's' : ''} left`;
            deadlineClass = 'urgent';
        } else {
            deadlineText = deadline.toLocaleDateString();
            deadlineClass = 'normal';
        }

        const statusBadge = job.approved === null ? 
            '<span class="status status-pending">Pending Approval</span>' :
            job.approved ? '<span class="status status-approved">Approved</span>' : '';

        const adminActions = this.currentUser?.role === 'ADMIN' && job.approved === null ? `
            <div class="admin-actions">
                <button class="btn btn--sm btn--primary" onclick="app.approveJob('${job.id}')">Approve</button>
                <button class="btn btn--sm btn--outline" onclick="app.rejectJob('${job.id}')">Reject</button>
            </div>
        ` : '';

        return `
            <div class="job-card ${job.approved === null ? 'admin-job-card' : ''}">
                <div class="job-header">
                    <div>
                        <h3 class="job-title">${job.title}</h3>
                        <div class="job-institution">${job.institution}</div>
                        <div class="job-location">${job.location}</div>
                    </div>
                    ${statusBadge}
                </div>
                <div class="job-meta">
                    ${job.departments.map(dept => `<span class="job-tag">${dept}</span>`).join('')}
                    ${job.levels.map(level => `<span class="job-tag">${level}</span>`).join('')}
                </div>
                <div class="job-description">${job.description}</div>
                <div class="job-footer">
                    <div>
                        <div class="job-salary">${job.salaryRange}</div>
                        <div class="job-deadline ${deadlineClass}">${deadlineText}</div>
                    </div>
                    <div class="job-actions">
                        ${job.applicationLink ? `<a href="${job.applicationLink}" target="_blank" class="btn btn--primary btn--sm">Apply</a>` : ''}
                        <button class="btn btn--outline btn--sm" onclick="app.saveJob('${job.id}')">Save</button>
                    </div>
                </div>
                ${adminActions}
            </div>
        `;
    }

    saveJob(jobId) {
        this.showToast('Job saved to your favorites', 'success');
    }

    approveJob(jobId) {
        const job = this.jobs.find(j => j.id === jobId);
        if (job) {
            job.approved = true;
            this.showToast(`Job "${job.title}" approved`, 'success');
            this.loadAdmin(); // Refresh admin view
        }
    }

    rejectJob(jobId) {
        const job = this.jobs.find(j => j.id === jobId);
        if (job) {
            job.approved = false;
            job.active = false;
            this.showToast(`Job "${job.title}" rejected`, 'warning');
            this.loadAdmin(); // Refresh admin view
        }
    }

    loadDashboard() {
        // Update progress bar
        const profileProgress = document.getElementById('profile-progress');
        if (profileProgress) {
            profileProgress.style.width = `${this.dashboardStats.profileCompletion}%`;
        }

        // Update stats
        const statsMapping = {
            'active-applications': this.dashboardStats.activeApplications,
            'saved-positions': this.dashboardStats.savedPositions,
            'job-alerts': this.dashboardStats.activeAlerts
        };

        Object.entries(statsMapping).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });

        // Load activity feed
        this.loadActivityFeed();
    }

    loadActivityFeed() {
        const container = document.getElementById('activity-feed');
        if (!container) return;

        container.innerHTML = this.recentActivity.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">${activity.icon}</div>
                <div class="activity-content">
                    <div class="activity-action">${activity.action}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            </div>
        `).join('');
    }

    loadAdmin() {
        // Update admin stats
        Object.entries(this.adminStats).forEach(([key, value]) => {
            const elements = document.querySelectorAll('.admin-stats .stat-number');
            if (elements.length >= 4) {
                const mapping = ['totalUsers', 'activePositions', 'totalApplications', 'newUsersToday'];
                const index = mapping.indexOf(key);
                if (index !== -1 && elements[index]) {
                    elements[index].textContent = value.toLocaleString();
                }
            }
        });

        // Load pending jobs
        this.loadPendingJobs();
    }

    loadPendingJobs() {
        const container = document.getElementById('pending-jobs');
        if (!container) return;

        const pendingJobs = this.jobs.filter(job => job.approved === null && job.active);
        
        if (pendingJobs.length === 0) {
            container.innerHTML = '<p class="text-center">No pending jobs to review.</p>';
            return;
        }

        container.innerHTML = pendingJobs.map(job => this.createJobCard(job)).join('');
    }

    loadProfile() {
        if (!this.currentUser) return;

        // Populate profile form
        const fields = ['name', 'email', 'institution'];
        fields.forEach(field => {
            const input = document.getElementById(`profile-${field}`);
            if (input) {
                input.value = this.currentUser[field] || '';
            }
        });

        // Load photo preview
        const photoPreview = document.getElementById('photo-preview');
        if (photoPreview && this.currentUser.photo) {
            photoPreview.innerHTML = `<img src="${this.currentUser.photo}" alt="Profile photo">`;
        }
    }

    handleAuth(e) {
        e.preventDefault();
        const form = e.target;
        const email = form.querySelector('#auth-email').value;
        const password = form.querySelector('#auth-password').value;
        const nameField = form.querySelector('#auth-name');
        const isSignUp = nameField && nameField.parentElement && !nameField.parentElement.classList.contains('hidden');

        if (isSignUp) {
            const name = nameField.value;
            const role = form.querySelector('#auth-role').value;
            
            // Simulate user creation
            const userId = 'user_' + Date.now();
            const newUser = {
                id: userId,
                name,
                email,
                role,
                institution: '',
                verified: false,
                photo: null
            };
            
            this.userProfiles[userId] = newUser;
            this.currentUser = newUser;
            
            this.showToast('Account created successfully!', 'success');
        } else {
            // Simulate login - find user by email
            const user = Object.values(this.userProfiles).find(u => u.email === email);
            if (user) {
                this.currentUser = user;
                this.showToast(`Welcome back, ${user.name}!`, 'success');
            } else {
                this.showToast('Invalid credentials', 'error');
                return;
            }
        }

        this.updateUI();
        this.navigateToPage('dashboard');
    }

    toggleAuthMode() {
        const authTitle = document.getElementById('auth-title');
        const authSubmit = document.getElementById('auth-submit');
        const authSwitchText = document.getElementById('auth-switch-text');
        const authSwitch = document.getElementById('auth-switch');
        const signupFields = document.querySelectorAll('.signup-only');

        if (!authTitle || !authSubmit || !authSwitchText || !authSwitch) return;

        const isSignIn = authTitle.textContent === 'Sign In';

        if (isSignIn) {
            authTitle.textContent = 'Sign Up';
            authSubmit.textContent = 'Sign Up';
            authSwitchText.textContent = 'Already have an account?';
            authSwitch.textContent = 'Sign In';
            signupFields.forEach(field => field.classList.remove('hidden'));
        } else {
            authTitle.textContent = 'Sign In';
            authSubmit.textContent = 'Sign In';
            authSwitchText.textContent = "Don't have an account?";
            authSwitch.textContent = 'Sign Up';
            signupFields.forEach(field => field.classList.add('hidden'));
        }
    }

    logout() {
        this.currentUser = null;
        this.updateUI();
        this.navigateToPage('home');
        this.showToast('Logged out successfully', 'success');
    }

    openJobModal() {
        const modal = document.getElementById('job-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    closeJobModal() {
        const modal = document.getElementById('job-modal');
        const form = document.getElementById('job-form');
        if (modal) {
            modal.classList.add('hidden');
        }
        if (form) {
            form.reset();
        }
    }

    handleJobPost(e) {
        e.preventDefault();
        const form = e.target;
        
        const jobData = {
            id: 'job_' + Date.now(),
            title: document.getElementById('job-title').value,
            institution: document.getElementById('job-institution').value,
            location: document.getElementById('job-location').value,
            departments: [document.getElementById('job-department').value],
            levels: [document.getElementById('job-level').value],
            description: document.getElementById('job-description').value,
            deadline: document.getElementById('job-deadline').value,
            salaryRange: document.getElementById('job-salary').value,
            applicationLink: document.getElementById('job-link').value,
            approved: this.currentUser?.role === 'EMPLOYER' ? true : null,
            active: true,
            postedBy: this.currentUser?.id,
            postedByName: this.currentUser?.name,
            createdAt: new Date().toISOString().split('T')[0],
            institutionType: 'University',
            image: null
        };

        this.jobs.unshift(jobData);
        this.closeJobModal();
        
        const message = this.currentUser?.role === 'EMPLOYER' ? 
            'Job posted successfully!' : 
            'Job submitted for review!';
        this.showToast(message, 'success');
        
        if (this.currentPage === 'jobs') {
            this.loadAllJobs();
        }
    }

    handleProfileUpdate(e) {
        e.preventDefault();
        if (!this.currentUser) return;

        this.currentUser.name = document.getElementById('profile-name').value;
        this.currentUser.email = document.getElementById('profile-email').value;
        this.currentUser.institution = document.getElementById('profile-institution').value;
        this.currentUser.bio = document.getElementById('profile-bio').value;

        this.showToast('Profile updated successfully!', 'success');
        this.updateUI();
    }

    handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Simulate file upload
        const reader = new FileReader();
        reader.onload = (event) => {
            const photoPreview = document.getElementById('photo-preview');
            if (photoPreview) {
                photoPreview.innerHTML = `<img src="${event.target.result}" alt="Profile photo">`;
            }
            
            if (this.currentUser) {
                this.currentUser.photo = event.target.result;
            }
            
            this.showToast('Photo uploaded successfully!', 'success');
        };
        reader.readAsDataURL(file);
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Remove toast after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }
}

// Initialize the application
const app = new FacultyJobsApp();

// Make app globally available for event handlers
window.app = app;
