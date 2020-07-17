const events = require("events");

const self = module.exports = {

    path = require("path"),
    dLoop = "",
    includedBackupDirs = [],
    event: new events.EventEmitter(),

    initialize: () => {
        exec('tasklist', (err, stdout, stderr) => {
            if (stdout.toLowerCase().indexOf('geometrydash.exe') > -1) {
                self.throwError("gd-is-open");
            }
        });

        dTesting: for (let i = 0; i < 5; i++) {
            try {
                fs.accessSync(path.join(__dirname + self.dLoop + "/resources"));
            } catch (err) {
                self.dLoop += "/..";
                continue dTesting;
            }
        }
    },

    throwError: err => {
        self.event.emit("error",err);
    },

    appValues = {
        extTheme = "gdat",
        extUser = "udat",
        extFile = "gmd",
        userdataPath = self.path.join(__dirname,self.dLoop,"/data/userdata." + extUser)
    },

    saveToUserdata: (key, val) => {
        let c = fs.readFileSync(userdataPath, "utf8");
        let o = {};
        if (c.length > 1){
            o = JSON.parse(c);
        }
        o[key]= val;
        fs.writeFileSync(userdataPath, JSON.stringify(o));
    }

}