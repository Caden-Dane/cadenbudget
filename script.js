/*
 * Personal Budget Tracker - Firestore Authenticated Version
 * Each signed-in user has separate budget data stored in Firestore.
 */

'use strict';

const { auth, db, doc, getDoc, setDoc } = window.firebaseStuff;

// ---------------------- GLOBAL DATA ----------------------
let userUid = null;
let data = { income: 0, expenses: [], limits: {} };

// ---------------------- INIT ----------------------
document.addEventListener('DOMContentLoaded', () => {
  init().catch((err) => console.error('Init error:', err));
});

async function init() {
  // Wait for user authentication
  await waitForUser();

  // Load their Firestore budget
  await loadDataFromServer();

  // Attach event listeners
  setupEventListeners();

  // Render UI
  updateUI();
}

// ---------------------- AUTH ----------------------
async function waitForUser() {
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.href = 'index.html';
        return;
      }
      userUid = user.uid;
      console.log('Logged in as:', user.email, userUid);
      unsubscribe();
      resolve();
    }, reject);
  });
}

// ---------------------- FIRESTORE I/O ----------------------
async function loadDataFromServer() {
  const ref = doc(db, 'budgets', userUid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    data = snap.data();
    console.log('Loaded from Firestore:', data);
  } else {
    data = { income: 0, expenses: [], limits: {} };
    await setDoc(ref, data);
    console.log('Initialized new Firestore document.');
  }
}

async function saveDataToServer() {
  if (!userUid) return;
  const ref = doc(db, 'budgets', userUid);
  await setDoc(ref, data);
  console.log('Saved to Firestore.');
}

// ---------------------- EVENT LISTENERS ----------------------
function setupEventListeners() {
  // Income form
  document.getElementById('income-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amountInput = document.getElementById('income-amount');
    const amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount <= 0) return alert('Please enter a valid income amount.');

    data.income += amount;
    await saveDataToServer();
    amountInput.value = '';
    updateUI();
  });

  // Expense form
  document.getElementById('expense-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const categoryEl = document.getElementById('expense-category');
    const amountEl = document.getElementById('expense-amount');
    const noteEl = document.getElementById('expense-note');
    const warningEl = document.getElementById('expense-warning');

    const category = categoryEl.value.trim();
    const amount = parseFloat(amountEl.value);
    const note = noteEl.value.trim();

    if (!category) return alert('Please enter a category.');
    if (isNaN(amount) || amount <= 0) return alert('Please enter a valid amount.');

    const spent = getSpentByCategory(data);
    const spentNow = spent[category] || 0;
    const limit = data.limits[category];
    const newSpent = spentNow + amount;

    warningEl.classList.add('hidden');
    warningEl.textContent = '';
    if (limit !== undefined) {
      if (newSpent > limit) {
        warningEl.textContent = `Warning: This expense will exceed your limit for ${category}.`;
        warningEl.classList.remove('hidden');
      } else if (newSpent > 0.9 * limit) {
        warningEl.textContent = `Caution: You are close to your limit for ${category}.`;
        warningEl.classList.remove('hidden');
      }
    }

    data.expenses.push({
      id: 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().slice(0, 10),
      category,
      amount,
      note
    });

    await saveDataToServer();
    categoryEl.value = '';
    amountEl.value = '';
    noteEl.value = '';
    updateUI();
  });

  // Limit form
  document.getElementById('limit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const categoryInput = document.getElementById('limit-category');
    const amountInput = document.getElementById('limit-amount');
    const category = categoryInput.value.trim();
    const limit = parseFloat(amountInput.value);

    if (!category) return alert('Please enter a category.');
    if (isNaN(limit) || limit < 0) return alert('Please enter a valid limit.');

    data.limits[category] = limit;
    await saveDataToServer();
    categoryInput.value = '';
    amountInput.value = '';
    updateUI();
  });

  // Reset income + expenses
  document.getElementById('reset-spending').addEventListener('click', async () => {
    if (!confirm('Reset ALL spending data (income + expenses)? Limits stay.')) return;
    data.income = 0;
    data.expenses = [];
    await saveDataToServer();
    updateUI();
  });

  // Reset only expenses
  document.getElementById('reset-expenses').addEventListener('click', async () => {
    if (!confirm('Reset expenses only (keep income + limits)?')) return;
    data.expenses = [];
    await saveDataToServer();
    updateUI();
  });
}

// ---------------------- UI ----------------------
function getSpentByCategory(d) {
  const spent = {};
  for (const exp of d.expenses) {
    spent[exp.category] = (spent[exp.category] || 0) + exp.amount;
  }
  return spent;
}

function getTotalExpenses(d) {
  return d.expenses.reduce((sum, exp) => sum + exp.amount, 0);
}

function updateUI() {
  const totalExpenses = getTotalExpenses(data);
  const remaining = data.income - totalExpenses;

  document.getElementById('total-income').textContent = formatCurrency(data.income);
  document.getElementById('total-expenses').textContent = formatCurrency(totalExpenses);
  document.getElementById('remaining-balance').textContent = formatCurrency(remaining);

  updateCategoriesTable();
  updateExpensesTable();
}

function updateCategoriesTable() {
  const tbody = document.querySelector('#categories-table tbody');
  tbody.innerHTML = '';
  const spent = getSpentByCategory(data);
  const allCats = new Set([...Object.keys(data.limits), ...Object.keys(spent)]);

  if (allCats.size === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="6">No categories yet. Add expenses or set limits to begin.</td>';
    tbody.appendChild(row);
    return;
  }

  for (const cat of allCats) {
    const spentAmt = spent[cat] || 0;
    const limitAmt = data.limits[cat];
    const row = document.createElement('tr');
    if (limitAmt !== undefined && spentAmt > limitAmt) row.classList.add('over-limit');

    const percent = limitAmt ? Math.min((spentAmt / limitAmt) * 100, 100) : 0;
    const barColor =
      limitAmt && spentAmt > limitAmt
        ? '#d9534f'
        : limitAmt && spentAmt > 0.9 * limitAmt
        ? '#f0ad4e'
        : '#2d86ff';

    row.innerHTML = `
      <td>${cat}</td>
      <td>${formatCurrency(spentAmt)}</td>
      <td>${limitAmt !== undefined ? formatCurrency(limitAmt) : '—'}</td>
      <td>${limitAmt !== undefined ? formatCurrency(limitAmt - spentAmt) : '—'}</td>
      <td>
        <div class="progress">
          <div class="progress-bar" style="width:${percent}%; background:${barColor};"></div>
        </div>
      </td>
      <td>${limitAmt !== undefined ? '<button class="delete-btn">Delete Limit</button>' : ''}</td>
    `;

    const delBtn = row.querySelector('.delete-btn');
    if (delBtn) {
      delBtn.onclick = async () => {
        if (confirm(`Delete limit for "${cat}"?`)) {
          delete data.limits[cat];
          await saveDataToServer();
          updateUI();
        }
      };
    }

    tbody.appendChild(row);
  }
}

function updateExpensesTable() {
  const tbody = document.querySelector('#expenses-table tbody');
  tbody.innerHTML = '';
  if (data.expenses.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5">No expenses recorded.</td>';
    tbody.appendChild(row);
    return;
  }

  const sorted = [...data.expenses].sort((a, b) => b.date.localeCompare(a.date));
  for (const exp of sorted) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${exp.date}</td>
      <td>${exp.category}</td>
      <td>${formatCurrency(exp.amount)}</td>
      <td>${exp.note || '—'}</td>
      <td><button class="delete-btn">Delete</button></td>
    `;
    row.querySelector('button').onclick = async () => {
      data.expenses = data.expenses.filter((e) => e.id !== exp.id);
      await saveDataToServer();
      updateUI();
    };
    tbody.appendChild(row);
  }
}

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return '$' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
