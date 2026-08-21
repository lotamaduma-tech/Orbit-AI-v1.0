/* ============================================================
   ORBIT AI — FILE MANAGER
   IndexedDB File Storage System
   ============================================================ */

"use strict";


/* ============================================================
   CONFIGURATION
   ============================================================ */

const ORBIT_FILE_CONFIG = {

    databaseName: "OrbitAIFileDatabase",

    databaseVersion: 1,

    storeName: "files",

    /*
       Maximum local storage allocated by Orbit AI.

       Current limit:
       512 MB
    */

    storageLimit: 512 * 1024 * 1024

};


/* ============================================================
   DOM ELEMENTS
   ============================================================ */

const fileInput =
    document.getElementById("file-input");

const uploadButton =
    document.getElementById("upload-button");

const uploadArea =
    document.getElementById("upload-area");

const fileList =
    document.getElementById("file-list");

const emptyFiles =
    document.getElementById("empty-files");

const clearFilesButton =
    document.getElementById("clear-files-button");

const storageUsed =
    document.getElementById("storage-used");

const fileCount =
    document.getElementById("file-count");

const storageAvailable =
    document.getElementById("storage-available");


/* ============================================================
   DATABASE
   ============================================================ */

let orbitDatabase = null;


/* ============================================================
   INITIALIZE DATABASE
   ============================================================ */

function initializeDatabase() {

    return new Promise((resolve, reject) => {

        if (!window.indexedDB) {

            reject(
                new Error(
                    "IndexedDB is not supported by this browser."
                )
            );

            return;
        }


        const request =
            indexedDB.open(
                ORBIT_FILE_CONFIG.databaseName,
                ORBIT_FILE_CONFIG.databaseVersion
            );


        request.onupgradeneeded = function (event) {

            const database =
                event.target.result;


            if (
                !database.objectStoreNames.contains(
                    ORBIT_FILE_CONFIG.storeName
                )
            ) {

                const objectStore =
                    database.createObjectStore(
                        ORBIT_FILE_CONFIG.storeName,
                        {
                            keyPath: "id",
                            autoIncrement: true
                        }
                    );


                objectStore.createIndex(
                    "name",
                    "name",
                    {
                        unique: false
                    }
                );


                objectStore.createIndex(
                    "type",
                    "type",
                    {
                        unique: false
                    }
                );


                objectStore.createIndex(
                    "size",
                    "size",
                    {
                        unique: false
                    }
                );


                objectStore.createIndex(
                    "createdAt",
                    "createdAt",
                    {
                        unique: false
                    }
                );

            }

        };


        request.onsuccess = function (event) {

            orbitDatabase =
                event.target.result;


            orbitDatabase.onerror =
                function (error) {

                    console.error(
                        "Orbit Files database error:",
                        error
                    );

                };


            resolve(
                orbitDatabase
            );

        };


        request.onerror = function () {

            reject(
                request.error ||
                new Error(
                    "Unable to open Orbit Files database."
                )
            );

        };

    });

}


/* ============================================================
   GET ALL FILES
   ============================================================ */

function getAllFiles() {

    return new Promise((resolve, reject) => {

        if (!orbitDatabase) {

            reject(
                new Error(
                    "Database is not initialized."
                )
            );

            return;
        }


        const transaction =
            orbitDatabase.transaction(
                ORBIT_FILE_CONFIG.storeName,
                "readonly"
            );


        const objectStore =
            transaction.objectStore(
                ORBIT_FILE_CONFIG.storeName
            );


        const request =
            objectStore.getAll();


        request.onsuccess =
            function () {

                resolve(
                    request.result || []
                );

            };


        request.onerror =
            function () {

                reject(
                    request.error
                );

            };

    });

}


/* ============================================================
   ADD FILE
   ============================================================ */

function saveFile(file) {

    return new Promise((resolve, reject) => {

        if (!orbitDatabase) {

            reject(
                new Error(
                    "Database is not initialized."
                )
            );

            return;
        }


        const transaction =
            orbitDatabase.transaction(
                ORBIT_FILE_CONFIG.storeName,
                "readwrite"
            );


        const objectStore =
            transaction.objectStore(
                ORBIT_FILE_CONFIG.storeName
            );


        const fileRecord = {

            name: file.name,

            type: file.type ||
                "application/octet-stream",

            size: file.size,

            file: file,

            createdAt: new Date().toISOString()

        };


        const request =
            objectStore.add(
                fileRecord
            );


        request.onsuccess =
            function () {

                resolve(
                    request.result
                );

            };


        request.onerror =
            function () {

                reject(
                    request.error
                );

            };

    });

}


/* ============================================================
   DELETE FILE
   ============================================================ */

function deleteFile(fileId) {

    return new Promise((resolve, reject) => {

        if (!orbitDatabase) {

            reject(
                new Error(
                    "Database is not initialized."
                )
            );

            return;
        }


        const transaction =
            orbitDatabase.transaction(
                ORBIT_FILE_CONFIG.storeName,
                "readwrite"
            );


        const objectStore =
            transaction.objectStore(
                ORBIT_FILE_CONFIG.storeName
            );


        const request =
            objectStore.delete(
                Number(fileId)
            );


        request.onsuccess =
            function () {

                resolve();

            };


        request.onerror =
            function () {

                reject(
                    request.error
                );

            };

    });

}


/* ============================================================
   CLEAR ALL FILES
   ============================================================ */

function clearAllFiles() {

    return new Promise((resolve, reject) => {

        if (!orbitDatabase) {

            reject(
                new Error(
                    "Database is not initialized."
                )
            );

            return;
        }


        const transaction =
            orbitDatabase.transaction(
                ORBIT_FILE_CONFIG.storeName,
                "readwrite"
            );


        const objectStore =
            transaction.objectStore(
                ORBIT_FILE_CONFIG.storeName
            );


        const request =
            objectStore.clear();


        request.onsuccess =
            function () {

                resolve();

            };


        request.onerror =
            function () {

                reject(
                    request.error
                );

            };

    });

}


/* ============================================================
   FORMAT FILE SIZE
   ============================================================ */

function formatFileSize(bytes) {

    if (!Number.isFinite(bytes) || bytes <= 0) {

        return "0 Bytes";

    }


    const units = [

        "Bytes",

        "KB",

        "MB",

        "GB"

    ];


    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );


    const safeIndex =
        Math.min(
            index,
            units.length - 1
        );


    const size =
        bytes /
        Math.pow(
            1024,
            safeIndex
        );


    return (
        size.toFixed(
            safeIndex === 0 ? 0 : 2
        ) +
        " " +
        units[safeIndex]
    );

}


/* ============================================================
   CALCULATE STORAGE
   ============================================================ */

function calculateStorage(files) {

    return files.reduce(
        function (total, item) {

            return total +
                (Number(item.size) || 0);

        },
        0
    );

}


/* ============================================================
   UPDATE STORAGE UI
   ============================================================ */

function updateStorageDisplay(files) {

    const used =
        calculateStorage(files);


    const available =
        Math.max(
            ORBIT_FILE_CONFIG.storageLimit -
            used,
            0
        );


    if (storageUsed) {

        storageUsed.textContent =
            formatFileSize(
                used
            );

    }


    if (fileCount) {

        fileCount.textContent =
            files.length;

    }


    if (storageAvailable) {

        storageAvailable.textContent =
            formatFileSize(
                available
            );

    }

}


/* ============================================================
   GET FILE ICON
   ============================================================ */

function getFileIcon(file) {

    const type =
        file.type ||
        "";


    const name =
        file.name ||
        "";


    const extension =
        name
            .split(".")
            .pop()
            .toLowerCase();


    if (type.startsWith("image/")) {

        return "fa-file-image";

    }


    if (type.startsWith("video/")) {

        return "fa-file-video";

    }


    if (type.startsWith("audio/")) {

        return "fa-file-audio";

    }


    if (
        type === "application/pdf" ||
        extension === "pdf"
    ) {

        return "fa-file-pdf";

    }


    if (
        type.includes("word") ||
        extension === "doc" ||
        extension === "docx"
    ) {

        return "fa-file-word";

    }


    if (
        type.includes("excel") ||
        type.includes("spreadsheet") ||
        extension === "xls" ||
        extension === "xlsx" ||
        extension === "csv"
    ) {

        return "fa-file-excel";

    }


    if (
        type.includes("powerpoint") ||
        extension === "ppt" ||
        extension === "pptx"
    ) {

        return "fa-file-powerpoint";

    }


    if (
        type.includes("zip") ||
        type.includes("compressed") ||
        extension === "zip" ||
        extension === "rar" ||
        extension === "7z"
    ) {

        return "fa-file-zipper";

    }


    if (
        type.startsWith("text/") ||
        extension === "txt" ||
        extension === "html" ||
        extension === "css" ||
        extension === "js"
    ) {

        return "fa-file-lines";

    }


    return "fa-file";

}


/* ============================================================
   FORMAT DATE
   ============================================================ */

function formatFileDate(date) {

    if (!date) {

        return "";

    }


    const parsedDate =
        new Date(date);


    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {

        return "";

    }


    return parsedDate.toLocaleDateString(
        undefined,
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );

}


/* ============================================================
   CREATE FILE ELEMENT
   ============================================================ */

function createFileElement(fileRecord) {

    const wrapper =
        document.createElement("article");


    /*
       These classes are added only to the
       dynamically-created file item.

       Existing HTML classes remain untouched.
    */

    wrapper.className =
        "file-item";


    wrapper.dataset.fileId =
        fileRecord.id;


    const icon =
        document.createElement("div");

    icon.className =
        "file-item-icon";


    const iconElement =
        document.createElement("i");

    iconElement.className =
        `fa - solid ${ getFileIcon(fileRecord) } `;


    icon.appendChild(
        iconElement
    );


    const information =
        document.createElement("div");

    information.className =
        "file-item-info";


    const name =
        document.createElement("strong");

    name.className =
        "file-item-name";

    name.textContent =
        fileRecord.name;


    const metadata =
        document.createElement("span");

    metadata.className =
        "file-item-meta";


    metadata.textContent =
        `${ formatFileSize(fileRecord.size) } • ${ formatFileDate(fileRecord.createdAt) } `;


    information.appendChild(
        name
    );

    information.appendChild(
        metadata
    );


    const actions =
        document.createElement("div");

    actions.className =
        "file-item-actions";


    /* OPEN / DOWNLOAD */

    const downloadButton =
        document.createElement("button");

    downloadButton.type =
        "button";

    downloadButton.className =
        "file-action";

    downloadButton.title =
        "Open or download file";

    downloadButton.setAttribute(
        "aria-label",
        `Open ${ fileRecord.name } `
    );


    const downloadIcon =
        document.createElement("i");

    downloadIcon.className =
        "fa-solid fa-download";


    downloadButton.appendChild(
        downloadIcon
    );


    downloadButton.addEventListener(
        "click",
        function () {

            downloadFile(
                fileRecord
            );

        }
    );


    /* DELETE */

    const deleteButton =
        document.createElement("button");

    deleteButton.type =
        "button";

    deleteButton.className =
        "file-action delete";

    deleteButton.title =
        "Delete file";

    deleteButton.setAttribute(
        "aria-label",
        `Delete ${ fileRecord.name } `
    );


    const deleteIcon =
        document.createElement("i");

    deleteIcon.className =
        "fa-solid fa-trash";


    deleteButton.appendChild(
        deleteIcon
    );


    deleteButton.addEventListener(
        "click",
        async function () {

            await handleDeleteFile(
                fileRecord.id
            );

        }
    );


    actions.appendChild(
        downloadButton
    );

    actions.appendChild(
        deleteButton
    );


    wrapper.appendChild(
        icon
    );

    wrapper.appendChild(
        information
    );

    wrapper.appendChild(
        actions
    );


    return wrapper;

}


/* ============================================================
   RENDER FILE LIST
   ============================================================ */

async function renderFiles() {

    try {

        const files =
            await getAllFiles();


        updateStorageDisplay(
            files
        );


        if (!fileList) {

            return;

        }


        /*
           Remove dynamically-generated files
           while preserving the empty state.
        */

        const existingItems =
            fileList.querySelectorAll(
                ".file-item"
            );


        existingItems.forEach(
            function (item) {

                item.remove();

            }
        );


        if (files.length === 0) {

            if (emptyFiles) {

                emptyFiles.style.display =
                    "";

            }

            return;

        }


        if (emptyFiles) {

            emptyFiles.style.display =
                "none";

        }


        /*
           Newest files appear first.
        */

        files.sort(
            function (a, b) {

                return new Date(b.createdAt) -
                    new Date(a.createdAt);

            }
        );


        files.forEach(
            function (fileRecord) {

                const element =
                    createFileElement(
                        fileRecord
                    );


                fileList.appendChild(
                    element
                );

            }
        );

    } catch (error) {

        console.error(
            "Orbit Files: Unable to render files.",
            error
        );

    }

}


/* ============================================================
   CHECK DUPLICATE
   ============================================================ */

async function isDuplicateFile(file) {

    const files =
        await getAllFiles();


    return files.some(
        function (existingFile) {

            return (
                existingFile.name === file.name &&
                existingFile.size === file.size
            );

        }
    );

}


/* ============================================================
   HANDLE FILE UPLOAD
   ============================================================ */

async function handleFiles(fileCollection) {

    if (!fileCollection) {

        return;

    }


    const files =
        Array.from(
            fileCollection
        );


    if (files.length === 0) {

        return;

    }


    try {

        const existingFiles =
            await getAllFiles();


        let currentStorage =
            calculateStorage(
                existingFiles
            );


        let addedCount = 0;

        let skippedCount = 0;


        for (const file of files) {


            /* DUPLICATE CHECK */

            const duplicate =
                existingFiles.some(
                    function (existingFile) {

                        return (
                            existingFile.name === file.name &&
                            existingFile.size === file.size
                        );

                    }
                );


            if (duplicate) {

                skippedCount++;

                continue;

            }


            /* STORAGE CHECK */

            if (
                currentStorage +
                file.size >
                ORBIT_FILE_CONFIG.storageLimit
            ) {

                alert(
                    `Not enough Orbit storage for "${file.name}".`
                );

                continue;

            }


            await saveFile(
                file
            );


            currentStorage +=
                file.size;


            existingFiles.push({
                name: file.name,
                size: file.size
            });


            addedCount++;

        }


        await renderFiles();


        if (skippedCount > 0) {

            console.info(
                `${ skippedCount } duplicate file(s) skipped.`
            );

        }


        if (addedCount > 0) {

            console.info(
                `Orbit Files: ${ addedCount } file(s) uploaded.`
            );

        }

    } catch (error) {

        console.error(
            "Orbit Files: Upload failed.",
            error
        );


        alert(
            "Unable to upload the selected files."
        );

    }

}


/* ============================================================
   DOWNLOAD FILE
   ============================================================ */

function downloadFile(fileRecord) {

    if (!fileRecord || !fileRecord.file) {

        alert(
            "This file is no longer available."
        );

        return;

    }


    const blob =
        fileRecord.file;


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement("a");


    link.href =
        url;


    link.download =
        fileRecord.name;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    setTimeout(
        function () {

            URL.revokeObjectURL(
                url
            );

        },
        1000
    );

}


/* ============================================================
   DELETE SINGLE FILE
   ============================================================ */

async function handleDeleteFile(fileId) {

    try {

        const files =
            await getAllFiles();


        const file =
            files.find(
                function (item) {

                    return Number(item.id) ===
                        Number(fileId);

                }
            );


        if (!file) {

            return;

        }


        const confirmed =
            confirm(
                `Delete "${file.name}" ? `
            );


        if (!confirmed) {

            return;

        }


        await deleteFile(
            fileId
        );


        await renderFiles();


    } catch (error) {

        console.error(
            "Orbit Files: Delete failed.",
            error
        );


        alert(
            "Unable to delete this file."
        );

    }

}


/* ============================================================
   CLEAR ALL FILES
   ============================================================ */

async function handleClearAllFiles() {

    try {

        const files =
            await getAllFiles();


        if (files.length === 0) {

            return;

        }


        const confirmed =
            confirm(
                `Delete all ${ files.length } stored file(s) ? `
            );


        if (!confirmed) {

            return;

        }


        await clearAllFiles();


        await renderFiles();


    } catch (error) {

        console.error(
            "Orbit Files: Clear operation failed.",
            error
        );


        alert(
            "Unable to clear your files."
        );

    }

}


/* ============================================================
   FILE INPUT CHANGE
   ============================================================ */

function handleFileInputChange(event) {

    const selectedFiles =
        event.target.files;


    if (
        selectedFiles &&
        selectedFiles.length > 0
    ) {

        handleFiles(
            selectedFiles
        );

    }


    /*
       Reset input so selecting the same
       file again triggers change.
    */

    event.target.value =
        "";

}


/* ============================================================
   UPLOAD BUTTON
   ============================================================ */

function setupUploadButton() {

    if (!uploadButton || !fileInput) {

        console.warn(
            "Orbit Files: Upload elements not found."
        );

        return;

    }


    uploadButton.addEventListener(
        "click",
        function (event) {

            event.stopPropagation();

            fileInput.click();

        }
    );

}


/* ============================================================
   UPLOAD AREA CLICK
   ============================================================ */

function setupUploadArea() {

    if (!uploadArea || !fileInput) {

        return;

    }


    uploadArea.addEventListener(
        "click",
        function (event) {

            /*
               Don't trigger the picker twice
               when the actual upload button
               is clicked.
            */

            if (
                event.target.closest(
                    "#upload-button"
                )
            ) {

                return;

            }


            fileInput.click();

        }
    );


    /* KEYBOARD ACCESS */

    uploadArea.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter" ||
                event.key === " "
            ) {

                event.preventDefault();

                fileInput.click();

            }

        }
    );

}


/* ============================================================
   DRAG & DROP
   ============================================================ */

function setupDragAndDrop() {

    if (!uploadArea) {

        return;

    }


    uploadArea.addEventListener(
        "dragenter",
        function (event) {

            event.preventDefault();

            event.stopPropagation();

            uploadArea.classList.add(
                "drag-active"
            );

        }
    );


    uploadArea.addEventListener(
        "dragover",
        function (event) {

            event.preventDefault();

            event.stopPropagation();

            uploadArea.classList.add(
                "drag-active"
            );

        }
    );


    uploadArea.addEventListener(
        "dragleave",
        function (event) {

            event.preventDefault();

            event.stopPropagation();


            /*
               Only remove the state when
               actually leaving the upload area.
            */

            if (
                event.relatedTarget &&
                uploadArea.contains(
                    event.relatedTarget
                )
            ) {

                return;

            }


            uploadArea.classList.remove(
                "drag-active"
            );

        }
    );


    uploadArea.addEventListener(
        "drop",
        function (event) {

            event.preventDefault();

            event.stopPropagation();


            uploadArea.classList.remove(
                "drag-active"
            );


            const droppedFiles =
                event.dataTransfer.files;


            if (
                droppedFiles &&
                droppedFiles.length > 0
            ) {

                handleFiles(
                    droppedFiles
                );

            }

        }
    );

}


/* ============================================================
   CLEAR BUTTON
   ============================================================ */

function setupClearButton() {

    if (!clearFilesButton) {

        return;

    }


    clearFilesButton.addEventListener(
        "click",
        handleClearAllFiles
    );

}


/* ============================================================
   INITIALIZE
   ============================================================ */

async function initializeOrbitFiles() {

    console.log(
        "Orbit Files: Starting..."
    );


    try {

        await initializeDatabase();


        console.log(
            "Orbit Files: Database ready."
        );


        setupUploadButton();

        setupUploadArea();

        setupDragAndDrop();

        setupClearButton();


        if (fileInput) {

            fileInput.addEventListener(
                "change",
                handleFileInputChange
            );

        }


        await renderFiles();


        console.log(
            "Orbit Files: Ready."
        );

    } catch (error) {

        console.error(
            "Orbit Files: Initialization failed.",
            error
        );


        if (uploadArea) {

            uploadArea.style.opacity =
                "0.6";

        }


        if (uploadButton) {

            uploadButton.disabled =
                true;

        }


        alert(
            "Orbit Files could not start. Your browser may not support local file storage."
        );

    }

}


/* ============================================================
   START
   ============================================================ */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeOrbitFiles
    );

} else {

    initializeOrbitFiles();

}