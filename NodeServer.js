const os = require( 'os' );
const fs = require( 'fs' );
const express = require( 'express' );
const app = express()
const { spawn } = require( "child_process" );

const port = 3000;
const TimeOutLimit = 2 * 60 * 1000; // 2 mins

//const PopExe = "./node_modules/@newchromantics/popengine/ubuntu-latest/PopEngineTestApp"
const PopExe = 'D:/PopEngine/Build/PopEngineApp_Debug_x64/PopEngineApp.exe';
const PopTestImagePath = "./PopTestImage/"


// Send log on timeout
app.use( ( req, res, next ) =>
{
	res.setTimeout( TimeOutLimit, function ()
	{
		res.statusCode = 400;
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
		PopTestImagePath
	];
	const Raymon = spawn( PopExe, Args );

	const ProcessPromise = CreatePromise();

	let StdErrlog = null;
	let StdOutLog = null;

	function OnStdOut(Data)
	{
		StdOutLog += Data;
	}

	function OnStdErr(Data)
	{
		StdErrlog += Data;
	}

	function OnError(Error)
	{
		ProcessPromise.Reject(Error.message);
	}

	function OnProcessExit(ExitCode)
	{
		if (ExitCode != 0)
		{
			const Error = {};
			Error.message = `Process non-zero exit code ${ExitCode}; StdOut=${StdOutLog} StdErr=${StdErrlog}`;
			OnError(Error);
			return;
		}
		ProcessPromise.Resolve(StdOutLog);
	}
	Raymon.on('error',OnError);
	//	gr: odd that these are different event names?
	Raymon.stdout.on('data',OnStdOut);
	Raymon.stderr.on('stderr',OnStdErr);
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
		const Output = await RunApp(Request);
		Output.StatusCode = Output.StatusCode || 200;
		Output.Mime = Output.Mime || 'text/plain';

		Response.statusCode = Output.StatusCode;
		Response.setHeader('Content-Type',Output.Mime);
		Response.end(Output.Output);
	}
	catch (e)
	{
		Response.statusCode = 200;
		Response.setHeader('Content-Type','text/plain');
		Response.end(`Error ${e}`);
	}
}


app.get('/Image',HandleGetImage);


app.listen( port, () => console.log( `Server running port: ${port}/` ) );
