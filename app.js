let port;
let reader;
let writer;
let calibrationDone = false;
let m1 = 0, c1 = 0, m2 = 0, c2 = 0;
let calRunCount = 0;
let calTimeout;
let currentMode = null;

function setMode(mode) {
    currentMode = mode;
    sendSerial(mode + '\n');
    switch (mode) {
      case 'A': switchScreen('modeA'); break;
      case 'B': switchScreen('modeB'); break;
      case 'C': switchScreen('modeC'); break;
      case 'D': switchScreen('modeD'); break;
    }
  }
  

async function connectSerial() {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    writer = port.writable.getWriter();
    listenToSerial();
    switchScreen('menu');
  } catch (e) {
    alert('Serial connection failed: ' + e);
  }
}

function switchScreen(screenId) {
  document.querySelectorAll('.screen').forEach(div => div.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function setMode(mode) {
  sendSerial(mode + '\n');
  switch (mode) {
    case 'A': switchScreen('modeA'); break;
    case 'B': switchScreen('modeB'); break;
    case 'C': switchScreen('modeC'); break;
    case 'D': switchScreen('modeD'); break;
  }
}

async function sendSerial(text) {
  const encoder = new TextEncoder();
  await writer.write(encoder.encode(text));
}

async function listenToSerial() {
  while (port.readable) {
    reader = port.readable.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = new TextDecoder().decode(value);
        displayReceived(text);  // <== CALLS THE ONE DEFINED BELOW
      }
    } catch (e) {
      console.error('Read error:', e);
    } finally {
      reader.releaseLock();
    }
  }
}

function displayReceived(text) {
  console.log("Received: ", text);
  // Handle raw number as Calibration count (since Arduino only sends the time_period)
  if (/^\d+$/.test(text.trim())) {
    const number = parseInt(text.trim());
  
    if (currentMode === 'B') {
      clearTimeout(calTimeout); // cancel fallback
      calRunCount += 1;
      const list = document.getElementById('runList');
      const item = document.createElement('li');
      item.textContent = `Run ${calRunCount} → ${number} counts`;
      list.appendChild(item);
      document.getElementById('calStatus').innerText = `Run ${calRunCount} complete.`;
    }
  
    else if (currentMode === 'D') {
      // Only display once, don't duplicate
      document.getElementById('countingResult').innerText =
        `Count complete for ${number} seconds. (value unknown)`;
    }
  }
  
  

  // Mode A - High Voltage
  if (text.includes("HV")) {
    const match = text.match(/HV\s*:\s*([\d.]+)/);
    if (match) {
      const hv = parseFloat(match[1]);
      document.getElementById('hvDisplay').innerText = hv;
    }
  }

  // Mode B - Calibration Result
  if (text.includes("Calibration complete")) {
    document.getElementById('calStatus').innerText = "Calibration counting done.";
    document.getElementById('calResult').style.display = "block";
  }

  // Mode C - Measuring
  if (text.includes("Water V:")) {
    const match1 = text.match(/Water V:\s*([\d.]+)/);
    const match2 = text.match(/Water L:\s*([\d.]+)/);
    if (match1) document.getElementById('volDisplay').innerText = match1[1];
    if (match2) document.getElementById('lvlDisplay').innerText = match2[1];
  }

  // Mode D - Count
  // If Arduino only sends time period, interpret as Mode D count done
if (/^\d+$/.test(text.trim())) {
    const t = parseInt(text.trim());
    document.getElementById('countingResult').innerText = `Count complete for ${t} seconds. (value unknown)`;
  }
  
}

// ----- Mode B Functions -----
function startCalibration() {
    const t = document.getElementById('calTime').value;
    if (!t) return alert('Enter a time period');
  
    // Cancel any existing timeout
    clearTimeout(calTimeout);
  
    // Assume 0 if no response after 3 seconds
    calTimeout = setTimeout(() => {
      calRunCount += 1;
      const list = document.getElementById('runList');
      const item = document.createElement('li');
      item.textContent = `Run ${calRunCount} → 0 (timeout)`;
      list.appendChild(item);
      document.getElementById('calStatus').innerText = `Run ${calRunCount}: No data received. Showing 0.`;
    }, 3000); // 3000 ms = 3 sec
  
    sendSerial(`B\n`);
    sendSerial(`${t}\n`);
    sendSerial(`start\n`);
    document.getElementById('calStatus').innerText = `Calibration Run ${calRunCount + 1} started...`;
  }
  
  function submitCalibration() {
    m1 = parseFloat(document.getElementById('m1').value);
    c1 = parseFloat(document.getElementById('c1').value);
    m2 = parseFloat(document.getElementById('m2').value);
    c2 = parseFloat(document.getElementById('c2').value);
    if (isNaN(m1) || isNaN(c1) || isNaN(m2) || isNaN(c2)) {
      return alert('Please enter all values.');
    }
    calibrationDone = true;
    document.getElementById('calStatus').innerText = 'Calibration Constants Saved!';
    sendSerial(`done\n`);
  }

// ----- Mode C Functions -----
function startMeasuring() {
  if (!calibrationDone) {
    document.getElementById('measWarning').innerText = 'Please complete calibration in Mode B first.';
    return;
  }
  document.getElementById('measWarning').innerText = '';
  sendSerial('C\n');
  sendSerial('start\n');
}

// ----- Mode D Functions -----
function startCounting() {
    const t = document.getElementById('countTime').value;
    if (!t) return alert('Enter a time period');
  
    document.getElementById('countingResult').innerText = "Counting...";
    sendSerial('D\n');
    sendSerial(`${t}\n`);
    sendSerial('start\n');
  }
  

function submitCalibration() {
    m1 = parseFloat(document.getElementById('m1').value);
    c1 = parseFloat(document.getElementById('c1').value);
    m2 = parseFloat(document.getElementById('m2').value);
    c2 = parseFloat(document.getElementById('c2').value);
    if (isNaN(m1) || isNaN(c1) || isNaN(m2) || isNaN(c2)) {
      return alert('Please enter all values.');
    }
    calibrationDone = true;
    document.getElementById('calStatus').innerText = 'Calibration Constants Saved!';
    sendSerial(`done\n`);
  
    // Optional: notify or switch
    alert("Calibration complete! You can now go to Measuring Mode.");
    // Or: switchScreen('modeC');
  }
  