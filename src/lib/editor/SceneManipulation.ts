import * as Phoenix from "phoenix"
import type { EditorLoadableObject, SelectedPaintTileSchema } from "./Types";
import * as Loader from "../scene/Loader"
import TileConfig from "../tileset.json";
import type { TileData, TileSetData, DynamicTileData, DynamicTileSchema } from "../scene/Types";
import { DynamicTileRenderer, TileRenderer, TileSetRenderer } from "./Rendering";
import type { TileConfigSchema } from "../scene/Types";

import * as THREE from "three";

import outlineFragmentShader from "./shader/outlineFragment.glsl";
import type { OptionsUIManager } from "./ObjectOptions";

const tileConfig = TileConfig as TileConfigSchema;

let muteTilePlaceEvents: boolean = false;
let isResizingX: boolean = false;
let isResizingY: boolean = false;
let isMoving: boolean = false;
let tileUpdateTimeout: number = 0;
let tilePlaceTimeout: number = 0;

function getTileData(object: EditorLoadableObject) {
    let selectedTileData: {
        position: {x: number, y: number},
        scale: {x: number, y: number}
    } = {position: {x:0, y:0},scale: {x:0, y:0}};

    const selectedObjectData = object!.data as {
        position: {x: number, y: number},
        scale: {x: number, y: number}
    }

    switch (object!.type) {
        case "tileset":
        case "tile":
            selectedTileData = {
                position: selectedObjectData.position,
                scale: selectedObjectData.scale
            }
            break;
        case ("dynamic"):
            const selectedDynamicObjectData: DynamicTileSchema = 
                tileConfig.dynamicTiles[(object.data as DynamicTileData).name]!;

            selectedTileData = {
                position: selectedObjectData.position,
                scale: selectedDynamicObjectData.scale
            }
    }

    return selectedTileData
}

class HorizontalRescaleHandle extends Phoenix.Component {
    selectedObject: EditorLoadableObject | undefined;

    transform: Phoenix.Transform | undefined;

    isDragging: boolean = false;

    targetPosition: Phoenix.Vector2 = new Phoenix.Vector2(32, 32);

    targetScale: number = 0;

    setSelectedObject(selectedObject: EditorLoadableObject | undefined) {
        this.selectedObject = selectedObject;
    }

    constructor (selectedObject: EditorLoadableObject | undefined) {
        super();
        this.selectedObject = selectedObject;
    }

    public override onInitialized(): void {
        this.transform = this.parent?.getComponent(Phoenix.Transform)
    }

    public override onUpdate(): void {
        if (this.selectedObject && this.selectedObject.type !== "dynamic") {
            this.targetScale = 8;

            const selectedTileData = getTileData(this.selectedObject);

            this.targetPosition.x = 
                selectedTileData.position.x * 32 + selectedTileData.scale!.x * 32 - 17;
            this.targetPosition.y = 
                selectedTileData.position!.y * 32 - (selectedTileData.scale!.y - 1) * 16;

            this.transform!.position.x += (this.targetPosition.x - this.transform!.position.x) / 4;
            this.transform!.position.y += (this.targetPosition.y - this.transform!.position.y) / 4;

            const mousePos = this.parent?.app.getMousePos()!;
            const wsMousePos = new Phoenix.Vector2(
                mousePos.x * (this.parent!.app.args.zoom!) + this.parent!.app.camera.position.x, 
                mousePos.y * (this.parent!.app.args.zoom!) + this.parent!.app.camera.position.y
            );

            if (Math.sqrt(
                Math.pow(wsMousePos.x - this.transform!.position.x, 2)
                + Math.pow(wsMousePos.y - this.transform!.position.y, 2)
            ) < 8 && !isMoving) {
                muteTilePlaceEvents = true;

                if (this.parent!.app.getMouseDown() && tileUpdateTimeout < 0) {
                    this.isDragging = true;
                }
            }

            if (this.isDragging && !this.parent!.app.getMouseDown()) {
                this.isDragging = false;
            }

            if (this.isDragging) {
                (this.selectedObject.data as TileData).scale.x = 
                    Math.round((wsMousePos.x / 32) - (this.selectedObject.data as TileData).position.x)

                if ((this.selectedObject.data as TileData).scale.x < 1) {
                    (this.selectedObject.data as TileData).scale.x = 1;
                }
            }

            isResizingX = this.isDragging;
        } else {
            this.targetScale = 0;
        }
        
        this.transform!.scale.x += (this.targetScale - this.transform!.scale.x) / 4;
        this.transform!.scale.y += (this.targetScale - this.transform!.scale.y) / 4;
    }
}

class VerticalRescaleHandle extends Phoenix.Component {
    selectedObject: EditorLoadableObject | undefined;

    transform: Phoenix.Transform | undefined;

    isDragging: boolean = false;

    targetPosition: Phoenix.Vector2 = new Phoenix.Vector2(32, 32);
    targetScale: number = 0;

    setSelectedObject(selectedObject: EditorLoadableObject | undefined) {
        this.selectedObject = selectedObject;
    }

    constructor (selectedObject: EditorLoadableObject | undefined) {
        super();
        this.selectedObject = selectedObject;
    }

    public override onInitialized(): void {
        this.transform = this.parent?.getComponent(Phoenix.Transform)
    }

    public override onUpdate(): void {
        if (this.selectedObject && this.selectedObject.type !== "dynamic") {
            this.targetScale = 8;
            const selectedTileData = getTileData(this.selectedObject);

            this.targetPosition.x = 
                selectedTileData.position.x * 32 + (selectedTileData.scale!.x - 1) * 16;
            this.targetPosition.y = 
                selectedTileData.position!.y * 32 - selectedTileData.scale!.y * 32 + 17;

            this.transform!.position.x += (this.targetPosition.x - this.transform!.position.x) / 4;
            this.transform!.position.y += (this.targetPosition.y - this.transform!.position.y) / 4;

            const mousePos = this.parent?.app.getMousePos()!;
            const wsMousePos = new Phoenix.Vector2(
                mousePos.x * (this.parent!.app.args.zoom!) + this.parent!.app.camera.position.x, 
                mousePos.y * (this.parent!.app.args.zoom!) + this.parent!.app.camera.position.y
            );

            if (Math.sqrt(
                Math.pow(wsMousePos.x - this.transform!.position.x, 2)
                + Math.pow(wsMousePos.y - this.transform!.position.y, 2)
            ) < 8 && !isMoving) {
                muteTilePlaceEvents = true;

                if (this.parent!.app.getMouseDown() && tileUpdateTimeout < 0) {
                    this.isDragging = true;
                }
            }

            if (this.isDragging && !this.parent!.app.getMouseDown()) {
                this.isDragging = false;
            }

            if (this.isDragging) {
                (this.selectedObject.data as TileData).scale.y = 
                    (this.selectedObject.data as TileData).position.y - Math.round((wsMousePos.y / 32))
                if ((this.selectedObject.data as TileData).scale.y < 1) {
                    (this.selectedObject.data as TileData).scale.y = 1;
                }
            }

            isResizingY = this.isDragging;
        } else {
            this.targetScale = 0;
        }

        this.transform!.scale.x += (this.targetScale - this.transform!.scale.x) / 4;
        this.transform!.scale.y += (this.targetScale - this.transform!.scale.y) / 4;
    }
}

class SelectedObjectOverlay extends Phoenix.Component {
    selectedObject: EditorLoadableObject | undefined;

    transform: Phoenix.Transform | undefined;
    renderer: Phoenix.Renderer | undefined;

    isDragging: boolean = false;

    targetScale: Phoenix.Vector2 = new Phoenix.Vector2(32, 32);
    targetPosition: Phoenix.Vector2 = new Phoenix.Vector2(32, 32);

    setSelectedObject(selectedObject: EditorLoadableObject| undefined) {
        this.selectedObject = selectedObject;
    }

    constructor (selectedObject: EditorLoadableObject | undefined) {
        super();
        this.selectedObject = selectedObject;
    }

    public override onInitialized(): void {
        this.transform = this.parent?.getComponent(Phoenix.Transform);
        this.renderer = this.parent?.getComponent(Phoenix.Renderer);
    }

    public override onUpdate(): void {
        if (!this.transform || !this.renderer) return;
        if (this.selectedObject) {
            const selectedTileData = getTileData(this.selectedObject);

            this.targetPosition.x = 
                selectedTileData.position.x * 32 + (this.selectedObject.type !== "dynamic" ? (selectedTileData.scale.x - 1) * 16 : 0);
            this.targetPosition.y = 
                selectedTileData.position.y * 32 - (this.selectedObject.type !== "dynamic" ? (selectedTileData.scale.y - 1) * 16 : 0);

            this.transform.position.x += (this.targetPosition.x - this.transform.position.x) / 4;
            this.transform.position.y += (this.targetPosition.y - this.transform.position.y) / 4;

            this.targetScale.x = 
                selectedTileData.scale.x * 32;
            this.targetScale.y = 
                selectedTileData.scale.y * 32;

            (this.renderer.mesh!.material as THREE.ShaderMaterial).uniforms.uOverlaySize!.value = {
                x: this.transform.scale.x,
                y: this.transform.scale.y
            };

            (this.renderer.mesh!.material as THREE.ShaderMaterial).uniforms.uShowGaps!.value = this.selectedObject.type !== "dynamic";
        } else {
            this.targetScale.x = 0;
            this.targetScale.y = 0;
        }

        this.transform.scale.x += (this.targetScale.x - this.transform.scale.x) / 4;
        this.transform.scale.y += (this.targetScale.y - this.transform.scale.y) / 4;
    }
}

class ObjectMoveHandler extends Phoenix.Component {
    selectedObject: EditorLoadableObject | undefined;

    transform: Phoenix.Transform | undefined;

    isDragging: boolean = false;

    dragOffset: Phoenix.Vector2 = new Phoenix.Vector2(0, 0);

    keyboardUpdateTimeout: number = 0;

    setSelectedObject(selectedObject: EditorLoadableObject | undefined) {
        this.selectedObject = selectedObject;
    }

    constructor (selectedObject: EditorLoadableObject | undefined) {
        super();
        this.selectedObject = selectedObject;
    }

    public override onInitialized(): void {
        this.transform = this.parent?.getComponent(Phoenix.Transform)
    }

    public override onUpdate(): void {
        if (this.selectedObject) {
            const mousePos = this.parent?.app.getMousePos()!;
            const wsMousePos = new Phoenix.Vector2(
                mousePos.x * (this.parent!.app.args.zoom!) + this.parent!.app.camera.position.x, 
                mousePos.y * (this.parent!.app.args.zoom!) + this.parent!.app.camera.position.y
            );

            const selectedTileData = getTileData(this.selectedObject);


            // Mouse-based movement
            if (
                wsMousePos.x >= selectedTileData.position.x * 32 - 16 && 
                wsMousePos.y <= (selectedTileData.position.y + 1) * 32 - 16 &&
                wsMousePos.x <= selectedTileData.position.x * 32 - 16 + selectedTileData.scale.x * 32 && 
                wsMousePos.y >= (selectedTileData.position.y + 1) * 32 - 16 - selectedTileData.scale.y * 32 &&
                this.parent?.app.getMouseDown() &&
                !this.isDragging && !isResizingX && !isResizingY
            ) {
                this.isDragging = true;
                this.dragOffset.x = selectedTileData.position.x * 32 - wsMousePos.x;
                this.dragOffset.y = selectedTileData.position.y * 32 - wsMousePos.y;
            }

            if (this.isDragging && !this.parent?.app.getMouseDown()) {
                this.isDragging = false;
            }

            if (this.isDragging) {
                (this.selectedObject.data as TileData).position.x = 
                    Math.round((wsMousePos.x + this.dragOffset.x) / 32);

                (this.selectedObject.data as TileData).position.y = 
                    Math.round((wsMousePos.y + this.dragOffset.y) / 32);

                muteTilePlaceEvents = true;
            }

            isMoving = this.isDragging;

            // Keyboard-based movement
            const timeout = 10;

            if (this.keyboardUpdateTimeout < 0) {
                if (this.parent?.app.getKey("ArrowUp")) {
                    (this.selectedObject.data as TileData).position.y += 1;
                    this.keyboardUpdateTimeout = timeout;
                } else if (this.parent?.app.getKey("ArrowDown")) {
                    (this.selectedObject.data as TileData).position.y -= 1;
                    this.keyboardUpdateTimeout = timeout;
                }

                if (this.parent?.app.getKey("ArrowLeft")) {
                    (this.selectedObject.data as TileData).position.x -= 1;
                    this.keyboardUpdateTimeout = timeout;
                } else if (this.parent?.app.getKey("ArrowRight")) {
                    (this.selectedObject.data as TileData).position.x += 1;
                    this.keyboardUpdateTimeout = timeout;
                }
            }

            this.keyboardUpdateTimeout--;
        }
    }
}

export class SceneManipulationHandler extends Phoenix.Component {
    app: Phoenix.App;

    transform: Phoenix.Transform | undefined;

    mouseDownOld: boolean = false;

    selectedPaintTile: SelectedPaintTileSchema;
    selectedObject: EditorLoadableObject | undefined;
    objectMap: Map<string, EditorLoadableObject>;
    objects: Array<EditorLoadableObject>

    objectScaleXHandle: Phoenix.GameObject | undefined;
    objectScaleYHandle: Phoenix.GameObject | undefined;
    selectedObjectOverlay: Phoenix.GameObject | undefined;

    objectOptions: OptionsUIManager;

    t: number = 0;

    constructor(
        app: Phoenix.App, 
        selectedPaintTile: SelectedPaintTileSchema,  
        selectedObject: EditorLoadableObject | undefined, 
        objectMap: Map<string, EditorLoadableObject>,
        objects: Array<EditorLoadableObject>,
        objectOptions: OptionsUIManager
    ){
        super();
        this.app = app;
        this.selectedPaintTile = selectedPaintTile;
        this.objectMap = objectMap;
        this.selectedObject = selectedObject;
        this.objects = objects;
        this.objectOptions = objectOptions;
    }

    public override onInitialized(): void {
        this.transform = this.parent?.getComponent(Phoenix.Transform);

        const scaleXHandleSprite = new Phoenix.TextSprite("", {
            fontColor: "black",
            backgroundColor: "#ff8a7c",
            borderRadius: 4,
            backgroundWidth: 8,
            backgroundHeight: 8
        })

        this.objectScaleXHandle = this.app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(0,0),
                0,
                new Phoenix.Vector2(8,8)
            ),
            scaleXHandleSprite,
            new HorizontalRescaleHandle(this.selectedObject),
            new Phoenix.Renderer(3)
        )

        this.app.addObject(this.objectScaleXHandle);

        const scaleYHandleSprite = new Phoenix.TextSprite("", {
            fontColor: "black",
            backgroundColor: "#7cff8a",
            borderRadius: 4,
            backgroundWidth: 8,
            backgroundHeight: 8
        })

        this.objectScaleYHandle = this.app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(0,0),
                0,
                new Phoenix.Vector2(8,8)
            ),
            scaleYHandleSprite,
            new VerticalRescaleHandle(this.selectedObject),
            new Phoenix.Renderer(3),
        )


        this.app.addObject(this.objectScaleYHandle);

        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;

        this.selectedObjectOverlay = this.app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(0,0),
                0,
                new Phoenix.Vector2(32, 32)
            ),
            new Phoenix.CanvasSprite(canvas),
            new SelectedObjectOverlay(this.selectedObject),
            new ObjectMoveHandler(this.selectedObject),
            new Phoenix.Renderer(2, {
                fragmentShader: outlineFragmentShader, 
                vertexShader: Phoenix.DefaultVertexShader, 
                uniforms: {
                    uOverlaySize: {value: {x: 64, y: 32}},
                    uShowGaps: { value: true }
                }
            })
        )

        this.app.addObject(this.selectedObjectOverlay);
    }

    public override onUpdate(): void {
        muteTilePlaceEvents = false;
    }

    public override onLateUpdate(): void {
        if (!this.transform) return;

        if (this.parent?.app.getKey("Backspace") && this.selectedObject) {
            (this.selectedObject.gameObject as Phoenix.GameObject).onDestroyed();
            this.objects = this.objects.filter(object => object !== this.selectedObject);
            this.selectedObject = undefined;
            this.updateObjectMap();
            this.updateSelectedObject();
        }

        const mouseDown = this.app.getMouseDown();
        if (mouseDown && !this.mouseDownOld && this.t !== 0 && !muteTilePlaceEvents) {
            const mp = this.app.getMousePos();

            const mpWorldSpace = new Phoenix.Vector2(
                Math.round((
                    mp.x * (this.parent!.app.args.zoom!) + 
                    this.transform.globalPosition.x
                ) / 32),
                
                Math.round((
                    mp.y * (this.parent!.app.args.zoom!) + 
                    this.transform.globalPosition.y
                ) / 32)
                    
            );

            const objectMapKey = `${mpWorldSpace.x},${mpWorldSpace.y}`;

            if (this.objectMap.get(objectMapKey)) {
                this.selectedObject = this.objectMap.get(objectMapKey);
                
                tileUpdateTimeout = 10;

                // Update selectedObject on scaling handles
                this.updateSelectedObject();

            } else if (this.selectedObject !== undefined && tilePlaceTimeout < 0) {
                this.selectedObject = undefined;

                // Update selectedObject on scaling handles
                this.updateSelectedObject();

            } else if (tilePlaceTimeout < 0) {
                let objectData: Object = {};
                let gameObject: Phoenix.GameObject | undefined = undefined;

                switch (this.selectedPaintTile.type) {
                    case "tile":
                        objectData = {
                            position: {
                                x: mpWorldSpace.x,
                                y: mpWorldSpace.y
                            },
                            scale: {
                                x: 1,
                                y: 1
                            },
                            sprite: this.selectedPaintTile.id,
                            hasCollision: true
                        } as TileData;
                        
                        gameObject = this.app.createObject(
                            new Phoenix.Transform(
                                new Phoenix.Vector2(
                                    mpWorldSpace.x * 32,
                                    mpWorldSpace.y * 32
                                ),
                                0,
                                new Phoenix.Vector2(32, 32)
                            ),

                            new Phoenix.Sprite(tileConfig.tiles[this.selectedPaintTile.id]!),
                            new TileRenderer(objectData as TileData)
                        );
                        break;
                    case "tileset":
                        objectData = {
                            position: {
                                x: mpWorldSpace.x,
                                y: mpWorldSpace.y
                            },
                            scale: {
                                x: 1,
                                y: 1
                            },
                            sprite: this.selectedPaintTile.id,
                            hasCollision: true
                        } as TileSetData;

                        gameObject = this.app.createObject(
                            new Phoenix.Transform(
                                new Phoenix.Vector2(
                                    mpWorldSpace.x * 32,
                                    mpWorldSpace.y * 32
                                ),
                                0,
                                new Phoenix.Vector2(32, 32)
                            ),

                            new TileSetRenderer(objectData as TileData)
                        );
                        break;
                    case "dynamic":
                        objectData = {
                            position: {
                                x: mpWorldSpace.x,
                                y: mpWorldSpace.y
                            },
                            name: this.selectedPaintTile.id,
                            options: new Map<string, string>
                        } as DynamicTileData;

                        gameObject = this.app.createObject(
                            new Phoenix.Transform(
                                new Phoenix.Vector2(
                                    mpWorldSpace.x * 32,
                                    mpWorldSpace.y * 32
                                ),
                                0,
                                new Phoenix.Vector2(32, 32)
                            ),

                            new Phoenix.Sprite(tileConfig.dynamicTiles[(objectData as DynamicTileData).name]!.sprite),
                            new DynamicTileRenderer(objectData as DynamicTileData)
                        );
                        break;
                }

                console.log(gameObject);

                if (!gameObject) return;

                this.app.addObject(gameObject);

                const objectJSON = {
                    type: this.selectedPaintTile.type,
                    data: objectData,
                    gameObject: gameObject
                } as EditorLoadableObject;

                this.objects.push(objectJSON);

                this.updateObjectMap();
            }
        }

        if (muteTilePlaceEvents || isResizingX || isResizingY || isMoving) {
            this.updateObjectMap();
        }

        this.mouseDownOld = mouseDown;
        this.t++;
        tileUpdateTimeout--;
        tilePlaceTimeout--;
    }

    setTilePlaceTimeout(time: number) {
        tilePlaceTimeout = time;
    }

    updateSelectedObject() {
        this.objectScaleXHandle
            ?.getComponent(HorizontalRescaleHandle)
            ?.setSelectedObject(this.selectedObject);

        this.objectScaleYHandle
            ?.getComponent(VerticalRescaleHandle)
            ?.setSelectedObject(this.selectedObject);

        this.selectedObjectOverlay
            ?.getComponent(SelectedObjectOverlay)
            ?.setSelectedObject(this.selectedObject);

        this.selectedObjectOverlay
            ?.getComponent(ObjectMoveHandler)
            ?.setSelectedObject(this.selectedObject);

        this.objectOptions.setSelectedObject(this.selectedObject);
    }

    updateObjectMap() {
        this.objectMap.clear();
        for (const object of this.objects) {
            if (object.type === "tile" || object.type === "tileset") {
                const tileData = getTileData(object);

                for (let x = 0; x < tileData.scale.x; x++) {
                    for (let y = 0; y < tileData.scale.y; y++) {
                        const objectMapKey = `${tileData.position.x + x},${tileData.position.y - y}`
                        this.objectMap.set(
                            objectMapKey,
                            object
                        )
                    }
                }
            } else {
                const tileData = getTileData(object);
                const objectMapKey = `${tileData.position.x},${tileData.position.y}`
                this.objectMap.set(
                    objectMapKey,
                    object
                )
            }
        }
    }
}