const html = document.getElementsByTagName('html')[0];

function ipcSend(msg) {
    window.postMessage({
        protocol: "to-app",
        data: msg
    });
}

window.addEventListener("message", event => {
    const message = event.data;
    if (message.protocol === "from-app") {
        let args = JSON.parse(message.data);
        switch (args.action) {
            case "return":
                console.log(`Received: ${args.text}`);
                break;
            case "switch-theme":
                changeTheme(args.to);
                break;
            case "help-init":
                if (args.section) {
                    section(args.section, true);
                }
                break;
            case "section":
                section(args.to, true);
                break;
        }
    }
});

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

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
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


function hexToRgb(hex) {
	hex = hex.replace("#","");
	if (hex.length < 4) h = hex.split(""); hex = ""; h.forEach(e => hex += e.repeat(2));
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}` : null;
}

function changeTheme(e) {
	let c = e.colors;

	html.style.setProperty(`--c-bg`,c.bg);
	html.style.setProperty(`--c-sec`,c.sec);
	html.style.setProperty(`--c-third`,c.third);
	html.style.setProperty(`--c-text`,c.text);

	html.style.setProperty(`--c-dark`,lighten(c.bg,c.lighten));
	html.style.setProperty(`--c-hover`,lighten(getCSS('--c-dark'),c.lighten));
	html.style.setProperty(`--c-select`,lighten(getCSS('--c-dark'),c.darken));
	html.style.setProperty(`--c-disable`,`rgba(${hexToRgb(getCSS("--c-text"))},${0.5+c.darken})`);

	html.style.setProperty(`--c-link`,c.third);
	html.style.setProperty(`--c-yes`,c.sec);
}

function section(to, open = false) {
	let s = document.querySelector(`div[data-section="${to}"]`);
	if (s.hasAttribute("hidden") || open) {
        s.removeAttribute("hidden");
        if (open) s.scrollIntoView();
	}else{
		s.setAttribute("hidden","");
	}
}

function folder(which, args = false) {
	ipcSend({ action: "open-folder", folder: which, sett: args });
}

function openLink(l) {
	ipcSend({ action: "open-link", link: l });
}

ipcSend({ action: "help-init" });