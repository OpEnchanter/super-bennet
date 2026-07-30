import * as Phoenix from "phoenix";
import { PlayerController } from "../../../scenes/game";

export class Enemy extends Phoenix.Component {

    rigidbody: Phoenix.Rigidbody | undefined;
    transform: Phoenix.Transform | undefined;
    sprite: Phoenix.AnimatedSprite | undefined;
    
    walkDirection: number = -1;
    walkSpeed: number = 0;

    removalTimeout: number = 50;
    isDead: boolean = false;

    player: Phoenix.GameObject;
    playerController: PlayerController | undefined;

    constructor(walkSpeed: number, player: Phoenix.GameObject) {
        super();
        this.walkSpeed = walkSpeed;
        this.player = player;
    }

    raycast(startPos: Phoenix.Vector2, endPos: Phoenix.Vector2, excludeGround: boolean) {
        let rayHit = false;
        this.parent!.app.plWorld.rayCast(
            { 
                x: this.transform!.globalPosition.x / 32 + startPos.x,
                y: this.transform!.globalPosition.y / 32 + startPos.y
            },
            { 
                x: this.transform!.globalPosition.x / 32 + endPos.x,
                y: this.transform!.globalPosition.y / 32 + endPos.y
            },
            (fixture, point, normal, fraction) => {

                if (fixture.getBody() === this.parent!.plBody) {
                    return 1;
                }

                if (fixture.isSensor()) return 1

                if (!excludeGround) {
                    rayHit = true;
                    return fraction;
                }

                if (fixture.getBody() === this.player!.plBody) {
                    rayHit = true;
                    return fraction;
                }

                return 1;
            }
        )
        return rayHit;
    }

    public override onInitialized(): void {
        this.transform = this.parent?.getComponent(Phoenix.Transform);
        this.rigidbody = this.parent?.getComponent(Phoenix.Rigidbody);
        this.sprite = this.parent?.getComponent(Phoenix.AnimatedSprite);

        this.playerController = this.player.getComponent(PlayerController);
    }

    public override onUpdate(): void {
        if (!this.rigidbody) return;

        // Check for death condition
        if ((this.raycast(
            new Phoenix.Vector2(-0.33, 0.5),
            new Phoenix.Vector2(-0.33, 0.6),
            true
        ) || this.raycast(
            new Phoenix.Vector2(0, 0.5),
            new Phoenix.Vector2(0, 0.6),
            true
        ) || this.raycast(
            new Phoenix.Vector2(0.33, 0.5),
            new Phoenix.Vector2(0.33, 0.6),
            true
        )) && !this.isDead) {
            this.player.plBody?.setLinearVelocity(
                {"x": this.player.plBody.getLinearVelocity().x, "y": 8}
            )
            this.isDead = true;

            this.parent?.app.plWorld.destroyBody(this.parent!.plBody!);
            this.sprite?.setAnimation("dying");
            this.sprite!.t = 1;
            this.sprite!.rate = 5;
        }

        if (this.isDead) {
            this.removalTimeout--;
            if (Math.floor(this.sprite!.t / 5) > 4) this.sprite?.setAnimation("dead");
        }

        // Only continue to movement functions if enemy is still alive
        if (this.isDead) return; 

        // Walk forwards
        this.rigidbody.body!.setLinearVelocity({
            "x": this.walkDirection * this.walkSpeed,
            "y": this.rigidbody.body!.getLinearVelocity().y
        })

        // Raycast left and right to determine if movement direction should reverse
        if (this.raycast(
            new Phoenix.Vector2(-0.5, 0),
            new Phoenix.Vector2(-0.6, 0),
            false
        )) {
            this.walkDirection = 1
        } else if (this.raycast(
            new Phoenix.Vector2(0.5, 0),
            new Phoenix.Vector2(0.6, 0),
            false
        )) {
            this.walkDirection = -1
        }

        // Raycast down to the left and right to determine 
        // if enemy is going to walk off ledge, then turn around
        if (!this.raycast(
            new Phoenix.Vector2(-0.5, -0.5),
            new Phoenix.Vector2(-0.5, -4),
            false
        )) {
            this.walkDirection = 1
        } else if (!this.raycast(
            new Phoenix.Vector2(0.5, -0.5),
            new Phoenix.Vector2(0.5, -4),
            false
        )) {
            this.walkDirection = -1
        }

        // Raycast left and right, only checking for the player to damage the player
        if (this.raycast(
            new Phoenix.Vector2(-0.5, 0),
            new Phoenix.Vector2(-0.6, 0),
            true
        ) || this.raycast(
            new Phoenix.Vector2(0.5, 0),
            new Phoenix.Vector2(0.6, 0),
            true
        )) {
            this.playerController?.onDeath();
        }
    }
}