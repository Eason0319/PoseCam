// 取得所有需要的元素
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const photoGallery = document.getElementById('photo-gallery');
const countdownOverlay = document.getElementById('countdown-overlay');
const cameraContainer = document.getElementById("cameraContainer");
const photoSlot = document.getElementById("photo-slot");
const sliderImages = document.querySelectorAll('#image-slider img');

const wizardStep1 = document.getElementById('wizard-step-1');
const wizardStep2 = document.getElementById('wizard-step-2');
const wizardStepFinal = document.getElementById('wizard-step-final');
const wizardStepDownload = document.getElementById('wizard-step-download');
const suggestPose = document.getElementById('suggest-pose');

const title1 = document.getElementById('title1');

const countdownSelect = document.getElementById('countdown-select');
const filterSelector = document.getElementById('filter-selector');
const nextStepBtn = document.getElementById('next-step-btn');
const finalButtons = document.getElementById('final-buttons');
const downloadBtn = document.getElementById('download-btn');
const clearBtn = document.getElementById('clear-btn');
const downloadVideoBtn = document.getElementById('download-video-btn');

const selectedText = document.getElementById('selected-text');

// 全域變數，用於追蹤狀態
let currentSlotIndex = 0; // 目前要填入的格子索引 (0-3)

// ---  狀態管理變數 ---
let currentWizardStep = 1; // 追蹤目前在哪個步驟
let totalPhotos = 0;       // 總共需要拍幾張照片
let currentPhotoIndex = 0; // 目前拍到第幾張
let photoSlots = [];       // 用於存放所有照片格DOM元素

let mediaRecorder;
let recordedChunks = [];
let recordedVideoBlob = null; // 存錄影結果

const dimensions = {
    'A': { count: 2, cols: 1, rows: 2 },
    'B': { count: 3, cols: 1, rows: 3 },
    'C': { count: 4, cols: 1, rows: 4 },
    'D': { count: 4, cols: 2, rows: 2 },
    'E': { count: 4, cols: 2, rows: 2 },
    'F': { count: 6, cols: 3, rows: 2 },
};

//控制顯示已選擇哪種版面
window.onload = function () {
    startCamera();

    // 1. 建立一個 URLSearchParams 物件來解析網址參數
    const params = new URLSearchParams(window.location.search);

    // 2. 獲取名為 'layout' 的參數值
    const selectedLayout = params.get('layout');

    if (selectedLayout && dimensions[selectedLayout]) {
        selectedText.innerHTML = `<h1>已選擇版面${selectedLayout}</h1>`;
        setupGalleryFromUrl(selectedLayout);
    } else {
        selectedText.textContent = '未選擇任何版面';
    }
};


function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
            video.srcObject = stream;
            // 建立 MediaRecorder
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    recordedChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                recordedVideoBlob = new Blob(recordedChunks, { type: 'video/webm' });
                recordedChunks = []; // 清空
                console.log("錄影完成，可供下載");

                const videoURL = URL.createObjectURL(recordedVideoBlob);
                const previewContainer = document.getElementById('video-preview');
                const previewVideo = document.getElementById('recorded-video');

                previewVideo.src = videoURL;
                previewContainer.style.display = "block"; // 顯示預覽區
            };
        })

        .catch(err => {
            console.error("無法開啟鏡頭:", err);
            alert("無法開啟鏡頭，請檢查權限設定。");
        });
}

// 根據 URL 參數來設定照片格
function setupGalleryFromUrl(layout) {
    const config = dimensions[layout];
    totalPhotos = config.count;

    // 設定 CSS Grid 的佈局
    photoGallery.style.gridTemplateColumns = `repeat(${config.cols}, 1fr)`;
    photoGallery.style.gridTemplateRows = `repeat(${config.rows}, 1fr)`;

    switch (layout) {
        case 'A': photoGallery.style.width = "200px"; break;
        case 'B': photoGallery.style.width = "200px"; break;
        case 'C': photoGallery.style.width = "200px"; break;
        case 'D': photoGallery.style.width = "400px"; break;
        case 'E': photoGallery.style.width = "700px"; photoGallery.style.height = "550px"; break;
        case 'F': photoGallery.style.width = "700px"; photoGallery.style.height = "550px"; break;
        default: photoGallery.style.width = "100%"; // 預設
    }

    // 動態生成照片格
    photoGallery.innerHTML = ''; // 先清空
    for (let i = 0; i < totalPhotos; i++) {
        const slot = document.createElement('div');
        slot.className = 'photo-slot';
        photoGallery.appendChild(slot);
    }
    photoSlots = document.querySelectorAll('.photo-slot'); // 更新 NodeList
}


// --- 4. 核心流程控制 ---

// "下一步"按鈕的點擊處理
function handleNextStepClick() {
    if (currentWizardStep === 1) {
        // 從步驟 1 到步驟 2
        wizardStep1.classList.add('hidden');
        wizardStep2.classList.remove('hidden');
        title1.textContent = '準備開始拍攝';
        currentWizardStep = 2;
    } else if (currentWizardStep === 2) {
        // 從步驟 2 開始自動拍照流程
        nextStepBtn.disabled = true;
        nextStepBtn.textContent = '拍攝中...';
        title1.textContent = '';
        wizardStep2.classList.add('hidden');
        suggestPose.classList.remove('hidden');
        startAutoShooting();
        currentWizardStep = 3;
    } else if (currentWizardStep === 3) {
        gennerateQRcode(canvas);

        wizardStepFinal.classList.add('hidden');
        wizardStepDownload.classList.remove('hidden');
        finalButtons.classList.remove('hidden');
        nextStepBtn.classList.add('hidden');
    }
}

// 自動化拍攝主函式 (使用 async/await 來實現異步流程)
async function startAutoShooting() {
    if (mediaRecorder && mediaRecorder.state === "inactive") {
        mediaRecorder.start();
        console.log("錄影開始");
    }

    for (let i = 0; i < totalPhotos; i++) {
        currentPhotoIndex = i;
        // 等待倒數計時完成
        await runCountdown();
        // 拍照
        takePicture();
        if (i === totalPhotos - 1) {
            await new Promise(resolve => setTimeout(resolve, 200)); // 200ms 對應 flashEffect 的動畫
        }
    }
    // 全部拍攝完成
    showFinalStep();
}
function flashEffect() {
    const flash = document.getElementById('flash-overlay');
    flash.style.opacity = 1; // 先變白
    setTimeout(() => {
        flash.style.opacity = 0; // 漸變回透明
    }, 100); // 100ms 後開始消失
}

// 執行單次倒數計時 (返回一個 Promise)
function runCountdown() {
    // 每次呼叫都回傳一個新的 Promise
    return new Promise(resolve => {
        // 從下拉選單獲取總秒數
        let seconds = parseInt(countdownSelect.value, 10);

        // 建立一個可以自我呼叫的函式，來處理倒數的每一步
        const step = () => {
            // 顯示目前的秒數
            countdownOverlay.textContent = seconds;
            countdownOverlay.classList.add('show');

            if (seconds > 0) {
                // 如果還沒數完，秒數減一
                seconds--;
                // 然後預約 1 秒後，再次呼叫自己 (step 函式)
                setTimeout(step, 1000);
            } else {
                // 如果 seconds 為 0，表示倒數結束
                // 稍微延遲一下再隱藏數字，讓使用者能看到 "0" 或最後一秒
                setTimeout(() => {
                    countdownOverlay.classList.remove('show');
                    countdownOverlay.textContent = '';
                    // 最重要的一步：解析 Promise，通知 await 可以繼續執行 for 迴圈的下一步
                    resolve();
                }, 1000);
            }
        };

        // 立即啟動倒數的第一步
        step();
    });
}

// 拍照並放入對應的格子
function takePicture() {
    if (video.readyState < 3 || currentPhotoIndex >= totalPhotos) return;

    flashEffect();
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    // 將影片畫面(可能帶有CSS濾鏡)畫到Canvas上
    context.filter = getComputedStyle(video).filter;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.filter = 'none'; // 重置 filter 以免影響下次繪製

    const dataUrl = canvas.toDataURL('image/png');

    const currentSlot = photoSlots[currentPhotoIndex];
    currentSlot.innerHTML = '';
    const img = document.createElement('img');
    img.src = dataUrl;
    currentSlot.appendChild(img);
}

// 顯示最終步驟
function showFinalStep() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop(); // 結束錄影，但不自動下載
        console.log("錄影結束");
    }

    nextStepBtn.disabled = false;
    nextStepBtn.textContent = '下一步';
    nextStepBtn.classList.remove('hidden');
    finalButtons.classList.add('hidden');
    suggestPose.classList.add('hidden');
    wizardStepFinal.classList.remove('hidden');

    title1.textContent = '';
    cameraContainer.style.display = "none";
    photoSlot.style.display = "grid";
    photoGallery.style.display = "grid";
}

// 清除照片並重置流程
function clearPhotos() {
    if (confirm("確定要清除所有照片並重新開始嗎？")) {
        // 介面重置回步驟1
        wizardStep1.classList.remove('hidden');
        wizardStep2.classList.add('hidden');
        wizardStepFinal.classList.add('hidden');
        suggestPose.classList.add('hidden');
        wizardStepDownload.classList.add('hidden');

        nextStepBtn.classList.remove('hidden');
        finalButtons.classList.add('hidden');
        nextStepBtn.disabled = false;
        nextStepBtn.textContent = '下一步';
        title1.innerHTML = `拍攝倒數秒數：
            <select id="countdown-select">
                <option value="3" selected>3 秒</option>
                <option value="5">5 秒</option>
                <option value="10">10 秒</option>
            </select>`;

        photoGallery.style.display = "none";
        photoSlot.style.display = "none";
        cameraContainer.style.display = "grid";

        // 狀態重置
        currentWizardStep = 1;
        currentPhotoIndex = 0;
        photoSlots.forEach(slot => { slot.innerHTML = ''; });
    }
}


function selectFilter(clickedElement) {
    // 獲取所有濾鏡選項
    const allOptions = document.querySelectorAll('.filter-option');

    // 移除所有的 selected class
    allOptions.forEach(option => {
        option.classList.remove('selected');
    });

    // 為被點擊的元素添加 selected class
    clickedElement.classList.add('selected');

    // 應用濾鏡效果
    const video = document.querySelector('video'); // 假設你有 video 元素
    if (video) {
        video.className = `filter-${clickedElement.dataset.filter}`;
    }

    console.log('選擇的濾鏡:', clickedElement.dataset.filter);
}

function selectPeople(clickedElement) {
    const allOptions = document.querySelectorAll('.people-option');

    // 移除所有的 selected class
    allOptions.forEach(option => {
        option.classList.remove('selected');
    });

    // 為被點擊的元素添加 selected class
    clickedElement.classList.add('selected');

    const suggestPoseImg = document.querySelector('#suggest-pose img');
    const personType = clickedElement.dataset.person;

    const images = {
        '1': './img/pose-1.jpg',
        '2': './img/pose-2.jpg',
        '3': './img/pose-3.jpg',
        // '4': './img/pose-4.jpg',
        // '5': './img/pose-5.jpg',
    };

    suggestPoseImg.src = images[personType];

}

sliderImages.forEach(img => {
    img.addEventListener('click', () => {
        photoSlot.style.backgroundImage = `url(${img.src})`;
        
    });
});

async function downloadResult() {
    // 獲取最終成果的容器元素，根據你的程式碼，photoSlot 似乎是帶有背景的大容器
    const finalContainer = document.getElementById('photo-slot');
    if (!finalContainer) {
        alert("找不到成果容器，無法下載！");
        return;
    }

    // --- 步驟 1: 建立最終畫布 ---
    const finalCanvas = document.createElement('canvas');
    const ctx = finalCanvas.getContext('2d');

    // --- 步驟 2: 設定畫布尺寸 ---
    // 使用 offsetWidth/Height 可以取得元素在畫面上的實際像素尺寸
    finalCanvas.width = finalContainer.offsetWidth;
    finalCanvas.height = finalContainer.offsetHeight;

    // --- 步驟 3: 繪製背景 ---
    // 獲取容器的背景樣式
    const bgStyle = window.getComputedStyle(finalContainer).backgroundImage;

    // 檢查是否有背景圖片 (bgStyle 不為 "none")
    if (bgStyle && bgStyle !== 'none') {
        // 從 'url("...")' 字串中提取出圖片網址
        const bgImageUrl = bgStyle.replace(/url\(['"]?(.*?)['"]?\)/i, '$1');

        // 因為載入圖片是非同步的，我們用 Promise 來等待它完成
        await new Promise((resolve, reject) => {
            const bgImg = new Image();
            // 如果你的背景圖來自其他網站，需要這行來避免跨域問題
            // bgImg.crossOrigin = "anonymous"; 
            bgImg.onload = () => {
                // 將背景圖完整地畫到畫布上
                ctx.drawImage(bgImg, 0, 0, finalCanvas.width, finalCanvas.height);
                resolve(); // 圖片載入並繪製完成
            };
            bgImg.onerror = () => {
                // 如果圖片載入失敗，可以選擇畫一個白色背景
                console.error("背景圖片載入失敗！");
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
                resolve(); // 即使失敗也要 resolve，讓流程繼續
            };
            bgImg.src = bgImageUrl;
        });

    } else {
        // 如果沒有背景圖，就填滿白色
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    }

    const containerRect = finalContainer.getBoundingClientRect();

    photoSlots.forEach(slot => {
        const img = slot.querySelector('img');
        if (img) {
            // (核心修正) 獲取照片格相對於視窗的邊界資訊
            const slotRect = slot.getBoundingClientRect();

            // (核心修正) 計算照片格相對於父容器的「真正」相對位置
            const x = slotRect.left - containerRect.left;
            const y = slotRect.top - containerRect.top;

            const width = slot.offsetWidth;
            const height = slot.offsetHeight;

            // 使用計算出的精確相對位置來繪製圖片
            ctx.drawImage(img, x, y, width, height);
        }
    });

    // --- 步驟 5: 產生並觸發下載 ---
    try {
        // 將畫布內容轉換為高品質的 JPG 圖片資料
        const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.9);

        // 建立一個暫時的 <a> 連結元素
        const link = document.createElement('a');
        link.href = dataUrl;

        // 設定下載的檔案名稱
        link.download = `PoseCam-Result-${new Date().getTime()}.jpg`;

        // 模擬點擊這個連結來觸發下載
        link.click();

    } catch (err) {
        console.error("無法匯出圖片:", err);
        alert("匯出圖片失敗！可能是因為背景圖片的跨域問題。");
    }


}

function downloadVideo() {
    if (!recordedVideoBlob) {
        alert("尚未有可下載的錄影！");
        return;
    }

    const url = URL.createObjectURL(recordedVideoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PoseCam-Video-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
}

async function gennerateQRcode(canvas) {
    canvas.toBlob(blob => {
        const blobUrl = URL.createObjectURL(blob);

        const qrContainer = document.getElementById('qrcode');
        qrContainer.innerHTML = ""; // 清空舊的

        new QRCode(qrContainer, {
            text: blobUrl,
            width: 200,
            height: 200
        });
    }, "image/jpeg", 0.9);
}

// --- 3. 綁定事件 ---
nextStepBtn.addEventListener('click', handleNextStepClick);
clearBtn.addEventListener('click', clearPhotos);
downloadBtn.addEventListener('click', downloadResult);
downloadVideoBtn.addEventListener('click', downloadVideo);