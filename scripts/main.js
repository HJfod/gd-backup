const pathInput = document.getElementById("path-input");
const lvlGetInput = document.getElementById("level-list");
const lvlImpInput = document.getElementById("level-import");
const loading = document.getElementsByClassName("status-full")[0];

const loading_time = 1000;
const level_ext = ".gmd";

let level_list = [];

loading.style.display = "none";

function ipcSend(msg) {
    window.postMessage({
        protocol: "to-app",
        data: msg
    });
}

function arr(list) {
    return Array.prototype.slice.call(list);
}

function changeGDPath() {
	pathInput.disabled = false;
	pathInput.select();
	document.getElementById("set-path").style.display = "initial";
	document.getElementById("edit-path").style.display = "none";
	document.querySelector(`button[onclick="tab('import')"]`).setAttribute("disabled","");
	document.querySelector(`button[onclick="tab('export')"]`).setAttribute("disabled","");
}

function getGDPath() {
	ipcSend({ action: "gd-path", path: pathInput.value });
}

function getLevel() {
	ipcSend({ action: "get-level", name: [...lvlGetInput.options].filter(option => option.selected).map(option => option.value).join(",") });
}

function importLevel() {
	if (lvlImpInput.files[0]){
		ipcSend({ action: "import-level", path: lvlImpInput.files[0].path.replace(/\\/g,"/") });
	}
}

function openLink(l) {
	ipcSend({ action: "open-link", link: l });
}

function closeLevel() {
	document.getElementById("drop-zone").style.display = "initial";
	document.getElementById("level-zone").style.display = "none";
	lvlImpInput.value = null;
	//document.getElementsByClassName("input-text")[0].innerHTML = "Click or drop a .gmd file here!";
	//document.getElementsByClassName("input-text")[0].classList.remove("inputted");
	//document.getElementsByClassName("input-box")[0].classList.remove("inputted");
}

function fileDropped() {
	//document.getElementsByClassName("input-text")[0].innerHTML = lvlImpInput.files[0].path.replace(/\\/g,"/");
	//document.getElementsByClassName("input-text")[0].classList.add("inputted");
	//document.getElementsByClassName("input-box")[0].classList.add("inputted");
	if (!lvlImpInput.files[0].name.endsWith(level_ext)){
		showMsg("error", "normal", "You can only import .gmd files.");
		return;
	}
	document.getElementById("level-name").innerHTML = lvlImpInput.files[0].path.replace(/\\/g,"/");
	document.getElementById("drop-zone").style.display = "none";
	document.getElementById("level-zone").style.display = "initial";
}

function tab(to) {
	let t = document.querySelectorAll("div[data-id]");
	let b = document.querySelectorAll(".nav-button");
	t.forEach(i => {
		i.style.display = 'none';
	});
	b.forEach(i => {
		i.classList.remove("tab-selected");
	});
	document.querySelector(`div[data-id="${to}"]`).style.display = 'initial';
	document.querySelector(`button[onclick="tab('${to}')"]`).classList.add("tab-selected");
}

function showMsg(type, lgt, txt) {
	switch (type){
		case "error":
			loading.style.display = "initial";
			loading.querySelector(".loading-text").innerHTML = txt;
			loading.querySelector("#l-yes").style.display = "none";
			loading.querySelector("#l-no").style.display = "initial";
			loading.querySelector("#l-circle").style.display = "none";
			break;
		case "success":
			loading.style.display = "initial";
			loading.querySelector(".loading-text").innerHTML = txt;
			loading.querySelector("#l-yes").style.display = "initial";
			loading.querySelector("#l-no").style.display = "none";
			loading.querySelector("#l-circle").style.display = "none";
			break;
	}
	if (lgt === "normal"){
		setTimeout(() => { loading.style.display = "none"; }, loading_time);
	}else if (lgt === "long"){
		setTimeout(() => { loading.style.display = "none"; }, loading_time * 3);
	}
}

function section(to) {
	let s = document.querySelector(`div[data-section="${to}"]`);
	if (s.hasAttribute("hidden")) {
		s.removeAttribute("hidden")
	}else{
		s.setAttribute("hidden","");
	}
}

function folder(which) {
	ipcSend({ action: "open-folder", folder: which });
}

function searchList(e) {
	let a = true;
	lvlGetInput.childNodes.forEach(i => {
		if (i.innerHTML.indexOf(e.target.value) === -1){
			i.setAttribute("hidden","");
		}else{
			i.removeAttribute("hidden");
			a = false;
		}
	});
	if (a) {
		let o = document.createElement("option");
		o.innerHTML = "No levels found.";
		o.setAttribute("disabled","");
		o.setAttribute("id","no-options");
		lvlGetInput.appendChild(o);
	}else{
		if (document.querySelector("#no-options")){
			lvlGetInput.removeChild(document.querySelector("#no-options"));
		}
	}
}

function selectLevel() {
	let b = document.querySelector("#level-get");
	if (lvlGetInput.value){
		b.removeAttribute("disabled");
		let sel = [...lvlGetInput.options].filter(option => option.selected).map(option => option.value);
		b.innerHTML = "Export " + sel.join(", ");
	}else{
		b.setAttribute("disabled","");
		b.innerHTML = "No level selected";
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
			case "gd-path-confirmed":
				pathInput.disabled = true;
				document.getElementById("set-path").style.display = "none";
				document.getElementById("edit-path").style.display = "initial";
				document.querySelector(`button[onclick="tab('import')"]`).removeAttribute("disabled");
				document.querySelector(`button[onclick="tab('export')"]`).removeAttribute("disabled");
				break;
			case "loading":
				if (args.a === "show"){
					loading.style.display = "initial";
					loading.querySelector(".loading-text").innerHTML = args.text;
					loading.querySelector("#l-yes").style.display = "none";
					loading.querySelector("#l-no").style.display = "none";
					loading.querySelector("#l-circle").style.display = "initial";
				}else if (args.a === "error" || "success"){
					showMsg(args.a,args.lgt,args.text);
				}else{
					loading.style.display = "none";
				}
				break;
			case "level-list":
				level_list = args.list.split(",");
				level_list.forEach(i => {
					let o = document.createElement("option");
					o.innerHTML = i;
					lvlGetInput.appendChild(o);
				});
				document.querySelector("#level-amount").innerHTML = "Level count: " + level_list.length;
        }
    }
});

document.getElementById("edit-path").style.display = "none";
document.getElementById("level-zone").style.display = "none";

ipcSend({ action: "init" });
tab("path");