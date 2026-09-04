const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { google } = require("googleapis");
const { Readable } = require("stream");

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

// Separate privileged client used ONLY on the server for account management.
// Add SUPABASE_SERVICE_ROLE_KEY to .env / Vercel Environment Variables.
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
    : null;

function getDatabaseClient() {
    return supabaseAdmin || supabase;
}

// Creates a short-lived client that sends the signed-in user's access token
// to PostgREST. This lets RLS policies such as auth.uid() = user_id work
// even when SUPABASE_SERVICE_ROLE_KEY is not configured on the deployment.
function getUserDatabaseClient(accessToken) {
    if (!accessToken) {
        return getDatabaseClient();
    }

    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            },
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        }
    );
}


// ============================================================
// ID NUMBERING HELPER
// Uses the LOWEST available number and reads with the server-side
// database client so RLS cannot make existing IDs look "missing".
//
// Project examples for 2026:
//   no matching rows                  -> IDM-2026-001
//   001, 002, 004 exist              -> IDM-2026-003
//   002, 003 exist                   -> IDM-2026-001
//
// Task IDs keep their existing format:
//   TASK-001, TASK-002, ...
// ============================================================

async function getLowestAvailableFormattedId({
    tableName,
    columnName,
    prefix,
    year = null
}) {

    const db = getDatabaseClient();

    const { data, error } = await db
        .from(tableName)
        .select(columnName);

    if (error) {
        throw error;
    }

    const usedNumbers = new Set();

    const safePrefix =
        String(prefix || "")
            .replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

    const normalizedYear =
        year !== null &&
        year !== undefined &&
        String(year).trim()
            ? String(year).trim()
            : null;

    const idPattern =
        normalizedYear
            ? new RegExp(
                `^${safePrefix}-${normalizedYear}-(\\d+)$`,
                "i"
            )
            : new RegExp(
                `^${safePrefix}-(\\d+)$`,
                "i"
            );

    for (const row of data || []) {

        const value =
            String(
                row?.[columnName] || ""
            ).trim();

        const match =
            value.match(idPattern);

        if (!match) {
            continue;
        }

        const number =
            Number.parseInt(
                match[1],
                10
            );

        if (
            Number.isInteger(number) &&
            number > 0
        ) {
            usedNumbers.add(number);
        }
    }

    let nextNumber = 1;

    while (
        usedNumbers.has(nextNumber)
    ) {
        nextNumber += 1;
    }

    const serial =
        String(nextNumber)
            .padStart(3, "0");

    return normalizedYear
        ? `${prefix}-${normalizedYear}-${serial}`
        : `${prefix}-${serial}`;
}


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
// GOOGLE DRIVE REPOSITORY HELPERS
// ============================================================

function escapeDriveQueryValue(value) {

    return String(value || "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
}


async function findChildDriveFolder(
    parentFolderId,
    folderName
) {

    const response =
        await googleDrive.files.list({
            q:
                `'${escapeDriveQueryValue(parentFolderId)}' in parents and ` +
                `name = '${escapeDriveQueryValue(folderName)}' and ` +
                `mimeType = 'application/vnd.google-apps.folder' and ` +
                `trashed = false`,

            fields:
                "files(id,name,webViewLink)",

            pageSize:
                1
        });

    return response.data.files?.[0] || null;
}


async function ensureDriveFolderPath(
    parentFolderId,
    relativePath
) {

    const parts =
        String(relativePath || "")
            .split("/")
            .map(part => part.trim())
            .filter(Boolean);

    let currentParentId =
        parentFolderId;

    for (const part of parts) {

        let childFolder =
            await findChildDriveFolder(
                currentParentId,
                part
            );

        if (!childFolder) {

            const created =
                await createDriveFolder({
                    name:
                        part,

                    parentFolderId:
                        currentParentId
                });

            childFolder = {
                id:
                    created.id,

                name:
                    created.name
            };
        }

        currentParentId =
            childFolder.id;
    }

    return currentParentId;
}



async function listDriveFolderContents(
    folderId,
    relativePath = ""
) {

    const items = [];
    let pageToken = null;

    do {

        const response =
            await googleDrive.files.list({
                q:
                    `'${escapeDriveQueryValue(folderId)}' in parents and trashed = false`,

                fields:
                    "nextPageToken,files(id,name,mimeType,webViewLink,size,modifiedTime)",

                pageSize:
                    1000,

                pageToken:
                    pageToken || undefined,

                orderBy:
                    "folder,name"
            });

        const children =
            response.data.files || [];

        for (const child of children) {

            const isFolder =
                child.mimeType ===
                "application/vnd.google-apps.folder";

            const itemRelativePath =
                relativePath
                    ? `${relativePath}/${child.name}`
                    : child.name;

            items.push({
                id:
                    child.id,

                name:
                    child.name,

                mime_type:
                    child.mimeType,

                is_folder:
                    isFolder,

                url:
                    child.webViewLink ||
                    (
                        isFolder
                            ? getDriveFolderUrl(child.id)
                            : null
                    ),

                size:
                    child.size
                        ? Number(child.size)
                        : null,

                modified_time:
                    child.modifiedTime ||
                    null,

                relative_path:
                    itemRelativePath
            });

            if (isFolder) {

                const nestedItems =
                    await listDriveFolderContents(
                        child.id,
                        itemRelativePath
                    );

                items.push(
                    ...nestedItems
                );
            }
        }

        pageToken =
            response.data.nextPageToken ||
            null;

    } while (pageToken);

    return items;
}


async function uploadBufferToDrive({
    fileName,
    mimeType,
    buffer,
    parentFolderId
}) {

    const response =
        await googleDrive.files.create({
            requestBody: {
                name:
                    fileName,

                parents: [
                    parentFolderId
                ]
            },

            media: {
                mimeType:
                    mimeType ||
                    "application/octet-stream",

                body:
                    Readable.from(
                        buffer
                    )
            },

            fields:
                "id,name,mimeType,webViewLink"
        });

    return response.data;
}


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ============================================================
// BASIC SECURITY HEADERS
// ============================================================
// These headers make the application's identity/authentication pages
// less ambiguous to browsers and prevent sensitive login responses from
// being cached. They do not change the DevT authentication flow.

app.use((req, res, next) => {

    res.setHeader(
        "X-Content-Type-Options",
        "nosniff"
    );

    res.setHeader(
        "X-Frame-Options",
        "DENY"
    );

    res.setHeader(
        "Referrer-Policy",
        "strict-origin-when-cross-origin"
    );

    if (
        req.path === "/login.html" ||
        req.path.startsWith("/api/auth/")
    ) {
        res.setHeader(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, private"
        );

        res.setHeader(
            "Pragma",
            "no-cache"
        );
    }

    next();
});


app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

// ============================================================
// DEVT AUTHENTICATION / AUTHORIZATION
// ============================================================

function getBearerToken(req) {
    const header = String(req.get("Authorization") || "");
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : "";
}

async function loadUserContextFromToken(token) {
    if (!token) return null;

    const { data: authData, error: authError } =
        await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
        return null;
    }

    const db = supabaseAdmin || getUserDatabaseClient(token);
    const { data: profile, error: profileError } = await db
        .from("profiles")
        .select("user_id, full_name, email, role, is_active, created_at, updated_at")
        .eq("user_id", authData.user.id)
        .maybeSingle();

    if (profileError) {
        console.error("PROFILE LOOKUP ERROR:", profileError);
        return null;
    }

    if (!profile || profile.is_active === false) {
        return null;
    }

    return {
        user: authData.user,
        profile
    };
}

function getLoggedInDisplayName(req) {
    return String(
        req.profile?.full_name ||
        req.profile?.email ||
        "System"
    ).trim();
}


async function requireApiAuth(req, res, next) {
    try {
        const token = getBearerToken(req);
        const context = await loadUserContextFromToken(token);

        if (!context) {
            return res.status(401).json({
                success: false,
                error: "Authentication required."
            });
        }

        req.authUser = context.user;
        req.profile = context.profile;
        req.accessToken = token;
        next();
    } catch (error) {
        console.error("AUTH MIDDLEWARE ERROR:", error);
        res.status(401).json({ success: false, error: "Invalid session." });
    }
}

async function userCanAccessProject(userId, projectId) {
    if (!userId || !projectId) return false;

    const db = getDatabaseClient();
    const { data, error } = await db
        .from("project_members")
        .select("project_member_id")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .limit(1);

    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
}

async function getTaskProjectId(taskId) {
    const db = getDatabaseClient();
    const { data, error } = await db
        .from("tasks")
        .select("project_id")
        .eq("task_id", taskId)
        .maybeSingle();

    if (error) throw error;
    return data?.project_id || null;
}

async function authorizeApiRequest(req, res, next) {
    try {
        if (req.profile?.role === "admin") {
            return next();
        }

        if (req.profile?.role !== "development_team") {
            return res.status(403).json({ success: false, error: "Access denied." });
        }

        const p = req.path;
        const method = req.method.toUpperCase();

        // Dashboard is filtered inside the dashboard route.
        if (p === "/dashboard" && method === "GET") return next();
        if (p === "/auth/me" || p === "/auth/logout") return next();

        // Development-team users cannot manage projects/accounts/members.
        if (p === "/projects-next-id" || p.startsWith("/development-team") || p.startsWith("/project-members")) {
            return res.status(403).json({ success: false, error: "Administrator access required." });
        }
        if (p === "/projects" && method === "POST") {
            return res.status(403).json({ success: false, error: "Administrator access required." });
        }

        const projectMatch = p.match(/^\/projects\/([^/]+)(?:\/|$)/);
        if (projectMatch) {
            const projectId = decodeURIComponent(projectMatch[1]);

            // Editing/deleting project details is admin-only.
            if ((method === "PUT" || method === "DELETE") && p === `/projects/${projectMatch[1]}`) {
                return res.status(403).json({ success: false, error: "Administrator access required." });
            }

            // Member management is admin-only; reading members is allowed for assigned users.
            if (p.endsWith("/members") && method !== "GET") {
                return res.status(403).json({ success: false, error: "Administrator access required." });
            }

            const allowed = await userCanAccessProject(req.authUser.id, projectId);
            if (!allowed) {
                return res.status(403).json({ success: false, error: "You are not assigned to this project." });
            }
            return next();
        }

        const taskMatch = p.match(/^\/tasks\/([^/]+)(?:\/|$)/);
        if (taskMatch) {
            const taskId = decodeURIComponent(taskMatch[1]);

            // Task deletion is administrator-only.
            // Admin users already returned next() at the top of this middleware.
            if (
                method === "DELETE" &&
                p === `/tasks/${taskMatch[1]}`
            ) {
                return res.status(403).json({
                    success: false,
                    error: "Administrator access required."
                });
            }

            const projectId = await getTaskProjectId(taskId);
            const allowed = projectId && await userCanAccessProject(req.authUser.id, projectId);
            if (!allowed) {
                return res.status(403).json({ success: false, error: "You are not assigned to this task's project." });
            }
            return next();
        }

        // Allow authenticated common/report endpoints. Add stricter rules later if needed.
        return next();
    } catch (error) {
        console.error("AUTHORIZATION ERROR:", error);
        res.status(500).json({ success: false, error: "Unable to verify access." });
    }
}

// Public login endpoint.
// Users sign in with their Full Name + Password.
// Supabase Auth still authenticates with email internally, so the server
// resolves the entered full name to the account email first.
app.post("/api/auth/login", async (req, res) => {
    try {
        const fullName = String(
            req.body.full_name ||
            req.body.username ||
            ""
        ).trim();

        const password = String(req.body.password || "");

        if (!fullName || !password) {
            return res.status(400).json({
                success: false,
                error: "Username and password are required."
            });
        }

        const db = getDatabaseClient();

        // Full-name login is case-insensitive.
        // Read at most two matches so duplicate names can be detected clearly.
        const {
            data: matchingProfiles,
            error: profileLookupError
        } = await db
            .from("profiles")
            .select("user_id, full_name, email, role, is_active")
            .ilike("full_name", fullName)
            .limit(2);

        if (profileLookupError) {
            console.error(
                "LOGIN FULL NAME LOOKUP ERROR:",
                profileLookupError
            );

            return res.status(500).json({
                success: false,
                error: "Unable to verify this account."
            });
        }

        if (!matchingProfiles || matchingProfiles.length === 0) {
            return res.status(401).json({
                success: false,
                error: "Invalid username or password."
            });
        }

        if (matchingProfiles.length > 1) {
            return res.status(409).json({
                success: false,
                error: "More than one account uses this username. Please ask the administrator to make the account names unique."
            });
        }

        const loginProfile = matchingProfiles[0];

        if (!loginProfile.email) {
            return res.status(401).json({
                success: false,
                error: "Invalid username or password."
            });
        }

        if (loginProfile.is_active === false) {
            return res.status(403).json({
                success: false,
                error: "This account is inactive."
            });
        }

        const {
            data,
            error
        } = await supabase.auth.signInWithPassword({
            email: loginProfile.email,
            password
        });

        if (error || !data?.session || !data?.user) {
            return res.status(401).json({
                success: false,
                error: "Invalid username or password."
            });
        }

        // Profile lookup must run as either the privileged server client
        // or the newly authenticated user. Using the plain anonymous client
        // can be blocked by RLS and incorrectly look like the profile is missing.
        const profileDb = supabaseAdmin ||
            getUserDatabaseClient(data.session.access_token);

        const {
            data: profile,
            error: profileError
        } = await profileDb
            .from("profiles")
            .select("user_id, full_name, email, role, is_active")
            .eq("user_id", data.user.id)
            .maybeSingle();

        if (profileError) {
            console.error(
                "LOGIN PROFILE LOOKUP ERROR:",
                profileError
            );

            return res.status(500).json({
                success: false,
                error: "Unable to load this account's DevT profile."
            });
        }

        if (!profile) {
            return res.status(403).json({
                success: false,
                error: "This account has no DevT profile."
            });
        }

        if (profile.is_active === false) {
            return res.status(403).json({
                success: false,
                error: "This account is inactive."
            });
        }

        res.json({
            success: true,
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
            profile
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        res.status(500).json({
            success: false,
            error: "Unable to sign in."
        });
    }
});


// Public session refresh endpoint.
// This must stay ABOVE app.use("/api", requireApiAuth) because the
// access token may already be expired when this endpoint is called.
app.post("/api/auth/refresh", async (req, res) => {

    try {

        const refreshToken =
            String(
                req.body.refresh_token ||
                ""
            ).trim();

        if (!refreshToken) {

            return res.status(400).json({
                success: false,
                error:
                    "Refresh token is required."
            });

        }

        const {
            data,
            error
        } = await supabase.auth.refreshSession({
            refresh_token:
                refreshToken
        });

        if (
            error ||
            !data?.session ||
            !data?.user
        ) {

            console.warn(
                "SESSION REFRESH FAILED:",
                error?.message ||
                "No refreshed session returned."
            );

            return res.status(401).json({
                success: false,
                error:
                    "Session expired. Please sign in again."
            });

        }

        const profileDb =
            supabaseAdmin ||
            getUserDatabaseClient(
                data.session.access_token
            );

        const {
            data: profile,
            error: profileError
        } = await profileDb
            .from("profiles")
            .select(
                "user_id, full_name, email, role, is_active"
            )
            .eq(
                "user_id",
                data.user.id
            )
            .maybeSingle();

        if (profileError) {

            console.error(
                "REFRESH PROFILE LOOKUP ERROR:",
                profileError
            );

            return res.status(500).json({
                success: false,
                error:
                    "Unable to refresh this DevT session."
            });

        }

        if (
            !profile ||
            profile.is_active === false
        ) {

            return res.status(403).json({
                success: false,
                error:
                    "This DevT account is unavailable or inactive."
            });

        }

        return res.json({
            success: true,

            access_token:
                data.session.access_token,

            refresh_token:
                data.session.refresh_token,

            expires_at:
                data.session.expires_at,

            profile:
                profile
        });

    } catch (error) {

        console.error(
            "REFRESH SESSION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            error:
                "Unable to refresh session."
        });

    }

});


// Everything below /api requires a valid DevT account.
app.use("/api", requireApiAuth);
app.use("/api", authorizeApiRequest);

app.get("/api/auth/me", async (req, res) => {
    res.json({ success: true, profile: req.profile });
});

app.post("/api/auth/logout", async (req, res) => {
    try {
        await supabase.auth.admin?.signOut?.(req.accessToken);
    } catch (_) {
        // Client-side token removal is enough if server sign-out is unavailable.
    }
    res.json({ success: true });
});

// ============================================================
// DEVELOPMENT TEAM ACCOUNT MANAGEMENT (ADMIN ONLY)
// ============================================================

app.get("/api/development-team", async (req, res) => {
    if (req.profile.role !== "admin") {
        return res.status(403).json({ success: false, error: "Administrator access required." });
    }

    try {
        const db = getDatabaseClient();
        const { data, error } = await db
            .from("profiles")
            .select("user_id, full_name, email, role, is_active, created_at, updated_at")
            .eq("role", "development_team")
            .order("full_name", { ascending: true });

        if (error) throw error;
        res.json({ success: true, members: data || [] });
    } catch (error) {
        console.error("GET DEVELOPMENT TEAM ERROR:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post("/api/development-team", async (req, res) => {
    if (req.profile.role !== "admin") {
        return res.status(403).json({ success: false, error: "Administrator access required." });
    }
    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." });
    }

    const fullName = String(req.body.full_name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const strongPassword =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!fullName || !email || !password) {
        return res.status(400).json({
            success: false,
            error: "Full name, a valid email, and password are required."
        });
    }

    if (!strongPassword.test(password)) {
        return res.status(400).json({
            success: false,
            error: "Password must be at least 8 characters and contain an uppercase letter, lowercase letter, number, and special character."
        });
    }

    const { data: duplicateName, error: duplicateNameError } =
        await supabaseAdmin
            .from("profiles")
            .select("user_id")
            .ilike("full_name", fullName)
            .limit(1);

    if (duplicateNameError) {
        return res.status(500).json({
            success: false,
            error: duplicateNameError.message
        });
    }

    if ((duplicateName || []).length > 0) {
        return res.status(409).json({
            success: false,
            error: "That full name is already used by another account. Full names must be unique because they are used to sign in."
        });
    }

    let createdUserId = null;
    try {
        const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName, role: "development_team" }
        });
        if (createError) throw createError;

        createdUserId = created.user.id;
        const { data: profile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .insert([{
                user_id: createdUserId,
                full_name: fullName,
                email,
                role: "development_team",
                is_active: true
            }])
            .select("user_id, full_name, email, role, is_active, created_at")
            .single();

        if (profileError) throw profileError;

        res.status(201).json({ success: true, member: profile });
    } catch (error) {
        if (createdUserId && supabaseAdmin) {
            try { await supabaseAdmin.auth.admin.deleteUser(createdUserId); } catch (_) {}
        }
        console.error("CREATE DEVELOPMENT TEAM ERROR:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.patch("/api/development-team/:userId", async (req, res) => {
    if (req.profile.role !== "admin") {
        return res.status(403).json({ success: false, error: "Administrator access required." });
    }
    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." });
    }

    try {
        const userId = req.params.userId;
        const fullName = String(req.body.full_name || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");
        const isActive = req.body.is_active !== false;

        if (!fullName || !email) {
            return res.status(400).json({
                success: false,
                error: "Full name and email are required."
            });
        }

        const strongPassword =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

        if (password && !strongPassword.test(password)) {
            return res.status(400).json({
                success: false,
                error: "New password must be at least 8 characters and contain an uppercase letter, lowercase letter, number, and special character."
            });
        }

        const { data: duplicateName, error: duplicateNameError } =
            await supabaseAdmin
                .from("profiles")
                .select("user_id")
                .ilike("full_name", fullName)
                .neq("user_id", userId)
                .limit(1);

        if (duplicateNameError) throw duplicateNameError;

        if ((duplicateName || []).length > 0) {
            return res.status(409).json({
                success: false,
                error: "That full name is already used by another account. Full names must be unique because they are used to sign in."
            });
        }

        const authUpdate = { email, user_metadata: { full_name: fullName, role: "development_team" } };
        if (password) authUpdate.password = password;

        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdate);
        if (authError) throw authError;

        const { data, error } = await supabaseAdmin
            .from("profiles")
            .update({ full_name: fullName, email, is_active: isActive, updated_at: new Date().toISOString() })
            .eq("user_id", userId)
            .select("user_id, full_name, email, role, is_active, created_at, updated_at")
            .single();
        if (error) throw error;

        res.json({ success: true, member: data });
    } catch (error) {
        console.error("UPDATE DEVELOPMENT TEAM ERROR:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete("/api/development-team/:userId", async (req, res) => {
    if (req.profile.role !== "admin") {
        return res.status(403).json({ success: false, error: "Administrator access required." });
    }
    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." });
    }

    try {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.userId);
        if (error) throw error;
        res.json({ success: true, message: "Development team account deleted." });
    } catch (error) {
        console.error("DELETE DEVELOPMENT TEAM ERROR:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

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

        const db =
            getDatabaseClient();

        const {
            data,
            error
        } = await db
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
        const db = getDatabaseClient();
        let projectQuery = db
            .from("projects")
            .select("*")
            .order("created_at", { ascending: false });

        let allowedProjectIds = null;
        if (req.profile.role === "development_team") {
            const { data: assignments, error: assignmentError } = await db
                .from("project_members")
                .select("project_id")
                .eq("user_id", req.authUser.id);
            if (assignmentError) throw assignmentError;
            allowedProjectIds = [...new Set((assignments || []).map(row => row.project_id).filter(Boolean))];

            if (allowedProjectIds.length === 0) {
                return res.json({
                    success: true,
                    viewer: req.profile,
                    totalProjects: 0,
                    activeProjects: 0,
                    completedProjects: 0,
                    totalTasks: 0,
                    projects: []
                });
            }
            projectQuery = projectQuery.in("project_id", allowedProjectIds);
        }

        const { data: projects, error: projectsError } = await projectQuery;
        if (projectsError) throw projectsError;

        const projectIds = (projects || []).map(project => project.project_id);

        let totalTasks = 0;
        if (projectIds.length > 0) {
            const { count, error: tasksError } = await db
                .from("tasks")
                .select("*", { count: "exact", head: true })
                .in("project_id", projectIds);
            if (tasksError) throw tasksError;
            totalTasks = count || 0;
        }

        let members = [];
        if (projectIds.length > 0) {
            const { data: memberRows, error: membersError } = await db
                .from("project_members")
                .select("project_id, user_id, member_name, member_role")
                .in("project_id", projectIds)
                .order("created_at", { ascending: true });
            if (membersError) throw membersError;
            members = memberRows || [];
        }

        const projectsWithMembers = (projects || []).map(project => ({
            ...project,
            development_team: members.filter(member => member.project_id === project.project_id)
        }));

        res.json({
            success: true,
            viewer: req.profile,
            totalProjects: projectsWithMembers.length,
            activeProjects: projectsWithMembers.filter(p => p.project_status === "Active").length,
            completedProjects: projectsWithMembers.filter(p => p.project_status === "Completed").length,
            totalTasks,
            projects: projectsWithMembers
        });
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ success: false, error: error.message });
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


        // Project IDs use the current year:
        // IDM-2026-001, IDM-2026-002, ...
        //
        // The ID is generated again if another request happens to claim
        // the same number between generation and insert.
        const projectYear =
            new Date().getFullYear();

        const db =
            getDatabaseClient();

        let data = null;
        let error = null;
        let projectData = null;

        const maxIdAttempts = 10;

        for (
            let attempt = 1;
            attempt <= maxIdAttempts;
            attempt += 1
        ) {

            const nextProjectId =
                await getLowestAvailableFormattedId({
                    tableName: "projects",
                    columnName: "project_id",
                    prefix: "IDM",
                    year: projectYear
                });

            projectData = {

                project_id:
                    nextProjectId,

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


            const insertResult =
                await db
                    .from("projects")
                    .insert([projectData])
                    .select()
                    .single();

            data =
                insertResult.data;

            error =
                insertResult.error;


            if (!error) {
                break;
            }


            // PostgreSQL unique_violation. Retry only when the
            // duplicate is related to project_id.
            const duplicateProjectId =
                error.code === "23505" &&
                (
                    String(error.message || "")
                        .toLowerCase()
                        .includes("project_id") ||
                    String(error.details || "")
                        .toLowerCase()
                        .includes("project_id")
                );

            if (
                duplicateProjectId &&
                attempt < maxIdAttempts
            ) {
                console.warn(
                    `Project ID ${nextProjectId} was already claimed. Generating another ID...`
                );

                continue;
            }


            break;
        }


        if (error || !data) {

            console.error(
                "SUPABASE INSERT ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    error?.message ||
                    "Unable to create a unique Project ID.",
                code:
                    error?.code || null,
                details:
                    error?.details || null,
                hint:
                    error?.hint || null
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


            const repositoryDriveFolder =
                await createDriveFolder({
                    name:
                        "Project Repository",

                    parentFolderId:
                        projectDriveFolder.id
                });

                await createDriveFolder({
                    name:
                        "System Release & Deployment",

                    parentFolderId:
                        projectDriveFolder.id
                });


            const {
                data: updatedProject,
                error: driveUpdateError
            } = await db
                .from("projects")
                .update({
                    drive_folder_id:
                        projectDriveFolder.id,

                    drive_folder_url:
                        projectDriveFolder.url,

                    repository_folder_id:
                        repositoryDriveFolder.id,

                    repository_folder_url:
                        repositoryDriveFolder.url,

                    // Keep project_url compatible with older frontend code.
                    project_url:
                        repositoryDriveFolder.url
                })
                .eq(
                    "project_id",
                    data.project_id
                )
                .select()
                .maybeSingle();


            if (driveUpdateError) {
                throw driveUpdateError;
            }


            if (!updatedProject) {
                throw new Error(
                    `Project ${data.project_id} was created, but its Google Drive folder information could not be saved.`
                );
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


            await db
                .from("projects")
                .delete()
                .eq(
                    "project_id",
                    data.project_id
                );


            return res.status(500).json({
                success: false,

                error:
                    "Project could not be created because its Google Drive project/repository folders could not be created.",

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
                    user_id: member?.user_id || null,
                    member_name: String(member?.name || member?.member_name || "").trim(),
                    member_role: String(member?.role || member?.member_role || "").trim() || null
                }))
                .filter(member => member.member_name)
            : [];

        if (teamMembers.length > 0) {
            const { error: membersError } = await db
                .from("project_members")
                .insert(teamMembers);

            if (membersError) {
                console.error("PROJECT CREATED BUT TEAM SAVE FAILED:", membersError);

                // Roll back both Drive and database records.
                await deleteDriveFolder(
                    projectDriveFolder?.id
                );

                await db
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
// DEPLOYMENT CHECKLIST
// ============================================================

const REQUIRED_DEPLOYMENT_DOCUMENTS = [
    "Deployment Record / Turnover Document",
    "INFORMATION REQUISITION FORM",
    "Maintenance Log",
    "REQUIREMENTS AND DESIGN INPUT CHECKLIST AND EVALUATION REPORT",
    "SYSTEM CHANGE FORM",
    "SYSTEM COMPLIANCE MATRIX",
    "SYSTEM DESIGN DOCUMENT",
    "System Test Report"
];

// ============================================================
// GET PROJECT DEPLOYMENT CHECKLIST
// ============================================================

app.get(
    "/api/projects/:projectId/deployment-checklist",
    async (req, res) => {

        try {

            const { projectId } =
                req.params;

            const db =
                getDatabaseClient();


            // ------------------------------------------------
            // VERIFY PROJECT
            // ------------------------------------------------

            const {
                data: project,
                error: projectError
            } = await db
                .from("projects")
                .select(
                    "project_id, project_name, project_status"
                )
                .eq(
                    "project_id",
                    projectId
                )
                .maybeSingle();


            if (projectError) {

                console.error(
                    "DEPLOYMENT CHECKLIST PROJECT LOOKUP ERROR:",
                    projectError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to load the project."
                });
            }


            if (!project) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Project not found."
                });
            }


            // ------------------------------------------------
            // LOAD SAVED DEPLOYMENT DOCUMENTS
            // ------------------------------------------------

            const {
                data: savedDocuments,
                error: documentsError
            } = await db
                .from("deployment_documents")
                .select("*")
                .eq(
                    "project_id",
                    projectId
                );


            if (documentsError) {

                console.error(
                    "DEPLOYMENT DOCUMENTS LOOKUP ERROR:",
                    documentsError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to load the deployment checklist."
                });
            }


            // ------------------------------------------------
            // BUILD ALL 8 CHECKLIST ITEMS
            // ------------------------------------------------

            const documents =
                REQUIRED_DEPLOYMENT_DOCUMENTS.map(
                    documentType => {

                        const saved =
                            (savedDocuments || [])
                                .find(
                                    item =>
                                        item.document_type ===
                                        documentType
                                );


                        if (saved) {

                            return {
                                ...saved,
                                is_submitted:
                                    !!saved.drive_file_id
                            };
                        }


                        return {
                            deployment_document_id:
                                null,

                            project_id:
                                projectId,

                            document_type:
                                documentType,

                            status:
                                "Missing",

                            drive_file_id:
                                null,

                            drive_file_url:
                                null,

                            file_name:
                                null,

                            version:
                                null,

                            submitted_by:
                                null,

                            submitted_at:
                                null,

                            reviewed_by:
                                null,

                            reviewed_at:
                                null,

                            review_remarks:
                                null,

                            is_submitted:
                                false
                        };
                    }
                );


            // ------------------------------------------------
            // CALCULATE READINESS
            // ------------------------------------------------

            const approvedCount =
                documents.filter(
                    document =>
                        document.status ===
                        "Approved"
                ).length;


            const pendingReviewCount =
                documents.filter(
                    document =>
                        document.status ===
                        "Pending Review"
                ).length;


            const needsRevisionCount =
                documents.filter(
                    document =>
                        document.status ===
                        "Needs Revision"
                ).length;


            const missingCount =
                documents.filter(
                    document =>
                        document.status ===
                        "Missing"
                ).length;


            const readyForDeployment =
                approvedCount ===
                REQUIRED_DEPLOYMENT_DOCUMENTS.length;


            // ------------------------------------------------
            // RESPONSE
            // ------------------------------------------------

            return res.json({

                success:
                    true,

                project: {
                    project_id:
                        project.project_id,

                    project_name:
                        project.project_name,

                    project_status:
                        project.project_status
                },

                summary: {
                    total:
                        REQUIRED_DEPLOYMENT_DOCUMENTS.length,

                    approved:
                        approvedCount,

                    pending_review:
                        pendingReviewCount,

                    needs_revision:
                        needsRevisionCount,

                    missing:
                        missingCount,

                    ready_for_deployment:
                        readyForDeployment
                },

                documents:
                    documents
            });


        } catch (error) {

            console.error(
                "GET DEPLOYMENT CHECKLIST ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    "Could not load the deployment checklist.",
                details:
                    error.message
            });
        }
    }
);


// ============================================================
// UPLOAD DEPLOYMENT CHECKLIST DOCUMENT
// ============================================================

app.post(
    "/api/projects/:projectId/deployment-checklist/upload",

    express.raw({
        type:
            "application/octet-stream",

        limit:
            "25mb"
    }),

    async (req, res) => {

        try {

            const { projectId } =
                req.params;


            const documentType =
                decodeURIComponent(
                    req.get("X-Document-Type") ||
                    ""
                ).trim();


            const fileName =
                decodeURIComponent(
                    req.get("X-File-Name") ||
                    ""
                ).trim();


            const mimeType =
                decodeURIComponent(
                    req.get("X-File-Mime-Type") ||
                    "application/octet-stream"
                ).trim();


            if (
                !REQUIRED_DEPLOYMENT_DOCUMENTS.includes(
                    documentType
                )
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Invalid deployment document type."
                });
            }


            if (!fileName) {
                return res.status(400).json({
                    success: false,
                    error:
                        "File name is required."
                });
            }


            if (
                !Buffer.isBuffer(req.body) ||
                req.body.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Uploaded file is empty."
                });
            }


            const db =
                getDatabaseClient();


            const {
                data: project,
                error: projectError
            } = await db
                .from("projects")
                .select(
                    "project_id, project_name, drive_folder_id"
                )
                .eq(
                    "project_id",
                    projectId
                )
                .maybeSingle();


            if (projectError) {
                throw projectError;
            }


            if (!project) {
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
                        "Project Google Drive folder is missing."
                });
            }


            let releaseFolder =
                await findChildDriveFolder(
                    project.drive_folder_id,
                    "System Release & Deployment"
                );


            if (!releaseFolder) {
                const createdReleaseFolder =
                    await createDriveFolder({
                        name:
                            "System Release & Deployment",

                        parentFolderId:
                            project.drive_folder_id
                    });

                releaseFolder = {
                    id:
                        createdReleaseFolder.id,

                    name:
                        createdReleaseFolder.name
                };
            }


            let documentFolder =
                await findChildDriveFolder(
                    releaseFolder.id,
                    documentType
                );


            if (!documentFolder) {
                const createdDocumentFolder =
                    await createDriveFolder({
                        name:
                            documentType,

                        parentFolderId:
                            releaseFolder.id
                    });

                documentFolder = {
                    id:
                        createdDocumentFolder.id,

                    name:
                        createdDocumentFolder.name
                };
            }


            const {
                data: existingDocument,
                error: existingError
            } = await db
                .from("deployment_documents")
                .select(
                    "deployment_document_id, version"
                )
                .eq(
                    "project_id",
                    projectId
                )
                .eq(
                    "document_type",
                    documentType
                )
                .maybeSingle();


            if (existingError) {
                throw existingError;
            }


            const nextVersion =
                existingDocument
                    ? Number(
                        existingDocument.version || 1
                    ) + 1
                    : 1;


            const uploaded =
                await uploadBufferToDrive({
                    fileName:
                        fileName,

                    mimeType:
                        mimeType,

                    buffer:
                        req.body,

                    parentFolderId:
                        documentFolder.id
                });


            if (!uploaded?.id) {
                throw new Error(
                    "Google Drive did not return an uploaded file ID."
                );
            }


            const now =
                new Date().toISOString();


            const documentData = {
                project_id:
                    projectId,

                document_type:
                    documentType,

                status:
                    "Pending Review",

                drive_file_id:
                    uploaded.id,

                drive_file_url:
                    uploaded.webViewLink ||
                    null,

                file_name:
                    uploaded.name ||
                    fileName,

                version:
                    nextVersion,

                submitted_by:
                    req.authUser?.id ||
                    null,

                submitted_at:
                    now,

                reviewed_by:
                    null,

                reviewed_at:
                    null,

                review_remarks:
                    null,

                updated_at:
                    now
            };


            const {
                data: savedDocument,
                error: saveError
            } = await db
                .from("deployment_documents")
                .upsert(
                    documentData,
                    {
                        onConflict:
                            "project_id,document_type"
                    }
                )
                .select()
                .single();


            if (saveError) {
                console.error(
                    "SAVE DEPLOYMENT DOCUMENT ERROR:",
                    saveError
                );

                try {
                    await googleDrive.files.delete({
                        fileId:
                            uploaded.id
                    });
                } catch (_) {
                    // Ignore rollback failure.
                }

                throw saveError;
            }


            return res.status(201).json({
                success:
                    true,

                message:
                    "Deployment document uploaded successfully.",

                document:
                    savedDocument
            });


        } catch (error) {

            console.error(
                "UPLOAD DEPLOYMENT DOCUMENT ERROR:",
                error
            );


            return res.status(500).json({
                success: false,
                error:
                    "Could not upload deployment document.",
                details:
                    error.message
            });
        }
    }
);


// ============================================================
// LIST PROJECT REPOSITORY CONTENTS
// ============================================================

app.get(
    "/api/projects/:projectId/repository/files",
    async (req, res) => {

        try {

            const { projectId } =
                req.params;

            // Use the trusted server-side database client.
            // The plain Supabase client may be blocked by RLS and falsely
            // return "Project not found." even though the project exists.
            const db =
                getDatabaseClient();

            const {
                data: project,
                error: projectError
            } = await db
                .from("projects")
                .select(
                    "project_id, project_name, drive_folder_id, drive_folder_url"
                )
                .eq(
                    "project_id",
                    projectId
                )
                .maybeSingle();


            if (projectError) {

                console.error(
                    "PROJECT REPOSITORY LOOKUP ERROR:",
                    projectError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to load the project.",
                    details:
                        projectError.message
                });
            }


            if (!project) {

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
                        "Project Repository folder is missing for this project."
                });
            }


            const items =
                await listDriveFolderContents(
                     project.drive_folder_id
                );


            return res.json({
                success: true,

                project: {
                    project_id:
                        project.project_id,

                    project_name:
                        project.project_name,

                    drive_folder_url:
                        project.drive_folder_url
                },

                items:
                    items
            });

        } catch (error) {

            console.error(
                "LIST PROJECT REPOSITORY ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    "Could not load Project Repository files.",
                details:
                    error.message
            });
        }
    }
);


// ============================================================
// UPLOAD FILE TO PROJECT REPOSITORY
// ============================================================

app.post(
    "/api/projects/:projectId/repository/upload",
    express.raw({
        type:
            "application/octet-stream",

        limit:
            "25mb"
    }),
    async (req, res) => {

        try {

            const { projectId } =
                req.params;

            const fileName =
                decodeURIComponent(
                    req.get("X-File-Name") ||
                    ""
                ).trim();

            const mimeType =
                decodeURIComponent(
                    req.get("X-File-Mime-Type") ||
                    "application/octet-stream"
                ).trim();

            const relativePath =
                decodeURIComponent(
                    req.get("X-Relative-Path") ||
                    ""
                ).trim();

            const uploadDestination =
                String(
                    req.get("X-Upload-Destination") ||
                    "repository"
                ).trim();


            if (!fileName) {

                return res.status(400).json({
                    success: false,
                    error:
                        "File name is required."
                });
            }


            if (
                !Buffer.isBuffer(req.body) ||
                req.body.length === 0
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Uploaded file is empty."
                });
            }


            // Use the trusted server database client here. The plain Supabase
            // client can be blocked by RLS for development-team accounts and
            // incorrectly return "Project not found" for an assigned project.
            const db = getDatabaseClient();

            const {
                data: project,
                error: projectError
            } = await db
                .from("projects")
                .select(
                "project_id, drive_folder_id, repository_folder_id, repository_folder_url"
            )
                .eq(
                    "project_id",
                    projectId
                )
                .maybeSingle();


            if (projectError) {

                console.error(
                    "PROJECT REPOSITORY UPLOAD LOOKUP ERROR:",
                    projectError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to load the project.",
                    details:
                        projectError.message
                });
            }


            if (!project) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Project not found."
                });
            }


            let baseFolderId;

            if (uploadDestination === "release") {

                if (!project.drive_folder_id) {
                    return res.status(400).json({
                        success: false,
                        error:
                            "Project Google Drive folder is missing for this project."
                    });
                }

                const releaseFolder =
                    await findChildDriveFolder(
                        project.drive_folder_id,
                        "System Release & Deployment"
                    );

                if (!releaseFolder?.id) {
                    return res.status(400).json({
                        success: false,
                        error:
                            "System Release & Deployment folder is missing for this project."
                    });
                }

                baseFolderId =
                    releaseFolder.id;

            } else {

                if (!project.repository_folder_id) {
                    return res.status(400).json({
                        success: false,
                        error:
                            "Project Repository folder is missing for this project."
                    });
                }

                baseFolderId =
                    project.repository_folder_id;
            }

            const destinationFolderId =
                await ensureDriveFolderPath(
                    baseFolderId,
                    relativePath
                );


            const uploaded =
                await uploadBufferToDrive({
                    fileName:
                        fileName,

                    mimeType:
                        mimeType,

                    buffer:
                        req.body,

                    parentFolderId:
                        destinationFolderId
                });


            return res.status(201).json({
                success: true,

                message:
                    "File uploaded successfully.",

                file: {
                    id:
                        uploaded.id,

                    name:
                        uploaded.name,

                    mime_type:
                        uploaded.mimeType,

                    url:
                        uploaded.webViewLink ||
                        null,

                    relative_path:
                        relativePath ||
                        null
                }
            });

        } catch (error) {

            console.error(
                "PROJECT REPOSITORY UPLOAD ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    "File could not be uploaded to Project Repository.",
                details:
                    error.message
            });
        }
    }
);


// ============================================================
// GET NEXT PROJECT ID
// Preview only - the database sequence still generates the real ID
// ============================================================

app.get("/api/projects-next-id", async (req, res) => {

    try {

        const nextProjectId =
            await getLowestAvailableFormattedId({
                tableName: "projects",
                columnName: "project_id",
                prefix: "IDM",
                year: new Date().getFullYear()
            });

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


            const db =
                getDatabaseClient();

            const {
                data,
                error
            } = await db
                .from("projects")
                .update(projectData)
                .eq(
                    "project_id",
                    projectId
                )
                .select()
                .maybeSingle();


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
            const { error: deleteMembersError } = await db
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
                        user_id: member?.user_id || null,
                        member_name: String(member?.name || member?.member_name || "").trim(),
                        member_role: String(member?.role || member?.member_role || "").trim() || null
                    }))
                    .filter(member => member.member_name)
                : [];

            if (teamMembers.length > 0) {
                const { error: insertMembersError } = await db
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
// Admin-only access is enforced by authorizeApiRequest().
//
// Delete is intentionally idempotent. If the browser accidentally sends
// the same DELETE request twice, the second request returns success instead
// of a false "Project not found." error.
// ============================================================

app.delete(
    "/api/projects/:projectId",
    async (req, res) => {

        try {

            const { projectId } =
                req.params;

            const db =
                getDatabaseClient();


            // Delete and return the deleted row in ONE database operation.
            // This avoids the lookup-then-delete race where two near-simultaneous
            // DELETE requests can both pass the lookup but one then sees the row
            // missing after the other request deletes it.
            const {
                data: deletedProject,
                error: deleteError
            } = await db
                .from("projects")
                .delete()
                .eq(
                    "project_id",
                    projectId
                )
                .select("*")
                .maybeSingle();


            if (deleteError) {

                console.error(
                    "SUPABASE PROJECT DELETE ERROR:",
                    deleteError
                );

                return res.status(500).json({
                    success: false,
                    error: deleteError.message,
                    code: deleteError.code,
                    details: deleteError.details,
                    hint: deleteError.hint
                });
            }


            // A duplicate DELETE request may arrive after the first one already
            // removed the row. Treat that as success so the UI never shows a
            // misleading "Project not found." message.
            if (!deletedProject) {

                return res.json({
                    success: true,
                    already_deleted: true,
                    message:
                        "Project was already deleted."
                });
            }


            // Remove the project's top-level Google Drive folder after the
            // database delete succeeds. Its Project Repository and task
            // folders are children, so deleting the parent removes the tree.
            if (deletedProject.drive_folder_id) {
                await deleteDriveFolder(
                    deletedProject.drive_folder_id
                );
            }


            res.json({
                success: true,
                already_deleted: false,
                message:
                    "Project deleted successfully.",
                project:
                    deletedProject
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

            const db =
                getDatabaseClient();

            const {
                data,
                error
            } = await db
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


            // Pull every Development Team member connected
            // to this project once, then attach the same team
            // to each task returned for the project.
            const {
                data: projectMembers,
                error: membersError
            } = await db
                .from("project_members")
                .select(
                    "user_id, member_name, created_at"
                )
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

            if (membersError) {

                console.error(
                    "Get project development team error:",
                    membersError
                );

                return res.status(500).json({
                    success: false,
                    error: membersError.message
                });
            }


            const developmentTeam =
                (projectMembers || [])
                    .map(member =>
                        String(
                            member.member_name ||
                            ""
                        ).trim()
                    )
                    .filter(Boolean)
                    .filter(
                        (name, index, list) =>
                            list.indexOf(name) === index
                    )
                    .join(", ");


            const tasksWithDevelopmentTeam =
                (data || []).map(task => ({
                    ...task,

                    development_team:
                        developmentTeam || "-"
                }));


            res.json({
                success: true,
                tasks:
                    tasksWithDevelopmentTeam
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
// TASK REPOSITORY HELPERS
// Each task already has its own Google Drive folder.
// A child folder named "Task Repository" is created lazily so
// existing tasks also work without any database migration.
// ============================================================

async function ensureTaskRepositoryFolder(taskId) {

    // Use the trusted server-side database client here as well.
    // This prevents RLS from making an existing assigned task appear missing.
    const db =
        getDatabaseClient();

    const {
        data: task,
        error: taskError
    } = await db
        .from("tasks")
        .select(
            "task_id, project_id, task_activity, drive_folder_id, drive_folder_url"
        )
        .eq("task_id", taskId)
        .maybeSingle();

    if (taskError) {
        console.error(
            "TASK REPOSITORY LOOKUP ERROR:",
            taskError
        );

        const error =
            new Error(
                "Unable to load the task."
            );

        error.statusCode = 500;
        throw error;
    }

    if (!task) {
        const error =
            new Error(
                "Task not found."
            );

        error.statusCode = 404;
        throw error;
    }

    if (!task.drive_folder_id) {
        const error = new Error(
            "This task does not have a Google Drive folder yet."
        );
        error.statusCode = 400;
        throw error;
    }

    let repositoryFolder =
        await findChildDriveFolder(
            task.drive_folder_id,
            "Task Repository"
        );

    if (!repositoryFolder) {
        const created = await createDriveFolder({
            name: "Task Repository",
            parentFolderId: task.drive_folder_id
        });

        repositoryFolder = {
            id: created.id,
            name: created.name,
            webViewLink: created.url
        };
    }

    return {
        task,
        repository: {
            id: repositoryFolder.id,
            name:
                repositoryFolder.name ||
                "Task Repository",
            url:
                repositoryFolder.webViewLink ||
                getDriveFolderUrl(
                    repositoryFolder.id
                )
        }
    };
}


// ============================================================
// LIST TASK REPOSITORY CONTENTS
// ============================================================

app.get(
    "/api/tasks/:taskId/repository/files",
    async (req, res) => {

        try {

            const { taskId } = req.params;

            const {
                task,
                repository
            } = await ensureTaskRepositoryFolder(
                taskId
            );

            const items =
                await listDriveFolderContents(
                    repository.id
                );

            return res.json({
                success: true,
                task: {
                    task_id: task.task_id,
                    project_id: task.project_id,
                    task_activity: task.task_activity,
                    drive_folder_url:
                        task.drive_folder_url,
                    repository_folder_id:
                        repository.id,
                    repository_folder_url:
                        repository.url
                },
                items
            });

        } catch (error) {

            console.error(
                "LIST TASK REPOSITORY ERROR:",
                error
            );

            return res
                .status(error.statusCode || 500)
                .json({
                    success: false,
                    error:
                        error.statusCode
                            ? error.message
                            : "Could not load Task Repository files.",
                    details:
                        error.statusCode
                            ? undefined
                            : error.message
                });
        }
    }
);


// ============================================================
// UPLOAD FILE TO TASK REPOSITORY
// ============================================================

app.post(
    "/api/tasks/:taskId/repository/upload",
    express.raw({
        type: "application/octet-stream",
        limit: "25mb"
    }),
    async (req, res) => {

        try {

            const { taskId } = req.params;

            const fileName =
                decodeURIComponent(
                    req.get("X-File-Name") || ""
                ).trim();

            const mimeType =
                decodeURIComponent(
                    req.get("X-File-Mime-Type") ||
                    "application/octet-stream"
                ).trim();

            const relativePath =
                decodeURIComponent(
                    req.get("X-Relative-Path") || ""
                ).trim();

            if (!fileName) {
                return res.status(400).json({
                    success: false,
                    error: "File name is required."
                });
            }

            if (
                !Buffer.isBuffer(req.body) ||
                req.body.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    error: "Uploaded file is empty."
                });
            }

            const {
                repository
            } = await ensureTaskRepositoryFolder(
                taskId
            );

            const destinationFolderId =
                await ensureDriveFolderPath(
                    repository.id,
                    relativePath
                );

            const uploaded =
                await uploadBufferToDrive({
                    fileName,
                    mimeType,
                    buffer: req.body,
                    parentFolderId:
                        destinationFolderId
                });

            return res.status(201).json({
                success: true,
                message:
                    "File uploaded successfully.",
                repository_folder_url:
                    repository.url,
                file: {
                    id: uploaded.id,
                    name: uploaded.name,
                    mime_type:
                        uploaded.mimeType,
                    url:
                        uploaded.webViewLink ||
                        null,
                    relative_path:
                        relativePath || null
                }
            });

        } catch (error) {

            console.error(
                "TASK REPOSITORY UPLOAD ERROR:",
                error
            );

            return res
                .status(error.statusCode || 500)
                .json({
                    success: false,
                    error:
                        error.statusCode
                            ? error.message
                            : "File could not be uploaded to Task Repository.",
                    details:
                        error.statusCode
                            ? undefined
                            : error.message
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

            const db =
                getDatabaseClient();

            // Find the project that owns this task.
            const {
                data: taskRecord,
                error: taskError
            } = await db
                .from("tasks")
                .select("task_id, project_id")
                .eq(
                    "task_id",
                    taskId
                )
                .maybeSingle();

            if (taskError) {

                console.error(
                    "GET TASK HISTORY LOOKUP ERROR:",
                    taskError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to load the task.",
                    details:
                        taskError.message
                });
            }


            if (!taskRecord) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Task not found."
                });
            }


            // Pull every Development Team member assigned
            // to the task's project.
            const {
                data: projectMembers,
                error: membersError
            } = await db
                .from("project_members")
                .select(
                    "user_id, member_name, created_at"
                )
                .eq(
                    "project_id",
                    taskRecord.project_id
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );

            if (membersError) {
                throw membersError;
            }


            const developmentTeam =
                (projectMembers || [])
                    .map(member =>
                        String(
                            member.member_name ||
                            ""
                        ).trim()
                    )
                    .filter(Boolean)
                    .filter(
                        (name, index, list) =>
                            list.indexOf(name) === index
                    )
                    .join(", ");


            const {
                data,
                error
            } = await db
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


            const historyWithDevelopmentTeam =
                (data || []).map(item => ({
                    ...item,

                    development_team:
                        developmentTeam || "-"
                }));


            console.log(
                "History records found:",
                historyWithDevelopmentTeam.length
            );

            res.json({

                success: true,

                history:
                    historyWithDevelopmentTeam
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

            // All database work below runs through the trusted server client.
            // Authorization has already verified that the logged-in user can
            // access this project.
            const db =
                getDatabaseClient();

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
            } = await db
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


            const nextTaskId =
                await getLowestAvailableFormattedId({
                    tableName: "tasks",
                    columnName: "task_id",
                    prefix: "TASK"
                });

            const taskData = {

                task_id:
                    nextTaskId,

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
                    getLoggedInDisplayName(req),

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
            } = await db
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
                } = await db
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


                await db
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
                        getLoggedInDisplayName(req)
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

            // Authorization already verified access. Use the trusted
            // server-side client so RLS cannot hide an existing task.
            const db =
                getDatabaseClient();

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
            } = await db
                .from("tasks")
                .select("*")
                .eq("task_id", taskId)
                .maybeSingle();

            if (oldTaskError) {
                console.error(
                    "GET OLD TASK ERROR:",
                    oldTaskError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to load the task.",
                    details:
                        oldTaskError.message
                });
            }

            if (!oldTask) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Task not found."
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
                    getLoggedInDisplayName(req),

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
            } = await db
                .from("tasks")
                .update(taskData)
                .eq("task_id", taskId)
                .select()
                .maybeSingle();

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

            if (!data) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Task not found."
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
                        getLoggedInDisplayName(req)
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

            // Authorization already verified access. Use the trusted
            // server-side client so RLS cannot hide an existing task.
            const db =
                getDatabaseClient();

            const {
                data: oldTask,
                error: oldTaskError
            } = await db
                .from("tasks")
                .select("*")
                .eq(
                    "task_id",
                    taskId
                )
                .maybeSingle();

            if (oldTaskError) {

                console.error(
                    "GET TASK FOR REVIEW ERROR:",
                    oldTaskError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to load the task.",
                    details:
                        oldTaskError.message
                });
            }

            if (!oldTask) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Task not found."
                });
            }

            const {
                review_result,
                review_date,
                remarks
            } = req.body;

            const reviewed_verified_by =
                getLoggedInDisplayName(req);

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
                    reviewed_verified_by,

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
            } = await db
                .from("tasks")
                .update(reviewData)
                .eq(
                    "task_id",
                    taskId
                )
                .select()
                .maybeSingle();

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

            if (!data) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Task not found."
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
                        getLoggedInDisplayName(req)
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
// Admin-only access is enforced by authorizeApiRequest().
// Duplicate DELETE requests are treated as success.
// ============================================================

app.delete(
    "/api/tasks/:taskId",
    async (req, res) => {

        try {

            const { taskId } =
                req.params;

            const db =
                getDatabaseClient();

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
            } = await db
                .from("tasks")
                .select("*")
                .eq(
                    "task_id",
                    taskId
                )
                .maybeSingle();

            if (taskError) {

                console.error(
                    "SUPABASE TASK LOOKUP ERROR:",
                    taskError
                );

                return res.status(500).json({
                    success: false,
                    error: taskError.message,
                    code: taskError.code,
                    details: taskError.details,
                    hint: taskError.hint
                });
            }

            // If the browser accidentally sent DELETE twice, the second
            // request should not show a false "Task not found." failure.
            if (!task) {

                return res.json({
                    success: true,
                    already_deleted: true,
                    message:
                        "Task was already deleted."
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
                        getLoggedInDisplayName(req)
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
                data: deletedTask,
                error: deleteError
            } = await db
                .from("tasks")
                .delete()
                .eq(
                    "task_id",
                    taskId
                )
                .select("*")
                .maybeSingle();

            if (deleteError) {

                console.error(
                    "SUPABASE TASK DELETE ERROR:",
                    deleteError
                );

                return res.status(500).json({
                    success: false,
                    error: deleteError.message,
                    code: deleteError.code,
                    details: deleteError.details,
                    hint: deleteError.hint
                });
            }

            if (!deletedTask) {

                return res.json({
                    success: true,
                    already_deleted: true,
                    message:
                        "Task was already deleted."
                });
            }

            // The Task Repository is inside the task Drive folder, so
            // deleting this folder removes the task's repository as well.
            if (deletedTask.drive_folder_id) {

                await deleteDriveFolder(
                    deletedTask.drive_folder_id
                );
            }

            res.json({

                success: true,

                already_deleted:
                    false,

                message:
                    "Task deleted successfully.",

                historyRecorded:
                    true,

                task:
                    deletedTask
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
        const db = getDatabaseClient();

        const { data, error } = await db
            .from("project_members")
            .select("project_member_id, project_id, user_id, member_name, member_role, created_at")
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
        const userId = req.body.user_id || null;
        const db = getDatabaseClient();

        if (!memberName) {
            return res.status(400).json({
                success: false,
                error: "Team member name is required."
            });
        }

        const { data, error } = await db
            .from("project_members")
            .insert([{
                project_id: projectId,
                user_id: userId,
                member_name: memberName,
                member_role: memberRole || null
            }])
            .select("project_member_id, project_id, user_id, member_name, member_role, created_at")
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
        const db = getDatabaseClient();

        if (!memberName) {
            return res.status(400).json({ success: false, error: "Team member name is required." });
        }

        const { data, error } = await db
            .from("project_members")
            .update({ member_name: memberName, member_role: memberRole || null })
            .eq("project_member_id", memberId)
            .select("project_member_id, project_id, user_id, member_name, member_role, created_at")
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
        const db = getDatabaseClient();

        const { data, error } = await db
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