import {MathUtils} from "utils/MathUtils";
import {Constants} from "utils/Constants";

export class Shaders
{
	public static get vertexShader()
	{
		return (
`precision highp float;

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
}`);
	};

	public static get fragmentShader()
	{
		return (
`#ifdef GL_EXT_shader_texture_lod
	#extension GL_EXT_shader_texture_lod : enable
#endif

precision highp float;

#define PI 3.14159265359
#define rayOrigin vec3(0.0, 0.0, 0.0)
#define SKY vec3(0.1, 0.1, 0.11)
#define EPSILON 0.0001

varying vec3 vsRay;
varying vec3 movementDirection;

uniform sampler2D textureMap;
uniform float maxTextureLevel;
uniform bool isBlurOn;
uniform bool isX360;
uniform bool isY180;
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

/**
 * x should be between a and b.
 * The result will be between 0 and 1, keeping the proper ratios of x to a and b
 */
float getInterpolation(in float a, in float b, in float x)
{
	return ((x - a) / (b - a));
}

vec3 getColor(in vec2 sphereUV, in vec4 textureViewBox)
{
	vec2 imageUV = vec2(
		getInterpolation(textureViewBox.x, textureViewBox.z, sphereUV.x + (textureViewBox.z + textureViewBox.x) - 1.0),
		getInterpolation(textureViewBox.y, textureViewBox.w, sphereUV.y + (textureViewBox.y + textureViewBox.w) - 1.0)
	);

	float mixMultiplier = 0.0;
	float blurMultiplier = 0.0;
	bool transitionNeeded = false;
	float transitionSize = isBlurOn ? 0.01 : 0.001;

	// Top
	if (1.0 - transitionSize > textureViewBox.w && sphereUV.y < (1.0 - textureViewBox.w + transitionSize))
	{
		transitionNeeded = true;
		blurMultiplier = getInterpolation(1.0 - textureViewBox.w + transitionSize, 0.0, sphereUV.y);
		mixMultiplier = smoothstep(1.0 - textureViewBox.w + transitionSize, 1.0 - textureViewBox.w, sphereUV.y);
	} // Bottom
	else if (transitionSize < textureViewBox.y && sphereUV.y > (1.0 - textureViewBox.y - transitionSize))
	{
		transitionNeeded = true;
		blurMultiplier = getInterpolation(1.0 - textureViewBox.y - transitionSize, 1.0, sphereUV.y);
		mixMultiplier = smoothstep(1.0 - textureViewBox.y - transitionSize, 1.0 - textureViewBox.y, sphereUV.y);
	}

	if (1.0 - transitionSize > textureViewBox.z && sphereUV.x < (1.0 - textureViewBox.z + transitionSize))
	{ // Left
		transitionNeeded = true;
		blurMultiplier = max(blurMultiplier, getInterpolation(1.0 - textureViewBox.z + transitionSize, 0.0, sphereUV.x));
		mixMultiplier = max(mixMultiplier, smoothstep(1.0 - textureViewBox.z + transitionSize, 1.0 - textureViewBox.z, sphereUV.x));
	}
	else if (transitionSize < textureViewBox.x && sphereUV.x > (1.0 - textureViewBox.x - transitionSize))
	{ // Right
		transitionNeeded = true;
		blurMultiplier = max(blurMultiplier, getInterpolation(1.0 - textureViewBox.x - transitionSize, 1.0, sphereUV.x));
		mixMultiplier = max(mixMultiplier, smoothstep(1.0 - textureViewBox.x - transitionSize, 1.0 - textureViewBox.x, sphereUV.x));
	}

	vec3 baseSample = texture2DLodEXT(textureMap, imageUV, 0.0).rgb;

	if (isBlurOn && transitionNeeded)
	{
		if (transitionNeeded)
		{
			blurMultiplier = clamp((0.5 + sqrt(blurMultiplier)) / 1.5, 0.0, 1.0);
		}

		bool shouldFixVerticalSeam = !isX360 && isY180;

		float medianLodLevel = blurMultiplier * max(1.0, (maxTextureLevel - (shouldFixVerticalSeam ? 0.0 : 0.5)));

		return mix(
			baseSample,
			(
				(shouldFixVerticalSeam ? vec3(0.0) : 
				1.0 * texture2DLodEXT(textureMap, imageUV, medianLodLevel - 1.0).rgb) +
				2.0 * texture2DLodEXT(textureMap, imageUV, medianLodLevel).rgb +
				1.0 * texture2DLodEXT(textureMap, imageUV, medianLodLevel + 1.0).rgb
			) / (4.0 - (shouldFixVerticalSeam ? 1.0 : 0.0)),
			mixMultiplier
		);
	}
	else
	{
		return mix(
			baseSample,
			SKY,
			mixMultiplier
		);
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

	vec3 color = getColor(sphereUV, textureViewBox);

	gl_FragColor = vec4(color, 1.0);
}`);
	}
}