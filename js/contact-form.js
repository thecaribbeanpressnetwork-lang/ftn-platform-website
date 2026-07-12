// FTN Platform Website — contact form handling.
// There is no backend to submit to yet, so this deliberately does not fake a
// "message sent" confirmation. It validates client-side, then tells the user
// honestly that submission isn't wired up and points them to direct contact
// details instead. Replace this once a real submission endpoint exists.
(function () {
  // Inquiry-category cards jump to the form with the matching category
  // already selected -- a real, working shortcut (not a claim that the
  // message itself is delivered or routed anywhere; that part is still
  // honestly unwired, see below).
  var categorySelect = document.getElementById('cf-category');
  if (categorySelect) {
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

    status.textContent = 'This form is not yet connected to a backend, so this message was not sent. Please use the direct contact details below instead.';
    status.classList.add('is-visible');
  });
})();
