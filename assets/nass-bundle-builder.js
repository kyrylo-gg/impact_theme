/**
 * Nass Bundle Builder — Option B
 * Real-time cart (add/remove via Cart API), footer from cart.js, exit confirmation.
 */
(function() {
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function gidToNum(gid) {
    if (!gid || typeof gid !== 'string') return '';
    var m = String(gid).match(/\/Product\/(\d+)/);
    if (m) return m[1];
    return String(gid).replace(/^gid:\/\/shopify\/Product\//, '') || '';
  }
  function toNumericId(val) {
    if (val == null) return '';
    var s = String(val);
    var m = s.match(/(\d{8,})/);
    if (m) return m[1];
    return s.replace(/\D/g, '') || s;
  }

  function productJsonToInternal(raw, currencyCodeFallback) {
    var v0 = (raw.variants && raw.variants[0]) || {};
    var inferredCur = (currencyCodeFallback && String(currencyCodeFallback).trim()) ? String(currencyCodeFallback).trim() : 'USD';
    var opts = [];
    if (v0.option1) opts.push({ name: 'Size', value: v0.option1 });
    if (v0.option2) opts.push({ name: 'Color', value: v0.option2 });
    return {
      id: String(raw.id),
      title: raw.title || '',
      handle: raw.handle || '',
      descriptionHtml: raw.body_html || raw.description || '',
      tags: Array.isArray(raw.tags) ? raw.tags : String(raw.tags || '').split(',').map(function(t) { return String(t || '').trim(); }).filter(Boolean),
      availableForSale: v0.available !== false,
      priceRange: { minVariantPrice: { amount: String(v0.price || '0'), currencyCode: inferredCur } },
      compareAtPriceRange: { minVariantPrice: { amount: String(v0.compare_at_price || v0.price || '0'), currencyCode: inferredCur } },
      images: { nodes: (raw.images || []).map(function(i) { return { url: i.src || '', altText: i.alt || '' }; }) },
      variants: { nodes: (raw.variants || []).map(function(v) {
        var o = [];
        if (v.option1) o.push({ name: 'Size', value: v.option1 });
        if (v.option2) o.push({ name: 'Color', value: v.option2 });
        return { id: String(v.id), title: v.title || '', availableForSale: v.available !== false, price: { amount: String(v.price || '0'), currencyCode: inferredCur }, selectedOptions: o };
      }) },
    };
  }

  function getImageUrlOptimized(url, width) {
    if (!url || typeof url !== 'string') return url;
    width = width || 400;
    return url.replace(/(\.[a-zA-Z0-9]+)(\?.*)?$/i, '_' + width + 'x$1$2');
  }

  function init(sectionRoot, config) {
    const shopDomain = config.shopDomain;
    const sectionId = config.sectionId;
    const ctaEl = sectionRoot.querySelector('[data-bb-cta]');
    var wizardEl = document.getElementById('bundle-builder-wizard-' + sectionId);
    if (!wizardEl) wizardEl = sectionRoot.querySelector('.bb-wizard-overlay');
    const closeEls = sectionRoot.querySelectorAll('[data-bb-close]');
    const backBtn = sectionRoot.querySelector('[data-bb-back]');
    const nextBtn = sectionRoot.querySelector('[data-bb-next]');
    const titleEl = sectionRoot.querySelector('[data-bb-wizard-title]');
    const progressBarEl = sectionRoot.querySelector('[data-bb-progress-bar]');
    const stepTextEl = sectionRoot.querySelector('[data-bb-step-text]');
    const contentEl = sectionRoot.querySelector('[data-bb-wizard-content]');
    const discountEl = sectionRoot.querySelector('[data-bb-wizard-discount]');
    const discountPromoText = (config && typeof config.discountPromoText === 'string' && config.discountPromoText.trim())
      ? config.discountPromoText.trim()
      : 'Get 60% off all clothing with 4 Programs Bundle!';
    const discountAppliedText = (config && typeof config.discountAppliedText === 'string' && config.discountAppliedText.trim())
      ? config.discountAppliedText.trim()
      : '60% off all clothing applied!';
    const secureFooterGuaranteeText = (config && typeof config.secureFooterGuaranteeText === 'string' && config.secureFooterGuaranteeText.trim())
      ? config.secureFooterGuaranteeText.trim()
      : '30 days money back guarantee';
    const secureFooterPaymentIconsHtml = (config && typeof config.secureFooterPaymentIconsHtml === 'string')
      ? config.secureFooterPaymentIconsHtml
      : '';
    const secureFooterShieldIconUrl = (config && typeof config.secureFooterShieldIconUrl === 'string' && config.secureFooterShieldIconUrl.trim())
      ? config.secureFooterShieldIconUrl.trim()
      : '';
    const templateSuffix = String((config && config.templateSuffix) || '').toLowerCase().trim();
    const isBundlesDescriptionTemplate = templateSuffix === 'mega_twerk_with_bundles' || templateSuffix === 'mega_twerk_with_bundleseo';
    const footerEl = sectionRoot.querySelector('[data-bb-wizard-footer]');
    var routesRoot = (typeof window !== 'undefined' && window.Shopify && window.Shopify.routes && window.Shopify.routes.root)
      ? String(window.Shopify.routes.root).replace(/\/?$/, '/')
      : (config.routesRoot || '').replace(/\/?$/, '/');
    if (!routesRoot && config.cartAddUrl) {
      routesRoot = String(config.cartAddUrl).replace(/\/cart\/add\.js$/, '/').replace(/\/?$/, '/');
    }
    if (!routesRoot) routesRoot = '/';
    var isLocalizedRoute = routesRoot !== '/';
    var cartUrls = {
      add: routesRoot + 'cart/add.js',
      get: routesRoot + 'cart.js',
      update: routesRoot + 'cart/update.js',
      change: routesRoot + 'cart/change.js',
      clear: routesRoot + 'cart/clear.js'
    };
    var configSteps = Array.isArray(config.steps) ? config.steps : [];
    var stepsFromConfig = configSteps.map(function(s) {
      return {
        id: String(s.id),
        title: s.title || 'Step',
        collectionHandle: (s.collectionHandle || '').trim(),
        isProgramsStep: !!s.isProgramsStep,
        productIds: []
      };
    });
    if (stepsFromConfig.length === 0) {
      stepsFromConfig = [
        { id: 'programs', title: 'Select programs', collectionHandle: 'courses', isProgramsStep: true, productIds: [] },
        { id: 'shorts', title: 'Choose lounge shorts', collectionHandle: 'shorts', isProgramsStep: false, productIds: [] },
        { id: 'leggings', title: 'Add sport shorts', collectionHandle: 'leggings', isProgramsStep: false, productIds: [] },
        { id: 'swimshorts', title: 'Add swim shorts', collectionHandle: 'shorts', isProgramsStep: false, productIds: [] },
        { id: 'tops', title: 'Select top', collectionHandle: 'bodywear', isProgramsStep: false, productIds: [] },
        { id: 'review', title: 'Review your bundle', collectionHandle: '', isProgramsStep: false, productIds: [] },
      ];
    }
    var programPackId = (config.programPackProductId != null && config.programPackProductId !== '')
      ? String(config.programPackProductId)
      : null;
    var programPackNumId = programPackId ? toNumericId(gidToNum(programPackId) || programPackId) : '';
    var resolvedProgramPackNumId = programPackNumId || '';
    const discountCode = (config.discountCode || '').trim();
    var checkoutUrl = config.checkoutUrl || '/checkout';
    if (shopDomain && (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))) {
      checkoutUrl = 'https://' + shopDomain + '/checkout';
      console.log('[BB] localhost detected, using store checkout:', checkoutUrl);
    }
    // Normalize checkout URL to avoid relative redirects like "/en-pl/products/en-pl/checkout".
    // Accepts absolute URLs, absolute paths, and fixes relative paths by prefixing "/".
    try {
      if (typeof checkoutUrl === 'string') {
        var cu = checkoutUrl.trim();
        if (cu && cu.indexOf('http://') !== 0 && cu.indexOf('https://') !== 0) {
          if (cu.indexOf('//') === 0) {
            // protocol-relative URL, keep as-is
          } else if (cu[0] !== '/') {
            cu = '/' + cu;
          }
        }
        checkoutUrl = cu || checkoutUrl;
      }
    } catch (e) {}
    const storefrontApiToken = ((config.storefrontApiToken || '').trim() || '568094b7f376083a4b0dc6fee4785741');
    const sizeChartConfigHandle = (config.sizeChartConfigHandle || 'size-chart-settings').trim();
    const sizeChartByProduct = (config && config.sizeChartByProduct && typeof config.sizeChartByProduct === 'object') ? config.sizeChartByProduct : {};

    // Resolve display currency with priority:
    // 1) Shopify Markets presentment currency from Liquid (localization.country.currency.iso_code)
    // 2) Shopify native multi-currency (Shopify.currency.active)
    // 3) Config-provided currency from Liquid (cart.currency / shop.currency)
    // 4) Fallback to shop base currency
    var presentmentCurrency = (config && typeof config.presentmentCurrency === 'string' && config.presentmentCurrency.trim())
      ? String(config.presentmentCurrency).trim()
      : '';
    var displayCurrency = presentmentCurrency
      ? presentmentCurrency
      : ((config && typeof config.currency === 'string' && config.currency.trim()) ? String(config.currency).trim() : 'USD');
    var shopBaseCurrency = (config && typeof config.shopCurrency === 'string' && config.shopCurrency.trim())
      ? String(config.shopCurrency).trim()
      : 'USD';
    var productsJsonFallbackCurrency = isLocalizedRoute
      ? (presentmentCurrency || shopBaseCurrency || 'USD')
      : (shopBaseCurrency || 'USD');

    // Do not force USD on non-localized pages.
    // Shopify Markets can still present EUR amounts on /products/... depending on geo,
    // and forcing USD requires reliable Storefront inContext querying which may not be available.
    var lockCurrencyToConfig = false;

    try {
      if (typeof window !== 'undefined') {
        if (!lockCurrencyToConfig) {
          // Prefer currency that the page itself declares (Markets presentment).
          // This helps in cases where price amounts are already presentment (e.g. EUR),
          // but Shopify.currency / header picker / analytics still show USD.
          (function primeFromPageDeclaredCurrency() {
            try {
              var dc = typeof document !== 'undefined' ? document : null;
              var cur = '';

              // OpenGraph / product meta currency (often reflects presentment)
              if (dc && dc.querySelector) {
                var m1 = dc.querySelector('meta[property="product:price:currency"]');
                var m2 = dc.querySelector('meta[property="og:price:currency"]');
                cur = (m1 && m1.getAttribute('content')) || (m2 && m2.getAttribute('content')) || '';
                cur = String(cur || '').trim();
              }

              // PayPal in-context metadata currency
              if (!cur && dc && dc.querySelector) {
                var pp = dc.querySelector('meta#in-context-paypal-metadata');
                cur = pp ? String(pp.getAttribute('data-currency') || '').trim() : '';
              }

              // Apple Pay capabilities JSON currencyCode
              if (!cur && dc && dc.getElementById) {
                var ap = dc.getElementById('apple-pay-shop-capabilities');
                if (ap && ap.textContent) {
                  try {
                    var apj = JSON.parse(ap.textContent);
                    cur = apj && apj.currencyCode ? String(apj.currencyCode).trim() : '';
                  } catch (e) {}
                }
              }

              if (cur) {
                presentmentCurrency = cur;
                displayCurrency = cur;
              }
            } catch (e) {}
          })();

          // Prefer Shopify's rendered meta currency (Markets presentment) when available.
          // This stays correct even if a header currency picker shows a different selection.
          (function primeFromShopifyAnalyticsMeta() {
            try {
              var mc = window.ShopifyAnalytics && window.ShopifyAnalytics.meta && window.ShopifyAnalytics.meta.currency
                ? String(window.ShopifyAnalytics.meta.currency).trim()
                : '';
              if (mc && !presentmentCurrency) {
                presentmentCurrency = mc;
                displayCurrency = mc;
              }
            } catch (e) {}
          })();

          // If theme money format is already localized (Markets presentment), prefer it as source of truth.
          // This covers cases where the header currency selector is out of sync with presentment pricing.
          (function primeFromThemeMoneyFormat() {
            try {
              var tv = window.themeVariables && window.themeVariables.settings ? window.themeVariables.settings : null;
              var mwcf = tv && typeof tv.moneyWithCurrencyFormat === 'string' ? tv.moneyWithCurrencyFormat : '';
              var mf = tv && typeof tv.moneyFormat === 'string' ? tv.moneyFormat : '';
              var s = String(mwcf || mf || '');
              // Prefer explicit ISO code in moneyWithCurrencyFormat (e.g. "€{{amount}} EUR")
              var m = s.match(/\b[A-Z]{3}\b/);
              var inferred = m ? m[0] : '';
              if (!inferred) {
                if (s.indexOf('€') !== -1) inferred = 'EUR';
                else if (s.indexOf('£') !== -1) inferred = 'GBP';
                else if (s.indexOf('¥') !== -1) inferred = 'JPY';
              }
              if (inferred && !presentmentCurrency) {
                presentmentCurrency = inferred;
                displayCurrency = inferred;
              }
            } catch (e) {}
          })();
        }

        // Always prefer currently selected currency from Shopify picker/menu.
        if (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) {
          displayCurrency = String(window.Shopify.currency.active).trim() || displayCurrency;
        }
      }
    } catch (e) {}
    if (!displayCurrency) displayCurrency = shopBaseCurrency || 'USD';

    if (!wizardEl || !ctaEl) {
      console.log('[BB] early return: missing wizard or cta', { hasWizard: !!wizardEl, hasCta: !!ctaEl });
      return;
    }
    console.log('[BB] elements found, continuing');

    // Prime cart currency early. It's the most reliable "presentment currency" source
    // and helps avoid mismatches when UI currency pickers lag behind actual market pricing.
    fetch(cartUrls.get)
      .then(function(r) { return r.json(); })
      .then(function(cart) {
        if (!cart || typeof cart !== 'object') return;
        bbState.cartData = cart;
        if (cart.currency) {
          var cc = String(cart.currency).trim();
          if (cc) {
            // cart.js can sometimes lag behind Markets presentment pricing on the page.
            // Only let cart currency become authoritative if we haven't already inferred a presentment currency.
            if (!presentmentCurrency) {
              presentmentCurrency = cc;
              displayCurrency = cc;
            } else {
              // Keep display currency aligned with the presentment currency we inferred from the page.
              displayCurrency = presentmentCurrency;
            }
          }
        }
        renderFooterSummary();
      })
      .catch(function() {});

    const imageViewerEl = sectionRoot.querySelector('[data-bb-image-viewer]');
    const imageViewerImgEl = sectionRoot.querySelector('[data-bb-image-viewer-img]');
    const imageViewerTitleEl = sectionRoot.querySelector('[data-bb-image-viewer-title]');
    const imageViewerDescriptionEl = sectionRoot.querySelector('[data-bb-image-viewer-description]');
    const imageViewerPrevEl = sectionRoot.querySelector('[data-bb-image-viewer-prev]');
    const imageViewerNextEl = sectionRoot.querySelector('[data-bb-image-viewer-next]');
    const imageViewerDotsEl = sectionRoot.querySelector('[data-bb-image-viewer-dots]');
    var imageViewerState = { productId: null, imageIndex: 0 };

    const bbState = {
      isOpen: false,
      currentStepIndex: 0,
      steps: stepsFromConfig,
      baseSteps: stepsFromConfig.map(function(step) {
        return {
          id: step.id,
          title: step.title,
          collectionHandle: step.collectionHandle,
          isProgramsStep: !!step.isProgramsStep,
          productIds: []
        };
      }),
      productsById: {},
      selectedItems: [],
      hasProgramPack: false,
      isSubmitting: false,
      cartOperationInProgress: false,
      productsLoaded: false,
      cartData: null,
      sizeFilter: null,
    };

    function buildStepMap(steps) {
      var map = {};
      (steps || []).forEach(function(step) {
        if (!step || !step.id) return;
        map[String(step.id)] = {
          id: String(step.id),
          title: step.title || 'Step',
          collectionHandle: (step.collectionHandle || '').trim(),
          isProgramsStep: !!step.isProgramsStep,
          productIds: []
        };
      });
      return map;
    }

    function normalizeOverrideFromWindow() {
      if (typeof window === 'undefined') return null;
      var raw = window.__NASS_BB_STEP_OVERRIDE;
      if (!raw) return null;
      if (Array.isArray(raw)) {
        return raw.map(function(id) { return { id: String(id) }; });
      }
      if (Array.isArray(raw.steps) && raw.steps.length) {
        return raw.steps
          .map(function(step) {
            if (!step || !step.id) return null;
            return {
              id: String(step.id),
              title: step.title || '',
              collectionHandle: (step.collectionHandle || '').trim(),
              isProgramsStep: !!step.isProgramsStep
            };
          })
          .filter(Boolean);
      }
      var includeStepIds = raw.includeStepIds;
      if (!Array.isArray(includeStepIds) || !includeStepIds.length) return null;
      return includeStepIds.map(function(id) { return { id: String(id) }; });
    }

    function applyStepOverride(baseSteps) {
      var overrideSteps = normalizeOverrideFromWindow();
      if (!overrideSteps) {
        return (baseSteps || []).map(function(step) {
          return {
            id: step.id,
            title: step.title,
            collectionHandle: step.collectionHandle,
            isProgramsStep: !!step.isProgramsStep,
            productIds: []
          };
        });
      }

      var stepMap = buildStepMap(baseSteps);
      var resolved = [];

      overrideSteps.forEach(function(overrideStep) {
        var normalizedId = String(overrideStep.id);
        if (normalizedId === 'review') return;
        var existing = stepMap[normalizedId];
        if (existing) {
          resolved.push({
            id: existing.id,
            title: existing.title,
            collectionHandle: existing.collectionHandle,
            isProgramsStep: !!existing.isProgramsStep,
            productIds: []
          });
        } else {
          resolved.push({
            id: normalizedId,
            title: overrideStep.title || 'Step',
            collectionHandle: (overrideStep.collectionHandle || '').trim(),
            isProgramsStep: !!overrideStep.isProgramsStep,
            productIds: []
          });
        }
      });

      var reviewStep = stepMap.review || {
        id: 'review',
        title: 'Review your bundle',
        collectionHandle: '',
        isProgramsStep: false,
        productIds: []
      };

      resolved.push({
        id: 'review',
        title: reviewStep.title || 'Review your bundle',
        collectionHandle: '',
        isProgramsStep: false,
        productIds: []
      });

      return resolved;
    }

    function isProgramPack(productId) {
      if (!productId || !resolvedProgramPackNumId) return false;
      var a = toNumericId(gidToNum(String(productId)) || String(productId));
      return !!a && String(a) === String(resolvedProgramPackNumId);
    }

    function getHasProgramPack() {
      return bbState.selectedItems.some(function(item) {
        return isProgramPack(item.productId);
      });
    }

    function isSelected(productId) {
      return bbState.selectedItems.some(function(item) {
        return String(item.productId) === String(productId);
      });
    }

    function normalizeForMatch(val) {
      return String(val || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    }

    function stepIsWorkoutEquipment(stepId) {
      var step = bbState.steps.find(function(s) { return String(s.id) === String(stepId); });
      if (!step) return false;
      var title = normalizeForMatch(step.title);
      var handle = normalizeForMatch(step.collectionHandle);
      if (title.indexOf('workout equipment') !== -1) return true;
      if (title.indexOf('choose equipment') !== -1) return true;
      if (title.indexOf('equipment') !== -1) return true;
      if (handle.indexOf('bundle equipment') !== -1) return true;
      if (handle.indexOf('equipment') !== -1) return true;
      return false;
    }

    function getSelectedBundleRuleMode() {
      var programsStep = bbState.steps.find(function(s) { return s && s.isProgramsStep; });
      if (!programsStep) return '';
      var selectedProgramItem = bbState.selectedItems.find(function(item) {
        return String(item.stepId) === String(programsStep.id);
      });
      if (!selectedProgramItem) return '';
      var selectedProduct = bbState.productsById[selectedProgramItem.productId];
      if (!selectedProduct) return '';
      var title = normalizeForMatch(selectedProduct.title);
      if (title.indexOf('vip bundle') !== -1 || title.indexOf('twerk essential bundle') !== -1 || title.indexOf('twerk essential kit') !== -1) {
        return 'vip_or_essential';
      }
      if (title.indexOf('booty builder bundle') !== -1) {
        return 'booty_builder';
      }
      return '';
    }

    function getBundleRuleModeByProductId(productId) {
      var p = bbState.productsById[productId];
      if (!p) return '';
      var title = normalizeForMatch(p.title);
      if (title.indexOf('vip bundle') !== -1 || title.indexOf('twerk essential bundle') !== -1 || title.indexOf('twerk essential kit') !== -1) {
        return 'vip_or_essential';
      }
      if (title.indexOf('booty builder bundle') !== -1) {
        return 'booty_builder';
      }
      return '';
    }

    function isRuleTriggerBundleProduct(productId) {
      return !!getBundleRuleModeByProductId(productId);
    }

    function getRuleTargetByProductForMode(stepId, product, mode) {
      if (!stepIsWorkoutEquipment(stepId) || !product) return null;
      if (!mode) return null;
      var title = normalizeForMatch(product.title);
      var handle = normalizeForMatch(product.handle);
      var isBootyBandSet = title.indexOf('booty band set') !== -1 || title.indexOf('booty band') !== -1 || handle.indexOf('booty band set') !== -1 || handle.indexOf('booty-band-set') !== -1 || handle.indexOf('booty-band') !== -1;
      if (isBootyBandSet) return { free: true, mode: mode, type: 'booty_band' };
      var isKneePads = title.indexOf('knee pads') !== -1 || title.indexOf('knee pad') !== -1 || handle.indexOf('knee pads') !== -1 || handle.indexOf('knee-pads') !== -1 || handle.indexOf('knee-pad') !== -1;
      if (isKneePads && mode === 'vip_or_essential') return { free: true, mode: mode, type: 'knee_pads' };
      return null;
    }

    function getRuleTargetByProduct(stepId, product) {
      return getRuleTargetByProductForMode(stepId, product, getSelectedBundleRuleMode());
    }

    function applyWorkoutEquipmentAutoAdd(step) {
      if (!step || !step.id || !stepIsWorkoutEquipment(step.id)) return;
      var mode = getSelectedBundleRuleMode();
      if (!mode || !Array.isArray(step.productIds) || !step.productIds.length) return;
      var bootyBandProductId = null;
      step.productIds.forEach(function(pid) {
        if (bootyBandProductId) return;
        var rule = getRuleTargetByProduct(step.id, bbState.productsById[pid]);
        if (rule && rule.type === 'booty_band') bootyBandProductId = pid;
      });
      if (!bootyBandProductId || isSelected(bootyBandProductId) || bbState.cartOperationInProgress) return;
      addItem(step.id, bootyBandProductId, null, 1, { autoAddedByRule: true });
    }

    function getAllowedAutoAddedEquipmentProductIds() {
      var allowed = {};
      var mode = getSelectedBundleRuleMode();
      if (!mode) return allowed;
      bbState.steps.forEach(function(step) {
        if (!step || !step.id || !stepIsWorkoutEquipment(step.id)) return;
        (step.productIds || []).forEach(function(pid) {
          var rule = getRuleTargetByProduct(step.id, bbState.productsById[pid]);
          if (!rule) return;
          if (rule.type === 'booty_band' || rule.type === 'knee_pads') allowed[String(pid)] = true;
        });
      });
      return allowed;
    }

    function removeRuleLinkedEquipmentItemsForMode(mode) {
      if (!mode) return Promise.resolve();
      var idsToRemove = [];
      bbState.selectedItems.forEach(function(item) {
        if (!stepIsWorkoutEquipment(item.stepId)) return;
        var product = bbState.productsById[item.productId];
        var rule = getRuleTargetByProductForMode(item.stepId, product, mode);
        if (!rule) return;
        idsToRemove.push(String(item.productId));
      });
      if (!idsToRemove.length) return Promise.resolve();
      return removeItemsByProductIds(idsToRemove);
    }

    function removeItemsByProductIds(productIds) {
      if (!Array.isArray(productIds) || !productIds.length) return Promise.resolve();
      var idsSet = {};
      productIds.forEach(function(pid) { idsSet[String(pid)] = true; });
      var itemsToRemove = bbState.selectedItems.filter(function(item) {
        return !!idsSet[String(item.productId)];
      });
      if (!itemsToRemove.length) return Promise.resolve();
      var prevItems = bbState.selectedItems.slice();
      bbState.selectedItems = bbState.selectedItems.filter(function(item) {
        return !idsSet[String(item.productId)];
      });
      bbState.hasProgramPack = getHasProgramPack();
      renderStep();
      renderDiscountBanner();
      renderFooterSummary();
      var chain = Promise.resolve();
      itemsToRemove.forEach(function(item) {
        chain = chain.then(function() {
          var variantNum = String(item.variantId).replace(/.*\/(\d+)$/, '$1') || item.variantId;
          return fetch(cartUrls.change, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.lineKey || String(variantNum), quantity: 0 })
          }).catch(function() { return null; });
        });
      });
      return chain
        .then(function() {
          return applyDiscountAndRefreshCart().catch(function() { renderFooterSummary(); });
        })
        .catch(function() {
          bbState.selectedItems = prevItems;
          bbState.hasProgramPack = getHasProgramPack();
          renderStep();
          renderDiscountBanner();
          renderFooterSummary();
        });
    }

    function cleanupAutoAddedEquipmentItems() {
      if (bbState.cartOperationInProgress) return Promise.resolve();
      var allowedIds = getAllowedAutoAddedEquipmentProductIds();
      var staleAutoAddedIds = bbState.selectedItems
        .filter(function(item) {
          return !!item.autoAddedByRule && stepIsWorkoutEquipment(item.stepId) && !allowedIds[String(item.productId)];
        })
        .map(function(item) { return String(item.productId); });
      if (!staleAutoAddedIds.length) return Promise.resolve();
      return removeItemsByProductIds(staleAutoAddedIds);
    }

    function hasRequiredKneePadsSelectionForVipEssential(step) {
      if (!step || !step.id || !stepIsWorkoutEquipment(step.id)) return true;
      if (getSelectedBundleRuleMode() !== 'vip_or_essential') return true;
      var kneePadsProductId = null;
      (step.productIds || []).forEach(function(pid) {
        if (kneePadsProductId) return;
        var rule = getRuleTargetByProduct(step.id, bbState.productsById[pid]);
        if (rule && rule.type === 'knee_pads') kneePadsProductId = pid;
      });
      if (!kneePadsProductId) return true;
      var selectedKneePads = bbState.selectedItems.find(function(item) {
        return String(item.productId) === String(kneePadsProductId);
      });
      if (!selectedKneePads) return false;
      var product = bbState.productsById[kneePadsProductId];
      var variants = (product && product.variants && product.variants.nodes) || [];
      if (!variants.length) return true;
      var hasSizeVariants = variants.some(function(v) {
        return (v.selectedOptions || []).some(function(o) {
          return String((o && o.name) || '').toLowerCase() === 'size' && String((o && o.value) || '').trim() !== '';
        });
      });
      if (!hasSizeVariants) return true;
      var selectedVariant = variants.find(function(v) { return String(v.id) === String(selectedKneePads.variantId); });
      if (!selectedVariant) return false;
      return (selectedVariant.selectedOptions || []).some(function(o) {
        if (String((o && o.name) || '').toLowerCase() !== 'size') return false;
        var val = String((o && o.value) || '').trim().toLowerCase();
        return !!val && val !== 'default title';
      });
    }

    function animateKneePadsSelectSizeButton() {
      if (typeof document === 'undefined') return;
      var styleId = 'bb-knee-pads-attention-style';
      if (!document.getElementById(styleId)) {
        var styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = '@keyframes bbKneePadsButtonBounce{0%{transform:translateY(0)}25%{transform:translateY(-5px)}50%{transform:translateY(0)}75%{transform:translateY(-3px)}100%{transform:translateY(0)}}.bb-product-btn--attention{animation:bbKneePadsButtonBounce .45s ease-in-out 2;box-shadow:0 0 0 2px rgba(0,56,255,.2);}';
        document.head.appendChild(styleEl);
      }
      var btn = contentEl ? contentEl.querySelector('[data-bb-knee-pads-size-btn="true"]') : null;
      if (!btn) return;
      btn.classList.remove('bb-product-btn--attention');
      try { void btn.offsetWidth; } catch (e) {}
      btn.classList.add('bb-product-btn--attention');
      setTimeout(function() {
        btn.classList.remove('bb-product-btn--attention');
      }, 1200);
    }

    function isDisabled(stepId, productId) {
      var step = bbState.steps.find(function(s) { return String(s.id) === String(stepId); });
      if (!step || !step.isProgramsStep) return false;
      if (!resolvedProgramPackNumId) return false;
      var packSelected = getHasProgramPack();
      var thisIsPack = isProgramPack(productId);
      var otherSelected = bbState.selectedItems.some(function(item) {
        var st = bbState.steps.find(function(s) { return String(s.id) === String(item.stepId); });
        return st && st.isProgramsStep && !isProgramPack(item.productId);
      });
      var result = false;
      if (packSelected && !thisIsPack) result = true;
      else if (!packSelected && thisIsPack && otherSelected) result = true;
      return result;
    }

    function getVisualOriginalPrice(stepId, realPrice, hasProgramPack) {
      if (!hasProgramPack) return parseFloat(realPrice);
      var step = bbState.steps.find(function(s) { return s.id === stepId; });
      if (!step || step.isProgramsStep || step.id === 'review') return parseFloat(realPrice);
      return parseFloat(realPrice);
    }

    function getVisualFinalPrice(stepId, realPrice, hasProgramPack) {
      if (!hasProgramPack) return parseFloat(realPrice);
      var step = bbState.steps.find(function(s) { return s.id === stepId; });
      if (!step || step.isProgramsStep || step.id === 'review') return parseFloat(realPrice);
      return parseFloat(realPrice) * 0.4;
    }

    function getActiveCurrency() {
      try {
        if (typeof window !== 'undefined' && window.Shopify && window.Shopify.currency && window.Shopify.currency.active) {
          var active = String(window.Shopify.currency.active).trim();
          if (active) return active;
        }
      } catch (e) {}
      if (presentmentCurrency) return presentmentCurrency;
      return displayCurrency;
    }

    function getShopifyRate() {
      try {
        if (typeof window !== 'undefined' && window.Shopify && window.Shopify.currency && window.Shopify.currency.rate) {
          var r = Number(window.Shopify.currency.rate);
          if (isFinite(r) && r > 0) return r;
        }
      } catch (e) {}
      return 1;
    }

    /**
     * Format a money amount, converting from base -> active currency when possible.
     * - `amount` is expected to be in `sourceCurrency` units (not cents).
     * - When switching currencies in Shopify Markets, `Shopify.currency.rate` reflects base->active rate.
     */
    function getDisplayCurrency() {
      // Use ONE authoritative source for UI currency code.
      return getActiveCurrency() || displayCurrency;
    }

    function getCartCurrency() {
      // Cart values from cart.js are already in presentment currency.
      if (bbState.cartData && bbState.cartData.currency) return bbState.cartData.currency;
      return getDisplayCurrency();
    }

    function getProductSourceCurrency(product) {
      var explicitCur = product && product.priceRange && product.priceRange.minVariantPrice && product.priceRange.minVariantPrice.currencyCode
        ? String(product.priceRange.minVariantPrice.currencyCode).trim()
        : '';
      if (explicitCur) return explicitCur;
      return productsJsonFallbackCurrency;
    }

    function formatMoney(amount, currency, sourceCurrency) {
      var target = (currency || getDisplayCurrency() || 'USD');
      var source = (sourceCurrency || shopBaseCurrency || 'USD');
      var value = Number(amount || 0);

      // Convert base-currency amounts to active currency using Shopify rate.
      if (source === shopBaseCurrency && target !== shopBaseCurrency) {
        value = value * getShopifyRate();
      }

      return new Intl.NumberFormat('en-US', { style: 'currency', currency: target || 'USD' }).format(value);
    }

    function convertMoneyAmount(amount, targetCurrency, sourceCurrency) {
      var target = (targetCurrency || getDisplayCurrency() || 'USD');
      var source = (sourceCurrency || shopBaseCurrency || 'USD');
      var value = Number(amount || 0);

      if (source === shopBaseCurrency && target !== shopBaseCurrency) {
        value = value * getShopifyRate();
      }

      return value;
    }

    function applyDiscountAndRefreshCart() {
      var code = (getHasProgramPack() && discountCode) ? discountCode : '';
      return fetch(cartUrls.update, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discount: code })
      })
      .then(function() { return fetch(cartUrls.get); })
      .then(function(r) { return r.json(); })
      .then(function(cart) {
        bbState.cartData = cart;
        renderFooterSummary();
        return cart;
      });
    }

    // Re-render prices when currency changes (symbol + conversion).
    (function bindCurrencyWatcher() {
      var lastCur = getActiveCurrency();
      var lastRate = getShopifyRate();
      setInterval(function() {
        var nextCur = getActiveCurrency();
        var nextRate = getShopifyRate();
        if (!nextCur) return;
        if (nextCur === lastCur && nextRate === lastRate) return;
        lastCur = nextCur;
        lastRate = nextRate;

        // Refresh cart currency + totals and re-render UI.
        fetch(cartUrls.get)
          .then(function(r) { return r.json(); })
          .then(function(cart) {
            bbState.cartData = cart;
            // Reload product prices in the newly selected currency to avoid
            // stale amount/symbol mismatches after localization redirects.
            bbState.productsLoaded = false;
            return loadAllProductsForSteps().then(function() {
              renderStep();
              renderDiscountBanner();
              renderFooterSummary();
            });
          })
          .catch(function() {
            renderStep();
            renderDiscountBanner();
            renderFooterSummary();
          });
      }, 600);
    })();

    function addItem(stepId, productId, variantId, quantity, options) {
      if (bbState.cartOperationInProgress) return;
      var p = bbState.productsById[productId];
      if (!p) return;
      if (isDisabled(stepId, productId)) return;
      var vid = variantId;
      if (!vid && p.variants && p.variants.nodes && p.variants.nodes.length) {
        var av = p.variants.nodes.find(function(v) { return v.availableForSale; }) || p.variants.nodes[0];
        vid = av ? av.id : null;
      }
      if (!vid) return;
      var qty = Math.max(1, parseInt(quantity, 10) || 1);
      if (isSelected(productId)) return;
      var isAutoAddedByRule = !!(options && options.autoAddedByRule);
      bbState.selectedItems.push({ stepId: stepId, productId: productId, variantId: vid, quantity: qty, lineKey: null, autoAddedByRule: isAutoAddedByRule });
      bbState.hasProgramPack = getHasProgramPack();
      renderStep();
      renderDiscountBanner();
      renderFooterSummary();
      bbState.cartOperationInProgress = true;
      renderStep();
      var variantNum = String(vid).replace(/.*\/(\d+)$/, '$1') || String(vid);
      var variantIdNum = parseInt(variantNum, 10) || variantNum;
      var payload = { items: [{ id: variantIdNum, quantity: qty }] };
      function doCartAdd(retriesLeft) {
        retriesLeft = retriesLeft != null ? retriesLeft : 2;
        return fetch(cartUrls.add, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(function(r) {
            return r.text().then(function(text) {
              var data;
              try { data = JSON.parse(text); } catch (e) { data = {}; }
              if (r.status === 429 && retriesLeft > 0) {
                return new Promise(function(resolve) { setTimeout(resolve, 1500); }).then(function() { return doCartAdd(retriesLeft - 1); });
              }
              if (!r.ok) return Promise.reject({ status: r.status, data: data, text: text });
              return data;
            });
          });
      }
      doCartAdd(2)
        .then(function(data) {
          if (data.status === 422) {
            bbState.cartOperationInProgress = false;
            bbState.selectedItems = bbState.selectedItems.filter(function(i) { return String(i.productId) !== String(productId); });
            bbState.hasProgramPack = getHasProgramPack();
            renderStep();
            renderDiscountBanner();
            renderFooterSummary();
            showToast((data.message || data.description) || 'Error adding to cart. Please try again.');
            return;
          }
          if (!data || typeof data !== 'object') return;
          var lineKey = (data.items && data.items[0]) ? data.items[0].key : (data.key || null);
          var item = bbState.selectedItems.find(function(i) { return String(i.productId) === String(productId); });
          if (item) item.lineKey = lineKey;
          bbState.cartOperationInProgress = false;
          renderStep();
          renderDiscountBanner();
          renderFooterSummary();
          applyDiscountAndRefreshCart().catch(function() { renderFooterSummary(); });
          if (isProgramPack(productId)) {
            showToast('60% off all clothing applied!');
          }
        })
        .catch(function(err) {
          bbState.cartOperationInProgress = false;
          bbState.selectedItems = bbState.selectedItems.filter(function(i) { return String(i.productId) !== String(productId); });
          bbState.hasProgramPack = getHasProgramPack();
          renderStep();
          renderDiscountBanner();
          renderFooterSummary();
          var msg = (err && err.status === 429) ? 'Too many requests. Please wait a moment and try again.' : ((err && err.data && (err.data.message || err.data.description)) || 'Error adding to cart. Please try again.');
          showToast(msg);
        });
    }

    function removeItem(productId) {
      if (bbState.cartOperationInProgress) return;
      var item = bbState.selectedItems.find(function(i) { return String(i.productId) === String(productId); });
      if (!item) return;
      var removedStep = bbState.steps.find(function(s) { return String(s.id) === String(item.stepId); });
      var isProgramsStepRemoval = !!(removedStep && removedStep.isProgramsStep);
      var isRuleTriggerBundleRemoval = isRuleTriggerBundleProduct(productId);
      var removedBundleRuleMode = getBundleRuleModeByProductId(productId);
      bbState.cartOperationInProgress = true;
      renderStep();
      var lineKey = item.lineKey;
      var variantNum = String(item.variantId).replace(/.*\/(\d+)$/, '$1') || item.variantId;
      var prevItems = bbState.selectedItems.slice();
      bbState.selectedItems = bbState.selectedItems.filter(function(i) {
        return String(i.productId) !== String(productId);
      });
      bbState.hasProgramPack = getHasProgramPack();
      renderStep();
      renderDiscountBanner();
      fetch(cartUrls.change, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lineKey || String(variantNum), quantity: 0 })
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.status === 422 || data.status === 400 || (data.status && String(data.status).indexOf('bad_request') >= 0)) {
            bbState.cartOperationInProgress = false;
            bbState.selectedItems = prevItems;
            bbState.hasProgramPack = getHasProgramPack();
            renderStep();
            renderDiscountBanner();
            showToast('Error removing item. Please try again.');
            return;
          }
          bbState.cartOperationInProgress = false;
          renderStep();
          renderDiscountBanner();
          renderFooterSummary();
          applyDiscountAndRefreshCart()
            .catch(function() { renderFooterSummary(); })
            .then(function() {
              if (isRuleTriggerBundleRemoval) {
                return removeRuleLinkedEquipmentItemsForMode(removedBundleRuleMode).then(function() {
                  return cleanupAutoAddedEquipmentItems();
                });
              }
              if (isProgramsStepRemoval || isRuleTriggerBundleRemoval) return cleanupAutoAddedEquipmentItems();
              return null;
            });
        })
        .catch(function(err) {
          bbState.cartOperationInProgress = false;
          bbState.selectedItems = prevItems;
          bbState.hasProgramPack = getHasProgramPack();
          renderStep();
          renderDiscountBanner();
          showToast('Error removing item. Please try again.');
          return fetch(cartUrls.get).then(function(r) { return r.json(); }).then(function(cart) {
            bbState.cartData = cart;
            renderFooterSummary();
          });
        });
    }

    function openImageViewer(productId) {
      if (!productId) return;
      var p = bbState.productsById[productId];
      if (!p || !p.images || !p.images.nodes || !p.images.nodes.length) return;
      imageViewerState = { productId: productId, imageIndex: 0 };
      renderImageViewer();
      if (imageViewerEl) imageViewerEl.classList.remove('bb-image-viewer-modal--hidden');
    }

    function openProgramDescriptionPopup(productId) {
      if (!productId) return;
      var p = bbState.productsById[productId];
      if (!p || !imageViewerEl || !imageViewerImgEl || !imageViewerTitleEl) return;
      var nodes = (p.images && p.images.nodes) || [];
      var node = nodes[0] || null;
      var imgWidth = (typeof window !== 'undefined' && window.innerWidth < 768) ? 600 : 1200;
      imageViewerImgEl.src = node ? getImageUrlOptimized(node.url, imgWidth) : '';
      imageViewerImgEl.alt = p.title || '';
      imageViewerTitleEl.textContent = p.title || '';
      imageViewerTitleEl.style.display = '';
      if (imageViewerPrevEl) imageViewerPrevEl.style.display = 'none';
      if (imageViewerNextEl) imageViewerNextEl.style.display = 'none';
      if (imageViewerDotsEl) imageViewerDotsEl.style.display = 'none';
      if (imageViewerDescriptionEl) {
        var rawDescription = String(p.descriptionHtml || '').trim();
        imageViewerDescriptionEl.innerHTML = rawDescription || '<p>No description available for this product.</p>';
        imageViewerDescriptionEl.style.display = '';
      }
      imageViewerEl.classList.add('bb-image-viewer-modal--text-only');
      imageViewerEl.classList.remove('bb-image-viewer-modal--hidden');
    }

    function closeImageViewer() {
      imageViewerState = { productId: null, imageIndex: 0 };
      if (imageViewerEl) {
        imageViewerEl.classList.add('bb-image-viewer-modal--hidden');
        imageViewerEl.classList.remove('bb-image-viewer-modal--text-only');
      }
    }

    function renderImageViewer() {
      var p = imageViewerState.productId ? bbState.productsById[imageViewerState.productId] : null;
      if (!p || !imageViewerImgEl || !imageViewerTitleEl) return;
      if (imageViewerEl) imageViewerEl.classList.remove('bb-image-viewer-modal--text-only');
      var nodes = (p.images && p.images.nodes) || [];
      var idx = Math.max(0, Math.min(imageViewerState.imageIndex, nodes.length - 1));
      var node = nodes[idx];
      var imgWidth = (typeof window !== 'undefined' && window.innerWidth < 768) ? 600 : 1200;
      imageViewerImgEl.src = node ? getImageUrlOptimized(node.url, imgWidth) : '';
      imageViewerImgEl.alt = p.title || '';
      imageViewerTitleEl.textContent = p.title || '';
      imageViewerTitleEl.style.display = '';
      if (imageViewerDescriptionEl) {
        imageViewerDescriptionEl.style.display = 'none';
        imageViewerDescriptionEl.innerHTML = '';
      }
      if (imageViewerPrevEl && imageViewerNextEl && imageViewerDotsEl) {
        var hasMultiple = nodes.length > 1;
        imageViewerPrevEl.style.display = hasMultiple ? '' : 'none';
        imageViewerNextEl.style.display = hasMultiple ? '' : 'none';
        imageViewerDotsEl.style.display = hasMultiple ? '' : 'none';
        if (hasMultiple) {
          imageViewerDotsEl.innerHTML = '';
          for (var i = 0; i < nodes.length; i++) {
            var dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'bb-image-viewer-dot' + (i === idx ? ' bb-image-viewer-dot--active' : '');
            dot.setAttribute('aria-label', 'Image ' + (i + 1));
            dot.addEventListener('click', function(j) { return function() { imageViewerState.imageIndex = j; renderImageViewer(); }; }(i));
            imageViewerDotsEl.appendChild(dot);
          }
        }
      }
    }

    function imageViewerNext() {
      var p = imageViewerState.productId ? bbState.productsById[imageViewerState.productId] : null;
      if (!p || !p.images || !p.images.nodes || !p.images.nodes.length) return;
      var total = p.images.nodes.length;
      imageViewerState.imageIndex = (imageViewerState.imageIndex + 1) % total;
      renderImageViewer();
    }

    function imageViewerPrev() {
      var p = imageViewerState.productId ? bbState.productsById[imageViewerState.productId] : null;
      if (!p || !p.images || !p.images.nodes || !p.images.nodes.length) return;
      var total = p.images.nodes.length;
      imageViewerState.imageIndex = (imageViewerState.imageIndex - 1 + total) % total;
      renderImageViewer();
    }

    function shouldOpenProgramDescriptionPopup(stepId) {
      if (!isBundlesDescriptionTemplate) return false;
      var step = bbState.steps.find(function(s) { return String(s.id) === String(stepId); });
      return !!(step && step.isProgramsStep);
    }

    function fetchCollectionProductsJson(handle) {
      var selectedCurrency = getDisplayCurrency() || productsJsonFallbackCurrency || shopBaseCurrency || 'USD';
      var url = 'https://' + shopDomain + '/collections/' + encodeURIComponent(handle) + '/products.json?limit=50&currency=' + encodeURIComponent(selectedCurrency) + '&_bb_ts=' + Date.now();
      return fetch(url, { cache: 'no-store' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var map = {};
          (data.products || []).forEach(function(raw) {
            // `/products.json` returns prices already in the current presentment currency.
            var internal = productJsonToInternal(raw, selectedCurrency);
            if (internal && internal.id) map[internal.id] = internal;
          });
          return map;
        });
    }

    function fetchCollectionProductsStorefront(handle, countryCode) {
      if (!storefrontApiToken) return Promise.resolve({});
      var url = 'https://' + shopDomain + '/api/2024-01/graphql.json';
      // Note: `@inContext` is a directive on the operation, not on the field.
      // `country` is a CountryCode enum (no quotes).
      var cc = (countryCode || '').trim() || 'US';
      var query = 'query($handle: String!) @inContext(country: ' + cc + '){collection(handle:$handle){products(first:50){edges{node{id title handle tags images(first:10){edges{node{url altText}}}variants(first:20){edges{node{id title availableForSale price{amount currencyCode}compareAtPrice{amount currencyCode}selectedOptions{name value}}}}}}}}}';

      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': storefrontApiToken },
        body: JSON.stringify({ query: query, variables: { handle: String(handle) } })
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var edges = data && data.data && data.data.collection && data.data.collection.products && data.data.collection.products.edges;
          edges = Array.isArray(edges) ? edges : [];
          var map = {};
          edges.forEach(function(e) {
            var p = e && e.node;
            var internal = p ? storefrontProductToInternal(p) : null;
            if (internal && internal.id) map[internal.id] = internal;
          });
          return map;
        })
        .catch(function() { return {}; });
    }

    function storefrontProductToInternal(sf) {
      if (!sf || !sf.id) return null;
      var v0 = (sf.variants && sf.variants.edges && sf.variants.edges[0]) ? sf.variants.edges[0].node : null;
      var price = v0 && v0.price ? v0.price.amount : '0';
      var compareAt = v0 && v0.compareAtPrice ? v0.compareAtPrice.amount : price;
      var cur = (v0 && v0.price && v0.price.currencyCode) ? String(v0.price.currencyCode) : (presentmentCurrency || displayCurrency || shopBaseCurrency || 'USD');
      var imgNodes = (sf.images && sf.images.edges) ? sf.images.edges.map(function(e) { return { url: e.node.url || '', altText: e.node.altText || '' }; }) : [];
      var varNodes = (sf.variants && sf.variants.edges) ? sf.variants.edges.map(function(e) {
        var v = e.node;
        var o = (v.selectedOptions || []).map(function(opt) { return { name: opt.name, value: opt.value }; });
        return { id: String(v.id), title: v.title || '', availableForSale: v.availableForSale !== false, price: { amount: String(v.price && v.price.amount || '0'), currencyCode: (v.price && v.price.currencyCode) || 'USD' }, selectedOptions: o };
      }) : [];
      return {
        id: String(sf.id),
        title: sf.title || '',
        handle: sf.handle || '',
        tags: Array.isArray(sf.tags) ? sf.tags : [],
        availableForSale: v0 ? v0.availableForSale !== false : true,
        priceRange: { minVariantPrice: { amount: price, currencyCode: cur } },
        compareAtPriceRange: { minVariantPrice: { amount: compareAt, currencyCode: cur } },
        images: { nodes: imgNodes },
        variants: { nodes: varNodes }
      };
    }

    function fetchProductByIdStorefront(productId) {
      if (!storefrontApiToken) return Promise.resolve(null);
      var gid = String(productId).indexOf('gid://') === 0 ? productId : 'gid://shopify/Product/' + String(productId);
      var url = 'https://' + shopDomain + '/api/2024-01/graphql.json';
      // Note: `@inContext` is a directive on the operation, not on the field.
      var query = 'query($id: ID!) @inContext(country: US){product(id:$id){id title handle images(first:10){edges{node{url altText}}}variants(first:20){edges{node{id title availableForSale price{amount currencyCode}compareAtPrice{amount currencyCode}selectedOptions{name value}}}}}}';
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': storefrontApiToken },
        body: JSON.stringify({ query: query, variables: { id: gid } })
      }).then(function(r) { return r.json(); }).then(function(data) {
        var p = data && data.data && data.data.product;
        return p ? storefrontProductToInternal(p) : null;
      }).catch(function() { return null; });
    }

    function loadAllProductsForSteps() {
      if (bbState.productsLoaded) return Promise.resolve();
      var handles = [];
      bbState.steps.forEach(function(step) {
        if (step.id !== 'review' && step.collectionHandle) handles.push(step.collectionHandle);
      });
      var unique = handles.filter(function(v,i,a){return a.indexOf(v)===i;});
      var promises = unique.map(function(h){
        return fetchCollectionProductsJson(h);
      });
      return Promise.all(promises).then(function(results) {
        var byHandle = {};
        unique.forEach(function(h,i){ byHandle[h]=results[i]||{}; });
        bbState.steps.forEach(function(step) {
          if (step.id === 'review' || !step.collectionHandle) return;
          var m = byHandle[step.collectionHandle]||{};
          step.productIds = Object.keys(m);
        });
        Object.keys(byHandle).forEach(function(h) {
          Object.assign(bbState.productsById, byHandle[h]);
        });
        var programsStep = bbState.steps.find(function(s) { return s.isProgramsStep; });
        if (programsStep) {
          if (!programsStep.productIds) programsStep.productIds = [];
          if (programsStep.productIds.length > 0) {
          if (!resolvedProgramPackNumId) {
            var bundleLike = programsStep.productIds.find(function(pid) {
              var p = bbState.productsById[pid];
              if (!p || !p.title) return false;
              var t = (p.title || '').toLowerCase();
              var h = (p.handle || '').toLowerCase();
              return (t.indexOf('bundle') >= 0 && (t.indexOf('4') >= 0 || t.indexOf('nass') >= 0 || t.indexOf('program') >= 0)) || h.indexOf('bundle') >= 0;
            });
            if (bundleLike) resolvedProgramPackNumId = toNumericId(gidToNum(String(bundleLike)) || String(bundleLike)) || '';
          }
          if (resolvedProgramPackNumId) {
            var existingKey = Object.keys(bbState.productsById).find(function(k) { return String(toNumericId(gidToNum(k) || k)) === String(resolvedProgramPackNumId); });
            if (existingKey) {
              // Keep collection order intact; only ensure the pack product is available in productsById.
            } else if (programPackId && storefrontApiToken) {
              return fetchProductByIdStorefront(programPackId).then(function(internal) {
                if (internal && internal.id) {
                  bbState.productsById[internal.id] = internal;
                  // If pack product is absent from the collection, add it without moving existing items.
                  programsStep.productIds = programsStep.productIds.concat([internal.id]);
                }
              }).then(function() { return Promise.resolve(); });
            }
          }
          } else if (resolvedProgramPackNumId && programPackId && storefrontApiToken) {
            return fetchProductByIdStorefront(programPackId).then(function(internal) {
              if (internal && internal.id) {
                bbState.productsById[internal.id] = internal;
                programsStep.productIds = [internal.id];
              }
            }).then(function() { return Promise.resolve(); });
          }
        }
      }).then(function() {
        bbState.productsLoaded = true;
        renderStep();
        renderFooterSummary();
        preloadStepImages(1);
      }).catch(function(err) {
        contentEl.innerHTML = '<p class="bb-wizard-placeholder">Could not load products. Please try again later.</p>';
      });
    }

    function preloadStepImages(stepIndex) {
      var step = bbState.steps[stepIndex];
      if (!step || step.id === 'review' || !step.productIds) return;
      step.productIds.forEach(function(pid) {
        var p = bbState.productsById[pid];
        if (!p || !p.images || !p.images.nodes || !p.images.nodes[0]) return;
        var img = new Image();
        img.src = getImageUrlOptimized(p.images.nodes[0].url);
      });
    }

    function renderProductCard(stepId, productId) {
      var p = bbState.productsById[productId];
      if (!p) return '';
      var sel = isSelected(productId);
      var dis = isDisabled(stepId, productId);
      var ruleTarget = getRuleTargetByProduct(stepId, p);
      var price = p.priceRange && p.priceRange.minVariantPrice ? p.priceRange.minVariantPrice.amount : '0';
      var compareAt = p.compareAtPriceRange && p.compareAtPriceRange.minVariantPrice ? p.compareAtPriceRange.minVariantPrice.amount : null;
      var hasPack = getHasProgramPack();
      var step = bbState.steps.find(function(s) { return s.id === stepId; });
      var hasDiscount = hasPack && step && !step.isProgramsStep && step.id !== 'review';
      var orig, final;
      if (hasDiscount && compareAt != null && parseFloat(compareAt) > 0) {
        orig = parseFloat(compareAt);
        final = orig * 0.4;
      } else {
        orig = getVisualOriginalPrice(stepId, price, hasPack);
        final = getVisualFinalPrice(stepId, price, hasPack);
      }
      if (ruleTarget && ruleTarget.free) {
        orig = 0;
        final = 0;
        hasDiscount = false;
        compareAt = null;
      }
      var sourceCur = getProductSourceCurrency(p);
      var cur = getDisplayCurrency();
      var img = (p.images && p.images.nodes && p.images.nodes[0]) ? getImageUrlOptimized(p.images.nodes[0].url) : '';
      var cardClass = 'bb-product-card' + (dis ? ' bb-product-card--disabled' : '');
      var busy = !!bbState.cartOperationInProgress;
      var spinnerSvg = '<span class="bb-spinner" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10" stroke-dasharray="32 56"/></svg></span>';
      var addBtnLabel = (ruleTarget && ruleTarget.type === 'knee_pads') ? 'Select your size' : ('Add for ' + formatMoney(final, cur, sourceCur));
      var addBtnContent = busy ? spinnerSvg + '<span class="bb-btn-text">Adding...</span>' : addBtnLabel;
      var removeBtnContent = busy ? spinnerSvg : '×';
      var btnHtml = dis
        ? '<button type="button" class="bb-product-btn bb-product-btn--disabled" disabled>Unavailable</button>'
        : sel
          ? '<button type="button" class="bb-product-btn bb-product-btn--added" disabled>Added</button><button type="button" class="bb-product-remove' + (busy ? ' bb-product-btn--loading' : '') + '" data-bb-remove="' + productId + '" aria-label="Remove"' + (busy ? ' disabled' : '') + '>' + removeBtnContent + '</button>'
          : '<button type="button" class="bb-product-btn bb-product-btn--add' + (busy ? ' bb-product-btn--loading' : '') + '"' + (busy ? ' disabled>' : ' data-bb-add data-step="' + stepId + '" data-product="' + productId + '"' + ((ruleTarget && ruleTarget.type === 'knee_pads') ? ' data-bb-knee-pads-size-btn="true"' : '') + '>') + addBtnContent + '</button>';
      var priceHtml;
      if (hasDiscount) {
        priceHtml = '<span class="bb-product-original">' + formatMoney(orig, cur, sourceCur) + '</span><span class="bb-product-final">' + formatMoney(final, cur, sourceCur) + '</span><span class="bb-product-badge">-60%</span>';
      } else if (compareAt && parseFloat(compareAt) > parseFloat(price)) {
        var pct = Math.round((1 - parseFloat(price) / parseFloat(compareAt)) * 100);
        priceHtml = '<span class="bb-product-original">' + formatMoney(parseFloat(compareAt), cur, sourceCur) + '</span><span class="bb-product-final">' + formatMoney(parseFloat(price), cur, sourceCur) + '</span><span class="bb-product-badge">-' + pct + '%</span>';
      } else {
        priceHtml = '<span class="bb-product-final">' + formatMoney(final, cur, sourceCur) + '</span>';
      }
      var titleOverlay = '<div class="bb-product-title-overlay">' + (p.title || '') + '</div>';
      var badgeLabel = '';
      if (step && step.isProgramsStep) {
        var normalizedHandle = String(p.handle || '').toLowerCase().replace(/\s+/g, ' ').trim();
        var normalizedTitle = String(p.title || '').toLowerCase().replace(/\s+/g, ' ').trim();
        var hasMegaTwerk = normalizedHandle.indexOf('mega') !== -1 && normalizedHandle.indexOf('twerk') !== -1;
        var hasPackOrBundle = normalizedHandle.indexOf('pack') !== -1 || normalizedHandle.indexOf('bundle') !== -1;
        var hasTwerkProgram = normalizedHandle.indexOf('twerk') !== -1 && normalizedHandle.indexOf('program') !== -1;
        var titleIsMegaPack = normalizedTitle.indexOf('mega twerk') !== -1 && (normalizedTitle.indexOf('pack') !== -1 || normalizedTitle.indexOf('bundle') !== -1);
        var titleIsTwerkProgram = normalizedTitle.indexOf('twerk program') !== -1;
        if (hasMegaTwerk && hasPackOrBundle) {
          badgeLabel = 'Best Value';
        } else if (titleIsMegaPack) {
          badgeLabel = 'Best Value';
        } else if (hasTwerkProgram) {
          badgeLabel = 'Bestseller';
        } else if (titleIsTwerkProgram) {
          badgeLabel = 'Bestseller';
        }
      }
      var badgeHtml = badgeLabel ? '<div class="bb-product-top-badge" aria-hidden="true">' + badgeLabel + '</div>' : '';
      var zoomSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>';
      var zoomBtn = !sel ? '<button type="button" class="bb-product-zoom-btn" data-bb-zoom data-product="' + (productId || '').replace(/"/g, '&quot;') + '" aria-label="View larger">' + zoomSvg + '</button>' : '';
      return '<div class="' + cardClass + '" data-product="' + productId + '"><div class="bb-product-img-wrap" data-product="' + (productId || '').replace(/"/g, '&quot;') + '">' + badgeHtml + '<img class="bb-product-img" src="' + (img || '') + '" alt="" loading="lazy">' + zoomBtn + titleOverlay + '</div><div class="bb-product-price">' + priceHtml + '</div><div class="bb-product-actions">' + btnHtml + '</div></div>';
    }

    function isClothingStep(stepId) {
      var step = bbState.steps.find(function(s) { return s.id === stepId; });
      return step && !step.isProgramsStep && stepId !== 'review';
    }

    function getSizesForStep(stepId) {
      var step = bbState.steps.find(function(s) { return s.id === stepId; });
      if (!step || !step.productIds) return [];
      var set = {};
      step.productIds.forEach(function(pid) {
        var p = bbState.productsById[pid];
        if (!p || !p.variants || !p.variants.nodes) return;
        p.variants.nodes.forEach(function(v) {
          if (!v.selectedOptions) return;
          v.selectedOptions.forEach(function(o) {
            if ((o.name || '').toLowerCase() === 'size') set[o.value] = true;
          });
        });
      });
      return Object.keys(set).sort();
    }

    function getFilteredProductIds(stepId, sizeFilter) {
      var step = bbState.steps.find(function(s) { return s.id === stepId; });
      if (!step || !step.productIds) return [];
      if (!sizeFilter) return step.productIds;
      return step.productIds.filter(function(pid) {
        var p = bbState.productsById[pid];
        if (!p || !p.variants || !p.variants.nodes) return false;
        return p.variants.nodes.some(function(v) {
          if (!v.availableForSale) return false;
          if (!v.selectedOptions) return false;
          return v.selectedOptions.some(function(o) {
            return (o.name || '').toLowerCase() === 'size' && o.value === sizeFilter;
          });
        });
      });
    }

    function renderProductStep(stepId, productIds) {
      var html = '<div class="bb-product-scroll"><div class="bb-product-row">';
      (productIds || []).forEach(function(pid) {
        html += renderProductCard(stepId, pid);
      });
      html += '</div></div>';
      return html;
    }

    function renderSizeFilterBar(stepId) {
      var sizes = getSizesForStep(stepId);
      if (!sizes.length) return '';
      var active = bbState.sizeFilter;
      var label = active ? active : 'All';
      var iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4"/></svg>';
      var html = '<div class="bb-size-filter">';
      html += '<button type="button" class="bb-size-filter-trigger' + (active ? ' bb-size-filter-trigger--active' : '') + '" data-bb-size-filter-open aria-label="Filter by size">' + iconSvg + '<span class="bb-size-filter-trigger-label">Size: ' + (label || 'All') + '</span></button>';
      html += '<div class="bb-size-filter-sheet bb-size-filter-sheet--hidden" data-bb-size-filter-sheet role="dialog" aria-label="Choose size">';
      html += '<div class="bb-size-filter-sheet-backdrop" data-bb-size-filter-close></div>';
      html += '<div class="bb-size-filter-sheet-panel"><h3 class="bb-size-filter-sheet-title">Filter by size</h3><div class="bb-size-filter-pills">';
      html += '<button type="button" class="bb-size-filter-pill' + (!active ? ' bb-size-filter-pill--active' : '') + '" data-bb-size-filter="">All</button>';
      sizes.forEach(function(s) {
        html += '<button type="button" class="bb-size-filter-pill' + (active === s ? ' bb-size-filter-pill--active' : '') + '" data-bb-size-filter="' + (s || '').replace(/"/g, '&quot;') + '">' + (s || '') + '</button>';
      });
      html += '</div></div></div></div>';
      return html;
    }

    function renderReviewStep() {
      var items = bbState.selectedItems;
      if (!items.length) return '<p class="bb-wizard-placeholder">No items selected yet.</p>';
      var cur = getDisplayCurrency();
      var busy = !!bbState.cartOperationInProgress;
      var removeSpinner = '<span class="bb-spinner" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10" stroke-dasharray="32 56"/></svg></span>';
      var removeContent = busy ? removeSpinner : '×';
      var html = '<div class="bb-review-list">';
      items.forEach(function(item) {
        var p = bbState.productsById[item.productId];
        if (!p) return;
        var hasPack = getHasProgramPack();
        var of = getItemOrigAndFinal(item, hasPack);
        var sourceCur = getProductSourceCurrency(p);
        var itemCur = cur;
        var img = (p.images && p.images.nodes && p.images.nodes[0]) ? getImageUrlOptimized(p.images.nodes[0].url, 128) : '';
        var opts = '';
        var selectedVariant = null;
        if (p.variants && p.variants.nodes && p.variants.nodes.length) {
          selectedVariant = p.variants.nodes.find(function(v) { return String(v.id) === String(item.variantId); }) || p.variants.nodes[0];
        }
        if (selectedVariant && selectedVariant.selectedOptions) {
          opts = selectedVariant.selectedOptions
            .map(function(o) { return String((o && o.value) || '').trim(); })
            .filter(function(v) { return v && v.toLowerCase() !== 'default title'; })
            .join(' • ');
        }
        var priceHtml;
        if (of.orig > of.final) {
          var linePct = Math.max(1, Math.round((1 - (of.final / of.orig)) * 100));
          priceHtml = '<div class="bb-review-price-row"><div class="bb-review-price-left"><span class="bb-review-original">' + formatMoney(of.orig, itemCur, sourceCur) + '</span><span class="bb-review-discount-badge">' + linePct + '% OFF</span></div><span class="bb-review-price">' + formatMoney(of.final, itemCur, sourceCur) + '</span></div>';
        } else {
          priceHtml = '<div class="bb-review-price-row"><span class="bb-review-price">' + formatMoney(of.final, itemCur, sourceCur) + '</span></div>';
        }
        html += '<div class="bb-review-item"><img class="bb-review-thumb" src="' + (img || '') + '" alt=""><div class="bb-review-info"><span class="bb-review-title">' + (p.title || '') + '</span>' + (opts ? '<span class="bb-review-opts">' + opts + '</span>' : '') + priceHtml + '</div><button type="button" class="bb-product-remove bb-product-remove--review' + (busy ? ' bb-product-btn--loading' : '') + '" data-bb-remove="' + item.productId + '" aria-label="Remove"' + (busy ? ' disabled' : '') + '>' + removeContent + '</button></div>';
      });
      html += '</div>';
      return html;
    }

    function renderStep() {
      if (!contentEl) return;
      var scrollTop = contentEl.scrollTop;
      var scrollRow = contentEl.querySelector('.bb-product-scroll');
      var scrollLeft = scrollRow ? scrollRow.scrollLeft : 0;
      var step = bbState.steps[bbState.currentStepIndex];
      if (step.id === 'review') {
        contentEl.innerHTML = renderReviewStep();
      } else {
        var filteredIds = getFilteredProductIds(step.id, bbState.sizeFilter);
        var sizeFilterHtml = isClothingStep(step.id) ? renderSizeFilterBar(step.id) : '';
        contentEl.innerHTML = sizeFilterHtml + renderProductStep(step.id, filteredIds);
      }
      contentEl.scrollTop = scrollTop;
      var newScrollRow = contentEl.querySelector('.bb-product-scroll');
      if (newScrollRow) newScrollRow.scrollLeft = scrollLeft;
      contentEl.querySelectorAll('[data-bb-add]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var s = btn.getAttribute('data-step');
          var pid = btn.getAttribute('data-product');
          var p = bbState.productsById[pid];
          if (!p) return;
          var variants = (p.variants && p.variants.nodes) || [];
          if (variants.length > 1) {
            openVariantModal(s, pid);
          } else {
            addItem(s, pid);
          }
        });
      });
      contentEl.querySelectorAll('[data-bb-remove]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          removeItem(btn.getAttribute('data-bb-remove'));
        });
      });
      contentEl.querySelectorAll('[data-bb-size-filter-open]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var sheet = contentEl.querySelector('[data-bb-size-filter-sheet]');
          if (sheet) sheet.classList.remove('bb-size-filter-sheet--hidden');
        });
      });
      contentEl.querySelectorAll('[data-bb-size-filter-close]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var sheet = contentEl.querySelector('[data-bb-size-filter-sheet]');
          if (sheet) sheet.classList.add('bb-size-filter-sheet--hidden');
        });
      });
      contentEl.querySelectorAll('[data-bb-size-filter]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          bbState.sizeFilter = btn.getAttribute('data-bb-size-filter') || null;
          renderStep();
        });
      });
      contentEl.querySelectorAll('[data-bb-zoom]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          openImageViewer(btn.getAttribute('data-product'));
        });
      });
      contentEl.querySelectorAll('.bb-product-img-wrap').forEach(function(wrap) {
        wrap.addEventListener('click', function(e) {
          if (e.target.closest && e.target.closest('[data-bb-zoom]')) return;
          e.stopPropagation();
          var productId = wrap.getAttribute('data-product');
          if (shouldOpenProgramDescriptionPopup(step.id)) {
            openProgramDescriptionPopup(productId);
          } else {
            openImageViewer(productId);
          }
        });
      });
    }

    sectionRoot.querySelectorAll('[data-bb-image-viewer-close]').forEach(function(btn) {
      btn.addEventListener('click', closeImageViewer);
    });
    sectionRoot.querySelectorAll('.bb-image-viewer-backdrop').forEach(function(el) {
      el.addEventListener('click', closeImageViewer);
    });
    if (imageViewerPrevEl) imageViewerPrevEl.addEventListener('click', imageViewerPrev);
    if (imageViewerNextEl) imageViewerNextEl.addEventListener('click', imageViewerNext);

    sectionRoot.querySelectorAll('[data-bb-footer-expand]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (!footerEl) return;
        var expanded = footerEl.classList.toggle('bb-wizard-footer--expanded');
        btn.setAttribute('aria-label', expanded ? 'Hide details' : 'Show details');
      });
    });

    function renderDiscountBanner() {
      if (!discountEl) return;
      var hasPack = getHasProgramPack();
      if (hasPack) {
        discountEl.className = 'bb-wizard-discount bb-wizard-discount--applied';
        discountEl.innerHTML = '<span class="bb-wizard-discount-text">' + escapeHtml(discountAppliedText) + '</span>';
      } else {
        discountEl.className = 'bb-wizard-discount bb-wizard-discount--promo';
        discountEl.innerHTML = '<span class="bb-wizard-discount-text">' + escapeHtml(discountPromoText) + '</span>';
      }
    }

    function getItemOrigAndFinal(item, hasPack) {
      var p = bbState.productsById[item.productId];
      if (!p) return { orig: 0, final: 0 };
      var ruleTarget = getRuleTargetByProduct(item.stepId, p);
      if (ruleTarget && ruleTarget.free) return { orig: 0, final: 0 };
      var price = p.priceRange && p.priceRange.minVariantPrice ? parseFloat(p.priceRange.minVariantPrice.amount) : 0;
      var compareAt = p.compareAtPriceRange && p.compareAtPriceRange.minVariantPrice ? parseFloat(p.compareAtPriceRange.minVariantPrice.amount) : null;
      var step = bbState.steps.find(function(s) { return s.id === item.stepId; });
      var isProgramsStep = step && step.isProgramsStep;
      var orig, final;
      if (isProgramsStep && compareAt != null && compareAt > price) {
        orig = compareAt;
        final = price;
      } else if (hasPack && compareAt != null && compareAt > 0) {
        orig = compareAt;
        final = compareAt * 0.4;
      } else if (compareAt != null && compareAt > price) {
        orig = compareAt;
        final = price;
      } else {
        orig = getVisualOriginalPrice(item.stepId, price, hasPack);
        final = getVisualFinalPrice(item.stepId, price, hasPack);
      }
      return { orig: orig, final: final };
    }

    function getSummaryTotals(targetCurrency) {
      var subtotal = 0, total = 0;
      var hasPack = getHasProgramPack();
      var target = targetCurrency || getDisplayCurrency();
      bbState.selectedItems.forEach(function(item) {
        var qty = item.quantity || 1;
        var of = getItemOrigAndFinal(item, hasPack);
        var p = bbState.productsById[item.productId];
        var sourceCur = getProductSourceCurrency(p);
        subtotal += convertMoneyAmount(of.orig, target, sourceCur) * qty;
        total += convertMoneyAmount(of.final, target, sourceCur) * qty;
      });
      return { subtotal: subtotal, total: total, discount: subtotal - total };
    }

    function renderFooterSummary() {
      if (!footerEl) return;
      var summary = footerEl.querySelector('.bb-wizard-summary');
      if (summary) summary.remove();
      var compactEl = footerEl.querySelector('[data-bb-footer-compact]');
      var youSaveSlotEl = footerEl.querySelector('[data-bb-footer-you-save]');
      var secureFooterSlotEl = footerEl.querySelector('[data-bb-secure-footer-slot]');
      var cart = bbState.cartData;
      var itemCount = 0;
      var cur = getDisplayCurrency();
      var orig = 0;
      var total = 0;
      var discountAmt = 0;
      var discountPct = 0;
      if (bbState.selectedItems.length > 0) {
        cur = getDisplayCurrency();
        var totals = getSummaryTotals(cur);
        itemCount = bbState.selectedItems.reduce(function(s, i) { return s + (i.quantity || 1); }, 0);
        orig = totals.subtotal;
        total = totals.total;
        discountAmt = totals.discount > 0 ? totals.discount : 0;
        discountPct = orig > 0 ? Math.round((discountAmt / orig) * 100) : 0;
      } else if (cart && cart.item_count > 0) {
        itemCount = cart.item_count;
        cur = cart.currency || getCartCurrency();
        orig = (cart.original_total_price || 0) / 100;
        total = (cart.total_price || 0) / 100;
        discountAmt = (cart.total_discount || 0) / 100;
        discountPct = orig > 0 ? Math.round((discountAmt / orig) * 100) : 0;
      }
      var compactHtml = discountAmt > 0
        ? '<span class="bb-wizard-summary-original">' + formatMoney(orig, cur, cur) + '</span> ' + formatMoney(total, cur, cur)
        : formatMoney(total, cur, cur);
      if (compactEl) compactEl.innerHTML = compactHtml;
      var subtotalClass = 'bb-wizard-summary-line' + (discountAmt > 0 ? ' bb-wizard-summary-line--subtotal-crossed' : '');
      var subtotalHtml = discountAmt > 0
        ? '<span>Subtotal</span><span class="bb-wizard-summary-original">' + formatMoney(orig, cur, cur) + '</span>'
        : '<span>Subtotal</span><span>' + formatMoney(orig, cur, cur) + '</span>';
      var discountHtml = discountAmt > 0
        ? '<div class="bb-wizard-summary-line bb-wizard-summary-line--discount"><span>Discount (' + discountPct + '%)</span><span>- ' + formatMoney(discountAmt, cur, cur) + '</span></div>'
        : '<div class="bb-wizard-summary-line bb-wizard-summary-line--discount-placeholder"><span></span><span></span></div>';
      var totalLineHtml = '<div class="bb-wizard-summary-line bb-wizard-summary-line--total"><span>Total</span><span>' + formatMoney(total, cur, cur) + '</span></div>';
      var youSaveHtml = discountAmt > 0
        ? '<div class="bb-wizard-you-save"><span class="bb-wizard-you-save-text">You save:</span><span class="bb-wizard-you-save-badge">' + formatMoney(discountAmt, cur, cur) + '</span></div>'
        : '';
      if (youSaveSlotEl) youSaveSlotEl.innerHTML = youSaveHtml;
      var secureFooterHtml = '';
      if (bbState.steps[bbState.currentStepIndex] && bbState.steps[bbState.currentStepIndex].id === 'review') {
        var shieldSvg = secureFooterShieldIconUrl
          ? '<span class="bb-wizard-guarantee-shield" aria-hidden="true"><img class="bb-wizard-guarantee-shield-img" src="' + secureFooterShieldIconUrl + '" alt=""></span>'
          : '<span class="bb-wizard-guarantee-shield" aria-hidden="true"></span>';
        var paymentIcons = secureFooterPaymentIconsHtml ? '<div class="bb-wizard-payment-icons">' + secureFooterPaymentIconsHtml + '</div>' : '';
        secureFooterHtml = '<div class="bb-wizard-secure-footer"><div class="bb-wizard-guarantee">' + shieldSvg + '<span class="bb-wizard-guarantee-text">' + escapeHtml(secureFooterGuaranteeText) + '</span></div>' + paymentIcons + '</div>';
      }
      if (secureFooterSlotEl) secureFooterSlotEl.innerHTML = secureFooterHtml;
      /* Hierarchy: item count → subtotal → discount → total */
      var insert = document.createElement('div');
      insert.className = 'bb-wizard-summary';
      insert.innerHTML = '<div class="bb-wizard-summary-line"><span>' + itemCount + ' item(s)</span></div>' +
        '<div class="' + subtotalClass + '">' + subtotalHtml + '</div>' +
        discountHtml +
        totalLineHtml;
      var buttonsEl = footerEl.querySelector('.bb-wizard-footer-buttons');
      footerEl.insertBefore(insert, buttonsEl);
    }

    function submitBundle() {
      if (bbState.isSubmitting || bbState.selectedItems.length === 0) return;
      bbState.isSubmitting = true;

      var items = bbState.selectedItems.map(function(item) {
        var variantNum = String(item.variantId).replace(/.*\/(\d+)$/, '$1') || String(item.variantId);
        return { id: parseInt(variantNum, 10) || variantNum, quantity: item.quantity || 1 };
      });

      fetch(cartUrls.clear, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({})
      })
        .then(function(r) { return r.ok ? r.json() : Promise.reject(new Error('Clear failed')); })
        .then(function() {
          return fetch(cartUrls.add, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: items })
          });
        })
        .then(function(r) { return r.ok ? r.json() : Promise.reject(new Error('Add failed')); })
        .then(function() {
          var code = (getHasProgramPack() && discountCode) ? discountCode : '';
          return fetch(cartUrls.update, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ discount: code })
          });
        })
        .then(function() {
          bbState.isSubmitting = false;
          closeWizard();
          var checkoutHref = checkoutUrl;
          if (discountCode && getHasProgramPack()) {
            checkoutHref += (checkoutUrl.indexOf('?') >= 0 ? '&' : '?') + 'discount=' + encodeURIComponent(discountCode);
          }
          window.location.href = checkoutHref;
        })
        .catch(function() {
          bbState.isSubmitting = false;
          showToast('Error. Please try again.');
        });
    }

    function showToast(msg) {
      var el = document.createElement('div');
      el.className = 'bb-toast';
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(function() { el.classList.add('bb-toast--visible'); }, 10);
      setTimeout(function() {
        el.classList.remove('bb-toast--visible');
        setTimeout(function() { el.remove(); }, 300);
      }, 3000);
    }

    var variantModalState = { stepId: null, productId: null, selectedVariantId: null, quantity: 1 };
    var variantModalEl = sectionRoot.querySelector('[data-bb-variant-modal]');
    var variantModalImgEl = sectionRoot.querySelector('[data-bb-variant-modal-img]');
    var variantModalTitleEl = sectionRoot.querySelector('[data-bb-variant-modal-title]');
    var variantModalOptionsEl = sectionRoot.querySelector('[data-bb-variant-modal-options]');
    var variantModalAddBtn = sectionRoot.querySelector('[data-bb-variant-modal-add]');
    var variantModalSizeGuideBtn = sectionRoot.querySelector('[data-bb-variant-modal-size-guide]');
    var variantModalQtyValue = sectionRoot.querySelector('[data-bb-variant-qty-value]');
    var variantModalQtyMinus = sectionRoot.querySelector('[data-bb-variant-qty-minus]');
    var variantModalQtyPlus = sectionRoot.querySelector('[data-bb-variant-qty-plus]');

    function openVariantModal(stepId, productId) {
      var p = bbState.productsById[productId];
      if (!p || !variantModalEl) return;
      var variants = (p.variants && p.variants.nodes) || [];
      if (variants.length < 2) return;
      var firstAvail = variants.find(function(v) { return v.availableForSale; }) || variants[0];
      variantModalState = { stepId: stepId, productId: productId, selectedVariantId: firstAvail ? firstAvail.id : null, quantity: 1 };
      var img = (p.images && p.images.nodes && p.images.nodes[0]) ? getImageUrlOptimized(p.images.nodes[0].url, 400) : '';
      if (variantModalImgEl) variantModalImgEl.src = img || '';
      if (variantModalTitleEl) variantModalTitleEl.textContent = (p.title || '').toUpperCase();
      var optsHtml = '';
      variants.forEach(function(v) {
        var sel = v.id === variantModalState.selectedVariantId ? ' bb-variant-pill--selected' : '';
        var unavail = !v.availableForSale ? ' bb-variant-pill--unavailable' : '';
        var label = v.title || (v.selectedOptions && v.selectedOptions.map(function(o){return o.value;}).join(' / ')) || v.id;
        optsHtml += '<button type="button" class="bb-variant-pill' + sel + unavail + '" data-bb-variant-id="' + v.id + '" ' + (!v.availableForSale ? 'disabled' : '') + '>' + (label || '') + '</button>';
      });
      if (variantModalOptionsEl) variantModalOptionsEl.innerHTML = optsHtml;
      variantModalOptionsEl && variantModalOptionsEl.querySelectorAll('.bb-variant-pill').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (btn.disabled) return;
          var vid = btn.getAttribute('data-bb-variant-id');
          variantModalState.selectedVariantId = vid;
          variantModalOptionsEl.querySelectorAll('.bb-variant-pill').forEach(function(b) { b.classList.remove('bb-variant-pill--selected'); });
          btn.classList.add('bb-variant-pill--selected');
        });
      });
      if (variantModalQtyValue) variantModalQtyValue.textContent = '1';
      if (variantModalAddBtn) variantModalAddBtn.disabled = !variantModalState.selectedVariantId;
      variantModalEl.classList.remove('bb-variant-modal--hidden');
      if (variantModalSizeGuideBtn) {
        variantModalSizeGuideBtn.style.display = '';
        variantModalSizeGuideBtn.dataset.bbSizeChartProduct = productId;
      }
    }

    function closeVariantModal() {
      variantModalState = { stepId: null, productId: null, selectedVariantId: null, quantity: 1 };
      if (variantModalEl) variantModalEl.classList.add('bb-variant-modal--hidden');
    }

    function updateVariantModalQty() {
      if (variantModalQtyValue) variantModalQtyValue.textContent = String(variantModalState.quantity);
      if (variantModalQtyMinus) variantModalQtyMinus.disabled = variantModalState.quantity <= 1;
    }

    if (variantModalQtyMinus) variantModalQtyMinus.addEventListener('click', function() {
      if (variantModalState.quantity > 1) { variantModalState.quantity--; updateVariantModalQty(); }
    });
    if (variantModalQtyPlus) variantModalQtyPlus.addEventListener('click', function() {
      variantModalState.quantity++; updateVariantModalQty();
    });

    function confirmVariantAdd() {
      if (!variantModalState.stepId || !variantModalState.productId || !variantModalState.selectedVariantId) return;
      var qty = Math.max(1, parseInt(variantModalState.quantity, 10) || 1);
      addItem(variantModalState.stepId, variantModalState.productId, variantModalState.selectedVariantId, qty);
      closeVariantModal();
    }

    sectionRoot.querySelectorAll('[data-bb-variant-modal-close], [data-bb-variant-modal-backdrop]').forEach(function(el) {
      if (el) el.addEventListener('click', closeVariantModal);
    });
    if (variantModalAddBtn) variantModalAddBtn.addEventListener('click', confirmVariantAdd);

    if (variantModalSizeGuideBtn) {
      variantModalSizeGuideBtn.addEventListener('click', function() {
        var productId = variantModalSizeGuideBtn.dataset.bbSizeChartProduct;
        if (productId) openSizeChartModal(productId);
      });
    }

    function storefrontApiRequest(query, variables) {
      if (!storefrontApiToken) return Promise.resolve(null);
      var shop = shopDomain.replace(/\.myshopify\.com$/, '');
      var url = 'https://' + shop + '.myshopify.com/api/2024-01/graphql.json';
      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': storefrontApiToken
        },
        body: JSON.stringify({ query: query, variables: variables || {} })
      }).then(function(r) { return r.json(); });
    }

    function fetchSizeChartConfig() {
      return storefrontApiRequest(
        'query GetPageCalculatorConfig($handle: String!) { page(handle: $handle) { calculatorConfig: metafield(namespace: "custom", key: "calculator_config") { value } } }',
        { handle: sizeChartConfigHandle }
      ).then(function(data) {
        var raw = data && data.data && data.data.page && data.data.page.calculatorConfig && data.data.page.calculatorConfig.value;
        if (!raw || typeof raw !== 'string') return null;
        try { return JSON.parse(raw); } catch (e) { return null; }
      });
    }

    function fetchPageByHandle(handle) {
      return storefrontApiRequest(
        'query GetPage($handle: String!) { page(handle: $handle) { id title body handle metafield(namespace: "custom", key: "size_calculator") { key value } } }',
        { handle: handle }
      ).then(function(data) { return data && data.data && data.data.page ? data.data.page : null; });
    }

    function fetchPageById(pageId) {
      if (!pageId) return Promise.resolve(null);
      return storefrontApiRequest(
        'query GetPageById($id: ID!) { page(id: $id) { id title body handle metafield(namespace: "custom", key: "size_calculator") { key value } } }',
        { id: pageId }
      ).then(function(data) { return data && data.data && data.data.page ? data.data.page : null; });
    }

    function normalizePageHandle(rawValue) {
      var v = String(rawValue || '').trim();
      if (!v) return '';
      if (v.indexOf('/pages/') >= 0) {
        var parts = v.split('/pages/');
        v = parts[parts.length - 1];
      }
      if (/^https?:\/\//i.test(v)) {
        try {
          var u = new URL(v);
          var path = String(u.pathname || '');
          if (path.indexOf('/pages/') >= 0) v = path.split('/pages/').pop();
          else v = path;
        } catch (e) {}
      }
      v = v.replace(/^\/+|\/+$/g, '');
      return v;
    }

    function fetchProductSizeChartRef(productId) {
      var gid = productId.indexOf('gid://') === 0 ? productId : 'gid://shopify/Product/' + gidToNum(productId);
      var localProduct = bbState.productsById[productId] || bbState.productsById[String(gidToNum(productId) || '')];
      var localTags = (localProduct && localProduct.tags) || [];
      var localNoCalc = localTags.some(function(tag) { return String(tag || '').toLowerCase() === 'no_calc'; });
      return storefrontApiRequest(
        'query GetProduct($id: ID!) { product(id: $id) { id tags metafield(namespace: "info", key: "size_chart") { value reference { ... on Page { id handle } } } } }',
        { id: gid }
      ).then(function(data) {
        var product = data && data.data && data.data.product;
        var m = product && product.metafield;
        var tags = (product && product.tags) || [];
        var hasNoCalcTag = tags.some(function(tag) { return String(tag || '').toLowerCase() === 'no_calc'; }) || localNoCalc;
        if (!m) return { handle: null, pageId: null, noCalc: hasNoCalcTag };
        if (m.reference && (m.reference.handle || m.reference.id)) return { handle: normalizePageHandle(m.reference.handle), pageId: m.reference.id || null, noCalc: hasNoCalcTag };
        if (m.value && typeof m.value === 'string') {
          var value = String(m.value || '').trim();
          var pageId = value.indexOf('gid://shopify/Page/') === 0 ? value : null;
          var handle = pageId ? '' : normalizePageHandle(value);
          return { handle: handle, pageId: pageId, noCalc: hasNoCalcTag };
        }
        return { handle: null, pageId: null, noCalc: hasNoCalcTag };
      });
    }

    function getMeasurementType(handle) {
      if (!handle) return 'waist-hip';
      var lower = (handle || '').toLowerCase();
      if (lower.indexOf('top') >= 0 || lower.indexOf('bra') >= 0 || lower.indexOf('longtop') >= 0) return 'chest';
      return 'waist-hip';
    }

    function parseSizeChartHTML(html) {
      var parser = new DOMParser();
      var doc = parser.parseFromString(html || '', 'text/html');
      var tables = doc.querySelectorAll('table');
      var inchTable = [];
      var cmTable = [];
      tables.forEach(function(table, idx) {
        var rows = table.querySelectorAll('tr');
        var tableData = [];
        rows.forEach(function(row) {
          var cells = row.querySelectorAll('td, th');
          var rowData = [];
          cells.forEach(function(cell) { rowData.push((cell.textContent || '').trim()); });
          if (rowData.length) tableData.push(rowData);
        });
        if (idx === 0) inchTable = tableData; else cmTable = tableData;
      });
      return { inchTable: inchTable, cmTable: cmTable };
    }

    function parseCalculatorData(value) {
      var waist = [], hip = [], chest = [];
      (value || '').split(' ').forEach(function(part) {
        if (part.indexOf('Waist:') === 0) {
          part.replace('Waist:', '').split('|').forEach(function(v) { var n = parseFloat(v); if (!isNaN(n)) waist.push(n); });
        } else if (part.indexOf('Hip:') === 0) {
          part.replace('Hip:', '').split('|').forEach(function(v) { var n = parseFloat(v); if (!isNaN(n)) hip.push(n); });
        } else if (part.indexOf('Chest:') === 0) {
          part.replace('Chest:', '').split('|').forEach(function(v) { var n = parseFloat(v); if (!isNaN(n)) chest.push(n); });
        }
      });
      return { waist: waist, hip: hip, chest: chest };
    }

    var MSG = { out_of_bounds: 'Double-check selected unit of measurement; otherwise, we do not carry your size yet.' };

    var sizeChartState = { open: false, productId: null, handle: null, page: null, config: null, unit: 'in', measurementType: 'waist-hip', sizeData: null, inchTable: [], cmTable: [] };
    var scModal = sectionRoot.querySelector('[data-bb-size-chart-modal]');
    var scCloseEls = sectionRoot.querySelectorAll('[data-bb-size-chart-close], .bb-size-chart-backdrop');
    var scUnitPills = sectionRoot.querySelectorAll('[data-bb-sc-unit]');
    var scUnitToggle = sectionRoot.querySelector('.bb-size-chart-unit-toggle');
    var scUnitDisplay = sectionRoot.querySelector('[data-bb-sc-unit-display]');
    var scTableUnit = sectionRoot.querySelector('[data-bb-sc-table-unit]');
    var scTips = sectionRoot.querySelector('[data-bb-sc-tips]');
    var scInputs = sectionRoot.querySelector('[data-bb-sc-inputs]');
    var scFields = sectionRoot.querySelectorAll('[data-bb-sc-field]');
    var scCalcBtn = sectionRoot.querySelector('[data-bb-sc-calculate]');
    var scResult = sectionRoot.querySelector('[data-bb-sc-result]');
    var scCalculator = sectionRoot.querySelector('.bb-size-chart-calculator');
    var scTableWrap = sectionRoot.querySelector('[data-bb-sc-table-wrap]');
    var scTable = sectionRoot.querySelector('[data-bb-sc-table]');
    var scContent = sectionRoot.querySelector('[data-bb-sc-content]');
    var scLoading = sectionRoot.querySelector('[data-bb-sc-loading]');
    var scEmpty = sectionRoot.querySelector('[data-bb-sc-empty]');
    function setCalculatorVisible(visible) {
      if (!scCalculator) return;
      scCalculator.style.display = visible ? '' : 'none';
    }

    function openSizeChartModal(productId) {
      if (!scModal) return;
      var productKey = String(productId || '');
      var localRef = sizeChartByProduct[productKey] || sizeChartByProduct[String(gidToNum(productKey) || '')] || null;
      sizeChartState.open = true;
      sizeChartState.productId = productId;
      sizeChartState.handle = null;
      sizeChartState.page = null;
      sizeChartState.unit = 'in';
      sizeChartState.measurementType = 'waist-hip';
      sizeChartState.sizeData = null;
      sizeChartState.inchTable = [];
      sizeChartState.cmTable = [];
      sizeChartState.noCalc = false;
      scModal.classList.remove('bb-size-chart-modal--hidden');
      if (scLoading) scLoading.style.display = '';
      if (scEmpty) scEmpty.style.display = 'none';
      if (scTableWrap) scTableWrap.style.display = 'none';
      if (scContent) { scContent.style.display = 'none'; scContent.innerHTML = ''; }
      if (scUnitToggle) scUnitToggle.style.display = '';
      scUnitPills.forEach(function(p) { p.classList.toggle('bb-size-chart-unit-pill--active', p.dataset.bbScUnit === 'in'); });
      if (scUnitDisplay) scUnitDisplay.textContent = 'IN';
      if (scTableUnit) scTableUnit.textContent = 'INCH';
      scFields.forEach(function(f) { f.value = ''; });
      if (scResult) { scResult.style.display = 'none'; scResult.className = 'bb-size-chart-result'; scResult.innerHTML = ''; }
      setCalculatorVisible(true);
      if (scTips) scTips.innerHTML = '<p><strong>How to Measure:</strong></p><p>&bull; <strong>Waist:</strong> Measure around the narrowest part of your waistline.</p><p>&bull; <strong>Hips:</strong> Stand with feet together and measure around the fullest part of your hips.</p>';
      if (scInputs) { scInputs.className = 'bb-size-chart-inputs bb-size-chart-inputs--waist-hip'; scInputs.querySelectorAll('.bb-size-chart-input-group--chest').forEach(function(g){ g.style.display = 'none'; }); scInputs.querySelectorAll('.bb-size-chart-input-group:not(.bb-size-chart-input-group--chest)').forEach(function(g){ g.style.display = ''; }); }

      if (localRef) {
        sizeChartState.handle = localRef.handle || null;
        sizeChartState.noCalc = localRef.noCalc === true;
        sizeChartState.measurementType = getMeasurementType(sizeChartState.handle || '');
        setCalculatorVisible(!sizeChartState.noCalc);
        if (scUnitToggle) scUnitToggle.style.display = sizeChartState.noCalc ? 'none' : '';
        if (sizeChartState.noCalc && localRef.html) {
          if (scLoading) scLoading.style.display = 'none';
          if (scTableWrap) scTableWrap.style.display = 'none';
          if (scContent) { scContent.innerHTML = localRef.html; scContent.style.display = ''; }
          if (scEmpty) scEmpty.style.display = 'none';
          return;
        }
      }

      if (!storefrontApiToken) {
        if (scLoading) scLoading.style.display = 'none';
        if (scTableWrap) scTableWrap.style.display = 'none';
        setCalculatorVisible(false);
        if (scEmpty) scEmpty.style.display = '';
        return;
      }
      fetchSizeChartConfig().then(function(cfg) { sizeChartState.config = cfg; });
      fetchProductSizeChartRef(productId).then(function(ref) {
        if (!ref) { if (scLoading) scLoading.style.display = 'none'; if (scEmpty) scEmpty.style.display = ''; return; }
        sizeChartState.handle = ref.handle || null;
        sizeChartState.noCalc = ref.noCalc === true;
        sizeChartState.measurementType = getMeasurementType(ref.handle);
        setCalculatorVisible(!sizeChartState.noCalc);
        if (scUnitToggle) scUnitToggle.style.display = sizeChartState.noCalc ? 'none' : '';
        if (scTips) scTips.innerHTML = sizeChartState.measurementType === 'chest' ? '<p><strong>How to Measure:</strong></p><p>&bull; <strong>Chest:</strong> Measure around the fullest part of your bust.</p>' : '<p><strong>How to Measure:</strong></p><p>&bull; <strong>Waist:</strong> Measure around the narrowest part of your waistline.</p><p>&bull; <strong>Hips:</strong> Stand with feet together and measure around the fullest part of your hips.</p>';
        if (scInputs) {
          scInputs.className = 'bb-size-chart-inputs bb-size-chart-inputs--' + sizeChartState.measurementType;
          scInputs.querySelectorAll('.bb-size-chart-input-group--chest').forEach(function(g){ g.style.display = sizeChartState.measurementType === 'chest' ? '' : 'none'; });
          scInputs.querySelectorAll('.bb-size-chart-input-group:not(.bb-size-chart-input-group--chest)').forEach(function(g){ g.style.display = sizeChartState.measurementType === 'chest' ? 'none' : ''; });
        }
        if (ref.pageId) return fetchPageById(ref.pageId);
        if (ref.handle) return fetchPageByHandle(ref.handle);
        return null;
      }).then(function(page) {
        if (scLoading) scLoading.style.display = 'none';
        if (!page) { if (scEmpty) scEmpty.style.display = ''; return; }
        sizeChartState.page = page;
        var parsed = parseSizeChartHTML(page.body);
        sizeChartState.inchTable = parsed.inchTable;
        sizeChartState.cmTable = parsed.cmTable;
        if (sizeChartState.noCalc) {
          if (scTableWrap) scTableWrap.style.display = 'none';
          if (scContent) {
            scContent.innerHTML = page.body || '';
            scContent.style.display = '';
          }
        } else {
          renderSizeChartTable();
          if (scTableWrap) scTableWrap.style.display = '';
        }
        if (scEmpty) scEmpty.style.display = 'none';
      }).catch(function() { if (scLoading) scLoading.style.display = 'none'; if (scEmpty) scEmpty.style.display = ''; });
    }

    function closeSizeChartModal() {
      sizeChartState.open = false;
      if (scModal) scModal.classList.add('bb-size-chart-modal--hidden');
    }

    function renderSizeChartTable() {
      if (!scTable) return;
      var unit = sizeChartState.unit;
      var tbl = unit === 'in' ? sizeChartState.inchTable : sizeChartState.cmTable;
      if (!tbl || !tbl.length) { scTable.innerHTML = ''; return; }
      var html = '<thead><tr>';
      (tbl[0] || []).forEach(function(cell, i) { html += '<th class="bb-size-chart-th' + (i === 0 ? ' bb-size-chart-th--label' : '') + '">' + (cell || '') + '</th>'; });
      html += '</tr></thead><tbody>';
      for (var r = 1; r < tbl.length; r++) {
        html += '<tr>';
        (tbl[r] || []).forEach(function(cell, i) { html += '<td class="bb-size-chart-td' + (i === 0 ? ' bb-size-chart-td--label' : '') + '">' + (cell || '') + '</td>'; });
        html += '</tr>';
      }
      html += '</tbody>';
      scTable.innerHTML = html;
    }

    function runSizeCalculator() {
      if (sizeChartState.noCalc) return;
      var unit = sizeChartState.unit;
      var table = unit === 'in' ? sizeChartState.inchTable : sizeChartState.cmTable;
      if (!table || !table.length) { showSizeChartResult('error', null, MSG.out_of_bounds); return; }
      var waistVal = parseFloat((scInputs && scInputs.querySelector('[data-bb-sc-field="waist"]')) ? scInputs.querySelector('[data-bb-sc-field="waist"]').value : '') || 0;
      var hipVal = parseFloat((scInputs && scInputs.querySelector('[data-bb-sc-field="hip"]')) ? scInputs.querySelector('[data-bb-sc-field="hip"]').value : '') || 0;
      var chestVal = parseFloat((scInputs && scInputs.querySelector('[data-bb-sc-field="chest"]')) ? scInputs.querySelector('[data-bb-sc-field="chest"]').value : '') || 0;
      var headers = (table[0] || []).slice(1);
      function findRowByKeyword(keyword) {
        var kw = String(keyword || '').toLowerCase();
        for (var i = 1; i < table.length; i++) {
          var label = String((table[i] && table[i][0]) || '').toLowerCase();
          if (label.indexOf(kw) >= 0) return table[i];
        }
        return null;
      }
      function parseCellRange(cell) {
        var nums = String(cell || '').replace(',', '.').match(/-?\d+(?:\.\d+)?/g);
        if (!nums || !nums.length) return null;
        var parsed = nums.map(function(n) { return parseFloat(n); }).filter(function(n) { return !isNaN(n); });
        if (!parsed.length) return null;
        if (parsed.length === 1) return { min: parsed[0], max: parsed[0] };
        return { min: Math.min.apply(null, parsed), max: Math.max.apply(null, parsed) };
      }
      function findColumnIndexForValue(row, value) {
        if (!row) return -1;
        var ranges = [];
        for (var c = 1; c < row.length; c++) {
          ranges.push(parseCellRange(row[c]));
        }
        for (var i = 0; i < ranges.length; i++) {
          var r = ranges[i];
          if (!r) continue;
          if (value >= r.min && value <= r.max) return i;
        }
        // If value falls into a small "gap" between adjacent ranges,
        // treat it as previous size (left range).
        for (var j = 0; j < ranges.length - 1; j++) {
          var left = ranges[j];
          var right = ranges[j + 1];
          if (!left || !right) continue;
          if (value > left.max && value < right.min) return j;
        }
        return -1;
      }
      if (sizeChartState.measurementType === 'chest') {
        var chestRow = findRowByKeyword('chest');
        var chestIdx = findColumnIndexForValue(chestRow, chestVal);
        if (chestIdx < 0 || !headers[chestIdx]) { showSizeChartResult('error', null, MSG.out_of_bounds); return; }
        showSizeChartResult('success', headers[chestIdx], '');
      } else {
        var waistRow = findRowByKeyword('waist');
        var hipRow = findRowByKeyword('hip');
        var waistIdx = findColumnIndexForValue(waistRow, waistVal);
        var hipIdx = findColumnIndexForValue(hipRow, hipVal);
        if (waistIdx < 0 || hipIdx < 0) { showSizeChartResult('error', null, MSG.out_of_bounds); return; }
        var recIdx = waistIdx > hipIdx ? waistIdx : hipIdx;
        if (!headers[recIdx]) { showSizeChartResult('error', null, MSG.out_of_bounds); return; }
        showSizeChartResult('success', headers[recIdx], '');
      }
    }

    function showSizeChartResult(type, size, note) {
      if (!scResult) return;
      scResult.style.display = '';
      scResult.className = 'bb-size-chart-result' + (type === 'warning' ? ' bb-size-chart-result--warning' : '') + (type === 'error' ? ' bb-size-chart-result--error' : '');
      scResult.innerHTML = type === 'success' ? '<p class="bb-size-chart-result-label">Your recommended size is</p><p class="bb-size-chart-result-size">' + (size || '') + '</p><p class="bb-size-chart-result-note">' + (note || '') + '</p>' : '<p class="bb-size-chart-result-note">' + (note || '') + '</p>';
    }

    scCloseEls.forEach(function(el) { if (el) el.addEventListener('click', closeSizeChartModal); });
    scUnitPills.forEach(function(pill) {
      pill.addEventListener('click', function() {
        var u = pill.dataset.bbScUnit;
        sizeChartState.unit = u;
        scUnitPills.forEach(function(p) { p.classList.toggle('bb-size-chart-unit-pill--active', p.dataset.bbScUnit === u); });
        if (scUnitDisplay) scUnitDisplay.textContent = u.toUpperCase();
        if (scTableUnit) scTableUnit.textContent = u === 'in' ? 'INCH' : 'CM';
        scFields.forEach(function(f) { f.value = ''; });
        if (scResult) scResult.style.display = 'none';
        renderSizeChartTable();
      });
    });
    scFields.forEach(function(f) {
      f.addEventListener('input', function() {
        var waist = (scInputs && scInputs.querySelector('[data-bb-sc-field="waist"]')) ? scInputs.querySelector('[data-bb-sc-field="waist"]').value : '';
        var hip = (scInputs && scInputs.querySelector('[data-bb-sc-field="hip"]')) ? scInputs.querySelector('[data-bb-sc-field="hip"]').value : '';
        var chest = (scInputs && scInputs.querySelector('[data-bb-sc-field="chest"]')) ? scInputs.querySelector('[data-bb-sc-field="chest"]').value : '';
        var canCalc = sizeChartState.measurementType === 'chest' ? !!chest : (!!waist && !!hip);
        if (scCalcBtn) scCalcBtn.disabled = !canCalc;
      });
    });
    if (scCalcBtn) scCalcBtn.addEventListener('click', runSizeCalculator);

    function openWizard() {
      // #region agent log
      console.log('[BB] openWizard called');
      // #endregion
      if (!wizardEl) return;
      var ctaLoading = false;
      if (ctaEl && !ctaEl.disabled) {
        ctaLoading = true;
        ctaEl.disabled = true;
        ctaEl.setAttribute('aria-busy', 'true');
        var origText = ctaEl.textContent;
        ctaEl.textContent = 'Loading...';
        ctaEl.classList.add('bb-cta--loading');
      }
      function clearCtaLoading() {
        try {
          if (ctaEl && ctaLoading) {
            ctaEl.disabled = false;
            ctaEl.removeAttribute('aria-busy');
            ctaEl.textContent = 'Start Building Your Bundle';
            ctaEl.classList.remove('bb-cta--loading');
          }
        } catch (e) {}
      }
      bbState.isOpen = true;
      bbState.currentStepIndex = 0;
      bbState.steps = applyStepOverride(bbState.baseSteps);
      bbState.productsLoaded = false;
      bbState.productsById = {};
      bbState.selectedItems = [];
      bbState.cartData = null;
      bbState.hasProgramPack = false;
      wizardEl.classList.remove('bb-wizard-overlay--hidden');
      wizardEl.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      document.body.classList.add('bb-wizard-open');
      var clearPromise = fetch(cartUrls.clear, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({})
      }).then(function(r) {
        if (!r.ok) throw new Error('Clear failed');
        return r.json();
      }).catch(function() {
        return null;
      });
      clearPromise
        .then(function() { return fetch(cartUrls.get); })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(cart) {
          bbState.cartData = cart || { item_count: 0, items: [], total_price: 0, currency: displayCurrency };
          return loadAllProductsForSteps();
        })
        .then(function() {
          goToStep(0);
          tryPreselectProgramsItem();
        })
        .catch(function(err) {
          // #region agent log
          console.log('[BB] openWizard catch:', err && err.message ? err.message : err);
          // #endregion
          bbState.cartData = { item_count: 0, items: [], total_price: 0, currency: displayCurrency };
          return loadAllProductsForSteps().then(function() {
            goToStep(0);
            tryPreselectProgramsItem();
          });
        })
        .finally(clearCtaLoading);
    }

    function tryPreselectProgramsItem() {
      try {
        if (typeof window === 'undefined') return;
        var targetIndex = null;
        if (typeof window.__bt_bb_preselect_program_index === 'number' && isFinite(window.__bt_bb_preselect_program_index)) {
          targetIndex = Math.max(0, Math.floor(window.__bt_bb_preselect_program_index));
        } else if (window.__bt_bb_preselect_second) {
          targetIndex = 1;
        } else if (window.__bt_bb_preselect_first) {
          targetIndex = 0;
        }
        if (targetIndex === null) return;

        window.__bt_bb_preselect_program_index = null;
        window.__bt_bb_preselect_second = false;
        window.__bt_bb_preselect_first = false;

        var programsStep = bbState.steps.find(function(s) { return s && s.isProgramsStep; });
        if (!programsStep || !programsStep.productIds || !programsStep.productIds.length) return;
        if (targetIndex >= programsStep.productIds.length) return;
        var targetPid = programsStep.productIds[targetIndex];
        addItem(programsStep.id, targetPid, null, 1);
      } catch (e) {}
    }

    function closeWizard() {
      bbState.isOpen = false;
      wizardEl.classList.add('bb-wizard-overlay--hidden');
      wizardEl.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      document.body.classList.remove('bb-wizard-open');
      var modal = sectionRoot.querySelector('.bb-exit-modal');
      if (modal) modal.classList.remove('bb-exit-modal--visible');
    }

    function requestCloseWizard() {
      if (bbState.cartData && bbState.cartData.item_count > 0) {
        var modal = sectionRoot.querySelector('.bb-exit-modal');
        if (modal) modal.classList.add('bb-exit-modal--visible');
      } else {
        closeWizard();
      }
    }

    function confirmExitWizard() {
      fetch(cartUrls.clear, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
        .then(function() {})
        .catch(function() {})
        .then(function() {
          closeWizard();
          showToast('Cart cleared');
        });
    }

    function renderProgressBar() {
      if (!progressBarEl) return;
      var len = bbState.steps.length;
      var current = bbState.currentStepIndex;
      var stepNum = current + 1;
      progressBarEl.innerHTML = '';
      progressBarEl.setAttribute('aria-valuenow', stepNum);
      progressBarEl.setAttribute('aria-valuemin', 1);
      progressBarEl.setAttribute('aria-valuemax', len);
      progressBarEl.setAttribute('aria-label', 'Step ' + stepNum + ' of ' + len);
      for (var i = 0; i < len; i++) {
        var seg = document.createElement('div');
        seg.className = 'bb-wizard-progress-segment' + (i <= current ? ' bb-wizard-progress-segment--filled' : '');
        progressBarEl.appendChild(seg);
      }
      if (stepTextEl) stepTextEl.textContent = 'Step ' + stepNum + ' of ' + len;
    }

    function goToStep(index) {
      var len = bbState.steps.length;
      if (index < 0 || index >= len) return;
      bbState.currentStepIndex = index;
      bbState.sizeFilter = null;
      var step = bbState.steps[index];
      if (titleEl) titleEl.textContent = step.title;
      renderProgressBar();
      renderStep();
      renderDiscountBanner();
      renderFooterSummary();
      if (backBtn) backBtn.disabled = index === 0;
      var isReviewStep = step && step.id === 'review';
      if (footerEl) footerEl.classList.toggle('bb-wizard-footer--review', !!isReviewStep);
      if (nextBtn) {
        nextBtn.disabled = false;
        if (index === len - 1) {
          nextBtn.innerHTML = '<span class="bb-wizard-btn-text">Add to cart</span><span class="bb-wizard-btn-arrow" aria-hidden="true">→</span>';
        } else {
          nextBtn.textContent = 'Next';
        }
      }
      applyWorkoutEquipmentAutoAdd(step);
      if (index + 1 < len && bbState.steps[index + 1].id !== 'review') {
        preloadStepImages(index + 1);
      }
    }

    function preloadBundleDataInBackground() {
      loadAllProductsForSteps().then(function() {
        preloadStepImages(0);
      }).catch(function() {});
    }

    var schedulePreload = (typeof requestIdleCallback !== 'undefined')
      ? function(fn) { requestIdleCallback(fn, { timeout: 2000 }); }
      : function(fn) { setTimeout(fn, 150); };
    schedulePreload(preloadBundleDataInBackground);

    ctaEl.addEventListener('click', function() { openWizard(); });
    if (typeof window !== 'undefined' && window.NassBundleBuilder) {
      window.NassBundleBuilder.openWizard = openWizard;
    }

    /* One-Click alternative: open wizard and preselect second program */
    var oneClickBtns = sectionRoot.querySelectorAll('[data-bb-one-click]');
    oneClickBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        btn.disabled = true;
        btn.classList.add('bb-cta-one-click__btn--loading');
        btn.innerHTML = '<span class="bb-cta-one-click__spinner" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10" stroke-dasharray="32 56"/></svg></span><span class="bb-cta-one-click__btn-text">Opening...</span>';

        window.__bt_bb_preselect_program_index = 1;
        openWizard();

        setTimeout(function() {
          btn.disabled = false;
          btn.classList.remove('bb-cta-one-click__btn--loading');
          btn.innerHTML = '<span class="bb-cta-one-click__btn-text">Only Twerk Program</span>';
        }, 1200);
      });
    });

    closeEls.forEach(function(el) { el.addEventListener('click', requestCloseWizard); });
    if (backBtn) backBtn.addEventListener('click', function() {
      if (bbState.currentStepIndex > 0) goToStep(bbState.currentStepIndex - 1);
      else requestCloseWizard();
    });
    var stayBtn = sectionRoot.querySelector('[data-bb-exit-stay]');
    var exitBtn = sectionRoot.querySelector('[data-bb-exit-confirm]');
    function hideExitModal() {
      var modal = sectionRoot.querySelector('.bb-exit-modal');
      if (modal) modal.classList.remove('bb-exit-modal--visible');
    }
    if (stayBtn) stayBtn.addEventListener('click', hideExitModal);
    var exitModalBackdrop = sectionRoot.querySelector('.bb-exit-modal-backdrop');
    if (exitModalBackdrop) exitModalBackdrop.addEventListener('click', hideExitModal);
    if (exitBtn) exitBtn.addEventListener('click', confirmExitWizard);
    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        var currentStep = bbState.steps[bbState.currentStepIndex];
        if (!hasRequiredKneePadsSelectionForVipEssential(currentStep)) {
          animateKneePadsSelectSizeButton();
          showToast('Please select the size of Knee Pads to continue');
          return;
        }
        if (bbState.currentStepIndex < bbState.steps.length - 1) goToStep(bbState.currentStepIndex + 1);
        else submitBundle();
      });
    }
  }

  if (typeof window !== 'undefined') {
    window.NassBundleBuilder = { init: init, openWizard: null };
  }
})();

/* Hero CTA: when user navigates to #nass-bundle-builder (click or hash), open wizard */
(function() {
  function tryOpenFromHash() {
    if (window.location.hash !== '#nass-bundle-builder') return;
    if (!window.NassBundleBuilder || typeof window.NassBundleBuilder.openWizard !== 'function') return;
    window.NassBundleBuilder.openWizard();
  }
  window.addEventListener('hashchange', tryOpenFromHash);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(tryOpenFromHash, 100); });
  } else {
    setTimeout(tryOpenFromHash, 100);
  }
})();
