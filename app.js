const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const I18N = {
  current: localStorage.getItem('lang') || (navigator.language?.startsWith('da') ? 'da' : 'en'),
  dict: {},
};

function getByPath(obj, path) {
  return path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

async function loadTranslations(lang) {
  try {
    const res = await fetch(`translations/${lang}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load translations for ${lang}`);
    I18N.dict = await res.json();
    I18N.current = lang;
    document.documentElement.lang = lang;
    document.body.setAttribute('data-lang', lang);
    localStorage.setItem('lang', lang);
    applyTranslations();
  } catch (err) {
    console.error(err);
  }
}

function applyTranslations() {
  $$('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const value = getByPath(I18N.dict, key);
    if (typeof value !== 'string') return;

    const tag = el.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') {
      el.placeholder = value;
    } else if (tag === 'title') {
      document.title = value;
    } else {
      el.textContent = value;
    }
  });

  $$('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    const value = getByPath(I18N.dict, key);
    if (typeof value === 'string') {
      el.placeholder = value;
    }
  });

  $$('[data-i18n-meta]').forEach((el) => {
    const key = el.getAttribute('data-i18n-meta');
    const value = getByPath(I18N.dict, key);
    if (typeof value === 'string') {
      el.setAttribute('content', value);
    }
  });

  const homeTitle = getByPath(I18N.dict, 'meta.title_home');
  if (typeof homeTitle === 'string') {
    document.title = homeTitle;
  }

  $$('.lang').forEach((btn) => btn.setAttribute('aria-pressed', btn.dataset.lang === I18N.current ? 'true' : 'false'));
}

function setupLanguage() {
  $$('.lang').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      if (!lang || lang === I18N.current) return;
      loadTranslations(lang);
    });
  });
}

function setupMobileNav() {
  const burger = $('#burger');
  const nav = $('#mobile-nav');
  const overlay = $('#overlay');
  const closeBtn = $('#drawer-close');
  if (!burger || !nav || !overlay) return;

  function openNav() {
    burger.setAttribute('aria-expanded', 'true');
    nav.classList.add('open');
    nav.setAttribute('aria-hidden', 'false');
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('show'));
    document.body.classList.add('no-scroll');
    const firstLink = $('a, button', nav);
    firstLink && firstLink.focus({ preventScroll: true });
  }

  function closeNav() {
    burger.setAttribute('aria-expanded', 'false');
    nav.classList.remove('open');
    nav.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('show');
    document.body.classList.remove('no-scroll');
    setTimeout(() => { overlay.hidden = true; }, 250);
    burger.focus({ preventScroll: true });
  }

  burger.addEventListener('click', () => {
    const expanded = burger.getAttribute('aria-expanded') === 'true';
    expanded ? closeNav() : openNav();
  });

  closeBtn && closeBtn.addEventListener('click', closeNav);
  overlay.addEventListener('click', closeNav);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('open')) closeNav();
  });

  $$('#mobile-nav a').forEach((link) => link.addEventListener('click', closeNav));
}

function setupScrollSpy() {
  const sections = $$('main section[id]');
  if (!sections.length) return;

  const anchors = [...$$('.main-nav a'), ...$$('.mobile-nav-links a')];
  const map = new Map();

  anchors.forEach((link) => {
    const target = link.getAttribute('href')?.split('#')[1];
    if (!target) return;
    if (!map.has(target)) map.set(target, []);
    map.get(target).push(link);
  });

  function setActive(id) {
    anchors.forEach((link) => link.classList.remove('active'));
    const linked = map.get(id);
    if (!linked) return;
    linked.forEach((link) => link.classList.add('active'));
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.getAttribute('id');
      if (id) setActive(id);
    });
  }, { threshold: 0.5 });

  sections.forEach((section) => observer.observe(section));
}

function setupForm() {
  const form = $('#contact-form');
  if (!form) return;
  const success = $('#form-success');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    form.reset();
    if (success) {
      success.hidden = false;
      success.focus?.({ preventScroll: true });
      setTimeout(() => { success.hidden = true; }, 4000);
    }
  });
}

function setupImages() {
  $$('.img-hide-on-error').forEach((img) => {
    img.addEventListener('error', () => {
      img.dataset.broken = 'true';
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupLanguage();
  setupMobileNav();
  setupScrollSpy();
  setupForm();
  setupImages();
  loadTranslations(I18N.current);
});
