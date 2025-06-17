


async function setupSettingsPage() {
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
    btn.addEventListener("click", () => {
        const res = saveSettingsInStorage();
        if (res) {
            alertBox.style.display = 'block';
            setTimeout(() => {
                alertBox.style.display = 'none';
            }, 1000);
        }
    });

    closeBtn.addEventListener('click', () => {
        alertBox.style.display = 'none';
    });
    showSavedSettings();
}


function saveSettingsInStorage() {
    const autoLogin = document.getElementById("autoLogin").checked;
    const apiKey = document.getElementById("apiKey").value;

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;


    if (autoLogin && apiKey === "") {
        document.getElementById("wrongApi").style = "display:block;";
        return false;
    }
    document.getElementById("wrongApi").style = "display:none;";
    const showTomorrowsRoutineAt = getSelectedTimeforT();
    if (showTomorrowsRoutineAt === "error") return false;
    const data = {
        autoLogin,
        apiKey,
        showTomorrowsRoutineAt
    };
    if(username !== "") data.username = username;
    if(password !== "") data.password = password;

    localStorage.setItem("settings", JSON.stringify(data));
    chrome.storage.local.set({ settings: data}, () => {

    });
    return true;
}


function showSavedSettings() {
    const settings = JSON.parse(localStorage.getItem("settings"));
    if (settings !== null) {
        document.getElementById("autoLogin").checked = settings.autoLogin;
        document.getElementById("apiKey").value = settings.apiKey;
        if(settings.username)document.getElementById("username").value = settings.username;
        if(settings.password)document.getElementById("password").value = settings.password;
        showSelectedTimeforT(settings.showTomorrowsRoutineAt);
        if (settings.autoLogin) {
            document.getElementById("settingsFields").classList.add("show");
        }

    }
}


function getSelectedTimeforT() {
    const hour = document.getElementById("hour").value;
    const minute = document.getElementById("minute").value;
    const ampm = document.getElementById("ampm").value;
    let res = null;
    if ((hour === "Hour" || minute === "Min" || ampm === "AM/PM") &&
        !(hour === "Hour" && minute === "Min" && ampm === "AM/PM")) {
        document.getElementById("wrongtime").style = "display:block;";
        return "error";
    } else {
        document.getElementById("wrongtime").style = "display:none;";
        res = { hour, minute, ampm };
    }
    return res;
}


function showSelectedTimeforT(time) {
    if (time === null || time === undefined) return;
    document.getElementById("hour").value = time.hour;
    document.getElementById("minute").value = time.minute;
    document.getElementById("ampm").value = time.ampm;

}