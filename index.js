import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

let earth_tex = require('./textures/earth2kcolour.jpg');
let skybox = require('./textures/unified_skybox/skybox.png');
let urls = [ earth_tex ];
let skybox_urls = [ skybox, skybox, skybox, skybox, skybox, skybox ];
let camera, scene, renderer, controls;
let mesh;
let currentlyIntersected = false;
let finishedFading = true;
const intersectingQueue = [];
let loadedTexture;
let imagedata;
const clock = new THREE.Clock();
const mouse = new THREE.Vector2(1,1);
const raycaster = new THREE.Raycaster();
let numberOfTrees = 0;

const facts = [
    'Trees absorb CO2, removing and storing the carbon while releasing the oxygen back into the air',
    'Trees provide vital wildlife habitat',
    'One large tree can provide a day\'s supply of oxygen for up to four people',
    'Global forests removed about one-third of fossil fuel emissions annually from 1990 to 2007',
    'Trees remove pollution from the atmosphere, improving air quality and human health',
    'In Chicago, trees remove more than 18,000 tons of air pollution each year',
    'More than 20% of the world’s oxygen is produced in the Amazon Rainforest',
    'A mature tree absorbs carbon dioxide at a rate of 48 pounds per year',
    'Trees properly placed around buildings can reduce air conditioning needs by 30 percent',
    'Trees reduce annual heating and cooling costs for a typical residence by 8 to 12 percent',
    'The planting of trees improves water quality',
    'Trees provide food for birds and wildlife.',
    'Trees create shade and therefore help to keep an area cool',
    'Trees can also reduce other air pollutants such as nitrogen dioxide (NO2)'
]

loadTexture(urls[0]).then(texture => {
    loadedTexture = texture;
    init();
    animate();
});

function getImageData(image) {
    var canvas = document.createElement( 'canvas' );
    canvas.width = image.width;
    canvas.height = image.height;
    var context = canvas.getContext( '2d' );
    context.drawImage( image, 0, 0 );
    return context.getImageData( 0, 0, image.width, image.height );
}

function loadTexture(url) {
    return new Promise(resolve => {
        new THREE.TextureLoader().load(url, resolve)
    })
}

function fade(element) {
    if (element === null) {
        return;
    }
    var op = 1;  // initial opacity
    var timer = setInterval(function () {
        if (op <= 0.1){
            clearInterval(timer);
            element.style.display = 'none';
        }
        element.style.opacity = op;
        element.style.filter = 'alpha(opacity=' + op * 100 + ")";
        op -= op * 0.1;
    }, 10);
}

function makeFacts(text) {
    let alternativeFacts = document.getElementsByClassName('container');
    if (alternativeFacts.length > 0 && finishedFading) {
        for (var i = 0; i < alternativeFacts.length; i++) {
            document.getElementById(alternativeFacts[i].id).remove();
        }
        finishedFading = false;
    }
    let container = document.createElement('div');
    const containerId = 'container' + Math.random();
    container.className = 'container';
    container.id = containerId;
    let facts = document.createElement('div');
    facts.className = 'facts';
    const currentId = 'facts' + Math.random();
    facts.id = currentId;
    facts.innerHTML = '<h3>' + text + '</h3>';
    facts.style.display = 'body';
    container.style.top = Math.random() * (window.innerHeight  * 0.5) + 'px';
    container.style.left = Math.random() * (window.innerWidth * 0.5) + 'px';
    container.appendChild(facts);
    document.body.appendChild(container);
    setTimeout(() => {
        fade(document.getElementById(containerId));
        finishedFading = true;
    }, 5000);
}

function makeGui() {
    let title = document.createElement('div');
    title.className = 'info';
    title.id = 'info';
    title.innerHTML = '<h1>Our Earth</h1> <h2>Click the land to plant trees</h2>';

    document.body.appendChild(title);
    // Tree count
    let treecount = document.createElement('div');
    treecount.className = 'tree-count';
    treecount.id = 'tree-count';
    treecount.innerHTML = '<h1>Trees Planted: ' + numberOfTrees + '</h1>';
    document.body.appendChild(treecount);

}

function updateTreeCount() {
    let treecount = document.getElementById('tree-count');
    treecount.innerHTML = '<h1>Trees Planted: ' + numberOfTrees + '</h1>';
}


var Tree = function() {
    this.mesh = new THREE.Object3D();
    this.mesh.name = "tree";
    // tronc
    const geomTronc = new THREE.BoxGeometry(0.020, 0.02, 0.020);
    geomTronc.scale(0.8, 0.8, 1);
    const matTronc = new THREE.MeshBasicMaterial({color: "brown", wireframe: false});
    const tronc = new THREE.Mesh(geomTronc, matTronc);
    tronc.position.set(0,0,0);
    tronc.rotation.x = -Math.PI * 0.5;
    tronc.castShadow = true;
    tronc.receiveShadow = true;
    this.mesh.add(tronc);

    // arbre
    const geomArbre = new THREE.ConeGeometry(0.02, 0.02, 32);
    geomArbre.scale(1, 2, 1);
    const matArbre = new THREE.MeshBasicMaterial({color: "green", wireframe: false});
    const arbre = new THREE.Mesh(geomArbre, matArbre);
    arbre.position.set(0,.030,0);
    tronc.add(arbre);
}

var Plane = function() {
    this.mesh = new THREE.Object3D();
    this.mesh.name = "plane";

    const geomPlane = new THREE.BoxGeometry(0.020, 0.02, 0.050);
    const matPlane = new THREE.MeshBasicMaterial({color: "grey"});
    const planeBody = new THREE.Mesh(geomPlane, matPlane);

}

function init() {
    document.body.innerHTML = '';
    scene = new THREE.Scene();
    const cubeTextureLoader = new THREE.CubeTextureLoader();
    scene.background = cubeTextureLoader.load(skybox_urls);
    const width = 5;
    const height = width / (window.innerWidth / window.innerHeight);
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 2.5);

    const hemisphere = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(hemisphere);

    const directional = new THREE.DirectionalLight(0xffffff, 0.5);
    scene.add(directional)


    const texture = new THREE.TextureLoader()
    const uniforms = {
        tOne: {type: "t", value: texture.load(urls[0])},
    };
    const geometry = new THREE.SphereGeometry(1,32,24);
    const material = new THREE.MeshBasicMaterial( { map: uniforms.tOne.value, wireframe: false });
    mesh = new THREE.Mesh(geometry, material);
    
    scene.add(mesh);

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.listenToKeyEvents(window);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 5;
    controls.maxPolarAngle = Math.PI / 2;

    imagedata = getImageData(loadedTexture.image);
    // createTree();
    document.body.appendChild(renderer.domElement);
    makeGui();
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('mousedown', onMouseDown);
}

function animate() {
    requestAnimationFrame(animate);
    render();
}

function emod(n, m) {
    return ((n % m) + m) % m;
}

function render() {
    const dt = clock.getDelta();
    mesh.rotation.y += 0.4 * dt;
    raycaster.setFromCamera(mouse, camera);
    const intersection = raycaster.intersectObject(mesh);
    if (!currentlyIntersected && intersection.length > 0) {
        intersectingQueue.push(intersection);
        if (intersectingQueue.length > 0) {
            currentlyIntersected = true;
            let newTree = new Tree();
            newTree.mesh.position.copy(intersection[0].face.normal);
            newTree.mesh.lookAt(mesh.position);
            const ux = intersection[0].uv.x;
            const uy = intersection[0].uv.y;
            const tx = Math.min(emod(ux, 1) * imagedata.width | 0, imagedata.width - 1);
            let ty = Math.min(emod(uy, 1) * imagedata.height | 0, imagedata.height - 1);
            ty = imagedata.height - ty;
            const offset = (ty * imagedata.width + tx) * 4;
            const r = imagedata.data[offset]; // red
            const g = imagedata.data[offset + 1]; // green
            const b = imagedata.data[offset + 2]; // blue
            const a = imagedata.data[offset + 3]; // alpha
            if (g > 200 || b < 100) {
                mesh.add(newTree.mesh);
                numberOfTrees++;
                if (numberOfTrees > 0 && numberOfTrees % 3 === 0) {
                    makeFacts(facts[Math.floor(Math.random() * facts.length)]);
                }
                updateTreeCount();
            }
            intersectingQueue.pop();
        }
    }
    renderer.render(scene, camera);
}

function onMouseDown(event) {
    event.preventDefault();
    currentlyIntersected = false;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
