/* ===========================================================
   ORBIT AI — TOOLS & ATTACHMENTS
   ===========================================================

   Handles:

   - Orbit tools button
   - Image uploads
   - File uploads
   - Multiple attachments
   - Attachment previews
   - Removing attachments
   - File validation
   - Image validation
   - Attachment state

   IMPORTANT:

   This file handles the FRONTEND attachment system.

   The backend/API must later be updated to actually
   process image and document contents.

   =========================================================== */

"use strict";


/* ===========================================================
   CONFIGURATION
   =========================================================== */

/*
   Maximum number of files that can be attached
   to one message.
*/

const ORBIT_MAX_ATTACHMENTS = 5;


/*
   Maximum size for a single attachment.

   20 MB is a reasonable frontend limit.
*/

const ORBIT_MAX_FILE_SIZE = 20 * 1024 * 1024;


/*
   Supported image types.
*/

const ORBIT_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
];


/*
   Supported document/file types.

   We can expand this later when the backend
   supports additional formats.
*/

const ORBIT_DOCUMENT_TYPES = [
    "application/pdf",

    "text/plain",
    "text/csv",
    "text/html",
    "text/css",
    "text/javascript",
    "application/javascript",
    "application/json",

    "application/rtf",

    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];


/*
   All supported MIME types.
*/

const ORBIT_ALLOWED_FILE_TYPES = [
    ...ORBIT_IMAGE_TYPES,
    ...ORBIT_DOCUMENT_TYPES,
];


/* ===========================================================
   STATE
   =========================================================== */

let orbitAttachments = [];


/* ===========================================================
   GET ELEMENTS
   =========================================================== */

function getOrbitToolsElements() {

    return {
        toolsButton: document.getElementById("orbit-tools-btn"),
        commandBox: document.querySelector(".command-box"),
    };

}


/* ===========================================================
   CREATE FILE INPUT
   =========================================================== */

function createOrbitFileInput() {

    const existingInput =
        document.getElementById("orbit-file-input");

    if (existingInput) {
        return existingInput;
    }


    const input = document.createElement("input");

    input.type = "file";

    input.id = "orbit-file-input";

    input.multiple = true;

    input.hidden = true;

    /*
       Allow common images and documents.
    */

    input.accept = [
        "image/*",

        ".pdf",
        ".txt",
        ".csv",
        ".html",
        ".css",
        ".js",
        ".json",
        ".rtf",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".ppt",
        ".pptx",
    ].join(",");


    document.body.appendChild(input);

    return input;

}


/* ===========================================================
   VALIDATE FILE
   =========================================================== */

function validateOrbitFile(file) {

    if (!file) {
        return {
            valid: false,
            reason: "Invalid file.",
        };
    }


    /*
       Check file size.
    */

    if (file.size > ORBIT_MAX_FILE_SIZE) {

        return {
            valid: false,
            reason: `"${file.name}" is larger than 20 MB.`,
        };

    }


    /*
       Check MIME type.
    */

    if (
        file.type &&
        ORBIT_ALLOWED_FILE_TYPES.includes(file.type)
    ) {

        return {
            valid: true,
            reason: "",
        };

    }


    /*
       Some browsers don't provide a MIME type
       for certain files.
  
       Fall back to extension checking.
    */

    const extension =
        file.name
            .split(".")
            .pop()
            ?.toLowerCase();


    const allowedExtensions = [
        "jpg",
        "jpeg",
        "png",
        "webp",
        "gif",
        "svg",

        "pdf",
        "txt",
        "csv",
        "html",
        "css",
        "js",
        "json",
        "rtf",

        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
    ];


    if (extension && allowedExtensions.includes(extension)) {

        return {
            valid: true,
            reason: "",
        };

    }


    return {
        valid: false,
        reason: `"${file.name}" is not a supported file type.`,
    };

}


/* ===========================================================
   CHECK DUPLICATE FILE
   =========================================================== */

function orbitAttachmentExists(file) {

    return orbitAttachments.some((attachment) => {

        return (
            attachment.name === file.name &&
            attachment.size === file.size &&
            attachment.lastModified === file.lastModified
        );

    });

}


/* ===========================================================
   ADD ATTACHMENT
   =========================================================== */

function addOrbitAttachment(file) {

    if (!file) {
        return false;
    }


    /*
       Maximum attachment count.
    */

    if (
        orbitAttachments.length >=
        ORBIT_MAX_ATTACHMENTS
    ) {

        showOrbitToolsNotice(
            `You can attach up to ${ORBIT_MAX_ATTACHMENTS} files.`
        );

        return false;

    }


    /*
       Validate file.
    */

    const validation =
        validateOrbitFile(file);


    if (!validation.valid) {

        showOrbitToolsNotice(
            validation.reason
        );

        return false;

    }


    /*
       Prevent duplicates.
    */

    if (orbitAttachmentExists(file)) {

        showOrbitToolsNotice(
            `"${file.name}" is already attached.`
        );

        return false;

    }


    /*
       Create attachment object.
    */

    const attachment = {

        id:
            "orbit-attachment-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 9),

        file: file,

        name: file.name,

        size: file.size,

        type: file.type,

        lastModified: file.lastModified,

        isImage:
            file.type.startsWith("image/"),

        previewUrl:
            file.type.startsWith("image/")
                ? URL.createObjectURL(file)
                : null,

    };


    orbitAttachments.push(attachment);


    renderOrbitAttachments();


    return true;

}


/* ===========================================================
   REMOVE ATTACHMENT
   =========================================================== */

function removeOrbitAttachment(id) {

    const index =
        orbitAttachments.findIndex(
            (attachment) =>
                attachment.id === id
        );


    if (index === -1) {
        return;
    }


    const attachment =
        orbitAttachments[index];


    /*
       Release image preview memory.
    */

    if (attachment.previewUrl) {

        URL.revokeObjectURL(
            attachment.previewUrl
        );

    }


    orbitAttachments.splice(
        index,
        1
    );


    renderOrbitAttachments();

}


/* ===========================================================
   CLEAR ATTACHMENTS
   =========================================================== */

function clearOrbitAttachments() {

    orbitAttachments.forEach(
        (attachment) => {

            if (attachment.previewUrl) {

                URL.revokeObjectURL(
                    attachment.previewUrl
                );

            }

        }
    );


    orbitAttachments = [];


    renderOrbitAttachments();

}


/* ===========================================================
   FORMAT FILE SIZE
   =========================================================== */

function formatOrbitFileSize(bytes) {

    if (!bytes) {
        return "0 B";
    }


    const units = [
        "B",
        "KB",
        "MB",
        "GB",
    ];


    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );


    const size =
        bytes /
        Math.pow(1024, index);


    return (
        size.toFixed(
            index === 0 ? 0 : 1
        ) +
        " " +
        units[index]
    );

}


/* ===========================================================
   GET FILE ICON
   =========================================================== */

function getOrbitFileIcon(file) {

    if (!file) {
        return "fa-file";
    }


    if (file.type === "application/pdf") {
        return "fa-file-pdf";
    }


    if (
        file.type.includes("word") ||
        file.name.endsWith(".doc") ||
        file.name.endsWith(".docx")
    ) {

        return "fa-file-word";

    }


    if (
        file.type.includes("sheet") ||
        file.name.endsWith(".xls") ||
        file.name.endsWith(".xlsx")
    ) {

        return "fa-file-excel";

    }


    if (
        file.type.includes("presentation") ||
        file.name.endsWith(".ppt") ||
        file.name.endsWith(".pptx")
    ) {

        return "fa-file-powerpoint";

    }


    if (
        file.type === "text/plain" ||
        file.name.endsWith(".txt")
    ) {

        return "fa-file-lines";

    }


    if (
        file.name.endsWith(".js") ||
        file.name.endsWith(".css") ||
        file.name.endsWith(".html") ||
        file.name.endsWith(".json")
    ) {

        return "fa-file-code";

    }


    return "fa-file";

}


/* ===========================================================
   RENDER ATTACHMENTS
   =========================================================== */

function renderOrbitAttachments() {

    const {
        commandBox,
    } = getOrbitToolsElements();


    if (!commandBox) {
        return;
    }


    let container =
        document.getElementById(
            "orbit-attachments"
        );


    /*
       Create attachment container
       when it doesn't exist.
    */

    if (!container) {

        container =
            document.createElement("div");

        container.id =
            "orbit-attachments";

        container.className =
            "orbit-attachments";


        commandBox.parentElement.insertBefore(
            container,
            commandBox
        );

    }


    /*
       Nothing attached.
    */

    if (orbitAttachments.length === 0) {

        container.innerHTML = "";

        container.hidden = true;

        return;

    }


    container.hidden = false;


    container.innerHTML =
        orbitAttachments
            .map((attachment) => {

                const safeName =
                    escapeOrbitToolHTML(
                        attachment.name
                    );


                /*
                   Image preview.
                */

                if (
                    attachment.isImage &&
                    attachment.previewUrl
                ) {

                    return `

            <div
              class="orbit-attachment"
              data-attachment-id="${attachment.id}"
            >

              <div class="orbit-attachment-preview">

                <img
                  src="${attachment.previewUrl}"
                  alt="${safeName}"
                />

              </div>

              <div class="orbit-attachment-info">

                <span
                  class="orbit-attachment-name"
                  title="${safeName}"
                >
                  ${safeName}
                </span>

                <small>
                  ${formatOrbitFileSize(
                        attachment.size
                    )}
                </small>

              </div>

              <button
                type="button"
                class="orbit-attachment-remove"
                data-remove-attachment="${attachment.id}"
                aria-label="Remove ${safeName}"
                title="Remove attachment"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>

            </div>

          `;

                }


                /*
                   Normal file preview.
                */

                return `

          <div
            class="orbit-attachment"
            data-attachment-id="${attachment.id}"
          >

            <div class="orbit-attachment-file-icon">

              <i
                class="fa-solid ${getOrbitFileIcon(
                    attachment
                )}"
              ></i>

            </div>

            <div class="orbit-attachment-info">

              <span
                class="orbit-attachment-name"
                title="${safeName}"
              >
                ${safeName}
              </span>

              <small>
                ${formatOrbitFileSize(
                    attachment.size
                )}
              </small>

            </div>

            <button
              type="button"
              class="orbit-attachment-remove"
              data-remove-attachment="${attachment.id}"
              aria-label="Remove ${safeName}"
              title="Remove attachment"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>

          </div>

        `;

            })
            .join("");

}


/* ===========================================================
   ESCAPE HTML
   =========================================================== */

function escapeOrbitToolHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* ===========================================================
   TOOLS NOTICE
   =========================================================== */

function showOrbitToolsNotice(message) {

    /*
       For now use a lightweight browser notification.
  
       We can replace this with a proper Orbit toast
       when we style the tools system.
    */

    console.warn(
        "Orbit Tools:",
        message
    );

}


/* ===========================================================
   HANDLE FILE SELECTION
   =========================================================== */

function handleOrbitFileSelection(event) {

    const files =
        Array.from(
            event.target.files || []
        );


    files.forEach((file) => {

        addOrbitAttachment(file);

    });


    /*
       Reset input so selecting
       the same file again works.
    */

    event.target.value = "";

}


/* ===========================================================
   OPEN FILE PICKER
   =========================================================== */

function openOrbitFilePicker() {

    const input =
        createOrbitFileInput();


    input.click();

}


/* ===========================================================
   TOOLS BUTTON
   =========================================================== */

function setupOrbitToolsButton() {

    const {
        toolsButton,
    } = getOrbitToolsElements();


    if (!toolsButton) {
        return;
    }


    if (
        toolsButton.dataset.orbitToolsReady ===
        "true"
    ) {

        return;

    }


    toolsButton.dataset.orbitToolsReady =
        "true";


    toolsButton.addEventListener(
        "click",
        () => {

            openOrbitFilePicker();

        }
    );

}


/* ===========================================================
   ATTACHMENT REMOVE ACTIONS
   =========================================================== */

function setupOrbitAttachmentActions() {

    const {
        commandBox,
    } = getOrbitToolsElements();


    if (!commandBox) {
        return;
    }


    if (
        commandBox.dataset.orbitAttachmentActionsReady ===
        "true"
    ) {

        return;

    }


    commandBox.dataset.orbitAttachmentActionsReady =
        "true";


    document.addEventListener(
        "click",
        (event) => {

            const removeButton =
                event.target.closest(
                    "[data-remove-attachment]"
                );


            if (!removeButton) {
                return;
            }


            const id =
                removeButton.dataset
                    .removeAttachment;


            removeOrbitAttachment(id);

        }
    );

}


/* ===========================================================
   PASTE IMAGE SUPPORT
   =========================================================== */

function setupOrbitPasteSupport() {

    const {
        commandBox,
    } = getOrbitToolsElements();


    if (!commandBox) {
        return;
    }


    document.addEventListener(
        "paste",
        (event) => {

            const items =
                Array.from(
                    event.clipboardData?.items || []
                );


            const imageItem =
                items.find(
                    (item) =>
                        item.type.startsWith("image/")
                );


            if (!imageItem) {
                return;
            }


            const file =
                imageItem.getAsFile();


            if (!file) {
                return;
            }


            addOrbitAttachment(file);

        }
    );

}


/* ===========================================================
   DRAG & DROP SUPPORT
   =========================================================== */

function setupOrbitDragAndDrop() {

    const {
        commandBox,
    } = getOrbitToolsElements();


    if (!commandBox) {
        return;
    }


    commandBox.addEventListener(
        "dragover",
        (event) => {

            event.preventDefault();

            commandBox.classList.add(
                "orbit-drag-active"
            );

        }
    );


    commandBox.addEventListener(
        "dragleave",
        () => {

            commandBox.classList.remove(
                "orbit-drag-active"
            );

        }
    );


    commandBox.addEventListener(
        "drop",
        (event) => {

            event.preventDefault();


            commandBox.classList.remove(
                "orbit-drag-active"
            );


            const files =
                Array.from(
                    event.dataTransfer?.files || []
                );


            files.forEach((file) => {

                addOrbitAttachment(file);

            });

        }
    );

}


/* ===========================================================
   GET ATTACHMENTS
   =========================================================== */

function getOrbitAttachments() {

    return [...orbitAttachments];

}


/* ===========================================================
   CHECK ATTACHMENTS
   =========================================================== */

function orbitHasAttachments() {

    return orbitAttachments.length > 0;

}


/* ===========================================================
   INITIALIZE ORBIT TOOLS
   =========================================================== */

function initializeOrbitTools() {

    const fileInput =
        createOrbitFileInput();


    fileInput.addEventListener(
        "change",
        handleOrbitFileSelection
    );


    setupOrbitToolsButton();

    setupOrbitAttachmentActions();

    setupOrbitPasteSupport();

    setupOrbitDragAndDrop();


    console.log(
        "Orbit Tools initialized."
    );

}


/* ===========================================================
   PUBLIC ORBIT TOOLS API
   =========================================================== */

window.OrbitTools = {

    addAttachment:
        addOrbitAttachment,

    removeAttachment:
        removeOrbitAttachment,

    clearAttachments:
        clearOrbitAttachments,

    getAttachments:
        getOrbitAttachments,

    hasAttachments:
        orbitHasAttachments,

    openFilePicker:
        openOrbitFilePicker,

};


/* ===========================================================
   START
   =========================================================== */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeOrbitTools
    );

} else {

    initializeOrbitTools();

}