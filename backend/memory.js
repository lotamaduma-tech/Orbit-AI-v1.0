/* =========================================================
   ORBIT AI
   PERSISTENT ONLINE MEMORY SYSTEM

   Storage:
   Supabase
   Table:
   user_memory

   Required environment variables:
   SUPABASE_URL
   SUPABASE_SECRET_KEY
========================================================= */

"use strict";

const { createClient } = require("@supabase/supabase-js");

/* =========================================================
   SUPABASE CONFIGURATION
========================================================= */

const SUPABASE_URL =
    process.env.SUPABASE_URL;

const SUPABASE_SECRET_KEY =
    process.env.SUPABASE_SECRET_KEY;

/* =========================================================
   VALIDATE CONFIGURATION
========================================================= */

if (!SUPABASE_URL) {

    console.error(
        "❌ SUPABASE_URL is missing from environment variables."
    );
}

if (!SUPABASE_SECRET_KEY) {

    console.error(
        "❌ SUPABASE_SECRET_KEY is missing from environment variables."
    );
}

/* =========================================================
   SUPABASE CLIENT
========================================================= */

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY
);

/* =========================================================
   GET USER MEMORY
========================================================= */

async function getUserMemory(userId) {

    if (!userId) {
        return [];
    }

    try {

        const { data, error } =
            await supabase
                .from("user_memory")
                .select("memory")
                .eq("user_id", userId)
                .order("created_at", {
                    ascending: true
                });

        if (error) {

            throw error;

        }

        if (!Array.isArray(data)) {

            return [];

        }

        return data
            .map((item) => item.memory)
            .filter(
                (item) =>
                    typeof item === "string" &&
                    item.trim().length > 0
            );

    } catch (error) {

        console.error(
            "❌ Failed to load user memory:",
            error.message
        );

        return [];

    }
}

/* =========================================================
   SAVE USER MEMORY
========================================================= */

async function saveUserMemory(
    userId,
    memories
) {

    if (!userId) {

        throw new Error(
            "User ID is required."
        );

    }

    if (!Array.isArray(memories)) {

        throw new Error(
            "Memory must be an array."
        );

    }

    const validMemories = [
        ...new Set(
            memories
                .filter(
                    (item) =>
                        typeof item === "string" &&
                        item.trim().length > 0
                )
                .map(
                    (item) =>
                        item.trim()
                )
        )
    ].slice(-50);

    try {

        /* =================================================
           REMOVE OLD MEMORY
        ================================================= */

        const { error: deleteError } =
            await supabase
                .from("user_memory")
                .delete()
                .eq("user_id", userId);

        if (deleteError) {

            throw deleteError;

        }

        /* =================================================
           NOTHING TO SAVE
        ================================================= */

        if (validMemories.length === 0) {

            return true;

        }

        /* =================================================
           BUILD DATABASE RECORDS
        ================================================= */

        const records =
            validMemories.map(
                (memory) => ({
                    user_id: userId,
                    memory: memory
                })
            );

        /* =================================================
           SAVE NEW MEMORY
        ================================================= */

        const { error: insertError } =
            await supabase
                .from("user_memory")
                .insert(records);

        if (insertError) {

            throw insertError;

        }

        return true;

    } catch (error) {

        console.error(
            "❌ Failed to save user memory:",
            error.message
        );

        throw error;

    }
}

/* =========================================================
   ADD SINGLE MEMORY
========================================================= */

async function addUserMemory(
    userId,
    memory
) {

    if (
        !userId ||
        typeof memory !== "string" ||
        !memory.trim()
    ) {

        return false;

    }

    const existingMemory =
        await getUserMemory(userId);

    const combinedMemory = [
        ...existingMemory,
        memory.trim()
    ];

    const uniqueMemory = [
        ...new Set(combinedMemory)
    ].slice(-50);

    await saveUserMemory(
        userId,
        uniqueMemory
    );

    return true;
}

/* =========================================================
   CLEAR USER MEMORY
========================================================= */

async function clearUserMemory(
    userId
) {

    if (!userId) {

        return false;

    }

    try {

        const { error } =
            await supabase
                .from("user_memory")
                .delete()
                .eq("user_id", userId);

        if (error) {

            throw error;

        }

        return true;

    } catch (error) {

        console.error(
            "❌ Failed to clear user memory:",
            error.message
        );

        throw error;

    }
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {

    getUserMemory,
    saveUserMemory,
    addUserMemory,
    clearUserMemory

};