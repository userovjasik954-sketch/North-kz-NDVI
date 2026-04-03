# -*- coding: utf-8 -*-
import json

# Название файла, который ты скачал с Google Диска
input_file = 'Districts_NDVI_2024.geojson'
output_file = 'ndvi_2024_data.geojson'

print("Начинаю оптимизацию данных...")

try:
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Округляем значения NDVI до 3 знаков после запятой (лишние цифры только раздувают вес)
    for feature in data['features']:
        props = feature['properties']
        for key in list(props.keys()):
            if 'NDVI' in key and isinstance(props[key], (int, float)):
                props[key] = round(props[key], 3)

    # Сохраняем в компактном виде (без лишних пробелов)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, separators=(',', ':'), ensure_ascii=False)

    print(f"Готово! Файл оптимизирован и сохранен как {output_file}")

except FileNotFoundError:
    print(f"Ошибка: Файл {input_file} не найден. Подожди завершения загрузки в GEE.")