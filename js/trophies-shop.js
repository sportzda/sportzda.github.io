/**
 * Trophies Shop - Main JavaScript
 * Handles product filtering, cart management, and checkout
 */

// Backend API Configuration (loaded from config.js)
const BACKEND_BASE = window.CONFIG?.BACKEND_BASE || 'http://localhost:3000';
const ZOHO_WIDGET_API_KEY = window.CONFIG?.ZOHO_WIDGET_API_KEY;

// Product Database - will be loaded from API
let products = [];

// State Management
let cart = JSON.parse(localStorage.getItem('dasportz_cart')) || [];
let currentFilters = {
    sport: 'all'
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    initializeFilters();
    initializeMobileFilters();
    await loadProducts();
    displayProducts();
    updateCartUI();
    setupEventListeners();
    setupCustomizationModalHandlers();
});

/**
 * Load products from backend API
 */
async function loadProducts() {
    const grid = document.getElementById('productsGrid');
    const loading = document.getElementById('loading');

    try {
        loading.style.display = 'flex';
        if (grid) grid.innerHTML = '';

        const response = await fetch(`${BACKEND_BASE}/api/trophies`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.trophies && data.trophies.length > 0) {
            // Map backend trophy format to frontend product format
            products = data.trophies.map(trophy => ({
                id: trophy._id || trophy.id,
                name: trophy.name,
                sport: Array.isArray(trophy.category) ? trophy.category : (trophy.category ? [trophy.category] : (trophy.sport ? [trophy.sport] : ['general'])),
                type: trophy.size || trophy.type || 'trophy',
                price: trophy.price,
                image: trophy.imageUrl || trophy.image || 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400',
                images: trophy.images && Array.isArray(trophy.images) ? trophy.images : (trophy.imageUrl ? [trophy.imageUrl] : []), // Store all images for badge display
                customizable: trophy.customizable !== false,
                available: trophy.available !== false,
                inventory: trophy.inventory || 0,
                description: trophy.description || ''
            })).filter(p => p.available);
            console.log(`Loaded ${products.length} products from API`);
        } else {
            console.warn('No products from API');
            products = [];
        }
    } catch (error) {
        console.error('Failed to load products from API:', error);
        products = [];
        showToast('Unable to load products. Please try again later.', 'error');
    } finally {
        loading.style.display = 'none';
    }
}

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

    // Type Filters Removed
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
            const sport = currentFilters.sport;
            if (sport === 'all') return true;

            // Handle both string (legacy) and array (new) formats for product.sport
            if (Array.isArray(product.sport)) {
                return product.sport.includes(sport);
            }
            return product.sport === sport;
        });

        loading.style.display = 'none';

        if (filtered.length === 0) {
            noProducts.classList.remove('d-none');
            return;
        }

        // Display products
        filtered.forEach((product, index) => {
            const col = document.createElement('div');
            col.className = 'col-lg-3 col-md-4 col-sm-6 col-6';
            col.style.animationDelay = `${index * 0.1}s`;

            // Use string quotes for product.id to handle MongoDB ObjectIds
            const pid = typeof product.id === 'string' ? `'${product.id}'` : product.id;

            // Check inventory
            const inventory = parseInt(product.inventory) || 0;
            const isSoldOut = inventory === 0;
            // Easy to understand language
            const inventoryDisplay = isSoldOut ? 'SOLD OUT' : `${inventory} available`;
            const inventoryBadgeClass = isSoldOut ? 'inventory-sold-out' : 'inventory-in-stock';

            col.innerHTML = `
                <div class="product-card ${isSoldOut ? 'sold-out' : ''}" onclick="${isSoldOut ? "event.preventDefault(); showToast('This item is sold out', 'error'); return false;" : `showProductImage(${pid})`}" style="cursor: ${isSoldOut ? 'not-allowed' : 'pointer'}; ${isSoldOut ? 'pointer-events: none;' : ''}">
                    <div class="product-image" style="position: relative;">
                        <img src="${product.image}" alt="${product.name}" ${isSoldOut ? 'style="opacity: 0.65;"' : ''}>
                        ${isSoldOut ? '<div class="sold-out-overlay-badge">SOLD OUT</div>' : ''}
                        ${product.images && product.images.length > 1 ? `
                            <span class="product-badge"><i class="bi bi-images me-1"></i>+${product.images.length - 1}</span>
                        ` : ''}
                    </div>
                    <div class="product-body">
                        <div class="product-title">${product.name}</div>
                        <div class="product-category">
                            <i class="bi bi-tag me-1"></i>${Array.isArray(product.sport) ? product.sport.map(s => capitalizeFirst(s)).join(', ') : capitalizeFirst(product.sport)}
                        </div>
                        <div class="product-inventory ${inventoryBadgeClass}">
                            <i class="bi ${isSoldOut ? 'bi-exclamation-circle' : 'bi-check-circle'} me-1"></i>${inventoryDisplay}
                        </div>
                        <div class="product-price">₹${product.price.toLocaleString('en-IN')}</div>
                        <div class="product-actions" onclick="event.stopPropagation();">
                            <button class="btn-buy-now" onclick="showCustomizationModal(${pid}, 'buy')" ${isSoldOut ? 'disabled' : ''} title="${isSoldOut ? 'Out of stock' : ''}">
                                Buy
                            </button>
                            <button class="btn-add-cart" onclick="showCustomizationModal(${pid}, 'add')" ${isSoldOut ? 'disabled' : ''} title="${isSoldOut ? 'Out of stock' : ''}">
                                Cart
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
    if (!product) return false;

    // Check inventory
    const inventory = product.inventory || 0;
    if (inventory === 0) {
        showToast(`"${product.name}" is currently out of stock`, 'error');
        return false;
    }

    // Check if product already in cart (without customization match)
    const existingItem = cart.find(item =>
        item.id === productId &&
        JSON.stringify(item.customization) === JSON.stringify(customization)
    );

    if (existingItem) {
        // Check if quantity would exceed inventory
        if (existingItem.quantity + 1 > inventory) {
            showToast(`Only ${inventory} "${product.name}" available`, 'error');
            return false;
        }
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
    return true;
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

// Store applied coupon globally
let appliedCoupon = null;

/**
 * Update Cart UI
 */
function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartBody = document.getElementById('cartBody');
    const cartFooter = document.getElementById('cartFooter');
    const cartTotal = document.getElementById('cartTotal');

    // Update cart count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;

    // Calculate total price
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = `₹${totalPrice.toLocaleString('en-IN')}`;

    // Update checkout modal totals
    updateCheckoutTotals();

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
        cartBody.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    ${item.customization ? `
                        <div class="text-muted small">
                            <i class="bi bi-palette"></i> Customized
                            ${item.customization.text ? `<br><small>Text: "${item.customization.text}"</small>` : ''}
                            ${item.customization.logoFileName ? `<br><small>Logo: ${item.customization.logoFileName}</small>` : ''}
                            ${item.customization.logoUrl ? `<br><small><i class="bi bi-cloud-check-fill" style="color: green;"></i> Uploaded</small>` : ''}
                        </div>
                    ` : ''}
                    <div class="cart-item-price">₹${item.price.toLocaleString('en-IN')}</div>
                    <div class="cart-item-qty">
                        <button class="qty-btn" onclick="updateQuantityByIndex(${index}, -1)">
                            <i class="bi bi-dash"></i>
                        </button>
                        <span class="fw-semibold">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantityByIndex(${index}, 1)">
                            <i class="bi bi-plus"></i>
                        </button>
                    </div>
                </div>
                <button class="cart-item-remove" onclick="removeFromCartByIndex(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `).join('');
        cartFooter.classList.remove('d-none');
    }
}

/**
 * Update item quantity by cart index
 */
function updateQuantityByIndex(index, change) {
    if (index < 0 || index >= cart.length) return;

    cart[index].quantity += change;

    if (cart[index].quantity <= 0) {
        removeFromCartByIndex(index);
        return;
    }

    localStorage.setItem('dasportz_cart', JSON.stringify(cart));
    updateCartUI();
}

/**
 * Remove item from cart by index
 */
function removeFromCartByIndex(index) {
    if (index < 0 || index >= cart.length) return;
    cart.splice(index, 1);
    localStorage.setItem('dasportz_cart', JSON.stringify(cart));
    updateCartUI();
    showToast('Item removed from cart');
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
 * Upload customization logo to cloud storage
 * Returns: { success: true, imageUrl: "s3-url" } or { success: false, message: "error" }
 */
async function uploadCustomizationLogo(logoFile) {
    try {
        if (!logoFile) {
            return { success: true, imageUrl: null }; // No logo provided
        }

        console.log('Uploading customization logo:', logoFile.name);
        const formData = new FormData();
        formData.append('logo', logoFile);

        const response = await fetch(`${window.CONFIG.BACKEND_BASE}/api/upload-trophy-customization`, {
            method: 'POST',
            body: formData
            // Don't set Content-Type header - browser will set it with boundary
        });

        const data = await response.json();
        console.log('Logo upload response:', data);

        if (!response.ok || !data.success) {
            return {
                success: false,
                message: data.message || 'Failed to upload logo'
            };
        }

        return {
            success: true,
            imageUrl: data.imageUrl,
            fileName: data.fileName
        };
    } catch (err) {
        console.error('Error uploading customization logo:', err);
        return {
            success: false,
            message: err.message || 'Network error uploading logo'
        };
    }
}

/**
 * Confirm and add with customization
 */
async function confirmCustomization() {
    if (!pendingCustomizationAction) return;

    const customText = document.getElementById('customModalText').value.trim();
    const customLogoInput = document.getElementById('customModalLogo');
    const customLogo = customLogoInput.files[0];

    // If there's a logo, upload it first
    let logoUrl = null;
    if (customLogo) {
        showToast('Uploading logo...', 'info');
        const uploadResult = await uploadCustomizationLogo(customLogo);

        if (!uploadResult.success) {
            showToast(uploadResult.message || 'Failed to upload logo', 'error');
            return; // Don't proceed without successful logo upload
        }
        logoUrl = uploadResult.imageUrl;
        console.log('Logo uploaded successfully:', logoUrl);
    }

    // Create customization object with uploaded logo URL
    const customization = (customText || logoUrl) ? {
        text: customText || null,
        logoUrl: logoUrl || null,
        logoFileName: customLogo ? customLogo.name : null
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

/**
 * Show product image in modal
 */
function showProductImage(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalProductName = document.getElementById('modalProductName');
    const modalProductDetails = document.getElementById('modalProductDetails');
    const soldOutBadge = document.getElementById('soldOutBadge');
    const buyNowBtn = document.getElementById('modalBuyNow');
    const addToCartBtn = document.getElementById('modalAddToCart');
    const imageCarouselNav = document.getElementById('imageCarouselNav');

    const isSoldOut = product.inventory === 0;

    // Setup image carousel
    const allImages = product.images && product.images.length > 0 ? product.images : [product.image];
    window.currentProductImages = allImages;
    window.currentImageIndex = 0;

    // Set initial image
    modalImage.src = allImages[0];
    modalProductName.textContent = product.name;

    // Format type to show "X inches" if it's numeric
    const typeDisplay = /^\d+$/.test(product.type) ? `${product.type} inches` : capitalizeFirst(product.type);
    modalProductDetails.textContent = `${capitalizeFirst(product.sport)} | ${typeDisplay} | ₹${product.price.toLocaleString('en-IN')}`;

    // Show/hide carousel navigation if multiple images
    if (allImages.length > 1) {
        imageCarouselNav.style.display = 'flex';
        // Update image counter
        const imageCounter = document.getElementById('imageCounter');
        imageCounter.textContent = `1 / ${allImages.length}`;
        imageCounter.style.display = 'block';
    } else {
        imageCarouselNav.style.display = 'none';
        document.getElementById('imageCounter').style.display = 'none';
    }

    // Show/hide SOLD OUT badge
    if (isSoldOut) {
        soldOutBadge.style.display = 'block';
    } else {
        soldOutBadge.style.display = 'none';
    }

    // Reset customization section
    document.getElementById('customText').value = '';
    document.getElementById('customLogo').value = '';
    document.getElementById('logoPreview').style.display = 'none';

    // Reset customization modal
    document.getElementById('customPreviewImg').src = product.image;
    document.getElementById('customPreviewName').textContent = product.name;
    const typeDisplay2 = /^\d+$/.test(product.type) ? `${product.type} inches` : capitalizeFirst(product.type);
    document.getElementById('customPreviewDetails').textContent = `${capitalizeFirst(product.sport)} | ${typeDisplay2}`;

    // Disable/enable buttons based on inventory - ensure proper disable state
    buyNowBtn.disabled = isSoldOut;
    addToCartBtn.disabled = isSoldOut;

    if (isSoldOut) {
        buyNowBtn.style.opacity = '0.5';
        buyNowBtn.style.cursor = 'not-allowed';
        buyNowBtn.style.pointerEvents = 'none';
        buyNowBtn.style.backgroundColor = '#ccc';
        buyNowBtn.style.background = '#ccc';

        addToCartBtn.style.opacity = '0.5';
        addToCartBtn.style.cursor = 'not-allowed';
        addToCartBtn.style.pointerEvents = 'none';
        addToCartBtn.style.backgroundColor = '#ccc';
        addToCartBtn.style.borderColor = '#ccc';
        addToCartBtn.style.color = '#666';
    } else {
        buyNowBtn.style.opacity = '1';
        buyNowBtn.style.cursor = 'pointer';
        buyNowBtn.style.pointerEvents = 'auto';
        buyNowBtn.style.background = 'linear-gradient(135deg, var(--accent), #e64f00)';

        addToCartBtn.style.opacity = '1';
        addToCartBtn.style.cursor = 'pointer';
        addToCartBtn.style.pointerEvents = 'auto';
        addToCartBtn.style.background = 'transparent';
        addToCartBtn.style.borderColor = 'var(--accent)';
        addToCartBtn.style.color = 'var(--accent)';
    }

    // Store product ID and sold out state on buttons for use in handlers
    buyNowBtn.dataset.productId = productId;
    buyNowBtn.dataset.isSoldOut = isSoldOut;
    addToCartBtn.dataset.productId = productId;
    addToCartBtn.dataset.isSoldOut = isSoldOut;

    // Store current product ID for customization modal
    window.currentCustomizationProductId = productId;

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

/**
 * Navigate to previous image in carousel
 */
function previousImage() {
    if (!window.currentProductImages || window.currentProductImages.length <= 1) return;

    window.currentImageIndex = (window.currentImageIndex - 1 + window.currentProductImages.length) % window.currentProductImages.length;
    updateCarouselImage();
}

/**
 * Navigate to next image in carousel
 */
function nextImage() {
    if (!window.currentProductImages || window.currentProductImages.length <= 1) return;

    window.currentImageIndex = (window.currentImageIndex + 1) % window.currentProductImages.length;
    updateCarouselImage();
}

/**
 * Update the displayed carousel image
 */
function updateCarouselImage() {
    const modalImage = document.getElementById('modalImage');
    const imageCounter = document.getElementById('imageCounter');

    if (window.currentProductImages && window.currentImageIndex < window.currentProductImages.length) {
        modalImage.src = window.currentProductImages[window.currentImageIndex];
        imageCounter.textContent = `${window.currentImageIndex + 1} / ${window.currentProductImages.length}`;
        imageCounter.style.display = 'block';
    }
}

/**
 * Toggle customization section
 */
function toggleCustomization() {
    const btn = document.getElementById('toggleCustomizationBtn');
    if (btn.disabled) return;

    // Store action and close image modal first
    window.pendingCustomizationAction = 'buy';
    closeImageModal();

    // Open the new customization modal
    const customModal = new bootstrap.Modal(document.getElementById('customizationModalNew'));
    customModal.show();
}

/**
 * Apply customization and handle action
 */
function applyCustomization() {
    const productId = window.currentCustomizationProductId;
    const customization = getCustomization();

    // Close customization modal
    const customModal = bootstrap.Modal.getInstance(document.getElementById('customizationModalNew'));
    customModal.hide();

    // Determine which action to take based on button that was clicked
    if (window.pendingCustomizationAction === 'buy') {
        closeImageModal();
        buyNow(productId, customization);
    } else if (window.pendingCustomizationAction === 'add') {
        addToCart(productId, customization);
        showToast('Added to cart with customization!');
        closeImageModal();
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

    // Payment Amount Selection (Full/50% Advance)
    document.querySelectorAll('.payment-option').forEach(option => {
        option.addEventListener('click', function () {
            document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            updateAdvancePaymentDisplay();
        });
    });

    // Checkout Form
    document.getElementById('checkoutForm').addEventListener('submit', handleCheckout);
}

/**
 * Select payment method (Online/Cash)
 */
function selectPaymentMethod(element) {
    document.querySelectorAll('.payment-method-option').forEach(o => o.classList.remove('selected'));
    element.classList.add('selected');

    const method = element.dataset.method;
    const paymentAmountSection = document.getElementById('paymentAmountSection');
    const payNowBtn = document.getElementById('payNowBtn');

    if (method === 'cash') {
        // Hide advance payment options for cash
        paymentAmountSection.style.display = 'none';
        payNowBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Place Order';
    } else {
        paymentAmountSection.style.display = 'block';
        payNowBtn.innerHTML = '<i class="bi bi-credit-card me-2"></i>Pay Now';
    }

    updateAdvancePaymentDisplay();
}

/**
 * Select delivery option
 */
function selectDeliveryOption(element) {
    document.querySelectorAll('.delivery-option').forEach(o => o.classList.remove('selected'));
    element.classList.add('selected');

    const deliveryType = element.dataset.delivery;
    const addressSection = document.getElementById('addressSection');
    const addressInput = document.getElementById('deliveryAddress');

    if (deliveryType === 'porter') {
        addressSection.style.display = 'block';
        addressInput.setAttribute('required', 'required');
    } else {
        addressSection.style.display = 'none';
        addressInput.removeAttribute('required');
    }
}

/**
 * Update advance payment display based on selected payment option
 */
function updateAdvancePaymentDisplay() {
    const selectedPaymentMethod = document.querySelector('.payment-method-option.selected');
    const selectedPayment = document.querySelector('.payment-option.selected');
    const advanceRow = document.getElementById('advancePaymentRow');
    const balanceNote = document.getElementById('balanceNote');
    const advanceAmount = document.getElementById('advanceAmount');

    if (!advanceRow) return;

    // If cash payment is selected, hide advance payment options
    if (selectedPaymentMethod?.dataset.method === 'cash') {
        advanceRow.style.display = 'none';
        balanceNote.style.display = 'none';
        return;
    }

    if (!selectedPayment) return;

    const paymentType = selectedPayment.dataset.payment;

    // Calculate total
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const bulkDiscount = subtotal >= 500 ? Math.round(subtotal * 0.10) : 0;
    const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
    const finalTotal = Math.max(0, subtotal - bulkDiscount - couponDiscount);

    if (paymentType === 'advance') {
        const advance = Math.ceil(finalTotal / 2);
        advanceRow.style.display = 'flex';
        balanceNote.style.display = 'block';
        advanceAmount.textContent = `₹${advance.toLocaleString('en-IN')}`;
    } else {
        advanceRow.style.display = 'none';
        balanceNote.style.display = 'none';
    }
}

/**
 * Close cart sidebar
 */
function closeCart() {
    document.getElementById('cartSidebar').classList.remove('open');
    document.getElementById('cartOverlay').classList.remove('show');
}

/**
 * Set button loading state
 */
function setButtonLoading(loading, text = 'Processing...') {
    const btn = document.getElementById('payNowBtn');
    if (!btn) return;

    if (loading) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span>${text}`;
    } else {
        btn.disabled = false;
        // Check if cash payment method is selected
        const selectedMethod = document.querySelector('.payment-method-option.selected');
        if (selectedMethod?.dataset.method === 'cash') {
            btn.innerHTML = `<i class="bi bi-check-circle me-2"></i>Place Order`;
        } else {
            btn.innerHTML = `<i class="bi bi-credit-card me-2"></i>Pay Now`;
        }
    }
}

/**
 * Handle Checkout - Integrates with backend and Zoho payment
 */
let trophyPaymentRequestInProgress = false;

async function handleCheckout(e) {
    e.preventDefault();
    console.log('handleCheckout called');

    // SET FLAG IMMEDIATELY to prevent race condition from rapid clicks
    if (trophyPaymentRequestInProgress) {
        console.warn('⚠️ Payment request already in progress. Ignoring duplicate click.');
        return;
    }
    trophyPaymentRequestInProgress = true;

    const selectedPaymentMethod = document.querySelector('.payment-method-option.selected');
    const selectedPaymentAmount = document.querySelector('.payment-option.selected');
    const selectedDelivery = document.querySelector('.delivery-option.selected');
    const customerName = document.getElementById('customerName')?.value?.trim();
    const customerPhone = document.getElementById('customerPhone')?.value?.trim();

    console.log('Validation check:', {
        selectedPaymentMethod: selectedPaymentMethod?.dataset?.method,
        selectedPaymentAmount: selectedPaymentAmount?.dataset?.payment,
        selectedDelivery: selectedDelivery?.dataset?.delivery,
        customerName,
        customerPhone,
        cartLength: cart.length
    });

    // Validation
    if (!customerName) {
        trophyPaymentRequestInProgress = false;  // Reset flag on validation error
        alert('Please enter your name');
        document.getElementById('customerName')?.focus();
        return;
    }

    if (!customerPhone || !/^\d{10}$/.test(customerPhone)) {
        trophyPaymentRequestInProgress = false;  // Reset flag on validation error
        alert('Please enter a valid 10-digit phone number');
        document.getElementById('customerPhone')?.focus();
        return;
    }

    if (!selectedPaymentMethod) {
        trophyPaymentRequestInProgress = false;  // Reset flag on validation error
        alert('Please select a payment method');
        return;
    }

    if (!selectedDelivery) {
        trophyPaymentRequestInProgress = false;  // Reset flag on validation error
        alert('Please select a delivery option');
        return;
    }

    const paymentMethod = selectedPaymentMethod.dataset.method; // 'online' or 'cash'
    const deliveryType = selectedDelivery.dataset.delivery;
    const deliveryAddress = document.getElementById('deliveryAddress')?.value?.trim();

    if (deliveryType === 'porter' && !deliveryAddress) {
        trophyPaymentRequestInProgress = false;  // Reset flag on validation error
        alert('Please enter your delivery address');
        document.getElementById('deliveryAddress')?.focus();
        return;
    }

    if (cart.length === 0) {
        trophyPaymentRequestInProgress = false;  // Reset flag on validation error
        alert('Your cart is empty');
        return;
    }

    // For online payments, get the payment amount selection (full/advance)
    // For cash payments, always full payment (no advance option)
    const isCashPayment = paymentMethod === 'cash';
    const isAdvancePayment = !isCashPayment && selectedPaymentAmount?.dataset.payment === 'advance';

    // Prepare trophy details for backend (include customization if present)
    const trophyDetails = cart.map(item => {
        const detail = {
            id: item.id,           // MongoDB _id for inventory lookup
            name: item.name,       // For order display
            price: item.price,     // For pricing
            quantity: item.quantity  // For inventory reduction
        };

        // Include customization if present (with uploaded logo URL)
        if (item.customization) {
            detail.customization = item.customization;
        }

        return detail;
    });

    // Build payload for backend
    const payload = {
        serviceType: 'trophies',
        customerName: customerName,
        phone: customerPhone,
        trophyDetails: trophyDetails,
        deliveryType: deliveryType,
        deliveryAddress: deliveryType === 'porter' ? deliveryAddress : null,
        advancePayment: isAdvancePayment,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        paymentMethod: isCashPayment ? 'payatoutlet' : 'online',
        store: 'online'
    };

    console.log('Checkout payload:', JSON.stringify(payload, null, 2));
    console.log('BACKEND_BASE:', BACKEND_BASE);

    try {
        setButtonLoading(true, 'Creating order...');

        console.log('Making fetch request to:', `${BACKEND_BASE}/api/create-order`);

        // Call backend to create order
        const createResp = await fetch(`${BACKEND_BASE}/api/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log('Fetch response status:', createResp.status);

        const createData = await createResp.json().catch(() => ({}));
        console.log('create-order response:', createData);

        if (!createData || !createData.success) {
            setButtonLoading(false);
            console.error('create-order failed', createData);
            const errorMessage = createData?.message || 'Failed to create order. Please try again.';
            showToast(errorMessage, 'error');
            return;
        }

        // Get order data from response
        const resp = createData.data || createData;
        const orderId = resp.order_id;

        // CASH PAYMENT FLOW - redirect to order accepted page
        if (isCashPayment) {
            // Clear cart on success
            cart = [];
            localStorage.setItem('dasportz_cart', JSON.stringify(cart));

            const order = createData.order || resp;
            const amount = order.amount || resp.amount || 0;
            const params = new URLSearchParams({
                oid: orderId,
                amount: amount.toString(),
                name: customerName,
                store: 'online',
                service: 'trophies'
            });
            window.location.href = `/order-accepted.html?${params.toString()}`;
            return;
        }

        // ONLINE PAYMENT FLOW - use Zoho payment widget
        const paymentsSessionId = resp.payments_session_id;
        const amount = resp.amount;

        if (!paymentsSessionId) {
            setButtonLoading(false);
            console.error('Missing payments_session_id from server', createData);
            alert('Payment session creation failed. Please try again.');
            return;
        }

        // Get Zoho config
        const zpayConfig = resp.zpayConfig || { account_id: '60044148024', domain: 'IN' };
        const apiKey = ZOHO_WIDGET_API_KEY;

        if (!zpayConfig.account_id || !apiKey) {
            setButtonLoading(false);
            console.error('Missing zpay config', zpayConfig);
            alert('Payment configuration missing. Please contact support.');
            return;
        }

        // Instantiate Zoho Payment widget
        const instance = new window.ZPayments({
            account_id: String(zpayConfig.account_id),
            domain: String(zpayConfig.domain || 'IN'),
            otherOptions: {
                api_key: apiKey
            }
        });

        // Prepare widget options
        const widgetOptions = {
            amount: (Number(amount) || 0).toString(),
            currency_code: 'INR',
            payments_session_id: String(paymentsSessionId),
            currency_symbol: '₹',
            business: 'DA SPORTZ',
            description: 'Trophies & Awards',
            address: {
                name: customerName,
                email: customerPhone + '@dasportz.com',
                phone: customerPhone
            }
        };

        setButtonLoading(true, 'Opening checkout...');

        let widgetResponse;
        try {
            widgetResponse = await instance.requestPaymentMethod(widgetOptions);
        } catch (widgetErr) {
            setButtonLoading(false);
            if (widgetErr && widgetErr.code === 'widget_closed') {
                console.warn('Widget closed by user');
                alert('Payment cancelled.');
            } else if (widgetErr && widgetErr.code === 'invalid_payment_session') {
                console.warn('Payment session invalid/expired');
                alert('Payment session expired. Please try again.');
            } else {
                console.error('Widget error', widgetErr);
                alert('Payment failed or was cancelled. Please try again.');
            }
            return;
        } finally {
            try { await instance.close(); } catch (_) { }
        }

        // Get payment ID from response
        const paymentId = widgetResponse?.payment_id || widgetResponse?.payment?.payment_id || widgetResponse?.paymentId;
        if (!paymentId) {
            setButtonLoading(false);
            console.error('No payment_id returned from widget', widgetResponse);
            alert('Payment could not be confirmed. Please contact support.');
            return;
        }

        // Verify payment with backend
        setButtonLoading(true, 'Verifying payment...');
        const verifyResp = await fetch(`${BACKEND_BASE}/api/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_id: paymentId })
        });

        const verifyData = await verifyResp.json().catch(() => ({}));
        if (verifyData && verifyData.success) {
            // Clear cart on success
            cart = [];
            localStorage.setItem('dasportz_cart', JSON.stringify(cart));

            // Build success redirect params
            const params = new URLSearchParams({
                pid: paymentId,
                amount: amount.toString(),
                name: customerName,
                oid: orderId,
                service: 'trophies'
            });

            if (isAdvancePayment && resp.balanceAmount) {
                params.append('balance', resp.balanceAmount.toString());
            }

            window.location.href = `/trophy-payment-success.html?${params.toString()}`;
        } else {
            setButtonLoading(false);
            console.error('Payment verification failed', verifyData);
            alert('Payment verification failed. If amount was deducted, please contact support with Order ID: ' + orderId);
        }

    } catch (error) {
        setButtonLoading(false);
        console.error('Checkout error:', error);
        alert('An error occurred. Please try again.');
    } finally {
        trophyPaymentRequestInProgress = false;
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    // Create toast element
    const toast = document.createElement('div');

    // Set color based on type
    const bgColor = type === 'error' ? '#dc3545' : '#28a745';
    const icon = type === 'error' ? 'exclamation-circle' : 'check-circle';

    // Error messages stay longer (5 seconds), success messages shorter (3 seconds)
    const duration = type === 'error' ? 5000 : 3000;

    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease-out;
        max-width: 350px;
    `;
    toast.innerHTML = `<i class="bi bi-${icon} me-2"></i>${message}`;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Utility: Capitalize first letter
 */
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Update checkout modal totals with discounts
 */
function updateCheckoutTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Calculate bulk discount (10% if subtotal >= 500)
    const bulkDiscountEligible = subtotal >= 500;
    const bulkDiscount = bulkDiscountEligible ? Math.round(subtotal * 0.10) : 0;

    // Get coupon discount
    const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;

    // Calculate final total
    const finalTotal = Math.max(0, subtotal - bulkDiscount - couponDiscount);

    // Update UI elements
    const subtotalEl = document.getElementById('subtotalAmount');
    const bulkDiscountBadge = document.getElementById('bulkDiscountBadge');
    const bulkDiscountRow = document.getElementById('bulkDiscountRow');
    const bulkDiscountAmount = document.getElementById('bulkDiscountAmount');
    const couponDiscountRow = document.getElementById('couponDiscountRow');
    const couponDiscountAmount = document.getElementById('couponDiscountAmount');
    const modalTotal = document.getElementById('modalTotal');

    if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toLocaleString('en-IN')}`;

    if (bulkDiscountBadge && bulkDiscountRow && bulkDiscountAmount) {
        if (bulkDiscountEligible) {
            bulkDiscountBadge.style.display = 'block';
            bulkDiscountRow.style.display = 'flex';
            bulkDiscountAmount.textContent = `-₹${bulkDiscount.toLocaleString('en-IN')}`;
        } else {
            bulkDiscountBadge.style.display = 'none';
            bulkDiscountRow.style.display = 'none';
        }
    }

    if (couponDiscountRow && couponDiscountAmount) {
        if (couponDiscount > 0) {
            couponDiscountRow.style.display = 'flex';
            couponDiscountAmount.textContent = `-₹${couponDiscount.toLocaleString('en-IN')}`;
        } else {
            couponDiscountRow.style.display = 'none';
        }
    }

    if (modalTotal) modalTotal.textContent = `₹${finalTotal.toLocaleString('en-IN')}`;

    // Update advance payment display
    updateAdvancePaymentDisplay();
}

/**
 * Validate and apply coupon code
 */
function applyCoupon() {
    const couponInput = document.getElementById('couponInput');
    const code = couponInput.value.trim().toUpperCase();

    if (!code) {
        showToast('Please enter a coupon code');
        return;
    }

    // Validate coupon format: DA followed by numbers
    const couponRegex = /^DA(\d+)$/;
    const match = code.match(couponRegex);

    if (!match) {
        showToast('Invalid coupon format. Use DA followed by amount (e.g., DA50)');
        couponInput.classList.add('is-invalid');
        setTimeout(() => couponInput.classList.remove('is-invalid'), 2000);
        return;
    }

    const discountAmount = parseInt(match[1], 10);

    // Validate discount amount
    if (isNaN(discountAmount) || discountAmount === 0) {
        showToast('Invalid discount amount');
        return;
    }

    if (discountAmount % 50 !== 0) {
        showToast('Discount must be a multiple of 50');
        return;
    }

    if (discountAmount > 500) {
        showToast('Maximum discount is ₹500');
        return;
    }

    // Apply coupon
    appliedCoupon = {
        code: code,
        discount: discountAmount
    };

    // Update UI
    document.getElementById('couponInputArea').style.display = 'none';
    document.getElementById('couponAppliedArea').style.display = 'block';
    document.getElementById('appliedCouponCode').textContent = code;

    updateCheckoutTotals();
    showToast(`Coupon applied! ₹${discountAmount} off`);
}

/**
 * Remove applied coupon
 */
function removeCoupon() {
    appliedCoupon = null;

    // Reset UI
    document.getElementById('couponInputArea').style.display = 'block';
    document.getElementById('couponAppliedArea').style.display = 'none';
    document.getElementById('couponInput').value = '';

    updateCheckoutTotals();
    showToast('Coupon removed');
}

/**
 * Close image modal
 */
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

/**
 * Handle Buy Now button click in modal
 */
function handleModalBuyNow() {
    const btn = document.getElementById('modalBuyNow');
    if (btn.disabled || btn.dataset.isSoldOut === 'true') {
        return;
    }

    const productId = btn.dataset.productId;
    showCustomizationModal(productId, 'buy');
    closeImageModal();
}

/**
 * Handle Add to Cart button click in modal
 */
function handleModalAddToCart() {
    const btn = document.getElementById('modalAddToCart');
    if (btn.disabled || btn.dataset.isSoldOut === 'true') {
        return;
    }

    const productId = btn.dataset.productId;
    showCustomizationModal(productId, 'add');
    closeImageModal();
}

/**
 * Mobile Filter Sidebar Management
 */
function initializeMobileFilters() {
    const filterToggleBtn = document.getElementById('filterToggleBtn');
    const filterCloseBtn = document.getElementById('filterCloseBtn');
    const filterSection = document.getElementById('filterSection');
    const filterOverlay = document.getElementById('filterOverlay');

    if (!filterToggleBtn) return; // Not on trophies page

    // Show filter sidebar on mobile
    filterToggleBtn.addEventListener('click', () => {
        filterSection.classList.add('active');
        filterOverlay.classList.add('active');
        filterCloseBtn.style.display = 'block';
    });

    // Close filter sidebar
    const closeFilters = () => {
        filterSection.classList.remove('active');
        filterOverlay.classList.remove('active');
        filterCloseBtn.style.display = 'none';
    };

    if (filterCloseBtn) {
        filterCloseBtn.addEventListener('click', closeFilters);
    }

    // Close filters when overlay is clicked
    if (filterOverlay) {
        filterOverlay.addEventListener('click', closeFilters);
    }

    // Close filters when a filter is clicked (on mobile)
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeFilters();
            }
        });
    });

    // Update filter button text on window resize
    const updateFilterButtonText = () => {
        if (window.innerWidth > 768) {
            filterToggleBtn.style.display = 'none';
        } else {
            filterToggleBtn.style.display = 'block';
        }
    };

    window.addEventListener('resize', updateFilterButtonText);
    updateFilterButtonText();
}

// Make functions globally accessible
window.addToCart = addToCart;
window.buyNow = buyNow;
window.updateQuantity = updateQuantity;
window.updateQuantityByIndex = updateQuantityByIndex;
window.removeFromCart = removeFromCart;
window.removeFromCartByIndex = removeFromCartByIndex;
window.quickView = quickView;
window.showProductImage = showProductImage;
window.closeImageModal = closeImageModal;
window.handleModalBuyNow = handleModalBuyNow;
window.handleModalAddToCart = handleModalAddToCart;
window.toggleCustomization = toggleCustomization;
window.applyCustomization = applyCustomization;
window.applyCoupon = applyCoupon;
window.removeCoupon = removeCoupon;
window.closeCart = closeCart;
window.selectDeliveryOption = selectDeliveryOption;
window.selectPaymentMethod = selectPaymentMethod;
window.handleCheckout = handleCheckout;
window.loadProducts = loadProducts;
window.refreshProducts = async () => { await loadProducts(); displayProducts(); };
