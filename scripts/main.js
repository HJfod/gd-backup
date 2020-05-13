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

function fileDropped() {
	document.getElementsByClassName("input-text")[0].innerHTML = lvlImpInput.files[0].path.replace(/\\/g,"/");
	document.getElementsByClassName("input-text")[0].classList.add("inputted");
	document.getElementsByClassName("input-box")[0].classList.add("inputted");
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
			case "gd-path-confirmed":
				pathInput.disabled = true;
				break;
        }
    }
});

ipcSend({ action: "init" });