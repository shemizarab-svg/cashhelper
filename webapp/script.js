const tg = window.Telegram.WebApp;
tg.expand();

// === АВТОРИЗАЦИЯ ===
const user = tg.initDataUnsafe?.user;
const userId = user?.id || 'guest';
document.getElementById('user-id-display').innerText = `ID: ${userId}`;

// Меняем версию базы на v3, так как структура данных меняется кардинально
const STORAGE_KEY = `azeroth_budget_v3_${userId}`;

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let currentTab = 'month';
let selectedMonth = 'Jan';
const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Графики
let chartMonthly = null;
let chartYearlyRadar = null;
let chartYearlyBarExpenses = null;
let chartYearlyBarSavings = null;

// === БАЗА ДАННЫХ ===

// 1. Глобальный словарь имен (чтобы 'car' всегда называлось 'Машина' в отчетах)
// Изначально ПУСТОЙ, как ты просил.
let globalCategoryNames = new Map(); 

// 2. Основное хранилище
let db = {
    months: monthsList.reduce((acc, m) => {
        acc[m] = { 
            income: 0, 
            expenses: {}, 
            // ВАЖНО: Список активных категорий именно для ЭТОГО месяца
            activeCategories: [] 
        };
        return acc;
    }, {})
};

// === СОХРАНЕНИЕ / ЗАГРУЗКА ===
function saveData() {
    const data = {
        db: db,
        // Сохраняем словарь имен отдельно
        names: Array.from(globalCategoryNames.entries())
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            
            // Восстанавливаем словарь имен
            if (parsed.names) globalCategoryNames = new Map(parsed.names);
            
            // Восстанавливаем месяцы
            if (parsed.db && parsed.db.months) {
                for (let m of monthsList) {
                    if (parsed.db.months[m]) {
                        // Аккуратно переносим данные
                        db.months[m] = parsed.db.months[m];
                        // Если вдруг нет массива категорий (защита от багов), создаем
                        if (!db.months[m].activeCategories) db.months[m].activeCategories = [];
                    }
                }
            }
        } catch (e) { console.error("Data load error", e); }
    }
}

// === ИНИЦИАЛИЗАЦИЯ ===
function init() {
    loadData();
    initCharts();
    updateView();
}

function initCharts() {
    Chart.defaults.font.family = 'Cormorant SC'; 
    Chart.defaults.font.weight = 'bold'; // Делаем жирнее
    Chart.defaults.color = '#a38f56';
    Chart.defaults.font.size = 14;

    const ctxM = document.getElementById('radarChart').getContext('2d');
    chartMonthly = new Chart(ctxM, createRadarConfig('Monthly Spent'));
    const ctxY1 = document.getElementById('yearRadarChart').getContext('2d');
    chartYearlyRadar = new Chart(ctxY1, createRadarConfig('Total Year Spent'));

    const ctxY2 = document.getElementById('yearBarChartExpenses').getContext('2d');
    chartYearlyBarExpenses = new Chart(ctxY2, createBarConfig('Expenses by Month', '#ff4e4e'));

    const ctxY3 = document.getElementById('yearBarChartSavings').getContext('2d');
    chartYearlyBarSavings = new Chart(ctxY3, createBarConfig('Savings by Month', '#ffd700'));
}

function createRadarConfig(label) {
    return {
        type: 'radar',
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                backgroundColor: 'rgba(255, 215, 0, 0.25)',
                borderColor: '#ffd700',
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#ffd700'
            }]
        },
        options: {
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: 'rgba(255,255,255,0.1)' },
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    pointLabels: { color: '#e0e0e0', font: { size: 12 } },
                    ticks: { display: false, backdropColor: 'transparent' }
                }
            },
            plugins: { legend: { display: false } }
        }
    };
}

function createBarConfig(label, color) {
    return {
        type: 'bar',
        data: {
            labels: monthsList,
            datasets: [{
                label: label,
                data: [],
                backgroundColor: color,
                borderColor: '#fff',
                borderWidth: 1
            }]
        },
        options: {
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: '#333' } },
                x: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    };
}

// === ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ===
function switchTab(tab) {
    currentTab = tab;
    document.getElementById('tab-month').classList.toggle('active', tab === 'month');
    document.getElementById('tab-year').classList.toggle('active', tab === 'year');

    document.getElementById('monthly-view').style.display = tab === 'month' ? 'block' : 'none';
    document.getElementById('month-selector-panel').style.display = tab === 'month' ? 'flex' : 'none';
    document.getElementById('yearly-view').style.display = tab === 'year' ? 'block' : 'none';

    updateView();
}

function changeMonth() {
    selectedMonth = document.getElementById('month-select').value;
    updateView();
}

// === ОБНОВЛЕНИЕ ЭКРАНА ===
function updateView() {
    if (currentTab === 'month') {
        renderMonthlyView();
    } else {
        renderYearlyView();
    }
}

// Рендер МЕСЯЦА
function renderMonthlyView() {
    const data = db.months[selectedMonth];
    
    // 1. Доход
    const incInput = document.getElementById('income-input');
    if (document.activeElement !== incInput) {
        incInput.value = data.income === 0 ? '' : data.income;
    }

    // 2. Собираем данные ТОЛЬКО из активных категорий этого месяца
    let chartLabels = [];
    let chartData = [];
    let totalSpent = 0;
    
    // Проходимся по списку ключей, добавленных именно в этот месяц
    data.activeCategories.forEach(key => {
        // Имя берем из глобального справочника
        const name = globalCategoryNames.get(key) || key;
        const amount = data.expenses[key] || 0;
        
        chartLabels.push(name);
        chartData.push(amount);
        totalSpent += amount;
    });

    // 3. Обновляем Радар
    chartMonthly.data.labels = chartLabels;
    chartMonthly.data.datasets[0].data = chartData;
    chartMonthly.update();

    // 4. Остаток
    let remaining = data.income - totalSpent;
    const remEl = document.getElementById('remaining-amount');
    remEl.innerText = remaining.toLocaleString();
    remEl.style.color = remaining < 0 ? '#ff3333' : '#fff';

    // 5. Выпадающий список (только активные категории + те, что уже есть в глобалке)
    updateDropdown();

    // 6. Список расходов
    renderBreakdown(data);
}

// Рендер ГОДА
function renderYearlyView() {
    // 1. Собираем ВСЕ уникальные категории со всех месяцев
    let allYearKeys = new Set();
    for (let m of monthsList) {
        db.months[m].activeCategories.forEach(key => allYearKeys.add(key));
    }
    
    // Превращаем в массив для порядка
    const yearKeysArray = Array.from(allYearKeys);
    const yearLabels = yearKeysArray.map(key => globalCategoryNames.get(key) || key);

    // 2. Считаем суммы по категориям
    let totalExpensesByCategory = [];
    yearKeysArray.forEach(key => {
        let sum = 0;
        for (let m of monthsList) {
            sum += (db.months[m].expenses[key] || 0);
        }
        totalExpensesByCategory.push(sum);
    });

    // 3. Считаем суммы по месяцам
    let expensesByMonth = [];
    let savingsByMonth = [];
    let totalYearSavings = 0;
    
    let maxExpenseMonth = { name: '-', val: 0 };
    let maxSavingsMonth = { name: '-', val: -Infinity };

    for (let m of monthsList) {
        const mData = db.months[m];
        
        let mSpent = 0;
        // Считаем траты только по активным категориям этого месяца
        mData.activeCategories.forEach(key => {
            mSpent += (mData.expenses[key] || 0);
        });

        let mSavings = mData.income - mSpent;
        
        expensesByMonth.push(mSpent);
        savingsByMonth.push(mSavings);
        totalYearSavings += mSavings;

        if (mSpent > maxExpenseMonth.val) maxExpenseMonth = { name: m, val: mSpent };
        if (mSavings > maxSavingsMonth.val) maxSavingsMonth = { name: m, val: mSavings };
    }

    // Обновляем графики
    chartYearlyRadar.data.labels = yearLabels;
    chartYearlyRadar.data.datasets[0].data = totalExpensesByCategory;
    chartYearlyRadar.update();

    chartYearlyBarExpenses.data.datasets[0].data = expensesByMonth;
    chartYearlyBarExpenses.update();

    chartYearlyBarSavings.data.datasets[0].data = savingsByMonth;
    chartYearlyBarSavings.data.datasets[0].backgroundColor = savingsByMonth.map(v => v < 0 ? '#ff4e4e' : '#ffd700');
    chartYearlyBarSavings.update();

    // Отчет
    document.getElementById('year-total-savings').innerText = totalYearSavings.toLocaleString();
    const reportHTML = `
        <p>Most expensive month: <b style="color:#ff4e4e">${maxExpenseMonth.name}</b> (${maxExpenseMonth.val})</p>
        <p>Best savings month: <b style="color:#ffd700">${maxSavingsMonth.name}</b> (${maxSavingsMonth.val})</p>
    `;
    document.getElementById('year-text-report').innerHTML = reportHTML;
}

// === УТИЛИТЫ ===

function renderBreakdown(monthData) {
    const list = document.getElementById('breakdown-list');
    list.innerHTML = '';
    
    monthData.activeCategories.forEach(key => {
        const name = globalCategoryNames.get(key) || key;
        const amount = monthData.expenses[key] || 0;

        let div = document.createElement('div');
        div.className = 'breakdown-item';
        div.innerHTML = `
            <span class="breakdown-name">${name}</span>
            <div class="edit-wrapper">
                <input type="number" class="edit-expense-input" value="${amount}" onchange="manualExpenseEdit('${key}', this)">
                <button class="delete-cat-btn" onclick="removeCategory('${key}')">✖</button>
            </div>
        `;
        list.appendChild(div);
    });
}

// === ДОБАВЛЕНИЕ НОВОЙ КАТЕГОРИИ (САМОЕ ВАЖНОЕ) ===
function addNewCategory() {
    const nameInput = document.getElementById('new-cat-name');
    const name = nameInput.value.trim();
    if (!name) return;

    // Генерируем ключ (Car -> car)
    const key = name.toLowerCase().replace(/\s+/g, '_');
    
    // 1. Сохраняем имя в Глобальный словарь (если новое)
    if (!globalCategoryNames.has(key)) {
        globalCategoryNames.set(key, name);
    }

    // 2. Добавляем ключ в АКТИВНЫЕ категории ТЕКУЩЕГО месяца
    const mData = db.months[selectedMonth];
    
    if (!mData.activeCategories.includes(key)) {
        mData.activeCategories.push(key);
        // Инициализируем нулем
        if (!mData.expenses[key]) mData.expenses[key] = 0;
        
        saveData();
        updateView();
    } else {
        tg.showAlert("Already exists in this month!");
    }
    
    nameInput.value = '';
}

function updateDropdown() {
    const select = document.getElementById('category-select');
    select.innerHTML = '';
    
    // Показываем в выпадающем списке только те категории, которые добавлены в ЭТОТ месяц
    const mData = db.months[selectedMonth];
    
    mData.activeCategories.forEach(key => {
        const name = globalCategoryNames.get(key) || key;
        let option = document.createElement('option');
        option.value = key;
        option.innerText = name;
        select.appendChild(option);
    });
}

// Удаление (только из текущего месяца)
function removeCategory(key) {
    if(confirm("Remove from CURRENT month?")) {
        const mData = db.months[selectedMonth];
        
        // Удаляем из списка активных ключей этого месяца
        const index = mData.activeCategories.indexOf(key);
        if (index > -1) {
            mData.activeCategories.splice(index, 1);
        }
        
        // Обнуляем расход (опционально)
        delete mData.expenses[key];

        saveData();
        updateView();
    }
}

// Остальные функции (доход, расход) без изменений логики
function manualIncomeEdit() {
    const val = parseFloat(document.getElementById('income-input').value) || 0;
    db.months[selectedMonth].income = val;
    saveData();
    updateView();
}
function addMoreIncome() {
    let amount = prompt("Add gold to treasury:", "0");
    if (amount) {
        let val = parseFloat(amount) || 0;
        db.months[selectedMonth].income += val;
        saveData();
        updateView();
    }
}
function addExpense() {
    const catKey = document.getElementById('category-select').value;
    const amount = parseFloat(document.getElementById('amount').value);
    if (!amount || !catKey) return;

    const mData = db.months[selectedMonth];
    mData.expenses[catKey] = (mData.expenses[catKey] || 0) + amount;

    document.getElementById('amount').value = '';
    saveData();
    updateView();
}
function manualExpenseEdit(key, el) {
    const val = parseFloat(el.value) || 0;
    db.months[selectedMonth].expenses[key] = val;
    saveData();
    updateView(false);
}

init();