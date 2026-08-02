import * as Phoenix from "phoenix";
import type { TextDisplay } from "../../dialog/TextDisplay";

export class TextTrigger extends Phoenix.Component {

    player: Phoenix.GameObject;
    textDisplay: TextDisplay;

    transform: Phoenix.Transform | undefined;
    playerTransform: Phoenix.Transform | undefined;

    text: string;

    active: boolean = false;

    constructor(player: Phoenix.GameObject, textDisplay: TextDisplay, textContents: string) {
        super();
        this.player = player;
        this.textDisplay = textDisplay;
        this.text = textContents;
    }

    public override onInitialized(): void {
        this.transform = this.parent?.getComponent(Phoenix.Transform);
        this.playerTransform = this.player.getComponent(Phoenix.Transform);
    }

    public override onUpdate(): void {
        if (!this.playerTransform || !this.transform) return;
        if (this.playerTransform.globalPosition.x > this.transform.globalPosition.x && !this.active) {
            this.active = true;
            this.textDisplay.setText(this.text);
        }
    }
}