import urllib.request, json
import re

url = 'https://raw.githubusercontent.com/Bowserinator/Periodic-Table-JSON/master/PeriodicTableJSON.json'
req = urllib.request.urlopen(url)
data = json.loads(req.read())

elements_js = 'const ELEMENTS = [\n'
for e in data['elements']:
    n = e['number']
    s = e['symbol']
    name = e['name']
    m = e['atomic_mass']
    cat = e['category']
    # map category to our cats
    if 'alkali metal' in cat: c = 'alkali'
    elif 'alkaline earth' in cat: c = 'alkaline'
    elif 'transition metal' in cat: c = 'transition'
    elif 'post-transition metal' in cat: c = 'post-transition'
    elif 'metalloid' in cat: c = 'metalloid'
    elif 'diatomic nonmetal' in cat or 'polyatomic nonmetal' in cat or 'reactive nonmetal' in cat: c = 'nonmetal'
    elif 'noble gas' in cat: c = 'noble'
    elif 'lanthanide' in cat: c = 'lanthanide'
    elif 'actinide' in cat: c = 'actinide'
    elif 'halogen' in cat: c = 'halogen'
    else: c = 'transition' # fallback
    
    shells = e.get('shells', [])
    
    color_map = {
        'alkali': '#ff7744', 'alkaline': '#ffcc44', 'transition': '#44aaff',
        'post-transition': '#55cc77', 'metalloid': '#bb66ee', 'nonmetal': '#00f5ff',
        'halogen': '#ff3399', 'noble': '#ffdd00', 'lanthanide': '#00cc99', 'actinide': '#dd5544'
    }
    color = color_map.get(c, '#ffffff')
    
    elements_js += f'  {{ n: {n}, s: \"{s}\", name: \"{name}\", m: {m}, cat: \"{c}\", shells: {shells}, color: \"{color}\" }},\n'
elements_js += '];'

layout_js = '''const LAYOUT = [
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 6, 7, 8, 9, 10],
  [11, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 14, 15, 16, 17, 18],
  [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
  [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54],
  [55, 56, 0, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86],
  [87, 88, 0, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 0],
  [0, 0, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 0]
];'''

with open('js/data.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'const ELEMENTS = \[.*?\];', elements_js, content, flags=re.DOTALL)
content = re.sub(r'const LAYOUT = \[.*?\];', layout_js, content, flags=re.DOTALL)

with open('js/data.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
