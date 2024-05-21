// Functionality for swapping elements and other UI interactions
const ele1 = document.getElementsByClassName("ele1")[0];
const ele2 = document.getElementsByClassName("ele2")[0];
const swapBtn = document.getElementsByClassName("swapBtn")[0];
const contentEle1 = document.getElementsByClassName("ele1")[1];
const contentEle2 = document.getElementsByClassName("ele2")[1];
let englishInputHistory = [];
var currentStage = 0;

function startFunc() {
  ele1.style.order = "1";
  swapBtn.style.order = "2";
  ele2.style.order = "3";
  contentEle1.style.order = "1";
  contentEle2.style.order = "2";

  if (!currentStage) {
    document.getElementById("toggle-button").style.display = "none";
    document.getElementById("video-container").style.display = "none";
  }
}

const disableInput = (event) => {
  event.preventDefault();
};

function swapFunc() {
  if (!currentStage) {
    if (englishInput.value !== "") {
      englishInputHistory.push(englishInput.value + ": From text to hand sign");
    }
    englishInput.value = "";
    signOutput.style.display = "none";
    ele1.style.order = "3";
    swapBtn.style.order = "2";
    ele2.style.order = "1";
    contentEle1.style.order = "2";
    contentEle2.style.order = "1";
    currentStage = 1;
    document.getElementById("toggle-button").style.display = "flex";
    document.getElementById("video-container").style.display = "block";
    translateBtn.style.display = "none";
    videoContainer.style.display = "none"; // Hide the video container
    englishInput.addEventListener("keydown", disableInput);
  } else {
    if (englishInput.value !== "") {
      englishInputHistory.push(englishInput.value + ": From hand sign to text");
      englishInput.value = "";
    }
    if (toggleButton.innerHTML === "Turn Off Camera") {
      englishInput.value = "";
      toggleButton.click();
    }
    startFunc(); // Reset to original order
    currentStage = 0;
    document.getElementById("toggle-button").style.display = "none";
    document.getElementById("video-container").style.display = "none";
    translateBtn.style.display = "block";
    englishInput.removeEventListener("keydown", disableInput);
  }
}

const translateBtn = document.getElementsByClassName("translateBtn")[0];
const showAlphabetBtn = document.querySelector(".showAlphabet"); // Assuming the button has this class
let alphabetPopup = null;
let alphabetContainer = null;

(function createAlphabetPopup() {
  alphabetPopup = document.createElement("div");
  alphabetPopup.className = "alphabet-popup";
  document.body.appendChild(alphabetPopup);

  const alphabetContainer = document.createElement("div");
  alphabetContainer.className = "alphabet-container";
  alphabetPopup.appendChild(alphabetContainer);
  for (let i = 97; i <= 122; i++) {
    const letter = String.fromCharCode(i);
    const gifDiv = document.createElement("div");
    gifDiv.innerHTML = `
        <img src="/webSignDetect/alphabet/${letter}_small.gif" alt="${letter.toUpperCase()} in ASL">
        <p><br>${letter.toUpperCase()}</p>
    `;
    gifDiv.classList.add("gif-item");
    alphabetContainer.appendChild(gifDiv);
  }
})();

showAlphabetBtn.addEventListener("click", () => {
  if (alphabetPopup && alphabetPopup.classList.contains("show")) {
    // If alphabetPopup is already being displayed, hide it
    alphabetPopup.classList.remove("show");
    showAlphabetBtn.innerText = "Show Alphabet";
  } else {
    // If alphabetPopup is not being displayed, create and display it
    alphabetPopup.classList.add("show");
    showAlphabetBtn.innerText = "Hide Alphabet";
    document.addEventListener('mousedown', function (event) {
      if (!alphabetPopup.contains(event.target) && event.target !== showAlphabetBtn) {
        alphabetPopup.classList.remove("show");
        showAlphabetBtn.innerText = "Show Alphabet";
      }
    });
  }
});

window.onload = startFunc;
swapBtn.addEventListener("click", swapFunc);

// Camera toggling logic
const toggleButton = document.getElementById("toggle-button");
const videoContainer = document.getElementById("video-container");
const videoFeed = document.getElementById("video-feed");
const englishInput = document.getElementById("english-input");
const signOutput = document.getElementById("Sign-output-container");
const loader = document.createElement("div");
      loader.className = "loader"

toggleButton.addEventListener("click", async () => {
  toggleButton.appendChild(loader);
  signOutput.style.display = "none";
  const response = await fetch("/toggle_camera", { method: "POST" });
  const data = await response.json();
  if (data.is_camera_on) {
    toggleButton.innerHTML = "Turn Off Camera";
    videoContainer.style.display = "block";
    videoFeed.src = "/video_feed";
    const intervalId = setInterval(async () => {
      const response = await fetch("/get_predicted_word");
      const data = await response.json();
      englishInput.value = data.predicted_word;
    }, 240);

    // Store intervalId to clear it when the camera is turned off
    englishInput.dataset.intervalId = intervalId;
  } else {
    if (englishInput.value !== "") {
      englishInputHistory.push(englishInput.value + ": From hand sign to text");
    }
    toggleButton.innerHTML = "Turn On Camera";
    videoFeed.src = "";
    videoContainer.style.display = "none"; // Hide the video container
    clearInterval(englishInput.dataset.intervalId);
    englishInput.dataset.intervalId = "";
  }
});

translateBtn.addEventListener("click", async () => {
  const content = englishInput.value;
  if (englishInput.value !== "") {
    englishInputHistory.push(englishInput.value + ": From text to hand sign");
  }
  signOutput.innerHTML = "";
  for (let char of content) {
    char = char.toLowerCase();
    if (char >= "a" && char <= "z") {
      // Create an img element for the corresponding GIF
      const img = document.createElement("img");
      img.src = `/webSignDetect/alphabet/${char}_small.gif`;
      img.alt = `${char.toUpperCase()} in ASL`;
      img.style.margin = "5px";

      // Append the img element to the video-container
      signOutput.appendChild(img);
    } else if (char === " " || char === "\n") {
      const br = document.createElement("br");
      signOutput.appendChild(br);
    }
  }
  signOutput.style.display = "block";
});

contentEle1.addEventListener("keydown", function(event) {
  if (event.keyCode === 13 && !event.shiftKey) {
    event.preventDefault();
    translateBtn.click();
  }
});

// Create the history popup
let historyPopup = document.createElement("div");
historyPopup.id = "historyPopup";
historyPopup.className = "popup";
document.body.appendChild(historyPopup);

let historyContainer = document.createElement("div");
historyContainer.className = "popup-container";
historyPopup.appendChild(historyContainer);

let showHistoryBtn = document.getElementById('showHistoryBtn');
showHistoryBtn.addEventListener('click', function() {
  // Clear the history container
  historyContainer.innerHTML = "";

  // Add each history item to the history container
  englishInputHistory.forEach(item => {
    let p = document.createElement("p");
    p.textContent = item;
    historyContainer.appendChild(p);
  });

  // Show the history popup
  historyPopup.style.display = "block";
});

// Hide the history popup when clicking outside of it
window.addEventListener('click', function(event) {
  if (event.target == historyPopup) {
    historyPopup.style.display = "none";
  }
});