in vec2 fragTexCoord;

uniform sampler2D uTex;
uniform vec2 uPosition;
uniform vec4 uClipRect;

out vec4 fragColor;

vec4 linearToSRGB(vec4 value) {
    return vec4(mix(pow(value.rgb, vec3(1.0 / 2.2)), value.rgb * 12.92, lessThanEqual(value.rgb, vec3(0.0031308))), value.a);
}

void main() {
    vec4 p1 = texture(uTex, fragTexCoord);
    vec2 texSize = vec2(textureSize(uTex, 0));

    float L = uClipRect.x - (uClipRect.z / 2.0);
    float R = uClipRect.x + (uClipRect.z / 2.0);

    float B = uClipRect.y - (uClipRect.w / 2.0);
    float T = uClipRect.y + (uClipRect.w / 2.0);

    vec2 ftPx = (fragTexCoord - 0.5) * texSize;

    bool hIn = uPosition.x + ftPx.x > L &&
        uPosition.x + ftPx.x < R;

    bool vIn = uPosition.y + ftPx.y > B &&
        uPosition.y + ftPx.y < T;

    bool In = hIn && vIn;

    if (!In) {
        p1.a = 0.0;
    }

    
    fragColor = p1;
}