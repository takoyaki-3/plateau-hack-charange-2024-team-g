# 3D Block Stacking Game

This project is a 3D block stacking game built with Three.js and Cannon.js.  Players click on the ground plane to spawn objects, which fall and collide with each other and the environment.  

## Features

- 3D graphics powered by Three.js
- Realistic physics simulation using Cannon.js
- Interactive gameplay with mouse clicks to spawn objects
- Two game modes: 
    - **スイカゲームモード:** Objects of the same type disappear upon collision, and a new, higher-ranked object is created at the midpoint.
    - **無限積む積むモード:**  Objects simply stack without disappearing. 
- Score tracking for successful object stacking

## Project Structure

```
├── src
│   ├── assets
│   │   ├── lod2
│   │   │   ├── 53393589_bldg_6677_obj
│   │   │   │   └── materials_textures
│   │   │   ├── 53394517_bldg_6677_obj
│   │   │   │   └── materials_textures
│   │   │   ├── 53394525_bldg_6677_obj
│   │   │   │   └── materials_textures
│   │   │   └── 53394611_bldg_6677_obj
│   │   │       └── materials_textures
│   │   ├── National_Stadium.mtl
│   │   ├── National_Stadium.obj
│   │   ├── back_ground.exr
│   │   ├── bill.mtl
│   │   ├── bill.obj
│   │   ├── city_model.mtl
│   │   ├── city_model.obj
│   │   ├── tokyo_eki.mtl
│   │   ├── tokyo_eki.obj
│   │   ├── tokyo_tower.mtl
│   │   ├── tokyo_tower.obj
│   │   ├── totyou_ver2.mtl
│   │   └── totyou_ver2.obj
│   ├── app_backup.js
│   └── app.js
├── webpack.config.js
├── .babelrc
├── copy_assets_fils.py
└── package.json

```

### File Descriptions

- **`.babelrc`:** Babel configuration file.
- **`copy_assets_fils.py`:** Python script to copy asset files to the correct directory.
- **`package.json`:** Lists project dependencies and scripts.
- **`src/app.js`:** Main JavaScript file containing the game logic.
- **`src/app_backup.js`:**  Backup version of the main game logic.
- **`src/assets`:** Directory containing all the 3D models, materials, and textures used in the game.
- **`src/index.html`:** HTML file that hosts the game.
- **`webpack.config.js`:** Webpack configuration file for bundling the project.

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/3dblock.git
   ```
2. **Navigate to the project directory:**
   ```bash
   cd 3dblock
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```

## Usage

1. **Start the development server:**
   ```bash
   npm start
   ```
This will open the game in your default web browser.

2. **Play the game:**
   -  Click anywhere on the green ground plane to spawn a random object.
   - In スイカゲームモード,  objects of the same type will collide and disappear, creating a new object. 
   - The game ends when an object collides with the red transparent ceiling.

## Game Mechanics

- **Object Spawning:** Clicking on the ground plane spawns a random object from the `objUrls` array at a height of 10 units.
- **Collision Detection:** The game utilizes Cannon.js for physics simulation. When objects collide, the game checks if they should be destroyed based on the `shouldDestroy` function.
- **Object Merging (スイカゲームモード):** If the colliding objects meet the criteria for destruction, they are removed, and a new object, one rank higher in the `objUrls` array, is created at their midpoint. 
- **Score Tracking:** Each object has a `score` attribute representing its value. The total score is updated whenever an object is successfully stacked.
- **Game Over:** The game ends when any object collides with the transparent red lid placed above the playing area.

## Customization

- **Game Mode:** You can switch between the two game modes by changing the `deleteMode` variable in `app.js`. Set it to `true` for スイカゲームモード, and `false` for 無限積む積むモード.
- **Objects and Attributes:** The `objUrls` array contains objects with their corresponding .obj and .mtl file paths, as well as game attributes like `type`, `is_object`, and `score`. You can add or modify these objects and their attributes to customize the game.
- **Physics:** You can adjust the physics parameters like gravity and object mass in the `world` object of Cannon.js.
- **Graphics:** You can change the appearance of the game by modifying the materials and textures used for the objects, ground plane, and walls.

## License

This project is licensed under the ISC License. See the `LICENSE` file for details. 
