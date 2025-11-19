const serverURL = "https://smartconfig.medien.ifi.lmu.de/xai";

async function getUserEmail() {
  try {
    const { userID } = await chrome.storage.local.get(["userID"]);
    if (userID) {
      return userID;
    }

    const newUserID = crypto.randomUUID(); // Generate a new user ID
    chrome.storage.local.set({ userID: newUserID }); // Store the new user ID
    return newUserID; // Return the new user ID
  } catch (error) {
    return undefined;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0].url?.startsWith("chrome")) return undefined;
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ["worker.js"],
    });
  });
});

//when the user opens new tab that is not chrome page, it sends message urlChanged to worker.js
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab.url?.startsWith("chrome")) return undefined;
  if (changeInfo.url) {
    const email = await getUserEmail();
    if (!email) return;

    try {
      setTimeout(async () => {
        await chrome.tabs.sendMessage(tabId, {
          message: "urlChanged",
          url: changeInfo.url,
          email: email,
        });
      }, 2000);
    } catch (error) {
      console.log("The tab was closed, could not send message.");
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "fetchPopupData") {
    (async () => {
      try {
        const body = { email: message.email, url: message.url };

        const res = await fetch(`${serverURL}/popup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        sendResponse({ data });
      } catch (err) {
        console.error("Error fetching popup data:", err);
        sendResponse({ error: err.message });
      }
    })();

    // Keep the message channel open for the async function
    return true;
  }

  if (message.type === "fetchHealthCheck") {
    (async () => {
      try {
        const res = await fetch(serverURL);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const status = res.status;
        sendResponse({ status });
      } catch (err) {
        console.error("Error fetching health check:", err);
        sendResponse({ error: err.message });
      }
    })();

    return true;
  }

  if (message.type === "fetchSurvey") {
    (async () => {
      try {
        const res = await fetch(`${serverURL}/survey`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: message.email,
            taskData: message.taskData,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        sendResponse({ success: true });
      } catch (err) {
        console.error("Error fetching survey:", err);
        sendResponse({ error: err.message });
      }
    })();

    return true;
  }

  if (message.type === "fetchEmail") {
    (async () => {
      try {
        const res = await fetch(`${serverURL}/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: message.email,
            emails: message.emails,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        sendResponse({ success: true });
      } catch (err) {
        console.error("Error fetching email:", err);
        sendResponse({ error: err.message });
      }
    })();

    return true;
  }

  if (message.type === "fetchInstructions") {
    (async () => {
      try {
        const res = await fetch(`${serverURL}/instructions/${message.domain}`);

        if (!res.ok && res.status !== 204)
          throw new Error(`HTTP ${res.status}`);

        if (res.status === 200) {
          const json = await res.json();
          sendResponse({ instructions: json.instructions });
        } else if (res.status === 204) {
          sendResponse({
            instructions: "No instructions available for this site.",
          });
        }
      } catch (err) {
        console.error("Error fetching instructions:", err);
        sendResponse({
          error: err.message,
          instructions: "Something went wrong. Please try again.",
        });
      }
    })();

    return true;
  }

  if (message.type === "fetchUpdateTask") {
    (async () => {
      try {
        const res = await fetch(`${serverURL}/task`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: message.email,
            notificationSent: message.notificationSent,
            taskAccepted: message.taskAccepted,
            taskDenied: message.taskDenied,
            taskType: message.taskType,
            domain: message.domain,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const result = await res.text();
        sendResponse({ result });
      } catch (err) {
        console.error("Error updating task:", err);
        sendResponse({ error: err.message });
      }
    })();

    return true;
  }
});
