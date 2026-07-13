import * as Phoenix from "phoenix";
import * as GameScene from "./scenes/game.ts";
import * as THREE from "three";

const app: Phoenix.App = new Phoenix.App({
    renderScale: new Phoenix.Vector2(1920, 1080),
    clearColor: 0x4aeddc,
    zoom: 1/2
})

app.addScene("game", new GameScene.Scene())
app.loadScene("game")