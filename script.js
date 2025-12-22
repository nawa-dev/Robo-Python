// --- 1. การจัดการ Layout (Resizer) ---
const resizer = document.getElementById("drag-resizer");
const editorPane = document.querySelector(".editor-pane");

resizer.addEventListener("mousedown", (e) => {
  document.addEventListener("mousemove", resizePanes);
  document.addEventListener("mouseup", () => {
    document.removeEventListener("mousemove", resizePanes);
  });
});

function resizePanes(e) {
  const newWidth = (e.clientX / window.innerWidth) * 100;
  if (newWidth > 15 && newWidth < 85) {
    editorPane.style.width = newWidth + "%";
  }
}

// --- 2. ตัวแปรสถานะเริ่มต้น ---
const robot = document.getElementById("robot");
const canvasArea = document.getElementById("canvas-area");
const statusDiv = document.getElementById("status");

let robotX = 100;
let robotY = 100;
let angle = 0;
let motorL = 0;
let motorR = 0;
let isRunning = false;
let isDragging = false;
let myInterpreter = null;

// --- 3. ระบบ Drag & Drop ---
robot.addEventListener("mousedown", (e) => {
  if (isRunning) return; // ห้ามลากขณะโปรแกรมทำงาน
  isDragging = true;
  robot.style.transition = "none";
});

window.addEventListener("mouseup", () => {
  isDragging = false;
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  const rect = canvasArea.getBoundingClientRect();

  // คำนวณให้หุ่นยนต์อยู่กึ่งกลางเมาส์ (หุ่นขนาด 50x50 จึงลบ 25)
  robotX = e.clientX - rect.left - 25;
  robotY = e.clientY - rect.top - 25;

  updateRobotDOM();
});

// --- 4. ฟังก์ชันอัปเดตการแสดงผล (UI) ---
function updateRobotDOM() {
  robot.style.left = robotX + "px";
  robot.style.top = robotY + "px";
  robot.style.transform = `rotate(${angle}deg)`;
}

function updateCanvasSize() {
  const w = document.getElementById("canvas-w").value;
  const h = document.getElementById("canvas-h").value;

  if (w > 0 && h > 0) {
    canvasArea.style.width = w + "px";
    canvasArea.style.height = h + "px";
  }
}

// --- 5. ระบบจำลองทางกายภาพ (Physics Loop) ---
function updatePhysics() {
  if (isRunning && !isDragging) {
    // คำนวณความเร็วการหมุน
    const turnSpeed = (motorL - motorR) * 0.05;
    angle += turnSpeed;

    // คำนวณการเคลื่อนที่พุ่งไปข้างหน้า
    const speed = (motorL + motorR) / 100;
    const rad = angle * (Math.PI / 180);

    // ตำแหน่งใหม่ที่คาดการณ์
    let nextX = robotX + speed * Math.cos(rad);
    let nextY = robotY + speed * Math.sin(rad);

    const currentW = canvasArea.offsetWidth;
    const currentH = canvasArea.offsetHeight;

    // ตรวจสอบการชนขอบ (Boundary Check)
    if (
      nextX < 0 ||
      nextX > currentW - 50 ||
      nextY < 0 ||
      nextY > currentH - 50
    ) {
      stopProgram();
      statusDiv.innerText = "Status: Collided with Wall!";

      // ปรับตำแหน่งให้ชิดขอบพอดี ไม่ให้ทะลุออกไป
      robotX = Math.max(0, Math.min(nextX, currentW - 50));
      robotY = Math.max(0, Math.min(nextY, currentH - 50));
    } else {
      robotX = nextX;
      robotY = nextY;
    }

    updateRobotDOM();
  }
  requestAnimationFrame(updatePhysics);
}

// --- 6. ระบบ Interpreter (Bridge API) ---
function initApi(interpreter, globalObject) {
  // คำสั่ง motor(l, r)
  interpreter.setProperty(
    globalObject,
    "motor",
    interpreter.createNativeFunction((l, r) => {
      motorL = l;
      motorR = r;
      statusDiv.innerText = `Running: M(${l}, ${r})`;
    })
  );

  // คำสั่ง delay(ms)
  interpreter.setProperty(
    globalObject,
    "delay",
    interpreter.createAsyncFunction((ms, callback) => {
      setTimeout(callback, ms);
    })
  );
}

// --- 7. ฟังก์ชันควบคุมโปรแกรม (Run / Stop / Reset) ---
function runCode() {
  // หยุดโปรแกรมเดิมก่อนเพื่อเคลียร์สถานะ
  stopProgram();

  const code = document.getElementById("codeEditor").value;

  try {
    myInterpreter = new Interpreter(code, initApi);
    isRunning = true;
    statusDiv.innerText = "Status: Running...";

    function step() {
      // ถ้ายังมีโค้ดให้รัน และสถานะยังเป็น isRunning (ไม่ได้กด Stop)
      if (isRunning && myInterpreter && myInterpreter.step()) {
        setTimeout(step, 1);
      } else if (isRunning) {
        // ถ้าโค้ดรันจนจบเอง
        stopProgram();
        statusDiv.innerText = "Status: Finished";
      }
    }
    step();
  } catch (e) {
    alert("Syntax Error: " + e);
    stopProgram();
  }
}

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
  statusDiv.innerText = "Status: Position Reset";
}

// --- เริ่มต้นการทำงานหน้าเว็บ ---
updatePhysics();
updateCanvasSize();
function handleMapChange(select) {
  const value = select.value;

  if (value === "default") {
    // คืนค่าเป็นสนามเปล่าสีเทา
    canvasArea.style.backgroundImage = "none";
    canvasArea.style.backgroundColor = "#f0f0f0";
    statusDiv.innerText = "Status: Default map selected";
  } else if (value === "upload") {
    // สั่งให้ input file ทำงาน
    document.getElementById("map-upload").click();
  }
}

function loadMapFile(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();

    reader.onload = function (e) {
      // ตั้งค่ารูปภาพเป็นพื้นหลัง
      canvasArea.style.backgroundImage = `url('${e.target.result}')`;
      canvasArea.style.backgroundColor = "transparent"; // ล้างสีพื้นหลังเดิม
      statusDiv.innerText = "Status: Custom map loaded";
    };

    reader.readAsDataURL(input.files[0]);
  } else {
    // กรณีผู้ใช้กด Cancel ในหน้าต่างเลือกไฟล์ ให้กลับไปเลือก Default
    document.getElementById("map-select").value = "default";
  }
}
