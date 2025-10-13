/*
 * Personal Budget Tracker
 *
 * This script manages the state of the budget app using browser localStorage.
 * It allows users to record income and expenses, set monthly spending limits
 * for categories, and displays warnings when those limits are approached or
 * exceeded. Data resets automatically at the start of a new month.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'budgetData';

  /**
   * Holds the current budget data for this month. Structure:
   * {
   *   monthYear: 'YYYY-MM',
   *   income: Number,
   *   expenses: Array<{ id, date, category, amount, note }>,
   *   limits: { [category: string]: Number }
   * }
   */
  let budgetData;

  /**
   * Initialize the app: load data, check month reset, set up event listeners and render UI.
   */
  function init() {
    loadData();
    checkMonthReset();
    setupEventListeners();
    updateUI();
  }

  /**
   * Load data from localStorage or initialize a fresh record.
   */
  function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        budgetData = JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse stored data, initializing new data.', e);
        budgetData = createNewBudgetData();
      }
    } else {
      budgetData = createNewBudgetData();
    }
  }

  /**
   * Save current budget data to localStorage.
   */
  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(budgetData));
  }

  /**
   * Return a new budget data object for the current month.
   */
  function createNewBudgetData() {
    return {
      monthYear: getCurrentMonthYear(),
      income: 0,
      expenses: [],
      limits: {}
    };
  }

  /**
   * Get the current month-year string in format YYYY-MM.
   */
  function getCurrentMonthYear() {
    const now = new Date();
    return now.toISOString().slice(0, 7);
  }

  /**
   * If stored data is from a previous month, reset the data for the new month.
   */
  function checkMonthReset() {
    const current = getCurrentMonthYear();
    if (budgetData.monthYear !== current) {
      // Save previous month data? Could be extended to store history.
      budgetData = createNewBudgetData();
      saveData();
      // Inform user about reset via alert within the page.
      const resetMessage = document.createElement('div');
      resetMessage.className = 'reset-message';
      resetMessage.textContent = 'New month detected. Budget data has been reset.';
      document.querySelector('.container').insertBefore(resetMessage, document.querySelector('#summary'));
      setTimeout(() => {
        resetMessage.remove();
      }, 6000);
    }
  }

  /**
   * Set up all form submissions and button actions.
   */
  function setupEventListeners() {
    // Add Income
    document.getElementById('income-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const amountInput = document.getElementById('income-amount');
      const amount = parseFloat(amountInput.value);
      if (isNaN(amount) || amount <= 0) return;
      budgetData.income += amount;
      saveData();
      amountInput.value = '';
      updateUI();
    });

    // Add Expense
    document.getElementById('expense-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const categoryEl = document.getElementById('expense-category');
      const amountEl = document.getElementById('expense-amount');
      const noteEl = document.getElementById('expense-note');
      const warningEl = document.getElementById('expense-warning');

      const category = categoryEl.value.trim();
      const amount = parseFloat(amountEl.value);
      const note = noteEl.value.trim();
      if (!category || isNaN(amount) || amount <= 0) {
        return;
      }

      // compute new spent for category
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

      // Add expense to data
      budgetData.expenses.push({
        id: generateId(),
        date: new Date().toISOString().slice(0, 10),
        category,
        amount,
        note
      });
      saveData();

      // Clear form
      categoryEl.value = '';
      amountEl.value = '';
      noteEl.value = '';

      updateUI();
    });

    // Set Category Limit
    document.getElementById('limit-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const categoryInput = document.getElementById('limit-category');
      const amountInput = document.getElementById('limit-amount');
      const category = categoryInput.value.trim();
      const limit = parseFloat(amountInput.value);
      if (!category || isNaN(limit) || limit < 0) return;
      budgetData.limits[category] = limit;
      saveData();
      categoryInput.value = '';
      amountInput.value = '';
      updateUI();
    });

    // Reset Data Button
    document.getElementById('reset-data').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all data for this month? This cannot be undone.')) {
        budgetData = createNewBudgetData();
        saveData();
        updateUI();
      }
    });
  }

  /**
   * Generate a simple unique ID based on timestamp and random number.
   */
  function generateId() {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
  }

  /**
   * Compute total spent per category.
   * @returns {Object} mapping category => amount spent
   */
  function getSpentByCategory() {
    const spent = {};
    for (const exp of budgetData.expenses) {
      spent[exp.category] = (spent[exp.category] || 0) + exp.amount;
    }
    return spent;
  }

  /**
   * Compute total expenses.
   */
  function getTotalExpenses() {
    return budgetData.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }

  /**
   * Refresh the UI with current data.
   */
  function updateUI() {
    // Update summary numbers
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpensesEl = document.getElementById('total-expenses');
    const remainingEl = document.getElementById('remaining-balance');
    const totalExpenses = getTotalExpenses();
    const remaining = budgetData.income - totalExpenses;
    totalIncomeEl.textContent = formatCurrency(budgetData.income);
    totalExpensesEl.textContent = formatCurrency(totalExpenses);
    remainingEl.textContent = formatCurrency(remaining);

    // Update categories table
    const categoriesBody = document.querySelector('#categories-table tbody');
    categoriesBody.innerHTML = '';
    const spentByCat = getSpentByCategory();
    // Get union of categories from limits and spent
    const categories = new Set([
      ...Object.keys(budgetData.limits),
      ...Object.keys(spentByCat)
    ]);
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
        if (limit !== undefined && spent > limit) {
          row.classList.add('over-limit');
        }
        // Category name
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
        if (limit !== undefined) {
          remainingCell.textContent = formatCurrency(limit - spent);
        } else {
          remainingCell.textContent = '—';
        }
        row.appendChild(remainingCell);
        // Progress bar
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
        // Change colour if over limit
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

    // Update expenses table
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
      // Sort expenses by date descending
      const sorted = budgetData.expenses.slice().sort((a, b) => b.date.localeCompare(a.date));
      sorted.forEach((exp) => {
        const row = document.createElement('tr');
        // Date
        const dateCell = document.createElement('td');
        dateCell.textContent = exp.date;
        row.appendChild(dateCell);
        // Category
        const catCell = document.createElement('td');
        catCell.textContent = exp.category;
        row.appendChild(catCell);
        // Amount
        const amtCell = document.createElement('td');
        amtCell.textContent = formatCurrency(exp.amount);
        row.appendChild(amtCell);
        // Note
        const noteCell = document.createElement('td');
        noteCell.textContent = exp.note || '—';
        row.appendChild(noteCell);
        // Action (delete)
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

  /**
   * Delete an expense by id and update UI.
   * @param {string} id
   */
  function deleteExpense(id) {
    budgetData.expenses = budgetData.expenses.filter((exp) => exp.id !== id);
    saveData();
    updateUI();
  }

  /**
   * Format a number into currency string.
   * @param {number} amount
   */
  function formatCurrency(amount) {
    const options = {
      style: 'currency',
      currency: 'USD'
    };
    return new Intl.NumberFormat('en-US', options).format(amount);
  }

  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', init);
})();
