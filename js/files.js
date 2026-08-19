/* =========================================================
   ORBIT AI
   FILES SYSTEM
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  /* =======================================================
     ELEMENTS
     ======================================================= */

  const fileInput = document.getElementById("file-input");

  const uploadBtn =
    document.getElementById("upload-files-btn");

  const scanBtn =
    document.getElementById("scan-files-btn");

  const emptyScanBtn =
    document.getElementById("empty-scan-btn");

  const refreshBtn =
    document.getElementById("refresh-files-btn");

  const fileList =
    document.getElementById("file-list");

  const emptyState =
    document.getElementById("empty-files");

  const totalFiles =
    document.getElementById("total-files");

  const totalSize =
    document.getElementById("total-size");

  const documentCount =
    document.getElementById("document-count");

  const imageCount =
    document.getElementById("image-count");

  const fileCountLabel =
    document.getElementById("file-count-label");

  const searchInput =
    document.getElementById("file-search");

  const filterSelect =
    document.getElementById("file-filter");


  /* =======================================================
     STORAGE
     ======================================================= */

  let selectedFiles = [];


  /* =======================================================
     LOAD SAVED FILE INFORMATION
     ======================================================= */

  function loadFiles() {

    try {

      const savedFiles =
        JSON.parse(
          localStorage.getItem("orbit-files")
        ) || [];

      selectedFiles = Array.isArray(savedFiles)
        ? savedFiles
        : [];

    } catch (error) {

      console.error(
        "Orbit Files: Could not load saved files.",
        error
      );

      selectedFiles = [];

    }

    renderFiles();

  }


  /* =======================================================
     OPEN FILE PICKER
     ======================================================= */

  function openFilePicker() {

    if (!fileInput) return;

    fileInput.click();

  }


  /* =======================================================
     UPLOAD BUTTON
     ======================================================= */

  if (uploadBtn) {

    uploadBtn.addEventListener(
      "click",
      openFilePicker
    );

  }


  /* =======================================================
     SCAN FILES BUTTON
     ======================================================= */

  if (scanBtn) {

    scanBtn.addEventListener(
      "click",
      openFilePicker
    );

  }


  /* =======================================================
     EMPTY STATE SELECT BUTTON
     ======================================================= */

  if (emptyScanBtn) {

    emptyScanBtn.addEventListener(
      "click",
      openFilePicker
    );

  }


  /* =======================================================
     FILE INPUT
     ======================================================= */

  if (fileInput) {

    fileInput.addEventListener(
      "change",
      (event) => {

        const files =
          Array.from(
            event.target.files
          );

        addFiles(files);

        /*
         * Reset the input so the same
         * file can be selected again.
         */

        fileInput.value = "";

      }
    );

  }


  /* =======================================================
     ADD FILES
     ======================================================= */

  function addFiles(files) {

    if (!files.length) return;


    files.forEach(file => {

      /*
       * Prevent duplicate files.
       */

      const alreadyExists =
        selectedFiles.some(
          existingFile =>
            existingFile.name === file.name &&
            existingFile.size === file.size &&
            existingFile.modified === file.lastModified
        );


      if (alreadyExists) return;


      const fileData = {

        id:
          Date.now() +
          "-" +
          Math.random()
            .toString(36)
            .substring(2, 10),

        name:
          file.name,

        type:
          file.type ||
          "Unknown",

        size:
          file.size,

        modified:
          file.lastModified,

        category:
          getFileCategory(file)

      };


      selectedFiles.push(fileData);

    });


    saveFiles();

    renderFiles();

  }


  /* =======================================================
     DETERMINE FILE CATEGORY
     ======================================================= */

  function getFileCategory(file) {

    const type =
      String(file.type || "")
        .toLowerCase();

    const name =
      String(file.name || "")
        .toLowerCase();


    /* IMAGE */

    if (type.startsWith("image/")) {

      return "Image";

    }


    /* VIDEO */

    if (type.startsWith("video/")) {

      return "Video";

    }


    /* AUDIO */

    if (type.startsWith("audio/")) {

      return "Audio";

    }


    /* DOCUMENTS */

    const documentExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".txt",
      ".rtf",
      ".odt",
      ".xls",
      ".xlsx",
      ".csv",
      ".ppt",
      ".pptx"
    ];


    if (
      type.includes("pdf") ||
      type.includes("document") ||
      type.includes("text") ||
      documentExtensions.some(
        extension =>
          name.endsWith(extension)
      )
    ) {

      return "Document";

    }


    /* CODE */

    const codeExtensions = [
      ".html",
      ".css",
      ".js",
      ".jsx",
      ".ts",
      ".tsx",
      ".json",
      ".py",
      ".java",
      ".c",
      ".cpp",
      ".php",
      ".sql"
    ];


    if (
      codeExtensions.some(
        extension =>
          name.endsWith(extension)
      )
    ) {

      return "Code";

    }


    /* ARCHIVES */

    const archiveExtensions = [
      ".zip",
      ".rar",
      ".7z",
      ".tar",
      ".gz"
    ];


    if (
      type.includes("zip") ||
      type.includes("rar") ||
      type.includes("compressed") ||
      archiveExtensions.some(
        extension =>
          name.endsWith(extension)
      )
    ) {

      return "Archive";

    }


    return "Other";

  }


  /* =======================================================
     SAVE FILE INFORMATION
     ======================================================= */

  function saveFiles() {

    try {

      localStorage.setItem(
        "orbit-files",
        JSON.stringify(selectedFiles)
      );

    } catch (error) {

      console.error(
        "Orbit Files: Could not save files.",
        error
      );

    }

  }


  /* =======================================================
     RENDER FILES
     ======================================================= */

  function renderFiles() {

    if (!fileList) return;


    /*
     * Remove only generated file cards.
     */

    const fileCards =
      fileList.querySelectorAll(
        ".file-card"
      );


    fileCards.forEach(card => {
      card.remove();
    });


    /*
     * Empty state.
     */

    if (selectedFiles.length === 0) {

      if (emptyState) {

        emptyState.style.display =
          "flex";

      }

      updateStatistics();

      return;

    }


    if (emptyState) {

      emptyState.style.display =
        "none";

    }


    /*
     * Search and filter.
     */

    const searchTerm =
      searchInput
        ? searchInput.value
            .trim()
            .toLowerCase()
        : "";


    const selectedFilter =
      filterSelect
        ? filterSelect.value
        : "all";


    const visibleFiles =
      selectedFiles.filter(file => {

        const matchesSearch =
          !searchTerm ||
          file.name
            .toLowerCase()
            .includes(searchTerm);


        const matchesFilter =
          selectedFilter === "all" ||
          file.category.toLowerCase() ===
            selectedFilter.toLowerCase();


        return (
          matchesSearch &&
          matchesFilter
        );

      });


    /*
     * Display filtered files.
     */

    visibleFiles.forEach(file => {

      const fileCard =
        document.createElement("article");

      fileCard.className =
        "file-card";

      fileCard.dataset.id =
        file.id;


      fileCard.innerHTML = `

        <div class="file-icon">

          <i class="${getFileIcon(
            file.category
          )}"></i>

        </div>


        <div class="file-info">

          <h3
            title="${escapeHTML(
              file.name
            )}"
          >
            ${escapeHTML(
              file.name
            )}
          </h3>


          <p>

            ${escapeHTML(
              file.category
            )}

            •

            ${formatSize(
              file.size
            )}

          </p>


          <small>

            Modified:

            ${formatDate(
              file.modified
            )}

          </small>

        </div>


        <button
          class="file-delete"
          type="button"
          aria-label="Remove ${escapeHTML(
            file.name
          )}"
          data-id="${file.id}"
        >

          <i class="fa-solid fa-trash"></i>

        </button>

      `;


      fileList.appendChild(
        fileCard
      );

    });


    /*
     * If search/filter returns nothing.
     */

    if (
      visibleFiles.length === 0 &&
      selectedFiles.length > 0
    ) {

      const noResults =
        document.createElement("div");

      noResults.className =
        "empty-files search-empty";


      noResults.innerHTML = `

        <div class="empty-files-icon">

          <i class="fa-solid fa-magnifying-glass"></i>

        </div>

        <h3>
          No Matching Files
        </h3>

        <p>
          Try another search or filter.
        </p>

      `;


      fileList.appendChild(
        noResults
      );

    }


    updateStatistics();

  }


  /* =======================================================
     FILE ICON
     ======================================================= */

  function getFileIcon(category) {

    const icons = {

      Image:
        "fa-solid fa-image",

      Video:
        "fa-solid fa-video",

      Audio:
        "fa-solid fa-music",

      Document:
        "fa-solid fa-file-lines",

      Code:
        "fa-solid fa-code",

      Archive:
        "fa-solid fa-file-zipper",

      Other:
        "fa-solid fa-file"

    };


    return (
      icons[category] ||
      icons.Other
    );

  }


  /* =======================================================
     DELETE FILE
     ======================================================= */

  if (fileList) {

    fileList.addEventListener(
      "click",
      (event) => {

        const deleteButton =
          event.target.closest(
            ".file-delete"
          );


        if (!deleteButton) return;


        const id =
          deleteButton.dataset.id;


        selectedFiles =
          selectedFiles.filter(
            file =>
              file.id !== id
          );


        saveFiles();

        renderFiles();

      }
    );

  }


  /* =======================================================
     SEARCH
     ======================================================= */

  if (searchInput) {

    searchInput.addEventListener(
      "input",
      () => {

        renderFiles();

      }
    );

  }


  /* =======================================================
     FILTER
     ======================================================= */

  if (filterSelect) {

    filterSelect.addEventListener(
      "change",
      () => {

        renderFiles();

      }
    );

  }


  /* =======================================================
     REFRESH
     ======================================================= */

  if (refreshBtn) {

    refreshBtn.addEventListener(
      "click",
      () => {

        refreshBtn.classList.add(
          "is-refreshing"
        );


        loadFiles();


        setTimeout(() => {

          refreshBtn.classList.remove(
            "is-refreshing"
          );

        }, 500);

      }
    );

  }


  /* =======================================================
     STATISTICS
     ======================================================= */

  function updateStatistics() {

    /*
     * Total files
     */

    if (totalFiles) {

      totalFiles.textContent =
        selectedFiles.length;

    }


    /*
     * Total size
     */

    if (totalSize) {

      const size =
        selectedFiles.reduce(
          (total, file) =>
            total +
            Number(
              file.size || 0
            ),
          0
        );


      totalSize.textContent =
        formatSize(size);

    }


    /*
     * Documents
     */

    if (documentCount) {

      const count =
        selectedFiles.filter(
          file =>
            file.category ===
            "Document"
        ).length;


      documentCount.textContent =
        count;

    }


    /*
     * Images
     */

    if (imageCount) {

      const count =
        selectedFiles.filter(
          file =>
            file.category ===
            "Image"
        ).length;


      imageCount.textContent =
        count;

    }


    /*
     * File counter
     */

    if (fileCountLabel) {

      const count =
        selectedFiles.length;


      fileCountLabel.textContent =
        `${count} ${
          count === 1
            ? "file"
            : "files"
        }`;

    }

  }


  /* =======================================================
     FORMAT FILE SIZE
     ======================================================= */

  function formatSize(bytes) {

    if (
      !bytes ||
      bytes <= 0
    ) {

      return "0 B";

    }


    const units = [
      "B",
      "KB",
      "MB",
      "GB",
      "TB"
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


    return `${size.toFixed(
      safeIndex === 0
        ? 0
        : 2
    )} ${units[safeIndex]}`;

  }


  /* =======================================================
     FORMAT DATE
     ======================================================= */

  function formatDate(timestamp) {

    if (!timestamp) {

      return "Unknown";

    }


    const date =
      new Date(timestamp);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return "Unknown";

    }


    return date.toLocaleDateString(
      undefined,
      {
        year: "numeric",
        month: "short",
        day: "numeric"
      }
    );

  }


  /* =======================================================
     ESCAPE HTML
     ======================================================= */

  function escapeHTML(value) {

    return String(value)

      .replace(
        /&/g,
        "&amp;"
      )

      .replace(
        /</g,
        "&lt;"
      )

      .replace(
        />/g,
        "&gt;"
      )

      .replace(
        /"/g,
        "&quot;"
      )

      .replace(
        /'/g,
        "&#039;"
      );

  }


  /* =======================================================
     INITIALIZE
     ======================================================= */

  loadFiles();

});