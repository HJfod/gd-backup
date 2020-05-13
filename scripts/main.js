const pathInput = document.getElementById("path-input");
const lvlGetInput = document.getElementById("level-input");
const lvlImpInput = document.getElementById("level-import");

function ipcSend(msg) {
    window.postMessage({
        protocol: "to-app",
        data: msg
    });
}

function getGDPath() {
	ipcSend({ action: "gd-path", path: pathInput.value });
}

function getLevel() {
	ipcSend({ action: "get-level", name: lvlGetInput.value });
}

function importLevel() {
	if (lvlImpInput.files[0]){
		ipcSend({ action: "import-level", path: lvlImpInput.files[0].path.replace(/\\/g,"/") });
	}
}

window.addEventListener("message", event => {
    const message = event.data;
	
    if (message.protocol === "from-app") {
        let args = JSON.parse(message.data);
        switch (args.action) {
            case "return":
                console.log(`Received: ${args.text}`);
                break;
			case "probable-path":
				pathInput.value = args.path;
				break;
        }
    }
});

ipcSend({ action: "init" });