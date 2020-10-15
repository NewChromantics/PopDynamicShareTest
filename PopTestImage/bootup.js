
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








async function CreateTriangleBuffer(RenderContext,Geometry)
{
	//	auto-calc triangle counts or vertex sizes etc
	if ( !Geometry.TriangleCount )
	{
		if ( Geometry.PositionSize && Geometry.Positions )
		{
			Geometry.TriangleCount = Geometry.Positions.length / Geometry.PositionSize;
		}
		else
		{
			throw `Cannot determine trianglecount/vertex attribute size for geometry`;
		}
	}
	
	const VertexAttribs = [];
	const LocalPosition = {};
	//	gr: should engine always just figure this out?
	LocalPosition.Size = Geometry.Positions.length / Geometry.TriangleCount;
	LocalPosition.Data = new Float32Array( Geometry.Positions );
	VertexAttribs['LocalPosition'] = LocalPosition;
	
	if ( Geometry.TexCoords )
	{
		const Uv0 = {};
		Uv0.Size = Geometry.TexCoords.length / Geometry.TriangleCount;
		Uv0.Data = new Float32Array( Geometry.TexCoords );
		VertexAttribs['LocalUv'] = Uv0;
	}
	
	//const TriangleIndexes = new Int32Array( Geometry.TriangleIndexes );
	const TriangleIndexes = undefined;
	const TriangleBuffer = await RenderContext.CreateGeometry( VertexAttribs, TriangleIndexes );
	
	//	these need to be in the right order...
	//	that depends what order thejs lib reads VertexAttribs in CreateGeometry...
	//	TriangleBuffer isn't an object either...
	ScreenQuad_Attribs = Object.keys(VertexAttribs);
	
	return TriangleBuffer;
}

function GetScreenQuad(MinX,MinY,MaxX,MaxY,TheZ=0)
{
	let Positions = [];
	let TexCoords = [];
	
	function AddTriangle(a,b,c)
	{
		Positions.push( ...a.slice(0,3) );
		Positions.push( ...b.slice(0,3) );
		Positions.push( ...c.slice(0,3) );
		
		const TriangleIndex = Positions.length / 3;
		function PosToTexCoord(xyzuv)
		{
			const u = xyzuv[3];
			const v = xyzuv[4];
			const w = TriangleIndex;
			return [u,v,w];
		}
		
		TexCoords.push( ...PosToTexCoord(a) );
		TexCoords.push( ...PosToTexCoord(b) );
		TexCoords.push( ...PosToTexCoord(c) );
	}
	
	let tr = [MaxX,MinY,TheZ,	1,0];
	let tl = [MinX,MinY,TheZ,	0,0];
	let br = [MaxX,MaxY,TheZ,	1,1];
	let bl = [MinX,MaxY,TheZ,	0,1];
	
	AddTriangle( tl, tr, br );
	AddTriangle( br, bl, tl );
	
	const Geometry = {};
	Geometry.Positions = Positions;
	Geometry.PositionSize = 3;
	Geometry.TexCoords = TexCoords;
	return Geometry;
}

async function GetScreenQuad_TriangleBuffer(RenderContext)
{
	const Geometry = GetScreenQuad(-0.5,-0.5,0.5,0.5,0.5);
	const Buffer = CreateTriangleBuffer(RenderContext,Geometry);
	return Buffer;
}

const TestShader_VertSource =`
precision highp float;
attribute vec3 LocalUv;
attribute vec3 LocalPosition;
varying vec2 uv;
void main()
{
	gl_Position = vec4(LocalPosition,1);
	gl_Position.z = 0.5;
	uv = LocalUv.xy;
}
`;
const TestShader_FragSource =`
precision highp float;
varying vec2 uv;
void main()
{
	gl_FragColor = vec4(uv,0.0,1.0);
}
`;
//	todo: get rid of this requirement from sokol
const TestShaderUniforms = [];
let ScreenQuad_Attribs = null;

let RenderImage = null;

function GetRenderCommands()
{
	const Commands = [];
	Commands.push(['Clear',1,0,1]);
	const Uniforms = {};
	Commands.push(['Draw',ScreenQuad,TestShader,Uniforms]);
	
	return Commands;
}


async function GetShader(RenderContext)
{
	const FragSource = TestShader_FragSource;
	const VertSource = TestShader_VertSource;

	const TestShaderAttribs = ScreenQuad_Attribs;
	const TestShader = await RenderContext.CreateShader(VertSource,FragSource,TestShaderUniforms,TestShaderAttribs);
	Pop.Debug(`TestShader=${TestShader}`);
	
	return TestShader;
}

async function GetScreenQuad(RenderContext)
{
	const ScreenQuad = await GetScreenQuad_TriangleBuffer(RenderContext);
}

async function GenerateOpenglImage()
{
	//	Headless is a magic name at the moment
	//	todo: rename to false or null
	const Window = new Pop.Gui.Window("Headless");
	const Sokol = new Pop.Sokol.Context(Window, "GLView");

	//	create assets
	let TestShader = await GetShader(Sokol);
	let ScreenQuad = await GetScreenQuad(Sokol);
	
	const Commands = GetRenderCommands();
	await Sokol.Render(Commands);
	
	//	read back target...
	throw `Now read back target`;	
}




async function GenerateTestImage()
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
	return OutputImage;
}

async function GeneratePng(TestImage)
{
	const OutputImage = await ( TestImage ? GenerateTestImage() : GenerateOpenglImage() );
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
		const TestImage = false;
		const Png = await GeneratePng(TestImage);
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
