// serverURL is now handled in background.js

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "fetchHealthCheck",
    });

    if (response.error) {
      throw new Error(response.error);
    }

    const status = response.status;
    const headline = document.getElementById("status");
    if (status === 200) {
      headline.innerText = "The extension running and the survey is ongoing!";
    } else {
      headline.innerText =
        "Thank you for your participation! The survey phase ended, you can now remove the extension.";
    }
  } catch (error) {
    console.error("Error fetching survey status:", error);
    const headline = document.getElementById("status");
    headline.innerText =
      "Error fetching survey status. Please try again later.";
  }
});
