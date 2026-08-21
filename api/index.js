const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// TEST SUPABASE
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
            message: "Supabase connection successful",
            projects: data
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = app;