const tg = window.Telegram.WebApp;
tg.expand();

let chartInstance = null;
let currentMode = 'month';

// Данные по 5 углам (как на скрине из доты)
let stats = {
    month: { housing: 10, food: 10, transport: 10, fun: 10, gear: 10 },
    year: { housing: 10, food: 10, transport: 10, fun: 10, gear: 10 }
};

// Соответствие категорий и названий
const labelsMap = {
    housing: 'Citadel',
    food: 'Supplies',
    transport: 'Mounts',
    fun: 'Tavern',
    gear: 'Gear'
};

function initChart() {
    const ctx = document.getElementById('radarChart').getContext('2d');
    
    chartInstance = new Chart(ctx, {
        type: 'radar', // ТИП ГРАФИКА: ПАУТИНА
        data: {
            labels: Object.values(labelsMap), // Названия углов
            datasets: [{
                label: 'Spending Stats',
                data: [10, 10, 10, 10, 10],
                backgroundColor: 'rgba(255, 215, 0, 0.4)', // Золотая заливка
                borderColor: '#FFD700', // Золотая линия
                pointBackgroundColor: '#fff',
                pointBorderColor: '#FFD700',
                borderWidth: 2
            }]
        },
        options: {
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.2)' }, // Лучи паутины
                    grid: { color: 'rgba(255, 255, 255, 0.2)' },      // Круги паутины
                    pointLabels: {
                        color: '#d4af37', // Цвет подписей углов
                        font: { size: 14, family: 'MedievalSharp' }
                    },
                    ticks: { display: false } // Скрыть цифры на осях
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function updateChart() {
    const dataObj = stats[currentMode];
    // Обновляем данные графика
    chartInstance.data.datasets[0].data = Object.values(dataObj);
    chartInstance.update();

    // Считаем общую сумму
    let total = Object.values(dataObj).reduce((a, b) => a + b, 0) - 50; // вычитаем начальные 10*5
    document.getElementById('total-amount').innerText = total > 0 ? total : 0;
}

function addExpense() {
    const category = document.getElementById('category').value;
    const amount = parseFloat(document.getElementById('amount').value);

    if (!amount) return;

    // Добавляем к текущему значению
    stats[currentMode][category] += amount;
    
    document.getElementById('amount').value = '';
    updateChart();
}

function setMode(mode) {
    currentMode = mode;
    document.getElementById('btn-month').classList.toggle('active', mode === 'month');
    document.getElementById('btn-year').classList.toggle('active', mode === 'year');
    updateChart();
}

initChart();