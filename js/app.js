document.addEventListener('DOMContentLoaded', () => {
    const auditForm = document.getElementById('auditForm');
    const auditTableBody = document.getElementById('auditTableBody');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const clearDataBtn = document.getElementById('clearDataBtn');

    const STORAGE_KEY = 'sbc_inventory';

    // 1. Initialize and Render Table on Load
    renderTable();

    // 2. Handle Form Submission
    auditForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const rackId = document.getElementById('rackId').value.trim();
        const itemCode = document.getElementById('itemCode').value.trim();
        const expectedQty = parseInt(document.getElementById('expectedQty').value, 10);
        const physicalQty = parseInt(document.getElementById('physicalQty').value, 10);
        const variance = physicalQty - expectedQty;

        const record = {
            rackId: rackId,
            itemCode: itemCode,
            expectedQty: expectedQty,
            physicalQty: physicalQty,
            variance: variance,
            timestamp: new Date().toLocaleString()
        };

        saveRecord(record);
        auditForm.reset();
        document.getElementById('rackId').focus();
    });

    // 3. Save to Local Storage (Appends, never overwrites whole array)
    function saveRecord(record) {
        let savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        savedData.push(record);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));
        renderTable();
    }

    // 4. Render Table Data
    function renderTable() {
        let savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        auditTableBody.innerHTML = '';

        savedData.forEach(row => {
            const tr = document.createElement('tr');
            
            let varianceClass = '';
            if (row.variance < 0) varianceClass = 'variance-negative';
            if (row.variance > 0) varianceClass = 'variance-positive';

            tr.innerHTML = `
                <td>${row.rackId}</td>
                <td>${row.itemCode}</td>
                <td>${row.expectedQty}</td>
                <td>${row.physicalQty}</td>
                <td class="${varianceClass}">${row.variance > 0 ? '+' : ''}${row.variance}</td>
            `;
            auditTableBody.appendChild(tr);
        });
    }

    // 5. Export to CSV (Protects Hyphenated Codes)
    exportCsvBtn.addEventListener('click', function() {
        const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        
        if (savedData.length === 0) {
            alert("No stocktake data available to export.");
            return;
        }

        const headers = ["Rack ID", "Item Code", "System Expected", "Physical Count", "Variance", "Timestamp"];
        let csvContent = headers.join(",") + "\n";

        savedData.forEach(row => {
            // Quotes force spreadsheet apps to read hyphens as text, preventing auto-formatting errors
            const rowData = [
                `"${row.rackId}"`,
                `"=""${row.itemCode}"""`, // Strict Excel text-forcing format for hyphenated codes
                `"${row.expectedQty}"`,
                `"${row.physicalQty}"`,
                `"${row.variance}"`,
                `"${row.timestamp}"`
            ];
            csvContent += rowData.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "SBC_All_Racks_Stocktake.csv");
        link.style.display = "none";
        
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });

    // 6. Clear Data (with safety confirmation)
    clearDataBtn.addEventListener('click', function() {
        const confirmClear = confirm("Are you sure you want to clear all saved data from this device? This cannot be undone.");
        if (confirmClear) {
            localStorage.removeItem(STORAGE_KEY);
            renderTable();
        }
    });
});
