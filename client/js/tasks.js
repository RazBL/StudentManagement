const taskForm = document.querySelector("#taskForm");
const tasksContainer = document.querySelector("#tasksContainer");
const openTasksCount = document.querySelector("#openTasksCount");
const submitButton = taskForm.querySelector("button[type='submit']");
const taskDueDateInput = document.querySelector("#taskDueDate");
const statusFilterButtons = document.querySelectorAll(".status-filter-btn");
const addTaskButton = document.querySelector("#addTaskButton");
const addTaskCard = document.getElementById("addTaskCard");
const taskFormTitle = addTaskCard.querySelector(".card-title");
const addTaskTitle = "הוספת מטלה חדשה";
const editTaskTitle = "עריכת מטלה";
const saveButtonText = "שמירה";
const updateButtonText = "עדכון";

let tasks = [];
let editingTaskId = null;

function formatDate(date) {
    const parts = date.split("-");

    if (parts.length !== 3) {
        return date;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function createDateText(date) {
    return `<span dir="ltr">${formatDate(date)}</span>`;
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

function formatDateForInput(date) {
    return formatDate(date);
}

function parseDateInput(date) {
    const parts = date.trim().split("/");

    if (parts.length !== 3) {
        return "";
    }

    const day = parts[0].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    const year = parts[2];

    return `${year}-${month}-${day}`;
}

function formatDateInputValue(value) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const parts = [];

    if (digits.length > 0) {
        parts.push(digits.slice(0, 2));
    }

    if (digits.length > 2) {
        parts.push(digits.slice(2, 4));
    }

    if (digits.length > 4) {
        parts.push(digits.slice(4));
    }

    return parts.join("/");
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
        dueDate: parseDateInput(document.querySelector("#taskDueDate").value)
    };
}

function fillTaskForm(task) {
    document.querySelector("#taskTitle").value = task.title;
    document.querySelector("#taskClassName").value = task.className;
    document.querySelector("#taskDueDate").value = formatDateForInput(task.dueDate);
}

function resetTaskForm() {
    editingTaskId = null;
    taskForm.reset();
    submitButton.textContent = "שמירה";
    taskFormTitle.textContent = addTaskTitle;
    submitButton.textContent = saveButtonText;
}

function createTaskCard(task) {
    const textClass = task.completed ? "text-decoration-line-through text-muted" : "";
    const badgeClass = task.completed ? "text-bg-success" : "text-bg-primary";
    const badgeText = task.completed ? "הושלם" : "פתוחה";
    const checked = task.completed ? "checked" : "";

    return `
        <div class="task-card border rounded p-3 bg-white" data-id="${task.id}">
        <input class="form-check-input task-checkbox" type="checkbox" id="task-${task.id}" ${checked}>
            <label class="form-check-label ${textClass}" for="task-${task.id}">
                <div class="task-card-top d-flex flex-column flex-sm-row justify-content-between align-items-start gap-3">
                    <div class="form-check">
                        <h6 class="mb-1">${task.title}</h6>
                        <p class="text-muted mb-0">${formatClassName(task.className)} - ${createDateText(task.dueDate)}</p>
                    </div>
                    <span class="badge rounded-pill align-self-start align-self-sm-auto ${badgeClass}">${badgeText}</span>
                </div>
            </label>

            <div class="task-actions d-flex gap-2 justify-content-end flex-wrap mt-3">
                <button type="button" class="btn btn-sm btn-warning edit-task">עריכה</button>
                <button type="button" class="btn btn-sm btn-danger delete-task">מחיקה</button>
            </div>
        </div>
    `;
}

function getVisibleTasks() {
    const activeStatusButton = document.querySelector(".status-filter-btn.active");
    const status = activeStatusButton ? activeStatusButton.dataset.status : "all";

    const visibleTasks = tasks.filter(function (task) {
        const matchesStatus = status === "all" ||
            (status === "open" && !task.completed) ||
            (status === "completed" && task.completed);

        return matchesStatus;
    });

    return visibleTasks.sort(function (a, b) {
        return a.dueDate.localeCompare(b.dueDate);
    });
}

function renderTasks() {
    const openTasks = tasks.filter(function (task) {
        return !task.completed;
    });
    const visibleTasks = getVisibleTasks();

    openTasksCount.textContent = `${openTasks.length} פתוחות`;

    if (tasks.length === 0) {
        tasksContainer.innerHTML = `<p class="text-muted">אין מטלות להצגה</p>`;
        return;
    }

    if (visibleTasks.length === 0) {
        tasksContainer.innerHTML = `<p class="text-muted">אין מטלות תואמות</p>`;
        return;
    }

    tasksContainer.innerHTML = visibleTasks.map(createTaskCard).join("");
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

    if (!taskDueDateInput.checkValidity()) {
        taskDueDateInput.reportValidity();
        return;
    }

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

    if (!event.target.classList.contains("edit-task") &&
        !event.target.classList.contains("delete-task") &&
        !event.target.closest(".task-checkbox, .form-check-label")) {
        const checkbox = card.querySelector(".task-checkbox");

        if (checkbox) {
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event("change", {
                bubbles: true
            }));
        }

        return;
    }

    if (event.target.classList.contains("edit-task")) {
        editingTaskId = id;
        fillTaskForm(task);
        taskFormTitle.textContent = editTaskTitle;
        submitButton.textContent = updateButtonText;
        submitButton.textContent = "עדכון";

        taskFormTitle.textContent = editTaskTitle;
        submitButton.textContent = updateButtonText;
        bootstrap.Collapse.getOrCreateInstance(addTaskCard).show();
        return;
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

statusFilterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        statusFilterButtons.forEach(function (statusButton) {
            statusButton.classList.remove("active");
        });

        button.classList.add("active");
        renderTasks();
    });
});

addTaskButton.addEventListener("click", function () {
    if (!addTaskCard.classList.contains("show")) {
        resetTaskForm();
    }
});

addTaskCard.addEventListener("hidden.bs.collapse", resetTaskForm);

taskDueDateInput.addEventListener("input", function () {
    taskDueDateInput.value = formatDateInputValue(taskDueDateInput.value);
});

resetTaskForm();
loadTasks();
