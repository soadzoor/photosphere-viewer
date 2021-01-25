import {BoundedConvergence} from "../utils/BoundedConvergence";
import {VectorUtils} from "../utils/VectorUtils";
import {SceneManager} from "./SceneManager";
import {Constants} from "../utils/Constants";
import {MathUtils} from "utils/MathUtils";

export class CameraControls
{
	//private _camera: PerspectiveCamera;
	private _domElement: HTMLElement;
	private _isPointerDown: boolean = false;
	private _sceneManager: SceneManager;
	private _mouseMoved: boolean = true;
	private _pointer: {
		downTimeStamp: number;
		startX: number;
		startY: number;
		prevX: number;
		prevY: number;
		prevDeltaX: number;
		prevDeltaY: number;
		prevTimeStamp: number;
		prevDeltaTime: number;
	} = {
		downTimeStamp: null,
		startX: null,
		startY: null,
		prevX: null,
		prevY: null,
		prevDeltaX: 0,
		prevDeltaY: 0,
		prevTimeStamp: 0,
		prevDeltaTime: 1
	};

	private _u: BoundedConvergence = new BoundedConvergence(0, 0, -Infinity, Infinity, undefined, Constants.DAMPING_DURATION);
	private _v: BoundedConvergence = new BoundedConvergence(Math.PI / 2, Math.PI / 2, 0.01, 3.14, undefined, Constants.DAMPING_DURATION);
	private _pinch: {
		startValue: {
			touchDistance: number;
			zoomValue: number;
		};
		currentValue: {
			touchDistance: number;
			zoomValue: number;
		};
	} = {
		startValue: {
			touchDistance: null,
			zoomValue: null
		},
		currentValue: {
			touchDistance: null,
			zoomValue: null
		}
	};
	private _forward: number[] = [-1, 0, 0];
	private _dampingTimeoutId: number = null;
	private _dampOnPointerUp: boolean = false;
	private _viewBox: number[];
	private _prevSpeed: number[] = [];

	private _enabled: boolean = false;
	private _autoRotation: number[] = [Constants.AUTOROTATION_SPEEDS.default, 0];

	constructor(domElement: HTMLElement, sceneManager: SceneManager)
	{
		this._domElement = domElement;
		this._sceneManager = sceneManager;

		this.disableDefaultZoomGesture();
	}

	private ignorePinch = (event: TouchEvent) =>
	{
		if (event.touches.length > 1)
		{
			event.preventDefault();
		}

		if (Constants.isIOS || Constants.isMac)
		{
			event = (event as any).originalEvent || event;
			if ((event as any).scale !== 1)
			{
				event.preventDefault();
			}
		}
	};

	private preventDefault = (event: Event) =>
	{
		event.preventDefault();
	};

	private disableDefaultZoomGesture()
	{
		// https://stackoverflow.com/questions/4389932/how-do-you-disable-viewport-zooming-on-mobile-safari

		window.addEventListener("touchstart", this.ignorePinch, {passive: false});
		window.addEventListener("touchmove", this.ignorePinch, {passive: false});
		window.addEventListener("gesturestart", this.preventDefault, {passive: false});
		window.addEventListener("gesturechange", this.preventDefault, {passive: false});
	}

	/**
	 * Returns the distance between 2 touch points
	 * @param touch0 
	 * @param touch1 
	 */
	private getTouchDistance(event: TouchEvent)
	{
		const touch0 = {
			x: event.touches[0].clientX,
			y: event.touches[0].clientY
		};

		const touch1 = {
			x: event.touches[1].clientX,
			y: event.touches[1].clientY
		};

		const delta = {
			x: touch1.x - touch0.x,
			y: touch1.y - touch0.y
		};

		const distance = Math.sqrt(delta.x * delta.x + delta.y * delta.y);

		return distance;
	}

	private onWheel = (event: MouseWheelEvent) =>
	{
		event.preventDefault();
		const zoomStepSize = 1.1;

		const userZoomFactor = this._sceneManager.userZoomFactor;
		const newZoomValue = Math.sign(-event.deltaY) > 0 ? userZoomFactor.end * zoomStepSize : userZoomFactor.end / zoomStepSize;
		userZoomFactor.setEnd(newZoomValue, true);
	};

	private onMouseDown = (event: MouseEvent) =>
	{
		if (event.button === Constants.MOUSE_BUTTON.LEFT)
		{
			this.onPointerDown(event.clientX, event.clientY);
		}
	};

	private onTouchStart = (event: TouchEvent) =>
	{
		event.preventDefault(); // helps preventing default pinch-to-zoom behaviour on iOS 12 safari
		if (event.touches.length === 1)
		{
			this.onPointerDown(event.touches[0].clientX, event.touches[0].clientY);
		}
		else if (event.touches.length === 2)
		{
			this._pinch.startValue.touchDistance = this.getTouchDistance(event);
			this._pinch.startValue.zoomValue = this._sceneManager.userZoomFactor.value;
		}
		else
		{
			this.onPointerUp();
		}
	};

	private onPointerDown(clientX: number, clientY: number)
	{
		this.stopRotating();
		this._isPointerDown = true;
		this._mouseMoved = false;

		this._pointer.startX = this._pointer.prevX = clientX;
		this._pointer.startY = this._pointer.prevY = clientY;

		this._pointer.downTimeStamp = performance.now();
		this._pointer.prevTimeStamp = this._pointer.downTimeStamp;

		this._domElement.classList.add("rotating");

		this._u.reset(this._u.value, this._u.value);
		this._v.reset(this._v.value, this._v.value);
	}

	private onMouseMove = (event: MouseEvent) =>
	{
		this.onPointerMove(event.clientX, event.clientY);
	};

	private onTouchMove = (event: TouchEvent) =>
	{
		event.preventDefault(); // helps preventing default pinch-to-zoom behaviour on iOS 12 safari
		if (event.touches.length === 1)
		{
			this.onPointerMove(event.touches[0].clientX, event.touches[0].clientY);
		}
		else if (event.touches.length === 2 && this._pinch.startValue.touchDistance)
		{
			this._pinch.currentValue.touchDistance = this.getTouchDistance(event);
			this._pinch.currentValue.zoomValue = (this._pinch.currentValue.touchDistance / this._pinch.startValue.touchDistance) * this._pinch.startValue.zoomValue;

			this._sceneManager.userZoomFactor.setEnd(this._pinch.currentValue.zoomValue);
		}
		else
		{
			this.onPointerUp();
		}
	};

	private onPointerMove(clientX: number, clientY: number)
	{
		if (this._isPointerDown)
		{
			this._mouseMoved = clientX !== this._pointer.prevX || clientY !== this._pointer.prevY; /** Sometimes pointermove is fired when the mouse is clicked, but the mouse doesn't even move. We have to check if the mouse really moved, or not */

			if (this._mouseMoved)
			{
				this._domElement.classList.add("rotating");

				if (this._pointer.prevX != null && this._pointer.prevY != null)
				{
					const userZoomFactor = this._sceneManager.userZoomFactor.value;
					const deltaU = ((clientX - this._pointer.prevX) * Constants.POINTER_SENSITIVITY / window.innerHeight) / userZoomFactor;
					const deltaV = ((clientY - this._pointer.prevY) * Constants.POINTER_SENSITIVITY / window.innerHeight) / userZoomFactor;

					const newU = this._u.end - deltaU;
					const newV = this._v.end - deltaV;

					const currentXToStartX = this._pointer.startX - clientX;
					const currentYToStartY = this._pointer.startY - clientY;

					this._u.reset(newU, newU);
					this._v.reset(newV, newV);
				}

				this._pointer.prevDeltaX = clientX - this._pointer.prevX;
				this._pointer.prevDeltaY = clientY - this._pointer.prevY;
				this._pointer.prevX = clientX;
				this._pointer.prevY = clientY;

				const timeStamp = performance.now();

				this._pointer.prevDeltaTime = timeStamp - this._pointer.prevTimeStamp;
				this._pointer.prevTimeStamp = timeStamp;

				this._dampOnPointerUp = true;
				clearTimeout(this._dampingTimeoutId);
				this._dampingTimeoutId = setTimeout(this.cancelDamping, 100) as any;
			}
		}
	}

	private onPointerUp = () =>
	{
		if (this._isPointerDown)
		{
			const timeStamp = performance.now();
			this._domElement.classList.remove("rotating");

			const speed = this._prevSpeed;
			const speedAbsSq = VectorUtils.lengthOfSquared(speed);

			if (this._dampOnPointerUp && !isNaN(speedAbsSq) && 0 < speedAbsSq && speedAbsSq < Infinity)
			{
				this._dampOnPointerUp = false;

				const multiplicator = this._u.derivateAt0;

				// s = v * t => delta
				const time = this._u.originalAnimationDuration;
				const delta = [
					time * speed[0] / multiplicator,
					time * speed[1] / multiplicator
				];

				this._u.setEnd(this._u.value + delta[0]);
				this._v.setEnd(this._v.value + delta[1]);
			}
		}

		this._isPointerDown = false;
		this._pointer.downTimeStamp = null;
		this._pointer.startX = null;
		this._pointer.startY = null;
		this._pointer.prevX = null;
		this._pointer.prevY = null;
		this._pointer.prevTimeStamp = 0;
		this._pointer.prevDeltaX = 0;
		this._pointer.prevDeltaY = 0;
		this._pointer.prevDeltaTime = 1;

		this._pinch.startValue.touchDistance = this._pinch.startValue.zoomValue =
			this._pinch.currentValue.touchDistance = this._pinch.currentValue.zoomValue = null;
	};

	private cancelDamping = () =>
	{
		this._dampOnPointerUp = false;
	};

	/** See this for explanation: https://en.wikipedia.org/wiki/UV_mapping#Finding_UV_on_a_sphere */
	private setUVFromSphereSufracePoint(forward: number[])
	{
		const u = Math.PI + Math.atan2(-forward[2], -forward[0]);
		this._u.reset(u, u);
		const v = (Math.PI / 2) - Math.asin(forward[1]);
		this._v.reset(v, v);
	}

	public setHeadingAngle(headingAngle: number, isHotSpotClicked: boolean, stopRotating: boolean)
	{
		this._u.reset(headingAngle, headingAngle);
		if (isHotSpotClicked)
		{
			this._v.reset(this._v.value, this._v.value);
		}
		else
		{
			this._v.reset(Math.PI / 2, Math.PI / 2);
		}

		if (stopRotating)
		{
			this._autoRotation[0] = 0;
			this._autoRotation[1] = 0;
		}
	}

	private updateRotationLimit()
	{
		const viewBox = this._viewBox;
		if (viewBox)
		{
			const cameraAspect = this._domElement.offsetWidth / this._domElement.offsetHeight; // the same as the canvas'
			const vFOV = MathUtils.deg2rad(Constants.FOV);
			const hFOV = 2 * Math.atan(Math.tan(vFOV / 2) * cameraAspect);

			if ((viewBox[2] - viewBox[0]) < 1)
			{
				// Change this if you want to prevent users from seeing the black bars
				const isCalculatedFromTheFrustum = false;

				const centerMin = 2 * Math.PI * (-0.5 + viewBox[0]);
				const centerMax = 2 * Math.PI * (-0.5 + viewBox[2]);

				let frustumMin = centerMin;
				let frustumMax = centerMax;

				if (isCalculatedFromTheFrustum)
				{
					frustumMin += hFOV / 2;
					frustumMax -= hFOV / 2
				}

				if (frustumMax > frustumMin)
				{
					this._u.setMin(frustumMin);
					this._u.setMax(frustumMax);
				}
				else
				{
					const centerCenter = (centerMin + centerMax) / 2;
					this._u.setMin(centerCenter);
					this._u.setMax(centerCenter);
				}
			}
			else
			{
				this._u.setMin(this._u.originalMin);
				this._u.setMax(this._u.originalMax);
			}

			if ((viewBox[3] - viewBox[1]) < 1)
			{
				// Change this if you want to prevent users from seeing the black bars
				const isCalculatedFromTheFrustum = false;

				const centerMin = viewBox[1] * Math.PI;
				const centerMax = viewBox[3] * Math.PI;

				let frustumMin = centerMin;
				let frustumMax = centerMax;

				if (isCalculatedFromTheFrustum)
				{
					frustumMin += vFOV / 2;
					frustumMax -= vFOV / 2;
				}

				if (frustumMax > frustumMin)
				{
					this._v.setMin(frustumMin);
					this._v.setMax(frustumMax);
				}
				else
				{
					const centerCenter = (centerMin + centerMax) / 2;
					this._v.setMin(centerCenter);
					this._v.setMax(centerCenter);
				}
			}
			else
			{
				this._v.setMin(this._v.originalMin);
				this._v.setMax(this._v.originalMax);
			}
		}
	}

	public limitRotation(viewBox: number[])
	{
		this._viewBox = viewBox;
		this.updateRotationLimit();
	}

	public setSize()
	{
		this.updateRotationLimit();
	}

	public activate()
	{
		if (!this._enabled)
		{
			this._enabled = true;
			this.setUVFromSphereSufracePoint(this._forward);

			this._domElement.addEventListener("mousedown", this.onMouseDown);
			this._domElement.addEventListener("touchstart", this.onTouchStart);
			this._domElement.addEventListener("wheel", this.onWheel);

			window.addEventListener("mousemove", this.onMouseMove);
			window.addEventListener("touchmove", this.onTouchMove);

			window.addEventListener("mouseup", this.onPointerUp);
			window.addEventListener("touchend", this.onPointerUp);
			window.addEventListener("touchcancel", this.onPointerUp);
		}
	}

	public deactivate()
	{
		if (this._enabled)
		{
			this._enabled = false;
			this._isPointerDown = false;

			this._domElement.classList.remove("rotating");

			this._domElement.removeEventListener("mousedown", this.onMouseDown);
			this._domElement.removeEventListener("touchstart", this.onTouchStart);
			this._domElement.removeEventListener("wheel", this.onWheel);

			window.removeEventListener("mousemove", this.onMouseMove);
			window.removeEventListener("touchmove", this.onTouchMove);

			window.removeEventListener("mouseup", this.onPointerUp);
			window.removeEventListener("touchend", this.onPointerUp);
			window.removeEventListener("touchcancel", this.onPointerUp);
		}
	}

	public stopRotating()
	{
		this._autoRotation[0] = 0;
		this._autoRotation[1] = 0;

		this._u.reset(this._u.value, this._u.value);
		this._v.reset(this._v.value, this._v.value);
	}

	public update()
	{
		if (this._autoRotation[0] !== 0 || this._autoRotation[1] !== 0)
		{
			this._u.reset(this._u.end + this._autoRotation[0] * SceneManager.deltaFrame, this._u.end + this._autoRotation[0] * SceneManager.deltaFrame);
			this._v.reset(this._v.end + this._autoRotation[1] * SceneManager.deltaFrame, this._v.end + this._autoRotation[1] * SceneManager.deltaFrame, undefined, undefined, true);
		}

		if (this._u.hasChangedSinceLastTick || this._v.hasChangedSinceLastTick)
		{
			this._prevSpeed[0] = this._u.prevDeltaValue / this._u.prevDeltaTime;
			this._prevSpeed[1] = this._v.prevDeltaValue / this._v.prevDeltaTime;
			this._forward = MathUtils.getSphereSurfacePointFromUV(this._u.value, this._v.value);
			this._sceneManager.needsRender = true;
		}

		return this._forward;
	}

	public get autoRotation()
	{
		return this._autoRotation;
	}

	public get currentHeadingAngle()
	{
		let headingAngle = (this._u.value) % (2 * Math.PI);

		return headingAngle < 0 ? headingAngle + 2 * Math.PI : headingAngle;
	}

	public get forward()
	{
		return this._forward;
	}
}