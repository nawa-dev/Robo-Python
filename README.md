# 🤖 Robo-Python

A web-based **2D robot programming simulator** that allows users to control a robot using **Python**, designed for learning, experimentation, and education.

![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![Python](https://img.shields.io/badge/Language-Python-yellow)

---

## ✨ Features

- **2D robot simulation** with movement and rotation
- **Up to 25 light intensity sensors** and **3 push buttons**
- **Independent control of left and right motors** with speed range from `-100` to `100`
- **In-browser Python execution** powered by [Skulpt](https://skulpt.org/)
- **Customizable fields** (change field type and size)
- **Import / Export projects** using JSON files
- **Built-in debug console**
- **Drag & drop the robot** while stopped or even while running

---

## 🚀 Getting Started

1. Download the sample project `sampleSetup.json` (optional)
2. Open the simulator in your browser (index.html)
3. Go to **File → Open** to load a project, or start coding in the editor!
4. Click **Run** to execute your Python code.

---

## 📟 Python API Reference

| Command              | Description                                                                                |
| :------------------- | :----------------------------------------------------------------------------------------- |
| `motor(left, right)` | Control left and right wheel motors. Speed range: `-100` to `100`.                         |
| `delay(ms)`          | Pause execution for the specified milliseconds (e.g., `delay(1000)` for 1 second).         |
| `analogRead(index)`  | Read light intensity from a specific sensor (`0 - 1024`). `0` = Left, `1` = Right, etc.    |
| `SW(n)`              | Check the state of button `SW1`, `SW2`, or `SW3`. Returns `True` if pressed, else `False`. |
| `waitSW(n)`          | Pause program execution until the specified button (`1`, `2`, or `3`) is pressed.          |
| `print(message)`     | Print text or values to the simulator console.                                             |
| `getSensorCount()`   | Returns the total number of active sensors on the robot.                                   |
