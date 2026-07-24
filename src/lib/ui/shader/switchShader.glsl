in vec2 fragTexCoord;

uniform sampler2D uTex;

uniform bool val;

out vec4 fragColor;

vec4 linearToSRGB(vec4 value) {
    return vec4(mix(pow(value.rgb, vec3(1.0 / 2.2)), value.rgb * 12.92, lessThanEqual(value.rgb, vec3(0.0031308))), value.a);
}

void main() {
    vec4 p1 = texture(uTex, fragTexCoord);

    float borderSize = 6.0;

    vec2 texSize = vec2(textureSize(uTex, 0));

    if (val) {
        p1 = vec4(0.24,0.54,0.28,1.0);
    } else {
        p1 = vec4(0.894,0.231,0.267,1.0);
    }

    if (
        fragTexCoord.x * texSize.x < borderSize || fragTexCoord.x * texSize.x > texSize.x - borderSize ||
        fragTexCoord.y * texSize.y < borderSize || fragTexCoord.y * texSize.y > texSize.y - borderSize
    ) {
        p1.rgb -= vec3(0.3, 0.3, 0.3);
    }
    
    fragColor = p1;
}