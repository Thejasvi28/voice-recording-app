# Voice Recording App

A full-stack voice recording application with user authentication and admin panel.

## Features

### User Features
- User registration and login with email/password
- Voice recording using browser microphone
- Submit and view own recordings
- Audio playback of recordings

### Admin Features
- All user features
- View all users and their recordings
- Create new users
- Update existing users (CRU - Create, Read, Update)
- View all recordings from all users

## Tech Stack

- **Backend**: Node.js with Express
- **Database**: MongoDB
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer

## Installation

1. **Clone the repository**
```bash
cd voice-recording-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
Create a `.env` file in the root directory (use `.env.example` as template):
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/voice-recording-app
JWT_SECRET=your_jwt_secret_key_change_this_in_production
```

4. **Start MongoDB**
Make sure MongoDB is running on your system:
```bash
# Windows (if installed as service)
net start MongoDB

# macOS (using Homebrew)
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod
```

5. **Run the application**
```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
```

6. **Access the application**
Open your browser and navigate to:
```
http://localhost:3000
```

## Default Admin Account

When the application starts for the first time, a default admin account is created:

- **Email**: admin@example.com
- **Password**: admin123

**Important**: Change these credentials after first login!

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Users (Admin only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user

### Recordings
- `POST /api/recordings/upload` - Upload a recording (authenticated users)
- `GET /api/recordings/my-recordings` - Get own recordings
- `GET /api/recordings/all` - Get all recordings (admin only)
- `GET /api/recordings/user/:userId` - Get recordings by user ID (admin only)

## Project Structure

```
voice-recording-app/
├── models/              # Database models
│   ├── User.js
│   └── Recording.js
├── routes/              # API routes
│   ├── auth.js
│   ├── users.js
│   └── recordings.js
├── middleware/          # Custom middleware
│   └── auth.js
├── public/              # Frontend files
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── app.js
├── uploads/             # Uploaded recordings (created automatically)
├── server.js            # Main server file
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Usage

### For Regular Users
1. Register a new account or login
2. Click "Start Recording" to begin recording
3. Click "Stop Recording" when finished
4. Preview your recording
5. Click "Submit Recording" to save it
6. View all your recordings in the "My Recordings" section

### For Admins
1. Login with admin credentials
2. Toggle between "View Users" and "View Recordings"
3. Create new users using the "Create New User" button
4. Edit existing users
5. View recordings of specific users
6. Record and submit your own recordings

## Browser Compatibility

The application requires a modern browser with support for:
- MediaRecorder API
- getUserMedia API
- ES6+ JavaScript

Recommended browsers:
- Chrome 60+
- Firefox 55+
- Edge 79+
- Safari 14+

## Security Notes

1. Change the default JWT_SECRET in production
2. Use HTTPS in production
3. Implement rate limiting for API endpoints
4. Add password strength requirements
5. Implement email verification for registration
6. Add CSRF protection
7. Sanitize user inputs

## Deployment to Vercel

### Quick Deploy

See [deploy-vercel.md](deploy-vercel.md) for detailed deployment instructions.

**Prerequisites:**
1. MongoDB Atlas account (free tier available)
2. Vercel account (free)

**Quick Steps:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Add environment variables
vercel env add MONGODB_URI
vercel env add JWT_SECRET

# Deploy to production
vercel --prod
```

**Important Notes:**
- ⚠️ Use MongoDB Atlas (cloud database) - local MongoDB won't work on Vercel
- ⚠️ Audio files are ephemeral on Vercel - use Cloudinary/S3 for production
- See [DEPLOYMENT.md](DEPLOYMENT.md) for full documentation

## License

ISC

