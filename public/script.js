const form = document.getElementById('form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new URLSearchParams();
  formData.append('user_input', form.user_input.value.trim());

  const res = await fetch('/', { method: 'POST', body: formData });
  const json = await res.json();

  if (json.success) {
    const username = json.unique_id;
    window.location.href = `/table/${username}`;
  }
});
