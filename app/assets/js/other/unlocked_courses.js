/**
 * Loads and displays the list of unlocked courses.
 * If reload is false, loads from localStorage; otherwise, fetches fresh data.
 * @param {boolean} reload - Whether to reload data from the server.
 */
async function loadUnlockedCourses(reload = false) {
    let completedCourseList = null;
    let unlockedCoursesList = null;
    let program = null;

    if (!reload) {
        completedCourseList = localStorage.getItem("completedCourseList");
        program = localStorage.getItem("program");
        unlockedCoursesList = JSON.parse(localStorage.getItem("unlockedCoursesList"));
        if (!unlockedCoursesList || !program || !completedCourseList) {
            showCourseListMessage("No data found! Please reload the page.");
            return;
        }
        displayUnlockedCourseList(unlockedCoursesList, program);
        return;
    }

    completedCourseList = await getCompletedCourseList();
    if (!completedCourseList) {
        showCourseListMessage("Something went wrong! Please try again later.");
        return;
    }
    localStorage.setItem("completedCourseList", JSON.stringify(completedCourseList[0]));
    program = completedCourseList[1];
    localStorage.setItem("program", program);

    unlockedCoursesList = await getUnlockedCourseList(program, completedCourseList[0], 80);
    if (!unlockedCoursesList) {
        showCourseListMessage("Something went wrong! Please try again later.");
        return;
    }
    localStorage.setItem("unlockedCoursesList", JSON.stringify(unlockedCoursesList));
    displayUnlockedCourseList(unlockedCoursesList, program);
}

/**
 * Displays a message in the course list container.
 * @param {string} message - The message to display.
 */
function showCourseListMessage(message) {
    const list = document.getElementById("courseList");
    if (list) {
        list.innerHTML = `<h4><strong>${message}</strong></h4>`;
    }
}

/**
 * Renders the unlocked course list in the UI.
 * @param {Array} results - The unlocked courses to display.
 * @param {string} programName - The name of the program.
 */
function displayUnlockedCourseList(results, programName) {
    const list = document.getElementById("courseList");
    if (!list) return;
    list.innerHTML = "";

    if (programName) {
        const header = document.getElementById("program");
        if (header) header.textContent = "Program: BSc " + programName;
    }

    results.forEach((unlockedCourses, i) => {
        if (!unlockedCourses.length) return;

        const title = document.createElement("h4");
        title.className = "course-list-title";
        title.textContent = (i === 0) ? "Main Courses:" : "Elective/Major Courses:";
        list.appendChild(title);

        unlockedCourses.forEach(([code, name, status]) => {
            const card = document.createElement("div");
            card.className = "list-group-item";

            const cardBody = document.createElement("div");
            cardBody.className = "d-flex justify-content-between align-items-center";

            const titleSpan = document.createElement("span");
            titleSpan.className = "course-title";
            titleSpan.textContent = `${code}: ${name}`;
            if (status === "Retake") {
                const badge = document.createElement("span");
                badge.className = "badge badge-warning";
                badge.textContent = "Retake";
                titleSpan.append(" ", badge);
            }

            cardBody.appendChild(titleSpan);
            card.appendChild(cardBody);
            list.appendChild(card);
        });
    });
}

/**
 * Fetches and determines the list of unlocked courses based on completed courses and prerequisites.
 * @param {string} program - The program name.
 * @param {Array} completedCourseList - List of completed courses.
 * @param {number} craditCompleted - Number of credits completed.
 * @returns {Promise<Array|null>} - The unlocked course list or null on error.
 */
async function getUnlockedCourseList(program, completedCourseList, craditCompleted) {
    let unlockedCourseList = [[], []];
    const completedCodes = completedCourseList.map(([code]) => code);

    // Add retake courses to unlocked list
    completedCourseList.forEach(([code, name, status]) => {
        if (status === "Retake") {
            unlockedCourseList[0].push([code, name, status]);
        }
    });

    try {
        const response = await fetch(`app/assets/json/${program}.json`);
        const data = await response.json();
        let courseData = data;
        let position = 0;

        for (const [code, value] of Object.entries(courseData)) {
            if (code === "elective") {
                position = 1;
                courseData = courseData["elective"];
                continue;
            }
            const prereqs = value[0];
            const courseName = value[1];

            if (prereqs[0] !== "Nil" || prereqs.length > 0) {
                // Check if all prerequisites are completed and course is not already completed
                const allPrereqsCompleted = prereqs.every(p => completedCodes.includes(p));
                const alreadyCompleted = completedCodes.includes(code);
                if (allPrereqsCompleted && !alreadyCompleted) {
                    unlockedCourseList[position].push([code, courseName, ""]);
                }
            } else if (position === 2 && craditCompleted >= 80) {
                unlockedCourseList[position].push([code, courseName, ""]);
            }
        }
    } catch (error) {
        console.error('Error loading course data:', error);
        return null;
    }
    return unlockedCourseList;
}