import {PhotoSphereShader} from "view/PhotoSphereShader";
import {FileUtils} from "./FileUtils";
import {MathUtils} from "./MathUtils";

const XMPMetaDataKeys = [
	"GPano:CroppedAreaImageHeightPixels",
	"GPano:CroppedAreaImageWidthPixels",
	"GPano:CroppedAreaLeftPixels",
	"GPano:CroppedAreaTopPixels",
	"GPano:FullPanoHeightPixels",
	"GPano:FullPanoWidthPixels",
	"GPano:InitialViewHeadingDegrees"
];

export interface IXMPMetaData
{
	"GPano:CroppedAreaImageHeightPixels"?: number;
	"GPano:CroppedAreaImageWidthPixels"?: number;
	"GPano:CroppedAreaLeftPixels"?: number;
	"GPano:CroppedAreaTopPixels"?: number;
	"GPano:FullPanoHeightPixels"?: number;
	"GPano:FullPanoWidthPixels"?: number;
	"GPano:InitialViewHeadingDegrees"?: number;
}

interface IMetaData
{
	viewBox: number[];
	headingAngle: number;
	originalWidth: number;
	originalHeight: number;
	imageUrl: string;
}

export class ImageUtils
{
	private static _canvas: HTMLCanvasElement = document.createElement("canvas");
	private static _ctx: CanvasRenderingContext2D = ImageUtils._canvas.getContext("2d");
	private static _cache: {
		[id: string]: Promise<HTMLImageElement>
	} = {};

	private static worker = ImageUtils.createWorker(() =>
	{
		self.addEventListener("message", (message: MessageEvent) =>
		{
			const src = message.data.url;
			const maxTextureSize = message.data.maxTextureSize;
			fetch(src).then((response) =>
			{
				response.blob().then((blob) =>
				{
					createImageBitmap(blob).then((bitmap) =>
					{
						const largestSize = Math.max(bitmap.width, bitmap.height);

						const isResizeNeeded = maxTextureSize < largestSize;
						if (isResizeNeeded)
						{
							const textureSize = Math.min(largestSize, maxTextureSize);
							const ratio = bitmap.width / bitmap.height;

							let newSize = {
								width: null,
								height: null
							};

							if (ratio >= 1) // width > height  
							{
								newSize.width = textureSize;
								newSize.height = newSize.width / ratio;
							}
							else
							{
								newSize.height = textureSize;
								newSize.width = newSize.height * ratio;
							}

							// Needed, because for some reason, typescript definitions don't have the optional "options" parameter for "createImageBitmap"
							// https://github.com/microsoft/TypeScript/issues/35545
							const cib = createImageBitmap as any;
							cib(bitmap, 0, 0, bitmap.width, bitmap.height, {resizeWidth: newSize.width, resizeHeight: newSize.height}).then((resizedBitmap) =>
							{
								self.postMessage({
									src: src,
									bitmap: resizedBitmap
								}, [resizedBitmap] as any); // "as ImageBitmap[]" doesn't seem to compile with current typescript...
							});
						}
						else
						{
							self.postMessage({
								src: src,
								bitmap: bitmap
							}, [bitmap] as any); // "as ImageBitmap[]" doesn't seem to compile with current typescript...
						}
					});
				});
			});
		});
	});

	private static createWorker(f: () => void)
	{
		return new Worker(URL.createObjectURL(new Blob([`(${f})()`])));
	}

	private static getImage(url: string, maxTextureSize: number): Promise<TexImageSource>
	{
		if (typeof createImageBitmap !== "undefined")
		{
			return new Promise<ImageBitmap>((resolve, reject) =>
			{
				function handler(e)
				{
					if (e.data.src === url)
					{
						ImageUtils.worker.removeEventListener("message", handler);
						if (e.data.error)
						{
							reject(e.data.error);
						}
						resolve(e.data.bitmap);
					}
				}
				ImageUtils.worker.addEventListener("message", handler);
				ImageUtils.worker.postMessage({url: url, maxTextureSize: maxTextureSize});
			});
		}
		else
		{
			return new Promise<HTMLImageElement>(async (resolve, reject) =>
			{
				const originalImage = await ImageUtils.getImageElement(url);

				const largestSize = Math.max(originalImage.width, originalImage.height);

				const isResizeNeeded = maxTextureSize < largestSize;
				if (isResizeNeeded)
				{
					const textureSize = Math.min(largestSize, maxTextureSize);
					const ratio = originalImage.width / originalImage.height;

					let newSize = {
						width: null,
						height: null
					};

					if (ratio >= 1) // width > height  
					{
						newSize.width = textureSize;
						newSize.height = newSize.width / ratio;
					}
					else
					{
						newSize.height = textureSize;
						newSize.width = newSize.width * ratio;
					}

					ImageUtils._canvas.width = newSize.width;
					ImageUtils._canvas.height = newSize.height;

					ImageUtils._ctx.drawImage(originalImage, 0, 0, newSize.width, newSize.height);

					ImageUtils._canvas.toBlob(async (blob: Blob) =>
					{
						const resizedImage = await ImageUtils.getImageElement(URL.createObjectURL(blob));
						resolve(resizedImage);
					});
				}
				else
				{
					resolve(originalImage);
				}
			});
		}
	}

	/**
	 * Same as getImageElement, only it's not using cache. Needed if we use the same image in multiple places (bottom row thumbnails + hotspot thumbnails for example)
	 */
	public static async getImageElement(url: string)
	{
		return new Promise<HTMLImageElement>((resolve, reject) =>
		{
			const img = document.createElement("img");
			img.setAttribute("crossorigin", "anonymous");
			img.onload = () =>
			{
				resolve(img);
			};
			img.onerror = () =>
			{
				reject(img);
			};
			img.src = url;
		});
	}

	public static async getCachedImageElement(url: string)
	{
		if (!ImageUtils._cache[url])
		{
			ImageUtils._cache[url] = this.getImageElement(url);
		}

		return ImageUtils._cache[url];
	}

	private static async getXMPMetaDataFromImageFile(file: File)
	{
		const fileAsText = await FileUtils.readAsText(file);

		const xmpMetaData: IXMPMetaData = {};
		for (const key of XMPMetaDataKeys)
		{
			xmpMetaData[key] = parseFloat(FileUtils.getValueFromTextByKey(fileAsText, key));
		}

		return xmpMetaData;
	}

	public static async getMetaDataFromFile(file: File): Promise<IMetaData>
	{
		// UV space
		const viewBox = PhotoSphereShader.defaultViewBox;

		const imageUrl = URL.createObjectURL(file);

		const image = await this.getCachedImageElement(imageUrl);

		const metadata = await this.getXMPMetaDataFromImageFile(file);

		// There might be a case when the heading angle is set, but nothing else is present within this object, so we need to check another property
		if (!metadata["GPano:FullPanoWidthPixels"])
		{
			const differenceY = image.width / 2 - image.height;
			const fullHeight = image.height + differenceY;
			if (differenceY > 1)
			{
				const offsetY = differenceY / 2;
				viewBox[1] = offsetY / fullHeight;
				viewBox[3] = (fullHeight - offsetY) / fullHeight;
			}
		}
		else
		{
			const fullPanoWidth = metadata["GPano:FullPanoWidthPixels"];
			const fullPanoHeight = metadata["GPano:FullPanoHeightPixels"];
			const cropLeft = metadata["GPano:CroppedAreaLeftPixels"];
			const cropTop = metadata["GPano:CroppedAreaTopPixels"];
			const originalImageWidth = metadata["GPano:CroppedAreaImageWidthPixels"];
			const originalImageHeight = metadata["GPano:CroppedAreaImageHeightPixels"];

			if (fullPanoWidth !== originalImageWidth || fullPanoHeight !== originalImageHeight)
			{
				viewBox[0] = cropLeft / fullPanoWidth;
				viewBox[1] = (fullPanoHeight - originalImageHeight - cropTop) / fullPanoHeight;
				viewBox[2] = (cropLeft + originalImageWidth) / fullPanoWidth;
				viewBox[3] = (fullPanoHeight - cropTop) / fullPanoHeight;
			}
		}

		const headingAngleInDegrees = (metadata["GPano:InitialViewHeadingDegrees"] + 180) % 360;

		const headingAngle = MathUtils.isValidNumber(headingAngleInDegrees) ? MathUtils.deg2rad(headingAngleInDegrees) : 0;

		return {
			viewBox: viewBox,
			headingAngle: headingAngle,
			originalWidth: image.width,
			originalHeight: image.height,
			imageUrl: imageUrl
		};
	}

	/**
	 * Same as getImageElement, only it's not using cache. Needed if we use the same image in multiple places (bottom row thumbnails + hotspot thumbnails for example)
	 */
	public static getNewImageElement(url: string)
	{
		return new Promise<HTMLImageElement>((resolve, reject) =>
		{
			const img = document.createElement("img");
			img.setAttribute("crossorigin", "anonymous");
			img.onload = () =>
			{
				resolve(img);
			};
			img.onerror = () =>
			{
				reject(img);
			};
			img.src = url;
		});
	}

	public static async getImageForTexture(file: File, maxTextureSize: number)
	{
		const metadata = await ImageUtils.getMetaDataFromFile(file);
		const textureData = await ImageUtils.getImage(metadata.imageUrl, maxTextureSize);

		return {
			textureData: textureData,
			viewBox: metadata.viewBox
		};
	}
}