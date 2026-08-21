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

// Open create task modal
newTaskBtn.addEventListener("click", () => {
    taskModal.classList.add("show");
});

// Close modal
function closeModal() {
    taskModal.classList.remove("show");
}

closeTaskModal.addEventListener("click", closeModal);
cancelTaskBtn.addEventListener("click", closeModal);

// Close when clicking outside
taskModal.addEventListener("click", (event) => {
    if (event.target === taskModal) {
        closeModal();
    }
});

// ============================================================
// REVIEW MODAL
// ============================================================

const reviewModal = document.getElementById("reviewModal");
const closeReviewModalBtn =
    document.getElementById("closeReviewModal");

const cancelReviewBtn =
    document.getElementById("cancelReviewBtn");

const reviewForm =
    document.getElementById("reviewForm");

let currentReviewTaskId = null;

// Close review modal
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

// Close review modal when clicking outside
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

    // --------------------------------------------------------
    // DISPLAY TASK INFORMATION
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // LOAD EXISTING REVIEW DATA IF AVAILABLE
    // --------------------------------------------------------

    document.getElementById("reviewedVerifiedBy").value =
        task.reviewed_verified_by || "";

    document.getElementById("reviewResult").value =
        task.review_result || "";

    document.getElementById("reviewDate").value =
        task.review_date
            ? task.review_date.substring(0, 10)
            : "";

    document.getElementById("reviewRemarks").value =
        task.review_remarks || "";

    // --------------------------------------------------------
    // OPEN MODAL
    // --------------------------------------------------------

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
        // TASK TABLE
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

            if (task.status === "On Hold") {
                statusClass = "status-pending";
            }

            // ------------------------------------------------
            // REVIEW RESULT
            // ------------------------------------------------

            let reviewStatus = "Pending Review";
            let reviewClass = "status-pending";

            if (task.review_result === "Approved") {

                reviewStatus = "Approved";
                reviewClass = "status-completed";

            } else if (task.review_result === "For Revision") {

                reviewStatus = "For Revision";
                reviewClass = "status-active";

            } else if (task.review_result === "Rejected") {

                reviewStatus = "Rejected";
                reviewClass = "status-pending";
            }

            // ------------------------------------------------
            // TABLE ROW
            // ------------------------------------------------

            row.innerHTML = `

                <td>
                    ${task.task_activity || "-"}
                </td>

                <td>
                    ${task.procedure_stage || "-"}
                </td>

                <td>
                    <span class="status ${statusClass}">
                        ${task.status || "-"}
                    </span>
                </td>

                <td>
                    ${task.priority || "-"}
                </td>

                <td>
                    ${task.responsible_person || "-"}
                </td>

                <td>
                    ${task.due_date || "-"}
                </td>

                <td>
                    ${task.percent_complete || 0}%
                </td>

                <td>

                    <button
                        class="btn btn-primary review-task-btn"
                    >
                        Review
                    </button>

                    <button
                        class="btn btn-secondary edit-task-btn"
                    >
                        Edit
                    </button>

                    <button
                        class="btn btn-danger delete-task-btn"
                    >
                        Delete
                    </button>

                </td>
            `;

            table.appendChild(row);

            // =================================================
            // REVIEW BUTTON
            // =================================================

            const reviewBtn =
                row.querySelector(".review-task-btn");

            reviewBtn.addEventListener(
                "click",
                () => {
                    openReviewModal(task);
                }
            );

            // =================================================
            // DELETE BUTTON
            // =================================================

            const deleteBtn =
                row.querySelector(".delete-task-btn");

            deleteBtn.addEventListener(
                "click",
                async () => {

                    const confirmed =
                        confirm(
                            "Are you sure you want to delete this task?"
                        );

                    if (!confirmed) {
                        return;
                    }

                    try {

                        const response =
                            await fetch(
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

                        loadTasks();

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
                }
            );

            // =================================================
            // EDIT BUTTON
            // =================================================

            const editBtn =
                row.querySelector(".edit-task-btn");

            editBtn.addEventListener(
                "click",
                () => {

                    // You can connect your edit modal here.
                    alert(
                        "Edit task functionality can be added here."
                    );
                }
            );
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
// CREATE TASK
// ============================================================

const taskForm =
    document.getElementById("taskForm");

taskForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        // ====================================================
        // ONLY TASK CREATION INFORMATION
        // ====================================================

        const taskData = {

            procedure_stage:
                document.getElementById(
                    "procedureStage"
                ).value.trim(),

            task_activity:
                document.getElementById(
                    "taskActivity"
                ).value.trim(),

            status:
                document.getElementById(
                    "taskStatus"
                ).value,

            schedule_status:
                document.getElementById(
                    "scheduleStatus"
                ).value,

            priority:
                document.getElementById(
                    "taskPriority"
                ).value,

            responsible_person:
                document.getElementById(
                    "responsiblePerson"
                ).value.trim(),

            role:
                document.getElementById(
                    "taskRole"
                ).value,

            stakeholder_end_user:
                document.getElementById(
                    "stakeholderEndUser"
                ).value.trim(),

            start_date:
                document.getElementById(
                    "startDate"
                ).value || null,

            due_date:
                document.getElementById(
                    "dueDate"
                ).value || null,

            completion_date:
                document.getElementById(
                    "completionDate"
                ).value || null,

            deliverable_expected_output:
                document.getElementById(
                    "deliverableExpectedOutput"
                ).value.trim(),

            evidence_applicability:
                document.getElementById(
                    "evidenceApplicability"
                ).value,

            percent_complete:
                document.getElementById(
                    "percentComplete"
                ).value || 0,

            remarks:
                document.getElementById(
                    "remarks"
                ).value.trim()
        };

        // ====================================================
        // SEND TASK TO SERVER
        // ====================================================

        try {

            const response =
                await fetch(
                    `/api/projects/${projectId}/tasks`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(taskData)
                    }
                );

            const result =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    result.error ||
                    "Failed to create task."
                );
            }

            alert(
                "Task created successfully!"
            );

            taskForm.reset();

            document.getElementById(
                "percentComplete"
            ).value = 0;

            closeModal();

            loadTasks();

        } catch (error) {

            console.error(
                "Create task error:",
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

        // ====================================================
        // REVIEW DATA ONLY
        // ====================================================

        const reviewData = {

            reviewed_verified_by:
                document.getElementById(
                    "reviewedVerifiedBy"
                ).value.trim(),

            review_result:
                document.getElementById(
                    "reviewResult"
                ).value,

            review_date:
                document.getElementById(
                    "reviewDate"
                ).value || null,

            review_remarks:
                document.getElementById(
                    "reviewRemarks"
                ).value.trim()
        };

        // ====================================================
        // VALIDATION
        // ====================================================

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

        // ====================================================
        // SEND REVIEW TO SERVER
        // ====================================================

        try {

            const response =
                await fetch(
                    `/api/tasks/${currentReviewTaskId}/review`,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(reviewData)
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

            loadTasks();

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