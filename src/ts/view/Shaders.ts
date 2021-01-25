import {MathUtils} from "utils/MathUtils";
import {Constants} from "utils/Constants";

export class Shaders
{
	public static get vertexShader()
	{
		return `precision highp float;

attribute vec3 vertPosition;

varying vec3 vsRay;

uniform float zoomFactor;
uniform vec3 fw;
uniform float ratio;

void main()
{
	gl_Position = vec4(zoomFactor * vertPosition, 1.0);

	vec3 worldUp = vec3(0, 1, 0);
	vec3 camRight = normalize(cross(fw, worldUp));
	vec3 camUp = normalize(cross(camRight, fw));

	vec3 corner = fw * ${MathUtils.getForwardLengthFromFOV(Constants.FOV)} + ratio*camRight*vertPosition.x + camUp*vertPosition.y;

	vsRay = corner;
}`
	};

	public static get fragmentShader()
	{
		return `precision highp float;

#define PI 3.14159265359
#define rayOrigin vec3(0.0, 0.0, 0.0)
#define SKY vec3(0.1, 0.1, 0.11)
#define EPSILON 0.0001

varying vec3 vsRay;

uniform sampler2D texture;
uniform vec4 textureViewBox;

// Based on https://www.shadertoy.com/view/ldS3DW
// But optimized (we're using the origo as center, and 1 as radius), + we're always inside the sphere
float intersectSphere(vec3 ro, vec3 rd)
{
	vec3 rc = ro;
	float c = dot(rc, rc) - 1.0;
	float b = dot(rd, rc);
	float d = b*b - c;
	float t = -b + sqrt(abs(d));

	return t;
}

vec3 getColor(in sampler2D texture, in vec2 sphereUV, in vec4 textureViewBox)
{
	if ((textureViewBox.x <= sphereUV.x && sphereUV.x <= textureViewBox.z) && (textureViewBox.y <= sphereUV.y && sphereUV.y <= textureViewBox.w))
	{
		vec2 imageUV = vec2(
			(sphereUV.x - textureViewBox.x) / (textureViewBox.z - textureViewBox.x),
			(sphereUV.y - textureViewBox.y) / (textureViewBox.w - textureViewBox.y)
		);

		// Anti-aliasing trick for the edge of the image

		float minX = abs(1.0 - (textureViewBox.z - textureViewBox.x)) < EPSILON ? 1.0 : min(abs(sphereUV.x - textureViewBox.x), abs(sphereUV.x - textureViewBox.z));
		float minY = abs(1.0 - (textureViewBox.w - textureViewBox.y)) < EPSILON ? 1.0 : min(abs(sphereUV.y - textureViewBox.y), abs(sphereUV.y - textureViewBox.w));
		float dist = min(minX, minY) * 2000.0;

		float factor = clamp(dist, 0.0, 1.0);

		return mix(SKY, texture2D(texture, imageUV).rgb, factor);
	}
	else
	{
		return SKY;
	}
}

void main()
{
	vec3 rayDirection = normalize(vsRay);

	float t = intersectSphere(rayOrigin, rayDirection);

	vec3 hitPoint = rayOrigin + rayDirection * t;

	vec2 sphereUV = vec2(
		0.5 + atan(hitPoint.z, hitPoint.x) / (2.0 * PI),
		0.5 - asin(hitPoint.y) / PI
	);

	vec3 color = getColor(texture, sphereUV, textureViewBox);

	gl_FragColor = vec4(color, 1.0);
}`;
	}
}