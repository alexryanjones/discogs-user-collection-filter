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
    const poll = setInterval(async () => {
      const status = await fetch(`/task_status/${username}`).then((r) =>
        r.json()
      );
      if (status.completed) {
        clearInterval(poll);
        window.location.href = `/table/${username}`;
      }
    }, 2000);
  }
});
