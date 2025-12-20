/**
 * Trophies Shop - Main JavaScript
 * Handles product filtering, cart management, and checkout
 */

// Product Database
const products = [
    // Cricket Trophies
    { id: 1, name: 'Golden Cricket Trophy', sport: 'cricket', type: 'trophy', price: 2500, image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400' },
    { id: 2, name: 'Cricket Champions Cup', sport: 'cricket', type: 'cup', price: 3200, image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400' },
    { id: 3, name: 'Cricket Winner Medal', sport: 'cricket', type: 'medal', price: 450, image: 'https://images.unsplash.com/photo-1611625764159-b5d356e33e88?w=400' },
    { id: 4, name: 'Cricket Shield Award', sport: 'cricket', type: 'shield', price: 1800, image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400' },
    { id: 5, name: 'Cricket Excellence Plaque', sport: 'cricket', type: 'plaque', price: 1200, image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400' },

    // Football Trophies
    { id: 6, name: 'Football Champion Trophy', sport: 'football', type: 'trophy', price: 2800, image: 'https://images.unsplash.com/photo-1614632537423-1e6c2e926479?w=400' },
    { id: 7, name: 'Golden Football Cup', sport: 'football', type: 'cup', price: 3500, image: 'https://images.unsplash.com/photo-1614632537423-1e6c2e926479?w=400' },
    { id: 8, name: 'Football Star Medal', sport: 'football', type: 'medal', price: 500, image: 'https://images.unsplash.com/photo-1611625764159-b5d356e33e88?w=400' },
    { id: 9, name: 'Football Victory Shield', sport: 'football', type: 'shield', price: 1900, image: 'https://images.unsplash.com/photo-1614632537423-1e6c2e926479?w=400' },
    { id: 10, name: 'Football Legend Plaque', sport: 'football', type: 'plaque', price: 1300, image: 'https://images.unsplash.com/photo-1614632537423-1e6c2e926479?w=400' },

    // Basketball Trophies
    { id: 11, name: 'Basketball Elite Trophy', sport: 'basketball', type: 'trophy', price: 2600, image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400' },
    { id: 12, name: 'Basketball MVP Cup', sport: 'basketball', type: 'cup', price: 3300, image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400' },
    { id: 13, name: 'Basketball Achievement Medal', sport: 'basketball', type: 'medal', price: 480, image: 'https://images.unsplash.com/photo-1611625764159-b5d356e33e88?w=400' },
    { id: 14, name: 'Basketball Honor Shield', sport: 'basketball', type: 'shield', price: 1750, image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400' },

    // Badminton Trophies
    { id: 15, name: 'Badminton Winner Trophy', sport: 'badminton', type: 'trophy', price: 2400, image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400' },
    { id: 16, name: 'Badminton Champions Cup', sport: 'badminton', type: 'cup', price: 3000, image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400' },
    { id: 17, name: 'Badminton Gold Medal', sport: 'badminton', type: 'medal', price: 420, image: 'https://images.unsplash.com/photo-1611625764159-b5d356e33e88?w=400' },
    { id: 18, name: 'Badminton Victory Shield', sport: 'badminton', type: 'shield', price: 1650, image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400' },

    // Karate Trophies
    { id: 19, name: 'Karate Black Belt Trophy', sport: 'karate', type: 'trophy', price: 2700, image: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400' },
    { id: 20, name: 'Karate Master Cup', sport: 'karate', type: 'cup', price: 3400, image: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400' },
    { id: 21, name: 'Karate Excellence Medal', sport: 'karate', type: 'medal', price: 520, image: 'https://images.unsplash.com/photo-1611625764159-b5d356e33e88?w=400' },
    { id: 22, name: 'Karate Honor Plaque', sport: 'karate', type: 'plaque', price: 1400, image: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400' },

    // Running Trophies
    { id: 23, name: 'Marathon Trophy', sport: 'running', type: 'trophy', price: 2300, image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400' },
    { id: 24, name: 'Running Champion Medal', sport: 'running', type: 'medal', price: 400, image: 'https://images.unsplash.com/photo-1611625764159-b5d356e33e88?w=400' },
    { id: 25, name: 'Sprint Victory Cup', sport: 'running', type: 'cup', price: 2900, image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400' },

    // Tennis Trophies
    { id: 26, name: 'Tennis Grand Slam Trophy', sport: 'tennis', type: 'trophy', price: 2900, image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=400' },
    { id: 27, name: 'Tennis Champion Cup', sport: 'tennis', type: 'cup', price: 3600, image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=400' },
    { id: 28, name: 'Tennis Winner Medal', sport: 'tennis', type: 'medal', price: 470, image: 'https://images.unsplash.com/photo-1611625764159-b5d356e33e88?w=400' },
    { id: 29, name: 'Tennis Excellence Shield', sport: 'tennis', type: 'shield', price: 1850, image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=400' },
    { id: 30, name: 'Tennis Legend Plaque', sport: 'tennis', type: 'plaque', price: 1350, image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=400' },
];

// State Management
let cart = JSON.parse(localStorage.getItem('dasportz_cart')) || [];
let currentFilters = {
    sport: 'all',
    type: 'all'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
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

            col.innerHTML = `
                <div class="product-card" onclick="showProductImage(${product.id})" style="cursor: pointer;">
                    <div class="product-image">
                        <span class="product-badge">${capitalizeFirst(product.type)}</span>
                        <img src="${product.image}" alt="${product.name}">
                    </div>
                    <div class="product-body">
                        <div class="product-title">${product.name}</div>
                        <div class="product-category">
                            <i class="bi bi-tag me-1"></i>${capitalizeFirst(product.sport)}
                        </div>
                        <div class="product-price">₹${product.price.toLocaleString('en-IN')}</div>
                        <div class="product-actions" onclick="event.stopPropagation();">
                            <button class="btn-buy-now" onclick="showCustomizationModal(${product.id}, 'buy')">
                                Buy Now
                            </button>
                            <button class="btn-add-cart" onclick="showCustomizationModal(${product.id}, 'add')">
                                Add to Cart
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
                <button class="cart-item-remove" onclick="removeFromCart(${item.id}, ${JSON.stringify(item.customization).replace(/"/g, '&quot;')})">
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

    modalImage.src = product.image;
    modalProductName.textContent = product.name;
    modalProductDetails.textContent = `${capitalizeFirst(product.sport)} | ${capitalizeFirst(product.type)} | ₹${product.price.toLocaleString('en-IN')}`;

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
 * Handle Checkout
 */
function handleCheckout(e) {
    e.preventDefault();

    const selectedPayment = document.querySelector('.payment-option.selected');
    if (!selectedPayment) {
        alert('Please select a payment method');
        return;
    }

    const paymentMethod = selectedPayment.dataset.payment;
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Prepare order data
    const orderData = {
        items: cart,
        total: totalAmount,
        paymentMethod: paymentMethod,
        timestamp: new Date().toISOString()
    };

    if (paymentMethod === 'online') {
        // Redirect to payment page (you can integrate Razorpay or other gateway)
        alert(`Redirecting to online payment gateway...\nAmount: ₹${totalAmount.toLocaleString('en-IN')}`);
        // In production, you would redirect to payment-success.html or similar
        window.location.href = 'payment-success.html';
    } else {
        // Cash on Delivery
        alert(`Order placed successfully!\nPayment Method: Cash on Delivery\nTotal: ₹${totalAmount.toLocaleString('en-IN')}\n\nWe'll contact you shortly!`);

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
