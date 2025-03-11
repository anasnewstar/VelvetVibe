// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyA1234567890abcdefghijklmnopqrstuv", // Replace with your actual Firebase API key
    authDomain: "velvetvibe.firebaseapp.com",           // Replace with your Firebase domain
    projectId: "velvetvibe",                            // Replace with your project ID
    storageBucket: "velvetvibe.appspot.com",            // Replace with your storage bucket
    messagingSenderId: "123456789012",                  // Replace with your messaging sender ID
    appId: "1:123456789012:web:abcdef1234567890"        // Replace with your app ID
};

// Firebase initialization status
let firebaseInitialized = false;
let initializationAttempted = false;

// Initialize Firebase with error handling
let app, db, storage;

// Create a function for lazy initialization
async function initializeFirebase() {
    // Don't try to initialize more than once
    if (initializationAttempted) {
        return firebaseInitialized;
    }

    initializationAttempted = true;
    console.log("Attempting to initialize Firebase...");

    try {
        // Check if Firebase SDK is loaded
        if (typeof firebase === 'undefined') {
            console.error("Firebase SDK not loaded");
            throw new Error("Firebase SDK not loaded");
        }

        // Initialize Firebase apps and services
        app = firebase.initializeApp(firebaseConfig);
        console.log("Firebase app initialized");

        // Initialize Firestore
        db = firebase.firestore();
        console.log("Firestore initialized");

        // Initialize Storage
        storage = firebase.storage();
        console.log("Firebase Storage initialized");

        // Set initialization flag
        firebaseInitialized = true;
        console.log("Firebase initialized successfully");

        return true;
    } catch (error) {
        console.error("Error initializing Firebase:", error);
        firebaseInitialized = false;
        return false;
    }
}

// Try to initialize Firebase when the script loads
initializeFirebase().catch(err => {
    console.error("Initial Firebase initialization failed:", err);
});

// Helper functions for handling images and ads
const firebaseStorage = {
    // Check if Firebase is properly initialized
    isInitialized: function () {
        return firebaseInitialized;
    },

    // Initialize Firebase if not already initialized
    init: async function () {
        if (!firebaseInitialized) {
            return await initializeFirebase();
        }
        return firebaseInitialized;
    },

    // Save an image to Firebase Storage and Firestore
    saveImage: async function (imageData, isUrl = false) {
        try {
            // Try to initialize Firebase if not already initialized
            if (!await this.init()) {
                throw new Error("Firebase not initialized");
            }

            let imageUrl;

            if (isUrl) {
                // If it's already a URL (not from device), just store the reference
                imageUrl = imageData;
            } else {
                // For uploaded images, store them in Firebase Storage
                // Generate a unique filename
                const filename = `images/${new Date().getTime()}-${Math.random().toString(36).substring(2, 15)}`;
                const storageRef = storage.ref().child(filename);

                // Upload the image (base64 data)
                await storageRef.putString(imageData, 'data_url');

                // Get the download URL
                imageUrl = await storageRef.getDownloadURL();
            }

            // Add record to Firestore
            await db.collection('images').add({
                src: imageUrl,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return { success: true, url: imageUrl };
        } catch (error) {
            console.error("Error saving image to Firebase:", error);
            return { success: false, error: error.message };
        }
    },

    // Get all images from Firestore
    getImages: async function () {
        try {
            // Try to initialize Firebase if not already initialized
            if (!await this.init()) {
                throw new Error("Firebase not initialized");
            }

            const snapshot = await db.collection('images')
                .orderBy('createdAt', 'desc')
                .get();

            const images = [];
            snapshot.forEach(doc => {
                images.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return { success: true, images };
        } catch (error) {
            console.error("Error getting images from Firebase:", error);
            return { success: false, error: error.message };
        }
    },

    // Delete an image from Firebase Storage and Firestore
    deleteImage: async function (imageId) {
        try {
            // Try to initialize Firebase if not already initialized
            if (!await this.init()) {
                throw new Error("Firebase not initialized");
            }

            // Get the image document
            const imageDoc = await db.collection('images').doc(imageId).get();

            if (!imageDoc.exists) {
                throw new Error("Image not found");
            }

            const imageData = imageDoc.data();

            // If the image is stored in Firebase Storage (not an external URL)
            if (imageData.src.includes('firebasestorage.googleapis.com')) {
                // Create a reference to the image in storage
                const storageRef = storage.refFromURL(imageData.src);

                // Delete the image from storage
                await storageRef.delete();
            }

            // Delete the document from Firestore
            await db.collection('images').doc(imageId).delete();

            return { success: true };
        } catch (error) {
            console.error("Error deleting image from Firebase:", error);
            return { success: false, error: error.message };
        }
    },

    // Ad links management
    saveAdLinks: async function (adLinks) {
        try {
            // Try to initialize Firebase if not already initialized
            if (!await this.init()) {
                throw new Error("Firebase not initialized");
            }

            // Update or create the ad links document
            await db.collection('settings').doc('adSettings').set({
                links: adLinks,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            return { success: true };
        } catch (error) {
            console.error("Error saving ad links to Firebase:", error);
            return { success: false, error: error.message };
        }
    },

    // Get ad links from Firestore
    getAdLinks: async function () {
        try {
            // Try to initialize Firebase if not already initialized
            if (!await this.init()) {
                throw new Error("Firebase not initialized");
            }

            const doc = await db.collection('settings').doc('adSettings').get();

            if (doc.exists) {
                return { success: true, adLinks: doc.data().links || [] };
            } else {
                // If document doesn't exist, return empty array
                return { success: true, adLinks: [] };
            }
        } catch (error) {
            console.error("Error getting ad links from Firebase:", error);
            return { success: false, error: error.message };
        }
    },

    // Save ad frequency
    saveAdFrequency: async function (frequency) {
        try {
            // Try to initialize Firebase if not already initialized
            if (!await this.init()) {
                throw new Error("Firebase not initialized");
            }

            await db.collection('settings').doc('adSettings').set({
                frequency: frequency,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            return { success: true };
        } catch (error) {
            console.error("Error saving ad frequency to Firebase:", error);
            return { success: false, error: error.message };
        }
    },

    // Get ad frequency
    getAdFrequency: async function () {
        try {
            // Try to initialize Firebase if not already initialized
            if (!await this.init()) {
                throw new Error("Firebase not initialized");
            }

            const doc = await db.collection('settings').doc('adSettings').get();

            if (doc.exists && doc.data().frequency) {
                return { success: true, frequency: doc.data().frequency };
            } else {
                // Default to 30 seconds
                return { success: true, frequency: 30000 };
            }
        } catch (error) {
            console.error("Error getting ad frequency from Firebase:", error);
            return { success: false, error: error.message };
        }
    }
}; 