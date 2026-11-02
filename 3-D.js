
/* =================================================
   MINI BLENDER – 3-D.JS
   3D VIEWPORT ENGINE
   ================================================= */

window.scene = null;
window.camera = null;
window.renderer = null;
window.controls = null;

window.raycaster = new THREE.Raycaster();
window.mouse = new THREE.Vector2();

window.selectedObject = null;

window.viewportEngine = {

    canvas: null,
    container: null,

    pointerDown: false,
    lastPointer: null,

    selectionHelper: null,
    transformControls: null,

    sculpting: false,
    painting: false,

    // =============================================
    // INITIALISIERUNG
    // =============================================

    init(containerId = "viewport") {

        this.container = document.getElementById(containerId);

        if (!this.container) {
            console.error("Viewport nicht gefunden!");
            return;
        }

        // Szene
        window.scene = new THREE.Scene();

        scene.background = new THREE.Color(0x25272c);

        // Kamera
        window.camera = new THREE.PerspectiveCamera(
            50,
            this.container.clientWidth /
            this.container.clientHeight,
            0.01,
            1000
        );

        camera.position.set(5, 4, 7);
        camera.lookAt(0, 0, 0);

        // Renderer
        window.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance"
        });

        renderer.setPixelRatio(
            Math.min(window.devicePixelRatio, 2)
        );

        renderer.setSize(
            this.container.clientWidth,
            this.container.clientHeight
        );

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1;

        this.canvas = renderer.domElement;

        this.container.appendChild(this.canvas);

        // =========================================
        // LICHT
        // =========================================

        const ambient = new THREE.HemisphereLight(
            0xffffff,
            0x444455,
            2
        );

        scene.add(ambient);

        const sunlight = new THREE.DirectionalLight(
            0xffffff,
            3
        );

        sunlight.position.set(5, 10, 5);
        sunlight.castShadow = true;

        sunlight.shadow.mapSize.set(2048, 2048);

        scene.add(sunlight);

        // =========================================
        // GITTER
        // =========================================

        const grid = new THREE.GridHelper(
            100,
            100,
            0x777777,
            0x444444
        );

        scene.add(grid);

        // Achsen
        const axes = new THREE.AxesHelper(2);

        scene.add(axes);

        // =========================================
        // BODEN
        // =========================================

        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(200, 200),
            new THREE.MeshStandardMaterial({
                color: 0x303238,
                roughness: 0.9
            })
        );

        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.01;
        ground.receiveShadow = true;
        ground.name = "Boden";

        scene.add(ground);

        // =========================================
        // STEUERUNG
        // =========================================

        if (THREE.OrbitControls) {

            window.controls = new THREE.OrbitControls(
                camera,
                renderer.domElement
            );

        }

        // =========================================
        // EVENT LISTENER
        // =========================================

        this.canvas.addEventListener(
            "pointerdown",
            event => this.onPointerDown(event)
        );

        this.canvas.addEventListener(
            "pointermove",
            event => this.onPointerMove(event)
        );

        this.canvas.addEventListener(
            "pointerup",
            event => this.onPointerUp(event)
        );

        this.canvas.addEventListener(
            "contextmenu",
            event => event.preventDefault()
        );

        window.addEventListener(
            "resize",
            () => this.resize()
        );

        // Animation starten
        this.animate();

        console.log("Mini Blender 3D Engine gestartet!");
    },

    // =============================================
    // MAUSPOSITION
    // =============================================

    updateMouse(event) {

        const rect = this.canvas.getBoundingClientRect();

        mouse.x =
            ((event.clientX - rect.left) / rect.width) * 2 - 1;

        mouse.y =
            -((event.clientY - rect.top) / rect.height) * 2 + 1;
    },

    // =============================================
    // RAYCASTING
    // =============================================

    raycast(event, objects = null) {

        this.updateMouse(event);

        raycaster.setFromCamera(mouse, camera);

        const targets = objects || scene.children.filter(
            object => object.isMesh &&
            object.userData.isModelObject
        );

        return raycaster.intersectObjects(targets, true);
    },

    // =============================================
    // OBJEKT AUSWÄHLEN
    // =============================================

    selectObject(object) {

        if (!object) return;

        // Unterobjekt bis zum Modell finden
        let target = object;

        while (
            target.parent &&
            target.parent !== scene &&
            !target.userData.isModelObject
        ) {
            target = target.parent;
        }

        if (!target.userData.isModelObject) return;

        window.selectedObject = target;

        if (window.modelTools) {
            modelTools.select(target);
        }

        this.updateSelectionHelper();

        return target;
    },

    // =============================================
    // AUSWAHLUMRANDUNG
    // =============================================

    updateSelectionHelper() {

        if (this.selectionHelper) {

            scene.remove(this.selectionHelper);

            this.selectionHelper.geometry.dispose();
            this.selectionHelper.material.dispose();

            this.selectionHelper = null;
        }

        if (!selectedObject) return;

        this.selectionHelper = new THREE.BoxHelper(
            selectedObject,
            0xffa23a
        );

        scene.add(this.selectionHelper);
    },

    // =============================================
    // OBJEKT ANKLICKEN
    // =============================================

    onPointerDown(event) {

        if (event.button !== 0) return;

        this.pointerDown = true;

        this.lastPointer = {
            x: event.clientX,
            y: event.clientY
        };

        if (this.sculpting || this.painting) {

            this.processBrush(event);

            return;
        }

        const hits = this.raycast(event);

        if (hits.length > 0) {

            this.selectObject(hits[0].object);

        } else {

            window.selectedObject = null;

            if (window.modelTools) {
                modelTools.selectedObject = null;
            }

            this.updateSelectionHelper();
        }
    },

    // =============================================
    // MAUS BEWEGEN
    // =============================================

    onPointerMove(event) {

        if (!this.pointerDown) return;

        if (this.sculpting || this.painting) {

            this.processBrush(event);

        }
    },

    onPointerUp(event) {

        this.pointerDown = false;
        this.lastPointer = null;
    },

    // =============================================
    // SCULPTING UND MALEN
    // =============================================

    processBrush(event) {

        const hits = this.raycast(event);

        if (!hits.length) return;

        const hit = hits[0];

        const object = hit.object;

        if (!object.isMesh) return;

        if (this.painting && window.paintTools) {

            if (!paintTools.enabled) return;

            if (paintTools.selectedObject !== object) {
                paintTools.selectObject(object);
            }

            if (hit.uv) {
                paintTools.paintAt(
                    hit.uv.x,
                    hit.uv.y
                );
            }
        }

        if (this.sculpting && window.sculptTools) {

            if (!sculptTools.enabled) return;

            const localPoint = object.worldToLocal(
                hit.point.clone()
            );

            const localNormal = hit.face.normal.clone();

            const normalMatrix = new THREE.Matrix3()
                .getNormalMatrix(object.matrixWorld);

            const worldNormal = hit.face.normal.clone()
                .applyNormalMatrix(normalMatrix);

            const normal = object.worldToLocal(
                hit.point.clone().add(worldNormal)
            ).sub(localPoint).normalize();

            if (sculptTools.brush === "SMOOTH") {

                sculptTools.smoothAt(
                    localPoint,
                    object.geometry
                );

            } else {

                sculptTools.sculptAt(
                    localPoint,
                    normal,
                    object.geometry
                );
            }
        }

        if (this.selectionHelper) {
            this.selectionHelper.update();
        }
    },

    // =============================================
    // MODI
    // =============================================

    setSculptMode(enabled) {

        this.sculpting = enabled;
        this.painting = false;

        if (window.sculptTools) {

            if (enabled) sculptTools.enable();
            else sculptTools.disable();
        }

        if (window.paintTools) {
            paintTools.disable();
        }
    },

    setPaintMode(enabled) {

        this.painting = enabled;
        this.sculpting = false;

        if (window.paintTools) {

            if (enabled) paintTools.enable();
            else paintTools.disable();
        }

        if (window.sculptTools) {
            sculptTools.disable();
        }
    },

    setObjectMode() {

        this.painting = false;
        this.sculpting = false;

        if (window.paintTools) paintTools.disable();
        if (window.sculptTools) sculptTools.disable();
    },

    // =============================================
    // KAMERA
    // =============================================

    focusSelected() {

        if (!selectedObject) return;

        const box = new THREE.Box3()
            .setFromObject(selectedObject);

        const center = box.getCenter(new THREE.Vector3());

        const size = box.getSize(new THREE.Vector3());

        const maxSize = Math.max(
            size.x,
            size.y,
            size.z
        );

        camera.position.copy(center).add(
            new THREE.Vector3(
                maxSize * 2,
                maxSize * 1.5,
                maxSize * 2
            )
        );

        camera.lookAt(center);

        if (controls) {
            controls.target.copy(center);
            controls.update();
        }
    },

    // =============================================
    // ANIMATION
    // =============================================

    animate() {

        requestAnimationFrame(
            () => this.animate()
        );

        if (this.selectionHelper) {
            this.selectionHelper.update();
        }

        if (controls) {
            controls.update();
        }

        renderer.render(scene, camera);
    },

    // =============================================
    // RESIZE
    // =============================================

    resize() {

        if (!this.container) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        if (!width || !height) return;

        camera.aspect = width / height;

        camera.updateProjectionMatrix();

        renderer.setSize(width, height);
    }
};

// =============================================
// GLOBALE FUNKTIONEN
// =============================================

function start3D() {
    viewportEngine.init("viewport");
}

function selectObject3D(object) {
    viewportEngine.selectObject(object);
}

function enableSculptMode() {
    viewportEngine.setSculptMode(true);
}

function enablePaintMode() {
    viewportEngine.setPaintMode(true);
}

function enableObjectMode() {
    viewportEngine.setObjectMode();
}

function focusSelectedObject() {
    viewportEngine.focusSelected();
}

// =============================================
// ENDE 3-D.JS
// =============================================
