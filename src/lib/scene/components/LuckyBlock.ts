import * as Phoenix from "phoenix";
import { UpdatableSprite } from "../../GenericHelpers";

export class LuckyBlock extends Phoenix.Component {

    transform: Phoenix.Transform | undefined;
    rigidbody: Phoenix.Rigidbody | undefined;
    sprite: UpdatableSprite | undefined;

    activated: boolean = false;

    contents: Phoenix.GameObject;

    timeSinceHit = 0;

    initialPosition: Phoenix.Vector2 | undefined;

    constructor (contents: Phoenix.GameObject) {
        super();
        this.contents = contents;
    }

    public override onInitialized(): void {
        this.transform = this.parent!.getComponent(Phoenix.Transform);
        this.rigidbody = this.parent!.getComponent(Phoenix.Rigidbody);
        this.sprite = this.parent!.getComponent(UpdatableSprite);

        if (!this.transform) return;
        this.initialPosition = new Phoenix.Vector2(
            this.transform.position.x,
            this.transform.position.y
        )
    }

    public override onUpdate(): void {
        let rayHit = false; 
        // Only run a raycast if the lucky block has not been activated
        if (!this.activated) {
            this.parent!.app.plWorld.rayCast(
                { 
                    x: this.transform!.globalPosition.x / 32,
                    y: this.transform!.globalPosition.y / 32 - 0.5
                },
                { 
                    x: this.transform!.globalPosition.x / 32,
                    y: this.transform!.globalPosition.y / 32 - 0.6
                },
                (fixture, point, normal, fraction) => {

                    if (fixture.getBody() === this.parent!.plBody) {
                        return 1;
                    }

                    if (fixture.isSensor()) return 1

                    if (normal.y > 0){
                        rayHit = true;
                        return fraction;
                    }

                    return 1;
                }
            )
        }

        // On hit
        if (rayHit && !this.activated) {
            this.sprite!.updateSprite("assets/tiles/lucky-consumed.png");
            this.parent?.app.addObject(this.contents);
            this.activated = true;
        }

        // Animate until 20 frames after hit
        if (this.activated && this.timeSinceHit < 20) {
            this.timeSinceHit++;
        }

        // Apply the animation according to a sine wave
        this.transform!.position.y = this.initialPosition!.y + 
            Math.sin((this.timeSinceHit * Math.PI)/20)*10
    }
}