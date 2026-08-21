// ============================================================
// GET PROJECT ID FROM URL
// ============================================================

const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get("project_id");

// ============================================================
// CHECK PROJECT ID
// ============================================================

if (!projectId) {
    alert("No project selected.");
    window.location.href = "/";
}

// ============================================================
// TASK MODAL
// ============================================================

const taskModal = document.getElementById("taskModal");
const newTaskBtn = document.getElementById("newTaskBtn");
const closeTaskModal = document.getElementById("closeTaskModal");
const cancelTaskBtn = document.getElementById("cancelTaskBtn");
const taskForm = document.getElementById("taskForm");

// Editing task ID
let editingTaskId = null;

// Optional modal elements
const taskModalTitle = document.getElementById("taskModalTitle");
const taskModalSubtitle = document.getElementById("taskModalSubtitle");
const taskSubmitBtn = document.getElementById("taskSubmitBtn");

// ============================================================
// OPEN NEW TASK MODAL
// ============================================================

newTaskBtn.addEventListener("click", () => {

    editingTaskId = null;

    taskForm.reset();

    const percentComplete =
        document.getElementById("percentComplete");

    if (percentComplete) {
        percentComplete.value = 0;
    }

    if (taskModalTitle) {
        taskModalTitle.textContent = "New Task";
    }

    if (taskModalSubtitle) {
        taskModalSubtitle.textContent =
            "Add a task to this project.";
    }

    if (taskSubmitBtn) {
        taskSubmitBtn.textContent = "Create Task";
    }

    taskModal.classList.add("show");
});

// ============================================================
// CLOSE TASK MODAL
// ============================================================

function closeModal() {

    taskModal.classList.remove("show");

    editingTaskId = null;

    taskForm.reset();

    const percentComplete =
        document.getElementById("percentComplete");

    if (percentComplete) {
        percentComplete.value = 0;
    }

    if (taskModalTitle) {
        taskModalTitle.textContent = "New Task";
    }

    if (taskModalSubtitle) {
        taskModalSubtitle.textContent =
            "Add a task to this project.";
    }

    if (taskSubmitBtn) {
        taskSubmitBtn.textContent = "Create Task";
    }
}

closeTaskModal.addEventListener("click", closeModal);
cancelTaskBtn.addEventListener("click", closeModal);

// Close when clicking outside modal

taskModal.addEventListener("click", (event) => {

    if (event.target === taskModal) {
        closeModal();
    }

});

// ============================================================
// OPEN EDIT TASK MODAL
// ============================================================

function openEditTaskModal(task) {

    console.log("Editing task:", task);

    editingTaskId = task.task_id;

    // --------------------------------------------------------
    // CHANGE MODAL TITLE
    // --------------------------------------------------------

    if (taskModalTitle) {
        taskModalTitle.textContent = "Edit Task";
    }

    if (taskModalSubtitle) {
        taskModalSubtitle.textContent =
            "Update the information for this task.";
    }

    if (taskSubmitBtn) {
        taskSubmitBtn.textContent = "Update Task";
    }

    // --------------------------------------------------------
    // FILL FORM
    // --------------------------------------------------------

    document.getElementById("procedureStage").value =
        task.procedure_stage || "";

    document.getElementById("taskActivity").value =
        task.task_activity || "";

    document.getElementById("taskStatus").value =
        task.status || "Not Started";

    document.getElementById("scheduleStatus").value =
        task.schedule_status || "";

    document.getElementById("taskPriority").value =
        task.priority || "";

    document.getElementById("responsiblePerson").value =
        task.responsible_person || "";

    document.getElementById("taskRole").value =
        task.role || "";

    document.getElementById("stakeholderEndUser").value =
        task.stakeholder_end_user || "";

    document.getElementById("startDate").value =
        task.start_date
            ? task.start_date.substring(0, 10)
            : "";

    document.getElementById("dueDate").value =
        task.due_date
            ? task.due_date.substring(0, 10)
            : "";

    document.getElementById("completionDate").value =
        task.completion_date
            ? task.completion_date.substring(0, 10)
            : "";

    document.getElementById("deliverableExpectedOutput").value =
        task.deliverable_expected_output || "";

    document.getElementById("evidenceApplicability").value =
        task.evidence_applicability || "";

    document.getElementById("percentComplete").value =
        task.percent_complete || 0;

    // --------------------------------------------------------
    // OPEN MODAL
    // --------------------------------------------------------

    taskModal.classList.add("show");
}

// ============================================================
// REVIEW MODAL
// ============================================================

const reviewModal =
    document.getElementById("reviewModal");

const closeReviewModalBtn =
    document.getElementById("closeReviewModal");

const cancelReviewBtn =
    document.getElementById("cancelReviewBtn");

const reviewForm =
    document.getElementById("reviewForm");

let currentReviewTaskId = null;

// ============================================================
// CLOSE REVIEW MODAL
// ============================================================

function closeReviewModal() {

    reviewModal.classList.remove("show");

    currentReviewTaskId = null;
}

closeReviewModalBtn.addEventListener(
    "click",
    closeReviewModal
);

cancelReviewBtn.addEventListener(
    "click",
    closeReviewModal
);

reviewModal.addEventListener("click", (event) => {

    if (event.target === reviewModal) {
        closeReviewModal();
    }

});

// ============================================================
// OPEN REVIEW MODAL
// ============================================================

function openReviewModal(task) {

    currentReviewTaskId = task.task_id;

    document.getElementById("reviewTaskName").textContent =
        task.task_activity || "-";

    document.getElementById("reviewResponsiblePerson").textContent =
        task.responsible_person || "-";

    document.getElementById("reviewStatus").textContent =
        task.status || "-";

    document.getElementById("reviewPercentComplete").textContent =
        `${task.percent_complete || 0}%`;

    document.getElementById("reviewExpectedOutput").textContent =
        task.deliverable_expected_output || "-";

    document.getElementById("reviewedVerifiedBy").value =
        task.reviewed_verified_by || "";

    document.getElementById("reviewResult").value =
        task.review_result || "";

    document.getElementById("reviewDate").value =
        task.review_date
            ? task.review_date.substring(0, 10)
            : "";

    document.getElementById("reviewRemarks").value =
        task.remarks || "";

    reviewModal.classList.add("show");
}

// ============================================================
// LOAD TASKS
// ============================================================

async function loadTasks() {

    try {

        const response = await fetch(
            `/api/projects/${projectId}/tasks`
        );

        if (!response.ok) {
            throw new Error("Failed to load tasks.");
        }

        const data = await response.json();

        console.log("Tasks loaded:", data);

        const tasks = data.tasks || [];

        // ----------------------------------------------------
        // STATISTICS
        // ----------------------------------------------------

        document.getElementById("taskTotal").textContent =
            tasks.length;

        document.getElementById("taskNotStarted").textContent =
            tasks.filter(
                task => task.status === "Not Started"
            ).length;

        document.getElementById("taskInProgress").textContent =
            tasks.filter(
                task => task.status === "In Progress"
            ).length;

        document.getElementById("taskCompleted").textContent =
            tasks.filter(
                task => task.status === "Completed"
            ).length;

        // ----------------------------------------------------
        // TABLE
        // ----------------------------------------------------

        const table =
            document.getElementById("tasksTable");

        table.innerHTML = "";

        if (tasks.length === 0) {

            table.innerHTML = `
                <tr>
                    <td colspan="8">
                        No tasks found.
                    </td>
                </tr>
            `;

            return;
        }

        // ----------------------------------------------------
        // DISPLAY TASKS
        // ----------------------------------------------------

        tasks.forEach(task => {

            const row =
                document.createElement("tr");

            // ------------------------------------------------
            // STATUS CLASS
            // ------------------------------------------------

            let statusClass = "status-pending";

            if (task.status === "In Progress") {
                statusClass = "status-active";
            }

            if (task.status === "Completed") {
                statusClass = "status-completed";
            }

            // ------------------------------------------------
            // ROW
            // ------------------------------------------------

            row.innerHTML = `
                <td>${task.task_activity || "-"}</td>

                <td>${task.procedure_stage || "-"}</td>

                <td>
                    <span class="status ${statusClass}">
                        ${task.status || "-"}
                    </span>
                </td>

                <td>${task.priority || "-"}</td>

                <td>${task.responsible_person || "-"}</td>

                <td>${task.due_date || "-"}</td>

                <td>${task.percent_complete || 0}%</td>

                <td>

                    <button
                        type="button"
                        class="btn btn-primary review-task-btn">
                        Review
                    </button>

                    <button
                        type="button"
                        class="btn btn-secondary edit-task-btn">
                        Edit
                    </button>

                    <button
                        type="button"
                        class="btn btn-danger delete-task-btn">
                        Delete
                    </button>

                </td>
            `;

            table.appendChild(row);

            // ------------------------------------------------
            // REVIEW
            // ------------------------------------------------

            row.querySelector(".review-task-btn")
                .addEventListener("click", () => {

                    openReviewModal(task);

                });

            // ------------------------------------------------
            // EDIT
            // ------------------------------------------------

            row.querySelector(".edit-task-btn")
                .addEventListener("click", () => {

                    openEditTaskModal(task);

                });

            // ------------------------------------------------
            // DELETE
            // ------------------------------------------------

            row.querySelector(".delete-task-btn")
                .addEventListener("click", async () => {

                    const confirmed = confirm(
                        "Are you sure you want to delete this task?"
                    );

                    if (!confirmed) {
                        return;
                    }

                    try {

                        const response = await fetch(
                            `/api/tasks/${task.task_id}`,
                            {
                                method: "DELETE"
                            }
                        );

                        const result =
                            await response.json();

                        if (!response.ok) {

                            throw new Error(
                                result.error ||
                                "Failed to delete task."
                            );
                        }

                        alert(
                            "Task deleted successfully!"
                        );

                        await loadTasks();

                    } catch (error) {

                        console.error(
                            "Delete task error:",
                            error
                        );

                        alert(
                            "Error: " +
                            error.message
                        );
                    }

                });

        });

    } catch (error) {

        console.error(
            "Load tasks error:",
            error
        );

        alert(
            "Error loading tasks: " +
            error.message
        );
    }
}

// ============================================================
// CREATE / UPDATE TASK
// ============================================================

taskForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        // ----------------------------------------------------
        // COLLECT FORM DATA
        // ----------------------------------------------------

        const taskData = {

            procedure_stage:
                document.getElementById("procedureStage").value.trim(),

            task_activity:
                document.getElementById("taskActivity").value.trim(),

            status:
                document.getElementById("taskStatus").value,

            schedule_status:
                document.getElementById("scheduleStatus").value,

            priority:
                document.getElementById("taskPriority").value,

            responsible_person:
                document.getElementById("responsiblePerson").value.trim(),

            role:
                document.getElementById("taskRole").value,

            stakeholder_end_user:
                document.getElementById("stakeholderEndUser").value.trim(),

            start_date:
                document.getElementById("startDate").value || null,

            due_date:
                document.getElementById("dueDate").value || null,

            completion_date:
                document.getElementById("completionDate").value || null,

            deliverable_expected_output:
                document
                    .getElementById("deliverableExpectedOutput")
                    .value
                    .trim(),

            evidence_applicability:
                document.getElementById("evidenceApplicability").value,

            percent_complete:
                document.getElementById("percentComplete").value || 0
        };

        console.log("Submitting task:", taskData);

        // ----------------------------------------------------
        // CREATE OR UPDATE
        // ----------------------------------------------------

        let url;
        let method;

        if (editingTaskId) {

            // EDIT
            url = `/api/tasks/${editingTaskId}`;
            method = "PUT";

        } else {

            // CREATE
            url = `/api/projects/${projectId}/tasks`;
            method = "POST";
        }

        console.log("Request:", method, url);

        // ----------------------------------------------------
        // SEND REQUEST
        // ----------------------------------------------------

        try {

            const response = await fetch(
                url,
                {
                    method: method,

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(taskData)
                }
            );

            const result =
                await response.json();

            console.log(
                "Server response:",
                result
            );

            if (!response.ok) {

                throw new Error(
                    result.error ||
                    "Failed to save task."
                );
            }

            // ------------------------------------------------
            // SUCCESS
            // ------------------------------------------------

            if (editingTaskId) {

                alert(
                    "Task updated successfully!"
                );

            } else {

                alert(
                    "Task created successfully!"
                );
            }

            // ------------------------------------------------
            // CLOSE
            // ------------------------------------------------

            closeModal();

            // ------------------------------------------------
            // RELOAD
            // ------------------------------------------------

            await loadTasks();

        } catch (error) {

            console.error(
                "Save task error:",
                error
            );

            alert(
                "Error: " +
                error.message
            );
        }

    }
);

// ============================================================
// SUBMIT REVIEW
// ============================================================

reviewForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        if (!currentReviewTaskId) {

            alert(
                "No task selected for review."
            );

            return;
        }

        const reviewData = {

            reviewed_verified_by:
                document
                    .getElementById("reviewedVerifiedBy")
                    .value
                    .trim(),

            review_result:
                document.getElementById("reviewResult").value,

            review_date:
                document.getElementById("reviewDate").value || null,

            remarks:
                document
                    .getElementById("reviewRemarks")
                    .value
                    .trim()
        };

        // ----------------------------------------------------
        // VALIDATION
        // ----------------------------------------------------

        if (!reviewData.reviewed_verified_by) {

            alert(
                "Please enter the name of the reviewer."
            );

            return;
        }

        if (!reviewData.review_result) {

            alert(
                "Please select a review result."
            );

            return;
        }

        if (!reviewData.review_date) {

            alert(
                "Please enter the review date."
            );

            return;
        }

        // ----------------------------------------------------
        // SEND REVIEW
        // ----------------------------------------------------

        try {

            const response = await fetch(
                `/api/tasks/${currentReviewTaskId}/review`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(reviewData)
                }
            );

            const result =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    result.error ||
                    "Failed to submit review."
                );
            }

            alert(
                "Task review submitted successfully!"
            );

            reviewForm.reset();

            closeReviewModal();

            await loadTasks();

        } catch (error) {

            console.error(
                "Submit review error:",
                error
            );

            alert(
                "Error: " +
                error.message
            );
        }

    }
);

// ============================================================
// INITIAL LOAD
// ============================================================

loadTasks();