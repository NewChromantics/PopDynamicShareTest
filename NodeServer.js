const os = require( 'os' );
const fs = require( 'fs' );
const express = require( 'express' );
const app = express()
const { spawn } = require( "child_process" );

const port = 3000;
const TimeOutLimit = 120000; // 2 mins

//const PopExe = "./node_modules/@newchromantics/popengine/ubuntu-latest/PopEngineTestApp"
const PopExe = 'D:/PopEngine/Build/PopEngineApp_Debug_x64/PopEngineApp.exe';
const PopTestImagePath = "./PopTestImage/"


// Send log on timeout
app.use( ( req, res, next ) =>
{
	res.setTimeout( TimeOutLimit, function ()
	{
		console.log( 'Request has timed out.' );
		ServerResponse( res, "timeout" )
	} );

	next();
} );


//app.use( '/process', express.json() );

function ServerResponse(res,value)
{
	switch(value)
	{
		case "error":
			res.statusCode = 500;
			res.setHeader( 'Content-Type', 'text/plain' );
			res.end( `ERROR LOG: \n${log}` );
			break;

		case "success":
			res.statusCode = 200;
			res.setHeader( 'Content-Type', 'text/plain' );
			res.end("Success");
			break;

		case "timeout":
			res.statusCode = 400;
			res.setHeader( 'Content-Type', 'text/plain' );
			res.end( `Request Timeout: \n${log}` );
			break;

		case "nodata":
			res.statusCode = 400;
			res.setHeader( 'Content-Type', 'text/plain' );
			res.end( `No data: \n${log}` );
			break;
	};
}

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
	let ExitCode = null;

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

	function OnProcessExit(ProcessExitCode)
	{
		if (ExitCode != 0)
		{
			const Error = {};
			Error.message = `Process non-zero exit code ${ProcessExitCode}; StdOut=${StdOutLog} StdErr=${StdErrlog}`;
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

	const Result = await ProcessPromise;
	return Resut;
}

async function HandleGetImage(Request,Response)
{
	try
	{
		const Output = await RunApp(Request);
		Response.statusCode = 200;
		//	get mime from Output
		Response.setHeader('Content-Type','text/plain');
		Response.end(Output);
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
