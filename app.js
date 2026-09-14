// Digital Legacy Planner - Fully functional with Firebase Auth + Firestore
// Flow: Landing page → Auth (if needed) → App

const {
  auth, db,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile,
  doc, getDoc, setDoc, updateDoc, collection, addDoc, deleteDoc, onSnapshot, query, orderBy
} = window.firebaseApp;

// ---------- State ----------
let currentUser = null;
let unsubscribeAssets = null;
let unsubscribeContacts = null;
let unsubscribeWishes = null;
let userProfile = { name: '', checkinIntervalDays: 30, lastCheckin: null };

// ---------- Helpers ----------
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }
function show(el) { if (el) el.classList.remove('hidden'); }
function hide(el) { if (el) el.classList.add('hidden'); }
function showLoading() { show($('#loading')); }
function hideLoading() { hide($('#loading')); }

function openModal(html) {
  $('#modal-body').innerHTML = html;
  show($('#modal'));
}
function closeModal() {
  hide($('#modal'));
  $('#modal-body').innerHTML = '';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showView(name) {
  $$('.view').forEach(v => hide(v));
  $$('.nav-btn').forEach(b => b.classList.remove('active'));
  const view = $(`#view-${name}`);
  if (view) show(view);
  const btn = $(`.nav-btn[data-view="${name}"]`);
  if (btn) btn.classList.add('active');
}

// ---------- Screen Management ----------
function showLanding() {
  hide($('#auth-screen'));
  hide($('#app'));
  show($('#landing'));
}

function showAuth(mode = 'login') {
  hide($('#landing'));
  hide($('#app'));
  show($('#auth-screen'));
  if (mode === 'signup') {
    hide($('#login-form'));
    show($('#signup-form'));
  } else {
    hide($('#signup-form'));
    show($('#login-form'));
  }
}

function showApp() {
  hide($('#landing'));
  hide($('#auth-screen'));
  show($('#app'));
  showView('dashboard');
}

// ---------- Auth Actions ----------
async function handleSignup() {
  const name = $('#signup-name').value.trim();
  const email = $('#signup-email').value.trim();
  const password = $('#signup-password').value;
  const errorEl = $('#signup-error');
  errorEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = 'Email and password are required.';
    return;
  }
  if (password.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters.';
    return;
  }

  showLoading();
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(cred.user, { displayName: name });
    }
    await setDoc(doc(db, 'users', cred.user.uid), {
      name: name || '',
      email: email,
      checkinIntervalDays: 30,
      lastCheckin: null,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    errorEl.textContent = friendlyAuthError(err);
  } finally {
    hideLoading();
  }
}

async function handleLogin() {
  const email = $('#login-email').value.trim();
  const password = $('#login-password').value;
  const errorEl = $('#login-error');
  errorEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = 'Email and password are required.';
    return;
  }

  showLoading();
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    errorEl.textContent = friendlyAuthError(err);
  } finally {
    hideLoading();
  }
}

async function handleLogout() {
  showLoading();
  try {
    if (unsubscribeAssets) unsubscribeAssets();
    if (unsubscribeContacts) unsubscribeContacts();
    if (unsubscribeWishes) unsubscribeWishes();
    await signOut(auth);
  } finally {
    hideLoading();
  }
}

function friendlyAuthError(err) {
  const code = err.code || '';
  if (code.includes('email-already-in-use')) return 'This email is already registered.';
  if (code.includes('invalid-email')) return 'Please enter a valid email.';
  if (code.includes('weak-password')) return 'Password is too weak.';
  if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) {
    return 'Incorrect email or password.';
  }
  if (code.includes('too-many-requests')) return 'Too many attempts. Please try again later.';
  return err.message || 'Something went wrong. Please try again.';
}

// ---------- Data Layer ----------
async function loadUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) {
    userProfile = snap.data();
  } else {
    userProfile = { name: currentUser.displayName || '', email: currentUser.email, checkinIntervalDays: 30, lastCheckin: null };
    await setDoc(doc(db, 'users', uid), userProfile);
  }
  updateProfileUI();
}

function updateProfileUI() {
  const name = userProfile.name || currentUser.displayName || currentUser.email.split('@')[0];
  $('#user-greeting').textContent = `Hi, ${name}`;
  $('#profile-name').value = userProfile.name || '';
  $('#checkin-interval').value = userProfile.checkinIntervalDays || 30;
  $('#account-email').textContent = currentUser.email;

  const statusEl = $('#checkin-status');
  if (userProfile.lastCheckin) {
    const last = new Date(userProfile.lastCheckin);
    const next = new Date(last);
    next.setDate(next.getDate() + (userProfile.checkinIntervalDays || 30));
    const daysLeft = Math.ceil((next - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0) {
      statusEl.textContent = `Last check-in: ${last.toLocaleDateString()}. Next suggested in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`;
    } else {
      statusEl.textContent = `Check-in is due. Last one was ${last.toLocaleDateString()}.`;
    }
  } else {
    statusEl.textContent = "You haven't checked in yet. Tap the button below when you're ready.";
  }
}

function startListeners(uid) {
  const assetsRef = collection(db, 'users', uid, 'assets');
  unsubscribeAssets = onSnapshot(query(assetsRef, orderBy('createdAt', 'desc')), (snap) => {
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    renderAssets(items);
    $('#stat-assets').textContent = items.length;
  });

  const contactsRef = collection(db, 'users', uid, 'contacts');
  unsubscribeContacts = onSnapshot(query(contactsRef, orderBy('createdAt', 'desc')), (snap) => {
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    renderContacts(items);
    $('#stat-contacts').textContent = items.length;
  });

  const wishesRef = collection(db, 'users', uid, 'wishes');
  unsubscribeWishes = onSnapshot(query(wishesRef, orderBy('createdAt', 'desc')), (snap) => {
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    renderWishes(items);
    $('#stat-wishes').textContent = items.length;
  });
}

// ---------- Render Lists ----------
function renderAssets(items) {
  const list = $('#assets-list');
  if (items.length === 0) {
    list.innerHTML = '<div class="empty-state">No assets yet. Add accounts, subscriptions, photo libraries, or anything important.</div>';
    return;
  }
  list.innerHTML = items.map(a => `
    <div class="list-item">
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

function renderContacts(items) {
  const list = $('#contacts-list');
  if (items.length === 0) {
    list.innerHTML = '<div class="empty-state">No trusted contacts yet. Add people who should be notified if needed.</div>';
    return;
  }
  list.innerHTML = items.map(c => `
    <div class="list-item">
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

function renderWishes(items) {
  const list = $('#wishes-list');
  if (items.length === 0) {
    list.innerHTML = '<div class="empty-state">No wishes written yet. Add plain-language instructions for what should happen.</div>';
    return;
  }
  list.innerHTML = items.map(w => `
    <div class="list-item">
      <div class="list-item-content">
        <h3>${escapeHtml(w.title)}</h3>
        <p>${escapeHtml(w.body || '').substring(0, 140)}${(w.body || '').length > 140 ? '…' : ''}</p>
      </div>
      <div class="list-item-actions">
        <button data-action="edit-wish" data-id="${w.id}">Edit</button>
        <button data-action="delete-wish" data-id="${w.id}">Delete</button>
      </div>
    </div>
  `).join('');
}

// ---------- CRUD ----------
async function addAsset(data) {
  await addDoc(collection(db, 'users', currentUser.uid, 'assets'), {
    ...data,
    createdAt: new Date().toISOString()
  });
}
async function updateAsset(id, data) {
  await updateDoc(doc(db, 'users', currentUser.uid, 'assets', id), data);
}
async function deleteAsset(id) {
  await deleteDoc(doc(db, 'users', currentUser.uid, 'assets', id));
}

async function addContact(data) {
  await addDoc(collection(db, 'users', currentUser.uid, 'contacts'), {
    ...data,
    createdAt: new Date().toISOString()
  });
}
async function updateContact(id, data) {
  await updateDoc(doc(db, 'users', currentUser.uid, 'contacts', id), data);
}
async function deleteContact(id) {
  await deleteDoc(doc(db, 'users', currentUser.uid, 'contacts', id));
}

async function addWish(data) {
  await addDoc(collection(db, 'users', currentUser.uid, 'wishes'), {
    ...data,
    createdAt: new Date().toISOString()
  });
}
async function updateWish(id, data) {
  await updateDoc(doc(db, 'users', currentUser.uid, 'wishes', id), data);
}
async function deleteWish(id) {
  await deleteDoc(doc(db, 'users', currentUser.uid, 'wishes', id));
}

// ---------- Forms ----------
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

  $('#asset-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      name: fd.get('name').trim(),
      type: fd.get('type'),
      notes: fd.get('notes').trim()
    };
    showLoading();
    try {
      if (isEdit) await updateAsset(asset.id, payload);
      else await addAsset(payload);
      closeModal();
    } catch (err) {
      alert('Error saving: ' + err.message);
    } finally {
      hideLoading();
    }
  };
  $('#cancel-modal').onclick = closeModal;
}

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

  $('#contact-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      name: fd.get('name').trim(),
      email: fd.get('email').trim(),
      phone: fd.get('phone').trim(),
      relation: fd.get('relation').trim()
    };
    showLoading();
    try {
      if (isEdit) await updateContact(contact.id, payload);
      else await addContact(payload);
      closeModal();
    } catch (err) {
      alert('Error saving: ' + err.message);
    } finally {
      hideLoading();
    }
  };
  $('#cancel-modal').onclick = closeModal;
}

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

  $('#wish-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      title: fd.get('title').trim(),
      body: fd.get('body').trim()
    };
    showLoading();
    try {
      if (isEdit) await updateWish(wish.id, payload);
      else await addWish(payload);
      closeModal();
    } catch (err) {
      alert('Error saving: ' + err.message);
    } finally {
      hideLoading();
    }
  };
  $('#cancel-modal').onclick = closeModal;
}

// ---------- Auth State ----------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    showLoading();
    try {
      await loadUserProfile(user.uid);
      startListeners(user.uid);
      showApp();
    } catch (err) {
      console.error(err);
      alert('Failed to load your data. Please refresh.');
    } finally {
      hideLoading();
    }
  } else {
    currentUser = null;
    showLanding(); // Always start on the landing page when logged out
  }
});

// ---------- Event Bindings ----------
document.addEventListener('DOMContentLoaded', () => {
  // Landing page CTAs
  const goToSignup = () => showAuth('signup');
  const goToLogin = () => showAuth('login');

  $('#landing-start-btn').onclick = goToSignup;
  $('#landing-start-btn-2').onclick = goToSignup;
  $('#landing-start-btn-3').onclick = goToSignup;
  $('#landing-login-btn').onclick = goToLogin;
  $('#landing-login-link').onclick = (e) => { e.preventDefault(); goToLogin(); };

  // Back to landing from auth
  $('#back-to-landing').onclick = (e) => { e.preventDefault(); showLanding(); };
  $('#back-to-landing-2').onclick = (e) => { e.preventDefault(); showLanding(); };

  // Auth form switching
  $('#show-signup').onclick = (e) => {
    e.preventDefault();
    hide($('#login-form'));
    show($('#signup-form'));
    $('#signup-error').textContent = '';
  };
  $('#show-login').onclick = (e) => {
    e.preventDefault();
    hide($('#signup-form'));
    show($('#login-form'));
    $('#login-error').textContent = '';
  };

  $('#signup-btn').onclick = handleSignup;
  $('#login-btn').onclick = handleLogin;
  $('#logout-btn').onclick = handleLogout;
  $('#logout-btn-2').onclick = handleLogout;

  // Navigation
  $$('.nav-btn').forEach(btn => {
    btn.onclick = () => showView(btn.dataset.view);
  });

  $$('[data-goto]').forEach(btn => {
    btn.onclick = () => showView(btn.dataset.goto);
  });

  // Add buttons
  $('#add-asset-btn').onclick = () => showAssetForm();
  $('#add-contact-btn').onclick = () => showContactForm();
  $('#add-wish-btn').onclick = () => showWishForm();

  // Check-in
  $('#do-checkin').onclick = async () => {
    showLoading();
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'users', currentUser.uid), { lastCheckin: now });
      userProfile.lastCheckin = now;
      updateProfileUI();
    } catch (err) {
      alert('Could not save check-in: ' + err.message);
    } finally {
      hideLoading();
    }
  };

  // Settings
  $('#save-settings').onclick = async () => {
    const days = parseInt($('#checkin-interval').value, 10);
    showLoading();
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { checkinIntervalDays: days });
      userProfile.checkinIntervalDays = days;
      updateProfileUI();
      alert('Settings saved.');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      hideLoading();
    }
  };

  $('#save-profile').onclick = async () => {
    const name = $('#profile-name').value.trim();
    showLoading();
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { name });
      if (name) await updateProfile(currentUser, { displayName: name });
      userProfile.name = name;
      updateProfileUI();
      alert('Name updated.');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      hideLoading();
    }
  };

  // Modal
  $('#modal-close').onclick = closeModal;
  $('#modal').onclick = (e) => { if (e.target === $('#modal')) closeModal(); };

  // Delegated actions
  document.body.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === 'delete-asset') {
      if (confirm('Delete this asset?')) {
        showLoading();
        try { await deleteAsset(id); } finally { hideLoading(); }
      }
    }
    if (action === 'edit-asset') {
      showAssetForm({ id, name: '', type: 'Account', notes: '' });
    }
    if (action === 'delete-contact') {
      if (confirm('Remove this contact?')) {
        showLoading();
        try { await deleteContact(id); } finally { hideLoading(); }
      }
    }
    if (action === 'edit-contact') {
      showContactForm({ id, name: '', email: '', phone: '', relation: '' });
    }
    if (action === 'delete-wish') {
      if (confirm('Delete this wish?')) {
        showLoading();
        try { await deleteWish(id); } finally { hideLoading(); }
      }
    }
    if (action === 'edit-wish') {
      showWishForm({ id, title: '', body: '' });
    }
  });
});
