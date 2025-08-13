document.getElementById('fetchBtn').addEventListener('click', () => {
    fetch("https://api.loopii.app/")
    .then(response => response.json())
    .then(data => {
      document.getElementById('message').textContent = data.message;
    })
    .catch(error => {
      console.error('Error fetching from backend:', error);
      document.getElementById('message').textContent = 'Failed to get message.';
    });
});