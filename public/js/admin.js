// Admin Dashboard JS (No Authentication Required)
const API_URL = '/api';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadUsers();
    loadAllRecordings();
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('admin-view-toggle')?.addEventListener('click', toggleAdminView);
    document.getElementById('create-user-btn')?.addEventListener('click', showCreateUserModal);
    document.querySelector('.close')?.addEventListener('click', closeModal);
    document.getElementById('cancel-user-btn')?.addEventListener('click', closeModal);
    document.getElementById('userForm')?.addEventListener('submit', handleUserFormSubmit);
}

// Toggle between users and recordings view
function toggleAdminView() {
    const usersSection = document.getElementById('users-section');
    const recordingsSection = document.getElementById('all-recordings-section');
    const toggleBtn = document.getElementById('admin-view-toggle');

    if (usersSection.style.display === 'none') {
        usersSection.style.display = 'block';
        recordingsSection.style.display = 'none';
        toggleBtn.textContent = 'View Recordings';
    } else {
        usersSection.style.display = 'none';
        recordingsSection.style.display = 'block';
        toggleBtn.textContent = 'View Users';
        loadAllRecordings();
    }
}

// Load all users (no auth - admin access)
async function loadUsers() {
    try {
        // Direct database query without auth (you'll need to create this endpoint)
        const response = await fetch(`${API_URL}/admin/users`);
        
        if (response.ok) {
            const users = await response.json();
            displayUsers(users);
        } else {
            showMessage('Failed to load users', 'error');
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        showMessage('Failed to load users', 'error');
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

// Load all recordings (no auth)
async function loadAllRecordings() {
    try {
        const response = await fetch(`${API_URL}/admin/recordings`);
        
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
                <audio controls src="${recording.cloudinaryUrl || `/uploads/${recording.filename}`}"></audio>
            </div>
        </div>
    `).join('');
}

// View user recordings
async function viewUserRecordings(userId, email) {
    try {
        const response = await fetch(`${API_URL}/admin/recordings/user/${userId}`);
        
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
    
    let tempDiv = content.querySelector('.temp-recordings');
    if (!tempDiv) {
        tempDiv = document.createElement('div');
        tempDiv.className = 'temp-recordings';
        content.appendChild(tempDiv);
    }
    tempDiv.innerHTML = recordingsHTML;
    
    modal.classList.add('show');
}

// Show create user modal
function showCreateUserModal() {
    const modal = document.getElementById('user-modal');
    const modalTitle = document.getElementById('modal-title');
    const userForm = document.getElementById('userForm');
    
    modalTitle.textContent = 'Create User';
    userForm.style.display = 'block';
    userForm.reset();
    userForm.dataset.mode = 'create';
    delete userForm.dataset.userId;
    
    const tempDiv = modal.querySelector('.temp-recordings');
    if (tempDiv) tempDiv.remove();
    
    modal.classList.add('show');
}

// Edit user
async function editUser(userId) {
    try {
        const response = await fetch(`${API_URL}/admin/users/${userId}`);
        
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
    
    const tempDiv = modal.querySelector('.temp-recordings');
    if (tempDiv) tempDiv.remove();
    
    modal.classList.add('show');
}

// Close modal
function closeModal() {
    const modal = document.getElementById('user-modal');
    modal.classList.remove('show');
    document.getElementById('userForm').reset();
    document.getElementById('modal-password').required = true;
    document.getElementById('userForm').style.display = 'block';
    
    const tempDiv = modal.querySelector('.temp-recordings');
    if (tempDiv) tempDiv.remove();
}

// Handle user form submit
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
            ? `${API_URL}/admin/users` 
            : `${API_URL}/admin/users/${userId}`;
        
        const method = mode === 'create' ? 'POST' : 'PUT';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
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

// Show message utility
function showMessage(message, type) {
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

