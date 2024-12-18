let historyData = [];
let isMovingValid = false;
let isShutdownClicked = false;
let shutdownButtonClicks = 0;
let dataFetchInterval = null;
let isFetchingData = true; 
let tinh_trang_tmp = null;
function fetchDashboardData() {
  if (!isFetchingData) return; 

  fetch('http://localhost:5000/api/dashboard')
    .then(response => response.json())
    .then(data => {
      const { gia_toc, quang_duong, tinh_trang } = data;
      tinh_trang_tmp = tinh_trang;
      if (tinh_trang === "Di chuyển hợp lệ") {
        updateDashboard(gia_toc, quang_duong, tinh_trang);
                if (!isMovingValid) {
          addToHistory({
            time: new Date().toLocaleTimeString(),
            movement: tinh_trang,
            acceleration: `${gia_toc} m/s²`,
            distance: `${quang_duong} m`
          });
          renderHistory();
          isMovingValid = true; 
        }

        document.getElementById('shutdown-button').disabled = true;
        document.getElementById('shutdown-button').style.backgroundColor = '#aaa';
        document.getElementById('shutdown-button').textContent = "Tắt máy xe";
      }

      if (tinh_trang === "Di chuyển trái phép") {
        updateDashboard(gia_toc, quang_duong, tinh_trang);

        document.getElementById('shutdown-button').disabled = false;
        document.getElementById('shutdown-button').classList.add('blink');

        addToHistory({
          time: new Date().toLocaleTimeString(),
          movement: tinh_trang,
          acceleration: `${gia_toc} m/s²`,
          distance: `${quang_duong} m`
        });
        renderHistory();
        isMovingValid = false;

        if (dataFetchInterval === null) {
          dataFetchInterval = setInterval(fetchDashboardData, 5000);
        }
      } else {
        document.getElementById('shutdown-button').classList.remove('blink');
        
        if (dataFetchInterval !== null) {
          clearInterval(dataFetchInterval);
          dataFetchInterval = null;
        }
      }
    })
    .catch(err => {
      console.error("Lỗi khi lấy dữ liệu từ server:", err);
    });
}

function updateDashboard(gia_toc, quang_duong, tinh_trang) {
  document.getElementById('acceleration').textContent = `${gia_toc} m/s²`;
  document.getElementById('distance').textContent = `${quang_duong} m`;
  document.getElementById('movement').textContent = tinh_trang;
}

function renderHistory() {
  const historyTableBody = document.getElementById('history-table');
  historyTableBody.innerHTML = '';

  historyData.forEach(entry => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${entry.time}</td>
      <td>${entry.movement}</td>
      <td>${entry.acceleration}</td>
      <td>${entry.distance}</td>
    `;
    historyTableBody.appendChild(row);
  });
}

function addToHistory(entry) {
  if (historyData.length >= 10) {
    historyData.pop();
  }
  historyData.unshift(entry); 
}

/*function sendEmailNotification() {
  const emailAlertButton = document.getElementById('email-alert');
  fetch('http://localhost:5000/api/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: '22127408@student.hcmus.edu.vn',
      subject: 'Xe đang di chuyển trái phép111',
      text: 'Xe của  bạn đang di chuyển trái phép ở một khoảng cách xa so với thời điểm ban đầu, vui lòng kiểm tra.'
    })
  })
  .then(response => response.json())
  .then(data => {
    emailAlertButton.style.backgroundColor = 'red';
    emailAlertButton.textContent = 'Đã gửi Email';
    setTimeout(() => {
      emailAlertButton.style.backgroundColor = 'red';
    }, 2000); 
  })
  .catch(err => {
    console.error("Lỗi khi gửi email:", err);
  });
}*/

function toggleShutdownButton() {
  const button = document.getElementById('shutdown-button');
  const isShutdown = button.textContent === "Tắt máy xe";
  
  if (isShutdown && !isShutdownClicked) { 
    button.textContent = "Bật máy xe";
    button.style.backgroundColor = 'green';
    
    fetch('http://localhost:5000/api/update-machine-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 1 })
    })
    .then(response => response.json())
    .then(data => {
      console.log("Dữ liệu đã được gửi:", data);
    })
    .catch(err => {
      console.error("Lỗi khi gửi dữ liệu đến server:", err);
    });

    addToHistory({
      time: new Date().toLocaleTimeString(),
      movement: "Dừng xe",
      acceleration: `--- m/s²`,
      distance: `--- m;`
    }); 
    renderHistory(); 
    
    clearInterval(dataFetchInterval);
    isShutdownClicked = true; 
    shutdownButtonClicks += 1;

    if (shutdownButtonClicks === 2) {      
      button.textContent = "Tắt máy xe"; 
      button.style.backgroundColor = '#FF0000';
      button.disabled = false;
      isShutdownClicked = false;
      shutdownButtonClicks = 0;
      
      addToHistory({
        time: new Date().toLocaleTimeString(),
        movement: "Đã bật máy xe",
        acceleration: `0 m/s²`,
        distance: `0 m;`
      }); 
      renderHistory();

      clearInterval(dataFetchInterval); 
      isFetchingData = false; 
    }
  } else if (isShutdownClicked) { 
    button.textContent = "Tắt máy xe";
    button.style.backgroundColor = '#FF0000';

    button.disabled = true;
    isShutdownClicked = false;  
    shutdownButtonClicks = 0;   

    fetch('http://localhost:5000/api/update-machine-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 0 })
    })
    .then(response => response.json())
    .then(data => {
      console.log("Dữ liệu đã được gửi:", data);
    })
    .catch(err => {
      console.error("Lỗi khi gửi dữ liệu đến server:", err);
    });

    addToHistory({
      time: new Date().toLocaleTimeString(),
      movement: "Đã bật máy xe",
      acceleration: `0 m/s²`,
      distance: `0 m;`
    }); 
    renderHistory();

    isFetchingData = true; 
    dataFetchInterval = setInterval(fetchDashboardData, 5000); 
  }
}

// Hàm chạy khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('shutdown-button').disabled = true;

  fetchDashboardData(); 
  dataFetchInterval = setInterval(fetchDashboardData, 5000);

  document.getElementById('shutdown-button').addEventListener('click', toggleShutdownButton);
});