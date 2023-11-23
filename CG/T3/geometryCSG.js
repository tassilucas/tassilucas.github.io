import * as THREE from  'three';
import Stats from '../build/jsm/libs/stats.module.js';
import GUI from '../libs/util/dat.gui.module.js'
import {TrackballControls} from '../build/jsm/controls/TrackballControls.js';
import {initRenderer,
        initCamera, 
        initDefaultBasicLight,
        createGroundPlane,
        onWindowResize} from "../libs/util/util.js";

import { CSG } from '../libs/other/CSGMesh.js'        
import { CylinderGeometry } from '../build/three.module.js';

var scene = new THREE.Scene();    // Create main scene
var stats = new Stats();          // To show FPS information

var renderer = initRenderer();    // View function in util/utils
renderer.setClearColor("rgb(30, 30, 40)");
var camera = initCamera(new THREE.Vector3(4, -8, 8)); // Init camera in this position
   camera.up.set( 0, 0, 1 );

window.addEventListener( 'resize', function(){onWindowResize(camera, renderer)}, false );
initDefaultBasicLight(scene, true, new THREE.Vector3(12, -15, 20), 28, 1024) ;	

var groundPlane = createGroundPlane(20, 20); // width and height (x, y)
scene.add(groundPlane);

var trackballControls = new TrackballControls( camera, renderer.domElement );

// To be used in the interface
let mesh1, mesh2, mesh3;

buildInterface();
buildObjects();
render();

function buildObjects()
{
   let auxMat = new THREE.Matrix4();
   
   // Base objects
   let cubeMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2))
   let cylinderGeometry = new THREE.CylinderGeometry(1, 1, 2, 32, 25, false, 0, Math.PI)
   cylinderGeometry.scale(1, 1, 3)
   let cylinderMesh = new THREE.Mesh(cylinderGeometry);

   // CSG holders
   let csgObject, cubeCSG, sphereCSG

   cubeMesh.position.set(0, -1,5, 0)
   updateObject(cubeMesh)

   sphereCSG = CSG.fromMesh(cylinderMesh);
   cubeCSG = CSG.fromMesh(cubeMesh);
   csgObject = sphereCSG.subtract(cubeCSG);

   let finalMesh = CSG.toMesh(csgObject, auxMat)
   finalMesh.material = new THREE.MeshPhongMaterial({color: 'lightblue'})
   scene.add(finalMesh)

   let centerRef = new THREE.Mesh( new THREE.SphereGeometry(0.1, 32, 16));
   centerRef.position.copy(finalMesh.position)
   scene.add(centerRef)

   console.log(finalMesh.position)
   console.log(centerRef.position)
}

function updateObject(mesh)
{
   mesh.matrixAutoUpdate = false;
   mesh.updateMatrix();
}

function buildInterface()
{
  var controls = new function ()
  {
    this.wire = false;
    
    this.onWireframeMode = function(){
       mesh1.material.wireframe = this.wire;
       mesh2.material.wireframe = this.wire;       
       mesh3.material.wireframe = this.wire;              
    };
  };

  // GUI interface
  var gui = new GUI();
  gui.add(controls, 'wire', false)
    .name("Wireframe")
    .onChange(function(e) { controls.onWireframeMode() });
}

function render()
{
  stats.update(); // Update FPS
  trackballControls.update();
  requestAnimationFrame(render); // Show events
  renderer.render(scene, camera) // Render scene
}