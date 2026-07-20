import * as Phoenix from "phoenix";

export class ButtonAnimator extends Phoenix.Component {
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