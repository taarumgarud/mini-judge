const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const executeCpp = async (code, input) => {
    const jobId = uuidv4();
    const tempDir = path.join(__dirname, 'temp', 'jobId');
    const codeFilePath = path.join(tempDir,'main.cpp');
    const inputFilePath = path.join(tempDir, 'input.txt');
    
    try{
        await fs.mkdir(tempDir, { recursive: true });
        await fs.writeFile(codeFilePath, code);
        await fs.writeFile(inputFilePath, input);

        const command = `docker run --rm -v "${tempDir}":/app -w /app gcc sh -c "g++ main.cpp -o main && ./main < input.txt"`;

        return await new Promise((resolve) => {
            exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
                if(error){
                    if(error.killed){
                        return resolve({ status: 'Time Limit Exceeded' });
                    }
                    return resolve({ status: 'Compile Error', output: stderr});
                }
                return resolve({ status: 'Pass', output: stdout.trim() });
            });
        });
    }
    catch(err){
        return { status: 'Server Error', output: err.message };
    }
    finally{
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
};

module.exports = { executeCpp };