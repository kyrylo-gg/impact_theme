document.addEventListener('DOMContentLoaded', function() {
  initTabs();
  customBundleProduct();
});

// Content tabs init
function initTabs() {
  document.querySelector('.custom-product-bundle__tabs').classList.add('js-tabset');
  tabset(document.querySelector('.custom-product-bundle__tabs'), {
    tabLinks: 'a',
    defaultTab: true
  });
}

// Tabs plugin
function tabset(holder, options) {
  var tabLinks = holder.querySelectorAll(options.tabLinks);
  var tabHolder = options.autoHeight ? tabLinks[0].getAttribute(options.attrib) : null;
  var activeTabIndex, prevTabIndex;

  function init() {
    setStartActiveIndex();
    setActiveTab();
    makeCallback('onInit', this);
  }

  function setStartActiveIndex() {
    var classTargets = getClassTarget(tabLinks);
    if (classTargets) {
      var activeLink = Array.from(classTargets).find(link => link.classList.contains(options.activeClass));
      var hashLink = Array.from(tabLinks).find(link => link.getAttribute(options.attrib) === location.hash);
  
      if (options.checkHash && hashLink) {
        activeLink = hashLink;
      }
  
      activeTabIndex = prevTabIndex = (activeLink ? Array.from(classTargets).indexOf(activeLink) : (options.defaultTab ? 0 : null));
    }
  }

  function setActiveTab() {
    tabLinks.forEach(function(link, i) {
      var classTarget = getClassTarget([link]);
      var tab = document.querySelector(link.getAttribute(options.attrib));

      if (tab) {
        if (i !== activeTabIndex) {
          classTarget.classList.remove(options.activeClass);
          tab.classList.add(options.tabHiddenClass);
          tab.classList.remove(options.activeClass);
        } else {
          classTarget.classList.add(options.activeClass);
          tab.classList.remove(options.tabHiddenClass);
          tab.classList.add(options.activeClass);
        }
      }

      attachTabLink(link, i);
    });
  }

  function attachTabLink(link, i) {
    link.addEventListener(options.event, function(e) {
      e.preventDefault();

      if (activeTabIndex === prevTabIndex && activeTabIndex !== i) {
        activeTabIndex = i;
        switchTabs();
      }
      if (options.checkHash) {
        location.hash = link.getAttribute('href').split('#')[1];
      }
    });
  }

  function resizeHolder(height) {
    if (height) {
      tabHolder.style.height = height + 'px';
      setTimeout(function() {
        tabHolder.classList.add('transition');
      }, 10);
    } else {
      tabHolder.classList.remove('transition');
      tabHolder.style.height = '';
    }
  }

  function switchTabs() {
    var prevLink = tabLinks[prevTabIndex];
    var nextLink = tabLinks[activeTabIndex];
    var prevTab = getTab(prevLink);
    var nextTab = getTab(nextLink);

    prevTab.classList.remove(options.activeClass);

    if (haveTabHolder()) {
      resizeHolder(prevTab.offsetHeight);
    }

    setTimeout(function() {
      getClassTarget([prevLink]).classList.remove(options.activeClass);

      prevTab.classList.add(options.tabHiddenClass);
      nextTab.classList.remove(options.tabHiddenClass);
      nextTab.classList.add(options.activeClass);

      getClassTarget([nextLink]).classList.add(options.activeClass);

      if (haveTabHolder()) {
        resizeHolder(nextTab.offsetHeight);

        setTimeout(function() {
          resizeHolder();
          prevTabIndex = activeTabIndex;
          makeCallback('onChange', this);
        }, options.animSpeed);
      } else {
        prevTabIndex = activeTabIndex;
      }
    }, options.autoHeight ? options.animSpeed : 1);
  }

  function getClassTarget(links) {
    return options.addToParent ? links[0].parentNode : links[0];
  }

  function getActiveTab() {
    return getTab(tabLinks[activeTabIndex]);
  }

  function getTab(link) {
    return document.querySelector(link.getAttribute(options.attrib));
  }

  function haveTabHolder() {
    return tabHolder !== null && tabHolder.length;
  }

  function destroy() {
    tabLinks.forEach(function(link) {
      var classTarget = getClassTarget([link]);
      classTarget.classList.remove(options.activeClass);
      getTab(link).classList.remove(options.activeClass + ' ' + options.tabHiddenClass);
    });

    holder.removeAttribute('data-Tabset');
  }

  function makeCallback(name) {
    if (typeof options[name] === 'function') {
      var args = Array.prototype.slice.call(arguments);
      args.shift();
      options[name].apply(this, args);
    }
  }

  init();

  return {
    destroy: destroy
  };
}

document.querySelectorAll('.custom-product-bundle__tabs').forEach(function(holder) {
  tabset(holder, {
    activeClass: 'active',
    addToParent: false,
    autoHeight: false,
    checkHash: false,
    defaultTab: true,
    animSpeed: 500,
    tabLinks: 'a',
    attrib: 'href',
    event: 'click',
    tabHiddenClass: 'js-tab-hidden'
  });
});


function customBundleProduct() {
  const customBundle = document.querySelector('[data-custom-bundle]');
  const showClass = 'show';
  const hidden = 'hidden';
  const addClass = 'custom-product-bundle__btn--add';
  const addedClass = 'custom-product-bundle__btn--added';
  const zeroPricesClass = 'zero-prices';
  const zeroPricesOneClass = 'zero-prices--one';
  const zeroPricesTwoClass = 'zero-prices--two';

  const initialStepsClasses = function() {
    return Array.from(getSteps()).map(el => {
      return Array.from(el.classList);
    });
  }();
  
  let storage = JSON.parse(localStorage.getItem('custom_bundle') || '{}');
  let cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');

  clearStorage();  
  initPopups();
  initSteps();
  initFilters();
  initBundle();
  initQtyField();
  simpleAddToCart();
  addProgramToBundle();

  document.addEventListener('click', function(e) {
    let target = e.target.closest('[data-bundle-remove]');
    
    if(target){
      let itemAddBtn = target.closest('[data-bundle-item-id]').querySelector('[data-bundle-item]');
      let removeItem = target.getAttribute('data-bundle-remove').split('__');
      let stepNumber = removeItem[0].split('_')[1];
      let step = target.closest('[data-step="'+stepNumber+'"]');

      itemAddBtn.disabled = false;
      
      removeFromStorage(stepNumber, removeItem[1]);
      
      if (step.classList.contains(zeroPricesTwoClass)) {
        let amount = 0;
        let steps = Array.from(getSteps());
        steps.forEach((st, c) => {
          if (c > 0 && c <= 2 && storage['step_'+st.dataset.step] !== undefined) {
            Object.values(storage['step_'+st.dataset.step]).forEach(qty => {
              amount += qty;
            })
          }
        });

        if (amount < 2) {
          steps.forEach((st, c) => {
            if (c > 0 && c <= 2) {
              st.classList.add(zeroPricesClass);
            }
          });
        }
      } else if (step.classList.contains(zeroPricesOneClass)) {
        let amount = 0;
        let steps = Array.from(getSteps());
        steps.forEach((st, c) => {
          if (c > 0 && c <= 2 && storage['step_'+st.dataset.step] !== undefined) {
            Object.values(storage['step_'+st.dataset.step]).forEach(qty => {
              amount += qty;
            })
          }
        });

        if (amount < 1) {
          steps.forEach((st, c) => {
            if (c > 0 && c <= 2) {
              st.classList.add(zeroPricesClass);
            }
          });
        }
      }

      if (storage[removeItem[0]] == undefined || Object.keys(storage[removeItem[0]]).length == 0) {
        let next = step.querySelector('[data-next-step]');
        
        if (!step.classList.contains(zeroPricesOneClass) && !step.classList.contains(zeroPricesTwoClass)) {
          step.classList.add(zeroPricesClass);
        }

        if (next.dataset.nextStep != 'available') {
          next.setAttribute('disabled', true);
        }
      }
      
      target.remove();
    }
  });

  document.querySelectorAll('.cpb__item-description-opener').forEach(descr => {
    descr.addEventListener('click', function(e) {
      e.preventDefault();

      if (this.classList.contains(showClass)) {
        this.classList.remove(showClass);
      } else {
        this.classList.add(showClass);
      }
    });
  });
  
  function initPopups() {
    let popupOpeners = document.querySelectorAll('[data-bundle-popup]');
  
    popupOpeners.forEach(opener => {
      let popup = document.getElementById(opener.dataset.bundlePopup);
      
      if (popup) {
        let closePopup = popup.querySelectorAll('[data-popup-close]');
    
        opener.addEventListener('click', function(e) {
          e.preventDefault();
    
          popup.classList.add(showClass);
          if (opener.dataset.variantId !== undefined) {
            updateStorage(1, opener.dataset.variantId, 1);
          } else {
            clearStorage();
          }
          document.body.style.overflow = 'hidden';
        });
  
        closePopup.forEach(cp => {
          cp.addEventListener('click', function(e) {
            e.preventDefault();
    
            popup.classList.remove(showClass);
            document.body.style.overflow = null;

            if (cp.dataset.popupClose == 'step') {
              getSteps().forEach((step, index) => {
                if (index == 0) {
                  step.removeAttribute(hidden);
                } else {
                  step.setAttribute(hidden, true);
                }
              });
            }
          });
        });
      }
    });
  }
  
  function getSteps() {
    return document.querySelectorAll('#bundle-popup')[0].getAttribute('data-with-extra') ? document.querySelectorAll('#bundle-popup [data-step]:not(.hide-if-extra-enabled)') : document.querySelectorAll('#bundle-popup [data-step]:not(.extra-step)');
  }
  
  
  function initSteps() {
    let steps = getSteps();
    
    steps.forEach((step, index) => {
      let next = step.querySelector('[data-next-step]');
      let prev = step.querySelector('[data-prev-step]');
      let stepsCount = step.querySelector('[data-steps-count]');
      let stepIndexVal = step.querySelector('[data-steps-index]')

      stepsCount.innerText = steps.length;
      stepIndexVal.innerText = index + 1;

      let nextButtonEvent = function (e) {
        e.preventDefault();
        
        if (steps.length == index+1) {
          addBundleToCart();
          step.closest('.lightbox').querySelectorAll('[data-popup-close="step"]')[0].dispatchEvent(new Event('click'));
          steps.forEach((s, index) => {
            s.querySelectorAll('[data-bundle-item-id] [data-remove-holder]').forEach(h => {
              h.innerHTML = '';
            });
            if (index > 0) {
              let next = s.querySelector('[data-next-step]');
              if (next.dataset.nextStep != 'available') {
                next.setAttribute('disabled', true);
              }
            }
          });
        } else {
          step.setAttribute(hidden, true);
        
          if (steps.length > index+1) {
            steps[index+1].removeAttribute(hidden);
          } else {
            steps[0].removeAttribute(hidden)
          }
        }
      };
      let prevButtonEvent = function (e) {
        e.preventDefault();
      
        if (index == 0) {
          //steps[steps.length-1].removeAttribute(hidden);
          return;
        } else {
          step.setAttribute(hidden, true);
          console.log(getSteps());
          getSteps()[index-1].removeAttribute(hidden)
        }
      }

      nextClone = next.cloneNode(true);
      next.parentNode.replaceChild(nextClone, next);
      
      nextClone.removeEventListener('click', nextButtonEvent);
      nextClone.addEventListener('click', nextButtonEvent);


      prevClone = prev.cloneNode(true);
      prev.parentNode.replaceChild(prevClone, prev);

      prevClone.removeEventListener('click', prevButtonEvent);
      prevClone.addEventListener('click', prevButtonEvent);
    });
  }

  function initFilters() {
    let filters = document.querySelectorAll('[data-filter]');
    let clearFilters = document.querySelectorAll('[data-filters-clear]');

    filters.forEach(filter => {
      filter.addEventListener('change', function () {
        let filtersHolder = this.closest('[data-filters]');
        let step = document.querySelector('[data-step="'+filtersHolder.dataset.filters+'"]');
        let products = step.querySelectorAll('[data-sizes]');
        let availableQty = filtersHolder.querySelector('[data-filtered-count]');

        updateFiltersState(products, availableQty, filter.value);
      });
    });

    clearFilters.forEach(clear => {
      clear.addEventListener('click', function () {
        let filtersHolder = this.closest('[data-filters]');
        let step = document.querySelector('[data-step="'+filtersHolder.dataset.filters+'"]');
        let products = step.querySelectorAll('[data-sizes]');
        let availableQty = filtersHolder.querySelector('[data-filtered-count]');
        let localFilters = filtersHolder.querySelectorAll('[data-filter]');

        localFilters.forEach(f => {
          f.checked = false;
        });

        updateFiltersState(products, availableQty, '');
      });
    });

    function updateFiltersState(products, availableQty, value) {
      products.forEach(product => {
        let sizes = JSON.parse(product.dataset.sizes);

        if (value.length) {
          if (sizes[value] == undefined || sizes[value] == false) {
            product.setAttribute(hidden, true);
          } else {
            product.removeAttribute(hidden);
          }
        } else {
          product.removeAttribute(hidden);
        }
      });

      availableQty.innerText = Array.from(products).filter(p => !p.hasAttribute(hidden)).length;
    }
  }


  function initBundle() {
    let addButtons = document.querySelectorAll('[data-bundle-item]');
    const lightbox = document.getElementById('bundle_item_settings');
    let closeBtn = lightbox.querySelector('.custom-bundle-item__close');
    let image = lightbox.querySelector('[data-bundle-image]');
    let title = lightbox.querySelector('[data-bundle-title]');
    //let price = lightbox.querySelector('[data-bundle-item-price]');
    let variants = lightbox.querySelector('[data-bundle-variants]');
    let qty = lightbox.querySelector('[data-bundle-item-qty]');
    let qtyPlus = lightbox.querySelector('[data-bundle-qty-plus]');
    let qtyMinus = lightbox.querySelector('[data-bundle-qty-minus]');
    let addBundle = lightbox.querySelector('[data-bundle-add]');
    let sizeChartOpeners = lightbox.querySelectorAll('[data-size-chart] modal-opener');

    let currentThemeColor = '';
    const themeColor = document.createElement('meta');
    themeColor.setAttribute('name', 'theme-color');
    themeColor.setAttribute('id','theme_color');
    themeColor.setAttribute('content', '#000');

    addButtons.forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();

        let bundleHolder = btn.closest('[data-bundle-product-item]');
        let step = bundleHolder.closest('[data-step]');
        let noCalcForProduct = String(bundleHolder.dataset.noCalc || '').toLowerCase() === 'true';
        let productId = String(bundleHolder.dataset.bundleItemId || '');
        let settings = JSON.parse(btn.dataset.bundleItem);
        image.setAttribute('src', settings.image);
        title.innerText = settings.title;
        qtyPlus.disabled = false;
        qtyMinus.disabled = false;
        variants.innerHTML = generateVariants(settings.variants);

        hasChecked = false;
        
        settings.variants.forEach(v => {
          if (v.title != "Default Title") {
            if (!hasChecked && v.available) {
              hasChecked = true;
              settings.variants_qty.forEach(vqty => {
                if (vqty.id == v.id) {
                  let max = vqty.max;
                  if (storage['step_'+lightbox.dataset.forStep] && storage['step_'+lightbox.dataset.forStep][vqty.id]) {
                    max = max - storage['step_'+lightbox.dataset.forStep][vqty.id];
                  }

                  qty.setAttribute('min', vqty.min);
                  qty.setAttribute('max', max);
                  qty.value = vqty.min || 1;
                }
              });
              return;
            }
          } else {
            settings.variants_qty.forEach(vqty => {
              if (vqty.id == v.id) {
                let max = vqty.max;
                if (storage['step_'+lightbox.dataset.forStep] && storage['step_'+lightbox.dataset.forStep][vqty.id]) {
                  max = max - storage['step_'+lightbox.dataset.forStep][vqty.id];
                }

                qty.setAttribute('min', vqty.min);
                qty.setAttribute('max', max);
                qty.value = vqty.min || 1;
              }
            });
          }
        });

        variants.querySelectorAll('input').forEach(input => {
          if (storage['step_'+lightbox.dataset.forStep]) {
            Object.keys(storage['step_'+lightbox.dataset.forStep]).forEach(item => {
              if (item == input.value && !input.disabled) {
                let max = 1;
                let min = 1;
                settings.variants_qty.forEach(vqty => {
                  if (vqty.id == item) {
                    max = vqty.max;
                  }
                });

                if (storage['step_'+lightbox.dataset.forStep][item] >= max) {
                  input.disabled = true;

                  if (input.checked === true) {
                    input.checked = false;
                    let available = input.closest('[data-bundle-variants]').querySelectorAll('input:not(:disabled)');

                    if (available.length) {
                      available[0].checked = true;

                      settings.variants_qty.forEach(vqty => {
                        if (vqty.id == available[0].value) {
                          qty.setAttribute('min', vqty.min);
                          qty.setAttribute('max', vqty.max);
                          qty.value = vqty.min || 1;
                        }
                      });
                    }
                  }
                }
              }
            });
          }

          input.addEventListener('change', function() {
            let input_id = this.value;

            qtyPlus.disabled = false;
            qtyMinus.disabled = false;

            settings.variants_qty.forEach(vqty => {
              if (vqty.id == input_id) {
                let max = vqty.max;
                if (storage['step_'+lightbox.dataset.forStep] && storage['step_'+lightbox.dataset.forStep][vqty.id]) {
                  max = max - storage['step_'+lightbox.dataset.forStep][vqty.id];
                }

                qty.setAttribute('min', vqty.min);
                qty.setAttribute('max', max);

                if (qty.value > max) {
                  qty.value = max;
                }
              }
            });
          });
        });
        
        
        if (sizeChartOpeners.length) {
          sizeChartOpeners.forEach(opener => {
            if (
              opener.getAttribute('data-in-step') !== undefined &&
              opener.getAttribute('data-in-step') == step.dataset.step &&
              String(opener.getAttribute('data-bundle-product-id') || '') === productId
            ) {
              opener.removeAttribute('hidden');
              opener.dataset.noCalc = noCalcForProduct ? 'true' : 'false';
              var controlsId = opener.querySelector('[aria-controls]') ? opener.querySelector('[aria-controls]').getAttribute('aria-controls') : null;
              if (controlsId) {
                var sizeChartModal = document.getElementById(controlsId);
                if (sizeChartModal) {
                  var calcBlock = sizeChartModal.querySelector('.size-calculator');
                  if (calcBlock) calcBlock.style.display = noCalcForProduct ? 'none' : '';
                }
              }
            } else {
              opener.setAttribute('hidden', true);
            }
          });
        }
        
        lightbox.setAttribute('data-for-step', step.dataset.step);
        addBundle.setAttribute('data-bundle-product-info', bundleHolder.dataset.bundleProductItem);
        addBundle.setAttribute('data-bundle-product-id', bundleHolder.dataset.bundleItemId);
        
        image.onload = function() {
          let tc = document.querySelector('meta[name="theme-color"]');
          if (tc) {
            currentThemeColor = tc.getAttribute('content');
            tc.setAttribute('content', '#000');
          } else {
            document.head.append(themeColor);
          }
        }
          
        lightbox.classList.add(showClass);
      });
    });

    closeBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (currentThemeColor.length) {
        let ctc = document.querySelector('meta[name="theme-color"]');
        if (ctc) {
          ctc.setAttribute('content', currentThemeColor);
        }
      } else {
        let tc = document.getElementById('theme_color');
        
        if (tc) {
          tc.remove();
        }
      }
      lightbox.classList.remove(showClass);
    });

    addBundle.addEventListener('click', function (e) {
      e.preventDefault();
      
      lightbox.querySelectorAll('[data-bundle-variant]:checked').forEach(v => {
        if (storage['step_'+lightbox.dataset.forStep] && storage['step_'+lightbox.dataset.forStep][v.value]) {
          updateStorage(lightbox.dataset.forStep, v.value, parseInt(storage['step_'+lightbox.dataset.forStep][v.value]) + parseInt(qty.value));
        } else {
          updateStorage(lightbox.dataset.forStep, v.value, parseInt(qty.value));
        }

        let steps = Array.from(getSteps());
        let currentStep = steps.filter(item => item.getAttribute('data-step') == lightbox.dataset.forStep)[0];
        let btn = currentStep.querySelector(`[data-bundle-item-id='${addBundle.dataset.bundleProductId}'] [data-bundle-item]`);
        let settings = JSON.parse(btn.dataset.bundleItem);
        let activeVariants = variants.querySelectorAll('input:not(:disabled)').length - 1;

        let disableBtn = true;
        Object.keys(storage['step_'+lightbox.dataset.forStep]).forEach(item => {
          settings.variants_qty.forEach(vqty => {
            if ((vqty.id == item && storage['step_'+lightbox.dataset.forStep][item] < vqty.max) || (!Object.keys(storage['step_'+lightbox.dataset.forStep]).includes(vqty.id) && activeVariants)) {
              disableBtn = false;
            }
          });
        });

        if (disableBtn) {
          btn.disabled = true;
        } else {
          btn.disabled = false;
        }

        if (currentStep.classList.contains(zeroPricesTwoClass)) {
          let amount = 0;
          steps.forEach((st, c) => {
            if (c > 0 && c <= 2 && storage['step_'+st.dataset.step] !== undefined) {
              Object.values(storage['step_'+st.dataset.step]).forEach(quantity => {
                amount += quantity;
              })
            }
          });

          if (amount >= 2) {
            steps.forEach((st, c) => {
              if (c > 0 && c <= 2) {
                st.classList.remove(zeroPricesClass);
              }
            });
          }
        } else if (currentStep.classList.contains(zeroPricesOneClass)) {
          let amount = 0;
          steps.forEach((st, c) => {
            if (c > 0 && c <= 2 && storage['step_'+st.dataset.step] !== undefined) {
              Object.values(storage['step_'+st.dataset.step]).forEach(quantity => {
                amount += quantity;
              })
            }
          });

          if (amount >= 1) {
            steps.forEach((st, c) => {
              if (c > 0 && c <= 2) {
                st.classList.remove(zeroPricesClass);
              }
            });
          }
        } else {
          currentStep.classList.remove(zeroPricesClass);
        }
        currentStep.querySelector('[data-next-step]').removeAttribute('disabled');

        if (currentStep.querySelector(`[data-bundle-item-id='${addBundle.dataset.bundleProductId}'] [data-remove-holder]`)) {
          currentStep.querySelector(`[data-bundle-item-id='${addBundle.dataset.bundleProductId}'] [data-remove-holder]`)
            .innerHTML = generateRemoveButtons(lightbox.dataset.forStep, JSON.parse(addBundle.dataset.bundleProductInfo));
        }

        closeBtn.dispatchEvent(new Event('click'));
      });
    });

    function generateRemoveButtons(step,info) {
      let html = '';
      Object.values(storage).forEach(s => {
        Object.entries(s).forEach(variant => {
          if (Object.keys(info).includes(variant[0])) {
            html += `<button class="program-badge program-badge--remove" data-bundle-remove="step_${step}__${variant[0]}">
              <span>${variant[1]} × ${info[variant[0]]}</span>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M15.364 2.63606C11.8492 -0.878663 6.15076 -0.878663 2.63604 2.63606C-0.87868 6.15078 -0.878679 11.8493 2.63604 15.364C6.15076 18.8787 11.8492 18.8787 15.364 15.364C18.8787 11.8493 18.8787 6.15077 15.364 2.63606ZM11.8284 6.17159C11.4379 5.78107 10.8047 5.78107 10.4142 6.17159L9 7.5858L7.58579 6.17159C7.19526 5.78106 6.5621 5.78107 6.17157 6.17159C5.78105 6.56211 5.78105 7.19528 6.17157 7.5858L7.58579 9.00002L6.17157 10.4142C5.78105 10.8048 5.78105 11.4379 6.17157 11.8284C6.5621 12.219 7.19526 12.219 7.58579 11.8284L9 10.4142L10.4142 11.8284C10.8047 12.219 11.4379 12.219 11.8284 11.8284C12.219 11.4379 12.219 10.8048 11.8284 10.4142L10.4142 9.00002L11.8284 7.5858C12.219 7.19528 12.219 6.56211 11.8284 6.17159Z" fill="#FF0000"/></svg>
            </button>`;
          }
        })
      });

      return html;
    }

    function generateVariants(variantsJson) {
      let html = '';
      let checked = '';
      let hasChecked = false;
      
      variantsJson.forEach(v => {
        if (v.title != "Default Title") {
          if (!hasChecked && v.available) {
            hasChecked = true;
            checked = ' checked';
          } else {
            checked = '';
          }
          html += '<label><input type="radio" name="bundle_variant" data-bundle-variant value="'+v.id+'"'+(v.available ? '': ' disabled')+checked+'><span>' + v.title + '</span></label>';
        } else {
          html += '<input type="radio" hidden name="bundle_variant" data-bundle-variant value="'+v.id+'"'+(v.available ? '': ' disabled')+' checked>';
        }
      });

      return html;
    }
  }

  function initQtyField() {
    let qtyFields = document.querySelectorAll('.custom-bundle-item__qty');

    qtyFields.forEach(f => {
      let field = f.querySelector('[data-bundle-item-qty]');
      let plus = f.querySelector('[data-bundle-qty-plus]');
      let minus = f.querySelector('[data-bundle-qty-minus]');

      plus.addEventListener('click', function(e) {
        e.preventDefault();

        let max = field.getAttribute('max');
        let newVal = parseInt(field.value) + 1;
        field.value = max > newVal ? newVal : max;
        
        minus.disabled = false;
        if (max == field.value) {
          this.disabled = true;
        } else {
          this.disabled = false;
        }
      });
      minus.addEventListener('click', function(e) {
        e.preventDefault();

        let min = field.getAttribute('min');
        let newVal = parseInt(field.value) - 1;
        field.value = newVal >= min ? newVal : min;
        
        plus.disabled = false;
        if (min == field.value) {
          this.disabled = true;
        } else {
          this.disabled = false;
        }
      })
    });
  }

  function addProgramToBundle() {
    let programs = document.querySelectorAll('[data-add-program]');

    programs.forEach(programBtn => {
      let step = programBtn.closest('[data-step]');
      
      programBtn.addEventListener('click', function(e) {
        e.preventDefault();

        if (this.classList.contains(addedClass)){
          this.classList.remove(addedClass);
          this.classList.add(addClass);
          removeFromStorage(step.dataset.step, this.dataset.addProgram);
        } else {
          this.classList.remove(addClass);
          this.classList.add(addedClass);
          updateStorage(step.dataset.step, this.dataset.addProgram, 1);
        }

        let programsStep = storage['step_'+step.dataset.step];
        clearStorage();
        storage['step_' + step.dataset.step] = programsStep;
        localStorage.setItem('custom_bundle', JSON.stringify(storage));
        customBundle.querySelectorAll('[data-remove-holder]').forEach(h => {
          h.innerHTML = '';
        });

        if (Object.keys(storage['step_'+step.dataset.step]).length >= 1) {
          step.querySelector('[data-next-step]').disabled = false;
          
          document.querySelectorAll('#bundle-popup')[0].setAttribute('data-with-extra', true);
          
          initSteps();
        } else {          
          document.querySelectorAll('#bundle-popup')[0].removeAttribute('data-with-extra');
          
          initSteps();
          
          // setTimeout(() => {
          //   step.querySelector('[data-next-step]').disabled = true;
          // }, 150);
        }
      });
    });
  }

  function simpleAddToCart() {
    let buttons = document.querySelectorAll('[data-simple-add-to-cart]');

    buttons.forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();

        addToCartAction({
         'items': [{
          'id': btn.dataset.simpleAddToCart,
          'quantity': 1
          }]
        });
      });
    });
  }

  function removeFromStorage(step, id) {
    if (storage['step_'+step][id]) {
      delete storage['step_'+step][id];
      localStorage.setItem('custom_bundle', JSON.stringify(storage));
    }
  }

  function updateStorage(step, id, qty) {
    if (storage['step_'+step] == undefined) {
      storage['step_'+step] = {};
    }
    storage['step_'+step][id] = qty;
    localStorage.setItem('custom_bundle', JSON.stringify(storage));
  }

  function clearStorage(step, id) {
    storage['step_1'] = {};
    if (storage['step_2']) {
      delete storage['step_2'];
    }
    if (storage['step_3']) {
      delete storage['step_3'];
    }
    if (storage['step_4']) {
      delete storage['step_4'];
    }
    if (storage['step_5']) {
      delete storage['step_5'];
    }
    if (storage['step_6']) {
      delete storage['step_6'];
    }
    localStorage.setItem('custom_bundle', JSON.stringify(storage));
  }
  
  function addBundleToCart() {
    let items = [];
    // console.log(Object.entries(Object.values(storage)[0])[0][0], Object.entries(Object.values(storage)[0])[0], Object.entries(Object.values(storage)[0]),Object.values(storage)[0],Object.values(storage));
    let parent_id = Object.values(storage)[0] && Object.entries(Object.values(storage)[0])[0] ? Object.entries(Object.values(storage)[0])[0][0] : null;
    
    Object.values(storage).forEach((step, stepIndex) => {
      const classes = initialStepsClasses[stepIndex];

      // Iterate over the array and add each class to the second element
      classes.forEach((className, i) => {
        getSteps()[i].classList.add(className);
      });

      Object.entries(step).forEach((item, itemIndex) => {
        let line_item = {
          id: item[0],
          quantity: item[1]
        };
        if (!(stepIndex == 0 && itemIndex == 0) && customBundle.dataset.customBundle == 'true' && parent_id) {
          line_item.properties = {};
          line_item.properties._parent = parent_id;
        }
        items.push(line_item);
      });
    });

    addToCartAction({'items': items}).then(r => {
      localStorage.removeItem('custom_bundle');
      storage = {};
    });
  }

  function addToCartAction(formData) {
    return fetch(window.Shopify.routes.root + 'cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    })
    .then(response => {
      document.dispatchEvent(new CustomEvent('cart:refresh'));
      return response.json();
    }).then(body => {
      document.dispatchEvent(new CustomEvent('variant:add'));
    })
    .catch((error) => {
      document.dispatchEvent(new CustomEvent('variant:add'));
      console.error('Error:', error);
    });
  }
}