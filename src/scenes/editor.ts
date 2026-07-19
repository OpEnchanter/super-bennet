import * as Phoenix from "phoenix";
import * as THREE from "three";
import TileConfig from "../lib/tileset.json";
import * as Loader from "../lib/Loader";

class CameraController extends Phoenix.Component {
    transform: Phoenix.Transform | undefined;
    movementSpeed: number;
    sprintSpeed: number;

    constructor (movementSpeed: number, sprintMultiplier: number) {
        super();
        this.movementSpeed = movementSpeed;
        this.sprintSpeed = this.movementSpeed * sprintMultiplier;
    }

    public override onInitialized(): void {
        this.transform = this.parent?.getComponent(Phoenix.Transform);
    }

    public override onUpdate(): void {
        if (!this.transform) return;

        const movementSpeed = 
            this.parent?.app.getKey("shift") ? this.sprintSpeed : this.movementSpeed;

        if (this.parent?.app.getKey("w")) {
            this.transform.position.y += movementSpeed
        } else if (this.parent?.app.getKey("s")) {
            this.transform.position.y -= movementSpeed
        }

        if (this.parent?.app.getKey("d")) {
            this.transform.position.x += movementSpeed
        } else if (this.parent?.app.getKey("a")) {
            this.transform.position.x -= movementSpeed
        }

        if (this.parent?.app.getKey("r")) {
            this.transform.position.x = 0;
            this.transform.position.y = 0;
        }
    }
}

const tileConfig = TileConfig as Loader.TileConfigSchema;

class GridRenderer extends Phoenix.Component {
    transform: Phoenix.Transform | undefined;
    gridHelper: THREE.GridHelper | undefined;

    public override onInitialized(): void {
        this.transform = this.parent?.getComponent(Phoenix.Transform);

        this.gridHelper = new THREE.GridHelper(640, 20, 0x000000, 0x000000);
        this.gridHelper.setRotationFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))
        this.parent?.app.renderScene.add(this.gridHelper);
    }

    public override onUpdate(): void {
        if (!this.transform) return

        this.gridHelper?.position.set(
            Math.floor(this.transform.position.x / 32) * 32 + 16,
            Math.floor(this.transform.position.y / 32) * 32 + 16,
        )
    }

    public override onDestroyed(): void {
        this.parent?.app.renderScene.remove(this.gridHelper as THREE.GridHelper);
        this.gridHelper?.dispose();
    }
}

class ButtonAnimator extends Phoenix.Component {
    transform: Phoenix.Transform | undefined;
    button: Phoenix.Button | undefined;

    initialScale: Phoenix.Vector2 | undefined;
    targetScale: Phoenix.Vector2 | undefined;

    randomizedRotation: number = (Math.random() * 2 - 1) * 15;
    targetRotation: number = 0;

    public override onInitialized(): void {
        this.transform = this.parent?.getComponent(Phoenix.Transform);
        this.button = this.parent?.getComponent(Phoenix.Button);

        if (!this.transform) return
        this.initialScale = new Phoenix.Vector2(
            this.transform.scale.x, 
            this.transform.scale.y
        );

        this.targetScale = new Phoenix.Vector2(
            this.initialScale.x,
            this.initialScale.y
        )
    }

    public override onUpdate(): void {
        if (!this.transform || !this.button) return;

        if (this.button.isHovered) {
            this.targetScale!.x = this.initialScale!.x * 1.1;
            this.targetScale!.y = this.initialScale!.x * 1.1;

            this.targetRotation = this.randomizedRotation;
        } else {
            this.targetScale!.x = this.initialScale!.x;
            this.targetScale!.y = this.initialScale!.y;

            this.targetRotation = 0;
        }

        this.transform.scale.x += (this.targetScale!.x - this.transform.scale.x) / 4;
        this.transform.scale.y += (this.targetScale!.y - this.transform.scale.y) / 4;

        this.transform.rotation += (this.targetRotation - this.transform.rotation) / 4
    }
}

class SelectedPaintTileIndicator extends Phoenix.Component {
    transform: Phoenix.Transform | undefined;
    rotationalVelocity: number = 0;
    rotation: number = 0;

    px: number = 0;
    py: number = 0;

    public override onInitialized(): void {
        this.transform = this.parent?.getComponent(Phoenix.Transform);
    }

    public override onUpdate(): void {
        if (!this.transform) return;
        const m = this.parent!.app.getMousePos()

        const x = ((m.x + 24) - this.px) / 8;
        const y = ((m.y - 24) - this.py) / 8

        this.px += x;
        this.py += y;

        this.rotationalVelocity += -x / 32
        this.rotationalVelocity += (0 - this.rotation) / 128
        this.rotationalVelocity *= 0.96

        this.rotation += this.rotationalVelocity;

        this.transform.rotation = 45 + this.rotation;

        this.transform.position.x = 
            Math.cos(this.rotation * (Math.PI / 180) - (Math.PI / 2)) * 16 + this.px
        this.transform.position.y = 
            Math.sin(this.rotation * (Math.PI / 180) - (Math.PI / 2)) * 16 + this.py
    }
}

class UpdatableSprite extends Phoenix.Sprite {
    public updateSprite(newSprite: string) {
        this.texture = this.loadTexture(newSprite)
    }
}

class SceneManipulationHandler extends Phoenix.Component {
    app: Phoenix.App;

    transform: Phoenix.Transform | undefined;

    mouseDownOld: boolean = false;

    selectedPaintTile: SelectedPaintTileSchema;
    selectedObject: EditorLoadableObject | undefined;
    objectMap: Map<string, EditorLoadableObject>;
    objects: Array<EditorLoadableObject>

    objectScaleXHandle: Phoenix.GameObject | undefined;
    objectScaleYHandle: Phoenix.GameObject | undefined;

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
            new Phoenix.Renderer(2)
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
            new Phoenix.Renderer(2)
        )

        this.app.addObject(this.objectScaleYHandle);
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
                ) / 32) * 32,
                
                Math.round((
                    mp.y * 0.25 + 
                    this.transform.globalPosition.y
                ) / 32) * 32
                    
            );

            const objectMapKey = `${mpWorldSpace.x},${mpWorldSpace.y}`;

            if (this.objectMap.get(objectMapKey)) {
                console.log("SELECTING")
                this.selectedObject = this.objectMap.get(objectMapKey);
                const selectedGameObject = this.selectedObject!.gameObject;

                const selectedTransform = selectedGameObject.getComponent(Phoenix.Transform)
                
                this.objectScaleXHandle!.getComponent(Phoenix.Transform)!.position.x = 
                    selectedTransform!.position.x * 16 + selectedTransform!.scale.x * 16;

                return
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
                    } as Loader.TileData;
                    
                    gameObject = this.app.createObject(
                        new Phoenix.Transform(
                            new Phoenix.Vector2(
                                mpWorldSpace.x,
                                mpWorldSpace.y
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
                    } as Loader.TileSetData;
                    break;
                case "dynamic":
                    objectData = {
                        position: {
                            x: mpWorldSpace.x,
                            y: mpWorldSpace.y
                        },
                        name: this.selectedPaintTile.id,
                        options: {}
                    } as Loader.DynamicTileData;
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


type EditorLoadableObject = {
    type: string,
    data: Object,
    gameObject: Phoenix.GameObject
}

type SelectedPaintTileSchema = {
    type: string,
    id: string
}

export class Scene extends Phoenix.Scene {
    public override onLoad(app: Phoenix.App): void {
        // Object map
        const objectMap: Map<string, EditorLoadableObject> = new Map();
        const objects: Array<EditorLoadableObject> = [];

        let selectedPaintTile: SelectedPaintTileSchema = {
            type: "tile",
            id: "brick"
        }

        let selectedObject: EditorLoadableObject | undefined;

        // Camera
        app.addObject(app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(0, 0),
                0,
                new Phoenix.Vector2(0, 0)
            ),
            new Phoenix.Camera(),
            new CameraController(2.5, 2),
            new GridRenderer(),
            new SceneManipulationHandler(app, selectedPaintTile, selectedObject, objectMap, objects)
        ));

        // Selected Object-To-Place Indicator
        const selectedPaintTileSprite = new UpdatableSprite("assets/tiles/brick/brick.png");
        app.addObject(app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(0,0),
                0,
                new Phoenix.Vector2(32, 32)
            ),

            selectedPaintTileSprite,

            new SelectedPaintTileIndicator(),

            new Phoenix.UIRenderer(3)
        ))

        // Add menu
        const canvas = document.createElement("canvas");
        canvas.width = 1; canvas.height = 1;
        const ctx = canvas.getContext("2d");
        ctx!.fillStyle = "black";
        ctx?.fillRect(0, 0, 1, 1)

        const menu = app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(
                    window.innerWidth / 2 - 250,
                    0
                ),
                0,
                new Phoenix.Vector2(
                    500,
                    window.innerHeight
                )
            ),

            new Phoenix.CanvasSprite(canvas),

            new Phoenix.UIRenderer(0)
        );

        const menuPadding = 24;
        const menuSpacing = 24;
        let curUIY = window.innerHeight / 2 - menuPadding

        const quitButtonText = new Phoenix.TextSprite("Exit", {
            fontSize: 24,
            padding: 8,
            fontColor: "#afafaf",
            backgroundColor: "#040404",
            backgroundWidth: (500 - menuPadding * 2 - menuSpacing) / 2
        })
        curUIY -= quitButtonText.texture!.height / 2
        menu.addChild(app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(
                    -250 + quitButtonText.texture!.width / 2 + menuPadding,
                    curUIY
                ),
                0,
                new Phoenix.Vector2(quitButtonText.texture!.width, quitButtonText.texture!.height)
            ),
            quitButtonText,
            new Phoenix.Button(() => {
                app.loadScene("title")
            }),
            new Phoenix.UIRenderer(2)
        ))
        curUIY -= quitButtonText.texture!.height / 2


        const tilesText = new Phoenix.TextSprite("Tiles", {fontColor: "#afafaf", fontSize: 32})
        curUIY -= tilesText.texture!.height / 2 + menuSpacing
        menu.addChild(app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(
                    -250 + tilesText.texture!.width / 2 + menuPadding,
                    curUIY
                ),
                0,
                new Phoenix.Vector2(tilesText.texture!.width, tilesText.texture!.height)
            ),
            tilesText,
            new Phoenix.UIRenderer(1)
        ))
        curUIY -= tilesText.texture!.height / 2

        let xIndex = 0;
        curUIY -= 32 + menuSpacing
        for (const [name, sprite] of Object.entries(tileConfig.tiles)) {
            const xOffset = xIndex*(64+menuSpacing)

            menu.addChild(app.createObject(
                new Phoenix.Transform(
                    new Phoenix.Vector2(
                        -218 + xOffset + menuPadding,
                        curUIY
                    ),
                    0,
                    new Phoenix.Vector2(64, 64)
                ),

                new Phoenix.Sprite(sprite),

                new Phoenix.Button(() => {
                    selectedPaintTileSprite.updateSprite(sprite)
                    selectedPaintTile.type = "tile"
                    selectedPaintTile.id = name
                }),

                new ButtonAnimator(),

                new Phoenix.UIRenderer(2)
            ));

            xIndex++;

            if (xOffset > (350 - menuPadding * 2)) {
                xIndex = 0;
                curUIY -= 64 + menuSpacing
            }
        }
        curUIY -= 32 + menuSpacing * 2

        const tileSetsText = new Phoenix.TextSprite("Tilesets", {fontColor: "#afafaf", fontSize: 32})
        menu.addChild(app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(
                    -250 + tileSetsText.texture!.width / 2 + menuPadding,
                    curUIY
                ),
                0,
                new Phoenix.Vector2(tileSetsText.texture!.width, tileSetsText.texture!.height)
            ),
            tileSetsText,
            new Phoenix.UIRenderer(1)
        ))
        curUIY -= tileSetsText.texture!.height / 2

        xIndex = 0;
        curUIY -= 32 + menuSpacing
        for (const [name, data] of Object.entries(tileConfig.tileSets)) {
            const xOffset = xIndex*(64+menuSpacing)

            menu.addChild(app.createObject(
                new Phoenix.Transform(
                    new Phoenix.Vector2(
                        -218 + xOffset + menuPadding,
                        curUIY
                    ),
                    0,
                    new Phoenix.Vector2(64, 64)
                ),

                new Phoenix.Sprite(data[0]![1]!),

                new Phoenix.Button(() => {
                    selectedPaintTileSprite.updateSprite(data[0]![1]!)
                    selectedPaintTile.type = "tilset"
                    selectedPaintTile.id = name
                }),

                new ButtonAnimator(),

                new Phoenix.UIRenderer(2)
            ));

            xIndex++;

            if (xOffset > (350 - menuPadding * 2)) {
                xIndex = 0;
                curUIY -= 64 + menuSpacing
            }
        }
        curUIY -= 32 + menuSpacing * 2

        const dynamicObjectsText = new Phoenix.TextSprite("Dynamic Objects", {fontColor: "#afafaf", fontSize: 32, backgroundHeight: 42})
        menu.addChild(app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(
                    -250 + dynamicObjectsText.texture!.width / 2 + menuPadding,
                    curUIY
                ),
                0,
                new Phoenix.Vector2(dynamicObjectsText.texture!.width, dynamicObjectsText.texture!.height)
            ),
            dynamicObjectsText,
            new Phoenix.UIRenderer(1)
        ))
        curUIY -= dynamicObjectsText.texture!.height / 2

        xIndex = 0;
        curUIY -= 32 + menuSpacing
        for (const [name, data] of Object.entries(tileConfig.dynamicTiles)) {
            const xOffset = xIndex*(64+menuSpacing)

            menu.addChild(app.createObject(
                new Phoenix.Transform(
                    new Phoenix.Vector2(
                        -218 + xOffset + menuPadding,
                        curUIY
                    ),
                    0,
                    new Phoenix.Vector2(64, 64)
                ),

                new Phoenix.Sprite(data.sprite),

                new Phoenix.Button(() => {
                    selectedPaintTileSprite.updateSprite(data.sprite)
                    selectedPaintTile.type = "dynamic"
                    selectedPaintTile.id = name
                }),

                new ButtonAnimator(),

                new Phoenix.UIRenderer(2)
            ));

            xIndex++;

            if (xOffset > (350 - menuPadding * 2)) {
                xIndex = 0;
                curUIY -= 64 + menuSpacing
            }
        }

        app.addObject(menu);
    }
}