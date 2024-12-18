async function fetchHistoryData() {
  try {
    const response = await fetch('http://localhost:5000/api/history');
    if (!response.ok) {
      throw new Error("Failed to fetch history data");
    }
    const history = await response.json();

    const historyTable = document.getElementById("history-table");
    historyTable.innerHTML = '';  // Xóa nội dung bảng trước khi thêm mới

    if (history.length === 0) {
      // Nếu không có dữ liệu, hiển thị thông báo
      historyTable.innerHTML = '<tr><td colspan="6">Không có dữ liệu lịch sử</td></tr>';
    } else {
      history.forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${new Date(item.timestamp).toLocaleString()}</td>
          <td>${item.x}</td>
          <td>${item.y}</td>
          <td>${item.z}</td>
          <td>${item.tinh_trang}</td>
          <td>${item.quang_duong}</td>
        `;
        historyTable.appendChild(row);
      });
    }
  } catch (error) {
    console.error("Error fetching history data:", error);
  }
}

// Gọi API để lấy lịch sử khi tải trang
fetchHistoryData();