/**
 * Code Execution System
 * ระบบสำหรับตรวจสอบไวยากรณ์และรันโค้ดผู้ใช้
 * ทำงานร่วมกับ Acorn (syntax check) และ JS-Interpreter (runtime)
 */

/* =========================
 * Run user code
 * ========================= */
function runCode() {
  // ตรวจสอบว่า Acorn ถูกโหลดแล้วหรือยัง
  if (typeof acorn === "undefined") {
    logToConsole("Error: Acorn library is not loaded yet.", "error");
    return;
  }

  // บันทึกโค้ดอัตโนมัติและเตรียมสถานะก่อนรัน
  autoSaveToWebStorage();
  stopProgram();
  clearConsole();

  const code = editor.getValue();

  // ตรวจสอบ Syntax ก่อนรันจริง
  try {
    acorn.parse(code, { ecmaVersion: 2020 });
    logToConsole("Syntax check passed. Starting execution...", "info");
  } catch (e) {
    const line = e.loc ? ` (Line ${e.loc.line})` : "";
    logToConsole(`Syntax Error${line}: ${e.message}`, "error");
    return;
  }

  // เริ่มการทำงานของ Interpreter
  try {
    myInterpreter = new Interpreter(code, initApi);
    isRunning = true;

    // ทำงานแบบ step-by-step เพื่อไม่ให้ UI ค้าง
    function step() {
      if (isRunning && myInterpreter) {
        try {
          // จำกัดจำนวน step ต่อ frame
          for (let i = 0; i < 50; i++) {
            if (!myInterpreter.step()) {
              stopProgram();
              logToConsole("Program finished.", "info");
              return;
            }
          }
        } catch (e) {
          // ดักจับ Runtime Error เช่น เรียกฟังก์ชันที่ไม่มีอยู่
          logToConsole(`Runtime Error: ${e.message}`, "error");
          stopProgram();
          return;
        }

        // เรียก frame ถัดไปถ้ายังรันอยู่
        if (isRunning) requestAnimationFrame(step);
      }
    }

    step();
  } catch (e) {
    logToConsole(`Runtime Error: ${e.message}`, "error");
    stopProgram();
  }
}

/* =========================
 * Stop program execution
 * ========================= */
function stopProgram() {
  isRunning = false;
  motorL = 0;
  motorR = 0;
  myInterpreter = null;
}

/* =========================
 * Reset robot position
 * ========================= */
function resetPosition() {
  stopProgram();
  robotX = 100;
  robotY = 100;
  angle = 0;
  updateRobotDOM();
  logToConsole("Robot position reset.", "info");
}

/* =========================
 * Switch (Button) state management
 * ========================= */

// เก็บสถานะปุ่ม SW1, SW2, SW3
let swStates = [false, false, false];

// ID ของปุ่มใน HTML
const swIds = ["button1", "button2", "button3"];

// ผูก event เพื่ออัปเดตสถานะปุ่ม
swIds.forEach((id, index) => {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener("mousedown", () => {
      swStates[index] = true;
      logToConsole(`SW${index + 1} Pressed`);
    });

    btn.addEventListener("mouseup", () => {
      swStates[index] = false;
    });

    btn.addEventListener("mouseleave", () => {
      swStates[index] = false;
    });
  }
});

/* =========================
 * Interpreter API initialization
 * ========================= */
function initApi(interpreter, globalObject) {
  /**
   * analogRead(index)
   * อ่านค่าความสว่างจากเซนเซอร์
   * ใช้การสุ่มอ่านพื้นที่ (area sampling) หากรองรับ
   */
  const wrapperAnalogRead = function (index) {
    // ใช้ระบบอ่านแบบพื้นที่ก่อน ถ้ามี
    // if (typeof sensorAnalogReadAdvanced === "function") {
    //   return sensorAnalogReadAdvanced(index, 5);
    // }

    // fallback เป็นการอ่านแบบจุดเดียว
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

    return getPixelBrightness(canvasX, canvasY);
  };

  interpreter.setProperty(
    globalObject,
    "analogRead",
    interpreter.createNativeFunction(wrapperAnalogRead),
  );

  /**
   * getSensorCount()
   * คืนค่าจำนวนเซนเซอร์ทั้งหมด
   */
  const wrapperGetCount = function () {
    return sensors.length;
  };

  interpreter.setProperty(
    globalObject,
    "getSensorCount",
    interpreter.createNativeFunction(wrapperGetCount),
  );

  /**
   * motor(left, right)
   * ควบคุมความเร็วล้อซ้าย-ขวา (px/s)
   * ใช้กับระบบ differential drive
   */
  const wrapperSetWheelSpeeds = function (left, right) {
    motorL = (left / 220) * 100;
    motorR = (right / 220) * 100;

    if (window.physics) {
      window.physics.setTargets(left, right);
    }
  };

  interpreter.setProperty(
    globalObject,
    "motor",
    interpreter.createNativeFunction(wrapperSetWheelSpeeds),
  );

  /**
   * log(text)
   * แสดงข้อความใน console ของ simulator
   */
  const wrapperLog = function (t) {
    logToConsole("User: " + t);
  };

  interpreter.setProperty(
    globalObject,
    "log",
    interpreter.createNativeFunction(wrapperLog),
  );

  /**
   * delay(ms)
   * หน่วงเวลาแบบ async โดยไม่บล็อก interpreter
   */
  const wrapperDelay = function (ms, callback) {
    setTimeout(callback, ms);
  };

  interpreter.setProperty(
    globalObject,
    "delay",
    interpreter.createAsyncFunction(wrapperDelay),
  );

  /**
   * SW(n)
   * อ่านค่าสถานะปุ่ม (true / false)
   */
  const wrapperSW = function (n) {
    const index = n - 1;
    if (index >= 0 && index < swStates.length) {
      return swStates[index];
    }
    return false;
  };

  interpreter.setProperty(
    globalObject,
    "SW",
    interpreter.createNativeFunction(wrapperSW),
  );

  /**
   * waitSW(n)
   * รอจนกว่าปุ่มที่กำหนดจะถูกกด
   */
  const wrapperWaitSW = function (n, callback) {
    const index = n - 1;

    function checkButton() {
      if (index >= 0 && index < swStates.length) {
        if (swStates[index]) {
          callback();
        } else {
          setTimeout(checkButton, 20);
        }
      } else {
        callback();
      }
    }

    checkButton();
  };

  interpreter.setProperty(
    globalObject,
    "waitSW",
    interpreter.createAsyncFunction(wrapperWaitSW),
  );
}
