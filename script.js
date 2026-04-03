const map = L.map('map', { zoomControl: false }).setView([54.5, 69.0], 7);

L.control.zoom({ position: 'bottomright' }).addTo(map);

// Светлая подложка
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

function getColor(d) {
    return d > 0.6 ? '#011301' :
           d > 0.4 ? '#66A000' :
           d > 0.2 ? '#F1B555' :
           d > 0.0 ? '#CE7E45' : '#FFFFFF';
}

fetch('ndvi_2024_data.geojson')
    .then(res => res.json())
    .then(data => {
        L.geoJSON(data, {
            style: function(feature) {
                // В вашем файле свойства называются просто "max" и "min"
                const val = feature.properties.max || 0; 
                return {
                    fillColor: getColor(val),
                    weight: 1.5,
                    color: 'white',
                    fillOpacity: 0.7
                };
            },
            onEachFeature: function(feature, layer) {
                layer.on({
                    mouseover: (e) => {
                        e.target.setStyle({ fillOpacity: 0.9, weight: 3, color: '#666' });
                    },
                    mouseout: (e) => {
                        e.target.setStyle({ fillOpacity: 0.7, weight: 1.5, color: 'white' });
                    },
                    click: (e) => {
                        const p = feature.properties;
                        document.getElementById('welcome-msg').style.display = 'none';
                        document.getElementById('stats-content').style.display = 'block';
                        
                        // Отображаем название района и данные
                        document.getElementById('dist-name').innerText = p.ADM2_EN || "Район";
                        document.getElementById('val-min').innerText = p.min ? p.min.toFixed(3) : "н/д";
                        document.getElementById('val-max').innerText = p.max ? p.max.toFixed(3) : "н/д";
                        
                        map.fitBounds(e.target.getBounds());
                    }
                });
            }
        }).addTo(map);
    })
    .catch(err => console.error("Ошибка загрузки файла ndvi_2024_data.geojson:", err));