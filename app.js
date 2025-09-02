// Basic utilities
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Language & i18n
const I18N = {
  current: localStorage.getItem('lang') || (navigator.language?.startsWith('da') ? 'da' : 'da'),
  dict: {},
};

function getByPath(obj, path) {
  return path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

async function loadTranslations(lang) {
  const res = await fetch(`translations/${lang}.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load translations');
  I18N.dict = await res.json();
  I18N.current = lang;
  document.documentElement.lang = lang;
  localStorage.setItem('lang', lang);
  applyTranslations();
}

function applyTranslations() {
  $$('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const val = getByPath(I18N.dict, key);
    if (typeof val === 'string') {
      if (el.tagName.toLowerCase() === 'input' || el.tagName.toLowerCase() === 'textarea') {
        el.placeholder = val;
      } else if (el.tagName.toLowerCase() === 'title') {
        document.title = val;
      } else {
        el.textContent = val;
      }
    }
  });
  // Update title based on page in case <title> not processed
  const page = document.body.dataset.page;
  const titleKey = {
    home: 'meta.title_home',
    services: 'meta.title_services',
    about: 'meta.title_about',
    pricing: 'meta.title_pricing',
    contact: 'meta.title_contact',
  }[page];
  const pageTitle = titleKey ? getByPath(I18N.dict, titleKey) : null;
  if (pageTitle) document.title = pageTitle;

  // Update pressed state for language buttons
  $$('.lang').forEach((btn) => btn.setAttribute('aria-pressed', btn.dataset.lang === I18N.current ? 'true' : 'false'));
}

// Navigation: desktop active link + mobile drawer
function setupNavigation() {
  const burger = $('#burger');
  const drawer = $('#mobile-drawer');
  const overlay = $('#overlay');

  const setActiveLinks = () => {
    const page = document.body.dataset.page;
    const match = {
      home: 'index.html',
      services: 'services.html',
      about: 'about.html',
      pricing: 'pricing.html',
      contact: 'contact.html',
    }[page];
    if (!match) return;
    $$('.nav a').forEach((a) => {
      const href = a.getAttribute('href');
      a.classList.toggle('active', href.endsWith(match));
    });
  };
  setActiveLinks();

  if (!burger || !drawer || !overlay) return;
  const closeBtn = $('#drawer-close');

  function openDrawer() {
    burger.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
    overlay.hidden = false;
    overlay.classList.add('show');
    document.body.classList.add('no-scroll');
    // focus first link inside drawer
    const first = $('a, button, input, [tabindex]:not([tabindex="-1"])', drawer);
    first && first.focus({ preventScroll: true });
  }

  function closeDrawer() {
    burger.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('show');
    document.body.classList.remove('no-scroll');
    // hide overlay after transition
    setTimeout(() => (overlay.hidden = true), 200);
    burger.focus({ preventScroll: true });
  }

  burger.addEventListener('click', () => {
    const expanded = burger.getAttribute('aria-expanded') === 'true';
    expanded ? closeDrawer() : openDrawer();
  });
  closeBtn && closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.getAttribute('aria-hidden') === 'false') closeDrawer(); });
}

// Reveal on scroll via IntersectionObserver
function setupReveal() {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
  const items = $$('.reveal');
  items.forEach((el, i) => el.style.setProperty('--reveal-delay', `${Math.min(i * 60, 480)}ms`));
  items.forEach((el) => io.observe(el));
}

// Hero parallax
function setupParallax() {
  const heroImg = $('.hero .bg-image');
  if (!heroImg) return;
  // Fade in on load, hide on error (prevents broken-image icon)
  heroImg.addEventListener('load', () => heroImg.classList.add('loaded'));
  heroImg.addEventListener('error', () => { heroImg.style.display = 'none'; });
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY || 0;
      heroImg.style.setProperty('--parallax', (y * 0.2).toFixed(1));
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// 3D tilt for pricing cards
function setupTilt() {
  const cards = $$('.tilt');
  if (!cards.length) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  cards.forEach((card) => {
    let raf = null;
    let target = { rx: 0, ry: 0 };
    const max = 10;
    function animate() {
      raf = null;
      card.style.transform = `rotateX(${target.rx}deg) rotateY(${target.ry}deg)`;
    }
    function onMove(e) {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      target.ry = (dx * max).toFixed(2);
      target.rx = (-dy * max).toFixed(2);
      if (!raf) raf = requestAnimationFrame(animate);
    }
    function onLeave() {
      target.rx = 0; target.ry = 0; if (!raf) raf = requestAnimationFrame(animate);
    }
    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerleave', onLeave);
    card.addEventListener('pointerdown', onLeave);
  });
}

// Contact form success (no backend)
function setupForm() {
  const form = $('#contact-form');
  if (!form) return;
  const success = $('#form-success');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      // Let browser show built-in messages
      form.reportValidity();
      return;
    }
    form.reset();
    if (success) {
      success.hidden = false;
      success.focus && success.focus({ preventScroll: true });
      setTimeout(() => { success.hidden = true; }, 4000);
    }
  });
}

// Language switch handlers
function setupLangSwitcher() {
  $$('.lang').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const lang = btn.dataset.lang;
      if (lang && lang !== I18N.current) {
        try { await loadTranslations(lang); } catch (e) { console.warn('i18n load failed', e); }
      }
    });
  });
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupReveal();
  setupParallax();
  setupTilt();
  setupForm();
  setupLangSwitcher();
  // Hide any avatar/headshot images if they fail to load
  (function setupImageFallbacks() { $$('.img-hide-on-error').forEach((img) => img.addEventListener('error', () => { img.style.display = 'none'; })); })();
  try { await loadTranslations(I18N.current); } catch (e) { console.warn('Translations failed to load. If running from file:// start a simple static server.', e); }
});
