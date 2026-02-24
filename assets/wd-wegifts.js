let datepicker = document.getElementById("dateime");
const targetPriceSpan = document.querySelector(".target-price");
const isCustomAmountInput = document.querySelector(".custom-input");

if (!isCustomAmountInput) {
  document.querySelector(".initial-val").classList.add("active-variant");
}

const checkValidDate = () => {
  let value = new Date(datepicker.value).getTime();
  let now = new Date().getTime();

  if (value < now) {
    alert("Please choose valid date");
    datepicker.value = "";
  }
};

if (datepicker) {
  datepicker.addEventListener("input", checkValidDate);
}
let imageSrc = "";

if (datepicker) {
  datepicker.value = new Date().toISOString();
}
let srcValue;

let currSrc = document.querySelector(".selected-style");

if (currSrc) {
  srcValue = currSrc.getAttribute("src");
}

let initialValue = "";
// let val = document.querySelector(".val");
const handleShowTargetPriceMessage = (currValue, targetPrice) => {
  if (targetPrice > currValue) {
    targetPriceSpan.classList.remove("op-zero");
  } else if (targetPrice < currValue || !currValue || currValue === 0) {
    targetPriceSpan.classList.add("op-zero");
  }
};
const openPopup = () => {
  document.querySelector(".popup").classList.remove("d-none");
  // if (val.innerHTML === "") {
  //   val.innerHTML = 100;
  // }
  // if (isCustomAmountInput && +isCustomAmountInput.value !== 0) {
  //   val.innerHTML = isCustomAmountInput.value;
  // }
  const nodeArr = Array.prototype.slice.call(document.querySelectorAll(".i-image"));
  nodeArr[0].classList.add("selected-style");
  const id = nodeArr[0].getAttribute("id");
  selcetStyle(id);

  let currSrc = document.querySelector(".selected-style").getAttribute("src");
  imageSrc = currSrc;
};
const changeSendWay = (method) => {
  if (method === "phone") {
    document.getElementById("phone").classList.remove("d-none");
    document.getElementById("email").classList.add("d-none");
    document.getElementById("btn-sms").classList.add("curr-way");
    document.getElementById("btn-mail").classList.remove("curr-way");
  } else if (method === "email" && document.getElementById("phone")) {
    document.getElementById("email").classList.remove("d-none");
    document.getElementById("phone").classList.add("d-none");
    document.getElementById("btn-sms").classList.remove("curr-way");
    document.getElementById("btn-mail").classList.add("curr-way");
  }
};
const toggleChooseDate = (boolean) => {
  if (boolean) {
    document.getElementById("datepicker").classList.remove("d-none");
    document.getElementById("date-late").classList.add("curr-date");
    document.getElementById("date-now").classList.remove("curr-date");
  } else {
    document.getElementById("datepicker").classList.add("d-none");
    document.getElementById("date-late").classList.remove("curr-date");
    document.getElementById("date-now").classList.add("curr-date");
  }
};
const closePopup = () => {
  const popupContentElement = document.querySelector(".popup-content");
  const inputs = popupContentElement.querySelectorAll("input");

  for (const input of inputs) {
    input.value = "";
  }
  document.querySelector(".popup").classList.add("d-none");
};
const selcetStyle = (id) => {
  const input = document.getElementById(`style-${id}`);
  const image = document.getElementById(id);
  imageSrc = id;
  const arr = Array.prototype.slice.call(document.querySelectorAll(".i-image"));

  for (let i = 0; i < arr.length; i++) {
    arr[i].classList.remove("selected-style");
    const id = arr[i].getAttribute("id");
    document.getElementById(`style-${id}`).checked = false;
  }
  image.classList.add("selected-style");
  input.checked = true;
};

const setInitialValue = (value, targetPrice) => {
  const targetPriceInt = +targetPrice;
  const currentValueInt = +value.slice(1);
  targetPriceSpan.classList.remove("op-zero");
  const selected = document.getElementById(value);
  const variantArray = Array.prototype.slice.call(document.querySelectorAll(".initial-val"));

  for (let i = 0; i < variantArray.length; i++) {
    variantArray[i].classList.remove("active-variant");
  }
  selected.classList.add("active-variant");
  initialValue = value;
  // val.innerHTML = initialValue;
  // if (isCustomAmountInput && +isCustomAmountInput.value !== 0) {
  //   val.innerHTML = isCustomAmountInput.value;
  // }
  handleShowTargetPriceMessage(currentValueInt, targetPriceInt);
};

document.querySelector(".popup-content").addEventListener("submit", function (event) {
  event.preventDefault();
});
function formatDateToCustomString() {
  let value = new Date(datepicker.value).getTime();

  const options = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
    hour12: false // Set to false for 24-hour clock
  };

  const formattedDate = new Intl.DateTimeFormat("en-US", options).format(value);
  const timeZoneOffset = new Date(value).getTimezoneOffset() / -60;
  const timeZoneOffsetString = (timeZoneOffset >= 0 ? "+" : "-") + (timeZoneOffset < 10 ? "0" : "") + timeZoneOffset + "00";

  return formattedDate + " GMT" + timeZoneOffsetString;
}
const setCustomAmount = () => {
  if (isCustomAmountInput && +isCustomAmountInput.value !== 0) {
    const url = new URL(window.location.href);
    const myShopifyUrl = url.hostname;
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    const options = {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        value: +isCustomAmountInput.value,
        myShopifyUrl: myShopifyUrl
      })
    };

    fetch(
      "https://api.wegifts.io/api/shop/createCustomVariant", //TO BE REPLACED WITH OUR DOMAIN
      options
    )
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        fetch("/cart/add.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({
            id: data.variantId,
            quantity: 1,
            properties: {
              "Your Name": document.getElementById("your-name").value,
              Blessing: document.getElementById("messageblessing").value,
              "Email To Send": document.getElementById("email-to-send").value || "",
              "Phone To Send": document.getElementById("phone-number-to-send").value || "",
              "Time To Send": datepicker?.value ? formatDateToCustomString() : "",
              _Style: imageSrc
            }
          })
        })
          .then((response) => (window.location.href = `https://${myShopifyUrl}/cart`))
          .catch((error) => console.log(error));
      })
      .catch((err) => console.log(err));
  }
  document.querySelector(".popup").classList.add("d-none");
};
const showBiggerMessageWithCustomValue = (targetPrice) => {
  const targetPriceInt = +targetPrice;
  const customValue = +isCustomAmountInput.value;
  handleShowTargetPriceMessage(customValue, targetPriceInt);
};

const addInitialVariantToCart = () => {
  const currentValue = initialValue !== "" ? +initialValue.replace(/[^\d,.]/g, "") : 100;
  const url = new URL(window.location.href);
  const myShopifyUrl = url.hostname;
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  const options = {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      value: currentValue,
      myShopifyUrl: myShopifyUrl
    })
  };

  fetch("https://api.wegifts.io/api/shop/createCustomVariant", options)
    .then((res) => {
      return res.json();
    })
    .then((data) => {
      fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          id: data.variantId,
          quantity: 1,
          properties: {
            "Your Name": document.getElementById("your-name")?.value || "",
            Blessing: document.getElementById("messageblessing")?.value || "",
            "Email To Send": document.getElementById("email-to-send")?.value || "",
            "Phone To Send": document.getElementById("phone-number-to-send")?.value || "",
            "Time To Send": datepicker?.value ? formatDateToCustomString() : "",
            _Style: imageSrc
          }
        })
      })
        .then((response) => (window.location.href = `https://${myShopifyUrl}/cart`))
        .catch((error) => console.log(error));
    })
    .catch((err) => console.log(err));
};

const closeSaveData = (addToCart = false, notCustomAmount = false) => {
  if (addToCart && notCustomAmount) {
    addInitialVariantToCart();
  } else {
    setCustomAmount();
  }
};
