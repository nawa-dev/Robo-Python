# Project Overview: ROBO-PYTHON (formerly ROBO-JS)

## Description
A web-based 2D robot programming simulator designed for education. Users write **Python** code (ran in-browser) to control a robot in a 2D environment with sensors and obstacles.

## Technology Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript.
- **Code Editor**: Monaco Editor (via CDN) - Configured for Python.
- **Interpreter**: **Skulpt** (Client-side Python implementation).
- **Icons**: Font Awesome 6.

## Core Components
1. **Simulation Engine**:
   - `src/physics.js`: Handles robot movement, collision detection, and sensor readings.
   - `src/canvas.js`: Renders the robot, map (background image), and visual elements on the canvas.
   - `src/sensors.js`: Manages sensor configuration (position, angle, radius) and values.
   - `src/executor.js`: Bridges the **Skulpt** Python interpreter with the simulation. Handles module loading and suspension (blocking calls).

2. **User Interface**:
   - **Editor Pane**: Monaco editor for writing Python code.
   - **Canvas Pane**: Visual output of the robot simulation.
   - **Console**: Displays `print()` outputs and errors.
   - **Toolbar**: Controls for Run, Stop, Reset, and File operations.
   - **Settings**: Robot angle, Canvas size, Sensor configuration modal.

3. **Data Management**:
   - `src/storage.js`: Handles saving/loading projects to/from LocalStorage and JSON files.
   - `src/variableGlobal.js`: Global state management.

## API Available to Users (Python)
The simulator exposes a **globalized** Python API (no imports required):

- `motor(leftSpeed, rightSpeed)`: Set motor speeds (-100 to 100).
- `delay(ms)`: Pause execution for specified milliseconds (Non-blocking in UI, uses Skulpt suspension).
- `analogRead(sensorIndex)`: Read light sensor value (0-1024).
- `SW(buttonIndex)`: Read button state (True/False) for SW1, SW2, SW3.
- `waitSW(buttonIndex)`: Pause program execution until the specified button is pressed.
- `print(message)`: Standard Python print function, outputs to the simulator console.
- `getSensorCount()`: Get total number of active sensors.

*Note: Internally these map to a custom `robot` built-in module and standard `time` module.*

## File Structure
- `index.html`: Main application entry point (loads Skulpt libraries).
- `src/`: JavaScript modules.
- `style/`: CSS stylesheets (modularized by component).
- `sampleSetup.json`: Default project configuration file.

## Workflow
1. User writes Python code in the editor.
2. `src/executor.js` prepares the code (auto-imports `robot` and `time`, defines `delay` wrapper).
3. **Skulpt** compiles and executes the Python code.
4. Custom module `robot` (in `executor.js`) calls the underlying JavaScript simulation functions.
5. `delay()` and `waitSW()` use **Skulpt Suspensions** to pause Python execution without freezing the browser UI.
6. `motor()` commands update global state, which `src/physics.js` uses to move the robot in the animation loop.
