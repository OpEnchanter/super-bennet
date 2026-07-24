import * as Phoenix from "phoenix";
import * as THREE from "three";
import switchShader from "./shader/switchShader.glsl"

export class Switch extends Phoenix.Component {
    backgroundMesh: THREE.Mesh | undefined;
    handleMesh: THREE.Mesh | undefined;

    transform: Phoenix.Transform | undefined;

    isActive: boolean = false;

    targetHandlePosition: number = 0;
    handlePosition: number = 0;

    mouseDownOld: boolean = false;

    out: { value: boolean };

    updateCallback: (active: boolean)=>void;

    constructor (outputValue: { value: boolean }, updateCallback: (active: boolean)=>void) {
        super();
        this.out = outputValue;
        this.updateCallback = updateCallback;
        this.isActive = outputValue.value;
    }

    public override onInitialized(): void {
        this.transform = this.parent?.getComponent(Phoenix.Transform);
        if (!this.transform) return;

        // Create background
        const bgCanvas = document.createElement("canvas");
        bgCanvas.width = this.transform.scale.x;
        bgCanvas.height = this.transform.scale.y;

        let ctx = bgCanvas.getContext('2d');

        ctx!.fillStyle = "#2c2c2c";
        ctx?.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

        const backgroundTexture = new THREE.CanvasTexture(bgCanvas)

        const backgroundMaterial = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader: Phoenix.DefaultVertexShader,
            fragmentShader: switchShader,
            uniforms: {
                uTex: { value: backgroundTexture },
                val: { value: this.isActive }
            },
            transparent: true
        })

        this.backgroundMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(this.transform.scale.x, this.transform.scale.y),
            backgroundMaterial
        )

        this.backgroundMesh.position.set(
            this.transform.globalPosition.x,
            this.transform.globalPosition.y,
            2
        )

        // Create switch handle
        const handleSize: number = this.transform.scale.y * 1.2;

        const swCanvas = document.createElement("canvas");
        swCanvas.width = handleSize;
        swCanvas.height = handleSize;

        ctx = swCanvas.getContext('2d');
        ctx!.fillStyle = "#5a6988";
        ctx?.fillRect(0,0,handleSize,handleSize);

        ctx!.strokeStyle = "#3a4466";
        ctx!.lineWidth = 12;
        ctx?.strokeRect(0, 0, handleSize, handleSize);

        const handleTexture = new THREE.CanvasTexture(swCanvas)
        handleTexture.minFilter = THREE.NearestFilter;
        handleTexture.magFilter = THREE.NearestFilter;
        handleTexture.colorSpace = THREE.SRGBColorSpace;

        const handleMaterial = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader: Phoenix.DefaultVertexShader,
            fragmentShader: Phoenix.DefaultFragmentShader,
            uniforms: {
                uTex: { value: handleTexture }
            },
            transparent: true
        })

        this.handleMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(handleSize, handleSize),
            handleMaterial
        )

        this.targetHandlePosition = this.isActive ? 
            this.transform.scale.x / 2 - (handleSize / 2.4) :
            -this.transform.scale.x / 2 + (handleSize / 2.4);

        this.handlePosition = this.targetHandlePosition;

        this.handleMesh.position.set(
            this.transform.globalPosition.x + this.handlePosition,
            this.transform.globalPosition.y,
            2
        )

        this.parent?.app.screenSpaceScene.add(this.backgroundMesh);
        this.parent?.app.screenSpaceScene.add(this.handleMesh);
    }

    public override onUpdate(): void {
        this.handlePosition += (this.targetHandlePosition - this.handlePosition) / 2;

        this.handleMesh?.position.set(
            this.transform!.globalPosition.x + this.handlePosition,
            this.transform!.globalPosition.y,
            3
        )

        this.backgroundMesh?.position.set(
            this.transform!.globalPosition.x,
            this.transform!.globalPosition.y,
            2
        )

        const mousePos = this.parent!.app.getMousePos();

        if (!this.transform) return;
        if (
            mousePos.x > this.transform?.globalPosition.x - this.transform?.scale.x / 2 &&
            mousePos.y > this.transform?.globalPosition.y - this.transform?.scale.y / 2 &&
            mousePos.x < this.transform?.globalPosition.x + this.transform?.scale.x / 2 &&
            mousePos.y < this.transform?.globalPosition.y + this.transform?.scale.y / 2 &&
            this.parent!.app.getMouseDown() && !this.mouseDownOld
        ) {
            this.isActive = !this.isActive;

            this.updateCallback(this.isActive);
        }

        const handleSize: number = this.transform.scale.y * 1.3;

        this.targetHandlePosition = this.isActive ? 
            this.transform.scale.x / 2 - (handleSize / 2.4) :
            -this.transform.scale.x / 2 + (handleSize / 2.4);

        this.mouseDownOld = this.parent!.app.getMouseDown();

        this.out.value = this.isActive;
        (this.backgroundMesh!.material as THREE.ShaderMaterial).uniforms.val!.value = this.isActive;
    }

    public override onDestroyed(): void {
        // Remove background and handle from rendering
        this.parent?.app.screenSpaceScene.remove(this.backgroundMesh as THREE.Mesh);
        this.parent?.app.screenSpaceScene.remove(this.handleMesh as THREE.Mesh);

        // Free resources
        (this.backgroundMesh?.material as THREE.ShaderMaterial).dispose();
        this.backgroundMesh?.geometry.dispose();

        (this.handleMesh?.material as THREE.ShaderMaterial).dispose();
        this.handleMesh?.geometry.dispose();
    }
}