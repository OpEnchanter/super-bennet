import type { LoadableObject } from "../scene/Types";
import type { EditorLoadableObject } from "./Types";

export function serializeEditorScene(scene: Array<EditorLoadableObject>) {
    const out: {
        objects: LoadableObject[]
    } = {
        objects: []
    };
    for (const obj of scene) {
        out.objects.push({
            type: obj.type,
            data: obj.data
        } as LoadableObject);
    }
    return JSON.stringify(out);
}