import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';

const groundSize = 20;

// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// スカイボックスを設定
const loader = new EXRLoader();
loader.load('./assets/back_ground.exr', function (texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = texture;
    scene.environment = texture;
    animate();
});

// 灰色のマテリアルを定義
const greyMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });

function loadAndRepeatCityModelGrid(objPath, startPosition, repeatX, repeatZ, distanceX, distanceZ) {
    const objLoader = new OBJLoader();
    objLoader.load(objPath, originalObject => {
        originalObject.traverse(child => {
            if (child.isMesh) {
                child.material = greyMaterial; // メッシュに灰色のマテリアルを適用
            }
        });
        // X軸とZ軸に沿ってモデルをリピート配置
        for (let i = 0; i < repeatX; i++) {
            for (let j = 0; j < repeatZ; j++) {
                const object = originalObject.clone();
                const posX = startPosition.x + i * distanceX;
                const posZ = startPosition.z + j * distanceZ;
                object.position.set(posX, startPosition.y, posZ);
                object.scale.set(10, 10, 10); // サイズ調整が必要な場合
                scene.add(object);
            }
        }
        console.log('City models added to the scene in a grid pattern on X and Z axes');
    });
}

// 街のモデルをX軸とZ軸のグリッド配置
loadAndRepeatCityModelGrid(
    './assets/city_model.obj',
    new THREE.Vector3(-10, 0, -10), // 初期位置
    3, // X軸のリピート回数
    3, // Z軸のリピート回数
    10, // X軸の距離
    10  // Z軸の距離
);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
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
const groundMaterialMesh = new THREE.MeshBasicMaterial({ color: 0x2E8B57, side: THREE.DoubleSide }); // Sea green
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
    const wallMaterial = new THREE.MeshBasicMaterial({ color: 0xB0C4DE, transparent: true, opacity: 0.5 }); // Light steel blue
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    wallMesh.position.set(position.x, position.y, position.z);
    scene.add(wallMesh);
}

// 地面の周りに壁を作成
const wallHeight = 15;
const uppperWallHeight = 8;
createWall(new THREE.Vector3(0, wallHeight / 2, -groundSize / 2), new THREE.Vector3(groundSize, wallHeight, 0.1)); // Front wall
createWall(new THREE.Vector3(0, wallHeight / 2, groundSize / 2), new THREE.Vector3(groundSize, wallHeight, 0.1)); // Back wall
createWall(new THREE.Vector3(-groundSize / 2, wallHeight / 2, 0), new THREE.Vector3(0.1, wallHeight, groundSize)); // Left wall
createWall(new THREE.Vector3(groundSize / 2, wallHeight / 2, 0), new THREE.Vector3(0.1, wallHeight, groundSize));

// 透明な蓋の作成（物理シミュレーションなし）
const lidGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
const lidMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide, transparent: true, opacity: 0.3 }); // Light blue
const lidMesh = new THREE.Mesh(lidGeometry, lidMaterial);
lidMesh.rotation.x = Math.PI / 2;
lidMesh.position.y = uppperWallHeight;
scene.add(lidMesh);

// Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// オブジェクトのキャッシュ
const objCache = {};
const mtlCache = {};

// オブジェクトのURL配列
const objUrls = [
    { obj: './assets/tokyo_eki.obj', mtl: './assets/tokyo_eki.mtl' },
    { obj: './assets/totyou_ver2.obj', mtl: './assets/totyou_ver2.mtl' },
    { obj: './assets/tokyo_tower.obj', mtl: './assets/tokyo_tower.mtl' },
    { obj: './assets/bill.obj', mtl: './assets/bill.mtl' },
    { obj: './assets/National_Stadium.obj', mtl: './assets/National_Stadium.mtl' }
];

// +属性テーブル
const objectAttributes = {
    './assets/tokyo_eki.obj': { type: 'building', health: 100 },
    './assets/totyou_ver2.obj': { type: 'monument', health: 50 },
    './assets/tokyo_tower.obj': { type: 'monument', health: 50 },
    './assets/bill.obj': { type: 'building', health: 100 },
    './assets/National_Stadium.obj': { type: 'monument', health: 50 }
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
    if (currentState === 'PLAYING') {
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
            const position = new THREE.Vector3(intersect.point.x, 10, intersect.point.z); // Y座標を固定
            const { obj, mtl } = getRandomObjectUrl(); // ランダムなオブジェクトを選択
            console.log("Loading object:", obj, mtl);  // +ロードするオブジェクトの情報を確認
            loadOBJModel(obj, mtl, position);
        }
    } else if (currentState === 'MENU') {
        console.log("Starting game from menu...");
        // ゲームプレイ画面に移行
        startGame();
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
    // console.log('Velocity:', velocity, 'Is at rest:', isResting); // 静止状態のログ
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

// State management
let currentState = 'MENU';

// メニュー画面の関数
function showMenu() {
    console.log("Showing menu...");
    // メニュー画面の表示を追加
    // ここでメニューのHTML要素を表示したり、シーンを設定したりする

    // タイトル画面を表示
    const title = document.createElement('div');
    title.style.position = 'absolute';
    title.style.top = '50%';
    title.style.left = '50%';
    title.style.transform = 'translate(-50%, -50%)';
    title.style.color = 'white';
    title.style.fontSize = '24px';
    title.style.fontFamily = 'Arial';
    title.textContent = 'Click to start';
    document.body.appendChild(title);
}

// ゲームプレイ画面の関数
function startGame() {
    console.log("Starting game...");
    currentState = 'PLAYING';
    // ゲームプレイの初期化

    // title要素を削除
    const title = document.querySelector('div');
    if (title) {
        title.remove();
    }

    // オブジェクトの生成や物理エンジンのリセットなどを行う
}

// ゲームクリア/オーバー画面の関数
function showGameOver() {
    console.log("Game over...");
    currentState = 'GAME_OVER';
    // ゲームクリア/オーバー画面の表示を追加
    // ここで結果のHTML要素を表示したり、シーンを設定したりする
    // ゲームオーバー画面を表示
    const gameOver = document.createElement('div');
    gameOver.style.position = 'absolute';
    gameOver.style.top = '50%';
    gameOver.style.left = '50%';
    gameOver.style.transform = 'translate(-50%, -50%)';
    gameOver.style.color = 'white';
    gameOver.style.fontSize = '24px';
    gameOver.style.fontFamily = 'Arial';
    gameOver.textContent = 'Game over';
    document.body.appendChild(gameOver);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (currentState === 'PLAYING') {
        // Update physics
        world.step(1 / 60);

        // Sync Three.js and Cannon.js meshes
        world.bodies.forEach(body => {
            if (body.threeMesh) {
                body.threeMesh.position.copy(body.position);
                body.threeMesh.quaternion.copy(body.quaternion);
            }
        });

        // ゲームオーバー判定
        world.bodies.forEach(body => {
            if (body.threeMesh && body.threeMesh.userData.type === 'building') {
                if (isBodyAtRest(body) && checkOverlap(body, lidMesh)) {
                    showGameOver();
                }
            }
        });
    }

    controls.update();
    renderer.render(scene, camera);
}

// 衝突判定
function checkOverlap(bodyA, meshB) {
    const boxA = new THREE.Box3().setFromObject(bodyA.threeMesh);
    const boxB = new THREE.Box3().setFromObject(meshB);
    return boxA.intersectsBox(boxB);
}

// Set initial camera position
camera.position.set(5, 5, 5);
camera.lookAt(0, 0, 0);

console.log("Camera position:", camera.position); // +追加のデバッグメッセージ

// Start animation
animate();

// 初期状態のメニュー画面を表示
showMenu();
