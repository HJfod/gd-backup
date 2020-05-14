const { BrowserWindow, app, shell } = require("electron");
const ipc = require("electron").ipcMain;
const path = require("path");
const fs = require("fs");
const zlib = require("zlib")

// require(path.join(__dirname,"scripts/save.js"));

const dim = { w: 400, h: 550 };

let w_main;
let gd_path;

let levels = []
let saveData;
let ext = "udat";

let dLoop = "";
dTesting: for (let i = 0; i < 5; i++) {
	try {
		fs.accessSync(path.join(__dirname + dLoop + "/resources"));
	} catch (err) {
		dLoop += "/..";
		continue dTesting;
	}
}

let required_dir = ['/levels',`/userdata.${ext}`];
for (let i in required_dir){
	let dir = path.join(__dirname + dLoop + required_dir[i]);
	try {
		fs.accessSync(dir)
	} catch (err) {
		if (dir.split("/").pop().indexOf(".") != -1){
			fs.writeFileSync(dir, "");
		}else{
			fs.mkdirSync(dir);
		}
	}
	console.log(dir);
}

let readset = fs.readFileSync(path.join(__dirname,dLoop,`/userdata.${ext}`));
let settings = {};
if (readset.length > 1) {
	settings = JSON.parse(readset);
}

app.on("ready", () => {
	w_main = new BrowserWindow({frame: true, icon: path.join(__dirname,"resources/icon.ico"), height: dim.h, width: dim.w, webPreferences: { preload: path.join(__dirname, "scripts/preload.js"), nodeIntegration: false, enableRemoteModule: false, contextIsolation: true } });
	
	w_main.loadFile("main.html");
	
	w_main.setMenu(null);
	
	w_main.on("closed", () => {
		app.quit();
	});
});

ipc.on("app", (event, arg) => {
	arg = JSON.parse(arg);
	console.log(arg.action);
	switch (arg.action) {
		case "return":
			w_main.webContents.send("app", `{ "action": "return", "text": "This is some text." }`);
			break;
		case "gd-path":
			gd_path = arg.path;
			validateGDPath();
			break;
		case "init":
			let p = (process.env.HOME || process.env.USERPROFILE) + "/AppData/Local/GeometryDash/CCLocalLevels.dat";
			p = p.replace(/\\/g,"/");
			w_main.webContents.send("app", `{ "action": "probable-path", "path": "${p}" }`);
			
			if (settings.gdpath) {
				gd_path = settings.gdpath;
				validateGDPath();
			}
			break;
		case "open-link":
			console.log(arg.link);
			shell.openExternal(arg.link);
			break;
		case "get-level":
			getLevel(arg.name);
			break;
		case "import-level":
			importLevel(arg.path);
			break;
		case "open-folder":
			require('child_process').exec('start ' + path.join(__dirname + dLoop,arg.folder));
			break;
	}
});

function xor(str, key) {
    str = String(str).split('').map(letter => letter.charCodeAt());
    let res = "";
    for (i = 0; i < str.length; i++) res += String.fromCodePoint(str[i] ^ key);
    return res;
}

function validateGDPath() {
	w_main.webContents.send("app", `{ "action": "loading", "a": "show", "text": "Loading your GD data..." }`);
	try {
		saveData = fs.readFileSync(gd_path, "utf8");
	} catch (err) {
		console.log(err);
		w_main.webContents.send("app", `{ "action": "loading", "a": "error", "lgt": "long", "text": "${err}" }`);
		return;
	}
	
	if (!saveData.startsWith('<?xml version="1.0"?>')) {
		console.log("Decoding save data...")
		saveData = xor(saveData, 11)
		saveData = Buffer.from(saveData, 'base64')
		try { saveData = zlib.unzipSync(saveData).toString() }
		catch (e) {
			w_main.webContents.send("app", `{ "action": "loading", "a": "error", "lgt": "long", "text": "${e}" }`);
			console.log("Error! GD save file seems to be corrupt!") 
			return;
		}
	}
	
	console.log("Save data decoded!");
	
	w_main.webContents.send("app", `{ "action": "loading", "a": "success", "lgt": "normal", "text": "Save data loaded!" }`);
	
	let c = fs.readFileSync(path.join(__dirname,dLoop,"/userdata." + ext), "utf8");
	let o = {};
	if (c.length > 1){
		o = JSON.parse(c);
	}
	o.gdpath = gd_path;
	fs.writeFileSync(path.join(__dirname,dLoop,"/userdata." + ext), JSON.stringify(o));
	
	w_main.webContents.send("app", `{ "action": "gd-path-confirmed" }`);
	
	levels = [];
	let levelList = saveData.match(/<k>k_\d+<\/k>.+?<\/d>\n? *<\/d>/gs)
	levelList.forEach(lvl => {
		levels.push(lvl)
	});
	
	let levelNameList = [];
	levels.forEach((lvl) => {
		n = lvl.split(`<k>k2</k><s>`).pop();
		levelNameList.push(n.substring(0,n.indexOf("<")).replace(/'/g,'"'));
	});
	w_main.webContents.send("app", `{ "action": "level-list", "list": "${levelNameList}" }`);
}

function getLevel(names) {
	names = names.split(",");
	if (typeof names  !== 'object'){
		names = [names];
	}
	names.forEach(name => {
		name = name.toLowerCase()
		let foundLevel = levels.find(x => x.toLowerCase().includes(`<k>k2</k><s>${name}</s>`));
		if (!foundLevel){
			w_main.webContents.send("app", `{ "action": "loading", "a": "error", "lgt": "long", "text": "Level does not exist." }`);
			console.log("Could not find level!");
			return;
		}
		else {
			fs.writeFileSync(path.join(__dirname,dLoop,`levels/${name}.gmd`), foundLevel.replace(/<k>k_\d+<\/k>/, ""), 'utf8');
			
			let msg = "";
			if (names.length > 1){
				msg = "all to levels"
			}else{
				msg = "to levels/" + name + ".gmd";
			}
			w_main.webContents.send("app", `{ "action": "loading", "a": "success", "lgt": "long", "text": "Succesfully exported ${msg}!" }`);
			console.log(`Saved to levels/${name}.gmd!`);
			return;
		}
	});
}

function importLevel(path) {
	try { fs.accessSync(path) } catch(err) {
		w_main.webContents.send("app", `{ "action": "loading", "a": "error", "lgt": "long", "text": "${err}" }`);
		console.log("Could not open this file!");
		return;
	}
	let levelFile = fs.readFileSync(path, 'utf8')
	let levelName = levelFile.match(/<k>k2<\/k><s>(.+?)<\/s>/)
	
	saveData = saveData.replace(/<k>k1<\/k><i>\d+?<\/i>/g,"");	// remove uploaded id
	saveData = saveData.split("<k>_isArr</k><t />")
	saveData[1] = saveData[1].replace(/<k>k_(\d+)<\/k><d><k>kCEK<\/k>/g, (n) => { return "<k>k_" + (Number(n.slice(5).split("<")[0])+1) + "</k><d><k>kCEK</k>" })
	saveData = saveData[0] + "<k>_isArr</k><t /><k>k_0</k>" + levelFile + saveData[1]
	
	fs.writeFileSync(gd_path, saveData, 'utf8')
	
	console.log(`Successfully added ${levelName[1]} to save file!`);
	w_main.webContents.send("app", `{ "action": "loading", "a": "success", "lgt": "long", "text": "Succesfully imported ${levelName[1]}!" }`);
}

/*
	
	TODO:
	
	-Refresh save file
	
*/
