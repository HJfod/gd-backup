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
}

function fileDropped() {
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

function showMsg(type, lgt, txt, button) {
	switch (type){
		case "error":
			loading.querySelector("#l-yes").style.display = "none";
			loading.querySelector("#l-warn").style.display = "none";
			loading.querySelector("#l-no").style.display = "initial";
			loading.querySelector("#l-circle").style.display = "none";
			break;
		case "success":
			loading.querySelector("#l-yes").style.display = "initial";
			loading.querySelector("#l-no").style.display = "none";
			loading.querySelector("#l-warn").style.display = "none";
			loading.querySelector("#l-circle").style.display = "none";
            break;
        case "warning":
			loading.querySelector("#l-yes").style.display = "none";
			loading.querySelector("#l-no").style.display = "none";
			loading.querySelector("#l-warn").style.display = "initial";
			loading.querySelector("#l-circle").style.display = "none";
            break;
    }
    if (button){
        loading.querySelector("#l-b").style.display = "initial";
        loading.querySelector("#l-b").innerHTML = button.text;
        loading.querySelector("#l-b").setAttribute("onclick",button.action);
    }else{
        loading.querySelector("#l-b").style.display = "none";
    }
    loading.style.display = "initial";
    loading.querySelector(".loading-text").innerHTML = txt;
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
		if (i.innerHTML.toLowerCase().trim().indexOf(e.target.value.toLowerCase().trim()) === -1){
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

function toggleButton(e, b, i = false) {
	let t = document.querySelector(`button[data-toggle="${b}"]`);
	if (i ? !e.target.checked : e.target.checked){
		t.removeAttribute("disabled");
	}else{
		t.setAttribute("disabled","");
	}
}

function selectExportFolder() {
	ipcSend({ action: "select-export" });
}

function checkUpdate() {
    ipcSend({ action: "check-for-updates" });
}

function changeTheme(e) {
	if (e.target){
		e = e.target.value;
	}else{
		themes.forEach((i, ind) => {
			if (i.name === e){
				e = ind;
			}
		});
	}
	let c = themes[e].colors;

	html.style.setProperty(`--c-bg`,c.bg);
	html.style.setProperty(`--c-sec`,c.sec);
	html.style.setProperty(`--c-third`,c.third);
	html.style.setProperty(`--c-text`,c.text);

	html.style.setProperty(`--c-dark`,lighten(c.bg,c.lighten));
	html.style.setProperty(`--c-hover`,lighten(getCSS('--c-dark'),c.lighten));
	html.style.setProperty(`--c-select`,lighten(getCSS('--c-dark'),c.darken));
	html.style.setProperty(`--c-disable`,`rgba(${hexToRgb(getCSS("--c-text"))},0.5)`);

	console.log(`rgba(${hexToRgb(getCSS("--c-text"))},0.5)`);

	html.style.setProperty(`--c-link`,c.third);
	html.style.setProperty(`--c-yes`,c.sec);

	ipcSend({ action: "change-theme", theme: themes[e].name });
}