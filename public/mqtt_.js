const mqtt = require('mqtt');

const MQTT_BROKER = "mqtt://broker.emqx.io";  
const MQTT_TOPIC_PULISH = "/esp32/relay_control";  
const MQTT_TOPIC_SUBCRIBE = "/esp32/acceleration"; 

const mqttClient = mqtt.connect(MQTT_BROKER);

let data = {};  // Biến chứa dữ liệu từ MQTT

mqttClient.on('connect', () => {
  console.log("Đã kết nối tới MQTT Broker");

  mqttClient.subscribe(MQTT_TOPIC_SUBCRIBE, (err) => {
    if (err) {
      console.error("Không thể subscribe vào topic:", err);
    } else {
      console.log(`Đã subscribe vào topic ${MQTT_TOPIC_SUBCRIBE}`);
    } 
  });
});

mqttClient.on('message', (topic, message) => {
  if (topic === MQTT_TOPIC_SUBCRIBE) {
    console.log(`Nhận thông điệp từ topic ${topic}:`, message.toString());

    try {
      data = JSON.parse(message.toString()); 
      const { gia_toc, quang_duong, tinh_trang } = data;
      console.log(`Gia toc: ${gia_toc}, Quang duong: ${quang_duong}, Tinh Trang: ${tinh_trang}`);
    } catch (error) {
      console.error("Lỗi khi phân tích cú pháp JSON:", error);
    }
  }
});

const publishRelayControlMessage = (command) => {
  if (command !== "on" && command !== "off") {
    console.error("Lệnh không hợp lệ, chỉ nhận 'on' hoặc 'off'.");
    return;
  }

  mqttClient.publish(MQTT_TOPIC_PULISH, command, (err) => {
    if (err) {
      console.error("Không thể gửi thông điệp:", err);
    } else {
      console.log(`Đã gửi thông điệp: ${command} tới topic ${MQTT_TOPIC_PULISH}`);
    }
  });
};

module.exports = {
  mqttClient,
  publishRelayControlMessage,
  getData: () => data 
};