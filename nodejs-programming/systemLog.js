const os = require('os');
const fs = require('fs');

function logSystemInfo() {
    const info = `
Time: ${new Date().toLocaleString()}
Platform: ${os.platform()}
CPU Architecture: ${os.arch()}
Free Memory: ${os.freemem()}
Total Memory: ${os.totalmem()}
-----------------------------\n`;

    fs.appendFile('systemInfo.log', info, (err) => {
        if (err) console.log("Error writing log:", err);
        else console.log("System info logged");
    });
}

setInterval(logSystemInfo, 5000);
