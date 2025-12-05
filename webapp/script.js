const tg = window.Telegram.WebApp;
tg.expand();

let chartInstance = null;
let currentTab = 'month';

// Начальные данные (чтобы не было пустоты при первом запуске)
let db = {
    month: { housing: 50, food: 80, transport: 40, fun: 30, gear: 20 },
    year: { housing: 600, food: 900, transport: 500, fun: 300, gear: 200 }
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
    
    // Настройки шрифта для Chart.js
    Chart.defaults.font.family = 'MedievalSharp';
    Chart.defaults.font.size = 14;
    Chart.defaults.color = '#a38f56'; // Цвет текста легенды

    chartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: Object.values(labelsMap),
            datasets: [{
                label: 'Gold Spent',
                data: [0, 0, 0, 0, 0],
                // Золотая заливка (полупрозрачная)
                backgroundColor: 'rgba(255, 215, 0, 0.2)',
                // Яркая золотая обводка
                borderColor: '#FFD700',
                borderWidth: 2,
                // Точки на углах
                pointBackgroundColor: '#fff',
                pointBorderColor: '#FFD700',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    // Линии паутины
                    angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    // Подписи углов (Citadel, Food...)
                    pointLabels: {
                        color: '#f0e6d2', // Светлый пергамент
                        font: { size: 14 }
                    },
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
    document.getElementById('tab-title').innerText = tab === 'month' ? "Monthly Expenses" : "Yearly Expenses";
    updateView();
}

function updateView() {
    const dataObj = db[currentTab];
    chartInstance.data.datasets[0].data = Object.values(dataObj);
    chartInstance.update();

    let total = Object.values(dataObj).reduce((a, b) => a + b, 0);
    document.getElementById('total-amount').innerText = total.toLocaleString();
}

function addExpense() {
    const category = document.getElementById('category').value;
    const amount = parseFloat(document.getElementById('amount').value);
    if (!amount) return;
    db[currentTab][category] += amount;
    document.getElementById('amount').value = '';
    updateView();
}

initChart();