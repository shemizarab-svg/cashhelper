const tg = window.Telegram.WebApp;
tg.expand();

let chartInstance = null;
let currentTab = 'month';

// Начальные категории
let labelsMap = new Map([
    ['housing', 'Citadel'],
    ['food', 'Supplies'],
    ['transport', 'Mounts'],
    ['fun', 'Tavern'],
    ['gear', 'Gear']
]);

// База данных + ИСТОРИЯ
let db = {
    month: { 
        income: 0, 
        expenses: { housing: 0, food: 0, transport: 0, fun: 0, gear: 0 },
        history: [] // Список транзакций месяца
    },
    year: { 
        income: 0, 
        expenses: { housing: 0, food: 0, transport: 0, fun: 0, gear: 0 },
        history: [] // Список транзакций года
    }
};

function initChart() {
    const ctx = document.getElementById('radarChart').getContext('2d');
    Chart.defaults.font.family = 'MedievalSharp';
    
    chartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: Array.from(labelsMap.values()),
            datasets: [{
                label: 'Spent',
                data: [],
                backgroundColor: 'rgba(255, 215, 0, 0.25)',
                borderColor: '#ffd700',
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#ffd700',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    pointLabels: { color: '#e0e0e0', font: { size: 12 } },
                    ticks: { display: false, backdropColor: 'transparent' }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
    
    updateDropdown();
    updateView();
}

function switchTab(tab) {
    currentTab = tab;
    document.getElementById('tab-month').classList.toggle('active', tab === 'month');
    document.getElementById('tab-year').classList.toggle('active', tab === 'year');
    updateView();
}

// === ДОХОД ===
function manualIncomeEdit() {
    const input = document.getElementById('income-input');
    let val = parseFloat(input.value);
    if (isNaN(val)) val = 0;
    db[currentTab].income = val;
    updateView();
}

function addMoreIncome() {
    let amount = prompt("Add Gold to Treasury:", "0");
    if (amount !== null) {
        let val = parseFloat(amount);
        if (!isNaN(val) && val > 0) {
            db[currentTab].income += val;
            updateView();
        }
    }
}

// === ОБНОВЛЕНИЕ ВСЕГО ===
function updateView() {
    const currentData = db[currentTab];

    // 1. Инпут дохода
    const incInput = document.getElementById('income-input');
    incInput.value = currentData.income === 0 ? '' : currentData.income;

    // 2. График
    let dataForChart = [];
    let totalSpent = 0;
    
    for (let key of labelsMap.keys()) {
        const amount = currentData.expenses[key] || 0;
        dataForChart.push(amount);
        totalSpent += amount;
    }

    chartInstance.data.labels = Array.from(labelsMap.values());
    chartInstance.data.datasets[0].data = dataForChart;
    chartInstance.update();

    // 3. Остаток
    let remaining = currentData.income - totalSpent;
    const remEl = document.getElementById('remaining-amount');
    remEl.innerText = remaining.toLocaleString();
    remEl.style.color = remaining < 0 ? '#ff3333' : '#fff';

    // 4. Обновить список истории
    renderHistory();
}

// === РАСХОДЫ И ИСТОРИЯ (LOG) ===

function addExpense() {
    const catKey = document.getElementById('category-select').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const catName = labelsMap.get(catKey);

    if (!amount || !catKey) return;

    // 1. Добавляем в сумму
    if (!db[currentTab].expenses[catKey]) db[currentTab].expenses[catKey] = 0;
    db[currentTab].expenses[catKey] += amount;

    // 2. Добавляем запись в Историю (с уникальным ID)
    const transactionId = Date.now();
    db[currentTab].history.unshift({
        id: transactionId,
        key: catKey,
        name: catName,
        amount: amount
    });

    document.getElementById('amount').value = '';
    updateView();
}

// УДАЛЕНИЕ (КОРРЕКЦИЯ) ТРАТЫ
function deleteTransaction(id) {
    const history = db[currentTab].history;
    const index = history.findIndex(item => item.id === id);

    if (index !== -1) {
        const item = history[index];
        
        // 1. Возвращаем деньги (вычитаем расход)
        db[currentTab].expenses[item.key] -= item.amount;
        if (db[currentTab].expenses[item.key] < 0) db[currentTab].expenses[item.key] = 0;

        // 2. Удаляем из истории
        history.splice(index, 1);

        updateView();
    }
}

function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    const history = db[currentTab].history;

    history.forEach(item => {
        let li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <span>${item.name}: <span style="color:#ffd700">${item.amount}</span></span>
            <button class="delete-btn" onclick="deleteTransaction(${item.id})">✖</button>
        `;
        list.appendChild(li);
    });
}

// === КАТЕГОРИИ ===
function addNewCategory() {
    const nameInput = document.getElementById('new-cat-name');
    const name = nameInput.value.trim();
    if (!name) return;

    const key = name.toLowerCase().replace(/\s+/g, '_');
    if (!labelsMap.has(key)) {
        labelsMap.set(key, name);
        db.month.expenses[key] = 0;
        db.year.expenses[key] = 0;
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

initChart();