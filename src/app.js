import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';  // 追加
import * as CANNON from 'cannon-es';

const groundSize = 10;

// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = true;

// Cannon.js world
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

// Ground plane
const groundMaterial = new CANNON.Material('groundMaterial');
const groundShape = new CANNON.Plane();
const groundBody = new CANNON.Body({ mass: 0, material: groundMaterial });
groundBody.addShape(groundShape);
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

// Ground mesh
const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
const groundMaterialMesh = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterialMesh);
groundMesh.rotation.x = -Math.PI / 2;
scene.add(groundMesh);

// XYZ軸の矢印
const arrowSize = groundSize + 10;
const xAxis = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), arrowSize, 0xff0000);
const yAxis = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), arrowSize, 0x00ff00);
const zAxis = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), arrowSize, 0x0000ff);
scene.add(xAxis);
scene.add(yAxis);
scene.add(zAxis);

// 壁の作成関数
function createWall(position, size) {
    // Cannon.js wall
    const wallShape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
    const wallBody = new CANNON.Body({ mass: 0 });
    wallBody.addShape(wallShape);
    wallBody.position.set(position.x, position.y, position.z);
    world.addBody(wallBody);

    // Three.js wall
    const wallGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.5 });
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    wallMesh.position.set(position.x, position.y, position.z);
    scene.add(wallMesh);
}

// 地面の周りに壁を作成
const wallHeight = 10;
createWall(new THREE.Vector3(0, wallHeight / 2, -groundSize / 2), new THREE.Vector3(groundSize, wallHeight, 1)); // Front wall
createWall(new THREE.Vector3(0, wallHeight / 2, groundSize / 2), new THREE.Vector3(groundSize, wallHeight, 1)); // Back wall
createWall(new THREE.Vector3(-groundSize / 2, wallHeight / 2, 0), new THREE.Vector3(1, wallHeight, groundSize)); // Left wall
createWall(new THREE.Vector3(groundSize / 2, wallHeight / 2, 0), new THREE.Vector3(1, wallHeight, groundSize)); // Right wall

// Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ブロックを作成する関数
async function createBlock(position) {
    const loader = new OBJLoader();
    loader.load(
        './assets/totyou_ver2.obj',  // 読み込みたい.objファイルのパスを指定
        function (object) {
            console.log(object)
            console.log('Loaded the .obj file successfully', object);
            // Three.js block
            object.position.copy(position);
            object.scale.set(1, 1, 1); // オブジェクトのスケールを適宜設定
            scene.add(object);

            // Cannon.js block
            const boxShape = new CANNON.Box(new CANNON.Vec3(1, 1, 1)); // 適宜形状とサイズを設定
            const boxBody = new CANNON.Body({ mass: 1 });
            boxBody.addShape(boxShape);
            boxBody.position.copy(position);
            world.addBody(boxBody);

            // Sync Three.js and Cannon.js
            boxBody.threeMesh = object;
        },
        undefined,
        function (error) {
            console.error('An error happened while loading the .obj file', error);
        }
    );
}

// マウスクリックイベントリスナー
async function onMouseClick(event) {
    // マウス座標を正規化
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Raycasterを設定
    raycaster.setFromCamera(mouse, camera);

    // 地面との交差を計算
    const intersects = raycaster.intersectObject(groundMesh);
    if (intersects.length > 0) {
        // 交差位置にブロックを作成
        const intersect = intersects[0];
        const position = new THREE.Vector3(intersect.point.x, 20, intersect.point.z); // Y座標を20に固定
        await createBlock(position);
    }
}

document.addEventListener('click', onMouseClick);

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update physics
    world.step(1 / 60);

    // Sync Three.js and Cannon.js meshes
    world.bodies.forEach(body => {
        if (body.threeMesh) {
            body.threeMesh.position.copy(body.position);
            body.threeMesh.quaternion.copy(body.quaternion);
        }
    });

    controls.update();
    renderer.render(scene, camera);
}

// Set initial camera position
camera.position.set(5, 5, 5);
camera.lookAt(0, 0, 0);

// Start animation
animate();
