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

// База данных
let db = {
    month: { 
        income: 0, 
        expenses: { housing: 0, food: 0, transport: 0, fun: 0, gear: 0 }
    },
    year: { 
        income: 0, 
        expenses: { housing: 0, food: 0, transport: 0, fun: 0, gear: 0 }
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
    let amount = prompt("Add gold to treasury:", "0");
    if (amount !== null) {
        let val = parseFloat(amount);
        if (!isNaN(val) && val > 0) {
            db[currentTab].income += val;
            updateView();
        }
    }
}

// === РАСХОДЫ (ДОБАВИТЬ ИЗ ФОРМЫ) ===
function addExpense() {
    const catKey = document.getElementById('category-select').value;
    const amount = parseFloat(document.getElementById('amount').value);
    
    if (!amount || !catKey) return;

    if (!db[currentTab].expenses[catKey]) db[currentTab].expenses[catKey] = 0;
    
    // Просто прибавляем к общей куче
    db[currentTab].expenses[catKey] += amount;

    document.getElementById('amount').value = '';
    updateView();
}

// === РЕДАКТИРОВАНИЕ В СПИСКЕ (Breakdown) ===
function manualExpenseEdit(key, inputElement) {
    let val = parseFloat(inputElement.value);
    if (isNaN(val)) val = 0;
    
    // Прямая запись нового значения
    db[currentTab].expenses[key] = val;
    
    // Обновляем всё (кроме самого инпута, чтоб фокус не слетел)
    updateView(false); 
}

// === ОТРИСОВКА СПИСКА КАТЕГОРИЙ ===
function renderBreakdown() {
    const list = document.getElementById('breakdown-list');
    list.innerHTML = ''; // Очистить
    
    const expenses = db[currentTab].expenses;

    // Проходимся по карте меток, чтобы сохранить порядок
    for (let [key, name] of labelsMap.entries()) {
        const amount = expenses[key] || 0;

        let div = document.createElement('div');
        div.className = 'breakdown-item';
        
        // Создаем HTML: Название слева, Инпут справа
        div.innerHTML = `
            <span class="breakdown-name">${name}</span>
            <input type="number" 
                   class="edit-expense-input" 
                   value="${amount}" 
                   onchange="manualExpenseEdit('${key}', this)">
        `;
        list.appendChild(div);
    }
}

// === ОБЩЕЕ ОБНОВЛЕНИЕ ===
function updateView(redrawBreakdown = true) {
    const currentData = db[currentTab];

    // 1. Доход
    const incInput = document.getElementById('income-input');
    // Если фокус не на инпуте дохода, обновляем его (чтоб не мешать вводу)
    if (document.activeElement !== incInput) {
        incInput.value = currentData.income === 0 ? '' : currentData.income;
    }

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

    // 4. Список категорий (перерисовываем, если нужно)
    if (redrawBreakdown) {
        renderBreakdown();
    }
}

// === КАТЕГОРИИ ===
function addNewCategory() {
    const nameInput = document.getElementById('new-cat-name');
    const name = nameInput.value.trim();
    if (!name) return;

    const key = name.toLowerCase().replace(/\s+/g, '_');
    if (!labelsMap.has(key)) {
        labelsMap.set(key, name);
        // Инициализируем нулями
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