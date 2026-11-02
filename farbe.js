
/* ============================================
   MINI BLENDER – FARBE.JS
   TEXTURE PAINT SYSTEM
   ============================================ */

window.paintTools = {

    enabled: false,

    settings: {
        color: "#ff6600",
        size: 24,
        strength: 1,
        hardness: 0.7,
        spacing: 0.15,
        opacity: 1,
        brush: "BRUSH",
        erase: false,
        sprayAmount: 25
    },

    canvas: null,
    context: null,
    texture: null,
    selectedObject: null,

    // ------------------------------------------
    // VERFÜGBARE PINSEL
    // ------------------------------------------

    brushes: {
        BRUSH: "Normaler Pinsel",
        SOFT: "Weicher Pinsel",
        HARD: "Harter Pinsel",
        AIRBRUSH: "Airbrush",
        SPRAY: "Sprühdose",
        ERASER: "Radiergummi",
        BLUR: "Weichzeichner",
        PIXEL: "Pixelpinsel",
        MARKER: "Marker",
        FILL: "Fülleimer"
    },

    // ------------------------------------------
    // EINSTELLUNGEN
    // ------------------------------------------

    setBrush(name) {
        if (this.brushes[name]) {
            this.settings.brush = name;
        }
    },

    setColor(color) {
        this.settings.color = color;
    },

    setSize(size) {
        this.settings.size = Math.max(1, Number(size));
    },

    setStrength(value) {
        this.settings.strength = Math.max(
            0,
            Math.min(1, Number(value))
        );
    },

    setHardness(value) {
        this.settings.hardness = Math.max(
            0,
            Math.min(1, Number(value))
        );
    },

    setOpacity(value) {
        this.settings.opacity = Math.max(
            0,
            Math.min(1, Number(value))
        );
    },

    // ------------------------------------------
    // TEXTUR ERSTELLEN
    // ------------------------------------------

    createTexture(object, resolution = 2048) {

        if (!object || !object.isMesh) {
            console.warn("Kein Mesh ausgewählt!");
            return null;
        }

        if (!object.geometry.attributes.uv) {
            console.warn("Objekt hat keine UV-Koordinaten!");
            return null;
        }

        const canvas = document.createElement("canvas");

        canvas.width = resolution;
        canvas.height = resolution;

        const context = canvas.getContext("2d");

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, resolution, resolution);

        const texture = new THREE.CanvasTexture(canvas);

        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = true;
        texture.needsUpdate = true;

        const oldMaterial = object.material;

        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: texture,
            roughness: 0.7,
            metalness: 0
        });

        object.material = material;

        this.canvas = canvas;
        this.context = context;
        this.texture = texture;
        this.selectedObject = object;

        return texture;
    },

    // ------------------------------------------
    // TEXTUR AUSWÄHLEN
    // ------------------------------------------

    selectObject(object) {

        if (!object || !object.isMesh) return;

        this.selectedObject = object;

        const material = Array.isArray(object.material)
            ? object.material[0]
            : object.material;

        if (material && material.map && material.map.image) {

            const image = material.map.image;

            if (image instanceof HTMLCanvasElement) {

                this.canvas = image;
                this.context = image.getContext("2d");
                this.texture = material.map;

                return true;
            }
        }

        return this.createTexture(object);
    },

    // ------------------------------------------
    // MALMODUS
    // ------------------------------------------

    enable() {
        this.enabled = true;
    },

    disable() {
        this.enabled = false;
    },

    // ------------------------------------------
    // PINSEL FORM
    // ------------------------------------------

    getBrushStyle(x, y) {

        const size = this.settings.size;

        const gradient = this.context.createRadialGradient(
            x, y, size * this.settings.hardness,
            x, y, size
        );

        gradient.addColorStop(0, this.settings.color);
        gradient.addColorStop(1, "rgba(255,255,255,0)");

        return gradient;
    },

    // ------------------------------------------
    // MALPUNKT
    // UV WERTE ZWISCHEN 0 UND 1
    // ------------------------------------------

    paintAt(u, v) {

        if (!this.enabled || !this.context || !this.canvas) {
            return;
        }

        const width = this.canvas.width;
        const height = this.canvas.height;

        const x = u * width;
        const y = (1 - v) * height;

        const size = this.settings.size;

        const ctx = this.context;

        ctx.save();

        ctx.globalAlpha =
            this.settings.opacity *
            this.settings.strength;

        if (
            this.settings.brush === "ERASER" ||
            this.settings.erase
        ) {
            ctx.globalCompositeOperation = "destination-out";
        } else {
            ctx.globalCompositeOperation = "source-over";
        }

        // Pinseltypen
        switch (this.settings.brush) {

            case "SOFT":
                ctx.globalAlpha *= 0.7;
                ctx.fillStyle = this.getBrushStyle(x, y);
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
                break;

            case "HARD":
                ctx.fillStyle = this.settings.color;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
                break;

            case "AIRBRUSH":
                ctx.fillStyle = this.getBrushStyle(x, y);
                ctx.beginPath();
                ctx.arc(x, y, size * 1.4, 0, Math.PI * 2);
                ctx.fill();
                break;

            case "SPRAY":
                ctx.fillStyle = this.settings.color;

                for (let i = 0; i < this.settings.sprayAmount; i++) {

                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * size;

                    const px = x + Math.cos(angle) * distance;
                    const py = y + Math.sin(angle) * distance;

                    ctx.fillRect(px, py, 2, 2);
                }
                break;

            case "PIXEL":
                ctx.fillStyle = this.settings.color;
                ctx.fillRect(
                    Math.round(x / 8) * 8,
                    Math.round(y / 8) * 8,
                    8,
                    8
                );
                break;

            case "MARKER":
                ctx.fillStyle = this.settings.color;
                ctx.globalAlpha *= 0.4;
                ctx.fillRect(
                    x - size,
                    y - size / 2,
                    size * 2,
                    size
                );
                break;

            case "FILL":
                ctx.fillStyle = this.settings.color;
                ctx.fillRect(0, 0, width, height);
                break;

            case "BLUR":
                this.blurAt(x, y, size);
                break;

            default:
                ctx.fillStyle = this.settings.color;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
        }

        ctx.restore();

        this.texture.needsUpdate = true;
    },

    // ------------------------------------------
    // WEICHZEICHNER
    // ------------------------------------------

    blurAt(x, y, size) {

        const ctx = this.context;

        const left = Math.max(0, Math.floor(x - size));
        const top = Math.max(0, Math.floor(y - size));

        const width = Math.min(
            size * 2,
            this.canvas.width - left
        );

        const height = Math.min(
            size * 2,
            this.canvas.height - top
        );

        if (width <= 0 || height <= 0) return;

        ctx.save();

        ctx.filter = "blur(5px)";

        ctx.drawImage(
            this.canvas,
            left, top, width, height,
            left, top, width, height
        );

        ctx.restore();
    },

    // ------------------------------------------
    // STRICH ZWISCHEN ZWEI PUNKTEN
    // ------------------------------------------

    paintLine(u1, v1, u2, v2) {

        const distance = Math.hypot(
            (u2 - u1) * this.canvas.width,
            (v2 - v1) * this.canvas.height
        );

        const spacing = Math.max(
            1,
            this.settings.size * this.settings.spacing
        );

        const steps = Math.max(
            1,
            Math.ceil(distance / spacing)
        );

        for (let i = 0; i <= steps; i++) {

            const t = i / steps;

            this.paintAt(
                THREE.MathUtils.lerp(u1, u2, t),
                THREE.MathUtils.lerp(v1, v2, t)
            );
        }
    },

    // ------------------------------------------
    // PIPETTE
    // ------------------------------------------

    pickColor(u, v) {

        if (!this.context || !this.canvas) return;

        const x = Math.floor(u * this.canvas.width);
        const y = Math.floor((1 - v) * this.canvas.height);

        const pixel = this.context.getImageData(
            x, y, 1, 1
        ).data;

        this.settings.color =
            "#" +
            [pixel[0], pixel[1], pixel[2]]
                .map(v => v.toString(16).padStart(2, "0"))
                .join("");

        return this.settings.color;
    },

    // ------------------------------------------
    // TEXTUR EXPORT
    // ------------------------------------------

    exportTexture() {

        if (!this.canvas) return;

        const link = document.createElement("a");

        link.download = "MiniBlender_Textur.png";
        link.href = this.canvas.toDataURL("image/png");

        link.click();
    },

    // ------------------------------------------
    // TEXTUR ZURÜCKSETZEN
    // ------------------------------------------

    clearTexture() {

        if (!this.context || !this.canvas) return;

        this.context.clearRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        );

        this.texture.needsUpdate = true;
    }
};

// ============================================
// GLOBALE BEFEHLE
// ============================================

function createPaintTexture(object) {
    return paintTools.createTexture(object);
}

function setPaintBrush(name) {
    paintTools.setBrush(name);
}

function setPaintColor(color) {
    paintTools.setColor(color);
}

function setPaintSize(size) {
    paintTools.setSize(size);
}

function setPaintStrength(value) {
    paintTools.setStrength(value);
}

function paintAt(u, v) {
    paintTools.paintAt(u, v);
}

function exportPaintTexture() {
    paintTools.exportTexture();
}
