(() => {
  let iscaptchaSolved = false;

  const getSettingsAsync = () => {
    return new Promise((resolve) => {
      chrome.storage.local.get(["settings"], (result) => {
        resolve(result.settings || {});
      });
    });
  };

  const init = async () => {
    const settings = await getSettingsAsync();
    console.log("Settings loaded in auto login:", settings);

    if (!settings.autoLogin) {
      console.log("Auto-login is disabled.");
      return;
    }

    if (!settings.apiKey) {
      console.error("API key not found in chrome.storage.local.");
      return;
    }

    attachInputEvents();
    await solveCaptcha(settings.apiKey);
  };

  const attachInputEvents = () => {
    const selectors = [
      "input[name='Username']",
      "input[name='Password']",
      "#CaptchaInputText",
    ];

    selectors.forEach((sel) => {
      const el = document.querySelector(sel);
      if (el) {
        el.addEventListener("input", attemptSubmit);
        el.addEventListener("click", attemptSubmit);
      }
    });
  };

  const attemptSubmit = () => {
    const user = document.querySelector("input[name='UserName']")?.value.trim();
    const pass = document.querySelector("input[name='Password']")?.value.trim();

    if (iscaptchaSolved && user && pass) {
      document
        .querySelector("button[type='submit'], input[type='submit']")
        ?.click();
    }
  };

  const solveCaptcha = async (apiKey) => {
    const img = document.getElementById("CaptchaImage");
    const input = document.getElementById("CaptchaInputText");

    if (!img || !input) {
      console.warn("Captcha image or input field not found.");
      return;
    }

    await waitForImageLoad(img);

    try {
      const base64 = convertToBase64(img);
      const result = await queryGemini(base64, apiKey);

      if (result) {
        input.value = result;
        iscaptchaSolved = true;
        attemptSubmit();
      }
    } catch (err) {
      console.error("Captcha solve error:", err);
    }
  };

  const waitForImageLoad = (img) => {
    return new Promise((resolve) => {
      if (img.complete && img.naturalHeight > 0) return resolve();
      img.onload = resolve;
    });
  };

  const convertToBase64 = (img) => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d").drawImage(img, 0, 0);
    return canvas.toDataURL("image/png").split(",")[1];
  };

  const queryGemini = async (imageData, apiKey) => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    "Solve the math and return only the result",
                },
                {
                  inlineData: {
                    mimeType: "image/png",
                    data: imageData,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    const json = await response.json();
    console.log("[Gemini] Response:", json);

    if (json.error) throw new Error(json.error.message);
    return json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  };

  // Start
  init();
})();
