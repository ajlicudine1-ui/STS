const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// ENVIRONMENT CHECK
// ============================================================

console.log("==============================================");
console.log("STS SERVER STARTING");
console.log("==============================================");

console.log(
    "SUPABASE_URL:",
    process.env.SUPABASE_URL
);

console.log(
    "SUPABASE_KEY loaded:",
    !!process.env.SUPABASE_KEY
);

if (!process.env.SUPABASE_URL) {
    console.error(
        "ERROR: SUPABASE_URL is missing from .env"
    );
}

if (!process.env.SUPABASE_KEY) {
    console.error(
        "ERROR: SUPABASE_KEY is missing from .env"
    );
}

// ============================================================
// SUPABASE CONNECTION
// ============================================================

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

// ============================================================
// TASK HISTORY HELPER
// ============================================================
// IMPORTANT:
// This function ONLY inserts a history record.
// Do NOT call createTaskHistory() from inside itself.
// ============================================================

async function createTaskHistory({
    taskId,
    projectId,
    action,
    oldStatus = null,
    newStatus = null,
    oldPercentComplete = null,
    newPercentComplete = null,
    oldResponsiblePerson = null,
    newResponsiblePerson = null,
    remarks = null,
    changedBy = "System"
}) {
    try {
        const historyData = {
            task_id: taskId,
            project_id: projectId,
            action: action,
            old_status: oldStatus,
            new_status: newStatus,
            old_percent_complete: oldPercentComplete,
            new_percent_complete: newPercentComplete,
            old_responsible_person: oldResponsiblePerson,
            new_responsible_person: newResponsiblePerson,
            remarks: remarks,
            changed_by: changedBy
        };

        const {
            data,
            error
        } = await supabase
            .from("task_history")
            .insert([historyData])
            .select()
            .single();

        if (error) {
            console.error(
                "TASK HISTORY ERROR:",
                error
            );

            return {
                success: false,
                error: error
            };
        }

        console.log(
            "Task history recorded:",
            data
        );

        return {
            success: true,
            data: data
        };

    } catch (error) {
        console.error(
            "Create task history error:",
            error
        );

        return {
            success: false,
            error: error
        };
    }
}

// ============================================================
// HOME PAGE
// ============================================================

app.get("/", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );
});

// ============================================================
// TEST SUPABASE CONNECTION
// ============================================================

app.get("/api/test", async (req, res) => {
    try {

        const {
            data,
            error
        } = await supabase
            .from("projects")
            .select("*")
            .limit(10);

        if (error) {
            console.error(
                "Supabase test error:",
                error
            );

            return res.status(500).json({
                success: false,
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
        }

        res.json({
            success: true,
            message:
                "Supabase connection successful",
            projects: data
        });

    } catch (error) {

        console.error(
            "Supabase connection error:",
            error
        );

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================
// DASHBOARD DATA
// ============================================================

app.get("/api/dashboard", async (req, res) => {

    try {

        // ----------------------------------------------------
        // GET PROJECTS
        // ----------------------------------------------------

        const {
            data: projects,
            error: projectsError
        } = await supabase
            .from("projects")
            .select("*")
            .order("created_at", {
                ascending: false
            });

        if (projectsError) {
            throw projectsError;
        }

        // ----------------------------------------------------
        // COUNT TASKS
        // ----------------------------------------------------

        const {
            count: totalTasks,
            error: tasksError
        } = await supabase
            .from("tasks")
            .select("*", {
                count: "exact",
                head: true
            });

        if (tasksError) {
            throw tasksError;
        }

        // ----------------------------------------------------
        // PROJECT STATISTICS
        // ----------------------------------------------------

        const totalProjects =
            projects.length;

        const activeProjects =
            projects.filter(
                project =>
                    project.project_status ===
                    "Active"
            ).length;

        const completedProjects =
            projects.filter(
                project =>
                    project.project_status ===
                    "Completed"
            ).length;

        // ----------------------------------------------------
        // RETURN DASHBOARD
        // ----------------------------------------------------

        res.json({
            success: true,
            totalProjects,
            activeProjects,
            completedProjects,
            totalTasks: totalTasks || 0,
            projects
        });

    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        });
    }
});

// ============================================================
// CREATE PROJECT
// ============================================================

app.post("/api/projects", async (req, res) => {

    try {

        console.log(
            "Create Project request received:"
        );

        console.log(
            "Request body:",
            req.body
        );

        const {
            project_name,
            project_folder_link,
            project_owner,
            project_status,
            date_opened,
            date_closed
        } = req.body;

        // ----------------------------------------------------
        // VALIDATE PROJECT NAME
        // ----------------------------------------------------

        if (
            !project_name ||
            !project_name.trim()
        ) {

            return res.status(400).json({
                success: false,
                error:
                    "Project name is required."
            });
        }

        // ----------------------------------------------------
        // PREPARE PROJECT DATA
        // ----------------------------------------------------

        const projectData = {

            project_name:
                project_name.trim(),

            project_folder_link:
                project_folder_link
                    ? project_folder_link.trim()
                    : null,

            project_owner:
                project_owner
                    ? project_owner.trim()
                    : null,

            project_status:
                project_status ||
                "Not Started",

            date_opened:
                date_opened || null,

            date_closed:
                date_closed || null
        };

        console.log(
            "Inserting project:",
            projectData
        );

        // ----------------------------------------------------
        // INSERT PROJECT
        // ----------------------------------------------------

        const {
            data,
            error
        } = await supabase
            .from("projects")
            .insert([projectData])
            .select()
            .single();

        if (error) {

            console.error(
                "SUPABASE INSERT ERROR"
            );

            console.error(
                "Message:",
                error.message
            );

            console.error(
                "Code:",
                error.code
            );

            console.error(
                "Details:",
                error.details
            );

            console.error(
                "Hint:",
                error.hint
            );

            return res.status(500).json({
                success: false,
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
        }

        // ----------------------------------------------------
        // SUCCESS
        // ----------------------------------------------------

        console.log(
            "Project created successfully:"
        );

        console.log(data);

        res.status(201).json({
            success: true,
            message:
                "Project created successfully.",
            project: data
        });

    } catch (error) {

        console.error(
            "Create project error:",
            error
        );

        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        });
    }
});

// ============================================================
// GET TASKS FOR A PROJECT
// ============================================================

app.get(
    "/api/projects/:projectId/tasks",
    async (req, res) => {

        try {

            const { projectId } =
                req.params;

            console.log(
                "=============================================="
            );

            console.log(
                "GET PROJECT TASKS"
            );

            console.log(
                "Project ID:",
                projectId
            );

            console.log(
                "=============================================="
            );

            const {
                data,
                error
            } = await supabase
                .from("tasks")
                .select("*")
                .eq(
                    "project_id",
                    projectId
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );

            if (error) {

                console.error(
                    "Get tasks error:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    error: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint
                });
            }

            res.json({
                success: true,
                tasks: data || []
            });

        } catch (error) {

            console.error(
                "Get tasks server error:",
                error
            );

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// ============================================================
// GET TASK HISTORY
// ============================================================

app.get(
    "/api/tasks/:taskId/history",
    async (req, res) => {

        try {

            const { taskId } =
                req.params;

            console.log(
                "Getting history for task:",
                taskId
            );

            const {
                data,
                error
            } = await supabase
                .from("task_history")
                .select("*")
                .eq(
                    "task_id",
                    taskId
                )
                .order(
                    "changed_at",
                    {
                        ascending: false
                    }
                );

            if (error) {

                console.error(
                    "GET TASK HISTORY ERROR:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    error: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint
                });
            }

            res.json({
                success: true,
                history: data || []
            });

        } catch (error) {

            console.error(
                "Get task history error:",
                error
            );

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// ============================================================
// CREATE TASK
// ============================================================

app.post(
    "/api/projects/:projectId/tasks",
    async (req, res) => {

        try {

            const { projectId } =
                req.params;

            console.log(
                "=============================================="
            );

            console.log(
                "CREATE TASK"
            );

            console.log(
                "Project ID:",
                projectId
            );

            console.log(
                "Request body:",
                req.body
            );

            console.log(
                "=============================================="
            );

            const {
                procedure_stage,
                task_activity,
                status,
                schedule_status,
                priority,
                responsible_person,
                role,
                stakeholder_end_user,
                start_date,
                due_date,
                completion_date,
                deliverable_expected_output,
                evidence_applicability,
                percent_complete
            } = req.body;

            // ----------------------------------------------------
            // VALIDATE TASK
            // ----------------------------------------------------

            if (
                !task_activity ||
                !task_activity.trim()
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Task / Activity is required."
                });
            }

            // ----------------------------------------------------
            // PREPARE TASK DATA
            // ----------------------------------------------------

            const taskData = {

                project_id:
                    projectId,

                procedure_stage:
                    procedure_stage || null,

                task_activity:
                    task_activity.trim(),

                status:
                    status ||
                    "Not Started",

                schedule_status:
                    schedule_status || null,

                priority:
                    priority || null,

                responsible_person:
                    responsible_person
                        ? responsible_person.trim()
                        : null,

                role:
                    role || null,

                stakeholder_end_user:
                    stakeholder_end_user
                        ? stakeholder_end_user.trim()
                        : null,

                start_date:
                    start_date || null,

                due_date:
                    due_date || null,

                completion_date:
                    completion_date || null,

                deliverable_expected_output:
                    deliverable_expected_output
                        ? deliverable_expected_output.trim()
                        : null,

                evidence_applicability:
                    evidence_applicability || null,

                percent_complete:
                    percent_complete !== undefined &&
                    percent_complete !== ""
                        ? Number(percent_complete)
                        : 0
            };

            console.log(
                "Inserting task:",
                taskData
            );

            // ----------------------------------------------------
            // INSERT TASK
            // ----------------------------------------------------

            const {
                data,
                error
            } = await supabase
                .from("tasks")
                .insert([taskData])
                .select()
                .single();

            if (error) {

                console.error(
                    "SUPABASE TASK INSERT ERROR"
                );

                console.error(
                    "Message:",
                    error.message
                );

                console.error(
                    "Code:",
                    error.code
                );

                console.error(
                    "Details:",
                    error.details
                );

                console.error(
                    "Hint:",
                    error.hint
                );

                return res.status(500).json({
                    success: false,
                    error: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint
                });
            }

            // ----------------------------------------------------
            // RECORD CREATION IN HISTORY
            // ----------------------------------------------------

            const historyResult =
                await createTaskHistory({

                    taskId:
                        data.task_id,

                    projectId:
                        data.project_id,

                    action:
                        "Created",

                    oldStatus:
                        null,

                    newStatus:
                        data.status,

                    oldPercentComplete:
                        null,

                    newPercentComplete:
                        data.percent_complete,

                    oldResponsiblePerson:
                        null,

                    newResponsiblePerson:
                        data.responsible_person,

                    remarks:
                        "Task created",

                    changedBy:
                        data.responsible_person ||
                        "System"
                });

            if (!historyResult.success) {

                console.error(
                    "WARNING: Task created but history was not recorded."
                );
            }

            // ----------------------------------------------------
            // SUCCESS
            // ----------------------------------------------------

            console.log(
                "Task created successfully:"
            );

            console.log(data);

            res.status(201).json({

                success: true,

                message:
                    "Task created successfully.",

                task:
                    data,

                historyRecorded:
                    historyResult.success
            });

        } catch (error) {

            console.error(
                "Create task error:",
                error
            );

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// ============================================================
// UPDATE TASK
// ============================================================

app.put(
    "/api/tasks/:taskId",
    async (req, res) => {

        try {

            const { taskId } =
                req.params;

            console.log(
                "=============================================="
            );

            console.log(
                "UPDATE TASK"
            );

            console.log(
                "Task ID:",
                taskId
            );

            console.log(
                "Request body:",
                req.body
            );

            console.log(
                "=============================================="
            );

            // ----------------------------------------------------
            // GET CURRENT TASK FIRST
            // ----------------------------------------------------

            const {
                data: oldTask,
                error: oldTaskError
            } = await supabase
                .from("tasks")
                .select("*")
                .eq(
                    "task_id",
                    taskId
                )
                .single();

            if (oldTaskError) {

                console.error(
                    "GET OLD TASK ERROR:",
                    oldTaskError
                );

                return res.status(404).json({
                    success: false,
                    error:
                        "Task not found."
                });
            }

            // ----------------------------------------------------
            // GET REQUEST DATA
            // ----------------------------------------------------

            const {
                procedure_stage,
                task_activity,
                status,
                schedule_status,
                priority,
                responsible_person,
                role,
                stakeholder_end_user,
                start_date,
                due_date,
                completion_date,
                deliverable_expected_output,
                evidence_applicability,
                percent_complete
            } = req.body;

            // ----------------------------------------------------
            // VALIDATE TASK
            // ----------------------------------------------------

            if (
                !task_activity ||
                !task_activity.trim()
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Task / Activity is required."
                });
            }

            // ----------------------------------------------------
            // PREPARE NEW TASK DATA
            // ----------------------------------------------------

            const taskData = {

                procedure_stage:
                    procedure_stage || null,

                task_activity:
                    task_activity.trim(),

                status:
                    status ||
                    "Not Started",

                schedule_status:
                    schedule_status || null,

                priority:
                    priority || null,

                responsible_person:
                    responsible_person
                        ? responsible_person.trim()
                        : null,

                role:
                    role || null,

                stakeholder_end_user:
                    stakeholder_end_user
                        ? stakeholder_end_user.trim()
                        : null,

                start_date:
                    start_date || null,

                due_date:
                    due_date || null,

                completion_date:
                    completion_date || null,

                deliverable_expected_output:
                    deliverable_expected_output
                        ? deliverable_expected_output.trim()
                        : null,

                evidence_applicability:
                    evidence_applicability || null,

                percent_complete:
                    percent_complete !== undefined &&
                    percent_complete !== ""
                        ? Number(percent_complete)
                        : 0
            };

            // ----------------------------------------------------
            // UPDATE TASK
            // ----------------------------------------------------

            const {
                data,
                error
            } = await supabase
                .from("tasks")
                .update(taskData)
                .eq(
                    "task_id",
                    taskId
                )
                .select()
                .single();

            if (error) {

                console.error(
                    "SUPABASE TASK UPDATE ERROR:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    error: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint
                });
            }

            // ----------------------------------------------------
            // DETERMINE WHAT CHANGED
            // ----------------------------------------------------

            const statusChanged =
                oldTask.status !== data.status;

            const percentChanged =
                Number(
                    oldTask.percent_complete || 0
                ) !==
                Number(
                    data.percent_complete || 0
                );

            const responsibleChanged =
                (oldTask.responsible_person || null) !==
                (data.responsible_person || null);

            // ----------------------------------------------------
            // ONLY RECORD HISTORY IF TRACKED VALUES CHANGED
            // ----------------------------------------------------

            if (
                statusChanged ||
                percentChanged ||
                responsibleChanged
            ) {

                let action = "Updated";

                if (
                    statusChanged &&
                    percentChanged
                ) {
                    action =
                        "Status and Progress Updated";

                } else if (statusChanged) {

                    action =
                        "Status Updated";

                } else if (percentChanged) {

                    action =
                        "Progress Updated";

                } else if (responsibleChanged) {

                    action =
                        "Responsible Person Updated";
                }

                const historyResult =
                    await createTaskHistory({

                        taskId:
                            data.task_id,

                        projectId:
                            data.project_id,

                        action:
                            action,

                        oldStatus:
                            oldTask.status,

                        newStatus:
                            data.status,

                        oldPercentComplete:
                            oldTask.percent_complete,

                        newPercentComplete:
                            data.percent_complete,

                        oldResponsiblePerson:
                            oldTask.responsible_person,

                        newResponsiblePerson:
                            data.responsible_person,

                        remarks:
                            "Task information updated",

                        changedBy:
                            data.responsible_person ||
                            "System"
                    });

                if (!historyResult.success) {

                    console.error(
                        "WARNING: Task updated but history was not recorded."
                    );
                }
            }

            // ----------------------------------------------------
            // SUCCESS
            // ----------------------------------------------------

            res.json({

                success: true,

                message:
                    "Task updated successfully.",

                task:
                    data
            });

        } catch (error) {

            console.error(
                "Update task error:",
                error
            );

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// ============================================================
// REVIEW TASK
// ============================================================

app.put(
    "/api/tasks/:taskId/review",
    async (req, res) => {

        try {

            const { taskId } =
                req.params;

            console.log(
                "=============================================="
            );

            console.log(
                "REVIEW TASK"
            );

            console.log(
                "Task ID:",
                taskId
            );

            console.log(
                "Review data:",
                req.body
            );

            console.log(
                "=============================================="
            );

            // ----------------------------------------------------
            // GET CURRENT TASK
            // ----------------------------------------------------

            const {
                data: oldTask,
                error: oldTaskError
            } = await supabase
                .from("tasks")
                .select("*")
                .eq(
                    "task_id",
                    taskId
                )
                .single();

            if (oldTaskError) {

                console.error(
                    "GET TASK FOR REVIEW ERROR:",
                    oldTaskError
                );

                return res.status(404).json({
                    success: false,
                    error:
                        "Task not found."
                });
            }

            // ----------------------------------------------------
            // REVIEW DATA
            // ----------------------------------------------------

            const {
                reviewed_verified_by,
                review_result,
                review_date,
                remarks
            } = req.body;

            // ----------------------------------------------------
            // VALIDATE REVIEWER
            // ----------------------------------------------------

            if (
                !reviewed_verified_by ||
                !reviewed_verified_by.trim()
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Reviewed / Verified By is required."
                });
            }

            // ----------------------------------------------------
            // VALIDATE REVIEW RESULT
            // ----------------------------------------------------

            const validResults = [
                "Approved",
                "For Revision",
                "Rejected"
            ];

            if (
                !review_result ||
                !validResults.includes(
                    review_result
                )
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "A valid review result is required."
                });
            }

            // ----------------------------------------------------
            // VALIDATE REVIEW DATE
            // ----------------------------------------------------

            if (!review_date) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Review date is required."
                });
            }

            // ----------------------------------------------------
            // PREPARE REVIEW DATA
            // ----------------------------------------------------

            const reviewData = {

                reviewed_verified_by:
                    reviewed_verified_by.trim(),

                review_result:
                    review_result,

                review_date:
                    review_date,

                remarks:
                    remarks
                        ? remarks.trim()
                        : null
            };

            console.log(
                "Saving review:",
                reviewData
            );

            // ----------------------------------------------------
            // UPDATE REVIEW
            // ----------------------------------------------------

            const {
                data,
                error
            } = await supabase
                .from("tasks")
                .update(reviewData)
                .eq(
                    "task_id",
                    taskId
                )
                .select()
                .single();

            if (error) {

                console.error(
                    "SUPABASE TASK REVIEW ERROR"
                );

                console.error(
                    "Message:",
                    error.message
                );

                console.error(
                    "Code:",
                    error.code
                );

                console.error(
                    "Details:",
                    error.details
                );

                console.error(
                    "Hint:",
                    error.hint
                );

                return res.status(500).json({
                    success: false,
                    error: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint
                });
            }

            // ----------------------------------------------------
            // RECORD REVIEW IN HISTORY
            // ----------------------------------------------------

            const historyResult =
                await createTaskHistory({

                    taskId:
                        data.task_id,

                    projectId:
                        data.project_id,

                    action:
                        "Reviewed",

                    oldStatus:
                        oldTask.status,

                    newStatus:
                        data.status,

                    oldPercentComplete:
                        oldTask.percent_complete,

                    newPercentComplete:
                        data.percent_complete,

                    oldResponsiblePerson:
                        oldTask.responsible_person,

                    newResponsiblePerson:
                        data.responsible_person,

                    remarks:
                        `Review: ${review_result}` +
                        (
                            remarks
                                ? ` - ${remarks.trim()}`
                                : ""
                        ),

                    changedBy:
                        reviewed_verified_by.trim()
                });

            if (!historyResult.success) {

                console.error(
                    "WARNING: Review saved but history was not recorded."
                );
            }

            // ----------------------------------------------------
            // SUCCESS
            // ----------------------------------------------------

            console.log(
                "Task review saved successfully:"
            );

            console.log(data);

            res.json({

                success: true,

                message:
                    "Task review submitted successfully.",

                task:
                    data,

                historyRecorded:
                    historyResult.success
            });

        } catch (error) {

            console.error(
                "Review task error:",
                error
            );

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// ============================================================
// DELETE TASK
// ============================================================

app.delete(
    "/api/tasks/:taskId",
    async (req, res) => {

        try {

            const { taskId } =
                req.params;

            console.log(
                "Deleting task:",
                taskId
            );

            // ----------------------------------------------------
            // DELETE TASK
            // ----------------------------------------------------

            const {
                error
            } = await supabase
                .from("tasks")
                .delete()
                .eq(
                    "task_id",
                    taskId
                );

            if (error) {

                console.error(
                    "SUPABASE TASK DELETE ERROR:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    error: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint
                });
            }

            res.json({

                success: true,

                message:
                    "Task deleted successfully."
            });

        } catch (error) {

            console.error(
                "Delete task error:",
                error
            );

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// ============================================================
// START SERVER
// ============================================================

// Only listen when running locally.
// Vercel will use module.exports instead.

if (require.main === module) {

    app.listen(PORT, () => {

        console.log(
            "=============================================="
        );

        console.log(
            `STS server running on port ${PORT}`
        );

        console.log(
            "=============================================="
        );
    });
}

// ============================================================
// EXPORT FOR VERCEL
// ============================================================

module.exports = app;