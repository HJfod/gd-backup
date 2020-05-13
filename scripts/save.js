/*const fs = require('fs')
const zlib = require('zlib')
const input = require('readline').createInterface({ input: process.stdin, output: process.stdout })

function xor(str, key) {
    str = String(str).split('').map(letter => letter.charCodeAt());
    let res = "";
    for (i = 0; i < str.length; i++) res += String.fromCodePoint(str[i] ^ key);
    return res;
}

let gdSave = process.env.HOME || process.env.USERPROFILE + "/AppData/Local/GeometryDash/CCLocalLevels.dat"
let saveData = fs.readFileSync(gdSave, 'utf8')

console.clear()

if (!saveData.startsWith('<?xml version="1.0"?>')) {
    console.log("Decoding save data...")
    saveData = xor(saveData, 11)
    saveData = Buffer.from(saveData, 'base64')
    try { saveData = zlib.unzipSync(saveData).toString() }
    catch (e) { return console.log("Error! GD save file seems to be corrupt!") }
}

let levels = []

let levelList = saveData.match(/<k>k_\d+<\/k>.+?<\/d>\n? *<\/d>/gs)
levelList.forEach(lvl => {
    levels.push(lvl)
})

function run(response) {

    if (response) console.log(response)
    console.log("\n===\n");

    input.question("What would you like to do?\n[1] Save level\n[2] Load level\n> ", (choice) => {

        if (choice == 1) {
            input.question("Enter name of level to export:\n", (name) => {
                name = name.toLowerCase()
                let foundLevel = levels.find(x => x.toLowerCase().includes(`<k>k2</k><s>${name}</s>`))
                if (!foundLevel) return run("Could not find level!")
                else {
                    fs.writeFileSync(`${name}.gmd`, foundLevel.replace(/<k>k_\d+<\/k>/, ""), 'utf8')
                    return run(`Saved to ${name}.gmd!`)
                }
            })
        }

        else if (choice == 2) {
            input.question("Drag a .gmd file into this window and press enter to load it:\n", (path) => {
                if (!fs.existsSync(path)) return run("Could not open this file!")
                let levelFile = fs.readFileSync(path, 'utf8')
                let levelName = levelFile.match(/<k>k2<\/k><s>(.+?)<\/s>/)
                saveData = saveData.split("<k>_isArr</k><t />")
                saveData[1] = saveData[1].replace(/<k>k_(\d+)<\/k><d><k>kCEK<\/k>/g, function(n) { return "<k>k_" + (Number(n.slice(5).split("<")[0])+1) + "</k><d><k>kCEK</k>" })
                saveData = saveData[0] + "<k>_isArr</k><t /><k>k_0</k>" + levelFile + saveData[1]
                fs.writeFileSync(gdSave, saveData, 'utf8')
                return run(`Successfully added ${levelName[1]} to save file!`)
            })
        }
    })

}

run()*/