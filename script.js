/**
 * ROBOT IDE SIMULATOR - Core Script (Updated with Drag Boundaries)
 */

// --- 1. เริ่มต้นการทำงานของ Monaco Editor ---
let editor;
require.config({
  paths: {
    vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs",
  },
});
require(["vs/editor/editor.main"], function () {
  editor = monaco.editor.create(document.getElementById("monaco-container"), {
    value: [
      "for (var i = 0; i < 4; i++) {",
      "  motor(60, 60);",
      "  delay(1000);",
      "  motor(60, 20);",
      "  delay(1000);",
      "}",
      "motor(0, 0);",
    ].join("\n"),
    language: "javascript",
    theme: "vs-dark",
    automaticLayout: true,
    fontSize: 16,
    minimap: { enabled: false },
  });
});

// --- 2. ระบบ Resizers ---
const resizerV = document.getElementById("drag-resizer");
const resizerH = document.getElementById("h-drag-resizer");
const editorPane = document.querySelector(".editor-pane");
const consolePane = document.querySelector(".console-pane");

resizerV.addEventListener("mousedown", () => {
  document.addEventListener("mousemove", resizeVertical);
  document.addEventListener("mouseup", () =>
    document.removeEventListener("mousemove", resizeVertical)
  );
});

function resizeVertical(e) {
  let newWidth = (e.clientX / window.innerWidth) * 100;
  if (newWidth > 15 && newWidth < 85) {
    editorPane.style.width = newWidth + "%";
  }
}

resizerH.addEventListener("mousedown", () => {
  document.addEventListener("mousemove", resizeHorizontal);
  document.addEventListener("mouseup", () =>
    document.removeEventListener("mousemove", resizeHorizontal)
  );
});

function resizeHorizontal(e) {
  const rect = editorPane.getBoundingClientRect();
  let newHeight = rect.bottom - e.clientY;
  if (newHeight > 50 && newHeight < rect.height - 100) {
    consolePane.style.height = newHeight + "px";
  }
}

// --- 3. ตัวแปรสถานะหุ่นยนต์ ---
const robot = document.getElementById("robot");
const canvasArea = document.getElementById("canvas-area");
const statusDiv = document.getElementById("status");

let robotX = 100,
  robotY = 100,
  angle = 0;
let motorL = 0,
  motorR = 0;
let isRunning = false,
  isDragging = false,
  myInterpreter = null;

// --- 4. ระบบลากและวาง (Drag & Drop) - ปรับปรุงเพื่อจำกัดขอบเขต ---
robot.addEventListener("mousedown", () => {
  if (!isRunning) isDragging = true;
});

window.addEventListener("mouseup", () => (isDragging = false));

window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  const rect = canvasArea.getBoundingClientRect();

  // คำนวณตำแหน่งที่ต้องการ (หักลบ 25 เพื่อให้เมาส์อยู่กลางตัวหุ่นยนต์)
  let nextX = e.clientX - rect.left - 25;
  let nextY = e.clientY - rect.top - 25;

  // จำกัดขอบเขตไม่ให้ออกนอก CanvasArea
  const maxX = canvasArea.offsetWidth - 50; // 50 คือความกว้างหุ่นยนต์
  const maxY = canvasArea.offsetHeight - 50; // 50 คือความสูงหุ่นยนต์

  // ใช้ Math.max และ Math.min เพื่อขังค่าไว้ในขอบเขต 0 ถึง max
  robotX = Math.max(0, Math.min(nextX, maxX));
  robotY = Math.max(0, Math.min(nextY, maxY));

  updateRobotDOM();
});

function updateRobotDOM() {
  robot.style.left = robotX + "px";
  robot.style.top = robotY + "px";
  robot.style.transform = `rotate(${angle}deg)`;
}

// --- 5. ระบบ Physics & Collision ---
function updatePhysics() {
  if (isRunning && !isDragging) {
    const rad = angle * (Math.PI / 180);
    const speed = (motorL + motorR) / 100;
    const turnSpeed = (motorL - motorR) * 0.05;

    let nextX = robotX + speed * Math.cos(rad);
    let nextY = robotY + speed * Math.sin(rad);
    angle += turnSpeed;

    if (
      nextX < 0 ||
      nextX > canvasArea.offsetWidth - 50 ||
      nextY < 0 ||
      nextY > canvasArea.offsetHeight - 50
    ) {
      stopProgram();
      logToConsole("Collision Error: Robot hit the wall!", "error");
    } else {
      robotX = nextX;
      robotY = nextY;
    }
    updateRobotDOM();
  }
  requestAnimationFrame(updatePhysics);
}

// --- 6. ระบบ Console & Validation ---
function logToConsole(msg, type = "info") {
  const output = document.getElementById("console-output");
  const div = document.createElement("div");
  div.className = type === "error" ? "log-error" : "log-info";
  div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
  output.appendChild(div);
  output.scrollTop = output.scrollHeight;
}

function clearConsole() {
  document.getElementById("console-output").innerHTML = "";
}

// --- 7. การควบคุมการรันโค้ด ---
function runCode() {
  if (typeof acorn === "undefined") {
    logToConsole("Error: Acorn library is not loaded yet.", "error");
    return;
  }
  stopProgram();
  clearConsole();

  const code = editor.getValue();

  try {
    acorn.parse(code, { ecmaVersion: 2020 });
    logToConsole("Syntax check passed. Starting execution...", "info");
  } catch (e) {
    const line = e.loc ? ` (Line ${e.loc.line})` : "";
    logToConsole(`Syntax Error${line}: ${e.message}`, "error");
    statusDiv.innerText = "Status: Code Error";
    return;
  }

  try {
    myInterpreter = new Interpreter(code, initApi);
    isRunning = true;
    statusDiv.innerText = "Status: Running...";

    function step() {
      if (isRunning && myInterpreter && myInterpreter.step()) {
        setTimeout(step, 1);
      } else if (isRunning) {
        stopProgram();
        logToConsole("Program finished.", "info");
      }
    }
    step();
  } catch (e) {
    logToConsole(`Runtime Error: ${e.message}`, "error");
    stopProgram();
  }
}

// --- 8. ฟังก์ชันช่วยอื่นๆ ---
function stopProgram() {
  isRunning = false;
  motorL = 0;
  motorR = 0;
  myInterpreter = null;
  statusDiv.innerText = "Status: Stopped";
}

function resetPosition() {
  stopProgram();
  robotX = 100;
  robotY = 100;
  angle = 0;
  updateRobotDOM();
  logToConsole("Robot position reset.", "info");
}

function updateCanvasSize() {
  canvasArea.style.width = document.getElementById("canvas-w").value + "px";
  canvasArea.style.height = document.getElementById("canvas-h").value + "px";
}

function handleMapChange(select) {
  if (select.value === "upload") {
    document.getElementById("map-upload").click();
  } else {
    canvasArea.style.backgroundImage = "none";
    canvasArea.style.backgroundColor = "#f0f0f0";
  }
}

function loadMapFile(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      canvasArea.style.backgroundImage = `url('${e.target.result}')`;
      canvasArea.style.backgroundColor = "transparent";
      logToConsole("New map loaded successfully.");
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// --- 9. API Bridge ---
function initApi(interpreter, globalObject) {
  const wrapperMotor = function (left, right) {
    motorL = left;
    motorR = right;
    logToConsole(`Motor Command: Left=${left}, Right=${right}`);
  };
  interpreter.setProperty(
    globalObject,
    "motor",
    interpreter.createNativeFunction(wrapperMotor)
  );

  const wrapperLog = function (text) {
    logToConsole("User Log: " + text);
  };
  interpreter.setProperty(
    globalObject,
    "log",
    interpreter.createNativeFunction(wrapperLog)
  );

  const wrapperDelay = function (ms, callback) {
    setTimeout(() => {
      callback();
    }, ms);
  };
  interpreter.setProperty(
    globalObject,
    "delay",
    interpreter.createAsyncFunction(wrapperDelay)
  );
}

// เริ่มต้น Loop
updatePhysics();
updateCanvasSize();
