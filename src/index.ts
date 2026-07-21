import * as Phoenix from "phoenix";
import * as GameScene from "./scenes/game";
import * as TitleScene from "./scenes/title";
import * as EditorScene from "./scenes/editor"
import * as pl from "planck";

const app: Phoenix.App = new Phoenix.App({
    renderScale: 1/2,
    clearColor: 0x4aeddc,
    zoom: 1/2
})

app.plWorld.setGravity(pl.Vec2(0, -16))

app.addScene("game", new GameScene.Scene())
app.addScene("title", new TitleScene.Scene())
app.addScene("editor", new EditorScene.Scene())

document.addEventListener("keydown", (e) => {
    if (e.key == "h") {
        app.loadScene("game")
    }
})

app.loadScene("title")