const tg = window.Telegram.WebApp;
tg.expand();

// === 1. ПОЛУЧАЕМ ID ПОЛЬЗОВАТЕЛЯ (АВТОРИЗАЦИЯ) ===
// Если открыто не в телеграме, будет 'guest'
const userId = tg.initDataUnsafe?.user?.id || 'guest';
const STORAGE_KEY = `azeroth_budget_${userId}`; // Уникальный ключ для сохранения

let chartInstance = null;
let currentTab = 'month';

// Начальные метки (если нет сохранений)
let labelsMap = new Map([
    ['housing', 'Citadel'],
    ['food', 'Supplies'],
    ['transport', 'Mounts'],
    ['fun', 'Tavern'],
    ['gear', 'Gear']
]);

// База данных (если нет сохранений)
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

// === ФУНКЦИИ СОХРАНЕНИЯ И ЗАГРУЗКИ ===

function saveData() {
    const dataToSave = {
        db: db,
        // Map нельзя сохранить напрямую в JSON, превращаем в массив
        labels: Array.from(labelsMap.entries()) 
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
}

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            
            // Восстанавливаем базу данных
            // (используем Object.assign, чтобы не сломать структуру, если мы добавим новые поля в будущем)
            db = parsed.db;

            // Восстанавливаем метки категорий
            if (parsed.labels) {
                labelsMap = new Map(parsed.labels);
            }
        } catch (e) {
            console.error("Save file corrupted, starting fresh.");
        }
    }
}

// === ИНИЦИАЛИЗАЦИЯ ===

function initChart() {
    loadData(); // <--- ЗАГРУЖАЕМСЯ ПЕРЕД СТАРТОМ

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
    saveData(); // <--- СОХРАНЯЕМ
    updateView();
}

function addMoreIncome() {
    let amount = prompt("Add gold to treasury:", "0");
    if (amount !== null) {
        let val = parseFloat(amount);
        if (!isNaN(val) && val > 0) {
            db[currentTab].income += val;
            saveData(); // <--- СОХРАНЯЕМ
            updateView();
        }
    }
}

// === РАСХОДЫ ===
function addExpense() {
    const catKey = document.getElementById('category-select').value;
    const amount = parseFloat(document.getElementById('amount').value);
    
    if (!amount || !catKey) return;

    if (!db[currentTab].expenses[catKey]) db[currentTab].expenses[catKey] = 0;
    db[currentTab].expenses[catKey] += amount;

    document.getElementById('amount').value = '';
    
    saveData(); // <--- СОХРАНЯЕМ
    updateView();
}

function manualExpenseEdit(key, inputElement) {
    let val = parseFloat(inputElement.value);
    if (isNaN(val)) val = 0;
    db[currentTab].expenses[key] = val;
    
    saveData(); // <--- СОХРАНЯЕМ
    updateView(false); 
}

// === УДАЛЕНИЕ КАТЕГОРИИ ===
function removeCategory(key) {
    if(confirm("Delete this category permanently?")) {
        labelsMap.delete(key);
        delete db.month.expenses[key];
        delete db.year.expenses[key];

        saveData(); // <--- СОХРАНЯЕМ
        updateDropdown();
        updateView();
    }
}

// === ОТРИСОВКА СПИСКА ===
function renderBreakdown() {
    const list = document.getElementById('breakdown-list');
    list.innerHTML = '';
    
    const expenses = db[currentTab].expenses;

    for (let [key, name] of labelsMap.entries()) {
        const amount = expenses[key] || 0;

        let div = document.createElement('div');
        div.className = 'breakdown-item';
        
        div.innerHTML = `
            <span class="breakdown-name">${name}</span>
            <div class="edit-wrapper">
                <input type="number" 
                       class="edit-expense-input" 
                       value="${amount}" 
                       onchange="manualExpenseEdit('${key}', this)">
                
                <button class="delete-cat-btn" onclick="removeCategory('${key}')">✖</button>
            </div>
        `;
        list.appendChild(div);
    }
}

// === ОБНОВЛЕНИЕ ЭКРАНА ===
function updateView(redrawBreakdown = true) {
    const currentData = db[currentTab];

    const incInput = document.getElementById('income-input');
    if (document.activeElement !== incInput) {
        incInput.value = currentData.income === 0 ? '' : currentData.income;
    }

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

    let remaining = currentData.income - totalSpent;
    const remEl = document.getElementById('remaining-amount');
    remEl.innerText = remaining.toLocaleString();
    remEl.style.color = remaining < 0 ? '#ff3333' : '#fff';

    if (redrawBreakdown) {
        renderBreakdown();
    }
}

// === НОВАЯ КАТЕГОРИЯ ===
function addNewCategory() {
    const nameInput = document.getElementById('new-cat-name');
    const name = nameInput.value.trim();
    if (!name) return;

    const key = name.toLowerCase().replace(/\s+/g, '_');
    if (!labelsMap.has(key)) {
        labelsMap.set(key, name);
        db.month.expenses[key] = 0;
        db.year.expenses[key] = 0;
        
        saveData(); // <--- СОХРАНЯЕМ
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