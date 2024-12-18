const form = document.getElementById('signup-form');
const errorMessage = document.getElementById('error-message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (password !== confirmPassword) {
    errorMessage.textContent = "Passwords do not match!";
    return;
  }

  try {
    const response = await fetch('http://localhost:5000/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (data.success) {
      alert("Sign up successful!");
      form.reset();
      errorMessage.textContent = '';
    } else {
      errorMessage.textContent = data.message;
    }
  } catch (err) {
    errorMessage.textContent = "An error occurred. Please try again.";
  }
});
