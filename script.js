<script src="https://unpkg.com/georaster"></script>
<script src="https://unpkg.com/georaster-layer-for-leaflet/dist/georaster-layer-for-leaflet.min.js"></script>
let districtsLayer; // Глобальная переменная для районов
let ndviRasterLayer; // Глобальная переменная для растра

// 1. Сначала загружаем РАСТР (он будет подложкой)
fetch("NDVI_2024_Raster.tif")
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => {
        parseGeoraster(arrayBuffer).then(georaster => {
            ndviRasterLayer = new GeoRasterLayer({
                georaster: georaster,
                opacity: 0.8,
                resolution: 128 // Можно поставить 256 для четкости или 64 для скорости
            });
            ndviRasterLayer.addTo(map);
            
            // Теперь, когда растр готов, загружаем РАЙОНЫ поверх него
            loadDistricts(); 
        });
    })
    .catch(err => console.error("Ошибка растра:", err));

// 2. Функция загрузки районов (перенесите сюда ваш fetch)
function loadDistricts() {
    fetch('ndvi_2024_data.geojson')
        .then(res => res.json())
        .then(data => {
            districtsLayer = L.geoJSON(data, {
                style: function(feature) {
                    const val = feature.properties.max || 0; 
                    return {
                        fillColor: getColor(val),
                        weight: 1,
                        color: 'rgba(255,255,255,0.5)', // Полупрозрачные границы
                        fillOpacity: 0.3 // Делаем прозрачным, чтобы видеть растр
                    };
                },
                onEachFeature: function(feature, layer) {
                    // Тут ваш старый код с click и mouseover
                }
            }).addTo(map);
        });
}

// 3. Функция для кнопки (вызывается из HTML)
function toggleDistricts() {
    if (map.hasLayer(districtsLayer)) {
        map.removeLayer(districtsLayer);
    } else {
        map.addLayer(districtsLayer);
    }
}
