import * as Phoenix from "phoenix";
import * as GameScene from "./scenes/game";
import * as TitleScene from "./scenes/title";
import * as EditorScene from "./scenes/editor"
import * as pl from "planck";
import { gsap } from "gsap";

import sceneTransitionShader from "./global/shader/sceneTransition.glsl";

const app: Phoenix.App = new Phoenix.App({
    renderScale: 1,
    clearColor: 0x4aeddc,
    zoom: 1/4,
    shaderOverride: {
        vertexShader: Phoenix.DefaultVertexShader,
        fragmentShader: sceneTransitionShader,
        uniforms: {
            coverStart: { value: -0.5 },
            coverEnd: { value: -0.5 }
        }
    }
})

let currentAnimation: any;
app.sceneLoadTimeout = 0;
let isFirstScene = true;

app.preSceneLoadCallback = () => {
    if (isFirstScene) return;
    app.screenSpaceShader.uniforms.coverStart!.value = -0.5;
    app.screenSpaceShader.uniforms.coverEnd!.value = -0.5;
    if (currentAnimation) currentAnimation.kill();

    currentAnimation = gsap.to(app.screenSpaceShader.uniforms.coverEnd!, {
        value: 1.5,
        duration: 0.7,
        ease: "power2.out"
    });
}

app.postSceneLoadCallback = () => {
    if (isFirstScene) return;
    setTimeout(() => {
        app.screenSpaceShader.uniforms.coverStart!.value = -0.5;
        app.screenSpaceShader.uniforms.coverEnd!.value = 1.1;
        if (currentAnimation) currentAnimation.kill()

        currentAnimation = gsap.to(app.screenSpaceShader.uniforms.coverStart!, {
            value: 1.5,
            duration: 0.7,
            ease: "power2.out"
        });
    }, 0)
}

app.plWorld.setGravity(pl.Vec2(0, -16))

app.addScene("game", new GameScene.Scene())
app.addScene("title", new TitleScene.Scene())
app.addScene("editor", new EditorScene.Scene())

app.loadScene("title")

setTimeout(()=>{
    isFirstScene = false;
    app.sceneLoadTimeout = 250;
}, 15)