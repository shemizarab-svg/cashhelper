const tg = window.Telegram.WebApp;
tg.expand();

// АВТОРИЗАЦИЯ
const user = tg.initDataUnsafe?.user;
const userId = user?.id || 'guest';
document.getElementById('user-id-display').innerText = `ID: ${userId}`;
const STORAGE_KEY = `azeroth_budget_v3_${userId}`;

// ПЕРЕМЕННЫЕ
let currentTab = 'month';
let selectedMonth = 'Jan';
const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthsNamesRu = {
    'Jan': 'Январь', 'Feb': 'Февраль', 'Mar': 'Март', 'Apr': 'Апрель', 'May': 'Май', 'Jun': 'Июнь',
    'Jul': 'Июль', 'Aug': 'Август', 'Sep': 'Сентябрь', 'Oct': 'Октябрь', 'Nov': 'Ноябрь', 'Dec': 'Декабрь'
};

// ЧАРТЫ
let chartMonthly = null;
let chartYearlyRadar = null;
let chartYearlyBarExpenses = null;
let chartYearlyBarSavings = null;
let chartGarage = null; 

let globalCategoryNames = new Map(); 

let db = {
    limits: {}, 
    garageStandards: {},
    garageTypes: {}, 
    months: monthsList.reduce((acc, m) => {
        acc[m] = { 
            income: 0, 
            expenses: {}, 
            activeCategories: [],
            garage: [] 
        };
        return acc;
    }, {})
};

function saveData() {
    const data = { db: db, names: Array.from(globalCategoryNames.entries()) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed.names) globalCategoryNames = new Map(parsed.names);
            if (parsed.db) {
                if (parsed.db.limits) db.limits = parsed.db.limits;
                if (parsed.db.garageStandards) db.garageStandards = parsed.db.garageStandards;
                if (parsed.db.garageTypes) db.garageTypes = parsed.db.garageTypes;

                if (parsed.db.months) {
                    for (let m of monthsList) {
                        if (parsed.db.months[m]) {
                            db.months[m] = parsed.db.months[m];
                            if (!db.months[m].activeCategories) db.months[m].activeCategories = [];
                            if (!db.months[m].garage) db.months[m].garage = [];
                        }
                    }
                }
            }
        } catch (e) { console.error(e); }
    }
    
    // Дефолтные типы
    if (!db.garageTypes || Object.keys(db.garageTypes).length === 0) {
        db.garageTypes = {
            'oil': 'Масло/Жидкости',
            'filter': 'Фильтры',
            'brakes': 'Тормоза',
            'engine': 'Двигатель/ГРМ',
            'wheels': 'Колеса/Подвеска',
            'other': 'Прочее'
        };
    }

    // Дефолтные стандарты
    if (Object.keys(db.garageStandards).length === 0) {
        db.garageStandards = {
            'oil': 7500,
            'filter': 10000,
            'brakes': 30000,
            'engine': 60000,
            'wheels': 50000
        };
    }
}

function init() {
    loadData();
    if (!globalCategoryNames.has('transport')) globalCategoryNames.set('transport', 'Транспорт (Машина)');
    initCharts();
    initGarageChart(); 
    
    renderLimitsPanel();
    renderGarageSettings();
    renderGarageTypeSelect(); 
    
    updateView();
}

function initCharts() {
    Chart.defaults.font.family = 'Cormorant SC';
    Chart.defaults.font.weight = 'bold';
    Chart.defaults.color = '#a38f56';
    
    const ctxM = document.getElementById('radarChart').getContext('2d');
    chartMonthly = new Chart(ctxM, createRadarConfig('Траты за месяц'));
    const ctxY1 = document.getElementById('yearRadarChart').getContext('2d');
    chartYearlyRadar = new Chart(ctxY1, createRadarConfig('Всего трат за год'));
    const ctxY2 = document.getElementById('yearBarChartExpenses').getContext('2d');
    chartYearlyBarExpenses = new Chart(ctxY2, createBarConfig('Траты по месяцам', '#ff4e4e'));
    const ctxY3 = document.getElementById('yearBarChartSavings').getContext('2d');
    chartYearlyBarSavings = new Chart(ctxY3, createBarConfig('Накопления по месяцам', '#ffd700'));
}

// === ГАРАЖНЫЙ ГРАФИК ===
function initGarageChart() {
    const ctxG = document.getElementById('garageChart').getContext('2d');
    chartGarage = new Chart(ctxG, {
        type: 'scatter',
        data: {
            datasets: [] 
        },
        options: {
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    grid: { color: '#333' },
                    ticks: { color: '#aaa', callback: function(val) { return val / 1000 + 'k'; } },
                    title: { display: true, text: 'Пробег (км)', color: '#666' }
                },
                y: {
                    grid: { color: '#333' },
                    ticks: { 
                        color: '#ffd700',
                        font: { size: 12 },
                        callback: function(value) {
                            const keys = Object.keys(db.garageTypes);
                            const key = keys[value];
                            return key ? db.garageTypes[key] : '';
                        }
                    },
                    beginAtZero: true,
                    suggestedMax: 5 
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.raw.desc + ' (' + context.raw.x + ' км)';
                        }
                    }
                }
            }
        }
    });
}

function updateGarageChart() {
    const typeKeys = Object.keys(db.garageTypes);
    let points = [];

    for (let m of monthsList) {
        if (db.months[m].garage) {
            db.months[m].garage.forEach(item => {
                const typeValues = Object.values(db.garageTypes);
                let yIndex = typeValues.indexOf(item.type);
                
                if (yIndex === -1) yIndex = 0; 

                points.push({
                    x: item.fact,
                    y: yIndex,
                    desc: item.name
                });
            });
        }
    }

    chartGarage.data.datasets = [{
        label: 'История',
        data: points,
        backgroundColor: '#ffd700',
        pointRadius: 6,
        pointHoverRadius: 8
    }];
    
    chartGarage.options.scales.y.suggestedMax = typeKeys.length - 1;
    chartGarage.update();
}


function createRadarConfig(label) {
    return {
        type: 'radar',
        data: { labels: [], datasets: [{ label: label, data: [], backgroundColor: 'rgba(255, 215, 0, 0.25)', borderColor: '#ffd700', borderWidth: 2, pointBackgroundColor: '#fff', pointBorderColor: '#ffd700' }] },
        options: { maintainAspectRatio: false, scales: { r: { angleLines: { color: 'rgba(255,255,255,0.1)' }, grid: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: '#e0e0e0', font: { size: 14 } }, ticks: { display: false, backdropColor: 'transparent' } } }, plugins: { legend: { display: false } } }
    };
}
function createBarConfig(label, color) {
    const ruLabels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    return {
        type: 'bar',
        data: { labels: ruLabels, datasets: [{ label: label, data: [], backgroundColor: color, borderColor: '#fff', borderWidth: 1 }] },
        options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: '#333' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }
    };
}

function switchTab(tab) {
    currentTab = tab;
    
    document.getElementById('tab-month').classList.toggle('active', tab === 'month');
    document.getElementById('tab-year').classList.toggle('active', tab === 'year');
    document.getElementById('tab-garage').classList.toggle('active', tab === 'garage');
    
    document.getElementById('monthly-view').style.display = tab === 'month' ? 'block' : 'none';
    document.getElementById('yearly-view').style.display = tab === 'year' ? 'block' : 'none';
    document.getElementById('garage-view').style.display = tab === 'garage' ? 'block' : 'none';
    
    document.getElementById('month-selector-panel').style.display = (tab === 'month' || tab === 'garage') ? 'flex' : 'none';
    
    updateView();
}

function changeMonth() {
    selectedMonth = document.getElementById('month-select').value;
    updateView();
}

function updateView() {
    if (currentTab === 'month') renderMonthlyView();
    else if (currentTab === 'garage') renderGarageView();
    else renderYearlyView();
}

// === УПРАВЛЕНИЕ ТИПАМИ ГАРАЖА ===
function renderGarageTypeSelect() {
    const select = document.getElementById('car-part-type');
    const savedVal = select.value; 
    select.innerHTML = '';
    
    for (const [key, name] of Object.entries(db.garageTypes)) {
        let opt = document.createElement('option');
        opt.value = key;
        opt.innerText = name;
        select.appendChild(opt);
    }
    
    if (db.garageTypes[savedVal]) {
        select.value = savedVal;
    }
}

function addGarageType() {
    const name = prompt("Название нового типа (например: Тюнинг, Мойка):");
    if (name) {
        const key = 'custom_' + Date.now();
        db.garageTypes[key] = name;
        db.garageStandards[key] = 0;
        
        saveData();
        renderGarageTypeSelect();
        renderGarageSettings(); 
        
        document.getElementById('car-part-type').value = key;
        autoFillMileage();
    }
}

// === НОВАЯ ФУНКЦИЯ УДАЛЕНИЯ ===
function deleteGarageType() {
    const select = document.getElementById('car-part-type');
    const key = select.value;
    
    const protected = ['oil', 'filter', 'brakes', 'engine', 'wheels', 'other'];

    if (protected.includes(key)) {
        tg.showAlert("Нельзя удалить стандартный тип!");
        return;
    }

    if (confirm("Удалить этот тип и его настройки?")) {
        delete db.garageTypes[key];
        delete db.garageStandards[key];
        saveData();
        
        renderGarageTypeSelect();
        renderGarageSettings();
        
        // Сбрасываем выбор на масло
        select.value = 'oil';
        autoFillMileage();
    }
}

// === НАСТРОЙКИ БЮДЖЕТА ===
function renderLimitsPanel() {
    const container = document.getElementById('limits-list-container');
    if (!container) return;
    container.innerHTML = '';

    globalCategoryNames.forEach((name, key) => {
        const currentLimit = db.limits[key] || 0; 
        const div = document.createElement('div');
        div.className = 'limit-row';
        div.innerHTML = `
            <span class="limit-label">${name}</span>
            <input type="number" 
                   class="limit-input" 
                   placeholder="∞" 
                   value="${currentLimit === 0 ? '' : currentLimit}" 
                   onchange="updateLimit('${key}', this.value)">
        `;
        container.appendChild(div);
    });
}

function updateLimit(key, value) {
    const val = parseFloat(value);
    if (isNaN(val) || val === 0) delete db.limits[key];
    else db.limits[key] = val;
    saveData();
    renderMonthlyView();
}

// === НАСТРОЙКИ ГАРАЖА ===
function renderGarageSettings() {
    const container = document.getElementById('garage-standards-container');
    if (!container) return;
    container.innerHTML = '';

    for (const [typeKey, typeName] of Object.entries(db.garageTypes)) {
        if (typeKey === 'other') continue; 

        const currentStd = db.garageStandards[typeKey] || 0;
        const div = document.createElement('div');
        div.className = 'limit-row';
        div.innerHTML = `
            <span class="limit-label">${typeName}</span>
            <input type="number" 
                   class="limit-input" 
                   placeholder="КМ" 
                   value="${currentStd === 0 ? '' : currentStd}" 
                   onchange="updateGarageStandard('${typeKey}', this.value)">
        `;
        container.appendChild(div);
    }
}

function updateGarageStandard(key, value) {
    const val = parseFloat(value);
    if (isNaN(val)) db.garageStandards[key] = 0;
    else db.garageStandards[key] = val;
    saveData();
    autoFillMileage();
}

function autoFillMileage() {
    const typeSelect = document.getElementById('car-part-type');
    const selectedType = typeSelect.value;
    const intervalInput = document.getElementById('car-interval-km');
    
    const std = db.garageStandards[selectedType];
    if (std && std > 0) {
        intervalInput.value = std;
    } else {
        intervalInput.value = '';
    }
}

// === ОТРИСОВКА БЮДЖЕТА ===
function renderMonthlyView() {
    const data = db.months[selectedMonth];
    const incInput = document.getElementById('income-input');
    if (document.activeElement !== incInput) incInput.value = data.income === 0 ? '' : data.income;

    let chartLabels = [];
    let chartData = [];
    let totalSpent = 0;
    
    data.activeCategories.forEach(key => {
        const name = globalCategoryNames.get(key) || key;
        const amount = data.expenses[key] || 0;
        chartLabels.push(name);
        chartData.push(amount);
        totalSpent += amount;
    });

    chartMonthly.data.labels = chartLabels;
    chartMonthly.data.datasets[0].data = chartData;
    chartMonthly.update();

    let remaining = data.income - totalSpent;
    const remEl = document.getElementById('remaining-amount');
    remEl.innerText = remaining.toLocaleString();
    remEl.style.color = remaining < 0 ? '#ff3333' : '#fff';

    updateDropdown();
    renderBreakdown(data);
}

// === ОТРИСОВКА ГАРАЖА ===
function renderGarageView() {
    const list = document.getElementById('garage-list');
    list.innerHTML = '';
    const mData = db.months[selectedMonth];

    if (!mData.garage) mData.garage = [];
    autoFillMileage();
    updateGarageChart();

    if (mData.garage.length > 0) {
        mData.garage.forEach((item, index) => {
            
            let itemInterval = item.interval;
            if (!itemInterval) {
                itemInterval = item.expected - item.fact;
            }

            let div = document.createElement('div');
            div.className = 'garage-card';
            div.innerHTML = `
                <div class="garage-card-top">
                    <span class="garage-name-text">${item.name}</span>
                    <span class="garage-price-text">-${item.price}</span>
                    <button class="delete-cat-btn garage-delete-abs" onclick="removeCarItem(${index})">✖</button>
                </div>
                
                <div class="garage-card-mid">
                    <span class="garage-type-badge">${item.type}</span>
                    <span>Стандарт: ${itemInterval} км</span>
                </div>

                <div class="garage-card-bot">
                    <span class="garage-fact-km">🏁 ${item.fact}</span>
                    <span class="garage-arrow">➤➤➤</span>
                    <span class="garage-next-km">⚠️ ${item.expected}</span>
                </div>
            `;
            list.appendChild(div);
        });
    } else {
        list.innerHTML = '<div style="color:#555; text-align:center; padding:20px;">Записей нет</div>';
    }
}

function renderYearlyView() {
    let allYearKeys = new Set();
    for (let m of monthsList) db.months[m].activeCategories.forEach(key => allYearKeys.add(key));
    const yearKeysArray = Array.from(allYearKeys);
    const yearLabels = yearKeysArray.map(key => globalCategoryNames.get(key) || key);

    let totalExpensesByCategory = [];
    yearKeysArray.forEach(key => {
        let sum = 0;
        for (let m of monthsList) sum += (db.months[m].expenses[key] || 0);
        totalExpensesByCategory.push(sum);
    });

    let expensesByMonth = [];
    let savingsByMonth = [];
    let totalYearSavings = 0;
    let maxExpenseMonth = { name: '-', val: 0 };
    let maxSavingsMonth = { name: '-', val: -Infinity };

    for (let m of monthsList) {
        const mData = db.months[m];
        let mSpent = 0;
        mData.activeCategories.forEach(key => { mSpent += (mData.expenses[key] || 0); });
        let mSavings = mData.income - mSpent;
        
        expensesByMonth.push(mSpent);
        savingsByMonth.push(mSavings);
        totalYearSavings += mSavings;

        const ruName = monthsNamesRu[m];
        if (mSpent > maxExpenseMonth.val) maxExpenseMonth = { name: ruName, val: mSpent };
        if (mSavings > maxSavingsMonth.val) maxSavingsMonth = { name: ruName, val: mSavings };
    }

    chartYearlyRadar.data.labels = yearLabels;
    chartYearlyRadar.data.datasets[0].data = totalExpensesByCategory;
    chartYearlyRadar.update();
    chartYearlyBarExpenses.data.datasets[0].data = expensesByMonth;
    chartYearlyBarExpenses.update();
    chartYearlyBarSavings.data.datasets[0].data = savingsByMonth;
    chartYearlyBarSavings.data.datasets[0].backgroundColor = savingsByMonth.map(v => v < 0 ? '#ff4e4e' : '#ffd700');
    chartYearlyBarSavings.update();

    document.getElementById('year-total-savings').innerText = totalYearSavings.toLocaleString();
    
    document.getElementById('year-text-report').innerHTML = `
        <p>Самый затратный: <b style="color:#ff4e4e">${maxExpenseMonth.name}</b> (${maxExpenseMonth.val})</p>
        <p>Лучшие накопления: <b style="color:#ffd700">${maxSavingsMonth.name}</b> (${maxSavingsMonth.val})</p>
    `;
}

function addCarItem() {
    const name = document.getElementById('car-part-name').value.trim();
    const typeSelect = document.getElementById('car-part-type');
    const typeText = typeSelect.options[typeSelect.selectedIndex].text;
    const factKm = parseFloat(document.getElementById('car-current-km').value);
    const intervalKm = parseFloat(document.getElementById('car-interval-km').value);
    const price = parseFloat(document.getElementById('car-price').value);

    if (!name || isNaN(factKm) || isNaN(intervalKm) || isNaN(price)) {
        tg.showAlert("Заполните все поля!");
        return;
    }

    const expected = factKm + intervalKm;
    const mData = db.months[selectedMonth];
    
    if (!mData.garage) mData.garage = [];
    
    mData.garage.push({ 
        name: name, 
        type: typeText, 
        fact: factKm, 
        expected: expected, 
        price: price, 
        interval: intervalKm 
    });

    const transKey = 'transport';
    if (!globalCategoryNames.has(transKey)) globalCategoryNames.set(transKey, 'Транспорт');
    if (!mData.activeCategories.includes(transKey)) {
        mData.activeCategories.push(transKey);
        mData.expenses[transKey] = 0;
    }
    mData.expenses[transKey] += price;

    document.getElementById('car-part-name').value = '';
    document.getElementById('car-price').value = '';
    document.getElementById('car-current-km').value = '';
    autoFillMileage();

    saveData();
    renderGarageView();
    tg.showAlert("Записано в Гараж!");
}

function removeCarItem(index) {
    if (confirm("Удалить запчасть?")) {
        const mData = db.months[selectedMonth];
        const item = mData.garage[index];

        if (mData.expenses['transport']) {
            mData.expenses['transport'] -= item.price;
            if (mData.expenses['transport'] < 0) mData.expenses['transport'] = 0;
        }
        mData.garage.splice(index, 1);
        saveData();
        renderGarageView();
    }
}

function renderBreakdown(monthData) {
    const list = document.getElementById('breakdown-list');
    list.innerHTML = '';
    monthData.activeCategories.forEach(key => {
        const name = globalCategoryNames.get(key) || key;
        const amount = monthData.expenses[key] || 0;
        
        const limit = db.limits[key] || 0;
        let limitHtml = '';
        let nameClass = 'breakdown-name under-budget';
        
        if (limit > 0) {
            if (amount > limit) {
                nameClass = 'breakdown-name over-budget';
                limitHtml = `<span style="font-size:10px; color:#ff3333; display:block;">(Лимит: ${limit})</span>`;
            } else {
                 limitHtml = `<span style="font-size:10px; color:#555; display:block;">(из ${limit})</span>`;
            }
        }
        
        let div = document.createElement('div');
        div.className = 'breakdown-item';
        div.innerHTML = `
            <div style="flex:1">
                <span class="${nameClass}">${name}</span>
                ${limitHtml}
            </div>
            <div class="edit-wrapper">
                <input type="number" class="edit-expense-input" value="${amount}" onchange="manualExpenseEdit('${key}', this)">
                <button class="delete-cat-btn" onclick="removeCategory('${key}')">✖</button>
            </div>
        `;
        list.appendChild(div);
    });
}

function addNewCategory() {
    const nameInput = document.getElementById('new-cat-name');
    const name = nameInput.value.trim();
    if (!name) return;
    const key = name.toLowerCase().replace(/\s+/g, '_');
    if (!globalCategoryNames.has(key)) globalCategoryNames.set(key, name);
    const mData = db.months[selectedMonth];
    if (!mData.activeCategories.includes(key)) {
        mData.activeCategories.push(key);
        if (!mData.expenses[key]) mData.expenses[key] = 0;
        saveData(); 
        
        renderLimitsPanel();
        updateView();
    } else { tg.showAlert("Уже есть!"); }
    nameInput.value = '';
}

function updateDropdown() {
    const select = document.getElementById('category-select');
    select.innerHTML = '';
    const mData = db.months[selectedMonth];
    mData.activeCategories.forEach(key => {
        const name = globalCategoryNames.get(key) || key;
        let option = document.createElement('option');
        option.value = key; option.innerText = name;
        select.appendChild(option);
    });
}

function removeCategory(key) {
    if(confirm("Удалить категорию?")) {
        const mData = db.months[selectedMonth];
        const index = mData.activeCategories.indexOf(key);
        if (index > -1) mData.activeCategories.splice(index, 1);
        delete mData.expenses[key];
        
        let isUsedAnywhere = false;
        for (let m of monthsList) {
            if (db.months[m].activeCategories.includes(key)) {
                isUsedAnywhere = true;
                break;
            }
        }

        if (!isUsedAnywhere) {
            globalCategoryNames.delete(key);
            delete db.limits[key];
        }

        saveData(); 
        renderLimitsPanel();
        updateView();
    }
}

function manualIncomeEdit() {
    const val = parseFloat(document.getElementById('income-input').value) || 0;
    db.months[selectedMonth].income = val;
    saveData(); updateView();
}
function addMoreIncome() {
    let amount = prompt("Добавить золота:", "0");
    if (amount) {
        let val = parseFloat(amount) || 0;
        db.months[selectedMonth].income += val;
        saveData(); updateView();
    }
}
function addExpense() {
    const catKey = document.getElementById('category-select').value;
    const amount = parseFloat(document.getElementById('amount').value);
    if (!amount || !catKey) return;
    const mData = db.months[selectedMonth];
    mData.expenses[catKey] = (mData.expenses[catKey] || 0) + amount;
    document.getElementById('amount').value = '';
    saveData(); updateView();
}
function manualExpenseEdit(key, el) {
    const val = parseFloat(el.value) || 0;
    db.months[selectedMonth].expenses[key] = val;
    saveData(); updateView(false);
}

init();