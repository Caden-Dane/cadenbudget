/*
 * Personal Budget Tracker
 * Stores data in localStorage by month. Forms are handled with JS validation.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'budgetData';

  // Data shape:
  // {
  //   monthYear: 'YYYY-MM',
  //   income: Number,
  //   expenses: Array<{ id, date, category, amount, note }>,
  //   limits: { [category: string]: Number }
  // }
  let budgetData;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    loadData();
    checkMonthReset();
    setupEventListeners();
    updateUI();
  }

  function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        budgetData = JSON.parse(raw);
      } catch {
        budgetData = createNewBudgetData();
      }
    } else {
      budgetData = createNewBudgetData();
    }
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(budgetData));
  }

  function createNewBudgetData() {
    return {
      monthYear: getCurrentMonthYear(),
      income: 0,
      expenses: [],
      limits: {}
    };
  }

  function getCurrentMonthYear() {
    const now = new Date();
    return now.toISOString().slice(0, 7);
  }

  function checkMonthReset() {
    const current = getCurrentMonthYear();
    if (budgetData.monthYear !== current) {
      budgetData = createNewBudgetData();
      saveData();
      // Show a one-time reset notice
      const resetMessage = document.createElement('div');
      resetMessage.className = 'reset-message';
      resetMessage.textContent = 'New month detected. Budget data has been reset.';
      document.querySelector('.container').insertBefore(resetMessage, document.querySelector('#summary'));
      setTimeout(() => resetMessage.remove(), 6000);
    }
  }

  function setupEventListeners() {
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
      budgetData.income += amount;
      saveData();
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
      saveData();

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

      budgetData.limits[category] = limit;
      saveData();
      categoryInput.value = '';
      amountInput.value = '';
      updateUI();
    });

    // Reset month data
    document.getElementById('reset-data').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all data for this month? This cannot be undone.')) {
        budgetData = createNewBudgetData();
        saveData();
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
    for (const exp of budgetData.expenses) {
      spent[exp.category] = (spent[exp.category] || 0) + exp.amount;
    }
    return spent;
  }

  function getTotalExpenses() {
    return budgetData.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }

  function updateUI() {
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
      cell.colSpan = 5;
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
    budgetData.expenses = budgetData.expenses.filter((exp) => exp.id !== id);
    saveData();
    updateUI();
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }
})();
