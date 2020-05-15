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
				if (args.lgt === 'infinite'){
					loading.querySelector("#l-c").style.display = "initial";
				}else{
					loading.querySelector("#l-c").style.display = "none";
				}
				if (args.a === "show"){
					loading.style.display = "initial";
					loading.querySelector(".loading-text").innerHTML = args.text;
					loading.querySelector("#l-yes").style.display = "none";
					loading.querySelector("#l-no").style.display = "none";
					loading.querySelector("#l-warn").style.display = "none";
					loading.querySelector("#l-circle").style.display = "initial";
					loading.querySelector("#l-b").style.display = "none";
				}else if (args.a === "error" || "success" || "warning"){
					showMsg(args.a,args.lgt,args.text,(args.button ? args.button : false));
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

arr(document.querySelectorAll(`input[onchange]`)).forEach(i => {		// definitely not some bodged together garbage code to set all the buttons to what they should be
	if (i.getAttribute("onchange").includes("toggleButton")){
		if (i.getAttribute("onchange").includes('inverted') ? !i.checked : i.checked){
			document.querySelector(`button[data-toggle="${i.getAttribute('onchange').split(',')[1].replace(/'/g,"").trim()}"]`).setAttribute("disabled","");
		}
	}
});

ipcSend({ action: "init" });
tab("path");