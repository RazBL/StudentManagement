const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./database");
const app = express();
const israeliMobilePhonePattern = /^05\d{8}$/;

const port = 3000;
const clientPath = path.join(__dirname, "client");

app.use(cors());
app.use(express.json());
app.use(express.static(clientPath));

function findTeacherByRequest(req) {
    const teacherId = Number(req.headers["x-teacher-id"] || req.query.teacherId);

    if (!teacherId) {
        return null;
    }

    return db.prepare(`
        SELECT * FROM teachers
        WHERE id = ?
    `).get(teacherId);
}

function normalizePhone(phone) {
    return String(phone || "").trim().replace(/-/g, "");
}

function isValidIsraeliMobilePhone(phone) {
    return israeliMobilePhonePattern.test(phone);
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

function validateStudentInput(req, res) {
    const student = {
        name: req.body.name,
        className: req.body.className,
        phone: normalizePhone(req.body.phone)
    };

    if (!student.name || !student.className || !student.phone) {
        res.status(400).json({
            message: "Name, class and phone are required"
        });
        return null;
    }

    if (!isValidIsraeliMobilePhone(student.phone)) {
        res.status(400).json({
            message: "Phone must be a valid Israeli mobile number"
        });
        return null;
    }

    return student;
}

function requireTeacher(req, res) {
    const teacher = findTeacherByRequest(req);

    if (!teacher) {
        res.status(401).json({
            message: "Teacher is not logged in"
        });
        return null;
    }

    return teacher;
}

app.get("/", function (req, res) {
    res.sendFile(path.join(clientPath, "loginPage.html"));
});

app.post("/auth/login", function (req, res) {
    const teacherName = (req.body.teacherName || "").trim();
    const teacherId = (req.body.teacherId || "").trim();

    const teacher = db.prepare(`
        SELECT * FROM teachers
        WHERE name = ?
        AND idNumber = ?
    `).get(teacherName, teacherId);

    if (!teacher) {
        return res.status(401).json({
            message: "שם או תעודת זהות לא נכונים"
        });
    }

    res.json({
        id: teacher.id,
        name: teacher.name
    });
});

app.get("/students", function (req, res) {
    const teacher = requireTeacher(req, res);

    if (!teacher) {
        return;
    }

    const students = db.prepare(`
    SELECT * FROM students
    WHERE teacherId = ?
`).all(teacher.id);

    res.json(students);
});

app.post("/students", function (req, res) {
    const teacher = requireTeacher(req, res);

    if (!teacher) {
        return;
    }

    const studentInput = validateStudentInput(req, res);

    if (!studentInput) {
        return;
    }

    const result = db.prepare(`
        INSERT INTO students (teacherId, name, className, phone)
        VALUES (?, ?, ?, ?)
    `).run(teacher.id, studentInput.name, studentInput.className, studentInput.phone);

    const student = db.prepare(`
        SELECT * FROM students
        WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(student);
});

app.put("/students/:id", function (req, res) {
    const teacher = requireTeacher(req, res);

    if (!teacher) {
        return;
    }

    const id = Number(req.params.id);
    const studentInput = validateStudentInput(req, res);

    if (!studentInput) {
        return;
    }

    const student = db.prepare(`
        SELECT * FROM students
        WHERE id = ? AND teacherId = ?
    `).get(id, teacher.id);

    if (!student) {
        return res.status(404).json({
            message: "Student not found"
        });
    }

    db.prepare(`
        UPDATE students
        SET name = ?, className = ?, phone = ?
        WHERE id = ? AND teacherId = ?
    `).run(studentInput.name, studentInput.className, studentInput.phone, id, teacher.id);

    const updatedStudent = db.prepare(`
        SELECT * FROM students
        WHERE id = ? AND teacherId = ?
    `).get(id, teacher.id);

    res.json(updatedStudent);
});

app.delete("/students/:id", function (req, res) {
    const teacher = requireTeacher(req, res);

    if (!teacher) {
        return;
    }

    const id = Number(req.params.id);

    const result = db.prepare(`
        DELETE FROM students
        WHERE id = ? AND teacherId = ?
    `).run(id, teacher.id);

    if (result.changes === 0) {
        return res.status(404).json({
            message: "Student not found"
        });
    }

    res.status(204).send();
});

app.get("/tasks", function (req, res) {
    const teacher = requireTeacher(req, res);

    if (!teacher) {
        return;
    }

    const tasks = db.prepare(`
        SELECT id, teacherId, title, className, dueDate, completed
        FROM tasks
        WHERE teacherId = ?
    `).all(teacher.id);

    const formattedTasks = tasks.map(function (task) {
        return {
            ...task,
            completed: Boolean(task.completed)
        };
    });

    res.json(formattedTasks);
});

app.post("/tasks", function (req, res) {
    const teacher = requireTeacher(req, res);

    if (!teacher) {
        return;
    }

    const title = req.body.title;
    const className = req.body.className;
    const dueDate = req.body.dueDate;

    if (!title || !className || !dueDate) {
        return res.status(400).json({
            message: "Title, class and due date are required"
        });
    }

    if (!isValidFutureOrTodayDate(dueDate)) {
        return res.status(400).json({
            message: "Invalid date"
        });
    }

    const result = db.prepare(`
        INSERT INTO tasks (teacherId, title, className, dueDate, completed)
        VALUES (?, ?, ?, ?, ?)
    `).run(teacher.id, title, className, dueDate, 0);

    const task = db.prepare(`
        SELECT * FROM tasks
        WHERE id = ?
    `).get(result.lastInsertRowid);

    task.completed = Boolean(task.completed);

    res.status(201).json(task);
});

app.put("/tasks/:id", function (req, res) {
    const teacher = requireTeacher(req, res);

    if (!teacher) {
        return;
    }

    const id = Number(req.params.id);

    const task = db.prepare(`
        SELECT * FROM tasks
        WHERE id = ? AND teacherId = ?
    `).get(id, teacher.id);

    if (!task) {
        return res.status(404).json({
            message: "Task not found"
        });
    }

    const title = req.body.title || task.title;
    const className = req.body.className || task.className;
    const dueDate = req.body.dueDate || task.dueDate;

    if (req.body.dueDate && !isValidFutureOrTodayDate(dueDate)) {
        return res.status(400).json({
            message: "Invalid date"
        });
    }

    let completed = task.completed;

    if (typeof req.body.completed === "boolean") {
        completed = req.body.completed ? 1 : 0;
    }

    db.prepare(`
        UPDATE tasks
        SET title = ?, className = ?, dueDate = ?, completed = ?
        WHERE id = ? AND teacherId = ?
    `).run(title, className, dueDate, completed, id, teacher.id);

    const updatedTask = db.prepare(`
        SELECT * FROM tasks
        WHERE id = ? AND teacherId = ?
    `).get(id, teacher.id);

    updatedTask.completed = Boolean(updatedTask.completed);

    res.json(updatedTask);
});

app.delete("/tasks/:id", function (req, res) {
    const teacher = requireTeacher(req, res);

    if (!teacher) {
        return;
    }

    const id = Number(req.params.id);

    const result = db.prepare(`
        DELETE FROM tasks
        WHERE id = ? AND teacherId = ?
    `).run(id, teacher.id);

    if (result.changes === 0) {
        return res.status(404).json({
            message: "Task not found"
        });
    }

    res.status(204).send();
});

app.use(function (req, res) {
    res.sendFile(path.join(clientPath, "loginPage.html"));
});

app.listen(port, function () {
    console.log(`Server is running on http://localhost:${port}`);
});
