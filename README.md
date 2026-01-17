# 🤖 Robo-JS

A web-based **2D robot programming simulator** that allows users to control a robot using **JavaScript**, designed for learning, experimentation, and education.

![Robot Simulator Screenshot](https://github.com/user-attachments/assets/9a616a00-e935-4d67-ad6c-5ff9e5b611f1)

![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![JavaScript](https://img.shields.io/badge/Language-JavaScript-yellow)

---

## ✨ Features

- **2D robot simulation** with movement and rotation
- **Up to 25 light intensity sensors** and **3 push buttons**
- **Independent control of left and right motors** with speed range from `-100` to `100`
- **Customizable fields** (change field type and size)
- **Import / Export projects** using JSON files
- **Built-in debug console**
- **Drag & drop the robot** while stopped or even while running

---

## 🚀 Try It Out

1. Download the file `sampleSetup.json`
2. Open the website:  
   👉 https://nawa-dev.github.io/Robot-IDE-Simulator/
3. Go to **File → Open**
4. Select `sampleSetup.json`
5. Click **Run**

---

## 📟 Basic Commands

| Command              | Description                                                       |
| -------------------- | ----------------------------------------------------------------- |
| `motor(left, right)` | Control left and right wheel motors (`-100` to `100`)             |
| `analogRead(index)`  | Read light intensity from a specific sensor (`0 - 1024`)          |
| `getSensorCount()`   | Returns the total number of sensors                               |
| `SW(n)`              | Check the state of button `SW1`, `SW2`, or `SW3` (`true / false`) |
| `waitSW(n)`          | Pause execution until the specified button is pressed             |
| `delay(ms)`          | Delay execution (milliseconds)                                    |
| `log(text)`          | Output text to the console                                        |

---

## 🧠 Example Code

```javascript
while (true) {
  if (analogRead(0) > 500) {
    motor(50, 50);
  } else {
    motor(0, 0);
  }
}
```
