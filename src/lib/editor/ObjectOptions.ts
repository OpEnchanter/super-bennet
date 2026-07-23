import * as Phoenix from "phoenix";
import type { EditorLoadableObject } from "./Types";
import { Switch } from "../ui/Switch";
import type { TileData } from "../scene/Types";

export class OptionsUIManager extends Phoenix.Component {
    selectedObject: EditorLoadableObject | undefined;
    oldSelectedObject: EditorLoadableObject | undefined;

    transform: Phoenix.Transform | undefined;

    targetY: number = 0;

    optionsOpen: { value: boolean };
    oldOptionsOpen: boolean;

    constructor (selectedObject: EditorLoadableObject | undefined, optionsOpen: { value: boolean }) {
        super();
        this.selectedObject = selectedObject;
        this.targetY = -window.innerHeight / 2 - 128 - 16;
        this.optionsOpen = optionsOpen;
        this.oldOptionsOpen = optionsOpen.value;
    }

    public override onInitialized(): void {
        this.transform = this.parent?.getComponent(Phoenix.Transform);
    }

    public override onUpdate(): void {
        this.transform!.position.y += (this.targetY - this.transform!.position.y) / 4;

        if (!this.optionsOpen.value && this.oldOptionsOpen) {
            this.targetY = -window.innerHeight / 2 - 128 - 16;
        } else if (this.optionsOpen.value && !this.oldOptionsOpen && this.selectedObject) {
            this.targetY = -window.innerHeight / 2 + 128 + 16;
        }
        this.oldOptionsOpen = this.optionsOpen.value;
    }

    setSelectedObject(selectedObject: EditorLoadableObject | undefined) {
        this.selectedObject = selectedObject;
        this.loadUI();
    }

    loadUI() {
        if (!this.parent) return;

        for (const child of this.parent.children) {
            child.onDestroyed();
        }

        if (!this.selectedObject || !this.optionsOpen.value) {
            this.targetY = -window.innerHeight / 2 - 128 - 16;
            return;
        }

        this.targetY = -window.innerHeight / 2 + 128 + 16;

        let uiRowY = 128 - ( 12 + 18 )

        this.parent.addChild(this.parent.app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(
                    -192 + 16 + 24,
                    uiRowY
                ),
                0,
                new Phoenix.Vector2(
                    42, 42
                )
            ),
            new Phoenix.Sprite("assets/icons/edit.png"),
            new Phoenix.UIRenderer(2)
        ))

        const titleText = new Phoenix.TextSprite("Options", {
            fontSize: 24, fontColor: "white", backgroundHeight: 30
        })
        this.parent.addChild(this.parent.app.createObject(
            new Phoenix.Transform(
                new Phoenix.Vector2(
                    -192 + titleText.texture!.width / 2 + 24 + 32 + 12,
                    uiRowY + 2
                ),
                0,
                new Phoenix.Vector2(
                    titleText.texture!.width,
                    titleText.texture!.height
                )
            ),
            titleText,
            new Phoenix.UIRenderer(2)
        ))

        uiRowY -= titleText.texture!.height + 12

        if (this.selectedObject.type !== "dynamic") {

            const collisionText = new Phoenix.TextSprite("Collision Enabled", {
                fontSize: 16, fontColor: "white"
            })
            this.parent.addChild(this.parent.app.createObject(
                new Phoenix.Transform(
                    new Phoenix.Vector2(
                        -192 + collisionText.texture!.width / 2 + 24,
                        uiRowY + 2
                    ),
                    0,
                    new Phoenix.Vector2(
                        collisionText.texture!.width,
                        collisionText.texture!.height
                    )
                ),
                collisionText,
                new Phoenix.UIRenderer(2)
            ))

            this.parent.addChild(this.parent.app.createObject(
                new Phoenix.Transform(
                    new Phoenix.Vector2(
                        142,
                        uiRowY
                    ),
                    0,
                    new Phoenix.Vector2(
                        48,
                        24
                    )
                ),
                new Switch({ value: (this.selectedObject?.data as TileData).hasCollision }, (active: boolean) => {
                    (this.selectedObject?.data as TileData).hasCollision = active;
                })
            ))
        }
    }
}