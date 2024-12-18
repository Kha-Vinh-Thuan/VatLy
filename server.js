const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const mqtt = require('mqtt');
const nodemailer = require('nodemailer');
const PushSafer = require('pushsafer-notifications');
const { OpenAI } = require('openai')

const app = express();

// Cấu hình kết nối MQTT
const MQTT_BROKER = "mqtt://broker.emqx.io";
const MQTT_TOPIC_SUBCRIBE = "/esp32/acceleration"; 

const client = mqtt.connect(MQTT_BROKER);

// Biến lưu trữ dữ liệu chuẩn hóa từ MQTT
let currentData = {
  gia_toc: "0.00",
  quang_duong: "0.00",
  tinh_trang: "Đang cập nhật......",
};

let account_sendmail = null;
let quanduongguimail = 500;
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const openai = new OpenAI({
  apiKey: ''// key OPENAI
});

// Kết nối đến MongoDB
const mongoURI = ""; //key mongo
mongoose.connect(mongoURI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

const AccelerationDataSchema = new mongoose.Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  z: { type: Number, required: true },
  gia_toc: { type: String, required: true },
  quang_duong: { type: String, required: true },
  tinh_trang: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const AccelerationData = mongoose.model('AccelerationData', AccelerationDataSchema);

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model('User', UserSchema);

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Username already exists." });
    }

    const newUser = new User({ username, password });
    await newUser.save();
    res.status(201).json({ success: true, message: "User created successfully." });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});


app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.password !== password) {
      return res.status(400).json({ success: false, message: "Incorrect password." });
    }
    account_sendmail= user.username;
    res.status(200).json({ success: true, message: "Login successful!" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// API để lấy dữ liệu dashboard
app.get('/api/dashboard', (req, res) => {
  res.json(currentData);
});

// Kết nối và nhận dữ liệu từ MQTT
client.on('connect', () => {
  console.log("Đã kết nối tới MQTT Broker");

  client.subscribe(MQTT_TOPIC_SUBCRIBE, (err) => {
    if (err) {
      console.error("Không thể subscribe vào topic:", err);
    } else {
      console.log(`Đã subscribe vào topic ${MQTT_TOPIC_SUBCRIBE}`);
    }
  });
});

// Lắng nghe và xử lý dữ liệu từ MQTT
client.on('message', (topic, message) => {
  if (topic === MQTT_TOPIC_SUBCRIBE) {
    let data = JSON.parse(message.toString());
    let { x, y, z, gia_toc, quang_duong, tinh_trang } = data;
    gia_toc = gia_toc ? gia_toc.toFixed(2) : "0.00";
    quang_duong = quang_duong ? quang_duong.toFixed(2) : "0.00";
    tinh_trang = tinh_trang === true ? "Di chuyển hợp lệ" : "Di chuyển trái phép";

    const payload = {
      x,
      y,
      z,
      gia_toc,
      quang_duong,
      tinh_trang
    };

    // Lưu dữ liệu vào MongoDB
    const newAccelerationData = new AccelerationData(payload);
    newAccelerationData.save()
      .then(() => {
        console.log("Dữ liệu gia tốc đã được lưu vào MongoDB.");
      })
      .catch(err => {
        console.error("Lỗi khi lưu dữ liệu gia tốc:", err);
      });

    currentData = { gia_toc, quang_duong, tinh_trang };
    console.log("Dữ liệu cập nhật:", currentData);
      
    
    if (parseFloat(quang_duong) > quanduongguimail) {
      quanduongguimail += 500;
      sendEmailAuto();
    }
  }
});

function sendPushNotification(message) {
  const p = new PushSafer({
    k: 'T7GqLn5yP5yl019SZhiU', 
    debug: true,                
  });


  const msg = {
    v: 2, //vibration
    i: 1, //icon
    m: message, //description
    t: 'Thông báo', //title
    d: 88103, //device
  };

  p.send(msg, function(err, result) {
    if (err) {
      console.error('Lỗi khi gửi thông báo Push:', err);
    } else {
      console.log('Kết quả gửi thông báo Push:', result);
    }
  });
}

function sendEmailAuto() {
  const emailData = {
    to: account_sendmail,  
    subject: 'Xe đang di chuyển trái phép', 
    text: 'Xe của bạn đang di chuyển trái phép ở một khoảng cách xa so với thời điểm ban đầu, vui lòng kiểm tra. Thông báo cũng đã gửi đến điện thoại của bạn!!!'  
  };

  sendEmail(emailData);

  const pushMessage = 'Xe của bạn đang di chuyển trái phép ở một khoảng cách xa so với thời điểm ban đầu, vui lòng kiểm tra. Thông báo cũng đã gửi đến email tài khoản của bạn';   
  sendPushNotification(pushMessage);
}

function sendEmail(emailData) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'khavinhthuan114@gmail.com', 
      pass: 'gjhc svjc eege xxbk',   
    },
  });

  const mailOptions = {
    from: 'khavinhthuan114@gmail.com',
    to: emailData.to,
    subject: emailData.subject,
    text: emailData.text,
  };

  // Gửi email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Lỗi khi gửi email:', error);
    } else {
      console.log('Email đã được gửi:', info.response);
    }
  });
}

/*// API để gửi email
app.post('/api/send-email', (req, res) => {
  const { to, subject, text } = req.body;

  const emailData = { to, subject, text };
  sendEmail(emailData);

  res.status(200).json({ success: true, message: "Email đã được gửi!" });
});*/

// API để điều khiển trạng thái máy
app.post('/api/update-machine-status', (req, res) => {
  const { status } = req.body;

  if (status === 1) {
    console.log("Nhấn Tắt máy xe (status = 1)");

    client.publish('/esp32/relay_control', 'on', (err) => {
      if (err) {
        console.error("Lỗi khi gửi tin nhắn lên MQTT:", err);
      } else {
        console.log("Gửi tin nhắn 'on' lên MQTT thành công.");
      }
    });
  } else if (status === 0) {
    console.log("Nhấn Bật máy xe (status = 0)");

    client.publish('/esp32/relay_control', 'off', (err) => {
      if (err) {
        console.error("Lỗi khi gửi tin nhắn lên MQTT:", err);
      } else {
        console.log("Gửi tin nhắn 'off' lên MQTT thành công.");
      }
    });
  } else {
    console.log("Giá trị không hợp lệ:", status);
  }

  res.status(200).json({ success: true, message: "Dữ liệu đã nhận." });
});

app.get('/api/history', async (req, res) => {
  try {
    const history = await AccelerationData.find().sort({ timestamp: -1 }).limit(20); 
    res.json(history);
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post('/api/ask', async (req, res) => {
  const { question } = req.body;  // Lấy câu hỏi từ frontend

  try {
      // Gửi câu hỏi đến GPT (GPT-3.5 turbo hoặc GPT-4)
      const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',  // Hoặc 'gpt-4' nếu bạn sử dụng GPT-4
          messages: [
              { role: 'system', content: 'You are a helpful assistant.' },  // Cấu hình chatbot
              { role: 'user', content: question },  // Câu hỏi của người dùng
          ],
      });

      // Trả lời từ GPT
      const answer = response.choices[0].message.content;

      // Gửi câu trả lời từ GPT về cho frontend
      res.json({ answer });
  } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ answer: 'Sorry, there was an error processing your question.' });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));