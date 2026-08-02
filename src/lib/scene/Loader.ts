import * as Phoenix from "phoenix";
import * as pl from "planck";
import TileConfig from "../tileset.json";
import type {
    TileData,
    TileSetData,
    DynamicTileData,
    LoadableObject,
    ObjectBounds,
    TileConfigSchema
} from "./Types";
import { UpdatableSprite } from "../GenericHelpers";
import { NextLevelTrigger } from "./components/NextLevelTrigger";
import { LuckyBlock } from "./components/LuckyBlock";
import { Enemy } from "./components/Enemy";
import { TextTrigger } from "./components/TextTrigger";
import { FullScreenQuad } from "three/examples/jsm/Addons.js";
import { FullscreenTextDisplay } from "../dialog/TextDisplay";

const dynamicTileFunctions: Record<string, (app: Phoenix.App, position: Phoenix.Vector2, options: Map<string, string>, globals: Record<string, any>)=>Phoenix.GameObject> = {
    "flower_blue": (app, position, options, globals) => {
        return (app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(
                    position.x * 32,
                    position.y * 32
                ),
                0,
                new Phoenix.Vector2(
                    32, 32
                )
            ),
            new Phoenix.Sprite("assets/tiles/props/flower-blue.png"),
            new Phoenix.Renderer(0)
        ))
    },
    "flower_red": (app, position, options, globals) => {
        return (app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(
                    position.x * 32,
                    position.y * 32
                ),
                0,
                new Phoenix.Vector2(
                    32, 32
                )
            ),
            new Phoenix.Sprite("assets/tiles/props/flower-red.png"),
            new Phoenix.Renderer(0)
        ))
    },
    "sign": (app, position, options, globals) => {
        return (app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(
                    position.x * 32,
                    position.y * 32
                ),
                0,
                new Phoenix.Vector2(
                    32, 32
                )
            ),
            new Phoenix.Sprite("assets/tiles/props/sign.png"),
            new Phoenix.Renderer(0)
        ))
    },
    "lucky_block": (app, position, options, globals) => {
        return (app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(
                    position.x * 32,
                    position.y * 32
                ),
                0,
                new Phoenix.Vector2(
                    32, 32
                )
            ),
            new UpdatableSprite("assets/tiles/lucky.png"),
            new Phoenix.BoxCollider(new Phoenix.Vector2(32, 32)),
            new LuckyBlock(dynamicTileFunctions[options.get("contents")!]!(app, new Phoenix.Vector2(position.x, position.y + 1), options, globals)),
            new Phoenix.Renderer(4)
        ))
    },
    "next_level": (app, position, options, globals) => {
        return (app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(
                    position.x * 32,
                    position.y * 32
                ),
                0,
                new Phoenix.Vector2(
                    0, 0
                )
            ),
            new NextLevelTrigger(globals.player, globals.levelManager)
        ))
    },
    "show_text": (app, position, options, globals) => {
        return (app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(
                    position.x * 32,
                    position.y * 32
                ),
                0,
                new Phoenix.Vector2(
                    0, 0
                )
            ),
            new TextTrigger(globals.player, globals.textDisplay, options.get("text")!)
        ))
    },
    "enemy": (app, position, options, globals) => {
        return (app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(
                    position.x * 32,
                    position.y * 32
                ),
                0,
                new Phoenix.Vector2(48, 32)
            ),
            new Phoenix.AnimatedSprite({"walking": [
                "assets/tiles/enemy/animation/walking/1.png",
                "assets/tiles/enemy/animation/walking/2.png"
            ], "dying": [
                "assets/tiles/enemy/animation/death/1.png",
                "assets/tiles/enemy/animation/death/2.png",
                "assets/tiles/enemy/animation/death/3.png",
                "assets/tiles/enemy/animation/death/4.png",
                "assets/tiles/enemy/animation/death/5.png",
                "assets/tiles/enemy/animation/death/6.png",
                "assets/tiles/enemy/animation/death/7.png",
                "assets/tiles/enemy/animation/death/8.png"
            ], "dead": [
                "assets/tiles/enemy/animation/death/8.png",
            ]}),
            new Phoenix.BoxCollider(new Phoenix.Vector2(32, 32)),
            new Phoenix.Rigidbody(1, 1, false, true),
            new Enemy(1, globals.player),
            new Phoenix.Renderer(0)
        ))
    },
    "show_text_fullscreen": (app, position, options, globals) => {
        return (app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(0,0),
                0,
                new Phoenix.Vector2(0,0),
            ),
            new FullscreenTextDisplay(128, globals.levelManager, options.get("text")!)
        ))
    }
}
export const dynamicTileFunctionMap: Map<string, (app: Phoenix.App, position: Phoenix.Vector2, options: Map<string, string>, globals: Record<string, any>)=>Phoenix.GameObject> = new Map(Object.entries(dynamicTileFunctions))

type JSONWorld = {
    objects: Array<LoadableObject>
}

const tileConfig = TileConfig as TileConfigSchema;

export class LevelLoader extends Phoenix.Component {
    app: Phoenix.App | undefined;
    levelRootObject: Phoenix.GameObject | undefined;
    levelBody: pl.Body | undefined;

    globals: Record<string, any>;

    levels: {objects:LoadableObject[]}[] = [];
    curLevel: number = 0;

    constructor(globals: Record<string, any>) {
        super();
        this.globals = {levelManager: this, ...globals};
    }

    public override onInitialized(): void {
        this.app! = this.parent!.app;
        console.log(this.levels[0]!);
        this.loadFromJson(this.levels[this.curLevel]!);
    }

    public override onDestroyed(): void {
        this.unload();
        this.app!.plWorld.destroyBody(this.levelBody!);
    }

    public unload() {
        // Destroy levelRoot also destroying all objects in the level
        for (const o of this.parent!.children) {
            o.onDestroyed();
        }
        this.parent!.children = [];
        if (this.levelBody) this.app!.plWorld.destroyBody(this.levelBody!);
    }

    public loadFromString(jsonString: string) {
        const jsonObject = JSON.parse(jsonString);
        this.loadFromJson(jsonObject);
    }

    public addLevel(level: {objects:LoadableObject[]}) {
        this.levels.push(level);
    }

    public nextLevel() {
        this.curLevel++;
        this.curLevel = this.curLevel % this.levels.length;
        console.log(this.curLevel);
        this.loadFromJson(this.levels[this.curLevel]!);
    }

    public gotoLevel(id: number) {
        this.curLevel = id;
        this.loadFromJson(this.levels[this.curLevel]!);
    }

    public loadFromJson(jsonObject: JSONWorld) {
        let tileLookupMap = new Map();
        let objectBounds: ObjectBounds[] = [];

        this.unload();

        this.levelBody = this.app!.plWorld.createBody({
            type: "static",
            position: {x:0, y:0}
        })

        if (!this.parent) return;

        // Rendering object creation
        for (const object of jsonObject.objects) {
            if (object.type === "tile") {
                const tileData = object.data as TileData;
                const positions: Array<Phoenix.Vector2> = [];

                const bounds: ObjectBounds = {
                    position: tileData.position,
                    scale: tileData.scale
                };

                if (tileData.hasCollision) {
                    objectBounds.push(bounds);
                }

                for (let x = 0; x < tileData.scale.x; x++) {
                    for (let y = 0; y < tileData.scale.y; y++) {
                        positions.push(new Phoenix.Vector2(
                            x*32,
                            -y*32
                        ))
                        if (tileData.hasCollision) tileLookupMap.set(`${x+tileData.position.x},${y+tileData.position.y}`, bounds)
                    }
                }

                const tileObject = this.app!.createObject(
                    new Phoenix.Transform(
                        new Phoenix.Vector2(tileData.position.x * 32, tileData.position.y * 32),
                        0,
                        new Phoenix.Vector2(32, 32)
                    ),
                    new Phoenix.Sprite(tileConfig.tiles[tileData.sprite] ?? "assets/tiles/editor/null.png"),
                    new Phoenix.InstancedRenderer(positions, new Phoenix.Vector2(32, 32))
                );

                this.parent.addChild(tileObject);
            } else if (object.type === "tileset") {
                const tileData = object.data as TileSetData;
                let positions: Array<Phoenix.Vector2> = [];
                const tileSet = tileConfig.tileSets[tileData.sprite]!

                // Corners
                positions.push(new Phoenix.Vector2(tileData.position.x, tileData.position.y));
                positions.push(new Phoenix.Vector2(tileData.position.x + (tileData.scale.x - 1), tileData.position.y));
                positions.push(new Phoenix.Vector2(tileData.position.x, tileData.position.y - (tileData.scale.y - 1)));
                positions.push(new Phoenix.Vector2(tileData.position.x + (tileData.scale.x - 1), tileData.position.y - (tileData.scale.y - 1)));

                let sprites: Array<string> = [
                    tileSet[0]![0]!,
                    tileSet[0]![2]!,
                    tileSet[2]![0]!,
                    tileSet[2]![2]!,
                ]

                for (let i = 0; i < positions.length; i++) {
                    const object = this.app!.createObject(
                        new Phoenix.Transform(
                            new Phoenix.Vector2(positions[i]!.x * 32, positions[i]!.y * 32),
                            0,
                            new Phoenix.Vector2(32, 32)
                        ),
                        new Phoenix.Sprite(sprites[i]!),
                        new Phoenix.Renderer(0)
                    )

                    this.parent.addChild(object)
                }

                // Edges
                let edgeLength = Math.max(0, tileData.scale.x - 2);
                positions = [];
                if (edgeLength > 0) {
                    for (let i = 0; i < edgeLength; i++) {
                        positions.push(new Phoenix.Vector2(
                            i*32, 
                            0
                        ));
                    
                    }
                    const object = this.app!.createObject(
                        new Phoenix.Transform(
                            new Phoenix.Vector2(tileData.position.x * 32 + 32, tileData.position.y * 32),
                            0,
                            new Phoenix.Vector2(32, 32)
                        ),
                        new Phoenix.Sprite(tileSet[0]![1]!),
                        new Phoenix.InstancedRenderer(positions, new Phoenix.Vector2(32, 32))
                    )

                    this.parent.addChild(object);
                }

                positions = [];
                if (edgeLength > 0) {
                    for (let i = 0; i < edgeLength; i++) {
                        positions.push(new Phoenix.Vector2(
                            i*32, 
                            0
                        ));                        
                    }

                    const object = this.app!.createObject(
                        new Phoenix.Transform(
                            new Phoenix.Vector2(
                                tileData.position.x * 32 + 32, 
                                tileData.position.y * 32 - (tileData.scale.y - 1) * 32
                            ),
                            0,
                            new Phoenix.Vector2(32, 32)
                        ),
                        new Phoenix.Sprite(tileSet[2]![1]!),
                        new Phoenix.InstancedRenderer(positions, new Phoenix.Vector2(32, 32))
                    )

                    this.parent.addChild(object);
                }

                edgeLength = Math.max(0, tileData.scale.y - 2);
                positions = [];
                if (edgeLength > 0) {
                    for (let i = 0; i < edgeLength; i++) {
                        positions.push(new Phoenix.Vector2(
                            0, 
                            -i*32
                        ));
                    }

                    const object = this.app!.createObject(
                        new Phoenix.Transform(
                            new Phoenix.Vector2(tileData.position.x * 32, tileData.position.y * 32 - 32),
                            0,
                            new Phoenix.Vector2(32, 32)
                        ),
                        new Phoenix.Sprite(tileSet[1]![0]!),
                        new Phoenix.InstancedRenderer(positions, new Phoenix.Vector2(32, 32))
                    )

                    this.parent.addChild(object);
                }

                positions = [];
                if (edgeLength > 0) {
                    for (let i = 0; i < edgeLength; i++) {
                        positions.push(new Phoenix.Vector2(
                            0, 
                            -i*32
                        ));
                    
                    }
                    const object = this.app!.createObject(
                        new Phoenix.Transform(
                            new Phoenix.Vector2(
                                tileData.position.x * 32 + (tileData.scale.x - 1) * 32, 
                                tileData.position.y * 32 - 32
                            ),
                            0,
                            new Phoenix.Vector2(32, 32)
                        ),
                        new Phoenix.Sprite(tileSet[1]![0]!),
                        new Phoenix.InstancedRenderer(positions, new Phoenix.Vector2(32, 32))
                    )

                    this.parent.addChild(object);
                }

                // Center
                positions = [];
                const cx = Math.max(0, tileData.scale.x - 2)
                const cy = Math.max(0, tileData.scale.y - 2)
                if (cx > 0 && cy > 0) {
                    for (let x = 0; x < cx; x++) {
                        for (let y = 0; y < cy; y++) {
                            positions.push(new Phoenix.Vector2(
                                x*32,
                                -y*32
                            ))
                        }
                    }

                    const object = this.app!.createObject(
                        new Phoenix.Transform(
                            new Phoenix.Vector2(
                                (tileData.position.x + 1) * 32, 
                                (tileData.position.y - 1) * 32
                            ),
                            0,
                            new Phoenix.Vector2(32, 32)
                        ),
                        new Phoenix.Sprite(tileSet[1]![0]!),
                        new Phoenix.InstancedRenderer(positions, new Phoenix.Vector2(32, 32))
                    )

                    this.parent.addChild(object);
                }

                if (tileData.hasCollision) {
                    const bounds: ObjectBounds = {
                        position: tileData.position,
                        scale: tileData.scale
                    };
                    objectBounds.push(bounds);

                    for (let x = 0; x < bounds.scale.x; x++) {
                        for (let y = 0; y < bounds.scale.y; y++) {
                            tileLookupMap.set(`${x+tileData.position.x},${y+tileData.position.y}`, bounds)
                        }
                    }
                }
            } else if (object.type === "dynamic") {
                const tileData = object.data as DynamicTileData;
                const objectFunction = dynamicTileFunctionMap.get(tileData.name);
                if (objectFunction) {
                    this.parent.addChild(objectFunction(
                        this.app!, 
                        new Phoenix.Vector2(tileData.position.x, tileData.position.y), 
                        new Map(Object.entries(tileData.options)),
                        this.globals
                    ));
                }
            }
        }

        // Object collider creation
        for (const bounds of objectBounds) {

            // Top
            const topEdge = pl.Edge(
                {x: bounds.position.x, y: bounds.position.y + 0.5},
                {x: bounds.position.x + (bounds.scale.x - 1), y: bounds.position.y + 0.5}
            )

            const topLeftTile = `${bounds.position.x-1},${bounds.position.y}`
            const topRightTile = `${bounds.position.x+bounds.scale.x+1},${bounds.position.y}`

            const topLeftObject = tileLookupMap.get(topLeftTile);
            const topRightObject = tileLookupMap.get(topRightTile);

            if (topLeftObject && topLeftObject.position.y === bounds.position.y) {
                topEdge.setPrevVertex({
                    x: topLeftObject.position.x,
                    y: topLeftObject.position.y
                })
            }

            if (topRightObject && topRightObject.position.y === bounds.position.y) {
                topEdge.setNextVertex({
                    x: topRightObject.position.x + (topRightObject.scale.x - 1),
                    y: topRightObject.position.y
                })
            }

            // Bottom
            const bottomEdge = pl.Edge(
                {x: bounds.position.x, y: bounds.position.y + 0.5 - bounds.scale.y},
                {x: bounds.position.x + (bounds.scale.x - 1), y: bounds.position.y + 0.5 - bounds.scale.y}
            )

            // Left
            const leftEdge = pl.Edge(
                {x: bounds.position.x - 0.5, y: bounds.position.y + 0.5},
                {x: bounds.position.x - 0.5, y: bounds.position.y + 0.5 - bounds.scale.y}
            )
    

            // Right
            const rightEdge = pl.Edge(
                {x: bounds.position.x + bounds.scale.x - 0.5, y: bounds.position.y + 0.5},
                {x: bounds.position.x + bounds.scale.x - 0.5, y: bounds.position.y + 0.5 - bounds.scale.y}
            )

            const volume = pl.Box(
                bounds.scale.x / 2 - 0.1,
                bounds.scale.y / 2 - 0.1,
                {
                    x: bounds.position.x + (bounds.scale.x / 2 - 0.5),
                    y: bounds.position.y - (bounds.scale.y / 2 - 0.5)
                }
            )

            this.levelBody!.createFixture({shape: topEdge})
            this.levelBody!.createFixture({shape: bottomEdge})
            this.levelBody!.createFixture({shape: leftEdge})
            this.levelBody!.createFixture({shape: rightEdge})

            this.levelBody!.createFixture({shape:volume})

            if (this.globals.player) {
                const pb = (this.globals.player as Phoenix.GameObject).plBody;
                pb?.setPosition({"x":0,"y":0});
            }
        }
    }
}