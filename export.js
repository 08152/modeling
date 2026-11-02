// ============================================
// MINI BLENDER – EXPORT.JS
// ============================================

function exportScene(format = "glb") {

    if (!window.scene) {
        alert("Keine 3D-Szene gefunden!");
        return;
    }

    const exporter = new THREE.GLTFExporter();

    exporter.parse(
        window.scene,

        function(result) {

            const isBinary = format.toLowerCase() === "glb";

            let blob;

            if (isBinary) {
                blob = new Blob(
                    [result],
                    { type: "model/gltf-binary" }
                );
            } else {
                blob = new Blob(
                    [JSON.stringify(result, null, 2)],
                    { type: "application/json" }
                );
            }

            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");

            link.href = url;
            link.download = isBinary
                ? "MiniBlender.glb"
                : "MiniBlender.gltf";

            document.body.appendChild(link);
            link.click();
            link.remove();

            URL.revokeObjectURL(url);

        },

        function(error) {
            console.error("Exportfehler:", error);
            alert("Export fehlgeschlagen!");
        },

        {
            binary: format.toLowerCase() === "glb",
            onlyVisible: true,
            trs: false
        }
    );
}


// ============================================
// EXPORT-BUTTONS
// ============================================

function exportGLB() {
    exportScene("glb");
}

function exportGLTF() {
    exportScene("gltf");
}
