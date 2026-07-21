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

export type ObjectBounds = {
    position: {x:number, y:number},
    scale: {x:number, y:number}
}

export type TileConfigSchema = {
    tiles: Record<string, string>,
    tileSets: Record<string, TileSetSchema>,
    dynamicTiles: Record<string, DynamicTileSchema>
}