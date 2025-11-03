/*
 * Personal Budget Tracker - Multi-User Version
 * Each user has separate budget data stored in localStorage
 */
(function () {
  'use strict';

  const STORAGE_KEY_USER1 = 'budgetData_user1';
  const STORAGE_KEY_USER2 = 'budgetData_user2';
  const CURRENT_USER_KEY = 'currentUser';
  
  let currentUser = 'user1';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    // Test localStorage
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
    } catch (e) {
      alert('Warning: localStorage is not available. Data will not be saved.');
    }

    // Load saved user preference
    const savedUser = localStorage.getItem(CURRENT_USER_KEY);
    if (savedUser === 'user1' || savedUser === 'user2') {
      currentUser = savedUser;
    }
    
    setupEventListeners();
    updateUI();
  }

  function getStorageKey() {
    return currentUser === 'user1' ? STORAGE_KEY_USER1 : STORAGE_KEY_USER2;
  }

  function getCurrentData() {
    const key = getStorageKey();
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        return data;
      } catch (e) {
        console.error('Error parsing data:', e);
      }
    }
    return { income: 0, expenses: [], limits: {} };
  }

  function saveCurrentData(data) {
    const key = getStorageKey();
    localStorage.setItem(key, JSON.stringify(data));
  }

  function setupEventListeners() {
    // User selector
    document.getElementById('user-select').addEventListener('change', (e) => {
      currentUser = e.target.value;
      localStorage.setItem(CURRENT_USER_KEY, currentUser);
      updateUI();
    });

    // Income form
    document.getElementById('income-form').addEventListener('submit', (e) => {
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

    // Expense form
    document.getElementById('expense-form').addEventListener('submit', (e) => {
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

    // Limit form
    document.getElementById('limit-form').addEventListener('submit', (e) => {
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

    // Reset spending data
    document.getElementById('reset-spending').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all spending data (income and expenses)? Budget limits will be preserved. This cannot be undone.')) {
        const data = getCurrentData();
        data.income = 0;
        data.expenses = [];
        saveCurrentData(data);
        updateUI();
      }
    });

    // Reset budget progress
    document.getElementById('reset-expenses').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset budget progress? This will clear all expenses but keep your income and budget limits. Perfect for starting a new month!')) {
        const data = getCurrentData();
        data.expenses = [];
        saveCurrentData(data);
        updateUI();
      }
    });
  }

  function getSpentByCategory(data) {
    const spent = {};
    for (let i = 0; i < data.expenses.length; i++) {
      const exp = data.expenses[i];
      if (!spent[exp.category]) {
        spent[exp.category] = 0;
      }
      spent[exp.category] += exp.amount;
    }
    return spent;
  }

  function getTotalExpenses(data) {
    let total = 0;
    for (let i = 0; i < data.expenses.length; i++) {
      total += data.expenses[i].amount;
    }
    return total;
  }

  function updateUI() {
    const data = getCurrentData();
    
    document.getElementById('user-select').value = currentUser;

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
        delBtn.onclick = function() { deleteLimit(cat); };
        actionCell.appendChild(delBtn);
      }
      row.appendChild(actionCell);

      tbody.appendChild(row);
    });
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

    const sorted = data.expenses.slice().sort((a, b) => {
      return b.date.localeCompare(a.date);
    });

    for (let i = 0; i < sorted.length; i++) {
      const exp = sorted[i];
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
      delBtn.onclick = function() { deleteExpense(exp.id); };
      actionCell.appendChild(delBtn);
      row.appendChild(actionCell);

      tbody.appendChild(row);
    }
  }

  function deleteExpense(id) {
    const data = getCurrentData();
    data.expenses = data.expenses.filter((exp) => exp.id !== id);
    saveCurrentData(data);
    updateUI();
  }

  function deleteLimit(category) {
    if (confirm('Are you sure you want to delete the budget limit for "' + category + '"?')) {
      const data = getCurrentData();
      delete data.limits[category];
      saveCurrentData(data);
      updateUI();
    }
  }

  function formatCurrency(amount) {
    return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
})();
