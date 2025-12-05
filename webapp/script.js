const tg = window.Telegram.WebApp;
tg.expand();

// === АВТОРИЗАЦИЯ ===
const user = tg.initDataUnsafe?.user;
const userId = user?.id || 'guest';
document.getElementById('user-id-display').innerText = `ID: ${userId}`;
const STORAGE_KEY = `azeroth_budget_v2_${userId}`; // v2 - новая версия базы

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let currentTab = 'month';
let selectedMonth = 'Jan'; // Текущий выбранный месяц
const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Графики
let chartMonthly = null;
let chartYearlyRadar = null;
let chartYearlyBarExpenses = null;
let chartYearlyBarSavings = null;

// Категории
let labelsMap = new Map([
    ['housing', 'Citadel'],
    ['food', 'Supplies'],
    ['transport', 'Mounts'],
    ['fun', 'Tavern'],
    ['gear', 'Gear']
]);

// БАЗА ДАННЫХ (Теперь хранит 12 месяцев)
let db = {
    // Генерируем объект: { Jan: {income:0, expenses:{}}, Feb: ... }
    months: monthsList.reduce((acc, m) => {
        acc[m] = { income: 0, expenses: {} };
        return acc;
    }, {})
};

// === СОХРАНЕНИЕ / ЗАГРУЗКА ===
function saveData() {
    const data = {
        db: db,
        labels: Array.from(labelsMap.entries())
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed.labels) labelsMap = new Map(parsed.labels);
            if (parsed.db && parsed.db.months) {
                // Объединяем сохраненные данные с текущей структурой
                for (let m of monthsList) {
                    if (parsed.db.months[m]) {
                        db.months[m] = parsed.db.months[m];
                    }
                }
            }
        } catch (e) { console.error("Data load error", e); }
    }
}

// === ИНИЦИАЛИЗАЦИЯ ===
function init() {
    loadData();
    initCharts(); // Создаем пустые графики
    updateView(); // Заполняем данными
}

// Создаем инстансы всех 4-х графиков
function initCharts() {
    Chart.defaults.font.family = 'MedievalSharp';
    Chart.defaults.color = '#a38f56';

    // 1. Месячный Радар
    const ctxM = document.getElementById('radarChart').getContext('2d');
    chartMonthly = new Chart(ctxM, createRadarConfig('Monthly Spent'));

    // 2. Годовой Радар (Сумма)
    const ctxY1 = document.getElementById('yearRadarChart').getContext('2d');
    chartYearlyRadar = new Chart(ctxY1, createRadarConfig('Total Year Spent'));

    // 3. Годовые Столбцы (Траты по месяцам)
    const ctxY2 = document.getElementById('yearBarChartExpenses').getContext('2d');
    chartYearlyBarExpenses = new Chart(ctxY2, createBarConfig('Expenses by Month', '#ff4e4e'));

    // 4. Годовые Столбцы (Остаток по месяцам)
    const ctxY3 = document.getElementById('yearBarChartSavings').getContext('2d');
    chartYearlyBarSavings = new Chart(ctxY3, createBarConfig('Savings by Month', '#ffd700'));
}

// Конфиг для Радара
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

// Конфиг для Столбцов
function createBarConfig(label, color) {
    return {
        type: 'bar',
        data: {
            labels: monthsList, // Jan, Feb...
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

    // Показываем/скрываем блоки
    document.getElementById('monthly-view').style.display = tab === 'month' ? 'block' : 'none';
    document.getElementById('month-selector-panel').style.display = tab === 'month' ? 'flex' : 'none'; // Селектор только в месяце
    document.getElementById('yearly-view').style.display = tab === 'year' ? 'block' : 'none';

    updateView();
}

function changeMonth() {
    selectedMonth = document.getElementById('month-select').value;
    updateView();
}

// === ОБНОВЛЕНИЕ ВСЕГО ===

function updateView() {
    if (currentTab === 'month') {
        renderMonthlyView();
    } else {
        renderYearlyView();
    }
}

// Рендер вкладки МЕСЯЦ
function renderMonthlyView() {
    const data = db.months[selectedMonth];
    
    // 1. Доход
    const incInput = document.getElementById('income-input');
    if (document.activeElement !== incInput) {
        incInput.value = data.income === 0 ? '' : data.income;
    }

    // 2. Расчет данных для графика и остатка
    let chartData = [];
    let totalSpent = 0;
    
    for (let key of labelsMap.keys()) {
        const amount = data.expenses[key] || 0;
        chartData.push(amount);
        totalSpent += amount;
    }

    // 3. Обновляем Радар
    chartMonthly.data.labels = Array.from(labelsMap.values());
    chartMonthly.data.datasets[0].data = chartData;
    chartMonthly.update();

    // 4. Остаток
    let remaining = data.income - totalSpent;
    const remEl = document.getElementById('remaining-amount');
    remEl.innerText = remaining.toLocaleString();
    remEl.style.color = remaining < 0 ? '#ff3333' : '#fff';

    // 5. Список расходов
    renderBreakdown(data.expenses);
}

// Рендер вкладки ГОД
function renderYearlyView() {
    // Нам нужно собрать данные со всех месяцев
    
    // А. Для Радара (Сумма по категориям)
    let totalExpensesByCategory = new Map();
    for (let key of labelsMap.keys()) totalExpensesByCategory.set(key, 0);

    // Б. Для Столбцов (По месяцам)
    let expensesByMonth = [];
    let savingsByMonth = [];
    let totalYearSavings = 0;
    
    let maxExpenseMonth = { name: '-', val: 0 };
    let maxSavingsMonth = { name: '-', val: -Infinity };

    // Пробегаем по всем 12 месяцам
    for (let m of monthsList) {
        const mData = db.months[m];
        
        // Считаем расход за месяц
        let mSpent = 0;
        for (let key of labelsMap.keys()) {
            const val = mData.expenses[key] || 0;
            mSpent += val;
            // Добавляем в общую кучу категорий
            totalExpensesByCategory.set(key, totalExpensesByCategory.get(key) + val);
        }

        let mSavings = mData.income - mSpent;
        
        expensesByMonth.push(mSpent);
        savingsByMonth.push(mSavings);
        totalYearSavings += mSavings;

        // Ищем рекорды
        if (mSpent > maxExpenseMonth.val) maxExpenseMonth = { name: m, val: mSpent };
        if (mSavings > maxSavingsMonth.val) maxSavingsMonth = { name: m, val: mSavings };
    }

    // 1. Обновляем Годовой Радар
    chartYearlyRadar.data.labels = Array.from(labelsMap.values());
    chartYearlyRadar.data.datasets[0].data = Array.from(totalExpensesByCategory.values());
    chartYearlyRadar.update();

    // 2. Обновляем График Трат
    chartYearlyBarExpenses.data.datasets[0].data = expensesByMonth;
    chartYearlyBarExpenses.update();

    // 3. Обновляем График Накоплений
    chartYearlyBarSavings.data.datasets[0].data = savingsByMonth;
    // Подкрасим отрицательные месяцы в красный
    chartYearlyBarSavings.data.datasets[0].backgroundColor = savingsByMonth.map(v => v < 0 ? '#ff4e4e' : '#ffd700');
    chartYearlyBarSavings.update();

    // 4. Текстовый отчет
    document.getElementById('year-total-savings').innerText = totalYearSavings.toLocaleString();
    
    const reportHTML = `
        <p>Most expensive month: <b style="color:#ff4e4e">${maxExpenseMonth.name}</b> (${maxExpenseMonth.val})</p>
        <p>Best savings month: <b style="color:#ffd700">${maxSavingsMonth.name}</b> (${maxSavingsMonth.val})</p>
    `;
    document.getElementById('year-text-report').innerHTML = reportHTML;
}

// === УТИЛИТЫ (Ввод данных) ===

function renderBreakdown(expensesObj) {
    const list = document.getElementById('breakdown-list');
    list.innerHTML = '';
    
    for (let [key, name] of labelsMap.entries()) {
        const amount = expensesObj[key] || 0;
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
    }
}

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
    if (!mData.expenses[catKey]) mData.expenses[catKey] = 0;
    mData.expenses[catKey] += amount;

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

function removeCategory(key) {
    if(confirm("Delete this category from ALL months?")) {
        labelsMap.delete(key);
        // Чистим во всех месяцах
        for(let m of monthsList) {
            delete db.months[m].expenses[key];
        }
        saveData();
        updateDropdown();
        updateView();
    }
}

function addNewCategory() {
    const nameInput = document.getElementById('new-cat-name');
    const name = nameInput.value.trim();
    if (!name) return;
    const key = name.toLowerCase().replace(/\s+/g, '_');
    
    if (!labelsMap.has(key)) {
        labelsMap.set(key, name);
        saveData();
        updateDropdown();
        updateView();
    }
    nameInput.value = '';
}

function updateDropdown() {
    const select = document.getElementById('category-select');
    select.innerHTML = '';
    for (let [key, name] of labelsMap.entries()) {
        let option = document.createElement('option');
        option.value = key;
        option.innerText = name;
        select.appendChild(option);
    }
}

init();