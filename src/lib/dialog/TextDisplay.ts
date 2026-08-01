import * as Phoenix from "phoenix";
import * as THREE from "three";

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
    fontSize = 32;

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
        let paragraphIndex = 0;
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
        this.setText(`(Mr. Bennet approaches an officer)
Mr. Bennet: Good day, sir.
Officer Adam: Good day to you too!
Mr. Bennet: Perchance, have you seen a young lady by the name of Lydia Bennet around here?
Officer Adam: I haven’t spoken to any lady since the day my mother passed…
Mr. Bennet: I’m sorry sir.
Officer Adam: However! I did see a young man running through this town with a lady, she looked ecstatic to be with him. I do wish I had some company though…
Mr. Bennet: Eureka! That sounds just like my Lydia! Which way were they headed?
Officer Adam: I believe they were headed that way, to… Meryton.
Mr. Bennet: I offer you my utmost gratitude for your service, good sir!
Officer Adam: Absolutely! (I sure do wish I had a daughter to save…)
(Mr. Bennet runs off to Meryton)
`)
    }

    public override onUpdate(): void {
        const writeSpeed = this.parent?.app.getKey("shift") ? 2 : 1;
        this.charIndex += writeSpeed;
        if (this.charIndex <= this.pages[this.pageIndex]!.length) {
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