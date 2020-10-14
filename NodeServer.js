const os = require( 'os' );
const fs = require( 'fs' );
const express = require( 'express' );
const app = express()
const { spawn } = require( "child_process" );

const Port = process.env.Port || 80;	//	gr: needs to be int?
const FailOnExitCode = (process.env.FailOnExitCode!=='false');
const Timeout_Default = 2 * 60;
const TimeoutSecs = process.env.TimeoutSecs ||  Timeout_Default;
let ImageCounter = 1;
const ErrorStatusCode = process.env.ErrorStatusCode || 500;

const PopExe_Module = "./node_modules/@newchromantics/popengine/ubuntu-latest/PopEngineTestApp";
const PopExe_Osx = '/Users/graham/Library/Developer/Xcode/DerivedData/PopEngine-edqmtlsljjncjvezlgagcmlvpbob/Build/Products/Debug_JavascriptCore/PopEngine.app/Contents/MacOS/PopEngine';
const PopExe = process.env.PopExePath || PopExe_Module || PopExe_Osx;
//const PopExe = "./node_modules/@newchromantics/popengine/ubuntu-latest/PopEngineTestApp"
//const PopExe = 'D:/PopEngine/Build/PopEngineApp_Debug_x64/PopEngineApp.exe';
const PopTestPath = process.env.PopTestPath || "./PopTestImage/";

console.log(`v0.0.5`);
console.log(`env Port -> ${Port} (${process.env.Port})`);
console.log(`env PopExePath -> ${PopExe} (${process.env.PopExePath})`);
console.log(`env PopTestPath -> ${PopTestPath} (${process.env.PopTestPath})`);
console.log(`env TimeoutSecs -> ${TimeoutSecs} (${process.env.TimeoutSecs})`);
console.log(`env ErrorStatusCode -> ${ErrorStatusCode} (${process.env.ErrorStatusCode})`);
console.log(`env FailOnExitCode -> ${FailOnExitCode} (${process.env.FailOnExitCode})`);
try
{
	const AllEnv = JSON.stringify(process.env,null,'\t');
	console.log(`env (all) ${AllEnv}`);
}
catch(e)
{
	console.log(`env (all) error -> ${e}`);
}

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

// Runs the Raymon app and sends back a zip of the data
async function RunApp(Request)
{
	const Args =
	[
		PopTestPath,
		`ImageCounter=${ImageCounter}`,
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
			Error.message = `Process non-zero exit code ${ExitCode}; StdErr=${StdErrlog}`;
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


app.get('/Image',HandleGetImage);


app.listen( Port, () => console.log( `Server running port: ${Port}/` ) );
