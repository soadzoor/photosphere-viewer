import {DropManager} from "utils/DropManager";
import {ImageUtils} from "utils/ImageUtils";
import {SceneManager} from "view/SceneManager";

export class Main
{
	private _dropManager: DropManager = new DropManager("image/jpeg");

	constructor()
	{
		this._dropManager.signals.filesSelected.add(this.filesSelected);
	}

	private filesSelected = async (files: FileList) =>
	{
		const file = files[0];

		this._dropManager.destroy();

		const sceneManager = new SceneManager();
		const texData = await ImageUtils.getImageForTexture(file, sceneManager.maxTextureSize, sceneManager.isWebGL2Supported);

		sceneManager.loadPhotoSphere({
			headingAngle: 0,
			textureData: texData.textureData,
			viewBox: texData.viewBox
		});
	};
}

const main = new Main();