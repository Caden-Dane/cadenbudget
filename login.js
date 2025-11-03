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
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'center';
  container.style.marginTop = '20vh';

  container.innerHTML = `
    <h2>Budget Tracker Login</h2>
    <input id="name-input" type="text" placeholder="Type 'caden' or 'ciara'" style="padding:10px;font-size:1.2em;">
    <button id="login-btn" style="margin-top:10px;padding:8px 20px;font-size:1em;">Enter</button>
    <p id="login-status" style="margin-top:10px;color:#555;"></p>
  `;

  document.body.innerHTML = '';
  document.body.appendChild(container);

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
      window.location.href = '/cadenbudget/app.html';
    }, 800);
  } catch (err) {
    console.error('Login failed:', err);
    status.textContent = 'Login failed.';
    status.style.color = 'red';
  }
}
