/**
 * consultation-form.js
 * Handles form submission for the Kondamaal Freelancers consultation page.
 * POSTs all fields as JSON to the n8n webhook endpoint.
 */

const WEBHOOK_URL = 'https://n8n.srv1198607.hstgr.cloud/webhook/book-consultation';

/* ─── Utility ─────────────────────────────────────────────────────────────── */

function showOverlay({ icon, title, message }) {
    document.getElementById('overlay-icon').textContent  = icon;
    document.getElementById('overlay-title').textContent = title;
    document.getElementById('overlay-msg').textContent   = message;
    document.getElementById('submit-overlay').classList.add('active');
}

function setButtonState(btn, loading) {
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span>Submitting…';
    } else {
        btn.disabled = false;
        btn.innerHTML = 'Submit Consultation Request';
    }
}

/* ─── Pre-fill talent from URL param ──────────────────────────────────────── */

function prefillTalentParam() {
    const params      = new URLSearchParams(window.location.search);
    const talentParam = params.get('talent');
    if (talentParam) {
        const el = document.getElementById('talentPreference');
        if (el) el.value = talentParam;
    }
}

/* ─── Build payload from FormData ─────────────────────────────────────────── */

function buildPayload(fd) {
    // Split preferredDateTime into separate date + time for sheet compatibility
    const pdt = fd.get('preferredDateTime') || '';
    const [bookingDate, bookingTime] = pdt ? pdt.split('T') : ['', ''];

    return {
        // Contact / identity
        name:                fd.get('name'),
        email:               fd.get('email'),
        whatsapp:            fd.get('whatsapp'),
        commPlatform:        fd.get('commPlatform'),

        // Company
        companyName:         fd.get('companyName'),
        website:             fd.get('website'),
        countryTimezone:     fd.get('countryTimezone'),
        industry:            fd.get('industry'),
        businessDescription: fd.get('businessDescription'),

        // Project
        roleSkill:           fd.get('roleSkill'),
        problemDescription:  fd.get('problemDescription'),
        currentTools:        fd.get('currentTools'),
        goal:                fd.get('goal'),

        // Technical
        platformsToIntegrate: fd.get('platformsToIntegrate'),
        dataStorage:         fd.get('dataStorage'),
        automationLevel:     fd.get('automationLevel'),

        // Engagement
        duration:            fd.get('duration'),
        workingHours:        fd.get('workingHours'),
        budget:              fd.get('budget'),

        // Logistics
        bookingDate,
        bookingTime,
        preferredDateTime:   pdt,
        backupDateTime:      fd.get('backupDateTime'),
        attendees:           fd.get('attendees'),
        referenceLink:       fd.get('referenceLink'),
        talentPreference:    fd.get('talentPreference'),

        // Additional notes
        painPoints:          fd.get('painPoints'),
        manualWorkflow:      fd.get('manualWorkflow'),
        competitors:         fd.get('competitors'),
        confidentiality:     fd.get('confidentiality'),

        // Meta
        timestamp:           new Date().toISOString(),
        source:              'kondamaal-consultation-form'
    };
}

/* ─── Form submit handler ──────────────────────────────────────────────────── */

async function handleFormSubmit(e) {
    e.preventDefault();

    const btn     = document.getElementById('submitBtn');
    const payload = buildPayload(new FormData(this));

    setButtonState(btn, true);

    try {
        await fetch(WEBHOOK_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload)
        });

        showOverlay({
            icon:    '✅',
            title:   'Request Submitted!',
            message: 'Thank you! A mentor will reach out to you shortly to confirm your consultation.'
        });

    } catch (err) {
        // Network error fallback
        showOverlay({
            icon:    '⚠️',
            title:   'Almost There!',
            message: "Your request may have been submitted. If you don't hear from us in 24 hours, please contact us directly."
        });
    }

    setButtonState(btn, false);
}

/* ─── Init ─────────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
    prefillTalentParam();

    const form = document.getElementById('consultationForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
});