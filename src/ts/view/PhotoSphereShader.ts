import {MathUtils} from "utils/MathUtils";
import {Shaders} from "./Shaders";

export interface ITextureData
{
	textureData: TexImageSource;
	viewBox: number[];
	headingAngle: number;
}

interface ITexture
{
	texValue: WebGLTexture;
	texLoc: WebGLUniformLocation;
	viewBox: number[];
	viewBoxLoc: WebGLUniformLocation;
}

interface ISize
{
	width: number;
	height: number;
}

export class PhotoSphereShader
{
	private _gl: WebGLRenderingContext | WebGL2RenderingContext;
	private _glVersion: 1 | 2 = 1;
	private _isTextureLodExtensionAvailable: boolean;
	private _vertexShader: WebGLShader;
	private _fragmentShader: WebGLShader;
	private _program: WebGLProgram;

	private _ratio: {
		value: number;
		loc: WebGLUniformLocation
	} = {
		value: 1,
		loc: null
	};

	// LOD
	private _maxTextureLevel: {
		value: number;
		loc: WebGLUniformLocation;
	} = {
		value: 0,
		loc: null
	};

	private _isBlurOn: {
		value: boolean;
		loc: WebGLUniformLocation;
	} = {
		value: false,
		loc: null
	};

	private _isX360: {
		value: boolean;
		loc: WebGLUniformLocation;
	} = {
		value: false,
		loc: null
	};

	private _isY180: {
		value: boolean;
		loc: WebGLUniformLocation;
	} = {
		value: false,
		loc: null
	};

	private _zoomFactorLoc: WebGLUniformLocation = null;

	private _forward: {
		value: number[],
		loc: WebGLUniformLocation
	} = {
		value: [0, 0, -1],
		loc: null
	};

	private _texture: ITexture = {
		texValue: null,
		texLoc: null,
		viewBox: PhotoSphereShader.defaultViewBox,
		viewBoxLoc: null
	};

	private _isInitialTexture: boolean = true;

	constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, glVersion: 1 | 2, isTextureLodExtensionAvailable: boolean)
	{
		this._gl = gl;
		this._glVersion = glVersion;
		this._isTextureLodExtensionAvailable = isTextureLodExtensionAvailable;
		this._vertexShader = gl.createShader(gl.VERTEX_SHADER);
		this._fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

		gl.shaderSource(this._vertexShader, this.vertexShader);
		gl.shaderSource(this._fragmentShader, this.fragmentShader);

		try
		{
			this.compileShaders();
			this.initProgram();

			this._ratio.loc = this._gl.getUniformLocation(this._program, "ratio");
			this._zoomFactorLoc = this._gl.getUniformLocation(this._program, "zoomFactor");
			this._forward.loc = this._gl.getUniformLocation(this._program, "fw");
			this._texture.texLoc = this._gl.getUniformLocation(this._program, "texture");
			this._texture.viewBoxLoc = this._gl.getUniformLocation(this._program, "textureViewBox");
			this._maxTextureLevel.loc = this._gl.getUniformLocation(this._program, "maxTextureLevel");
			this._isBlurOn.loc = this._gl.getUniformLocation(this._program, "isBlurOn");
			this._isX360.loc = this._gl.getUniformLocation(this._program, "isX360");
			this._isY180.loc = this._gl.getUniformLocation(this._program, "isY180");
		}
		catch (error)
		{
			console.error(error);
		}
	}

	private get vertexShader()
	{
		let vertexShader = Shaders.vertexShader;

		if (this.isWebGL2Supported)
		{
			vertexShader = `#version 300 es\n${vertexShader}`
				.replace(/varying/g, "out")
				.replace(/attribute/g, "in");
		}

		return vertexShader;
	}

	private get fragmentShader()
	{
		let fragmentShader = Shaders.fragmentShader;

		if (this.isWebGL2Supported)
		{
			fragmentShader = `#version 300 es\n${fragmentShader}`
				.replace(/varying/g, "in")
				.replace(/texture2DLodEXT/g, "textureLod")
				.replace(/texture2D/g, "texture")
				.replace(/precision highp float;/, `precision highp float;\nout vec4 outputColor;`)
				.replace(/gl_FragColor/g, "outputColor");
		}

		return fragmentShader;
	}

	private get isWebGL2Supported()
	{
		return this._glVersion >= 2;
	}

	// POT = Power of Two
	private isTexturePOT(textureSize: ISize)
	{
		return MathUtils.isPowerOfTwo(textureSize.width) && MathUtils.isPowerOfTwo(textureSize.height);
	}

	private isBlurAvailable(textureSize: ISize)
	{
		if (this.isWebGL2Supported)
		{
			return true;
		}
		else
		{
			return this._isTextureLodExtensionAvailable && this.isTexturePOT(textureSize);
		}
	}

	private compileShaders()
	{
		this.compileShader(this._vertexShader);
		this.compileShader(this._fragmentShader);
	}

	private compileShader(shader: WebGLShader)
	{
		this._gl.compileShader(shader);
		if (!this._gl.getShaderParameter(shader, this._gl.COMPILE_STATUS))
		{
			throw `Error compiling shader: ${this._gl.getShaderInfoLog(shader)}`;
		}
	}

	private initProgram()
	{
		this._program = this._gl.createProgram();
		this._gl.attachShader(this._program, this._vertexShader);
		this._gl.attachShader(this._program, this._fragmentShader);

		this.linkProgram();
		this.validateProgram();
	}

	private linkProgram()
	{
		this._gl.linkProgram(this._program);

		if (!this._gl.getProgramParameter(this._program, this._gl.LINK_STATUS) && !this._gl.isContextLost())
		{
			throw `Error linking program: ${this._gl.getError()}, ${this._gl.getProgramInfoLog(this._program)}`;
		}
	}

	private validateProgram()
	{
		this._gl.validateProgram(this._program);
		if (!this._gl.getProgramParameter(this._program, this._gl.VALIDATE_STATUS))
		{
			throw `Error validating program: ${this._gl.getProgramInfoLog(this._program)}`;
		}
	}

	public setSize(width: number, height: number)
	{
		this._ratio.value = width / height;
	}

	public loadTexture(texData: ITextureData)
	{
		this._texture.texValue = this._gl.createTexture();
		const texture = this._texture;
		if (this._isInitialTexture)
		{
			this._isInitialTexture = false;
		}

		texture.viewBox = texData.viewBox;

		this._maxTextureLevel.value = Math.log2(Math.max(texData.textureData.width, texData.textureData.height));

		const isX360 = texture.viewBox[2] - texture.viewBox[0] === 1;
		const isY180 = texture.viewBox[3] - texture.viewBox[1] === 1;

		this._isX360.value = isX360;
		this._isY180.value = isY180;

		const isBlurNeeded = !(isX360 && isY180);
		const isBlurOn = isBlurNeeded && this.isBlurAvailable(texData.textureData);
		this._isBlurOn.value = isBlurOn;

		const gl = this._gl;
		gl.bindTexture(gl.TEXTURE_2D, texture.texValue);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, isBlurOn && isX360 ? gl.REPEAT : gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, isBlurOn ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.RGB, gl.RGB,
			gl.UNSIGNED_BYTE,
			texData.textureData
		);
		if (isBlurOn)
		{
			gl.generateMipmap(gl.TEXTURE_2D);
		}
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	// public fadeIn()
	// {
	// 	this._movementFactor.convergence.reset(-1, 0);
	// }

	// public fadeOut()
	// {
	// 	this._movementFactor.convergence.setEnd(1);
	// }

	// public resetZoom()
	// {
	// 	this._movementFactor.convergence.reset(0, 0);
	// }

	private setVec3Uniform(location: WebGLUniformLocation, value: number[])
	{
		this._gl.uniform3fv(location, value);
	}

	private setVec4Uniform(location: WebGLUniformLocation, value: number[])
	{
		this._gl.uniform4fv(location, value);
	}

	private setFloatUniform(location: WebGLUniformLocation, value: number)
	{
		this._gl.uniform1f(location, value);
	}

	private setBoolUniform(location: WebGLUniformLocation, value: boolean)
	{
		this._gl.uniform1i(location, value ? 1 : 0);
	}

	private setTextureData(texture: {texLoc: WebGLUniformLocation, texValue: WebGLTexture}, sampler: number)
	{
		this._gl.activeTexture(this._gl.TEXTURE0 + sampler);
		this._gl.bindTexture(this._gl.TEXTURE_2D, texture.texValue);
		this._gl.uniform1i(texture.texLoc, sampler);
	}

	private setTexture(texture: ITexture, sampler: number)
	{
		this.setVec4Uniform(texture.viewBoxLoc, texture.viewBox);
		this.setTextureData(texture, sampler);
	}

	private updateUniforms(userZoomFactor: number)
	{
		this.setFloatUniform(this._ratio.loc, this._ratio.value);
		this.setVec3Uniform(this._forward.loc, this._forward.value);
		this.setFloatUniform(this._zoomFactorLoc, userZoomFactor);
		this.setFloatUniform(this._maxTextureLevel.loc, this._maxTextureLevel.value);
		this.setBoolUniform(this._isBlurOn.loc, this._isBlurOn.value);
		this.setBoolUniform(this._isX360.loc, this._isX360.value);
		this.setBoolUniform(this._isY180.loc, this._isY180.value);
		this.setTexture(this._texture, 0);
	}

	public render(forward: number[], userZoomFactor: number)
	{
		this._forward.value = forward;

		this._gl.useProgram(this._program);
		this.updateUniforms(userZoomFactor);
		this._gl.drawArrays(this._gl.TRIANGLE_STRIP, 0, 4);
	}

	public get program()
	{
		return this._program;
	}

	public static get defaultViewBox()
	{
		return [
			0, // bottomleft.x
			0, // bottomleft.y
			1, // topright.x
			1  // topright.y
		];
	}

	public static get defaultTextureData(): ITextureData
	{
		const defaultTextureData = new ImageData(1, 1);

		return {
			textureData: defaultTextureData,
			viewBox: this.defaultViewBox,
			headingAngle: 0
		};
	}
}