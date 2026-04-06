// Инициализация карты
const map = L.map('map', { 
    zoomControl: false,
    maxZoom: 14,
    minZoom: 6
}).setView([54.5, 69.0], 7);

// Используем темную подложку, чтобы зеленый NDVI смотрелся контрастнее
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

let districtsLayer; 
let ndviRasterLayer;

// Функция цветов для районов (векторный слой)
function getColor(d) {
    return d > 0.6 ? '#011301' :
           d > 0.4 ? '#66A000' :
           d > 0.2 ? '#F1B555' :
           d > 0.0 ? '#CE7E45' : '#FFFFFF';
}

console.log("Загрузка растра NDVI...");

// 1. ЗАГРУЗКА РАСТРА
fetch("NDVI_2024_Raster.tif") 
    .then(response => {
        if (!response.ok) throw new Error("Файл .tif не найден!");
        return response.arrayBuffer();
    })
    .then(arrayBuffer => {
        parseGeoraster(arrayBuffer).then(georaster => {
            console.log("Растр прочитан успешно!");

            ndviRasterLayer = new GeoRasterLayer({
                georaster: georaster,
                opacity: 1,          // Убираем прозрачность, чтобы не было "серости"
                resolution: 256,    // Увеличиваем четкость (было 128)
                pixelValuesToColorFn: values => {
                    const r = values[0], g = values[1], b = values[2];
                    
                    // Если пиксель пустой (черный) - делаем прозрачным
                    if (values.every(v => v === 0 || v === null)) return "transparent";
                    
                    // Если файл RGB (из GEE visualize)
                    if (values.length >= 3) {
                        // Немного усиливаем яркость для сочности
                        return `rgb(${r},${g},${b})`;
                    }
                    
                    // Если файл - сырые значения NDVI (1 канал)
                    const val = values[0];
                    if (val > 0.6) return '#011301';
                    if (val > 0.4) return '#66A000';
                    if (val > 0.2) return '#F1B555';
                    if (val > 0.0) return '#CE7E45';
                    return "transparent";
                }
            });

            ndviRasterLayer.addTo(map);
            console.log("Растр отображен с высокой четкостью!");
            loadDistricts(); 
        });
    })
    .catch(err => {
        console.error("Ошибка растра:", err);
        loadDistricts();
    });

// 2. ФУНКЦИЯ ЗАГРУЗКИ РАЙОНОВ
function loadDistricts() {
    fetch('ndvi_2024_data.geojson')
        .then(res => res.json())
        .then(data => {
            districtsLayer = L.geoJSON(data, {
                style: function(feature) {
                    const val = feature.properties.max || 0; 
                    return {
                        fillColor: getColor(val),
                        weight: 1,        // Делаем границы тоньше
                        color: 'rgba(255,255,255,0.5)', // Белые полупрозрачные границы
                        fillOpacity: 0.15  // Почти прозрачные, чтобы не закрывать растр
                    };
                },
                onEachFeature: function(feature, layer) {
                    layer.on({
                        click: (e) => {
                            const p = feature.properties;
                            document.getElementById('welcome-msg').style.display = 'none';
                            document.getElementById('stats-content').style.display = 'block';
                            document.getElementById('dist-name').innerText = p.ADM2_EN || "Район";
                            document.getElementById('val-min').innerText = p.min ? p.min.toFixed(3) : "н/д";
                            document.getElementById('val-max').innerText = p.max ? p.max.toFixed(3) : "н/д";
                            map.fitBounds(e.target.getBounds());
                        }
                    });
                }
            }).addTo(map);
        })
        .catch(err => console.error("Ошибка GeoJSON:", err));
}

// 3. ФУНКЦИЯ ДЛЯ КНОПКИ
window.toggleDistricts = function() {
    if (districtsLayer) {
        if (map.hasLayer(districtsLayer)) {
            map.removeLayer(districtsLayer);
        } else {
            map.addLayer(districtsLayer);
        }
    }
};
