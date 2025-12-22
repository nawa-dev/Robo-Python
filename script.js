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

// Robot sensors array
let sensors = [];
const MAX_SENSORS = 25;

// Canvas image data for sensor reading
let canvasImageData = null;
let canvasPixelData = null;

// --- Helper: Get pixel brightness at canvas position ---
function getPixelBrightness(x, y) {
  if (!canvasPixelData) return 512; // Default mid-value if no image

  // Convert canvas world coordinates to pixel indices
  // x, y are already in canvas pixel coordinates
  const pixelX = Math.round(x);
  const pixelY = Math.round(y);

  // Check bounds
  if (
    pixelX < 0 ||
    pixelX >= canvasArea.offsetWidth ||
    pixelY < 0 ||
    pixelY >= canvasArea.offsetHeight
  ) {
    return 512; // Outside canvas
  }

  // Get pixel data (RGBA format, 4 bytes per pixel)
  const imageWidth = canvasArea.offsetWidth;
  const pixelIndex = (pixelY * imageWidth + pixelX) * 4;

  if (pixelIndex + 2 >= canvasPixelData.length) {
    return 512;
  }

  // Calculate brightness from RGB
  const r = canvasPixelData[pixelIndex];
  const g = canvasPixelData[pixelIndex + 1];
  const b = canvasPixelData[pixelIndex + 2];

  // Brightness: 0-255 (0=black, 255=white)
  const brightness = (r + g + b) / 3;

  // Convert to 0-1024 range (inverted: dark=high, light=low for line following)
  return Math.round((255 - brightness) * 4);
}

// --- Update canvas image data when background changes ---
function updateCanvasImageData() {
  const canvas = document.createElement("canvas");
  canvas.width = canvasArea.offsetWidth;
  canvas.height = canvasArea.offsetHeight;
  const ctx = canvas.getContext("2d");

  // Draw background color first
  const bgColor = window
    .getComputedStyle(canvasArea)
    .getPropertyValue("background-color");
  ctx.fillStyle = bgColor || "#f0f0f0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw background image if exists
  const bgImage = window
    .getComputedStyle(canvasArea)
    .getPropertyValue("background-image");
  if (bgImage && bgImage !== "none") {
    try {
      const imageUrl = bgImage.match(/url\(["']?(.+?)["']?\)/)[1];
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvasPixelData = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        ).data;
        logToConsole("Canvas image data updated.", "info");
      };
      img.onerror = () => {
        logToConsole("Failed to load background image, using default.", "info");
        canvasPixelData = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        ).data;
      };
      img.src = imageUrl;
    } catch (e) {
      logToConsole("Error parsing background image URL.", "info");
      canvasPixelData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      ).data;
    }
  } else {
    canvasPixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    logToConsole("Using default canvas background.", "info");
  }
}

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
  updateSensorDots();
}

function updateSensorDots() {
  // Remove old sensor dots
  const oldDots = document.querySelectorAll(".sensor-dot");
  oldDots.forEach((dot) => dot.remove());

  // Draw new sensor dots
  sensors.forEach((sensor, index) => {
    const dot = document.createElement("div");
    dot.className = "sensor-dot";

    // Calculate sensor position relative to robot center
    const localX = sensor.x - 25;
    const localY = sensor.y - 25;

    // Rotate sensor position based on robot angle
    const rad = (angle * Math.PI) / 180;
    const cos_a = Math.cos(rad);
    const sin_a = Math.sin(rad);

    const rotatedX = localX * cos_a - localY * sin_a;
    const rotatedY = localX * sin_a + localY * cos_a;

    // Position in canvas (robot center + rotated offset)
    const canvasX = robotX + 25 + rotatedX;
    const canvasY = robotY + 25 + rotatedY;

    dot.style.left = canvasX + "px";
    dot.style.top = canvasY + "px";

    // Get brightness at this position (only if canvasPixelData is ready)
    let brightness = 512;
    if (canvasPixelData) {
      brightness = getPixelBrightness(canvasX, canvasY);
    }

    dot.title = `${sensor.name} [${index}]\n(${sensor.x.toFixed(
      1
    )}, ${sensor.y.toFixed(1)})\nBrightness: ${brightness}`;
    dot.dataset.sensorId = sensor.id;
    dot.dataset.sensorIndex = index;

    canvasArea.appendChild(dot);
  });
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

// --- 7. การควบคุมการรันโค้ด (smooth version) ---
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
      if (isRunning && myInterpreter) {
        // รัน 50 steps ต่อ frame (ลดจาก 1000 เพื่อให้ smooth)
        for (let i = 0; i < 1000; i++) {
          if (!myInterpreter.step()) {
            stopProgram();
            logToConsole("Program finished.", "info");
            return;
          }
        }

        if (isRunning) requestAnimationFrame(step);
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
  updateCanvasImageData();
}

function handleMapChange(select) {
  if (select.value === "upload") {
    document.getElementById("map-upload").click();
  } else {
    canvasArea.style.backgroundImage = "none";
    canvasArea.style.backgroundColor = "#f0f0f0";
    updateCanvasImageData();
  }
}

function loadMapFile(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      canvasArea.style.backgroundImage = `url('${e.target.result}')`;
      canvasArea.style.backgroundColor = "transparent";
      logToConsole("New map loaded successfully.");
      setTimeout(updateCanvasImageData, 100);
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// --- 9. Robot Settings Modal Functions ---
function openRobotSettings() {
  document.getElementById("robot-settings-modal").style.display = "flex";
  updateSensorPreview();
  renderSensorsList();
}

function closeRobotSettings() {
  document.getElementById("robot-settings-modal").style.display = "none";
}

function addSensorToList() {
  if (sensors.length >= MAX_SENSORS) {
    logToConsole(`Maximum sensors (${MAX_SENSORS}) reached!`, "error");
    return;
  }

  sensors.push({
    id: Date.now(),
    x: 45,
    y: 25,
    name: `Light Sensor ${sensors.length + 1}`,
    isNew: true,
  });

  updateSensorPreview();
  renderSensorsList();
  updateSensorDots();
  logToConsole(`New sensor added. Edit position in the list.`, "info");
}

function deleteSensor(id) {
  sensors = sensors.filter((s) => s.id !== id);
  updateSensorPreview();
  renderSensorsList();
  updateSensorDots();
  logToConsole("Sensor deleted.", "info");
}

function editSensorPosition(id, axis) {
  const sensor = sensors.find((s) => s.id === id);
  if (!sensor) return;

  const inputElement = document.getElementById(`sensor-${id}-${axis}`);
  if (!inputElement) return;

  inputElement.focus();
  inputElement.select();
}

function updateSensorValue(id, axis, value) {
  const sensor = sensors.find((s) => s.id === id);
  if (!sensor) return;

  const numValue = parseFloat(value);

  if (isNaN(numValue) || numValue < 0 || numValue > 50) {
    logToConsole(`Position must be between 0 and 50!`, "error");
    if (axis === "x") {
      document.getElementById(`sensor-${id}-x`).value = sensor.x;
    } else {
      document.getElementById(`sensor-${id}-y`).value = sensor.y;
    }
    return;
  }

  if (axis === "x") {
    sensor.x = numValue;
  } else {
    sensor.y = numValue;
  }

  sensor.isNew = false;
  updateSensorPreview();
  updateSensorDots();
  logToConsole(
    `Sensor ${sensor.name} updated to (${sensor.x.toFixed(
      1
    )}, ${sensor.y.toFixed(1)})`,
    "info"
  );
}

function updateSensorPreview() {
  const svg = document.getElementById("preview-svg");

  // Remove old sensor circles
  svg.querySelectorAll(".sensor-circle").forEach((el) => el.remove());

  // Draw sensor circles
  sensors.forEach((sensor) => {
    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );

    circle.setAttribute("class", "sensor-circle");
    circle.setAttribute("cx", sensor.x);
    circle.setAttribute("cy", sensor.y);
    circle.setAttribute("r", "2");
    svg.appendChild(circle);
  });
}

function renderSensorsList() {
  const container = document.getElementById("sensors-container");
  const count = document.getElementById("sensor-count");

  count.innerText = sensors.length;

  if (sensors.length === 0) {
    container.innerHTML =
      '<div class="empty-message">No sensors added yet. Click "+ Add Sensor" to start.</div>';
    return;
  }

  container.innerHTML = sensors
    .map(
      (sensor, index) => `
    <div class="sensor-item ${sensor.isNew ? "sensor-item-new" : ""}">
      <div class="sensor-item-info">
        <div class="sensor-item-label">
          ${sensor.name || "Light Sensor " + (index + 1)}
        </div>
        <div class="sensor-item-coords">
          <div class="sensor-coord-input">
            <label>X:</label>
            <input
              type="number"
              id="sensor-${sensor.id}-x"
              min="0"
              max="50"
              value="${sensor.x}"
              onchange="updateSensorValue(${sensor.id}, 'x', this.value)"
              onclick="event.stopPropagation()"
            />
          </div>
          <div class="sensor-coord-input">
            <label>Y:</label>
            <input
              type="number"
              id="sensor-${sensor.id}-y"
              min="0"
              max="50"
              value="${sensor.y}"
              onchange="updateSensorValue(${sensor.id}, 'y', this.value)"
              onclick="event.stopPropagation()"
            />
          </div>
        </div>
      </div>
      <div class="sensor-item-actions">
        <button class="btn-delete-sensor" onclick="deleteSensor(${
          sensor.id
        })">Delete</button>
      </div>
    </div>
  `
    )
    .join("");

  // Disable add button if max sensors reached
  const addBtn = document.querySelector(".btn-add-sensor");
  if (sensors.length >= MAX_SENSORS) {
    addBtn.disabled = true;
    addBtn.innerText = `✓ Max Sensors Reached (${MAX_SENSORS})`;
  } else {
    addBtn.disabled = false;
    addBtn.innerText = "+ Add Sensor";
  }
}

// Close modal when clicking outside
window.addEventListener("click", (e) => {
  const modal = document.getElementById("robot-settings-modal");
  if (e.target === modal) {
    closeRobotSettings();
  }
});

// --- 10. API Bridge ---
function initApi(interpreter, globalObject) {
  // 1. analogRead(index) - read sensor value synchronously
  const wrapperAnalogRead = function (index) {
    if (index < 0 || index >= sensors.length) {
      return 0;
    }

    const s = sensors[index];
    const localX = s.x - 25;
    const localY = s.y - 25;

    const rad = (angle * Math.PI) / 180;
    const cos_a = Math.cos(rad);
    const sin_a = Math.sin(rad);

    const rotatedX = localX * cos_a - localY * sin_a;
    const rotatedY = localX * sin_a + localY * cos_a;

    const canvasX = robotX + 25 + rotatedX;
    const canvasY = robotY + 25 + rotatedY;

    const brightness = getPixelBrightness(canvasX, canvasY);

    return brightness;
  };

  interpreter.setProperty(
    globalObject,
    "analogRead",
    interpreter.createNativeFunction(wrapperAnalogRead)
  );

  // 2. getSensorCount() - return number of sensors
  const wrapperGetCount = function () {
    return sensors.length;
  };
  interpreter.setProperty(
    globalObject,
    "getSensorCount",
    interpreter.createNativeFunction(wrapperGetCount)
  );

  // 3. motor(l, r) - control motors
  const wrapperMotor = function (l, r) {
    motorL = l;
    motorR = r;
  };
  interpreter.setProperty(
    globalObject,
    "motor",
    interpreter.createNativeFunction(wrapperMotor)
  );

  // 4. log(text) - print to console
  const wrapperLog = function (t) {
    logToConsole("User: " + t);
  };
  interpreter.setProperty(
    globalObject,
    "log",
    interpreter.createNativeFunction(wrapperLog)
  );

  // 5. delay(ms) - async delay
  const wrapperDelay = function (ms, callback) {
    setTimeout(callback, ms);
  };
  interpreter.setProperty(
    globalObject,
    "delay",
    interpreter.createAsyncFunction(wrapperDelay)
  );
}

// --- 11. Project Save/Load Functions ---

let currentProjectName = "Untitled Project";
let currentProjectPath = null;

// Create project data object
function createProjectData() {
  return {
    version: "1.0",
    timestamp: new Date().toISOString(),
    projectName: currentProjectName,
    canvas: {
      width: document.getElementById("canvas-w").value,
      height: document.getElementById("canvas-h").value,
    },
    map: {
      type: canvasArea.style.backgroundImage === "none" ? "default" : "custom",
      imageData: canvasArea.style.backgroundImage
        .replace(/^url\(['"]?/, "")
        .replace(/['"]?\)$/, ""),
    },
    sensors: sensors.map((s) => ({
      id: s.id,
      x: s.x,
      y: s.y,
      name: s.name,
    })),
    sourceCode: editor.getValue(),
    robotState: {
      x: robotX,
      y: robotY,
      angle: angle,
    },
  };
}

// Save project (same filename)
function saveProject() {
  if (currentProjectPath === null) {
    saveProjectAs();
    return;
  }

  const projectData = createProjectData();
  const jsonString = JSON.stringify(projectData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = currentProjectPath;
  a.click();
  URL.revokeObjectURL(url);

  logToConsole(`Project saved: ${currentProjectPath}`, "info");
}

// Save As (choose filename)
function saveProjectAs() {
  const projectName = prompt(
    "Enter project name (without .json):",
    currentProjectName
  );
  if (!projectName) return;

  currentProjectName = projectName;
  currentProjectPath = projectName + ".json";

  const projectData = createProjectData();
  const jsonString = JSON.stringify(projectData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = currentProjectPath;
  a.click();
  URL.revokeObjectURL(url);

  logToConsole(`Project saved as: ${currentProjectPath}`, "info");
  updateStatusBar();
}

// Open project (trigger file input)
function openProject() {
  document.getElementById("file-input").click();
}

// Load project from file
function loadProject(inputElement) {
  if (!inputElement.files || !inputElement.files[0]) return;

  const file = inputElement.files[0];
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const projectData = JSON.parse(e.target.result);

      // Validate project data
      if (!projectData.sourceCode) {
        throw new Error("Invalid project file: missing sourceCode");
      }

      // Stop any running program
      stopProgram();

      // Load canvas size
      document.getElementById("canvas-w").value =
        projectData.canvas.width || 800;
      document.getElementById("canvas-h").value =
        projectData.canvas.height || 600;
      updateCanvasSize();

      // Load map
      if (projectData.map.type === "custom" && projectData.map.imageData) {
        canvasArea.style.backgroundImage = `url('${projectData.map.imageData}')`;
        canvasArea.style.backgroundColor = "transparent";
        setTimeout(updateCanvasImageData, 100);
      } else {
        canvasArea.style.backgroundImage = "none";
        canvasArea.style.backgroundColor = "#f0f0f0";
        updateCanvasImageData();
      }

      // Load sensors
      sensors = projectData.sensors.map((s) => ({
        id: s.id,
        x: s.x,
        y: s.y,
        name: s.name,
        isNew: false,
      }));
      updateSensorPreview();
      renderSensorsList();
      updateSensorDots();

      // Load source code
      editor.setValue(projectData.sourceCode);

      // Load robot state
      robotX = projectData.robotState.x || 100;
      robotY = projectData.robotState.y || 100;
      angle = projectData.robotState.angle || 0;
      updateRobotDOM();

      // Set project name
      currentProjectName = projectData.projectName || "Untitled Project";
      currentProjectPath = file.name;

      logToConsole(`Project loaded: ${file.name}`, "info");
      logToConsole(
        `Sensors: ${sensors.length}, Canvas: ${projectData.canvas.width}x${projectData.canvas.height}`,
        "info"
      );
      updateStatusBar();
    } catch (error) {
      logToConsole(`Error loading project: ${error.message}`, "error");
    }
  };

  reader.readAsText(file);

  // Reset input so same file can be opened again
  inputElement.value = "";
}

// Update status bar with project name
function updateStatusBar() {
  const status = currentProjectPath
    ? `Project: ${currentProjectName}`
    : "Ready";
  statusDiv.innerText = status;
}

// Update status on startup
setTimeout(updateStatusBar, 100);

// --- Angle Control Functions ---
function updateAngleDisplay(value) {
  const angleInput = document.getElementById("angle-input");
  angleInput.value = Math.round(value);
}

function handleAngleInput(value) {
  if (isRunning) {
    logToConsole("Cannot change angle while program is running!", "error");
    document.getElementById("angle-input").value = Math.round(angle);
    document.getElementById("angle-slider").value = angle;
    return;
  }

  let newAngle = parseFloat(value);

  // Normalize angle to 0-360
  if (isNaN(newAngle)) {
    document.getElementById("angle-input").value = Math.round(angle);
    return;
  }

  newAngle = ((newAngle % 360) + 360) % 360; // Normalize to 0-360

  angle = newAngle;
  document.getElementById("angle-slider").value = newAngle;
  document.getElementById("angle-input").value = Math.round(newAngle);
  updateRobotDOM();
  logToConsole(`Robot angle set to ${Math.round(angle)}°`, "info");
}

function updateRobotAngle(value) {
  if (isRunning) {
    logToConsole("Cannot change angle while program is running!", "error");
    document.getElementById("angle-slider").value = angle;
    document.getElementById("angle-input").value = Math.round(angle);
    return;
  }

  angle = parseFloat(value);
  document.getElementById("angle-input").value = Math.round(angle);
  updateRobotDOM();
}

// เริ่มต้น Loop
updatePhysics();
updateCanvasSize();
setTimeout(() => {
  updateCanvasImageData();
  logToConsole("System initialized.", "info");
}, 1);
