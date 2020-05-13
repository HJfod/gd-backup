const { BrowserWindow, app } = require("electron");

let w_main;

app.on("ready", () => {
	w_main = new BrowserWindow({});
	
	w_main.loadFile("main.html");
	
	w_main.on("closed", () => {
		app.quit();
	});
});