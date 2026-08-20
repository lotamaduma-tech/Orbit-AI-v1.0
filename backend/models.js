"use strict";

const Groq = require("groq-sdk");
require("dotenv").config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function getModels() {

    try {

        const models = await groq.models.list();

        console.log("\n========================================");
        console.log("       GROQ AVAILABLE MODELS");
        console.log("========================================\n");

        for (const model of models.data) {

            console.log(model.id);

        }

        console.log("\n========================================\n");

    } catch (error) {

        console.error("❌ Could not retrieve Groq models.");

        console.error(
            error.message || error
        );

    }

}

getModels();