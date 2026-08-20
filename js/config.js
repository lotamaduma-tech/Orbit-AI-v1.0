/* =========================================================
   ORBIT AI
   GLOBAL CONFIGURATION
   ========================================================= */


/* =========================================================
   ENVIRONMENT
   ========================================================= */

const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";


/* =========================================================
   API URLS
   ========================================================= */

/*
   LOCAL DEVELOPMENT

   Your backend currently runs on:
   http://localhost:5000
*/

const LOCAL_API_URL =
    "http://localhost:5000/api";


/*
   PRODUCTION

   IMPORTANT:
   Replace this URL with the actual URL of your
   Render backend.

   Example:

   https://orbit-ai-backend.onrender.com/api
*/

const PRODUCTION_API_URL =
    "https://orbit-ai-v1-0.onrender.com/";


/* =========================================================
   SELECT ACTIVE API
   ========================================================= */

const ORBIT_API_BASE_URL =
    isLocalhost
        ? LOCAL_API_URL
        : PRODUCTION_API_URL;


/* =========================================================
   ORBIT API ENDPOINTS
   ========================================================= */

const ORBIT_API_URL =
    `${ORBIT_API_BASE_URL}/chat`;


/* =========================================================
   GLOBAL CONFIG OBJECT
   ========================================================= */

window.ORBIT_CONFIG = {

    apiBaseUrl: ORBIT_API_BASE_URL,

    chatUrl: ORBIT_API_URL,

    environment:
        isLocalhost
            ? "development"
            : "production"

};


/* =========================================================
   BACKWARD COMPATIBILITY
   ========================================================= */

/*
   assistant.js can access the API using:

   window.ORBIT_API_URL
*/

window.ORBIT_API_URL = ORBIT_API_URL;


/* =========================================================
   DEBUG INFORMATION
   ========================================================= */

console.log(
    `%cORBIT AI`,
    "font-weight:700;font-size:16px;"
);

console.log(
    `Environment: ${window.ORBIT_CONFIG.environment}`
);

console.log(
    `API: ${window.ORBIT_API_URL}`
);