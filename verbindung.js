
// =====================================================
// MINI BLENDER – VERBINDUNG.JS
// ZENTRALES KOMMUNIKATIONS- UND MODULSYSTEM
// =====================================================

window.MiniBlender = {

    version: "1.0.0",

    ready: false,

    modules: {},

    events: {},

    settings: {
        autoUpdate: true,
        debug: true
    },

    // =================================================
    // MODULE REGISTRIEREN
    // =================================================

    register(name, module) {

        if (!name || !module) {
            console.error("Ungültiges Modul!");
            return false;
        }

        this.modules[name] = module;

        this.log("Modul registriert:", name);

        this.emit("module:registered", {
            name,
            module
        });

        return true;
    },

    // =================================================
    // MODUL ABRUFEN
    // =================================================

    get(name) {
        return this.modules[name] || null;
    },

    // =================================================
    // EVENT SYSTEM
    // =================================================

    on(eventName, callback) {

        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }

        this.events[eventName].push(callback);

        return () => this.off(eventName, callback);
    },

    off(eventName, callback) {

        if (!this.events[eventName]) return;

        this.events[eventName] =
            this.events[eventName].filter(
                fn => fn !== callback
            );
    },

    emit(eventName, data = {}) {

        if (!this.events[eventName]) return;

        this.events[eventName].forEach(callback => {

            try {
                callback(data);
            } catch (error) {
                console.error(
                    "Eventfehler:",
                    eventName,
                    error
                );
            }

        });
    },

    // =================================================
    // OBJEKT AUSWÄHLEN
    // =================================================

    selectObject(object) {

        if (!object) return;

        window.selectedObject = object;

        if (this.modules.modelieren) {
            this.modules.modelieren.select(object);
        }

        if (this.modules.viewport) {
            this.modules.viewport.updateSelectionHelper();
        }

        this.emit("object:selected", object);
    },

    // =================================================
    // OBJEKT LÖSCHEN
    // =================================================

    deleteObject() {

        const model = this.modules.modelieren;

        if (!model) return false;

        const result = model.deleteSelected();

        window.selectedObject = null;

        this.emit("object:deleted");

        return result;
    },

    // =================================================
    // OBJEKT ERSTELLEN
    // =================================================

    createObject(type, options = {}) {

        const model = this.modules.modelieren;

        if (!model) return null;

        let object = null;

        switch (type.toLowerCase()) {

            case "cube":
            case "würfel":
                object = model.addCube(options);
                break;

            case "sphere":
            case "kugel":
                object = model.addSphere(options);
                break;

            case "cylinder":
            case "zylinder":
                object = model.addCylinder(options);
                break;

            default:
                console.warn("Unbekannter Objekttyp:", type);
                return null;
        }

        if (object) {
            this.emit("object:created", object);
        }

        return object;
    },

    // =================================================
    // MODELLIEREN
    // =================================================

    move(x, y, z) {

        if (!this.modules.modelieren) return;

        this.modules.modelieren.move(x, y, z);

        this.emit("object:transformed", {
            type: "move",
            object: window.selectedObject
        });
    },

    rotate(x, y, z) {

        if (!this.modules.modelieren) return;

        this.modules.modelieren.rotate(x, y, z);

        this.emit("object:transformed", {
            type: "rotate",
            object: window.selectedObject
        });
    },

    scale(x, y, z) {

        if (!this.modules.modelieren) return;

        this.modules.modelieren.scale(x, y, z);

        this.emit("object:transformed", {
            type: "scale",
            object: window.selectedObject
        });
    },

    // =================================================
    // SCULPTING
    // =================================================

    sculpt: {

        setBrush(name) {
            sculptTools.setBrush(name);
        },

        setSize(value) {
            sculptTools.setRadius(value);
        },

        setStrength(value) {
            sculptTools.setStrength(value);
        },

        enable() {
            viewportEngine.setSculptMode(true);
        },

        disable() {
            viewportEngine.setSculptMode(false);
        }
    },

    // =================================================
    // TEXTURE PAINT
    // =================================================

    paint: {

        setColor(color) {
            paintTools.setColor(color);
        },

        setBrush(name) {
            paintTools.setBrush(name);
        },

        setSize(value) {
            paintTools.setSize(value);
        },

        setStrength(value) {
            paintTools.setStrength(value);
        },

        enable() {
            viewportEngine.setPaintMode(true);
        },

        disable() {
            paintTools.disable();
            viewportEngine.setObjectMode();
        }
    },

    // =================================================
    // EXPORT
    // =================================================

    export: {

        glb() {
            if (typeof exportGLB === "function") {
                exportGLB();
            }
        },

        gltf() {
            if (typeof exportGLTF === "function") {
                exportGLTF();
            }
        }
    },

    // =================================================
    // AUSWAHL ABFRAGEN
    // =================================================

    getSelectedObject() {
        return window.selectedObject || null;
    },

    // =================================================
    // STATUS
    // =================================================

    getStatus() {

        return {
            version: this.version,
            ready: this.ready,
            modules: Object.keys(this.modules),
            selectedObject: window.selectedObject
                ? window.selectedObject.name
                : null
        };
    },

    // =================================================
    // DEBUG
    // =================================================

    log(...messages) {

        if (!this.settings.debug) return;

        console.log(
            "[Mini Blender]",
            ...messages
        );
    },

    // =================================================
    // MODULE VERBINDEN
    // =================================================

    connectAll() {

        this.register("modelieren", window.modelTools);
        this.register("sculpt", window.sculptTools);
        this.register("paint", window.paintTools);
        this.register("viewport", window.viewportEngine);

        this.ready = true;

        this.emit("app:ready");

        this.log("Alle Module verbunden!");

        return true;
    },

    // =================================================
    // SYSTEM PRÜFEN
    // =================================================

    check() {

        const required = [
            "modelTools",
            "sculptTools",
            "paintTools",
            "viewportEngine"
        ];

        const missing = required.filter(
            name => !window[name]
        );

        if (missing.length) {

            console.error(
                "Fehlende Module:",
                missing
            );

            return false;
        }

        return true;
    }
};

// =====================================================
// AUTOMATISCHER START
// =====================================================

function connectMiniBlender() {

    if (!MiniBlender.check()) {
        console.error("Mini Blender konnte nicht vollständig starten!");
        return false;
    }

    MiniBlender.connectAll();

    console.log(
        "Mini Blender",
        MiniBlender.version,
        "ist bereit!"
    );

    return true;
}

// =====================================================
// GLOBALE EVENT-KURZBEFEHLE
// =====================================================

function MB_on(eventName, callback) {
    return MiniBlender.on(eventName, callback);
}

function MB_emit(eventName, data) {
    MiniBlender.emit(eventName, data);
}

function MB_getStatus() {
    return MiniBlender.getStatus();
}

// =====================================================
// ENDE VERBINDUNG.JS
// =====================================================
