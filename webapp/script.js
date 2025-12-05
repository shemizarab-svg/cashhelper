const tg = window.Telegram.WebApp;
tg.expand();

let chartInstance = null;
let currentTab = 'month';

let db = {
    month: { income: 0, expenses: { housing: 0, food: 0, transport: 0, fun: 0, gear: 0 } },
    year: { income: 0, expenses: { housing: 0, food: 0, transport: 0, fun: 0, gear: 0 } }
};

const labelsMap = {
    housing: 'Citadel', food: 'Supplies', transport: 'Mounts', fun: 'Tavern', gear: 'Gear'
};

function initChart() {
    const ctx = document.getElementById('radarChart').getContext('2d');
    Chart.defaults.font.family = 'MedievalSharp';
    
    chartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: Object.values(labelsMap),
            datasets: [{
                label: 'Spent',
                data: [0, 0, 0, 0, 0],
                backgroundColor: 'rgba(255, 215, 0, 0.25)', // Золотая заливка
                borderColor: '#ffd700',
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#ffd700'
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
    updateView();
}

function switchTab(tab) {
    currentTab = tab;
    document.getElementById('tab-month').classList.toggle('active', tab === 'month');
    document.getElementById('tab-year').classList.toggle('active', tab === 'year');
    
    // При переключении меняем значение в инпуте дохода
    const incInput = document.getElementById('income-input');
    // Если доход 0, показываем пустоту (placeholder), иначе цифру
    incInput.value = db[currentTab].income === 0 ? '' : db[currentTab].income;
    
    updateView();
}

function updateIncome() {
    const val = parseFloat(document.getElementById('income-input').value);
    db[currentTab].income = isNaN(val) ? 0 : val;
    updateView();
}

function updateView() {
    const currentData = db[currentTab];
    
    // Обновляем график
    chartInstance.data.datasets[0].data = Object.values(currentData.expenses);
    chartInstance.update();

    // Считаем остаток
    let totalSpent = Object.values(currentData.expenses).reduce((a, b) => a + b, 0);
    let remaining = currentData.income - totalSpent;

    const remEl = document.getElementById('remaining-amount');
    remEl.innerText = remaining.toLocaleString();
    
    if (remaining < 0) remEl.style.color = '#ff3333';
    else remEl.style.color = '#fff';
}

function addExpense() {
    const cat = document.getElementById('category').value;
    const amount = parseFloat(document.getElementById('amount').value);
    if (!amount) return;

    db[currentTab].expenses[cat] += amount;
    document.getElementById('amount').value = '';
    updateView();
}

initChart();