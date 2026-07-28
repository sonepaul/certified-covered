import './styles.css';
import { supabase } from './supabase.js';

// Mirror of the DB email-shape CHECK: non-space/@ , then @, domain, dot, TLD.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const form = document.getElementById('booking-form');
const statusEl = document.getElementById('form-status');
const submitBtn = document.getElementById('submit-btn');
const successEl = document.getElementById('book-success');
const certSelect = document.getElementById('certType');
const certOther = document.getElementById('certTypeOther');

// Footer year
document.getElementById('year').textContent = String(new Date().getFullYear());

// Reveal the free-text cert box only when "Something else…" is chosen.
certSelect.addEventListener('change', () => {
  const isOther = certSelect.value === '__other';
  certOther.classList.toggle('hidden', !isOther);
  if (isOther) certOther.focus();
  else certOther.value = '';
});

// ---- Field-level error helpers ----
function setFieldError(name, message) {
  const el = form.querySelector(`[data-error-for="${name}"]`);
  if (el) el.textContent = message || '';
  const input = form.elements[name];
  if (input && 'setAttribute' in input) {
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
}

function clearErrors() {
  ['orgName', 'contactName', 'teamSize', 'email', 'contact'].forEach((n) =>
    setFieldError(n, '')
  );
  statusEl.textContent = '';
  statusEl.classList.remove('error');
}

// ---- Read + normalize the form into the exact insert shape ----
// Empty date/number MUST be null (Postgres rejects '' for date/integer).
// Empty optional text is sent as null too, to keep the pipeline tidy.
function readForm() {
  const val = (name) => (form.elements[name]?.value ?? '').trim();

  let certType = certSelect.value;
  if (certType === '__other') certType = certOther.value.trim();
  else if (certType === '') certType = '';

  const teamSizeRaw = val('teamSize');

  return {
    orgName: val('orgName'),
    contactName: val('contactName'),
    teamSizeRaw,
    certType,
    deadlineDate: val('deadlineDate'),
    phone: val('phone'),
    email: val('email'),
  };
}

// ---- Front-end validation mirroring the 5 DB constraints ----
// Returns true if valid; otherwise paints field errors and returns false.
function validate(f) {
  let ok = true;
  let firstBad = null;

  if (!f.orgName) {
    setFieldError('orgName', 'Please enter your organization name.');
    ok = false;
    firstBad = firstBad || 'orgName';
  }
  if (!f.contactName) {
    setFieldError('contactName', 'Please enter your name.');
    ok = false;
    firstBad = firstBad || 'contactName';
  }

  // team_size: optional, but if present must be a whole number > 0.
  if (f.teamSizeRaw !== '') {
    const n = Number(f.teamSizeRaw);
    if (!Number.isInteger(n) || n <= 0) {
      setFieldError('teamSize', 'Enter a whole number greater than 0, or leave it blank.');
      ok = false;
      firstBad = firstBad || 'teamSize';
    }
  }

  // email: optional, but if present must look like an email.
  if (f.email !== '' && !EMAIL_RE.test(f.email)) {
    setFieldError('email', 'That email doesn’t look right.');
    ok = false;
    firstBad = firstBad || 'email';
  }

  // at least one of email / phone must be present.
  if (f.email === '' && f.phone === '') {
    setFieldError('contact', 'Add an email or a phone number so we can reach you.');
    ok = false;
    firstBad = firstBad || 'email';
  }

  if (firstBad && form.elements[firstBad]) form.elements[firstBad].focus();
  return ok;
}

// ---- Build the payload: EXACTLY the 7 granted columns, nothing else ----
// No id / status / created_at (anon has no grant on them — including them,
// even as null, is rejected). No .select() is ever chained (no read grant).
function toPayload(f) {
  return {
    org_name: f.orgName,
    contact_name: f.contactName,
    team_size: f.teamSizeRaw ? Number(f.teamSizeRaw) : null,
    cert_type: f.certType || null,
    deadline_date: f.deadlineDate || null,
    phone: f.phone || null,
    email: f.email || null,
  };
}

function setSubmitting(isSubmitting) {
  submitBtn.disabled = isSubmitting;
  submitBtn.textContent = isSubmitting ? 'Sending…' : 'Book your class';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearErrors();

  const f = readForm();
  if (!validate(f)) {
    statusEl.textContent = 'Please fix the highlighted fields.';
    statusEl.classList.add('error');
    return;
  }

  setSubmitting(true);
  try {
    // Insert-and-check-error only. Do NOT chain .select() — anon can't read.
    const { error } = await supabase.from('bookings').insert(toPayload(f));

    if (error) {
      // Log the real error for debugging; show the user a friendly message.
      console.error('Booking insert failed:', error);
      statusEl.textContent =
        'Something went wrong sending that. Please try again in a moment.';
      statusEl.classList.add('error');
      setSubmitting(false);
      return;
    }

    // Success — swap the form out for the confirmation state.
    form.classList.add('hidden');
    successEl.classList.remove('hidden');
    successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    // Network / unexpected failure.
    console.error('Booking insert threw:', err);
    statusEl.textContent =
      'We couldn’t reach the server. Check your connection and try again.';
    statusEl.classList.add('error');
    setSubmitting(false);
  }
});
