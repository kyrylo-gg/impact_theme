var cards = document.querySelectorAll('.twerk_course');

cards.forEach(function(card) {
  card.addEventListener('click', function() {
    cards.forEach(function(otherCard) {
      otherCard.classList.remove('clicked');
    });

    // Добавляем класс "clicked" только текущей карточке
    card.classList.add('clicked');
  // Удаляем класс "clicked" у всех элементов с классом "button_course"
      var allButtons = document.querySelectorAll('.button_course');
      allButtons.forEach(function(button) {
        button.classList.remove('clicked');
      });
    // Получаем все элементы с классом "button_course" внутри текущей карточки
    var buttons = card.querySelectorAll('.button_course');

    // Добавляем класс "clicked" при клике на кнопку
    buttons.forEach(function(button) {
      button.classList.add('clicked');
    });
  });
});

// события которые показывают бандл (начало)
document.addEventListener("DOMContentLoaded", function() {
    const showBundleSection = document.querySelector(".show_bundle");
    const hiddenSection = document.getElementById("shopify-section-template--14989537181770__16987571857d718cb5");

    if (showBundleSection) {
      showBundleSection.addEventListener("click", function() {
          hiddenSection.classList.toggle("active");
      });
    }
});
document.addEventListener("DOMContentLoaded", function() {
    const showBundleSection = document.querySelector(".show_bundle2");
    const hideBundleSection = document.querySelector(".hide_bundle");
    const hiddenSection = document.getElementById("shopify-section-template--14989537181770__16987571857d718cb5");

    if (showBundleSection) {
      showBundleSection.addEventListener("click", function() {
          if (!hiddenSection.classList.contains("active")) {
              hiddenSection.classList.add("active");
          }
      });
    }

    if (hideBundleSection) {
      hideBundleSection.addEventListener("click", function() {
          hiddenSection.classList.remove("active");
      });
    }
});

// события которые показывают бандл (конец)
// Находим кнопку по id
const twerkButton = document.getElementById('twerk_bundel');

// Находим секцию по классу
const bndlrSection = document.querySelector('.shopify-app-block');

// Добавляем обработчик события на клик по кнопке
if (twerkButton) {
  twerkButton.addEventListener('click', function() {
    // Используем метод scrollIntoView для прокрутки к секции
    bndlrSection.scrollIntoView({ behavior: 'smooth' }); // 'smooth' делает прокрутку плавной
  });
}

// Находим кнопку по id
const twerkButton2 = document.getElementById('twerk_bundel2');

// Находим секцию по классу
const bndlrSection2 = document.querySelector('.shopify-app-block');

// Добавляем обработчик события на клик по кнопке
if (twerkButton2) {
  twerkButton2.addEventListener('click', function() {
    // Используем метод scrollIntoView для прокрутки к секции
    bndlrSection2.scrollIntoView({ behavior: 'smooth' }); // 'smooth' делает прокрутку плавной
  });
}



