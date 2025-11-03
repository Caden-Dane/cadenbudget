/*
 * Budget Tracker Login — Two User Edition
 * Choose 'caden' or 'ciara' to log in instantly.
 */

const { auth, signInWithEmailAndPassword } = window.firebaseStuff;

// Define user credentials
const USERS = {
  caden: {
    email: "cadendane@gmail.com",
    password: "budget1234"
  },
  ciara: {
    email: "ciaraburrow7@gmail.com",
    password: "budget5678"
  }
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('name-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
});

async function handleLogin() {
  const nameInput = document.getElementById('name-input').value.trim().toLowerCase();
  const status = document.getElementById('login-status');

  if (!USERS[nameInput]) {
    status.textContent = 'Unknown user. Type "caden" or "ciara".';
    status.style.color = 'red';
    return;
  }

  const { email, password } = USERS[nameInput];
  status.textContent = 'Signing in...';
  status.style.color = '#333';

  try {
    await signInWithEmailAndPassword(auth, email, password);
    status.textContent = 'Success! Loading your budget...';
    status.style.color = 'green';
    setTimeout(() => {
      // Works for GitHub Pages regardless of subfolder name
      const basePath = window.location.pathname.replace('index.html', '');
      window.location.href = basePath + 'app.html';
    }, 800);
  } catch (err) {
    console.error('Login failed:', err);
    status.textContent = 'Login failed.';
    status.style.color = 'red';
  }
}
