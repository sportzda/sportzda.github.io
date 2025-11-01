/* stringing-booking.js
   Handles dynamic multiple rackets, grouped string lists, pricing, summary, validations,
   and opens WhatsApp with order details.

   Fixes added:
   1) Summary count now reflects only rackets with a selected string (no more "1 racket(s)" by default).
   2) Pickup & Drop (porter) option added to summary + WhatsApp message.
   3) Gentle porter-related conditions added (in HTML).
   4) Updated string prices (reduced by ₹100, e.g., Yonex BG 65 from ₹550 to ₹450).
   5) Removed Yonex Nanogy 99 to match HTML price table.
*/

document.addEventListener("DOMContentLoaded", function () {
    const checkbox = document.getElementById("acceptTerms");
    const confirmButton = document.getElementById("confirmButton");

    checkbox.addEventListener("change", function () {
        confirmButton.disabled = !checkbox.checked;

        if (checkbox.checked) {
            confirmButton.classList.remove("animate");
            void confirmButton.offsetWidth; // reset animation
            confirmButton.classList.add("animate");
        }
    });

    const RACKET_LABOUR = 100; // used only for internal calculation; not shown elsewhere
    const EXPRESS_SURCHARGE = 20;
    const ONLINE_DISCOUNT = 10;

    // Track current discount
    let currentDiscount = {
        code: '',
        amount: 0
    };

    const racketsContainer = document.getElementById("racketsContainer");
    const addRacketBtn = document.getElementById("addRacketBtn");
    const removeRacketBtn = document.getElementById("removeRacketBtn");

    const summaryCount = document.getElementById("summaryCount");
    const summaryService = document.getElementById("summaryService");
    const summaryTotal = document.getElementById("summaryTotal");

    const paymentMethod = document.getElementById("paymentMethod");
    const expressService = document.getElementById("expressService");
    const pickupDrop = document.getElementById("pickupDrop");

    let racketIndex = 0;

    // Pre-built grouped & alphabetized string options (brand grouped, prices reduced by ₹100)
    const STRING_OPTIONS = {
        "Yonex": [
            { name: "AEROBITE", price: 800 },
            { name: "AeroBite Boost", price: 800 },
            { name: "BG 65", price: 450 },
            { name: "BG 65 Titanium", price: 500 },
            { name: "BG 66 Ultimax", price: 600 },
            { name: "BG 80", price: 600 },
            { name: "BG 80 Power", price: 700 },
            { name: "Nanogy 95", price: 700 }
        ],
        "Li-Ning": [
            { name: "No.1", price: 450 },
            { name: "No.7", price: 400 }
        ],
        "Hundred": [
            { name: "Control", price: 350 },
            { name: "Power", price: 300 },
            { name: "Pro", price: 380 }
        ]
    };

    // Helper to create one racket card
    function addRacketCard() {
        racketIndex++;
        const idx = racketIndex;
        const wrapper = document.createElement("div");
        wrapper.className = "racket-item mb-3 racket-card";
        wrapper.dataset.idx = idx;

        // Build string select grouped
        let stringSelectHtml = `<select name="stringType" class="form-select string-type-select" required>
      <option value="">-- Choose String --</option>`;

        Object.keys(STRING_OPTIONS).forEach(brand => {
            stringSelectHtml += `<optgroup label="${brand}">`;
            STRING_OPTIONS[brand].sort((a, b) => a.name.localeCompare(b.name)).forEach(opt => {
                // store value as: "Brand | Name | Price" so parsing is easy
                // include labour in data-cost for total calculation
                const totalCost = opt.price + RACKET_LABOUR;
                stringSelectHtml += `<option value="${brand}||${opt.name}||${opt.price}" data-cost="${totalCost}">${opt.name} — ₹${opt.price}</option>`;
            });
            stringSelectHtml += `</optgroup>`;
        });

        stringSelectHtml += `<option value="Other||Other||0">Other (enter name)</option>`;
        stringSelectHtml += `</select>`;

        wrapper.innerHTML = `
      <div class="d-flex justify-content-between align-items-start mb-2">
        <h6 class="mb-0">Racket ${idx}</h6>
        <button type="button" class="btn btn-sm btn-outline-danger remove-single-racket">Remove</button>
      </div>

      <div class="row g-2">
        <div class="col-md-6">
          <label class="form-label">Racket Model</label>
          <select name="racketModel" class="form-select racket-model-select">
            <option>Yonex Astrox 99</option>
            <option>Li-Ning Turbo X</option>
            <option>Victor Thruster K</option>
            <option value="Other">Other</option>
          </select>
          <input type="text" name="customModel" class="form-control mt-2 d-none custom-model" placeholder="Enter custom model if 'Other'">
        </div>

        <div class="col-md-6">
          <label class="form-label">Upload Racket Image (optional)</label>
          <input type="file" name="racketImage" accept="image/*" class="form-control">
        </div>

        <div class="col-md-6 mt-2">
          <label class="form-label">String Type</label>
          ${stringSelectHtml}
          <input type="text" name="customString" class="form-control mt-2 d-none custom-string" placeholder="Enter string name">
        </div>

        <div class="col-md-3 mt-2">
          <label class="form-label">Tension (lbs)</label>
          <input type="number" name="tension" class="form-control" min="16" max="35" placeholder="e.g. 24" required>
        </div>

        <div class="col-md-3 mt-2 d-flex align-items-end">
          <div class="muted small">Labour & other charges applied in total</div>
        </div>
      </div>
    `;

        // append and wire events via delegation
        racketsContainer.appendChild(wrapper);
        updateSummary();
    }

    // initialize with one (empty) racket card (UI expectation unchanged)
    addRacketCard();

    // Add / Remove handlers
    addRacketBtn.addEventListener("click", () => addRacketCard());

    removeRacketBtn.addEventListener("click", () => {
        const items = racketsContainer.querySelectorAll(".racket-item");
        if (items.length > 1) {
            const last = items[items.length - 1];
            last.remove();
            updateSummary();
        } else {
            // if only 1, clear fields instead
            const first = items[0];
            first.querySelectorAll("input, select").forEach(el => {
                if (el.type === "file") el.value = "";
                else el.value = "";
            });
            updateSummary();
        }
    });

    // delegate remove single racket button inside cards
    racketsContainer.addEventListener("click", (e) => {
        if (e.target.matches(".remove-single-racket")) {
            const card = e.target.closest(".racket-item");
            const items = racketsContainer.querySelectorAll(".racket-item");
            if (items.length > 1) {
                card.remove();
                updateSummary();
            } else {
                // if last card, don't remove; just clear
                card.querySelectorAll("input, select").forEach(el => {
                    if (el.type === "file") el.value = "";
                    else el.value = "";
                });
                updateSummary();
            }
        }
    });

    // delegate changes: model->customModel visibility, string->customString visibility, tension -> update
    racketsContainer.addEventListener("change", (e) => {
        const el = e.target;

        if (el.matches(".racket-model-select")) {
            const card = el.closest(".racket-item");
            const cm = card.querySelector(".custom-model");
            if (el.value === "Other") {
                cm.classList.remove("d-none");
                cm.setAttribute("required", "true");
            } else {
                cm.classList.add("d-none");
                cm.removeAttribute("required");
                cm.value = "";
            }
        }

        if (el.matches(".string-type-select")) {
            const card = el.closest(".racket-item");
            const cs = card.querySelector(".custom-string");
            if (el.value && el.value.startsWith("Other")) {
                cs.classList.remove("d-none");
                cs.setAttribute("required", "true");
            } else if (el.value) {
                cs.classList.add("d-none");
                cs.removeAttribute("required");
                cs.value = "";
            }
        }

        // any change updates total
        updateSummary();
    });

    // Handle discount coupon
    const couponInput = document.getElementById('discountCoupon');
    const applyButton = document.getElementById('applyCoupon');
    const couponFeedback = document.getElementById('couponFeedback');
    const couponSuccess = document.getElementById('couponSuccess');

    function validateCoupon(code) {
        // Must start with DA followed by a number that's multiple of 50
        const match = code.match(/^DA(\d+)$/);
        if (!match) return { valid: false, message: 'Invalid coupon format. Coupon should start with DA followed by a number.' };

        const amount = parseInt(match[1], 10);
        if (isNaN(amount) || amount === 0) {
            return { valid: false, message: 'Invalid discount amount.' };
        }

        if (amount % 50 !== 0) {
            return { valid: false, message: 'Discount amount must be a multiple of 50.' };
        }

        if (amount > 500) {
            return { valid: false, message: 'Maximum discount amount is 500.' };
        }

        return { valid: true, amount };
    }

    function showCouponError(message) {
        couponFeedback.textContent = message;
        couponFeedback.style.display = 'block';
        couponSuccess.style.display = 'none';
        currentDiscount = { code: '', amount: 0 };
    }

    function showCouponSuccess(amount) {
        couponSuccess.textContent = `Coupon applied! ₹${amount} discount will be applied to your order.`;
        couponSuccess.style.display = 'block';
        couponFeedback.style.display = 'none';
    }

    applyButton.addEventListener('click', () => {
        const code = couponInput.value.trim().toUpperCase();
        const result = validateCoupon(code);

        if (result.valid) {
            currentDiscount = { code, amount: result.amount };
            showCouponSuccess(result.amount);
        } else {
            showCouponError(result.message);
        }

        updateSummary();
    });

    couponInput.addEventListener('input', () => {
        couponFeedback.style.display = 'none';
        couponSuccess.style.display = 'none';
        if (!couponInput.value.trim()) {
            currentDiscount = { code: '', amount: 0 };
            updateSummary();
        }
    });

    // update summary when express / payment / pickup changed
    expressService.addEventListener("change", updateSummary);
    paymentMethod.addEventListener("change", updateSummary);
    if (pickupDrop) pickupDrop.addEventListener("change", updateSummary);

    // === Calculate and update summary display ===
    function updateSummary() {
        // Count only rackets with a selected string
        let selectedCount = 0;
        let total = 0;

        const cards = document.querySelectorAll(".racket-card");
        cards.forEach(card => {
            const stringSelect = card.querySelector(".string-type-select");
            if (stringSelect && stringSelect.value) {
                selectedCount++;

                // pricing for selected entries
                const stringCost = !stringSelect.value.startsWith("Other")
                    ? parseInt(stringSelect.selectedOptions[0].dataset.cost || 0, 10)
                    : 0;
                total += stringCost;
            }
        });

        // Update racket count in summary
        summaryCount.textContent = selectedCount;

        // Update service type based on express checkbox + show pickup & drop flag inline
        const express = expressService.checked;
        let serviceText = express ? "Express (within 1 hour)" : "Normal (within 4 hours)";
        if (pickupDrop && pickupDrop.checked) {
            serviceText += " • Pickup & Drop";
        }
        summaryService.textContent = serviceText;

        // Apply express surcharge per selected racket
        if (express && selectedCount > 0) total += EXPRESS_SURCHARGE * selectedCount;

        // Apply online payment discount once per order
        if (paymentMethod.value === "Online" && total > 0) total -= ONLINE_DISCOUNT;

        // Apply coupon discount if any
        if (currentDiscount.amount > 0) {
            total -= currentDiscount.amount;
        }

        if (total < 0) total = 0;

        summaryTotal.textContent = total;
    }

    // Submit: validate and open whatsapp with details (image filenames included as note)
    const form = document.getElementById("stringForm");
    form.addEventListener("submit", function (e) {
        e.preventDefault();

        // basic validations
        const store = document.getElementById("storeLocation").value;
        const name = document.getElementById("customerName").value.trim();
        const phone = document.getElementById("phone").value.trim();

        if (!store) { alert("Please select a store."); return; }
        if (!name) { alert("Please enter your name."); return; }
        if (!/^\d{10}$/.test(phone)) { alert("Please enter a valid 10-digit phone number."); return; }
        if (!paymentMethod.value) { alert("Please select a payment method."); return; }

        const items = racketsContainer.querySelectorAll(".racket-item");
        let orderLines = [];
        let total = 0;
        let selectedCount = 0;

        for (let i = 0; i < items.length; i++) {
            const card = items[i];
            // model
            const modelSelect = card.querySelector(".racket-model-select");
            let model = modelSelect ? modelSelect.value : "";
            const cm = card.querySelector(".custom-model");
            if (model === "Other") {
                model = cm.value.trim();
                if (!model) { alert("Please enter racket model for item " + (i + 1)); return; }
            }
            // string
            const stringSel = card.querySelector(".string-type-select");
            if (!stringSel || !stringSel.value) { continue; } // skip unselected racket

            selectedCount++;

            const parts = stringSel.value.split("||");
            let brand = parts[0] || "";
            let sname = parts[1] || "";
            let sprice = parseInt(parts[2], 10) || 0;
            if (sname === "Other") {
                const cs = card.querySelector(".custom-string");
                sname = cs.value.trim();
                if (!sname) { alert("Please enter custom string name for racket " + (i + 1)); return; }
            }

            // tension
            const tension = card.querySelector("input[name='tension']").value;
            if (!tension) { alert("Please enter tension for racket " + (i + 1)); return; }

            // image filename (if any)
            const imgInput = card.querySelector("input[type='file']");
            const imageNote = (imgInput && imgInput.files && imgInput.files[0]) ? imgInput.files[0].name : "No";

            // compute per-racket subtotal (string price + labour)
            total += (sprice || 0) + RACKET_LABOUR;

            orderLines.push(`Racket ${i + 1}: ${model} | ${sname}${sprice ? ' (₹' + sprice + ')' : ''} | ${tension} lbs | Image: ${imageNote}`);
        }

        if (selectedCount === 0) {
            alert("Please select at least one string to proceed.");
            return;
        }

        // express & payment adjustments
        if (expressService.checked) total += EXPRESS_SURCHARGE * selectedCount;
        if (paymentMethod.value === "Online") total -= ONLINE_DISCOUNT;
        if (total < 0) total = 0;

        const serviceTime = expressService.checked ? "Within 1 hour (+₹20/racket)" : "Within 4 hours";
        const onlineNote = paymentMethod.value === "Online" ? "Yes (₹10 off)" : "No";
        const pickupNote = (pickupDrop && pickupDrop.checked)
            ? "Yes (porter; charges borne by customer)"
            : "No";
        const discountNote = currentDiscount.amount > 0
            ? `Applied coupon ${currentDiscount.code} (-₹${currentDiscount.amount})`
            : "No coupon applied";

        const msgLines = [
            "🎽 New Stringing Order — DA SPORTZ",
            `• Store: ${store}`,
            `• Name: ${name}`,
            `• Phone: ${phone}`,
            `• Service: ${serviceTime}`,
            `• Pickup & Drop: ${pickupNote}`,
            `• Payment (online discount applies): ${onlineNote}`,
            `• Discount: ${discountNote}`,
            `• Total: ₹${total}`,
            "• Racket details:"
        ].concat(orderLines);

        const msg = msgLines.join("\n");

        // Open WhatsApp with pre-filled message
        const waLink = `https://wa.me/918800505769?text=${encodeURIComponent(msg)}`;
        window.open(waLink, "_blank");
    });

}); // DOMContentLoaded end