const tg = window.Telegram.WebApp;
tg.expand();

let chartInstance = null;
let currentTab = 'month';

// Базовые категории
let labelsMap = new Map([
    ['housing', 'Citadel'],
    ['food', 'Supplies'],
    ['transport', 'Mounts'],
    ['fun', 'Tavern'],
    ['gear', 'Gear']
]);

let db = {
    month: { income: 0, expenses: { housing: 0, food: 0, transport: 0, fun: 0, gear: 0 } },
    year: { income: 0, expenses: { housing: 0, food: 0, transport: 0, fun: 0, gear: 0 } }
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
                    pointLabels: { color: '#e0e0e0', font: { size: 13 } },
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

// === ЛОГИКА ДОХОДА ===

// 1. Ручное исправление (если стер и написал заново)
function manualIncomeEdit() {
    const input = document.getElementById('income-input');
    let val = parseFloat(input.value);
    
    if (isNaN(val)) val = 0;
    
    db[currentTab].income = val;
    updateView(); // Пересчитываем остаток
}

// 2. Добавление через кнопку "+" (Вторая зарплата и т.д.)
function addMoreIncome() {
    // Спрашиваем сумму
    let amount = prompt("How much Gold to add to treasury?", "0");
    
    if (amount !== null) {
        let val = parseFloat(amount);
        if (!isNaN(val) && val > 0) {
            db[currentTab].income += val; // ПЛЮСУЕМ
            tg.HapticFeedback.notificationOccurred('success');
            updateView();
        }
    }
}

// === ОБНОВЛЕНИЕ ЭКРАНА ===
function updateView() {
    // 1. Обновляем поле ввода (отображаем текущий доход)
    const incInput = document.getElementById('income-input');
    // Если доход 0, не показываем ничего, иначе показываем цифру
    incInput.value = db[currentTab].income === 0 ? '' : db[currentTab].income;

    // 2. Считаем расходы
    const currentExp = db[currentTab].expenses;
    let dataForChart = [];
    let totalSpent = 0;
    
    for (let key of labelsMap.keys()) {
        const amount = currentExp[key] || 0;
        dataForChart.push(amount);
        totalSpent += amount;
    }

    // 3. График
    chartInstance.data.labels = Array.from(labelsMap.values());
    chartInstance.data.datasets[0].data = dataForChart;
    chartInstance.update();

    // 4. Остаток
    let remaining = db[currentTab].income - totalSpent;
    const remEl = document.getElementById('remaining-amount');
    remEl.innerText = remaining.toLocaleString();
    
    if (remaining < 0) remEl.style.color = '#ff3333';
    else remEl.style.color = '#fff';
}

function addExpense() {
    const catKey = document.getElementById('category-select').value;
    const amount = parseFloat(document.getElementById('amount').value);
    if (!amount || !catKey) return;

    if (!db[currentTab].expenses[catKey]) {
         db[currentTab].expenses[catKey] = 0;
    }

    db[currentTab].expenses[catKey] += amount;
    document.getElementById('amount').value = '';
    updateView();
}

function addNewCategory() {
    const nameInput = document.getElementById('new-cat-name');
    const name = nameInput.value.trim();
    if (!name) return;

    const key = name.toLowerCase().replace(/\s+/g, '_');
    if (labelsMap.has(key)) return;

    labelsMap.set(key, name);
    db.month.expenses[key] = 0;
    db.year.expenses[key] = 0;

    updateDropdown();
    updateView();
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