const tg = window.Telegram.WebApp;
tg.expand();

let chartInstance = null;
let currentTab = 'month';

// --- БАЗА ДАННЫХ ---
// Используем Map для хранения соответствия "ключ -> название", чтобы сохранить порядок
let labelsMap = new Map([
    ['housing', 'Citadel'],
    ['food', 'Supplies'],
    ['transport', 'Mounts'],
    ['fun', 'Tavern'],
    ['gear', 'Gear']
]);

// Хранилище денег. Категории сюда будут добавляться динамически.
let db = {
    month: { income: 0, expenses: { housing: 0, food: 0, transport: 0, fun: 0, gear: 0 } },
    year: { income: 0, expenses: { housing: 0, food: 0, transport: 0, fun: 0, gear: 0 } }
};

// --- ИНИЦИАЛИЗАЦИЯ ---
function initChart() {
    const ctx = document.getElementById('radarChart').getContext('2d');
    Chart.defaults.font.family = 'MedievalSharp';
    
    chartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            // Метки берем из нашего Map (значения)
            labels: Array.from(labelsMap.values()),
            datasets: [{
                label: 'Spent',
                data: [], // Данные подгрузятся в updateView
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
    
    updateDropdown(); // Заполняем селект начальными категориями
    updateView(); // Рисуем все
}

// --- ЛОГИКА ---

// Переключение вкладок
function switchTab(tab) {
    currentTab = tab;
    document.getElementById('tab-month').classList.toggle('active', tab === 'month');
    document.getElementById('tab-year').classList.toggle('active', tab === 'year');
    
    // Обновляем инпут дохода
    const incInput = document.getElementById('income-input');
    incInput.value = db[currentTab].income === 0 ? '' : db[currentTab].income;
    
    updateView();
}

// Обновление дохода при вводе
function updateIncome() {
    const val = parseFloat(document.getElementById('income-input').value);
    db[currentTab].income = isNaN(val) ? 0 : val;
    updateView();
}

// Главная функция обновления экрана
function updateView() {
    const currentExp = db[currentTab].expenses;
    
    // 1. Собираем данные для графика в правильном порядке (по ключам из Map)
    let dataForChart = [];
    let totalSpent = 0;
    
    for (let key of labelsMap.keys()) {
        const amount = currentExp[key] || 0; // Если новой категории нет в базе, берем 0
        dataForChart.push(amount);
        totalSpent += amount;
    }

    // 2. Обновляем график
    chartInstance.data.labels = Array.from(labelsMap.values()); // Обновляем метки (если добавились)
    chartInstance.data.datasets[0].data = dataForChart;
    chartInstance.update();

    // 3. Считаем и выводим остаток
    let remaining = db[currentTab].income - totalSpent;
    const remEl = document.getElementById('remaining-amount');
    remEl.innerText = remaining.toLocaleString();
    
    if (remaining < 0) remEl.style.color = '#ff3333';
    else remEl.style.color = '#fff';
}

// Добавление расхода
function addExpense() {
    const catKey = document.getElementById('category-select').value;
    const amount = parseFloat(document.getElementById('amount').value);

    if (!amount || !catKey) return;

    // Если такой категории еще нет в базе для этого периода, инициализируем нулем
    if (!db[currentTab].expenses[catKey]) {
         db[currentTab].expenses[catKey] = 0;
    }

    db[currentTab].expenses[catKey] += amount;
    document.getElementById('amount').value = '';
    updateView();
}

// --- ДИНАМИЧЕСКОЕ ДОБАВЛЕНИЕ КАТЕГОРИЙ ---
function addNewCategory() {
    const nameInput = document.getElementById('new-cat-name');
    const name = nameInput.value.trim();

    if (!name) {
        tg.showAlert("Enter category name!");
        return;
    }

    // Создаем безопасный ключ из имени (Car -> car, My Food -> my_food)
    const key = name.toLowerCase().replace(/\s+/g, '_');

    if (labelsMap.has(key)) {
         tg.showAlert("Category already exists!");
         return;
    }

    // 1. Добавляем в наш список меток
    labelsMap.set(key, name);

    // 2. Инициализируем нулями в базе (на всякий случай)
    db.month.expenses[key] = 0;
    db.year.expenses[key] = 0;

    // 3. Обновляем интерфейс
    updateDropdown();
    updateView();
    
    nameInput.value = ''; // Очищаем поле ввода
    tg.HapticFeedback.notificationOccurred('success'); // Вибрация при успехе
}

// Обновление выпадающего списка категорий
function updateDropdown() {
    const select = document.getElementById('category-select');
    select.innerHTML = ''; // Очищаем старые
    
    for (let [key, name] of labelsMap.entries()) {
        let option = document.createElement('option');
        option.value = key;
        option.innerText = name;
        select.appendChild(option);
    }
}

// Запуск
initChart();