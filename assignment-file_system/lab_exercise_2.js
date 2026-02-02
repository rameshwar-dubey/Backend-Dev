    const fs = require("fs");
    const readline = require("readline");

   const logFilePath = "./test.txt";


    // Statistics object
    const stats = {
    totalLines: 0,
    info: 0,
    warn: 0,
    error: 0,
    };

    // Create read stream
    const readStream = fs.createReadStream(logFilePath, {
    encoding: "utf-8",
    });

    // Read line by line
    const rl = readline.createInterface({
    input: readStream,
    crlfDelay: Infinity,
    });

    rl.on("line", (line) => {
    stats.totalLines++;

    if (line.includes("INFO")) {
        stats.info++;
    } else if (line.includes("WARN")) {
        stats.warn++;
    } else if (line.includes("ERROR")) {
        stats.error++;
    }
    });

    rl.on("close", () => {
    console.log("\n📊 Log File Summary Report");
    console.log("----------------------------");
    console.log(`Total Entries : ${stats.totalLines}`);
    console.log(`INFO Logs     : ${stats.info}`);
    console.log(`WARN Logs     : ${stats.warn}`);
    console.log(`ERROR Logs    : ${stats.error}`);
    });
