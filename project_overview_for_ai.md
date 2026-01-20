# Project Overview: ROBO-JS (Robot-IDE-Simulator)

## Description
A web-based 2D robot programming simulator designed for education. Users write JavaScript code to control a robot in a 2D environment with sensors and obstacles.

## Technology Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript.
- **Code Editor**: Monaco Editor (via CDN).
- **Interpreter**: Acorn.js + Acorn Interpreter (allows stepping through code securely).
- **Icons**: Font Awesome 6.

## Core Components
1. **Simulation Engine**:
   - `src/physics.js`: Handles robot movement, collision detection, and sensor readings.
   - `src/canvas.js`: Renders the robot, map (background image), and visual elements on the canvas.
   - `src/sensors.js`: Manages sensor configuration (position, angle, radius) and values.
   - `src/executor.js`: Bridges the code interpreter with the simulation (API binding).

2. **User Interface**:
   - **Editor Pane**: Monaco editor for writing code.
   - **Canvas Pane**: Visual output of the robot simulation.
   - **Console**: Displays `log()` outputs and errors.
   - **Toolbar**: Controls for Run, Stop, Reset, and File operations (New/Open/Export).
   - **Settings**: Robot angle, Canvas size, Sensor configuration modal.

3. **Data Management**:
   - `src/storage.js`: Handles saving/loading projects to/from LocalStorage and JSON files.
   - `src/variableGlobal.js`: Global state management.

## API Available to Users
The simulator exposes the following JavaScript functions to the user:
- `motor(leftSpeed, rightSpeed)`: Set motor speeds (-100 to 100).
- `analogRead(sensorIndex)`: Read light sensor value (0-1024).
- `SW(buttonIndex)`: Read button state (true/false) for SW1, SW2, SW3.
- `waitSW(buttonIndex)`: Block execution until button is pressed.
- `delay(ms)`: Pause execution for specified milliseconds.
- `log(message)`: Print to the debug console.
- `getSensorCount()`: Get total number of active sensors.

## File Structure
- `index.html`: Main application entry point.
- `src/`: JavaScript modules.
- `style/`: CSS stylesheets (modularized by component).
- `sampleSetup.json`: Default project configuration file.

## Workflow
1. User writes JS code in the editor.
2. `acorn_interpreter` converts code into step-by-step execution objects.
3. `executor.js` runs the code steps.
4. `motor()` commands update `physics.js` state.
5. `canvas.js` redraws the scene based on new physics state.
6. Sensors read pixel data from the background (map) to simulate light intensity.
