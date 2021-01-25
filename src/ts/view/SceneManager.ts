import {CameraControls} from "./CameraControls";
import {WebGLRenderer} from "./WebGLRenderer";
import {Convergence, Easing} from "utils/Convergence";
import {BoundedConvergence} from "utils/BoundedConvergence";
import {Constants} from "utils/Constants";
import {ITextureData} from "./PhotoSphereShader";

export class SceneManager
{
	private _domElement: HTMLDivElement = document.createElement("div");
	private _canvas: HTMLCanvasElement = document.createElement("canvas");
	private _controls: CameraControls;
	private _webGLRenderer: WebGLRenderer;
	private _forward: number[] = [0, 0, -1];
	private _userZoomFactor: BoundedConvergence = new BoundedConvergence(Constants.DEFAULT_ZOOM_FACTOR, Constants.DEFAULT_ZOOM_FACTOR, Constants.MIN_ZOOM_FACTOR, 4, Easing.EASE_OUT, Constants.TRANSITION_DURATION);

	public static prevTimeStamp: number = 0;
	private static _timeStamp: number = 0;
	private static _deltaFrame: number = 1000;

	public needsRender = true;

	constructor()
	{
		this.init();
	}

	/** Return if it"s successfully initialized */
	private init()
	{
		try
		{
			this._domElement.classList.add("playGround");
			this._domElement.appendChild(this._canvas);
			document.body.appendChild(this._domElement);
			this.initRenderers();
			this.initControls();
			window.addEventListener("resize", this.onWindowResize);
			this.onWindowResize();
			this.animate();
		}
		catch (error)
		{
			return false;
		}

		return true;
	}

	private onContextLost = (event: Event) =>
	{
		event.preventDefault();
		alert("WebGL Context Lost");
	};

	private initRenderers()
	{
		this._webGLRenderer = new WebGLRenderer(this._canvas, this);
		this._webGLRenderer.init();
		this._canvas.addEventListener("webglcontextlost", this.onContextLost);
	}

	private initControls()
	{
		this._controls = new CameraControls(this._canvas.parentElement, this);
		this._controls.activate();
	}

	public onWindowResize = () =>
	{
		const width = window.innerWidth;
		const height = window.innerHeight;
		this._webGLRenderer.setSize(width, height);
		this._controls.setSize();
	};

	public loadPhotoSphere(texData: ITextureData)
	{
		this._controls.limitRotation(texData.viewBox);

		const userZoomMax = Math.max(Constants.MIN_ZOOM_FACTOR, texData.textureData.width * (1.7 / 4000) / (texData.viewBox[2] - texData.viewBox[0])); // 1.7 / 4000 -> the max userzoomfactor for an image width 4000px width is 1.7.

		this._webGLRenderer.loadTexture(texData);

		// See the similar stucture in WebGLRenderer for explanation
		requestAnimationFrame(() =>
		{
			this._userZoomFactor.setEnd(Math.min(this._userZoomFactor.end, userZoomMax));
			setTimeout(() =>
			{
				this._userZoomFactor.setMax(userZoomMax);
			}, this._userZoomFactor.animationDuration);
		});

		this.needsRender = true;
	}

	private update = () =>
	{
		SceneManager._timeStamp = performance.now();
		SceneManager._deltaFrame = SceneManager._timeStamp - SceneManager.prevTimeStamp;
		SceneManager.prevTimeStamp = SceneManager._timeStamp;

		this.needsRender = Convergence.updateActiveOnes(SceneManager._timeStamp) || this.needsRender;

		if (this.needsRender)
		{
			this._forward = this._controls.update();
			this._webGLRenderer.render(this._forward, this._userZoomFactor.value);
			this.needsRender = false;
		}
	};

	public animate = () =>
	{
		this.update();
		requestAnimationFrame(this.animate);
	};

	/** Returns the timestamp of the newest render run  */
	public static get timeStamp()
	{
		return SceneManager._timeStamp;
	}

	/** Returns the time between the last 2 frames, so we can get an idea of the user"s FPS */
	public static get deltaFrame()
	{
		return SceneManager._deltaFrame;
	}

	public get userZoomFactor()
	{
		return this._userZoomFactor;
	}

	public get maxTextureSize()
	{
		return this._webGLRenderer.maxTextureSize;
	}

	public get forward()
	{
		return this._forward;
	}
}