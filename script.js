// https://gist.github.com/kotobuki/7c67f8b9361e08930da1a5cfcfb0653f
const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";

// Allows the micro:bit to transmit a byte array
const UART_TX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";

// Allows a connected client to send a byte array
const UART_RX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

let uBitDevice;
let rxCharacteristic;

const $joystick = $('#joystick');
const $stick = $('#stick');
let isDragging = false;
const maxMotorValue = 1023;
let leftMotorValue = 0;
let rightMotorValue = 0;


async function connect() {
  try {
    console.log("Requesting Bluetooth Device...");
    uBitDevice = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "BBC micro:bit" }],
      optionalServices: [UART_SERVICE_UUID]
    });

    console.log("Connecting to GATT Server...");
    const server = await uBitDevice.gatt.connect();

    console.log("Getting Service...");
    const service = await server.getPrimaryService(UART_SERVICE_UUID);

    console.log("Getting Characteristics...");
    const txCharacteristic = await service.getCharacteristic(UART_TX_CHARACTERISTIC_UUID);
    txCharacteristic.startNotifications();
    txCharacteristic.addEventListener(
      "characteristicvaluechanged",
      handleNotifications
    );
    rxCharacteristic = await service.getCharacteristic(UART_RX_CHARACTERISTIC_UUID);
    $("#status").text("接続成功");
    $("#status").css("color", "green");
  } catch (error) {
    console.log(error);
    $("#status").text(error);
    $("#status").css("color", "red");
  }
}

function disconnect() {
  if (uBitDevice) {


    if (uBitDevice.gatt.connected) {
        uBitDevice.gatt.disconnect();
        console.log("Disconnected");
    }

  }
}

async function sendMessage(text) {
  if (rxCharacteristic) {
        try {
            let encoder = new TextEncoder();
            rxCharacteristic.writeValue(encoder.encode(text));
        } catch (error) {
            console.log(error);
        }

    }
}

function handleNotifications(event) {
    const value = event.target.value;
    const inputValue = new TextDecoder().decode(value).replace(/\r?\n/g, '');
    console.log(inputValue);
}





$joystick.on('mousedown touchstart', function(e) {
  isDragging = true;
  $joystick.css('cursor', 'grabbing');
});

$(document).on('mousemove touchmove', function(e) {
  if (!isDragging) return;
  const mouseX = e.clientX ? e.clientX : e.originalEvent.touches[0].pageX
  const mouseY = e.clientY ? e.clientY : e.originalEvent.touches[0].pageY
  const rect = $joystick[0].getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const deltaX = mouseX - centerX;
  const deltaY = mouseY - centerY;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) + 25;

  if (distance <= rect.width / 2) {
    $stick.css('transform', `translate(${deltaX}px, ${deltaY}px)`);


    const motorValue = -Math.round((deltaY / (rect.width / 2)) * maxMotorValue);

    const turnValue = Math.round((deltaX / (rect.height / 2)) * maxMotorValue);

    leftMotorValue = Math.round(Math.min(Math.max(motorValue + turnValue, -maxMotorValue), maxMotorValue));
    rightMotorValue = Math.round(Math.min(Math.max(motorValue - turnValue, -maxMotorValue), maxMotorValue));


  } else {
    const angle = Math.atan2(deltaY, deltaX);
    const maxX = Math.cos(angle) * (rect.width / 2 - 25);
    const maxY = Math.sin(angle) * (rect.height / 2 - 25);
    $stick.css('transform', `translate(${maxX}px, ${maxY}px)`);




    const motorValue = -Math.round((deltaY / (rect.width / 2)) * maxMotorValue);

    const turnValue = Math.round((-deltaX / (rect.height / 2)) * maxMotorValue);

    leftMotorValue = Math.round(Math.min(Math.max(motorValue + turnValue, -maxMotorValue), maxMotorValue));
    rightMotorValue = Math.round(Math.min(Math.max(motorValue - turnValue, -maxMotorValue), maxMotorValue));


    console.log(leftMotorValue)
    // console.log(rightMotorValue)

  }

});

$(document).on('mouseup touchend', function() {
  isDragging = false;
  $joystick.css('cursor', 'grab');
  $stick.css('transform', 'translate(0, 0)');
  leftMotorValue = 0;
  rightMotorValue = 0;
});

function moterControl() {
  const moter = [

    leftMotorValue > 0 ? leftMotorValue : 0,
    rightMotorValue < 0 ? -rightMotorValue : 0,
    leftMotorValue < 0 ? -leftMotorValue : 0,
    rightMotorValue > 0 ? rightMotorValue : 0,
  ]

  msg = moter.join(",")+"\n"
  console.log(msg);
  sendMessage(msg);
}

setInterval(moterControl, 300);