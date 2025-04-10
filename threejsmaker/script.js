import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Welcome Popup logic
window.addEventListener('load', () => {
  const popup = document.getElementById('welcomePopup');
  const gotItBtn = document.getElementById('gotItBtn');
  const closePopup = document.getElementById('closePopup');

  popup.style.display = 'flex';
  gotItBtn.addEventListener('click', () => popup.style.display = 'none');
  closePopup.addEventListener('click', () => popup.style.display = 'none');
});

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 1.5, 0);

const canvas = document.querySelector('.webgl');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(0, 20, 0);
light.target.position.set(0, 0, 0);
scene.add(light, light.target);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Grid & ground
const grid = new THREE.GridHelper(30, 30);
scene.add(grid);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Variables
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const shapeSelector = document.getElementById('shapeSelector');
const codeInput = document.getElementById('codeInput');
let placingMode = false;
let previewMesh = null;
let selectedMesh = null;
let dragging = false;
const allUserCodes = [];

const previewMaterial = new THREE.MeshStandardMaterial({ color: 0x8888ff, opacity: 0.5, transparent: true });

// Add Shape button
document.getElementById('addBoxBtn').addEventListener('click', () => {
  placingMode = true;
  document.body.style.cursor = 'crosshair';
});

// Place shape
window.addEventListener('click', (event) => {
  if (!placingMode) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(ground);
  if (intersects.length === 0) return;

  const point = intersects[0].point;
  const snappedX = Math.round(point.x);
  const snappedZ = Math.round(point.z);

  let geometry, geometryCode;
  switch (shapeSelector.value) {
    case 'box':
      geometry = new THREE.BoxGeometry(1, 1, 1);
      geometryCode = 'new THREE.BoxGeometry(1, 1, 1)';
      break;
    case 'sphere':
      geometry = new THREE.SphereGeometry(0.5, 32, 32);
      geometryCode = 'new THREE.SphereGeometry(0.5, 32, 32)';
      break;
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
      geometryCode = 'new THREE.CylinderGeometry(0.5, 0.5, 1, 32)';
      break;
    case 'torusknot':
      geometry = new THREE.TorusKnotGeometry(0.4, 0.15, 100, 16);
      geometryCode = 'new THREE.TorusKnotGeometry(0.4, 0.15, 100, 16)';
      break;
  }

  const material = new THREE.MeshStandardMaterial({ color: 0xff88aa });
  const mesh = new THREE.Mesh(geometry, material);
  const y = shapeSelector.value === 'torusknot' ? 1 : 0.5;
  mesh.position.set(snappedX, y, snappedZ);
  scene.add(mesh);
  selectedMesh = mesh;

  const meshId = `mesh${allUserCodes.length + 1}`; // mesh1, mesh2, ...
  const shapeCode = `const ${meshId} = new THREE.Mesh(
    ${geometryCode},
    new THREE.MeshStandardMaterial({ color: 0xff88aa })
  );
  ${meshId}.position.set(${snappedX}, ${y}, ${snappedZ});
  ${meshId}.scale.set(1, 1, 1);
  scene.add(${meshId});`;
  

  codeInput.value = shapeCode;
  allUserCodes.push(shapeCode);

  placingMode = false;
  document.body.style.cursor = 'default';
});

// Preview shape while placing
window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  if (!placingMode) {
    if (previewMesh) {
      scene.remove(previewMesh);
      previewMesh = null;
    }
    return;
  }

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(ground);
  if (intersects.length === 0) return;

  const point = intersects[0].point;
  const snappedX = Math.round(point.x);
  const snappedZ = Math.round(point.z);

  if (previewMesh) scene.remove(previewMesh);

  let geometry;
  switch (shapeSelector.value) {
    case 'box':
      geometry = new THREE.BoxGeometry(1, 1, 1); break;
    case 'sphere':
      geometry = new THREE.SphereGeometry(0.5, 32, 32); break;
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32); break;
    case 'torusknot':
      geometry = new THREE.TorusKnotGeometry(0.4, 0.15, 100, 16); break;
  }

  previewMesh = new THREE.Mesh(geometry, previewMaterial);
  const y = shapeSelector.value === 'torusknot' ? 1 : 0.5;
  previewMesh.position.set(snappedX, y, snappedZ);
  scene.add(previewMesh);
});

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animate loop
function animate() {
  requestAnimationFrame(animate);
  handleDragMove();
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Select & drag object
window.addEventListener('mousedown', (event) => {
  if (placingMode) return;
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(scene.children.filter(obj => obj.isMesh && obj !== ground && obj !== previewMesh));
  if (intersects.length > 0) {
    selectedMesh = intersects[0].object;
    dragging = true;
    document.body.style.cursor = 'grabbing';
  }
});

window.addEventListener('mouseup', () => {
  if (dragging) {
    dragging = false;
    document.body.style.cursor = 'default';
  }
});

function handleDragMove() {
  if (!dragging || !selectedMesh) return;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(ground);
  if (intersects.length > 0) {
    const point = intersects[0].point;
    const snappedX = Math.round(point.x);
    const snappedZ = Math.round(point.z);
    selectedMesh.position.set(snappedX, selectedMesh.position.y, snappedZ);
  }
}

// Delete object
window.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(scene.children.filter(obj => obj.isMesh && obj !== ground && obj !== previewMesh));
  if (intersects.length > 0) {
    const meshToRemove = intersects[0].object;
    scene.remove(meshToRemove);
    if (meshToRemove === selectedMesh) selectedMesh = null;
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Delete' && selectedMesh) {
    scene.remove(selectedMesh);
    selectedMesh = null;
  }
});

// Run Code
document.getElementById('runCodeBtn').addEventListener('click', () => {
  if (selectedMesh) {
    try {
      const rawCode = codeInput.value.replace(/\bconst\b/g, 'let');
      new Function('THREE', 'mesh', `(() => { ${rawCode} })();`)(THREE, selectedMesh);
    } catch (err) {
      alert('🚨 Error: ' + err.message);
    }
  } else {
    alert('⚠️ Select a shape first!');
  }
});

// Help Popup
const helpPopup = document.getElementById('helpPopup');
document.getElementById('helpBtn').addEventListener('click', () => helpPopup.style.display = 'flex');
document.getElementById('closeHelp').addEventListener('click', () => helpPopup.style.display = 'none');
window.addEventListener('click', (e) => {
  if (e.target === helpPopup) helpPopup.style.display = 'none';
});

// Download Code
document.getElementById('downloadBtn').addEventListener('click', () => {
  const userCode = allUserCodes.join('\n\n');
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><title>3D Scene</title>
<style>body{margin:0;overflow:hidden;background:#fff}canvas{display:block}</style>
</head><body><script type="module">
import * as THREE from 'https://cdn.skypack.dev/three@0.152.2';
import { OrbitControls } from 'https://unpkg.com/three@0.152.2/examples/jsm/controls/OrbitControls.js?module';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(3,2,5);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.DirectionalLight(0xffffff, 1).position.set(0,10,0));
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// Your shapes:
${userCode}

function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}
animate();
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
</script></body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'my3DScene.html';
  a.click();
});
