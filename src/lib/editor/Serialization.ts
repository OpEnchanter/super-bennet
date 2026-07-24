import type { DynamicTileData, LoadableObject } from "../scene/Types";
import type { EditorLoadableObject } from "./Types";

export function serializeEditorScene(scene: Array<EditorLoadableObject>) {
    const out: {
        objects: LoadableObject[]
    } = {
        objects: []
    };
    for (const obj of scene) {
        const sObj = {
            type: structuredClone(obj.type),
            data: structuredClone(obj.data)
        } as LoadableObject;

        if (obj.type === "dynamic") {
            (sObj.data as {options: Object}).options = Object.fromEntries((obj.data as DynamicTileData).options);
        }

        out.objects.push(sObj);
    }
    return JSON.stringify(out);
}