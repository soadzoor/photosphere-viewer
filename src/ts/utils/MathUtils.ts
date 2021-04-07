import {VectorUtils} from "./VectorUtils";

export class MathUtils
{
	public static clamp(num: number, min: number, max: number)
	{
		return num <= min ? min : num >= max ? max : num;
	}

	public static isValidNumber(value: number)
	{
		if (value === null) return false;
		if (value === undefined) return false;
		if (isNaN(value)) return false;
		if (value === Infinity) return false;
		if (value === -Infinity) return false;

		return true;
	}

	public static deg2rad(deg: number)
	{
		return (Math.PI / 180) * deg;
	}

	public static rad2deg(rad: number)
	{
		return (180 / Math.PI) * rad;
	}

	public static getRandomInt(min: number, max: number)
	{
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	/**
	 * Returns camera's distance from the shader's plane
	 * @param fov Field of View of perspective camera
	 */
	public static getForwardLengthFromFOV(fov: number)
	{
		return (1 / Math.tan(MathUtils.deg2rad(fov / 2)));
	}

	// convert to range [-1, 1]
	public static getNormalizedCursorCoords(clientX: number, clientY: number, viewBox: number[])
	{
		return [
			2 * ((clientX / viewBox[0]) - 0.5),
			2 * (((viewBox[1] - clientY) / viewBox[1]) - 0.5)
		];
	}

	/**
	 *
	 * @param u [0, 2*PI]
	 * @param v [0, PI]
	 */
	public static getSphereSurfacePointFromUV(u: number, v: number)
	{
		const vector = [
			Math.cos(u) * Math.sin(v),
			Math.cos(v),
			Math.sin(u) * Math.sin(v)
		];

		return VectorUtils.normalize(vector);
	}

	/**
	 * UV in range of [0, 1]
	 * @param surfacePoint 
	 */
	public static getUVFromSphereSufracePoint(surfacePoint: number[])
	{
		const normalizedSurfacePoint = VectorUtils.normalize(surfacePoint);
		const u = 1 - (Math.PI - Math.atan2(normalizedSurfacePoint[2], normalizedSurfacePoint[0])) / (2 * Math.PI);
		const v = ((Math.PI / 2) - Math.asin(-normalizedSurfacePoint[1])) / Math.PI;

		return [
			u,
			v
		];
	}

	/**
	 * longitude in range of [0, 2*PI]
	 * latitude in range of [-PI / 2, PI / 2]
	 * UV in range of [0, 1]
	 */
	public static getLongitudeLatitudeFromUV(uv: number[])
	{
		return [
			2 * Math.PI * ((uv[0] + 0.5) % 1),
			Math.PI * (uv[1] - 0.5)
		];
	}

	public static isPowerOfTwo(value: number)
	{
		return (value & (value - 1)) === 0 && value !== 0;
	}

	public static ceilPowerOfTwo(value: number)
	{
		return Math.pow(2, Math.ceil(Math.log(value) / Math.LN2));
	}
}