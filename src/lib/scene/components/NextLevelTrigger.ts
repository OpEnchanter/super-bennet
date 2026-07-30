import * as Phoenix from "phoenix";
import type { LevelLoader } from "../Loader";

export class NextLevelTrigger extends Phoenix.Component {

    player: Phoenix.GameObject;
    levelManager: LevelLoader;

    transform: Phoenix.Transform | undefined;
    playerTransform: Phoenix.Transform | undefined;
    playerRigidbody: Phoenix.Rigidbody | undefined;

    constructor (player: Phoenix.GameObject, levelManager: LevelLoader) {
        super();
        this.player = player;
        this.levelManager = levelManager;
    }

    public override onInitialized(): void {
        this.transform = this.parent?.getComponent(Phoenix.Transform);
        this.playerTransform = this.player.getComponent(Phoenix.Transform);
        this.playerRigidbody = this.player.getComponent(Phoenix.Rigidbody);
    }

    public override onUpdate(): void {
        if (!this.playerTransform || !this.transform) return;
        if (this.playerTransform.globalPosition.x > this.transform.globalPosition.x) {
            this.playerTransform.globalPosition.x = 0;
            this.playerTransform.globalPosition.y = 0;
            this.playerRigidbody?.body?.setPosition({x:0, y:0});
            this.levelManager.nextLevel();
        }
    }
}