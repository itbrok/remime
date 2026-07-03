document.addEventListener('DOMContentLoaded', () => {
    const clockElement = document.getElementById('clock');
    const greetingElement = document.getElementById('greeting');
    const todoListElement = document.getElementById('todo-list');
    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');
    const factTextElement = document.getElementById('fact-text');
    const levelBadge = document.getElementById('level-badge');
    const streakBadge = document.getElementById('streak-badge');
    const xpBarInner = document.getElementById('xp-bar-inner');
    const xpText = document.getElementById('xp-text');

    let todos = [];
    let xp = 0;
    let streak = 0;
    let lastCompletedDate = null; // YYYY-MM-DD

    // --- Clock Logic ---
    function updateClock() {
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();

        // Update greeting based on time
        let greeting = 'Good evening';
        if (hours < 12) {
            greeting = 'Good morning';
        } else if (hours < 18) {
            greeting = 'Good afternoon';
        }
        greetingElement.textContent = `${greeting}.`;

        // Format time
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        
        clockElement.textContent = `${hours}:${minutes}`;
    }

    // Initialize clock and update every second
    updateClock();
    setInterval(updateClock, 1000);

    // --- Gamification Logic ---
    function calculateLevel(currentXp) {
        return Math.floor(currentXp / 100) + 1;
    }

    function updateGamificationUI() {
        const level = calculateLevel(xp);
        const xpInLevel = xp % 100;

        levelBadge.textContent = `Lv. ${level}`;
        streakBadge.textContent = `🔥 ${streak}`;
        xpBarInner.style.width = `${xpInLevel}%`;
        xpText.textContent = `${xpInLevel} / 100 XP`;
    }

    function saveStats() {
        const stats = { xp, streak, lastCompletedDate };
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set(stats);
        } else {
            localStorage.setItem('remime_stats', JSON.stringify(stats));
        }
    }

    function loadStats() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['xp', 'streak', 'lastCompletedDate'], function(result) {
                if (result.xp !== undefined) xp = result.xp;
                if (result.streak !== undefined) streak = result.streak;
                if (result.lastCompletedDate !== undefined) lastCompletedDate = result.lastCompletedDate;
                updateGamificationUI();
                checkStreakReset();
            });
        } else {
            const stored = localStorage.getItem('remime_stats');
            if (stored) {
                const stats = JSON.parse(stored);
                xp = stats.xp || 0;
                streak = stats.streak || 0;
                lastCompletedDate = stats.lastCompletedDate || null;
            }
            updateGamificationUI();
            checkStreakReset();
        }
    }

    function checkStreakReset() {
        if (!lastCompletedDate) return;

        const today = new Date().toISOString().split('T')[0];
        const last = new Date(lastCompletedDate);
        const now = new Date(today);

        const diffTime = Math.abs(now - last);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
            streak = 0;
            saveStats();
            updateGamificationUI();
        }
    }

    function awardXp(amount) {
        xp += amount;

        const today = new Date().toISOString().split('T')[0];
        if (lastCompletedDate !== today) {
            if (isYesterday(lastCompletedDate)) {
                streak++;
            } else {
                streak = 1;
            }
            lastCompletedDate = today;
        }

        saveStats();
        updateGamificationUI();
    }

    function isYesterday(dateString) {
        if (!dateString) return false;
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return dateString === yesterday.toISOString().split('T')[0];
    }

    // --- Todo Logic ---
    function renderTodos() {
        todoListElement.innerHTML = '';
        todos.forEach((todo, index) => {
            const li = document.createElement('li');
            if (todo.completed) {
                li.classList.add('completed');
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = todo.completed;
            checkbox.addEventListener('change', () => toggleTodo(index));

            const span = document.createElement('span');
            span.textContent = todo.text;

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;'; // times symbol (x)
            deleteBtn.className = 'delete-btn';
            deleteBtn.title = 'Delete';
            deleteBtn.addEventListener('click', () => deleteTodo(index));

            li.appendChild(checkbox);
            li.appendChild(span);
            li.appendChild(deleteBtn);
            todoListElement.appendChild(li);
        });
    }

    function saveTodos() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ todos: todos });
        } else {
            localStorage.setItem('focus_todos', JSON.stringify(todos));
        }
    }

    function loadTodos() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['todos'], function(result) {
                if (result.todos) {
                    todos = result.todos;
                    renderTodos();
                }
            });
        } else {
            const stored = localStorage.getItem('focus_todos');
            if (stored) {
                todos = JSON.parse(stored);
                renderTodos();
            }
        }
    }

    function addTodo(text) {
        if (text.trim() === '') return;
        todos.push({ text: text, completed: false });
        saveTodos();
        renderTodos();
    }

    function toggleTodo(index) {
        const wasCompleted = todos[index].completed;
        todos[index].completed = !wasCompleted;

        if (!wasCompleted && todos[index].completed) {
            awardXp(10);
        } else if (wasCompleted && !todos[index].completed) {
            xp = Math.max(0, xp - 10);
            saveStats();
            updateGamificationUI();
        }

        saveTodos();
        renderTodos();
    }

    function deleteTodo(index) {
        todos.splice(index, 1);
        saveTodos();
        renderTodos();
    }

    todoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addTodo(todoInput.value);
        todoInput.value = ''; // clear input
    });


    // --- Learn Logic ---
    async function fetchFact() {
        try {
            const response = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en');
            const data = await response.json();
            factTextElement.textContent = data.text;
        } catch (error) {
            factTextElement.textContent = "Couldn't fetch a fact right now. Stay curious!";
            console.error("Fact fetch failed:", error);
        }
    }

    // Initial load
    loadTodos();
    loadStats();
    fetchFact();
});
