import * as Phoenix from "phoenix";
import * as THREE from "three";

import clippingShader from "./shader/clippingShader.glsl";

const optionHeight = 32;
const dropdownMargin = 8;
const dropdownHeight = 128;

export class Dropdown extends Phoenix.Component {
    options: string[];

    transform: Phoenix.Transform | undefined;
    
    buttonMesh: THREE.Mesh | undefined;
    optionMeshes: THREE.Mesh[] = [];
    dropdownMesh: THREE.Mesh | undefined;

    isOpen: boolean = false;
    oldMouseDown: boolean = false;

    clipRect: THREE.Vector4 | undefined;

    scrollAmount: number = 0;

    value: string = "";

    buttonCanvas: HTMLCanvasElement | undefined;

    updateCallback: (value: string) => void;

    constructor(value: string, options: string[], updateCallback: (value: string)=>void) {
        super();

        this.options = options;
        this.value = value;
        this.updateCallback = updateCallback;
    }

    public override onInitialized(): void {
        this.transform = this.parent?.getComponent(Phoenix.Transform);

        if (!this.transform) return;

        // Create button that opens dropdown
        this.buttonCanvas = document.createElement("canvas");
        this.drawButtonTexture(this.buttonCanvas);

        const texture = new THREE.CanvasTexture(this.buttonCanvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader: Phoenix.DefaultVertexShader,
            fragmentShader: Phoenix.DefaultFragmentShader,
            uniforms: {
                uTex: { value: texture }
            },
            transparent: true
        })

        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(this.transform.scale.x, this.transform.scale.y),
            material
        )

        mesh.position.set(
            this.transform.globalPosition.x,
            this.transform.globalPosition.y
        )

        this.buttonMesh = mesh;

        this.parent?.app.screenSpaceScene.add(
            mesh
        )

        // Create background for dropdown
        const dropdownCanvas = document.createElement("canvas");
        dropdownCanvas.width = 1; dropdownCanvas.height = 1;
        const dropdownCtx = dropdownCanvas.getContext("2d")!;
        dropdownCtx.fillStyle = "#262b44"
        dropdownCtx.fillRect(0, 0, 1, 1);

        const dropdownTex = new THREE.CanvasTexture(dropdownCanvas);
        dropdownTex.colorSpace = THREE.SRGBColorSpace;
        const dropdownMaterial = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader: Phoenix.DefaultVertexShader,
            fragmentShader: Phoenix.DefaultFragmentShader,
            uniforms: {
                uTex: { value: dropdownTex }
            },
            transparent: true
        })

        const dropdownMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(this.transform.scale.x, dropdownHeight),
            dropdownMaterial
        )

        dropdownMesh.position.set(
            this.transform.globalPosition.x, 
            this.transform.globalPosition.y - this.transform.scale.y / 2 - dropdownHeight / 2 - dropdownMargin
        )

        dropdownMesh.visible = false;

        this.dropdownMesh = dropdownMesh;
        this.parent?.app.screenSpaceScene.add(dropdownMesh);

        // Add options to dropdown
        this.buildDropdownOptions();
    }

    public override onUpdate(): void {
        if (!this.transform || !this.dropdownMesh || !this.buttonMesh) return;

        this.buttonMesh.position.set(
            this.transform.globalPosition.x,
            this.transform.globalPosition.y,
            3
        )

        this.dropdownMesh.position.set(
            this.transform.globalPosition.x, 
            this.transform.globalPosition.y - this.transform.scale.y / 2 - dropdownHeight / 2 - dropdownMargin,
            3
        )

        const mousePos = this.parent!.app.getMousePos();
        const isHovering = 
            mousePos.x > this.transform.globalPosition.x - this.transform.scale.x / 2 &&
            mousePos.x < this.transform.globalPosition.x + this.transform.scale.x / 2 &&
            mousePos.y > this.transform.globalPosition.y - this.transform.scale.y / 2 &&
            mousePos.y < this.transform.globalPosition.y + this.transform.scale.y / 2

        const mouseDown = this.parent!.app.getMouseDown();

        if (isHovering && mouseDown && !this.oldMouseDown) {
            this.isOpen = !this.isOpen;
            this.dropdownMesh.visible = this.isOpen;

            for (const o of this.optionMeshes) {
                o.visible = this.isOpen;
            }
        }

        const isHoveringPicker = 
            mousePos.x > this.transform.globalPosition.x - this.transform.scale.x / 2 &&
            mousePos.x < this.transform.globalPosition.x + this.transform.scale.x / 2 &&
            mousePos.y > this.dropdownMesh.position.y - dropdownHeight / 2 &&
            mousePos.y < this.dropdownMesh.position.y + dropdownHeight / 2

        let meshY = this.transform.globalPosition.y - this.transform.scale.y / 2 - dropdownMargin - optionHeight / 2 - this.scrollAmount
        for (let i = 0; i < this.optionMeshes.length; i++) {
            // Update positions based on scroll
            this.optionMeshes[i]!.position.set(
                this.transform.globalPosition.x,
                meshY,
                4
            );
            (this.optionMeshes[i]!.material as THREE.ShaderMaterial).uniforms.uPosition!.value.y = meshY; 

            // Check for interaction
            if (this.isOpen &&
                isHoveringPicker && 
                mousePos.y > meshY - optionHeight / 2 &&
                mousePos.y < meshY + optionHeight / 2
            ) {
                document.body.style.cursor = "pointer";

                if (mouseDown && !this.oldMouseDown) {
                    this.isOpen = false;
                    
                    this.dropdownMesh.visible = this.isOpen;

                    for (const o of this.optionMeshes) {
                        o.visible = this.isOpen;
                    }

                    this.value = this.options[i]!;
                    
                    this.drawButtonTexture(this.buttonCanvas!);
                    ((this.buttonMesh.material as THREE.ShaderMaterial).uniforms.uTex!.value as THREE.CanvasTexture).needsUpdate = true;

                    this.updateCallback(this.value);
                }
            }

            meshY -= optionHeight + 4;
        }

        this.scrollAmount -= this.parent!.app.getScrollDelta().y / 4;
        if (this.scrollAmount > 0) this.scrollAmount = 0;
        this.oldMouseDown = mouseDown;

        if (this.clipRect) {
            this.clipRect.x = this.transform.globalPosition.x;
            this.clipRect.y = this.transform.globalPosition.y - this.transform.scale.y / 2 - dropdownHeight / 2 - dropdownMargin;
        }
    }

    buildDropdownOptions() {
        if (!this.transform) return;
        this.clipRect = new THREE.Vector4(this.transform.globalPosition.x, this.transform.globalPosition.y - this.transform.scale.y / 2 - dropdownHeight / 2 - dropdownMargin, this.transform.scale.x, dropdownHeight);
        let meshY = this.transform.globalPosition.y - this.transform.scale.y / 2 - dropdownMargin - optionHeight / 2;
        for (let i = 0; i < this.options.length; i++) {
            const canvas = document.createElement("canvas");
            canvas.width = this.transform.scale.x; canvas.height = optionHeight;

            const ctx = canvas.getContext("2d");
            ctx!.fillStyle = `#3a4466`
            ctx?.fillRect(0, 0, this.transform.scale.x, this.transform.scale.y);

            ctx!.textAlign = "left";
            ctx!.fillStyle = "white";
            ctx!.font = `18px sans-serif`
            ctx?.fillText(this.options[i]!, 8, optionHeight - 6);

            const tex = new THREE.CanvasTexture(canvas);
            tex.colorSpace = THREE.SRGBColorSpace;
            const mat = new THREE.ShaderMaterial({
                glslVersion: THREE.GLSL3,
                vertexShader: Phoenix.DefaultVertexShader,
                fragmentShader: clippingShader,
                uniforms: {
                    uTex: { value: tex },
                    uPosition: { value: { x: this.transform.globalPosition.x, y: meshY} },
                    uClipRect: { value: this.clipRect }
                },
                transparent: true
            })

            const mesh2 = new THREE.Mesh(
                new THREE.PlaneGeometry(this.transform.scale.x, optionHeight),
                mat
            )

            mesh2.position.set(this.transform.globalPosition.x,meshY,3);

            this.parent?.app.screenSpaceScene.add(
                mesh2
            )

            this.optionMeshes.push(mesh2);

            mesh2.visible = false;

            meshY -= optionHeight + 4;
        }
    }

    drawButtonTexture(canvas: HTMLCanvasElement) {
        if (!this.transform) return;
        const bgCanvas = canvas;
        bgCanvas.width = this.transform.scale.x; bgCanvas.height = this.transform.scale.y;

        const ctx = bgCanvas.getContext("2d");
        ctx!.fillStyle = "#5a6988"
        ctx?.fillRect(0, 0, bgCanvas.width, bgCanvas.height)

        ctx!.strokeStyle = "#3a4466";
        ctx!.lineWidth = 12;
        ctx?.strokeRect(0, 0, this.transform.scale.x, this.transform.scale.y);

        ctx!.textAlign = "left";
        ctx!.fillStyle = "white";
        ctx!.font = `18px times-new-roman`
        ctx?.fillText(this.value, 8, optionHeight - 6);

        return bgCanvas;
    }

    public override onDestroyed(): void {
        this.parent!.app.screenSpaceScene.remove(this.buttonMesh as THREE.Mesh);
        this.parent!.app.screenSpaceScene.remove(this.dropdownMesh as THREE.Mesh);
        (this.buttonMesh?.material as THREE.ShaderMaterial).dispose();
        (this.dropdownMesh?.material as THREE.ShaderMaterial).dispose();
        this.buttonMesh?.geometry.dispose();
        this.dropdownMesh?.geometry.dispose();

        for (const o of this.optionMeshes) {
            this.parent!.app.screenSpaceScene.remove(o as THREE.Mesh);
            (o.material as THREE.ShaderMaterial).dispose();
            o.geometry.dispose();
        }
    }
}