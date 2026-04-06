// Инициализация карты (убедитесь, что эта строка у вас одна)
const map = L.map('map', { zoomControl: false }).setView([54.5, 69.0], 7);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

let districtsLayer; 
let ndviRasterLayer;

// Вспомогательная функция для цветов районов
function getColor(d) {
    return d > 0.6 ? '#011301' :
           d > 0.4 ? '#66A000' :
           d > 0.2 ? '#F1B555' :
           d > 0.0 ? '#CE7E45' : '#FFFFFF';
}

// 1. Загружаем РАСТР
fetch("NDVI_2024_Raster")
    .then(response => {
        if (!response.ok) throw new Error("Файл растра не найден на сервере");
        return response.arrayBuffer();
    })
    .then(arrayBuffer => {
        parseGeoraster(arrayBuffer).then(georaster => {
            ndviRasterLayer = new GeoRasterLayer({
                georaster: georaster,
                opacity: 0.8,
                resolution: 128,
                // Эта функция важна, если растр не визуализирован в GEE
                pixelValuesToColorFn: values => {
                    const r = values[0], g = values[1], b = values[2];
                    if (values.every(v => v === 0 || v === null)) return "transparent";
                    return `rgb(${r},${g},${b})`; // Используем RGB из GEE visualize
                }
            });
            ndviRasterLayer.addTo(map);
            
            // Загружаем районы ТОЛЬКО после растра, чтобы они были сверху
            loadDistricts(); 
        });
    })
    .catch(err => {
        console.error("Ошибка загрузки растра:", err);
        // Если растр не загрузился, всё равно пробуем загрузить районы
        loadDistricts();
    });

// 2. Функция загрузки районов
function loadDistricts() {
    fetch('ndvi_2024_data.geojson')
        .then(res => res.json())
        .then(data => {
            districtsLayer = L.geoJSON(data, {
                style: function(feature) {
                    const val = feature.properties.max || 0; 
                    return {
                        fillColor: getColor(val),
                        weight: 1.5,
                        color: 'white',
                        fillOpacity: 0.3 // Прозрачность, чтобы видеть растр
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

// 3. Функция для кнопки
window.toggleDistricts = function() {
    if (districtsLayer) {
        if (map.hasLayer(districtsLayer)) {
            map.removeLayer(districtsLayer);
        } else {
            map.addLayer(districtsLayer);
        }
    }
};
