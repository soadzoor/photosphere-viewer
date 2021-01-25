export class FileUtils
{
	// public static readAsArrayBuffer(file: File)
	// {
	// 	return new Promise<ArrayBuffer>((resolve, reject) =>
	// 	{
	// 		const fileReader = new FileReader();
	// 		fileReader.onload = () =>
	// 		{
	// 			resolve(fileReader.result as ArrayBuffer);
	// 		};
	// 		fileReader.onerror = () =>
	// 		{
	// 			reject("Error");
	// 		};
	// 		fileReader.readAsArrayBuffer(file);
	// 	});
	// }

	public static readAsText(file: File)
	{
		return new Promise<string>((resolve, reject) =>
		{
			const fileReader = new FileReader();
			fileReader.onload = () =>
			{
				resolve(fileReader.result as string)
			};
			fileReader.onerror = () =>
			{
				reject(file?.name || "Error");
			};

			fileReader.readAsText(file)
		});
	}

	public static getValueFromTextByKey(text: string, key: string)
	{
		const indexOfKey = text.indexOf(key);

		if (indexOfKey > -1)
		{
			const indexOfNextQuoteSymbol = text.indexOf(`"`, indexOfKey + key.length + 3);

			return text.substring(key.length + indexOfKey + 2, indexOfNextQuoteSymbol);
		}
		else
		{
			return null;
		}
	}
}