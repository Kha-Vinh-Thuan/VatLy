const sendBtn = document.getElementById('send-btn');
const userInput = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

sendBtn.addEventListener('click', async function() {
    const question = userInput.value.trim();
    if (question) {
        addMessage(question, 'user');
        
        document.getElementById('loading').style.display = 'block';
        
        try {
            const response = await fetch('http://localhost:5000/api/ask', {  
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question })
            });
            
            const data = await response.json();
            
            if (data.answer) {
                addMessage(data.answer, 'bot');
            } else {
                addMessage("Sorry, I didn't understand the question.", 'bot');
            }
        } catch (error) {
            console.error('Error:', error);
            addMessage("Sorry, there was an error processing your question.", 'bot');
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }
});
