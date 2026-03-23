const adminKeyInput = document.querySelector('#adminKey');
const loadButton = document.querySelector('#loadContent');
const saveButton = document.querySelector('#saveContent');
const statusEl = document.querySelector('#adminStatus');

function setStatus(message, type = '') {
  if (!statusEl) {
    return;
  }
  statusEl.textContent = message;
  statusEl.classList.remove('success', 'error');
  if (type) {
    statusEl.classList.add(type);
  }
}

function getInputValue(id) {
  const element = document.querySelector(`#${id}`);
  return element ? element.value.trim() : '';
}

function setInputValue(id, value) {
  const element = document.querySelector(`#${id}`);
  if (element) {
    element.value = value || '';
  }
}

function getCheckValue(id) {
  const element = document.querySelector(`#${id}`);
  return Boolean(element && element.checked);
}

function setCheckValue(id, value) {
  const element = document.querySelector(`#${id}`);
  if (element) {
    element.checked = Boolean(value);
  }
}

function readFormContent() {
  const services = [];
  for (let i = 1; i <= 4; i += 1) {
    const title = getInputValue(`serviceTitle${i}`);
    const description = getInputValue(`serviceDesc${i}`);
    if (title && description) {
      services.push({ title, description });
    }
  }

  const pricing = [];
  for (let i = 1; i <= 3; i += 1) {
    const name = getInputValue(`priceName${i}`);
    const tag = getInputValue(`priceTag${i}`);
    const featured = getCheckValue(`priceFeatured${i}`);
    const features = getInputValue(`priceFeatures${i}`)
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    if (name && tag && features.length > 0) {
      pricing.push({ name, tag, featured, features });
    }
  }

  const testimonials = [];
  for (let i = 1; i <= 3; i += 1) {
    const quote = getInputValue(`testimonialQuote${i}`);
    const name = getInputValue(`testimonialName${i}`);
    if (quote && name) {
      testimonials.push({ quote, name });
    }
  }

  return { services, pricing, testimonials };
}

function fillFormContent(content) {
  const services = Array.isArray(content.services) ? content.services : [];
  const pricing = Array.isArray(content.pricing) ? content.pricing : [];
  const testimonials = Array.isArray(content.testimonials) ? content.testimonials : [];

  for (let i = 1; i <= 4; i += 1) {
    const item = services[i - 1] || {};
    setInputValue(`serviceTitle${i}`, item.title || '');
    setInputValue(`serviceDesc${i}`, item.description || '');
  }

  for (let i = 1; i <= 3; i += 1) {
    const item = pricing[i - 1] || {};
    setInputValue(`priceName${i}`, item.name || '');
    setInputValue(`priceTag${i}`, item.tag || '');
    setCheckValue(`priceFeatured${i}`, Boolean(item.featured));
    setInputValue(`priceFeatures${i}`, Array.isArray(item.features) ? item.features.join('\n') : '');
  }

  for (let i = 1; i <= 3; i += 1) {
    const item = testimonials[i - 1] || {};
    setInputValue(`testimonialQuote${i}`, item.quote || '');
    setInputValue(`testimonialName${i}`, item.name || '');
  }
}

async function loadContent() {
  setStatus('Loading content...');
  try {
    const response = await fetch('/api/content');
    if (!response.ok) {
      setStatus('Unable to load content.', 'error');
      return;
    }
    const content = await response.json();
    fillFormContent(content);
    setStatus('Content loaded.', 'success');
  } catch {
    setStatus('Unable to load content.', 'error');
  }
}

async function saveContent() {
  const adminKey = adminKeyInput ? adminKeyInput.value.trim() : '';
  if (!adminKey) {
    setStatus('Enter admin key before saving.', 'error');
    return;
  }

  const content = readFormContent();
  if (content.services.length === 0 || content.pricing.length === 0) {
    setStatus('Add at least one complete service and one complete pricing plan.', 'error');
    return;
  }

  setStatus('Saving...');
  try {
    const response = await fetch('/api/content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': adminKey,
      },
      body: JSON.stringify(content),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = result.error || 'Failed to save content.';
      setStatus(message, 'error');
      return;
    }
    setStatus('Content saved successfully.', 'success');
  } catch {
    setStatus('Failed to save content.', 'error');
  }
}

if (loadButton) {
  loadButton.addEventListener('click', loadContent);
}

if (saveButton) {
  saveButton.addEventListener('click', saveContent);
}

loadContent();
