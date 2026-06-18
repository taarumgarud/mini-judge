const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const executeCpp = async (code, input) => {
    const jobId = uuidv4();
    const tempDir = path.join(__dirname, 'temp', jobId);
    const codeFilePath = path.join(tempDir,'main.cpp');
    const inputFilePath = path.join(tempDir, 'input.txt');
    
    try{
        await fs.mkdir(tempDir, { recursive: true });
        await fs.writeFile(codeFilePath, code);
        await fs.writeFile(inputFilePath, input);

        const command = `docker run --rm --memory="256m" --cpus="0.5" --pids-limit=64 --network none -v "${tempDir}":/app -w /app gcc sh -c "g++ main.cpp -o main && ./main < input.txt"`;

        const startTime = performance.now();

        return await new Promise((resolve) => {
            exec(command, { timeout: 5000, maxBuffer: 1024 * 64 }, (error, stdout, stderr) => {
                if(error && error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'){
                    return resolve({ status: 'Output Limit Exceeded', executionTime: 0 });
                }

                const endTime = performance.now();
                const executionTime = Math.round(endTime - startTime);

                if(error){
                    if(error.killed){
                        return resolve({ status: 'Time Limit Exceeded', executionTime });
                    }
                    const sanitizedError = stderr.replace(/\/app\//g, '');
                    return resolve({ status: 'Compile Error', output: sanitizedError, executionTime });
                }
                return resolve({ status: 'Pass', output: stdout.trim(), executionTime });
            });
        });
    }
    catch(err){
        return { status: 'Server Error', output: err.message, executionTime: 0 };
    }
    finally{
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
};

module.exports = { executeCpp };