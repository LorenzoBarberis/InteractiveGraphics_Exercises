import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import GUI from 'lil-gui';
import { simFragmentShader, renderFragmentShader, vertexShader } from './shaders.js';

// Carica le texture JPG/PNG normalmente
const loader = new THREE.TextureLoader();
const diffTexture = loader.load('src/Texture/Background_diff.jpg');
const dispTexture = loader.load('src/Texture/Background_disp.png');

// Carica le texture EXR con EXRLoader
const exrLoader = new EXRLoader();
let normalTexture = null;
let roughTexture = null;

// Carica prima la roughness, poi la normal, poi crea la scena
exrLoader.load('src/Texture/Background_rough.exr', (rough) => {
    roughTexture = rough;
    roughTexture.wrapS = roughTexture.wrapT = THREE.RepeatWrapping;
    exrLoader.load('src/Texture/Background_nor.exr', (nor) => {
        normalTexture = nor;
        normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping;
        createScene();
    });
});

let simRT_A, simRT_B, simScene, simCamera, renderMaterial;
let mouse = { x: 0, y: 0, down: false };

function createScene() {
    const scene = new THREE.Scene();

    // --- SIMULAZIONE: PREPARA RENDER TARGETS ---
    const res = 256;
    simRT_A = new THREE.WebGLRenderTarget(res, res, { type: THREE.FloatType });
    simRT_B = new THREE.WebGLRenderTarget(res, res, { type: THREE.FloatType });

    // --- SIMULAZIONE: SCENA E CAMERA ORTOGONALE ---
    simScene = new THREE.Scene();
    simCamera = new THREE.OrthographicCamera(0, res, 0, res, -1, 1);
    const simQuad = new THREE.Mesh(
        new THREE.PlaneGeometry(res, res),
        new THREE.ShaderMaterial({
            uniforms: {
                iChannel0: { value: simRT_A.texture },
                iResolution: { value: new THREE.Vector2(res, res) },
                iMouse: { value: new THREE.Vector4() },
                iFrame: { value: 0 }
            },
            fragmentShader: simFragmentShader,
            vertexShader: `
                void main() {
                    gl_Position = vec4(position, 1.0);
                }
            `
        })
    );
    simScene.add(simQuad);

    // --- MATERIALE DI RENDERING ---
    renderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            iChannel0: { value: simRT_B.texture },
            iResolution: { value: new THREE.Vector2(res, res) }
        },
        vertexShader,
        fragmentShader: renderFragmentShader,
        transparent: true
    });

    // --- PIANO FONDALE ---
    const groundGeometry = new THREE.PlaneGeometry(20, 20, 1, 1);
    const groundMaterial = new THREE.MeshStandardMaterial({
        map: diffTexture,
        roughnessMap: roughTexture,
        normalMap: normalTexture,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.z = -0.01; // leggermente sotto il piano acqua
    scene.add(ground);

    // --- PIANO ACQUA ---
    const geometry = new THREE.PlaneGeometry(20, 20, 1, 1);
    const plane = new THREE.Mesh(geometry, renderMaterial);
    scene.add(plane);

    // Crea la camera
    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('zen-pond').appendChild(renderer.domElement);

    // Solo Spotlight regolabile
    const spotLight = new THREE.SpotLight(0xffffff, 1.5);
    spotLight.position.set(0, 0, 5);
    spotLight.target.position.set(0, 0, 0);
    scene.add(spotLight);
    scene.add(spotLight.target);

    // GUI per la spotlight
    const gui = new GUI();
    const spotFolder = gui.addFolder('SpotLight');
    spotFolder.add(spotLight.position, 'x', -10, 10, 0.01).name('Position X');
    spotFolder.add(spotLight.position, 'y', -10, 10, 0.01).name('Position Y');
    spotFolder.add(spotLight.position, 'z', -10, 10, 0.01).name('Position Z');
    spotFolder.add(spotLight, 'intensity', 0, 30, 0.01).name('Intensity');
    spotFolder.add(spotLight, 'angle', 0, Math.PI / 2, 0.01).name('Angle');
    spotFolder.add(spotLight, 'penumbra', 0, 1, 0.01).name('Penumbra');
    spotFolder.addColor(spotLight, 'color').name('Color');
    spotFolder.open();

    // --- MOUSE EVENTS ---
    renderer.domElement.addEventListener('pointermove', (e) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = (e.clientX - rect.left) / rect.width;
        mouse.y = (e.clientY - rect.top) / rect.height;
    });
    renderer.domElement.addEventListener('pointerdown', () => mouse.down = true);
    renderer.domElement.addEventListener('pointerup', () => mouse.down = false);

    // Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // --- ANIMATE LOOP ---
    let frame = 0;
    function animate() {
        // Aggiorna uniformi simulazione
        simQuad.material.uniforms.iChannel0.value = simRT_A.texture;
        simQuad.material.uniforms.iMouse.value.set(mouse.x, mouse.y, mouse.down ? 1 : 0, 0);
        simQuad.material.uniforms.iFrame.value = frame++;

        // Simula acqua (ping-pong)
        renderer.setRenderTarget(simRT_B);
        renderer.render(simScene, simCamera);
        renderer.setRenderTarget(null);

        // Aggiorna texture per rendering
        renderMaterial.uniforms.iChannel0.value = simRT_B.texture;

        // Scambia i render target
        [simRT_A, simRT_B] = [simRT_B, simRT_A];

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }
    animate();
}