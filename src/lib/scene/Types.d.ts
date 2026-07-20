export type TileData = {
    position: {
        x: number,
        y: number
    },
    scale: {
        x: number,
        y: number
    },
    sprite: string,
    hasCollision: boolean
}

export type TileSetData = {
    position: {
        x: number,
        y: number
    },
    scale: {
        x: number,
        y: number
    },
    sprite: string,
    hasCollision: boolean
}

export type DynamicTileData = {
    position: {
        x: number,
        y: number
    },
    name: string,
    options: Object
}

export type LoadableObject = {
    type: string,
    data: Object
}