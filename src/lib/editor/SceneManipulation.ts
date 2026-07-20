import * as Phoenix from "phoenix"
import type { EditorLoadableObject, SelectedPaintTileSchema } from "./Types";
import * as Loader from "../scene/Loader"
import TileConfig from "../tileset.json";
import type { TileData, TileSetData, DynamicTileData } from "../scene/Types";

const tileConfig = TileConfig as Loader.TileConfigSchema;

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
            const selectedDynamicObjectData: Loader.DynamicTileSchema = 
                tileConfig.dynamicTiles[object!.type]!;

            selectedTileData = {
                position: selectedObjectData.position,
                scale: selectedDynamicObjectData.scale
            }
    }

    return selectedObjectData
}

class HorizontalRescaleHandle extends Phoenix.Component {
    selectedObject: EditorLoadableObject | undefined;

    transform: Phoenix.Transform | undefined;

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
            const selectedTileData = getTileData(this.selectedObject);

            this.transform!.position.x = 
                selectedTileData.position.x * 32 + selectedTileData.scale!.x * 16;
            this.transform!.position.y = 
                selectedTileData.position!.y * 32;
        }
    }
}

class VerticalRescaleHandle extends Phoenix.Component {
    selectedObject: EditorLoadableObject | undefined;

    transform: Phoenix.Transform | undefined;

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
            const selectedTileData = getTileData(this.selectedObject);

            this.transform!.position.x = 
                selectedTileData.position.x * 32;
            this.transform!.position.y = 
                selectedTileData.position!.y * 32 - selectedTileData.scale!.x * 16;
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

    t: number = 0;

    constructor(
        app: Phoenix.App, 
        selectedPaintTile: SelectedPaintTileSchema,  
        selectedObject: EditorLoadableObject | undefined, 
        objectMap: Map<string, EditorLoadableObject>,
        objects: Array<EditorLoadableObject>
    ){
        super();
        this.app = app;
        this.selectedPaintTile = selectedPaintTile;
        this.objectMap = objectMap;
        this.selectedObject = selectedObject;
        this.objects = objects;
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
        const ctx = canvas.getContext("2d");
        ctx!.strokeStyle = "#4cafbbac";
        ctx!.lineWidth = 4;
        ctx?.strokeRect(0, 0, 32, 32);

        this.selectedObjectOverlay = this.app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(0,0),
                0,
                new Phoenix.Vector2(32, 32)
            ),
            new Phoenix.CanvasSprite(canvas),
            new Phoenix.Renderer(2)
        )

        this.app.addObject(this.selectedObjectOverlay);
    }

    public override onUpdate(): void {
        if (!this.transform) return;
        const mouseDown = this.app.getMouseDown();
        if (mouseDown && !this.mouseDownOld && this.t !== 0) {
            const mp = this.app.getMousePos();

            const mpWorldSpace = new Phoenix.Vector2(
                Math.round((
                    mp.x * 0.25 + 
                    this.transform.globalPosition.x
                ) / 32),
                
                Math.round((
                    mp.y * 0.25 + 
                    this.transform.globalPosition.y
                ) / 32)
                    
            );

            const objectMapKey = `${mpWorldSpace.x},${mpWorldSpace.y}`;

            if (this.objectMap.get(objectMapKey)) {
                this.selectedObject = this.objectMap.get(objectMapKey);
                
                const selectedTileData = getTileData(this.selectedObject!);

                // Update selectedObject on scaling handles
                this.objectScaleXHandle
                    ?.getComponent(HorizontalRescaleHandle)
                    ?.setSelectedObject(this.selectedObject);

                this.objectScaleYHandle
                    ?.getComponent(VerticalRescaleHandle)
                    ?.setSelectedObject(this.selectedObject);

                this.selectedObjectOverlay!.getComponent(Phoenix.Transform)!.position.x = 
                    selectedTileData.position.x * 32;
                this.selectedObjectOverlay!.getComponent(Phoenix.Transform)!.position.y = 
                    selectedTileData.position.y * 32;

                this.selectedObjectOverlay!.getComponent(Phoenix.Transform)!.scale.x = 
                    selectedTileData.scale.x * 32;
                this.selectedObjectOverlay!.getComponent(Phoenix.Transform)!.scale.y = 
                    selectedTileData.scale.y * 32;

                this.mouseDownOld = mouseDown;
                return;
            }

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
                        new Phoenix.Renderer(1)
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
                    break;
                case "dynamic":
                    objectData = {
                        position: {
                            x: mpWorldSpace.x,
                            y: mpWorldSpace.y
                        },
                        name: this.selectedPaintTile.id,
                        options: {}
                    } as DynamicTileData;
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
            
            this.objectMap.set(
                objectMapKey,
                objectJSON
            );
        }
        this.mouseDownOld = mouseDown;
        this.t++;
    }
}