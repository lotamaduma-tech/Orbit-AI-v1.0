/* =========================================================
   ORBIT AI — CALENDAR
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       ELEMENTS
    ===================================================== */

    const calendarGrid = document.getElementById("calendar-grid");
    const calendarMonth = document.getElementById("calendar-month");
    const calendarYear = document.getElementById("calendar-year");

    const previousMonthButton = document.getElementById("previous-month");
    const nextMonthButton = document.getElementById("next-month");
    const todayButton = document.getElementById("today-button");

    const selectedDateElement = document.getElementById("selected-date");
    const eventCountElement = document.getElementById("event-count");
    const eventList = document.getElementById("event-list");
    const emptyEvents = document.getElementById("empty-events");

    const upcomingEvents = document.getElementById("upcoming-events");
    const emptyUpcoming = document.getElementById("empty-upcoming");

    const addEventButton = document.getElementById("add-event-button");
    const panelAddEventButton = document.getElementById("panel-add-event");

    const eventModal = document.getElementById("event-modal");
    const eventModalOverlay = document.getElementById("event-modal-overlay");
    const modalClose = document.getElementById("modal-close");
    const cancelEventButton = document.getElementById("cancel-event-button");

    const eventForm = document.getElementById("event-form");

    const eventTitle = document.getElementById("event-title");
    const eventDate = document.getElementById("event-date");
    const eventTime = document.getElementById("event-time");
    const eventLocation = document.getElementById("event-location");
    const eventDescription = document.getElementById("event-description");


    /* =====================================================
       STORAGE
    ===================================================== */

    const STORAGE_KEY = "orbitCalendarEvents";

    let events = loadEvents();


    /* =====================================================
       CALENDAR STATE
    ===================================================== */

    const today = new Date();

    let currentMonth = today.getMonth();
    let currentYear = today.getFullYear();

    let selectedDate = formatDate(today);


    /* =====================================================
       LOAD EVENTS
    ===================================================== */

    function loadEvents() {

        try {

            const savedEvents =
                localStorage.getItem(STORAGE_KEY);

            if (!savedEvents) {
                return [];
            }

            const parsedEvents =
                JSON.parse(savedEvents);

            return Array.isArray(parsedEvents)
                ? parsedEvents
                : [];

        } catch (error) {

            console.error(
                "Unable to load calendar events:",
                error
            );

            return [];

        }

    }


    /* =====================================================
       SAVE EVENTS
    ===================================================== */

    function saveEvents() {

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(events)
            );

        } catch (error) {

            console.error(
                "Unable to save calendar events:",
                error
            );

            alert(
                "Orbit could not save this event."
            );

        }

    }


    /* =====================================================
       FORMAT DATE
    ===================================================== */

    function formatDate(date) {

        const year = date.getFullYear();

        const month = String(
            date.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            date.getDate()
        ).padStart(2, "0");

        return `${ year } -${ month } -${ day } `;

    }


    /* =====================================================
       DISPLAY DATE
    ===================================================== */

    function formatDisplayDate(dateString) {

        if (!dateString) {
            return "Selected Date";
        }

        const date =
            new Date(`${ dateString } T00:00:00`);

        if (Number.isNaN(date.getTime())) {
            return dateString;
        }

        return date.toLocaleDateString(
            "en-US",
            {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric"
            }
        );

    }


    /* =====================================================
       FORMAT TIME
    ===================================================== */

    function formatTime(time) {

        if (!time) {
            return "No time";
        }

        const [hours, minutes] =
            time.split(":");

        const date = new Date();

        date.setHours(
            Number(hours),
            Number(minutes),
            0,
            0
        );

        return date.toLocaleTimeString(
            "en-US",
            {
                hour: "numeric",
                minute: "2-digit"
            }
        );

    }


    /* =====================================================
       GET EVENTS FOR DATE
    ===================================================== */

    function getEventsForDate(date) {

        return events.filter(
            event =>
                event.date === date
        );

    }


    /* =====================================================
       RENDER CALENDAR
    ===================================================== */

    function renderCalendar() {

        calendarGrid.innerHTML = "";

        const firstDay =
            new Date(
                currentYear,
                currentMonth,
                1
            ).getDay();

        const daysInMonth =
            new Date(
                currentYear,
                currentMonth + 1,
                0
            ).getDate();


        /* MONTH NAME */

        const monthName =
            new Date(
                currentYear,
                currentMonth,
                1
            ).toLocaleDateString(
                "en-US",
                {
                    month: "long"
                }
            );

        calendarMonth.textContent =
            monthName;

        calendarYear.textContent =
            currentYear;


        /* EMPTY DAYS */

        for (
            let i = 0;
            i < firstDay;
            i++
        ) {

            const emptyDay =
                document.createElement("div");

            emptyDay.className =
                "calendar-day calendar-day-empty";

            calendarGrid.appendChild(
                emptyDay
            );

        }


        /* MONTH DAYS */

        for (
            let day = 1;
            day <= daysInMonth;
            day++
        ) {

            const date =
                new Date(
                    currentYear,
                    currentMonth,
                    day
                );

            const dateString =
                formatDate(date);

            const dayElement =
                document.createElement("button");

            dayElement.type = "button";

            dayElement.className =
                "calendar-day";

            dayElement.dataset.date =
                dateString;


            /* DAY NUMBER */

            const dayNumber =
                document.createElement("span");

            dayNumber.className =
                "calendar-day-number";

            dayNumber.textContent =
                day;

            dayElement.appendChild(
                dayNumber
            );


            /* TODAY */

            if (
                dateString ===
                formatDate(today)
            ) {

                dayElement.classList.add(
                    "today"
                );

            }


            /* SELECTED */

            if (
                dateString ===
                selectedDate
            ) {

                dayElement.classList.add(
                    "selected"
                );

            }


            /* EVENTS */

            const dayEvents =
                getEventsForDate(
                    dateString
                );

            if (dayEvents.length > 0) {

                dayElement.classList.add(
                    "has-event"
                );

                const indicator =
                    document.createElement("span");

                indicator.className =
                    "event-indicator";

                if (dayEvents.length > 1) {

                    indicator.textContent =
                        dayEvents.length;

                }

                dayElement.appendChild(
                    indicator
                );

            }


            /* CLICK */

            dayElement.addEventListener(
                "click",
                () => {

                    selectedDate =
                        dateString;

                    renderCalendar();

                    renderSelectedEvents();

                }
            );


            calendarGrid.appendChild(
                dayElement
            );

        }

    }


    /* =====================================================
       RENDER SELECTED EVENTS
    ===================================================== */

    function renderSelectedEvents() {

        const selectedEvents =
            getEventsForDate(
                selectedDate
            );

        selectedDateElement.textContent =
            formatDisplayDate(
                selectedDate
            );

        eventCountElement.textContent =
            selectedEvents.length;


        /* REMOVE OLD EVENTS */

        eventList
            .querySelectorAll(
                ".calendar-event"
            )
            .forEach(
                item => item.remove()
            );


        /* EMPTY STATE */

        if (
            selectedEvents.length === 0
        ) {

            emptyEvents.style.display =
                "flex";

            return;

        }


        emptyEvents.style.display =
            "none";


        /* SORT EVENTS */

        const sortedEvents =
            [...selectedEvents].sort(
                (a, b) => {

                    const timeA =
                        a.time || "23:59";

                    const timeB =
                        b.time || "23:59";

                    return timeA.localeCompare(
                        timeB
                    );

                }
            );


        /* CREATE EVENTS */

        sortedEvents.forEach(
            event => {

                eventList.appendChild(
                    createEventElement(event)
                );

            }
        );

    }


    /* =====================================================
       CREATE EVENT ELEMENT
    ===================================================== */

    function createEventElement(event) {

        const article =
            document.createElement("article");

        article.className =
            "calendar-event";


        /* CONTENT */

        const content =
            document.createElement("div");

        content.className =
            "calendar-event-content";


        /* TITLE */

        const title =
            document.createElement("h3");

        title.textContent =
            event.title;


        content.appendChild(
            title
        );


        /* TIME */

        const time =
            document.createElement("span");

        time.innerHTML =
            `< i class="fa-regular fa-clock" ></i > ${ formatTime(event.time) } `;

        content.appendChild(
            time
        );


        /* LOCATION */

        if (event.location) {

            const location =
                document.createElement("span");

            location.innerHTML =
                `< i class="fa-solid fa-location-dot" ></i > ${ escapeHTML(event.location) } `;

            content.appendChild(
                location
            );

        }


        /* DESCRIPTION */

        if (event.description) {

            const description =
                document.createElement("p");

            description.textContent =
                event.description;

            content.appendChild(
                description
            );

        }


        /* DELETE */

        const deleteButton =
            document.createElement("button");

        deleteButton.type =
            "button";

        deleteButton.className =
            "delete-event-button";

        deleteButton.setAttribute(
            "aria-label",
            `Delete ${ event.title } `
        );

        deleteButton.innerHTML =
            `< i class="fa-solid fa-trash" ></i > `;


        deleteButton.addEventListener(
            "click",
            () => {

                deleteEvent(
                    event.id
                );

            }
        );


        article.appendChild(
            content
        );

        article.appendChild(
            deleteButton
        );


        return article;

    }


    /* =====================================================
       DELETE EVENT
    ===================================================== */

    function deleteEvent(id) {

        const confirmed =
            confirm(
                "Delete this event?"
            );

        if (!confirmed) {
            return;
        }


        events =
            events.filter(
                event =>
                    event.id !== id
            );


        saveEvents();

        renderCalendar();

        renderSelectedEvents();

        renderUpcomingEvents();

    }


    /* =====================================================
       OPEN EVENT MODAL
    ===================================================== */

    function openEventModal() {

        eventModal.classList.add(
            "open"
        );

        eventModal.setAttribute(
            "aria-hidden",
            "false"
        );


        /* DEFAULT DATE */

        eventDate.value =
            selectedDate;


        /* CLEAR OLD FORM */

        eventTitle.value = "";
        eventTime.value = "";
        eventLocation.value = "";
        eventDescription.value = "";


        setTimeout(
            () => {
                eventTitle.focus();
            },
            100
        );

    }


    /* =====================================================
       CLOSE EVENT MODAL
    ===================================================== */

    function closeEventModal() {

        eventModal.classList.remove(
            "open"
        );

        eventModal.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    /* =====================================================
       SAVE EVENT
    ===================================================== */

    eventForm.addEventListener(
        "submit",
        event => {

            event.preventDefault();


            const title =
                eventTitle.value.trim();

            const date =
                eventDate.value;

            const time =
                eventTime.value;

            const location =
                eventLocation.value.trim();

            const description =
                eventDescription.value.trim();


            if (!title) {

                alert(
                    "Please enter an event title."
                );

                eventTitle.focus();

                return;

            }


            if (!date) {

                alert(
                    "Please select a date."
                );

                eventDate.focus();

                return;

            }


            const newEvent = {

                id:
                    `${ Date.now() } -${
    Math.random()
    .toString(36)
    .slice(2, 9)
} `,

                title,

                date,

                time,

                location,

                description,

                createdAt:
                    new Date().toISOString()

            };


            events.push(
                newEvent
            );


            saveEvents();


            /* SELECT EVENT DATE */

            selectedDate =
                date;


            const selected =
                new Date(
                    `${ date } T00:00:00`
                );

            currentMonth =
                selected.getMonth();

            currentYear =
                selected.getFullYear();


            closeEventModal();

            renderCalendar();

            renderSelectedEvents();

            renderUpcomingEvents();

        }
    );


    /* =====================================================
       UPCOMING EVENTS
    ===================================================== */

    function renderUpcomingEvents() {

        upcomingEvents
            .querySelectorAll(
                ".upcoming-event"
            )
            .forEach(
                item => item.remove()
            );


        const todayString =
            formatDate(today);


        const upcoming =
            events
                .filter(
                    event =>
                        event.date >=
                        todayString
                )
                .sort(
                    (a, b) => {

                        const dateA =
                            `${ a.date } ${ a.time || "23:59" } `;

                        const dateB =
                            `${ b.date } ${ b.time || "23:59" } `;

                        return dateA.localeCompare(
                            dateB
                        );

                    }
                )
                .slice(0, 10);


        /* EMPTY */

        if (
            upcoming.length === 0
        ) {

            emptyUpcoming.style.display =
                "flex";

            return;

        }


        emptyUpcoming.style.display =
            "none";


        /* UPCOMING EVENTS */

        upcoming.forEach(
            event => {

                const element =
                    document.createElement("article");

                element.className =
                    "upcoming-event";


                /* DATE */

                const date =
                    document.createElement("div");

                date.className =
                    "upcoming-event-date";

                date.textContent =
                    new Date(
                        `${ event.date } T00:00:00`
                    ).toLocaleDateString(
                        "en-US",
                        {
                            month: "short",
                            day: "numeric"
                        }
                    );


                /* CONTENT */

                const content =
                    document.createElement("div");

                content.className =
                    "upcoming-event-content";


                const title =
                    document.createElement("h3");

                title.textContent =
                    event.title;


                const details =
                    document.createElement("span");

                const timeText =
                    formatTime(event.time);

                details.textContent =
                    event.location
                        ? `${ timeText } • ${ event.location } `
                        : timeText;


                content.appendChild(
                    title
                );

                content.appendChild(
                    details
                );


                element.appendChild(
                    date
                );

                element.appendChild(
                    content
                );


                /* CLICK UPCOMING EVENT */

                element.addEventListener(
                    "click",
                    () => {

                        selectedDate =
                            event.date;

                        const eventDateObject =
                            new Date(
                                `${ event.date } T00:00:00`
                            );

                        currentMonth =
                            eventDateObject.getMonth();

                        currentYear =
                            eventDateObject.getFullYear();

                        renderCalendar();

                        renderSelectedEvents();

                        window.scrollTo({
                            top: 0,
                            behavior: "smooth"
                        });

                    }
                );


                upcomingEvents.appendChild(
                    element
                );

            }
        );

    }


    /* =====================================================
       PREVIOUS MONTH
    ===================================================== */

    previousMonthButton.addEventListener(
        "click",
        () => {

            currentMonth--;

            if (currentMonth < 0) {

                currentMonth = 11;

                currentYear--;

            }

            renderCalendar();

        }
    );


    /* =====================================================
       NEXT MONTH
    ===================================================== */

    nextMonthButton.addEventListener(
        "click",
        () => {

            currentMonth++;

            if (currentMonth > 11) {

                currentMonth = 0;

                currentYear++;

            }

            renderCalendar();

        }
    );


    /* =====================================================
       TODAY
    ===================================================== */

    todayButton.addEventListener(
        "click",
        () => {

            currentMonth =
                today.getMonth();

            currentYear =
                today.getFullYear();

            selectedDate =
                formatDate(today);

            renderCalendar();

            renderSelectedEvents();

        }
    );


    /* =====================================================
       ADD EVENT BUTTON
    ===================================================== */

    if (addEventButton) {

        addEventButton.addEventListener(
            "click",
            openEventModal
        );

    }


    if (panelAddEventButton) {

        panelAddEventButton.addEventListener(
            "click",
            openEventModal
        );

    }


    /* =====================================================
       CLOSE MODAL
    ===================================================== */

    if (modalClose) {

        modalClose.addEventListener(
            "click",
            closeEventModal
        );

    }


    if (cancelEventButton) {

        cancelEventButton.addEventListener(
            "click",
            closeEventModal
        );

    }


    if (eventModalOverlay) {

        eventModalOverlay.addEventListener(
            "click",
            closeEventModal
        );

    }


    /* =====================================================
       ESCAPE KEY
    ===================================================== */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                eventModal.classList.contains("open")
            ) {

                closeEventModal();

            }

        }
    );


    /* =====================================================
       ESCAPE HTML
    ===================================================== */

    function escapeHTML(value) {

        const div =
            document.createElement("div");

        div.textContent =
            value;

        return div.innerHTML;

    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    eventDate.value =
        selectedDate;

    renderCalendar();

    renderSelectedEvents();

    renderUpcomingEvents();

});