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
    sport: 'all',
    type: 'all'
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    initializeFilters();
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
                sport: trophy.category || trophy.sport || 'general',
                type: trophy.size || trophy.type || 'trophy',
                price: trophy.price,
                image: trophy.imageUrl || trophy.image || 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400',
                images: trophy.images && Array.isArray(trophy.images) ? trophy.images : (trophy.imageUrl ? [trophy.imageUrl] : []), // Store all images for badge display
                customizable: trophy.customizable !== false,
                available: trophy.available !== false,
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

            // Use string quotes for product.id to handle MongoDB ObjectIds
            const pid = typeof product.id === 'string' ? `'${product.id}'` : product.id;

            col.innerHTML = `
                <div class="product-card" onclick="showProductImage(${pid})" style="cursor: pointer;">
                    <div class="product-image">
                        <img src="${product.image}" alt="${product.name}">
                        ${product.images && product.images.length > 1 ? `
                            <span class="product-badge">+${product.images.length - 1}</span>
                        ` : ''}
                    </div>
                    <div class="product-body">
                        <div class="product-title">${product.name}</div>
                        <div class="product-category">
                            <i class="bi bi-tag me-1"></i>${capitalizeFirst(product.sport)}
                        </div>
                        <div class="product-price">₹${product.price.toLocaleString('en-IN')}</div>
                        <div class="product-actions" onclick="event.stopPropagation();">
                            <button class="btn-buy-now" onclick="showCustomizationModal(${pid}, 'buy')">
                                Buy
                            </button>
                            <button class="btn-add-cart" onclick="showCustomizationModal(${pid}, 'add')">
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
                            ${item.customization.logoName ? `<br><small>Logo: ${item.customization.logoName}</small>` : ''}
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
async function handleCheckout(e) {
    e.preventDefault();
    console.log('handleCheckout called');

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
        alert('Please enter your name');
        document.getElementById('customerName')?.focus();
        return;
    }

    if (!customerPhone || !/^\d{10}$/.test(customerPhone)) {
        alert('Please enter a valid 10-digit phone number');
        document.getElementById('customerPhone')?.focus();
        return;
    }

    if (!selectedPaymentMethod) {
        alert('Please select a payment method');
        return;
    }

    if (!selectedDelivery) {
        alert('Please select a delivery option');
        return;
    }

    const paymentMethod = selectedPaymentMethod.dataset.method; // 'online' or 'cash'
    const deliveryType = selectedDelivery.dataset.delivery;
    const deliveryAddress = document.getElementById('deliveryAddress')?.value?.trim();

    if (deliveryType === 'porter' && !deliveryAddress) {
        alert('Please enter your delivery address');
        document.getElementById('deliveryAddress')?.focus();
        return;
    }

    if (cart.length === 0) {
        alert('Your cart is empty');
        return;
    }

    // For online payments, get the payment amount selection (full/advance)
    // For cash payments, always full payment (no advance option)
    const isCashPayment = paymentMethod === 'cash';
    const isAdvancePayment = !isCashPayment && selectedPaymentAmount?.dataset.payment === 'advance';

    // Prepare trophy details for backend
    const trophyDetails = cart.map(item => ({
        id: item.id,
        name: item.name,
        sport: item.sport,
        type: item.type,
        price: item.price,
        quantity: item.quantity,
        customization: item.customization
    }));

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
            alert('Failed to create order. ' + (createData?.message || 'Please try again.'));
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
window.updateQuantityByIndex = updateQuantityByIndex;
window.removeFromCart = removeFromCart;
window.removeFromCartByIndex = removeFromCartByIndex;
window.quickView = quickView;
window.showProductImage = showProductImage;
window.closeImageModal = closeImageModal;
window.toggleCustomization = toggleCustomization;
window.applyCoupon = applyCoupon;
window.removeCoupon = removeCoupon;
window.closeCart = closeCart;
window.selectDeliveryOption = selectDeliveryOption;
window.selectPaymentMethod = selectPaymentMethod;
window.handleCheckout = handleCheckout;
window.loadProducts = loadProducts;
window.refreshProducts = async () => { await loadProducts(); displayProducts(); };
