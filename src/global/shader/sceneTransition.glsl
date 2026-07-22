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

    if (
        fragTexCoord.x + sin((-time / 20.0 + fragTexCoord.y) * 5.0) / 50.0 > coverStart && 
        fragTexCoord.x + sin((time / 20.0 + fragTexCoord.y) * 5.0) / 50.0 < coverEnd
        ) {
        p1 = vec4(0.1490,0.1686,0.2667,1.0);
    }
    
    fragColor = p1;
}