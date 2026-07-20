import * as Phoenix from "phoenix";
import * as THREE from "three";
import type { EditorLoadableObject } from "./Types";
import type { TileData } from "../scene/Types";
import { materialMetalness } from "three/tsl";

export class TileRenderer extends Phoenix.Component {

    sprite: Phoenix.Sprite | undefined;
    tileData: TileData;

    mesh: THREE.InstancedMesh | undefined;

    oldScale: Phoenix.Vector2 = new Phoenix.Vector2(0,0);
    oldPosition: Phoenix.Vector2 = new Phoenix.Vector2(0,0);

    constructor(tileData: TileData) {
        super();
        this.tileData = tileData;
    }

    public override onInitialized(): void {
        this.sprite = this.parent?.getComponent(Phoenix.Sprite);

        if (!this.sprite) return;

        // Create InstancedMesh with texture and count of objects
        const geo = new THREE.PlaneGeometry(32, 32);
        const texture = this.sprite.texture;
        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader: Phoenix.DefaultInstancedVertexShader,
            fragmentShader: Phoenix.DefaultFragmentShader,
            uniforms: {
                uTex: { value: texture}
            },
            transparent: true
        })

        this.oldScale.x = this.tileData.scale.x;
        this.oldScale.y = this.tileData.scale.y;

        this.mesh = new THREE.InstancedMesh(geo, material, 5000);

        this.retransform();

        this.parent?.app.renderScene.add(this.mesh);
    }

    public override onDestroyed(): void {
        this.parent?.app.renderScene.remove(this.mesh as THREE.Mesh);
        (this.mesh?.material as THREE.Material).dispose();
        this.mesh?.geometry.dispose();
        this.mesh?.dispose();
    }

    public override onUpdate(): void {
        if (this.tileData.scale.x !== this.oldScale.x || this.tileData.scale.y !== this.oldScale.y) {
            this.retransform();
        }

        if (this.tileData.position.x !== this.oldPosition.x || this.tileData.position.y !== this.oldPosition.y) {
            this.retransform();
        }

        this.oldScale.x = this.tileData.scale.x;
        this.oldScale.y = this.tileData.scale.y;

        this.oldPosition.x = this.tileData.position.x;
        this.oldPosition.y = this.tileData.position.y;
    }

    public retransform() {
        if (!this.mesh) return;

        let positions: Array<Phoenix.Vector2> = [];

        for (let x = 0; x < this.tileData.scale.x; x++) {
            for (let y = 0; y < this.tileData.scale.y; y++) {
                positions.push(new Phoenix.Vector2(
                    this.tileData.position.x * 32 + x * 32,
                    this.tileData.position.y * 32 - y * 32
                ));
            }
        }

        this.mesh.count = positions.length;

        for (let i = 0; i < positions.length; i++) {
            const matrix = new THREE.Matrix4();
            matrix.compose(
                new THREE.Vector3(positions[i]!.x, positions[i]!.y, 1),
                new THREE.Quaternion(),
                new THREE.Vector3(1, 1, 1)
            )

            this.mesh.setMatrixAt(i, matrix);
        }

        this.mesh.instanceMatrix.needsUpdate = true;
    }
}