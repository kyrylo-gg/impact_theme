(function() {
  var form = document.querySelector('[data-size-calculate]');
  const sizes = ['XS','S','M','L','XL','XXL','XXXL'];

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
  
      var formInputs = form.querySelectorAll('input');
      var units = form.querySelector('#units');
      var script = form.querySelector('script');
      const data = JSON.parse(script.innerText);
      var success = form.querySelector('.calculator-success');
      var error = form.querySelector('.calculator-error');
      var sizeEl = success.querySelector('.calculated-size');
      var inputVal = 0;
        
      success.classList.add('hidden');
      error.classList.add('hidden');
  
      var indexes = [];
      formInputs.forEach(input => {
        if (data[input.getAttribute('name')]) {
          if (units.checked) {
            inputVal = input.value;
          } else {
            inputVal = input.value*2.54;
          }
          var neededIndex = false;
          data[input.getAttribute('name')].forEach((val, index) => {
            if (parseFloat(inputVal) >= parseFloat(val) && parseFloat(inputVal) <= parseFloat(data[input.getAttribute('name')][data[input.getAttribute('name')].length - 1])) {
              neededIndex = index;
            }
          });
          if (neededIndex !== false) {
            indexes.push(neededIndex);
          }
        }
      });
  
      if (indexes.length == 2 && sizes[indexes[0]] !== undefined && sizes[indexes[1]] !== undefined) {
        success.classList.remove('hidden');
        var size = 0;
        if (indexes[0] > indexes[1]) {
          size = sizes[indexes[0]]
        } else {
          size = sizes[indexes[1]]
        }
        sizeEl.textContent = size;
      } else if (indexes.length == 1 && sizes[indexes[0]] !== undefined) {
          success.classList.remove('hidden');
          sizeEl.textContent = sizes[indexes[0]];
      } else {
        error.classList.remove('hidden');
      }
      
    });
  }
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