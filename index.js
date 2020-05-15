const { BrowserWindow, app, shell, dialog } = require("electron");
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
let export_path;
let ext = "udat";
let thext = "gdbt";
let themeList = [];

let dLoop = "";
dTesting: for (let i = 0; i < 5; i++) {
	try {
		fs.accessSync(path.join(__dirname + dLoop + "/resources"));
	} catch (err) {
		dLoop += "/..";
		continue dTesting;
	}
}

let required_dir = ['/levels','/data',`/data/userdata.${ext}`,'/data/themes'];
for (let i in required_dir){
	let dir = path.join(__dirname + dLoop + required_dir[i]);
	try {
		fs.accessSync(dir)
	} catch (err) {
		if (dir.split("/").pop().indexOf(".") != -1){
			fs.writeFileSync(dir, "");
		}else{
			fs.mkdirSync(dir);
			if (dir.endsWith("\\themes")) createDefaultThemes(dir);
		}
	}
	console.log(dir);
}

let readset = fs.readFileSync(path.join(__dirname,dLoop,`/data/userdata.${ext}`));
let settings = {};
if (readset.length > 1) {
	settings = JSON.parse(readset);
}

app.on("ready", () => {
	w_main = new BrowserWindow({frame: true, icon: path.join(__dirname,"resources/icon-env.ico"), height: dim.h, width: dim.w, webPreferences: { preload: path.join(__dirname, "scripts/preload.js"), nodeIntegration: false, enableRemoteModule: false, contextIsolation: true } });
	
	w_main.loadFile("main.html");
	
	// w_main.setMenu(null);
	
	w_main.on("closed", () => {
		app.quit();
	});
});

ipc.on("app", (event, arg) => {
	arg = JSON.parse(arg);
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
			w_main.webContents.send("app", `{ "action": "version", "v": "v${require('./package.json').version}" }`);

			fs.readdirSync(path.join(__dirname + dLoop, "data/themes")).filter(i => i.endsWith(thext)).forEach(i => {
				w_main.webContents.send("app", `{ "action": "add-theme", "cont": ${fs.readFileSync(path.join(__dirname + dLoop, "data/themes", i))} }`);
			});
			
			if (settings.gdpath) {
				gd_path = settings.gdpath;
				validateGDPath();
			}
			if (settings.theme){
				w_main.webContents.send("app", `{ "action": "switch-theme", "to": "${settings.theme}" }`);
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
			require('child_process').exec('start "" "' + path.join(__dirname + dLoop,arg.folder + '"'));
			break;
		case "select-export":
			export_path = dialog.showOpenDialogSync({ title: "Select export folder", properties: ["openDirectory"] })[0];
			export_path = export_path.replace(/\\/g,"/");
			break;
		case "change-theme":
			saveToUserdata("theme",arg.theme);
			break;
		case "check-for-updates":
			const https = require('https');
			let o = {
                hostname: `api.github.com`,
                path: `/repos/HJfod/gd-backup/releases/latest`,
                headers: {
                    'User-Agent': 'request'
                }
            }
			https.get(o, res => {
				if (res.statusCode !== 200){
					w_main.webContents.send("app", `{ "action": "loading", "a": "error", "lgt": "normal", "text": "${res.statusCode}: Unable to check for updates" }`);
					return console.log(res.statusCode);
				}
				let rawData = '';
				res.on('data', chunk => rawData += chunk );
				res.on('end', () => {
					try {
						const parsedData = JSON.parse(rawData);
						let app_v = require('./package.json').version;
						let new_v = parsedData.tag_name.replace("v","");
						if (new_v === app_v){
							w_main.webContents.send("app", `{ "action": "loading", "a": "success", "lgt": "normal", "text": "You are up to date (v${app_v})" }`);
							console.log("Up to date!");
						}else{
							if (Number(new_v.replace(/\./g,"")) > Number(app_v.replace(/\./g,""))){
								w_main.webContents.send("app", `{ "action": "loading", "a": "warning", "lgt": "infinite", "text": "New version found (v${new_v})", "button": { "text": "Get update", "action": "openLink('https://github.com/HJfod/gd-backup/releases/latest')" } }`);
							}else{
								w_main.webContents.send("app", `{ "action": "loading", "a": "warning", "lgt": "long", "text": "You are using a newer version than last stable release (v${new_v})" }`);
							}
							console.log(`Version ${new_v} found, current: ${app_v}!`);
						}
					} catch (e) {
						console.error(e.message);
					}
				});
			});
			break;
	}
});

function xor(str, key) {
    str = String(str).split('').map(letter => letter.charCodeAt());
    let res = "";
    for (i = 0; i < str.length; i++) res += String.fromCodePoint(str[i] ^ key);
    return res;
}

function saveToUserdata(key, val) {
	let c = fs.readFileSync(path.join(__dirname,dLoop,"/data/userdata." + ext), "utf8");
	let o = {};
	if (c.length > 1){
		o = JSON.parse(c);
	}
	o[key]= val;
	console.log(o);
	fs.writeFileSync(path.join(__dirname,dLoop,"/data/userdata." + ext), JSON.stringify(o));
}

function createDefaultThemes(dir) {
	let themes = [
		{
			name: "Normal",
			colors: {
				bg: "#fff",
				text: "#000",
				sec: "#baf",
				lighten: -.2
			}
		},
		{
			name: "Dark",
			colors: {
				bg: "#11131e",
				text: "#fff",
				sec: "#75ffec",
				lighten: .4
			}
		}
	]
	for (let i in themes){
		fs.writeFileSync(`${dir}\\${themes[i].name.toLowerCase()}.${thext}`, JSON.stringify(themes[i]));
	}
	console.log("Made default themes");
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

	saveToUserdata("gdpath",gd_path);
	
	w_main.webContents.send("app", `{ "action": "gd-path-confirmed" }`);
	
	levels = [];
	let levelList = saveData.match(/<k>k_\d+<\/k>.+?<\/d>\n? *<\/d>/gs)
	if (levelList) {
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
			let outputdir = export_path ? `${export_path}/${name}.gmd` : path.join(__dirname,dLoop,`levels/${name}.gmd`);		// export path
			let n = 0;
			while (fs.existsSync(outputdir)) {	// check if level with same name exists
				outputdir = outputdir.substring(0,outputdir.length - name.length - 4 - (n ? n.toString().length : 0)) + name + n + ".gmd";
				n++;
				if (n > 20) return w_main.webContents.send("app", `{ "action": "loading", "a": "error", "lgt": "long", "text": "Too many levels with this name." }`);
			}
			fs.writeFileSync(outputdir, foundLevel.replace(/<k>k_\d+<\/k>/, ""), 'utf8');
			
			let msg = "";
			if (names.length > 1){
				msg = "all levels"
			}else{
				msg = export_path ? `${export_path}/${name}.gmd` : `to levels/${name}.gmd`;
			}
			w_main.webContents.send("app", `{ "action": "loading", "a": "success", "lgt": "long", "text": "Succesfully exported ${msg}!" }`);
			console.log(`Saved to ${msg}!`);
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
