const form = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('http://localhost:5000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();

    if (result.success) {
      alert('Login successful!');
      window.location.href = '/dashboard.html'; // Điều hướng đến trang dashboard.html
    } else {
      errorMessage.textContent = result.message;
    }
  } catch (err) {
    errorMessage.textContent = "An error occurred. Please try again.";
  }
});