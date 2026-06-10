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
    const klaviyoCompanyId = (config && typeof config.klaviyoCompanyId === 'string' && config.klaviyoCompanyId.trim())
      ? config.klaviyoCompanyId.trim()
      : 'TT4MNz';
    const knownCustomerEmail = (config && typeof config.customerEmail === 'string' && config.customerEmail.trim())
      ? config.customerEmail.trim()
      : '';
    const ctaEl = sectionRoot.querySelector('[data-bb-cta]');
    var wizardEl = document.getElementById('bundle-builder-wizard-' + sectionId);
    if (!wizardEl) wizardEl = sectionRoot.querySelector('.bb-wizard-overlay');
    const closeEls = sectionRoot.querySelectorAll('[data-bb-close]');
    const backBtn = sectionRoot.querySelector('[data-bb-back]');
    const nextBtn = sectionRoot.querySelector('[data-bb-next]');
    const titleEl = sectionRoot.querySelector('[data-bb-wizard-title]');
    const sizeFilterSlotEl = sectionRoot.querySelector('[data-bb-size-filter-slot]');
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
    const showDiscountBanner = !(config && config.showDiscountBanner === false);
    const secureFooterGuaranteeText = (config && typeof config.secureFooterGuaranteeText === 'string' && config.secureFooterGuaranteeText.trim())
      ? config.secureFooterGuaranteeText.trim()
      : '30 days money back guarantee';
    const secureFooterPaymentIconsHtml = (config && typeof config.secureFooterPaymentIconsHtml === 'string')
      ? config.secureFooterPaymentIconsHtml
      : '';
    const secureFooterShieldIconUrl = (config && typeof config.secureFooterShieldIconUrl === 'string' && config.secureFooterShieldIconUrl.trim())
      ? config.secureFooterShieldIconUrl.trim()
      : '';
    function resolveTemplateSuffix(cfg) {
      var suffix = String((cfg && cfg.templateSuffix) || '').toLowerCase().trim();
      if (suffix) return suffix;
      if (typeof document !== 'undefined' && document.body && document.body.className) {
        var bodyMatch = String(document.body.className).toLowerCase().match(/\bproduct--([^\s]+)/);
        if (bodyMatch && bodyMatch[1]) return bodyMatch[1];
      }
      return '';
    }
    const templateSuffix = resolveTemplateSuffix(config);
    const isNassFansFamilyTemplate = templateSuffix.indexOf('nass-fans') === 0 || templateSuffix.indexOf('nass_fans') === 0;
    const isBundlesDescriptionTemplate = templateSuffix === 'mega_twerk_with_bundles' || templateSuffix === 'mega_twerk_with_bundleseo';
    const isHipsProgramDescriptionTemplate = templateSuffix === 'hips_a'
      || templateSuffix === 'hips_a_eu'
      || templateSuffix === 'hips_a_ab'
      || templateSuffix === 'hips_a_ceo'
      || templateSuffix === 'hips_ceo'
      || templateSuffix === 'hips_b'
      || templateSuffix === 'hips_c'
      || templateSuffix === 'hips-a'
      || templateSuffix === 'hips-a-ab'
      || templateSuffix === 'hips-a-ceo'
      || templateSuffix === 'hips-ceo'
      || templateSuffix === 'hips-b'
      || templateSuffix === 'hips-c';
    const isBootyProgramDescriptionTemplate = isNassFansFamilyTemplate
      || templateSuffix === 'nass-fans'
      || templateSuffix === 'nass-fans-eu'
      || templateSuffix === 'nass-fans-ab'
      || templateSuffix === 'nass_fans_ab_test'
      || templateSuffix === 'booty_builder'
      || templateSuffix === 'booty-builder'
      || templateSuffix === 'twerk_essential'
      || templateSuffix === 'twerk-essential'
      || templateSuffix === 'twerk-program-r1'
      || templateSuffix === 'twerk_program_r1';
    const isHipsSingleProgramTemplate = templateSuffix === 'hips_a'
      || templateSuffix === 'hips_a_eu'
      || templateSuffix === 'hips_a_ceo'
      || templateSuffix === 'hips_b'
      || templateSuffix === 'hips_c'
      || templateSuffix === 'hips-a'
      || templateSuffix === 'hips-a-ceo'
      || templateSuffix === 'hips-b'
      || templateSuffix === 'hips-c';
    const isSingleProgramSelectionTemplate = isBundlesDescriptionTemplate || isHipsSingleProgramTemplate;
    const isHipsBootyBuilderAutoAddTemplate = templateSuffix === 'hips_a'
      || templateSuffix === 'hips_a_eu'
      || templateSuffix === 'hips_a_ceo'
      || templateSuffix === 'hips_b'
      || templateSuffix === 'hips_c'
      || templateSuffix === 'hips-a'
      || templateSuffix === 'hips-a-ceo'
      || templateSuffix === 'hips-b'
      || templateSuffix === 'hips-c';
    const isBootyBuilderRuleTemplate = templateSuffix === 'nass-fans'
      || templateSuffix === 'twerk_essential'
      || templateSuffix === 'booty_builder'
      || templateSuffix === 'booty-builder';
    const isBodyTransformationTemplate = templateSuffix === 'body_transformation';
    const skipProgramsStepOnOpen = templateSuffix === 'twerk_essential' || templateSuffix === 'twerk-essential';
    const isVipPackTwoFreeItemsTemplate = templateSuffix === 'nass-fans-ab'
      || templateSuffix === 'nass_fans_ab';
    const isTwerkProgramR1Template = templateSuffix === 'twerk-program-r1'
      || templateSuffix === 'twerk_program_r1';
    const allowBootyBuilderRuleMode = true;
    const bodyClassName = (typeof document !== 'undefined' && document.body && document.body.className)
      ? String(document.body.className).toLowerCase()
      : '';
    const bodyHasHipsNoPreselectClass = (
      bodyClassName.indexOf('product--hips_a') >= 0
      || bodyClassName.indexOf('product--hips-a') >= 0
      || bodyClassName.indexOf('product--hips_ab') >= 0
      || bodyClassName.indexOf('product--hips-ab') >= 0
      || bodyClassName.indexOf('product--hips_b') >= 0
      || bodyClassName.indexOf('product--hips-b') >= 0
      || bodyClassName.indexOf('product--hips_c') >= 0
      || bodyClassName.indexOf('product--hips-c') >= 0
    );
    const suffixStartsWithHipsA = templateSuffix.indexOf('hips_a') === 0 || templateSuffix.indexOf('hips-a') === 0;
    const disableProgramsPreselect = suffixStartsWithHipsA
      || templateSuffix === 'hips_ab'
      || templateSuffix === 'hips-ab'
      || templateSuffix === 'hips_b'
      || templateSuffix === 'hips-b'
      || templateSuffix === 'hips_c'
      || templateSuffix === 'hips-c'
      || bodyHasHipsNoPreselectClass;
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
    var EXTRA_STEP_FREE_ITEMS_LIMIT = 1;
    var stepsFromConfig = configSteps.map(function(s) {
      return {
        id: String(s.id),
        stepType: String(s.stepType || ''),
        title: s.title || 'Step',
        collectionHandle: (s.collectionHandle || '').trim(),
        isProgramsStep: !!s.isProgramsStep,
        isExtraStep: !!s.isExtraStep,
        productIds: []
      };
    });
    if (stepsFromConfig.length === 0) {
      stepsFromConfig = [
        { id: 'programs', stepType: 'bundle_step', title: 'Select programs', collectionHandle: 'courses', isProgramsStep: true, isExtraStep: false, productIds: [] },
        { id: 'shorts', stepType: 'bundle_step', title: 'Choose lounge shorts', collectionHandle: 'shorts', isProgramsStep: false, isExtraStep: false, productIds: [] },
        { id: 'leggings', stepType: 'bundle_step', title: 'Add sport shorts', collectionHandle: 'leggings', isProgramsStep: false, isExtraStep: false, productIds: [] },
        { id: 'swimshorts', stepType: 'bundle_step', title: 'Add swim shorts', collectionHandle: 'shorts', isProgramsStep: false, isExtraStep: false, productIds: [] },
        { id: 'tops', stepType: 'bundle_step', title: 'Select top', collectionHandle: 'bodywear', isProgramsStep: false, isExtraStep: false, productIds: [] },
        { id: 'review', stepType: 'review', title: 'Review your bundle', collectionHandle: '', isProgramsStep: false, isExtraStep: false, productIds: [] },
      ];
    }
    var programPackIds = [];
    if (Array.isArray(config.programPackProductIds)) {
      config.programPackProductIds.forEach(function(id) {
        if (id != null && String(id).trim() !== '') programPackIds.push(String(id).trim());
      });
    }
    if (config.programPackProductId != null && String(config.programPackProductId).trim() !== '') {
      programPackIds.push(String(config.programPackProductId).trim());
    }
    programPackIds = programPackIds.filter(function(id, index, arr) {
      return arr.indexOf(id) === index;
    });
    var configuredProgramPackHandles = programPackIds
      .map(function(id) {
        var raw = String(id || '').trim().toLowerCase();
        if (!raw) return '';
        if (raw.indexOf('gid://') === 0) return '';
        if (/^\d+$/.test(raw)) return '';
        return raw;
      })
      .filter(function(v, i, a) { return !!v && a.indexOf(v) === i; });
    var allowedExtraStepProgramHandles = ['vip-bundle', 'all-in-one-bundle'];
    var extraStepIds = Array.isArray(config.extraStepIds)
      ? config.extraStepIds.map(function(id) { return String(id); })
      : [];
    var extraStepIdMap = {};
    extraStepIds.forEach(function(id) { extraStepIdMap[String(id)] = true; });
    var programPackNumIds = programPackIds
      .map(function(id) {
        var num = toNumericId(gidToNum(id) || id);
        return num ? String(num) : '';
      })
      .filter(function(id) { return !!id; });
    var resolvedProgramPackNumIds = programPackNumIds.slice();
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
    var hasCheckoutIntent = false;

    function ensureKlaviyoRuntime() {
      try {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        window._learnq = window._learnq || [];
        if (window.klaviyo && typeof window.klaviyo.track === 'function') return;
        if (!klaviyoCompanyId) return;
        if (document.querySelector('script[data-bb-klaviyo-loader="1"]')) return;
        var script = document.createElement('script');
        script.async = true;
        script.src = 'https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=' + encodeURIComponent(klaviyoCompanyId);
        script.setAttribute('data-bb-klaviyo-loader', '1');
        document.head.appendChild(script);
      } catch (e) {}
    }

    ensureKlaviyoRuntime();

    function isValidEmail(email) {
      if (!email || typeof email !== 'string') return false;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    }

    function readEmailFromLearnqQueue() {
      try {
        var q = (typeof window !== 'undefined' && Array.isArray(window._learnq)) ? window._learnq : null;
        if (!q || !q.length) return '';
        for (var i = q.length - 1; i >= 0; i--) {
          var row = q[i];
          if (!Array.isArray(row) || row[0] !== 'identify') continue;
          var payload = row[1] && typeof row[1] === 'object' ? row[1] : null;
          if (!payload) continue;
          var candidate = payload.$email || payload.email || '';
          if (isValidEmail(candidate)) return String(candidate).trim();
        }
      } catch (e) {}
      return '';
    }

    function resolveVisitorEmail() {
      if (isValidEmail(knownCustomerEmail)) return knownCustomerEmail.trim();
      try {
        var input = document.querySelector('input[type="email"], input[name="email"], input[name="contact[email]"]');
        if (input && isValidEmail(input.value)) return String(input.value).trim();
      } catch (e) {}
      var fromLearnq = readEmailFromLearnqQueue();
      if (isValidEmail(fromLearnq)) return fromLearnq;
      return '';
    }

    function getAbandonMetricContext() {
      var currency = getDisplayCurrency();
      var total = 0;
      if (bbState.selectedItems && bbState.selectedItems.length > 0) {
        total = getSummaryTotals(currency).total || 0;
      } else if (bbState.cartData && bbState.cartData.item_count > 0) {
        currency = bbState.cartData.currency || currency;
        total = (bbState.cartData.total_price || 0) / 100;
      }

      var items = (bbState.selectedItems || []).map(function(item) {
        var product = bbState.productsById[item.productId] || null;
        var variants = (product && product.variants && product.variants.nodes) || [];
        var variant = variants.find(function(v) { return String(v.id) === String(item.variantId); }) || variants[0] || null;
        var step = (bbState.steps || []).find(function(s) { return String(s.id) === String(item.stepId); }) || null;
        return {
          step_id: item.stepId || '',
          step_title: step && step.title ? step.title : '',
          product_id: item.productId || '',
          product_title: product && product.title ? product.title : '',
          variant_id: item.variantId || '',
          variant_title: variant && variant.title ? variant.title : '',
          quantity: item.quantity || 1
        };
      });

      return {
        total: Number(total) || 0,
        currency: currency || '',
        items: items,
        page_url: (typeof window !== 'undefined' && window.location && window.location.href) ? window.location.href : ''
      };
    }

    function trackBundleBuilderClosedWithoutPurchase(reason) {
      try {
        if (hasCheckoutIntent) return;
        if (typeof window === 'undefined') return;
        var email = resolveVisitorEmail();
        if (!email) return;
        var metricContext = getAbandonMetricContext();
        var payload = {
          Email: email,
          email: email,
          close_reason: reason || 'closed',
          page_url: metricContext.page_url,
          items: metricContext.items,
          currency: metricContext.currency,
          Value: metricContext.total,
          value: metricContext.total,
          $value: metricContext.total
        };
        window._learnq = window._learnq || [];
        if (Array.isArray(window._learnq)) {
          window._learnq.push(['identify', { $email: email, email: email }]);
          window._learnq.push(['track', 'Bundle Builder Closed Without Purchase', payload]);
        }
        // In some storefront setups klaviyo.track can remain pending forever.
        // Keep it as best-effort secondary path without relying on its completion.
        if (window.klaviyo && typeof window.klaviyo.track === 'function') {
          try { window.klaviyo.track('Bundle Builder Closed Without Purchase', payload); } catch (_) {}
        }
      } catch (e) {}
    }

    // Resolve display currency with priority:
    // 1) Shopify Markets presentment currency from Liquid (localization.country.currency.iso_code)
    // 2) Shopify native multi-currency (Shopify.currency.active)
    // 3) Config-provided currency from Liquid (cart.currency / shop.currency)
    // 4) Fallback to shop base currency
    var presentmentCurrency = (config && typeof config.presentmentCurrency === 'string' && config.presentmentCurrency.trim())
      ? String(config.presentmentCurrency).trim()
      : '';
    var presentmentCountry = (config && typeof config.presentmentCountry === 'string' && config.presentmentCountry.trim())
      ? String(config.presentmentCountry).trim().toUpperCase()
      : '';
    var displayCurrency = presentmentCurrency
      ? presentmentCurrency
      : ((config && typeof config.currency === 'string' && config.currency.trim()) ? String(config.currency).trim() : 'USD');
    var shopBaseCurrency = (config && typeof config.shopCurrency === 'string' && config.shopCurrency.trim())
      ? String(config.shopCurrency).trim()
      : 'USD';
    var isEuProductTemplate = templateSuffix.indexOf('-eu') !== -1
      || templateSuffix.indexOf('_eu') !== -1
      || templateSuffix === 'mega_retarget_eu';
    // Only EU product templates should use Markets fixed pricing — not every /en-pl/ visit.
    var isMarketPresentmentPage = isEuProductTemplate;
    var useStorefrontMarketPricing = !!(storefrontApiToken && isMarketPresentmentPage);
    var productsJsonFallbackCurrency = isLocalizedRoute
      ? (presentmentCurrency || shopBaseCurrency || 'USD')
      : (shopBaseCurrency || 'USD');

    // On Markets presentment pages, keep Liquid-declared currency authoritative.
    var lockCurrencyToConfig = isMarketPresentmentPage;

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

        // On Markets pages, do not override presentment currency with the header picker.
        if (!lockCurrencyToConfig && window.Shopify && window.Shopify.currency && window.Shopify.currency.active) {
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
      allowStep2AutoAdd: !skipProgramsStepOnOpen,
      forceOfferStep2AutoAdd: false,
      offerFlow: '',
    };

    function buildStepMap(steps) {
      var map = {};
      (steps || []).forEach(function(step) {
        if (!step || !step.id) return;
        map[String(step.id)] = {
          id: String(step.id),
          stepType: String(step.stepType || ''),
          title: step.title || 'Step',
          collectionHandle: (step.collectionHandle || '').trim(),
          isProgramsStep: !!step.isProgramsStep,
          isExtraStep: !!step.isExtraStep,
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
              stepType: String(step.stepType || ''),
              title: step.title || '',
              collectionHandle: (step.collectionHandle || '').trim(),
              isProgramsStep: !!step.isProgramsStep,
              isExtraStep: !!step.isExtraStep
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
            stepType: String(step.stepType || ''),
            title: step.title,
            collectionHandle: step.collectionHandle,
            isProgramsStep: !!step.isProgramsStep,
            isExtraStep: !!step.isExtraStep,
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
            stepType: String(existing.stepType || ''),
            title: existing.title,
            collectionHandle: existing.collectionHandle,
            isProgramsStep: !!existing.isProgramsStep,
            isExtraStep: !!existing.isExtraStep,
            productIds: []
          });
        } else {
          resolved.push({
            id: normalizedId,
            stepType: String(overrideStep.stepType || ''),
            title: overrideStep.title || 'Step',
            collectionHandle: (overrideStep.collectionHandle || '').trim(),
            isProgramsStep: !!overrideStep.isProgramsStep,
            isExtraStep: !!overrideStep.isExtraStep,
            productIds: []
          });
        }
      });

      var reviewStep = stepMap.review || {
        id: 'review',
        stepType: 'review',
        title: 'Review your bundle',
        collectionHandle: '',
        isProgramsStep: false,
        isExtraStep: false,
        productIds: []
      };

      resolved.push({
        id: 'review',
        stepType: 'review',
        title: reviewStep.title || 'Review your bundle',
        collectionHandle: '',
        isProgramsStep: false,
        isExtraStep: false,
        productIds: []
      });

      return resolved;
    }

    function isProgramPack(productId) {
      if (!productId || !resolvedProgramPackNumIds.length) return false;
      var a = toNumericId(gidToNum(String(productId)) || String(productId));
      return !!a && resolvedProgramPackNumIds.indexOf(String(a)) >= 0;
    }

    function isExtraStep(stepId) {
      return !!extraStepIdMap[String(stepId)];
    }

    function isVipPackFreeEligibleStep(stepId) {
      var step = bbState.steps.find(function(s) { return String(s.id) === String(stepId); });
      if (!step || step.isProgramsStep || step.id === 'review') return false;
      if (stepIsWorkoutEquipment(stepId)) return false;
      if (isVipPackTwoFreeItemsTemplate) return true;
      return isExtraStep(stepId);
    }

    function getVipPackFreeItemsLimit() {
      return isVipPackTwoFreeItemsTemplate ? 2 : EXTRA_STEP_FREE_ITEMS_LIMIT;
    }

    function hasSelectedProgramPackInProgramsStep() {
      var programsStep = bbState.steps.find(function(s) { return s && s.isProgramsStep; });
      if (!programsStep) return false;
      var selectedProgramItem = bbState.selectedItems.find(function(item) {
        return String(item.stepId) === String(programsStep.id);
      });
      if (!selectedProgramItem) return false;
      if (isProgramPack(selectedProgramItem.productId)) return true;
      var selectedProduct = bbState.productsById[selectedProgramItem.productId];
      if (!selectedProduct) return false;
      var handle = String(selectedProduct.handle || '').toLowerCase().trim();
      if (!handle) return false;
      return allowedExtraStepProgramHandles.indexOf(handle) !== -1;
    }

    function shouldShowStep(step) {
      if (!step) return false;
      if (!isExtraStep(step.id)) return true;
      return hasSelectedProgramPackInProgramsStep();
    }

    function getVisibleStepIndexes() {
      var indexes = [];
      bbState.steps.forEach(function(step, idx) {
        if (shouldShowStep(step)) indexes.push(idx);
      });
      return indexes;
    }

    function getVisibleStepPosition(index) {
      var visibleIndexes = getVisibleStepIndexes();
      return visibleIndexes.indexOf(index);
    }

    function getNextVisibleStepIndex(index) {
      var visibleIndexes = getVisibleStepIndexes();
      for (var i = 0; i < visibleIndexes.length; i++) {
        if (visibleIndexes[i] > index) return visibleIndexes[i];
      }
      return -1;
    }

    function getPrevVisibleStepIndex(index) {
      var visibleIndexes = getVisibleStepIndexes();
      for (var i = visibleIndexes.length - 1; i >= 0; i--) {
        if (visibleIndexes[i] < index) return visibleIndexes[i];
      }
      return -1;
    }

    function getFirstVisibleStepIndex() {
      var visibleIndexes = getVisibleStepIndexes();
      return visibleIndexes.length ? visibleIndexes[0] : -1;
    }

    function getSelectedItemsByStep(stepId) {
      return bbState.selectedItems.filter(function(item) {
        return String(item.stepId) === String(stepId);
      });
    }

    function getVipPackFreeProductIds() {
      var freeIds = {};
      if (!hasSelectedProgramPackInProgramsStep()) return freeIds;
      var freeLimit = getVipPackFreeItemsLimit();
      var freeCount = 0;
      bbState.selectedItems.forEach(function(item) {
        if (!isVipPackFreeEligibleStep(item.stepId)) return;
        if (freeCount >= freeLimit) return;
        freeIds[String(item.productId)] = true;
        freeCount += 1;
      });
      return freeIds;
    }

    function hasVipPackFreeSlotAvailable() {
      if (!hasSelectedProgramPackInProgramsStep()) return false;
      return Object.keys(getVipPackFreeProductIds()).length < getVipPackFreeItemsLimit();
    }

    function cleanupExtraStepItemsIfPackMissing() {
      if (hasSelectedProgramPackInProgramsStep()) return Promise.resolve();
      var freeStepProductIds = bbState.selectedItems
        .filter(function(item) { return isVipPackFreeEligibleStep(item.stepId); })
        .map(function(item) { return String(item.productId); });
      if (!freeStepProductIds.length) return Promise.resolve();
      return removeItemsByProductIds(freeStepProductIds);
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

    function normalizeBbProductId(id) {
      return String(toNumericId(gidToNum(String(id)) || String(id)) || String(id));
    }

    function getProgramsStepForBodyTf() {
      return bbState.steps.find(function(s) { return s && s.isProgramsStep; }) || null;
    }

    function getStepImmediatelyAfterPrograms() {
      var steps = bbState.steps || [];
      for (var i = 0; i < steps.length; i++) {
        if (steps[i] && steps[i].isProgramsStep) {
          var next = steps[i + 1];
          if (next && next.id !== 'review') return next;
          return null;
        }
      }
      return null;
    }

    function isSelectedProgramFirstInProgramsCollection() {
      if (!isBodyTransformationTemplate) return false;
      var ps = getProgramsStepForBodyTf();
      if (!ps || !Array.isArray(ps.productIds) || !ps.productIds.length) return false;
      var firstPid = ps.productIds[0];
      var firstNorm = normalizeBbProductId(firstPid);
      if (!firstNorm) return false;
      var selected = bbState.selectedItems.find(function(item) {
        return String(item.stepId) === String(ps.id);
      });
      if (!selected) return false;
      return normalizeBbProductId(selected.productId) === firstNorm;
    }

    function isBodyTransformationPromoSecondStep(stepId) {
      if (!isBodyTransformationTemplate) return false;
      var after = getStepImmediatelyAfterPrograms();
      if (!after || String(after.id) !== String(stepId)) return false;
      return isSelectedProgramFirstInProgramsCollection();
    }

    function countSelectedLinesOnStep(stepId) {
      return bbState.selectedItems.filter(function(item) {
        return String(item.stepId) === String(stepId);
      }).length;
    }

    function isBodyTransformationStep2ShowZeroOnProductCards(stepId) {
      if (!isBodyTransformationPromoSecondStep(stepId)) return false;
      return countSelectedLinesOnStep(stepId) === 0;
    }

    function isBodyTransformationFreeBundleLineForSecondStep(item) {
      if (!isSelectedProgramFirstInProgramsCollection()) return false;
      var after = getStepImmediatelyAfterPrograms();
      if (!after || String(item.stepId) !== String(after.id)) return false;
      var firstIdx = bbState.selectedItems.findIndex(function(i) {
        return String(i.stepId) === String(after.id);
      });
      if (firstIdx < 0) return false;
      return bbState.selectedItems.indexOf(item) === firstIdx;
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

    function isTwerkEssentialKitProduct(title, handle) {
      if (handle.indexOf('twerk program') !== -1) return false;
      if (title.indexOf('twerk program') !== -1 && title.indexOf('kit') === -1) return false;
      return (
        title.indexOf('twerk essential kit') !== -1
        || title.indexOf('twerk essential bundle') !== -1
        || (
          handle.indexOf('twerk essential') !== -1
          && handle.indexOf('kit') !== -1
        )
        || handle === 'twerk essential'
      );
    }

    function isBootyBuilderBundleProduct(title, handle) {
      return (
        title.indexOf('booty builder bundle') !== -1
        || (
          title.indexOf('booty builder') !== -1
          && (title.indexOf('bundle') !== -1 || title.indexOf('pack') !== -1)
        )
        || handle.indexOf('booty-builder-bundle') !== -1
        || (
          handle.indexOf('booty-builder') !== -1
          && (handle.indexOf('bundle') !== -1 || handle.indexOf('pack') !== -1)
        )
      );
    }

    function resolveBundleRuleModeFromProduct(title, handle) {
      if (
        title.indexOf('vip bundle') !== -1
        || title.indexOf('all in one bundle') !== -1
        || title.indexOf('all-in-one bundle') !== -1
        || handle.indexOf('vip-bundle') !== -1
        || handle.indexOf('all-in-one-bundle') !== -1
        || isTwerkEssentialKitProduct(title, handle)
      ) {
        return 'vip_or_essential';
      }
      if (allowBootyBuilderRuleMode && isBootyBuilderBundleProduct(title, handle)) {
        return 'booty_builder';
      }
      return '';
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
      return resolveBundleRuleModeFromProduct(
        normalizeForMatch(selectedProduct.title),
        normalizeForMatch(selectedProduct.handle)
      );
    }

    function getBundleRuleModeByProductId(productId) {
      var p = bbState.productsById[productId];
      if (!p) return '';
      return resolveBundleRuleModeFromProduct(
        normalizeForMatch(p.title),
        normalizeForMatch(p.handle)
      );
    }

    function isTwerkEssentialBundleOfferFlow() {
      return skipProgramsStepOnOpen && bbState.offerFlow === 'bundle';
    }

    function getEquipmentBundleRuleMode() {
      if (skipProgramsStepOnOpen && bbState.offerFlow !== 'bundle') return '';
      return getSelectedBundleRuleMode();
    }

    function getTwerkEssentialFreeClothingStepIds() {
      if (!isTwerkEssentialBundleOfferFlow()) return [];
      if (getSelectedBundleRuleMode() !== 'vip_or_essential') return [];
      var equipmentIdx = -1;
      bbState.steps.forEach(function(step, index) {
        if (step && stepIsWorkoutEquipment(step.id)) equipmentIdx = index;
      });
      if (equipmentIdx < 0) return [];
      var freeStepIds = [];
      for (var offset = 1; offset <= 3; offset++) {
        var step = bbState.steps[equipmentIdx + offset];
        if (!step || step.id === 'review' || step.isProgramsStep || stepIsWorkoutEquipment(step.id)) continue;
        freeStepIds.push(String(step.id));
      }
      return freeStepIds;
    }

    function isTwerkEssentialFreeClothingStep(stepId) {
      return getTwerkEssentialFreeClothingStepIds().indexOf(String(stepId)) >= 0;
    }

    function getTwerkEssentialFreeClothingProductIds() {
      var freeIds = {};
      if (!isTwerkEssentialBundleOfferFlow()) return freeIds;
      var freeStepIds = getTwerkEssentialFreeClothingStepIds();
      if (!freeStepIds.length) return freeIds;
      var freeCount = 0;
      bbState.selectedItems.forEach(function(item) {
        if (freeStepIds.indexOf(String(item.stepId)) === -1) return;
        if (freeCount >= 1) return;
        freeIds[String(item.productId)] = true;
        freeCount += 1;
      });
      return freeIds;
    }

    function hasTwerkEssentialFreeClothingSlotAvailable() {
      return Object.keys(getTwerkEssentialFreeClothingProductIds()).length < 1;
    }

    function isRuleTriggerBundleProduct(productId) {
      return !!getBundleRuleModeByProductId(productId);
    }

    function getRuleTargetByProductForMode(stepId, product, mode) {
      if (!stepIsWorkoutEquipment(stepId) || !product) return null;
      if (!mode) return null;
      var title = normalizeForMatch(product.title);
      var handle = normalizeForMatch(product.handle);
      var isBootyBandSet = (
        title.indexOf('booty band set') !== -1
        || title.indexOf('booty bands set') !== -1
        || title.indexOf('booty band') !== -1
        || title.indexOf('booty bands') !== -1
        || title.indexOf('resistance band set') !== -1
        || title.indexOf('band set') !== -1
        || (title.indexOf('booty') !== -1 && title.indexOf('band') !== -1)
        || handle.indexOf('booty band set') !== -1
        || handle.indexOf('booty-band-set') !== -1
        || handle.indexOf('booty-bands-set') !== -1
        || handle.indexOf('booty-band') !== -1
        || handle.indexOf('booty-bands') !== -1
        || handle.indexOf('resistance-band-set') !== -1
        || (handle.indexOf('booty') !== -1 && handle.indexOf('band') !== -1)
      );
      if (isBootyBandSet && mode === 'vip_or_essential') return { free: true, mode: mode, type: 'booty_band' };
      var isKneePads = title.indexOf('knee pads') !== -1 || title.indexOf('knee pad') !== -1 || handle.indexOf('knee pads') !== -1 || handle.indexOf('knee-pads') !== -1 || handle.indexOf('knee-pad') !== -1;
      if (isKneePads && mode === 'vip_or_essential' && skipProgramsStepOnOpen) {
        return { free: true, mode: mode, type: 'knee_pads' };
      }
      return null;
    }

    function getRuleTargetByProduct(stepId, product) {
      var mode = stepIsWorkoutEquipment(stepId) ? getEquipmentBundleRuleMode() : getSelectedBundleRuleMode();
      return getRuleTargetByProductForMode(stepId, product, mode);
    }

    function applyWorkoutEquipmentAutoAdd(step) {
      if (!step || !step.id || !stepIsWorkoutEquipment(step.id)) return;
      if (skipProgramsStepOnOpen && !bbState.allowStep2AutoAdd) return;
      var mode = getSelectedBundleRuleMode();
      if (mode !== 'vip_or_essential' || !Array.isArray(step.productIds) || !step.productIds.length) return;
      if (bbState.cartOperationInProgress) {
        setTimeout(function() {
          if (!bbState.isOpen) return;
          var activeStep = bbState.steps[bbState.currentStepIndex];
          if (!activeStep || String(activeStep.id) !== String(step.id)) return;
          applyWorkoutEquipmentAutoAdd(activeStep);
        }, 180);
        return;
      }
      var kneePadsProductId = null;
      var bootyBandProductId = null;
      step.productIds.forEach(function(pid) {
        var rule = getRuleTargetByProduct(step.id, bbState.productsById[pid]);
        if (!rule) return;
        if (rule.type === 'knee_pads' && !kneePadsProductId) kneePadsProductId = pid;
        if (rule.type === 'booty_band' && !bootyBandProductId) bootyBandProductId = pid;
      });
      var autoAddProductId = null;
      if (isTwerkEssentialBundleOfferFlow() && mode === 'vip_or_essential' && kneePadsProductId) {
        autoAddProductId = kneePadsProductId;
      } else if (bootyBandProductId) {
        autoAddProductId = bootyBandProductId;
      }
      if (!autoAddProductId || isSelected(autoAddProductId) || bbState.cartOperationInProgress) return;
      addItem(step.id, autoAddProductId, null, 1, { autoAddedByRule: true });
    }

    function getAllowedAutoAddedEquipmentProductIds() {
      var allowed = {};
      var mode = getEquipmentBundleRuleMode();
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
      renderProgressBar();
      renderStep();
      renderDiscountBanner();
      renderFooterSummary();
      var chain = Promise.resolve();
      itemsToRemove.forEach(function(item) {
        chain = chain.then(function() {
          var variantNum = String(item.variantId).replace(/.*\/(\d+)$/, '$1') || item.variantId;
          function changeRemove(idValue) {
            return fetch(cartUrls.change, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: idValue, quantity: 0 })
            }).then(function(r) { return r.json(); });
          }
          return changeRemove(item.lineKey || String(variantNum))
            .then(function(data) {
              var isBadRequest = data && (data.status === 422 || data.status === 400 || (data.status && String(data.status).indexOf('bad_request') >= 0));
              if (isBadRequest && item.lineKey) {
                return changeRemove(String(variantNum));
              }
              return data;
            })
            .then(function(data) {
              var failed = data && (data.status === 422 || data.status === 400 || (data.status && String(data.status).indexOf('bad_request') >= 0));
              if (failed) return Promise.reject(new Error('remove_failed'));
              return data;
            });
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

    function kneePadsRequiresSizeSelection(product) {
      var variants = (product && product.variants && product.variants.nodes) || [];
      if (variants.length <= 1) return false;
      var selectableSizeCount = 0;
      variants.forEach(function(v) {
        (v.selectedOptions || []).forEach(function(o) {
          if (String((o && o.name) || '').toLowerCase() !== 'size') return;
          var val = String((o && o.value) || '').trim().toLowerCase();
          if (val && val !== 'default title') selectableSizeCount += 1;
        });
      });
      return selectableSizeCount > 1;
    }

    function hasRequiredKneePadsSelectionForVipEssential(step) {
      return true;
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
      var selectedProgramsItem = bbState.selectedItems.find(function(item) {
        return String(item.stepId) === String(step.id);
      });
      if (selectedProgramsItem && String(selectedProgramsItem.productId) !== String(productId)) return true;
      if (isSingleProgramSelectionTemplate) {
        if (selectedProgramsItem && String(selectedProgramsItem.productId) !== String(productId)) return true;
      }
      if (!resolvedProgramPackNumIds.length) return false;
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

    function getStorefrontCountryCode() {
      if (presentmentCountry) return presentmentCountry;
      return 'US';
    }

    function getActiveCurrency() {
      if (lockCurrencyToConfig && presentmentCurrency) return presentmentCurrency;
      try {
        if (typeof window !== 'undefined' && window.Shopify && window.Shopify.currency && window.Shopify.currency.active) {
          var active = String(window.Shopify.currency.active).trim();
          if (active) return active;
        }
      } catch (e) {}
      if (presentmentCurrency) return presentmentCurrency;
      return displayCurrency;
    }

    function shouldConvertBaseToActive(source, target) {
      if (!source || !target || source === target) return false;
      if (lockCurrencyToConfig || useStorefrontMarketPricing) return false;
      return source === shopBaseCurrency && target !== shopBaseCurrency;
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
      if (useStorefrontMarketPricing && presentmentCurrency) return presentmentCurrency;
      return productsJsonFallbackCurrency;
    }

    function formatMoney(amount, currency, sourceCurrency) {
      var target = (currency || getDisplayCurrency() || 'USD');
      var source = (sourceCurrency || shopBaseCurrency || 'USD');
      var value = Number(amount || 0);

      if (shouldConvertBaseToActive(source, target)) {
        value = value * getShopifyRate();
      }

      return new Intl.NumberFormat('en-US', { style: 'currency', currency: target || 'USD' }).format(value);
    }

    function convertMoneyAmount(amount, targetCurrency, sourceCurrency) {
      var target = (targetCurrency || getDisplayCurrency() || 'USD');
      var source = (sourceCurrency || shopBaseCurrency || 'USD');
      var value = Number(amount || 0);

      if (shouldConvertBaseToActive(source, target)) {
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
      if (lockCurrencyToConfig) return;
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
      renderProgressBar();
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
      renderProgressBar();
      renderStep();
      renderDiscountBanner();
      function changeCartRemoveById(idValue) {
        return fetch(cartUrls.change, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: idValue, quantity: 0 })
        }).then(function(r) { return r.json(); });
      }

      // Some cart line keys can become stale after cart recalculations;
      // retry removal by variant id before failing the action.
      changeCartRemoveById(lineKey || String(variantNum))
        .then(function(data) {
          var isBadRequest = data && (data.status === 422 || data.status === 400 || (data.status && String(data.status).indexOf('bad_request') >= 0));
          if (isBadRequest && lineKey) {
            return changeCartRemoveById(String(variantNum));
          }
          return data;
        })
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
              if (isProgramsStepRemoval || isRuleTriggerBundleRemoval) {
                return cleanupAutoAddedEquipmentItems().then(function() {
                  return cleanupExtraStepItemsIfPackMissing();
                });
              }
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
      imageViewerState = { productId: null, imageIndex: 0 };
      imageViewerImgEl.src = '';
      imageViewerImgEl.alt = '';
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
      var step = bbState.steps.find(function(s) { return String(s.id) === String(stepId); });
      if (!step || !step.isProgramsStep) return false;
      return isBundlesDescriptionTemplate
        || isHipsProgramDescriptionTemplate
        || isBootyProgramDescriptionTemplate;
    }

    function getStorefrontFetchOrigin() {
      try {
        if (typeof window !== 'undefined' && window.location && window.location.hostname) {
          var host = String(window.location.hostname).toLowerCase();
          if (host && host !== 'localhost' && host !== '127.0.0.1') {
            return window.location.protocol + '//' + window.location.hostname;
          }
        }
      } catch (e) {}
      return 'https://' + shopDomain;
    }

    function shouldUseLocalizedProductJsonPath() {
      if (!isLocalizedRoute || !routesRoot || routesRoot === '/') return false;
      // Shopify permanent_domain does not serve /en-pl/... routes; only the public storefront domain does.
      return getStorefrontFetchOrigin().indexOf('.myshopify.com') === -1;
    }

    function getLocalizedStorefrontPath(path) {
      var normalizedPath = String(path || '').replace(/^\//, '');
      if (!shouldUseLocalizedProductJsonPath()) {
        return '/' + normalizedPath;
      }
      var prefix = String(routesRoot).replace(/\/$/, '');
      return prefix + '/' + normalizedPath;
    }

    function mergeVariantPricing(baseVariants, sfVariants) {
      var baseNodes = (baseVariants && baseVariants.nodes) || [];
      var sfNodes = (sfVariants && sfVariants.nodes) || [];
      if (!sfNodes.length) return baseVariants;
      var sfById = {};
      sfNodes.forEach(function(v) { sfById[String(v.id)] = v; });
      return {
        nodes: baseNodes.map(function(v) {
          var sf = sfById[String(v.id)];
          if (!sf) return v;
          return Object.assign({}, v, {
            price: sf.price || v.price,
            availableForSale: sf.availableForSale !== false
          });
        })
      };
    }

    function overlayStorefrontPricing(baseProduct, sfProduct) {
      if (!baseProduct) return sfProduct || null;
      if (!sfProduct) return baseProduct;
      return Object.assign({}, baseProduct, {
        priceRange: sfProduct.priceRange || baseProduct.priceRange,
        compareAtPriceRange: sfProduct.compareAtPriceRange || baseProduct.compareAtPriceRange,
        variants: mergeVariantPricing(baseProduct.variants, sfProduct.variants),
        descriptionHtml: sfProduct.descriptionHtml || baseProduct.descriptionHtml,
        availableForSale: sfProduct.availableForSale !== false ? sfProduct.availableForSale : baseProduct.availableForSale
      });
    }

    function findStorefrontProductMatch(sfMap, baseProduct) {
      if (!baseProduct || !sfMap) return null;
      var direct = sfMap[baseProduct.id] || sfMap[String(baseProduct.id)];
      if (direct) return direct;
      var baseHandle = String(baseProduct.handle || '').toLowerCase();
      if (!baseHandle) return null;
      var keys = Object.keys(sfMap);
      for (var i = 0; i < keys.length; i++) {
        var candidate = sfMap[keys[i]];
        if (candidate && String(candidate.handle || '').toLowerCase() === baseHandle) return candidate;
      }
      return null;
    }

    function mergeCollectionProductPacks(jsonPack, sfPack) {
      jsonPack = jsonPack || { map: {}, orderedIds: [] };
      sfPack = sfPack || { map: {}, orderedIds: [] };
      var map = {};
      var orderedIds = (jsonPack.orderedIds && jsonPack.orderedIds.length)
        ? jsonPack.orderedIds.slice()
        : Object.keys(jsonPack.map || {});
      orderedIds.forEach(function(id) {
        var base = jsonPack.map[id];
        if (!base) return;
        var sf = findStorefrontProductMatch(sfPack.map, base);
        map[id] = overlayStorefrontPricing(base, sf);
      });
      return { map: map, orderedIds: orderedIds };
    }

    function shouldOmitProductsJsonCurrencyParam(useLocalizedPath) {
      // Localized /en-pl/.../products.json already returns fixed Markets prices.
      // Adding ?currency=EUR forces Shopify exchange-rate conversion (e.g. 89 -> 87.95).
      return !!useLocalizedPath;
    }

    function fetchCollectionProductsJsonAtPath(handle, useLocalizedPath) {
      var selectedCurrency = getDisplayCurrency() || productsJsonFallbackCurrency || shopBaseCurrency || 'USD';
      var omitCurrencyParam = shouldOmitProductsJsonCurrencyParam(useLocalizedPath);
      var priceCurrency = omitCurrencyParam
        ? (presentmentCurrency || productsJsonFallbackCurrency || selectedCurrency || shopBaseCurrency || 'USD')
        : selectedCurrency;
      var collectionPath = useLocalizedPath
        ? getLocalizedStorefrontPath('collections/' + encodeURIComponent(handle) + '/products.json')
        : '/collections/' + encodeURIComponent(handle) + '/products.json';
      var url = getStorefrontFetchOrigin() + collectionPath + '?limit=50';
      if (!omitCurrencyParam) {
        url += '&currency=' + encodeURIComponent(selectedCurrency);
      }
      url += '&_bb_ts=' + Date.now();
      return fetch(url, { cache: 'no-store' })
        .then(function(r) {
          if (!r.ok) throw new Error('products.json ' + r.status);
          return r.json();
        })
        .then(function(data) {
          var map = {};
          var orderedIds = [];
          (data.products || []).forEach(function(raw) {
            // Localized products.json without ?currency= returns fixed Markets presentment amounts.
            var internal = productJsonToInternal(raw, priceCurrency);
            if (internal && internal.id) {
              map[internal.id] = internal;
              orderedIds.push(String(internal.id));
            }
          });
          return { map: map, orderedIds: orderedIds };
        })
        .catch(function() { return { map: {}, orderedIds: [] }; });
    }

    function fetchCollectionProductsJson(handle) {
      return fetchCollectionProductsJsonAtPath(handle, shouldUseLocalizedProductJsonPath());
    }

    function fetchCollectionProductsStorefront(handle, countryCode) {
      if (!storefrontApiToken) return Promise.resolve({ map: {}, orderedIds: [] });
      var url = 'https://' + shopDomain + '/api/2024-01/graphql.json';
      // Note: `@inContext` is a directive on the operation, not on the field.
      // `country` is a CountryCode enum (no quotes).
      var cc = (countryCode || '').trim() || 'US';
      var query = 'query($handle: String!) @inContext(country: ' + cc + '){collection(handle:$handle){products(first:50){edges{node{id title handle descriptionHtml tags images(first:10){edges{node{url altText}}}variants(first:20){edges{node{id title availableForSale price{amount currencyCode}compareAtPrice{amount currencyCode}selectedOptions{name value}}}}}}}}}';

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
          var orderedIds = [];
          edges.forEach(function(e) {
            var p = e && e.node;
            var internal = p ? storefrontProductToInternal(p) : null;
            if (internal && internal.id) {
              map[internal.id] = internal;
              orderedIds.push(String(internal.id));
            }
          });
          return { map: map, orderedIds: orderedIds };
        })
        .catch(function() { return { map: {}, orderedIds: [] }; });
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
        var variantCur = (v.price && v.price.currencyCode) ? String(v.price.currencyCode) : cur;
        return { id: String(gidToNum(v.id) || v.id), title: v.title || '', availableForSale: v.availableForSale !== false, price: { amount: String(v.price && v.price.amount || '0'), currencyCode: variantCur }, selectedOptions: o };
      }) : [];
      return {
        id: String(gidToNum(sf.id) || sf.id),
        title: sf.title || '',
        handle: sf.handle || '',
        descriptionHtml: sf.descriptionHtml || '',
        tags: Array.isArray(sf.tags) ? sf.tags : [],
        availableForSale: v0 ? v0.availableForSale !== false : true,
        priceRange: { minVariantPrice: { amount: price, currencyCode: cur } },
        compareAtPriceRange: { minVariantPrice: { amount: compareAt, currencyCode: cur } },
        images: { nodes: imgNodes },
        variants: { nodes: varNodes }
      };
    }

    function fetchCollectionProducts(handle) {
      if (!useStorefrontMarketPricing) {
        return fetchCollectionProductsJson(handle);
      }
      // Keep the full collection from products.json, but overlay fixed Markets prices from Storefront.
      return fetchCollectionProductsJson(handle).then(function(jsonPack) {
        var loadJsonPack = (!jsonPack.orderedIds || !jsonPack.orderedIds.length) && shouldUseLocalizedProductJsonPath()
          ? fetchCollectionProductsJsonAtPath(handle, false)
          : Promise.resolve(jsonPack);
        return loadJsonPack.then(function(resolvedJsonPack) {
          return fetchCollectionProductsStorefront(handle, getStorefrontCountryCode()).then(function(sfPack) {
            return mergeCollectionProductPacks(resolvedJsonPack, sfPack);
          });
        });
      });
    }

    function fetchProductByIdStorefront(productId) {
      if (!storefrontApiToken) return Promise.resolve(null);
      var gid = String(productId).indexOf('gid://') === 0 ? productId : 'gid://shopify/Product/' + String(productId);
      var url = 'https://' + shopDomain + '/api/2024-01/graphql.json';
      // Note: `@inContext` is a directive on the operation, not on the field.
      var cc = getStorefrontCountryCode();
      var query = 'query($id: ID!) @inContext(country: ' + cc + '){product(id:$id){id title handle descriptionHtml images(first:10){edges{node{url altText}}}variants(first:20){edges{node{id title availableForSale price{amount currencyCode}compareAtPrice{amount currencyCode}selectedOptions{name value}}}}}}';
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
        return fetchCollectionProducts(h);
      });
      return Promise.all(promises).then(function(results) {
        var byHandle = {};
        var orderedByHandle = {};
        unique.forEach(function(h, i) {
          var pack = results[i] || {};
          var m = pack.map != null ? pack.map : pack;
          byHandle[h] = m;
          var ord = pack.orderedIds;
          orderedByHandle[h] = (Array.isArray(ord) && ord.length) ? ord : Object.keys(m);
        });
        bbState.steps.forEach(function(step) {
          if (step.id === 'review' || !step.collectionHandle) return;
          var m = byHandle[step.collectionHandle] || {};
          var ordered = orderedByHandle[step.collectionHandle] || Object.keys(m);
          step.productIds = ordered.filter(function(pid) { return !!m[pid]; });
        });
        Object.keys(byHandle).forEach(function(h) {
          Object.assign(bbState.productsById, byHandle[h]);
        });
        var programsStep = bbState.steps.find(function(s) { return s.isProgramsStep; });
        if (programsStep) {
          if (!programsStep.productIds) programsStep.productIds = [];

          if (!resolvedProgramPackNumIds.length && programsStep.productIds.length > 0) {
            var bundleLike = programsStep.productIds.find(function(pid) {
              var p = bbState.productsById[pid];
              if (!p || !p.title) return false;
              var t = (p.title || '').toLowerCase();
              var h = (p.handle || '').toLowerCase();
              return (t.indexOf('bundle') >= 0 && (t.indexOf('4') >= 0 || t.indexOf('nass') >= 0 || t.indexOf('program') >= 0)) || h.indexOf('bundle') >= 0;
            });
            if (bundleLike) {
              var fallbackNum = toNumericId(gidToNum(String(bundleLike)) || String(bundleLike)) || '';
              if (fallbackNum) resolvedProgramPackNumIds = [String(fallbackNum)];
            }
          }

          if (resolvedProgramPackNumIds.length && storefrontApiToken) {
            var existingNumIds = Object.keys(bbState.productsById).map(function(k) {
              return String(toNumericId(gidToNum(k) || k) || '');
            });
            var idsToFetch = programPackIds.filter(function(id) {
              var num = String(toNumericId(gidToNum(id) || id) || '');
              return num && existingNumIds.indexOf(num) === -1;
            });
            if (idsToFetch.length) {
              return Promise.all(idsToFetch.map(function(id) {
                return fetchProductByIdStorefront(id);
              })).then(function(internals) {
                internals.forEach(function(internal) {
                  if (!internal || !internal.id) return;
                  var existing = bbState.productsById[internal.id];
                  bbState.productsById[internal.id] = existing
                    ? overlayStorefrontPricing(existing, internal)
                    : internal;
                  if (programsStep.productIds.indexOf(internal.id) === -1) {
                    // If configured pack product is absent from collection, append it.
                    programsStep.productIds.push(internal.id);
                  }
                });
              }).then(function() { return Promise.resolve(); });
            }
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
      } else if (isBodyTransformationStep2ShowZeroOnProductCards(stepId)) {
        orig = 0;
        final = 0;
        hasDiscount = false;
        compareAt = null;
      } else if (isVipPackFreeEligibleStep(stepId) && hasSelectedProgramPackInProgramsStep()) {
        var vipFreeIds = getVipPackFreeProductIds();
        var isVipPackFreeItem = !!vipFreeIds[String(productId)] || hasVipPackFreeSlotAvailable();
        if (isVipPackFreeItem) {
          orig = parseFloat(price);
          final = 0;
          hasDiscount = false;
          compareAt = null;
        }
      } else if (isTwerkEssentialFreeClothingStep(stepId)) {
        var twerkFreeIds = getTwerkEssentialFreeClothingProductIds();
        var isTwerkFreeItem = !!twerkFreeIds[String(productId)] || hasTwerkEssentialFreeClothingSlotAvailable();
        if (isTwerkFreeItem) {
          orig = parseFloat(price);
          final = 0;
          hasDiscount = false;
          compareAt = null;
        }
      }
      var sourceCur = getProductSourceCurrency(p);
      var cur = getDisplayCurrency();
      var img = (p.images && p.images.nodes && p.images.nodes[0]) ? getImageUrlOptimized(p.images.nodes[0].url) : '';
      var cardClass = 'bb-product-card' + (dis ? ' bb-product-card--disabled' : '');
      var busy = !!bbState.cartOperationInProgress;
      var spinnerSvg = '<span class="bb-spinner" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10" stroke-dasharray="32 56"/></svg></span>';
      var kneePadsNeedsSize = ruleTarget && ruleTarget.type === 'knee_pads' && kneePadsRequiresSizeSelection(p);
      var addBtnLabel = kneePadsNeedsSize ? 'Select your size' : ('Add for ' + formatMoney(final, cur, sourceCur));
      var addBtnContent = busy ? spinnerSvg + '<span class="bb-btn-text">Adding...</span>' : addBtnLabel;
      var removeBtnContent = busy ? spinnerSvg : '×';
      var btnHtml = dis
        ? '<button type="button" class="bb-product-btn bb-product-btn--disabled" disabled>Unavailable</button>'
        : sel
          ? '<button type="button" class="bb-product-btn bb-product-btn--added" disabled>Added</button><button type="button" class="bb-product-remove' + (busy ? ' bb-product-btn--loading' : '') + '" data-bb-remove="' + productId + '" aria-label="Remove"' + (busy ? ' disabled' : '') + '>' + removeBtnContent + '</button>'
          : '<button type="button" class="bb-product-btn bb-product-btn--add' + (busy ? ' bb-product-btn--loading' : '') + '"' + (busy ? ' disabled>' : ' data-bb-add data-step="' + stepId + '" data-product="' + productId + '"' + (kneePadsNeedsSize ? ' data-bb-knee-pads-size-btn="true"' : '') + '>') + addBtnContent + '</button>';
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
        var hasVipBundle = normalizedHandle.indexOf('vip') !== -1 && normalizedHandle.indexOf('bundle') !== -1;
        var hasBootyBuilderBundle = normalizedHandle.indexOf('booty') !== -1 && normalizedHandle.indexOf('builder') !== -1 && normalizedHandle.indexOf('bundle') !== -1;
        var hasHipOpenerBundle = normalizedHandle.indexOf('hip') !== -1 && normalizedHandle.indexOf('opener') !== -1 && normalizedHandle.indexOf('bundle') !== -1;
        var hasTwerkEssentialKit = normalizedHandle.indexOf('twerk') !== -1 && normalizedHandle.indexOf('essential') !== -1 && normalizedHandle.indexOf('kit') !== -1;
        var hasMegaTwerk = normalizedHandle.indexOf('mega') !== -1 && normalizedHandle.indexOf('twerk') !== -1;
        var hasPackOrBundle = normalizedHandle.indexOf('pack') !== -1 || normalizedHandle.indexOf('bundle') !== -1;
        var hasTwerkProgram = normalizedHandle.indexOf('twerk') !== -1 && normalizedHandle.indexOf('program') !== -1;
        var titleIsVipBundle = normalizedTitle.indexOf('vip bundle') !== -1;
        var titleIsBootyBuilderBundle = normalizedTitle.indexOf('booty builder bundle') !== -1;
        var titleIsHipOpenerBundle = normalizedTitle.indexOf('hip opener bundle') !== -1;
        var titleIsTwerkEssentialKit = normalizedTitle.indexOf('twerk essential kit') !== -1;
        var titleIsMegaPack = normalizedTitle.indexOf('mega twerk') !== -1 && (normalizedTitle.indexOf('pack') !== -1 || normalizedTitle.indexOf('bundle') !== -1);
        var titleIsTwerkProgram = normalizedTitle.indexOf('twerk program') !== -1;
        if (hasVipBundle || titleIsVipBundle) {
          badgeLabel = 'Best Value';
        } else if (hasBootyBuilderBundle || titleIsBootyBuilderBundle) {
          badgeLabel = 'Booty-Focused';
        } else if (hasHipOpenerBundle || titleIsHipOpenerBundle) {
          badgeLabel = 'Hip Focused';
        } else if (hasTwerkEssentialKit || titleIsTwerkEssentialKit) {
          badgeLabel = 'Bestseller';
        } else if (hasMegaTwerk && hasPackOrBundle) {
          badgeLabel = 'Best Value';
        } else if (titleIsMegaPack) {
          badgeLabel = 'Best Value';
        } else if (hasTwerkProgram || titleIsTwerkProgram) {
          if (
            isTwerkProgramR1Template
            && !hasPackOrBundle
            && !hasVipBundle
            && !titleIsVipBundle
          ) {
            badgeLabel = 'Special';
          } else {
            badgeLabel = '';
          }
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

    function renderSizeFilterTrigger(stepId) {
      var sizes = getSizesForStep(stepId);
      if (!sizes.length) return '';
      var active = bbState.sizeFilter;
      var label = active ? active : 'All';
      var iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4"/></svg>';
      return '<button type="button" class="bb-size-filter-trigger' + (active ? ' bb-size-filter-trigger--active' : '') + '" data-bb-size-filter-open aria-label="Filter by size">' + iconSvg + '<span class="bb-size-filter-trigger-label">Size: ' + (label || 'All') + '</span></button>';
    }

    function renderSizeFilterSheet(stepId) {
      var sizes = getSizesForStep(stepId);
      if (!sizes.length) return '';
      var active = bbState.sizeFilter;
      var html = '<div class="bb-size-filter-sheet bb-size-filter-sheet--hidden" data-bb-size-filter-sheet role="dialog" aria-label="Choose size">';
      html += '<div class="bb-size-filter-sheet-backdrop" data-bb-size-filter-close></div>';
      html += '<div class="bb-size-filter-sheet-panel"><div class="bb-size-filter-sheet-title">Filter by size</div><div class="bb-size-filter-pills">';
      html += '<button type="button" class="bb-size-filter-pill' + (!active ? ' bb-size-filter-pill--active' : '') + '" data-bb-size-filter="">All</button>';
      sizes.forEach(function(s) {
        html += '<button type="button" class="bb-size-filter-pill' + (active === s ? ' bb-size-filter-pill--active' : '') + '" data-bb-size-filter="' + (s || '').replace(/"/g, '&quot;') + '">' + (s || '') + '</button>';
      });
      html += '</div></div></div>';
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
      if (!shouldShowStep(step)) {
        var fallbackIndex = getPrevVisibleStepIndex(bbState.currentStepIndex);
        if (fallbackIndex < 0) fallbackIndex = getNextVisibleStepIndex(bbState.currentStepIndex);
        if (fallbackIndex < 0) fallbackIndex = getFirstVisibleStepIndex();
        if (fallbackIndex >= 0) goToStep(fallbackIndex);
        return;
      }
      if (step.id === 'review') {
        if (sizeFilterSlotEl) sizeFilterSlotEl.innerHTML = '';
        contentEl.innerHTML = renderReviewStep();
      } else {
        var filteredIds = getFilteredProductIds(step.id, bbState.sizeFilter);
        var hasSizeFilter = isClothingStep(step.id);
        if (sizeFilterSlotEl) {
          sizeFilterSlotEl.innerHTML = hasSizeFilter ? renderSizeFilterTrigger(step.id) : '';
        }
        var sizeFilterSheetHtml = hasSizeFilter ? renderSizeFilterSheet(step.id) : '';
        contentEl.innerHTML = sizeFilterSheetHtml + renderProductStep(step.id, filteredIds);
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
      sectionRoot.querySelectorAll('[data-bb-size-filter-open]').forEach(function(btn) {
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
      if (!showDiscountBanner) {
        discountEl.style.display = 'none';
        return;
      }
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
      var price = p.priceRange && p.priceRange.minVariantPrice ? parseFloat(p.priceRange.minVariantPrice.amount) : 0;
      var compareAt = p.compareAtPriceRange && p.compareAtPriceRange.minVariantPrice ? parseFloat(p.compareAtPriceRange.minVariantPrice.amount) : null;
      var ruleTarget = getRuleTargetByProduct(item.stepId, p);
      if (ruleTarget && ruleTarget.free) {
        var ruleFreeOrig = (compareAt != null && compareAt > price) ? compareAt : price;
        return { orig: ruleFreeOrig, final: 0 };
      }
      if (isBodyTransformationFreeBundleLineForSecondStep(item)) {
        var btFreeOrig = (compareAt != null && compareAt > price) ? compareAt : price;
        return { orig: btFreeOrig, final: 0 };
      }
      if (isVipPackFreeEligibleStep(item.stepId) && hasSelectedProgramPackInProgramsStep()) {
        var vipFreeIds = getVipPackFreeProductIds();
        if (vipFreeIds[String(item.productId)]) {
          var vipFreeOrig = (compareAt != null && compareAt > price) ? compareAt : price;
          return { orig: vipFreeOrig, final: 0 };
        }
      }
      if (isTwerkEssentialFreeClothingStep(item.stepId)) {
        var twerkFreeIds = getTwerkEssentialFreeClothingProductIds();
        if (twerkFreeIds[String(item.productId)]) {
          var twerkStepOrig = (compareAt != null && compareAt > price) ? compareAt : price;
          return { orig: twerkStepOrig, final: 0 };
        }
      }
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
          hasCheckoutIntent = true;
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
      if (lower.indexOf('halter') >= 0 || lower.indexOf('bust') >= 0 || lower.indexOf('shirt') >= 0) return 'chest';
      return 'waist-hip';
    }

    /** Normalize row labels so e.g. Cyrillic "С" (U+0421) + "hest" still matches Latin "chest". */
    function normalizeSizeRowLabel(s) {
      return String(s || '')
        .toLowerCase()
        .replace(/\u0441/g, 'c');
    }

    function tableHasLabelSubstr(tableData, sub) {
      sub = String(sub || '').toLowerCase();
      for (var r = 0; r < tableData.length; r++) {
        if (normalizeSizeRowLabel((tableData[r] && tableData[r][0]) || '').indexOf(sub) >= 0) return true;
      }
      return false;
    }

    /** Parse a size cell like "39-40", "39 – 40", or "32". Hyphens between numbers must not become unary minus ("39-40" is not 39 and -40). */
    function parseCellRange(cell) {
      var s = String(cell || '').replace(/\u00a0/g, ' ').replace(/,/g, '.').trim();
      if (!s) return null;
      var nums = s.match(/\d+(?:\.\d+)?/g);
      if (!nums || !nums.length) return null;
      var parsed = nums.map(function(n) { return parseFloat(n); }).filter(function(x) { return !isNaN(x); });
      if (!parsed.length) return null;
      if (parsed.length === 1) return { min: parsed[0], max: parsed[0] };
      return { min: Math.min.apply(null, parsed), max: Math.max.apply(null, parsed) };
    }

    function tableMedianDataMagnitude(tableData) {
      if (!tableData || tableData.length < 2) return 0;
      var mids = [];
      for (var r = 1; r < tableData.length; r++) {
        for (var c = 1; c < tableData[r].length; c++) {
          var pr = parseCellRange(tableData[r][c]);
          if (pr) mids.push((pr.min + pr.max) * 0.5);
        }
      }
      if (!mids.length) return 0;
      mids.sort(function(a, b) { return a - b; });
      return mids[Math.floor(mids.length / 2)];
    }

    function assignInchCmFromTwoTables(a, b) {
      var m0 = tableMedianDataMagnitude(a);
      var m1 = tableMedianDataMagnitude(b);
      if (m0 > 0 && m1 > 0 && Math.abs(m0 - m1) > 1) {
        if (m0 < m1) return { inchTable: a, cmTable: b };
        return { inchTable: b, cmTable: a };
      }
      return { inchTable: a, cmTable: b };
    }

    /**
     * @param {string} html
     * @param {string} [measurementKind] 'chest' | 'waist-hip' — when the page has 3+ tables, pick the pair that matches (e.g. chest IN/CM vs waist IN/CM).
     */
    function parseSizeChartHTML(html, measurementKind) {
      measurementKind = measurementKind || '';
      var parser = new DOMParser();
      var doc = parser.parseFromString(html || '', 'text/html');
      var tables = doc.querySelectorAll('table');
      var list = [];
      tables.forEach(function(table) {
        var rows = table.querySelectorAll('tr');
        var tableData = [];
        rows.forEach(function(row) {
          var cells = row.querySelectorAll('td, th');
          var rowData = [];
          cells.forEach(function(cell) { rowData.push((cell.textContent || '').trim()); });
          if (rowData.length) tableData.push(rowData);
        });
        if (tableData.length) list.push(tableData);
      });
      if (list.length === 0) return { inchTable: [], cmTable: [] };
      if (list.length === 1) return { inchTable: list[0], cmTable: [] };

      var work = list;
      if (list.length > 2 && measurementKind) {
        var filtered = list.filter(function(t) {
          if (measurementKind === 'chest') return tableHasLabelSubstr(t, 'chest') || tableHasLabelSubstr(t, 'bust');
          if (measurementKind === 'waist-hip') return tableHasLabelSubstr(t, 'waist') || tableHasLabelSubstr(t, 'hip');
          return true;
        });
        if (filtered.length >= 2) work = filtered;
        else if (filtered.length === 1) return { inchTable: filtered[0], cmTable: [] };
      }

      if (work.length === 2) {
        var pair = assignInchCmFromTwoTables(work[0], work[1]);
        return { inchTable: pair.inchTable, cmTable: pair.cmTable };
      }

      var bestI = 0;
      var bestJ = 1;
      var bestDiff = -1;
      for (var i = 0; i < work.length; i++) {
        for (var j = i + 1; j < work.length; j++) {
          var mi = tableMedianDataMagnitude(work[i]);
          var mj = tableMedianDataMagnitude(work[j]);
          var d = (mi > 0 && mj > 0) ? Math.abs(mi - mj) : 0;
          if (d > bestDiff) {
            bestDiff = d;
            bestI = i;
            bestJ = j;
          }
        }
      }
      if (bestDiff > 1) {
        var pair2 = assignInchCmFromTwoTables(work[bestI], work[bestJ]);
        return { inchTable: pair2.inchTable, cmTable: pair2.cmTable };
      }
      var pair3 = assignInchCmFromTwoTables(work[0], work[1]);
      return { inchTable: pair3.inchTable, cmTable: pair3.cmTable };
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

    function getLocalSizeChartRef(productId) {
      var k = String(productId || '');
      var n = String(gidToNum(k) || toNumericId(k) || '');
      if (sizeChartByProduct[k]) return sizeChartByProduct[k];
      if (n && sizeChartByProduct[n]) return sizeChartByProduct[n];
      for (var key in sizeChartByProduct) {
        if (!Object.prototype.hasOwnProperty.call(sizeChartByProduct, key)) continue;
        var nk = String(gidToNum(String(key)) || toNumericId(String(key)) || '');
        if (nk && n && nk === n) return sizeChartByProduct[key];
      }
      return null;
    }

    function openSizeChartModal(productId) {
      if (!scModal) return;
      var productKey = String(productId || '');
      var localRef = getLocalSizeChartRef(productKey);
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
        if (scTips) scTips.innerHTML = sizeChartState.measurementType === 'chest' ? '<p><strong>How to Measure:</strong></p><p>&bull; <strong>Chest:</strong> Measure around the fullest part of your bust.</p>' : '<p><strong>How to Measure:</strong></p><p>&bull; <strong>Waist:</strong> Measure around the narrowest part of your waistline.</p><p>&bull; <strong>Hips:</strong> Stand with feet together and measure around the fullest part of your hips.</p>';
        if (scInputs) {
          scInputs.className = 'bb-size-chart-inputs bb-size-chart-inputs--' + sizeChartState.measurementType;
          scInputs.querySelectorAll('.bb-size-chart-input-group--chest').forEach(function(g){ g.style.display = sizeChartState.measurementType === 'chest' ? '' : 'none'; });
          scInputs.querySelectorAll('.bb-size-chart-input-group:not(.bb-size-chart-input-group--chest)').forEach(function(g){ g.style.display = sizeChartState.measurementType === 'chest' ? 'none' : ''; });
        }
        if (sizeChartState.noCalc && localRef.html) {
          if (scLoading) scLoading.style.display = 'none';
          if (scTableWrap) scTableWrap.style.display = 'none';
          if (scContent) { scContent.innerHTML = localRef.html; scContent.style.display = ''; }
          if (scEmpty) scEmpty.style.display = 'none';
          return;
        }
        if (!sizeChartState.noCalc && localRef.html) {
          var parsedFromLiquid = parseSizeChartHTML(localRef.html, getMeasurementType(sizeChartState.handle || ''));
          if (parsedFromLiquid.inchTable && parsedFromLiquid.inchTable.length) {
            sizeChartState.inchTable = parsedFromLiquid.inchTable;
            sizeChartState.cmTable = parsedFromLiquid.cmTable || [];
            if (scLoading) scLoading.style.display = 'none';
            if (scContent) { scContent.style.display = 'none'; scContent.innerHTML = ''; }
            renderSizeChartTable();
            if (scTableWrap) scTableWrap.style.display = '';
            if (scEmpty) scEmpty.style.display = 'none';
            fetchSizeChartConfig().then(function(cfg) { sizeChartState.config = cfg; });
            if (scCalcBtn) {
              var waist = (scInputs && scInputs.querySelector('[data-bb-sc-field="waist"]')) ? scInputs.querySelector('[data-bb-sc-field="waist"]').value : '';
              var hip = (scInputs && scInputs.querySelector('[data-bb-sc-field="hip"]')) ? scInputs.querySelector('[data-bb-sc-field="hip"]').value : '';
              var chest = (scInputs && scInputs.querySelector('[data-bb-sc-field="chest"]')) ? scInputs.querySelector('[data-bb-sc-field="chest"]').value : '';
              var canCalc = sizeChartState.measurementType === 'chest' ? !!chest : (!!waist && !!hip);
              scCalcBtn.disabled = !canCalc;
            }
            return;
          }
        }
      }

      if (!storefrontApiToken) {
        if (scLoading) scLoading.style.display = 'none';
        if (scTableWrap) scTableWrap.style.display = 'none';
        setCalculatorVisible(false);
        if (scEmpty) scEmpty.style.display = '';
        return;
      }
      fetchSizeChartConfig().then(function(cfg) {
        sizeChartState.config = cfg;
        return fetchProductSizeChartRef(productId);
      }).then(function(ref) {
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
        var parsed = parseSizeChartHTML(page.body, getMeasurementType(sizeChartState.handle || ''));
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
        if (scCalcBtn) {
          var waist2 = (scInputs && scInputs.querySelector('[data-bb-sc-field="waist"]')) ? scInputs.querySelector('[data-bb-sc-field="waist"]').value : '';
          var hip2 = (scInputs && scInputs.querySelector('[data-bb-sc-field="hip"]')) ? scInputs.querySelector('[data-bb-sc-field="hip"]').value : '';
          var chest2 = (scInputs && scInputs.querySelector('[data-bb-sc-field="chest"]')) ? scInputs.querySelector('[data-bb-sc-field="chest"]').value : '';
          var canCalc2 = sizeChartState.measurementType === 'chest' ? !!chest2 : (!!waist2 && !!hip2);
          scCalcBtn.disabled = !canCalc2;
        }
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
      function findRowByKeyword(keyword, minRow) {
        var start = typeof minRow === 'number' ? minRow : 1;
        var kw = String(keyword || '').toLowerCase();
        for (var i = start; i < table.length; i++) {
          var label = normalizeSizeRowLabel((table[i] && table[i][0]) || '');
          if (label.indexOf(kw) >= 0) return table[i];
        }
        return null;
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
        var chestRow = findRowByKeyword('chest', 1) || findRowByKeyword('bust', 1) || findRowByKeyword('chest', 0) || findRowByKeyword('bust', 0);
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
      var offerAutostart = (typeof window !== 'undefined' && window.__bt_bb_offer_autostart && typeof window.__bt_bb_offer_autostart === 'object')
        ? window.__bt_bb_offer_autostart
        : null;
      var offerFlow = (offerAutostart && typeof offerAutostart.flow === 'string') ? offerAutostart.flow.toLowerCase() : '';
      var forceAutoAddFromOffer = !!(offerAutostart && offerAutostart.autoAddBootyBand);
      var startStepIndex = (offerAutostart && offerAutostart.advanceToStep2) ? 1 : 0;
      if (skipProgramsStepOnOpen) startStepIndex = Math.max(startStepIndex, 1);
      bbState.offerFlow = offerFlow;
      bbState.allowStep2AutoAdd = !skipProgramsStepOnOpen || offerFlow === 'bundle' || forceAutoAddFromOffer;
      bbState.forceOfferStep2AutoAdd = !!forceAutoAddFromOffer;
      if (typeof window !== 'undefined') window.__bt_bb_offer_autostart = null;
      if (skipProgramsStepOnOpen) wizardEl.classList.add('bb-wizard-overlay--initializing');

      function clearInitialWizardState() {
        if (!skipProgramsStepOnOpen || !wizardEl) return;
        wizardEl.classList.remove('bb-wizard-overlay--initializing');
      }

      function rerunStepAutoAddAfterPreselect() {
        var retriesLeft = 20;
        function attempt() {
          var activeStep = bbState.steps[bbState.currentStepIndex];
          if (!activeStep) return;
          if (bbState.cartOperationInProgress && retriesLeft > 0) {
            retriesLeft -= 1;
            setTimeout(attempt, 150);
            return;
          }
          applyWorkoutEquipmentAutoAdd(activeStep);
          bbState.forceOfferStep2AutoAdd = false;
        }
        attempt();
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
          if (startStepIndex > 0) {
            goToStep(Math.min(startStepIndex, Math.max(0, bbState.steps.length - 1)));
            tryPreselectProgramsItem();
            rerunStepAutoAddAfterPreselect();
          } else {
            goToStep(getFirstVisibleStepIndex() >= 0 ? getFirstVisibleStepIndex() : 0);
            tryPreselectProgramsItem();
            rerunStepAutoAddAfterPreselect();
          }
          clearInitialWizardState();
        })
        .catch(function(err) {
          // #region agent log
          console.log('[BB] openWizard catch:', err && err.message ? err.message : err);
          // #endregion
          bbState.cartData = { item_count: 0, items: [], total_price: 0, currency: displayCurrency };
          return loadAllProductsForSteps().then(function() {
            if (startStepIndex > 0) {
              goToStep(Math.min(startStepIndex, Math.max(0, bbState.steps.length - 1)));
              tryPreselectProgramsItem();
              rerunStepAutoAddAfterPreselect();
            } else {
              goToStep(getFirstVisibleStepIndex() >= 0 ? getFirstVisibleStepIndex() : 0);
              tryPreselectProgramsItem();
              rerunStepAutoAddAfterPreselect();
            }
            clearInitialWizardState();
          });
        })
        .finally(function() {
          clearCtaLoading();
          clearInitialWizardState();
        });
    }

    function tryPreselectProgramsItem() {
      try {
        if (disableProgramsPreselect) {
          if (typeof window !== 'undefined') {
            window.__bt_bb_preselect_program_index = null;
            window.__bt_bb_preselect_second = false;
            window.__bt_bb_preselect_first = false;
          }
          return;
        }
        if (typeof window === 'undefined') return;
        var targetIndex = null;
        if (skipProgramsStepOnOpen && bbState.offerFlow === 'single') {
          targetIndex = 1;
        } else if (skipProgramsStepOnOpen && bbState.offerFlow === 'bundle') {
          targetIndex = 0;
        } else if (typeof window.__bt_bb_preselect_program_index === 'number' && isFinite(window.__bt_bb_preselect_program_index)) {
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

    function closeWizard(options) {
      var closeOptions = options && typeof options === 'object' ? options : {};
      bbState.offerFlow = '';
      bbState.isOpen = false;
      wizardEl.classList.add('bb-wizard-overlay--hidden');
      wizardEl.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      document.body.classList.remove('bb-wizard-open');
      var modal = sectionRoot.querySelector('.bb-exit-modal');
      if (modal) modal.classList.remove('bb-exit-modal--visible');
      if (closeOptions.trackAbandon) {
        trackBundleBuilderClosedWithoutPurchase(closeOptions.reason || 'closed');
      }
    }

    function requestCloseWizard() {
      if (bbState.cartData && bbState.cartData.item_count > 0) {
        var modal = sectionRoot.querySelector('.bb-exit-modal');
        if (modal) modal.classList.add('bb-exit-modal--visible');
      } else {
        closeWizard({ trackAbandon: true, reason: 'empty_cart_close' });
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
          closeWizard({ trackAbandon: true, reason: 'exit_confirm' });
          showToast('Cart cleared');
        });
    }

    function renderProgressBar() {
      if (!progressBarEl) return;
      var visibleIndexes = getVisibleStepIndexes();
      var len = visibleIndexes.length;
      if (!len) return;
      var currentPos = getVisibleStepPosition(bbState.currentStepIndex);
      if (currentPos < 0) currentPos = 0;
      var stepNum = currentPos + 1;
      progressBarEl.innerHTML = '';
      progressBarEl.setAttribute('aria-valuenow', stepNum);
      progressBarEl.setAttribute('aria-valuemin', 1);
      progressBarEl.setAttribute('aria-valuemax', len);
      progressBarEl.setAttribute('aria-label', 'Step ' + stepNum + ' of ' + len);
      for (var i = 0; i < len; i++) {
        var seg = document.createElement('div');
        seg.className = 'bb-wizard-progress-segment' + (i <= currentPos ? ' bb-wizard-progress-segment--filled' : '');
        progressBarEl.appendChild(seg);
      }
      if (stepTextEl) stepTextEl.textContent = 'Step ' + stepNum + ' of ' + len;
    }

    function goToStep(index) {
      var len = bbState.steps.length;
      if (index < 0 || index >= len) return;
      if (!shouldShowStep(bbState.steps[index])) {
        var fallbackIndex = getNextVisibleStepIndex(index);
        if (fallbackIndex < 0) fallbackIndex = getPrevVisibleStepIndex(index);
        if (fallbackIndex < 0) fallbackIndex = getFirstVisibleStepIndex();
        if (fallbackIndex < 0) return;
        index = fallbackIndex;
      }
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
        var nextVisibleIndex = getNextVisibleStepIndex(index);
        if (nextVisibleIndex < 0) {
          var reviewCtaText = isBodyTransformationTemplate ? 'Complete Order' : 'Add to cart';
          nextBtn.innerHTML = '<span class="bb-wizard-btn-text">' + reviewCtaText + '</span><span class="bb-wizard-btn-arrow" aria-hidden="true">→</span>';
        } else {
          nextBtn.textContent = 'Next';
        }
      }
      applyWorkoutEquipmentAutoAdd(step);
      var preloadIndex = getNextVisibleStepIndex(index);
      if (preloadIndex >= 0 && bbState.steps[preloadIndex].id !== 'review') {
        preloadStepImages(preloadIndex);
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
      var prevVisibleIndex = getPrevVisibleStepIndex(bbState.currentStepIndex);
      if (prevVisibleIndex >= 0) goToStep(prevVisibleIndex);
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
        var nextVisibleIndex = getNextVisibleStepIndex(bbState.currentStepIndex);
        if (nextVisibleIndex >= 0) goToStep(nextVisibleIndex);
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
