import * as Phoenix from "phoenix";

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

type LoadableObject = {
    type: string,
    data: Object
}

type JSONWorld = {
    objects: Array<LoadableObject>
}

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
                    new Phoenix.Sprite(tileData.sprite),
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
            }
        }
    }
}