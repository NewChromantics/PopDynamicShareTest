const os = require( 'os' );
const fs = require( 'fs' );
const express = require( 'express' );
const app = express()
const { spawn } = require( "child_process" );


const OsxMode = os.platform() == 'darwin';

const Port = process.env.Port || 80;	//	gr: needs to be int?
const FailOnExitCode = (process.env.FailOnExitCode!=='false');
const Timeout_Default = 2 * 60;
const TimeoutSecs = process.env.TimeoutSecs ||  Timeout_Default;
let ImageCounter = 1;
const ErrorStatusCode = process.env.ErrorStatusCode || 500;
const StaticFilesPath = process.env.StaticFilesPath || './';
//	twitter meta min 300x157
//	https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/summary-card-with-large-image
const ImageWidth = process.env.ImageWidth || 40;	
const ImageHeight = process.env.ImageHeight || 40;
//const ImageScale = process.env.ImageScale || 1;
//const ImageCompression = process.env.ImageCompression || 0.5;

const PopExe_Module = "./node_modules/@newchromantics/popengine/ubuntu-latest/PopEngineTestApp";
const PopExe_Osx = '/Users/graham/Library/Developer/Xcode/DerivedData/PopEngine-edqmtlsljjncjvezlgagcmlvpbob/Build/Products/Debug_JavascriptCore/PopEngine.app/Contents/MacOS/PopEngine';
const PopExe = OsxMode ? PopExe_Osx : (process.env.PopExePath || PopExe_Module);
//const PopExe = "./node_modules/@newchromantics/popengine/ubuntu-latest/PopEngineTestApp"
//const PopExe = 'D:/PopEngine/Build/PopEngineApp_Debug_x64/PopEngineApp.exe';
const PopTestPath = process.env.PopTestPath || "./PopTestImage/";

console.log(`env Port -> ${Port} (${process.env.Port})`);
console.log(`env PopExePath -> ${PopExe} (${process.env.PopExePath})`);
console.log(`env PopTestPath -> ${PopTestPath} (${process.env.PopTestPath})`);
console.log(`env TimeoutSecs -> ${TimeoutSecs} (${process.env.TimeoutSecs})`);
console.log(`env ErrorStatusCode -> ${ErrorStatusCode} (${process.env.ErrorStatusCode})`);
console.log(`env FailOnExitCode -> ${FailOnExitCode} (${process.env.FailOnExitCode})`);
console.log(`env StaticFilesPath -> ${StaticFilesPath} (${process.env.StaticFilesPath})`);
console.log(`env ImageWidth -> ${ImageWidth} (${process.env.ImageWidth})`);
console.log(`env ImageHeight -> ${ImageHeight} (${process.env.ImageHeight})`);
try
{
	const AllEnv = JSON.stringify(process.env,null,'\t');
	console.log(`env (all) ${AllEnv}`);
}
catch(e)
{
	console.log(`env (all) error -> ${e}`);
}

/*
// Send log on timeout
app.use( ( req, res, next ) =>
{
	res.setTimeout( TimeoutSecs, function ()
	{
		res.statusCode = ErrorStatusCode;
		res.setHeader('Content-Type','text/plain');
		res.end(`Request Timeout`);
	} );

	next();
} );
*/

function CreatePromise()
{
	let Prom = {};
	function RunPromise(Resolve,Reject)
	{
		Prom.Resolve = Resolve;
		Prom.Reject = Reject;
	}
	Prom.Promise = new Promise(RunPromise);
	let OutProm = Prom.Promise;
	OutProm.Resolve = Prom.Resolve;
	OutProm.Reject = Prom.Reject;
	return OutProm;
}

function HexStringToRgb(HexString)
{
	const r = parseInt( HexString.slice(0,2), 16 ) || 0;
	const g = parseInt( HexString.slice(2,4), 16 ) || 0;
	const b = parseInt( HexString.slice(4,6), 16 ) || 0;

	return [r,g,b];	
}

// Runs the Raymon app and sends back a zip of the data
async function RunApp(Request)
{
	//	extract params from the request url
	//	Request.path -> /hello.png
	const UrlPath = Request.path.slice(1,-4);	//	strip / and .png
	const rrggbb = HexStringToRgb(UrlPath);

	const Args =
	[
		PopTestPath,
		`ImageCounter=${ImageCounter}`,
		`ImageWidth=${ImageWidth}`,
		`ImageHeight=${ImageHeight}`,
		`Red=${rrggbb[0]}`,
		`Green=${rrggbb[1]}`,
		`Blue=${rrggbb[2]}`,
	];
	const Raymon = spawn( PopExe, Args );

	const ProcessPromise = CreatePromise();

	let StdErrlog = '';
	let StdOutLog = null;

	function OnStdOut(Data)
	{
		//	gr: this is confusing, you can use Buffer as a string, or as a Buffer object
		//		JSON.stringify is misleading, the .data isn't really there

		console.log(`typeof Data.data ${typeof Data}`, JSON.stringify(Data));
		if (!StdOutLog)
		{
			console.log('StdOutLog = Data;');
			StdOutLog = Data;
		}
		else
		{
			console.log(`Buffer.concat(${StdOutLog},${Data})`);
			StdOutLog = Buffer.concat([StdOutLog,Data]);
		}
	}

	function OnStdErr(Data)
	{
		//console.log(`OnStdErr(typeof Data ${typeof Data})`, JSON.stringify(Data));
		StdErrlog += Data;
		//console.log(`stderr>${Data}`);
	}

	function OnError(Error)
	{
		ProcessPromise.Reject(Error.message);
	}

	function OnProcessExit(ExitCode)
	{
		console.log(`OnProcessExit(${ExitCode}) null=crash`);
		if (ExitCode !== 0 && FailOnExitCode )
		{
			const Error = {};
			//Error.message = `Process non-zero exit code ${ExitCode}; StdOut=${StdOutLog} StdErr=${StdErrlog}`;
			Error.message = `Process non-zero exit code ${ExitCode}; StdOut.length=${StdOutLog?StdOutLog.length:'null'} StdErr=${StdErrlog}`;
			OnError(Error);
			return;
		}
		const StdOutBuffer = Buffer.from(StdOutLog);
		ProcessPromise.Resolve(StdOutBuffer);
	}
	Raymon.on('error',OnError);
	//	gr: odd that these are different event names?
	Raymon.stdout.on('data',OnStdOut);
	Raymon.stderr.on('data',OnStdErr);
	Raymon.on("close",OnProcessExit);

	const Output = await ProcessPromise;

	const Result = {};
	Result.Mime = 'image/png';
	Result.Output = Output;

	return Result;
}

async function HandleGetImage(Request,Response)
{
	try
	{
		ImageCounter++;
		
		const Output = await RunApp(Request);
		Output.StatusCode = Output.StatusCode || 200;
		Output.Mime = Output.Mime || 'text/plain';

		Response.statusCode = Output.StatusCode;
		Response.setHeader('Content-Type',Output.Mime);
		Response.end(Output.Output);
	}
	catch (e)
	{
		console.log(`RunApp error -> ${e}`);
		Response.statusCode = ErrorStatusCode;
		Response.setHeader('Content-Type','text/plain');
		Response.end(`Error ${e}`);
	}
}


app.get('/*.png',HandleGetImage);
app.get('/', function (req, res) { res.redirect('/index.html') });
app.use('/', express.static(StaticFilesPath));


app.listen( Port, () => console.log( `Server running port: ${Port}/` ) );
