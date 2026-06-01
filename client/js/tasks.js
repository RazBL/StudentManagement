const taskForm = document.querySelector("#taskForm");
const tasksContainer = document.querySelector("#tasksContainer");
const openTasksCount = document.querySelector("#openTasksCount");
const submitButton = taskForm.querySelector("button[type='submit']");
const taskDueDateInput = document.querySelector("#taskDueDate");

let tasks = [];
let editingTaskId = null;

function formatDate(date) {
    return new Date(date).toLocaleDateString("he-IL");
}

function formatDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getTodayDateString() {
    return formatDateString(new Date());
}

function isValidFutureOrTodayDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
    }

    const parsedDate = new Date(`${date}T00:00:00`);

    return formatDateString(parsedDate) === date && date >= getTodayDateString();
}

function formatClassName(className) {
    return `כיתה ${className}`;
}

function getTaskFormData() {
    return {
        title: document.querySelector("#taskTitle").value,
        className: document.querySelector("#taskClassName").value,
        dueDate: document.querySelector("#taskDueDate").value
    };
}

function fillTaskForm(task) {
    document.querySelector("#taskTitle").value = task.title;
    document.querySelector("#taskClassName").value = task.className;
    document.querySelector("#taskDueDate").value = task.dueDate;
}

function resetTaskForm() {
    editingTaskId = null;
    taskForm.reset();
    submitButton.textContent = "שמירה";
}

function createTaskCard(task) {
    const textClass = task.completed ? "text-decoration-line-through text-muted" : "";
    const badgeClass = task.completed ? "text-bg-success" : "text-bg-primary";
    const badgeText = task.completed ? "הושלם" : "פתוחה";
    const checked = task.completed ? "checked" : "";

    return `
        <div class="task-card border rounded p-3 bg-white" data-id="${task.id}">
            <div class="task-card-top d-flex justify-content-between align-items-start gap-3">
                <div class="form-check">
                    <input class="form-check-input task-checkbox" type="checkbox" id="task-${task.id}" ${checked}>
                    <label class="form-check-label ${textClass}" for="task-${task.id}">
                        <h6 class="mb-1">${task.title}</h6>
                        <p class="text-muted mb-0">${formatClassName(task.className)} - ${formatDate(task.dueDate)}</p>
                    </label>
                </div>
                <span class="badge rounded-pill ${badgeClass}">${badgeText}</span>
            </div>

            <div class="task-actions d-flex gap-2 justify-content-end mt-3">
                <button type="button" class="btn btn-sm btn-warning edit-task">עריכה</button>
                <button type="button" class="btn btn-sm btn-danger delete-task">מחיקה</button>
            </div>
        </div>
    `;
}

function renderTasks() {
    const openTasks = tasks.filter(function (task) {
        return !task.completed;
    });

    openTasksCount.textContent = `${openTasks.length} פתוחות`;

    if (tasks.length === 0) {
        tasksContainer.innerHTML = `<p class="text-muted">אין מטלות להצגה</p>`;
        return;
    }

    tasksContainer.innerHTML = tasks.map(createTaskCard).join("");
}

async function loadTasks() {
    try {
        const response = await fetch("/tasks", {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error("Failed to load tasks");
        }

        tasks = await response.json();
        renderTasks();
    } catch (error) {
        console.error(error);
        alert("משהו השתבש בטעינת המטלות");
    }
}

taskForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const task = getTaskFormData();

    if (!isValidFutureOrTodayDate(task.dueDate)) {
        alert("Invalid date");
        return;
    }

    const url = editingTaskId ? `/tasks/${editingTaskId}` : "/tasks";
    const method = editingTaskId ? "PUT" : "POST";

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders()
            },
            body: JSON.stringify(task)
        });

        if (!response.ok) {
            throw new Error("Failed to save task");
        }

        resetTaskForm();
        loadTasks();
    } catch (error) {
        console.error(error);
        alert("משהו השתבש בשמירת המטלה");
    }
});

tasksContainer.addEventListener("change", async function (event) {
    if (!event.target.classList.contains("task-checkbox")) {
        return;
    }

    const card = event.target.closest(".task-card");
    const id = card.dataset.id;

    try {
        const response = await fetch(`/tasks/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                completed: event.target.checked
            })
        });

        if (!response.ok) {
            throw new Error("Failed to update task");
        }

        loadTasks();
    } catch (error) {
        console.error(error);
        alert("משהו השתבש בעדכון המטלה");
    }
});

tasksContainer.addEventListener("click", async function (event) {
    const card = event.target.closest(".task-card");

    if (!card) {
        return;
    }

    const id = Number(card.dataset.id);
    const task = tasks.find(function (task) {
        return task.id === id;
    });

    if (event.target.classList.contains("edit-task")) {
        editingTaskId = id;
        fillTaskForm(task);
        submitButton.textContent = "עדכון";

        const addTaskCard = document.getElementById("addTaskCard");
        bootstrap.Collapse.getOrCreateInstance(addTaskCard).show();
    }

    if (event.target.classList.contains("delete-task")) {
        if (!confirm("למחוק את המטלה?")) {
            return;
        }

        try {
            const response = await fetch(`/tasks/${id}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error("Failed to delete task");
            }

            loadTasks();
        } catch (error) {
            console.error(error);
            alert("משהו השתבש במחיקת המטלה");
        }
    }
});

taskDueDateInput.min = getTodayDateString();

loadTasks();
