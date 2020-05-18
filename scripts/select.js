const ChangeEvent = new Event('change');

class SelectMenu extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.style.height = this.getAttribute("size") * (getCSS("--t-size") + getCSS("--pad") * 2) + "px";
        this.setAttribute("value","");

        if (this.hasAttribute("onchange")){
            let a = this.getAttribute("onchange").split("(").shift();
            let args = this.getAttribute("onchange").split("(").pop().replace(")","").split(",");
            this.addEventListener("change", window[a]( ...args ));
        }

        let t = document.createElement("option");
        t.innerHTML = this.getAttribute("emptytext");
        t.setAttribute("disabled","");
        this.appendChild(t);
    }

    getValue(){
        return this.getAttribute("value").split(",");
    }

    clear(){
        this.querySelectorAll("button").forEach(i => {
            i.remove();
        });
    }

    addOption(text, value, extra = null) {
        if (!this.querySelector("option").hasAttribute("hidden")) this.querySelector("option").setAttribute("hidden","")
        let n = document.createElement("button");
        let toTop = false;
        if (extra){
            if (extra.svg){
                let s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
                    u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
                u.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', extra.svg);
                s.appendChild(u);
                s.setAttribute("class","svg-folder");
                s.setAttribute("viewBox","0 0 500 500");
                n.appendChild(s);
            }
            if (extra.toTop){
                toTop = true;
            }
        }
        n.innerHTML = n.innerHTML + ((n.innerHTML.length > 0) ? "\u2003" : "") + text;
        n.setAttribute("value",value);
        n.setAttribute("class","option")
        n.setAttribute("onclick",`event.target.parentElement.changeValue("${value}",event.target)`);
        if (this.hasAttribute("hover")){
            JSON.parse(this.getAttribute("hover")).forEach(i => {
                if (i.type === "Button"){
                    let b = document.createElement("button");
                    b.innerHTML = i.text;
                    b.setAttribute("class","mini-option");
                    b.setAttribute("onclick",`event.stopPropagation(); window["${i.act.split("(").shift()}"]( ${i.act.split("(").pop().replace(/BACKUPNAME/g,`'${value}'`).replace(/LEVELNAME/g,`'${text}'`).slice(0,-1)} )`);
                    b.style.display = "none";

                    n.setAttribute("onmouseenter",`event.target.querySelectorAll("button").forEach(i => i.style.display="initial")`);
                    n.setAttribute("onmouseleave",`event.target.querySelectorAll("button").forEach(i => i.style.display="none")`);
                    n.appendChild(b);
                }
            });
        }
        if (toTop){
            this.insertBefore(n, this.childNodes[0]);
        }else{
            this.appendChild(n);
        }
    }

    search(query) {
        let found = false;
        this.childNodes.forEach(i => {
            if (i.innerHTML.toLowerCase().trim().indexOf(query.toLowerCase().trim()) === -1){
                i.setAttribute("hidden","");
            }else{
                i.removeAttribute("hidden");
                found = true;
            }
        });
        if (!found) {
            this.querySelector("option").removeAttribute("hidden");
        }else{
            this.querySelector("option").setAttribute("hidden","");
        }
    }

    changeValue(val, call) {
        if (!this.hasAttribute("multiple")){
            this.querySelectorAll(".option-selected").forEach(i => i.classList.remove("option-selected"));
        }
        if (this.getValue().includes(val)){
            this.setAttribute("value",`${this.getValue().filter(item => item !== val)}`);
            call.classList.remove("option-selected");
        }else{
            let v = this.getValue();
            if (this.hasAttribute("multiple") ? v[0] === "" : true) v = [];
            v.push(val);
            this.setAttribute("value",`${v}`);
            call.classList.add("option-selected");
        }
        this.dispatchEvent(ChangeEvent);
    }
}

customElements.define('select-menu', SelectMenu);