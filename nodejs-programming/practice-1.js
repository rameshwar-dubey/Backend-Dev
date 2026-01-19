const fs=require('fs');
fs.writeFileSync("practice.txt","Hey my name is Rameshwar");
fs.readFile("practice.txt","utf8",(err,result)=>{
    if(err){
        console.log("error loading",err);
    }
    
    
    const word=result.trim().split(/\s+/);
    const count=result.trim()==''?0:word.length;

    fs.writeFileSync("wordlength.txt",`${count}`);
})