import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';

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
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterialMesh = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterialMesh);
groundMesh.rotation.x = -Math.PI / 2;
scene.add(groundMesh);

// XYZ軸の矢印
const arrowSize = 5;
const xAxis = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), arrowSize, 0xff0000);
const yAxis = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), arrowSize, 0x00ff00);
const zAxis = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), arrowSize, 0x0000ff);
scene.add(xAxis);
scene.add(yAxis);
scene.add(zAxis);

// Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ブロックを作成する関数
function createBlock(position) {
    // Cannon.js block
    const boxShape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
    const boxBody = new CANNON.Body({ mass: 1 });
    boxBody.addShape(boxShape);
    boxBody.position.copy(position);
    world.addBody(boxBody);

    // Three.js block
    const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
    const boxMaterial = new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff });
    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    boxMesh.position.copy(position);
    scene.add(boxMesh);

    // Sync Three.js and Cannon.js
    boxBody.threeMesh = boxMesh;
}

// マウスクリックイベントリスナー
function onMouseClick(event) {
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
        const position = new THREE.Vector3(intersect.point.x, 100, intersect.point.z); // Y座標を10に固定
        createBlock(position);
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
