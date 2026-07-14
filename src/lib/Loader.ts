import * as Phoenix from "phoenix";
import TileConfig from "./tileset.json";

type TileSetSchema = string[][]

type ComplexTileSchema = {
    texture: string,
    scale: {x: number, y: number}
    options: Object
}

type TileConfigSchema = {
    tiles: Record<string, string>,
    tileSets: Record<string, TileSetSchema>,
    complexTiles: Record<string, ComplexTileSchema>
}

type TileData = {
    position: {
        x: number,
        y: number
    },
    scale: {
        x: number,
        y: number
    },
    sprite: string,
    hasCollision: boolean
}

type TileSetData = {
    position: {
        x: number,
        y: number
    },
    scale: {
        x: number,
        y: number
    },
    sprite: string,
    hasCollision: boolean
}

type LoadableObject = {
    type: string,
    data: Object
}

type JSONWorld = {
    objects: Array<LoadableObject>
}

const tileConfig = TileConfig as TileConfigSchema;

export class LevelLoader {
    app: Phoenix.App;
    levelRootObject: Phoenix.GameObject;

    constructor(app: Phoenix.App) {
        this.app = app;
        this.levelRootObject = app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(0, 0),
                0,
                new Phoenix.Vector2(1, 1)
            )
        )
        this.app.addObject(this.levelRootObject);
    }

    public unload() {
        // Destroy levelRoot also destroying all objects in the level
        this.levelRootObject.onDestroyed();
    }

    public loadFromString(jsonString: string) {
        const jsonObject = JSON.parse(jsonString);
        this.loadFromJson(jsonObject);
    }

    public loadFromJson(jsonObject: JSONWorld) {
        for (const object of jsonObject.objects) {
            if (object.type === "tile") {
                const tileData = object.data as TileData;

                const positions: Array<Phoenix.Vector2> = [];

                for (let x = 0; x < tileData.scale.x; x++) {
                    for (let y = 0; y < tileData.scale.y; y++) {
                        positions.push(new Phoenix.Vector2(
                            x*32,
                            -y*32
                        ))
                    }
                }

                const tileObject = this.app.createObject(
                    new Phoenix.Transform(
                        new Phoenix.Vector2(tileData.position.x * 32, tileData.position.y * 32),
                        0,
                        new Phoenix.Vector2(32, 32)
                    ),
                    new Phoenix.Sprite(tileConfig.tiles[tileData.sprite] ?? "assets/tiles/editor/null.png"),
                    new Phoenix.InstancedRenderer(positions, new Phoenix.Vector2(32, 32))
                );

                if (tileData.hasCollision) {
                    tileObject.addComponent(
                        new Phoenix.BoxCollider(
                            new Phoenix.Vector2(tileData.scale.x * 32, tileData.scale.y * 32),
                            false,
                            new Phoenix.Vector2(Math.max(0, tileData.scale.x-1) * 32, -Math.max(0, tileData.scale.y - 1) * 32)
                        )
                    );
                };

                this.levelRootObject.addChild(tileObject);
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
                    const object = this.app.createObject(
                        new Phoenix.Transform(
                            new Phoenix.Vector2(positions[i]!.x * 32, positions[i]!.y * 32),
                            0,
                            new Phoenix.Vector2(32, 32)
                        ),
                        new Phoenix.Sprite(sprites[i]!),
                        new Phoenix.Renderer(0)
                    )

                    if (tileData.hasCollision) object.addComponent(
                        new Phoenix.BoxCollider(new Phoenix.Vector2(32, 32))
                    )

                    this.levelRootObject.addChild(object)
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

                        const object = this.app.createObject(
                            new Phoenix.Transform(
                                new Phoenix.Vector2(tileData.position.x * 32 + 32, tileData.position.y * 32),
                                0,
                                new Phoenix.Vector2(32, 32)
                            ),
                            new Phoenix.Sprite(tileSet[0]![1]!),
                            new Phoenix.InstancedRenderer(positions, new Phoenix.Vector2(32, 32))
                        )

                        if (tileData.hasCollision) object.addComponent(
                            new Phoenix.BoxCollider(
                                new Phoenix.Vector2(edgeLength*32, 32),
                                false,
                                new Phoenix.Vector2(Math.max(0, edgeLength) * 32, 0)
                            )
                        )

                        this.levelRootObject.addChild(object);
                    }
                }

                positions = [];
                if (edgeLength > 0) {
                    for (let i = 0; i < edgeLength; i++) {
                        positions.push(new Phoenix.Vector2(
                            i*32, 
                            0
                        ));

                        const object = this.app.createObject(
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

                        if (tileData.hasCollision) object.addComponent(
                            new Phoenix.BoxCollider(
                                new Phoenix.Vector2(edgeLength*32, 32),
                                false,
                                new Phoenix.Vector2(Math.max(0, edgeLength) * 32, 0)
                            )
                        )

                        this.levelRootObject.addChild(object);
                    }
                }

                edgeLength = Math.max(0, tileData.scale.y - 2);
                positions = [];
                if (edgeLength > 0) {
                    for (let i = 0; i < edgeLength; i++) {
                        positions.push(new Phoenix.Vector2(
                            0, 
                            i*32
                        ));

                        const object = this.app.createObject(
                            new Phoenix.Transform(
                                new Phoenix.Vector2(tileData.position.x * 32, tileData.position.y * 32 - 32),
                                0,
                                new Phoenix.Vector2(32, 32)
                            ),
                            new Phoenix.Sprite(tileSet[1]![0]!),
                            new Phoenix.InstancedRenderer(positions, new Phoenix.Vector2(32, 32))
                        )

                        if (tileData.hasCollision) object.addComponent(
                            new Phoenix.BoxCollider(
                                new Phoenix.Vector2(edgeLength*32, 32),
                                false,
                                new Phoenix.Vector2(Math.max(0, edgeLength) * 32, 0)
                            )
                        )

                        this.levelRootObject.addChild(object);
                    }
                }

                positions = [];
                if (edgeLength > 0) {
                    for (let i = 0; i < edgeLength; i++) {
                        positions.push(new Phoenix.Vector2(
                            0, 
                            i*32
                        ));

                        const object = this.app.createObject(
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

                        if (tileData.hasCollision) object.addComponent(
                            new Phoenix.BoxCollider(
                                new Phoenix.Vector2(edgeLength*32, 32),
                                false,
                                new Phoenix.Vector2(Math.max(0, edgeLength) * 32, 0)
                            )
                        )

                        this.levelRootObject.addChild(object);
                    }
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
                                y*32
                            ))
                        }
                    }

                    const object = this.app.createObject(
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

                    this.levelRootObject.addChild(object);
                }


                for (let x = 0; x < tileData.scale.x; x++) {
                    for (let y = 0; y < tileData.scale.y; y++) {
                        positions.push(new Phoenix.Vector2(
                            x*32,
                            -y*32
                        ))
                    }
                }
            }
        }
    }
}