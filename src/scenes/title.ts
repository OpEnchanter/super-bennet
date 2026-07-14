import * as Phoenix from "phoenix";

export class Scene extends Phoenix.Scene {
    public override onLoad(app: Phoenix.App): void {
        const startButtonText = new Phoenix.TextSprite("Play", {
            backgroundColor: "#ffaccd",
            padding: 16,
            fontSize: 48
        });

        let scaleMultiplier = 1;

        app.addObject(app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(
                    window.innerWidth / -2 + 128, 
                    0
                ),
                0,
                new Phoenix.Vector2(
                    startButtonText.texture!.width * scaleMultiplier, 
                    startButtonText.texture!.height * scaleMultiplier
                )
            ),

            startButtonText,

            new Phoenix.UIRenderer(0),

            new Phoenix.Button(() => {
                app.loadScene("game")
            }, () => {
                scaleMultiplier = 1.2
            })
        ))
    }
}