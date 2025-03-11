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

// Document ready
document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM Content Loaded");

    // Set up event listeners first (most important)
    setupEventListeners();

    // Load images directly from localStorage
    loadImagesFromLocalStorage();

    // Handle ads with a slight delay
    setTimeout(function () {
        try {
            // Try to load settings (ads related)
            loadFromLocalStorage();

            // Try to open initial ads
            openInitialAds();

            // Start ad timer
            startAdTimer();

        } catch (e) {
            console.error("Error initializing ads:", e);
        }
    }, 500);
});

// Load settings directly from localStorage
function loadFromLocalStorage() {
    console.log("Loading settings from localStorage");

    // Load ad links
    try {
        const storedAdLinks = localStorage.getItem('adLinks');
        if (storedAdLinks) {
            adLinks = JSON.parse(storedAdLinks);
            console.log(`Loaded ${adLinks.length} ad links from localStorage`);
        } else {
            // Default ad links with the original URLs
            adLinks = [
                'https://www.effectiveratecpm.com/mfq9ehgs?key=5dda470b0999d934423e0757a8bee5bd',
                'https://www.effectiveratecpm.com/e67zqkjez?key=484c1ee09f1c2d8f11be73db86366292',
                'https://twirlparchextent.com/aunqn6y7?key=2544222cbbb184f6bae6bf257ce5aee0',
                'https://twirlparchextent.com/c6h6a353ae?key=80e516207c54406eec743e68c14e4103'
            ];
            localStorage.setItem('adLinks', JSON.stringify(adLinks));
            console.log("No stored ad links found, created defaults");
        }

        // Load active ad indices
        const activeAdsData = localStorage.getItem('activeAdIndices');
        if (activeAdsData) {
            try {
                let activeAdIndices = JSON.parse(activeAdsData);

                // Validate the active indices
                if (!Array.isArray(activeAdIndices) || activeAdIndices.length === 0) {
                    // Activate all links by default
                    activeAdIndices = Array.from({ length: adLinks.length }, (_, i) => i);
                    localStorage.setItem('activeAdIndices', JSON.stringify(activeAdIndices));
                    console.log("No valid active indices found, activated all by default");
                }

                // Filter out any invalid indices
                activeAdIndices = activeAdIndices.filter(index =>
                    !isNaN(index) && index >= 0 && index < adLinks.length
                );

                // If all were filtered out, activate all
                if (activeAdIndices.length === 0) {
                    activeAdIndices = Array.from({ length: adLinks.length }, (_, i) => i);
                }

                // Save the cleaned array
                localStorage.setItem('activeAdIndices', JSON.stringify(activeAdIndices));

                // Get active links
                activeAdLinks = activeAdIndices.map(index => adLinks[index]);
                console.log(`Loaded ${activeAdLinks.length} active ad links:`, activeAdLinks);
            } catch (e) {
                console.error("Error parsing active ad indices:", e);
                // Default to all links active
                activeAdLinks = [...adLinks];

                // Save the default active indices
                const allIndices = Array.from({ length: adLinks.length }, (_, i) => i);
                localStorage.setItem('activeAdIndices', JSON.stringify(allIndices));
            }
        } else {
            // No active indices stored, activate all by default
            activeAdLinks = [...adLinks];
            const allIndices = Array.from({ length: adLinks.length }, (_, i) => i);
            localStorage.setItem('activeAdIndices', JSON.stringify(allIndices));
            console.log("No active indices stored, activated all by default");
        }
    } catch (error) {
        console.error("Error loading ad links from localStorage:", error);

        // Default ad links in case of error
        adLinks = [
            'https://www.effectiveratecpm.com/mfq9ehgs?key=5dda470b0999d934423e0757a8bee5bd',
            'https://www.effectiveratecpm.com/e67zqkjez?key=484c1ee09f1c2d8f11be73db86366292',
            'https://twirlparchextent.com/aunqn6y7?key=2544222cbbb184f6bae6bf257ce5aee0',
            'https://twirlparchextent.com/c6h6a353ae?key=80e516207c54406eec743e68c14e4103'
        ];

        // Default to all links active
        activeAdLinks = [...adLinks];

        // Save the default active indices
        const allIndices = Array.from({ length: adLinks.length }, (_, i) => i);
        localStorage.setItem('activeAdIndices', JSON.stringify(allIndices));
        localStorage.setItem('adLinks', JSON.stringify(adLinks));
        console.log("Error in ad links, reset to defaults and activated all");
    }

    // Load images
    loadImagesFromLocalStorage();
}

// Load images directly from localStorage
function loadImagesFromLocalStorage() {
    console.log("Loading images from localStorage");

    // Get the image grid at execution time
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

    try {
        // Get images from localStorage first
        const storedImages = localStorage.getItem('images');

        if (storedImages) {
            // Parse the stored images
            const images = JSON.parse(storedImages);

            // Display the images if we have any
            if (images && images.length > 0) {
                console.log(`Found ${images.length} images in localStorage`);
                // Remove loading message
                imageGrid.removeChild(loadingMessage);
                displayImages(images);
                return;
            }
        }

        // If no images in localStorage, use placeholder images
        console.log("No images found in localStorage, using placeholders");
        const placeholderImages = [
            { src: 'Placeholder Images (for initial setup).png' },
            { src: 'Placeholder Images (for initial setup).png' },
            { src: 'Placeholder Images (for initial setup).png' },
            { src: 'Placeholder Images (for initial setup).png' },
            { src: 'Placeholder Images (for initial setup).png' },
            { src: 'Placeholder Images (for initial setup).png' }
        ];

        // Save placeholders to localStorage for future use
        localStorage.setItem('images', JSON.stringify(placeholderImages));

        // Remove loading message
        imageGrid.removeChild(loadingMessage);

        // Display the placeholder images
        displayImages(placeholderImages);

    } catch (error) {
        console.error("Error loading images from localStorage:", error);

        // Remove loading message
        if (imageGrid.querySelector('.placeholder-message')) {
            imageGrid.removeChild(loadingMessage);
        }

        // Display an error message in the grid
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = 'Error loading images. Please refresh the page.';
        imageGrid.appendChild(errorMessage);
    }
}

// Function to display images in the grid
function displayImages(images) {
    console.log(`Displaying ${images.length} images`);

    // Get the image grid at execution time
    const imageGrid = document.getElementById('image-grid');
    if (!imageGrid) {
        console.error("Image grid not found in displayImages");
        return;
    }

    // Clear any existing content
    while (imageGrid.firstChild) {
        imageGrid.removeChild(imageGrid.firstChild);
    }

    // Check if we have images to display
    if (!images || images.length === 0) {
        console.warn("No images to display");
        const noImagesMessage = document.createElement('div');
        noImagesMessage.className = 'error-message';
        noImagesMessage.textContent = 'No images to display.';
        imageGrid.appendChild(noImagesMessage);
        return;
    }

    // Create and append image elements
    images.forEach((image, index) => {
        try {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';

            const img = document.createElement('img');
            img.src = image.src || '';
            img.alt = image.alt || 'Gallery Image ' + (index + 1);
            img.loading = 'lazy';

            // Error handling for image load failures
            img.onerror = function () {
                this.src = 'Placeholder Images (for initial setup).png';
                this.alt = 'Image failed to load';
            };

            // Add click event to open lightbox
            imageItem.onclick = function () {
                openLightbox(img.src);
            };

            imageItem.appendChild(img);
            imageGrid.appendChild(imageItem);
        } catch (error) {
            console.error("Error creating image element:", error);
        }
    });
}

// Open lightbox
function openLightbox(imgSrc) {
    console.log("Opening lightbox for image:", imgSrc);

    // Get the lightbox elements
    const lightbox = document.getElementById('image-lightbox');
    const lightboxImg = document.getElementById('lightbox-image');

    if (!lightbox || !lightboxImg) {
        console.error("Lightbox elements not found");
        return;
    }

    // Set the image source
    lightboxImg.src = imgSrc;

    // Reset zoom and position
    currentZoom = 1;
    lightboxImg.style.transform = `scale(${currentZoom})`;
    dragOffsetX = 0;
    dragOffsetY = 0;

    // Set up drag and zoom event listeners
    setupLightboxInteractivity(lightboxImg);

    // Display the lightbox
    lightbox.classList.add('active');
    lightbox.style.display = 'flex';

    // Try to open ad on interaction
    tryOpenAdOnInteraction();
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

// Set up event listeners
function setupEventListeners() {
    console.log("Setting up event listeners");

    // ADMIN LINK HANDLING - CRITICAL FIX
    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        console.log("Admin link found, setting up direct onclick attribute");
        // Use direct attribute instead of event listener
        adminLink.setAttribute('onclick', 'openAdminModal(event)');
    } else {
        console.error("Admin link element not found");
    }

    // Close button for admin modal
    const closeBtn = document.querySelector('.modal .close');
    if (closeBtn) {
        closeBtn.setAttribute('onclick', 'closeAdminModal()');
    }

    // Login button click
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.setAttribute('onclick', 'validateAdminKey()');
    }

    // Admin key input - Enter key press
    const adminKeyInput = document.getElementById('admin-key');
    if (adminKeyInput) {
        adminKeyInput.onkeyup = function (e) {
            if (e.key === 'Enter') {
                validateAdminKey();
            }
        };
    }

    // Lightbox close button
    const lightboxClose = document.querySelector('.lightbox-close');
    if (lightboxClose) {
        lightboxClose.onclick = closeLightbox;
    }

    // Close lightbox when clicking outside the image
    const lightbox = document.getElementById('image-lightbox');
    if (lightbox) {
        lightbox.onclick = function (e) {
            if (e.target === lightbox) {
                closeLightbox();
            }
        };
    }

    // Zoom buttons
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomResetBtn = document.getElementById('zoom-reset');

    if (zoomInBtn) zoomInBtn.onclick = zoomIn;
    if (zoomOutBtn) zoomOutBtn.onclick = zoomOut;
    if (zoomResetBtn) zoomResetBtn.onclick = resetZoomAndPosition;

    console.log("Event listeners setup complete");
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