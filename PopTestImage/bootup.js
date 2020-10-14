
let ExeArgs = Pop.GetExeArguments();
//	gr: native returns array of strings at the moment
if ( Array.isArray(ExeArgs) )
{
	//	this is webapi Pop.GetExeArguments
	function ParseArguments(ArgumentStrings)
	{
		//	gr: probably shouldn't lowercase now it's proper
		//const UrlArgs = window.location.search.replace('?',' ').trim().split('&');
		const UrlArgs = ArgumentStrings;
	
		//	turn into keys & values - gr: we're not doing this in engine! fix so they match!
		const UrlParams = {};
		function AddParam(Argument)
		{
			let [Key,Value] = Argument.split('=',2);
			if ( Value === undefined )
				Value = true;
		
			//	attempt some auto conversions
			if ( typeof Value == 'string' )
			{
				const NumberValue = Number(Value);
				if ( !isNaN(NumberValue) )
					Value = NumberValue;
				else if ( Value == 'true' )
					Value = true;
				else if ( Value == 'false' )
					Value = false;
			}
			UrlParams[Key] = Value;
		}
		UrlArgs.forEach(AddParam);
		return UrlParams;
	}
	ExeArgs = ParseArguments(ExeArgs);
}		



async function GeneratePng()
{
	const Red = ExeArgs.Red || 0;
	const Green = ExeArgs.Green || 0;
	const Blue = ExeArgs.Blue || 0;
	const Alpha = 255;
	
	const BgPixel = [Red,Green,Blue];
	const FgPixel = (Math.max(...BgPixel) > 128) ? [0,0,0] : [255,255,255];
	
	const OutputImage = new Pop.Image();
	const Width = ExeArgs.ImageWidth || 40;
	const Height = ExeArgs.ImageHeight || 40;
	const Channels = 4;
	const Pixels = new Uint8Array(Width * Height * Channels);
	for (let i=0;	i<Pixels.length;	i+=Channels)
	{
		Pixels[i + 0] = BgPixel[0];
		Pixels[i + 1] = BgPixel[1];
		Pixels[i + 2] = BgPixel[2];
		Pixels[i + 3] = Alpha;
	}
	
	function SetPixel(x,y,rgba)
	{
		let PixelIndex = x + (y*Width);		
		PixelIndex *= Channels;
		
		if ( PixelIndex < 0 || PixelIndex >= Pixels.length )
			return;
		Pixels[PixelIndex + 0] = FgPixel[0];
		Pixels[PixelIndex + 1] = FgPixel[1];
		Pixels[PixelIndex + 2] = FgPixel[2];
		Pixels[PixelIndex + 3] = Alpha;
	}
		
	//	draw image counter as dots
	const ImageCounter = ExeArgs.ImageCounter || 0;
	Pop.Debug(`ImageCounter=${ImageCounter}`);
	for ( let i=0;	i<ImageCounter;	i++ )
	{
		let pi = i*2;
		let w = Width-2;
		let x = (pi) % (w);
		let y = Math.floor(pi / w);
		y*=2;
		y++;
		x++;
		SetPixel(x,y,[0,0,0,255]);
	}	
	
	OutputImage.WritePixels(Width,Height,Pixels,'RGBA');
	//	gr: might need to be careful about number vs string
	const OutputScale = ExeArgs.ImageScale || 1;
	OutputImage.Resize(Width*OutputScale,Height*OutputScale);

	//	gr: might need to be careful about number vs string
	const CompressionLevel = ExeArgs.ImageCompression || 0.5;
	const Png = OutputImage.GetPngData(CompressionLevel);

	return Png;
};

async function RunTestImageMain()
{
	try
	{
		Pop.Debug(`GeneratePng...`);
		const Png = await GeneratePng();
		Pop.StdOut(Png);
		Pop.ExitApplication(0);
	}
	catch (e)
	{
		Pop.Debug(`RunTestImageMain() error ${e}`);
		Pop.StdOut(e);
		Pop.ExitApplication(1);
	}
}
RunTestImageMain();
