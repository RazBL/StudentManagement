const studentsCount = document.querySelector("#studentsCount");
const tasksCount = document.querySelector("#tasksCount");
const latestStudentsCards = document.querySelector("#latestStudentsCards");
const tasksList = document.querySelector("#tasksList");
const tasksTableBody = document.querySelector("#tasksTableBody");

function formatDate(date) {
    return new Date(date).toLocaleDateString("he-IL");
}

function formatClassName(className) {
    return `כיתה ${className}`;
}

function renderStudents(students) {
    studentsCount.textContent = students.length;

    const lastThreeStudents = students.slice(-3).reverse();

    if (lastThreeStudents.length === 0) {
        latestStudentsCards.innerHTML = `
            <div class="col">
                <p class="text-muted">אין תלמידים להצגה</p>
            </div>
        `;
        return;
    }

    latestStudentsCards.innerHTML = lastThreeStudents.map(function (student) {
        return `
            <div class="col">
                <div class="student-summary-card bg-white border rounded p-3 h-100">
                    <h6 class="mb-2">${student.name}</h6>
                    <p class="text-muted mb-1">כיתה: ${student.className}</p>
                    <p class="text-muted mb-1">טלפון: ${student.phone}</p>
                </div>
            </div>
        `;
    }).join("");
}

function getTaskStatus(task) {
    return {
        textClass: task.completed ? "text-decoration-line-through text-muted" : "",
        badgeClass: task.completed ? "text-bg-success" : "text-bg-primary",
        badgeText: task.completed ? "הושלם" : "פתוחה",
        checked: task.completed ? "checked" : ""
    };
}

function renderTasksTable(tasks) {
    if (tasks.length === 0) {
        tasksTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-muted">אין מטלות להצגה</td>
            </tr>
        `;
        return;
    }

    tasksTableBody.innerHTML = tasks.map(function (task) {
        const status = getTaskStatus(task);

        return `
            <tr class="task-row" data-id="${task.id}" data-completed="${task.completed}">
                <td class="${status.textClass}">${task.title}</td>
                <td class="${status.textClass}">${formatClassName(task.className)}</td>
                <td class="${status.textClass}">${formatDate(task.dueDate)}</td>
                <td><span class="badge rounded-pill ${status.badgeClass}">${status.badgeText}</span></td>
                <td>
                    <input class="form-check-input task-checkbox" type="checkbox" data-id="${task.id}" ${status.checked}>
                </td>
            </tr>
        `;
    }).join("");
}

function renderTasksCards(tasks) {
    if (tasks.length === 0) {
        tasksList.innerHTML = `<p class="text-muted">אין מטלות להצגה</p>`;
        return;
    }

    tasksList.innerHTML = tasks.map(function (task) {
        const status = getTaskStatus(task);

        return `
            <div class="task-card-top d-flex flex-column flex-sm-row justify-content-between align-items-start gap-3" data-id="${task.id}" data-completed="${task.completed}">
                <div class="form-check">
                    <input class="form-check-input task-checkbox" type="checkbox" id="task-${task.id}" data-id="${task.id}" ${status.checked}>
                    <label class="form-check-label ${status.textClass}" for="task-${task.id}">
                        <p class="mb-1">${task.title}</p>
                        <p class="text-muted mb-0">${formatClassName(task.className)} - ${formatDate(task.dueDate)}</p>
                    </label>
                </div>
                <span class="badge rounded-pill align-self-start align-self-sm-auto ${status.badgeClass}">${status.badgeText}</span>
            </div>
        `;
    }).join("");
}

function renderTasks(tasks) {
    const openTasks = tasks.filter(function (task) {
        return !task.completed;
    });

    tasksCount.textContent = openTasks.length;
    renderTasksTable(tasks);
    renderTasksCards(tasks);
}

async function loadDashboard() {
    try {
        const headers = getAuthHeaders();

        const studentsResponse = await fetch("/students", {
            headers: headers
        });
        const tasksResponse = await fetch("/tasks", {
            headers: headers
        });

        if (!studentsResponse.ok || !tasksResponse.ok) {
            throw new Error("Failed to load dashboard");
        }

        const students = await studentsResponse.json();
        const tasks = await tasksResponse.json();

        renderStudents(students);
        renderTasks(tasks);
    } catch (error) {
        console.error(error);
        alert("משהו השתבש בטעינת הדאשבורד");
    }
}

async function updateTaskStatus(id, completed) {
    try {
        const response = await fetch(`/tasks/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                completed: completed
            })
        });

        if (!response.ok) {
            throw new Error("Failed to update task");
        }

        loadDashboard();
    } catch (error) {
        console.error(error);
        alert("משהו השתבש בעדכון המטלה");
    }
}

document.addEventListener("change", function (event) {
    if (!event.target.classList.contains("task-checkbox")) {
        return;
    }

    updateTaskStatus(event.target.dataset.id, event.target.checked);
});

document.addEventListener("click", function (event) {
    const taskElement = event.target.closest(".task-row, .task-card-top");

    if (!taskElement || event.target.closest(".task-checkbox, .form-check-label")) {
        return;
    }

    const completed = taskElement.dataset.completed === "true";
    updateTaskStatus(taskElement.dataset.id, !completed);
});

loadDashboard();
