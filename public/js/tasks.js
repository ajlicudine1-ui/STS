// ============================================================
// STS - PROJECT TASKS JAVASCRIPT
// ============================================================


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

const taskModal =
    document.getElementById("taskModal");

const newTaskBtn =
    document.getElementById("newTaskBtn");

const closeTaskModal =
    document.getElementById("closeTaskModal");

const cancelTaskBtn =
    document.getElementById("cancelTaskBtn");

const taskForm =
    document.getElementById("taskForm");

const taskModalTitle =
    document.getElementById("taskModalTitle");

const taskModalSubtitle =
    document.getElementById("taskModalSubtitle");

const taskSubmitBtn =
    document.getElementById("taskSubmitBtn");


// ============================================================
// EDITING STATE
// ============================================================

let editingTaskId = null;


// ============================================================
// REVIEW STATE
// ============================================================

let currentReviewTaskId = null;


// ============================================================
// HISTORY STATE
// ============================================================

let currentHistoryTaskId = null;


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

    if (
        value === null ||
        value === undefined
    ) {

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
// HELPER - FORMAT HISTORY DATE
// ============================================================

function formatHistoryDate(dateValue) {

    if (!dateValue) {

        return "-";

    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {

        return String(dateValue);

    }

    return date.toLocaleString();

}


// ============================================================
// HELPER - STATUS CLASS
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
// CLOSE ALL ACTION MENUS
// ============================================================

function closeAllActionMenus() {

    document
        .querySelectorAll(".task-action-menu.show")
        .forEach(menu => {

            menu.classList.remove("show");


            const trigger =
                menu
                    .parentElement
                    ?.querySelector(
                        ".task-action-trigger"
                    );


            if (trigger) {

                trigger.setAttribute(
                    "aria-expanded",
                    "false"
                );

                trigger.classList.remove(
                    "active"
                );

            }

        });

}


// ============================================================
// OPEN NEW TASK MODAL
// ============================================================

if (newTaskBtn) {

    newTaskBtn.addEventListener(
        "click",
        () => {

            editingTaskId = null;


            if (taskForm) {

                taskForm.reset();

            }


            setValue(
                "percentComplete",
                0
            );


            if (taskModalTitle) {

                taskModalTitle.textContent =
                    "New Task";

            }


            if (taskModalSubtitle) {

                taskModalSubtitle.textContent =
                    "Add a task to this project.";

            }


            if (taskSubmitBtn) {

                taskSubmitBtn.textContent =
                    "Create Task";

            }


            if (taskModal) {

                taskModal.classList.add("show");

            }

        }
    );

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


    setValue(
        "percentComplete",
        0
    );


    if (taskModalTitle) {

        taskModalTitle.textContent =
            "New Task";

    }


    if (taskModalSubtitle) {

        taskModalSubtitle.textContent =
            "Add a task to this project.";

    }


    if (taskSubmitBtn) {

        taskSubmitBtn.textContent =
            "Create Task";

    }

}


// ============================================================
// CLOSE TASK MODAL BUTTONS
// ============================================================

if (closeTaskModal) {

    closeTaskModal.addEventListener(
        "click",
        closeModal
    );

}


if (cancelTaskBtn) {

    cancelTaskBtn.addEventListener(
        "click",
        closeModal
    );

}


// ============================================================
// CLOSE TASK MODAL OUTSIDE CLICK
// ============================================================

if (taskModal) {

    taskModal.addEventListener(
        "click",
        event => {

            if (event.target === taskModal) {

                closeModal();

            }

        }
    );

}


// ============================================================
// OPEN EDIT TASK MODAL
// ============================================================

function openEditTaskModal(task) {

    console.log(
        "Opening task for edit:",
        task
    );


    editingTaskId =
        task.task_id;


    // --------------------------------------------------------
    // MODAL HEADER
    // --------------------------------------------------------

    if (taskModalTitle) {

        taskModalTitle.textContent =
            "Edit Task";

    }


    if (taskModalSubtitle) {

        taskModalSubtitle.textContent =
            "Update the information for this task.";

    }


    if (taskSubmitBtn) {

        taskSubmitBtn.textContent =
            "Update Task";

    }


    // --------------------------------------------------------
    // BASIC INFORMATION
    // --------------------------------------------------------
    setValue(
        "procedureStage",
        task.procedure_stage
    );

    setValue(
        "taskActivity",
        task.task_activity
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

    if (taskModal) {

        taskModal.classList.add("show");

    }

}


// ============================================================
// REVIEW MODAL
// ============================================================

const reviewModal =
    document.getElementById(
        "reviewModal"
    );

const closeReviewModalBtn =
    document.getElementById(
        "closeReviewModal"
    );

const cancelReviewBtn =
    document.getElementById(
        "cancelReviewBtn"
    );

const reviewForm =
    document.getElementById(
        "reviewForm"
    );


// ============================================================
// CLOSE REVIEW MODAL
// ============================================================

function closeReviewModal() {

    if (!reviewModal) {

        return;

    }


    reviewModal.classList.remove("show");

    currentReviewTaskId = null;


    if (reviewForm) {

        reviewForm.reset();

    }

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
// REVIEW OUTSIDE CLICK
// ============================================================

if (reviewModal) {

    reviewModal.addEventListener(
        "click",
        event => {

            if (event.target === reviewModal) {

                closeReviewModal();

            }

        }
    );

}


// ============================================================
// OPEN REVIEW MODAL
// ============================================================

function openReviewModal(task) {

    console.log(
        "Opening review:",
        task
    );


    currentReviewTaskId =
        task.task_id;


    // --------------------------------------------------------
    // REVIEW INFORMATION
    // --------------------------------------------------------

    const reviewTaskName =
        document.getElementById(
            "reviewTaskName"
        );


    const reviewResponsiblePerson =
        document.getElementById(
            "reviewResponsiblePerson"
        );


    const reviewStatus =
        document.getElementById(
            "reviewStatus"
        );


    const reviewPercentComplete =
        document.getElementById(
            "reviewPercentComplete"
        );


    const reviewExpectedOutput =
        document.getElementById(
            "reviewExpectedOutput"
        );


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

    if (reviewModal) {

        reviewModal.classList.add("show");

    }

}


// ============================================================
// HISTORY MODAL
// ============================================================

const historyModal =
    document.getElementById(
        "historyModal"
    );

const closeHistoryModalBtn =
    document.getElementById(
        "closeHistoryModal"
    );

const cancelHistoryBtn =
    document.getElementById(
        "cancelHistoryBtn"
    );

const historyTaskName =
    document.getElementById(
        "historyTaskName"
    );

const historyTaskTitle =
    document.getElementById(
        "historyTaskTitle"
    );

const historyCurrentStatus =
    document.getElementById(
        "historyCurrentStatus"
    );

const historyCurrentPercent =
    document.getElementById(
        "historyCurrentPercent"
    );

const historyProgressBar =
    document.getElementById(
        "historyProgressBar"
    );

const historyTransactionCount =
    document.getElementById(
        "historyTransactionCount"
    );

const taskHistoryTable =
    document.getElementById(
        "taskHistoryTable"
    );


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


    if (historyTransactionCount) {

        historyTransactionCount.textContent =
            "0";

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
// HISTORY OUTSIDE CLICK
// ============================================================

if (historyModal) {

    historyModal.addEventListener(
        "click",
        event => {

            if (event.target === historyModal) {

                closeHistoryModal();

            }

        }
    );

}


// ============================================================
// LOAD TASK HISTORY
// ============================================================

async function loadTaskHistory(task) {

    if (!task || !task.task_id) {

        console.error(
            "Cannot load history. Task ID is missing."
        );

        return;

    }


    currentHistoryTaskId =
        task.task_id;


    // --------------------------------------------------------
    // CURRENT TASK INFORMATION
    // --------------------------------------------------------

    const currentPercent =
        Number(
            task.percent_complete ?? 0
        );


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


        historyCurrentStatus.classList.remove(
            "status-active",
            "status-completed",
            "status-pending"
        );


        historyCurrentStatus.classList.add(
            getStatusClass(
                task.status
            )
        );

    }


    if (historyCurrentPercent) {

        historyCurrentPercent.textContent =
            `${currentPercent}%`;

    }


    if (historyProgressBar) {

        historyProgressBar.style.width =
            `${Math.min(
                Math.max(
                    currentPercent,
                    0
                ),
                100
            )}%`;

    }


    if (historyTransactionCount) {

        historyTransactionCount.textContent =
            "0";

    }


    // --------------------------------------------------------
    // LOADING STATE
    // --------------------------------------------------------

    if (taskHistoryTable) {

        taskHistoryTable.innerHTML = `
            <tr>
                <td colspan="7">

                    <div class="history-empty">

                        <div class="history-empty-icon">
                            ↻
                        </div>

                        <strong>
                            Loading history...
                        </strong>

                        <span>
                            Retrieving task activity records.
                        </span>

                    </div>

                </td>
            </tr>
        `;

    }


    // --------------------------------------------------------
    // OPEN MODAL
    // --------------------------------------------------------

    if (historyModal) {

        historyModal.classList.add("show");

    }


    // --------------------------------------------------------
    // FETCH HISTORY
    // --------------------------------------------------------

    try {

        const response =
            await fetch(
                `/api/tasks/${encodeURIComponent(
                    task.task_id
                )}/history`
            );


        const result =
            await response.json();


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
            Array.isArray(result.history)
                ? result.history
                : [];


        // ----------------------------------------------------
        // TRANSACTION COUNT
        // ----------------------------------------------------

        if (historyTransactionCount) {

            historyTransactionCount.textContent =
                history.length;

        }


        // ----------------------------------------------------
        // NO HISTORY
        // ----------------------------------------------------

        if (history.length === 0) {

            if (taskHistoryTable) {

                taskHistoryTable.innerHTML = `
                    <tr>
                        <td colspan="7">

                            <div class="history-empty">

                                <div class="history-empty-icon">
                                    ↻
                                </div>

                                <strong>
                                    No history found
                                </strong>

                                <span>
                                    Changes made to this task will appear here.
                                </span>

                            </div>

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

            taskHistoryTable.innerHTML =
                history
                    .map(item => {

                        // ------------------------------------
                        // DATE / TIME
                        // ------------------------------------

                        const changedAt =
                            item.changed_at ||
                            item.created_at ||
                            item.date ||
                            null;


                        let dateMain = "-";
                        let dateTime = "";


                        if (changedAt) {

                            const dateObject =
                                new Date(
                                    changedAt
                                );


                            if (
                                !Number.isNaN(
                                    dateObject.getTime()
                                )
                            ) {

                                dateMain =
                                    dateObject.toLocaleDateString(
                                        undefined,
                                        {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric"
                                        }
                                    );


                                dateTime =
                                    dateObject.toLocaleTimeString(
                                        undefined,
                                        {
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        }
                                    );

                            } else {

                                dateMain =
                                    String(
                                        changedAt
                                    );

                            }

                        }


                        // ------------------------------------
                        // TASK / ACTIVITY
                        // ------------------------------------

                        const taskActivity =
                            item.task_activity ||
                            item.new_task_activity ||
                            task.task_activity ||
                            "-";


                        // ------------------------------------
                        // ACTION
                        // ------------------------------------

                        const rawAction =
                            item.action ||
                            "Task Updated";


                        const actionLower =
                            String(
                                rawAction
                            ).toLowerCase();


                        let actionClass =
                            "updated";


                        if (
                            actionLower.includes(
                                "creat"
                            )
                        ) {

                            actionClass =
                                "created";

                        } else if (
                            actionLower.includes(
                                "review"
                            )
                        ) {

                            actionClass =
                                "reviewed";

                        } else if (
                            actionLower.includes(
                                "update"
                            )
                        ) {

                            actionClass =
                                "updated";

                        }


                        // ------------------------------------
                        // STATUS
                        // ------------------------------------

                        const oldStatus =
                            item.old_status ?? "-";


                        const newStatus =
                            item.new_status ??
                            item.status ??
                            "-";


                        // ------------------------------------
                        // PROGRESS
                        // ------------------------------------

                        const oldPercent =
                            Number(
                                item.old_percent_complete ??
                                0
                            );


                        const newPercent =
                            Number(
                                item.new_percent_complete ??
                                item.percent_complete ??
                                0
                            );


                        const safeNewPercent =
                            Math.min(
                                Math.max(
                                    newPercent,
                                    0
                                ),
                                100
                            );


                        // ------------------------------------
                        // RESPONSIBLE PERSON
                        // ------------------------------------

                        const responsiblePerson =
                            item.responsible_person ||
                            item.new_responsible_person ||
                            task.responsible_person ||
                            "-";


                        // ------------------------------------
                        // REMARKS
                        // ------------------------------------

                        const remarks =
                            item.remarks ||
                            "Task information updated";


                        // ------------------------------------
                        // RETURN HISTORY ROW
                        // ------------------------------------

                        return `
                            <tr>

                                <!-- DATE / TIME -->
                                <td>

                                    <div class="history-date">

                                        <span class="history-date-main">
                                            ${escapeHtml(
                                                dateMain
                                            )}
                                        </span>

                                        ${
                                            dateTime
                                                ? `
                                                    <span class="history-date-time">
                                                        ${escapeHtml(
                                                            dateTime
                                                        )}
                                                    </span>
                                                `
                                                : ""
                                        }

                                    </div>

                                </td>


                                <!-- TASK / ACTIVITY -->
                                <td>

                                    <div class="history-task-activity">
                                        ${escapeHtml(
                                            taskActivity
                                        )}
                                    </div>

                                </td>


                                <!-- ACTION -->
                                <td>

                                    <span
                                        class="history-action ${actionClass}"
                                    >
                                        ${escapeHtml(
                                            rawAction
                                        )}
                                    </span>

                                </td>


                                <!-- STATUS -->
                                <td>

                                    <div class="history-status-change">

                                        <span
                                            class="status ${getStatusClass(
                                                oldStatus
                                            )}"
                                        >
                                            ${escapeHtml(
                                                oldStatus
                                            )}
                                        </span>

                                        <span class="history-arrow">
                                            →
                                        </span>

                                        <span
                                            class="status ${getStatusClass(
                                                newStatus
                                            )}"
                                        >
                                            ${escapeHtml(
                                                newStatus
                                            )}
                                        </span>

                                    </div>

                                </td>


                                <!-- PROGRESS -->
                                <td>

                                    <div class="history-row-progress">

                                        <span
                                            class="history-row-progress-value"
                                        >
                                            ${escapeHtml(
                                                oldPercent
                                            )}%

                                            →

                                            ${escapeHtml(
                                                newPercent
                                            )}%
                                        </span>


                                        <div
                                            class="history-row-progress-track"
                                        >

                                            <div
                                                class="history-row-progress-fill"
                                                style="width: ${safeNewPercent}%"
                                            ></div>

                                        </div>

                                    </div>

                                </td>


                                <!-- RESPONSIBLE PERSON -->
                                <td>

                                    <span class="history-responsible-person">
                                        ${escapeHtml(
                                            responsiblePerson
                                        )}
                                    </span>

                                </td>


                                <!-- REMARKS -->
                                <td>

                                    <div class="history-remarks">
                                        ${escapeHtml(
                                            remarks
                                        )}
                                    </div>

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

                        <div class="history-empty">

                            <div class="history-empty-icon">
                                !
                            </div>

                            <strong>
                                Failed to load history
                            </strong>

                            <span>
                                ${escapeHtml(
                                    error.message
                                )}
                            </span>

                        </div>

                    </td>

                </tr>
            `;

        }

    }

}


// ============================================================
// DELETE TASK
// ============================================================

async function deleteTask(task) {

    if (!task || !task.task_id) {

        console.error(
            "Cannot delete task. Task ID is missing."
        );

        return;

    }


    const confirmed =
        confirm(
            `Are you sure you want to delete "${task.task_activity || "this task"}"?`
        );


    if (!confirmed) {

        return;

    }


    try {

        const response =
            await fetch(
                `/api/tasks/${encodeURIComponent(
                    task.task_id
                )}`,
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


// ============================================================
// CREATE ACTION MENU
// ============================================================

function createActionMenu(task) {

    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "task-action-wrapper";


    wrapper.innerHTML = `

        <!-- ACTION BUTTON -->

        <button
            type="button"
            class="task-action-trigger"
            aria-label="Task actions"
            aria-expanded="false"
            title="Actions">

            <span class="task-action-label">
                Actions
            </span>

            <span class="task-action-arrow">
                ▾
            </span>

        </button>


        <!-- ACTION MENU -->

        <div class="task-action-menu">


            <!-- REVIEW -->

            <button
                type="button"
                class="task-action-item review-action">

                <span class="task-action-icon">
                    ✓
                </span>

                <span>
                    Review
                </span>

            </button>


            <!-- EDIT -->

            <button
                type="button"
                class="task-action-item edit-action">

                <span class="task-action-icon">
                    ✎
                </span>

                <span>
                    Edit
                </span>

            </button>


            <!-- HISTORY -->

            <button
                type="button"
                class="task-action-item history-action">

                <span class="task-action-icon">
                    ↻
                </span>

                <span>
                    History
                </span>

            </button>


            <!-- DIVIDER -->

            <div class="task-action-divider"></div>


            <!-- DELETE -->

            <button
                type="button"
                class="task-action-item delete-action">

                <span class="task-action-icon">
                    🗑
                </span>

                <span>
                    Delete
                </span>

            </button>

        </div>

    `;


    // ========================================================
    // ELEMENTS
    // ========================================================

    const trigger =
        wrapper.querySelector(
            ".task-action-trigger"
        );


    const menu =
        wrapper.querySelector(
            ".task-action-menu"
        );


    // ========================================================
    // ACTION BUTTON
    // ========================================================

    if (trigger && menu) {

        trigger.addEventListener(
            "click",
            event => {

                event.stopPropagation();


                const wasOpen =
                    menu.classList.contains(
                        "show"
                    );


                // Close all menus first

                closeAllActionMenus();


                // Open this menu

                if (!wasOpen) {

                    menu.classList.add(
                        "show"
                    );


                    trigger.setAttribute(
                        "aria-expanded",
                        "true"
                    );


                    trigger.classList.add(
                        "active"
                    );

                }

            }
        );

    }


    // ========================================================
    // REVIEW
    // ========================================================

    const reviewAction =
        wrapper.querySelector(
            ".review-action"
        );


    if (reviewAction) {

        reviewAction.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                closeAllActionMenus();

                openReviewModal(task);

            }
        );

    }


    // ========================================================
    // EDIT
    // ========================================================

    const editAction =
        wrapper.querySelector(
            ".edit-action"
        );


    if (editAction) {

        editAction.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                closeAllActionMenus();

                openEditTaskModal(task);

            }
        );

    }


    // ========================================================
    // HISTORY
    // ========================================================

    const historyAction =
        wrapper.querySelector(
            ".history-action"
        );


    if (historyAction) {

        historyAction.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                closeAllActionMenus();

                loadTaskHistory(task);

            }
        );

    }


    // ========================================================
    // DELETE
    // ========================================================

    const deleteAction =
        wrapper.querySelector(
            ".delete-action"
        );


    if (deleteAction) {

        deleteAction.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                closeAllActionMenus();

                deleteTask(task);

            }
        );

    }


    return wrapper;

}


// ============================================================
// CLOSE ACTION MENU WHEN CLICKING ANYWHERE ELSE
// ============================================================

document.addEventListener(
    "click",
    () => {

        closeAllActionMenus();

    }
);


// ============================================================
// LOAD TASKS
// ============================================================

async function loadTasks() {

    try {

        console.log(
            "========================================"
        );

        console.log(
            "LOADING TASKS"
        );

        console.log(
            "Project ID:",
            projectId
        );

        console.log(
            "========================================"
        );


        // ----------------------------------------------------
        // CHECK PROJECT ID
        // ----------------------------------------------------

        if (!projectId) {

            console.error(
                "Project ID is missing from URL."
            );


            alert(
                "No project selected."
            );


            window.location.href = "/";

            return;

        }


        // ----------------------------------------------------
        // FETCH TASKS
        // ----------------------------------------------------

        const response =
            await fetch(
                `/api/projects/${encodeURIComponent(
                    projectId
                )}/tasks`
            );


        console.log(
            "Tasks API status:",
            response.status
        );


        const data =
            await response.json();


        console.log(
            "Tasks API response:",
            data
        );


        // ----------------------------------------------------
        // CHECK SERVER RESPONSE
        // ----------------------------------------------------

        if (!response.ok) {

            throw new Error(
                data.error ||
                data.message ||
                "Failed to load tasks."
            );

        }


        // ----------------------------------------------------
        // SUPPORT MULTIPLE RESPONSE FORMATS
        // ----------------------------------------------------

        let tasks = [];


        if (Array.isArray(data)) {

            tasks = data;

        } else if (
            Array.isArray(data.tasks)
        ) {

            tasks = data.tasks;

        } else if (
            Array.isArray(data.data)
        ) {

            tasks = data.data;

        }


        console.log(
            "Project ID used:",
            projectId
        );


        console.log(
            "Number of tasks found:",
            tasks.length
        );


        console.log(
            "Tasks:",
            tasks
        );


        // ----------------------------------------------------
        // UPDATE STATISTICS
        // ----------------------------------------------------

        const taskTotal =
            document.getElementById(
                "taskTotal"
            );


        const taskNotStarted =
            document.getElementById(
                "taskNotStarted"
            );


        const taskInProgress =
            document.getElementById(
                "taskInProgress"
            );


        const taskCompleted =
            document.getElementById(
                "taskCompleted"
            );


        if (taskTotal) {

            taskTotal.textContent =
                tasks.length;

        }


        if (taskNotStarted) {

            taskNotStarted.textContent =
                tasks.filter(
                    task =>
                        task.status ===
                        "Not Started"
                ).length;

        }


        if (taskInProgress) {

            taskInProgress.textContent =
                tasks.filter(
                    task =>
                        task.status ===
                        "In Progress"
                ).length;

        }


        if (taskCompleted) {

            taskCompleted.textContent =
                tasks.filter(
                    task =>
                        task.status ===
                        "Completed"
                ).length;

        }


        // ----------------------------------------------------
        // TASK TABLE
        // ----------------------------------------------------

        const table =
            document.getElementById(
                "tasksTable"
            );


        if (!table) {

            console.error(
                "tasksTable element was not found."
            );

            return;

        }


        table.innerHTML = "";


        // ----------------------------------------------------
        // NO TASKS
        // ----------------------------------------------------

        if (tasks.length === 0) {

            table.innerHTML = `
                <tr>

                    <td colspan="8">
                        No tasks found for this project.
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
                document.createElement(
                    "tr"
                );


            const statusClass =
                getStatusClass(
                    task.status
                );


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
                        class="status ${statusClass}"
                    >
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
                        formatDate(
                            task.due_date
                        )
                    )}
                </td>


                <!-- PERCENT COMPLETE -->

                <td>
                    ${escapeHtml(
                        task.percent_complete ?? 0
                    )}%
                </td>


                <!-- ACTIONS -->

                <td class="task-actions"></td>

            `;


            // ------------------------------------------------
            // ADD ACTION MENU
            // ------------------------------------------------

            const actionsCell =
                row.querySelector(
                    ".task-actions"
                );


            if (actionsCell) {

                const actionMenu =
                    createActionMenu(
                        task
                    );


                actionsCell.appendChild(
                    actionMenu
                );

            }


            table.appendChild(
                row
            );

        });

    } catch (error) {

        console.error(
            "========================================"
        );


        console.error(
            "LOAD TASKS ERROR:",
            error
        );


        console.error(
            "Project ID:",
            projectId
        );


        console.error(
            "========================================"
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
        async event => {

            event.preventDefault();


            // ------------------------------------------------
            // COLLECT FORM DATA
            // ------------------------------------------------

            const taskData = {

                procedure_stage:
                    getValue(
                        "procedureStage"
                    ).trim(),


                task_activity:
                    getValue(
                        "taskActivity"
                    ).trim(),


                status:
                    getValue(
                        "taskStatus"
                    ),


                schedule_status:
                    getValue(
                        "scheduleStatus"
                    ),


                priority:
                    getValue(
                        "taskPriority"
                    ),


                responsible_person:
                    getValue(
                        "responsiblePerson"
                    ).trim(),


                role:
                    getValue(
                        "taskRole"
                    ),


                stakeholder_end_user:
                    getValue(
                        "stakeholderEndUser"
                    ).trim(),


                start_date:
                    getValue(
                        "startDate"
                    ) || null,


                due_date:
                    getValue(
                        "dueDate"
                    ) || null,


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
                        getValue(
                            "percentComplete"
                        ) || 0
                    )

            };


            console.log(
                "Task data:",
                taskData
            );


            // ------------------------------------------------
            // DETERMINE CREATE OR UPDATE
            // ------------------------------------------------

            const isEditing =
                editingTaskId !== null;


            let url;
            let method;


            if (isEditing) {

                url =
                    `/api/tasks/${encodeURIComponent(
                        editingTaskId
                    )}`;


                method =
                    "PUT";

            } else {

                url =
                    `/api/projects/${encodeURIComponent(
                        projectId
                    )}/tasks`;


                method =
                    "POST";

            }


            console.log(
                "Request:",
                method,
                url
            );


            // ------------------------------------------------
            // SEND REQUEST
            // ------------------------------------------------

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
                                JSON.stringify(
                                    taskData
                                )
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


                // ------------------------------------------------
                // SUCCESS
                // ------------------------------------------------

                alert(
                    isEditing
                        ? "Task updated successfully!"
                        : "Task created successfully!"
                );


                // ------------------------------------------------
                // CLOSE MODAL
                // ------------------------------------------------

                closeModal();


                // ------------------------------------------------
                // REFRESH TASKS
                // ------------------------------------------------

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
        async event => {

            event.preventDefault();


            // ------------------------------------------------
            // CHECK TASK
            // ------------------------------------------------

            if (!currentReviewTaskId) {

                alert(
                    "No task selected for review."
                );

                return;

            }


            // ------------------------------------------------
            // COLLECT REVIEW DATA
            // ------------------------------------------------

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


            // ------------------------------------------------
            // VALIDATION
            // ------------------------------------------------

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


            // ------------------------------------------------
            // SEND REVIEW
            // ------------------------------------------------

            try {

                const response =
                    await fetch(
                        `/api/tasks/${encodeURIComponent(
                            currentReviewTaskId
                        )}/review`,
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


                // ------------------------------------------------
                // SUCCESS
                // ------------------------------------------------

                alert(
                    "Task review submitted successfully!"
                );


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

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadTasks();

    }
);