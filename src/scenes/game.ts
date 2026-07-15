import * as Phoenix from "phoenix";
import { LevelLoader } from "../lib/Loader";

class PlayerController extends Phoenix.Component {
    rigidbody: Phoenix.Rigidbody | undefined = undefined;
    transform: Phoenix.Transform | undefined = undefined;
    sprite: Phoenix.AnimatedSprite | undefined = undefined;
    moveSpeed: number;
    airMoveSpeed: number;
    jumpForce: number;

    constructor (moveSpeed: number, airMoveSpeed: number, jumpForce: number) {
        super()
        this.moveSpeed = moveSpeed;
        this.airMoveSpeed = airMoveSpeed;
        this.jumpForce = jumpForce;
    }

    public override onInitialized(): void {
        this.rigidbody = this.parent?.getComponent(Phoenix.Rigidbody);
        this.transform = this.parent?.getComponent(Phoenix.Transform);
        this.sprite = this.parent?.getComponent(Phoenix.AnimatedSprite);
    }

    public override onUpdate(): void {
        if (!this.rigidbody || !this.transform || !this.sprite) return;
        let grounded = false;

        const rayPositions = [-1, -0.375, 0, 0.375, 1]

        for (const p of rayPositions) {
            const leftPos = {
                x: (this.rigidbody.body!.getPosition().x + p),
                y: (this.rigidbody.body!.getPosition().y - 0.2)
            }
            
            this.parent?.app.plWorld.rayCast(leftPos, {
                x: leftPos.x,
                y: leftPos.y - 0.6
            }, (fixture, point, normal, fraction) => {

                if (fixture.getBody() == this.rigidbody?.body) {
                    return 1;
                }

                if (fixture.isSensor()) return 1

                if (normal.y > 0.5) {
                    grounded = true;
                    return fraction;
                }

                return 1;
            })
        }

        const movementSpeed = grounded ? this.moveSpeed : this.airMoveSpeed;
        
        if (this.parent?.app.getKey("a")) {
            this.rigidbody.body?.setLinearVelocity(
                {x: this.rigidbody.body.getLinearVelocity().x-movementSpeed, y: this.rigidbody.body.getLinearVelocity().y},
            )
        } else if (this.parent?.app.getKey("d")) {
            this.rigidbody.body?.setLinearVelocity(
                {x: this.rigidbody.body.getLinearVelocity().x+movementSpeed, y: this.rigidbody.body.getLinearVelocity().y},
            )
        }

        if (this.parent?.app.getKey("w") && grounded) {
            this.rigidbody.body?.applyLinearImpulse(
                {x: 0, y: this.jumpForce},
                {
                    x: this.rigidbody.body.getPosition().x,
                    y: this.rigidbody.body.getPosition().y
                }
            )
        }

        if (Math.abs(this.rigidbody.body!.getLinearVelocity().x) > 0) {
            this.sprite.setAnimation("running");
        } else {
            this.sprite.setAnimation("standing");
        }

        if (this.rigidbody.body!.getLinearVelocity().y > 0.1) {
            this.sprite.setAnimation("jumping");
        } else if (this.rigidbody.body!.getLinearVelocity().y < -0.1) {
            this.sprite.setAnimation("falling");
        }

        if (this.rigidbody.body!.getLinearVelocity().x > 0.1) {
            this.transform.scale.x = 24
        }
        
        if (this.rigidbody.body!.getLinearVelocity().x < -0.1) {
            this.transform.scale.x = -24
        }

        this.transform.globalPosition.x = Math.floor(this.transform.globalPosition.x / 2) * 2
        this.transform.globalPosition.y = Math.floor(this.transform.globalPosition.y / 2) * 2
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

        const targetX = this.targetTransform.globalPosition.x + this.targetRigidbody.body!.getLinearVelocity().x * 6;
        const targetY = this.targetTransform.globalPosition.y + this.targetRigidbody.body!.getLinearVelocity().y * 6;
        
        this.transform.position.x += 
            (targetX - this.transform.globalPosition.x) / 8

        this.transform.position.y += 
            (targetY - this.transform.globalPosition.y) / 8
    }
}

export class Scene extends Phoenix.Scene {
    override onLoad(app: Phoenix.App): void {
        const animFrames = {
            "standing": ["assets/bennet/standing.png"],
            "running": ["assets/bennet/animation/run/1.png", "assets/bennet/animation/run/2.png"],
            "jumping": ["assets/bennet/animation/jump/jump.png"],
            "falling": ["assets/bennet/animation/jump/fall.png"],
        }
        const anim = new Phoenix.AnimatedSprite(animFrames, 15);

        const player = app.createObject(
            anim,
            new Phoenix.Transform(
                new Phoenix.Vector2(0, 0),
                0,
                new Phoenix.Vector2(24, 32)
            ),
            
            new Phoenix.Renderer(0),

            new Phoenix.BoxCollider(
                new Phoenix.Vector2(24, 32)
            ),

            new Phoenix.Rigidbody(20, 10, false, true),

            new PlayerController(0.7, 0.3, 60)
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

        const loader: LevelLoader = new LevelLoader(app);
        loader.loadFromJson({
            objects: [
                {
                    type: "tile",
                    data: {
                        position: {x:4, y:-1},
                        scale: {x: 4, y:3},
                        sprite: "brick",
                        hasCollision: true
                    }
                },
                {
                    type: "tile",
                    data: {
                        position: {x:0, y:-1},
                        scale: {x: 4, y:3},
                        sprite: "stone_brick",
                        hasCollision: true
                    }
                }
            ]
        })
    }
}