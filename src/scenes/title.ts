import * as Phoenix from "phoenix";

class ButtonHoverAnimator extends Phoenix.Component {
    transform: Phoenix.Transform | undefined;
    button: Phoenix.Button | undefined;

    targetX: number = 0;

    public override onInitialized(): void {
        this.transform = this.parent?.getComponent(Phoenix.Transform);
        this.button = this.parent?.getComponent(Phoenix.Button);

        if (!this.transform) return;
        this.targetX = window.innerWidth / -2 + (0.5 * this.transform?.scale.x) + 32;
        this.transform.position.x = this.targetX;
    }

    public override onUpdate(): void {
        if (!this.transform || !this.button) return;

        if (this.button.isHovered) {
            this.targetX = window.innerWidth / -2 + (0.5 * this.transform?.scale.x) + 48
        } else [
            this.targetX = window.innerWidth / -2 + (0.5 * this.transform?.scale.x) + 32
        ]

        this.transform.position.x += (this.targetX - this.transform.position.x) / 4
    }
}

export class Scene extends Phoenix.Scene {
    public override onLoad(app: Phoenix.App): void {
        const startButtonText = new Phoenix.TextSprite("Play", {
            backgroundColor: "#8cab9d",
            padding: 4,
            fontSize: 12,
            borderRadius: 5
        });

        let scaleMultiplier = 1;

        app.addObject(app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(
                    window.innerWidth / -2 + (0.5 * startButtonText.texture!.width * 4) + 32, 
                    window.innerHeight / 2 - (0.5 * startButtonText.texture!.width * 4) - 8
                ),
                0,
                new Phoenix.Vector2(
                    startButtonText.texture!.width * 4, 
                    startButtonText.texture!.height * 4
                )
            ),

            startButtonText,

            new ButtonHoverAnimator(),

            new Phoenix.UIRenderer(1),

            new Phoenix.Button(() => {
                app.loadScene("game")
            }, () => {
            })
        ))

        const editorButtonText = new Phoenix.TextSprite("Editor", {
            backgroundColor: "#8cab9d",
            padding: 4,
            fontSize: 12,
            borderRadius: 5
        });

        app.addObject(app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(
                    window.innerWidth / -2 + (0.5 * editorButtonText.texture!.width * 4) + 32, 
                    window.innerHeight / 2 - (0.5 * editorButtonText.texture!.height * 4) - 8 - 128
                ),
                0,
                new Phoenix.Vector2(
                    editorButtonText.texture!.width * 4, 
                    editorButtonText.texture!.height * 4
                )
            ),
            editorButtonText,

            new ButtonHoverAnimator(),

            new Phoenix.UIRenderer(1),

            new Phoenix.Button(() => {
                app.loadScene("editor")
            }, (isHovered: boolean) => {
            })
        ))

        const canvas = document.createElement("canvas");
        canvas.width = 500; canvas.height = 1;
        const ctx = canvas.getContext("2d");

        const gradient = ctx!.createLinearGradient(0,0,500,0);
        gradient?.addColorStop(0, "#000000ac");
        gradient?.addColorStop(1, "#00000000");
        ctx!.fillStyle = gradient;
        ctx?.fillRect(0, 0, 500, 1)

        app.addObject(app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(
                    (window.innerWidth / -2) + 250,
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
        ))
    }
}