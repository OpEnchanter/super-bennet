import * as Phoenix from "phoenix";
import * as THREE from "three";
import type { EditorLoadableObject } from "./Types";
import type { DynamicTileData, TileConfigSchema, TileData } from "../scene/Types";
import * as TileConfig from "../tileset.json";
import type { DynamicTileSchema } from "../scene/Loader";

const tileConfig = TileConfig as TileConfigSchema;

export class TileRenderer extends Phoenix.Component {

    sprite: Phoenix.Sprite | undefined;
    tileData: TileData;

    mesh: THREE.InstancedMesh | undefined;

    oldScale: Phoenix.Vector2 = new Phoenix.Vector2(0,0);
    oldPosition: Phoenix.Vector2 = new Phoenix.Vector2(0,0);

    targetPosition: Phoenix.Vector2 = new Phoenix.Vector2(0,0);

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
                uTex: { value: texture }
            },
            transparent: true
        })

        this.oldScale.x = this.tileData.scale.x;
        this.oldScale.y = this.tileData.scale.y;

        this.mesh = new THREE.InstancedMesh(geo, material, 5000);

        this.retransform();

        this.targetPosition.x = this.tileData.position.x * 32;
        this.targetPosition.y = this.tileData.position.y * 32;

        this.mesh.position.set(this.targetPosition.x, this.targetPosition.y, 1);
        this.mesh.scale.set(0,0,0);

        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.mesh.frustumCulled = false;

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

        this.targetPosition.x = this.tileData.position.x * 32;
        this.targetPosition.y = this.tileData.position.y * 32;

        this.mesh!.position.add({
            x: (this.targetPosition.x - this.mesh!.position.x) / 6,
            y: (this.targetPosition.y - this.mesh!.position.y) / 6, 
            z: 0
        })

        this.mesh?.scale.add({
            x: (1 - this.mesh!.scale.x) / 2,
            y: (1 - this.mesh!.scale.y) / 2,
            z: 0
        })
    }

    public retransform() {
        if (!this.mesh) return;

        let positions: Array<Phoenix.Vector2> = [];

        for (let x = 0; x < this.tileData.scale.x; x++) {
            for (let y = 0; y < this.tileData.scale.y; y++) {
                positions.push(new Phoenix.Vector2(
                    x * 32,
                    -y * 32
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

export class TileSetRenderer extends Phoenix.Component {

    tileData: TileData;

    tiles: THREE.Mesh[][] = [];

    oldScale: Phoenix.Vector2 = new Phoenix.Vector2(0,0);
    oldPosition: Phoenix.Vector2 = new Phoenix.Vector2(0,0);

    constructor (tileData: TileData) {
        super();
        this.tileData = tileData;
    }

    public override onInitialized(): void {
        const sprites = tileConfig.tileSets[this.tileData.sprite];

        const geo = new THREE.PlaneGeometry(32, 32);

        let ridx = 0; // Row index
        for (const row of sprites) {
            const meshRow: THREE.Mesh[] = [];
            let cidx = 0; // Column index
            for (const src of row) {
                // Create texture and material
                const texture = new THREE.TextureLoader().load(src, (tex) => {
                    tex.colorSpace = THREE.SRGBColorSpace;
                    tex.magFilter = THREE.NearestFilter;
                    tex.minFilter = THREE.NearestFilter;
                });

                // Create mesh as THREE.InstancedMesh with correct scaling
                // Just init textured but unpositioned Meshes and InstancedMeshes
                let mesh: THREE.Mesh;

                if ((ridx === 0 || ridx === 2) && (cidx === 0 || cidx === 2)) { // Corners
                    const material = new THREE.ShaderMaterial({
                        glslVersion: THREE.GLSL3,
                        vertexShader: Phoenix.DefaultVertexShader,
                        fragmentShader: Phoenix.DefaultFragmentShader,
                        uniforms: {
                            uTex: { value: texture }
                        },
                        transparent: true
                    });
                    mesh = new THREE.Mesh(geo, material);
                } else if (
                    ((ridx === 0 || ridx === 2) && (cidx === 1)) ||
                    ((cidx === 0 || cidx === 2) && (ridx === 1))
                ) { // Edges
                    const material = new THREE.ShaderMaterial({
                        glslVersion: THREE.GLSL3,
                        vertexShader: Phoenix.DefaultInstancedVertexShader,
                        fragmentShader: Phoenix.DefaultFragmentShader,
                        uniforms: {
                            uTex: { value: texture }
                        },
                        transparent: true
                    });
                    mesh = new THREE.InstancedMesh(geo, material, 5000);
                    mesh.frustumCulled = false;
                } else { // Center
                    const material = new THREE.ShaderMaterial({
                        glslVersion: THREE.GLSL3,
                        vertexShader: Phoenix.DefaultInstancedVertexShader,
                        fragmentShader: Phoenix.DefaultFragmentShader,
                        uniforms: {
                            uTex: { value: texture }
                        },
                        transparent: true
                    });
                    mesh = new THREE.InstancedMesh(geo, material, 5000);
                    mesh.frustumCulled = false;
                }

                meshRow.push(mesh);
                this.parent?.app.renderScene.add(mesh);

                cidx++;
            }
            this.tiles.push(meshRow);
            ridx++;
        }

        this.retransform();
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

    public override onDestroyed(): void {
        let ridx = 0;
        for (const row of this.tiles) {
            let cidx = 0;
            for (const tile of row) {
                this.parent?.app.renderScene.remove(tile);
                (tile.material as THREE.ShaderMaterial).dispose();
                tile.geometry.dispose();

                if ((ridx !== 0 && ridx !== 2) && (cidx !== 0 && cidx !== 2)) {
                    (tile as THREE.InstancedMesh).dispose();
                }
                cidx++;
            }
            ridx++;
        }
    }

    retransform() {
        let ridx = 0;
        for (const row of this.tiles) {
            let cidx = 0
            for (const tile of row) {
                if ((ridx === 0 || ridx === 2) && (cidx === 0 || cidx === 2)) { // Corners
                    if (ridx === 0 && cidx === 0) {
                        tile.position.set(
                            this.tileData.position.x * 32,
                            this.tileData.position.y * 32,
                            1
                        )
                    } else if (ridx === 0 && cidx === 2) {
                        tile.position.set(
                            this.tileData.position.x * 32 + (this.tileData.scale.x - 1) * 32,
                            this.tileData.position.y * 32,
                            1
                        )
                    } else if (ridx === 2 && cidx === 0) {
                        tile.position.set(
                            this.tileData.position.x * 32,
                            this.tileData.position.y * 32 - (this.tileData.scale.y - 1) * 32,
                            1
                        )
                    } else if (ridx === 2 && cidx === 2) {
                        tile.position.set(
                            this.tileData.position.x * 32 + (this.tileData.scale.x - 1) * 32,
                            this.tileData.position.y * 32 - (this.tileData.scale.y - 1) * 32,
                            1
                        )
                    } 
                } else if (
                    ((ridx === 0 || ridx === 2) && (cidx === 1)) ||
                    ((cidx === 0 || cidx === 2) && (ridx === 1))
                ) { // Edges
                    if (cidx === 1) {
                        if (ridx === 0) {
                            tile.position.set(
                                this.tileData.position.x * 32 + 32,
                                this.tileData.position.y * 32,
                                1
                            );

                            (tile as THREE.InstancedMesh).count = Math.max(0, this.tileData.scale.x - 2);

                            for (let x = 0; x < Math.max(0, this.tileData.scale.x - 2); x++) {
                                const matrix = new THREE.Matrix4();
                                matrix.compose(
                                    new THREE.Vector3(x * 32, 0, 0),
                                    new THREE.Quaternion(),
                                    new THREE.Vector3(1, 1, 1)
                                );

                                (tile as THREE.InstancedMesh).setMatrixAt(x, matrix);
                            }

                            (tile as THREE.InstancedMesh).instanceMatrix.needsUpdate = true;
                        } else if (ridx === 2) {
                            tile.position.set(
                                this.tileData.position.x * 32 + 32,
                                this.tileData.position.y * 32 - (this.tileData.scale.y - 1) * 32,
                                1
                            );

                            (tile as THREE.InstancedMesh).count = Math.max(0, this.tileData.scale.x - 2);

                            for (let x = 0; x < Math.max(0, this.tileData.scale.x - 2); x++) {
                                const matrix = new THREE.Matrix4();
                                matrix.compose(
                                    new THREE.Vector3(x * 32, 0, 0),
                                    new THREE.Quaternion(),
                                    new THREE.Vector3(1, 1, 1)
                                );

                                (tile as THREE.InstancedMesh).setMatrixAt(x, matrix);
                            }

                            (tile as THREE.InstancedMesh).instanceMatrix.needsUpdate = true;
                        }
                    } else if (ridx === 1) {
                        if (cidx === 0) {
                            tile.position.set(
                                this.tileData.position.x * 32,
                                this.tileData.position.y * 32 - 32,
                                1
                            );

                            (tile as THREE.InstancedMesh).count = Math.max(0, this.tileData.scale.y - 2);

                            for (let y = 0; y < Math.max(0, this.tileData.scale.y - 2); y++) {
                                const matrix = new THREE.Matrix4();
                                matrix.compose(
                                    new THREE.Vector3(0, -y*32, 0),
                                    new THREE.Quaternion(),
                                    new THREE.Vector3(1, 1, 1)
                                );

                                (tile as THREE.InstancedMesh).setMatrixAt(y, matrix);
                            }

                            (tile as THREE.InstancedMesh).instanceMatrix.needsUpdate = true;
                        } else if (cidx === 2) {
                            tile.position.set(
                                this.tileData.position.x * 32 + (this.tileData.scale.x - 1) * 32,
                                this.tileData.position.y * 32 - 32,
                                1
                            );

                            (tile as THREE.InstancedMesh).count = Math.max(0, this.tileData.scale.y - 2);

                            for (let y = 0; y < Math.max(0, this.tileData.scale.y - 2); y++) {
                                const matrix = new THREE.Matrix4();
                                matrix.compose(
                                    new THREE.Vector3(0, -y*32, 0),
                                    new THREE.Quaternion(),
                                    new THREE.Vector3(1, 1, 1)
                                );

                                (tile as THREE.InstancedMesh).setMatrixAt(y, matrix);
                            }

                            (tile as THREE.InstancedMesh).instanceMatrix.needsUpdate = true;
                        }
                    }
                } else { // Center
                    tile.position.set(
                        this.tileData.position.x * 32 + 32,
                        this.tileData.position.y * 32 - 32,
                        1
                    );

                    let positions: Phoenix.Vector2[] = [];
                    for (let x = 0; x < Math.max(0, this.tileData.scale.x - 2); x++) {
                        for (let y = 0; y < Math.max(0, this.tileData.scale.y - 2); y++) {
                            positions.push(new Phoenix.Vector2(x, y))
                        }
                    }

                    (tile as THREE.InstancedMesh).count = positions.length;

                    for (let i = 0; i < positions.length; i++) {
                        const matrix = new THREE.Matrix4();
                        matrix.compose(
                            new THREE.Vector3(positions[i]!.x*32, -positions[i]!.y*32, 0),
                            new THREE.Quaternion(),
                            new THREE.Vector3(1, 1, 1)
                        );

                        (tile as THREE.InstancedMesh).setMatrixAt(i, matrix);

                        (tile as THREE.InstancedMesh).instanceMatrix.needsUpdate = true;
                    }
                }
                cidx++;
            }
            ridx++;
        }
    }
}

export class DynamicTileRenderer extends Phoenix.Component {
    tileData: DynamicTileData;
    mesh: THREE.Mesh | undefined;

    sprite: Phoenix.Sprite | undefined;

    constructor (tileData: DynamicTileData) {
        super();
        this.tileData = tileData;
    }

    oldScale: Phoenix.Vector2 = new Phoenix.Vector2(0,0);
    oldPosition: Phoenix.Vector2 = new Phoenix.Vector2(0,0);

    targetPosition: Phoenix.Vector2 = new Phoenix.Vector2(0,0);

    public override onInitialized(): void {

        this.sprite = this.parent?.getComponent(Phoenix.Sprite);
        
        if (!this.sprite) return;

        const loadedTileConfig = tileConfig.dynamicTiles[this.tileData.name] as DynamicTileSchema;

        const geo = new THREE.PlaneGeometry(loadedTileConfig.scale.x * 32, loadedTileConfig.scale.y * 32);
        const texture = this.sprite.texture;
        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader: Phoenix.DefaultVertexShader,
            fragmentShader: Phoenix.DefaultFragmentShader,
            uniforms: {
                uTex: { value: texture }
            },
            transparent: true
        })

        this.mesh = new THREE.Mesh(geo, material);

        this.mesh.position.set(this.tileData.position.x * 32, this.tileData.position.y * 32);
        this.mesh.scale.set(0,0,1);

        this.parent?.app.renderScene.add(this.mesh);
    }

    public override onDestroyed(): void {
        this.parent?.app.renderScene.remove(this.mesh as THREE.Mesh);

        this.mesh?.geometry.dispose();
        (this.mesh?.material as THREE.ShaderMaterial).dispose();
    }

    public override onUpdate(): void {
        this.oldPosition.x = this.tileData.position.x;
        this.oldPosition.y = this.tileData.position.y;

        this.targetPosition.x = this.tileData.position.x * 32;
        this.targetPosition.y = this.tileData.position.y * 32;

        this.mesh!.position.add({
            x: (this.targetPosition.x - this.mesh!.position.x) / 6,
            y: (this.targetPosition.y - this.mesh!.position.y) / 6, 
            z: 0
        })

        this.mesh?.scale.add({
            x: (1 - this.mesh!.scale.x) / 2,
            y: (1 - this.mesh!.scale.y) / 2,
            z: 0
        })
    }
}