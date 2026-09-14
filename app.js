// Digital Legacy Planner - Client-side MVP
// Data stored in localStorage for this prototype

const STORAGE_KEY = 'digital-legacy-data';

const defaultData = {
  profile: { name: '' },
  assets: [],
  contacts: [],
  wishes: [],
  settings: {
    checkinIntervalDays: 30,
    lastCheckin: null
  }
};

let data = loadData();

// ---------- Persistence ----------
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultData, ...JSON.parse(raw) };
  } catch (e) {}
  return structuredClone(defaultData);
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  render();
}

// ---------- UI Helpers ----------
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function openModal(html) {
  $('#modal-body').innerHTML = html;
  show($('#modal'));
}

function closeModal() {
  hide($('#modal'));
  $('#modal-body').innerHTML = '';
}

// ---------- Views ----------
function showView(name) {
  $$('.view').forEach(v => hide(v));
  $$('.nav-btn').forEach(b => b.classList.remove('active'));
  const view = $(`#view-${name}`);
  if (view) show(view);
  const btn = $(`.nav-btn[data-view="${name}"]`);
  if (btn) btn.classList.add('active');
}

// ---------- Render ----------
function render() {
  // Stats
  $('#stat-assets').textContent = data.assets.length;
  $('#stat-contacts').textContent = data.contacts.length;
  $('#stat-wishes').textContent = data.wishes.length;

  // Check-in status
  const statusEl = $('#checkin-status');
  if (data.settings.lastCheckin) {
    const last = new Date(data.settings.lastCheckin);
    const next = new Date(last);
    next.setDate(next.getDate() + data.settings.checkinIntervalDays);
    const daysLeft = Math.ceil((next - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0) {
      statusEl.textContent = `Last check-in: ${last.toLocaleDateString()}. Next suggested in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`;
    } else {
      statusEl.textContent = `Check-in is due. Last one was ${last.toLocaleDateString()}.`;
    }
  } else {
    statusEl.textContent = 'You haven\'t checked in yet. Tap the button below when you\'re ready.';
  }

  // Assets list
  const assetsList = $('#assets-list');
  if (data.assets.length === 0) {
    assetsList.innerHTML = '<div class="empty-state">No assets yet. Add accounts, subscriptions, photo libraries, or anything important.</div>';
  } else {
    assetsList.innerHTML = data.assets.map(a => `
      <div class="list-item" data-id="${a.id}">
        <div class="list-item-content">
          <h3>${escapeHtml(a.name)}</h3>
          <p>${escapeHtml(a.type || 'Asset')}${a.notes ? ' · ' + escapeHtml(a.notes) : ''}</p>
        </div>
        <div class="list-item-actions">
          <button data-action="edit-asset" data-id="${a.id}">Edit</button>
          <button data-action="delete-asset" data-id="${a.id}">Delete</button>
        </div>
      </div>
    `).join('');
  }

  // Contacts list
  const contactsList = $('#contacts-list');
  if (data.contacts.length === 0) {
    contactsList.innerHTML = '<div class="empty-state">No trusted contacts yet. Add people who should be notified if needed.</div>';
  } else {
    contactsList.innerHTML = data.contacts.map(c => `
      <div class="list-item" data-id="${c.id}">
        <div class="list-item-content">
          <h3>${escapeHtml(c.name)}</h3>
          <p>${escapeHtml(c.email || '')}${c.phone ? ' · ' + escapeHtml(c.phone) : ''}${c.relation ? ' · ' + escapeHtml(c.relation) : ''}</p>
        </div>
        <div class="list-item-actions">
          <button data-action="edit-contact" data-id="${c.id}">Edit</button>
          <button data-action="delete-contact" data-id="${c.id}">Delete</button>
        </div>
      </div>
    `).join('');
  }

  // Wishes list
  const wishesList = $('#wishes-list');
  if (data.wishes.length === 0) {
    wishesList.innerHTML = '<div class="empty-state">No wishes written yet. Add plain-language instructions for what should happen.</div>';
  } else {
    wishesList.innerHTML = data.wishes.map(w => `
      <div class="list-item" data-id="${w.id}">
        <div class="list-item-content">
          <h3>${escapeHtml(w.title)}</h3>
          <p>${escapeHtml(w.body).substring(0, 120)}${w.body.length > 120 ? '…' : ''}</p>
        </div>
        <div class="list-item-actions">
          <button data-action="edit-wish" data-id="${w.id}">Edit</button>
          <button data-action="delete-wish" data-id="${w.id}">Delete</button>
        </div>
      </div>
    `).join('');
  }

  // Settings
  $('#checkin-interval').value = data.settings.checkinIntervalDays;
  $('#profile-name').value = data.profile.name || '';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------- Asset Modal ----------
function showAssetForm(asset = null) {
  const isEdit = !!asset;
  openModal(`
    <h2>${isEdit ? 'Edit asset' : 'Add digital asset'}</h2>
    <form id="asset-form">
      <div class="form-group">
        <label>Name *</label>
        <input name="name" required value="${asset ? escapeHtml(asset.name) : ''}" placeholder="e.g. Google account, iCloud Photos, Netflix" />
      </div>
      <div class="form-group">
        <label>Type</label>
        <select name="type">
          <option value="Account" ${asset?.type === 'Account' ? 'selected' : ''}>Account / Login</option>
          <option value="Subscription" ${asset?.type === 'Subscription' ? 'selected' : ''}>Subscription</option>
          <option value="Photos / Media" ${asset?.type === 'Photos / Media' ? 'selected' : ''}>Photos / Media</option>
          <option value="Cloud Storage" ${asset?.type === 'Cloud Storage' ? 'selected' : ''}>Cloud Storage</option>
          <option value="Social" ${asset?.type === 'Social' ? 'selected' : ''}>Social Profile</option>
          <option value="Financial" ${asset?.type === 'Financial' ? 'selected' : ''}>Financial / Crypto</option>
          <option value="Other" ${asset?.type === 'Other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
      <div class="form-group">
        <label>Notes (optional)</label>
        <textarea name="notes" placeholder="Any extra details or instructions">${asset ? escapeHtml(asset.notes || '') : ''}</textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn primary">${isEdit ? 'Save' : 'Add asset'}</button>
        <button type="button" class="btn" id="cancel-modal">Cancel</button>
      </div>
    </form>
  `);

  $('#asset-form').onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const item = {
      id: asset ? asset.id : crypto.randomUUID(),
      name: fd.get('name').trim(),
      type: fd.get('type'),
      notes: fd.get('notes').trim()
    };
    if (isEdit) {
      data.assets = data.assets.map(a => a.id === asset.id ? item : a);
    } else {
      data.assets.push(item);
    }
    saveData();
    closeModal();
  };
  $('#cancel-modal').onclick = closeModal;
}

// ---------- Contact Modal ----------
function showContactForm(contact = null) {
  const isEdit = !!contact;
  openModal(`
    <h2>${isEdit ? 'Edit contact' : 'Add trusted contact'}</h2>
    <form id="contact-form">
      <div class="form-group">
        <label>Name *</label>
        <input name="name" required value="${contact ? escapeHtml(contact.name) : ''}" placeholder="Full name" />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input name="email" type="email" value="${contact ? escapeHtml(contact.email || '') : ''}" placeholder="email@example.com" />
      </div>
      <div class="form-group">
        <label>Phone</label>
        <input name="phone" value="${contact ? escapeHtml(contact.phone || '') : ''}" placeholder="Optional" />
      </div>
      <div class="form-group">
        <label>Relation</label>
        <input name="relation" value="${contact ? escapeHtml(contact.relation || '') : ''}" placeholder="e.g. Spouse, Sibling, Friend" />
      </div>
      <div class="form-actions">
        <button type="submit" class="btn primary">${isEdit ? 'Save' : 'Add contact'}</button>
        <button type="button" class="btn" id="cancel-modal">Cancel</button>
      </div>
    </form>
  `);

  $('#contact-form').onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const item = {
      id: contact ? contact.id : crypto.randomUUID(),
      name: fd.get('name').trim(),
      email: fd.get('email').trim(),
      phone: fd.get('phone').trim(),
      relation: fd.get('relation').trim()
    };
    if (isEdit) {
      data.contacts = data.contacts.map(c => c.id === contact.id ? item : c);
    } else {
      data.contacts.push(item);
    }
    saveData();
    closeModal();
  };
  $('#cancel-modal').onclick = closeModal;
}

// ---------- Wish Modal ----------
function showWishForm(wish = null) {
  const isEdit = !!wish;
  openModal(`
    <h2>${isEdit ? 'Edit wish' : 'Add a wish'}</h2>
    <form id="wish-form">
      <div class="form-group">
        <label>Title *</label>
        <input name="title" required value="${wish ? escapeHtml(wish.title) : ''}" placeholder="e.g. Social media accounts" />
      </div>
      <div class="form-group">
        <label>Instructions *</label>
        <textarea name="body" required placeholder="Write clearly what you want to happen...">${wish ? escapeHtml(wish.body || '') : ''}</textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn primary">${isEdit ? 'Save' : 'Add wish'}</button>
        <button type="button" class="btn" id="cancel-modal">Cancel</button>
      </div>
    </form>
  `);

  $('#wish-form').onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const item = {
      id: wish ? wish.id : crypto.randomUUID(),
      title: fd.get('title').trim(),
      body: fd.get('body').trim()
    };
    if (isEdit) {
      data.wishes = data.wishes.map(w => w.id === wish.id ? item : w);
    } else {
      data.wishes.push(item);
    }
    saveData();
    closeModal();
  };
  $('#cancel-modal').onclick = closeModal;
}

// ---------- Event Listeners ----------
document.addEventListener('DOMContentLoaded', () => {
  // Landing -> App
  const start = () => {
    hide($('#landing'));
    show($('#app'));
    showView('dashboard');
    render();
  };

  $('#start-btn').onclick = start;
  $('#start-btn-2').onclick = start;

  // If data already exists, go straight to app
  if (data.assets.length || data.contacts.length || data.wishes.length || data.profile.name) {
    start();
  }

  // Navigation
  $$('.nav-btn').forEach(btn => {
    btn.onclick = () => showView(btn.dataset.view);
  });

  // Quick actions
  $$('[data-goto]').forEach(btn => {
    btn.onclick = () => showView(btn.dataset.goto);
  });

  // Add buttons
  $('#add-asset-btn').onclick = () => showAssetForm();
  $('#add-contact-btn').onclick = () => showContactForm();
  $('#add-wish-btn').onclick = () => showWishForm();

  // Check-in
  $('#do-checkin').onclick = () => {
    data.settings.lastCheckin = new Date().toISOString();
    saveData();
    alert('Checked in. Glad you\'re here.');
  };

  // Settings
  $('#save-settings').onclick = () => {
    data.settings.checkinIntervalDays = parseInt($('#checkin-interval').value, 10);
    saveData();
    alert('Settings saved.');
  };

  $('#save-profile').onclick = () => {
    data.profile.name = $('#profile-name').value.trim();
    saveData();
    alert('Name updated.');
  };

  // Reset
  $('#reset-all').onclick = () => {
    if (confirm('Clear all data in this browser? This cannot be undone.')) {
      localStorage.removeItem(STORAGE_KEY);
      data = structuredClone(defaultData);
      location.reload();
    }
  };

  $('#logout-btn').onclick = () => {
    if (confirm('Reset the demo and return to the landing page?')) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  };

  // Modal close
  $('#modal-close').onclick = closeModal;
  $('#modal').onclick = (e) => {
    if (e.target === $('#modal')) closeModal();
  };

  // Delegated list actions
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === 'delete-asset') {
      if (confirm('Delete this asset?')) {
        data.assets = data.assets.filter(a => a.id !== id);
        saveData();
      }
    }
    if (action === 'edit-asset') {
      const asset = data.assets.find(a => a.id === id);
      if (asset) showAssetForm(asset);
    }
    if (action === 'delete-contact') {
      if (confirm('Remove this contact?')) {
        data.contacts = data.contacts.filter(c => c.id !== id);
        saveData();
      }
    }
    if (action === 'edit-contact') {
      const contact = data.contacts.find(c => c.id === id);
      if (contact) showContactForm(contact);
    }
    if (action === 'delete-wish') {
      if (confirm('Delete this wish?')) {
        data.wishes = data.wishes.filter(w => w.id !== id);
        saveData();
      }
    }
    if (action === 'edit-wish') {
      const wish = data.wishes.find(w => w.id === id);
      if (wish) showWishForm(wish);
    }
  });
});
