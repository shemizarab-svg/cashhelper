let expenses = { month: [], year: [] };
let currentMode = 'month';
let chartInstance = null;

// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand(); // Раскрыть на весь экран

// Цвета для графика (Dota style)
const chartColors = {
    housing: '#A63535', // Red (Strength)
    food: '#488536',    // Green (Agility)
    transport: '#386FA4', // Blue (Intelligence)
    fun: '#D4AF37',     // Gold
    other: '#6D717A'    // Grey
};

function initChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderColor: '#121212',
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            cutout: '70%', // Делает кольцо тонким
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function setMode(mode) {
    currentMode = mode;
    document.getElementById('btn-month').classList.toggle('active', mode === 'month');
    document.getElementById('btn-year').classList.toggle('active', mode === 'year');
    updateUI();
}

function addExpense() {
    const category = document.getElementById('category').value;
    const amount = parseFloat(document.getElementById('amount').value);

    if (!amount) return;

    expenses[currentMode].push({ category, amount });
    document.getElementById('amount').value = ''; // Очистить поле
    updateUI();
}

function updateUI() {
    const data = expenses[currentMode];
    const list = document.getElementById('expense-list');
    list.innerHTML = '';

    // Группировка для графика
    let totals = { housing: 0, food: 0, transport: 0, fun: 0, other: 0 };
    let totalSum = 0;

    data.forEach(item => {
        totals[item.category] += item.amount;
        totalSum += item.amount;

        // Добавление в список
        let li = document.createElement('li');
        li.innerHTML = `<span>${getCategoryName(item.category)}</span> <span>${item.amount}</span>`;
        li.style.borderLeftColor = chartColors[item.category];
        list.appendChild(li);
    });

    // Обновление графика
    chartInstance.data.labels = Object.keys(totals).map(getCategoryName);
    chartInstance.data.datasets[0].data = Object.values(totals);
    chartInstance.data.datasets[0].backgroundColor = Object.keys(totals).map(k => chartColors[k]);
    chartInstance.update();

    // Обновление цифры в центре
    document.getElementById('total-amount').innerText = totalSum.toLocaleString();

    // Генерация советов
    generateTips(totals, totalSum);
}

function getCategoryName(key) {
    const map = { housing: 'Tower (Home)', food: 'Tango (Food)', transport: 'TP (Travel)', fun: 'Skins (Fun)', other: 'Other' };
    return map[key];
}

function generateTips(totals, sum) {
    const tipsBox = document.getElementById('tips-box');
    const tipText = document.getElementById('tip-text');
    
    if (sum === 0) {
        tipsBox.style.display = 'none';
        return;
    }

    tipsBox.style.display = 'block';
    
    // Логика советов (Правило 50/30/20 адаптированное)
    if (totals.food / sum > 0.3) {
        tipText.innerText = "⚠️ Расходы на Tango (Еду) превышают 30%. Попробуй готовить дома и не покупать 'расходники' в кафе.";
    } else if (totals.fun / sum > 0.2) {
        tipText.innerText = "⚠️ Слишком много золота уходит на скины (Развлечения). Отмени подписки, которыми не пользуешься.";
    } else if (totals.transport / sum > 0.15) {
        tipText.innerText = "⚠️ Свитки телепортации (Транспорт) слишком дороги. Проверь проездные или карпулинг.";
    } else {
        tipText.innerText = "✅ Баланс золота в норме. Инвестируй излишки в Buyback (Сбережения).";
    }
}

// Запуск
initChart();