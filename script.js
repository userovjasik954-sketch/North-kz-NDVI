// Инициализация карты с использованием Canvas для плавности
const map = L.map('map', { 
    zoomControl: false,
    renderer: L.canvas(), // Ускоряет отрисовку векторов (районов)
    preferCanvas: true
}).setView([54.5, 69.0], 7);

// Темная тема подложки для лучшего контраста NDVI
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

let districtsLayer; 
let ndviRasterLayer;

// Оптимизированная палитра
function getColor(d) {
    return d > 0.6 ? '#011301' :
           d > 0.4 ? '#66A000' :
           d > 0.2 ? '#F1B555' :
           d > 0.0 ? '#CE7E45' : '#FFFFFF';
}

console.log("Загрузка растра NDVI...");

// 1. ЗАГРУЗКА И ОПТИМИЗИРОВАННАЯ ОТРИСОВКА РАСТРА
fetch("NDVI_2024_Raster.tif") 
    .then(response => {
        if (!response.ok) throw new Error("Файл не найден");
        return response.arrayBuffer();
    })
    .then(arrayBuffer => {
        parseGeoraster(arrayBuffer).then(georaster => {
            ndviRasterLayer = new GeoRasterLayer({
                georaster: georaster,
                opacity: 1,
                // 128 - оптимально, чтобы не лагало на мобильных устройствах
                resolution: 128, 
                pixelValuesToColorFn: values => {
                    // Максимально быстрая проверка: если первый канал 0 (черный), сразу пропускаем
                    if (values[0] === 0 || values[0] === null) return "transparent";
                    
                    // Если файл RGB (уже раскрашен в GEE)
                    if (values.length >= 3) {
                        return `rgb(${values[0]},${values[1]},${values[2]})`;
                    }
                    
                    // Если файл одноканальный (сырой NDVI)
                    const val = values[0];
                    if (val > 0.6) return '#011301';
                    if (val > 0.4) return '#66A000';
                    if (val > 0.2) return '#F1B555';
                    if (val > 0.0) return '#CE7E45';
                    return "transparent";
                }
            });

            ndviRasterLayer.addTo(map);
            console.log("Растр оптимизирован и добавлен.");
            loadDistricts(); 
        });
    })
    .catch(err => {
        console.error("Ошибка:", err);
        loadDistricts();
    });

// 2. ЗАГРУЗКА РАЙОНОВ (ОПТИМИЗИРОВАННЫЙ GEOJSON)
function loadDistricts() {
    // Используем уже оптимизированный через Python файл
    fetch('ndvi_2024_data.geojson')
        .then(res => res.json())
        .then(data => {
            districtsLayer = L.geoJSON(data, {
                style: function(feature) {
                    // Используем данные из свойств, округленные твоим скриптом
                    const val = feature.properties.max || 0; 
                    return {
                        fillColor: getColor(val),
                        weight: 1,
                        color: 'rgba(255,255,255,0.3)',
                        fillOpacity: 0.1 // Делаем почти прозрачным, чтобы не грузить рендер поверх растра
                    };
                },
                onEachFeature: function(feature, layer) {
                    layer.on({
                        click: (e) => {
                            const p = feature.properties;
                            document.getElementById('welcome-msg').style.display = 'none';
                            document.getElementById('stats-content').style.display = 'block';
                            // Отображаем название района и статистику
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

// Переключатель слоев
window.toggleDistricts = function() {
    if (districtsLayer) {
        if (map.hasLayer(districtsLayer)) {
            map.removeLayer(districtsLayer);
        } else {
            map.addLayer(districtsLayer);
        }
    }
};
