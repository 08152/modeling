
/* ==========================================
   MINI BLENDER – SCULPTING SYSTEM PRO
   ========================================== */

window.sculptTools = {

    enabled: false,

    brush: "DRAW",

    settings: {
        radius: 0.35,
        strength: 0.35,
        spacing: 0.15,
        smoothStrength: 0.5,
        pressure: 1,
        invert: false,
        symmetryX: false,
        symmetryY: false,
        symmetryZ: false
    },

    lastPoint: null,

    // Alle verfügbaren Pinsel
    brushes: {
        DRAW: "Aufbauen",
        DRAW_SHARP: "Scharf aufbauen",
        CLAY: "Ton",
        CLAY_STRIPS: "Tonstreifen",
        INFLATE: "Aufblähen",
        DEFLATE: "Eindrücken",
        SMOOTH: "Glätten",
        FLATTEN: "Abflachen",
        PINCH: "Zusammenziehen",
        GRAB: "Verschieben",
        CREASE: "Furchen",
        BLOB: "Blob",
        SCRAPE: "Abschaben",
        LAYER: "Schichten",
        FILL: "Auffüllen"
    },

    setBrush(name) {
        if (this.brushes[name]) {
            this.brush = name;
        }
    },

    setRadius(value) {
        this.settings.radius = Math.max(0.01, Number(value));
    },

    setStrength(value) {
        this.settings.strength = Math.max(
            0,
            Math.min(1, Number(value))
        );
    },

    setSpacing(value) {
        this.settings.spacing = Math.max(
            0.01,
            Number(value)
        );
    },

    setPressure(value) {
        this.settings.pressure = Math.max(
            0,
            Math.min(1, Number(value))
        );
    },

    setInvert(value) {
        this.settings.invert = Boolean(value);
    },

    setSymmetry(axis, value) {
        if (axis === "x") this.settings.symmetryX = value;
        if (axis === "y") this.settings.symmetryY = value;
        if (axis === "z") this.settings.symmetryZ = value;
    },

    enable() {
        this.enabled = true;
    },

    disable() {
        this.enabled = false;
        this.lastPoint = null;
    },

    // ------------------------------------------
    // SCULPT-PUNKT BEARBEITEN
    // ------------------------------------------

    sculptAt(hitPoint, normal, geometry) {

        if (!this.enabled || !geometry) return;

        const positions = geometry.attributes.position;

        const radius = this.settings.radius;
        const strength =
            this.settings.strength *
            this.settings.pressure *
            0.08 *
            (this.settings.invert ? -1 : 1);

        const center = hitPoint.clone();

        for (let i = 0; i < positions.count; i++) {

            const vertex = new THREE.Vector3(
                positions.getX(i),
                positions.getY(i),
                positions.getZ(i)
            );

            const distance = vertex.distanceTo(center);

            if (distance > radius) continue;

            const falloff = Math.pow(
                1 - distance / radius,
                2
            );

            const amount = strength * falloff;

            let offset = amount;

            switch (this.brush) {

                case "DRAW":
                    vertex.addScaledVector(normal, offset);
                    break;

                case "DRAW_SHARP":
                    vertex.addScaledVector(
                        normal,
                        amount * falloff
                    );
                    break;

                case "CLAY":
                    vertex.addScaledVector(normal, amount);
                    break;

                case "CLAY_STRIPS":
                    vertex.addScaledVector(
                        normal,
                        amount * (0.6 + Math.abs(Math.sin(
                            vertex.x * 15
                        )) * 0.4)
                    );
                    break;

                case "INFLATE":
                    vertex.addScaledVector(
                        vertex.clone().normalize(),
                        amount
                    );
                    break;

                case "DEFLATE":
                    vertex.addScaledVector(
                        vertex.clone().normalize(),
                        -Math.abs(amount)
                    );
                    break;

                case "BLOB":
                    vertex.addScaledVector(
                        normal,
                        amount * 1.5
                    );
                    break;

                case "LAYER":
                    vertex.addScaledVector(
                        normal,
                        Math.max(0, amount)
                    );
                    break;

                case "FILL":
                    vertex.addScaledVector(
                        normal,
                        amount * 0.5
                    );
                    break;

                case "CRE​​ASE":
                    vertex.addScaledVector(
                        normal,
                        -Math.abs(amount)
                    );
                    break;

                case "PINCH": {
                    const direction = center.clone().sub(vertex);
                    vertex.addScaledVector(
                        direction.normalize(),
                        Math.abs(amount) * 0.5
                    );
                    break;
                }

                case "FLATTEN": {
                    const difference = vertex.clone().sub(center);
                    const height = difference.dot(normal);
                    vertex.addScaledVector(
                        normal,
                        -height * falloff * this.settings.strength
                    );
                    break;
                }

                case "SCRAPE": {
                    const difference = vertex.clone().sub(center);
                    const height = difference.dot(normal);
                    if (height > 0) {
                        vertex.addScaledVector(
                            normal,
                            -height * falloff
                        );
                    }
                    break;
                }

                case "SMOOTH":
                    // Wird separat durch smoothAt ausgeführt.
                    continue;

                case "GRAB":
                    // Grab benötigt eine Bewegungsdifferenz.
                    continue;
            }

            positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }

        positions.needsUpdate = true;
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
        geometry.computeBoundingBox();
    },

    // ------------------------------------------
    // GLÄTTEN
    // ------------------------------------------

    smoothAt(hitPoint, geometry) {

        if (!geometry) return;

        const positions = geometry.attributes.position;
        const original = positions.array.slice();

        const radius = this.settings.radius;
        const strength =
            this.settings.smoothStrength *
            this.settings.pressure;

        for (let i = 0; i < positions.count; i++) {

            const x = original[i * 3];
            const y = original[i * 3 + 1];
            const z = original[i * 3 + 2];

            const vertex = new THREE.Vector3(x, y, z);

            if (vertex.distanceTo(hitPoint) > radius) continue;

            const target = new THREE.Vector3();

            // Näherungsweise lokale Glättung
            let count = 0;

            for (let j = 0; j < positions.count; j++) {

                if (i === j) continue;

                const neighbor = new THREE.Vector3(
                    original[j * 3],
                    original[j * 3 + 1],
                    original[j * 3 + 2]
                );

                if (vertex.distanceTo(neighbor) < radius * 0.18) {
                    target.add(neighbor);
                    count++;
                }
            }

            if (count > 0) {

                target.divideScalar(count);

                const result = vertex.lerp(target, strength);

                positions.setXYZ(
                    i,
                    result.x,
                    result.y,
                    result.z
                );
            }
        }

        positions.needsUpdate = true;
        geometry.computeVertexNormals();
    },

    // ------------------------------------------
    // GRAB-PINSEL
    // ------------------------------------------

    grab(geometry, startPoint, currentPoint) {

        if (!geometry) return;

        const positions = geometry.attributes.position;

        const movement = currentPoint.clone().sub(startPoint);

        const radius = this.settings.radius;

        for (let i = 0; i < positions.count; i++) {

            const vertex = new THREE.Vector3(
                positions.getX(i),
                positions.getY(i),
                positions.getZ(i)
            );

            const distance = vertex.distanceTo(startPoint);

            if (distance > radius) continue;

            const falloff = Math.pow(
                1 - distance / radius,
                2
            );

            vertex.addScaledVector(
                movement,
                falloff * this.settings.strength
            );

            positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }

        positions.needsUpdate = true;
        geometry.computeVertexNormals();
    }
};

// ==========================================
// EINFACHE GLOBALE BEFEHLE
// ==========================================

function setSculptBrush(name) {
    sculptTools.setBrush(name);
}

function setSculptRadius(value) {
    sculptTools.setRadius(value);
}

function setSculptStrength(value) {
    sculptTools.setStrength(value);
}

function enableSculpt() {
    sculptTools.enable();
}

function disableSculpt() {
    sculptTools.disable();
}
