/*
 * Personal Budget Tracker - Multi-User Version
 * Each user has separate budget data stored in localStorage
 */
(function () {
  'use strict';

  // ---- Keys & user handling (hardened) ----
  const KEYS = { user1: 'budgetData_user1', user2: 'budgetData_user2' };
  const CURRENT_USER_KEY = 'currentUser';
  const VALID_USERS = new Set(['user1', 'user2']);

  // Coerce any unrecognised user back to 'user1'
  function sanitizeUser(u) {
    return VALID_USERS.has(u) ? u : 'user1';
  }

  // The currently-selected user (defaults to user1)
  let currentUser = 'user1';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    // Test localStorage availability
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
    } catch (e) {
      alert('Warning: localStorage is not available. Data will not be saved.');
    }

    // Load saved user preference (sanitized)
    currentUser = sanitizeUser(localStorage.getItem(CURRENT_USER_KEY));

    setupEventListeners();
    updateUI();
  }

  // Return the appropriate storage key for the current user
  function getStorageKey() {
    return KEYS[sanitizeUser(currentUser)];
  }

  // Read the current user's data from localStorage
  function getCurrentData() {
    const key = getStorageKey();
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Error parsing data:', e);
      }
    }
    // Default structure if none stored
    return { income: 0, expenses: [], limits: {} };
  }

  // Save the current user's data back to localStorage
  function saveCurrentData(data) {
    localStorage.setItem(getStorageKey(), JSON.stringify(data));
  }

  function setupEventListeners() {
    // User selector: sanitise the value before saving
    const userSelect = document.getElementById('user-select');
    if (userSelect) {
      userSelect.addEventListener('change', (e) => {
        currentUser = sanitizeUser(e.target.value);
        localStorage.setItem(CURRENT_USER_KEY, currentUser);
        updateUI();
      });
    }

    // Income form
    const incomeForm = document.getElementById('income-form');
    if (incomeForm) {
      incomeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amountInput = document.getElementById('income-amount');
        const amount = parseFloat(amountInput.value);
        if (isNaN(amount) || amount <= 0) {
          alert('Please enter a valid income amount greater than 0.');
          return;
        }
        const data = getCurrentData();
        data.income += amount;
        saveCurrentData(data);
        amountInput.value = '';
        updateUI();
      });
    }

    // Expense form
    const expenseForm = document.getElementById('expense-form');
    if (expenseForm) {
      expenseForm.addEventListener('submit', (e) => {
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

        // Reset warning
        warningEl.classList.add('hidden');
        warningEl.textContent = '';

        // Limit warnings
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
          category: category,
          amount: amount,
          note: note
        });

        saveCurrentData(data);
        categoryEl.value = '';
        amountEl.value = '';
        noteEl.value = '';
        updateUI();
      });
    }

    // Limit form
    const limitForm = document.getElementById('limit-form');
    if (limitForm) {
      limitForm.addEventListener('submit', (e) => {
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
        saveCurrentData(data);
        categoryInput.value = '';
        amountInput.value = '';
        updateUI();
      });
    }

    // Reset spending data
    const resetSpendingBtn = document.getElementById('reset-spending');
    if (resetSpendingBtn) {
      resetSpendingBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all spending data (income and expenses)? Budget limits will be preserved. This cannot be undone.')) {
          const data = getCurrentData();
          data.income = 0;
          data.expenses = [];
          saveCurrentData(data);
          updateUI();
        }
      });
    }

    // Reset budget progress (expenses only)
    const resetExpensesBtn = document.getElementById('reset-expenses');
    if (resetExpensesBtn) {
      resetExpensesBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset budget progress? This will clear all expenses but keep your income and budget limits. Perfect for starting a new month!')) {
          const data = getCurrentData();
          data.expenses = [];
          saveCurrentData(data);
          updateUI();
        }
      });
    }
  }

  // Summarize expenses by category
  function getSpentByCategory(data) {
    const spent = {};
    for (const exp of data.expenses) {
      if (!spent[exp.category]) {
        spent[exp.category] = 0;
      }
      spent[exp.category] += exp.amount;
    }
    return spent;
  }

  // Total of all expenses
  function getTotalExpenses(data) {
    return data.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }

  // Rebuild the UI for the current user
  function updateUI() {
    const data = getCurrentData();

    // Update the select to match the sanitized user
    const userSelect = document.getElementById('user-select');
    if (userSelect) {
      userSelect.value = sanitizeUser(currentUser);
    }

    const totalExpenses = getTotalExpenses(data);
    const remaining = data.income - totalExpenses;

    document.getElementById('total-income').textContent = formatCurrency(data.income);
    document.getElementById('total-expenses').textContent = formatCurrency(totalExpenses);
    document.getElementById('remaining-balance').textContent = formatCurrency(remaining);

    updateCategoriesTable(data);
    updateExpensesTable(data);
  }

  // Build the category overview table
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

    allCategories.forEach((cat) => {
      const spentAmount = spent[cat] || 0;
      const limitAmount = data.limits[cat];
      const row = document.createElement('tr');

      if (limitAmount !== undefined && spentAmount > limitAmount) {
        row.classList.add('over-limit');
      }

      // Category name
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
      remainingCell.textContent = limitAmount !== undefined ? formatCurrency(limitAmount - spentAmount) : '—';
      row.appendChild(remainingCell);

      // Progress bar
      const progressCell = document.createElement('td');
      const progressDiv = document.createElement('div');
      progressDiv.className = 'progress';
      const progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';

      let percent = 0;
      if (limitAmount !== undefined && limitAmount > 0) {
        percent = Math.min((spentAmount / limitAmount) * 100, 100);
      } else if (spentAmount > 0) {
        percent = 100;
      }
      progressBar.style.width = percent + '%';

      if (limitAmount !== undefined && spentAmount > limitAmount) {
        progressBar.style.backgroundColor = '#d9534f';
      } else if (limitAmount !== undefined && spentAmount > 0.9 * limitAmount) {
        progressBar.style.backgroundColor = '#f0ad4e';
      }

      progressDiv.appendChild(progressBar);
      progressCell.appendChild(progressDiv);
      row.appendChild(progressCell);

      // Delete limit button
      const actionCell = document.createElement('td');
      if (limitAmount !== undefined) {
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete Limit';
        delBtn.className = 'delete-btn';
        delBtn.onclick = function () {
          deleteLimit(cat);
        };
        actionCell.appendChild(delBtn);
      }
      row.appendChild(actionCell);

      tbody.appendChild(row);
    });
  }

  // Build the expenses history table
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

    // Sort newest to oldest
    const sorted = data.expenses.slice().sort((a, b) => b.date.localeCompare(a.date));

    for (const exp of sorted) {
      const row = document.createElement('tr');

      const dateCell = document.createElement('td');
      dateCell.textContent = exp.date;
      row.appendChild(dateCell);

      const catCell = document.createElement('td');
      catCell.textContent = exp.category;
      row.appendChild(catCell);

      const amtCell = document.createElement('td');
      amtCell.textContent = formatCurrency(exp.amount);
      row.appendChild(amtCell);

      const noteCell = document.createElement('td');
      noteCell.textContent = exp.note || '—';
      row.appendChild(noteCell);

      const actionCell = document.createElement('td');
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.className = 'delete-btn';
      delBtn.onclick = function () {
        deleteExpense(exp.id);
      };
      actionCell.appendChild(delBtn);
      row.appendChild(actionCell);

      tbody.appendChild(row);
    }
  }

  // Remove a single expense
  function deleteExpense(id) {
    const data = getCurrentData();
    data.expenses = data.expenses.filter((exp) => exp.id !== id);
    saveCurrentData(data);
    updateUI();
  }

  // Delete a category limit
  function deleteLimit(category) {
    if (confirm('Are you sure you want to delete the budget limit for "' + category + '"?')) {
      const data = getCurrentData();
      delete data.limits[category];
      saveCurrentData(data);
      updateUI();
    }
  }

  // Format numbers as currency
  function formatCurrency(amount) {
    const num = Number(amount) || 0;
    return '$' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
})();
