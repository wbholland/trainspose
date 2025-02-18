import L from 'leaflet'
import './leaflet-truesize.js'
import MicroModal from 'micromodal'
import List from 'list.js'

const MAP_COLOR = '#FE11A5'

MicroModal.init({
  disableScroll: true
})

const map = L.map('map').setView([2.0, 102.0], 5)

L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map)

const geojsonFeature = await fetch('geometry/test.json').then(response => response.json())

let systemMap = L.trueSize(geojsonFeature, {
  color: MAP_COLOR,
  weight: 1,
  opacity: 1
})

systemMap.addTo(map)

const handleRotation = (event) => {
  systemMap.setRotation(parseInt(event.target.value))
}

document.getElementById('rotation-slider').addEventListener('input', handleRotation)

const options = {
  valueNames: ['name', 'location'],
  item: (values) => `
  <li>
    <button
      class="system-btn"
      id="${values.systemId}"
    >
      <span class="name">${values.name}</span>
      <span class="location">${values.location}</span>
    </button>
  </li>
  `
}

const values = [
  {
    name: 'Link Light Rail',
    location: 'Seattle, WA, USA',
    systemId: 'link'
  },
  {
    name: 'Paris Metro',
    location: 'Paris, France',
    systemId: 'ratp'
  },
  {
    name: 'The T',
    location: 'Boston, MA, USA',
    systemId: 'mbta'
  },
  {
    name: 'Amtrak',
    location: 'USA',
    systemId: 'amtrak'
  },
  {
    name: 'The \'L\'',
    location: 'Chicago, IL, USA',
    systemId: 'cta'
  },
  {
    name: 'The NYC Subway',
    location: 'New York, NY, USA',
    systemId: 'mta'
  },
  {
    name: 'MARTA',
    location: 'Atlanta, GA, USA',
    systemId: 'marta'
  },
  {
    name: 'Sounder',
    location: 'Seattle, WA, USA',
    systemId: 'sounder'
  },
  {
    name: 'MAX',
    location: 'Portland, OR, USA',
    systemId: 'max'
  },
  {
    name: 'SkyTrain',
    location: 'Vancouver, BC, Canada',
    systemId: 'skytrain'
  },
  {
    name: 'BART',
    location: 'San Fransisco, CA, USA',
    systemId: 'bart'
  },
  {
    name: 'The Tube',
    location: 'London, England, UK',
    systemId: 'tube'
  },
  {
    name: 'DC Metro',
    location: 'Washington, DC, USA',
    systemId: 'wmata'
  },
  {
    name: 'Istanbul Metro',
    location: 'Istanbul, Turkey',
    systemId: 'istanbul'
  },
  {
    name: 'RER d\'Île-de-France',
    location: 'Paris, France',
    systemId: 'ratp-rer'
  },
  {
    name: 'Tyne and Wear Metro',
    location: 'Tyne and Wear, England, UK',
    systemId: 'nexus'
  },
  {
    name: 'Sydney Trains',
    location: 'Sydney, NSW, Australia',
    systemId: 'sydney-trains'
  },
  {
    name: 'NSW TrainLink',
    location: 'NSW, Australia',
    systemId: 'nsw-trainlink'
  },
  {
    name: 'SEPTA Regional Rail',
    location: 'Philadelphia, PA, USA',
    systemId: 'septa-regional'
  },
  {
    name: 'SEPTA Metro',
    location: 'Philadelphia, PA, USA',
    systemId: 'septa-metro'
  },
  {
    name: 'Metra',
    location: 'Chicago, IL, USA',
    systemId: 'metra'
  },
  {
    name: 'PATCO',
    location: 'Philadelphia, PA, USA',
    systemId: 'patco'
  },
  {
    name: 'Montreal Metro',
    location: 'Montreal, QC, Canada',
    systemId: 'stm'
  },
  {
    name: 'GO Transit',
    location: 'Toronto, ON, Canada',
    systemId: 'go'
  },
  {
    name: 'VIA Rail',
    location: 'Canada',
    systemId: 'via'
  },
  {
    name: 'Tokyo Subway',
    location: 'Tokyo, Japan',
    systemId: 'tokyo-subway'
  },
  {
    name: 'Shinkansen',
    location: 'Japan',
    systemId: 'shinkansen'
  },
  {
    name: 'Berlin U-Bahn',
    location: 'Berlin, Germany',
    systemId: 'bvg'
  },
  {
    name: 'West Coast Express',
    location: 'Vancouver, BC, Canada',
    systemId: 'wce'
  }
]

List('system-list', options, values)

const selectSystem = async (systemId) => {
  const center = systemMap.getCenter()
  map.removeLayer(systemMap)
  const geojsonFeature = await fetch(`geometry/${encodeURIComponent(systemId)}.json`).then(response => response.json())
  systemMap = L.trueSize(geojsonFeature, {
    color: MAP_COLOR,
    weight: 1,
    opacity: 1
  })

  systemMap.addTo(map)
  systemMap.setCenter(center)
  map.fitBounds(systemMap.getBounds())
  document.getElementById('system-select').textContent = values.find((obj) => obj.systemId === systemId).name
  document.getElementById('rotation-slider').value = 0
  document.getElementById('close-system').click()
}

for (const button of document.getElementsByClassName('system-btn')) {
  button.addEventListener('click', () => selectSystem(button.id))
}

const selectLocation = async (locationText) => {
  if (!locationText) return
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationText)}&format=json&limit=1`
  const queryResult = await fetch(url).then(response => response.json())
  const foundLocation = queryResult[0]
  if (!foundLocation) return // todo error handling
  document.getElementById('location-select').textContent = foundLocation.name
  MicroModal.close()
  document.getElementById('location-input').value = ''
  systemMap.setCenter([Number(foundLocation.lon), Number(foundLocation.lat)])
  map.fitBounds(systemMap.getBounds())
}

document.getElementById('location-search').addEventListener('submit', (event) => {
  event.preventDefault()
  selectLocation(document.getElementById('location-input').value)
})

selectSystem('ratp')
selectLocation('seattle')
