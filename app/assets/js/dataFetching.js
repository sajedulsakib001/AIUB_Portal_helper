


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

                    const orderedDays = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
                    const orderedPlan = orderedDays
                        .filter(day => planMap[day])
                        .map(day => ({
                            day,
                            classes: planMap[day]
                        }));
                    var currentCourses = [];

                    document.querySelectorAll('.StudentCourseList .panel.panel-primary').forEach(panel => {
                        const body = panel.querySelector('.panel-body');

                        const rawCourseLine = body.childNodes[0].textContent.trim().match(/^(\d+)\s*-\s*(.*?)\s*\[(\w+)\]$/);
                        const name = rawCourseLine[2];
                        const code = rawCourseLine[1];
                        const section = rawCourseLine[3];
                        const sectionStatus = body.querySelectorAll('label.label-info')[0]?.textContent.trim() || '';
                        const status = body.querySelectorAll('label.label-success')[0]?.textContent.trim() || '';
                        const resultText = [...body.querySelectorAll('div')].find(div => div.textContent.includes('Result'))?.innerText.trim().replace('Result :', '').trim() || '';

                        currentCourses.push({
                            name,
                            code,
                            section,
                            sectionStatus: sectionStatus.replace(/[()]/g, ''), 
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