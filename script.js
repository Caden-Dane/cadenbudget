/*
 * Personal Budget Tracker - Multi-User Version
 * Each user has separate budget data stored in memory
 */
(function () {
  'use strict';

  // Data will be stored in memory during session
  const userData = {
    user1: null,
    user2: null
  };
  
  let currentUser = 'user1';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    loadAllUsers();
    setupEventListeners();
    updateUI();
  }

  function loadAllUsers() {
    // Initialize data for both users if not exists
    if (!userData.user1) userData.user1 = createNewBudgetData();
    if (!userData.user2) userData.user2 = createNewBudgetData();
  }

  function getCurrentData() {
    return userData[currentUser];
  }

  function createNewBudgetData() {
    return {
      income: 0,
      expenses: [],
      limits: {}
    };
  }

  function setupEventListeners() {
    // User selector
    document.getElementById('user-select').addEventListener('change', (e) => {
      currentUser = e.target.value;
      updateUI();
    });

    // Income form
    document.getElementById('income-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const amountInput = document.getElementById('income-amount');
      const amount = parseFloat(amountInput.value);
      if (isInvalidAmount(amount)) {
        alert('Please enter a valid income amount greater than 0.');
        amountInput.focus();
        return;
      }
      getCurrentData().income += amount;
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
        categoryEl.focus();
        return;
      }
      if (isInvalidAmount(amount)) {
        alert('Please enter a valid expense amount greater than 0.');
        amountEl.focus();
        return;
      }

      const budgetData = getCurrentData();
      const spentNow = getSpentByCategory()[category] || 0;
      const limit = budgetData.limits[category];
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

      budgetData.expenses.push({
        id: generateId(),
        date: new Date().toISOString().slice(0, 10),
        category,
        amount,
        note
      });

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
        categoryInput.focus();
        return;
      }
      if (isNaN(limit) || limit < 0) {
        alert('Please enter a valid limit (0 or greater).');
        amountInput.focus();
        return;
      }

      getCurrentData().limits[category] = limit;
      categoryInput.value = '';
      amountInput.value = '';
      updateUI();
    });

    // Reset spending data
    document.getElementById('reset-spending').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all spending data (income and expenses)? Budget limits will be preserved. This cannot be undone.')) {
        const budgetData = getCurrentData();
        budgetData.income = 0;
        budgetData.expenses = [];
        updateUI();
      }
    });
  }

  function isInvalidAmount(n) {
    return isNaN(n) || n <= 0;
  }

  function generateId() {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  function getSpentByCategory() {
    const spent = {};
    const budgetData = getCurrentData();
    for (const exp of budgetData.expenses) {
      spent[exp.category] = (spent[exp.category] || 0) + exp.amount;
    }
    return spent;
  }

  function getTotalExpenses() {
    return getCurrentData().expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }

  function updateUI() {
    const budgetData = getCurrentData();
    
    // Update user selector
    document.getElementById('user-select').value = currentUser;

    // Summary
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpensesEl = document.getElementById('total-expenses');
    const remainingEl = document.getElementById('remaining-balance');
    const totalExpenses = getTotalExpenses();
    const remaining = budgetData.income - totalExpenses;

    totalIncomeEl.textContent = formatCurrency(budgetData.income);
    totalExpensesEl.textContent = formatCurrency(totalExpenses);
    remainingEl.textContent = formatCurrency(remaining);

    // Categories table
    const categoriesBody = document.querySelector('#categories-table tbody');
    categoriesBody.innerHTML = '';
    const spentByCat = getSpentByCategory();
    const categories = new Set([...Object.keys(budgetData.limits), ...Object.keys(spentByCat)]);

    if (categories.size === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 6;
      cell.textContent = 'No categories yet. Add expenses or set limits to begin.';
      row.appendChild(cell);
      categoriesBody.appendChild(row);
    } else {
      categories.forEach((cat) => {
        const spent = spentByCat[cat] || 0;
        const limit = budgetData.limits[cat];
        const row = document.createElement('tr');
        if (limit !== undefined && spent > limit) row.classList.add('over-limit');

        // Category
        const catCell = document.createElement('td');
        catCell.textContent = cat;
        row.appendChild(catCell);

        // Spent
        const spentCell = document.createElement('td');
        spentCell.textContent = formatCurrency(spent);
        row.appendChild(spentCell);

        // Limit
        const limitCell = document.createElement('td');
        limitCell.textContent = limit !== undefined ? formatCurrency(limit) : '—';
        row.appendChild(limitCell);

        // Remaining
        const remainingCell = document.createElement('td');
        remainingCell.textContent = limit !== undefined ? formatCurrency(limit - spent) : '—';
        row.appendChild(remainingCell);

        // Progress
        const progressCell = document.createElement('td');
        const progressWrapper = document.createElement('div');
        progressWrapper.className = 'progress';
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';

        let percent = 0;
        if (limit !== undefined && limit > 0) {
          percent = Math.min((spent / limit) * 100, 100);
        } else if (spent > 0) {
          percent = 100;
        }
        progressBar.style.width = percent + '%';

        // Colors for nearing/exceeding
        if (limit !== undefined && spent > limit) {
          progressBar.style.backgroundColor = '#d9534f'; // red
        } else if (limit !== undefined && spent > 0.9 * limit) {
          progressBar.style.backgroundColor = '#f0ad4e'; // orange
        }

        progressWrapper.appendChild(progressBar);
        progressCell.appendChild(progressWrapper);
        row.appendChild(progressCell);

        // Action - Delete limit button
        const actionCell = document.createElement('td');
        if (limit !== undefined) {
          const delBtn = document.createElement('button');
          delBtn.textContent = 'Delete Limit';
          delBtn.className = 'delete-btn';
          delBtn.addEventListener('click', () => deleteLimit(cat));
          actionCell.appendChild(delBtn);
        }
        row.appendChild(actionCell);

        categoriesBody.appendChild(row);
      });
    }

    // Expenses table
    const expensesBody = document.querySelector('#expenses-table tbody');
    expensesBody.innerHTML = '';
    if (budgetData.expenses.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.textContent = 'No expenses recorded.';
      row.appendChild(cell);
      expensesBody.appendChild(row);
    } else {
      const sorted = budgetData.expenses.slice().sort((a, b) => b.date.localeCompare(a.date));
      sorted.forEach((exp) => {
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
        delBtn.addEventListener('click', () => deleteExpense(exp.id));
        actionCell.appendChild(delBtn);
        row.appendChild(actionCell);

        expensesBody.appendChild(row);
      });
    }
  }

  function deleteExpense(id) {
    const budgetData = getCurrentData();
    budgetData.expenses = budgetData.expenses.filter((exp) => exp.id !== id);
    updateUI();
  }

  function deleteLimit(category) {
    if (confirm(`Are you sure you want to delete the budget limit for "${category}"?`)) {
      const budgetData = getCurrentData();
      delete budgetData.limits[category];
      updateUI();
    }
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }
})();
