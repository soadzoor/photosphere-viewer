import {ITextureData, PhotoSphereShader} from "./PhotoSphereShader";
import {SceneManager} from "./SceneManager";

export class WebGLRenderer
{
	private _canvas: HTMLCanvasElement;
	private _gl: WebGLRenderingContext | WebGL2RenderingContext;
	private _shader: PhotoSphereShader;

	private _sceneManager: SceneManager;

	constructor(canvas: HTMLCanvasElement, sceneManager: SceneManager)
	{
		this._canvas = canvas;
		this._sceneManager = sceneManager;
	}

	public init()
	{
		const contextAttributes = {
			alpha: false,
			antialias: false // Not needed for this app! In fact, it causes major performance issues on lower-end devices, but visually it stays the same!
		};
		this._gl = (this._canvas.getContext("webgl2", contextAttributes) || this._canvas.getContext("experimental-webgl2", contextAttributes) || this._canvas.getContext("webgl", contextAttributes)) as WebGLRenderingContext;

		if (this._gl)
		{
			this._gl.clearColor(0.125, 0.25, 0.5, 1.0);
			this._gl.viewport(0, 0, this._gl.drawingBufferWidth, this._gl.drawingBufferHeight);

			// Not needed for this app
			//this._gl.enable(this._gl.CULL_FACE);
			//this._gl.cullFace(this._gl.BACK);

			this._gl.enable(this._gl.BLEND);
			this._gl.blendFunc(this._gl.SRC_ALPHA, this._gl.DST_ALPHA);
			this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);

			this._shader = new PhotoSphereShader(this._gl);

			this.initGeometry();
			this._gl.useProgram(this._shader.program);

			return true;
		}
		else
		{
			return false;
		}
	}

	public get maxTextureSize()
	{
		return this._gl?.getParameter(this._gl.MAX_TEXTURE_SIZE);
	}

	public setSize(width: number, height: number)
	{
		if (this._gl)
		{
			const pixelRatio = window.devicePixelRatio;

			const w = window.innerWidth * pixelRatio;
			const h = window.innerHeight * pixelRatio;

			this._canvas.width = w;
			this._canvas.height = h;

			this._gl.viewport(0, 0, this._gl.drawingBufferWidth, this._gl.drawingBufferHeight);

			this._shader.setSize(width, height);

			this._sceneManager.needsRender = true;
		}
	}

	private initAttribPointer(positionAttribLocation: GLint)
	{
		this._gl.vertexAttribPointer(
			positionAttribLocation,            // Attribute location
			3,                                 // Number of elements per attribute
			this._gl.FLOAT,                    // Type of elements
			false,                             // is it normalized
			3 * Float32Array.BYTES_PER_ELEMENT,// Size of an individual vertex
			0                                  // Offset from the beginning of a single vertex to this attribute
		);
	}

	private initVertices(program: WebGLProgram)
	{
		const positionAttribLocation = this._gl.getAttribLocation(program, "vertPosition");
		this.initAttribPointer(positionAttribLocation);
		this._gl.enableVertexAttribArray(positionAttribLocation);
	}

	private initGeometry()
	{
		const squareVertices = [
			-1, -1, 0,
			1, -1, 0,
			-1, 1, 0,
			1, 1, 0
		];

		const canvasVertexBufferObject = this._gl.createBuffer();
		this._gl.bindBuffer(this._gl.ARRAY_BUFFER, canvasVertexBufferObject);
		this._gl.bufferData(this._gl.ARRAY_BUFFER, new Float32Array(squareVertices), this._gl.STATIC_DRAW);

		this.initVertices(this._shader.program);
	}

	public loadDefaultTexture()
	{
		this.loadTexture(PhotoSphereShader.defaultTextureData);
	}

	public loadTexture(texData: ITextureData)
	{
		this._shader.loadTexture(texData);
	}

	public render(forward: number[], userZoomFactor: number)
	{
		// Not needed for this app
		// this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);

		this._shader.render(forward, userZoomFactor);
	}
}