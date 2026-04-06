// Инициализация карты
const map = L.map('map', { zoomControl: false }).setView([54.5, 69.0], 7);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

let districtsLayer; 
let ndviRasterLayer;

// Функция цветов для районов (векторы)
function getColor(d) {
    return d > 0.6 ? '#011301' :
           d > 0.4 ? '#66A000' :
           d > 0.2 ? '#F1B555' :
           d > 0.0 ? '#CE7E45' : '#FFFFFF';
}

// 1. ЗАГРУЗКА РАСТРА ЧЕРЕЗ ПРОКСИ (ОБХОД CORS)
const fileId = "18qfEdCvoiku3wR7s475Xb1R55A_PIXoe";
const driveUrl = `https://docs.google.com/uc?export=download&id=${fileId}`;

// Используем сервис AllOrigins для обхода CORS
const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(driveUrl)}`;

console.log("Пытаюсь обойти CORS через прокси...");

fetch(proxyUrl)
    .then(response => {
        if (!response.ok) throw new Error("Прокси-сервер не смог забрать файл с Google Drive");
        return response.arrayBuffer();
    })
    .then(arrayBuffer => {
        parseGeoraster(arrayBuffer).then(georaster => {
            console.log("Ура! Растр успешно получен через прокси.");

            ndviRasterLayer = new GeoRasterLayer({
                georaster: georaster,
                opacity: 0.7,
                resolution: 128,
                pixelValuesToColorFn: values => {
                    const val = values[0];
                    if (val === null || isNaN(val) || val === 0) return "transparent";
                    
                    // Раскраска (если вдруг файл пришел не RGB)
                    if (values.length < 3) {
                        if (val > 0.6) return '#011301';
                        if (val > 0.4) return '#66A000';
                        if (val > 0.2) return '#F1B555';
                        if (val > 0.0) return '#CE7E45';
                        return "transparent";
                    }
                    // Если файл цветной RGB
                    return `rgb(${values[0]},${values[1]},${values[2]})`;
                }
            });

            ndviRasterLayer.addTo(map);
            console.log("Растр на карте!");
            loadDistricts(); 
        });
    })
    .catch(err => {
        console.error("CORS всё еще мешает или прокси тормозит:", err);
        // Даже если растр не загрузился, показываем районы
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
                        weight: 1.5,
                        color: 'white',
                        fillOpacity: 0.3 // Прозрачность, чтобы видеть растр под ними
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
        .catch(err => console.error("Ошибка загрузки GeoJSON:", err));
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
