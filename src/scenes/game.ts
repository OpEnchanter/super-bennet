import * as Phoenix from "phoenix";

export class Scene extends Phoenix.Scene {
    override onLoad(app: Phoenix.App): void {
        app.addObject(
            app.createObject()
        )
    }
}