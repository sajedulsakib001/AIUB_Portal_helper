// Wait for DOM to load before initializing
document.addEventListener("DOMContentLoaded", () => {
    loadHTML("show-page-content", "home");
    setupNavigation();
});

// ----------- Navigation Logic -----------

/**
 * Loads HTML content into a container by ID.
 * @param {string} id - The container element ID.
 * @param {string} file - The page name (without .html).
 */
function loadHTML(id, file) {
    const container = document.getElementById(id);
    container.classList.remove('active');

    setTimeout(() => {
        const path = `app/pages/${file}.html`;
        fetch(chrome.runtime.getURL(path))
            .then(response => response.text())
            .then(data => {
                container.innerHTML = data;

                // Re-run setup for specific pages
                if (file === "other") {
                    setupOtherMenu();
                } else if (file === "home") {
                    setUpHome();
                } else if (file === "settings") {
                    setupSettingsPage();
                }

                setTimeout(() => {
                    container.classList.add('active');
                }, 50);
            })
            .catch(err => console.error(`Error loading ${file}:`, err));
    }, 150);
}

/**
 * Sets up navigation bar click events.
 */
function setupNavigation() {
    const navItems = document.querySelectorAll(".nav-item");

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const targetPage = item.getAttribute("data-page");
            if (!targetPage) return;

            navItems.forEach(nav => nav.classList.remove("active"));
            item.classList.add("active");
            loadHTML("show-page-content", targetPage);
        });
    });

    // Mark 'Home' as active on initial load
    const defaultItem = document.querySelector('.nav-item[data-page="home"]');
    if (defaultItem) defaultItem.classList.add('active');
}

// ----------- Home Page Logic -----------

/**
 * Sets up the Home page: greeting, date, and button events.
 */
function setUpHome() {
    setGreeting();
    setCurrentDate();

    const reloadBtn = document.getElementById("reloadRoutine");
    const downloadBtn = document.getElementById("downloadPdf");

    if (reloadBtn) {
        reloadBtn.addEventListener("click", () => reloadHomePage(true));
    }

    if (downloadBtn) {
        downloadBtn.addEventListener("click", () => {
            alert("Downloading PDF...");
            // TODO: Add PDF export logic here
        });
    }

    reloadHomePage();
}

/**
 * Sets the greeting text based on the current time.
 */
function setGreeting() {
    const greetingEl = document.getElementById('greeting');
    if (!greetingEl) return;

    const hour = new Date().getHours();
    let greetingText = '👋 Hello!';
    if (hour >= 5 && hour < 12) greetingText = '🌅 Good Morning!';
    else if (hour >= 12 && hour < 17) greetingText = '☀️ Good Afternoon!';
    else if (hour >= 17 && hour < 21) greetingText = '🌇 Good Evening!';
    else greetingText = '🌙 Good Night!';

    greetingEl.textContent = greetingText;
}

/**
 * Sets the current date in the #currentDate element.
 */
async function setCurrentDate() {
    const dateEl = document.getElementById('currentDate');
    if (!dateEl) {
        console.error("Element with id 'currentDate' not found.");
        return;
    }
    dateEl.textContent = getDateTime();
    const fetchedHolidays = await fetch("app/assets/json/holidays.json");
    const holidays = await fetchedHolidays.json();
    for (const holiday of holidays) {
        const holidayDate = new Date(holiday["date"]);
        // console.log(holidayDate);
        const currentDate = new Date();
        if (holidayDate.getDate() === currentDate.getDate() && holidayDate.getMonth() === currentDate.getMonth()) {
            const holidayText = document.createElement("span");
            const br = document.createElement("br");
            dateEl.appendChild(br);
            const style = "color: #ff0000; font-weight: bold; margin-left: 5px; font-size: 0.8em;";
            holidayText.style = style;
            holidayText.textContent = `Possible Holiday - (${holiday.name})`;
            dateEl.appendChild(holidayText);
            break;
        }
    }
    // const holidayEl = document.createElement("span");

}

/**
 * Reloads the home page routine, optionally clearing cache.
 * @param {boolean} reload - If true, clears local storage.
 */
async function reloadHomePage(reload = false) {
    const show = async (data) => {
        const day = getDateTime().substring(0, 3);
        await delay(500);
        showRoutine(data, day);
    }
    if (!reload) {
        let data = JSON.parse(localStorage.getItem("routine"));
        if (data === null || data.length === 0) {
            await delay(500);
            showNoRoutineMessage();
        } else {
            show(data);
        }
        return;
    }
    localStorage.removeItem("routine");
    localStorage.removeItem("currentCourses");
    console.log("Routine removed from storage.");

    data = await getRoutine();
    if (data !== null) {
        show(data[0]);
        localStorage.setItem("routine", JSON.stringify(data[0]));
        console.log("Routine saved to storage.", data[0]);
        localStorage.setItem("currentCourses", JSON.stringify(data[1]));
        console.log("Current Courses saved to storage.", data[1]);
    } else {
        showNoRoutineMessage();
        return;
    }
}

/**
 * Shows a message when no routine is found.
 */
function showNoRoutineMessage() {
    const list = document.getElementById("routineList");
    if (list) {
        list.innerHTML = "<center><strong>No Routine was found.</strong><br><p>Please, Click on Reload</p></center>";
    }
}

/**
 * Utility: Delay for ms milliseconds.
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ----------- Routine Logic -----------

/**
 * Displays today's routine in the #routineList element.
 * @param {Array} routine - The routine array.
 * @param {string} today - The current day (e.g., "Mon").
 */
function showRoutine(routine, today) {
    const list = document.getElementById("routineList");
    if (!list) return;

    list.innerHTML = "";
    if (!routine) {
        list.innerHTML = "<li>No Routine was found.</li>";
        return;
    }

    let found = false;
    for (const day of routine) {
        if (day["day"] !== today) continue;
        for (const todaysClass of day["classes"]) {
            const item = document.createElement("div");
            item.className = "routine-item";

            const time = document.createElement("span");
            time.className = "time";
            time.innerText = todaysClass["time"];

            const subject = document.createElement("span");
            subject.className = "subject";
            subject.innerHTML = `${todaysClass["course"]} <strong>Room: ${todaysClass["room"]}</strong>`;

            item.appendChild(time);
            item.appendChild(subject);
            list.appendChild(item);
        }
        found = true;
        break;
    }
    if (!found) {
        list.innerHTML = "<center><h5>No Class for Today.</h5></center>";
    }
}

/**
 * Gets the current date in a readable format.
 * @returns {string}
 */
function getDateTime() {
    const T = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return T.toLocaleDateString(undefined, options);
}

// ----------- Other Page Logic -----------

/**
 * Sets up the Other page menu and content transitions.
 */
function setupOtherMenu() {
    const menu = document.getElementById("otherMenu");
    const contentBox = document.getElementById("otherContent");
    const topicContent = document.getElementById("topicContent");
    const backBtn = document.getElementById("backToMenu");
    const options = document.querySelectorAll(".option-btn");

    options.forEach(option => {
        option.addEventListener("click", async () => {
            const topic = option.getAttribute("data-topic");
            const loadedHtml = await loadOtherContent(topic);
            const title = option.innerText.trim();

            menu.classList.add("fade-out");
            menu.addEventListener("animationend", () => {
                menu.style.display = "none";
                menu.classList.remove("fade-out");
                backBtn.style.display = "block";
                contentBox.style.display = "block";
                contentBox.classList.add("fade-in");
                backBtn.classList.add("fade-in");
                topicContent.innerHTML = `<h2 class="mb-3 none">${title}</h2>${loadedHtml}`;
                if (topic === "unlockedCourse") {
                    setupUnlockedCoursePage();
                    setTimeout(loadUnlockedCourses, 1000);
                } 
                // else if (topic === "examSchedule") {
                //     setupExamSchedulePage();
                //     setTimeout(displayExamSchedule, 1000);
                // }
            }, { once: true });
        });
    });

    backBtn.addEventListener("click", () => {
        contentBox.classList.add("fade-out");
        contentBox.addEventListener("animationend", () => {
            contentBox.style.display = "none";
            contentBox.classList.remove("fade-out");
            backBtn.style.display = "none";
            backBtn.classList.remove("fade-in");
            menu.style.display = "block";
            menu.classList.add("fade-in");
        }, { once: true });
    });
}

/**
 * Loads HTML content for the Other page topics.
 * @param {string} file - The topic file name (without .html).
 * @returns {Promise<string>}
 */
async function loadOtherContent(file) {
    const path = `app/pages/other/${file}.html`;
    try {
        const response = await fetch(chrome.runtime.getURL(path));
        return await response.text();
    }catch (err) {
        console.error(`Error loading ${file}:`, err);
        return "";
    }
}

// ----------- Unlocked Courses Logic -----------

/**
 * Sets up the unlocked courses page.
 */
async function setupUnlockedCoursePage() {
    document.getElementById('unlocked').addEventListener('click', async () => {
        loadUnlockedCourses(true);
    });
}

/**
 * Loads and displays unlocked courses.
 * @param {boolean} reload - If true, reloads data from source.
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

    // Reload from source
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
 * Shows a message in the course list area.
 * @param {string} message
 */
function showCourseListMessage(message) {
    const list = document.getElementById("courseList");
    if (list) {
        list.innerHTML = `<h4><strong>${message}</strong></h4>`;
    }
}

/**
 * Displays unlocked courses in the course list.
 * @param {Array} results - The unlocked courses array.
 * @param {string} programName - The program name.
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

// ----------- Data Fetching Logic -----------

/**
 * Gets the routine from the active tab.
 * @returns {Promise<Array|null>}
 */
function getRoutine() {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (tab.url !== "https://portal.aiub.edu/Student") {
                if (tab.url.includes("portal.aiub.edu/Student")) {
                    chrome.tabs.update(tab.id, { url: "https://portal.aiub.edu/Student" });
                    return;
                }
                chrome.tabs.create({ url: "https://portal.aiub.edu/Student" });
                return;
            }

            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    // Scrape routine data from the page
                    const rows = document.querySelectorAll('.scheduleTable .row');

                    const planMap = {};

                    rows.forEach(row => {
                        const entries = row.querySelectorAll('.col-md-10 .col-md-6');
                        entries.forEach(entry => {
                            const courseLink = entry.querySelector('a');
                            if (!courseLink) return;

                            const courseName = courseLink.innerText.trim();
                            const timeRoomText = entry.querySelector('div')?.innerText || '';
                            const timeMatch = timeRoomText.match(/Time:\s*(.*?)\s*Room:/i);
                            const roomMatch = timeRoomText.match(/Room:\s*(.*)/i);

                            if (timeMatch && roomMatch) {
                                const timeStr = timeMatch[1].trim();
                                const room = roomMatch[1].trim();
                                const dayMatch = timeStr.match(/^(Sat|Sun|Mon|Tue|Wed|Thu|Fri)/i);
                                if (!dayMatch) return;

                                const day = dayMatch[1];
                                if (!planMap[day]) planMap[day] = [];

                                const exists = planMap[day].some(item =>
                                    item.course === courseName && item.time === timeStr && item.room === room
                                );
                                if (!exists) {
                                    planMap[day].push({ course: courseName, time: timeStr, room });
                                }
                            }
                        });
                    });

                    // Order days for display
                    const orderedDays = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
                    const orderedPlan = orderedDays
                        .filter(day => planMap[day])
                        .map(day => ({
                            day,
                            classes: planMap[day]
                        }));
                    ///Get Course information
                    var currentCourses = [];

                    document.querySelectorAll('.StudentCourseList .panel.panel-primary').forEach(panel => {
                        const body = panel.querySelector('.panel-body');

                        // Get the raw course info line (e.g., "02269 - MATRICES, VECTORS, FOURIER ANALYSIS [R]")
                        const rawCourseLine = body.childNodes[0].textContent.trim().match(/^(\d+)\s*-\s*(.*?)\s*\[(\w+)\]$/);
                        const name = rawCourseLine[2];
                        const code = rawCourseLine[1];
                        const section = rawCourseLine[3];
                        // Extract section status, status, and result
                        const sectionStatus = body.querySelectorAll('label.label-info')[0]?.textContent.trim() || '';
                        const status = body.querySelectorAll('label.label-success')[0]?.textContent.trim() || '';
                        const resultText = [...body.querySelectorAll('div')].find(div => div.textContent.includes('Result'))?.innerText.trim().replace('Result :', '').trim() || '';

                        currentCourses.push({
                            name,
                            code,
                            section,
                            sectionStatus: sectionStatus.replace(/[()]/g, ''), // clean up "(Open)"
                            status,
                            result: resultText
                        });
                    });



                    return [orderedPlan, currentCourses];
                }
            }, (results) => {
                if (results && results[0]?.result) {
                    resolve(results[0].result);
                } else {
                    resolve(null);
                }
            });
        });
    });
}

/**
 * Gets the completed course list from the active tab.
 * @returns {Promise<[Array, string]>}
 */
function getCompletedCourseList() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab.url.includes("portal.aiub.edu/Student/GradeReport/ByCurriculum")) {
                if (tab.url.includes("portal.aiub.edu/Student")) {
                    chrome.tabs.update(tab.id, { url: "https://portal.aiub.edu/Student/GradeReport/ByCurriculum" });
                    return;
                }
                chrome.tabs.create({ url: "https://portal.aiub.edu/Student/GradeReport/ByCurriculum" });
                return;
            }

            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    // Scrape completed courses and program name
                    const tables = document.querySelectorAll(".grade-report table") || [];
                    const completed = [];
                    const getLatestGrade = (grade) => {
                        const matches = grade.match(/\[\w\]/g);
                        if (matches && matches.length > 0) {
                            const lastMatch = matches[matches.length - 1];
                            if (lastMatch === "[W]") return null;
                            return lastMatch;
                        }
                        return null;
                    };
                    for (let i = 1; i < tables.length; i++) {
                        const rows = tables[i].getElementsByTagName("tr");
                        for (let j = 1; j < rows.length; j++) {
                            const cells = rows[j].getElementsByTagName("td");
                            if (cells.length > 2) {
                                const courseCode = cells[0].innerText.trim();
                                const courseName = cells[1].innerText.trim();
                                let grade = cells[2].innerText.trim();
                                if (grade.includes("[W]")) grade = getLatestGrade(grade);
                                if (!grade) continue;
                                else if (grade.includes("[D]")) completed.push([courseCode, courseName, "Retake"]);
                                else completed.push([courseCode, courseName, ""]);
                            }
                        }
                    }
                    // Extract program name
                    let program = "";
                    try {
                        const firstTable = document.querySelector(".grade-report table");
                        const firstRow = firstTable?.querySelector("tr");
                        const lastCellText = firstRow?.cells[5]?.innerText?.trim();
                        const match = lastCellText?.includes("BSc") ? lastCellText?.match(/BSc(.*?),/)[1] : (lastCellText.split(",")[0]);
                        if (match) program = match.trim();
                    } catch (err) {
                        console.error("Failed to extract program:", err);
                    }
                    return [completed, program];
                }
            }, (results) => {
                if (results && results[0]?.result) {
                    resolve(results[0].result);
                } else {
                    reject("Failed to retrieve results");
                }
            });
        });
    });
}

/**
 * Gets the unlocked course list from a JSON file.
 * @param {string} program - The program name.
 * @param {Array} completedCourseList - List of completed courses.
 * @param {number} craditCompleted - Number of credits completed.
 * @returns {Promise<Array>}
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
                // Check if all prerequisites are completed and course not already completed
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
/**
 * Sets up the unlocked courses page.
 */
async function setupExamSchedulePage() {
    document.getElementById('reload').addEventListener('click', async () => {
        displayExamSchedule(true);
    });
}
// Function to fetch and process the exam schedule data
/**
 * Fetches and filters the exam schedule for the user's courses and sections.
 * Iterates through the provided exam schedule data, matches each course and section
 * with the user's course list, and collects relevant exam details.
 * 
 * @returns {Promise<Array>} An array of exam objects, each containing date, dayName, time, slotNo, and courseName.
 */
async function getExamSchedule(reload) {
    try {
        var schedule = [];
        const courseList = JSON.parse(localStorage.getItem("currentCourses"));
        // console.log(courseList, "Course List");
        if (courseList === null) {
            return null;
        }
        const response = await fetch("app/assets/json/example_Exam_Routine.json");
        const data = await response.json();
        if (data === null) return null;
        const term = data["term"];
        for (const day of data["exam_schedule"]) {
            const date = day["date"];
            const dayName = day["day"];
            for (const slot of day["slots"]) {
                const time = slot["time"];
                const slotNo = slot["slot"];
                for (const course of slot["courses"]) {
                    const courseName = course["course_title"];
                    const sections = course["sections"];
                    for (const coursefromList of courseList) {
                        // console.log(coursefromList["name"].toLowerCase(),courseName.toLowerCase(),"\n\n");
                        if (coursefromList["name"].toLowerCase() === courseName.toLowerCase()) {
                            for (const section of sections) {
                                if (section === coursefromList["section"]) {
                                    schedule.push({
                                        date,
                                        dayName,
                                        time,
                                        slotNo,
                                        courseName
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
        return { "schedule": schedule, "term": term };
    } catch (e) {
        return null;
    }
}

/**
 * Displays the filtered exam schedule in the HTML table.
 * Fetches the processed schedule, clears the table body, and appends a row for each exam.
 * 
 * @returns {Promise<void>}
 */
async function displayExamSchedule(reload = false) {

    const tbody = document.getElementById("exam-items");
    const show = (newSchedule) => {
        // console.log(newSchedule,"\n\nShow the Data!\n\n");
        const term = document.getElementById("term");
        term.innerText = newSchedule["term"];
        for (const exam of newSchedule["schedule"]) {
            const tr = document.createElement("tr");
            const td1 = document.createElement("td");
            const td2 = document.createElement("td");
            const td3 = document.createElement("td");

            td1.innerText = `${exam["date"]}\n${exam["dayName"]}\nSlot-${exam["slotNo"]}`;
            td2.innerText = exam["time"];
            td3.innerText = exam["courseName"];
            tr.append(td1, td2, td3);
            tbody.append(tr);
        }
    };
    tbody.innerHTML = "";
    if (!reload) {
        schedule = localStorage.getItem("examSchedule");
        if (schedule !== null) {
            show(JSON.parse(schedule));
            return;
        }
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.setAttribute("colspan", "3");
        td.innerText = "Please Reload the page to see the\nlatest exam schedule";
        tr.append(td);
        tbody.append(tr);
        return;
    }
    localStorage.removeItem("examSchedule");
    var newSchedule = await getExamSchedule(reload);
    // console.log(newSchedule, "New Schedule");
    if (newSchedule !== null) {
        show(newSchedule);
        localStorage.setItem("examSchedule", JSON.stringify(newSchedule));
    } else {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.setAttribute("colspan", "3");
        td.innerText = "No Exam Found";
        tr.append(td);
        tbody.append(tr);
        return;
    }
}

// ----------- Popup Logic -----------

/**
 * Show and hide popup box.
 */
document.getElementById("showPopup").addEventListener("click", () => {
    document.getElementById('popupBox').classList.add('show');
});
document.getElementById("closePopup").addEventListener("click", () => {
    document.getElementById('popupBox').classList.remove('show');
});


// ----------- Setup Settings -----------
/**
 * Sets up the settings page.
 */

async function setupSettingsPage() {
    console.log("Settings Page Loaded");
    const toggle = document.getElementById("autoLogin");
    const settingsFields = document.getElementById("settingsFields");
    const alertBox = document.getElementById('alertContainer');
    const closeBtn = document.getElementById('btnclose');

    toggle.addEventListener("change", function () {
        if (toggle.checked) {
            settingsFields.classList.add("show");
        } else {
            settingsFields.classList.remove("show");
        }
    });
    const btn = document.getElementById("save-settings");
    btn.addEventListener("click",()=>{
        saveSettingsInStorage();
        alertBox.style.display = 'block';
        setTimeout(() => {
            alertBox.style.display = 'none';
        },1000);
    });

    closeBtn.addEventListener('click', () => {
      alertBox.style.display = 'none';
    });
    showSavedSettings();
}

/**
 * Saves user settings (auto-login preference and API key) to local storage.
 * 
 * @returns {void} This function does not return a value.
 */

function saveSettingsInStorage() {
    const autoLogin = document.getElementById("autoLogin").checked;
    const apiKey = document.getElementById("apiKey").value;
    if (autoLogin && apiKey === "") {
        document.getElementById("wrongApi").style = "display:block;";
        return;
    }
    document.getElementById("wrongApi").style = "display:none;";
    const data = {
        autoLogin,
        apiKey,
    };
    chrome.storage.local.set({ settings: data }, () => {
        console.log("Settings saved to chrome.storage.local.");
    });
}


/**
 * Retrieves and displays saved settings from Chrome's local storage.
 * 
 * This function fetches the "settings" object stored in Chrome's local storage
 * and updates the UI elements accordingly. It sets the state of the "autoLogin"
 * checkbox, populates the "apiKey" input field, and toggles the visibility of
 * the settings fields based on the "autoLogin" value.
 * 
 * @function
 * @returns {void}
 */
function showSavedSettings() {
    chrome.storage.local.get(["settings"], (result) => {
        const settings = result.settings || {};
        if (settings) {
            document.getElementById("autoLogin").checked = settings.autoLogin;
            document.getElementById("apiKey").value = settings.apiKey;
            if (settings.autoLogin) {
                document.getElementById("settingsFields").classList.add("show");
            }
        }
    });
}