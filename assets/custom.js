(function() {
  var forms = document.querySelectorAll('[data-size-calculate]');
  var sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

  function normalizeKey(name) {
    return String(name || '').toLowerCase().trim();
  }

  function getIndexByValue(values, inputValue) {
    if (!Array.isArray(values) || !values.length || !Number.isFinite(inputValue)) return null;

    var parsed = values.map(function(v) { return parseFloat(v); }).filter(function(v) { return Number.isFinite(v); });
    if (!parsed.length) return null;

    var min = parsed[0];
    var max = parsed[parsed.length - 1];
    if (inputValue < min || inputValue > max) return null;

    var neededIndex = null;
    parsed.forEach(function(val, index) {
      if (inputValue >= val && inputValue <= max) neededIndex = index;
    });

    return neededIndex;
  }

  forms.forEach(function(form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();

      var units = form.querySelector('#units');
      var script = form.querySelector('script[type="text/json"]');
      var success = form.querySelector('.calculator-success');
      var error = form.querySelector('.calculator-error');
      var sizeEl = success ? success.querySelector('.calculated-size') : null;
      if (!script || !success || !error || !sizeEl) return;

      var data = {};
      try {
        data = JSON.parse(script.innerText || '{}');
      } catch (err) {
        data = {};
      }

      success.classList.add('hidden');
      error.classList.add('hidden');

      var indexesByKey = {};
      Object.keys(data).forEach(function(rawKey) {
        var key = normalizeKey(rawKey);
        var input = form.querySelector('[name="' + rawKey + '"]');
        if (!input) return;

        var rawValue = parseFloat(String(input.value || '').replace(',', '.'));
        if (!Number.isFinite(rawValue)) return;

        var normalizedValue = units && units.checked ? rawValue : rawValue * 2.54;
        var idx = getIndexByValue(data[rawKey], normalizedValue);
        if (idx !== null) indexesByKey[key] = idx;
      });

      // For waist+hip flow, return size by larger index (more conservative fit).
      // On equal indexes, hip index is used (same size value).
      if (indexesByKey.hip !== undefined && indexesByKey.waist !== undefined) {
        var recommendedIdx = indexesByKey.waist > indexesByKey.hip ? indexesByKey.waist : indexesByKey.hip;
        if (sizes[recommendedIdx] !== undefined) {
          sizeEl.textContent = sizes[recommendedIdx];
          success.classList.remove('hidden');
          return;
        }
      }

      if (indexesByKey.chest !== undefined && sizes[indexesByKey.chest] !== undefined) {
        sizeEl.textContent = sizes[indexesByKey.chest];
        success.classList.remove('hidden');
        return;
      }

      var availableIndexes = Object.values(indexesByKey);
      if (availableIndexes.length === 1 && sizes[availableIndexes[0]] !== undefined) {
        sizeEl.textContent = sizes[availableIndexes[0]];
        success.classList.remove('hidden');
      } else {
        error.classList.remove('hidden');
      }
    });
  });
})();


(function() {
  document.addEventListener("DOMContentLoaded", (event) => {
    let form = document.getElementById('course_add_form');

    function updateProductPrice(e) {
      const currentCheckbox = this;
      const holder = this.closest('.section-stack');
      const filters = holder.querySelectorAll('[name="size-filter"]');
      const checkedFilters = holder.querySelectorAll('[name="size-filter"]:checked');
      if (filters.length) {
        if (!checkedFilters.length) {
          e.preventDefault();
          if (!holder.querySelector('.product-selector__error')) {
            var errorContent = document.createElement("p");
            errorContent.classList.add('text-error');
            errorContent.classList.add('product-selector__error');
            errorContent.textContent = "Please select your size first";
            holder.querySelector('.floating-controls-container').insertBefore(errorContent, holder.querySelector('.floating-controls-container').firstChild);
          }
          this.checked = false;
        } else if (holder.querySelector('.product-selector__error')) {
          holder.querySelector('.product-selector__error').remove();
        }
      }
      const checkboxes = document.querySelectorAll('input[type="checkbox"][data-course-bundle]:checked');
      let totalPrice = 0;
      let totalPriceDiscounted = 0;
  
      checkboxes.forEach((checkbox,index) => {
        const price = parseFloat(checkbox.getAttribute('data-price'));
        const compareAtPrice = parseFloat(checkbox.getAttribute('data-compare-at-price'))
        if (checkbox.getAttribute('data-course-bundle') != 'not-calculated') {
          if (index !== 0) {
            totalPrice += compareAtPrice ? parseInt(compareAtPrice) : parseInt(price);
            totalPriceDiscounted += parseInt(price)//(parseInt(price) - parseFloat(price/4));
          }
        } else {
          checkbox.disabled = true;
          disabledCheckboxHandler();
        }
      });

      Shopify.formatMoney = function (amount, shopifyFormat) {
        if (isNaN(amount)) {
          return 'Invalid Amount';
        }
      
        // Helper function to add thousands separators
        function addThousandsSeparators(number) {
          return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
      
        // Use regular expression to match and replace the format placeholder
        const formattedAmount = shopifyFormat.replace(/{{\s*([^}]+)\s*}}/, (match, placeholder) => {
          switch (placeholder) {
            case 'amount':
              return addThousandsSeparators(parseFloat(amount).toFixed(2));
            case 'amount_no_decimals':
              return addThousandsSeparators(Math.round(amount));
            case 'amount_with_comma_separator':
              return addThousandsSeparators(parseFloat(amount).toFixed(2)).replace('.', ',');
            case 'amount_no_decimals_with_comma_separator':
              return addThousandsSeparators(Math.round(amount)).replace('.', ',');
            case 'amount_with_apostrophe_separator':
              return parseFloat(amount).toFixed(2).replace('.', "'");
            default:
              return match; // Return the original placeholder if it's not recognized
          }
        });
      
        return formattedAmount;
      }
  
      const productPriceElement = document.querySelector('.product sale-price');
      const productCompareAtPriceElement = document.querySelector('.product compare-at-price');
      if (productPriceElement) {
        const initialProductPrice = productPriceElement.getAttribute('data-price'); // Replace with your initial product price
        const initialCompareAtProductPrice = productCompareAtPriceElement.getAttribute('data-price'); // Replace with your initial product price
        const newProductPrice = initialCompareAtProductPrice ? parseInt(initialCompareAtProductPrice) + parseInt(totalPrice) : parseInt(initialProductPrice) + parseInt(totalPrice);
        const newProductPriceDiscounted = parseInt(initialProductPrice) + parseInt(totalPriceDiscounted);
        
        let money = productPriceElement.nextElementSibling.querySelector('.money');
        if (money) {
          money.innerHTML = Shopify.formatMoney ? Shopify.formatMoney(parseInt(newProductPrice / 100), window.themeVariables.settings.moneyFormat) : window.themeVariables.settings.moneyFormat.replace('{{amount}}', (newProductPrice / 100).toFixed(2));
        } else {
          const productSalePrice = document.createElement('span');
          productSalePrice.classList.add('money');
          productSalePrice.innerHTML = Shopify.formatMoney ? Shopify.formatMoney(parseInt(newProductPrice / 100), window.themeVariables.settings.moneyFormat) : window.themeVariables.settings.moneyFormat.replace('{{amount}}', (newProductPrice / 100).toFixed(2));
          productPriceElement.nextElementSibling.appendChild(productSalePrice);
        }
        if (newProductPrice == newProductPriceDiscounted) {
          productPriceElement.nextElementSibling.setAttribute('hidden', '');
        } else {
          productPriceElement.nextElementSibling.removeAttribute('hidden');
        }
        productPriceElement.innerHTML = Shopify.formatMoney ? Shopify.formatMoney(parseInt(newProductPriceDiscounted / 100), window.themeVariables.settings.moneyFormat) : window.themeVariables.settings.moneyFormat.replace('{{amount}}', (newProductPriceDiscounted / 100).toFixed(2));
      }
    }

    // Add event listeners to checkboxes to update the price on change
    const checkboxes = document.querySelectorAll('input[type="checkbox"][data-course-bundle]');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', updateProductPrice);
    });

    function disabledCheckboxHandler() {
      const disabledCheckboxes = document.querySelectorAll('input[type="checkbox"][data-course-bundle][disabled]');
      disabledCheckboxes.forEach(disabledCheckbox => {
        disabledCheckbox.closest('label').addEventListener('click', function(e) {
          if (disabledCheckbox.disabled && !disabledCheckbox.closest('label').parentNode.querySelector('.product-selector__error')) {
            const addingError = document.createElement('p');
            addingError.classList.add('product-selector__error');
            addingError.classList.add('text-error');
            addingError.textContent = 'You have already added knee pads';
            disabledCheckbox.closest('label').parentNode.parentNode.insertBefore(addingError, disabledCheckbox.closest('label').parentNode.nextSibling);
          }
        });
      });
    }

    if (form){
      form.addEventListener('submit', _onSubmit);
  
      async function _onSubmit(e) {
        e.preventDefault();
        const productSelectors = document.querySelectorAll('[data-course-bundle]:checked');
        let productSelectorsMain = Array.from(productSelectors).filter((selector) => selector.getAttribute('data-course-bundle') !== "not-calculated");
        let productSelectorsAdditional = [false]; //Array.from(productSelectors).filter((selector) => selector.getAttribute('data-course-bundle') == "not-calculated");
        const submitButtons = Array.from(this.elements).filter((button) => button.type === "submit");

        if (!document.querySelectorAll('[data-course-bundle=""]')[0].closest('.section-stack--outer').parentNode.classList.contains('hidden')) {
          let errorAddedMain = submitButtons[0].parentElement.parentElement.querySelector('.product-selector__error--main');
          let errorAddedAdditional = submitButtons[0].parentElement.parentElement.querySelector('.product-selector__error--additional');
          if (!productSelectorsMain.length || !productSelectorsAdditional.length) {
            if (!productSelectorsMain.length && !errorAddedMain) {
              const error = document.createElement('p');
              error.classList.add('product-selector__error');
              error.classList.add('product-selector__error--main');
              error.classList.add('text-error');
              error.textContent = 'Select your shorts first';
              submitButtons[0].parentElement.parentElement.appendChild(error);
              let scrollTo = document.getElementById('product-selector-scroll-to');
              if (scrollTo) {
                setTimeout(function() {
                  scrollTo.dispatchEvent(new Event('click', { bubbles: true }));
                }, 500)
              }
            } else if (productSelectorsMain.length && errorAddedMain) {
              errorAddedMain.remove();
            }
            
            if (!productSelectorsAdditional.length && !errorAddedAdditional) {
              const error = document.createElement('p');
              error.classList.add('product-selector__error');
              error.classList.add('product-selector__error--additional');
              error.classList.add('text-error');
              error.textContent = 'Please add knee pads to your order';
              submitButtons[0].parentElement.parentElement.appendChild(error);
            } else if (productSelectorsAdditional.length && errorAddedAdditional) {
              errorAddedAdditional.remove();
            }
            
            submitButtons.forEach((submitButton) => {
              submitButton.setAttribute("aria-busy", "false");
            });
            return false;
          } else if (errorAddedMain ||errorAddedAdditional) {
            if (errorAddedMain) {
              errorAddedMain.remove();
            }
            if (errorAddedAdditional) {
              errorAddedAdditional.remove();
            }
          }
        }
        submitButtons.forEach((submitButton) => {
          submitButton.setAttribute("disabled", "disabled");
          submitButton.setAttribute("aria-busy", "true");
        });
        let sectionsToBundle = ["variant-added"];
        let fetchPromises = []; // Array to store the fetch promises
        let allResponses = [];
        document.documentElement.dispatchEvent(new CustomEvent("cart:prepare-bundled-sections", { bubbles: true, detail: { sections: sectionsToBundle } }));
        const formData = new FormData(this);
        const variatnId = this.id.value;
        formData.set("sections", sectionsToBundle.join(","));
        formData.set("sections_url", `${Shopify.routes.root}variants/${this.id.value}`);
        submitButtons.forEach((submitButton) => {
          submitButton.removeAttribute("disabled");
          submitButton.removeAttribute("aria-busy");
        });
        
        let items = {
         'items': [{
          'id': parseInt(variatnId),
          'quantity': 1
          }]
        };

        
        if (!document.querySelectorAll('[data-course-bundle=""]')[0].closest('.section-stack--outer').parentNode.classList.contains('hidden')) {
          productSelectors.forEach(async (productSelector) => {
            formData.delete('id');
            formData.set("sections_url", `${Shopify.routes.root}variants/${productSelector.value}`);
            items.items.push({
              "id": parseInt(productSelector.value),
              "quantity": parseInt(1)
            });
          });
        }

        if (items.items.length) {
          var jsonData = JSON.parse(JSON.stringify(items));
          
          // Iterate through the FormData entries and add them to the JavaScript object
          for (var pair of formData.entries()) {
            jsonData[pair[0]] = pair[1];
          }

          // Convert the combined JavaScript object back to JSON
          var combinedJSON = JSON.stringify(jsonData);
            
          // Create a fetch promise and push it into the array
          const fetchPromise = await fetch(`${Shopify.routes.root}cart/add.js`, {
            body: combinedJSON,
            method: "POST",
            headers: {
              'Content-Type': 'application/json',
              "X-Requested-With": "XMLHttpRequest"
              // Needed for Shopify to check inventory
            }
          });
          fetchPromises.push(fetchPromise);
        
          const response2 = await fetchPromise.json();
          allResponses.push(response2);
        }
        
        try {
          await Promise.all(fetchPromises);
          if (window.themeVariables.settings.cartType === "page" || window.themeVariables.settings.pageType === "cart") {
            return window.location.href = `${Shopify.routes.root}cart`;
          }

          let errors = false;
          allResponses.forEach(resp => {
            if (resp['description'] !== undefined) {
              errors = true;
              this.dispatchEvent(new CustomEvent("cart:error", {
                bubbles: true,
                detail: {
                  error: resp['description']
                }
              }));
            }
          });
          if (errors) {
            return;
          }

          const cartContent = await (await fetch(`${Shopify.routes.root}cart.js`)).json();
          
          cartContent["sections"] = allResponses[allResponses.length-1]["sections"];
          this.dispatchEvent(new CustomEvent("variant:add", {
            bubbles: true,
            detail: {
              items: allResponses[allResponses.length-1].hasOwnProperty("items") ? allResponses[allResponses.length-1]["items"] : [allResponses[allResponses.length-1]],
              cart: cartContent
            }
          }));
          document.documentElement.dispatchEvent(new CustomEvent("cart:change", {
            bubbles: true,
            detail: {
              baseEvent: "variant:add",
              cart: cartContent
            }
          }));
        } catch (error) {
          console.error("At least one fetch request failed:", error);
          allResponses.forEach(resp => {
            if (resp['description'] !== undefined) {
              this.dispatchEvent(new CustomEvent("cart:error", {
                bubbles: true,
                detail: {
                  error: resp['description']
                }
              }));
            }
          });
        }
      }
    }
  });
})();

window.nassAddVariantToCart = async function nassAddVariantToCart(variantId, triggerEl, options) {
  if (!variantId) return false;

  const opts = options && typeof options === 'object' ? options : {};
  const blockCartDrawerOpening = opts.blockCartDrawerOpening !== false;
  const routesRoot = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  const sectionsToBundle = ['variant-added'];

  document.documentElement.dispatchEvent(new CustomEvent('cart:prepare-bundled-sections', {
    bubbles: true,
    detail: { sections: sectionsToBundle }
  }));

  const response = await fetch(routesRoot + 'cart/add.js', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify({
      id: parseInt(variantId, 10),
      quantity: 1,
      sections: sectionsToBundle.join(','),
      sections_url: routesRoot + 'variants/' + variantId
    })
  });

  const responseJson = await response.json();

  if (!response.ok || responseJson.status) {
    document.documentElement.dispatchEvent(new CustomEvent('cart:error', {
      bubbles: true,
      detail: {
        error: responseJson.description || responseJson.message || 'Could not add to cart'
      }
    }));
    return false;
  }

  if (
    window.themeVariables
    && (window.themeVariables.settings.cartType === 'page' || window.themeVariables.settings.pageType === 'cart')
  ) {
    window.location.href = routesRoot + 'cart';
    return true;
  }

  const cartContent = await (await fetch(routesRoot + 'cart.js')).json();
  cartContent.sections = responseJson.sections || {};

  const variantAddDetail = {
    items: Object.prototype.hasOwnProperty.call(responseJson, 'items') ? responseJson.items : [responseJson],
    cart: cartContent
  };
  if (blockCartDrawerOpening) {
    variantAddDetail.blockCartDrawerOpening = true;
  }

  (triggerEl || document.documentElement).dispatchEvent(new CustomEvent('variant:add', {
    bubbles: true,
    detail: variantAddDetail
  }));
  document.documentElement.dispatchEvent(new CustomEvent('cart:change', {
    bubbles: true,
    detail: {
      baseEvent: 'variant:add',
      cart: cartContent
    }
  }));

  if (window.OCUApi && typeof window.OCUApi.renderOCUDiscounts === 'function') {
    window.OCUApi.renderOCUDiscounts();
  }

  return true;
};

(function() {
  window.nassGetBootyWorkoutsTierVariantId = function nassGetBootyWorkoutsTierVariantId(triggerEl) {
    const section = triggerEl && triggerEl.closest
      ? triggerEl.closest('.booty-workouts')
      : null;
    if (!section) return null;

    const fallbackId = section.getAttribute('data-booty-workouts-fallback-variant-id');
    const tiersRoot = section.querySelector('[data-booty-workouts-tiers]');
    if (!tiersRoot) return fallbackId || null;

    const tiers = Array.from(tiersRoot.querySelectorAll('[data-booty-workouts-tier]'));
    const selectedTier = tiers.find((tier) => tier.classList.contains('is-selected'))
      || tiers.find((tier) => tier.classList.contains('is-expanded'))
      || tiers[0];
    if (!selectedTier) return fallbackId || null;

    return selectedTier.getAttribute('data-variant-id') || fallbackId || null;
  };

  window.nassSyncBootyWorkoutsCartCta = function nassSyncBootyWorkoutsCartCta(triggerEl) {
    const btn = triggerEl && triggerEl.hasAttribute('data-booty-workouts-cart-cta')
      ? triggerEl
      : (triggerEl && triggerEl.closest
        ? triggerEl.closest('[data-booty-workouts-cart-cta]')
        : null);
    if (!btn) return;

    const variantId = window.nassGetBootyWorkoutsTierVariantId(btn);
    if (variantId) btn.setAttribute('data-variant-id', variantId);
  };

  function isOcuRuntimeReady() {
    return !!(
      window.OCUIncart
      || (window.Zipify && window.Zipify.OCU)
      || (window.Zipify && window.Zipify.Cart)
    );
  }

  function hasVisibleOcuPopup() {
    const selectors = [
      '.ocu-popup',
      '.ocu-modal',
      '[class*="ocu-popup"]',
      '[class*="ocu-offer"]',
      '[class*="OCU"]',
      '[id*="ocu-popup"]',
      '[id*="ocu-app"]',
      'zipify-ocu-offer',
      '#ocu-app',
      '[data-ocu-popup]'
    ];
    return selectors.some((selector) => {
      const nodes = document.querySelectorAll(selector);
      return Array.from(nodes).some((node) => {
        const style = window.getComputedStyle(node);
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0;
      });
    });
  }

  function openCartDrawerIfNeeded() {
    if (
      !window.themeVariables
      || window.themeVariables.settings.cartType !== 'drawer'
    ) {
      return;
    }
    const drawer = document.querySelector('cart-drawer');
    if (drawer && typeof drawer.show === 'function') {
      drawer.show();
    }
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function isVariantInCart(variantId) {
    const routesRoot = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
    try {
      const cart = await (await fetch(routesRoot + 'cart.js')).json();
      return (cart.items || []).some((item) => String(item.variant_id) === String(variantId));
    } catch (error) {
      return false;
    }
  }

  async function manualAddToCartWithDrawer(btn, variantId) {
    if (!variantId || typeof window.nassAddVariantToCart !== 'function') return false;
    if (btn.getAttribute('aria-busy') === 'true') return false;

    btn.setAttribute('aria-busy', 'true');
    try {
      const added = await window.nassAddVariantToCart(variantId, btn, { blockCartDrawerOpening: false });
      if (added) openCartDrawerIfNeeded();
      return added;
    } finally {
      btn.removeAttribute('aria-busy');
    }
  }

  function scheduleOcuAtcFallback(btn, variantId) {
    const startedAt = Date.now();
    const maxWait = 2500;

    const tick = async () => {
      if (hasVisibleOcuPopup()) {
        window.__nassOcuPendingAtc = false;
        return;
      }

      const inCart = await isVariantInCart(variantId);
      if (inCart) {
        window.__nassOcuPendingAtc = false;
        if (!hasVisibleOcuPopup()) {
          openCartDrawerIfNeeded();
        }
        return;
      }

      if (Date.now() - startedAt >= maxWait) {
        window.__nassOcuPendingAtc = false;
        await manualAddToCartWithDrawer(btn, variantId);
        return;
      }

      window.setTimeout(tick, 250);
    };

    window.setTimeout(tick, 300);
  }

  document.addEventListener('variant:add', (event) => {
    if (!window.__nassOcuPendingAtc || !event.detail) return;
    event.detail.blockCartDrawerOpening = true;
  }, true);

  document.addEventListener('mousedown', (event) => {
    const btn = event.target.closest('[data-nass-ocu-atc]');
    if (!btn) return;
    window.__nassOcuLastButton = btn;
    window.nassSyncBootyWorkoutsCartCta(btn);
  }, true);

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-nass-ocu-atc]');
    if (!btn || btn.getAttribute('aria-busy') === 'true') return;

    window.__nassOcuLastButton = btn;
    window.nassSyncBootyWorkoutsCartCta(btn);

    const variantId = btn.getAttribute('data-variant-id')
      || window.nassGetBootyWorkoutsTierVariantId(btn);
    if (!variantId) return;

    if (!isOcuRuntimeReady()) {
      event.preventDefault();
      event.stopPropagation();
      manualAddToCartWithDrawer(btn, variantId);
      return;
    }

    // OCU funnel is configured for "Page with Product Buy Box" / Add To Cart.
    // Do not block the click — OCU must receive it in capture phase.
    window.__nassOcuPendingAtc = true;
    scheduleOcuAtcFallback(btn, variantId);
  }, false);
})();