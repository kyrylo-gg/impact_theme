/**
 * Bundle Builder — Wizard modal with product steps, Ajax Cart, CartAddEvent integration.
 */
import { CartAddEvent } from '@theme/events';
import { morphSection } from '@theme/section-renderer';

const PROGRAM_PACK_PRODUCT_ID = '8109575929930';
const PROGRAM_PACK_DISCOUNT = 0.6;
const SHORTS_REGULAR_PRICE_USD = 49;
const TOPS_REGULAR_PRICE_USD = 28;
const SHORTS_STEP_IDS = ['step-1', 'step-2', 'step-3'];
const CLOTHING_STEP_IDS = ['step-1', 'step-2', 'step-3', 'step-4'];
const CLICK_DEBOUNCE_MS = 300;

const state = {
  currentStep: 0,
  showSummary: false,
  selections: {},
  steps: [],
  totalSteps: 0,
};

let lastClickTime = 0;
let isProcessing = false;

const imageViewerState = {
  images: [],
  currentIndex: 0,
  title: '',
};

function getConfig() {
  const el = document.getElementById('bundle-builder-config');
  if (!el) return null;
  try {
    return JSON.parse(el.textContent);
  } catch {
    return null;
  }
}

function hasProgramPack() {
  const programSelections = state.selections['step-0'] || [];
  return programSelections.some((s) => String(s.productId) === PROGRAM_PACK_PRODUCT_ID);
}

function getVisualOriginalPriceUsd(stepId, realPriceUsd, hasProgramPack) {
  if (!hasProgramPack) return realPriceUsd;
  if (SHORTS_STEP_IDS.includes(stepId)) return SHORTS_REGULAR_PRICE_USD;
  if (stepId === 'step-4') return TOPS_REGULAR_PRICE_USD;
  return realPriceUsd;
}

function getVisualFinalPriceUsd(stepId, realPriceUsd, hasProgramPack) {
  const original = getVisualOriginalPriceUsd(stepId, realPriceUsd, hasProgramPack);
  if (hasProgramPack && CLOTHING_STEP_IDS.includes(stepId)) {
    return original * (1 - PROGRAM_PACK_DISCOUNT);
  }
  return original;
}

function formatMoney(cents) {
  if (typeof cents === 'number' && cents >= 0) {
    return '$' + (cents / 100).toFixed(2);
  }
  return '$0.00';
}

function getAllSelections() {
  return Object.entries(state.selections).flatMap(([stepId, items]) =>
    items.map((item) => ({ ...item, stepId }))
  );
}

function getTotalItemCount() {
  return getAllSelections().reduce((sum, s) => sum + (s.quantity || 1), 0);
}

function isProductDisabled(productId, stepId) {
  if (stepId !== 'step-0') return false;
  const programSelections = state.selections['step-0'] || [];
  const hasBundle = programSelections.some((s) => String(s.productId) === PROGRAM_PACK_PRODUCT_ID);
  const hasNonBundle = programSelections.some((s) => String(s.productId) !== PROGRAM_PACK_PRODUCT_ID);
  const isSelected = programSelections.some((s) => String(s.productId) === String(productId));
  if (hasBundle && String(productId) !== PROGRAM_PACK_PRODUCT_ID) return true;
  if (hasNonBundle && String(productId) === PROGRAM_PACK_PRODUCT_ID) return true;
  if (isSelected) return true;
  return false;
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.setAttribute('role', 'alert');
  toast.className = `bundle-toast bundle-toast--${type}`;
  toast.textContent = message;
  toast.style.cssText = 'position:fixed;bottom:1rem;left:50%;transform:translateX(-50%);padding:0.75rem 1.5rem;background:#333;color:#fff;border-radius:0.5rem;z-index:9999;font-size:0.875rem;';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function triggerConfetti() {
  // Confetti animation intentionally disabled for all templates.
  return;
}

function openCartDrawer() {
  const drawer = document.querySelector('cart-drawer-component');
  if (drawer && typeof drawer.open === 'function') {
    drawer.open();
  }
}

function getCartSectionIds() {
  const items = document.querySelectorAll('cart-items-component');
  return [...items].map((el) => el.dataset?.sectionId).filter(Boolean);
}

async function addBundleToCart() {
  const selections = getAllSelections();
  if (selections.length === 0) {
    showToast('Please select at least one item', 'error');
    return;
  }
  if (isProcessing) return;
  isProcessing = true;

  const sectionIds = getCartSectionIds();
  const cartAddUrl = Theme?.routes?.cart_add_url || '/cart/add.js';

  const items = selections.map((s) => ({
    id: s.variantId,
    quantity: s.quantity || 1,
  }));

  const body = {
    items,
    sections: sectionIds.join(','),
    sections_url: window.location.pathname,
  };

  try {
    const res = await fetch(cartAddUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (data.status) {
      showToast(data.message || 'Failed to add items', 'error');
      return;
    }

    if (data.sections && sectionIds.length > 0) {
      for (const sectionId of sectionIds) {
        const html = data.sections[sectionId];
        if (html) {
          await morphSection(sectionId, html, 'full');
        }
      }
    }

    triggerConfetti();
    showToast(`${selections.length} item(s) added to cart!`, 'success');
    hideWizard();
    setTimeout(openCartDrawer, 300);

    document.dispatchEvent(
      new CartAddEvent(
        data,
        'bundle-builder',
        Object.assign(
          { source: 'bundle-builder', itemCount: getTotalItemCount() },
          data.sections && { sections: data.sections }
        )
      )
    );
  } catch (err) {
    showToast('Failed to add items to cart', 'error');
    console.error(err);
  } finally {
    isProcessing = false;
  }
}

function showWizard() {
  const wizard = document.getElementById('bundle-wizard');
  const skeleton = document.getElementById('bundle-wizard-skeleton');
  if (wizard) {
    wizard.hidden = false;
    wizard.setAttribute('aria-hidden', 'false');
  }
  if (skeleton) {
    skeleton.hidden = true;
  }
}

function hideWizard() {
  const wizard = document.getElementById('bundle-wizard');
  const skeleton = document.getElementById('bundle-wizard-skeleton');
  if (wizard) {
    wizard.hidden = true;
    wizard.setAttribute('aria-hidden', 'true');
  }
  setTimeout(() => {
    state.currentStep = 0;
    state.showSummary = false;
  }, 300);
}

function renderWizard() {
  const wizard = document.getElementById('bundle-wizard');
  if (!wizard) return;

  const steps = wizard.querySelectorAll('[data-step-index]');
  const progressSegments = wizard.querySelectorAll('.bundle-wizard__progress-segment');
  const stepLabel = wizard.querySelector('[data-bind="step-label"]');
  const stepTitle = wizard.querySelector('[data-bind="step-title"]');
  const stepBadge = wizard.querySelector('[data-bind="step-badge"]');
  const banner = wizard.querySelector('[data-bind="banner"]');
  const bannerText = wizard.querySelector('[data-bind="banner-text"]');
  const nextBtn = wizard.querySelector('[data-action="next"]');
  const addBtn = wizard.querySelector('[data-action="add-to-cart"]');
  const itemCount = wizard.querySelector('[data-bind="item-count"]');
  const discountedTotal = wizard.querySelector('[data-bind="discounted-total"]');
  const discountHint = wizard.querySelector('[data-bind="discount-hint"]');

  const totalSteps = state.steps.length;
  const activeIndex = state.showSummary ? state.steps.length - 1 : state.currentStep;
  const isReviewStep = state.showSummary;

  steps.forEach((step, i) => {
    step.hidden = i !== activeIndex;
  });

  progressSegments.forEach((seg, i) => {
    seg.classList.toggle('bundle-wizard__progress-segment--active', i <= activeIndex);
  });

  if (stepLabel) stepLabel.textContent = `Step ${activeIndex + 1} of ${totalSteps}`;
  if (stepTitle && state.steps[activeIndex]) {
    stepTitle.textContent = state.steps[activeIndex].title || 'Select products';
  }
  if (stepBadge && state.steps[activeIndex]?.subtitle) {
    stepBadge.textContent = state.steps[activeIndex].subtitle;
    stepBadge.hidden = false;
  } else if (stepBadge) {
    stepBadge.hidden = true;
  }

  const hasPack = hasProgramPack();
  if (banner) {
    banner.classList.toggle('bundle-wizard__banner--inactive', !hasPack);
    banner.classList.toggle('bundle-wizard__banner--active', hasPack);
  }
  if (bannerText) {
    bannerText.textContent = hasPack
      ? (document.querySelector('#bundle')?.closest('.bundle-builder')?.dataset?.bannerActive ||
        '60% off all clothing applied!')
      : 'Get 60% off all clothing with 4 Programs Bundle!';
  }

  if (nextBtn) nextBtn.hidden = isReviewStep;
  if (addBtn) addBtn.hidden = !isReviewStep;

  const count = getTotalItemCount();
  if (itemCount) itemCount.textContent = count;
  if (discountHint) {
    discountHint.hidden = !hasPack || count === 0;
  }

  let totalUsd = 0;
  getAllSelections().forEach((s) => {
    const priceUsd = (s.priceCents || s.price * 100) / 100;
    totalUsd += getVisualFinalPriceUsd(s.stepId, priceUsd, hasPack);
  });
  if (discountedTotal) discountedTotal.textContent = '$' + totalUsd.toFixed(2);

  if (isReviewStep) renderSummary();
  updateCardStates();
}

function renderSummary() {
  const container = document.querySelector('[data-bind="summary-container"]');
  if (!container) return;

  const emptyEl = container.querySelector('[data-bind="summary-empty"]');
  const itemsEl = container.querySelector('[data-bind="summary-items"]');
  const priceEl = container.querySelector('[data-bind="price-summary"]');

  const selections = getAllSelections();
  if (selections.length === 0) {
    if (emptyEl) emptyEl.hidden = false;
    if (itemsEl) itemsEl.hidden = true;
    if (priceEl) priceEl.hidden = true;
    return;
  }

  if (emptyEl) emptyEl.hidden = true;
  if (itemsEl) {
    itemsEl.hidden = false;
    itemsEl.innerHTML = selections
      .map(
        (s, i) => `
        <div class="bs__item" data-step-id="${s.stepId}" data-variant-id="${s.variantId}" style="animation-delay:${i * 50}ms">
          <div class="bs__item-image">
            <img src="${s.imageUrl || ''}" alt="${(s.title || '').replace(/"/g, '&quot;')}" width="64" height="64" loading="lazy" />
          </div>
          <div class="bs__item-details">
            <h4 class="bs__item-title">${(s.title || '').replace(/</g, '&lt;')}</h4>
            <p class="bs__item-options">${(s.options || []).join(' • ')}</p>
            <div class="bs__item-prices">
              <span class="bs__item-price">$${(s.finalPrice || 0).toFixed(2)}</span>
            </div>
          </div>
          <button type="button" class="bs__item-remove" data-action="remove-summary-item" aria-label="Remove">×</button>
        </div>
      `
      )
      .join('');
  }
  if (priceEl) {
    priceEl.hidden = false;
    const hasPack = hasProgramPack();
    let subtotal = 0;
    let finalTotal = 0;
    selections.forEach((s) => {
      const priceUsd = (s.priceCents || s.price * 100) / 100;
      subtotal += getVisualOriginalPriceUsd(s.stepId, priceUsd, hasPack);
      finalTotal += getVisualFinalPriceUsd(s.stepId, priceUsd, hasPack);
    });
    const discount = subtotal - finalTotal;
    priceEl.innerHTML = `
      <div class="bs__price-row">
        <span>Subtotal (${selections.length} items)</span>
        <span>$${subtotal.toFixed(2)}</span>
      </div>
      ${discount > 0 ? `<div class="bs__price-row bs__price-row--discount"><span>Discount (60%)</span><span>-$${discount.toFixed(2)}</span></div>` : ''}
      <div class="bs__price-row bs__price-row--total">
        <span>Total</span>
        <span>$${finalTotal.toFixed(2)}</span>
      </div>
    `;
  }
}

function updateCardStates() {
  document.querySelectorAll('.bsp__card').forEach((card) => {
    const productId = card.dataset.productId;
    const stepId = card.dataset.stepId;
    const addBtn = card.querySelector('.bsp__add-btn');
    const selectedWrap = card.querySelector('.bsp__card-actions--selected');
    const stepSelections = state.selections[stepId] || [];
    const isSelected = stepSelections.some((s) => String(s.productId) === String(productId));
    const disabled = isProductDisabled(productId, stepId);

    if (addBtn) {
      addBtn.hidden = isSelected;
      addBtn.disabled = disabled;
    }
    if (selectedWrap) selectedWrap.hidden = !isSelected;
    card.classList.toggle('bsp__card--selected', isSelected);
  });
}

function addSelection(stepId, productId, variantId, variantData, options = [], imageUrl = '', title = '') {
  if (!state.selections[stepId]) state.selections[stepId] = [];
  const priceCents = variantData?.priceCents ?? (variantData?.price ? variantData.price * 100 : 0);
  const priceUsd = priceCents / 100;
  const hasPack = hasProgramPack();
  const finalPrice = getVisualFinalPriceUsd(stepId, priceUsd, hasPack);
  state.selections[stepId].push({
    productId,
    variantId,
    quantity: 1,
    priceCents,
    price: priceUsd,
    finalPrice,
    options: options.filter(Boolean),
    imageUrl,
    title,
  });
}

function removeSelection(stepId, variantId) {
  const arr = state.selections[stepId];
  if (!arr) return;
  const idx = arr.findIndex((s) => String(s.variantId) === String(variantId));
  if (idx >= 0) arr.splice(idx, 1);
}

function handleAddProduct(card) {
  const now = Date.now();
  if (now - lastClickTime < CLICK_DEBOUNCE_MS || isProcessing) return;
  lastClickTime = now;

  const productId = card.dataset.productId;
  const stepId = card.dataset.stepId;
  let variants = [];
  try {
    variants = JSON.parse(card.dataset.variants || '[]');
  } catch {}

  if (variants.length === 0) return;
  if (variants.length === 1 && variants[0].available) {
    const v = variants[0];
    addSelection(stepId, productId, v.id, v, v.options || [], card.querySelector('.bsp__card-img')?.src, card.querySelector('.bsp__card-title')?.textContent);
    renderWizard();
    return;
  }

  const availableVariants = variants.filter((x) => x.available);
  const v = availableVariants[0];
  if (v) {
    const opts = Array.isArray(v.options) ? v.options : (v.selectedOptions || []).map((o) => o?.value || o);
    addSelection(stepId, productId, v.id, v, opts, card.querySelector('.bsp__card-img')?.src, card.querySelector('.bsp__card-title')?.textContent);
  }
  renderWizard();
}

function handleRemoveProduct(card) {
  const stepId = card.dataset.stepId;
  const stepSelections = state.selections[stepId] || [];
  const productId = card.dataset.productId;
  const idx = stepSelections.findIndex((s) => String(s.productId) === String(productId));
  if (idx >= 0) {
    stepSelections.splice(idx, 1);
    renderWizard();
  }
}

function openImageViewer(card) {
  let images = [];
  try {
    images = JSON.parse(card.dataset.images || '[]');
  } catch {}
  if (images.length === 0 && card.querySelector('.bsp__card-img')?.src) {
    images = [card.querySelector('.bsp__card-img').src];
  }
  if (images.length === 0) return;

  imageViewerState.images = images;
  imageViewerState.currentIndex = 0;
  imageViewerState.title = card.dataset.productTitle || card.querySelector('.bsp__card-title')?.textContent || '';

  const modal = document.getElementById('bundle-image-viewer');
  if (!modal) return;

  const img = modal.querySelector('.bsp__image-viewer-img');
  const titleEl = modal.querySelector('.bsp__image-viewer-title h3');
  const prevBtn = modal.querySelector('[data-action="image-viewer-prev"]');
  const nextBtn = modal.querySelector('[data-action="image-viewer-next"]');
  const dotsEl = modal.querySelector('.bsp__image-viewer-dots');

  function renderViewer() {
    img.src = imageViewerState.images[imageViewerState.currentIndex] || '';
    img.alt = imageViewerState.title;
    if (titleEl) titleEl.textContent = imageViewerState.title;
    if (prevBtn) prevBtn.hidden = images.length <= 1;
    if (nextBtn) nextBtn.hidden = images.length <= 1;
    if (dotsEl) {
      dotsEl.innerHTML = images
        .map(
          (_, i) =>
            `<button type="button" class="bsp__image-viewer-dot${i === imageViewerState.currentIndex ? ' bsp__image-viewer-dot--active' : ''}" data-index="${i}" aria-label="Image ${i + 1}"></button>`
        )
        .join('');
    }
  }

  renderViewer();
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
}

function closeImageViewer() {
  const modal = document.getElementById('bundle-image-viewer');
  if (modal) {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
  }
}

function setupEventDelegation(root) {
  root.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const card = target.closest('.bsp__card');

    if (action === 'open-image-viewer' && card) {
      e.preventDefault();
      e.stopPropagation();
      openImageViewer(card);
      return;
    }
    if (action === 'close-image-viewer') {
      closeImageViewer();
      return;
    }
    if (action === 'image-viewer-prev') {
      if (imageViewerState.images.length > 0) {
        imageViewerState.currentIndex = (imageViewerState.currentIndex - 1 + imageViewerState.images.length) % imageViewerState.images.length;
        const modal = document.getElementById('bundle-image-viewer');
        const img = modal?.querySelector('.bsp__image-viewer-img');
        const dotsEl = modal?.querySelector('.bsp__image-viewer-dots');
        if (img) img.src = imageViewerState.images[imageViewerState.currentIndex];
        dotsEl?.querySelectorAll('.bsp__image-viewer-dot').forEach((d, i) => d.classList.toggle('bsp__image-viewer-dot--active', i === imageViewerState.currentIndex));
      }
      return;
    }
    if (action === 'image-viewer-next') {
      if (imageViewerState.images.length > 0) {
        imageViewerState.currentIndex = (imageViewerState.currentIndex + 1) % imageViewerState.images.length;
        const modal = document.getElementById('bundle-image-viewer');
        const img = modal?.querySelector('.bsp__image-viewer-img');
        const dotsEl = modal?.querySelector('.bsp__image-viewer-dots');
        if (img) img.src = imageViewerState.images[imageViewerState.currentIndex];
        dotsEl?.querySelectorAll('.bsp__image-viewer-dot').forEach((d, i) => d.classList.toggle('bsp__image-viewer-dot--active', i === imageViewerState.currentIndex));
      }
      return;
    }
    const dot = target.closest('.bsp__image-viewer-dot[data-index]');
    if (dot) {
      const idx = parseInt(dot.dataset.index, 10);
      if (!isNaN(idx) && imageViewerState.images.length > 0) {
        imageViewerState.currentIndex = idx;
        const modal = document.getElementById('bundle-image-viewer');
        const img = modal?.querySelector('.bsp__image-viewer-img');
        const dotsEl = modal?.querySelector('.bsp__image-viewer-dots');
        if (img) img.src = imageViewerState.images[idx];
        dotsEl?.querySelectorAll('.bsp__image-viewer-dot').forEach((d, i) => d.classList.toggle('bsp__image-viewer-dot--active', i === idx));
      }
      return;
    }

    if (action === 'open-wizard') {
      e.preventDefault();
      showWizard();
      renderWizard();
    }
    if (action === 'close') {
      hideWizard();
    }
    if (action === 'back') {
      if (state.showSummary) {
        state.showSummary = false;
      } else if (state.currentStep > 0) {
        state.currentStep--;
      }
      renderWizard();
    }
    if (action === 'next') {
      if (state.currentStep < state.totalSteps - 1) {
        state.currentStep++;
      } else {
        state.showSummary = true;
      }
      renderWizard();
    }
    if (action === 'add-to-cart') {
      addBundleToCart();
    }
    if (action === 'add-product' && card) {
      handleAddProduct(card);
    }
    if (action === 'remove-product' && card) {
      handleRemoveProduct(card);
    }
    if (action === 'remove-summary-item') {
      const item = target.closest('.bs__item');
      if (item) {
        const stepId = item.dataset.stepId;
        const variantId = item.dataset.variantId;
        removeSelection(stepId, variantId);
        renderWizard();
      }
    }
  });
}

function prefetchBundleData() {
  renderWizard();
}

function init() {
  const config = getConfig();
  if (!config) return;

  state.steps = config.steps || [];
  state.totalSteps = state.steps.length;

  const cta = document.getElementById('bundle-cta');
  const section = document.getElementById('bundle');

  if (cta) {
    cta.addEventListener('mouseenter', prefetchBundleData, { once: true });
    cta.addEventListener('focus', prefetchBundleData, { once: true });
    cta.addEventListener('touchstart', prefetchBundleData, { once: true, passive: true });
  }

  if (section) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          prefetchBundleData();
          observer.disconnect();
        }
      },
      { rootMargin: '500px' }
    );
    observer.observe(section);
  }

  setupEventDelegation(document);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const viewer = document.getElementById('bundle-image-viewer');
      if (viewer && !viewer.hidden) closeImageViewer();
    }
  });
  renderWizard();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
