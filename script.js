const menuToggle = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('[data-nav]');

if (menuToggle && nav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

function observeRevealItems(root = document) {
  const items = root.querySelectorAll('[data-reveal]:not([data-observed])');
  items.forEach((item, index) => {
    item.dataset.observed = '1';
    item.style.transitionDelay = `${Math.min(index * 55, 320)}ms`;
    revealObserver.observe(item);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderServices(services) {
  const container = document.querySelector('#servicesGrid');
  if (!container || !Array.isArray(services) || services.length === 0) {
    return;
  }

  container.innerHTML = services
    .map(
      (service) => `
        <article class="info-card" data-reveal>
          <h3>${escapeHtml(service.title || '')}</h3>
          <p>${escapeHtml(service.description || '')}</p>
        </article>
      `
    )
    .join('');
  observeRevealItems(container);
}

function renderPricing(pricing) {
  const container = document.querySelector('#pricingGrid');
  if (!container || !Array.isArray(pricing) || pricing.length === 0) {
    return;
  }

  container.innerHTML = pricing
    .map((plan) => {
      const features = Array.isArray(plan.features)
        ? plan.features.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
        : '';

      return `
        <article class="price-card${plan.featured ? ' featured' : ''}" data-reveal>
          ${plan.featured ? '<p class="popular-badge">Most Popular</p>' : ''}
          <h3>${escapeHtml(plan.name || '')}</h3>
          <p class="price-tag">${escapeHtml(plan.tag || '')}</p>
          <ul class="feature-list">${features}</ul>
        </article>
      `;
    })
    .join('');
  observeRevealItems(container);
}

function renderTestimonials(testimonials) {
  const container = document.querySelector('#testimonialsGrid');
  if (!container || !Array.isArray(testimonials) || testimonials.length === 0) {
    return;
  }

  container.innerHTML = testimonials
    .map(
      (testimonial) => `
        <article class="testimonial-card" data-reveal>
          <p>"${escapeHtml(testimonial.quote || '')}"</p>
          <h3>${escapeHtml(testimonial.name || '')}</h3>
        </article>
      `
    )
    .join('');
  observeRevealItems(container);
}

async function loadManagedContent() {
  try {
    const response = await fetch('/api/content');
    if (!response.ok) {
      return;
    }
    const content = await response.json();
    renderServices(content.services);
    renderPricing(content.pricing);
    renderTestimonials(content.testimonials);
  } catch {
    // Keep static fallback content if API loading fails.
  }
}

const yearEl = document.querySelector('#year');
if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

const formStatus = document.querySelector('#formStatus');
if (formStatus) {
  const params = new URLSearchParams(window.location.search);
  const sent = params.get('sent');

  if (sent === '1') {
    formStatus.textContent = 'Message sent successfully. OSARTech will contact you soon.';
    formStatus.classList.add('is-success');
  }

  if (sent === '0') {
    formStatus.textContent = 'Please fill all required fields and try again.';
    formStatus.classList.add('is-error');
  }

  if (sent) {
    const cleanUrl = `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

observeRevealItems();
loadManagedContent();
