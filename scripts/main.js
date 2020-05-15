const pathInput = document.getElementById("path-input");
const lvlGetInput = document.getElementById("level-list");
const lvlImpInput = document.getElementById("level-import");
const loading = document.getElementsByClassName("status-full")[0];

const loading_time = 1000;
const level_ext = ".gmd";
const html = document.getElementsByTagName('html')[0];

let level_list = [];
let version;
let themes = [];

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

function getCSS(v) {
    let g = (getComputedStyle(html).getPropertyValue(v)).replace('px', '');
    if (g.indexOf("calc(") > -1) {
        g = g.split("*");
        for (let i in g) {
            g[i] = g[i].replace(/calc\(/g, "");
            g[i] = g[i].replace(/\)/, "");
            g[i] = g[i].trim();
            g[i] = Number(g[i]);
        }
        g = g[0] * g[1];
    }
    if (isNaN(g)) {
        return g;
    } else {
        return Number(g);
    }
}

function lighten(hex, lum) {	// thanks sitepoint.com

    // validate hex string
    hex = String(hex).replace(/[^0-9a-f]/gi, '');
    if (hex.length < 6) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    lum = lum || 0;

    // convert to decimal and change luminosity
    var rgb = "#", c, i;
    for (i = 0; i < 3; i++) {
        c = parseInt(hex.substr(i * 2, 2), 16);
        c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
        rgb += ("00" + c).substr(c.length);
    }

    return rgb;
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
			case "version":
				version = args.v;
				document.querySelector("#version-number").innerHTML = document.querySelector("#version-number").innerHTML.replace("NUMBER-HERE",version);
				break;
			case "gd-path-confirmed":
				pathInput.disabled = true;
				document.getElementById("set-path").style.display = "none";
				document.getElementById("edit-path").style.display = "initial";
				document.querySelector(`button[onclick="tab('import')"]`).removeAttribute("disabled");
				document.querySelector(`button[onclick="tab('export')"]`).removeAttribute("disabled");
				break;
			case "add-theme":
				let o = document.createElement("option");
				o.innerHTML = args.cont.name;
				o.value = themes.length;
				themes.push(args.cont);
				document.querySelector("#theme-select").appendChild(o);
				break;
			case "switch-theme":
				changeTheme(args.to);
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

document.querySelectorAll(".svg").forEach(i => {
	i.setAttribute("width",getCSS("--n-size") / 2);
	i.setAttribute("height",getCSS("--n-size") / 2);
});

ipcSend({ action: "init" });
tab("path");