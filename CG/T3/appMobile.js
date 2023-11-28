import * as THREE from 'three';
import { FontLoader } from '../build/jsm/loaders/FontLoader.js';
import { TextGeometry } from '../build/jsm/geometries/TextGeometry.js';
import {initRenderer, 
        createGroundPlaneXZ,
        setDefaultMaterial,
        onWindowResize,
        getFilename,
        getMaxSize} from "../libs/util/util.js";
import KeyboardState from '../libs/util/KeyboardState.js';
import { CSG } from '../libs/other/CSGMesh.js'        
import {OrbitControls} from '../build/jsm/controls/OrbitControls.js';
import {GLTFLoader} from '../build/jsm/loaders/GLTFLoader.js';
import {DragControls} from '../build/jsm/controls/DragControls.js'

import { Buttons } from "../libs/other/buttons.js";
var buttons = new Buttons(onButtonDown, onButtonUp);

let scene, renderer, camera, material, keyboard;
scene = new THREE.Scene();
renderer = initRenderer("rgb(30, 30, 42)");
material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    shininess: 50,
    specular: 0x888888
});
keyboard = new KeyboardState();

// Implementing welcome screen and end screen
let loadingScreen = document.getElementById( 'loading-screen' );
loadingScreen.transition = 0;
loadingScreen.style.setProperty('--speed1', '0');  
loadingScreen.style.setProperty('--speed2', '0');  
loadingScreen.style.setProperty('--speed3', '0');

let button = document.getElementById("myBtn");
button.addEventListener("click", onButtonPressed);

function onButtonPressed(){
  const welcomeScreen = document.getElementById('loading-screen');
  welcomeScreen.transition = 0;
  welcomeScreen.classList.add('fade-out');
  welcomeScreen.addEventListener('transitionend', (e) => {
    const element = e.target;
    element.remove();  
  });
}

function endGameScreen(){
  var endSection = document.createElement('section');
  endSection.id = 'end-screen';
  endSection.innerHTML = "Game ended";
  document.body.appendChild(endSection);

  endSection.transition = 0;
  endSection.classList.add('fade-out');
}

// Turning directional light
let dirLight = new THREE.DirectionalLight("rgb(255, 255, 255)", 0.35);
dirLight.position.copy(new THREE.Vector3(10, 40, -50));

// Texture
var textureLoader = new THREE.TextureLoader();
var cement = textureLoader.load('../assets/textures/stone.jpg');
var back_texture = textureLoader.load('../assets/textures/intertravado.jpg');

// Shadow settings
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048 * 2;
dirLight.shadow.mapSize.height = 2048 * 2;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 500;
dirLight.shadow.camera.left = -100;
dirLight.shadow.camera.right = 100;
dirLight.shadow.camera.top = 100;
dirLight.shadow.camera.bottom = -100;
scene.add(dirLight);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const lightHelper = new THREE.DirectionalLightHelper(dirLight, 5);
scene.add(lightHelper);

// Starting at level 1
let level = 1;

window.addEventListener('resize', function(){
  camera.aspect = window.innerWidth / (1.5*window.innerHeight);
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

// window.addEventListener('click', newGame)

function onButtonDown(event) {
  switch(event.target.id)
  {
    case "A":
      pressedA = true;
     break;
    case "B":
      pressedB = true;
    break;    
    case "full":
      buttons.setFullScreen();
    break;    
  }
}

function onButtonUp(event) {
  if(event.target.id == "A")
    newGame(event)

  if(event.target.id == "full")
    button.setFullScreen();
}

let camPos  = new THREE.Vector3(0, 110, 70);
let camLook = new THREE.Vector3(0, -22.2, 0);

// Create an orthogonal camera
let width = window.innerWidth;
let height = window.innerHeight;
let aspectRatio = width / (1.5*height);
let viewSize = 110;

camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 1000);

camera.position.copy(camPos);
camera.lookAt(camLook);
camera.up.set(0, 1, 0);
scene.add(camera);

const listener = new THREE.AudioListener();
camera.add(listener);

const rebatedorSound = new THREE.Audio(listener);

const rebatedorLoader = new THREE.AudioLoader();
rebatedorLoader.load('../assets/sounds/rebatedor.mp3', function( buffer ) {
    rebatedorSound.setBuffer(buffer);
    rebatedorSound.setLoop(false);
    rebatedorSound.setVolume(0.5);
});

const blocoSound = new THREE.Audio(listener);

const blocoLoader = new THREE.AudioLoader();
blocoLoader.load('../assets/sounds/bloco1.mp3', function( buffer ) {
    blocoSound.setBuffer(buffer);
    blocoSound.setLoop(false);
    blocoSound.setVolume(0.5);
});

const twoHitSound = new THREE.Audio(listener);

const twoHitLoader = new THREE.AudioLoader();
twoHitLoader.load('../assets/sounds/bloco2.mp3', function( buffer ) {
    twoHitSound.setBuffer(buffer);
    twoHitSound.setLoop(false);
    twoHitSound.setVolume(0.5);
});

const extrudeSettings = {
  steps: 1,
  depth: 4,
  bevelEnabled: true,
  bevelThickness: 0.05,
  bevelSize: 0.05,
  bevelSegments: 4,
};

const planeHeight = 118;
const planeWidth = planeHeight / 2;
var groundPlane = createGroundPlaneXZ(planeWidth, planeHeight, 10, 10, "darkblue");
scene.add(groundPlane);
groundPlane.visible = false;

// Enabling Orbit Controls
var orbit;
var orbitEnabled = false;

// Creating the cube map
// Setting the 6 textures of the cubemap
const path = '../assets/textures/cube/Maskonaive/';
const format = '.jpg';
const urls = [
	path + 'posx' + format, path + 'negx' + format,
	path + 'posy' + format, path + 'negy' + format,
	path + 'posz' + format, path + 'negz' + format
];
// Setting the two cube maps, one for refraction and one for reflection
let cubeMapTexture = new THREE.CubeTextureLoader().load( urls );

// Create the main scene and Set its background as a cubemap (using a CubeTexture)
scene.background = cubeMapTexture;

loadGLTFFile('../assets/objects/', 'other_ship', 15, -90, true);
var external_obj;

function loadGLTFFile(modelPath, modelName, desiredScale, angle, visibility)
{
   var loader = new GLTFLoader( );
   loader.load( modelPath + modelName + '.glb', function ( gltf ) {
      external_obj = gltf.scene;
      external_obj.visible = visibility;
      external_obj.name = getFilename(modelName);
      external_obj.traverse(function (child)
      {
         if(child.isMesh) child.castShadow = true;
         if(child.material) child.material.side = THREE.DoubleSide; 
      });

      external_obj = normalizeAndRescale(external_obj, desiredScale);
      external_obj = fixPosition(external_obj);
      external_obj.position.set(rebatedor.position.x, rebatedor.position.y, 45);
      external_obj.rotateY(THREE.MathUtils.degToRad(angle));

      scene.add(external_obj);
   })
}

// Normalize scale and multiple by the newScale
function normalizeAndRescale(obj, newScale)
{
  var scale = getMaxSize(obj); // Available in 'utils.js'
  obj.scale.set(newScale * (1.0/scale),
                newScale * (1.0/scale),
                newScale * (1.0/scale));
  return obj;
}

function fixPosition(obj)
{
  // Fix position of the object over the ground plane
  var box = new THREE.Box3().setFromObject( obj );
  if(box.min.y > 0)
    obj.translateY(-box.min.y);
  else
    obj.translateY(-1*box.min.y);
  return obj;
}

let firstStart = true;

function newGame(event){
  if(event.target.id == "myBtn" || event.target.id == 'loading-screen')
    return;

  if(!isPlaying && firstStart){
    firstStart = false
    startGame(true);
    throwGameBall();
  }

  if(!isPlaying)
    throwGameBall();
}

// Reseting camera due to orbit controls
function resetCamera(){
  camera.position.copy(camPos);
  camera.lookAt(camLook);
  camera.up.set(0, 1, 0);
}

// Implementing rebatedor
function updateRebatedorCoordinates(point){
  transparentObj[0].position.z = 55;
  rebatedor.position.x = transparentObj[0].position.x;
  rebatedorCenter.position.copy(rebatedor.position);
  rebatedorCenter.position.z += 6.7;

  // If there is gltf obj loaded
  try{
    external_obj.position.set(rebatedor.position.x, 0, 45);
  }
  catch{
    return;
  }
}


// Limiting rebatedor movements
let limitWall = 29.70

function canMoveRebatedor(){
  if(rebatedor.bb.min.x < -limitWall)
    return 'left'
  if(rebatedor.bb.max.x > limitWall)
    return 'right'

  return undefined;
}

let raycaster = new THREE.Raycaster();
let canMove = true;

function checkMouseIntersection(){
  if(!isPaused && canMove){
    // Getting mouse
    let pointer = new THREE.Vector2();
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientX / window.innerWidth) * 2 + 1;

    // Checking for intersections
    raycaster.setFromCamera(pointer, camera);
    let intersects = raycaster.intersectObject(groundPlane);

    if(intersects.length > 0){
      let point = intersects[0].point;
      updateRebatedorCoordinates(point);
    }
  }
}

function setTexture(mesh, texture) {
  let geometry = mesh.geometry;
  mesh.material[2].map = texture;
}

function setupRebatedor()
{
  let auxMat = new THREE.Matrix4();

  let cubeMesh = new THREE.Mesh(new THREE.BoxGeometry(5, 9, 20));
  let cylinderMesh = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 4, 32, 32, false));;
  let topCubeMesh = new THREE.Mesh(new THREE.BoxGeometry(5, 9, 20), setDefaultMaterial('blue'));

  cylinderMesh.geometry.scale(1, 1, 2);
  cubeMesh.position.x += 2
  topCubeMesh.position.y = 5;
  topCubeMesh.position.x = -3;

  updateObject(cubeMesh);
  updateObject(topCubeMesh);

  // CSG holders
  let csgObject, cubeCSG, cylinderCSG, topCubeCSG, finalObject;

  cylinderCSG = CSG.fromMesh(cylinderMesh, 0);
  cubeCSG = CSG.fromMesh(cubeMesh, 1);
  topCubeCSG = CSG.fromMesh(topCubeMesh, 2);
  csgObject = cylinderCSG.subtract(topCubeCSG);
  finalObject = csgObject.subtract(cubeCSG);

  let shipTexture = textureLoader.load('../assets/textures/crate.jpg');
  let backMaterial = new THREE.MeshLambertMaterial({map: back_texture});
  let finalMesh = CSG.toMesh(finalObject, auxMat, [material, backMaterial, setDefaultMaterial('white')]);

  shipTexture.repeat.set(3, 10);
  shipTexture.wrapS = shipTexture.wrapT = THREE.RepeatWrapping 
  setTexture(finalMesh, shipTexture);
  console.log(finalMesh);

  rebatedor = finalMesh;
  rebatedor.castShadow = true;
  rebatedor.rotateY(-Math.PI/2);
  rebatedor.position.set(0, 0, 0);

  rebatedor.bb = new THREE.Box3();
  rebatedor.helper = new THREE.Box3Helper(rebatedor.bb, 'white');
  rebatedor.bb.setFromObject(rebatedor);

  // scene.add(rebatedor.helper);
  scene.add(rebatedor)

  rebatedor.position.z = 40;
  
  // Debug purposes
  rebatedorCenter = new THREE.Mesh(new THREE.SphereGeometry(9, 32, 16));
  rebatedorCenter.position.copy(rebatedor.position)
  rebatedorCenter.geometry.scale(1.15, 1, 1.15);
  rebatedorCenter.position.z += 6.7;
  // scene.add(rebatedorCenter)
}

function updateObject(mesh)
{
   mesh.matrixAutoUpdate = false;
   mesh.updateMatrix();
}

var rebatedor;
var rebatedorCenter;
setupRebatedor();

window.addEventListener('mousemove', checkMouseIntersection);

// Implementing ball
let gameBall = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), material);
gameBall.bb = new THREE.Box3();
gameBall.visible = true;
gameBall.castShadow = true;
gameBall.speed = 0.4;

let speedIncrease = ((gameBall.speed * 2) - gameBall.speed) / 15;

scene.add(gameBall);

let counter = 0;

// Implementing edges
let edges = [];
const edgeSegmentSize = 3.5;
const edgeVertical = planeHeight / edgeSegmentSize;
const edgeHorizontal = (planeWidth / edgeSegmentSize) + 1;

function setupEdges(){
  let geometry, obj, edgeMaterial;
  let edgeStartX = (-planeWidth / 2) + 1.5;
  let edgeStartZ = (-planeHeight / 2);

  edgeMaterial = setDefaultMaterial('grey');

  for(let s=0; s<1; s++){
    for(let i=0; i<edgeHorizontal-1; i++){
      geometry = new THREE.BoxGeometry(edgeSegmentSize-0.2, edgeSegmentSize, edgeSegmentSize);
      obj = new THREE.Mesh(geometry, edgeMaterial);
      obj.castShadow = true;

      obj.position.x = edgeStartX;
      obj.position.z = edgeStartZ;

      obj.bb = new THREE.Box3();
      obj.helper = new THREE.Box3Helper(obj.bb, 'white');
      obj.bb.setFromObject(obj);

      scene.add(obj);
      scene.add(obj.helper);

      edges.push(obj);

      edgeStartX += edgeSegmentSize;
    }

    edgeStartX = -planeWidth / 2 + 2.5;
    edgeStartZ = -planeHeight / 2 * -1;
  }

  edgeStartZ = (-planeHeight / 2);
  edgeStartX = -planeWidth / 2 - 2.1;

  for(let s=0; s<2; s++){
    for(let i=0; i<edgeVertical; i++){
      geometry = new THREE.BoxGeometry(edgeSegmentSize, edgeSegmentSize, edgeSegmentSize-0.3);
      obj = new THREE.Mesh(geometry, edgeMaterial);
      obj.castShadow = true;

      obj.position.x = edgeStartX;
      obj.position.z = edgeStartZ;

      obj.bb = new THREE.Box3();
      obj.helper = new THREE.Box3Helper(obj.bb, 'white');
      obj.bb.setFromObject(obj);

      scene.add(obj);
      scene.add(obj.helper);

      edges.push(obj);

      edgeStartZ += edgeSegmentSize;
    }

    edgeStartZ = (-planeHeight / 2);
    edgeStartX = -planeWidth / 2 * -1 + 2.1;
  }
}

setupEdges();

// Implementing wall
function createRoundedRectShape(materialRectShape){
  const roundedRectShape = new THREE.Shape();

  const widthRect = 4;
  const heightRect = 4;
  const radius = 1;

  roundedRectShape.moveTo(-widthRect / 2, -heightRect / 2 + radius);
  roundedRectShape.lineTo(-widthRect / 2, heightRect / 2 - radius);
  roundedRectShape.quadraticCurveTo(-widthRect / 2, heightRect / 2, -widthRect / 2 + radius, heightRect / 2);
  roundedRectShape.lineTo(widthRect / 2 - radius, heightRect / 2);
  roundedRectShape.quadraticCurveTo(widthRect / 2, heightRect / 2, widthRect / 2, heightRect / 2 - radius);
  roundedRectShape.lineTo(widthRect / 2, -heightRect / 2 + radius);
  roundedRectShape.quadraticCurveTo(widthRect / 2, -heightRect / 2, widthRect / 2 - radius, -heightRect / 2);
  roundedRectShape.lineTo(-widthRect / 2 + radius, -heightRect / 2);

  const geometry = new THREE.ExtrudeGeometry(roundedRectShape, extrudeSettings);
  const roundedRectangle = new THREE.Mesh(geometry, materialRectShape);

  roundedRectangle.translateY(1);
  roundedRectangle.rotateX(80);

  return roundedRectangle;
}

let wall = [];
const wallSegmentSize = 4;
const wallColumns = (planeWidth / wallSegmentSize) - 2;
const wallLines = 6;

let wallColors = ['grey', 'red', 'blue', 'orange', 'pink', 'green']

function setupFirstLevel(){
  let geometry, edges, wallMaterial;
  let wallStartZ = -planeHeight/2 + 10;

  for(let i=0; i<wallLines; i++){
    wall.push([]);
    for(let j=0; j<wallColumns; j++)
      wall[i].push(null);
  }

  for(let i=0; i<wallLines; i++){
    let wallStartX = -planeWidth/2 + 5;
    let wallColor = wallColors[i];
    wallMaterial = new THREE.MeshLambertMaterial({color:wallColor});

    for(let j=0; j<wallColumns; j++){
      wall[i][j] = createRoundedRectShape(wallMaterial);
      wall[i][j].castShadow = true;

      // Two life wall
      if(wallColor == "grey"){
        wall[i][j].twoLife = true;
        wall[i][j].hitted = false;

        wall[i][j].material = new THREE.MeshLambertMaterial();;
        wall[i][j].material.map = cement;
      }
      else
        wall[i][j].twoLife = false;


      // Positioning
      wall[i][j].position.x = wallStartX;
      wall[i][j].position.z = wallStartZ;
      wall[i][j].position.y = -3;

      wall[i][j].bb = new THREE.Box3();
      wall[i][j].helper = new THREE.Box3Helper(wall[i][j].bb, 'white');
      wall[i][j].bb.setFromObject(wall[i][j]);

      scene.add(wall[i][j]);
      // scene.add(wall[i][j].helper);

      wallStartX = wallStartX + wallSegmentSize;
    }

    wallStartZ = wallStartZ + wallSegmentSize;
  }
}

setupFirstLevel();

// Implementing keyboard
function keyboardUpdate(){
  keyboard.update();

  if(keyboard.down("space")){
    if(isPlaying && !isPaused)
      isPaused = true;
    else if(isPlaying && isPaused)
      isPaused = false;
  }

  if(keyboard.down("enter"))
    toggleFullScreen();

  if(keyboard.down("R")){
    isPlaying = false;
    gameBall.speed = 0.4;
    updateText();
    startGame(true);
  }

  if(keyboard.down("G")){
    isPlaying = false;
    gameBall.position.copy(rebatedor.position.clone());
    gameBall.position.z -= 7.5;
    startGame(false);
  }

  if(keyboard.down("O")){
    if(orbitEnabled){
      orbit.dispose();
      orbitEnabled = false;
      resetCamera();
      isPaused = false;
    }
    else{
      orbit = new OrbitControls(camera, renderer.domElement);
      orbitEnabled = true;
      isPaused = true;
    }
  }
}

// Implementing collisions
function checkCollision(currBall){

  if(level == 1){
    // Checking collisions against wall
    for(let i=0; i<wallLines; i++){
      for(let j=0; j<wallColumns; j++){
        if(currBall.bb.intersectsBox(wall[i][j].bb) && wall[i][j].live){
          collideWithEdge = false;

          // Implementing two lifes wall
          if(wall[i][j].twoLife){
            if(wall[i][j].hitted){
              playSound(blocoSound);
              wall[i][j].live = false;
              wall[i][j].visible = false;
              counter = counter + 1;
            }
            else{
              playSound(twoHitSound);
              wall[i][j].hitted = true;
              wall[i][j].material = new THREE.MeshLambertMaterial({color:0xcecece});
            }
          }
          else{
            playSound(blocoSound);
            wall[i][j].live = false;
            wall[i][j].visible = false;
            counter = counter + 1;
          }

          return wall[i][j];
        }
      }
    }
  }

  if(level == 2){
    // Checking collisions against wall
    for(let i=0; i<secondWallLines; i++){
      for(let j=0; j<secondWallColumns; j++){
        if(currBall.bb.intersectsBox(secondWall[i][j].bb) && secondWall[i][j].live){
          collideWithEdge = false;

          // Implementing two lifes wall
          if(secondWall[i][j].twoLife){
            if(secondWall[i][j].hitted){
              playSound(blocoSound);
              secondWall[i][j].live = false;
              secondWall[i][j].visible = false;
              counter = counter + 1;
            }
            else{
              playSound(twoHitSound);
              secondWall[i][j].hitted = true;
              secondWall[i][j].material = new THREE.MeshLambertMaterial({color:0xcecece});
            }
          }
          else{
            playSound(blocoSound);
            secondWall[i][j].live = false;
            secondWall[i][j].visible = false;
            counter = counter + 1;
          }

          return secondWall[i][j];
        }
      }
    }
  }

  if(level == 3){
    // Checking collisions against wall
    for(let i=0; i<11; i++){
      for(let j=0; j<6; j++){
        if(currBall.bb.intersectsBox(thirdWall[i][j].bb) && thirdWall[i][j].live){
          playSound(blocoSound);
          collideWithEdge = false;

          // Checking if collided with immortal wall block
          if(thirdWall[i][j].immortal)
            return thirdWall[i][j];

          thirdWall[i][j].live = false;
          thirdWall[i][j].visible = false;
          counter = counter + 1;

          return thirdWall[i][j];
        }
      }
    }

    // checking collisions against pink wall
    for(let j=0; j<3; j++){
      if(currBall.bb.intersectsBox(auxThirdWall[j].bb) && auxThirdWall[j].live){
        playSound(blocoSound);
        collideWithEdge = false;
        auxThirdWall[j].live = false;
        auxThirdWall[j].visible = false;
        counter = counter + 1;

        return auxThirdWall[j];
      }
    }
  }

  // Checking collision against edges
  for(let i=0; i<edges.length; i++){
    if(currBall.bb.intersectsBox(edges[i].bb)){
      collideWithEdge = true;
      indexTarget = i;
      return edges[i];
    }
  }

  return undefined;
}

function collideFromBottom(ball, block){
  return (oldBox.min.z > block.bb.max.z && ball.bb.min.z < block.bb.max.z)
}

function collideFromLeft(ball, block){
  return (oldBox.max.x < block.bb.min.x && ball.bb.max.x > block.bb.min.x)
}

function collideFromRight(ball, block){
  return (oldBox.min.x > block.bb.max.x && ball.bb.min.x < block.bb.max.x)
}

function collideFromTop(ball, block){
  return (oldBox.max.z < block.bb.min.z && ball.bb.max.z > block.bb.min.z)
}

function ballDeclining(ball){
  return ball.bb.max.z > oldBox.max.z;
}

function ballScaling(ball){
  return ball.bb.min.z < oldBox.min.z;
}

function ballGoingRight(ball){
  return ball.bb.max.x > oldBox.max.x;
}

function ballGoingLeft(ball){
  return ball.bb.min.x < oldBox.min.x;
}

function findNormal(currBall, block){
  if(collideFromLeft(currBall, block) || collideFromRight(currBall, block)){
    if(ballGoingRight(currBall))
      return new THREE.Vector3(-1, 0, 0);
    if(ballGoingLeft(currBall))
      return new THREE.Vector3(1, 0, 0);
  }

  if(collideFromBottom(currBall, block) || collideFromTop(currBall, block)){
    if(ballDeclining(currBall))
      return new THREE.Vector3(0, 0, -1);
    if(ballScaling(currBall))
      return new THREE.Vector3(0, 0, 1);
  }
}

function outputfindNormal(currBall, block){
  if(collideFromBottom(currBall, block) || collideFromTop(currBall, block)){
    if(ballDeclining(currBall)){
      console.log("Bola descendo (top)")
    }
    if(ballScaling(currBall)){
      console.log("Bola subindo (bottom)");
    }
  }

  if(collideFromLeft(currBall, block) || collideFromRight(currBall, block)){
    if(ballGoingRight(currBall)){
      console.log("Bola indo a direita (left)");
    }
    if(ballGoingLeft(currBall)){
      console.log("Bola indo a esquerda (right)");
    }
  }
}

function threatEdgeCollision(){
  if(indexTarget >= 0 && indexTarget <= 16)
    return new THREE.Vector3(0, 0, 1);
  else if(indexTarget >= 17 && indexTarget <= 50)
    return new THREE.Vector3(1, 0, 0);
  else
    return new THREE.Vector3(-1, 0, 0);
}

var indexTarget = undefined;
var collideWithEdge = false;

function updateBallMovement(currBall, target){
  let dirVector, reflectVector, normal;
  console.log(collideWithEdge, indexTarget);

  dirVector = currBall.getWorldDirection(new THREE.Vector3());

  // Treating walls separately
  if(collideWithEdge) normal = threatEdgeCollision();
  else normal = findNormal(currBall, target);

  outputfindNormal(currBall, target);
  reflectVector = dirVector.clone().reflect(normal);

  const crossProduct = new THREE.Vector3();
  crossProduct.crossVectors(dirVector, reflectVector);

  const angle = dirVector.angleTo(reflectVector);

  console.log("Normal:", normal)
  console.log("Direção: ", dirVector);
  console.log("Reflexão: ", reflectVector);
  console.log("Angulo: ", angle);
  console.log("Old: ", oldBox);
  console.log("Current: ", currBall.bb.min);
  console.log("Block: ", target.bb.max);
  console.log("_______________________________");

  if(crossProduct.y > 0) currBall.rotateY(angle);
  else if(crossProduct.y < 0) currBall.rotateY(-angle);
  else currBall.rotateY(Math.PI);
}

function threatCollisionRebatedor(currBall){
  let dirVector, reflectVector, normal;

  // Find normal vector
  normal = new THREE.Vector3();
  normal.subVectors(currBall.position, rebatedorCenter.position);
  normal.normalize();

  // Find direction vector
  dirVector = currBall.getWorldDirection(new THREE.Vector3());
  dirVector.normalize();

  // Find reflection vector (where the ball should go)
  reflectVector = new THREE.Vector3();
  reflectVector.copy(dirVector).reflect(normal);

  const crossProduct = new THREE.Vector3();
  crossProduct.crossVectors(dirVector, reflectVector);

  const angle = dirVector.angleTo(reflectVector);

  if(crossProduct.y > 0) currBall.rotateY(angle);
  else if(crossProduct.y < 0) currBall.rotateY(-angle);
  else currBall.rotateY(Math.PI);
}

function checkCollisionRebatedor(currBall){
  var ballRadius = currBall.geometry.parameters.radius;
  var rebatedorRadius = 11;

  // Game ball center
  var ballCx = currBall.position.x;
  var ballCz = currBall.position.z;

  // Rebatedor center
  var rebatedorCx = rebatedorCenter.position.x;
  var rebatedorCz = rebatedorCenter.position.z;

  // Distance between centers
  var distance = Math.sqrt(Math.pow(rebatedorCx - ballCx, 2) + Math.pow(rebatedorCz - ballCz, 2));

  // Circle x Circle collision detected
  if(distance <= ballRadius + rebatedorRadius){
    // Checking if it is with rebatedor segment
    if((currBall.position.z + 0.5 >= rebatedor.position.z - 4) &&
      (currBall.position.z + 0.5 <= rebatedor.position.z)){
      return true;
    }
  }
  else
    return false;
}

function findCollisionNormal(cube1, cube2){
  const aabb1 = cube1.bb;
  const aabb2 = cube2.bb;

  const center1 = new THREE.Vector3();
  center1.copy(aabb1.min).add(aabb1.max).multiplyScalar(0.5);

  const center2 = new THREE.Vector3();
  center2.copy(aabb2.min).add(aabb2.max).multiplyScalar(0.5);

  const vectorBetweenCenters = new THREE.Vector3();
  vectorBetweenCenters.subVectors(center2, center1).normalize();

  const halfExtent1 = new THREE.Vector3();
  const halfExtent2 = new THREE.Vector3();
  halfExtent1.copy(aabb1.max).sub(aabb1.min).multiplyScalar(0.5);
  halfExtent2.copy(aabb2.max).sub(aabb2.min).multiplyScalar(0.5);

  const overlapX = halfExtent1.x + halfExtent2.x - Math.abs(vectorBetweenCenters.x);
  const overlapZ = halfExtent1.z + halfExtent2.z - Math.abs(vectorBetweenCenters.z);

  let collisionNormal;

  if (overlapX < overlapZ) {
      // Collision in the X-axis (horizontal)
      collisionNormal = new THREE.Vector3(1, 0, 0);
  } else {
      // Collision in the Z-axis (horizontal)
      collisionNormal = new THREE.Vector3(0, 0, 1);
  }

  return collisionNormal;
}

var oldBox = new THREE.Vector3();

function updateGameBall(currBall){
  if(isPaused)
    return;

  if(isPlaying){
    currBall.translateZ(currBall.speed);
  }
  else if(!isPaused){
    currBall.position.copy(rebatedor.position.clone());
    currBall.rotateY(THREE.MathUtils.degToRad(-180));
    currBall.position.z -= 7.5;
  }

  currBall.bb.setFromObject(currBall);

  let collision = checkCollision(currBall);
  let collisionRebatedor = checkCollisionRebatedor(currBall);

  if(collision != undefined) updateBallMovement(currBall, collision);
  else oldBox = currBall.bb.clone();

  if(collisionRebatedor){
    threatCollisionRebatedor(currBall);
    playSound(rebatedorSound);
  }
}

// Doing different end game check for different levels
function endGame(){
  // First level check
  if(level == 1){
    for(let i=0; i<wallLines; i++)
      for(let j=0; j<wallColumns; j++)
        if(wall[i][j].live)
          return false;
  }

  // Second level check
  if(level == 2){
    for(let i=0; i<secondWallLines; i++)
      for(let j=0; j<secondWallColumns; j++)
        if(secondWall[i][j].live)
          return false;
  }

  // Third level check
  if(level == 3){
    for(let i=0; i<11; i++)
      for(let j=0; j<6; j++)
        if(thirdWall[i][j].live && !thirdWall[i][j].immortal)
          return false;

    for(let i=0; i<3; i++)
      if(auxThirdWall[i].live)
        return false;

    endGameScreen();
    isPlaying = false;
    isPaused = true;
    return true;
  }

  isPlaying = false;
  return true;
}

let isPlaying = false;
let isPaused = false;

function resetGameBall(currBall){
  let dir = gameBall.getWorldDirection(new THREE.Vector3(0, 0, 0));
  let zDirection = new THREE.Vector3(0, 0, 1);

  const crossProduct = new THREE.Vector3();
  crossProduct.crossVectors(dir, zDirection);

  const angle = dir.angleTo(zDirection);

  if(crossProduct.y > 0){
    // Left
    currBall.rotateY(angle);
  }
  else if(crossProduct.y < 0){
    // Right
    currBall.rotateY(-angle);
  }
}

function throwGameBall(){
  resetGameBall(gameBall);

  gameBall.position.copy(rebatedor.position.clone());
  gameBall.position.z -= 7;
  gameBall.rotateY(THREE.MathUtils.degToRad(-180));

  isPlaying = true;
  gameBall.visible = true;
}

function startFirstLevel(){
  console.log(wall[0][0].bb);
  for(let i=0; i<wallLines; i++){
    for(let j=0; j<wallColumns; j++){
      wall[i][j].live = true;
      wall[i][j].visible = true;
    }
  }
}

function startSecondLevel(){
  for(let i=0; i<secondWallLines; i++){
    for(let j=0; j<secondWallColumns; j++){
      secondWall[i][j].live = true;
      secondWall[i][j].visible = true;
    }
  }
}

function startThirdLevel(){
  for(let i=0; i<11; i++){
    for(let j=0; j<6; j++){
      thirdWall[i][j].live = true;
      thirdWall[i][j].visible = true;
    }
  }

  for(let j=0; j<3; j++){
    auxThirdWall[j].live = true;
    auxThirdWall[j].visible = true;
  }
}

function toggleFullScreen(){
  if(!document.fullscreenElement)
    document.documentElement.requestFullscreen();
  else if(document.exitFullscreen)
    document.exitFullscreen();
}

function clearScreen(){
  // Cleaning first level screen
  if(level == 1){
    for(let i=0; i<wallLines; i++)
      for(let j=0; j<wallColumns; j++){
        scene.remove(wall[i][j]);
        wall[i][j] = null;
      }
  }

  // Cleaning second level screen
  if(level == 2){
    for(let i=0; i<secondWallLines; i++)
      for(let j=0; j<secondWallColumns; j++){
        scene.remove(secondWall[i][j]);
        secondWall[i][j] = null;
      }
  }

  // Cleaning third level screen
  if(level == 3){
    for(let i=0; i<11; i++)
      for(let j=0; j<6; j++){
        scene.remove(thirdWall[i][j]);
        thirdWall[i][j] = null;
      }

    for(let j=0; j<3; j++){
      scene.remove(auxThirdWall[j]);
      auxThirdWall[j] = null;
    }
  }

  scene.remove(gameBall);
  gameBall = undefined;

  gameBall = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), material);
  gameBall.bb = new THREE.Box3();
  gameBall.visible = true;
  gameBall.castShadow = true;
  gameBall.speed = 0.4;

  gameBall.position.copy(rebatedor.position.clone());
  gameBall.position.z -= 7.5;

  scene.add(gameBall);
}


function startLevel(restart){
  if(level == 1){
    setupFirstLevel();
    startFirstLevel();
  }

  if(level == 2){
    setupSecondLevel();
    startSecondLevel();
  }

  if(level == 3){
    setupThirdLevel();
    startThirdLevel();
  }
}

function changeLevel(){
  if(level == 1)
    return level = 2;

  if(level == 2)
    return level = 3;

  if(level == 3)
    return level = 1;
}

function startGame(restart){
  clearScreen();

  lastSecond = 0;
  updateSpeed = true;
  clock.start();
  counter = 0;

  if(!restart)
    changeLevel();

  startLevel(restart);
}

// Implementing second level
let secondWall = [];
let secondWallLines = 14;
let secondWallColumns = 8;

function setupSecondLevel(){
  let geometry, edges, wallMaterial;
  let wallStartZ = -planeHeight/2 + 8;

  for(let i=0; i<secondWallLines; i++){
    secondWall.push([]);
    for(let j=0; j<secondWallColumns; j++)
      secondWall[i].push(null);
  }

  for(let i=0; i<secondWallLines; i++){
    let wallStartX = -planeWidth/2 + 11;

    for(let j=0; j<secondWallColumns; j++){
      let wallColor = wallColors[Math.floor(Math.random() * 6)];

      wallMaterial = new THREE.MeshLambertMaterial({color:wallColor});
      secondWall[i][j] = createRoundedRectShape(wallMaterial);
      secondWall[i][j].castShadow = true;

      // Two life wall
      if(wallColor == "grey"){
        secondWall[i][j].twoLife = true;
        secondWall[i][j].hitted = false;

        secondWall[i][j].material = new THREE.MeshLambertMaterial();;
        secondWall[i][j].material.map = cement;
      }
      else
        secondWall[i][j].twoLife = false;

      // Positioning
      secondWall[i][j].position.x = wallStartX;
      secondWall[i][j].position.z = wallStartZ;
      secondWall[i][j].position.y = -3;

      secondWall[i][j].bb = new THREE.Box3();
      secondWall[i][j].helper = new THREE.Box3Helper(secondWall[i][j].bb, 'white');
      secondWall[i][j].bb.setFromObject(secondWall[i][j]);

      scene.add(secondWall[i][j]);

      if(j == 3)
        wallStartX = wallStartX + (3*wallSegmentSize);
      else
        wallStartX = wallStartX + wallSegmentSize;
    }

    wallStartZ = wallStartZ + wallSegmentSize;
  }

}

// Implementing third wall
let thirdWall = []
let auxThirdWall = []

function setupThirdLevel(){
  let wallMaterial;

  let startX = -20.5
  let startZ = -45;
  let immortalBlock = false;

  for(let i=0; i<11; i++){
    thirdWall.push([]);
    for(let j=0; j<6; j++)
      thirdWall[i].push(null);
  }

  for(let i=0; i<11; i++){
    for(let j=0; j<6; j++){
      if((i == 9 && j == 0) || (i == 9 && j == 5)){
        wallMaterial = new THREE.MeshLambertMaterial({color:'pink'});
        immortalBlock = false;
      }
      // Manual setuping immortal blocks
      else if((j > 0 && j < 5) && (i == 3 || i == 9)){
        wallMaterial = new THREE.MeshLambertMaterial({color:'yellow'});
        immortalBlock = true;
      }
      else{
        wallMaterial = new THREE.MeshLambertMaterial({color:'red'});
        immortalBlock = false;
      }

      thirdWall[i][j] = createRoundedRectShape(wallMaterial);
      thirdWall[i][j].immortal = immortalBlock;
      thirdWall[i][j].castShadow = true;

      thirdWall[i][j].position.x = startX;
      thirdWall[i][j].position.y = -3;
      thirdWall[i][j].position.z = startZ;

      thirdWall[i][j].bb = new THREE.Box3();
      thirdWall[i][j].helper = new THREE.Box3Helper(thirdWall[i][j].bb, 'white');
      thirdWall[i][j].bb.setFromObject(thirdWall[i][j]);

      scene.add(thirdWall[i][j]);

      startX += wallSegmentSize * 2;
    }

    startZ += wallSegmentSize;
    startX = -20.5;
  }

  for(let tmp=0; tmp<3; tmp++){
    auxThirdWall.push(null);
  }

  startX = -8.5;

  for(let j=0; j<3; j++){
    wallMaterial = new THREE.MeshLambertMaterial({color:'pink'});
    auxThirdWall[j] = createRoundedRectShape(wallMaterial);
    auxThirdWall[j].immortal = true;
    auxThirdWall[j].castShadow = true;

    auxThirdWall[j].position.x = startX;
    auxThirdWall[j].position.y = -3;
    auxThirdWall[j].position.z = -33;

    auxThirdWall[j].bb = new THREE.Box3();
    auxThirdWall[j].helper = new THREE.Box3Helper(auxThirdWall[j].bb, 'white');
    auxThirdWall[j].bb.setFromObject(auxThirdWall[j]);

    scene.add(auxThirdWall[j]);

    startX += wallSegmentSize * 2;
  }
}

let textMesh, textMaterial, textGeometry;
let firstBallSpeedString = "";

function drawSpeed(){
  firstBallSpeedString = "Ball speed: ";

  if(gameBall)
    firstBallSpeedString += gameBall.speed.toFixed(2);

  // Load a custom font
  var fontLoader = new FontLoader();
  fontLoader.load('../assets/fonts/helvetiker_regular.typeface.json', function(font) {
    // Create a text geometry using the loaded font
    loadedFont = font;
    textGeometry = new TextGeometry(firstBallSpeedString, {
        font: font,
        size: 1,
        height: 0.1
    });

    // Create a basic material for the text
    textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Create a mesh with the text geometry and material
    textMesh = new THREE.Mesh(textGeometry, textMaterial);

    // Set the position of the text mesh
    textMesh.position.set(15, 10, 58);
    textMesh.rotation.x = -Math.PI / 2;

    // Add the text mesh to the scene
    scene.add(textMesh);
  });
}

var loadedFont;

function updateText(){
  firstBallSpeedString = "Ball speed: ";

  if(gameBall)
    firstBallSpeedString += gameBall.speed.toFixed(2);

  if(textMesh){
    // Dispose of the old geometry to release memory
    textMesh.geometry.dispose();
    
    textMesh.geometry = new TextGeometry(firstBallSpeedString, {
        font: loadedFont,
        size: 1,
        height: 0.1
    });
  }
}

// Implementing clock
var clock = new THREE.Clock();
var lastSecond = 0;
var updateSpeed = false;

function increaseBallSpeed(){
  if(!updateSpeed)
    return;

  if(isPaused)
    return;

  if(!isPlaying)
    return;

  let currentSecond = Math.floor(clock.getElapsedTime());

  if(currentSecond != lastSecond && currentSecond <= 15){
    if(gameBall)
      gameBall.speed = gameBall.speed + speedIncrease;

    updateText();
  }
  else if(currentSecond > 15){
    clock.stop();
    updateSpeed = false;
  }

  lastSecond = currentSecond;
}

/*
let auxSphereGeometry = new THREE.SphereGeometry(4, 4, 4);
let auxSphere = new THREE.Mesh(auxSphereGeometry, new THREE.MeshLambertMaterial({color: 0xffff00}));
auxSphere.position.set(0, 0, 0);
auxSphere.geometry.scale(2, 1, 1);
auxSphere.position.z = 39.5;
auxSphere.bb = new THREE.Box3().setFromObject(auxSphere);
console.log(auxSphere)
console.log(auxSphere.bb)
scene.add(auxSphere);
*/

// Implementing lifes
let lifes = 5;
let lifesArray = [];
setupGameLifes();

function isBallDead(currBall){
  if(currBall.position.z > 65)
    return true;
}

function setupGameLifes(){
  let posX = 38;

  for(let i=0; i<lifes; i++){
    lifesArray.push(new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 16),
                                   new THREE.MeshLambertMaterial({color:'lightgreen'})));
    lifesArray[i].position.x = posX;
    lifesArray[i].position.z = -50;
    scene.add(lifesArray[i]);
    posX = posX + 3;
  }
}

function reviveBall(){
  gameBall.position.copy(rebatedor.position.clone());
  gameBall.position.z -= 8;
  isPlaying = false;
  gameBall.speed = 0.4;
  updateText();

  lastSecond = 0;
  updateSpeed = true;
  clock.start();
}

function playSound(sound){
  sound.stop();
  sound.offset = 0;
  sound.play();
}

// Implementing mobile
let transparentObj = []
transparentObj.push(new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), new THREE.MeshPhongMaterial({color: 'white', transparent: true, opacity: 0.4})));
transparentObj[0].position.set(0, 0, 0);
console.log("AA: ", transparentObj[0]);
scene.add(transparentObj[0]);

let dragControl = new DragControls(transparentObj, camera, renderer.domElement);

dragControl.addEventListener('dragstart', function (event) {
  event.object.material.emissive.set(0x333333);
});

dragControl.addEventListener('dragend', function (event) {
  event.object.material.emissive.set(0x000000);
});

dragControl.activate();

drawSpeed();
startFirstLevel();
render();

function render()
{
  if(isBallDead(gameBall)){
    lifes = lifes - 1;
    if(lifes > 0){
      reviveBall();
      lifesArray[lifes].visible = false;
    }
    else{
      // endGameScreen();
      lifesArray[lifes].visible = false;
      isPlaying = false;
      gameBall.speed = 0.4;
      updateText();
      startGame(true);
    }
  }

  if(endGame())
    startGame(false);

  if(isPlaying || !isPaused){
    if(gameBall)
      updateGameBall(gameBall);
  }

  increaseBallSpeed();

  keyboardUpdate();
  updateRebatedorCoordinates();
  rebatedor.bb.setFromObject(rebatedor);
  requestAnimationFrame(render);
  renderer.render(scene, camera);
}
