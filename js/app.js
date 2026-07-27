let activeBook = null;
let filteredBooksList = [];
let pendingBarcode = '';

const scanner = new BarcodeScanner('video-preview', handleScannedISBN);

// DOM Elements
const sectionScan = document.getElementById('section-scan');
const sectionNewBook = document.getElementById('section-new-book');
const sectionNewStationery = document.getElementById('section-new-stationery');
const sectionInventory = document.getElementById('section-inventory');
const modalItemType = document.getElementById('modal-item-type');
const modalExisting = document.getElementById('modal-existing-book');
const manualIsbnInput = document.getElementById('manual-isbn');

// Navigation Switches
document.getElementById('nav-scan').addEventListener('click', () => showSection('scan'));
document.getElementById('nav-inventory').addEventListener('click', () => {
  showSection('inventory');
  loadInventory();
});

function showSection(name) {
  sectionScan.classList.add('hidden');
  sectionNewBook.classList.add('hidden');
  sectionNewStationery.classList.add('hidden');
  sectionInventory.classList.add('hidden');
  modalExisting.classList.add('hidden');
  modalItemType.classList.add('hidden');

  document.getElementById('nav-scan').classList.remove('active');
  document.getElementById('nav-inventory').classList.remove('active');

  if (name === 'scan') {
    sectionScan.classList.remove('hidden');
    document.getElementById('nav-scan').classList.add('active');
  } else if (name === 'inventory') {
    sectionInventory.classList.remove('hidden');
    document.getElementById('nav-inventory').classList.add('active');
    scanner.stop();
  } else if (name === 'new-book') {
    sectionNewBook.classList.remove('hidden');
    scanner.stop();
  } else if (name === 'new-stationery') {
    sectionNewStationery.classList.remove('hidden');
    scanner.stop();
  }
}

// Start Camera Scanning
document.getElementById('btn-start-scan').addEventListener('click', () => {
  scanner.start();
});

// Manual Barcode / ISBN Search
document.getElementById('btn-manual-submit').addEventListener('click', () => {
  const isbn = manualIsbnInput.value.trim();
  if (isbn) {
    handleScannedISBN(isbn);
  } else {
    alert('Please enter a Barcode or ISBN');
  }
});

async function handleScannedISBN(rawISBN) {
  const isbn = cleanISBN(rawISBN);
  if (!isbn) {
    alert('Invalid Barcode / ISBN');
    return;
  }

  manualIsbnInput.value = '';

  try {
    // 1. Search LOCAL inventory FIRST
    const localBook = await StorageManager.getBook(isbn);

    if (localBook) {
      activeBook = localBook;
      document.getElementById('ext-type').textContent = localBook.itemType || 'Book';
      document.getElementById('ext-title').textContent = localBook.title;
      document.getElementById('ext-publisher').textContent = localBook.publisher || 'N/A';
      document.getElementById('ext-rack').textContent = localBook.rackLocation;
      document.getElementById('ext-category').textContent = localBook.bookCategory;
      document.getElementById('ext-price').textContent = localBook.sellingPrice.toFixed(2);
      document.getElementById('ext-qty').textContent = localBook.quantity;
      document.getElementById('add-qty-input').value = 1;
      
      modalExisting.classList.remove('hidden');
    } else {
      // 2. Prompt user to select Item Type (Book vs Stationery)
      pendingBarcode = isbn;
      modalItemType.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Workflow Error:', err);
    alert('Error processing barcode: ' + err.message);
  }
}

// Item Type Modal Handlers
document.getElementById('btn-type-book').addEventListener('click', async () => {
  modalItemType.classList.add('hidden');
  const meta = await MetadataFetcher.fetchBookInfo(pendingBarcode);
  
  document.getElementById('nb-isbn').value = pendingBarcode;
  document.getElementById('nb-title').value = meta.title || '';
  document.getElementById('nb-publisher').value = meta.publisher || '';
  document.getElementById('nb-rack').value = StorageManager.getLastRack();
  document.getElementById('nb-category').value = '';
  document.getElementById('nb-price').value = '';
  document.getElementById('nb-qty').value = 1;

  showSection('new-book');
});

document.getElementById('btn-type-stationery').addEventListener('click', () => {
  modalItemType.classList.add('hidden');
  
  document.getElementById('ns-barcode').value = pendingBarcode;
  document.getElementById('ns-name').value = '';
  document.getElementById('ns-supplier').value = '';
  document.getElementById('ns-rack').value = StorageManager.getLastRack();
  document.getElementById('ns-price').value = '';
  document.getElementById('ns-qty').value = 1;

  showSection('new-stationery');
});

function cleanISBN(isbn) {
  return isbn.replace(/[^0-9Xa-zA-Z]/gi, '');
}

// Google Search Helper Button
document.getElementById('btn-search-google').addEventListener('click', () => {
  const isbn = document.getElementById('nb-isbn').value;
  if (!isbn) {
    alert('No ISBN found to search.');
    return;
  }
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(isbn + ' site:my OR popular OR mph')}`;
  window.open(searchUrl, '_blank');
});

// Add Quantity to Existing Record
document.getElementById('btn-confirm-add').addEventListener('click', async () => {
  const addQty = parseInt(document.getElementById('add-qty-input').value, 10);
  if (isNaN(addQty) || addQty < 1) {
    alert('Please enter a valid quantity');
    return;
  }

  activeBook.quantity += addQty;
  await StorageManager.saveBook(activeBook);
  modalExisting.classList.add('hidden');
  alert(`Quantity updated! Total: ${activeBook.quantity}`);
  showSection('scan');
});

document.getElementById('btn-cancel-add').addEventListener('click', () => {
  modalExisting.classList.add('hidden');
});

// Save New Book
document.getElementById('form-new-book').addEventListener('submit', async (e) => {
  e.preventDefault();

  const rack = document.getElementById('nb-rack').value.trim();
  const book = {
    itemType: 'Book',
    isbn: document.getElementById('nb-isbn').value,
    title: document.getElementById('nb-title').value.trim(),
    publisher: document.getElementById('nb-publisher').value.trim(),
    rackLocation: rack,
    bookCategory: document.getElementById('nb-category').value,
    sellingPrice: parseFloat(document.getElementById('nb-price').value),
    quantity: parseInt(document.getElementById('nb-qty').value, 10)
  };

  await StorageManager.saveBook(book);
  StorageManager.setLastRack(rack);

  alert('Book saved successfully!');
  showSection('scan');
});

document.getElementById('btn-cancel-new-book').addEventListener('click', () => {
  showSection('scan');
});

// Save New Stationery
document.getElementById('form-new-stationery').addEventListener('submit', async (e) => {
  e.preventDefault();

  const rack = document.getElementById('ns-rack').value.trim();
  const stationery = {
    itemType: 'Stationery',
    isbn: document.getElementById('ns-barcode').value,
    title: document.getElementById('ns-name').value.trim(),
    publisher: document.getElementById('ns-supplier').value.trim(),
    rackLocation: rack,
    bookCategory: 'Stationery',
    sellingPrice: parseFloat(document.getElementById('ns-price').value),
    quantity: parseInt(document.getElementById('ns-qty').value, 10)
  };

  await StorageManager.saveBook(stationery);
  StorageManager.setLastRack(rack);

  alert('Stationery item saved successfully!');
  showSection('scan');
});

document.getElementById('btn-cancel-new-stat').addEventListener('click', () => {
  showSection('scan');
});

// Load and Render Inventory
async function loadInventory() {
  const allBooks = await StorageManager.getAllBooks();
  populateDropdowns(allBooks);
  filterAndRender(allBooks);
}

function populateDropdowns(books) {
  const rackSelect = document.getElementById('filter-rack');
  const pubSelect = document.getElementById('filter-publisher');

  const racks = [...new Set(books.map(b => b.rackLocation))].sort();
  const pubs = [...new Set(books.map(b => b.publisher).filter(Boolean))].sort();

  rackSelect.innerHTML = '<option value="">All Racks</option>' + racks.map(r => `<option value="${r}">${r}</option>`).join('');
  pubSelect.innerHTML = '<option value="">All Publishers/Suppliers</option>' + pubs.map(p => `<option value="${p}">${p}</option>`).join('');
}

['inv-search', 'filter-rack', 'filter-publisher', 'filter-category'].forEach(id => {
  document.getElementById(id).addEventListener('input', async () => {
    const allBooks = await StorageManager.getAllBooks();
    filterAndRender(allBooks);
  });
});

function filterAndRender(books) {
  const query = document.getElementById('inv-search').value.toLowerCase();
  const rackFilter = document.getElementById('filter-rack').value;
  const pubFilter = document.getElementById('filter-publisher').value;
  const catFilter = document.getElementById('filter-category').value;

  filteredBooksList = books.filter(b => {
    const matchesSearch = b.isbn.toLowerCase().includes(query) ||
                          b.title.toLowerCase().includes(query) ||
                          (b.publisher && b.publisher.toLowerCase().includes(query)) ||
                          b.rackLocation.toLowerCase().includes(query) ||
                          b.bookCategory.toLowerCase().includes(query);

    const matchesRack = !rackFilter || b.rackLocation === rackFilter;
    const matchesPub = !pubFilter || b.publisher === pubFilter;
    const matchesCat = !catFilter || b.bookCategory === catFilter;

    return matchesSearch && matchesRack && matchesPub && matchesCat;
  });

  // Sort inventory: Category -> Rack -> Title
  filteredBooksList.sort((a, b) => {
    if (a.bookCategory !== b.bookCategory) {
      return a.bookCategory.localeCompare(b.bookCategory);
    }
    if (a.rackLocation !== b.rackLocation) {
      return a.rackLocation.localeCompare(b.rackLocation);
    }
    return a.title.localeCompare(b.title);
  });

  renderTable(filteredBooksList);
  updateSummaryCards(filteredBooksList);
}

function renderTable(books) {
  const tbody = document.getElementById('inventory-tbody');
  tbody.innerHTML = books.map(b => `
    <tr>
      <td>${b.rackLocation}</td>
      <td>${b.bookCategory}</td>
      <td>${b.publisher || '-'}</td>
      <td>${b.isbn}</td>
      <td>${b.title}</td>
      <td>${b.quantity}</td>
      <td>${b.sellingPrice.toFixed(2)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-tertiary" onclick="editBook('${b.isbn}')">Edit</button>
          <button class="btn btn-danger" onclick="deleteBook('${b.isbn}', '${b.title.replace(/'/g, "\\'")}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function updateSummaryCards(books) {
  document.getElementById('stat-titles').textContent = books.length;
  document.getElementById('stat-stock').textContent = books.reduce((acc, b) => acc + b.quantity, 0);
  document.getElementById('stat-edu').textContent = books.filter(b => b.bookCategory === 'Educational Books').length;
  document.getElementById('stat-comics').textContent = books.filter(b => b.bookCategory === 'Novel / Comic' || b.bookCategory === 'Comics').length;
  document.getElementById('stat-stationery').textContent = books.filter(b => b.bookCategory === 'Stationery').length;
}

// Edit Item Callback
window.editBook = async (isbn) => {
  const book = await StorageManager.getBook(isbn);
  if (!book) return;

  const isStat = book.bookCategory === 'Stationery';
  const labelTitle = isStat ? 'Edit Item Name:' : 'Edit Book Title:';
  const labelPub = isStat ? 'Edit Supplier:' : 'Edit Publisher:';

  const newTitle = prompt(labelTitle, book.title);
  if (newTitle === null) return;

  const newPublisher = prompt(labelPub, book.publisher || '');
  if (newPublisher === null) return;

  const newRack = prompt('Edit Rack Location:', book.rackLocation);
  if (newRack === null) return;

  const newPrice = prompt('Edit Selling Price (RM):', book.sellingPrice);
  if (newPrice === null) return;

  const newQty = prompt('Edit Quantity:', book.quantity);
  if (newQty === null) return;

  book.title = newTitle.trim();
  book.publisher = newPublisher.trim();
  book.rackLocation = newRack.trim();
  book.sellingPrice = parseFloat(newPrice);
  book.quantity = parseInt(newQty, 10);

  await StorageManager.saveBook(book);
  loadInventory();
};

// Delete Item Callback
window.deleteBook = async (isbn, title) => {
  const confirmed = confirm(`Are you sure you want to delete "${title}" (Barcode: ${isbn}) from inventory?`);
  if (confirmed) {
    await StorageManager.deleteBook(isbn);
    alert('Item deleted successfully.');
    loadInventory();
  }
};

// CSV Export Logic
document.getElementById('btn-export-all').addEventListener('click', async () => {
  const allBooks = await StorageManager.getAllBooks();
  allBooks.sort((a, b) => a.bookCategory.localeCompare(b.bookCategory));
  exportCSV(allBooks, 'entire_inventory.csv');
});

document.getElementById('btn-export-filtered').addEventListener('click', () => {
  exportCSV(filteredBooksList, 'filtered_inventory.csv');
});

function exportCSV(books, filename) {
  const headers = ['Rack Location', 'Category', 'Publisher / Supplier', 'Barcode / ISBN', 'Title / Item Name', 'Qty Available', 'Selling Price (RM)'];
  const rows = books.map(b => [
    `"${b.rackLocation}"`,
    `"${b.bookCategory}"`,
    `"${b.publisher || ''}"`,
    `"${b.isbn}"`,
    `"${b.title.replace(/"/g, '""')}"`,
    b.quantity,
    b.sellingPrice.toFixed(2)
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
