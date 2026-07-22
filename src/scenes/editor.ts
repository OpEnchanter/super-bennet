import * as Phoenix from "phoenix";
import * as THREE from "three";
import TileConfig from "../lib/tileset.json";
import * as Loader from "../lib/scene/Loader";
import type { EditorLoadableObject, SelectedPaintTileSchema } from "../lib/editor/Types";
import { SceneManipulationHandler } from "../lib/editor/SceneManipulation";
import { ButtonAnimator } from "../lib/editor/UIComponents";
import type { TileConfigSchema } from "../lib/scene/Types";
import { serializeEditorScene } from "../lib/editor/Serialization";

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

const tileConfig = TileConfig as TileConfigSchema;

class GridRenderer extends Phoenix.Component {
    transform: Phoenix.Transform | undefined;
    gridHelper: THREE.GridHelper | undefined;

    public override onInitialized(): void {
        this.transform = this.parent?.getComponent(Phoenix.Transform);

        this.gridHelper = new THREE.GridHelper(1280, 40, 0x2acdbc, 0x2acdbc);
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

export class Scene extends Phoenix.Scene {
    public override onLoad(app: Phoenix.App): void {
        app.args.zoom = 1/2;
        app.resize();

        // Object map
        const objectMap: Map<string, EditorLoadableObject> = new Map();
        const objects: Array<EditorLoadableObject> = [];

        let selectedPaintTile: SelectedPaintTileSchema = {
            type: "tile",
            id: "brick"
        }

        let selectedObject: EditorLoadableObject | undefined;

        // Camera
        const sceneManipulationHandler = new SceneManipulationHandler(app, selectedPaintTile, selectedObject, objectMap, objects);

        app.addObject(app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(0, 0),
                0,
                new Phoenix.Vector2(0, 0)
            ),
            new Phoenix.Camera(),
            new CameraController(2.5, 2),
            new GridRenderer(),
            sceneManipulationHandler
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

        // Start position flag
        app.addObject(app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(0, 0),
                0,
                new Phoenix.Vector2(32, 32)
            ),
            new Phoenix.Sprite("assets/tiles/editor/flag.png"),
            new Phoenix.Renderer(4)
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

            new Phoenix.Button(() => {
                sceneManipulationHandler.setTilePlaceTimeout(10);
            }),

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
                app.loadScene("title");
            }),
            new Phoenix.UIRenderer(2)
        ))

        const saveButtonText = new Phoenix.TextSprite("Export", {
            fontSize: 24,
            padding: 8,
            fontColor: "#afafaf",
            backgroundColor: "#040404",
            backgroundWidth: (500 - menuPadding * 2 - menuSpacing) / 2
        })

        menu.addChild(app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(
                    -250 + saveButtonText.texture!.width * 1.5 + menuPadding * 2,
                    curUIY
                ),
                0,
                new Phoenix.Vector2(saveButtonText.texture!.width, saveButtonText.texture!.height)
            ),
            saveButtonText,
            new Phoenix.Button(() => {
                const data = serializeEditorScene(objects);
                console.log(data);
                navigator.clipboard.writeText(data);
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
                    sceneManipulationHandler.setTilePlaceTimeout(10);
                    selectedPaintTileSprite.updateSprite(sprite);
                    selectedPaintTile.type = "tile";
                    selectedPaintTile.id = name;
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
                    sceneManipulationHandler.setTilePlaceTimeout(10);
                    selectedPaintTileSprite.updateSprite(data[0]![1]!)
                    selectedPaintTile.type = "tileset"
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
                    sceneManipulationHandler.setTilePlaceTimeout(10);
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