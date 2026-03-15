/**
 * consultation-form.js
 * Handles validation + submission for the Kondamaal Talent Pool consultation form.
 *
 * REQUIRED FIELD DECISIONS (client-facing form):
 *  Section 1 — Company    : companyName ✓ | industry ✓ | countryTimezone ✓
 *  Section 2 — Contact    : name ✓ | email ✓ | whatsapp ✓ | commPlatform (select — always has value)
 *  Section 3 — Project    : roleSkill ✓ | goal ✓ | problemDescription ✓ (min 20 chars)
 *  Section 4 — Technical  : all optional (context info, not blocking)
 *  Section 5 — Engagement : all optional (helpful but not mandatory to book)
 *  Section 6 — Logistics  : preferredDateTime ✓
 *  Section 7 — Notes      : all optional
 */

const WEBHOOK_URL = 'https://n8n.srv1198607.hstgr.cloud/webhook/book-kondamaal-consultation';

/* ─── Validation rules ────────────────────────────────────────────────────── */
const RULES = [
    // Section 1
    { name: 'companyName', type: 'required', message: 'Company name is required.' },
    { name: 'industry', type: 'required', message: 'Please enter your industry type.' },
    { name: 'countryTimezone', type: 'required', message: 'Country & time zone is required so we can schedule correctly.' },

    // Section 2
    { name: 'name', type: 'required', message: 'Please enter the primary contact\'s full name.' },
    { name: 'email', type: 'required', message: 'Email address is required.' },
    { name: 'email', type: 'email', message: 'Please enter a valid email address (e.g. name@company.com).' },
    { name: 'whatsapp', type: 'required', message: 'Phone / WhatsApp number is required.' },
    { name: 'whatsapp', type: 'phone', message: 'Enter a valid phone number. Digits, spaces, +, -, and () are allowed.' },

    // Section 3
    { name: 'roleSkill', type: 'required', message: 'Please tell us what role or skill you are looking for.' },
    { name: 'goal', type: 'required', message: 'Please describe your expected outcome or goal.' },
    { name: 'problemDescription', type: 'required', message: 'Please describe the problem you want solved.' },
    { name: 'problemDescription', type: 'minlength', min: 20, message: 'Please give a bit more detail — at least 20 characters.' },

    // Section 6
    { name: 'preferredDateTime', type: 'datetime', message: 'Please select your preferred date and time for the consultation.' },
];

/* ─── Validator functions ─────────────────────────────────────────────────── */
const VALIDATORS = {
    required: (val) => val.trim() !== '',
    email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()),
    phone: (val) => /^[\d\s+\-()\[\]]{6,20}$/.test(val.trim()),
    datetime: (val) => val.trim() !== '',
    minlength: (val, min) => val.trim().length >= min,
};

function passes(rule, val) {
    if (rule.type === 'minlength') return VALIDATORS.minlength(val, rule.min);
    return VALIDATORS[rule.type](val);
}

/* ─── Error DOM helpers ───────────────────────────────────────────────────── */
function getInput(name) { return document.querySelector(`[name="${name}"]`); }
function getErrorEl(name) { return document.getElementById(`error-${name}`); }

function showError(name, msg) {
    const el = getErrorEl(name);
    if (el) { el.textContent = msg; el.setAttribute('aria-live', 'polite'); }
    const inp = getInput(name);
    if (inp) inp.classList.add('input-error');
}

function clearError(name) {
    const el = getErrorEl(name);
    if (el) el.textContent = '';
    const inp = getInput(name);
    if (inp) inp.classList.remove('input-error');
}

function clearAllErrors() {
    document.querySelectorAll('[id^="error-"]').forEach(el => el.textContent = '');
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
}

/* ─── Full form validation ────────────────────────────────────────────────── */
function validateForm(fd) {
    clearAllErrors();
    const failed = new Set();
    let firstErrorField = null;

    for (const rule of RULES) {
        if (failed.has(rule.name)) continue; // one error per field at a time
        const val = fd.get(rule.name) || '';
        if (!passes(rule, val)) {
            showError(rule.name, rule.message);
            failed.add(rule.name);
            if (!firstErrorField) firstErrorField = rule.name;
        }
    }

    if (firstErrorField) {
        const inp = getInput(firstErrorField);
        if (inp) { inp.scrollIntoView({ behavior: 'smooth', block: 'center' }); inp.focus(); }
    }

    return failed.size === 0;
}

/* ─── Live validation (blur + input) ─────────────────────────────────────── */
function attachLiveValidation() {
    const fieldNames = [...new Set(RULES.map(r => r.name))];

    fieldNames.forEach(name => {
        const inp = getInput(name);
        if (!inp) return;

        // Clear error immediately when user types
        inp.addEventListener('input', () => clearError(name));

        // Validate on blur
        inp.addEventListener('blur', () => {
            const val = inp.value || '';
            const fieldRules = RULES.filter(r => r.name === name);
            for (const rule of fieldRules) {
                if (!passes(rule, val)) {
                    showError(name, rule.message);
                    return;
                }
            }
            clearError(name);
        });
    });
}

/* ─── Overlay ─────────────────────────────────────────────────────────────── */
function showOverlay({ icon, title, message }) {
    document.getElementById('overlay-icon').textContent = icon;
    document.getElementById('overlay-title').textContent = title;
    document.getElementById('overlay-msg').textContent = message;
    document.getElementById('submit-overlay').classList.add('active');
}

/* ─── Button state ────────────────────────────────────────────────────────── */
function setButtonState(btn, loading) {
    btn.disabled = loading;
    btn.innerHTML = loading
        ? '<span class="spinner"></span>Submitting…'
        : 'Submit Consultation Request';
}

/* ─── Pre-fill talent from URL param ─────────────────────────────────────── */
function prefillTalentParam() {
    const talent = new URLSearchParams(window.location.search).get('talent');
    if (talent) {
        const el = document.getElementById('talentPreference');
        if (el) el.value = talent;
    }
}

/* ─── Build payload ───────────────────────────────────────────────────────── */
function buildPayload(fd) {
    const pdt = fd.get('preferredDateTime') || '';
    const [bookingDate, bookingTime] = pdt ? pdt.split('T') : ['', ''];
    return {
        name: fd.get('name'),
        email: fd.get('email'),
        whatsapp: fd.get('whatsapp'),
        commPlatform: fd.get('commPlatform'),
        companyName: fd.get('companyName'),
        website: fd.get('website'),
        countryTimezone: fd.get('countryTimezone'),
        industry: fd.get('industry'),
        businessDescription: fd.get('businessDescription'),
        roleSkill: fd.get('roleSkill'),
        problemDescription: fd.get('problemDescription'),
        currentTools: fd.get('currentTools'),
        goal: fd.get('goal'),
        platformsToIntegrate: fd.get('platformsToIntegrate'),
        dataStorage: fd.get('dataStorage'),
        automationLevel: fd.get('automationLevel'),
        duration: fd.get('duration'),
        workingHours: fd.get('workingHours'),
        budget: fd.get('budget'),
        bookingDate,
        bookingTime,
        preferredDateTime: pdt,
        backupDateTime: fd.get('backupDateTime'),
        attendees: fd.get('attendees'),
        referenceLink: fd.get('referenceLink'),
        talentPreference: fd.get('talentPreference'),
        painPoints: fd.get('painPoints'),
        manualWorkflow: fd.get('manualWorkflow'),
        competitors: fd.get('competitors'),
        confidentiality: fd.get('confidentiality'),
        timestamp: new Date().toISOString(),
        source: 'kondamaal-consultation-form'
    };
}

/* ─── Submit handler ──────────────────────────────────────────────────────── */
async function handleFormSubmit(e) {
    e.preventDefault();
    const fd = new FormData(this);
    const btn = document.getElementById('submitBtn');

    if (!validateForm(fd)) return; // stop if validation fails

    setButtonState(btn, true);
    try {
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildPayload(fd))
        });
        showOverlay({
            icon: '✅',
            title: 'Request Submitted!',
            message: 'Thank you! A mentor will reach out to you shortly to confirm your consultation.'
        });
    } catch (err) {
        showOverlay({
            icon: '⚠️',
            title: 'Almost There!',
            message: "Your request may have been submitted. If you don't hear from us in 24 hours, please contact us directly."
        });
    }
    setButtonState(btn, false);
}

/* ─── Init ────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    prefillTalentParam();
    attachLiveValidation();
    const form = document.getElementById('consultationForm');
    if (form) form.addEventListener('submit', handleFormSubmit);
});