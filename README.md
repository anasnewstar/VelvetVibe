# VelvetVibe - Image Gallery

A beautiful and interactive image gallery website with admin functionality and Firebase storage integration.

## Features

- Responsive image gallery with lightbox feature
- Image zoom and pan functionality in the lightbox
- Admin panel for managing images and ad links
- Firebase integration for cloud storage
- Mobile-optimized experience

## Firebase Setup

### 1. Create a Firebase Account and Project

1. Go to [firebase.google.com](https://firebase.google.com/) and sign in with a Google account
2. Click "Get Started" and then "Add project"
3. Enter a project name (e.g., "VelvetVibe")
4. Follow the prompts to create your project

### 2. Enable Firebase Services

1. In the Firebase console, go to your project
2. Enable Firestore Database:
   - Click "Firestore Database" in the left sidebar
   - Click "Create database"
   - Start in test mode (we'll update security rules later)
   - Choose a location close to your target audience
   - Click "Enable"

3. Enable Storage:
   - Click "Storage" in the left sidebar
   - Click "Get started"
   - Start in test mode
   - Choose a location close to your target audience
   - Click "Done"

### 3. Register Your Web App

1. In the Firebase console, click on the gear icon next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" and click the web icon (</>) 
4. Register your app with a nickname (e.g., "VelvetVibe Web")
5. Click "Register app"
6. You'll see your Firebase configuration settings - copy these

### 4. Update Your Firebase Configuration

1. Open the file `js/firebase-config.js` in your project
2. Replace the placeholder values with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 5. Configure CORS for Firebase Storage

Firebase Storage requires proper CORS configuration to work correctly:

1. Install the Firebase CLI tools:
   ```
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```
   firebase login
   ```

3. Create a `cors.json` file with the following content:
   ```json
   [
     {
       "origin": ["*"],
       "method": ["GET", "PUT", "POST", "DELETE"],
       "maxAgeSeconds": 3600
     }
   ]
   ```

4. Set the CORS configuration for your storage bucket:
   ```
   gsutil cors set cors.json gs://YOUR_STORAGE_BUCKET_NAME.appspot.com
   ```
   (Replace YOUR_STORAGE_BUCKET_NAME with your actual bucket name from the Firebase config)

### 6. Security Rules (For Production)

Before deploying to production, update your security rules:

1. In Firestore Database, go to the "Rules" tab and update:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read;
      allow write: if request.auth != null; // For authenticated users only
    }
  }
}
```

2. In Storage, go to the "Rules" tab and update:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read;
      allow write: if request.auth != null; // For authenticated users only
    }
  }
}
```

## Hosting on GitHub Pages

When hosting on GitHub Pages:

1. The admin key is set to "admin001" by default (you can change this in `js/script.js`)
2. Ensure you've properly set up Firebase as described above
3. All images will be stored in Firebase Cloud Storage, not localStorage
4. All visitors to your site will be able to see the same images

## Troubleshooting

### Common Issues

1. **"Firebase is not defined" error**:
   - Make sure the Firebase SDK scripts are properly loaded before your custom scripts
   - Check your internet connection
   - Try clearing your browser cache

2. **CORS errors in the console**:
   - Follow the CORS configuration steps in the Firebase Setup section
   - If running locally using a `file://` URL, use a local development server instead

3. **Images not appearing after upload**:
   - Check the Firebase Storage console to verify the image was uploaded
   - Check browser console for any errors during upload
   - Verify your Firebase Storage security rules allow read access

### Running Locally

Firebase doesn't work correctly when running from a local file system (`file://` URLs). To test locally:

1. **Use a simple HTTP server**:
   - With Node.js installed: `npx serve`
   - With Python installed: `python -m http.server 8000`
   - With PHP installed: `php -S localhost:8000`

2. **Use a development extension**:
   - For VS Code: Install "Live Server" extension
   - For Chrome: Install "Web Server for Chrome" extension

## Local Development

1. Clone this repository
2. Set up Firebase as described above
3. Use a local server to run the site (don't open the files directly in browser)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For any questions or support, please contact the developer.

---

**Note:** This website is designed to be used responsibly and in accordance with all applicable laws and regulations regarding online advertising and content display. 