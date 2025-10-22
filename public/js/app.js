// API Base URL
const API_URL = '/api';

// Current user state
let currentUser = null;
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let timerInterval = null;
let recordedBlob = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

// Check authentication status
async function checkAuth() {
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            showDashboard();
        } else {
            showAuthPage();
        }
    } catch (error) {
        showAuthPage();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Auth page
    document.getElementById('show-register')?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthForms('register');
    });

    document.getElementById('show-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthForms('login');
    });

    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);

    // User page
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    document.getElementById('start-recording')?.addEventListener('click', () => startRecording('user'));
    document.getElementById('stop-recording')?.addEventListener('click', () => stopRecording('user'));
    document.getElementById('submit-recording')?.addEventListener('click', () => submitRecording('user'));

    // Admin page
    document.getElementById('admin-logout-btn')?.addEventListener('click', handleLogout);
    document.getElementById('admin-view-toggle')?.addEventListener('click', toggleAdminView);
    document.getElementById('create-user-btn')?.addEventListener('click', showCreateUserModal);
    document.getElementById('admin-start-recording')?.addEventListener('click', () => startRecording('admin'));
    document.getElementById('admin-stop-recording')?.addEventListener('click', () => stopRecording('admin'));
    document.getElementById('admin-submit-recording')?.addEventListener('click', () => submitRecording('admin'));

    // Modal
    document.querySelector('.close')?.addEventListener('click', closeModal);
    document.getElementById('cancel-user-btn')?.addEventListener('click', closeModal);
    document.getElementById('userForm')?.addEventListener('submit', handleUserFormSubmit);
}

// Toggle between login and register forms
function toggleAuthForms(form) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (form === 'register') {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
    } else {
        registerForm.classList.remove('active');
        loginForm.classList.add('active');
    }
}

// Show/hide pages
function showAuthPage() {
    document.getElementById('auth-page').classList.add('active');
    document.getElementById('user-page').classList.remove('active');
    document.getElementById('admin-page').classList.remove('active');
}

function showDashboard() {
    document.getElementById('auth-page').classList.remove('active');
    
    if (currentUser.isAdmin) {
        document.getElementById('admin-page').classList.add('active');
        document.getElementById('user-page').classList.remove('active');
        document.getElementById('admin-email').textContent = currentUser.email;
        loadAllRecordings();
        loadUsers();
    } else {
        document.getElementById('user-page').classList.add('active');
        document.getElementById('admin-page').classList.remove('active');
        document.getElementById('user-email').textContent = currentUser.email;
        loadUserRecordings();
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            showMessage('Login successful!', 'success');
            showDashboard();
        } else {
            showMessage(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

// Handle register
async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;

    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Registration successful! Please login.', 'success');
            toggleAuthForms('login');
            document.getElementById('registerForm').reset();
        } else {
            showMessage(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

// Handle logout
async function handleLogout() {
    try {
        await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        currentUser = null;
        showAuthPage();
        showMessage('Logged out successfully', 'success');
    } catch (error) {
        showMessage('Logout failed', 'error');
    }
}

// Voice Recording Functions
async function startRecording(context) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        recordedBlob = null;

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            recordedBlob = new Blob(audioChunks, { type: 'audio/webm' });
            displayAudioPreview(context, recordedBlob);
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        recordingStartTime = Date.now();
        startTimer(context);
        updateRecordingUI(context, 'recording');
        showStatusMessage(context, 'Recording...', 'info');
    } catch (error) {
        showStatusMessage(context, 'Microphone access denied', 'error');
    }
}

function stopRecording(context) {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        stopTimer(context);
        updateRecordingUI(context, 'stopped');
        showStatusMessage(context, 'Recording stopped. You can now submit.', 'success');
    }
}

async function submitRecording(context) {
    if (!recordedBlob) {
        showStatusMessage(context, 'No recording to submit', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('audio', recordedBlob, 'recording.webm');
    formData.append('duration', Math.floor((Date.now() - recordingStartTime) / 1000));

    try {
        const response = await fetch(`${API_URL}/recordings/upload`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showStatusMessage(context, 'Recording submitted successfully!', 'success');
            recordedBlob = null;
            audioChunks = [];
            clearAudioPreview(context);
            updateRecordingUI(context, 'initial');
            
            // Reload recordings
            if (context === 'admin') {
                loadAllRecordings();
            } else {
                loadUserRecordings();
            }
        } else {
            showStatusMessage(context, data.message || 'Submission failed', 'error');
        }
    } catch (error) {
        showStatusMessage(context, 'Network error. Please try again.', 'error');
    }
}

function startTimer(context) {
    const timerElement = document.getElementById(context === 'admin' ? 'admin-recording-timer' : 'recording-timer');
    timerElement.classList.add('recording');
    
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

function stopTimer(context) {
    clearInterval(timerInterval);
    const timerElement = document.getElementById(context === 'admin' ? 'admin-recording-timer' : 'recording-timer');
    timerElement.classList.remove('recording');
}

function updateRecordingUI(context, state) {
    const prefix = context === 'admin' ? 'admin-' : '';
    const startBtn = document.getElementById(`${prefix}start-recording`);
    const stopBtn = document.getElementById(`${prefix}stop-recording`);
    const submitBtn = document.getElementById(`${prefix}submit-recording`);

    if (state === 'recording') {
        startBtn.disabled = true;
        stopBtn.disabled = false;
        submitBtn.disabled = true;
    } else if (state === 'stopped') {
        startBtn.disabled = false;
        stopBtn.disabled = true;
        submitBtn.disabled = false;
    } else {
        startBtn.disabled = false;
        stopBtn.disabled = true;
        submitBtn.disabled = true;
    }
}

function displayAudioPreview(context, blob) {
    const previewElement = document.getElementById(context === 'admin' ? 'admin-audio-preview' : 'audio-preview');
    const url = URL.createObjectURL(blob);
    previewElement.innerHTML = `
        <p style="margin-bottom: 0.5rem; color: var(--text-secondary);">Preview:</p>
        <audio controls src="${url}"></audio>
    `;
}

function clearAudioPreview(context) {
    const previewElement = document.getElementById(context === 'admin' ? 'admin-audio-preview' : 'audio-preview');
    previewElement.innerHTML = '';
}

// Load user recordings
async function loadUserRecordings() {
    try {
        const response = await fetch(`${API_URL}/recordings/my-recordings`, {
            credentials: 'include'
        });

        if (response.ok) {
            const recordings = await response.json();
            displayUserRecordings(recordings);
        }
    } catch (error) {
        console.error('Failed to load recordings:', error);
    }
}

function displayUserRecordings(recordings) {
    const listElement = document.getElementById('user-recordings-list');
    
    if (recordings.length === 0) {
        listElement.innerHTML = '<div class="empty-state"><p>No recordings yet</p><p style="font-size: 0.9rem;">Start recording to see your submissions here</p></div>';
        return;
    }

    listElement.innerHTML = recordings.map(recording => `
        <div class="recording-item">
            <div class="recording-info">
                <h4>Recording</h4>
                <p>Date: ${new Date(recording.createdAt).toLocaleString()}</p>
                <p>Size: ${(recording.size / 1024).toFixed(2)} KB</p>
                ${recording.duration ? `<p>Duration: ${recording.duration}s</p>` : ''}
            </div>
            <div class="recording-actions">
                <audio controls src="/uploads/${recording.filename}"></audio>
            </div>
        </div>
    `).join('');
}

// Admin Functions
function toggleAdminView() {
    const usersSection = document.getElementById('users-section');
    const recordingsSection = document.getElementById('all-recordings-section');
    const toggleBtn = document.getElementById('admin-view-toggle');
    const recordingSection = document.getElementById('admin-recording-section');

    if (usersSection.style.display === 'none') {
        usersSection.style.display = 'block';
        recordingsSection.style.display = 'none';
        recordingSection.style.display = 'none';
        toggleBtn.textContent = 'View Recordings';
    } else {
        usersSection.style.display = 'none';
        recordingsSection.style.display = 'block';
        recordingSection.style.display = 'block';
        toggleBtn.textContent = 'View Users';
    }
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/users`, {
            credentials: 'include'
        });

        if (response.ok) {
            const users = await response.json();
            displayUsers(users);
        }
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

function displayUsers(users) {
    const listElement = document.getElementById('users-list');
    
    if (users.length === 0) {
        listElement.innerHTML = '<div class="empty-state"><p>No users yet</p></div>';
        return;
    }

    listElement.innerHTML = users.map(user => `
        <div class="user-item">
            <div class="user-info">
                <h4>${user.email}</h4>
                <p>Joined: ${new Date(user.createdAt).toLocaleString()}</p>
                <span class="badge ${user.isAdmin ? 'badge-admin' : 'badge-user'}">
                    ${user.isAdmin ? 'Admin' : 'User'}
                </span>
            </div>
            <div class="user-actions">
                <button class="btn btn-primary" onclick="viewUserRecordings('${user._id}', '${user.email}')">
                    View Recordings
                </button>
                <button class="btn btn-secondary" onclick="editUser('${user._id}')">
                    Edit
                </button>
            </div>
        </div>
    `).join('');
}

async function loadAllRecordings() {
    try {
        const response = await fetch(`${API_URL}/recordings/all`, {
            credentials: 'include'
        });

        if (response.ok) {
            const recordings = await response.json();
            displayAllRecordings(recordings);
        }
    } catch (error) {
        console.error('Failed to load recordings:', error);
    }
}

function displayAllRecordings(recordings) {
    const listElement = document.getElementById('all-recordings-list');
    
    if (recordings.length === 0) {
        listElement.innerHTML = '<div class="empty-state"><p>No recordings yet</p></div>';
        return;
    }

    listElement.innerHTML = recordings.map(recording => `
        <div class="recording-item">
            <div class="recording-info">
                <h4>Recording by ${recording.userId?.email || 'Unknown'}</h4>
                <p>Date: ${new Date(recording.createdAt).toLocaleString()}</p>
                <p>Size: ${(recording.size / 1024).toFixed(2)} KB</p>
                ${recording.duration ? `<p>Duration: ${recording.duration}s</p>` : ''}
            </div>
            <div class="recording-actions">
                <audio controls src="/uploads/${recording.filename}"></audio>
            </div>
        </div>
    `).join('');
}

async function viewUserRecordings(userId, email) {
    try {
        const response = await fetch(`${API_URL}/recordings/user/${userId}`, {
            credentials: 'include'
        });

        if (response.ok) {
            const recordings = await response.json();
            showUserRecordingsModal(email, recordings);
        }
    } catch (error) {
        console.error('Failed to load user recordings:', error);
    }
}

function showUserRecordingsModal(email, recordings) {
    const modal = document.getElementById('user-modal');
    const modalTitle = document.getElementById('modal-title');
    const userForm = document.getElementById('userForm');
    
    modalTitle.textContent = `Recordings by ${email}`;
    userForm.style.display = 'none';
    
    const content = modal.querySelector('.modal-content');
    let recordingsHTML = '<div style="margin-top: 1rem;">';
    
    if (recordings.length === 0) {
        recordingsHTML += '<p style="color: var(--text-secondary);">No recordings yet</p>';
    } else {
        recordingsHTML += recordings.map(recording => `
            <div style="margin-bottom: 1rem; padding: 1rem; background: var(--background); border-radius: 6px;">
                <p style="margin-bottom: 0.5rem;">Date: ${new Date(recording.createdAt).toLocaleString()}</p>
                <audio controls src="/uploads/${recording.filename}" style="width: 100%;"></audio>
            </div>
        `).join('');
    }
    
    recordingsHTML += '</div>';
    
    // Add temporary content
    let tempDiv = content.querySelector('.temp-recordings');
    if (!tempDiv) {
        tempDiv = document.createElement('div');
        tempDiv.className = 'temp-recordings';
        content.appendChild(tempDiv);
    }
    tempDiv.innerHTML = recordingsHTML;
    
    modal.classList.add('show');
}

function showCreateUserModal() {
    const modal = document.getElementById('user-modal');
    const modalTitle = document.getElementById('modal-title');
    const userForm = document.getElementById('userForm');
    
    modalTitle.textContent = 'Create User';
    userForm.style.display = 'block';
    userForm.reset();
    userForm.dataset.mode = 'create';
    delete userForm.dataset.userId;
    
    // Remove temp content if exists
    const tempDiv = modal.querySelector('.temp-recordings');
    if (tempDiv) tempDiv.remove();
    
    modal.classList.add('show');
}

async function editUser(userId) {
    try {
        const response = await fetch(`${API_URL}/users/${userId}`, {
            credentials: 'include'
        });

        if (response.ok) {
            const user = await response.json();
            showEditUserModal(user);
        }
    } catch (error) {
        console.error('Failed to load user:', error);
    }
}

function showEditUserModal(user) {
    const modal = document.getElementById('user-modal');
    const modalTitle = document.getElementById('modal-title');
    const userForm = document.getElementById('userForm');
    
    modalTitle.textContent = 'Edit User';
    userForm.style.display = 'block';
    userForm.dataset.mode = 'edit';
    userForm.dataset.userId = user._id;
    
    document.getElementById('modal-email').value = user.email;
    document.getElementById('modal-password').value = '';
    document.getElementById('modal-password').required = false;
    document.getElementById('modal-isAdmin').checked = user.isAdmin;
    
    // Remove temp content if exists
    const tempDiv = modal.querySelector('.temp-recordings');
    if (tempDiv) tempDiv.remove();
    
    modal.classList.add('show');
}

function closeModal() {
    const modal = document.getElementById('user-modal');
    modal.classList.remove('show');
    document.getElementById('userForm').reset();
    document.getElementById('modal-password').required = true;
    document.getElementById('userForm').style.display = 'block';
    
    // Remove temp content if exists
    const tempDiv = modal.querySelector('.temp-recordings');
    if (tempDiv) tempDiv.remove();
}

async function handleUserFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const mode = form.dataset.mode;
    const userId = form.dataset.userId;
    
    const email = document.getElementById('modal-email').value;
    const password = document.getElementById('modal-password').value;
    const isAdmin = document.getElementById('modal-isAdmin').checked;

    const body = { email, isAdmin };
    if (password) body.password = password;

    try {
        const url = mode === 'create' 
            ? `${API_URL}/users` 
            : `${API_URL}/users/${userId}`;
        
        const method = mode === 'create' ? 'POST' : 'PUT';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(data.message, 'success');
            closeModal();
            loadUsers();
        } else {
            showMessage(data.message || 'Operation failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

// Utility function to show messages
function showMessage(message, type) {
    // Create a temporary toast notification
    const toast = document.createElement('div');
    toast.className = `status-message ${type} show`;
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '10000';
    toast.style.minWidth = '250px';
    toast.style.animation = 'slideIn 0.3s';
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showStatusMessage(context, message, type) {
    const statusElement = document.getElementById(context === 'admin' ? 'admin-recording-status' : 'recording-status');
    statusElement.textContent = message;
    statusElement.className = `status-message ${type} show`;
    
    setTimeout(() => {
        statusElement.classList.remove('show');
    }, 5000);
}

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);

