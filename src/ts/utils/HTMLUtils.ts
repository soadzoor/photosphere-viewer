export class HTMLUtils
{
	/**
	 * Removes element from DOM
	 * @param element HTMLelement
	 */
	public static detach(element: Element)
	{
		element?.parentElement?.removeChild(element);
	}
}