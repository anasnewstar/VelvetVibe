// Add debug information
console.log("========== Loading script.js ==========");
console.log("Current location:", window.location.href);
console.log("Checking for picture folder...");

// Check if we can access the picture folder
const testImage = new Image();
testImage.onload = function () {
    console.log("✅ Successfully accessed test image in picture folder!");
};
testImage.onerror = function () {
    console.warn("⚠️ Could not access test image in picture folder. Make sure the folder exists and has proper permissions.");
};
testImage.src = "picture/test.png";  // This is just a test, it doesn't need to exist

// Global functions for admin modal
function openAdminModal(e) {
    console.log("openAdminModal called");
    if (e) e.preventDefault();

    const adminModal = document.getElementById('admin-modal');
    if (adminModal) {
        console.log("Opening admin modal");
        adminModal.style.display = 'block';
    } else {
        console.error("Admin modal element not found");
        alert("Admin panel is not available. Please try again later.");
    }
    return false;
}

function closeAdminModal() {
    console.log("closeAdminModal called");
    const adminModal = document.getElementById('admin-modal');
    if (adminModal) {
        adminModal.style.display = 'none';
    }
    return false;
}

// Global variables
let adLinks = []; // Will be populated from storage or default values
let adFrequency = 30000; // 30 seconds by default
let adInterval;
let adminKey = 'admin001'; // Hard-coded admin key
let adTabsOpened = false; // Track if initial ads have been opened
let migrationAttempted = false; // Track if migration has been attempted

// Lightbox variables
let currentZoom = 1; // Current zoom level
let isDragging = false; // Is the user dragging the image
let startX, startY, translateX = 0, translateY = 0;
let dragOffsetX = 0;
let dragOffsetY = 0;

// Check for local file access issues
const isLocalFileAccess = window.location.protocol === 'file:';
if (isLocalFileAccess) {
    console.warn("Running from local file system (file://) - Firebase may not work correctly. Consider using a local server instead.");
    // We'll display a warning in the UI later
}

// DOM Elements
const imageGrid = document.getElementById('image-grid');
const adminLink = document.getElementById('admin-link');
const adminModal = document.getElementById('admin-modal');
const closeBtn = document.querySelector('.close');
const loginBtn = document.getElementById('login-btn');
const adminKeyInput = document.getElementById('admin-key');
const lightbox = document.getElementById('image-lightbox');
const lightboxImg = document.getElementById('lightbox-image');
const lightboxClose = document.querySelector('.lightbox-close');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomResetBtn = document.getElementById('zoom-reset');

// Performance optimization - Defer non-critical operations
document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM fully loaded - initializing essential features first");

    // Initialize only critical features immediately
    setupEssentialEventListeners();
    loadImagesWithPriority();

    // Defer non-critical operations
    setTimeout(() => {
        console.log("Loading non-critical features");
        setupRemainingEventListeners();
        registerBeforeUnloadEvent();

        // Delay ad loading to improve initial page speed
        setTimeout(openInitialAds, 2000);
    }, 500);
});

// Initialize only the essential event listeners for a faster initial load
function setupEssentialEventListeners() {
    console.log("Setting up essential event listeners");

    // Set up admin link
    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        adminLink.addEventListener('click', openAdminModal);
    }

    // Set up admin modal close button
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeAdminModal);
    }

    // Set up lightbox close button
    const closeLightboxBtn = document.querySelector('.close-lightbox');
    if (closeLightboxBtn) {
        closeLightboxBtn.addEventListener('click', closeLightbox);
    }
}

// Setup remaining non-critical event listeners
function setupRemainingEventListeners() {
    console.log("Setting up remaining event listeners");

    // Set up admin login button
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', validateAdminKey);
    }

    // Set up admin key input field to listen for Enter key
    const adminKeyInput = document.getElementById('admin-key');
    if (adminKeyInput) {
        adminKeyInput.addEventListener('keyup', function (event) {
            if (event.key === 'Enter') {
                validateAdminKey();
            }
        });
    }

    // Set up zoom buttons
    const zoomInBtn = document.querySelector('.zoom-in');
    const zoomOutBtn = document.querySelector('.zoom-out');
    const zoomResetBtn = document.querySelector('.zoom-reset');

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', zoomIn);
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', zoomOut);
    }

    if (zoomResetBtn) {
        zoomResetBtn.addEventListener('click', resetZoomAndPosition);
    }

    // Start ad timer
    startAdTimer();
}

// Original setupEventListeners function kept for compatibility
function setupEventListeners() {
    console.log("Legacy setupEventListeners function called");
    setupEssentialEventListeners();
    setupRemainingEventListeners();
}

// Optimized image loading with proper prioritization
function loadImagesWithPriority() {
    console.log("Loading images with priority optimization");

    // Get the image grid
    const imageGrid = document.getElementById('image-grid');
    if (!imageGrid) {
        console.error("Image grid not found");
        return;
    }

    // Clear the image grid first
    while (imageGrid.firstChild) {
        imageGrid.removeChild(imageGrid.firstChild);
    }

    // Show loading message
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'placeholder-message';
    loadingMessage.textContent = 'Loading images...';
    imageGrid.appendChild(loadingMessage);

    // Array to store all images
    let allImages = [];

    // Set to track unique image URLs and prevent duplicates
    const uniqueImageUrls = new Set();

    // Helper function to add images without duplicates
    const addUniqueImages = (images, source) => {
        if (!images || !Array.isArray(images)) return 0;

        let addedCount = 0;
        images.forEach(image => {
            // Determine the image URL regardless of the image format
            let imageUrl = null;
            if (image.url) {
                imageUrl = image.url;
            } else if (image.src) {
                imageUrl = image.src;
            } else if (typeof image === 'string') {
                imageUrl = image;
            }

            // Only add if we have a valid URL and it's not already in our set
            if (imageUrl && !uniqueImageUrls.has(imageUrl)) {
                uniqueImageUrls.add(imageUrl);
                allImages.push(image);
                addedCount++;
            }
        });

        return addedCount;
    };

    // Priority loading - first focus on critical visible content

    // 1. Try to get images from localStorage (fastest)
    try {
        const storedImages = localStorage.getItem('images');
        if (storedImages) {
            const parsedImages = JSON.parse(storedImages);
            if (parsedImages && Array.isArray(parsedImages)) {
                const added = addUniqueImages(parsedImages, 'localStorage');
                console.log(`Loaded ${added} images from localStorage`);

                // If we have images from localStorage, show them immediately
                if (added > 0) {
                    if (loadingMessage.parentNode) {
                        imageGrid.removeChild(loadingMessage);
                    }
                    displayImages(allImages);

                    // Update message but only add it if we're still waiting for more images
                    if (added < 5) {
                        loadingMessage.textContent = 'Loading more images...';
                        imageGrid.appendChild(loadingMessage);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error loading images from localStorage:", error);
    }

    // 2. Next, check for high-priority preloaded images (fastest from picture folder)
    const priorityFiles = ['1.jpg', '2.jpg', '3.jpg', 'image1.jpg', 'photo1.jpg'];

    Promise.all(priorityFiles.map(filename => {
        return new Promise(resolve => {
            const img = new Image();
            const imageUrl = `picture/${filename}`;

            // Skip if we've already processed this URL
            if (uniqueImageUrls.has(imageUrl)) {
                resolve();
                return;
            }

            img.onload = () => {
                console.log(`Found priority image: ${imageUrl}`);

                // Create an image object
                const imageId = `picture_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const newImage = {
                    id: imageId,
                    url: imageUrl,
                    timestamp: Date.now(),
                    source: 'picture_folder'
                };

                // Add to our collection
                if (!uniqueImageUrls.has(imageUrl)) {
                    uniqueImageUrls.add(imageUrl);
                    allImages.push(newImage);

                    // Update display immediately for each found priority image
                    if (loadingMessage.parentNode) {
                        imageGrid.removeChild(loadingMessage);
                    }
                    displayImages(allImages);

                    // Add loading message back only if still finding images
                    if (allImages.length < 8) {
                        loadingMessage.textContent = 'Loading more images...';
                        imageGrid.appendChild(loadingMessage);
                    }
                }
                resolve();
            };

            img.onerror = () => {
                resolve();
            };

            // Add cache buster for GitHub Pages
            img.src = `${imageUrl}?_=${Date.now()}`;
        });
    }))
        .then(() => {
            // After priority images are processed, load the rest in the background
            setTimeout(() => {
                // 3. Load remaining images without blocking the UI
                Promise.all([
                    loadImagesFromPictureFolder(),
                    tryLoadImagesAlternateMethod()
                ])
                    .then(([folderImages, alternateImages]) => {
                        const primaryAdded = addUniqueImages(folderImages, 'picture folder');
                        const alternateAdded = addUniqueImages(alternateImages, 'alternate method');

                        // If we found new images, update the display
                        if (primaryAdded + alternateAdded > 0) {
                            // Sort by timestamp, newest first
                            allImages.sort((a, b) => {
                                const timestampA = a.timestamp || 0;
                                const timestampB = b.timestamp || 0;
                                return timestampB - timestampA;
                            });

                            // Remove loading message
                            if (loadingMessage.parentNode) {
                                imageGrid.removeChild(loadingMessage);
                            }

                            // Display all images
                            displayImages(allImages);
                            console.log(`Now displaying ${allImages.length} total images`);
                        } else if (allImages.length === 0) {
                            // No images found at all
                            loadingMessage.textContent = 'No images found. Add images through the admin panel or place them in the "picture" folder.';
                        } else if (loadingMessage.parentNode) {
                            // We had some images but no new ones - remove loading message
                            imageGrid.removeChild(loadingMessage);
                        }
                    });
            }, 100); // Small delay to let priority images display first
        });
}

// Keep the original function for compatibility, but make it call the optimized version
function loadImagesFromLocalStorage() {
    console.log("Legacy loadImagesFromLocalStorage called - using optimized version");
    loadImagesWithPriority();
}

// Display images in the grid
function displayImages(images) {
    console.log(`Displaying ${images ? images.length : 0} images`);

    // Get the image grid
    const imageGrid = document.getElementById('image-grid');
    if (!imageGrid) {
        console.error("Image grid not found");
        return;
    }

    // Clear the grid first
    while (imageGrid.firstChild) {
        imageGrid.removeChild(imageGrid.firstChild);
    }

    // If no images, show a message
    if (!images || images.length === 0) {
        const noImagesMessage = document.createElement('div');
        noImagesMessage.className = 'placeholder-message';
        noImagesMessage.textContent = 'No images to display. Add images in the admin panel or place them in the "picture" folder.';
        imageGrid.appendChild(noImagesMessage);
        return;
    }

    // Track any URLs we've already displayed to prevent duplicates
    const displayedUrls = new Set();
    let duplicateCount = 0;

    // Display each image
    images.forEach((image, index) => {
        try {
            // Handle different image formats
            let imgSrc = '';
            if (image.url) {
                // New format from picture folder
                imgSrc = image.url;
            } else if (image.src) {
                // Old format
                imgSrc = image.src;
            } else if (typeof image === 'string') {
                // Just a URL string
                imgSrc = image;
            } else {
                console.error(`Unknown image format at index ${index}:`, image);
                return; // Skip this image
            }

            // Skip if we've already displayed this image URL
            if (displayedUrls.has(imgSrc)) {
                console.log(`Skipping duplicate image: ${imgSrc}`);
                duplicateCount++;
                return;
            }

            // Mark this URL as displayed
            displayedUrls.add(imgSrc);

            // Create image container
            const imgContainer = document.createElement('div');
            imgContainer.className = 'image-container';

            // Create image element
            const img = document.createElement('img');
            img.src = imgSrc;
            img.alt = image.alt || `Gallery Image ${index + 1}`;
            img.loading = 'lazy';

            // Add error handling
            img.onerror = function () {
                console.error(`Failed to load image: ${imgSrc}`);
                this.src = 'Placeholder Images (for initial setup).png';
                this.alt = 'Image failed to load';
            };

            // Add click event to open lightbox
            img.addEventListener('click', function () {
                openLightbox(imgSrc);
            });

            // Add image to container
            imgContainer.appendChild(img);

            // Add container to grid
            imageGrid.appendChild(imgContainer);
        } catch (error) {
            console.error(`Error displaying image at index ${index}:`, error);
        }
    });

    // Add interaction event listeners to all images
    const allImages = imageGrid.querySelectorAll('img');
    allImages.forEach(img => {
        img.addEventListener('click', tryOpenAdOnInteraction);
    });

    if (duplicateCount > 0) {
        console.log(`Skipped ${duplicateCount} duplicate images`);
    }

    console.log(`Displayed ${displayedUrls.size} unique images in the grid`);
}

// Open lightbox with selected image
function openLightbox(imgSrc) {
    console.log(`Opening lightbox for image: ${imgSrc}`);

    // Find lightbox elements
    const lightbox = document.getElementById('image-lightbox');
    const lightboxImg = document.getElementById('lightbox-image');

    if (!lightbox || !lightboxImg) {
        console.error("Lightbox elements not found");
        return;
    }

    try {
        // Reset zoom and position
        resetZoomAndPosition();

        // Set image source
        lightboxImg.src = imgSrc;

        // Show lightbox with fade in
        lightbox.classList.add('active');

        // Set up drag and zoom functionality
        setupLightboxInteractivity(lightboxImg);

        // Add keyboard listener for Escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                closeLightbox();
            }
        });

        console.log("Lightbox opened successfully");
    } catch (error) {
        console.error("Error opening lightbox:", error);
    }
}

// Set up drag and zoom event listeners for the lightbox
function setupLightboxInteractivity(lightboxImg) {
    // Mouse drag events
    lightboxImg.onmousedown = startDrag;

    // Touch events for mobile
    lightboxImg.ontouchstart = startDrag;

    // Mouse wheel zoom
    lightboxImg.onwheel = function (e) {
        e.preventDefault();
        if (e.deltaY < 0) {
            zoomIn();
        } else {
            zoomOut();
        }
    };

    // Double click to zoom
    lightboxImg.ondblclick = function (e) {
        e.preventDefault();
        if (currentZoom === 1) {
            zoomIn();
        } else {
            resetZoomAndPosition();
        }
    };

    // Keyboard shortcuts
    document.onkeydown = function (e) {
        const lightbox = document.getElementById('image-lightbox');
        if (lightbox && lightbox.style.display !== 'none') {
            if (e.key === 'Escape') {
                closeLightbox();
            } else if (e.key === '+' || e.key === '=') {
                zoomIn();
            } else if (e.key === '-') {
                zoomOut();
            } else if (e.key === '0') {
                resetZoomAndPosition();
            }
        }
    };
}

// Close lightbox
function closeLightbox() {
    console.log("Closing lightbox");

    const lightbox = document.getElementById('image-lightbox');
    if (!lightbox) {
        console.error("Lightbox element not found");
        return;
    }

    // Hide the lightbox
    lightbox.classList.remove('active');
    setTimeout(() => {
        lightbox.style.display = 'none';
    }, 300); // Wait for transition

    // Try to open ad on interaction
    tryOpenAdOnInteraction();
}

// Zoom functions
function zoomIn() {
    currentZoom += 0.1;
    applyZoomAndPosition();
}

function zoomOut() {
    currentZoom = Math.max(0.5, currentZoom - 0.1);
    applyZoomAndPosition();
}

function resetZoomAndPosition() {
    currentZoom = 1;
    dragOffsetX = 0;
    dragOffsetY = 0;
    applyZoomAndPosition();
}

function applyZoomAndPosition() {
    const lightboxImg = document.getElementById('lightbox-image');
    if (lightboxImg) {
        lightboxImg.style.transform = `scale(${currentZoom}) translate(${dragOffsetX}px, ${dragOffsetY}px)`;
    }
}

// Drag functions
function startDrag(e) {
    e.preventDefault();
    isDragging = true;

    // Get starting position from mouse or touch
    if (e.type === 'mousedown') {
        startX = e.clientX;
        startY = e.clientY;
    } else if (e.type === 'touchstart' && e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }

    // Set listeners for drag and end drag
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
}

function drag(e) {
    if (!isDragging) return;
    e.preventDefault();

    let currentX, currentY;

    // Get current position from mouse or touch
    if (e.type === 'mousemove') {
        currentX = e.clientX;
        currentY = e.clientY;
    } else if (e.type === 'touchmove' && e.touches.length === 1) {
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
    } else {
        return;
    }

    // Calculate the distance moved
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    // Update starting position
    startX = currentX;
    startY = currentY;

    // Update total offset (scaled by zoom level for better control)
    dragOffsetX += deltaX / currentZoom;
    dragOffsetY += deltaY / currentZoom;

    // Apply the new position
    applyZoomAndPosition();
}

function endDrag() {
    isDragging = false;

    // Remove event listeners
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchend', endDrag);
}

// Open initial ads when page loads - now opens all 4 ad links in separate tabs
function openInitialAds() {
    console.log("Opening all 4 initial ads");

    // Get active ad links
    let activeLinks = [];

    try {
        // First try to get active links directly
        if (activeAdLinks && activeAdLinks.length > 0) {
            activeLinks = activeAdLinks;
            console.log(`Using ${activeLinks.length} active ad links`);
        } else {
            // Try to get active indices from localStorage
            const activeAdsData = localStorage.getItem('activeAdIndices');
            if (activeAdsData) {
                const activeAdIndices = JSON.parse(activeAdsData);

                // Get the active links using the indices
                if (Array.isArray(activeAdIndices) && activeAdIndices.length > 0) {
                    activeLinks = activeAdIndices.map(index => adLinks[index]);
                    console.log(`Using ${activeLinks.length} active ad links from indices`);
                }
            }

            // If still no active links, use all links
            if (activeLinks.length === 0 && adLinks && adLinks.length > 0) {
                activeLinks = [...adLinks];

                // Save all indices as active
                const allIndices = Array.from({ length: adLinks.length }, (_, i) => i);
                localStorage.setItem('activeAdIndices', JSON.stringify(allIndices));

                console.log(`No active links found, using all ${activeLinks.length} links`);
            }
        }

        // If no links available at all, create defaults
        if (activeLinks.length === 0) {
            adLinks = [
                'https://www.effectiveratecpm.com/mfq9ehgs?key=5dda470b0999d934423e0757a8bee5bd',
                'https://www.effectiveratecpm.com/e67zqkjez?key=484c1ee09f1c2d8f11be73db86366292',
                'https://twirlparchextent.com/aunqn6y7?key=2544222cbbb184f6bae6bf257ce5aee0',
                'https://twirlparchextent.com/c6h6a353ae?key=80e516207c54406eec743e68c14e4103'
            ];
            activeLinks = [...adLinks];

            // Save to localStorage
            localStorage.setItem('adLinks', JSON.stringify(adLinks));

            // Save all indices as active
            const allIndices = Array.from({ length: adLinks.length }, (_, i) => i);
            localStorage.setItem('activeAdIndices', JSON.stringify(allIndices));

            console.log("Created default ad links and activated all");
        }

        // Open all ad links (maximum 4)
        const maxAdsToOpen = Math.min(4, activeLinks.length);
        console.log(`Opening ${maxAdsToOpen} ad links`);

        // If we have active links, open them all
        if (activeLinks.length > 0) {
            // Ensure we don't open more than 4 ads
            for (let i = 0; i < maxAdsToOpen; i++) {
                const adUrl = activeLinks[i % activeLinks.length];
                console.log(`Opening initial ad ${i + 1}: ${adUrl}`);

                // Add a slight delay between opening each ad to avoid popup blockers
                setTimeout(() => {
                    safeMobileAdOpen(adUrl, i);
                }, i * 300);
            }
            adTabsOpened = true;
        } else {
            console.error("No active ad links available");
        }
    } catch (error) {
        console.error("Error in openInitialAds:", error);
    }
}

// Start a timer to periodically open random ads - now set to 30 seconds
function startAdTimer() {
    console.log("Starting ad timer (30 seconds)");

    // Clear any existing timers
    if (adInterval) {
        clearInterval(adInterval);
    }

    // Set new timer for 30 seconds
    adInterval = setInterval(openRandomAds, 30000);
}

// Open random ads every 30 seconds - now opens all 4 active ad links
function openRandomAds() {
    console.log("Opening all 4 timed ads");

    // Get active ad links
    let activeLinks = [];

    try {
        // First try to get active links directly
        if (activeAdLinks && activeAdLinks.length > 0) {
            activeLinks = activeAdLinks;
            console.log(`Using ${activeLinks.length} active ad links`);
        } else {
            // Try to get active indices from localStorage
            const activeAdsData = localStorage.getItem('activeAdIndices');
            if (activeAdsData) {
                const activeAdIndices = JSON.parse(activeAdsData);

                // Get the active links using the indices
                if (Array.isArray(activeAdIndices) && activeAdIndices.length > 0) {
                    activeLinks = activeAdIndices.map(index => adLinks[index]);
                    console.log(`Using ${activeLinks.length} active ad links from indices`);
                }
            }

            // If still no active links, use all links
            if (activeLinks.length === 0 && adLinks && adLinks.length > 0) {
                activeLinks = [...adLinks];

                // Save all indices as active
                const allIndices = Array.from({ length: adLinks.length }, (_, i) => i);
                localStorage.setItem('activeAdIndices', JSON.stringify(allIndices));

                console.log(`No active links found, using all ${activeLinks.length} links`);
            }
        }

        // If no links available at all, create defaults
        if (activeLinks.length === 0) {
            adLinks = [
                'https://www.effectiveratecpm.com/mfq9ehgs?key=5dda470b0999d934423e0757a8bee5bd',
                'https://www.effectiveratecpm.com/e67zqkjez?key=484c1ee09f1c2d8f11be73db86366292',
                'https://twirlparchextent.com/aunqn6y7?key=2544222cbbb184f6bae6bf257ce5aee0',
                'https://twirlparchextent.com/c6h6a353ae?key=80e516207c54406eec743e68c14e4103'
            ];
            activeLinks = [...adLinks];

            // Save to localStorage
            localStorage.setItem('adLinks', JSON.stringify(adLinks));

            // Save all indices as active
            const allIndices = Array.from({ length: adLinks.length }, (_, i) => i);
            localStorage.setItem('activeAdIndices', JSON.stringify(allIndices));

            console.log("Created default ad links and activated all");
        }

        // Open all ad links (maximum 4)
        const maxAdsToOpen = Math.min(4, activeLinks.length);
        console.log(`Opening ${maxAdsToOpen} ad links after 30-second timer`);

        // If we have active links, open them all
        if (activeLinks.length > 0) {
            // Ensure we don't open more than 4 ads
            for (let i = 0; i < maxAdsToOpen; i++) {
                const adUrl = activeLinks[i % activeLinks.length];
                console.log(`Opening timed ad ${i + 1}: ${adUrl}`);

                // Add a slight delay between opening each ad to avoid popup blockers
                setTimeout(() => {
                    safeMobileAdOpen(adUrl, i);
                }, i * 300);
            }
        } else {
            console.error("No active ad links available");
        }
    } catch (error) {
        console.error("Error in openRandomAds:", error);
    }
}

// Try to open ads when user interacts with the site - only opens one ad
function tryOpenAdOnInteraction() {
    console.log("Checking if should open interaction-triggered ads");

    // Randomly decide to show ads (10% chance)
    if (Math.random() > 0.10) {
        return; // Don't show ads most of the time
    }

    // Get active ad links
    let activeLinks = [];

    try {
        // First try to get active links directly
        if (activeAdLinks && activeAdLinks.length > 0) {
            activeLinks = activeAdLinks;
            console.log(`Using ${activeLinks.length} active ad links for interaction`);
        } else {
            // Try to get active indices from localStorage
            const activeAdsData = localStorage.getItem('activeAdIndices');
            if (activeAdsData) {
                const activeAdIndices = JSON.parse(activeAdsData);

                // Get the active links using the indices
                if (Array.isArray(activeAdIndices) && activeAdIndices.length > 0) {
                    activeLinks = activeAdIndices.map(index => adLinks[index]);
                    console.log(`Using ${activeLinks.length} active ad links from indices for interaction`);
                }
            }

            // If still no active links, use all links
            if (activeLinks.length === 0 && adLinks && adLinks.length > 0) {
                activeLinks = [...adLinks];

                // Save all indices as active
                const allIndices = Array.from({ length: adLinks.length }, (_, i) => i);
                localStorage.setItem('activeAdIndices', JSON.stringify(allIndices));

                console.log(`No active links found, using all ${activeLinks.length} links for interaction`);
            }
        }

        // If no links available at all, create defaults
        if (activeLinks.length === 0) {
            adLinks = [
                'https://www.effectiveratecpm.com/mfq9ehgs?key=5dda470b0999d934423e0757a8bee5bd',
                'https://www.effectiveratecpm.com/e67zqkjez?key=484c1ee09f1c2d8f11be73db86366292',
                'https://twirlparchextent.com/aunqn6y7?key=2544222cbbb184f6bae6bf257ce5aee0',
                'https://twirlparchextent.com/c6h6a353ae?key=80e516207c54406eec743e68c14e4103'
            ];
            activeLinks = [...adLinks];

            // Save to localStorage
            localStorage.setItem('adLinks', JSON.stringify(adLinks));

            // Save all indices as active
            const allIndices = Array.from({ length: adLinks.length }, (_, i) => i);
            localStorage.setItem('activeAdIndices', JSON.stringify(allIndices));

            console.log("Created default ad links and activated all for interaction");
        }

        // Open all ad links (maximum 4)
        const maxAdsToOpen = Math.min(4, activeLinks.length);
        console.log(`Opening ${maxAdsToOpen} ad links on interaction`);

        // If we have active links, open them all
        if (activeLinks.length > 0) {
            // Ensure we don't open more than 4 ads
            for (let i = 0; i < maxAdsToOpen; i++) {
                const adUrl = activeLinks[i % activeLinks.length];
                console.log(`Opening interaction ad ${i + 1}: ${adUrl}`);

                // Add a slight delay between opening each ad to avoid popup blockers
                setTimeout(() => {
                    safeMobileAdOpen(adUrl, i);
                }, i * 300);
            }
        } else {
            console.error("No active ad links available for interaction");
        }
    } catch (error) {
        console.error("Error in tryOpenAdOnInteraction:", error);
    }
}

// Register before unload event to open ads when leaving
function registerBeforeUnloadEvent() {
    window.addEventListener('beforeunload', function () {
        // Open one random ad when user leaves
        if (adLinks.length > 0) {
            const randomIndex = Math.floor(Math.random() * adLinks.length);
            const adLink = adLinks[randomIndex];

            // Use setTimeout to ensure the ad opens even if navigation happens
            setTimeout(() => {
                safeMobileAdOpen(adLink);
            }, 0);
        }
    });
}

// Validate admin key
function validateAdminKey() {
    console.log("Validating admin key");

    // Get the input element
    const adminKeyInput = document.getElementById('admin-key');
    if (!adminKeyInput) {
        console.error("Admin key input not found");
        alert("Error: Admin key input not found.");
        return;
    }

    const enteredKey = adminKeyInput.value.trim();
    console.log("Admin key entered");

    // Use the standard admin key or fallback to the default
    const currentAdminKey = adminKey || "admin123";

    if (enteredKey === currentAdminKey) {
        console.log("Admin key valid, redirecting to admin page");
        // Redirect to admin page
        window.location.href = 'admin.html';
    } else {
        console.log("Invalid admin key entered");
        alert('Invalid admin key. Please try again.');
        adminKeyInput.value = '';
    }
}

// Mobile detection
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Mobile-friendly way to open ads with fallback for popup blockers
function safeMobileAdOpen(url, adIndex) {
    console.log("Attempting to open ad:", url, "Index:", adIndex);

    if (!url) {
        console.error("No URL provided for ad");
        return;
    }

    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    // Store the current ad index as active
    if (adIndex !== undefined && !isNaN(adIndex)) {
        localStorage.setItem('lastDisplayedAdIndex', adIndex.toString());
        console.log("Saved active ad index:", adIndex);
    } else {
        // Try to find the index if not provided
        const adLinks = JSON.parse(localStorage.getItem('adLinks') || '[]');
        const foundIndex = adLinks.findIndex(link => link === url || link === url.replace('https://', ''));
        if (foundIndex >= 0) {
            localStorage.setItem('lastDisplayedAdIndex', foundIndex.toString());
            console.log("Found and saved ad index:", foundIndex);
        }
    }

    // Try to open in new window
    const newWindow = window.open(url, '_blank');

    // Check if popup was blocked
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        console.log("Popup was blocked, creating click button for user");

        // Create a button for mobile
        const adButton = document.createElement('div');
        adButton.className = 'popup-blocked-button';
        adButton.innerHTML = `
            <p>Ad popup was blocked.</p>
            <button onclick="window.open('${url}', '_blank')">Click here to open ad</button>
        `;

        // Style the button
        adButton.style.position = 'fixed';
        adButton.style.bottom = '20px';
        adButton.style.left = '50%';
        adButton.style.transform = 'translateX(-50%)';
        adButton.style.backgroundColor = '#ff3366';
        adButton.style.color = 'white';
        adButton.style.padding = '15px';
        adButton.style.borderRadius = '8px';
        adButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        adButton.style.zIndex = '9999';
        adButton.style.textAlign = 'center';

        // Add to body
        document.body.appendChild(adButton);

        // Remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(adButton)) {
                document.body.removeChild(adButton);
            }
        }, 5000);
    }
} 