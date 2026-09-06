// script.js
// Runs in the browser. Handles: button ripple animation, the "shake + please
// fill this field" animation, and talking to the server (server.js) to
// actually create accounts / log people in.

// ---------- Ripple effect on every .btn ----------
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn');
  if (!btn) return;

  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement('span');
  const size = Math.max(rect.width, rect.height);
  ripple.className = 'ripple';
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 550);
});

// ---------- Field validation (the shake + tooltip bubble) ----------
function markInvalid(fieldEl, message) {
  fieldEl.classList.add('invalid');
  const bubble = fieldEl.querySelector('.field-error');
  if (bubble) bubble.textContent = message;
  // restart the shake animation if the field is already marked invalid
  const row = fieldEl.querySelector('.input-row');
  row.style.animation = 'none';
  // eslint-disable-next-line no-unused-expressions
  row.offsetHeight; // forces the browser to notice the reset before re-adding it
  row.style.animation = '';
}

function clearInvalid(fieldEl) {
  fieldEl.classList.remove('invalid');
}

function validateForm(form) {
  let valid = true;
  form.querySelectorAll('.field').forEach((fieldEl) => {
    const input = fieldEl.querySelector('input');
    clearInvalid(fieldEl);
    if (!input.value.trim()) {
      markInvalid(fieldEl, 'Please fill in this field.');
      valid = false;
    } else if (input.type === 'email' && !input.value.includes('@')) {
      markInvalid(fieldEl, 'Please enter a valid email.');
      valid = false;
    } else if (input.dataset.minlength && input.value.length < Number(input.dataset.minlength)) {
      markInvalid(fieldEl, `Use at least ${input.dataset.minlength} characters.`);
      valid = false;
    }
  });
  return valid;
}

// clear the error the moment someone starts typing again
document.addEventListener('input', (e) => {
  const fieldEl = e.target.closest('.field');
  if (fieldEl) clearInvalid(fieldEl);
});

// ---------- Toast messages ----------
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

// ---------- Talking to the server ----------
async function submitForm(form, endpoint, onSuccess) {
  if (!validateForm(form)) return;

  const btn = form.querySelector('.btn-primary');
  btn.classList.add('loading');
  btn.disabled = true;

  const data = Object.fromEntries(new FormData(form).entries());

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (!res.ok) {
      showToast(result.error || 'Something went wrong.', true);
      return;
    }
    onSuccess(result);
  } catch (err) {
    showToast('Could not reach the server. Is it running?', true);
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

// ---------- Wire up whichever form exists on this page ----------
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitForm(loginForm, '/api/login', (result) => {
      showToast(result.message);
      setTimeout(() => (window.location.href = '/welcome.html'), 700);
    });
  });
}

const signupForm = document.getElementById('signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitForm(signupForm, '/api/signup', (result) => {
      showToast(result.message);
      setTimeout(() => (window.location.href = '/welcome.html'), 700);
    });
  });
}
