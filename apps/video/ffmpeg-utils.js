// Configuración inicial
const CORE_VERSION = "0.12.6";
const FFMPEG_VERSION = "0.12.10";
const baseURLFFMPEG = `https://unpkg.com/@ffmpeg/ffmpeg@${FFMPEG_VERSION}/dist/umd`;
const baseURLCore = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;
const baseURLCoreMT = `https://unpkg.com/@ffmpeg/core-mt@${CORE_VERSION}/dist/umd`;

let ffmpeg = null;
let ffmpegLogs = [];
let ffmpegLoaded = false;
let tryMultiThread = true;



async function toBlobURL(url, mimeType, cb) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch ${url}`);

    const total = parseInt(resp.headers.get('Content-Length') || 0);
    let loaded = 0;
    const reader = resp.body.getReader();
    const chunks = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        cb && cb({ url, total, received: loaded, delta: value.length, done: false });
    }

    const blob = new Blob(chunks, { type: mimeType });
    cb && cb({ url, total, received: loaded, delta: 0, done: true });
    return URL.createObjectURL(blob);
}

async function toBlobURLPatched(url, mimeType, patcher) {
    const resp = await fetch(url);
    const body = await resp.text();
    const patchedBody = patcher ? patcher(body) : body;
    const blob = new Blob([patchedBody], { type: mimeType });
    return URL.createObjectURL(blob);
}














// Carga FFmpeg (versión WASM)
export async function initializeFFmpeg() {
    if (ffmpegLoaded == false) {
        try {
            console.log("Initializing FFmpeg...");
            let logCounter = 0;
            let lastProgress = null;

            await load(tryMultiThread, (progress) => {
                lastProgress = progress;
                if (++logCounter % 100 === 0) {
                    console.log(`Loading FFmpeg: ${(progress.received / 1048576).toFixed(2)} MB`);
                }
            });

            if (lastProgress) {
                console.log(`FFmpeg fully loaded: ${(lastProgress.received / 1048576).toFixed(2)} MB`);
            }


            console.log("FFmpeg loaded successfully");
            ffmpegLoaded = true;
        } catch (error) {
            console.error("Failed to load FFmpeg:", error);
        }
    }
}

// Función interna `load` (configuración core)
export const load = async (threadMode, cb) => {
    tryMultiThread = threadMode;
    const ffmpegBlobURL = await toBlobURLPatched(
        `${baseURLFFMPEG}/ffmpeg.js`,
        'text/javascript',
        (js) => js.replace('new URL(e.p+e.u(814),e.b)', 'r.workerLoadURL')
    );
    await import(ffmpegBlobURL);
    ffmpeg = new FFmpegWASM.FFmpeg();

    console.log("🚀 SharedArrayBuffer available:", typeof SharedArrayBuffer !== 'undefined');
    console.log("🛡️ crossOriginIsolated:", window.crossOriginIsolated);

    if (typeof SharedArrayBuffer === 'undefined' || !window.crossOriginIsolated) {
        console.warn("⚠️ Your environment is NOT ready for multithreaded FFmpeg (WASM).");
        console.warn("🔐 Required HTTP headers:");
        console.warn("  Cross-Origin-Opener-Policy: same-origin");
        console.warn("  Cross-Origin-Embedder-Policy: require-corp");
        console.warn("👉 These only work over HTTPS or localhost.");
    } else {
        console.log("✅ Environment supports FFmpeg multithreading (core-mt).");
    }


    // Configuración multi-thread o single-thread
    if (tryMultiThread && window.crossOriginIsolated) {
        console.log("multi-threaded");

        await ffmpeg.load({
            workerLoadURL: await toBlobURL(`${baseURLFFMPEG}/814.ffmpeg.js`, 'text/javascript', cb),
            coreURL: await toBlobURL(`${baseURLCoreMT}/ffmpeg-core.js`, 'text/javascript', cb),
            wasmURL: await toBlobURL(`${baseURLCoreMT}/ffmpeg-core.wasm`, 'application/wasm', cb),
            workerURL: await toBlobURL(`${baseURLCoreMT}/ffmpeg-core.worker.js`, 'application/javascript', cb),
        });
    } else {
        console.log("single-threaded");

        await ffmpeg.load({
            workerLoadURL: await toBlobURL(`${baseURLFFMPEG}/814.ffmpeg.js`, 'text/javascript', cb),
            coreURL: await toBlobURL(`${baseURLCore}/ffmpeg-core.js`, 'text/javascript', cb),
            wasmURL: await toBlobURL(`${baseURLCore}/ffmpeg-core.wasm`, 'application/wasm', cb),
        });
    }

    await ffmpeg.createDir('/output');
};

// Montar un archivo real en el sistema de archivos virtual
export async function mountFile(videoFile) {
    const inputDir = '/input';
    await ffmpeg.createDir(inputDir); // Crear directorio
    await ffmpeg.mount('WORKERFS', { files: [videoFile] }, inputDir); // Montar archivo
    return `${inputDir}/${videoFile.name}`; // Ruta virtual
}

// Leer un archivo del sistema virtual
export async function readVirtualFile(virtualPath) {
    const fileData = await ffmpeg.readFile(virtualPath);
    return new Blob([fileData.buffer], { type: 'video/mp4' });
}

// Eliminar archivos/directorios virtuales
export async function cleanupVirtualPaths(paths) {
    for (const path of paths) {
        await ffmpeg.unmount(path).catch(() => { });
        await ffmpeg.deleteDir(path).catch(() => { });
    }
}



// Ejecutar un comando FFmpeg y capturar logs
export async function runFFmpegCommand(args) {
    ffmpegLogs = []; // Resetear logs
    ffmpeg.on('log', ({ message }) => {
        console.log(message); // Logs en tiempo real
        ffmpegLogs.push(message);
    });

    const exitCode = await ffmpeg.exec(args);
    if (exitCode !== 0) {
        throw new Error(`FFmpeg failed with code ${exitCode}`);
    }
    return ffmpegLogs;
}
