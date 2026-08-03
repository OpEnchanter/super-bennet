import * as Phoenix from "phoenix";
import * as THREE from "three";
import type { LevelLoader } from "../scene/Loader";

// In-Game text display 
// (shows text in a light brown box at the top of the screen while player is playing a level)
export class TextDisplay extends Phoenix.Component {
    pages: string[] = [];
    pageIndex: number = 0;
    charIndex: number = 0;

    meshes: THREE.Mesh[] = [];
    textMesh: THREE.Mesh | undefined;
    textCanvas: HTMLCanvasElement | undefined;

    textAreaSize: Phoenix.Vector2 | undefined;

    margin: number;
    height: number;
    tileSize = 128;
    fontSize = 42;

    constructor(margin: number, height: number) {
        super();
        this.margin = margin;
        this.height = height;
    }

    // Adding a single page of text to the textbox
    public addPage(text: string) {
        this.pages.push(text);
    }

    // Delete the current contents of the textbox and replace it with new text
    // Also automatically split text into multiple pages
    public setText(text: string) {
        this.pages.length = 0;
        const ctx = this.textCanvas?.getContext("2d");
        ctx!.font = `${this.fontSize}px PixelTimesNewRoman`
        ctx!.fillStyle = "black"
        ctx!.textBaseline = "top";

        const maxWidth = this.textAreaSize!.x

        let curPageLines: string[] = [];
        let currentLine = "";
        for (const paragraph of text.split("\n")) {
            let words = paragraph.split(" ");
            for (const word of words) {
                // Move text to a new line if its going to go off screen
                if (ctx!.measureText(`${currentLine} ${word}`).width > maxWidth) {
                    curPageLines.push(currentLine);
                    currentLine = "";
                }
                // Add current word to line
                currentLine = `${currentLine} ${word}`;

                // If current collection of lines will go off screen
                // go to the next page
                if ((curPageLines.length + 1) * this.fontSize > this.height) {
                    this.pages.push(curPageLines.join("\n"));
                    curPageLines = [];
                }
            }
            curPageLines.push(currentLine);
            currentLine = "";

            if ((curPageLines.length + 1) * this.fontSize > this.height) {
                this.pages.push(curPageLines.join("\n"));
                curPageLines = [];
            }
        }
        if (currentLine != "") {curPageLines.push(currentLine); currentLine = ""; }
        if (curPageLines.length > 0) this.pages.push(curPageLines.join("\n"));

        this.setVisible(true);

        this.pageIndex = 0;
        this.charIndex = 0;
    }

    // Set the visibility of the textbox 
    // (mostly for internal use to hide the textbox when player has read all the text)
    public setVisible(visible: boolean) {
        for (const mesh of this.meshes) {
            mesh.visible = visible;
        }

        this.textMesh!.visible = visible;
    }

    // Load all the textures
    private loadTextMesh() {
        this.textCanvas = document.createElement("canvas");

        const LeftX = -window.innerWidth / 2 + this.margin + this.tileSize / 2
        const RightX = window.innerWidth / 2 - this.margin - this.tileSize / 2

        const TopY = window.innerHeight / 2 - this.margin - this.tileSize / 2
        const BottomY = TopY - this.height;

        this.textAreaSize = new Phoenix.Vector2((RightX - LeftX), (TopY - BottomY)); 
        this.textCanvas.width = this.textAreaSize.x;
        this.textCanvas.height = this.textAreaSize.y;

        const ctx = this.textCanvas.getContext("2d");
        ctx?.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);
        
        const texture = new THREE.CanvasTexture(this.textCanvas);
        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader: Phoenix.DefaultVertexShader,
            fragmentShader: Phoenix.DefaultFragmentShader,
            uniforms: {
                uTex: { value: texture }
            },
            transparent: true
        })

        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(this.textAreaSize.x, this.textAreaSize.y),
            material
        )

        mesh.position.set(
            (LeftX + RightX) / 2,
            (TopY * 2 - this.height) / 2,
            1
        )

        this.textMesh = mesh;
        this.parent?.app.screenSpaceScene.add(this.textMesh);
    }

    // Draw text to the texture
    private updateTextMesh(text: string) {
        const ctx = this.textCanvas!.getContext("2d");
        ctx!.fillStyle = "red";
        ctx?.clearRect(0, 0, this.textCanvas!.width, this.textCanvas!.height);

        ctx!.font = `${this.fontSize}px PixelTimesNewRoman`;
        ctx!.fillStyle = "black";
        ctx!.textBaseline = "top";

        const maxWidth = this.textAreaSize!.x

        let lineIndex = 0;
        for (const blob of text.split("\n")) {
            let subStr = "";
            let words = blob.split(" ");
            for (const word of words) {
                if (ctx!.measureText(`${subStr} ${word}`).width > maxWidth) {
                    ctx?.fillText(subStr, 0, (lineIndex * this.fontSize));
                    lineIndex++;
                    subStr = "";
                }
                subStr = `${subStr} ${word}`;
            }
            (subStr !== "" && ctx?.fillText(subStr, 0, (lineIndex * this.fontSize)));
            lineIndex++;
        }
        ((this.textMesh?.material as THREE.ShaderMaterial).uniforms.uTex?.value as THREE.CanvasTexture).needsUpdate = true;
    }

    public override onInitialized(): void {
        // Initialize the meshes that make up the background of the text field

        // Corners
        const cornerTextures = [
            "assets/tiles/textbox/textbox-top-left.png", // Top left
            "assets/tiles/textbox/textbox-top-right.png", // Top right
            "assets/tiles/textbox/textbox-bottom-left.png", // Bottom left
            "assets/tiles/textbox/textbox-bottom-right.png" // Bottom right
        ];

        const cornerPositions = [
            new Phoenix.Vector2( // Top left
                -window.innerWidth/2 + this.margin + this.tileSize / 2, 
                window.innerHeight/2 - this.margin - this.tileSize / 2
            ),
            new Phoenix.Vector2( // Top right
                window.innerWidth/2 - this.margin - this.tileSize / 2, 
                window.innerHeight/2 - this.margin - this.tileSize / 2
            ),
            new Phoenix.Vector2( // Bottom left
                -window.innerWidth/2 + this.margin + this.tileSize / 2, 
                window.innerHeight/2 - this.margin - this.height - this.tileSize / 2
            ),
            new Phoenix.Vector2( // Bottom right
                window.innerWidth/2 - this.margin - this.tileSize / 2, 
                window.innerHeight/2 - this.margin - this.height - this.tileSize / 2
            ),
        ]

        for (const tex of cornerTextures) {
            const texture = new THREE.TextureLoader().load(tex);
            texture.minFilter = THREE.NearestFilter;
            texture.magFilter = THREE.NearestFilter;
            texture.colorSpace = THREE.SRGBColorSpace;
            const material = new THREE.ShaderMaterial({
                glslVersion: THREE.GLSL3,
                vertexShader: Phoenix.DefaultVertexShader,
                fragmentShader: Phoenix.DefaultFragmentShader,
                uniforms: {
                    uTex: { value: texture }
                },
                transparent: true
            });

            const mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(this.tileSize, this.tileSize),
                material
            );

            const cornerIndex = cornerTextures.indexOf(tex);
            mesh.position.set(
                cornerPositions[cornerIndex]!.x,
                cornerPositions[cornerIndex]!.y,
                0
            )
            
            this.meshes.push(mesh);
            this.parent?.app.screenSpaceScene.add(mesh)
        }

        // Edges
        const edgeTextures = [
            "assets/tiles/textbox/textbox-top.png", // Top
            "assets/tiles/textbox/textbox-bottom.png", // Bottom
            "assets/tiles/textbox/textbox-left.png", // Left
            "assets/tiles/textbox/textbox-right.png" // Right
        ]

        // Only two sizes need to be defined because top and bottom are the same as well as left and right
        const edgeSizes = [
            new Phoenix.Vector2(
                (cornerPositions[1]!.x - (this.tileSize / 2)) - 
                (cornerPositions[0]!.x + (this.tileSize / 2)), 
                this.tileSize
            ), // Top / bottom
            new Phoenix.Vector2(
                this.tileSize,
                (cornerPositions[0]!.y - (this.tileSize / 2)) - 
                (cornerPositions[3]!.y + (this.tileSize / 2))
            ) // Left / right
        ] 
        
        const edgePositions = [
            new Phoenix.Vector2( // Top
                0, window.innerHeight/2 - this.margin - this.tileSize / 2
            ),
            new Phoenix.Vector2( // Bottom
                0, window.innerHeight/2 - this.margin - this.tileSize / 2 - this.height
            ),
            new Phoenix.Vector2( // Left
                -window.innerWidth/2 + this.margin + this.tileSize / 2, 
                window.innerHeight/2 - this.margin - this.tileSize / 2 - this.height / 2
            ),
            new Phoenix.Vector2( // Right
                window.innerWidth/2 - this.margin - this.tileSize / 2, 
                window.innerHeight/2 - this.margin - this.tileSize / 2 - this.height / 2
            )
        ]

        for (const tex of edgeTextures) {
            const texture = new THREE.TextureLoader().load(tex);
            texture.minFilter = THREE.NearestFilter;
            texture.magFilter = THREE.NearestFilter;
            texture.colorSpace = THREE.SRGBColorSpace;
            const material = new THREE.ShaderMaterial({
                glslVersion: THREE.GLSL3,
                vertexShader: Phoenix.DefaultVertexShader,
                fragmentShader: Phoenix.DefaultFragmentShader,
                uniforms: {
                    uTex: { value: texture }
                },
                transparent: true
            })

            const sideIndex = edgeTextures.indexOf(tex);
            const mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(
                    edgeSizes[Math.floor(sideIndex/2)]!.x,
                    edgeSizes[Math.floor(sideIndex/2)]!.y
                ),
                material
            )

            mesh.position.set(
                edgePositions[sideIndex]!.x,
                edgePositions[sideIndex]!.y,
                0
            )

            this.meshes.push(mesh);
            this.parent?.app.screenSpaceScene.add(mesh);
        }

        // Center
        const texture = new THREE.TextureLoader().load("assets/tiles/textbox/textbox-center.png");
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader: Phoenix.DefaultVertexShader,
            fragmentShader: Phoenix.DefaultFragmentShader,
            uniforms: {
                uTex: { value: texture }
            },
            transparent: true
        });

        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(
                (cornerPositions[1]!.x - (this.tileSize / 2)) - 
                (cornerPositions[0]!.x + (this.tileSize / 2)),
                (cornerPositions[0]!.y - (this.tileSize / 2)) - 
                (cornerPositions[3]!.y + (this.tileSize / 2))
            ),
            material
        )

        mesh.position.set(
            (edgePositions[3]!.x + edgePositions[2]!.x) / 2,
            (edgePositions[1]!.y + edgePositions[0]!.y) / 2,
            0
        );

        this.meshes.push(mesh);
        this.parent?.app.screenSpaceScene.add(mesh);

        // Load the mesh that will display text
        this.loadTextMesh();
        this.setVisible(false);
    }

    public override onUpdate(): void {
        const writeSpeed = this.parent?.app.getKey("shift") ? 2 : 1;
        this.charIndex += writeSpeed;
        if (this.pageIndex < this.pages.length && this.charIndex <= this.pages[this.pageIndex]!.length) {
            this.updateTextMesh(this.pages[this.pageIndex]!.slice(0, Math.round(this.charIndex)));
        } else if (this.parent?.app.getKey(" ")) {
            if (this.pageIndex < this.pages.length - 1) {
                this.pageIndex++;
                this.charIndex = 0;
            } else {
                this.setVisible(false);
            }
        }
    }

    // Handle destruction of all of the meshes when parent object is unloaded
    public override onDestroyed(): void {
        for (const mesh of this.meshes) {
            this.parent?.app.screenSpaceScene.remove(mesh);
            (mesh.material as THREE.ShaderMaterial).dispose();
            mesh.geometry.dispose();
        }

        this.parent?.app.screenSpaceScene.remove(this.textMesh!);
        (this.textMesh!.material as THREE.ShaderMaterial).dispose();
        this.textMesh!.geometry.dispose();
    }
}


// Text display that takes up the entire screen, designed for dialog-only scenes.
export class FullscreenTextDisplay extends Phoenix.Component {
    pages: string[] = [];
    pageIndex: number = 0;
    charIndex: number = 0;

    background: THREE.Mesh | undefined;
    textMesh: THREE.Mesh | undefined;
    textCanvas: HTMLCanvasElement | undefined;

    textAreaSize: Phoenix.Vector2 | undefined;

    margin: number;
    height: number;
    fontSize = 32;
    lineHeight = 48;

    levelManager: LevelLoader;

    text: string;

    charTimes: number[] = [];

    constructor(margin: number, levelManager: LevelLoader, text: string) {
        super();
        this.margin = margin;
        this.height = window.innerHeight - (margin * 2);
        this.levelManager = levelManager;
        this.text = text;
    }

    // Adding a single page of text to the textbox
    public addPage(text: string) {
        this.pages.push(text);
    }

    // Delete the current contents of the textbox and replace it with new text
    // Also automatically split text into multiple pages
    public setText(text: string) {
        this.pages.length = 0;
        const ctx = this.textCanvas?.getContext("2d");
        ctx!.font = `${this.fontSize}px PixelTimesNewRoman`
        ctx!.fillStyle = "black"
        ctx!.textBaseline = "top";

        this.charTimes = [];

        const maxWidth = this.textAreaSize!.x

        let curPageLines: string[] = [];
        let currentLine = "";

        for (const paragraph of text.split("\n")) {
            let words = paragraph.split(" ");
            for (const word of words) {
                // Remove all of the formatting symbols from the text
                const rawWord = word
                    .replaceAll("/r", "") // Red formatting
                    .replaceAll("/g", "") // Green formatting
                    .replaceAll("/b", "") // Blue formatting
                    .replaceAll("/s", "") // Shaky formatting

                // Move text to a new line if its going to go off screen
                if (ctx!.measureText(`${currentLine} ${rawWord}`).width > maxWidth) {
                    curPageLines.push(currentLine);
                    currentLine = "";
                }
                // Add current word to line
                currentLine = `${currentLine} ${word}`;

                // If current collection of lines will go off screen
                // go to the next page
                if ((curPageLines.length + 1) * this.lineHeight > this.height) {
                    this.pages.push(curPageLines.join("\n"));
                    curPageLines = [];
                }
            }
            curPageLines.push(currentLine);
            currentLine = "";

            if ((curPageLines.length + 1) * this.lineHeight > this.height) {
                this.pages.push(curPageLines.join("\n"));
                curPageLines = [];
            }
        }
        if (currentLine != "") {curPageLines.push(currentLine); currentLine = ""; }
        if (curPageLines.length > 0) this.pages.push(curPageLines.join("\n"));

        this.pageIndex = 0;
        this.charIndex = 0;
    }

    // Load all the textures
    private loadTextMesh() {
        this.textCanvas = document.createElement("canvas");

        const LeftX = -window.innerWidth / 2 + this.margin;
        const RightX = window.innerWidth / 2 - this.margin;

        const TopY = window.innerHeight / 2 - this.margin;
        const BottomY = TopY - this.height;

        this.textAreaSize = new Phoenix.Vector2((RightX - LeftX), (TopY - BottomY)); 
        this.textCanvas.width = this.textAreaSize.x;
        this.textCanvas.height = this.textAreaSize.y;

        const ctx = this.textCanvas.getContext("2d");
        ctx?.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);
        
        const texture = new THREE.CanvasTexture(this.textCanvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader: Phoenix.DefaultVertexShader,
            fragmentShader: Phoenix.DefaultFragmentShader,
            uniforms: {
                uTex: { value: texture }
            },
            transparent: true
        })

        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(this.textAreaSize.x, this.textAreaSize.y),
            material
        )

        mesh.position.set(
            (LeftX + RightX) / 2,
            (TopY * 2 - this.height) / 2,
            1
        )

        this.textMesh = mesh;
        this.parent?.app.screenSpaceScene.add(this.textMesh);
    }

    // Draw text to the texture
    private updateTextMesh(text: string) {
        const ctx = this.textCanvas!.getContext("2d");
        ctx?.clearRect(0, 0, this.textCanvas!.width, this.textCanvas!.height);

        ctx!.font = `${this.fontSize}px PixelTimesNewRoman`;
        ctx!.fillStyle = "#c0cbdc";
        ctx!.textBaseline = "middle";

        const maxWidth = this.textAreaSize!.x

        const colors = {
            "white": [192, 203, 220],
            "red": [255, 195, 215],
            "green": [195, 255, 215],
            "blue": [195, 215, 255]
        }

        let lineIndex = 0;
        let charsWritten = 0;
        let xPos = 0;
        let yOffset = this.fontSize / 2;
        let subStrFormatting = [];
        for (const blob of text.split("\n")) {
            let subStr = "";
            let words = blob.split(" ");
            for (const word of words) {
                // Remove all of the formatting symbols from the text
                const text = word
                    .replaceAll("/r", "") // Red formatting
                    .replaceAll("/g", "") // Green formatting
                    .replaceAll("/b", "") // Blue formatting
                    .replaceAll("/s", "") // Shaky formatting

                const formattingCode = word.slice(0, 2);

                for (let i = 0; i < text.length + 1; i++) {
                    subStrFormatting.push(formattingCode);
                }

                if (ctx!.measureText(`${subStr} ${text}`).width > maxWidth) {
                    let cidx = 0;
                    for (const c of subStr) {
                        const fstring = subStrFormatting[cidx];
                        let color = colors.white;

                        if (fstring === "/r") color = colors.red;
                        if (fstring === "/g") color = colors.green;
                        if (fstring === "/b") color = colors.blue;

                        if (!this.charTimes[charsWritten]) {
                            this.charTimes[charsWritten] = this.parent!.app.time;
                        }

                        const charFontSize = 
                            this.fontSize +
                            Math.min(0, this.parent!.app.time - (this.charTimes[charsWritten]! + 10))

                        ctx!.font = `${charFontSize}px PixelTimesNewRoman`;
                        const cc = Math.min(0, this.parent!.app.time - (this.charTimes[charsWritten]! + 10)) * -20;
                        ctx!.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]! + cc})`

                        ctx?.fillText(c, xPos, (lineIndex * this.lineHeight) + yOffset);
                        charsWritten++;
                        xPos += ctx!.measureText(c).width;
                        cidx++;
                    }
                    lineIndex++;
                    xPos = 0;
                    subStr = "";
                    subStrFormatting = [];
                }
                subStr = `${subStr} ${text}`;
            }
            if (subStr !== "") {
                let cidx = 0;
                for (const c of subStr) {
                    const fstring = subStrFormatting[cidx];
                    let color = colors.white;

                    if (fstring === "/r") color = colors.red;
                    if (fstring === "/g") color = colors.green;
                    if (fstring === "/b") color = colors.blue;

                    if (!this.charTimes[charsWritten]) {
                        this.charTimes[charsWritten] = this.parent!.app.time;
                    }

                    const charFontSize = 
                        this.fontSize +
                        Math.min(0, this.parent!.app.time - (this.charTimes[charsWritten]! + 10))

                    ctx!.font = `${charFontSize}px PixelTimesNewRoman`;
                    const cc = Math.min(0, this.parent!.app.time - (this.charTimes[charsWritten]! + 10)) * -20;
                    ctx!.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]! + cc})`;

                    let cx = xPos;
                    let cy = (lineIndex * this.lineHeight) + yOffset;

                    if (fstring === "/s") { 
                        cx += (Math.random() - 0.5) * 2; 
                        cy += (Math.random() - 0.5) * 2
                    }

                    ctx?.fillText(c, cx, cy);
                    charsWritten++;
                    xPos += ctx!.measureText(c).width;
                    cidx++;
                }
            }
            xPos = 0;
            lineIndex++;
            subStr = "";
            subStrFormatting = [];
        }
        ((this.textMesh?.material as THREE.ShaderMaterial).uniforms.uTex?.value as THREE.CanvasTexture).needsUpdate = true;
    }

    public override onInitialized(): void {
        // Create a large mesh that takes up the entire screen, covering it in blacks
        const blackCanvas = document.createElement("canvas");
        blackCanvas.width = 1; blackCanvas.height = 1;
        const ctx = blackCanvas.getContext("2d");
        ctx!.fillStyle = "#262b44";
        ctx!.fillRect(0,0,1,1);

        const texture = new THREE.CanvasTexture(blackCanvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader: Phoenix.DefaultVertexShader,
            fragmentShader: Phoenix.DefaultFragmentShader,
            uniforms: {
                uTex: { value: texture }
            },
            transparent: true
        });

        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(window.innerWidth, window.innerHeight),
            material
        );

        this.background = mesh;
        this.parent?.app.screenSpaceScene.add(mesh);

        // Load the mesh that will display text
        this.loadTextMesh();

        const text = this.text.replaceAll(/\u2026/g, '...')

        this.setText(text);
    }

    public override onUpdate(): void {
        let writeSpeed = this.parent?.app.getKey("shift") ? 2 : 0.5;

        const curChar = this.pages[this.pageIndex]![Math.round(this.charIndex-1)];

        const preTwoChar = this.pages[this.pageIndex]!.slice(this.charIndex-3, this.charIndex-1);
        const preThreeChar = this.pages[this.pageIndex]!.slice(this.charIndex-4, this.charIndex-1);

        if (curChar === "." || curChar === "!" || curChar === "?") {
            // Keep the speed the same if the period is denoting a pronoun
            if (preTwoChar !== "Mr" && preThreeChar !== "Mrs") {
                writeSpeed /= 8
            }
        } else if (curChar === ",") {
            writeSpeed /= 2
        }

        this.charIndex += writeSpeed;
        if (this.pageIndex < this.pages.length) {
            this.updateTextMesh(this.pages[this.pageIndex]!.slice(0, Math.round(this.charIndex)));
        } 
        
        if (this.parent?.app.getKey(" ") && this.charIndex >= this.pages[this.pageIndex]!.length) {
            if (this.pageIndex < this.pages.length - 1) {
                this.pageIndex++;
                this.charIndex = 0;
                this.charTimes = [];
            } else {
                this.levelManager.nextLevel();
            }
        }
    }

    // Handle destruction of all of the meshes when parent object is unloaded
    public override onDestroyed(): void {
        this.parent?.app.screenSpaceScene.remove(this.background!);
        (this.background!.material as THREE.ShaderMaterial).dispose();
        this.background!.geometry.dispose();

        this.parent?.app.screenSpaceScene.remove(this.textMesh!);
        (this.textMesh!.material as THREE.ShaderMaterial).dispose();
        this.textMesh!.geometry.dispose();
    }
}