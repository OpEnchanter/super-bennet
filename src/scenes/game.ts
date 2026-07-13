import * as Phoenix from "phoenix";
import { Transform } from "planck";

class PlayerController extends Phoenix.Component {
    rigidbody: Phoenix.Rigidbody | undefined = undefined;

    public override onInitialized(): void {
        this.rigidbody = this.parent?.getComponent(Phoenix.Rigidbody);
    }

    public override onUpdate(): void {
        if (!this.rigidbody) return;
        
        if (this.parent?.app.getKey("a")) {
            this.rigidbody.body?.applyLinearImpulse(
                {x: -1, y: 0},
                {
                    x: this.rigidbody.body.getPosition().x,
                    y: this.rigidbody.body.getPosition().y
                }
            )
        } else if (this.parent?.app.getKey("d")) {
            this.rigidbody.body?.applyLinearImpulse(
                {x: 1, y: 0},
                {
                    x: this.rigidbody.body.getPosition().x,
                    y: this.rigidbody.body.getPosition().y
                }
            )
        }

        if (this.parent?.app.getKey("w")) {
            this.rigidbody.body?.applyLinearImpulse(
                {x: 0, y: 3},
                {
                    x: this.rigidbody.body.getPosition().x,
                    y: this.rigidbody.body.getPosition().y
                }
            )
        }
    }
}

class CameraController extends Phoenix.Component {
    target: Phoenix.GameObject;
    targetTransform: Phoenix.Transform | undefined;
    transform: Phoenix.Transform | undefined;

    targetRigidbody: Phoenix.Rigidbody | undefined;

    constructor (target: Phoenix.GameObject) {
        super()
        this.target = target;
    }

    public override onInitialized(): void {
        this.transform = this.parent?.getComponent(Phoenix.Transform);
        this.targetTransform = this.target.getComponent(Phoenix.Transform);
        this.targetRigidbody = this.target.getComponent(Phoenix.Rigidbody);
    }

    public override onUpdate(): void {
        if (!this.transform || !this.targetTransform || !this.targetRigidbody) return;

        const targetX = this.targetTransform.globalPosition.x + this.targetRigidbody.body!.getLinearVelocity().x * 3;
        const targetY = this.targetTransform.globalPosition.y + this.targetRigidbody.body!.getLinearVelocity().y * 3;
        
        this.transform.position.x += 
            (targetX - this.transform.globalPosition.x) / 4

        this.transform.position.y += 
            (targetY - this.transform.globalPosition.y) / 4
    }
}

export class Scene extends Phoenix.Scene {
    override onLoad(app: Phoenix.App): void {
        const player = app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(0, 0),
                0,
                new Phoenix.Vector2(32, 32)
            ),
            new Phoenix.Sprite("assets/bennet/standing.png"),
            new Phoenix.Renderer(0),

            new Phoenix.BoxCollider(
                new Phoenix.Vector2(32, 32)
            ),

            new Phoenix.Rigidbody(1, 50, false, true),

            new PlayerController()
        );

        const camera = app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(0, 0),
                0,
                new Phoenix.Vector2(0, 0)
            ),
            new Phoenix.Camera(),
            new CameraController(player)
        );

        app.addObject(player);
        app.addObject(camera);

        app.addObject(
            app.createObject(
                new Phoenix.Transform(
                    new Phoenix.Vector2(0, -32),
                    0,
                    new Phoenix.Vector2(512, 32)
                ),
                new Phoenix.Sprite("assets/tiles/brick/brick.png"),
                new Phoenix.Renderer(0),

                new Phoenix.BoxCollider(
                    new Phoenix.Vector2(512, 32)
                )
            )
        );
    }
}