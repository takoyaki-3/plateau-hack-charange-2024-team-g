import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import * as CANNON from 'cannon-es';

const groundSize = 10;

// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

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

console.log("Ground mesh:", groundMesh); // +追加のデバッグメッセージ

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

// オブジェクトのキャッシュ
const objCache = {};
const mtlCache = {};

// オブジェクトのURL配列
const objUrls = [
    { obj: './assets/tokyo_eki.obj', mtl: './assets/tokyo_eki.mtl' },
    { obj: './assets/totyou_ver2.obj', mtl: './assets/totyou_ver2.mtl' }
];

// +属性テーブル
const objectAttributes = {
    './assets/tokyo_eki.obj': { type: 'building', health: 100 },
    './assets/totyou_ver2.obj': { type: 'monument', health: 50 }
};

// ランダムにオブジェクトを選択する関数
function getRandomObjectUrl() {
    const index = Math.floor(Math.random() * objUrls.length);
    return objUrls[index];
}

// オブジェクトをロードする関数
function loadOBJModel(objUrl, mtlUrl, position) {
    console.log("Starting to load OBJ model:", objUrl, mtlUrl); // +追加のデバッグメッセージ

    // 既にキャッシュにあるか確認
    if (objCache[objUrl]) {
        console.log("Using cached OBJ model:", objUrl); // +追加のデバッグメッセージ
        const object = objCache[objUrl].clone();
        object.position.copy(position);
        object.name = objUrl; // +名前を設定
        object.userData = objectAttributes[objUrl]; // +属性を設定
        scene.add(object);

        // Cannon.jsの物理ボディを作成
        const box = new THREE.Box3().setFromObject(object);
        const size = new THREE.Vector3();
        box.getSize(size);
        const boxShape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
        const boxBody = new CANNON.Body({ mass: 1 });
        boxBody.addShape(boxShape);
        boxBody.position.copy(object.position);

        // Sync Three.js and Cannon.js
        boxBody.threeMesh = object; // Three.jsメッシュを設定
        world.addBody(boxBody);

        console.log('Setting up collision handler for cached body:', boxBody); // +デバッグ用のログ追加
        setupCollisionHandler(boxBody); // +衝突ハンドラを設定

        return;
    }

    const mtlLoader = new MTLLoader();
    mtlLoader.load(mtlUrl, (materials) => {
        console.log("MTL loaded:", mtlUrl); // +追加のデバッグメッセージ
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.load(objUrl, (object) => {
            console.log("OBJ loaded:", objUrl); // +追加のデバッグメッセージ
            // キャッシュに保存
            objCache[objUrl] = object.clone();
            object.position.copy(position);
            object.name = objUrl; // +名前を設定
            object.userData = objectAttributes[objUrl]; // +属性を設定
            scene.add(object);

            // Cannon.jsの物理ボディを作成
            const box = new THREE.Box3().setFromObject(object);
            const size = new THREE.Vector3();
            box.getSize(size);
            const boxShape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
            const boxBody = new CANNON.Body({ mass: 1 });
            boxBody.addShape(boxShape);
            boxBody.position.copy(object.position);

            // Sync Three.js and Cannon.js
            boxBody.threeMesh = object; // +Three.jsメッシュを設定
            world.addBody(boxBody);

            console.log('Setting up collision handler for new body:', boxBody); // +デバッグ用のログ追加
            setupCollisionHandler(boxBody); // +衝突ハンドラを設定

        }, undefined, (error) => {
            console.error('An error happened while loading the .obj file', error);
        });
    }, undefined, (error) => {
        console.error('An error happened while loading the .mtl file', error);

        // +以下追加
        console.log("Loading OBJ without MTL file");

        // エラーが発生した場合でもOBJをロードする
        const objLoader = new OBJLoader();
        objLoader.load(objUrl, (object) => {
            console.log("OBJ loaded without MTL:", objUrl);
            object.position.copy(position);
            object.name = objUrl; // +名前を設定
            object.userData = objectAttributes[objUrl]; // +属性を設定
            scene.add(object);

            // Cannon.jsの物理ボディを作成
            const box = new THREE.Box3().setFromObject(object);
            const size = new THREE.Vector3();
            box.getSize(size);
            const boxShape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
            const boxBody = new CANNON.Body({ mass: 1 });
            boxBody.addShape(boxShape);
            boxBody.position.copy(object.position);

            // Sync Three.js and Cannon.js
            boxBody.threeMesh = object; // +Three.jsメッシュを設定
            world.addBody(boxBody);

            console.log('Setting up collision handler for new body:', boxBody); // +デバッグ用のログ追加
            setupCollisionHandler(boxBody); // +衝突ハンドラを設定

        }, undefined, (error) => {
            console.error('An error happened while loading the .obj file without MTL', error);
        });
        // +ここまで追加
    });
}

// マウスクリック時の処理
function onMouseClick(event) {
    console.log("Mouse clicked");  // +クリックが検知されたかを確認
    // マウス座標を正規化
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Raycasterを設定
    raycaster.setFromCamera(mouse, camera);

    // Raycasterの起点と方向をデバッグ出力
    console.log("Ray origin:", raycaster.ray.origin); // +追加のデバッグメッセージ
    console.log("Ray direction:", raycaster.ray.direction); // +追加のデバッグメッセージ

    // 地面との交差を計算
    const intersects = raycaster.intersectObject(groundMesh);
    console.log("Intersects:", intersects); // 追加のデバッグメッセージ

    if (intersects.length > 0) {
        console.log("Ground clicked");  // +地面がクリックされたかを確認
        // 交差位置にブロックを作成
        const intersect = intersects[0];
        const position = new THREE.Vector3(intersect.point.x, 100, intersect.point.z); // Y座標を100に固定
        const { obj, mtl } = getRandomObjectUrl(); // ランダムなオブジェクトを選択
        console.log("Loading object:", obj, mtl);  // +ロードするオブジェクトの情報を確認
        loadOBJModel(obj, mtl, position);
    }
}

document.addEventListener('click', onMouseClick);

console.log("Click event listener added"); // +追加のデバッグメッセージ

// +衝突イベントのリスナーを追加
function setupCollisionHandler(body) {
    console.log('Setting up collision handler for body:', body); // 追加
    body.addEventListener('collide', function(event) {
        try {
            const otherBody = event.body; // 衝突したもう一方の物体
            console.log('Collision detected between:', body, 'and', otherBody);

            if (body && otherBody) {
                console.log('Both bodies exist');

                const meshA = body.threeMesh;
                const meshB = otherBody.threeMesh;

                if (meshA && meshB) {
                    const attrA = meshA.userData;
                    const attrB = meshB.userData;
                    console.log('Attributes:', attrA, attrB); // 属性のログ

                    if (isBodyAtRest(body) && isBodyAtRest(otherBody)) {
                        if (shouldDestroy(attrA, attrB)) {
                            // 衝突した双方の物体を消滅させる
                            setTimeout(() => {
                                scene.remove(meshA);
                                scene.remove(meshB);
                                world.removeBody(body);
                                world.removeBody(otherBody);
                                console.log('Both objects destroyed:', meshA.name, meshB.name);
                            }, 0); // 次のフレームで削除
                        }
                    }
                }
            } else {
                console.log('One or both bodies are undefined');
            }
        } catch (error) {
            console.error('Error during collision handling:', error);
        }
    });
}

// +物体が静止しているかどうかを判定する関数
function isBodyAtRest(body) {
    const velocity = body.velocity;
    const isResting = velocity.length() < 0.1; // 任意の閾値、ここでは0.1以下で静止とみなす
    console.log('Velocity:', velocity, 'Is at rest:', isResting); // 静止状態のログ
    return isResting;
}

// +属性に基づいて物体を消滅させるかどうかを判定する関数
function shouldDestroy(attrA, attrB) {
    // 任意の条件で判定
    // 例: 両方の物体が特定のタイプの場合に消滅させる
    const shouldDestroy = attrA.type === 'building' && attrB.type === 'monument';
    console.log('Should destroy:', shouldDestroy); // 消滅条件のログ
    return shouldDestroy;
}

// +ゲームの制限時間とスコア
let startTime, isGameOver, score;
const gameDuration = 10;  // 例として10秒の制限時間を設定

// Animation loop
function animate() {
    if (!isGameOver) {
        requestAnimationFrame(animate);
    }

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

    checkGameOver();
}

// startGame関数をグローバルに定義
function startGame() {
    startTime = Date.now();
    isGameOver = false;
    score = 0;
    const gameOverElement = document.getElementById('game-over');
    const resultElement = document.getElementById('result');
    const timerElement = document.getElementById('timer');
    
    if (gameOverElement) gameOverElement.style.display = 'none';
    if (resultElement) resultElement.style.display = 'none';
    if (timerElement) {
        timerElement.textContent = `Time Left: ${gameDuration}`;
    } else {
        console.error('Timer element not found');
    }
    animate();  // animate()関数をここで呼び出す
}

// checkGameOver関数をグローバルに定義
function checkGameOver() {
    const elapsedTime = (Date.now() - startTime) / 1000;
    const timeLeft = Math.max(0, gameDuration - elapsedTime);
    const timerElement = document.getElementById('timer');
    const gameOverElement = document.getElementById('game-over');
    const resultElement = document.getElementById('result');
    
    if (timerElement) {
        timerElement.textContent = `Time Left: ${timeLeft.toFixed(1)}`;
    } else {
        console.error('Timer element not found', document.body.innerHTML);
    }

    if (!isGameOver && timeLeft <= 0) {
        isGameOver = true;
        if (gameOverElement) gameOverElement.style.display = 'block';
        if (resultElement) {
            resultElement.textContent = `Score: ${score}`;
            resultElement.style.display = 'block';
        } else {
            console.error('Timer element not found', document.body.innerHTML);
        }
    }
}

// Set initial camera position
camera.position.set(5, 5, 5);
camera.lookAt(0, 0, 0);

console.log("Camera position:", camera.position); // +追加のデバッグメッセージ

document.addEventListener('DOMContentLoaded', (event) => {
    console.log('DOMContentLoaded event fired');
    // ゲーム開始
    startGame();
});

//ゲームの開始
window.onload = startGame;