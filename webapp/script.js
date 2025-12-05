const tg = window.Telegram.WebApp;
tg.expand();

let chartInstance = null;
let currentTab = 'month';

// Хранилище данных
let db = {
    month: {
        income: 0, // Бюджет на месяц
        expenses: { housing: 0, food: 0, transport: 0, fun: 0, gear: 0 }
    },
    year: {
        income: 0, // Бюджет на год
        expenses: { housing: 0, food: 0, transport: 0, fun: 0, gear: 0 }
    }
};

const labelsMap = {
    housing: 'Citadel',
    food: 'Supplies',
    transport: 'Mounts',
    fun: 'Tavern',
    gear: 'Gear'
};

function initChart() {
    const ctx = document.getElementById('radarChart').getContext('2d');
    Chart.defaults.font.family = 'MedievalSharp';
    Chart.defaults.color = '#a38f56';

    chartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: Object.values(labelsMap),
            datasets: [{
                label: 'Spent',
                data: [0, 0, 0, 0, 0],
                backgroundColor: 'rgba(255, 50, 50, 0.4)', // Красный оттенок (расходы)
                borderColor: '#ff4e4e',
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#ff4e4e'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    pointLabels: { color: '#f0e6d2', font: { size: 12 } },
                    ticks: { display: false, backdropColor: 'transparent' }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
    
    // Загрузка начальных нулей
    updateView();
}

function switchTab(tab) {
    currentTab = tab;
    
    // Визуал вкладок
    document.getElementById('tab-month').classList.toggle('active', tab === 'month');
    document.getElementById('tab-year').classList.toggle('active', tab === 'year');
    
    // Подгружаем сохраненный доход для этой вкладки
    document.getElementById('income-input').value = db[currentTab].income || '';
    
    updateView();
}

function updateIncome() {
    const val = parseFloat(document.getElementById('income-input').value);
    if (!isNaN(val)) {
        db[currentTab].income = val;
    }
    updateView();
}

function updateView() {
    const currentData = db[currentTab];
    const expensesObj = currentData.expenses;
    
    // 1. Обновляем График (показываем расходы)
    chartInstance.data.datasets[0].data = Object.values(expensesObj);
    chartInstance.update();

    // 2. Считаем математику
    let totalSpent = Object.values(expensesObj).reduce((a, b) => a + b, 0);
    let totalIncome = currentData.income;
    let remaining = totalIncome - totalSpent;

    // 3. Выводим результат
    const displayEl = document.getElementById('remaining-amount');
    displayEl.innerText = remaining.toLocaleString();

    // Если ушли в минус - красим в красный
    if (remaining < 0) {
        displayEl.style.color = '#ff3333';
        displayEl.innerText = "⚠️ " + remaining.toLocaleString();
    } else {
        displayEl.style.color = '#fff';
    }
}

function addExpense() {
    const category = document.getElementById('category').value;
    const amount = parseFloat(document.getElementById('amount').value);

    if (!amount) return;

    db[currentTab].expenses[category] += amount;
    
    document.getElementById('amount').value = '';
    updateView();
}

initChart();