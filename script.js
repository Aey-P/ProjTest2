let port, writer;

async function connectSerial() {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });

    const decoder = new TextDecoderStream();
    const inputDone = port.readable.pipeTo(decoder.writable);
    const inputStream = decoder.readable;
    const reader = inputStream.getReader();

    writer = port.writable.getWriter();
    document.getElementById('output').innerText = "Connected.\n";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        appendOutput(value);
      }
    }
  } catch (err) {
    appendOutput("Error: " + err);
  }
}

async function sendToArduino(text) {
    if (!writer) {
      alert("Please connect first!");
      return;
    }
    const encoder = new TextEncoder();
    await writer.write(encoder.encode(text + "\n"));
    // appendOutput(`> ${text}`); // Removed to avoid duplication
  }
  

function sendCustom() {
  const value = document.getElementById('customCommand').value;
  sendToArduino(value);
}

function appendOutput(text) {
  const out = document.getElementById('output');
  out.innerText += text;
  out.scrollTop = out.scrollHeight;
}
