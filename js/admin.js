// Global variables
let adLinks = [];
let adFrequency = 30000; // 30 seconds by default
let images = [];
let deleteItemType = ''; // 'ad' or 'image'
let deleteItemId = null;

// NOTE: When hosting on GitHub Pages, localStorage is client-specific
// This means images added on one device won't be visible to other users
// For a production site, consider using:
// 1. A server backend with database (Firebase, MongoDB, etc.)
// 2. GitHub Issues API as storage (can work with GitHub Pages)
// 3. Storing images directly in the GitHub repository (commit via API)

// DOM Elements
const adLinksList = document.getElementById('ad-links-list');
const newAdLinkInput = document.getElementById('new-ad-link');
const addAdLinkBtn = document.getElementById('add-ad-link-btn');
const adFrequencyInput = document.getElementById('ad-frequency');
const saveAdSettingsBtn = document.getElementById('save-ad-settings-btn');
const imageUrlInput = document.getElementById('image-url');
const addImageUrlBtn = document.getElementById('add-image-url-btn');
const imageFileInput = document.getElementById('image-file');
const selectedFilesDiv = document.getElementById('selected-files');
const imagePreviewGrid = document.getElementById('image-preview-grid');
const deleteConfirmation = document.getElementById('delete-confirmation');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

// Reset to default links function
function resetToDefaultLinks() {
    // No confirmation prompt - directly reset

    // Default ad links with the original URLs
    adLinks = [
        'https://www.effectiveratecpm.com/mfq9ehgs?key=5dda470b0999d934423e0757a8bee5bd',
        'https://www.effectiveratecpm.com/e67zqkjez?key=484c1ee09f1c2d8f11be73db86366292',
        'https://twirlparchextent.com/aunqn6y7?key=2544222cbbb184f6bae6bf257ce5aee0',
        'https://twirlparchextent.com/c6h6a353ae?key=80e516207c54406eec743e68c14e4103'
    ];

    // Save to localStorage
    localStorage.setItem('adLinks', JSON.stringify(adLinks));

    // Activate all default links
    const allIndices = Array.from({ length: adLinks.length }, (_, i) => i);
    localStorage.setItem('activeAdIndices', JSON.stringify(allIndices));
    console.log("Activated all default links:", allIndices);

    // Save for backward compatibility
    localStorage.setItem('lastDisplayedAdIndex', '0');

    // Show confirmation
    alert('All 4 default ad links have been activated!');

    // Refresh the display
    displayAdLinks();
}

// Initial setup
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Admin page loaded - initializing...");

    // Force reset to default links
    resetToDefaultLinks();

    try {
        // Add loading indicators
        adLinksList.innerHTML = '<div class="loading">Loading ad links...</div>';
        imagePreviewGrid.innerHTML = '<div class="loading">Loading images...</div>';

        // Setup event listeners first (most important)
        setupEventListeners();

        // Try to load settings from Firebase with timeout protection
        const settingsPromise = loadSettings().catch(error => {
            console.error("Error loading settings from Firebase:", error);
            return loadFromLocalStorage(); // Fall back to localStorage
        });

        // Add a timeout for loading
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Settings loading timed out")), 8000);
        });

        // Race the settings loading against timeout
        await Promise.race([settingsPromise, timeoutPromise]).catch(error => {
            console.error("Settings loading failed or timed out:", error);
            loadFromLocalStorage(); // Ensure we at least load from localStorage
        });
    } catch (error) {
        console.error("Error during initialization:", error);
        // Final fallback - load anything we can from localStorage
        loadFromLocalStorage();
    }

    // Show GitHub hosting notice
    showGitHubHostingNotice();
});

// Show GitHub hosting notice in admin panel
function showGitHubHostingNotice() {
    const noticeContainer = document.createElement('div');
    noticeContainer.className = 'github-notice';
    noticeContainer.innerHTML = `
        <h3>🔥 Firebase Storage Enabled</h3>
        <p>All images added through this admin panel are now stored in Firebase Cloud Storage!</p>
        <p>This means <strong>all visitors</strong> to your site will see these images, not just you.</p>
        <p>Your previous images from localStorage have been automatically migrated to the cloud.</p>
        <button id="dismiss-notice">Dismiss</button>
    `;

    document.querySelector('main').prepend(noticeContainer);

    // Add dismiss button functionality
    document.getElementById('dismiss-notice').addEventListener('click', () => {
        noticeContainer.style.display = 'none';
    });
}

// Load settings from Firebase
async function loadSettings() {
    try {
        // Clear any existing links to force using the new set
        localStorage.removeItem('adLinks');
        localStorage.removeItem('activeAdIndices');

        // Load ad links from Firebase
        const adLinksResult = await firebaseStorage.getAdLinks();

        if (adLinksResult.success && adLinksResult.adLinks.length > 0) {
            adLinks = adLinksResult.adLinks;
        } else {
            // Fall back to localStorage
            const storedAdLinks = localStorage.getItem('adLinks');
            if (storedAdLinks) {
                adLinks = JSON.parse(storedAdLinks);
                // Migrate to Firebase
                await firebaseStorage.saveAdLinks(adLinks);
            } else {
                // Default ad links with user's specific links - only 4 unique links
                adLinks = [
                    // 4 unique links
                    'https://www.effectiveratecpm.com/mfq9ehgs?key=5dda470b0999d934423e0757a8bee5bd',
                    'https://www.effectiveratecpm.com/e67zqkjez?key=484c1ee09f1c2d8f11be73db86366292',
                    'https://twirlparchextent.com/aunqn6y7?key=2544222cbbb184f6bae6bf257ce5aee0',
                    'https://twirlparchextent.com/c6h6a353ae?key=80e516207c54406eec743e68c14e4103'
                ];

                // Save to localStorage first (most reliable)
                localStorage.setItem('adLinks', JSON.stringify(adLinks));

                // Try to save to Firebase
                await firebaseStorage.saveAdLinks(adLinks);

                // Make all links active by default
                const allIndices = Array.from({ length: adLinks.length }, (_, i) => i);
                localStorage.setItem('activeAdIndices', JSON.stringify(allIndices));
                console.log("Set all default links as active");
            }
        }

        // Display ad links in the UI
        console.log("Displaying ad links...");
        displayAdLinks();

        // Load ad frequency from Firebase
        const frequencyResult = await firebaseStorage.getAdFrequency();

        if (frequencyResult.success) {
            adFrequency = frequencyResult.frequency;
            adFrequencyInput.value = adFrequency / 1000; // Convert ms to seconds for display
        } else {
            // Fall back to localStorage
            const storedFrequency = localStorage.getItem('adFrequency');
            if (storedFrequency) {
                adFrequency = parseInt(storedFrequency);
                adFrequencyInput.value = adFrequency / 1000;
                // Migrate to Firebase
                await firebaseStorage.saveAdFrequency(adFrequency);
            } else {
                adFrequencyInput.value = 30; // Default 30 seconds
                adFrequency = 30000;
                await firebaseStorage.saveAdFrequency(adFrequency);
            }
        }

        // Load images from Firebase
        await loadImagesFromFirebase();

    } catch (error) {
        console.error("Error loading settings from Firebase:", error);
        // Fall back to localStorage
        loadFromLocalStorage();
    }
}

// Load settings from localStorage as fallback
function loadFromLocalStorage() {
    console.log("Loading settings from localStorage");

    try {
        // Clear existing links to force using the new set
        localStorage.removeItem('adLinks');
        localStorage.removeItem('activeAdIndices');

        // Load ad links
        const storedAdLinks = localStorage.getItem('adLinks');
        if (storedAdLinks) {
            adLinks = JSON.parse(storedAdLinks);
            console.log(`Loaded ${adLinks.length} ad links from localStorage`);
        } else {
            // Default ad links with user's specific links - only 4 unique links
            adLinks = [
                // 4 unique links
                'https://www.effectiveratecpm.com/mfq9ehgs?key=5dda470b0999d934423e0757a8bee5bd',
                'https://www.effectiveratecpm.com/e67zqkjez?key=484c1ee09f1c2d8f11be73db86366292',
                'https://twirlparchextent.com/aunqn6y7?key=2544222cbbb184f6bae6bf257ce5aee0',
                'https://twirlparchextent.com/c6h6a353ae?key=80e516207c54406eec743e68c14e4103'
            ];
            localStorage.setItem('adLinks', JSON.stringify(adLinks));
            console.log(`Created default ad links with user's specified URLs: ${adLinks.length} links`);

            // Make all links active by default
            const allIndices = Array.from({ length: adLinks.length }, (_, i) => i);
            localStorage.setItem('activeAdIndices', JSON.stringify(allIndices));
            console.log("Set all default links as active");
        }

        // Force display of ad links
        console.log("Displaying ad links...");
        displayAdLinks();

        // Load ad frequency
        const storedFrequency = localStorage.getItem('adFrequency');
        if (storedFrequency) {
            adFrequency = parseInt(storedFrequency);
            adFrequencyInput.value = adFrequency / 1000; // Convert ms to seconds
        } else {
            adFrequency = 30000; // Default 30 seconds
            adFrequencyInput.value = 30;
        }

        // Load images
        const storedImages = localStorage.getItem('images');
        if (storedImages) {
            images = JSON.parse(storedImages);
            displayImages(images);
            console.log(`Loaded ${images.length} images from localStorage`);
        } else {
            // Default placeholder images
            images = [
                { id: 'placeholder_1', src: 'Placeholder Images (for initial setup).png' },
                { id: 'placeholder_2', src: 'Placeholder Images (for initial setup).png' },
                { id: 'placeholder_3', src: 'Placeholder Images (for initial setup).png' }
            ];
            localStorage.setItem('images', JSON.stringify(images));
            displayImages(images);
            console.log("Created placeholder images");
        }

        return true;
    } catch (error) {
        console.error("Error loading from localStorage:", error);
        return false;
    }
}

// Load images from Firebase with proper localStorage fallback
async function loadImagesFromFirebase() {
    console.log("Loading images...");

    try {
        // Try to get images from Firebase first
        const result = await firebaseStorage.getImages();

        if (result.success && result.images && result.images.length > 0) {
            console.log(`Found ${result.images.length} images in Firebase`);
            images = result.images;
            displayImages(images);
            return true;
        } else {
            console.log("No images found in Firebase or Firebase failed, trying localStorage...");
        }
    } catch (firebaseError) {
        console.error("Firebase image loading failed:", firebaseError);
        console.log("Falling back to localStorage...");
    }

    // Fall back to localStorage if Firebase failed or returned no images
    try {
        const storedImages = localStorage.getItem('images');
        if (storedImages) {
            const parsedImages = JSON.parse(storedImages);
            if (parsedImages && parsedImages.length > 0) {
                console.log(`Found ${parsedImages.length} images in localStorage`);
                images = parsedImages;
                displayImages(images);
                return true;
            }
        }
    } catch (localStorageError) {
        console.error("localStorage image loading failed:", localStorageError);
    }

    // If we reach here, no images were found in either storage
    console.log("No images found anywhere, using placeholders");
    images = [
        {
            id: 'placeholder_1',
            src: 'Placeholder Images (for initial setup).png'
        },
        {
            id: 'placeholder_2',
            src: 'Placeholder Images (for initial setup).png'
        },
        {
            id: 'placeholder_3',
            src: 'Placeholder Images (for initial setup).png'
        }
    ];

    localStorage.setItem('images', JSON.stringify(images));
    displayImages(images);
    return false;
}

// Display ad links in the UI with support for multiple active ads
function displayAdLinks() {
    console.log("Displaying ad links, total:", adLinks ? adLinks.length : 0);

    // Clear the list
    adLinksList.innerHTML = '';

    // Make sure we have ad links
    if (!adLinks || adLinks.length === 0) {
        const noLinksMessage = document.createElement('div');
        noLinksMessage.className = 'no-items-message';
        noLinksMessage.textContent = 'No ad links added yet.';
        adLinksList.appendChild(noLinksMessage);
        return;
    }

    // Force activate all links if none are active
    let activeAdIndices = [];
    try {
        const activeAdsData = localStorage.getItem('activeAdIndices');
        if (activeAdsData) {
            activeAdIndices = JSON.parse(activeAdsData);
            if (!Array.isArray(activeAdIndices) || activeAdIndices.length === 0) {
                // No active links, activate all
                activeAdIndices = Array.from({ length: adLinks.length }, (_, i) => i);
                localStorage.setItem('activeAdIndices', JSON.stringify(activeAdIndices));
                console.log("No active links found, activated all by default");
            }
        } else {
            // No active links data, activate all
            activeAdIndices = Array.from({ length: adLinks.length }, (_, i) => i);
            localStorage.setItem('activeAdIndices', JSON.stringify(activeAdIndices));
            console.log("No active links data found, activated all by default");
        }

        // Make sure all indices are valid
        activeAdIndices = activeAdIndices.filter(index =>
            !isNaN(index) && index >= 0 && index < adLinks.length
        );

        // Save back the cleaned array
        localStorage.setItem('activeAdIndices', JSON.stringify(activeAdIndices));

        console.log("Active ad indices:", activeAdIndices);
    } catch (e) {
        console.error("Error processing active ad indices:", e);
        activeAdIndices = adLinks.length > 0 ? Array.from({ length: adLinks.length }, (_, i) => i) : [];
        localStorage.setItem('activeAdIndices', JSON.stringify(activeAdIndices));
    }

    // Create active ads status display at the top
    const activeAdStatus = document.createElement('div');
    activeAdStatus.className = 'active-ad-status';

    if (activeAdIndices.length > 0) {
        // Get URLs of active ads
        const activeAdUrls = activeAdIndices.map(index => adLinks[index]);

        activeAdStatus.innerHTML = `
            <div class="active-ad-label">✅ ACTIVE ADS (${activeAdIndices.length}):</div>
            <div class="active-ads-list">
                ${activeAdUrls.map(url => `<div class="active-ad-url">${url}</div>`).join('')}
            </div>
            <div class="active-ad-help">Click 'Toggle Active' on any ad to activate/deactivate it</div>
        `;
    } else {
        activeAdStatus.innerHTML = `
            <div class="active-ad-label">⚠️ No Active Ads</div>
            <div class="active-ad-url">Please activate at least one ad link</div>
        `;
    }

    adLinksList.appendChild(activeAdStatus);

    // Add each ad link to the list
    adLinks.forEach((link, index) => {
        const adLinkItem = document.createElement('div');
        adLinkItem.className = 'ad-link-item';

        // Check if this ad is active
        const isActive = activeAdIndices.includes(index);

        // Highlight active ad
        if (isActive) {
            adLinkItem.classList.add('active-ad');
        }

        const adLinkUrl = document.createElement('div');
        adLinkUrl.className = 'ad-link-url';
        adLinkUrl.textContent = link;

        // Add "Active" indicator for active ads
        if (isActive) {
            const activeIndicator = document.createElement('span');
            activeIndicator.className = 'active-indicator';
            activeIndicator.textContent = ' (ACTIVE)';
            adLinkUrl.appendChild(activeIndicator);
        }

        // Create controls container
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'ad-link-controls';

        // Add a "Toggle Active" button for all ads
        const toggleActiveBtn = document.createElement('button');
        toggleActiveBtn.className = isActive ? 'toggle-active-btn active' : 'toggle-active-btn';
        toggleActiveBtn.textContent = isActive ? 'Deactivate' : 'Activate';
        toggleActiveBtn.addEventListener('click', () => {
            // Toggle this ad's active state
            let activeIndices = [];
            try {
                const storedIndices = localStorage.getItem('activeAdIndices');
                if (storedIndices) {
                    activeIndices = JSON.parse(storedIndices);
                }
            } catch (e) {
                console.error("Error loading active indices:", e);
                activeIndices = [];
            }

            if (isActive) {
                // Remove this index if it's active
                activeIndices = activeIndices.filter(i => i !== index);
                // Make sure we have at least one active ad
                if (activeIndices.length === 0 && adLinks.length > 0) {
                    // If removing the last active ad, activate the next one
                    const nextIndex = (index + 1) % adLinks.length;
                    activeIndices.push(nextIndex);
                }
            } else {
                // Add this index if it's not active
                if (!activeIndices.includes(index)) {
                    activeIndices.push(index);
                }
            }

            // Save the updated indices
            localStorage.setItem('activeAdIndices', JSON.stringify(activeIndices));

            // For backward compatibility
            if (activeIndices.length > 0) {
                localStorage.setItem('lastDisplayedAdIndex', activeIndices[0].toString());
            }

            // Refresh the display
            displayAdLinks();
        });
        controlsContainer.appendChild(toggleActiveBtn);

        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-ad-btn';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.dataset.index = index;
        deleteBtn.addEventListener('click', () => showDeleteConfirmation('ad', index));
        controlsContainer.appendChild(deleteBtn);

        adLinkItem.appendChild(adLinkUrl);
        adLinkItem.appendChild(controlsContainer);
        adLinksList.appendChild(adLinkItem);
    });

    // Add save button below the list
    const saveButtonContainer = document.createElement('div');
    saveButtonContainer.className = 'save-active-links-container';

    const saveActiveButton = document.createElement('button');
    saveActiveButton.className = 'save-active-btn';
    saveActiveButton.textContent = 'Save Active Links';
    saveActiveButton.addEventListener('click', () => {
        const activeIndices = [];

        // Get all active ads
        document.querySelectorAll('.ad-link-item.active-ad').forEach((item, idx) => {
            // Find the index from the delete button's dataset
            const deleteBtn = item.querySelector('.delete-ad-btn');
            if (deleteBtn && deleteBtn.dataset.index) {
                const index = parseInt(deleteBtn.dataset.index);
                if (!isNaN(index)) {
                    activeIndices.push(index);
                }
            }
        });

        // If no active ads, activate all
        if (activeIndices.length === 0 && adLinks.length > 0) {
            for (let i = 0; i < adLinks.length; i++) {
                activeIndices.push(i);
            }
        }

        // Save to localStorage
        localStorage.setItem('activeAdIndices', JSON.stringify(activeIndices));
        console.log("Saved active indices:", activeIndices);

        // For backward compatibility
        if (activeIndices.length > 0) {
            localStorage.setItem('lastDisplayedAdIndex', activeIndices[0].toString());
        }

        // Show confirmation
        alert('Active links saved successfully!');

        // Refresh the display
        displayAdLinks();
    });

    saveButtonContainer.appendChild(saveActiveButton);
    adLinksList.parentNode.appendChild(saveButtonContainer);

    // Also add an "Activate All" button
    const activateAllContainer = document.createElement('div');
    activateAllContainer.className = 'activate-all-container';

    const activateAllButton = document.createElement('button');
    activateAllButton.className = 'activate-all-btn';
    activateAllButton.textContent = 'Activate All Links';
    activateAllButton.addEventListener('click', () => {
        // Activate all links
        const allIndices = Array.from({ length: adLinks.length }, (_, i) => i);

        // Save to localStorage
        localStorage.setItem('activeAdIndices', JSON.stringify(allIndices));
        console.log("Activated all links:", allIndices);

        // For backward compatibility
        if (allIndices.length > 0) {
            localStorage.setItem('lastDisplayedAdIndex', allIndices[0].toString());
        }

        // Show confirmation
        alert('All links activated successfully!');

        // Refresh the display
        displayAdLinks();
    });

    activateAllContainer.appendChild(activateAllButton);
    adLinksList.parentNode.appendChild(activateAllContainer);
}

// Display images in the UI with improved error handling
function displayImages(imagesList) {
    console.log("Displaying images, count:", imagesList ? imagesList.length : 0);

    // Clear the grid
    imagePreviewGrid.innerHTML = '';

    // Show message if no images
    if (!imagesList || imagesList.length === 0) {
        const noImagesMessage = document.createElement('div');
        noImagesMessage.className = 'no-items-message';
        noImagesMessage.textContent = 'No images added yet.';
        imagePreviewGrid.appendChild(noImagesMessage);
        return;
    }

    // Add each image to the grid
    imagesList.forEach((image, index) => {
        try {
            if (!image || !image.src) {
                console.warn(`Skipping invalid image at index ${index}`, image);
                return;
            }

            const imageItem = document.createElement('div');
            imageItem.className = 'image-preview-item';

            const img = document.createElement('img');
            img.src = image.src;
            img.alt = image.alt || 'Gallery Image';

            // Add error handling for image loading
            img.onerror = function () {
                this.src = 'Placeholder Images (for initial setup).png';
                this.alt = 'Image failed to load';
                console.warn(`Image failed to load: ${image.src}`);
            };

            // Generate a unique ID if none exists
            const imageId = image.id || `img_${index}_${Date.now()}`;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-image-btn';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.dataset.id = imageId;
            deleteBtn.addEventListener('click', () => showDeleteConfirmation('image', imageId));

            imageItem.appendChild(img);
            imageItem.appendChild(deleteBtn);
            imagePreviewGrid.appendChild(imageItem);
        } catch (error) {
            console.error(`Error displaying image at index ${index}:`, error);
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Add ad link button
    addAdLinkBtn.addEventListener('click', addAdLink);

    // Save ad settings button
    saveAdSettingsBtn.addEventListener('click', saveAdSettings);

    // Add reset to default links button to the page
    const adLinksContainer = document.querySelector('.ad-links-container');
    if (adLinksContainer) {
        // Create reset button container
        const resetButtonContainer = document.createElement('div');
        resetButtonContainer.className = 'reset-links-container';

        // Create reset button
        const resetButton = document.createElement('button');
        resetButton.id = 'reset-default-links';
        resetButton.className = 'reset-default-btn';
        resetButton.textContent = 'Reset to Default Links (4)';
        resetButton.addEventListener('click', () => {
            if (confirm('This will reset to the 4 default ad links. Continue?')) {
                resetToDefaultLinks();
                alert('Reset complete! All 4 default links are now active.');
            }
        });

        resetButtonContainer.appendChild(resetButton);

        // Add to page before the ad links list
        if (adLinksList.parentNode) {
            adLinksList.parentNode.insertBefore(resetButtonContainer, adLinksList);
        } else {
            adLinksContainer.appendChild(resetButtonContainer);
        }
    }

    // Add image via URL button
    addImageUrlBtn.addEventListener('click', addImageFromUrl);

    // File input change
    imageFileInput.addEventListener('change', handleFileSelection);

    // Delete confirmation buttons
    confirmDeleteBtn.addEventListener('click', confirmDelete);
    cancelDeleteBtn.addEventListener('click', cancelDelete);

    // Enter key for new ad link
    newAdLinkInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            addAdLink();
        }
    });

    // Enter key for image URL
    imageUrlInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            addImageFromUrl();
        }
    });
}

// Add a new ad link
async function addAdLink() {
    const newLink = newAdLinkInput.value.trim();

    if (newLink) {
        // Simple URL validation - support links with or without http/https prefix
        let formattedLink = newLink;
        if (!newLink.startsWith('http://') && !newLink.startsWith('https://')) {
            formattedLink = 'https://' + newLink;
        }

        try {
            // Show loading indicator
            newAdLinkInput.disabled = true;
            addAdLinkBtn.textContent = "Saving...";
            addAdLinkBtn.disabled = true;

            console.log("Adding new ad link:", formattedLink);

            // Add to array
            adLinks.push(formattedLink);

            // First ensure it's saved to localStorage (most reliable)
            localStorage.setItem('adLinks', JSON.stringify(adLinks));
            console.log("Ad links saved to localStorage:", adLinks);

            // Try to save to Firebase in the background, but don't let failures block the operation
            try {
                await firebaseStorage.saveAdLinks(adLinks);
                console.log("Ad links also saved to Firebase");
            } catch (firebaseError) {
                console.warn("Failed to save to Firebase, but localStorage succeeded:", firebaseError);
            }

            // Update UI
            displayAdLinks();

            // Clear input and show success message
            newAdLinkInput.value = '';
            alert("Ad link added successfully!");
        } catch (error) {
            console.error("Error saving ad link:", error);
            alert("Error saving ad link: " + error.message);
        } finally {
            // Reset UI elements
            newAdLinkInput.disabled = false;
            addAdLinkBtn.textContent = "Add Link";
            addAdLinkBtn.disabled = false;
        }
    } else {
        alert("Please enter a link");
    }
}

// Save ad settings
async function saveAdSettings() {
    let frequency = parseInt(adFrequencyInput.value);

    // Validate frequency (minimum 5 seconds)
    if (isNaN(frequency) || frequency < 5) {
        alert('Please enter a valid frequency of at least 5 seconds.');
        adFrequencyInput.value = adFrequency / 1000;
        return;
    }

    // Convert seconds to milliseconds
    adFrequency = frequency * 1000;

    try {
        // Save to Firebase
        await firebaseStorage.saveAdFrequency(adFrequency);

        // Backup to localStorage for fallback
        localStorage.setItem('adFrequency', adFrequency.toString());

        // Show success message
        alert('Ad settings saved successfully!');
    } catch (error) {
        console.error("Error saving ad frequency:", error);
        alert("Error saving ad settings. Please try again.");
    }
}

// Add image from URL - fully rewritten for maximum reliability
async function addImageFromUrl() {
    const imageUrl = imageUrlInput.value.trim();

    if (!imageUrl) {
        alert('Please enter an image URL');
        return;
    }

    // Simple URL validation
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        alert('Please enter a valid URL starting with http:// or https://');
        return;
    }

    // Show loading indicator
    imageUrlInput.disabled = true;
    addImageUrlBtn.disabled = true;
    addImageUrlBtn.textContent = "Adding...";
    console.log("Attempting to add image from URL:", imageUrl);

    try {
        // STEP 1: Test if the image URL is valid by creating an image element
        try {
            const img = new Image();
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error("Image loading timed out")), 10000);
                img.onload = function () {
                    clearTimeout(timeout);
                    resolve();
                };
                img.onerror = function () {
                    clearTimeout(timeout);
                    reject(new Error("Image couldn't be loaded from URL"));
                };
                img.src = imageUrl;
            });
            console.log("Image URL validated successfully");
        } catch (imgError) {
            console.error("Image validation failed:", imgError);
            throw new Error(`URL validation failed: ${imgError.message}. Please make sure it points directly to an image file.`);
        }

        // STEP 2: Save image to localStorage (this is the most reliable method)
        try {
            // Get existing images
            let localImages = [];
            try {
                const storedImages = localStorage.getItem('images');
                if (storedImages) {
                    localImages = JSON.parse(storedImages);
                }
            } catch (parseError) {
                console.error("Error parsing localStorage images:", parseError);
                localImages = [];
            }

            // Add the new image with timestamp
            const newImage = {
                src: imageUrl,
                createdAt: new Date().toISOString(),
                id: 'local_' + Date.now()
            };

            localImages.push(newImage);

            // Save to localStorage
            localStorage.setItem('images', JSON.stringify(localImages));
            console.log("Image saved to localStorage successfully");

            // Update the images array and display
            images = localImages;
            displayImages(images);

            // Clear input field
            imageUrlInput.value = '';

            // Show success message
            alert('Image added successfully!');

            // STEP 3: Try to save to Firebase in the background (non-blocking)
            setTimeout(async () => {
                try {
                    await firebaseStorage.saveImage(imageUrl, true);
                    console.log("Image also saved to Firebase");
                } catch (firebaseError) {
                    console.warn("Firebase save failed (background):", firebaseError);
                    // This is just a background save, so we don't need to alert the user
                }
            }, 100);
        } catch (localStorageError) {
            console.error("Error saving to localStorage:", localStorageError);
            throw new Error("Error saving image. Storage failed.");
        }
    } catch (error) {
        console.error("Error adding image:", error);
        alert(error.message || "Error adding image. Please try again.");
    } finally {
        // Reset the UI elements
        imageUrlInput.disabled = false;
        addImageUrlBtn.disabled = false;
        addImageUrlBtn.textContent = "Add Image";
    }
}

// Handle file selection for image upload
async function handleFileSelection() {
    const files = imageFileInput.files;

    if (files.length > 0) {
        // Update selected files text
        selectedFilesDiv.textContent = `${files.length} file(s) selected`;

        try {
            // Process each file
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // Check if it's an image
                if (!file.type.startsWith('image/')) {
                    alert(`File '${file.name}' is not an image and will be skipped.`);
                    continue;
                }

                // Update status
                selectedFilesDiv.textContent = `Uploading file ${i + 1} of ${files.length}...`;

                // Convert to data URL
                const dataUrl = await readFileAsDataURL(file);

                // Save to Firebase
                await firebaseStorage.saveImage(dataUrl);
            }

            // Reset status
            selectedFilesDiv.textContent = "Upload complete!";

            // Reset file input
            imageFileInput.value = '';

            // Reload images
            await loadImagesFromFirebase();
        } catch (error) {
            console.error("Error processing files:", error);
            selectedFilesDiv.textContent = "Error uploading files. Please try again.";
        }
    }
}

// Read file as data URL (promise-based)
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e);
        reader.readAsDataURL(file);
    });
}

// Show delete confirmation modal
function showDeleteConfirmation(type, id) {
    deleteItemType = type;
    deleteItemId = id;

    // Update modal text based on item type
    const modalText = document.querySelector('#delete-confirmation p');
    if (type === 'ad') {
        modalText.textContent = `Are you sure you want to delete this ad link?`;
    } else {
        modalText.textContent = `Are you sure you want to delete this image?`;
    }

    // Show modal
    deleteConfirmation.style.display = 'block';
}

// Confirm delete action
async function confirmDelete() {
    try {
        if (deleteItemType === 'ad' && Number.isInteger(deleteItemId) && deleteItemId >= 0 && deleteItemId < adLinks.length) {
            // Remove ad link
            adLinks.splice(deleteItemId, 1);

            // Save to Firebase
            await firebaseStorage.saveAdLinks(adLinks);

            // Backup to localStorage
            localStorage.setItem('adLinks', JSON.stringify(adLinks));

            // Update UI
            displayAdLinks();
        } else if (deleteItemType === 'image') {
            if (typeof deleteItemId === 'string') {
                // It's a Firebase document ID
                await firebaseStorage.deleteImage(deleteItemId);
            } else {
                // It's an index for localStorage fallback
                images.splice(deleteItemId, 1);
                localStorage.setItem('images', JSON.stringify(images));
            }

            // Reload images
            await loadImagesFromFirebase();
        }
    } catch (error) {
        console.error("Error deleting item:", error);
        alert("Error deleting item. Please try again.");
    }

    // Hide modal
    cancelDelete();
}

// Cancel delete action
function cancelDelete() {
    deleteConfirmation.style.display = 'none';
    deleteItemType = '';
    deleteItemId = null;
} 