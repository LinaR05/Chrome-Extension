// serverURL is now handled in background.js
async function requestPopupData(userEmail, userUrl) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "fetchPopupData",
      email: userEmail,
      url: userUrl,
    });
    if (response.error) {
      console.error("Error fetching popup data:", response.error);
      throw new Error(response.error);
    }

    return response.data;
  } catch (err) {
    console.error("Failed to fetch popup data:", err);
    throw err;
  }
}

//Shows a SweetAlert popup asking if user did a task, with yes and no options
const surveyIntro = async (title, text) => {
  return swal({
    title: title,
    text: text,
    closeOnClickOutside: false,
    closeOnEsc: false,
    buttons: {
      cancel: "No, I did not.",
      yes: true,
    },
  });
};

//Shows a SweetAlter popup asking the user a question if left empty will ask again
const showSurveyQuestion = async (title, text) => {
  const value = await swal({
    title: title,
    text: text,
    closeOnClickOutside: false,
    closeOnEsc: false,
    content: "input",
  });

  if (!value) {
    //If input is empty
    await swal({
      text: "Please answer the question.",
      closeOnEsc: false,
      closeOnClickOutside: false,
    });
    return await showSurveyQuestion(title, text); //Ask again
  }

  return value;
};

//Asks a single question, saves the answer and sends it to the backend
const shortSurvey = async (title, text, email, data) => {
  const value = await showSurveyQuestion(title, text);
  const surveyAnswers = data.surveyAnswers || {}; // Use existing surveyAnswers or create a new object

  surveyAnswers["reason"] = value; //saves the answer to survey object

  const newData = {
    ...data,
    surveyAnswers,
  };

  try {
    const response = await chrome.runtime.sendMessage({
      type: "fetchSurvey",
      email,
      taskData: newData,
    });
    if (response.error) {
      console.error("Error sending survey:", response.error);
    }
  } catch (err) {
    console.error("Failed to send survey:", err);
  }
};

//Shows a slider (Likert scale) question. If not answered will ask again
const surveySlider = async (title, text) => {
  return swal({
    title: title,
    text: text,
    closeOnClickOutside: false,
    closeOnEsc: false,
    className: "likert",
    content: {
      element: "input",
      attributes: {
        type: "range",
        min: "1",
        max: "101",
        step: "1",
        value: "50",
        id: "slider",
      },
    },
  }).then((value) => {
    if (!value || value === "") {
      return swal({
        text: "Please answer the question.",
        closeOnEsc: false,
        closeOnClickOutside: false,
      }).then(() => {
        return surveySlider(title, text); //Ask again
      });
    }
    return value; //Return slider value
  });
};

//Asks a serires of questions if the user did the task collects the answers and sends them to the backend
const affirmativeSurvey = async (title, email, data) => {
  const survey = data.surveyAnswers || {}; // Use existing surveyAnswers or create a new object
  const fields = ["location", "context", "reason", "importance"];
  for (const field of fields) {
    if (!survey[field]) {
      survey[field] = null; // Initialize to null if not set
    }
  }

  const askAndSave = async (field, surveyQuestion, inputType = "text") => {
    let answer;
    if (inputType === "slider") {
      answer = await surveySlider(title, surveyQuestion);
    } else {
      answer = await showSurveyQuestion(title, surveyQuestion);
    }
    survey[field] = answer; // Save the answer to the survey object
    const taskData = {
      ...data,
      surveyAnswers: survey, // Include the collected survey answers
    };
    try {
      const response = await chrome.runtime.sendMessage({
        type: "fetchSurvey",
        email,
        taskData,
      });
      if (response.error) {
        console.error("Error sending survey:", response.error);
      }
    } catch (error) {
      console.log("Could not send survey to server.", error);
    }
  };

  await askAndSave("location", "From which location did you do the task?");
  await askAndSave(
    "context",
    "What were you doing before engaging with the task?"
  );
  await askAndSave("reason", "Why was that a good moment to do the task?");
  await askAndSave(
    "importance",
    "How important did you consider the task?",
    "slider"
  );
};

//Shows a popup for security tasks, (Enabling 2FA or changing password)
const securityTaskPopup = async (title, text, email, site, taskType) => {
  const notificationSent = new Date().toISOString();
  let taskAccepted = null;
  let taskDenied = null;
  const value = await swal({
    title,
    text,
    icon: "warning",
    closeOnClickOutside: false,
    closeOnEsc: false,
    buttons: {
      cancel: "No, thanks",
      ok: true,
    },
  });
  //When user responds
  const interactionTime = new Date().toISOString();
  if (value !== "ok") {
    //If user did not accept
    taskDenied = interactionTime; //Record time of denial
  } else {
    taskAccepted = interactionTime; //Record time of acceptance
  }

  await updateTask({
    email,
    domain: site,
    taskType,
    notificationSent,
    taskAccepted,
    taskDenied,
  });

  if (taskDenied) {
    return;
  }

  if (taskType === "pw") {
    //If password task and accepted
    const url = site.startsWith("www")
      ? `https://${site}`
      : `https://www.${site}`;
    window.open(url).focus(); //Open site in new tab
  } else if (taskType === "2fa") {
    //If 2FAA task and accepted
    const instructions = await getInstructions(site); //Fetch instructions
    await swal({
      title: "Awesome! Here's how:", //Show instructions
      text: instructions,
      closeOnClickOutside: false,
      closeOnEsc: false,
      icon: "info",
    });
  }
};

//Lets the user add email address for breach checking, then sends them to the backend
const addEmailPopup = async (email, emails) => {
  const title =
    emails.length === 0
      ? "Please add some email addresses."
      : "Add another email address?";
  const text =
    emails.length === 0
      ? "The extension will search for data breaches where your email address has been found."
      : "You can add as many email addresses as you want.";
  return swal({
    title,
    text,
    content: {
      element: "input",
      attributes: {
        placeholder: "Enter an email address",
      },
    },
    closeOnClickOutside: false,
    closeOnEsc: false,
    buttons: {
      catch: {
        text: "I'm all set!",
        value: "catch",
        closeModal: true,
      },
      confirm: {
        text: "Add email",
        value: true,
      },
    },
  }).then(async (value) => {
    if (value !== "catch") {
      //If adding another email
      emails.push(value); //Add to list
      return addEmailPopup(email, emails); //Ask again
    }
    try {
      const response = await chrome.runtime.sendMessage({
        type: "fetchEmail",
        email,
        emails,
      });
      if (response.error) {
        console.error("Error sending emails:", response.error);
      }
    } catch (err) {
      console.error("Failed to send emails:", err);
    }
  });
};

// check to see if should show new popup
function shouldShow(initialUser, lastNotificationDate) {
  if (initialUser) return true;
  if (!lastNotificationDate) return true;

  const dateString = new Date().toISOString();

  const now = new Date(dateString);
  const last = new Date(lastNotificationDate);

  if (Number.isNaN(last.getTime())) return true;

  return now.getTime() - last.getTime() >= 1000 * 60 * 60;
}
chrome.runtime.onMessage.addListener(async (request) => {
  if (request.message !== "urlChanged") {
    return;
  }

  const domain = request.url;

  //Calls the backend server to check what to do next
  let data;
  try {
    const res = await requestPopupData(request.email, domain);
    if (res.status === 204) {
      return;
    }
    data = res;
  } catch (err) {
    console.error("Error fetching popup data:", err);
    return;
  }

  if (!data) {
    return;
  }

  // Check if anything should be shown
  if (!shouldShow(data.initial, data.lastNotificationDate)) {
    return;
  }

  const isInitial = data.initial || false;
  if (isInitial) {
    await swal({
      title: "Welcome to my study!",
      text: "This extension will occasionally suggest security tasks for you to do. It's completely up to you whether you want to do them or not. For every task, there will be a super quick survey to fill out.",
      closeOnClickOutside: false,
      closeOnEsc: false,
    });
    await addEmailPopup(request.email, []);
    const popupResult = await requestPopupData(request.email, domain);

    data = await popupResult.json();
    return;
  }

  //Check if a survey should be shown
  const isSurvey = data.survey || false;

  if (isSurvey) {
    const surveyTitle =
      data.type === "2fa"
        ? `2FA task for ${data.domain}`
        : `Compromised password task for ${data.domain}`;

    if (data.taskAccepted) {
      //If user did the task
      const text =
        data.type === "2fa"
          ? `Recently, you were tasked to enable 2FA for ${data.domain}. Did you do it?`
          : `Recently, you were tasked to change your password for ${data.domain}. Did you do it?`;
      const value = await surveyIntro(
        "It's time for a super quick survey!",
        text
      );

      if (value !== "yes") {
        const shortSurveyText = "Why did you not do the task?";
        await shortSurvey(surveyTitle, shortSurveyText, request.email, data);
        return;
      } else {
        //If user did the task
        await affirmativeSurvey(surveyTitle, request.email, data);
        return;
      }
    } else {
      //If user did not do the task
      const text =
        data.type === "2fa"
          ? `Recently, you were tasked to enable 2FA for ${data.domain}. Why did you not do it?`
          : `Recently, you were tasked to change your password for ${data.domain}. Why did you not do it?`;
      await shortSurvey(
        "It's time for a super quick survey!",
        text,
        request.email,
        data
      );
      return;
    }
  }

  if (!data.type || !data.domain) {
    console.error("Invalid data received:", data);
    return;
  }

  let headline = "";
  let text = "";
  if (data.type === "2fa") {
    headline = `${data.domain} offers 2FA.`;
    text = "Would you like to enable it?";
  } else if (data.type === "pw") {
    headline = "Compromised password detected!";
    text = `Your password for ${data.domain}  has been found in a data breach. Would you like to change it?`;
  }

  await securityTaskPopup(
    headline,
    text,
    request.email,
    data.domain,
    data.type
  ); //Show popup for secuirty task
});

async function getInstructions(domain) {
  let instructions = "";
  try {
    const response = await chrome.runtime.sendMessage({
      type: "fetchInstructions",
      domain,
    });
    if (response.error) {
      instructions =
        response.instructions || "Something went wrong. Please try again.";
    } else {
      instructions = response.instructions;
    }
  } catch (err) {
    console.error("Failed to fetch instructions:", err);
    instructions = "Something went wrong. Please try again.";
  }
  return instructions;
}

async function updateTask({
  email,
  domain,
  taskType,
  notificationSent,
  taskAccepted,
  taskDenied,
}) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "fetchUpdateTask",
      email,
      notificationSent,
      taskAccepted,
      taskDenied,
      taskType,
      domain,
    });
    if (response.error) {
      throw new Error(response.error);
    }
    return response.result; // "Task updated" or error message
  } catch (error) {
    console.error("Error updating task:", error);
    return null;
  }
}
