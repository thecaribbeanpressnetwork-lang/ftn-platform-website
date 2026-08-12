// FTN Platform Website — contact form handling.
// Consequential contact submissions use the shared protected transaction pipeline.
(function () {
  // Inquiry-category cards jump to the form with the matching category
  // already selected -- a real, working shortcut (not a claim that the
  // message itself is delivered or routed anywhere; that part is still
  // honestly unwired, see below).
  var categorySelect = document.getElementById('cf-category');
  if (categorySelect) {
    var params = new URLSearchParams(window.location.search);
    var requestedCategory = params.get('category');
    if (requestedCategory && categorySelect.querySelector('option[value="' + CSS.escape(requestedCategory) + '"]')) {
      categorySelect.value = requestedCategory;
    }
    var requestedSubject = (params.get('subject') || '').trim();
    var messageField = document.getElementById('cf-message');
    if (requestedSubject && messageField && !messageField.value) messageField.value = requestedSubject + '\n\n';
    Array.prototype.forEach.call(document.querySelectorAll('[data-select-category]'), function (card) {
      card.addEventListener('click', function () {
        categorySelect.value = card.getAttribute('data-select-category');
      });
    });
  }

  var form = document.getElementById('contact-form-el');
  if (!form) return;

  var status = document.getElementById('contact-form-status');

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var valid = true;
    Array.prototype.forEach.call(form.querySelectorAll('[required]'), function (field) {
      var wrapper = field.closest('.form-field');
      var isValid = field.value.trim().length > 0 && field.checkValidity();
      if (wrapper) wrapper.setAttribute('data-invalid', String(!isValid));
      field.setAttribute('aria-invalid', String(!isValid));

      var errorId = field.getAttribute('aria-describedby');
      var errorEl = errorId ? document.getElementById(errorId) : null;
      if (errorEl) {
        errorEl.textContent = isValid
          ? ''
          : (field.type === 'email' && field.value.trim().length > 0
            ? 'Please enter a valid email address.'
            : 'This field is required.');
      }

      if (!isValid) valid = false;
    });

    if (!status) return;

    if (!valid) {
      status.textContent = 'Please fill in all required fields before sending.';
      status.classList.add('is-visible');
      return;
    }

    var payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      category: form.category.value,
      message: form.message.value.trim(),
      authorityConfirmed: !!form.authority.checked,
    };

    function showSaved(message) {
      status.textContent = message;
      status.classList.add('is-visible');
    }

    if (window.FTN && window.FTN.IntegrationAdapter) {
      var token = form.querySelector('[name="cf-turnstile-response"]');
      window.FTN.IntegrationAdapter.submit('contact', payload, { transaction:true, transactionType:'contact_enquiry', turnstileToken:token ? token.value : '' }).then(function (result) {
        if (!result.ok) { showSaved(result.message + ' No message was claimed as sent; use the email fallback if needed.'); return; }
        showSaved('FTN received this enquiry for review. Keep transaction ID ' + result.record.transactionId + '.');
        form.reset();
      });
    } else {
      showSaved('The secure submission service did not load, so this message was not sent. Please use the email fallback.');
    }
  });
})();
