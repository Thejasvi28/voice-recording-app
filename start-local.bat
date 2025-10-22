@echo off
echo Starting Voice Recording App with Local MongoDB...
echo.
set PORT=3000
set MONGODB_URI=mongodb://127.0.0.1:27017/voice-recording-app
set JWT_SECRET=your_jwt_secret_key_change_this_in_production

echo MongoDB URI: %MONGODB_URI%
echo Port: %PORT%
echo.
echo Starting server...
echo.

node server.js

