/*
 * Personal Budget Tracker - Firebase Cloud Version
 * Each user (anonymous or logged in) has separate budget data stored in Firestore.
 */

'use strict';

// Wait for Firebase objects from index.html
const { auth, signInAnonymously, db, doc, getDoc, setDoc } = window.firebaseStuff;

// Global variables
let firebaseUserId = null;
let inMemoryData = { income: 0, expenses: [], limits: {} };

// ---------------------- INIT ----------------------
document.addEventListener('DOMContentLoaded', () => {
  init().catch((err) => console.error('Init error:', err));
});

async function init() {
  // Sign in anonymously to get a unique user ID
  await ensureSignedIn();

  // Load any existing budget data from Firestore
  await loadDataFromServer();

  // Hook up UI listeners
  setupEventListeners();

  // Draw initial data
  updateUI();
}

// ---------------------- AUTH ----------------------
async function ensureSignedIn() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  firebaseUserId = auth.currentUser.uid;
  console.log('Signed in as user:', firebaseUserId);
}

// ---------------------- FIRESTORE I/O ----------------------
async function loadDataFromServer() {
  const ref = doc(db, 'budgets', firebaseUserId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    inMemoryData = snap.data();
    console.log('Loaded data from Firestore:', inMemoryData);
  } else {
    inMemoryData = { income: 0, expenses: [], limits: {} };
    console.log('No existing budget, starting fresh.');
  }
}

async function saveDataToServer() {
  const ref = doc(db, 'budgets', firebaseUserId);
  await setDoc(ref, inMemoryData);
  console.log('Saved data to Firestore.');
}

// ---------------------- HELPER FUNCTIONS ----------------------
function getCurrentData() {
  return inMemoryData;
}

async function saveCurrentData(data) {
  inMemoryData = data;
  await saveDataToServer();
}

// ---------------------- EVENT LISTENERS ----------------------
function setupEventListeners() {
  // Income form
  document.getElementById('income-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amountInput = document.getElementById('income-amount');
    const amount = parseFloat(amountInput.value);

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid income amount greater than 0.');
      return;
    }

    const data = getCurrentData();
    data.income += amount;
    await saveCurrentData(data);
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

    if (!category) {
      alert('Please enter an expense category.');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid expense amount greater than 0.');
      return;
    }

    const data = getCurrentData();
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
        warningEl.textContent = `Caution: You are close to reaching your limit for ${category}.`;
        warningEl.classList.remove('hidden');
      }
    }

    data.expenses.push({
      id: 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().slice(0, 10),
      category,
      amount,
      note,
    });

    await saveCurrentData(data);
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

    if (!category) {
      alert('Please enter a category for the limit.');
      return;
    }
    if (isNaN(limit) || limit < 0) {
      alert('Please enter a valid limit (0 or greater).');
      return;
    }

    const data = getCurrentData();
    data.limits[category] = limit;
    await saveCurrentData(data);
    categoryInput.value = '';
    amountInput.value = '';
    updateUI();
  });

  // Reset all data
  document.getElementById('reset-spending').addEventListener('click', async () => {
    if (confirm('Reset ALL spending data (income + expenses)? Limits stay.')) {
      const data = getCurrentData();
      data.income = 0;
      data.expenses = [];
      await saveCurrentData(data);
      updateUI();
    }
  });

  // Reset only expenses
  document.getElementById('reset-expenses').addEventListener('click', async () => {
    if (confirm('Reset expense list (keep income + limits)?')) {
      const data = getCurrentData();
      data.expenses = [];
      await saveCurrentData(data);
      updateUI();
    }
  });
}

// ---------------------- UI UPDATES ----------------------
function getSpentByCategory(data) {
  const spent = {};
  for (const exp of data.expenses) {
    spent[exp.category] = (spent[exp.category] || 0) + exp.amount;
  }
  return spent;
}

function getTotalExpenses(data) {
  return data.expenses.reduce((sum, exp) => sum + exp.amount, 0);
}

function updateUI() {
  const data = getCurrentData();

  const totalExpenses = getTotalExpenses(data);
  const remaining = data.income - totalExpenses;

  document.getElementById('total-income').textContent = formatCurrency(data.income);
  document.getElementById('total-expenses').textContent = formatCurrency(totalExpenses);
  document.getElementById('remaining-balance').textContent = formatCurrency(remaining);

  updateCategoriesTable(data);
  updateExpensesTable(data);
}

function updateCategoriesTable(data) {
  const tbody = document.querySelector('#categories-table tbody');
  tbody.innerHTML = '';

  const spent = getSpentByCategory(data);
  const allCategories = new Set([...Object.keys(data.limits), ...Object.keys(spent)]);

  if (allCategories.size === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.textContent = 'No categories yet. Add expenses or set limits to begin.';
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  for (const cat of allCategories) {
    const spentAmount = spent[cat] || 0;
    const limitAmount = data.limits[cat];

    const row = document.createElement('tr');
    if (limitAmount !== undefined && spentAmount > limitAmount) row.classList.add('over-limit');

    // Category
    const catCell = document.createElement('td');
    catCell.textContent = cat;
    row.appendChild(catCell);

    // Spent
    const spentCell = document.createElement('td');
    spentCell.textContent = formatCurrency(spentAmount);
    row.appendChild(spentCell);

    // Limit
    const limitCell = document.createElement('td');
    limitCell.textContent = limitAmount !== undefined ? formatCurrency(limitAmount) : '—';
    row.appendChild(limitCell);

    // Remaining
    const remainingCell = document.createElement('td');
    remainingCell.textContent = limitAmount !== undefined
      ? formatCurrency(limitAmount - spentAmount)
      : '—';
    row.appendChild(remainingCell);

    // Progress bar
    const progressCell = document.createElement('td');
    const progressDiv = document.createElement('div');
    progressDiv.className = 'progress';
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    let percent = 0;
    if (limitAmount !== undefined && limitAmount > 0)
      percent = Math.min((spentAmount / limitAmount) * 100, 100);
    else if (spentAmount > 0)
      percent = 100;

    progressBar.style.width = percent + '%';
    if (limitAmount !== undefined && spentAmount > limitAmount)
      progressBar.style.backgroundColor = '#d9534f';
    else if (limitAmount !== undefined && spentAmount > 0.9 * limitAmount)
      progressBar.style.backgroundColor = '#f0ad4e';

    progressDiv.appendChild(progressBar);
    progressCell.appendChild(progressDiv);
    row.appendChild(progressCell);

    // Delete limit button
    const actionCell = document.createElement('td');
    if (limitAmount !== undefined) {
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete Limit';
      delBtn.className = 'delete-btn';
      delBtn.onclick = async () => {
        if (confirm(`Delete limit for "${cat}"?`)) {
          delete data.limits[cat];
          await saveCurrentData(data);
          updateUI();
        }
      };
      actionCell.appendChild(delBtn);
    }
    row.appendChild(actionCell);
    tbody.appendChild(row);
  }
}

function updateExpensesTable(data) {
  const tbody = document.querySelector('#expenses-table tbody');
  tbody.innerHTML = '';

  if (data.expenses.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'No expenses recorded.';
    row.appendChild(cell);
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
      await saveCurrentData(data);
      updateUI();
    };
    tbody.appendChild(row);
  }
}

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return '$' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
