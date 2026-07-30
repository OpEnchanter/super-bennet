import * as Phoenix from "phoenix";

export class UpdatableSprite extends Phoenix.Sprite {
    public updateSprite(newSprite: string) {
        this.texture = this.loadTexture(newSprite)
    }
}