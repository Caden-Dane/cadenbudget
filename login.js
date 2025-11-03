/*
 * Budget Tracker Login — Two User Edition
 * Choose 'caden' or 'ciara' to log in instantly.
 */

const { auth, signInWithEmailAndPassword } = window.firebaseStuff;

// Define user credentials (must match Firebase Authentication users)
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
  console.log('login.js loaded, wiring up events');
  const btn = document.getElementById('login-btn');
  const input = document.getElementById('name-input');

  if (!btn || !input) {
    console.error('Login elements not found in DOM.');
    return;
  }

  btn.addEventListener('click', handleLogin);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
});

async function handleLogin() {
  const inputEl = document.getElementById('name-input');
  const status = document.getElementById('login-status');
  const nameInput = inputEl.value.trim().toLowerCase();

  if (!USERS[nameInput]) {
    status.textContent = 'Unknown user. Type "caden" or "ciara".';
    status.style.color = 'red';
    return;
  }

  const { email, password } = USERS[nameInput];

  status.textContent = 'Signing in...';
  status.style.color = '#333';

  try {
    console.log('Attempting sign-in for:', email);
    await signInWithEmailAndPassword(auth, email, password);
    console.log('Sign-in successful!');
    status.textContent = 'Success! Loading your budget...';
    status.style.color = 'green';

    setTimeout(() => {
      const basePath = window.location.pathname.replace('index.html', '');
      window.location.href = basePath + 'app.html';
    }, 800);
  } catch (err) {
    console.error('Firebase login error:', err);
    status.textContent = 'Error: ' + err.code + ' — ' + err.message;
    status.style.color = 'red';
  }
}
