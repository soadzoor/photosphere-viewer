import {HTMLUtils} from "./HTMLUtils";
import {Signal} from "./Signal";

export class DropManager
{
	private _uploadArea: HTMLElement;
	private _inputElement: HTMLInputElement;
	public readonly signals = {
		filesSelected: Signal.create<FileList>()
	};

	constructor(accept: string)
	{
		this._inputElement = document.createElement("input");
		this._inputElement.type = "file";
		this._inputElement.accept = accept;
		this._inputElement.addEventListener("change", (event: Event) =>
		{
			const files = this._inputElement.files;
			this.processFile(files);
		});

		this._uploadArea = document.getElementById("uploadArea");

		document.addEventListener("dragover", (event: Event) =>
		{
			event.preventDefault();

			this._uploadArea.classList.add("active");
		});

		document.addEventListener("drop", (event: DragEvent) =>
		{
			event.preventDefault();

			const files = event.dataTransfer.files;
			this.processFile(files);

			this._uploadArea.classList.remove("active");
		});

		document.addEventListener("dragleave", this.onDragCancel);

		this._uploadArea.addEventListener("click", () =>
		{
			this._inputElement.click();
		});
	}

	private onDragCancel = (event: DragEvent) =>
	{
		event.preventDefault();
		this._uploadArea.classList.remove("active");
	};

	private processFile(files: FileList)
	{
		this.signals.filesSelected.dispatch(files);
	}

	public destroy()
	{
		HTMLUtils.detach(this._inputElement);
		HTMLUtils.detach(this._uploadArea);

		for (const key in this.signals)
		{
			this.signals[key].removeAll();
		}
	}
}