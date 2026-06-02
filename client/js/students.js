const studentForm = document.querySelector("#studentForm");
const studentTable = document.querySelector(".students");
const studentCards = document.querySelector("#studentsCards");
const submitButton = studentForm.querySelector("button[type='submit']");
const addStudentButton = document.querySelector("#addStudentButton");
const studentFormTitle = document.querySelector("#studentFormTitle");
const addStudentCard = document.getElementById("addStudentCard");
const phoneInput = document.getElementById("studentPhone");
const studentSearchInput = document.querySelector("#studentSearch");
const mobilePhonePattern = /^05\d{8}$/;
const addStudentTitle = "הוספת תלמיד חדש";
const editStudentTitle = "ערוך תלמיד";
const saveButtonText = "שמירה";
const updateButtonText = "עדכון";

let students = [];
let editingStudentId = null;

function normalizePhone(phone) {
    return phone.trim().replace(/-/g, "");
}

function isValidMobilePhonePattern(phone) {
    return mobilePhonePattern.test(normalizePhone(phone));
}

phoneInput.addEventListener("input", function () {
    phoneInput.setCustomValidity("");
});

function getStudentFormData() {
    return {
        name: document.getElementById("studentName").value,
        className: document.getElementById("studentClass").value,
        phone: normalizePhone(phoneInput.value)
    };
}

function fillStudentForm(student) {
    document.getElementById("studentName").value = student.name;
    document.getElementById("studentClass").value = student.className;
    document.getElementById("studentPhone").value = student.phone;
}

function resetStudentForm() {
    editingStudentId = null;
    studentForm.reset();
    phoneInput.setCustomValidity("");
    studentFormTitle.textContent = addStudentTitle;
    submitButton.textContent = saveButtonText;
}

function createStudentRow(student) {
    return `
        <tr data-id="${student.id}">
            <th scope="row">${student.name}</th>
            <td>${student.className}</td>
            <td class="phone-number">${student.phone}</td>
            <td>
                <div class="d-flex gap-2 justify-content-center">
                    <button type="button" class="btn btn-sm btn-warning edit-student">עריכה</button>
                    <button type="button" class="btn btn-sm btn-danger delete-student">מחיקה</button>
                </div>
            </td>
        </tr>
    `;
}

function createStudentCard(student) {
    return `
        <div class="student-mobile-card bg-white border rounded p-3 text-start" data-id="${student.id}">
            <h6 class="mb-2">${student.name}</h6>

            <p class="text-dark fw-semibold mb-1">כיתה: ${student.className}</p>
            <p class="text-muted mb-1">טלפון: <span class="phone-number">${student.phone}</span></p>

            <div class="student-card-actions d-flex gap-2 flex-wrap">
                <button type="button" class="btn btn-sm btn-warning edit-student">עריכה</button>
                <button type="button" class="btn btn-sm btn-danger delete-student">מחיקה</button>
            </div>
        </div>
    `;
}

function getFilteredStudents() {
    const search = studentSearchInput.value.trim().toLowerCase();
    const normalizedSearch = normalizePhone(search);

    if (!search) {
        return students;
    }

    return students.filter(function (student) {
        return student.name.toLowerCase().includes(search) ||
            student.className.toLowerCase().includes(search) ||
            student.phone.includes(normalizedSearch);
    });
}

function renderStudents() {
    const visibleStudents = getFilteredStudents();

    if (students.length === 0) {
        studentTable.innerHTML = `
            <tr>
                <td colspan="4" class="text-muted">אין תלמידים להצגה</td>
            </tr>
        `;
        studentCards.innerHTML = `<p class="text-muted">אין תלמידים להצגה</p>`;
        return;
    }

    if (visibleStudents.length === 0) {
        studentTable.innerHTML = `
            <tr>
                <td colspan="4" class="text-muted">&#1488;&#1497;&#1503; &#1514;&#1493;&#1510;&#1488;&#1493;&#1514; &#1500;&#1495;&#1497;&#1508;&#1493;&#1513;</td>
            </tr>
        `;
        studentCards.innerHTML = `<p class="text-muted">&#1488;&#1497;&#1503; &#1514;&#1493;&#1510;&#1488;&#1493;&#1514; &#1500;&#1495;&#1497;&#1508;&#1493;&#1513;</p>`;
        return;
    }

    studentTable.innerHTML = visibleStudents.map(createStudentRow).join("");
    studentCards.innerHTML = visibleStudents.map(createStudentCard).join("");
}

async function loadStudents() {
    try {
        const response = await fetch("/students", {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error("Failed to load students");
        }

        students = await response.json();
        renderStudents();
    } catch (error) {
        console.error(error);
        alert("משהו השתבש בטעינת התלמידים");
    }
}

studentForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!isValidMobilePhonePattern(phoneInput.value)) {
        phoneInput.setCustomValidity("מספר טלפון ישראלי חייב להתחיל ב-05 ולהכיל 10 ספרות");
        phoneInput.reportValidity();
        return;
    }

    phoneInput.setCustomValidity("");

    const student = getStudentFormData();
    const url = editingStudentId ? `/students/${editingStudentId}` : "/students";
    const method = editingStudentId ? "PUT" : "POST";

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders()
            },
            body: JSON.stringify(student)
        });

        if (!response.ok) {
            throw new Error("Failed to save student");
        }

        await loadStudents();
        resetStudentForm();
    } catch (error) {
        console.error(error);
        alert("משהו השתבש בשמירת התלמיד");
    }
});

function editStudent(id) {
    const student = students.find(function (student) {
        return student.id === Number(id);
    });

    if (!student) {
        return;
    }

    editingStudentId = id;
    fillStudentForm(student);
    studentFormTitle.textContent = editStudentTitle;
    submitButton.textContent = updateButtonText;

    bootstrap.Collapse.getOrCreateInstance(addStudentCard).show();
}

addStudentButton.addEventListener("click", function () {
    if (!addStudentCard.classList.contains("show")) {
        resetStudentForm();
    }
});

addStudentCard.addEventListener("hidden.bs.collapse", resetStudentForm);

async function deleteStudent(id) {
    if (!confirm("למחוק את התלמיד?")) {
        return;
    }

    try {
        const response = await fetch(`/students/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error("Failed to delete student");
        }

        if (editingStudentId === id) {
            resetStudentForm();
        }

        await loadStudents();
    } catch (error) {
        console.error(error);
        alert("משהו השתבש במחיקת התלמיד");
    }
}

document.addEventListener("click", function (event) {
    const studentElement = event.target.closest("[data-id]");

    if (!studentElement) {
        return;
    }

    const id = studentElement.dataset.id;

    if (event.target.classList.contains("edit-student")) {
        editStudent(id);
    }

    if (event.target.classList.contains("delete-student")) {
        deleteStudent(id);
    }
});

studentSearchInput.addEventListener("input", renderStudents);

loadStudents();
