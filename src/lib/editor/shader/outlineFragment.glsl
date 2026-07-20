in vec2 fragTexCoord;

uniform sampler2D uTex;
uniform vec2 uOverlaySize;
uniform float time;

out vec4 fragColor;

void main() {

    vec2 texSize = vec2(textureSize(uTex, 0));

    const float borderSize = 2.0;
    const float handleGap = 10.0;

    vec4 highlightColor = vec4(0.0, 0.0, 0.0, 0.4);

    float pxHighlight = (sin(
        fragTexCoord.x * uOverlaySize.x * 0.01 + 
        fragTexCoord.y * uOverlaySize.y * 0.01 + 
        time / 100.0
    ) + 1.0) / 2.0;

    vec4 borderColor = vec4(
        1.0 - pxHighlight, 
        1.0 - pxHighlight / 100.0, 
        1.0, 
        1.0);

    vec4 p1 = highlightColor;
    if (fragTexCoord.x * uOverlaySize.x < borderSize) {
        p1 = borderColor;
    }

    if (fragTexCoord.x * uOverlaySize.x > uOverlaySize.x - borderSize) {
        if (abs(fragTexCoord.y * uOverlaySize.y - uOverlaySize.y / 2.0) > handleGap) {
            p1 = borderColor;   
        }
    }

    if (fragTexCoord.y * uOverlaySize.y < borderSize) {
        if (abs(fragTexCoord.x * uOverlaySize.x - uOverlaySize.x / 2.0) > handleGap) {
            p1 = borderColor;   
        }
    }

    if (fragTexCoord.y * uOverlaySize.y > uOverlaySize.y - borderSize) {
        p1 = borderColor;
    }

    fragColor = p1;
}