/**
 * Trophies Shop - Main JavaScript
 * Handles product filtering, cart management, and checkout
 */

// Product Database - Will be loaded from API
let products = [];

// Get backend URL (auto-detect local vs production)
function getBackendUrl() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    return 'https://kg7kg65ok2hvfox6l4gtniqhsi0ckmox.lambda-url.ap-south-1.on.aws';
}

// Fetch trophies from MongoDB via backend API
async function loadTrophiesFromAPI() {
    try {
        const apiUrl = getBackendUrl() + '/api/trophies';
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.trophies && Array.isArray(data.trophies)) {
            products = data.trophies.map((trophy, index) => ({
                id: trophy._id || index,
                name: trophy.name,
                sport: trophy.category?.toLowerCase() || 'general',
                type: 'trophy', // Default type since API stores in category
                price: trophy.price,
                image: trophy.images && trophy.images.length > 0 ? trophy.images[0] : '/img/placeholder-trophy.png',
                images: trophy.images || [], // Store all images
                description: trophy.description,
                size: trophy.size,
                customizable: trophy.customizable,
                available: trophy.available
            }));
            console.log('Loaded trophies from API:', products);
        }
    } catch (error) {
        console.error('Error loading trophies from API:', error);
        // Fallback: if API fails, use empty array (will show no products)
        products = [];
    }
}

// State Management
let cart = JSON.parse(localStorage.getItem('dasportz_cart')) || [];
let currentFilters = {
    sport: 'all',
    type: 'all'
};

// Initialize

// Trophy Admin Add Form Logic
function setupTrophyAdminForm() {
    const adminSection = document.getElementById('trophyAdminSection');
    const addForm = document.getElementById('addTrophyForm');
    const statusDiv = document.getElementById('addTrophyStatus');
    const imagesInput = document.getElementById('trophyImagesInput');
    const imagePreview = document.getElementById('trophyImagePreview');

    // Check if staff user (check localStorage or sessionStorage)
    const isStaff = checkStaffStatus();
    if (isStaff && adminSection) {
        adminSection.style.display = 'block';
    }

    // Image preview handler
    if (imagesInput) {
        imagesInput.addEventListener('change', function (e) {
            imagePreview.innerHTML = '';
            const files = e.target.files;

            if (files.length > 0) {
                const previewContainer = document.createElement('div');
                previewContainer.className = 'row g-3 mb-3';

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];

                    // Validate file type
                    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
                    if (!validTypes.includes(file.type)) {
                        showStatus(`Invalid file type: ${file.name}. Only JPEG, PNG, WEBP, GIF allowed.`, 'danger');
                        continue;
                    }

                    // Validate file size (5MB)
                    if (file.size > 5 * 1024 * 1024) {
                        showStatus(`File too large: ${file.name}. Max 5MB per image.`, 'danger');
                        continue;
                    }

                    const reader = new FileReader();
                    reader.onload = function (event) {
                        const col = document.createElement('div');
                        col.className = 'col-md-6 col-lg-4';
                        col.innerHTML = `
                            <div class="card border-0 shadow-sm overflow-hidden">
                                <img src="${event.target.result}" class="card-img-top" style="height: 150px; object-fit: cover;" alt="${file.name}">
                                <div class="card-body p-2">
                                    <small class="text-muted d-block text-truncate">${file.name}</small>
                                    <small class="text-muted">${(file.size / 1024).toFixed(2)} KB</small>
                                </div>
                            </div>
                        `;
                        previewContainer.appendChild(col);
                    };
                    reader.readAsDataURL(file);
                }

                imagePreview.appendChild(previewContainer);
            }
        });
    }

    // Form submission
    if (addForm) {
        addForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // Validate required fields
            const name = addForm.querySelector('input[name="name"]').value.trim();
            const price = addForm.querySelector('input[name="price"]').value;
            const size = addForm.querySelector('input[name="size"]').value.trim();

            if (!name || !price || !size) {
                showStatus('Please fill in all required fields (Name, Price, Size).', 'danger');
                return;
            }

            // Create FormData
            const formData = new FormData(addForm);

            // Get images and append to FormData
            const images = imagesInput.files;
            for (let i = 0; i < images.length; i++) {
                formData.append('images', images[i]);
            }

            try {
                showStatus('Uploading trophy...', 'info');
                const apiUrl = getBackendUrl() + '/api/trophies';
                const res = await fetch(apiUrl, {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });

                const data = await res.json();

                if (res.ok && data.trophy) {
                    showStatus('Trophy added successfully! ID: ' + data.trophy._id, 'success');
                    addForm.reset();
                    imagePreview.innerHTML = '';

                    // Reload products after 2 seconds
                    setTimeout(() => {
                        location.reload();
                    }, 2000);
                } else {
                    showStatus(data.error || data.message || 'Failed to add trophy.', 'danger');
                }
            } catch (err) {
                showStatus('Error: ' + err.message, 'danger');
                console.error('Trophy upload error:', err);
            }
        });
    }

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `alert alert-${type}`;
        statusDiv.classList.remove('d-none');

        if (type === 'success') {
            setTimeout(() => {
                statusDiv.classList.add('d-none');
            }, 5000);
        }
    }
}

function checkStaffStatus() {
    // Check if user is logged in as staff
    // This checks sessionStorage/localStorage for staff token or status
    const staffUser = sessionStorage.getItem('staffUser') || localStorage.getItem('staffUser');
    return !!staffUser;
}

function getBackendUrl() {
    // Auto-detect backend URL
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    return 'https://kg7kg65ok2hvfox6l4gtniqhsi0ckmox.lambda-url.ap-south-1.on.aws';
}

document.addEventListener('DOMContentLoaded', async () => {
    // Load trophies from API first
    await loadTrophiesFromAPI();

    initializeFilters();
    displayProducts();
    updateCartUI();
    setupEventListeners();
    setupCustomizationModalHandlers();
});

/**
 * Setup handlers for customization modal
 */
function setupCustomizationModalHandlers() {
    // Logo preview in customization modal
    const customModalLogo = document.getElementById('customModalLogo');
    if (customModalLogo) {
        customModalLogo.addEventListener('change', function () {
            const preview = document.getElementById('customModalLogoPreview');
            const previewImg = document.getElementById('customModalLogoPreviewImg');

            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    previewImg.src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(this.files[0]);
            } else {
                preview.style.display = 'none';
            }
        });
    }

    // Close modal on backdrop click
    document.getElementById('customizationModal')?.addEventListener('click', function (e) {
        if (e.target === this) {
            closeCustomizationModal();
        }
    });
}

/**
 * Initialize Filter Buttons
 */
function initializeFilters() {
    // Sport Filters
    document.querySelectorAll('#sportFilters .filter-chip').forEach(chip => {
        chip.addEventListener('click', function () {
            document.querySelectorAll('#sportFilters .filter-chip').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            currentFilters.sport = this.dataset.sport;
            displayProducts();
        });
    });

    // Type Filters
    document.querySelectorAll('#typeFilters .filter-chip').forEach(chip => {
        chip.addEventListener('click', function () {
            document.querySelectorAll('#typeFilters .filter-chip').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            currentFilters.type = this.dataset.type;
            displayProducts();
        });
    });
}

/**
 * Display Products based on filters
 */
function displayProducts() {
    const grid = document.getElementById('productsGrid');
    const loading = document.getElementById('loading');
    const noProducts = document.getElementById('noProducts');

    // Show loading
    loading.style.display = 'flex';
    grid.innerHTML = '';
    noProducts.classList.add('d-none');

    // Simulate loading delay for smooth UX
    setTimeout(() => {
        // Filter products
        let filtered = products.filter(product => {
            const sportMatch = currentFilters.sport === 'all' || product.sport === currentFilters.sport;
            const typeMatch = currentFilters.type === 'all' || product.type === currentFilters.type;
            return sportMatch && typeMatch;
        });

        loading.style.display = 'none';

        if (filtered.length === 0) {
            noProducts.classList.remove('d-none');
            return;
        }

        // Display products
        filtered.forEach((product, index) => {
            const col = document.createElement('div');
            col.className = 'col-lg-3 col-md-4 col-sm-6';
            col.style.animationDelay = `${index * 0.1}s`;

            const isSoldOut = !product.inventory || product.inventory <= 0;
            const soldOutClass = isSoldOut ? 'sold-out' : '';
            const buttonDisabled = isSoldOut ? 'disabled' : '';

            col.innerHTML = `
                <div class="product-card ${soldOutClass}" onclick="showProductImage('${product.id}')" style="cursor: pointer;">
                    <div class="product-image">
                        <img src="${product.image}" alt="${product.name}">
                        ${isSoldOut ? '<div class="sold-out-badge"><span>Sold Out</span></div>' : ''}
                    </div>
                    <div class="product-body">
                        <div class="product-title">${product.name}</div>
                        <div class="product-category">
                            <i class="bi bi-tag me-1"></i>${capitalizeFirst(product.sport)}
                        </div>
                        <div class="product-price">₹${product.price.toLocaleString('en-IN')}</div>
                        <div class="product-actions" onclick="event.stopPropagation();">
                            <button class="btn-buy-now ${buttonDisabled}" onclick="showCustomizationModal('${product.id}', 'buy')" title="Buy Now" ${buttonDisabled}>
                                <i class="bi bi-bag-check"></i>Buy
                            </button>
                            <button class="btn-add-cart ${buttonDisabled}" onclick="showCustomizationModal('${product.id}', 'add')" title="Add to Cart" ${buttonDisabled}>
                                <i class="bi bi-cart-plus"></i>Cart
                            </button>
                        </div>
                    </div>
                </div>
            `;

            grid.appendChild(col);
        });
    }, 300);
}

/**
 * Add product to cart
 */
function addToCart(productId, customization = null) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Check if product already in cart (without customization match)
    const existingItem = cart.find(item =>
        item.id === productId &&
        JSON.stringify(item.customization) === JSON.stringify(customization)
    );

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            ...product,
            quantity: 1,
            customization: customization
        });
    }

    // Save to localStorage
    localStorage.setItem('dasportz_cart', JSON.stringify(cart));

    // Update UI
    updateCartUI();
}

/**
 * Buy Now - Add to cart and open checkout
 */
function buyNow(productId, customization = null) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Add to cart
    addToCart(productId, customization);

    // Show success feedback
    showToast('Added to cart!');

    // Open cart sidebar
    document.getElementById('cartSidebar').classList.add('open');
    document.getElementById('cartOverlay').classList.add('show');
}

/**
 * Update Cart UI
 */
function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartBody = document.getElementById('cartBody');
    const cartFooter = document.getElementById('cartFooter');
    const cartTotal = document.getElementById('cartTotal');
    const modalTotal = document.getElementById('modalTotal');

    // Update cart count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;

    // Calculate total price
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = `₹${totalPrice.toLocaleString('en-IN')}`;
    modalTotal.textContent = `₹${totalPrice.toLocaleString('en-IN')}`;

    // Update checkout amounts if modal is open
    updateCheckoutAmounts();

    // Update cart body
    if (cart.length === 0) {
        cartBody.innerHTML = `
            <div class="empty-cart">
                <i class="bi bi-cart-x"></i>
                <h5>Your cart is empty</h5>
                <p class="text-muted">Add some awesome trophies!</p>
            </div>
        `;
        cartFooter.classList.add('d-none');
    } else {
        cartBody.innerHTML = cart.map(item => `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    ${item.customization ? `
                        <div class="text-muted small">
                            <i class="bi bi-palette"></i> Customized
                            ${item.customization.text ? `<br><small>Text: "${item.customization.text}"</small>` : ''}
                            ${item.customization.logoName ? `<br><small>Logo: ${item.customization.logoName}</small>` : ''}
                        </div>
                    ` : ''}
                    <div class="cart-item-price">₹${item.price.toLocaleString('en-IN')}</div>
                    <div class="cart-item-qty">
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, -1, ${JSON.stringify(item.customization).replace(/"/g, '&quot;')})">
                            <i class="bi bi-dash"></i>
                        </button>
                        <span class="fw-semibold">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, 1, ${JSON.stringify(item.customization).replace(/"/g, '&quot;')})">
                            <i class="bi bi-plus"></i>
                        </button>
                    </div>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart('${item.id}', ${JSON.stringify(item.customization).replace(/"/g, '&quot;')})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `).join('');
        cartFooter.classList.remove('d-none');
    }
}

/**
 * Update item quantity
 */
function updateQuantity(productId, change, customization = null) {
    const item = cart.find(i =>
        i.id === productId &&
        JSON.stringify(i.customization) === JSON.stringify(customization)
    );
    if (!item) return;

    item.quantity += change;

    if (item.quantity <= 0) {
        removeFromCart(productId, customization);
        return;
    }

    localStorage.setItem('dasportz_cart', JSON.stringify(cart));
    updateCartUI();
}

/**
 * Remove item from cart
 */
function removeFromCart(productId, customization = null) {
    cart = cart.filter(item =>
        !(item.id === productId &&
            JSON.stringify(item.customization) === JSON.stringify(customization))
    );
    localStorage.setItem('dasportz_cart', JSON.stringify(cart));
    updateCartUI();
    showToast('Item removed from cart');
}

/**
 * Quick view product
 */
function quickView(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    alert(`${product.name}\nSport: ${capitalizeFirst(product.sport)}\nType: ${capitalizeFirst(product.type)}\nPrice: ₹${product.price.toLocaleString('en-IN')}\n\nClick "Buy Now" to purchase!`);
}

// Store pending action for customization modal
let pendingCustomizationAction = null;

/**
 * Show customization modal before adding to cart
 */
function showCustomizationModal(productId, action = 'add') {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Store the action to perform after customization
    pendingCustomizationAction = { productId, action };

    // Populate modal with product info
    document.getElementById('customModalProductImage').src = product.image;
    document.getElementById('customModalProductName').textContent = product.name;
    document.getElementById('customModalProductDetails').textContent = `${capitalizeFirst(product.sport)} | ${capitalizeFirst(product.type)}`;
    document.getElementById('customModalProductPrice').textContent = `₹${product.price.toLocaleString('en-IN')}`;

    // Reset form
    document.getElementById('customModalText').value = '';
    document.getElementById('customModalLogo').value = '';
    document.getElementById('customModalLogoPreview').style.display = 'none';

    // Show modal
    document.getElementById('customizationModal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

/**
 * Close customization modal
 */
function closeCustomizationModal() {
    document.getElementById('customizationModal').classList.remove('show');
    document.body.style.overflow = 'auto';
    pendingCustomizationAction = null;
}

/**
 * Skip customization and add to cart
 */
function skipCustomization() {
    if (!pendingCustomizationAction) return;

    const { productId, action } = pendingCustomizationAction;
    closeCustomizationModal();

    if (action === 'buy') {
        buyNow(productId, null);
    } else {
        addToCart(productId, null);
        showToast('Added to cart!');
    }
}

/**
 * Confirm and add with customization
 */
function confirmCustomization() {
    if (!pendingCustomizationAction) return;

    const customText = document.getElementById('customModalText').value.trim();
    const customLogoInput = document.getElementById('customModalLogo');
    const customLogo = customLogoInput.files[0];

    // Create customization object
    const customization = (customText || customLogo) ? {
        text: customText || null,
        logoName: customLogo ? customLogo.name : null
    } : null;

    const { productId, action } = pendingCustomizationAction;
    closeCustomizationModal();

    if (action === 'buy') {
        buyNow(productId, customization);
    } else {
        addToCart(productId, customization);
        showToast(customization ? 'Added to cart with customization!' : 'Added to cart!');
    }
}

// Store current product for image navigation
let currentProductImage = null;
let currentImageIndex = 0;

/**
 * Show product image in modal
 */
function showProductImage(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Store current product and reset image index
    currentProductImage = product;
    currentImageIndex = 0;

    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalProductName = document.getElementById('modalProductName');
    const modalProductDetails = document.getElementById('modalProductDetails');

    // Get all images or fallback to single image
    const images = product.images && product.images.length > 0 ? product.images : [product.image];

    // Display first image
    modalImage.src = images[0];
    modalProductName.textContent = product.name;
    modalProductDetails.textContent = `${capitalizeFirst(product.sport)} | ${capitalizeFirst(product.type)} | ₹${product.price.toLocaleString('en-IN')}`;

    // Update image counter
    updateImageCounter();

    // Show/hide navigation buttons based on image count
    updateNavigationButtons();

    // Reset customization section
    document.getElementById('customizationSection').style.display = 'none';
    document.getElementById('customText').value = '';
    document.getElementById('customLogo').value = '';
    document.getElementById('logoPreview').style.display = 'none';
    document.getElementById('toggleCustomizationBtn').innerHTML = '<i class="bi bi-palette"></i> Add Customization';

    // Set up modal buttons
    document.getElementById('modalBuyNow').onclick = () => {
        const customization = getCustomization();
        closeImageModal();
        buyNow(productId, customization);
    };

    document.getElementById('modalAddToCart').onclick = () => {
        const customization = getCustomization();
        addToCart(productId, customization);
        showToast('Added to cart!');
        closeImageModal();
    };

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    // Add keyboard navigation support
    if (window.imageModalKeyListener) {
        document.removeEventListener('keydown', window.imageModalKeyListener);
    }

    window.imageModalKeyListener = (e) => {
        if (document.getElementById('imageModal').classList.contains('show')) {
            if (e.key === 'ArrowLeft') {
                previousImage();
            } else if (e.key === 'ArrowRight') {
                nextImage();
            } else if (e.key === 'Escape') {
                closeImageModal();
            }
        }
    };

    document.addEventListener('keydown', window.imageModalKeyListener);
}

/**
 * Navigate to previous image
 */
function previousImage() {
    if (!currentProductImage) return;

    const images = currentProductImage.images && currentProductImage.images.length > 0
        ? currentProductImage.images
        : [currentProductImage.image];

    if (currentImageIndex > 0) {
        currentImageIndex--;
        updateModalImage(images);
    }
}

/**
 * Navigate to next image
 */
function nextImage() {
    if (!currentProductImage) return;

    const images = currentProductImage.images && currentProductImage.images.length > 0
        ? currentProductImage.images
        : [currentProductImage.image];

    if (currentImageIndex < images.length - 1) {
        currentImageIndex++;
        updateModalImage(images);
    }
}

/**
 * Update modal image display
 */
function updateModalImage(images) {
    const modalImage = document.getElementById('modalImage');
    modalImage.src = images[currentImageIndex];
    updateImageCounter();
    updateNavigationButtons();
}

/**
 * Update image counter text
 */
function updateImageCounter() {
    if (!currentProductImage) return;

    const images = currentProductImage.images && currentProductImage.images.length > 0
        ? currentProductImage.images
        : [currentProductImage.image];

    const counter = document.getElementById('imageCounter');
    counter.textContent = `${currentImageIndex + 1} of ${images.length}`;
}

/**
 * Update navigation button states
 */
function updateNavigationButtons() {
    if (!currentProductImage) return;

    const images = currentProductImage.images && currentProductImage.images.length > 0
        ? currentProductImage.images
        : [currentProductImage.image];

    const prevBtn = document.getElementById('imagePrevBtn');
    const nextBtn = document.getElementById('imageNextBtn');

    // Show/hide buttons based on image count
    if (images.length <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        document.getElementById('imageCounter').style.display = 'none';
    } else {
        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';
        document.getElementById('imageCounter').style.display = 'block';

        // Disable buttons at boundaries
        prevBtn.disabled = currentImageIndex === 0;
        nextBtn.disabled = currentImageIndex === images.length - 1;
    }
}

/**
 * Close image modal
 */
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';

    // Clean up keyboard listener
    if (window.imageModalKeyListener) {
        document.removeEventListener('keydown', window.imageModalKeyListener);
        window.imageModalKeyListener = null;
    }

    // Reset current product
    currentProductImage = null;
    currentImageIndex = 0;
}

/**
 * Toggle customization section
 */
function toggleCustomization() {
    const section = document.getElementById('customizationSection');
    const btn = document.getElementById('toggleCustomizationBtn');

    if (section.style.display === 'none') {
        section.style.display = 'block';
        btn.innerHTML = '<i class="bi bi-x-circle"></i> Hide Customization';
    } else {
        section.style.display = 'none';
        btn.innerHTML = '<i class="bi bi-palette"></i> Add Customization';
    }
}

/**
 * Get customization data
 */
function getCustomization() {
    const customText = document.getElementById('customText').value.trim();
    const customLogoInput = document.getElementById('customLogo');
    const logoFile = customLogoInput.files[0];

    if (!customText && !logoFile) {
        return null;
    }

    const customization = {};

    if (customText) {
        customization.text = customText;
    }

    if (logoFile) {
        customization.logoName = logoFile.name;
        // In production, you would upload the file to a server here
        // For now, we'll just store the filename
    }

    return customization;
}

// Logo preview handler
document.addEventListener('DOMContentLoaded', () => {
    const logoInput = document.getElementById('customLogo');
    if (logoInput) {
        logoInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    document.getElementById('logoPreviewImg').src = e.target.result;
                    document.getElementById('logoPreview').style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                document.getElementById('logoPreview').style.display = 'none';
            }
        });
    }
});

// Close modal on clicking outside the image
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.addEventListener('click', function (event) {
            if (event.target === modal) {
                closeImageModal();
            }
        });
    }
});

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
    // Cart Toggle
    document.getElementById('cartToggle').addEventListener('click', () => {
        document.getElementById('cartSidebar').classList.add('open');
        document.getElementById('cartOverlay').classList.add('show');
    });

    // Close Cart
    document.getElementById('cartClose').addEventListener('click', closeCart);
    document.getElementById('cartOverlay').addEventListener('click', closeCart);

    // Payment Method Selection
    document.querySelectorAll('.payment-option').forEach(option => {
        option.addEventListener('click', function () {
            document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
        });
    });

    // Payment Amount Selection (Full vs 50-50)
    document.querySelectorAll('.payment-amount-option input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', function () {
            document.querySelectorAll('.payment-amount-option').forEach(o => o.classList.remove('selected'));
            this.closest('.payment-amount-option').classList.add('selected');
            updateCheckoutAmounts();
        });
    });

    // Delivery Option Selection (Pickup vs Delivery)
    document.querySelectorAll('.delivery-option input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', function () {
            document.querySelectorAll('.delivery-option').forEach(o => o.classList.remove('selected'));
            this.closest('.delivery-option').classList.add('selected');
            updateDeliveryOption();
        });
    });

    // Initialize first payment amount option as selected
    if (document.getElementById('paymentFull')) {
        document.getElementById('paymentFull').checked = true;
        document.getElementById('paymentFull').closest('.payment-amount-option').classList.add('selected');
        updateCheckoutAmounts();
    }

    // Initialize first delivery option as selected
    if (document.getElementById('deliveryPickup')) {
        document.getElementById('deliveryPickup').checked = true;
        document.getElementById('deliveryPickup').closest('.delivery-option').classList.add('selected');
        updateDeliveryOption();
    }

    // Checkout Form
    document.getElementById('checkoutForm').addEventListener('submit', handleCheckout);
}

/**
 * Close cart sidebar
 */
function closeCart() {
    document.getElementById('cartSidebar').classList.remove('open');
    document.getElementById('cartOverlay').classList.remove('show');
}

/**
 * Update checkout amounts based on payment amount option
 */
function updateCheckoutAmounts() {
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const selectedAmount = document.querySelector('input[name="paymentAmount"]:checked');
    const deliveryOption = document.querySelector('input[name="deliveryOption"]:checked');
    
    if (!selectedAmount) return;

    // Delivery charges will be calculated by porter based on location
    const subtotal = totalAmount;

    const fullAmountDisplay = document.getElementById('fullAmountDisplay');
    const advanceAmountDisplay = document.getElementById('advanceAmountDisplay');
    const dueAmountDisplay = document.getElementById('dueAmountDisplay');
    const modalTotal = document.getElementById('modalTotal');

    if (selectedAmount.value === 'full') {
        fullAmountDisplay.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
        modalTotal.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
    } else {
        const advanceAmount = Math.ceil(subtotal / 2);
        const dueAmount = subtotal - advanceAmount;
        advanceAmountDisplay.textContent = `₹${advanceAmount.toLocaleString('en-IN')}`;
        dueAmountDisplay.textContent = `₹${dueAmount.toLocaleString('en-IN')}`;
        modalTotal.textContent = `₹${advanceAmount.toLocaleString('en-IN')}`;
    }
}

/**
 * Update delivery option and address field requirements
 */
function updateDeliveryOption() {
    const deliveryOption = document.querySelector('input[name="deliveryOption"]:checked');
    const addressFieldWrapper = document.getElementById('addressFieldWrapper');
    const deliveryAddress = document.getElementById('deliveryAddress');
    const addressRequired = document.getElementById('addressRequired');
    const addressHint = document.getElementById('addressHint');
    const deliveryNoteHint = document.getElementById('deliveryNoteHint');
    const addressLabel = document.getElementById('addressLabel');

    if (deliveryOption && deliveryOption.value === 'delivery') {
        // Delivery selected - show address field and make it required
        addressFieldWrapper.style.display = 'block';
        deliveryAddress.setAttribute('required', 'required');
        addressRequired.textContent = '*';
        addressHint.textContent = 'Required for home delivery';
        deliveryNoteHint.style.display = 'block';
        addressLabel.innerHTML = 'Delivery Address <span id="addressRequired">*</span>';
    } else {
        // Pickup selected - hide address field and make it optional
        addressFieldWrapper.style.display = 'none';
        deliveryAddress.removeAttribute('required');
        addressRequired.textContent = '';
        addressHint.textContent = 'Not required for pickup';
        deliveryNoteHint.style.display = 'none';
        addressLabel.innerHTML = 'Delivery Address (Optional)';
    }

    // Update checkout amounts
    updateCheckoutAmounts();
}

/**
 * Handle Checkout
 */
function handleCheckout(e) {
    e.preventDefault();

    const selectedPayment = document.querySelector('.payment-option.selected');
    if (!selectedPayment) {
        alert('Please select a payment method');
        return;
    }

    const selectedAmount = document.querySelector('input[name="paymentAmount"]:checked');
    if (!selectedAmount) {
        alert('Please select payment amount');
        return;
    }

    const deliveryOption = document.querySelector('input[name="deliveryOption"]:checked');
    if (!deliveryOption) {
        alert('Please select delivery option');
        return;
    }

    const deliveryAddress = document.getElementById('deliveryAddress');
    if (deliveryOption.value === 'delivery' && !deliveryAddress.value.trim()) {
        alert('Please enter your delivery address');
        return;
    }

    const paymentMethod = selectedPayment.dataset.payment;
    const paymentAmount = selectedAmount.value;
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    // Delivery charges will be collected by porter based on location
    const subtotal = totalAmount;
    
    let amountToProcess = subtotal;
    let paymentDescription = `Order Total: ₹${totalAmount.toLocaleString('en-IN')}`;
    
    if (deliveryOption.value === 'delivery') {
        paymentDescription += `\nDelivery: Charges as per location (to be collected by porter)`;
    }
    paymentDescription += `\nPayment Amount: ₹${subtotal.toLocaleString('en-IN')}`;
    
    if (paymentAmount === 'half') {
        amountToProcess = Math.ceil(subtotal / 2);
        const dueAmount = subtotal - amountToProcess;
        paymentDescription += `\nAdvance (50%): ₹${amountToProcess.toLocaleString('en-IN')}\nDue on Pickup/Dispatch: ₹${dueAmount.toLocaleString('en-IN')}`;
    }

    // Prepare order data
    const orderData = {
        items: cart,
        productTotal: totalAmount,
        total: subtotal,
        deliveryOption: deliveryOption.value,
        deliveryAddress: deliveryAddress.value || null,
        deliveryCharges: deliveryOption.value === 'delivery' ? 'To be calculated by porter' : null,
        paymentAmount: paymentAmount,
        advanceAmount: paymentAmount === 'half' ? amountToProcess : null,
        dueAmount: paymentAmount === 'half' ? (subtotal - amountToProcess) : null,
        paymentMethod: paymentMethod,
        timestamp: new Date().toISOString()
    };

    // Decrease inventory for each item in cart
    const inventoryUpdates = cart.map(item => ({
        trophyId: item.id,
        quantity: item.quantity
    }));

    // Send inventory updates to backend
    Promise.all(inventoryUpdates.map(update => 
        fetch(`${getBackendUrl()}/api/trophies/${update.trophyId}/decrease-inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: update.quantity })
        }).catch(err => console.warn('Failed to update inventory:', err))
    ));

    if (paymentMethod === 'online') {
        // Redirect to payment page (you can integrate Razorpay or other gateway)
        alert(`Redirecting to online payment gateway...\n${paymentDescription}`);
        // In production, you would redirect to payment-success.html or similar
        window.location.href = 'payment-success.html';
    } else {
        // Pay At Outlet
        const deliveryInfo = deliveryOption.value === 'delivery' 
            ? `\nDelivery Address: ${deliveryAddress.value}`
            : '\nPickup from our store';
        
        const message = `Order placed successfully!\nPayment Method: Pay At Outlet\n${paymentDescription}${deliveryInfo}\n\nWe'll contact you shortly!`;
        
        alert(message);

        // Clear cart
        cart = [];
        localStorage.setItem('dasportz_cart', JSON.stringify(cart));
        updateCartUI();
        closeCart();

        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('checkoutModal')).hide();

        // Redirect to order confirmation
        setTimeout(() => {
            window.location.href = 'order-accepted.html';
        }, 1500);
    }
}

/**
 * Show toast notification
 */
function showToast(message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease-out;
    `;
    toast.innerHTML = `<i class="bi bi-check-circle me-2"></i>${message}`;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

/**
 * Utility: Capitalize first letter
 */
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Make functions globally accessible
window.addToCart = addToCart;
window.buyNow = buyNow;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.quickView = quickView;
window.showProductImage = showProductImage;
window.closeImageModal = closeImageModal;
window.toggleCustomization = toggleCustomization;
window.previousImage = previousImage;
window.nextImage = nextImage;
