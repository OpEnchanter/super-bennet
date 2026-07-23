in vec2 fragTexCoord;

uniform sampler2D uTex;
uniform float t;

uniform float coverStart;
uniform float coverEnd;

uniform float time;

out vec4 fragColor;

vec4 linearToSRGB(vec4 value) {
    return vec4(mix(pow(value.rgb, vec3(1.0 / 2.2)), value.rgb * 12.92, lessThanEqual(value.rgb, vec3(0.0031308))), value.a);
}

void main() {
    vec4 p1 = texture(uTex, fragTexCoord);

    p1 = linearToSRGB(p1);

    float yCoord = round(fragTexCoord.y / 0.2) * 0.2;
    float startSin = fragTexCoord.x + sin((-time / 40.0 + yCoord) * 5.0) / 25.0;
    float endSin = fragTexCoord.x + sin((time / 40.0 + yCoord) * 5.0) / 25.0;

    if (
        startSin > coverStart && 
        endSin < coverEnd
        ) {
        p1 = vec4(0.1490,0.1686,0.2667,1.0);
    }
    
    fragColor = p1;
}