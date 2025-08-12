document.getElementById('fetchBtn').addEventListener('click', () => {
  fetch('http://127.0.0.1:8000/')
    .then(response => response.json())
    .then(data => {
      document.getElementById('message').textContent = data.message;
    })
    .catch(error => {
      console.error('Error fetching from backend:', error);
      document.getElementById('message').textContent = 'Failed to get message.';
    });
});