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

let chartMonthly = null;
let chartYearlyRadar = null;
let chartYearlyBarExpenses = null;
let chartYearlyBarSavings = null;

let globalCategoryNames = new Map(); 

let db = {
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
            if (parsed.db && parsed.db.months) {
                for (let m of monthsList) {
                    if (parsed.db.months[m]) {
                        db.months[m] = parsed.db.months[m];
                        if (!db.months[m].activeCategories) db.months[m].activeCategories = [];
                        // ВАЖНО: Если гаража нет в сохранении, создаем пустой массив
                        if (!db.months[m].garage) db.months[m].garage = [];
                    }
                }
            }
        } catch (e) { console.error(e); }
    }
}

function init() {
    loadData();
    if (!globalCategoryNames.has('transport')) globalCategoryNames.set('transport', 'Транспорт (Машина)');
    initCharts();
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

// === ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ===
function switchTab(tab) {
    currentTab = tab;
    
    // Переключаем классы кнопок (для красной подсветки)
    document.getElementById('tab-month').classList.toggle('active', tab === 'month');
    document.getElementById('tab-year').classList.toggle('active', tab === 'year');
    document.getElementById('tab-garage').classList.toggle('active', tab === 'garage');
    
    // Переключаем видимость блоков
    document.getElementById('monthly-view').style.display = tab === 'month' ? 'block' : 'none';
    document.getElementById('yearly-view').style.display = tab === 'year' ? 'block' : 'none';
    document.getElementById('garage-view').style.display = tab === 'garage' ? 'block' : 'none';
    
    // Селектор месяца виден в Month и Garage
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

function renderGarageView() {
    const list = document.getElementById('garage-list');
    list.innerHTML = '';
    const mData = db.months[selectedMonth];

    // Защита: если массив гаража не создан, создаем его
    if (!mData.garage) mData.garage = [];

    if (mData.garage.length > 0) {
        mData.garage.forEach((item, index) => {
            let div = document.createElement('div');
            div.className = 'garage-item';
            div.innerHTML = `
                <span class="garage-col-name">${item.name}</span>
                <span class="garage-col-type">${item.type}</span>
                <span class="garage-col-next">${item.expected}</span>
                <span class="garage-col-fact">${item.fact}</span>
                <span class="garage-col-price">${item.price}</span>
                <button class="delete-cat-btn" onclick="removeCarItem(${index})">✖</button>
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
    const type = typeSelect.options[typeSelect.selectedIndex].text;
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
    
    mData.garage.push({ name: name, type: type, fact: factKm, expected: expected, price: price });

    const transKey = 'transport';
    if (!globalCategoryNames.has(transKey)) globalCategoryNames.set(transKey, 'Транспорт');
    if (!mData.activeCategories.includes(transKey)) {
        mData.activeCategories.push(transKey);
        mData.expenses[transKey] = 0;
    }
    mData.expenses[transKey] += price;

    document.getElementById('car-part-name').value = '';
    document.getElementById('car-current-km').value = '';
    document.getElementById('car-interval-km').value = '';
    document.getElementById('car-price').value = '';

    saveData();
    renderGarageView();
    tg.showAlert("Записано в Гараж и добавлено в Расходы!");
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
        saveData(); updateView();
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
        saveData(); updateView();
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