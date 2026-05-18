class TSTimer extends HTMLElement {
  constructor() {
    super();
    this.endDate = "";
    this.utcOffset = -8;
    this.type = this.dataset.timer;
    this.cancelAction = this.dataset.action;
    this.timeTarget = this.dataset.target;
    this.cells = ["days","hours","minutes","seconds"];
  }

  connectedCallback() {
    switch (this.type) {
      case "cancel_date":
        this.endDate = this.parseDateInput(this.timeTarget);
        break;
      case "cancel_time":
        const targetValue = parseInt(this.timeTarget, 10) || 0;
        const targetMs = this.dataset.targetUnit === "seconds"
          ? targetValue * 1000
          : targetValue * 60 * 1000;
        this.endDate = new Date(Date.now() + targetMs).getTime();
        break;
      case "daily":
        this.endDate = this.getEndOfDayTimestampLA();
        break;
    }

    this.sessionStorageKey = `ts-timer-bar-${this.dataset.block}`;    

    if (sessionStorage.getItem(this.sessionStorageKey) === "true") {
      this.hideTimer();
    }

    this.timerInterval = setInterval(this.updateTimer.bind(this), 500);
    this.updateTimer();
  }

  updateTimer() {
    const now = new Date().getTime();
    const timeDiff = this.endDate - now;

    if (timeDiff <= 0) {
      clearInterval(this.timerInterval);

      if (this.cancelAction === "hide") {      
        this.hideTimer();
      }
      return;
    }

    const params = {
      days: Math.floor(timeDiff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((timeDiff % (1000 * 60)) / 1000)
    }
    
    this.cells.forEach(attribute => {
      this.querySelector(`[data-cell="${attribute}"]`).textContent = String(params[attribute]).padStart(2, '0')
    })
  }

  hideTimer() {
    this.closest('[data-timer-placement], [id^="shopify-section-"]').style.display = "none";
    sessionStorage.setItem(this.sessionStorageKey, "true");

    if (this.closest('[data-timer-placement]')) {
      document.documentElement.style.setProperty('--timer-height', '0px');
    }
  }

  getEndOfDayTimestampLA() {
    const laDateParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());

    const y = laDateParts.find(p => p.type === "year").value;
    const m = laDateParts.find(p => p.type === "month").value;
    const d = laDateParts.find(p => p.type === "day").value;

    const endOfDayLA = new Date(`${y}-${m}-${d}T23:59:59.999-08:00`);

    return endOfDayLA.getTime();
  }


  parseDateInput(dateStr) {
    const [datePart, timePart] = dateStr.trim().split(" ");
    const [day, month, year] = datePart.split("-").map(Number);

    let hours = 0, minutes = 0;
    if (timePart) {
      [hours, minutes] = timePart.split(":").map(Number);
    }

    const utcTimestamp = new Date(Date.UTC(year, month - 1, day, hours, minutes)).getTime();
    
    return utcTimestamp + 8 * 60 * 60 * 1000; 
  }
}

customElements.define("ts-timer", TSTimer);