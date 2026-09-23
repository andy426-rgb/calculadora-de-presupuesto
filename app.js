/**
 * Mi Presupuesto - Sistema de Planificación Financiera Personal
 * Siguiendo la metodología oficial de Finanzas para Todos (CNMV / Banco de España)
 */

// Multiplicadores de frecuencias relativas a 1 MES y 1 AÑO
// (1 mes promedio = 52 semanas / 12 = 4.3333 semanas)
const FREQUENCY_MULTIPLIERS = {
  weekly: { toMonth: 52 / 12, toYear: 52, label: 'Semanal' },
  biweekly: { toMonth: 2, toYear: 24, label: 'Quincenal' },
  monthly: { toMonth: 1, toYear: 12, label: 'Mensual' },
  bimonthly: { toMonth: 1 / 2, toYear: 6, label: 'Bimensual' },
  quarterly: { toMonth: 1 / 3, toYear: 4, label: 'Trimestral' },
  semiannual: { toMonth: 1 / 6, toYear: 2, label: 'Semestral' },
  annual: { toMonth: 1 / 12, toYear: 1, label: 'Anual' }
};

// Plantilla de Ejemplo Oficial según Finanzas para Todos
const FPT_TEMPLATE = {
  incomes: [
    { id: 'inc_1', name: 'Nómina / Sueldo Principal', amount: 2800, frequency: 'monthly' },
    { id: 'inc_2', name: 'Pagas Extras / Gratificación', amount: 1400, frequency: 'semiannual' }
  ],
  expenses: [
    // 1. Gastos Fijos Obligatorios
    { id: 'exp_1', name: 'Alquiler / Hipoteca Vivienda', amount: 950, frequency: 'monthly', category: 'Vivienda', fptType: 'fixed_obligatory' },
    { id: 'exp_2', name: 'Comunidad de Propietarios', amount: 60, frequency: 'monthly', category: 'Vivienda', fptType: 'fixed_obligatory' },
    { id: 'exp_3', name: 'Seguro de Coche', amount: 420, frequency: 'annual', category: 'Seguros', fptType: 'fixed_obligatory' },
    { id: 'exp_4', name: 'Cuota Préstamo Personal', amount: 180, frequency: 'monthly', category: 'Préstamos', fptType: 'fixed_obligatory' },
    { id: 'exp_5', name: 'Colegio / Matrícula Niños', amount: 120, frequency: 'monthly', category: 'Educación', fptType: 'fixed_obligatory' },

    // 2. Gastos Variables Necesarios
    { id: 'exp_6', name: 'Supermercado y Alimentación', amount: 120, frequency: 'weekly', category: 'Alimentación', fptType: 'variable_necessary' },
    { id: 'exp_7', name: 'Electricidad y Gas', amount: 150, frequency: 'bimonthly', category: 'Suministros', fptType: 'variable_necessary' },
    { id: 'exp_8', name: 'Agua del Hogar', amount: 70, frequency: 'bimonthly', category: 'Suministros', fptType: 'variable_necessary' },
    { id: 'exp_9', name: 'Transporte y Abono / Gasolina', amount: 110, frequency: 'monthly', category: 'Transporte', fptType: 'variable_necessary' },
    { id: 'exp_10', name: 'Farmacia / Salud Básica', amount: 45, frequency: 'monthly', category: 'Salud', fptType: 'variable_necessary' },

    // 3. Gastos Discrecionales (Estilo de Vida)
    { id: 'exp_11', name: 'Restaurantes y Salidas Fin de Semana', amount: 60, frequency: 'weekly', category: 'Ocio', fptType: 'discretionary' },
    { id: 'exp_12', name: 'Suscripciones (Netflix, Spotify, etc.)', amount: 35, frequency: 'monthly', category: 'Suscripciones', fptType: 'discretionary' },
    { id: 'exp_13', name: 'Compras personales y Ropa', amount: 130, frequency: 'monthly', category: 'Otros', fptType: 'discretionary' },
    { id: 'exp_14', name: 'Vacaciones de Verano', amount: 900, frequency: 'annual', category: 'Ocio', fptType: 'discretionary' }
  ]
};

// Iconos por categoría
const CATEGORY_ICONS = {
  Vivienda: '🏠',
  Alimentación: '🛒',
  Suministros: '💡',
  Telecomunicaciones: '📱',
  Transporte: '🚗',
  Seguros: '🛡️',
  Préstamos: '💳',
  Educación: '📚',
  Salud: '💊',
  Ocio: '🎬',
  Suscripciones: '📦',
  Otros: '🏷️'
};

// Cargar o Inicializar Estado
function loadInitialState() {
  const saved = localStorage.getItem('presupuestopro_data');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Migración hacia el nuevo formato de ingresos múltiples si venía del formato viejo
      let incomes = [];
      if (Array.isArray(parsed.incomes) && parsed.incomes.length > 0) {
        incomes = parsed.incomes;
      } else if (typeof parsed.income === 'number' && parsed.income > 0) {
        incomes = [{ id: 'inc_old_1', name: 'Ingresos Mensuales', amount: parsed.income, frequency: 'monthly' }];
      } else {
        incomes = [...FPT_TEMPLATE.incomes];
      }

      // Migración de gastos para asegurar fptType y frequency
      let expenses = [];
      if (Array.isArray(parsed.expenses) && parsed.expenses.length > 0) {
        expenses = parsed.expenses.map(e => ({
          ...e,
          frequency: e.frequency || 'monthly',
          fptType: e.fptType || (e.type === 'deseo' ? 'discretionary' : 'fixed_obligatory')
        }));
      } else {
        expenses = [...FPT_TEMPLATE.expenses];
      }

      return {
        currency: parsed.currency || 'PEN',
        exchangeRate: parsed.exchangeRate || 3.75,
        emergencyRate: typeof parsed.emergencyRate === 'number' ? parsed.emergencyRate : 10,
        viewPeriod: parsed.viewPeriod || 'monthly', // 'monthly' | 'annual'
        chartMode: parsed.chartMode || 'fptType',   // 'fptType' | 'category'
        activeTab: parsed.activeTab || 'budget',    // 'budget' | 'compound'
        incomes,
        expenses,
        // Parámetros de Interés Compuesto
        compound: parsed.compound || {
          initialDeposit: 1000,
          monthlyContribution: 250,
          years: 10,
          annualRate: 8.0,
          chartMode: 'stacked' // 'stacked' | 'line'
        }
      };
    } catch (e) {
      console.warn('Error parseando datos de localStorage, restaurando plantilla:', e);
    }
  }

  // Si no hay datos, cargar la plantilla didáctica de Finanzas para Todos
  return {
    currency: 'PEN',
    exchangeRate: 3.75,
    emergencyRate: 10,
    viewPeriod: 'monthly',
    chartMode: 'fptType',
    activeTab: 'budget',
    incomes: [...FPT_TEMPLATE.incomes],
    expenses: [...FPT_TEMPLATE.expenses],
    compound: {
      initialDeposit: 1000,
      monthlyContribution: 250,
      years: 10,
      annualRate: 8.0,
      chartMode: 'stacked'
    }
  };
}

let appState = loadInitialState();

// Elementos del DOM
// Botones de Cabecera
const elBtnPeriodMonthly = document.getElementById('btnPeriodMonthly');
const elBtnPeriodAnnual = document.getElementById('btnPeriodAnnual');
const elBtnLoadTemplate = document.getElementById('btnLoadTemplate');
const elBtnPrintReport = document.getElementById('btnPrintReport');
const elBtnResetAll = document.getElementById('btnResetAll');
const elCurrencySelect = document.getElementById('currencySelect');
const elExchangeRateInput = document.getElementById('exchangeRateInput');
const elBtnFetchRate = document.getElementById('btnFetchRate');
const elApiRateBadge = document.getElementById('apiRateBadge');

// Tarjetas de Resumen
const elDispTotalIncome = document.getElementById('dispTotalIncome');
const elDispTotalExpense = document.getElementById('dispTotalExpense');
const elDispRemainingBalance = document.getElementById('dispRemainingBalance');
const elDispSavingsRateValue = document.getElementById('dispSavingsRateValue');
const elDispSavingsRate = document.getElementById('dispSavingsRate');
const elDispEmergencyAmount = document.getElementById('dispEmergencyAmount');
const elDispEmergencyPctLabel = document.getElementById('dispEmergencyPctLabel');
const elBadgeBalanceStatus = document.getElementById('badgeBalanceStatus');
const elCardBalance = document.getElementById('cardBalance');

// Subtítulos convertidos
const elSubDispIncome = document.getElementById('subDispIncome');
const elSubDispExpense = document.getElementById('subDispExpense');
const elSubDispBalance = document.getElementById('subDispBalance');
const elSubDispEmergency = document.getElementById('subDispEmergency');

// Overview de 3 Pilares Finanzas para Todos
const elDispSumFixed = document.getElementById('dispSumFixed');
const elPctSumFixed = document.getElementById('pctSumFixed');
const elDispSumVariable = document.getElementById('dispSumVariable');
const elPctSumVariable = document.getElementById('pctSumVariable');
const elDispSumDiscretionary = document.getElementById('dispSumDiscretionary');
const elPctSumDiscretionary = document.getElementById('pctSumDiscretionary');

// Sección Ingresos
const elIncomesCount = document.getElementById('incomesCount');
const elBtnToggleIncomeForm = document.getElementById('btnToggleIncomeForm');
const elIncomeForm = document.getElementById('incomeForm');
const elIncomeName = document.getElementById('incomeName');
const elIncomeAmount = document.getElementById('incomeAmount');
const elIncomeFrequency = document.getElementById('incomeFrequency');
const elBtnCancelIncome = document.getElementById('btnCancelIncome');
const elIncomesListContainer = document.getElementById('incomesListContainer');

// Fondo de Emergencia
const elEmergencyRate = document.getElementById('emergencyRate');
const elEmergencyPctVal = document.getElementById('emergencyPctVal');
const elTxtEmergencyApartado = document.getElementById('txtEmergencyApartado');

// Formulario Gastos
const elExpenseForm = document.getElementById('expenseForm');
const elExpenseName = document.getElementById('expenseName');
const elExpenseCategory = document.getElementById('expenseCategory');
const elExpenseAmount = document.getElementById('expenseAmount');
const elExpenseFrequency = document.getElementById('expenseFrequency');
const elExpenseCount = document.getElementById('expenseCount');
const elFilterFptType = document.getElementById('filterFptType');
const elFilterCategory = document.getElementById('filterCategory');
const elExpenseListContainer = document.getElementById('expenseListContainer');

// Rigidez Financiera
const elTxtRigidityAmount = document.getElementById('txtRigidityAmount');
const elPctRigidityVal = document.getElementById('pctRigidityVal');
const elBarRigidity = document.getElementById('barRigidity');
const elMsgRigidity = document.getElementById('msgRigidity');

// Regla 50/30/20
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

// Gráficos
const elBtnChartByType = document.getElementById('btnChartByType');
const elBtnChartByCategory = document.getElementById('btnChartByCategory');
const elExpensesPieChart = document.getElementById('expensesPieChart');
const elChartPlaceholder = document.getElementById('chartPlaceholder');
let chartInstance = null;

// Pestañas Principales (Presupuesto vs Interés Compuesto)
const elTabBtnBudget = document.getElementById('tabBtnBudget');
const elTabBtnCompound = document.getElementById('tabBtnCompound');
const elTabContentBudget = document.getElementById('tabContentBudget');
const elTabContentCompound = document.getElementById('tabContentCompound');

// Elementos DOM Interés Compuesto
const elCiInitialDeposit = document.getElementById('ciInitialDeposit');
const elCiInitialRange = document.getElementById('ciInitialRange');
const elCiMonthlyContribution = document.getElementById('ciMonthlyContribution');
const elCiMonthlyRange = document.getElementById('ciMonthlyRange');
const elCiYears = document.getElementById('ciYears');
const elCiYearsRange = document.getElementById('ciYearsRange');
const elCiAnnualRate = document.getElementById('ciAnnualRate');
const elCiRateRange = document.getElementById('ciRateRange');
const elCiBtnUseSurplus = document.getElementById('ciBtnUseSurplus');

// Badges Interés Compuesto
const elCiBadgeInitial = document.getElementById('ciBadgeInitial');
const elCiBadgeMonthly = document.getElementById('ciBadgeMonthly');
const elCiBadgeYears = document.getElementById('ciBadgeYears');
const elCiBadgeRate = document.getElementById('ciBadgeRate');

// Tarjetas de Métricas Interés Compuesto
const elCiDispFinalTotal = document.getElementById('ciDispFinalTotal');
const elCiSubDispFinalTotal = document.getElementById('ciSubDispFinalTotal');
const elCiBadgeMultiplier = document.getElementById('ciBadgeMultiplier');
const elCiDispTotalDeposited = document.getElementById('ciDispTotalDeposited');
const elCiSubDispTotalDeposited = document.getElementById('ciSubDispTotalDeposited');
const elCiPctDepositedHint = document.getElementById('ciPctDepositedHint');
const elCiDispTotalInterest = document.getElementById('ciDispTotalInterest');
const elCiSubDispTotalInterest = document.getElementById('ciSubDispTotalInterest');
const elCiPctInterestHint = document.getElementById('ciPctInterestHint');

// Gráfico y Tabla Interés Compuesto
const elCiGrowthChart = document.getElementById('ciGrowthChart');
const elBtnCiChartStacked = document.getElementById('btnCiChartStacked');
const elBtnCiChartLine = document.getElementById('btnCiChartLine');
const elCiTableBody = document.getElementById('ciTableBody');
const elCiBtnToggleTable = document.getElementById('ciBtnToggleTable');
const elCiTableContainer = document.getElementById('ciTableContainer');
const elCiTxtToggleTable = document.getElementById('ciTxtToggleTable');
const elCiEducationalAdvice = document.getElementById('ciEducationalAdvice');
let ciChartInstance = null;
let isCiTableExpanded = false;

// Consejos Dinámicos
const elDynamicAdvice = document.getElementById('dynamicAdvice');

/* ==========================================================================
   CONVERSIÓN DE MONEDA Y PERIODICIDAD
   ========================================================================== */

// Normaliza el importe base de un ítem al período activo ('monthly' o 'annual')
function normalizeAmount(baseAmount, frequency, targetPeriod) {
  const mult = FREQUENCY_MULTIPLIERS[frequency] || FREQUENCY_MULTIPLIERS.monthly;
  if (targetPeriod === 'annual') {
    return baseAmount * mult.toYear;
  }
  // Por defecto mensual
  return baseAmount * mult.toMonth;
}

// Convertir de PEN a moneda seleccionada
function toSelectedCurrency(penAmount) {
  if (appState.currency === 'USD') {
    const rate = appState.exchangeRate > 0 ? appState.exchangeRate : 3.75;
    return penAmount / rate;
  }
  return penAmount;
}

// Convertir de moneda seleccionada a moneda base PEN
function fromSelectedToPEN(amountInSelected) {
  if (appState.currency === 'USD') {
    const rate = appState.exchangeRate > 0 ? appState.exchangeRate : 3.75;
    return amountInSelected * rate;
  }
  return amountInSelected;
}

// Formatear moneda seleccionada
function formatCurrency(penAmount) {
  const isPEN = appState.currency === 'PEN';
  const displayVal = toSelectedCurrency(penAmount);
  return new Intl.NumberFormat(isPEN ? 'es-PE' : 'en-US', {
    style: 'currency',
    currency: appState.currency,
    minimumFractionDigits: 2
  }).format(displayVal);
}

// Formatear moneda alterna simultánea
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

function getCurrencySymbol() {
  return appState.currency === 'PEN' ? 'S/' : '$';
}

function updateCurrencySymbols() {
  const symbol = getCurrencySymbol();
  document.querySelectorAll('.dynamic-curr-symbol').forEach(el => {
    el.textContent = symbol;
  });
}

function saveState() {
  localStorage.setItem('presupuestopro_data', JSON.stringify(appState));
}

/* ==========================================================================
   CONEXIÓN API TIPO DE CAMBIO
   ========================================================================== */
async function fetchLiveExchangeRate(manual = false) {
  if (elBtnFetchRate) elBtnFetchRate.classList.add('spinning');
  if (elApiRateBadge) {
    elApiRateBadge.textContent = 'Consultando...';
    elApiRateBadge.className = 'api-status-badge';
  }

  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) throw new Error('Error en API');
    const data = await response.json();
    if (data && data.rates && data.rates.PEN) {
      const liveRate = parseFloat(data.rates.PEN.toFixed(3));
      appState.exchangeRate = liveRate;
      if (elExchangeRateInput) elExchangeRateInput.value = liveRate;
      saveState();

      if (elApiRateBadge) {
        elApiRateBadge.textContent = 'En vivo';
        elApiRateBadge.className = 'api-status-badge';
        elApiRateBadge.title = `Actualizado: ${new Date().toLocaleTimeString()}`;
      }
      updateUI();
    }
  } catch (err) {
    console.warn('Usando valor local de tipo de cambio:', err);
    if (elApiRateBadge) {
      elApiRateBadge.textContent = 'Manual';
      elApiRateBadge.title = 'No se pudo conectar a la API en vivo; editable manualmente.';
    }
  } finally {
    if (elBtnFetchRate) elBtnFetchRate.classList.remove('spinning');
  }
}

/* ==========================================================================
   INICIALIZACIÓN Y EVENT LISTENERS
   ========================================================================== */
function init() {
  if (elCurrencySelect) elCurrencySelect.value = appState.currency;
  if (elExchangeRateInput) elExchangeRateInput.value = appState.exchangeRate;
  if (elEmergencyRate) elEmergencyRate.value = appState.emergencyRate;
  if (elEmergencyPctVal) elEmergencyPctVal.textContent = `${appState.emergencyRate}%`;
  if (elDispEmergencyPctLabel) elDispEmergencyPctLabel.textContent = `${appState.emergencyRate}%`;

  // Inicializar Pestaña Activa
  switchTab(appState.activeTab || 'budget');

  // Inicializar Inputs de Interés Compuesto
  initCompoundInputs();

  updatePeriodButtons();
  setupEventListeners();
  updateCurrencySymbols();
  updateUI();
  updateCompoundInterest();

  fetchLiveExchangeRate();
}

function updatePeriodButtons() {
  const isMonthly = appState.viewPeriod === 'monthly';
  if (elBtnPeriodMonthly) elBtnPeriodMonthly.classList.toggle('active', isMonthly);
  if (elBtnPeriodAnnual) elBtnPeriodAnnual.classList.toggle('active', !isMonthly);

  document.querySelectorAll('.period-text-label').forEach(el => {
    el.textContent = isMonthly ? 'Mensuales' : 'Anuales';
  });
}

function setupEventListeners() {
  // Cambio de período Mensual / Anual
  if (elBtnPeriodMonthly) {
    elBtnPeriodMonthly.addEventListener('click', () => {
      appState.viewPeriod = 'monthly';
      updatePeriodButtons();
      saveState();
      updateUI();
    });
  }

  if (elBtnPeriodAnnual) {
    elBtnPeriodAnnual.addEventListener('click', () => {
      appState.viewPeriod = 'annual';
      updatePeriodButtons();
      saveState();
      updateUI();
    });
  }

  // Cargar Plantilla de Ejemplo
  if (elBtnLoadTemplate) {
    elBtnLoadTemplate.addEventListener('click', () => {
      if (confirm('¿Deseas cargar la plantilla de presupuesto recomendada por Finanzas para Todos?')) {
        appState.incomes = JSON.parse(JSON.stringify(FPT_TEMPLATE.incomes));
        appState.expenses = JSON.parse(JSON.stringify(FPT_TEMPLATE.expenses));
        saveState();
        updateUI();
      }
    });
  }

  // Imprimir informe
  if (elBtnPrintReport) {
    elBtnPrintReport.addEventListener('click', () => {
      preparePrintReport();
      window.print();
    });
  }

  // Refrescar tipo de cambio
  if (elBtnFetchRate) {
    elBtnFetchRate.addEventListener('click', () => fetchLiveExchangeRate(true));
  }

  // Selector de moneda
  if (elCurrencySelect) {
    elCurrencySelect.addEventListener('change', (e) => {
      appState.currency = e.target.value;
      saveState();
      updateCurrencySymbols();
      updateUI();
    });
  }

  // Input tipo de cambio manual
  if (elExchangeRateInput) {
    elExchangeRateInput.addEventListener('input', (e) => {
      const rate = parseFloat(e.target.value);
      if (!isNaN(rate) && rate > 0) {
        appState.exchangeRate = rate;
        if (elApiRateBadge) elApiRateBadge.textContent = 'Editado';
        saveState();
        updateUI();
      }
    });
  }

  // Slider Fondo Emergencia
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

  // Toggle formulario Ingresos
  if (elBtnToggleIncomeForm) {
    elBtnToggleIncomeForm.addEventListener('click', () => {
      const isVisible = elIncomeForm.style.display !== 'none';
      elIncomeForm.style.display = isVisible ? 'none' : 'block';
      if (!isVisible && elIncomeName) elIncomeName.focus();
    });
  }

  if (elBtnCancelIncome) {
    elBtnCancelIncome.addEventListener('click', () => {
      elIncomeForm.style.display = 'none';
      elIncomeName.value = '';
      elIncomeAmount.value = '';
    });
  }

  // Enviar Formulario Ingreso
  if (elIncomeForm) {
    elIncomeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = elIncomeName.value.trim();
      const inputVal = parseFloat(elIncomeAmount.value);
      const frequency = elIncomeFrequency.value;

      if (!name || isNaN(inputVal) || inputVal <= 0) return;

      const amountPEN = fromSelectedToPEN(inputVal);

      appState.incomes.push({
        id: 'inc_' + Date.now().toString(),
        name,
        amount: amountPEN,
        frequency
      });

      saveState();
      updateUI();

      elIncomeName.value = '';
      elIncomeAmount.value = '';
      elIncomeForm.style.display = 'none';
    });
  }

  // Enviar Formulario Gasto
  if (elExpenseForm) {
    elExpenseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = elExpenseName.value.trim();
      const inputVal = parseFloat(elExpenseAmount.value);
      const category = elExpenseCategory.value;
      const frequency = elExpenseFrequency.value;
      const fptType = document.querySelector('input[name="expenseFptType"]:checked').value;

      if (!name || isNaN(inputVal) || inputVal <= 0) return;

      const amountPEN = fromSelectedToPEN(inputVal);

      appState.expenses.unshift({
        id: 'exp_' + Date.now().toString(),
        name,
        amount: amountPEN,
        frequency,
        category,
        fptType
      });

      saveState();
      updateUI();

      elExpenseName.value = '';
      elExpenseAmount.value = '';
      elExpenseName.focus();
    });
  }

  // Filtros de gastos
  if (elFilterFptType) elFilterFptType.addEventListener('change', renderExpensesList);
  if (elFilterCategory) elFilterCategory.addEventListener('change', renderExpensesList);

  // Selector modo de gráfico
  if (elBtnChartByType) {
    elBtnChartByType.addEventListener('click', () => {
      appState.chartMode = 'fptType';
      elBtnChartByType.classList.add('active');
      if (elBtnChartByCategory) elBtnChartByCategory.classList.remove('active');
      saveState();
      updateChart();
    });
  }

  if (elBtnChartByCategory) {
    elBtnChartByCategory.addEventListener('click', () => {
      appState.chartMode = 'category';
      elBtnChartByCategory.classList.add('active');
      if (elBtnChartByType) elBtnChartByType.classList.remove('active');
      saveState();
      updateChart();
    });
  }

  // Pestañas Principales (Presupuesto vs Interés Compuesto)
  if (elTabBtnBudget) {
    elTabBtnBudget.addEventListener('click', () => {
      switchTab('budget');
    });
  }

  if (elTabBtnCompound) {
    elTabBtnCompound.addEventListener('click', () => {
      switchTab('compound');
    });
  }

  // Listeners Interés Compuesto: Sincronización entre Inputs y Sliders
  setupCompoundEventListeners();

  // Reiniciar todo
  if (elBtnResetAll) {
    elBtnResetAll.addEventListener('click', () => {
      if (confirm('¿Estás seguro de que deseas vaciar todos los ingresos y gastos registrados?')) {
        appState.incomes = [];
        appState.expenses = [];
        saveState();
        updateUI();
        updateCompoundInterest();
      }
    });
  }
}

/* ==========================================================================
   ELIMINACIÓN DE REGISTROS
   ========================================================================== */
window.deleteIncome = function(id) {
  appState.incomes = appState.incomes.filter(item => item.id !== id);
  saveState();
  updateUI();
};

window.deleteExpense = function(id) {
  appState.expenses = appState.expenses.filter(item => item.id !== id);
  saveState();
  updateUI();
};

/* ==========================================================================
   CÁLCULOS Y ACTUALIZACIÓN GLOBAL (Finanzas Para Todos)
   ========================================================================== */
function updateUI() {
  const period = appState.viewPeriod; // 'monthly' | 'annual'

  // Total Ingresos normalizados según período activo
  const totalIncome = appState.incomes.reduce((sum, item) => {
    return sum + normalizeAmount(item.amount, item.frequency, period);
  }, 0);

  // Desglose por los 3 Pilares Oficiales de Gastos
  let fixedSum = 0;
  let variableSum = 0;
  let discretionarySum = 0;

  appState.expenses.forEach(item => {
    const normalized = normalizeAmount(item.amount, item.frequency, period);
    if (item.fptType === 'fixed_obligatory') {
      fixedSum += normalized;
    } else if (item.fptType === 'variable_necessary') {
      variableSum += normalized;
    } else {
      discretionarySum += normalized;
    }
  });

  const totalExpense = fixedSum + variableSum + discretionarySum;

  // Fondo de Emergencia (% de los ingresos)
  const emergencyPct = appState.emergencyRate || 0;
  const emergencyAmount = totalIncome * (emergencyPct / 100);

  // Remanente (Saldo neto restante)
  const remaining = totalIncome - totalExpense - emergencyAmount;

  // Capacidad de ahorro total (% de ingresos que no se consume en gastos)
  const totalRetenido = Math.max(0, totalIncome - totalExpense);
  const savingsRate = totalIncome > 0 ? (totalRetenido / totalIncome) * 100 : 0;

  // 1. Actualizar Tarjetas Principales
  elDispTotalIncome.textContent = formatCurrency(totalIncome);
  elDispTotalExpense.textContent = formatCurrency(totalExpense);
  elDispRemainingBalance.textContent = formatCurrency(remaining);
  elDispEmergencyAmount.textContent = formatCurrency(emergencyAmount);
  elDispSavingsRateValue.textContent = `${savingsRate.toFixed(1)}%`;
  elDispSavingsRate.textContent = totalIncome > 0 
    ? `${savingsRate.toFixed(1)}% de tus ingresos retenidos` 
    : 'De tus ingresos totales';

  // Equivalencias en moneda opuesta
  if (elSubDispIncome) elSubDispIncome.textContent = `≈ ${formatOppositeCurrency(totalIncome)}`;
  if (elSubDispExpense) elSubDispExpense.textContent = `≈ ${formatOppositeCurrency(totalExpense)}`;
  if (elSubDispBalance) elSubDispBalance.textContent = `≈ ${formatOppositeCurrency(remaining)}`;
  if (elSubDispEmergency) elSubDispEmergency.textContent = `≈ ${formatOppositeCurrency(emergencyAmount)}`;

  if (elTxtEmergencyApartado) {
    elTxtEmergencyApartado.textContent = formatCurrency(emergencyAmount);
  }

  // Estado del saldo neto
  elCardBalance.classList.remove('positive', 'negative');
  if (totalIncome === 0 && totalExpense === 0) {
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

  // 2. Resumen 3 Pilares Oficiales Finanzas para Todos
  elDispSumFixed.textContent = formatCurrency(fixedSum);
  elDispSumVariable.textContent = formatCurrency(variableSum);
  elDispSumDiscretionary.textContent = formatCurrency(discretionarySum);

  const pctFixed = totalIncome > 0 ? (fixedSum / totalIncome) * 100 : 0;
  const pctVar = totalIncome > 0 ? (variableSum / totalIncome) * 100 : 0;
  const pctDisc = totalIncome > 0 ? (discretionarySum / totalIncome) * 100 : 0;

  elPctSumFixed.textContent = `${pctFixed.toFixed(1)}%`;
  elPctSumVariable.textContent = `${pctVar.toFixed(1)}%`;
  elPctSumDiscretionary.textContent = `${pctDisc.toFixed(1)}%`;

  // 3. Indicador de Rigidez Financiera (% de Fijos Obligatorios sobre Ingresos)
  renderRigidityIndicator(totalIncome, fixedSum, pctFixed);

  // 4. Regla 50 / 30 / 20
  calculate50_30_20(totalIncome, fixedSum, variableSum, discretionarySum, remaining, emergencyAmount);

  // 5. Renderizar Listas
  renderIncomesList();
  renderExpensesList();

  // 6. Actualizar Gráfica
  updateChart();

  // 7. Generar Diagnóstico Pedagógico Finanzas para Todos
  generateAdvice(totalIncome, totalExpense, remaining, pctFixed, pctDisc, savingsRate);
}

/* ==========================================================================
   RENDERIZADO DE INDICADOR DE RIGIDEZ FINANCIERA
   ========================================================================== */
function renderRigidityIndicator(totalIncome, fixedSum, pctFixed) {
  elTxtRigidityAmount.textContent = formatCurrency(fixedSum);
  elPctRigidityVal.textContent = `(${pctFixed.toFixed(1)}%)`;
  elBarRigidity.style.width = `${Math.min(pctFixed, 100)}%`;

  if (totalIncome <= 0) {
    elBarRigidity.classList.remove('fill-alert');
    elMsgRigidity.className = 'rule-hint';
    elMsgRigidity.textContent = 'Registra tus ingresos para calcular el índice de rigidez.';
    return;
  }

  if (pctFixed > 50) {
    elBarRigidity.classList.add('fill-alert');
    elMsgRigidity.className = 'rule-hint warning';
    elMsgRigidity.textContent = `⚠️ ¡Alerta de Rigidez! Los gastos fijos comprometen el ${pctFixed.toFixed(1)}% de tus ingresos (máx. recomendado: 45-50%). Tienes poco margen de maniobra.`;
  } else if (pctFixed > 40) {
    elBarRigidity.classList.remove('fill-alert');
    elMsgRigidity.className = 'rule-hint warning';
    elMsgRigidity.textContent = `⚡ Nivel Moderado (${pctFixed.toFixed(1)}%). Estás cerca del límite seguro de gastos obligatorios. Evita contraer más deudas.`;
  } else {
    elBarRigidity.classList.remove('fill-alert');
    elMsgRigidity.className = 'rule-hint success';
    elMsgRigidity.textContent = `✓ Rigidez Saludable (${pctFixed.toFixed(1)}%). Tus gastos obligatorios están bajo control y permiten afrontar imprevistos.`;
  }
}

/* ==========================================================================
   CÁLCULO REGLA 50 / 30 / 20
   ========================================================================== */
function calculate50_30_20(income, fixedSum, variableSum, discretionarySum, remaining, emergencyAmount) {
  // Necesidades básicas = Gastos Fijos Obligatorios + Variables Necesarios
  const needsTotal = fixedSum + variableSum;
  const wantsTotal = discretionarySum;
  const savingsTotal = Math.max(0, emergencyAmount + Math.max(0, remaining));

  const idealNeeds = income * 0.50;
  const idealWants = income * 0.30;
  const idealSavings = income * 0.20;

  const pctNeedsVal = income > 0 ? (needsTotal / income) * 100 : 0;
  const pctWantsVal = income > 0 ? (wantsTotal / income) * 100 : 0;
  const pctSavingsVal = income > 0 ? (savingsTotal / income) * 100 : 0;

  // Necesidades (50%)
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

  // Deseos (30%)
  elTxtWantsAmount.textContent = formatCurrency(wantsTotal);
  elTxtWantsIdeal.textContent = formatCurrency(idealWants);
  elPctWants.textContent = `(${pctWantsVal.toFixed(1)}%)`;
  elBarWants.style.width = `${Math.min(pctWantsVal, 100)}%`;

  if (pctWantsVal > 30) {
    elBarWants.classList.add('fill-alert');
    elMsgWants.className = 'rule-hint warning';
    elMsgWants.textContent = `⚠️ Tus gastos discrecionales superan el 30% en ${(pctWantsVal - 30).toFixed(1)}%.`;
  } else {
    elBarWants.classList.remove('fill-alert');
    elMsgWants.className = 'rule-hint success';
    elMsgWants.textContent = `✓ Gasto discrecional controlado (Máx. 30%).`;
  }

  // Ahorro (20%)
  elTxtSavingsAmount.textContent = formatCurrency(savingsTotal);
  elTxtSavingsIdeal.textContent = formatCurrency(idealSavings);
  elPctSavings.textContent = `(${pctSavingsVal.toFixed(1)}%)`;
  elBarSavings.style.width = `${Math.min(pctSavingsVal, 100)}%`;

  if (income > 0 && pctSavingsVal < 20) {
    elMsgSavings.className = 'rule-hint warning';
    elMsgSavings.textContent = `⚠️ Ahorro total inferior al 20% objetivo. Faltan ${(20 - pctSavingsVal).toFixed(1)}%.`;
  } else if (income > 0) {
    elMsgSavings.className = 'rule-hint success';
    elMsgSavings.textContent = `🎉 ¡Objetivo cumplido! Ahorras un 20% o más de tus ingresos.`;
  } else {
    elMsgSavings.className = 'rule-hint';
    elMsgSavings.textContent = 'Ingresa tus fuentes de ingreso para calcular.';
  }
}

/* ==========================================================================
   RENDERIZADO DE LISTA DE INGRESOS
   ========================================================================== */
function renderIncomesList() {
  const period = appState.viewPeriod;
  elIncomesCount.textContent = appState.incomes.length;

  if (appState.incomes.length === 0) {
    elIncomesListContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-money-bill-wave"></i>
        <p>No tienes ingresos registrados. Haz clic en "Añadir Ingreso".</p>
      </div>
    `;
    return;
  }

  elIncomesListContainer.innerHTML = appState.incomes.map(inc => {
    const multInfo = FREQUENCY_MULTIPLIERS[inc.frequency] || FREQUENCY_MULTIPLIERS.monthly;
    const normalizedAmount = normalizeAmount(inc.amount, inc.frequency, period);

    return `
      <div class="income-item">
        <div class="item-left">
          <div class="category-badge">💰</div>
          <div class="item-details">
            <span class="item-title">${escapeHTML(inc.name)}</span>
            <div class="item-meta">
              <span class="freq-badge">${multInfo.label}: ${formatCurrency(inc.amount)}</span>
              <span>• Impacto ${period === 'monthly' ? 'mes' : 'año'}:</span>
            </div>
          </div>
        </div>
        <div class="item-right">
          <div class="item-val-wrapper">
            <span class="income-val">+${formatCurrency(normalizedAmount)}</span>
            <small class="item-val-sub">≈ +${formatOppositeCurrency(normalizedAmount)}</small>
          </div>
          <button class="btn-delete" onclick="deleteIncome('${inc.id}')" title="Eliminar ingreso">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   RENDERIZADO DE LISTA DE GASTOS
   ========================================================================== */
function renderExpensesList() {
  const period = appState.viewPeriod;
  const filterType = elFilterFptType ? elFilterFptType.value : 'all';
  const filterCat = elFilterCategory ? elFilterCategory.value : 'all';

  let filtered = appState.expenses;

  if (filterType !== 'all') {
    filtered = filtered.filter(e => e.fptType === filterType);
  }
  if (filterCat !== 'all') {
    filtered = filtered.filter(e => e.category === filterCat);
  }

  elExpenseCount.textContent = appState.expenses.length;

  if (filtered.length === 0) {
    elExpenseListContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-receipt"></i>
        <p>${appState.expenses.length === 0 ? 'Aún no has registrado gastos.' : 'No hay gastos con los filtros aplicados.'}</p>
      </div>
    `;
    return;
  }

  elExpenseListContainer.innerHTML = filtered.map(expense => {
    const icon = CATEGORY_ICONS[expense.category] || '💸';
    const multInfo = FREQUENCY_MULTIPLIERS[expense.frequency] || FREQUENCY_MULTIPLIERS.monthly;
    const normalizedAmount = normalizeAmount(expense.amount, expense.frequency, period);

    let typeTag = 'Fijo Obligatorio';
    let typeClass = 'fpt-tag-fixed';

    if (expense.fptType === 'variable_necessary') {
      typeTag = 'Variable Necesario';
      typeClass = 'fpt-tag-variable';
    } else if (expense.fptType === 'discretionary') {
      typeTag = 'Discrecional';
      typeClass = 'fpt-tag-discretionary';
    }

    return `
      <div class="expense-item">
        <div class="item-left">
          <div class="category-badge">${icon}</div>
          <div class="item-details">
            <span class="item-title">${escapeHTML(expense.name)}</span>
            <div class="item-meta">
              <span class="fpt-badge-tag ${typeClass}">${typeTag}</span>
              <span>•</span>
              <span class="freq-badge">${multInfo.label}: ${formatCurrency(expense.amount)}</span>
              <span>•</span>
              <span>${expense.category}</span>
            </div>
          </div>
        </div>
        <div class="item-right">
          <div class="item-val-wrapper">
            <span class="expense-val">-${formatCurrency(normalizedAmount)}</span>
            <small class="item-val-sub">≈ -${formatOppositeCurrency(normalizedAmount)}</small>
          </div>
          <button class="btn-delete" onclick="deleteExpense('${expense.id}')" title="Eliminar gasto">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   GRÁFICO CHART.JS (Alternable entre Por Tipo FPT y Por Categoría)
   ========================================================================== */
function updateChart() {
  if (appState.expenses.length === 0) {
    if (elChartPlaceholder) elChartPlaceholder.style.display = 'flex';
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  if (elChartPlaceholder) elChartPlaceholder.style.display = 'none';
  const period = appState.viewPeriod;
  const isTypeMode = appState.chartMode === 'fptType';

  let labels = [];
  let data = [];
  let colors = [];

  if (isTypeMode) {
    // 3 Pilares Oficiales
    labels = ['Gastos Fijos Obligatorios', 'Gastos Variables Necesarios', 'Gastos Discrecionales'];
    colors = ['#ef4444', '#f59e0b', '#10b981'];

    const sums = { fixed_obligatory: 0, variable_necessary: 0, discretionary: 0 };
    appState.expenses.forEach(e => {
      const norm = normalizeAmount(e.amount, e.frequency, period);
      sums[e.fptType] = (sums[e.fptType] || 0) + norm;
    });

    data = [sums.fixed_obligatory, sums.variable_necessary, sums.discretionary];
  } else {
    // Por Categoría
    const catSums = {};
    appState.expenses.forEach(e => {
      const norm = normalizeAmount(e.amount, e.frequency, period);
      catSums[e.category] = (catSums[e.category] || 0) + norm;
    });

    labels = Object.keys(catSums);
    data = Object.values(catSums);
    colors = [
      '#6366f1', '#06b6d4', '#f59e0b', '#ec4899',
      '#10b981', '#8b5cf6', '#3b82f6', '#14b8a6',
      '#f43f5e', '#a855f7', '#fb923c', '#64748b'
    ].slice(0, labels.length);
  }

  if (chartInstance) {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = data;
    chartInstance.data.datasets[0].backgroundColor = colors;
    chartInstance.update();
  } else {
    const ctx = elExpensesPieChart.getContext('2d');
    chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
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

/* ==========================================================================
   CONSEJOS PEDAGÓGICOS FINANZAS PARA TODOS
   ========================================================================== */
function generateAdvice(income, totalExpense, remaining, pctFixed, pctDisc, savingsRate) {
  if (income <= 0) {
    elDynamicAdvice.innerHTML = `<p>👉 Empieza registrando tus <strong>fuentes de ingreso</strong> (nómina, pensiones, pagas extras) para obtener un análisis guiado.</p>`;
    return;
  }

  if (remaining < 0) {
    elDynamicAdvice.innerHTML = `
      <p style="color: #f87171;">🚨 <strong>¡Déficit presupuestario!</strong> Tus compromisos superan tus ingresos en <strong>${formatCurrency(Math.abs(remaining))}</strong>.</p>
      <p style="margin-top: 0.5rem;"><strong>Recomendación Finanzas para Todos:</strong> El primer paso para salir del déficit es recortar inmediatamente en los <strong>Gastos Discrecionales</strong> (ocio, suscripciones, salidas), ya que los gastos obligatorios no pueden suprimirse sin incurrir en mora.</p>
    `;
    return;
  }

  if (pctFixed > 50) {
    elDynamicAdvice.innerHTML = `
      <p style="color: #fbbf24;">⚠️ <strong>Alerta de rigidez financiera:</strong> El <strong>${pctFixed.toFixed(1)}%</strong> de tus ingresos está atado a pagos ineludibles (Fijos Obligatorios).</p>
      <p style="margin-top: 0.5rem;">Finanzas para Todos aconseja no sobrepasar el 45% - 50% en fijos. Intenta renegociar hipotecas o préstamos y evita asumir nuevas cuotas a plazos.</p>
    `;
    return;
  }

  if (savingsRate >= 20) {
    elDynamicAdvice.innerHTML = `
      <p style="color: #34d399;">🌟 <strong>¡Excelente equilibrio financiero!</strong> Logras una capacidad de retención y ahorro del <strong>${savingsRate.toFixed(1)}%</strong>, cumpliendo con la regla dorada del ahorro.</p>
      <p style="margin-top: 0.5rem;">Asegúrate de consolidar primero un Fondo de Emergencia de 3 a 6 meses de gastos fijos. Una vez cubierto, canaliza el excedente hacia metas de inversión a largo plazo.</p>
    `;
    return;
  }

  elDynamicAdvice.innerHTML = `
    <p style="color: #38bdf8;">💡 <strong>Presupuesto equilibrado:</strong> Tu estructura de gastos es sostenible, reteniendo el <strong>${savingsRate.toFixed(1)}%</strong> de tus ingresos.</p>
    <p style="margin-top: 0.5rem;">Si deseas elevar tu ahorro al 20%, optimiza consumos en <em>Gastos Variables</em> (luz, supermercado) y modera ligeramente los <em>Gastos Discrecionales</em>.</p>
  `;
}

/* ==========================================================================
   PREPARACIÓN DE INFORME IMPRIMIBLE (PDF / PAPEL)
   ========================================================================== */
function preparePrintReport() {
  const period = appState.viewPeriod;
  const periodLabel = period === 'monthly' ? 'Mensual' : 'Anual';

  document.getElementById('printDate').textContent = new Date().toLocaleDateString('es-ES', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  document.getElementById('printPeriodMode').textContent = periodLabel;
  document.getElementById('printCurrency').textContent = appState.currency === 'PEN' ? 'Soles (S/)' : 'Dólares ($)';

  const totalIncome = appState.incomes.reduce((sum, item) => sum + normalizeAmount(item.amount, item.frequency, period), 0);

  let fixedSum = 0;
  let variableSum = 0;
  let discSum = 0;

  appState.expenses.forEach(e => {
    const norm = normalizeAmount(e.amount, e.frequency, period);
    if (e.fptType === 'fixed_obligatory') fixedSum += norm;
    else if (e.fptType === 'variable_necessary') variableSum += norm;
    else discSum += norm;
  });

  const totalExpenses = fixedSum + variableSum + discSum;
  const emergencyAmount = totalIncome * ((appState.emergencyRate || 0) / 100);
  const remaining = totalIncome - totalExpenses - emergencyAmount;

  document.getElementById('pTotalIncome').textContent = formatCurrency(totalIncome);
  document.getElementById('pFixedExpenses').textContent = formatCurrency(fixedSum);
  document.getElementById('pFixedPct').textContent = totalIncome > 0 ? `${((fixedSum / totalIncome) * 100).toFixed(1)}%` : '0%';

  document.getElementById('pVariableExpenses').textContent = formatCurrency(variableSum);
  document.getElementById('pVariablePct').textContent = totalIncome > 0 ? `${((variableSum / totalIncome) * 100).toFixed(1)}%` : '0%';

  document.getElementById('pDiscretionaryExpenses').textContent = formatCurrency(discSum);
  document.getElementById('pDiscretionaryPct').textContent = totalIncome > 0 ? `${((discSum / totalIncome) * 100).toFixed(1)}%` : '0%';

  document.getElementById('pTotalExpenses').textContent = formatCurrency(totalExpenses);
  document.getElementById('pTotalExpensesPct').textContent = totalIncome > 0 ? `${((totalExpenses / totalIncome) * 100).toFixed(1)}%` : '0%';

  document.getElementById('pEmergencyAmount').textContent = formatCurrency(emergencyAmount);
  document.getElementById('pEmergencyPct').textContent = `${appState.emergencyRate || 0}%`;

  document.getElementById('pRemainingBalance').textContent = formatCurrency(remaining);
  document.getElementById('pRemainingPct').textContent = totalIncome > 0 ? `${((remaining / totalIncome) * 100).toFixed(1)}%` : '0%';

  // Renderizar listados en el reporte imprimible
  const printIncomesList = document.getElementById('printIncomesList');
  if (appState.incomes.length === 0) {
    printIncomesList.innerHTML = '<p>Sin ingresos registrados.</p>';
  } else {
    printIncomesList.innerHTML = appState.incomes.map(inc => {
      const norm = normalizeAmount(inc.amount, inc.frequency, period);
      return `
        <div class="print-item-row">
          <span>${escapeHTML(inc.name)} (${FREQUENCY_MULTIPLIERS[inc.frequency].label})</span>
          <strong>+${formatCurrency(norm)}</strong>
        </div>
      `;
    }).join('');
  }

  const printExpensesList = document.getElementById('printExpensesList');
  if (appState.expenses.length === 0) {
    printExpensesList.innerHTML = '<p>Sin gastos registrados.</p>';
  } else {
    printExpensesList.innerHTML = appState.expenses.map(e => {
      const norm = normalizeAmount(e.amount, e.frequency, period);
      const tag = e.fptType === 'fixed_obligatory' ? 'Fijo' : e.fptType === 'variable_necessary' ? 'Variable' : 'Discrecional';
      return `
        <div class="print-item-row">
          <span>[${tag}] ${escapeHTML(e.name)}</span>
          <strong>-${formatCurrency(norm)}</strong>
        </div>
      `;
    }).join('');
  }
}

/* ==========================================================================
   CONMUTACIÓN DE PESTAÑAS (PRESUPUESTO VS INTERÉS COMPUESTO)
   ========================================================================== */
function switchTab(tabId) {
  appState.activeTab = tabId;
  saveState();

  if (elTabBtnBudget) elTabBtnBudget.classList.toggle('active', tabId === 'budget');
  if (elTabBtnCompound) elTabBtnCompound.classList.toggle('active', tabId === 'compound');

  if (elTabContentBudget) {
    elTabContentBudget.style.display = tabId === 'budget' ? 'block' : 'none';
    if (tabId === 'budget') elTabContentBudget.classList.add('active');
    else elTabContentBudget.classList.remove('active');
  }

  if (elTabContentCompound) {
    elTabContentCompound.style.display = tabId === 'compound' ? 'block' : 'none';
    if (tabId === 'compound') {
      elTabContentCompound.classList.add('active');
      // Redibujar gráfico para evitar problemas de tamaño por display: none
      setTimeout(() => {
        if (ciChartInstance) ciChartInstance.resize();
        else updateCompoundInterest();
      }, 50);
    } else {
      elTabContentCompound.classList.remove('active');
    }
  }
}

/* ==========================================================================
   LÓGICA DE INTERÉS COMPUESTO
   ========================================================================== */
function initCompoundInputs() {
  const ci = appState.compound;
  if (!ci) return;

  // Convertir montos a la moneda seleccionada para mostrarlos en los inputs
  const initialInView = toSelectedCurrency(ci.initialDeposit);
  const monthlyInView = toSelectedCurrency(ci.monthlyContribution);

  if (elCiInitialDeposit) elCiInitialDeposit.value = Math.round(initialInView);
  if (elCiInitialRange) elCiInitialRange.value = Math.min(Math.round(initialInView), 50000);

  if (elCiMonthlyContribution) elCiMonthlyContribution.value = Math.round(monthlyInView);
  if (elCiMonthlyRange) elCiMonthlyRange.value = Math.min(Math.round(monthlyInView), 10000);

  if (elCiYears) elCiYears.value = ci.years;
  if (elCiYearsRange) elCiYearsRange.value = ci.years;

  if (elCiAnnualRate) elCiAnnualRate.value = ci.annualRate;
  if (elCiRateRange) elCiRateRange.value = ci.annualRate;

  updateCompoundBadges();
}

function updateCompoundBadges() {
  const ci = appState.compound;
  if (!ci) return;

  if (elCiBadgeInitial) elCiBadgeInitial.textContent = formatCurrency(ci.initialDeposit);
  if (elCiBadgeMonthly) elCiBadgeMonthly.textContent = formatCurrency(ci.monthlyContribution);
  if (elCiBadgeYears) elCiBadgeYears.textContent = `${ci.years} ${ci.years === 1 ? 'año' : 'años'}`;
  if (elCiBadgeRate) elCiBadgeRate.textContent = `${ci.annualRate.toFixed(1)}%`;
}

function setupCompoundEventListeners() {
  // 1. Ahorro Inicial (Sincronización Input <-> Range)
  if (elCiInitialDeposit) {
    elCiInitialDeposit.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 0;
      appState.compound.initialDeposit = fromSelectedToPEN(val);
      if (elCiInitialRange) elCiInitialRange.value = Math.min(val, 50000);
      updateCompoundBadges();
      saveState();
      updateCompoundInterest();
    });
  }

  if (elCiInitialRange) {
    elCiInitialRange.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 0;
      if (elCiInitialDeposit) elCiInitialDeposit.value = val;
      appState.compound.initialDeposit = fromSelectedToPEN(val);
      updateCompoundBadges();
      saveState();
      updateCompoundInterest();
    });
  }

  // 2. Aportación Mensual (Sincronización Input <-> Range)
  if (elCiMonthlyContribution) {
    elCiMonthlyContribution.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 0;
      appState.compound.monthlyContribution = fromSelectedToPEN(val);
      if (elCiMonthlyRange) elCiMonthlyRange.value = Math.min(val, 10000);
      updateCompoundBadges();
      saveState();
      updateCompoundInterest();
    });
  }

  if (elCiMonthlyRange) {
    elCiMonthlyRange.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 0;
      if (elCiMonthlyContribution) elCiMonthlyContribution.value = val;
      appState.compound.monthlyContribution = fromSelectedToPEN(val);
      updateCompoundBadges();
      saveState();
      updateCompoundInterest();
    });
  }

  // 3. Años (Sincronización Input <-> Range)
  if (elCiYears) {
    elCiYears.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) || 1;
      const clamped = Math.max(1, Math.min(50, val));
      appState.compound.years = clamped;
      if (elCiYearsRange) elCiYearsRange.value = clamped;
      updateCompoundBadges();
      saveState();
      updateCompoundInterest();
    });
  }

  if (elCiYearsRange) {
    elCiYearsRange.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) || 1;
      if (elCiYears) elCiYears.value = val;
      appState.compound.years = val;
      updateCompoundBadges();
      saveState();
      updateCompoundInterest();
    });
  }

  // 4. Rendimiento Anual (Sincronización Input <-> Range)
  if (elCiAnnualRate) {
    elCiAnnualRate.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 0.1;
      appState.compound.annualRate = Math.max(0.1, Math.min(50, val));
      if (elCiRateRange) elCiRateRange.value = Math.min(val, 25);
      updatePresetButtons(val);
      updateCompoundBadges();
      saveState();
      updateCompoundInterest();
    });
  }

  if (elCiRateRange) {
    elCiRateRange.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 0.1;
      if (elCiAnnualRate) elCiAnnualRate.value = val;
      appState.compound.annualRate = val;
      updatePresetButtons(val);
      updateCompoundBadges();
      saveState();
      updateCompoundInterest();
    });
  }

  // Botones de presets de rendimiento
  document.querySelectorAll('.btn-ci-preset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const rate = parseFloat(e.currentTarget.dataset.rate);
      if (!isNaN(rate)) {
        appState.compound.annualRate = rate;
        if (elCiAnnualRate) elCiAnnualRate.value = rate;
        if (elCiRateRange) elCiRateRange.value = rate;
        updatePresetButtons(rate);
        updateCompoundBadges();
        saveState();
        updateCompoundInterest();
      }
    });
  });

  // Botón "Usar Sobrante del Presupuesto"
  if (elCiBtnUseSurplus) {
    elCiBtnUseSurplus.addEventListener('click', () => {
      const period = 'monthly';
      const totalIncome = appState.incomes.reduce((sum, item) => sum + normalizeAmount(item.amount, item.frequency, period), 0);
      const totalExpenses = appState.expenses.reduce((sum, item) => sum + normalizeAmount(item.amount, item.frequency, period), 0);
      const emergencyAmount = totalIncome * ((appState.emergencyRate || 0) / 100);
      const remaining = Math.max(0, totalIncome - totalExpenses - emergencyAmount);

      if (remaining > 0) {
        appState.compound.monthlyContribution = remaining;
        const inView = toSelectedCurrency(remaining);
        if (elCiMonthlyContribution) elCiMonthlyContribution.value = Math.round(inView);
        if (elCiMonthlyRange) elCiMonthlyRange.value = Math.min(Math.round(inView), 10000);
        updateCompoundBadges();
        saveState();
        updateCompoundInterest();
        alert(`¡Conectado! Se asignó tu sobrante mensual libre de ${formatCurrency(remaining)} como aportación.`);
      } else {
        alert('No tienes sobrante mensual libre en tu presupuesto actual para asignar como aportación recurrente.');
      }
    });
  }

  // Toggle Gráfico Apilado vs Líneas
  if (elBtnCiChartStacked) {
    elBtnCiChartStacked.addEventListener('click', () => {
      appState.compound.chartMode = 'stacked';
      elBtnCiChartStacked.classList.add('active');
      if (elBtnCiChartLine) elBtnCiChartLine.classList.remove('active');
      saveState();
      updateCompoundChart(lastCiCalculation);
    });
  }

  if (elBtnCiChartLine) {
    elBtnCiChartLine.addEventListener('click', () => {
      appState.compound.chartMode = 'line';
      elBtnCiChartLine.classList.add('active');
      if (elBtnCiChartStacked) elBtnCiChartStacked.classList.remove('active');
      saveState();
      updateCompoundChart(lastCiCalculation);
    });
  }

  // Toggle visualización de tabla anual
  if (elCiBtnToggleTable) {
    elCiBtnToggleTable.addEventListener('click', () => {
      isCiTableExpanded = !isCiTableExpanded;
      if (elCiTableContainer) {
        elCiTableContainer.style.maxHeight = isCiTableExpanded ? '700px' : '380px';
      }
      if (elCiTxtToggleTable) {
        elCiTxtToggleTable.textContent = isCiTableExpanded ? 'Reducir Detalle' : 'Ver Detalle Completo';
      }
    });
  }
}

function updatePresetButtons(currentRate) {
  document.querySelectorAll('.btn-ci-preset').forEach(btn => {
    const rate = parseFloat(btn.dataset.rate);
    btn.classList.toggle('active', Math.abs(rate - currentRate) < 0.05);
  });
}

// Variable en memoria para retener los datos calculados para redibujar el gráfico
let lastCiCalculation = null;

/* ==========================================================================
   FÓRMULA FINANCIERA DE INTERÉS COMPUESTO CON CAPITALIZACIÓN MENSUAL
   ========================================================================== */
function calculateCompoundInterestData(principal, monthlyDeposit, years, annualRatePct) {
  const r = (annualRatePct / 100) / 12; // Tasa mensual efectiva
  const totalMonths = years * 12;

  let currentBalance = principal;
  let totalDeposited = principal;

  const yearlyBreakdown = [];

  // Año 0 (Punto de partida)
  yearlyBreakdown.push({
    year: 0,
    annualDeposit: 0,
    totalDeposited: principal,
    interestEarnedYear: 0,
    totalInterest: 0,
    finalBalance: principal
  });

  let previousYearBalance = principal;
  let previousYearDeposited = principal;

  for (let m = 1; m <= totalMonths; m++) {
    // Rendimiento generado en el mes sobre el capital acumulado
    const interestMonth = currentBalance * r;
    // Se suma el interés y la nueva aportación al final de mes
    currentBalance += interestMonth + monthlyDeposit;
    totalDeposited += monthlyDeposit;

    // Al cierre de cada 12 meses (fin de año)
    if (m % 12 === 0) {
      const yearIndex = m / 12;
      const depositThisYear = totalDeposited - previousYearDeposited;
      const interestEarnedYear = (currentBalance - previousYearBalance) - depositThisYear;
      const totalInterestAcc = currentBalance - totalDeposited;

      yearlyBreakdown.push({
        year: yearIndex,
        annualDeposit: depositThisYear,
        totalDeposited: totalDeposited,
        interestEarnedYear: Math.max(0, interestEarnedYear),
        totalInterest: Math.max(0, totalInterestAcc),
        finalBalance: currentBalance
      });

      previousYearBalance = currentBalance;
      previousYearDeposited = totalDeposited;
    }
  }

  const finalTotal = currentBalance;
  const totalInterestEarned = Math.max(0, finalTotal - totalDeposited);

  return {
    principal,
    monthlyDeposit,
    years,
    annualRatePct,
    totalDeposited,
    totalInterestEarned,
    finalTotal,
    yearlyBreakdown
  };
}

/* ==========================================================================
   ACTUALIZACIÓN DE INTERÉS COMPUESTO
   ========================================================================== */
function updateCompoundInterest() {
  const ci = appState.compound || {
    initialDeposit: 1000,
    monthlyContribution: 250,
    years: 10,
    annualRate: 8.0,
    chartMode: 'stacked'
  };

  const calc = calculateCompoundInterestData(
    ci.initialDeposit,
    ci.monthlyContribution,
    ci.years,
    ci.annualRate
  );

  lastCiCalculation = calc;

  // 1. Mostrar Tarjetas de Métricas Principales
  if (elCiDispFinalTotal) elCiDispFinalTotal.textContent = formatCurrency(calc.finalTotal);
  if (elCiSubDispFinalTotal) elCiSubDispFinalTotal.textContent = `≈ ${formatOppositeCurrency(calc.finalTotal)}`;

  if (elCiDispTotalDeposited) elCiDispTotalDeposited.textContent = formatCurrency(calc.totalDeposited);
  if (elCiSubDispTotalDeposited) elCiSubDispTotalDeposited.textContent = `≈ ${formatOppositeCurrency(calc.totalDeposited)}`;

  if (elCiDispTotalInterest) elCiDispTotalInterest.textContent = formatCurrency(calc.totalInterestEarned);
  if (elCiSubDispTotalInterest) elCiSubDispTotalInterest.textContent = `≈ ${formatOppositeCurrency(calc.totalInterestEarned)}`;

  // Ratios y Multiplicadores
  const multiplier = calc.totalDeposited > 0 ? (calc.finalTotal / calc.totalDeposited) : 1;
  const pctDeposited = calc.finalTotal > 0 ? (calc.totalDeposited / calc.finalTotal) * 100 : 0;
  const pctInterest = calc.finalTotal > 0 ? (calc.totalInterestEarned / calc.finalTotal) * 100 : 0;

  if (elCiBadgeMultiplier) elCiBadgeMultiplier.textContent = `x${multiplier.toFixed(2)} tu dinero`;
  if (elCiPctDepositedHint) elCiPctDepositedHint.textContent = `${pctDeposited.toFixed(1)}% aporte personal`;
  if (elCiPctInterestHint) elCiPctInterestHint.textContent = `${pctInterest.toFixed(1)}% fruto del interés`;

  // 2. Renderizar Tabla de Evolución Año a Año
  renderCompoundTable(calc.yearlyBreakdown);

  // 3. Renderizar Gráfico Interactivo Chart.js
  updateCompoundChart(calc);

  // 4. Actualizar Consejo Educativo Dinámico
  updateCompoundAdvice(calc, multiplier);
}

/* ==========================================================================
   RENDERIZADO DE TABLA DE EVOLUCIÓN AÑO A AÑO
   ========================================================================== */
function renderCompoundTable(breakdown) {
  if (!elCiTableBody) return;

  elCiTableBody.innerHTML = breakdown.filter(row => row.year > 0).map(row => {
    return `
      <tr>
        <td><strong>Año ${row.year}</strong></td>
        <td class="text-right">+${formatCurrency(row.annualDeposit)}</td>
        <td class="text-right">${formatCurrency(row.totalDeposited)}</td>
        <td class="text-right ci-table-interest-gain">+${formatCurrency(row.interestEarnedYear)}</td>
        <td class="text-right ci-table-interest-gain">${formatCurrency(row.totalInterest)}</td>
        <td class="text-right ci-table-final-balance">${formatCurrency(row.finalBalance)}</td>
      </tr>
    `;
  }).join('');
}

/* ==========================================================================
   GRÁFICO CHART.JS INTERÉS COMPUESTO (ÁREA APILADA O LÍNEAS)
   ========================================================================== */
function updateCompoundChart(calc) {
  if (!elCiGrowthChart || !calc) return;

  const isStacked = (appState.compound && appState.compound.chartMode) !== 'line';
  const labels = calc.yearlyBreakdown.map(r => r.year === 0 ? 'Inicio' : `Año ${r.year}`);

  // En modo apilado:
  // Dataset 0: Capital Aportado por ti (en PEN display)
  // Dataset 1: Intereses Ganados (que se apila sobre el capital aportado para sumar el Saldo Total)
  // En modo línea:
  // Mostramos Saldo Total vs Capital Aportado vs Intereses
  let datasets = [];

  if (isStacked) {
    const depositedData = calc.yearlyBreakdown.map(r => toSelectedCurrency(r.totalDeposited));
    const interestData = calc.yearlyBreakdown.map(r => toSelectedCurrency(r.totalInterest));

    datasets = [
      {
        label: 'Aportado por Ti',
        data: depositedData,
        backgroundColor: 'rgba(99, 102, 241, 0.55)',
        borderColor: '#6366f1',
        borderWidth: 2,
        fill: true,
        tension: 0.35,
        pointRadius: 2,
        pointHoverRadius: 6
      },
      {
        label: 'Intereses Generados',
        data: interestData,
        backgroundColor: 'rgba(16, 185, 129, 0.55)',
        borderColor: '#10b981',
        borderWidth: 2,
        fill: true,
        tension: 0.35,
        pointRadius: 2,
        pointHoverRadius: 6
      }
    ];
  } else {
    const totalData = calc.yearlyBreakdown.map(r => toSelectedCurrency(r.finalBalance));
    const depositedData = calc.yearlyBreakdown.map(r => toSelectedCurrency(r.totalDeposited));
    const interestData = calc.yearlyBreakdown.map(r => toSelectedCurrency(r.totalInterest));

    datasets = [
      {
        label: 'Saldo Total Acumulado',
        data: totalData,
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        borderWidth: 3,
        fill: false,
        tension: 0.35,
        pointRadius: 3
      },
      {
        label: 'Aportado por Ti',
        data: depositedData,
        borderColor: '#818cf8',
        borderDash: [5, 5],
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 2
      },
      {
        label: 'Intereses Ganados',
        data: interestData,
        borderColor: '#34d399',
        borderWidth: 2,
        fill: false,
        tension: 0.35,
        pointRadius: 2
      }
    ];
  }

  if (ciChartInstance) {
    ciChartInstance.data.labels = labels;
    ciChartInstance.data.datasets = datasets;
    ciChartInstance.options.scales.x.stacked = isStacked;
    ciChartInstance.options.scales.y.stacked = isStacked;
    ciChartInstance.update();
  } else {
    const ctx = elCiGrowthChart.getContext('2d');
    ciChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            stacked: isStacked,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }
          },
          y: {
            stacked: isStacked,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Plus Jakarta Sans', size: 11 },
              callback: function(value) {
                return (appState.currency === 'PEN' ? 'S/ ' : '$ ') + Number(value).toLocaleString();
              }
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#cbd5e1',
              font: { family: 'Plus Jakarta Sans', size: 11 },
              boxWidth: 12
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const val = context.raw || 0;
                return ` ${context.dataset.label}: ${formatCurrency(fromSelectedToPEN(val))}`;
              },
              afterBody: function(tooltipItems) {
                if (isStacked && tooltipItems.length >= 2) {
                  const totalInTooltip = tooltipItems.reduce((sum, item) => sum + (item.raw || 0), 0);
                  return `\n💰 Saldo Total: ${formatCurrency(fromSelectedToPEN(totalInTooltip))}`;
                }
                return '';
              }
            }
          }
        }
      }
    });
  }
}

/* ==========================================================================
   CONSEJOS EDUCATIVOS DINÁMICOS
   ========================================================================== */
function updateCompoundAdvice(calc, multiplier) {
  if (!elCiEducationalAdvice) return;

  const years = calc.years;
  const rate = calc.annualRatePct;
  const interest = calc.totalInterestEarned;
  const capital = calc.totalDeposited;

  if (interest > capital) {
    elCiEducationalAdvice.innerHTML = `
      <p style="color: #34d399;">🚀 <strong>¡El punto de inflexión exponencial!</strong> En ${years} años, tus ganancias por intereses (<strong>${formatCurrency(interest)}</strong>) superan a todo el dinero que pusiste de tu bolsillo (<strong>${formatCurrency(capital)}</strong>).</p>
      <p style="margin-top: 0.5rem;">Tu dinero trabaja más duro que tú: tu patrimonio se ha multiplicado por <strong>${multiplier.toFixed(2)}</strong> gracias a la reinversión constante.</p>
    `;
  } else if (years >= 15) {
    elCiEducationalAdvice.innerHTML = `
      <p style="color: #38bdf8;">📈 <strong>Efecto bola de nieve en marcha:</strong> Manteniendo una tasa del <strong>${rate.toFixed(1)}%</strong> durante ${years} años, los intereses acumulados representan el <strong>${((interest / calc.finalTotal) * 100).toFixed(1)}%</strong> de tu saldo final.</p>
      <p style="margin-top: 0.5rem;">La constancia mensual es la clave para la libertad financiera a largo plazo.</p>
    `;
  } else {
    elCiEducationalAdvice.innerHTML = `
      <p style="color: #fbbf24;">🌱 <strong>Fase de siembra:</strong> En horizontes cortos (${years} años), la mayor parte del capital proviene de tus aportaciones (<strong>${formatCurrency(capital)}</strong>), generando <strong>${formatCurrency(interest)}</strong> de intereses.</p>
      <p style="margin-top: 0.5rem;"><em>Consejo:</em> Extiende el plazo a 15 o 20 años en el control deslizante para observar cómo la curva se dispara hacia arriba.</p>
    `;
  }
}

/* ==========================================================================
   UTILIDADES Y SERVICE WORKER
   ========================================================================== */
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

document.addEventListener('DOMContentLoaded', () => {
  init();
  registerServiceWorker();
});

function registerServiceWorker() {
  // Los Service Workers solo funcionan en servidores locales o seguros (http://localhost o https://), no con protocolo file://
  if ('serviceWorker' in navigator && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('Service Worker activo:', reg.scope))
        .catch((err) => console.warn('SW Error:', err));
    });
  }
}
