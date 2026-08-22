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
// TASK MODAL ELEMENTS
// ============================================================

const taskModal = document.getElementById("taskModal");
const newTaskBtn = document.getElementById("newTaskBtn");
const closeTaskModal = document.getElementById("closeTaskModal");
const cancelTaskBtn = document.getElementById("cancelTaskBtn");
const taskForm = document.getElementById("taskForm");
const taskModalTitle = document.getElementById("taskModalTitle");
const taskModalSubtitle = document.getElementById("taskModalSubtitle");
const taskSubmitBtn = document.getElementById("taskSubmitBtn");


// ============================================================
// EDITING STATE
// ============================================================

let editingTaskId = null;


// ============================================================
// HELPER - GET ELEMENT
// ============================================================

function getElement(id) {
    return document.getElementById(id);
}


// ============================================================
// HELPER - SET VALUE
// ============================================================

function setValue(id, value) {
    const element = getElement(id);

    if (element) {
        element.value = value ?? "";
    }
}


// ============================================================
// HELPER - GET VALUE
// ============================================================

function getValue(id) {
    const element = getElement(id);

    return element ? element.value : "";
}


// ============================================================
// HELPER - ESCAPE HTML
// ============================================================

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// HELPER - FORMAT DATE
// ============================================================

function formatDate(dateValue) {
    if (!dateValue) {
        return "-";
    }

    return String(dateValue).substring(0, 10);
}


// ============================================================
// OPEN NEW TASK MODAL
// ============================================================

if (newTaskBtn) {
    newTaskBtn.addEventListener("click", () => {

        editingTaskId = null;

        taskForm.reset();

        setValue("percentComplete", 0);

        taskModalTitle.textContent = "New Task";

        taskModalSubtitle.textContent =
            "Add a task to this project.";

        taskSubmitBtn.textContent = "Create Task";

        taskModal.classList.add("show");
    });
}


// ============================================================
// CLOSE TASK MODAL
// ============================================================

function closeModal() {

    if (!taskModal) {
        return;
    }

    taskModal.classList.remove("show");

    editingTaskId = null;

    if (taskForm) {
        taskForm.reset();
    }

    setValue("percentComplete", 0);

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


// ============================================================
// CLOSE TASK MODAL BUTTONS
// ============================================================

if (closeTaskModal) {
    closeTaskModal.addEventListener("click", closeModal);
}

if (cancelTaskBtn) {
    cancelTaskBtn.addEventListener("click", closeModal);
}


// ============================================================
// CLOSE TASK MODAL WHEN CLICKING OUTSIDE
// ============================================================

if (taskModal) {

    taskModal.addEventListener("click", (event) => {

        if (event.target === taskModal) {
            closeModal();
        }

    });

}


// ============================================================
// OPEN EDIT TASK MODAL
// ============================================================

function openEditTaskModal(task) {

    console.log("Opening task for edit:", task);

    editingTaskId = task.task_id;


    // --------------------------------------------------------
    // MODAL HEADER
    // --------------------------------------------------------

    taskModalTitle.textContent = "Edit Task";

    taskModalSubtitle.textContent =
        "Update the information for this task.";

    taskSubmitBtn.textContent = "Update Task";


    // --------------------------------------------------------
    // BASIC INFORMATION
    // --------------------------------------------------------

    setValue(
        "taskActivity",
        task.task_activity
    );

    setValue(
        "procedureStage",
        task.procedure_stage
    );

    setValue(
        "taskStatus",
        task.status
    );


    // --------------------------------------------------------
    // ASSIGNMENT & SCHEDULE
    // --------------------------------------------------------

    setValue(
        "taskPriority",
        task.priority
    );

    setValue(
        "scheduleStatus",
        task.schedule_status
    );

    setValue(
        "responsiblePerson",
        task.responsible_person
    );

    setValue(
        "taskRole",
        task.role
    );

    setValue(
        "stakeholderEndUser",
        task.stakeholder_end_user
    );


    // --------------------------------------------------------
    // DATES
    // --------------------------------------------------------

    setValue(
        "startDate",
        formatDate(task.start_date)
    );

    setValue(
        "dueDate",
        formatDate(task.due_date)
    );


    // --------------------------------------------------------
    // PROGRESS
    // --------------------------------------------------------

    setValue(
        "percentComplete",
        task.percent_complete ?? 0
    );


    // --------------------------------------------------------
    // ADDITIONAL DETAILS
    // --------------------------------------------------------

    setValue(
        "deliverableExpectedOutput",
        task.deliverable_expected_output
    );

    setValue(
        "evidenceApplicability",
        task.evidence_applicability
    );


    // --------------------------------------------------------
    // OPEN MODAL
    // --------------------------------------------------------

    taskModal.classList.add("show");
}


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


// ============================================================
// CLOSE REVIEW MODAL
// ============================================================

function closeReviewModal() {

    if (!reviewModal) {
        return;
    }

    reviewModal.classList.remove("show");

    currentReviewTaskId = null;
}


// ============================================================
// REVIEW CLOSE BUTTONS
// ============================================================

if (closeReviewModalBtn) {
    closeReviewModalBtn.addEventListener(
        "click",
        closeReviewModal
    );
}

if (cancelReviewBtn) {
    cancelReviewBtn.addEventListener(
        "click",
        closeReviewModal
    );
}


// ============================================================
// CLOSE REVIEW MODAL OUTSIDE CLICK
// ============================================================

if (reviewModal) {

    reviewModal.addEventListener("click", (event) => {

        if (event.target === reviewModal) {
            closeReviewModal();
        }

    });

}


// ============================================================
// OPEN REVIEW MODAL
// ============================================================

function openReviewModal(task) {

    console.log("Opening review:", task);

    currentReviewTaskId = task.task_id;


    // --------------------------------------------------------
    // TASK INFORMATION
    // --------------------------------------------------------

    const reviewTaskName =
        document.getElementById("reviewTaskName");

    const reviewResponsiblePerson =
        document.getElementById("reviewResponsiblePerson");

    const reviewStatus =
        document.getElementById("reviewStatus");

    const reviewPercentComplete =
        document.getElementById("reviewPercentComplete");

    const reviewExpectedOutput =
        document.getElementById("reviewExpectedOutput");


    if (reviewTaskName) {
        reviewTaskName.textContent =
            task.task_activity || "-";
    }

    if (reviewResponsiblePerson) {
        reviewResponsiblePerson.textContent =
            task.responsible_person || "-";
    }

    if (reviewStatus) {
        reviewStatus.textContent =
            task.status || "-";
    }

    if (reviewPercentComplete) {
        reviewPercentComplete.textContent =
            `${task.percent_complete ?? 0}%`;
    }

    if (reviewExpectedOutput) {
        reviewExpectedOutput.textContent =
            task.deliverable_expected_output || "-";
    }


    // --------------------------------------------------------
    // EXISTING REVIEW DATA
    // --------------------------------------------------------

    setValue(
        "reviewedVerifiedBy",
        task.reviewed_verified_by
    );

    setValue(
        "reviewResult",
        task.review_result
    );

    setValue(
        "reviewDate",
        formatDate(task.review_date)
    );

    setValue(
        "reviewRemarks",
        task.remarks
    );


    // --------------------------------------------------------
    // OPEN MODAL
    // --------------------------------------------------------

    reviewModal.classList.add("show");
}


// ============================================================
// TASK HISTORY MODAL
// ============================================================

const historyModal =
    document.getElementById("historyModal");

const closeHistoryModalBtn =
    document.getElementById("closeHistoryModal");

const cancelHistoryBtn =
    document.getElementById("cancelHistoryBtn");

const historyTaskName =
    document.getElementById("historyTaskName");

const historyTaskTitle =
    document.getElementById("historyTaskTitle");

const historyCurrentStatus =
    document.getElementById("historyCurrentStatus");

const historyCurrentPercent =
    document.getElementById("historyCurrentPercent");

const taskHistoryTable =
    document.getElementById("taskHistoryTable");

let currentHistoryTaskId = null;


// ============================================================
// CLOSE HISTORY MODAL
// ============================================================

function closeHistoryModal() {

    if (!historyModal) {
        return;
    }

    historyModal.classList.remove("show");

    currentHistoryTaskId = null;

    if (taskHistoryTable) {

        taskHistoryTable.innerHTML = `
            <tr>
                <td colspan="7">
                    No history found.
                </td>
            </tr>
        `;

    }
}


// ============================================================
// HISTORY CLOSE BUTTONS
// ============================================================

if (closeHistoryModalBtn) {

    closeHistoryModalBtn.addEventListener(
        "click",
        closeHistoryModal
    );

}

if (cancelHistoryBtn) {

    cancelHistoryBtn.addEventListener(
        "click",
        closeHistoryModal
    );

}


// ============================================================
// CLOSE HISTORY MODAL OUTSIDE CLICK
// ============================================================

if (historyModal) {

    historyModal.addEventListener("click", (event) => {

        if (event.target === historyModal) {
            closeHistoryModal();
        }

    });

}


// ============================================================
// LOAD TASK HISTORY
// ============================================================

async function loadTaskHistory(task) {

    if (!task || !task.task_id) {
        return;
    }

    currentHistoryTaskId = task.task_id;


    // --------------------------------------------------------
    // UPDATE HISTORY HEADER
    // --------------------------------------------------------

    if (historyTaskName) {

        historyTaskName.textContent =
            task.task_activity ||
            "Activity history and changes";

    }


    if (historyTaskTitle) {

        historyTaskTitle.textContent =
            task.task_activity || "-";

    }


    if (historyCurrentStatus) {

        historyCurrentStatus.textContent =
            task.status || "-";

    }


    if (historyCurrentPercent) {

        historyCurrentPercent.textContent =
            `${task.percent_complete ?? 0}%`;

    }


    // --------------------------------------------------------
    // SHOW LOADING
    // --------------------------------------------------------

    if (taskHistoryTable) {

        taskHistoryTable.innerHTML = `
            <tr>
                <td colspan="7">
                    Loading history...
                </td>
            </tr>
        `;

    }


    historyModal.classList.add("show");


    // --------------------------------------------------------
    // FETCH HISTORY
    // --------------------------------------------------------

    try {

        const response = await fetch(
            `/api/tasks/${task.task_id}/history`
        );


        const result = await response.json();


        console.log(
            "Task history response:",
            result
        );


        if (!response.ok) {

            throw new Error(
                result.error ||
                "Failed to load task history."
            );

        }


        const history =
            result.history || [];


        // ----------------------------------------------------
        // NO HISTORY
        // ----------------------------------------------------

        if (history.length === 0) {

            if (taskHistoryTable) {

                taskHistoryTable.innerHTML = `
                    <tr>
                        <td colspan="7">
                            No changes have been recorded
                            for this task yet.
                        </td>
                    </tr>
                `;

            }

            return;
        }


        // ----------------------------------------------------
        // DISPLAY HISTORY
        // ----------------------------------------------------

        if (taskHistoryTable) {

            taskHistoryTable.innerHTML = history
                .map((item) => {

                    const changedAt =
                        item.changed_at ||
                        item.created_at ||
                        item.date ||
                        null;


                    const action =
                        item.action ||
                        "Task Updated";


                    const oldStatus =
                        item.old_status ??
                        "-";


                    const newStatus =
                        item.new_status ??
                        "-";


                    const oldPercent =
                        item.old_percent_complete ??
                        0;


                    const newPercent =
                        item.new_percent_complete ??
                        0;


                    const responsiblePerson =
                        item.responsible_person ||
                        item.new_responsible_person ||
                        "-";


                    const remarks =
                        item.remarks ||
                        "-";


                    const changedBy =
                        item.changed_by ||
                        item.changed_by_name ||
                        "-";


                    return `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    formatHistoryDate(changedAt)
                                )}
                            </td>

                            <td>
                                ${escapeHtml(action)}
                            </td>

                            <td>
                                ${escapeHtml(oldStatus)}
                                →
                                ${escapeHtml(newStatus)}
                            </td>

                            <td>
                                ${oldPercent}%
                                →
                                ${newPercent}%
                            </td>

                            <td>
                                ${escapeHtml(
                                    responsiblePerson
                                )}
                            </td>

                            <td>
                                ${escapeHtml(remarks)}
                            </td>

                            <td>
                                ${escapeHtml(changedBy)}
                            </td>

                        </tr>
                    `;

                })
                .join("");

        }


    } catch (error) {

        console.error(
            "Load task history error:",
            error
        );


        if (taskHistoryTable) {

            taskHistoryTable.innerHTML = `
                <tr>
                    <td colspan="7">
                        Failed to load history:
                        ${escapeHtml(error.message)}
                    </td>
                </tr>
            `;

        }

    }

}


// ============================================================
// FORMAT HISTORY DATE
// ============================================================

function formatHistoryDate(dateValue) {

    if (!dateValue) {
        return "-";
    }


    const date =
        new Date(dateValue);


    if (Number.isNaN(date.getTime())) {
        return String(dateValue);
    }


    return date.toLocaleString();
}


// ============================================================
// GET STATUS CSS CLASS
// ============================================================

function getStatusClass(status) {

    switch (status) {

        case "In Progress":
            return "status-active";

        case "Completed":
            return "status-completed";

        case "Not Started":
            return "status-pending";

        case "On Hold":
            return "status-pending";

        default:
            return "status-pending";
    }

}


// ============================================================
// LOAD TASKS
// ============================================================

async function loadTasks() {

    try {

        console.log(
            "Loading tasks for project:",
            projectId
        );


        const response = await fetch(
            `/api/projects/${projectId}/tasks`
        );


        const data = await response.json();


        console.log(
            "Tasks response:",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Failed to load tasks."
            );

        }


        const tasks =
            Array.isArray(data.tasks)
                ? data.tasks
                : [];


        // ====================================================
        // UPDATE STATISTICS
        // ====================================================

        const taskTotal =
            document.getElementById("taskTotal");

        const taskNotStarted =
            document.getElementById("taskNotStarted");

        const taskInProgress =
            document.getElementById("taskInProgress");

        const taskCompleted =
            document.getElementById("taskCompleted");


        if (taskTotal) {

            taskTotal.textContent =
                tasks.length;

        }


        if (taskNotStarted) {

            taskNotStarted.textContent =
                tasks.filter(
                    task =>
                        task.status === "Not Started"
                ).length;

        }


        if (taskInProgress) {

            taskInProgress.textContent =
                tasks.filter(
                    task =>
                        task.status === "In Progress"
                ).length;

        }


        if (taskCompleted) {

            taskCompleted.textContent =
                tasks.filter(
                    task =>
                        task.status === "Completed"
                ).length;

        }


        // ====================================================
        // TASK TABLE
        // ====================================================

        const table =
            document.getElementById("tasksTable");


        if (!table) {

            console.error(
                "tasksTable element was not found."
            );

            return;

        }


        table.innerHTML = "";


        // ====================================================
        // NO TASKS
        // ====================================================

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


        // ====================================================
        // DISPLAY TASKS
        // ====================================================

        tasks.forEach((task) => {

            const row =
                document.createElement("tr");


            const statusClass =
                getStatusClass(task.status);


            row.innerHTML = `

                <!-- TASK -->

                <td>
                    ${escapeHtml(
                        task.task_activity || "-"
                    )}
                </td>


                <!-- PROCEDURE STAGE -->

                <td>
                    ${escapeHtml(
                        task.procedure_stage || "-"
                    )}
                </td>


                <!-- STATUS -->

                <td>

                    <span
                        class="status ${statusClass}">

                        ${escapeHtml(
                            task.status || "-"
                        )}

                    </span>

                </td>


                <!-- PRIORITY -->

                <td>
                    ${escapeHtml(
                        task.priority || "-"
                    )}
                </td>


                <!-- RESPONSIBLE PERSON -->

                <td>
                    ${escapeHtml(
                        task.responsible_person || "-"
                    )}
                </td>


                <!-- DUE DATE -->

                <td>
                    ${escapeHtml(
                        formatDate(task.due_date)
                    )}
                </td>


                <!-- PERCENT COMPLETE -->

                <td>
                    ${task.percent_complete ?? 0}%
                </td>


                <!-- ACTIONS -->

                <td class="task-actions">

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
                        class="btn btn-secondary history-task-btn">
                        History
                    </button>


                    <button
                        type="button"
                        class="btn btn-danger delete-task-btn">
                        Delete
                    </button>

                </td>

            `;


            table.appendChild(row);


            // =================================================
            // REVIEW BUTTON
            // =================================================

            const reviewBtn =
                row.querySelector(
                    ".review-task-btn"
                );


            if (reviewBtn) {

                reviewBtn.addEventListener(
                    "click",
                    () => {
                        openReviewModal(task);
                    }
                );

            }


            // =================================================
            // EDIT BUTTON
            // =================================================

            const editBtn =
                row.querySelector(
                    ".edit-task-btn"
                );


            if (editBtn) {

                editBtn.addEventListener(
                    "click",
                    () => {
                        openEditTaskModal(task);
                    }
                );

            }


            // =================================================
            // HISTORY BUTTON
            // =================================================

            const historyBtn =
                row.querySelector(
                    ".history-task-btn"
                );


            if (historyBtn) {

                historyBtn.addEventListener(
                    "click",
                    () => {
                        loadTaskHistory(task);
                    }
                );

            }


            // =================================================
            // DELETE BUTTON
            // =================================================

            const deleteBtn =
                row.querySelector(
                    ".delete-task-btn"
                );


            if (deleteBtn) {

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

                    }
                );

            }

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

if (taskForm) {

    taskForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            // ==================================================
            // COLLECT FORM DATA
            // ==================================================

            const taskData = {

                procedure_stage:
                    getValue("procedureStage").trim(),

                task_activity:
                    getValue("taskActivity").trim(),

                status:
                    getValue("taskStatus"),

                schedule_status:
                    getValue("scheduleStatus"),

                priority:
                    getValue("taskPriority"),

                responsible_person:
                    getValue("responsiblePerson").trim(),

                role:
                    getValue("taskRole"),

                stakeholder_end_user:
                    getValue("stakeholderEndUser").trim(),

                start_date:
                    getValue("startDate") || null,

                due_date:
                    getValue("dueDate") || null,

                deliverable_expected_output:
                    getValue(
                        "deliverableExpectedOutput"
                    ).trim(),

                evidence_applicability:
                    getValue(
                        "evidenceApplicability"
                    ),

                percent_complete:
                    Number(
                        getValue("percentComplete") || 0
                    )

            };


            console.log(
                "Task data:",
                taskData
            );


            // ==================================================
            // DETERMINE CREATE OR UPDATE
            // ==================================================

            const isEditing =
                editingTaskId !== null;


            let url;
            let method;


            if (isEditing) {

                url =
                    `/api/tasks/${editingTaskId}`;

                method =
                    "PUT";

            } else {

                url =
                    `/api/projects/${projectId}/tasks`;

                method =
                    "POST";

            }


            console.log(
                "Request:",
                method,
                url
            );


            // ==================================================
            // SEND REQUEST
            // ==================================================

            try {

                const response =
                    await fetch(
                        url,
                        {
                            method: method,

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


                console.log(
                    "Server response:",
                    result
                );


                if (!response.ok) {

                    throw new Error(
                        result.error ||
                        (
                            isEditing
                                ? "Failed to update task."
                                : "Failed to create task."
                        )
                    );

                }


                // =================================================
                // SUCCESS
                // =================================================

                alert(
                    isEditing
                        ? "Task updated successfully!"
                        : "Task created successfully!"
                );


                // =================================================
                // CLOSE MODAL
                // =================================================

                closeModal();


                // =================================================
                // REFRESH TASKS
                // =================================================

                await loadTasks();

            } catch (error) {

                console.error(
                    isEditing
                        ? "Update task error:"
                        : "Create task error:",
                    error
                );


                alert(
                    "Error: " +
                    error.message
                );

            }

        }
    );

}


// ============================================================
// SUBMIT REVIEW
// ============================================================

if (reviewForm) {

    reviewForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            // ==================================================
            // CHECK TASK
            // ==================================================

            if (!currentReviewTaskId) {

                alert(
                    "No task selected for review."
                );

                return;
            }


            // ==================================================
            // COLLECT REVIEW DATA
            // ==================================================

            const reviewData = {

                reviewed_verified_by:
                    getValue(
                        "reviewedVerifiedBy"
                    ).trim(),

                review_result:
                    getValue(
                        "reviewResult"
                    ),

                review_date:
                    getValue(
                        "reviewDate"
                    ) || null,

                remarks:
                    getValue(
                        "reviewRemarks"
                    ).trim()

            };


            // ==================================================
            // VALIDATION
            // ==================================================

            if (
                !reviewData.reviewed_verified_by
            ) {

                alert(
                    "Please enter the name of the reviewer."
                );

                return;
            }


            if (
                !reviewData.review_result
            ) {

                alert(
                    "Please select a review result."
                );

                return;
            }


            if (
                !reviewData.review_date
            ) {

                alert(
                    "Please enter the review date."
                );

                return;
            }


            // ==================================================
            // SEND REVIEW
            // ==================================================

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
                                JSON.stringify(
                                    reviewData
                                )
                        }
                    );


                const result =
                    await response.json();


                console.log(
                    "Review response:",
                    result
                );


                if (!response.ok) {

                    throw new Error(
                        result.error ||
                        "Failed to submit review."
                    );

                }


                // =================================================
                // SUCCESS
                // =================================================

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

}


// ============================================================
// INITIAL LOAD
// ============================================================

loadTasks();