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
   let cubeMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshPhongMaterial({color: 'red'}))
   let sphereMesh = new THREE.Mesh( new THREE.SphereGeometry(1.45, 20, 20) )
   let cylinderMesh = new THREE.Mesh( new THREE.CylinderGeometry(0.85, 0.85, 2, 20), new THREE.MeshPhongMaterial({color: 'lightblue'}))
   let torusMesh = new THREE.Mesh( new THREE.TorusGeometry(0.8, 0.2, 20, 20))   

   // CSG holders
   let csgObject, cubeCSG, sphereCSG, cylinderCSG, torusCSG

   // Object 2 - Cube INTERSECT Cylinder
   cylinderMesh.position.set(1, -0.5, 0.0)
   updateObject(cylinderMesh)
   cylinderCSG = CSG.fromMesh(cylinderMesh)
   cubeCSG = CSG.fromMesh(cubeMesh)   
   csgObject = cubeCSG.intersect(cylinderCSG) // Execute intersection
   mesh2 = CSG.toMesh(csgObject, auxMat, [cubeMesh.material, cylinderMesh.material])
   updateObject(mesh2)
   mesh2.rotateX(THREE.MathUtils.degToRad(90))
   mesh2.rotateY(THREE.MathUtils.degToRad(-90))
   mesh2.position.set(0, 0, 0.9)
   scene.add(mesh2)
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