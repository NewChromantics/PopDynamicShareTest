Pop.Debug(`Hello.`);


async function Main()
{
	const RedPixel = [255,100,0,255];
	const OutputImage = new Pop.Image();
	const Width = 40;
	const Height = 40;
	const Channels = RedPixel.length;
	const Pixels = new Uint8Array(Width * Height * Channels);
	for (let i = 0;i < Pixels.length;i += RedPixel.length)
	{
		Pixels[i + 0] = RedPixel[0];
		Pixels[i + 1] = RedPixel[1];
		Pixels[i + 2] = RedPixel[2];
		Pixels[i + 3] = RedPixel[3];
	}
	OutputImage.WritePixels(Width,Height,Pixels,'RGBA');

	const CompressionLevel = 0.5;
	const Png = OutputImage.GetPngData(CompressionLevel);

	Pop.StdOut(Png);
	Pop.ExitApplication(0);
};
Main();
