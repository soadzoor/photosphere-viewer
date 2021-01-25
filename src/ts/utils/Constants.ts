export class Constants
{
	public static readonly ANIMATION_DURATION = 400;
	public static readonly DAMPING_DURATION = 2000;

	public static readonly MOUSE_BUTTON = {
		LEFT: 0,
		MIDDLE: 1,
		RIGHT: 2
	};
	public static readonly TRANSITION_DURATION = 400;
	public static readonly FOV = 75;
	public static readonly POINTER_SENSITIVITY = 1.2;

	public static readonly MIN_ZOOM_FACTOR = 1;

	public static readonly WORLD_UP = [0, 1, 0];
	public static readonly CAMERA_POSITION = [0, 0, 0];

	// radian / millisec. Multiply by deltaframe to get the actual radian you need to change per frame
	public static readonly AUTOROTATION_SPEEDS = {
		default: 0.00003,
		fast: 0.0009
	};

	public static get DEFAULT_ZOOM_FACTOR()
	{
		return Constants.MIN_ZOOM_FACTOR;
	};

	public static readonly MOUSE_BUTTON = {
		LEFT: 0,
		MIDDLE: 1,
		RIGHT: 2
	};

	public static get isFullscreenAvailable(): boolean
	{
		const targetElement = document.body as any;

		return !!targetElement.requestFullscreen ||
			!!targetElement.webkitRequestFullscreen ||
			!!targetElement.mozRequestFullScreen ||
			!!targetElement.msRequestFullscreen;
	}

	public static get isIOS()
	{
		return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
	}

	public static get isMac()
	{
		return /Mac/.test(navigator.userAgent) && !window.MSStream;
	}
}