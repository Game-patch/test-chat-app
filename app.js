function generateAnonymousId() {
    return 'User' + Math.floor(Math.random() * 10000);
}

let username = generateAnonymousId();

// Replace with your local IP address
const ws = new WebSocket('wss://192.168.29.23:8080');

ws.onopen = function() {
    console.log("Connected to the WebSocket server.");
    keepAlive();
};

ws.onmessage = function(event) {
    displayMessage(event.data, false);
};

ws.onerror = function(error) {
    console.error("WebSocket error:", error);
    reconnect();
};

ws.onclose = function() {
    console.log("WebSocket connection closed.");
    reconnect();
};

document.getElementById("send-button").addEventListener("click", function() {
    sendMessage();
});

document.getElementById("message-input").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        sendMessage();
    } else {
        ws.send(JSON.stringify({ type: 'typing', username }));
    }
});

document.getElementById("message-input").addEventListener("keyup", function(event) {
    ws.send(JSON.stringify({ type: 'stopped_typing', username }));
});

document.getElementById("upload-button").addEventListener("click", function() {
    document.getElementById("upload-input").click();
});

function sendMessage() {
    let messageInput = document.getElementById("message-input");
    let message = messageInput.value;
    if (message.trim() !== "") {
        let formattedMessage = `${username}: ${message}`;
        displayMessage(formattedMessage, true);
        ws.send(JSON.stringify({ type: 'message', content: formattedMessage }));
        messageInput.value = "";
        ws.send(JSON.stringify({ type: 'stopped_typing', username }));
    }
}

document.getElementById("upload-input").addEventListener("change", function(event) {
    let file = event.target.files[0];
    if (file) {
        let reader = new FileReader();
        reader.onload = function(e) {
            let message;
            if (file.type.startsWith('image/')) {
                let img = new Image();
                img.onload = function() {
                    let tag = '';
                    let tagClass = '';
                    if (img.width >= 1920 && img.height >= 1080) {
                        tag = 'Full HD';
                        tagClass = 'full-hd';
                    } else if (img.width >= 1280 && img.height >= 720) {
                        tag = 'HD';
                        tagClass = 'hd';
                    } else {
                        tag = 'SD';
                        tagClass = 'sd';
                    }
                    message = `${username}: <div class="image-tag ${tagClass}">${tag}</div><img src="${e.target.result}" alt="Image">`;
                    displayMessage(message, true);
                    ws.send(JSON.stringify({ type: 'message', content: message }));
                };
                img.src = e.target.result;
            } else if (file.type.startsWith('video/')) {
                let video = document.createElement('video');
                video.onloadedmetadata = function() {
                    let tag = '';
                    let tagClass = '';
                    if (video.videoWidth >= 1920 && video.videoHeight >= 1080) {
                        tag = 'Full HD';
                        tagClass = 'full-hd';
                    } else if (video.videoWidth >= 1280 && video.videoHeight >= 720) {
                        tag = 'HD';
                        tagClass = 'hd';
                    } else {
                        tag = 'SD';
                        tagClass = 'sd';
                    }
                    message = `${username}: <div class="video-tag ${tagClass}">${tag}</div><video controls><source src="${e.target.result}" type="${file.type}">Your browser does not support the video tag.</video>`;
                    displayMessage(message, true);
                    ws.send(JSON.stringify({ type: 'message', content: message }));
                };
                video.src = e.target.result;
            } else {
                alert("Unsupported file format. Please upload an image or video.");
                return;
            }
        };
        reader.readAsDataURL(file);
    }
});

function displayMessage(message, isSender) {
    let chatBox = document.getElementById("chat-box");
    let newMessage = document.createElement("div");
    newMessage.classList.add("message");

    let avatar = document.createElement("div");
    avatar.classList.add("message-avatar");
    avatar.textContent = username.charAt(0).toUpperCase();

    let messageContent = document.createElement("div");
    messageContent.classList.add("message-content");
    messageContent.innerHTML = escapeHtml(message); // Escape HTML

    let now = new Date();
    let timestamp = document.createElement("div");
    timestamp.classList.add("message-timestamp");
    timestamp.textContent = now.toLocaleString();
    timestamp.dataset.timestamp = now.getTime();

    if (isSender) {
        let tick = document.createElement("span");
        tick.classList.add("message-tick");
        tick.textContent = "✓";
        timestamp.appendChild(tick);

        let editButton = document.createElement("span");
        editButton.classList.add("edit-button");
        editButton.textContent = "Edit";
        editButton.onclick = function() {
            let messageText = messageContent.innerText.split("\n")[0];
            let editInput = prompt("Edit your message:", messageText);
            if (editInput !== null) {
                let currentTime = new Date().getTime();
                let messageTimestamp = parseInt(timestamp.dataset.timestamp, 10);
                if (currentTime - messageTimestamp <= 900000) {
                    let formattedMessage = `${username}: ${escapeHtml(editInput)}`;
                    messageContent.innerHTML = `${formattedMessage}<div class="message-timestamp">${new Date().toLocaleString()} ✓</div>`;
                } else {
                    alert("You can only edit messages within 15 minutes.");
                }
            }
        };
        messageContent.appendChild(editButton);
    }

    newMessage.appendChild(avatar);
    newMessage.appendChild(messageContent);
    newMessage.appendChild(timestamp);
    chatBox.appendChild(newMessage);
    chatBox.scrollTop = chatBox.scrollHeight;

    let deletePopupButton = document.getElementById("delete-popup-button");
    newMessage.addEventListener("mousedown", function() {
        deletePopupButton.style.display = "block";
        deletePopupButton.onclick = function() {
            chatBox.removeChild(newMessage);
            deletePopupButton.style.display = "none";
        };
    });

    newMessage.addEventListener("mouseup", function() {
        setTimeout(() => {
            deletePopupButton.style.display = "none";
        }, 3000);
    });
}

// Typing indicator
ws.onmessage = function(event) {
    let data = JSON.parse(event.data);
    if (data.type === 'message') {
        displayMessage(data.content, false);
    } else if (data.type === 'typing') {
        showTypingIndicator(data.username);
    } else if (data.type === 'stopped_typing') {
        hideTypingIndicator(data.username);
    }
};

function showTypingIndicator(username) {
    let typingIndicator = document.getElementById("typing-indicator");
    typingIndicator.textContent = `${username} is typing...`;
    typingIndicator.style.display = "block";
}

function hideTypingIndicator(username) {
    let typingIndicator = document.getElementById("typing-indicator");
    typingIndicator.style.display = "none";
}

// Set chat start date
let chatStartDate = new Date().toLocaleDateString();
document.querySelector(".chat-start-date").textContent = `Chat started on: ${chatStartDate}`;

function keepAlive() {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
    }
    setTimeout(keepAlive, 30000); // Ping every 30 seconds
}

function reconnect() {
    setTimeout(function() {
        ws = new WebSocket('wss://192.168.29.23:8080');
        ws.onopen = ws.onopen;
        ws.onmessage = ws.onmessage;
        ws.onerror = ws.onerror;
        ws.onclose = ws.onclose;
    }, 5000); // Attempt to reconnect every 5 seconds
}
