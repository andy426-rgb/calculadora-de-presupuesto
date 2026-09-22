// Estado inicial de la aplicación
const DEFAULT_STATE = {
  income: 0,
  expenses: [
    { id: '1', name: 'Alquiler / Hipoteca', amount: 800, category: 'Vivienda', type: 'necesidad' },
    { id: '2', name: 'Supermercado Mensual', amount: 350, category: 'Alimentación', type: 'necesidad' },
    { id: '3', name: 'Servicios (Luz, Agua, Gas, Net)', amount: 150, category: 'Servicios', type: 'necesidad' },
    { id: '4', name: 'Salidas y Restaurantes', amount: 200, category: 'Ocio', type: 'deseo' },
    { id: '5', name: 'Suscripciones Streaming', amount: 35, category: 'Suscripciones', type: 'deseo' }
  ]
};

// Cargar estado de LocalStorage o usar predeterminado con datos de ejemplo
let appState = JSON.parse(localStorage.getItem('presupuestopro_data')) || {
  currency: 'PEN', // Moneda visual ('PEN' o 'USD')
  exchangeRate: 3.75, // 1 USD = 3.75 PEN
  emergencyRate: 10, // 10% a fondo de emergencia
  income: 2500, // Siempre almacenado en moneda base PEN (Soles)
  expenses: [...DEFAULT_STATE.expenses]
};

if (!appState.currency) appState.currency = 'PEN';
if (typeof appState.exchangeRate === 'undefined') appState.exchangeRate = 3.75;
if (typeof appState.emergencyRate === 'undefined') appState.emergencyRate = 10;

// Iconos por categoría
const CATEGORY_ICONS = {
  Vivienda: '🏠',
  Alimentación: '🛒',
  Servicios: '💡',
  Transporte: '🚗',
  Salud: '💊',
  Educación: '📚',
  Ocio: '🎬',
  Suscripciones: '📱',
  Deudas: '💳',
  Otros: '📦'
};

// Elementos del DOM
const elMonthlyIncome = document.getElementById('monthlyIncome');
const elExpenseForm = document.getElementById('expenseForm');
const elExpenseName = document.getElementById('expenseName');
const elExpenseAmount = document.getElementById('expenseAmount');
const elExpenseCategory = document.getElementById('expenseCategory');
const elExpenseCount = document.getElementById('expenseCount');
const elFilterCategory = document.getElementById('filterCategory');
const elExpenseListContainer = document.getElementById('expenseListContainer');
const elBtnResetAll = document.getElementById('btnResetAll');
const elCurrencySelect = document.getElementById('currencySelect');
const elExchangeRateInput = document.getElementById('exchangeRateInput');
const elBtnFetchRate = document.getElementById('btnFetchRate');
const elApiRateBadge = document.getElementById('apiRateBadge');
const elEmergencyRate = document.getElementById('emergencyRate');
const elEmergencyPctVal = document.getElementById('emergencyPctVal');
const elTxtEmergencyApartado = document.getElementById('txtEmergencyApartado');

// Métricas DOM
const elDispTotalIncome = document.getElementById('dispTotalIncome');
const elDispTotalExpense = document.getElementById('dispTotalExpense');
const elDispRemainingBalance = document.getElementById('dispRemainingBalance');
const elDispEmergencyAmount = document.getElementById('dispEmergencyAmount');
const elDispEmergencyPctLabel = document.getElementById('dispEmergencyPctLabel');
const elDispFreeSavingsAmount = document.getElementById('dispFreeSavingsAmount');
const elDispSavingsRate = document.getElementById('dispSavingsRate');
const elBadgeBalanceStatus = document.getElementById('badgeBalanceStatus');
const elCardBalance = document.getElementById('cardBalance');

// Subtítulos convertidos
const elSubDispIncome = document.getElementById('subDispIncome');
const elSubDispExpense = document.getElementById('subDispExpense');
const elSubDispBalance = document.getElementById('subDispBalance');
const elSubDispEmergency = document.getElementById('subDispEmergency');

// Regla 50/30/20 DOM
const elTxtNeedsAmount = document.getElementById('txtNeedsAmount');
const elTxtNeedsIdeal = document.getElementById('txtNeedsIdeal');
const elPctNeeds = document.getElementById('pctNeeds');
const elBarNeeds = document.getElementById('barNeeds');
const elMsgNeeds = document.getElementById('msgNeeds');

const elTxtWantsAmount = document.getElementById('txtWantsAmount');
const elTxtWantsIdeal = document.getElementById('txtWantsIdeal');
const elPctWants = document.getElementById('pctWants');
const elBarWants = document.getElementById('barWants');
const elMsgWants = document.getElementById('msgWants');

const elTxtSavingsAmount = document.getElementById('txtSavingsAmount');
const elTxtSavingsIdeal = document.getElementById('txtSavingsIdeal');
const elPctSavings = document.getElementById('pctSavings');
const elBarSavings = document.getElementById('barSavings');
const elMsgSavings = document.getElementById('msgSavings');

const elDynamicAdvice = document.getElementById('dynamicAdvice');
const elChartPlaceholder = document.getElementById('chartPlaceholder');
const elExpensesPieChart = document.getElementById('expensesPieChart');

let chartInstance = null;

// Convertidor numérico según moneda seleccionada: los montos base están en PEN
function toSelectedCurrency(penAmount) {
  if (appState.currency === 'USD') {
    const rate = appState.exchangeRate > 0 ? appState.exchangeRate : 3.75;
    return penAmount / rate;
  }
  return penAmount;
}

// Convertir de moneda seleccionada a moneda base (PEN)
function fromSelectedToPEN(amountInSelected) {
  if (appState.currency === 'USD') {
    const rate = appState.exchangeRate > 0 ? appState.exchangeRate : 3.75;
    return amountInSelected * rate;
  }
  return amountInSelected;
}

// Formateador en moneda seleccionada
function formatCurrency(penAmount) {
  const isPEN = appState.currency === 'PEN';
  const displayVal = toSelectedCurrency(penAmount);
  return new Intl.NumberFormat(isPEN ? 'es-PE' : 'en-US', {
    style: 'currency',
    currency: appState.currency,
    minimumFractionDigits: 2
  }).format(displayVal);
}

// Formateador en la moneda contraria (para mostrar el equivalente simultáneo)
function formatOppositeCurrency(penAmount) {
  const isPEN = appState.currency === 'PEN';
  const targetCurrency = isPEN ? 'USD' : 'PEN';
  const rate = appState.exchangeRate > 0 ? appState.exchangeRate : 3.75;
  const convertedVal = isPEN ? (penAmount / rate) : (penAmount * rate);

  return new Intl.NumberFormat(isPEN ? 'en-US' : 'es-PE', {
    style: 'currency',
    currency: targetCurrency,
    minimumFractionDigits: 2
  }).format(convertedVal);
}

// Símbolo actual de moneda
function getCurrencySymbol() {
  return appState.currency === 'PEN' ? 'S/' : '$';
}

// Actualizar símbolos en formularios
function updateCurrencySymbols() {
  const symbol = getCurrencySymbol();
  document.querySelectorAll('.dynamic-curr-symbol').forEach(el => {
    el.textContent = symbol;
  });
}

// Guardar en LocalStorage
function saveState() {
  localStorage.setItem('presupuestopro_data', JSON.stringify(appState));
}

// Conexión a API de Tipo de Cambio en Vivo
async function fetchLiveExchangeRate(manual = false) {
  if (elBtnFetchRate) elBtnFetchRate.classList.add('spinning');
  if (elApiRateBadge) {
    elApiRateBadge.textContent = 'Consultando...';
    elApiRateBadge.className = 'api-status-badge updating';
  }

  try {
    // API financiera gratuita global de tasas de cambio (open.er-api.com)
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) throw new Error('Error en respuesta de API');
    
    const data = await response.json();
    if (data && data.rates && data.rates.PEN) {
      const liveRate = parseFloat(data.rates.PEN.toFixed(3));
      appState.exchangeRate = liveRate;
      if (elExchangeRateInput) elExchangeRateInput.value = liveRate;
      
      saveState();

      if (elApiRateBadge) {
        elApiRateBadge.textContent = 'En vivo (API)';
        elApiRateBadge.className = 'api-status-badge';
        elApiRateBadge.title = `Actualizado: ${new Date().toLocaleTimeString()} (Fuente oficial)`;
      }

      if (appState.currency === 'USD') {
        const currentIncomeInView = toSelectedCurrency(appState.income);
        elMonthlyIncome.value = currentIncomeInView > 0 ? parseFloat(currentIncomeInView.toFixed(2)) : '';
      }

      updateUI();
    }
  } catch (err) {
    console.warn('No se pudo conectar a la API de tipo de cambio, usando valor local:', err);
    if (elApiRateBadge) {
      elApiRateBadge.textContent = 'Modo manual';
      elApiRateBadge.className = 'api-status-badge error';
      elApiRateBadge.title = 'No se pudo conectar a la API en vivo; puedes editarlo manualmente.';
    }
  } finally {
    if (elBtnFetchRate) elBtnFetchRate.classList.remove('spinning');
  }
}

// Inicializar la aplicación
function init() {
  if (elCurrencySelect) elCurrencySelect.value = appState.currency;
  if (elExchangeRateInput) elExchangeRateInput.value = appState.exchangeRate;
  if (elEmergencyRate) elEmergencyRate.value = appState.emergencyRate;
  if (elEmergencyPctVal) elEmergencyPctVal.textContent = `${appState.emergencyRate}%`;
  if (elDispEmergencyPctLabel) elDispEmergencyPctLabel.textContent = `${appState.emergencyRate}%`;

  // Mostrar el ingreso convertido según moneda elegida
  const incomeDisplay = toSelectedCurrency(appState.income);
  elMonthlyIncome.value = incomeDisplay > 0 ? parseFloat(incomeDisplay.toFixed(2)) : '';

  setupEventListeners();
  updateCurrencySymbols();
  updateUI();

  // Consultar API en tiempo real al abrir
  fetchLiveExchangeRate();

  // Mantener actualizado periódicamente cada 10 minutos
  setInterval(() => {
    fetchLiveExchangeRate();
  }, 10 * 60 * 1000);
}

// Listeners
function setupEventListeners() {
  // Botón manual de refrescar tasa
  if (elBtnFetchRate) {
    elBtnFetchRate.addEventListener('click', () => {
      fetchLiveExchangeRate(true);
    });
  }

  // Selector de Moneda
  if (elCurrencySelect) {
    elCurrencySelect.addEventListener('change', (e) => {
      appState.currency = e.target.value;
      saveState();
      updateCurrencySymbols();
      // Actualizar valor mostrado en el input de sueldo
      const currentIncomeInView = toSelectedCurrency(appState.income);
      elMonthlyIncome.value = currentIncomeInView > 0 ? parseFloat(currentIncomeInView.toFixed(2)) : '';
      updateUI();
    });
  }

  // Tipo de Cambio
  if (elExchangeRateInput) {
    elExchangeRateInput.addEventListener('input', (e) => {
      const rate = parseFloat(e.target.value);
      if (!isNaN(rate) && rate > 0) {
        appState.exchangeRate = rate;
        if (elApiRateBadge) {
          elApiRateBadge.textContent = 'Editado manual';
          elApiRateBadge.className = 'api-status-badge error';
        }
        saveState();
        if (appState.currency === 'USD') {
          const currentIncomeInView = toSelectedCurrency(appState.income);
          elMonthlyIncome.value = currentIncomeInView > 0 ? parseFloat(currentIncomeInView.toFixed(2)) : '';
        }
        updateUI();
      }
    });
  }

  // Porcentaje Fondo de Emergencia
  if (elEmergencyRate) {
    elEmergencyRate.addEventListener('input', (e) => {
      const pct = parseInt(e.target.value, 10);
      appState.emergencyRate = isNaN(pct) ? 0 : pct;
      if (elEmergencyPctVal) elEmergencyPctVal.textContent = `${appState.emergencyRate}%`;
      if (elDispEmergencyPctLabel) elDispEmergencyPctLabel.textContent = `${appState.emergencyRate}%`;
      saveState();
      updateUI();
    });
  }

  // Cambio de Ingresos (guarda siempre en PEN)
  elMonthlyIncome.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    const amountPEN = isNaN(val) || val < 0 ? 0 : fromSelectedToPEN(val);
    appState.income = amountPEN;
    saveState();
    updateUI();
  });

  // Agregar Gasto
  elExpenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = elExpenseName.value.trim();
    const inputVal = parseFloat(elExpenseAmount.value);
    const category = elExpenseCategory.value;
    const type = document.querySelector('input[name="expenseType"]:checked').value;

    if (!name || isNaN(inputVal) || inputVal <= 0) return;

    // Convertir el monto ingresado a base PEN
    const amountInPEN = fromSelectedToPEN(inputVal);

    const newExpense = {
      id: Date.now().toString(),
      name,
      amount: amountInPEN,
      category,
      type
    };

    appState.expenses.unshift(newExpense);
    saveState();
    updateUI();

    // Resetear formulario
    elExpenseName.value = '';
    elExpenseAmount.value = '';
    elExpenseName.focus();
  });

  // Filtro de categorías
  elFilterCategory.addEventListener('change', () => {
    renderExpensesList();
  });

  // Botón Restablecer
  elBtnResetAll.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que deseas reiniciar todos los datos a cero?')) {
      appState = {
        currency: appState.currency || 'PEN',
        exchangeRate: appState.exchangeRate || 3.75,
        emergencyRate: 10,
        income: 0,
        expenses: []
      };
      elMonthlyIncome.value = '';
      if (elEmergencyRate) elEmergencyRate.value = 10;
      if (elEmergencyPctVal) elEmergencyPctVal.textContent = '10%';
      saveState();
      updateUI();
    }
  });
}

// Eliminar un gasto
window.deleteExpense = function(id) {
  appState.expenses = appState.expenses.filter(item => item.id !== id);
  saveState();
  updateUI();
};

// Cálculos Financieros y Actualización Global
function updateUI() {
  const income = appState.income;
  const totalExpenses = appState.expenses.reduce((sum, item) => sum + item.amount, 0);
  
  // Fondo de Emergencia: % de los ingresos mensuales
  const emergencyPct = appState.emergencyRate || 0;
  const emergencyAmount = income * (emergencyPct / 100);

  // Remanente (lo que sobra después de gastos Y de apartar el fondo de emergencia)
  const remaining = income - totalExpenses - emergencyAmount;
  
  // Ahorro libre / Tasa de ahorro disponible
  const totalAhorroPotencial = Math.max(0, remaining + emergencyAmount);
  const savingsRate = income > 0 ? (totalAhorroPotencial / income) * 100 : 0;
  const freeSavings = Math.max(0, remaining);

  // Actualizar Tarjetas Principales
  elDispTotalIncome.textContent = formatCurrency(income);
  elDispTotalExpense.textContent = formatCurrency(totalExpenses);
  elDispRemainingBalance.textContent = formatCurrency(remaining);
  elDispEmergencyAmount.textContent = formatCurrency(emergencyAmount);
  elDispFreeSavingsAmount.textContent = formatCurrency(freeSavings);
  elDispSavingsRate.textContent = `${savingsRate.toFixed(1)}% de tus ingresos retenido`;

  // Equivalencias simultáneas en la moneda alterna
  if (elSubDispIncome) elSubDispIncome.textContent = `≈ ${formatOppositeCurrency(income)}`;
  if (elSubDispExpense) elSubDispExpense.textContent = `≈ ${formatOppositeCurrency(totalExpenses)}`;
  if (elSubDispBalance) elSubDispBalance.textContent = `≈ ${formatOppositeCurrency(remaining)}`;
  if (elSubDispEmergency) elSubDispEmergency.textContent = `≈ ${formatOppositeCurrency(emergencyAmount)}`;

  // Actualizar texto del apartado de emergencia en el formulario
  if (elTxtEmergencyApartado) {
    elTxtEmergencyApartado.textContent = `${formatCurrency(emergencyAmount)} (${formatOppositeCurrency(emergencyAmount)})`;
  }

  // Estilo según superávit o déficit
  elCardBalance.classList.remove('positive', 'negative');
  if (income === 0 && totalExpenses === 0) {
    elBadgeBalanceStatus.textContent = 'Sin datos';
    elBadgeBalanceStatus.className = 'status-pill status-neutral';
  } else if (remaining >= 0) {
    elCardBalance.classList.add('positive');
    elBadgeBalanceStatus.textContent = 'Superávit Saludable';
    elBadgeBalanceStatus.className = 'status-pill status-surplus';
  } else {
    elCardBalance.classList.add('negative');
    elBadgeBalanceStatus.textContent = 'Déficit / Sobrepasado';
    elBadgeBalanceStatus.className = 'status-pill status-deficit';
  }

  // Cálculos de la Regla 50/30/20
  calculate50_30_20(income, totalExpenses, remaining, emergencyAmount);

  // Renderizar Lista de Gastos
  renderExpensesList();

  // Actualizar Gráfica
  updateChart();

  // Generar Diagnóstico Financiero Dinámico
  generateAdvice(income, totalExpenses, remaining, savingsRate, emergencyAmount);
}

// Cálculo y renderizado de la Regla 50/30/20
function calculate50_30_20(income, totalExpenses, remaining, emergencyAmount) {
  // Necesidades (50% ideal)
  const needsTotal = appState.expenses
    .filter(e => e.type === 'necesidad')
    .reduce((sum, e) => sum + e.amount, 0);

  // Deseos (30% ideal)
  const wantsTotal = appState.expenses
    .filter(e => e.type === 'deseo')
    .reduce((sum, e) => sum + e.amount, 0);

  // Ahorro total acumulado (Emergencia + Remanente positivo)
  const savingsTotal = Math.max(0, emergencyAmount + Math.max(0, remaining));

  const idealNeeds = income * 0.50;
  const idealWants = income * 0.30;
  const idealSavings = income * 0.20;

  const pctNeedsVal = income > 0 ? (needsTotal / income) * 100 : 0;
  const pctWantsVal = income > 0 ? (wantsTotal / income) * 100 : 0;
  const pctSavingsVal = income > 0 ? (savingsTotal / income) * 100 : 0;

  // Asignar a pantalla
  elTxtNeedsAmount.textContent = formatCurrency(needsTotal);
  elTxtNeedsIdeal.textContent = formatCurrency(idealNeeds);
  elPctNeeds.textContent = `(${pctNeedsVal.toFixed(1)}%)`;
  elBarNeeds.style.width = `${Math.min(pctNeedsVal, 100)}%`;

  if (pctNeedsVal > 50) {
    elBarNeeds.classList.add('fill-alert');
    elMsgNeeds.className = 'rule-hint warning';
    elMsgNeeds.textContent = `⚠️ Superas el 50% recomendado por ${(pctNeedsVal - 50).toFixed(1)}%.`;
  } else {
    elBarNeeds.classList.remove('fill-alert');
    elMsgNeeds.className = 'rule-hint success';
    elMsgNeeds.textContent = `✓ Dentro del margen recomendado (Máx. 50%).`;
  }

  elTxtWantsAmount.textContent = formatCurrency(wantsTotal);
  elTxtWantsIdeal.textContent = formatCurrency(idealWants);
  elPctWants.textContent = `(${pctWantsVal.toFixed(1)}%)`;
  elBarWants.style.width = `${Math.min(pctWantsVal, 100)}%`;

  if (pctWantsVal > 30) {
    elBarWants.classList.add('fill-alert');
    elMsgWants.className = 'rule-hint warning';
    elMsgWants.textContent = `⚠️ Tus gustos y deseos superan el 30% en ${(pctWantsVal - 30).toFixed(1)}%.`;
  } else {
    elBarWants.classList.remove('fill-alert');
    elMsgWants.className = 'rule-hint success';
    elMsgWants.textContent = `✓ Control adecuado en estilo de vida (Máx. 30%).`;
  }

  elTxtSavingsAmount.textContent = formatCurrency(savingsTotal);
  elTxtSavingsIdeal.textContent = formatCurrency(idealSavings);
  elPctSavings.textContent = `(${pctSavingsVal.toFixed(1)}%)`;
  elBarSavings.style.width = `${Math.min(pctSavingsVal, 100)}%`;

  if (income > 0 && pctSavingsVal < 20) {
    elMsgSavings.className = 'rule-hint warning';
    elMsgSavings.textContent = `⚠️ Ahorras menos del 20% objetivo (sumando emergencia y remanente). Faltan ${(20 - pctSavingsVal).toFixed(1)}%.`;
  } else if (income > 0) {
    elMsgSavings.className = 'rule-hint success';
    elMsgSavings.textContent = `🎉 ¡Excelente! Cumples con el 20% o más de ahorro/reserva.`;
  } else {
    elMsgSavings.className = 'rule-hint';
    elMsgSavings.textContent = 'Ingresa tus ingresos para calcular.';
  }
}

// Renderizado de Gastos
function renderExpensesList() {
  const filter = elFilterCategory.value;
  const filtered = filter === 'all' 
    ? appState.expenses 
    : appState.expenses.filter(e => e.category === filter);

  elExpenseCount.textContent = appState.expenses.length;

  if (filtered.length === 0) {
    elExpenseListContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-receipt"></i>
        <p>${appState.expenses.length === 0 ? 'Aún no has registrado ningún gasto.' : 'No hay gastos en esta categoría.'}</p>
      </div>
    `;
    return;
  }

  elExpenseListContainer.innerHTML = filtered.map(expense => {
    const icon = CATEGORY_ICONS[expense.category] || '💸';
    const isNeed = expense.type === 'necesidad';
    const typeLabel = isNeed ? '50% Necesidad' : '30% Deseo';
    const typeClass = isNeed ? 'need' : 'want';

    return `
      <div class="expense-item">
        <div class="expense-left">
          <div class="category-badge">${icon}</div>
          <div class="expense-details">
            <span class="expense-title">${escapeHTML(expense.name)}</span>
            <div class="expense-meta">
              <span>${expense.category}</span>
              <span>•</span>
              <span class="type-tag ${typeClass}">${typeLabel}</span>
            </div>
          </div>
        </div>
        <div class="expense-right">
          <div class="expense-val-wrapper">
            <span class="expense-val">-${formatCurrency(expense.amount)}</span>
            <small class="expense-val-sub">≈ -${formatOppositeCurrency(expense.amount)}</small>
          </div>
          <button class="btn-delete" onclick="deleteExpense('${expense.id}')" title="Eliminar gasto">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Chart.js Gráfica
function updateChart() {
  if (appState.expenses.length === 0) {
    elChartPlaceholder.style.display = 'flex';
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  elChartPlaceholder.style.display = 'none';

  // Agrupar gastos por categoría
  const categoryTotals = {};
  appState.expenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);

  const colors = [
    '#6366f1', '#06b6d4', '#f59e0b', '#ec4899', 
    '#10b981', '#8b5cf6', '#3b82f6', '#14b8a6', 
    '#f43f5e', '#a855f7'
  ];

  if (chartInstance) {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = data;
    chartInstance.data.datasets[0].backgroundColor = colors.slice(0, labels.length);
    chartInstance.update();
  } else {
    const ctx = elExpensesPieChart.getContext('2d');
    chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#0b0f19'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              font: { family: 'Plus Jakarta Sans', size: 11 },
              boxWidth: 12
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.raw || 0;
                return ` ${context.label}: ${formatCurrency(value)}`;
              }
            }
          }
        },
        cutout: '65%'
      }
    });
  }
}

// Consejos Financieros y Diagnóstico
function generateAdvice(income, expenses, remaining, savingsRate, emergencyAmount) {
  if (income <= 0) {
    elDynamicAdvice.innerHTML = `<p>👉 Empieza ingresando tu <strong>salario neto mensual</strong> en la casilla superior izquierda.</p>`;
    return;
  }

  if (remaining < 0) {
    elDynamicAdvice.innerHTML = `
      <p style="color: #f87171;">🚨 <strong>¡Déficit en presupuesto!</strong> Tras tus gastos y el apartado de emergencia te faltan <strong>${formatCurrency(Math.abs(remaining))} (${formatOppositeCurrency(Math.abs(remaining))})</strong>.</p>
      <p style="margin-top: 0.5rem;">Te recomendamos revisar urgentemente los gastos clasificados como <strong>Deseos</strong> (salidas, suscripciones, compras prescindibles) o ajustar temporalmente el % de fondo de emergencia para no caer en deudas.</p>
    `;
    return;
  }

  if (savingsRate >= 20) {
    elDynamicAdvice.innerHTML = `
      <p style="color: #34d399;">🌟 <strong>¡Salud financiera sobresaliente!</strong> Estás apartando con éxito <strong>${formatCurrency(emergencyAmount)} (${formatOppositeCurrency(emergencyAmount)})</strong> a tu Fondo de Emergencia y aún te sobran <strong>${formatCurrency(remaining)} (${formatOppositeCurrency(remaining)})</strong> de ahorro libre.</p>
      <p style="margin-top: 0.5rem;">Una vez tu fondo de emergencia cubra entre 3 y 6 meses de gastos fijos, traslada tu excedente mensual a inversiones rentables (fondos mutuos, depósitos a plazo o bolsa).</p>
    `;
  } else if (savingsRate > 0 && savingsRate < 20) {
    elDynamicAdvice.innerHTML = `
      <p style="color: #fbbf24;">💡 <strong>Buen balance, pero puedes fortalecerlo.</strong> Tu capacidad total de ahorro/reserva es de <strong>${savingsRate.toFixed(1)}%</strong>.</p>
      <p style="margin-top: 0.5rem;">Destinas ${formatCurrency(emergencyAmount)} a emergencia y te quedan ${formatCurrency(remaining)} libres. Para alcanzar el 20% clásico de la regla financiera, intenta moderar pequeños gastos en la categoría Deseos.</p>
    `;
  } else {
    elDynamicAdvice.innerHTML = `
      <p style="color: #f59e0b;">⚠️ <strong>Presupuesto al límite:</strong> Estás al ras de tus ingresos ($0.00 de sobrante libre). Cualquier gasto imprevisto mayor podría desestabilizarte. Considera reducir al menos 5% en ocio para acumular un colchón.</p>
    `;
  }
}

// Utilidad XSS básica
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Iniciar al cargar
document.addEventListener('DOMContentLoaded', () => {
  init();
  registerServiceWorker();
});

// Registrar Service Worker para PWA (instalable en móvil/escritorio)
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('PWA Service Worker registrado con éxito:', reg.scope);
        })
        .catch((err) => {
          console.warn('Error al registrar Service Worker:', err);
        });
    });
  }
}
