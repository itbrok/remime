document.addEventListener('DOMContentLoaded', () => {
    const clockElement = document.getElementById('clock');
    const greetingElement = document.getElementById('greeting');
    const todoListElement = document.getElementById('todo-list');
    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');

    let todos = [];

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
            // Fallback for local testing outside extension environment
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
            // Fallback for local testing
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
        todos[index].completed = !todos[index].completed;
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

    // Initial load
    loadTodos();
});