const LOCAL_ROOT = ".";
const BUILD_DEV = "build/dev";
const BUILD_PROD = "build/prod";
const BUILD_TEMP = "build/temp";
const NODE_MODULES_PATH = "./node_modules";
const fs = require("fs"); // it's included in node.js by default, no need for any additional packages
const args = process.argv.slice(2);
if (args.includes("--prod"))
{
	process.env.NODE_ENV = "production";
}
const isProduction = process.env.NODE_ENV === "production";
const buildFolder = isProduction ? BUILD_PROD : BUILD_DEV;
const checkForTypeErrors = !args.includes("--fast");

const {build} = require("esbuild");

buildApp();

async function buildApp()
{
	console.time("Build time");

	if (checkForTypeErrors)
	{
		console.log("\x1b[33m%s\x1b[0m", "Looking for type errors...");

		try
		{
			if (isProduction)
			{
				res = exec("tsc", "--noEmit");
			}
			else
			{
				res = exec("tsc", `--incremental --composite false --tsBuildInfoFile ${BUILD_TEMP}/tsconfig.tsbuildinfo`);
			}
		}
		catch (e)
		{
			// typescript error
			process.exit(1);
		}
	}

	console.log("\x1b[33m%s\x1b[0m", "Copying static files...");

	shx(`rm -rf ${buildFolder}`);
	shx(`mkdir ${buildFolder}/`);
	shx(`cp src/index.html ${buildFolder}/index.html`);

	assets(buildFolder);

	const promises = [
		css(buildFolder),
		buildJs(buildFolder)
	];

	await Promise.all(promises);

	if (isProduction)
	{
		console.log("\x1b[33m%s\x1b[0m", "Minifying shaders...");
		await minifyShaders(buildFolder);
	}

	console.log("\x1b[32m%s\x1b[0m", "Build done!");

	console.timeEnd("Build time");
}

async function minifyShaders(buildFolder)
{
	// Assumes we're using backticks (`) for shaders, and define "precision highp float" in the beginning
	const bundleFile = bundleFilePath(buildFolder);
	const bundleJs = await readTextFile(bundleFile);

	let optimizedBundleJs = bundleJs;

	let shaderStartIndex = 0;

	const keyword = "precision highp float;";

	shaderStartIndex = optimizedBundleJs.indexOf(keyword, shaderStartIndex);

	while (shaderStartIndex > -1)
	{
		const shaderEndIndex = optimizedBundleJs.indexOf("`", shaderStartIndex);
		const shader = optimizedBundleJs.substring(shaderStartIndex, shaderEndIndex);
		const minifiedShader = minifyGlsl(shader);

		optimizedBundleJs = `${optimizedBundleJs.substring(0, shaderStartIndex)}${minifiedShader}${optimizedBundleJs.substring(shaderEndIndex)}`;

		++shaderStartIndex;
		shaderStartIndex = optimizedBundleJs.indexOf(keyword, shaderStartIndex);
	}

	await writeTextFile(bundleFile, optimizedBundleJs);
}

function minifyGlsl(input)
{
	// remove all comments
	// https://stackoverflow.com/questions/5989315/regex-for-match-replacing-javascript-comments-both-multiline-and-inline
	let output = input
		.replace(/(\/\*(?:(?!\*\/).|[\n\r])*\*\/)/g, "") // multiline comment
		.replace(/(\/\/[^\n\r]*[\n\r]+)/g, ""); // single line comment

	// replace defitionions with values throughout the whole glsl code
	let indexOfDefine = output.indexOf("#define");
	while (indexOfDefine > -1)
	{
		const endOfLineIndex = output.indexOf("\n", indexOfDefine);
		const row = output.substring(indexOfDefine, endOfLineIndex);

		// replace #define rows with empty string
		output = `${output.substring(0, indexOfDefine)}${output.substring(endOfLineIndex)}`;

		const definitions = row.split(" ");
		const key = definitions[1];
		const value = definitions.slice(2).join(" "); // value might contain spaces, like vec3(0.0, 0.5, 0.2)

		const regExp = new RegExp(key, "gm");
		output = output.replace(regExp, value);

		indexOfDefine = output.indexOf("#define");
	}

	// Remove whitespaces
	output = output.replace(/(\s)+/gm, " ").replace(/; /gm, ";");

	return output;
}

function shx(command)
{
	const module = "shx";
	const args = command;

	return exec_module(module, args);
}

function exec_module(module, args)
{
	return exec(`"${NODE_MODULES_PATH}/.bin/${module}"`, args);
}

function exec(command, args)
{
	//console.log("command", command, args);

	args = args || "";

	// http://stackoverflow.com/questions/30134236/use-child-process-execsync-but-keep-output-in-console
	// https://nodejs.org/api/child_process.html#child_process_child_stdio

	const stdio = [
		0,
		1, // !
		2
	];

	let result;
	try
	{
		result = require("child_process").execSync(command + " " + args, {stdio: stdio});
	}
	catch (e)
	{
		// this is needed for messages to display when from the typescript watcher
		throw e;
	}

	return result;
}

function assets(buildFolder)
{
	console.log("\x1b[33m%s\x1b[0m", "Copying assets...");
	shx(`rm -rf ${buildFolder}/assets`);
	shx(`cp -R ${LOCAL_ROOT}/src/assets ${buildFolder}/assets`);
}

function readTextFile(filePath)
{
	return new Promise((resolve, reject) =>
	{
		fs.readFile(filePath, function (err, data)
		{
			if (err)
			{
				reject(err);
			}
			else
			{
				resolve(data.toString());
			}
		});
	});
}

function writeTextFile(filePath, data)
{
	return new Promise((resolve, reject) =>
	{
		fs.writeFile(filePath, data, function (err)
		{
			if (err)
			{
				reject(err);
			}
			else
			{
				resolve(data);
			}
		});
	});
}

async function replaceTextInFile(filePath, oldText, newText)
{
	const regExp = new RegExp(oldText, "g");
	const fileContent = await readTextFile(filePath);
	await writeTextFile(filePath, fileContent.replace(regExp, newText));
}

function css(buildFolder)
{
	shx(`cp -R src/css ${buildFolder}/css`);
}

function bundleFilePath(buildFolder)
{
	return `${buildFolder}/js/app.bundle.js`;
}

function buildJs(buildFolder)
{
	const jsFile = bundleFilePath(buildFolder);

	const options = {
		entryPoints: ["./src/ts/Main.ts"],
		target: "es2017",
		minify: isProduction,
		sourcemap: !isProduction,
		bundle: true,
		//splitting: true, // for dynamic import (await import)
		//outdir: buildFolder,
		outfile: jsFile,
		//format: "esm"
	};

	console.log("\x1b[33m%s\x1b[0m", "Bundling js...");

	return build(options);
}