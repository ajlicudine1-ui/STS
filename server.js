const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { google } = require("googleapis");

require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;

// ============================================================
// ENVIRONMENT CHECK
// ============================================================

console.log("==============================================");
console.log("PTS SERVER STARTING");
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


console.log(
    "GOOGLE_DRIVE_PARENT_FOLDER_ID loaded:",
    !!process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID
);

console.log(
    "GOOGLE_CLIENT_ID loaded:",
    !!process.env.GOOGLE_CLIENT_ID
);

console.log(
    "GOOGLE_CLIENT_SECRET loaded:",
    !!process.env.GOOGLE_CLIENT_SECRET
);

console.log(
    "GOOGLE_REFRESH_TOKEN loaded:",
    !!process.env.GOOGLE_REFRESH_TOKEN
);

if (!process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID) {
    console.error(
        "ERROR: GOOGLE_DRIVE_PARENT_FOLDER_ID is missing from .env"
    );
}

if (!process.env.GOOGLE_CLIENT_ID) {
    console.error(
        "ERROR: GOOGLE_CLIENT_ID is missing from .env"
    );
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
    console.error(
        "ERROR: GOOGLE_CLIENT_SECRET is missing from .env"
    );
}

if (!process.env.GOOGLE_REFRESH_TOKEN) {
    console.error(
        "ERROR: GOOGLE_REFRESH_TOKEN is missing from .env"
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
// GOOGLE DRIVE CONNECTION
// Uses OAuth refresh-token authentication.
// ============================================================

const googleOAuth2Client =
    new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );

if (process.env.GOOGLE_REFRESH_TOKEN) {
    googleOAuth2Client.setCredentials({
        refresh_token:
            process.env.GOOGLE_REFRESH_TOKEN
    });
}

const googleDrive =
    google.drive({
        version: "v3",
        auth: googleOAuth2Client
    });


// ============================================================
// GOOGLE DRIVE HELPERS
// ============================================================

function cleanDriveFolderName(value) {

    return String(value || "")
        .replace(/[\r\n\t]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


function getDriveFolderUrl(folderId) {

    if (!folderId) {
        return null;
    }

    return `https://drive.google.com/drive/folders/${folderId}`;
}


async function createDriveFolder({
    name,
    parentFolderId
}) {

    if (!parentFolderId) {
        throw new Error(
            "Google Drive parent folder ID is missing."
        );
    }

    const folderName =
        cleanDriveFolderName(name);

    if (!folderName) {
        throw new Error(
            "Google Drive folder name is required."
        );
    }

    const response =
        await googleDrive.files.create({
            requestBody: {
                name: folderName,
                mimeType:
                    "application/vnd.google-apps.folder",
                parents: [
                    parentFolderId
                ]
            },
            fields:
                "id, name, webViewLink"
        });

    const folder =
        response.data;

    if (!folder?.id) {
        throw new Error(
            "Google Drive did not return a folder ID."
        );
    }

    return {
        id:
            folder.id,

        name:
            folder.name || folderName,

        url:
            folder.webViewLink ||
            getDriveFolderUrl(
                folder.id
            )
    };
}


async function deleteDriveFolder(folderId) {

    if (!folderId) {
        return;
    }

    try {

        await googleDrive.files.delete({
            fileId:
                folderId
        });

    } catch (error) {

        console.error(
            "GOOGLE DRIVE ROLLBACK DELETE FAILED:",
            error.message
        );
    }
}

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

        console.log("==============================================");
        console.log("CREATING TASK HISTORY");
        console.log("Task ID:", taskId);
        console.log("Project ID:", projectId);
        console.log("Action:", action);
        console.log("==============================================");

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

        console.log(
            "History data:",
            historyData
        );

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
                "=============================================="
            );

            console.error(
                "TASK HISTORY INSERT FAILED"
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

            console.error(
                "=============================================="
            );

            return {
                success: false,
                error: error
            };
        }

        console.log(
            "TASK HISTORY RECORDED SUCCESSFULLY:",
            data
        );

        return {
            success: true,
            data: data
        };

    } catch (error) {

        console.error(
            "CREATE TASK HISTORY ERROR:",
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

        // Attach development-team members to every project for the dashboard table.
        const projectIds = projects.map(project => project.project_id);
        let members = [];

        if (projectIds.length > 0) {
            const { data: memberRows, error: membersError } = await supabase
                .from("project_members")
                .select("project_id, member_name, member_role")
                .in("project_id", projectIds)
                .order("created_at", { ascending: true });

            if (membersError) {
                throw membersError;
            }

            members = memberRows || [];
        }

        const projectsWithMembers = projects.map(project => ({
            ...project,
            development_team: members.filter(
                member => member.project_id === project.project_id
            )
        }));

        res.json({
            success: true,
            totalProjects,
            activeProjects,
            completedProjects,
            totalTasks: totalTasks || 0,
            projects: projectsWithMembers
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
            JSON.stringify(req.body, null, 2)
        );

        const {
            project_name,
            project_url,
            project_owner,
            version,
            project_status,
            date_opened,
            date_closed,
            development_team = []
        } = req.body;


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


        const projectData = {

            project_name:
                project_name.trim(),

            project_url:
                project_url
                    ? project_url.trim()
                    : null,

            project_owner:
                project_owner
                    ? project_owner.trim()
                    : null,

            version:
                version
                    ? String(version).trim()
                    : null,

            project_status:
                project_status ||
                "Not Started",

            date_opened:
                date_opened || null,

            date_closed:
                date_closed || null

        };


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
                "SUPABASE INSERT ERROR:",
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
        // CREATE GOOGLE DRIVE PROJECT FOLDER
        // ----------------------------------------------------

        let projectRecord =
            data;

        let projectDriveFolder =
            null;

        try {

            projectDriveFolder =
                await createDriveFolder({
                    name:
                        `${data.project_id} - ${project_name.trim()}`,

                    parentFolderId:
                        process.env
                            .GOOGLE_DRIVE_PARENT_FOLDER_ID
                });


            const {
                data: updatedProject,
                error: driveUpdateError
            } = await supabase
                .from("projects")
                .update({
                    drive_folder_id:
                        projectDriveFolder.id,

                    drive_folder_url:
                        projectDriveFolder.url
                })
                .eq(
                    "project_id",
                    data.project_id
                )
                .select()
                .single();


            if (driveUpdateError) {
                throw driveUpdateError;
            }


            projectRecord =
                updatedProject;

        } catch (driveError) {

            console.error(
                "PROJECT DRIVE FOLDER CREATION FAILED:",
                driveError
            );


            if (projectDriveFolder?.id) {

                await deleteDriveFolder(
                    projectDriveFolder.id
                );
            }


            await supabase
                .from("projects")
                .delete()
                .eq(
                    "project_id",
                    data.project_id
                );


            return res.status(500).json({
                success: false,

                error:
                    "Project could not be created because its Google Drive folder could not be created.",

                details:
                    driveError.message
            });
        }


        // Save manually entered development team members.
        // These are stored directly in project_members and do not need
        // to already exist in the users table.
        const teamMembers = Array.isArray(development_team)
            ? development_team
                .map(member => ({
                    project_id: projectRecord.project_id,
                    member_name: String(member?.name || member?.member_name || "").trim(),
                    member_role: String(member?.role || member?.member_role || "").trim() || null
                }))
                .filter(member => member.member_name)
            : [];

        if (teamMembers.length > 0) {
            const { error: membersError } = await supabase
                .from("project_members")
                .insert(teamMembers);

            if (membersError) {
                console.error("PROJECT CREATED BUT TEAM SAVE FAILED:", membersError);

                // Roll back both Drive and database records.
                await deleteDriveFolder(
                    projectDriveFolder?.id
                );

                await supabase
                    .from("projects")
                    .delete()
                    .eq("project_id", projectRecord.project_id);

                return res.status(500).json({
                    success: false,
                    error: "Project could not be created because the development team could not be saved.",
                    details: membersError.message
                });
            }
        }

        console.log(
            "Project created successfully:",
            projectRecord
        );


        res.status(201).json({

            success: true,

            message:
                "Project created successfully.",

            project:
                projectRecord

        });

    } catch (error) {

        console.error(
            "Create project error:",
            error
        );

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});

// ============================================================
// GET NEXT PROJECT ID
// Preview only - the database sequence still generates the real ID
// ============================================================

app.get("/api/projects-next-id", async (req, res) => {

    try {

        const { data, error } = await supabase
            .from("projects")
            .select("project_id");

        if (error) {

            console.error(
                "Get next project ID error:",
                error
            );

            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        let highestNumber = 0;

        (data || []).forEach(project => {

            const match = String(
                project.project_id || ""
            ).match(/^IDM-(\d+)$/);

            if (!match) {
                return;
            }

            const number =
                Number.parseInt(
                    match[1],
                    10
                );

            if (
                Number.isFinite(number) &&
                number > highestNumber
            ) {
                highestNumber = number;
            }
        });

        const nextProjectId =
            `IDM-${String(
                highestNumber + 1
            ).padStart(3, "0")}`;

        res.json({
            success: true,
            project_id: nextProjectId
        });

    } catch (error) {

        console.error(
            "Next project ID error:",
            error
        );

        res.status(500).json({
            success: false,
            error: "Failed to generate project ID."
        });
    }
});


// ============================================================
// UPDATE PROJECT
// ============================================================

app.put(
    "/api/projects/:projectId",
    async (req, res) => {

        try {

            const { projectId } =
                req.params;


            const {
                project_name,
                project_url,
                project_owner,
                version,
                project_status,
                date_opened,
                date_closed,
                development_team = []
            } = req.body;


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


            const projectData = {

                project_name:
                    project_name.trim(),

                project_url:
                    project_url
                        ? project_url.trim()
                        : null,

                project_owner:
                    project_owner
                        ? project_owner.trim()
                        : null,

                version:
                    version
                        ? String(version).trim()
                        : null,

                project_status:
                    project_status ||
                    "Not Started",

                date_opened:
                    date_opened || null,

                date_closed:
                    date_closed || null

            };


            const {
                data,
                error
            } = await supabase
                .from("projects")
                .update(projectData)
                .eq(
                    "project_id",
                    projectId
                )
                .select()
                .single();


            if (error) {

                console.error(
                    "SUPABASE PROJECT UPDATE ERROR:",
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


            if (!data) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Project not found."
                });

            }


            // Replace this project's development team with the current
            // manually entered rows from the form.
            const { error: deleteMembersError } = await supabase
                .from("project_members")
                .delete()
                .eq("project_id", projectId);

            if (deleteMembersError) {
                return res.status(500).json({
                    success: false,
                    error: "Project was updated, but the old development team could not be cleared.",
                    details: deleteMembersError.message
                });
            }

            const teamMembers = Array.isArray(development_team)
                ? development_team
                    .map(member => ({
                        project_id: projectId,
                        member_name: String(member?.name || member?.member_name || "").trim(),
                        member_role: String(member?.role || member?.member_role || "").trim() || null
                    }))
                    .filter(member => member.member_name)
                : [];

            if (teamMembers.length > 0) {
                const { error: insertMembersError } = await supabase
                    .from("project_members")
                    .insert(teamMembers);

                if (insertMembersError) {
                    return res.status(500).json({
                        success: false,
                        error: "Project was updated, but the development team could not be saved.",
                        details: insertMembersError.message
                    });
                }
            }

            res.json({

                success: true,

                message:
                    "Project updated successfully.",

                project:
                    data

            });

        } catch (error) {

            console.error(
                "Update project error:",
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
// DELETE PROJECT
// ============================================================

app.delete(
    "/api/projects/:projectId",
    async (req, res) => {

        try {

            const { projectId } =
                req.params;


            const {
                data: project,
                error: projectError
            } = await supabase
                .from("projects")
                .select("*")
                .eq(
                    "project_id",
                    projectId
                )
                .single();


            if (
                projectError ||
                !project
            ) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Project not found."
                });

            }


            const {
                error
            } = await supabase
                .from("projects")
                .delete()
                .eq(
                    "project_id",
                    projectId
                );


            if (error) {

                console.error(
                    "SUPABASE PROJECT DELETE ERROR:",
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
                    "Project deleted successfully.",

                project:
                    project

            });

        } catch (error) {

            console.error(
                "Delete project error:",
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
// GET TASKS FOR A PROJECT
// ============================================================

app.get(
    "/api/projects/:projectId/tasks",
    async (req, res) => {

        try {

            const { projectId } =
                req.params;

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

            console.log(
                "History records found:",
                data?.length || 0
            );

            res.json({

                success: true,

                history:
                    data || []
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
            // GET PROJECT GOOGLE DRIVE FOLDER
            // ----------------------------------------------------

            const {
                data: project,
                error: projectError
            } = await supabase
                .from("projects")
                .select(
                    "project_id, project_name, drive_folder_id, drive_folder_url"
                )
                .eq(
                    "project_id",
                    projectId
                )
                .single();


            if (
                projectError ||
                !project
            ) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Project not found."
                });
            }


            if (!project.drive_folder_id) {

                return res.status(400).json({
                    success: false,

                    error:
                        "This project does not have a Google Drive folder yet."
                });
            }


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
                    "SUPABASE TASK INSERT ERROR:",
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
            // CREATE GOOGLE DRIVE TASK FOLDER
            // ----------------------------------------------------

            let taskRecord =
                data;

            let taskDriveFolder =
                null;

            try {

                taskDriveFolder =
                    await createDriveFolder({
                        name:
                            `${data.task_id} - ${task_activity.trim()}`,

                        parentFolderId:
                            project.drive_folder_id
                    });


                const {
                    data: updatedTask,
                    error: driveUpdateError
                } = await supabase
                    .from("tasks")
                    .update({
                        drive_folder_id:
                            taskDriveFolder.id,

                        drive_folder_url:
                            taskDriveFolder.url
                    })
                    .eq(
                        "task_id",
                        data.task_id
                    )
                    .select()
                    .single();


                if (driveUpdateError) {
                    throw driveUpdateError;
                }


                taskRecord =
                    updatedTask;

            } catch (driveError) {

                console.error(
                    "TASK DRIVE FOLDER CREATION FAILED:",
                    driveError
                );


                if (taskDriveFolder?.id) {

                    await deleteDriveFolder(
                        taskDriveFolder.id
                    );
                }


                await supabase
                    .from("tasks")
                    .delete()
                    .eq(
                        "task_id",
                        data.task_id
                    );


                return res.status(500).json({
                    success: false,

                    error:
                        "Task could not be created because its Google Drive folder could not be created.",

                    details:
                        driveError.message
                });
            }


            // ----------------------------------------------------
            // CREATE HISTORY RECORD
            // ----------------------------------------------------

            const historyResult =
                await createTaskHistory({

                    taskId:
                        taskRecord.task_id,

                    projectId:
                        taskRecord.project_id,

                    action:
                        "Created",

                    newStatus:
                        taskRecord.status,

                    newPercentComplete:
                        taskRecord.percent_complete,

                    newResponsiblePerson:
                        taskRecord.responsible_person,

                    remarks:
                        "Task created",

                    changedBy:
                        taskRecord.responsible_person ||
                        "System"
                });

            // ----------------------------------------------------
            // DO NOT SILENTLY IGNORE HISTORY FAILURE
            // ----------------------------------------------------

            if (!historyResult.success) {

                console.error(
                    "TASK CREATED BUT HISTORY FAILED:",
                    historyResult.error
                );

                return res.status(500).json({

                    success: false,

                    error:
                        "Task was created, but the history record could not be saved.",

                    historyError:
                        historyResult.error?.message ||
                        "Unknown history error.",

                    task:
                        taskRecord
                });
            }

            console.log(
                "Task created successfully:",
                taskRecord
            );

            res.status(201).json({

                success: true,

                message:
                    "Task created successfully.",

                task:
                    taskRecord,

                historyRecorded:
                    true
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
// EVERY SUCCESSFUL UPDATE CREATES ONE HISTORY TRANSACTION
// ============================================================

app.put(
    "/api/tasks/:taskId",
    async (req, res) => {
        try {
            const { taskId } = req.params;

            console.log(
                "=============================================="
            );
            console.log("UPDATE TASK");
            console.log("Task ID:", taskId);
            console.log("Request body:", req.body);
            console.log(
                "=============================================="
            );

            // ----------------------------------------------------
            // GET OLD TASK
            // ----------------------------------------------------

            const {
                data: oldTask,
                error: oldTaskError
            } = await supabase
                .from("tasks")
                .select("*")
                .eq("task_id", taskId)
                .single();

            if (oldTaskError) {
                console.error(
                    "GET OLD TASK ERROR:",
                    oldTaskError
                );

                return res.status(404).json({
                    success: false,
                    error: "Task not found."
                });
            }

            // ----------------------------------------------------
            // GET UPDATED VALUES
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
            // VALIDATE TASK ACTIVITY
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
            // PREPARE UPDATED TASK DATA
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
                .eq("task_id", taskId)
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
                (
                    oldTask.responsible_person ||
                    null
                ) !==
                (
                    data.responsible_person ||
                    null
                );

            const taskActivityChanged =
                (
                    oldTask.task_activity ||
                    null
                ) !==
                (
                    data.task_activity ||
                    null
                );

            const procedureStageChanged =
                (
                    oldTask.procedure_stage ||
                    null
                ) !==
                (
                    data.procedure_stage ||
                    null
                );

            const scheduleStatusChanged =
                (
                    oldTask.schedule_status ||
                    null
                ) !==
                (
                    data.schedule_status ||
                    null
                );

            const priorityChanged =
                (
                    oldTask.priority ||
                    null
                ) !==
                (
                    data.priority ||
                    null
                );

            const roleChanged =
                (
                    oldTask.role ||
                    null
                ) !==
                (
                    data.role ||
                    null
                );

            const stakeholderChanged =
                (
                    oldTask.stakeholder_end_user ||
                    null
                ) !==
                (
                    data.stakeholder_end_user ||
                    null
                );

            const startDateChanged =
                (
                    oldTask.start_date ||
                    null
                ) !==
                (
                    data.start_date ||
                    null
                );

            const dueDateChanged =
                (
                    oldTask.due_date ||
                    null
                ) !==
                (
                    data.due_date ||
                    null
                );

            const completionDateChanged =
                (
                    oldTask.completion_date ||
                    null
                ) !==
                (
                    data.completion_date ||
                    null
                );

            const deliverableChanged =
                (
                    oldTask.deliverable_expected_output ||
                    null
                ) !==
                (
                    data.deliverable_expected_output ||
                    null
                );

            const evidenceChanged =
                (
                    oldTask.evidence_applicability ||
                    null
                ) !==
                (
                    data.evidence_applicability ||
                    null
                );

            // ----------------------------------------------------
            // DETERMINE HISTORY ACTION
            // ----------------------------------------------------
            // IMPORTANT:
            // Every successful update creates ONE history record.
            // ----------------------------------------------------

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
            } else if (taskActivityChanged) {
                action =
                    "Task Activity Updated";
            } else if (procedureStageChanged) {
                action =
                    "Procedure Stage Updated";
            } else if (scheduleStatusChanged) {
                action =
                    "Schedule Status Updated";
            } else if (priorityChanged) {
                action =
                    "Priority Updated";
            } else if (roleChanged) {
                action =
                    "Role Updated";
            } else if (stakeholderChanged) {
                action =
                    "Stakeholder / End-user Updated";
            } else if (startDateChanged) {
                action =
                    "Start Date Updated";
            } else if (dueDateChanged) {
                action =
                    "Due Date Updated";
            } else if (completionDateChanged) {
                action =
                    "Completion Date Updated";
            } else if (deliverableChanged) {
                action =
                    "Deliverable / Expected Output Updated";
            } else if (evidenceChanged) {
                action =
                    "Evidence Applicability Updated";
            }

            // ----------------------------------------------------
            // CREATE ONE HISTORY RECORD
            // ----------------------------------------------------
            // No condition here.
            // A successful task update ALWAYS creates history.
            // ----------------------------------------------------

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
                        oldTask.responsible_person ||
                        "System"
                });

            // ----------------------------------------------------
            // DO NOT SILENTLY IGNORE HISTORY FAILURE
            // ----------------------------------------------------

            if (!historyResult.success) {
                console.error(
                    "TASK UPDATED BUT HISTORY FAILED:",
                    historyResult.error
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Task was updated, but the history record could not be saved.",

                    historyError:
                        historyResult.error?.message ||
                        "Unknown history error.",

                    task:
                        data
                });
            }

            // ----------------------------------------------------
            // SUCCESS
            // ----------------------------------------------------

            console.log(
                "Task updated successfully:",
                data
            );

            console.log(
                "History transaction recorded:",
                action
            );

            res.json({
                success: true,

                message:
                    "Task updated successfully.",

                task:
                    data,

                historyRecorded:
                    true,

                historyAction:
                    action
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

            const {
                reviewed_verified_by,
                review_result,
                review_date,
                remarks
            } = req.body;

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

            if (!review_date) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Review date is required."
                });
            }

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
                    "SUPABASE TASK REVIEW ERROR:",
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
            // RECORD REVIEW HISTORY
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
                    "REVIEW SAVED BUT HISTORY FAILED:",
                    historyResult.error
                );

                return res.status(500).json({

                    success: false,

                    error:
                        "Review was saved, but the history record could not be saved.",

                    historyError:
                        historyResult.error?.message ||
                        "Unknown history error.",

                    task:
                        data
                });
            }

            res.json({

                success: true,

                message:
                    "Task review submitted successfully.",

                task:
                    data,

                historyRecorded:
                    true
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
                "=============================================="
            );

            console.log(
                "DELETE TASK"
            );

            console.log(
                "Task ID:",
                taskId
            );

            console.log(
                "=============================================="
            );

            // ----------------------------------------------------
            // GET TASK BEFORE DELETE
            // ----------------------------------------------------

            const {
                data: task,
                error: taskError
            } = await supabase
                .from("tasks")
                .select("*")
                .eq(
                    "task_id",
                    taskId
                )
                .single();

            if (taskError || !task) {

                return res.status(404).json({

                    success: false,

                    error:
                        "Task not found."
                });
            }

            // ----------------------------------------------------
            // RECORD DELETE HISTORY FIRST
            // ----------------------------------------------------

            const historyResult =
                await createTaskHistory({

                    taskId:
                        task.task_id,

                    projectId:
                        task.project_id,

                    action:
                        "Deleted",

                    oldStatus:
                        task.status,

                    newStatus:
                        null,

                    oldPercentComplete:
                        task.percent_complete,

                    newPercentComplete:
                        null,

                    oldResponsiblePerson:
                        task.responsible_person,

                    newResponsiblePerson:
                        null,

                    remarks:
                        "Task deleted",

                    changedBy:
                        task.responsible_person ||
                        "System"
                });

            if (!historyResult.success) {

                console.error(
                    "DELETE CANCELLED — HISTORY FAILED:",
                    historyResult.error
                );

                return res.status(500).json({

                    success: false,

                    error:
                        "Task was not deleted because its history could not be recorded.",

                    historyError:
                        historyResult.error?.message ||
                        "Unknown history error."
                });
            }

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
                    "Task deleted successfully.",

                historyRecorded:
                    true
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
// USERS TABLE REMOVED
// Project owners and development-team members are now free-text.
// ============================================================


// ============================================================
// PROJECT MEMBERS
// Manually entered member name + role
// ============================================================

app.get("/api/projects/:projectId/members", async (req, res) => {
    try {
        const { projectId } = req.params;

        const { data, error } = await supabase
            .from("project_members")
            .select("project_member_id, project_id, member_name, member_role, created_at")
            .eq("project_id", projectId)
            .order("created_at", { ascending: true });

        if (error) throw error;

        res.json({ success: true, members: data || [] });
    } catch (error) {
        console.error("Get project members error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post("/api/projects/:projectId/members", async (req, res) => {
    try {
        const { projectId } = req.params;
        const memberName = String(req.body.member_name || req.body.name || "").trim();
        const memberRole = String(req.body.member_role || req.body.role || "").trim();

        if (!memberName) {
            return res.status(400).json({
                success: false,
                error: "Team member name is required."
            });
        }

        const { data, error } = await supabase
            .from("project_members")
            .insert([{
                project_id: projectId,
                member_name: memberName,
                member_role: memberRole || null
            }])
            .select("project_member_id, project_id, member_name, member_role, created_at")
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            message: "Project member added successfully.",
            member: data
        });
    } catch (error) {
        console.error("Add project member error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put("/api/project-members/:memberId", async (req, res) => {
    try {
        const { memberId } = req.params;
        const memberName = String(req.body.member_name || req.body.name || "").trim();
        const memberRole = String(req.body.member_role || req.body.role || "").trim();

        if (!memberName) {
            return res.status(400).json({ success: false, error: "Team member name is required." });
        }

        const { data, error } = await supabase
            .from("project_members")
            .update({ member_name: memberName, member_role: memberRole || null })
            .eq("project_member_id", memberId)
            .select("project_member_id, project_id, member_name, member_role, created_at")
            .single();

        if (error) throw error;

        res.json({ success: true, message: "Project member updated successfully.", member: data });
    } catch (error) {
        console.error("Update project member error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete("/api/project-members/:memberId", async (req, res) => {
    try {
        const { memberId } = req.params;
        const { data, error } = await supabase
            .from("project_members")
            .delete()
            .eq("project_member_id", memberId)
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, message: "Project member removed successfully.", member: data });
    } catch (error) {
        console.error("Remove project member error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// ============================================================
// START SERVER
// ============================================================

if (require.main === module) {

    app.listen(PORT, () => {

        console.log(
            "=============================================="
        );

        console.log(
            `PTS server running on port ${PORT}`
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