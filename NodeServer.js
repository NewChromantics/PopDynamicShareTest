const os = require( 'os' );
const fs = require( 'fs' );
const express = require( 'express' );
const fileUpload = require( 'express-fileupload' );
const app = express()
const { spawn } = require( "child_process" );

const pjson = require('./package.json');
const port = 3000;
const TimeOutLimit = 120000; // 2 mins

const PopExe = "./node_modules/@newchromantics/popengine/ubuntu-latest/PopEngineTestApp"
const RaymonBootPath = "./node_modules/@newchromantics/heizenradar_raymon/"
let RayDataFilename;
let SceneObjFilename;
let ZipSaveLocation;

let log = `Server Version: ${pjson.version}`;
log += `HeizenRadar Raymon Version: ${pjson.dependencies["@newchromantics/heizenradar_raymon"]}\n`;

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

app.use('/upload', fileUpload(
	{
		useTempFiles: true,
		tempFileDir: os.tmpdir()
	}),
);

app.use( '/process', express.json() );

function ServerResponse(res, value) {
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

// Runs the Raymon app and sends back a zip of the data
function RunApp( res )
{
	const Raymon = spawn( PopExe, [ RaymonBootPath, `RayDataFilename=${RayDataFilename}`, `ObjFilename=${SceneObjFilename}`, `ZipSaveLocation=${ZipSaveLocation}` ] );
	log = "";
	let ZipFile = "";
	Raymon.stdout.on( "data", ( data ) =>
	{
		console.log( `stdout: ${data}` );
		log += data;
		let StringData = data.toString();

		if ( StringData.startsWith( "Zipname" ) )
		{
			var Regex = /\w+.zip/
			let RegexArray = Regex.exec( StringData );
			console.log( RegexArray[ 0 ] )
			ZipFile = RegexArray[ 0 ];
		}
	} );

	Raymon.stderr.on( "stderr", ( stderr ) =>
	{
		log += stderr;

		ServerResponse(res, 'error')
	} );

	Raymon.on( 'error', ( error ) =>
	{
		console.log( `error: ${error.message}` );
		log += error.message;

		ServerResponse(res, 'error')
	} );

	Raymon.on( "close", ( code ) =>
	{
			console.log("Finished")
			const filePath = `${RaymonBootPath}${ZipFile}`;

			let stats  = fs.statSync(filePath);
			if (stats.size < 23)
			{
				ServerResponse(res, "nodata")
			}
			else
			{
				res.download( filePath, e =>
					{
						if(e)
						{
							console.log(e);
							ServerResponse(res, 'error')
						}
					})
			}
	} );
}

app.post( '/upload', async ( req, res ) =>
{
	if ( !req.files || Object.keys( req.files ).length === 0 )
	{
		return res.status( 400 ).send( 'No files were uploaded.' );
	}

	try
	{
		RayDataFilename = req.files.data.tempFilePath;
		// remove this if to throw an error if an object is not uploaded
		if ( req.files.obj )
		{
			SceneObjFilename = req.files.obj.filePath;
		}
		else
		{
			SceneObjFilename = "Assets/Room3.obj";
		}
	}
	catch ( error )
	{
		return res.status( 400 ).send( `Wrong key value for the file upload, Must be "data"` );
	}

	try
	{
		RunApp( res )
	}
	catch ( error )
	{
		console.log( error );
	}
} );

app.post( '/process', async ( req, res ) =>
{
	if( typeof req.body !== 'object')
	{
		return res.status( 400 ).send( 'JSON Object not uploaded.' );
	}

	RayDataFilename = req.body.FilePath;
	ZipSaveLocation = req.body.ZipOutputPath;
	if ( req.body.ObjPath )
	{
		SceneObjFilename = req.body.ObjPath;
	}
	else
	{
		SceneObjFilename = "Assets/Room3.obj";
	}

	try
	{
		RunApp( res )
	}
	catch ( error )
	{
		console.log( error );
	}

})

app.listen( port, () => console.log( `Server running port: ${port}/` ) );
