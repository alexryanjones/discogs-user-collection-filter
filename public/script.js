const form = document.getElementById('form');
const message = document.getElementById('message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  message.textContent = 'Submitting...';

  const formData = new URLSearchParams();
  formData.append('user_input', form.user_input.value.trim());

  const res = await fetch('/', { method: 'POST', body: formData });
  const data = await res.json();

  message.textContent = data.message;

  if (data.success) {
    const username = data.unique_id;
    window.location.href = `/table/${username}`;
  }
});
