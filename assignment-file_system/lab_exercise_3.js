        const fs = require("fs");
        const path = require("path");

    
        const sourceDir = "./source";
        const destDir = "./destination";

    
        if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
        console.log("📁 Destination directory created");
        }

        function syncDirectories(src, dest) {
        fs.readdir(src, (err, files) => {
            if (err) {
            console.error("❌ Error reading source directory:", err.message);
            return;
            }

            files.forEach((file) => {
            const srcPath = path.join(src, file);
            const destPath = path.join(dest, file);

            fs.stat(srcPath, (err, srcStat) => {
                if (err) {
                console.error("❌ Error accessing source file:", err.message);
                return;
                }

            
                if (srcStat.isFile()) {
                fs.stat(destPath, (err, destStat) => {
                
                    if (err && err.code === "ENOENT") {
                    copyFile(srcPath, destPath);
                    }
                    else if (!err && srcStat.mtime > destStat.mtime) {
                    copyFile(srcPath, destPath);
                    }
                });
                }
            });
            });
        });
        }

        function copyFile(src, dest) {
        fs.copyFile(src, dest, (err) => {
            if (err) {
            console.error(`❌ Error copying ${path.basename(src)}:`, err.message);
            } else {
            console.log(`✅ Synced: ${path.basename(src)}`);
            }
        });
        }

       
        syncDirectories(sourceDir, destDir);
