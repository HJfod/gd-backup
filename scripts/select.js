const ChangeEvent = new Event('change');

class SelectMenu extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.style.height = this.getAttribute("size") * (getCSS("--t-size") + getCSS("--pad") * 2) + "px";
        this.setAttribute("value","");

        if (this.hasAttribute("onchange")){
            this.addEventListener("change", eval(this.getAttribute("onchange")));
        }

        let t = document.createElement("option");
        t.innerHTML = this.getAttribute("emptytext");
        t.setAttribute("disabled","");
        this.appendChild(t);
    }

    getValue(){
        return this.getAttribute("value").split(",");
    }

    addOption(text, value) {
        if (!this.querySelector("option").hasAttribute("hidden")) this.querySelector("option").setAttribute("hidden","")
        let n = document.createElement("button");
        n.innerHTML = text;
        n.setAttribute("value",value);
        n.setAttribute("class","option")
        n.setAttribute("onclick",`event.target.parentElement.changeValue("${value}",event.target)`);
        this.appendChild(n);
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