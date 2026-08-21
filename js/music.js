/* =========================================================
   ORBIT AI — MUSIC
   Local Music Player
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       ELEMENTS
    ===================================================== */

    const musicFileInput = document.getElementById("music-file-input");
    const addMusicButton = document.getElementById("add-music-button");
    const playlistAddButton = document.getElementById("playlist-add-button");

    const audioPlayer = document.getElementById("audio-player");

    const albumArt = document.getElementById("album-art");
    const trackTitle = document.getElementById("track-title");
    const trackArtist = document.getElementById("track-artist");

    const currentTimeElement = document.getElementById("current-time");
    const durationElement = document.getElementById("duration");

    const progressBar = document.getElementById("progress-bar");
    const volumeControl = document.getElementById("volume-control");

    const previousTrackButton = document.getElementById("previous-track");
    const playButton = document.getElementById("play-button");
    const nextTrackButton = document.getElementById("next-track");

    const playlist = document.getElementById("playlist");
    const emptyPlaylist = document.getElementById("empty-playlist");
    const playlistCount = document.getElementById("playlist-count");

    /* Spotify */

    const spotifyButton = document.getElementById("spotify-button");
    const spotifyModal = document.getElementById("spotify-modal");
    const spotifyModalOverlay =
        document.getElementById("spotify-modal-overlay");

    const spotifyModalClose =
        document.getElementById("spotify-modal-close");

    const spotifyModalButton =
        document.getElementById("spotify-modal-button");


    /* =====================================================
       PLAYER STATE
    ===================================================== */

    let tracks = [];
    let currentTrackIndex = -1;


    /* =====================================================
       OPEN FILE PICKER
    ===================================================== */

    function openFilePicker() {

        if (!musicFileInput) {
            return;
        }

        musicFileInput.click();

    }


    if (addMusicButton) {

        addMusicButton.addEventListener(
            "click",
            openFilePicker
        );

    }


    if (playlistAddButton) {

        playlistAddButton.addEventListener(
            "click",
            openFilePicker
        );

    }


    /* =====================================================
       ADD MUSIC FILES
    ===================================================== */

    if (musicFileInput) {

        musicFileInput.addEventListener(
            "change",
            (event) => {

                const files =
                    Array.from(event.target.files || []);

                if (!files.length) {
                    return;
                }

                addTracks(files);

                /* Allow selecting the same file again */

                musicFileInput.value = "";

            }
        );

    }


    function addTracks(files) {

        const audioFiles =
            files.filter(
                file =>
                    file.type.startsWith("audio/")
            );

        if (!audioFiles.length) {

            alert(
                "Please choose a valid audio file."
            );

            return;

        }


        audioFiles.forEach(file => {

            const track = {

                id:
                    `${Date.now()} -${Math.random()
                        .toString(36)
                        .substring(2, 9)
                    } `,

                file,

                name: getTrackName(file.name),

                artist: "Local Audio",

                url: URL.createObjectURL(file)

            };

            tracks.push(track);

        });


        updatePlaylistCount();

        renderPlaylist();


        /*
         * Automatically play the first added track
         * if nothing is currently selected.
         */

        if (currentTrackIndex === -1) {

            loadTrack(0, true);

        }

    }


    /* =====================================================
       GET TRACK NAME
    ===================================================== */

    function getTrackName(filename) {

        return filename
            .replace(/\.[^/.]+$/, "")
            .replace(/[_-]+/g, " ")
            .trim();

    }


    /* =====================================================
       LOAD TRACK
    ===================================================== */

    function loadTrack(index, autoplay = false) {

        if (
            index < 0 ||
            index >= tracks.length
        ) {

            return;

        }


        currentTrackIndex = index;

        const track =
            tracks[currentTrackIndex];


        audioPlayer.src =
            track.url;

        audioPlayer.load();


        trackTitle.textContent =
            track.name;

        trackArtist.textContent =
            track.artist;


        /* Reset player */

        currentTimeElement.textContent =
            "0:00";

        durationElement.textContent =
            "0:00";

        progressBar.value =
            0;


        /* Update album art */

        albumArt.innerHTML =
            '<i class="fa-solid fa-music"></i>';


        renderPlaylist();


        if (autoplay) {

            audioPlayer.play()
                .then(() => {

                    updatePlayButton(true);

                })
                .catch(() => {

                    updatePlayButton(false);

                });

        } else {

            updatePlayButton(false);

        }

    }


    /* =====================================================
       PLAY / PAUSE
       ===================================================== */

    if (playButton) {

        playButton.addEventListener(
            "click",
            togglePlay
        );

    }


    function togglePlay() {

        if (!tracks.length) {

            openFilePicker();

            return;

        }


        if (currentTrackIndex === -1) {

            loadTrack(0, true);

            return;

        }


        if (audioPlayer.paused) {

            audioPlayer.play()
                .then(() => {

                    updatePlayButton(true);

                })
                .catch(error => {

                    console.error(
                        "Unable to play audio:",
                        error
                    );

                });

        } else {

            audioPlayer.pause();

            updatePlayButton(false);

        }

    }


    /* =====================================================
       UPDATE PLAY BUTTON
       ===================================================== */

    function updatePlayButton(isPlaying) {

        if (!playButton) {
            return;
        }


        playButton.innerHTML =
            isPlaying
                ? '<i class="fa-solid fa-pause"></i>'
                : '<i class="fa-solid fa-play"></i>';


        playButton.setAttribute(
            "aria-label",
            isPlaying
                ? "Pause"
                : "Play"
        );

    }


    /* =====================================================
       NEXT TRACK
       ===================================================== */

    if (nextTrackButton) {

        nextTrackButton.addEventListener(
            "click",
            nextTrack
        );

    }


    function nextTrack() {

        if (!tracks.length) {
            return;
        }


        let nextIndex =
            currentTrackIndex + 1;


        if (nextIndex >= tracks.length) {

            nextIndex = 0;

        }


        loadTrack(
            nextIndex,
            true
        );

    }


    /* =====================================================
       PREVIOUS TRACK
       ===================================================== */

    if (previousTrackButton) {

        previousTrackButton.addEventListener(
            "click",
            previousTrack
        );

    }


    function previousTrack() {

        if (!tracks.length) {
            return;
        }


        /*
         * If the song has already played for more than
         * three seconds, restart the current song.
         */

        if (audioPlayer.currentTime > 3) {

            audioPlayer.currentTime = 0;

            return;

        }


        let previousIndex =
            currentTrackIndex - 1;


        if (previousIndex < 0) {

            previousIndex =
                tracks.length - 1;

        }


        loadTrack(
            previousIndex,
            true
        );

    }


    /* =====================================================
       AUDIO EVENTS
    ===================================================== */

    audioPlayer.addEventListener(
        "loadedmetadata",
        () => {

            if (
                Number.isFinite(
                    audioPlayer.duration
                )
            ) {

                durationElement.textContent =
                    formatTime(
                        audioPlayer.duration
                    );

            }

        }
    );


    audioPlayer.addEventListener(
        "timeupdate",
        () => {

            if (
                !audioPlayer.duration ||
                !Number.isFinite(
                    audioPlayer.duration
                )
            ) {

                return;

            }


            const progress =
                (
                    audioPlayer.currentTime /
                    audioPlayer.duration
                ) * 100;


            progressBar.value =
                progress;


            currentTimeElement.textContent =
                formatTime(
                    audioPlayer.currentTime
                );

        }
    );


    audioPlayer.addEventListener(
        "play",
        () => {

            updatePlayButton(true);

        }
    );


    audioPlayer.addEventListener(
        "pause",
        () => {

            updatePlayButton(false);

        }
    );


    /*
     * Automatically move to the next track
     * when the current track finishes.
     */

    audioPlayer.addEventListener(
        "ended",
        () => {

            nextTrack();

        }
    );


    audioPlayer.addEventListener(
        "error",
        () => {

            console.error(
                "There was a problem playing this audio file."
            );

            updatePlayButton(false);

        }
    );


    /* =====================================================
       PROGRESS BAR
    ===================================================== */

    if (progressBar) {

        progressBar.addEventListener(
            "input",
            () => {

                if (
                    !audioPlayer.duration ||
                    !Number.isFinite(
                        audioPlayer.duration
                    )
                ) {

                    return;

                }


                const percentage =
                    Number(
                        progressBar.value
                    );


                audioPlayer.currentTime =
                    (
                        percentage / 100
                    ) *
                    audioPlayer.duration;

            }
        );

    }


    /* =====================================================
       VOLUME
    ===================================================== */

    if (volumeControl) {

        audioPlayer.volume =
            Number(volumeControl.value);


        volumeControl.addEventListener(
            "input",
            () => {

                audioPlayer.volume =
                    Number(
                        volumeControl.value
                    );

            }
        );

    }


    /* =====================================================
       RENDER PLAYLIST
    ===================================================== */

    function renderPlaylist() {

        if (!playlist) {
            return;
        }


        playlist
            .querySelectorAll(".playlist-track")
            .forEach(track => track.remove());


        if (!tracks.length) {

            emptyPlaylist.style.display =
                "flex";

            return;

        }


        emptyPlaylist.style.display =
            "none";


        tracks.forEach(
            (track, index) => {

                const trackElement =
                    document.createElement("article");

                trackElement.className =
                    "playlist-track";


                if (
                    index ===
                    currentTrackIndex
                ) {

                    trackElement.classList.add(
                        "active"
                    );

                }


                /* Track icon */

                const icon =
                    document.createElement("div");

                icon.className =
                    "playlist-track-icon";

                icon.innerHTML =
                    '<i class="fa-solid fa-music"></i>';


                /* Information */

                const information =
                    document.createElement("div");

                information.className =
                    "playlist-track-information";


                const title =
                    document.createElement("h3");

                title.textContent =
                    track.name;


                const artist =
                    document.createElement("span");

                artist.textContent =
                    track.artist;


                information.appendChild(title);
                information.appendChild(artist);


                /* Play button */

                const playTrackButton =
                    document.createElement("button");

                playTrackButton.type =
                    "button";

                playTrackButton.className =
                    "playlist-track-play";

                playTrackButton.setAttribute(
                    "aria-label",
                    `Play ${track.name} `
                );


                playTrackButton.innerHTML =
                    index === currentTrackIndex &&
                        !audioPlayer.paused
                        ? '<i class="fa-solid fa-pause"></i>'
                        : '<i class="fa-solid fa-play"></i>';


                playTrackButton.addEventListener(
                    "click",
                    (event) => {

                        event.stopPropagation();

                        if (
                            currentTrackIndex ===
                            index &&
                            !audioPlayer.paused
                        ) {

                            audioPlayer.pause();

                        } else {

                            loadTrack(
                                index,
                                true
                            );

                        }

                    }
                );


                /* Delete button */

                const deleteButton =
                    document.createElement("button");

                deleteButton.type =
                    "button";

                deleteButton.className =
                    "playlist-track-delete";

                deleteButton.setAttribute(
                    "aria-label",
                    `Remove ${track.name} `
                );

                deleteButton.innerHTML =
                    '<i class="fa-solid fa-trash"></i>';


                deleteButton.addEventListener(
                    "click",
                    (event) => {

                        event.stopPropagation();

                        removeTrack(index);

                    }
                );


                trackElement.appendChild(icon);

                trackElement.appendChild(
                    information
                );

                trackElement.appendChild(
                    playTrackButton
                );

                trackElement.appendChild(
                    deleteButton
                );


                /*
                 * Clicking the track itself loads it.
                 */

                trackElement.addEventListener(
                    "click",
                    () => {

                        loadTrack(
                            index,
                            true
                        );

                    }
                );


                playlist.appendChild(
                    trackElement
                );

            }
        );

    }


    /* =====================================================
       REMOVE TRACK
    ===================================================== */

    function removeTrack(index) {

        if (
            index < 0 ||
            index >= tracks.length
        ) {

            return;

        }


        const removedTrack =
            tracks[index];


        /*
         * Release the browser's object URL.
         */

        URL.revokeObjectURL(
            removedTrack.url
        );


        /*
         * If removing the currently playing track,
         * stop the player.
         */

        if (
            index ===
            currentTrackIndex
        ) {

            audioPlayer.pause();

            audioPlayer.removeAttribute(
                "src"
            );

            audioPlayer.load();


            currentTrackIndex = -1;


            trackTitle.textContent =
                "No song selected";

            trackArtist.textContent =
                "Add a music file to begin";


            currentTimeElement.textContent =
                "0:00";

            durationElement.textContent =
                "0:00";

            progressBar.value =
                0;

            updatePlayButton(false);

        }


        tracks.splice(
            index,
            1
        );


        /*
         * Correct the current index after deletion.
         */

        if (
            currentTrackIndex >
            index
        ) {

            currentTrackIndex--;

        }


        if (
            currentTrackIndex >=
            tracks.length
        ) {

            currentTrackIndex =
                tracks.length - 1;

        }


        updatePlaylistCount();

        renderPlaylist();

    }


    /* =====================================================
       PLAYLIST COUNT
    ===================================================== */

    function updatePlaylistCount() {

        if (!playlistCount) {
            return;
        }


        const count =
            tracks.length;


        playlistCount.textContent =
            `${count} ${count === 1
                ? "track"
                : "tracks"
            } `;

    }


    /* =====================================================
       FORMAT TIME
    ===================================================== */

    function formatTime(seconds) {

        if (
            !Number.isFinite(seconds) ||
            seconds < 0
        ) {

            return "0:00";

        }


        const minutes =
            Math.floor(
                seconds / 60
            );


        const remainingSeconds =
            Math.floor(
                seconds % 60
            );


        return `${minutes}:${String(
            remainingSeconds
        ).padStart(2, "0")
            } `;

    }


    /* =====================================================
       SPOTIFY MODAL
    ===================================================== */

    function openSpotifyModal() {

        if (!spotifyModal) {
            return;
        }


        spotifyModal.classList.add(
            "open"
        );


        spotifyModal.setAttribute(
            "aria-hidden",
            "false"
        );

    }


    function closeSpotifyModal() {

        if (!spotifyModal) {
            return;
        }


        spotifyModal.classList.remove(
            "open"
        );


        spotifyModal.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    if (spotifyButton) {

        spotifyButton.addEventListener(
            "click",
            openSpotifyModal
        );

    }


    if (spotifyModalClose) {

        spotifyModalClose.addEventListener(
            "click",
            closeSpotifyModal
        );

    }


    if (spotifyModalButton) {

        spotifyModalButton.addEventListener(
            "click",
            closeSpotifyModal
        );

    }


    if (spotifyModalOverlay) {

        spotifyModalOverlay.addEventListener(
            "click",
            closeSpotifyModal
        );

    }


    /* =====================================================
       ESCAPE KEY
    ===================================================== */

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                spotifyModal &&
                spotifyModal.classList.contains("open")
            ) {

                closeSpotifyModal();

            }

        }
    );


    /* =====================================================
       INITIALIZE
    ===================================================== */

    updatePlaylistCount();

    renderPlaylist();

    updatePlayButton(false);

});