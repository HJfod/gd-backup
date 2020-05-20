const { BrowserWindow, app, shell, dialog } = require("electron");
const ipc = require("electron").ipcMain;
const path = require("path");
const fs = require("fs");
const zlib = require("zlib");
const exec = require('child_process').exec;
const rimraf = require("rimraf");

// require(path.join(__dirname,"scripts/save.js"));

const dim = { w: 400, h: 550 };

let w_main;
let w_sett = null;
let gd_path;

let levels = []
let saveData;
let export_path;
let ext = "udat";
let thext = "gdbt";
let themeList = [];
let dateFormat = false;
let includedBackupDirs = [];
let settSection = "";
let settTheme = "";

const windowSett = {
	frame: true, 
	icon: path.join(__dirname,"resources/icon-2.ico"), 
	height: dim.h, 
	width: dim.w, 
	webPreferences: { 
		preload: path.join(__dirname, "scripts/preload.js"), 
		nodeIntegration: false, 
		enableRemoteModule: false, 
		contextIsolation: true
	} 
}

let dLoop = "";
dTesting: for (let i = 0; i < 5; i++) {
	try {
		fs.accessSync(path.join(__dirname + dLoop + "/resources"));
	} catch (err) {
		dLoop += "/..";
		continue dTesting;
	}
}

const isRunning = (query, cb) => {
    let platform = process.platform;
    let cmd = '';
    switch (platform) {
        case 'win32' : cmd = `tasklist`; break;
        case 'darwin' : cmd = `ps -ax | grep ${query}`; break;
        case 'linux' : cmd = `ps -A`; break;
        default: break;
    }
    exec(cmd, (err, stdout, stderr) => {
        cb(stdout.toLowerCase().indexOf(query.toLowerCase()) > -1);
    });
}

let required_dir = [
	{ dir: '/levels', type: 'dir', create: '' },
	{ dir: '/data', type: 'dir', create: '' },
	{ dir: `/data/userdata.${ext}`, type: 'file', create: '' },
	{ dir: '/data/themes', type: 'dir', create: 'themes' }
];

for (let i in required_dir){
	let dir = path.join(__dirname + dLoop + required_dir[i].dir);
	try {
		fs.accessSync(dir)
	} catch (err) {
		if (required_dir[i].type === 'file'){
			fs.writeFileSync(dir, "");
		}else if (required_dir[i].type === 'dir'){
			fs.mkdirSync(dir);
			if (required_dir[i].create === 'themes') createDefaultThemes(dir);
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
	w_main = new BrowserWindow(windowSett);
	
	w_main.loadFile("main.html");
	
	//w_main.setMenu(null);
	
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
			// w_main.webContents.send("app", `{ "action": "gd-is-running" }`

			let p = (process.env.HOME || process.env.USERPROFILE) + "/AppData/Local/GeometryDash/CCLocalLevels.dat";
			p = p.replace(/\\/g,"/");
			w_main.webContents.send("app", `{ "action": "gd-path", "path": "${p}" }`);
			w_main.webContents.send("app", `{ "action": "version", "v": "v${require('./package.json').version}" }`);

			fs.readdirSync(path.join(__dirname + dLoop, "data/themes")).filter(i => i.endsWith(thext)).forEach(i => {
				w_main.webContents.send("app", `{ "action": "add-theme", "cont": ${fs.readFileSync(path.join(__dirname + dLoop, "data/themes", i))} }`);
			});
			
			if (settings.includedDirs){
				includedBackupDirs = settings.includedDirs;
			}
			isRunning('GeometryDash.exe', status => {
				if (!status) {
					if (settings.gdpath) {
						gd_path = settings.gdpath;
						validateGDPath();
					}
				} else {
					w_main.webContents.send("app", `{ 
						"action": "force-app-close",
						"text": "You need to close GD in order for this app to work."
					}`);
				}
			});
			if (settings.dateFormat){
				w_main.webContents.send("app", `{ "action": "date-format", "f": ${settings.dateFormat} }`);
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
		case "get-level-info":
			getLevelInfo(arg.name);
			break;
		case "import-level":
			importLevel(arg.path);
			break;
		case "change-date-format":
			dateFormat = arg.toInvert;
			saveToUserdata("dateFormat",dateFormat);
			break;
		case "open-folder":
			require('child_process').exec('start "" "' + path.join(__dirname + dLoop, arg.folder) + '"');
			break;
		case "select-export":
			export_path = dialog.showOpenDialogSync({ title: "Select export folder", properties: ["openDirectory"] })[0];
			export_path = export_path.replace(/\\/g,"/");
			break;
		case "change-theme":
			saveToUserdata("theme",arg.theme);
			settTheme = arg.theme;
			if (w_sett) {
				w_sett.webContents.send("app", `{ "action": "switch-theme", "to": ${fs.readFileSync(path.join(__dirname + dLoop, "data/themes", arg.theme + "." + thext))} }`);
			}
			break;
		case "new-backup":
			makeNewBackup(arg.force ? arg.force : false);
			break;
		case "import-backup":
			addBackup();
			break;
		case "refresh-backup":
			refreshDataFolder();
			break;
		case "switch-backup":
			switchToBackup(arg.ext, arg.force ? arg.force : false);
			break;
		case "help-init":
			if (w_sett){
				w_sett.webContents.send("app", `{ "action": "help-init", "section": "${settSection}" }`);
				if (settTheme) {
					w_sett.webContents.send("app", `{ "action": "switch-theme", "to": ${fs.readFileSync(path.join(__dirname + dLoop, "data/themes", settTheme + "." + thext))} }`);
				}
			}
			break;
		case "open-help":
			if (w_sett === null){
				w_sett = new BrowserWindow(windowSett);
				w_sett.loadFile("help.html");
	
				w_sett.setMenu(null);

				w_sett.on("closed", () => {
					w_sett = null;
				});
			} else if (arg.section) {
				w_sett.webContents.send("app", ` { "action": "section", "to": "${arg.section}" } `);
			}
			settSection = arg.section;
			break;
		case "browse-for-path":
			let def = ((process.env.HOME || process.env.USERPROFILE) + "\\AppData\\Local\\GeometryDash");
			console.log(def);
			let pa = dialog.showOpenDialogSync({ title: "Select CCLocalLevels.dat", filters: "*.dat", defaultPath: def, properties: ["showHiddenFiles"] });
			if (pa) w_main.webContents.send("app", `{ "action": "gd-path", "path": "${pa[0].replace(/\\/g,"/")}" }`);
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
						if (arg.changelog){
							dat = "";
							parsedData.body.split("\n").forEach(i => i.startsWith("!") ? dat = dat : dat += i + "\n" );
							console.log(dat);
							dialog.showMessageBoxSync({ type: "info", title: `Changelog ${parsedData.tag_name}`, message: `${dat}` });
							return true;
						}
						let app_v = require('./package.json').version;
						let new_v = parsedData.tag_name.replace("v","");
						if (new_v === app_v){
							w_main.webContents.send("app", `{ "action": "loading", "a": "success", "lgt": "normal", "text": "You are up to date (v${app_v})" }`);
							console.log("Up to date!");
						}else{
							if (Number(new_v.replace(/\./g,"")) > Number(app_v.replace(/\./g,""))){
								if (arg.return){
									w_main.webContents.send("app", `{
										"action": "notification",
										"place": ["#nav-sett p","#aboutSection","h5[onclick='checkUpdate()']"],
										"id": "notif-update"
									}`);
								}else{
									w_main.webContents.send("app", `{ 
										"action": "loading", 
										"a": "warning", 
										"lgt": "infinite", 
										"text": "New version found (v${new_v})", 
										"button": [
											{ "text": "Get update", "action": "openLink('https://github.com/HJfod/gd-backup/releases/latest')" } 
										]
									}`);
								}
							}else{
								w_main.webContents.send("app", `{ 
									"action": "loading", 
									"a": "warning", 
									"lgt": "long", 
									"text": "You are using a newer version than last stable release (v${new_v})" 
								}`);
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
	fs.writeFileSync(path.join(__dirname,dLoop,"/data/userdata." + ext), JSON.stringify(o));
}

function refreshDataFolder() {
	w_main.webContents.send("app", `{ "action": "clear-data-folder" }`);
	w_main.webContents.send("app", `{ "action": "loading", "a": "show", "text": "Loading your backup data..." }`);

	fs.readdirSync(path.join(gd_path + '/..'), { withFileTypes: true }).forEach(i => {
		if (i.name.startsWith("GDSHARE")){
			w_main.webContents.send("app", `{ "action": "data-file", "name": "${i.name}", "type": "${i.isFile() ? "file" : "dir"}" }`);
		}
	});
	includedBackupDirs.forEach(i => {
		w_main.webContents.send("app", `{ "action": "data-file", "name": "${i.split("/").pop()}", "type": "diradd", "path": "${i}" }`);
	});
	w_main.webContents.send("app", `{ "action": "loading", "a": "success", "lgt": "normal", "text": "Backup directory refreshed!" }`);
}

function addBackup() {
	let def = ((process.env.HOME || process.env.USERPROFILE) + "\\AppData\\Local\\GeometryDash");
	let bpath = dialog.showOpenDialogSync({ title: "Select directory", defaultPath: def, properties: ["openDirectory","showHiddenFiles"] });
	if (bpath){
		bpath = bpath[0].replace(/\\/g,"/");
		let verify = false;
		fs.readdirSync(bpath, { withFileTypes: true }).forEach(i => {
			if (i.name === "CCLocalLevels.dat"){
				verify = true;
			}
		});
		if (verify){
			if (includedBackupDirs.includes(bpath)){
				w_main.webContents.send("app", `{ "action": "loading", "a": "error", "lgt": "normal", "text": "This directory has already been added!" }`);
				console.log("Backup directory already added!");
				return;
			}
			includedBackupDirs.push(bpath);
			saveToUserdata("includedDirs", includedBackupDirs);
			w_main.webContents.send("app", `{ "action": "data-file", "name": "${bpath.split("/").pop()}", "path": "${bpath}", "type": "diradd", "toTop": "true", "path": "${bpath}" }`);
			console.log("Added backup directory!");
		}else{
			console.log("Picked folder does not appear to contain CCLocalLevels.");
			w_main.webContents.send("app", `{ "action": "loading", "a": "error", "lgt": "long", "text": "This does not appear to be a backup directory." }`);
		}
	}
}

function switchToBackup(to, force = false) {
	if (!force){
		w_main.webContents.send("app", `{ 
			"action": "loading", 
			"a": "warning", 
			"lgt": "infinite", 
			"text": "Would you like to take a backup of your current stats before switching?", 
			"button": [
				{ "text": "Save stats", "action": "ipcSend({ action: 'switch-backup', ext: '${to}', force: 'save' })" },
				{ "text": "Discard", "action": "ipcSend({ action: 'switch-backup', ext: '${to}', force: 'discard' })" }
			] }
		`);
		console.log("Do you want to make a backup of current files?");
		return;
	}

	if (force === "save"){
		makeNewBackup("new");
	}

	let gpth = path.join(gd_path + '/..').replace(/\\/g,"/");
	let pth = "";
	if (to.toLowerCase().startsWith("gdshare")){
		pth = `${gpth}/${to}`;
	} else {
		pth = to;
	}
	console.log(pth);
	try {
		fs.accessSync(pth);

		["CCLocalLevels.dat","CCLocalLevels2.dat","CCGameManager.dat","CCGameManager2.dat"].forEach(i => {
			fs.unlinkSync(`${gpth}/${i}`);
			console.log(`Removed ${i}!`);

			fs.copyFileSync(`${pth}/${i}`, `${gpth}/${i}`);
			console.log(`Copied new ${i}!`);
		});

		console.log(`Switched to ${to}!`);
		w_main.webContents.send("app", `{ "action": "loading", "a": "success", "lgt": "normal", "text": "Switched to ${to}!" }`);
		validateGDPath();
	} catch (err) {
		console.log(err);
		w_main.webContents.send("app", `{ "action": "loading", "a": "error", "lgt": "normal", "text": "Something went wrong (${err})" }`);
	}
}

function makeBackup(path, name) {
	console.log(name);
	fs.mkdirSync(`${path}/${name}`);
	console.log(`Made new folder ${name}`);
	["CCLocalLevels.dat","CCLocalLevels2.dat","CCGameManager.dat","CCGameManager2.dat"].forEach(i => {
		fs.copyFileSync(`${path}/${i}`, `${path}/${name}/${i}`);
	});
	console.log(`Copied all files over to backup!`);
	w_main.webContents.send("app", `{ "action": "data-file", "name": "${name}", "type": "dir", "toTop": "true" }`);
	w_main.webContents.send("app", `{ "action": "loading", "a": "success", "lgt": "normal", "text": "Created backup!" }`);
}

function addZero(i) {
	if (i < 10) {
	  i = "0" + i;
	}
	return i;
  }

function makeNewBackup(force) {
	let time = new Date();
	time = { m: time.getMonth()+1, d: time.getDate(), y: time.getFullYear() };
	let gpath = path.join(gd_path + '/..').replace(/\\/g,"/");
	let fname = `GDSHARE-${dateFormat ? time.m : time.d}${dateFormat ? "." : "."}${dateFormat ? time.d : time.m}${dateFormat ? "." : "."}${time.y}`;

	try {
		fs.accessSync(`${gpath}/${fname}`);
		if (force === "replace") {
			console.log("ok,replacing");

			rimraf.sync(`${gpath}/${fname}`);
			console.log("removed original dir");
			makeBackup(gpath,fname);
		}else if (force === "new"){
			console.log("ok, making new");
			
			let t = new Date();
			let n = `${fname}-${addZero(t.getHours())}.${addZero(t.getMinutes())}.${addZero(t.getSeconds())}`;

			makeBackup(gpath,n);
			return;
		}else{
			w_main.webContents.send("app", `{ 
				"action": "loading", 
				"a": "warning", 
				"lgt": "infinite", 
				"text": "A backup on this date already exists. Would you like to replace the old file or create a new one?", 
				"button": [
					{ "text": "Replace", "action": "ipcSend({ action: 'new-backup', force: 'replace' })" },
					{ "text": "New", "action": "ipcSend({ action: 'new-backup', force: 'new' })" }
				] }
			`);
			return;
		}
	} catch (err) {
		makeBackup(gpath,fname);
	}
}

function createDefaultThemes(dir) {
	let themes = [
		{
			name: "Normal",
			creator: "HJfod",
			colors: {
				bg: "#fff",
				text: "#000",
				sec: "#406751",
				third: "#a8d",
				lighten: -.15,
				darken: -.3
			}
		},
		{
			name: "Dark",
			creator: "HJfod",
			colors: {
				bg: "#11131e",
				text: "#fff",
				sec: "#75ffec",
				third: "#ebc67c",
				lighten: .4,
				darken: -.1
			}
		},
		{
			name: "Blossom",
			creator: "Mercury",
			colors: {
				bg: "#272727",
				text: "#ffffff",
				sec: "#ff0874",
				third: "#ff0874",
				lighten: -0.15,
				darken: -0.3
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

	refreshDataFolder();
	
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
			n = n.substring(0,n.indexOf("<")).replace(/'/g,'"');
			let c = 1;
			while (levelNameList.includes(n)){
				n = n.substring(0,(c === 1) ? n.length : n.length-3-c.toString().length) + " (" + c + ")";
				c++;
				if (c > 20){
					break;
				}
			}
			levelNameList.push(n);
		});
		w_main.webContents.send("app", `{ "action": "level-list", "list": "${levelNameList}" }`);
	}
}

function getValue(lvl, key, type) {
	if (type === null){
		return lvl.split(`<k>${key}</k>`).pop().substring(0,100);
	}
	if (type){
		return lvl.split(`<k>${key}</k><${type}>`).pop().substring(0,lvl.split(`<k>${key}</k><${type}>`).pop().indexOf('<'));
	}else{
		return lvl.split(`<k>${key}</k>`).pop().substring(0,lvl.split(`<k>${key}</k>`).pop().indexOf('>')).includes("t");
	}
}

function base64(base64String) {
	return Buffer.from(base64String.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function replaceOfficialSong(i) {
	let s = {
		0: 'Stereo Madness',
		1: 'Back on Track',
		2: 'Polargeist',
		3: 'Dry Out',
		4: 'Base After Base',
		5: 'Cant Let Go',
		6: 'Jumper',
		7: 'Time Machine',
		8: 'Cycles',
		9: 'xStep',
		10:'Clutterfunk',
		11:'Theory of Everything',
		12:'Electroman Adventures',
		13:'Clubstep',
		14:'Electrodynamix',
		15:'Hexagon Force',
		16:'Blast Processing',
		17:'Theory of Everything 2',
		18:'Geometrical Dominator',
		19:'Deadlocked',
		20:'Fingerdash'
	}
	return s[i];
}

function getLevelInfo(name) {
	let foundLevel;
	if (name.indexOf("/") === -1){
		name = name.toLowerCase();
		if (name.endsWith(")")) name = name.substring(0,name.length-4);
		foundLevel = levels.find(x => x.toLowerCase().includes(`<k>k2</k><s>${name}</s>`));
	}else{
		try { fs.accessSync(name) } catch(err) {
			w_main.webContents.send("app", `{ "action": "loading", "a": "error", "lgt": "long", "text": "Unable to view info: ${err}" }`);
			console.log(err);
			return;
		}
		foundLevel = fs.readFileSync(name, 'utf8');
	}
	if (!foundLevel){
		w_main.webContents.send("app", `{ "action": "loading", "a": "error", "lgt": "long", "text": "Something went wrong (level does not exist?)" }`);
		console.log("Could not find level!");
		return;
	}else{
		let time = getValue(foundLevel, "k80", "i");
		let p = getValue(foundLevel, "k41", "i");
		let desc = base64(getValue(foundLevel, "k3", "s")).toString("utf8");
		let levelInfo = {
			name: { text: "Name", val: getValue(foundLevel, "k2", "s") },
			length: { text: "Length", val: getValue(foundLevel, "k23", "i").replace(/^\s*$/,"Tiny").replace("1","Short").replace("2","Medium").replace("3","Long").replace("4","XL") },
			creator: { text: "Creator", val: getValue(foundLevel, "k5", "s") },
			version: { text: "Version", val: getValue(foundLevel, "k16", "i") },
			password: { text: "Password", val: (p === "1") ? "Free to copy" : (p === "") ? "No copy" : p.substring(1) },
			songID: { text: "Song", val: getValue(foundLevel, "k8", "i") ? replaceOfficialSong(getValue(foundLevel, "k8", "i")) : getValue(foundLevel, "k45", "i") },
			description: { text: "Description", val: (desc === "") ? false : desc },
			objectCount: { text: "Object count", val: getValue(foundLevel, "k48", "i") },
			editorTime: { text: "Editor time", val: (time > 3600) ? (time/3600).toFixed(1) + "h" : (time/60).toFixed(1) + "m" },
			verified: { text: "Verified", val: getValue(foundLevel, "k14", false) },
			attempts: { text: "Attempts", val: getValue(foundLevel, "k18", "i") },
			rev: { text: "Revision", val: (getValue(foundLevel, "k46", "i") === "") ? "None" : getValue(foundLevel, "k46", "i") },
			copiedID: { text: "Copied from", val: (getValue(foundLevel, "k42", "i") === "") ? "None" : getValue(foundLevel, "k42", "i") }
		};
		w_main.webContents.send("app", `{ "action": "analyzed-level-info", "info": ${JSON.stringify(levelInfo)} }`)
	}
}

function getLevel(names) {
	names.forEach(name => {
		name = name.toLowerCase();
		let foundLevel = levels.find(x => x.toLowerCase().includes(`<k>k2</k><s>${name}</s>`));
		if (!foundLevel){
			w_main.webContents.send("app", `{ "action": "loading", "a": "error", "lgt": "long", "text": "Level does not exist." }`);
			console.log("Could not find level!");
			return;
		}else{
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
