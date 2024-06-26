// const socket = io()

const hostname = window.location.hostname;
const port = window.location.port || "3000"; // Default to 3000 if no port is specified
const socket = io('wss://letstalk-b6lg.onrender.com');

var typing = false;
var timeout = undefined;

function getRandomDP() {
    const index = Math.floor(Math.random() * 20) + 1;
    return `./profile/${index}.jpg`;
}
var userAvatar = getRandomDP();

const { username, room } = Qs.parse(location.search, {
    ignoreQueryPrefix: true,
});

// Elements
const $messageForm = document.querySelector("#message-form");
const $messageFormInput = $messageForm.querySelector("input");
const $messageFormButton = $messageForm.querySelector("button");
const $sendLocationButton = document.querySelector("#send-location");
const $messages = document.querySelector("#messages");

//templates
const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationMessageTemplate = document.querySelector(
    "#location-message-template"
).innerHTML;
const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;

const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild;

    // Height of the new message
    const newMessageStyle = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyle.marginBottom);
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

    // Visible height
    const visibleHeight = $messages.offsetHeight;

    // Height of messages container
    const containerHeight = $messages.scrollHeight;

    // How far have i scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight;

    if (
        Math.round(containerHeight - newMessageHeight - 1) <=
        Math.round(scrollOffset)
    ) {
        $messages.scrollTop = $messages.scrollHeight;
    }
};

function timeoutFunction() {
    typing = false;
    socket.emit("nottyping", { username, room });
}

function onKeyDownNotEnter() {
    if (typing == false) {
        typing = true;
        socket.emit("typing", { username, room });
        timeout = setTimeout(timeoutFunction, 2000);
    } else {
        clearTimeout(timeout);
        timeout = setTimeout(timeoutFunction, 2000);
    }
}

$messageFormInput.addEventListener("input", () => {
    onKeyDownNotEnter();
});

socket.on("typing...", (user) => {
    console.log(`${user.username} is typing...`);

    // insert typing... message to all users
    const typingInfo = document.createElement("p");
    typingInfo.classList.add("typinginfo");
    typingInfo.innerHTML = `<strong>${user.username}</strong> is typing...`;
    $messages.insertAdjacentElement("afterend", typingInfo);
});

socket.on("nottyping...", (user) => {
    console.log(`${user.username} stopped typing...`);

    // remove typing... message from all users
    const typingInfo = document.querySelector(".typinginfo");
    typingInfo.remove();
});

socket.on("notification", ({ username, text }) => {
    // add notification sound
    var audio = new Audio("notification.mp3");
    audio.play();
    // alert(`${username} has sent a message`);
});

socket.on("message", (message) => {
    console.log(message);
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.timestamp).format("h:mm a"),
        avatar: message.avatar,
    });
    $messages.insertAdjacentHTML("beforeend", html);
    autoscroll();
});

socket.on("locationMessage", (message) => {
    console.log(message);
    const html = Mustache.render(locationMessageTemplate, {
        username: message.username,
        url: message.text,
        createdAt: moment(message.timestamp).format("h:m a"),
        avatar: message.avatar,
    });
    $messages.insertAdjacentHTML("beforeend", html);
    autoscroll();
});

socket.on("updateOnlineUsers", ({ room, users }) => {
    const sidebar = document.querySelector("#sidebar");
    sidebar.innerHTML = "";
    const heading = document.createElement("h2");
    heading.textContent = "Users";
    heading.style.alignSelf = "center";
    heading.style.marginBottom = "20px";
    sidebar.appendChild(heading);
    users.forEach((user) => {
        const userElement = document.createElement("div");
        userElement.classList.add("user-element");
        const greenDot = document.createElement("div");
        greenDot.classList.add("online-green-dot");

        const userName = document.createElement("p");
        userName.classList.add("username");
        userName.innerHTML = user.username;

        userElement.appendChild(greenDot);
        userElement.appendChild(userName);
        sidebar.appendChild(userElement);
    });
});

socket.on("updateMessages", (messages) => {
    messages.forEach((message) => {
        socket.emit(
            "loadMessages",
            {
                text: message.text,
                username: message.username,
                room: message.room,
                timestamp: message.timestamp,
                avatar: message.avatar,
            },
            (error) => {
                //enable the form
                // $messageFormButton.removeAttribute('disabled')
                // $messageFormInput.value = ''

                if (error) {
                    return console.log(`error in loading messages`, error);
                }
            }
        );
    });
    $messageFormInput.focus();
});

socket.on("roomData", ({ room, users }) => {
    // const html = Mustache.render(sidebarTemplate, {
    //     room,
    //     users
    // })
    // document.querySelector('#sidebar').innerHTML = html
    const sidebar = document.querySelector("#sidebar");
    sidebar.innerHTML = "";
    const heading = document.createElement("h2");
    heading.textContent = "Users";
    heading.style.alignSelf = "center";
    heading.style.marginBottom = "20px";
    sidebar.appendChild(heading);
    users.forEach((user) => {
        const userElement = document.createElement("div");
        userElement.classList.add("user-element");
        const greenDot = document.createElement("div");
        greenDot.classList.add("online-green-dot");

        const userName = document.createElement("p");
        userName.classList.add("username");
        userName.innerHTML = user.username;

        userElement.appendChild(greenDot);
        userElement.appendChild(userName);
        sidebar.appendChild(userElement);
    });

    autoscroll();
});

$messageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    //disable the form
    $messageFormButton.setAttribute("disabled", "disbaled");

    const message = e.target.message.value;

    socket.emit(
        "sendMessage",
        { text: message, username, room, avatar: userAvatar },
        (error) => {
            //enable the form
            $messageFormButton.removeAttribute("disabled");
            $messageFormInput.value = "";
            $messageFormInput.focus();

            if (error) {
                return console.log(error);
            }
            console.log("Message Delivered!");
        }
    );
});

$sendLocationButton.addEventListener("click", () => {
    if (!navigator.geolocation) {
        return alert("Geolocation is not supported by your browser!");
    }

    $sendLocationButton.setAttribute("disabled", "disabled");

    navigator.geolocation.getCurrentPosition((position) => {
        socket.emit(
            "sendLocation",
            {
                username,
                room,
                latitute: position.coords.latitude,
                longitute: position.coords.longitude,
                avatar: userAvatar,
            },
            () => {
                $sendLocationButton.removeAttribute("disabled");
                console.log("Location Shared!");
            }
        );
    });
});

socket.emit("join", { username, room }, (error) => {
    if (error) {
        alert(error);
        location.href = "/";
    }
});
